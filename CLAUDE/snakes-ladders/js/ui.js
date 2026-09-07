/* ui.js — the HUD.

   Ludo King's HUD is chunky, obvious and almost wordless. This matches that
   shape and adds IFM's warmth: a plaque per player with BOTH colour and
   silhouette, a turn banner whose second line always says what to do next, one
   big thumb-reachable ROLL plaque, a log a room can read, and four settings
   chips.

   Owns: #snl-hud. Injects '.snl-ui' css only. Never touches index.html.

   Layout budget (DESIGN §7.5): top band ~13% of a 390x844 phone, bottom band
   ~13%. The middle — the board, its centre, and square 100 at top-left — is
   never covered by anything in this file.

   Type scales with 'clamp()' on 'vmin', so the same HUD reads on a 390px phone
   and on a 1920px projector without a media query per size. */

import { injectCss, esc, prefersReducedMotion, clamp } from './util.js';
import { timing, tokens as TOK, css as C } from './config.js';
import {
  t, tn, getLang, setLang, otherLang, langChipLabel, LANG_NAMES, onLangChange,
} from './i18n.js';

/* ═══════════════════════════════════════════════════════════════════════════
   1. ART — silhouettes and glyphs.
      Every token carries a SHAPE as well as a colour (§11): "red" and "orange"
      are the same thing on a cheap LCD in daylight and to one man in twelve.
   ═══════════════════════════════════════════════════════════════════════════ */

const SIL = {
  /* matka — the widest silhouette: wide belly, narrow neck, flat rim */
  matka: `<path d="M8.1 3.6h7.8a.9.9 0 0 1 0 1.9H8.1a.9.9 0 0 1 0-1.9z" fill="var(--sil-d)"/>
    <path d="M9.4 5.9c-3.6 1.5-5.3 4-5.3 7 0 4.5 3.5 7.6 7.9 7.6s7.9-3.1 7.9-7.6c0-3-1.7-5.5-5.3-7z" fill="var(--sil)"/>
    <path d="M6.2 9.6c-.7 1-1.1 2.1-1.1 3.3 0 3.6 2.6 6.1 5.6 6.6" fill="none" stroke="var(--sil-l)" stroke-width="1.3" stroke-linecap="round" opacity=".65"/>`,
  /* diya — lowest profile: shallow flared bowl, one flame */
  diya: `<path d="M12 2.4c1.9 2.3 2.8 3.6 2.8 4.9a2.8 2.8 0 1 1-5.6 0c0-1.3.9-2.6 2.8-4.9z" fill="var(--gold)"/>
    <path d="M12 5.1c.9 1.2 1.3 1.8 1.3 2.5a1.3 1.3 0 1 1-2.6 0c0-.7.4-1.3 1.3-2.5z" fill="var(--gold-lt)"/>
    <path d="M2.8 12.4h18.4c0 4-3.8 7-9.2 7s-9.2-3-9.2-7z" fill="var(--sil)"/>
    <path d="M2.8 12.4h18.4" stroke="var(--sil-d)" stroke-width="1.6" stroke-linecap="round"/>`,
  /* chaabi — tall and thin, toothed head */
  chaabi: `<circle cx="12" cy="6.2" r="3.7" fill="var(--sil)"/>
    <circle cx="12" cy="6.2" r="1.5" fill="var(--cream)"/>
    <path d="M10.9 9.4h2.2v11a1.1 1.1 0 0 1-2.2 0z" fill="var(--sil)"/>
    <path d="M13.1 13.6h3.4v1.9h-3.4zM13.1 17.1h2.6V19h-2.6z" fill="var(--sil-d)"/>`,
  /* ghanti — domed with a handle on top */
  ghanti: `<path d="M12 2.6a1.9 1.9 0 0 1 1.1 3.4h-2.2A1.9 1.9 0 0 1 12 2.6z" fill="var(--sil-d)"/>
    <path d="M12 5.6c-3.9 0-6 3-6.2 6.8-.1 2.5-.8 3.8-1.8 4.9h16c-1-1.1-1.7-2.4-1.8-4.9C17.9 8.6 15.9 5.6 12 5.6z" fill="var(--sil)"/>
    <path d="M8.9 8.6c-.9 1.2-1.3 2.7-1.4 4.2-.1 1.7-.4 2.8-.9 3.7" fill="none" stroke="var(--sil-l)" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
    <circle cx="12" cy="19.3" r="1.9" fill="var(--sil-d)"/>`,
  /* mithu — the brass parrot. Beak, eye, one tail feather. */
  mithu: `<path d="M13.4 3.9c3.4 0 5.7 2.6 5.7 6 0 2.4-1.2 4.3-3 5.4l1.9 4.9-4.5-3.3c-3.7.3-6.6-2.4-6.6-6 0-4 2.9-7 6.5-7z" fill="var(--sil)"/>
    <path d="M8.2 7.6 4 9.4l4.2 1.9z" fill="var(--gold)"/>
    <circle cx="11.4" cy="8.4" r="1.5" fill="var(--cream)"/>
    <circle cx="11.4" cy="8.4" r=".72" fill="var(--navy)"/>`,
};

/* the Bura Waqt Fund — a small brass lota. Open information, on every plaque. */
const LOTA = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <ellipse cx="12" cy="6.6" rx="6.4" ry="2" fill="var(--brass)"/>
  <ellipse cx="12" cy="6.4" rx="3.6" ry="1.1" fill="#8d6f2c"/>
  <path d="M6.1 7.9c-1.5 1.8-2.2 3.6-2.2 5.4 0 4.2 3.6 7 8.1 7s8.1-2.8 8.1-7c0-1.8-.7-3.6-2.2-5.4z" fill="var(--brass)"/>
  <path d="M7.2 10.6c-.7 1.1-1 2.2-1 3.3 0 2.6 1.8 4.4 4.1 4.9" fill="none" stroke="#f0dfa8" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
</svg>`;

const ICON = {
  sound: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4z" fill="currentColor"/>
    <path d="M15.4 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M18.1 6.6a7.7 7.7 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4z" fill="currentColor"/>
    <path d="M15.6 9.6 20.4 14.4M20.4 9.6 15.6 14.4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  help: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9.1" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M9.3 9.3a2.8 2.8 0 0 1 5.5.7c0 1.9-2.6 2.1-2.6 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
    <circle cx="12.1" cy="17.4" r="1.28" fill="currentColor"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M20.4 3.6v4.9h-4.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5.6 9 12 15.4 18.4 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/* die pips on a 3x3 grid — the button's face mirrors the 3D die exactly */
const PIPS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

/* Only ever a real face. There is no "blank die" glyph: a die with a dash in it
   reads as broken, and it also spoils nothing while the 3D die is still
   tumbling. When there is no number to show, setDiceFace() hides the svg
   outright and the plaque simply reads "Roll". */
function dieFace(v) {
  const n = PIPS[v] ? v : 0;
  if (!n) return '';
  const dots = PIPS[n]
    .map(([c, r]) => `<circle cx="${6 + (c - 1) * 6}" cy="${6 + (r - 1) * 6}" r="2.55" fill="var(--navy)"/>`)
    .join('');
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="1.1" y="1.1" width="21.8" height="21.8" rx="5.4" fill="#fff8ea"/>
    <rect x="1.1" y="1.1" width="21.8" height="21.8" rx="5.4" fill="none" stroke="rgba(26,58,92,.22)" stroke-width="1.5"/>
    ${dots}</svg>`;
}

/* token key -> silhouette, with a safe fallback so an unknown piece still reads */
function silhouette(key) {
  return SIL[key] || SIL.matka;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. CSS — namespaced .snl-ui, brand custom properties only.
      #snl-hud>* is an id-specificity rule in index.html, so the wrapper's
      pointer-transparency is written at the same specificity to beat it.
   ═══════════════════════════════════════════════════════════════════════════ */

const CSS = `
#snl-hud > .snl-ui,
.snl-ui{
  position:fixed; inset:0; z-index:1;
  pointer-events:none;
  display:flex; flex-direction:column; justify-content:space-between;
  gap:8px;
  padding:calc(6px + var(--sat)) calc(9px + var(--sar)) calc(7px + var(--sab)) calc(9px + var(--sal));
  font-family:var(--ui); color:var(--navy);
  -webkit-user-select:none; user-select:none;

  /* publishTextScale() overrides --ts inline on this element with a DAMPED
     share of the global --snl-text-scale. The global one is sized for
     lesson.js, which has no ramp of its own and whose teaching text is the
     thing a hall has to read; the HUD chrome already has projector ceilings in
     the clamps below, so if it rode the full multiplier "Khiladi 2, your turn"
     would end up bigger than the rupee figure. Chrome grows a little; the
     teaching grows a lot. */
  --ts:var(--snl-text-scale,1);
  --eo:cubic-bezier(.33,1,.68,1);
  --eio:cubic-bezier(.65,0,.35,1);

  /* one fluid type ramp. Phone floor, projector ceiling, no media queries.
     Floors are DESIGN §13's 16sp minimum; --f-name keeps the one sanctioned
     13sp exception because four plaques must fit a 390px phone. */
  --f-name:calc(clamp(13px,1.62vmin,21px) * var(--ts));
  --f-num: calc(clamp(16px,2.35vmin,31px) * var(--ts));
  --f-who: calc(clamp(18px,2.95vmin,37px) * var(--ts));
  --f-hint:calc(clamp(16px,2.15vmin,28px) * var(--ts));
  --f-log: calc(clamp(16px,2.00vmin,26px) * var(--ts));
  --f-roll:calc(clamp(18px,2.70vmin,34px) * var(--ts));
  --f-chip:calc(clamp(16px,1.95vmin,24px) * var(--ts));
  --tapc:clamp(44px,5.4vmin,62px);
  --rollh:clamp(56px,8.0vmin,94px);
  --dieh:clamp(30px,4.4vmin,52px);
}
.snl-ui *{ box-sizing:border-box }
.snl-ui__top,.snl-ui__bottom{
  pointer-events:none; display:flex; flex-direction:column; gap:6px;
  width:100%; max-width:1180px; margin:0 auto;
}
.snl-ui__row{ display:flex; align-items:stretch; gap:7px; min-width:0 }

/* ── the player strip ───────────────────────────────────────────────────
   Four plaques MUST fit a 390px phone. Below 430px the name drops and the
   plaque shrinks to silhouette + square number, rather than wrapping.      */
.snl-ui__plaques{
  flex:1 1 auto; min-width:0;
  display:flex; align-items:stretch; gap:5px;
  padding:6px 2px 6px;
}
.snl-ui__pl{
  pointer-events:none;
  flex:1 1 0; min-width:0; max-width:230px; position:relative;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:0;
  padding:4px 3px 3px;
  border-radius:13px;
  background:var(--white);
  border:1.5px solid rgba(189,233,228,.95);
  border-top:3.5px solid var(--pc);
  box-shadow:var(--shadow-sm);
  transition:transform ${timing.plaqueGlowMove}ms var(--eio),
             box-shadow ${timing.plaqueGlowMove}ms var(--eio),
             background ${timing.plaqueGlowMove}ms var(--eio),
             border-color ${timing.plaqueGlowMove}ms var(--eio);
}
.snl-ui__pl.is-active{
  transform:translateY(-4px) scale(1.055);
  background:var(--mint-lt);
  border-color:var(--teal);
  box-shadow:0 8px 20px rgba(26,58,92,.20), 0 0 0 3px rgba(42,157,143,.30);
  z-index:2;
}
/* the active marker is a SHAPE as well as a colour — a teal wedge underneath */
.snl-ui__pl.is-active::after{
  content:''; position:absolute; left:50%; bottom:-6px; transform:translateX(-50%);
  border-left:6px solid transparent; border-right:6px solid transparent;
  border-top:6px solid var(--teal);
}
.snl-ui__pl.is-done{ opacity:.82 }
/* The game is over. Gold, not teal — this is not "whose turn", it is "who won". */
.snl-ui__pl.is-win{
  opacity:1;
  background:var(--gold-lt);
  border-color:rgba(200,144,10,.55);
  border-top-color:var(--gold);
  box-shadow:0 6px 16px rgba(26,58,92,.18), 0 0 0 3px rgba(200,144,10,.45);
  z-index:2;
}
.snl-ui__sil{
  width:clamp(24px,3.2vmin,40px); height:clamp(24px,3.2vmin,40px);
  display:block; flex:0 0 auto;
  --sil:var(--pc); --sil-d:var(--pc-d); --sil-l:#ffffff;
}
.snl-ui__pname{
  /* 1.3, not 1.15: the line box has to hold a Devanagari matra above the
     headline and a Latin descender below it. At 1.15 the box was 2px shorter
     than the glyphs and overflow:hidden sliced "Priya" and "खिलाड़ी". */
  max-width:100%; font-size:var(--f-name); font-weight:700; line-height:1.38;
  color:var(--navy);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  margin-top:1px;
}
.snl-ui__pnum{
  font-size:var(--f-num); font-weight:800; line-height:1.05; color:var(--navy);
  font-variant-numeric:tabular-nums; letter-spacing:-.01em;
}
.snl-ui__pl.is-start .snl-ui__pnum{ opacity:.5 }

/* the Bura Waqt Fund lota — visible to everyone, always (§10.6) */
.snl-ui__lota{
  /* Inside the plaque, not hung off it: at top:-7px/right:-5px the badge was
     sliced by the 13px corner radius and by the neighbouring raised plaque. */
  position:absolute; top:3px; right:3px; z-index:2;
  width:clamp(21px,2.7vmin,32px); height:clamp(21px,2.7vmin,32px);
  padding:1.5px;
  border-radius:50%;
  background:var(--gold-lt);
  box-shadow:0 1px 4px rgba(26,58,92,.22), 0 0 0 1.5px rgba(176,141,63,.55);
  display:none;
}
.snl-ui__lota svg{ width:100%; height:100%; display:block }
.snl-ui__pl.is-shield .snl-ui__lota{ display:block; animation:snl-ui-pop 340ms var(--eo) }
@keyframes snl-ui-pop{ 0%{transform:scale(.3)} 62%{transform:scale(1.18)} 100%{transform:scale(1)} }

/* ── the turn banner ────────────────────────────────────────────────────
   Line 2 is the most important text in the game: it always says exactly
   what to do next, and it is never empty and never stale.                 */
.snl-ui__banner{
  flex:1 1 auto; min-width:0;
  display:flex; align-items:center; gap:8px;
  padding:3px 11px 4px 10px;
  border-radius:14px;
  background:linear-gradient(180deg,#ffffff 0%,var(--cream) 100%);
  border:1.5px solid rgba(189,233,228,.95);
  border-left:5px solid var(--pc,var(--teal));
  box-shadow:var(--shadow-sm);
}
.snl-ui__bsil{
  width:clamp(22px,3.2vmin,42px); height:clamp(22px,3.2vmin,42px); flex:0 0 auto;
  --sil:var(--pc); --sil-d:var(--pc-d); --sil-l:#ffffff;
}
.snl-ui__btext{ min-width:0; flex:1 1 auto; display:flex; flex-direction:column; gap:0 }
/* A real name — "Radhika Bhabhi" — must SHRINK before it truncates. The vw
   term only ever bites on a narrow phone; the clamp ceiling is --f-who.
   line-height 1.34 because this line is overflow:hidden and Devanagari needs
   the room: at 1.12 "आपकी बारी" measured 4px taller than its own line box on a
   projector and lost the top of every matra. */
.snl-ui__who{
  font-size:clamp(15px, 4.4vw, var(--f-who));
  font-weight:800; line-height:1.34; color:var(--navy);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
/* The instruction line wraps to two lines rather than being cut mid-word.
   opacity is 1: this is the instruction, not a footnote. */
.snl-ui__hint{
  font-size:var(--f-hint); font-weight:600; line-height:1.3; color:var(--navy);
  white-space:normal; overflow:hidden;
  display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical;
}
.snl-ui__banner.is-over{ border-left-color:var(--gold) }
.snl-ui__banner.is-swap .snl-ui__btext{ animation:snl-ui-swap ${timing.plaqueGlowMove}ms var(--eo) }
@keyframes snl-ui-swap{ from{opacity:0; transform:translateY(5px)} to{opacity:1; transform:none} }

/* ── the settings cluster: 2x2, top-right, 44px minimum ─────────────── */
.snl-ui__cluster{
  flex:0 0 auto; display:flex; align-items:center; gap:6px;
}
.snl-ui__chip{
  pointer-events:auto;
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-width:var(--tapc); min-height:var(--tapc); padding:0 9px;
  border:1.5px solid var(--mint); border-radius:999px;
  background:var(--white); color:var(--navy);
  font-family:var(--ui); font-weight:800; font-size:var(--f-chip); line-height:1;
  box-shadow:var(--shadow-sm); cursor:pointer;
  transition:transform 90ms var(--eo), background 160ms var(--eo);
}
.snl-ui__chip svg{ width:clamp(19px,2.4vmin,30px); height:clamp(19px,2.4vmin,30px); display:block }
.snl-ui__chip:active{ transform:translateY(1.5px) }
.snl-ui__chip[aria-pressed="true"]{ background:var(--mint-lt) }
.snl-ui__chip .w{ display:none }
/* No icon-only control without a word (§7.4) — as soon as there is room. */
@media (min-width:560px){ .snl-ui__chip .w{ display:inline } }

/* ── the log ────────────────────────────────────────────────────────────
   Readable from the back of a workshop hall; collapsed to one line on a
   phone, and never taller than five.                                      */
.snl-ui__log{
  display:flex; align-items:center; gap:6px;
  padding:4px 5px 4px 10px;
  border-radius:13px;
  background:rgba(255,255,255,.94);
  border:1.5px solid rgba(189,233,228,.9);
  box-shadow:var(--shadow-sm);
}
.snl-ui__log[hidden]{ display:none }
/* The max-heights are WHOLE line boxes. A line box is (font-size * 1.42) of
   leading plus the 3px padding-bottom on .snl-ui__line — nothing else. The old
   +4px / +7px fudges landed between lines, so the block sliced the last entry
   horizontally through its glyphs and read as a rendering fault. */
.snl-ui__lines{
  flex:1 1 auto; min-width:0;
  max-height:calc(var(--f-log) * 1.42 + 3px);
  overflow:hidden;
  transition:max-height 220ms var(--eo);
}
.snl-ui__log.is-open{ align-items:flex-start }
/* Three lines, not five. §6.4 rule 1 is that board legibility outranks every
   other thing on screen, and on a 1440x900 laptop the difference between a
   five-line and a three-line log is 13% of the board's width. The five newest
   lines are still all there — the block scrolls. */
.snl-ui__log.is-open .snl-ui__lines{
  max-height:calc((var(--f-log) * 1.42 + 3px) * 3);
  overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin;
  pointer-events:auto;
}
/* Set by JS only while the block actually overflows: a soft bottom edge that
   says "there is more", instead of a hard slice through a word. */
.snl-ui__log.is-open .snl-ui__lines.is-more{
  -webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 14px),transparent);
  mask-image:linear-gradient(to bottom,#000 calc(100% - 14px),transparent);
}
.snl-ui__line{
  font-size:var(--f-log); font-weight:700; line-height:1.42; color:var(--navy);
  padding:0 0 3px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.snl-ui__log.is-open .snl-ui__line{ white-space:normal }
.snl-ui__line:last-child{ padding-bottom:0 }
.snl-ui__line + .snl-ui__line{ opacity:.62; font-weight:600 }
.snl-ui__line.is-new{ animation:snl-ui-line 260ms var(--eo) }
@keyframes snl-ui-line{ from{opacity:0; transform:translateY(-5px)} to{opacity:1; transform:none} }
.snl-ui__line b{ font-weight:800 }
.snl-ui__line .n{ color:var(--gold); font-weight:800; font-variant-numeric:tabular-nums }
.snl-ui__logtog{
  pointer-events:auto; flex:0 0 auto;
  width:var(--tapc); min-width:var(--tapc); min-height:var(--tapc);
  display:inline-flex; align-items:center; justify-content:center;
  border:0; background:transparent; color:var(--navy); cursor:pointer; padding:0;
  border-radius:10px;
}
.snl-ui__logtog svg{ width:clamp(20px,2.5vmin,30px); height:clamp(20px,2.5vmin,30px);
  transition:transform 220ms var(--eo) }
.snl-ui__log.is-open .snl-ui__logtog svg{ transform:rotate(180deg) }

/* ── the confirm bar. Inline, never a modal, never a scrim (§14 #14). ── */
.snl-ui__confirm{
  display:none; align-items:center; gap:7px;
  padding:6px 7px 6px 11px;
  border-radius:13px;
  background:var(--gold-lt);
  border:1.5px solid rgba(200,144,10,.42);
  box-shadow:var(--shadow-sm);
}
.snl-ui__confirm.is-open{ display:flex }
.snl-ui__ctext{
  flex:1 1 auto; min-width:0;
  font-size:var(--f-hint); font-weight:800; color:var(--navy); line-height:1.2;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.snl-ui__cbtn{
  pointer-events:auto; flex:0 0 auto;
  min-height:var(--tapc); padding:0 14px;
  border-radius:11px; border:0; cursor:pointer;
  font-family:var(--ui); font-weight:800; font-size:var(--f-chip); line-height:1;
  background:var(--white); color:var(--navy);
  border:1.5px solid rgba(26,58,92,.22);
}
.snl-ui__cbtn.is-go{ background:var(--teal); color:#fff; border-color:var(--teal-d);
  border-bottom:3px solid var(--teal-d) }

/* ── the ROLL plaque ────────────────────────────────────────────────────
   The secondary primary: the 3D die is the hero, this is the thumb's
   guaranteed 56dp target at the bottom of the screen.                     */
.snl-ui__act{
  display:flex; align-items:stretch; gap:7px;
  width:100%; max-width:min(100%,580px); margin:0 auto;
}
/* "New game" lives DOWN here, beside the thumb, not in the top-right corner
   where a hand grips a phone being passed across a table (§7.5: nothing
   interactive in the top 20%). It still opens the inline confirm bar. */
.snl-ui__act .snl-ui__chip{
  flex:0 0 auto; min-width:var(--tapc); padding:0 9px;
  align-self:stretch; border-radius:14px;
}
.snl-ui__roll[hidden]{ display:none !important }
.snl-ui__roll{
  pointer-events:auto; flex:1 1 auto; min-width:0;
  min-height:var(--rollh);
  display:inline-flex; align-items:center; justify-content:center; gap:12px;
  padding:0 16px;
  border:0; border-radius:16px;
  border-bottom:4px solid var(--teal-d);
  background:var(--teal); color:#ffffff;
  font-family:var(--ui); font-weight:800; font-size:var(--f-roll); line-height:1;
  letter-spacing:.01em;
  box-shadow:0 6px 18px rgba(26,58,92,.18);
  cursor:pointer;
  transition:transform 60ms var(--eo), background 180ms var(--eo),
             box-shadow 180ms var(--eo), opacity 180ms var(--eo);
}
.snl-ui__roll:active:not([disabled]){ transform:translateY(3px); border-bottom-width:1px }
/* Disabled must read as "not your turn", never as "broken" (§14 #16): it loses
   the teal, the 4px under-edge and the shadow — three signals, never colour
   alone — and the hint line above always says why. Text stays >= 4.5:1. */
.snl-ui__roll[disabled]{
  cursor:default;
  background:var(--mint-lt); color:var(--navy);
  border-bottom-color:var(--mint);
  box-shadow:none;
}
.snl-ui__roll[disabled] .snl-ui__rolltext{ opacity:.72 }
.snl-ui__roll[disabled] .snl-ui__die{ opacity:.7 }
/* Deliberately NOT animated: §3.1 says the 3D die is the only thing pulsing
   while a player is idle-ready. The button reads as live by being solid teal. */
.snl-ui__die{
  width:var(--dieh); height:var(--dieh); flex:0 0 auto; display:block;
  filter:drop-shadow(0 1px 2px rgba(26,58,92,.22));
}
/* Written here and not left to the UA: this element carries display:block, and
   an author display always beats the hidden attribute. */
.snl-ui__die[hidden]{ display:none !important }
.snl-ui__die.is-pop{ animation:snl-ui-pip ${timing.dicePipPop * 2}ms var(--eo) }
@keyframes snl-ui-pip{ 0%{transform:scale(1)} 50%{transform:scale(1.16)} 100%{transform:scale(1)} }
.snl-ui__die.is-six{ filter:drop-shadow(0 0 7px rgba(200,144,10,.85)) }
.snl-ui__roll[disabled] .snl-ui__die.is-six{ filter:none }

/* ── toast ─────────────────────────────────────────────────────────────── */
.snl-ui__toast{
  position:absolute; left:50%; bottom:calc(var(--snl-tray-h,120px) + 12px);
  transform:translate(-50%,10px);
  width:max-content; max-width:min(86vw,620px);
  padding:10px 16px;
  border-radius:999px;
  background:var(--navy); color:var(--cream);
  font-size:var(--f-hint); font-weight:700; line-height:1.28; text-align:center;
  box-shadow:var(--shadow-lg);
  opacity:0; pointer-events:none;
  transition:opacity 200ms var(--eo), transform 200ms var(--eo);
}
.snl-ui__toast.is-on{ opacity:1; transform:translate(-50%,0) }

/* ── narrow phones ──────────────────────────────────────────────────────
   Nobody's name is ever dropped. Four-players-on-one-phone is the headline
   configuration, and in it the plaque strip owns the whole first row (the
   settings chips moved down to the banner row), so at 390px each plaque is
   ~89px — enough for eight characters and an ellipsis.                     */
@media (max-width:430px){
  .snl-ui__plaques[data-n="4"]{ gap:4px }
  .snl-ui__plaques[data-n="4"] .snl-ui__pl{ padding:4px 2px 3px }
}
@media (max-width:360px){
  .snl-ui__chip{ padding:0 6px }
}

/* ── the projector: one row of chrome, no dice bookkeeping ───────────────
   In a hall the log is the one thing nobody needs and the most expensive
   thing on screen: its height feeds --snl-tray-h, which game.js turns into
   camera distance, so three lines of "Khiladi 2 rolled 4" cost ~23% of the
   board's width. The die face, the plaques and the toast already say it. */
@media (min-width:1280px) and (orientation:landscape){
  .snl-ui__log{ display:none }
  .snl-ui__top{
    flex-direction:row; align-items:center; gap:12px; max-width:1720px;
  }
  .snl-ui__top > .snl-ui__row{ min-width:0; width:auto }
  .snl-ui__top > .snl-ui__row:first-child{ flex:0 0 auto }
  .snl-ui__top > .snl-ui__row:last-child{ flex:1 1 auto }
  .snl-ui__plaques{ flex:0 0 auto; padding:2px; gap:8px }
  /* side by side the plaques size to their content — a shrink-to-fit row must
     not hand each plaque a zero flex-basis, or every name ellipsises */
  .snl-ui__pl{ flex:0 0 auto; min-width:132px; max-width:230px; padding:5px 12px 4px }
  .snl-ui__banner{ flex:1 1 auto }
  /* the two word-chips are ~26px type up here; without this the ROLL plaque
     ends up the smallest thing in its own row */
  .snl-ui__bottom{ max-width:940px }
  .snl-ui__act{ max-width:940px }
}
/* short screens: the middle belongs to the game, so the HUD gives first */
@media (max-height:620px){
  .snl-ui{ --rollh:52px }
  .snl-ui__log{ padding:3px 4px 3px 8px }
}

/* ── reduced motion: nothing here moves ─────────────────────────────── */
.snl-ui.is-rm *,
.snl-ui.is-rm *::after{
  animation:none !important;
  transition-duration:1ms !important;
}
@media (prefers-reduced-motion: reduce){
  .snl-ui *,.snl-ui *::after{ animation:none !important; transition-duration:1ms !important }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   3. STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
  root: null,
  hooks: {},
  players: [],          // normalised plaque models
  nodes: new Map(),     // playerId -> { pl, num, name, sil }
  activeId: null,
  hint: '',             // the last hint game.js gave us
  hintAuto: true,       // true while the hint is ours to recompute
  awaiting: false,      // the turn has moved on but the phone has not — the ONE
                        // state in which the HUD talks about a player in the
                        // third person. Both banner lines read off this flag,
                        // so they cannot disagree.
  rollEnabled: false,
  face: 0,              // the face PAINTED on the plaque right now
  pendingFace: 0,       // a result held back until the 3D die has settled (§9)
  revealRaf: 0,
  revealTimer: 0,
  skipWatch: null,
  muted: false,
  logs: [],
  logOpen: false,
  over: false,          // the game has ended — the HUD must stop asking for a roll
  winnerId: null,
  confirmOpen: false,
  toastTimer: 0,
  lastSpoken: '',
  offLang: null,
  ro: null,
  mounted: false,
};

const $ = {};   // element refs

/* ═══════════════════════════════════════════════════════════════════════════
   4. HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const hex = (v) => typeof v === 'number'
  ? '#' + (v >>> 0).toString(16).padStart(6, '0')
  : (typeof v === 'string' && v ? v : null);

/** Accepts a rules.js player, a setup.js player, or anything in between. */
function normalise(p, i) {
  const key = p.token || p.key || (p.isBot ? 'mithu' : ['matka', 'diya', 'chaabi', 'ghanti'][i % 4]);
  const cfg = p.isBot ? TOK.bot : (TOK.players.find(x => x.key === key) || TOK.players[i % 4]);
  return {
    id: p.id != null ? String(p.id) : 'p' + (i + 1),
    name: p.name || cfg.name || t('setup.playerName', { n: i + 1 }),
    key,
    isBot: !!p.isBot,
    color: hex(p.css) || hex(p.color) || cfg.css || C.teal,
    colorD: hex(p.colorD) || hex(cfg.colorD) || C.navy,
    pos: Number(p.pos) || 0,
    shield: !!p.shield,
    finished: !!p.finished,
  };
}

const rosterKey = (list) => list.map(p => p.id + ':' + p.key + ':' + p.name).join('|');

/** Every state change is written to #snl-live as one plain sentence. */
function announce(msg) {
  if (!msg) return;
  const live = document.getElementById('snl-live');
  if (!live) return;
  const text = String(msg).replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!text || text === S.lastSpoken) return;
  S.lastSpoken = text;
  live.textContent = '';
  setTimeout(() => { try { live.textContent = text; } catch { /* torn down */ } }, 30);
}

function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(timing.diceHaptic); } catch { /* unsupported */ }
}

function call(name, ...args) {
  const fn = S.hooks[name];
  if (typeof fn !== 'function') return undefined;
  try { return fn(...args); } catch (e) { if (window.__SNL) window.__SNL.errors?.push(e); return undefined; }
}

/** Publish the real bottom-band height so lesson.js lifts its ribbon clear
    of the ROLL plaque. It reads this as --snl-tray-h. */
function publishTrayHeight() {
  if (!S.mounted || !$.bottom || !S.root || !document.documentElement) return;
  const h = Math.round($.bottom.getBoundingClientRect().height +
    parseFloat(getComputedStyle(S.root).paddingBottom || 0) + 8);
  if (h > 0) document.documentElement.style.setProperty('--snl-tray-h', h + 'px');
}

/** The type scale nobody was setting.
 *
 *  lesson.js writes every one of its sizes as calc(Npx * var(--snl-text-scale))
 *  and so does this file, but no code path ever assigned the property — so on a
 *  1920x1080 projector the money lesson rendered at 15-17px while the dice
 *  bookkeeping rendered at 21-32px. The game shouted what nobody needs to read
 *  and whispered the rupee figure.
 *
 *  vmin/620 means a 390px phone is bit-identical to before (clamped to 1) and a
 *  1080-tall hall gets 1.74x — the escape-action line goes 16px -> 28px and the
 *  one number goes 32px -> 56px.
 *
 *  The HUD takes a damped share of the same scale (its clamps already carry a
 *  projector ceiling), so the chrome grows a little and the teaching grows a
 *  lot. That ratio is the whole point. */
export function publishTextScale() {
  if (typeof window === 'undefined' || !document.documentElement) return;
  const vmin = Math.min(window.innerWidth || 0, window.innerHeight || 0);
  if (!vmin) return;
  const ts = clamp(vmin / 620, 1, 1.75);
  const round2 = (v) => String(Math.round(v * 100) / 100);
  document.documentElement.style.setProperty('--snl-text-scale', round2(ts));
  if (S.root) S.root.style.setProperty('--ts', round2(clamp(1 + (ts - 1) * 0.4, 1, 1.25)));
}

/** One handler for both viewport-driven publishes. */
function onViewport() {
  publishTextScale();
  publishTrayHeight();
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. MOUNT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {HTMLElement} [root]  defaults to #snl-hud
 * @param {object} [hooks] { onRoll, onMenu, onMute, onHelp, onLangToggle, onRestart }
 */
export function mountUI(root, hooks = {}) {
  injectCss('ui', CSS);
  const host = root || document.getElementById('snl-hud');
  if (!host) return null;
  if (S.mounted) unmountUI();

  S.hooks = hooks || {};
  S.muted = !!hooks.muted;

  const wrap = document.createElement('div');
  wrap.className = 'snl-ui';
  if (prefersReducedMotion()) wrap.classList.add('is-rm');
  /* Row 1 is the plaque strip and NOTHING else, so four names fit a 390px
     phone. Only the two chips a player touches mid-game (language, sound) sit
     beside the banner, which keeps the banner as wide as it was. "New game" —
     the one irreversible control in the product — and "How to play" move to the
     bottom band, out of the top-right corner a hand grips when the phone is
     passed across a table (§7.5: nothing interactive in the top 20%). */
  wrap.innerHTML = `
<div class="snl-ui__top">
  <div class="snl-ui__row">
    <div class="snl-ui__plaques" role="list" aria-label="${esc(t('hud.standings'))}"></div>
  </div>
  <div class="snl-ui__row">
    <div class="snl-ui__banner">
      <svg class="snl-ui__bsil" viewBox="0 0 24 24" aria-hidden="true" focusable="false"></svg>
      <span class="snl-ui__btext">
        <span class="snl-ui__who"></span>
        <span class="snl-ui__hint"></span>
      </span>
    </div>
    <div class="snl-ui__cluster">
      <button type="button" class="snl-ui__chip" data-act="lang"></button>
      <button type="button" class="snl-ui__chip" data-act="mute"></button>
    </div>
  </div>
</div>

<div class="snl-ui__toast" aria-hidden="true"></div>

<div class="snl-ui__bottom">
  <div class="snl-ui__confirm" role="group"></div>
  <div class="snl-ui__log" hidden>
    <div class="snl-ui__lines" id="snl-ui-lines" role="log" aria-live="off"
         aria-label="${esc(t('hud.log'))}"></div>
    <button type="button" class="snl-ui__logtog" aria-controls="snl-ui-lines" aria-expanded="false">
      ${ICON.chev}
    </button>
  </div>
  <div class="snl-ui__act">
    <button type="button" class="snl-ui__chip" data-act="restart"></button>
    <button type="button" class="snl-ui__chip" data-act="help"></button>
    <button type="button" class="snl-ui__roll" disabled>
      <span class="snl-ui__rolltext"></span>
      <svg class="snl-ui__die" viewBox="0 0 24 24" aria-hidden="true" focusable="false"></svg>
    </button>
  </div>
</div>`;

  host.appendChild(wrap);
  S.root = wrap;
  S.mounted = true;

  $.plaques  = wrap.querySelector('.snl-ui__plaques');
  $.banner   = wrap.querySelector('.snl-ui__banner');
  $.bsil     = wrap.querySelector('.snl-ui__bsil');
  $.btext    = wrap.querySelector('.snl-ui__btext');
  $.who      = wrap.querySelector('.snl-ui__who');
  $.hint     = wrap.querySelector('.snl-ui__hint');
  $.toast    = wrap.querySelector('.snl-ui__toast');
  $.bottom   = wrap.querySelector('.snl-ui__bottom');
  $.confirm  = wrap.querySelector('.snl-ui__confirm');
  $.log      = wrap.querySelector('.snl-ui__log');
  $.lines    = wrap.querySelector('.snl-ui__lines');
  $.logtog   = wrap.querySelector('.snl-ui__logtog');
  $.roll     = wrap.querySelector('.snl-ui__roll');
  $.rolltext = wrap.querySelector('.snl-ui__rolltext');
  $.die      = wrap.querySelector('.snl-ui__die');
  $.lang     = wrap.querySelector('[data-act="lang"]');
  $.mute     = wrap.querySelector('[data-act="mute"]');
  $.help     = wrap.querySelector('[data-act="help"]');
  $.restart  = wrap.querySelector('[data-act="restart"]');

  /* The log starts collapsed EVERYWHERE, including a projector. Opening it to
     three lines cost the board 23% of its width, because the log's height feeds
     --snl-tray-h and game.js turns that into camera distance. A room can still
     open it with the chevron; above 1280px landscape the CSS drops it entirely.  */
  S.logOpen = false;
  S.over = false;
  S.winnerId = null;
  S.awaiting = false;
  $.log.classList.toggle('is-open', S.logOpen);
  $.logtog.setAttribute('aria-expanded', S.logOpen ? 'true' : 'false');

  wrap.addEventListener('click', onClick);
  $.roll.addEventListener('pointerdown', () => { if (!$.roll.disabled) haptic(); });
  document.addEventListener('keydown', onKey, true);

  S.offLang = onLangChange(() => { paintChrome(); paintBanner(); paintPlaques(); });

  if (typeof ResizeObserver === 'function') {
    S.ro = new ResizeObserver(publishTrayHeight);
    S.ro.observe($.bottom);
  }
  window.addEventListener('resize', onViewport);

  publishTextScale();
  paintChrome();
  paintBanner();
  setDiceFace(0);
  publishTrayHeight();
  return wrap;
}

export function unmountUI() {
  if (!S.mounted) return;
  try { document.removeEventListener('keydown', onKey, true); } catch { /* fine */ }
  try { window.removeEventListener('resize', onViewport); } catch { /* fine */ }
  S.ro?.disconnect();
  S.offLang?.();
  cancelDiceReveal();          // never leave a document-level skip watcher behind
  S.root?.remove();
  clearTimeout(S.toastTimer);
  document.documentElement?.style.removeProperty('--snl-tray-h');
  /* --snl-text-scale is NOT removed here. It is owned by main.js from boot,
     because the setup screen reads it too — and the setup screen outlives
     (and precedes) every HUD mount. Removing it here dropped the setup card
     back to 16px the moment a game ended and returned to the menu. */
  S.root = null; S.ro = null; S.offLang = null; S.mounted = false;
  S.nodes.clear(); S.players = []; S.logs = []; S.activeId = null;
  S.over = false; S.winnerId = null; S.awaiting = false;
  S.face = 0; S.pendingFace = 0; S.rollEnabled = false;
}

export function isMounted() { return S.mounted; }
export function getRoot() { return S.root; }

/* ═══════════════════════════════════════════════════════════════════════════
   6. CHROME — the four settings chips and the ROLL word
   ═══════════════════════════════════════════════════════════════════════════ */

function paintChrome() {
  if (!S.mounted) return;

  $.lang.innerHTML = `<span>${esc(langChipLabel())}</span>`;
  $.lang.setAttribute('aria-label', t('hud.langToggleAria', { lang: LANG_NAMES[otherLang()] }));

  $.mute.innerHTML = `${S.muted ? ICON.mute : ICON.sound}<span class="w">${esc(S.muted ? t('settings.off') : t('settings.on'))}</span>`;
  $.mute.setAttribute('aria-pressed', S.muted ? 'true' : 'false');
  $.mute.setAttribute('aria-label', S.muted ? t('hud.unmute') : t('hud.mute'));

  $.help.innerHTML = `${ICON.help}<span class="w">${esc(t('howto.title'))}</span>`;
  $.help.setAttribute('aria-label', t('hud.help'));

  $.restart.innerHTML = `${ICON.restart}<span class="w">${esc(t('settings.newGame'))}</span>`;
  $.restart.setAttribute('aria-label', t('settings.newGame'));

  $.logtog.setAttribute('aria-label', t('hud.log'));
  $.rolltext.textContent = t('turn.roll');
  syncRollAria();
  if (S.confirmOpen) paintConfirm();
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. THE PLAYER STRIP
   ═══════════════════════════════════════════════════════════════════════════ */

/** Rebuilds only when the roster itself changed; otherwise patches in place so
 *  the raised-plaque transition never restarts mid-turn. */
export function setPlayers(list) {
  if (!S.mounted || !Array.isArray(list)) return;
  const next = list.map(normalise);
  const rebuild = rosterKey(next) !== rosterKey(S.players);
  S.players = next;
  if (rebuild) buildPlaques();
  /* The game ends the moment the first player finishes (rules.js §10), so the
     roster itself tells us the game is over — the HUD does not have to wait for
     game.js to remember to say so, and a new round clears it again. */
  const done = next.find(p => p.finished);
  if (done) applyGameOver(done.id);
  else if (S.over) clearGameOver();
  paintPlaques();
  paintBanner();
}

function buildPlaques() {
  S.nodes.clear();
  $.plaques.innerHTML = '';
  $.plaques.dataset.n = String(S.players.length);
  for (const p of S.players) {
    const pl = document.createElement('div');
    pl.className = 'snl-ui__pl';
    pl.setAttribute('role', 'listitem');
    pl.style.setProperty('--pc', p.color);
    pl.style.setProperty('--pc-d', p.colorD);
    pl.innerHTML = `
      <span class="snl-ui__lota">${LOTA}</span>
      <svg class="snl-ui__sil" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${silhouette(p.key)}</svg>
      <span class="snl-ui__pname"></span>
      <span class="snl-ui__pnum"></span>`;
    $.plaques.appendChild(pl);
    S.nodes.set(p.id, {
      pl,
      name: pl.querySelector('.snl-ui__pname'),
      num: pl.querySelector('.snl-ui__pnum'),
    });
  }
}

function paintPlaques() {
  for (const p of S.players) {
    const n = S.nodes.get(p.id);
    if (!n) continue;
    n.name.textContent = p.name;
    /* A dimmed 0 reads as "at the start line". An en-dash read as "no data". */
    n.num.textContent = p.pos > 0 ? String(p.pos) : '0';
    n.pl.classList.toggle('is-active', !S.over && p.id === S.activeId);
    n.pl.classList.toggle('is-shield', p.shield);
    n.pl.classList.toggle('is-start', p.pos <= 0);
    n.pl.classList.toggle('is-done', p.finished);
    n.pl.classList.toggle('is-win', S.over && p.id === S.winnerId);
    if (p.id === S.activeId) n.pl.setAttribute('aria-current', 'true');
    else n.pl.removeAttribute('aria-current');
    const where = p.pos > 0 ? t('hud.onSquare', { name: p.name, n: p.pos })
                            : `${p.name} — ${tn('common.squares', 0)}`;
    n.pl.setAttribute('aria-label',
      `${where}. ${p.shield ? t('shield.haveAria', { name: p.name }) : t('shield.noneAria', { name: p.name })}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. THE TURN BANNER — and the hint, which is never empty and never stale
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object|string} player  a player object, or a player id
 * @param {string} [hint]  what to do next. Omit and ui.js computes it.
 */
export function setTurn(player, hint) {
  if (!S.mounted) return;
  const id = player == null ? null
    : (typeof player === 'object' ? String(player.id) : String(player));

  /* a player object may also carry a fresher pos/shield than the last strip paint */
  if (player && typeof player === 'object' && id) {
    const cur = S.players.find(p => p.id === id);
    if (cur) {
      if (typeof player.pos === 'number') cur.pos = player.pos;
      if ('shield' in player) cur.shield = !!player.shield;
      if (player.name) cur.name = player.name;
    }
  }

  /* A player object carrying finished:true IS the win — game.js's celebrate()
     hands us exactly that, so the HUD reaches its terminal state without
     needing a separate call. setGameOver() is still exported for callers that
     would rather be explicit. */
  if (player && typeof player === 'object' && player.finished && id) {
    applyGameOver(id);
    if (typeof hint === 'string' && hint.length) { S.hint = hint; S.hintAuto = false; }
    else { S.hintAuto = true; }
    paintHint();
    const w = S.players.find(p => p.id === S.winnerId);
    if (w) announce(`${t('finish.reached', { name: w.name })}. ${$.hint.textContent}`);
    return;
  }

  const changed = id !== S.activeId;
  S.activeId = id;
  /* The turn moved to somebody new and the dice is not live yet: the phone is
     still in the last player's hand. That, and only that, is "waiting". */
  if (changed) {
    const nx = current();
    S.awaiting = !S.rollEnabled && !!nx && !nx.isBot;
  }
  if (typeof hint === 'string' && hint.length) { S.hint = hint; S.hintAuto = false; }
  else { S.hintAuto = true; }

  /* The plaque must never carry the previous player's number: after turn 3 the
     button under Khiladi 2's name was still showing Khiladi 1's result. */
  if (changed) setDiceFace(0);

  paintPlaques();
  paintBanner(changed);

  const p = current();
  if (p) announce(`${t('hud.turnOf', { name: p.name })}. ${$.hint.textContent}`);
}

/* ── the terminal state ──────────────────────────────────────────────────
   Before this existed the HUD never learned the game had ended: on a finished
   board it kept "Khiladi 1, your turn / Pass to Khiladi 1", a teal wedge
   pointing at the winner, and a live Roll plaque showing a 6. */

function applyGameOver(winnerId) {
  const id = winnerId != null ? String(winnerId) : null;
  if (S.over && S.winnerId === id) return;
  S.over = true;
  S.winnerId = id;
  S.activeId = null;
  S.awaiting = false;
  S.hintAuto = true;
  S.rollEnabled = false;
  if (S.mounted) {
    $.roll.disabled = true;
    $.roll.hidden = true;              // no live Roll plaque under a won game
    $.banner.classList.add('is-over');
    setDiceFace(0);
    paintPlaques();
    paintBanner(true);
    publishTrayHeight();
  }
}

function clearGameOver() {
  S.over = false;
  S.winnerId = null;
  if (!S.mounted) return;
  $.roll.hidden = false;
  $.banner.classList.remove('is-over');
  publishTrayHeight();
}

/**
 * Declare the game finished. Idempotent; pass null to clear it again.
 * @param {string|number|null} winnerId
 */
export function setGameOver(winnerId) {
  if (!S.mounted) return;
  if (winnerId == null) clearGameOver();
  else applyGameOver(winnerId);
  paintPlaques();
  paintBanner(true);
}

export function isGameOver() { return S.over; }

/** Set only the hint line. Never blank — an empty string restores the auto hint. */
export function setHint(hint) {
  if (!S.mounted) return;
  if (typeof hint === 'string' && hint.length) { S.hint = hint; S.hintAuto = false; }
  else { S.hintAuto = true; }
  paintHint();
}

export function setActive(id) { setTurn(id); }

const current = () => S.players.find(p => p.id === S.activeId) || null;

/* ── second-person names ────────────────────────────────────────────────
   setup.js pre-fills the first player as "You" (आप in Hindi), so that name
   lands inside sentences that already address the player: the banner read
   "You, your turn" on every frame of a two-player game, and the hint under it
   read "Pass to You". A second-person name is not a name — it is the
   sentence's own pronoun. Line 1 therefore drops it ("Your turn"), and any
   mid-sentence slot takes it lower-cased ("Pass to you"). Devanagari has no
   case, so toLowerCase() is a no-op there and आप reads correctly either way. */
const SECOND_PERSON = /^(you|tu|tum|aap|आप|तुम|तू)$/i;
const isSecondPerson = (name) => SECOND_PERSON.test(String(name || '').trim());
const midName = (p) => (!p ? '' : (isSecondPerson(p.name) ? String(p.name).toLowerCase() : p.name));

/** The hint is the most important text in the game. It always says what to do
 *  next, for whoever is holding the phone right now — never a status, always an
 *  instruction. Three auto states, and game.js may override any of them:
 *    dice live          -> "Tap the dice"
 *    Mithu's turn       -> "Mithu is thinking"
 *    a human's turn,
 *    dice not yet live  -> "Priya ko do"  (the phone has to reach her first) */
function autoHint() {
  if (S.over) return t('finish.lakshya', null, 'Lakshya poora.');
  const p = current();
  if (!p) return t('turn.rollHint');
  if (S.rollEnabled) return t('turn.rollHint');
  if (p.isBot) return t('turn.mithuThinking');
  if (S.awaiting) return t('turn.handoff', { name: midName(p) });
  /* The player's own move is still playing out on the board. There is nothing
     new to instruct, so the last valid instruction stands: null means "keep
     what is on screen" — never blank, and never "pass the phone to yourself",
     which is what this branch used to say after every single roll. */
  return null;
}

/** Who the banner is ABOUT: the winner once the game is over, else whoever is
 *  on turn. Never the last active player after the game has ended. */
const bannerPlayer = () => (S.over
  ? (S.players.find(p => p.id === S.winnerId) || null)
  : current());

/** Line 1. The banner used to say "{name}, your turn" while line 2 said
 *  "Pass to {name}" — two lines addressed to two different readers about the
 *  same person, on screen after every resolved turn. Second person is used
 *  only when the dice is actually live for the person holding the phone. */
function paintWho() {
  const p = bannerPlayer();
  if (S.over) {
    $.who.textContent = p
      ? t('finish.reached', { name: p.name })
      : t('finish.lakshya', null, 'Lakshya poora.');
    return;
  }
  if (!p) { $.who.textContent = t('app.name'); return; }
  if (S.awaiting && !p.isBot) {
    $.who.textContent = t('turn.waiting', { name: midName(p) }, 'Waiting for {name}');
    return;
  }
  /* "Your turn" — not "You, your turn". */
  $.who.textContent = isSecondPerson(p.name)
    ? t('turn.yourShort', null, 'Your turn')
    : t('turn.your', { name: p.name });
}

function paintHint() {
  if (!S.mounted) return;
  const text = (!S.hintAuto && S.hint) ? S.hint : autoHint();
  if (text == null) return;                      // nothing new to instruct
  if ($.hint.textContent !== text) $.hint.textContent = text;
}

function paintBanner(animate = false) {
  if (!S.mounted) return;
  const p = bannerPlayer();
  const color = p ? p.color : C.teal;
  const colorD = p ? p.colorD : C.navy;
  $.banner.style.setProperty('--pc', color);
  $.banner.style.setProperty('--pc-d', colorD);
  $.bsil.innerHTML = p ? silhouette(p.key) : '';
  paintWho();
  paintHint();
  if (animate && !prefersReducedMotion()) {
    $.banner.classList.remove('is-swap');
    void $.banner.offsetWidth;               // restart the swap
    $.banner.classList.add('is-swap');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. THE ROLL PLAQUE — mirrors the 3D die, both ways
   ═══════════════════════════════════════════════════════════════════════════ */

export function setRollEnabled(b) {
  if (!S.mounted) return;
  const on = !!b && !S.over;     // a finished game never re-arms the plaque
  S.rollEnabled = on;
  if (on) S.awaiting = false;    // the phone has arrived; never set the other way
  $.roll.disabled = !on;
  syncRollAria();
  /* Line 1 flips with the dice, not with the turn: "Waiting for Radhika" the
     moment the phone is handed over, "Radhika, your turn" the moment it is
     live in her hands. */
  paintWho();
  paintHint();
}

export function isRollEnabled() { return S.rollEnabled; }

/* ── THE DIE IS THE HERO; THE PLAQUE IS ITS ECHO ────────────────────────────
   game.js calls setDiceFace(value) on the same frame it starts the 3D roll,
   because that is the only frame on which it knows the number. Painting it
   there printed the answer ~800 ms before the die stopped tumbling, which
   turned the best object in the build into decoration: a 60 ms known followed
   by 800 ms of ornamental spinning.

   So a real face is ARMED, not painted. It lands on the die's own pip-pop
   frame — timing.diceTumble + timing.diceSettle (§9 #10, "number legible at
   840 ms") — and the plaque's 1.00 -> 1.16 -> 1.00 pip pop then plays in
   unison with the die's 1.00 -> 1.15 -> 1.00. One beat, two objects.

   The wait is skipped whenever there is no tumble to wait for: reduced motion
   (dice3d cross-fades in 250 ms), no 3D die on screen at all, or the player
   tapping the die to skip the roll. */

/** How long to hold the number back. Both halves are config feel-numbers, so
 *  retuning the die retunes the plaque with it and they can never drift. */
function revealDelay() {
  return Math.max(0, (timing.diceTumble || 700) + (timing.diceSettle || 140));
}

/** dice3d parks an ~88 px transparent proxy button over the 3D die for
 *  keyboard and AT. Its presence IS "the die is on the table", and its rect is
 *  the die's screen box — it is pointer-events:none, so a tap inside it is a
 *  tap on the mesh. */
function diceProxy() {
  try { return document.querySelector('.snl-dice3d'); } catch { return null; }
}

function dieIsOnScreen() {
  const el = diceProxy();
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const cv = document.getElementById('snl-canvas');
  if (!cv) return false;
  const cr = cv.getBoundingClientRect();
  return cr.width > 0 && cr.height > 0;
}

function cancelDiceReveal() {
  if (S.revealRaf) { cancelAnimationFrame(S.revealRaf); S.revealRaf = 0; }
  if (S.revealTimer) { clearTimeout(S.revealTimer); S.revealTimer = 0; }
  if (S.skipWatch) {
    document.removeEventListener('pointerdown', S.skipWatch, true);
    document.removeEventListener('click', S.skipWatch, true);
    S.skipWatch = null;
  }
  S.pendingFace = 0;
}

/* CONTRACT amendment 10 — the tumble is tap-skippable. dice3d snaps the die to
   its face on the next frame; the plaque must land on that frame too, or it
   lags the object it is echoing. */
function watchForSkip() {
  const onTap = (e) => {
    if (!S.pendingFace) return;
    const el = diceProxy();
    if (!el) return;
    if (e.target && e.target.closest && e.target.closest('.snl-dice3d')) { paintDiceFace(S.pendingFace); return; }
    const x = e.clientX, y = e.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const pad = 6;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      paintDiceFace(S.pendingFace);
    }
  };
  S.skipWatch = onTap;
  document.addEventListener('pointerdown', onTap, true);
  document.addEventListener('click', onTap, true);
}

/* rAF, not setTimeout: a backgrounded tab pauses rAF and pauses the die's
   tumble with it, so the two stay locked together and the plaque can never
   reveal into a frozen die. The timer is only a floor for a host with no rAF. */
function armDiceReveal(n) {
  cancelDiceReveal();
  S.pendingFace = n;
  const due = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + revealDelay();
  const tick = () => {
    S.revealRaf = 0;
    if (!S.mounted || S.pendingFace !== n) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now >= due) { paintDiceFace(n); return; }
    S.revealRaf = requestAnimationFrame(tick);
  };
  S.revealRaf = requestAnimationFrame(tick);
  S.revealTimer = setTimeout(() => {
    S.revealTimer = 0;
    if (S.pendingFace === n && !document.hidden) paintDiceFace(n);
  }, revealDelay() + 600);
  watchForSkip();
}

/** The paint itself. Nothing else in this file writes the glyph. */
function paintDiceFace(n) {
  cancelDiceReveal();
  if (!S.mounted) return;
  const changed = n !== S.face;
  S.face = n;
  $.die.innerHTML = dieFace(n);
  $.die.hidden = (n === 0);
  $.die.classList.toggle('is-six', n === 6);
  syncRollAria();
  if (changed && n && !prefersReducedMotion()) {
    $.die.classList.remove('is-pop');
    void $.die.offsetWidth;
    $.die.classList.add('is-pop');
  }
}

/** v of 1..6 shows that face — but only once the 3D die has settled on it.
 *  Anything else HIDES the glyph immediately, so the plaque reads simply
 *  "Roll" — never "Roll —", and never a stale number from the previous
 *  player. */
export function setDiceFace(v) {
  if (!S.mounted) return;
  const n = PIPS[v] ? Number(v) : 0;

  /* Clearing is never delayed: a stale number is a lie, and hiding it spoils
     nothing. This also cancels a reveal that a turn change has outrun. */
  if (!n) { paintDiceFace(0); return; }
  if (n === S.pendingFace) return;               // same roll, armed already

  /* No tumble to wait for -> no wait. */
  if (prefersReducedMotion() || !dieIsOnScreen()) { paintDiceFace(n); return; }

  /* Blank FIRST, unconditionally. A six grants an extra turn, so the same
     player rolls again with the plaque still showing their last six — leaving
     it up would spoil the new roll by looking identical to its answer. */
  paintDiceFace(0);
  armDiceReveal(n);
}

/** What is PAINTED, which is what a player can actually read. */
export function getDiceFace() { return S.face; }

/** The armed-but-unrevealed result, for probes that need to prove the HUD is
 *  holding it rather than dropping it. */
export function getPendingDiceFace() { return S.pendingFace; }

function syncRollAria() {
  if (!S.mounted) return;
  /* Never announce "Tap to roll" on a button that cannot be rolled. */
  const label = S.rollEnabled
    ? (S.face
        ? `${t('turn.rollAria')}. ${t('hud.diceAria', { n: S.face })}`
        : t('hud.diceReadyAria'))
    : autoHint();
  $.roll.setAttribute('aria-label', label);
  $.roll.setAttribute('aria-disabled', S.rollEnabled ? 'false' : 'true');
}

function doRoll(source) {
  if (!S.rollEnabled) return;
  /* Input locks on the frame of the press so a double-tap can never
     double-roll — the same guarantee dice3d gives the 3D die. */
  setRollEnabled(false);
  /* The last number is spent the instant a new one is asked for. Without this
     the previous result sat under the thumb for the whole tumble, and after an
     extra-turn six it sat there looking exactly like an answer. */
  paintDiceFace(0);
  if (source !== 'key') haptic();
  call('onRoll', { source });
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. THE LOG
   ═══════════════════════════════════════════════════════════════════════════ */

/** 'html' is trusted markup from game.js — "Riya climbed the SIP ladder
 *  <span class="n">12 → 30</span>". Newest first, last five kept. */
export function log(html) {
  if (!S.mounted || html == null) return;
  const str = String(html).trim();
  if (!str) return;

  S.logs.unshift(str);
  if (S.logs.length > 5) S.logs.length = 5;

  const line = document.createElement('div');
  line.className = 'snl-ui__line is-new';
  line.innerHTML = str;
  $.lines.insertBefore(line, $.lines.firstChild);
  while ($.lines.children.length > 5) $.lines.removeChild($.lines.lastChild);
  $.lines.scrollTop = 0;
  $.log.hidden = false;
  syncLogOverflow();
  publishTrayHeight();
  announce(line.textContent);
}

/** A soft bottom edge ONLY while there is genuinely more below — otherwise the
 *  fade would sit on a fully visible last line and read as a clipped one. */
function syncLogOverflow() {
  if (!S.mounted || !$.lines) return;
  const more = $.lines.scrollHeight - $.lines.clientHeight > 1;
  $.lines.classList.toggle('is-more', more);
}

export function clearLog() {
  if (!S.mounted) return;
  S.logs = [];
  $.lines.innerHTML = '';
  $.lines.classList.remove('is-more');
  $.log.hidden = true;
  publishTrayHeight();
}

export function setLogOpen(b) {
  if (!S.mounted) return;
  S.logOpen = !!b;
  $.log.classList.toggle('is-open', S.logOpen);
  $.logtog.setAttribute('aria-expanded', S.logOpen ? 'true' : 'false');
  syncLogOverflow();
  publishTrayHeight();
  /* the max-height transition is 220ms — re-measure once it has landed */
  setTimeout(() => { syncLogOverflow(); publishTrayHeight(); }, 260);
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. TOAST
   ═══════════════════════════════════════════════════════════════════════════ */

/** A transient line above the tray. Non-modal, never blocks a tap. */
export function toast(text, ms = timing.toast) {
  if (!S.mounted || !text) return;
  clearTimeout(S.toastTimer);
  $.toast.textContent = String(text);
  $.toast.classList.add('is-on');
  announce(text);
  S.toastTimer = setTimeout(() => {
    $.toast.classList.remove('is-on');
  }, clamp(Number(ms) || timing.toast, 600, 12000));
}

export function hideToast() {
  if (!S.mounted) return;
  clearTimeout(S.toastTimer);
  $.toast.classList.remove('is-on');
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. SOUND / LANGUAGE / HELP / RESTART
   ═══════════════════════════════════════════════════════════════════════════ */

/** audio.js is the source of truth; game.js pushes its state here. */
export function setMuted(b) {
  if (!S.mounted) return;
  S.muted = !!b;
  paintChrome();
}
export function isMutedUI() { return S.muted; }

function toggleMute() {
  const next = !S.muted;
  const applied = call('onMute', next);
  S.muted = typeof applied === 'boolean' ? applied : next;
  paintChrome();
  announce(S.muted ? t('hud.soundIsOff') : t('hud.soundIsOn'));
}

function toggleLang() {
  const to = otherLang();
  if (typeof S.hooks.onLangToggle === 'function') call('onLangToggle', to);
  else setLang(to);
  /* onLangChange repaints everything; this only covers a hook that no-ops */
  paintChrome();
  announce(t('a11y.langChanged', { lang: LANG_NAMES[getLang()] }));
}

/* The restart confirm is an inline bar, not a modal and not a scrim — §14 #14
   forbids a modal during play, and the brief requires a confirm here. */
function paintConfirm() {
  $.confirm.innerHTML = `
    <span class="snl-ui__ctext">${esc(t('settings.newGame'))}?</span>
    <button type="button" class="snl-ui__cbtn" data-act="cancel">${esc(t('common.cancel'))}</button>
    <button type="button" class="snl-ui__cbtn is-go" data-act="restart-go">${esc(t('common.yes'))}</button>`;
}

function openConfirm() {
  if (S.confirmOpen) return closeConfirm();
  S.confirmOpen = true;
  paintConfirm();
  $.confirm.classList.add('is-open');
  publishTrayHeight();
  announce(t('settings.newGame'));
  const go = $.confirm.querySelector('[data-act="cancel"]');
  try { go?.focus({ preventScroll: true }); } catch { /* older browsers */ }
}

function closeConfirm(refocus = true) {
  if (!S.confirmOpen) return;
  S.confirmOpen = false;
  $.confirm.classList.remove('is-open');
  $.confirm.innerHTML = '';
  publishTrayHeight();
  if (refocus) { try { $.restart.focus({ preventScroll: true }); } catch { /* fine */ } }
}

/* ═══════════════════════════════════════════════════════════════════════════
   13. INPUT
   ═══════════════════════════════════════════════════════════════════════════ */

function onClick(e) {
  const btn = e.target.closest ? e.target.closest('button') : null;
  if (!btn || !S.root.contains(btn)) return;

  if (btn === $.roll) { doRoll('button'); return; }
  if (btn === $.logtog) { setLogOpen(!S.logOpen); return; }

  switch (btn.dataset.act) {
    case 'lang':       toggleLang(); break;
    case 'mute':       toggleMute(); break;
    case 'help':       call('onHelp'); break;
    case 'restart':    openConfirm(); break;
    case 'cancel':     closeConfirm(); break;
    case 'restart-go':
      closeConfirm(false);
      if (typeof S.hooks.onRestart === 'function') call('onRestart');
      else call('onMenu', 'restart');
      break;
    default: break;
  }
}

/* Space / Enter rolls — but only when the focus is not already on a control,
   so the ROLL button, the chips and dice3d's own keyboard proxy keep their
   native activation and nothing ever fires twice. */
function onKey(e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const a = document.activeElement;
  const inControl = a && a !== document.body &&
    (a.tagName === 'BUTTON' || a.tagName === 'A' || a.tagName === 'INPUT' ||
     a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || a.isContentEditable);

  if (e.key === 'Escape' && S.confirmOpen) { e.preventDefault(); closeConfirm(); return; }
  if (inControl) return;
  if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
    if (!S.rollEnabled) return;
    e.preventDefault();
    doRoll('key');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   14. Convenience for game.js — one call that lands a whole resolved turn.
       Optional; every piece of it is also exported on its own.
   ═══════════════════════════════════════════════════════════════════════════ */

export function update({ players, active, hint, roll, face, line } = {}) {
  if (Array.isArray(players)) setPlayers(players);
  if (active !== undefined) setTurn(active, hint);
  else if (hint !== undefined) setHint(hint);
  if (face !== undefined) setDiceFace(face);
  if (roll !== undefined) setRollEnabled(roll);
  if (line) log(line);
}

/** Exposed for the probe so a screenshot run can read the HUD without the DOM. */
export function snapshotUI() {
  return {
    mounted: S.mounted,
    active: S.activeId,
    who: S.mounted ? $.who.textContent : '',
    hint: S.mounted ? $.hint.textContent : '',
    rollEnabled: S.rollEnabled,
    face: S.face,
    facePending: S.pendingFace,
    muted: S.muted,
    over: S.over,
    winner: S.winnerId,
    awaiting: S.awaiting,
    lang: getLang(),
    logOpen: S.logOpen,
    log: S.logs.slice(),
    players: S.players.map(p => ({ id: p.id, name: p.name, pos: p.pos, shield: p.shield })),
  };
}
