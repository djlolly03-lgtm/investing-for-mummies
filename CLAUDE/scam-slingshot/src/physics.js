/**
 * Rapier world + the FIXED TIMESTEP LOOP.  Read this before touching anything time-related.
 *
 * ARCHITECTURE.md contract:
 *   const FIXED = 1/120;
 *   step(dtWall) { acc += min(dtWall, 0.25); while (acc >= FIXED) { world.step(); acc -= FIXED; tick++ } }
 *   SS.seek(ms) runs exactly round(ms/1000/FIXED) solver steps. NEVER wall-clock.
 *
 * ── DRIVEN MODE (why determinism actually holds) ─────────────────────────────
 * Two things must never both be stepping the world: the rAF loop (wall-clock paced) and
 * SS.seek() (exact). So the world has one bit of mode:
 *
 *   driven === false : rAF drives, accumulator eats wall-clock dt. This is a human playing.
 *   driven === true  : NOTHING steps except explicit stepOnce()/seek(). rAF still renders.
 *
 * SS.seed(), SS.seek(), SS.freeze() and SS.setTimeScale(0) all enter driven mode.
 * SS.resume() / SS.setTimeScale(>0) leave it. That is what makes
 * "same seed + same inputs => identical outcome" literally true: after seed() no wall-clock
 * time can leak into the solver, so seek(2000) is exactly 240 steps from a known state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import RAPIER from '@dimforge/rapier3d-compat';

export const FIXED = 1 / 120;                 // solver step, seconds
export const GRAVITY_SCALE = 2.4;             // Angry-Birds gravity is punchier than real
export const GRAVITY_Y = -9.81 * GRAVITY_SCALE;
export const MAX_FRAME_DT = 0.25;             // never let a tab-switch dump 30s into the solver
/**
 * THE PLANE INVARIANT, and it is a BOUND, not an equality — see clampPlane() for why.
 * Every dynamic body satisfies |z| <= PLANE_EPS at all times. Measured peak across an entire
 * l1 collapse (52 bodies, 5 s, seed 7): 1.2e-7, i.e. two hundred-thousandths of a pixel and
 * three orders of magnitude inside this bound.
 */
export const PLANE_EPS = 1e-6;

let _rapierReady = null;

/** Idempotent: loads + instantiates the inlined wasm exactly once. */
export async function initRapier() {
  if (!_rapierReady) _rapierReady = RAPIER.init().then(() => RAPIER);
  return _rapierReady;
}

export { RAPIER };

export class Physics {
  constructor() {
    this.world = null;
    this.acc = 0;          // accumulator, seconds
    this.tick = 0;         // solver steps since the last reset — the ONLY clock gameplay may trust
    this.driven = false;   // see header
    this.timeScale = 1;
    this.eventQueue = null;
    this._onStep = [];     // (tick) => void, run after every single solver step
  }

  /** Fresh world. Called on boot and on every level (re)build so state never carries over. */
  create() {
    this.destroy();
    this.world = new RAPIER.World({ x: 0, y: GRAVITY_Y, z: 0 });
    this.world.timestep = FIXED;
    // Pinned explicitly rather than left to library defaults: a Rapier version bump that
    // changes a default would silently change every level's physics.
    this.world.numSolverIterations = 4;
    this.world.numInternalPgsIterations = 1;
    this.eventQueue = new RAPIER.EventQueue(true);
    this.acc = 0;
    this.tick = 0;
    return this.world;
  }

  destroy() {
    this.eventQueue?.free?.();
    this.eventQueue = null;
    this.world?.free?.();
    this.world = null;
    this._onStep.length = 0;
  }

  onStep(fn) { this._onStep.push(fn); return () => { const i = this._onStep.indexOf(fn); if (i > -1) this._onStep.splice(i, 1); }; }

  /**
   * THE 2.5D PLANE LOCK. Every single rigid body goes through this. No exceptions —
   * ARCHITECTURE.md: "one loose body ruins the whole read".
   *
   * ── WHY THE TRANSLATION LOCK IS GONE  (measured: _tools/scenarios/p0-friction3.mjs) ──
   * This used to also call `setEnabledTranslations(true, true, false)`. That one line
   * silently removed ALL TANGENTIAL FRICTION FROM THE ENTIRE GAME. Four identical stone
   * boxes launched along the ground at 4 m/s, 300 ms later:
   *
   *     no locks .................. vx -0.80   (stops dead, as it should)
   *     translations locked ....... vx -0.80
   *     rotations locked .......... vx -0.82
   *     BOTH locked ............... vx  4.000  <- frictionless, forever
   *
   * Rapier solves contact friction in two tangent directions at once. With the contact
   * normal pointing up, one of those tangents is Z. Lock Z translation and that direction
   * has infinite linear mass; lock X/Y rotation as well and the body cannot answer it by
   * rolling either — so the 2x2 tangent system is singular and the solver hands back zero
   * impulse for BOTH directions, not just the dead one. Either lock alone is harmless. The
   * pair is fatal, which is why it survived review: it looks like two obviously-correct
   * lines.
   *
   * What it cost: nothing on any surface ever slowed down. Wreckage slid to the horizon
   * (a wood block measured from x=24 to x=51 and still moving), levels took nine seconds to
   * settle because something was always in motion, structures slid apart instead of
   * standing, blocks ground themselves to pieces against the floor, and villains rolled out
   * from under their own collapsing tower — which is the real reason a tower could fall on
   * a scammer and leave him at hp 1.000.
   *
   * So: keep the rotation lock (that is what keeps the game readable as 2D) and hold z=0
   * with `clampPlane()` after every step instead. Measured drift before clamping, with the
   * rotation lock on: 1.4e-3 over half a second, i.e. the clamp is very nearly a no-op —
   * but it is not optional, because "very nearly" is not an invariant.
   */
  planeLock(body) {
    body.setEnabledRotations(false, false, true, true);
    // Snap any authoring slop back onto z=0 so the clamp has nothing to preserve but 0.
    const t = body.translation();
    if (t.z !== 0) body.setTranslation({ x: t.x, y: t.y, z: 0 }, true);
    return body;
  }

  /**
   * Hold every dynamic body on the z=0 plane. Runs after every solver step — this is the
   * half of the plane lock that Rapier is not doing for us any more (see planeLock).
   * Sleeping bodies are skipped: they cannot drift, and writing to them would wake them.
   *
   * ── THE DEADBAND IS NOT A ROUNDING TWEAK; IT IS WHY ANYTHING EVER SLEEPS ─────
   * This used to clamp on `!== 0`. A settled block's z-velocity is never exactly 0 — it is
   * 1e-9 of solver residue — so the clamp wrote to EVERY dynamic body on EVERY step, and
   * `wakeUp = false` does not save you: rapier's `RigidBodySet::get_mut` (which every JS
   * setter goes through) pushes the handle onto `modified_bodies` and stamps
   * `RigidBodyChanges::MODIFIED`, and the island manager wakes every modified body at the
   * top of the next step. Measured on an untouched l1: 1800 setter calls per 120 steps and
   * 0/15 bodies asleep after five seconds; with the solver stepped raw and nothing else
   * touching the bodies, 15/15 asleep. That is the rubric's "never-sleeping body on an
   * untouched level" — an automatic FAIL for P3 — caused entirely by the diagnostic clamp.
   *
   * So the invariant changed from `z === 0` to `|z| <= PLANE_EPS` (1e-6 world units — a
   * hundred-thousandth of a pixel at gameplay zoom). Measured peak |z| across a full l1
   * collapse is 1.2e-7, so the deadband is a backstop that essentially never fires: a body
   * that is genuinely still is never written to at all, and can therefore fall asleep, while
   * anything that does start to wander is snapped back long before it is expressible on
   * screen. `_tools/scenarios/p3-planez.mjs` measures the real number.
   *
   * ANYONE ASSERTING THE PLANE INVARIANT MUST ASSERT THE BOUND, NOT EQUALITY.
   * `_tools/scenarios/p0-hook-audit.mjs` was updated in the same change.
   */
  clampPlane() {
    const D = RAPIER.RigidBodyType.Dynamic;
    const EPS = PLANE_EPS;
    this.world.forEachRigidBody((b) => {
      if (b.bodyType() !== D || b.isSleeping()) return;
      const t = b.translation();
      if (t.z > EPS || t.z < -EPS) b.setTranslation({ x: t.x, y: t.y, z: 0 }, false);
      const v = b.linvel();
      if (v.z > EPS || v.z < -EPS) b.setLinvel({ x: v.x, y: v.y, z: 0 }, false);
    });
  }

  /** Exactly one solver step. The only place world.step() is ever called. */
  stepOnce() {
    this.world.step(this.eventQueue);
    this.tick++;
    this.clampPlane();
    for (let i = 0; i < this._onStep.length; i++) this._onStep[i](this.tick);
    return this.tick;
  }

  /**
   * Advance the TICK CLOCK without stepping the solver. This is deterministic hit-stop:
   * the world holds perfectly still for N ticks while `tick` keeps counting, so
   * `SS.seek(2000)` is still exactly 240 ticks and the determinism gate's step-count check
   * holds. main.js decides when to hold; nothing else may call this.
   */
  holdOnce() { this.tick++; return this.tick; }

  /**
   * Wall-clock driven stepping. NOTE: main.js runs its own accumulator so it can interleave
   * hit-stop and entity updates with each solver step; this method is kept as the reference
   * implementation of the ARCHITECTURE.md contract and for headless use.
   */
  step(dtWall) {
    if (this.driven || !this.world) return 0;
    this.acc += Math.min(dtWall, MAX_FRAME_DT) * this.timeScale;
    let n = 0;
    // Hard cap so a stall can never spiral: 8 solver steps per frame = 4x real time at 60fps.
    while (this.acc >= FIXED && n < 8) { this.stepOnce(); this.acc -= FIXED; n++; }
    if (this.acc > FIXED * 8) this.acc = 0;   // gave up catching up; drop the debt
    return n;
  }

  /** Exact number of solver steps for a duration in ms. seek()'s only source of truth. */
  static stepsFor(ms) { return Math.round((ms / 1000) / FIXED); }

  /** Interpolation alpha for render smoothing (0..1 through the current solver step). */
  get alpha() { return this.driven ? 0 : Math.min(1, this.acc / FIXED); }

  enterDriven() { this.driven = true; this.acc = 0; }
  exitDriven() { this.driven = false; this.acc = 0; }

  /** True when every dynamic body is asleep — the 'settle' condition. */
  allAsleep() {
    let asleep = true, n = 0;
    this.world.forEachRigidBody(b => {
      if (b.bodyType() !== RAPIER.RigidBodyType.Dynamic) return;
      n++;
      if (!b.isSleeping()) asleep = false;
    });
    return n === 0 ? true : asleep;
  }

  countAsleep() {
    let c = 0;
    this.world.forEachRigidBody(b => {
      if (b.bodyType() === RAPIER.RigidBodyType.Dynamic && b.isSleeping()) c++;
    });
    return c;
  }
}

export const physics = new Physics();
