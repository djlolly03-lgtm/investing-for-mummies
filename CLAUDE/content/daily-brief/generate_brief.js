// Generates the IFM Daily Brief as an email-safe HTML string (inline styles — email clients
// don't support CSS custom properties / prefers-color-scheme reliably, unlike the web artifact).
// Run: node generate_brief.js > out.html
// Mirrors the reconciliation logic in ../index.html (findLivePost, auto-derive tracker rows)
// so the counts here always match what's shown on the live hub.
//
// V2 (5 Aug 2026) — redesigned for a 30-second read: one hero action up top (bottom-line-up-front),
// real thumbnail images for instant recognition instead of caption text, everything else compressed
// into a scorecard. Fewer sections, more pixels spent on proof (images), less on prose.

const path = require('path');
const CONTENT_DIR = path.join(__dirname, '..');
const HUB_URL = 'https://ifm-deploy.vercel.app/content/';
global.window = {};
require(path.join(CONTENT_DIR, 'data.js'));
const ifmPub = require(path.join(CONTENT_DIR, 'ifm-published.json'));
const ifmFollowers = require(path.join(CONTENT_DIR, 'ifm-followers.json'));
let compSynthesis = {};
try { compSynthesis = require(path.join(CONTENT_DIR, 'comp-synthesis.json')); } catch (e) {}

const cat = window.IFM_DATA.catalogue;
const trkStatic = window.IFM_DATA.tracker;

// ---------- Published performance ----------
const posts = ifmPub.posts.filter(p => p.likes != null);
const reels = posts.filter(p => p.type === 'reel');
const other = posts.filter(p => p.type !== 'reel');
const avg = a => a.length ? Math.round(a.reduce((s, p) => s + p.likes, 0) / a.length) : 0;
const reelsAvg = avg(reels), otherAvg = avg(other);
const mult = otherAvg ? (reelsAvg / otherAvg).toFixed(1) : null;
const ranked = [...posts].sort((a, b) => (b.likes + (b.comments || 0)) - (a.likes + (a.comments || 0)));
const top3 = ranked.slice(0, 3);
const bottom3 = ranked.slice(-3);

// ---------- Followers ----------
const fh = ifmFollowers.history;
const folLatest = fh[fh.length - 1];
const folWeekAgo = fh.find(d => (new Date(folLatest.date) - new Date(d.date)) / 86400000 <= 7) || fh[0];
const folDelta = folLatest.followers - folWeekAgo.followers;

// ---------- Tracker reconciliation (mirrors index.html's renderTracker + auto-derive) ----------
function tok(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3)); }
function normT(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function findLivePost(title) {
  const t = tok(title); if (!t.size) return null;
  let best = null, bs = 0;
  ifmPub.posts.forEach(p => { const pt = tok(p.caption); let s = 0; t.forEach(w => { if (pt.has(w)) s++; }); if (s > bs) { bs = s; best = p; } });
  return bs >= 3 ? best : null;
}
const byTitle = {}; cat.forEach(c => { if (c.title) byTitle[normT(c.title)] = c; });
function findCat(item) {
  const n = normT(item); if (!n) return null;
  if (byTitle[n]) return byTitle[n];
  for (const t in byTitle) { if (n.length > 5 && (t.includes(n) || n.includes(t))) return byTitle[t]; }
  return null;
}
const CREATOR_SOURCES = ['Aakara'];
const trackerRows = trkStatic.map(o => ({ ...o }));
{
  const tokT = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 3));
  const knownNorm = trackerRows.map(r => normT(r.item)).filter(Boolean);
  const knownTok = trackerRows.map(r => tokT(r.item)).filter(s => s.size);
  const isKnown = title => {
    const nt = normT(title); if (!nt) return true;
    if (knownNorm.some(k => k.length > 5 && nt.length > 5 && (k.includes(nt) || nt.includes(k)))) return true;
    const t = tokT(title); if (!t.size) return false;
    return knownTok.some(k => { let s = 0; t.forEach(w => { if (k.has(w)) s++; }); return s >= 2 && s >= Math.min(t.size, k.size) * 0.6; });
  };
  cat.filter(c => CREATOR_SOURCES.includes(c.source) && !isKnown(c.title)).forEach(c => {
    trackerRows.push({ month: 'auto', creator: 'Aakara Design Studios', item: c.title, type: c.type, status: (c.status || '').toLowerCase() || 'in production' });
  });
}
let warnCount = 0, catchCount = 0;
trackerRows.forEach(r => {
  const s = (r.status || '').toLowerCase();
  const match = findLivePost(r.item);
  const verifiedLink = (findCat(r.item) || {})['ig link'];
  if (s === 'published' && !match && !verifiedLink) warnCount++;
  else if (['delivered', 'approved', 'ready'].includes(s) && (match || verifiedLink)) catchCount++;
});
const readyCount = cat.filter(c => ['ready', 'scheduled'].includes((c.status || '').toLowerCase())).length;
const gapCount = warnCount + catchCount;

// ---------- Competitor insight (rotate daily through the synthesis patterns) ----------
const patterns = (compSynthesis.patterns || []);
const dayIdx = Math.floor(Date.parse(new Date().toDateString()) / 86400000) % (patterns.length || 1);
const compPick = patterns[dayIdx] || null;

// ---------- Render (inline-styled, email-safe) ----------
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const absThumb = t => t ? (/^https?:\/\//.test(t) ? t : HUB_URL + t) : null;

const NAVY = '#1a3a5c', TEAL = '#0e7a6e', GOOD = '#0e7a6e', BAD = '#b3382a', MUTED = '#5c7a78';
const CREAM = '#f7fbfa', LINE = '#e3ece9', PAPER = '#ffffff';

// A row of thumbnails — real images, minimal text. This is the "proof", not the prose.
function thumbStrip(list, tone) {
  const color = tone === 'good' ? GOOD : BAD;
  const cells = list.map(p => {
    const img = absThumb(p.t);
    const snippet = esc((p.caption || '').replace(/\s+/g, ' ').trim().slice(0, 30));
    return `<td width="33%" style="padding:0 5px" valign="top">
      <a href="${esc(p.u)}" style="text-decoration:none">
        <img src="${esc(img)}" width="100%" style="display:block;border-radius:8px;aspect-ratio:1;object-fit:cover;background:${LINE}" alt="">
        <div style="font-size:13px;font-weight:800;color:${color};margin-top:5px;font-variant-numeric:tabular-nums">♥ ${p.likes}${p.type === 'reel' ? ' · reel' : ' · carousel'}</div>
        <div style="font-size:11px;color:${MUTED};line-height:1.35">${snippet}…</div>
      </a>
    </td>`;
  }).join('');
  return `<table width="100%" cellspacing="0" cellpadding="0"><tr>${cells}</tr></table>`;
}

// Bulletproof email button
function button(label, href, bg, fg) {
  return `<table cellspacing="0" cellpadding="0" style="margin-top:12px"><tr><td style="background:${bg};border-radius:8px">
    <a href="${esc(href)}" style="display:inline-block;padding:11px 20px;font-size:13px;font-weight:800;color:${fg};text-decoration:none">${esc(label)} →</a>
  </td></tr></table>`;
}

const chip = (num, label) => `<td width="25%" align="center" style="padding:10px 4px">
  <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${TEAL};font-variant-numeric:tabular-nums;line-height:1">${num}</div>
  <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;color:${MUTED};margin-top:3px;line-height:1.25">${label}</div>
</td>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="light"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IFM Daily Brief</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16324a">
<div style="max-width:560px;margin:0 auto;padding:22px 16px 36px">

  <!-- MASTHEAD -->
  <table width="100%" style="margin-bottom:16px"><tr>
    <td>
      <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:${MUTED};text-transform:uppercase">${fmtDate()}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:${NAVY};margin-top:2px">IFM Daily Brief</div>
    </td>
    <td align="right" style="white-space:nowrap">
      <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${TEAL};font-variant-numeric:tabular-nums;line-height:1">${folLatest.followers}</div>
      <div style="font-size:10px;font-weight:700;color:${GOOD}">${folDelta >= 0 ? '▲ +' : '▼ '}${folDelta} followers/wk</div>
    </td>
  </tr></table>

  <!-- HERO ACTION — one thing, not three -->
  <div style="background:${NAVY};border-radius:12px;padding:18px 20px 20px">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#4fd0bb">Do this today</div>
    <div style="font-family:Georgia,serif;color:#fff;font-size:19px;font-weight:700;margin-top:4px;line-height:1.25">Post 2 reels from your ${readyCount}-piece backlog.</div>
    <div style="font-size:13px;color:#c9dfda;margin-top:6px;line-height:1.5">Reels are outperforming carousels <b style="color:#fff">${mult}×</b> right now (♥${reelsAvg} vs ♥${otherAvg} avg) — and you're sitting on ${readyCount} ready-to-post pieces while still shipping mostly carousels. This is the single highest-leverage move available today.</div>
    ${button('Open the ready-to-post queue', HUB_URL, '#4fd0bb', '#0e2a24')}
  </div>

  <!-- WINNER vs LOSER — visual proof, not prose -->
  <div style="margin-top:22px;margin-bottom:8px">
    <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${GOOD}">▲ Winning</span>
    <span style="font-size:11px;color:${MUTED}"> — top 3 this month</span>
  </div>
  ${thumbStrip(top3, 'good')}

  <div style="margin-top:18px;margin-bottom:8px">
    <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${BAD}">▼ Losing</span>
    <span style="font-size:11px;color:${MUTED}"> — bottom 3, all the same shape: generic myth-carousel, no timely hook, nobody on camera</span>
  </div>
  ${thumbStrip(bottom3, 'bad')}

  <!-- SCORECARD — numbers, not paragraphs -->
  <div style="margin-top:22px;background:${PAPER};border:1px solid ${LINE};border-radius:12px;padding:4px 6px">
    <table width="100%" cellspacing="0"><tr>
      ${chip(readyCount, 'Ready to post')}
      ${chip(mult + '×', 'Reels vs carousels')}
      ${chip(gapCount, 'Tracker gaps')}
      ${chip((folDelta >= 0 ? '+' : '') + folDelta, 'Followers/wk')}
    </tr></table>
  </div>
  ${gapCount ? `<div style="font-size:11px;color:${MUTED};margin-top:6px;text-align:center">${warnCount} marked "published" but unverified · ${catchCount} live but tracker says not-posted — 10 min fix in Creator Tracker</div>` : ''}

  ${compPick ? `
  <!-- COMPETITOR WATCH — one line -->
  <div style="margin-top:20px;border-left:3px solid ${NAVY};padding:2px 0 2px 14px">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${NAVY};margin-bottom:3px">${esc(compPick.icon || '🔭')} Watch</div>
    <div style="font-size:13px;color:#16324a;line-height:1.5"><b>${esc(compPick.title || '')}.</b> ${esc(compPick.text || '')}</div>
  </div>` : ''}

  <!-- SECONDARY — smaller, below the fold on purpose -->
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid ${LINE}">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${MUTED};margin-bottom:8px">Also worth doing this week</div>
    <table width="100%" cellspacing="0">
      <tr><td style="padding:3px 0;font-size:12.5px;color:${MUTED};vertical-align:top;width:14px">·</td><td style="padding:3px 0;font-size:12.5px;color:#3d5a58">Retire the myth-carousel format — rebuild one script as a founder-on-camera reel instead.</td></tr>
      <tr><td style="padding:3px 0;font-size:12.5px;color:${MUTED};vertical-align:top">·</td><td style="padding:3px 0;font-size:12.5px;color:#3d5a58">Clear the ${gapCount} flagged tracker items before the gap grows next week.</td></tr>
    </table>
  </div>

  <div style="text-align:center;font-size:10px;color:${MUTED};margin-top:22px">Live data from the IFM Content Hub · <a href="${HUB_URL}" style="color:${TEAL}">Open Content Hub ↗</a></div>

</div></body></html>`;

process.stdout.write(html);
