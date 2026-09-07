/**
 * villains/lotteryUncle.js — LOTTERY UNCLE.  Villain #1.
 *
 * "Beta, you have WON ₹50 lakh! Only ₹5,000 processing fee!"
 *
 * Design notes (silhouette first):
 *   · a pear — wide at the bottom, narrow at the top. Reads as "smug seated man" at 40px.
 *   · the moustache is the logo. Enormous, black, curled up at the ends. If you can only
 *     see one detail, it must be the moustache.
 *   · a lopsided gold-rimmed cap, because he thinks he's a big man.
 *   · a giant novelty cheque tucked under one arm — a real physics prop that flies off
 *     when he dies. The prop IS the joke.
 *   · the mouth is a separate mesh that swaps between smug / oh-no / dead.
 */

import * as THREE from 'three';
import { Villain } from './base.js';
import { mat, PALETTE } from '../art/materials.js';
import { RAMP_SOFT, RAMP_STD, RAMP_HARD, inkAll, makeEye, inkFlat, creamFlat, ink } from '../art/toon.js';
import { Entity, makeBody, shapes } from '../level/entity.js';
import { world } from '../world.js';
import { emit } from '../events.js';
import { rngRange, rngJitter } from '../rng.js';

const C = {};
const geo = (k, make) => { if (!C[k]) C[k] = make(); return C[k]; };

const SKIN = 0xe8ab74;
const SKIN_DARK = 0x8a5a2f;
const KURTA = 0xe0663f;

export class LotteryUncle extends Villain {
  static id = 'lotteryUncle';
  static label = 'Lottery Uncle';
  static fact = 'No real lottery ever asks you to pay a fee to collect your winnings.';

  constructor(o = {}) {
    super({ radius: 0.54, matName: 'villain', ...o });
    this.cheque = null;
  }

  buildMesh(g) {
    const R = this.radius ?? 0.54;

    /**
     * PROPORTIONS. The collider is a ball of radius R, and the temptation is to make the
     * visual a ball of radius R — which buries the head inside the belly and leaves a
     * featureless orange circle with eyes floating on it. So: the BELLY is a squat ellipsoid
     * sitting low in the collider, and the HEAD rides on top of it, mostly clear of it.
     * The silhouette then reads as "smug seated man" rather than "orange ball".
     */

    // ---------------- belly ---------------------------------------------------
    const bodyMat = mat('villain', { color: KURTA }).three;
    const body = new THREE.Mesh(geo('uBody', () => new THREE.SphereGeometry(1, 26, 18)), bodyMat);
    body.scale.set(R * 1.00, R * 0.84, R * 0.88);
    body.position.y = -R * 0.26;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // collar: a cream band where the kurta meets the neck
    const collar = new THREE.Mesh(geo('uCollar', () => new THREE.CylinderGeometry(1, 1, 0.18, 18)),
      new THREE.MeshToonMaterial({ color: 0xf7ead2, gradientMap: RAMP_STD() }));
    collar.scale.set(R * 0.44, R * 1.0, R * 0.44);
    collar.position.set(0, R * 0.34, R * 0.06);
    g.add(collar);

    // ---------------- head ----------------------------------------------------
    const skinMat = new THREE.MeshToonMaterial({
      color: SKIN, gradientMap: RAMP_SOFT(),
      emissive: new THREE.Color(SKIN_DARK), emissiveIntensity: 0.14,
    });
    const head = new THREE.Mesh(geo('uHead', () => new THREE.SphereGeometry(1, 26, 18)), skinMat);
    head.scale.set(R * 0.64, R * 0.60, R * 0.60);
    head.position.set(0, R * 0.80, 0);
    head.castShadow = true;
    g.add(head);
    this.head = head;

    const face = new THREE.Group();
    face.position.copy(head.position);
    g.add(face);
    this.face = face;

    // ---------------- ears ----------------------------------------------------
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(geo('uEar', () => new THREE.SphereGeometry(1, 12, 10)), skinMat);
      ear.scale.set(R * 0.13, R * 0.17, R * 0.09);
      ear.position.set(s * R * 0.62, R * 0.78, 0);
      g.add(ear);
    }

    // ---------------- eyes: big, close-set, permanently delighted --------------
    const eyeR = R * 0.235;
    const eL = makeEye(eyeR, R * 0.44);
    const eR = makeEye(eyeR, R * 0.44);
    eL.position.set(-R * 0.24, R * 0.08, 0);
    eR.position.set(R * 0.24, R * 0.08, 0);
    face.add(eL, eR);
    this.eyes = [eL, eR];

    // heavy uncle brows, angled into a hustle
    const browMat = inkFlat(0x241a12);
    for (const [e, s] of [[eL, -1], [eR, 1]]) {
      const b = new THREE.Mesh(geo('uBrow', () => new THREE.BoxGeometry(1, 1, 1)), browMat);
      b.scale.set(eyeR * 2.3, eyeR * 0.46, eyeR * 0.30);
      b.position.set(0, eyeR * 1.30, R * 0.44 + eyeR * 0.55);
      b.rotation.z = s * 0.34;
      b.userData.noInk = true;
      e.add(b);
      e.userData.brow = b;
    }

    // ---------------- nose ----------------------------------------------------
    const nose = new THREE.Mesh(geo('uNose', () => new THREE.SphereGeometry(1, 12, 10)), skinMat);
    nose.scale.set(R * 0.10, R * 0.12, R * 0.12);
    nose.position.set(0, -R * 0.06, R * 0.50);
    nose.userData.noInk = true;
    face.add(nose);

    /**
     * ---------------- THE MOUSTACHE ----------------------------------------
     * The logo. Built from a flattened bar plus two curled-up tips rather than torus arcs:
     * arcs look like sideburns from anywhere except dead-on, and this character is nearly
     * always seen small and slightly off-axis. A bar-with-tips reads as a moustache at 40px.
     */
    // It must stay INSIDE the head's silhouette. A moustache wider than the face does not
    // read as a moustache — it reads as a bob haircut, which is what the first version did.
    // Head half-width is 0.64R, so the whole assembly spans ±0.36R and no further.
    const mous = new THREE.Group();
    mous.position.set(0, -R * 0.235, R * 0.46);
    const mMat = new THREE.MeshToonMaterial({ color: 0x1d1209, gradientMap: RAMP_HARD() });
    const bar = new THREE.Mesh(geo('uMousBar', () => new THREE.SphereGeometry(1, 16, 10)), mMat);
    bar.scale.set(R * 0.27, R * 0.095, R * 0.10);
    bar.castShadow = true;
    bar.userData.noInk = true;
    mous.add(bar);
    for (const s of [1, -1]) {
      const tip = new THREE.Mesh(geo('uMousTip', () => new THREE.SphereGeometry(1, 12, 9)), mMat);
      tip.scale.set(R * 0.070, R * 0.125, R * 0.085);
      tip.position.set(s * R * 0.255, R * 0.058, 0);
      tip.rotation.z = -s * 0.62;
      tip.userData.noInk = true;
      mous.add(tip);
      const curl = new THREE.Mesh(geo('uMousCurl', () => new THREE.SphereGeometry(1, 10, 8)), mMat);
      curl.scale.setScalar(R * 0.058);
      curl.position.set(s * R * 0.305, R * 0.135, 0);
      curl.userData.noInk = true;
      mous.add(curl);
    }
    face.add(mous);
    this.moustache = mous;

    // ---------------- mouth (swappable smug / oh-no) --------------------------
    const mouthSmug = new THREE.Mesh(
      geo('uMouthSmug', () => new THREE.TorusGeometry(1, 0.24, 6, 16, Math.PI * 0.8)),
      inkFlat(0x51160f));
    mouthSmug.scale.setScalar(R * 0.17);
    mouthSmug.position.set(0, -R * 0.34, R * 0.46);
    mouthSmug.rotation.z = Math.PI;
    mouthSmug.userData.noInk = true;
    face.add(mouthSmug);

    const mouthOh = new THREE.Mesh(geo('uMouthOh', () => new THREE.SphereGeometry(1, 12, 10)),
      inkFlat(0x51160f));
    mouthOh.scale.set(R * 0.14, R * 0.19, R * 0.07);
    mouthOh.position.set(0, -R * 0.36, R * 0.47);
    mouthOh.visible = false;
    mouthOh.userData.noInk = true;
    face.add(mouthOh);
    this.mouthSmug = mouthSmug; this.mouthOh = mouthOh;

    // ---------------- cap: navy, gold band, worn at a chancer's angle ---------
    const cap = new THREE.Group();
    const dome = new THREE.Mesh(
      geo('uCap', () => new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      new THREE.MeshToonMaterial({ color: PALETTE.navy, gradientMap: RAMP_STD() }));
    dome.scale.set(R * 0.60, R * 0.44, R * 0.58);
    dome.castShadow = true;
    cap.add(dome);
    const band = new THREE.Mesh(geo('uCapBand', () => new THREE.CylinderGeometry(1, 1, 0.12, 20)),
      new THREE.MeshToonMaterial({ color: PALETTE.gold, gradientMap: RAMP_HARD() }));
    band.scale.set(R * 0.615, R * 1.0, R * 0.60);
    band.position.y = R * 0.03;
    cap.add(band);
    const peak = new THREE.Mesh(geo('uPeak', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI)),
      new THREE.MeshToonMaterial({ color: 0x122a45, gradientMap: RAMP_HARD() }));
    peak.scale.set(R * 0.50, R * 0.07, R * 0.34);
    peak.position.set(0, R * 0.05, R * 0.36);
    peak.rotation.x = -0.10;
    cap.add(peak);
    cap.position.set(0, R * 1.23, 0);
    cap.rotation.z = 0.16;
    g.add(cap);
    this.cap = cap;

    // ---------------- arms: one on the hip, one holding the cheque out --------
    const armGeo = geo('uArm', () => new THREE.CapsuleGeometry(1, 1.2, 5, 12));
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.scale.setScalar(R * 0.155);
    armL.position.set(-R * 0.80, -R * 0.30, R * 0.30);
    armL.rotation.z = 0.95;
    armL.castShadow = true;
    g.add(armL);

    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.scale.setScalar(R * 0.155);
    armR.position.set(R * 0.72, -R * 0.16, R * 0.44);
    armR.rotation.z = -1.25;
    armR.castShadow = true;
    g.add(armR);

    /**
     * ---------------- THE NOVELTY CHEQUE ----------------------------------
     * Held out in front, big enough to read, and a REAL rigid body the moment he dies.
     * The prop is the joke; if it is tucked behind the belly where you cannot see it, the
     * character is just an orange ball in a hat.
     */
    const chq = new THREE.Group();
    const card = new THREE.Mesh(geo('uChq', () => new THREE.BoxGeometry(1, 1, 1)),
      new THREE.MeshToonMaterial({ color: PALETTE.cream, gradientMap: RAMP_HARD() }));
    card.scale.set(R * 1.30, R * 0.72, R * 0.07);
    card.castShadow = true;
    chq.add(card);
    const lineMat = inkFlat(0x2b5f86);
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(geo('uChqLine', () => new THREE.BoxGeometry(1, 1, 1)), lineMat);
      l.scale.set(R * (0.86 - i * 0.20), R * 0.050, R * 0.02);
      l.position.set(-R * (0.16 + i * 0.08), R * (0.17 - i * 0.15), R * 0.05);
      l.userData.noInk = true;
      chq.add(l);
    }
    const amt = new THREE.Mesh(geo('uChqAmt', () => new THREE.BoxGeometry(1, 1, 1)),
      new THREE.MeshBasicMaterial({ color: PALETTE.coral, toneMapped: false }));
    amt.scale.set(R * 0.46, R * 0.15, R * 0.02);
    amt.position.set(R * 0.34, -R * 0.16, R * 0.05);
    amt.userData.noInk = true;
    chq.add(amt);
    chq.position.set(R * 0.52, -R * 0.44, R * 0.72);
    chq.rotation.z = -0.20;
    g.add(chq);
    this.chequeMesh = chq;

    // Thinner ink than the blocks get: this is a small object made of many small parts, and
    // a 0.05 outline on a 0.06R curl turns the whole face into a black smudge.
    inkAll(g, 0.036);
  }

  onIdle(dt, alarm) {
    const t = world.simTime;
    // smug ↔ oh-no
    const scared = alarm > 0.28;
    this.mouthSmug.visible = !scared;
    this.mouthOh.visible = scared;
    if (scared) {
      const w = 1 + Math.sin(t * 26) * 0.18;
      this.mouthOh.scale.set(this.radius * 0.14 * w, this.radius * 0.22 * w, this.radius * 0.07);
    }
    // brows lift when scared
    for (const e of this.eyes) {
      if (e.userData.brow) e.userData.brow.position.y = this.radius * 0.235 * (1.30 + alarm * 0.9);
    }
    // the cap wobbles; the moustache twitches
    this.cap.rotation.z = 0.16 + Math.sin(t * 3.1 + this.bobPhase) * 0.05 + alarm * 0.25;
    this.moustache.rotation.z = Math.sin(t * 4.3 + this.bobPhase) * 0.045;
    this.chequeMesh.rotation.z = -0.20 + Math.sin(t * 2.2 + this.bobPhase) * 0.07;
    // hurt flash: go pale for a few ticks
    if (this.hurtFlash > 0) {
      this.mesh.scale.multiplyScalar(1 + this.hurtFlash * 0.010);
    }
  }

  /**
   * The cheque detaches and becomes a real, falling, tumbling physics prop. This is the
   * single funniest frame in the level and it costs one rigid body.
   */
  onDeath(point) {
    const R = this.radius;
    const m = mat('prop', { color: PALETTE.cream });
    const { body, collider } = makeBody({
      kind: 'dynamic',
      x: point.x + R * 0.52, y: point.y - R * 0.30, rot: -0.20, m,
      shape: shapes.box(R * 1.30, R * 0.72, R * 0.5),
      // Explicit, and it is not a leftover literal: this is a sheet of PAPER, so it keeps a
      // damping far above the prop material's 0.030. Air drag on a cheque is the joke — it
      // has to flutter down after the villain has gone, not drop like the block it is made
      // of. Everything else in the game takes its damping from art/materials.js.
      linearDamping: 0.55, angularDamping: 0.6, contactForce: 20,
    });
    const g = this.chequeMesh;
    g.position.set(0, 0, 0);
    g.rotation.set(0, 0, 0);
    this.mesh.remove(g);
    world.scene.add(g);
    const e = new Entity({ mesh: g, body, collider, material: m, tag: 'prop' });
    e.update = function () {
      if (!this.body) return;
      const t = this.body.translation();
      if (t.y < -8) this.destroy();
    };
    body.setLinvel({ x: rngRange(-2.5, 3.5), y: rngRange(3.5, 7.0), z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: rngRange(-9, 9) }, true);
    this.chequeMesh = null;
  }
}

export const VILLAIN_TYPES = { lotteryUncle: LotteryUncle };
