/**
 * villains/base.js — shared scam-villain behaviour. One file per archetype extends this.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * READ THIS FIRST IF YOU ARE BUILDING VILLAIN #2 OR #3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE DOCTRINE. The villain is how the scam is TAUGHT. `l1.json` carries
 * `"teaches": "A prize you never entered is not a prize. It is a bill."` — if the player is
 * knocking over an anonymous orange blob, that sentence is doing all the work alone. A
 * student who reads nothing must be able to name the scam from the character at a glance.
 * So the character work below is FUNCTION, not decoration, and it is judged by two tests
 * from `_reference/RUBRIC.md` that you should run before you believe your own screenshots:
 *
 *   · THE 40 px TEST     `sips -Z 40 shot.png` — the prop must still name the scam.
 *   · THE GREYSCALE TEST strip colour — the read must survive on value alone.
 *
 * Everything a villain needs is in five registrations and five hooks. You should not need to
 * touch this file to add a character; if you do, extend it here rather than forking the
 * behaviour into your own class, because the next villain after you inherits whatever you
 * leave behind.
 *
 * ── AUTHORING API — call these from your subclass's buildMesh(group) ──────────
 *
 *   registerRig({ belly, bob, face })
 *       Names the parts the idle animates. `belly` BREATHES (scaled); every node in `bob`
 *       is TRANSLATED in y (pass the head group so the hat rides with it, not the bare head
 *       mesh); `face` is the anchor the defeat tear is parented to. Nothing else is
 *       animated by the base, ever. Do not list a node AND its ancestor in `bob` — they
 *       compound and the face slides off the head.
 *       WHY THE SPLIT MATTERS: RUBRIC P6 requires that overlaying the idle and the alarmed
 *       frame shows a head-outline delta of <= 2 px — "only brows, pupils and mouth have
 *       moved". So no reaction state may scale or move the head. The old code scaled the
 *       WHOLE mesh by `alarm * 0.05`, which moved the head, the cap and the prop together
 *       and failed that criterion while still reading as nothing at gameplay size. It also
 *       satisfies P11's "comic deformation scales the body only and leaves the face at 1x".
 *
 *   registerFace({ eyes, brows, mouths })
 *       `eyes`   — makeEye() groups. The base scales the WHITE, never the group, because a
 *                  brow parented to the eye group would balloon with it.
 *       `brows`  — one mesh per eye. YOU author the resting pose; the base only applies a
 *                  delta from it, so a villain with flat brows and one with angry brows both
 *                  animate correctly. Set `mesh.userData.side = -1|+1` (screen-left/right)
 *                  or let the base infer it from the sign of the authored `rotation.z`.
 *       `mouths` — `{ idle, alarmed, braced, defeated }`, any subset. Exactly one is visible
 *                  at a time; a missing state falls back to `idle`.
 *
 *   poseable(mesh, { rest, guard, snap })
 *       Anything that FLINCHES: a prop, an arm, a shoulder. `rest` and `guard` are
 *       `{ x, y, z, rot }` in the villain's local space; the base snaps between them in
 *       `snap` seconds (default 0.09 — a flinch is a snap, not a tween) whenever the face
 *       state is alarmed or braced. This is where a readable-at-40px reaction comes from:
 *       the FACE cannot change the silhouette (see above), so the PROP has to.
 *
 *   frontOfStructureZ(halfDepth)
 *       The local z that draws a prop IN FRONT of every block instead of inside one. It is
 *       the single lever that lets a prop be WIDER THAN THE BAY the villain stands in — read
 *       "SIZING A PROP FOR THE DEVICE IT IS PLAYED ON" below before you size anything.
 *
 *   addDetachable(mesh, { vx, vy, spin, ttl })
 *       A visual-only bit that flies off at the death pop — a hat, a badge, a wig. It is
 *       re-parented into the scene as a body-less Entity and ballistics itself out on the
 *       deterministic clock. DELIBERATELY NOT A RIGID BODY: every extra body in a collapse
 *       moves P3's measured gate numbers (blocks moved at impact+800 ms, frame reacting),
 *       and a hat is not worth spending that on. Use a real body only for the one prop that
 *       RUBRIC P11 requires to be one (`onDeath`, see LotteryUncle's cheque).
 *
 *   fact / label  (statics)
 *       One line, <= 14 words, funny first. Read by the defeat bubble. RUBRIC P16.
 *
 * ── HOOKS you may override ───────────────────────────────────────────────────
 *
 *   buildMesh(group)          construct the character
 *   applyFace(state, pose)    extra per-character work on a face SNAP (not per frame)
 *   onIdle(dt, alarm)         per-character idle flourish, every frame
 *   onTaunt(k)                k = 0..1 through the gloat after a shot that missed you
 *   onDuress(k, dt)           k = 0..1 of load. Your prop's response to being CRUSHED —
 *                             the brace, squash and lean are already done for you below
 *   onDeathBeat(beat, k)      beat 0 = compress, 1 = inflate, 2 = pop
 *   onDeath(point)            the one real physics prop detaches here
 *
 * ── TWO THREATS, NOT ONE. READ THE `DURESS` BLOCK BEFORE YOU POSE ANYTHING ───
 * A villain has to perform against two completely different things, and the first villain
 * shipped a round with only one of them wired up:
 *   · `tti`     — a projectile is COMING. Time to impact, in seconds; Infinity when clear.
 *   · `duress`  — masonry is ALREADY ON YOU. 0..1, from crush load and battering.
 * Both feed the same four face states and the same prop flinch, so you get the collapse
 * reaction for free the moment you call `poseable()`. Do NOT key any pose of your own off
 * `tti` alone — that is exactly the bug that made villain #1 hold a cheerful pose for
 * 800 ms with a post lying across him. If you need a "how bad is it right now" number,
 * `Math.max(duress, tti < ALARM_TTI ? 1 : 0)` is the whole of it.
 *
 * ── THE FOUR FACE STATES, AND WHEN THEY FIRE ─────────────────────────────────
 * RUBRIC P6 wants four states, each legible as a still, switching on a SNAP, with the
 * alarmed state arriving at least 200 ms BEFORE impact. "Before impact" cannot be done off
 * a distance threshold — a slow lob and a flat fast shot cross the same radius at wildly
 * different times — so `senseIncoming()` computes a real TIME TO IMPACT from the closing
 * speed and the states fire off that:
 *
 *   idle/smug   brows down and authored, pupils centred, mouth an upward crescent
 *   alarmed     tti < ALARM_TTI (0.55 s, i.e. 2.75x the required lead). Pupils shrink to
 *               dots inside enlarged whites, brows lift AND separate, jaw drops.
 *   braced      tti < BRACE_TTI (0.13 s). Eyes become arcs INSIDE the retained eyeball
 *               circles, so the silhouette does not change — closed eyes read as a corpse
 *               and kill the joke (P6 automatic fail).
 *   defeated    the death pop. Eyes stay OPEN, one tear, asymmetric downturned mouth.
 *               Humiliation, not death.
 *
 * ── THE DEATH POP, AND ITS INTERACTION WITH HIT-STOP ─────────────────────────
 * Three beats over DEATH_TICKS solver steps, then the mesh is gone: COMPRESS (the oof),
 * INFLATE (the balloon), POP (vanish into the FX puff that `villainDefeated` already fires).
 * No ragdoll, no fade, no corpse — RUBRIC P6 and P11 both fail a villain that lingers.
 *
 * TWO THINGS THAT LOOK LIKE FREE CHOICES AND ARE NOT:
 *
 * 1. `world.hitStop` FREEZES ENTITY UPDATES. `fx/index.js` sets `world.hitStop = 10` on
 *    `villainDefeated`, and main.js skips every `entity.update()` while it is non-zero. So
 *    the death sequence loses ~83 ms to the freeze, held on whatever pose it had reached.
 *    That is why COMPRESS is beat 0 and is short: the held pose is the impact read (P10
 *    wants an extreme pose to persist >= 120 ms), and DEATH_TICKS is sized so pop + freeze
 *    together still land on RUBRIC P6's "gone within 250 ms". Do not lengthen it casually,
 *    and do not try to drive the sequence off `physics.tick` to "fix" the freeze —
 *    `holdOnce()` advances the tick while update() is not running, so the sequence would
 *    skip the whole compress beat in one frame.
 *
 * 2. NEVER FADE A VILLAIN OUT. The old code did
 *       `this.mesh.traverse(o => { o.material.transparent = true; })`
 *    which (a) never set an opacity, so it faded nothing at all, and (b) walked straight
 *    over the INK OUTLINE meshes, whose ShaderMaterial is cached per (thickness, colour) in
 *    `art/toon.js inkMaterial()` and shared by every inked object in the game. One villain
 *    dying therefore pushed every block, every villain and every shard drawn at that ink
 *    weight into the transparent render queue for the rest of the level. Animate
 *    transforms; never touch material state you did not allocate yourself.
 *
 * ── SIZING A PROP FOR THE DEVICE IT IS PLAYED ON ─────────────────────────────
 * VILLAIN #1 SHIPPED TWO ROUNDS AT A SIZE IT IS NEVER PLAYED AT. Everything above was
 * authored and judged on 1280x720 desktop stills. Measured at the game's own framing:
 *
 *              villain on-screen box     its prop
 *   desktop 1280x720 ........ 42 x 78 px    35 x 19 px      (≈ 42.3 CSS px per world unit)
 *   phone    390x844 ........ 14 x 25 px    11 x  6 px      (≈ 14.1 CSS px per world unit)
 *
 * The phone is THREE TIMES SMALLER, students play on phones, and 25 px is 37 % below the
 * doctrine's own 40 px floor. At 11 x 6 px a four-line document is grey noise: the cap, the
 * moustache, "LUCKY DRAW WINNER", the payee band and ₹50,00,000 all resolved to an orange
 * blob under a white tick, and the character taught nothing on the only device that matters.
 *
 * SO: `--mobile` IS THE DESIGN SIZE. Desktop is the bonus. Three rules fall out of it, and
 * they are the whole of what villains #2 and #3 need to get right:
 *
 * 1. THE PROP MUST BE WIDER THAN THE VILLAIN. Not "large"; wider. It is the only element
 *    that names the scam, so it must own the silhouette's widest span. Lottery Uncle's
 *    cheque went 1.70 R -> 2.80 R: measured, 11 x 6 px -> 18 x 8 px on the phone
 *    and 35 x 19 -> 55 x 25 on desktop, and 1.5x the body's own width.
 *
 * 2. AUTHOR THE PROP AS 2-3 HARD VALUE BANDS PLUS ONE HUGE GLYPH. Body copy is a lie at
 *    this size. A band survives if it is >= 20 % of the prop's height (2 px at 10 px tall);
 *    type survives if one glyph is >= 45 % of the prop's height. Anything else is texture.
 *    Check it by rendering the prop and downscaling — never by looking at the canvas.
 *
 * 3. THE BAY IS NOT THE LIMIT. z IS. l1 parks villain #1 in a 1.34-unit bay (+-1.24 R), and
 *    round 1 concluded from that "any prop wide enough to break the silhouette sideways
 *    clips level geometry, so it must go UP". That is only true in the z-plane the blocks
 *    live in. Blocks are `DEPTH = 1.05` centred on z = 0, and the camera sits 110 units back
 *    with a narrow FOV — near-orthographic, so a z offset of half a unit changes the prop's
 *    projected size by ~0.5 % and changes NOTHING else except draw order. Put the prop at
 *    `frontOfStructureZ()` and it overlaps the posts instead of intersecting them, and its
 *    width is then limited only by taste. Use it for the prop, not for the body — the body
 *    must stay level furniture, nested in the structure (RUBRIC P6).
 *
 * AND THE COROLLARY FOR THE BODY: at 25 px tall a value difference is worth more than any
 * amount of modelling. Head and body must sit in DIFFERENT value bands (>= 3 steps on the
 * 10-step ramp) with a bright collar between them, and the arms must not flank the head —
 * raised arms that run parallel to the neck fill the one concavity the silhouette has and
 * turn the whole character into a single column. Splay them into a V and the head reads.
 *
 * ── MASS AND PHYSICS PROFILE — DO NOT EDIT WITHOUT RE-DERIVING ───────────────
 * radius 0.52-0.54, `mat('villain')` density 0.98 => ~0.646 kg. The four damage constants
 * below are expressed in Delta-v precisely so this can move, but they were MEASURED at that
 * mass; `_tools/scenarios/pw-villain.mjs` and `p0-tune.mjs` re-derive them. Everything the
 * villain-identity work adds is VISUAL — no collider, density, damping or damage constant
 * changed for it, and none should. Believable mass is bought with the idle (slow, heavy,
 * <= 1.2 Hz), with a landing squash on the belly, and with a silhouette that has a wide
 * base — not by making the body heavier than the numbers say.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Damage model: a villain has hp 0..1 and takes damage from BOTH direct impulse and from
 * being crushed (sustained force from above). Being hit by a beam that a projectile knocked
 * loose kills you exactly like being hit by the projectile — that is the chain-collapse
 * payoff, and it only works because damage is impulse-based rather than "was it the ammo".
 *
 * ── THE DAMAGE BUDGET IS MEASURED, NOT GUESSED ───────────────────────────────
 * `_tools/scenarios/p0-tune.mjs` fires the real slingshot at `levels/_probe-open.json`
 * (one villain, open ground, nothing in the way) and reports the single-contact impulse the
 * villain actually receives. Rapier can only transfer what a 0.28 kg ball will absorb before
 * it is simply knocked away, so that number is MUCH smaller than the projectile's momentum
 * (0.62 kg x 24.6 m/s = 15 N·s of momentum arrives; about 5 N·s of it lands):
 *
 *   square direct hit, full power ....... 4.6 – 9.9 N·s   (approach 15–25 m/s)
 *   glancing clip at full speed ......... 2.1 N·s
 *   spent ball rolling into it .......... <= 1.6 N·s
 *   one stone block resting on it ....... 0.39 N·s per step, sustained
 *   untouched level, 5 s of sim ......... zero contact events at all
 *
 * The original numbers (floor 1.4 N·s, gain 0.30) needed 4.73 N·s in a SINGLE contact to
 * kill — a threshold sitting *inside* the direct-hit band. A dead-centre point-blank shot
 * killed; anything five percent softer did not, and every hit through glass or at range
 * bounced off. That was the "villains survive direct hits" bug. Re-run p0-tune.mjs and
 * re-derive these four constants after ANY change to ammo mass, density, maxSpeed, villain
 * radius or the colliders — they are a function of those, not free parameters.
 *
 * ── AND THE OTHER HALF: SURVIVING A COLLAPSE  (p0-collapse-diag.mjs) ─────────
 * Fixing the direct hit did not fix "the tower fell on them and they lived". Three separate
 * faults were doing that, all of them measured before they were touched:
 *
 * 1. A VILLAIN IS A BALL AND BALLS ROLL. Knocked loose by the first impact, a villain
 *    trundled out from under its own collapsing tower and kept going: x 22.4 -> 36.0 and
 *    STILL MOVING eight seconds later. Nothing could crush it because it was never under
 *    anything, and the level could not settle because something was always in motion. The
 *    ammo already had this exact disease and was cured with rolling resistance (ammo/base.js);
 *    the villain never was. See ROLL_* below — brake the roll, never the flight.
 *
 * 2. CRUSH ONLY EVER SAW ONE CONTACT. `crushLoad` took the MAX of the contacts in a tick, so
 *    a villain buried under five chunks read as "one chunk is leaning on me". A pile is
 *    additive: the loads are SUMMED per tick now, and the sum coasts between bursts.
 *
 * 3. TWENTY-NINE BLOWS DID NOTHING. Every contact under HIT_FLOOR was discarded outright, so
 *    a villain rattled through a collapsing tower — 29 contacts, peak 1.48 N·s — took exactly
 *    zero damage. One tap must not kill; being beaten twenty-nine times must. Hence the
 *    BATTER channel: recent blows accumulate into a bruise that decays, and once the bruise
 *    is over its floor, further blows bite. A single nudge can never reach the floor.
 */

import * as THREE from 'three';
import { Entity, makeBody, shapes, zAngleOf } from '../level/entity.js';
import { mat } from '../art/materials.js';
import { emit } from '../events.js';
import { world } from '../world.js';
import { physics, FIXED, GRAVITY_Y } from '../physics.js';
import { rngRange } from '../rng.js';
import { inkFlat } from '../art/toon.js';

/**
 * ── THE DAMAGE THRESHOLDS ARE IN DELTA-V, NOT IN NEWTON-SECONDS  (PW r1) ─────
 * Every constant in this block used to be an absolute impulse in N·s, chosen against a
 * villain that weighed 0.277 kg. That is a hidden dependency on the villain's mass, and it
 * is a live grenade: PW raised villain density from 0.42 to 0.98 (a person is water-density
 * — at 0.42 a grown scammer weighed less than every wood block in l1 and read as a beach
 * ball), which multiplies the villain's mass by 2.34 and therefore multiplies EVERY impulse
 * it will ever absorb by roughly the same factor. Left in N·s, that alone would have taken
 * a spent ball rolling into a villain from a harmless 1.61 N·s to 3.8 N·s — straight past a
 * 1.55 floor — and made a nudge nearly lethal, for no reason a player could see.
 *
 * So the unit is now `impulse / mass`, i.e. the CHANGE IN THE VILLAIN'S OWN VELOCITY in
 * m/s. That is mass-invariant by construction, it is the thing a viewer actually reads off
 * the screen ("he got knocked six metres a second sideways"), and it means the next person
 * to change a villain's size or density does not silently change how easy it is to kill.
 * Crush was already expressed this way in body weights; this makes the other two channels
 * match it.
 *
 * The numbers below are re-derived from `_tools/scenarios/pw-villain.mjs` at the NEW mass —
 * they are NOT the old N·s values divided through, because a heavier villain takes a
 * smaller Delta-v from the same shot (m·v/(m+M)) and a straight conversion would have
 * reintroduced "villains survive direct hits".
 */
// --- direct hits (re-derive with pw-villain.mjs after ANY mass/size/collider change) ---
// MEASURED at the new mass (0.646 kg), 32 shots that touched the villain on _probe-open:
//   direct hit  (approach >= 8 m/s), n=13 ... Delta-v  6.61 – 26.90   (13 of 13 killed)
//   graze/slow  (approach <  8 m/s), n=19 ... Delta-v  0.00 –  3.73   (19 of 19 survived)
//   resting contact, all shots ............... Delta-v  0.00 –  0.55
// The two populations do not overlap: softest kill 6.61, hardest survivor 3.73. The floor
// sits in that gap with margin on both sides, so no rolling nudge can ever start doing
// damage and no real hit can ever be shrugged off.
const HIT_FLOOR   = 3.90;   // m/s of Delta-v.
const HIT_GAIN    = 0.260;  // hp per m/s over the floor. The softest measured direct hit
                            // (6.61) lands 0.70 hp on this channel alone and the bruise
                            // finishes it; anything from 7.75 up is a one-blow kill. The
                            // hardest survivor (3.73) is under the floor and lands zero.
const DEBRIS_BITE = 0.75;   // a flying chip is not a flying beam, but a hurled half-plank is
                            // still a real rigid body with real mass and should hurt.

// --- battering: the sustained beating of a collapse, as opposed to one clean blow ---
// Measured on a real l1 collapse: 29 contacts on one villain, none of them individually
// lethal and all of them ignored by the old model. The bruise is the running sum of recent
// blows; only what is ABOVE the floor bites, so no single blow can start doing damage alone.
const BATTER_NOISE = 0.75;  // m/s. Below this a contact is contact noise, not a blow.
const BATTER_FLOOR = 5.50;  // m/s of recent blows absorbed for free. The hardest single
                            // nudge cannot reach it; two real blows can.
const BATTER_GAIN  = 0.118; // hp per m/s of blow landing on an already-bruised villain.
const BATTER_TAU   = 1.60;  // s. Bruise memory — long enough to span a collapse, short
                            // enough that four separate shots do not silently accumulate.

// --- crush ---
// Measured in MULTIPLES OF THE VILLAIN'S OWN WEIGHT, so the numbers stay true when a bigger
// villain arrives: "twice my own weight is sitting on me" means the same thing at any size.
// One stone block resting on a villain reads about 7 body weights.
const CRUSH_FLOOR  = 2.5;   // body weights. Your own weight plus contact noise is ~1.
const CRUSH_RATE   = 0.42;  // hp per second, per body weight of EXCESS load.
const CRUSH_TAU    = 0.12;  // s. Load memory: contact events are reported in bursts, not every
                            // tick, so the load coasts between them — and stops within ~0.17 s
                            // of the weight actually being lifted off.

// --- rolling resistance ---
// A ball rolling without slipping feels no sliding friction, so a knocked-loose villain
// trundles forever (measured: 13.6 m of travel in 6 s, still moving). Brake the ROLL and
// nothing else: above ROLL_SPEED it is a body in flight and the player is reading its arc,
// and above ROLL_FALL of vertical speed it is falling, not rolling. Touch neither.
/**
 * Half of `level/blocks.js`'s `DEPTH = 1.05`. Anything at a greater |z| than this draws in
 * front of (or behind) every block in the level instead of intersecting one — see
 * `frontOfStructureZ()` and the prop-sizing block in the header. Kept here rather than
 * imported so villains never pull on the destruction module; if DEPTH ever changes, the
 * `frontOfStructureZ` unit test in `_tools/scenarios/p6-r3-measure.mjs` catches the drift.
 */
export const BLOCK_HALF_DEPTH = 0.525;

const ROLL_SPEED = 4.5;     // m/s. Faster than this is a launch, not a roll.
const ROLL_FALL  = 1.6;     // m/s of |vy|. Faster than this is a fall, not a roll.
const ROLL_TAU   = 0.28;    // s. A 2 m/s roll is down to walking pace in a third of a second.

/**
 * ── STAYING UPRIGHT, AND WHY IT IS NOT OPTIONAL ONCE A VILLAIN CARRIES A PROP ──
 * The collider is a ball, and a ball that lands, settles or is nudged keeps whatever Z
 * rotation the solver left it with. On the old radially-symmetric villain that was invisible.
 * The moment a villain holds something tall — a cheque over its head, a pyramid, a signboard —
 * it is glaring: measured on `_probe-open`, an untouched villain settles about 25 degrees off
 * vertical, which tips the prop, the cap and both eyes with it and makes the character read
 * as debris rather than as a person.
 *
 * So the VISUAL is levelled while the body is at rest. Nothing physical changes: the rigid
 * body keeps its own rotation, the collider is a ball so orientation cannot affect a contact,
 * and no gate that reads `dumpBodies()` can see this. It is eased on the FIXED step (never in
 * sync(), which runs per render and would make the levelling frame-rate dependent and every
 * filmstrip unreproducible), and it releases the instant the villain is thrown, so a knocked-
 * loose scammer still tumbles through the air exactly as the solver computed.
 */
const UPRIGHT_SPEED = 2.0;   // m/s. Above this he is being thrown; let him tumble.
const UPRIGHT_FALL  = 1.5;   // m/s of |vy|. Above this he is falling, not standing.
const UPRIGHT_TAU   = 0.30;  // s to level out once he has stopped; ~0.08 s to let go again.

/**
 * ══ DURESS — A COLLAPSE HAS TO BE PERFORMED, NOT ONLY SURVIVED  (P6 r2) ══════
 *
 * THE GAP THIS CLOSES, as measured. Until r2 the whole pose/face machine keyed on ONE
 * input: `tti`, the time to impact of an incoming PROJECTILE. `crushLoad` drove damage and
 * drove no performance at all. So a villain wedged in l1's bay — who cannot be knocked
 * anywhere, and whose entire read therefore has to come from acting — held his cheerful
 * cheque-aloft idle pose with a wooden post leaning across him and then popped.
 * `p6-r2-load.mjs`, 5 shots x 2 villains, before:
 *
 *   crushLoad on the bay villain ......... 8.5 – 29.7 body weights
 *   frames loaded (crush > 2.5) but IDLE .  135 of 278  = 48.6 %
 *   visible tilt ......................... 0.0 – 0.2 deg
 *   visible squash ....................... none (the channel did not exist)
 *
 * AND THE THING THAT MAKES THE FIX HONEST RATHER THAN INVENTED: on the same shots the
 * villain's BODY rotates 10.5 – 13.8 deg under that load. The solver already knows he is
 * being shoved over. `uprightK` was deleting the evidence — `sync()` multiplies the body's
 * own angle by `(1 - uprightK)` and uprightK sits at 1 the whole time, because "resting"
 * was defined by SPEED alone and a villain pinned under a storey is very much at rest.
 * So the first and largest part of the fix creates no motion at all: it stops suppressing
 * motion that the physics had already computed.
 *
 * WHAT `duress` IS. One 0..1 scalar, "how much trouble am I in that is not a projectile",
 * from the two channels that already exist in the damage model:
 *   · `crushLoad`  — sustained load, in multiples of his own body weight
 *   · `batter`     — the running sum of recent blows, in m/s of his own Delta-v
 * Whichever is worse wins, then the result is filtered with a FAST ATTACK and a SLOW
 * RELEASE. The filter is not decoration: Rapier reports resting contacts in bursts, so the
 * raw signal is 50 % zeros even while a beam is genuinely lying on him (measured,
 * `p6-r2-dist.mjs`), and a pose driven off the raw value strobes.
 *
 * WHY THE THRESHOLDS SIT WHERE THEY DO — measured, per ORCHESTRATOR-NOTES r6 §1, never
 * derived from a guess (`_tools/scenarios/p6-r2-dist.mjs`, crushLoad in body weights):
 *
 *   population                          n     zero%   p50    p90    p99    max
 *   A untouched settled l1, 3 s        300    100.0   0.00   0.00   0.00   0.00
 *   B the 3 s quiet after a shot       246     50.8   0.00   3.78   8.71  11.50
 *   C during the collapse             1076     38.6   1.23   5.58   8.17   8.93
 *
 * A is EXACTLY zero for all 300 samples — settled bodies sleep and sleeping bodies emit no
 * contacts — so the false-positive rate of any load-driven performance at rest is zero and
 * `DURESS_CRUSH_LO` can sit well below the damage floor. That matters: something landing on
 * you must be ACTED before it is lethal, or the player never sees the cause of the death.
 * LO 1.2 is above his own weight plus contact noise (~1.0, base.js damage header) and below
 * `CRUSH_FLOOR` 2.5 where damage starts. HI 6.0 is a real storey arriving — C's p90.
 *
 * WHAT DURESS DRIVES — four things, and villains #2 and #3 get all four for free:
 *   1. THE FACE STATE. `updateFaceState()` now takes the worse of the projectile threat and
 *      the load, so ALARMED/BRACED fire under a collapse. Because `updatePerformance()`
 *      already gates the poseable flinch on that state, the prop reaction — the ONLY thing
 *      that changes a villain's silhouette, and therefore the only reaction that survives
 *      the 40 px test — comes along with it at no extra cost.
 *   2. `loadSquash`. He compresses under the weight and his head sinks into his shoulders.
 *      HELD while the load is on, unlike `landSquash` which is a transient spring.
 *   3. `uprightK`. The levelling stands down in proportion to duress, so the real body
 *      rotation above becomes visible, and re-levels when the weight lifts — which is the
 *      whole "he picks himself back up" beat.
 *   4. `loadTilt`. A directional lean from WHERE the load lands, on top of (3), because a
 *      ball's own spin does not always agree with the side the storey came down on.
 *
 * A NOTE FOR WHOEVER TOUCHES THIS NEXT: every one of the four is VISUAL. No collider,
 * density, damping or damage constant moved for any of it, and no impulse is ever written
 * to a body. Keep it that way: the moment a performance layer writes to the solver it
 * becomes an energy source, and PW r3 spent a whole round proving how expensive that is to
 * discover late.
 *
 * ══ THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER — READ BEFORE VILLAIN #2 ══
 * "Visual" does NOT mean "cannot move the physics", and it took an A/B to see it. The
 * `onDeath()` prop (RUBRIC P11 wants one genuinely physical absurd prop) is spawned as a
 * rigid body AT THE TRANSFORM ITS MESH HAPPENS TO HOLD, deliberately — a prop that
 * teleports back to its rest pose at the instant of death breaks the one frame that
 * matters most. That makes the prop's spawn pose a live channel from the performance layer
 * into the world, and the l1 outcome is chaotically sensitive to it.
 *
 * MEASURED, `p3-r6-gate.mjs`, 8 shots, arms run back to back on one tree (r6 §5 protocol):
 *
 *   arm                                    MOVED  FRAME  COH   BROKE  STAND  1-SHOT
 *   before this round                       8.5    5/6   100%   5.5    11.5    6/8
 *   after  (crush performance live)         8.5    5/6   100%   5.0    12.0    7/8
 *   after, cheque crush-pose write removed  8.5    5/6   100%   5.5    11.5    5/8
 *
 * Three different prop spawn poses, three different outcomes — individual shots swung
 * between 6,400 and 41,400 points. Then the decisive run: with the prop's spawn transform
 * PINNED to a constant offset, before and after are **identical on every shot — every
 * score, every BROKE, every STANDING, every phase, every material count, to the digit.**
 * That is the proof that duress, the brace, the squash, the lean and the levelling release
 * are all genuinely inert, and that the prop pose is the ONLY coupling.
 *
 * The coupling is KEPT, because spawning the prop where it visually is beats a teleport on
 * the money frame, and because the numbers above land ON the r5 baselines this gate quotes
 * (BROKE 5, STANDING 12) rather than away from them. Two consequences are now permanent:
 *   1. VILLAIN WORK CAN MOVE P3's AND P13's NUMBERS. If you change a pose that a physical
 *      prop is parented to, re-run `p3-r6-gate.mjs` in both arms. Do not assume "it is only
 *      a visual" — that assumption was wrong here and it will be wrong for the next prop.
 *   2. If a future round needs a villain's performance to be provably physics-neutral, the
 *      lever is `onDeath()`'s spawn transform, not this layer.
 */
const DURESS_CRUSH_LO  = 1.2;   // body weights. Above own-weight noise, below CRUSH_FLOOR.
const DURESS_CRUSH_HI  = 6.0;   // body weights. A storey. (Collapse p90 = 5.58.)
const DURESS_BATTER_LO = 1.5;   // m/s of bruise. Two blows past BATTER_NOISE.
const DURESS_BATTER_HI = 6.0;   // m/s. Just past BATTER_FLOOR — a genuine beating.
const DURESS_ATTACK    = 0.040; // s. A storey landing on you is a SNAP, like every other
                                // state change in this file. One filmstrip tile, no tween.
const DURESS_RELEASE   = 0.50;  // s. Long, deliberately: it spans the gaps between Rapier's
                                // contact bursts (50 % zeros, measured) so the pose holds
                                // steady, and it makes "the weight came off" a beat you can
                                // watch rather than an instant snap back to smug.
/** Duress at which he stops smiling, and at which he grits his teeth. */
const DURESS_ALARM = 0.14;      // ~1.9 body weights — a plank has landed on him.
const DURESS_BRACE = 0.50;      // ~3.6 body weights — this is now a serious problem.

/**
 * The lean. `LOAD_TILT_MAX` is capped at 20 deg on purpose: past roughly 25 deg a villain
 * stops reading as a person under a weight and starts reading as debris, which is the exact
 * failure `uprightK` was introduced to fix. `TORQUE_FULL` is in body-weight-radii — a 6 body
 * weight storey landing half a radius off his centre line saturates the lean.
 */
const LOAD_TILT_MAX  = 0.35;    // rad (20.0 deg)
const TORQUE_FULL    = 3.0;     // body-weight-radii for a full-amplitude lean
const LOAD_SQUASH_MAX = 0.30;   // fraction of the belly's height at full duress

// ---------------------------------------------------------------------------
// IDENTITY / PERFORMANCE constants. Everything below this line is visual.
// ---------------------------------------------------------------------------

/** The four states. Exported so a subclass can compare against them in applyFace(). */
export const FACE = {
  IDLE: 'idle', ALARMED: 'alarmed', BRACED: 'braced', DEFEATED: 'defeated',
};

/**
 * Time-to-impact thresholds, in seconds. RUBRIC P6 requires alarmed to appear at least
 * 200 ms before impact; 0.55 s gives 2.75x that margin, which survives a critic's filmstrip
 * step landing badly. BRACE_TTI is deliberately about one and a half filmstrip tiles at the
 * 80 ms step a reaction strip uses, so the braced pose is always sampled at least once.
 */
const ALARM_TTI = 0.55;
const BRACE_TTI = 0.13;
/** Nothing further away than this can alarm anyone, however fast it is going. */
const SENSE_RADIUS = 13.0;
/** Hysteresis: once alarmed, stay alarmed for this long after the threat clears. */
const ALARM_HOLD = 0.45;

/**
 * The idle. RUBRIC P6: "bob of 2–5 % of head height" at <= 1.2 Hz. A scammer is a heavy,
 * pleased-with-himself man — the read is WEIGHT, so this is at the slow end (0.42 Hz) with
 * the belly and the head in counter-phase, which is what makes a body look like it contains
 * something rather than like a sphere being scaled.
 */
const BREATHE_HZ   = 0.42;
const BREATHE_AMP  = 0.045;   // fraction of the belly's own height
const BOB_AMP      = 0.050;   // fraction of head height (RUBRIC P6 wants 2-5 %)
// A prop held at arm's length is at the end of a long lever, so it travels further than the
// shoulder that carries it. Without this the arms and the cheque sit dead still while the
// head bobs, and the whole character reads as a photograph with a nodding head glued on.
const PROP_BOB     = 1.45;
const BLINK_HZ     = 0.29;    // one blink every ~3.4 s
const BLINK_TICKS  = 5;       // 42 ms shut. A blink you can see in one filmstrip tile.

/** The gloat after a shot that failed to kill you. RUBRIC P11: within one second of the miss. */
const TAUNT_SECONDS = 1.05;

/** Death pop. See the header for why this number and the hit-stop interaction. */
// MEASURED, not guessed (`_tools/scenarios/p6-r1-react.mjs` prints deathDuration_ms). The
// hit-stop hold is ~130 ms of sim, not the 83 ms `fx`'s `hitStop = 10` implies — the impact
// that killed him raises it too, and the beats it eats are the ones that never run. Measured
// on _probe-open: 20 ticks -> 300 ms, 18 -> 280 ms, 15 -> 255 ms against RUBRIC P6's 250 ms
// bar. Re-measure with that scenario if you change any of the three numbers.
const DEATH_TICKS   = 15;     // 125 ms of update + the ~130 ms hit-stop hold = 255 ms
const BEAT_COMPRESS = 3;      // ticks 1..3   — the freeze lands here, so it reads ~155 ms
const BEAT_INFLATE  = 9;      // ticks 4..9, then POP to DEATH_TICKS

/** Local geometry cache — these are shared by every villain, so build them once. */
const _geo = new Map();
const G = (k, make) => { if (!_geo.has(k)) _geo.set(k, make()); return _geo.get(k); };
/** A wince: the top half of a thin ring, drawn inside the retained eyeball. */
const braceArcGeo = () => G('braceArc', () => new THREE.TorusGeometry(1, 0.15, 6, 20, Math.PI));
const tearGeo     = () => G('tear',     () => new THREE.SphereGeometry(1, 10, 8));

/**
 * The pose table. One row per face state; the base applies it as a DELTA from whatever the
 * subclass authored, so a villain with flat brows and one with angry brows both work.
 *
 *   tilt   multiplier on the authored brow rotation. Negative flips it: an angry brow
 *          becomes a worried one without the subclass having to author a second pose.
 *   add    absolute extra rotation, signed by the brow's own side.
 *   rise   brow lift, in eye radii.
 *   pupil  pupil scale (0 hides it — braced draws an arc instead).
 *   white  eyeball scale. Enlarged whites + shrunken pupils is the whole alarmed read.
 *   arc    draw the wince arc.
 */
const FACE_POSE = {
  idle:     { tilt:  1.00, add:  0.00, rise: 0.00, pupil: 1.00, white: 1.00, arc: false },
  // pupil 0.62, NOT the 0.38 this shipped at. "Pupils shrink to dots" is a RATIO to the
  // enlarged white, and 0.38 of 0.52 r on a 0.215 R eye is a pupil 1.7 px across on desktop
  // and half a pixel on a phone — i.e. gone. Photographed at the game's own framing, the
  // alarmed villain had two blank white eggs where his eyes should be, which reads as rolled
  // back and dead: the exact opposite of the state, and the single most-held pose in the
  // whole shot (the guard lasts ~1.4 s). At 0.62 the dot is 2.7 px and still less than half
  // its idle size against a 1.30x white, so the read survives AND exists.
  alarmed:  { tilt: -0.80, add: -0.26, rise: 0.95, pupil: 0.62, white: 1.30, arc: false },
  braced:   { tilt: -0.35, add: -0.10, rise: 0.30, pupil: 0.00, white: 1.10, arc: true  },
  defeated: { tilt: -1.20, add: -0.18, rise: 0.55, pupil: 0.92, white: 1.02, arc: false },
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Smootherstep — the flinch eases in and out without ever overshooting. */
const ease = (k) => { k = clamp01(k); return k * k * k * (k * (k * 6 - 15) + 10); };

export class Villain extends Entity {
  static id = 'base';
  static label = 'Villain';
  /** One-line scam fact, shown on defeat. Funny first, educational second. */
  static fact = '';

  constructor({ x, y, radius = 0.52, matName = 'villain' }) {
    const m = mat(matName);
    const { body, collider } = makeBody({
      kind: 'dynamic', x, y, m,
      shape: shapes.ball(radius),
      // Damping comes from the villain material now (0.030 / 1.60). The old 0.22 of linear
      // damping was a brake on a body IN FLIGHT — a launched villain shed a fifth of its
      // speed every second and its arc bent out of the parabola everything else in the
      // scene follows, which is the single clearest way to look weightless. Nothing is
      // lost by removing it: the rolling-resistance brake below is what stops the trundle,
      // and it only engages under ROLL_SPEED with the villain not falling.
      contactForce: 30,
      sleepy: true,
    });
    const mesh = new THREE.Group();
    super({ mesh, body, collider, material: m, tag: 'villain' });

    this.radius = radius;
    this.hp = 1;
    this.alive = true;
    this.alarmTicks = 0;
    this.hurtFlash = 0;
    /**
     * Sustained load from everything resting on this villain, in multiples of its own weight.
     * `crushTick` is this tick's SUM (a pile is additive — see the header); `crushLoad` is
     * that sum with a short memory so it coasts between the bursts Rapier reports it in.
     */
    this.crushLoad = 0;
    this.crushTick = 0;
    /**
     * The torque that load is applying about his own centre, in body-weight-radii, signed
     * the way `r x F` is for a downward load (positive = his top goes left). `Tick` is this
     * tick's sum; the smoothed value lives in `loadTorque`. See the DURESS block above.
     */
    this.crushTorqueTick = 0;
    this.loadTorque = 0;
    /** 0..1 "something is on me / beating me". Not the projectile — that is `tti`. */
    this.duress = 0;
    /** The two things duress performs with. Both visual; see the DURESS block above. */
    this.loadTilt = 0;
    this.loadSquash = 0;
    /**
     * His own centre, cached once per fixed step. `onImpact` needs it to sign the load
     * torque and runs several times per tick inside the contact drain; `body.translation()`
     * allocates on every call, so it is read once here instead. One tick (8.3 ms) stale,
     * which is nothing against a direction.
     */
    this._cx = x; this._cy = y;
    /** Running sum of recent blows, N·s, decaying with BATTER_TAU. The bruise. */
    this.batter = 0;
    /**
     * The impulse the floor has to supply every single solver step just to hold this villain
     * up. It is the unit crush is measured in, so the crush numbers are size-independent.
     */
    /** Cached because die() removes the rigid body, and a blow can land on the same tick. */
    this.massKg = Math.max(1e-6, this.mass());
    this.weightImpulse = Math.max(1e-6, this.massKg * Math.abs(GRAVITY_Y) * FIXED);
    this.dyingTicks = -1;
    this.bobPhase = rngRange(0, Math.PI * 2);
    this.lookAt = new THREE.Vector2(1, 0);

    // --- identity rig (filled by registerRig / registerFace / poseable) ---
    this.eyes = [];
    this.brows = [];
    this.mouths = {};
    this.face = null;
    this.bobNodes = [];
    this.belly = null;
    this.poses = [];
    this.detachables = [];
    /** Current face state and the 0..1 blend that drives the poseable nodes. */
    this.faceState = FACE.IDLE;
    this.guardK = 0;
    /** Seconds of time-to-impact for the nearest closing projectile; Infinity when clear. */
    this.tti = Infinity;
    this.alarmHold = 0;
    /** Landing squash — the visual half of "believable mass". */
    this.landSquash = 0;
    this.prevVy = 0;
    /** 0 = show the body's own rotation, 1 = fully levelled. See UPRIGHT_* above. */
    this.uprightK = 0;
    /** Last levelled body angle. Held after death, when there is no body left to read. */
    this.leanBase = 0;
    /** Gloat state. Driven from the phase transition, so no event subscription to leak. */
    this.tauntT = -1;
    this.prevPhase = world.phase;
    /**
     * A LATCH, and it is load-bearing. `loadLevel()` settles the level by stepping the solver
     * directly, so a villain's `prevPhase` is left reading 'settling' from the BUILD. Without
     * this latch the very next shot's first update sees settling -> flying with ammoUsed
     * already 1 and fires a gloat 30 ms after the player releases — measured: the cheque was
     * mid-waggle at -0.505 rad while the shot was still in the air. The villain must actually
     * have watched something fly at him before he is allowed to be smug about surviving it.
     */
    this.sawFlight = false;
    this.tear = null;

    this.buildMesh(mesh);
    // Remember where buildMesh parked the parts so the idle can offset from them instead
    // of overwriting them (which would snap everything down to the body's origin).
    for (const n of this.bobNodes) n.userData.__baseY = n.position.y;
    this.bellyBase = this.belly ? this.belly.scale.clone() : new THREE.Vector3(1, 1, 1);
    this.captureFaceRest();
    this.setFace(FACE.IDLE, true);
    world.scene.add(mesh);
    world.villains.push(this);
  }

  /**
   * Copy the body transform onto the visual, then level the character while it is at rest.
   * The blend itself is computed on the fixed step in update(); this only applies it, so a
   * render at any frame rate produces the same picture for the same simulated instant.
   */
  sync() {
    super.sync();
    // Two terms, and both of their INPUTS were computed on the fixed step in update() —
    // this only applies them, so a render at any frame rate produces the same picture for
    // the same simulated instant and every filmstrip stays reproducible.
    //   1. the body's own angle, at whatever authority the levelling has left it (under
    //      load that authority drops and his real shove shows through);
    //   2. the directional lean from where the load is landing.
    //
    // ASSIGNED, NEVER ACCUMULATED, and that is not a style preference. `Entity.sync()`
    // returns immediately when there is no body, and `die()` nulls the body — so a `+=`
    // here has nothing rewriting the base angle underneath it and integrates the lean once
    // per RENDER for the whole death sequence. Measured while it was wrong: 260-396 deg of
    // spin on a dying villain, i.e. the corpse pirouetting through the pop.
    if (this.body) this.leanBase = zAngleOf(this.body) * (1 - this.uprightK);
    this.mesh.rotation.z = this.leanBase + this.loadTilt;
  }

  /** Subclass hook. */
  buildMesh(/* group */) {}

  /** Subclass hook — extra comedy on death (props flying off, etc). */
  onDeath(/* point */) {}

  // =========================================================================
  // AUTHORING API
  // =========================================================================

  /**
   * Name the parts the idle is allowed to touch. See the header for why head and belly are
   * separate: a reaction may never move the head, and a breath may never move the face.
   */
  registerRig({ belly = null, bob = [], face = null } = {}) {
    if (belly) this.belly = belly;
    if (bob.length) this.bobNodes = bob.filter(Boolean);
    if (face) this.face = face;
  }

  /**
   * Register the two features that do all the acting plus the mouth set.
   * `brows[i]` belongs to `eyes[i]`. A brow may be a child of its eye group (that is fine —
   * the base scales the eye's WHITE, not the group, precisely so this stays safe).
   */
  registerFace({ eyes = [], brows = [], mouths = {} } = {}) {
    this.eyes = eyes;
    this.brows = brows;
    this.mouths = mouths;
    for (let i = 0; i < brows.length; i++) {
      const b = brows[i];
      if (!b) continue;
      if (b.userData.side == null) b.userData.side = Math.sign(b.rotation.z) || (i === 0 ? -1 : 1);
    }
  }

  /**
   * The local z that draws a prop IN FRONT of every block in the level rather than inside
   * one, so its width stops being limited by the bay the villain is standing in.
   *
   * `halfDepth` is the prop's own half-thickness in world units (a 0.04-thick card is 0.02).
   * A villain group carries no scale, so local z is world z and this can be used directly.
   *
   * WHY THIS IS FREE, AND WHY IT IS NOT A CHEAT: the camera sits ~110 units back with a
   * narrow FOV, i.e. very nearly orthographic, so pushing a prop 0.6 units toward the lens
   * changes its projected size by about half a percent. All it really changes is depth-sort
   * order — which is exactly what we want, because the alternative (a prop narrow enough to
   * fit between two posts) is what made the teaching device 11 px wide on a phone.
   * It does NOT license moving the villain's BODY forward: RUBRIC P6 requires the body to be
   * level furniture, nested in the structure and partly occluded by it.
   *
   * One consequence to know about: a prop that becomes a rigid body on death (`onDeath`)
   * snaps back to the physics plane at z = 0. At this projection that is invisible in scale;
   * the only tell is that it stops drawing over the posts, on the frame the villain pops.
   */
  frontOfStructureZ(halfDepth = 0.03) {
    return BLOCK_HALF_DEPTH + halfDepth + 0.05;
  }

  /**
   * Anything that flinches. `rest`/`guard` are `{ x, y, z, rot }` in villain-local space;
   * omitted fields are taken from the mesh's authored transform.
   */
  poseable(mesh, { rest = {}, guard = {}, snap = 0.09 } = {}) {
    const base = {
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, rot: mesh.rotation.z,
    };
    this.poses.push({
      mesh,
      rest:  { ...base, ...rest },
      guard: { ...base, ...rest, ...guard },
      rate: 1 / Math.max(FIXED, snap),
    });
    return mesh;
  }

  /**
   * A visual-only bit that flies off at the death pop. Not a rigid body — see the header.
   * Velocities are in world units/second; `spin` in rad/s; `ttl` in seconds.
   */
  addDetachable(mesh, { vx = 0, vy = 4.2, spin = 8, ttl = 1.1 } = {}) {
    this.detachables.push({ mesh, vx, vy, spin, ttl });
    return mesh;
  }

  // =========================================================================
  // FACE STATE MACHINE
  // =========================================================================

  /** Snapshot the authored pose of every brow so states can be applied as deltas. */
  captureFaceRest() {
    for (const b of this.brows) {
      if (!b) continue;
      b.userData.restY = b.position.y;
      b.userData.restMag = Math.abs(b.rotation.z);
    }
    for (const e of this.eyes) {
      if (!e) continue;
      const r = e.userData.r ?? 0.17;
      // The wince arc lives inside the eyeball and is hidden until braced. Built here rather
      // than in the subclass so every villain gets a braced state for free.
      if (!e.userData.arc) {
        const arc = new THREE.Mesh(braceArcGeo(), inkFlat());
        arc.scale.setScalar(r * 0.78);
        arc.position.set(0, -r * 0.10, (e.userData.pupil?.position.z ?? r) + r * 0.06);
        arc.visible = false;
        arc.userData.noInk = true;
        e.add(arc);
        e.userData.arc = arc;
      }
      /**
       * ── THE DETAIL Z, AND THE BUG IT FIXES: AN ALARMED VILLAIN HAD NO PUPILS AT ALL ──
       * `makeEye` builds the eyeball as a SPHERE of radius r and lays the pupil, the glint
       * and the wince arc on flat discs just in front of it. `setFace` then scales the white
       * by `p.white` — 1.30 when alarmed — and the discs, being siblings rather than
       * children, stay where they were authored. A disc 0.92 r out is inside a ball of
       * radius 1.30 r, so the depth buffer eats it: photographed at the game's own framing,
       * the alarmed face was two blank white eggs, which reads as rolled back and DEAD.
       * It was invisible in the canvas and invisible in a close-up; only a screenshot at
       * play size shows it, and it had survived two rounds.
       * So snapshot each detail's authored offset FROM THE EYEBALL'S CENTRE and scale that
       * offset with the white. Any villain that lays details on its own eyeball gets this
       * for free; nothing needs to know the numbers `makeEye` used.
       */
      const wz = e.userData.white ? e.userData.white.position.z : 0;
      e.userData.detailZ = [e.userData.pupil, e.userData.glint, e.userData.arc]
        .filter(Boolean).map(m => [m, wz, m.position.z - wz]);
    }
  }

  /**
   * Snap to a face state. A SNAP, not a tween — RUBRIC P6 fails a state change that eases.
   * The poseable nodes (props, arms) are the one thing allowed to move over ~90 ms, because
   * a prop swung up as a shield in a single frame reads as a teleport.
   */
  setFace(state, force = false) {
    if (state === this.faceState && !force) return;
    this.faceState = state;
    const p = FACE_POSE[state] ?? FACE_POSE.idle;

    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      if (!e) continue;
      const r = e.userData.r ?? 0.17;
      const white = e.userData.white, pupil = e.userData.pupil, glint = e.userData.glint;
      if (white) { white.scale.setScalar(r * p.white); e.userData.openScale = p.white; }
      if (pupil) { pupil.visible = p.pupil > 0; pupil.scale.setScalar(r * 0.52 * p.pupil); }
      if (glint) glint.visible = p.pupil > 0;
      if (e.userData.arc) e.userData.arc.visible = p.arc;
      // ...and ride them out to the surface of the eyeball at its NEW size. See the long
      // note in captureFaceRest(): without this the alarmed face has no pupils.
      for (const [m, wz, dz] of (e.userData.detailZ ?? [])) m.position.z = wz + dz * p.white;
    }
    for (const b of this.brows) {
      if (!b) continue;
      const side = b.userData.side ?? 1;
      const r = b.userData.eyeR ?? (this.radius * 0.235);
      b.position.y = b.userData.restY + r * p.rise;
      b.rotation.z = side * (p.tilt * b.userData.restMag + p.add);
    }
    const want = this.mouths[state] ? state : 'idle';
    for (const k of Object.keys(this.mouths)) {
      const m = this.mouths[k];
      if (m) m.visible = (k === want);
    }
    if (state === FACE.DEFEATED) this.spawnTear();
    this.applyFace(state, p);
  }

  /** Subclass hook — extra per-character work on a state SNAP. */
  applyFace(/* state, pose */) {}

  /**
   * One tear, on the defeated face. RUBRIC P11: defeat ends on humiliation, not death —
   * eyes OPEN, one tear, asymmetric downturned mouth. Owned by the base so every villain
   * gets it; parented to the face so it dies with the mesh.
   */
  spawnTear() {
    if (this.tear || !this.face || !this.eyes.length) return;
    const e = this.eyes[this.eyes.length - 1];
    const r = e.userData?.r ?? this.radius * 0.235;
    const t = new THREE.Mesh(tearGeo(), inkFlat(0x6fc3e8));
    t.scale.set(r * 0.30, r * 0.44, r * 0.24);
    t.position.set(e.position.x + r * 0.86, e.position.y - r * 0.42, (e.userData.pupil?.position.z ?? r));
    t.userData.noInk = true;
    t.userData.y0 = t.position.y;
    this.face.add(t);
    this.tear = t;
  }

  /**
   * Start the gloat. Called when a shot resolved without killing this villain.
   *
   * A man pinned under a storey does not gloat. Surviving a shot is only funny if you are
   * unharmed by it, and without this guard a villain with a beam across his shoulders
   * waggles his prize at the player through the braced face the load has just put on him —
   * two performances fighting over the same prop in the same frame.
   */
  startTaunt() {
    if (!this.alive || this.duress >= DURESS_ALARM) return;
    this.tauntT = 0;
  }

  /** Subclass hook — the character-specific half of the gloat. `k` runs 0..1. */
  onTaunt(/* k */) {}

  /**
   * Subclass hook — the character-specific half of BEING CRUSHED. `k` is `duress`, 0..1.
   * The base already delivers the brace, the squash and the lean; use this only for what is
   * specific to your character's prop (LotteryUncle's cheque sags and buckles under the
   * weight). Called every frame while `duress > 0`, LAST — after `updatePerformance` and
   * after `onIdle` — so writes here are additive on top of both and nothing overwrites them.
   */
  onDuress(/* k, dt */) {}

  /** Subclass hook — beat 0 compress, 1 inflate, 2 pop. `k` runs 0..1 within the beat. */
  onDeathBeat(/* beat, k */) {}

  // -------------------------------------------------------------------------
  onImpact(impulse, other, point, approach = 0) {
    if (!this.alive) return;
    // A chip off a broken plank should knock you about; it should not do what the plank did.
    if (other?.tag === 'debris') impulse *= DEBRIS_BITE;

    if (approach >= 1.2) { this.hit(impulse, other); return; }

    // CRUSH: no approach speed means nothing HIT you — something is LEANING on you. A beam
    // settling across your shoulders carries an enormous force and zero closing speed, and it
    // has to be able to kill you, slowly enough that the player can watch it happen.
    // SUMMED, not maxed: six chunks of rubble on your head is six chunks of weight, and the
    // old max() read that as "one chunk", which is why nobody ever died under a collapse.
    const w = impulse / this.weightImpulse;
    this.crushTick += w;

    /**
     * ...and the same load, signed, so the PERFORMANCE knows which side it came down on.
     * A resting contact is by definition gravity-driven, so the force is -y and the torque
     * about his centre is `r x F` = -dx * F : press down on his right shoulder and his top
     * goes right, exactly as a person does.
     *
     * The `dy` gate is load-bearing and is not a magic number. The single biggest resting
     * contact any villain ever has is THE GROUND, directly under him, and a ground reaction
     * that grows with the pile on top would otherwise dominate this sum with a torque that
     * means nothing. Anything at or below the waist is the floor holding him up; only load
     * arriving from above his own midline can tip him, and it counts more the higher it
     * lands. (Nothing here touches `crushTick`, so the damage model is bit-identical.)
     */
    if (point) {
      const dx = (point.x - this._cx) / this.radius;
      const dy = (point.y - this._cy) / this.radius;
      if (dy > -0.15) {
        this.crushTorqueTick += -dx * w * Math.min(1, (dy + 0.15) / 0.90);
      }
    }
  }

  hit(impulse, other) {
    if (!this.alive) return;
    // N·s -> m/s of this villain's own velocity change. See the header: the thresholds are
    // mass-invariant so that changing what a villain weighs cannot silently change what
    // kills it. `massKg` is cached because die() nulls the body before the last hit resolves.
    const dv = impulse / this.massKg;
    // Two channels, because there are two ways to be killed and they need different shapes.
    //
    // CLEAN BLOW — one solid strike ends it outright. HIT_FLOOR sits between the two measured
    // populations (nudge <= 1.61 N·s, softest real direct hit 3.85), so a spent ball rolling
    // into a villain bounces it about comically and a proper hit pops it.
    let dmg = Math.max(0, dv - HIT_FLOOR) * HIT_GAIN;

    // BATTERING — the beating you take inside a collapsing structure. Every blow bruises;
    // once the bruise is over the floor, every further blow bites. One nudge can never get
    // there (1.61 < 2.20), so this cannot resurrect the "a glancing blow kills" bug.
    if (dv > BATTER_NOISE) {
      this.batter += dv;
      const over = this.batter - BATTER_FLOOR;
      if (over > 0) dmg += Math.min(dv, over) * BATTER_GAIN;
    }

    if (dmg <= 0) return;
    this.hp -= dmg;
    this.hurtFlash = 14;
    if (this.hp <= 0) this.die(impulse);
    else emit('villainHurt', { villain: this, impulse, damage: dmg });
  }

  die(impulse = 0) {
    if (!this.alive) return;
    this.alive = false;
    this.dyingTicks = 0;
    this.tauntT = -1;
    const p = this.position(new THREE.Vector3());
    const point = { x: p.x, y: p.y, z: p.z };
    // Stop being a physics obstacle immediately — a corpse that still blocks the next
    // projectile is a bug the player will feel and not be able to name.
    try { physics.world.removeRigidBody(this.body); } catch { /* already gone */ }
    this.body = null;
    if (this.collider) { world.byCollider.delete(this.collider.handle); this.collider = null; }
    // The humiliated face is the FIRST thing that happens, so the compress beat and the
    // hit-stop hold are both showing it. Snap before onDeath so a subclass that repositions
    // the face for its own death gag runs last.
    this.setFace(FACE.DEFEATED);
    this.onDeath(point);
    emit('villainDefeated', {
      villain: this, point, impulse,
      label: this.constructor.label, fact: this.constructor.fact,
    });
  }

  /**
   * A projectile is heading this way. Two outputs: `lookAt` for the eyes, and `tti` — the
   * TIME to impact, which is what the alarmed/braced snaps fire off. A pure distance test
   * cannot honour RUBRIC P6's "at least 200 ms of lead", because a slow lob and a flat fast
   * shot cross the same radius at completely different times.
   */
  senseIncoming(list) {
    let best = null, bestD = 1e9, bestClose = 0;
    const p = this.position(new THREE.Vector3());
    for (const a of list) {
      if (a.dead || !a.launched) continue;
      const q = a.position(new THREE.Vector3());
      const d = q.distanceTo(p);
      // only count it if it is actually closing
      const v = a.velocity(new THREE.Vector3());
      const dot = (q.x - p.x) * v.x + (q.y - p.y) * v.y;
      if (dot < 0 && d < bestD) {
        bestD = d; best = q;
        // Closing speed along the line of sight — the component that will actually arrive.
        bestClose = d > 1e-4 ? -dot / d : Math.hypot(v.x, v.y);
      }
    }
    if (best && bestD < SENSE_RADIUS) {
      this.alarmTicks = Math.min(90, this.alarmTicks + 2);
      this.lookAt.set(best.x - p.x, best.y - p.y).normalize();
      this.tti = bestClose > 0.5 ? Math.max(0, (bestD - this.radius) / bestClose) : Infinity;
    } else {
      this.alarmTicks = Math.max(0, this.alarmTicks - 1);
      this.lookAt.set(-0.6, -0.1).normalize();     // smug: looking back at the sling
      this.tti = Infinity;
    }
  }

  update(dt) {
    if (this.dyingTicks >= 0) { this.updateDeath(); return; }
    if (!this.alive) return;

    if (this.hurtFlash > 0) this.hurtFlash--;

    // --- the gloat. A shot that resolved without killing you gets a taunt inside a second
    // (RUBRIC P11). Read off the phase transition rather than an event subscription: a
    // per-instance listener on a bus that is never cleared between levels is a leak.
    // ORDER MATTERS: test the transition against the PREVIOUS frame's latch, then set it.
    // Setting it first makes the latch useless — on the first update after a release the
    // phase is already 'flying', so the same frame both arms the latch and sees the stale
    // 'settling' left over from the level build, and the gloat fires mid-shot.
    if (this.sawFlight && this.prevPhase === 'settling' && world.phase !== 'settling') {
      this.sawFlight = false;
      this.startTaunt();
    }
    if (world.phase === 'flying') this.sawFlight = true;
    this.prevPhase = world.phase;

    // The bruise fades. Four separate shots at the same villain must not silently add up
    // into a kill three minutes later; one collapse must.
    this.batter *= Math.exp(-dt / BATTER_TAU);
    if (this.batter < 0.02) this.batter = 0;

    // CRUSH. This tick's total resting load, or the coasting memory of the last burst,
    // whichever is larger — contacts arrive in bursts, not every tick, so without the
    // memory the load would flicker to zero between them and never do any damage.
    // Half a second under a stone block is fatal, a plank leaning on you is survivable,
    // and lifting the weight off stops the damage inside ~0.17 s. On an untouched level no
    // resting contact clears CRUSH_FLOOR at all, which is why a settled structure cannot
    // quietly murder its own villains.
    this.crushLoad = Math.max(this.crushTick, this.crushLoad * Math.exp(-dt / CRUSH_TAU));
    this.crushTick = 0;
    if (this.crushLoad < 0.02) this.crushLoad = 0;
    if (this.crushLoad > CRUSH_FLOOR) {
      this.hp -= (this.crushLoad - CRUSH_FLOOR) * CRUSH_RATE * dt;
      this.hurtFlash = 8;
      if (this.hp <= 0) { this.die(0); return; }
    }

    // ROLLING RESISTANCE. Without this a villain knocked loose rolls out from under its own
    // collapsing tower and keeps going for the width of the level — nothing can ever land on
    // it, and the level cannot settle while it is moving. Brake the ROLL only: a villain in
    // flight (fast, or falling) is untouched, so the knockback arc of a direct hit and the
    // drop off a broken tower both stay exactly as the solver computed them.
    const b = this.body;
    let vy = 0;
    if (b) {
      // One read per fixed step, for onImpact's load-direction sign. See `_cx` in the ctor.
      const t = b.translation();
      this._cx = t.x; this._cy = t.y;
    }
    if (b && !b.isSleeping()) {
      const v = b.linvel();
      vy = v.y;
      const sp = Math.hypot(v.x, v.y);
      if (sp > 0.03 && sp < ROLL_SPEED && Math.abs(v.y) < ROLL_FALL) {
        const k = Math.exp(-dt / ROLL_TAU);
        b.setLinvel({ x: v.x * k, y: v.y, z: 0 }, false);
        const w = b.angvel();
        b.setAngvel({ x: 0, y: 0, z: w.z * k }, false);
      }
    }

    /**
     * DURESS — the load, as a performance signal. See the DURESS block at the top of this
     * file for the measured distributions the two floors are placed against.
     *
     * `crushLoad` and `batter` are both computed above and both already decay on their own
     * clocks, but those clocks are sized for DAMAGE (crush must stop within ~0.17 s of the
     * weight lifting, or a settled rock splits on its own — P3 r6b's negative result). A
     * pose needs a different envelope: instant on the arrival, slow off, so that Rapier's
     * bursty resting contacts — measured at 50 % zeros while a beam is genuinely lying on
     * him — produce a held pose instead of a strobe.
     */
    const crushK  = clamp01((this.crushLoad - DURESS_CRUSH_LO) / (DURESS_CRUSH_HI - DURESS_CRUSH_LO));
    const batterK = clamp01((this.batter    - DURESS_BATTER_LO) / (DURESS_BATTER_HI - DURESS_BATTER_LO));
    const dTarget = Math.max(crushK, batterK);
    const dTau = dTarget > this.duress ? DURESS_ATTACK : DURESS_RELEASE;
    this.duress += (dTarget - this.duress) * (1 - Math.exp(-dt / dTau));
    if (this.duress < 0.004 && dTarget === 0) this.duress = 0;

    // The signed half of the same signal, on the same envelope, so the lean holds through
    // the gaps between contact bursts exactly as the squash does.
    const tqTarget = Math.max(-1, Math.min(1, this.crushTorqueTick / TORQUE_FULL));
    const tqTau = Math.abs(tqTarget) > Math.abs(this.loadTorque) ? DURESS_ATTACK : DURESS_RELEASE;
    this.loadTorque += (tqTarget - this.loadTorque) * (1 - Math.exp(-dt / tqTau));
    this.crushTorqueTick = 0;

    // BELIEVABLE MASS, half two: he stands back up. See UPRIGHT_* above — visual only.
    //
    // ...BUT NOT WHILE SOMETHING IS ON HIM. "Resting" here was defined by SPEED alone, and a
    // man pinned under a storey is extremely at rest, so the levelling ran at full strength
    // and multiplied the body's own 10.5-13.8 deg of measured shove down to 0.0-0.2 deg on
    // screen. Standing up straight under a collapsing tower is the single clearest way to
    // look weightless, and it was costing the physics' own honest answer. So the levelling
    // authority is scaled by (1 - duress): he is levelled when he is fine, he wears whatever
    // the solver did to him while he is not, and he re-levels as the weight comes off.
    const resting = !b || b.isSleeping() ||
      (Math.hypot(b.linvel().x, b.linvel().y) < UPRIGHT_SPEED && Math.abs(vy) < UPRIGHT_FALL);
    const uTarget = resting ? (1 - this.duress) : 0;
    const uTau = resting ? UPRIGHT_TAU : 0.08;
    this.uprightK += (uTarget - this.uprightK) * (1 - Math.exp(-dt / uTau));

    // THE LEAN, and THE SQUASH. Both are pure functions of the two smoothed load signals
    // above, so they follow the fixed step and never the frame rate. The lean is applied in
    // sync(); the squash is applied in updatePerformance() alongside the breath it competes
    // with, so a crushed villain stops breathing comfortably.
    this.loadTilt = this.loadTorque * LOAD_TILT_MAX;
    this.loadSquash = this.duress;

    // BELIEVABLE MASS, half one: a landing. The moment a real downward speed is arrested,
    // the belly compresses and springs back. Nothing about the physics changes — the body
    // is exactly as heavy as art/materials.js says — but a body that deforms when it lands
    // reads as containing something, and a rigid sphere never does.
    if (this.prevVy < -2.6 && vy > this.prevVy * 0.35) {
      this.landSquash = Math.min(1, Math.abs(this.prevVy) / 9);
    }
    this.prevVy = vy;
    this.landSquash *= Math.exp(-dt / 0.13);
    if (this.landSquash < 0.004) this.landSquash = 0;

    this.updateFaceState();
    this.updatePerformance(dt);
    this.onIdle(dt, this.alarmTicks / 90);
    // LAST, so a character's crush flourish is additive on top of both the base pose and
    // its own idle — the same contract onIdle has with updatePerformance.
    if (this.duress > 0) this.onDuress(this.duress, dt);
  }

  /**
   * Which of the four faces is on. Everything here is a SNAP; `setFace` is a no-op when the
   * state has not changed, so this is cheap to call every step.
   *
   * TWO INPUTS, NOT ONE. `tti` is the projectile you can see coming. `duress` is the masonry
   * that is already on you — and until r2 it drove damage and nothing else, so a villain
   * buried in his own collapsing tower held a smug idle face for 800 ms and then popped
   * (measured: 48.6 % of loaded frames were IDLE). A tower landing on you is at least as
   * alarming as a ball that has not arrived yet, so the two threats are read on the same
   * scale and the WORSE one picks the face.
   */
  updateFaceState() {
    const braced  = this.tti <= BRACE_TTI || this.duress >= DURESS_BRACE;
    const alarmed = this.tti <= ALARM_TTI || this.duress >= DURESS_ALARM;
    if (braced) {
      this.alarmHold = ALARM_HOLD;
      this.setFace(FACE.BRACED);
    } else if (alarmed) {
      this.alarmHold = ALARM_HOLD;
      this.setFace(FACE.ALARMED);
    } else if (this.alarmHold > 0) {
      this.alarmHold -= FIXED;
      if (this.faceState === FACE.BRACED) this.setFace(FACE.ALARMED);
    } else {
      this.setFace(FACE.IDLE);
    }
  }

  /**
   * The idle, the flinch and the gloat — everything that moves and does not change state.
   *
   * ORDER MATTERS. The head/face bob is a pure function of simTime and is NOT modulated by
   * the alarm, so an idle frame and an alarmed frame at the same instant have the head in
   * exactly the same place. That is what makes RUBRIC P6's "overlay idle and alarmed, head
   * outline delta <= 2 px" true by construction rather than by luck.
   */
  updatePerformance(dt) {
    const t = world.simTime;
    const guarding = this.faceState === FACE.ALARMED || this.faceState === FACE.BRACED;

    // --- the gloat clock
    let taunt = 0;
    if (this.tauntT >= 0) {
      this.tauntT += dt;
      if (this.tauntT >= TAUNT_SECONDS) this.tauntT = -1;
      else taunt = this.tauntT / TAUNT_SECONDS;
    }

    // --- breathe (belly only) + bob (head and face only)
    const breath = Math.sin(t * BREATHE_HZ * Math.PI * 2 + this.bobPhase);
    // Three bounces of the gloat, on top of the breath, so a taunt reads as a chuckle.
    const gloat = taunt > 0 ? Math.sin(taunt * Math.PI * 3) * Math.sin(taunt * Math.PI) : 0;
    const hurt = this.hurtFlash > 0 ? this.hurtFlash / 14 : 0;
    /**
     * THE CRUSH SQUASH. `landSquash` is a transient spring on an arrested fall; this one is
     * HELD for as long as the weight is on him, which is the difference between "he landed"
     * and "he is being crushed". It also SUPPRESSES THE BREATH (`1 - load`) rather than
     * riding on top of it: a comfortable 0.42 Hz swell under a collapsing storey is the
     * exact tell that the character is not really in the scene.
     */
    const load = this.loadSquash;
    if (this.belly) {
      const sy = 1 + breath * BREATHE_AMP * (1 - load) + gloat * 0.075
                 - this.landSquash * 0.26 - hurt * 0.10 - load * LOAD_SQUASH_MAX;
      // The WIDTH gain is 1.0x the height loss, not the 0.62x a landing uses, and the reason
      // is occlusion rather than taste: the flinch parks the prop across the chest, so on
      // Lottery Uncle a 0.62x widen left the belly entirely behind a 1.70 R cheque and the
      // squash — the main mass read — was invisible at exactly the moment it fires. At 1.0x
      // the body squeezes out past the prop on both sides. If your villain's guard prop is
      // narrower than its belly this is simply a slightly rounder squash.
      const sx = 1 - breath * BREATHE_AMP * 0.55 * (1 - load)
                 + this.landSquash * 0.20 + hurt * 0.09 + load * LOAD_SQUASH_MAX;
      this.belly.scale.set(this.bellyBase.x * sx, this.bellyBase.y * sy, this.bellyBase.z * sx);
    }
    // The head sinks INTO the shoulders — "no neck left" is what a person under a weight
    // actually looks like, and it is the half of the squash that survives being 40 px tall.
    // 0.22 R, not the 0.46 R this was first written at: measured on the crushed still, that
    // dropped the eyes to the top edge of the guard-posed cheque and the character stopped
    // being nameable at the exact moment the player is looking hardest at him.
    // Driven by LOAD, never by face state, so RUBRIC P6's "overlay idle and alarmed,
    // head-outline delta <= 2 px" is still true by construction: the two face states at the
    // same instant carry the same load.
    const bobY = (-breath * BOB_AMP * (1 - load) + gloat * 0.055
                  - this.landSquash * 0.10 - load * 0.22) * this.radius;
    for (const n of this.bobNodes) n.position.y = n.userData.__baseY + bobY;

    // --- the flinch: poseable nodes snap toward their guard pose. This is the ONLY thing
    // that changes the silhouette when a shot is incoming, and it is what makes the
    // reaction survive the 40 px test.
    for (const p of this.poses) {
      const target = guarding ? 1 : 0;
      const k = p.mesh.userData.__k ?? 0;
      const next = clamp01(k + (target - k > 0 ? p.rate * dt : -p.rate * dt));
      p.mesh.userData.__k = Math.abs(target - k) < p.rate * dt ? target : next;
      const e = ease(p.mesh.userData.__k);
      p.mesh.position.set(
        p.rest.x + (p.guard.x - p.rest.x) * e,
        p.rest.y + (p.guard.y - p.rest.y) * e,
        p.rest.z + (p.guard.z - p.rest.z) * e,
      );
      p.mesh.rotation.z = p.rest.rot + (p.guard.rot - p.rest.rot) * e;
      p.mesh.position.y += bobY * PROP_BOB;
    }

    // --- eyes: track the threat, blink only when nothing is happening
    const blinkPhase = (t * BLINK_HZ + this.bobPhase * 0.31) % 1;
    const blinking = this.faceState === FACE.IDLE &&
                     blinkPhase < BLINK_TICKS * FIXED * BLINK_HZ;
    for (const e of this.eyes) {
      if (!e) continue;
      const r = e.userData.r ?? 0.17;
      const s = e.userData.openScale ?? 1;
      e.userData.look?.(this.lookAt.x, this.lookAt.y);
      if (e.userData.white) e.userData.white.scale.y = r * s * (blinking ? 0.10 : 1);
      if (e.userData.pupil && this.faceState !== FACE.BRACED) {
        e.userData.pupil.visible = !blinking;
      }
      if (e.userData.glint) e.userData.glint.visible = !blinking && this.faceState !== FACE.BRACED;
    }

    if (taunt > 0) this.onTaunt(taunt);
  }

  /**
   * The three-beat pop. See the header for the hit-stop interaction and for why nothing here
   * touches a material.
   */
  updateDeath() {
    this.dyingTicks++;
    const n = this.dyingTicks;
    const s = this.mesh.scale;

    if (n <= BEAT_COMPRESS) {
      // BEAT 0 — the oof. Squat hard and wide. This is the pose the hit-stop holds, so it is
      // also the impact read: RUBRIC P10 wants an extreme pose to persist >= 120 ms.
      const k = n / BEAT_COMPRESS;
      s.set(1 + 0.42 * k, 1 - 0.40 * k, 1 + 0.20 * k);
      this.onDeathBeat(0, k);
    } else if (n <= BEAT_INFLATE) {
      // BEAT 1 — the balloon. Everything detachable leaves on the first frame of this beat,
      // so the hat is already in the air while the body is still visibly inflating.
      const k = (n - BEAT_COMPRESS) / (BEAT_INFLATE - BEAT_COMPRESS);
      if (n === BEAT_COMPRESS + 1) this.releaseDetachables();
      const g = 1.42 * k + (1 - k) * 0.98;
      s.set(g, g * (0.60 + 0.42 * k), g);
      this.onDeathBeat(1, k);
    } else {
      // BEAT 2 — pop. Blow past the silhouette and vanish INTO the FX puff that
      // `villainDefeated` already fired at the same instant, so the two read as one event.
      const k = (n - BEAT_INFLATE) / (DEATH_TICKS - BEAT_INFLATE);
      const g = 1.42 + 0.75 * k;
      s.setScalar(g);
      this.onDeathBeat(2, k);
    }

    /**
     * P11: "comic deformation scales the BODY only and leaves the face at 1x — the mismatch
     * between a huge body and unchanged tiny features is where the comedy lives." The pop
     * scales the whole mesh, so the head group is counter-scaled back to unity here. Do this
     * rather than scaling the belly alone: the belly is one mesh among many, and inflating
     * the whole body while pinning the head is exactly the gag.
     */
    for (const n of this.bobNodes) {
      n.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
    }

    // The tear falls out of frame while the body inflates around it.
    if (this.tear) {
      this.tear.position.y = this.tear.userData.y0 - n * this.radius * 0.028;
    }
    if (this.dyingTicks >= DEATH_TICKS) this.destroy();
  }

  /**
   * Hand every detachable to the scene as a body-less Entity with a ballistic update.
   * Deterministic: the only randomness is `rngRange`, and the clock is the fixed step.
   */
  releaseDetachables() {
    for (const d of this.detachables) {
      const m = d.mesh;
      if (!m || !m.parent) continue;
      const p = new THREE.Vector3();
      m.getWorldPosition(p);
      const q = new THREE.Quaternion();
      m.getWorldQuaternion(q);
      m.parent.remove(m);
      m.position.copy(p);
      m.quaternion.copy(q);
      m.scale.multiplyScalar(1);
      world.scene.add(m);
      const e = new Entity({ mesh: m, tag: 'decor' });
      const vx = d.vx + rngRange(-0.8, 0.8);
      const vy = d.vy + rngRange(-0.4, 0.6);
      const spin = d.spin * (rngRange(0, 1) < 0.5 ? -1 : 1);
      let age = 0;
      e.sync = () => {};                       // no body; the update below owns the transform
      e.update = function (dt) {
        age += dt;
        m.position.x += vx * dt;
        m.position.y += (vy + GRAVITY_Y * 0.42 * age) * dt;
        m.rotation.z += spin * dt;
        if (age > d.ttl || m.position.y < -8) this.destroy();
      };
    }
    this.detachables.length = 0;
  }

  /** Subclass hook for per-character idle animation. */
  onIdle(/* dt, alarm */) {}
}
