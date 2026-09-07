/**
 * level/structure.js — THE STRUCTURAL INTEGRITY LAYER.
 *
 * ── THE PROBLEM THIS EXISTS TO SOLVE ─────────────────────────────────────────
 * A rigid-body solver is a *local* machine. It knows that block A is touching block B; it
 * does not know that B is the only reason A is standing up. So when a projectile deletes
 * the mid beam of a tower, Rapier's honest answer is that the four perfectly vertical,
 * perfectly symmetric posts underneath keep standing — because nothing is pushing them
 * over. Measured on l1 before this file existed: the beam spanning all four posts was
 * destroyed and at impact+1000 ms every post was still at |angle| <= 0.01 rad and 0.00
 * units from its authored pose, with the wreckage of its own roof resting on top of it and
 * the villain inside untouched.
 *
 * That is technically correct and it is why a player closes the tab. In
 * `ab_destruction_stone-tower-mid-collapse_01` and `ab_destruction_chain-collapse-dust-
 * puffs_07` a single hit takes the WHOLE tower: it hinges, leans and comes down in stages,
 * and the blocks the bird never touched are the ones doing most of the moving.
 *
 * ── WHAT IS MODELLED, AND WHY IT IS NOT CHEATING ─────────────────────────────
 * Real masonry does not stand up on contact normals alone. Every member is braced by its
 * neighbours and carries a share of the load above it, and every real member has an
 * eccentricity — it is never dead plumb, its load is never perfectly centred. Ours ARE dead
 * plumb, because they were authored in a JSON file. So when a member dies, two things that
 * happen in the world do not happen in our sim:
 *
 *   1. A DE-BRACED COLUMN GOES OVER. A 0.46 x 2.60 post (5.7 : 1) stands because a beam
 *      holds its head. Take the beam away and it is a free-standing slender column with an
 *      eccentric load: in the world it topples, in the sim it stands there for ever.
 *
 *   2. A BEAM THAT LOSES A FOOTING HINGES. Knock the prop out from under one end of a
 *      lintel and it swings down about the support that is left. Ours, perfectly balanced
 *      on what remains, just sits.
 *
 * So the file has FOUR mechanisms. None of them is a global "shake the level" force; every
 * one of them is expressed at a joint or along the load path:
 *
 *   · JOINT FAILURE (`joint()`)  — the direct neighbours of a block that just died. Sized in
 *     rad/s and m/s (converted to impulses through the body's real mass and cuboid inertia)
 *     rather than in newton-seconds, so a post tips at the same rate whatever it is made of.
 *
 *   · THE RACK (`rack()`)        — see the long note above RACK_TRIGGER. A portal frame that
 *     is suddenly unloaded goes over as an ASSEMBLY. This is the mechanism that takes a
 *     ground floor down, and it is why the tower now leans instead of being dismantled.
 *
 *   · THE SUPPORT AUDIT (`audit()`) — see the long note above AUDIT_TICKS. Support is a
 *     STATE, and it has to be re-read while the collapse is running, not only at the instant
 *     a neighbour dies. Most of the ways a real structure loses its footing involve nothing
 *     breaking at all.
 *
 *   · THE SHUDDER (`shudder()`)  — a much weaker disturbance that keeps travelling outward
 *     for up to `MAX_HOPS` joints. It does not knock anything down on its own; its job is
 *     that the far side of the structure visibly flinches, so nothing in frame looks
 *     bolted to the world while its neighbour disintegrates.
 *
 * Not one of them teleports a body, scripts a pose, or overrides a solver result. Everything
 * goes in through `applyImpulseAtPoint` / `applyTorqueImpulse` and the collapse that comes
 * out is whatever Rapier makes of it.
 *
 * ── STAGGERED, NOT SIMULTANEOUS ──────────────────────────────────────────────
 * Every effect is scheduled a few solver steps out (`JOINT_TICKS`, `HOP_TICKS`, plus
 * jitter), so a collapse runs DOWN the structure over ~200-500 ms instead of everything
 * twitching on one frame. That is the rubric's "chain collapse is staggered in time … so
 * the eye can follow cause down the structure", and it is what puts two impact puffs of
 * visibly different age in the same frame.
 *
 * ── SAFETY: THIS CANNOT DESTABILISE AN UNTOUCHED LEVEL ───────────────────────
 * Nothing here runs on a tick where nothing has broken. `update()` returns on its first line
 * unless the queue has work OR the level is ARMED, and only `onCollapse()` ever arms it —
 * for `ARM_TICKS` after the last break. On an untouched level the audit never executes a
 * single comparison, so P3's "stable at rest" automatic-FAIL is structurally out of reach.
 * (Verified every round by `p3-r5-rest.mjs`: 0 impulses, 0 audits, bodies asleep.)
 *
 * ── DETERMINISM ──────────────────────────────────────────────────────────────
 * The queue is keyed on an internal step counter that advances only inside the fixed step,
 * never on `physics.tick` (which also advances during hit-stop, when this file is not
 * running). Randomness is the SIMULATION stream (`rng.js`), drawn in graph order, which is
 * block creation order. Same seed + same shot => the same collapse, byte for byte.
 */

import * as THREE from 'three';
import { zAngleOf } from './entity.js';
import { world } from '../world.js';
import { rng, rngRange, rngJitter } from '../rng.js';

/**
 * Contact tolerance when deciding "these two blocks are joined". Authored levels stack
 * flush (a beam's underside is exactly a post's top) and the loader's seeded jitter is
 * 0.004, so anything over ~0.05 is generous. 0.16 also catches the deliberate 0.02 gap
 * between l1's two structures, which is what lets a collapse chain from one into the other.
 */
const GAP = 0.16;

/** A member is a COLUMN when it is this much taller than it is wide, and a BEAM when the
 *  reverse. Anything between the two (a cube, a chunk of masonry) is neither and only gets
 *  shoved. 1.4 puts l1's 0.46x2.60 posts and 0.42x1.70 mullions in, and its 0.9x0.9 stone
 *  cubes out, which is the correct reading of both. */
const ASPECT = 1.4;

// ── JOINT FAILURE — the collapse driver ─────────────────────────────────────
/** Angular velocity a de-braced column is given, rad/s. A post at 3.0 rad/s has leaned a
 *  clearly-readable 12 degrees within 70 ms and is past its own tipping point long before
 *  the 800 ms the rubric measures at — but it is a *lean*, not a launch: the block stays in
 *  contact with its neighbours and takes them with it, which is what a hinge looks like. */
const TIP_OMEGA = 2.8;
/** Lateral speed added at a toppling column's head, m/s. Small — the spin does the work. */
const TIP_V = 0.50;
/** Downward speed given to the unsupported END of a beam that lost a footing, m/s. */
const HINGE_V = 1.3;
/** Lateral speed for a member that lost a side brace, m/s. */
const SIDE_V = 0.55;
/** Solver steps before a joint fails after its neighbour died. 4 = 33 ms: one clear beat. */
const JOINT_TICKS = 4;

/**
 * ── THE LOAD DUMP, and why destruction has to travel DOWN THE LOAD PATH ──────
 * When a member dies, the mass it was holding up does not politely wait: it drops onto
 * whatever is underneath, all at once. A beam that has spent the level carrying an upper
 * storey takes that storey as a SHOCK LOAD the instant the storey's legs fail, and shock
 * loads are what actually break beams.
 *
 * Modelling it explicitly does two things at once, and the second is the reason it is here:
 *   · a mid beam now fails when its storey collapses onto it, which de-braces the posts
 *     underneath, which is the only honest way a ground-floor frame ever comes down;
 *   · the damage is CONCENTRATED on the load path instead of sprayed over the whole
 *     structure, so fewer blocks break in total while the structurally important ones
 *     break more often. Widening `SOURCE_SCALE` to get the same effect flattened the level
 *     into anonymous rubble — this puts the same energy where a collapse actually puts it.
 *
 * In N·s of damage per kilogram of load suddenly released, and m/s of downward kick.
 */
const LOAD_DAMAGE = 2.2;
const LOAD_DROP_V = 1.5;

/**
 * ── THE RACK — how a ground floor actually comes down ────────────────────────
 * A four-post bay under one stiff lintel is a PORTAL FRAME, and a portal frame is the most
 * stable thing you can build out of loose blocks: the lintel ties all four heads together,
 * every post is dead plumb, and the wreckage of the storey above lands on the lintel and
 * presses it down, which only adds friction. Measured on l1 before this mechanism existed,
 * that is exactly what happened — the upper storey was destroyed at impact+90 ms and the
 * six load-bearing members underneath were STILL within 0.15 rad of their authored pose at
 * impact+800 ms, with the debris of their own roof resting on top of them. The frame only
 * ever came down at impact+1000-1600 ms, and then by the lintel accumulating enough contact
 * damage to snap — the frame was DISMANTLED, never toppled. That reads as a tower that
 * shrugged off the hit, and it is the single thing `ab_destruction_stone-tower-mid-collapse_01`
 * shows and we did not: there, the struck tower is leaning ~25 degrees as one piece with
 * every block still stacked.
 *
 * What is missing from the sim is not force, it is ECCENTRICITY. A frame carrying a storey
 * is carrying it through its posts. Take that storey away suddenly and asymmetrically — a
 * projectile removes one side of it and the other side topples downrange — and the frame is
 * left with the horizontal momentum of the departing load and none of its stabilising
 * weight. Real frames rack over. Ours, with the load modelled only as gravity on a stack of
 * boxes, does not: the moment the storey stops touching, the frame is simply lighter.
 *
 * So `rack()` puts the eccentricity back — and it has to do it as ONE RIGID ROTATION of the
 * whole bay, which is the part that took two attempts to get right. The obvious version, a
 * pure couple on each post plus the matching push on the lintel, was measured and does
 * almost nothing: a post wedged between the bottom beam and a loaded lintel cannot rotate
 * without lifting the lintel and the debris heaped on it, so the contact solver cancels the
 * spin inside two steps and the frame is at 0.05 rad 800 ms later. Every impulse that is
 * not consistent across the bay is spent fighting the bay's own contacts.
 *
 * A masonry bay does not fail by shearing internally. It fails by rotating bodily about its
 * downwind base corner — the upwind feet lift, the toe stays, and the whole assembly goes
 * over with its blocks still stacked. That is exactly what
 * `ab_destruction_stone-tower-mid-collapse_01` shows: the struck tower is leaning ~25
 * degrees as one piece.
 *
 * So the impulse handed to each member is that assembly's own rigid-body velocity field
 * about the toe, `v = omega x r`, plus the assembly's spin. Applied that way there is no
 * relative motion between neighbours for the solver to resolve, so nothing is cancelled and
 * the bay leans as a unit — which is also what keeps the rubric's ">= 60 % of surviving
 * blocks still in contact with a neighbour at +300 ms" true while it falls. Blocks separate
 * afterwards, on their own, as gravity takes them.
 *
 * (Yes, a rotation about a pivot carries net linear momentum. So does a real wall going
 * over; the reaction is taken by the ground at the toe, which our ground collider is
 * perfectly happy to provide. Nothing here is teleported and nothing is scripted — every
 * body still lands wherever the solver puts it.)
 *
 * It is sized by how much of its ORIGINAL load the lintel has lost (`carried0 - carried`),
 * not by the blow, so it cannot fire on a graze: knock a chip off the roof and nothing
 * racks; take out the storey and the whole bay goes.
 */
/** Fraction of a lintel's original carried load that must be gone before its frame racks. */
const RACK_TRIGGER = 0.30;
/** Rotation rate of a fully-unloaded bay about its downwind toe, rad/s. Chosen so the head
 *  of a 3 m bay leaves at ~2.5 m/s — a topple, not a launch. */
const RACK_OMEGA = 1.05;
/** Hard ceiling on any one member's speed change from one rack, m/s. */
const RACK_VMAX = 3.2;
/** How much of the rotation's UPWARD component a lifting member actually gets. A wall going
 *  over does lift its upwind feet; at 1.0 the bay reads as an explosion, so it is damped. */
const RACK_LIFT = 0.55;

/**
 * ── A RACK IS AN ACCELERATION, NOT A TELEPORT (PW r3b) ───────────────────────
 * A wall going over does not acquire its rotation rate in one 8.3 ms solver step; gravity
 * torques it about its toe and the rate builds. Delivering the whole velocity field in one
 * step was the last big single-step energy jump left after the ledger landed: measured on
 * l1 0.34@0.92, three bays racking inside one audit created **+11.36 J in one step**
 * against a solver-only floor of 1.01 J for the same shot.
 *
 * So both assembly-scale writes are now RAMPS. The target velocity field grows linearly
 * (which is what a constant torque produces) over `RACK_STEPS` / `TIP_STEPS`, and because
 * every step is a velocity MATCH rather than an addition, the ramp's total cost telescopes
 * to the same final kinetic state the single write produced — it is spread, not reduced,
 * and anything gravity or a contact supplies along the way is deducted from what the ledger
 * has to buy. Peak single-step cost falls to about `(2n-1)/n²` of the old jolt.
 *
 * They are short on purpose: 8 steps is 67 ms out of the 800 ms the propagation gate
 * measures at, so the bay is at full rate long before anything is counted.
 *
 * ── AND THEY MAY NOT BE LONGER. THE CEILING IS STONE. ────────────────────────
 * Swept on one tree (`_tools/scenarios/crit-PW-r3b-sweep.mjs`): 12/10 steps with a
 * writes-per-step of 1 is BETTER on every energy number — worst step median 4.27 -> 1.90 J,
 * created median 15.96 -> 10.41 J — and MOVED even rises to a median of 10. It is still
 * wrong, and the 8-shot l1 gate says why: **stone fractures go 5 -> 0, and 4 of 8 shots
 * fracturing stone -> 0 of 8.** Stone in this game dies to a storey landing on it (P3 r6b's
 * crush channel, which is a severity ramp on the arrival), so spreading the arrival over
 * 100 ms takes the arrival away. `WRITES_PER_STEP = 1` at 8/6 costs the same thing more
 * cheaply (stone 5 -> 2 fractures, 2 of 8 shots).
 * So the pair is bounded on BOTH sides — long enough that no step jolts, short enough that a
 * storey still lands like a storey — and 8 / 6 / 2 is where both hold.
 */
const RACK_STEPS = 8;
const TIP_STEPS = 6;

/**
 * How many queued joint/shudder items may execute their body write in ONE solver step; the
 * surplus is deferred by one step (8.3 ms) and keeps its queue order.
 *
 * Same argument in the other direction: a shock front does not arrive everywhere at once,
 * and the file already stages every effect for exactly that reason. What it did not do was
 * stop INDEPENDENT effects from landing on the same step by coincidence — measured on l1
 * 0.30@0.90, two joints, a tip and three hops all fell due at impact+58 ms and created
 * +5.57 J between them in that single step. Spreading them costs nothing (the same writes
 * happen, one step apart) and it is the same "staggered, not simultaneous" rule the header
 * argues for.
 */
const WRITES_PER_STEP = 2;

/**
 * ── THE SUPPORT AUDIT — support is a state, not an event ─────────────────────
 * `onCollapse()` only fires at the instant a member DIES, and it only reaches that member's
 * direct neighbours. But most of the ways a real structure loses its footing involve nothing
 * breaking at all: a lintel slides off its posts, a storey topples away sideways instead of
 * shattering, a column's head restraint walks 40 cm downrange. After any of those, an
 * adjacency-driven model has already fired every event it is ever going to fire, and the sim
 * is left holding a plumb, slender, unrestrained column — which a rigid-body solver will
 * hold upright for ever, because nothing is pushing it over.
 *
 * So while a collapse is live, every `AUDIT_TICKS` steps, re-read the world instead of the
 * graph:
 *   · a node that has left its authored pose is DETACHED — it is no longer part of the
 *     frame, so the load solve stops counting it both as load and as a supporter. That is
 *     what makes a storey which topples away (rather than breaking) release its frame.
 *   · a column that was braced at build and now has nothing standing on its head goes over.
 *   · a beam that was propped at build and whose remaining support has all moved to one
 *     side of its own centre of mass is a cantilever, and hinges down over the void.
 * Each fires at most once per member (`released` / `hinged`), so the audit cannot pump
 * energy into a body it has already released.
 */
/** Solver steps between audits. 8 = 67 ms — fast enough that the frame reacts inside the
 *  same beat as the storey it lost, slow enough to be free (17 nodes, ~0.04 ms). */
const AUDIT_TICKS = 8;
/** How long the level stays armed after the last break, in solver steps. 300 = 2.5 s. */
const ARM_TICKS = 300;
/** Distance / angle at which a member has visibly left the frame and stops carrying load. */
const DETACH_D = 0.55;
const DETACH_A = 0.35;
/** Vertical tolerance for "this block is standing on my head" / "this is under my foot". */
const FACE_TOL = 0.30;
/** How much horizontal overlap still counts as "something is standing on my head", m. Above
 *  this a column is braced and will not be released; below it the contact is a corner touch
 *  that cannot restrain anything. */
const HEAD_OV = 0.06;

// ── THE SHUDDER ─────────────────────────────────────────────────────────────
const MAX_HOPS = 4;
/** Energy left after one joint. Not divided by branch count: this models loss of integrity
 *  spreading through the frame, not a conserved momentum budget. */
const HOP_DECAY = 0.76;
/** Below this (m/s) a hop is not worth a body write and the wave stops. */
const ENERGY_FLOOR = 0.13;
/** Hard ceiling on the velocity change one block may take from one wave, m/s. */
const WAVE_CAP = 3.6;
/** Solver steps between hops. 7 = 58 ms, one clear beat per storey. */
const HOP_TICKS = 7;

/**
 * THE SHUDDER IS CARRIED IN METRES PER SECOND, NOT IN NEWTON-SECONDS, and that is a
 * decision worth defending. A momentum budget makes the wave's visible effect depend on
 * what it happens to hit — the same joules that spin a 0.30 kg glass mullion right out of
 * the frame barely nudge a 1.55-density stone cube, so a collapse looks different for
 * reasons the player cannot see. Expressed as a velocity change, one number means one
 * readable amount of movement in every material, and the impulse handed to Rapier is
 * `E * mass` — still a real impulse, still solved normally.
 *
 * ── AND IT LEANS DOWNRANGE, NOT OUTWARD ──────────────────────────────────────
 * The first version blended the blow direction 62/38 with "away from the block that died".
 * On a symmetric tower that is a disaster: the post to the left of the hole gets pushed
 * left, the post to the right gets pushed right, the bay is pulled apart in two directions
 * at once and the net result is that a four-post ground floor does not move at all — which
 * is precisely the symptom this whole file exists to remove. A real collapse goes WITH the
 * shot. 0.85 of the blow keeps the whole structure racking one way; the 0.15 of radial is
 * only there so the side nearest the hole leads.
 */
const WAVE_ALONG_BLOW = 0.85;

/**
 * How much of a shudder arrives as DAMAGE rather than as motion, as a fraction of the
 * impulse it delivered. Deliberately tiny, and it was three times larger to start with.
 *
 * P3's first rule is separation before fragmentation: whole blocks are the primary debris
 * and only the contact point fragments. The first tuning of this file broke 13 of l1's 17
 * blocks on a single shot and left the level a flat, anonymous rubble mound with nothing
 * for the remaining three ammo to play with — a WORSE frame than the one this round set out
 * to fix, just in the opposite direction. Motion and damage had to be decoupled: the wave
 * now shoves hard and damages almost nothing, and the fragmentation that does happen comes
 * from real contacts the solver resolved.
 */
const SHOCK_DAMAGE = 0.02;


/**
 * ══ THE ENERGY LEDGER ════════════════════════════════════════════════════════
 * PW round 3. This is the difference between a collapse that is TRANSMITTED and one that is
 * AUTHORED, and it was measured before it was fixed.
 *
 * ── WHAT WAS MEASURED ────────────────────────────────────────────────────────
 * `_tools/scenarios/crit-PW-r2g.mjs` tracks a fixed cohort of bodies BY IDENTITY across a
 * collapse (so a fracture removing a block cannot be mistaken for energy leaving), and
 * subtracts gravity's own release, `sum m*g*(-dy)`, as the one legitimate source:
 *
 *     dE_extra(step) = [KE(k+1) - KE(k)] - [PE(k) - PE(k+1)]      over the common cohort
 *
 * Contacts and damping can only make that negative. On l1 it read **+97.1 / +102.8 / +142.8 J
 * created** in the two seconds after impact on the three shots that fracture anything —
 * against a dart carrying **56.9-60.4 J**. `crit-PW-r2h.mjs` then sampled `stats` next to
 * every jump: every positive step above +4 J landed on a step where this file wrote to a
 * body (+37.6 J in ONE 8.3 ms step at impact+58 ms, with joints 2 / tips 1 / hops 3), and
 * every step with no structure event was <= 0. The collapse was not being propagated; it was
 * being paid for out of nothing.
 *
 * ── WHY IT HAPPENED, AND IT IS NOT THE OBVIOUS ANSWER ────────────────────────
 * The constants were not absurd. `WAVE_CAP` is 3.6 m/s; on a 1.6 kg beam that is 10.4 J from
 * rest, which is a fair price for a storey-sized shove. The fault was that every write was an
 * unconditional ADDITION. Applying dv to a body already moving at v along the same axis costs
 *
 *     dKE = m*(v . dv) + 0.5*m*|dv|^2
 *
 * and on a body already doing 5 m/s the cross term is three times the honest part — 39 J
 * instead of 10.4 J, for exactly the same 3.6 m/s of extra motion. So the layer was at its
 * most expensive precisely where it was least visible: shoving wreckage that was already
 * flying. That is where the +37.6 J single-step jolt came from.
 *
 * ── THE TWO RULES ────────────────────────────────────────────────────────────
 * **1. VELOCITY MATCHING, NOT VELOCITY ADDITION.** Every mechanism in this file now states a
 * TARGET velocity (or angular velocity) and delivers only the deficit between the body's
 * current state and that target. A shock front passing through a member cannot accelerate a
 * member that is already leaving faster than the front — physically it simply arrives late.
 * A block at rest gets exactly the impulse it always got, so the propagation this file exists
 * for is untouched; a block already departing gets nothing, which is both free and correct.
 *
 * **2. NOTHING IS WRITTEN THAT THE BLOW DID NOT PAY FOR.** `creditContact()` credits a pool
 * with the contact energy a PROJECTILE really delivered (blocks.js computes it as 0.5*J*v from
 * the RAW solver impulse, at the contact — see `lastBlowE` there), times `TRANSMIT`. Every
 * impulse and every torque this file applies is priced at its EXACT change in kinetic energy,
 *
 *     dKE = J.v + |J|^2/(2m) + tau*w + tau^2/(2I)        (tau = r x J, r = point - com)
 *
 * and debited. When the pool cannot pay in full the write is SCALED — the quadratic above is
 * solved for the largest fraction the pool can afford — rather than dropped, so the collapse
 * degrades smoothly instead of cliff-edging, and stays deterministic (the scale is a pure
 * function of body state and the ledger).
 *
 * ── WHY `TRANSMIT` IS WELL UNDER 1 ───────────────────────────────────────────
 * De-bracing releases CONSTRAINT, not energy. A dead-plumb column that loses its head
 * restraint sits at an unstable equilibrium: the energy needed to start it over is nearly
 * zero and gravity does all the work afterwards — and gravity's contribution is already in
 * the sim, which is exactly why the audit subtracts it. So the layer's honest share of a
 * blow is the small part that goes into breaking symmetry and shaking the frame; the rest of
 * the blow is spent fragmenting the block and is carried away by its debris, which the solver
 * has already handled. Set from the measured distribution, not from a guess.
 *
 * ── THE ONLY DEPOSITOR IS THE PLAYER'S SHOT, AND THAT IS THE WHOLE SAFETY ARGUMENT ──
 * The first version of this ledger credited on FRACTURE, from whatever blow killed the block.
 * That is a money printer with an extra step: this file shoves block A into block B, the
 * solver reports a contact, B breaks, and the layer is handed a fresh budget for the
 * consequences of its own spending. It was patched with a freshness window, which narrows the
 * loop without closing it, and it has a second fault that is worse — a shot that shakes the
 * tower WITHOUT breaking anything credits nothing, so it can buy nothing. Measured on l1
 * 0.32@0.94: a genuine 18 N·s hit, zero fractures, pool 0, every audit write refused for want
 * of a budget, and a frame still at its authored pose 800 ms later.
 *
 * So the credit is taken at the CONTACT and only from a live projectile (`creditContact`,
 * called from `Block.onImpact` inside its `flying` branch). Block-on-block contacts credit
 * nothing, whoever set them moving. The loop is closed by construction rather than by a
 * timer, and the cumulative energy this file can add over a shot is bounded by TRANSMIT times
 * the energy that shot actually delivered — which is the property PW round 3 had to prove.
 */
/**
 * Share of a shot's real contact energy this layer may redistribute as motion.
 *
 * 1.0 is the ceiling the round was set: the cumulative kinetic energy this file adds after a
 * blow may not exceed the contact energy that blow delivered. It is not a licence to spend
 * that much — measured over the 8-shot l1 gate the layer spends ~32 J of a ~90 J budget and
 * the fixed-cohort audit sees ~6 J of it survive as created energy, because most of what a
 * write puts into a block is taken straight back out by the contact it drives the block into.
 * The value matters far less than the property: whatever the layer spends, the shot paid for.
 *
 * Sweeping it (`_tools/scenarios/crit-PW-r3-ab.mjs`) is flat from 0.6 upward on every
 * propagation counterweight, and falls off a cliff below 0.4 — at 0.22 the pool is dry
 * within 40 writes of the first fracture and MOVED / FRAME / one-shot clears go
 * 8 -> 5, 5/6 -> 2.5/6, 5/8 -> 0/8.
 */
const TRANSMIT = 1.0;
/** Hard ceiling on the live pool, J. The pool is a buffer for the blow that is happening now,
 *  not a savings account — a shot that lands three hits may not bank all three and spend them
 *  as one. One dart carries 57-60 J and lands 60-75 J of contact energy, so a cap at 60 holds
 *  about one blow's worth and clips a multi-hit shot back to it. */
const POOL_CAP = 60;
/** Below this the pool is spent and writes are skipped outright, J. */
const POOL_FLOOR = 0.02;

function extents(b) {
  const t = b.body.translation();
  const ang = zAngleOf(b.body);
  const ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
  const hw = (b.w * ca + b.h * sa) / 2;
  const hh = (b.w * sa + b.h * ca) / 2;
  return { cx: t.x, cy: t.y, hw, hh, x0: t.x - hw, x1: t.x + hw, y0: t.y - hh, y1: t.y + hh };
}

/** Exact z-inertia of a cuboid — the colliders ARE cuboids, so this is not an estimate.
 *  Having it lets every number in this file be written in rad/s instead of in N·m·s. */
function inertiaZ(b, mass) { return Math.max(1e-4, mass * (b.w * b.w + b.h * b.h) / 12); }

class Structure {
  constructor() {
    this.nodes = new Map();     // block.id -> node
    this.queue = [];
    /** Live velocity ramps — see RACK_STEPS. Reset with the level like everything else. */
    this.drives = [];
    this.clock = 0;             // advances only inside update()
    this.wave = 0;
    this.enabled = true;
    /**
     * Which way the damage is travelling, +1 / -1. The audit runs on its own clock and has
     * no blow of its own to lean on, so it uses this.
     *
     * IT MUST BE RESET WITH THE LEVEL. It was not, for one build, and that single omission
     * made the game non-deterministic in a way the determinism gate cannot see: the gate
     * only settles a level, it never fires. Three identical shots from an identical seed
     * were bit-identical right up to the first fracture and then diverged, because the audit
     * was racking the tower with a lean left over from the PREVIOUS level's last collapse.
     * Anything in this file that survives `reset()` is a bug of exactly that shape.
     */
    this.lean = 1;
    /** The level is ARMED until this clock value. Only onCollapse() ever sets it, so a level
     *  nobody has hit never runs a line of the audit. */
    this.armedUntil = 0;
    this.nextAudit = 0;
    /**
     * THE POOL, in joules. Credited only by the real contact energy of a fracture; debited by
     * the exact kinetic energy of every write this file makes. Like `lean`, it MUST be reset
     * with the level — a pool carried across `reset()` is non-determinism of exactly the shape
     * described above, and it would let one level's last collapse pay for the next one's first.
     */
    this.pool = 0;
    /**
     * ── DEBUG A/B KNOBS. Nothing in `src/` ever writes these. ───────────────────
     * They exist so a scenario can price each half of the ledger separately ON ONE TREE
     * (ORCHESTRATOR-NOTES r6 §5: a number taken before another builder's edit is not
     * comparable to one taken after). Deliberately NOT reset by `reset()` — a sweep sets
     * them once and then reloads the level between shots.
     *   tuneTransmit  share of a fracture's contact energy credited (shipped: TRANSMIT)
     *   tuneMatch     false => nudge() ADDS velocity instead of matching a target
     *   tunePriced    false => spend() applies in full and keeps no ledger
     */
    this.tuneTransmit = TRANSMIT;
    this.tuneMatch = true;
    this.tunePriced = true;
    this.tunePoolCap = POOL_CAP;
    /** Precariousness knobs, same debug-only contract — see `crit-PW-r3-precarious.mjs`. */
    this.tuneDetachD = DETACH_D;
    this.tuneDetachA = DETACH_A;
    this.tuneRackTrigger = RACK_TRIGGER;
    this.tuneAuditTicks = AUDIT_TICKS;
    this.tuneHeadOv = HEAD_OV;
    /** Ramp / stagger knobs, same debug-only contract. 1 ramp step == the old single write;
     *  a writes-per-step of Infinity == the old "everything due fires on this tick". */
    this.tuneRackSteps = RACK_STEPS;
    this.tuneTipSteps = TIP_STEPS;
    this.tuneWritesPerStep = WRITES_PER_STEP;
    /** Which mechanism the write currently being priced belongs to, for `stats.byJ`. */
    this.spendTag = null;
    this.stats = this.freshStats();
  }

  freshStats() {
    return { collapses: 0, joints: 0, tips: 0, hinges: 0, loads: 0, hops: 0, racks: 0, audits: 0,
             detached: 0, creditJ: 0, spentJ: 0, starved: 0, poolPeak: 0,
             /** joules spent per mechanism — which part of the collapse the shot is paying
              *  for. Diagnostics only; the game never reads it. */
             byJ: { tip: 0, rack: 0, hop: 0, hinge: 0, load: 0, side: 0 } };
  }

  reset() {
    this.nodes.clear();
    this.queue.length = 0;
    this.drives.length = 0;
    this.clock = 0;
    this.wave = 0;
    this.lean = 1;              // downrange. See the constructor: this MUST be reset.
    this.armedUntil = 0;
    this.nextAudit = 0;
    this.pool = 0;              // the energy ledger. See the constructor: this MUST be reset.
    this.stats = this.freshStats();
  }

  // ══ THE LEDGER ═════════════════════════════════════════════════════════════
  // Two functions, and every body write in this file goes through them.

  /**
   * Price and apply one write — a linear impulse at a world point, optionally carrying an
   * extra pure torque — against the pool.
   *
   * The price is the EXACT change in the body's kinetic energy, not an estimate:
   *
   *     tau  = tauZ + (r x J).z                     r = point - centre of mass
   *     dKE  = J.v + |J|^2/(2m)  +  tau*w + tau^2/(2I)
   *          = a*s^2 + c*s    with  a = |J|^2/(2m) + tau^2/(2I),  c = J.v + tau*w
   *
   * `a` is what the write costs on a body at rest and can never be negative; `c` is the cross
   * term with the motion the body already has, and it is the term that made the collapse
   * expensive (see the file header). When the pool cannot pay the whole write, that quadratic
   * is solved for the largest fraction it CAN pay and the write is scaled to it rather than
   * dropped — a scaled shove still reads as a shove, a dropped one reads as a block bolted to
   * the sky. The scale is a pure function of body state and the pool, so it is deterministic.
   *
   * A write whose dKE is negative — one that takes energy OUT of a body — is free, and is
   * never refunded into the pool. The ledger is a ceiling on creation, not a currency.
   *
   * @returns {number} the fraction of the requested write actually applied, 0..1
   */
  spend(node, jx, jy, px, py, tauZ = 0) {
    const body = node.b?.body;
    if (!body) return 0;
    const m = node.mass, I = node.inertia;
    if (!(m > 0) || !(I > 0)) return 0;
    const t = body.translation();
    const tau = tauZ + ((px - t.x) * jy - (py - t.y) * jx);
    const v = body.linvel(), w = body.angvel();
    const a = (jx * jx + jy * jy) / (2 * m) + (tau * tau) / (2 * I);
    const c = jx * v.x + jy * v.y + tau * w.z;

    let s = 1;
    if (!this.tunePriced) {
      if (jx !== 0 || jy !== 0) {
        body.applyImpulseAtPoint({ x: jx, y: jy, z: 0 }, { x: px, y: py, z: 0 }, true);
      }
      if (tauZ !== 0) body.applyTorqueImpulse({ x: 0, y: 0, z: tauZ }, true);
      this.stats.spentJ += Math.max(0, a + c);
      if (this.spendTag) this.stats.byJ[this.spendTag] += Math.max(0, a + c);
      return 1;
    }
    if (a + c > this.pool) {
      if (this.pool <= POOL_FLOOR) { this.stats.starved++; return 0; }

      s = a > 1e-12
        ? (-c + Math.sqrt(Math.max(0, c * c + 4 * a * this.pool))) / (2 * a)
        : (c > 1e-12 ? this.pool / c : 1);
      if (!(s > 0)) { this.stats.starved++; return 0; }
      if (s > 1) s = 1;
    }
    const paid = a * s * s + c * s;
    if (paid > 0) {
      this.pool -= paid; this.stats.spentJ += paid;
      if (this.spendTag) this.stats.byJ[this.spendTag] += paid;
    }

    if (jx !== 0 || jy !== 0) {
      body.applyImpulseAtPoint({ x: jx * s, y: jy * s, z: 0 }, { x: px, y: py, z: 0 }, true);
    }
    if (tauZ !== 0) body.applyTorqueImpulse({ x: 0, y: 0, z: tauZ * s }, true);
    return s;
  }

  /**
   * VELOCITY MATCHING — the other half of the fix, and the half that is free.
   *
   * Bring a member UP TO `vTarget` m/s along the unit vector (ux, uy) and UP TO `omTarget`
   * rad/s about z, and no further. A member already leaving faster than the disturbance gets
   * nothing: a shock front cannot accelerate something that has already outrun it, and an
   * unconditional addition there was both physically false and — through the `J.v` cross term
   * — the single most expensive thing this file did. A member at rest, which is every member
   * the propagation actually needs to move, gets exactly the impulse it always got.
   *
   * The torque asked for is reduced by whatever spin the linear impulse itself induces at
   * `(px,py)`, so the two halves of a topple are one priced write and cannot double up.
   *
   * `dvCap` / `domCap` bound how much of the deficit ONE call may close, and they are what
   * makes a ramp a ramp instead of a servo (see RACK_STEPS). Without them, re-stating the
   * same target on the next step tops the member back up to it after the contacts have taken
   * their share — a motor, not a shove, and measured as WORSE than the single write it
   * replaced (created energy 12.2 -> 30.8 J on l1 0.30@0.90). With them, a ramp step delivers
   * at most its own slice of the ORIGINAL write and never chases the block: total delivery
   * over the whole ramp is bounded by the one write it stands in for.
   *
   * @returns {number} the fraction actually applied, 0..1 (0 = already there, or pool dry)
   */
  nudge(node, ux, uy, vTarget, omTarget, px, py, dvCap = Infinity, domCap = Infinity) {
    const body = node.b?.body;
    if (!body) return 0;
    const v = body.linvel(), w = body.angvel();
    let jx = 0, jy = 0;
    if (vTarget > 0) {
      let need = this.tuneMatch ? vTarget - (v.x * ux + v.y * uy) : vTarget;
      if (need > dvCap) need = dvCap;
      if (need > 1e-5) { jx = ux * need * node.mass; jy = uy * need * node.mass; }
    }
    let tauZ = 0;
    if (omTarget !== 0) {
      const t = body.translation();
      const tauR = (px - t.x) * jy - (py - t.y) * jx;
      const want = this.tuneMatch ? omTarget - w.z - tauR / node.inertia : omTarget;
      // never reverse the member, and never spin it past the target the disturbance implies
      let dw = omTarget > 0 ? Math.max(0, Math.min(want, omTarget))
                            : Math.min(0, Math.max(want, omTarget));
      if (dw > domCap) dw = domCap; else if (dw < -domCap) dw = -domCap;
      tauZ = dw * node.inertia;
    }
    if (jx === 0 && jy === 0 && tauZ === 0) return 0;
    return this.spend(node, jx, jy, px, py, tauZ);
  }

  /**
   * Solve the joint graph from the authored poses, after every Block exists.
   * O(n^2) over ~17 blocks; measured at 0.05 ms.
   */
  build() {
    this.reset();
    const bs = world.blocks.filter(b => !b.dead && b.body);
    for (const b of bs) {
      const e = extents(b);
      this.nodes.set(b.id, {
        b, e,
        home: { x: e.cx, y: e.cy, a: zAngleOf(b.body) },   // the AUTHORED pose, for detachment
        above: [], below: [], side: [],
        mass: b.body.mass(),
        inertia: inertiaZ(b, b.body.mass()),
        column: e.hh > e.hw * ASPECT,
        beam: e.hw > e.hh * ASPECT,
        grounded: e.y0 <= 0.14,
        carried: 0, carried0: 0,
        /** set once the audit or a joint failure has let this member go — every release is
         *  one-shot, so nothing can be pumped with energy twice. */
        released: false, hinged: false, detached: false, rackedFrac: 0,
        bracedAtBuild: false, proppedAtBuild: false,
      });
    }
    const list = [...this.nodes.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        const ox = Math.min(A.e.x1, B.e.x1) - Math.max(A.e.x0, B.e.x0);
        const oy = Math.min(A.e.y1, B.e.y1) - Math.max(A.e.y0, B.e.y0);
        if (ox < -GAP || oy < -GAP) continue;
        if (oy < ox) {
          // they meet across a horizontal face — the higher centre is the one on top
          const [lo, hi] = A.e.cy <= B.e.cy ? [A, B] : [B, A];
          const ov = Math.max(0.02, ox);
          lo.above.push({ n: hi, ov });
          hi.below.push({ n: lo, ov });
        } else {
          const ov = Math.max(0.02, oy);
          A.side.push({ n: B, ov });
          B.side.push({ n: A, ov });
        }
      }
    }
    for (const n of this.nodes.values()) {
      n.bracedAtBuild = n.above.length > 0;
      n.proppedAtBuild = n.below.length > 0;
    }
    this.solveLoad();
    for (const n of this.nodes.values()) n.carried0 = n.carried;
    return this.nodes.size;
  }

  /**
   * `carried` = kilograms of structure each block holds up. Solved top-down: every node
   * hands its running total to the supporters underneath it, split by how much of its
   * footprint each one carries. This is the number that decides how violent a break is —
   * killing a roof tile releases nothing; killing the beam four posts hold up releases the
   * whole upper storey.
   */
  solveLoad() {
    const order = [...this.nodes.values()].sort((a, b) => b.e.cy - a.e.cy);
    const total = new Map();
    for (const n of order) total.set(n, n.mass);
    for (const n of order) {
      // A member that has left its authored pose is no longer standing ON anything — it is
      // falling past. It stops being load AND stops being a supporter, which is how a storey
      // that topples away rather than shattering releases the frame underneath it.
      if (n.detached) { total.set(n, 0); continue; }
      const t = total.get(n);
      let sum = 0;
      for (const l of n.below) if (!l.n.b.dead && !l.n.detached) sum += l.ov;
      if (sum <= 0) continue;
      for (const l of n.below) {
        if (l.n.b.dead || l.n.detached) continue;
        total.set(l.n, total.get(l.n) + t * (l.ov / sum));
      }
    }
    for (const n of this.nodes.values()) n.carried = Math.max(0, total.get(n) - n.mass);
  }

  forget(node) {
    this.nodes.delete(node.b.id);
    for (const n of this.nodes.values()) {
      n.above = n.above.filter(l => l.n !== node);
      n.below = n.below.filter(l => l.n !== node);
      n.side = n.side.filter(l => l.n !== node);
    }
    this.solveLoad();
  }

  /**
   * A block has just come apart. The ONLY entry point, called from `Block.fracture()`
   * immediately before the block is destroyed — while its node still exists and its links
   * are still intact.
   *
   * @param {Block} block
   * @param {number} impulse  the blow that killed it, in DAMAGE units (N·s scaled — see the
   *                          note on `blowE`: this is a severity read, never energy)
   * @param {{x,y}} dir       unit vector the energy was travelling along
   */
  onCollapse(block, impulse, dir) {
    if (!this.enabled) return;
    const node = this.nodes.get(block.id);
    if (!node) return;
    this.stats.collapses++;
    this.arm(Number.isFinite(dir?.x) ? dir.x : undefined);

    /**
     * A FRACTURE IS NOT AN ENERGY SOURCE — see the header. Everything this file spends was
     * paid for at the contact, by `creditContact()`, from a live projectile. A chain fracture
     * — a block killed by another block, or finished off by this file's own shudder — credits
     * nothing at all. That is what makes the loop "spend joules -> break a member -> be handed
     * a budget for having broken it" structurally unreachable instead of merely narrow.
     */

    const dx = Number.isFinite(dir?.x) ? dir.x : 1;
    const dy = Number.isFinite(dir?.y) ? dir.y : 0;


    // Snapshot the joints BEFORE forget() unlinks them.
    const joints = [];
    for (const l of node.above) joints.push({ n: l.n, rel: 'lostBelow', ov: l.ov });
    for (const l of node.below) joints.push({ n: l.n, rel: 'lostAbove', ov: l.ov });
    for (const l of node.side) joints.push({ n: l.n, rel: 'side', ov: l.ov });

    /**
     * The shudder's energy. `carried0` — what this member held up when the level was built,
     * not what is left of it now — is deliberate: by the time a mid beam finally fails, the
     * storey it was carrying is usually already debris, and a beam that spent the whole
     * level holding up a tower is a structural member whether or not the tower is still
     * there. Using the live figure made a load-bearing break read as a twig snapping.
     */
    const load = Math.max(node.carried, node.carried0 * 0.55);
    const E0 = Math.min(WAVE_CAP, impulse * 0.12 + load * 0.55 + 0.50);

    // Everything the dead node knows must be read before this line.
    this.forget(node);

    const wave = ++this.wave;
    for (const j of joints) {
      if (j.n.b.dead) continue;
      this.queue.push({
        kind: 'joint', id: j.n.b.id, rel: j.rel, ov: j.ov,
        deadMass: node.mass, deadLoad: load, deadAt: { x: node.e.cx, y: node.e.cy },
        deadHalf: { w: node.e.hw, h: node.e.hh },
        dir: { x: dx, y: dy }, wave,
        at: this.clock + JOINT_TICKS + Math.floor(rng() * 4),
      });
    }
    if (E0 >= ENERGY_FLOOR) {
      const seen = new Set([block.id]);
      for (const j of joints) {
        if (j.n.b.dead) continue;
        this.queue.push({
          kind: 'wave', id: j.n.b.id, energy: E0, hop: 1, wave, seen,
          dir: { x: dx, y: dy }, from: { x: node.e.cx, y: node.e.cy },
          at: this.clock + 2 + Math.floor(rng() * 3),
        });
      }
    }
    this.dropOrphans(dx, wave);
  }

  /**
   * ── THE ONLY DEPOSIT INTO THE LEDGER ────────────────────────────────────────
   * Called from `Block.onImpact`, inside its `flying` branch: a projectile the player
   * launched, still travelling like one, has struck a block and the solver has reported how
   * much energy that contact carried. This is the one place mechanical energy enters the
   * level from outside it, so it is the one place this file is allowed to take a budget.
   *
   * `blowE` is joules — `0.5 * rawImpulse * approach`, computed in blocks.js off the RAW
   * solver impulse before any of the damage model's severity scaling touches it. Do NOT feed
   * this the damage number; they are different currencies and only one of them is conserved.
   *
   * @param {number} blowE  contact energy the blow delivered, J
   */
  creditContact(blowE) {
    if (!this.enabled || !(blowE > 0)) return;
    const credit = blowE * this.tuneTransmit;
    this.pool = Math.min(this.tunePoolCap, this.pool + credit);
    this.stats.creditJ += credit;
    if (this.pool > this.stats.poolPeak) this.stats.poolPeak = this.pool;
  }

  /**
   * Something in the level has genuinely been HIT. Opens the audit window for ARM_TICKS.
   *
   * Called from `Block.onImpact` AFTER its approach-speed gate (level/blocks.js decision 1),
   * so a settled structure — which generates enormous resting contact forces every single
   * step and zero approach speed — never reaches this line. That gate is the whole safety
   * argument: on an untouched level `armedUntil` stays 0 for ever and `update()` returns
   * without executing a comparison.
   *
   * It is armed on IMPACT rather than only on a break because the case the audit exists for
   * is precisely the one where nothing breaks: measured on l1 shot 0.26@0.95, the projectile
   * shoved five blocks of the upper storey clear of their poses WITHOUT destroying any of
   * them, so a break-armed audit never ran and the ground floor sat at 0.00 rad for 1.2 s
   * underneath a storey that had already left.
   */
  arm(dirX) {
    if (!this.enabled) return;
    this.armedUntil = this.clock + ARM_TICKS;
    if (Number.isFinite(dirX) && Math.abs(dirX) > 0.2) this.lean = Math.sign(dirX);
  }

  /**
   * Runs inside the fixed step, from main.js. A no-op on any tick where nothing has broken:
   * the queue is empty and `armedUntil` is 0 on an untouched level, so this returns on its
   * first line and the audit below never executes a comparison. That is the whole of P3's
   * "stable at rest" safety argument, and it is why the audit is allowed to be as aggressive
   * as it is.
   */
  update() {
    const live = this.queue.length > 0 || this.drives.length > 0;
    if (!live && this.clock >= this.armedUntil) {
      // The collapse is over. Whatever the last blow paid for and this file did not spend
      // expires with it — a pool that survives the event it belongs to is a war chest, and
      // the next graze would inherit it.
      this.pool = 0;
      return;
    }
    this.clock++;

    if (this.drives.length) this.runDrives();

    if (this.queue.length) {
      const due = [];
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].at <= this.clock) due.push(this.queue[i]);
      }
      if (due.length) {
        this.queue = this.queue.filter(q => q.at > this.clock);
        // At most WRITES_PER_STEP body writes per solver step; the rest keep their queue
        // order and land on the next one. See the constant: independent effects coinciding
        // on one 8.3 ms step was the last source of a visible energy jump.
        for (let i = 0; i < due.length; i++) {
          const it = due[i];
          if (i < this.tuneWritesPerStep) {
            if (it.kind === 'joint') this.joint(it);
            else this.shudder(it);
          } else {
            it.at = this.clock + 1;
            this.queue.push(it);
          }
        }
      }
    }

    if (this.clock >= this.nextAudit) {
      this.nextAudit = this.clock + this.tuneAuditTicks;
      this.audit();
    }
  }

  // -------------------------------------------------------------------------
  // JOINT FAILURE — one dead neighbour, one surviving member, one honest reaction
  // -------------------------------------------------------------------------
  joint(it) {
    const node = this.nodes.get(it.id);
    if (!node) return;
    const b = node.b;
    if (!b || b.dead || b.fixed || !b.body) return;
    const e = extents(b);
    node.e = e;
    this.stats.joints++;

    /**
     * How much this joint mattered. A mid beam disappearing from under a post is total; a
     * chip falling off its shoulder is nothing. Mass ratio, tempered by how much of the
     * face they actually shared.
     */
    const face = Math.min(1, it.ov / Math.max(0.25, it.rel === 'side' ? e.hh * 2 : e.hw * 2));
    const sig = Math.max(0.15, Math.min(1,
      (it.deadMass / (it.deadMass + node.mass)) * 2 * (0.45 + 0.55 * face)));

    // Which way the damage is: toward the hole the dead block left, biased by the blow.
    let awayX = e.cx - it.deadAt.x;
    if (Math.abs(awayX) < 1e-3) awayX = it.dir.x;
    const toVoid = Math.sign(-awayX) || 1;          // the block leans INTO the gap
    const lean = Math.abs(it.dir.x) > 0.35 ? Math.sign(it.dir.x) : toVoid;

    if (it.rel === 'lostAbove' && node.column) {
      // ── A COLUMN LOST ITS HEAD RESTRAINT. It goes over. ──────────────────
      // Flagged `released` so the audit, which is looking for exactly this state, does not
      // pay for the same topple a second time 67 ms later.
      node.released = true;
      this.tipColumn(node, e, lean, sig);
    } else if (it.rel === 'lostAbove') {
      /**
       * ── A BEAM (or a lump) HAS JUST HAD A STOREY DROPPED ON IT. ──────────
       * The load it was carrying arrives all at once, off-centre, where the dead member
       * used to stand. See LOAD_DAMAGE: this is what breaks the beam that the ground-floor
       * posts are braced by, and it is why a collapse travels down instead of stopping.
       *
       * THE KICK IS THE COLLISION, NOT THE LOAD. It used to be an impulse of
       * `LOAD_DROP_V * drop` newton-seconds handed to a beam of `node.mass` — i.e. a Δv of
       * `1.5 * 20 / 1.6` = **18.7 m/s** on l1's bottom beam, a fiction of the same shape
       * PW r2 removed from the damage model. What a storey landing on a beam really does is
       * an inelastic collision, so the pair ends up sharing the load's momentum:
       *
       *     dv = LOAD_DROP_V * drop / (drop + mass)          -> at most LOAD_DROP_V
       *
       * which is 1.39 m/s on that same beam and is mass-invariant by construction. The
       * DAMAGE is unchanged and is deliberately not scaled by what the ledger could afford:
       * a storey landing on a beam is a real event with a real severity, and `drop` is the
       * severity read P3 signed off. Only the velocity fiction is gone.
       */
      const drop = Math.max(0, (it.deadLoad ?? 0) + it.deadMass);
      const px = Math.max(e.x0 + e.hw * 0.1, Math.min(e.x1 - e.hw * 0.1, it.deadAt.x));
      const dv = LOAD_DROP_V * drop / Math.max(1e-3, drop + node.mass);
      let ux = lean * 0.25, uy = -1;
      const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
      this.spendTag = 'load';
      this.nudge(node, ux, uy, dv * ul, 0, px, e.cy + e.hh * 0.9);
      this.spendTag = null;
      b.onShock?.(drop * LOAD_DAMAGE, lean, -0.35);
      this.stats.loads++;
    } else if (it.rel === 'lostBelow') {
      // ── SOMETHING I WAS STANDING ON IS GONE. Hinge down over the hole. ───
      // The impulse lands above where the support used to be, clamped to my own footprint,
      // so a beam swings about the support that is LEFT instead of dropping flat.
      const px = Math.max(e.x0 + e.hw * 0.15, Math.min(e.x1 - e.hw * 0.15, it.deadAt.x));
      const v = HINGE_V * sig * (node.beam ? 1.0 : 0.7);
      let ux = lean * 0.35, uy = -1;
      const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
      this.spendTag = 'hinge';
      this.nudge(node, ux, uy, v * ul, 0, px, e.cy - e.hh * 0.9);
      this.spendTag = null;
      this.stats.hinges++;
    } else {
      // ── A SIDE BRACE OR A SHOULDER LOAD IS GONE. Lean, do not launch. ────
      const v = SIDE_V * sig;
      const py = e.cy + e.hh * (node.column ? 0.7 : 0.25);
      const om = node.column ? -lean * TIP_OMEGA * 0.35 * sig : 0;
      this.spendTag = 'side';
      this.nudge(node, lean, 0, v, om, e.cx + rngJitter(e.hw * 0.3), py);
      this.spendTag = null;
      if (node.column) this.stats.tips++;
    }
  }

  // -------------------------------------------------------------------------
  // THE SHUDDER — weak, wide, and staggered
  // -------------------------------------------------------------------------
  shudder(it) {
    const node = this.nodes.get(it.id);
    if (!node) return;
    const b = node.b;
    if (!b || b.dead || b.fixed || !b.body) return;
    const e = extents(b);
    node.e = e;
    this.stats.hops++;

    // Along the blow, blended with the direction away from what died. A pure radial burst
    // is the symmetrical starburst the reference frames never show; a pure blow direction
    // ignores which side of the tower the hole is on.
    let ax = e.cx - it.from.x, ay = e.cy - it.from.y;
    const al = Math.hypot(ax, ay) || 1;
    const R = 1 - WAVE_ALONG_BLOW;
    let ux = it.dir.x * WAVE_ALONG_BLOW + (ax / al) * R;
    let uy = it.dir.y * WAVE_ALONG_BLOW + (ay / al) * R;
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;

    const dv = Math.min(WAVE_CAP, it.energy);
    /**
     * Vertical is damped hard: a structural shock shoves sideways and lets gravity do the
     * falling. Upward-flung blocks read as an explosion, not a collapse.
     *
     * AND THE WAVE MATCHES A SPEED, IT DOES NOT ADD ONE. This one line is where the +37.6 J
     * single-step jolt lived. A member already travelling with the front faster than the
     * front itself cannot be accelerated by it — the shock simply arrives late — and adding
     * to it cost `m*(v . dv)` on top of the honest `0.5*m*|dv|^2`, three times the price for
     * motion nobody could see. A member at rest, which is every member the collapse actually
     * needs to move, gets exactly what it always got.
     */
    let hx = ux, hy = uy * 0.22;
    const hl = Math.hypot(hx, hy) || 1;
    hx /= hl; hy /= hl;
    this.spendTag = 'hop';
    const frac = this.nudge(node, hx, hy, dv * hl, 0,
      e.cx + rngJitter(e.hw * 0.30), e.cy + e.hh * 0.35);
    this.spendTag = null;

    // The damage a shock carries is a tenth of what it DELIVERED, so a wave that arrived
    // late (or that the ledger could not pay for in full) does not damage as if it had not.
    if (frac > 0) b.onShock?.(dv * node.mass * frac * SHOCK_DAMAGE, ux, uy);
    if (b.dead) return;             // it broke; its own onCollapse carries the wave on

    const next = dv * HOP_DECAY;
    if (it.hop >= MAX_HOPS || next < ENERGY_FLOOR) return;
    const seen = new Set(it.seen); seen.add(it.id);
    const outs = [];
    for (const l of node.above) if (!seen.has(l.n.b.id)) outs.push(l.n);
    for (const l of node.below) if (!seen.has(l.n.b.id)) outs.push(l.n);
    for (const l of node.side) if (!seen.has(l.n.b.id)) outs.push(l.n);
    for (const o of outs) {
      seen.add(o.b.id);
      this.queue.push({
        kind: 'wave', id: o.b.id, energy: next, hop: it.hop + 1, wave: it.wave, seen,
        dir: { x: ux, y: uy }, from: { x: e.cx, y: e.cy },
        at: this.clock + HOP_TICKS + Math.floor(rng() * 4),
      });
    }
  }

  // -------------------------------------------------------------------------
  // THE SUPPORT AUDIT — re-read the world, not the graph
  // -------------------------------------------------------------------------
  /**
   * Every AUDIT_TICKS while the level is armed. Three passes, cheapest first, over <= ~20
   * nodes: mark what has left the frame, re-solve the load with those gone, then release
   * whatever that leaves standing on nothing. See the long note above AUDIT_TICKS.
   */
  audit() {
    this.stats.audits++;
    const lean = this.lean || 1;

    // 1. who has left the frame?
    let changed = false;
    for (const n of this.nodes.values()) {
      if (n.detached) continue;
      const b = n.b;
      if (!b || b.dead || !b.body) { n.detached = true; changed = true; continue; }
      if (b.fixed) continue;
      const e = extents(b);
      n.e = e;
      const d = Math.hypot(e.cx - n.home.x, e.cy - n.home.y);
      const da = Math.abs(zAngleOf(b.body) - n.home.a);
      if (d >= this.tuneDetachD || da >= this.tuneDetachA) { n.detached = true; changed = true; this.stats.detached++; }
    }
    if (changed) this.solveLoad();

    // 2. a lintel that has lost its storey racks the bay underneath it
    for (const n of this.nodes.values()) {
      if (n.detached || n.b.dead || n.b.fixed || !n.b.body) continue;
      if (n.carried0 <= 1e-3 || !n.proppedAtBuild) continue;
      const frac = Math.min(1, Math.max(0, (n.carried0 - n.carried) / n.carried0));
      const fresh = frac - n.rackedFrac;
      if (fresh >= this.tuneRackTrigger) { n.rackedFrac = frac; this.rack(n, lean, fresh); }
    }

    // 3. what is now standing on nothing?
    for (const n of this.nodes.values()) {
      const b = n.b;
      if (!b || b.dead || b.fixed || !b.body || n.detached) continue;
      const e = n.e = extents(b);
      if (n.column && n.bracedAtBuild && !n.released && this.headClear(n, e)) {
        n.released = true;
        this.tipColumn(n, e, lean, 0.85);
      } else if (n.beam && n.proppedAtBuild && !n.hinged && !n.grounded) {
        const span = this.footSpan(n, e);
        // no support at all is dropOrphans' business (and gravity's). A support that has all
        // moved to ONE side of my own centre of mass is a cantilever, and cantilevers hinge.
        if (span && (span.x1 < e.cx - 0.04 || span.x0 > e.cx + 0.04)) {
          n.hinged = true;
          const side = span.x1 < e.cx ? 1 : -1;      // the unsupported end
          /**
           * THE LAST UNPRICED WRITE IN THE FILE, AND IT IS CLOSED (PW r3b). This branch
           * called `applyImpulseAtPoint` directly, so a cantilever hinge was neither matched
           * against the member's own motion nor debited from the ledger — a hole of exactly
           * the shape the header's second rule exists to forbid. It is the same impulse,
           * `mass * HINGE_V * (0.30, -1)` at the unsupported end, stated as the velocity
           * target that impulse implies so `nudge` can price it and refuse to pay twice for
           * an end that is already on its way down.
           */
          let ux = lean * 0.30, uy = -1;
          const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
          this.spendTag = 'hinge';
          this.nudge(n, ux, uy, HINGE_V * ul, 0, e.cx + side * e.hw * 0.85, e.cy);
          this.spendTag = null;
          this.stats.hinges++;
        }
      }
    }
  }

  /** Is anything still standing on this member's head? Reads live extents, not links. */
  headClear(n, e) {
    for (const m of this.nodes.values()) {
      if (m === n || m.b.dead || !m.b.body) continue;
      const me = m.detached ? extents(m.b) : m.e;
      if (Math.abs(me.y0 - e.y1) > FACE_TOL) continue;
      if (Math.min(me.x1, e.x1) - Math.max(me.x0, e.x0) > this.tuneHeadOv) return false;
    }
    return true;
  }

  /** The x-range over which this member is still supported from below, or null. */
  footSpan(n, e) {
    let x0 = Infinity, x1 = -Infinity;
    if (e.y0 <= 0.14) return { x0: e.x0, x1: e.x1 };          // sitting on the ground
    for (const m of this.nodes.values()) {
      if (m === n || m.b.dead || !m.b.body || m.detached) continue;
      const me = m.e;
      if (Math.abs(me.y1 - e.y0) > FACE_TOL) continue;
      const lo = Math.max(me.x0, e.x0), hi = Math.min(me.x1, e.x1);
      if (hi - lo <= 0.06) continue;
      x0 = Math.min(x0, lo); x1 = Math.max(x1, hi);
    }
    return x1 > x0 ? { x0, x1 } : null;
  }

  /**
   * ── THE VELOCITY RAMPS ──────────────────────────────────────────────────────
   * One step of every live ramp, run at the top of `update()` before the queue. The target
   * grows linearly with the step index — a constant torque — and each step is an ordinary
   * priced velocity MATCH, so the ramp reaches exactly the state the old single write
   * produced while no one step can jolt. Iterated in insertion order, so it is as
   * deterministic as the queue it sits beside.
   */
  runDrives() {
    const keep = [];
    for (const d of this.drives) {
      d.step++;
      if (d.kind === 'rack') this.driveRack(d);
      else this.driveTip(d);
      if (d.step < d.n) keep.push(d);
    }
    this.drives = keep;
  }

  /** One step of a bay's rigid-body velocity field about its latched toe. The TARGET is the
   *  full rate — a member is never driven past the rotation the bay is going over at — and
   *  each step may close at most 1/n of the deficit it found on the step it started from, so
   *  the ramp delivers one write's worth of impulse spread over `n` steps and never tops a
   *  member back up after a contact has taken its share.
   *  `r` is re-read from the live pose every step, so the field stays the rotation of the bay
   *  as it now is rather than of the bay as it was when it let go. Detached members are
   *  deliberately still driven: a racking bay leaves its authored pose by construction, and
   *  dropping it out of its own rack mid-topple is what would make the assembly come apart in
   *  mid-air. */
  driveRack(d) {
    const om = d.om;
    for (const id of d.ids) {
      const m = this.nodes.get(id);
      if (!m || !m.b || m.b.dead || m.b.fixed || !m.b.body) continue;
      const me = m.e = extents(m.b);
      const rx = me.cx - d.px, ry = me.cy - d.py;
      let vx = -om * ry, vy = om * rx * RACK_LIFT;
      const sp = Math.hypot(vx, vy);
      if (sp > RACK_VMAX) { const q = RACK_VMAX / sp; vx *= q; vy *= q; }
      const vl = Math.hypot(vx, vy);
      this.spendTag = 'rack';
      if (vl > 1e-6) this.nudge(m, vx / vl, vy / vl, vl, om, me.cx, me.cy, vl / d.n, Math.abs(om) / d.n);
      else this.nudge(m, 1, 0, 0, om, me.cx, me.cy, 0, Math.abs(om) / d.n);
      this.spendTag = null;
    }
  }

  /** One step of a de-braced column going over — same rule: full target, 1/n of it per step. */
  driveTip(d) {
    const n = this.nodes.get(d.id);
    if (!n || !n.b || n.b.dead || n.b.fixed || !n.b.body) return;
    const e = n.e = extents(n.b);
    this.spendTag = 'tip';
    this.nudge(n, d.lean, 0, d.v, d.om, e.cx, e.cy + e.hh * 0.80,
               d.v / d.n, Math.abs(d.om) / d.n);
    this.spendTag = null;
  }

  /** A slender member with nothing holding its head goes over. Shared by joint() and audit().
   *  Spin and head-push are ONE priced write per ramp step — `nudge` subtracts the spin the
   *  head push already induces, so a topple cannot be paid for twice. The random factor is
   *  drawn HERE, at schedule time, in graph order, exactly as it was when this applied in
   *  one step. */
  tipColumn(n, e, lean, k = 1) {
    const w = TIP_OMEGA * k * rngRange(0.8, 1.15);
    this.drives.push({ kind: 'tip', id: n.b.id, lean,
                       v: TIP_V * k, om: -lean * w, step: 0, n: Math.max(1, this.tuneTipSteps) });
    this.stats.tips++;
  }

  // -------------------------------------------------------------------------
  // THE RACK — a bay that has been unloaded goes over as one object
  // -------------------------------------------------------------------------
  /**
   * @param {object} node  the lintel that lost the load
   * @param {number} lean  +1 / -1, the direction the damage is travelling
   * @param {number} k     the FRESH fraction of its original load that has just gone
   */
  rack(node, lean, k) {
    const bay = [node];
    for (const l of node.below) {
      const p = l.n;
      if (p.b.dead || p.b.fixed || !p.b.body || p.detached || p.grounded) continue;
      bay.push(p);
    }
    if (bay.length < 2) return;                 // a lintel with no live legs is just falling

    // The toe: the downwind bottom corner of the bay. Everything rotates about this point.
    let px = lean > 0 ? -Infinity : Infinity, py = Infinity;
    for (const m of bay) {
      const me = m.e = extents(m.b);
      py = Math.min(py, me.y0);
      px = lean > 0 ? Math.max(px, me.x1) : Math.min(px, me.x0);
    }
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    this.stats.racks++;
    // The bay's rigid velocity field is a TARGET, not an addition: a member already moving
    // with the rotation is already racking, and paying to push it further is what turns a
    // topple into a launch. It is also a RAMP rather than one write (see RACK_STEPS) —
    // applied at the centre of mass, so the spin is the whole of the member's rotation and
    // `nudge` has no induced torque to subtract.
    const om = -lean * RACK_OMEGA * Math.min(1, k) * rngRange(0.90, 1.12);
    this.drives.push({ kind: 'rack', ids: bay.map(m => m.b.id),
                       px, py, om, step: 0, n: Math.max(1, this.tuneRackSteps) });
    for (const m of bay) {
      // Its head restraint is going over with it. Do not also tip it as a lone column.
      if (m !== node) m.released = true;
    }
  }

  /**
   * Which blocks still have a path to the ground? Anything that does not is standing on a
   * hole. Rapier will drop it, but a symmetric block dropped straight down lands flat and
   * the tower reads as a lift descending rather than as a collapse — so give each orphan a
   * lean in the direction of the damage and let gravity finish the job.
   */
  dropOrphans(dirX, wave) {
    const reached = new Set();
    const stack = [];
    for (const n of this.nodes.values()) if (n.grounded) { reached.add(n); stack.push(n); }
    while (stack.length) {
      const n = stack.pop();
      for (const l of n.above) if (!reached.has(l.n)) { reached.add(l.n); stack.push(l.n); }
      for (const l of n.side) if (!reached.has(l.n)) { reached.add(l.n); stack.push(l.n); }
    }
    let k = 0;
    for (const n of this.nodes.values()) {
      if (reached.has(n) || n.b.dead || n.b.fixed || !n.b.body) continue;
      const e = extents(n.b);
      const sx = dirX >= 0 ? 1 : -1;
      this.queue.push({
        kind: 'joint', id: n.b.id, rel: 'side', ov: e.hh * 2,
        deadMass: n.mass * 1.4, deadAt: { x: e.cx - sx * 2, y: e.cy },
        deadHalf: { w: e.hw, h: e.hh },
        dir: { x: sx, y: -0.2 }, wave,
        at: this.clock + 2 + (k++ % 4) * 2,
      });
    }
  }

  /** Diagnostics for the harness — never read by the game. */
  report() {
    const rows = [];
    for (const n of this.nodes.values()) {
      rows.push({
        m: n.b.matName, x: +n.e.cx.toFixed(2), y: +n.e.cy.toFixed(2),
        mass: +n.mass.toFixed(2), carried: +n.carried.toFixed(2), carried0: +n.carried0.toFixed(2),
        above: n.above.length, below: n.below.length, side: n.side.length,
        col: n.column, beam: n.beam, grounded: n.grounded,
        released: n.released, hinged: n.hinged, detached: n.detached,
        rackedFrac: +n.rackedFrac.toFixed(2),
      });
    }
    return { nodes: rows, queue: this.queue.length, drives: this.drives.length,
             armed: this.clock < this.armedUntil, ...this.stats };
  }
}

export const structure = new Structure();
