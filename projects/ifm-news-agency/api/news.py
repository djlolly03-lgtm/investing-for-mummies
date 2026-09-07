"""
IFM News Agency — standalone scanner API.

Its own Vercel project, deliberately separate from the games site: this needs
Python and the games site is static, and mixing them put the games deploy
behind a serverless bundle it had no use for.

Claude is called over plain HTTP rather than through the `anthropic` SDK. The
SDK drags in pydantic, httpx and jiter (~90MB unzipped) and blew Vercel's
225MB function limit. Three small pure-Python deps keep the bundle under 10MB.

  GET  /api/news                    -> published articles (public, CORS-open)
  GET  /api/news?action=status      -> config check (admin)
  POST /api/news {action:"scan"}    -> fetch RSS, score, return candidates (admin)
  POST /api/news {action:"publish"} -> mummify ONE article, save to Drive (admin)

Publishing is one article per request on purpose: a page fetch, a Claude
rewrite and two Drive writes take ~10-30s, so a batch of five would overrun
the function timeout. The browser loops instead, which also gives per-article
progress.

Environment variables (Vercel project settings):
  ANTHROPIC_API_KEY       Claude API key
  IFM_ADMIN_TOKEN         shared secret; required for scan/publish/status
  GOOGLE_CLIENT_ID        OAuth client id
  GOOGLE_CLIENT_SECRET    OAuth client secret
  GOOGLE_REFRESH_TOKEN    from setup_google_oauth.py
  GOOGLE_DRIVE_FOLDER_ID  "IFM News Agency" folder
  SEED_URL                optional: URL of an existing news-data.json to
                          import on first publish
"""

import hmac
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import feedparser
import requests
from bs4 import BeautifulSoup

# ── editorial config ────────────────────────────────────────────────────────

RSS_FEEDS = [
    ("Economic Times — Personal Finance", "https://economictimes.indiatimes.com/personal-finance/rssfeeds/1715249553.cms"),
    ("Economic Times — Mutual Funds",     "https://economictimes.indiatimes.com/mf/rssfeeds/13357270.cms"),
    ("Mint — Money",                      "https://www.livemint.com/rss/money"),
    ("Mint — Personal Finance",           "https://www.livemint.com/rss/personal-finance"),
    ("Moneycontrol — Personal Finance",   "https://www.moneycontrol.com/rss/personalfinance.xml"),
    ("CNBC TV18 — Personal Finance",      "https://www.cnbctv18.com/commonfeeds/v1/eng/rss/personal-finance.xml"),
    ("Zee Business",                      "https://www.zeebiz.com/rss/personal-finance.xml"),
]

RELEVANCE_TOPICS = """
- Mutual funds / SIP / SWP investing
- Stock market basics for beginners
- Personal finance and budgeting
- Savings and financial planning for families
- Women and money / financial independence
- Retirement planning in India
- Tax saving for individuals in India (ELSS, PPF, NPS)
- Understanding financial products (FDs, bonds, ETFs, gold)
- Managing debt and credit
"""

AUDIENCE = """Indian women who are beginners in personal finance and investing.
They may have limited financial literacy but are curious and eager to learn.
The tone should be warm, friendly, and jargon-free — like explaining to a trusted friend over chai.
Keep it practical and relatable. Use simple English and short sentences.
Avoid technical terms; if unavoidable, explain them immediately in plain language.
Examples should feel relevant to Indian family life — school fees, family budgets, planning for the future."""

MAX_ARTICLES_PER_SCAN = 5
MIN_RELEVANCE_SCORE = 6
MAX_STORED_ARTICLES = 40

# Cheap mechanical filter — Haiku is the right tier for scoring headlines.
SCORING_MODEL = "claude-haiku-4-5"
# The mummified rewrite carries the IFM voice, so it runs on the flagship.
SIMPLIFY_MODEL = "claude-opus-5"

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

STORE_NAME = "news-data.json"
INDEX_SHEET_NAME = "IFM News Agency — Article Index"

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"


class ConfigError(RuntimeError):
    """A required environment variable is missing or a Google call failed."""


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(f"Missing environment variable: {name}")
    return value


# ── Claude (raw HTTP — see module docstring for why not the SDK) ─────────────

def claude(body: dict, timeout: int = 120) -> dict:
    r = requests.post(
        ANTHROPIC_URL,
        headers={
            "content-type": "application/json",
            "x-api-key": env("ANTHROPIC_API_KEY"),
            "anthropic-version": "2023-06-01",
        },
        json=body,
        timeout=timeout,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Claude API {r.status_code}: {r.text[:300]}")
    return r.json()


def claude_text(response: dict) -> str:
    # Safety classifiers can decline with a 200 and an empty content array,
    # so check stop_reason before reading content.
    if response.get("stop_reason") == "refusal":
        raise RuntimeError("Claude declined to process this article.")
    return "".join(
        block.get("text", "")
        for block in response.get("content", [])
        if block.get("type") == "text"
    ).strip()


# ── Google Drive / Sheets ───────────────────────────────────────────────────

def google_token() -> str:
    r = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": env("GOOGLE_CLIENT_ID"),
            "client_secret": env("GOOGLE_CLIENT_SECRET"),
            "refresh_token": env("GOOGLE_REFRESH_TOKEN"),
            "grant_type": "refresh_token",
        },
        timeout=20,
    )
    if r.status_code != 200:
        raise ConfigError(
            "Google refused the refresh token — re-run setup_google_oauth.py "
            f"({r.status_code}: {r.text[:200]})"
        )
    return r.json()["access_token"]


def gheaders(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def drive_find(token: str, name: str, parent: str) -> str | None:
    safe = name.replace("'", "\\'")
    r = requests.get(
        DRIVE_FILES,
        headers=gheaders(token),
        params={
            "q": f"name = '{safe}' and '{parent}' in parents and trashed = false",
            "fields": "files(id,name)",
            "pageSize": 1,
        },
        timeout=20,
    )
    r.raise_for_status()
    files = r.json().get("files", [])
    return files[0]["id"] if files else None


def drive_upload(token: str, name: str, parent: str, body: str,
                 mime: str, target_mime: str | None = None,
                 file_id: str | None = None) -> str:
    """Create (or overwrite, when file_id is given) a Drive file. Returns its id."""
    metadata: dict = {"name": name}
    if file_id is None:
        metadata["parents"] = [parent]
    if target_mime:
        metadata["mimeType"] = target_mime

    boundary = "ifm-news-boundary-7f3a"
    payload = (
        f"--{boundary}\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
        f"--{boundary}\r\n"
        f"Content-Type: {mime}\r\n\r\n"
        f"{body}\r\n"
        f"--{boundary}--"
    ).encode("utf-8")

    url = f"{DRIVE_UPLOAD}/{file_id}" if file_id else DRIVE_UPLOAD
    method = requests.patch if file_id else requests.post
    r = method(
        url,
        headers={
            **gheaders(token),
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        params={"uploadType": "multipart", "fields": "id"},
        data=payload,
        timeout=45,
    )
    r.raise_for_status()
    return r.json()["id"]


def drive_read_json(token: str, file_id: str) -> list:
    r = requests.get(
        f"{DRIVE_FILES}/{file_id}",
        headers=gheaders(token),
        params={"alt": "media"},
        timeout=20,
    )
    if r.status_code != 200:
        return []
    try:
        data = r.json()
        return data if isinstance(data, list) else []
    except ValueError:
        return []


def seed_from_url() -> list:
    """Import an existing news-data.json the first time we publish.

    Without this the first publish would start from an empty list and the
    back catalogue on the games site would be orphaned.
    """
    url = os.environ.get("SEED_URL", "").strip()
    if not url:
        return []
    try:
        r = requests.get(url, timeout=15)
        data = r.json() if r.status_code == 200 else []
        return data if isinstance(data, list) else []
    except Exception:
        return []


def load_store(token: str, folder: str) -> tuple[list, str | None]:
    """The published-article list plus the id of the file holding it."""
    file_id = drive_find(token, STORE_NAME, folder)
    if not file_id:
        return seed_from_url(), None
    return drive_read_json(token, file_id), file_id


def save_store(token: str, folder: str, articles: list, file_id: str | None) -> str:
    return drive_upload(
        token, STORE_NAME, folder,
        json.dumps(articles, ensure_ascii=False, indent=2),
        "application/json",   # no target_mime: stays a raw .json, not a Doc
        file_id=file_id,
    )


def ensure_index_sheet(token: str, folder: str) -> str:
    existing = drive_find(token, INDEX_SHEET_NAME, folder)
    if existing:
        return existing

    r = requests.post(
        DRIVE_FILES,
        headers={**gheaders(token), "Content-Type": "application/json"},
        json={
            "name": INDEX_SHEET_NAME,
            "parents": [folder],
            "mimeType": "application/vnd.google-apps.spreadsheet",
        },
        params={"fields": "id"},
        timeout=30,
    )
    r.raise_for_status()
    sheet_id = r.json()["id"]

    requests.post(
        f"{SHEETS}/{sheet_id}/values/A1:append",
        headers={**gheaders(token), "Content-Type": "application/json"},
        params={"valueInputOption": "USER_ENTERED"},
        json={"values": [[
            "Published", "Headline", "Source", "Original URL",
            "Google Doc", "Relevance", "Why it was picked",
        ]]},
        timeout=30,
    )
    return sheet_id


def append_index_row(token: str, sheet_id: str, row: list) -> None:
    requests.post(
        f"{SHEETS}/{sheet_id}/values/A1:append",
        headers={**gheaders(token), "Content-Type": "application/json"},
        params={"valueInputOption": "USER_ENTERED"},
        json={"values": [row]},
        timeout=30,
    ).raise_for_status()


def esc(text: str) -> str:
    return ((text or "").replace("&", "&amp;")
            .replace("<", "&lt;").replace(">", "&gt;"))


def article_doc_html(title: str, url: str, source: str, date: str,
                     mummified: str, original: str) -> str:
    """Drive converts this HTML into a native Google Doc on upload."""
    def to_html(md: str) -> str:
        out = []
        for line in md.split("\n"):
            line = esc(line.strip())
            if not line:
                continue
            line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
            out.append(f"<li>{line[1:].strip()}</li>" if line.startswith("- ")
                       else f"<p>{line}</p>")
        return "\n".join(out).replace("</li>\n<li>", "</li><li>")

    return f"""<html><body>
<h1>{esc(title)}</h1>
<p><em>Source: {esc(source) or 'Unknown'} &middot; Published by IFM on {esc(date)}</em></p>
<p><a href="{esc(url)}">Read the original article</a></p>
<hr>
<h2>Mummified version</h2>
{to_html(mummified)}
<hr>
<h2>Original article (extracted text)</h2>
<p>{esc(original[:20000])}</p>
</body></html>"""


# ── article fetching + scoring ──────────────────────────────────────────────

def fetch_feed(name: str, url: str) -> list[dict]:
    try:
        parsed = feedparser.parse(url, agent=BROWSER_UA)
        items = []
        for entry in parsed.entries[:20]:
            link = entry.get("link")
            if not link:
                continue
            items.append({
                "title": entry.get("title", "").strip(),
                "url": link,
                "source": name,
                "summary": BeautifulSoup(
                    entry.get("summary", ""), "html.parser"
                ).get_text(" ", strip=True)[:400],
            })
        return items
    except Exception:
        return []


def fetch_article_text(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": BROWSER_UA},
                     timeout=20, allow_redirects=True)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["nav", "footer", "script", "style", "aside",
                     "header", "form", "iframe"]):
        tag.decompose()
    container = (
        soup.find("article")
        or soup.find(attrs={"class": re.compile(r"article|content|story|post-body", re.I)})
        or soup.find("main")
        or soup.find("body")
    )
    text = (container or soup).get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()[:8000]


SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index":  {"type": "integer"},
                    "score":  {"type": "integer"},
                    "reason": {"type": "string"},
                },
                "required": ["index", "score", "reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["scores"],
    "additionalProperties": False,
}


def score_articles(articles: list[dict]) -> list[dict]:
    if not articles:
        return []

    listing = "\n\n".join(
        f"[{i + 1}] Title: {a['title']}\nSource: {a['source']}\nSummary: {a['summary'][:300]}"
        for i, a in enumerate(articles)
    )

    response = claude({
        "model": SCORING_MODEL,
        "max_tokens": 2000,
        "system": f"""You score news articles for relevance to a beginner investing course for Indian women.
Score each article 0-10 based on relevance to these topics:
{RELEVANCE_TOPICS}

Scoring guide:
- 8-10: Directly useful for beginners — explains a concept, practical tips, relatable real-world example
- 5-7: Tangentially relevant — market news that could be given context for beginners
- 0-4: Too advanced, too niche, not relevant to personal finance basics, or India-irrelevant

Return one entry per article, using the 1-based index shown in the list.""",
        "messages": [{"role": "user", "content": f"Score these articles:\n\n{listing}"}],
        # Structured outputs replace the old strip-the-code-fence-and-hope parsing.
        "output_config": {"format": {"type": "json_schema", "schema": SCORE_SCHEMA}},
    })

    try:
        for item in json.loads(claude_text(response)).get("scores", []):
            i = item["index"] - 1
            if 0 <= i < len(articles):
                articles[i]["relevance_score"] = item["score"]
                articles[i]["relevance_reason"] = item["reason"]
    except (ValueError, KeyError, TypeError):
        pass  # fall through to the defaults below

    for a in articles:
        a.setdefault("relevance_score", 5)
        a.setdefault("relevance_reason", "Score unavailable")
    return articles


def mummify(url: str, text: str) -> str:
    return claude_text(claude({
        "model": SIMPLIFY_MODEL,
        # Opus 5 thinks by default and max_tokens caps thinking + text
        # together, so this sits far above the ~250-word target.
        "max_tokens": 4000,
        "output_config": {"effort": "low"},
        "system": f"""You rewrite news articles for this specific audience:
{AUDIENCE}

Format your output exactly like this (use these exact bold headings):

**[Catchy, warm headline — max 10 words, no jargon]**

[2–3 sentence intro: what happened and why it matters to a beginner investor in India]

**What this means for you:**
- [Practical takeaway 1 — plain English]
- [Practical takeaway 2]
- [Practical takeaway 3]
- [Practical takeaway 4, if needed]

**The bottom line:**
[One sentence — the single most useful thing to remember, in the simplest possible terms]

Rules:
- Total length: under 250 words
- No financial jargon without an immediate plain-language explanation
- Warm, encouraging tone — never scary or overwhelming
- If the article is not actually useful for beginners, say so briefly and skip the format""",
        "messages": [{
            "role": "user",
            "content": f"Rewrite this article for our IFM audience.\n\nSource URL: {url}\n\nArticle content:\n{text}",
        }],
    }))


# ── actions ─────────────────────────────────────────────────────────────────

def do_scan() -> dict:
    token = google_token()
    folder = env("GOOGLE_DRIVE_FOLDER_ID")
    published, _ = load_store(token, folder)
    seen = {a.get("url") for a in published}

    with ThreadPoolExecutor(max_workers=len(RSS_FEEDS)) as pool:
        batches = list(pool.map(lambda f: fetch_feed(*f), RSS_FEEDS))

    fresh, urls = [], set()
    for batch in batches:
        for item in batch:
            if item["url"] in seen or item["url"] in urls or not item["title"]:
                continue
            urls.add(item["url"])
            fresh.append(item)

    if not fresh:
        return {"candidates": [], "scanned": 0,
                "message": "No new articles — every item in the feeds is already published."}

    scored = sorted(score_articles(fresh), key=lambda a: -a["relevance_score"])
    shortlist = [a for a in scored if a["relevance_score"] >= MIN_RELEVANCE_SCORE]

    return {
        "candidates": shortlist[:MAX_ARTICLES_PER_SCAN],
        "scanned": len(fresh),
        "message": (f"Scanned {len(fresh)} new articles; "
                    f"{len(shortlist)} scored {MIN_RELEVANCE_SCORE}+."),
    }


def do_publish(article: dict) -> dict:
    url = (article.get("url") or "").strip()
    if not url:
        raise ValueError("No article url supplied.")

    text = fetch_article_text(url)
    if len(text) < 200:
        raise RuntimeError("Could not extract enough text from that page — skipped.")

    mummified = mummify(url, text)

    headline_match = re.search(r"\*\*(.+?)\*\*", mummified)
    headline = headline_match.group(1).strip() if headline_match else article.get("title", "Untitled")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    source = article.get("source", "")

    token = google_token()
    folder = env("GOOGLE_DRIVE_FOLDER_ID")

    doc_id = drive_upload(
        token, f"{today} — {headline[:80]}", folder,
        article_doc_html(headline, url, source, today, mummified, text),
        "text/html", target_mime="application/vnd.google-apps.document",
    )
    doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"

    try:
        append_index_row(token, ensure_index_sheet(token, folder), [
            today, headline, source, url, doc_url,
            article.get("relevance_score", ""), article.get("relevance_reason", ""),
        ])
    except Exception:
        # The Doc is the deliverable; a failed index row must not lose it.
        pass

    published, file_id = load_store(token, folder)
    published = [a for a in published if a.get("url") != url]
    published.insert(0, {
        "title": headline, "url": url, "source": source, "date": today,
        "simplified": mummified, "doc_url": doc_url,
    })
    save_store(token, folder, published[:MAX_STORED_ARTICLES], file_id)

    return {"title": headline, "doc_url": doc_url, "date": today}


def do_list() -> list:
    token = google_token()
    published, _ = load_store(token, env("GOOGLE_DRIVE_FOLDER_ID"))
    return published


# ── HTTP ────────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def _send(self, status: int, payload, cache: str | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache or "no-store")
        # Open on purpose: the games site reads the article list cross-origin.
        # Everything that mutates state is gated on the admin token below.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-ifm-admin-token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _is_admin(self) -> bool:
        expected = os.environ.get("IFM_ADMIN_TOKEN", "")
        supplied = self.headers.get("x-ifm-admin-token", "")
        # Constant-time compare so the token can't be probed byte by byte.
        return bool(expected) and hmac.compare_digest(expected, supplied)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        action = (query.get("action") or ["list"])[0]

        if action == "status":
            if not self._is_admin():
                return self._send(401, {"error": "Admin token required."})
            missing = [k for k in ("ANTHROPIC_API_KEY", "GOOGLE_CLIENT_ID",
                                   "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN",
                                   "GOOGLE_DRIVE_FOLDER_ID")
                       if not os.environ.get(k, "").strip()]
            if missing:
                return self._send(200, {"ready": False, "missing": missing})
            try:
                google_token()
            except Exception as exc:
                return self._send(200, {"ready": False, "missing": [],
                                        "error": str(exc)[:300]})
            return self._send(200, {"ready": True, "missing": []})

        try:
            # Short edge cache: the list changes only when someone publishes.
            return self._send(200, do_list(),
                              cache="public, s-maxage=120, stale-while-revalidate=600")
        except Exception:
            # Never break a reader. An empty list tells callers to fall back.
            return self._send(200, [], cache="no-store")

    def do_POST(self):
        if not self._is_admin():
            return self._send(401, {"error": "Admin token required."})

        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._send(400, {"error": "Malformed JSON body."})

        action = payload.get("action")
        started = time.time()
        try:
            if action == "scan":
                result = do_scan()
            elif action == "publish":
                result = do_publish(payload.get("article") or {})
            else:
                return self._send(400, {"error": f"Unknown action: {action!r}"})
            result["elapsed"] = round(time.time() - started, 1)
            return self._send(200, result)
        except ConfigError as exc:
            return self._send(500, {"error": str(exc), "setup": True})
        except Exception as exc:
            return self._send(500, {"error": f"{type(exc).__name__}: {exc}"[:400]})

    def log_message(self, *args):
        pass
