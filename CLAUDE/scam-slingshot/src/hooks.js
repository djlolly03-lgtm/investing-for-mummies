/**
 * installHooks() — implements _tools/HOOKS.md.
 *
 * This is NOT a debug extra. It is how every critic sees the game. If a hook is missing or
 * lies, the piece gets an automatic FAIL. So: never stub a hook with a fake success.
 * An honest `{ ok:false, reason:'…' }` is fine; a silent lie is not.
 *
 * Wiring: main.js builds a ctx and calls installHooks(ctx). Later pieces attach their own
 * subsystems to the ctx (ctx.sling, ctx.audio, …) rather than reaching into window.SS.
 *
 * ── EVERY HOOK RETURNS SOMETHING THAT NAMES ITSELF ───────────────────────────
 * A bare `true` is the second-worst thing a hook can return (the worst is a bare `false`).
 * `SS.freeze()` and `SS.resume()` both used to return a naked `true`, so the acceptance run
 * probed them the only way it could — by reading `SS.driven()` afterwards — and logged
 * `resume: false`, which reads as "resume() failed" when it actually means "resume()
 * succeeded and the world is no longer driven". A hook that can be misread like that
 * silently corrupts every verdict downstream of it. So: state-changing hooks return
 * `{ ok, ...the state they just set }`, and the field names say what they are.
 */

import { reseed, currentSeed } from './rng.js';
import { structure } from './level/structure.js';

export function installHooks(ctx) {
  const { physics, Physics } = ctx;

  const errors = [];
  const warnings = [];
  const SS = {
    ready: false,
    version: ctx.version,

    // --- scene control ------------------------------------------------------
    loadLevel: (id) => ctx.loadLevel(id),
    restart: () => ctx.restart(),
    state: () => ctx.state(),

    // --- deterministic input ------------------------------------------------
    // P1 attaches ctx.sling. Until then these report honestly instead of pretending.
    aim: (o) => ctx.sling ? ctx.sling.aim(o) : notYet('aim'),
    dragTo: (x, y) => ctx.sling ? ctx.sling.dragTo(x, y) : notYet('dragTo'),
    release: () => ctx.sling ? ctx.sling.release() : notYet('release'),
    tapAbility: () => ctx.sling ? ctx.sling.tapAbility() : notYet('tapAbility'),
    /**
     * aim() then release(). A failed aim used to be swallowed and the release reported on
     * its own, which turned "your angle was rejected" into a confusing "nothing to release".
     * Both halves are now reported.
     */
    aimAndFire: (a, p) => {
      if (!ctx.sling) return notYet('aimAndFire');
      const aimed = ctx.sling.aim({ angle: a, power: p });
      if (aimed && aimed.ok === false) return { ok: false, reason: `aim rejected: ${aimed.reason}`, aim: aimed };
      const fired = ctx.sling.release();
      return (fired && fired.ok === false) ? { ...fired, aim: aimed } : { ...fired, aim: aimed };
    },

    // --- deterministic time -------------------------------------------------
    setTimeScale(s) {
      s = Number(s);
      if (!Number.isFinite(s) || s < 0) throw new Error(`SS.setTimeScale: bad scale ${s}`);
      physics.timeScale = s;
      if (s === 0) physics.enterDriven(); else physics.exitDriven();
      return { ok: true, timeScale: physics.timeScale, driven: physics.driven, tick: physics.tick };
    },
    /** Stop the wall clock reaching the solver. `driven:true` is the proof it worked. */
    freeze() { physics.enterDriven(); return { ok: true, driven: physics.driven, tick: physics.tick }; },
    /** Hand the solver back to the rAF loop. `driven:false` is the proof it worked — that
     *  field is deliberately named, because the naked `true` this used to return was read as
     *  a failure the moment anyone checked `SS.driven()` instead. */
    resume() { physics.exitDriven(); return { ok: true, driven: physics.driven, tick: physics.tick }; },

    /**
     * Advance the sim by exactly `ms` of GAME time. Zero wall-clock, zero rAF dependence.
     * Enters driven mode permanently (until resume()) so the rAF loop can never sneak an
     * extra solver step in between two seeks — that is the whole ballgame for determinism.
     */
    async seek(ms) {
      ms = Number(ms);
      if (!Number.isFinite(ms) || ms < 0) throw new Error(`SS.seek: bad ms ${ms}`);
      physics.enterDriven();
      const steps = Physics.stepsFor(ms);
      for (let i = 0; i < steps; i++) {
        ctx.stepOnce();
        ctx.render();
        // Yield occasionally so a long seek can't wedge the tab. Nothing steps while we
        // are away (driven === true), so this cannot perturb the result.
        if ((i & 127) === 127) await new Promise(r => setTimeout(r, 0));
      }
      return { ms, steps, tick: physics.tick };
    },

    // --- determinism --------------------------------------------------------
    /**
     * Reseed AND hard-rebuild the level from that seed, then enter driven mode.
     * Contract: SS.seed(n) followed by the same input sequence always gives the same world.
     */
    async seed(n) {
      n = (Number(n) >>> 0) || 1;
      reseed(n);
      await ctx.restart();
      physics.enterDriven();
      return currentSeed();
    },
    currentSeed: () => currentSeed(),

    // --- diagnostics --------------------------------------------------------
    errors,
    warnings,
    perf: () => ctx.perf(),
    /** @returns {boolean} the mute state actually in force afterwards, not the request. */
    audioMute: (on) => ctx.audioMute(on !== false),

    // --- extensions (superset of HOOKS.md; additive, never replacing) --------
    /** Exact rigid-body transforms, full precision — the determinism oracle. */
    dumpBodies: () => ctx.dumpBodies(),
    /** Solver steps since the last reset. The only clock gameplay may trust. */
    tick: () => physics.tick,
    driven: () => physics.driven,
    /**
     * One tick + one render. NOTE: during hit-stop this advances the tick clock WITHOUT
     * stepping the solver (physics.holdOnce) — that is what keeps `seek(2000)` exactly 240
     * ticks while a big impact still gets its frozen beat. Read `state().hitStop` if you
     * need to know which kind of tick you just got.
     */
    stepOnce: () => { physics.enterDriven(); ctx.stepOnce(); ctx.render(); return physics.tick; },

    /**
     * DIAGNOSTIC FRAMING. Park the camera on a fixed world box so a critic can inspect
     * something small (a shard silhouette, a joint, the structure of a dust ball) at a
     * readable size, with the framing identical in every tile of a filmstrip.
     *
     * This is a lens, not a game mode. Nothing in the game calls it, and any real camera
     * intent (aiming, firing, settling) clears it. Composition criteria must be judged at
     * the game's own framing — `camUnlock()` and re-capture before judging P4.
     */
    camLock: ({ x = 18, y = 3, halfWidth = 8 } = {}) =>
      ctx.world.rig ? ctx.world.rig.lock(x, y, halfWidth)
        : { ok: false, reason: 'no camera rig yet' },
    camUnlock: () => ctx.world.rig ? ctx.world.rig.unlock() : { ok: false, reason: 'no camera rig yet' },

    // The live registries. Documented in HOOKS.md, so they are built HERE, with the rest of
    // the surface, rather than bolted on by the caller afterwards where a mid-boot throw
    // could leave the contract half-honoured.
    __world: ctx.world,
    __physics: physics,
    /**
     * The joint graph and the live shock queue (level/structure.js), so a critic can check
     * that "the tower came down" is the structure reacting rather than a lucky ricochet.
     * Read-only by convention; the game never reads it back.
     */
    __structure: () => structure.report(),
    /**
     * One render, no solver step, no tick. Purely so a critic can toggle a mesh's visibility
     * and re-photograph the SAME simulated instant — which is how occlusion and silhouette
     * criteria get an actual number instead of an opinion. It advances nothing, so it cannot
     * perturb a seek().
     */
    __render: () => { ctx.render(); return { ok: true, tick: physics.tick }; },
  };

  function notYet(name) {
    return { ok: false, reason: `${name}() has no slingshot attached yet (${ctx.version})` };
  }

  // ---- error capture: everything lands in SS.errors AND stays in the console ----
  const realError = console.error.bind(console);
  console.error = (...a) => { errors.push({ type: 'console', text: a.map(fmt).join(' ') }); realError(...a); };
  const realWarn = console.warn.bind(console);
  console.warn = (...a) => { warnings.push({ type: 'console', text: a.map(fmt).join(' ') }); realWarn(...a); };

  addEventListener('error', (e) => {
    errors.push({ type: 'window', text: String(e.error?.stack || e.message || e) });
  });
  addEventListener('unhandledrejection', (e) => {
    errors.push({ type: 'rejection', text: String(e.reason?.stack || e.reason || e) });
    realError('[unhandledrejection]', e.reason);
  });

  function fmt(v) {
    if (v instanceof Error) return v.stack || String(v);
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
    return String(v);
  }

  // Preserve anything the boot shim already stashed on window.SS.
  const pre = globalThis.SS;
  if (pre?.errors?.length) errors.push(...pre.errors);
  globalThis.SS = SS;
  return SS;
}
