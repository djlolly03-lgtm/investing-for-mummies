"""
Daily news scanner — finds relevant finance articles for IFM course.
Writes a pending.html review page — open in browser, tick boxes, click Approve.
"""

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import anthropic
import re
from pathlib import Path
from config import RSS_FEEDS, RELEVANCE_TOPICS, MAX_ARTICLES_PER_SCAN, MIN_RELEVANCE_SCORE

BASE_DIR = Path(__file__).parent
PENDING_FILE = BASE_DIR / "pending.md"
PENDING_HTML = BASE_DIR / "pending.html"
APPROVED_FILE = BASE_DIR / "approved.txt"
DECISIONS_FILE = BASE_DIR / "decisions.json"
REJECTION_FILE = BASE_DIR / "rejection_memory.json"
SEEN_FILE = BASE_DIR / ".seen_urls.json"


def load_rejection_memory() -> list[dict]:
    if REJECTION_FILE.exists():
        try:
            return json.loads(REJECTION_FILE.read_text(encoding="utf-8"))[-20:]
        except Exception:
            pass
    return []


def fetch_rss_feed(source_name: str, feed_url: str) -> list[dict]:
    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        print(f"  Error fetching {source_name}: {e}")
        return []

    cutoff = datetime.now() - timedelta(days=3)
    articles = []
    for entry in feed.entries:
        published = (
            datetime(*entry.published_parsed[:6])
            if hasattr(entry, "published_parsed")
            else datetime.now()
        )
        if published < cutoff:
            continue
        summary = BeautifulSoup(entry.get("summary", ""), "html.parser").get_text()
        # Use the direct article URL (not a Google redirect)
        url = entry.get("link", entry.get("id", ""))
        if not url:
            continue
        articles.append({
            "title": entry.title,
            "url": url,
            "source": source_name,
            "published": published.strftime("%Y-%m-%d"),
            "summary": summary.strip(),
        })
    return articles


def load_seen_urls() -> set:
    if SEEN_FILE.exists():
        return set(json.loads(SEEN_FILE.read_text()))
    return set()


def save_seen_urls(urls: set):
    SEEN_FILE.write_text(json.dumps(sorted(urls), indent=2))


def score_articles(articles: list[dict], client: anthropic.Anthropic, rejection_memory: list[dict] = None) -> list[dict]:
    if not articles:
        return []

    articles_text = "\n\n".join([
        f"[{i+1}] Title: {a['title']}\nSource: {a['source']}\nSummary: {a['summary'][:300]}"
        for i, a in enumerate(articles)
    ])

    rejection_context = ""
    if rejection_memory:
        rejection_context = "\n\nPreviously REJECTED articles (score these types LOW — the editor does not want them):\n"
        for r in rejection_memory[-15:]:
            rejection_context += f"- \"{r.get('title','?')}\" — Reason: {r.get('reason','not suitable')}\n"

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        system=f"""You score news articles for relevance to a beginner investing course for Indian women.
Score each article 0-10 based on relevance to these topics:
{RELEVANCE_TOPICS}

Scoring guide:
- 8-10: Directly useful for beginners — explains a concept, practical tips, relatable real-world example
- 5-7: Tangentially relevant — market news that could be given context for beginners
- 0-4: Too advanced, too niche, not relevant to personal finance basics, or India-irrelevant
{rejection_context}
Respond with ONLY valid JSON — an array of objects:
[{{"index": 1, "score": 8, "reason": "explains SIP returns simply"}}, ...]
No markdown, no explanation — just the JSON array.""",
        messages=[{"role": "user", "content": f"Score these articles:\n\n{articles_text}"}],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    try:
        scores = json.loads(raw)
        for item in scores:
            i = item["index"] - 1
            if 0 <= i < len(articles):
                articles[i]["relevance_score"] = item["score"]
                articles[i]["relevance_reason"] = item["reason"]
    except json.JSONDecodeError as e:
        print(f"  Warning: Could not parse scores: {e}")
        for a in articles:
            a.setdefault("relevance_score", 5)
            a.setdefault("relevance_reason", "Score unavailable")

    return articles


def write_pending_html(articles: list[dict]):
    cards = ""
    articles_json = json.dumps([
        {"title": a["title"], "url": a["url"], "source": a.get("source",""), "published": a.get("published","")}
        for a in articles
    ], ensure_ascii=False)

    for i, a in enumerate(articles):
        score = a.get("relevance_score", "?")
        reason = a.get("relevance_reason", "")
        summary = a["summary"][:220] + ("..." if len(a["summary"]) > 220 else "")
        url_e = a["url"].replace('"', "&quot;")
        title_e = a["title"].replace("<", "&lt;").replace(">", "&gt;")
        summary_e = summary.replace("<", "&lt;").replace(">", "&gt;")
        score_color = "#2a9d8f" if score >= 8 else "#e9c46a" if score >= 6 else "#aaa"

        cards += f"""
        <div class="card" id="card-{i}" data-index="{i}">
          <div class="card-body">
            <div class="card-meta">
              <span class="source">{a['source']}</span>
              <span class="date">{a['published']}</span>
              <span class="score" style="background:{score_color}">{score}/10</span>
            </div>
            <a href="{url_e}" target="_blank" class="title">{title_e}</a>
            <p class="reason">💡 {reason}</p>
            <p class="summary">{summary_e}</p>
            <div class="card-actions">
              <label class="approve-label">
                <input type="checkbox" class="article-cb" value="{url_e}" onchange="updateCount()"> Approve
              </label>
              <button class="reject-btn" id="rbtn-{i}" onclick="toggleReject({i})">✗ Reject</button>
            </div>
            <div class="reject-box" id="rbox-{i}" style="display:none;">
              <input type="text" class="reason-input" id="reason-{i}" placeholder="Why reject? e.g. too advanced, wrong topic, not India-relevant…">
            </div>
          </div>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IFM News Review</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', sans-serif; background: #f7faf9; color: #1a3a5c; padding: 24px 24px 120px; max-width: 680px; margin: 0 auto; }}
  h1 {{ font-size: 1.4rem; color: #1a3a5c; margin-bottom: 4px; }}
  h2 {{ font-size: 1rem; color: #1a3a5c; margin: 28px 0 10px; }}
  .sub {{ color: #5a7d8a; font-size: 0.85rem; margin-bottom: 24px; }}
  .card {{ background: white; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 18px 20px; transition: box-shadow 0.2s; }}
  .card.rejected {{ opacity: 0.5; border: 2px solid #f4c2c2; }}
  .card.approved {{ border: 2px solid #2a9d8f; }}
  .card-meta {{ display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }}
  .source {{ font-size: 0.72rem; color: #5a7d8a; font-weight: 700; text-transform: uppercase; }}
  .date {{ font-size: 0.72rem; color: #aaa; }}
  .score {{ font-size: 0.7rem; font-weight: 700; color: white; padding: 2px 8px; border-radius: 20px; }}
  .title {{ font-size: 0.97rem; font-weight: 700; color: #1a3a5c; text-decoration: none; display: block; margin-bottom: 5px; line-height: 1.4; }}
  .title:hover {{ color: #2a9d8f; }}
  .reason {{ font-size: 0.78rem; color: #2a9d8f; margin-bottom: 5px; }}
  .summary {{ font-size: 0.82rem; color: #5a7d8a; line-height: 1.5; margin-bottom: 12px; }}
  .card-actions {{ display: flex; gap: 10px; align-items: center; }}
  .approve-label {{ display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #2a9d8f; cursor: pointer; padding: 6px 12px; border: 2px solid #2a9d8f; border-radius: 8px; }}
  .approve-label input {{ accent-color: #2a9d8f; width: 16px; height: 16px; }}
  .reject-btn {{ background: none; border: 2px solid #e0e0e0; color: #aaa; font-size: 0.82rem; font-weight: 700; border-radius: 8px; padding: 6px 12px; cursor: pointer; transition: all .15s; }}
  .reject-btn:hover, .reject-btn.active {{ border-color: #e57373; color: #e57373; background: #fff5f5; }}
  .reject-box {{ margin-top: 10px; }}
  .reason-input {{ width: 100%; padding: 8px 12px; border: 2px solid #f4c2c2; border-radius: 8px; font-size: 0.82rem; font-family: 'Segoe UI', sans-serif; color: #1a3a5c; outline: none; }}
  .reason-input:focus {{ border-color: #e57373; }}
  .manual-section {{ background: white; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 14px; }}
  .manual-section p {{ font-size: 0.82rem; color: #5a7d8a; margin-bottom: 10px; }}
  .manual-textarea {{ width: 100%; min-height: 90px; padding: 10px 12px; border: 2px solid #e0f3f0; border-radius: 8px; font-size: 0.82rem; font-family: 'Segoe UI', sans-serif; color: #1a3a5c; resize: vertical; outline: none; }}
  .manual-textarea:focus {{ border-color: #2a9d8f; }}
  .sticky {{ position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 2px solid #e0f3f0; padding: 14px 24px; display: flex; align-items: center; gap: 14px; box-shadow: 0 -2px 12px rgba(0,0,0,0.08); z-index: 99; }}
  .btn {{ background: #2a9d8f; color: white; border: none; padding: 11px 26px; border-radius: 8px; font-size: 0.92rem; font-weight: 700; cursor: pointer; }}
  .btn:hover {{ background: #1a7a6e; }}
  .btn:disabled {{ background: #ccc; cursor: not-allowed; }}
  .count {{ color: #5a7d8a; font-size: 0.85rem; flex: 1; }}
  .done-msg {{ background: #e0f3f0; border-radius: 10px; padding: 18px 20px; text-align: center; display: none; margin-bottom: 14px; }}
  .done-msg h3 {{ color: #2a9d8f; margin-bottom: 6px; }}
  .done-msg p {{ font-size: 0.85rem; color: #5a7d8a; }}
  .empty {{ text-align: center; padding: 50px 20px; color: #5a7d8a; font-size: 0.9rem; }}
</style>
</head>
<body>
<h1>📰 IFM News Review</h1>
<p class="sub">Generated {datetime.now().strftime('%A, %d %B %Y at %H:%M')} · Approve or reject each article, then click Save Decisions</p>

{'<div class="empty">No new relevant articles found today.</div>' if not articles else cards}

<h2>➕ Add articles manually</h2>
<div class="manual-section">
  <p>Paste article URLs here (one per line) — these will be added to the simplify queue automatically.</p>
  <textarea class="manual-textarea" id="manual-urls" placeholder="https://...&#10;https://..."></textarea>
</div>

<div class="done-msg" id="done-msg">
  <h3>✅ decisions.json saved!</h3>
  <p>Move it to the <strong>news-agent</strong> folder, then run: <strong>python simplify.py</strong></p>
</div>

<div class="sticky">
  <button class="btn" id="save-btn" onclick="saveDecisions()">Save Decisions</button>
  <span class="count" id="count-label">0 approved · 0 rejected</span>
</div>

<script>
  const ARTICLES = {articles_json};

  function toggleReject(i) {{
    const box = document.getElementById('rbox-' + i);
    const btn = document.getElementById('rbtn-' + i);
    const cb = document.querySelector('#card-' + i + ' .article-cb');
    const card = document.getElementById('card-' + i);
    const isActive = btn.classList.toggle('active');
    box.style.display = isActive ? 'block' : 'none';
    if (isActive) {{ cb.checked = false; card.classList.add('rejected'); card.classList.remove('approved'); }}
    else {{ card.classList.remove('rejected'); }}
    updateCount();
  }}

  document.querySelectorAll('.article-cb').forEach(cb => {{
    cb.addEventListener('change', function() {{
      const i = this.closest('.card').dataset.index;
      const btn = document.getElementById('rbtn-' + i);
      const card = document.getElementById('card-' + i);
      if (this.checked) {{
        btn.classList.remove('active');
        document.getElementById('rbox-' + i).style.display = 'none';
        card.classList.add('approved'); card.classList.remove('rejected');
      }} else {{ card.classList.remove('approved'); }}
      updateCount();
    }});
  }});

  function updateCount() {{
    const approved = document.querySelectorAll('.article-cb:checked').length;
    const rejected = document.querySelectorAll('.reject-btn.active').length;
    document.getElementById('count-label').textContent = approved + ' approved · ' + rejected + ' rejected';
    document.getElementById('save-btn').disabled = (approved + rejected === 0);
  }}

  function saveDecisions() {{
    const approved = [...document.querySelectorAll('.article-cb:checked')].map(cb => cb.value);
    const rejected = [];
    document.querySelectorAll('.reject-btn.active').forEach(btn => {{
      const i = btn.id.replace('rbtn-', '');
      const a = ARTICLES[parseInt(i)] || {{}};
      const reason = document.getElementById('reason-' + i).value.trim() || 'not suitable';
      rejected.push({{ title: a.title || '', url: a.url || '', source: a.source || '', reason, date: new Date().toISOString().split('T')[0] }});
    }});
    const manualRaw = document.getElementById('manual-urls').value.trim();
    const manual = manualRaw.split('\\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    const decisions = {{ approved: [...approved, ...manual], rejected }};
    const blob = new Blob([JSON.stringify(decisions, null, 2)], {{type: 'application/json'}});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'decisions.json'; a.click();
    document.getElementById('done-msg').style.display = 'block';
    document.getElementById('save-btn').disabled = true;
    document.getElementById('count-label').textContent = approved.length + manual.length + ' approved · ' + rejected.length + ' rejected — check Downloads';
  }}

  updateCount();
</script>
</body>
</html>"""

    PENDING_HTML.write_text(html, encoding="utf-8")
    print(f"\nWrote review page: {PENDING_HTML}")


def main():
    print(f"IFM News Scanner — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    client = anthropic.Anthropic()
    seen_urls = load_seen_urls()
    all_articles = []
    seen_this_run: set[str] = set()

    for source_name, feed_url in RSS_FEEDS:
        print(f"Fetching: {source_name}")
        articles = fetch_rss_feed(source_name, feed_url)
        new = [a for a in articles if a["url"] not in seen_urls and a["url"] not in seen_this_run]
        for a in new:
            seen_this_run.add(a["url"])
        all_articles.extend(new)
        print(f"  +{len(new)} new articles (total: {len(all_articles)})")

    if not all_articles:
        print("\nNo new articles found since last scan.")
        write_pending([])
        return

    rejection_memory = load_rejection_memory()
    if rejection_memory:
        print(f"  Loaded {len(rejection_memory)} rejection memories")

    print(f"\nScoring {len(all_articles)} articles for relevance...")

    # Score in batches of 20 to keep prompts manageable
    scored = []
    batch_size = 20
    for i in range(0, len(all_articles), batch_size):
        batch = all_articles[i : i + batch_size]
        scored.extend(score_articles(batch, client, rejection_memory))

    relevant = [a for a in scored if a.get("relevance_score", 0) >= MIN_RELEVANCE_SCORE]
    relevant.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    top = relevant[:MAX_ARTICLES_PER_SCAN]

    print(f"{len(relevant)} articles above threshold (score ≥ {MIN_RELEVANCE_SCORE}), showing top {len(top)}")

    write_pending_html(top)
    save_seen_urls(seen_urls | seen_this_run)

    # Open review page in browser
    import webbrowser
    webbrowser.open(PENDING_HTML.as_uri())
    print("\nDone. Review page opened in your browser.")


if __name__ == "__main__":
    main()
