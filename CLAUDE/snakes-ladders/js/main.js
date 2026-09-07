/* main.js — boot, and the two things that must work even when nothing else does:
   a WebGL capability check that reveals the written board instead of a black
   canvas, and an error handler that captures into window.__SNL.errors and shows
   a kind line instead of a white screen. */

import { hasWebGL, DEBUG } from './config.js';
import * as game from './game.js';
import { publishTextScale } from './ui.js';

/* ── the type scale, owned here so it is live BEFORE the first paint ────
   It used to be published only when the HUD mounted, which is after the
   setup screen has already drawn. On a 1920x1080 projector that left the
   whole first screen — title, lead line, player plaques, trust line — at a
   flat 16px while the in-game chrome scaled to 22-40px. The teacher's first
   screen was the one screen that never scaled. */
publishTextScale();
window.addEventListener('resize', publishTextScale);
window.addEventListener('orientationchange', publishTextScale);

/* ── the probe API exists before anything can fail ────────────────────── */
const api = game.getDebugApi();
const errors = api.errors;
window.__SNL = api;

/* ── error capture ────────────────────────────────────────────────────── */
function capture(where, err) {
  const msg = (err && (err.stack || err.message)) || String(err);
  if (errors.length < 60) errors.push(where + ': ' + msg);
  if (DEBUG) console.error('[' + where + ']', err);
}
window.addEventListener('error', (e) => capture('error', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => capture('unhandledrejection', e.reason));

/* ── the friendly fallback ────────────────────────────────────────────── */
let fellBack = false;
function fallback(reason) {
  if (fellBack) return;
  fellBack = true;
  capture('fallback', reason || 'unknown');
  const nw = document.getElementById('snl-nowebgl');
  const boot = document.getElementById('snl-boot');
  const canvas = document.getElementById('snl-canvas');
  if (canvas) canvas.style.display = 'none';
  if (nw) {
    nw.style.display = 'block';
    const h1 = nw.querySelector('h1');
    if (h1 && reason && reason.webgl === false) h1.textContent = '3D board yahan nahi khul paaya';
    try { nw.focus?.(); } catch { /* fine */ }
  }
  if (boot) { boot.classList.add('is-gone'); boot.setAttribute('aria-hidden', 'true'); }
  window.__snlLoaded?.();
}

/* ── boot ─────────────────────────────────────────────────────────────── */
(async () => {
  try {
    if (!hasWebGL()) { fallback({ webgl: false }); return; }
    await game.startGame();
  } catch (e) {
    capture('boot', e);
    fallback(e);
  }
})();
