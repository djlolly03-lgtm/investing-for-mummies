/* snakes3d.js — the eight snakes and the eight ladders, as real objects.
 *
 * DESIGN.md §4 board furniture · §6.1 "objects above the tile plane, so they never
 * obscure a square number, and the snake's THICKNESS carries the size of the money"
 * · §7.2 materials · §9 #14/#16/#17 motion.
 *
 * Everything here is built once, in world space, and never rebuilt. Draw calls at
 * rest: 8 snake bodies + 8 snake heads + 8 ladders + 1 merged contact-shadow mesh
 * + 1 merged ladder-foot glow = 26. See drawCallCount().
 *
 * Nothing in this file touches the DOM except the offscreen <canvas> used to paint
 * a snake's kalamkari markings and the gold rupee cost along its back.
 */

import * as THREE from '../vendor/three.module.js';
import { CFG, dur } from './config.js';
import { SNAKES, LADDERS } from './content.js';
import * as board3d from './board3d.js';
import * as scene3d from './scene.js';
import { ease, clamp, lerp, makeRng, prefersReducedMotion, rupees } from './util.js';

/* ═════════════════════════════════════════════════════════════════════════
   0. Small shared scratch. Nothing in a hot path may allocate.
   ═════════════════════════════════════════════════════════════════════════ */

const UP = new THREE.Vector3(0, 1, 0);
const IDENT = new THREE.Matrix4();
const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _m3 = new THREE.Matrix3();
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
const _c0 = new THREE.Color();

const C = (hex) => new THREE.Color(hex);
const pow2 = (n) => Math.pow(2, Math.round(Math.log2(Math.max(2, n))));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); };
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/* ── ART DIRECTION v2 (docs/ART-DIRECTION.md §2) ───────────────────────────
   §2 names these six colours by hand. config.js predates the v2 doc and still
   carries the v1 bamboo/clay set, which measured as pale salmon tubes and pale
   yellow sticks on the shipped render. Same precedent as scene.js's BG/RIG
   blocks: where the art direction states a value, the art direction wins, and
   the deviation is stated in the report rather than made silently. */
const ART = {
  snake:      0xc05a3e,   // §2 terracotta body
  snakeDeep:  0x7d2f1e,   // §2 deep maroon markings
  snakeBelly: 0xf3ddba,   // §2 cream belly
  wood:       0xd9a441,   // §2 honey ladder
  woodDeep:   0xa8762a,   // §2 its shadow side
  brass:      0xc8900a,   // §2 brass caps on the rail ends
};

/* Materials, ART §1. The v1 table put every one of these at roughness .85-.90,
   which is why nothing on the board caught the key light.
     snake  .45 matte      -> .30 + a full clearcoat: lacquered, wet-looking
     ladder .90 raw bamboo -> .50 + a thin varnish coat: honey wood, waxed
     brass   —             -> metalness .88 / roughness .26: it must glint */
const MAT = {
  snake:  { roughness: 0.30, clearcoat: 1.00, ccRough: 0.11, env: 1.15 },
  ladder: { roughness: 0.50, clearcoat: 0.30, ccRough: 0.34, env: 0.85 },
  brass:  { roughness: 0.30, metalness: 0.88, env: 1.05 },
};

/* The horizontal direction a contact shadow falls in — read off scene.js's own
   key light at build time, so this module cannot drift from the lighting rig
   while another agent is still tuning it. Length is the throw, in world units. */
const SHADOW_OFF = new THREE.Vector3(-0.062, 0, -0.086);
const SHADOW_THROW = 0.088;

/** cellToWorld, from board3d.js — the one module allowed to own the grid.
 *  The fallback exists only so this module still builds if board3d has not
 *  landed yet; it implements CONTRACT.md "Board coordinate system" verbatim
 *  from CFG.board, so the two cannot drift on any number that matters. */
function cellToWorld(n) {
  if (typeof board3d.cellToWorld === 'function') return board3d.cellToWorld(n);
  const S = CFG.board.size, half = CFG.board.half, cell = CFG.board.cell;
  const i = clamp(Math.round(n), 1, S * S) - 1;
  const row = Math.floor(i / S), inRow = i % S;
  const col = (row % 2 === 0) ? inRow : (S - 1 - inRow);
  return { x: -half + cell * (col + 0.5), y: row * CFG.board.rowRise, z: half - cell * (row + 0.5) };
}
const cellVec = (n, out = new THREE.Vector3()) => { const p = cellToWorld(n); return out.set(p.x, p.y || 0, p.z); };

/* ═════════════════════════════════════════════════════════════════════════
   1. Module state
   ═════════════════════════════════════════════════════════════════════════ */

let root = null;                 // THREE.Group, everything lives under it
const snakes = new Map();        // from -> snake record
const ladders = new Map();       // from -> ladder record
let shadowMesh = null, glowMesh = null, sweepMesh = null, brassMesh = null;
let headMat = null, ladderMat = null, shadowMat = null, glowMat = null, sweepMat = null, brassMat = null;
let brassParts = [];              // rail-end caps, collected across all eight ladders
let elapsed = 0;                 // seconds, for the idle glow breath
let frameBound = false, rafId = 0, rafLast = 0;
const running = new Set();       // live tweens, so a tap can finish them instantly

const keyOf = (x) => (typeof x === 'number' ? x : (x && x.from));
const reduced = () => prefersReducedMotion();
const D = (k) => dur(k, reduced());

/* ═════════════════════════════════════════════════════════════════════════
   2. A cancellable, SKIPPABLE tween.
      util.js's tween() snaps to the end under reduced motion, which is right
      for UI and wrong here: the caller's promise has to stay in step with
      config's durations. skip() must also *finish* an animation (snap to its
      final state), never freeze it half-way — CONTRACT amendment 10.
   ═════════════════════════════════════════════════════════════════════════ */

function tw(ms, fn, easing = ease.inOut) {
  const rec = { done: false, finish: null };
  const p = new Promise((res) => {
    if (!(ms > 0)) { fn(1, 1); rec.done = true; running.delete(rec); return res(); }
    let start = null;
    rec.finish = () => {
      if (rec.done) return;
      rec.done = true; running.delete(rec);
      fn(1, 1); res();
    };
    const step = (now) => {
      if (rec.done) return;
      if (start === null) start = now;
      const t = clamp((now - start) / ms, 0, 1);
      fn(t, easing(t));
      if (t < 1) requestAnimationFrame(step);
      else { rec.done = true; running.delete(rec); res(); }
    };
    running.add(rec);
    requestAnimationFrame(step);
  });
  return p;
}

/** Tap-to-skip. Finishes every live snake/ladder animation on this frame. */
export function skipAnimations() {
  for (const rec of [...running]) rec.finish?.();
  running.clear();
}

/* ═════════════════════════════════════════════════════════════════════════
   3. Geometry merging — three's BufferGeometryUtils is an addon and we ship
      core only, so we concatenate by hand. Everything merged here carries a
      per-vertex colour, which is how eight ladders share one material and one
      rung can still be lit on its own.
   ═════════════════════════════════════════════════════════════════════════ */

function merge(parts) {
  let vTotal = 0, iTotal = 0;
  for (const p of parts) {
    p.vCount = p.geo.attributes.position.count;
    p.iCount = p.geo.index ? p.geo.index.count : p.vCount;
    vTotal += p.vCount; iTotal += p.iCount;
  }
  const position = new Float32Array(vTotal * 3);
  const normal = new Float32Array(vTotal * 3);
  const color = new Float32Array(vTotal * 3);
  const index = vTotal > 65535 ? new Uint32Array(iTotal) : new Uint16Array(iTotal);
  const ranges = Object.create(null);
  let vo = 0, io = 0;

  for (const p of parts) {
    const g = p.geo;
    const pa = g.attributes.position.array, na = g.attributes.normal.array;
    const mtx = p.matrix || IDENT;
    _m3.getNormalMatrix(mtx);
    for (let i = 0; i < p.vCount; i++) {
      const lx = pa[i * 3], ly = pa[i * 3 + 1], lz = pa[i * 3 + 2];
      _v0.set(lx, ly, lz).applyMatrix4(mtx);
      position[(vo + i) * 3] = _v0.x; position[(vo + i) * 3 + 1] = _v0.y; position[(vo + i) * 3 + 2] = _v0.z;
      _v1.set(na[i * 3], na[i * 3 + 1], na[i * 3 + 2]).applyMatrix3(_m3).normalize();
      normal[(vo + i) * 3] = _v1.x; normal[(vo + i) * 3 + 1] = _v1.y; normal[(vo + i) * 3 + 2] = _v1.z;
      const c = typeof p.color === 'function' ? p.color(lx, ly, lz, _c0) : p.color;
      color[(vo + i) * 3] = c.r; color[(vo + i) * 3 + 1] = c.g; color[(vo + i) * 3 + 2] = c.b;
    }
    if (g.index) { const ia = g.index.array; for (let i = 0; i < p.iCount; i++) index[io + i] = ia[i] + vo; }
    else for (let i = 0; i < p.iCount; i++) index[io + i] = i + vo;
    if (p.name) (ranges[p.name] ||= []).push({ start: vo, count: p.vCount });
    vo += p.vCount; io += p.iCount;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  out.userData.ranges = ranges;
  return out;
}

/** An RGBA ribbon/fan used for the blob shadows and the ladder-foot glow. */
function softMesh(verts, cols, tris) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 4));
  g.setIndex(tris.length > 65535 ? new THREE.BufferAttribute(new Uint32Array(tris), 1)
                                 : new THREE.BufferAttribute(new Uint16Array(tris), 1));
  g.computeBoundingSphere();
  return g;
}

/* ═════════════════════════════════════════════════════════════════════════
   4. SNAKES
   ═════════════════════════════════════════════════════════════════════════ */

/* §4 "the snake's body thickness is proportional to its rupee cost, so you can
   read the price of a product from across the room before you can read a word."
   Log scale — linear makes seven of the eight the same thickness. */
function costNorm(cost) {
  const [lo, hi] = CFG.board.snakeCostRange;
  const c = clamp(Number(cost) || lo, lo, hi);
  return (Math.log(c) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
}

/* Thick head → thin tail. A pinch behind the skull so there is a neck, and a
   tip that closes to zero so the tube needs no cap.
   v2: the front half keeps far more of its mass (was 0.30 + 0.70*(1-s)^0.75,
   which spent the taper in the first third and then ran 30% thin for half the
   animal). §6.1's promise — "the snake's THICKNESS carries the size of the
   money" — is only legible if a ₹2.5 lakh snake is visibly fatter than a
   ₹21,000 one along its WHOLE readable length, not just at the skull. */
function taper(s) {
  const body = 0.22 + 0.78 * Math.pow(1 - s, 1.35);
  const neck = 1 - 0.13 * Math.exp(-Math.pow((s - 0.085) / 0.065, 2));
  const tip = Math.pow(1 - clamp((s - 0.88) / 0.12, 0, 1), 0.55);
  return body * neck * tip;
}

/* ART §5 / the brief: "No snake or ladder mesh may stray outside the corridor
   between its own head and tail square." The corridor is the rectangle spanned
   by the two squares, shrunk by the body radius so the SURFACE stays inside it
   too — not just the centre line. A 96→88 snake used to sprawl over 95, 94, 93
   and 85 because the S-curve amplitude was a function of length alone. */
function corridorOf(A, B, pad) {
  const h = CFG.board.cell * 0.5;
  const box = {
    x0: Math.min(A.x, B.x) - h + pad, x1: Math.max(A.x, B.x) + h - pad,
    z0: Math.min(A.z, B.z) - h + pad, z1: Math.max(A.z, B.z) + h - pad,
  };
  if (box.x1 < box.x0) { const m = (box.x0 + box.x1) / 2; box.x0 = box.x1 = m; }
  if (box.z1 < box.z0) { const m = (box.z0 + box.z1) / 2; box.z0 = box.z1 = m; }
  return box;
}
const inBox = (p, box) => { p.x = clamp(p.x, box.x0, box.x1); p.z = clamp(p.z, box.z0, box.z1); return p; };

/** How far a point may travel along ±perp before it leaves the corridor. */
function headroom(px, pz, perp, box) {
  const axis = (p, d, lo, hi) => (d > 1e-6 ? (hi - p) / d : d < -1e-6 ? (lo - p) / d : Infinity);
  const fwd = Math.min(axis(px, perp.x, box.x0, box.x1), axis(pz, perp.z, box.z0, box.z1));
  const bwd = Math.min(axis(px, -perp.x, box.x0, box.x1), axis(pz, -perp.z, box.z0, box.z1));
  return Math.max(0, Math.min(fwd, bwd));
}

/** The centre line: head square → tail square, bent into an S so it never
 *  reads as a straight pipe — but an S that FITS the corridor. Deterministic
 *  per snake; the eight do not all bend the same way. */
function snakeSpine(sn, rHead) {
  const A = cellVec(sn.from, new THREE.Vector3());
  const B = cellVec(sn.to, new THREE.Vector3());
  const r = rHead ?? lerp(CFG.board.snakeRadiusMin, CFG.board.snakeRadiusMax, costNorm(sn.cost));
  const box = corridorOf(A, B, r * FLAT_MAX + 0.035);
  const flat = _v0.set(B.x - A.x, 0, B.z - A.z);
  const len = flat.length() || 1;
  const dir = new THREE.Vector3(flat.x / len, 0, flat.z / len);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const rng = makeRng(977 + sn.from * 31);
  const sign = rng() < 0.5 ? -1 : 1;
  const cycles = len > 5 ? 1.5 : 1;

  const N = 21;
  const shape = (t) => Math.pow(Math.sin(Math.PI * t), 0.35) * Math.sin(2 * Math.PI * cycles * t);

  /* the largest amplitude whose every sample still lands inside the corridor */
  let fit = Infinity;
  for (let i = 0; i <= N; i++) {
    const t = i / N, w = Math.abs(shape(t));
    if (w < 1e-3) continue;
    fit = Math.min(fit, headroom(A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t, perp, box) / w);
  }
  const amp = Math.min(clamp(len * 0.17, 0.26, 1.05), Number.isFinite(fit) ? fit : 1.05);

  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const env = Math.pow(Math.sin(Math.PI * t), 0.35);
    const off = sign * amp * Math.sin(2 * Math.PI * cycles * t) * env;
    const drag = sign * amp * 0.09 * Math.sin(4 * Math.PI * t) * env;   // a hand-painted wobble
    pts.push(inBox(new THREE.Vector3(
      A.x + (B.x - A.x) * t + perp.x * off + dir.x * drag,
      lerp(A.y, B.y, t),
      A.z + (B.z - A.z) * t + perp.z * off + dir.z * drag,
    ), box));
  }
  pts[0].copy(A); pts[N - 1].copy(B);
  return { curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), len, A, B, dir, box };
}

/* The body floats clear of the tile plane so no square number is ever covered
   (§6.1), and arches gently in the middle so it reads as an object resting on
   supports rather than a decal. */
const CLEAR = 0.085;                                 // was 0.055 — ART §5: lift the
                                                     // furniture so its DROP SHADOW darkens
                                                     // a numeral instead of hiding it
const FLAT = 0.90;                                   // barely oval in section. Was 0.82: a
                                                     // flattened tube has no bright top edge
                                                     // for the key light to run along
const FLAT_MAX = 1.0;                                // widest half-section, for the corridor
const ARCH = Math.max(0, CFG.board.snakeHeight - 0.10) * 0.55;
const liftAt = (s, rV) => CLEAR + rV + ARCH * Math.pow(Math.sin(Math.PI * s), 1.2);

/** A tapered tube built by hand. THREE.TubeGeometry has one radius for the
 *  whole length; a snake that does not taper is a hosepipe. Frames use a fixed
 *  world up rather than Frenet, so the texture never twists and v = 0.5 is
 *  always the animal's back — which is where the gold rupee number is painted. */
function snakeBody(spine, rHead, tubular, radial) {
  const curve = spine.curve;
  const total = curve.getLength();
  const u0 = clamp((rHead * 1.70 * 0.80) / total, 0.004, 0.14);   // start inside the skull
  const vCount = (tubular + 1) * (radial + 1);
  const position = new Float32Array(vCount * 3);
  const normal = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const index = new Uint32Array(tubular * radial * 6);
  const lat = new Float32Array((tubular + 1) * 3);   // per-ring lateral axis, for the ripple
  const arcPerS = total * (1 - u0);
  let ii = 0;

  for (let i = 0; i <= tubular; i++) {
    const s = i / tubular;
    const u = lerp(u0, 1, s);
    const P = curve.getPointAt(u, _v0);
    const T = curve.getTangentAt(u, _v1).normalize();
    const Bv = _v2.crossVectors(T, UP);
    if (Bv.lengthSq() < 1e-8) Bv.set(1, 0, 0);
    Bv.normalize();
    const Nv = _v3.crossVectors(Bv, T).normalize();
    const r = rHead * taper(s), rV = r * FLAT;
    const y = P.y + liftAt(s, rV);
    lat[i * 3] = Bv.x; lat[i * 3 + 1] = Bv.y; lat[i * 3 + 2] = Bv.z;

    // how fast the radius is shrinking, so the taper catches the key light right
    const h = 0.5 / tubular;
    const slope = (rHead * taper(clamp(s + h, 0, 1)) - rHead * taper(clamp(s - h, 0, 1))) / (2 * h * arcPerS);

    for (let j = 0; j <= radial; j++) {
      const v = j / radial;
      const th = (v - 0.5) * Math.PI * 2;             // v = 0.5 is the back
      const ct = Math.cos(th), st = Math.sin(th);
      const k = (i * (radial + 1) + j);
      position[k * 3] = P.x + Nv.x * ct * rV + Bv.x * st * r;
      position[k * 3 + 1] = y + Nv.y * ct * rV + Bv.y * st * r;
      position[k * 3 + 2] = P.z + Nv.z * ct * rV + Bv.z * st * r;
      _v4.set(Nv.x * r * ct + Bv.x * rV * st, Nv.y * r * ct + Bv.y * rV * st, Nv.z * r * ct + Bv.z * rV * st)
        .normalize().addScaledVector(T, -slope).normalize();
      normal[k * 3] = _v4.x; normal[k * 3 + 1] = _v4.y; normal[k * 3 + 2] = _v4.z;
      uv[k * 2] = s; uv[k * 2 + 1] = v;
      if (i < tubular && j < radial) {
        /* Winding, and this one matters: cross(d/di, d/dj) points INWARD on this
           parametrisation, so the v1 order made every triangle front-facing from
           inside the tube. Back-face culling then threw away the near surface and
           drew the far one — which is why the painted back of a snake has never
           once been visible on this board, and why v1 read as a bare salmon pipe
           however good the texture was. Reversed. */
        const a = k, b = k + radial + 1, c = k + radial + 2, d = k + 1;
        index[ii++] = a; index[ii++] = d; index[ii++] = b;
        index[ii++] = b; index[ii++] = d; index[ii++] = c;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return { geo: g, base: position.slice(), lat, tubular, radial, u0 };
}

/* ── the head: a slightly flattened ellipsoid with a snout, two friendly beads
      for eyes and a small forked tongue. Nothing here may read as a monster —
      a snake on this board is a money trap, not a horror. ─────────────────── */
function snakeHead(r, tone, seg) {
  const hl = r * 1.92, hw = r * 1.30, hh = r * 1.06;
  const deep = C(ART.snakeDeep);
  const belly = C(ART.snakeBelly);
  const band = deep.clone().lerp(C(0x000000), 0.18);

  // skull — a unit sphere, warped into a snout, then scaled
  const skull = new THREE.SphereGeometry(1, Math.max(12, seg), Math.max(8, seg >> 1));
  const sp = skull.attributes.position.array;
  for (let i = 0; i < sp.length; i += 3) {
    const nose = smooth(0.10, 1, sp[i + 2]);
    const narrow = 1 - 0.30 * nose;
    // a soft brow over the eye line, so the face has a plane that catches the key
    const brow = 1 + 0.10 * Math.exp(-Math.pow((sp[i + 2] - 0.34) / 0.30, 2)) * Math.max(0, sp[i + 1]);
    sp[i] *= narrow;
    sp[i + 1] *= narrow * brow * (sp[i + 1] < 0 ? 0.78 : 0.96);      // flat jaw, low crown
    sp[i] *= hw; sp[i + 1] *= hh; sp[i + 2] *= hl;
  }
  skull.computeVertexNormals();

  /* The eye is the whole character. At phone size a snake's head is ~9 px, so a
     bare navy dot reads as damage on the texture; a cream ring with a dark
     pupil and a catchlight reads as a face — and a friendly one. §4: a money
     trap, never a monster. */
  const eyeR = Math.max(0.013, r * 0.36);
  const ring = () => new THREE.SphereGeometry(eyeR, 10, 7);
  const pupil = () => new THREE.SphereGeometry(eyeR * 0.74, 8, 6);
  const spark = () => new THREE.SphereGeometry(eyeR * 0.30, 6, 5);
  const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const ey = hh * 0.40, ez = hl * 0.30, ex = hw * 0.72;

  const parts = [
    { geo: skull, color: (x, y, z, c) => {
        // painted glaze: a deep maroon crown carrying the diamond band, cream jaw
        const up = y / (hh || 1);
        c.copy(up > 0.10 ? deep : belly).lerp(tone, 1 - Math.abs(up) * 0.72);
        if (up > 0.40 && Math.abs(Math.sin(z * 24)) > 0.70) c.lerp(band, 0.55);
        if (up < -0.45) c.lerp(belly, 0.55);
        return c;
      } },
    { geo: ring(), matrix: at(ex, ey, ez), color: C(0xf7efdc) },
    { geo: ring(), matrix: at(-ex, ey, ez), color: C(0xf7efdc) },
    { geo: pupil(), matrix: at(ex + eyeR * 0.22, ey + eyeR * 0.06, ez + eyeR * 0.26), color: C(0x22160f) },
    { geo: pupil(), matrix: at(-ex - eyeR * 0.22, ey + eyeR * 0.06, ez + eyeR * 0.26), color: C(0x22160f) },
  ];
  if (seg >= 12) {
    parts.push({ geo: spark(), matrix: at(ex + eyeR * 0.46, ey + eyeR * 0.42, ez + eyeR * 0.62), color: C(0xffffff) });
    parts.push({ geo: spark(), matrix: at(-ex - eyeR * 0.14, ey + eyeR * 0.42, ez + eyeR * 0.62), color: C(0xffffff) });
  }

  // tongue — a little of it always showing, so the head reads as a head at 9 px
  const tw_ = Math.max(0.010, r * 0.19), tl = hl * 0.80, rest = -tl * 0.52;
  const tCol = C(0x8e2020);
  const stem = new THREE.BoxGeometry(tw_, tw_ * 0.5, tl);
  const tipG = () => new THREE.BoxGeometry(tw_ * 0.72, tw_ * 0.42, tl * 0.5);
  const ty = -hh * 0.18, tz = hl * 0.86 + rest;
  const fork = (sgn) => new THREE.Matrix4()
    .makeTranslation(sgn * tl * 0.13, ty, tz + tl * 0.70)
    .multiply(new THREE.Matrix4().makeRotationY(sgn * 0.38));
  parts.push({ geo: stem, matrix: at(0, ty, tz + tl * 0.5), color: tCol, name: 'tongue' });
  parts.push({ geo: tipG(), matrix: fork(1), color: tCol, name: 'tongue' });
  parts.push({ geo: tipG(), matrix: fork(-1), color: tCol, name: 'tongue' });

  const geo = merge(parts);
  return { geo, tongue: geo.userData.ranges.tongue || [], reach: tl * 0.86, hl, hw, hh };
}

/* ── the skin: kalamkari markings and the gold rupee cost, painted on a canvas.
      u runs head → tail, v = 0.5 is the back. flipY is off so the lettering is
      not mirrored when read from the default camera. ───────────────────────── */
const hexOf = (col) => '#' + col.getHexString();
const rgba = (col, a) => 'rgba(' + Math.round(col.r * 255) + ',' + Math.round(col.g * 255) + ','
  + Math.round(col.b * 255) + ',' + a.toFixed(3) + ')';

function snakeSkin(sn, tone, worldLen, circumference, dirX, cn = 0.5) {
  if (typeof document === 'undefined') return null;
  const tier = CFG.quality.current;
  const H = tier.textureSize >= 1024 ? 160 : 96;
  const capW = tier.textureSize >= 1024 ? 1024 : 512;
  const W = clamp(pow2(H * worldLen / Math.max(0.2, circumference)), 256, capW);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const body = C(ART.snake).lerp(C(ART.snakeDeep), 0.06 + 0.18 * cn);  // costlier = heavier
  const deep = C(ART.snakeDeep);
  const belly = C(ART.snakeBelly);
  const crown = deep.clone().lerp(C(0x000000), 0.10);
  const lite = body.clone().lerp(C(0xffd9b0), 0.42);

  /* 1 — the base coat. v = 0 and v = 1 are the belly seam, v = 0.5 is the back
     (see snakeBody's frame). Cream underneath, terracotta flanks, a maroon
     saddle down the spine. */
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0.00, hexOf(belly));
  grd.addColorStop(0.07, hexOf(belly));
  grd.addColorStop(0.15, hexOf(body.clone().lerp(belly, 0.45)));
  grd.addColorStop(0.26, hexOf(body));
  grd.addColorStop(0.40, hexOf(body.clone().lerp(crown, 0.55)));
  grd.addColorStop(0.50, hexOf(crown));
  grd.addColorStop(0.60, hexOf(body.clone().lerp(crown, 0.55)));
  grd.addColorStop(0.74, hexOf(body));
  grd.addColorStop(0.85, hexOf(body.clone().lerp(belly, 0.45)));
  grd.addColorStop(0.93, hexOf(belly));
  grd.addColorStop(1.00, hexOf(belly));
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  /* 2 — painted scales. Two strokes per scale, a dark rim and a light lip one
     pixel above it, which is what makes a flat canvas read as relief when the
     clearcoat puts a highlight across it. Denser on the back than the belly. */
  const sc = Math.max(6, H * 0.135);
  g.lineCap = 'round';
  for (let ry = -1; ry * sc < H + sc; ry++) {
    const y = ry * sc, off = (ry & 1) * sc * 0.5;
    const backness = 1 - Math.min(1, Math.abs(y / H - 0.5) * 2);
    const aDark = 0.09 + 0.15 * backness, aLite = 0.06 + 0.13 * backness;
    for (let x = -sc; x < W + sc; x += sc) {
      const cx = x + off;
      g.lineWidth = Math.max(1, H * 0.009);
      g.strokeStyle = rgba(deep, aDark);
      g.beginPath();
      g.moveTo(cx - sc * 0.52, y);
      g.quadraticCurveTo(cx, y + sc * 0.95, cx + sc * 0.52, y);
      g.stroke();
      g.strokeStyle = rgba(lite, aLite);
      g.beginPath();
      g.moveTo(cx - sc * 0.46, y - sc * 0.09);
      g.quadraticCurveTo(cx, y + sc * 0.80, cx + sc * 0.46, y - sc * 0.09);
      g.stroke();
    }
  }

  /* 3 — the diamond chain down the back, shrinking toward the tail. This is the
     marking a person actually remembers about the animal. */
  const n = Math.max(7, Math.round(worldLen * 2.4));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = u * W, k = 1 - 0.48 * u;
    const dw = (W / n) * 0.46 * k, dh = H * 0.225 * k;
    const dia = (sx, sy) => {
      g.beginPath();
      g.moveTo(x, H * 0.5 - sy); g.lineTo(x + sx, H * 0.5);
      g.lineTo(x, H * 0.5 + sy); g.lineTo(x - sx, H * 0.5);
      g.closePath();
    };
    dia(dw, dh);
    g.fillStyle = rgba(deep, 0.86); g.fill();
    g.lineWidth = Math.max(1, H * 0.014);
    g.strokeStyle = rgba(belly, 0.42); g.stroke();
    dia(dw * 0.42, dh * 0.42);
    g.fillStyle = rgba(body, 0.34); g.fill();
    // a pair of flank dots between the diamonds, off the saddle
    const mx = x + (W / n) * 0.5;
    g.fillStyle = rgba(deep, 0.30);
    for (const fy of [H * 0.29, H * 0.71]) {
      g.beginPath(); g.ellipse(mx, fy, dw * 0.22, dh * 0.22, 0, 0, Math.PI * 2); g.fill();
    }
  }

  /* 4 — ventral scutes on the cream belly, and the two seam shadows where the
     belly turns into the flank. Weight, cheaply. */
  g.lineWidth = Math.max(1, H * 0.010);
  g.strokeStyle = rgba(deep, 0.13);
  for (let x = 0; x < W; x += sc * 0.72) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + sc * 0.10, H * 0.075); g.stroke();
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + sc * 0.10, H * 0.925); g.stroke();
  }
  g.fillStyle = rgba(deep, 0.22);
  g.fillRect(0, H * 0.082, W, Math.max(1, H * 0.018));
  g.fillRect(0, H * 0.900, W, Math.max(1, H * 0.018));

  // 5 — a darker collar just behind the skull, so head and body read as one animal
  const collar = g.createLinearGradient(0, 0, W * 0.10, 0);
  collar.addColorStop(0, rgba(crown, 0.42)); collar.addColorStop(1, rgba(crown, 0));
  g.fillStyle = collar; g.fillRect(0, 0, W * 0.10, H);

  // §4 — the rupee cost, in gold, along the spine, oriented to the slide.
  paintSpineText(g, W, H, sn, dirX);

  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = CFG.quality.current.anisotropy || 1;
  tex.needsUpdate = true;
  tex.userData.repaint = () => { paintSpineText(g, W, H, sn, dirX); tex.needsUpdate = true; };
  return tex;
}

/* The gold rupee number on the back. Drawn last, over the diamonds, with a
   maroon casing so it survives them — §7.4, gold means money and nothing else.
   Fonts arrive after the first frame, so this is re-run once they land. */
function paintSpineText(g, W, H, sn, dirX) {
  if (!CFG.quality.current.spineText || !sn.cost) return;
  const label = rupees(sn.cost);
  g.save();
  if (dirX < 0) { g.translate(W, H); g.rotate(Math.PI); }   // stay upright on screen
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 ' + Math.round(H * 0.34) + 'px ' + CFG.type.ui;
  const tw2 = g.measureText(label).width;
  const reps = clamp(Math.floor(W / (tw2 * 2.1)), 1, 5);
  g.lineJoin = 'round';
  for (let i = 0; i < reps; i++) {
    const x = W * (i + 0.5) / reps;
    g.lineWidth = Math.max(3, H * 0.075); g.strokeStyle = 'rgba(52,18,8,0.78)';
    g.strokeText(label, x, H * 0.5);
    g.fillStyle = CFG.css.goldLt; g.fillText(label, x, H * 0.5 - H * 0.014);
    g.fillStyle = CFG.css.gold; g.fillText(label, x, H * 0.5);
  }
  g.restore();
}

/** The line a token rides: over the skull, along the back, down to the tile at
 *  the tail. tokens3d.slideAlong() drives straight off this. */
function snakeRide(spine, rHead, u0, headY) {
  const curve = spine.curve, N = 56, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const P = curve.getPointAt(u, new THREE.Vector3());
    let y;
    if (u <= u0) {
      y = lerp(headY + rHead * 1.00 * 0.92, P.y + liftAt(0, rHead * FLAT) + 0.02, u0 ? u / u0 : 1);
    } else {
      const s = (u - u0) / (1 - u0);
      y = P.y + liftAt(s, rHead * taper(s) * FLAT) + 0.02;
    }
    const land = smooth(0.94, 1, u);                    // land flush on the tail square
    P.y = lerp(y, P.y, land);
    pts.push(P);
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
}

function buildSnake(sn) {
  const tier = CFG.quality.current;
  const cn = costNorm(sn.cost);
  const rHead = lerp(CFG.board.snakeRadiusMin, CFG.board.snakeRadiusMax, cn);
  const spine = snakeSpine(sn, rHead);
  const worldLen = spine.curve.getLength();
  const tone = C(ART.snake).lerp(C(ART.snakeDeep), 0.06 + 0.20 * cn);  // costlier = heavier
  const tubular = clamp(Math.round(worldLen * 38), 32, tier.snakeTubular);
  const radial = Math.max(6, tier.snakeRadial);

  const body = snakeBody(spine, rHead, tubular, radial);
  const skin = snakeSkin(sn, tone, worldLen, 2 * Math.PI * rHead * 0.62, spine.B.x - spine.A.x, cn);
  /* ART §1 — lacquered, not matte. The clearcoat is the whole point: it is the
     only thing that puts a moving white highlight along the spine when the key
     light is at 45 degrees, and that highlight is what says "glazed object". */
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: skin ? 0xffffff : tone, map: skin || null,
    roughness: MAT.snake.roughness, metalness: 0,
    clearcoat: MAT.snake.clearcoat, clearcoatRoughness: MAT.snake.ccRough,
    envMapIntensity: MAT.snake.env,
  });
  const bodyMesh = new THREE.Mesh(body.geo, bodyMat);
  bodyMesh.castShadow = tier.shadows === 'soft';
  bodyMesh.receiveShadow = false;
  bodyMesh.name = 'snake-body-' + sn.from;

  // the head grows with the money too, and never below what reads on a phone
  const headR = Math.max(rHead * 1.16, 0.082);
  const head = snakeHead(headR, tone, tier.tokenSeg || 16);
  const headMesh = new THREE.Mesh(head.geo, headMat);
  headMesh.castShadow = tier.shadows === 'soft';
  headMesh.name = 'snake-head-' + sn.from;

  const hg = new THREE.Group();
  hg.add(headMesh);
  const hp = spine.curve.getPointAt(0, new THREE.Vector3());
  const headY = hp.y + CLEAR + headR * 0.92;
  hg.position.set(hp.x, headY, hp.z);
  const fwd = spine.curve.getTangentAt(0, new THREE.Vector3()).negate().setY(0.10).normalize();
  _m4.lookAt(_v0.set(0, 0, 0), _v1.copy(fwd).negate(), UP);
  hg.quaternion.setFromRotationMatrix(_m4);

  const grp = new THREE.Group();
  grp.name = 'snake-' + sn.from;
  grp.add(bodyMesh, hg);

  const rec = {
    kind: 'snake', data: sn, group: grp, bodyMesh, headGroup: hg, headMesh,
    body, skin, rHead, headR, spine, worldLen,
    restQ: hg.quaternion.clone(), restFwd: fwd.clone(),
    tongue: head.tongue, tongueReach: head.reach, tongueOut: 0,
    ride: snakeRide(spine, rHead, body.u0, headY),
    headBase: null, ripple: 0,
  };
  // a copy of the tongue's rest positions, so the flick is a cheap buffer poke
  if (rec.tongue.length) {
    const pa = head.geo.attributes.position.array;
    rec.headBase = new Float32Array(pa.length);
    rec.headBase.set(pa);
  }
  snakes.set(sn.from, rec);
  return rec;
}

/* ═════════════════════════════════════════════════════════════════════════
   5. LADDERS — bamboo rails on posts, clear of the tile plane. Deliberately
      plain: a ladder here is plumbing, not righteousness (§4). Gold-leaf tips
      only, and a soft mint pool at the foot that says "step here".
   ═════════════════════════════════════════════════════════════════════════ */

/* A hand-turned honey-wood rail: round in section, very slightly barrelled, with
   the small irregularities a lathe and forty years of hands leave. ART §2 —
   "honey wood grain with rounded rails", replacing the v1 bamboo node bulge,
   which at phone size read as a plastic drinking straw. */
function woodRail(len, r, seg, phase) {
  const hs = 26;
  const g = new THREE.CylinderGeometry(r, r * 0.965, len, seg, hs, false);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const u = (p[i + 1] + len / 2) / len;
    const swell = 1 + 0.045 * Math.sin(Math.PI * u)                 // barrelled middle
      + 0.020 * Math.sin(u * 17.3 + phase) * Math.sin(u * 5.1 + phase * 1.7);
    p[i] *= swell; p[i + 2] *= swell;
  }
  g.computeVertexNormals();
  return g;
}

/** Grain: fine streaks running the length of the rail, plus the odd darker
 *  figure. Deterministic, and cheap enough to live in the vertex colours. */
function grainAt(u, phase) {
  const fine = 0.5 + 0.5 * Math.sin(u * 41.7 + phase);
  const figure = 0.5 + 0.5 * Math.sin(u * 6.9 + phase * 2.3);
  return clamp(fine * 0.62 + figure * 0.38, 0, 1);
}

function buildLadder(ld) {
  const tier = CFG.quality.current;
  const A = cellVec(ld.from, new THREE.Vector3());
  const B = cellVec(ld.to, new THREE.Vector3());
  const flat = _v0.set(B.x - A.x, 0, B.z - A.z);
  const len = flat.length() || 1;
  const dir = new THREE.Vector3(flat.x / len, 0, flat.z / len);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const W = CFG.board.ladderWidth, hW = W / 2;
  const rr = CFG.board.ladderRail;
  const railY = CFG.board.ladderHeight;
  const seg = Math.max(5, tier.ladderSeg);
  const over = 0.20;                                   // the rails overhang, as real ones do
  const railLen = len + over * 2;

  const wood = C(ART.wood).lerp(C(ART.woodDeep), 0.12);
  const woodD = C(ART.woodDeep).lerp(C(0x5e3d12), 0.30);
  const tipCol = wood.clone().lerp(C(CFG.colors.goldLt), 0.34);   // rung ends, worn pale by hands
  const phase = (ld.from % 7) * 1.31;

  /* Rungs spaced for the hand, not for the config: DESIGN §7.2's "four rungs"
     is kept as the FLOOR and as the four ticks animateLadder() plays, but a
     4.5-unit ladder with four rungs does not read as climbable. */
  const span = len * 0.80;
  const rungCount = clamp(Math.round(span / 0.42) + 1, CFG.board.ladderRungs, 10);

  const parts = [];
  const rot = new THREE.Matrix4().makeRotationY(Math.atan2(dir.x, dir.z));
  const mid = new THREE.Vector3((A.x + B.x) / 2, 0, (A.z + B.z) / 2);
  const yMid = (A.y + B.y) / 2;

  /* Rails. Local +Y runs the length of the cylinder before it is laid down, so
     grain streaks along y and the side shade comes off local z. */
  const railEnds = [];
  for (const s of [-1, 1]) {
    const m = new THREE.Matrix4()
      .makeTranslation(mid.x + perp.x * hW * s, yMid + railY, mid.z + perp.z * hW * s)
      .multiply(rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    parts.push({ geo: woodRail(railLen, rr, seg + 4, phase + s), matrix: m,
                 color: (x, y, z, c) => {
                   const gr = grainAt((y + railLen / 2) / railLen * 9, phase + s);
                   const side = clamp(0.5 - z / (rr * 2.4), 0, 1);
                   return c.copy(wood).lerp(woodD, 0.08 + 0.34 * gr + 0.42 * side);
                 } });
    for (const e of [-1, 1]) {
      railEnds.push(new THREE.Vector3(
        mid.x + perp.x * hW * s + dir.x * (railLen / 2) * e,
        yMid + railY,
        mid.z + perp.z * hW * s + dir.z * (railLen / 2) * e));
    }
  }

  // posts, so the whole thing stands clear of the tiles
  const postCount = len > 3.2 ? 3 : 2;
  for (const s of [-1, 1]) {
    for (let k = 0; k < postCount; k++) {
      const t = postCount === 2 ? (k ? 0.94 : 0.06) : [0.06, 0.5, 0.94][k];
      const y0 = lerp(A.y, B.y, t);
      const px = lerp(A.x, B.x, t) + perp.x * hW * s;
      const pz = lerp(A.z, B.z, t) + perp.z * hW * s;
      parts.push({
        geo: new THREE.CylinderGeometry(rr * 0.62, rr * 0.84, railY, Math.max(5, seg - 2), 1, false),
        matrix: new THREE.Matrix4().makeTranslation(px, y0 + railY / 2, pz),
        color: woodD.clone().lerp(C(0x000000), 0.10),
      });
    }
  }

  // rungs — the same honey wood, ends worn pale where a hand would fall (§7.2)
  const rungR = rr * 0.84;
  const rungs = [];
  for (let k = 0; k < rungCount; k++) {
    const t = 0.10 + (rungCount === 1 ? 0.4 : (0.80 * k) / (rungCount - 1));
    const y0 = lerp(A.y, B.y, t) + railY;
    const cx = lerp(A.x, B.x, t), cz = lerp(A.z, B.z, t);
    const m = new THREE.Matrix4().makeTranslation(cx, y0, cz)
      .multiply(rot).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    parts.push({
      /* 5 height segments, not 1: with a single segment every side vertex sits
         on an end ring, so the "worn pale ends" test caught the WHOLE rung and
         all eight ladders shipped with cream bars instead of honey wood. */
      geo: new THREE.CylinderGeometry(rungR, rungR, W + rr * 0.9, Math.max(5, seg - 1), 5, false),
      matrix: m, name: 'rung' + k,
      color: (x, y, z, c) => {
        if (Math.abs(y) > (W / 2) * 0.86) return c.copy(tipCol);
        const gr = grainAt(y * 6 + k, phase);
        const side = clamp(0.5 - z / (rungR * 2.4), 0, 1);
        return c.copy(wood).lerp(woodD, 0.12 + 0.28 * gr + 0.34 * side);
      },
    });
    rungs.push({ t, pos: new THREE.Vector3(cx, y0, cz) });
  }

  /* Brass caps on the four rail ends (ART §2). They go into ONE merged brass
     mesh shared by all eight ladders — real metalness cannot ride on the wood
     material's vertex colours, and thirty-two separate meshes would cost
     thirty-two draw calls for a detail worth one. */
  for (const p of railEnds) {
    const capM = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)
      .multiply(rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    brassParts.push({ geo: new THREE.CylinderGeometry(rr * 1.30, rr * 1.22, rr * 1.5, Math.max(6, seg - 2), 1, false),
                      matrix: capM });
    brassParts.push({ geo: new THREE.SphereGeometry(rr * 1.16, Math.max(6, seg - 2), 5),
                      matrix: new THREE.Matrix4().makeTranslation(p.x, p.y, p.z) });
  }

  const geo = merge(parts);
  const mesh = new THREE.Mesh(geo, ladderMat);
  mesh.castShadow = tier.shadows === 'soft';
  mesh.name = 'ladder-' + ld.from;

  // the climb line, riding just over the rungs
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const on = smooth(0, 0.14, t) * (1 - smooth(0.86, 1, t));
    pts.push(new THREE.Vector3(
      lerp(A.x, B.x, t), lerp(A.y, B.y, t) + (railY + 0.025) * on, lerp(A.z, B.z, t)));
  }

  const rec = {
    kind: 'ladder', data: ld, mesh, geo, rungs, A, B, dir, perp, len, railY,
    box: corridorOf(A, B, -CFG.board.ladderRail * 4.2),   // the shadow may spread this far
    ranges: geo.userData.ranges,
    baseColor: geo.attributes.color.array.slice(),
    ride: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5),
  };
  ladders.set(ld.from, rec);
  return rec;
}

/* ═════════════════════════════════════════════════════════════════════════
   6. Contact shadows and the ladder-foot glow — one merged mesh each, so the
      whole set of sixteen objects costs two extra draw calls, not thirty-two.
   ═════════════════════════════════════════════════════════════════════════ */

/** Read scene.js's own key light, so the direction a shadow throws in cannot
 *  drift from the rig while the lighting is still being tuned. Falls back to
 *  CFG.lighting.key. az 0 = +Z (toward the camera), increasing toward +X. */
function readKeyLight(parent) {
  let p = null;
  let sc = parent;
  while (sc?.parent) sc = sc.parent;
  sc?.traverse?.((o) => { if (!p && o.isDirectionalLight && o.name === 'key') p = o.position; });
  let x, z;
  if (p) { x = p.x; z = p.z; }
  else {
    const k = CFG.lighting.key;
    const el = (k.elevationDeg || 40) * Math.PI / 180, az = (k.azimuthDeg || 35) * Math.PI / 180;
    x = Math.sin(az) * Math.cos(el); z = Math.cos(az) * Math.cos(el);
  }
  const L = Math.hypot(x, z) || 1;
  SHADOW_OFF.set(-x / L * SHADOW_THROW, 0, -z / L * SHADOW_THROW);
}

/* ART §3: "Every raised object must cast a contact shadow onto the tile beneath
   it — snakes, ladders, tokens, dice. This single change is most of the
   richness." A real shadow map only exists on the high tier (§6.3), and the
   tier a phone actually gets is 'mid', so these baked ribbons are not a
   fallback — they are the shadow most players will ever see, and v1 drew them
   at 17% navy, which is invisible.

   They are MULTIPLIED onto the board rather than alpha-blended over it, which
   is what a shadow physically does: it removes light, it does not add haze.
   The ramp therefore lives in RGB (white = untouched, dark = full shade) and
   is written in linear space so the sRGB encode lands on the value we mean. */
const SH_CORE = [0.50, 0.43, 0.36];    // warm umber, full contact
const SH_EDGE = [1, 1, 1];             // no darkening at all

function buildShadows() {
  const verts = [], cols = [], tris = [];
  /* On the high tier scene.js casts a real soft shadow as well, and two
     shadows for one object is a smudge. There these ribbons drop back to a
     contact darkening under the object; on mid and low, where §6.3 gives the
     board no shadow map at all, they carry the whole job. */
  const gain = CFG.quality.current.shadows === 'soft' ? 0.55 : 1;
  const push = (p, k) => {
    verts.push(p.x, p.y, p.z);
    const kk = clamp(k, 0, 1) * gain;
    for (let i = 0; i < 3; i++) cols.push(s2l(lerp(SH_EDGE[i], SH_CORE[i], kk)));
    cols.push(1);
    return verts.length / 3 - 1;
  };

  /* A ribbon with a FLAT core and a soft penumbra either side. v1 (and this
     module's first v2 pass) ramped from full dark at a single centre line to
     zero at the edge, which is a gradient, not a shadow: the eye reads the
     mean, and the mean of a triangle ramp is a third of its peak. The core is
     now a plateau the width of the object, and only the umbra falls off.
     'box' is the object's own corridor — the throw may not push its shadow
     onto a square the snake does not touch. */
  const ribbon = (samples, coreAt, softAt, darkAt, yAt, box) => {
    let prev = null;
    for (let i = 0; i < samples.length; i++) {
      const { P, side, t } = samples[i];
      const cw = coreAt(t), sw = softAt(t), k = darkAt(t), y = yAt(t);
      let px = P.x + SHADOW_OFF.x, pz = P.z + SHADOW_OFF.z;
      if (box) { px = clamp(px, box.x0, box.x1); pz = clamp(pz, box.z0, box.z1); }
      const at = (o, kk) => push(_v0.set(px + side.x * o, y, pz + side.z * o), kk);
      const cur = { c: at(0, k), li: at(-cw, k), ri: at(cw, k),
                    l: at(-cw - sw, 0), r: at(cw + sw, 0) };
      if (prev) {
        const quad = (a0, a1, b0, b1) => { tris.push(a0, b0, b1, a0, b1, a1); };
        quad(prev.l, prev.li, cur.l, cur.li);
        quad(prev.li, prev.c, cur.li, cur.c);
        quad(prev.c, prev.ri, cur.c, cur.ri);
        quad(prev.ri, prev.r, cur.ri, cur.r);
      }
      prev = cur;
    }
  };

  for (const rec of snakes.values()) {
    const N = 30, samples = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const P = rec.spine.curve.getPointAt(t, new THREE.Vector3());
      const T = rec.spine.curve.getTangentAt(t, new THREE.Vector3()).normalize();
      samples.push({ P, side: new THREE.Vector3(-T.z, 0, T.x).normalize(), t });
    }
    const u0 = rec.body.u0;
    const rAt = (t) => (t < u0 ? rec.headR * 1.15 : rec.rHead * taper((t - u0) / (1 - u0)) + 0.006);
    ribbon(samples,
      (t) => rAt(t) * 0.95,
      (t) => rAt(t) * 1.35 + 0.075,
      (t) => 0.95 * (1 - smooth(0.86, 1, t) * 0.72),
      (t) => rec.spine.curve.getPointAt(t, _v1).y + 0.004,
      rec.spine.box);
  }

  for (const rec of ladders.values()) {
    const hW = CFG.board.ladderWidth / 2;
    /* two rail shadows, not one slab — a ladder's shadow has a hole in it */
    for (const s of [-1, 1]) {
      const N = 12, samples = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        samples.push({
          P: new THREE.Vector3(lerp(rec.A.x, rec.B.x, t) + rec.perp.x * hW * s, 0,
                               lerp(rec.A.z, rec.B.z, t) + rec.perp.z * hW * s),
          side: rec.perp, t,
        });
      }
      ribbon(samples, () => CFG.board.ladderRail * 1.4, () => CFG.board.ladderRail * 2.6,
        () => 0.74, (t) => lerp(rec.A.y, rec.B.y, t) + 0.004, rec.box);
    }
    /* and one under every rung — ART §1, "a visible shadow under each rung" */
    for (const rg of rec.rungs) {
      const samples = [];
      for (let i = 0; i <= 2; i++) {
        const o = (i - 1) * (hW + CFG.board.ladderRail);
        samples.push({
          P: new THREE.Vector3(rg.pos.x + rec.perp.x * o, 0, rg.pos.z + rec.perp.z * o),
          side: rec.dir, t: i / 2,
        });
      }
      ribbon(samples, () => CFG.board.ladderRail * 1.25, () => CFG.board.ladderRail * 1.5,
        (t) => 0.70 * (1 - Math.abs(t - 0.5) * 0.45),
        () => lerp(rec.A.y, rec.B.y, rg.t) + 0.0045, rec.box);
    }
  }

  /* DoubleSide, and it is not decoration: these ribbons are wound with their
     geometric normal pointing DOWN, so with the default FrontSide every snake
     contact shadow and every ladder RAIL shadow was back-face culled and has
     never once appeared on this board. Only the rung strips, which happen to
     run the other way round, ever drew. Same for the foot glows below. */
  shadowMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.MultiplyBlending, side: THREE.DoubleSide,
  });
  shadowMesh = new THREE.Mesh(softMesh(verts, cols, tris), shadowMat);
  shadowMesh.renderOrder = -1;
  shadowMesh.name = 'snl-contact-shadows';
  shadowMesh.frustumCulled = false;
  return shadowMesh;
}

/** The brass rail caps, all thirty-two of them, in one mesh. */
function buildBrass() {
  if (!brassParts.length) return null;
  const white = C(0xffffff);
  for (const p of brassParts) p.color = white;
  brassMat = new THREE.MeshStandardMaterial({
    color: ART.brass, vertexColors: true,
    roughness: MAT.brass.roughness, metalness: MAT.brass.metalness,
    envMapIntensity: MAT.brass.env,
  });
  brassMesh = new THREE.Mesh(merge(brassParts), brassMat);
  brassMesh.castShadow = CFG.quality.current.shadows === 'soft';
  brassMesh.name = 'snl-ladder-brass';
  brassParts = [];
  return brassMesh;
}

function buildFootGlows() {
  const verts = [], cols = [], tris = [];
  const inner = C(CFG.colors.teal), outer = C(CFG.colors.mint);
  /* Softer than v1's numbers: those were written blind, because the fan was
     wound face-down and no one had ever seen the pool render. */
  const bands = [[0, 0.20, inner], [0.52, 0.13, inner], [0.78, 0.17, outer], [1, 0, outer]];
  const SEG = 22, R = 0.44;
  for (const rec of ladders.values()) {
    const c0 = verts.length / 3;
    const { x, y, z } = rec.A;
    // centre
    verts.push(x, y + 0.014, z); cols.push(inner.r, inner.g, inner.b, bands[0][1]);
    for (let b = 1; b < bands.length; b++) {
      const [rad, a, col] = bands[b];
      for (let i = 0; i < SEG; i++) {
        const th = (i / SEG) * Math.PI * 2;
        verts.push(x + Math.cos(th) * R * rad, y + 0.014, z + Math.sin(th) * R * rad);
        cols.push(col.r, col.g, col.b, a);
      }
    }
    const ring = (b) => c0 + 1 + (b - 1) * SEG;
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      tris.push(c0, ring(1) + i, ring(1) + j);
      for (let b = 1; b < bands.length - 1; b++) {
        const a0 = ring(b) + i, a1 = ring(b) + j, b0 = ring(b + 1) + i, b1 = ring(b + 1) + j;
        tris.push(a0, b0, b1, a0, b1, a1);
      }
    }
  }
  glowMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.62,
    side: THREE.DoubleSide,
  });
  glowMesh = new THREE.Mesh(softMesh(verts, cols, tris), glowMat);
  glowMesh.renderOrder = -2;
  glowMesh.name = 'snl-ladder-foot-glow';
  glowMesh.frustumCulled = false;
  return glowMesh;
}

/* One shared light that sweeps up a ladder while animateLadder() runs. Hidden
   at rest, so it costs nothing at rest. */
function buildSweep() {
  const g = new THREE.CircleGeometry(0.30, 20);
  g.rotateX(-Math.PI / 2);
  const cols = new Float32Array(g.attributes.position.count * 4);
  const c = C(CFG.colors.mint);
  for (let i = 0; i < g.attributes.position.count; i++) {
    const a = i === 0 ? 0.85 : 0.0;
    cols[i * 4] = c.r; cols[i * 4 + 1] = c.g; cols[i * 4 + 2] = c.b; cols[i * 4 + 3] = a;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 4));
  sweepMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide,
  });
  sweepMesh = new THREE.Mesh(g, sweepMat);
  sweepMesh.visible = false;
  sweepMesh.renderOrder = 2;
  sweepMesh.name = 'snl-ladder-sweep';
  return sweepMesh;
}

/* ═════════════════════════════════════════════════════════════════════════
   7. Build
   ═════════════════════════════════════════════════════════════════════════ */

/** Build every snake and every ladder and add them to the scene. @returns {THREE.Group} */
export function buildSnakesAndLadders(scene) {
  if (root) return root;
  const parent = scene?.isObject3D ? scene : scene?.scene;

  /* Same lacquer as the body, so a head is not a matte lump on a glossy animal. */
  headMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: MAT.snake.roughness, metalness: 0,
    clearcoat: MAT.snake.clearcoat, clearcoatRoughness: MAT.snake.ccRough,
    envMapIntensity: MAT.snake.env,
  });
  /* Waxed honey wood: a thin varnish coat over a half-rough grain (ART §1). */
  ladderMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: MAT.ladder.roughness, metalness: 0,
    clearcoat: MAT.ladder.clearcoat, clearcoatRoughness: MAT.ladder.ccRough,
    envMapIntensity: MAT.ladder.env,
  });

  root = new THREE.Group();
  root.name = 'snl-snakes-ladders';

  readKeyLight(parent);
  brassParts = [];
  for (const ld of LADDERS) root.add(buildLadder(ld).mesh);
  for (const sn of SNAKES) root.add(buildSnake(sn).group);
  const brass = buildBrass();
  if (brass) root.add(brass);
  root.add(buildShadows());
  root.add(buildFootGlows());
  root.add(buildSweep());

  parent?.add(root);
  bindFrame();

  // the gold rupee numbers are set in Nunito; repaint once the font has landed
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      for (const rec of snakes.values()) rec.skin?.userData?.repaint?.();
    }).catch(() => {});
  }
  return root;
}

function bindFrame() {
  if (frameBound) return;
  frameBound = true;
  const step = (dt) => {
    elapsed += dt;
    if (glowMat) {
      glowMat.opacity = reduced() ? 0.58
        : 0.46 + 0.22 * (0.5 + 0.5 * Math.sin(elapsed * (Math.PI * 2 / 2.6)));
    }
  };
  if (typeof scene3d.onFrame === 'function') { scene3d.onFrame(step); return; }
  const loop = (now) => {                       // stand-alone fallback: one float per frame
    const dt = rafLast ? Math.min(0.1, (now - rafLast) / 1000) : 0;
    rafLast = now; step(dt);
    rafId = requestAnimationFrame(loop);
  };
  if (typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(loop);
}

/* ═════════════════════════════════════════════════════════════════════════
   8. Paths — real THREE.Curves, so tokens3d moves along the exact geometry.
   ═════════════════════════════════════════════════════════════════════════ */

/** @returns {THREE.Curve} head square → tail square, riding on the body. */
export function snakePath(snake) {
  const k = keyOf(snake);
  let rec = snakes.get(k);
  if (!rec) { const sn = SNAKES.find(s => s.from === k); if (sn) rec = buildSnake(sn); }
  return rec ? rec.ride : null;
}

/** @returns {THREE.Curve} foot square → top square, riding over the rungs. */
export function ladderPath(ladder) {
  const k = keyOf(ladder);
  let rec = ladders.get(k);
  if (!rec) { const ld = LADDERS.find(l => l.from === k); if (ld) rec = buildLadder(ld); }
  return rec ? rec.ride : null;
}

/* ═════════════════════════════════════════════════════════════════════════
   9. Animation
   ═════════════════════════════════════════════════════════════════════════ */

/* The tongue is part of the merged head geometry, so a flick is a few dozen
   floats, not a draw call. */
function setTongue(rec, out) {
  if (!rec.headBase || !rec.tongue.length) return;
  rec.tongueOut = out;
  const pa = rec.headMesh.geometry.attributes.position.array;
  const dz = rec.tongueReach * out;
  const dy = -rec.tongueReach * out * 0.12;
  for (const r of rec.tongue) {
    for (let i = r.start; i < r.start + r.count; i++) {
      pa[i * 3] = rec.headBase[i * 3];
      pa[i * 3 + 1] = rec.headBase[i * 3 + 1] + dy;
      pa[i * 3 + 2] = rec.headBase[i * 3 + 2] + dz;
    }
  }
  rec.headMesh.geometry.attributes.position.needsUpdate = true;
}

/* A wave travelling head → tail. The rings are displaced along their own
   lateral axis, which is stored at build time, so this is one multiply-add per
   vertex and no matrix maths at all. */
function setRipple(rec, phase, amp) {
  const { base, lat, tubular, radial } = rec.body;
  const pa = rec.bodyMesh.geometry.attributes.position.array;
  const stride = radial + 1;
  for (let i = 0; i <= tubular; i++) {
    const s = i / tubular;
    const x = s - phase;
    const win = Math.exp(-Math.pow(x / 0.34, 2));                 // a travelling packet
    const off = amp * (0.30 + 0.85 * s) * Math.sin(x * Math.PI * 3.4) * win;
    const bob = off * 0.22;
    const bx = lat[i * 3] * off, bz = lat[i * 3 + 2] * off;
    for (let j = 0; j < stride; j++) {
      const k = (i * stride + j) * 3;
      pa[k] = base[k] + bx;
      pa[k + 1] = base[k + 1] + bob;
      pa[k + 2] = base[k + 2] + bz;
    }
  }
  rec.bodyMesh.geometry.attributes.position.needsUpdate = true;
}

/**
 * The snake reacts. Head turns toward the token, a slow ripple runs down the
 * body, the tongue flicks twice. §9 #16 lunge, #17 slide.
 * Nothing here is loud and nothing here is scary.
 * @param {object|number} snake  a SNAKES entry, or its 'from' square
 * @param {THREE.Vector3|{x,y,z}} [target]  where the token is; defaults to the head square
 * @returns {Promise} resolves after CFG.timing.snakeSlide
 */
export function animateSnake(snake, target) {
  const rec = snakes.get(keyOf(snake));
  if (!rec) return Promise.resolve();
  const rm = reduced();
  const total = D('snakeSlide');
  const lunge = D('snakeLunge');

  // where to look: the token, or the square it just landed on — the same place
  const t = target ? _v0.set(target.x, target.y ?? 0, target.z) : cellVec(rec.data.from, _v0);
  const want = _v1.subVectors(t, rec.headGroup.position).setY(0.14);
  if (want.lengthSq() < 1e-6) want.copy(rec.restFwd);
  want.normalize();
  const blend = _v2.copy(rec.restFwd).lerp(want, 0.55).normalize();
  if (blend.dot(rec.restFwd) < 0.72) blend.copy(rec.restFwd).lerp(want, 0.28).normalize();
  _m4.lookAt(_v3.set(0, 0, 0), _v4.copy(blend).negate(), UP);
  const lookQ = new THREE.Quaternion().setFromRotationMatrix(_m4);
  const restQ = rec.restQ;
  const restP = rec.headGroup.position.clone();
  const fwdWorld = blend.clone();

  const jobs = [];

  // 1 — the head turns, then eases back. Never a snap, never a snarl.
  jobs.push(tw(total, (t01) => {
    const look = t01 < 0.30 ? ease.out(t01 / 0.30)
      : t01 < 0.72 ? 1 : 1 - ease.inOut((t01 - 0.72) / 0.28);
    rec.headGroup.quaternion.copy(restQ).slerp(lookQ, look);
  }, ease.linear));

  // 2 — a short lunge on the same beat as the token leaving the square
  if (lunge > 0) {
    jobs.push(tw(lunge * 3, (t01) => {
      const push = t01 < 0.34 ? ease.back(t01 / 0.34) : 1 - ease.inOut((t01 - 0.34) / 0.66);
      rec.headGroup.position.copy(restP).addScaledVector(fwdWorld, push * rec.headR * 0.42);
    }, ease.linear));
  }

  // 3 — the ripple travels the length of the body
  if (!rm) {
    jobs.push(tw(total, (t01) => {
      const amp = rec.rHead * 0.62 * Math.sin(Math.PI * clamp(t01 * 1.06, 0, 1));
      setRipple(rec, lerp(-0.25, 1.3, t01), amp);
    }, ease.linear));
  } else {
    setRipple(rec, 2, 0);
  }

  // 4 — the tongue, once or twice depending on how much room the beat has
  const flicks = rm ? [0.10] : [0.08, 0.52];
  for (const at of flicks) {
    jobs.push(tw(total, (t01) => {
      const x = (t01 - at) / (rm ? 0.5 : 0.18);
      setTongue(rec, x < 0 || x > 1 ? rec.tongueOut : Math.sin(Math.PI * x));
    }, ease.linear));
  }

  return Promise.all(jobs).then(() => {
    rec.headGroup.quaternion.copy(restQ);
    rec.headGroup.position.copy(restP);
    setTongue(rec, 0);
    setRipple(rec, 2, 0);
  });
}

/* Write one rung's colour straight into the merged buffer. */
function litRung(rec, k, amount) {
  const rs = rec.ranges['rung' + k];
  if (!rs) return;
  const col = rec.geo.attributes.color.array;
  const base = rec.baseColor;
  const g = C(CFG.colors.goldLt);
  for (const r of rs) {
    for (let i = r.start; i < r.start + r.count; i++) {
      col[i * 3] = lerp(base[i * 3], g.r, amount);
      col[i * 3 + 1] = lerp(base[i * 3 + 1], g.g, amount);
      col[i * 3 + 2] = lerp(base[i * 3 + 2], g.b, amount);
    }
  }
  rec.geo.attributes.color.needsUpdate = true;
}

/**
 * The rungs light up bottom to top, leading the eye upward, with one soft light
 * sweeping up the rails. §9 #14 — four ticks, ladderRungTick apart.
 * @returns {Promise} resolves after CFG.timing.ladderClimb
 */
export function animateLadder(ladder) {
  const rec = ladders.get(keyOf(ladder));
  if (!rec) return Promise.resolve();
  const rm = reduced();
  const total = D('ladderClimb');
  const ticks = CFG.board.ladderRungs;                  // always four ticks (§9 #14)
  const n = rec.rungs.length;
  const tickMs = rm ? total / ticks : CFG.timing.ladderRungTick;
  const decay = tickMs * 1.7;
  const bandOf = (k) => Math.min(ticks - 1, Math.floor((k * ticks) / n));

  if (sweepMesh) { sweepMesh.visible = !rm; sweepMat.opacity = 0; }

  const job = tw(total, (t01) => {
    const ms = t01 * total;
    for (let k = 0; k < n; k++) {
      const x = (ms - bandOf(k) * tickMs) / decay;
      litRung(rec, k, (x <= 0 || x >= 1) ? 0 : Math.sin(Math.PI * x) * 0.92);
    }
    if (sweepMesh && !rm) {
      const p = rec.ride.getPointAt(clamp(t01 * 1.04, 0, 1), _v0);
      sweepMesh.position.set(p.x, p.y + 0.02, p.z);
      const s = 0.8 + 0.5 * Math.sin(Math.PI * t01);
      sweepMesh.scale.set(s, 1, s);
      sweepMat.opacity = 0.55 * Math.sin(Math.PI * clamp(t01, 0, 1));
    }
    if (glowMat) glowMat.opacity = lerp(glowMat.opacity, 1, 0.2 * (1 - t01));
  }, ease.linear);

  return job.then(() => {
    for (let k = 0; k < n; k++) litRung(rec, k, 0);
    if (sweepMesh) { sweepMesh.visible = false; sweepMat.opacity = 0; }
  });
}

/* ═════════════════════════════════════════════════════════════════════════
   10. Housekeeping
   ═════════════════════════════════════════════════════════════════════════ */

export function setSnakesLaddersVisible(b) { if (root) root.visible = !!b; }

/** Live draw calls for this module — the probe asserts the budget with it. */
export function drawCallCount() {
  let n = 0;
  root?.traverse((o) => { if (o.isMesh && o.visible) n++; });
  return n;
}

export function disposeSnakesAndLadders() {
  if (typeof scene3d.offFrame === 'function') { /* scene.js owns its own list */ }
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  skipAnimations();
  root?.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const m = o.material;
    if (m) { m.map?.dispose(); if (m !== headMat && m !== ladderMat && m !== brassMat) m.dispose(); }
  });
  headMat?.dispose(); ladderMat?.dispose(); brassMat?.dispose();
  root?.parent?.remove(root);
  root = null; shadowMesh = glowMesh = sweepMesh = brassMesh = null;
  headMat = ladderMat = shadowMat = glowMat = sweepMat = brassMat = null;
  brassParts = [];
  snakes.clear(); ladders.clear();
  frameBound = false;
}

/* Test seam — exported so tests/snakes3d.test.mjs can check the geometry
   without a WebGL context. Not part of the CONTRACT interface. */
export const __test = { taper, costNorm, snakeSpine, snakeBody, snakeRide, cellToWorld, liftAt, CLEAR, FLAT };
