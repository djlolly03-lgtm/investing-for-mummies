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
/**
 * Distance / angle at which a member has visibly left the frame and stops carrying load.
 *
 * ── TIGHTENED IN PW ROUND 5, AND IT IS A COUNTERWEIGHT, NOT A TUNING ─────────
 * Round 5 made `Block.fracture` conserve energy: debris is no longer born with a free
 * downrange kick, so a collapse is carried by real load transfer instead of by wreckage
 * being thrown at the next block. That is correct and it cost propagation — MOVED at
 * contact+800 ms fell 8.5 -> 8 on the l1 gate. The brief's instruction for exactly this
 * case is to make the STRUCTURE more precarious rather than re-inflate the spawn.
 *
 * Of the four precariousness levers this file exposes, three are INERT on l1: swept back to
 * back on one tree (`_tools/scenarios/pw-r5-prec.mjs`), `tuneHeadOv` 0.06 -> 0.14 and
 * `tuneRackTrigger` 0.30 -> 0.20 reproduce the base arm shot for shot, to the decimal, on
 * all eight gate shots. Only the detachment threshold moves anything, because on l1 the
 * question that decides whether the frame lets go is always "has this member left its
 * authored pose yet", and 0.55 m is most of a block width — a post can lean right out of
 * the bay and still be counted as carrying its share of the roof.
 *
 * 0.38 m / 0.24 rad restores MOVED to 8.5 and BROKE to 6, and it also rescues the shot the
 * ORCHESTRATOR-NOTES solvability probe recorded as the dead zone: 0.36@1.00 has scored 600
 * with 15 of 17 blocks standing in every gate run on record, and now clears the level
 * (MOVED 2 -> 6, FRAME 0/6 -> 3/6, broke 2 -> 6, 600 -> 42 000). Cohesion at +300 ms is
 * unchanged at 100 %, so the tower still comes apart at the joints rather than dissolving.
 */
const DETACH_D = 0.38;
const DETACH_A = 0.24;
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
 * ══ THE ASK IS A MOMENTUM THE DONOR HOLDS, NOT A Δv THE RECIPIENT WANTS ══════
 * PW round 8. The paragraph above defends carrying the shudder in m/s, and for the
 * DIRECTION and the DECAY ladder that defence still stands — one number, one readable
 * amount of movement. It does not survive contact with the donor rule, and the reason is
 * arithmetic:
 *
 *     a Δv ask costs `m * Δv` newton-seconds, so the HEAVIEST member in the level always
 *     generates the BIGGEST ask — while the thing being asked to pay for it is a debris
 *     cloud whose momentum has nothing to do with the recipient's mass.
 *
 * Measured over the 6-shot l1 cohort before this round (`pw-r8-audit.mjs`): `hop` asked for
 * 200.88 N·s, its donors could supply 70.73, and the remaining 130.15 N·s — 65 % — was minted
 * one-sided at 94.84 J, which was 51 % of every joule this file created. The single worst
 * write was +10.25 J and +4.577 kg·m/s into the 1.956 kg stone cube in ONE 8.3 ms step, with
 * six donors already registered and 89 % of the impulse still invented. PW r7 §5 measured the
 * same thing from the other end and named the cause exactly: "hop 1 cannot be rescued by a
 * better donor. The ASK is the problem."
 *
 * ── WHY THE CAP IS FREE, AND IT IS PROVABLE RATHER THAN HOPEFUL ──────────────
 * `spend()` clamps the exchange at the plastic vertex, `lam = -C/(2A)`. Write the write's
 * magnitude as |J| and the donor set's closing speed along the axis as Δ:
 *
 *     A = |J|^2 * K,   K = 1/(2m) + Σ w_i^2/(2 m_i)          C = -|J| * Δ
 *     lam        = Δ / (2 |J| K)
 *     lam * |J|  = Δ / (2K)                                  ← INDEPENDENT of |J|
 *
 * The momentum that actually changes hands does not depend on how much was asked for. Asking
 * for more than `Δ/(2K)` therefore transfers not one extra newton-second — it only enlarges
 * the one-sided remainder the pool has to invent. Capping the ask at `availableP()` leaves
 * the transfer EXACTLY unchanged and deletes the minting; that is why this is not a
 * softening of the collapse dressed up as conservation.
 *
 * ── AND A BOUNDED SEED, BECAUSE A SHOCK IS NOT ONLY A COLLISION ──────────────
 * A stress wave crosses a wedged, braced, barely-moving member without that member having
 * bulk momentum to hand over — which is the whole reason this layer exists (the solver
 * absorbs exactly that case into the brace). Bounding the ask at the donor's momentum ALONE
 * would make the wave die wherever the frame is stiffest. `WAVE_SEED_P` is the ceiling on
 * what may still be invented there, in NEWTON-SECONDS rather than in Δv, so it is the same
 * number for a glass mullion and for a stone cube:
 *
 *     |J|_ask = min( m * dv ,  max( availableP , WAVE_SEED_P * dv/WAVE_CAP ) )
 *
 * The `dv/WAVE_CAP` factor keeps the seed on the same decay ladder as the Δv ceiling, so a
 * hop-4 write cannot invent as much as a hop-1 write. `Infinity` restores the old ask
 * exactly (`m * dv` always binds), which is what the A/B arm uses.
 *
 * ── WHY 1.0 N·s, AND IT WAS SWEPT, NOT PICKED ────────────────────────────────
 * Five values priced on the 8-shot l1 gate and the 6-shot audit cohort, all arms back to
 * back in ONE process (r6 §5), against `Infinity` = the shipped r7 ask:
 *
 *   seedP        stone frac · shots   ONE-SHOT   MOVED   BROKE   created J   hop mint N·s
 *   Infinity        6 · 5/8             5/8       8      5.5       126.81        177
 *   0               8 · 6/8             4/8       7.5    5.5        54.00          0
 *   0.6             6 · 6/8             4/8       8      5.5          —            —
 *   1.0             7 · 7/8             5/8       8.5    6          50.24         50
 *   2.0             6 · 6/8             6/8       8      5.5        85.55        114
 *
 * 0 is the purest statement of the rule and it costs a one-shot clear: a stress wave really
 * does cross a wedged member that has no bulk momentum to hand over, and bounding the ask at
 * the donor alone makes the wave die exactly where the frame is stiffest. 2.0 buys a
 * one-shot clear back and gives most of the minting back with it. 1.0 is the only value that
 * holds or improves EVERY protected number — stone fractures 6 -> 7 and shots fracturing
 * stone 5/8 -> 7/8 (the canary, PW r3 §3 / r5 §2 / r7 §4), BROKE 5.5 -> 6, MOVED 8 -> 8.5,
 * one-shot clears 5/8 held, FRAME 5/6 and cohesion 100 % held — while taking the write
 * channel's created energy 126.81 -> 50.24 J and the worst single write +10.28 -> +2.03 J.
 */
const WAVE_SEED_P = 1.0;

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
 *
 * ── RE-DERIVED WITH THE SETTLEMENT IN PLACE (PW r10), AND IT DOES NOT MOVE ───
 * Round 10 turns the pool into a real currency, so the obvious question is whether the CLAIM
 * still has to be this large. Swept again on the 8-shot l1 gate with everything else shipped
 * (`pw-r10-gate.mjs`, arms `t04` / `t02` against `r10`):
 *
 *   | claim ceiling | 1.0 (shipped) | 0.4 | 0.2 |
 *   |---|---|---|---|
 *   | MOVED median          | **9**   | 8.5   | 2.5 |
 *   | FRAME median          | **5/6** | 4.5/6 | 0/6 |
 *   | ONE-SHOT CLEARS       | **7/8** | 5/8   | 2/8 |
 *   | BROKE median          | **5.5** | 4     | 2.5 |
 *   | writes starved by the pool | 0  | 0     | 100 |
 *
 * r3's cliff is exactly where r3 left it. The finding is not that the number changed — it is
 * that **TRANSMIT has stopped being the control**. What the layer may CREATE is now bounded by
 * `TRANSMIT_MINT` (0.20) instead, and lowering the claim on top of that only starves writes the
 * world was going to pay for anyway. That is why this round did not close the defect by
 * lowering TRANSMIT: doing so buys honesty in the one place it was already free and pays for it
 * where it is most expensive.
 */
const TRANSMIT = 1.0;
/** Hard ceiling on the live pool, J. The pool is a buffer for the blow that is happening now,
 *  not a savings account — a shot that lands three hits may not bank all three and spend them
 *  as one. One dart carries 57-60 J and lands 60-75 J of contact energy, so a cap at 60 holds
 *  about one blow's worth and clips a multi-hit shot back to it. */
const POOL_CAP = 60;
/** Below this the pool is spent and writes are skipped outright, J. */
const POOL_FLOOR = 0.02;

/**
 * ══ THE SETTLEMENT — THE OTHER SIDE OF THE LEDGER (PW round 10) ══════════════
 *
 * ── THE DEFECT ───────────────────────────────────────────────────────────────
 * Rounds 3 to 9 built a ledger that proves THE SHOT PAID FOR IT. They never built the other
 * half, and the header above said so without noticing: "the cumulative energy this file can
 * ADD over a shot is bounded by TRANSMIT times the energy that shot actually delivered".
 * `creditContact()` credits the pool with energy the solver has ALREADY resolved at the
 * contact, and `spend()` then writes a second copy of it into a body as new velocity. A
 * ledger whose every entry is a credit is not a currency; it is a licence to print, with a
 * ceiling on it.
 *
 * Priced on ONE tree with both arms back to back (`_tools/scenarios/critpw-r9-ab.mjs`, six l1
 * shots, seed 4242): with `structure.enabled = false` — same dart, same damage model, same
 * fractures, same debris burst — created energy falls **131.9 J -> 3.3 J**. 97.5 % of every
 * joule this game invents was this one layer. And the doctrine above — "the layer's honest
 * share is the small part that goes into breaking symmetry" so gravity can do the rest — was
 * not what was happening: in the honest arm disturbed blocks at contact+150 ms went 10 -> 4,
 * reach 5.2 m -> 2.1 m, and ONE-SHOT CLEARS 6/6 -> 0/6. Every win on l1 was funded by energy
 * the game invented.
 *
 * ── WHY THE DEBIT IS TAKEN AT THE WRITE AND NOT AT THE CONTACT ───────────────
 * The obvious fix is to debit the collision inside `creditContact()`: take the credit straight
 * back out of the struck block and the dart. MEASURED FIRST (`_tools/scenarios/pw-r10-probe.mjs`,
 * the same six-shot cohort), and the measurement rules it out:
 *
 *   | at the first credited contact      | median | range        |
 *   |------------------------------------|--------|--------------|
 *   | blowE credited                     | 42.7 J | 4.1 .. 52.8  |
 *   | the struck block's kinetic energy  |  3.5 J | 1.0 .. 26.3  |
 *   | the dart's, after the hit          | 13.2 J | 3.3 .. 38.8  |
 *   | the PAIR                           | 30.3 J | 12.3 .. 39.8 |
 *   | what the layer then SPENDS, a shot | 25.9 J | 22.1 .. 33.0 |
 *
 * `blowE` is `½·J·v_approach`, the energy the collision removed from the PAIR. It is not
 * energy the struck block is holding — the block holds a tenth of it — and the pair is very
 * nearly all the live kinetic energy in the level at that instant (whole dynamic world: 30.6 J
 * median). So the pair cannot fund the credit. Debiting it eagerly would brake the dart and
 * the struck block to ~13 % of their speed at the exact moment the dart has to follow through
 * and the struck block has to come apart at 2.6-5.7 m/s — which is what carries the "blown
 * through, not exploded from within" read (PW r5 §4) — and it would do it for a budget that is
 * then 57 % unspent (spent / credited = 0.43).
 *
 * So the pool stays a CLAIM, and the debit is SETTLED AT EACH WRITE against whatever the world
 * holds at that moment. The same probe measures that reserve across the collapse: live dynamic
 * kinetic energy is 31 / 30 / 29 / 79 / 13 / 47 J (median) at contact + 0 / 100 / 200 / 400 /
 * 800 / 1600 ms — never empty, because gravity keeps feeding it — against a worst single write
 * of 2.14 J. A write can therefore nearly always be funded out of real motion, which is the
 * only reason the propagation survives this round at all.
 *
 * ── WHAT THE SETTLEMENT IS, EXACTLY ──────────────────────────────────────────
 * `reserveKE()` sums the TRANSLATIONAL kinetic energy of every live dynamic body except the
 * recipient. `settleTake(d)` then scales every one of those linear velocities by
 *
 *     f = sqrt(1 - d / KE_reserve)
 *
 * which removes exactly `d` joules, because a uniform velocity scale takes the same FRACTION
 * of every body's kinetic energy. Three consequences, all deliberate:
 *
 *   · **It is exact.** Not a damping coefficient that removes "about" the right amount — `f`
 *     is solved from the energy it has to remove, so the write channel's net energy crossing
 *     is zero by construction rather than by tuning.
 *   · **It is invisible.** The cost is spread over the whole world in proportion to what each
 *     body is already doing, so nothing is braked enough to see: 2.14 J out of a 30 J reserve
 *     is a 3.6 % speed reduction shared over ~25 bodies, and the typical write is ~0.1 J, i.e.
 *     0.17 %. A per-body brake sized for one write would stop a 40 g chip dead — the same
 *     mistake PW r6 §2 made and measured when it landed the reaction on the recipient's
 *     application point.
 *   · **It is LINEAR ONLY, which is the choice PW r6 already made for the donor exchange.** A
 *     shock front carries linear momentum; it does not reach across a level and stop things
 *     spinning. Scaling spin too would flatten the independent tumble the rubric's debris
 *     criterion is written on ("no two share a rotation") to buy a few per cent more reserve
 *     that is never needed.
 *
 * ── WHAT IT IS NOT. STATED, NOT GLOSSED ──────────────────────────────────────
 * The settlement conserves ENERGY exactly and does NOT conserve momentum: it removes momentum
 * from the world in proportion to what each body carries, while the seed write injects its own
 * one-sided impulse somewhere else. That residual is `stats.debitP`, reported beside
 * `stats.seedP`, in exactly the spirit in which PW r6 declared `seedL` rather than paying for
 * it with fictitious chip spin. PW r6's local, momentum-CONSERVING donor exchange still runs
 * first and is untouched: this round funds the seed r6 left one-sided, it does not replace the
 * transfer.
 *
 * And it moves energy across a distance, which a contact does not. The defence is the one the
 * whole file rests on: this layer exists because a rigid-body solver cannot see that a column
 * is only standing because of a beam two metres away. It was already reaching across that
 * distance to write the motion. Now it pays for it out of the world instead of out of nothing.
 */
/**
 * Most of the live reserve ONE settlement may take, as a fraction.
 *
 * THIS IS NOT THE TRIPWIRE ITS FIRST DRAFT CALLED IT, and the reason is worth keeping. A
 * settlement scales every live velocity by `sqrt(1 - frac)`, so a `frac` charged twice a solver
 * step for the 240 steps of a collapse is an EXPONENTIAL DECAY on the whole world, not a bound —
 * the same shape as PW r3's "a repeated velocity match is a SERVO, not a ramp". Its real job is
 * to decide how much of a write has to fall through to the mint when the reserve is thin.
 *
 * Swept on the 6-shot cohort with everything else at its shipped value (`pw-r10-ab.mjs`, arms
 * `L08` / `L25` / `L50`): created energy 29.3 / 22.5 / 22.2 J, one-shot clears 3 / 5 / 5 of 6,
 * disturbed at 2 s 16 / 16 / 16. 0.25 and 0.50 are indistinguishable and 0.08 is worse on both,
 * so 0.25 sits inside the flat region with its lower edge measured rather than assumed.
 */
const DEBIT_FRAC = 0.25;
/** Below this a body holds no usable motion. Skipped, so a settled or sleeping body is never
 *  written to — which would wake it — and contributes nothing to the reserve. */
const DEBIT_KE_EPS = 1e-9;

/**
 * ══ THE MINT ALLOWANCE — WHY A RESIDUAL STILL EXISTS, AND WHY IT IS 0.20 ═════
 *
 * The settlement is the whole answer while a tower is coming down: the world is full of loose
 * motion and every write is paid for out of it. It is NOT the answer on the shot this file was
 * written for. Measured on the 8-shot l1 gate (`pw-r10-gate.mjs`, one tree, arms back to back),
 * a settlement with NO residual allowance at all:
 *
 *   | 8-shot l1 gate  | pool = pure credit (r9) | settled, nothing mintable |
 *   |---|---|---|
 *   | MOVED median    | 9    | **7**  |
 *   | FRAME median    | 5/6  | 5/6, but 0/6 on three shots instead of one |
 *   | ONE-SHOT CLEARS | 7/8  | **4/8** |
 *
 * and the lost shots name the mechanism exactly. `0.32@0.94` — the shot PW r3 put in this file's
 * header, a genuine 18 N·s hit that fractures NOTHING — went MOVED 10 -> 3, FRAME 5/6 -> 0/6,
 * broke 5 -> 0, with the reserve refusing 15 writes outright. It is a BOOTSTRAP CLIFF: a blow
 * that breaks nothing leaves the level at rest, a level at rest has no loose motion to
 * redistribute, so the rack that would start the topple cannot be funded, so the level stays at
 * rest. Exactly the shape PW r3 recorded when the ledger credited on FRACTURE instead of at the
 * contact ("a shot that shakes the tower WITHOUT breaking anything credits nothing, so it can
 * buy nothing... the frame sat at its authored pose 800 ms later"), arrived at from the far side.
 *
 * And the cliff is physically real, not an artefact. `blowE` is `½·J·v_approach`: the energy the
 * INELASTIC collision DESTROYED. Rapier has already thrown it away — it is inside the
 * solver-phase dissipation — so no live body is holding it to be debited. In the world that
 * energy does not vanish; part goes into plastic deformation and part travels through the
 * structure as an elastic wave, which is the thing this file exists to model. Recovering a share
 * of it is not the same act as inventing energy, but it is also not a transfer between two
 * dynamic bodies, and no census of dynamic bodies can ever book it. PW r6 named this same
 * crossing for the rack, whose reaction "genuinely crosses into the fixed world", and kept it as
 * a declared, priced, one-sided seed. This is that, generalised and bounded.
 *
 * So the ledger is two-tier and ORDERED, and the ORDER is the whole design:
 *
 *   1. **THE RESERVE PAYS FIRST.** Every joule that can come out of loose motion does.
 *   2. **THE MINT PAYS THE REMAINDER**, from an allowance worth `TRANSMIT_MINT` of the blow, and
 *      every joule of it is counted in `stats.mintJ` — the number this round exists to drive
 *      down, reported separately and never folded into `spentJ`.
 *
 * Reserve-first is what makes the residual small without making the game smaller, and the size
 * of that effect is the round's best single number: at `TRANSMIT_MINT = 1.0`, i.e. ROUND 9's OWN
 * CEILING with nothing tightened at all, created energy is **38.9 J against round 9's 131.9 J**.
 * Seventy per cent of what this layer used to invent was never needed; it was simply never asked
 * for out of the world first.
 *
 * ── 0.20 IS THE SWEEP'S KNEE, NOT A DIAL ─────────────────────────────────────
 * `pw-r10-ab.mjs`, 6-shot l1 cohort, seed 4242, everything else shipped:
 *
 *   | mint share | 0 | 0.01 | 0.02 | 0.05 | 0.10 | **0.20** | 1.0 | r9 |
 *   |---|---|---|---|---|---|---|---|---|
 *   | created, J        | 0.4 | 2.2 | 5.3 | 12.7 | 22.5 | **32.0** | 38.9 | 131.9 |
 *   | minted, J         | 0.0 | 3.4 | 6.5 | 15.6 | 25.0 | **35.2** | 42.1 | — |
 *   | one-shot clears   | 1/6 | 1/6 | 3/6 | 3/6  | 5/6  | **6/6**  | 5/6  | 6/6 |
 *   | disturbed at 2 s  | 13  | 13  | 15.5| 15   | 16   | **16.5** | 16   | 16 |
 *
 * 0.20 is the SMALLEST share that gives up nothing, and the 8-shot gate confirms it end to end:
 * MOVED 9, FRAME 5/6, COHESION 100 %, ONE-SHOT 7/8 — every one of them r9's own figure — while
 * BROKE goes 4 -> 5.5, STANDING 13 -> 11.5 and the fracture mix 14/14/5 -> 18/15/8. Going above
 * it buys nothing: 1.0 is WORSE on one-shot clears (6/8) and on BROKE (4.5), because the extra
 * allowance goes into jostling rather than into the frame.
 */
const TRANSMIT_MINT = 0.20;

/**
 * ══ WHICH BODIES THE RESERVE IS MADE OF ══════════════════════════════════════
 *
 * The first draft lent from EVERY live dynamic body, on the grounds that a uniform proportional
 * scale is the one rule with no arbitrary preference in it. Measured on the 8-shot l1 gate, that
 * is true and it is also wrong, because it brakes the collapse to pay for the collapse: MOVED
 * went 9 -> 6.5 and FRAME 5/6 -> 4/6 while the fracture counterweights went UP (BROKE 4 -> 5,
 * stone 5 -> 7 fractures, settled stone 10 % -> 16 %). The storey that is on its way down is the
 * one body a shock must NOT be funded out of: it is the thing the shock is trying to move.
 *
 * So the reserve is the LOOSE motion — debris, the spent projectile, a dead villain — and never
 * a standing block. That is the same doctrine PW r6 arrived at for hop 1, whose donor is the
 * debris cloud of the block that just came apart "because it is physically the thing that hits
 * the neighbour", generalised from one write to the whole ledger: **the wreckage pays, because
 * the wreckage has already been paid for.** A block is in the structure graph precisely while it
 * is still load-bearing, and the moment it shatters its pieces join the reserve.
 */
const RESERVE_LOOSE = true;

/**
 * Per-fracture ceiling on the debris burst, J — the second bound in `buyFracture()`.
 *
 * The pool alone already guarantees "the shot paid for it", but it does not stop ONE
 * fracture drinking the whole 60 J and starving the propagation writes that follow it a few
 * solver steps later. This bounds a single spawn.
 *
 * 6.0 J is measured, not picked: a momentum-neutralised burst costs exactly its own kinetic
 * energy in the parent's centre-of-mass frame (the cross term vanishes by construction —
 * see `Block.fracture`), so the cap is directly a separation speed. At l1's block masses
 * 6 J buys ~3 m/s of spread on a 1.6 kg wood beam and ~6 m/s on a 0.27 kg glass column,
 * which is the fan the cut plans were authored against. Swept 2 / 4 / 6 / 10 J on the
 * 8-shot l1 gate via `tuneFracCap`; see ARCHITECTURE.md PW ROUND 5.
 */
const FRAC_BURST_CAP = 6.0;

/**
 * ══ THE DONOR RULE (PW round 6) ══════════════════════════════════════════════════════════
 *
 * Round 3 made every write PRICED. It did not make any write CONSERVING. A priced write is
 * still `applyImpulseAtPoint` on one body and nothing anywhere else: momentum appears out of
 * nothing, angular momentum appears out of nothing, and the kinetic energy is charged to a
 * pool that a completely different event filled. Measured with `_tools/scenarios/pw-r6-audit.mjs`
 * — a full census of the dynamic world taken twice INSIDE one `spend()`, so nothing is born,
 * nothing dies, and the comparison is closed — the 8-shot l1 gate reads:
 *
 *     created kinetic energy  +330.5 J   (50 % of the 658.7 J the darts actually delivered,
 *                                         and 77 % of the blow on 0.30@0.90)
 *     momentum injected       401.7 kg·m/s      angular momentum injected 2455 kg·m²/s
 *     worst single write      +10.63 J into a 1.956 kg stone cube in one 8.3 ms step
 *                             (|v| 0.85 -> 3.20 m/s AND wz -0.27 -> -3.20 rad/s at once)
 *     by mechanism            hop 60 %, rack 38 %, everything else 2 %
 *
 * A shock front does not create momentum. It CARRIES momentum from the member it came from
 * to the member it arrives at. So every write now names a DONOR — the body (or bodies) whose
 * motion it is passing on — and the reaction is applied to it at the same world point:
 *
 *     recipient  +J at p          donor i  -J·wᵢ at p     (Σ wᵢ = 1)
 *
 * Applying every share at the SAME point p is what makes the pair exact rather than merely
 * tidy: linear momentum sums to zero by inspection, and angular momentum about any origin
 * sums to `p × J + Σ p × (−J·wᵢ)` = 0 as well, whatever the donors' shapes or positions.
 *
 * ── THE CLAMP, AND WHY IT IS THE PHYSICS AND NOT A SAFETY VALVE ─────────────────────────
 * A third-law pair is honest about momentum but it is NOT automatically cheaper in energy:
 * the quadratic term gains the donor's 1/m as well, and only the cross term
 * `J·(u_donor − u_recipient)` buys that back. A donor standing still would make a write MORE
 * expensive — an equal-and-opposite pair applied blindly is a spring, not a transfer.
 *
 * So the transfer is clamped to the largest fraction of the write that a real shock could
 * deliver: the fraction that does not INCREASE the pair's kinetic energy. The pair's price is
 * the same quadratic `spend()` has always used, extended over recipient + donors,
 *
 *     dKE(λ) = A·λ² + C·λ      A ≥ 0 always,  C = the pair's cross term
 *
 * so the largest free fraction is `λ = min(1, −C/A)` when `C < 0`, and zero when `C ≥ 0`.
 *   • `C < 0` means the donor is closing on the recipient — it HAS momentum to hand over,
 *     and handing over up to λ of it costs nothing and usually destroys energy, which is what
 *     an inelastic contact does.
 *   • `C ≥ 0` means the donor has nothing to give along this axis. λ = 0, and the write falls
 *     back to exactly the one-sided, pool-priced write it was before. Nothing regresses.
 *
 * ── WHAT IS LEFT IS CALLED A SEED, AND IT IS COUNTED ────────────────────────────────────
 * The remaining `(1−λ)·J` is still applied one-sided and still bought from the pool exactly as
 * round 3 left it. That part is honestly invented, and `stats.seedP` / `stats.seedJ` report it
 * separately from `stats.transferP` / `stats.transferJ` so the split is a measurement rather
 * than a claim. Driving the seed share down is the round's actual objective; a rule that made
 * the number small by writing less would show up immediately as lost propagation.
 *
 * ── WHERE THE DONORS COME FROM ─────────────────────────────────────────────────────────
 * Measured before the model was written (`_tools/scenarios/pw-r6-donor.mjs`), over four l1
 * collapses:
 *   • the shock wave, hops 2-4: the member it came from is still a live node on 268 of 273
 *     writes, and it is closing on the recipient at 0.94-1.57 m/s. 100 / 74 / 56 % of the
 *     requested Δv is transferable at hops 2 / 3 / 4.
 *   • the shock wave, hop 1: the source is the block that has just come apart, so it is never
 *     a live node (0 of 38) — and those 38 writes contain the four biggest impulses in the
 *     game, all four into the stone cube. Its DEBRIS is the donor: the cloud exists by the
 *     time the wave fires (2-5 ticks later), it carries exactly the parent's momentum, and it
 *     is physically the thing that hits the neighbour. `registerDebris()` is that hand-off.
 *   • rack and tip: the toe bears on another live block on 68 of 68 racks and 24 of 25 tips,
 *     never on thin air. That block is the donor; when the toe is on the ground the reaction
 *     goes into the fixed world, which no dynamic census can see, and the write stays a
 *     declared seed rather than pretending to be a transfer.
 */
/** How long a fractured block's debris stays available as a donor, in solver steps. The waves
 *  a fracture queues fire 2-5 steps later and hop again every HOP_TICKS(7)+0-3; four hops is
 *  ~40 steps at the outside. 90 covers it with room and still expires inside one collapse, so
 *  a cloud can never donate to the NEXT shot's wave. */
const DEBRIS_TTL = 90;

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
     * THE MINT ALLOWANCE, in joules (PW r10). The pool is a CLAIM — it says the shot paid for
     * the write. This is the much smaller part of that claim the layer may write WITHOUT taking
     * it out of a live body, i.e. the residual creation that survives the settlement. Reset
     * with the level for exactly the same reason the pool is.
     */
    this.mint = 0;
    /**
     * Fractured blocks' debris, by block id, for `donorDebris()`. Like `lean` and `pool` this
     * MUST be cleared by `reset()` — a cloud surviving a level rebuild would be a donor made
     * of freed rapier bodies, which is both non-deterministic and a crash waiting to happen.
     */
    this.debris = new Map();
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
    /** false => every write is one-sided again (the round-3 model), so a before/after runs on
     *  ONE tree. There is no git history in this working copy and ORCHESTRATOR-NOTES r6 §5
     *  rules out comparing against a number taken before another builder's edit. */
    this.tuneTransfer = true;
    /** true => clamp the exchange at the ELASTIC limit (-C/A) instead of the plastic vertex
     *  (-C/2A). Debug only, and it is the wrong physics for rubble — it is here because the
     *  first draft of round 6 used it and the l1 gate priced it at one-shot clears 7/8 -> 4/8.
     *  Keep it so that finding is reproducible rather than a sentence in a document. */
    this.tuneElastic = false;
    /** false => hop 1 gets no debris donor; see `donorWave()`. Debug-only like the rest. */
    this.tuneDebrisWave = true;
    /**
     * PW r7, and it is OFF because it was MEASURED AND LOST — see `donorDebris()`.
     *
     * true => hop 1 debits only the debris pieces closing on the recipient. It does exactly
     * what it was built to do at the write level (hop-1 mean lambda 0.322 -> 0.474, closing
     * speed 0.85 -> 1.21 m/s, writes with a live transfer 35/45 -> 36/45) and it still loses:
     * concentrating the reaction on the front is concentrating the BRAKE on the front, and
     * the front is the arrival that kills stone. On the 8-shot l1 gate, one process, one
     * tree: shots fracturing stone 5/8 -> 4/8 and BROKE median 5.5 -> 5, while the closed
     * audit's created energy went the WRONG way too (126.81 J with it off, 135.67 J with it
     * on). Stone is the canary for the third time — PW r3 §3 (softened in time), PW r5 §2
     * (thinned in mass), and now thinned in the DONOR SET. Kept as a knob so the finding is
     * reproducible rather than a sentence in a document.
     */
    this.tuneFrontDonor = false;
    /**
     * PW r8. Ceiling in NEWTON-SECONDS on what one hop write may invent beyond what its
     * donor set actually holds — see THE ASK IS A MOMENTUM above. `Infinity` reproduces the
     * pre-r8 ask (`m * dv`, scaled by the recipient's mass) exactly, so both arms of the A/B
     * run on ONE tree. Same debug-only contract as the rest: nothing in `src/` writes it.
     */
    this.tuneWaveSeedP = WAVE_SEED_P;
    /**
     * PW r10. false => no write is settled against the world and the pool is a pure credit
     * again, i.e. EXACTLY the round-9 minting model, so a before/after runs on ONE tree.
     * Same debug-only contract as the rest: nothing in `src/` writes it.
     */
    this.tuneDebit = true;
    /** PW r10. Share of the live reserve one settlement may take; see DEBIT_FRAC. */
    this.tuneDebitFrac = DEBIT_FRAC;
    /** PW r10. false => the reserve lends from every live dynamic body, standing blocks
     *  included. Measured, and it brakes the collapse to pay for the collapse; see
     *  WHICH BODIES THE RESERVE IS MADE OF. */
    this.tuneReserveLoose = RESERVE_LOOSE;
    /** PW r10. Share of a blow the layer may still MINT, for the part of a write that arrives
     *  when nothing is moving. 1.0 restores round 9's ceiling (with the reserve still paying
     *  first, so it is not the same as `tuneDebit = false`); 0 is reserve-only and drives the
     *  bootstrap cliff in THE MINT ALLOWANCE. Re-derived by sweep, not chosen. */
    this.tuneTransmitMint = TRANSMIT_MINT;
    this.tunePoolCap = POOL_CAP;
    /** Per-fracture ceiling on debris-burst energy, J. Same debug-only contract; see
     *  `buyFracture()` for why a second, tighter bound exists on top of the pool. */
    this.tuneFracCap = FRAC_BURST_CAP;
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
             /** The FRACTURE-SPAWN half of the ledger (PW r5). `fracAskJ` is what
              *  `Block.fracture` asked for at full authored strength, `fracJ` what the pool
              *  could actually pay; the gap is burst that was scaled down rather than
              *  invented. `fracStarved` counts fractures that got nothing at all. */
             fracN: 0, fracAskJ: 0, fracJ: 0, fracStarved: 0,
             /** THE DONOR SPLIT (PW r6). `transferP` / `seedP` are impulse in N·s: how much
              *  of what this file applied was handed over by a real body (momentum-neutral,
              *  free) against how much was invented one-sided and bought from the pool.
              *  `transferJ` is <= 0 by construction — the energy an inelastic hand-over
              *  destroys. `donorMiss` counts writes that asked for a donor and found none. */
             transfers: 0, transferJ: 0, transferP: 0, seedJ: 0, seedP: 0, donorMiss: 0,
             /** PW r8. `waveAskP` is what the hop ladder asked for at full Δv, N·s;
              *  `waveCutP` is how much of that the momentum cap removed before the write.
              *  Cheap enough for a gate to print without the full census. */
             waveAskP: 0, waveCutP: 0,
             /** THE SETTLEMENT (PW r10). `debitJ` is joules actually taken back out of the
              *  world to fund the seed writes and the bursts — with the settlement on it
              *  tracks `spentJ + fracJ` to the last decimal, and the gap is `debitShortJ`.
              *  `debitP` is the linear momentum that came out with it, kg·m/s, declared
              *  beside `seedP` rather than hidden (the settlement conserves energy, not
              *  momentum). `debitDry` counts writes the RESERVE refused, as distinct from
              *  `starved`, which is the pool refusing. */
             debitJ: 0, debitP: 0, debitShortJ: 0, debitN: 0, debitDry: 0, debitWorst: 0,
             /** What the layer still MINTS after the reserve has paid all it can — the number
              *  PW r10 exists to drive down. Kept out of `spentJ` on purpose: `spentJ` is what
              *  the layer wrote, `mintJ` is the part of it that came out of nowhere. */
             mintJ: 0, mintN: 0,
             /** Angular momentum the exchange leaves unbalanced, kg·m²/s — the price of
              *  landing the reaction on the donor's own centre instead of on the recipient's
              *  application point. Declared, not hidden; see THE TRANSFER in `spend()`. */
             seedL: 0,
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
    this.mint = 0;              // the residual-creation allowance. Same argument.
    this.debris.clear();        // donor clouds. See the constructor: this MUST be reset.
    // The settlement's cached reserve holds raw rapier bodies. A list surviving a level
    // rebuild is the same class of bug as a surviving donor cloud — freed bodies, and a crash
    // waiting for the first write. Nothing reads it without repricing, but clear it anyway.
    if (this._res) { this._res.list.length = 0; this._res.ke = 0; }
    this.stats = this.freshStats();
  }

  // ══ THE LEDGER ═════════════════════════════════════════════════════════════
  // Two functions, and every body write in this file goes through them. A third, the
  // SETTLEMENT, is what makes the pool a currency instead of a credit line — see
  // THE SETTLEMENT above the constants.

  /**
   * Price the reserve: the translational kinetic energy of every live dynamic body, in joules,
   * skipping `skipA` and `skipB`. The body list is cached in `this._res` so that the matching
   * `settleTake()` scales EXACTLY the bodies that were priced — nothing can be born, die or
   * move between the two calls (they are in the same code phase, with no solver step between),
   * so the debit is exact rather than approximately exact.
   *
   * Iterates `world.entities`, which is in creation order and is the game's determinism
   * ordering (see world.js). A uniform scale is order-independent anyway; the only thing the
   * order affects is the float rounding of the sum, and creation order fixes that too.
   *
   * `skipA` is always the recipient of the write being funded. Paying for a write partly by
   * braking the body it is being written INTO is self-cancelling, and worst exactly where it
   * matters — the stone cube holds a third of the reserve on the shots that hit it.
   */
  reserveKE(skipA = null, skipB = null) {
    const R = this._res || (this._res = { list: [], ke: 0 });
    R.list.length = 0; R.ke = 0;
    if (!this.tuneDebit) return 0;
    const L = world.entities;
    for (let i = 0; i < L.length; i++) {
      const e = L[i];
      if (e === skipA || e === skipB || e.dead) continue;
      // A standing block is load-bearing by definition and is what the shock is trying to move;
      // lending out of it is borrowing from the collapse to pay for the collapse. See
      // WHICH BODIES THE RESERVE IS MADE OF. Its debris joins the reserve the instant it breaks.
      if (this.tuneReserveLoose && e.tag === 'block') continue;
      const b = e.body;
      if (!b) continue;
      // A fixed body has infinite mass and no velocity to take; `isFixed` is absent on
      // nothing we build, but a missing method must read as "not a donor", never as "dynamic".
      if (typeof b.isFixed !== 'function' || b.isFixed()) continue;
      const m = b.mass();
      if (!(m > 0)) continue;
      const v = b.linvel();
      const ke = 0.5 * m * (v.x * v.x + v.y * v.y + v.z * v.z);
      if (!(ke > DEBIT_KE_EPS)) continue;
      R.list.push(b); R.ke += ke;
    }
    return R.ke;
  }

  /**
   * Take `joules` back out of the world, exactly, by scaling the reserve priced by the
   * immediately preceding `reserveKE()` call. `f = sqrt(1 - d/KE)` removes the same FRACTION
   * of every body's kinetic energy, so the cost lands in proportion to what each body is
   * already doing and nothing is singled out.
   *
   * `setLinvel(..., false)` — never wake a body to brake it. Anything with usable motion is
   * awake already (the `DEBIT_KE_EPS` filter in `reserveKE` is what guarantees that), and a
   * settlement that woke a sleeping tower would break `p3-r5-rest` and `p3-r6-late`, which
   * exist to prove this file is unreachable from a world at rest.
   *
   * @returns {number} joules actually removed — less than asked only if the reserve is short,
   *                   which is then declared in `stats.debitShortJ`.
   */
  settleTake(joules) {
    const R = this._res;
    if (!this.tuneDebit || !R || !(joules > 0) || !(R.ke > DEBIT_KE_EPS)) return 0;
    const d = Math.min(joules, R.ke);
    const f = Math.sqrt(Math.max(0, 1 - d / R.ke));
    let dp = 0;
    for (let i = 0; i < R.list.length; i++) {
      const b = R.list[i], v = b.linvel();
      dp += (1 - f) * b.mass() * Math.hypot(v.x, v.y);
      b.setLinvel({ x: v.x * f, y: v.y * f, z: v.z * f }, false);
    }
    this.stats.debitJ += d;
    this.stats.debitP += dp;
    this.stats.debitN++;
    if (d > this.stats.debitWorst) this.stats.debitWorst = d;
    return d;
  }

  /**
   * Pay for `joules` of write, RESERVE FIRST and mint only for the remainder — the ordering is
   * the whole of THE MINT ALLOWANCE above. `resAvail` is what the `reserveKE()` call that sized
   * this write said the reserve could lend; passing it in rather than re-measuring is what makes
   * the payment consistent with the budget the write was scaled against.
   *
   * `mintJ` is deliberately NOT folded into `spentJ`: `spentJ` is what the layer wrote, `mintJ`
   * is the part of it that came out of nowhere, and the second number is the one this round
   * exists to drive down. `debitShortJ` is a third thing again — what the reserve promised and
   * could not deliver — and it should stay at zero.
   */
  payFor(joules, resAvail) {
    if (!(joules > 0)) return;
    const promised = Math.min(joules, resAvail);
    const fromWorld = this.settleTake(promised);
    const minted = joules - promised;
    if (minted > 1e-12) {
      this.mint -= minted;
      this.stats.mintJ += minted;
      this.stats.mintN++;
    }
    // `resAvail` is `tuneDebitFrac * reserve`, so `promised` can never exceed what the reserve
    // holds and this is structurally zero. It is measured anyway: a shortfall here would be
    // unfunded creation wearing the settlement's label, which is the one failure this round
    // must not be able to hide.
    if (promised - fromWorld > 1e-9) this.stats.debitShortJ += promised - fromWorld;
  }

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
  spend(node, jx, jy, px, py, tauZ = 0, donors = null) {
    const body = node.b?.body;
    if (!body) return 0;
    const m = node.mass, I = node.inertia;
    if (!(m > 0) || !(I > 0)) return 0;
    const t = body.translation();
    const tau = tauZ + ((px - t.x) * jy - (py - t.y) * jx);

    if (!this.tunePriced) {
      const v0 = body.linvel(), w0 = body.angvel();
      const a0 = (jx * jx + jy * jy) / (2 * m) + (tau * tau) / (2 * I);
      const c0 = jx * v0.x + jy * v0.y + tau * w0.z;
      if (jx !== 0 || jy !== 0) {
        body.applyImpulseAtPoint({ x: jx, y: jy, z: 0 }, { x: px, y: py, z: 0 }, true);
      }
      if (tauZ !== 0) body.applyTorqueImpulse({ x: 0, y: 0, z: tauZ }, true);
      this.stats.spentJ += Math.max(0, a0 + c0);
      if (this.spendTag) this.stats.byJ[this.spendTag] += Math.max(0, a0 + c0);
      return 1;
    }

    // ══ 1. THE TRANSFER ═══════════════════════════════════════════════════════════════
    /**
     * THE MOMENTUM EXCHANGE, AND ITS TWO CORRECTIONS — both of which were measured, not
     * reasoned, and the first draft of this round got both wrong.
     *
     * 1. THE REACTION LANDS ON THE DONOR'S OWN CENTRE OF MASS, not on the recipient's
     *    application point. Applying every share at one point conserves angular momentum by
     *    inspection and is very tempting for that reason — but a debris chip is 40 g with
     *    `I` on the order of 3e-4, and a lever arm of a metre turns its share of the reaction
     *    into `tau^2/2I` of TWENTY joules, all of it spin about a point the chip is nowhere
     *    near. That term dominates `A`, the clamp below collapses, and 84 % of the impulse
     *    stays invented. The exchange here is therefore LINEAR — the thing a shock actually
     *    carries — and the angular residual `lam * (p - centroid) x J` is declared in
     *    `stats.seedL` rather than being paid for with fictitious chip spin.
     *
     * 2. THE CLAMP IS THE PLASTIC LIMIT, NOT THE ENERGY-NEUTRAL ONE. `A*lam^2 + C*lam = 0`
     *    at `lam = -C/A` looks like "the largest free transfer", and it is: it is the
     *    perfectly ELASTIC exchange, which is exactly TWICE the plastic impulse. It drives
     *    the donor past the pair's common velocity and out the other side — measured as a
     *    real cost on the l1 gate, one-shot clears 7/8 -> 4/8, because the shock was braking
     *    the very members it was supposed to be travelling through. The vertex of the same
     *    parabola, `lam = -C/(2A)`, is the perfectly INELASTIC exchange: both bodies end at
     *    a common velocity along the axis, the pair's energy is at its MINIMUM, and neither
     *    body is ever reversed. Rubble is inelastic. With one donor it reduces to
     *    `lam*|J| = mu * closing speed` exactly, which is the textbook plastic impulse.
     *
     * `A` and `C` are built from the linear exchange alone, so the criterion is a statement
     * about the pair's RELATIVE velocity and is frame-invariant. `C >= 0` means the donor is
     * not closing on the recipient along this axis — it has nothing to hand over — and the
     * write falls back to exactly the one-sided write round 3 shipped.
     */
    let lam = 0;
    const D = (this.tuneTransfer && donors && donors.length) ? donors : null;
    if (D) {
      const v = body.linvel();
      let A = (jx * jx + jy * jy) / (2 * m);
      let C = jx * v.x + jy * v.y;
      for (const d of D) {
        const dv = d.body.linvel();
        A += (jx * jx + jy * jy) * d.w * d.w / (2 * d.mass);
        C -= d.w * (jx * dv.x + jy * dv.y);
      }
      if (C < 0 && A > 1e-12) lam = Math.min(1, -C / (this.tuneElastic ? A : 2 * A));
      if (lam > 1e-6) {
        if (jx !== 0 || jy !== 0) {
          body.applyImpulseAtPoint({ x: jx * lam, y: jy * lam, z: 0 }, { x: px, y: py, z: 0 }, true);
        }
        if (tauZ !== 0) body.applyTorqueImpulse({ x: 0, y: 0, z: tauZ * lam }, true);
        let cx = 0, cy = 0;
        for (const d of D) {
          const dt = d.body.translation();
          cx += d.w * dt.x; cy += d.w * dt.y;
          const jdx = -jx * lam * d.w, jdy = -jy * lam * d.w;
          if (jdx !== 0 || jdy !== 0) {
            d.body.applyImpulseAtPoint({ x: jdx, y: jdy, z: 0 }, { x: dt.x, y: dt.y, z: 0 }, true);
          }
        }
        // A*lam^2 + C*lam is <= 0 for every lam in (0, -C/A], so the exchange is free and is
        // never refunded into the pool (round 3's rule: the ledger is a ceiling on creation,
        // not a currency). At the plastic vertex it is at its most negative.
        this.stats.transferJ += A * lam * lam + C * lam;
        this.stats.transferP += lam * Math.hypot(jx, jy);
        this.stats.seedL += Math.abs(lam * ((px - cx) * jy - (py - cy) * jx));
        this.stats.transfers++;
      } else lam = 0;
    }

    // ══ 2. THE SEED ═══════════════════════════════════════════════════════════════════
    // Whatever the donor could not supply is still invented, still one-sided, and still
    // bought from the pool at its exact price — read off the state the transfer LEFT, not
    // the state it started from, or the cross term is priced against a velocity that is
    // already gone.
    const rest = 1 - lam;
    if (rest <= 1e-9) return lam;
    const jsx = jx * rest, jsy = jy * rest, taus = tau * rest, tzs = tauZ * rest;
    const v = body.linvel(), w = body.angvel();
    const a = (jsx * jsx + jsy * jsy) / (2 * m) + (taus * taus) / (2 * I);
    const c = jsx * v.x + jsy * v.y + taus * w.z;

    /**
     * ── THE SECOND BOUND: WHAT THE WORLD CAN ACTUALLY LEND (PW r10) ─────────────
     * The pool says the SHOT paid for this write. It does not say that anything was taken out
     * of the world to fund it, and until this round nothing ever was — see THE SETTLEMENT
     * above the constants. So the affordable budget is the smaller of two numbers: the claim,
     * and what the layer can actually PAY — a share of the live kinetic energy out there to be
     * redistributed, plus the much smaller mint allowance that covers the part of a write
     * arriving when nothing is moving (THE MINT ALLOWANCE). One quadratic then scales the
     * write to whichever binds, which is the machinery round 3 already built.
     */
    let cap = this.pool;
    let resAvail = Infinity;
    if (this.tuneDebit) {
      resAvail = this.tuneDebitFrac * this.reserveKE(node.b);
      const funds = resAvail + Math.max(0, this.mint);
      if (funds < cap) cap = funds;
    }

    let s = 1;
    if (a + c > cap) {
      if (cap <= POOL_FLOOR) {
        // WHICH ceiling refused the write is the diagnosis, so the two are counted apart.
        if (this.tuneDebit && cap < this.pool) this.stats.debitDry++; else this.stats.starved++;
        return lam;
      }
      s = a > 1e-12
        ? (-c + Math.sqrt(Math.max(0, c * c + 4 * a * cap))) / (2 * a)
        : (c > 1e-12 ? cap / c : 1);
      if (!(s > 0)) { this.stats.starved++; return lam; }
      if (s > 1) s = 1;
    }
    const paid = a * s * s + c * s;
    if (paid > 0) {
      this.pool -= paid; this.stats.spentJ += paid;
      if (this.spendTag) this.stats.byJ[this.spendTag] += paid;
      // THE RESERVE PAYS FIRST; only the remainder is minted. A negative `paid` is a write that
      // REMOVES energy from the body: always free, never refunded into either tier — the ledger
      // is a ceiling on creation, not a savings account (round 3's rule).
      if (this.tuneDebit) this.payFor(paid, resAvail);
    }
    this.stats.seedJ += Math.max(0, paid);
    this.stats.seedP += s * rest * Math.hypot(jx, jy);

    if (jsx !== 0 || jsy !== 0) {
      body.applyImpulseAtPoint({ x: jsx * s, y: jsy * s, z: 0 }, { x: px, y: py, z: 0 }, true);
    }
    if (tzs !== 0) body.applyTorqueImpulse({ x: 0, y: 0, z: tzs * s }, true);
    return lam + s * rest;
  }

  // ══ DONOR RESOLUTION ═══════════════════════════════════════════════════════════════
  // Three sources, all deterministic in iteration order (Maps are insertion-ordered and the
  // debris list is the array `Block.fracture` returned). A donor entry is
  // `{ body, mass, inertia, w }` with the weights summing to 1.

  /** The live member a write is passing momentum on from. Null if it has gone. */
  donorNode(id) {
    const n = id == null ? null : this.nodes.get(id);
    if (!n || !n.b || n.b.dead || n.b.fixed || !n.b.body) return null;
    return [{ body: n.b.body, mass: n.mass, inertia: n.inertia, w: 1 }];
  }

  /**
   * THE HAND-OFF FROM `Block.fracture`. A shattered block is the source of the first hop of
   * every wave it queues, and by the time that wave fires the block is gone — but its debris
   * is not, and the debris is what physically hits the neighbour. Called immediately after the
   * spawn (the node is already unlinked by then, so this cannot disturb the graph).
   *
   * Kept as a plain list rather than as an aggregate body: the reaction is split by mass and
   * applied at the SAME world point, so the cloud recoils as one object at `J / Σm` and no
   * individual chip can be flung by a share sized for the whole block.
   */
  registerDebris(blockId, kids) {
    if (!this.enabled || blockId == null || !kids || !kids.length) return;
    const list = [];
    let M = 0;
    for (const k of kids) {
      const b = k?.body;
      if (!b || k.dead) continue;
      const mass = b.mass();
      if (!(mass > 0)) continue;
      list.push({ e: k, body: b, mass, inertia: Math.max(1e-4, b.principalInertia().z) });
      M += mass;
    }
    if (!list.length || !(M > 0)) return;
    for (const d of list) d.w = d.mass / M;
    this.debris.set(blockId, { at: this.clock, list });
  }

  /** The debris cloud of a block that has come apart, while it is still fresh enough to be
   *  the thing that hit you. Dead pieces are dropped and the weights re-normalised, so a
   *  cloud half of which has already shattered again donates only what is left of it. */
  /**
   * THE ARRIVING FRONT, NOT THE WHOLE CLOUD (PW r7).
   *
   * With an `axis` — `{ux, uy, ur}`, the write's unit direction and the RECIPIENT's speed
   * along it — only the pieces that are actually CLOSING on the recipient are offered as
   * donors. A chip flying the other way is not what hit you, and debiting it is the same
   * error PW r6 rejected for `side` (handing a member the dead brace's debris "on the
   * grounds that the pieces flew at it" made the write brake a cloud for a shove the cloud
   * never gave), pointing the other way: averaging the closing chips together with the
   * receding ones under-reads the front and hands the shortfall to the one-sided seed.
   *
   * The pair stays exact either way — recipient +lam*J, donors -lam*J*w_i, weights summing
   * to 1 — so this is a question about which bodies the contact is with, not about the
   * book-keeping. Measured on the 45 hop-1 writes of the 6-shot l1 cohort
   * (`_tools/scenarios/pw-r7-front.mjs`): mean closing speed 0.85 -> 1.48 m/s and writes
   * with a live transfer 35/45 -> 41/45, against a donor mass falling 1.055 -> 0.681 kg.
   *
   * ── NEGATIVE RESULT. IT IS OFF. DO NOT RE-ENABLE WITHOUT RE-RUNNING THE GATE. ──────────
   * It delivers the write-level improvement above and STILL loses, because concentrating
   * the reaction on the front concentrates the BRAKE on the front, and the front is the
   * arrival that kills stone: on the 8-shot l1 gate, shots fracturing stone 5/8 -> 4/8 and
   * BROKE median 5.5 -> 5. The closed audit agrees — created energy is 126.81 J with it off
   * and 135.67 J with it on, so the headline number moved the wrong way as well. It is the
   * same shape as PW r6's rejected `side` debris donor: getting the donor SET wrong makes
   * the model dissipate in the wrong place.
   */
  donorDebris(id, axis = null) {
    if (id == null) return null;
    const rec = this.debris.get(id);
    if (!rec) return null;
    if (this.clock - rec.at > DEBRIS_TTL) { this.debris.delete(id); return null; }
    const front = axis && this.tuneFrontDonor;
    const out = [];
    let M = 0;
    for (const d of rec.list) {
      if (d.e.dead || !d.e.body) continue;
      if (front) {
        const v = d.e.body.linvel();
        if (v.x * axis.ux + v.y * axis.uy <= axis.ur) continue;   // receding: it did not hit you
      }
      out.push(d); M += d.mass;
    }
    if (!out.length || !(M > 0)) return null;
    return out.map(d => ({ body: d.e.body, mass: d.mass, inertia: d.inertia, w: d.mass / M }));
  }

  /**
   * The wave's donor: the member it came from, or — on hop 1, where that member is the block
   * that has just come apart — the debris that member became.
   *
   * `tuneDebrisWave` exists because the hop-1 case is the one place the donor rule can DOUBLE
   * COUNT. This layer exists to supply propagation the SOLVER cannot: a shock travelling
   * through a wedged, resting, braced stack, which rapier's contact solver absorbs into the
   * brace instead of passing on. Free bodies flying into standing ones are the case the solver
   * handles perfectly well — so on hop 1, where the donor is a debris cloud that the solver is
   * about to collide with the recipient anyway, debiting the cloud takes its momentum a second
   * time. Measured on the l1 gate, both arms in one process, that second debit is worth
   * roughly one one-shot clear. Hops 2+ travel block-to-block through the standing frame,
   * which is exactly the case the solver misses, and there the debit is the whole point.
   */
  donorWave(it, axis = null) {
    const n = this.donorNode(it.srcId);
    if (n) return n;
    return this.tuneDebrisWave ? this.donorDebris(it.srcId, axis) : null;
  }

  /**
   * HOW MUCH MOMENTUM THIS DONOR SET ACTUALLY HOLDS, along the unit axis (ux, uy), in N·s.
   *
   * This is `lam * |J|` at the plastic vertex `spend()` already clamps to, solved in closed
   * form — and, as the derivation above THE ASK IS A MOMENTUM shows, it does not depend on
   * |J| at all:
   *
   *     Δ   = Σ w_i (u · v_i)  −  (u · v_recipient)        the set's CLOSING speed, m/s
   *     K   = 1/(2m) + Σ w_i^2/(2 m_i)                     the pair's reduced-mass term
   *     out = Δ / (2K)          (Δ / K at the elastic clamp, to match `tuneElastic`)
   *
   * With one donor of mass M it reduces to `mu * closing speed`, the textbook plastic
   * impulse. Zero when the set is receding (Δ <= 0): nothing is arriving, so nothing is on
   * offer, and `spend()` would have found `C >= 0` and refused the transfer anyway.
   *
   * It reads body state only — no RNG, no allocation beyond the loop — so it cannot disturb
   * the draw order the determinism gates check.
   */
  availableP(node, donors, ux, uy) {
    if (!donors || !donors.length || !this.tuneTransfer) return 0;
    const body = node.b?.body;
    if (!body) return 0;
    const v = body.linvel();
    let closing = -(v.x * ux + v.y * uy);
    let K = 1 / (2 * node.mass);
    for (const d of donors) {
      const dv = d.body.linvel();
      closing += d.w * (dv.x * ux + dv.y * uy);
      K += d.w * d.w / (2 * d.mass);
    }
    if (!(closing > 0) || !(K > 1e-12)) return 0;
    return closing / (this.tuneElastic ? K : 2 * K);
  }

  /**
   * What a member is bearing DOWN on: the live nodes whose top face meets its underside.
   * This is the reaction path for every pivot write — a column going over, a bay racking, a
   * cantilever hinging — because a member that pivots on its footing pushes that footing.
   *
   * A member sitting on the GROUND deliberately returns null: the reaction crosses into the
   * fixed world, where no census of dynamic bodies can see it, and a write that claimed it as
   * a transfer would be claiming credit for a book it does not keep. It stays a declared seed.
   */
  supportersOf(node, e) {
    if (!node || !node.b || !node.b.body) return null;
    if (e.y0 <= 0.14) return null;                       // standing on the ground
    const out = [];
    let M = 0;
    for (const m of this.nodes.values()) {
      if (m === node || !m.b || m.b.dead || m.b.fixed || !m.b.body) continue;
      const me = extents(m.b);
      if (Math.abs(me.y1 - e.y0) > FACE_TOL) continue;
      if (Math.min(me.x1, e.x1) - Math.max(me.x0, e.x0) <= 0.06) continue;
      out.push({ body: m.b.body, mass: m.mass, inertia: m.inertia, w: 0 });
      M += m.mass;
    }
    if (!out.length || !(M > 0)) return null;
    for (const d of out) d.w = d.mass / M;
    return out;
  }

  /**
   * The ids of the live members carrying a footprint `[x0,x1]` whose underside sits at `y0`.
   * Used to latch a pivot's reaction path at the moment a ramp is SCHEDULED, so all `n` steps
   * of that ramp push on the same thing and the choice cannot drift mid-topple. Returns an
   * empty array when the footprint is on the ground — see `supportersOf()` for why that stays
   * a declared seed rather than being quietly booked against the fixed world.
   */
  supporterIds(x0, x1, y0, exclude) {
    if (y0 <= 0.14) return [];
    const out = [];
    for (const m of this.nodes.values()) {
      if (exclude.has(m) || !m.b || m.b.dead || m.b.fixed || !m.b.body) continue;
      const me = extents(m.b);
      if (Math.abs(me.y1 - y0) > FACE_TOL) continue;
      if (Math.min(me.x1, x1) - Math.max(me.x0, x0) <= 0.06) continue;
      out.push(m.b.id);
    }
    return out;
  }

  /** Same, resolved from a list of node ids captured when a ramp was scheduled. Re-checked
   *  every step because a supporter can shatter in the middle of an 8-step rack. */
  donorIds(ids) {
    if (!ids || !ids.length) return null;
    const out = [];
    let M = 0;
    for (const id of ids) {
      const n = this.nodes.get(id);
      if (!n || !n.b || n.b.dead || n.b.fixed || !n.b.body) continue;
      out.push({ body: n.b.body, mass: n.mass, inertia: n.inertia, w: 0 });
      M += n.mass;
    }
    if (!out.length || !(M > 0)) return null;
    for (const d of out) d.w = d.mass / M;
    return out;
  }

  /**
   * THE FRACTURE HALF OF THE SAME LEDGER (PW r5).
   *
   * `spend()` prices a write onto ONE existing body, so it cannot price a fracture: a
   * fracture destroys a body and creates six, and the energy it invents lives in the gap
   * between the parent's kinetic energy and the children's. `Block.fracture` computes that
   * gap itself — exactly, from real masses and inertias — and buys it here.
   *
   * Same pool, same depositor, same property: the only thing that ever credits this ledger
   * is a live projectile's contact (`creditContact`), so whatever a fracture spends, the
   * player's shot paid for. A chain fracture — a block killed by another block, or by this
   * file's own shudder — credits nothing, exactly as it credits nothing today, and simply
   * gets a smaller burst.
   *
   * THREE bounds, and they do different jobs:
   *   1. `tuneFracCap` bounds ONE spawn, so a single fracture cannot drink the pool and
   *      starve the propagation writes queued three solver steps behind it.
   *   2. the pool bounds the SHOT.
   *   3. the SETTLEMENT (PW r10) bounds it by what is actually out there to redistribute, and
   *      TAKES IT OUT of the world — without that the burst is the same mint the write channel
   *      was, measured at 16.26 J over the six-shot cohort in PW r9 §3.
   *
   * `parent` and `kids` are the two things the reserve must exclude, and both exclusions are
   * load-bearing rather than tidy:
   *   · the PARENT is destroyed two lines after this returns, and `Block.fracture` has already
   *     snapshotted its velocity into the children's rigid field, so braking it here would
   *     delete the same energy twice and change nothing the player can see;
   *   · the KIDS exist already but are still AT REST — their velocities are written after this
   *     call — so any debit taken from them would be silently overwritten, i.e. minted back.
   *     `DEBIT_KE_EPS` skips them today because they are motionless; they are named anyway, so
   *     that giving `Debris` a birth velocity some day cannot quietly re-open this.
   *
   * @param {number} joules   what the burst costs at full authored strength, J
   * @param {object} [parent] the block coming apart
   * @param {Array}  [kids]   its debris, already created and still at rest
   * @returns {number} joules actually granted — debited from the pool AND from the world
   */
  buyFracture(joules, parent = null, kids = null) {
    this.stats.fracN++;
    if (!(joules > 0)) return 0;                 // a burst that removes energy is free
    this.stats.fracAskJ += joules;
    const want = Math.min(joules, this.tuneFracCap);
    if (!this.tunePriced) { this.stats.fracJ += want; return want; }
    let cap = Math.max(0, this.pool);
    let resAvail = Infinity;
    if (this.tuneDebit) {
      this.reserveKE(parent, null);
      const R = this._res;
      if (kids && kids.length) {
        for (let i = R.list.length - 1; i >= 0; i--) {
          for (let j = 0; j < kids.length; j++) {
            const kb = kids[j] && kids[j].body;
            if (kb && kb === R.list[i]) {
              const v = kb.linvel();
              R.ke -= 0.5 * kb.mass() * (v.x * v.x + v.y * v.y + v.z * v.z);
              R.list.splice(i, 1);
              break;
            }
          }
        }
        if (R.ke < 0) R.ke = 0;
      }
      resAvail = this.tuneDebitFrac * R.ke;
      const funds = resAvail + Math.max(0, this.mint);
      if (funds < cap) cap = funds;
    }
    const granted = Math.min(want, cap);
    if (granted <= POOL_FLOOR) { this.stats.fracStarved++; return 0; }
    this.pool -= granted;
    this.stats.fracJ += granted;
    if (this.tuneDebit) this.payFor(granted, resAvail);
    return granted;
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
  nudge(node, ux, uy, vTarget, omTarget, px, py, dvCap = Infinity, domCap = Infinity,
        donors = null) {
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
    if (donors === null) this.stats.donorMiss++;
    return this.spend(node, jx, jy, px, py, tauZ, donors);
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
    const above = node.above.filter(l => !l.n.b.dead).map(l => l.n.b.id);
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
        /** The donors this joint's reaction is owed to, resolved when it fires:
         *  `srcId`   the block that died — for a side brace, its DEBRIS is what shoved you;
         *  `dropIds` what that block was holding up — for a beam that has just had a storey
         *            dropped on it, those members are the storey, and they are the momentum. */
        srcId: block.id, dropIds: above,
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
          /** The member this hop is arriving FROM — the DONOR of the momentum it carries.
           *  On hop 1 that member is the block that has just come apart, so the id names a
           *  node that no longer exists and `transferFrom()` finds nothing; that is correct
           *  and deliberate (see THE DONOR RULE): the first reaction to a fracture is the
           *  player's blow entering the frame, and the pool is what the blow paid into. */
          srcId: block.id,
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
    /**
     * NOT gated on `this.enabled` (PW r5). `enabled` means "the collapse-propagation layer
     * is switched off", which is a statement about WRITES; the pool is bookkeeping, and
     * `Block.fracture` now draws on it too. Gating the credit here made the debug arm
     * `structure.enabled = false` silently defund the debris burst as well, so that arm
     * stopped measuring "the solver plus an honest fracture, without propagation" and
     * started measuring a game whose blocks come apart with no separation at all.
     * Every WRITE path — onCollapse(), update(), the audit — is still gated.
     */
    if (!(blowE > 0)) return;
    const credit = blowE * this.tuneTransmit;
    this.pool = Math.min(this.tunePoolCap, this.pool + credit);
    // The second, much tighter tier. Same cap argument as the pool's — one blow's worth, not a
    // savings account — scaled by the share the blow may still have MINTED rather than lent.
    const mintCap = this.tunePoolCap * this.tuneTransmitMint;
    this.mint = Math.min(mintCap, this.mint + blowE * this.tuneTransmitMint);
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
      this.mint = 0;
      // Same argument for the donor clouds: nothing is pending, so nothing can still be owed
      // a debit, and a cloud that outlived its collapse would be a donor for the NEXT one.
      if (this.debris.size) this.debris.clear();
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
      // THE STOREY IS THE DONOR. This branch models an inelastic collision between the load
      // and the beam, and an inelastic collision has two sides: the members that were being
      // carried give up the momentum the beam gains. When none of them is left (they have all
      // shattered on the way down) the debris of the block that died is the next best thing,
      // and it is literally what lands on the beam.
      this.nudge(node, ux, uy, dv * ul, 0, px, e.cy + e.hh * 0.9, Infinity, Infinity,
                 this.donorIds(it.dropIds) ?? this.donorDebris(it.srcId));
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
      // A member swinging down over a hole pivots on the support it has LEFT and pushes on it.
      // That support is the reaction path; if it is the ground the write stays a declared seed.
      this.nudge(node, ux, uy, v * ul, 0, px, e.cy - e.hh * 0.9, Infinity, Infinity,
                 this.supportersOf(node, e));
      this.spendTag = null;
      this.stats.hinges++;
    } else {
      // ── A SIDE BRACE OR A SHOULDER LOAD IS GONE. Lean, do not launch. ────
      const v = SIDE_V * sig;
      const py = e.cy + e.hh * (node.column ? 0.7 : 0.25);
      const om = node.column ? -lean * TIP_OMEGA * 0.35 * sig : 0;
      this.spendTag = 'side';
      /**
       * A PIVOT, NOT A TRANSMISSION — and the first draft of round 6 got this wrong.
       * Nothing pushes this member: its brace has gone and it leans into the hole, pivoting
       * on its own base. Handing it the dead brace's DEBRIS as the donor (which the draft did,
       * on the grounds that the pieces flew at it) made the write brake the debris cloud for
       * a shove the debris never gave — measured as 21.6 J of over-dissipation across the l1
       * gate and, downstream of it, a cloud too slow to break what it should have. The base is
       * the reaction path, exactly as for `tip` and `hinge`, and on the ground it is a
       * declared seed.
       */
      this.nudge(node, lean, 0, v, om, e.cx + rngJitter(e.hw * 0.3), py, Infinity, Infinity,
                 this.supportersOf(node, e));
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
    // THE WAVE CARRIES MOMENTUM, IT DOES NOT MINT IT. The member this hop came from — or, on
    // hop 1, the debris that member became — hands over as much of the write as it can without
    // the pair gaining energy, and only the remainder is invented. See THE DONOR RULE.
    // The write's own axis and the recipient's speed along it, so `donorDebris()` can offer
    // the pieces that are ARRIVING rather than the whole cloud. Computed before the nudge
    // call so the RNG draw order inside it is untouched.
    const rv = b.body.linvel();
    const axis = { ux: hx, uy: hy, ur: rv.x * hx + rv.y * hy };
    const px = e.cx + rngJitter(e.hw * 0.30);          // drawn first, exactly as before
    const donors = this.donorWave(it, axis);
    /**
     * PW r8 — THE CAP. What the donor set holds, plus a bounded seed in N·s, and never more
     * than the Δv ladder was going to give anyway. `nudge`'s `dvCap` is the right lever for
     * it: it bounds how much of the velocity deficit THIS write may close, so expressing the
     * bound as `J / m` turns a momentum ceiling into a velocity ceiling exactly.
     *
     * The transfer is untouched by this (see the derivation above the constant): only the
     * one-sided remainder shrinks. `stats.waveAskP` / `waveCutP` record how much, so a gate
     * can see the cap working without running the full census.
     */
    // The ask is the DEFICIT the write would close, not the target speed — `nudge` matches
    // rather than adds, so a member already travelling with the front asks for less.
    const askP = node.mass * Math.max(0, this.tuneMatch ? dv * hl - axis.ur : dv * hl);
    let dvCap = Infinity;
    if (this.tuneWaveSeedP !== Infinity) {
      const capP = Math.min(askP, Math.max(this.availableP(node, donors, hx, hy),
                                           this.tuneWaveSeedP * (dv / WAVE_CAP)));
      dvCap = capP / node.mass;
      this.stats.waveCutP += askP - capP;
    }
    this.stats.waveAskP += askP;
    const frac = this.nudge(node, hx, hy, dv * hl, 0,
      px, e.cy + e.hh * 0.35, dvCap, Infinity, donors);
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
        srcId: it.id,          // the member passing the shock on — see srcId in onCollapse()
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
          // A cantilever hinges about the support it still has, and pushes down on it.
          this.nudge(n, ux, uy, HINGE_V * ul, 0, e.cx + side * e.hw * 0.85, e.cy,
                     Infinity, Infinity, this.supportersOf(n, e));
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
      // THE BAY PUSHES ON ITS FOOTING. A bay racking about its toe is bearing on whatever that
      // toe stands on, and that is where the reaction goes (measured: a block on 68 of 68 l1
      // racks, never thin air). When the toe is on the ground the reaction leaves the dynamic
      // world, `supIds` is empty, and the write stays the declared one-sided seed it was.
      const sup = this.donorIds(d.supIds);
      if (vl > 1e-6) this.nudge(m, vx / vl, vy / vl, vl, om, me.cx, me.cy, vl / d.n, Math.abs(om) / d.n, sup);
      else this.nudge(m, 1, 0, 0, om, me.cx, me.cy, 0, Math.abs(om) / d.n, sup);
      this.spendTag = null;
    }
  }

  /** One step of a de-braced column going over — same rule: full target, 1/n of it per step. */
  driveTip(d) {
    const n = this.nodes.get(d.id);
    if (!n || !n.b || n.b.dead || n.b.fixed || !n.b.body) return;
    const e = n.e = extents(n.b);
    this.spendTag = 'tip';
    // Same reaction path as the rack: a column going over pivots on its base and drives it.
    this.nudge(n, d.lean, 0, d.v, d.om, e.cx, e.cy + e.hh * 0.80,
               d.v / d.n, Math.abs(d.om) / d.n, this.donorIds(d.supIds));
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
                       supIds: this.supporterIds(e.x0, e.x1, e.y0, new Set([n])),
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
    let bx0 = Infinity, bx1 = -Infinity;
    for (const m of bay) {
      const me = m.e = extents(m.b);
      py = Math.min(py, me.y0);
      px = lean > 0 ? Math.max(px, me.x1) : Math.min(px, me.x0);
      bx0 = Math.min(bx0, me.x0); bx1 = Math.max(bx1, me.x1);
    }
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    // Latched once, here, so every step of the ramp bears on the same footing.
    const supIds = this.supporterIds(bx0, bx1, py, new Set(bay));

    this.stats.racks++;
    // The bay's rigid velocity field is a TARGET, not an addition: a member already moving
    // with the rotation is already racking, and paying to push it further is what turns a
    // topple into a launch. It is also a RAMP rather than one write (see RACK_STEPS) —
    // applied at the centre of mass, so the spin is the whole of the member's rotation and
    // `nudge` has no induced torque to subtract.
    const om = -lean * RACK_OMEGA * Math.min(1, k) * rngRange(0.90, 1.12);
    this.drives.push({ kind: 'rack', ids: bay.map(m => m.b.id), supIds,
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
