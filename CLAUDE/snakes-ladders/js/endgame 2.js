/* endgame.js — where the learning consolidates. DESIGN.md §12.

   Two beats, one module.

   1. THE WIN. Warm, immediate, generous. Winner's token and name, one temple
      bell, confetti from fx.js, one honest line about the road they actually
      took. The board stays visible behind it — never a scrim, never a modal.
      A primary button is present from millisecond zero, so nobody waits.

   2. THE SCORECARD. The worksheet, earned by twelve minutes of dice. Built
      entirely from summarise(state) + content.js, so every line on it is about
      THIS table's game and nobody else's. Every player gets a rank and a
      square that means something; the word "lost" appears nowhere; there is no
      score, no rupee total, no coins, no streak, and nothing to buy.

   Owns: #snl-overlay mount, '.snl-end' namespace, its own CSS. Nothing else. */

import {
  injectCss, esc, tween, prefersReducedMotion, rupees, lakhCrore, ease,
} from './util.js';
import { CFG, dur } from './config.js';
import { t, has, getLang, onLangChange, ordinal, tn } from './i18n.js';
import {
  SQUARES, LADDERS, squareAt, snakeAt, ladderAt, glossaryTerm,
} from './content.js';
import { summarise } from './rules.js';
import { cellToWorld } from './board3d.js';
import * as fx from './fx.js';
import { sfx } from './audio.js';

/* ═══════════════════════════════════════════════════════════════════════════
   1. STRINGS THIS SCREEN NEEDS AND i18n.js DOES NOT YET CARRY
      Every key is tried against i18n first ('has'), so the day i18n.js grows
      one of these it silently wins and this table becomes dead weight. Same
      spoken register as i18n.js: Nagpur kitchen table, never a pamphlet.
   ═══════════════════════════════════════════════════════════════════════════ */

const STR = {
  'end.scorecard':     { en: 'What this game just taught you',
                         hi: 'इस खेल ने आपको क्या सिखाया' },
  'end.scorecardSub':  { en: 'All of it came off the squares you actually landed on.',
                         hi: 'ये सब उन्हीं घरों से निकला है जिन पे आप सचमुच रुके।' },
  'end.seeCard':       { en: 'See what you learned',
                         hi: 'देखो क्या सीखा' },
  'end.stopped':       { en: 'The game stopped the moment {name} reached 100. Everyone else is standing where they stood — and every one of those squares is a real place to be.',
                         hi: 'जैसे ही {name} 100 पे पहुँचे, खेल वहीं रुक गया। बाकी सब जहाँ थे, वहीं खड़े हैं — और उनमें से हर घर एक असली जगह है।' },
  'end.jhatkaHeading': { en: 'JHATKA — NOBODY’S FAULT',
                         hi: 'झटके — किसी की गलती नहीं' },
  'end.jhatkaLine':    { en: '{n} of these hit you. None of them were avoidable, and none of them were yours.',
                         hi: '{n} झटके आए। इनमें से एक भी टाला नहीं जा सकता था, और एक भी आपका किया हुआ नहीं था।' },
  'end.jhatkaOne':     { en: 'One of these hit you. It was not avoidable, and it was not yours.',
                         hi: 'एक झटका आया। न वो टाला जा सकता था, न वो आपका किया हुआ था।' },
  'end.remember':      { en: 'The one thing to remember',
                         hi: 'एक बात, जो याद रखनी है' },
  'end.rememberFrom':  { en: 'From square {n}, where you actually stood.',
                         hi: 'घर {n} से — जहाँ आप सचमुच खड़े थे।' },
  'end.rememberFromWho': { en: 'From square {n}, where {name} actually stood.',
                         hi: 'घर {n} से — जहाँ {name} सचमुच खड़े थे।' },
  'end.glossarySub':   { en: 'Only the words this game actually said to you.',
                         hi: 'सिर्फ़ वो शब्द जो इस खेल ने आपसे कहे।' },
  'end.copy':          { en: 'Copy summary',
                         hi: 'समरी कॉपी' },
  'end.copied':        { en: 'Copied. Paste it wherever you like.',
                         hi: 'कॉपी हो गया। जहाँ चाहो पेस्ट कर दो।' },
  'end.copyManual':    { en: 'Select this and copy it:',
                         hi: 'इसे सेलेक्ट करके कॉपी कर लो:' },
  'end.peek':          { en: 'Scorecard',
                         hi: 'स्कोरकार्ड' },
  'end.peekHint':      { en: 'Esc — look at the board',
                         hi: 'Esc — बोर्ड देखो' },
  'end.counterparty':  { en: 'Who got paid: {who}',
                         hi: 'ये पैसा किसको गया: {who}' },
  'end.nothingMissed': { en: 'Between you, you landed on every teaching square on this board. That has not happened before.',
                         hi: 'आप सबने मिलकर बोर्ड का हर सिखाने वाला घर छू लिया। ये पहले नहीं हुआ।' },
  'end.praiseBoth':    { en: '{name} came down {s} and climbed {l}, and still got there. That is the whole lesson.',
                         hi: '{name} {s} नीचे आए, {l} चढ़े, और फिर भी पहुँच गए। पूरा सबक यही है।' },
  'end.praiseSnakes':  { en: '{name} got bitten {s} and reached 100 anyway. Not one bit of that was luck.',
                         hi: '{name} को {s} मिले, फिर भी 100 पे पहुँचे। ये किस्मत नहीं थी।' },
  'end.praiseLadders': { en: 'A clean climb — {l}, not one bite, {r}.',
                         hi: 'साफ़ चढ़ाई — {l}, एक भी साँप नहीं, {r}।' },
  'end.praisePlain':   { en: 'Straight up the hill in {r}. No shortcuts were available and none were needed.',
                         hi: 'सीधे ऊपर, {r} में। न कोई शॉर्टकट था, न ज़रूरत पड़ी।' },
  'end.snakesCount':   { en: '{n} snakes', hi: '{n} साँप' },
  'end.snakesCount1':  { en: 'one snake', hi: 'एक साँप' },
  'end.laddersCount':  { en: '{n} ladders', hi: '{n} सीढ़ियाँ' },
  'end.laddersCount1': { en: 'one ladder', hi: 'एक सीढ़ी' },
  'end.arrivedAt':     { en: 'square {n}', hi: 'घर {n}' },
  /* pos 0 — the dice never called. Never print "square 0", and never leave the
     meaning line blank under a heading that promises everybody arrived. */
  'end.stillAtStart':  { en: 'Still at the start — the dice never called.',
                         hi: 'अभी शुरुआत पे ही — पासा नहीं आया।' },
  'end.atStartShort':  { en: 'still at the start', hi: 'अभी शुरुआत पे' },
  'end.timesN':        { en: 'landed {n} times', hi: '{n} बार आया' },
};

/** i18n first, always. This table is only the gap-filler. */
function s(key, vars) {
  if (has(key)) return t(key, vars);
  const row = STR[key];
  if (!row) return '';
  const raw = row[getLang()] || row.en;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. DERIVED FACTS — all of it from summarise() + content.js, none of it faked
   ═══════════════════════════════════════════════════════════════════════════ */

/** The teaching squares: what "Jo chhoot gaya" is the complement of. §12 beat 7. */
const TEACHING = SQUARES.filter(q => q.kind === 'lesson' || q.kind === 'quiz' || q.kind === 'milestone');
const TEACHING_N = new Set(TEACHING.map(q => q.n));

/** Money, the only way this codebase is allowed to write it. Full Indian
 *  grouping up to ten lakh, so every figure here reads exactly as content.js
 *  and the snake's own back write it — ₹1,17,000, never "₹1.17 lakh". Above
 *  that, lakh/crore, because ₹1,00,00,000 is not a number anybody reads. */
const money = (n) => (Math.abs(n) >= 1000000 ? lakhCrore(n) : rupees(n));

/** Every square anybody actually STOOD on.
 *  rules.js records 'squaresLearned' AFTER a ladder or snake resolves, so the
 *  ladder foot and the snake head — the two most taught squares on the board —
 *  are missing from 'visited'. Put them back, or "Jo chhoot gaya" lists squares
 *  the table plainly landed on. */
function stoodOn(sum) {
  return new Set([
    ...(sum.visited || []), ...(sum.allLadders || []),
    ...(sum.allSnakes || []), ...(sum.allEvents || []),
  ]);
}

/** The same, for one player's own road. */
function stoodOnBy(p) {
  return new Set([
    ...(p.learned || []), ...(p.ladders || []), ...(p.snakes || []), ...(p.events || []),
  ]);
}

const LS = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode, fine */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* fine */ } },
};

/** Accept a summary, or a raw rules State, and normalise. */
function normalise(input) {
  if (!input) return null;
  if (Array.isArray(input.visited)) return input;
  if (Array.isArray(input.players) && typeof input.turnCount === 'number') {
    try { return summarise(input); } catch { return null; }
  }
  return null;
}

/* The same silhouettes the HUD plaques draw, so the winner's crest, the
   standings chip, the plaque and the 3D piece on square 100 are ONE object.
   ui.js does not export its SIL table, so the path set is duplicated here
   deliberately; if ui.js ever exports it, delete this and import instead.
   Colours come from --pc / --pc-d, set per element from the token spec. */
const SIL = {
  matka: `<path d="M8.1 3.6h7.8a.9.9 0 0 1 0 1.9H8.1a.9.9 0 0 1 0-1.9z" fill="var(--sil-d)"/>
    <path d="M9.4 5.9c-3.6 1.5-5.3 4-5.3 7 0 4.5 3.5 7.6 7.9 7.6s7.9-3.1 7.9-7.6c0-3-1.7-5.5-5.3-7z" fill="var(--sil)"/>
    <path d="M6.2 9.6c-.7 1-1.1 2.1-1.1 3.3 0 3.6 2.6 6.1 5.6 6.6" fill="none" stroke="var(--sil-l)" stroke-width="1.3" stroke-linecap="round" opacity=".65"/>`,
  diya: `<path d="M12 2.4c1.9 2.3 2.8 3.6 2.8 4.9a2.8 2.8 0 1 1-5.6 0c0-1.3.9-2.6 2.8-4.9z" fill="var(--gold)"/>
    <path d="M12 5.1c.9 1.2 1.3 1.8 1.3 2.5a1.3 1.3 0 1 1-2.6 0c0-.7.4-1.3 1.3-2.5z" fill="var(--gold-lt)"/>
    <path d="M2.8 12.4h18.4c0 4-3.8 7-9.2 7s-9.2-3-9.2-7z" fill="var(--sil)"/>
    <path d="M2.8 12.4h18.4" stroke="var(--sil-d)" stroke-width="1.6" stroke-linecap="round"/>`,
  chaabi: `<circle cx="12" cy="6.2" r="3.7" fill="var(--sil)"/>
    <circle cx="12" cy="6.2" r="1.5" fill="var(--cream)"/>
    <path d="M10.9 9.4h2.2v11a1.1 1.1 0 0 1-2.2 0z" fill="var(--sil)"/>
    <path d="M13.1 13.6h3.4v1.9h-3.4zM13.1 17.1h2.6V19h-2.6z" fill="var(--sil-d)"/>`,
  ghanti: `<path d="M12 2.6a1.9 1.9 0 0 1 1.1 3.4h-2.2A1.9 1.9 0 0 1 12 2.6z" fill="var(--sil-d)"/>
    <path d="M12 5.6c-3.9 0-6 3-6.2 6.8-.1 2.5-.8 3.8-1.8 4.9h16c-1-1.1-1.7-2.4-1.8-4.9C17.9 8.6 15.9 5.6 12 5.6z" fill="var(--sil)"/>
    <path d="M8.9 8.6c-.9 1.2-1.3 2.7-1.4 4.2-.1 1.7-.4 2.8-.9 3.7" fill="none" stroke="var(--sil-l)" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
    <circle cx="12" cy="19.3" r="1.9" fill="var(--sil-d)"/>`,
  mithu: `<path d="M13.4 3.9c3.4 0 5.7 2.6 5.7 6 0 2.4-1.2 4.3-3 5.4l1.9 4.9-4.5-3.3c-3.7.3-6.6-2.4-6.6-6 0-4 2.9-7 6.5-7z" fill="var(--sil)"/>
    <path d="M8.2 7.6 4 9.4l4.2 1.9z" fill="var(--gold)"/>
    <circle cx="11.4" cy="8.4" r="1.5" fill="var(--cream)"/>
    <circle cx="11.4" cy="8.4" r=".72" fill="var(--navy)"/>`,
};

const hex6 = (n) => '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0');

/** The token's own piece, drawn — never a system emoji. §11, §12 beat 1. */
function tokenSvg(tk) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SIL[tk.key] || SIL.matka}</svg>`;
}

/** The two custom properties the silhouette paints itself with. */
function tokenVars(tk) {
  const light = tk.css || '#2a9d8f';
  const dark = tk.cssD || (typeof tk.colorD === 'number' ? hex6(tk.colorD) : light);
  return `--pc:${esc(light)};--pc-d:${esc(dark)}`;
}

/** Colour + silhouette for a player, however game.js chose to spell 'token'. */
function tokenOf(p, i) {
  const list = CFG.tokens.players;
  const key = typeof p.token === 'string' ? p.token
            : (p.token && (p.token.key || p.token.id)) || '';
  let base;
  if (p.isBot || key === 'mithu' || p.id === 'bot') base = CFG.tokens.bot;
  else base = list.find(x => x.key === key || x.id === key || x.id === p.id) || list[i % list.length];
  return (p.token && typeof p.token === 'object') ? { ...base, ...p.token } : base;
}

/** summarise() hands back the RAW winner object; the scorecard needs the mapped
 *  one (it carries 'ladders'/'snakes'/'rank'). Always resolve through the list. */
function winnerOf(sum) {
  return sum.players.find(p => p.rank === 1)
      || (sum.winner && sum.players.find(p => p.id === sum.winner.id))
      || sum.players[0];
}

/** The praise line under the winner's name — composed from their real road. */
function praiseFor(sum) {
  const w = winnerOf(sum);
  if (!w) return '';
  const nS = (w.snakes || []).length, nL = (w.ladders || []).length;
  const sTxt = nS === 1 ? s('end.snakesCount1') : s('end.snakesCount', { n: nS });
  const lTxt = nL === 1 ? s('end.laddersCount1') : s('end.laddersCount', { n: nL });
  const rTxt = tn('end.rounds', sum.rounds || 1, { n: sum.rounds || 1 });
  const name = w.name;
  if (nS && nL) return s('end.praiseBoth',    { name, s: sTxt, l: lTxt });
  if (nS)       return s('end.praiseSnakes',  { name, s: sTxt });
  if (nL)       return s('end.praiseLadders', { name, l: lTxt, r: rTxt });
  return s('end.praisePlain', { name, r: rTxt });
}

/** §12 beat 4, per player: the most consequential number on HER OWN path.
 *  A single shared card would state a falsehood to everyone who never stood
 *  on that square, on the one line the sheet asks them to carry out. */
function oneThingFor(p) {
  const bites = (p.snakes || []).map(snakeAt).filter(Boolean)
    .sort((a, b) => (b.cost || 0) - (a.cost || 0));
  if (bites[0]) {
    const S = bites[0];
    return { kind: 'snake', n: S.from, num: S.cost, note: S.costNote,
             name: S.name, line: S.escape, term: S.term };
  }
  const climbs = (p.ladders || []).map(ladderAt).filter(Boolean)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));
  if (climbs[0]) {
    const L = climbs[0];
    return { kind: 'ladder', n: L.from, num: L.amount, note: L.amountNote,
             name: L.name, line: L.how, term: L.term };
  }
  const stood = [...stoodOnBy(p)].sort((a, b) => a - b).map(squareAt).filter(Boolean);
  const q = [...stood].reverse().find(x => x.action) || [...stood].reverse().find(x => x.lesson);
  return q ? { kind: 'square', n: q.n, num: null, note: '',
               name: q.title, line: q.action || q.lesson, term: q.term } : null;
}

/** §12 beat 6: EXACTLY ONE action, never a list. The earliest ladder in
 *  curriculum order that nobody at the table climbed, expressed as a 15-minute
 *  job; falling back to the earliest real square that carries an action.
 *  Never a product, never advice. Returns an array of one so the renderer and
 *  the share text stay uniform if the rule ever changes. */
function weekJobs(sum) {
  const climbed = new Set(sum.allLadders || []);
  for (const L of LADDERS) {
    if (climbed.has(L.from)) continue;
    return [{ id: 'L' + L.from, n: L.from, name: L.name, job: L.how }];
  }
  for (const q of SQUARES) {
    if (!q.action) continue;
    return [{ id: 'S' + q.n, n: q.n, name: q.title, job: q.action }];
  }
  return [];
}

/** Land on square 27 twice and the road card printed the same snake twice,
 *  verbatim. Group by the jump's own foot and carry the count instead. */
function groupJumps(nums, lookup) {
  const m = new Map();
  for (const n of nums || []) {
    const j = lookup(n);
    if (!j) continue;
    const k = j.from != null ? j.from : n;
    const row = m.get(k);
    if (row) row.count += 1; else m.set(k, { jump: j, count: 1 });
  }
  return [...m.values()];
}

/** Every word the game actually said to this table, in board order. */
function glossaryMet(sum) {
  const seen = new Map();   // term -> first square it was met on
  const add = (term, n) => {
    if (!term) return;
    const g = glossaryTerm(term);
    if (!g) return;
    if (!seen.has(g.term) || n < seen.get(g.term).n) seen.set(g.term, { g, n });
  };
  for (const n of stoodOn(sum)) add(squareAt(n)?.term, n);
  for (const n of sum.allLadders || []) add(ladderAt(n)?.term, n);
  for (const n of sum.allSnakes || []) add(snakeAt(n)?.term, n);
  return [...seen.values()].sort((a, b) => a.n - b.n).map(x => x.g);
}

/** The squares no piece stopped on. This is how a 100-square syllabus survives
 *  a 20-square path, and in a classroom it is what the teacher reads out. */
function missedSquares(sum) {
  const stood = stoodOn(sum);
  return TEACHING.filter(q => !stood.has(q.n));
}

/** How many teaching squares this player personally stood on. §12 beat 5. */
const taughtCount = (p) => [...stoodOnBy(p)].filter(n => TEACHING_N.has(n)).length;

/* ═══════════════════════════════════════════════════════════════════════════
   3. CSS — namespaced .snl-end, injected once, only IFM custom properties.
      Reads on a 400-nit phone in daylight and on a washed-out projector.
   ═══════════════════════════════════════════════════════════════════════════ */

const CSS = `
.snl-end{
  position:fixed;inset:0;pointer-events:none;
  font-family:var(--ui);color:var(--navy);
  --e-fs:clamp(15px,3.9vw,17px);
  --e-gap:18px;
  font-size:var(--e-fs);
  -webkit-font-smoothing:antialiased;
}
.snl-end [hidden]{display:none!important}
.snl-end *{box-sizing:border-box}
.snl-end button{
  font-family:var(--ui);font-weight:800;cursor:pointer;border:0;
  min-height:48px;padding:0 18px;border-radius:14px;
  -webkit-tap-highlight-color:transparent;
}
.snl-end button:focus-visible{outline:3px solid var(--teal);outline-offset:3px}

/* ── beat 1 · the arrival. No scrim. The board stays visible. ─────────── */
.snl-end__arrival{
  position:absolute;inset:0;pointer-events:auto;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0;text-align:center;
  padding:calc(24px + var(--sat)) calc(22px + var(--sar)) calc(28px + var(--sab)) calc(22px + var(--sal));
}
.snl-end__bloom{
  position:absolute;left:50%;top:44%;width:min(150vw,150vh);aspect-ratio:1;
  transform:translate(-50%,-50%) scale(.6);transform-origin:center;
  background:radial-gradient(circle,rgba(255,245,214,.96) 0%,rgba(255,245,214,.72) 34%,rgba(247,250,249,0) 68%);
  opacity:0;pointer-events:none;
}
/* The plate. Twelve minutes of dice end on a real object, not on loose
   letterforms lying across the board's numerals. §12 beat 1. */
.snl-end__plate{
  display:flex;flex-direction:column;align-items:center;
  background:rgba(247,250,249,.96);
  border-radius:var(--radius);
  padding:22px 24px 26px;
  box-shadow:var(--shadow-lg);
  max-width:26em;
}
.snl-end__crest{
  width:104px;height:104px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:var(--white);
  border:5px solid var(--pc,var(--teal));
  box-shadow:var(--shadow-lg);
}
.snl-end__crest svg{
  width:62px;height:62px;display:block;
  --sil:var(--pc,var(--teal));--sil-d:var(--pc-d,var(--teal-d));--sil-l:#ffffff;
}
.snl-end__eyebrow{
  margin-top:16px;
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:clamp(2rem,9.4vw,3rem);line-height:1.04;color:var(--gold);
}
.snl-end__won{
  margin-top:6px;font-weight:900;font-size:1.2em;line-height:1.26;color:var(--navy);
}
.snl-end__praise{
  margin-top:12px;max-width:22em;font-weight:600;font-size:1em;line-height:1.5;
  color:var(--muted);background:none;box-shadow:none;padding:0;
}
button.snl-end__go{
  margin-top:22px;
  background:var(--teal);color:var(--white);
  box-shadow:0 4px 0 var(--teal-d),var(--shadow);
  font-size:1.02em;min-height:56px;padding:0 26px;
}
button.snl-end__go:active{transform:translateY(2px);box-shadow:0 2px 0 var(--teal-d)}

/* ── beat 2 · the scorecard sheet ──────────────────────────────────────── */
.snl-end__sheet{
  position:absolute;inset:0;pointer-events:auto;
  display:flex;flex-direction:column;
  background:var(--cream);
}
/* The action bar is fixed and ~95px tall on desktop, ~142px on a phone where
   the buttons wrap. The scroller must clear it or it slices the last line of
   whichever card ends there. */
.snl-end__scroll{
  flex:1 1 auto;min-height:0;
  overflow-y:auto;overflow-x:hidden;
  -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(20px + var(--sat)) calc(16px + var(--sar)) calc(104px + var(--sab)) calc(16px + var(--sal));
}
.snl-end__scroll:focus,.snl-end__scroll:focus-visible{outline:none}
@media (max-width:640px){
  .snl-end__scroll{padding-bottom:calc(168px + var(--sab))}
}
.snl-end__in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:var(--e-gap)}

.snl-end__head{text-align:center;padding:4px 0 2px}
.snl-end__kicker{
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:1.24em;color:var(--gold);
}
.snl-end__sheet h1{
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:clamp(1.6rem,6.6vw,2.2rem);line-height:1.14;color:var(--navy);
  margin:6px 0 0;
}
.snl-end__sheet h1:focus{outline:none}
.snl-end__headSub{margin-top:8px;font-weight:600;font-size:.96em;color:var(--muted);line-height:1.45}

/* cards */
.snl-end__card{
  background:var(--white);border-radius:var(--radius);
  box-shadow:var(--shadow-sm);
  padding:16px 16px 18px;
}
.snl-end__card--tint{background:var(--mint-lt);box-shadow:none}
.snl-end__sheet h2{
  font-weight:900;font-size:.8em;letter-spacing:.13em;text-transform:uppercase;
  color:var(--teal-d);margin:0 0 12px;
}
.snl-end__sheet h3{font-weight:900;font-size:1.04em;line-height:1.3;color:var(--navy);margin:0}
.snl-end__sheet p{line-height:1.5}

/* ── sab pahunche ──
   §12 beat 2: name, the square they finished on, and what that square means.
   The square is a SENTENCE on the meaning line, never a big gold numeral in a
   right-hand column — a right-aligned figure per player in a ranked list is a
   score, and this screen has no score. */
.snl-end__who{
  display:grid;
  grid-template-columns:auto auto 1fr;
  align-items:center;gap:10px;
  padding:11px 0;border-top:2px solid var(--mint-lt);
}
.snl-end__who:first-child{border-top:0}
.snl-end__ord{
  min-width:42px;text-align:center;font-weight:900;font-size:.88em;
  color:var(--navy);background:var(--mint-lt);border-radius:9px;padding:5px 7px;
}
.snl-end__who--win .snl-end__ord{background:var(--gold-lt);color:var(--gold)}
.snl-end__tok{
  width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:var(--white);border:3px solid var(--pc,var(--teal));flex:0 0 auto;
}
.snl-end__tok svg{
  width:24px;height:24px;display:block;
  --sil:var(--pc,var(--teal));--sil-d:var(--pc-d,var(--teal-d));--sil-l:#ffffff;
}
.snl-end__whoName{font-weight:800;font-size:1.02em;line-height:1.25}
.snl-end__whoMeans{
  grid-column:3/4;font-weight:600;font-size:.88em;color:var(--muted);line-height:1.4;margin-top:2px;
}
.snl-end__note{
  margin-top:12px;padding-top:12px;border-top:2px solid var(--mint-lt);
  font-weight:600;font-size:.9em;color:var(--muted);line-height:1.5;
}

/* ── aapka raasta ── */
/* align-items:start — stretch gives both road cards the taller one's height,
   which is equal size and visibly unequal dignity. §12 beat 3. */
.snl-end__roads{display:grid;gap:var(--e-gap);grid-template-columns:1fr;align-items:start}
.snl-end__road{border-left:6px solid var(--pc,var(--teal))}
.snl-end__roadHead{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.snl-end__times{margin-left:8px;font-weight:900;font-size:.8em;color:var(--muted)}
.snl-end__roadHead .snl-end__whoName{font-size:1.1em}
.snl-end__roadAt{margin-left:auto;font-weight:700;font-size:.84em;color:var(--muted)}
.snl-end__sub{
  font-weight:900;font-size:.76em;letter-spacing:.12em;text-transform:uppercase;
  margin:14px 0 8px;display:flex;align-items:center;gap:8px;
}
.snl-end__sub--up{color:var(--teal-d)}
.snl-end__sub--down{color:var(--clay)}
.snl-end__sub--jhatka{color:var(--muted)}
.snl-end__sub::after{content:"";flex:1;height:2px;background:currentColor;opacity:.2}
.snl-end__item{padding:10px 0;border-top:2px solid var(--mint-lt)}
.snl-end__item:first-of-type{border-top:0}
.snl-end__itemTop{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px}
.snl-end__num{
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:1.02em;color:var(--gold);
}
.snl-end__noteSm{font-weight:600;font-size:.8em;color:var(--muted)}
/* §12: the escape is the deliverable, so it is set LARGER than the cost. */
.snl-end__do{
  margin-top:7px;padding:9px 11px;border-radius:var(--radius-sm);
  background:var(--mint);font-weight:700;font-size:1.06em;line-height:1.42;color:var(--navy);
}
.snl-end__do--up{background:var(--mint-lt)}
.snl-end__cp{margin-top:7px;font-weight:400;font-size:.82em;color:var(--muted);line-height:1.45}
.snl-end__flag{
  margin-top:12px;padding:10px 12px;border-radius:var(--radius-sm);
  font-weight:700;font-size:.94em;line-height:1.45;
}
.snl-end__flag--shield{background:var(--gold-lt);color:var(--navy)}
.snl-end__flag--jhatka{background:var(--mint-lt);color:var(--navy)}
.snl-end__flag--read{background:var(--mint-lt);color:var(--navy)}
.snl-end__flag b{display:block;font-size:.78em;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.snl-end__empty{font-weight:600;font-size:.94em;color:var(--muted);line-height:1.45;padding:4px 0}

/* ── ek number ── */
.snl-end__one{
  background:var(--gold-lt);border-radius:var(--radius);padding:20px 18px;text-align:center;
}
/* it lives inside its owner's road card now — one number per road, hers */
.snl-end__road .snl-end__one{margin-top:14px}
.snl-end__oneNum{
  display:block;font-family:var(--display);font-style:italic;font-weight:600;
  font-size:clamp(2.3rem,12vw,3.6rem);line-height:1.02;color:var(--gold);
  margin:2px 0 4px;
}
.snl-end__oneNote{font-weight:700;font-size:.88em;color:var(--navy);opacity:.72}
.snl-end__oneName{margin-top:12px;font-weight:900;font-size:1.06em}
.snl-end__oneLine{
  margin-top:8px;font-weight:700;font-size:1.06em;line-height:1.45;
  max-width:26em;margin-left:auto;margin-right:auto;
}
.snl-end__oneFrom{margin-top:10px;font-weight:600;font-size:.8em;color:var(--muted)}

/* ── is hafte ── */
.snl-end__job{
  display:flex;gap:12px;align-items:flex-start;
  padding:12px 0;border-top:2px solid var(--mint-lt);
}
.snl-end__job:first-of-type{border-top:0}
button.snl-end__box{
  flex:0 0 auto;width:44px;height:44px;min-height:44px;padding:0;
  border-radius:12px;background:var(--mint-lt);border:3px solid var(--teal);
  display:flex;align-items:center;justify-content:center;
  font-size:22px;color:var(--teal-d);line-height:1;
}
button.snl-end__box[aria-pressed="true"]{background:var(--teal);color:var(--white)}
.snl-end__jobBody{flex:1 1 auto;min-width:0}
.snl-end__jobName{font-weight:900;font-size:.98em;line-height:1.3}
.snl-end__jobDo{margin-top:5px;font-weight:600;font-size:.96em;line-height:1.45}
.snl-end__job.is-done .snl-end__jobName,.snl-end__job.is-done .snl-end__jobDo{
  text-decoration:line-through;text-decoration-color:var(--teal);opacity:.55;
}

/* ── details blocks ── */
.snl-end details{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-sm)}
.snl-end summary{
  list-style:none;cursor:pointer;
  min-height:56px;display:flex;align-items:center;gap:10px;
  padding:14px 16px;font-weight:900;font-size:1em;color:var(--navy);
  border-radius:var(--radius);
}
.snl-end summary::-webkit-details-marker{display:none}
.snl-end summary::after{
  content:"▾";margin-left:auto;color:var(--teal-d);font-size:.9em;transition:transform 160ms ease;
}
.snl-end details[open] summary::after{transform:rotate(180deg)}
.snl-end summary:focus-visible{outline:3px solid var(--teal);outline-offset:-3px}
.snl-end__body{padding:0 16px 18px}
.snl-end__count{
  font-weight:800;font-size:.8em;color:var(--muted);
  background:var(--mint-lt);border-radius:20px;padding:4px 10px;
}
.snl-end__missList{display:grid;gap:10px;grid-template-columns:1fr}
.snl-end__miss{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:baseline}
.snl-end__missN{
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:1em;color:var(--gold);min-width:2.1em;
}
.snl-end__missT{font-weight:800;font-size:.96em;line-height:1.3}
.snl-end__missL{font-weight:600;font-size:.9em;color:var(--muted);line-height:1.42;margin-top:2px}
.snl-end__gloss{display:grid;gap:11px;grid-template-columns:1fr}
.snl-end__glossRow{border-top:2px solid var(--mint-lt);padding-top:11px}
.snl-end__glossRow:first-child{border-top:0;padding-top:0}
.snl-end__term{font-weight:900;font-size:.96em}
.snl-end__said{font-weight:700;font-size:.9em;color:var(--teal-d);margin-top:2px}
.snl-end__mean{font-weight:600;font-size:.9em;color:var(--muted);line-height:1.42;margin-top:2px}

/* ── teacher box ── */
.snl-end__teacher{
  border:3px dashed var(--muted);border-radius:var(--radius);
  background:transparent;padding:16px;
}
.snl-end__teacherQ{
  font-family:var(--display);font-style:italic;font-weight:600;
  font-size:1.2em;line-height:1.35;color:var(--navy);margin-top:6px;
}

/* ── the honest footer ── */
.snl-end__foot{
  text-align:center;font-weight:600;font-size:.86em;color:var(--muted);
  line-height:1.5;padding:2px 8px 4px;
}

/* ── copy fallback ── */
.snl-end__manual{margin-top:10px}
.snl-end__manual textarea{
  width:100%;min-height:150px;border-radius:var(--radius-sm);
  border:2px solid var(--mint);background:var(--white);color:var(--navy);
  padding:10px;font-family:var(--ui);font-size:.86em;line-height:1.45;font-weight:600;
  -webkit-user-select:text;user-select:text;
}

/* ── the action bar ── */
.snl-end__bar{
  flex:0 0 auto;
  display:flex;gap:10px;align-items:center;
  padding:12px calc(14px + var(--sar)) calc(12px + var(--sab)) calc(14px + var(--sal));
  background:var(--white);
  box-shadow:0 -8px 24px rgba(26,58,92,.10);
}
.snl-end__barIn{display:flex;gap:10px;align-items:center;width:100%;max-width:760px;margin:0 auto}
button.snl-end__again{
  flex:1 1 auto;background:var(--teal);color:var(--white);
  box-shadow:0 4px 0 var(--teal-d);font-size:1.02em;min-height:54px;
}
button.snl-end__again:active{transform:translateY(2px);box-shadow:0 2px 0 var(--teal-d)}
button.snl-end__ghost{
  flex:0 0 auto;background:var(--mint-lt);color:var(--navy);min-height:54px;
}
@media (max-width:540px){
  .snl-end__barIn{flex-wrap:wrap}
  button.snl-end__again{flex:1 1 100%;order:-1}
  button.snl-end__ghost{flex:1 1 0;min-width:0;padding:0 12px;font-size:.94em}
}
.snl-end__toast{
  position:absolute;left:50%;bottom:calc(96px + var(--sab));transform:translateX(-50%);
  background:var(--navy);color:var(--white);font-weight:700;font-size:.9em;
  padding:11px 16px;border-radius:12px;box-shadow:var(--shadow-lg);
  max-width:min(88vw,420px);text-align:center;line-height:1.4;
  opacity:0;pointer-events:none;
}
.snl-end__toast.is-on{opacity:1}

/* ── minimised · Escape puts the board back in the room ─────────────── */
button.snl-end__peek{
  position:absolute;left:50%;transform:translateX(-50%);
  bottom:calc(18px + var(--sab));pointer-events:auto;
  background:var(--teal);color:var(--white);
  box-shadow:0 4px 0 var(--teal-d),var(--shadow-lg);
  min-height:54px;font-size:1em;
}

/* ── projector / desktop: bigger type, two columns, one screenful of hall ── */
@media (min-width:860px){
  .snl-end{--e-fs:19px;--e-gap:22px}
  .snl-end__in{max-width:1100px}
  .snl-end__roads{grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}
  .snl-end__missList{grid-template-columns:1fr 1fr;gap:12px 26px}
  .snl-end__gloss{grid-template-columns:1fr 1fr;gap:12px 26px}
  .snl-end__scroll{padding-left:calc(28px + var(--sal));padding-right:calc(28px + var(--sar))}
}
@media (min-width:1280px){ .snl-end{--e-fs:21px} }

/* ── motion. Everything here is a courtesy, never a gate. ─────────────── */
@media (prefers-reduced-motion:reduce){
  .snl-end *,.snl-end *::before,.snl-end *::after{
    animation-duration:1ms!important;animation-iteration-count:1!important;
    transition-duration:1ms!important;
  }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   4. RENDERERS — plain strings, escaped at every seam
   ═══════════════════════════════════════════════════════════════════════════ */

function meansOf(pos) {
  const q = squareAt(pos);
  /* never blank, and never "square 0" — pos 0 means the dice never called */
  if (!q) return s('end.stillAtStart');
  return q.title;
}

/** "finished on square 91 · Kaagaz taiyaar" — the square as a sentence. */
function whereLine(pos) {
  const q = squareAt(pos);
  if (!q) return s('end.stillAtStart');
  return `${t('end.finishedOn', { n: pos })} · ${q.title}`;
}

/** "1st · square 91", or "1st · still at the start" when nobody moved. */
function atLine(p, i) {
  const where = squareAt(p.pos) ? s('end.arrivedAt', { n: p.pos }) : s('end.atStartShort');
  return `${ordinal(p.rank || i + 1)} · ${where}`;
}

function renderStandings(sum) {
  const rows = sum.players.map((p, i) => {
    const tk = tokenOf(p, i);
    const win = p.rank === 1;
    return `<li class="snl-end__who${win ? ' snl-end__who--win' : ''}" style="${tokenVars(tk)}">
      <span class="snl-end__ord">${esc(ordinal(p.rank || i + 1))}</span>
      <span class="snl-end__tok">${tokenSvg(tk)}</span>
      <span class="snl-end__whoName">${esc(p.name)}<span class="sr-only"> — ${esc(t('token.aria', { name: p.name, token: tk.label }))}</span></span>
      <span class="snl-end__whoMeans">${esc(whereLine(p.pos))}</span>
    </li>`;
  }).join('');
  const w = winnerOf(sum);
  const note = sum.players.length > 1 && w
    ? `<p class="snl-end__note">${esc(s('end.stopped', { name: w.name }))}</p>` : '';
  return `<section class="snl-end__card">
    <h2>${esc(t('end.everyone'))}</h2>
    <ol class="snl-end__whoList">${rows}</ol>
    ${note}
  </section>`;
}

/** the "landed here twice" chip — printed once, never the whole card again */
function timesChip(count) {
  return count > 1
    ? `<span class="snl-end__times" aria-label="${esc(s('end.timesN', { n: count }))}">&times;${count}</span>` : '';
}

function renderLadderItem(row) {
  const L = row.jump;
  return `<li class="snl-end__item">
    <p class="snl-end__itemTop">
      <span class="snl-end__whoName">${esc(L.name)}${timesChip(row.count)}</span>
      <span class="snl-end__num">${esc(money(L.amount))}</span>
      <span class="snl-end__noteSm">${esc(L.amountNote || '')}</span>
    </p>
    <p class="snl-end__do snl-end__do--up">${esc(L.how)}</p>
  </li>`;
}

function renderSnakeItem(row) {
  const S = row.jump;
  return `<li class="snl-end__item">
    <p class="snl-end__itemTop">
      <span class="snl-end__whoName">${esc(S.name)}${timesChip(row.count)}</span>
      <span class="snl-end__num">${esc(money(S.cost))}</span>
      <span class="snl-end__noteSm">${esc(S.costNote || '')}</span>
    </p>
    <p class="snl-end__do">${esc(S.escape)}</p>
    <p class="snl-end__cp">${esc(s('end.counterparty', { who: S.counterparty }))}</p>
  </li>`;
}

function renderRoad(p, i, sum) {
  const tk = tokenOf(p, i);
  const ls = groupJumps(p.ladders, ladderAt);
  const sn = groupJumps(p.snakes, snakeAt);

  const upBlock = ls.length
    ? `<h3 class="snl-end__sub snl-end__sub--up">${esc(t('end.laddersHeading'))}</h3>
       <ul>${ls.map(renderLadderItem).join('')}</ul>`
    : `<h3 class="snl-end__sub snl-end__sub--up">${esc(t('end.laddersHeading'))}</h3>
       <p class="snl-end__empty">${esc(t('end.noLadders'))}</p>`;

  const downBlock = sn.length
    ? `<h3 class="snl-end__sub snl-end__sub--down">${esc(t('end.snakesHeading'))}</h3>
       <ul>${sn.map(renderSnakeItem).join('')}</ul>`
    : `<h3 class="snl-end__sub snl-end__sub--down">${esc(t('end.snakesHeading'))}</h3>
       <p class="snl-end__empty">${esc(t('end.noSnakes'))}</p>`;

  let shield = '';
  if (p.shieldUsed > 0) {
    shield = `<p class="snl-end__flag snl-end__flag--shield"><b>${esc(t('end.shieldHeading'))}</b>${esc(tn('end.shieldSaved', p.shieldUsed, { n: p.shieldUsed }))}</p>`;
  } else if (p.shield) {
    shield = `<p class="snl-end__flag snl-end__flag--shield"><b>${esc(t('end.shieldHeading'))}</b>${esc(t('end.shieldHeld'))}</p>`;
  }

  let jhatka = '';
  if ((p.events || []).length) {
    const names = p.events.map(n => squareAt(n)?.event?.name).filter(Boolean);
    const nEv = p.events.length;
    const evLine = nEv === 1 ? s('end.jhatkaOne') : s('end.jhatkaLine', { n: nEv });
    jhatka = `<p class="snl-end__flag snl-end__flag--jhatka"><b>${esc(s('end.jhatkaHeading'))}</b>${esc(evLine)}${
      names.length ? ' — ' + esc(names.join(', ')) + '.' : ''}</p>`;
  }

  /* §12 beat 5 — the player who fell furthest read the most. True, computed,
     and the only honest consolation in the game. Never pity, never a prize. */
  let readMost = '';
  const last = sum.players[sum.players.length - 1];
  const win = sum.players[0];
  if (sum.players.length > 1 && p === last && win && p !== win) {
    const mine = taughtCount(p), theirs = taughtCount(win);
    if (mine > theirs) {
      readMost = `<p class="snl-end__flag snl-end__flag--read"><b>${esc(t('end.readMost'))}</b>${
        esc(t('end.readMostBody', { mine, name: win.name, theirs }))}</p>`;
    }
  }

  /* §12 beat 4 — one number, hers, off her own road. Never a shared figure
     addressed as "you" to a table where half of them never stood there. */
  const one = renderOne(oneThingFor(p), p.name);

  return `<article class="snl-end__card snl-end__road" style="${tokenVars(tk)}">
    <div class="snl-end__roadHead">
      <span class="snl-end__tok">${tokenSvg(tk)}</span>
      <span class="snl-end__whoName">${esc(p.name)}</span>
      <span class="snl-end__roadAt">${esc(atLine(p, i))}</span>
    </div>
    ${upBlock}${downBlock}${shield}${jhatka}${readMost}${one}
  </article>`;
}

function renderOne(one, name) {
  if (!one) return '';
  const num = one.num
    ? `<span class="snl-end__oneNum">${esc(money(one.num))}</span>
       <span class="snl-end__oneNote">${esc(one.note || '')}</span>` : '';
  const from = name
    ? s('end.rememberFromWho', { n: one.n, name })
    : s('end.rememberFrom', { n: one.n });
  return `<section class="snl-end__one">
    <h2>${esc(one.num ? t('end.oneNumber') : s('end.remember'))}</h2>
    ${num}
    <p class="snl-end__oneName">${esc(one.name)}</p>
    <p class="snl-end__oneLine">${esc(one.line)}</p>
    <p class="snl-end__oneFrom">${esc(from)}</p>
  </section>`;
}

function renderJobs(jobs) {
  const rows = jobs.map(j => {
    const done = LS.get('snl.week.' + j.id) === '1';
    return `<li class="snl-end__job${done ? ' is-done' : ''}" data-job="${esc(j.id)}">
      <button type="button" class="snl-end__box" data-check="${esc(j.id)}"
              aria-pressed="${done ? 'true' : 'false'}"
              aria-label="${esc(t('end.thisWeekDone'))}: ${esc(j.name)}">${done ? '✓' : ''}</button>
      <div class="snl-end__jobBody">
        <p class="snl-end__jobName">${esc(j.name)}</p>
        <p class="snl-end__jobDo">${esc(j.job)}</p>
      </div>
    </li>`;
  }).join('');
  if (!rows) return '';
  return `<section class="snl-end__card">
    <h2>${esc(t('end.thisWeek'))}</h2>
    <p class="snl-end__headSub" style="margin:-4px 0 8px;text-align:left">${esc(t('end.thisWeekSub'))}</p>
    <ul>${rows}</ul>
  </section>`;
}

function renderMissed(list) {
  if (!list.length) {
    return `<section class="snl-end__card snl-end__card--tint">
      <h2>${esc(t('end.missed'))}</h2>
      <p class="snl-end__empty">${esc(s('end.nothingMissed'))}</p>
    </section>`;
  }
  const rows = list.map(q => `<li class="snl-end__miss">
      <span class="snl-end__missN">${q.n}</span>
      <span><span class="snl-end__missT">${esc(q.title)}</span>
      <span class="snl-end__missL">${esc(q.lesson)}</span></span>
    </li>`).join('');
  return `<details class="snl-end__missed">
    <summary>${esc(t('end.missed'))}<span class="snl-end__count">${list.length}</span></summary>
    <div class="snl-end__body">
      <p class="snl-end__headSub" style="text-align:left;margin:0 0 12px">${esc(t('end.missedSub'))}</p>
      <ul class="snl-end__missList">${rows}</ul>
    </div>
  </details>`;
}

function renderGlossary(words) {
  if (!words.length) return '';
  const rows = words.map(g => `<li class="snl-end__glossRow">
      <p class="snl-end__term">${esc(g.term)}</p>
      <p class="snl-end__said">${esc(g.hinglish)}</p>
      <p class="snl-end__mean">${esc(g.plain)}</p>
    </li>`).join('');
  return `<details class="snl-end__glossary" open>
    <summary>${esc(t('glossary.title'))}<span class="snl-end__count">${words.length}</span></summary>
    <div class="snl-end__body">
      <p class="snl-end__headSub" style="text-align:left;margin:0 0 12px">${esc(s('end.glossarySub'))}</p>
      <ul class="snl-end__gloss">${rows}</ul>
    </div>
  </details>`;
}

function renderTeacher() {
  return `<section class="snl-end__teacher">
    <h2 style="color:var(--muted)">${esc(t('end.teacher'))}</h2>
    <p class="snl-end__teacherQ">${esc(t('end.teacherQ'))}</p>
  </section>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. THE SHARE TEXT — plain text, on the clipboard, going nowhere else.
      No link, no beacon, no tracking parameter, nothing to sign up for.
   ═══════════════════════════════════════════════════════════════════════════ */

export function shareText(input) {
  const sum = normalise(input);
  if (!sum) return '';
  const L = [];
  const w = winnerOf(sum);
  L.push(`${t('app.name')} — ${t('app.byline')}`);
  L.push('');
  if (w) L.push(`${t('end.arrival')} ${w.name} — ${t('end.finishedOn', { n: w.pos })} · ${tn('end.rounds', sum.rounds || 1, { n: sum.rounds || 1 })}`);
  L.push('');
  L.push(t('end.everyone') + ':');
  sum.players.forEach((p, i) => {
    L.push(`${ordinal(p.rank || i + 1)}  ${p.name} — ${whereLine(p.pos)}`);
  });

  const times = (c) => (c > 1 ? ` (${s('end.timesN', { n: c })})` : '');
  const ls = groupJumps(sum.allLadders, ladderAt);
  const sn = groupJumps(sum.allSnakes, snakeAt);
  if (ls.length) {
    L.push('');
    L.push(t('end.laddersHeading') + ':');
    for (const r of ls) L.push(`^ ${r.jump.name}${times(r.count)} — ${money(r.jump.amount)} ${r.jump.amountNote || ''}\n   ${r.jump.how}`);
  }
  if (sn.length) {
    L.push('');
    L.push(t('end.snakesHeading') + ':');
    for (const r of sn) L.push(`v ${r.jump.name}${times(r.count)} — ${money(r.jump.cost)} ${r.jump.costNote || ''}\n   ${r.jump.escape}`);
  }

  /* one number per player, off their own road — the sheet must not tell the
     whole table that a square only one of them stood on was theirs */
  for (const p of sum.players) {
    const one = oneThingFor(p);
    if (!one) continue;
    L.push('');
    L.push(`${p.name} — ${one.num ? t('end.oneNumber') : s('end.remember')}: ${one.num ? money(one.num) + ' — ' : ''}${one.name}`);
    L.push(`   ${one.line}`);
  }

  const jobs = weekJobs(sum);
  if (jobs.length) {
    L.push('');
    L.push(t('end.thisWeek') + ':');
    L.push(`${jobs[0].name} — ${jobs[0].job}`);
  }

  const miss = missedSquares(sum);
  if (miss.length) {
    L.push('');
    L.push(`${t('end.missed')} (${miss.length}): ${miss.map(q => `${q.n} ${q.title}`).join(' · ')}`);
  }

  L.push('');
  L.push(t('end.noScore'));
  return L.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. THE SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */

let open = false;
export function isOpen() { return open; }

/**
 * Mount the end of the game into #snl-overlay.
 * @param {HTMLElement} root      #snl-overlay
 * @param {object} summary        summarise(state) — a raw State is accepted too
 * @param {object} [opts]         { workshop?:boolean }
 * @returns {Promise<'again'|'home'>}
 */
export function showEndgame(root, summary, opts = {}) {
  injectCss('end', CSS);
  const sum = normalise(summary);
  const mount = root || document.getElementById('snl-overlay') || document.body;
  const rm = prefersReducedMotion();
  const workshop = !!(opts.workshop ?? summary?.workshop ?? summary?.opts?.workshop);

  return new Promise((resolve) => {
    /* Nothing to show — never strand the conductor. */
    if (!sum || !sum.players || !sum.players.length) { resolve('home'); return; }

    open = true;
    const wrap = document.createElement('div');
    wrap.className = 'snl-end';
    wrap.setAttribute('data-snl', 'endgame');
    mount.appendChild(wrap);

    const winner = winnerOf(sum);
    const wTok = tokenOf(winner, Math.max(0, sum.players.indexOf(winner)));

    /* ── beat 1 ─────────────────────────────────────────────────────── */
    wrap.innerHTML = `
      <div class="snl-end__bloom" aria-hidden="true"></div>
      <section class="snl-end__arrival" role="dialog" aria-labelledby="snl-end-arr">
        <div class="snl-end__plate" style="${tokenVars(wTok)}">
          <div class="snl-end__crest">${tokenSvg(wTok)}</div>
          <p class="snl-end__eyebrow">${esc(t('end.arrival'))}</p>
          <h2 class="snl-end__won" id="snl-end-arr">${esc(t('end.arrivalSub', { name: winner.name }))}</h2>
          <p class="snl-end__praise">${esc(praiseFor(sum))}</p>
        </div>
        <button type="button" class="snl-end__go">${esc(s('end.seeCard'))} ▸</button>
      </section>`;

    const bloom = wrap.querySelector('.snl-end__bloom');
    const arrival = wrap.querySelector('.snl-end__arrival');
    const goBtn = wrap.querySelector('.snl-end__go');

    announce(`${t('a11y.liveWin', { name: winner.name })} ` +
      sum.players.map((p, i) => `${p.name}: ${ordinal(p.rank || i + 1)}, ${t('end.finishedOn', { n: p.pos })}.`).join(' '));

    /* the win sound, and confetti settling on square 100 */
    try { sfx.win(); } catch { /* audio is a bonus, never a channel */ }
    /* One burst seeded inside a quarter-cell of square 100 lands about fifteen
       specks in a corner of the frame while the eye is on the plate in the
       middle. Spend the SAME tier budget across three seeds — the winner's own
       square plus the two centre cells — so the celebration covers the picture.
       The third argument is fx.js's spread; harmless on builds without it. */
    try {
      const cap = CFG.quality.current?.particles;
      const total = Math.min(CFG.fx.confetti.count,
        typeof cap === 'number' ? cap : CFG.fx.confetti.count);
      const main = Math.max(1, Math.round(total * 0.5));
      const side = Math.max(1, Math.round((total - main) / 2));
      fx.confetti(cellToWorld(100), main, 2.5);
      fx.confetti(cellToWorld(45), side, 2.5);
      fx.confetti(cellToWorld(56), side, 2.5);
    } catch { /* 2D board, no pools */ }

    if (rm) {
      bloom.style.opacity = '.5';
      bloom.style.transform = 'translate(-50%,-50%) scale(1)';
    } else {
      /* the bloom used to die at 760ms while the beat ran to 1600, leaving the
         second half of the celebration with nothing warm behind it */
      tween(dur('celebrate', rm) || 1600, (t01, e) => {
        bloom.style.opacity = String(0.30 + (1 - Math.pow(t01, 2)) * 0.60);
        bloom.style.transform = `translate(-50%,-50%) scale(${0.6 + e * 0.55})`;
      }, ease.out).then(() => { bloom.style.opacity = '0'; });
      arrival.animate(
        [{ opacity: 0, transform: 'translateY(14px) scale(.965)' }, { opacity: 1, transform: 'none' }],
        { duration: dur('endgameIn', rm) || 260, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
      );
    }

    /* ── state ──────────────────────────────────────────────────────── */
    let phase = 'arrival';       // 'arrival' | 'sheet' | 'peek'
    let sheet = null, scrollBox = null, peekBtn = null, toastEl = null, toastT = 0;
    let holdT = 0, done = false;
    const offLang = onLangChange(() => { if (phase !== 'arrival') buildSheet(true); });

    holdT = setTimeout(() => { if (phase === 'arrival') toSheet(); }, dur('celebrate', rm) || 600);

    /* Tap anywhere on the arrival — the button, the line, the board around it. */
    arrival.addEventListener('click', () => { click(); toSheet(); });
    goBtn.focus({ preventScroll: true });

    document.addEventListener('keydown', onKey, true);

    function onKey(e) {
      if (done) return;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (phase === 'arrival') toSheet();
        else if (phase === 'sheet') minimise();
        else restore();
        return;
      }
      if (phase === 'sheet' && e.key === 'Tab') trapTab(e);
    }

    /* ── beat 2 ─────────────────────────────────────────────────────── */
    function toSheet() {
      if (phase !== 'arrival') return;
      clearTimeout(holdT);
      phase = 'sheet';
      try { fx.clearFx(); } catch { /* nothing to clear */ }
      arrival.remove();
      bloom.remove();
      buildSheet(false);
    }

    function buildSheet(keepScroll) {
      const scrollTop = keepScroll && sheet ? sheet.querySelector('.snl-end__scroll').scrollTop : 0;
      if (sheet) sheet.remove();

      const jobs = weekJobs(sum);
      const miss = missedSquares(sum);
      const words = glossaryMet(sum);

      sheet = document.createElement('section');
      sheet.className = 'snl-end__sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'snl-end-h');
      sheet.innerHTML = `
        <div class="snl-end__scroll" tabindex="-1">
          <div class="snl-end__in">
            <header class="snl-end__head">
              <p class="snl-end__kicker">${esc(t('end.arrival'))}</p>
              <h1 id="snl-end-h">${esc(s('end.scorecard'))}</h1>
              <p class="snl-end__headSub">${esc(s('end.scorecardSub'))}</p>
              <p class="sr-only">${esc(s('end.peekHint'))}</p>
            </header>
            ${renderStandings(sum)}
            <section>
              <h2 style="text-align:center;color:var(--muted);margin-bottom:10px">${esc(t('end.yourPath'))}</h2>
              <div class="snl-end__roads">${sum.players.map((p, i) => renderRoad(p, i, sum)).join('')}</div>
            </section>
            ${renderJobs(jobs)}
            ${renderMissed(miss)}
            ${renderGlossary(words)}
            ${workshop ? renderTeacher() : ''}
            <p class="snl-end__foot">${esc(t('end.noScore'))}</p>
          </div>
        </div>
        <div class="snl-end__bar">
          <div class="snl-end__barIn">
            <button type="button" class="snl-end__again" data-act="again">${esc(t('end.playAgain'))}</button>
            <button type="button" class="snl-end__ghost" data-act="copy">${esc(s('end.copy'))}</button>
            <button type="button" class="snl-end__ghost" data-act="home">${esc(t('common.back'))}</button>
          </div>
        </div>
        <div class="snl-end__toast" role="status" aria-live="polite"></div>`;
      wrap.appendChild(sheet);

      scrollBox = sheet.querySelector('.snl-end__scroll');
      toastEl = sheet.querySelector('.snl-end__toast');
      scrollBox.scrollTop = scrollTop;

      sheet.addEventListener('click', onSheetClick);

      if (!rm && !keepScroll) {
        sheet.animate(
          [{ transform: 'translateY(4%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: dur('endgameIn', rm) || 400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
        );
      }
      /* Focus lands on the SCROLLER, not the heading. Chrome matches
         :focus-visible on programmatic focus when no pointer preceded it — the
         default auto-advance path — which painted a 3px teal ring around the
         title and made the first thing on the page look like an empty input.
         announce() already reads the winner and the ranks. */
      if (!keepScroll) scrollBox.focus({ preventScroll: true });
    }

    function onSheetClick(e) {
      const check = e.target.closest('[data-check]');
      if (check) {
        const id = check.getAttribute('data-check');
        const on = check.getAttribute('aria-pressed') === 'true';
        check.setAttribute('aria-pressed', on ? 'false' : 'true');
        check.textContent = on ? '' : '✓';
        check.closest('.snl-end__job').classList.toggle('is-done', !on);
        if (on) LS.del('snl.week.' + id); else LS.set('snl.week.' + id, '1');
        click();
        if (!on) toast(t('end.thisWeekSaved'));
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const what = act.getAttribute('data-act');
      click();
      if (what === 'copy') copySummary();
      else finish(what === 'again' ? 'again' : 'home');
    }

    /* ── Escape puts the board back in the room, without ending anything.
          A facilitator wants to point at square 66 while the table argues. ── */
    function minimise() {
      if (phase !== 'sheet' || !sheet) return;
      phase = 'peek';
      sheet.hidden = true;
      peekBtn = document.createElement('button');
      peekBtn.type = 'button';
      peekBtn.className = 'snl-end__peek';
      peekBtn.textContent = s('end.peek');
      peekBtn.addEventListener('click', () => { click(); restore(); });
      wrap.appendChild(peekBtn);
      peekBtn.focus({ preventScroll: true });
      announce(s('end.peek'));
    }

    function restore() {
      if (phase !== 'peek') return;
      phase = 'sheet';
      peekBtn?.remove(); peekBtn = null;
      sheet.hidden = false;
      scrollBox?.focus({ preventScroll: true });
    }

    /* keep Tab inside the scorecard — it is the only thing on screen */
    function trapTab(e) {
      if (!sheet) return;
      const f = [...sheet.querySelectorAll('button, summary, [href], input, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(n => !n.hidden && n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === scrollBox)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    /* ── share: clipboard, with a graceful fallback and no external call ── */
    async function copySummary() {
      const text = shareText(sum);
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
      } catch { ok = false; }
      if (!ok) ok = legacyCopy(text);
      if (ok) { toast(s('end.copied')); return; }
      manualCopy(text);
    }

    function legacyCopy(text) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, text.length);
        const done2 = document.execCommand && document.execCommand('copy');
        ta.remove();
        return !!done2;
      } catch { return false; }
    }

    /* Last resort: put the text on screen, selected, and say so. Never a dead end. */
    function manualCopy(text) {
      if (sheet.querySelector('.snl-end__manual')) return;
      const box = document.createElement('div');
      box.className = 'snl-end__card snl-end__manual';
      box.innerHTML = `<h2>${esc(s('end.copyManual'))}</h2>
        <textarea readonly aria-label="${esc(s('end.copy'))}"></textarea>`;
      box.querySelector('textarea').value = text;
      sheet.querySelector('.snl-end__in').appendChild(box);
      const ta = box.querySelector('textarea');
      ta.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' });
      ta.focus(); ta.select();
    }

    function toast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('is-on');
      clearTimeout(toastT);
      toastT = setTimeout(() => toastEl.classList.remove('is-on'), CFG.timing.toast);
    }

    /* ── teardown ───────────────────────────────────────────────────────
       Resolve FIRST, fade after. game.js has a rematch to rebuild in under
       800ms and must never wait on a cosmetic frame — and in a backgrounded
       tab a Web Animation's 'finished' may not settle at all, which would
       strand the conductor forever. The node stops taking taps immediately,
       so the fade can never eat the first press of the next screen. ── */
    function finish(result) {
      if (done) return;
      done = true; open = false;
      clearTimeout(holdT); clearTimeout(toastT);
      document.removeEventListener('keydown', onKey, true);
      offLang();
      wrap.style.pointerEvents = 'none';
      if (rm) { wrap.remove(); }
      else {
        try {
          wrap.animate([{ opacity: 1 }, { opacity: 0 }],
            { duration: 180, easing: 'linear', fill: 'both' });
        } catch { /* older browsers just cut */ }
        setTimeout(() => wrap.remove(), 200);
      }
      resolve(result);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. SMALL SHARED BITS
   ═══════════════════════════════════════════════════════════════════════════ */

function click() { try { sfx.click(); } catch { /* silent is fine */ } }

function announce(msg) {
  const live = document.getElementById('snl-live');
  if (!live) return;
  live.textContent = '';
  /* a beat between the two writes, so a screen reader re-reads the region.
     setTimeout, not rAF — a backgrounded tab must still announce. */
  setTimeout(() => { live.textContent = msg; }, 24);
}

/** Test hook: everything this screen derives, without touching the DOM. */
export const __test = Object.freeze({
  TEACHING, missedSquares, weekJobs, oneThingFor, glossaryMet, praiseFor, money,
  normalise, stoodOn, stoodOnBy, taughtCount, groupJumps, whereLine,
});
