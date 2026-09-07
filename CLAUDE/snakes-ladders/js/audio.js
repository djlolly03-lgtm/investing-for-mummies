/* audio.js — every sound in Saanp Seedhi, synthesised in WebAudio. No asset files, ever.
   DESIGN.md §8 · config.js §10.

   The brief, in one line: a wooden board on a table in a living room. Warm, quiet,
   domestic. Nothing metallic-bright, nothing above ~4 kHz sharp, nothing that would
   embarrass someone playing on a bus. If a sound could be mistaken for a slot machine,
   a coin or a cash register it does not ship.

   Every sound has a visual twin elsewhere in the build — the game is 100% playable and
   100% comprehensible on mute, which is how half the classrooms will play it. So every
   function here silently no-ops if there is no AudioContext, if the context died, or if
   the player has muted. Audio never throws into the game loop.

   Signal chain:
     voice ─┬─> busDuck ──┐
            └─> busDry  ──┴─> master(mute/volume) -> highshelf -3.5dB@2.6k
                                -> lowpass 4kHz (the "nothing sharp" ceiling)
                                -> compressor (gentle limiter) -> destination
   Six voices maximum, oldest stolen. */

import { CFG, dur } from './config.js';
import { makeRng, clamp, prefersReducedMotion, emitter } from './util.js';

/* ── 0. tunables, merged over config.js so a missing key can never crash ──────── */
const DEBUG = !!(CFG && CFG.DEBUG);
const A = { master: 0.90, defaultMuted: false, duckTo: 0.30, duckMs: 260, ceilingHz: 4000,
            ...(CFG && CFG.audio ? CFG.audio : {}) };
const SFX = (A.sfx || {});
const P = (k, d) => ({ ...d, ...(SFX[k] || {}) });

const Pdice  = P('dice',      { dur: 700, gain: .28, impulses: 9, burstMs: 12, bandHz: 900, bandQ: 1.4, clickHz: 180, clickGain: .08 });
const Pland  = P('land',      { dur: 90,  gain: .30, bandHz: 1100, bandQ: 2, blipHz: 220, blipDecayMs: 40, blipType: 'triangle' });
const Phop   = P('hopStep',   { dur: 40,  gain: .34, freq: 520, type: 'triangle', lowpassHz: 2000 });
const Plad   = P('ladder',    { dur: 1100, gain: .30, stringHz: 300, damping: .4, notes: 4, runMs: 900, scale: [0, 2, 4, 7, 9], ringHz: 880 });
const Psnk   = P('snake',     { dur: 1100, gain: .32, freq: 260, type: 'sawtooth', sweepHz: [1400, 380], sweepMs: 900, thumpHz: 110, thumpMs: 90, thumpDrop: .15 });
const Pshd   = P('shield',    { dur: 700, gain: .42, thumpHz: 110, thumpMs: 90, bellHz: 1320, bellIndex: 3, bellMs: 140, releaseHz: [660, 880], releaseMs: 220 });
const Plsn   = P('lesson',    { dur: 60,  gain: .12, freq: 440 });
const Pcor   = P('correct',   { dur: 300, gain: .28, freq: 988 });
const Pwrg   = P('wrong',     { dur: 60,  gain: .18, freq: 190, lowpassHz: 900 });
const Pmil   = P('milestone', { dur: 900, gain: .34, freq: 660, inharmonic: [1, 2.76, 5.40] });
const Pevt   = P('event',     { dur: 400, gain: .26, freq: 140, lowpassHz: [700, 260], lowpassMs: 400 });
const Pwho   = P('whoosh',    { dur: 120, gain: .16, highpassHz: 600 });
const Pclk   = P('click',     { dur: 25,  gain: .14, freq: 700 });
const Psix   = P('six',       { dur: 260, gain: .20, freq: [587, 784] });
const Pwin   = P('win',       { dur: 1600, gain: .38, freqs: [130, 195, 260], detune: 6, type: 'sawtooth', lowpassHz: [200, 2600], openMs: 900, bellHz: 660, bellDelayMs: 400 });

/* The die's overshoot bounce, after the tumble ends. The clack belongs on the impact,
   not on the end of the tumble. config §9 #10: "number legible at 840ms". */
const DICE_SETTLE = (CFG && CFG.timing && CFG.timing.diceSettle) || 140;

const MAX_VOICES = 6;
const EPS = 0.0001;
/* Our own key. 'snl.prefs.v1' belongs to setup/ui and two agents must never
   read-modify-write one blob. Mute lives here and only here. */
const MUTE_KEY = 'snl.audio.v1';

const hub = emitter();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ── 1. state ─────────────────────────────────────────────────────────────────── */
let ctx = null, master = null, busDuck = null, busDry = null;
let ready = false, dead = false;
let muted = readMuted();
let voiceOn = !!(A.voice && A.voice.enabled);

function store(v) { try { localStorage.setItem(MUTE_KEY, v); } catch (e) { /* embedded contexts throw */ } }
function readMuted() {
  let v = null;
  try { v = localStorage.getItem(MUTE_KEY); } catch (e) { v = null; }
  return v === null ? !!A.defaultMuted : v === '1';
}

/* ── 2. lifecycle ─────────────────────────────────────────────────────────────── */

/** Create the one shared AudioContext. MUST be called from a user gesture
 *  (DESIGN.md §2 — the first setup tap). Idempotent, and safe to call again to
 *  re-resume a context iOS suspended behind our back. Returns the ctx or null. */
export function initAudio() {
  if (dead) return null;
  if (ready) { resume(); return ctx; }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) { dead = true; return null; }
  try {
    ctx = new AC({ latencyHint: 'interactive' });

    master  = ctx.createGain();  master.gain.value = muted ? 0 : A.master;
    busDuck = ctx.createGain();  busDuck.gain.value = 1;
    busDry  = ctx.createGain();  busDry.gain.value = 1;

    // the warmth pass: shelve the top off everything, then a hard-ish ceiling at 4k
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf'; shelf.frequency.value = 2600; shelf.gain.value = -3.5;
    const ceiling = ctx.createBiquadFilter();
    ceiling.type = 'lowpass'; ceiling.frequency.value = A.ceilingHz; ceiling.Q.value = 0.4;

    // a gentle limiter so two sounds landing together never spike a phone speaker
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5;
    comp.attack.value = 0.005;  comp.release.value = 0.20;

    busDuck.connect(master); busDry.connect(master);
    master.connect(shelf); shelf.connect(ceiling); ceiling.connect(comp);
    comp.connect(ctx.destination);

    unlock();
    ready = true;
  } catch (e) {
    if (DEBUG) console.error('[audio] init failed', e);
    dead = true; ctx = null; master = busDuck = busDry = null;
    return null;
  }
  return ctx;
}

/* iOS/Safari: a context born outside a gesture starts suspended, and stays suspended
   until something actually plays. A one-sample silent buffer is the accepted unlock. */
function unlock() {
  try {
    const b = ctx.createBuffer(1, 1, ctx.sampleRate);
    const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) { /* no-op */ }
  resume();
}
function resume() {
  try { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch (e) { /* no-op */ }
}

/* Belt and braces: game.js calls initAudio() on the setup tap, but if any other
   gesture gets there first we take it. Capture-phase, passive, once. */
if (typeof window !== 'undefined' && window.addEventListener) {
  const evts = ['pointerdown', 'touchend', 'keydown'];
  const arm = () => { initAudio(); evts.forEach(e => window.removeEventListener(e, arm, true)); };
  evts.forEach(e => window.addEventListener(e, arm, { capture: true, passive: true }));
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  }
}

export function isReady() { return ready && !dead; }
export function getContext() { return ctx; }

/** True when it is worth building nodes at all. */
function live() {
  if (!ready || dead || !ctx || muted) return false;
  if (ctx.state === 'closed') return false;
  if (ctx.state === 'suspended') resume();   // scheduled work fires the moment it resumes
  return true;
}

/* ── 3. mute (persisted) ──────────────────────────────────────────────────────── */
export function isMuted() { return muted; }
export function setMuted(b) {
  const next = !!b;
  if (next === muted) return muted;
  muted = next;
  store(muted ? '1' : '0');
  if (ready && master && ctx) {
    try {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(muted ? 0 : A.master, t + 0.08);
    } catch (e) { /* no-op */ }
  }
  if (muted) {
    stopAll();
    /* SpeechSynthesis does NOT go through master — ramping master to 0 does nothing to
       it. A facilitator who taps the mute chip mid-utterance would otherwise keep
       hearing the Hinglish voice at full volume, which is precisely the thing §8 says
       makes people mute the app for good. */
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* no-op */ }
  }
  hub.emit('mute', muted);
  return muted;
}
export function toggleMuted() { return setMuted(!muted); }
/** ui.js subscribes so the 44dp speaker chip always matches reality. */
export function onMuteChange(fn) { return hub.on('mute', fn); }

export function setMasterVolume(v) {
  A.master = clamp(Number(v) || 0, 0, 1);
  if (ready && master && !muted) { try { master.gain.value = A.master; } catch (e) { /* no-op */ } }
  return A.master;
}

/* ── 4. ducking — §8 "all audio ducks to 30% for 260ms so nothing competes with
       reading". Overlapping ducks extend rather than fight. ───────────────────── */
let duckUntil = 0;
export function duckFor(ms = A.duckMs) {
  if (!ready || dead || !ctx || !busDuck) return;
  try {
    const t = ctx.currentTime;
    const to = Math.max(EPS, A.duckTo);
    const end = t + Math.max(60, Number(ms) || A.duckMs) / 1000;
    if (end <= duckUntil) return;
    duckUntil = end;
    busDuck.gain.cancelScheduledValues(t);
    busDuck.gain.setValueAtTime(Math.max(busDuck.gain.value, EPS), t);
    busDuck.gain.exponentialRampToValueAtTime(to, t + 0.06);
    busDuck.gain.setValueAtTime(to, end);
    busDuck.gain.exponentialRampToValueAtTime(1, end + 0.14);
  } catch (e) { /* no-op */ }
}

/* ── 5. the voice pool — never more than six, steal the oldest ────────────────── */
const voices = [];

function detach(v) {
  for (const s of v.srcs) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} }
  try { v.g.disconnect(); } catch (e) {}
  v.srcs.length = 0;
}
function reap(v) { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); }
function gc() {
  const t = ctx.currentTime;
  for (let i = voices.length - 1; i >= 0; i--) if (voices[i].until <= t) { detach(voices[i]); voices.splice(i, 1); }
}
function steal(v) {
  try {
    const t = ctx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(Math.max(v.g.gain.value, EPS), t);
    v.g.gain.exponentialRampToValueAtTime(EPS, t + 0.02);   // 20ms fade, never a click
  } catch (e) { /* no-op */ }
  reap(v);
  setTimeout(() => detach(v), 60);
}
function alloc(ms, dry) {
  if (!live()) return null;
  gc();
  while (voices.length >= MAX_VOICES) {
    let oldest = voices[0];
    for (const v of voices) if (v.start < oldest.start) oldest = v;
    steal(oldest);
  }
  const g = ctx.createGain();
  g.gain.value = 1;
  g.connect(dry ? busDry : busDuck);
  const v = { g, start: ctx.currentTime, until: ctx.currentTime + (ms / 1000) + 0.20, srcs: [],
              add(n) { this.srcs.push(n); return n; } };
  voices.push(v);
  return v;
}
export function stopAll() {
  if (!ctx) return;
  for (const v of voices.slice()) { reap(v); detach(v); }
}

/* ── 6. synthesis primitives ──────────────────────────────────────────────────── */

/* attack -> optional hold -> decay, all exponential so it never clicks */
function shape(param, t, peak, aMs, dMs, holdMs = 0) {
  const pk = Math.max(peak, EPS * 2);
  param.setValueAtTime(EPS, t);
  param.exponentialRampToValueAtTime(pk, t + aMs / 1000);
  if (holdMs > 0) param.setValueAtTime(pk, t + (aMs + holdMs) / 1000);
  param.exponentialRampToValueAtTime(EPS, t + (aMs + holdMs + dMs) / 1000);
}

/* Warm noise, not hiss: white through a one-pole lowpass. This is the difference
   between "wood in a cupped hand" and "static". Built once, reused everywhere.
   The make-up gain has to be soft-clipped, not hard-clipped: at x2.1 into a ±1 clamp
   one sample in nine was squared off, which puts back exactly the high-frequency grit
   the one-pole existed to remove — under dice, tock, the hop transient, whoosh and
   wrong, i.e. under every wooden sound in the product. tanh is the same loudness with
   no discontinuity. */
let _noise = null;
function noiseBuffer() {
  if (_noise) return _noise;
  const sr = ctx.sampleRate, len = Math.floor(sr * 1.2);
  const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
  const rng = makeRng(7);
  let y = 0;
  for (let i = 0; i < len; i++) { const x = rng() * 2 - 1; y += 0.42 * (x - y); d[i] = Math.tanh(y * 2.4); }
  _noise = b;
  return b;
}

function burst(v, t, ms, o) {
  const { hz = 900, q = 1.4, gain = 0.3, type = 'bandpass', attack = 0 } = o || {};
  const s = v.add(ctx.createBufferSource());
  s.buffer = noiseBuffer();
  s.playbackRate.value = 0.85 + Math.random() * 0.3;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = hz; f.Q.value = q;
  const g = ctx.createGain();
  s.connect(f); f.connect(g); g.connect(v.g);
  const a = attack || Math.min(4, ms * 0.25);
  shape(g.gain, t, gain, a, ms);
  const off = Math.random() * 0.8;
  s.start(t, off, ms / 1000 + 0.08);
  try { s.stop(t + ms / 1000 + 0.09); } catch (e) { /* no-op */ }
  return { s, f, g };
}

function tone(v, t, o) {
  const { freq = 440, type = 'triangle', ms = 120, gain = 0.3, attack = 3,
          lowpass = 0, detune = 0, glideTo = 0, glideMs = 0, hold = 0 } = o || {};
  const osc = v.add(ctx.createOscillator());
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (detune) osc.detune.value = detune;
  if (glideTo && glideMs) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + glideMs / 1000);
  let node = osc;
  if (lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass; f.Q.value = 0.6;
    osc.connect(f); node = f;
  }
  const g = ctx.createGain();
  node.connect(g); g.connect(v.g);
  shape(g.gain, t, gain, attack, ms, hold);
  osc.start(t);
  try { osc.stop(t + (attack + hold + ms) / 1000 + 0.10); } catch (e) { /* no-op */ }
  return { osc, g };
}

/* A struck/plucked string. True Karplus-Strong, rendered into a buffer in JS so it
   costs nothing at play time, with an extra one-pole in the loop so it reads as wood
   and gut rather than steel wire. Cached — a session builds ~10 of these, total. */
const pluckCache = new Map();
function pluckBuffer(freq, damping) {
  const key = Math.round(freq) + ':' + Math.round(damping * 100);
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const secs = clamp(1.45 - damping, 0.35, 1.6);
  const N = Math.max(2, Math.round(sr / Math.max(40, freq)));
  const len = Math.ceil(sr * secs);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const rng = makeRng(Math.round(freq * 13) + 1);
  const line = new Float32Array(N);
  let y = 0;
  for (let i = 0; i < N; i++) { const x = rng() * 2 - 1; y += 0.55 * (x - y); line[i] = y; }  // a soft pick, not a click
  const decay = Math.pow(0.001, 1 / (sr * secs));
  let idx = 0, prev = 0, peak = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    out[i] = cur;
    if (Math.abs(cur) > peak) peak = Math.abs(cur);
    const avg = 0.5 * (cur + line[(idx + 1) % N]);
    prev += 0.8 * (avg - prev);
    line[idx] = prev * decay;
    idx = (idx + 1) % N;
  }
  const k = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.min(len, Math.floor(sr * 0.04));
  for (let i = 0; i < len; i++) {
    let s = out[i] * k;
    if (i > len - fade) s *= (len - i) / fade;
    out[i] = s;
  }
  if (pluckCache.size > 20) pluckCache.clear();
  pluckCache.set(key, buf);
  return buf;
}
function pluck(v, t, freq, gain, damping = 0.4, cutMs = 0) {
  const s = v.add(ctx.createBufferSource());
  s.buffer = pluckBuffer(freq, damping);
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(gain, EPS), t);
  s.connect(g); g.connect(v.g);
  s.start(t);
  const end = cutMs > 0 ? Math.min(cutMs / 1000, s.buffer.duration) : s.buffer.duration;
  if (cutMs > 0) {
    g.gain.setValueAtTime(Math.max(gain, EPS), t + end * 0.55);
    g.gain.exponentialRampToValueAtTime(EPS, t + end);
  }
  try { s.stop(t + end + 0.02); } catch (e) { /* no-op */ }
  return g;
}

/* A bell is inharmonic partials with shorter lives the higher they sit. Additive
   rather than FM here because a real temple bell IS additive, and it lets us keep
   every partial under the 4 kHz ceiling on purpose rather than by accident. */
function bell(v, t, base, ms, gain, partials) {
  const ps = partials || [1, 2.76, 5.40];
  for (let i = 0; i < ps.length; i++) {
    const f = base * ps[i];
    if (f > 4600) continue;                       // never sharp — §8
    const osc = v.add(ctx.createOscillator());
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.detune.value = i % 2 ? 4 : -4;            // a touch of detune for warmth
    const g = ctx.createGain();
    osc.connect(g); g.connect(v.g);
    const life = ms * (i === 0 ? 1 : 0.62 / Math.sqrt(ps[i]));
    shape(g.gain, t, gain * (i === 0 ? 1 : 0.45 / ps[i]), 3, life);
    osc.start(t);
    try { osc.stop(t + life / 1000 + 0.08); } catch (e) { /* no-op */ }
  }
}

/* Two-operator FM — used only for the shield "tunk", the one deliberately metallic
   sound in the product. Its FUNDAMENTAL is 1.32 kHz, but FM is not a fundamental: at
   carrier 1320, ratio 1.4, index 3 the significant sidebands run 1320 / 3168 / 5016 /
   6864 Hz, so the file's old claim that it "sits under the ceiling" was simply false.
   Two things fix that without losing the bite. (1) The index collapses in a third of
   the note, so the bright sidebands are a ~45ms strike transient — which is what a
   struck brass lota actually does — instead of 140ms of sustained sizzle. (2) A gentle
   3.2 kHz lowpass on the carrier, in series with the master 4 kHz ceiling, so the
   surviving upper sidebands are attenuated here rather than only at the very end. */
function fmTunk(v, t, carrier, ratio, index, ms, gain) {
  const c = v.add(ctx.createOscillator());
  const m = v.add(ctx.createOscillator());
  c.type = 'sine'; c.frequency.value = carrier;
  m.type = 'sine'; m.frequency.value = carrier * ratio;
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(carrier * index, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(carrier * index * 0.04, EPS), t + ms * 0.34 / 1000);
  m.connect(mg); mg.connect(c.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.5;
  const g = ctx.createGain();
  c.connect(lp); lp.connect(g); g.connect(v.g);
  shape(g.gain, t, gain, 2, ms);
  c.start(t); m.start(t);
  try { c.stop(t + ms / 1000 + 0.08); m.stop(t + ms / 1000 + 0.08); } catch (e) { /* no-op */ }
}

const T0 = () => ctx.currentTime + 0.001;

/* ── 7. the sounds ────────────────────────────────────────────────────────────── */

/* THE HOP RUN. The most important sound in the build: half the table is not looking
   at the screen, and the tik is how four people count the roll together (§8).
   Each length is a complete musical gesture that resolves, and — this is the whole
   point — every length ends on a DIFFERENT and HIGHER chord tone, so the ear tells a
   2 from a 4 without anybody counting. Terminal pitches from the 520 Hz base:
     1 -> 520 Sa · 2 -> 655 Ga · 3 -> 779 Pa · 4 -> 1040 Sa' · 5 -> 1310 Ga' · 6 -> 1560 Pa'
   All chord tones, all strictly rising, all under the 4 kHz ceiling.
   (The old table ended 2, 3 and 4 on the same 779 Hz and put a 5 on the sixth — the one
   pentatonic degree that does not resolve — so half the dice faces sounded identical.) */
const HOP_RUNS = {
  1: [0],
  2: [0, 4],
  3: [0, 4, 7],
  4: [0, 2, 4, 12],
  5: [0, 2, 4, 7, 16],
  6: [0, 2, 4, 7, 9, 19],
};
const PENTA = [0, 2, 4, 7, 9];
function hopSemis(i, total) {
  const run = HOP_RUNS[total];
  if (run) return run[clamp(i, 0, run.length - 1)];
  const n = Math.max(0, i | 0);
  return PENTA[n % 5] + 12 * Math.floor(n / 5);
}
const HOP_GAP = Math.max(320, ((CFG && CFG.timing && CFG.timing.hopPerCell) || 165) * 2.6);
let hopIdx = 0, hopLast = -1e9, hopTotal = 0;
/* A forward move ARMS the run — game.js calls resetHopRun() before hopAlong(). A Jhatka
   setback walks the token backwards through the very same hopAlong and never resets, so
   an unarmed run plays the identical interval shape inverted: falling, not climbing.
   §8 is explicit that the event is "serious, never comic"; a rising major-pentatonic
   climb over a player losing ground is the audio laughing at her. */
let hopArmed = false, hopArmedAt = -1e9, hopDesc = false;
/* The arming expires: if a move is cancelled between resetHopRun() and its first hop
   (a game torn down mid-turn, say) a stale flag must not make the NEXT setback climb. */
const HOP_ARM_TTL = 3000;

/** Reset the rising run. game.js may call it at the start of a move; if it doesn't,
 *  a gap longer than ~2.5 hops resets it anyway. Calling this is also what marks the
 *  run as forward — an un-reset run falls instead of rising. */
export function resetHopRun(total = 0) {
  hopIdx = 0; hopTotal = total | 0; hopLast = -1e9;
  hopArmed = true; hopArmedAt = now();
}

/* a short soft wooden tick — a bead dropped on a board */
function _hopStep(i, total) {
  const tNow = now();
  let n;
  if (typeof i === 'number' && i >= 0) { n = i | 0; hopIdx = n + 1; }
  else { if (tNow - hopLast > HOP_GAP) { hopIdx = 0; hopTotal = 0; } n = hopIdx++; }
  hopLast = tNow;
  if (typeof total === 'number' && total > 0) hopTotal = total | 0;
  if (n === 0) { hopDesc = !(hopArmed && tNow - hopArmedAt < HOP_ARM_TTL); hopArmed = false; }

  const f = Phop.freq * Math.pow(2, (hopDesc ? -1 : 1) * hopSemis(n, hopTotal) / 12);
  const v = alloc(180); if (!v) return;
  const t = T0();
  // The wooden "t" of the attack, then the pitched body, then a detuned sine for warmth.
  // Both lowpasses TRACK f. With fixed cutoffs the top of a 6 sat entirely above the
  // 2 kHz body filter while its 1040 Hz warmth sine sat below its own 900 Hz filter —
  // so the run got thinner and duller exactly where it is supposed to feel biggest.
  burst(v, t, 7, { hz: Math.min(3200, f * 3), q: 1.1, gain: Phop.gain * 0.26 });
  tone(v, t, { freq: f, type: Phop.type, ms: Phop.dur, gain: Phop.gain, attack: 2,
               lowpass: clamp(f * 3.2, 1600, 3400) });
  tone(v, t, { freq: f, type: 'sine', ms: Phop.dur * 1.7, gain: Phop.gain * 0.40, attack: 2,
               lowpass: Math.max(900, f * 1.2), detune: 8 });
}

/* the settle tock — a wooden die stopping on a wooden board */
let lastTock = -1e9;
function tock(v, t, gainScale = 1) {
  if (!v) return;
  burst(v, t, Pland.dur, { hz: Pland.bandHz, q: Pland.bandQ, gain: Pland.gain * gainScale });
  tone(v, t, { freq: Pland.blipHz, type: Pland.blipType, ms: Pland.blipDecayMs, gain: Pland.gain * 0.85 * gainScale, attack: 1, lowpass: 1400 });
  tone(v, t, { freq: Pland.blipHz * 0.5, type: 'sine', ms: Pland.blipDecayMs * 2.2, gain: Pland.gain * 0.30 * gainScale, attack: 1, lowpass: 600 });
  lastTock = t;   // the SCHEDULED time, so dice()'s own tock suppresses a land() at the same moment
}

/* a dry wooden rattle — a die in a cupped hand — decelerating into the tock it lands on.
   TWO modules independently ask for this cue on every roll (game.js when it starts the
   turn, dice3d.js when it starts the tumble) and neither can be changed from here, so
   the cue has to be idempotent per beat or the most-repeated sound in the game plays
   twice at once: ~6 dB hot into the limiter, two different random impulse trains
   phase-smearing each other, and a doubled tock. Same idiom as _land's lastTock. */
let lastDiceAt = -1e9, lastSixAt = -1e9;
function _dice(ms) {
  if (now() - lastDiceAt < 500) return;   // one roll, one rattle
  lastDiceAt = now();
  const D = Math.max(160, Number(ms) || Pdice.dur);
  const v = alloc(D + 400); if (!v) return;
  const t0 = T0();
  const n = Math.max(3, Pdice.impulses | 0);

  // irregular gaps that slow down as the die loses energy, normalised to fill D
  const gaps = []; let sum = 0;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const g = (0.80 + 0.45 * k) * (0.75 + 0.50 * Math.random());
    gaps.push(g); sum += g;
  }
  const scale = (D * 0.92 / 1000) / sum;

  let t = t0;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const env = (0.55 + 0.45 * Math.sin(Math.PI * (0.18 + 0.82 * k))) * (1 - 0.30 * k);
    burst(v, t, Pdice.burstMs, { hz: Pdice.bandHz * (0.80 + 0.55 * Math.random()), q: Pdice.bandQ, gain: Pdice.gain * env });
    tone(v, t, { freq: Pdice.clickHz * (0.90 + 0.25 * Math.random()), type: 'sine', ms: 26,
                 gain: Pdice.clickGain * env * 1.6, attack: 1, lowpass: 900 });
    t += gaps[i] * scale;
  }
  // …and the tock it lands on. The die does not stop when the tumble ends: it stops
  // diceSettle ms later, after the overshoot bounce (config §9 #10 — "number legible at
  // 840ms"). Clacking at 700ms put the sound 140ms ahead of the impact, every single
  // turn, which is nearly three times the ~50ms audio/visual sync threshold.
  // land() below suppresses a second clack within 120ms of this scheduled time, so
  // game.js may call dice() alone or dice()+land() and never doubles it.
  // In reduced motion dice3d cross-fades in 250ms and fires its own land() at the
  // halfway mark; scheduling ours as well would be two clacks, so we let it own that.
  if (!prefersReducedMotion()) tock(v, t0 + (D + DICE_SETTLE) / 1000);
}

/* one dry clack — the die settling, or a token arriving */
function _land() {
  // absolute distance: lastTock is often SCHEDULED ahead of now (see _dice), and a
  // one-sided test would have muted every land() in the window before it as well.
  if (Math.abs(ctx.currentTime - lastTock) < 0.12) return;
  tock(alloc(220), T0());
}

/* The ladder's brass ring, and the quiz reveal one note above it, are DERIVED from the
   string rather than read as loose numbers, because the only thing that matters about
   them is their interval to the notes underneath.
     ring: the run tops out on 300 * 2^(7/12) = 449.5 Hz, whose 2nd harmonic is 899.0 Hz.
           A ring at 880 sits 37 cents flat of that and beats against it at 19 Hz — an
           audible rough warble landing precisely on the moment of resolve. 300 x 3 is
           the just twelfth: dead in tune, and the beat disappears.
     correct: "one note above the ladder resolve" (§8) — the next pentatonic degree up,
           ring x 2^(2/12) ~ 1010 Hz. Its bell partials land at 1010 / 2424 / 3940 Hz,
           all inside the 4 kHz ceiling. */
const LADDER_RING = (Plad.stringHz || 300) * 3;
const CORRECT_HZ  = LADDER_RING * Math.pow(2, 2 / 12);

/* a warm rising arpeggio, plucked — pleased, never triumphant */
function _ladder(ms) {
  const total = Math.max(220, Number(ms) || dur('ladderClimb', prefersReducedMotion()) || Plad.dur);
  const runMs = total * 0.80;
  const notes = Math.max(2, Plad.notes | 0);
  const scale = Plad.scale && Plad.scale.length ? Plad.scale : [0, 2, 4, 7, 9];
  const v = alloc(total + 300); if (!v) return;
  const t0 = T0();
  for (let i = 0; i < notes; i++) {
    const at = (runMs / notes) * i;
    const f = Plad.stringHz * Math.pow(2, scale[Math.min(i, scale.length - 1)] / 12);
    pluck(v, t0 + at / 1000, f, Plad.gain * (0.78 + 0.22 * (i / notes)), Plad.damping, total - at);
  }
  // Resolves on a small brass ring, not a fanfare — and the ring has to be IN TUNE with
  // the string it resolves. See LADDER_RING above.
  bell(v, t0 + runMs / 1000, LADDER_RING, Math.min(460, total * 0.36), Plad.gain * 0.46, [1, 2.4, 3.9]);
}

/* a soft descending slide — comic and low. Never a hiss, never a scare-chord:
   a mother playing this in a living room must not be startled. */
function _snake(ms) {
  const total = Math.max(220, Number(ms) || dur('snakeSlide', prefersReducedMotion()) || Psnk.dur);
  const sweepMs = total * 0.82;
  const v = alloc(total + 320); if (!v) return;
  const t = T0();
  const [hi, lo] = Psnk.sweepHz && Psnk.sweepHz.length === 2 ? Psnk.sweepHz : [1400, 380];

  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.Q.value = 0.9;
  f.frequency.setValueAtTime(hi, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(60, lo), t + sweepMs / 1000);
  const g = ctx.createGain();
  f.connect(g); g.connect(v.g);
  // A short attack, a brief hold, then a LONG ease down under the whole slide. It used
  // to sit flat at full gain for 657ms between a 45ms attack and a 200ms decay, which
  // reads as a synth pad rather than something falling — all the perceived movement was
  // coming from the filter, i.e. from muffling rather than from descent.
  shape(g.gain, t, Psnk.gain, 45, sweepMs + 200, Math.max(20, sweepMs * 0.25));

  for (const [mult, det, gainMul] of [[1, 0, 1], [0.5, 7, 0.5]]) {
    const osc = v.add(ctx.createOscillator());
    osc.type = mult === 1 ? Psnk.type : 'triangle';
    osc.detune.value = det;
    osc.frequency.setValueAtTime(Psnk.freq * mult, t);
    // an octave and a half down, not the old 8.28 semitones — the pitch has to do the
    // falling, and it is still a soft comic slide, never a hiss and never a scare chord
    osc.frequency.exponentialRampToValueAtTime(Psnk.freq * mult * 0.42, t + sweepMs / 1000);
    const og = ctx.createGain(); og.gain.value = gainMul;
    osc.connect(og); og.connect(f);
    osc.start(t);
    // outlive the (now much longer) decay so the tail is never cut mid-amplitude
    try { osc.stop(t + (sweepMs + 480) / 1000); } catch (e) { /* no-op */ }
  }

  // the dholak-rim thump it lands on
  const tt = t + sweepMs / 1000;
  const th = v.add(ctx.createOscillator());
  th.type = 'sine';
  th.frequency.setValueAtTime(Psnk.thumpHz, tt);
  th.frequency.exponentialRampToValueAtTime(Psnk.thumpHz * (1 - Psnk.thumpDrop), tt + Psnk.thumpMs / 1000);
  const tg = ctx.createGain();
  th.connect(tg); tg.connect(v.g);
  shape(tg.gain, tt, Psnk.gain * 1.05, 3, Psnk.thumpMs * 2.2);
  th.start(tt);
  try { th.stop(tt + Psnk.thumpMs * 2.4 / 1000 + 0.06); } catch (e) { /* no-op */ }
  burst(v, tt, 55, { hz: 700, q: 1.0, gain: Psnk.gain * 0.30, type: 'lowpass' });
}

/* the Bura Waqt Fund absorbing a hit. DELIBERATELY the most satisfying sound in the
   product, because it is the most important lesson in it — a room should say "arre!" */
function _shield() {
  const v = alloc(Pshd.dur + 300); if (!v) return;
  const t = T0();
  // the blow lands…
  const th = v.add(ctx.createOscillator());
  th.type = 'sine';
  th.frequency.setValueAtTime(Pshd.thumpHz, t);
  th.frequency.exponentialRampToValueAtTime(Pshd.thumpHz * 0.85, t + Pshd.thumpMs / 1000);
  const tg = ctx.createGain(); th.connect(tg); tg.connect(v.g);
  shape(tg.gain, t, Pshd.gain * 0.9, 3, Pshd.thumpMs * 2);
  th.start(t);
  try { th.stop(t + Pshd.thumpMs * 2.2 / 1000 + 0.06); } catch (e) { /* no-op */ }
  // …and the brass takes it
  fmTunk(v, t + 0.02, Pshd.bellHz, 1.4, Pshd.bellIndex, Pshd.bellMs, Pshd.gain * 0.85);
  // …and you are still standing where you were
  const rel = Pshd.releaseHz && Pshd.releaseHz.length === 2 ? Pshd.releaseHz : [660, 880];
  bell(v, t + 0.20, rel[0], Pshd.releaseMs, Pshd.gain * 0.50, [1, 2.4]);
  bell(v, t + 0.20 + Pshd.releaseMs / 2000, rel[1], Pshd.releaseMs * 1.6, Pshd.gain * 0.55, [1, 2.4, 3.9]);
}

/* a soft chime as the card arrives — barely there. It exists only to say "read this". */
function _lesson() {
  const v = alloc(300, true);   // dry bus: the chime must not duck itself
  if (!v) return;
  const t = T0();
  tone(v, t, { freq: Plsn.freq, type: 'sine', ms: Plsn.dur * 3.2, gain: Plsn.gain, attack: 26, lowpass: 1800 });
  tone(v, t, { freq: Plsn.freq * 1.5, type: 'sine', ms: Plsn.dur * 2.2, gain: Plsn.gain * 0.34, attack: 30, lowpass: 2200 });
}

/* the quiz reveal — one brass note above the ladder's resolve. Warm, not a game-show ding. */
function _correct() {
  const v = alloc(Pcor.dur + 220); if (!v) return;
  const t = T0();
  bell(v, t, CORRECT_HZ, Pcor.dur, Pcor.gain, [1, 2.4, 3.9]);
  pluck(v, t, CORRECT_HZ * 0.5, Pcor.gain * 0.35, 0.6, Pcor.dur);
}

/* NEVER a wrong answer — there are no wrong answers. Blocked input only.
   A neutral wooden knock: kind, flat, finished. Never a buzzer. */
function _wrong() {
  const v = alloc(240); if (!v) return;
  const t = T0();
  burst(v, t, 55, { hz: Pwrg.lowpassHz, q: 0.9, gain: Pwrg.gain, type: 'lowpass' });
  tone(v, t, { freq: Pwrg.freq, type: 'triangle', ms: 70, gain: Pwrg.gain * 0.9, attack: 1, lowpass: 700 });
}

/* one temple bell at a zone edge — arrival, not applause */
function _milestone() {
  const v = alloc(Pmil.dur + 300); if (!v) return;
  const t = T0();
  bell(v, t, Pmil.freq, Pmil.dur, Pmil.gain, Pmil.inharmonic);
  tone(v, t, { freq: Pmil.freq * 0.5, type: 'sine', ms: Pmil.dur * 0.7, gain: Pmil.gain * 0.22, attack: 8, lowpass: 700 });
}

/* Jhatka. Serious, never comic — these are nobody's fault and the audio must not
   laugh at them. One low bowed note, no melody, no sting. */
function _event() {
  const v = alloc(Pevt.dur + 300); if (!v) return;
  const t = T0();
  const lp = Pevt.lowpassHz && Pevt.lowpassHz.length === 2 ? Pevt.lowpassHz : [700, 260];
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.Q.value = 0.7;
  f.frequency.setValueAtTime(lp[0], t);
  f.frequency.exponentialRampToValueAtTime(Math.max(60, lp[1]), t + (Pevt.lowpassMs || Pevt.dur) / 1000);
  const g = ctx.createGain(); f.connect(g); g.connect(v.g);
  shape(g.gain, t, Pevt.gain, 90, 200, Math.max(20, Pevt.dur - 290));
  for (const det of [-5, 5]) {
    const osc = v.add(ctx.createOscillator());
    osc.type = 'sawtooth'; osc.frequency.value = Pevt.freq; osc.detune.value = det;
    osc.connect(f); osc.start(t);
    try { osc.stop(t + Pevt.dur / 1000 + 0.25); } catch (e) { /* no-op */ }
  }
}

/* a six. Quieter than the settle clack so it never becomes annoying at ~1 turn in 6. */
function _six() {
  // game.js and dice3d.js both announce a six, measured ~315ms apart. One six, one
  // chime. The soonest a second six can legitimately land is a whole turn away.
  if (now() - lastSixAt < 600) return;
  lastSixAt = now();
  const v = alloc(Psix.dur + 200); if (!v) return;
  const t = T0();
  const f = Array.isArray(Psix.freq) ? Psix.freq : [587, 784];
  tone(v, t, { freq: f[0], type: 'triangle', ms: Psix.dur * 0.45, gain: Psix.gain, attack: 3, lowpass: 2200 });
  tone(v, t + Psix.dur * 0.35 / 1000, { freq: f[1], type: 'triangle', ms: Psix.dur * 0.6, gain: Psix.gain, attack: 3, lowpass: 2400 });
}

/* the handoff — a page turning, not a swipe in an app */
function _whoosh() {
  const v = alloc(Pwho.dur + 160); if (!v) return;
  const t = T0();
  const b = burst(v, t, Pwho.dur, { hz: Pwho.highpassHz, q: 0.7, gain: Pwho.gain, type: 'highpass', attack: 42 });
  try {
    b.f.frequency.setValueAtTime(Pwho.highpassHz * 0.7, t);
    b.f.frequency.exponentialRampToValueAtTime(Pwho.highpassHz * 3, t + Pwho.dur / 1000);
  } catch (e) { /* no-op */ }
}

/* any button — a fingertip on painted wood */
function _click() {
  const v = alloc(160); if (!v) return;
  const t = T0();
  burst(v, t, 5, { hz: 1600, q: 1.2, gain: Pclk.gain * 0.5 });
  tone(v, t, { freq: Pclk.freq, type: 'triangle', ms: Pclk.dur, gain: Pclk.gain, attack: 1, lowpass: 1800 });
}

/* Lakshya poora. An arrival, not a jackpot: a tanpura-ish swell opening under a
   plucked Bhoopali phrase (Sa Re Ga Pa Dha Sa') with one temple bell over it.
   Major pentatonic — Indian without being a caricature. No fanfare, no crowd,
   no coin cascade. ~1.6s, the only sound in the game allowed past 400ms by design. */
function _win() {
  const total = Pwin.dur;
  const v = alloc(total + 500); if (!v) return;
  const t = T0();

  const lp = Pwin.lowpassHz && Pwin.lowpassHz.length === 2 ? Pwin.lowpassHz : [200, 2600];
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.Q.value = 0.7;
  f.frequency.setValueAtTime(lp[0], t);
  f.frequency.exponentialRampToValueAtTime(lp[1], t + (Pwin.openMs || 900) / 1000);
  const bg = ctx.createGain();
  f.connect(bg); bg.connect(v.g);
  shape(bg.gain, t, Pwin.gain * 0.40, 280, 560, Math.max(20, total - 840));

  const beds = Pwin.freqs && Pwin.freqs.length ? Pwin.freqs : [130, 195, 260];
  beds.forEach((hz, i) => {
    const osc = v.add(ctx.createOscillator());
    osc.type = Pwin.type || 'sawtooth';
    osc.frequency.value = hz;
    osc.detune.value = (i - 1) * (Pwin.detune || 6);
    osc.connect(f); osc.start(t);
    try { osc.stop(t + total / 1000 + 0.35); } catch (e) { /* no-op */ }
  });

  const root = beds[0] * 2;                                  // Sa, an octave over the bed
  const phrase = [[0, 0], [2, 150], [4, 300], [7, 480], [9, 700], [12, 1000]];
  for (const [semis, at] of phrase) {
    pluck(v, t + at / 1000, root * Math.pow(2, semis / 12), Pwin.gain * 0.58, 0.45, total - at);
  }
  /* The temple bell over the phrase. Derived, not a loose 660: the phrase's Ga is
     root x 2^(4/12) = 327.6 Hz and its 2nd harmonic is 655.2 Hz, so a bell at 660 sits
     12.7 cents sharp of it and tremolos at 4.8 Hz for the whole 900ms — a wobble across
     the single most important second in the game. On the harmonic it just rings. */
  bell(v, t + (Pwin.bellDelayMs || 400) / 1000, root * Math.pow(2, 4 / 12) * 2,
       900, Pwin.gain * 0.48, [1, 2.76, 5.40]);
}

/* ── 8. the public sfx table ──────────────────────────────────────────────────── */
/* Every entry is wrapped: if there is no context, if it is muted, or if anything at
   all throws, it is a silent no-op. Sound is a bonus and never a channel (§13). */
const guard = (fn) => function (...a) {
  try { if (!live()) return; fn(...a); }
  catch (e) { if (DEBUG) console.error('[audio]', e); }
};

export const sfx = Object.freeze({
  dice:      guard(_dice),        // dice(ms?) — pass the real tumble duration if it is not 700
  hopStep:   guard(_hopStep),     // hopStep(i?, total?) — i and total make the run resolve
  land:      guard(_land),
  ladder:    guard(_ladder),      // ladder(ms?)
  snake:     guard(_snake),       // snake(ms?)
  shield:    guard(_shield),
  lesson:    function () { duckFor(A.duckMs); guard(_lesson)(); },
  correct:   guard(_correct),
  wrong:     guard(_wrong),
  milestone: guard(_milestone),
  event:     guard(_event),
  six:       guard(_six),
  whoosh:    guard(_whoosh),
  click:     guard(_click),
  win:       guard(_win),
});

/** Fire by name — handy for game.js mapping rules.js event types straight to audio. */
export function play(name, ...args) {
  const fn = sfx[name];
  if (typeof fn === 'function') fn(...args);
}

/* ── 9. the optional tanpura drone (§8 — OFF by default, one toggle, thins as you
       climb the rows). Deliberately outside the voice pool so it is never stolen. ── */
let drone = null;
export function setDrone(on, row = 0) {
  if (on && !ready) initAudio();
  if (!ready || dead || !ctx) return false;
  const D = A.drone || { gain: 0.06, freqs: [130.8, 196.0], thinPerRow: 0.06 };
  try {
    if (!on) {
      if (drone) {
        const t = ctx.currentTime, d = drone; drone = null;
        d.g.gain.cancelScheduledValues(t);
        d.g.gain.setValueAtTime(Math.max(d.g.gain.value, EPS), t);
        d.g.gain.exponentialRampToValueAtTime(EPS, t + 0.8);
        setTimeout(() => { for (const o of d.oscs) { try { o.stop(); } catch (e) {} try { o.disconnect(); } catch (e) {} } try { d.g.disconnect(); } catch (e) {} }, 900);
      }
      return false;
    }
    if (drone) { setDroneRow(row); return true; }
    const g = ctx.createGain(); g.gain.value = EPS; g.connect(busDuck);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.6; f.connect(g);
    const oscs = [];
    for (const hz of (D.freqs || [130.8, 196.0])) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = det;
        o.connect(f); o.start(); oscs.push(o);
      }
    }
    drone = { g, f, oscs, base: D.gain || 0.06, thin: D.thinPerRow != null ? D.thinPerRow : 0.06 };
    setDroneRow(row);
    return true;
  } catch (e) { if (DEBUG) console.error('[audio] drone', e); return false; }
}
export function setDroneRow(row = 0) {
  if (!drone || !ctx) return;
  try {
    const target = Math.max(EPS, drone.base * (1 - drone.thin * clamp(row, 0, 9)));
    const t = ctx.currentTime;
    drone.g.gain.cancelScheduledValues(t);
    drone.g.gain.setValueAtTime(Math.max(drone.g.gain.value, EPS), t);
    drone.g.gain.exponentialRampToValueAtTime(target, t + 1.2);
  } catch (e) { /* no-op */ }
}
export function isDroneOn() { return !!drone; }

/* ── 10. the optional Hinglish voice (§8 — OFF by default, titles and the rupee
       figure only, NEVER a running voice-over during play). SpeechSynthesis, not
       WebAudio, so it is guarded separately and no-ops wherever it is missing. ─── */
export function setVoiceEnabled(b) {
  voiceOn = !!b;
  if (!voiceOn) { try { speechSynthesis.cancel(); } catch (e) { /* no-op */ } }
  return voiceOn;
}
export function isVoiceEnabled() { return voiceOn; }
export function speak(text, lang = 'hi-IN') {
  if (!voiceOn || muted || !text) return false;
  try {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang;
    u.rate = (A.voice && A.voice.rate) || 0.95;
    u.pitch = (A.voice && A.voice.pitch) || 1.0;
    const list = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    const pick = list.find(v => v.lang === lang) || list.find(v => v.lang && v.lang.indexOf(lang.slice(0, 2)) === 0);
    if (pick) u.voice = pick;
    duckFor(700);
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/* ── 11. test surface — pure maths only, so tests/audio.test.mjs can run in node ── */
export const __test = Object.freeze({ hopSemis, HOP_RUNS, PENTA, MUTE_KEY, MAX_VOICES });
