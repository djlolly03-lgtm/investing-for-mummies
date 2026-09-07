/**
 * villains/base.js — shared scam-villain behaviour. One file per archetype extends this.
 *
 * A villain is a physics ball with a face and a nervous system. Everything that makes it
 * funny lives in three places:
 *   · idle()    — bob, breathe, blink, glance about. Never perfectly still.
 *   · alarm()   — a projectile is incoming; eyes widen, look at it, brace.
 *   · die()     — the pop. Scale up, burst, gone. The laugh is the deliverable.
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
import { Entity, makeBody, shapes } from '../level/entity.js';
import { mat } from '../art/materials.js';
import { emit } from '../events.js';
import { world } from '../world.js';
import { physics, FIXED, GRAVITY_Y } from '../physics.js';
import { rngRange } from '../rng.js';

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
const ROLL_SPEED = 4.5;     // m/s. Faster than this is a launch, not a roll.
const ROLL_FALL  = 1.6;     // m/s of |vy|. Faster than this is a fall, not a roll.
const ROLL_TAU   = 0.28;    // s. A 2 m/s roll is down to walking pace in a third of a second.

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
    this.eyes = [];
    this.face = null;

    this.buildMesh(mesh);
    // Remember where buildMesh parked the face so the idle bob can offset from it instead
    // of overwriting it (which would snap the face down to the body's origin).
    this.faceBaseY = this.face ? this.face.position.y : 0;
    world.scene.add(mesh);
    world.villains.push(this);
  }

  /** Subclass hook. */
  buildMesh(/* group */) {}

  /** Subclass hook — extra comedy on death (props flying off, etc). */
  onDeath(/* point */) {}

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
    this.crushTick += impulse / this.weightImpulse;
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
    const p = this.position(new THREE.Vector3());
    const point = { x: p.x, y: p.y, z: p.z };
    // Stop being a physics obstacle immediately — a corpse that still blocks the next
    // projectile is a bug the player will feel and not be able to name.
    try { physics.world.removeRigidBody(this.body); } catch { /* already gone */ }
    this.body = null;
    if (this.collider) { world.byCollider.delete(this.collider.handle); this.collider = null; }
    this.onDeath(point);
    emit('villainDefeated', {
      villain: this, point, impulse,
      label: this.constructor.label, fact: this.constructor.fact,
    });
  }

  /** A projectile is heading this way — used for the nervous look. */
  senseIncoming(list) {
    let best = null, bestD = 1e9;
    const p = this.position(new THREE.Vector3());
    for (const a of list) {
      if (a.dead || !a.launched) continue;
      const q = a.position(new THREE.Vector3());
      const d = q.distanceTo(p);
      // only count it if it is actually closing
      const v = a.velocity(new THREE.Vector3());
      const closing = (q.x - p.x) * v.x + (q.y - p.y) * v.y < 0;
      if (closing && d < bestD) { bestD = d; best = q; }
    }
    if (best && bestD < 11) {
      this.alarmTicks = Math.min(90, this.alarmTicks + 2);
      this.lookAt.set(best.x - p.x, best.y - p.y).normalize();
    } else {
      this.alarmTicks = Math.max(0, this.alarmTicks - 1);
      this.lookAt.set(-0.6, -0.1).normalize();     // smug: looking back at the sling
    }
  }

  update(dt) {
    if (this.dyingTicks >= 0) {
      // 12-tick death pop: swell, then vanish. Short, punchy, no lingering corpse.
      this.dyingTicks++;
      const k = this.dyingTicks / 12;
      this.mesh.scale.setScalar(1 + k * 0.9);
      this.mesh.traverse(o => { if (o.material && 'opacity' in o.material) { o.material.transparent = true; } });
      if (this.dyingTicks >= 12) this.destroy();
      return;
    }
    if (!this.alive) return;

    const alarm = this.alarmTicks / 90;
    if (this.hurtFlash > 0) this.hurtFlash--;

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
    if (b && !b.isSleeping()) {
      const v = b.linvel();
      const sp = Math.hypot(v.x, v.y);
      if (sp > 0.03 && sp < ROLL_SPEED && Math.abs(v.y) < ROLL_FALL) {
        const k = Math.exp(-dt / ROLL_TAU);
        b.setLinvel({ x: v.x * k, y: v.y, z: 0 }, false);
        const w = b.angvel();
        b.setAngvel({ x: 0, y: 0, z: w.z * k }, false);
      }
    }

    // idle bob — tiny, on the MESH not the body, so it never fights the solver
    const t = world.simTime;
    const asleep = this.body?.isSleeping?.() ?? false;
    const bob = asleep ? Math.sin(t * 2.4 + this.bobPhase) * 0.026 : 0;
    const squash = 1 + Math.sin(t * 2.4 + this.bobPhase) * 0.022 + alarm * 0.05;
    this.mesh.scale.set(1 / squash, squash, 1);
    if (this.face) this.face.position.y = this.faceBaseY + bob;

    // eyes: widen and track the incoming projectile
    for (const e of this.eyes) {
      e.userData.look(this.lookAt.x, this.lookAt.y);
      const blinkT = (t * 0.55 + this.bobPhase) % 1;
      const blinking = blinkT > 0.955 && alarm < 0.2;
      e.scale.setScalar(1 + alarm * 0.45);
      e.userData.setOpen(blinking ? 0.08 : 1);
    }
    this.onIdle(dt, alarm);
  }

  /** Subclass hook for per-character idle animation. */
  onIdle(/* dt, alarm */) {}
}
