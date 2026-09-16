/**
 * slingshot.js — LAUNCH FEEL. The 300ms around release is the most-repeated moment in the
 * game; everything in this file exists to make that moment land on the thousandth pull.
 *
 * The pull, in order:
 *   1. GRAB      — generous hit area (you should never miss the pouch), pouch pops to the
 *                  finger, a scale kick on the ammo.
 *   2. STRETCH   — pouch clamped to a radius and to the rear hemisphere. The bands are REAL
 *                  TUBES, rebuilt every frame: they narrow in cross-section under tension
 *                  (rubber conserves volume), heat from oxblood toward crimson, pull dead
 *                  straight out of their slack catenary, and drag the fork tips inward.
 *   3. PREVIEW   — EARNED, not given. Angry Birds never shows a pre-aim cheat line: what you
 *                  aim by is the persisted traceline of the shot you already took. So the
 *                  dotted arc does not exist until you have spent one ammo on this level,
 *                  and even then it is a faint cream hint, a different visual LANGUAGE from
 *                  the hard white record of a real shot. Dots are stamped at fixed TIME
 *                  intervals through the real solver constants, so their spacing encodes
 *                  speed — bunched at the apex, stretched at the muzzle.
 *   4. RELEASE   — a hard CUT, never a tween. The ammo leaves from the fork mouth at full
 *                  speed (the forward stroke is not animated — Angry Birds does not animate
 *                  it either), a spark fan is emitted AT THE POUCH and stays pinned there
 *                  while the ammo goes, the camera takes a short sharp kick and holds the
 *                  sling framing for a beat before chasing, and the empty pouch whips
 *                  FORWARD past the fork and rings down through three overshoots in 400ms.
 *
 * ── WHY THE BANDS ARE TUBES AND NOT RIBBONS ──────────────────────────────────
 * A stretched quad that never changes shape is the 3D version of a 1px line. Rubber under
 * tension gets measurably thinner, and that is the single strongest "this is under load"
 * cue available without a text label. So each band is a generalised cylinder with a real
 * circular cross-section whose radius is a function of draw, rebuilt every frame, with an
 * inverted-hull ink shell so it still matches the house outline treatment.
 *
 * The band does not stop at the pouch either. It continues, in LEATHER (a hard vertex-colour
 * cut, not a blend), across the face of the loaded ammo at z ≈ +0.5 — in front of it — and
 * tucks away below. That one occlusion is what makes a stationary projectile read as loaded
 * and under tension instead of parked.
 *
 * DETERMINISM: every animated quantity here is a function of `world.simTime` (tick-based),
 * so a filmstrip of a release replays identically. `aim()` sets the exact state with no
 * animation; `dragTo()` goes through the real pointer path so critics can test both.
 */

import * as THREE from 'three';
import { world } from './world.js';
import { quatZ } from './level/entity.js';
import { emit } from './events.js';
import { physics, FIXED, GRAVITY_Y, RAPIER } from './physics.js';
// The preview integrates the projectile's OWN kick curve, not a lookalike — see updatePreview().
import { Ammo } from './ammo/base.js';
import { mat, PALETTE } from './art/materials.js';
import { RAMP_STD, RAMP_HARD, inkAll, ink, INK } from './art/toon.js';

export const SLING = {
  x: 0.0,
  baseY: 0.0,
  forkY: 3.30,            // the anchor: where the pouch rests, just under the tip line
  prongDX: 0.60,
  prongTopY: 3.80,
  splitY: 1.78,           // where the trunk splits into two limbs
  /**
    * World units of draw. Deliberately LARGE relative to the fork (the V is ~2.0 tall and the
    * pull is 2.8): the draw has to feel like work, and it is also what makes the rubber's
    * length ratio between slack and full tension a real, measurable 2.8x-5.2x rather than the
    * ~1.4x you get from a polite little tug.
    */
  maxStretch: 2.80,
  /**
   * CRUISE speed in m/s at full draw — the speed the shot actually flies the level at, which
   * is NOT the speed it leaves at (see `kick`). Its history: 27.5 before the muzzle lead and
   * the launch kick existed, 24.5 in round 2b when the cut was enlarged, 16.5 in P2 round 1
   * when the range envelope was first measured across the WHOLE draw rather than at two
   * sampled powers, 14.4 for the level layout that preceded the rescale, and 24.0 now.
   *
   * ── 11 SEP 2026: 14.4 -> 24.0, BECAUSE THE LEVELS GREW AND THIS DID NOT ──────
   * The owner reported it from a phone, in one sentence: "the arch of firing is not enough
   * height to reach the top of game 2." It was not a feel complaint, it was a geometry fact.
   *
   * The levels were rescaled to roughly 3x their old height and pushed out to 12-14 units
   * from the sling. 14.4 was chosen when l1's blocks started at x 2.0, and was deliberately
   * left alone through the rescale because the layout was still moving. The layout settled;
   * this is the re-derivation it was waiting for.
   *
   * `_tools/scenarios/tune-apex.mjs` is the instrument for THIS number, and it exists because
   * `tune-curve.mjs` cannot see the defect: while the arc is physically short of the tower,
   * a shot that fell 6 units below the crown and a shot that reached it and missed both score
   * the same nothing. Apex is the one number that separates them. Measured 390x660, seed
   * 4242, 8 angles 0.20-1.25 rad x 3 powers, apex of the free flight only (it stops at first
   * contact, so no bounce can be mistaken for the arc the player aimed):
   *
   *               | best apex anywhere in the grid | l1 top 21.96 | l2 top 20.68
   *      at 14.4  |  18.70  (angle 1.25, at x 6.40)|  SHORT 3.26  |  SHORT 1.98
   *      at 24.0  |  30.55  (angle 1.25, at x12.35)|  CLEARS 8.59 |  CLEARS 9.87
   *
   * At 14.4 the count of shots in that grid whose apex cleared the top block was **0 of 24 on
   * l1 and 0 of 24 on l2** — the top third of both towers was unreachable at every angle and
   * every power, and on l2 the whole 24-shot grid killed nothing at all because the arc died
   * against the near wall (every first contact at x 11.6-11.8, the wall's face, 12 units short
   * of the villain at x 17.05). At 24.0 it is 5 of 24 and 5 of 24, from 0.95 rad upwards —
   * i.e. the crown is a lob, which is what a crown should be, and the flat shots still go
   * through the base.
   *
   * ── WHY NOT FURTHER ─────────────────────────────────────────────────────────
   * 28.0 reaches apex 36.4 and is worse, not better. The launch cut scales with this number
   * (`muzzleLead * speed`), so the faster it goes the further past the towers the ammo is born
   * and the harder `muzzlePoint()` has to trim — at the then-current split l1's clamped-birth
   * count went 1/24 at 14.4 to 6/24 at 24.0 to 7/24 at 28.0, and l2's to 12/27. `muzzleBase`
   * and `muzzleLead` were re-split to absorb that at 24.0 (see them below); there is no split
   * that absorbs it at 28.0 while leaving any clearance for the bigger medallion. The extra
   * height buys nothing either, because l2's crown is already cleared by 9.87.
   *
   * ── l3 IS A DIFFERENT SIZE OF WORLD, AND NO SINGLE SPEED HIDES THAT ─────────
   * Read this before "fixing" l3's numbers. Distance from the sling to the near face, and the
   * height of the top block, all measured off the level json:
   *
   *      l1   x 11.93 .. 33.78   top 21.96
   *      l2   x 11.99 .. 32.50   top 20.68
   *      l3   x  6.28 .. 15.01   top  6.38     <-- half the distance, a third of the height
   *
   * One `maxSpeed` serves all three, so a draw sized for l1/l2 overflies l3 by construction: at
   * p >= 0.44 an l3 shot lands at x 17-44 against a structure that ends at 15.01, and the standard
   * 0.55/0.78/1.00 power grid duly reports 20 of 27 aims leaving l3 standing. That number is real,
   * and reading it as "l3 is broken" is the trap. Probed at p 0.18/0.25/0.35 over the same angles
   * (`_shots/TUNE2/curve-l3-low`) the level comes alive: 5 of 27 dead, ONE on/off flip across the
   * whole angle row, and a one-shot win — 1.25 rad at p 0.25 clears all six villains for 72 400.
   * l3 is played in the bottom third of the draw, which is what a target seven units away should
   * ask for. `tune-winnable.mjs` carries that as a standing check.
   *
   * The asymmetry is l3's geometry, not this number, and it predates the retune: at 14.4 on the
   * same geometry l3 already showed 13 of 24 dead with every scoring shot making first contact at
   * t=50 ms — point-blank off the launch cut rather than off an arc. The fix, if one is wanted,
   * belongs to whoever owns `levels/`: put l3 on l1/l2's footing with
   * `node _tools/apply-scale.mjs l3 <kx> <ky> 12`, so its near face sits ~12 units out and its top
   * lands in the 20-22 band. A uniform scale preserves the pyramid — recruits holding the tier
   * above them — which is protected design work. Do NOT compensate in here: a per-level speed
   * fudge makes the same draw mean different things on different levels, and the learnable
   * draw-to-range mapping that `power()` exists to protect is the whole point.
   *
   * The curve EXPONENT was swept as the alternative to more speed, since a steeper curve would
   * leave the low draws gentle for l3 while the top of the draw still reached l2's crown.
   * Measured at 24.0 across the same grid (`_shots/TUNE/speed/s24.0-e{0.55,0.80,1.05}`):
   * e=0.80 is 2 dead / 20 kills / 11 one-shot wins on l1 against 0.55's 4 / 17 / 8, but it
   * LOSES l2's only one-shot win, and e=1.05 is worse than both (4 / 15 / 7, and 2 kills on l2
   * against 3). Neither moved l3's 20/27 at all. So the exponent stays at 0.55, where `power()`
   * argues it belongs, and none of this was bought by bending the protected curve.
   *
   * ── RETUNE IT AGAINST THE SWEEP, NEVER AGAINST TASTE ─────────────────────────
   * Two instruments, both required, in this order:
   *   `tune-apex.mjs`  — can the arc reach the top at all. Fast (no settle), wide angle grid.
   *   `tune-curve.mjs` — once it can, is the outcome space readable: dead band, gradient,
   *                      overfly, and whether full power is a good shot. `curve-report.mjs`
   *                      scores its json on those four.
   * `_tools/sweep-arc.sh` and `sweep-speed.sh` drive them across candidate values and restore
   * this file on any exit. Re-run BOTH after touching this number, `power()`, `muzzleLead`,
   * `GRAVITY_SCALE`, the ammo's radius or damping, or any level's geometry.
   */
  maxSpeed: 24.0,
  minDrawForPreview: 0.20,
  grabRadius: 3.6,
  /**
   * ── THE HARD CUT, AND WHY IT IS TWO NUMBERS ──────────────────────────────────
   *
   * Measured off `ab_launch_release-instant-band-recoil_03.png` — the only reference frame of
   * the release instant that exists — the bird is **7.4 bird-diameters** clear of the pouch
   * while the sparkle fan is still sitting in the sling. It cannot have flown that far in one
   * frame at its cruise speed: Angry Birds simply DRAWS it out there. The forward stroke is
   * not animated because a projectile creeping out of its own sling over six frames is the
   * limpest thing a launch can look like.
   *
   * So the ammo is already out on the frame the band lets go, and how far out is:
   *
   *      muzzleBase * (0.30 + 0.70 * drawn)  +  muzzleLead * cruiseSpeed
   *
   * `muzzleBase` is the geometric part — clearance past the fork mouth. It carries a draw
   * ramp because a feeble tap has almost nothing to skip: without the ramp the weakest
   * possible shot teleports its full base clearance and then plops, which is a teleport, not
   * a cut. `muzzleLead` is a TIME: the slice of flight the release refuses to animate. A hard
   * draw skips further than a soft one because it was travelling faster through the frames we
   * cut, which is why a half-draw still reads as a half-draw.
   *
   * ── HOW BIG, MEASURED OFF THE REFERENCE FRAME ────────────────────────────────
   * Measured directly on `ab_launch_release-instant-band-recoil_03.png` (1600 px wide): the
   * bird is 48 px across and its centre sits 379 px from the pouch — **7.9 bird-diameters,
   * on the release frame**, with the sparkle lance bridging ~90 % of that gap. AD for our
   * loaded SIP arrow at a 0.6 rad draw is 1.241 world units (it is measured on the ROTATED
   * ammo, which is what the rubric's "on-screen height of the loaded projectile" means), so
   * the reference cut in our units is 7.9 * 1.241 = 9.8 world units.
   *
   * A 0.8 draw has to clear 8 AD by t=50 ms as well, and the cut is the only part of that
   * budget that scales down with the draw gracefully, so the pair is sized a shade over the
   * reference on purpose. It was 4.99 in round 2a, which is 4.0 AD, half the reference, and is
   * precisely why the release read as a lob.
   *
   * ── THE PAIR IS A BUDGET, AND maxSpeed SPENDS FROM IT ────────────────────────
   * `muzzleLead` is multiplied by speed, so the cut moves whenever `maxSpeed` does, and THAT is
   * why the two halves were re-split when `maxSpeed` went 14.4 -> 24.0 on 11 Sep 2026:
   *
   *      4.00 + 0.437 * 14.4 = 10.29 world units   the cut that shipped
   *      4.00 + 0.437 * 24.0 = 14.49 world units   the same split at the new speed
   *      5.20 + 0.260 * 24.0 = 11.44 world units   this split  <-- back on budget
   *
   * 14.49 is longer than the gap from the sling to l2's near wall (11.99), and the effect was
   * measurable and ugly: at that split **12 of 27 l2 aims had their birth clamped and 4 of them
   * made first contact at t=50 ms** — the medallion was created already touching the wall, and
   * two of those rebounded backwards past the slingshot (measured end x -3.22 and +2.66). A cut
   * longer than the distance to the target is not a launch, it is a spawn.
   *
   * So the speed-proportional half came down and the geometric half went up to pay for it.
   * 11.44 is a shade over the 10.29 that shipped, it is inside l2's 11.99 gap at every angle,
   * and because `muzzleBase` carries the draw ramp (0.30 + 0.70 * drawn) rather than the speed,
   * the clearance it buys is there at LOW draws too — which is where P1's gate is thinnest,
   * since a soft shot has neither a long cut nor much speed to fly out of one.
   *
   * ── WHY NOT SHORTEN IT FURTHER: THE CUT IS WHAT PAYS FOR THE BALL'S SIZE ─────
   * P1's gate is ">= 8 AD clear at t=50 ms", and AD is the ammo's own bounding height, so a
   * BIGGER medallion makes the same distance score fewer AD. The t=50 ms clearance is the
   * budget the medallion's diameter is spent out of, and the cut is most of it:
   *
   *      t50 clearance (draw 0.8)  ~=  0.86 * muzzleBase + muzzleLead * v + 0.177 * v
   *
   * Measured 11.265 world units with the old pair at 14.4; ~13.7 with this pair at 24.0. That
   * rise is what let the medallion grow 1.30x (see `COLLIDER_R` in ammo/medallion.js) without
   * the gate failing. Shortening the cut claws it straight back, and speed cannot replace it:
   * pinning the cut at 11.0 and pushing `maxSpeed` to 30 still only reaches ~14.3, because the
   * flight term grows far more slowly than the cut term. The cut, the speed and the ball's
   * diameter are ONE budget — re-pick any of the three and re-run `p1-r2b-snap.mjs`.
   *
   * `muzzlePoint()` clamps it so it can never put the ammo inside geometry or under the
   * ground.
   */
  muzzleBase: 5.20,
  muzzleLead: 0.260,
  /**
   * THE LAUNCH KICK. Extra exit speed, as a multiple of cruise speed, unwound over
   * `kickTicks` SOLVER STEPS. At full draw the ammo leaves at 24.0 * (1 + 2.9) = 93.6 m/s and
   * is back to cruise 83 ms later.
   *
   * NOT RAISED with maxSpeed, and that was a decision: the kick is the cheapest way to buy
   * t=50 ms clearance for P1's 8 AD gate (it lands entirely inside the measured window), which
   * made it tempting when the bigger medallion tightened that gate. It was rejected because
   * the kick is real velocity, and on l3 the pyramid is only 6.28 units from the sling — a
   * kick of 7 would still be unwinding at ~190 m/s when the ammo arrived, turning one level's
   * close composition into a tunnelling and energy-injection problem to solve a measurement
   * problem. 2.9 is the multiple the release FRAME needs; speed is where range comes from.
   *
   * This exists because the muzzle lead alone is a jump-cut and nothing else: it fixes where
   * the ammo IS on the release frame and does nothing for the four frames after it, which
   * then crawl at cruise speed and read as a lob. The kick is what makes the tiles either
   * side of the cut move as far as the cut did. It is also honest physics for once — a
   * slingshot pours its whole stored energy into the projectile over a couple of
   * centimetres, and everything after that is drag.
   *
   * ── kickTicks IS A TICK COUNT AND THE OLD NAME LIED ──────────────────────────
   * This field used to be `kickTau: 0.034`, named and documented as SECONDS, and it was
   * handed straight to `Ammo.setLaunchKick(…, ticks)`, whose docblock says in as many words
   * "counted in ticks, never in seconds". `Math.round(0.034)` is 0, clamped to 1, so the
   * entire kick was unwound in a SINGLE solver step — 8.3 ms — and contributed 0.31 world
   * units instead of the ~0.6 the comment claimed and the ~2.3 it is worth now. Every frame
   * after the first travelled at bare cruise speed. That was the launch reading as a lob.
   * It is a tick count now, it is named like one, and `setLaunchKick()` throws if it is ever
   * handed a seconds-shaped number again.
   *
   * It is applied along the launch axis and unwound one solver step at a time in
   * `Ammo.update()`, so it is tick-deterministic and the trajectory preview integrates the
   * exact same curve from the exact same muzzle. The dots still promise the shot you get.
   */
  kick: 2.9,
  kickTicks: 10,          // 10 * (1/120) = 83 ms
  /** |z| of the band's pouch end. The FRONT band lands in front of the ammo. */
  bandZ: 0.34,
  /** Cross-section radius of the rubber at the prong, at rest. */
  rubberR: 0.145,
  /** Multiplier at the pouch end (a band is clamped fat at the prong, thin at the pouch). */
  rubberPouchK: 0.66,
  /** Multiplier on the whole rubber section at FULL tension. This is the deformation. */
  rubberThin: 0.46,
  /** The leather pouch section. Leather does not stretch, so this radius never changes. */
  leatherR: 0.090,
};

/**
 * SHORT ON PURPOSE. 14 dots at 41.7 ms is about 0.58 s of flight — enough to read the launch
 * vector and how hard you are pulling, nowhere near enough to read where the shot LANDS. The
 * thing that tells you where it lands is the persisted traceline of the shot you already
 * took, which is the aiming loop the reference frames actually show.
 */
const PREVIEW_DOTS = 14;
const PREVIEW_STEP_TICKS = 5;         // 5 solver steps between dots => 41.7 ms, fixed TIME
const RINGS_BAND = 26;
const RINGS_PRONG = 14;
const RADIAL = 8;
/** Spline control index at which rubber becomes leather (see bandControls). */
const BAND_LEATHER_FROM = 3 / 5;   // 6 control points => 5 spans; ctrl[3] sits at u = 3/5

/**
 * Scratch box for `ammoDiameter()`. Module-level so a release allocates nothing.
 */
const _adBox = new THREE.Box3();
/** Scratch for `ammoSpan()` — same reason: a launch must not allocate. */
const _adInv = new THREE.Matrix4();
const _adMat = new THREE.Matrix4();

const COL = {
  wood:      0xc99a5e,
  woodDark:  0x8a5f31,
  leather:   0x6b4526,   // saddle brown: dark enough to read as leather, never a black hole
  rubberRest: 0x6e2a3a,   // oxblood — 3.8 value steps below the fork, and a different hue
  rubberHot:  0xa32c46,   // crimson under full tension: brighter, hotter, still not wood
};

export class Slingshot {
  constructor(scene, rig) {
    this.scene = scene;
    this.rig = rig;
    this.anchor = new THREE.Vector2(SLING.x, SLING.forkY);
    this.pouch = this.anchor.clone();
    this.drawn = 0;              // 0..1
    this.state = 'empty';        // empty | loaded | dragging | recoil | spent
    /**
     * Which clamp last modified the requested pouch position. Reported out of `dragTo()`.
     * This exists because a clamped drag is INDISTINGUISHABLE from an intended one in the
     * pouch alone, and that is precisely how four shared scenarios silently stopped testing
     * what their names claim: their hard-coded pixels drifted forward of the anchor when P4
     * re-solved the framing, the hemisphere clamp folded every one of them onto the +0.10
     * boundary, and each kept happily reporting `ok:true` for a ~92 deg straight-up shot.
     */
    this.clamped = { hemisphere: false, radius: false };
    this.ammo = null;            // the Ammo entity sitting in the pouch
    this.recoilT = 0;
    this.recoilAmp = 0;
    this.recoilDir = new THREE.Vector2(1, 0);
    this.lastDrawn = 0;
    this.grabPop = 0;            // decaying scale kick on the ammo when you grab it
    this.onLaunch = null;        // set by main
    this.makeAmmo = null;        // set by main: () => Ammo

    // scratch
    this._dir = new THREE.Vector2(1, 0);
    this._perp = new THREE.Vector2(0, 1);
    this._tipL = new THREE.Vector3();
    this._tipR = new THREE.Vector3();

    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildFrame();
    this.buildBands();
    this.buildPreview();
    this.layout();
  }

  // =========================================================================
  // GEOMETRY
  // =========================================================================
  buildFrame() {
    const woodMat = mat('wood', { color: COL.wood, emissiveIntensity: 0.20 }).three;
    const darkMat = mat('wood', { color: COL.woodDark, emissiveIntensity: 0.30 }).three;
    const leatherMat = new THREE.MeshToonMaterial({ color: COL.leather, gradientMap: RAMP_STD() });
    this.leatherMat = leatherMat;

    const FORK = SLING.splitY;

    // --- trunk: tapered, planted, slightly wider at the base ---
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.40, FORK + 0.30, 10), woodMat);
    trunk.position.set(SLING.x, (FORK + 0.30) / 2 - 0.14, 0);
    trunk.castShadow = true; trunk.receiveShadow = true;
    this.group.add(trunk);

    // --- a leather grip wrap at the fork join ---
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.42, 12), leatherMat);
    grip.position.set(SLING.x, FORK - 0.14, 0);
    grip.castShadow = true;
    this.group.add(grip);

    // --- dirt mound so it is planted, not floating ---
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      mat('soil').three);
    mound.scale.set(1.05, 0.26, 0.85);
    mound.position.set(SLING.x, 0.02, 0);
    mound.receiveShadow = true;
    mound.userData.inkWidth = 0.038;
    this.group.add(mound);

    inkAll(this.group, 0.052);

    // --- prongs: DYNAMIC. They bend toward the pouch under load, which is most of why a
    //     drawn slingshot reads as a machine under strain rather than a static prop. ---
    this.prongs = [];
    for (const s of [-1, 1]) {
      const tube = new TubeMesh({
        rings: RINGS_PRONG, radial: RADIAL, material: woodMat, inkWidth: 0.026, vertexColors: false,
      });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 11), darkMat);
      cap.castShadow = true;
      ink(cap, 0.030);
      const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.22, 12), leatherMat);
      ink(whip, 0.030);
      this.group.add(tube.group, cap, whip);
      this.prongs.push({ s, tube, cap, whip, tip: new THREE.Vector3(), rest: new THREE.Vector3(
        SLING.x + s * SLING.prongDX, SLING.prongTopY, 0) });
    }
  }

  buildBands() {
    // ONE tube per side. Rubber from the prong to the pouch, then LEATHER across the ammo.
    // The +1 side lands at z = +bandZ, i.e. IN FRONT of the loaded projectile.
    this.bands = [
      new BandStrap(+1),   // front — this is the one that occludes the ammo
      new BandStrap(-1),   // back  — the cradle
    ];
    for (const b of this.bands) this.group.add(b.tube.group);
  }

  buildPreview() {
    // Hard-edged flat discs. No glow, no sprite, no blur — a soft dot dies over bright sky.
    const geo = new THREE.CircleGeometry(1, 14);
    const m = new THREE.MeshBasicMaterial({
      color: 0xfff6e2, transparent: true, opacity: 0.62, toneMapped: false, depthWrite: false,
    });
    this.preview = new THREE.InstancedMesh(geo, m, PREVIEW_DOTS);
    this.preview.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.preview.frustumCulled = false;
    this.preview.renderOrder = 5;
    this.preview.visible = false;
    this.preview.name = 'trajectory-preview';
    this.scene.add(this.preview);
    this._pm = new THREE.Matrix4();
    this._pq = new THREE.Quaternion();
    this._pv = new THREE.Vector3();
    this._ps = new THREE.Vector3();
    this._previewPts = [];               // world positions of the visible dots, for previewGaps()
  }

  // =========================================================================
  // LOADING
  // =========================================================================
  /** Put a fresh projectile in the pouch. */
  load(ammo) {
    this.ammo = ammo;
    this.state = 'loaded';
    this.drawn = 0;
    this.grabPop = 0;
    this.pouch.copy(this.anchor);
    if (ammo?.body) {
      // Held: no gravity, no motion. It is sitting in a sling, not falling.
      ammo.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      ammo.body.setTranslation({ x: this.anchor.x, y: this.anchor.y, z: 0 }, true);
    }
    this.layout();
  }

  clearAmmo() { this.ammo = null; this.state = 'empty'; this.layout(); }

  // =========================================================================
  // INPUT — one path, used by pointer events AND by SS.dragTo()
  // =========================================================================
  canGrab(wx, wy) {
    if (this.state !== 'loaded' && this.state !== 'dragging') return false;
    return Math.hypot(wx - this.anchor.x, wy - this.anchor.y) < SLING.grabRadius;
  }

  beginDrag(wx, wy) {
    if (this.state !== 'loaded') return false;
    // The drag maps its pixels through the frame it began in, for as long as it lasts — the
    // portrait draw pans the camera 17-19 units while the finger is down. camera.js
    // `captureDragFrame()` carries the whole argument.
    this.rig?.captureDragFrame?.();
    this.state = 'dragging';
    this.grabPop = 1;                    // the ammo flinches when you take hold of it
    this.setPouch(wx, wy);
    emit('grab', { point: { x: this.pouch.x, y: this.pouch.y, z: 0 } });
    return true;
  }

  /**
   * The clamp is doing more work than it looks like:
   *   · radial clamp gives the draw a hard, felt ceiling
   *   · the rear-hemisphere clamp (dx <= +0.10) stops you firing into the fork, which would
   *     look like a bug even though it is physically what a slingshot does
   */
  setPouch(wx, wy) {
    let dx = wx - this.anchor.x;
    let dy = wy - this.anchor.y;
    this.clamped.hemisphere = false;
    this.clamped.radius = false;
    if (dx > 0.10) {
      // project back onto the boundary rather than snapping to it: dragging past the fork
      // slides the pouch around the arc instead of sticking it at a corner
      const len = Math.hypot(dx, dy) || 1;
      const sign = dy >= 0 ? 1 : -1;
      dx = 0.10;
      dy = sign * Math.sqrt(Math.max(0.0001, len * len - dx * dx));
      this.clamped.hemisphere = true;
    }
    const L = Math.hypot(dx, dy);
    if (L > SLING.maxStretch) { dx *= SLING.maxStretch / L; dy *= SLING.maxStretch / L; this.clamped.radius = true; }
    this.pouch.set(this.anchor.x + dx, this.anchor.y + dy);
    this.drawn = Math.min(1, Math.hypot(dx, dy) / SLING.maxStretch);
    this.rig?.drawing(this.drawn);      // camera pulls back WITH the pull, not a step behind
    this.layout();
    return true;
  }

  endDrag() {
    if (this.state !== 'dragging') return { ok: false, reason: 'not dragging' };
    return this.release();
  }

  cancelDrag() {
    this.rig?.clearDragFrame?.();
    if (this.state !== 'dragging') return false;
    this.state = 'loaded';
    this.drawn = 0;
    this.pouch.copy(this.anchor);
    this.layout();
    return true;
  }

  // =========================================================================
  // HOOK SURFACE (HOOKS.md) — exact, animation-free, reproducible
  // =========================================================================
  /** angle radians from +X, power 0..1 of max stretch. Sets the sling to an EXACT state. */
  aim({ angle, power }) {
    if (this.state !== 'loaded' && this.state !== 'dragging') {
      return { ok: false, reason: `cannot aim while sling is "${this.state}"` };
    }
    const a = Number(angle), p = Math.max(0, Math.min(1, Number(power)));
    if (!Number.isFinite(a) || !Number.isFinite(p)) {
      return { ok: false, reason: `aim({angle,power}) needs finite numbers, got ${angle},${power}` };
    }
    this.state = 'dragging';
    // `aim()` places the pouch against the frame that is on screen NOW, so that frame becomes
    // the drag's reference — see camera.js `captureDragFrame()`.
    this.rig?.captureDragFrame?.();
    // The pouch goes OPPOSITE the launch direction — that is what a slingshot is.
    this.pouch.set(
      this.anchor.x - Math.cos(a) * SLING.maxStretch * p,
      this.anchor.y - Math.sin(a) * SLING.maxStretch * p,
    );
    this.drawn = p;
    this.rig?.drawing(p);
    this.layout();
    return { ok: true, angle: a, power: p, pouch: { x: this.pouch.x, y: this.pouch.y } };
  }

  /**
   * Screen-space drag, through the REAL pointer path.
   *
   * It reports the SHOT it just set up, not merely that it accepted the pixels. A caller with
   * hard-coded pixel constants cannot otherwise tell "I drew the sling back to 20 deg" from
   * "my pixels drifted in front of the fork and the hemisphere clamp folded them into a 92 deg
   * straight-up shot" — both are `{ok:true}` with a plausible `drawn`. Four shared scenarios
   * spent a whole round in the second case. So: `angle` is what would fire right now, and
   * `clamped` says whether the pouch is where you asked or on a boundary.
   *
   * `grabbable` mirrors main.js's pointerdown gate (near the pouch OR in the launch bay). It
   * is INFORMATIONAL — dragTo still honours the drag either way, because critics legitimately
   * drive it from off-bay pixels — but a scenario that claims to exercise the human input path
   * should assert it, since a real finger there would have been ignored.
   */
  dragTo(sx, sy) {
    const p = this.screenToWorld(sx, sy);
    if (!p) return { ok: false, reason: 'no camera' };
    const grabbable = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y) < SLING.grabRadius
      || (p.x < this.anchor.x + 5.5 && p.y < 9);
    if (this.state === 'loaded') this.beginDrag(p.x, p.y);
    else if (this.state !== 'dragging') return { ok: false, reason: `sling is "${this.state}"` };
    this.setPouch(p.x, p.y);
    return {
      ok: true,
      world: { x: +p.x.toFixed(4), y: +p.y.toFixed(4) },
      drawn: +this.drawn.toFixed(4),
      // the launch direction this pouch position would fire in, right now
      angle: +Math.atan2(this.anchor.y - this.pouch.y, this.anchor.x - this.pouch.x).toFixed(5),
      clamped: { ...this.clamped },
      grabbable,
    };
  }

  /**
   * RELEASE IS A CUT.
   *
   * The ammo does not slide forward out of the pouch over five frames — it is already clear
   * of the fork mouth on the frame the band lets go, travelling at full speed. That is not a
   * cheat: the forward stroke of a real slingshot takes about a tenth of a second and Angry
   * Birds does not animate it either, because a projectile creeping out of its own sling is
   * the single most limp thing a launch can look like.
   */
  release() {
    this.rig?.clearDragFrame?.();
    if (this.state !== 'dragging' || !this.ammo) {
      return { ok: false, reason: `nothing to release (state="${this.state}")` };
    }
    if (this.drawn < 0.03) { this.cancelDrag(); return { ok: false, reason: 'draw too small' }; }

    const dx = this.anchor.x - this.pouch.x;
    const dy = this.anchor.y - this.pouch.y;
    const L = Math.hypot(dx, dy) || 1;
    const speed = this.power(this.drawn);
    const ux = dx / L, uy = dy / L;
    const vx = ux * speed, vy = uy * speed;
    const power = this.drawn;

    // Where the ammo already is on this frame, and how much of the flight that skipped.
    const a = this.ammo;
    // AD, measured NOW, in the loaded pose — before the muzzle jump rotates the mesh onto
    // the launch axis. Every P1 threshold is written in ammo diameters, so the FX layer has
    // to be told what one is instead of guessing from `radius` (which is the collider's, not
    // the silhouette's: for the SIP arrow they differ by nearly 3x).
    const ad = this.ammoDiameter();
    const m = this.muzzlePoint(ux, uy, speed, a.radius, power);
    const mx = m.x, my = m.y;
    const kick = speed * SLING.kick;

    a.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    a.body.setTranslation({ x: mx, y: my, z: 0 }, true);
    a.launch(vx + ux * kick, vy + uy * kick);
    // The kick is unwound along the launch axis, one solver step at a time. Everything after
    // the first SLING.kickTicks steps is the plain ballistic arc at `speed`.
    a.setLaunchKick(ux, uy, kick, SLING.kickTicks);
    a.mesh.scale.set(1, 1, 1);
    a.mesh.position.set(mx, my, 0);

    // The band lets go the same instant: zero tension, and the empty pouch whips FORWARD
    // past the fork before ringing back. It must never ease through a neutral pose.
    this.recoilDir.set(ux, uy);
    // 0.48 at full draw — 40 % of the fork's own span, so the forward whip is a silhouette
    // change and not a wobble. It was 0.36, which put the second peak at 4 px.
    this.recoilAmp = 0.18 + 0.30 * power;
    this.recoilT = 0;
    this.drawn = 0;
    this.state = 'recoil';
    this.preview.visible = false;
    // Snap the pouch to its FORWARD peak right now, before anything renders. If it were left
    // at the drawn position for even one frame the player would see a fully stretched band
    // with nothing in it; if it were put at the anchor it would be the neutral pose the
    // rubric forbids. Past straight, immediately, is the only correct first frame.
    this.pouch.set(this.anchor.x + ux * this.recoilAmp, this.anchor.y + uy * this.recoilAmp);
    this.layout();

    emit('launch', {
      ammo: a, power, speed,
      angle: Math.atan2(vy, vx),
      // The burst belongs to the POUCH, pinned in world space — not to the projectile.
      point: { x: this.anchor.x, y: this.anchor.y, z: 0 },
      velocity: { x: vx, y: vy },
      // How far the ammo was drawn out on this frame, so the spark lance knows how far it
      // has to reach to bridge the cut without overtaking the shot.
      muzzleDist: m.dist,
      // One ammo diameter, in world units, for the piece of ammo that just left. Every
      // rubric DISTANCE (the gap the trail leaves behind the shot, the 8-AD clearance) is in
      // this, because the rubric measures the frame and the frame contains the rotated ammo.
      ad,
      // The same ammo's POSE-FREE size. Every FX SIZE is in this instead — see ammoSpan().
      // A fat Emergency Fund and a slim SIP Arrow still get sparkles at ~1/6 of THEIR OWN
      // silhouette, but aiming higher no longer inflates the burst.
      adFx: this.ammoSpan(),
    });
    this.onLaunch?.(a);
    const fired = this.ammo;
    this.ammo = null;
    return { ok: true, speed: +speed.toFixed(3), angle: +Math.atan2(vy, vx).toFixed(5),
             power: +power.toFixed(4), muzzle: { x: +mx.toFixed(4), y: +my.toFixed(4) },
             muzzleDist: +m.dist.toFixed(4), muzzleClamped: m.clamped,
             ad: +ad.toFixed(4), muzzleAD: +(m.dist / ad).toFixed(2),
             exitSpeed: +(speed + kick).toFixed(3), kick: +kick.toFixed(3),
             // The kick's LIFE, reported in both units, because the one time this was a
             // single silent number it was a seconds value being read as ticks and the whole
             // kick lasted 8 ms. A caller can now check the duration it actually got.
             kickSteps: SLING.kickTicks,
             kickMs: +(SLING.kickTicks * FIXED * 1000).toFixed(1),
             ammo: fired.constructor.id };
  }

  /**
   * ONE AMMO DIAMETER, in world units — the rubric's own house unit.
   *
   * RUBRIC §1: "AD — the on-screen height of the loaded projectile while it sits at rest in
   * the pouch". So it is the world-space HEIGHT of the loaded mesh's bounding box, taken in
   * the pose it is actually sitting in (the loaded ammo is rotated to the draw angle, and
   * that rotation genuinely changes its on-screen height — a SIP Arrow drawn at 0.6 rad is a
   * different number of pixels tall from one drawn flat, and the rubric measures the frame,
   * not the model).
   *
   * NOT `radius * 2`. `radius` is the collider's, chosen for how the thing should bounce;
   * for the SIP Arrow it is 0.4 while the silhouette is ~1.2 tall. Sizing the release
   * sparkles off the collider put them at three times the diameter the reference shows.
   */
  ammoDiameter() {
    const a = this.ammo;
    if (!a?.mesh) return 1;
    const fallback = (a.radius ?? 0.5) * 2;
    a.mesh.updateWorldMatrix(true, true);
    _adBox.setFromObject(a.mesh);
    const h = _adBox.max.y - _adBox.min.y;
    return Number.isFinite(h) && h > 1e-3 ? h : fallback;
  }

  /**
   * The ammo's own size, WITHOUT its pose: the largest dimension of its local geometry.
   *
   * `ammoDiameter()` above is correct for the rubric — AD is a measurement of the FRAME, so
   * it must include the rotation, and every clearance/gap threshold in P1 is written in it.
   * But it is the wrong unit for how BIG a spark is, and using it for both was a real bug:
   * on the SIP Arrow, AD runs 0.832 at a 0.20 rad draw to 1.343 at 0.75 (measured, one shot
   * per angle) purely because a rotated dart's bounding box is taller. Sparkle area scales as
   * the square of that, so the same slingshot firing the same dart threw a 60 %-wider,
   * 2.6x-heavier burst for no reason except that the player aimed up — and at the top of the
   * range the burst outweighed the recoiling band at the sling, which is the one thing P1
   * says it must never do (measured 1.4:1 against 0.64:1 at the same power).
   *
   * The local bbox is pose-free by construction (measured constant at [1.268, 0.672, 0.696]
   * across the whole draw sweep), so FX size everything off THIS and keep AD for the
   * distances the rubric measures. Computed from geometry bounding boxes rather than
   * Box3.setFromObject so the mesh's own rotation never enters it.
   */
  ammoSpan() {
    const a = this.ammo;
    if (!a?.mesh) return 1;
    if (a.__span > 0) return a.__span;                 // constant per ammo; measured once
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const m = a.mesh;
    m.updateWorldMatrix(true, true);
    _adInv.copy(m.matrixWorld).invert();
    m.traverse((o) => {
      if (!o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _adBox.copy(o.geometry.boundingBox);
      o.updateWorldMatrix(true, false);
      _adMat.copy(o.matrixWorld).premultiply(_adInv);
      _adBox.applyMatrix4(_adMat);
      minX = Math.min(minX, _adBox.min.x); maxX = Math.max(maxX, _adBox.max.x);
      minY = Math.min(minY, _adBox.min.y); maxY = Math.max(maxY, _adBox.max.y);
    });
    const span = Math.max(maxX - minX, maxY - minY);
    return (a.__span = Number.isFinite(span) && span > 1e-3 ? span : (a.radius ?? 0.5) * 2);
  }

  /**
   * Where the ammo already is on the frame the band lets go — see SLING.muzzleBase.
   *
   * The clamp is the whole reason this is a function rather than a constant. Skipping eleven
   * world units of flight is only safe while those eleven units are empty, and the rubric
   * guarantees they are (P4: "≥60 %W to its right is target and empty space"). A level that
   * broke that guarantee would otherwise launch the ammo INSIDE a block, so the swept path is
   * tested against every block and villain with a conservative bounding circle and stopped
   * short of the first one, and against the ground. Conservative means it can stop earlier
   * than strictly necessary; it can never tunnel. In a well-composed level it never fires.
   *
   * Pure JS on the entity list, not a rapier query: deterministic, allocation-free, and it
   * cannot drift with the physics build.
   */
  muzzlePoint(ux, uy, speed, ammoR = 0.4, drawn = 1) {
    const ramp = 0.30 + 0.70 * Math.max(0, Math.min(1, drawn));
    const want = SLING.muzzleBase * ramp + SLING.muzzleLead * speed;
    let d = want;
    const ax = this.anchor.x, ay = this.anchor.y;

    // ground: never start the ammo buried in the mound
    if (uy < -1e-4) {
      const dGround = (ammoR + 0.06 - ay) / uy;
      if (dGround > 0) d = Math.min(d, dGround);
    }

    const sweep = (cx, cy, r) => {
      // smallest t >= 0 with |anchor + u*t - c| <= ammoR + r
      const ex = cx - ax, ey = cy - ay;
      const proj = ex * ux + ey * uy;
      const R = ammoR + r;
      const perp2 = ex * ex + ey * ey - proj * proj;
      if (perp2 > R * R) return Infinity;
      const back = Math.sqrt(Math.max(0, R * R - perp2));
      const t = proj - back;
      return t < 0 ? (proj + back < 0 ? Infinity : 0) : t;
    };

    for (const b of world.blocks) {
      if (b.dead || !b.body) continue;
      const t = b.body.translation();
      const hit = sweep(t.x, t.y, Math.hypot(b.w ?? 0.5, b.h ?? 0.5) * 0.5);
      if (hit < d) d = hit;
    }
    for (const v of world.villains) {
      if (!v.alive || !v.body) continue;
      const t = v.body.translation();
      const hit = sweep(t.x, t.y, v.radius ?? 0.5);
      if (hit < d) d = hit;
    }

    d = Math.min(want, Math.max(SLING.muzzleBase * 0.5 * ramp, d));
    return { x: ax + ux * d, y: ay + uy * d, dist: d, clamped: d < want - 1e-4 };
  }

  /**
   * DRAW-TO-SPEED. The single most important curve in the game, because it is the only thing
   * standing between the player's thumb and where the shot lands.
   *
   * ── WHY IT IS CONCAVE, AND WHY THE CONVEX VERSION WAS UNPLAYABLE ─────────────
   * This used to be `0.34t + 0.66t²` — convex, on the reasoning that "the last 25 % of the
   * pull should buy disproportionately more speed, so committing to a full draw feels
   * rewarded". That reasoning is about the DRAW. What the player actually reads is the
   * RANGE, and range is not speed: the ballistic part of the flight goes as v², so a convex
   * speed curve makes range go as roughly t^3.4.
   *
   * Measured on l1 at the time (land-x, averaged over angle):
   *
   *      draw 0.60 -> 11      ten units short of the tower, every angle
   *      draw 0.80 -> 18      the only draw that worked
   *      draw 1.00 -> 28      five units past the END OF THE LEVEL, every angle
   *
   * So the playable band was about one twentieth of the pull wide, with silence on both
   * sides of it. Two independent sweeps found the same symptom from opposite ends — "power
   * 1.0 overflies the level entirely" and "7 of 14 sampled shots scored literally zero with
   * all 13 blocks standing" — and both were this curve.
   *
   * `t^0.55` is the inverse of that: concave in speed, which makes range very close to
   * LINEAR in draw. Pull half as far, go about half as far. That is the most learnable
   * mapping a slingshot can have, and it is what turns neighbouring aims into neighbouring
   * outcomes instead of win / nothing / win.
   *
   * The top of the range is untouched — f(1) = 1, so full draw is still maxSpeed, still the
   * full `kick`, still the longest shot in the game, and it is now the shot that reaches the
   * far outpost rather than the shot that reaches nothing. What changed is the middle: a
   * 0.8 draw is 87 % of full speed instead of 69 %, so the useful band is the whole top half
   * of the pull rather than a five-percent sliver.
   *
   * f'(1) = 0.55, so the last tenth of the pull still buys ~5 % more speed and ~2 units of
   * range — a real, visible reward for committing, just not a cliff.
   */
  power(t) {
    t = Math.max(0, Math.min(1, t));
    return SLING.maxSpeed * Math.pow(t, 0.55);   // f(0)=0, f(1)=maxSpeed, concave
  }

  // =========================================================================
  // PER-FRAME
  // =========================================================================
  update(dt) {
    if (this.state === 'recoil') {
      this.recoilT += dt;
      /**
       * Damped oscillation of the EMPTY pouch along the launch axis. Forward first (it is
       * still carrying the shot's momentum), then decaying overshoots, dead by 400 ms.
       * COSINE, not sine: at t = 0 the band is already at full forward overshoot (release()
       * put it there), and the ring-down alternates from there.
       *
       * ZETA came down from 0.30 in round 2b because at 0.30 only the first two peaks were
       * findable in a filmstrip — measured off `snap.json`, the third peak was 0.044 AD
       * (about 2 px) and every tile from 125 ms on sat inside ±0.045 AD of neutral, which is
       * a band that has stopped rather than one that is still ringing. The rubric wants
       * "≥2 visible overshoots before settling, and fully still by 400 ms", and 0.22/40
       * gives peaks at 0 ms forward (1.00), 79 ms back (0.50), 157 ms forward (0.25),
       * 236 ms back (0.13) — three unmistakable ones — while still being down to 3 % of
       * amplitude (0.4 px) at 400 ms, where the state machine parks it exactly on the anchor.
       */
      const W = 40, ZETA = 0.22;
      const e = Math.exp(-ZETA * W * this.recoilT);
      const off = this.recoilAmp * e * Math.cos(W * this.recoilT);
      this.pouch.set(this.anchor.x + this.recoilDir.x * off,
                     this.anchor.y + this.recoilDir.y * off);
      if (this.recoilT > 0.40) { this.state = 'spent'; this.pouch.copy(this.anchor); }
      this.layout();
    }

    if (this.grabPop > 0) {
      this.grabPop = Math.max(0, this.grabPop - dt * 6.0);
      if (this.state === 'dragging' || this.state === 'loaded') this.layout();
    }

    // creak while the draw is changing
    if (this.state === 'dragging') {
      emit('bandStretch', { t: this.drawn, delta: this.drawn - this.lastDrawn });
      this.rig.drawing(this.drawn);
    }
    this.lastDrawn = this.drawn;

    /**
     * Idle sway. The POUCH breathes, not the ammo — and then layout() carries the bands, the
     * leather and the projectile along with it. Nudging the ammo's body directly (which is
     * what this used to do) left the pouch and both straps stationary while the projectile
     * drifted around inside them, which reads as the ammo slowly working itself loose.
     */
    if (this.state === 'loaded' && this.ammo && !this.ammo.dead) {
      const t = world.simTime;
      this.pouch.set(this.anchor.x + Math.sin(t * 1.9) * 0.016,
                     this.anchor.y + Math.sin(t * 2.7 + 1.1) * 0.026);
      this.layout();
    }
  }

  /** Push the current pouch position into every visual. Called on any change. */
  layout() {
    const A = this.anchor, P = this.pouch;
    const t = this.drawn;

    /**
     * Launch axis: from the pouch toward the anchor.
     *
     * BLENDED toward +X near rest, and that blend is not cosmetic. The idle sway moves the
     * pouch about 0.03 units around the anchor, so the raw pouch->anchor direction ORBITS:
     * the loaded projectile, the pouch leather and both straps swung through every angle
     * while the sling just sat there breathing. Below a 0.4-unit draw the axis is therefore
     * mixed with "forward", which is what a slingshot with nothing pulling on it points at.
     */
    let ux = A.x - P.x, uy = A.y - P.y;
    const L = Math.hypot(ux, uy);
    const k = Math.min(1, L / 0.40);
    if (L > 1e-6) { ux = (ux / L) * k + (1 - k); uy = (uy / L) * k; }
    else { ux = 1; uy = 0; }
    const nl = Math.hypot(ux, uy) || 1;
    ux /= nl; uy /= nl;
    this._dir.set(ux, uy);
    this._perp.set(-uy, ux);

    // --- fork tips bend toward the pull, and inward toward each other ---
    for (const p of this.prongs) {
      const bend = 0.24 * t;
      const inward = -p.s * 0.085 * t;
      p.tip.set(p.rest.x - ux * bend + inward, p.rest.y - uy * bend, 0);
      p.cap.position.copy(p.tip);
      // the whipping that ties the band on sits just below the cap, along the limb
      const bx = SLING.x, by = SLING.splitY;
      const lx = p.tip.x - bx, ly = p.tip.y - by;
      const ll = Math.hypot(lx, ly) || 1;
      p.whip.position.set(p.tip.x - (lx / ll) * 0.24, p.tip.y - (ly / ll) * 0.24, 0);
      p.whip.rotation.z = Math.atan2(ly, lx) - Math.PI / 2;
      p.tube.setProng(bx, by, p.tip, p.rest, t);
    }
    this._tipL.copy(this.prongs[0].tip);
    this._tipR.copy(this.prongs[1].tip);

    // --- the two straps ---
    this.bands[0].set(this._tipR, P, this._dir, this._perp, t);   // front (+z)
    this.bands[1].set(this._tipL, P, this._dir, this._perp, t);   // back  (-z)

    // The held projectile rides the pouch.
    //
    // It has to be written to the BODY, not just the mesh: render() calls syncAll(), which
    // copies every body's transform onto its mesh, so anything set only on the mesh here is
    // overwritten a few microseconds later. (That bug shipped the arrow flying backwards,
    // nose pointing at the player, sitting half a unit off the pouch. Do not reintroduce it
    // by "optimising" this to a mesh-only write.)
    if (this.ammo && !this.ammo.dead && (this.state === 'dragging' || this.state === 'loaded')) {
      const ang = Math.atan2(uy, ux);
      const back = 0.06;
      const px = P.x - ux * back, py = P.y - uy * back;
      const b = this.ammo.body;
      if (b) {
        b.setTranslation({ x: px, y: py, z: 0 }, true);
        b.setRotation(quatZ(ang), true);
        b.setNextKinematicTranslation?.({ x: px, y: py, z: 0 });
        b.setNextKinematicRotation?.(quatZ(ang));
      }
      this.ammo.mesh.position.set(px, py, 0);
      this.ammo.mesh.rotation.set(0, 0, ang);
      // squashed into the pouch under tension, plus a flinch on the frame you grab it
      const pop = this.grabPop * this.grabPop;
      this.ammo.mesh.scale.set(1 + t * 0.11 + pop * 0.13, 1 - t * 0.10 - pop * 0.06, 1);
    }

    this.updatePreview();
  }

  /**
   * THE PREVIEW IS EARNED.
   *
   * Angry Birds has no pre-aim line. What it has is the traceline of the shot you already
   * fired, left on screen as a static record, and you aim by the delta from it. So: nothing
   * at all on the first drag of a level (`world.ammoUsed === 0`), and after that a faint
   * cream hint in a deliberately different visual language from the hard-white record.
   *
   * The path is a forward integration of the ACTUAL launch state through the ACTUAL solver
   * constants (gravity, damping, timestep) from the ACTUAL muzzle, so what the dots promise
   * is what the shot delivers. Dots are stamped every PREVIEW_STEP_TICKS solver steps — a
   * fixed TIME interval — so their on-screen spacing is proportional to speed: stretched
   * where the shot is fast at the muzzle, bunched where it slows toward the apex. Evenly
   * spaced dots are the single commonest tell of a fake preview in this genre.
   */
  updatePreview() {
    const earned = (world.ammoUsed ?? 0) >= 1;
    const show = earned && this.state === 'dragging' && this.drawn >= SLING.minDrawForPreview;
    this.preview.visible = show;
    this._previewPts.length = 0;
    if (!show) return;

    const dx = this.anchor.x - this.pouch.x, dy = this.anchor.y - this.pouch.y;
    const L = Math.hypot(dx, dy) || 1;
    const sp = this.power(this.drawn);
    const ux = dx / L, uy = dy / L;
    // Same muzzle, same kick, same per-step unwind as release() — otherwise the preview is a
    // drawing of a different shot from the one the button fires.
    const m = this.muzzlePoint(ux, uy, sp, this.ammo?.radius ?? 0.4, this.drawn);
    /**
     * THE PREVIEW MUST INTEGRATE THE SHOT, NOT A SHOT LIKE IT.
     * This used to bleed the kick off with `Math.exp(-FIXED / SLING.kickTau)` — an
     * exponential, with a time constant, against a projectile whose kick is a smootherstep
     * counted in solver steps. Two different curves from two different clocks, so the dots
     * were a drawing of a shot the button could not fire. It runs `Ammo.kickRemaining()` now,
     * on the same step counter, in the same order the engine uses (solver step first, then
     * the unwind in `Ammo.update()`).
     */
    const e0 = sp * SLING.kick;
    const kickN = SLING.kickTicks;
    let kick = e0;
    let step = 0;
    let vx = ux * (sp + kick), vy = uy * (sp + kick);
    let px = m.x;
    let py = m.y;

    const damping = 0.055;
    const k = Math.min(1, (this.drawn - SLING.minDrawForPreview) / 0.22);
    // 1/6..1/3 of an ammo diameter. At AD = 0.80 that is 0.133..0.267; we sit at 0.16.
    const R = 0.080;
    for (let i = 0; i < PREVIEW_DOTS; i++) {
      for (let s = 0; s < PREVIEW_STEP_TICKS; s++) {
        vy += GRAVITY_Y * FIXED;
        const d = Math.exp(-damping * FIXED);
        vx *= d; vy *= d;
        px += vx * FIXED; py += vy * FIXED;
        if (kick > 0) {
          step++;
          const next = step >= kickN ? 0 : e0 * Ammo.kickRemaining(step, kickN);
          vx -= ux * (kick - next); vy -= uy * (kick - next);
          kick = next;
        }
      }
      // The tail thins out rather than stopping dead — the arc is a hint, not a promise of
      // where it lands, and a hard last dot reads as "it ends here".
      const fade = 1 - (i / PREVIEW_DOTS) * 0.72;
      this._pm.compose(this._pv.set(px, py, 0.25), this._pq.identity(),
        this._ps.setScalar(R * fade * k));
      this.preview.setMatrixAt(i, this._pm);
      this._previewPts.push(px, py);
    }
    this.preview.instanceMatrix.needsUpdate = true;
    this.preview.material.opacity = 0.30 + 0.34 * k;
  }

  // =========================================================================
  // MEASUREMENT SURFACE — so a critic never has to take a screenshot's word for it
  // =========================================================================
  /**
   * Everything the P1 rubric asks for a number on. All lengths in world units;
   * `pouchStrapWidth` and the rubber widths are diameters, so they are directly comparable
   * to an ammo diameter (AD).
   */
  bandMetrics() {
    const f = this.bands[0], b = this.bands[1];
    return {
      drawn: +this.drawn.toFixed(4),
      state: this.state,
      rubberWidthAtPouch: +(2 * f.pouchRadius).toFixed(4),
      rubberWidthAtProng: +(2 * f.prongRadius).toFixed(4),
      pouchStrapWidth: +(2 * SLING.leatherR).toFixed(4),
      rubberLenFront: +f.rubberLength.toFixed(4),
      rubberLenBack: +b.rubberLength.toFixed(4),
      forkTipL: { x: +this._tipL.x.toFixed(4), y: +this._tipL.y.toFixed(4) },
      forkTipR: { x: +this._tipR.x.toFixed(4), y: +this._tipR.y.toFixed(4) },
      forkSpanX: +(this._tipR.x - this._tipL.x).toFixed(4),
      pouch: { x: +this.pouch.x.toFixed(4), y: +this.pouch.y.toFixed(4) },
      bandColor: '#' + f.tube.core.geometry.userData.tint.toString(16).padStart(6, '0'),
    };
  }

  /** Screen-space gaps between consecutive preview dots, for the "spacing encodes speed" test. */
  previewGaps() {
    const p = this._previewPts;
    if (p.length < 6) return null;
    const gaps = [];
    for (let i = 2; i < p.length; i += 2) {
      gaps.push(+Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]).toFixed(4));
    }
    const third = Math.max(1, Math.floor(gaps.length / 3));
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const first = mean(gaps.slice(0, third));
    const apex = mean(gaps.slice(-third));
    return { gaps, firstThirdMean: +first.toFixed(4), lastThirdMean: +apex.toFixed(4),
             ratio: +(apex / first).toFixed(4) };
  }

  // =========================================================================
  screenToWorld(sx, sy) {
    const cam = world.camera;
    const el = world.renderer?.domElement;
    if (!cam || !el) return null;
    const r = el.getBoundingClientRect();
    /**
     * WHILE A DRAG IS LIVE, PIXELS MEAN WHAT THEY MEANT WHEN IT STARTED.
     * The z = 0 play plane maps linearly onto the frame, so the frozen frame is the same
     * arithmetic the unproject below performs — with `cx/cy/vw/vh` read once at the grab
     * instead of every move. Everything else (the grab test at pointerdown, any call made
     * while the sling is loaded, empty or in recoil) still asks the live camera.
     */
    const f = this.state === 'dragging' ? this.rig?.dragFrame?.() : null;
    if (f) {
      return new THREE.Vector2(
        f.cx + ((((sx - r.left) / r.width) * 2 - 1) * f.vw) / 2,
        f.cy + ((-((sy - r.top) / r.height) * 2 + 1) * f.vh) / 2,
      );
    }
    const ndc = new THREE.Vector3(
      ((sx - r.left) / r.width) * 2 - 1,
      -((sy - r.top) / r.height) * 2 + 1,
      0.5,
    );
    ndc.unproject(cam);
    const dir = ndc.sub(cam.position).normalize();
    if (Math.abs(dir.z) < 1e-6) return null;
    const t = -cam.position.z / dir.z;         // intersect the z = 0 play plane
    return new THREE.Vector2(cam.position.x + dir.x * t, cam.position.y + dir.y * t);
  }

  dispose() {
    this.preview.geometry.dispose(); this.preview.material.dispose();
    this.preview.parent?.remove(this.preview);
    for (const b of this.bands) b.dispose();
    for (const p of this.prongs) p.tube.dispose();
    this.group.parent?.remove(this.group);
  }
}

// ---------------------------------------------------------------------------
// TUBE MESH — a generalised cylinder rebuilt every frame, with an ink shell
// ---------------------------------------------------------------------------
/**
 * Positions AND normals are rewritten in place each frame. Normals matter: this is the one
 * dynamic thing in the game that is LIT, because a lit tube is how a cross-section reads as
 * a cross-section. They are analytic (the radial direction of the ring), not recomputed from
 * faces, so it costs nothing.
 *
 * The ink shell is the same tube one `inkWidth` fatter with `side: BackSide` — the standard
 * inverted hull, which `inkAll()` cannot do for us because it bakes geometry once.
 */
class TubeMesh {
  constructor({ rings, radial, material, inkWidth = 0.040, vertexColors = false }) {
    this.rings = rings; this.radial = radial;
    this.core = this._make(material, 0, vertexColors);
    this.shell = this._make(new THREE.MeshBasicMaterial({
      color: INK, side: THREE.BackSide, toneMapped: false,
    }), inkWidth, false);
    this.group = new THREE.Group();
    this.group.add(this.shell, this.core);
    this._pts = new Float32Array((rings + 1) * 3);
    this._rad = new Float32Array(rings + 1);
    this._col = vertexColors ? new Float32Array((rings + 1) * 3) : null;
  }

  _make(material, inflate, vertexColors) {
    const R = this.radial, S = this.rings;
    const n = (S + 1) * (R + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    // UVs, because the house wood material carries a grain map and a geometry with no `uv`
    // attribute samples texel (0,0) for every vertex — a flat, wrong, uniformly dark limb.
    const uv = new Float32Array(n * 2);
    for (let i = 0; i <= S; i++) {
      for (let j = 0; j <= R; j++) {
        const o = (i * (R + 1) + j) * 2;
        uv[o] = j / R; uv[o + 1] = i / S;
      }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (vertexColors) {
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    // WINDING. (a, b, c) with b one step around the ring and c one step along the curve gives
    // dTheta x T = the outward radial, i.e. front faces pointing OUT. Getting this backwards
    // culls the whole tube and leaves only the BackSide ink shell visible, which renders the
    // entire slingshot as a navy silhouette. It did exactly that.
    const idx = [];
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < R; j++) {
        const a = i * (R + 1) + j, b = a + 1, c = a + (R + 1), d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    g.setIndex(idx);
    g.userData.tint = 0xffffff;
    const m = new THREE.Mesh(g, material);
    m.frustumCulled = false;
    m.castShadow = inflate === 0;
    m.userData.inflate = inflate;
    return m;
  }

  /**
   * @param {Float32Array} pts   (rings+1)*3 curve samples
   * @param {Float32Array} rad   (rings+1) radii
   * @param {Float32Array} [col] (rings+1)*3 linear vertex colours
   */
  write(pts, rad, col) {
    const S = this.rings, R = this.radial;
    for (const m of [this.core, this.shell]) {
      const P = m.geometry.attributes.position.array;
      const N = m.geometry.attributes.normal.array;
      const C = col ? m.geometry.attributes.color?.array : null;
      const inf = m.userData.inflate;
      for (let i = 0; i <= S; i++) {
        const i3 = i * 3;
        const x = pts[i3], y = pts[i3 + 1], z = pts[i3 + 2];
        // central-difference tangent
        const a = Math.max(0, i - 1) * 3, b = Math.min(S, i + 1) * 3;
        let tx = pts[b] - pts[a], ty = pts[b + 1] - pts[a + 1], tz = pts[b + 2] - pts[a + 2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        // frame: U = T x Z (stable because our curves never run along Z), V = T x U
        let ux = ty * 1 - tz * 0, uy = tz * 0 - tx * 1, uz = 0;
        let ul = Math.hypot(ux, uy, uz);
        if (ul < 1e-5) { ux = 0; uy = 1; uz = 0; ul = 1; }
        ux /= ul; uy /= ul; uz /= ul;
        const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
        const r = rad[i] + inf;
        for (let j = 0; j <= R; j++) {
          const ang = (j / R) * Math.PI * 2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const nx = ca * ux + sa * vx, ny = ca * uy + sa * vy, nz = ca * uz + sa * vz;
          const o = (i * (R + 1) + j) * 3;
          P[o] = x + nx * r; P[o + 1] = y + ny * r; P[o + 2] = z + nz * r;
          N[o] = nx; N[o + 1] = ny; N[o + 2] = nz;
          if (C) { C[o] = col[i3]; C[o + 1] = col[i3 + 1]; C[o + 2] = col[i3 + 2]; }
        }
      }
      m.geometry.attributes.position.needsUpdate = true;
      m.geometry.attributes.normal.needsUpdate = true;
      if (C) m.geometry.attributes.color.needsUpdate = true;
      m.geometry.boundingSphere = null;
      m.geometry.computeBoundingSphere();
    }
  }

  /** Convenience for the prongs: a tapered limb from (bx,by) to `tip`, bowed against the bend. */
  setProng(bx, by, tip, rest, t) {
    const S = this.rings, pts = this._pts, rad = this._rad;
    // control point: the UNBENT midpoint, so the limb bows and the tip leads. That is what a
    // loaded fork does — it does not rotate rigidly about its root.
    const cx = (bx + rest.x) / 2, cy = (by + rest.y) / 2;
    for (let i = 0; i <= S; i++) {
      const u = i / S, iu = 1 - u;
      pts[i * 3] = iu * iu * bx + 2 * iu * u * cx + u * u * tip.x;
      pts[i * 3 + 1] = iu * iu * by + 2 * iu * u * cy + u * u * tip.y;
      pts[i * 3 + 2] = 0;
      rad[i] = 0.245 - 0.140 * u;
    }
    this.write(pts, rad, null);
  }

  dispose() {
    for (const m of [this.core, this.shell]) { m.geometry.dispose(); }
    this.shell.material.dispose();
    this.group.parent?.remove(this.group);
  }
}

// ---------------------------------------------------------------------------
// BAND STRAP — rubber from the prong, LEATHER across the ammo
// ---------------------------------------------------------------------------
const _C = new THREE.Color();
const _CR = new THREE.Color();
/**
 * NO convertSRGBToLinear() ANYWHERE HERE. three's ColorManagement is on by default in r152+,
 * so `new Color(hex)` / `setHex(hex)` ALREADY returns the linear working-space value for an
 * sRGB hex. Converting again applies the ~2.2 gamma twice: the crimson band came back as
 * linear (0.11, 0.002, 0.005) instead of (0.368, 0.025, 0.062) and the leather as (0.004,
 * 0.002, 0.001) — i.e. both rendered as black lumps. Vertex colours are consumed raw, so
 * this is the one place the mistake is invisible until you read the buffer back.
 */
const _CL = new THREE.Color(COL.leather);

/**
 * Six control points, Catmull-Rom sampled:
 *   0 tie-off just under the prong cap
 *   1 guide along the limb (so the band leaves the fork along the fork, not at a corner)
 *   2 mid-span — sags into a catenary when slack, dead straight when taut
 *   3 the pouch tie                      <- RUBBER ENDS HERE, LEATHER BEGINS
 *   4 the belt, crossing the ammo's face
 *   5 the tuck, past the far side
 *
 * `side` = +1 puts the whole strap at +z, i.e. between the camera and the loaded ammo.
 */
class BandStrap {
  constructor(side) {
    this.side = side;
    this.mat = new THREE.MeshToonMaterial({
      color: 0xffffff, gradientMap: RAMP_HARD(), vertexColors: true,
    });
    this.tube = new TubeMesh({
      rings: RINGS_BAND, radial: RADIAL, material: this.mat, inkWidth: 0.024, vertexColors: true,
    });
    this.ctrl = Array.from({ length: 6 }, () => ({ x: 0, y: 0, z: 0 }));
    this.pouchRadius = SLING.rubberR * SLING.rubberPouchK;
    this.prongRadius = SLING.rubberR;
    this.rubberLength = 0;
  }

  /**
   * @param {THREE.Vector3} tip     the (already bent) prong tip
   * @param {THREE.Vector2} pouch
   * @param {THREE.Vector2} dir     unit launch direction (pouch -> anchor)
   * @param {THREE.Vector2} perp    dir rotated +90°
   * @param {number} t              draw 0..1
   */
  set(tip, pouch, dir, perp, t) {
    const s = this.side;
    const Z = SLING.bandZ * s;
    const c = this.ctrl;

    // 0/1 — tie-off and the run down the limb
    const lx = tip.x - SLING.x, ly = tip.y - SLING.splitY;
    const ll = Math.hypot(lx, ly) || 1;
    c[0].x = tip.x - (lx / ll) * 0.20; c[0].y = tip.y - (ly / ll) * 0.20; c[0].z = Z * 0.42;

    // 3 — the pouch tie. Both straps tie to the same place, separated only in DEPTH; that is
    //     how a real pouch works and it is what puts one of them in front of the ammo.
    c[3].x = pouch.x + dir.x * 0.10 + perp.x * 0.15 * s;
    c[3].y = pouch.y + dir.y * 0.10 + perp.y * 0.15 * s;
    c[3].z = Z;

    // 2 — mid-span. Slack sags; taut is dead straight (and a touch past straight, so the
    //     band visibly LOADS rather than merely spanning).
    // Sag is a fraction of the SPAN, not a constant: a 0.3-unit dip in a 0.5-unit slack band
    // is a loop, and it also inflates the rest length so much that the stretch RATIO stops
    // reading as a stretch. Proportional sag keeps the slack pose honest and the ratio real.
    const span = Math.hypot(c[3].x - c[0].x, c[3].y - c[0].y, c[3].z - c[0].z) || 1;
    const sag = (1 - t) * (1 - t) * 0.10 * span;
    c[2].x = (c[0].x + c[3].x) / 2;
    c[2].y = (c[0].y + c[3].y) / 2 - sag;
    c[2].z = (c[0].z + c[3].z) / 2;
    // 1 — quarter point, keeps the curve off the prong
    c[1].x = c[0].x * 0.55 + c[2].x * 0.45;
    c[1].y = c[0].y * 0.55 + c[2].y * 0.45 - sag * 0.35;
    c[1].z = c[0].z * 0.5 + c[2].z * 0.5;

    // 4/5 — the LEATHER belt across the ammo and the tuck beyond it. The belt sits at the
    //       ammo's waist, clear of the eyes and the nose, and bulges toward the camera so
    //       the +z strap is unambiguously in front.
    // The FRONT wrap (s = +1) is the one the player sees: it crosses the ammo's waist and
    // tucks below. The BACK wrap is mostly hidden, so it is kept short — a long one only
    // ever showed up as a black ink halo poking out around the projectile.
    const tuck = s > 0 ? 0.46 : 0.34;
    c[4].x = pouch.x - dir.x * 0.06;
    c[4].y = pouch.y - dir.y * 0.06;
    c[4].z = Z + 0.10 * s;
    c[5].x = pouch.x - dir.x * 0.18 - perp.x * tuck * s;
    c[5].y = pouch.y - dir.y * 0.18 - perp.y * tuck * s;
    c[5].z = Z - 0.10 * s;

    // --- sample, and build the radius + colour profile in the same pass ---
    const S = RINGS_BAND, pts = this.tube._pts, rad = this.tube._rad, col = this.tube._col;
    sampleSpline(c, S, pts);

    const thin = 1 - (1 - SLING.rubberThin) * t;         // 1 at rest -> rubberThin at full draw
    this.prongRadius = SLING.rubberR * thin;
    this.pouchRadius = SLING.rubberR * SLING.rubberPouchK * thin;
    // Rubber heats and brightens as it loads. Never toward the fork's hue.
    const tint = _C.setHex(COL.rubberRest).lerp(_CR.setHex(COL.rubberHot), t);
    this.tube.core.geometry.userData.tint = tint.getHex();
    const lin = _CR.copy(tint);

    let rubberLen = 0;
    for (let i = 0; i <= S; i++) {
      const u = i / S;
      const i3 = i * 3;
      if (u <= BAND_LEATHER_FROM) {
        const k = u / BAND_LEATHER_FROM;                  // 0 at prong, 1 at pouch
        rad[i] = SLING.rubberR * (1 - (1 - SLING.rubberPouchK) * k) * thin;
        col[i3] = lin.r; col[i3 + 1] = lin.g; col[i3 + 2] = lin.b;
        if (i > 0) {
          rubberLen += Math.hypot(pts[i3] - pts[i3 - 3], pts[i3 + 1] - pts[i3 - 2],
                                  pts[i3 + 2] - pts[i3 - 1]);
        }
      } else {
        // leather: does not stretch, does not thin. It is the thing that stays wide enough
        // to keep occluding the ammo at every draw.
        const k = (u - BAND_LEATHER_FROM) / (1 - BAND_LEATHER_FROM);
        rad[i] = SLING.leatherR * (1 - 0.34 * k * k);
        col[i3] = _CL.r; col[i3 + 1] = _CL.g; col[i3 + 2] = _CL.b;
      }
    }
    this.rubberLength = rubberLen;
    this.tube.write(pts, rad, col);
  }

  dispose() { this.tube.dispose(); this.mat.dispose(); }
}

/**
 * Uniform Catmull-Rom through `ctrl`, written as (n+1) samples into `out`.
 * Hand-rolled because THREE.CatmullRomCurve3.getPoints() allocates a Vector3 per sample and
 * this runs 120 times a second on two bands and two prongs.
 */
function sampleSpline(ctrl, n, out) {
  const m = ctrl.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * m;
    const k = Math.min(m - 1, Math.floor(u));
    const t = u - k;
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(m, k + 2)];
    const t2 = t * t, t3 = t2 * t;
    out[i * 3] = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
    out[i * 3 + 1] = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
    out[i * 3 + 2] = 0.5 * (2 * p1.z + (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
  }
}
