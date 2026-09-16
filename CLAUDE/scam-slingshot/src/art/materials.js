/**
 * Named material presets — the ONLY way to get a material in this game.
 * ARCHITECTURE.md: "Nothing in the game may use a stock un-tuned MeshStandardMaterial."
 *
 *   const m = mat('wood');
 *   mesh = new THREE.Mesh(geo, m.three);
 *   ColliderDesc.cuboid(...).setDensity(m.physics.density) ...
 *
 * Each preset returns { three: Material, physics: { density, restitution, friction,
 * linearDamping, angularDamping, debris:{linearDamping,angularDamping}, breakImpulse,
 * sound } }. `three` instances are CACHED and shared — never mutate one in place; call
 * mat(name, { overrides }) for a variant and you get a fresh clone.
 *
 * ── THE DYNAMICS BLOCK IS THE MATERIAL. IT IS NOT A DEFAULT TO OVERRIDE ──────
 * Until PW round 1 the only per-material physics numbers were density, restitution and
 * friction, and the restitutions were 0.10 / 0.04 / 0.03 — a spread of seven hundredths.
 * Damping was a single pair of literals in level/blocks.js (0.06 / 0.30 for every block,
 * 0.42 / 1.5 for every fragment), so wood, glass and stone were dynamically THE SAME
 * OBJECT. Measured on the drop rig (`_tools/scenarios/pw-gate.mjs`, three identical 0.90
 * cubes, same height, same tilt) before the change:
 *
 *     material  land   hitV   rebound  bounces  slide   spin   rest    sleep
 *     glass     467ms  11.02   0.187      2     1.138   725ms  1250ms  1758ms
 *     wood      467ms  11.02   0.187      2     1.104   750ms  1325ms  1842ms
 *
 * Two materials, identical to three significant figures in every column. With the textures
 * hidden nobody could name either one. That is the gap this block exists to close, so:
 *
 *   · wood  is springy and light — it BOUNCES (the highest restitution in the game), keeps
 *           tumbling (the lowest angular damping) and is the last thing in a collapse to
 *           stop moving. A plank rocks itself to rest.
 *   · glass is brittle and slick — it does not bounce at all (a pane chips, it does not
 *           rebound) and it has almost no friction, so shards SKITTER: they slide flat and
 *           spin while they slide. Its read is "went everywhere", not "bounced".
 *   · stone is dead — no rebound, the most friction in the game, and enough angular damping
 *           that rotation stops on the first contact. A stone block LANDS AND STAYS.
 *
 * `linearDamping` is air drag and scales inversely with density, as air drag does: a stone
 * cube is barely slowed by air (0.005), a fragment of pane is (0.030). Never use it as a
 * general-purpose brake — that is what friction is for, and a brake in the damping term is
 * what made debris drift (see the `debris` sub-block).
 *
 * ── THE LOOK (committed) ─────────────────────────────────────────────────────
 * Every preset is a MeshToonMaterial with a hard 4-step gradient ramp and a procedural
 * canvas grain map from art/toon.js. Banded shading, no smooth falloff, saturated but
 * controlled. Ink silhouettes are applied per-mesh by `ink()`/`inkAll()`, not here —
 * a material cannot know how thick its object's outline should be.
 * There is not one MeshStandardMaterial left in this file and there must never be.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `breakImpulse` is in N·s. The damage model in level/blocks.js converts Rapier's contact
 * FORCE events to impulse with `force * FIXED`.
 *
 * ── THESE ARE NOT "MASS × CLOSING SPEED". MEASURE BEFORE YOU RE-TUNE ─────────
 * This header used to say "a 0.7 kg arrow at 24 m/s lands ~17 N·s", and every threshold
 * below was authored from that sentence. It is false, and it cost the game its entire
 * stone and wood destruction vocabulary. Rapier's contact force is not the projectile's
 * momentum; it is what the STRUCK body could absorb in one solver step, bounded by that
 * body's mass and bracing. Measured across 69 landed shots
 * (`_tools/scenarios/p3-r6-punch.mjs`): a projectile lands at 14–17 m/s every time and
 * delivers a first-contact impulse of **0.7–11.8 N·s** — a light glass column takes ~3,
 * a braced 1.6 kg beam takes ~11.8. Against a 17.0 threshold, stone was indestructible by
 * every damage source in the game and fractured 0 times in a 24-shot direct probe.
 *
 * So the numbers below are read together with `AMMO_PUNCH` in level/blocks.js, which
 * amplifies a live projectile's contact impulse by 2.6×. In the units a level designer
 * actually cares about — RAW first-contact impulse a full-speed shot has to land — the
 * three materials now sit at:
 *
 *     glass   2.6 / 2.6 = 1.0 N·s   any real contact shatters it
 *     wood    9.5 / 2.6 = 3.7 N·s   a solid hit snaps it; a graze leaves a crack
 *     stone  14.0 / 2.6 = 5.4 N·s   a strong, square hit only; otherwise deep cracks
 *
 * against a measured shot distribution of 0.7–11.8. Three visibly different failure
 * points, all of them inside the range a player can actually reach. If you change either
 * side of that arithmetic, re-run `_tools/scenarios/p3-r6-gate.mjs` and check the material
 * mix AND the four counterweights, not just the mix.
 *
 * ── A THRESHOLD IS NOT A MATERIAL. `damage` IS. ───────────────────────────
 * One threshold per material gives three numbers, not three materials: everything still
 * fails the same WAY, just at a different point on the same line. The direct-hit fix above
 * made stone reachable by the dart and left the other half of the brief — “or being crushed
 * under a collapsing storey” — unbuildable, because the chain damage scale in
 * level/blocks.js was a flat 0.22 for every struck material. Measured
 * (`_tools/scenarios/p3-r6-crush.mjs`, per-block per-tick contact load over four l1
 * collapses): a stone cube takes RAW chain blows of 6.1–10.8 N·s when a storey lands on it
 * and then carries 3–8× its own weight in wreckage for seconds afterwards — and registered
 * exactly 0.00 damage for all of it, because 0.22 × 10.8 = 2.4 against a 14.0 threshold and
 * the leak ate it in 200 ms.
 *
 * ── AND A THRESHOLD IS NOT A TOUGHNESS EITHER. `breakDv` IS.  (PW r2) ───────
 * `breakImpulse` is an ABSOLUTE number of N·s, and the impulse a body absorbs scales with
 * that body's own mass (decision 3 again). So "how much of my threshold did that cost me"
 * silently reads `mass / breakImpulse` — i.e. **the heaviest material is the most fragile**,
 * which is exactly backwards and was measured as such:
 *
 *     one lone 0.90 m cube, dropped on the lawn (`_tools/scenarios/pw-r2-meas.mjs`)
 *       stone  1.96 kg   SHATTERED from  1.6 m     (0.98 of threshold from 1.12 m)
 *       glass  0.34 kg   survived   13.0 m         (0.996 of threshold at 13 m)
 *       wood   0.53 kg   survived   13.0 m         (0.51 of threshold at 13 m)
 *
 * `breakDv` is the fix, and it is a real quantity rather than a fudge: **the delta-v, in
 * m/s, that this material cannot survive** — the speed change one blow has to impose on a
 * block for that blow to consume the block's whole threshold at source scale 1.0. Δv is
 * `contactImpulse / strickenMass`, so it is mass-invariant by construction: the same fall
 * costs a big beam and a small chip the same fraction of themselves, and a heavier material
 * is now TOUGHER, not more fragile.
 *
 * The numbers are measured, not invented. `thr / mass` is the Δv each block can take today,
 * and the census over l1's own geometry reads glass 5.4–9.7, wood 5.9–13.8, stone 10.5 —
 * i.e. within a material it varies 2.3x with block size (that is the size dependence being
 * removed) and ACROSS materials it puts stone below wood (that is the inversion). So:
 *
 *     glass  8.5   just above the median of glass's own l1 blocks (7.64) — glass's chain
 *                    behaviour, which P3 tuned, is deliberately left where it is
 *     wood  11.0   just above the median of wood's l1 blocks (9.75); the big beams get
 *                    tougher, the small members slightly softer, which is the size
 *                    dependence going away
 *     stone 26.0   deliberately 2.5x its own thr/mass. Stone is the tough one: nothing the
 *                    level can drop from its own height may break it. What breaks stone is
 *                    a storey landing on it, and that is `crush` below, not this.
 *
 * The two half-points above the medians are not decoration: at the medians exactly, the
 * 8-shot l1 gate came out BROKE 7 / STANDING 10 against P3's 5.5 / 11.5, i.e. the round was
 * quietly buying its material read with P3's separation. At 8.5 / 11.0 the same gate reads
 * BROKE 6 / STANDING 11 / COHESION 100 % / MOVED 11.5 — inside the noise of the arm it was
 * measured against, back to back on the same tree.
 *
 * Read the two together: `breakDv` is bulk toughness, `crush` is brittleness under a
 * concentrated load. Stone is high on both — very hard to hurt in general, and then
 * disproportionately vulnerable to the one thing that does hurt it.
 *
 * So each material now carries a FAILURE MODE, not just a number:
 *
 *   `land`   the same ceiling for a landing on the WORLD (ground/soil). A separate number
 *            because surviving a drop and surviving the collapse shoving you are separate
 *            behaviours: glass 1.05 (a pane shatters when it hits the floor), wood 0.50
 *            (chosen so l1's own beams land exactly as they did before PW r2), stone 0.42
 *            (a rock lands and stays). See GROUND_CRUSH in level/blocks.js.
 *   `crush`  the source scale a heavy chain blow ramps up to (from the flat 0.22 base,
 *            quadratically, across the measured 1.8–6.1 m/s band of Δv). Stone is brittle
 *            under a concentrated crushing load and converts several times it (4.40 — see
 *            below, it is against a mass-normalised impulse now, so it is not comparable to
 *            the old 1.35); wood is fibrous, bends and survives the same wall landing on it
 *            (0.28); glass is already gone at any impulse worth the name (0.22, i.e. no ramp
 *            at all). **The ground is not a storey** — a landing on the world uses the flat
 *            GROUND_CRUSH ceiling in level/blocks.js, not this, because a flat compliant
 *            lawn meeting a whole face is not the same load as a beam corner arriving on one.
 *   `leak`   how fast accumulated damage bleeds off, in multiples of the threshold per
 *            second. Glass holds no grudge (1.6). Masonry does (0.42).
 *   `scar`   the permanent residual, per crack step, as a fraction of the threshold. This
 *            is the “does accumulated cracking count” half of the brief: a block that has
 *            been visibly cracked never fully heals, so a very strong hit followed a second
 *            later by a heavy crush adds up the way the crack decal has always promised.
 *            NOT the rejected r5 change — that lowered the floor on INCOMING events for a
 *            cracked block and let jostling through; this leaves the floor flat and only
 *            stops the leak. Nothing can scar a block that was never really hit.
 */

import * as THREE from 'three';
import {
  RAMP_STD, RAMP_SOFT, RAMP_HARD, RAMP_GLASS,
  woodGrain, stoneGrain, glassStreaks, grassGrain, clothGrain,
} from './toon.js';

/** The committed palette. Saturated but controlled. Hex is sRGB. */
export const PALETTE = {
  grassLight:  0x86cf4e, grassDark: 0x3f8f2c,
  soil:        0x9c6134, soilDark:  0x6f4222,
  wood:        0xd79a52, woodDark:  0x9c6431,
  // glassInk is the OUTLINE of every glass block and shard, and it is deliberately a
  // mid-cyan rather than the house navy. Measured on ab_destruction_intact-glass-pyramid-
  // at-rest_08, an ice block's outline is its own deepest facet — lum 141-154 against a
  // 205-224 body — so the contour reads as a facet break, not as a drawn line. Ours was
  // 0x11486b (lum 63) at 0.048 thickness on a 0.40 m column, which put roughly a third of
  // the block's on-screen area inside the ink: that is what "reads as unshaded scaffolding"
  // actually was. 0x3ba9cf is lum 148 — 70 below the pane it surrounds, 37 below the sky
  // behind it, and unmistakably cyan rather than black.
  glass:       0xa8ecf5, glassDeep: 0x3fa9c4, glassInk: 0x3ba9cf,
  stone:       0x8fa3b8, stoneDark: 0x3d5570,
  villain:     0xe0663f, villainDark: 0x8f2f18,
  ammo:        0x2a9d8f, ammoDark:  0x14655c,
  prop:        0xf4a259, gold:      0xf6c453,
  cream:       0xfdf6ec, navy:      0x1a3a5c,
  coral:       0xe76f51, sky:       0x89d0e8,
  ink:         0x14283c,
};

const cache = new Map();

const PRESETS = {
  ground: {
    make: () => {
      const t = grassGrain(); t.repeat.set(10, 2);
      return new THREE.MeshToonMaterial({
        color: PALETTE.grassLight, map: t, gradientMap: RAMP_SOFT(),
        emissive: new THREE.Color(PALETTE.grassDark), emissiveIntensity: 0.18,
      });
    },
    // Restitution 0.02, not 0.06. Rapier averages the two colliders' restitutions, so the
    // ground was contributing half of every bounce in the game and flattening the difference
    // between a wood plank and a stone block into nothing. Grass and soil absorb; let the
    // falling material decide how much it gives back.
    // Friction 1.35, not 1.00. makeBody combines friction with Min, so the GROUND was the
    // cap on how hard anything could grip it: stone's authored 1.00 and the floor's 1.00
    // met at 1.00 and stone could not be made to stop any faster than wood. 1.35 lifts the
    // cap without touching wood (0.68) or glass (0.10), which are both far below it.
    physics: { density: 0, restitution: 0.02, friction: 1.35, linearDamping: 0, angularDamping: 0,
               breakImpulse: Infinity, sound: 'thud' },
  },

  soil: {
    make: () => {
      const t = stoneGrain(); t.repeat.set(8, 3);
      return new THREE.MeshToonMaterial({
        color: PALETTE.soil, map: t, gradientMap: RAMP_SOFT(),
        emissive: new THREE.Color(PALETTE.soilDark), emissiveIntensity: 0.24,
      });
    },
    physics: { density: 0, restitution: 0.02, friction: 1.35, linearDamping: 0, angularDamping: 0,
               breakImpulse: Infinity, sound: 'thud' },
  },

  wood: {
    make: () => {
      const t = woodGrain(); t.repeat.set(1.6, 1);
      return new THREE.MeshToonMaterial({
        color: PALETTE.wood, map: t, gradientMap: RAMP_STD(),
        emissive: new THREE.Color(PALETTE.woodDark), emissiveIntensity: 0.20,
      });
    },
    // WOOD BOUNCES AND TUMBLES. The springiest thing in the level (0.50 against stone's
    // 0.02) and by far the loosest in rotation (0.10 against stone's 1.80), which is what
    // makes a falling plank hop off the ground and keep turning. Measured on the drop rig,
    // that is the whole separation: coefficient of restitution 0.213 for wood against 0.016
    // for glass and stone, one visible bounce against none. Air drag is small but not zero —
    // a plank is light for its size.
    physics: { density: 0.62, restitution: 0.50, friction: 0.72,
               linearDamping: 0.015, angularDamping: 0.10,
               debris: { linearDamping: 0.03, angularDamping: 1.30, restitution: 0.16, friction: 1.10 },
               breakImpulse: 9.5, sound: 'wood',
      // Fibrous. A storey landing on a beam bends it and it survives to lie in the pile as
      // a beam. Cracks part-close: 0.85 leak, small scar.
      // breakDv 11.0 m/s sits just above the median of wood's own l1 blocks (5.92 / 6.91 /
      // 8.29 / 9.75 / 12.20 / 13.79), so the level's wood behaves as it did while stopping
      // the 2.3x size dependence: the 1.60 kg bottom beam used to take 1.65x the damage per
      // Δv that the 0.69 kg outpost post took, purely for being big.
      // land 0.50 is within 10 % of the value that leaves l1's 1.60 kg bottom beam landing
      // EXACTLY as it did before this round (0.557), which is deliberate: the change is meant
      // to be visible on a lone falling cube, not to quietly re-tune a level P3 signed off.
      // Measured on the fall ladder: a lone 0.53 kg wood cube now shatters from 7.5 m and is
      // at 0.90 of threshold from 5.5 m.
      damage: { crush: 0.28, land: 0.50, breakDv: 11.0, leak: 0.85, scar: [0.06, 0.16, 0.34] } },
  },

  glass: {
    /**
     * OPAQUE. This is the single biggest change of P3 r2 and it must not be reverted.
     *
     * Glass used to be `MeshBasicMaterial, opacity 0.62, depthWrite:false` with an
     * EdgesGeometry outline. Measured on the real level, that put the standing glass columns
     * at 199.4–209.8 luminance against a 199.4 sky — between zero and one third of a value
     * step of separation — and at the 40px test the glass left the frame entirely. Every
     * downstream failure came from that one decision: no silhouette, no material you could
     * name from a crop, a settled pile you could see straight through, and edge lines drawn
     * through the faces in front of them.
     *
     * The reference (ab_destruction_intact-glass-pyramid-at-rest_08) is opaque. Measured off
     * it: the hill behind an ice block does not show through, and the block carries three
     * hard internal values — seam 136, body 187, specular 244 — with its brightest pixels
     * the brightest pixels in the entire frame. Glass reads as glass there because of that
     * internal contrast and a near-white specular strip, NOT because it is see-through.
     *
     * So: a lit toon material like every other block, writing depth like every other block,
     * on a ramp whose FLOOR is already brighter than the sky (RAMP_GLASS), with the three
     * values baked into the map (art/toon.js drawGlass). The ink is the ordinary
     * inverted-hull silhouette in a darker tint of glass's own hue — see level/blocks.js.
     *
     * `color` is white on purpose: the map carries all of the hue, so the strips can reach
     * full white while the body stays a saturated cyan. Tinting `color` would drag the
     * specular strips down with the body and flatten the one contrast that matters.
     */
    make: () => {
      const t = glassStreaks();
      return new THREE.MeshToonMaterial({
        color: 0xffffff, map: t, gradientMap: RAMP_GLASS(),
        // The emissive term is the headroom. The scene is graded with ACES, whose whole
        // job is to roll saturated brights off toward white: a lit surface here tops out
        // around 228 luminance no matter how much light you throw at it, which is BELOW
        // the clouds and only 28 above the sky. Glass is the one material that has to beat
        // that ceiling, so it opts out of the grade (toneMapped:false, exactly like the
        // clouds, the hills and every fx particle already do) and buys back the blue it
        // loses from the warm key with a cyan emissive keyed off the same map. Strips end
        // at 254, body at 220, seams at 132 — see drawGlass() for the solve.
        emissive: new THREE.Color(0x2fd8ff), emissiveMap: t, emissiveIntensity: 0.55,
        toneMapped: false,
      });
    },
    /**
     * GLASS SKITTERS. Restitution 0.05 — a pane does not rebound, it chips and stays down —
     * against a friction of 0.26, the lowest in the game, so a shard slides flat and keeps
     * spinning while it slides. That pairing IS the read: glass's signature in motion is
     * horizontal travel with no vertical bounce, the exact opposite of wood's.
     *
     * DENSITY STAYS 0.40, AND THAT IS DELIBERATE. Solid glass is 2.5 — four times wood — so
     * 0.40 looks like a plain error. It is not: these are PANES AND CASES, not solid slabs
     * (art/toon.js glassPane() draws a bevelled frame around a sheet), and the collider is
     * the whole 1.05 m box the pane sits inside. A 6 mm sheet filling a 1.05 m deep box has
     * a bulk density of 2.5 x 0.006/1.05 = 0.014; even a 5 cm display case is about 0.12.
     * 0.40 is already generous, it keeps glass the lightest element in the tower (which is
     * what lets a weak shot still move something), and every l1 number is authored against
     * it. Anyone raising it must re-derive glass's breakImpulse in the SAME edit: a heavier
     * body absorbs proportionally more contact impulse, so mass and threshold move together
     * or the material silently changes class. (See stone below, where exactly that was done.)
     */
    physics: { density: 0.40, restitution: 0.04, friction: 0.16,
               linearDamping: 0.030, angularDamping: 0.05,
               debris: { linearDamping: 0.04, angularDamping: 0.80, restitution: 0.03, friction: 0.55 },
               breakImpulse: 2.6, sound: 'glass',
      // No crush ramp and no scar on purpose: glass is intact or it is shards. At a 2.6
      // threshold every blow above the floor is already lethal, so a ramp would change
      // nothing except make the one material that never needed help look tuned.
      // breakDv 8.5 m/s sits just above the median of glass's own l1 blocks (5.41 / 5.41 /
      // 6.73 / 7.64 / 8.67 / 8.67 / 9.67), so glass's chain behaviour — which P3's separation
      // numbers are tuned against — barely moves. Glass is the material that was already
      // right; this round is not allowed to spend it.
      // land 1.05 is the one ceiling in the game ABOVE 1.0, and it is the whole reason glass
      // is still the first thing to go: a pane that hits the floor shatters, so a lone glass
      // cube fails from 1.6 m where wood needs 7.5 m and stone survives 13 m.
      damage: { crush: 0.22, land: 1.05, breakDv: 8.5, leak: 1.60, scar: [0, 0, 0] } },
  },

  stone: {
    make: () => {
      const t = stoneGrain(); t.repeat.set(1.2, 1.2);
      return new THREE.MeshToonMaterial({
        color: PALETTE.stone, map: t, gradientMap: RAMP_STD(),
        emissive: new THREE.Color(PALETTE.stoneDark), emissiveIntensity: 0.30,
      });
    },
    // 14, not 17, and the reasoning that produced 17 was measured wrong twice (22 -> 17 was
    // the first correction and it did not go far enough, because both numbers came from the
    // "one clean arrow lands ~17 N·s" claim in the header, which is false).
    //
    // 14 is chosen against the real shot distribution: with AMMO_PUNCH it needs 5.4 N·s of
    // raw first-contact impulse, which is the upper half of a square direct hit and the top
    // ~15 % of what happens incidentally on l1. So stone breaks when the player genuinely
    // lands one on it, cracks visibly the rest of the time, and — unlike glass and wood — is
    // still effectively immune to the chain: killing it purely by jostling would take 64 N·s
    // of accumulated block-on-block contact against a leak of 11.9 N·s per second.
    // Spread, in raw-impulse-to-break: glass 1.0, wood 3.7, stone 5.4.
    /**
     * STONE LANDS AND STAYS. Restitution 0.02 (no rebound at all), the highest friction in
     * the game (1.00 — it grips the instant it touches) and angular damping 1.00, seven
     * times wood's: a stone block that lands spinning has stopped spinning by the next beat.
     * Linear damping is almost zero, because air does not slow a rock down.
     *
     * DENSITY 1.55 -> 2.30. Real granite is 2.6 against real wood's 0.6, a ratio of 4.3;
     * ours was 2.5, and the consequence was measurable rather than academic — the l1 mass
     * census read "HEAVIEST OBJECT ON SCREEN: wood 1.60 kg", i.e. a plank outweighed a stone
     * cube. It now reads stone 1.96 kg, stone/wood 3.7.
     *
     * breakImpulse 14.0 -> 20.5 IS THE OTHER HALF OF THAT NUMBER, NOT A DIFFICULTY CHANGE.
     * Rapier's contact impulse is what the STRUCK body absorbed and it scales with that
     * body's mass (ARCHITECTURE.md decision 3), so multiplying stone's density by 1.484
     * multiplies every impulse it will ever receive by about the same factor. Holding the
     * threshold at 14.0 would have made stone 1.5x EASIER to break while calling it heavier
     * — and that failure was already visible at the OLD density: on the drop rig a stone
     * cube was the only one of the three that SHATTERED on landing from 2.6 m of grass while
     * wood and glass survived, which is exactly backwards. 20.5 = 14.0 x 1.464 holds r6's
     * measured spread (raw first-contact impulse to break: glass 1.0, wood 3.7, stone 5.4)
     * and holds the crush ratio below it: the measured 6-11 N.s "a storey landed on me" blow
     * scales to 8.9-16.3, which is the same 0.36-0.72 of threshold it was before.
     */
    physics: { density: 2.30, restitution: 0.02, friction: 1.35,
               linearDamping: 0.005, angularDamping: 1.80,
               debris: { linearDamping: 0.015, angularDamping: 2.20, restitution: 0.01, friction: 1.35 },
               breakImpulse: 20.5, sound: 'stone',
      // THE CRUSH MATERIAL. Brittle: it laughs at a shove and splits under a load.
      //
      // breakDv 26.0 m/s is 2.5x stone's own thr/mass (10.48), and that gap IS the fix the
      // round was called for. In absolute N·s a 1.96 kg cube absorbs six times what a
      // 0.34 kg glass cube absorbs from the identical fall, so against a fixed threshold the
      // heaviest material was the most fragile — measured, stone shattered from a 1.6 m drop
      // onto grass while glass and wood survived 13 m. Expressed in Δv the same fall costs
      // every material the same severity, and the material's own toughness decides.
      //
      // crush 4.40 is the SAME BLOW as the old 1.35, re-expressed and then sharpened. It
      // HAS to move because the impulse it multiplies is now mass-normalised: the measured
      // “a storey landed on me” blow (raw 7.0–11.0 N·s, Δv 3.56–6.31 m/s, `p3-r6-crush` and
      // `pw-r2-meas`) was worth 0.81 of threshold in P3 r6b, and at 4.40 a full-severity one
      // is worth 1.07 — it now kills in a single blow rather than one and a bit. That is the
      // point: stone is the material that is nearly impossible to hurt and then goes all at
      // once. Measured on the l1 gate it is what keeps stone on screen while stone gets far
      // tougher everywhere else — stone fractured on 4 of 8 shots (the arm it was measured
      // against: 3 of 8) for 6 % of settled debris (7 %).
      // An ordinary shove (Δv 0.24 median on l1) still converts to 0.04 of threshold and is
      // thrown away by DAMAGE_FLOOR, and a landing on the lawn does not get this ceiling at
      // all (`land` 0.42) — which is why stone can now be brittle under a storey AND survive
      // being dropped off the tower. Before this round it was the exact opposite: a 1.6 m
      // fall onto grass shattered it and only 1 fracture in 34 was ever a crush.
      // Slow leak + big scar because a crack in masonry does not close.
      damage: { crush: 4.40, land: 0.42, breakDv: 26.0, leak: 0.42, scar: [0.14, 0.32, 0.52] } },
  },

  villain: {
    make: () => new THREE.MeshToonMaterial({
      color: PALETTE.villain, map: clothGrain(), gradientMap: RAMP_SOFT(),
      emissive: new THREE.Color(PALETTE.villainDark), emissiveIntensity: 0.20,
    }),
    /**
     * A VILLAIN IS A BODY, AND BODIES ARE WATER-DENSITY. 0.42 made a grown scammer weigh
     * 0.277 kg — the same as the lightest glass column in l1 and less than every single wood
     * block in it. That is why villains read as the least physical things on screen: beach
     * balls in hats. 0.98 puts one at 0.647 kg: heavier than any glass member, lighter than
     * the big beams, which is where a person belongs in that level.
     *
     * Restitution 0.24 -> 0.08 for the same reason — a person dropped on grass does not come
     * a quarter of the way back up. Friction 0.90 and angular damping 1.60 so a knocked-loose
     * villain skids and stops instead of pinballing; the rolling-resistance brake in
     * villains/base.js handles the trundle and is untouched.
     *
     * villains/base.js's four damage constants are written in metres per second of Delta-v
     * rather than in N.s PRECISELY so this number can move without silently turning a
     * rolling nudge lethal. Read the header there before changing either.
     */
    physics: { density: 0.98, restitution: 0.08, friction: 0.90,
               linearDamping: 0.030, angularDamping: 1.60,
               debris: { linearDamping: 0.03, angularDamping: 1.20, restitution: 0.05, friction: 1.00 },
               breakImpulse: 2.0, sound: 'pop',
      // breakDv is here for completeness only — villains are not Blocks and villains/base.js
      // runs its own Delta-v damage model. Nothing reads this.
      damage: { crush: 0.30, land: 0.50, breakDv: 6.0, leak: 1.20, scar: [0, 0, 0] } },
  },

  ammo: {
    make: () => new THREE.MeshToonMaterial({
      color: PALETTE.ammo, gradientMap: RAMP_STD(),
      emissive: new THREE.Color(PALETTE.ammoDark), emissiveIntensity: 0.28,
    }),
    // The dart's own damping is set by ammo/base.js (0.055 / 0.9) — that pair is P2's arc
    // droop and P1's nose-first flight, and it is deliberately NOT the material's.
    /**
     * DENSITY 2.30 -> 1.60. On 11 Sep the ammo gained BOTH size and speed in the same day —
     * collider radius 0.40 -> 0.52 (medallion.js) and SLING.maxSpeed 14.4 -> 24.0 — and nothing
     * re-priced the punch afterwards. Mass goes as radius cubed, so that pair multiplied the
     * impulse by 2.20 x 1.67 = 3.7x, and a player reported "one big shot breaks the entire
     * structure". Measured on a standard shot at the old value: l1 was WON outright by shot one.
     *
     * MASS IS THE RIGHT LEVER, NOT SPEED. The speed rise is what lets the arc reach the top of
     * the rebuilt levels at all (see the maxSpeed docblock in slingshot.js), and a trajectory
     * under gravity is mass-INVARIANT — so trimming density takes the punch out and leaves the
     * arc, the apex and the whole aim feel untouched. Nothing in sweep-arc needs re-running.
     *
     * 1.60 from a measured sweep (2.30 / 1.60 / 1.15 on all three levels): it is the value that
     * stops the one-shot clear on l1 while a hit still takes out 6 blocks on l2 and 3 of l3's
     * six villains. 1.15 was barely weaker than 1.60 and starts to read as feeble.
     */
    physics: { density: 1.60, restitution: 0.20, friction: 0.55,
               linearDamping: 0.055, angularDamping: 0.90,
               debris: { linearDamping: 0.03, angularDamping: 1.0, restitution: 0.10, friction: 0.90 },
               breakImpulse: Infinity, sound: 'thump' },
  },

  prop: {
    make: () => new THREE.MeshToonMaterial({
      color: PALETTE.prop, gradientMap: RAMP_STD(),
      emissive: new THREE.Color(0x8a4d1c), emissiveIntensity: 0.20,
    }),
    physics: { density: 0.34, restitution: 0.26, friction: 0.70,
               linearDamping: 0.030, angularDamping: 0.40,
               debris: { linearDamping: 0.04, angularDamping: 0.90, restitution: 0.14, friction: 1.00 },
               breakImpulse: 3.6, sound: 'wood',
      // breakDv 8.0 — a novelty cheque is light and floppy: it takes a fall about as well as
      // glass and rather better than it looks. Set explicitly so no block falls back to the
      // legacy mass-dependent path.
      damage: { crush: 0.30, land: 0.70, breakDv: 8.0, leak: 1.00, scar: [0.05, 0.12, 0.25] } },
  },
};

export const MATERIAL_NAMES = Object.keys(PRESETS);

/**
 * @param {'glass'|'wood'|'stone'|'ground'|'soil'|'villain'|'ammo'|'prop'} name
 * @param {object} [overrides] three.js material property overrides -> returns a fresh clone
 */
export function mat(name, overrides) {
  const p = PRESETS[name];
  if (!p) throw new Error(`[materials] unknown preset "${name}". Known: ${MATERIAL_NAMES.join(', ')}`);
  if (overrides) {
    const m = p.make();
    for (const [k, v] of Object.entries(overrides)) {
      m[k] = (k === 'color' || k === 'emissive') ? new THREE.Color(v) : v;
    }
    return { three: m, physics: { ...p.physics } };
  }
  if (!cache.has(name)) cache.set(name, p.make());
  return { three: cache.get(name), physics: p.physics };
}

/** Physics numbers without touching the GPU — for damage maths on entities that share a mesh. */
export function matPhysics(name) {
  const p = PRESETS[name];
  if (!p) throw new Error(`[materials] unknown preset "${name}"`);
  return p.physics;
}

/** Free every cached GPU material. Call on full teardown only. */
export function disposeMaterials() {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}
