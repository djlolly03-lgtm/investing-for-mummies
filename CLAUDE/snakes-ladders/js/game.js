/* game.js — the conductor. The only module allowed to know all the others.
   It owns: boot order, the turn loop, Mithu's turn policy, the handoff card,
   the ribbon-vs-card decision, the endgame handoff, and window.__SNL.

   Everything else here is a translation job: rules.js hands back an ordered
   event list and this file plays it as animation, sound and teaching. */

import { CFG, timing, game as GAME } from './config.js';
import {
  clamp, wait, injectCss, esc, prefersReducedMotion, rupees, tween, ease,
} from './util.js';
import * as RULES from './rules.js';
import * as CONTENT from './content.js';
import * as scene from './scene.js';
import * as board from './board3d.js';
import * as sl from './snakes3d.js';
import * as tokens from './tokens3d.js';
import * as dice from './dice3d.js';
import * as camera from './camera.js';
import * as fx from './fx.js';
import * as ui from './ui.js';
import * as lesson from './lesson.js';
import * as setup from './setup.js';
import * as endgame from './endgame.js';
import * as audio from './audio.js';
import { t, setLang, getLang, onLangChange } from './i18n.js';

export const VERSION = CFG.VERSION || '1.0.0';

/* ═══════════════════════════════════════════════════════════════════════════
   1. STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const G = {
  booted: false,
  three: null,          // { scene, camera, renderer, tier }
  state: null,          // the rules.js State
  roster: [],           // the rich player descriptors from setup.js
  options: {},
  screen: 'boot',       // 'setup' | 'playing' | 'lesson' | 'endgame'
  turnId: 0,
  ribbonsShown: 0,        // §5.2 teaching moments — one per landing, all 100
  cardsShown: 0,          // §5.3 teaching moments — the 38 that grow into a card
  handoffsShown: 0,       // real changes of hands, not turn-loop iterations
  running: false,
  loopId: 0,
  errors: [],
};

let busy = 0;                       // >0 while anything is animating
let rollGate = null;                // armed while we wait for a roll
let handoffGate = null;             // armed while the handoff card is up
let forcedValue = null;             // set by __SNL.forceRoll
let pendingLesson = null;           // the teaching moment we are waiting on
let lessonHandle = null;            // its .land() / .dismiss() control
let botTimer = 0, turnTimer = 0;
let handoffEl = null;
/* Who is physically holding the device right now. The handoff card is a card
   about a CHANGE OF HANDS, not about a change of turn: a six buys the same
   person another roll, and the person who set the game up is already holding
   the phone when player 1 rolls. Both used to get a full screen of flat colour
   telling them to pass the device to themselves. */
let deviceHolder = null;
/* The lesson card's own full-width button IS the pass-the-phone button (§5.3).
   When it was pressed, the pass has already happened and a second sheet saying
   the same thing costs a tap and hides the board twice. */
let cardHandedOff = false;
let pendingLessonPasses = false;    // the pending card carries a pass button
let readyResolve;
const readyPromise = new Promise(r => { readyResolve = r; });

const enter = () => { busy++; };
const leave = () => { busy = Math.max(0, busy - 1); };
async function inBusy(fn) { enter(); try { return await fn(); } finally { leave(); } }

const rm = () => prefersReducedMotion();
const D = (k) => {
  const v = timing[k];
  return rm() ? Math.max(0, Math.round(v * (CFG.reduced?.scale ?? 0.35))) : v;
};
const raf = () => new Promise(r => requestAnimationFrame(() => r()));
const overlay = () => document.getElementById('snl-overlay') || document.body;
const noteError = (e) => {
  const s = (e && (e.stack || e.message)) || String(e);
  if (G.errors.length < 40) G.errors.push(s);
  if (CFG.DEBUG) console.error(e);
};
const guard = (fn) => { try { return fn(); } catch (e) { noteError(e); } };

function makeGate() {
  let res, settled = false;
  const p = new Promise(r => { res = r; });
  return { p, fire(v) { if (!settled) { settled = true; res(v); } }, get settled() { return settled; } };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. THE HANDOFF CARD — §3.1. Nobody else owns it, so it lives here.
   ═══════════════════════════════════════════════════════════════════════════ */

const HANDOFF_CSS = `
.snl-handoff{--hs:var(--snl-text-scale,1);position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;
  pointer-events:auto;background:var(--pc,var(--teal));opacity:0;visibility:hidden;
  transition:opacity 120ms cubic-bezier(.33,1,.68,1),visibility 0s linear 120ms}
.snl-handoff[hidden]{display:none}
.snl-handoff.is-in{opacity:1;visibility:visible;transition-delay:0s}
/* visibility must stay on through the exit, or the card vanishes on frame one
   and the fade we are paying for is never seen. */
.snl-handoff.is-out{opacity:0;visibility:visible;transform:translateY(-6%);
  transition:opacity 120ms ease-in,transform 120ms ease-in}
.snl-handoff__in{display:flex;flex-direction:column;align-items:center;gap:calc(14px * var(--hs));text-align:center;
  padding:calc(24px * var(--hs) + var(--sat)) calc(24px * var(--hs)) calc(24px * var(--hs) + var(--sab));
  transform:scale(.94);opacity:0;transition:transform 160ms cubic-bezier(.34,1.56,.64,1),opacity 140ms ease-out}
.snl-handoff.is-in .snl-handoff__in{transform:none;opacity:1}
.snl-handoff__tok{width:calc(96px * var(--hs));height:calc(96px * var(--hs));border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:calc(52px * var(--hs));line-height:1;background:rgba(255,255,255,.92);box-shadow:0 10px 30px rgba(0,0,0,.18)}
/* the game's own hand-drawn piece, cloned off the live standings plaque, not the
   OS emoji — a Greek amphora has no business standing in for a matka */
.snl-handoff__sil{width:calc(58px * var(--hs));height:calc(58px * var(--hs));display:block;
  --sil:var(--pc,var(--teal));--sil-d:var(--pc-d,var(--pc,var(--teal)));--sil-l:#ffffff}
/* Ink is COMPUTED per player colour in handoffInk() and set as --ink /
   --ink-soft / --ink-halo, because white is not legible on half the roster:
   white on saffron is 2.68:1 and on brass 2.42:1, against a 4.5:1 spec.
   Nothing here may carry an opacity — an 88% white over saffron measured
   2.40:1, so the fade that made the standings "secondary" was the bug. The
   soft ink is a real colour, tinted only as far as 4.7:1 allows. */
.snl-handoff__name{font-family:var(--display);font-style:italic;font-weight:600;color:var(--ink,#fff);
  font-size:calc(clamp(1.9rem,8vw,2.75rem) * var(--hs));line-height:1.1;
  text-shadow:0 2px 10px var(--ink-halo,rgba(0,0,0,.18))}
.snl-handoff__tap{font-family:var(--ui);font-weight:900;letter-spacing:.22em;font-size:calc(.9375rem * var(--hs));
  color:var(--ink-soft,#fff);opacity:1;text-transform:uppercase}
/* the standings, so the incoming player can see who is winning before the board
   comes back — the plaque strip she would read is underneath this card */
.snl-handoff__sq{font-family:var(--ui);font-weight:700;font-size:calc(.9375rem * var(--hs));
  color:var(--ink-soft,#fff);opacity:1;
  max-width:26ch;line-height:1.55;text-wrap:balance}

/* §7.5 is a portrait-PHONE spec: a phone gets handed over, so the card is
   full-bleed. A tablet flat on a table, a laptop or a projector never is, and a
   full screen of flat colour between turns hides the board a whole room is
   looking at. Anything wider than a phone gets the card as a plaque over the
   live board instead. */
@media (min-width:600px){
  .snl-handoff{background:rgba(26,58,92,.30)}
  .snl-handoff__in{background:var(--pc,var(--teal));border-radius:var(--radius-lg);
    box-shadow:var(--shadow-lg);padding:calc(30px * var(--hs)) calc(52px * var(--hs));
    min-width:calc(400px * var(--hs));max-width:min(92vw,calc(560px * var(--hs)))}
}
@media (prefers-reduced-motion:reduce){
  .snl-handoff,.snl-handoff__in{transition-duration:80ms}
  .snl-handoff__in{transform:none}
}
`;

function handoffNode() {
  if (handoffEl && handoffEl.isConnected) return handoffEl;
  injectCss('handoff', HANDOFF_CSS);
  handoffEl = document.createElement('div');
  handoffEl.className = 'snl-handoff';
  handoffEl.setAttribute('role', 'button');
  handoffEl.setAttribute('tabindex', '0');
  handoffEl.hidden = true;
  handoffEl.innerHTML =
    `<div class="snl-handoff__in">
       <div class="snl-handoff__tok" aria-hidden="true"></div>
       <div class="snl-handoff__name"></div>
       <div class="snl-handoff__sq"></div>
       <div class="snl-handoff__tap"></div>
     </div>`;
  const fire = () => handoffGate && handoffGate.fire('tap');
  handoffEl.addEventListener('pointerup', fire);
  handoffEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
  });
  overlay().appendChild(handoffEl);
  return handoffEl;
}

/**
 * Does this turn get a handoff card? The card is about the device changing
 * hands, so it fires only when hands actually change:
 *   - never for Mithu, never in solo, never with one human (§10.8);
 *   - never when the incoming player is already holding it — a six bought the
 *     same person another roll (§10.4), or the game just began in her hands;
 *   - never straight after a lesson card whose own button WAS the pass (§5.3).
 */
function needsHandoff(p) {
  if (!p || p.isBot) return false;
  if (G.options.solo) return false;
  if (!G.state || G.state.players.filter(x => !x.isBot).length < 2) return false;
  if (p.id === deviceHolder) return false;
  if (cardHandedOff) return false;
  return true;
}

/* Some rosters pre-fill seat one with a second-person pronoun (setup.js's
   'You' / 'आप'), and "Pass to You" on a full screen, shown to the person
   already holding the phone, is the most embarrassing string in the product. */
const SELF_NAME = /^(you|u|me|aap|आप|तुम|मैं)$/i;
function handoffTitle(name) {
  const nm = String(name || '').trim();
  if (!nm || SELF_NAME.test(nm)) {
    return t('turn.yourShort', null, getLang() === 'hi' ? 'आपकी बारी' : 'Your turn');
  }
  return t('turn.handoff', { name: nm });
}

/** "Priya 42 · Amma 30 · You 12" — REF-LUDOKING: a turn screen must answer
 *  who is winning. Leader first, because that is the question being asked. */
function standingsLine() {
  if (!G.state) return '';
  return G.state.players
    .map(x => ({ name: String(x.name || '').trim(), pos: x.pos || 0 }))
    .sort((a, b) => b.pos - a.pos)
    /* a non-breaking space inside each pair, so a wrap can only ever fall
       BETWEEN players and never orphan a square number on its own line */
    .map(x => x.name + '\u00a0' + x.pos)
    .join('  ·  ');
}

/* config.js:685 asks for a token silhouette here and the HUD already draws one
   two centimetres above. Clone the live plaque's SVG so the card shows the same
   piece the standings strip does; the emoji is only the last resort. */
function paintHandoffToken(el, player, spec) {
  const tok = el.querySelector('.snl-handoff__tok');
  if (!tok) return;
  let sil = null;
  try {
    const idx = G.state ? G.state.players.findIndex(x => x.id === player.id) : -1;
    const pl = idx >= 0 ? document.querySelectorAll('.snl-ui__plaques .snl-ui__pl')[idx] : null;
    const src = pl && pl.querySelector('.snl-ui__sil');
    if (src && src.innerHTML.trim()) {
      sil = src.cloneNode(true);
      sil.setAttribute('class', 'snl-handoff__sil');
      sil.setAttribute('aria-hidden', 'true');
    }
  } catch (e) { noteError(e); }
  tok.textContent = '';
  if (sil) tok.appendChild(sil);
  else tok.textContent = spec.emoji || '●';
}

const cssHex = (v) => (typeof v === 'number'
  ? '#' + (v >>> 0).toString(16).padStart(6, '0')
  : (v || ''));

/* ── Contrast, computed. WCAG 2.1 relative luminance: linearise each sRGB
   channel FIRST, then weight. Weighting the gamma-encoded bytes is the classic
   wrong answer and it flatters mid saffrons by about a stop. ── */
const _lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relLum = (p) => 0.2126 * _lin(p[0]) + 0.7152 * _lin(p[1]) + 0.0722 * _lin(p[2]);
function contrastRatio(a, b) {
  const l1 = relLum(a), l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function rgbOf(css, fallback) {
  let h = String(css == null ? '' : css).trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-f]{6}$/i.test(h)) return fallback;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixRgb = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const hexOf = (p) => '#' + p.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

const INK_WHITE = [255, 255, 255];
const INK_DEEP  = [17, 29, 42];    // navy taken deeper than --navy, which fails on saffron at 4.34:1
const INK_MIN   = 4.5;             // the spec
const INK_TARGET = 5.0;            // what we actually aim for, so AA survives a re-render
const INK_SOFT_MIN = 4.7;          // the standings and TAP are still body text

/**
 * The card is a full screen of ONE flat player colour, so legibility depends
 * entirely on whose turn it is. Returns the background to paint and the two
 * inks to paint on it, every value measured, never eyeballed.
 *   - white if white clears the target (indigo, plum, forest keep the v2 look);
 *   - otherwise a deep navy ink (saffron, brass) — dark ink on a light colour;
 *   - if a colour is so mid that NEITHER ink can clear 4.5:1, the card's own
 *     background is darkened along its hue until white does. The board keeps
 *     the player's true colour; only this card shifts.
 */
function handoffInk(css) {
  const base = rgbOf(css, [42, 157, 143]);   // teal, the same fallback the card already used
  let bg = base, ink = null;
  if (contrastRatio(INK_WHITE, bg) >= INK_TARGET) ink = INK_WHITE;
  else if (contrastRatio(INK_DEEP, bg) >= INK_TARGET) ink = INK_DEEP;
  else {
    /* nothing lands on this hue: walk the card's background toward black,
       2% a step, until white is legible on it. Terminates by construction —
       white on black is 21:1. */
    for (let t = 0.02; t <= 1.0001; t += 0.02) {
      bg = mixRgb(base, [0, 0, 0], t);
      if (contrastRatio(INK_WHITE, bg) >= INK_TARGET) break;
    }
    ink = INK_WHITE;
  }
  /* secondary text is tinted toward the card, not faded with opacity, and only
     as far as 4.7:1 still allows — often that is barely at all, which is the
     honest answer: hierarchy then comes from size and weight. */
  let soft = ink;
  for (let t = 0.22; t > 0.001; t -= 0.02) {
    const c = mixRgb(ink, bg, t);
    if (contrastRatio(c, bg) >= INK_SOFT_MIN) { soft = c; break; }
  }
  const lightInk = ink === INK_WHITE;
  return {
    bg: hexOf(bg), ink: hexOf(ink), soft: hexOf(soft),
    /* the name's soft shadow has to flip with the ink or it eats its own edges */
    halo: lightInk ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.20)',
    ratio: contrastRatio(ink, bg), ratioSoft: contrastRatio(soft, bg),
  };
}

async function handoffFor(player) {
  const show = needsHandoff(player);
  /* consumed either way: one card's pass covers exactly one change of hands */
  cardHandedOff = false;
  if (player && !player.isBot) deviceHolder = player.id;
  if (!show) return;

  const spec = specFor(player);
  const el = handoffNode();
  el.hidden = false;
  const paint = handoffInk(spec.css || '#2a9d8f');
  el.style.setProperty('--pc', paint.bg);
  el.style.setProperty('--pc-d', cssHex(spec.colorD) || paint.bg);
  el.style.setProperty('--ink', paint.ink);
  el.style.setProperty('--ink-soft', paint.soft);
  el.style.setProperty('--ink-halo', paint.halo);
  paintHandoffToken(el, player, spec);
  const title = handoffTitle(player.name);
  const standings = standingsLine();
  el.querySelector('.snl-handoff__name').textContent = title;
  el.querySelector('.snl-handoff__sq').textContent = standings;
  el.querySelector('.snl-handoff__tap').textContent = t('turn.handoffTap');
  el.setAttribute('aria-label', standings ? title + '. ' + standings : title);

  G.handoffsShown++;
  await inBusy(async () => {
    guard(() => camera.overview(D('cameraEase')));
    await raf();
    el.classList.remove('is-out');
    el.classList.add('is-in');
    guard(() => audio.sfx.whoosh());
    try { el.focus({ preventScroll: true }); } catch { /* fine */ }
    await wait(D('handoffIn'));
  });

  const g = makeGate();
  handoffGate = g;
  G.screen = 'handoff';
  await g.p;
  handoffGate = null;
  G.screen = 'playing';

  await inBusy(async () => {
    el.classList.remove('is-in');
    el.classList.add('is-out');
    await wait(D('handoffOut'));
    el.hidden = true;
    el.classList.remove('is-out');
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. BOOT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build the world once. Everything after this is a game, not a boot.
 * @param {object} [opts] { skipSetup, players, options, seed }
 */
export async function startGame(opts = {}) {
  if (G.booted) return G;
  const canvas = document.getElementById('snl-canvas');
  if (!canvas) throw new Error('game: #snl-canvas missing');

  G.three = scene.initScene(canvas);
  window.__snlProgress?.(0.35);

  board.buildBoard(G.three.scene);
  sl.buildSnakesAndLadders(G.three.scene);
  fx.initFx(G.three.scene, G.three.camera);
  camera.initCamera(G.three.camera, { canvas });
  /* board3d owns the geometry; the camera must frame the SAME squares (§4 ghat
     road rise + zone steps), so hand it the authoritative resolver. */
  camera.setCellResolver((n) => board.cellToWorld(n));
  camera.setTokenProvider((id) => (tokens.tokenCell(id) == null ? null : tokens.tokenPosition(id)));
  /* after the camera, so the die can size itself against the real framing */
  dice.buildDice(G.three.scene, G.three.camera);
  window.__snlProgress?.(0.7);

  /* one clock for everybody: scene.js renders after these run */
  scene.onFrame((dt) => { guard(() => camera.update(dt)); });
  scene.onFrame((dt) => { guard(() => board.updateBoard(dt)); });

  dice.onDiceClick(() => onRollRequested('dice'));
  lesson.initLesson();
  onLangChange(() => guard(() => syncUI()));
  window.addEventListener('resize', () => guard(() => refitSafeFrame()), { passive: true });
  window.addEventListener('orientationchange', () => guard(() => refitSafeFrame()), { passive: true });

  G.booted = true;
  await scene.screenshotReady();
  window.__snlProgress?.(1);
  window.__snlLoaded?.();
  readyResolve(true);

  if (opts.skipSetup) {
    await beginGame(opts.players || defaultRoster(2), opts.options || {}, getLang());
  } else {
    runSetupFlow().catch(noteError);
  }
  return G;
}

async function runSetupFlow() {
  G.screen = 'setup';
  const choice = await setup.showSetup(overlay());
  if (!choice) return;
  if (choice.lang) guard(() => setLang(choice.lang));
  await beginGame(choice.players, choice.options || {}, choice.lang || getLang());
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. A GAME
   ═══════════════════════════════════════════════════════════════════════════ */

/* The same warm defaults setup.js offers a real player, so a quickStart screenshot
   shows the real game rather than debug placeholders — and shows it in the
   language the player is actually in. These names are read from setup.js at call
   time, never captured at module load, because the language can change before a
   game starts and every one of these strings is translated. */
function defaultRoster(n) {
  const count = clamp(Math.round(Number(n) || 2), 1, 4);
  const names = setup.defaultNames();
  const list = [];
  const specs = CFG.tokens.players;
  if (count === 1) {
    const s = specs[0];
    list.push({ id: 'p1', name: names[0], token: s.key, isBot: false, css: s.css, emoji: s.emoji });
    const b = CFG.tokens.bot;
    list.push({ id: b.id, name: t('setup.mithuName'), token: b.key, isBot: true, css: b.css, emoji: b.emoji });
    return list;
  }
  for (let i = 0; i < count; i++) {
    const s = specs[i];
    list.push({ id: 'p' + (i + 1), name: names[i] || t('setup.playerName', { n: i + 1 }), token: s.key, isBot: false,
                css: s.css, emoji: s.emoji });
  }
  return list;
}

function specFor(player) {
  const seat = G.roster.find(r => r.id === player.id);
  if (seat && seat.css) return seat;
  const list = CFG.tokens.players;
  if (player.isBot) return CFG.tokens.bot;
  return list.find(s => s.key === player.token || s.id === player.id) || list[0];
}

async function beginGame(roster, options, lang) {
  stopLoop();
  guard(() => lesson.dismiss('replaced'));
  guard(() => lesson.resetSession());
  guard(() => fx.clearFx());
  if (handoffEl) { handoffEl.hidden = true; handoffEl.classList.remove('is-in', 'is-out'); }

  G.roster = roster.map((p, i) => ({ ...p, seat: i }));
  G.options = { ...options };
  if (lang) guard(() => setLang(lang));

  const seed = Number.isFinite(+options.seed) ? (+options.seed >>> 0) : GAME.seed;
  G.state = RULES.newGame({
    players: G.roster.map(p => ({ id: p.id, name: p.name, token: p.token, isBot: !!p.isBot })),
    board: CONTENT.BOARD,
    seed,
    options: {
      exactFinish: !!options.exactFinish,
      mercyAfter: options.mercyAfter ?? CFG.rules.mercyAfter,
      sixExtraTurn: options.sixExtraTurn ?? CFG.rules.sixExtraTurn,
      maxConsecutiveSixes: options.maxConsecutiveSixes ?? CFG.rules.maxConsecutiveSixes,
      jhatka: options.jhatka ?? CFG.rules.jhatka,
      shield: options.shield ?? CFG.rules.shield,
    },
  });
  G.turnId = 0;
  G.ribbonsShown = 0; G.cardsShown = 0; G.handoffsShown = 0;
  /* Whoever chose the number of players is holding the phone, and seat one is
     hers (§11 pre-fills seat one as the person at the device). So the game
     opens on the board, not on a card asking her to pass it to herself. */
  const first = G.state.players[G.state.turn];
  deviceHolder = first && !first.isBot ? first.id : null;
  cardHandedOff = false;
  pendingLessonPasses = false;

  guard(() => lesson.setLessonMode({
    workshop: !!options.workshop,
    solo: !!options.solo,
    autoAdvance: options.cardAutoAdvance !== false,
  }));
  guard(() => fx.setFxSeed(seed));
  guard(() => audio.setMuted(!!options.muted));
  if (options.cameraLocked) guard(() => camera.setLocked(true));

  tokens.buildTokens(G.three.scene, G.state.players.map(p => {
    const s = specFor(p);
    return { id: p.id, name: p.name, token: p.token || s.key, isBot: p.isBot };
  }));
  for (const p of G.state.players) guard(() => tokens.placeAt(p.id, p.pos));

  ui.mountUI(document.getElementById('snl-hud'), {
    onRoll: () => onRollRequested('button'),
    onRestart: () => { guard(() => newRound()); },
    onHelp: () => { /* the how-to lives on the setup screen; nothing modal mid-game */ },
    onLangToggle: (to) => { guard(() => setLang(to)); guard(() => syncUI()); },
    muted: audio.isMuted(),
  });
  syncUI();
  await raf();
  guard(() => watchTray());
  guard(() => refitSafeFrame());
  guard(() => camera.overview(0));

  G.screen = 'playing';
  startLoop();
}

function newRound() {
  const roster = G.roster.slice();
  const options = { ...G.options, seed: (Date.now() ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0 };
  visited.clear();
  guard(() => board.riseFinish(false, 0));
  beginGame(roster, options, getLang()).catch(noteError);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. THE TURN LOOP
   ═══════════════════════════════════════════════════════════════════════════ */

function startLoop() {
  G.running = true;
  const mine = ++G.loopId;
  (async () => {
    try {
      while (G.running && mine === G.loopId && G.state && !G.state.over) {
        const p = RULES.currentPlayer(G.state);
        await handoffFor(p);
        if (!G.running || mine !== G.loopId || G.state.over) break;
        const value = await awaitRoll(p);
        if (!G.running || mine !== G.loopId) break;
        if (value == null) continue;
        await resolveTurn(value);
      }
      if (G.running && mine === G.loopId && G.state && G.state.over) await finishGame();
    } catch (e) { noteError(e); }
  })();
}

function stopLoop() {
  G.running = false;
  G.loopId++;
  clearTimeout(botTimer); clearTimeout(turnTimer);
  if (rollGate) { rollGate.fire(null); rollGate = null; }
  if (handoffGate) { handoffGate.fire(null); handoffGate = null; }
  forcedValue = null; pendingLesson = null; lessonHandle = null;
  deviceHolder = null; cardHandedOff = false; pendingLessonPasses = false;
  busy = 0;
}

/** A tap on the die, the ROLL plaque, or the keyboard. */
function onRollRequested() {
  guard(() => audio.initAudio());
  if (handoffGate) { handoffGate.fire('tap'); return; }
  if (rollGate) rollGate.fire(null);
}

/**
 * Wait for this player to produce a die value.
 * Mithu is a policy HERE, never in rules.js: she waits 900 ms, chirps, and
 * rolls the same seeded d6 as everyone else.
 */
async function awaitRoll(player) {
  if (forcedValue != null) { const v = forcedValue; forcedValue = null; return v; }

  const g = makeGate();
  rollGate = g;
  guard(() => board.highlightCell(player.pos || 0, player.pos ? 'active' : 'none'));
  guard(() => tokens.setActive(player.id));
  guard(() => dice.setDiceEnabled(!player.isBot));
  guard(() => ui.setRollEnabled(!player.isBot));
  guard(() => ui.setTurn(hudPlayer(player), player.isBot ? t('turn.mithuThinking') : t('turn.rollHint')));

  clearTimeout(botTimer); clearTimeout(turnTimer);
  if (player.isBot) {
    guard(() => audio.sfx.click());
    botTimer = setTimeout(() => g.fire(null), D('botThink'));
  } else if (G.options.turnTimer && GAME.autoRollOnTimeout && !G.options.workshop) {
    turnTimer = setTimeout(() => g.fire(null), timing.turnTimer);
  }

  const forced = await g.p;
  clearTimeout(botTimer); clearTimeout(turnTimer);
  rollGate = null;
  guard(() => dice.setDiceEnabled(false));
  guard(() => ui.setRollEnabled(false));
  if (!G.running || !G.state || G.state.over) return null;

  if (typeof forced === 'number') return clamp(Math.round(forced), 1, 6);
  if (forcedValue != null) { const v = forcedValue; forcedValue = null; return v; }
  return RULES.roll(G.state);
}

async function resolveTurn(value) {
  const player = RULES.currentPlayer(G.state);
  G.turnId++;

  await inBusy(async () => {
    guard(() => ui.setDiceFace(value));
    guard(() => audio.sfx.dice(D('diceTumble')));
    await dice.rollDice(value).catch(noteError);
    if (value === 6) guard(() => audio.sfx.six());

    const events = RULES.applyRoll(G.state, value);
    await playEvents(events, player, value);
  });

  if (pendingLesson) {
    const p = pendingLesson;
    const passes = pendingLessonPasses;
    pendingLesson = null; lessonHandle = null; pendingLessonPasses = false;
    G.screen = 'lesson';
    /* lesson.js resolves with 'button' only when the full-width plaque was
       actually pressed. That plaque read "PRIYA KO DO ▸" — the pass has
       happened, so the full-bleed sheet that used to follow it was a duplicate
       costing a tap and hiding the board a second time (§5.3). */
    const why = await p.catch(noteError);
    if (passes && why === 'button') cardHandedOff = true;
    G.screen = G.state.over ? 'endgame' : 'playing';
  }
  guard(() => ui.setHint(''));      // back to the auto hint — never stale
  guard(() => syncUI());
  guard(() => persist());
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. PLAYING THE EVENT LIST
   ═══════════════════════════════════════════════════════════════════════════ */

async function playEvents(events, player, value) {
  const id = player.id;
  lessonHandle = null;
  /* What this turn teaches. Decided up front so the ribbon can start rising
     before the token lands (§3.1) and so we never show two cards (§3.2). */
  const plan = planTeaching(events, player);
  let ribbonFired = false;

  for (const ev of events) {
    if (!G.running) return;
    switch (ev.type) {

      case 'roll':
        guard(() => ui.log(player.isBot
          ? t('turn.mithuRolled', { value })
          : t('turn.rolled', { name: player.name, value })));
        break;

      case 'blocked':
        guard(() => ui.toast(t('finish.blocked', { value, need: ev.need })));
        guard(() => board.pulseCell(RULES.LAST));
        await wait(D('lessonIn'));
        break;

      case 'mercy':
        guard(() => ui.toast(t('finish.mercy')));
        break;

      case 'move': {
        const path = ev.path || [];
        const travel = Math.max(1, path.length) * D('hopPerCell');
        guard(() => board.highlightCell(ev.to, 'target'));
        guard(() => camera.focusCell(ev.to, D('cameraFollow')));
        /* §3.1 the teaching gap — the ribbon rises at travel x 0.6 so it is
           readable a quarter of a second BEFORE the token stops. */
        if (plan && plan.duringHop) {
          const at = Math.round(travel * timing.lessonAt);
          setTimeout(() => {
            if (!G.running) return;
            ribbonFired = true;
            fireTeaching(plan);
          }, at);
        }
        guard(() => audio.resetHopRun(path.length));
        await tokens.hopAlong(id, path, {
          onHop: (cell, i, total) => guard(() => audio.sfx.hopStep(i, total)),
        }).catch(noteError);
        guard(() => board.highlightCell(ev.to, 'none'));
        guard(() => audio.sfx.land());
        guard(() => fx.dust(cell3(ev.to)));
        break;
      }

      case 'ladder': {
        guard(() => audio.sfx.ladder(D('ladderClimb')));
        guard(() => camera.dramatic(ev.from, ev.to, D('ladderClimb')));
        const curve = guard(() => sl.ladderPath(ev.ladder));
        await Promise.all([
          guard(() => sl.animateLadder(ev.ladder)) || Promise.resolve(),
          curve ? tokens.climbAlong(id, curve, D('ladderClimb')).catch(noteError)
                : Promise.resolve(guard(() => tokens.placeAt(id, ev.to))),
        ]);
        guard(() => tokens.placeAt(id, ev.to));
        guard(() => fx.sparkle(cell3(ev.to)));
        guard(() => ui.log(t('ladder.line', { name: player.name, from: ev.from, to: ev.to })));
        break;
      }

      case 'snake': {
        await wait(D('snakeFreeze'));
        guard(() => audio.sfx.snake(D('snakeSlide')));
        guard(() => camera.dramatic(ev.from, ev.to, D('snakeSlide')));
        guard(() => camera.shake(CFG.fx.shake.snake[0], CFG.fx.shake.snake[1]));
        const curve = guard(() => sl.snakePath(ev.snake));
        await Promise.all([
          guard(() => sl.animateSnake(ev.snake, cell3(ev.from))) || Promise.resolve(),
          curve ? tokens.slideAlong(id, curve, D('snakeSlide')).catch(noteError)
                : Promise.resolve(guard(() => tokens.placeAt(id, ev.to))),
        ]);
        guard(() => tokens.placeAt(id, ev.to));
        guard(() => ui.log(t('snake.line', { name: player.name, from: ev.from, to: ev.to })));
        break;
      }

      case 'shield': {
        guard(() => audio.sfx.shield());
        guard(() => tokens.flashShield(id));
        guard(() => tokens.setShield(id, false));
        guard(() => fx.shieldBurst(cell3(ev.at)));
        if (ev.against === 'snake' && ev.snake) {
          await (guard(() => sl.animateSnake(ev.snake, cell3(ev.at))) || Promise.resolve());
        }
        guard(() => ui.log(t('shield.absorbed')));
        guard(() => ui.toast(t('shield.absorbed')));
        await wait(D('snakeRecoil'));
        break;
      }

      case 'shieldGranted': {
        const who = RULES.playerById(G.state, ev.playerId);
        guard(() => tokens.setShield(ev.playerId, true));
        guard(() => audio.sfx.milestone());
        guard(() => fx.glowRing(cell3(Math.max(1, who?.pos || 1)), CFG.colors.brass));
        const line = ev.reason === 'ladder'
          ? t('shield.grantedLadder', { name: who?.name || '' })
          : t('shield.granted', { name: who?.name || '' });
        guard(() => ui.log(line));
        guard(() => ui.toast(line, timing.shieldGrantRibbon));
        guard(() => syncPlayers());
        break;
      }

      case 'event': {
        guard(() => audio.sfx.event());
        const back = [];
        for (let c = ev.from - 1; c >= ev.to; c--) back.push(c);
        guard(() => camera.focusCell(ev.to, D('cameraFollow')));
        await tokens.hopAlong(id, back, {
          onHop: (c, i, n) => guard(() => audio.sfx.hopStep(i, n)),
        }).catch(noteError);
        guard(() => tokens.placeAt(id, ev.to));
        guard(() => ui.log(t('event.line', { name: player.name })));
        break;
      }

      case 'land':
        guard(() => board.pulseCell(ev.cell));
        guard(() => board.highlightCell(ev.cell, 'active'));
        /* the strip must be true the moment the token stops, not after the card */
        guard(() => syncPlayers());
        if (plan && !ribbonFired) { ribbonFired = true; fireTeaching(plan); }
        break;

      case 'extraTurn':
        guard(() => ui.toast(value === 6 ? t('turn.six') : t('turn.extraTurn')));
        break;

      case 'turn':
        if (ev.reason === 'thirdSix') guard(() => ui.toast(t('turn.thirdSix')));
        break;

      case 'win':
        await celebrate(player);
        break;

      default: break;
    }
  }

  /* the camera always comes home well inside cameraLegibleBy (§6.2) */
  guard(() => camera.overview(D('cameraEase')));

  /* Every motion for this turn is finished, so this IS the landing frame: the
     ribbon's left edge pulses, the dice re-arms, and a card starts to grow. */
  if (lessonHandle) guard(() => lessonHandle.land());

  if (plan && ribbonFired && pendingLesson) {
    /* Let the teaching moment finish arriving before the turn is called idle.
       For a card that means the whole §5.3 stagger — the point of the card is
       the order it assembles in, and the primary button is the last beat. */
    await raf();
    const st = timing.cardStagger;
    /* Counted, because a probe that reads lessonText() cannot tell a §5.2 ribbon
       (all 100 squares, no tap, no button) from a §5.3 card (38 squares) and has
       reported the game as one long lecture on that confusion. */
    const isCard = guardBool(() => lesson.isCardOpen());
    if (isCard) G.cardsShown++;
    const full = isCard
      ? D('ribbonPulse') + st[st.length - 1] + 220
      : D('ribbonPulse') + 60;
    await wait(full);
  }
}

async function celebrate(player) {
  guard(() => audio.sfx.win());
  guard(() => board.riseFinish(true));
  guard(() => fx.confetti(cell3(RULES.LAST), CFG.fx.confetti.count));
  guard(() => camera.finishShot(D('cameraEase')));
  guard(() => ui.log(t('finish.reached', { name: player.name })));
  guard(() => ui.setTurn(hudPlayer(player), t('finish.lakshya')));
  await wait(D('celebrate'));
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. RIBBON vs CARD — §5. Ribbon on all 100 squares. Card on the 38.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Per player, per game: the fourth landing on 38 reads once (§3.2). */
const visited = new Map();
const seenKey = (pid) => {
  let s = visited.get(pid);
  if (!s) { s = new Set(); visited.set(pid, s); }
  return s;
};

function planTeaching(events, player) {
  if (events.some(e => e.type === 'win')) return null;   // the endgame is the lesson for 100

  const last = [...events].reverse().find(e => e.type === 'land');
  if (!last) return null;
  const cell = last.cell;
  if (!cell || cell < 1) return null;

  const ladderEv = events.find(e => e.type === 'ladder');
  const snakeEv = events.find(e => e.type === 'snake');
  const eventEv = events.find(e => e.type === 'event');
  const shieldEv = events.find(e => e.type === 'shield');

  const sq = CONTENT.squareAt(cell) || { n: cell, kind: 'plain', title: t('hud.square', { n: cell }), lesson: '' };
  const seen = seenKey(player.id);
  const repeat = seen.has(cell);
  seen.add(cell);

  let p;
  if (ladderEv) {
    const L = ladderEv.ladder;
    p = {
      kind: 'ladder', square: cell, cardKey: 'L' + L.from,
      title: L.name, line: L.why, what: L.why,
      number: L.amount, numberLabel: L.amountNote,
      name: L.term, action: L.how, heritage: L.heritage,
      deep: L.deep, term: L.term,
      duringHop: true,
    };
  } else if (snakeEv) {
    const S = snakeEv.snake;
    p = {
      kind: 'snake', square: cell, cardKey: 'S' + S.from,
      title: S.name, line: S.why, what: S.why,
      number: S.cost, numberLabel: S.costNote,
      name: S.term, action: S.escape, counterparty: S.counterparty,
      deep: S.deep, term: S.term,
      duringHop: false,
    };
  } else if (shieldEv) {
    p = {
      kind: 'event', square: cell, cardKey: 'shield' + cell,
      title: t('shield.name'), line: t('shield.absorbed'),
      action: t('shield.explain'), ribbonOnly: true, duringHop: false,
    };
  } else if (eventEv) {
    const e = sq.event || {};
    p = {
      kind: 'event', square: cell, cardKey: 'E' + eventEv.cell,
      title: e.name || sq.title, line: e.line || sq.lesson, what: e.line || sq.lesson,
      action: e.setback || t('event.cost'), deep: sq.deep, term: sq.term,
      duringHop: false,
    };
  } else if (sq.kind === 'quiz' && sq.quiz) {
    p = {
      kind: 'quiz', square: cell, cardKey: 'Q' + cell,
      title: sq.title, line: sq.lesson,
      question: sq.quiz.question, chips: sq.quiz.chips, reveal: sq.quiz.reveal,
      deep: sq.deep, term: sq.term, quiz: true, duringHop: true,
    };
  } else if (sq.kind === 'milestone') {
    p = {
      kind: 'milestone', square: cell, cardKey: 'M' + cell,
      title: sq.title, line: sq.lesson, what: sq.lesson,
      bullets: sq.bullets, action: sq.action, deep: sq.deep, term: sq.term,
      duringHop: true,
    };
  } else if (sq.kind === 'lesson') {
    p = {
      kind: 'lesson', square: cell, cardKey: 'C' + cell,
      title: sq.title, line: sq.lesson, what: sq.lesson,
      action: sq.action, deep: sq.deep, term: sq.term, heritage: sq.heritage,
      duringHop: true,
    };
  } else {
    p = {
      kind: 'plain', square: cell, cardKey: 'P' + cell,
      title: sq.title, line: sq.lesson, ribbonOnly: true, duringHop: true,
    };
  }

  /* §3.2 — the fourth landing on 38 reads once. §10.8 — Mithu shows her ribbons
     and never opens a card: her cards would be reading nobody earned, and they
     would double the length of a solo game. */
  if (repeat || player.isBot) { p.repeat = true; p.ribbonOnly = true; }
  p.playerId = player.id;
  p.turnId = G.turnId;
  p.workshop = !!G.options.workshop;
  p.handoffLabel = handoffLabel(player);
  p.card = p.ribbonOnly ? false : undefined;
  return p;
}

/** In pass-and-play the card IS the pass-the-phone button (§5.3).
 *  rules.js has already advanced 'state.turn' by the time the card is built, so
 *  players[turn] IS the next player — and when a six bought another roll it is
 *  the same player again, in which case nobody is passing anything. */
function handoffLabel(current) {
  if (!G.state) return null;
  const next = G.state.players[G.state.turn];
  if (!next || next.isBot || G.options.solo) return null;
  if (current && next.id === current.id) return null;
  if (G.state.players.filter(p => !p.isBot).length < 2) return null;
  const nm = String(next.name || '').trim();
  /* "PASS TO YOU ▸" is nonsense on the button too */
  if (!nm || SELF_NAME.test(nm)) {
    return t('turn.yourShort', null, getLang() === 'hi' ? 'आपकी बारी' : 'Your turn');
  }
  return t('lesson.handoffNext', { name: nm });
}

function fireTeaching(plan) {
  try {
    guard(() => audio.duckFor(timing.lessonDuck));
    /* only a card that really carries a pass label can stand in for the
       handoff — a ribbon has no button and passes nothing */
    pendingLessonPasses = !!plan.handoffLabel && !plan.ribbonOnly;
    G.ribbonsShown++;
    if (plan.quiz) {
      lessonHandle = null;
      pendingLesson = lesson.showQuiz({ ...plan, landIn: 0 });
      return;
    }
    /* game.js calls .land() on the exact frame the last motion ends, so the
       ribbon is never early and never late; the timeout is only a safety net. */
    const promise = lesson.showLesson({
      ...plan,
      landIn: 8000,
      onLanded: () => {
        /* §5.2 — the ribbon never costs a tap, so the hint stays an instruction.
           The card decides one tick later whether it is growing. */
        guard(() => ui.setHint(t('turn.rollHint')));
        setTimeout(() => guard(() => ui.setHint(
          guardBool(() => lesson.isCardOpen()) ? t('lesson.dismiss') : t('turn.rollHint'))), 0);
      },
    });
    guard(() => audio.sfx.lesson());
    pendingLesson = promise;
    lessonHandle = promise;
  } catch (e) { noteError(e); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. ENDGAME
   ═══════════════════════════════════════════════════════════════════════════ */

async function finishGame() {
  G.screen = 'endgame';
  guard(() => dice.setDiceEnabled(false));
  guard(() => ui.setRollEnabled(false));
  guard(() => persist(true));
  let choice = 'home';
  try {
    choice = await endgame.showEndgame(overlay(), RULES.summarise(G.state),
      { workshop: !!G.options.workshop });
  } catch (e) { noteError(e); }
  if (choice === 'again') newRound();
  else {
    guard(() => ui.unmountUI());
    guard(() => board.riseFinish(false));
    runSetupFlow().catch(noteError);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. HUD + PERSISTENCE
   ═══════════════════════════════════════════════════════════════════════════ */

function hudPlayer(p) {
  const s = specFor(p);
  return { id: p.id, name: p.name, pos: p.pos, shield: p.shield, finished: p.finished,
           isBot: p.isBot, token: p.token || s.key, css: s.css, color: s.css, colorD: s.colorD };
}

/** Just the standings strip — never touches the banner mid-lesson. */
function syncPlayers() {
  if (!G.state || !ui.isMounted()) return;
  ui.setPlayers(G.state.players.map(hudPlayer));
}

function syncUI() {
  if (!G.state || !ui.isMounted()) return;
  ui.setPlayers(G.state.players.map(hudPlayer));
  const cur = RULES.currentPlayer(G.state);
  if (cur && !G.state.over) ui.setTurn(hudPlayer(cur));
  for (const p of G.state.players) guard(() => tokens.setShield(p.id, !!p.shield));
}

function persist(clear = false) {
  try {
    if (clear) { localStorage.removeItem(GAME.storageKey); return; }
    localStorage.setItem(GAME.storageKey, JSON.stringify({
      v: 1, at: Date.now(), roster: G.roster, options: G.options,
      snapshot: RULES.snapshot(G.state),
    }));
  } catch { /* private mode — a saved game is a nicety, never a requirement */ }
}

/**
 * Tell the camera the REAL gap between the HUD strip and the dice tray. The
 * layout is not symmetric about the screen centre, and camera.js cannot know
 * how tall ui.js's tray came out on this viewport — so we measure and hand it
 * over. §6.2's "the whole board is legible" is only true if this is right.
 */
function refitSafeFrame() {
  const h = window.innerHeight || document.documentElement.clientHeight || 844;
  const w = window.innerWidth || 390;
  const cs = getComputedStyle(document.documentElement);
  const trayH = parseFloat(cs.getPropertyValue('--snl-tray-h')) || h * CFG.layout.diceTrayPct;
  const top = document.querySelector('.snl-ui__top');
  const topPx = (top ? top.getBoundingClientRect().bottom : h * CFG.layout.standingsPct) + 10;
  /* Below the board, in order upward from the bottom edge: the dice tray, the
     ribbon, then the 3D die itself. §5.2 — "the dice is never covered and never
     unreachable" — so the die's own drawn height is part of the reservation. */
  const botPx = h - (trayH + CFG.layout.ribbonH + (CFG.layout.diceDrawn || 64) * 0.72 + 10);
  if (!(botPx > topPx + 80)) return;
  const nyTop = 1 - (2 * topPx) / h;
  const nyBot = 1 - (2 * botPx) / h;
  /* §7.5 asks for 92% of the width. On a phone the width is the ONLY thing that
     limits how big the board can be, so it gets the extra few per cent. */
  camera.setSafeFrame(w > 900 ? 0.86 : (w < h ? 0.96 : 0.90),
                      (nyTop - nyBot) / 2, (nyTop + nyBot) / 2);
  camera.resize();
  guard(() => dice.refitDice());
}

/* The dice tray is not a fixed height: ui.js opens the log to five lines on a
   wide screen, and the confirm bar can appear. Watch it, because a tray that
   grew after boot would otherwise sit on top of squares 1-10 forever. */
let trayRO = null, lastTrayH = 0, refitQueued = false;
function watchTray() {
  const el = document.querySelector('.snl-ui__bottom');
  if (!el || typeof ResizeObserver !== 'function') return;
  trayRO?.disconnect();
  lastTrayH = el.getBoundingClientRect().height;
  trayRO = new ResizeObserver(() => {
    const h = el.getBoundingClientRect().height;
    if (Math.abs(h - lastTrayH) < 8 || refitQueued) return;
    lastTrayH = h;
    refitQueued = true;
    requestAnimationFrame(() => { refitQueued = false; guard(() => refitSafeFrame()); });
  });
  trayRO.observe(el);
}

/* handy world position for fx/camera without importing THREE here */
function cell3(n) {
  try { return board.cellToWorld(clamp(Math.round(n) || 1, 1, 100)); }
  catch { return { x: 0, y: 0, z: 0 }; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. THE PROBE API — CONTRACT.md. It must always work.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Resolves when nothing is animating and no teaching moment is mid-entrance. */
function settle(timeoutMs = 20000) {
  const t0 = performance.now();
  return new Promise((resolve) => {
    let quiet = 0;
    const check = () => {
      const moving = busy > 0 ||
        guardBool(() => dice.isDiceRolling()) ||
        guardBool(() => tokens.tokensBusy());
      quiet = moving ? 0 : quiet + 1;
      if (quiet >= 2 || performance.now() - t0 > timeoutMs) return resolve();
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}
const guardBool = (fn) => { try { return !!fn(); } catch { return false; } };

async function quickStart(n = 2) {
  await readyPromise;
  guard(() => document.querySelectorAll('.snl-setup').forEach(el => el.remove()));
  guard(() => document.querySelectorAll('.snl-end').forEach(el => el.remove()));
  await beginGame(defaultRoster(n), {
    seed: GAME.seed, solo: Number(n) === 1, workshop: false,
    turnTimer: false, cardAutoAdvance: false, muted: true,
  }, getLang());
  await settle();
  await passHandoff();
  return true;
}

/** Take the phone: dismiss a standing handoff card so the board is live. */
async function passHandoff() {
  if (!handoffGate) return;
  handoffGate.fire('probe');
  await wait(0);
  await settle();
}

async function forceRoll(value) {
  await readyPromise;
  if (!G.state || G.state.over) return null;
  await settle();
  if (G.state.over) return null;
  const v = clamp(Math.round(Number(value) || 1), 1, 6);
  if (rollGate) rollGate.fire(v);
  else { forcedValue = v; if (handoffGate) handoffGate.fire('force'); }
  await wait(0);
  await settle();
  /* leave the game where a human would be looking: on the live board with the
     dice armed, not behind the next player's handoff card */
  await passHandoff();
  return v;
}

async function jumpTo(cell) {
  await readyPromise;
  if (!G.state) return null;
  await settle();
  const p = RULES.currentPlayer(G.state);
  const n = clamp(Math.round(Number(cell) || 0), 0, RULES.LAST);
  p.pos = n;
  if (n > p.best) p.best = n;
  guard(() => tokens.placeAt(p.id, n));
  guard(() => syncUI());
  await raf();
  return n;
}

function snapshotState() {
  if (!G.state) return { over: false, players: [], tier: scene.getTier?.() ?? null, screen: G.screen };
  const s = RULES.snapshot(G.state);
  s.tier = guard(() => scene.getTier()) || null;
  s.screen = screenName();
  s.turnId = G.turnId;
  /* the real teaching cadence, so nobody has to infer it from lessonText() */
  s.ribbonsShown = G.ribbonsShown;
  s.cardsShown = G.cardsShown;
  s.handoffsShown = G.handoffsShown;
  return s;
}

function screenName() {
  if (guardBool(() => endgame.isOpen())) return 'endgame';
  if (G.screen === 'endgame') return 'endgame';
  if (guardBool(() => lesson.isCardOpen())) return 'lesson';
  if (G.screen === 'setup' || document.querySelector('.snl-setup')) return 'setup';
  return 'playing';
}

export function getDebugApi() {
  return {
    ready: readyPromise,
    version: VERSION,
    state: snapshotState,
    screen: screenName,
    quickStart,
    forceRoll,
    jumpTo,
    dismissLesson: async () => {
      guard(() => lesson.dismiss('tap'));
      await wait(0); await settle(); await passHandoff();
    },
    lessonText: () => guard(() => lesson.lessonText()) ?? null,
    errors: G.errors,
    fps: () => guard(() => scene.getFps()) || 0,
    settle,
    /* extras the probe reads */
    content: () => ({ snakes: CONTENT.SNAKES, ladders: CONTENT.LADDERS }),
    renderInfo: () => guard(() => scene.renderInfo()) || {},
    ui: () => guard(() => ui.snapshotUI()) || {},
  };
}

export default { startGame, getDebugApi };
