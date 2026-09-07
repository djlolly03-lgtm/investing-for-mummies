/**
 * entity.js — the one base class everything physical inherits from.
 *
 * ARCHITECTURE.md: `class Entity { mesh; body; material; onImpact(impulse, other); destroy(); }`
 * plus `fracture(impulse, point)` on breakables.
 *
 * Rules for anything that subclasses this:
 *   · `update(dt)` runs inside the FIXED solver step, dt is always FIXED. Never wall-clock.
 *   · randomness comes from rng.js. Never Math.random().
 *   · no FX, audio or score code in here — emit an event and let the subscribers do it.
 */

import * as THREE from 'three';
import { physics, RAPIER } from '../physics.js';
import { register, unregister, world } from '../world.js';

let _uid = 0;

export class Entity {
  /**
   * @param {object} o
   * @param {THREE.Object3D} o.mesh    visual root (may be a Group)
   * @param {any}  [o.body]            Rapier RigidBody, or null for decor
   * @param {any}  [o.collider]        the primary Rapier Collider (for the impact lookup)
   * @param {object} [o.material]      the mat() result: { three, physics }
   * @param {string} [o.tag]           'block'|'villain'|'ammo'|'debris'|'ground'|'prop'|'decor'
   */
  constructor({ mesh, body = null, collider = null, material = null, tag = 'entity' }) {
    this.id = ++_uid;
    this.mesh = mesh;
    this.body = body;
    this.collider = collider;
    this.material = material;
    this.tag = tag;
    this.dead = false;
    this.bornTick = physics.tick;
    /**
     * Speed at the END of the previous tick — i.e. the speed this body was travelling at
     * just BEFORE the contact that main.js is about to report. Contact-force events are
     * drained inside the solver step, before entity updates run, so this value is exactly
     * the pre-collision speed. It is what separates "something hit this" from "something is
     * resting on this", and without it a settled tower emits impact events every frame.
     */
    this.lastSpeed = 0;
    register(this);
  }

  get age() { return (physics.tick - this.bornTick) * (1 / 120); }

  position(out = new THREE.Vector3()) {
    if (this.body) { const t = this.body.translation(); return out.set(t.x, t.y, t.z); }
    return out.copy(this.mesh.position);
  }

  velocity(out = new THREE.Vector3()) {
    if (!this.body || this.body.isFixed?.()) return out.set(0, 0, 0);
    const v = this.body.linvel();
    return out.set(v.x, v.y, v.z);
  }

  speed() {
    if (!this.body) return 0;
    const v = this.body.linvel();
    return Math.hypot(v.x, v.y);
  }

  mass() { return this.body?.mass?.() ?? 0; }

  /** Copy the rigid body transform onto the visual. Called every render. */
  sync() {
    if (!this.body) return;
    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  /**
   * Overridden by subclasses.
   * @param {number} impulse   N·s, from the contact force event
   * @param {Entity} other
   * @param {{x,y,z}} point    world-space contact point
   * @param {number} approach  pre-collision closing speed proxy, m/s. Near zero for a
   *                           resting contact — check it before doing damage.
   */
  onImpact(/* impulse, other, point, approach */) {}

  /** Overridden by subclasses. Runs inside the fixed step. */
  update(/* dt */) {}

  destroy() {
    if (this.dead) return;
    this.dead = true;
    if (this.body) { try { physics.world.removeRigidBody(this.body); } catch { /* already gone */ } }
    this.body = null; this.collider = null;
    if (this.mesh) {
      this.mesh.parent?.remove(this.mesh);
      disposeTree(this.mesh);
    }
    unregister(this);
  }
}

/** Geometry is often shared/cached, so only dispose what this subtree uniquely owns. */
export function disposeTree(root) {
  root.traverse(o => {
    if (o.isMesh && o.userData.ownsGeometry) o.geometry?.dispose?.();
    if (o.isMesh && o.userData.ownsMaterial) o.material?.dispose?.();
  });
}

// ---------------------------------------------------------------------------
// body helpers — every body in the game is created through one of these so the
// 2.5D plane lock can never be forgotten.
// ---------------------------------------------------------------------------

export function quatZ(rad) {
  const h = rad / 2;
  return { x: 0, y: 0, z: Math.sin(h), w: Math.cos(h) };
}

export function zAngleOf(body) {
  const r = body.rotation();
  return Math.atan2(2 * (r.w * r.z), 1 - 2 * (r.z * r.z));
}

/**
 * Dynamic or fixed rigid body, plane-locked, with one primary collider.
 *
 * -- DAMPING COMES FROM THE MATERIAL, NOT FROM THE CALL SITE ------------------
 * `linearDamping` / `angularDamping` default to NULL, and null means "ask the material".
 * They used to default to 0.06 / 0.32 and every caller passed its own literal, so a stone
 * cube, a wood beam and a glass pane were all built with 0.06 / 0.30 — identical dynamics
 * under three different textures. Measured on the drop rig before the change, two of the
 * three materials matched each other to three significant figures in rebound, slide, spin
 * AND settle time. See art/materials.js for the numbers and the reasoning behind each.
 *
 * Pass an explicit number ONLY when the damping is a behaviour rather than a substance —
 * ammo/base.js does, because the arc droop and the nose-first spin are P1/P2 tuning and not
 * a property of the dart's alloy, and Debris passes the material's own `debris` pair.
 * Everything else must let the material speak.
 *
 * -- FRICTION COMBINES WITH Min, RESTITUTION WITH Average ---------------------
 * Rapier's default for both is Average, and averaging friction against a ground of 1.00
 * destroyed exactly the separation this piece is about: glass's 0.26 arrives as 0.63 and
 * stone's 1.00 as 1.00 — a spread of 1.6x where the authored numbers say 3.8x — so nothing
 * could ever skitter. Min is both the readable choice and the physical one: the slipperier
 * surface of a pair is what decides how the pair slides. Restitution stays on Average,
 * where the ground is now a near-zero term (0.02) and averaging still leaves wood eight
 * times bouncier than stone.
 *
 * @returns {{body:any, collider:any}}
 */
export function makeBody({
  kind = 'dynamic', x, y, rot = 0, shape, m,
  ccd = false, linearDamping = null, angularDamping = null,
  sensor = false, contactForce = 0, sleepy = true, gravityScale = 1,
}) {
  const mp = m.physics;
  const linD = linearDamping ?? mp.linearDamping ?? 0.06;
  const angD = angularDamping ?? mp.angularDamping ?? 0.32;
  const desc = (kind === 'fixed' ? RAPIER.RigidBodyDesc.fixed()
    : kind === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased()
    : RAPIER.RigidBodyDesc.dynamic())
    .setTranslation(x, y, 0)
    .setRotation(quatZ(rot))
    .setLinearDamping(linD)
    .setAngularDamping(angD)
    .setCcdEnabled(ccd)
    .setGravityScale(gravityScale)
    .setCanSleep(sleepy);

  const body = physics.world.createRigidBody(desc);
  physics.planeLock(body);          // <- the 2.5D lock, every body, no exceptions

  const cd = shape();
  cd.setFriction(mp.friction).setRestitution(mp.restitution);
  cd.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
  if (kind === 'dynamic') cd.setDensity(mp.density);
  if (sensor) cd.setSensor(true);
  if (contactForce > 0) {
    cd.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
    cd.setContactForceEventThreshold(contactForce);
  }
  const collider = physics.world.createCollider(cd, body);
  return { body, collider };
}

export const shapes = {
  box:  (w, h, d = 1.0) => () => RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2),
  ball: (r)             => () => RAPIER.ColliderDesc.ball(r),
  caps: (halfH, r)      => () => RAPIER.ColliderDesc.capsule(halfH, r),
};

/** Push every entity's visual to match its body. Called once per rendered frame. */
export function syncAll() {
  const es = world.entities;
  for (let i = 0; i < es.length; i++) es[i].sync();
}
