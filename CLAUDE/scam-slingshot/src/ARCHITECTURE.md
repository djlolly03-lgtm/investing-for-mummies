# Scam Slingshot — module contract
Every agent builds to THIS. Do not invent parallel systems; extend these. If you must change an
interface, update this file in the same edit and say so loudly in your return value.

## Boot order (`main.js`)
`bootRenderer() -> bootPhysics() -> loadLevel(id) -> installHooks() -> loop()`

## Units & world space
- 1 world unit = 1 metre. Gravity `-9.81 * GRAVITY_SCALE` (GRAVITY_SCALE ~2.4 — Angry Birds gravity is
  punchier than real). Ground plane at y=0. Slingshot at x≈0. Structures at x≈14–26.
- **Everything lives on the z=0 plane.** Every rigid body: `setEnabledRotations(false,false,true)`
  (X/Y rotation locked, Z-rotation free) plus `physics.clampPlane()`, which holds z and vz on
  the plane after every solver step. **The invariant is `|z| <= PLANE_EPS` (1e-6), NOT
  `z === 0`** — see decision 6 below. Assert the bound, never equality. No exceptions — one loose body ruins the whole read.
  **Do NOT re-add `setEnabledTranslations(true,true,false)`.** It reads as the obvious other
  half of the lock and it silently removes all tangential friction from the whole game — with
  Z translation *and* X/Y rotation both locked, Rapier's two-direction friction solve is
  singular and returns zero impulse in both directions. Either lock alone is fine; the pair is
  fatal. Measured four ways in `_tools/scenarios/p0-friction3.mjs`; the long version of the
  story is in the `planeLock()` docblock in `physics.js`.
- Visual meshes may have depth (±0.6 in z) for 3D charm. Colliders are 2D-in-3D: boxes/balls/hulls
  with a fixed z-extent, never depending on z for gameplay.

## Fixed timestep (`physics.js`)
```
const FIXED = 1/120;                 // solver step
step(dtWall) { acc += min(dtWall, 0.25); while (acc >= FIXED) { world.step(); acc -= FIXED; tick++ } }
```
`SS.seek(ms)` runs exactly `round(ms/1000/FIXED)` solver steps + a render per step. NEVER wall-clock.
All randomness goes through a seeded PRNG (mulberry32) — never `Math.random()` — and there are
**two streams**, both derived from the one seed:

| import | who uses it | rule |
|---|---|---|
| `rng` / `rngRange` / `rngJitter` / `rngInt` / `rngPick` | anything whose result reaches a rigid body: level jitter, cut plans, debris impulses | this IS the simulation |
| `fxRng` / `fxRange` / `fxJitter` | `fx/` only — particles, dust, sparks | pixels only, never a body |

They are separate because P15 requires "particles degrade under load, physics does not: force
the particle budget low and the same collapse produces bit-identical body transforms". With one
stream that is impossible — a burst that emits 9 particles instead of 12 shifts every later
draw and the rigid bodies land somewhere else. Proven by `_tools/scenarios/p3-budget.mjs`
(budgets 1.0 / 0.5 / 0.05 → identical `dumpBodies()` bits). `art/toon.js` keeps a third, private
stream for the same reason: textures are built once and cached, so a rebuild consumes nothing.

## Materials (`art/materials.js`)
Named material presets only: `glass | wood | stone | ground | villain | ammo | prop`.
Each returns `{ three: Material, physics: { density, restitution, friction, breakImpulse, sound } }`.
Nothing in the game may use a stock un-tuned `MeshStandardMaterial`.

## Entities
`class Entity { mesh; body; material; onImpact(impulse, other); destroy(); }`
Registered in `world.entities`. Breakables implement `fracture(impulse, point)` returning child entities.

## Events (`events.js`) — the juice layer subscribes, never polls
`emit('impact', {a,b,impulse,point,material})`, `'break'`, `'villainDefeated'`, `'launch'`,
`'ammoSpent'`, `'levelWon'`, `'levelLost'`, `'abilityUsed'`, `'settle'`.
FX, audio, score and camera are ALL pure subscribers. No FX code inside physics or gameplay code.

`'launch'` carries `{ammo, power, speed, angle, point, velocity, muzzleDist, ad, adFx}`. `point` is
the POUCH, never the projectile — the release burst is pinned in world space at the sling (P1).
`muzzleDist` is how far the hard cut already threw the ammo.

**There are TWO ammo-size units and they are not interchangeable** (changed 6 Sep, P1 r6):
- `ad` — ONE AMMO DIAMETER, `Slingshot.ammoDiameter()`: the loaded mesh's bbox height **in the pose
  it is drawn in**. This is the rubric's house unit and every P1 *distance* threshold is written in
  it (the 8-AD clearance at +50 ms, the gap the trail leaves behind the shot), because the rubric
  measures the frame and the frame contains the rotated ammo. Use it for DISTANCES.
- `adFx` — the same ammo measured **pose-free**, `Slingshot.ammoSpan()`: the largest dimension of
  its local geometry. Use it for SIZES and SPEEDS. `ad` is not a constant per ammo: on the SIP
  Arrow it runs 0.832 at a 0.20 rad draw to 1.343 at 0.75 purely because a rotated dart has a
  taller bounding box, so anything sized in `ad` grows ~2.6x in area when the player merely aims
  higher. That is what `adFx` exists to stop, and `fx/index.js` documents the one conversion
  (`AD_PER_SPAN`) that lets constants authored in AD keep their values.

Either way, subscribers size and space in these rather than guessing from `radius` — for the SIP
Arrow `radius` and `ad` differ by nearly 3x.

## Camera (`camera.js`)
Single owner of the camera. Exposes intents, not transforms: `focusSling()`, `follow(entity)`,
`frameAll()`, `punch(strength)`, `zoomTo(z, dur)`. Nothing else may touch `camera.position`.

## Level format (`levels/*.json`)
```
{ id, name, chapter, sky, par, ammo:['sip','emergency'], blocks:[{mat,x,y,w,h,rot}],
  villains:[{type,x,y}], props:[{type,x,y}] }
```
Hand-authored. The loader validates and throws loudly on bad data.

## Hooks
`installHooks()` implements `_tools/HOOKS.md` exactly. It is not optional and not a debug extra —
it is how every critic sees the game.

---

## Determinism & driven mode  (added by P0 boot proof — READ THIS)
`physics.driven` is one bit that decides who is allowed to call `world.step()`:

| `driven` | who steps | when |
|---|---|---|
| `false` | the rAF loop, via the wall-clock accumulator | a human is playing |
| `true`  | **only** explicit `stepOnce()` / `SS.seek()` | any critic, any test, any capture |

`SS.seed()`, `SS.seek()`, `SS.freeze()` and `SS.setTimeScale(0)` all ENTER driven mode.
`SS.resume()` / `SS.setTimeScale(>0)` leave it. Without this, wall-clock steps leak in between
two `seek()` calls and nothing is reproducible. `SS.seed(n)` additionally **rebuilds the level
from scratch** so the seed genuinely determines the world.

Verified by `_tools/determinism.mjs` (run it after ANY change to `physics.js`, to `seek`/`seed`,
or to the vendored Rapier version):
* two independent browser **processes**, `seed(1)` + `seek(2000)` → byte-identical f64 transforms
* `seek(2000)` ≡ 20 × `seek(100)` → byte-identical (this is what `filmstrip()` does)
* a different seed → a different world
* exactly 240 solver steps for 2000 ms at `FIXED = 1/120`

**Never call `Math.random()`.** Use `rng()` / `rngJitter()` / `rngRange()` from `src/rng.js`.

## Vendored dependencies — no CDN
`three@0.185.1` and `@dimforge/rapier3d-compat@0.20.0` live in `src/vendor/`, wired by the
importmap in `index.html`. Rapier's wasm is inlined base64 inside `rapier.mjs` — nothing is
fetched at runtime. See `src/vendor/VENDOR.md` before touching versions.

## Where the P0 proof ends and the real game starts
`main.js` `buildProofScene()` is scaffolding for the level loader to replace. Everything else in
`main.js` — renderer boot, light rig, the loop, `syncAll`, the hook context — is real. Extend it.
`src/art/materials.js` and `src/events.js` are real contracts; P7 replaces the *shading* inside
materials.js but not its API.

---

# Vertical slice — what actually exists now (P0, round 1)

`buildProofScene()` is gone. The level loader replaced it, as planned. Everything below is
live code with a real contract; extend it, do not rebuild it.

## Module map

| file | owns | notes for the next agent |
|---|---|---|
| `main.js` | boot, the fixed-step loop, the phase machine, contact→damage routing, pointer/touch input | contains NO fx/audio/score/camera code. If you are adding a particle here, emit an event instead. |
| `world.js` | the single mutable runtime registry + entity registration | `world.simTime` is the ONLY clock animation may read |
| `physics.js` | Rapier world, FIXED, the plane lock, `holdOnce()` | unchanged contract + hit-stop support |
| `camera.js` | `CameraRig` — the sole owner of the camera | two framing sets (landscape / portrait), velocity feedforward, deterministic shake |
| `slingshot.js` | grab, stretch, clamp, trajectory preview, release, band recoil | `SLING` exports the tuning constants. **P1 r2b interface changes:** `SLING.kickTau` (seconds) is gone — it is `SLING.kickTicks` (SOLVER STEPS), because the seconds value was being consumed as a tick count and the launch kick was dying in one step; `Ammo.setLaunchKick()` now THROWS on anything under one step. `release()` additionally returns `kickSteps` / `kickMs`. `muzzlePoint()` takes `drawn` and ramps the geometric part of the cut with it. |
| `level/entity.js` | `Entity`, `makeBody()`, `shapes`, `syncAll()` | every rigid body in the game is created through `makeBody` so the plane lock cannot be forgotten |
| `level/blocks.js` | `Block` (damage + fracture), `Debris` | per-material cut plans, `SOURCE_SCALE` damage routing, `DAMAGE_FLOOR`, the debris cap, the crack decals |
| `level/structure.js` | the STRUCTURAL INTEGRITY layer — joint failure, the rack, the support audit, the shudder | turns "this block broke" into "the tower came down". Built by the loader, ticked from `main.js` inside the fixed step, and provably inert on an untouched level. Read its header before touching it. |
| `level/fragments.js` | the three shard silhouettes — wood sliver / glass triangle / stone lump | unit-sized cached geometry, own private prng; also feeds `fx/`'s chip pools |
| `level/shadows.js` | `ContactShadows` — one instanced blob under every body | pure presentation, driven from `render()`; a shadow MAP alone cannot answer "nothing floats" |
| `level/loader.js` | JSON load + validate + build, ground, environment | throws loudly and names the offending index |
| `ammo/base.js` | `Ammo`, `Trail` (shared breadcrumbs), `Ribbon` (per projectile) | nose-first flight, rolling resistance, ability plumbing. **P1 r2b:** `Trail.beginShot(origin, ammo)` takes the launched ammo as a second argument and stamps the release cut at the trail's own fixed TIME cadence, so the line is continuous from the pouch to the muzzle instead of one dot at the sling and the next ten units away. `origin`-only calls still work. |
| `ammo/sip.js` | `SipArrow` + `AMMO_TYPES` | ability = split into three |
| `villains/base.js` | `Villain` — hp, crush, alarm, idle, the death pop | |
| `villains/lotteryUncle.js` | `LotteryUncle` + `VILLAIN_TYPES` | the cheque becomes a real rigid body on death |
| `art/toon.js` | ramps, procedural canvas grain, `glassPane()`, `smokeSprite()` / `blastSprite()` / `flashSprite()`, `ink()` / `inkAll()` / `inkEdges()`, `makeEye()` | has its OWN prng; never import rng.js here |
| `art/materials.js` | the seven presets | unchanged API, toon shading inside |
| `fx/index.js` | eight shape-specific particle pools (incl. the dark release `blast`), hit-stop, camera punch routing, score popups | pure subscriber; draws from the FX prng only |
| `audio/index.js` | the Web Audio synth + cue table | pure subscriber, lazy AudioContext |
| `ui/hud.js` | the whole DOM shell | pure subscriber + `refresh()` |

## Eight decisions that are load-bearing

1. **The approach-speed gate.** A settled structure generates enormous contact forces every
   step because it is holding itself up. Damage and FX are gated on `approach` — the larger of
   the two bodies' speeds at the END of the previous tick, which is their pre-collision speed.
   Below 1.2 m/s a contact is "resting", not "hitting". Villains still take slow *crush* damage
   from resting contacts; blocks do not. Without this the level self-destructs on load.

2. **Hit-stop advances the tick clock.** `world.hitStop` freezes the solver for N ticks while
   `physics.tick` keeps counting (`physics.holdOnce()`). `SS.seek(2000)` is therefore still
   exactly 240 ticks and the determinism gate's step-count check still holds. Particles and
   camera shake keep running through the freeze — that is what sells it as impact.

3. **Impulse is the universal currency — but it is NOT `mass × closing speed`.** Rapier
   reports contact FORCE; `force * FIXED` is the impulse in N·s, and every threshold in the
   game (`breakImpulse`, villain damage, `hard` impacts, hit-stop strength) is in those units,
   so they can be reasoned about against each other. This line used to end "directly
   comparable to `mass × closing speed`", every `breakImpulse` was authored from that sentence,
   and it is **false** — it cost the game its stone and wood destruction for five rounds.
   What the solver reports is the impulse the STRUCK BODY absorbed in that step, bounded by
   its mass and how well it is braced, not the momentum the projectile was carrying.
   Measured over 69 landed shots (`_tools/scenarios/p3-r6-punch.mjs`): a 0.62 kg dart lands at
   14–17 m/s on every shot that reaches the tower (≈9–11 N·s of momentum) and produces a
   first-contact impulse of **0.7–11.8 N·s** — ~3 into a 0.27 kg glass column, ~11.8 into a
   braced 1.6 kg beam. **Any new threshold must be measured against that distribution, not
   derived from a momentum sum.**

4. **Anything the sling holds must be written to the BODY, not the mesh.** `render()` calls
   `syncAll()`, which copies every body transform onto its mesh. A mesh-only write is erased
   microseconds later.

5. **The camera composition is SOLVED from the level, not tuned.** (P4 r1 replaced the four
   hand-tuned `{hw,hh,cx,cy}` presets; `FRAMING` / `FRAMING_PORTRAIT` are gone.) `camera.js`
   exports `COMPOSE` — four measured numbers (sling at 13 %W, furthest target at 87.5 %W,
   ground line at 77.5 %H, ≥40 %H of empty sky above the tallest object) — and `solveAim()`
   turns them plus the level's own extents into `{vw, vh, cx, cy}` in closed form. Add a level
   or change a screen shape and the framing follows; nothing needs re-tuning. `remeasure()`
   after any level load (main.js `loadLevel` already calls it).
   Portrait fits the SAME world width, which needs the camera ~104 units back, so the fog and
   the far plane are now **relative to the dolly distance** (set in `CameraRig.commit`) rather
   than fixed — that is what stops a phone rendering a pale blue nothing, and it is why
   `MAX_DIST` is 150. Test every camera change at `--mobile`.
   **P4 r4 — THE FLIGHT IS A PUSH-IN, AND THE WIDTH ONLY EVER FALLS.** Round 3 solved the
   arrival width from the rubric's joint lead band (`vw >= 20*d`), which is an inequality that
   can only ever answer "wider": the frame reached **1.87x the establishing frame at the moment
   of first damage** and the struck tower was 14.6 %W. It is gone. The arrival width is now
   solved from the SUBJECT (`solveLead`: it must fit, and it must read) and clamped **below 1.0x
   the aim frame in both directions**, so `aim 35.17 -> drawn 39.55 -> traverse -> 20.05 at
   contact (0.57x)` with a measured single-step rise of **0** anywhere in the flight. Three
   invariants hold this shape and none of them is optional:
   * `_vwCap` — the commanded flight width ratchets down and may never widen.
   * the HOLD GUARD (`COMPOSE.holdEdgePctW/holdEdgePad`) — a floor under that push-in so the
     narrowing frame cannot shove the standing level off the right edge. Without it the level's
     far edge reached **109.7 %W on 6 of 12 sampled shots**; with it the worst case over the same
     grid is 99.1 %W, i.e. nothing is ever cut off, and the width curve stays monotone because
     the guard is anchored on the monotone `_camFloorX`, never on the live camera x.
   * `COMPOSE.settleHoldSec` — the settle framing locks outright after 2.5 s. The camera's stop
     must not be conditional on the physics stopping: measured on l1 out to 14 s, only 1 of 12
     bodies was asleep and the settle solver was still nudging the frame.
   Two composition constants carry deliberate margin rather than sitting on a rubric edge:
   `skyMinPctH` 0.405 (the sky rule is an equality, so 0.400 reads as 39.5 in anyone else's
   probe) and `leadBandMargin` 0.010 (at 0.005 the projectile measured 54.84 %W, outside the
   55-75 band it was nominally sitting on).
   The rubric's "projectile 55-75 %W **and** target structure 40-60 %W" pair is NOT jointly
   satisfiable while the arrival is tight. Their screen separation is `100*d/vw`, so the pair
   needs `vw >= 20*d`; on l1's canonical shot `d` is 3-5 units, i.e. `vw >= 62-100` — two to
   three times the establishing frame, which IS the round-3 defect. Round 4 bought the
   projectile half and lost the blind A/B on the other one.
   **P4 r5 — THE ARRIVAL ANCHOR IS THE SUBJECT, NOT THE BALL.** Round 4's flight framing was
   `camx = p.x - (mark - 0.5)*vw` with the mark pinned at 55.5 %W for the whole flight, so the
   structure got whatever %W was left over. Measured over five shots (`_shots/P4/r5-base`):
   structure MID **68.5-73.6 %W**, its far edge **92.0-95.4 %W** (no room for debris), its near
   edge 45.1-53.0 %W — i.e. HALF THE FRAME empty behind the shot. A fresh critic drove that
   against Angry Birds and picked Angry Birds, naming exactly that.
   So over the last half of the run (`COMPOSE.arrivePanAt` 0.48 -> `arrivePanBy` 0.98, a
   smoothstep on the ball's progress along the run, not a timer) the camera's X blends off
   `projIdealX` and onto a pose solved from the standing structure — its centre on
   `arrivalStructPctW` (0.52, mid-band so noise cannot push it out), clamped so the contact
   point stays inside `arrivalContactMin/MaxPctW` and so nothing standing crosses
   `arrivalEdgePctW`. The width solve is unchanged in shape but its FIT rule is now measured
   from the subject's own centre rather than from the projectile's mark (`arrivalFillMax` 0.47
   is what actually binds on l1, and reproduces round 4's arrival width to within 1 %).
   Measured after (`_shots/P4/r5-e`, same five shots): structure MID **51.8-52.1 %W**, spanning
   **29.2 -> 74.9 %W**, fill 44.7-45.7 %W, `vw` still monotone-down with a single-step rise of
   0 anywhere. Same on portrait (51.2-52.3 %W). The projectile crosses its own band on the way
   out (peaks 56.1 %W) and arrives at 33-40 %W — 60 %W of frame ahead of it in its direction
   of travel, which is lead room, not centring. That trade is deliberate and is the one the
   round-4 critic asked for; the subject is 45 %W wide and the ball is 1 %W.
   Two invariants hold the new move and neither is optional:
   * `_arrX` — the SUBJECT's pose is latched monotone in the direction of travel (the contact
     and edge clamps are re-applied to it every step rather than latched with it, because both
     of their bounds scale with the closing frame width: latching a clamp evaluated at vw 39
     and reusing it at vw 21 leaves it silently unsatisfied).
   * the NO-OVERSHOOT rule in `update()`'s tracking branch. `want.x` is monotone by
     construction and the camera catches it from behind, so being to the RIGHT of it is ringing,
     not composition — measured 1.51 units past at t=440 ms, still walking back through the
     whole impact hold. `COMPOSE.trackStiffness` (110 -> 260) is the other half of that: the
     steady-state error against an accelerating want is -A/k, and it is what the camera pays
     back as velocity it has to shed in one frame when it arrives.
   **P4 r6 — THE CAMERA MAY NOT OVERTAKE THE SHOT.** Round 5 composed the arrival correctly and
   then reached it too early. Measured on the shipped r5 build (`_shots/P4/r6-base/LEAD.json`,
   canonical shot, contact at 560 ms): between t = 140 and t = 380 the rig panned **9 world
   units while the projectile covered 2.5** and dollied 32.2 -> 22.8, so it was parked on the
   impact framing 180 ms before the ammo arrived and the shot slid BACKWARDS across the frame,
   sitting at **30-40 %W for the whole second half of every flight**. Three rounds had now
   produced three different symptoms (r3 zoomed out at the hit, r4 pinned the ball and jammed
   the tower right, r5 overtook it) because all three were tuned as percentages. Round 6 states
   it kinematically instead, and the rule is not optional:
   > **The projectile's screen position is monotone non-decreasing in its direction of travel,
   > from release to contact.** (`_markFloor` in `followBody` — the LEAD RATCHET.)
   The camera may pan (never backwards — `_camFloorX`) and may dolly, but the composition of
   those two moves may never walk the ball back across the frame. Everything else in the flight
   is now a WANT that is granted only as far as the ratchet allows, and **what cannot be paid
   for before the hit is paid for ON the hit**. Three parts:
   * the RUN ENDS AT THE PREDICTED CONTACT (`_runEnd`, smoothed), not at `e.left`. On l1 the
     ball flies 1.67 units past the level's near face before it touches anything, so every ramp
     keyed to `e.left` finished ~180 ms early — that single wrong reference is most of the r5
     defect. Both ramps now start at `arrivePushAt` / `arrivePanAt` = 0.80 of THAT run.
   * the ZOOM IS FROZEN ACROSS THE TRAVERSE. Commanded width is `0.84 x aim` from the end of
     the release punch to 80 % of the run; measured width at 35 % / 60 % / 85 % of the flight is
     31.2 / 30.3 / 29.2 (ratio 60/35 = 0.945-0.997 across six shots), then the push-in.
   * the IMPACT BEAT (`IMPACT_SNAP` 0.28 s, `COMPOSE.impactGlideRate`) is no longer a freeze —
     it is the push-in. `_arrPose` (solved from this shot's own predicted contact half a second
     earlier) is landed during the beat: vw 25.0 -> 20.6 and standMid 68.1 -> 60.1 %W over
     280 ms, handing to the settle framing mid-collapse.
   The arrival anchor also stopped being the bounding-box centre of everything standing:
   `COMPOSE.arrivalEventBias` (0.45) blends it toward the contact point, because on l1 `st.midX`
   is x = 19.95 — **the gap between the tower and the outpost** — so centring it centred nothing
   and put the collision itself at 37 %W.
   Measured after, six shots (`_shots/P4/r6-b/LEAD6.json`): projectile **55.98-56.18 %W for
   100 % of every flight** after the launch lag, worst single-step backwards motion **0.08 %W**
   (was ~26), worst camera-minus-ball speed 0.6-4.0 m/s (was ~28). Criterion 4b still cannot be
   bought with it — the pair needs `vw >= 20*d` and `d` is 3.1 units at contact, i.e. vw >= 62,
   which IS the r3 defect — so the structure's mid reads 66.9-71.5 %W at the frame of contact
   and 60.1 %W by the end of the beat. That is stated, not hidden: the rubric's automatic FAIL
   is on 4a ("the projectile is centred during flight instead of led"), and 4a is now bought
   outright rather than traded away.
   NEGATIVE RESULT, do not retry: smootherstep instead of smoothstep for the pan easing is
   WORSE (32.6 -> 40.4 units/s shed in one 20 ms sample) — gentler ends mean a higher peak rate
   for the same distance, and the landing is set by peak rate, not by end conditions.
   **P4 r7 — THE SHOT CROSSES THE FRAME. THE CAMERA DOES NOT GO AND GET IT.** Rounds 3-6 each
   fixed a defect in the camera's MOTION and left the same premise standing: that the flight
   camera's job is to ACQUIRE the projectile and carry it. Round 6 succeeded at that premise
   and the fresh critic failed it for exactly that — measured on the shipped r6 build
   (`_shots/P4/r7-base`, `_shots/P4/r7-sweep-base`, 12 shots): the dart welded at
   **55.98-56.18 %W for 100 % of the traverse** (0.15 %W of variation over 360 ms), reached by
   panning **BACKWARDS 1.8-2.5 world units (5.0-7.2 %W) in the first 100 ms**, throwing the
   sling from 13.0 to −0.6…−10.7 %W and the structure's far edge to 90.5-93.9 %W, with 54 %W
   of frame dead BEHIND the shot. Both mid-flight reference frames do the opposite: the sling
   is still in shot (8.9 %W in `ab_camera_sky-dominant-low-horizon_02`, 17.8 %W in
   `ab_launch_release-instant-band-recoil_03`) and the bird is crossing a frame that is not
   moving. So the flight framing IS the aim framing, held, and it takes three things:
   * `COMPOSE.flightZoomTraverse` 0.84 -> **1.00**. The drag pull-back returns to rest and
     stops there; the frame the shot crosses is the frame the shot was composed in.
   * `_camFloorX` seeded at **`this.pos.x` on the frame of release**, not at `bounds.minX`.
     That seed is where the backwards lurch was legal: `bounds.minX` sits 0.15·vw left of the
     resting centre, so "the camera never pans back" held only against a floor five units
     behind where the player was looking.
   * `drawing()` no longer drifts the centre downrange (`a.cx + a.vw*0.030*k` is gone). **The
     pull-back is a ZOOM, not a pan.** Because the floor is seeded at the camera's real
     position, that 1.06-unit drift was inherited by the whole traverse: the shot crossed a
     frame one unit downrange of the aim framing and the sling slid to 11.1 %W while the frame
     was nominally held. Cost is on the DRAWN frame only (sling 17.4 %W instead of 14.8,
     target 79.3 instead of 76.6); criterion 3's marks are measured at aim and are byte-for-
     byte unchanged (13.00 / 83.22 %W, sky 40.54 %H, ground 77.50 %H, edge drift 0.000°).
   Also: the traverse mark's CLAMP — `traverseMarkPctW` (was `leadProjMinPctW` + `leadBandMargin`
   = 0.560) and the no-prediction fallback `flightProjPctW` (was 0.5525) — is now **0.700**,
   with `leadProjMaxMark` 0.70 as the ratchet's ceiling. The mark solve returns a
   value below the rubric's band on every frame of every real traverse (the pair needs
   `vw >= 20*d`, never true here), so the CLAMP is the composition, not the solve — at 56 %W
   it is a peg the camera drags the world past, at 70 %W it is the far boundary of the band
   and the camera only picks the ball up when it would otherwise run out of room ahead of it.
   Measured after, eight shots (`_shots/P4/r7-final/CROSS.json`): worst backwards pan **0.000
   world units**; canonical **40.4 -> 59.6 %W with camx frozen at 13.013 for 100 % of the
   pre-contact flight**; flyover **40.6 -> 69.9 %W** (the mark is reached only by a shot long
   enough to need it); sling in frame for 100 % of five of eight shots and >= 91 % of the
   rest; structure 56.1 -> 82.6 %W held against an aim reading of 56.2 -> 83.2.
   **STATED, NOT HIDDEN: criteria 3 and 4a conflict on a HITTING shot, and 3 wins.** With the
   frame fixed by criterion 3 (camx 13.01, vw 35.17) and l1's ammo leaving the muzzle at
   x = 9.23 and touching the tower at x = 16.87, the whole visible flight spans 40.4-59.6 %W
   and its midpoint is the frame's own centre to within 4 cm. Putting that midpoint at 65 %W
   needs camx 7.7 — sling at 29 %W, target at 98 %W. The only other way to buy 4a is round 6's
   weld. So the ball crosses THROUGH centre rather than sitting on it, which is the distinction
   4a's automatic FAIL is written on ("CENTRED during flight instead of led" = pinned), and the
   reference frames agree (bird at 40.6 %W and 66.7 %W with the sling in shot in both).
   Widening l1's sling-to-tower span is **P12's** lever, not the camera's.
   Consequences worth knowing: the camera never rolls or tilts (`up` is hard-set to +Y and
   `lookAt` is straight down −Z), so eye level is ALWAYS exactly 50 %H and vertical edges are
   exactly vertical; non-tracking framing moves are exponential glides with a snap threshold
   so they provably STOP; and the rig owns the key light's shadow frustum, sliding light and
   target together so blocks at the right-hand end of a level keep their contact shadows.

6. **The plane clamp is a DEADBAND, and that is why anything ever sleeps.** `clampPlane()`
   used to snap z to exactly 0 on every dynamic body on every step. `wakeUp = false` does not
   save you: every JS body setter goes through rapier's `RigidBodySet::get_mut`, which marks
   the body MODIFIED, and the island manager wakes every modified body on the next step.
   Measured on an untouched l1: 1800 setter calls per 120 steps and **0 / 15 bodies asleep
   after five seconds** — which is one of P3's automatic-FAIL conditions ("a never-sleeping
   body on an untouched level"), caused entirely by a diagnostic. It now clamps through a
   `PLANE_EPS = 1e-6` deadband; measured peak `|z|` across a full collapse is 1.2e-7
   (`_tools/scenarios/p3-planez.mjs`), so at rest the clamp never fires and 15 / 15 bodies are
   asleep within 500 ms. **Assert the bound, not equality** — `p0-hook-audit.mjs` was updated
   in the same change.

7. **Separation before fragmentation is a damage-ROUTING rule, not an art rule.**
   `blocks.js` `SOURCE_SCALE` scales incoming impulse by who hit you: neighbouring block 0.22,
   loose chunk 0.12, villain / ground 0.30, prop 0.5, spent ammo 1.0. Without it, one good hit
   disintegrated eight of thirteen blocks and shots two, three and four had nothing left to
   play with. With it the tower comes apart at the joints, whole blocks are the primary debris,
   and surviving blocks are still touching a neighbour 300 ms after impact — which is what
   `ab_destruction_stone-tower-mid-collapse_01` actually shows.

   **The other half of the same rule is `AMMO_PUNCH` (r6).** A *travelling* projectile is not
   on that table: its contact impulse is multiplied by 2.6, ramped down to 1.0 between 13 and
   6 m/s so a dart that has come to rest in the wreckage is just another loose body. It is
   there because of the measurement in item 3 — with the projectile capped at what the struck
   block could absorb, nothing it hit ever reached a break threshold, so *every* fracture in
   the game came from accumulated jostling: the exact inverse of "fragmentation happens only
   where the projectile actually hit". Amplifying the solver's own number rather than replacing
   it keeps the parts of it that should matter (how square the hit was, how braced the target
   was, how much mass was behind it) and fixes only its scale. The chain scales above are
   untouched by it, which is why round 5's separation numbers survived the change.

8. **Dust and the impact flash live on their own z slab (`FX_Z = 1.15`), in front of the play
   plane.** Blocks are 1.05 deep, so a billboard emitted at the contact point sits *inside* the
   block volume and the near half of every beam and column draws over it. Before this, a full
   l1 collapse emitted seven dust balls and the filmstrip showed almost none of them. Nothing
   above ground level lives past z = 0.6 and the foreground grass starts at z = 4.2, so 1.15 is
   a clean lane.

## Glass is sized-per-block, and that IS a contract  (P3 r3)

`RoundedBoxGeometry` gives every face UV 0..1, so ONE tile stretched over a 0.40 × 2.60 column
is a 6.5:1 smear: every vertical highlight becomes a long thin line and the pane reads as a
plastic tube. Glass therefore does **not** use the shared cached preset material the way wood
and stone do.

* `art/toon.js` `glassPane(w, h)` returns a canvas sized to the block's own aspect (pixel
  density is then equal on both axes: `CW/w === CH/h === 320/sqrt(w·h)`), so the bevel frame
  can be drawn at a constant `FRAME_WORLD` **metres** on every pane in the level. Cached on
  the size quantised to 5 cm — a level costs two or three canvases.
* `level/blocks.js` `glassBase(w, h)` clones the glass preset once per size and puts that
  canvas on `map` **and** `emissiveMap` (the cyan lift has to follow the facets, not flood the
  pane). `crackedVariant()` and `crackMap()` therefore take `(matName, step, w, h)`.
* **Never share one glass material across two block sizes**, and never set `map.repeat` on a
  pane to "fix" a stretch — that tiles the bevel frame instead of fitting it.

Two more glass rules that are load-bearing rather than cosmetic:
* The ink is `PALETTE.glassInk` (`0x3ba9cf`, luminance 148) at thickness **0.026**, not the
  house navy at 0.048. Measured on `ab_destruction_intact-glass-pyramid-at-rest_08`, an ice
  block's contour is its own deepest facet (141–154 against a 205–224 body) — a near-black
  outline at house thickness put ~36 % of a 0.40 m column's on-screen area inside the ink,
  which is what "reads as unshaded scaffolding" was.
* The fx glass chip pool carries `glassChipMask()` as its `map`. The chips are unlit
  `MeshBasicMaterial` instances, so without a multiplier every one is a single flat colour;
  the mask gives each a lit face, a shaded face and a hard break, which is what makes the
  smallest particulate still read as the same material as the shards.
* **That mask shades toward CYAN, not toward grey, and the tint list is saturated for the same
  reason (r7).** Glass and stone in this game are separated by SATURATION, not by value — the
  reference agrees (`ab_destruction_glass-shatter-and-rubble_02`: the ice prop measures S p50
  = 0.88, the stone rubble beside it S p50 = 0.00). A neutral grey multiplier takes value away
  and leaves saturation alone, so every shaded facet of a glass chip slid straight into the
  box the game's own stone occupies: `0xd8f6ff × #bcc4c8` renders at **rgb(159,189,200), S =
  0.20** against rendered stone's S p50 of 0.19, and that was **19.5 % of all glass-chip body
  pixels** at the critic's own timestamp. The facets are now the glass hue at the *same linear
  luminance* as the greys they replaced (0.7859 / 0.5434 / 0.3536, matched to four decimals),
  so the chip's internal contrast is untouched and only the hue of the shading moved. If you
  re-tune them, hold the luminance and move the hue, never the reverse.

## Level format, as implemented

```jsonc
{ "id","name","chapter","sky","par",
  "teaches": "one line, shown on the end card",
  "ammo": ["sip","sip","sip","sip"],
  "blocks":   [{ "mat":"wood|glass|stone|prop", "x","y","w","h","rot" }],   // x,y = CENTRE
  "villains": [{ "type":"lotteryUncle", "x","y" }],
  "props": [] }
```
The loader rejects unknown materials, non-finite numbers, non-positive sizes, blocks that start
below ground, and unknown villain types — each with the offending index in the message.
Every block gets ±0.004 of seeded jitter so the level is genuinely a function of the seed.

---

## P2 ROUND 1 — THE POWER CURVE WAS THE WHOLE DEAD ZONE

**The report.** Two independent sweeps found the same thing from opposite ends: "power 1.0
overflies the level entirely", and "of 14 sampled shots only 2 won and 7 scored LITERALLY ZERO
with all 13 blocks standing". The orchestrator also noted the space was CLIFFY — 0.20@1.0 wins,
0.28@1.0 gets one kill, 0.44@1.0 gets nothing — with no gradient for a player to learn from.

**Measured, before touching anything** (`_tools/scenarios/p2-sweep.mjs`, 8 angles x 3 powers,
fresh restart + fixed seed per shot, `_shots/P2/before`):

| draw | land x, across all 8 angles | outcome |
|---|---|---|
| 0.60 | 10.4 – 11.9 | **8 of 8 scored zero** — ten units short of the tower |
| 0.80 | 17.1 – 18.8 | the only draw that worked, and cliffy inside itself: 42700 / 6900 / 42200 / 1100 / 41600 / 6600 / 41900 / 43700 |
| 1.00 | 27.7 – 29.7 | **6 of 8 scored zero** — five units past the END of the level |

**14 of 24 shots scored exactly zero.** That is not a level-design problem and it is not an
aiming problem: the playable band was about one twentieth of the pull wide.

### Root cause: range went as roughly draw^3.4
`Slingshot.power()` was `maxSpeed * (0.34t + 0.66t²)` — convex, chosen so "the last 25 % of the
pull buys disproportionately more speed". But the player reads RANGE, not speed, and the
ballistic part of the flight goes as v². A convex speed curve therefore produces a *cubic-ish*
range curve, which is exactly the observed 11 / 18 / 28 with silence either side.

`power()` is now `maxSpeed * t^0.55` — **concave**, which makes range close to LINEAR in draw:
pull half as far, go about half as far. `maxSpeed` came 16.5 -> 14.4 to sit the top of that
(now much flatter) envelope on the far end of the level instead of past it.

**Nothing else in the flight changed.** `GRAVITY_SCALE` is still 2.4, the ammo's linear damping
is still 0.055, and P1's release cut (`muzzleBase`, `muzzleLead`, `kick`, `kickTicks`) is
untouched — `p1-r2b-snap.mjs` still passes, and the mid-band clearance actually improved
(a 0.80 draw is 9.11 AD clear at t=50 ms, up from 8.37 AD, because a concave curve makes a 0.80
draw faster than it used to be).

### l1's catch profile was widened to match the new envelope
A readable range curve is only half of it — the level has to be standing where the shots land.
l1 went from 13 blocks in one tower plus a 1.3-high hut, to 17 blocks in two real structures:

* the tower keeps its geometry, but its lower-tier **outer** columns are glass and the inner
  ones wood (a weak, flat shot now meets something breakable instead of bouncing off a post),
  and its crown is stone + a glass bulb, so a shot that grazes the top **shatters something**
  instead of kissing a stone corner and scoring nothing;
* the far hut became a real outpost — two wood posts, a glass column, a 4.0 roof beam, a glass
  cap and a stone cap — spanning x 20.7 – 24.7 up to y 3.6, which is where a FULL draw lands.
  Villain 2 sits on its roof; villain 1 is nested inside the tower.

**Result, same instrument, seeds 1 / 3 / 7:** `ZERO-SCORE SHOTS: 0 / 24` on every seed.

### Two rules that come out of this
1. **A shot list in a scenario is a tuning fact and it goes stale.** `win.mjs`, `final.mjs` and
   `motion.mjs` all encoded the old winning draw, and `final.mjs` additionally *repeated one
   shot* — which only ever won because one draw happened to clear the whole level at once. They
   now carry measured multi-shot plans (l1 has two targets at two ranges: a ~0.60 draw for the
   tower, a full draw for the outpost) and say so.
2. **Never assert a level's content as a literal.** `p0-hook-audit.mjs` check 5 was
   `restart.clean.blocks === 13` and became a false FAIL the moment l1 gained blocks. It now
   measures the count at load and asserts restart restores *that*. Same failure mode as the
   hard-coded drag pixels. Audit is back to **24/24 honest**.

### Still open after this round (not P2's to fix, but measured here)
* **The 0.80-draw band chips rather than collapses.** It arrives at the tower's upper-left
  shoulder (y 3.9 – 7.1) and takes 3–4 blocks for ~1100–1400 points at every angle. Nothing is
  silent, and it is flat and readable across angle — but it is the weakest of the three draws,
  so the power->damage curve dips in the middle even though the power->range curve is clean.
  That is a destruction/structure question (P3/P12): the tower's upper storey sits on a mid
  beam that acts as a floor, so an upper hit can never pancake onto villain 1.
* **Draw calls are 418–466** (was 365 at 13 blocks). The wider catch profile costs geometry.
  P15's batching job got bigger.
* **Star thresholds are still wrong** (P13): a 45 300 two-shot clear awards 2 stars, a 43 500
  clear awards 1.


---

## P3 ROUND 5 — SUPPORT IS A STATE, AND THE BAY GOES OVER AS ONE OBJECT

**The report.** "A hit destroys only the blocks it directly touches — the rest of the tower
never reacts… the load-bearing frame (two wood posts, two glass columns, bottom beam, mid
beam) sits at |angle| <= 0.01 rad and 0.00 u from its authored pose at impact+1000 ms, with
debris resting on top of it and the villain inside untouched."

**Measured, from the TRUE first projectile contact** (`_tools/scenarios/p3-r5b-time.mjs` — the
r5 gate's "walk until a block moves" contact detector trips on a graze and can be several
hundred ms early, so every timing number here is taken from the first `onImpact` whose source
is the ammo). At the start of this round the ground floor was at 0.03–0.15 rad at hit+800 ms
on three of four sampled shots, and at **0.00** on the fourth. It did come down — at
hit+1000–1600 ms, and by the mid beam accumulating enough contact damage to snap. The frame
was being DISMANTLED, never toppled.

### Three things were missing, and one of them was a determinism bug

1. **`onCollapse()` only fires when a member DIES.** Shot 0.26@0.95 shoved five blocks of the
   upper storey clear of their poses without destroying any of them, so nothing armed and the
   ground floor sat at 0.00 rad for 1.2 s under a storey that had already left. Support has to
   be re-read while things are moving. → `audit()`, and `structure.arm()` is now called from
   `Block.onImpact` (past its approach gate) rather than only from a break.

2. **A four-post bay under one stiff lintel cannot be racked joint by joint.** The first
   version applied a pure couple to each post plus the matching push to the lintel; a post
   wedged between the bottom beam and a loaded lintel cannot rotate without lifting the lintel
   and the debris heaped on it, so the contact solver cancelled the spin inside two steps and
   the frame measured 0.05 rad 800 ms later. Every impulse that is not consistent across the
   bay is spent fighting the bay's own contacts. → `rack()` now hands each member the
   assembly's own rigid-body velocity field about its downwind toe (`v = ω × r`, plus the
   assembly's spin). No relative motion for the solver to resolve, so the bay leans as a unit
   — which is both `ab_destruction_stone-tower-mid-collapse_01` and the reason cohesion at
   +300 ms stays at 100 %.

3. **`structure.lean` was not reset with the level.** Once the audit existed, the collapse
   direction it inherited came from the PREVIOUS level's last collapse. `determinism.mjs`
   could not see it because that gate never fires a shot — it rebuilds and settles. Three
   identical shots from one seed were bit-identical until the first fracture and then
   diverged. **Anything in `structure.js` that survives `reset()` is a bug of that shape.**
   New gate: `_tools/scenarios/p3-r5-detshot.mjs`, which fires the same shot three times and
   diffs `dumpBodies()` across first contact and first fracture. Run it after any change to
   `structure.js` or `blocks.js`.

### And a counterweight had to be added in the same round
A bay that goes over lands on itself, and at the old damage routing that turned every collapse
into anonymous rubble: **12 of 17 blocks fragmenting on one shot, 8 of 8 sampled shots clearing
the level outright.** The killing blows were 4 % and 16 % events — a 4.80 m lintel dying at
9.51 / 9.50 from a 0.40 N·s nudge — i.e. death by a thousand taps from falling wreckage.
`blocks.js` `DAMAGE_FLOOR` (0.08 of the block's own threshold) says **a bump is not a blow**:
below it, nothing is scaled down, it is ignored. The projectile is exempt, because
"fragmentation happens only where the projectile actually hit" — with ammo inside the floor an
entire shot measured BROKE 0 / 17 standing.

### Result on the l1 gate (`_tools/scenarios/p3-r5-gate.mjs`, 8 shots, seed 4242)

| | round 4 → r5 start | after |
|---|---|---|
| MOVED at impact+800 ms (target ≥ 3) | median **4**, worst 2 | median **8.5**, worst 6 |
| load-bearing frame reacted | median **2.5/6**, two shots at **0/6** | median **5/6**, none at 0 |
| blocks destroyed by one shot | median **9.5/17** | median **5/17** |
| still standing at settle | median 7.5 | median **12** |
| cohesion at +300 ms (rubric ≥ 60 %) | 100 % | 100 % |
| shots that clear l1 outright | **8/8** | 5/8 |

Regression gates all green afterwards: `determinism.mjs` PASS, `p3-r5-detshot` PASS,
`p3-r5-rest` PASS (0 audits, 0 racks, 0 tips on an untouched level; max body drift 1.0e-3 u,
all of it the idling ammo), `p3-budget` bit-identical at 1.0 / 0.5 / 0.05, `p3-planez` peak
|z| 8.5e-8, `p0-hook-audit` 24/24, zero console errors or warnings, zero frames over 100 ms.

**Known cost, measured:** `p2-sweep` on seed 3 reports **2 of 24 zero-score shots**
(`0.32@0.6`, `0.4@0.8`) where the P2 round left 0 of 24. `0.32@0.6` still scores zero with the
whole structure layer disabled and the floor at 0, so it is pre-existing. `0.4@0.8` is a graze
over the tower's shoulder that used to cascade into an 11-block collapse purely through
accumulated jostling, and no longer does. Dropping the floor for already-cracked blocks was
tried as the fix and **rejected** — it did not rescue either shot and put BROKE straight back
to a median of 8 with 8/8 one-shot clears (the note is in `blocks.js` above `DAMAGE_FLOOR`).
The honest fix is for a graze to be worth something on the scoreboard, which is P12/P13's.

---

## P3 ROUND 6 — the projectile could not break anything, and nobody had measured it

### The bug
`art/materials.js` header claimed "a 0.7 kg arrow at 24 m/s lands ~17 N·s". Every
`breakImpulse` in the game was authored from that sentence. It is wrong (see design decision
3 above): Rapier's contact force reports what the **struck body absorbed**, which for a free
0.27 kg glass column is ~3 N·s no matter how hard you threw the dart. Measured ceiling on any
projectile hit: **9.5 N·s**, against thresholds of wood 9.5 and stone 17.0.

Consequences, all measured on the l1 8-shot gate *before* the change:

| | measured |
|---|---|
| stone fractures, 8-shot l1 gate | **0** |
| stone fractures, 24-shot direct-probe sweep | **0** |
| settled debris by material | glass **88 %**, wood 12 %, stone **0 %** |
| fractures whose killing blow came from the projectile | **0 of 34** |

That last row is the real defect. The impulses recorded at the moment of fracture were
`G0.4 G0.5 W1.8` — i.e. *everything* in the game was dying of accumulated jostling, which is
the exact inverse of the rubric's "fragmentation happens only where the projectile actually
hit". The stone-lump and wood-sliver shard vocabularies in `fragments.js` had never once been
on screen.

### The fix — three constants, and the reasoning that picks them
1. **`AMMO_PUNCH = 2.6`** in `blocks.js`, ramped 1.0 → 2.6 between 6 and 13 m/s. Fixes the
   delivery side, where the error is. Multiplies the solver's number rather than replacing it,
   so squareness / bracing / mass ratio still separate a good shot from a graze.
2. **stone `breakImpulse` 17.0 → 14.0.** 17 was itself a correction of 22 and both came from
   the false premise. 14 means a raw first-contact impulse of 5.4 N·s — the upper half of a
   square direct hit, the top ~15 % of what lands incidentally. Killing stone by jostling alone
   would still need 64 N·s against a leak of 11.9 N·s/s, so stone stays immune to the chain.
3. **`DAMAGE_FLOOR` 0.08 → 0.16**, and the projectile's exemption from it is now gated on the
   same `PUNCH_V0`. With the projectile finally carrying the fragmentation load, the chain does
   not need to, and 0.08 was letting glass die to 0.2 N·s taps. The gate also caught a spent
   dart emitting **thirty** 0.1–0.2 N·s contacts while lying against a beam, walking it to 0.96
   of threshold through the one hole in the floor.

### Result on the l1 gate (`_tools/scenarios/p3-r6-gate.mjs`, 8 shots, seed 4242)

| | r5 | r6 |
|---|---|---|
| fractures: wood / glass / stone | 5 / 32 / **0** | 8 / 28 / **1** |
| shots fracturing each material | W 5/8, G 8/8, S **0/8** | W 6/8, G 8/8, S **1/8** |
| settled debris by material | W 12 %, G 88 %, S **0 %** | W **20 %**, G 79 %, S **2 %** |
| fractures killed by the projectile | **0 of 34** | **15 of 34** |
| blocks destroyed by one shot | median 5/17 | median **4.5/17** |
| still standing at settle | median 12 | median **12.5** |
| cohesion at +300 ms (rubric ≥ 60 %) | 100 % | 100 % |
| MOVED at impact+800 ms | median 8.5 | median **12.5** |
| load-bearing frame reacted | median 5/6 | median 5/6 |
| shots that clear l1 outright | 5/8 | **8/8** ← see below |

Direct-hit break rate on the probe levels (13 shots each): **wood 13/13, glass 13/13,
stone 12/13** — was wood 3/13, glass 13/13, **stone 0/13**.

Regression gates all green: `determinism.mjs` PASS (6/6), `p3-r5-detshot` PASS (every row
`0==1:true 1==2:true` straddling first contact and first fracture), `p3-r5-rest` PASS (0 audits
on an untouched level), `p3-budget` bit-identical at 1.0 / 0.5 / 0.05, `p3-planez` peak |z|
1.264e-7, `p0-hook-audit` 24/24, `p3-perf` median 8.3 ms / p99 12.2 / max 17.4 / **0** frames
over 100 ms, zero console errors in every run.

### Known cost, measured and NOT hidden: one-shot clears went 5/8 → 8/8
This is not more destruction — `BROKE` went *down* (5 → 4.5) and `STANDING` went *up*
(12 → 12.5). It is more **movement**: `MOVED` went 8.5 → 12.5 because the block the player hits
now actually breaks, which fires `structure.onCollapse` and drops the frame on the two villains
instead of the dart bouncing off. Three of r5's eight gate shots previously scored 300–6500
with 16 of 17 blocks standing, which is the dead-zone failure the orchestrator's solvability
probe recorded; those three are the three that now clear.

Weakening the projectile to push this number back would be trading the thing the metric stands
for (separation, cohesion, whole-block debris — all of which improved) for the number itself.
**The honest fix is on l1's side: two villains, both inside the one tower, so any real collapse
kills both. That is P12's, and the star thresholds it interacts with are P13's** (already
recorded as miscalibrated — a 43,200-point one-shot clear awards 1 star of 3).

---

## PW ROUND 1 — WEIGHT & GRAVITY: THE MATERIALS WERE ONE OBJECT WITH THREE TEXTURES

**The report.** "Nobody owned *does everything have believable MASS*. Stone must fall, tip and land
like stone, wood like wood, glass like glass; momentum transfer through a stack must read as
physical; no floaty debris; villains must have believable mass too."

**Measured first, on a rig built for it** (`_tools/scenarios/pw-gate.mjs` + `levels/_pw-drop.json`,
three identical 0.90 m cubes at the same height and the same tilt, only the material differing):

| material | kg | land | hitV | rebound | bounces | slide | spin | rest | asleep |
|---|---|---|---|---|---|---|---|---|---|
| glass | 0.340 | 467 ms | 11.02 | 0.187 | 2 | 1.138 | 725 ms | 1250 ms | 1758 ms |
| wood | 0.527 | 467 ms | 11.02 | 0.187 | 2 | 1.104 | 750 ms | 1325 ms | 1842 ms |

**Two materials, identical to three significant figures in every column.** With the textures hidden
nobody could name either one. Three more numbers from the same run:

* `HEAVIEST OBJECT ON SCREEN: wood 1.60 kg` — a plank outweighed a stone cube (1.32 kg).
* a villain weighed **0.277 kg**, the same as the lightest glass column in l1 and less than every
  wood block in it.
* 70 % of live debris was still CRAWLING at 0.25–2.2 m/s a second and a half after the shot.

### The cause was three lines, not a physics problem
`density`, `restitution` and `friction` were the only per-material physics numbers, and the
restitutions were 0.10 / 0.04 / 0.03 — a spread of seven hundredths. **Damping was a pair of
literals at the call site**: `0.06 / 0.30` in `Block`'s `makeBody` call for every material in the
game, and `0.42 / 1.5` in `Debris`'s for every fragment.

### What changed
1. **`art/materials.js` presets carry the whole dynamics block** — `restitution`, `friction`,
   `linearDamping`, `angularDamping` and a `debris:{linearDamping, angularDamping, restitution}`
   sub-block — with each number argued in the file. Wood **bounces and tumbles** (the highest
   restitution and the lowest angular damping in the game); glass **does not bounce at all** and is
   the slipperiest thing on the board; stone is **dead** — no rebound, the most friction, and enough
   angular damping that rotation stops on the first contact.
2. **`makeBody()` reads damping off the material** (`linearDamping`/`angularDamping` now default to
   `null`, meaning "ask the material"). Pass a literal only when the damping is a BEHAVIOUR rather
   than a substance — `ammo/base.js` does, because the arc droop is P2 tuning, not a property of the
   dart's alloy.
3. **Friction combines with `Min`, restitution with `Average`.** Rapier defaults both to Average, and
   averaging friction against a 1.00 ground turned glass's authored 0.16 into 0.58 and stone's 1.35
   into 1.17 — a **2.0x** spread where the authored numbers say **8.4x**. Min is also the physical choice: the
   slipperier surface of a pair sets how the pair slides. The ground's own friction went 1.00 -> 1.35
   for the same reason — it was the CAP on how hard anything could grip it — and its restitution
   1.00/0.06 -> 0.02 so the floor stops contributing half of every bounce.
4. **stone density 1.55 -> 2.30 and breakImpulse 14.0 -> 20.5, together.** Contact impulse is what the
   struck body absorbed and scales with its mass (decision 3), so a 1.484x density change multiplies
   every impulse stone ever receives by the same factor; holding the threshold would have made stone
   1.5x easier to break while calling it heavier. Moving both keeps r6's measured spread (raw
   first-contact impulse to break: glass 1.0, wood 3.7, stone 5.4) and keeps the crush ratio under
   `chainScale` unchanged at 0.36–0.72 of threshold.
5. **villain density 0.42 -> 0.98** (a person is water-density), restitution 0.24 -> 0.08, and its
   `linearDamping` 0.22 dropped to the material's 0.030 — 0.22 was a brake on a body IN FLIGHT, so a
   launched villain shed a fifth of its speed every second and left the parabola every other object
   in the scene follows. The rolling-resistance brake still stops the trundle.
6. **`villains/base.js`'s damage thresholds moved from N·s to m/s of Delta-v** — see below.
7. **Debris damping is per material and its linear term is small.** 0.42 is not air drag on a 5 cm
   chip, it is a brake, and it is what "floaty debris" actually was.

### Delta-v, because an absolute impulse threshold hides a dependency on mass
`HIT_FLOOR` / `HIT_GAIN` / `BATTER_*` were N·s figures chosen against a 0.277 kg villain. Raising the
villain's mass by 2.34 multiplies every impulse it absorbs by roughly the same factor, so in N·s a
harmless rolling nudge (1.61) would have become 3.8 and sailed past a 1.55 floor: **a nudge would
have become nearly lethal for no reason a player could see.** The unit is now `impulse / mass`, which
is mass-invariant by construction and is what a viewer actually reads off the screen. Re-derived at
the new mass with `_tools/scenarios/pw-villain.mjs` (32 shots that touched the villain):

```
direct hit (approach >= 8 m/s), n=13 ... Delta-v  6.61 – 26.90   13 of 13 killed
graze / slow (approach <  8 m/s), n=19 ... Delta-v 0.00 –  3.73   19 of 19 survived
resting contact, all shots .............. Delta-v 0.00 –  0.55
```
The populations do not overlap; the floor (3.90) sits in the gap with margin on both sides.
**Re-run that scenario after any change to villain radius, density, collider or ammo mass.**

### Result on the same instruments

| | before | after |
|---|---|---|
| heaviest object in l1 | wood 1.60 kg | **stone 1.96 kg** |
| villain mass | 0.277 kg | **0.647 kg** |
| drop rig: rebound (COR), wood vs glass/stone | 0.187 / 0.187 (**1.00x**) | 0.213 / 0.016 (**13.3x**) |
| drop rig: bounces, wood vs glass | 2 / 2 | **1 / 0** |
| momentum transfer: heavy vs light hammer, same target | anvil could not move (**0.03x**) | column peak speed **13x**, spin **17x** — **WITHDRAWN, see PW ROUND 2: that number was a stone cube shattering on the column, not a momentum transfer. Nothing ever toppled in either arm.** |
| debris ballistic fidelity (median \|dvy\|/(g·dt) in free flight) | ~0.89 by construction at 0.42 damping | **0.998 – 1.004** |
| debris crawling at t=2500 ms | 5 % of 20 fragments | **2 % of 44** |
| debris crawling at t=4000 ms | 0 % | 0 % |
| wood fragment time-to-rest, median / worst | 1667 / 2842 ms | **1050 / 2500 ms** |
| wood fragment travel, median | — | 0.51 m (was 2.90 m at an intermediate tuning with no debris friction) |

**The float fix and the settle fix are a PAIR, and the first one alone made the second worse.**
Dropping debris `linearDamping` from 0.42 restored the parabola (0.89 -> 1.00) but removed the only
thing that was stopping wreckage: measured at that midpoint, wood fragments went from a 1667 ms
median time-to-rest to 2117 ms with one travelling 13.75 m. What stops rubble is friction, so a
fragment now carries a HIGHER friction than its parent block (wood 0.72 -> 1.10, glass 0.16 -> 0.55)
— a broken chip has ragged faces and a torn edge, where a standing pane has to stay slippery — plus
enough angular damping that it does not rock for two seconds. Material order survives it: glass
shards still travel about 2.4x as far as wood chips.

Regression gates after the change: `determinism` 6/6 PASS, `p3-r5-detshot` every row
`0==1:true 1==2:true`, `p3-r5-rest` PASS (0 audits on an untouched level, max drift 1.01e-3 — all of
it the idling ammo, unchanged), `p0-hook-audit`, `p3-budget`, `p3-planez` — see the round's log.

### GRAVITY_SCALE STAYS AT 2.4, AND THAT IS AN ARGUED DECISION, NOT AN OMISSION
Measured hang times on l1: `0.30@0.60` 675 ms, `0.30@0.90` 475 ms, `0.55@1.00` 1100 ms,
`0.75@1.00` 1350 ms. The flat shots are short. But range goes as `v²/g` with `maxSpeed` fixed at
14.4 by P2, so **any gravity change is a range change**: -20 % of gravity puts a full draw 25 %
further downrange, which is past the end of l1 and straight back into the dead zone P2 spent a round
removing. Gravity cannot be moved without either P2's `maxSpeed` or l1's geometry moving with it.

**The real reason the flat shots feel short is not gravity — it is measured, and it is P1's.**
`release()` reports `muzzleDist 9.98` and `exitSpeed 54.6` against a cruise of 14.0: the hard release
cut teleports the ammo **9.98 m downrange (8.05 AD) at t=0** and hands it 40 m/s of kick on top. The
pouch is at x -2.46 and the projectile's first simulated position is x 9.23 — with the tower at
x 14–20, **the player never sees the first two thirds of the trajectory**, which is where the arc's
weight would be read. P1's rubric criterion is ">= 8 AD clear at t=50 ms"; the cut currently delivers
8.05 AD at **t=0**, before a single solver step. There is room inside that criterion to buy the arc
back, but it is P1's constant to move, not PW's.

---

## PW ROUND 2 — MASS AND FRAGILITY WERE INVERTED, AND IT WAS A UNIT BUG

**The report.** "An identical 0.90 m cube survives a 1.12 m fall as STONE but more than 12 m as
GLASS or WOOD. `chainScale` multiplies a landing by the STRUCK block's own crush factor on top of a
contact impulse that already scales with its mass. Heavy things are currently the most fragile,
which is backwards and reads instantly as wrong."

**Confirmed independently and it is worse than reported** (`_tools/scenarios/pw-r2-meas.mjs`, one
lone cube in an empty world, lifted to an exact height with zero velocity and zero damage):

| 0.90 m cube | kg | break height, before |
|---|---|---|
| stone | 1.956 | **1.6 m** (0.98 of threshold from 1.12 m) |
| wood | 0.527 | never — 0.51 of threshold at 13 m |
| glass | 0.340 | never — 0.996 of threshold at 13 m |

### The cause is a UNIT, not a number
Design decision 3 says the solver's contact impulse is *what the struck body absorbed*, bounded by
its own mass. Every chain threshold in the game was then written in absolute N·s. So
`damage / threshold` silently read `mass / breakImpulse`, and `CRUSH_LO/HI = 3.5 / 12.0 N·s` asked
"how heavy am I" while claiming to ask "how hard was I hit". A 1.96 kg stone cube reached the top of
that ramp from a 1.1 m fall; a 0.34 kg glass cube never reached it at all.

**No threshold fixes this**, and that is why the round is a model change rather than a tuning pass:
any stone threshold high enough to survive its own landing also makes stone immune to the player.

### What shipped — Δv is the severity, and it is mass-invariant by construction
`level/blocks.js` `Block.onImpact`, for every source EXCEPT a live projectile:

```
dv      = rawImpulse / this.mass                    // m/s — what the blow did to me
impulse = breakImpulse * (dv / breakDv) * chainScale(tag, dv, dmg)
```

Algebraically this is the old `raw * scale` multiplied by `thr / (mass * breakDv)`, which is exactly
1.0 for a block whose own `thr/mass` equals its material's `breakDv` — **the size dependence, and
only the size dependence, is gone.** Everything downstream (`DAMAGE_FLOOR`, the leak, the scar,
`damage >= thr`) keeps the same currency and the same shape.

**The projectile deliberately keeps the raw, mass-proportional number.** `AMMO_PUNCH` exists
(decision 7) because the solver's impulse encodes how square the hit was, how braced the target was
and how much mass was behind it — P3 round 6 bought the game's whole fragmentation vocabulary with
that shape, and this round does not spend it. A shot is a point load aimed by a player; a collapse
is a mass falling on a mass.

### TWO new numbers in the materials contract (`art/materials.js` `damage`)
| key | meaning |
|---|---|
| `breakDv` | **bulk toughness** — the Δv (m/s) that consumes this material's whole threshold at source scale 1.0. glass 8.5, wood 11.0, stone 26.0, prop 8.0. The first two sit just above the median `thr/mass` of that material's own l1 blocks, so l1's chain behaviour is preserved; stone's is 2.5x its own, because stone is the tough one. |
| `land` | **the ceiling of the crush ramp for a STATIC source (ground/soil)**, where `crush` is the ceiling for anything dynamic. glass 1.05, wood 0.50, stone 0.42. |

`land` has to be a second number and not a reuse of `crush` or `breakDv`: "how well do I survive
being dropped" and "how well do I survive the collapse shoving me" are independent behaviours.
Measured with a single global ground ceiling and nothing else, the ladder came out glass 1.6 m /
wood 2.2 m / stone never — the inversion gone, but wood only 1.4x tougher than glass. Separating
them through `breakDv` instead would have made wood 2.4x tougher in the CHAIN as well, which is
P3's ground.

**THE GROUND IS NOT A STOREY** is the physical statement underneath it: `crush` is brittleness under
a *concentrated* load (a beam corner arriving on one face). The lawn is a flat compliant half-space
meeting the whole face. Without that split, a Δv high enough to crush stone under a beam is also
reached by a 1.3 m fall, and the inversion comes straight back in a new coordinate system.

The crush band is the same events restated: `CRUSH_LO/HI 3.5 / 12.0 N·s` were 1.79 / 6.13 m/s on the
stone cube they were authored against, so `CRUSH_DV_LO/HI = 1.8 / 6.1` holds stone's measured crush
behaviour to two decimals. Stone's `crush` 1.35 -> 4.40 is the same blow re-expressed and then
sharpened: a full-severity storey landing was worth 0.81 of stone's threshold in P3 r6b and is now
worth 1.07, i.e. it kills in one. Stone is the material that is nearly impossible to hurt and then
goes all at once.

### Result — the fall ladder is now monotone in mass
| 0.90 m cube | kg | before | after |
|---|---|---|---|
| glass | 0.340 | never (13 m) | **1.6 m** |
| wood | 0.527 | never (13 m) | **7.5 m** |
| stone | 1.956 | **1.6 m** | never — 0.41 of threshold at 13 m, and literally **0.00 damage** from anything under 2.2 m |

### P3's counterweights, A/B on the same tree, back to back (`p3-r6-gate.mjs`, 8 shots, seed 4242)
| | before | after |
|---|---|---|
| fractures W / G / S | 19 / 25 / 5 | 19 / 24 / 4 |
| shots fracturing each | W 8/8 G 8/8 **S 3/8** | W 8/8 G 8/8 **S 4/8** |
| settled debris W / G / S | 36 % / 58 % / 7 % | 38 % / 57 % / 6 % |
| BROKE median | 5.5 / 17 | 6 / 17 |
| STANDING median | 11.5 | 11 |
| COHESION @300 ms | 100 % | 100 % |
| MOVED / FRAME | 11 · 5/6 | 11.5 · 5/6 |
| ONE-SHOT WINS | 8/8 | 8/8 |

At the exact `thr/mass` medians the same gate read BROKE 7 / STANDING 10 — the round was buying its
material read with P3's separation. `breakDv` 8.5 / 11.0 (rather than 7.6 / 9.8) is what puts it
back inside the noise. **That half-point is load-bearing; do not round it off.**

### CORRECTION TO PW ROUND 1's RECORD: the 13x "momentum transfer" number was a FRACTURE
Round 1 recorded "momentum transfer: heavy vs light hammer, same target — column peak speed 13x,
spin 17x, and only the stone hammer topples it" from `pw-gate.mjs` section 3 (`_pw-mass`). It is not
a momentum measurement. Measured back to back on the same tree, the stone hammer's own landing speed
reads **10.23 m/s in the old arm and 5.09 in the new one** — and 5.09 is what that rig's 0.55 m drop
actually produces. The old number was a stone cube *shattering on a wood column* and then falling all
the way to the ground: the very inversion this round removes. `_pw-mass` never measured momentum,
because a vertical blow on top of a column standing on the ground is braced BY the ground — the glass
and wood hammers moved their columns 0.37 and 0.88 m/s in BOTH arms, and nothing ever toppled.

The replacement is `_tools/scenarios/pw-r2-drive.mjs`: a horizontal billiard shot, both bodies
airborne at contact, same 6 m/s every time, same wood target, only the hammer's material differing.

| hammer | kg | mass ratio | target peak speed | hammer speed kept | target travel |
|---|---|---|---|---|---|
| glass | 0.340 | 0.65 | 2.98 m/s | **23 %** (and it shatters) | 0.89 m |
| wood | 0.527 | 1.00 | 4.49 m/s | 25 % | 1.08 m |
| stone | 1.956 | 3.71 | 5.95 m/s | **73 %** | 1.72 m |

Read both columns together. DRIVE is bounded by conservation — a hammer can hand a free target at
most `v(1+e)`, so 5.75x of mass can never buy 5.75x of target speed and 2.0x is near the ceiling.
What puts mass on the screen is CARRY: the stone hammer walks through the hit at 73 % of its speed
and keeps going; the glass one is stopped dead and breaks. Sliding the hammers along the lawn
instead of launching them airborne puts the whole measurement inside the friction model (stone's
1.35 against the ground's 1.35 is 31.8 m/s² of deceleration) and reports the HEAVY hammer as the
feeble one — do not "fix" the rig back that way.

### Regression gates, all green after the change
`determinism.mjs` 6/6 PASS · `p3-r5-detshot` every row `0==1:true 1==2:true` straddling first
contact and first fracture · `p3-r5-rest` PASS (the audit is unreachable from a settled world) ·
`p3-budget` bit-identical at 1.0 / 0.5 / 0.05 · `p3-planez` peak |z| 2.507e-7 · `p0-hook-audit`
24/24 · `p3-r6-late` PASS (every fracture happened while the world was moving — the thing a damage
model change is most likely to break) · `p3-perf` median 8.3 ms / p99 12.4 / max 28.5 / **0** frames
over 100 ms · zero console errors in every run.

Debris float, aggregated over four l1 shots (`pw-r2-float.mjs`, because one shot is not a
population): ballistic fidelity 0.997 (was 0.996 — nothing is being braked in mid-air), time to rest
median 1417 ms (1242), worst 3925 ms (**4625**), still moving at t=4000 ms **1 %** (3 %). The
collapse runs longer in the middle (37 % still moving at 2500 ms against 15 %) and finishes cleaner.

---

## PW ROUND 3 — THE COLLAPSE WAS AUTHORED, NOT TRANSMITTED

**The report.** "On a fixed 23-body cohort (bodies by identity, births/deaths excluded,
gravity's own potential-energy release subtracted) l1 GAINS 97.1 / 102.8 / 142.8 J of
mechanical energy in the 2 s after impact on the three shots that fracture anything — against
a dart carrying only 56.9–60.4 J — in discrete jolts of up to **+37.6 J in ONE 8.3 ms solver
step** at impact+58 ms. Noise floor 0.54 J over 240 idle steps, 0.00 J with the dart in
flight, and every positive jolt above 4 J lands exactly on a `structure.js` hop/tip/joint
event. The rack mechanism that won the propagation round is shoving the tower over."

Confirmed. `structure.js` is the only place in the game that writes velocity into a body
without a contact behind it, and it was doing so unconditionally and without a budget.

### The two rules that shipped, and the algebra that picks them
**1. VELOCITY MATCHING, NOT VELOCITY ADDITION.** Every mechanism now states a TARGET velocity
(or angular velocity) and delivers only the deficit. Applying `dv` to a body already moving at
`v` along the same axis costs `m·(v·dv) + ½m|dv|²`, so on a body already doing 5 m/s the cross
term is **three times** the honest part — 39 J instead of 10.4 J for exactly the same 3.6 m/s
of extra motion. The layer was therefore at its most expensive precisely where it was least
visible: shoving wreckage that was already flying. A shock front cannot accelerate a member
that has already outrun it; physically it simply arrives late. A member at rest — which is
every member the propagation actually needs — gets exactly the impulse it always got.

**2. NOTHING IS WRITTEN THAT THE BLOW DID NOT PAY FOR.** `Structure.spend()` prices every
write at its EXACT change in kinetic energy,
`dKE = J·v + |J|²/2m + τω + τ²/2I` (τ = τ_z + (r × J)_z), and debits a joule pool. When the
pool cannot pay in full, that quadratic is solved for the largest fraction it CAN pay and the
write is SCALED rather than dropped, so the collapse degrades smoothly and stays a pure
function of body state and the ledger (i.e. deterministic).

**The pool's only depositor is the player's shot.** `Block.onImpact` computes the contact
energy of a blow as `½·J·v` from the RAW solver impulse, before any severity scaling, and
credits it — inside the `flying` branch only. Block-on-block contacts credit nothing, whoever
set them moving, so "spend joules → break a member → be handed a budget for having broken it"
is unreachable by construction rather than narrowed by a freshness window. Crediting at the
CONTACT rather than at the FRACTURE also fixes the case a fracture-only ledger cannot see: on
l1 0.32@0.94 a genuine 18 N·s hit fractures nothing, and under a fracture-only ledger it
credited 0, every write was refused, and the frame sat at its authored pose 800 ms later.

### The one thing that is NOT obvious, and it cost a full measurement cycle
**A repeated velocity match is a SERVO, not a ramp.** Spreading a write over N steps by
re-stating the same target each step tops the member back up to it after the contacts have
taken their share — the layer becomes a motor. Measured: created energy went 12.2 → **30.8 J**
on l1 0.30@0.90, worse than the single write it replaced. `nudge()` therefore takes `dvCap` /
`domCap`, and a ramp step may close at most 1/n of the deficit, so total delivery over the
whole ramp is bounded by the one write it stands in for.

### And two writes are now spread in time, because a wall does not teleport
* `RACK_STEPS` / `TIP_STEPS` — a bay's rigid velocity field and a de-braced column's spin are
  delivered as capped-increment ramps over 8 / 6 solver steps (67 / 50 ms), which is what a
  constant torque produces and what a real rack does.
* `WRITES_PER_STEP` — at most two queued joint/shudder writes execute per solver step; the
  surplus keeps its queue order and lands on the next one. Independent effects coinciding on
  one step was the rest of the jolt.

**Both are bounded on both sides and the ceiling is STONE.** Longer ramps are better on every
energy number (12/10 steps at one write per step: worst step median 4.27 → 1.90 J, created
median 15.96 → 10.41 J, MOVED median 10) and are still WRONG: stone fractures go **5 → 0** and
shots fracturing stone **4/8 → 0/8**, because stone dies to a storey landing on it (P3 r6b's
crush ramp is a severity read on the arrival) and spreading the arrival takes the arrival
away. See the note above `RACK_STEPS`.

### Result — the same audit, re-run (`_tools/scenarios/crit-PW-r3-attrib.mjs`)
| l1 shot | dart KE | created, before | created, after | worst single step, after |
|---|---|---|---|---|
| 0.30@0.90 | 56.9 J | +97.1 J | **+22.95 J** | 6.31 J |
| 0.26@0.95 | 60.4 J | +102.8 J | **+24.74 J** | 5.86 J |
| 0.24@0.92 | 58.3 J | +142.8 J | **+15.96 J** | 4.27 J |
| 0.34@0.92 | 58.3 J | — | **+13.96 J** | 2.14 J |

Every step's jump is now attributable: the largest in every shot is the first joint + tip +
hop after the fracture, i.e. the frame's first reaction to the player's own blow, and it is
paid for out of 38–89 J of real credited contact energy. The `structure.enabled = false` arm
of the same shots gives the solver's own floor for a live collapse (penetration recovery and
restitution): 0.80–3.11 J created, worst step 0.26–2.13 J.

### Propagation, which is what the round had to protect (`p3-r6-gate.mjs`, 8 shots, seed 4242)
| | before this round | after |
|---|---|---|
| MOVED at contact+800 ms | median 8 | median **8.5** |
| load-bearing frame reacted | median 5/6, two shots below 5 | median **5/6**, one shot below |
| COHESION @300 ms | 100 % | 100 % |
| BROKE | median 5.5/17 | median **6/17** |
| STANDING at settle | median 11.5 | median **11** |
| ONE-SHOT clears | 6/8 | **7/8** |
| fractures W / G / S | 15 / 17 / 5 | **17 / 22 / 5** |
| shots fracturing each | W 6/8 G 6/8 S 5/8 | W 7/8 G 8/8 **S 4/8** |
| settled debris W / G / S | 38 / 53 / 9 % | 37 / 56 / **7** % |

**Known cost, measured and not hidden:** stone is fractured on 4 of 8 gate shots where it was
5 of 8, and the settled stone share is 7 % where it was 9 %. Total stone fractures are
unchanged at 5. It is the same sensitivity the ramp ceiling above is written on — stone is the
one material whose failure mode depends on how *suddenly* a storey arrives.

Regression gates, all green after the change: `determinism.mjs` 6/6 PASS · `p3-r5-detshot`
every row `0==1:true 1==2:true` straddling first contact and first fracture · `p3-r5-rest`
PASS (0 audits, 0 racks, 0 tips on an untouched level; the audit is unreachable from a settled
world) · `p3-r6-late` PASS (0 fractures in a ≥90 %-asleep world, idle windows clean) ·
`p3-budget` bit-identical at 1.0 / 0.5 / 0.05 · `p3-planez` peak |z| 4.218e-7 ·
`p0-hook-audit` 24/24 honest · `p3-perf` median 8.4 ms / p99 10.8 / max 25.9 / **0** frames
over 100 ms · `final.mjs` l1 won, zero console errors or warnings.
