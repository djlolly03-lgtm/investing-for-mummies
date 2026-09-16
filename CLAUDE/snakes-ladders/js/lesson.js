/* lesson.js — the teaching moment. DESIGN.md §5, implemented literally.
 *
 *   STATE 1  the ribbon   every square, all 100. 88dp cream band above the dice
 *                         tray. In at travel×0.6, edge-pulse on landing, out at
 *                         land+1800. Any tap kills it in 120ms. It never costs a tap.
 *   STATE 2  the card     38 squares. The ribbon GROWS upward to <=45% (52% snakes).
 *                         Never a modal. Element order per §5.3 IS the pedagogy.
 *                         The primary button IS the pass-the-phone button.
 *
 * Mounts into #snl-overlay. All CSS injected here, namespaced .snl-lesson.
 * Nothing in this file is a toll gate: every state is dismissible from ms zero.
 */

import {
  injectCss, prefersReducedMotion, rupees, lakhCrore, indianFormat,
  clamp, ease, emitter, esc,
} from './util.js';
import { timing, layout, type, css as C, game as GAME, DEBUG } from './config.js';
import { t, onLangChange } from './i18n.js';
import { glossaryTerm, GLOSSARY } from './content.js';
import { sfx, duckFor } from './audio.js';

/* ═══════════════════════════════════════════════════════════════════════
   0. Semantics — DESIGN §5.2. One colour per meaning, and only this.
   ═══════════════════════════════════════════════════════════════════════ */

const EDGE = {
  ladder:    C.teal,   // teal
  snake:     C.clay,   // warm clay — snakes only, deliberately not alarm red
  milestone: C.gold,   // gold
  finish:    C.gold,
  event:     C.muted,  // muted grey
  quiz:      C.gold,
  lesson:    C.navy,
  square:    C.navy,
  plain:     C.navy,   // navy
};

/** Kinds that grow into a card (§5.3: 22 lesson · 5 quiz · 6 event · 4 milestone · 1 finish). */
const CARD_KINDS = new Set(['ladder', 'snake', 'lesson', 'milestone', 'event', 'finish', 'quiz']);

/** Header line per variant (§5.5). Warm, never accusing. All from i18n. */
const HEADER_KEY = {
  snake:     'snake.header',      // "This happens to a lot of people."
  ladder:    'ladder.header',     // "Well done."
  event:     'event.header',      // "NOT YOUR FAULT"
  milestone: 'milestone.header',  // "Look back a minute"
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Module state
   ═══════════════════════════════════════════════════════════════════════ */

/** Fires 'ribbon' · 'landed' · 'card' · 'close'. game.js re-arms the dice on 'landed'. */
export const lessonEvents = emitter();

let root = null, sheet = null, edge = null, body = null, foot = null;
let elTitle, elHeader, elWhat, elNumWrap, elNumber, elNumLabel, elBullets,
    elName, elWay, elWayText, elParty, elHeritage, elDeepBtn, elDeep, elDeepText,
    elChips, elChipDefn, elBtn, elQuiz, elQuizChips, elQuizNote, elDim;

let open = false;            // ribbon or card is on screen
let cardOpen = false;        // state 2 specifically
let mode = { workshop: false, solo: false, autoAdvance: true };
let live = null;             // the current session: { payload, resolve, timers… }
let countCancel = null;
let prevFocus = null;
let lastCardClosedAt = -1e9; // "never two cards in a row" guard
let userScrolled = false;    // she took the card over; stop moving it under her
let ribbonLine = '', cardLine = '';
let lastCardTurnId = null;
/* The last non-empty handoff label game.js gave us. In pass-and-play the card IS
   the pass-the-phone button (§5.3); a dropped handoffLabel must not fall all the
   way back to an English "NEXT" mid-game. */
let lastHandoff = null;

/** Per-session memory. §5.4 #5 repeat visits show the ribbon only; §5.3 heritage once ever. */
const seenCards = new Set();
const seenHeritage = new Set();

/* The heritage line's key while the fit is still deciding whether it fits. It is
   "once ever", so the token is only spent once the line is genuinely ON SCREEN —
   spending it on a line rendered below the card's own ceiling would burn the one
   showing it ever gets. */
let heritagePending = null;

/* §5.3 caps the CARD at 45% of screen height — there is no word cap in the spec.
   This is the reading-time budget the fit loop implies: at ~200 wpm, 45 words is
   13s, and the card auto-advances at 4500ms in home mode (§5.4 #3). It is a
   development signal for content.js, never a truncation: §13 forbids cutting
   teaching, so an over-budget card costs type size, not words. */
const WORD_BUDGET = 45;

/* How much of the deep dive the "Aur padho" tap is allowed to pull over the fold.
   Its top padding is 13px and its type is 16px on 1.55, so this is the block's
   own edge plus about two and a half lines: unmistakably "the new text starts
   here", and small enough that the arithmetic and the mint escape band above it
   keep their place. Everything past it is a scroll she asks for. */
const DEEP_PEEK = 78;

/* ═══════════════════════════════════════════════════════════════════════
   2. CSS — one stylesheet, owned by this module alone.
   ═══════════════════════════════════════════════════════════════════════ */

const S = type.size;
const px = (n) => `calc(${n}px * var(--ts))`;

injectCss('lesson', `
/* The wrapper is full-bleed and MUST stay pointer-transparent, or it would eat
   the dice tap. #snl-overlay>* is an id-specificity rule, so we beat it here. */
#snl-overlay > .snl-lesson,
.snl-lesson{
  position:fixed; inset:0; z-index:1;
  pointer-events:none;
  --ts:var(--snl-text-scale,1);
  --eo:cubic-bezier(.33,1,.68,1);          /* ease-out cubic — §9 #20/#23 */
  --eio:cubic-bezier(.65,0,.35,1);
  --edge:var(--navy);
  /* the ribbon rides ABOVE the dice tray so the dice is never covered (§5.2).
     ui.js may publish the real tray height as --snl-tray-h on :root. */
  --lift:var(--snl-tray-h, max(96px, 26dvh));
  --maxh:${layout.cardMaxPct * 100}dvh;
  font-family:var(--ui);
}
.snl-lesson[data-kind="snake"]{ --maxh:${layout.cardSnakePct * 100}dvh; }

/* ── the sheet: ribbon and card are ONE object that grows ─────────────── */
.snl-lesson__sheet{
  position:absolute; left:0; right:0;
  bottom:var(--lift);
  height:${layout.ribbonH}px;
  display:flex; flex-direction:column;
  background:var(--cream);
  border-radius:18px 18px 0 0;
  box-shadow:0 -6px 26px rgba(26,58,92,.13), 0 -1px 0 rgba(26,58,92,.05);
  overflow:hidden;
  transform:translateY(calc(100% + var(--lift)));
  will-change:transform,height;
  transition:
    transform ${timing.lessonIn}ms var(--eo),
    height ${timing.cardGrow}ms var(--eo),
    bottom ${timing.cardGrow}ms var(--eo),
    opacity ${timing.lessonIn}ms var(--eo);
}
.snl-lesson.is-open .snl-lesson__sheet{ transform:translateY(0); }
.snl-lesson.is-card .snl-lesson__sheet{ bottom:0; pointer-events:auto; }
.snl-lesson.is-out  .snl-lesson__sheet{ transition-duration:${timing.ribbonOut}ms; }
.snl-lesson.is-kill .snl-lesson__sheet{ transition-duration:${timing.ribbonKill}ms; }

/* the 3dp semantic edge — teal ladder · clay snake · gold milestone ·
   muted event · navy plain. Pulses once on the landing frame (§9 #21). */
.snl-lesson__edge{
  position:absolute; left:0; top:0; bottom:0; width:${layout.ribbonEdge}px;
  background:var(--edge); transform-origin:left center;
}
.snl-lesson__edge.is-pulse{ animation:snl-lesson-pulse ${timing.ribbonPulse}ms var(--eo) 1; }
@keyframes snl-lesson-pulse{
  0%{transform:scaleX(1)} 45%{transform:scaleX(3.2)} 100%{transform:scaleX(1)}
}

/* the Jhatka dim — §9 #29, 15%, and pointer-transparent so it never steals a tap */
.snl-lesson__dim{
  position:absolute; inset:0; background:#1a3a5c; opacity:0;
  pointer-events:none;
  transition:opacity ${timing.eventCardIn}ms var(--eo);
}
.snl-lesson.is-card[data-kind="event"] .snl-lesson__dim{ opacity:${layout.boardDimOnEvent}; }

/* The hidden ATTRIBUTE must win over our own display rules — a flex or grid
   display on an element the UA sheet is trying to hide silently un-hides it,
   and a stale mint band would then inflate the ribbon and every grow(). */
.snl-lesson [hidden]{ display:none !important; }

/* ── the scrolling body ───────────────────────────────────────────────── */
.snl-lesson__body{
  flex:1 1 auto; min-height:0;
  overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;
  padding:5px 16px 5px ${layout.ribbonEdge + 15}px;
  scrollbar-width:thin; scrollbar-color:var(--mint) transparent;
}
.snl-lesson__body::-webkit-scrollbar{ width:4px; }
.snl-lesson__body::-webkit-scrollbar-thumb{ background:var(--mint); border-radius:4px; }
.snl-lesson__body::-webkit-scrollbar-track{ background:transparent; }
.snl-lesson.is-card .snl-lesson__body{ padding:13px 20px 2px ${layout.ribbonEdge + 19}px; }
/* Safety net under the fit loop: whatever the scale floor cannot shrink away
   reads as a deliberate "there is more" fade, never as a guillotine through a
   glyph. BOTH edges carry one, because the deep dive can put content above the
   fold as well as below it: the bottom fade lifts at the end of the scroll
   ('is-atEnd' is also true whenever there is nothing to scroll at all), and the
   top fade appears only once the body has actually been scrolled. */
.snl-lesson.is-card .snl-lesson__body{
  --fade-t:0px; --fade-b:20px;
  -webkit-mask-image:linear-gradient(to bottom,
      transparent 0, #000 var(--fade-t),
      #000 calc(100% - var(--fade-b)), transparent 100%);
          mask-image:linear-gradient(to bottom,
      transparent 0, #000 var(--fade-t),
      #000 calc(100% - var(--fade-b)), transparent 100%);
}
.snl-lesson.is-card.is-atEnd .snl-lesson__body{ --fade-b:0px; }
/* The top fade is for the cards that have no pinned title to hide the cut under:
   the quiz (its title slot is the question's) and any card that arrives without
   one. Everywhere else the sticky title is the top edge, and fading it would be
   a bug, not a cue. Two rules, not one list — an unsupported :has() must not
   take the quiz rule down with it. */
.snl-lesson.is-card.is-scrolled[data-kind="quiz"] .snl-lesson__body{ --fade-t:18px; }
.snl-lesson.is-card.is-scrolled .snl-lesson__body:has(> .snl-lesson__title:empty){ --fade-t:18px; }

/* every staggered element: in place, never a slide-in queue (§5.3) */
.snl-lesson__stage{
  opacity:0; transform:translateY(6px);
  transition:opacity 240ms var(--eo), transform 240ms var(--eo);
}
.snl-lesson__stage.is-in{ opacity:1; transform:none; }
.snl-lesson.is-rm .snl-lesson__stage{ transform:none; }
.snl-lesson.is-card[data-kind="event"] .snl-lesson__stage{ transform:translateX(-22px); }
.snl-lesson.is-card[data-kind="event"] .snl-lesson__stage.is-in{ transform:none; }

/* ── ribbon type ──────────────────────────────────────────────────────── */
.snl-lesson__title{
  font-family:var(--display); font-style:italic; font-weight:600;
  font-size:${px(S.ribbonTitle)}; line-height:${type.lineHeight.tight};
  color:var(--navy);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.snl-lesson__what{
  font-weight:${type.weights.lesson};
  font-size:${px(S.ribbonLine)}; line-height:1.3; color:var(--navy);
  margin-top:2px;
  display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2;
  overflow:hidden;
  transition:font-size ${timing.cardGrow}ms var(--eo);
}
.snl-lesson.is-card .snl-lesson__what{
  font-size:${px(S.cardWhat)}; line-height:1.36;
  -webkit-line-clamp:4; margin-top:5px;
}
.snl-lesson__header{
  font-weight:800; font-size:${px(16)}; line-height:1.3;
  color:var(--edge); letter-spacing:.005em;
  margin-top:6px;
}
.snl-lesson[data-kind="event"] .snl-lesson__header{
  letter-spacing:.12em; text-transform:uppercase; font-size:${px(16)};
}

/* ── the number: gold, Lora, alone, counting up from zero (§5.3 +180ms) ── */
.snl-lesson__numwrap{ margin-top:9px; }
.snl-lesson__number{
  font-family:var(--display); font-style:italic; font-weight:600;
  font-size:${px(S.cardNumber)}; line-height:1.06; color:var(--gold);
  font-variant-numeric:tabular-nums; font-feature-settings:'tnum' 1;
}
.snl-lesson__numlabel{
  margin-top:2px; font-weight:600; font-size:${px(S.minimum)};
  line-height:1.35; color:var(--muted);
}

/* ── milestone bullets — three flat lines, no new information (§5.5) ──── */
.snl-lesson__bullets{ margin-top:10px; display:flex; flex-direction:column; gap:8px; }
.snl-lesson__bullets li{
  position:relative; padding-left:18px;
  font-weight:600; font-size:${px(S.minimum)}; line-height:1.4; color:var(--navy);
}
.snl-lesson__bullets li::before{
  content:''; position:absolute; left:0; top:.55em;
  width:8px; height:8px; border-radius:2px; background:var(--gold);
}

/* ── the name: small, bold teal, ABOVE the line (§5.3 +600ms) ─────────── */
.snl-lesson__name{
  margin-top:11px;
  font-weight:800; font-size:${px(S.cardName)}; line-height:1.3;
  letter-spacing:.055em; text-transform:uppercase; color:var(--teal-d);
}

/* ── the way out: mint band, key glyph, always an action (§5.3 +800ms) ── */
.snl-lesson__way{
  margin-top:5px; display:flex; gap:10px; align-items:flex-start;
  background:var(--mint); border-radius:12px;
  padding:10px 12px;
}
.snl-lesson__way svg{ flex:0 0 auto; margin-top:1px; }
.snl-lesson__wayText{
  font-weight:${type.weights.lesson}; font-size:${px(S.cardWayOut)};
  line-height:1.4; color:var(--navy);
}

/* ── the counterparty: one quiet line. The ethics of the game. (+1000ms) ─ */
.snl-lesson__party{
  margin-top:9px; font-weight:400; font-size:${px(S.counterparty)};
  line-height:1.45; color:var(--muted);
}
.snl-lesson__party b{ font-weight:700; color:var(--muted); }
.snl-lesson__heritage{
  margin-top:9px; font-family:var(--display); font-style:italic; font-weight:600;
  font-size:${px(S.heritage)}; line-height:1.5; color:var(--muted);
}

/* ── "Aur padho" — opt-in, one tap, expands IN PLACE (§5.3) ───────────── */
.snl-lesson__more{
  position:absolute; top:0; right:0;
  min-height:${layout.touchMin}px; min-width:${layout.touchMin}px;
  display:none; align-items:center; gap:5px;
  padding:0 16px 0 40px;
  /* it floats over a scrolling body, so it carries its own cream backdrop */
  background:linear-gradient(to left, var(--cream) 0, var(--cream) 93%, rgba(247,250,249,0) 100%);
  border:0; cursor:pointer;
  font-family:var(--ui); font-weight:800; font-size:${px(S.minimum)};
  color:var(--teal-d);
}
.snl-lesson.is-card .snl-lesson__more{ display:inline-flex; }
/* The card's subject STAYS. Once the deep dive is open the body scrolls under a
   pinned title, so the reader never loses what she is reading about — and the
   line arriving beneath it is veiled by a cream haze rather than sliced. The
   -13px cream cap paints over the body's own top padding, so nothing ever
   passes above the title. */
.snl-lesson.is-card .snl-lesson__title{
  position:sticky; top:0; z-index:1;
  padding-right:106px; padding-bottom:1px;
  background:var(--cream);
  box-shadow:0 -13px 0 var(--cream);
}
/* A single blurred shadow was too short and too weak: the line arriving under the
   title still read as a horizontal cut through the caps (ENDOWMENT / MONEY-BACK,
   sliced at its own mid-height). The title carries overflow:hidden for its
   ellipsis, so a pseudo-element under it would be clipped away — but an
   element's OWN box-shadow is never clipped by its overflow. So the dissolve is
   built out of stacked cream shadows: 4px solid, then two overlapping blurs that
   carry it to zero about 15px down. Anything passing beneath the title now fades
   out; nothing is ever guillotined mid-glyph. */
.snl-lesson.is-card.is-scrolled .snl-lesson__title{
  box-shadow:
    0 -13px 0 var(--cream),
    0 4px 0 var(--cream),
    0 10px 8px -3px var(--cream),
    0 16px 13px -8px var(--cream);
}
/* The chevron floats over a SCROLLING body, and it is BOTH the invitation in and
   the only way back out of the deep dive, so it never leaves. It used to hide
   itself on scroll because the line arriving under it was unreadable; the pinned
   title above is now what it sits on. On the quiz card, which has no title, the
   cream chip is what keeps it legible. z-index beats the sticky title's. */
.snl-lesson__more{ z-index:2; }
.snl-lesson.is-scrolled .snl-lesson__more{
  background:var(--cream); border-radius:0 0 0 16px;
  box-shadow:0 5px 12px -7px rgba(26,58,92,.5);
}
/* first line only, so the paragraph is not 106px narrower all the way down */
.snl-lesson.is-card .snl-lesson__what::before{
  content:''; float:right; width:104px; height:1.1em;
}
.snl-lesson__more svg{ transition:transform 200ms var(--eo); }
.snl-lesson__more[aria-expanded="true"] svg{ transform:rotate(180deg); }
.snl-lesson__deep{ margin-top:14px; }
.snl-lesson__deepText{
  font-weight:600; font-size:${px(S.minimum)}; line-height:1.55; color:var(--navy);
  padding:13px 15px; background:var(--mint-lt); border-radius:12px;
}
.snl-lesson__chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.snl-lesson__chip{
  min-height:${layout.touchMin}px; padding:8px 15px;
  border:2px solid var(--mint); border-radius:${layout.touchMin}px;
  background:var(--white); cursor:pointer;
  font-family:var(--ui); font-weight:800; font-size:${px(S.minimum)};
  color:var(--teal-d);
}
.snl-lesson__chip[aria-pressed="true"]{ background:var(--mint); border-color:var(--teal); }
.snl-lesson__defn{
  margin-top:9px; font-weight:600; font-size:${px(S.minimum)};
  line-height:1.5; color:var(--navy);
}
.snl-lesson__defn em{ font-style:normal; color:var(--teal-d); font-weight:800; }

/* ── Sabka Sawaal — two chunky chips, neither wrong, no score ─────────── */
.snl-lesson__quiz{ margin-top:14px; }
/* Side by side, not stacked: two 72dp chips (§5.5) both fully on screen inside
   the 45% ceiling, and both inside the thumb's arc. They stretch to match. */
.snl-lesson__qchips{ display:flex; gap:10px; align-items:stretch; }
.snl-lesson__qchip{
  min-height:${layout.quizChipH}px; flex:1 1 0; min-width:0;
  display:flex; align-items:center; justify-content:center; text-align:center;
  padding:10px 12px;
  background:var(--white); border:2px solid var(--mint); border-radius:14px;
  box-shadow:0 3px 0 var(--mint); cursor:pointer;
  font-family:var(--ui); font-weight:800; font-size:${px(S.quizChip)};
  line-height:1.3; color:var(--navy);
  transition:transform ${timing.quizChipPress}ms var(--eo), box-shadow ${timing.quizChipPress}ms var(--eo);
}
.snl-lesson__qchip:active{ transform:translateY(3px); box-shadow:0 0 0 var(--mint); }
.snl-lesson__qchip.is-picked{ border-color:var(--teal); background:var(--mint-lt); }
.snl-lesson__qnote{
  margin:0 0 11px; font-weight:400; font-size:${px(S.counterparty)};
  line-height:1.45; color:var(--muted);
}
.snl-lesson__qnote:empty{ display:none; }

/* ── the button. It IS the pass-the-phone button (§5.3 +1200ms) ───────── */
.snl-lesson__foot{
  /* Solid, never a gradient: a transparent top edge is what let a clipped glyph
     show THROUGH the foot instead of being hidden by it. */
  flex:0 0 auto; padding:12px 20px calc(15px + var(--sab)) 20px;
  background:var(--cream);
}
.snl-lesson__btn{
  width:100%; min-height:${layout.primaryBtnH}px;
  display:flex; align-items:center; justify-content:center; gap:6px;
  border:0; border-radius:14px; cursor:pointer;
  background:var(--teal); color:var(--white);
  box-shadow:inset 0 -${layout.primaryBtnEdge}px 0 var(--teal-d);
  font-family:var(--ui); font-weight:800; font-size:${px(S.button)};
  letter-spacing:.045em; text-transform:uppercase;
  transition:transform 70ms var(--eo), box-shadow 70ms var(--eo), opacity 240ms var(--eo);
}
.snl-lesson__btn:active{
  transform:translateY(${layout.primaryBtnEdge}px);
  box-shadow:inset 0 0 0 var(--teal-d);
}
.snl-lesson__foot[hidden]{ display:none; }

/* The fit measurement (grow()) reads the sheet's natural height with height:auto.
   Both of these animate a LAYOUT property, so while they are mid-flight every
   measurement reads the old size and the fit loop drives the type straight to its
   floor on every card. Frozen for the few synchronous reads, restored before the
   real height is written, so the 300ms growth itself still animates. */
.snl-lesson.is-fitting .snl-lesson__sheet,
.snl-lesson.is-fitting .snl-lesson__what{ transition:none !important; }
/* A staged element sitting at translateY(6px) extends the body's scrollable
   overflow by 6px while it arrives, which the fit would otherwise read as real
   content. Settle it for the measurement only. */
.snl-lesson.is-fitting .snl-lesson__stage{ transform:none !important; }

/* reduced motion: fade, no slide. The TEACHING timings are untouched (§9). */
.snl-lesson.is-rm .snl-lesson__sheet{
  transform:none; opacity:0;
  transition:opacity ${timing.lessonIn}ms var(--eo),
             height ${timing.cardGrow}ms var(--eo),
             bottom ${timing.cardGrow}ms var(--eo);
}
.snl-lesson.is-rm.is-open .snl-lesson__sheet{ opacity:1; }
.snl-lesson.is-rm .snl-lesson__edge.is-pulse{ animation:none; }

`);

/* ═══════════════════════════════════════════════════════════════════════
   3. Mount — built once, reused every turn. No per-turn DOM churn.
   ═══════════════════════════════════════════════════════════════════════ */

const KEY_SVG =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#1f7d72" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="8.5" cy="8.5" r="4.3"/><path d="M11.7 11.7 19 19"/>' +
  '<path d="M16.4 19.1 18.6 16.9"/><path d="M19 19l1.9 1.9"/></svg>';

const CHEV_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
  'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M6 9.5 12 15.5 18 9.5"/></svg>';

function mount() {
  if (root) return root;
  const host = document.getElementById('snl-overlay') || document.body;
  root = document.createElement('div');
  root.className = 'snl-lesson';
  root.setAttribute('data-kind', 'plain');
  root.innerHTML = `
    <div class="snl-lesson__dim" aria-hidden="true"></div>
    <div class="snl-lesson__sheet">
      <div class="snl-lesson__edge" aria-hidden="true"></div>
      <div class="snl-lesson__body">
        <div class="snl-lesson__title"></div>
        <div class="snl-lesson__header snl-lesson__stage" hidden></div>
        <div class="snl-lesson__what"></div>
        <div class="snl-lesson__numwrap snl-lesson__stage" hidden>
          <div class="snl-lesson__number"></div>
          <div class="snl-lesson__numlabel" hidden></div>
        </div>
        <ul class="snl-lesson__bullets snl-lesson__stage" hidden></ul>
        <div class="snl-lesson__quiz snl-lesson__stage" hidden>
          <div class="snl-lesson__qnote"></div>
          <div class="snl-lesson__qchips"></div>
        </div>
        <div class="snl-lesson__name snl-lesson__stage" hidden></div>
        <div class="snl-lesson__way snl-lesson__stage" hidden>
          ${KEY_SVG}<div class="snl-lesson__wayText"></div>
        </div>
        <div class="snl-lesson__party snl-lesson__stage" hidden></div>
        <div class="snl-lesson__heritage snl-lesson__stage" hidden></div>
        <div class="snl-lesson__deep" hidden>
          <div class="snl-lesson__deepText"></div>
          <div class="snl-lesson__chips"></div>
          <div class="snl-lesson__defn" hidden></div>
        </div>
      </div>
      <button class="snl-lesson__more" type="button" data-keep aria-expanded="false"></button>
      <div class="snl-lesson__foot" hidden>
        <button class="snl-lesson__btn snl-lesson__stage" type="button" data-keep></button>
      </div>
    </div>`;
  host.appendChild(root);

  const q = (s) => root.querySelector(s);
  elDim      = q('.snl-lesson__dim');
  sheet      = q('.snl-lesson__sheet');
  edge       = q('.snl-lesson__edge');
  body       = q('.snl-lesson__body');
  foot       = q('.snl-lesson__foot');
  elTitle    = q('.snl-lesson__title');
  elHeader   = q('.snl-lesson__header');
  elWhat     = q('.snl-lesson__what');
  elNumWrap  = q('.snl-lesson__numwrap');
  elNumber   = q('.snl-lesson__number');
  elNumLabel = q('.snl-lesson__numlabel');
  elBullets  = q('.snl-lesson__bullets');
  elQuiz     = q('.snl-lesson__quiz');
  elQuizChips= q('.snl-lesson__qchips');
  elQuizNote = q('.snl-lesson__qnote');
  elName     = q('.snl-lesson__name');
  elWay      = q('.snl-lesson__way');
  elWayText  = q('.snl-lesson__wayText');
  elParty    = q('.snl-lesson__party');
  elHeritage = q('.snl-lesson__heritage');
  elDeepBtn  = q('.snl-lesson__more');
  elDeep     = q('.snl-lesson__deep');
  elDeepText = q('.snl-lesson__deepText');
  elChips    = q('.snl-lesson__chips');
  elChipDefn = q('.snl-lesson__defn');
  elBtn      = q('.snl-lesson__btn');

  elBtn.addEventListener('click', () => { click(); close('button'); });
  const took = () => { userScrolled = true; if (scrollCancel) { scrollCancel(); scrollCancel = null; } };
  body.addEventListener('wheel', took, { passive: true });
  body.addEventListener('touchmove', took, { passive: true });
  body.addEventListener('scroll', () => {
    root.classList.toggle('is-scrolled', body.scrollTop > 6);
    updateEdgeFade();
  }, { passive: true });
  elDeepBtn.addEventListener('click', toggleDeep);

  onLangChange(() => { if (open && live) paintChrome(live.payload); });
  return root;
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Small helpers
   ═══════════════════════════════════════════════════════════════════════ */

const rm = () => prefersReducedMotion();
const click = () => { try { sfx.click(); } catch (_) {} };

/** Hard character cap with a word-boundary trim. Lint keeps content inside it;
    this is the belt so a long line can never break the 88dp band. */
function cap(str, n) {
  const s = String(str == null ? '' : str).trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

function show(el, html) {
  if (!el) return false;
  const has = html != null && String(html).trim() !== '';
  el.hidden = !has;
  if (has) el.innerHTML = html;
  return has;
}

/** Join parts into one spoken sentence without doubling up full stops. */
function sentence(parts) {
  return parts
    .map(x => String(x == null ? '' : x).trim().replace(/[.\u3002]+$/, ''))
    .filter(Boolean)
    .join('. ') + '.';
}

function announce(text) {
  const n = document.getElementById('snl-live');
  if (n && text) n.textContent = String(text);
}

/** A raf tween that IGNORES reduced motion — config.reduced.unchanged keeps the
    count-up identical in both modes, so the teaching is byte-identical (§9). */
function rafTween(ms, fn, easing = ease.out) {
  let cancelled = false, done = false, start = null;
  const step = (now) => {
    if (cancelled || done) return;
    if (start === null) start = now;
    const t = clamp((now - start) / ms, 0, 1);
    fn(t, easing(t));
    if (t >= 1) { done = true; return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // A backgrounded tab fires no rAF. The figure must still arrive, or the
  // teaching number sits on zero forever.
  const guardId = setTimeout(() => { if (!cancelled && !done) { done = true; fn(1, 1); } }, ms + 140);
  return () => { cancelled = true; clearTimeout(guardId); };
}

/** Money, always Indian-grouped. lakhCrore only above a crore, where digits stop reading. */
function fmtMoney(v, style) {
  if (style === 'plain') return indianFormat(v);
  if (style === 'lakh') return lakhCrore(v);
  return Math.abs(v) >= 1e7 ? lakhCrore(v) : rupees(v);
}

/** Pull the first rupee figure out of a line, so a quiz reveal can still count up. */
function firstRupee(str) {
  const m = /₹\s?([\d,]+(?:\.\d+)?)/.exec(String(str || ''));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function clearTimers() {
  if (!live) return;
  live.timers.forEach(clearTimeout);
  live.timers.length = 0;
}
function later(ms, fn) {
  if (!live) return;
  live.timers.push(setTimeout(fn, Math.max(0, ms)));
}
function stagger(el, ms) {
  if (!el || el.hidden) return;
  el.classList.remove('is-in');
  later(ms, () => el.classList.add('is-in'));
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Tap-anywhere dismissal — §5.4 #2, and the one that matters most:
      "There is no state in which the ribbon costs a player a tap."
      We listen on the window in CAPTURE and never preventDefault, so the same
      tap that kills the ribbon also rolls the dice.
      A tap is <8px of travel: a drag that scrolls the card must not dismiss it.
   ═══════════════════════════════════════════════════════════════════════ */

let downX = 0, downY = 0, downT = 0, downOk = false;

function onDown(e) {
  downOk = false;
  if (!open) return;
  const tgt = e.target;
  if (tgt && tgt.closest && tgt.closest('[data-keep]')) return;  // chrome handles itself
  downX = e.clientX || 0; downY = e.clientY || 0; downT = performance.now();
  downOk = true;
}
function onUp(e) {
  if (!downOk || !open) { downOk = false; return; }
  downOk = false;
  const dx = (e.clientX || 0) - downX, dy = (e.clientY || 0) - downY;
  if (dx * dx + dy * dy > 64) return;                 // a drag, not a tap
  if (performance.now() - downT > 700) return;        // a long press, not a tap
  const tgt = e.target;
  if (tgt && tgt.closest && tgt.closest('[data-keep]')) return;
  close('tap');
}
function onKey(e) {
  if (!open) return;
  if (e.key === 'Escape') { close('escape'); return; }
  // Space/Enter anywhere outside the chrome behaves like a tap, for keyboard players.
  if ((e.key === ' ' || e.key === 'Enter') && cardOpen) {
    const a = document.activeElement;
    if (a && a.closest && a.closest('[data-keep]')) return;
    close('tap');
  }
}
function onCancel() { downOk = false; }
function bindGlobal(on) {
  const m = on ? 'addEventListener' : 'removeEventListener';
  window[m]('pointerdown',   onDown,   { capture: true, passive: true });
  window[m]('pointerup',     onUp,     { capture: true, passive: true });
  window[m]('pointercancel', onCancel, { capture: true, passive: true });
  window[m]('keydown',       onKey,    true);
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Painting
   ═══════════════════════════════════════════════════════════════════════ */

function paintChrome(p) {
  elDeepBtn.innerHTML = `<span>${esc(t('lesson.readMore'))}</span>${CHEV_SVG}`;
  elDeepBtn.setAttribute('aria-label', t('lesson.readMore'));
  elBtn.textContent = buttonLabel(p);
  const hk = HEADER_KEY[p.kind];
  if (hk && !p.header) show(elHeader, esc(t(hk)));
}

function buttonLabel(p) {
  // §5.3 — in pass-and-play the card IS the pass-the-phone button.
  const l = p.handoffLabel && String(p.handoffLabel).trim();
  if (l) lastHandoff = l;
  return (l || (!mode.solo && lastHandoff) || t('lesson.next')) + ' ▸';
}

/** Everything except the growth. Called once per showLesson. */
function paint(p) {
  const kind = p.kind || 'plain';
  root.setAttribute('data-kind', kind);
  setTextScale(1);                       // every card starts at full size; grow() fits it
  root.classList.remove('is-atEnd');
  root.style.setProperty('--edge', p.color || EDGE[kind] || C.navy);
  root.classList.toggle('is-rm', rm());

  elTitle.style.display = '';
  elTitle.textContent = cap(p.title || '', type.caps.title);
  /* The ribbon clamps to two visual lines in CSS (§5.2); the card unclamps to the
     fuller sentence. Nothing is ever truncated in JS — a cut escape line or a cut
     'why' would destroy the teaching, and content lint already caps both. */
  ribbonLine = String(p.line || p.what || '').trim();
  cardLine   = String(p.what || p.line || '').trim();
  elWhat.textContent = ribbonLine;

  // header (variant), §5.5
  const hk = HEADER_KEY[kind];
  show(elHeader, p.header ? esc(p.header) : (hk ? esc(t(hk)) : null));

  // the number — one per card, never two
  const rawNum = p.number != null ? p.number : null;
  const numeric = typeof rawNum === 'number' && Number.isFinite(rawNum);
  if (rawNum != null) {
    elNumWrap.hidden = false;
    elNumber.textContent = numeric ? fmtMoney(0, p.numberFormat) : String(rawNum);
  } else {
    elNumWrap.hidden = true;
  }
  show(elNumLabel, p.numberLabel ? esc(p.numberLabel) : null);

  // milestone bullets — three flat lines, no new information
  const bl = Array.isArray(p.bullets) ? p.bullets.slice(0, 3) : null;
  if (bl && bl.length) {
    elBullets.hidden = false;
    elBullets.innerHTML = bl.map(b => `<li>${esc(b)}</li>`).join('');
  } else { elBullets.hidden = true; elBullets.innerHTML = ''; }

  show(elName, p.name ? esc(p.name) : null);
  const hasWay = !!(p.action && String(p.action).trim());
  elWay.hidden = !hasWay;
  if (hasWay) elWayText.textContent = String(p.action).trim();

  // the counterparty — every snake names who got paid. The ethics of the game.
  show(elParty, p.counterparty
    ? `<b>${esc(t('snake.counterparty'))}:</b> ${esc(p.counterparty)}`
    : null);

  /* heritage — once ever, per square, per session. The token is NOT spent here:
     grow() drops this line first if the card cannot hold everything, and a line
     that never appeared has not been read. */
  let her = null;
  heritagePending = null;
  if (p.heritage) {
    const hkey = 'h:' + (p.square != null ? p.square : p.title);
    if (!seenHeritage.has(hkey)) { her = esc(p.heritage); heritagePending = hkey; }
  }
  show(elHeritage, her);

  // deep dive — opt-in, invisible to everyone who does not want it
  elDeep.hidden = true;
  elDeepBtn.setAttribute('aria-expanded', 'false');
  elDeepBtn.style.display = p.deep ? '' : 'none';
  elDeepText.textContent = p.deep || '';
  elChipDefn.hidden = true;
  buildChips(p);

  elQuiz.hidden = true;
  elQuizNote.style.cssText = '';
  elQuizChips.innerHTML = '';
  paintChrome(p);
}

/** Glossary terms as tappable chips. The term the card names, plus any other
    glossary word that actually appears in the explainer. Max four. */
function buildChips(p) {
  elChips.innerHTML = '';
  if (!p.deep) return;
  const hay = (String(p.deep) + ' ' + String(p.line || '') + ' ' + String(p.name || '')).toLowerCase();
  const picked = [];
  const add = (g) => { if (g && !picked.some(x => x.term === g.term)) picked.push(g); };
  add(glossaryTerm(p.term));
  for (const g of GLOSSARY) {
    if (picked.length >= 4) break;
    const a = g.term.toLowerCase().split(' / ')[0];
    if (a.length >= 3 && hay.includes(a)) add(g);
  }
  for (const g of picked.slice(0, 4)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'snl-lesson__chip';
    b.setAttribute('data-keep', '');
    b.setAttribute('aria-pressed', 'false');
    b.textContent = g.hinglish || g.term;
    b.addEventListener('click', () => {
      click();
      const on = b.getAttribute('aria-pressed') === 'true';
      elChips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      if (on) { elChipDefn.hidden = true; return; }
      b.setAttribute('aria-pressed', 'true');
      elChipDefn.hidden = false;
      elChipDefn.innerHTML = `<em>${esc(g.term)}</em> — ${esc(g.plain)}`;
      announce(sentence([g.term, g.plain]));
      grow(true);
      userScrolled = false;
      revealInto(elChipDefn, 0.4);   // the definition, not the end of the card
    });
    elChips.appendChild(b);
  }
}

/** Where she was reading when she opened the deep dive, so closing it puts the
    card back exactly where she left it. */
let deepReturn = 0;

function toggleDeep() {
  click();
  const on = elDeepBtn.getAttribute('aria-expanded') === 'true';
  elDeepBtn.setAttribute('aria-expanded', on ? 'false' : 'true');
  elDeep.hidden = on;
  elDeepBtn.querySelector('span').textContent = t(on ? 'lesson.readMore' : 'lesson.readLess');
  if (!on) {
    // She opted in to read. Nothing may now close the card under her.
    if (live) { live.autoAdvance = false; clearAutoAdvance(); }
    announce(elDeepText.textContent);
    deepReturn = body.scrollTop;
  }
  grow(true);
  if (!on) {
    /* §5.3: the deep dive expands IN PLACE. This tap is not a request to be taken
       somewhere — the reader is mid-card, and the title, the arithmetic, the gold
       figure, the term chip and the mint escape band are what she is reading. So
       the card GROWS (that is the motion that says "it opened"), the chevron
       flips to "Close this", and we move the text by the smallest amount that
       brings the first couple of lines of the new block over the fold — and by
       nothing at all when the growth alone already showed them. Claiming half the
       viewport for the new block, as a general reveal does, threw everything
       above it off the top; that is what this peek exists to prevent. */
    userScrolled = false;
    revealInto(elDeep, 0, DEEP_PEEK);
  } else {
    // closing it hands her back the line she was on, never the top of nowhere
    const back = deepReturn;
    later(timing.cardGrow + 60, () => {
      if (!cardOpen || userScrolled) return;
      body.scrollTop = clamp(back, 0, Math.max(0, body.scrollHeight - body.clientHeight));
      updateEdgeFade();
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Growth — the ribbon becomes the card. Never a modal, never a scrim.
   ═══════════════════════════════════════════════════════════════════════ */

function maxCardPx() {
  const h = window.innerHeight || 800;
  const pct = (root.getAttribute('data-kind') === 'snake') ? layout.cardSnakePct : layout.cardMaxPct;
  return Math.round(h * pct);
}

/** The ribbon is 88dp by design (§5.2) and grows only when it has to — at 125%
    or 150% text it must not clip, and §13 says nothing may truncate. Capped at a
    third of the screen so it can never take the board over. */
function sizeRibbon() {
  /* The ribbon slides up at its final height — the height itself must never
     animate here, or replacing an open card would visibly deflate into it. */
  const prev = sheet.style.transition;
  sheet.style.transition = 'none';
  sheet.style.height = layout.ribbonH + 'px';
  void sheet.offsetHeight;
  const max = Math.round((window.innerHeight || 800) * 0.34);
  sheet.style.height = Math.round(clamp(body.scrollHeight, layout.ribbonH, max)) + 'px';
  void sheet.offsetHeight;
  sheet.style.transition = prev;
}

/** The whole card is typed in calc(Npx * var(--ts)), so one custom property
    scales it proportionally. We multiply rather than overwrite, or the fit loop
    would quietly throw away the player's own 125%/150% text-size choice. */
function setTextScale(s) {
  if (!root) return;
  if (s >= 0.999) root.style.removeProperty('--ts');
  else root.style.setProperty('--ts', `calc(var(--snl-text-scale, 1) * ${s})`);
}

/** Is the body scrolled to its end — or too short to scroll at all? That is when
    the 20px bottom fade must lift, because there is genuinely nothing below. */
function updateEdgeFade() {
  if (!root || !body) return;
  /* 8px of tolerance, not 1: the staged elements ride in from translateY(6px) and
     that transform counts towards scrollHeight the whole way. A 1px tolerance
     left the fade painted over the last line of every card that fits. */
  root.classList.toggle('is-atEnd',
    body.scrollTop + body.clientHeight >= body.scrollHeight - 8);
}

/** The last fit's arithmetic, published with the 'card' event. */
let lastFit = { words: 0, scale: 1, natural: 0, max: 0 };

/** What the sheet WOULD be tall if nothing capped it — measured off the box
    rather than inside it.
    The old fit loop compared body.scrollHeight with body.clientHeight, and
    clientHeight is the sheet's height, which is mid-transition on every single
    call: 88dp of ribbon still growing into a card. So the answer was always
    "overflowing", the loop always spent all five steps, and every card in the
    game rendered at the 0.82 floor — §5.3's 20sp voice arriving as 16sp and its
    16sp escape line as 13sp. Setting height:auto for the read is the honest
    measurement, and it costs one synchronous reflow per step. */
function naturalH() {
  const prevH = sheet.style.height;
  sheet.style.height = 'auto';
  const h = sheet.offsetHeight;
  sheet.style.height = prevH;
  return h;
}

/** Rough spoken-word count of everything the card is showing. Dev signal only. */
function cardWords() {
  const s = (body.innerText || body.textContent || '').trim();
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
}

/** Re-measure and re-clamp. 'keep' = we are already a card and only re-fitting.
    §5.3 caps the card at 45% (52% snakes) of the screen, and §13 forbids
    truncation. So the ceiling is paid for in this order:
      1. the heritage line — "once ever" colour, and the only element on the card
         that carries no teaching. Decoration goes before type does.
      2. the type, 4% at a time, floored at 0.82.
    Whatever a floored card still cannot hold stays scrollable under the 20px
    bottom fade, which reads as "there is more", never as a guillotine. */
function grow(keep = false) {
  if (!cardOpen && keep) return;
  const max = maxCardPx();

  /* Freeze the two layout transitions for the duration of the measurement, or
     every read below lands on a size that is still on its way somewhere. */
  root.classList.add('is-fitting');
  if (heritagePending) elHeritage.hidden = false;   // reconsider it from scratch
  setTextScale(1);
  let nat = naturalH();

  if (nat > max && heritagePending) {
    elHeritage.hidden = true;
    nat = naturalH();
  }

  // 5 steps of 4%, floored at 0.82 — 0.82 of a 16sp escape line is still 13sp.
  let scale = 1;
  for (let i = 0; i < 5 && nat > max && scale > 0.82; i++) {
    scale = Math.max(0.82, Math.round((scale - 0.04) * 100) / 100);
    setTextScale(scale);
    nat = naturalH();
  }

  const words = DEBUG ? cardWords() : 0;
  root.classList.remove('is-fitting');
  void sheet.offsetHeight;                          // so the height below animates
  sheet.style.height = Math.round(clamp(nat, layout.ribbonH, max)) + 'px';

  // the line has been read only if it survived the fit
  if (heritagePending && !elHeritage.hidden) { seenHeritage.add(heritagePending); heritagePending = null; }

  if (DEBUG && words > WORD_BUDGET) {
    console.warn(`[lesson] card over the ${WORD_BUDGET}-word reading budget: ${words} words` +
      (live && live.payload.square != null ? ` on square ${live.payload.square}` : '') +
      ` — it now costs ${Math.round(scale * 100)}% type to fit §5.3's ceiling.`);
  }
  lastFit = { words, scale, natural: nat, max };
  /* is-atEnd straight off the fit's own arithmetic. body.clientHeight is still the
     PRE-transition height at this instant, so measuring the box here would leave
     the 20px "there is more below" fade sitting on a card that has nothing below
     the fold — which is how the counterparty line ended up permanently greyed. */
  root.classList.toggle('is-atEnd', nat <= max + 1);
  later(timing.cardGrow + 40, updateEdgeFade);
}

function openCard(p) {
  if (cardOpen) return;
  cardOpen = true;
  foot.hidden = false;
  root.classList.add('is-card');

  // every staggered element starts out
  [elHeader, elNumWrap, elBullets, elName, elWay, elParty, elHeritage, elQuiz, elBtn]
    .forEach(el => el && el.classList.remove('is-in'));
  elWhat.classList.add('is-in');
  if (cardLine && cardLine !== ribbonLine) elWhat.textContent = cardLine;

  void sheet.offsetHeight;
  root.classList.remove('is-scrolled');
  deepReturn = 0;
  grow();
  try { sfx.lesson(); } catch (_) { try { duckFor(timing.lessonDuck); } catch (_2) {} }

  // §5.3 — the order IS the pedagogy. The label is seventh, not first.
  const st = timing.cardStagger;
  stagger(elHeader, st[0]);
  stagger(elNumWrap, st[1]);
  stagger(elBullets, st[1]);
  stagger(elName,    st[2]);
  stagger(elWay,     st[3]);
  stagger(elParty,   st[4]);
  stagger(elQuiz,    st[1]);
  stagger(elHeritage,st[4]);
  stagger(elBtn,     st[5]);

  /* No auto-scroll. grow()'s fit loop lands the whole card inside its own
     ceiling, so there is nothing below the fold to chase — and the old scroll
     only ever traded a cut escape line for a cut title. */
  userScrolled = false;

  // the number physically arrives (§5.3 +180ms, 400ms count-up from zero)
  const raw = p.number;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    later(st[1], () => {
      if (countCancel) countCancel();
      countCancel = rafTween(timing.countUp, (_t, e) => {
        elNumber.textContent = fmtMoney(Math.round(raw * e), p.numberFormat);
      });
    });
  }

  // a11y — dialog on the CARD only, and never aria-modal: the board stays live.
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', p.square != null
    ? t('lesson.aria', { n: p.square, title: p.title || '' })
    : (p.title || t('lesson.next')));
  sheet.setAttribute('tabindex', '-1');
  prevFocus = document.activeElement;
  later(st[5] + 40, () => { try { elBtn.focus({ preventScroll: true }); } catch (_) {} });

  announce(sentence([p.header || (HEADER_KEY[p.kind] ? t(HEADER_KEY[p.kind]) : ''),
                     p.title, cardLine,
                     typeof p.number === 'number' ? fmtMoney(p.number, p.numberFormat)
                       : (p.number != null ? String(p.number) : ''),
                     p.action, p.counterparty]));

  /* §5.4 #3 — auto-advance at 4500ms in home mode. NEVER in workshop mode, and
     never on a card that did not fit its own ceiling: §13 lets a card at 125/150%
     text "grow and scroll rather than truncate", and a card that closes itself
     after 4.5s takes the un-scrolled half of the teaching with it. */
  const scrolls = lastFit.natural > lastFit.max;
  /* game.js already hands us setLessonMode({autoAdvance}) from the game options
     — honour it, or a caller that asked for no auto-advance still loses the card
     under the reader at 4500ms. */
  if (live) live.autoAdvance = mode.autoAdvance !== false && !mode.workshop && !p.workshop && !scrolls;
  armAutoAdvance();

  lessonEvents.emit('card', cardGeometry(p));
}

/** The card's real footprint, published with the 'card' event so camera.js can
    lift the board out from behind it: §5.3 requires the token and the snake or
    ladder it just used to stay visible. lesson.js cannot move the board. */
function cardGeometry(p) {
  const r = sheet.getBoundingClientRect();
  return Object.assign({}, p, {
    sheetH: r.height, sheetTop: r.top,
    // what the fit cost: type scale actually rendered, and the word count behind it
    fitScale: lastFit.scale, words: lastFit.words,
  });
}

/** A tweened scroll of our own. Native 'behavior:'smooth'' is cancelled by any
    layout touch mid-flight and lands half-way, which is worse than not moving. */
function scrollBodyTo(top, ms = 320) {
  if (scrollCancel) scrollCancel();
  if (rm()) { body.scrollTop = top; return; }
  const from = body.scrollTop;
  scrollCancel = rafTween(ms, (_t, e) => {
    if (userScrolled) { if (scrollCancel) scrollCancel(); return; }
    body.scrollTop = from + (top - from) * e;
  });
}
let scrollCancel = null;

/** The body's height once the growth that is mid-flight has finished. Every
    measurement taken during those 300ms reads the OLD box, and a reveal computed
    off the old box overshoots by exactly the amount the card is about to grow. */
function finalViewH() {
  const h = parseFloat(sheet.style.height) || sheet.offsetHeight;
  return Math.max(body.clientHeight, Math.round(h - (foot.hidden ? 0 : foot.offsetHeight)));
}

/** Bring a block that was just revealed onto the screen with the SMALLEST scroll
    that shows it — never a jump to the end. §5.3: the deep dive expands IN PLACE,
    so the title, the figure, the term chip and the mint escape band she was
    reading must stay where they are for as long as they can. We never scroll UP
    (that would move the card under her either way) and never past the last line.
    'frac' is how much of the viewport the new block may claim; 'peek' overrides
    it with an absolute number of pixels — a deliberately small one, for content
    the reader must merely be SHOWN the start of rather than be carried into. */
function revealInto(el, frac = 0.55, peek = 0) {
  if (!cardOpen || !el || el.hidden) return;
  const view = finalViewH();
  const over = Math.max(0, body.scrollHeight - view);
  if (over <= 4) { updateEdgeFade(); return; }          // it is all on screen already
  const bTop = body.getBoundingClientRect().top;
  const r = el.getBoundingClientRect();
  const top = r.top - bTop + body.scrollTop;            // its place in the scrolled content
  const want = peek > 0
    ? Math.min(r.height, peek)
    : Math.min(r.height + 10, Math.max(120, Math.round(view * frac)));
  const target = clamp(Math.round(top + want - view), body.scrollTop, over);
  if (target - body.scrollTop < 6) { updateEdgeFade(); return; }
  /* one motion with the growth: the sheet rises and the text glides just enough.
     The tail runs past cardGrow so the last frame lands after the box has settled. */
  scrollBodyTo(target, timing.cardGrow + 120);
  /* reduced motion jumps there at once, while the box is still the old size, so
     the browser clamps it short. Re-apply once the growth is done. */
  if (rm()) later(timing.cardGrow + 60, () => {
    if (!cardOpen || userScrolled) return;
    body.scrollTop = Math.min(target, Math.max(0, body.scrollHeight - body.clientHeight));
    updateEdgeFade();
  });
}

let autoId = 0;
function armAutoAdvance() {
  clearAutoAdvance();
  if (!live || !live.autoAdvance) return;
  autoId = setTimeout(() => { if (cardOpen) close('auto'); }, timing.cardAutoAdvance);
}
function clearAutoAdvance() { if (autoId) { clearTimeout(autoId); autoId = 0; } }
function onResize() {
  if (cardOpen) {
    grow(true);
    // the occluded band just changed size — republish it for the camera
    if (live) lessonEvents.emit('card', cardGeometry(live.payload));
  } else if (open) sizeRibbon();
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Open / close
   ═══════════════════════════════════════════════════════════════════════ */

function close(reason = 'tap') {
  if (!open) return;
  const session = live;
  clearTimers();
  clearAutoAdvance();
  if (countCancel) { countCancel(); countCancel = null; }
  if (scrollCancel) { scrollCancel(); scrollCancel = null; }
  window.removeEventListener('resize', onResize);
  bindGlobal(false);

  const wasCard = cardOpen;
  open = false; cardOpen = false; live = null;
  if (wasCard) { lastCardClosedAt = performance.now(); }

  root.classList.remove('is-open');
  root.classList.add(reason === 'auto' ? 'is-out' : 'is-kill');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-label');

  const ms = reason === 'auto' ? timing.ribbonOut : timing.ribbonKill;
  setTimeout(() => {
    if (open) return;                        // a new lesson already took over
    root.classList.remove('is-card', 'is-out', 'is-kill', 'is-atEnd');
    setTextScale(1);
    sheet.style.height = layout.ribbonH + 'px';
    foot.hidden = true;
    elDeep.hidden = true;
    elDeepBtn.setAttribute('aria-expanded', 'false');
  }, ms + 20);

  // focus returns to the roll button — the thumb goes back where it was
  if (wasCard) restoreFocus();

  lessonEvents.emit('close', reason);
  if (session && session.resolve) session.resolve(session.result !== undefined ? session.result : reason);
}

function restoreFocus() {
  const cands = [prevFocus,
    document.querySelector('[data-snl-roll]'),
    document.getElementById('snl-roll'),
    document.querySelector('.snl-ui__dice'),
    document.querySelector('[data-snl-focus="roll"]')];
  for (const c of cands) {
    if (c && c.isConnected && typeof c.focus === 'function' && c !== document.body) {
      try { c.focus({ preventScroll: true }); return; } catch (_) {}
    }
  }
  prevFocus = null;
}

/** Should this landing open a card at all? */
function wantsCard(p) {
  if (p.card === false || p.ribbonOnly) return false;
  if (p.repeat === true) return false;                       // §5.4 #5
  const kind = p.kind || 'plain';
  const want = p.card === true || CARD_KINDS.has(kind);
  if (!want) return false;

  // §5.4 #5 — repeat visits show the ribbon only. Per player, per game.
  const key = (p.playerId || '-') + '|' + (p.cardKey || p.square || p.name || p.title || kind);
  if (seenCards.has(key)) return false;

  // §5.4 #4 / §3.2 — never two cards in a row.
  if (GAME.neverTwoCardsInARow) {
    if (p.turnId != null && lastCardTurnId != null && p.turnId === lastCardTurnId) return false;
    if (p.turnId == null && performance.now() - lastCardClosedAt < 900) return false;
  }
  seenCards.add(key);
  if (p.turnId != null) lastCardTurnId = p.turnId;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
   9. Public API
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * The teaching moment. Shows the ribbon immediately; grows it into the card at
 * landing if this square earns one. Resolves when it is dismissed, with the
 * reason ('button' | 'tap' | 'auto' | 'escape' | 'replaced').
 *
 * payload {
 *   kind:'ladder'|'snake'|'lesson'|'square'|'plain'|'milestone'|'event'|'finish',
 *   title, line, number, numberLabel, name, action, counterparty, heritage,
 *   deep, term, handoffLabel, color,
 *   what?        the card's fuller sentence; 'line' stays the ribbon's two-line version
 *   square?      the square number — used for the aria label and the heritage memory
 *   playerId?    who landed; repeat visits by the same player show the ribbon only
 *   turnId?      pass it: it is what makes "never two cards in a row" exact rather
 *                than a 900ms heuristic
 *   bullets?     milestone only — three flat lines, no new information
 *   header?      overrides the variant header
 *   repeat? / card? / ribbonOnly?   force the ribbon or force the card
 *   landIn?      ms from now until the token stops. Call it at travel x 0.6 with
 *                landIn = travel x 0.4, so the ribbon is readable BEFORE it lands
 *   workshop?    no auto-advance
 *   onLanded?    called on the exact frame the ribbon pulses (game.js re-arms the dice here)
 * }
 * The returned promise also carries .land() and .dismiss() for callers that
 * want frame-exact control instead of 'landIn'.
 */
export function showLesson(payload = {}) {
  mount();
  if (open) close('replaced');

  const p = { ...payload };
  const card = wantsCard(p);

  let resolve;
  const promise = new Promise(r => { resolve = r; });
  live = { payload: p, resolve, timers: [], autoAdvance: false, landed: false, card, result: undefined };
  const session = live;

  paint(p);
  foot.hidden = true;
  root.classList.remove('is-card', 'is-out', 'is-kill');
  sizeRibbon();
  open = true; cardOpen = false;
  bindGlobal(true);
  window.addEventListener('resize', onResize, { passive: true });

  // ribbon in — 88dp over lessonIn 260ms, ease-out-cubic.
  // Flush layout synchronously rather than waiting on rAF: a backgrounded tab
  // never fires rAF, and the ribbon must be on screen the moment it is asked for.
  void sheet.offsetHeight;
  root.classList.add('is-open');
  announce(sentence([p.title, ribbonLine]));
  lessonEvents.emit('ribbon', p);

  const landIn = Math.max(0, Number(p.landIn) || 0);
  later(landIn, () => land());

  const api = { land, dismiss: (why = 'tap') => close(why) };
  return Object.assign(promise, api);

  function land() {
    if (live !== session || session.landed) return;
    session.landed = true;

    // the edge pulses once — and the dice re-arms on THIS frame (§5.2)
    edge.classList.remove('is-pulse');
    void edge.offsetWidth;
    edge.classList.add('is-pulse');
    try { if (typeof p.onLanded === 'function') p.onLanded(); } catch (_) {}
    lessonEvents.emit('landed', p);

    if (card) { openCard(p); return; }
    later(timing.ribbonHold, () => close('auto'));   // hold 1800, then out over 200
  }
}

/**
 * Sabka Sawaal — guess before the reveal. Two chunky chips, neither wrong,
 * no score, no timer, no penalty. Always skippable.
 * Resolves TRUE if she answered, FALSE if she skipped past it.
 *
 * payload { title, question, chips:[a,b], reveal, number?, numberLabel?,
 *           deep?, term?, handoffLabel?, workshop?, ...as showLesson }
 */
export function showQuiz(payload = {}) {
  mount();
  if (open) close('replaced');

  const p = { ...payload, kind: 'quiz' };
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  live = { payload: p, resolve, timers: [], autoAdvance: false, landed: true, card: true, result: false };
  const session = live;

  paint(p);
  // the quiz replaces the number/way-out block until she has answered
  elNumWrap.hidden = true; elWay.hidden = true; elParty.hidden = true; elBullets.hidden = true;
  elQuiz.hidden = false;
  /* §5.5 — the quiz card is header · question · two chips · note. The question
     takes the "what happened" slot rather than repeating under it, and the square
     title stays on the ribbon only: on a 72dp-chip card every pixel is a chip. */
  cardLine = String(p.question || p.line || '').trim();
  elTitle.style.display = 'none';
  elQuizNote.textContent = mode.workshop || p.workshop ? t('quiz.askRoom') : t('quiz.noWrong');
  show(elHeader, esc(t('quiz.guessFirst')));

  elQuizChips.innerHTML = '';
  const chips = (Array.isArray(p.chips) ? p.chips : []).slice(0, 2);
  chips.forEach((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'snl-lesson__qchip';
    b.setAttribute('data-keep', '');
    b.setAttribute('aria-label', t('quiz.chipAria', { text: label }));
    b.textContent = label;
    b.addEventListener('click', () => reveal(i, b));
    elQuizChips.appendChild(b);
  });

  sheet.style.height = layout.ribbonH + 'px';
  root.classList.remove('is-card', 'is-out', 'is-kill');
  open = true; cardOpen = false;
  bindGlobal(true);
  window.addEventListener('resize', onResize, { passive: true });
  void sheet.offsetHeight;
  root.classList.add('is-open');
  openCard(p);
  announce(sentence([t('quiz.title'), t('quiz.noWrong'), p.question, ...chips]));

  return Object.assign(promise, { dismiss: (why = 'tap') => close(why) });

  function reveal(i, btn) {
    if (live !== session || session.result === true) return;
    session.result = true;
    session.autoAdvance = false;          // she engaged; nothing closes under her now
    clearAutoAdvance();
    click();
    btn.classList.add('is-picked');
    elQuizChips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === btn)));

    // there is no wrong answer, so the reveal is kind either way
    const text = p.reveal || p.line || '';
    elWayText.textContent = '';
    elWay.hidden = true;
    elParty.hidden = true;

    const n = p.number != null ? p.number : firstRupee(text);
    if (typeof n === 'number' && Number.isFinite(n)) {
      elNumWrap.hidden = false;
      elNumber.textContent = fmtMoney(0, p.numberFormat);
      elNumWrap.classList.add('is-in');
      if (countCancel) countCancel();
      countCancel = rafTween(timing.quizReveal, (_t, e) => {
        elNumber.textContent = fmtMoney(Math.round(n * e), p.numberFormat);
      });
      show(elNumLabel, p.numberLabel ? esc(p.numberLabel) : null);
    }

    elQuizNote.textContent = text;
    elQuizNote.style.color = 'var(--navy)';
    elQuizNote.style.fontSize = px(S.minimum);
    elQuizNote.style.fontWeight = '600';
    elQuizNote.style.opacity = '0';
    rafTween(timing.quizReveal, (_t, e) => { elQuizNote.style.opacity = String(e); });

    try { sfx.correct(); } catch (_) {}
    announce(sentence([t('quiz.answerLabel'), text]));
    grow(true);
    /* the answer, not the end of the card: the gold figure counting up sits
       ABOVE the note, and scrolling to the bottom used to throw it off the top. */
    userScrolled = false;
    revealInto(elQuizNote, 0.5);
  }
}

/** Is a ribbon or a card on screen? */
export function isOpen() { return open; }
/** Is the CARD (state 2) on screen? The probe reports 'lesson' for this. */
export function isCardOpen() { return cardOpen; }

/** Close whatever is open. window.__SNL.dismissLesson() lands here. */
export function dismiss(reason = 'tap') { close(reason); }

/** The text currently on screen, or null. window.__SNL.lessonText(). */
export function lessonText() {
  if (!open || !live) return null;
  const p = live.payload;
  const parts = [p.title, elWhat.textContent];
  if (cardOpen) {
    if (!elNumWrap.hidden) parts.push(elNumber.textContent, elNumLabel.hidden ? '' : elNumLabel.textContent);
    if (!elQuiz.hidden) parts.push(elQuizNote.textContent);
    if (!elName.hidden) parts.push(elName.textContent);
    if (!elWay.hidden) parts.push(elWayText.textContent);
    if (!elParty.hidden) parts.push(elParty.textContent);
    if (!elHeritage.hidden) parts.push(elHeritage.textContent);
    if (!elDeep.hidden) parts.push(elDeepText.textContent);
  }
  return parts.filter(s => s && String(s).trim()).join(' · ');
}

/** Home vs workshop, pass-and-play vs solo. Workshop mode never auto-advances. */
export function setLessonMode(next = {}) {
  mode = { ...mode, ...next };
  return { ...mode };
}
export function getLessonMode() { return { ...mode }; }

/** New game — forget what has been read, so the cards come back. */
export function resetSession() {
  seenCards.clear();
  seenHeritage.clear();
  lastCardTurnId = null;
  lastCardClosedAt = -1e9;
  lastHandoff = null;
}

/** Mount early so the first ribbon never pays for a stylesheet. */
export function initLesson() { mount(); return root; }
