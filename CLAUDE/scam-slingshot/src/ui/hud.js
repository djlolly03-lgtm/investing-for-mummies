/**
 * ui/hud.js — the DOM layer over the canvas. PURE SUBSCRIBER (plus explicit setters from main).
 *
 * This is the only layer that follows the IFM design system: Nunito + Lora, teal #2a9d8f,
 * navy/ink #1a3a5c, 14px soft-shadow cards. It must not feel like a web page bolted onto a
 * game, so: no default browser buttons, no sharp corners, no system fonts where a brand font
 * would do, and everything animates in rather than appearing.
 *
 * The whole UI is injected from here (markup + styles) so index.html stays a boot shim and
 * one file owns the shell.
 *
 * ── WHAT P13 CHANGED, AND WHY EACH ONE WAS A SHIPPING DEFECT ──────────────────
 * 1. THE LEVEL CHIP SAID "LEVEL 1" ON LEVEL 3. It was a literal in the markup that nothing
 *    ever wrote. A three-level game that calls every level Level 1 is not shippable, so the
 *    chip now reads `levelNumber(world.level.id)` on every refresh: "Level 3 of 3".
 * 2. THE TUTORIAL HINT SHOWED ON LEVEL 3. That gate lives in main.js (`showTutorialHint`) —
 *    this file only renders what it is told. It is noted here because the hint ELEMENT is
 *    here, and that is where the next reader will look for the rule.
 * 3. THERE WAS NO WAY OUT OF A LEVEL. Both overlay buttons called `onRestart`, so the obvious
 *    primary button after clearing level 1 handed you level 1 again, and the owner could not
 *    reach l2 or l3 without typing into a devtools console. The overlay owns the chain now:
 *    Replay · Next level · and a finish panel after the last one.
 *
 * ── TOUCH IS THE PRIMARY INPUT ───────────────────────────────────────────────
 * Students play this on phones. Every button is >= 48 px tall (the mute key, at 38, was the
 * one exception and is now 44) with >= 10 px between it and its neighbour, both panels scroll
 * internally rather than overflowing a 390x844 viewport, and nothing depends on hover.
 * Checked at 390x844 — a control that is comfortable at 1280 and 40 px tall on a phone has
 * not been tested.
 *
 * ── WHAT THE SHELL BRAND PASS CHANGED ────────────────────────────────────────
 * 1. THE BRAND FONTS WERE NEVER LOADED. The CSS asked for Nunito and Lora and there was no
 *    @font-face anywhere; both are installed on the build Mac, so captures looked right and
 *    a student's phone would have rendered the shell in Roboto. index.html now self-hosts
 *    subset woff files (51 KB, all three faces) — see the note at the top of that file.
 * 2. THE LESSON WAS A FOOTNOTE. `teaches` is the reason the game exists and it was 12.5 px
 *    UI text, smaller than the word "POINTS" next to it. It is Lora 17 px in its own panel.
 * 3. THE AMMO PIPS RAN VERTICALLY (`#pips` had no `display:flex` inside a flex row) and the
 *    level NAME — the scam being taught — was ellipsed to "The ₹50 Lak…" at 390 px.
 * 4. THE FINISH PANEL COULD SAY "2. l2" with no lesson under it. See `fillLevelMeta`.
 * 5. The IFM roundel now appears on the loading screen and at the head of both sheets, and
 *    NOWHERE over the play area — see the note above CREST.
 *
 * Text sizes: every SENTENCE in the shell is >= 14 px. The uppercase tracked micro-labels
 * ("LEVEL 1 OF 3", "AMMO", "SCORE", "POINTS", "THE LESSON") are 12 px, which is the design
 * system's own tag/caps pattern and the floor used here — nothing is below 12.
 */

import { on } from '../events.js';
import { world, ammoLeft, aliveVillains } from '../world.js';
import { LEVELS, loadLevelData } from '../level/loader.js';
import {
  LEVEL_ORDER, MAX_STARS, levelNumber, isLastLevel, nextLevel,
  totalStars, bestFor, progress, storage as progressStorage,
} from '../progression.js';

/**
 * Draw fraction (0..1) at which the tutorial hint has done its job and gets out of the way.
 * 0.2 is past the grab-pop and past any accidental twitch, and well inside the shortest
 * shot anyone actually fires.
 */
const HINT_DISMISS_DRAW = 0.2;

/**
 * The IFM roundel, resolved against THIS MODULE rather than the document, so the shell keeps
 * working when the game is embedded from another path (it is iframed into WordPress).
 * 192 px source, 14.6 KB, cut from the same `assets/ifm-round.png` the ammo is minted from.
 */
const LOGO_SRC = new URL('../../assets/ifm-logo-ui.png', import.meta.url).href;

/**
 * WHERE THE BRAND IS ALLOWED TO BE, AND WHERE IT IS NOT.
 *
 * On: the loading screen (index.html) and the two sheets — moments when the play area is
 * already covered or does not exist yet, so identity costs the game nothing.
 * Off: the play area. A permanent watermark over a live shot would sit in exactly the
 * contrast band that belongs to the ammo and the tower, and the backdrop already carries IFM.
 *
 * The lockup is a roundel PLUS A TYPESET WORDMARK. The logo's own lettering is about 6 px
 * tall at 40 px and cannot be read; a mark you cannot name is decoration, not branding.
 */
const CREST = `
  <div class="crest">
    <img src="${LOGO_SRC}" width="46" height="46" alt="Investing for Mummies">
    <span>Investing for Mummies</span>
  </div>`;

const CSS = `
#ui, #fx-layer { position:fixed; inset:0; pointer-events:none; z-index:20;
  font-family:var(--font-ui); color:var(--cream); }
#fx-layer { z-index:19; overflow:hidden; }

.fx-pop { position:absolute; left:0; top:0; will-change:transform,opacity;
  font-weight:900; font-size:clamp(15px,2.4vw,24px); letter-spacing:.2px;
  text-shadow:0 2px 0 rgba(10,25,40,.55), 0 5px 14px rgba(10,25,40,.4);
  white-space:nowrap; }

/* ---------- top bar ---------- */
#hud { position:absolute; left:0; right:0; top:0; display:flex; align-items:flex-start;
  justify-content:space-between; gap:10px; padding:calc(10px + env(safe-area-inset-top)) 12px 0;
  pointer-events:none; }
.card { background:linear-gradient(180deg, rgba(26,58,92,.90), rgba(18,42,68,.90));
  border:1px solid rgba(255,255,255,.14); border-radius:14px;
  box-shadow:0 8px 22px rgba(6,18,32,.38), inset 0 1px 0 rgba(255,255,255,.16);
  backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); }
#hud-left  { display:flex; flex-direction:column; gap:8px; align-items:flex-start; min-width:0;
  max-width:calc(100% - 128px); }
#hud-right { display:flex; flex-direction:column; gap:8px; align-items:flex-end; flex:none; }

/**
 * THE LEVEL CHIP IS TWO LINES, and that is a fix and not a flourish: on one line the level
 * NAME — which is the scam being taught — was ellipsed to "The ₹50 Lak…" at 390 px. The
 * label and the star total ride the top row; the name gets the full width underneath.
 */
#level-chip { padding:7px 12px 8px; display:flex; flex-direction:column; align-items:flex-start;
  gap:2px; max-width:min(64vw,340px); }
#level-chip .top { display:flex; align-items:center; gap:10px; width:100% }
#level-chip b { color:var(--teal-lt,#7fd6c8); font-weight:800; font-size:12px; letter-spacing:.12em;
  text-transform:uppercase; flex:none }
#level-chip .tot { flex:none; margin-left:auto; font-size:12px; font-weight:900;
  color:var(--sun); letter-spacing:.02em; display:flex; align-items:center; gap:3px }
#level-chip .tot svg { width:12px; height:12px; display:block }
#level-chip #level-name { font-family:var(--font-display); font-size:15px; font-weight:700;
  line-height:1.22; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  max-width:100%; min-width:0 }

/**
 * THE PIPS WERE A COLUMN. '#pips' is a plain div inside a flex ROW, so its children stacked
 * vertically and "AMMO" sat beside a 70 px ladder of dots — a tenth of a phone screen spent
 * on four dots. It is a row now.
 */
#ammo-rail { padding:8px 12px; display:flex; align-items:center; gap:10px; }
#pips { display:flex; align-items:center; gap:7px; }
.pip { width:15px; height:15px; border-radius:50%; flex:none;
  background:radial-gradient(circle at 34% 30%, #6fe0cd, var(--teal) 62%, #16645a);
  box-shadow:0 2px 5px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5);
  transition:transform .22s cubic-bezier(.3,1.6,.5,1), opacity .22s, filter .22s; }
.pip.spent { opacity:.22; filter:grayscale(1); transform:scale(.62); }
#ammo-rail span { font-size:12px; letter-spacing:.13em; text-transform:uppercase;
  opacity:.66; font-weight:800; }

#score-chip { padding:6px 13px 7px; text-align:right; }
#score-chip .n { font-size:21px; font-weight:900; letter-spacing:.3px; font-variant-numeric:tabular-nums;
  display:block; line-height:1.1 }
#score-chip .l { font-size:12px; letter-spacing:.14em; text-transform:uppercase; opacity:.62;
  font-weight:800 }

/* "2 scammers left" wrapped onto two lines at 390 px. It is one line, always. */
#foes-chip { padding:7px 12px; display:flex; align-items:center; gap:8px; font-size:14px;
  font-weight:800; white-space:nowrap }
#foes-chip i { width:11px; height:11px; border-radius:50%; background:var(--coral); flex:none;
  box-shadow:0 0 0 2.5px rgba(231,111,81,.24); display:inline-block; font-style:normal }
#foes-chip em { font-style:normal; font-weight:700; opacity:.72 }

/* 44, not 38: the standing rule on this project is a 44 px minimum tap target, and the mute
   button was the one control in the shell that broke it. */
#btn-mute { pointer-events:auto; width:44px; height:44px; border-radius:14px;
  display:grid; place-items:center; cursor:pointer; color:var(--cream);
  background:linear-gradient(180deg, rgba(26,58,92,.9), rgba(18,42,68,.9));
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 8px 20px rgba(6,18,32,.36), inset 0 1px 0 rgba(255,255,255,.16); }
#btn-mute:active { transform:translateY(1px) }
#btn-mute svg { width:20px; height:20px }

/* ---------- hint ---------- */
#hint { position:absolute; left:50%; bottom:calc(16px + env(safe-area-inset-bottom));
  transform:translateX(-50%); padding:10px 17px; font-size:14px; font-weight:700;
  opacity:0; transition:opacity .4s ease; letter-spacing:.1px; max-width:88vw; text-align:center; }
#hint.on { opacity:.94 }

/* ---------- the level picker ---------- */
#btn-levels { pointer-events:auto; width:44px; height:44px; border-radius:14px;
  display:grid; place-items:center; cursor:pointer; color:var(--cream);
  background:linear-gradient(180deg, rgba(26,58,92,.9), rgba(18,42,68,.9));
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 8px 20px rgba(6,18,32,.36), inset 0 1px 0 rgba(255,255,255,.16); }
#btn-levels:active { transform:translateY(1px) }
#pick-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:9px; margin:4px 0 14px }
.pick-card { display:flex; flex-direction:column; align-items:flex-start; gap:2px;
  padding:10px 12px; border-radius:14px; cursor:pointer; text-align:left; color:var(--cream);
  background:linear-gradient(180deg, rgba(26,58,92,.72), rgba(18,42,68,.72));
  border:1px solid rgba(255,255,255,.12); font:inherit }
.pick-card.now { border-color:var(--teal,#2a9d8f); box-shadow:0 0 0 2px rgba(42,157,143,.35) }
.pick-card b { font-size:11px; letter-spacing:.14em; opacity:.62 }
.pick-card span { font-size:13px; font-weight:800; line-height:1.2 }
.pick-card i { font-style:normal; font-size:12px; color:var(--gold,#f6c453); letter-spacing:.08em }

/* ---------- overlays: level complete / failed / finish ---------- */
.sheet { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none;
  opacity:0; transition:opacity .34s ease; padding:14px }
.sheet.on { opacity:1; pointer-events:auto }
.sheet .scrim { position:absolute; inset:0; background:radial-gradient(120% 90% at 50% 40%,
  rgba(10,26,44,.30), rgba(8,20,34,.72)); }
.sheet .panel { position:relative; width:min(420px, 94vw); max-height:92vh; overflow-y:auto;
  -webkit-overflow-scrolling:touch; padding:18px 20px 18px; text-align:center;
  border-radius:22px; transform:translateY(16px) scale(.96);
  transition:transform .42s cubic-bezier(.2,1.5,.4,1); }
.sheet.on .panel { transform:none }

/* the IFM lockup at the head of every sheet */
.crest { display:flex; align-items:center; justify-content:center; gap:9px; margin:0 0 14px;
  padding:0 0 13px; border-bottom:1px solid rgba(255,255,255,.12) }
.crest img { width:46px; height:46px; display:block; border-radius:50%; flex:none;
  background:var(--cream); padding:2px;
  box-shadow:0 3px 10px rgba(4,14,26,.4), 0 0 0 1px rgba(255,255,255,.22) }
.crest span { font-size:12px; font-weight:900; letter-spacing:.15em; text-transform:uppercase;
  color:var(--teal-lt,#7fd6c8); line-height:1.2; text-align:left }

.sheet .eyebrow { font-size:12px; font-weight:900; letter-spacing:.16em; text-transform:uppercase;
  color:var(--mint,#bde9e4); opacity:.85; margin:0 0 6px }
.sheet h2 { font-family:var(--font-display); font-size:28px; margin:0 0 4px; font-weight:700;
  line-height:1.15 }
.sheet .sub { font-size:14px; opacity:.76; margin:0 0 14px; font-weight:600; line-height:1.4 }
.sheet .tally { display:flex; justify-content:center; align-items:baseline; gap:8px; margin:2px 0 8px }
.sheet .tally .n { font-size:34px; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:-.5px;
  color:var(--teal); text-shadow:0 3px 0 rgba(0,0,0,.22) }
.sheet .tally .u { font-size:12px; letter-spacing:.14em; text-transform:uppercase; opacity:.6; font-weight:800 }
.sheet .stars { display:flex; justify-content:center; gap:10px; margin:2px 0 12px }
.sheet .stars i { width:36px; height:36px; display:block; opacity:.20; transform:scale(.7);
  color:var(--sun); transition:opacity .3s, transform .45s cubic-bezier(.2,1.7,.4,1);
  filter:drop-shadow(0 3px 6px rgba(6,18,32,.45)) }
.sheet .stars i.on { opacity:1; transform:none }
.sheet .meta { font-size:14px; font-weight:800; letter-spacing:.02em; opacity:.6;
  margin:0 0 14px; font-variant-numeric:tabular-nums; min-height:16px }

/**
 * ── THE LESSON — THE ONE BLOCK THIS WHOLE GAME EXISTS TO DELIVER ─────────────────────────
 * The level's 'teaches' line is the payoff; everything before it is the ride. It used to be
 * 12.5 px UI text in a tinted box — smaller than the word "POINTS" beside it, set in the same
 * font as the buttons: the sentence a student is meant to walk away with, styled as a
 * footnote. It is Lora now, 17 px, 1.5 line-height, on the design system's teal feedback
 * rule, and it is the only serif paragraph on the sheet. The score above it came DOWN from
 * 38 px to 34 to leave it room at the top of the hierarchy.
 */
.sheet .lesson { text-align:left; border-radius:14px; padding:14px 16px 15px; margin:0 0 16px;
  background:linear-gradient(180deg, rgba(42,157,143,.22), rgba(42,157,143,.12));
  border:1px solid rgba(42,157,143,.36); border-left:4px solid var(--teal);
  box-shadow:0 6px 16px rgba(6,18,32,.22) }
.sheet .lesson b { color:var(--teal-lt,#7fd6c8); display:block; font-size:12px; font-weight:900;
  letter-spacing:.15em; text-transform:uppercase; margin-bottom:7px }
.sheet .lesson p { margin:0; font-family:var(--font-display); font-size:17px; line-height:1.5;
  font-weight:600; color:var(--cream) }

.sheet .row { display:flex; gap:10px; justify-content:center; flex-wrap:wrap }
/**
 * -- AN INVISIBLE BUTTON IS STILL A BUTTON, AND IT WAS EATING THE GAME ------------------
 * .sheet is pointer-events:none while it is off, but that does not survive a descendant
 * setting its own value: ".sheet button { pointer-events:auto }" re-armed every button on
 * BOTH hidden sheets, so there were invisible 48 px hit targets lying across the middle of
 * the play area at all times. document.elementFromPoint() at the slingshot's own grab pixel
 * on a 390x844 phone returned #btn-fin-reset -- the hidden finish sheet's "Reset my
 * progress" button -- the pointerdown never reached the canvas, the sling stayed loaded with
 * drawn 0.0000, and four real-pointer attempts at l1 fired nothing at all. The same targets
 * sit over the middle of the screen during FLIGHT, where a tap is the ammo's ability.
 *
 * The .on is the whole fix: a sheet's buttons are hittable exactly when the sheet is.
 */
.sheet.on button { pointer-events:auto }
.sheet button { pointer-events:none; border:0; cursor:pointer; font-family:var(--font-ui);
  font-weight:800; font-size:15px; letter-spacing:.2px; padding:13px 18px; border-radius:14px;
  min-height:48px; flex:1 1 auto; min-width:132px;
  color:#08202e; background:linear-gradient(180deg,#5fd6c4,var(--teal));
  box-shadow:0 8px 18px rgba(8,40,36,.4), inset 0 1px 0 rgba(255,255,255,.5); }
.sheet button.ghost { color:var(--cream); background:rgba(255,255,255,.10);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.20) }
/* "Reset my progress" is the one control in the shell that erases something, so it is the
   last one that should be the smallest: full width, 48 px, and the same type size as the
   buttons it sits under. */
.sheet button.quiet { flex:1 1 100%; min-height:48px; padding:12px 16px; font-size:14px;
  color:var(--cream); background:transparent; box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);
  opacity:.82 }
.sheet button.danger { color:#2a0d08; opacity:1;
  background:linear-gradient(180deg,#f29b7f,var(--coral));
  box-shadow:0 8px 18px rgba(60,20,10,.36), inset 0 1px 0 rgba(255,255,255,.4) }
.sheet button:active { transform:translateY(1px) }

/* ---------- finish panel ---------- */
#fin-total { font-family:var(--font-display); font-size:16px; font-weight:700; margin:0 0 14px }
#fin-total b { color:var(--sun); font-family:var(--font-ui); font-weight:900; font-size:27px;
  font-variant-numeric:tabular-nums; vertical-align:-1px }
/**
 * The finish rows carry all three 'teaches' lines at once — the only screen in the game where
 * the whole curriculum is visible together — so they are set as three small lessons (Lora,
 * 14.5 px) rather than as caption text hanging off a score.
 */
#fin-runs { display:flex; flex-direction:column; gap:9px; margin:0 0 16px; text-align:left }
.run { display:grid; grid-template-columns:1fr auto; gap:5px 10px; align-items:baseline;
  background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.10);
  border-left:3px solid rgba(42,157,143,.75);
  border-radius:14px; padding:11px 13px }
.run .nm { grid-column:1; grid-row:1; font-family:var(--font-display); font-size:15px;
  font-weight:700; line-height:1.25 }
.run .st { grid-column:2; grid-row:1; color:var(--sun); font-size:15px; letter-spacing:1px;
  white-space:nowrap }
.run .tc { grid-column:1; grid-row:2; font-family:var(--font-display); font-size:14.5px;
  line-height:1.45; opacity:.86; font-weight:600 }
.run .sc { grid-column:2; grid-row:2; font-size:14px; font-weight:900; opacity:.7;
  font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right }
.run.miss { border-left-color:rgba(255,255,255,.18) }
.run.miss .nm, .run.miss .tc { opacity:.45 }

@media (prefers-reduced-motion:reduce){
  .sheet .panel { transition:none }
  .sheet .stars i { transition:opacity .2s }
}
`;

const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95z"/></svg>`;
const GENERIC_FACT = 'A prize you never entered is not a prize. It is a bill.';

/** "★★☆" — the finish rows are dense, so they get glyphs rather than three 34 px SVGs. */
const starGlyphs = (n) => '★'.repeat(Math.max(0, n | 0)) + '☆'.repeat(Math.max(0, 3 - (n | 0)));

export class Hud {
  constructor() {
    const style = document.createElement('style');
    style.id = 'ui-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    const fx = document.createElement('div');
    fx.id = 'fx-layer';
    document.body.appendChild(fx);

    const ui = document.createElement('div');
    ui.id = 'ui';
    ui.innerHTML = `
      <div id="hud">
        <div id="hud-left">
          <div class="card" id="level-chip">
            <div class="top">
              <b id="level-no">Level 1</b>
              <span class="tot" id="level-tot"></span>
            </div>
            <span id="level-name">—</span>
          </div>
          <div class="card" id="ammo-rail"><span>Ammo</span><div id="pips"></div></div>
        </div>
        <div id="hud-right">
          <div class="card" id="score-chip"><span class="n" id="score">0</span><span class="l">Score</span></div>
          <div class="card" id="foes-chip"><i></i><span id="foes">0</span><em>scammers left</em></div>
          <button id="btn-levels" aria-label="Choose a level"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg></button>
          <button id="btn-mute" aria-label="Toggle sound">${speakerSvg(true)}</button>
        </div>
      </div>
      <div class="card" id="hint">Drag back from the slingshot, then let go</div>

      <div id="end" class="sheet">
        <div class="scrim"></div>
        <div class="card panel" role="dialog" aria-live="polite">
          ${CREST}
          <p class="eyebrow" id="end-eyebrow">Level 1 of 3</p>
          <h2 id="end-title">Level clear</h2>
          <p class="sub" id="end-sub">Every scammer sent packing</p>
          <div class="stars">
            <i data-i="0">${STAR_SVG}</i><i data-i="1">${STAR_SVG}</i><i data-i="2">${STAR_SVG}</i>
          </div>
          <div class="tally"><span class="n" id="end-score">0</span><span class="u">points</span></div>
          <p class="meta" id="end-meta"></p>
          <div class="lesson" id="end-fact">
            <b>The lesson</b><p id="end-fact-text"></p>
          </div>
          <div class="row">
            <button id="btn-again" class="ghost">Replay</button>
            <button id="btn-next">Next level</button>
          </div>
        </div>
      </div>

      <div id="pick" class="sheet">
        <div class="scrim"></div>
        <div class="panel card">
          <p class="eyebrow">Choose a level</p>
          <div id="pick-grid"></div>
          <div class="row"><button id="btn-pick-close" class="ghost">Back</button></div>
        </div>
      </div>

      <div id="fin" class="sheet">
        <div class="scrim"></div>
        <div class="card panel" role="dialog" aria-live="polite">
          ${CREST}
          <p class="eyebrow">All three scams</p>
          <h2 id="fin-title">You spotted every one</h2>
          <p class="sub" id="fin-sub">Lottery, credit card, pyramid — all three sent packing.</p>
          <p id="fin-total"><b id="fin-stars">0</b> of ${MAX_STARS} stars</p>
          <div id="fin-runs"></div>
          <div class="row">
            <button id="btn-fin-again">Play from level 1</button>
            <button id="btn-fin-reset" class="quiet">Reset my progress</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ui);

    const q = (sel) => ui.querySelector(sel);
    this.el = {
      pips: q('#pips'), score: q('#score'), foes: q('#foes'),
      levelNo: q('#level-no'), levelName: q('#level-name'), levelTot: q('#level-tot'),
      hint: q('#hint'),
      end: q('#end'), endEyebrow: q('#end-eyebrow'), endTitle: q('#end-title'),
      endSub: q('#end-sub'), endScore: q('#end-score'), endMeta: q('#end-meta'),
      endFact: q('#end-fact-text'), stars: [...ui.querySelectorAll('#end .stars i')],
      mute: q('#btn-mute'), again: q('#btn-again'), next: q('#btn-next'),
      levels: q('#btn-levels'), pick: q('#pick'), pickGrid: q('#pick-grid'),
      pickClose: q('#btn-pick-close'),
      fin: q('#fin'), finTitle: q('#fin-title'), finSub: q('#fin-sub'),
      finStars: q('#fin-stars'), finRuns: q('#fin-runs'),
      finAgain: q('#btn-fin-again'), finReset: q('#btn-fin-reset'),
    };

    this.shownScore = 0;
    this.tallyTarget = 0;
    this.lastFact = '';
    /** Last value written into the star-total chip, so the SVG is not re-parsed every frame. */
    this.shownTotalStars = -1;
    /** Guards the one-shot metadata fetch behind the finish panel (see fillLevelMeta). */
    this.metaFetch = null;
    /** id -> {name, teaches}, remembered as levels are played so the finish panel can name them. */
    this.levelNames = {};
    /** What the PRIMARY button does right now. Set by showEnd(), read by its click handler. */
    this.nextAction = 'restart';        // 'restart' | 'next' | 'finish'
    this.resetArmed = 0;                // performance.now() of the first tap; destructive = two taps

    // --- callbacks, assigned by main.js at boot ---
    this.onRestart = null;
    this.onNext = null;
    /** Called with a level id when the player picks one from the grid. */
    this.onPickLevel = null;
    this.onFirst = null;
    this.onResetProgress = null;

    this.el.again.onclick = () => this.onRestart?.();
    /**
     * ONE BUTTON, THREE JOBS — and which one is decided in showEnd(), where the state is
     * known. Both buttons used to call `onRestart`, so a player who cleared level 1 and
     * pressed the obvious primary button was handed level 1 again.
     */
    this.el.levels.onclick = () => this.showPicker();
    this.el.pickClose.onclick = () => this.el.pick.classList.remove('on');
    this.el.next.onclick = () => {
      if (this.nextAction === 'next') return this.onNext?.();
      if (this.nextAction === 'finish') return this.showFinish();
      return this.onRestart?.();
    };
    this.el.finAgain.onclick = () => { this.hideFinish(); return this.onFirst?.(); };
    this.el.finReset.onclick = () => this.tapReset();

    this.el.mute.onclick = () => {
      const m = world.audio?.setMute(!world.audio.muted) ?? false;
      this.el.mute.innerHTML = speakerSvg(!m);
    };

    on('score', () => this.refresh());
    on('villainDefeated', ({ fact }) => { if (fact) this.lastFact = fact; this.refresh(); });
    on('ammoSpent', () => this.refresh());
    on('launch', () => { this.hint(false); this.refresh(); });
    /**
     * THE HINT'S JOB ENDS AT THE FIRST REAL DRAW, not at the first launch. It says "drag
     * back from the slingshot, then let go" — once the band is genuinely drawn the player
     * has demonstrably read the first half, and leaving the line up while they aim is the
     * game talking over them. The class check keeps this to one DOM write: `bandStretch`
     * fires every frame of every drag for the rest of the game.
     */
    on('bandStretch', ({ t }) => {
      if (t >= HINT_DISMISS_DRAW && this.el.hint?.classList.contains('on')) this.hint(false);
    });
    // refresh() first: the win handler adds the unused-ammo bonus to world.score, and a HUD
    // still showing the pre-bonus number next to an overlay showing the post-bonus one is the
    // kind of tiny inconsistency that makes a game feel untrustworthy.
    on('levelWon', (d) => { this.refresh(); this.showEnd(true, d); });
    on('levelLost', (d) => { this.refresh(); this.showEnd(false, d); });
    on('levelLoaded', () => { this.hideEnd(); this.hideFinish(); this.lastFact = ''; this.refresh(); });
  }

  refresh() {
    const L = world.level;
    if (L) {
      this.el.levelName.textContent = L.name ?? L.id;
      /**
       * THE FIX FOR "LEVEL 1 ON LEVEL 3". `levelNumber()` is the position in the shipped
       * chain; a harness fixture is not in the chain and says so rather than borrowing a
       * number it does not have.
       */
      const n = levelNumber(L.id);
      this.el.levelNo.textContent = n ? `Level ${n} of ${LEVEL_ORDER.length}` : 'Probe';
      if (L.name) this.levelNames[L.id] = { name: L.name, teaches: L.teaches ?? '' };
    }
    /**
     * The running star total. Drawn as an SVG star, not the "★" character: neither Nunito nor
     * Lora carries U+2605, so a glyph here silently falls out of the brand fonts into whatever
     * the device happens to have — which on some Androids is an emoji star at a different
     * size and colour. Written only when it CHANGES: refresh() runs on every score event.
     */
    const tot = totalStars();
    if (tot !== this.shownTotalStars) {
      this.shownTotalStars = tot;
      this.el.levelTot.innerHTML = tot > 0 ? `${STAR_SVG}<span>${tot}</span>` : '';
    }
    this.el.foes.textContent = String(aliveVillains());
    this.el.score.textContent = world.score.toLocaleString('en-IN');

    const total = world.ammoQueue.length;
    const left = ammoLeft();
    if (this.el.pips.childElementCount !== total) {
      this.el.pips.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.className = 'pip';
        this.el.pips.appendChild(d);
      }
    }
    [...this.el.pips.children].forEach((d, i) => d.classList.toggle('spent', i >= left));
  }

  /**
   * Show / hide the tutorial line.
   *
   * `instant` skips the 0.4 s opacity transition. A LEVEL LOAD must use it, because a fade
   * is 400 ms during which "Drag back from the slingshot, then let go" is still legibly on
   * screen — and a hint fading out over level 2 is still a hint on level 2. That transient
   * is exactly what the orchestrator's probe caught (opacity .92 / .92 / .90 on l1 / l2 / l3)
   * at a moment when the class had already been removed correctly. The gate was right and
   * the RENDER was still wrong; only the render is what a player sees.
   *
   * The fade is kept for the in-play dismissal on l1, where it is the right feel.
   *
   * @returns {boolean} whether the hint is ACTUALLY on screen afterwards — measured, not assumed.
   */
  hint(on, text, { instant = false } = {}) {
    const el = this.el.hint;
    if (!el) return false;
    if (text) el.textContent = text;
    if (instant) {
      const prev = el.style.transition;
      el.style.transition = 'none';
      el.classList.toggle('on', !!on);
      void el.offsetWidth;              // flush the class change past the suppressed transition
      el.style.transition = prev;
    } else {
      el.classList.toggle('on', !!on);
    }
    return this.hintVisible();
  }

  /**
   * IS THE HINT ON SCREEN RIGHT NOW? The only honest answer to that question is a measured
   * one, so this is what `state().hintDone` is built on.
   *
   * `innerText` is NOT an answer: it respects `display:none` but ignores `opacity` and
   * `visibility:hidden`, and this element is hidden by opacity. That exact mistake nearly
   * produced a false negative on the bug this method exists for. So: live offsetParent
   * (catches a display:none ancestor), computed display / visibility / opacity, a non-zero
   * box, and an actual intersection with the viewport.
   */
  hintVisible() {
    const el = this.el.hint;
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    // offsetParent is null inside a display:none subtree (and for position:fixed, which this is not).
    if (!el.offsetParent && cs.position !== 'fixed') return false;
    if (!(parseFloat(cs.opacity) > 0.02)) return false;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
  }

  /**
   * WHAT THE HUD IS ACTUALLY DISPLAYING — text read back out of the DOM, not the values it
   * was handed. `state()` reports intent (`levelNumber: 3`); this reports render ("Level 3
   * of 3"). The two have already disagreed once on this project — the chip said "Level 1"
   * on level 3 while every hook happily reported 3 — and a hook that cannot see that
   * disagreement cannot be used to catch it.
   */
  readback() {
    const txt = (el) => (el ? (el.textContent || '').trim() : null);
    const sheetOn = (el) => !!el && el.classList.contains('on') &&
                            parseFloat(getComputedStyle(el).opacity) > 0.02;
    return {
      levelChip: txt(this.el.levelNo),
      levelName: txt(this.el.levelName),
      score: txt(this.el.score),
      foes: txt(this.el.foes),
      ammoPips: this.el.pips
        ? { total: this.el.pips.childElementCount,
            spent: [...this.el.pips.children].filter(d => d.classList.contains('spent')).length }
        : null,
      hintText: txt(this.el.hint),
      hintVisible: this.hintVisible(),
      endSheet: sheetOn(this.el.end),
      finishSheet: sheetOn(this.el.fin),
      /**
       * THE OVERLAY'S OWN NUMBERS, which are NOT `state().stars` and `state().score`.
       * The count-up and the star pops run on the wall clock (900 ms, then 180 ms a star),
       * so for nearly two seconds after a win the hook says "3 stars" while the panel shows
       * none. HOOKS.md has always warned critics about that gap in prose; these fields make
       * it a number, so a capture can wait on the render instead of guessing at a delay.
       */
      endStarsLit: this.el.stars.filter(s => s.classList.contains('on')).length,
      endScoreText: txt(this.el.endScore),
      endTitle: txt(this.el.endTitle),
      endEyebrow: txt(this.el.endEyebrow),
      /** What the primary button SAYS, beside what it will DO. Both, because they can drift. */
      primaryButton: { label: txt(this.el.next), action: this.nextAction },
    };
  }

  // -------------------------------------------------------------------------
  // LEVEL COMPLETE / FAILED
  // -------------------------------------------------------------------------
  showEnd(won, d = {}) {
    const {
      score = world.score, stars = 0, level = world.level?.id,
      teaches = world.level?.teaches ?? '',
    } = d;
    const n = levelNumber(level);
    const last = isLastLevel(level);
    const hasNext = !!nextLevel(level);
    const best = bestFor(level);

    this.el.endEyebrow.textContent = n ? `Level ${n} of ${LEVEL_ORDER.length}` : 'Probe level';
    this.el.endTitle.textContent = won ? 'Scammers busted' : 'They got away';
    this.el.endSub.textContent = won
      ? 'Nobody paid a processing fee today'
      : `Out of ammo — ${aliveVillains()} still standing`;

    /**
     * THE EDUCATIONAL PAYLOAD, and it is the LEVEL's line, not the villain's. The level owns
     * `teaches` (validated at load); the per-villain `fact` is the fallback and the generic
     * line the last resort. Shown after a LOSS too — the lesson is the point of the level, and
     * a student who ran out of ammo needs it more than one who cleared it.
     */
    this.el.endFact.textContent = teaches || this.lastFact || GENERIC_FACT;

    // Best-so-far and the running star total: progress stays visible without a level map.
    const bits = [];
    if (best && best.score > score) bits.push(`Best ${best.score.toLocaleString('en-IN')}`);
    if (totalStars() > 0) bits.push(`${totalStars()} of ${MAX_STARS} stars`);
    this.el.endMeta.textContent = bits.join('  ·  ');

    if (!won) {
      this.nextAction = 'restart';
      this.el.next.textContent = 'Try again';
      this.el.again.style.display = 'none';
    } else if (last) {
      this.nextAction = 'finish';
      this.el.next.textContent = 'See your results';
      this.el.again.style.display = '';
      this.el.again.textContent = stars < 3 ? 'Replay for 3★' : 'Replay';
    } else if (hasNext) {
      this.nextAction = 'next';
      this.el.next.textContent = 'Next level →';
      this.el.again.style.display = '';
      this.el.again.textContent = stars < 3 ? 'Replay for 3★' : 'Replay';
    } else {
      // A fixture, or an id outside the chain. Never offer a level that is not there.
      this.nextAction = 'restart';
      this.el.next.textContent = 'Play again';
      this.el.again.style.display = 'none';
    }

    // animated count-up, driven off the wall clock (pure presentation, never physics)
    this.tallyTarget = score;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      this.el.endScore.textContent = Math.round(this.tallyTarget * e).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(step);
      else this.el.stars.forEach((s, i) => setTimeout(() => s.classList.toggle('on', i < stars), i * 180));
    };
    this.el.stars.forEach(s => s.classList.remove('on'));
    requestAnimationFrame(step);
    this.el.end.classList.add('on');
  }

  hideEnd() { this.el.end.classList.remove('on'); }

  // -------------------------------------------------------------------------
  // THE FINISH STATE — a conclusion, not a fourth "play again"
  // -------------------------------------------------------------------------
  /**
   * Reached from the last level's overlay. It is the only screen that shows the whole run at
   * once: total stars out of nine, and every level's name, score and the line it taught. The
   * three `teaches` lines together ARE this game's deliverable, so they are restated here
   * rather than being left behind on three separate overlays the player has already dismissed.
   */
  showFinish() {
    const p = progress();
    const cleared = LEVEL_ORDER.filter(id => p.best[id]).length;

    this.el.finStars.textContent = String(totalStars());
    this.el.finTitle.textContent = cleared === LEVEL_ORDER.length
      ? 'You spotted every one' : 'Nearly there';
    this.el.finSub.textContent = cleared === LEVEL_ORDER.length
      ? 'Lottery, credit card, pyramid — all three sent packing.'
      : `${cleared} of ${LEVEL_ORDER.length} cleared. Replay any of them for a better score.`;

    this.renderRuns(p);
    this.fillLevelMeta();

    this.resetArmed = 0;
    this.el.finReset.textContent = 'Reset my progress';
    this.el.finReset.classList.remove('danger');
    this.el.fin.classList.add('on');
  }

  /** One finish row per level: name, stars, the line it taught, the score. */
  renderRuns(p = progress()) {
    this.el.finRuns.innerHTML = '';
    for (const id of LEVEL_ORDER) {
      const meta = this.levelNames[id] ?? LEVELS[id] ?? null;
      const b = p.best[id];
      const row = document.createElement('div');
      row.className = 'run' + (b ? '' : ' miss');
      const mk = (cls, text) => { const e = document.createElement('div'); e.className = cls; e.textContent = text; return e; };
      row.append(
        mk('nm', `${levelNumber(id)}. ${meta?.name ?? id}`),
        mk('st', starGlyphs(b?.stars ?? 0)),
        mk('tc', meta?.teaches ?? ''),
        mk('sc', b ? `${b.score.toLocaleString('en-IN')} pts` : 'not cleared'),
      );
      this.el.finRuns.appendChild(row);
    }
  }

  /**
   * THE FINISH PANEL USED TO SAY "2. l2" WITH NO LESSON UNDER IT.
   *
   * `levelNames` is filled as levels are PLAYED, and `LEVELS` is the loader's cache of levels
   * fetched THIS PAGE LOAD — so a player who cleared all three yesterday, reloaded, and
   * replayed only level 3 got a closing screen that named one level by its file id and
   * dropped a third of the teaching. The three `teaches` lines are the deliverable of this
   * game; the screen that gathers them cannot be the one that loses one.
   *
   * `loadLevelData` is memoised, validated and fetch-only (it builds nothing), so this is a
   * cheap top-up. It is fire-and-forget: the rows are already on screen with what is known,
   * and a failed fetch leaves them exactly as they are rather than blanking the panel.
   */
  fillLevelMeta() {
    const missing = LEVEL_ORDER.filter(id => !(this.levelNames[id] ?? LEVELS[id])?.name);
    if (!missing.length || this.metaFetch) return this.metaFetch;
    this.metaFetch = Promise.all(missing.map(id =>
      loadLevelData(id)
        .then(L => { if (L?.name) this.levelNames[id] = { name: L.name, teaches: L.teaches ?? '' }; })
        .catch(e => console.warn(`[hud] finish panel could not name level "${id}" — ${e.message}`))
    )).then(() => {
      this.metaFetch = null;
      if (this.el.fin.classList.contains('on')) this.renderRuns();
    });
    return this.metaFetch;
  }

  hideFinish() { this.el.fin.classList.remove('on'); }

  /**
   * ── THE LEVEL PICKER ──────────────────────────────────────────────────────
   * With three levels you could live without one: you finished a level, you pressed Next.
   * With six you cannot, and a player reported exactly that — stuck on level 4 with no way to
   * see the rest. `recordResult` only fires on a WIN, so the chain is strictly "clear this one
   * to reach the next", and nothing in the game ever let you jump.
   *
   * EVERY LEVEL IS OPENABLE, including ones not yet cleared, and that is a deliberate choice
   * for what this thing actually is. It is a teaching tool used in a classroom: a teacher
   * covering toxic debt this week needs to open the debt level now, not clear three levels in
   * front of the class first. Progress is still visible — each card shows the stars earned —
   * so the pull of finishing the chain survives; only the gate is gone.
   */
  showPicker() {
    const p = progress();
    const g = this.el.pickGrid;
    g.textContent = '';
    LEVEL_ORDER.forEach((id, i) => {
      const meta = this.levelNames[id] ?? LEVELS[id] ?? null;
      const best = p.best?.[id];
      const card = document.createElement('button');
      card.className = 'pick-card' + (id === world.level?.id ? ' now' : '');
      const stars = (best?.stars | 0);
      card.innerHTML =
        `<b>${i + 1}</b><span>${meta?.name ?? '\u2026'}</span>` +
        `<i>${stars ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '\u2606\u2606\u2606'}</i>`;
      card.onclick = () => { this.el.pick.classList.remove('on'); this.onPickLevel?.(id); };
      g.appendChild(card);
    });
    // Names come from levels that have been LOADED. Fetch any this session has not opened, so
    // the grid is not a column of ellipses on a fresh install — the same fix `fillLevelMeta`
    // makes for the finish panel.
    const missing = LEVEL_ORDER.filter(id => !(this.levelNames[id] ?? LEVELS[id])?.name);
    if (missing.length) {
      Promise.all(missing.map(id => loadLevelData(id).catch(() => null)))
        .then(() => { if (this.el.pick.classList.contains('on')) this.showPicker(); });
    }
    this.el.pick.classList.add('on');
  }

  /**
   * RESETTING IS DESTRUCTIVE, SO IT TAKES TWO TAPS. No browser `confirm()` — it is blocked in
   * some embedders and looks like a different application. The arm expires after 4 s so a
   * stray first tap cannot sit waiting to be completed much later.
   *
   * It also tells the truth about storage: if saving never worked (private browsing, site data
   * blocked), say the reset did not persist rather than claiming a save that cannot happen.
   */
  tapReset() {
    const now = performance.now();
    if (!this.resetArmed || now - this.resetArmed > 4000) {
      this.resetArmed = now;
      this.el.finReset.textContent = 'Tap again to erase';
      this.el.finReset.classList.add('danger');
      setTimeout(() => {
        if (this.resetArmed && performance.now() - this.resetArmed > 3900) {
          this.resetArmed = 0;
          this.el.finReset.textContent = 'Reset my progress';
          this.el.finReset.classList.remove('danger');
        }
      }, 4100);
      return { ok: true, armed: true };
    }
    this.resetArmed = 0;
    const r = this.onResetProgress?.() ?? { ok: false, reason: 'no reset handler wired' };
    this.levelNames = {};
    this.refresh();
    this.showFinish();                        // re-render the (now empty) rows and total
    this.el.finReset.classList.remove('danger');
    this.el.finReset.textContent = progressStorage.available === false
      ? 'Cleared (this device does not save)'
      : 'Progress cleared';
    return r;
  }
}

function speakerSvg(on) {
  return on
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`;
}
