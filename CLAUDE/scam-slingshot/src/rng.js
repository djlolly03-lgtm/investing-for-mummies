/**
 * Seeded PRNGs. ARCHITECTURE.md: "All randomness goes through rng() from a seeded PRNG
 * (mulberry32) — never Math.random()."
 *
 * There are TWO streams, both derived from the one seed, and which one you import matters:
 *
 *   rng() / rngRange() / rngJitter() / rngInt() / rngPick()
 *       THE SIMULATION STREAM. Level jitter, cut plans, debris impulses — anything whose
 *       result ends up in a rigid body. Draw from this and you are part of the physics.
 *
 *   fxRng() / fxRange() / fxJitter()
 *       THE PRESENTATION STREAM. Particles, dust, sparks — anything that only ever affects
 *       pixels.
 *
 * ── WHY THEY ARE SEPARATE (P15's criterion, found the hard way in P3) ────────
 * P15 requires: "Particles degrade under load, physics does not: force the particle budget
 * low and the same collapse produces bit-identical body transforms." With one shared stream
 * that is impossible by construction — a dust burst that emits 9 particles instead of 12
 * consumes three fewer numbers, every later draw shifts, and the *rigid bodies* land
 * somewhere else. It is not a theoretical worry: during P3 tuning, changing the glass shard
 * count from 16 to 18 turned a full tower collapse into a two-block chip, because the shot
 * itself came out different.
 *
 * The same argument covers the third stream in the game, art/toon.js's private `tex()`:
 * textures are built lazily and cached, so a rebuild would find them cached and consume
 * nothing. Anything built once and reused must never touch a stream the sim also reads.
 *
 * Both streams are reseeded together by reseed(n), from the same seed but with different
 * starting states, so `SS.seed(n)` still determines the whole world exactly. If you call
 * Math.random() anywhere in this game you have broken determinism and every critic filmstrip
 * becomes unreproducible.
 */

let _seed = 0x5ca3 >>> 0;
let _s = _seed;
let _fx = (_seed ^ 0x9e3779b9) >>> 0;

/** mulberry32 — 32-bit state, fast, good enough, and trivially reproducible. */
function mulberry32() {
  _s = (_s + 0x6D2B79F5) >>> 0;
  let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The same generator on the presentation state. */
function mulberry32fx() {
  _fx = (_fx + 0x6D2B79F5) >>> 0;
  let t = _fx;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// --- simulation stream -------------------------------------------------------

/** Uniform [0,1). */
export function rng() { return mulberry32(); }

/** Uniform [a,b). */
export function rngRange(a, b) { return a + (b - a) * mulberry32(); }

/** Integer in [a,b] inclusive. */
export function rngInt(a, b) { return a + Math.floor(mulberry32() * (b - a + 1)); }

/** Symmetric jitter in [-m, +m). */
export function rngJitter(m) { return (mulberry32() * 2 - 1) * m; }

/** Pick one element. */
export function rngPick(arr) { return arr[Math.floor(mulberry32() * arr.length) % arr.length]; }

// --- presentation stream — pixels only, never a rigid body -------------------

export function fxRng() { return mulberry32fx(); }
export function fxRange(a, b) { return a + (b - a) * mulberry32fx(); }
export function fxJitter(m) { return (mulberry32fx() * 2 - 1) * m; }

/** Reset both streams. Called by SS.seed(n) and by every level (re)build. */
export function reseed(n) {
  _seed = (n >>> 0) || 1;
  _s = _seed;
  _fx = (_seed ^ 0x9e3779b9) >>> 0;
  return _seed;
}

export function currentSeed() { return _seed; }
