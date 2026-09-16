/**
 * villains/objectFace.js — THE SHARED FACE KIT FOR THE SCAM-OBJECT CAST.
 *
 * ── WHY THE CAST STOPPED BEING PEOPLE ────────────────────────────────────────
 * The first cast was three small humanoid figures. The owner played the preview and said the
 * villains were not right, and there are three reasons that is a design fault rather than a
 * taste one:
 *
 *  1. A HUMAN FIGURE HAS NO SILHOUETTE AT THE SIZE THIS GAME IS PLAYED AT. Measured on the
 *     real framing at 390x844, a villain occupies 25 x 30 CSS px, and the whole head is about
 *     7 px of that. Everything that makes a person a person — the face, the hands, the
 *     costume — lands between 1 and 3 px. What survived was the PROP: a rectangle, a strip,
 *     a triangle. The props were doing all the work, so the props became the characters.
 *  2. HITTING PEOPLE IS OFF-MESSAGE FOR IFM. The lesson is "these offers are traps", not
 *     "these people are bad". Demolish the PITCH, never the person.
 *  3. THE OWNER'S OWN GAME ALREADY WORKS THIS WAY. In "Slash the Scam" you slice the offer.
 *     A student arriving from that game already knows the grammar.
 *
 * So every villain is now the scam ARTEFACT, with a face on it: a cheque, a credit card, a
 * pyramid chart. One exception, and it is deliberate — chapter 3 keeps its ARMS-UP RECRUITS
 * as human figures, because "the people at the bottom are holding up the man at the top" is
 * the entire Ponzi lesson and it cannot be said by an object.
 *
 * ── WHAT THIS MODULE IS FOR ──────────────────────────────────────────────────
 * Three characters need the same four mouths, the same kind of oversized googly eye and the
 * same eased guard channel. Writing that three times is three chances for the cast to drift
 * apart, and a cast that drifts apart at 25 px reads as three unrelated art styles. So the
 * pieces that are genuinely identical live here, parameterised by SIZE and COLOUR only:
 *
 *   makeGoogly(r, opts)   one eye + one chunky brow, sized for an object rather than a head
 *   makeMouths(s, opts)   the four mouths base.js's face state machine switches between
 *   flinch(v, dt, snap)   the eased 0..1 guard blend for channels poseable() cannot drive
 *   ease(k)               smootherstep, the same curve poseable() uses
 *
 * Everything else — proportions, bands, props, the crush and the death gag — is per
 * character and stays in the character's own file, because that is where the arithmetic
 * belongs.
 *
 * ── THE ONE RULE THIS MODULE EXISTS TO ENFORCE ───────────────────────────────
 * FACE FEATURES ON AN OBJECT ARE BIGGER THAN FACE FEATURES ON A PERSON, AND NOT BY A LITTLE.
 * A humanoid villain in this game carries eyes of radius 0.205-0.215 R — 2.6 px of eyeball on
 * a phone, which is why the brief says a reaction in the eyes is invisible and the reaction
 * has to be in the silhouette. An object is not carrying a head, so the eyes can be whatever
 * size the joke wants: the cast below uses 0.40-0.52 R, i.e. a 5-7 px eyeball, and brows
 * 6-7 px long. That is the difference between a face you can read and a face you can only
 * read in a screenshot. The numbers are checked per character against a measured capture, at
 * phone size, in each file's own header.
 */

import * as THREE from 'three';
import { RAMP_HARD, RAMP_STD, makeEye, inkFlat, creamFlat, discGeo, boxGeo } from '../art/toon.js';
import { PALETTE } from '../art/materials.js';

const C = new Map();
const geo = (k, make) => { if (!C.has(k)) C.set(k, make()); return C.get(k); };

/** Smootherstep — the same curve base.js's poseable() lerp uses, so the two agree. */
export function ease(k) {
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/**
 * THE GUARD CHANNEL FOR EVERYTHING poseable() CANNOT DRIVE.
 *
 * base.js's `poseable()` lerps a mesh's POSITION and its rotation about Z, and that covers
 * most of a flinch. It does not cover SCALE (a card hunching down and squashing wider) or
 * rotation about X (a jaw swinging forward out of the plane), and both of those are the
 * strongest silhouette moves an object has. So each character keeps one extra 0..1 blend,
 * stepped here.
 *
 * THREE PROPERTIES THIS HAS TO HAVE, and they are the reason it is not just a lerp:
 *  · IT RUNS ON THE FIXED STEP. It is called from `onIdle(dt)`, which base.js calls from
 *    `update()`, which is the fixed step. A filmstrip seeked to the same simulated instant
 *    therefore produces the same picture, which is the whole basis of this project's evidence.
 *  · IT USES THE SAME ENVELOPE AS poseable(). Linear ramp at 1/snap per second, then
 *    smootherstepped. If the scale channel eased on a different curve from the position
 *    channel the card would visibly slide against its own squash during the 90 ms the flinch
 *    takes, which reads as two objects rather than one.
 *  · IT SNAPS TO THE ENDPOINT. Same guard as poseable(): without it the blend asymptotes and
 *    a "released" character keeps a half-percent of flinch forever.
 */
export function flinch(v, dt, snap = 0.10) {
  const want = (v.faceState === 'alarmed' || v.faceState === 'braced') ? 1 : 0;
  const rate = 1 / Math.max(1e-3, snap);
  const k = v.__flinchK ?? 0;
  const step = rate * dt;
  v.__flinchK = Math.abs(want - k) < step ? want : k + (want > k ? step : -step);
  return ease(v.__flinchK);
}

let _flatWhite = null;
/** One shared unlit cream, so twelve eyeballs across a level cost one material. */
function flatWhite() {
  if (!_flatWhite) _flatWhite = creamFlat(0xfffaf0);
  return _flatWhite;
}

/**
 * ONE GOOGLY EYE, SIZED FOR AN OBJECT.
 *
 * `makeEye` from art/toon.js already builds the eyeball, the pupil and the glint, and
 * base.js's face state machine drives all three through `userData`. This adds the two things
 * an object's eye needs that a head's does not:
 *
 *  · A BROW HEAVY ENOUGH TO SEE. `add` is a multiple of the eye radius; at 1.70 x 0.40 on a
 *    0.52 R eye the brow is 0.88 R long, which is ~6 px on a phone. The humanoid cast's brows
 *    are 0.37 R — 2.5 px — and that is why their expression never survived the downscale.
 *    The brow is a CHILD of the eye: base.js scales the eye's WHITE rather than the group
 *    precisely so that is safe, and the brow then travels with the eye for free when the
 *    flinch pops the whole eye rig upward.
 *  · A RIM. An eyeball laid on a flat printed surface has nothing to sit in, so it reads as a
 *    sticker — the same failure scamIcon.js's treatment note describes for a photo icon on a
 *    toon prop. A thin dark disc a hair larger than the eyeball, parked just behind it, gives
 *    it a socket and a hard contour against whatever band it happens to be standing on.
 *
 * Returns `{ eye, brow }`; the caller positions `eye` and registers both with base.js.
 */
export function makeGoogly(r, { tilt = 0.34, side = 1, brow = 0x241a12, rim = true,
                               flat = true } = {}) {
  const eye = makeEye(r, r * 0.62);
  /**
   * THE EYEBALL IS UNLIT, AND ON AN OBJECT THAT IS NOT A SHORTCUT.
   * `makeEye` builds the white as a toon-shaded SPHERE, which is right on a head: the ramp
   * darkens its lower half and the eye sits in a socket. On a flat printed surface there is no
   * socket, so all that darkening does is turn a 5 px eyeball grey — photographed at the art
   * check the whites read as dirty pebbles, and value is the one thing this cast cannot spend.
   * Unlit cream, ringed by the dark rim below, gives the eye a hard bright disc at any size and
   * makes the pupil's contrast the highest on the character, which is where a face is read.
   */
  if (flat && eye.userData.white) eye.userData.white.material = flatWhite();
  /**
   * ONE DARK CONTOUR ROUND THE EYE, NEVER TWO.
   * `makeEye` already inks the white at 0.03, and the rim disc below is a second dark ring on
   * top of it. Measured on the 40 px crop that is 2 px of darkness round a 5 px eyeball: the
   * two eyes and their brows merged into a single dark mask and the character read as goggles
   * rather than as a face. So a rimmed eye takes a LIGHTER ink and an unrimmed one takes a
   * heavier one, and the caller picks by what the eye is standing on — rim it on a dark band,
   * ink it on a pale field.
   */
  if (eye.userData.white) eye.userData.white.userData.inkWidth = rim ? 0.022 : 0.046;
  if (rim) {
    const ring = new THREE.Mesh(discGeo(), inkFlat(0x1b2433));
    ring.scale.setScalar(r * 1.18);
    ring.position.z = r * 0.62 - r * 0.34;
    ring.userData.noInk = true;
    eye.add(ring);
  }
  const b = new THREE.Mesh(boxGeo(), inkFlat(brow));
  // 0.34 r thick, not 0.40, and the reason is the same merge: a brow resting ON a 5 px eyeball
  // adds its own darkness to the eye's contour, and the two together closed the white up.
  b.scale.set(r * 1.70, r * 0.34, r * 0.26);
  b.position.set(0, r * 1.18, r * 0.62 + r * 0.70);
  b.rotation.z = side * tilt;
  b.userData.noInk = true;
  b.userData.side = side;
  b.userData.eyeR = r;
  eye.add(b);
  return { eye, brow: b };
}

/**
 * THE FOUR MOUTHS, at a size in world units (`s` is the mouth's half-width, roughly).
 *
 * base.js switches between these by visibility on a face-state SNAP, so each one has to be
 * nameable on its own in a single still — "punctuation, not the sentence" is about how much
 * of the read they carry, not about how rough they can be.
 *
 *   idle      a wide upward crescent with a cream tooth strip and ONE GOLD TOOTH. The gold is
 *             the cast's signature: the same gold as every plaque rim, so "smug" is stated in
 *             the one language a 5 px mouth has, which is colour.
 *   alarmed   a deep oval cavity. The only mouth that is allowed to break the object's
 *             outline, and the characters that can afford to let it do so, do.
 *   braced    a gritted bar with cream teeth. Deliberately the SAME outline as idle: a braced
 *             mouth that changes the silhouette would compete with the flinch, which is where
 *             the braced read actually lives.
 *   defeated  asymmetric, downturned, rotated. A symmetric frown reads as a cartoon default;
 *             an asymmetric one reads as something that has just lost.
 *
 * `lip` and `gold` are per character so a cheque's mouth can be ink-on-paper and a credit
 * card's can be a hot slot in plastic.
 */
export function makeMouths(s, { lip = 0x51160f, gold = PALETTE.gold, teeth = true } = {}) {
  const lipMat = inkFlat(lip);

  // ---- IDLE: the smug grin -------------------------------------------------
  const idle = new THREE.Group();
  const crescent = new THREE.Mesh(
    geo('oMouthSmug', () => new THREE.TorusGeometry(1, 0.27, 6, 20, Math.PI * 0.94)), lipMat);
  crescent.scale.setScalar(s);
  crescent.rotation.z = Math.PI;
  crescent.userData.noInk = true;
  idle.add(crescent);
  if (teeth) {
    /**
     * THE TOOTH ROW HANGS FROM THE TOP LIP, WHICH IS WHERE TEETH ARE, AND IT IS WIDE.
     * Two captures went into these five numbers. The first row was a 1.22 x 0.27 s bar across
     * the MIDDLE of the crescent with a gold block beyond its end, and it read as a cigarette —
     * a mouth with a horizontal white line through it is a mouth holding something. Moving it
     * down and narrowing it made that worse, not better: at 0.94 s it is under half the mouth's
     * width, which reads as a plaster stuck on a lip.
     *
     * WHERE THE ROW ACTUALLY GOES IS ARITHMETIC, AND GUESSING IT COST TWO CAPTURES. The
     * crescent is `TorusGeometry(1, 0.27, .., PI*0.94)` turned by PI, so its arc runs round the
     * BOTTOM from (-1, 0) to (0.98, -0.19): the mouth's opening — the chord the teeth have to
     * sit inside — is at y = 0, not above it. Anything with a positive y is outside the mouth
     * altogether, which is exactly what "a cigarette" looked like. At y = -0.14 s the opening's
     * half-width is sqrt(0.73^2 - 0.14^2) = 0.72 s, so a row 1.34 s wide fills it edge to edge
     * with the gold tooth inside the row rather than beyond its end.
     */
    const strip = new THREE.Mesh(boxGeo(), creamFlat());
    strip.scale.set(s * 1.34, s * 0.32, s * 0.12);
    strip.position.set(0, -s * 0.14, s * 0.26);
    strip.userData.noInk = true;
    idle.add(strip);
    const tooth = new THREE.Mesh(boxGeo(),
      new THREE.MeshBasicMaterial({ color: gold, toneMapped: false }));
    tooth.scale.set(s * 0.24, s * 0.32, s * 0.12);
    tooth.position.set(-s * 0.46, -s * 0.14, s * 0.30);
    tooth.userData.noInk = true;
    idle.add(tooth);
    // ...and one dark gap between the two front teeth, so the row is a ROW at 3 px rather than
    // one bright block. It is the cheapest possible "this is a mouth" cue and it costs a mesh.
    const gap = new THREE.Mesh(boxGeo(), lipMat);
    gap.scale.set(s * 0.07, s * 0.32, s * 0.06);
    gap.position.set(s * 0.14, -s * 0.14, s * 0.33);
    gap.userData.noInk = true;
    idle.add(gap);
  }

  // ---- ALARMED: the cavity -------------------------------------------------
  const alarmed = new THREE.Mesh(
    geo('oMouthOh', () => new THREE.SphereGeometry(1, 14, 12)), lipMat);
  alarmed.scale.set(s * 0.86, s * 1.22, s * 0.42);
  alarmed.position.y = -s * 0.30;
  alarmed.userData.noInk = true;

  // ---- BRACED: gritted -----------------------------------------------------
  const braced = new THREE.Group();
  const gum = new THREE.Mesh(boxGeo(), lipMat);
  gum.scale.set(s * 1.70, s * 0.60, s * 0.30);
  gum.userData.noInk = true;
  braced.add(gum);
  for (let i = -1; i <= 1; i++) {
    const t = new THREE.Mesh(boxGeo(), creamFlat());
    t.scale.set(s * 0.34, s * 0.40, s * 0.14);
    t.position.set(i * s * 0.48, 0, s * 0.20);
    t.userData.noInk = true;
    braced.add(t);
  }

  // ---- DEFEATED: the asymmetric frown -------------------------------------
  const defeated = new THREE.Mesh(
    geo('oMouthSad', () => new THREE.TorusGeometry(1, 0.25, 6, 20, Math.PI * 0.78)), lipMat);
  defeated.scale.setScalar(s * 0.96);
  defeated.rotation.z = -0.30;
  defeated.position.set(-s * 0.22, -s * 0.12, 0);
  defeated.userData.noInk = true;

  return { idle, alarmed, braced, defeated };
}

/**
 * A hard value band, as real geometry rather than as texture.
 *
 * Two of the three characters need a band that is BRIGHTER or DARKER than the printed face
 * and that must survive being 2 px tall — a credit card's magstripe, a pyramid tier's gold
 * rail. A band drawn into the character's canvas is resampled by the GPU along with
 * everything else on it; a band that is its own unlit mesh standing 0.01 proud of the face is
 * not, so it still has a hard edge after the 40 px downscale. Use it for the two or three
 * bands that carry the read, and the canvas for everything else.
 */
export function band(w, h, color, { z = 0.012, flat = true } = {}) {
  const m = new THREE.Mesh(boxGeo(), flat
    ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
    : new THREE.MeshToonMaterial({ color, gradientMap: RAMP_HARD() }));
  m.scale.set(w, h, Math.max(0.01, z));
  m.userData.noInk = true;
  return m;
}

/** Shrink a font until the string fits. Guessing point sizes is how band text overlaps. */
export function fitFont(g, text, max, px, family) {
  let n = px;
  for (; n > 8; n -= 2) { g.font = `bold ${n}px ${family}`; if (g.measureText(text).width <= max) break; }
  return n;
}

/**
 * The ₹ mark, drawn from bars rather than typed.
 *
 * U+20B9 is missing or tofu in several of the fonts a headless Chrome or an Android WebView
 * will actually resolve, and a tofu box in the middle of the teaching device is a worse
 * failure than any amount of ugliness. Bars and a straight leg, because at the 5-7 px this
 * glyph is really drawn at, a faithful curve is thinner than the pen drawing it.
 */
export function drawRupee(g, x, y, h, color) {
  const w = h * 0.70;
  const t = h * 0.20;
  g.save();
  g.fillStyle = color; g.strokeStyle = color;
  g.fillRect(x, y, w, t);
  g.fillRect(x, y + h * 0.30, w, t);
  g.fillRect(x, y, t, h * 0.52 + t);
  g.fillRect(x + w - t, y + h * 0.30, t, h * 0.30);
  g.fillRect(x, y + h * 0.52, w, t);
  g.lineWidth = t; g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(x + w * 0.42, y + h * 0.52 + t * 0.5);
  g.lineTo(x + w * 0.92, y + h - t * 0.5);
  g.stroke();
  g.restore();
}

/** A pictogram person: head disc + shoulders. Legible as a blob, which is the point. */
export function drawFigure(g, cx, cy, h, color) {
  const head = h * 0.38;
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy - h * 0.30, head, 0, Math.PI * 2);
  g.fill();
  const bw = h * 0.86, bh = h * 0.52, r = bh * 0.42;
  const x = cx - bw / 2, y = cy + h * 0.06;
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + bw - r, y);
  g.quadraticCurveTo(x + bw, y, x + bw, y + r);
  g.lineTo(x + bw, y + bh);
  g.lineTo(x, y + bh);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.fill();
}

/** A canvas texture, set up the way every prop in this game needs one. */
export function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** A printed slab: a unit box whose +z face carries `tex` and whose other five are `plain`. */
export function printedSlab(tex, plainColor, { ramp = RAMP_HARD } = {}) {
  const plain = new THREE.MeshToonMaterial({ color: plainColor, gradientMap: ramp() });
  const printed = new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, gradientMap: ramp() });
  // BoxGeometry material groups are [+x, -x, +y, -y, +z, -z]; only the front face is printed.
  const m = new THREE.Mesh(boxGeo(), [plain, plain, plain, plain, printed, plain]);
  m.castShadow = true;
  return m;
}

export { RAMP_STD };

/**
 * ── THE THREE SILHOUETTES, AS GEOMETRY RATHER THAN AS TEXTURE ────────────────
 *
 * The cast is told apart by OUTLINE, because outline is the only thing left at the 14-20 CSS
 * px these characters are tall on a phone. So the three shapes are real extruded geometry and
 * not a rectangle with a picture of a shape on it:
 *
 *   hardRectGeo     the cheque — square corners, because paper is cut
 *   roundRectGeo(r) the credit card — 3 mm radius corners, the one detail of a card that is
 *                   recognisable with every mark on its face erased
 *   trapezoidGeo(t) one tier of the pyramid chart — `t` is the top edge as a fraction of the
 *                   bottom, so a stack of three makes a stepped pyramid rather than a triangle
 *                   (a stack can be CRUSHED; one triangle can only be scaled)
 *
 * All three are authored in a 0..1 box and translated afterwards, for the reason
 * `ponziPyramid.js`'s `triangleGeo` documents: `ExtrudeGeometry`'s default UV generator bakes
 * the shape's raw XY into the front cap's UVs at construction time, so a 0..1 shape hands the
 * canvas a 1:1 map with no custom generator, and `translate()` cannot then disturb it. Group 0
 * is the caps (the printed face), group 1 is the side walls (the cut edge).
 */
function shapeGeo(key, build) {
  return geo(key, () => {
    const s = new THREE.Shape();
    build(s);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 4 });
    g.translate(-0.5, -0.5, -0.5);
    return g;
  });
}

export const hardRectGeo = () => shapeGeo('oRect', (s) => {
  s.moveTo(0, 0); s.lineTo(1, 0); s.lineTo(1, 1); s.lineTo(0, 1); s.closePath();
});

/** `r` is the corner radius as a fraction of the SHORT side, so it survives non-square scaling. */
export const roundRectGeo = (r = 0.09) => shapeGeo(`oRound${r}`, (s) => {
  const k = Math.min(0.49, r);
  s.moveTo(k, 0);
  s.lineTo(1 - k, 0); s.quadraticCurveTo(1, 0, 1, k);
  s.lineTo(1, 1 - k); s.quadraticCurveTo(1, 1, 1 - k, 1);
  s.lineTo(k, 1);     s.quadraticCurveTo(0, 1, 0, 1 - k);
  s.lineTo(0, k);     s.quadraticCurveTo(0, 0, k, 0);
});

/** One pyramid tier: full width at the bottom, `top` of that at the top. */
export const trapezoidGeo = (top = 0.78) => shapeGeo(`oTrap${top}`, (s) => {
  const i = (1 - top) / 2;
  s.moveTo(0, 0); s.lineTo(1, 0); s.lineTo(1 - i, 1); s.lineTo(i, 1); s.closePath();
});

/**
 * A printed panel: one extruded shape whose CAPS carry `tex` and whose side walls are the
 * cut-edge colour. Two materials, both shared by every panel that asks for the same pair, so
 * a three-panel cheque is three draw calls rather than six shader programs.
 */
export function printedPanel(geometry, tex, edge, { ink = 0.052 } = {}) {
  const m = new THREE.Mesh(geometry, [
    new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, gradientMap: RAMP_HARD() }),
    new THREE.MeshToonMaterial({ color: edge, gradientMap: RAMP_HARD() }),
  ]);
  m.castShadow = true;
  m.userData.inkWidth = ink;
  return m;
}

/**
 * A ROW OF TEETH, as real geometry on a real edge.
 *
 * Teeth are the one feature on this cast that has to break an OUTLINE rather than sit inside
 * one: a zig-zag painted into the card's canvas is gone the moment the jaw opens, because the
 * thing the player is reading then is the gap between two edges, not the print on either. So
 * they are four-sided pyramids standing on the edge they belong to — `down: true` for the row
 * hanging off an upper jaw, `false` for the row standing up from a lower one.
 *
 * `span` is the width they are spread across, and they stop short of both ends on purpose:
 * a tooth at the hinge of a jaw reads as a broken corner.
 */
export function teethRow(n, span, h, { down = true, color = 0xfdf6ec, x0 = 0 } = {}) {
  const g = new THREE.Group();
  const w = span / (n + 0.6);
  for (let i = 0; i < n; i++) {
    // UNLIT, deliberately. A toon-shaded tooth inside an open mouth is lit by nothing and
    // renders as a grey-green wedge — measured on the gape capture, the upper row had lost
    // ~60 luminance against the lower one. Teeth are the brightest thing on this cast and the
    // only thing separating two dark edges, so their value is not the renderer's to decide.
    const t = new THREE.Mesh(
      geo('oTooth', () => new THREE.ConeGeometry(0.72, 1, 4)),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    t.scale.set(w, h, w * 0.7);
    t.position.set(x0 - span / 2 + w * (0.8 + i * 1.06), down ? -h * 0.5 : h * 0.5, 0);
    if (down) t.rotation.z = Math.PI;
    t.rotation.y = Math.PI / 4;           // a square pyramid seen corner-on is a triangle
    t.userData.inkWidth = 0.026;
    g.add(t);
  }
  return g;
}

/** A dashed perforation line, drawn into a canvas that is already in paper coordinates. */
export function drawPerf(g, x, y0, y1, color = 'rgba(40,30,20,0.55)', dash = 14) {
  g.save();
  g.strokeStyle = color; g.lineWidth = Math.max(2, dash * 0.28);
  g.setLineDash([dash, dash * 0.8]);
  g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  g.restore();
}

/**
 * ══ WHERE A DEATH PROP'S BODY IS BORN, AND WHY IT IS PINNED ═════════════════
 *
 * base.js's "THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER" block is the whole context for
 * this function, and it should be read before this one is touched. In short: every villain
 * spawns one real rigid body when it dies (RUBRIC P11's "one genuinely physical absurd prop"),
 * that body used to be created AT THE TRANSFORM ITS MESH HAPPENED TO HOLD, and l1's outcome is
 * chaotically sensitive to where that is — three prop arms measured on one tree produced three
 * different destruction outcomes, with individual shots swinging between 6,400 and 41,400
 * points. That made a villain's PICTURE a live input to the physics.
 *
 * This round is a redraw of all three characters, so every prop moved. Measured on the
 * shipping tables (`p13-stargate.mjs`), the natural spawn — wherever the new slip or sign
 * happens to hang — broke three of `levels/stars.json`'s recorded plans: l1's one-shot 3-star
 * plan stopped winning at all, and l2's cheapest win became a loss. Those tables are derived
 * from measurement and are not this round's to re-derive.
 *
 * So the spawn is now PINNED: a constant offset from the villain's own centre, in multiples of
 * R, with a constant rotation. Two consequences, and both are improvements:
 *
 *  · THE VISUAL LAYER IS NOW PROVABLY PHYSICS-NEUTRAL. Nothing a pose does — flinch, crush,
 *    gloat, death beat — can reach the solver any more, which is the state base.js's own note
 *    says a future round would need and names this function as the lever for.
 *  · THE NUMBERS ARE STABLE. The offsets below were not chosen; they were SWEPT, against the
 *    three recorded plans that broke, by `_tools/scenarios/cast-propsweep.mjs`. The winning
 *    offsets are recorded in each character's own `onDeath`.
 *
 * The cost is honest and it is small: the prop's mesh jumps from wherever it was drawn to the
 * pin on the frame the villain pops — about 9 x 5 px on a phone, inside the FX puff that
 * `villainDefeated` fires on the same frame. The old code's argument for spawning in place was
 * that a teleport "breaks the one frame that matters most"; at this size, and behind that puff,
 * it does not, and a broken star table certainly does.
 *
 * `globalThis.__propPin` overrides it, for the sweep only — the same measurement-hook pattern
 * as `scamIcon.js`'s `?noplaque=1` and `globalThis.__scamIcons`.
 */
export function pinnedSpawn(point, R, pin) {
  const o = globalThis.__propPin?.[pin.id] ?? pin;
  return { x: point.x + R * o.x, y: point.y + R * o.y, rot: o.rot };
}
