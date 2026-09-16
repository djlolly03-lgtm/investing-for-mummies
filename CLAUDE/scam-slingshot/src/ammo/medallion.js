/**
 * ammo/medallion.js — THE IFM CANNONBALL.  The one thing the player flings.
 *
 * Owner's brief: "you're slingin' the IFM cannonball and it's hitting the scams."
 *
 * ── WHY A MEDALLION AND NOT A SPRITE OR A SPHERE ─────────────────────────────
 * A flat billboarded logo is a sticker: it has no thickness, it cannot catch light, and it
 * turns into a line the instant anything rotates it. A sphere with a decal is worse — the
 * logo smears around the curvature and is unreadable at the size this thing actually is on a
 * phone. A struck medallion is the one form that is BOTH a real 3-D object and a flat
 * readable mark: two struck faces, a raised rim, and a profile that reads as a disc from
 * every angle. It also happens to be what "value being flung" looks like.
 *
 * ── WHAT THE READABILITY CLAIM IS, AND WHAT IT IS NOT ────────────────────────
 * An earlier draft of this file asserted the arrow was "not a projectile you can track". That
 * was never measured and it is not true. `_tools/ball-contrast.py` compares both builds at
 * 390x844 against each frame's LOCAL background, and on raw lightness offset the arrow WINS:
 * mean dL -34.5 against the medallion's -12.5, because a dark dart on a pale sky is the
 * strongest small-object contrast there is and a pale coin on a pale sky is not. That number
 * is in the report and it is not being buried.
 *
 * What the medallion actually buys, measured the same way:
 *   - the strongest edge in the frame is a WASH — mean 69.7 vs the arrow's 70.8. It is at
 *     least as detectable; it is not more detectable, and the mean-dL story is why.
 *   - peak L* 86.7 vs 73.3. The arrow's brightest pixel was DARKER than the sky behind it, so
 *     it could only ever read as a hole. This reads as an object.
 *   - the silhouette no longer collapses with the aim angle. The arrow's AD swung 0.83 -> 1.37
 *     purely with the draw (a rotated dart is a taller box); a disc's does not.
 *   - the arrow's measured advantage was substantially its own BUG. Its ink shell tore into
 *     detached black blobs the same way this one did before it was fixed (compare
 *     `_shots/BALL/r0-baseline` crops with `_shots/BALL/r1`), and that smear is a large part
 *     of what was dragging its mean lightness down. It was winning the metric with an artifact.
 *   - it is the IFM mark, which is the brief.
 *
 * So: a readability fix in silhouette stability, in brightness, and in being a clean object
 * rather than a smudge — and a deliberate trade of lightness contrast against the sky, paid
 * for as far as it could be by deepening the rim (see RIM_NAVY, which replaced r1's gold one)
 * and by the ink ring.
 *
 * ── WHAT IS DELIBERATELY UNCHANGED ───────────────────────────────────────────
 * EVERYTHING PHYSICAL ABOUT THE RESKIN ITSELF. Same `matName: 'ammo'` (so restitution,
 * friction and density are the same preset), same damping, same CCD, same launch kick, same
 * ability. The reskin replaced `buildMesh()` and added a purely visual spin, and nothing else.
 *
 * The collider radius is NO LONGER the arrow's 0.40: it is `COLLIDER_R` = 0.52 since 11 Sep
 * 2026, because the owner reported the ball was too small to follow on a phone and size is the
 * one thing a reskin could not fake. That is a deliberate, measured physics change — 2.20x the
 * mass — and it is documented at `COLLIDER_R` with what it cost. Everything else above still
 * holds. P1's ">=8 AD clear at t=50 ms" and P2's power curve are still protected ground, and
 * both were re-measured against the new radius rather than assumed.
 *
 * The one number that a mesh swap CAN move is AD, because `Slingshot.ammoDiameter()` is the
 * loaded mesh's bounding-box HEIGHT and every P1 distance threshold is written in it. **A first
 * cut of this medallion at R=0.58 FAILED P1's protected "every draw >=0.8 power clears 8 AD by
 * t=50 ms"** — 7.07 AD at a=0.60/p=0.80, measured, against the arrow's ~8.7. The mechanism is
 * worth writing down because it is not obvious and it will bite the next person who reskins
 * the ammo:
 *
 *   `ammoDiameter()` is `Box3.setFromObject()`, which unions each child's GEOMETRY BOUNDING
 *   BOX transformed by its world matrix — the box, not the vertices. A cylinder's bounding box
 *   is a SQUARE in the disc plane, and the sling rotates the ammo mesh to the aim angle, so the
 *   measured height is that square's rotated AABB: up to sqrt(2) x the disc's real diameter,
 *   worst at 45 deg. The disc's true on-screen height is constant, but AD is not, and AD is
 *   what the rubric is written in. A dart's box was already tight to a slim shape, so this
 *   never showed up before.
 *
 * The fix is to SIZE THE MEDALLION TO THE BUDGET rather than to loosen the measurement — an
 * exclusion in a measurement spec is where defects hide. The binding shot is a=0.60/p=0.80.
 * When this was written it was 11.265 world units clear of the pouch at t=50 ms, so 8 AD was an
 * AD ceiling of 1.408, and R was picked to land the ink-inclusive extent at ~1.04 — ~8.7 AD,
 * the arrow's own margin.
 *
 * That budget MOVED on 11 Sep 2026: the launch cut was re-split for a faster shot, which took
 * the same shot to ~13.7 world units and the ceiling to ~1.71. R is unchanged; the extra
 * headroom was spent on `COLLIDER_R` instead, which scales R along with everything else. The
 * mechanism above is the reason that spend had a hard limit at 1.30x rather than the 1.50x
 * asked for. Every number in both paragraphs is re-measured by
 * `_tools/scenarios/p1-r2b-snap.mjs`; if you change R or `COLLIDER_R`, run it.
 *
 * ── DRAW CALLS ───────────────────────────────────────────────────────────────
 * FOUR meshes per medallion, measured: one cylinder body (three material groups, one draw),
 * two face plates, one ink shell whose groups are collapsed to one. All four geometries and
 * all four materials are shared across every medallion in the level, so the split's three
 * projectiles cost twelve draws, not twelve of everything.
 *
 * The arrow's own count is NOT stated here, because the arrow no longer exists to measure and
 * a comparison nobody can re-run is worth less than no comparison. What is on the record is
 * the whole-scene number with this ammo loaded: 393 draw calls at 21 bodies, 252 at 29
 * (`_shots/BALL/g-smoke`, `g-final`), against P15's flagged 365 on the Wave 0 slice.
 */

import * as THREE from 'three';
import { Ammo } from './base.js';
import { world } from '../world.js';
import { PALETTE } from '../art/materials.js';
import { RAMP_STD, RAMP_HARD, ink, INK } from '../art/toon.js';

// ---------------------------------------------------------------------------
// PROPORTIONS.  All in world units (1 unit = 1 metre).
// ---------------------------------------------------------------------------
/**
 * Medallion radius, in world units, AT 1.00x — `COLLIDER_R` below is what scales it in play.
 *
 * Set by the AD budget in the header, not by taste: the ink-inclusive extent has to come in at
 * ~1.04 so a=0.60/p=0.80 clears 8 AD at t=50 ms with the arrow's own margin. 0.47 + the 0.050
 * ink shell either side = 1.040. It is still 0.442, and it is NOT the knob for "make the ball
 * bigger" — `COLLIDER_R` is, because it carries the collider with it and this does not. Changing
 * either one means re-running p1-r2b-snap.mjs, not eyeballing a filmstrip.
 *
 * The disc is SMALLER than the arrow's 1.268 span and it still reads far better, because size
 * was never what was wrong: the arrow was mid-teal (PALETTE.ammo 0x2a9d8f) on a teal sky, and
 * a dart only fills about a third of its own bounding box. This fills ~78 % of its box with
 * the brightest value in the palette, ringed in navy over a struck gold hairline and outlined
 * in ink. Value contrast and a closed silhouette, not pixels.
 */
const R = 0.442;
/**
 * THE COLLIDER RADIUS — and the one knob that makes the whole medallion bigger.
 *
 * 0.40 -> 0.50 on 11 Sep 2026, i.e. the medallion is drawn and collides 1.25x larger. The owner,
 * playing on a phone: "the cannon ball is too small."
 *
 * Measured at 390x660 — the real usable area on an iPhone once Safari's chrome is gone — with
 * `_tools/scenarios/tune-ballpx.mjs`, which projects the ink-inclusive extent through the LIVE
 * camera at the ball's own depth and prints the medallion's own `faceCssPx` next to it so the
 * two can disagree out loud. CSS px across, ink included (struck disc alone in brackets):
 *
 *                          before                  after
 *      on the sling   l1   17.1-18.4 (12.0)       21.3-23.0 (15.0)
 *                     l2   18.2-19.6 (12.7)       22.7-24.5 (15.9)
 *                     l3   24.5-26.4 (17.9)       30.7-33.0 (22.3)
 *      in flight      l1   13.3-15.6 ( 9.7)       17.0-19.4 (12.5)
 *                     l2   13.6-15.7 ( 9.9)       17.4-19.9 (12.8)
 *                     l3   23.7-25.6 (17.5)       29.3-31.6 (21.5)
 *
 * l1 and l2 are the honest worst case and the reason this was raised at all: their cameras have
 * to frame a 22-unit tower, so the ball IN FLIGHT — the moment it is being followed — was ten
 * CSS pixels of struck disc. Note it is SMALLER in flight than on the sling on those two levels,
 * which is the opposite of the intuition and is the camera pulling back to keep the tower in
 * frame. Sizing this off a resting frame would have under-fixed it.
 *
 * ── WHY THE COLLIDER IS THE KNOB AND NOT A VISUAL SCALE ──────────────────────
 * `buildMesh()` scales everything visual by `this.radius / MESH_AUTHORED_AT_R`, so this one
 * number moves the disc, the rim, both struck faces, the ink shell AND the collider together,
 * and the drawn-to-collided ratio is invariant by construction.
 *
 * The alternative — draw it bigger, leave the collider at 0.40 — would have been free of every
 * physics consequence below, and it was rejected. At 1.25x the drawn radius is 0.575 against a
 * 0.40 collider, so the disc's bottom edge would sit 0.175 world units BELOW its own contact
 * point: the medallion comes to rest face-up on the grass (see `_upright`) and would rest
 * visibly sunk into it, and it would overlap a block by ~2.5 CSS px before reacting. The ammo
 * does already draw wider than it collides — 0.575 against 0.50, which is the arrow's own ratio
 * — and widening that gap to dodge a measurement is the move this file talks the next person out
 * of two paragraphs above. It is not taken here either.
 *
 * ── WHAT IT COSTS, MEASURED, NOT ASSUMED ─────────────────────────────────────
 * The collider is a ball and its density comes from the 'ammo' material preset, so mass goes as
 * the cube of this number: **0.617 kg -> 1.204 kg, 1.95x** (`tune-ballmass.mjs`, read off
 * `body.mass()`). Together with `maxSpeed` 14.4 -> 24.0 in the same wave, that is ~5.4x the
 * kinetic energy arriving at a structure, and the scores moved with it — l1's one-shot wins went
 * 4/24 to 13/27 across the standard sweep grid. That is reported rather than absorbed, and it is
 * why `levels/stars.json` has to be re-derived by its own machine (`p13-sweep.mjs` with APPLY=1)
 * and must never be hand-nudged to match.
 *
 * ── WHY 1.25x AND NOT THE 1.50x THAT WAS WANTED ──────────────────────────────
 * P1's protected ">= 8 AD clear at t=50 ms" is the ceiling, and it TIGHTENS as the ball grows,
 * because AD is the ammo's own bounding height: the same clearance in world units buys fewer
 * ammo-diameters of it. The binding shot is a=0.60/p=0.80, measured 13.69 world units clear with
 * the current launch cut, so the AD ceiling is 13.69/8 = 1.711 against AD 1.2912 at 1.00x. All
 * three of these were run, not extrapolated, on `p1-r2b-snap.mjs`:
 *
 *      1.25x -> AD 1.614 -> 8.48 AD    shipped. The arrow's own margin was 8.7.
 *      1.30x -> AD 1.679 -> 8.15 AD    passes, but 1.9% of margin on a protected gate
 *      1.40x -> AD 1.808 -> ~7.6 AD    fails
 *
 * 1.30x was measured and then given back: 4% of diameter is invisible and 6% of gate margin is
 * not. Lengthening the launch cut to pay for more is also unavailable — that is exactly what
 * birthed the ammo inside l2's near wall (see `muzzleBase` in slingshot.js). If this number moves
 * again, `p1-r2b-snap.mjs` is not optional.
 */
const COLLIDER_R = 0.50;
/**
 * The split's children as a FRACTION of the parent, rather than the absolute 0.27 the arrow
 * carried. 0.675 is that same ratio (0.27 / 0.40), written so it survives a change to
 * `COLLIDER_R` instead of silently becoming a different game: at 0.52 the children are 0.351,
 * and three coins still read as three instalments of one thing rather than three pebbles.
 */
const SPLIT_K = 0.675;
/**
 * The collider radius the mesh constants above (`R`, `T`, `INK_W`, `FACE_R`, every glyph
 * fraction) were authored against — the SIP arrow's 0.40. It is the denominator of the visual
 * scale in `buildMesh()`, which is how raising `COLLIDER_R` makes the drawn medallion bigger
 * rather than just the invisible ball around it.
 *
 * It is a fixed historical constant and must NOT be kept in step with `COLLIDER_R`: setting the
 * two equal pins the scale at 1.00 and silently reduces the size knob to a physics-only change.
 * Change it only if the mesh constants themselves are re-authored at a different radius.
 */
const MESH_AUTHORED_AT_R = 0.40;
/**
 * Ink half-width, and the reason the disc above lost 0.05 to pay for it.
 *
 * The ink shell is REAL GEOMETRY here (see buildMesh), not a normal-expanded hull, which means
 * it is finally inside `Box3.setFromObject` and therefore inside AD. It was not before: the
 * stock ink pushes vertices in the VERTEX SHADER, so the outline the player sees was invisible
 * to every measurement in the game and AD understated the ammo's real on-screen size by the
 * width of its own outline. Fixing the shell fixes that silently too — which is why R came
 * down by exactly this much. 2R + 2*INK_W is the extent the AD budget is written against, and
 * it is now the extent you can actually see.
 *
 * ── ROUND 2: THE OUTLINE WAS EATING AN EIGHTH OF THE OBJECT ──────────────────
 * `R + INK_W` is the ONLY quantity the AD budget can see — the shell is the outermost
 * geometry, so `Box3.setFromObject` unions its radius and nothing else's. Measured at 390x844
 * the ink was spending **0.59 CSS px per side of a 9.88 CSS px disc**: 1.18 px of an 11.06 px
 * object, on a line whose whole job is to close a silhouette that a NAVY rim now closes by
 * itself (see RIM_NAVY). So the split moved and the sum did not:
 *
 *     r1:  R 0.420 + INK_W 0.050  = 0.470
 *     r2:  R 0.442 + INK_W 0.028  = 0.470     <- identical outer extent
 *
 * The disc gains 5.2 % of its width, the outline drops to ~0.33 CSS px per side, and **AD
 * cannot have moved, by construction** — which is the point of doing it this way rather than
 * re-picking R freehand and hoping P1's ">=8 AD clear at t=50 ms" still passes. It is still
 * re-run (`p1-r2b-snap.mjs`), because "cannot have moved" is a claim until it is a number.
 *
 * If you ever change this pair, CHANGE THEM TOGETHER OR RE-RUN THAT GATE. Nothing else in this
 * file can touch protected ground.
 */
const INK_W = 0.028;
/**
 * Half-thickness would be 0.20 — a 2.35:1 diameter:thickness, a struck challenge coin rather
 * than a wafer.
 *
 * THICKNESS IS FREE, which is the useful fact here. AD is measured in the pouch, where the
 * tumble is parked at phase 0 and the mesh is only ever rotated about Z, so the disc's z-extent
 * never enters the bounding-box height. T is therefore the one dimension that can be spent
 * purely on the brief's "make sure it never disappears mid-spin": the edge-on frame is a
 * (T + 2*INK_W)-wide bar, and that is what decides whether the thinnest pose is a sliver or an
 * object. Deliberately over-thick for a medal — so the silhouette never drops below about half
 * its widest — because the edge-on frame, not the face, is the one that has to survive 390 px.
 * Pushed further it stops reading as a medal and starts reading as a roll of tape; 2.5:1 is
 * where that line was drawn, by looking at ball-ink.mjs's phase lens.
 *
 * ROUND 2 RAISED IT BY 0.02 to keep the edge-on bar the width it already was. Halving INK_W
 * took 0.044 off `T + 2*INK_W`, and that sum — not T — is what the thinnest pose is actually
 * made of. 0.36 + 0.056 = 0.416 against r1's 0.34 + 0.100 = 0.440: 5 % narrower rather than
 * 10 %, and the part that was lost is the part that was black. Diameter:thickness is 2.46:1,
 * which is still the right side of the roll-of-tape line.
 */
const T = 0.36;
/**
 * The struck field, as a fraction of the disc.
 *
 * ROUND 2 MOVED THE DARK RING OFF THE GEOMETRY AND INTO THE TEXTURE, and this number is the
 * consequence. In r1 the cap annulus (`R - FACE_R`, 14 % of the radius) was the mid-khaki band
 * you saw around the cream face, and it was the single biggest thing between the mark and the
 * player: it is metal, so it is lit, so its value swims with the tumble, and it cost 0.7 CSS px
 * of an object that only has 5 to spend. The face plate now runs almost to the rim and the ring
 * around the mark is PAINTED (see FACE_BAND), where its width is exact, its value is fixed, and
 * it mips predictably. What is left of the cap is a 0.02-world lip that stops the plate's edge
 * reading as a decal.
 */
const FACE_R = R * 0.955;
/** Face plates float just off the cap to avoid z-fighting with it. */
const FACE_Z = T / 2 + 0.006;

// ---------------------------------------------------------------------------
// SPIN.  Visual only — the collider is a ball, so mesh rotation cannot touch physics.
// ---------------------------------------------------------------------------
/**
 * Spin rate per m/s of travel, and the clamps around it.
 *
 * The clamps are not decoration. The launch kick hands the ammo ~53 m/s for the first ten
 * solver steps (`SLING.kickTicks`), and a rate taken straight off that would spin the
 * medallion ~1.4 rad per rendered frame — past the aliasing point for a two-fold-symmetric
 * object, so it would read as a stuttering flicker in exactly the frames the eye uses to
 * decide whether the thing was fired or dropped. SPIN_MAX caps it at 17 rad/s (~0.28 rad per
 * frame at 60 fps), and SPIN_MIN keeps a lobbed shot from looking dead.
 *
 * At the l1 winning shot (cruise 13.6 m/s) this is 15.6 rad/s — about 1.1 revolutions across
 * the ~0.45 s flight, so the player sees face -> rim -> back -> rim -> face. One full tumble
 * per shot: enough to read as thrown value, not so much that the mark is never legible.
 */
const SPIN_K = 1.15;
const SPIN_MIN = 7.0;
const SPIN_MAX = 17.0;
/**
 * Per solver step, once it has hit something. 0.965^120 = 0.014, so the tumble is gone in
 * about a second and the medallion's own rigid-body rotation carries the read from there.
 * A spent projectile that keeps spinning on its own axis reads as a bug, not as momentum.
 */
const SPIN_DECAY = 0.965;
/**
 * The spin axis, in the mesh's local frame, and the Z lean that makes the tumble a precession.
 *
 * The mesh's +X is the direction of travel (the base class drives the body's rotation to the
 * velocity angle until first contact), so a spin about +Y is a medallion tumbling forward
 * THROUGH its arc rather than pinwheeling in the screen plane — and because the axis is
 * carried by the body's rotation, the tumble banks with the trajectory instead of being
 * billboarded to the camera. That part is the whole read and it is not negotiable.
 *
 * THE Z COMPONENT IS THE PART THAT WAS WRONG THE FIRST TIME. An earlier version leaned the
 * axis in X only and claimed that stopped the disc going exactly edge-on. It does not, and the
 * maths says so in one line: rotating the face normal n=+Z about an axis a traces a cone about
 * a, and any axis lying in the XY plane has a·n = 0, which puts the cone's half-angle at
 * exactly 90 deg — so n sweeps through the screen plane dead-on, twice a revolution, whatever
 * you do with the X/Y split. Only a Z component tilts the cone. With a_z = 0.315 the face
 * normal is n_z(phi) = 0.099 + 0.901*cos(phi): the two edge-on crossings move to 96.3 deg and
 * 263.7 deg, which is deliberately NOT symmetric — the front face is presented over a 192.6
 * deg arc and the back over 167.4 deg, so the struck side wins the argument, and the flicker
 * is no longer a perfectly even beat the eye can lock onto.
 *
 * A disc HAS to pass through edge-on: staying out of the screen plane needs the axis within
 * 45 deg of the camera, which is a billboard. So the edge-on frame is designed for instead of
 * dodged — see T for its width and SPIN_WHIP for how little time is spent there.
 */
const SPIN_AXIS = new THREE.Vector3(0.22, 1, 0.34).normalize();
/** cos of the axis' angle to +Z, i.e. a_z. Cached: `update()` runs in the fixed step. */
const SPIN_AZ2 = SPIN_AXIS.z * SPIN_AXIS.z;
/**
 * THE WHIP — how much faster the tumble runs through edge-on than through face-on.
 *
 * The brief's hard requirement is that the medallion never disappears mid-spin, and the honest
 * answer to that is two-part: make the edge-on silhouette an object (T), and spend as little
 * time in it as possible (this). A uniform spin gives the thinnest pose the same share of the
 * frames as the widest one; weighting the phase rate by how edge-on the disc currently is
 * spends ~2.6x fewer frames there and dwells on the struck face instead, which is also where
 * the branding lives.
 *
 * It is driven off the SAME n_z(phi) as the axis above rather than a hand-fitted |sin| — so
 * the whip is centred on the real crossings (96.3/263.7 deg), not on 90/270, and it cannot
 * drift out of step if the axis is ever re-leaned. Read it as a tossed coin catching the light,
 * not as a machined flywheel. The mean rate is normalised out (RATE_NORM) so the whip changes
 * WHERE the revolution spends its time and not how long a revolution takes: SPIN_K, SPIN_MIN
 * and SPIN_MAX still mean exactly what they say.
 */
const SPIN_WHIP = 1.6;
/** Mean of (1 + SPIN_WHIP * edge(phi)) over a revolution, so `_omega` stays the true rate. */
const RATE_NORM = (() => {
  let acc = 0;
  const N = 720;
  for (let i = 0; i < N; i++) {
    const nz = SPIN_AZ2 + (1 - SPIN_AZ2) * Math.cos((i / N) * Math.PI * 2);
    acc += 1 + SPIN_WHIP * (1 - Math.abs(nz));
  }
  return acc / N;
})();

// ---------------------------------------------------------------------------
// THE RIM.  Measured against the sky, not picked off the swatch.
// ---------------------------------------------------------------------------
/**
 * THE RIM IS BRAND NAVY, AND THE TWO GOLDS IT REPLACES ARE THE ROUND-1 DEFECT.
 *
 * r1 deepened PALETTE.gold two steps into bronze (0xd9982f / 0xa8701d) on the argument that
 * the medallion needed to stop averaging out to the sky. It was the right diagnosis and half
 * a step of the cure. Measured at 390x844 with the coin's exact pixel set (`ball-r2-metrics.py`,
 * `_shots/BALL/r2-baseline`), the bronze rim left the whole coin at a mean of **rgb(152,141,110)
 * — khaki — for a Weber contrast of 0.128 to 0.342 against what it was actually covering**.
 * A HUD chip on the same sky scores 0.63. The medallion, the object the wave's contrast rule
 * puts at RANK ONE, was reading softer than a piece of rank-three furniture.
 *
 * Bronze cannot fix that, because the problem is not the hue, it is the VALUE: any gold light
 * enough to read as gold sits within ~20 L* of this sky, and a ring that close to its
 * background is not a ring. So the rim is now the brand's own ink-navy, PALETTE.navy's family:
 *
 *              L*      vs sky L* 66     Weber
 *   sky        66        —                —
 *   r1 bronze  ~52      14               0.21
 *   r2 navy    ~26      40               0.61       <- HUD-chip class, at last
 *
 * What this buys, in order of how much it matters at ten pixels:
 *   1. the coin becomes a DARK RING AROUND A BRIGHT CORE — the one small-object pattern the
 *      eye resolves fastest, and the reason a target and a pupil look like they do;
 *   2. the edge-on pose, which is the thinnest and most fragile, goes from a pale bar that
 *      washed into the sky to a dark bar that cannot;
 *   3. the ink shell stops being the only thing separating the coin from the sky, which is
 *      what lets INK_W halve (see above) and hands those pixels back to the disc;
 *   4. it is navy, so it is IFM, which is the wave.
 *
 * The cost is honest and worth naming: this is no longer a GOLD medal. The coin read now comes
 * from the struck gold band inside the face (FACE_BAND) and from the form — a rimmed, lipped
 * disc with an inset field. Gold at 0.2 CSS px was never the thing telling anyone this was a
 * coin; the silhouette was.
 *
 * RIM is the wall (what you see edge-on, on RAMP_HARD so the lit band still sweeps as it
 * turns). LIP is the cap annulus, one step deeper so the field still reads as struck into it.
 * Re-measure with ball-r2-metrics.py before touching either.
 */
const RIM_NAVY = 0x24486e;
const LIP_NAVY = 0x152f4c;

// ---------------------------------------------------------------------------
// THE FACE — TWO MARKS, BECAUSE THE COIN IS TWO SIZES.
// ---------------------------------------------------------------------------
/**
 * ROUND 1 AUTHORED ONE FACE AND SHIPPED IT AT A SIZE IT WAS NEVER DRAWN FOR. That is the
 * whole of the round-2 rejection and it is worth stating as a number before anything else.
 *
 *                                   l1      l2      l3
 *   face diameter, 1280x720      26.41   26.54   28.41  CSS px
 *   face diameter,  390x844       8.50    8.05    8.62  CSS px      <- what ships
 *
 * A 3.1x difference between the size the mark was judged at and the size it is played at.
 * `assets/ifm-round.png` is a full roundel: a tree, a figure, two rupee coins, and a circular
 * "INVESTING FOR MUMMIES" text ring whose band is about 11 % of the artwork's height. Struck
 * into 74 % of an 8.5 CSS px face at DPR 2, that band is **1.4 device pixels tall**. It cannot
 * resolve. It does not degrade into a simpler mark either — it averages into the cream and
 * takes the tree with it, which is why `_shots/BALL/r2-baseline/ZOOM-l1-flight420.png` shows a
 * blank white disc in a gold ring and nothing else. The brand was present only in a camLocked
 * critic zoom, which is a place no player will ever stand.
 *
 * ORCHESTRATOR-NOTES already warned about this in general ("the 40 px floor must be measured
 * at the size actually played"). The rule the file was missing, and now carries:
 *
 *   >> A MARK IS NOT ONE ARTWORK. Author the smallest one FIRST, from the silhouette up, and
 *   >> let the detailed one be the luxury. Everything here is drawn at 512 and JUDGED at 17.
 *
 * So there are two faces and the medallion picks between them by its own projected size:
 *
 *   FLIGHT  one bold navy glyph — the IFM tree with the figure's arms raised into it — on a
 *           cream field inside a painted navy band. No text, no line work, nothing thinner
 *           than 2 % of the face. This is what the game renders essentially always.
 *   DETAIL  the r1 roundel, ifm-round.png struck twice into the same field. It is genuinely
 *           better when there are pixels for it, and it is what the player has seen on the
 *           website and in "Slash the Scam", so it is kept rather than thrown away.
 *
 * `DETAIL_ON_PX` is where the swap happens and it is derived, not chosen — see below.
 */
const FACE_PX = 512;

/**
 * THE PAINTED BAND — the dark ring that used to be a lit metal lip.
 *
 * Radii as fractions of the face plate's own radius. The band is what gives the coin its
 * "bright core inside a dark ring" read at ten pixels, and painting it rather than lighting it
 * is the point: a texel's value cannot swim with the tumble, and a mip halves it predictably
 * instead of catching a specular band and blowing out.
 *
 *   BAND_R0 .. 1.0    navy, the ring
 *   GOLD_R0 .. BAND_R0  brand gold, a struck hairline — this is the entire "it is a coin"
 *                     signal now that the rim is navy. At ship size it is ~0.2 CSS px and
 *                     reads as warmth on the inner edge of the ring; at DETAIL size it is a
 *                     gilt line. Cheap, and it is the only place PALETTE.gold still appears.
 */
const FACE_BAND = { BAND_R0: 0.845, GOLD_R0: 0.792 };

/**
 * THE FLIGHT GLYPH, in design units where the mark is 200 wide and the origin is its optical
 * centre. Scaled to `GLYPH_R` of the face radius at draw time.
 *
 * WHAT IT IS: the IFM mark reduced to the two things that survive a 17-device-pixel face — a
 * lumpy tree crown, and a figure with both arms thrown up into it. Nothing else in the roundel
 * has a silhouette; the leaves, the coins and the wordmark are all texture, and texture is
 * exactly what a mip destroys. Anyone who has seen the roundel reads this as the same mark.
 *
 * WHY THESE PROPORTIONS: every stroke is at least 17 design units — 8.5 % of the glyph, ~1.3
 * device px at ship size — because a stroke thinner than about a pixel does not get thinner
 * when it mips, it gets FAINTER, and a faint navy line on cream is the grey mush r1 shipped.
 * The crown is one connected mass rather than separate leaves for the same reason.
 *
 * The two rupee coins from the logo survive as plain gold discs in the hands. They are the only
 * warm thing inside a navy-on-cream glyph and the mark's one piece of PALETTE evidence, so r3
 * moved them clear of the canopy rather than leaving them buried in it — see below.
 *
 * ── R3: THE MARK WAS PRESENT AND IT WAS NOT DOMINANT ─────────────────────────
 * r2 fixed the right thing — a symbol instead of a shrunk lockup — and stopped one step short
 * of the brief, which asked for the symbol "filling most of the disc".
 *
 * `ball-mark.py` is the measurement r2 did not have. It renders the identical frame through
 * the `field` face variant (the same struck face, glyph removed) and subtracts, so the pixel
 * set it counts is the GLYPH and nothing else. r2's own scenario could not tell the mark from
 * the face it is struck into — its "noglyph" pass hid the whole face PLATE — which is why it
 * reported markFrac 0.73 for a mark that moves a quarter of the coin.
 *
 * Measured on the r2 build at 390x844, `_shots/BALL/r3-mark-before`:
 *
 *     glyphFrac  0.224 / 0.236 / 0.215   (l1/l2/l3, t=40 ms)   <- a QUARTER of the disc
 *     mean dL      -23.6 / -23.4 / -24.4  L* against the cream it covers
 *
 * and after the three levers below plus the widened trunk, `_shots/BALL/r3-final2`:
 *
 *     glyphFrac  0.288 / 0.286 / 0.281   t=40 ms      +29 %
 *                0.312 / 0.313 / 0.294   t=460 ms     +27 %, and over 0.31 face-on
 *     mean dL      -24.6 / -24.8 / -25.3   from -23.6
 *     p90 dL       -50.8 / -50.9 / -50.9   from -47.7
 *
 * The pouch frame moved too — mean dL -14.0 -> -16.1, p90 -33.5 -> -36.1 — and it is worth
 * saying why it is the weakest of the three and always will be: the sling's band and arm cross
 * the coin's middle while it sits in the pouch, so a third of the mark is behind them. That is
 * the slingshot's frame to fix, not this file's.
 *
 * READ `glyphFrac` HONESTLY. 0.30 is the mark against the WHOLE COIN, and the coin is mostly
 * ring by construction: the face plate is 0.955 of the disc, the cream inside the band is
 * 0.63 of the face, and a tree is about 60 % of its own bounding box. 0.49 x 0.63 x 0.60
 * ~= 0.29 — the glyph is now filling essentially all of the room a mark can have on this face
 * without eating the band, and "most of the disc" is only reachable by deleting the ring that
 * makes it read as a coin. The next 0.05 is not there; anyone chasing it should change the
 * FACE composition, not the glyph.
 *
 * Three levers, in the order they are worth anything, and not one of them touches the disc:
 *
 *  1. SIZE. `GLYPH_R` 0.615 -> 0.700, worth (0.70/0.615)^2 = 1.30x the mark area for free —
 *     it is a texture on a plate of FIXED radius, so no mesh, no bounding box and no
 *     `ammoDiameter()` moves, and the AD budget at the top of this file is untouched by it.
 *     0.700 and not more: the cream ends at GOLD_R0 = 0.792 and the glyph's circumscribed
 *     radius is exactly its half-height, so 0.700 leaves ~0.9 device px of cream between the
 *     mark and the gold hairline at ship size. Tighter than that and the mip bleeds the two
 *     together, and the hairline is the whole "this is a coin" signal.
 *  2. WEIGHT. Every member thickened: canopy lobes +4..+6, `armW` 19 -> 24, head 16 -> 18,
 *     trunk base 32 -> 36. The glyph is ~13.6 device px tall at ship size, so an arm is 1.6
 *     device px now instead of 1.3 — over the "does not mip to a ghost" floor with margin
 *     rather than sitting exactly on it.
 *  3. DEPTH. See `GLYPH_INK`.
 *
 * WHERE THE COINS WENT. r2 put them at (+/-64,-44), which is INSIDE the canopy lobe centred
 * (62,-22) r38 — 22 units out against a 38-unit radius. Gold drawn on navy, inside the
 * silhouette, ~1.5 device px at ship size: it read as noise in the mark's own mass. They are
 * at (+/-80,-64) r18 now, clear of every lobe, so each lands ON the cream at the canopy's
 * upper-outer edge as a ~2.5 device px gold disc with the mark's darkest value right beside
 * it. Strongest small accent available on this face, and it costs two arcs.
 */
const GLYPH_R = 0.700;

/**
 * The mark's ink, and why it is not `PALETTE.navy` (#1a3a5c) like the band around it.
 *
 * The face material adds a cream emissive at 0.09 and runs a toon ramp over it, and both of
 * those lift the mark and the field it sits on by the SAME amount — which is how a pairing
 * that is about -60 dL in the texture measures -24 on screen. Emissive is additive, so the
 * cheap way to buy that contrast back is to hand the compositor a darker ink, not to take the
 * emissive away: 0.09 is load-bearing (it is what keeps the face off black when the medallion
 * tumbles into its own shadow — see `faceOpts`), and dropping it would dim the cream core that
 * is this coin's entire read against a dark tower.
 *
 * #142d48 is #1a3a5c multiplied by 0.78 — same hue, same brand navy, one value step down —
 * and it is used ONLY on the flight glyph. The band, the rim and the lip stay on the exact
 * palette navy and the DETAIL face is the real artwork untouched, so nothing a player sees at
 * a size where two navies could be told apart is off-brand.
 *
 * HOW MUCH IS LEFT ON THE TABLE, measured rather than assumed. The same build was captured
 * with the glyph forced to PURE BLACK (`_shots/BALL/r3-probe-black`) to find the ceiling the
 * emissive imposes, since no ink can be darker than that:
 *
 *              p90 dL      #1a3a5c(r2)   #142d48(ships)   #000000(ceiling)
 *     l1 t=460    -47.3          -50.3            -56.1
 *     l3 t=040    -47.7          -50.9            -57.1
 *
 * so the shipped ink takes about 88 % of the whole available range and pure black would buy
 * ~6 L* more. That is not worth calling the mark black, and it stands: darkening this constant
 * further is not where the contrast is.
 *
 * ── WHAT R3 GOT WRONG ABOUT THIS PARAGRAPH ───────────────────────────────────
 * r3 read those numbers as "the remaining softness is the MIP and the 20-device-px face". It
 * is not. The reason black bought only 6 L* is that r3 was probing the ink while a much larger
 * constant held the floor underneath it — see `FACE_EMISSIVE` below, which is the same probe
 * run on the other term and is worth 23. The ceiling this paragraph measures was the
 * EMISSIVE's ceiling, not the mip's.
 */
const GLYPH_INK = '#142d48';

/**
 * THE FACE EMISSIVE — and the r4 finding that the mark's softness was never the mip.
 *
 * r3 signed off with "the remaining softness is the MIP and the 20-device-px face, not the
 * colour". That is wrong, and the way to see it is to take the texture the game actually
 * uploads and box-filter it to the size the game actually draws it at.
 * `_shots/BALL/r4-face/box-20.png` is `__faceCanvases().flight` reduced to 20 px by an area
 * filter — the same operation a GPU mip performs — and it is a **deep navy tree with two gold
 * coins, unmistakable.** The texture survives 20 px perfectly well. The pixels on screen do
 * not look like that, so whatever destroys the mark happens AFTER the mip, in the shading.
 *
 * It is the emissive, and it is arithmetic rather than opinion. Solving
 *
 *     rendered_linear = k * map_linear + e
 *
 * for the two knowns in a real l1 flight frame (`_shots/BALL/r4-strip`, t=40 ms) — cream
 * sRGB 224 against a map cream of 0.97 linear, glyph sRGB ~102(B) against a map ink of 0.068
 * linear — gives k = 0.66 and **e = 0.088**. So of the glyph's rendered value, 0.045 is the
 * ink and 0.088 — TWICE AS MUCH — is the emissive floor underneath it. The mark was two parts
 * flat cream light to one part brand navy, which is the whole of why it measured L* 64: a
 * mid-grey, not a navy. Emissive is additive and the map's cream is already near 1.0, so this
 * floor costs the dark end everything and buys the bright end nothing.
 *
 * The 0.09 was defended as "enough to keep the face off black when the medallion tumbles into
 * its own shadow side". Nothing on this face was ever going to black: `main.js` lights the
 * scene with a `HemisphereLight(0xdff2ff, 0x77a047, 1.02)`, so the unlit side of every object
 * in the game still receives a full unit of sky. The emissive was insuring against a risk the
 * lighting rig had already covered.
 *
 * MEASURED LADDER at 390x844 through `ball-r3-mark.mjs` + `ball-mark.py`, five builds,
 * `_shots/BALL/r4-mark-{before,e0045,e0030,e0015,e0000}`. Row shown is l1 t=40 ms; l2, l3 and
 * t=460 track it to within 1 L*:
 *
 *     emissive    L* glyph   L* field      dL     p90 dL
 *     0.090 (r3)      64.6       89.2   -24.6      -50.8    <- grey mark on cream
 *     0.045           59.3       88.6   -29.2      -62.6
 *     0.030           57.1       88.4   -31.2      -67.4
 *     0.015           54.4       88.1   -33.8      -73.4    <- ships
 *     0.000           51.8       87.9   -36.1      -80.0
 *
 * dL -24.6 -> -33.8 is **+37 % of contrast, and p90 dL +44 %, on the one element the wave's
 * own hierarchy rule puts at rank one** — and it costs the cream field 1.1 L*, 89.2 to 88.1,
 * which is under a JND and nowhere near the "pale grey ghost" failure that made r1 pull the
 * emissive down from 0.30 in the first place. 0.015 rather than 0.000 because the last step
 * is worth only 2.3 L* and a floor of zero would make the face's darkest value a pure
 * function of a lighting rig this file does not own.
 *
 * WHAT IT COSTS THE COIN, measured too (`ball-r2.mjs` + `ball-r2-metrics.py`, l1/l2/l3,
 * `_shots/BALL/r4-coin-e015` against the r3 build in `_shots/BALL/r2v-measure`). The medallion
 * against the sky it is really covering, which is the contrast rule's actual subject:
 *
 *                   Weber 0.09   Weber 0.015
 *     flight t=120       0.531         0.566
 *     flight t=260       0.387         0.481
 *     flight t=420       0.215         0.332      <- +55 %
 *     in the pouch       0.188         0.024      <- see below
 *
 * THE POUCH ROW IS A CROSSOVER, NOT A LOSS, and it is the one number here that could be
 * misread. In the pouch the coin covers the sling and the ground, not sky: Lbg 44.9. The r3
 * coin averaged 53.3 — a hair BRIGHTER than that background — and the r4 coin averages 46.0,
 * so the mean passes THROUGH the background on its way down and Weber-on-the-mean dips to
 * nothing at the crossing. The coin's own spread and its edge are unmoved (p10 15.0, p90 84.5,
 * edgeMax 76.3 vs r3's 19.6 / 87.3 / 79.8), which is what a viewer actually resolves: a dark
 * ring and a bright core against mid ground. Darkening it further would send Weber back UP.
 * Judge the pouch by `_shots/BALL/r4-coin-e0015/ZOOM-l1-pouch.png`, not by that cell.
 *
 * Read together with `GLYPH_INK`'s black probe, the two numbers now say the same thing from
 * both ends: darkening the INK was worth ~6 L* of p90 because the emissive was setting the
 * floor; lowering the FLOOR was worth ~23. Anyone tempted to chase this further should measure
 * the shading, not redraw the mark.
 *
 * LOOK AT IT, DO NOT JUST READ THE TABLE. `_shots/BALL/r4-mark-e0015/AB-l1-t040.png`
 * (`ball-r4-ab.py`) is the same l1 flight frame through three builds side by side, cropped at
 * the coin's own centre and magnified 12x by nearest neighbour and nothing else: 0.090 is a
 * grey mark, 0.015 is a navy one, and the disc is 9.71 CSS px in all three columns.
 */
const FACE_EMISSIVE = 0.015;

const GLYPH = {
  /** Union of circles -> one lumpy canopy. Wider and taller than r2's, and still ONE mass. */
  crown: [
    [0, -56, 46], [-64, -34, 40], [64, -34, 40],
    [-36, -80, 34], [36, -80, 34], [0, -100, 30],
  ],
  arms: [[12, 4, 70, -56], [-12, 4, -70, -56]],   // x0,y0 -> x1,y1, round caps
  armW: 24,
  head: [0, -8, 18],
  /**
   * The figure's dress, which is also the tree's trunk — in the roundel it is one shape and
   * that is the whole idea of the mark. WIDE, because at a 13.6-device-px glyph almost every
   * pixel of a slim member is an antialiased edge pixel, and an edge pixel is 60 % cream. r3's
   * first cut had this at +/-36 at the hem and the trunk measured as the palest part of the
   * mark in `_shots/BALL/r3-strip`. Widening it does not make the mark bigger — the hem is
   * nowhere near the circumscribed radius — it makes the mark SOLID, which is the thing that
   * survives a mip.
   */
  dress: [[-22, 4], [-44, 80], [0, 92], [44, 80], [22, 4]],
  /**
   * The cupped hands, filled with the mass so the mark stays ONE silhouette, and each one
   * `coinR + 6` so the gold disc it holds lands in a navy pocket rather than on the canopy's
   * ragged union edge. Gold on navy is L* ~80 against ~25 — the strongest value pair anywhere
   * on this coin — and it is only that pair if the navy is guaranteed all the way round.
   */
  coins: [[70, -56], [-70, -56]],
  handR: 28,
  coinR: 22,
  /**
   * The design's half-height, and what `drawFlightMark` scales by. The glyph's CIRCUMSCRIBED
   * radius is 111 as well — the canopy's top at (0,-100)+30 and the trunk's point at (0,92)
   * both land exactly on it once `dy` is applied — which is the only reason the clearance to
   * the gold hairline above can be stated as a single number.
   */
  half: 111,
  /** Optical centring: the canopy is the heavy end, so the bbox centre sits above the origin. */
  dy: 19,
};

/**
 * WHERE THE DETAILED ROUNDEL EARNS ITS PLACE — derived from the text ring, not picked.
 *
 * The roundel's smallest load-bearing feature is the "INVESTING FOR" band: ~11 % of the
 * artwork, drawn at 74 % of the face. Reading lowercase-height letterforms needs roughly 5
 * device px, so
 *
 *     face_px * 0.74 * 0.11 >= 5 device px   ->   face >= 61 device px = 31 CSS px at DPR 2
 *
 * and the swap is stated on the DISC diameter (face / 0.955) rather than the face, because
 * that is the number every other tool in this repo reports. 34 CSS px, then, with the return
 * to FLIGHT at 0.82 of it so a coin hovering on the boundary cannot flicker between marks.
 *
 * BE HONEST ABOUT WHERE THIS FIRES. At the game's own framing the disc is 9.0-10.0 CSS px on
 * a phone and 26-28 on desktop, so **shipped play is FLIGHT, always, on both viewports**. The
 * detail face is what a `camLock` lens sees, what the split's three coins show if a future
 * camera ever closes in, and what a menu or a badge would get. It is a real fallback with a
 * derived threshold, not a claim that the roundel is on screen — and `state()` reports the
 * measured size and the LOD in force so nobody has to take that on trust.
 */
const DETAIL_ON_PX = 32;   // derived legibility floor is 31 CSS px at DPR 2; 32 keeps margin and catches l1 at 33.79
const DETAIL_OFF_PX = DETAIL_ON_PX * 0.82;

let flightCanvas = null, detailCanvas = null, fieldCanvas = null;
let flightTex = null, detailTex = null, fieldTex = null;
let facePromise = null;
let faceState = 'idle';     // idle | loading | ready | fallback

/**
 * The struck field and its band. Shared by both LODs, so the coin's colour and edge do not
 * change when the mark does — only the mark changes.
 *
 * DESIGNED FOR THE MIP, NOT FOR THIS CANVAS. On screen the face is ~10 CSS px at 390x844,
 * five mip levels down from 512, so every stroke here is averaged into its neighbours before
 * the player sees it. Two things survive that: the field's mean colour, and a band thick
 * enough to still be a band afterwards.
 *
 * r1's version of this ring was a 4.4 %-of-diameter navy STROKE at 0.86 R — itself a fix for a
 * 1.6 %-at-half-alpha stroke that had measured as nothing. It is a filled annulus running to
 * the plate's edge now, for the reason that mattered more than its width: a stroke centred on
 * a radius has cream on BOTH sides of it, so mipping bleeds cream inward and outward and the
 * ring loses half its contrast from each side. An annulus that ends at the edge of the plate
 * only has cream on one side, and what is on the other side is the navy rim.
 */
function drawFaceField(g) {
  const c = FACE_PX / 2;
  g.clearRect(0, 0, FACE_PX, FACE_PX);
  // Cream, with a warm gradient so the disc is not a flat sticker.
  const grad = g.createRadialGradient(c * 0.78, c * 0.70, c * 0.10, c, c, c);
  grad.addColorStop(0, '#fffdf7');
  grad.addColorStop(0.62, '#fdf6ec');
  grad.addColorStop(1, '#f0e2cb');
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
  // Struck gold hairline, then the navy band, both filled annuli drawn outside-in.
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2);
  g.arc(c, c, c * FACE_BAND.GOLD_R0, 0, Math.PI * 2, true);
  g.fillStyle = '#f6c453'; g.fill('evenodd');
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2);
  g.arc(c, c, c * FACE_BAND.BAND_R0, 0, Math.PI * 2, true);
  g.fillStyle = '#1a3a5c'; g.fill('evenodd');
}

/**
 * The flight mark. One path, one fill, two gold specks — see GLYPH for why it is this shape.
 *
 * Drawn as a single `fill()` over a union of subpaths so the crown, arms, head and dress are
 * ONE silhouette with no seams: overlapping fills with any alpha at all would show their joins
 * as lighter lines, and a lighter line inside a navy mass is precisely the detail that mips
 * into mud.
 */
function drawFlightMark(g) {
  const c = FACE_PX / 2;
  const s = (c * GLYPH_R) / GLYPH.half;
  const X = (x) => c + x * s;
  const Y = (y) => c + (y + GLYPH.dy) * s;

  g.save();
  g.fillStyle = GLYPH_INK;
  g.strokeStyle = GLYPH_INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Arms first, as strokes — a stroked capsule is the one shape a fill cannot spell cheaply.
  g.lineWidth = GLYPH.armW * s;
  for (const [x0, y0, x1, y1] of GLYPH.arms) {
    g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke();
  }
  // Crown + head + dress as one filled path.
  g.beginPath();
  for (const [x, y, r] of GLYPH.crown) {
    g.moveTo(X(x) + r * s, Y(y));
    g.arc(X(x), Y(y), r * s, 0, Math.PI * 2);
  }
  const [hx, hy, hr] = GLYPH.head;
  g.moveTo(X(hx) + hr * s, Y(hy));
  g.arc(X(hx), Y(hy), hr * s, 0, Math.PI * 2);
  // The hands, in the same path as everything else — see GLYPH.handR.
  for (const [x, y] of GLYPH.coins) {
    g.moveTo(X(x) + GLYPH.handR * s, Y(y));
    g.arc(X(x), Y(y), GLYPH.handR * s, 0, Math.PI * 2);
  }
  const d = GLYPH.dress;
  g.moveTo(X(d[0][0]), Y(d[0][1]));
  for (let i = 1; i < d.length; i++) g.lineTo(X(d[i][0]), Y(d[i][1]));
  g.closePath();
  g.fill();

  // The two rupee coins, gold on navy hands.
  g.fillStyle = '#f6c453';
  for (const [x, y] of GLYPH.coins) {
    g.beginPath(); g.arc(X(x), Y(y), GLYPH.coinR * s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function drawFallbackMark(g) {
  // Only ever seen if the PNG cannot be fetched, and now only on the DETAIL face — the flight
  // mark is drawn code and cannot fail to load, so a dead asset can no longer produce an
  // unbranded coin in play. That is the main practical dividend of splitting the two.
  const c = FACE_PX / 2;
  g.fillStyle = '#1a3a5c';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(FACE_PX * 0.30)}px "Nunito","Nunito Sans",system-ui,sans-serif`;
  g.fillText('IFM', c, c * 0.92);
  g.font = `700 ${Math.round(FACE_PX * 0.085)}px "Nunito","Nunito Sans",system-ui,sans-serif`;
  g.fillStyle = '#2a9d8f';
  g.fillText('INVESTING FOR MUMMIES', c, c * 1.38);
}

const canvasTex = (cv) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
};

/**
 * THREE canvases, and BOTH PLATES OF A MEDALLION SHARE ONE TEXTURE.
 *
 * r1 built two CanvasTextures from one canvas, front and back, on the strength of a comment
 * about mirroring the wordmark — and that same comment then explains at length why the back
 * plate needs no U flip (the plate is turned pi about Y and is only ever seen from -Z, so the
 * two flips cancel; the note is kept below because the wrong answer is the intuitive one).
 * The two textures were therefore identical in every field, which cost a second material and a
 * fourth draw call per medallion for nothing. One texture, one material, three draws.
 *
 * `fieldCanvas` is the field with NO mark. It exists so `ball-r2-metrics.py` can subtract the
 * glyph from the rendered frame and report the mark's real pixel count instead of the face
 * plate's — the difference between "how big is the coin" and "how hard does the mark strike",
 * which r1 had no way to tell apart.
 */
function makeFaceTextures() {
  const mk = () => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = FACE_PX;
    drawFaceField(cv.getContext('2d'));
    return cv;
  };
  fieldCanvas = mk();
  flightCanvas = mk();
  detailCanvas = mk();
  drawFlightMark(flightCanvas.getContext('2d'));
  fieldTex = canvasTex(fieldCanvas);
  flightTex = canvasTex(flightCanvas);
  detailTex = canvasTex(detailCanvas);
}

/**
 * Load the logo and strike it into the DETAIL face.
 *
 * Called from `boot()` before the first level builds. It never rejects and it never hangs:
 * HOOKS.md's rule is that `ready` must not be gated on a fetch that can stall, so this resolves
 * on a timeout with a logged warning and the fallback mark drawn instead.
 *
 * Since r2 this is no longer on the critical path for branding — the flight mark is code and is
 * already on every medallion the moment it is built. This only decides what a close lens sees.
 */
export function preloadMedallionFace(url, timeoutMs = 4000) {
  if (facePromise) return facePromise;
  if (!detailTex) makeFaceTextures();
  faceState = 'loading';
  const src = url || new URL('../../assets/ifm-round.png', import.meta.url).href;

  facePromise = new Promise((resolve) => {
    let settled = false;
    const finish = (state, note) => {
      if (settled) return;
      settled = true;
      faceState = state;
      if (state === 'fallback') {
        drawFallbackMark(detailCanvas.getContext('2d'));
        console.warn(`[medallion] detail face fell back to the drawn mark: ${note}`);
      }
      detailTex.needsUpdate = true;
      resolve(state);
    };
    const timer = setTimeout(() => finish('fallback', `timed out after ${timeoutMs}ms`), timeoutMs);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      try {
        const g = detailCanvas.getContext('2d');
        // Fit the mark inside 0.74 of the disc, preserving its 465x512 aspect, and nudge it up
        // a hair: the logo's own visual mass sits above centre because of the wordmark.
        const box = FACE_PX * 0.74;
        const k = Math.min(box / img.width, box / img.height);
        const w = img.width * k, h = img.height * k;
        const x = (FACE_PX - w) / 2, y = (FACE_PX - h) / 2 - FACE_PX * 0.012;
        g.drawImage(img, x, y, w, h);
        /**
         * STRUCK TWICE, ON PURPOSE. The logo is fine line work drawn for white paper; one pass
         * of it averages into the cream. Drawing it again in `multiply` squares every stroke's
         * darkness while leaving the transparent field untouched (a zero-alpha source leaves
         * the backdrop alone under `multiply`).
         *
         * r1 held this at 0.55 as a compromise with the tiny end, where a full multiply turned
         * the face into grey mottle. THE COMPROMISE IS GONE — the tiny end has its own mark
         * now — so this face is free to be struck as hard as it wants. That is the second
         * dividend of the split, after the load-failure one: neither mark is being detuned to
         * protect the other.
         */
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.85;
        g.drawImage(img, x, y, w, h);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
        finish('ready');
      } catch (e) { finish('fallback', String(e && e.message || e)); }
    };
    img.onerror = () => { clearTimeout(timer); finish('fallback', `could not load ${src}`); };
    img.src = src;
  });
  return facePromise;
}

/** For hooks/critics: did the real logo make it onto the DETAIL face? */
export function medallionFaceState() { return faceState; }

/**
 * FOR MEASUREMENT ONLY — force one LOD, or the mark-free field, on every medallion.
 *
 * `'field'` is the one that matters: rendering the identical frame with the glyph gone is the
 * only way to get the mark's exact pixel set without guessing a colour, and guessing a colour
 * is how r1 came to believe a blank disc had a mark on it. Nothing in the game calls this and
 * `'auto'` restores the size-driven pick.
 */
let faceVariant = 'auto';
export function setMedallionFaceVariant(v) {
  if (!['auto', 'flight', 'detail', 'field'].includes(v)) {
    throw new Error(`setMedallionFaceVariant: unknown variant "${v}"`);
  }
  faceVariant = v;
  return { ok: true, variant: faceVariant };
}
/** The variant in force, for `state()`. */
export function medallionFaceVariant() { return faceVariant; }

/**
 * FOR MEASUREMENT ONLY — the raw face canvases, so a tool can render them at ship size.
 *
 * `ball-r2-face.mjs` uses this to redraw each mark at 16-128 device px and look at it. That
 * loop is the only reason round 2 caught what round 1 shipped, so the accessor is part of the
 * fix and not scaffolding. Double-underscored to say it plainly: nothing in the game may call
 * it, and nothing does.
 */
export function __faceCanvases() {
  if (!flightCanvas) makeFaceTextures();
  return { flight: flightCanvas, detail: detailCanvas, field: fieldCanvas };
}

// ---------------------------------------------------------------------------
// SHARED GEOMETRY + MATERIALS.  One set for every medallion in the level.
// ---------------------------------------------------------------------------
const CACHE = {};
function geo(key, make) { if (!CACHE[key]) CACHE[key] = make(); return CACHE[key]; }

let rimMat = null, lipMat = null, faceMats = null;
function materials() {
  if (rimMat) return { rimMat, lipMat, faceMats };
  if (!flightTex) makeFaceTextures();
  /**
   * THE RIM HAS ITS OWN MATERIAL, and a HARD ramp on purpose. RAMP_HARD is a two-step ramp,
   * so as the medallion tumbles the lit band sweeps around the rim as a crisp moving edge
   * rather than a soft gradient — that sweep is the whole "it catches light as it turns"
   * read, and it is also what keeps the edge-on frames from going flat and dead.
   */
  rimMat = new THREE.MeshToonMaterial({
    color: RIM_NAVY, gradientMap: RAMP_HARD(),
    // The emissive went from warm (0x6b4310) to cold with the rim itself. A warm lift under a
    // navy diffuse does not read as "navy in warm light", it reads as mud — it drags the hue
    // through the greens on its way — and mud at ten pixels is exactly the khaki this round is
    // getting rid of. 0.10 rather than 0.14 because the darker the rim, the more a lift costs.
    emissive: new THREE.Color(0x122d4a), emissiveIntensity: 0.10,
  });
  /** The lip (the cap annulus around each face) is deeper, so the face plate reads as inset. */
  lipMat = new THREE.MeshToonMaterial({
    color: LIP_NAVY, gradientMap: RAMP_STD(),
    emissive: new THREE.Color(0x0c1e33), emissiveIntensity: 0.10,
  });
  /**
   * THE FACE EMISSIVE IS DELIBERATELY LOW. Emissive is ADDED after the map, so it lifts the
   * cream field and the navy mark by the same amount — which is to say it destroys exactly the
   * contrast the mark is made of. At 0.30 the struck logo measured as a pale grey ghost and was
   * gone entirely below about 20 px. Brightness on this face comes from the cream in the MAP,
   * which the mark can still be dark against. The value, the ladder behind it and the reason
   * "keep the face off black in shadow" was never the constraint it was taken for all live on
   * `FACE_EMISSIVE`, next to `GLYPH_INK` where the rest of the mark's contrast is decided.
   */
  const faceOpts = {
    color: 0xffffff, gradientMap: RAMP_STD(),
    emissive: new THREE.Color(PALETTE.cream), emissiveIntensity: FACE_EMISSIVE,
  };
  /**
   * ONE MATERIAL PER LOD, shared by both plates of every medallion in the level. Three
   * materials, and only ever one of them in the draw list at a time on a normal frame — so a
   * medallion is THREE draw calls now (body, both faces, shell), not four.
   */
  faceMats = {
    flight: new THREE.MeshToonMaterial({ ...faceOpts, map: flightTex }),
    detail: new THREE.MeshToonMaterial({ ...faceOpts, map: detailTex }),
    field: new THREE.MeshToonMaterial({ ...faceOpts, map: fieldTex }),
  };
  return { rimMat, lipMat, faceMats };
}

/** Free the shared GPU objects. Full teardown only — see art/toon.js disposeToon(). */
export function disposeMedallion() {
  for (const m of [rimMat, lipMat, ...Object.values(faceMats ?? {})]) m?.dispose?.();
  for (const t of [flightTex, detailTex, fieldTex]) t?.dispose?.();
  rimMat = lipMat = faceMats = null;
  flightTex = detailTex = fieldTex = null;
  flightCanvas = detailCanvas = fieldCanvas = null;
  facePromise = null; faceState = 'idle';
  for (const k of Object.keys(CACHE)) { CACHE[k]?.dispose?.(); delete CACHE[k]; }
}

/** Scratch. `update()` runs inside the fixed step for up to three live medallions at once —
 *  allocating a quaternion in there is a GC spike during a collapse, which is the one moment
 *  the frame budget is already gone (art/toon.js learned this with the ink materials). */
const _qTarget = new THREE.Quaternion();
const _AXIS_Z = new THREE.Vector3(0, 0, 1);
const _pWorld = new THREE.Vector3();

export class IfmMedallion extends Ammo {
  static id = 'ifm';
  static label = 'IFM Medallion';

  constructor(o = {}) {
    // radius/matName are the COLLIDER and the PHYSICS PRESET. Do not tune them here — they
    // are the arrow's numbers, unchanged, and P1/P2's protected measurements ride on them.
    super({ radius: COLLIDER_R, matName: 'ammo', ...o, tag: 'ammo' });
    this.splitGeneration = o.generation ?? 0;
    this._phase = 0;
    this._omega = 0;
    this._upright = 0;      // 0..1 blend of "lie face-up once you have stopped"
  }

  buildMesh(g) {
    // Everything visual hangs off `spin`, because Entity.sync() overwrites mesh.quaternion
    // with the rigid body's rotation on every render. A child group is the only place a
    // purely visual rotation can live without fighting the physics transform.
    const spin = new THREE.Group();
    spin.name = 'medallion-spin';
    g.add(spin);
    this.spin = spin;

    /**
     * Visual scale = this body's collider radius over the radius the MESH CONSTANTS were
     * authored against. It carries two jobs at once and the denominator is why:
     *   · split children are smaller medallions (radius 0.351 against the parent's 0.520);
     *   · and since `COLLIDER_R` went 0.40 -> 0.52, the parent itself is drawn 1.30x.
     * Dividing by `COLLIDER_R` instead would pin the parent at 1.00 forever and make the size
     * knob move the collider ALONE — which is exactly the bug this line had for one round: the
     * collider grew, `self`-measured disc stayed 11.96 CSS px, and `colliderR 0.52` in the
     * instrument's output was the only thing that had moved.
     */
    const s = (this.radius ?? COLLIDER_R) / MESH_AUTHORED_AT_R;
    spin.scale.setScalar(s);

    const { rimMat: rim, lipMat: lip, faceMats: fm } = materials();

    /**
     * ONE cylinder carries the whole body. CylinderGeometry ships three material groups —
     * [side, top cap, bottom cap] — so the rim wall and the two face lips get different
     * materials out of a single mesh and a single geometry. Rotated +90 deg about X so the
     * caps face the camera (+/-Z) and the wall is the rim you see when it is side-on.
     */
    const bodyGeo = geo('medalBody', () => {
      const c = new THREE.CylinderGeometry(R, R, T, 44, 1, false);
      c.rotateX(Math.PI / 2);
      return c;
    });
    const body = new THREE.Mesh(bodyGeo, [rim, lip, lip]);
    body.castShadow = true;
    body.name = 'medallion-body';
    spin.add(body);

    // The two struck faces. Flat circles rather than the cylinder's own caps, because a
    // cylinder's bottom cap carries mirrored UVs and would flip the mark.
    const faceGeo = geo('medalFace', () => new THREE.CircleGeometry(FACE_R, 40));
    const front = new THREE.Mesh(faceGeo, fm.flight);
    front.position.z = FACE_Z;
    front.name = 'medallion-face-front';
    front.userData.noInk = true;      // an inverted hull on a flat plate would sit IN FRONT of it
    spin.add(front);

    const back = new THREE.Mesh(faceGeo, fm.flight);
    back.position.z = -FACE_Z;
    back.rotation.y = Math.PI;
    back.name = 'medallion-face-back';
    back.userData.noInk = true;
    spin.add(back);
    // Held so the LOD swap is two assignments and no traversal: `update()` runs in the fixed
    // step for up to three live medallions and a getObjectByName() in there is a scene walk.
    this._plates = [front, back];
    this.faceLod = 'flight';
    this.faceCssPx = 0;

    /**
     * THE INK SHELL IS A REAL OFFSET SOLID, NOT THE STOCK INVERTED HULL. This is the one place
     * the medallion departs from the house outline, and it is a bug fix, not a preference.
     *
     * `ink()` expands a merged copy of the source geometry along its SMOOTHED VERTEX NORMALS.
     * That is right for a box or a limb; it is wrong for a disc, because a cylinder's normals
     * point two incompatible ways — the caps along +/-Z, the wall radially — so the expansion
     * inflates the disc ALONG ITS OWN AXIS as much as across it. Face-on that is invisible and
     * the outline looks perfect. Tilt it and the axis swings across the screen, and the outline
     * stops being a rim and becomes a black smear on the two axis-facing edges with nothing on
     * the other two. `_shots/BALL/r1-ink-before` is what that looks like at 12 poses: it reads
     * as a dropped shadow, not as ink, and it was the single worst thing in the frame.
     *
     * A cylinder has an exact offset solid — a bigger cylinder — so the shell is just that,
     * built to R + INK_W by T + 2*INK_W and rendered BackSide by the house ink material. The
     * material is fetched by calling `ink()` with thickness 0 (no shader push at all) and then
     * swapping the geometry: the alternative is exporting `inkMaterial` from toon.js, and a
     * shared module should not grow an export to serve one caller.
     *
     * The trade is deliberate: this outline is a fixed WORLD width, so it scales with the
     * camera instead of holding a constant pixel width. For the one hero object that is seen
     * both at whole-level framing and in a slow-motion impact, proportional is the better of
     * the two — a constant-pixel outline eats a 13 px disc alive when the camera pulls back.
     */
    const shell = ink(body, 0, INK);
    shell.geometry = geo('medalShell', () => {
      const c = new THREE.CylinderGeometry(R + INK_W, R + INK_W, T + 2 * INK_W, 44, 1, false);
      c.rotateX(Math.PI / 2);
      return c;
    });
    // The shell inherits nothing from the body's three material groups, but the swapped
    // geometry brings its own — one flat colour does not need three draw calls.
    if (shell.geometry.groups?.length > 1) {
      shell.geometry.clearGroups();
      shell.geometry.addGroup(0, Infinity, 0);
    }

    g.userData.ownsGeometry = false;   // geometry is shared via CACHE, never per-instance
  }

  /**
   * SPLIT INTO THREE — unchanged in every number that matters.
   *
   * The joke survives the reskin and gets better: one medallion becomes three instalments,
   * which is what a SIP is. Total mass is deliberately MORE than the original, because three
   * smaller hits spread across a structure beat one big hit in the middle, and that is the
   * entire reason to spend the ability.
   */
  ability() {
    if (this.splitGeneration > 0) return false;      // children cannot split again
    const v = this.body.linvel();
    const sp = Math.hypot(v.x, v.y);
    if (sp < 3) return false;
    const ang = Math.atan2(v.y, v.x);
    const p = this.body.translation();

    for (const dA of [+0.30, -0.30]) {
      const a = ang + dA;
      const child = new IfmMedallion({
        x: p.x + Math.cos(a) * 0.55,
        y: p.y + Math.sin(a) * 0.55,
        radius: COLLIDER_R * SPLIT_K,
        generation: this.splitGeneration + 1,
      });
      child.trail = this.trail;
      child.launch(Math.cos(a) * sp * 1.02, Math.sin(a) * sp * 1.02);
      child.hasHit = false;
      child.abilityUsed = true;
      // Fan the children's tumbles apart so three medallions never read as one wide one.
      child._phase = this._phase + dA * 2.4;
    }

    // The parent shrinks to match — visually obvious that one became three.
    this.mesh.scale.setScalar(0.68);
    this.body.setLinvel({ x: Math.cos(ang) * sp * 1.02, y: Math.sin(ang) * sp * 1.02, z: 0 }, true);
    return true;
  }

  /**
   * Phase-rate multiplier at `phi`: fast through edge-on, slow across the struck face.
   *
   * `nz` is the face normal's Z after rotating +Z about SPIN_AXIS by `phi` — the closed form
   * of Rodrigues for this case, since a x n has no Z component: nz = a_z^2 + (1-a_z^2)cos(phi).
   * |nz| is 1 face-on and 0 edge-on, so `1 - |nz|` is exactly "how edge-on am I", and RATE_NORM
   * divides the mean back out. One cos, no allocation: this runs in the fixed step for up to
   * three live medallions.
   */
  rateAt(phi) {
    const nz = SPIN_AZ2 + (1 - SPIN_AZ2) * Math.cos(phi);
    return (1 + SPIN_WHIP * (1 - Math.abs(nz))) / RATE_NORM;
  }

  /**
   * PICK THE MARK BY THE SIZE THE MARK IS ABOUT TO BE DRAWN AT.
   *
   * This is the round-2 lesson turned into code: the thing that decides which artwork is
   * legible is the projected diameter in CSS pixels, and NOTHING ELSE — not the level, not the
   * viewport, not whether the coin is in the pouch or in the air. r1 reasoned about the mark at
   * 26 px because that is what a desktop capture showed and shipped it at 8.5.
   *
   * The projection is the plain perspective one: the viewport spans
   * `2*tan(fov/2)*dist` world units at the object's depth, so `cssH / that` is px per world
   * unit there. It agrees with `ball-r2.mjs`'s independent measurement (which projects a real
   * world segment through the camera matrix) to better than 2 % — checked, because an LOD that
   * silently disagrees with the tool measuring it is worse than no LOD.
   *
   * Runs in the FIXED step, so the swap is deterministic and a filmstrip replays it frame for
   * frame. No allocation: one scratch vector, one tan, one divide.
   */
  pickFaceLod() {
    const plates = this._plates;
    if (!plates) return;
    const { faceMats: fm } = materials();
    if (faceVariant !== 'auto') {
      const want = fm[faceVariant];
      if (plates[0].material !== want) { plates[0].material = want; plates[1].material = want; }
      this.faceLod = faceVariant;
      return;
    }
    const cam = world.camera, rend = world.renderer;
    if (!cam || !rend) return;
    this.mesh.getWorldPosition(_pWorld);
    const dist = _pWorld.distanceTo(cam.position);
    const cssH = rend.domElement.clientHeight || 1;
    const pxPerWorld = cssH / (2 * Math.tan((cam.fov * Math.PI / 180) / 2) * Math.max(0.01, dist));
    const scale = this.mesh.scale.x * this.spin.scale.x;
    this.faceCssPx = 2 * R * scale * pxPerWorld;
    // Hysteresis, so a coin drifting across the threshold cannot strobe between two marks.
    const want = this.faceLod === 'detail'
      ? (this.faceCssPx < DETAIL_OFF_PX ? 'flight' : 'detail')
      : (this.faceCssPx >= DETAIL_ON_PX ? 'detail' : 'flight');
    if (want !== this.faceLod) {
      this.faceLod = want;
      plates[0].material = fm[want];
      plates[1].material = fm[want];
    }
  }

  /**
   * Runs inside the FIXED step (Entity's contract), so `dt` is always 1/120 and a filmstrip
   * replays the tumble frame for frame. Nothing here reads the wall clock and nothing here
   * touches the rigid body.
   */
  update(dt) {
    super.update(dt);
    if (this.dead || !this.spin || !this.body) return;

    this.pickFaceLod();

    const v = this.body.linvel();
    const sp = Math.hypot(v.x, v.y);

    if (!this.launched) {
      // Sitting in the pouch: face the player, dead still. This is the frame that is on screen
      // for the whole of the aim, so it is the one that has to be the logo — and parking the
      // tumble at phase 0 is also what keeps AD a function of the aim angle alone, which is
      // the only reason the AD budget in the header is a fixed number and not a distribution.
      this._phase = 0; this._omega = 0; this._upright = 0;
    } else if (!this.hasHit) {
      this._omega = Math.min(SPIN_MAX, Math.max(SPIN_MIN, sp * SPIN_K));
      this._phase += this._omega * this.rateAt(this._phase) * dt;
    } else {
      this._omega *= SPIN_DECAY;
      this._phase += this._omega * this.rateAt(this._phase) * dt;
    }

    this.spin.quaternion.setFromAxisAngle(SPIN_AXIS, this._phase);

    /**
     * COME TO REST FACE-UP. Once the medallion has hit and slowed to a crawl, ease the whole
     * mark back to upright against the body's own tumbled rotation, so what is lying in the
     * rubble is a readable IFM logo rather than a coin frozen on its edge. Eased, never
     * snapped, and driven off speed rather than a timer so it can never fight a body that is
     * still moving. It is pure presentation: the collider is a ball, so this changes nothing.
     */
    if (this.hasHit) {
      const want = sp < 2.2 ? 1 : 0;
      this._upright += (want - this._upright) * Math.min(1, dt * 3.2);
      if (this._upright > 0.002) {
        // mesh world rotation is the body's, quatZ(zAng). The upright pose is therefore the
        // local rotation that cancels it exactly: spin = quatZ(-zAng), which is face-on with
        // the tumble unwound to a whole number of turns.
        const r = this.body.rotation();
        const zAng = Math.atan2(2 * (r.w * r.z), 1 - 2 * r.z * r.z);
        _qTarget.setFromAxisAngle(_AXIS_Z, -zAng);
        this.spin.quaternion.slerp(_qTarget, this._upright);
      }
    }
  }
}

/**
 * Ammo registry. Level JSON refers to types by id.
 *
 * `sip` is kept as an alias on purpose: three shipped levels, four probe fixtures and an
 * unknown number of scenarios name it, and a mesh swap is not a reason to break every one of
 * them. Both ids build the same medallion.
 */
export const AMMO_TYPES = { ifm: IfmMedallion, sip: IfmMedallion };
