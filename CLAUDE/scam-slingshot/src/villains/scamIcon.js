/**
 * villains/scamIcon.js — THE SCAM ICONS, AS PHYSICAL PLAQUES.
 *
 * Students who have played IFM's other game, "Slash the Scam", already know these eight
 * icons. Re-using them here is the cheapest identification this project can buy: a symbol a
 * player has already learned costs zero pixels of teaching. The staged set lives in
 * `assets/scam-*.png` (256 x 256, straight alpha, photoreal 3D renders).
 *
 * ── THE TREATMENT RULE, AND WHY IT IS NOT NEGOTIABLE ─────────────────────────
 * These are 2D icons drawn for a 2D game. Mapped straight onto a villain's body they look
 * exactly like what they are — a sticker on a toy — because a photoreal render lit from its
 * own imaginary key does not agree with the scene's key light, and a decal has no edge.
 *
 * So an icon is NEVER the villain's surface. It is the thing the villain is SELLING, and it
 * is presented the way a salesman presents something: mounted on a PLAQUE. The plaque is
 * real geometry — a bevelled slab with a gold rim, its own thickness, its own cast shadow
 * and its own contour — held, worn or clipped onto the prop the character already carries.
 * The body stays 3D toon; the icon stays a printed picture on a physical card. Those two
 * things are allowed to disagree, because in the fiction they ARE different objects.
 *
 * ── SIZING: base.js's PROP RULE APPLIES TO THE PLAQUE TOO ────────────────────
 * base.js ("SIZING A PROP FOR THE DEVICE IT IS PLAYED ON") measured Lottery Uncle at
 * 14 x 25 CSS px and his cheque at 11 x 6 on a 390 x 844 phone, and concluded that a prop
 * must be WIDER than the villain and must be built from 2-3 hard value bands plus one huge
 * glyph. A plaque obeys that literally:
 *
 *     GOLD RIM      ~9 % of the short side, all the way round — the brightest band, and the
 *                   one thing that still says "a card is mounted here" at 5 px.
 *     NAVY FIELD    the plate. Deliberately DARKER than the house navy so a warm icon has
 *                   somewhere to pop from; it is the darkest thing on the villain.
 *     THE ICON      >= 55 % of the plaque's height. It IS the huge glyph. Nothing else on
 *                   the plate is allowed to compete for that height.
 *     CORAL TELL    optional, 20 % of the height, one short word. Same coral as every other
 *                   "this is the catch" band in the game.
 *
 * ── LOADING NEVER GATES ANYTHING ─────────────────────────────────────────────
 * `buildMesh()` runs synchronously inside a Villain's constructor, so a texture that waits
 * on a fetch cannot exist. Same shape as `ammo/medallion.js`: the canvas is painted
 * IMMEDIATELY with a drawn fallback glyph, the PNG is requested in parallel, and when it
 * lands the canvas is repainted and `needsUpdate` set. A level built before the images
 * arrive is correct and un-branded for a few hundred ms; a level built with the network
 * down is correct and stays drawn. Nothing ever hangs, and no caller has to await anything.
 *
 * `scamIconState()` reports what actually landed, for critics and for the capture harness —
 * it is mirrored on `globalThis.__scamIcons` so a scenario can poll it without an import.
 */

import * as THREE from 'three';
import { RAMP_HARD } from '../art/toon.js';
import { PALETTE } from '../art/materials.js';

// ---------------------------------------------------------------------------
// IMAGE LOADING
// ---------------------------------------------------------------------------

const LOAD_TIMEOUT = 4000;

const _img = new Map();      // name -> Promise<HTMLImageElement|null>
const _state = new Map();    // name -> 'loading' | 'ready' | 'fallback'

/**
 * Request one staged icon. Resolves with the image or with `null`; it never rejects and it
 * never outlives `LOAD_TIMEOUT`, because HOOKS.md's rule is that nothing on a boot path may
 * be gated on a fetch that can stall.
 */
function iconImage(name) {
  if (_img.has(name)) return _img.get(name);
  _state.set(name, 'loading');
  const src = new URL(`../../assets/${name}.png`, import.meta.url).href;
  const p = new Promise((resolve) => {
    let settled = false;
    const finish = (img, note) => {
      if (settled) return;
      settled = true;
      _state.set(name, img ? 'ready' : 'fallback');
      if (!img) console.warn(`[scamIcon] ${name} fell back to the drawn glyph: ${note}`);
      resolve(img);
    };
    const timer = setTimeout(() => finish(null, `timed out after ${LOAD_TIMEOUT}ms`), LOAD_TIMEOUT);
    const img = new Image();
    img.onload = () => { clearTimeout(timer); finish(img); };
    img.onerror = () => { clearTimeout(timer); finish(null, `could not load ${src}`); };
    img.src = src;
  });
  _img.set(name, p);
  return p;
}

/** What actually landed. For critics, and for the capture harness to poll before it shoots. */
export function scamIconState() {
  const out = {};
  for (const [k, v] of _state) out[k] = v;
  return {
    icons: out,
    total: _state.size,
    ready: [..._state.values()].filter(v => v === 'ready').length,
    pending: [..._state.values()].filter(v => v === 'loading').length,
  };
}
if (typeof globalThis !== 'undefined') globalThis.__scamIcons = scamIconState;

// ---------------------------------------------------------------------------
// THE PLATE FACE
// ---------------------------------------------------------------------------

const NAVY_DEEP = '#0e2338';   // lum ~32. The plate. Darker than the house navy (#1a3a5c,
                               // lum 57) on purpose: this is the one surface whose whole job
                               // is to be the floor a bright icon stands on.
const GOLD_C    = '#f6c453';   // lum 198 — the rim, and the same gold as the Ponzi board's
                               // frame, so the three villains' plaques read as one family.
const GOLD_DIM  = '#a8873c';   // lum 138 — the downline's rim. See `dim` below.
const CORAL_C   = '#e76f51';
const CREAM_C   = '#fdf6ec';

/**
 * Drawn glyphs, used when a PNG has not arrived (or never will). They are primitives on
 * purpose — three bars, a card and three flames, a cracked triangle. Each one is built from
 * shapes >= 20 % of the plate so it survives the same downscale the photo has to.
 */
const FALLBACK = {
  'scam-gold': (g, x, y, w, h) => {
    // A stack of three ingots. Trapezoids, because a rectangle at this size is a brick.
    const bar = (cx, cy, bw, bh) => {
      g.beginPath();
      g.moveTo(cx - bw * 0.5, cy + bh * 0.5); g.lineTo(cx + bw * 0.5, cy + bh * 0.5);
      g.lineTo(cx + bw * 0.40, cy - bh * 0.5); g.lineTo(cx - bw * 0.40, cy - bh * 0.5);
      g.closePath(); g.fill(); g.stroke();
    };
    g.fillStyle = GOLD_C; g.strokeStyle = '#8a6a1e'; g.lineWidth = Math.max(2, h * 0.025);
    bar(x + w * 0.50, y + h * 0.80, w * 0.82, h * 0.26);
    bar(x + w * 0.36, y + h * 0.50, w * 0.58, h * 0.26);
    bar(x + w * 0.52, y + h * 0.22, w * 0.50, h * 0.26);
  },
  'scam-cardfire': (g, x, y, w, h) => {
    g.fillStyle = '#cdd6e0'; g.strokeStyle = '#33404f'; g.lineWidth = Math.max(2, h * 0.03);
    g.fillRect(x + w * 0.10, y + h * 0.44, w * 0.80, h * 0.44);
    g.strokeRect(x + w * 0.10, y + h * 0.44, w * 0.80, h * 0.44);
    g.fillStyle = '#191319'; g.fillRect(x + w * 0.10, y + h * 0.50, w * 0.80, h * 0.11);
    g.fillStyle = CORAL_C;
    for (const dx of [0.26, 0.50, 0.74]) {
      g.beginPath();
      g.moveTo(x + w * dx, y + h * 0.06);
      g.lineTo(x + w * (dx + 0.11), y + h * 0.46);
      g.lineTo(x + w * (dx - 0.11), y + h * 0.46);
      g.closePath(); g.fill();
    }
  },
  'scam-ponzi': (g, x, y, w, h) => {
    g.fillStyle = GOLD_C; g.strokeStyle = '#8a6a1e'; g.lineWidth = Math.max(2, h * 0.03);
    g.beginPath();
    g.moveTo(x + w * 0.50, y + h * 0.06);
    g.lineTo(x + w * 0.94, y + h * 0.92);
    g.lineTo(x + w * 0.06, y + h * 0.92);
    g.closePath(); g.fill(); g.stroke();
    // the crack — the whole difference between a pyramid and a Ponzi
    g.strokeStyle = NAVY_DEEP; g.lineWidth = Math.max(3, h * 0.055);
    g.beginPath();
    g.moveTo(x + w * 0.46, y + h * 0.16);
    g.lineTo(x + w * 0.60, y + h * 0.48);
    g.lineTo(x + w * 0.40, y + h * 0.66);
    g.lineTo(x + w * 0.56, y + h * 0.92);
    g.stroke();
  },
};

/** A dark silhouette of an RGBA image, for the icon's contact shadow. */
function silhouette(img, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  return c;
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** Shrink a font until the string fits. Guessing point sizes is how band text overlaps. */
function fitFont(g, text, max, px, family) {
  let n = px;
  for (; n > 7; n -= 2) { g.font = `bold ${n}px ${family}`; if (g.measureText(text).width <= max) break; }
  return n;
}

/**
 * Paint one plate. Called once synchronously with `img = null` (drawn glyph) and again if
 * and when the PNG lands.
 */
function paintPlate(c, name, o, img) {
  const W = c.width, H = c.height;
  const g = c.getContext('2d');
  const S = Math.min(W, H);
  const rimW = S * (o.rimWeight ?? 0.09);
  const rad = S * 0.10;
  const dim = !!o.dim;

  g.clearRect(0, 0, W, H);

  // ---- the plate ---------------------------------------------------------
  g.fillStyle = NAVY_DEEP;
  roundRectPath(g, 0, 0, W, H, rad); g.fill();
  // A one-directional wash so the plate is a lit surface rather than a flat fill. Very low
  // contrast: it must vanish at 6 px instead of muddying the field's value.
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.00)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = grad;
  roundRectPath(g, 0, 0, W, H, rad); g.fill();

  // ---- the tell band, if this plaque carries one -------------------------
  const tellH = o.tell ? Math.round(H * 0.20) : 0;
  if (o.tell) {
    g.save();
    roundRectPath(g, 0, 0, W, H, rad); g.clip();
    g.fillStyle = CORAL_C;
    g.fillRect(0, H - tellH, W, tellH);
    g.restore();
  }

  // ---- THE GLYPH: the icon, or the drawn stand-in ------------------------
  const padX = rimW * 1.35;
  const padT = rimW * 1.20;
  const boxX = padX, boxY = padT;
  const boxW = W - padX * 2;
  const boxH = H - padT - tellH - rimW * 0.85;
  if (img) {
    const k = Math.min(boxW / img.width, boxH / img.height);
    const iw = img.width * k, ih = img.height * k;
    const ix = boxX + (boxW - iw) / 2, iy = boxY + (boxH - ih) / 2;
    // A contact shadow, so the printed picture sits ON the plate instead of floating in it.
    const sh = silhouette(img, iw, ih);
    g.globalAlpha = 0.38;
    g.drawImage(sh, ix + iw * 0.035, iy + ih * 0.045, iw, ih);
    g.globalAlpha = 1;
    g.drawImage(img, ix, iy, iw, ih);
  } else {
    (FALLBACK[name] ?? FALLBACK['scam-ponzi'])(g, boxX, boxY, boxW, boxH);
  }

  // ---- the tell's word, over the band ------------------------------------
  if (o.tell) {
    g.fillStyle = CREAM_C;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const size = fitFont(g, o.tell, W - rimW * 3, Math.round(tellH * 0.62),
      'Georgia, "Times New Roman", serif');
    g.font = `bold ${size}px Georgia, "Times New Roman", serif`;
    g.fillText(o.tell, W / 2, H - tellH * 0.48);
  }

  // ---- the gold rim: the band that has to survive everything -------------
  g.strokeStyle = dim ? GOLD_DIM : GOLD_C;
  g.lineWidth = rimW;
  roundRectPath(g, rimW / 2, rimW / 2, W - rimW, H - rimW, rad * 0.9);
  g.stroke();
  // and a cream hairline just inside it, so the frame reads as printed rather than as glow
  g.strokeStyle = 'rgba(253,246,236,0.55)';
  g.lineWidth = Math.max(1, rimW * 0.16);
  roundRectPath(g, rimW * 1.15, rimW * 1.15, W - rimW * 2.3, H - rimW * 2.3, rad * 0.8);
  g.stroke();

  /**
   * DIM, FOR THE DOWNLINE. The recruits carry the same icon as their boss and must not
   * compete with him: base.js's hierarchy rule is that the biggest, brightest instance of a
   * mark is the one the eye goes to. A flat dark veil pulls the whole plate down the value
   * ramp without changing its hue, so the two plaques still read as the same object — which
   * is the Ponzi joke. Tint, do not desaturate: a grey badge reads as a different scheme.
   */
  if (dim) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(14,28,48,0.46)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }
}

const _tex = new Map();

/**
 * A plaque face carrying one staged scam icon.
 *
 * `opts`: `{ aspect, tell, dim, rimWeight }`. `aspect` is w/h and MUST match the mesh's own
 * w/h or the rim shears — the same discipline the cheque and the statement canvases keep.
 */
export function scamPlaqueTexture(name, opts = {}) {
  const o = { aspect: 1, tell: null, dim: false, ...opts };
  const key = `${name}|${o.aspect}|${o.tell}|${o.dim}|${o.rimWeight ?? ''}`;
  if (_tex.has(key)) return _tex.get(key);

  const H = 512;
  const W = Math.round(H * o.aspect);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;

  paintPlate(c, name, o, null);              // legible NOW, before any fetch resolves
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  _tex.set(key, t);

  iconImage(name).then((img) => {
    if (!img) return;                         // the drawn glyph is already on the plate
    paintPlate(c, name, o, img);
    t.needsUpdate = true;
  });
  return t;
}

// ---------------------------------------------------------------------------
// THE PLAQUE ITSELF — REAL GEOMETRY, NOT A DECAL
// ---------------------------------------------------------------------------

const BEVEL_T = 0.30;    // of the slab's own depth, each side
const BEVEL_S = 0.020;   // of the slab's own width

let _slabGeo = null;
/**
 * A unit rounded slab: 1 x 1 x 1 about the origin, front face toward +z, with a real
 * chamfer on both faces.
 *
 * Authored in a 0..1 box FIRST and translated afterwards, exactly like the Ponzi board's
 * triangle and for the same reason: `ExtrudeGeometry`'s default UV generator bakes the
 * shape's raw XY into the front-cap UVs at construction time, so a 0..1 shape hands the
 * canvas a 1:1 map with no custom generator and `translate()` cannot disturb it. With
 * `bevelOffset` left at 0 the cap ring is the ORIGINAL contour, so the map stays exact and
 * it is the body that flares outward by `BEVEL_S` — which is what makes the chamfer catch a
 * different band of the toon ramp from the face. That highlight along the edge is the whole
 * difference between a slab and a sticker.
 *
 * Group 0 is the caps (the printed face); group 1 is the side walls and the chamfer (the
 * gold rim's own thickness).
 */
function slabGeo() {
  if (_slabGeo) return _slabGeo;
  const r = 0.085;
  const s = new THREE.Shape();
  s.moveTo(r, 0);
  s.lineTo(1 - r, 0); s.quadraticCurveTo(1, 0, 1, r);
  s.lineTo(1, 1 - r); s.quadraticCurveTo(1, 1, 1 - r, 1);
  s.lineTo(r, 1);     s.quadraticCurveTo(0, 1, 0, 1 - r);
  s.lineTo(0, r);     s.quadraticCurveTo(0, 0, r, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 1, curveSegments: 3,
    bevelEnabled: true, bevelThickness: BEVEL_T, bevelSize: BEVEL_S, bevelOffset: 0,
    bevelSegments: 1,
  });
  const total = 1 + BEVEL_T * 2;
  g.translate(-0.5, -0.5, -total / 2);
  g.scale(1, 1, 1 / total);                  // so the caller's `d` is the real world depth
  g.computeVertexNormals();
  _slabGeo = g;
  return g;
}

const _mats = new Map();
function plaqueMaterials(tex, rim) {
  const key = `${tex.uuid}|${rim}`;
  if (!_mats.has(key)) {
    _mats.set(key, [
      new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, gradientMap: RAMP_HARD() }),
      new THREE.MeshToonMaterial({ color: rim, gradientMap: RAMP_HARD() }),
    ]);
  }
  return _mats.get(key);
}

/**
 * A mounted scam-icon plaque, in world units.
 *
 * `w`/`h` must be in the ratio passed to `scamPlaqueTexture` as `aspect`. `ink` follows the
 * rule the cheque and the board already follow: outline weight is a RATIO to what it
 * surrounds, so a plaque — a big flat surface — takes a heavier contour than the body it is
 * mounted on, or its dark plate dissolves into whatever is behind it.
 *
 * `parentScale` exists because a plaque is usually mounted ON another prop, and the props in
 * this game are unit meshes carrying their size in `mesh.scale`. Pass the host's scale and
 * the plaque comes out at the world size you asked for instead of being multiplied by it.
 */
/**
 * FOR MEASUREMENT ONLY — `?noplaque=1` builds every plaque as an empty group.
 *
 * It exists because this is a SHARED working tree with several builders in it at once, and
 * BUILD-CONTEXT's protected-ground rule ("a regression outweighs your gain") is unanswerable
 * without an A/B. A plaque owns no collider, no density and no damage constant, so it cannot
 * move a score — but "cannot" is an argument and this is a measurement. Anyone can now put
 * the two frames side by side instead of taking the argument.
 */
const PLAQUES_OFF = typeof location !== 'undefined'
  && /(?:^|[?&])noplaque=1(?:&|$)/.test(location.search);

export function makeScamPlaque({
  w, h, d, name, aspect, tell = null, dim = false, rimWeight,
  rim = PALETTE.gold, ink = 0.052, parentScale = null,
}) {
  if (PLAQUES_OFF) return new THREE.Group();
  const tex = scamPlaqueTexture(name, { aspect: aspect ?? (w / h), tell, dim, rimWeight });
  const m = new THREE.Mesh(slabGeo(), plaqueMaterials(tex, dim ? 0xb08d43 : rim));
  if (parentScale) m.scale.set(w / parentScale.x, h / parentScale.y, d / parentScale.z);
  else m.scale.set(w, h, d);
  m.castShadow = true;
  m.userData.inkWidth = ink;
  m.userData.scamIcon = name;               // so a critic can find every plaque in a scene
  m.userData.worldSize = { w, h, d };
  return m;
}

/**
 * Mount a plaque on a host prop that is itself a unit mesh carrying its size in `scale`.
 *
 * `at` is in the HOST'S world units (i.e. multiples of the host's own width/height), which
 * is how the call site wants to think — "a third of the way along the cheque" — and the
 * conversion into the host's unit-cube local space happens here, once, instead of being
 * open-coded at three call sites with three chances to get it wrong.
 *
 * `proud` is how far the plaque's own front face stands off the host's, in world units.
 */
export function mountPlaque(host, spec, { x = 0, y = 0, proud = 0.045, rot = 0 } = {}) {
  const p = makeScamPlaque({ ...spec, parentScale: host.scale });
  p.position.set(
    x / host.scale.x,
    y / host.scale.y,
    (0.5 * host.scale.z + spec.d * 0.5 + proud) / host.scale.z,
  );
  p.rotation.z = rot;
  host.add(p);
  return p;
}
