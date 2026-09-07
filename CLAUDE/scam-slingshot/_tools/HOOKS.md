# TEST HOOKS CONTRACT — mandatory for every builder

The game MUST expose `window.SS` as soon as the first frame has rendered. Critics drive the game
through this object only. If a hook is missing or lies, the critic records an automatic FAIL for the
piece — a beautiful game that cannot be inspected is an unjudgeable game.

```js
window.SS = {
  ready: false,            // -> true after first rendered frame + assets resolved
  version: '<piece>-<n>',  // free-form, for logging

  // --- scene control -------------------------------------------------------
  loadLevel(id),           // Promise; resolves when the level is settled and playable
  restart(),               // Promise; reload current level from scratch
  state(),                 // { phase, level, score, stars, villainsAlive, ammoLeft, bodiesAsleep }
                           // phase: 'boot'|'menu'|'aiming'|'flying'|'settling'|'won'|'lost'

  // --- deterministic input -------------------------------------------------
  aim({ angle, power }),   // angle in radians from +X, power 0..1 of max stretch. Sets the sling
                           // to an EXACT state without animation. Used to make shots reproducible.
  dragTo(x, y),            // screen-space pointer drag (for testing the real input path)
  release(),               // fire
  tapAbility(),            // mid-air ability trigger
  aimAndFire(a, p),        // convenience: aim + release

  // --- deterministic time --------------------------------------------------
  // CRITICAL. Critics capture exact mid-motion frames; wall-clock waits are not reproducible.
  setTimeScale(s),         // 1 = normal, 0 = frozen
  freeze(), resume(),
  seek(ms),                // Promise; advance the simulation by exactly `ms` of game time using the
                           // fixed physics timestep, rendering each step. Must NOT depend on rAF
                           // pacing or wall clock. This is how "frame at t=180ms after release" works.

  // --- determinism ---------------------------------------------------------
  seed(n),                 // reseed all randomness. Same seed + same inputs => identical outcome.

  // --- diagnostics ---------------------------------------------------------
  errors: [],              // every console error / unhandled rejection / shader warning, appended
  perf(),                  // { fps, frameMs, drawCalls, tris, bodies }
  audioMute(on),           // critics run muted
};
```

Rules:
- `seek()` must be exact. If `seek(500)` twice from the same seed gives different results, the
  physics loop is wrong — fix that before anything else.
- Never gate `ready` on a network fetch that can hang. Time out and set `ready` with a logged error.
- Every uncaught error goes into `SS.errors` AND is re-thrown to the console.

---

## IMPLEMENTATION NOTES (P0) — the contract above is unchanged; this is how it is honoured

**Driven mode.** `seed()`, `seek()`, `freeze()` and `setTimeScale(0)` put the game into *driven
mode*: the rAF loop still renders but never steps physics again until `resume()` /
`setTimeScale(s>0)`. This is what makes `seek()` exact — otherwise wall-clock steps leak in
between two `seek()` calls and the "frame at t=180ms" is a different frame every run.
Consequence for critics: after `SS.seed(...)` the world is frozen until you `seek()` it.
Call `SS.resume()` if you want it running on wall-clock again.

**`seed(n)` rebuilds the level.** It reseeds the PRNG *and* tears down and rebuilds the world
from that seed, then enters driven mode. That is the only way "same seed => identical outcome"
can be true. It returns the seed actually used.

**Additions (superset — nothing above was removed):**
| hook | returns |
|---|---|
| `SS.dumpBodies()` | every rigid body: `{i, tag, t[3], r[4], v[3], sleeping, bits}` — `bits` is the concatenated f64 hex bit pattern of the transform. This is the determinism oracle. |
| `SS.tick()` | solver steps since the last reset (2000 ms = 240 at `FIXED = 1/120`) |
| `SS.driven()` | whether the rAF loop is stepping |
| `SS.stepOnce()` | one solver step + one render |
| `SS.currentSeed()` | the seed in force |
| `SS.warnings` | `console.warn` capture, kept separate from `SS.errors` so a benign three.js warning does not read as an error |

**Unbuilt hooks tell the truth.** Before P1 attaches the slingshot, `aim/dragTo/release/
tapAbility/aimAndFire` return `{ ok:false, reason:'… no slingshot attached yet (<version>)' }`.
They never fake success and never push a fake error. P1 sets `ctx.sling` and they start working.

**Harness note.** This machine's `ffmpeg` is built without `libfreetype`, so the `drawtext`
filter does not exist. `capture.mjs` now burns filmstrip timestamps in with a DOM overlay
instead — do not reintroduce a `drawtext` label, it fails silently and yields zero frames.
`_tools/node_modules/puppeteer` is a symlink to the global install because `NODE_PATH` does not
work for ESM imports; keep it.

---

## VERTICAL SLICE ADDITIONS (P0 round 1) — contract unchanged, surface extended

The full contract above is implemented and honest. `aim/dragTo/release/tapAbility/aimAndFire`
are live (the slingshot is attached); `state()` reports real villain and ammo counts.

**Two more diagnostics, for critics and the harness:**

| hook | returns |
|---|---|
| `SS.__world` | the live `world` registry — `entities`, `blocks`, `debris`, `villains`, `projectiles`, `sling`, `rig`, `fx`, `phase`, `simTime`. Read-only by convention. |
| `SS.__physics` | the `Physics` instance, for `world.forEachRigidBody` sweeps |

**`state()` extras** (beyond the seven required keys): `bodies`, `blocks`, `debris`,
`slingState`, `drawn`, `tick`, `simTime`, `seed`, `driven`, `timeScale`, `hitStop`.

**Things worth knowing when you write a scenario:**

* `SS.aim()` sets the pouch *and* nudges the camera's intent, but the camera is a spring —
  screenshot straight after `aim()` and you photograph the camera mid-move. `seek(250)` first.
* `SS.release()` needs the sling in `dragging`. `aim()` puts it there; a bare `release()` after
  a level load returns `{ok:false, reason:'nothing to release (state="loaded")'}`.
* A shot resolves in roughly 3–8 s of sim time. Poll `state().phase` until it leaves
  `flying`/`settling` rather than seeking a fixed amount.
* The end-of-level overlay's count-up and star pops run on the WALL clock (they are pure
  presentation). `seek()` will not advance them — wait ~1.8 s of real time before screenshotting
  the overlay, or you will photograph zero stars and a zero score.
* `--mobile` is a different camera. Test camera work in both.

**Scenarios that already exist** in `_tools/scenarios/` and are meant to be reused:
`smoke` (boot→fire→collapse), `play` (a whole level), `motion` (release + collapse filmstrips),
`ability` (the split), `mobile` (portrait), `lose`, `win`, `realinput` (genuine DOM pointer
events, not the hooks), `final` (hook-surface audit), `cam` / `diag` (numeric probes).

---

## HOOK-HONESTY AUDIT (P0 round 2) — `_tools/scenarios/p0-hook-audit.mjs`

The acceptance run reported `resume: false`. That was the *probe* reading `SS.driven()` after a
`resume()` that returned a naked `true` — `false` there means "no longer driven", i.e. success.
A hook you can only interrogate through a second, differently-polarised hook is a hook that
will eventually be misread, and one misread hook silently corrupts every verdict after it.

So every state-changing hook now returns **an object whose field names say what they are**:

| hook | returns |
|---|---|
| `freeze()` | `{ ok:true, driven:true, tick }` |
| `resume()` | `{ ok:true, driven:false, tick }` |
| `setTimeScale(s)` | `{ ok:true, timeScale, driven, tick }` |
| `seek(ms)` | `{ ms, steps, tick }` |
| `seed(n)` | the seed actually in force |
| `aim/dragTo/release/tapAbility` | `{ ok, …what it set }` or `{ ok:false, reason }` |
| `audioMute(on)` | the mute state in force afterwards |

**Run `p0-hook-audit.mjs` after touching anything in `hooks.js`, `physics.js` or `slingshot.js`.**
It is 22 checks and none of them trust a return value on its own — each is cross-checked against
something observed independently: a body sweep, the tick counter against the wall clock, the
sling's own `pouch`/`drawn`/`state` fields, the projectile's real velocity one tick after
`release()` claimed a speed, `renderer.info` behind `perf()`, `audio.muted` behind `audioMute()`.
It also asserts the honest *failures*: `loadLevel('nope')` rejects, `seek(-5)` and
`setTimeScale(-2)` throw, `aim()` after firing refuses and names the state the sling is really in.

Status at P0 r2: **22/22 honest.**

One scenario was lying too, and it was not a hook: `win.mjs` fired a single shot, screenshotted
2.2 s later and called the file `win-overlay.png`. That was true only while one shot happened to
clear l1. It now plays until the level actually resolves and prints `RESULT: won` or
`RESULT: DID NOT WIN (…)`. If you write a scenario whose name asserts an outcome, make it check
the outcome.

---

## P3 ADDITIONS (destruction & structures) — contract unchanged, surface extended

**One new pair of hooks, and they are a LENS, not a game mode.**

| hook | returns |
|---|---|
| `SS.camLock({x, y, halfWidth})` | `{ ok, mode:'locked', cx, cy, halfWidth, dist }` — parks the camera on a fixed world box and stops the composition solver touching it |
| `SS.camUnlock()` | `{ ok, mode }` — hands the camera back (returns to the aim framing) |

They exist so a critic can inspect something small — a shard silhouette, a joint, the internal
structure of a dust ball — at a readable size, with the framing byte-identical in every tile of
a filmstrip. Nothing in the game calls them and the game never enters `locked` on its own; any
real camera intent (`focusSling`, `follow`, `frameAll`) clears it, and camera shake still plays
so a punch is still visible.

**Judge COMPOSITION at the game's own framing.** `camLock` is for criteria about geometry
(P3's shard shapes, debris sizes, contact shadows), never for P4's framing criteria. A P3
capture that uses it must say so; `_tools/scenarios/p3-destruction.mjs` does, in its header, and
also shoots `settled-gameframing` unlocked for exactly that reason.

**THE PLANE INVARIANT CHANGED, AND IT IS NOW A BOUND.**
`dumpBodies()` used to satisfy `t[2] === 0` exactly, because `clampPlane()` wrote z back to zero
on every dynamic body on every step. That write is what stopped anything in the game ever
falling asleep (rapier marks any body reached through `get_mut` as MODIFIED and the island
manager wakes it, `wakeUp:false` or not — measured: 0/15 bodies asleep after five seconds on an
untouched level). The clamp is now a `PLANE_EPS = 1e-6` deadband, so:

> **the invariant is `|t[2]| <= 1e-6`, not `t[2] === 0`. Assert the bound.**

Measured peak `|z|` across an entire l1 collapse is 1.2e-7 — three orders inside the bound and
five orders below one pixel. `_tools/scenarios/p3-planez.mjs` measures it; `p0-hook-audit.mjs`
check 15 was updated in the same change.

**Scenarios added** in `_tools/scenarios/`:
`p3-destruction` (the whole P3 evidence pack: rest diff, impact strip, chain-collapse strip,
settled census, one break per material), `p3-money` (the same beats at full resolution — dust
structure does not survive a 640 px filmstrip tile), `p3-budget` (P15's "particles degrade,
physics does not", as a pass/fail), `p3-planez` (off-plane drift), `p3-perf` (draw calls and
real rAF frame times through a collapse), `p3-sweep` / `p3-mats` (find a shot that exercises the
thing you are about to photograph).

**Three probe levels** — `_p3-wood`, `_p3-glass`, `_p3-stone` — are the same column geometry in
three materials, so "name the material from one cropped chunk" is directly testable. They are
harness fixtures, not content.

---

## P0 ROUND 3 — THE DRAG MAPPING IS FINE; FOUR SHARED SCENARIOS WERE NOT

**The report.** The acceptance run `final.mjs` began firing `angle 1.6077 rad` (~92°, straight up),
`lost`, score 0, 13/13 blocks untouched — from pixel constants that used to give a sensible
0.36 rad. Suspected: the screen→world drag mapping had regressed.

**It had not.** `_tools/scenarios/p0-aimmap.mjs` measures the mapping five ways and it is exact:

| probe | result |
|---|---|
| `worldToScreen(screenToWorld(px))` over a 9×9 grid | max error **0.000000 px** |
| drag fan, 8 directions | exact inverse — drag screen-left ⇒ fire 0°, drag down-left ⇒ fire **+45°**, drag up-left ⇒ **−45°** |
| 180° sweep of drag direction | strictly monotone, exactly **10° of launch per 10° of drag**, no discontinuity |
| `SS.aim()` vs the pointer path | **0.0000°**, **0.00000** world units, over five angles |
| `page.mouse` (real DOM) vs `SS.dragTo` | **0.0000°** — identical, on desktop *and* `--mobile` |

**What actually happened.** P4 re-solved the camera framing from the level, and `COMPOSE` now puts
the sling anchor at exactly **13.00 %W**. Every hard-coded drag pixel in the shared scenarios was
authored when it sat elsewhere, so all of them now land *in front of* the fork:

| scenario | pixel | world offset from anchor | result |
|---|---|---|---|
| `final.mjs` | 15.5 %W, 73.5 %H | **+0.78**, −2.60 | 92.11° |
| `p0-hook-audit.mjs` | 15.5 %W, 73.5 %H | **+0.78**, −2.60 | 92.11° |
| `motion.mjs` | 17.0 %W, 74.0 %H | **+1.25**, −2.68 | 91.94° |
| `realinput.mjs` | 15.6 %W, 76.0 %H | **+0.82**, −3.04 | 91.82° |

`setPouch`'s rear-hemisphere clamp folded each onto its `dx = +0.10` boundary, which is
`atan2(2.708, −0.10) = 1.6077 rad` — the reported number, exactly. Every hook still answered
`ok:true` with a plausible `drawn`, so nothing failed loudly. **`motion.mjs` was worse than the
others**: its `impact-collapse` filmstrip fired `aim(0.58, power:1.0)`, which misses l1 entirely
(13/13 blocks, 0 debris, score 0, still `flying` at t+2800 ms). Eighteen tiles of a projectile
sailing over an untouched tower, under a filename that says "collapse".

### Two rules that come out of this

**1. NEVER hard-code drag pixels in a scenario.** The camera framing is *solved*, so it moves
whenever a level, a screen shape or `COMPOSE` changes. `capture.mjs` now hands every scenario:

| helper | does |
|---|---|
| `aimPx(angle, power)` | the screen pixel for that shot, derived from the LIVE anchor + LIVE camera, restoring the sling afterwards |
| `dragShot(angle, power, {steps})` | grab + pull to that shot through the real pointer path; returns `dragTo`'s report |

`crit-P1-r1.mjs` already did this by hand (`proj(s.anchor…)`) and was the one drag scenario that
never broke.

**2. `dragTo()` now reports the SHOT, not just that it accepted the pixels.**

| field | meaning |
|---|---|
| `angle` | the launch direction this pouch would fire in, right now |
| `clamped` | `{ hemisphere, radius }` — whether a clamp moved the pouch off what you asked for |
| `grabbable` | whether main.js's pointerdown gate (near the pouch **or** in the launch bay) would have accepted this pixel. Informational — `dragTo` still honours the drag — but a scenario claiming to exercise the human path should assert it |

A caller cannot otherwise distinguish "I drew back to 20°" from "my pixels drifted and a clamp
gave me 92°". `p0-hook-audit.mjs` gained two checks for exactly this and is now **24/24 honest**
(was 22/22); one of them drags deliberately in front of the fork and asserts the clamp is
*declared*, not silently obeyed.

### A third thing, found on the way: FULL DRAW OVERFLIES THE LEVEL
`power: 1.0` lands the ammo around **x = 34** while the furthest villain is at **22.4**. Measured
over an angle × power sweep (`p0-winsweep.mjs`): `(0.36, 1.00)` scores 6 900 and
`(0.44 … 0.75, 1.00)` score **exactly 0 with all 13 blocks untouched**, while `(0.30, 0.90)`
clears l1 outright — 43 700, both villains, 3 ammo unspent. Three shared scenarios were aiming at
full power, which is why `final.mjs` still could not win even once its drag was fixed, and why
`win.mjs` was printing `DID NOT WIN`. Both now win. **This is a live tuning gap for P1/P2, not a
harness artefact: the top ~10 % of the draw is currently unusable on l1.**

### Scenario assertions added (a scenario must fail loudly, not drift)
* `final.mjs` — asserts the drag produced the angle it asked for, unclamped and grabbable, and
  asserts the run reaches `won`; prints `RESULT:` and throws *after* writing `final.json`.
* `motion.mjs` — asserts the draw is the shot it asked for, and that the `impact-collapse` strip
  contains an actual impact (`debris > 0`).
* `realinput.mjs` — asserts the human path drew the intended shot, and performs the DOM-vs-hook
  comparison its name promises but never actually made.
* `p0-dragproof.mjs` (new) — three different drags end to end through the real pointer path, with
  stills and flight filmstrips; asserts each released at the angle it was dragged to.

**Camera-drift trap for anyone writing a wall-clock scenario.** Two calls one CDP round trip apart
see a camera that has moved between them, so the *same pixel* legitimately unprojects to a
different world point. That is ~0.004 world units at 1280×720 — and **0.25 units / 5.8°** at
`--mobile`, where the camera sits ~104 units back and every pixel is worth ~3× more world. It
looks exactly like a mapping bug. `SS.freeze()` first and both paths share one projection; frozen,
DOM and hook agree to **0.000000** on both viewports.

### `exitSpeed` vs `speed` — two quantities, not a bug
`speed` is the cruise speed from the draw curve; `exitSpeed = speed × (1 + SLING.kick)` is the
muzzle velocity including the launch kick, which is unwound over `SLING.kickTicks` SOLVER STEPS.
Ratio is exactly **3.9** at every draw. `exitSpeed` is honest and `release()` names both.

---

## P1 ROUND 2b — THE LAUNCH KICK WAS DEAD, AND ONE AUDIT CHECK WAS PASSING BECAUSE OF IT

**The bug.** `SLING.kickTau = 0.034` was named, documented and reasoned about as SECONDS, and was
handed straight to `Ammo.setLaunchKick(ux, uy, e0, ticks)`, whose own docblock says "counted in
ticks, never in seconds". `Math.round(0.034)` is 0, clamped to 1 — **the entire launch kick was
unwound inside a single 8.3 ms solver step.** Every frame after the first travelled at bare cruise
speed, which is exactly what the round-2 critic saw and named: "the launch reads as a LOB rather
than a SNAP". The field is `SLING.kickTicks` now, `setLaunchKick()` **throws** on anything under
one step, and `release()` reports `kickSteps` and `kickMs` so the duration can be read back.

**`Slingshot.updatePreview()` was lying too, in the other direction.** It bled the kick off with
`Math.exp(-FIXED / SLING.kickTau)` — an exponential with a time constant — against a projectile
whose kick is a smootherstep counted in steps. Two different curves off two different clocks, so
the dotted preview drew a shot the button could not fire. It runs `Ammo.kickRemaining()` now, on
the same step counter, in the same order the engine uses.

**And the hook audit's check 10 was passing BECAUSE of the bug.** It sampled the projectile's
velocity one tick after release and compared it to the CRUISE number — a comparison that can only
hold if the kick is already gone one tick in. It now pins **both** ends of the curve, with
gravity's contribution subtracted so it measures the kick and not gravity:

| sample | must equal | measured |
|---|---|---|
| 1 step after `release()` | `exitSpeed` | 65.316 claimed → **64.882** |
| `kickSteps + 2` steps after | `speed` | 18.143 claimed → **17.928** |

Still 24/24 honest, and the new form of the check would have FAILED the build that shipped the
bug. Anything in `_tools/` that measured launch speed one tick after release and compared it to
`rel.speed` is testing the old defect, not the contract.

**New scenario: `_tools/scenarios/p1-r2b-snap.mjs`.** Nine shots; prints the AD-clearance curve,
the muzzle distance, both speeds and the pouch's signed recoil offset; shoots the release strip
twice (camLocked and at the game's own framing) plus the band ring-down; and **asserts** that
every draw ≥ 0.8 is ≥ 8 AD clear of the pouch at t = 50 ms, throwing if not.

**camLock gotcha, found while writing it:** `SS.release()` fires `onLaunch`, which calls
`rig.follow()`, and any real camera intent legitimately clears `camLock`. Locking *before* the
shot produces a filmstrip with LOCKED in its filename that is not locked — the framing rescales
between tiles and tile-to-tile displacement is meaningless. **Take the lock after `release()`.**
