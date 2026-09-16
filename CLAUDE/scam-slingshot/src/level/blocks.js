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
 * ── THE FRACTURE BURST (PW r5) ──────────────────────────────────────────────
 * The separation speed a fracture ASKS for, before the ledger prices it. These three are
 * the numbers the cut plans were authored against and they are unchanged from the round
 * that set them; what changed is that the ask is now momentum-neutral and paid for.
 * `massK` (below, at the call site) still gives a chip more of it than a half-beam, which
 * is what makes the cone read "biggest lowest, smallest highest and furthest".
 */
const BURST_V0 = 1.6, BURST_VK = 0.34, BURST_V_MAX = 9.5;
/**
 * ── PW r9: PEAK DIFFERENTIAL SPIN THE BURST ASKS FOR, rad/s ──────────────────
 * before neutralisation and pricing.
 *
 * It was 9, and 9 was the single biggest line in the burst's energy bill: MEASURED
 * (`_tools/scenarios/pw-r9-frac.mjs`, 34 fractures on the 6-shot l1 cohort) **spin was
 * 43.9 % of everything the burst spent**, and it is the half of the fan the player cannot
 * read. `½·I·w²` runs two orders of magnitude from a chip to a half-beam, so the bill for
 * it landed on the two heaviest pieces of every fracture — which are also the two that
 * barely move (0.85 and 0.75 m/s against the light chips' 1.28).
 *
 * Cutting it to 4 is not a reduction in the fan, and that is the point:
 *   · on a fracture where the blow bound binds it costs NOTHING — the same budget buys
 *     more separation, and the light chips the eye actually follows go 1.170 -> 1.268 m/s;
 *   · on one where it does not bind it is a straight saving.
 * Measured across both: burst spend **43.07 -> 22.51 J**, spin share of the bill
 * **43.9 % -> 16.9 %**, mean separation speed 1.054 -> **1.074 m/s** (up), mean tumble
 * 3.94 -> 1.99 rad/s — still a third of a revolution per second on a piece with a 1-2 s
 * flight, so the rubric's "pieces tumble on independent random spin, no two share a
 * rotation" is a jitter about this number and is unaffected.
 *
 * 9 is kept for the pre-r5 arm below, which must keep reproducing the numbers it was
 * recorded against.
 */
const BURST_SPIN = 4, BURST_SPIN_LEGACY = 9;
/**
 * How much of the burst points along the blow rather than outward from the contact.
 *
 * It was 0.65 along / 0.35 outward, authored when the burst was free: the along-the-blow
 * share was what read as "blown through rather than exploded from within". That share is
 * now the wrong tool for that job and an expensive one. A component every fragment shares
 * is COMMON MODE — it is the debris cloud's centre-of-mass velocity, i.e. pure invented
 * momentum, and it is exactly what the neutralisation below removes; paying for it would be
 * paying for a rocket. The "blown through" read is carried instead by the parent's own
 * velocity, which the blow has already delivered before the contact event fires (measured
 * on l1: the struck block is doing 2.6-5.7 m/s at the instant it fractures).
 *
 * What is left for the burst to do is SEPARATE the pieces, and separation is radial. 0.30
 * keeps enough forward lean that the fan is asymmetric — pieces on the far side of the
 * contact get more than pieces behind it — without spending the budget on common mode.
 */
const BURST_ALONG = 0.30;
/**
 * ── PW r9: THE BURST'S ASK IS AN ENERGY, AND IT IS THE BLOW'S ENERGY ─────────
 *
 * Everything above authors the burst as a SPEED (`BURST_V0/VK/V_MAX`) and a SPIN
 * (`BURST_SPIN`). A momentum-neutral burst costs exactly its own kinetic energy in the
 * parent's frame — the cross term vanishes by construction, measured at `Σ|C| = 0.0000 J`
 * over 35 fractures — so an ask stated in m/s and rad/s costs `½·m·b² + ½·I·bs²`, i.e.
 * **whatever the block happens to weigh**. Measured (`_tools/scenarios/pw-r9-frac.mjs`,
 * 35 fractures on the 6-shot l1 cohort): the same authored event cost **0.07 J on a
 * 0.30 kg glass mullion and 10.97 J on a 1.375 kg wood beam — a 157x spread** for a fan
 * the player cannot tell apart. That is the same defect PW r2 removed from the damage
 * model (a Δv, not an impulse) and PW r8 removed from the wave (a momentum the donor
 * holds, not a Δv the recipient wants). Third instance, and the last one in this lane.
 *
 * The bound that is both physical and attributable: the separation energy of a fracture is
 * the strain energy the BLOW put into the block, so the ask is a share of the energy that
 * blow actually dissipated (`lastBlowE`, the ½·J·v the solver reports at the contact — see
 * `onImpact`). A block finished off by a weak accumulated blow is not entitled to a
 * full-mass burst, and before this round it took one: two of those 35 fractures spent
 * **5.30 J against a 0.3 J blow and 6.00 J against a 1.4 J blow** — 17x and 4x the blow
 * that broke them, and the two largest single spawns in the run.
 *
 * ── AND A SEED, FOR THE SAME REASON PW r8 NEEDED ONE ─────────────────────────
 * A block that comes apart under a slow crush has almost no blow to name, and it still has
 * to come apart — "a scaled burst still reads as a burst, an omitted one reads as a block
 * quietly falling into pieces". `BURST_SEED_J` is the floor under the ask, in JOULES, so
 * it is the same number for a glass mullion and a stone cube.
 *
 *     E_ask = min( authored ask ,  max( BURST_SHARE * blowE ,  BURST_SEED_J ) )
 *
 * and `structure.buyFracture()` still bounds it a second time by `FRAC_BURST_CAP` and a
 * third time by the pool, whose only depositor is the player's own shot.
 *
 * THE SHARE IS AN ATTRIBUTION BOUND, NOT A FUNDING SOURCE, and the distinction matters:
 * `lastBlowE` on a chain fracture is a block-on-block contact, which the collapse paid for
 * and not the player. It may not credit anything (PW r3's rule stands — `creditContact()`
 * fires only on a live projectile), so nothing here can be a money-printing loop; it only
 * ever makes the ask SMALLER than the pool would already allow.
 */
const BURST_SHARE = 0.06, BURST_SEED_J = 0.30;
/** How stale a blow may be and still be the blow that broke this block, in solver ticks.
 *  Measured: 33 of 35 fractures land on the same tick as their blow and the other two at
 *  +1 and +2, so this window is a tripwire against spending a blow from three seconds ago,
 *  not a tuning knob. */
const BURST_BLOW_TICKS = 6;
/**
 * How far the mass-conserving density correction may go, as a multiple of the material's
 * own density. An authored cut plan overshoots or undershoots its parent's volume by
 * 20-45 % (the pieces overlap, each collider is inset 6 % in plane, and each fragment's
 * depth is 62-95 % of the block's), so the correction is normally 1.2-1.5x. The clamp is a
 * tripwire for a future cut plan that has gone badly wrong, not a tuning knob: if it ever
 * binds, mass stops being conserved and the fracture is back to inventing potential energy.
 */
const DEBRIS_DENSITY_CLAMP = [0.55, 2.2];

/**
 * ── DEBUG A/B KNOB. Nothing in `src/` ever writes this. ──────────────────────
 * `conserve: false` restores the pre-r5 spawn — the single loop that gave every chunk the
 * parent's velocity PLUS a free kick 0.65 along the blow, an unconditional upward push and
 * a ±9 rad/s spin, at the material's own density and with no ledger.
 *
 * It exists for the same reason `structure.js`'s knobs do (ORCHESTRATOR-NOTES r6 §5): a
 * number taken before another builder's edit is not comparable to one taken after, so both
 * arms of an A/B have to run back to back in ONE process on ONE tree. There is no git
 * history here to diff against.
 *
 * It is deliberately built so the two arms share pass 1 (the cut plan and every per-piece
 * geometry draw) and consume the seeded PRNG in the SAME ORDER with the SAME COUNT — `up`,
 * then per piece `rngJitter(1.0)` and `rngJitter(BURST_SPIN)`. Without that the arms diverge
 * on the rng stream as well as on the model and nothing measured between them is
 * attributable. Only four things move: the density correction, the centre-of-mass shift,
 * the rigid velocity field, and the neutralise-then-buy step.
 */
export const FRACTURE_TUNE = {
  conserve: true,
  /** PW r7. false restores the r5 burst, which zeroed the pieces' own spins but left the
   *  cloud's ORBITAL angular momentum minted. See "NEUTRALISATION, BOTH HALVES" in
   *  `fracture()`; measured at 5.78 kg.m^2/s over 30 fractures before the fix. */
  spinNeutral: true,
  /** PW r7. false restores r5's `sqrt(IP/J)` rigid-field scaling, which holds the fracture's
   *  rotational ENERGY constant and therefore MINTS angular momentum whenever the cut plan is
   *  looser than its parent. true conserves angular momentum exactly instead. MEASURED INERT
   *  on today's plans — J/IP is 0.67-1.00 on 19 of 19 fractures, so the `min(1, ...)` clamp
   *  binds either way; it is on because it is the branch that stays correct if a cut plan is
   *  ever authored looser. See pass 3 of `fracture()`. */
  spinL: true,
  /** PW r9. Peak DIFFERENTIAL spin the burst asks for, rad/s, before neutralisation and
   *  pricing. 9 is the pre-r9 ask and 4 is shipped; it is a knob rather than a constant
   *  because it is the single biggest line in the burst's energy bill and the round had to
   *  price it. See BURST_SPIN above for the sweep. */
  burstSpin: BURST_SPIN,
  /** PW r9. Multiplier on the LINEAR separation ask, so the round could price moving the
   *  burst's budget between its two halves rather than only shrinking it. 1 is authored. */
  burstKickK: 1,
  /** PW r9. Give the spin ask the same mass differential the linear kick has had since r5.
   *  false restores the flat ±`burstSpin` every piece used to get. */
  burstSpinMassK: true,
  /** PW r9. Share of the blow that broke this block the burst may spend on separation.
   *  `Infinity` restores the pre-r9 ask exactly (the authored Δv/spin always binds), which
   *  is what the A/B arm uses. See "THE BURST'S ASK IS AN ENERGY" above. */
  burstShare: BURST_SHARE,
  /** PW r9. Floor under that ask, in JOULES — mass-invariant by construction. */
  burstSeedJ: BURST_SEED_J,
  /** PW r9. Freshness window on `lastBlowE`, in solver ticks. */
  burstBlowTicks: BURST_BLOW_TICKS,
};

/**
 * ── DEBUG INSTRUMENT (PW r9). Nothing in `src/` ever writes or reads this. ───
 * `FRACTURE_LOG.on = true` makes `fracture()` append one row per spawn holding the
 * internals no census outside the call can reconstruct: the parent's own mass properties,
 * the rigid field's exact cost, the burst's quadratic (A, C), what the ledger granted, and
 * the PER-PIECE split of the burst's energy bill against the separation speed each piece
 * actually got. Round 8 could not have been argued without `availableP()` being visible to
 * `pw-r8-audit.mjs`; the burst needs the same visibility for the same reason — an
 * instrument that has to ask the code under test to grade itself cannot see it being wrong.
 * Off by default and it allocates nothing when off, so it cannot perturb a measurement.
 */
export const FRACTURE_LOG = { on: false, rows: [] };

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
  constructor({ matName = 'wood', x, y, w, h, rot = 0, depth = DEPTH, fixed = false,
                debt = false, role = null }) {
    /**
     * THE INTEREST METER IS TINTED AT CONSTRUCTION, and that is a gameplay requirement rather
     * than decoration: the whole L2 mechanic is "find the weak point", so a meter the player
     * cannot pick out of a tower of grey stone is a mechanic that silently does not work.
     * Coral is the house colour for the scam (PALETTE.coral, the same one the shrug popup and
     * the villains use), and the emissive lifts it clear of the tower's own value so it still
     * reads on a phone and in greyscale — the two tests in villains/base.js.
     *
     * `mat()` with overrides returns a FRESH material rather than the shared cached one. That
     * is already how every glass block in the game works (`glassBase(w, h)` below is per
     * block), so this introduces no new kind of leak — one extra material per level build.
     */
    const m = role === 'interest'
      ? mat(matName, { color: PALETTE.coral, emissive: 0x7a2412, emissiveIntensity: 0.40 })
      : mat(matName);
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
    // The meter keeps its tinted material even when authored as glass — glassBase() would
    // throw the coral away, which is the one thing that must not happen to it.
    const mesh = new THREE.Mesh(g,
      (matName === 'glass' && role !== 'interest') ? glassBase(w, h) : m.three);
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
    /**
     * THE SCAM MECHANIC'S TWO AUTHORING FLAGS (level JSON; see world.js `scam`).
     *   debt  this block is part of the debt's LOAD-BEARING core. While the interest is
     *         still running it cannot break — see the gate at the top of `fracture()`.
     *   role  'interest' marks the one block that IS the interest. Breaking it clears
     *         the shield on every `debt` block in the level, at once.
     * Both default off, so a level that does not opt in behaves exactly as before.
     */
    this.debt = debt === true;
    this.role = role ?? null;
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

    /**
     * ── THE SCAM, AS A MECHANIC ───────────────────────────────────────────────
     * A shielded debt block does not break. It ABSORBS the blow and keeps standing.
     *
     * This is the one place the toxic-debt lesson is PLAYED rather than printed. The blow
     * itself is left completely alone — the collision already resolved in the solver, so the
     * tower still lurches, chips still fly off the unshielded top, the score still ticks.
     * Only the FRACTURE is refused. That asymmetry is the whole feeling: visible effort, no
     * progress, which is exactly what paying the minimum buys you.
     *
     * Damage is RESET, not capped, so a player cannot chip a shielded block across six shots
     * and eventually break it. The debt does not remember your payments; neither does this.
     *
     * Nothing here can destabilise the physics. It is a pure early return on the *decision*
     * to break, taken before `broken` is set, so the body lives on untouched and no ledger,
     * propagation graph or debris path is entered. The failure mode to design against is the
     * opposite one — a level shielded so heavily it cannot be won — which is why only the
     * load-bearing core carries `debt` and the interest meter sits on an exposed face.
     */
    if (this.debt && !world.scam.interestCleared) {
      this.damage = 0;
      world.scam.shrugs = (world.scam.shrugs | 0) + 1;
      emit('debtShrug', {
        point: { x: point.x, y: point.y, z: 0 }, impulse, block: this,
        label: world.level?.scam?.shrugLabel ?? '+ interest',
      });
      return [];
    }

    this.broken = true;

    /**
     * THE WEAK POINT. Breaking the interest clears the shield on every debt block at once —
     * one loud beat, so the player ties cause to effect on the same frame. Guarded so a
     * second meter, or a re-entrant break, cannot fire the beat twice.
     */
    // A broken block LEAVES world.blocks, so "how many shielded blocks have broken" cannot be
    // counted by walking that list later — it has to be tallied here, as it happens.
    if (this.debt) world.scam.debtBroken = (world.scam.debtBroken | 0) + 1;

    if (this.role === 'interest' && !world.scam.interestCleared) {
      world.scam.interestCleared = true;
      emit('interestCleared', { point: { x: point.x, y: point.y, z: 0 } });
    }

    const pos = this.position(new THREE.Vector3());
    const ang = zAngleOf(this.body);
    const vel = this.velocity(new THREE.Vector3());
    const av = this.body.angvel();
    // Read the parent's mass properties BEFORE anything can touch the body — everything in
    // the spawn below is priced against them.
    const mP = this.body.mass();
    const IP = this.body.principalInertia().z;

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

    /**
     * ═══ THE SPAWN, AND WHY IT IS BUILT IN FOUR PASSES (PW round 5) ═══════════
     *
     * It used to be one loop: create a chunk, give it the parent's velocity PLUS a kick
     * along the blow, plus an unconditional upward push and a +/-9 rad/s spin. Measured
     * with a closed-system audit (`_tools/scenarios/pw-r5-frac.mjs`, which books births and
     * deaths instead of excluding them), that loop was the largest energy source in the
     * game: the children of a fracture were born with 2.3-15.3x their parent's kinetic
     * energy, +203 J across six l1 shots against darts carrying 60-64 J, worst single event
     * +38 J. Every earlier energy audit missed it by construction, because a fracture is a
     * death and N births on one solver step and all of them tracked a fixed cohort.
     *
     * It looked balanced only because the same loop DELETED 7-37 % of the block's mass
     * (-3.5 kg over the same six shots), which subtracts m*g*y of potential energy without
     * dissipating anything: -279 J of book-keeping loss hiding +203 J of invented motion.
     *
     * So:
     *   1. resolve the whole cut plan first, so the total volume is known BEFORE any body
     *      exists — mass conservation needs a number the old single loop never had;
     *   2. build the children at a corrected density, shifted so their centre of mass IS
     *      the parent's (that makes the potential-energy delta exactly zero, and makes the
     *      rigid field below conserve linear momentum exactly);
     *   3. hand every child the PARENT'S OWN RIGID VELOCITY FIELD, v + w x r. A rigid field
     *      over pieces whose centre of mass is the parent's costs exactly the parent's
     *      kinetic energy — no more — so a fracture on its own now creates nothing at all;
     *   4. add a BOUNDED, MOMENTUM-NEUTRAL burst on top and buy it from the same joule
     *      pool `structure.js` spends from, whose only depositor is the player's shot.
     *
     * Why momentum-neutral is not merely tidy: a burst that sums to zero momentum in the
     * parent's frame has ZERO cross term with the motion the parent already had
     * (sum m_i v.b_i = v . sum m_i b_i = 0), so it costs exactly its own kinetic energy
     * whatever the block was doing at the time. The old fan was a rocket — every piece
     * pushed the same way — so its cost went as the parent's speed, which is precisely why
     * the worst events were the fastest-moving blocks. The debris still fans downrange:
     * that read comes from the parent's own velocity, which the blow has already delivered
     * by the time the contact event fires.
     */
    const kids = [];
    const pieces = cutPlan(this.matName, this.w, this.h);
    const ca = Math.cos(ang), sa = Math.sin(ang);

    // ── 1. the whole plan, resolved before a single body exists ───────────────
    const plan = [];
    let vol = 0;
    for (const p of pieces) {
      const rot = ang + rngJitter(0.25);
      const depth = this.depth * rngRange(0.62, 0.95);
      // The Debris constructor insets its COLLIDER by 0.94 on both in-plane axes; mass
      // follows the collider, not the mesh, so that is the volume to measure.
      const v = (p.w * 0.94) * (p.h * 0.94) * depth;
      plan.push({ p, rot, depth, vol: v });
      vol += v;
    }

    // ── 2. mass conserved, and the centre of mass with it ────────────────────
    const legacy = !FRACTURE_TUNE.conserve;      // see FRACTURE_TUNE — debug A/B only
    const rho = this.material.physics.density;
    const dens = legacy ? null
      : Math.min(rho * DEBRIS_DENSITY_CLAMP[1],
                 Math.max(rho * DEBRIS_DENSITY_CLAMP[0], mP / Math.max(vol, 1e-9)));
    // Uniform density, so the volume-weighted centroid IS the mass-weighted one.
    let cx = 0, cy = 0;
    if (!legacy) {
      for (const q of plan) { cx += q.vol * q.p.x; cy += q.vol * q.p.y; }
      cx /= vol; cy /= vol;
    }

    const live = [];
    for (const q of plan) {
      if (world.debris.length >= MAX_DEBRIS) cullOldestDebris();
      const lx = q.p.x - cx, ly = q.p.y - cy;
      const wx = pos.x + lx * ca - ly * sa;
      const wy = pos.y + lx * sa + ly * ca;
      const d = new Debris({
        matName: this.matName, x: wx, y: wy, rot: q.rot,
        w: q.p.w, h: q.p.h, depth: q.depth,
        cracked: q.p.cracked !== false, density: dens,
      });
      // cullOldestDebris() can in principle reach a sibling created moments ago, so nothing
      // below may assume a body is still there.
      if (d.dead || !d.body) continue;
      q.d = d; q.rx = wx - pos.x; q.ry = wy - pos.y;
      q.m = d.body.mass(); q.I = d.body.principalInertia().z;
      live.push(q); kids.push(d);
    }
    if (!live.length) { this.destroy(); return kids; }

    /**
     * ── 3. the parent's rigid velocity field ─────────────────────────────────────────
     *
     * `J = Sum(I_i + m_i*r_i^2)` is the children's inertia about the PARENT's centre of
     * mass, and an authored cut plan does not reproduce the parent's own `IP`. Spinning the
     * children at the parent's rate therefore cannot reproduce both the parent's rotational
     * ENERGY and its angular MOMENTUM; something gives, and which thing gives is the choice.
     *
     * Round 5 chose `sqrt(IP/J)`, which holds the rotational energy. That is the wrong
     * invariant: the conserved quantity across an instantaneous split with no external
     * torque is angular momentum, `J*w0` against `IP*w`, and `sqrt` leaves
     * `w*sqrt(IP*J)` — which MINTS whenever the plan is looser than its parent, invisibly
     * to any energy audit, because it is energy-neutral by construction. `IP/J` conserves
     * angular momentum exactly and lets the rotational energy dissipate, which is what
     * breaking something does.
     *
     * MEASURED, AND IT CHANGES THE CONCLUSION (`_tools/scenarios/pw-r7-Lcheck.mjs`, 19
     * fractures over four l1 shots): **J/IP is 0.67-1.00 on 19 of 19** — every cut plan in
     * this game is TIGHTER than the block it came from, not looser. So `min(1, ...)` binds
     * on every fracture, both branches give `w0 = w`, and `spinL` is INERT on today's cut
     * plans. It is kept, and defaulted on, because it is the branch that stays correct if a
     * future plan ever goes the other way; it is not what fixed round 7's number.
     *
     * What the clamp leaves is `dL = (J - IP)*w`, verified against the census to five
     * decimals (stone: predicted -0.15076 / measured -0.15076, -0.64701 / -0.64701). It is
     * strictly NEGATIVE — the spawn dissipates angular momentum and can never invent it —
     * and closing it would mean spinning the children FASTER than the parent, i.e. trading
     * a momentum leak for up to 1.49x of invented rotational energy. r5's "only ever DOWN"
     * guarantee is right and stays.
     */
    let J = 0, mSum = 0;
    for (const q of live) { J += q.I + q.m * (q.rx * q.rx + q.ry * q.ry); mSum += q.m; }
    const spinK = J > 1e-9
      ? Math.min(1, FRACTURE_TUNE.spinL ? IP / J : Math.sqrt(IP / J))
      : 1;
    const w0 = legacy ? 0 : av.z * spinK;
    for (const q of live) {
      q.vx = vel.x - w0 * q.ry;
      q.vy = vel.y + w0 * q.rx;
      q.wz = w0;
    }

    // ── 4. the burst: authored, then neutralised, then bought ────────────────
    const dx = this.hitDir.x, dy = this.hitDir.y;
    const kick = Math.min(BURST_V_MAX, BURST_V0 + impulse * BURST_VK);
    const up = rngRange(0.5, 2.9);
    const along = legacy ? 0.65 : BURST_ALONG;   // the pre-r5 share; see FRACTURE_TUNE
    const spinAsk = legacy ? BURST_SPIN_LEGACY : FRACTURE_TUNE.burstSpin;
    let bmx = 0, bmy = 0, ism = 0, iSum = 0;
    for (const q of live) {
      const rx = q.rx - (point.x - pos.x), ry = q.ry - (point.y - pos.y);
      const L = Math.hypot(rx, ry) || 1;
      let ux = dx * along + (rx / L) * (1 - along),
          uy = dy * along + (ry / L) * (1 - along);
      const un = Math.hypot(ux, uy) || 1; ux /= un; uy /= un;
      // Bigger pieces get less of the kick — that is what makes the debris cone read
      // "biggest lowest, smallest highest and furthest" (impact-burst-tower-splitting_03).
      // It also survives neutralisation: subtracting the mass-weighted MEAN leaves the
      // light pieces going up and out and the heavy ones barely moving, which is the same
      // read expressed as a differential instead of as free momentum.
      const massK = 1 / (0.55 + q.p.rel * 1.6);
      // `burstKickK` scales the LINEAR ask only — `massK` still carries the spin ask below,
      // so the knob moves budget between the burst's two halves instead of scaling both.
      const kK = massK * FRACTURE_TUNE.burstKickK;
      q.bx = ux * kick * kK + rngJitter(1.0);
      q.by = uy * kick * kK * 0.85 + up * kK;
      /**
       * PW r9 — THE SPIN ASK IS THE OTHER HALF OF THE BURST AND IT WAS NEVER MADE
       * DIFFERENTIAL. `massK` above exists because a Δv ask costs `½·m·Δv²`, so a flat
       * separation speed puts the whole bill on the heaviest chunk. The line below asked
       * every piece for the SAME ±9 rad/s, and rotational energy is `½·I·ω²` with `I`
       * running two orders of magnitude from a chip to a half-beam. Measured
       * (`pw-r9-frac.mjs`, 11 fractures): spin was **58.8 % of the entire burst ask**, and
       * the two heaviest pieces of each fracture carried **77.6 %** of the bill while
       * moving slowest — the fan the player reads is the LIGHT pieces, and they were
       * paying 8 % of it. Same defect PW r2 fixed for damage and PW r8 fixed for the
       * wave's ask, third instance, and the one place in this file that still had it.
       */
      q.bs = rngJitter(spinAsk * (FRACTURE_TUNE.burstSpinMassK ? massK : 1));
      bmx += q.m * q.bx; bmy += q.m * q.by;
      ism += q.I * q.bs; iSum += q.I;
    }
    if (legacy) {                                 // the pre-r5 arm: free, unpriced, unbalanced
      for (const q of live) {
        q.d.body.setLinvel({ x: q.vx + q.bx, y: q.vy + q.by, z: 0 }, true);
        q.d.body.setAngvel({ x: 0, y: 0, z: q.bs }, true);
      }
      structure.registerDebris(this.id, kids);
      this.destroy();
      return kids;
    }
    bmx /= mSum; bmy /= mSum; ism /= Math.max(iSum, 1e-9);
    /**
     * ── NEUTRALISATION, BOTH HALVES (PW r7) ─────────────────────────────────────────
     *
     * Round 5 subtracted the mass-weighted MEAN velocity and the inertia-weighted mean
     * SPIN, and the line below carried the comment "zero net linear and angular momentum".
     * Only the first half of that was ever true. `bs -= ism` zeroes the pieces' OWN spins,
     * `SUM I_i*bs_i`. It says nothing about the burst's ORBITAL angular momentum,
     * `SUM m_i*(r_i x b_i)` — a chip thrown left at the top of a block and a chip thrown
     * right at the bottom is a COUPLE, and the old burst minted one out of nothing.
     *
     * Measured with `_tools/scenarios/pw-r7-audit.mjs`, which takes a full census of the
     * dynamic world either side of the fracture CALL so the channel is closed and exact:
     * on the 6-shot l1 cohort the spawn conserved mass to 0.0000 kg, potential energy to
     * 0.00 J and LINEAR momentum to 0.00 kg.m/s — and minted 5.78 kg.m^2/s of angular
     * momentum over 30 fractures. PW r6 §2's lesson is that momentum is the sharper
     * detector precisely because it has no honest positive term to hide inside; this was
     * the one conservation law the spawn still broke, and no energy-only audit could see
     * it, because a couple is bought at its energy price like any other motion.
     *
     * The cure is the exact analogue of the linear one. Subtracting a rigid TRANSLATION
     * removes net linear momentum; subtracting a rigid ROTATION about the parent's centre
     * of mass removes net angular momentum:
     *
     *     Om = L_burst / SUM(I_i + m_i*r_i^2)     then   b_i -= Om x r_i,   bs_i -= Om
     *
     * and it cannot undo the linear neutralisation, because `SUM m_i*(Om x r_i)` is
     * `Om x SUM m_i*r_i`, which pass 2 already made exactly zero. What is left is a true
     * internal separation — no net force, no net couple, energy only — which is what a
     * block coming apart is. `A` and `C` are accumulated AFTER the correction so the
     * ledger prices the field that is actually applied, not the one before it.
     */
    let Lb = 0, Jb = 0;
    for (const q of live) {
      q.bx -= bmx; q.by -= bmy; q.bs -= ism;      // zero net linear momentum and net spin
      Lb += q.I * q.bs + q.m * (q.rx * q.by - q.ry * q.bx);
      Jb += q.I + q.m * (q.rx * q.rx + q.ry * q.ry);
    }
    if (FRACTURE_TUNE.spinNeutral && Jb > 1e-9) {
      const Om = Lb / Jb;                        // the rigid rotation the burst was hiding
      for (const q of live) { q.bx += Om * q.ry; q.by -= Om * q.rx; q.bs -= Om; }
    }
    let A = 0, C = 0;
    for (const q of live) {
      A += 0.5 * q.m * (q.bx * q.bx + q.by * q.by) + 0.5 * q.I * q.bs * q.bs;
      C += q.m * (q.vx * q.bx + q.vy * q.by) + q.I * q.wz * q.bs;
    }
    /**
     * dKE(f) = A f^2 + C f — the burst's whole energy bill, exactly, because pass 4's
     * neutralisation makes the cross term with the parent's own motion vanish (C is
     * 0.0000 J to four decimals across 35 measured fractures).
     *
     * PW r9: the ask is bounded FIRST by the blow that broke this block and only then
     * offered to the ledger. `buyFracture()` still applies `FRAC_BURST_CAP` and the pool
     * on top, so the three bounds are: what this fracture is entitled to, what one spawn
     * may take, and what the shot paid for.
     */
    const full = A + C;
    const fresh = (physics.tick - this.lastBlowTick) <= FRACTURE_TUNE.burstBlowTicks;
    const askCap = Math.max(FRACTURE_TUNE.burstSeedJ,
                            FRACTURE_TUNE.burstShare * (fresh ? this.lastBlowE : 0));
    const want = legacy ? full : Math.min(full, askCap);
    let f = 1;
    if (want > 0) {
      // Buy as much of it as the ledger will fund and scale to fit — the same "scale,
      // never drop" rule spend() uses, for the same reason: a scaled burst still reads as
      // a burst, an omitted one reads as a block quietly falling into pieces.
      // `this` and `kids` are the two exclusions the PW r10 settlement needs — see
      // `buyFracture()`: the parent is destroyed a few lines below and its motion is already
      // inside the children's rigid field (pass 3), and the children are still at rest until
      // the write loop at the end of this function.
      const budget = Math.min(want, structure.buyFracture(want, this, kids));
      if (budget < full - 1e-9) {
        f = A > 1e-12
          ? (-C + Math.sqrt(Math.max(0, C * C + 4 * A * budget))) / (2 * A)
          : (C > 1e-12 ? budget / C : 1);
        f = f > 1 ? 1 : (f > 0 ? f : 0);
      }
    } else if (full > 0) {
      f = 0;
    }
    if (FRACTURE_LOG.on) {
      let rigid = 0;
      for (const q of live) rigid += 0.5 * q.m * (q.vx * q.vx + q.vy * q.vy) + 0.5 * q.I * q.wz * q.wz;
      FRACTURE_LOG.rows.push({
        tick: physics.tick, mat: this.matName, mP, IP,
        vP: Math.hypot(vel.x, vel.y), wP: av.z,
        keP: 0.5 * mP * (vel.x * vel.x + vel.y * vel.y) + 0.5 * IP * av.z * av.z,
        rigid, kids: live.length, kick, A, C, full, askCap, want, f, spent: A * f * f + C * f,
        blowE: this.lastBlowE, blowAge: physics.tick - this.lastBlowTick,
        pieces: live.map(q => ({
          m: q.m, rel: q.p.rel, I: q.I,
          b: Math.hypot(q.bx, q.by), bs: q.bs,
          eA: 0.5 * q.m * (q.bx * q.bx + q.by * q.by) + 0.5 * q.I * q.bs * q.bs,
        })),
      });
    }
    for (const q of live) {
      q.d.body.setLinvel({ x: q.vx + f * q.bx, y: q.vy + f * q.by, z: 0 }, true);
      q.d.body.setAngvel({ x: 0, y: 0, z: q.wz + f * q.bs }, true);
    }

    /**
     * THE DONOR HAND-OFF (PW r6). `structure.onCollapse()` above queued a shock wave whose
     * FIRST hop comes from this block — and by the time that wave fires, a few solver steps
     * later, this block no longer exists. Its debris does, it carries exactly the momentum
     * this block had (passes 3 and 4 above are what make that true), and it is physically the
     * thing that hits the neighbour. Registering it here is what lets `structure.js` debit a
     * real body for hop 1 instead of minting the momentum: measured on the l1 gate, those 38
     * hop-1 writes contain the four biggest impulses in the game. See THE DONOR RULE in
     * `structure.js`. Registered in BOTH arms so the r5 knob cannot change the r6 model.
     */
    structure.registerDebris(this.id, kids);

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
  constructor({ matName, x, y, rot, w, h, depth, cracked = true, density = null }) {
    const m = mat(matName);
    const { body, collider } = makeBody({
      kind: 'dynamic', x, y, rot, m, density,
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
