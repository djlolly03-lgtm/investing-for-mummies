/**
 * ammo/sip.js — THE SIP ARROW.  Ammo #1 of the investor-tools cast.
 *
 * Character brief: a stubby teal dart with a determined little face. It is the reliable one.
 * Silhouette test (must read at 40px): a fat wedge nose, a squat body, two cream tail fins —
 * unmistakably an arrow, unmistakably not a ball.
 *
 * Ability (tap mid-air): SPLITS INTO THREE, fanned. The joke is the mechanic: a SIP is one
 * lump sum broken into instalments, and three smaller instalments beat one big bet.
 * The split children are real projectiles with real mass, not decoration.
 */

import * as THREE from 'three';
import { Ammo } from './base.js';
import { mat, PALETTE } from '../art/materials.js';
import { RAMP_STD, RAMP_HARD, ink, inkAll, makeEye, inkFlat, creamFlat } from '../art/toon.js';
import { world } from '../world.js';
import { physics } from '../physics.js';

const CACHE = {};
function geo(key, make) { if (!CACHE[key]) CACHE[key] = make(); return CACHE[key]; }

export class SipArrow extends Ammo {
  static id = 'sip';
  static label = 'SIP Arrow';

  constructor(o = {}) {
    super({ radius: 0.40, matName: 'ammo', ...o, tag: 'ammo' });
    this.splitGeneration = o.generation ?? 0;
  }

  buildMesh(g) {
    const R = this.radius ?? 0.40;
    const teal = mat('ammo').three;
    const dark = mat('ammo', { color: 0x1d7a6e, emissiveIntensity: 0.34 }).three;

    // --- body: a squat capsule lying along +X ---
    const body = new THREE.Mesh(
      geo('sipBody', () => new THREE.CapsuleGeometry(1, 0.9, 6, 18)), teal);
    body.scale.setScalar(R * 0.78);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    g.add(body);

    // --- nose: a 6-sided wedge, darker, so the front reads instantly ---
    const nose = new THREE.Mesh(
      geo('sipNose', () => new THREE.ConeGeometry(1, 1.5, 7)), dark);
    nose.scale.set(R * 0.82, R * 1.05, R * 0.82);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = R * 1.16;
    nose.castShadow = true;
    g.add(nose);

    // --- tail fins: cream, angled, chunky ---
    const finGeo = geo('sipFin', () => new THREE.BoxGeometry(1, 1, 1));
    const finMat = new THREE.MeshToonMaterial({ color: PALETTE.cream, gradientMap: RAMP_STD() });
    for (const s of [1, -1]) {
      const f = new THREE.Mesh(finGeo, finMat);
      f.scale.set(R * 0.62, R * 0.10, R * 0.72);
      f.position.set(-R * 0.92, s * R * 0.52, 0);
      f.rotation.z = s * 0.42;
      f.castShadow = true;
      g.add(f);
    }

    // --- the ₹ band: a cream ring around the middle. Reads as "money" at any size. ---
    const band = new THREE.Mesh(
      geo('sipBand', () => new THREE.CylinderGeometry(1, 1, 0.16, 20)),
      new THREE.MeshToonMaterial({ color: PALETTE.gold, gradientMap: RAMP_HARD() }));
    band.scale.set(R * 0.84, R * 1.0, R * 0.84);
    band.rotation.z = Math.PI / 2;
    band.position.x = -R * 0.05;
    g.add(band);

    // --- face: two eyes + angry brows, on the +Z side facing camera ---
    const eyeR = R * 0.30;
    this.eyeL = makeEye(eyeR, R * 0.60);
    this.eyeR = makeEye(eyeR, R * 0.60);
    this.eyeL.position.set(R * 0.34, R * 0.26, 0);
    this.eyeR.position.set(R * 0.34, -R * 0.26, 0);
    // The face lives on the side of a body that rotates with velocity, so counter-rotate
    // the pair as a unit later; for now they sit in local space.
    g.add(this.eyeL, this.eyeR);

    const browGeo = geo('sipBrow', () => new THREE.BoxGeometry(1, 1, 1));
    const browMat = inkFlat();
    for (const [e, s] of [[this.eyeL, 1], [this.eyeR, -1]]) {
      const b = new THREE.Mesh(browGeo, browMat);
      b.scale.set(eyeR * 1.9, eyeR * 0.44, eyeR * 0.3);
      b.position.set(eyeR * 0.30, s * eyeR * 0.95, R * 0.60 + eyeR * 0.55);
      b.rotation.z = -s * 0.44;
      b.userData.noInk = true;
      e.add(b);
    }

    this.faceGroup = new THREE.Group();
    g.userData.face = this.faceGroup;

    inkAll(g, 0.052);
    g.userData.ownsGeometry = false;
  }

  /**
   * SPLIT INTO THREE. The original becomes the middle instalment (mass halved), and two
   * siblings fan out at ±17°. Total mass is deliberately MORE than the original — three
   * small hits spread across a structure beat one big hit in the middle, which is the
   * entire point of the joke and the entire reason to use the ability.
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
      const child = new SipArrow({
        x: p.x + Math.cos(a) * 0.55,
        y: p.y + Math.sin(a) * 0.55,
        radius: 0.27,
        generation: this.splitGeneration + 1,
      });
      child.trail = this.trail;
      child.launch(Math.cos(a) * sp * 1.02, Math.sin(a) * sp * 1.02);
      child.hasHit = false;
      child.abilityUsed = true;
    }

    // The parent shrinks to match — visually obvious that one became three.
    this.mesh.scale.setScalar(0.68);
    this.body.setLinvel({ x: Math.cos(ang) * sp * 1.02, y: Math.sin(ang) * sp * 1.02, z: 0 }, true);
    return true;
  }

  update(dt) {
    super.update(dt);
    if (this.dead) return;
    // Keep the face upright-ish while the body spins after impact, so we never see the
    // back of the eyeballs. Cheap, and it is the difference between a character and a rock.
    if (this.hasHit && this.eyeL) {
      const r = this.body.rotation();
      const zAng = Math.atan2(2 * (r.w * r.z), 1 - 2 * r.z * r.z);
      const k = Math.max(-0.9, Math.min(0.9, -zAng * 0.35));
      this.eyeL.rotation.z = k; this.eyeR.rotation.z = k;
    }
    // Blink on a deterministic cycle.
    if (this.eyeL) {
      const t = (world.simTime * 0.7 + this.id * 0.37) % 1;
      const open = t > 0.965 ? 0.08 : 1;
      this.eyeL.userData.setOpen(open);
      this.eyeR.userData.setOpen(open);
    }
  }
}

/** Ammo registry. Level JSON refers to types by id. */
export const AMMO_TYPES = { sip: SipArrow };
