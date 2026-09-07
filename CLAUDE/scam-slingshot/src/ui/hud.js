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
 */

import { on } from '../events.js';
import { world, ammoLeft, aliveVillains } from '../world.js';

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
#hud-left  { display:flex; flex-direction:column; gap:7px; align-items:flex-start; }
#hud-right { display:flex; flex-direction:column; gap:7px; align-items:flex-end; }

#level-chip { padding:7px 13px; font-family:var(--font-display); font-size:14px; font-weight:700;
  letter-spacing:.2px; display:flex; align-items:center; gap:8px; }
#level-chip b { color:var(--teal); font-family:var(--font-ui); font-weight:800;
  font-size:11px; letter-spacing:.10em; text-transform:uppercase; opacity:.95 }

#ammo-rail { padding:8px 11px; display:flex; align-items:center; gap:7px; }
.pip { width:15px; height:15px; border-radius:50%;
  background:radial-gradient(circle at 34% 30%, #6fe0cd, var(--teal) 62%, #16645a);
  box-shadow:0 2px 5px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5);
  transition:transform .22s cubic-bezier(.3,1.6,.5,1), opacity .22s, filter .22s; }
.pip.spent { opacity:.22; filter:grayscale(1); transform:scale(.62); }
#ammo-rail span { font-size:10.5px; letter-spacing:.11em; text-transform:uppercase;
  opacity:.62; font-weight:800; margin-right:2px; }

#score-chip { padding:7px 13px; text-align:right; }
#score-chip .n { font-size:19px; font-weight:900; letter-spacing:.3px; font-variant-numeric:tabular-nums;
  display:block; line-height:1.06 }
#score-chip .l { font-size:9.5px; letter-spacing:.13em; text-transform:uppercase; opacity:.6; font-weight:800 }

#foes-chip { padding:6px 11px; display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:800 }
#foes-chip i { width:11px; height:11px; border-radius:50%; background:var(--coral);
  box-shadow:0 0 0 2.5px rgba(231,111,81,.24); display:inline-block; font-style:normal }

#btn-mute { pointer-events:auto; width:38px; height:38px; border-radius:12px; border:0;
  display:grid; place-items:center; cursor:pointer; color:var(--cream);
  background:linear-gradient(180deg, rgba(26,58,92,.9), rgba(18,42,68,.9));
  box-shadow:0 8px 20px rgba(6,18,32,.36), inset 0 1px 0 rgba(255,255,255,.16); }
#btn-mute:active { transform:translateY(1px) }
#btn-mute svg { width:19px; height:19px }

/* ---------- hint ---------- */
#hint { position:absolute; left:50%; bottom:calc(16px + env(safe-area-inset-bottom));
  transform:translateX(-50%); padding:9px 16px; font-size:13px; font-weight:700;
  opacity:0; transition:opacity .4s ease; letter-spacing:.1px; }
#hint.on { opacity:.92 }

/* ---------- end overlay ---------- */
#end { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none;
  opacity:0; transition:opacity .34s ease; padding:18px }
#end.on { opacity:1; pointer-events:auto }
#end .scrim { position:absolute; inset:0; background:radial-gradient(120% 90% at 50% 40%,
  rgba(10,26,44,.30), rgba(8,20,34,.72)); }
#end .panel { position:relative; width:min(420px, 92vw); padding:26px 24px 20px; text-align:center;
  border-radius:22px; transform:translateY(16px) scale(.96);
  transition:transform .42s cubic-bezier(.2,1.5,.4,1); }
#end.on .panel { transform:none }
#end h2 { font-family:var(--font-display); font-size:29px; margin:0 0 2px; font-weight:700 }
#end .sub { font-size:13px; opacity:.72; margin:0 0 16px; font-weight:600 }
#end .tally { display:flex; justify-content:center; align-items:baseline; gap:8px; margin:2px 0 14px }
#end .tally .n { font-size:40px; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:-.5px;
  color:var(--teal); text-shadow:0 3px 0 rgba(0,0,0,.22) }
#end .tally .u { font-size:12px; letter-spacing:.14em; text-transform:uppercase; opacity:.6; font-weight:800 }
#end .stars { display:flex; justify-content:center; gap:9px; margin:0 0 16px }
#end .stars i { width:34px; height:34px; display:block; opacity:.22; transform:scale(.7);
  transition:opacity .3s, transform .45s cubic-bezier(.2,1.7,.4,1) }
#end .stars i.on { opacity:1; transform:none }
#end .fact { font-size:12.5px; line-height:1.55; opacity:.85; background:rgba(42,157,143,.14);
  border:1px solid rgba(42,157,143,.32); border-radius:13px; padding:11px 13px; margin:0 0 17px;
  text-align:left }
#end .fact b { color:var(--teal); display:block; font-size:10px; letter-spacing:.13em;
  text-transform:uppercase; margin-bottom:4px }
#end .row { display:flex; gap:10px; justify-content:center }
#end button { pointer-events:auto; border:0; cursor:pointer; font-family:var(--font-ui);
  font-weight:800; font-size:14px; letter-spacing:.2px; padding:12px 22px; border-radius:14px;
  color:#08202e; background:linear-gradient(180deg,#5fd6c4,var(--teal));
  box-shadow:0 8px 18px rgba(8,40,36,.4), inset 0 1px 0 rgba(255,255,255,.5); }
#end button.ghost { color:var(--cream); background:rgba(255,255,255,.10);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.20) }
#end button:active { transform:translateY(1px) }
`;

const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95z"/></svg>`;

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
          <div class="card" id="level-chip"><b>Level 1</b><span id="level-name">—</span></div>
          <div class="card" id="ammo-rail"><span>Ammo</span><div id="pips"></div></div>
        </div>
        <div id="hud-right">
          <div class="card" id="score-chip"><span class="n" id="score">0</span><span class="l">Score</span></div>
          <div class="card" id="foes-chip"><i></i><span id="foes">0</span> scammers left</div>
          <button id="btn-mute" aria-label="Toggle sound">${speakerSvg(true)}</button>
        </div>
      </div>
      <div class="card" id="hint">Drag back from the slingshot, then let go</div>
      <div id="end">
        <div class="scrim"></div>
        <div class="card panel">
          <h2 id="end-title">Level clear</h2>
          <p class="sub" id="end-sub">Every scammer sent packing</p>
          <div class="stars">
            <i data-i="0">${STAR_SVG}</i><i data-i="1">${STAR_SVG}</i><i data-i="2">${STAR_SVG}</i>
          </div>
          <div class="tally"><span class="n" id="end-score">0</span><span class="u">points</span></div>
          <div class="fact" id="end-fact"><b>What that was</b><span id="end-fact-text"></span></div>
          <div class="row">
            <button id="btn-again" class="ghost">Try again</button>
            <button id="btn-next">Play again</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ui);

    this.el = {
      pips: ui.querySelector('#pips'),
      score: ui.querySelector('#score'),
      foes: ui.querySelector('#foes'),
      levelName: ui.querySelector('#level-name'),
      hint: ui.querySelector('#hint'),
      end: ui.querySelector('#end'),
      endTitle: ui.querySelector('#end-title'),
      endSub: ui.querySelector('#end-sub'),
      endScore: ui.querySelector('#end-score'),
      endFact: ui.querySelector('#end-fact-text'),
      stars: [...ui.querySelectorAll('#end .stars i')],
      mute: ui.querySelector('#btn-mute'),
      again: ui.querySelector('#btn-again'),
      next: ui.querySelector('#btn-next'),
    };

    this.shownScore = 0;
    this.tallyTarget = 0;
    this.tallyT = -1;
    this.lastFact = '';
    this.onRestart = null;

    this.el.again.onclick = () => this.onRestart?.();
    this.el.next.onclick = () => this.onRestart?.();
    this.el.mute.onclick = () => {
      const m = world.audio?.setMute(!world.audio.muted) ?? false;
      this.el.mute.innerHTML = speakerSvg(!m);
    };

    on('score', () => this.refresh());
    on('villainDefeated', ({ fact }) => { if (fact) this.lastFact = fact; this.refresh(); });
    on('ammoSpent', () => this.refresh());
    on('launch', () => { this.hint(false); this.refresh(); });
    // refresh() first: the win handler adds the unused-ammo bonus to world.score, and a HUD
    // still showing the pre-bonus number next to an overlay showing the post-bonus one is the
    // kind of tiny inconsistency that makes a game feel untrustworthy.
    on('levelWon', (d) => { this.refresh(); this.showEnd(true, d); });
    on('levelLost', (d) => { this.refresh(); this.showEnd(false, d); });
    on('levelLoaded', () => { this.hideEnd(); this.lastFact = ''; this.refresh(); });
  }

  refresh() {
    const L = world.level;
    if (L) this.el.levelName.textContent = L.name ?? L.id;
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

  hint(on, text) {
    if (text) this.el.hint.textContent = text;
    this.el.hint.classList.toggle('on', !!on);
  }

  showEnd(won, { score = world.score, stars = 0 } = {}) {
    this.el.endTitle.textContent = won ? 'Scammers busted' : 'They got away';
    this.el.endSub.textContent = won
      ? 'Nobody paid a processing fee today'
      : 'Out of ammo — and Uncle is still smiling';
    this.el.endFact.textContent = this.lastFact ||
      'A prize you never entered is not a prize. It is a bill.';
    this.el.next.textContent = won ? 'Play again' : 'Try again';
    this.el.again.textContent = 'Replay for 3★';
    this.el.again.style.display = won ? '' : 'none';

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
}

function speakerSvg(on) {
  return on
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`;
}
