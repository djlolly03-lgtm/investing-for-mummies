"""
IFM News Agency server — full workflow in the browser.
Start: python server.py
Then click "Get Today's News" in the IFM app.
"""

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

from flask import Flask, Response, request, jsonify
import threading, json, subprocess, re, sys
from datetime import datetime, timedelta

# Import simplify logic directly
sys.path.insert(0, str(Path(__file__).parent))
from simplify import fetch_article_text, simplify_article, save_rejections
import anthropic

app = Flask(__name__)
BASE_DIR    = Path(__file__).parent
CLAUDE_DIR  = BASE_DIR.parent / "CLAUDE"
NEWS_JSON   = CLAUDE_DIR / "news-data.json"
OUTPUT_DIR  = BASE_DIR / "simplified"
REJECTION_FILE = BASE_DIR / "rejection_memory.json"
COOLDOWN_FILE  = BASE_DIR / ".last_scan"
COOLDOWN_HOURS = 24

# ── shared state ──────────────────────────────────────────────────────────────
_state = {
    "phase": "idle",       # idle | cooldown | scanning | review | processing | done
    "articles": [],        # scanned articles waiting for review
    "log": [],             # progress messages shown to user
    "error": None,
    "cooldown_remaining": "",
}
_lock = threading.Lock()

def set_phase(phase, **kw):
    with _lock:
        _state["phase"] = phase
        _state.update(kw)

def log(msg):
    with _lock:
        _state["log"].append(msg)
    print(msg)

# ── cooldown helpers ──────────────────────────────────────────────────────────
def hours_remaining() -> float:
    if not COOLDOWN_FILE.exists():
        return 0
    try:
        last = datetime.fromisoformat(COOLDOWN_FILE.read_text().strip())
        secs = (timedelta(hours=COOLDOWN_HOURS) - (datetime.now() - last)).total_seconds()
        return max(0.0, secs / 3600)
    except Exception:
        return 0

# ── scan worker ───────────────────────────────────────────────────────────────
def _do_scan():
    try:
        COOLDOWN_FILE.write_text(datetime.now().isoformat())
        log("📡 Fetching RSS feeds…")

        from scan import fetch_rss_feed, score_articles, load_rejection_memory
        from config import RSS_FEEDS, MIN_RELEVANCE_SCORE, MAX_ARTICLES_PER_SCAN

        seen_file = BASE_DIR / ".seen_urls.json"
        seen = set(json.loads(seen_file.read_text())) if seen_file.exists() else set()
        all_articles, seen_this_run = [], set()

        for name, url in RSS_FEEDS:
            items = fetch_rss_feed(name, url)
            new = [a for a in items if a["url"] not in seen and a["url"] not in seen_this_run]
            all_articles.extend(new)
            seen_this_run.update(a["url"] for a in new)
            log(f"  {name}: +{len(new)} new articles")

        if not all_articles:
            set_phase("review", articles=[], log=_state["log"])
            seen_file.write_text(json.dumps(sorted(seen | seen_this_run), indent=2))
            return

        log(f"\n🤖 Scoring {len(all_articles)} articles with Claude…")
        client = anthropic.Anthropic()
        rejection_memory = load_rejection_memory()
        scored, batch_size = [], 20
        for i in range(0, len(all_articles), batch_size):
            scored.extend(score_articles(all_articles[i:i+batch_size], client, rejection_memory))

        relevant = sorted(
            [a for a in scored if a.get("relevance_score", 0) >= MIN_RELEVANCE_SCORE],
            key=lambda x: x.get("relevance_score", 0), reverse=True
        )[:MAX_ARTICLES_PER_SCAN]

        log(f"✅ Found {len(relevant)} relevant articles — review below")
        seen_file.write_text(json.dumps(sorted(seen | seen_this_run), indent=2))
        set_phase("review", articles=relevant)

    except Exception as e:
        set_phase("idle", error=str(e))
        log(f"❌ Error: {e}")

# ── simplify + deploy worker ──────────────────────────────────────────────────
def _do_simplify(approved_urls, rejected, manual_urls):
    try:
        set_phase("processing")
        all_urls = approved_urls + manual_urls

        if rejected:
            log(f"💾 Saving {len(rejected)} rejection(s) to memory…")
            save_rejections(rejected)

        if not all_urls:
            log("No articles approved — nothing to simplify.")
            set_phase("done")
            return

        OUTPUT_DIR.mkdir(exist_ok=True)
        client = anthropic.Anthropic()
        date_str = datetime.now().strftime("%Y-%m-%d")
        saved = []

        for i, url in enumerate(all_urls, 1):
            log(f"\n[{i}/{len(all_urls)}] Fetching article…")
            text = fetch_article_text(url)
            if not text or len(text) < 100 or text.startswith("[Could not"):
                log("  ⚠️  Could not fetch — skipping")
                continue
            log(f"  ✨ Simplifying with Claude…")
            simplified = simplify_article(url, text, client)
            slug = re.sub(r"[^a-z0-9]+", "-", url.rstrip("/").split("/")[-1].lower()).strip("-")[:60]
            fname = OUTPUT_DIR / f"{date_str}-{slug}.md"
            fname.write_text(f"# Simplified\n\n**Source:** {url}\n\n---\n\n{simplified}\n", encoding="utf-8")
            saved.append((url, simplified))
            log(f"  ✅ Saved: {fname.name}")

        if saved:
            existing = []
            if NEWS_JSON.exists():
                try:
                    existing = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
                except Exception:
                    pass
            new_entries = []
            for url, simplified in saved:
                m = re.search(r"\*\*(.+?)\*\*", simplified)
                title = m.group(1) if m else url.split("/")[-1]
                new_entries.append({"title": title, "url": url, "source": "", "date": date_str, "simplified": simplified})
            all_articles = new_entries + existing
            NEWS_JSON.write_text(json.dumps(all_articles[:20], ensure_ascii=False, indent=2), encoding="utf-8")
            log(f"\n📄 Updated news-data.json ({len(new_entries)} new articles)")

        log("\n🚀 Deploying to Vercel…")
        result = subprocess.run(["vercel", "deploy", "--prod"], cwd=str(CLAUDE_DIR), capture_output=True, text=True)
        if result.returncode == 0:
            log("✅ Deployed! Refresh the IFM app to see new articles.")
        else:
            log(f"⚠️  Deploy issue: {result.stderr[:200]}")

        set_phase("done")

    except Exception as e:
        log(f"❌ Error during simplification: {e}")
        set_phase("done", error=str(e))

# ── routes ────────────────────────────────────────────────────────────────────
@app.after_request
def _cors(resp):
    """Allow the deployed https:// site to reach this http://localhost server.

    Chrome's Private Network Access sends a CORS preflight for public → private
    requests and requires Allow-Private-Network on the response, so a plain
    Allow-Origin header is not enough for the /status probe to succeed.
    """
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Private-Network"] = "true"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

@app.route("/scan")
def scan():
    hrs = hours_remaining()
    if hrs > 0:
        h, m = int(hrs), int((hrs % 1) * 60)
        t = f"{h}h {m}m" if h else f"{m}m"
        set_phase("cooldown", cooldown_remaining=t)
    elif _state["phase"] not in ("scanning", "processing"):
        set_phase("scanning", articles=[], log=[], error=None)
        threading.Thread(target=_do_scan, daemon=True).start()
    return _serve_app()

@app.route("/")
def index():
    return _serve_app()

@app.route("/api/state")
def api_state():
    with _lock:
        data = dict(_state)
    return Response(json.dumps(data), mimetype="application/json",
                    headers={"Access-Control-Allow-Origin": "*"})

@app.route("/api/decide", methods=["POST"])
def api_decide():
    if _state["phase"] != "review":
        return jsonify({"error": "Not in review phase"}), 400
    data = request.json or {}
    approved  = data.get("approved", [])
    rejected  = data.get("rejected", [])
    manual    = [u.strip() for u in data.get("manual", "").splitlines() if u.strip().startswith("http")]
    with _lock:
        _state["log"] = []
    threading.Thread(target=_do_simplify, args=(approved, rejected, manual), daemon=True).start()
    return jsonify({"status": "started"})

@app.route("/api/reset", methods=["POST"])
def api_reset():
    set_phase("idle", articles=[], log=[], error=None)
    return jsonify({"status": "ok"})

@app.route("/status")
def status():
    hrs = hours_remaining()
    h, m = int(hrs), int((hrs % 1) * 60)
    data = {
        "available": hrs == 0 and _state["phase"] not in ("scanning","processing"),
        "scanning": _state["phase"] in ("scanning","processing"),
        "next_in": f"{h}h {m}m" if hrs > 0 else "now",
    }
    return Response(json.dumps(data), mimetype="application/json",
                    headers={"Access-Control-Allow-Origin": "*"})

def _serve_app():
    return Response(APP_HTML, mimetype="text/html")

# ── frontend HTML ─────────────────────────────────────────────────────────────
APP_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IFM News Agency</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@1,600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:#f7faf9;color:#1a3a5c;padding:0 0 80px}
.hero{background:linear-gradient(135deg,#1a3a5c 0%,#0e5a4e 60%,#2a9d8f 100%);padding:28px 24px 24px;text-align:center;color:#fff}
.hero h1{font-family:'Lora',serif;font-style:italic;font-size:1.6rem;margin-bottom:6px}
.hero p{font-size:0.85rem;opacity:.85}
.wrap{max-width:640px;margin:0 auto;padding:20px 16px}
.phase-box{background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 12px rgba(26,58,92,.08);margin-bottom:16px;text-align:center}
.phase-box .icon{font-size:2.6rem;margin-bottom:12px}
.phase-box h2{font-family:'Lora',serif;font-style:italic;font-size:1.2rem;margin-bottom:8px}
.phase-box p{font-size:0.85rem;color:#5a7d8a;line-height:1.6}
.badge{display:inline-block;background:#e0f3f0;color:#2a9d8f;font-weight:800;font-size:0.75rem;padding:3px 12px;border-radius:20px;margin:10px 0}
.log-box{background:#f0f7f6;border-radius:10px;padding:14px;margin-top:14px;text-align:left;font-size:0.8rem;color:#1a3a5c;line-height:1.8;max-height:200px;overflow-y:auto;white-space:pre-wrap}
.card{background:#fff;border-radius:12px;padding:18px 20px;box-shadow:0 1px 6px rgba(26,58,92,.08);margin-bottom:12px;transition:border .15s}
.card.approved{border:2px solid #2a9d8f}
.card.rejected{border:2px solid #e57373;opacity:.55}
.meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}
.source{font-size:0.7rem;font-weight:800;color:#5a7d8a;text-transform:uppercase}
.date{font-size:0.7rem;color:#bbb}
.score{font-size:0.68rem;font-weight:700;color:#fff;padding:2px 8px;border-radius:20px}
.title{font-size:0.95rem;font-weight:700;color:#1a3a5c;text-decoration:none;display:block;margin-bottom:5px;line-height:1.4}
.title:hover{color:#2a9d8f}
.reason-tag{font-size:0.78rem;color:#2a9d8f;margin-bottom:5px}
.summary{font-size:0.82rem;color:#5a7d8a;line-height:1.5;margin-bottom:12px}
.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn-approve{background:none;border:2px solid #2a9d8f;color:#2a9d8f;font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:800;border-radius:8px;padding:6px 14px;cursor:pointer;transition:all .15s}
.btn-approve.on,.btn-approve:hover{background:#2a9d8f;color:#fff}
.btn-reject{background:none;border:2px solid #ddd;color:#aaa;font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:800;border-radius:8px;padding:6px 14px;cursor:pointer;transition:all .15s}
.btn-reject.on,.btn-reject:hover{border-color:#e57373;color:#e57373;background:#fff5f5}
.reject-input{width:100%;margin-top:8px;padding:8px 12px;border:2px solid #f4c2c2;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;outline:none}
.manual-box{background:#fff;border-radius:12px;padding:18px 20px;box-shadow:0 1px 6px rgba(26,58,92,.08);margin-bottom:12px}
.manual-box h3{font-size:0.9rem;font-weight:800;color:#1a3a5c;margin-bottom:6px}
.manual-box p{font-size:0.8rem;color:#5a7d8a;margin-bottom:10px}
.manual-box textarea{width:100%;min-height:80px;padding:10px 12px;border:2px solid #e0f3f0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;resize:vertical;outline:none}
.sticky{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #e0f3f0;padding:12px 20px;display:flex;gap:12px;align-items:center;box-shadow:0 -2px 12px rgba(26,58,92,.08);z-index:99}
.btn-main{background:#2a9d8f;color:#fff;border:none;padding:11px 26px;border-radius:10px;font-family:'Nunito',sans-serif;font-size:0.92rem;font-weight:800;cursor:pointer;transition:background .2s}
.btn-main:hover{background:#1a7a6e}
.btn-main:disabled{background:#bbb;cursor:not-allowed}
.count{font-size:0.85rem;color:#5a7d8a;flex:1}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #e0f3f0;border-top-color:#2a9d8f;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="hero">
  <h1>IFM News Agency</h1>
  <p>Scan · Review · Publish</p>
</div>
<div class="wrap" id="app">
  <div class="phase-box"><div class="icon">⏳</div><h2>Loading…</h2></div>
</div>

<script>
var articles = [], state = {};

function poll() { fetch('/api/state').then(r=>r.json()).then(render).catch(()=>{}); setTimeout(poll, 2000); }

function render(s) {
  state = s;
  var ph = s.phase, app = document.getElementById('app');

  if (ph === 'idle') {
    app.innerHTML = '<div class="phase-box"><div class="icon">📰</div><h2>Ready to scan</h2>'
      +'<p>Click "Scan for news" in the IFM app to start, or trigger from here.</p>'
      +'<div style="margin-top:16px"><button class="btn-main" onclick="triggerScan()">🔄 Scan now</button></div></div>';

  } else if (ph === 'cooldown') {
    app.innerHTML = '<div class="phase-box"><div class="icon">⏳</div><h2>Cooldown active</h2>'
      +'<p>Articles were already scanned recently.</p>'
      +'<div class="badge">Next scan in '+s.cooldown_remaining+'</div>'
      +'<p style="margin-top:8px">Close this tab — today\'s articles are already in the app.</p></div>';

  } else if (ph === 'scanning') {
    var logHtml = s.log && s.log.length ? '<div class="log-box">'+escHtml(s.log.join('\\n'))+'</div>' : '';
    app.innerHTML = '<div class="phase-box"><div class="icon"><span class="spinner"></span>🔍</div>'
      +'<h2>Scanning for articles…</h2><p>Finding and scoring today\'s articles. Hang tight!</p>'+logHtml+'</div>';

  } else if (ph === 'review') {
    articles = s.articles || [];
    renderReview(articles);

  } else if (ph === 'processing') {
    var logHtml = s.log && s.log.length ? '<div class="log-box">'+escHtml(s.log.join('\\n'))+'</div>' : '';
    app.innerHTML = '<div class="phase-box"><div class="icon"><span class="spinner"></span>✨</div>'
      +'<h2>Simplifying &amp; publishing…</h2><p>Fetching articles, rewriting with Claude, deploying to Vercel.</p>'+logHtml+'</div>';

  } else if (ph === 'done') {
    var logHtml = s.log && s.log.length ? '<div class="log-box">'+escHtml(s.log.join('\\n'))+'</div>' : '';
    app.innerHTML = '<div class="phase-box"><div class="icon">🎉</div><h2>Published!</h2>'
      +'<p>New articles are live. Go refresh the IFM app.</p>'+logHtml
      +'<div style="margin-top:16px"><button class="btn-main" onclick="reset()">Start fresh</button></div></div>';
  }
}

function renderReview(arts) {
  var app = document.getElementById('app');
  if (!arts.length) {
    app.innerHTML = '<div class="phase-box"><div class="icon">📭</div><h2>No new articles found</h2>'
      +'<p>Nothing scored above the relevance threshold today. Try again tomorrow.</p></div>';
    return;
  }
  var cards = arts.map(function(a,i) {
    var sc = a.relevance_score || 0;
    var col = sc >= 8 ? '#2a9d8f' : sc >= 6 ? '#e9c46a' : '#aaa';
    return '<div class="card" id="c'+i+'">'
      +'<div class="meta"><span class="source">'+escHtml(a.source||'')+'</span>'
      +'<span class="date">'+escHtml(a.published||'')+'</span>'
      +'<span class="score" style="background:'+col+'">'+sc+'/10</span></div>'
      +'<a class="title" href="'+escHtml(a.url)+'" target="_blank">'+escHtml(a.title)+'</a>'
      +'<p class="reason-tag">💡 '+escHtml(a.relevance_reason||'')+'</p>'
      +'<p class="summary">'+escHtml((a.summary||'').substring(0,200))+'…</p>'
      +'<div class="actions">'
      +'<button class="btn-approve" id="ap'+i+'" onclick="toggle('+i+',\'approve\')">✓ Approve</button>'
      +'<button class="btn-reject" id="rj'+i+'" onclick="toggle('+i+',\'reject\')">✗ Reject</button>'
      +'</div>'
      +'<div id="rr'+i+'" style="display:none"><input class="reject-input" id="rsn'+i+'" placeholder="Why reject? e.g. too advanced, wrong topic…"></div>'
      +'</div>';
  }).join('');

  var manual = '<div class="manual-box"><h3>➕ Add your own articles</h3>'
    +'<p>Paste URLs here (one per line) — added to the simplify queue.</p>'
    +'<textarea id="manual-urls" placeholder="https://…"></textarea></div>';

  var sticky = '<div class="sticky"><button class="btn-main" id="pub-btn" onclick="publish()" disabled>Save &amp; Publish</button>'
    +'<span class="count" id="pub-count">0 approved · 0 rejected</span></div>';

  app.innerHTML = cards + manual + sticky;
}

var decisions = {};
function toggle(i, action) {
  var cur = decisions[i];
  if (cur === action) { delete decisions[i]; }
  else { decisions[i] = action; }
  var ap = document.getElementById('ap'+i), rj = document.getElementById('rj'+i);
  var rr = document.getElementById('rr'+i), card = document.getElementById('c'+i);
  var d = decisions[i];
  ap.classList.toggle('on', d==='approve');
  rj.classList.toggle('on', d==='reject');
  card.classList.toggle('approved', d==='approve');
  card.classList.toggle('rejected', d==='reject');
  rr.style.display = (d==='reject') ? 'block' : 'none';
  updateCount();
}

function updateCount() {
  var ap=0, rj=0;
  for (var k in decisions) { if(decisions[k]==='approve') ap++; else rj++; }
  var btn = document.getElementById('pub-btn'), cnt = document.getElementById('pub-count');
  if (btn) btn.disabled = (ap+rj===0);
  if (cnt) cnt.textContent = ap+' approved · '+rj+' rejected';
}

function publish() {
  var approved=[], rejected=[];
  for (var k in decisions) {
    var i=parseInt(k), a=articles[i];
    if (decisions[k]==='approve') approved.push(a.url);
    else {
      var rsn = document.getElementById('rsn'+k);
      rejected.push({title:a.title,url:a.url,source:a.source||'',reason:(rsn?rsn.value.trim():'') || 'not suitable'});
    }
  }
  var manual = document.getElementById('manual-urls');
  fetch('/api/decide',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({approved,rejected,manual:manual?manual.value:''})});
}

function triggerScan() { window.location.href='/scan'; }
function reset() { fetch('/api/reset',{method:'POST'}); }

function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

poll();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    print("\n🗞  IFM News Server running at http://localhost:8765")
    print("   Click 'Get Today\'s News' in the IFM app, or open http://localhost:8765/scan")
    print("   Press Ctrl+C to stop.\n")
    app.run(port=8765, host="127.0.0.1", debug=False)
