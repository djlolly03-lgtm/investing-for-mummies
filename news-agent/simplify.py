"""
Article simplifier — rewrites approved articles for IFM's audience.
Add approved URLs to approved.txt (one per line), then run this script.
Output saved to the simplified/ folder as markdown files.
"""

from dotenv import load_dotenv
from pathlib import Path as _Path
load_dotenv(dotenv_path=_Path(__file__).parent / ".env", override=True)

import requests
from bs4 import BeautifulSoup
import anthropic
from pathlib import Path
from datetime import datetime
import re
import json
from config import AUDIENCE

BASE_DIR = Path(__file__).parent
CLAUDE_DIR = BASE_DIR.parent / "CLAUDE"
APPROVED_FILE = BASE_DIR / "approved.txt"
DECISIONS_FILE = BASE_DIR / "decisions.json"
REJECTION_FILE = BASE_DIR / "rejection_memory.json"
NEWS_JSON = CLAUDE_DIR / "news-data.json"
OUTPUT_DIR = BASE_DIR / "simplified"


def fetch_article_text(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        for tag in soup(["nav", "footer", "script", "style", "aside", "header", "form", "iframe"]):
            tag.decompose()

        # Prefer article body; fall back to full body
        container = (
            soup.find("article")
            or soup.find(attrs={"class": re.compile(r"article|content|story|post-body", re.I)})
            or soup.find("main")
            or soup.find("body")
        )
        text = (container or soup).get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:8000]

    except Exception as e:
        return f"[Could not fetch article: {e}]"


def simplify_article(url: str, text: str, client: anthropic.Anthropic) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=f"""You rewrite news articles for this specific audience:
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
        messages=[{
            "role": "user",
            "content": f"Rewrite this article for our IFM audience.\n\nSource URL: {url}\n\nArticle content:\n{text}",
        }],
    )
    return response.content[0].text.strip()


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text[:60]


def read_decisions() -> tuple[list[str], list[dict]]:
    """Returns (approved_urls, rejected_articles). Prefers decisions.json over approved.txt."""
    if DECISIONS_FILE.exists():
        try:
            data = json.loads(DECISIONS_FILE.read_text(encoding="utf-8"))
            return data.get("approved", []), data.get("rejected", [])
        except Exception:
            pass
    # Fallback to legacy approved.txt
    if APPROVED_FILE.exists():
        lines = APPROVED_FILE.read_text(encoding="utf-8").splitlines()
        urls = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
        return urls, []
    return [], []


def save_rejections(rejected: list[dict]):
    if not rejected:
        return
    existing = []
    if REJECTION_FILE.exists():
        try:
            existing = json.loads(REJECTION_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    merged = existing + rejected
    REJECTION_FILE.write_text(json.dumps(merged[-50:], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Saved {len(rejected)} rejection(s) to memory (total: {len(merged[-50:])})")


def main():
    urls, rejected = read_decisions()

    # Save rejections to memory immediately
    if rejected:
        print(f"Saving {len(rejected)} rejection(s) to memory...")
        save_rejections(rejected)

    if not urls:
        if not rejected:
            print("No approved URLs found.")
            print(f"Drop decisions.json into the news-agent folder, then run this script again.")
        else:
            print("No articles approved for simplification.")
        # Clean up decisions file
        if DECISIONS_FILE.exists():
            DECISIONS_FILE.unlink()
        return

    OUTPUT_DIR.mkdir(exist_ok=True)
    client = anthropic.Anthropic()
    date_str = datetime.now().strftime("%Y-%m-%d")

    print(f"Simplifying {len(urls)} article(s)...")
    print("=" * 50)

    saved_files = []

    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] Fetching: {url[:80]}...")
        text = fetch_article_text(url)

        if text.startswith("[Could not fetch") or len(text) < 100:
            print(f"  Skipped — could not extract article content")
            continue

        print(f"  Fetched {len(text):,} chars. Simplifying with Claude...")
        simplified = simplify_article(url, text, client)

        # Build filename from URL slug
        url_slug = slugify(url.rstrip("/").split("/")[-1] or f"article-{i}")
        filename = OUTPUT_DIR / f"{date_str}-{url_slug}.md"

        content = "\n".join([
            f"# Simplified Article",
            f"",
            f"**Source:** {url}",
            f"**Simplified on:** {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"",
            f"---",
            f"",
            simplified,
            f"",
        ])

        filename.write_text(content, encoding="utf-8")
        saved_files.append((filename, url, simplified))
        print(f"  Saved: {filename.name}")

    # Write news-data.json for the Vercel app
    if saved_files:
        # Load existing articles and prepend new ones (keep last 20)
        existing = []
        if NEWS_JSON.exists():
            try:
                existing = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
            except Exception:
                existing = []

        new_entries = []
        for filename, url, simplified in saved_files:
            # Extract title from first bold line of simplified output
            title_match = re.search(r"\*\*(.+?)\*\*", simplified)
            title = title_match.group(1) if title_match else filename.stem
            new_entries.append({
                "title": title,
                "url": url,
                "source": "",
                "date": date_str,
                "simplified": simplified,
            })

        all_articles = new_entries + existing
        NEWS_JSON.write_text(json.dumps(all_articles[:20], ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nUpdated: {NEWS_JSON}")
        print("Remember to run: vercel deploy --prod (from the CLAUDE folder)")

    # Clean up decision files after processing
    if DECISIONS_FILE.exists():
        DECISIONS_FILE.unlink()
    APPROVED_FILE.write_text(
        "# Approved URLs for simplification (one per line)\n"
        "# Lines starting with # are ignored\n"
        "# Run: python simplify.py\n",
        encoding="utf-8",
    )

    print(f"\n{'=' * 50}")
    print(f"Done. {len(saved_files)} article(s) saved to: {OUTPUT_DIR}/")
    for f, _, __ in saved_files:
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
