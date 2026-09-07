/**
 * level/blocks.js — the destructible structure. This is the piece the player is actually
 * playing WITH, so it gets the most attention.
 *
 * ── THE DAMAGE MODEL ─────────────────────────────────────────────────────────
 * Rapier reports contact FORCE events (newtons). We convert to impulse with `force * FIXED`,
 * which makes the number directly comparable to "mass × closing speed" and therefore to the
 * `breakImpulse` values authored in art/materials.js.
 *
 * A block accumulates damage rather than needing one lethal hit, and damage LEAKS AWAY over
 * about a second. That combination is what produces the two behaviours Angry Birds lives on:
 *   · a structure that is stable at rest (small resting contact forces never accumulate)
 *   · a structure that is catastrophic under load (three medium hits in half a second kill it)
 *
 * ── SEPARATION BEFORE FRAGMENTATION ──────────────────────────────────────────
 * The most important thing in ab_destruction_stone-tower-mid-collapse_01 is what is NOT
 * happening: a bird has just landed a clean hit and almost nothing has fragmented. The tower
 * has come apart AT THE JOINTS and the debris is whole blocks, tumbling. Six pea-sized chips
 * exist in the entire frame, all within a block's width of the contact point.
 *
 * That is a damage-routing decision, not an art decision, and it is enforced in two places:
 *   · `SOURCE_SCALE` — only a projectile does full damage. A neighbouring block shoving you
 *     does 22 % and a loose chunk landing on you does 12 %, so a collapse TOPPLES a tower
 *     instead of dissolving it. Without this, one good hit disintegrates two thirds of the
 *     level and shots two, three and four have nothing left to play with. The two figures
 *     came down from 45/30 when level/structure.js started driving real collapses: once the
 *     whole bay goes over, far more blocks land on each other, and at the old scales that
 *     turned every collapse into an anonymous rubble mound.
 *     `chainScale()` below ramps that 22 % back UP for the one case it wrongly flattens —
 *     a whole storey landing on something — because "a shove is not a landing" and the flat
 *     scale is what made "crushed under a collapsing storey" unbuildable. It is a severity
 *     ramp, not a general softening: below 1.8 m/s of delta-v it is still exactly 22 %.
 *     Its severity axis is delta-v, never absolute N·s — see CRUSH_DV_LO below for why.
 *   · the break thresholds in materials.js, which are spaced so the three materials fail at
 *     visibly different points in the same collapse — and, since round 6, the per-material
 *     `damage` profile beside them (crush efficiency / leak rate / permanent scar), so the
 *     three materials fail in different WAYS and not merely at different numbers.
 *
 * ── FRACTURE ─────────────────────────────────────────────────────────────────
 * Breaking is not "hide the mesh and spawn sprites". The block is CUT into real rigid chunks
 * along a per-material plan (level/fragments.js draws the silhouettes):
 *
 *   wood   2 long halves + 4 slivers, split along the grain, jagged snapped ends
 *   glass  4 quarter-panel triangles + 2 slivers, thrown along the impact vector
 *   stone  1 big lump + 4 smaller ones, rounded and chamfered
 *
 * Every chunk is at least a fifth of the parent's long axis, which is the difference between
 * "the plank snapped" and "the plank turned into confetti". Chips smaller than that are
 * non-physical particles in fx/, because forty rigid bodies per break is a framerate problem
 * and nobody can tell the difference at chip size.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Entity, makeBody, shapes, zAngleOf } from './entity.js';
import { shardGeo, VARIANTS } from './fragments.js';
import { structure } from './structure.js';
import { mat, PALETTE } from '../art/materials.js';
import { inkAll, crackMap, glassChip, glassPane } from '../art/toon.js';
import { emit } from '../events.js';
import { world } from '../world.js';
import { physics } from '../physics.js';
import { rng, rngRange, rngJitter } from '../rng.js';

const DEPTH = 1.05;                 // visual + collider z-extent. Constant: this is a 2.5D game.
/**
 * Hard cap on live debris bodies; oldest culled first. Raised from 70 because a proper cut
 * plan is 5–6 chunks per block rather than 2–3, and hitting the cap mid-collapse deletes
 * wreckage in front of the player — which reads far worse than the frame cost of carrying it.
 */
const MAX_DEBRIS = 130;
// Long enough that the wreckage is still on the ground when the level-clear camera frames it —
// the "look what you did" shot is the payoff, and an empty field is not it. The cap, not the
// clock, is what keeps the body count honest during a long cascade.
const DEBRIS_LIFE = 9.0;

/**
 * Who hit you decides how much it hurts. See the header — this is the whole
 * separation-before-fragmentation rule, expressed as a set of numbers.
 *
 * `ammo` is the reference 1.0 only for a projectile that has already stopped being a
 * projectile; a live one is amplified by `ammoPunch()` below.
 */
const SOURCE_SCALE = { ammo: 1.0, block: 0.22, debris: 0.12, villain: 0.30, ground: 0.30, prop: 0.5 };

/**
 * ── A SHOVE IS NOT A LANDING ─────────────────────────────────────────────────
 * `SOURCE_SCALE` is flat, and that flatness is the second half of round 6's gap. It says a
 * 0.27 kg glass column brushing you and a 1.6 kg lintel arriving from four metres up are
 * both "a block", worth 22 % — so the brief's "or being crushed under a collapsing storey"
 * had no path into the damage model at all.
 *
 * MEASURED, do not re-derive (`_tools/scenarios/p3-r6-crush.mjs` and `pw-r2-meas.mjs`,
 * per-block per-tick contact load across l1 collapses). The Δv column is the same events
 * divided by the struck block's own mass:
 *   · an ordinary chain shove is 0.1–4 N·s raw — Δv 0.24 (stone) to 1.05 (glass) at the
 *     median, and the 90th percentile is still under 2.5 m/s for every material;
 *   · a storey landing on you is 6–13 N·s raw / **Δv 3.6–6.3 m/s** — a stone cube took
 *     hiPeaks of 6.1, 7.3, 8.1, 9.2, 10.7 and 10.8 across four shots and, at a flat 0.22,
 *     recorded 0.00 damage for all of them;
 *   · and the load does NOT vanish afterwards: the same stone then carried 0.39–0.90 N·s per
 *     tick — three to eight times its own weight — for two full seconds.
 *
 * That last number is why this is an impact ramp and NOT an integrator over sustained load.
 * A sustained-load channel fires whenever the pile happens to reach its total, which on the
 * measured windows is one to two seconds AFTER the collapse has stopped moving: the player
 * would watch a settled rock explode on its own with nothing touching it. Cause has to stay
 * visible, so the crush is delivered by the blow that does the crushing.
 *
 * Quadratic, not linear, so the ramp is a severity read rather than a general softening:
 * at the 1.8 m/s toe it is still exactly the base scale and the "separation before
 * fragmentation" behaviour of every ordinary collapse is untouched.
 *
 * ── THE BAND IS IN Δv, NOT IN N·s. THAT IS PW ROUND 2'S FIX ──────────────────
 * It used to be `CRUSH_LO/HI = 3.5 / 12.0 N·s`, and an absolute-N·s band cannot be a
 * severity read, because the impulse the solver reports is what the STRUCK body absorbed
 * and it scales with that body's own mass. So the ramp measured "how heavy am I" and
 * called it "how hard was I hit": a 1.96 kg stone cube reached the top of the ramp from a
 * 1.1 m fall onto grass, while a 0.34 kg glass cube never reached it at all. Stone
 * shattered from 1.6 m; glass and wood survived 13 m. **The heaviest material was the most
 * fragile**, which reads instantly as wrong and is the gap this round exists to close.
 * The band is now the same events in Δv (3.5 / 12.0 N·s were 1.79 / 6.13 m/s on the stone
 * cube they were authored against, so 1.8 / 6.1 keeps stone's measured crush behaviour to
 * two decimals while making it mass-invariant).
 */
const CRUSH_DV_LO = 1.8;
const CRUSH_DV_HI = 6.1;

/**
 * ── THE GROUND IS NOT A STOREY ───────────────────────────────────────────────
 * A static source (the ground, the soil) gets its own crush ceiling instead of the struck
 * material's, and that is not a fudge — it is the difference the ramp is actually reading.
 * `damage.crush` is brittleness under a CONCENTRATED load: a beam corner arriving on one
 * face of a block. The lawn is a flat compliant half-space meeting the whole face, so the
 * same Δv is a different kind of blow. Physically it is the same distinction that makes a
 * granite kerbstone survive being dropped flat and split when a lintel lands on its edge.
 *
 * Mechanically it is what lets stone be BOTH: brittle under a storey (crush 3.35) and the
 * toughest thing in the level to drop (0.85 here, against a breakDv of 26). Without the
 * split, a Δv high enough to crush stone under a beam is also reached by a 1.3 m fall and
 * the inversion comes straight back in a new coordinate system.
 *
 * It is per material (`damage.land`), and it has to be a SECOND number rather than a reuse
 * of `crush` or of `breakDv`, because "how well do I survive being dropped" and "how well do
 * I survive the collapse shoving me" are two independent behaviours and one constant cannot
 * hold both. Measured, with a single global ceiling of 0.85 and nothing else: the fall ladder
 * came out glass 1.6 m / wood 2.2 m / stone never — the inversion gone, but wood only 1.4x
 * tougher than glass, i.e. two of the three materials still landing alike. Lowering `breakDv`
 * to separate them would have made wood 2.4x tougher in the CHAIN as well, which is P3's
 * ground and not mine to spend. With `land` the ladder is glass 1.6 m / wood 7.5 m / stone
 * still standing at 13 m on 0.41 of its threshold — monotone in mass, and 4.7x apart.
 *
 *     glass 1.05  a pane shatters when it hits the floor. This is the one material whose
 *                 landing is MORE dangerous than its own bulk toughness suggests.
 *     wood  0.50  chosen so l1's own beams land exactly as they did before this round
 *                 (0.30 x mass x Δv equals 0.50 x thr x Δv / breakDv at the 1.60 kg bottom
 *                 beam, to two decimals) — the change is meant to be visible on a lone
 *                 falling cube, not to quietly re-tune a level P3 signed off.
 *     stone 0.42  a rock lands and stays. Nothing l1 can drop from its own height marks it.
 *
 * The ramp's quadratic toe means l1's ORDINARY landings are untouched either way: measured
 * Δv p90 on the ground channel is wood 1.38, glass 1.05, stone 0.25, against a toe at 1.8,
 * so ~95 % of ground contacts in a real collapse sit at the flat 0.30 base to three decimals.
 * Only a genuine drop reaches the ceiling — which is the whole point of a severity ramp.
 */
const GROUND_CRUSH = 0.50;          // fallback for a material with no `land` of its own
const STATIC_SRC = { ground: 1, soil: 1 };

/** Fallback for anything whose material predates per-material failure modes. */
const DEFAULT_DMG = { crush: 0.22, land: GROUND_CRUSH, breakDv: null, leak: 0.85, scar: [0, 0, 0] };

/**
 * @param {string} tag    source entity tag
 * @param {number} dv     Δv this contact imposed on the struck block, m/s (mass-invariant)
 * @param {{crush:number}} dmg  the STRUCK block's failure mode (art/materials.js)
 */
function chainScale(tag, dv, dmg) {
  const base = SOURCE_SCALE[tag] ?? 0.5;
  const ceiling = STATIC_SRC[tag] ? (dmg.land ?? GROUND_CRUSH) : dmg.crush;
  if (!(ceiling > base)) return base;
  const k = (dv - CRUSH_DV_LO) / (CRUSH_DV_HI - CRUSH_DV_LO);
  const t = k < 0 ? 0 : k > 1 ? 1 : k;
  return base + (ceiling - base) * t * t;
}

/**
 * ── A PROJECTILE IS A POINT LOAD, NOT A SHOVE ────────────────────────────────
 * This exists because the thresholds in art/materials.js were authored against a number
 * the engine does not actually produce, and the whole material vocabulary died in the gap.
 *
 * The authored premise was "a 0.62 kg dart at 15 m/s arrives with ~9 N·s of momentum, so
 * a threshold of 17 means stone needs a really good hit". What Rapier reports in a contact
 * force event is not the projectile's momentum — it is the impulse the STRUCK BODY was
 * able to absorb in that solver step, which is bounded by the struck body's own mass and
 * how well it is braced. Measured over 69 landed shots
 * (`_tools/scenarios/p3-r6-punch.mjs`): closing speed is 14–17 m/s on essentially every
 * shot that reaches the tower, and the first-contact impulse that produces ranges
 * 0.7–11.8 N·s — a light 0.27 kg glass column takes 3, a braced 1.6 kg beam takes 11.8.
 *
 * So the ceiling on ANY projectile hit was ~9.5 N·s against thresholds of 9.5 (wood) and
 * 17.0 (stone). Consequences, all measured on the l1 8-shot gate before this change:
 *   · stone fractured 0 times in 8 shots and 0 times in a 24-shot direct-probe sweep. The
 *     stone lump shard vocabulary in fragments.js had never once appeared on screen.
 *   · 88 % of settled debris was glass, 12 % wood, 0 % stone.
 *   · and the deeper version of the same bug: the fracture impulses were G0.4, G0.5, W1.8
 *     — i.e. NOTHING was ever fragmented by the projectile itself. Every break in the game
 *     was an accumulation of chain jostling, which is the exact inverse of the rubric's
 *     "fragmentation happens only where the projectile actually hit".
 *
 * The fix is on the delivery side, not the threshold side, because that is where the error
 * is: what breaks a block is the energy a fast dart concentrates on a few square
 * centimetres, not the momentum a free-standing block happens to absorb before it is
 * pushed away. `AMMO_PUNCH` restores that, and it deliberately multiplies the SOLVER's
 * number rather than replacing it — the contact impulse already encodes how square the hit
 * was, how well braced the target was and how much mass was behind it, and all three of
 * those are exactly what should separate a good shot from a graze. Amplifying it keeps
 * that shape and only fixes its scale.
 *
 * Nothing else changes: `block`, `debris`, `villain` and `ground` scales are untouched, so
 * round 5's separation numbers (BROKE, COHESION, STANDING) survive intact — the chain is
 * as hard to kill anything with as it was, and the projectile is no longer feeble.
 *
 * THE SPEED RAMP IS NOT OPTIONAL. Ammo is exempt from DAMAGE_FLOOR (see below), so an
 * amplified projectile that has come to rest against a beam would nibble it to death at
 * 2.6× — the very failure the floor exists to prevent, reintroduced through the one hole
 * in it. The amplifier is therefore the IMPACT, not the aftermath: full punch at ≥13 m/s
 * (every shot that reaches the tower lands at 14–17), tapering to exactly 1.0 — today's
 * behaviour — by 6 m/s, which is roughly the speed a dart is still doing as it tumbles
 * through wreckage.
 */
const AMMO_PUNCH = 2.6;
const PUNCH_V0 = 6.0;              // at or below this the projectile is just a loose body
const PUNCH_V1 = 13.0;             // at or above this it is still travelling like a shot

/** @param {number} v the projectile's PRE-collision speed (Entity.lastSpeed), m/s */
function ammoPunch(v) {
  const k = (v - PUNCH_V0) / (PUNCH_V1 - PUNCH_V0);
  return 1 + (AMMO_PUNCH - 1) * (k < 0 ? 0 : k > 1 ? 1 : k);
}

/**
 * A BUMP IS NOT A BLOW. An event carrying less than this fraction of the block's own break
 * threshold does no damage at all — it is not scaled down, it is ignored.
 *
 * Damage accumulates and leaks at 0.85 x threshold per second, which is the right model for
 * "three medium hits in half a second kill it". It is the WRONG model for a two-second
 * collapse: measured on l1, a 4.80 m lintel died at 9.51 / 9.50 from a 0.40 N·s nudge, and a
 * standing post died at 9.61 / 9.50 from 1.55 N·s — 4 % and 16 % events that were lethal only
 * because forty pieces of falling wreckage had jostled them first. That is death by a thousand
 * taps, and it is what turned a collapse into anonymous rubble: 12 of 17 blocks fragmenting on
 * a single shot, against a reference frame (`ab_destruction_debris-settled-at-rest_06`) whose
 * settled wreck is almost entirely WHOLE planks lying at angles with painted cracks.
 *
 * With the floor in, a block dies from real blows. Debris raining on a beam still shoves it,
 * still cracks nothing, and the beam survives to lie in the pile as a beam.
 *
 * A TRAVELLING PROJECTILE IS EXEMPT, and that exemption is the whole rule rather than a
 * special case: "fragmentation happens only where the projectile actually hit". A grazing
 * shot has to leave a crack — with the floor applied to ammo as well, an entire shot on l1
 * measured MOVED 0 / BROKE 0 / 17 standing, which is the dead-zone failure P2 spent a round
 * removing. Every graze worth rescuing lands at 14–17 m/s, so the exemption costs nothing
 * by being gated on speed.
 *
 * IT IS GATED ON SPEED, at the same PUNCH_V0 the amplifier uses, and it has to be. Measured
 * on the l1 gate (`_tools/scenarios/p3-r6-chain.mjs`): after a shot resolves, the spent dart
 * comes to rest leaning on a beam and emits THIRTY-ODD contact events at 1–2 m/s carrying
 * 0.1–0.2 N·s each. Un-gated, those are floor-exempt and they walked a 9.5 N·s wood beam to
 * 0.96 of its threshold — death by a thousand taps, arriving through the one hole in the
 * floor, from a projectile that had stopped being a projectile. Above PUNCH_V0 it is a shot
 * and nothing is filtered; below it, it is a loose body and it is filtered like one.
 *
 * MEASURED AND REJECTED — do not re-derive it. Dropping the floor to 30 % of itself once a
 * block is visibly cracked is an appealing idea (`showDamage()` below promises the player
 * that a cracked block means "the next hit does it") and it is a bad trade: on the l1 gate it
 * put BROKE straight back to a median of 8 of 17, standing-at-settle down to 9, and every one
 * of the eight sampled shots back to a one-shot clear — and it did NOT rescue either of the
 * two grazing shots it was introduced for. The crack decal earns its keep as a *warning*; the
 * floor has to stay flat.
 */
const DAMAGE_FLOOR = 0.16;

const geoCache = new Map();
function boxGeo(w, h, d, r) {
  const k = `${w.toFixed(3)}x${h.toFixed(3)}x${d.toFixed(3)}r${r.toFixed(3)}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, r));
  return geoCache.get(k);
}

export class Block extends Entity {
  /**
   * @param {object} o { matName, x, y, w, h, rot }
   */
  constructor({ matName = 'wood', x, y, w, h, rot = 0, depth = DEPTH, fixed = false }) {
    const m = mat(matName);
    const { body, collider } = makeBody({
      kind: fixed ? 'fixed' : 'dynamic',
      x, y, rot, m,
      shape: shapes.box(w, h, depth),
      // No damping literals here. A block's damping IS its material — wood tumbles, stone
      // stops dead, glass keeps spinning while it slides — and makeBody reads that off
      // art/materials.js. These two lines used to say 0.06 / 0.30 for every material in the
      // game, which is how a stone cube and a wood beam came to fall in exactly the same way.
      contactForce: 18,             // ~0.15 N·s — below any interesting hit, above resting noise
      sleepy: true,
    });

    // Bevel radius scaled to the smaller dimension: chunky beams, crisp panes.
    // Glass gets a third of the chamfer wood and stone get. A pane is CUT — it has arrises,
    // not rolled edges — and at column widths the house bevel rounded a 0.62 m pane into a
    // test tube, which is the opposite of "flat faceted".
    const r = matName === 'glass'
      ? Math.min(0.038, Math.min(w, h) * 0.09)
      : Math.min(0.10, Math.min(w, h) * 0.22);
    const g = boxGeo(w, h, depth, r);
    // Glass gets a pane texture cut to ITS OWN world size, so the bevel frame is the same
    // width on a 0.40 m column and a 1.40 m lintel. See art/toon.js glassPane(): a single
    // square tile stretched over a 6.5:1 column is what turned every pane into a striped
    // tube in round 2.
    const mesh = new THREE.Mesh(g, matName === 'glass' ? glassBase(w, h) : m.three);
    mesh.castShadow = !fixed;
    // Glass casts a contact shadow like every other block, but never RECEIVES one. Its whole
    // job is to be the brightest value in the frame; a beam's shadow falling across a pane
    // drops it two value steps and it disappears into the sky again, which is the failure
    // this round exists to fix. The reference ice blocks carry no cast shadows either.
    mesh.receiveShadow = matName !== 'glass';
    // Glass is opaque now (art/materials.js), so it is an ordinary block in every respect:
    // it writes depth, it casts a contact shadow, it sorts in the opaque pass, and it takes
    // the same inverted-hull ink as wood and stone. The only difference is the ink COLOUR —
    // a darker tint of glass's own hue rather than the house navy, which is what P7 asks a
    // block contour to be and what the reference ice blocks actually have.
    // Glass takes a THINNER contour than wood and stone as well as a lighter one. The ink
    // is an inverted hull whose width is constant in screen space, so on a 0.40 m column
    // the house 0.048 laid ~10 px of outline on each side of a 36 px block — the ink was
    // 36 % of the material. 0.026 puts it back to a drawn edge.
    inkAll(mesh, matName === 'glass' ? 0.026 : 0.048,
           matName === 'glass' ? PALETTE.glassInk : undefined);

    super({ mesh, body, collider, material: m, tag: 'block' });

    this.matName = matName;
    this.w = w; this.h = h; this.depth = depth;
    this.damage = 0;
    /** This material's failure mode — crush efficiency, leak rate, permanent scar. */
    this.dmg = m.physics.damage ?? DEFAULT_DMG;
    /**
     * MASS AND TOUGHNESS, the pair that makes the chain damage channel mass-invariant.
     * `mass` is fixed for the life of the body (geometry x density), so it is read once.
     * `breakDv` is the Δv this MATERIAL cannot survive (art/materials.js); the fallback
     * `breakImpulse / mass` is this block's own Δv-to-break, i.e. exactly the legacy
     * mass-dependent behaviour, so a material that has not declared one is unchanged.
     */
    this.mass = Math.max(body.mass(), 1e-6);
    this.breakDv = this.dmg.breakDv ?? (m.physics.breakImpulse / this.mass);
    /** Damage never leaks below this. Raised (only ever raised) by showDamage(). */
    this.scarFloor = 0;
    this.crackStep = -1;
    this.broken = false;
    this.fixed = fixed;
    this.lastImpulse = 0;
    /** Joules delivered by the last real CONTACT this block took, and the solver tick it
     *  landed on. level/structure.js budgets its collapse writes against this. */
    this.lastBlowE = 0;
    this.lastBlowTick = -1e9;
    /** True once this blow's joules have been paid into structure.js's ledger, so a
     *  fracture cannot credit the same contact a second time. */
    this.lastBlowCredited = false;
    /** Unit vector of whatever last hit this block. The debris fans along it. */
    this.hitDir = new THREE.Vector3(1, 0, 0);
    world.scene.add(mesh);
    if (!fixed) world.blocks.push(this);
  }

  onImpact(impulse, other, point, approach = 0) {
    if (this.fixed || this.broken) return;
    // A resting contact carries an enormous force (the whole tower above it) but zero
    // approach speed. Without this gate a settled structure damages itself to death in
    // half a second. Something has to be MOVING for it to be a hit.
    if (approach < 1.2) return;
    // Past the gate: something is genuinely moving against this block. Open level/structure.js's
    // audit window, and tell it which way the energy is going — support has to be re-read
    // while things are in motion, and a shot that shoves a storey clear WITHOUT breaking
    // anything is exactly the case a break-armed audit misses. Nothing above this line can
    // be reached by a settled tower, which is the whole of that audit's safety argument.
    structure.arm(other ? other.velocity(_v3).x : undefined);

    const thr0 = this.material.physics.breakImpulse;
    /**
     * ── THE CONTACT ENERGY THIS BLOW ACTUALLY DELIVERED, IN JOULES (PW r3) ──────
     * Everything below this line converts the solver's impulse into DAMAGE units — it is
     * multiplied by `ammoPunch`, restated in Δv, ramped by `chainScale`. That number is a
     * severity read and it is deliberately not conserved; it must never be mistaken for
     * energy. `level/structure.js` needs a real, conserved, joules-denominated figure to
     * budget its collapse writes against, so take it here, from the RAW impulse, before a
     * single scale factor touches it.
     *
     * For a collision that exchanges impulse J while closing at v, the mechanical energy
     * removed from the pair is exactly ½·J·v (J = μ·v for a fully inelastic head-on, and
     * the energy lost is ½·μ·v²). It is the honest ceiling on what this hit can pay for,
     * and it is denominated in the same joules the fixed-cohort energy audit measures in.
     * Measured on l1: a square dart hit reports 60–75 J, i.e. the dart's own kinetic
     * energy, which is the sanity check that says the formula is the right one.
     */
    this.lastBlowE = 0.5 * impulse * approach;
    this.lastBlowTick = physics.tick;
    this.lastBlowCredited = false;
    // A live projectile is a point load (see AMMO_PUNCH); anything else — including a spent
    // dart rolling around in the wreckage — is a shove.
    const flying = other?.tag === 'ammo' && (other.lastSpeed ?? 0) >= PUNCH_V0;
    if (flying) {
      /**
       * ── PAY THE COLLAPSE LAYER'S LEDGER HERE, AT THE CONTACT (PW r3) ────────────
       * This is the one place in the game where mechanical energy enters the level from
       * outside it: a projectile the player launched, still travelling like one, striking
       * a block. `level/structure.js` may only spend what a real contact delivered, so the
       * credit belongs at the contact and NOT at the fracture — a blow that shakes the
       * tower without breaking anything is still a blow, and under a fracture-only ledger
       * it bought exactly nothing (measured on l1 0.32@0.94: an 18 N·s hit, no fracture,
       * pool 0, and the frame sat at its authored pose while the audit's every write was
       * refused for want of a budget).
       *
       * Crediting here also closes the money-printing loop by construction rather than by
       * a freshness window: a contact between two blocks the layer itself set moving is
       * NOT credited, so the layer can never be handed a budget for the consequences of
       * its own spending. The only inputs are the player's shots.
       */
      structure.creditContact(this.lastBlowE);
      this.lastBlowCredited = true;
      impulse *= ammoPunch(other.lastSpeed);
    } else {
      /**
       * THE CHAIN AND THE WORLD ARE MEASURED IN Δv, THE PROJECTILE IS NOT. (PW r2)
       *
       * `impulse / mass` is the speed change this contact imposed on me — mass-invariant
       * by construction, and the only honest way to ask "how hard was that". Dividing by
       * `breakDv` states it in units of the Δv this MATERIAL cannot survive, and
       * multiplying by my own threshold hands the rest of the model (the floor, the leak,
       * the scar, `damage >= thr`) exactly the currency it already speaks, so nothing
       * downstream changes shape. Algebraically it is the old `raw * scale` multiplied by
       * `thr / (mass * breakDv)`, which is 1.0 for a block whose own thr/mass IS its
       * material's breakDv — the size dependence, and only the size dependence, is gone.
       *
       * The projectile deliberately keeps the raw, mass-proportional number. That is not
       * an inconsistency: `AMMO_PUNCH` exists (ARCHITECTURE.md decision 7) because the
       * solver's impulse already encodes how square the hit was, how braced the target was
       * and how much mass was behind it, and P3 round 6 bought the game's whole
       * fragmentation vocabulary with that shape. A shot is a point load aimed by a
       * player; a collapse is a mass falling on a mass.
       */
      const dv = impulse / this.mass;
      impulse = thr0 * (dv / this.breakDv) * chainScale(other?.tag, dv, this.dmg);
    }
    // Below the floor this is jostling, not damage. Return before touching `damage` or the
    // crack decal so a block cannot be nibbled to death by wreckage landing on it. Anything
    // the player actually shot, while it is still travelling like a shot, always counts.
    if (!flying && impulse < thr0 * DAMAGE_FLOOR) return;
    this.lastImpulse = impulse;
    this.damage += impulse;

    // Remember the direction the blow came from, so a fracture fans its debris the way the
    // energy was actually travelling. A radial burst from the contact point is the
    // "symmetrical starburst" the reference frames never show.
    if (other) {
      const v = other.velocity(_v3);
      if (v.lengthSq() > 1) this.hitDir.copy(v).setZ(0).normalize();
      else this.hitDir.set(this.body.translation().x - point.x, this.body.translation().y - point.y, 0)
        .normalize();
    }

    if (this.damage >= thr0) this.fracture(impulse, point ?? this.position(new THREE.Vector3()));
    else this.showDamage(this.damage / thr0);
  }

  /**
   * A STRUCTURAL SHOCK — the tower shoving this block, delivered by level/structure.js a
   * few solver steps after a neighbour came apart. It is deliberately NOT routed through
   * `onImpact`: there is no contact, no approach speed and no contact force to gate on, and
   * the whole point is that this block is reacting to something that happened somewhere
   * else in the structure.
   *
   * It carries only a tenth of the wave's energy as damage (structure.js SHOCK_DAMAGE),
   * because P3's first rule is separation before fragmentation — a shock's job is to move
   * its neighbours, not to dissolve them. What it DOES do is re-aim `hitDir`, so that if
   * the accumulated damage does finish this block off, its debris fans the way the collapse
   * is travelling rather than the way the original projectile was.
   */
  onShock(dmg, ux, uy) {
    if (this.fixed || this.broken) return;
    if (Number.isFinite(ux) && Number.isFinite(uy)) this.hitDir.set(ux, uy, 0).normalize();
    this.damage += dmg;
    const thr = this.material.physics.breakImpulse;
    /**
     * A shock-driven fracture has NO contact of its own, and it credits `structure.js`'s
     * energy ledger with NOTHING — the ledger's only depositor is `creditContact()` above,
     * on a live projectile's contact, so the layer can never be handed a budget for the
     * consequences of its own writes. `lastBlowE` is left alone here because it belongs to
     * whatever real contact last landed on this block; it is a record, not a credit.
     */
    if (this.damage >= thr) this.fracture(Math.max(dmg, thr * 0.5), this.position(new THREE.Vector3()));
    else this.showDamage(this.damage / thr);
  }

  /**
   * The pre-break read. A cracked block has to tell you "the next hit does it" from across
   * the level, and it has to do that WITHOUT changing silhouette — the reference wreckage in
   * ab_destruction_debris-settled-at-rest_06 is still recognisably planks, carrying a painted
   * split. So damage is a decal swap on the same mesh, in three steps, and it only ever goes
   * up (a block that has been badly hurt does not visually heal while its damage leaks away).
   */
  showDamage(k) {
    const step = k > 0.72 ? 2 : k > 0.44 ? 1 : k > 0.20 ? 0 : -1;
    if (step <= this.crackStep) return;
    this.crackStep = step;
    // The crack is now permanent, so a share of the damage is too. `scar` is what makes a
    // very strong hit and a later heavy crush ADD UP instead of the first one evaporating.
    this.scarFloor = Math.max(this.scarFloor,
      this.material.physics.breakImpulse * (this.dmg.scar[step] ?? 0));
    this.mesh.material = crackedVariant(this.matName, step, this.w, this.h);
  }

  update(dt) {
    // Damage leaks away, so a structure sitting under its own weight never self-destructs —
    // but only down to the scar. Glass forgets fast (1.6/s) and scars not at all; masonry
    // leaks at 0.42/s and keeps up to 52 % of its threshold once it is visibly split.
    if (this.damage > this.scarFloor) {
      this.damage = Math.max(this.scarFloor,
        this.damage - dt * this.material.physics.breakImpulse * this.dmg.leak);
    }
  }

  /**
   * Cut the block into real rigid chunks. Returns the child entities (ARCHITECTURE.md:
   * "Breakables implement fracture(impulse, point) returning child entities").
   */
  fracture(impulse, point) {
    if (this.broken) return [];
    this.broken = true;

    const pos = this.position(new THREE.Vector3());
    const ang = zAngleOf(this.body);
    const vel = this.velocity(new THREE.Vector3());
    const av = this.body.angvel();

    emit('break', {
      material: this.matName, point: { x: point.x, y: point.y, z: 0 },
      impulse, block: this, w: this.w, h: this.h,
      dir: { x: this.hitDir.x, y: this.hitDir.y },
    });
    emit('score', { point: { x: pos.x, y: pos.y + 0.5, z: 0 },
      amount: this.matName === 'stone' ? 800 : this.matName === 'wood' ? 500 : 300 });

    /**
     * THE PROPAGATION HAND-OFF. Everything above and beside this block has just lost a
     * member; level/structure.js knows what that block was holding up and shoves the rest
     * of the tower accordingly, a few solver steps later so the collapse staggers down the
     * structure instead of twitching on one frame. Called BEFORE the debris exists so the
     * graph is unlinked exactly once, and before destroy() so the node is still there.
     */
    structure.onCollapse(this, impulse, this.hitDir);

    const kids = [];
    const pieces = cutPlan(this.matName, this.w, this.h);

    // The fan direction, in the block's own frame plus a little of the outward push. 65/35 is
    // the mix that reads as "blown through" rather than "exploded from within".
    const dx = this.hitDir.x, dy = this.hitDir.y;

    for (const p of pieces) {
      if (world.debris.length >= MAX_DEBRIS) cullOldestDebris();
      const lx = p.x, ly = p.y;
      const wx = pos.x + lx * Math.cos(ang) - ly * Math.sin(ang);
      const wy = pos.y + lx * Math.sin(ang) + ly * Math.cos(ang);
      const d = new Debris({
        matName: this.matName, x: wx, y: wy, rot: ang + rngJitter(0.25),
        w: p.w, h: p.h, depth: this.depth * rngRange(0.62, 0.95),
        cracked: p.cracked !== false,
      });
      let rx = wx - point.x, ry = wy - point.y;
      const L = Math.hypot(rx, ry) || 1;
      // Bigger pieces get less of the kick — that is what makes the debris cone read
      // "biggest lowest, smallest highest and furthest" (impact-burst-tower-splitting_03).
      const massK = 1 / (0.55 + p.rel * 1.6);
      const kick = Math.min(9.5, 1.6 + impulse * 0.34) * massK;
      d.body.setLinvel({
        x: vel.x + (dx * 0.65 + (rx / L) * 0.35) * kick + rngJitter(1.0),
        y: vel.y + (dy * 0.65 + (ry / L) * 0.35) * kick * 0.85 + rngRange(0.5, 2.9),
        z: 0,
      }, true);
      d.body.setAngvel({ x: 0, y: 0, z: av.z + rngJitter(9) }, true);
      kids.push(d);
    }

    this.destroy();
    return kids;
  }
}

const _v3 = new THREE.Vector3();

// ---------------------------------------------------------------------------
// THE CUT PLANS — one per material. Everything is in the block's own local frame,
// x/y = piece centre, w/h = piece size, `rel` = this piece's share of the parent
// (used for the mass-weighted kick, so a half-beam does not fly like a chip).
// ---------------------------------------------------------------------------

function cutPlan(matName, w, h) {
  const along = w >= h;              // true when the block's long axis is X
  const L = along ? w : h;           // length along the grain
  const T = along ? h : w;           // thickness across it
  const raw = matName === 'glass' ? glassPlan(L, T)
    : matName === 'stone' ? stonePlan(L, T)
    : woodPlan(L, T);
  // Plans are authored along +X; flip into the block's real orientation.
  if (along) return raw;
  return raw.map(p => ({ x: p.y, y: p.x, w: p.h, h: p.w, rel: p.rel, cracked: p.cracked }));
}

/**
 * WOOD — "2 long halves + 3–5 slivers", exactly as the reference reads. The halves keep the
 * full thickness of the beam and roughly 45 % of its length each, so the settled pile is
 * still recognisably made of planks; the slivers are thin, short, and come off the face
 * where the blow landed.
 */
function woodPlan(L, T) {
  const cut = rngRange(0.42, 0.56);           // where along the beam it snapped
  const out = [
    { x: -L / 2 + (L * cut) / 2, y: rngJitter(T * 0.05), w: L * cut * 0.94, h: T * rngRange(0.82, 0.96), rel: cut },
    { x: L / 2 - (L * (1 - cut)) / 2, y: rngJitter(T * 0.05), w: L * (1 - cut) * 0.94, h: T * rngRange(0.82, 0.96), rel: 1 - cut },
  ];
  const n = 3 + Math.floor(rng() * 2);        // 3 or 4 slivers
  for (let i = 0; i < n; i++) {
    const sl = L * rngRange(0.20, 0.36);
    out.push({
      x: rngRange(-L * 0.42, L * 0.42),
      y: (i % 2 ? 1 : -1) * T * rngRange(0.18, 0.34),
      w: sl, h: T * rngRange(0.24, 0.40),
      rel: sl / L,
    });
  }
  return out;
}

/**
 * GLASS — chunky quarter panels plus three chips.
 *
 * The plan used to halve the pane on BOTH axes, which is only "a quarter of the block" when
 * the block is roughly square. Our glass is authored as columns: a 0.40 × 2.60 pane halved
 * both ways gives four 0.16 × 1.1 pieces — 1 : 7 blades. On screen that is a handful of
 * icicles or drinking straws, not the flat faceted quarter-panels of
 * ab_destruction_glass-shatter-and-rubble_02, and it was the last thing about our glass that
 * read as the wrong material.
 *
 * So the pane is chopped ACROSS its long axis only, into panels roughly one-and-a-bit
 * thicknesses long. Every piece keeps the full thickness of the parent and comes out near
 * square whatever shape the parent was — 4 panels + 3 chips from a column, 2 + 3 from a
 * lintel, always inside the rubric's 4–8 and always at least a sixth of the block. Glass
 * never gets a crack decal; a shard IS the crack.
 */
function glassPlan(L, T) {
  const n = Math.max(2, Math.min(4, Math.round(L / (T * 1.1))));
  const out = [];
  let x = -L / 2;
  for (let i = 0; i < n; i++) {
    const cw = (L / n) * rngRange(0.86, 1.14);
    out.push({
      x: x + cw / 2 + rngJitter(L * 0.015), y: rngJitter(T * 0.04),
      w: cw * 0.94, h: T * rngRange(0.84, 1.0),
      rel: cw / L, cracked: false,
    });
    x += cw;
  }
  // the chips that come off the face the projectile actually touched
  for (let i = 0; i < 3; i++) {
    const s = T * rngRange(0.34, 0.54);
    out.push({
      x: rngRange(-L * 0.40, L * 0.40), y: (i % 2 ? 1 : -1) * T * rngRange(0.12, 0.26),
      w: s * rngRange(0.85, 1.35), h: s,
      rel: s / L, cracked: false,
    });
  }
  return out;
}

/**
 * STONE — rounded lumps, and the important word is LUMP. Stone must NOT be cut into slabs the
 * way wood is: a fragment scaled 1.2 × 0.3 is a slab whatever silhouette you draw on it, and
 * a slab is a plank. So the block is chopped across its long axis into roughly-square pieces
 * (one per thickness of length), each keeping most of the parent's thickness, plus two smaller
 * chips. Compare ab_destruction_stone-tower-mid-collapse_01: the grey debris there is chunky
 * and near-equilateral, never long.
 */
function stonePlan(L, T) {
  const n = Math.max(2, Math.min(4, Math.round(L / T)));
  const out = [];
  let x = -L / 2;
  for (let i = 0; i < n; i++) {
    const cw = (L / n) * rngRange(0.86, 1.14);
    out.push({
      x: x + cw / 2, y: rngJitter(T * 0.06),
      w: cw * 0.92, h: T * rngRange(0.80, 0.98), rel: cw / L,
    });
    x += cw;
  }
  for (let i = 0; i < 2; i++) {
    const s = rngRange(0.30, 0.46) * T;
    out.push({
      x: rngRange(-L * 0.40, L * 0.40), y: (i % 2 ? 1 : -1) * T * rngRange(0.12, 0.26),
      w: s, h: s * rngRange(0.8, 1.25), rel: s / L,
    });
  }
  return out;
}

/**
 * A chunk of a broken block. Physical, but cheap: no contact events, no CCD, shorter sleep
 * threshold, and it fades and removes itself so a long level cannot accumulate 400 bodies.
 *
 * The MESH is a real per-material shard silhouette (fragments.js); the COLLIDER is the box
 * that silhouette fits inside. See the fragments.js header for why that trade is right.
 */
export class Debris extends Entity {
  constructor({ matName, x, y, rot, w, h, depth, cracked = true }) {
    const m = mat(matName);
    const { body, collider } = makeBody({
      kind: 'dynamic', x, y, rot, m,
      shape: shapes.box(w * 0.94, h * 0.94, depth),
      /**
       * DEBRIS DAMPING IS PER MATERIAL, AND THE LINEAR TERM IS NOW SMALL ON PURPOSE.
       *
       * It used to be a flat 0.42 / 1.5 for every fragment. 0.42 of linear damping is not
       * air drag on a 5 cm chip, it is a brake — it bleeds roughly a third of a chunk's
       * speed away every second, which flattens the top of every debris arc and turns the
       * tail of a collapse into a drift. Measured on l1 (`_tools/scenarios/pw-gate.mjs`,
       * shot 0.30@0.90): 70 % of live fragments were still CRAWLING at 0.25-2.2 m/s a full
       * 1.5 s after the shot, wood chips took a median 1667 ms and a worst 2842 ms to come
       * to rest, and six were still airborne and moving at t=1500 ms. That is the "floaty
       * debris" read, and it was a damping constant, not a physics problem.
       *
       * A fragment now falls ballistically like everything else (0.015-0.04 by material)
       * and is stopped by FRICTION, which is the thing that actually stops rubble: stone
       * chips bite and stay put, wood chips tumble and rock, glass chips skate. The angular
       * term stays material-shaped and high-ish so nothing pinwheels forever.
       */
      linearDamping: m.physics.debris?.linearDamping ?? 0.04,
      angularDamping: m.physics.debris?.angularDamping ?? 1.2,
      contactForce: 0, sleepy: true,
    });
    // A CHIP IS LESS BOUNCY THAN THE BLOCK IT CAME OFF. A whole plank rings; a splinter
    // spends its rebound on rotation and on the ragged face it landed on. Without this the
    // wood chips inherited the block's 0.30 and kept re-bouncing: measured median time to
    // rest 1517 ms and a worst case of 2392 ms, which is the tail of every collapse still
    // twitching long after the camera has settled on it.
    collider.setRestitution(m.physics.debris?.restitution ?? m.physics.restitution);
    /**
     * A CHIP GRIPS HARDER THAN THE BLOCK IT CAME OFF, and this is the pair to the damping
     * change above rather than an afterthought. Dropping debris damping from 0.42 fixed the
     * FLOAT (fragments follow a real parabola again — measured median |dvy|/(g·dt) in free
     * flight 0.994–0.999 against roughly 0.89 before) but it moved the cost to the other end:
     * with no air brake, wreckage kept sliding, and wood chips went from a 1667 ms median
     * time-to-rest to 2117 ms with one travelling 13.75 m.
     *
     * The thing that actually stops rubble is friction, not drag, and a broken chip is not a
     * finished surface: it has ragged faces and a torn edge that digs into grass. So a
     * fragment carries a HIGHER friction than its parent (wood 0.72 -> 1.10, glass 0.16 ->
     * 0.55, stone 1.35 -> 1.35), which keeps the material ORDER intact — glass shards still
     * skate about twice as far as wood chips — while stopping anything from skating for four
     * seconds. Note this cannot be done by raising the material's own friction: a standing
     * glass pane has to stay slippery, that is its whole read.
     */
    collider.setFriction(m.physics.debris?.friction ?? m.physics.friction);

    const variant = Math.floor(rng() * VARIANTS);
    const geo = shardGeo(matName, variant, h > w);
    const mesh = new THREE.Mesh(geo, debrisMaterial(matName, cracked));
    mesh.scale.set(w, h, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = matName !== 'glass';   // see Block: glass never takes a shadow
    inkAll(mesh, matName === 'glass' ? 0.020 : 0.034,
           matName === 'glass' ? PALETTE.glassInk : undefined);

    super({ mesh, body, collider, material: m, tag: 'debris' });
    this.matName = matName;
    this.w = w; this.h = h; this.depth = depth;
    this.fading = false;
    world.scene.add(mesh);
    world.debris.push(this);
  }

  update(dt) {
    const a = this.age;
    if (a > DEBRIS_LIFE) {
      const k = 1 - (a - DEBRIS_LIFE) / 0.8;
      if (k <= 0) { this.destroy(); return; }
      // Clone the shared material only once the piece actually starts to go, so a level's
      // worth of wreckage costs one material per MATERIAL, not one per chunk.
      if (!this.fading) {
        this.fading = true;
        this.baseOpacity = this.mesh.material.opacity;
        this.mesh.material = this.mesh.material.clone();
        this.mesh.userData.ownsMaterial = true;
      }
      this.mesh.material.opacity = this.baseOpacity * k;
      this.mesh.scale.multiplyScalar(0.997);
    }
    if (this.body) {
      const t = this.body.translation();
      if (t.y < -8) this.destroy();
    }
  }
}

function cullOldestDebris() {
  let oldest = null;
  for (const d of world.debris) if (!oldest || d.bornTick < oldest.bornTick) oldest = d;
  oldest?.destroy();
}

// ---------------------------------------------------------------------------
// MATERIALS — cracked block variants and the shared debris materials.
// Both are cached by (material, state); nothing here allocates per object.
// ---------------------------------------------------------------------------
const crackCache = new Map();

/**
 * The undamaged glass material for a block of this world size. One clone of the glass preset
 * per size, carrying that size's pane texture on BOTH `map` and `emissiveMap` — the emissive
 * is keyed off the same canvas so the cyan lift follows the facets instead of flooding the
 * pane flat (art/materials.js explains the gain).
 */
function glassBase(w, h) {
  const key = `glass:${(Math.round(w * 20) / 20)}x${(Math.round(h * 20) / 20)}`;
  if (!crackCache.has(key)) {
    const m = mat('glass').three.clone();
    m.map = glassPane(w, h);
    m.emissiveMap = m.map;
    m.needsUpdate = true;
    crackCache.set(key, m);
  }
  return crackCache.get(key);
}

/** A block that has been hurt: same colour family, a painted split, slightly grubbier. */
function crackedVariant(matName, step, w = 1, h = 1) {
  const qw = Math.round(w * 20) / 20, qh = Math.round(h * 20) / 20;
  const key = matName === 'glass' ? `blk:glass:${step}:${qw}x${qh}` : `blk:${matName}:${step}`;
  if (!crackCache.has(key)) {
    const base = matName === 'glass' ? glassBase(w, h) : mat(matName).three;
    const m = base.clone();
    // clone(): crackMap caches one texture per (material, level) and both the block variant
    // and the debris variant want their own `repeat`. Cloning shares the canvas, not the
    // sampler state.
    m.map = crackMap(matName, step, w, h).clone();
    m.map.needsUpdate = true;
    if (matName === 'wood') m.map.repeat.set(1.6, 1);
    if (matName === 'glass') {
      // Glass darkens no further with damage — a cracked pane catches MORE light, not less,
      // and tinting it toward brown is what made damaged glass read as dirty plastic.
      m.emissiveMap = m.map;
    } else {
      m.color = base.color.clone().lerp(new THREE.Color(0x2a2018), 0.05 + step * 0.06);
    }
    m.needsUpdate = true;
    crackCache.set(key, m);
  }
  return crackCache.get(key);
}

/**
 * Debris shares ONE material per (material, cracked) pair. Wood and stone chunks carry the
 * heaviest crack decal, which is what makes a settled pile read as *broken planks* rather
 * than as a fresh set of smaller planks. Glass carries none — a shard is already the break.
 */
function debrisMaterial(matName, cracked) {
  const key = `deb:${matName}:${cracked ? 1 : 0}`;
  if (!crackCache.has(key)) {
    const base = mat(matName).three;
    const m = base.clone();
    m.transparent = true;
    if (matName === 'glass') {
      /**
       * A shard is an OPAQUE flat facet. It used to be `#8fe4f5 at opacity 0.95 with
       * depthWrite:false` plus an EdgesGeometry outline, which meant every edge of the
       * extruded prism — front cap, back cap and all six side seams — drew through its own
       * face: the settled pile was a heap of see-through cellophane boxes with pencil lines
       * in them, and you could read the grass through the wreckage.
       *
       * Opaque, depth-writing, flat-shaded. flatShading is what turns the extruded outline
       * into real facets: each face of the shard resolves to one hard value off the glass
       * ramp, so a single chunk cropped out of the frame reads as a chipped piece of glass
       * rather than as a smooth pebble. `transparent` stays on only so the end-of-life fade
       * in update() has something to fade — it sits at opacity 1 for its whole useful life,
       * exactly as wood and stone debris do.
       */
      m.opacity = 1;
      m.flatShading = true;                     // hard facets, one flat value per face
      m.map = glassChip();                      // one specular glint, not the pane's stripes
      m.emissiveMap = m.map;
      m.color = new THREE.Color(0xffffff);
    } else {
      m.opacity = 1;
      if (cracked) {
        m.map = crackMap(matName, 2).clone();
        m.map.needsUpdate = true;
        m.map.repeat.set(1, 1);
      }
      m.color = base.color.clone().lerp(new THREE.Color(0x2a2018), 0.06);
    }
    m.needsUpdate = true;
    crackCache.set(key, m);
  }
  return crackCache.get(key);
}

export function disposeBlockCaches() {
  for (const g of geoCache.values()) g.dispose();
  for (const m of crackCache.values()) m.dispose();
  geoCache.clear(); crackCache.clear();
}
