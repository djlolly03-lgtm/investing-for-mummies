/* tokens3d.js — the four player tokens, and above all THE HOP.
 *
 * The hop is the single most important animation in this game. Ludo King's whole
 * feel lives in it: one arc per cell, a crouch before take-off, a stretch at the
 * apex, a squash on landing, a contact shadow that says "this thing left the
 * board". A 6 is 990ms of six felt events, not one tween to a destination.
 *
 * Silhouettes are DESIGN.md §11: matka · diya · chaabi · ghanti (+ Mithu, §10.8).
 * Colour is never the only signal — every piece is a different shape, and every
 * body is normalised to the same height and the same visual mass so nobody at
 * the table feels they were handed the worse piece.
 *
 * Every number here comes from config.js. Every promise resolves, including when
 * it is interrupted — game.js must never be able to deadlock on a token.
 */

import * as THREE from '../vendor/three.module.js';
import CFG from './config.js';
import { cellToWorld } from './board3d.js';
import { onFrame, offFrame } from './scene.js';
import { ease, clamp, lerp, damp, emitter, prefersReducedMotion } from './util.js';

const TK  = CFG.tokens;
const TIM = CFG.timing;
const EAS = CFG.easing;
const COL = CFG.colors;

/* Reduced motion: 120ms fade-move per cell. DESIGN.md §9 halves hopPerCell to
   82ms, which is too fast for four people to count together — the whole point of
   keeping one step per cell. 120 is the shipped number. Stated in the report. */
const RM_HOP = 120;

/** hop · land · rung · slide · slideEnd — game.js hangs sfx off these.
 *  'on(k,fn)' returns its own off(). */
export const tokenEvents = emitter();

/* ═══════════════════════════════════════════════════════════════════════
   state
   ═══════════════════════════════════════════════════════════════════════ */

let group    = null;          // everything this module owns
let sceneRef = null;
let frameFn  = null;
let activeId = null;
let lastT    = 0;

const T         = new Map();  // playerId -> token
const occupancy = new Map();  // cell -> [playerId] in seat order
const cellCache = new Map();  // cell -> THREE.Vector3   (board geometry is static)

let ringTex = null, blobTex = null;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ── the glaze (ART-DIRECTION v2 §1) ─────────────────────────────────────
   config.materials.clay is roughness 0.95 / metalness 0 — unglazed bisque,
   which is what made every piece read as a flat blob: at 0.95 nothing on the
   token catches the key light or the window in the env map, so a token is a
   silhouette filled with one colour. AD v2 asks for glazed ceramic at 0.25.
   These live here rather than in config.js because config.js has another
   owner this session; they belong in CFG.materials.tokenGlaze / tokenBrass
   the moment that file is next opened. Said loudly in the report. */
const GLAZE = {
  clay:  { roughness: 0.25, metalness: 0.00, clearcoat: 1.00, ccRough: 0.075,
           env: 1.15, sheen: 0.30 },
  brass: { roughness: 0.22, metalness: 0.88, clearcoat: 0.45, ccRough: 0.14,
           env: 1.45, sheen: 0.00 },
};

/* ── where the shadow falls ──────────────────────────────────────────────
   Derived from the ONE key light in config (el 40°, az 35°, az 0 = +Z toward
   the camera) so the blob never disagrees with the real cast shadow on high
   tier. The shadow lies opposite the light, elongated along that axis. */
const KEY_EL = ((CFG.lighting?.key?.elevationDeg ?? 40) * Math.PI) / 180;
const KEY_AZ = ((CFG.lighting?.key?.azimuthDeg   ?? 35) * Math.PI) / 180;
const SH_X   = -Math.sin(KEY_AZ);
const SH_Z   = -Math.cos(KEY_AZ);
/* the ground plane is rotated -90° about X, so its local +y maps to world -Z */
const SH_ANG  = Math.atan2(-SH_Z, SH_X);
const SH_RUN  = 1 / Math.tan(KEY_EL);   // horizontal travel per unit of height
const SH_ELON = 1.34;                   // long axis of the contact ellipse

/* Opacity of the ground anchor at rest. Measured on the shipped board: the tile
   under a token is ~233 luma, and this lands the core at ~100 — a mark you can
   see from across a table, which is the whole job. */
const SH_OP = 0.70;
/* How far the mark drifts along the light axis at the top of a hop, in cells.
   A real 40° key would throw it a whole cell away; that is physically true and
   useless, because then the mark no longer says WHICH SQUARE. Kept to a hair,
   just enough that the eye reads "off the board" rather than "moved". */
const SH_DRIFT = 0.09 * SH_RUN;

/* ═══════════════════════════════════════════════════════════════════════
   board queries
   ═══════════════════════════════════════════════════════════════════════ */

/** cellToWorld, cached. Board geometry never moves once built. */
function cw(cell) {
  let p = cellCache.get(cell);
  if (!p) {
    const r = cellToWorld(cell) || { x: 0, y: 0, z: 0 };
    p = new THREE.Vector3(r.x, r.y, r.z);
    cellCache.set(cell, p);
  }
  return p;
}

/** Snakes and ladders hand us a curve, not a square number. Re-home off the
 *  curve's end point so occupancy and the fan stay honest without game.js
 *  having to pass a cell the contract's signature has no room for. */
function nearestCell(pos) {
  let best = 0, bestD = Infinity;
  for (let n = 0; n <= 100; n++) {
    const p = cw(n);
    const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════════
   the fan — multiple tokens on one square never fully overlap (§11)
   ═══════════════════════════════════════════════════════════════════════ */

/** Seat is a function of the player's own index, never of arrival order, so a
 *  token never jumps seat when somebody else lands or leaves. Ludo King re-fans
 *  in under 200ms (timing.tokenFanOut) and the eye never loses a piece. */
function refan(cell) {
  if (cell == null) return;
  const list = occupancy.get(cell) || [];
  const k = list.length;
  for (const id of list) {
    const tk = T.get(id); if (!tk) continue;
    if (k <= 1) { tk.tgtX = 0; tk.tgtZ = 0; tk.tgtScale = 1; continue; }
    const deg = TK.fanAngles[tk.seat % TK.fanAngles.length];
    const r   = TK.fanRadius;
    tk.tgtX = Math.cos(deg * Math.PI / 180) * r;
    tk.tgtZ = Math.sin(deg * Math.PI / 180) * r;
    /* two pieces clear each other at nearly full size; three or four have to
       draw in, or the fan's diagonal gap loses to the token's own girth. */
    tk.tgtScale = k === 2 ? 0.86 : 0.72;
  }
}

function setCell(tk, cell) {
  const old = tk.cell;
  if (old != null && occupancy.has(old)) {
    const l = occupancy.get(old).filter(id => id !== tk.id);
    l.length ? occupancy.set(old, l) : occupancy.delete(old);
  }
  tk.cell = cell;
  if (cell != null) {
    const l = occupancy.get(cell) || [];
    if (!l.includes(tk.id)) l.push(tk.id);
    occupancy.set(cell, l);
  }
  refan(old); refan(cell);
}

/** Rest position for a token standing on 'cell', including its damped fan seat. */
function restOf(tk, cell, out) {
  const c = cw(cell);
  return out.set(c.x + tk.offX, c.y, c.z + tk.offZ);
}

/* ═══════════════════════════════════════════════════════════════════════
   geometry — one merged body per token, so one draw call each
   ═══════════════════════════════════════════════════════════════════════ */

function paint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Minimal merge — vendor/ has no BufferGeometryUtils and we are not adding one. */
function merge(list) {
  const geos = list.map(g => (g.index ? g.toNonIndexed() : g));
  const total = geos.reduce((s, g) => s + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const [key, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
    const arr = new Float32Array(total * size);
    let o = 0;
    for (const g of geos) {
      const cnt = g.attributes.position.count;
      const a = g.attributes[key];
      if (a) arr.set(a.array.subarray(0, cnt * size), o);
      o += cnt * size;
    }
    out.setAttribute(key, new THREE.BufferAttribute(arr, size));
  }
  geos.forEach(g => g.dispose());
  out.computeBoundingBox();
  return out;
}

/** Round every interior corner of a turned profile. A Channapatna piece is cut
 *  on a lathe with a round-nosed chisel — there is no 90° anywhere on one, and
 *  a hard corner is exactly what made these read as extruded diagram shapes.
 *  Two bezier samples per corner is enough at 20 px; it costs ~2 rings each. */
function chamfer(pts, rad = 0.020, steps = 2) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], v = pts[i], b = pts[i + 1];
    const ax = a[0] - v[0], ay = a[1] - v[1];
    const bx = b[0] - v[0], by = b[1] - v[1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) { out.push(v); continue; }
    /* already a straight run — nothing to round */
    if ((ax * bx + ay * by) / (la * lb) < -0.985) { out.push(v); continue; }
    const da = Math.min(rad, la * 0.45), db = Math.min(rad, lb * 0.45);
    const p1 = [v[0] + (ax / la) * da, v[1] + (ay / la) * da];
    const p2 = [v[0] + (bx / lb) * db, v[1] + (by / lb) * db];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push([u * u * p1[0] + 2 * u * t * v[0] + t * t * p2[0],
                u * u * p1[1] + 2 * u * t * v[1] + t * t * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const lathe = (pts, seg, rad = 0.020) =>
  new THREE.LatheGeometry(
    chamfer(pts, rad).map(p => new THREE.Vector2(Math.max(1e-4, p[0]), p[1])), seg);

/** Glaze gradient. Real glaze pools dark in the foot ring and thins over the
 *  shoulder, and that vertical ramp is most of what separates a fired object
 *  from a filled silhouette. Multiplies the base hue only — never shifts it,
 *  so token identity by colour is untouched. */
function paintG(g, hex, H) {
  const base = new THREE.Color(hex);
  const pos = g.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = clamp(pos.getY(i) / (H || 1), 0, 1);
    const m = 0.60 + 0.52 * Math.pow(y, 0.68);
    c.copy(base).multiplyScalar(m);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** A rounded bead — the tooth of a key, a wing bump. A scaled sphere, because a
 *  box has eight corners this art direction does not allow. */
function bead(rx, ry, rz, seg) {
  return new THREE.SphereGeometry(1, Math.max(8, seg >> 1), Math.max(6, seg >> 2))
    .scale(rx, ry, rz);
}

function buildShape(key, spec, seg) {
  const c = spec.color, d = spec.colorD;
  const parts = [];
  let accent = null;
  let H = 0.62;                       // nominal top, for the glaze ramp
  const half = Math.max(8, seg >> 1);

  /* Every piece is a TURNED profile: a plinth that sits, an undercut waist that
     casts a line of shadow onto its own foot, a swelling body, a lip. */

  if (key === 'diya') {
    /* a stemmed deepak — plinth, turned stem with a collar bead, an oil dish
       with a rolled rim, a pinched lip, and the flame */
    H = 0.60;
    parts.push([lathe([
      [0.000, 0.000], [0.146, 0.000], [0.150, 0.034], [0.104, 0.052],
      [0.062, 0.088], [0.052, 0.156], [0.072, 0.190], [0.056, 0.222],
      [0.090, 0.264], [0.152, 0.322], [0.198, 0.376], [0.208, 0.412],
      [0.194, 0.428], [0.148, 0.390], [0.086, 0.348], [0.032, 0.334],
      [0.000, 0.332],
    ], seg, 0.016), c]);
    /* the pinched lip — half the silhouette */
    parts.push([new THREE.ConeGeometry(0.056, 0.100, half)
      .rotateZ(-Math.PI / 2).translate(0.208, 0.398, 0), d]);
    /* the wick */
    parts.push([lathe([
      [0.000, 0.330], [0.026, 0.336], [0.022, 0.396], [0.000, 0.404],
    ], half, 0.008), d]);
    accent = lathe([
      [0.000, 0.396], [0.040, 0.436], [0.058, 0.482], [0.050, 0.542],
      [0.028, 0.580], [0.000, 0.602],
    ], seg, 0.014);

  } else if (key === 'chaabi') {
    /* tall and thin — plinth, a shaft beaded twice so it is a turned rod and
       not a stick, two rounded teeth, and the bow standing in its own plane */
    H = 0.66;
    parts.push([lathe([
      [0.000, 0.000], [0.144, 0.000], [0.148, 0.032], [0.100, 0.050],
      [0.064, 0.078], [0.056, 0.148], [0.072, 0.178], [0.054, 0.208],
      [0.050, 0.328], [0.070, 0.358], [0.050, 0.386], [0.046, 0.452],
      [0.000, 0.462],
    ], seg, 0.015), c]);
    parts.push([new THREE.TorusGeometry(0.106, 0.042, half, seg)
      .translate(0, 0.514, 0), c]);
    parts.push([bead(0.058, 0.034, 0.030, seg).translate(0.086, 0.118, 0), d]);
    parts.push([bead(0.058, 0.034, 0.030, seg).translate(0.086, 0.214, 0), d]);

  } else if (key === 'ghanti') {
    /* a temple bell: the mouth IS the foot, rolled over so the rim reads as a
       thick lip, then a long waisted skirt, a shoulder and a turned finial */
    H = 0.60;
    parts.push([lathe([
      [0.000, 0.000], [0.196, 0.000], [0.212, 0.026], [0.206, 0.056],
      [0.186, 0.074], [0.188, 0.130], [0.172, 0.212], [0.148, 0.298],
      [0.124, 0.370], [0.112, 0.416], [0.086, 0.442], [0.050, 0.456],
      [0.042, 0.486], [0.062, 0.508], [0.040, 0.536], [0.036, 0.556],
      [0.000, 0.562],
    ], seg, 0.017), c]);
    /* the loop, standing upright the way a bell is carried */
    parts.push([new THREE.TorusGeometry(0.052, 0.024, half, seg)
      .translate(0, 0.596, 0), d]);

  } else if (key === 'mithu') {
    /* the brass parrot — §10.8. She keeps the board busy, she is not an opponent. */
    H = 0.60;
    parts.push([lathe([
      [0.000, 0.000], [0.140, 0.000], [0.144, 0.030], [0.100, 0.048],
      [0.116, 0.086], [0.162, 0.180], [0.176, 0.268], [0.158, 0.352],
      [0.118, 0.408], [0.066, 0.436], [0.000, 0.444],
    ], seg, 0.018), c]);
    parts.push([new THREE.SphereGeometry(0.102, seg, half).translate(0, 0.492, 0), c]);
    parts.push([new THREE.ConeGeometry(0.050, 0.096, half)
      .rotateZ(-Math.PI / 2).translate(0.126, 0.470, 0), d]);
    parts.push([new THREE.ConeGeometry(0.056, 0.300, half)
      .scale(1, 1, 0.52).rotateX(Math.PI - 0.40).translate(0, 0.170, -0.150), d]);

  } else {
    /* matka — the wide-bellied pot, the widest silhouette of the four.
       Plinth · undercut waist · full belly · narrow neck · flared lip. */
    H = 0.62;
    parts.push([lathe([
      [0.000, 0.000], [0.150, 0.000], [0.154, 0.036], [0.112, 0.054],
      [0.130, 0.090], [0.188, 0.176], [0.216, 0.294], [0.198, 0.400],
      [0.140, 0.474], [0.116, 0.516], [0.154, 0.570], [0.148, 0.600],
      [0.098, 0.614], [0.000, 0.618],
    ], seg, 0.019), c]);
    /* the shoulder band — a horizontal hoop, not the upright ring this used to
       draw, so it reads as a cord tied round a pot */
    parts.push([new THREE.TorusGeometry(0.150, 0.017, half, seg)
      .rotateX(-Math.PI / 2).translate(0, 0.472, 0), d]);
  }

  const body = merge(parts.map(([g, hex]) => paintG(g, hex, H)));

  /* Normalise every piece to exactly tokens.height and cap its girth, so the four
     silhouettes differ in shape and never in mass. §6.4 rule 4. */
  const bb = body.boundingBox.clone();
  if (accent) { accent.computeBoundingBox(); bb.union(accent.boundingBox); }
  const h = Math.max(1e-4, bb.max.y);
  let s = TK.height / h;
  const girth = Math.max(Math.abs(bb.max.x), Math.abs(bb.min.x), Math.abs(bb.max.z), Math.abs(bb.min.z)) * s;
  const cap = TK.radius * 1.08;
  if (girth > cap) s *= cap / girth;
  body.scale(s, s, s);
  body.computeBoundingBox();
  if (accent) {
    accent.scale(s, s, s);
    /* a flame is amber at the wick and cream at the tip — one flat cream cone
       was the white sliver in the v1 render */
    accent.computeBoundingBox();
    const y0 = accent.boundingBox.min.y, y1 = accent.boundingBox.max.y;
    const lo = new THREE.Color(COL.gold), hi = new THREE.Color(COL.goldLt);
    const pos = accent.attributes.position, cn = pos.count;
    const arr = new Float32Array(cn * 3), cc = new THREE.Color();
    for (let i = 0; i < cn; i++) {
      const t = clamp((pos.getY(i) - y0) / Math.max(1e-4, y1 - y0), 0, 1);
      cc.copy(lo).lerp(hi, Math.pow(t, 0.65)).multiplyScalar(1.06);
      arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b;
    }
    accent.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  return { body, accent };
}

/* ═══════════════════════════════════════════════════════════════════════
   materials — warm, soft clearcoat sheen, a light rim
   ═══════════════════════════════════════════════════════════════════════ */

function bodyMaterial(spec, tier) {
  const brass = spec.material === 'brass';
  const m = GLAZE[brass ? 'brass' : 'clay'];
  const common = {
    vertexColors: true, transparent: true, opacity: 1,
    roughness: m.roughness, metalness: m.metalness,
    envMapIntensity: m.env,
  };
  if (tier === 'low') return new THREE.MeshStandardMaterial(common);
  const mat = new THREE.MeshPhysicalMaterial({
    ...common,
    clearcoat: m.clearcoat, clearcoatRoughness: m.ccRough,
    specularIntensity: 1.0,
  });
  /* a warm sheen on the glaze only — it is the soft bloom a fired surface has
     just off the specular dot, and it is what stops a ceramic reading as vinyl */
  if (m.sheen) {
    mat.sheen = m.sheen;
    mat.sheenRoughness = 0.45;
    mat.sheenColor = new THREE.Color(COL.keyLight);
  }
  return mat;
}

/** A real fresnel rim on the silhouette edge — the thing that lifts a token off
 *  a cream board without inventing a colour or adding a light. Weighted toward
 *  the upper silhouette, because that is where a window would actually catch. */
function rimMaterial(spec) {
  /* the piece's own hue pushed toward the key light: coloured, so four tokens
     separate from each other as well as from the board, but never a new hue */
  const col = new THREE.Color(spec?.color ?? COL.keyLight)
    .lerp(new THREE.Color(COL.keyLight), 0.52);
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor:  { value: col },
      uPower:  { value: 2.4 },
      uAmount: { value: 0.78 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vUp;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vUp = normalize(mat3(modelMatrix) * normal).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uPower; uniform float uAmount;
      varying vec3 vN; varying vec3 vV; varying float vUp;
      void main() {
        float f = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float up = smoothstep(-0.70, 0.50, vUp);
        gl_FragColor = vec4(uColor, pow(f, uPower) * uAmount * mix(0.30, 1.0, up));
      }`,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.FrontSide,
  });
}

/* ── generated textures (no asset files anywhere in this game) ───────── */

function radialTex(draw, size = 128) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** A contact shadow, not a haze. Three zones, and the first two are the whole
 *  point: a dense core narrower than the foot, so the piece SITS; a mid band of
 *  occlusion where the belly overhangs; then a wide, faint penumbra.
 *
 *  The mid band is what was missing. v1 was one 95%-opaque disc out to 0.55 of
 *  the plane — the diya stood in a burn mark. The rebuild over-corrected: past
 *  0.40 of the radius it fell straight to 0.34 and then 0.13, so ~78% of the
 *  mark's AREA carried under a third of its alpha and the whole thing measured
 *  as a 7.5% grey haze on cream. On a 33 px phone cell the only part you could
 *  actually see was ~3 px wide. Now the fall-off starts later and is steeper:
 *  a legible dark ellipse with a soft edge, not a bruise and not a fog. */
function blobTexture() {
  return blobTex || (blobTex = radialTex((g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.38, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.52, 'rgba(255,255,255,0.74)');
    grd.addColorStop(0.66, 'rgba(255,255,255,0.42)');
    grd.addColorStop(0.82, 'rgba(255,255,255,0.15)');
    grd.addColorStop(0.92, 'rgba(255,255,255,0.05)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }, 96));
}

/** Two concentric bands: the active state is legible as a SHAPE, not a hue, so
 *  it survives a washed-out projector and one man in twelve. AD v2 asks for a
 *  warm ground ring that does not shout, so the bands sit on a very faint warm
 *  wash rather than on nothing — a lit patch of table, not a HUD element. */
function ringTexture() {
  return ringTex || (ringTex = radialTex((g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.00, 'rgba(255,255,255,0.16)');
    grd.addColorStop(0.42, 'rgba(255,255,255,0.13)');
    grd.addColorStop(0.52, 'rgba(255,255,255,0.58)');
    grd.addColorStop(0.62, 'rgba(255,255,255,0.12)');
    grd.addColorStop(0.75, 'rgba(255,255,255,0.92)');
    grd.addColorStop(0.87, 'rgba(255,255,255,0.24)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }, 128));
}

function flatPlane(size, tex, hex, opacity) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: tex, color: hex, transparent: true, opacity,
      depthWrite: false, toneMapped: false,
    }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

/* ═══════════════════════════════════════════════════════════════════════
   build
   ═══════════════════════════════════════════════════════════════════════ */

function resolveSpec(p, i) {
  const list = TK.players;
  if (p && typeof p.token === 'object' && p.token && p.token.color != null) return p.token;
  const key = typeof p?.token === 'string' ? p.token : null;
  if (key) {
    const hit = list.find(s => s.key === key || s.id === key);
    if (hit) return hit;
    if (key === TK.bot.key || key === TK.bot.id) return TK.bot;
  }
  if (p?.isBot) return TK.bot;
  return list.find(s => s.id === p?.id) || list[i % list.length];
}

/**
 * @param {THREE.Scene} scene
 * @param {Array} players  rules.js players: { id, name, token, isBot }
 */
export function buildTokens(scene, players = []) {
  disposeTokens();
  sceneRef = scene;
  cellCache.clear();
  group = new THREE.Group();
  group.name = 'tokens';
  scene.add(group);

  const q = CFG.quality.current || {};
  const seg  = Math.max(8, q.tokenSeg || 16);
  const tier = q.tier || 'mid';

  players.forEach((p, i) => {
    const spec = resolveSpec(p, i);
    const { body, accent } = buildShape(spec.key, spec, seg);

    const root = new THREE.Group();
    const mat  = bodyMaterial(spec, tier);
    const mesh = new THREE.Mesh(body, mat);
    mesh.castShadow = q.shadows === 'soft';
    mesh.receiveShadow = false;
    root.add(mesh);

    let acc = null;
    if (accent) {
      acc = new THREE.Mesh(accent, new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 1, toneMapped: false,
      }));
      root.add(acc);
    }

    let rim = null;
    if (tier !== 'low') {
      rim = new THREE.Mesh(body, rimMaterial());
      rim.scale.setScalar(1.004);
      rim.renderOrder = 3;
      root.add(rim);
    }

    const ground = new THREE.Group();
    /* The shadow is the hop's ground anchor and therefore outranks everything
       else on the tile — it sits ABOVE the active ring, both in height and in
       draw order. When the glow ring painted over it, the one token that ever
       hops was the one token with no mark on the board. */
    const shadow = flatPlane(TK.contactShadow * 2, blobTexture(), 0x241a12, SH_OP);
    shadow.position.y = 0.010;
    shadow.renderOrder = 4;
    /* an ellipse, lying along the key light's axis — a round blob under a raking
       45° light is the giveaway that nothing here is really lit */
    shadow.rotation.z = SH_ANG;
    ground.add(shadow);

    const ring = flatPlane(TK.activeRing * 2.1, ringTexture(), spec.color, 0);
    ring.position.y = 0.005;
    ring.renderOrder = 1;
    ground.add(ring);

    /* the Bura Waqt Fund rides beside her token, visible to the whole table (§10.6) */
    const lotaGeo = merge([paint(lathe([
      [0.000, 0.00], [0.055, 0.01], [0.082, 0.05], [0.070, 0.10],
      [0.042, 0.125], [0.052, 0.145], [0.030, 0.150], [0.000, 0.150],
    ], Math.max(8, seg >> 1)), COL.brass)]);
    const lota = new THREE.Mesh(lotaGeo, new THREE.MeshStandardMaterial({
      vertexColors: true, transparent: true, opacity: 0,
      roughness: CFG.materials.brass.roughness, metalness: CFG.materials.brass.metalness,
    }));
    lota.scale.setScalar(TK.shieldSize / 0.15);
    lota.visible = false;
    ground.add(lota);

    const flash = flatPlane(TK.activeRing * 2.4, ringTexture(), COL.brass, 0);
    flash.position.y = 0.014;
    flash.renderOrder = 5;   /* above the shadow's new renderOrder 4, as before */
    flash.visible = false;
    ground.add(flash);

    group.add(root, ground);

    T.set(p.id, {
      id: p.id, spec, seat: i, index: i,
      root, ground, mesh, acc, rim, mat, shadow, ring, lota, flash,
      cell: null, groundY: 0,
      offX: 0, offZ: 0, tgtX: 0, tgtZ: 0,
      curScale: 1, tgtScale: 1,
      ringAmt: 0, lotaAmt: 0, shield: false, flashUntil: 0,
      spin: i % 2 ? 1 : -1,
      phase: i * 0.9,
      anim: null, seqId: 0, skip: false,
    });
  });

  /* everyone starts on the pad, already fanned */
  for (const tk of T.values()) { setCell(tk, 0); tk.offX = tk.tgtX; tk.offZ = tk.tgtZ; tk.curScale = tk.tgtScale; }
  for (const tk of T.values()) { restOf(tk, 0, _a); tk.root.position.copy(_a); tk.groundY = _a.y; }

  lastT = now();
  frameFn = tick;
  onFrame(frameFn);
  tick();
  return group;
}

export function disposeTokens() {
  if (frameFn) { try { offFrame(frameFn); } catch { /* scene may be gone */ } frameFn = null; }
  for (const tk of T.values()) {
    if (tk.anim) { const a = tk.anim; tk.anim = null; a.res(false); }
    tk.root.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    tk.ground.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }
  T.clear(); occupancy.clear();
  if (group && group.parent) group.parent.remove(group);
  group = null; activeId = null;
}

/* ═══════════════════════════════════════════════════════════════════════
   the animation engine — one frame callback for the whole module
   ═══════════════════════════════════════════════════════════════════════ */

/** Start an animation on a token. Any animation it replaces resolves 'false',
 *  so no caller can ever be left awaiting a promise that will not settle. */
function play(tk, ms, apply, onDone) {
  if (tk.anim) { const a = tk.anim; tk.anim = null; a.res(false); }
  return new Promise(res => {
    tk.anim = { t0: now(), ms: Math.max(1, ms), apply, onDone, res };
  });
}

/** Run a sequence of animations. A newer sequence supersedes an older one; the
 *  older one unwinds without touching the token. */
async function runSeq(tk, fn) {
  const my = ++tk.seqId;
  tk.skip = false;
  const superseded = () => tk.seqId !== my;
  try { await fn(superseded); } catch (e) { if (CFG.DEBUG) console.error(e); }
  finally {
    if (!superseded()) {
      if (tk.anim) { const a = tk.anim; tk.anim = null; a.res(false); }
      tk.skip = false;
    }
  }
}

/** Finish whatever a token (or everyone) is doing, right now. §14: every
 *  animation in this game is tap-skippable at all times, without exception. */
export function skipTokenAnim(playerId) {
  const list = playerId == null ? [...T.values()] : [T.get(playerId)].filter(Boolean);
  for (const tk of list) {
    tk.skip = true;
    if (tk.anim) {
      const a = tk.anim; tk.anim = null;
      try { a.apply(1, now()); a.onDone?.(); } catch { /* ignore */ }
      a.res(true);
    }
    tk.offX = tk.tgtX; tk.offZ = tk.tgtZ; tk.curScale = tk.tgtScale;
  }
}

function tick() {
  const n = now();
  let dt = (n - lastT) / 1000;
  lastT = n;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.05);
  const rm = prefersReducedMotion();

  for (const tk of T.values()) {
    /* the fan settles under everything else — position is composed, not owned */
    if (rm) { tk.offX = tk.tgtX; tk.offZ = tk.tgtZ; tk.curScale = tk.tgtScale; }
    else {
      tk.offX = damp(tk.offX, tk.tgtX, 16, dt);
      tk.offZ = damp(tk.offZ, tk.tgtZ, 16, dt);
      tk.curScale = damp(tk.curScale, tk.tgtScale, 14, dt);
    }

    const a = tk.anim;
    if (a) {
      const u = clamp((n - a.t0) / a.ms, 0, 1);
      a.apply(u, n);
      if (u >= 1) { tk.anim = null; try { a.onDone?.(); } catch { /* ignore */ } a.res(true); }
    } else {
      restPose(tk, n, rm, dt);
    }
    updateGround(tk, n, rm, dt);
  }
}

/** Idle: the active token bobs, everyone else sits perfectly still. */
function restPose(tk, n, rm, dt) {
  restOf(tk, tk.cell ?? 0, _a);
  tk.groundY = _a.y;
  const isActive = tk.id === activeId;
  /* 0.028 world is 1.3 px on a phone — a per-frame write that delivered no
     "this one is mine" signal. 0.055 is ~2.6 px, legible against a still board
     and still nothing like a hop. */
  const bob = (isActive && !rm)
    ? Math.sin((n / TK.activeRingPulse) * Math.PI * 2 + tk.phase) * 0.055 + 0.055
    : 0;
  tk.root.position.set(_a.x, _a.y + bob, _a.z);
  _q.identity();
  tk.root.quaternion.slerp(_q, 1 - Math.exp(-12 * dt));
  const s = tk.curScale;
  tk.root.scale.set(
    damp(tk.root.scale.x, s, 14, dt),
    damp(tk.root.scale.y, s, 14, dt),
    damp(tk.root.scale.z, s, 14, dt));
  setOpacity(tk, 1);
}

/** Shadow, active ring, lota. All of it lives on the tile plane, never on the
 *  token, so it is untouched by squash and tilt. */
function updateGround(tk, n, rm, dt) {
  const p = tk.root.position;
  tk.ground.position.set(p.x, tk.groundY, p.z);

  /* THE GROUND ANCHOR. This is the thing that makes a hop read as a hop (§6.1),
     and it is a readability rule before it is a physics one.
     Mid-hop the token is drawn 0.5-0.7 of a cell above the square it is on, and
     its own body is another 0.4 of a cell tall, so an airborne piece physically
     overlaps the row above it. The only thing that stops a player reading it as
     standing there is this mark, so:
       · it stays UNDER the piece, on the tile, all the way through the arc;
       · it SHRINKS as she climbs — a smaller mark plus a bigger gap is how the
         eye reads height. It must not fade while it does that, which is the
         mistake the shipped version made: it grew AND thinned, so at the apex
         the anchor was a wide 16%-alpha ghost and the board was ambiguous;
       · it drifts a hair along the light axis, and no further — a physically
         honest 40° key would throw it a whole cell away and it would stop
         answering the only question it exists to answer. */
  const lift = clamp((p.y - tk.groundY) / (TK.hopArc || 0.55), 0, 1.4);
  const l    = clamp(lift / 1.30, 0, 1);
  const sc   = tk.curScale * (1 - 0.32 * l);
  tk.shadow.scale.set(sc * SH_ELON, sc, 1);
  tk.shadow.material.opacity = SH_OP * (1 - 0.12 * l);
  tk.shadow.position.set(SH_X * SH_DRIFT * l, 0.010, SH_Z * SH_DRIFT * l);

  const wantRing = tk.id === activeId ? 1 : 0;
  tk.ringAmt = rm ? wantRing : damp(tk.ringAmt, wantRing, 9, dt);
  const pulse = rm ? 1 : 1 + Math.sin((n / TK.activeRingPulse) * Math.PI * 2 + tk.phase) * 0.075;
  tk.ring.material.opacity = tk.ringAmt * 0.82;
  tk.ring.scale.set(pulse, pulse, 1);
  tk.ring.visible = tk.ringAmt > 0.01;

  const wantLota = tk.shield ? 1 : 0;
  tk.lotaAmt = rm ? wantLota : damp(tk.lotaAmt, wantLota, 10, dt);
  tk.lota.visible = tk.lotaAmt > 0.02;
  if (tk.lota.visible) {
    const ang = tk.phase + (rm ? 0 : n / 2600);
    tk.lota.position.set(Math.cos(ang) * TK.shieldOrbit, 0.02 + (rm ? 0 : Math.sin(n / 900 + tk.phase) * 0.012),
      Math.sin(ang) * TK.shieldOrbit + 0.04);
    tk.lota.material.opacity = tk.lotaAmt;
    tk.lota.rotation.y = -ang;
  }

  if (tk.flash.visible) {
    const k = clamp((tk.flashUntil - n) / TIM.shieldRing, 0, 1);
    const e = ease.out(1 - k);
    tk.flash.scale.set(0.5 + e * 1.1, 0.5 + e * 1.1, 1);
    tk.flash.material.opacity = k * 0.95;
    if (k <= 0) tk.flash.visible = false;
  }
}

function setOpacity(tk, v) {
  if (tk.mat.opacity !== v) tk.mat.opacity = v;
  if (tk.acc) tk.acc.material.opacity = v;
  if (tk.rim) tk.rim.material.uniforms.uAmount.value = 0.62 * v;
}

/* ═══════════════════════════════════════════════════════════════════════
   THE HOP
   ═══════════════════════════════════════════════════════════════════════ */

/** Landing squash and the next take-off crouch are the same beat, which is why
 *  a run of hops reads as one bouncing gait instead of six separate jumps. */
function squashAt(u) {
  /* The compressed pose is HELD for ~12ms and then unwound over ~48ms (§9 #13's
     "60 ms recovery"). A sine through the extreme renders it for one frame and
     reads as a bounce; a hold reads as weight. */
  if (u < 0.36) {
    const k = 1 - ease.out(clamp((u - 0.07) / 0.29, 0, 1));
    return [1 + (TK.squash[0] - 1) * k, 1 - (1 - TK.squash[1]) * k];
  }
  if (u < 0.70) { const k = Math.sin(((u - 0.36) / 0.34) * Math.PI); return [1 - 0.055 * k, 1 + 0.075 * k]; }
  const k = ease.in((u - 0.70) / 0.30);
  return [1 + (TK.squash[0] - 1) * k, 1 - (1 - TK.squash[1]) * k];
}

function hopAnim(tk, from, to, isLast) {
  const p0 = tk.root.position.clone();
  const gy0 = tk.groundY;
  /* The last hop is the one that ends the move, so it is the tallest. Measured
     on the shipped build (390 px phone, camera elevation 48°): an ordinary hop
     apexes ~0.5 of a cell above its ground mark and this one ~0.7 — REF-LUDOKING
     §3's band is 0.5-0.8, so both sit inside it and the sixth hop of a six is
     visibly the one that ends the move. Do not raise it further: past ~0.8 of a
     cell the piece overlaps the row two above and the eye stops believing the
     ground mark. */
  const arc = TK.hopArc * (isLast ? 1.38 : 1);
  const easeH = ease[EAS.hop] || ease.inOut;
  const spin = tk.spin;
  return (u) => {
    restOf(tk, to, _b);
    const e = easeH(u);
    const x = lerp(p0.x, _b.x, e), z = lerp(p0.z, _b.z, e);
    const gy = lerp(gy0, _b.y, e);
    tk.groundY = gy;
    /* Not a symmetric parabola. 4u(1-u) rises and falls at the same speed, which
       reads as floating. Warping the sine's phase by u^1.22 puts the apex at
       ~57% of the hop, so the fall is shorter than the rise and the landing
       arrives with acceleration behind it. */
    tk.root.position.set(x, gy + arc * Math.sin(Math.PI * Math.pow(u, 1.22)), z);

    /* lean into the direction of travel, plus a hair of yaw so no two hops in a
       run are the exact same picture */
    _c.set(_b.x - p0.x, 0, _b.z - p0.z);
    const len = _c.length();
    if (len > 1e-4) {
      _ax.set(_c.z / len, 0, -_c.x / len);
      _q.setFromAxisAngle(_ax, Math.sin(Math.PI * u) * 0.20);
    } else _q.identity();
    _q2.setFromAxisAngle(UP, Math.sin(Math.PI * 2 * u) * 0.10 * spin);
    tk.root.quaternion.copy(_q).multiply(_q2);

    const [sxz, sy] = squashAt(u);
    const s = tk.curScale;
    tk.root.scale.set(s * sxz, s * sy, s * sxz);
  };
}

/** The extra beat on arrival. A move ends with a small, felt thud — this is what
 *  tells a player she is THERE, and it is why the last hop is worth 110ms. */
function settleAnim(tk) {
  const base = tk.root.position.clone();
  return (u) => {
    /* hold the arrival compression for the first 20% (~39ms), then unwind.
       ease.settle() was already at 0.57 by frame 3, so the promised 0.82 never
       rendered — the arrival looked identical to a pass-through. */
    const e = u < 0.20 ? 0 : ease.out((u - 0.20) / 0.80);
    const s = tk.curScale;
    tk.root.scale.set(s * lerp(1.16, 1, e), s * lerp(0.82, 1, e), s * lerp(1.16, 1, e));
    tk.root.position.set(base.x, base.y, base.z);
    _q.identity();
    tk.root.quaternion.slerp(_q, ease.out(u));
  };
}

function fadeMove(tk, to) {
  const p0 = tk.root.position.clone();
  return (u) => {
    restOf(tk, to, _b);
    tk.groundY = _b.y;
    if (u < 0.5) { setOpacity(tk, lerp(1, 0.35, u / 0.5)); tk.root.position.copy(p0); }
    else { setOpacity(tk, lerp(0.35, 1, (u - 0.5) / 0.5)); tk.root.position.copy(_b); }
    const s = tk.curScale;
    tk.root.scale.set(s, s, s);
  };
}

/**
 * One hop per cell, exactly like Ludo King. Never a tween to the destination.
 * @param {string} playerId
 * @param {number[]} cells   the path from rules.js, one entry per square crossed
 * @param {object} [opts]    { onHop(cell, i, total), onLand(cell) } — optional;
 *                           the same beats are also on 'tokenEvents'.
 */
export function hopAlong(playerId, cells, opts = {}) {
  const tk = T.get(playerId);
  if (!tk) return Promise.resolve();
  const path = (cells || []).filter(c => Number.isFinite(c));
  if (!path.length) return Promise.resolve();

  return runSeq(tk, async (superseded) => {
    const rm = prefersReducedMotion();
    const total = path.length;
    for (let i = 0; i < total; i++) {
      if (superseded()) return;
      if (tk.skip) break;
      const from = tk.cell, to = path[i], last = i === total - 1;
      setCell(tk, to);
      const ms = rm ? RM_HOP : TIM.hopPerCell * (last ? 1.28 : 1);
      const ok = await play(tk, ms, rm ? fadeMove(tk, to) : hopAnim(tk, from, to, last));
      if (!ok || superseded()) return;
      /* the tik fires on contact, and rises 1.5 semitones per cell (§8) */
      const beat = { playerId, cell: to, index: i, total, last };
      tokenEvents.emit('hop', beat);
      try { opts.onHop?.(to, i, total); } catch (e) { if (CFG.DEBUG) console.error(e); }
    }
    if (superseded()) return;

    const end = path[total - 1];
    if (tk.cell !== end) setCell(tk, end);
    if (tk.skip) {
      restOf(tk, end, _a); tk.root.position.copy(_a); tk.groundY = _a.y;
      setOpacity(tk, 1);
    } else if (!rm) {
      await play(tk, TIM.tokenSquash * 1.85, settleAnim(tk));
      if (superseded()) return;
    }
    tokenEvents.emit('land', { playerId, cell: end });
    try { opts.onLand?.(end); } catch (e) { if (CFG.DEBUG) console.error(e); }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   THE SNAKE SLIDE — a slip, never a punishment
   ═══════════════════════════════════════════════════════════════════════ */

const curveOk = (c) => !!(c && typeof c.getPointAt === 'function');

function curveEndCell(curve) {
  const p = curve.getPointAt(1, new THREE.Vector3());
  return nearestCell(p);
}

/** @param {THREE.Curve} curve  from snakes3d.snakePath() */
export function slideAlong(playerId, curve, ms) {
  const tk = T.get(playerId);
  if (!tk) return Promise.resolve();
  if (!curveOk(curve)) return Promise.resolve();
  const toCell = curveEndCell(curve);

  return runSeq(tk, async (superseded) => {
    if (prefersReducedMotion()) {
      setCell(tk, toCell);
      await play(tk, CFG.reduced.fadeAndPlace, fadeMove(tk, toCell));
      if (!superseded()) tokenEvents.emit('slideEnd', { playerId, cell: toCell });
      return;
    }

    const dur = Math.max(200, ms || TIM.snakeSlide);
    const easeS = ease[EAS.snakeSlide] || ease.inOut;
    const p0 = tk.root.position.clone();
    const pt = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3();
    let lastYaw = null, bank = 0;

    const ok = await play(tk, dur, (u, n) => {
      const e = easeS(u);
      curve.getPointAt(e, pt);
      curve.getTangentAt(e, tan);

      /* the first 12% eases out of where she actually stood, so the token is
         never seen to jump onto the snake's back */
      const blend = ease.out(clamp(u / 0.12, 0, 1));
      pt.lerpVectors(p0, pt, blend);

      side.set(-tan.z, 0, tan.x);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();

      /* the nervous little wobble — zero at both ends, comic in the middle */
      const win = Math.sin(Math.PI * u);
      const wob = Math.sin(u * Math.PI * 2 * 5.2 + tk.phase) * 0.055 * win;
      tk.root.position.set(pt.x + side.x * wob, pt.y + 0.018, pt.z + side.z * wob);
      tk.groundY = lerp(p0.y, cw(toCell).y, ease.out(u));

      /* bank into the turns */
      const yaw = Math.atan2(tan.x, tan.z);
      let d = 0;
      if (lastYaw !== null) { d = yaw - lastYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; }
      lastYaw = yaw;
      bank = lerp(bank, clamp(d * 9, -0.42, 0.42), 0.22);

      _q.setFromAxisAngle(UP, yaw);
      _q2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank + Math.sin(u * Math.PI * 2 * 5.2 + tk.phase) * 0.12 * win);
      tk.root.quaternion.copy(_q).multiply(_q2);
      _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), clamp(-tan.y * 0.55, -0.34, 0.34) * win);
      tk.root.quaternion.multiply(_q2);

      const s = tk.curScale;
      const st = 1 + Math.sin(u * Math.PI * 2 * 5.2 + tk.phase) * 0.035 * win;
      tk.root.scale.set(s / st, s * st, s / st);
    });
    if (!ok || superseded()) return;

    setCell(tk, toCell);
    await play(tk, TIM.tokenSquash * 2.2, settleAnim(tk));
    if (superseded()) return;
    tokenEvents.emit('slideEnd', { playerId, cell: toCell });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   THE LADDER CLIMB — step, step, step. Never a glide.
   ═══════════════════════════════════════════════════════════════════════ */

/** @param {THREE.Curve} curve  from snakes3d.ladderPath() */
export function climbAlong(playerId, curve, ms) {
  const tk = T.get(playerId);
  if (!tk) return Promise.resolve();
  if (!curveOk(curve)) return Promise.resolve();
  const toCell = curveEndCell(curve);

  return runSeq(tk, async (superseded) => {
    if (prefersReducedMotion()) {
      setCell(tk, toCell);
      await play(tk, CFG.reduced.fadeAndPlace, fadeMove(tk, toCell));
      if (!superseded()) tokenEvents.emit('slideEnd', { playerId, cell: toCell });
      return;
    }

    const total = Math.max(300, ms || TIM.ladderClimb);
    const steps = Math.max(2, CFG.board.ladderRungs || 4);
    const tickMs = total / steps;
    const easeC = ease[EAS.ladderClimb] || ease.inOut;
    const p0 = tk.root.position.clone();
    const pt = new THREE.Vector3(), tan = new THREE.Vector3();
    const gy0 = tk.groundY, gy1 = cw(toCell).y;

    for (let i = 0; i < steps; i++) {
      if (superseded() || tk.skip) break;
      const uA = i / steps, uB = (i + 1) / steps;
      const ok = await play(tk, tickMs, (k) => {
        /* pull (62%), then rest on the rung (38%) — the rest is the rhythm */
        const pull = clamp(k / 0.62, 0, 1);
        const u = lerp(uA, uB, ease.out(pull));
        curve.getPointAt(u, pt);
        curve.getTangentAt(u, tan);
        if (i === 0) pt.lerpVectors(p0, pt, ease.out(clamp(k / 0.30, 0, 1)));

        const lift = Math.sin(Math.PI * pull) * 0.045;
        tk.root.position.set(pt.x, pt.y + 0.018 + lift, pt.z);
        tk.groundY = lerp(gy0, gy1, easeC((i + pull) / steps));

        _q.setFromAxisAngle(UP, Math.atan2(tan.x, tan.z));
        _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.14 + Math.sin(Math.PI * pull) * 0.10);
        tk.root.quaternion.copy(_q).multiply(_q2);

        /* the small squash as she takes the weight on each rung */
        const land = pull >= 1 ? ease.out(clamp((k - 0.62) / 0.30, 0, 1)) : 1;
        const c = pull >= 1 ? lerp(0.93, 1, land) : 1;
        const s = tk.curScale;
        tk.root.scale.set(s * (2 - c), s * c, s * (2 - c));
      });
      if (!ok || superseded()) return;
      tokenEvents.emit('rung', { playerId, index: i, total: steps });
    }
    if (superseded()) return;

    setCell(tk, toCell);
    if (tk.skip) { restOf(tk, toCell, _a); tk.root.position.copy(_a); tk.groundY = _a.y; }
    else {
      await play(tk, TIM.tokenSquash * 1.6, settleAnim(tk));
      if (superseded()) return;
    }
    tokenEvents.emit('slideEnd', { playerId, cell: toCell });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   state setters
   ═══════════════════════════════════════════════════════════════════════ */

/** Instant. Used by the probe, by resume, and by reduced-motion placement. */
export function placeAt(playerId, cell) {
  const tk = T.get(playerId);
  if (!tk) return;
  if (tk.anim) { const a = tk.anim; tk.anim = null; a.res(false); }
  tk.seqId++;
  setCell(tk, cell);
  tk.offX = tk.tgtX; tk.offZ = tk.tgtZ; tk.curScale = tk.tgtScale;
  restOf(tk, cell, _a);
  tk.root.position.copy(_a);
  tk.groundY = _a.y;
  tk.root.quaternion.identity();
  tk.root.scale.setScalar(tk.curScale);
  setOpacity(tk, 1);
  tk.ground.position.set(_a.x, _a.y, _a.z);
}

/** The active token bobs and carries a soft ground ring in her own colour, so a
 *  player scanning a board of four pieces always knows which one is hers. */
export function setActive(playerId) {
  activeId = T.has(playerId) ? playerId : null;
}

export function getActive() { return activeId; }

/** The Bura Waqt Fund. Open information, on the board, for everyone (§10.6). */
export function setShield(playerId, on) {
  const tk = T.get(playerId);
  if (tk) tk.shield = !!on;
}

/** The lota absorbs the bite: a brass ring at the token's base, then it is spent. */
export function flashShield(playerId) {
  const tk = T.get(playerId);
  if (!tk) return Promise.resolve();
  tk.flash.visible = true;
  tk.flashUntil = now() + TIM.shieldRing;
  return new Promise(r => setTimeout(r, TIM.shieldRing));
}

/** World position of a token — camera.js follow(), fx.js bursts. */
export function tokenPosition(playerId, out) {
  const tk = T.get(playerId);
  const v = out || new THREE.Vector3();
  return tk ? v.copy(tk.root.position) : v.set(0, 0, 0);
}

export function tokenCell(playerId) { return T.get(playerId)?.cell ?? null; }
export function tokenColor(playerId) { return T.get(playerId)?.spec.color ?? COL.navy; }
export function tokenSpec(playerId)  { return T.get(playerId)?.spec ?? null; }
export function tokensGroup() { return group; }

/** True while any token is mid-animation — window.__SNL.settle() leans on this. */
export function tokensBusy() {
  for (const tk of T.values()) if (tk.anim) return true;
  return false;
}
