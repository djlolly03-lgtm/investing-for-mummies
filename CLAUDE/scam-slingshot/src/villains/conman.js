/**
 * villains/conman.js — THE CON MAN. One character, three scams.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The three villains were built on a doctrine stated in `objectFace.js`: the OBJECT is the
 * character. So l1 is a cheque with eyes, l2 is a credit card with eyes, and l3's boss is a
 * pyramid chart with eyes. That doctrine names the scam superbly — you can tell which scam a
 * level teaches from its silhouette alone — and it is why every prop in this file's callers
 * survives unchanged.
 *
 * What it never did was put a CROOK on screen. Photographed at 8x (`_tools/scenarios/
 * villain-zoom.mjs`), the cast reads as: a card, a cheque, a chart, and one genuinely
 * worried-looking man. A player put it against the right benchmark — the Angry Birds pig,
 * which you read as the enemy in one glance and at any size — and asked for a figure that is
 * "easily identifiable as something wrong".
 *
 * So this is the pig. One con man, reused across all three levels, and what changes level to
 * level is the PROP HE IS HOLDING, exactly as the pig keeps its helmet and its moustache. The
 * scam stays named by the prop; the villain finally looks like a villain.
 *
 * ── WHAT IS MEASURED HERE AND MUST NOT BE CASUALLY RETUNED ───────────────────
 * The body proportions are lifted verbatim from `ponziPyramid.js`'s downline, which is the
 * one figure in this game that was built against the rubric and photographed. Its docblocks
 * record two failures that cost real time, and both are re-stated at the point of use below:
 *   · a head the same radius as the belly draws its chin behind the body;
 *   · hair modelled as a shell AROUND the face draws a black ring and reads as a helmet.
 *
 * ── THE ONE TRAP THIS FILE IS WRITTEN TO STOP YOU REPEATING ──────────────────
 * AN EYEBALL IS A SPHERE, SO A FACIAL OVERLAY MUST CLEAR ITS RADIUS, NOT ITS CENTRE.
 * `eyeZ` is where the eye is CENTRED; the front of it is a whole `eyeR` further forward.
 * Sunglasses placed just past `eyeZ` are buried inside the eyeball and render as a pair of
 * thin rings — wire spectacles — with the white of the eye showing through the middle. That
 * bug was hit twice in one session, on two different characters, before it was named. Every
 * z below is written as `eyeZ + eyeR + clearance` for exactly this reason.
 *
 * ── AND THE SECOND TRAP ──────────────────────────────────────────────────────
 * SHADES ARE LENSES AND TEMPLE ARMS, NEVER ONE WIDE BAR. base.js requires a reaction to break
 * the head OUTLINE, and the head's half-width is 0.60 R, so the eyewear has to reach past
 * that. Done as a single rectangle wide enough to do it, it stops being glasses and becomes a
 * black slab across the whole face — tried, photographed, discarded. Two small lenses joined
 * by a bridge, with THIN arms running out to 0.74 R, breaks the silhouette and still reads as
 * eyewear at 40 px.
 */

import * as THREE from 'three';
import { mat } from '../art/materials.js';
import { RAMP_SOFT, RAMP_STD, RAMP_HARD, makeEye, inkFlat, creamFlat } from '../art/toon.js';

// One geometry cache for the whole cast: every con man in a level shares these.
const C = {};
const geo = (k, make) => { if (!C[k]) C[k] = make(); return C[k]; };

export const CONMAN = {
  skin:     0xf0bf90,
  skinDark: 0x8a5a2f,
  hair:     0x14100c,
  cream:    0xfdf6ec,
  /** Suit. Darker and cooler than the downline's purple: this man is selling, not buying. */
  cloth:    0x33304a,
  lens:     0x10151d,
  rim:      0x2b3442,
  gold:     0xf6c453,
};

/**
 * Build the figure into `g`, in the villain's local space, with its feet at -1.00 R and its
 * hair crown near 1.94 R — the collider's own extent, so he neither floats nor sinks.
 *
 * @param {THREE.Group} g      the villain's mesh root
 * @param {number}      R      the villain's radius, in world units
 * @param {object}      opts
 *   cloth  suit colour; default CONMAN.cloth
 *   gold   whether he wears gold (a tooth). The rank cue: a boss has it, a foot soldier
 *          does not, which is how two figures that differ only in trim read as one outfit.
 * @returns {{headG, face, head, hair, seat, belly, eyes, brows, mouths, shades}}
 */
export function buildConman(g, R, { cloth = CONMAN.cloth, gold = true } = {}) {
  const bodyMat = mat('villain', { color: cloth }).three;

  // ---------------- the seated flare — where "heavy" comes from --------------
  const seat = new THREE.Mesh(geo('cSeat', () => new THREE.SphereGeometry(1, 22, 12)), bodyMat);
  seat.scale.set(R * 0.90, R * 0.34, R * 0.74);
  seat.position.y = -R * 0.64;
  seat.castShadow = true; seat.receiveShadow = true;
  g.add(seat);

  // ---------------- belly (the part base.js breathes) -----------------------
  const belly = new THREE.Mesh(geo('cBody', () => new THREE.SphereGeometry(1, 24, 16)), bodyMat);
  belly.scale.set(R * 0.84, R * 0.80, R * 0.74);
  belly.position.y = -R * 0.24;
  belly.castShadow = true; belly.receiveShadow = true;
  g.add(belly);

  /**
   * THE LAPEL V AND THE COLLAR. Two bright shapes doing one job: keeping a dark body and a
   * light head from reading as a single mass. The V also gives the chest an internal
   * direction, which is the cheapest way to make a sphere read as a torso.
   */
  const lapel = new THREE.Mesh(
    geo('cLapel', () => new THREE.ConeGeometry(1, 1, 3)),
    new THREE.MeshToonMaterial({ color: CONMAN.cream, gradientMap: RAMP_STD() }));
  lapel.scale.set(R * 0.34, R * 0.46, R * 0.18);
  lapel.position.set(0, R * 0.12, R * 0.62);
  lapel.rotation.z = Math.PI;                 // point down: a shirt front, not a bib
  lapel.userData.noInk = true;
  g.add(lapel);

  const collar = new THREE.Mesh(
    geo('cCollar', () => new THREE.CylinderGeometry(0.62, 1, 0.20, 16)),
    new THREE.MeshToonMaterial({ color: CONMAN.cream, gradientMap: RAMP_STD() }));
  collar.scale.set(R * 0.52, R * 1.70, R * 0.52);
  collar.position.set(0, R * 0.50, 0);
  g.add(collar);

  // ---------------- head group: head, hair, shades and face bob together ----
  const headG = new THREE.Group();
  g.add(headG);

  const skinMat = new THREE.MeshToonMaterial({
    color: CONMAN.skin, gradientMap: RAMP_SOFT(),
    emissive: new THREE.Color(CONMAN.skinDark), emissiveIntensity: 0.14,
  });
  // The head sits CLEAR ABOVE the belly, not inside it: a head the same radius as the body
  // has its chin drawn over by the belly's front face. That mistake is already in this
  // codebase's history twice (lotteryUncle, then the downline) — do not make it a third time.
  const head = new THREE.Mesh(geo('cHead', () => new THREE.SphereGeometry(1, 24, 16)), skinMat);
  head.scale.set(R * 0.60, R * 0.66, R * 0.56);
  head.position.set(0, R * 1.24, 0);
  head.castShadow = true;
  headG.add(head);

  const face = new THREE.Group();
  face.position.set(0, R * 1.24, 0);
  headG.add(face);

  /**
   * HAIR: A CAP ON THE CROWN, NOT A SHELL AROUND THE FACE. A hemisphere a hair-width wider
   * than the skull (0.63 R against 0.60 R), sat high and pushed back, caps the crown and
   * leaves the whole forehead and both temples in skin — which is where the brows live. The
   * failure mode in the other direction is a full shell, which draws a black ring right round
   * the face and turns the character bald-in-a-helmet.
   */
  const hair = new THREE.Mesh(
    geo('cHair', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.50)),
    new THREE.MeshToonMaterial({ color: CONMAN.hair, gradientMap: RAMP_HARD() }));
  hair.scale.set(R * 0.66, R * 0.54, R * 0.62);
  hair.position.set(0, R * 1.36, -R * 0.06);
  hair.rotation.x = -0.30;
  hair.castShadow = true;
  headG.add(hair);

  /**
   * THE WIDOW'S PEAK. The one addition to the downline's head, and it is a SILHOUETTE cue
   * rather than a detail: a small dark wedge dropping onto the forehead gives this character
   * a pointed top-of-head profile that no block, no prop and no other villain in the game
   * shares. Silhouette is the only channel that survives the 40 px test, so the character's
   * identity has to live there rather than in the face.
   */
  const peak = new THREE.Mesh(
    geo('cPeak', () => new THREE.ConeGeometry(1, 1, 3)),
    new THREE.MeshToonMaterial({ color: CONMAN.hair, gradientMap: RAMP_HARD() }));
  peak.scale.set(R * 0.17, R * 0.22, R * 0.10);
  peak.position.set(0, R * 1.44, R * 0.40);
  peak.rotation.z = Math.PI;                  // apex pointing DOWN the forehead
  headG.add(peak);

  // ---------------- eyes ----------------------------------------------------
  const eyeR = R * 0.205;
  const eyeZ = R * 0.37;
  const eyes = [];
  for (const sgn of [-1, 1]) {
    const e = makeEye(eyeR, eyeZ);
    e.position.set(sgn * R * 0.25, -R * 0.02, 0);
    face.add(e);
    eyes.push(e);
  }

  // Brows angled into a pitch, children of the eye so they travel with it — base.js scales
  // the eye's WHITE rather than the group precisely so that is safe.
  const browMat = inkFlat(0x211a2c);
  const brows = [];
  for (let i = 0; i < 2; i++) {
    const sgn = i === 0 ? -1 : 1;
    const brow = new THREE.Mesh(geo('cBrow', () => new THREE.BoxGeometry(1, 1, 1)), browMat);
    brow.scale.set(eyeR * 1.70, eyeR * 0.36, R * 0.03);
    brow.position.set(0, eyeR * 1.16, eyeR * 0.92);
    brow.rotation.z = sgn * -0.30;            // inner ends DOWN: a pitch, i.e. a hard sell
    brow.userData.side = sgn;
    eyes[i].add(brow);
    brows.push(brow);
  }

  /**
   * ── THE SHADES ────────────────────────────────────────────────────────────
   * Lenses + bridge + thin temple arms. See the two traps in this file's header: the z must
   * clear the EYEBALL'S RADIUS, and this must never become one wide bar.
   *
   * Worn, they delete the eyes — and the eyes are where all four of base.js's face states
   * live. That is the point: the caller registers this group with `poseable()` so it SLIPS on
   * alarm, and the panicked eyes he was hiding are suddenly on show. Cool crook to caught
   * crook, for the cost of one snapped translation, and the reaction ends up bigger than the
   * bare-eyed version it replaces rather than smaller.
   */
  const shades = new THREE.Group();
  const lensMat = inkFlat(CONMAN.lens);
  const rimMat = inkFlat(CONMAN.rim);
  const LENS_W = R * 0.21, LENS_H = R * 0.15;
  for (const sgn of [-1, 1]) {
    const lens = new THREE.Mesh(geo('cLens', () => new THREE.BoxGeometry(1, 1, 1)), lensMat);
    lens.scale.set(LENS_W * 2, LENS_H * 2, R * 0.03);
    lens.position.set(sgn * R * 0.25, 0, 0);
    lens.userData.noInk = true;
    shades.add(lens);

    // the temple arm: THIN, and this is what breaks the head outline base.js asks for
    const arm = new THREE.Mesh(geo('cArm', () => new THREE.BoxGeometry(1, 1, 1)), rimMat);
    arm.scale.set(R * 0.30, R * 0.045, R * 0.03);
    arm.position.set(sgn * R * 0.60, R * 0.03, -R * 0.02);
    arm.userData.noInk = true;
    shades.add(arm);
  }
  const bridge = new THREE.Mesh(geo('cBridge', () => new THREE.BoxGeometry(1, 1, 1)), rimMat);
  bridge.scale.set(R * 0.12, R * 0.04, R * 0.03);
  bridge.userData.noInk = true;
  shades.add(bridge);

  // one cold highlight, so a lens reads as glass rather than as a hole cut in his face
  const glint = new THREE.Mesh(geo('cGlint', () => new THREE.BoxGeometry(1, 1, 1)),
    inkFlat(0x7b8b9c));
  glint.scale.set(R * 0.07, R * 0.045, R * 0.01);
  glint.position.set(-R * 0.31, R * 0.04, R * 0.02);
  glint.userData.noInk = true;
  shades.add(glint);

  // THE Z THAT MATTERS. See the header: past the eyeball's FRONT, not its centre.
  shades.position.set(0, -R * 0.02, eyeZ + eyeR + R * 0.04);
  face.add(shades);

  /**
   * ── THE GRIN ──────────────────────────────────────────────────────────────
   * Wide, asymmetric, and showing teeth. A symmetric crescent is a friendly smile; rotating
   * it and pushing it off centre is the whole difference between a grin and a man who knows
   * something you do not. The gold tooth is the rank cue and the only saturated colour on the
   * character, so it is also where the eye lands after the shades.
   */
  const lip = inkFlat(0x3d1030);
  const mouth = new THREE.Group();
  // the open mouth: a solid dark slab, wide and tilted, so it reads as a grin at 40 px
  // An OVAL, not a box. A rectangle this size stops reading as a mouth and starts reading as
  // a label stuck to his chin — the shape has to be organic even when everything else here is
  // a primitive, because a mouth is the one part of a face nobody accepts as square.
  const gape = new THREE.Mesh(geo('cGape', () => new THREE.SphereGeometry(1, 16, 12)), lip);
  gape.scale.set(R * 0.21, R * 0.105, R * 0.03);
  gape.userData.noInk = true;
  mouth.add(gape);

  const teeth = new THREE.Mesh(geo('cTeeth', () => new THREE.BoxGeometry(1, 1, 1)), creamFlat());
  teeth.scale.set(R * 0.175, R * 0.036, R * 0.02);
  teeth.position.set(0, R * 0.040, R * 0.020);
  teeth.userData.noInk = true;
  mouth.add(teeth);

  if (gold) {
    const tooth = new THREE.Mesh(geo('cGold', () => new THREE.BoxGeometry(1, 1, 1)),
      inkFlat(CONMAN.gold));
    tooth.scale.set(R * 0.030, R * 0.036, R * 0.022);
    tooth.position.set(R * 0.115, R * 0.040, R * 0.026);
    tooth.userData.noInk = true;
    mouth.add(tooth);
  }
  // Off centre and tilted: the whole difference between a smile and a man who knows something
  // you do not. And FAR enough forward to clear the skull at this height — see the eye trap.
  mouth.position.set(R * 0.06, -R * 0.36, R * 0.50);
  mouth.rotation.z = -0.13;
  face.add(mouth);

  /**
   * ── THE ARMS, AND THE HAND THE SCAM HANGS FROM ────────────────────────────
   * The whole reason this character exists is that he HOLDS the scam rather than being it, so
   * the arms are structural, not decoration: `handAnchor` is where the caller mounts the
   * cheque, the card or the chart, and it sits in FRONT of the body in z so a wide prop draws
   * over the torso instead of intersecting it.
   *
   * They are also what `onIdle` animates in the ponzi module — a counter-phase tremble that
   * stops a row of identical figures reading as furniture — so both arms are returned.
   */
  const armMat = mat('villain', { color: cloth }).three;
  const arms = {};
  for (const sgn of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sgn * R * 0.74, -R * 0.06, R * 0.26);
    const limb = new THREE.Mesh(
      geo('cArmLimb', () => new THREE.CapsuleGeometry(1, 1.5, 4, 10)), armMat);
    limb.scale.set(R * 0.13, R * 0.30, R * 0.13);
    limb.rotation.z = sgn * 0.30;
    limb.position.set(sgn * -R * 0.02, -R * 0.22, 0);
    limb.castShadow = true;
    arm.add(limb);

    const hand = new THREE.Mesh(geo('cHand', () => new THREE.SphereGeometry(1, 12, 10)),
      new THREE.MeshToonMaterial({
        color: CONMAN.skin, gradientMap: RAMP_SOFT(),
        emissive: new THREE.Color(CONMAN.skinDark), emissiveIntensity: 0.14,
      }));
    hand.scale.setScalar(R * 0.15);
    hand.position.set(sgn * -R * 0.14, -R * 0.50, R * 0.10);
    arm.add(hand);

    g.add(arm);
    arms[sgn < 0 ? 'armL' : 'armR'] = arm;
  }

  // Where a prop mounts: between the hands, proud of the chest.
  const handAnchor = new THREE.Group();
  handAnchor.position.set(0, -R * 0.30, R * 0.78);
  g.add(handAnchor);

  return { headG, face, head, hair, peak, seat, belly, eyes, brows, shades, mouth,
           armL: arms.armL, armR: arms.armR, handAnchor };
}
