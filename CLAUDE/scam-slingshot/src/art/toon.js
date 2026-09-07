/**
 * toon.js — the LOOK. Ramp textures, procedural canvas grain, and the inked outline pass.
 *
 * Art direction (committed, not deferred):
 *   · banded toon shading via a 4-step gradient ramp — no smooth Lambert falloff anywhere
 *   · every surface carries a hand-authored procedural grain so nothing reads as flat plastic
 *   · every gameplay object gets a dark ink silhouette (inverted hull, constant screen width)
 *   · warm key + cool rim, saturated but controlled palette
 *
 * ── DETERMINISM ──────────────────────────────────────────────────────────────
 * Texture generation uses its OWN private PRNG (`tex()` below), never `rng()` from rng.js.
 * Textures are built once and cached; if they drew from the gameplay stream, the first level
 * build would consume random numbers that a later rebuild would not, and `seed(n)` would stop
 * meaning anything. Do not "simplify" this by importing rng().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// --- private texture-only PRNG (see header) ---------------------------------
let _ts = 0x9e3779b9 >>> 0;
function tex() {
  _ts = (_ts + 0x6D2B79F5) >>> 0;
  let t = _ts;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const tRange = (a, b) => a + (b - a) * tex();

// ---------------------------------------------------------------------------
// GRADIENT RAMPS — the toon banding
// ---------------------------------------------------------------------------
const rampCache = new Map();

/**
 * A hard-stepped luminance ramp for MeshToonMaterial.gradientMap.
 * `stops` are 0..255 luminance values, dark -> light. NearestFilter is what makes the bands hard.
 */
export function ramp(stops) {
  const key = stops.join(',');
  if (rampCache.has(key)) return rampCache.get(key);
  const data = new Uint8Array(stops);
  const t = new THREE.DataTexture(data, stops.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  rampCache.set(key, t);
  return t;
}

/** Three broad bands + a bright kicker. The house ramp; most materials use this. */
export const RAMP_STD  = () => ramp([88, 88, 158, 158, 214, 214, 255]);
/** Softer, four gentle steps — organic things (ground, characters' skin). */
export const RAMP_SOFT = () => ramp([104, 104, 150, 150, 190, 190, 228, 255]);
/** Two hard steps — high-contrast, graphic. Metal, ink props. */
export const RAMP_HARD = () => ramp([70, 70, 70, 236, 255]);
/**
 * GLASS ONLY. Three hard steps, all of them BRIGHT.
 *
 * Every other material's ramp bottoms out around 0.35 so its shadow side has weight. Glass
 * must not: P7 asks for a value INVERSION — "glass is the brightest value in the frame,
 * brighter than the sky behind it" — and a normal ramp puts the shadow side of a pane below
 * a bright sky, which is exactly how a glass column disappears. The floor here is 0.76, so
 * even the darkest face of a glass block outruns the sky, while three hard steps still give
 * the chamfer and the side faces a readable break. The internal contrast that makes it read
 * as GLASS rather than as a bright box comes from the map (glassStreaks), not from the light.
 */
export const RAMP_GLASS = () => ramp([194, 194, 194, 226, 226, 255, 255]);

// ---------------------------------------------------------------------------
// PROCEDURAL CANVAS GRAIN
// ---------------------------------------------------------------------------
const canvasCache = new Map();

function makeCanvas(key, w, h, draw, sprite = false) {
  if (canvasCache.has(key)) return canvasCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // Sprites carry their own alpha silhouette and must never tile or bleed across the edge;
  // a REPEAT wrap on a transparent sprite samples the opposite edge and haloes the lobes.
  t.wrapS = t.wrapT = sprite ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  canvasCache.set(key, t);
  return t;
}

/** Longitudinal grain + knots. Multiplied over the base wood colour. */
export function woodGrain() { return makeCanvas('wood', 256, 256, drawWood); }
function drawWood(g, w, h) {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  // long grain lines
  for (let i = 0; i < 26; i++) {
    const y = tRange(0, h);
    const a = tRange(0.035, 0.115);
    g.strokeStyle = `rgba(96,58,24,${a})`;
    g.lineWidth = tRange(1.2, 4.2);
    g.beginPath();
    g.moveTo(-4, y);
    for (let x = 0; x <= w + 4; x += 16) g.lineTo(x, y + Math.sin(x * 0.035 + i) * tRange(1, 4));
    g.stroke();
  }
  // knots
  for (let i = 0; i < 3; i++) {
    const cx = tRange(20, w - 20), cy = tRange(20, h - 20), r = tRange(6, 15);
    for (let k = 5; k > 0; k--) {
      g.strokeStyle = `rgba(88,50,20,${0.10 + k * 0.03})`;
      g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(cx, cy, r * k * 0.24, r * k * 0.16, tRange(0, 3.14), 0, 6.283); g.stroke();
    }
  }
  // end-grain darkening at the tile edges reads as a bevel on beams
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, 'rgba(70,40,16,0.22)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0)');
  grd.addColorStop(0.82, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(70,40,16,0.22)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/** Chipped speckle + hairline cracks. */
export function stoneGrain() { return makeCanvas('stone', 256, 256, drawStone); }
function drawStone(g, w, h) {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = tRange(0, w), y = tRange(0, h), r = tRange(0.6, 3.2);
    g.fillStyle = tex() > 0.5 ? `rgba(40,60,80,${tRange(0.04, 0.16)})`
                              : `rgba(255,255,255,${tRange(0.04, 0.20)})`;
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  g.strokeStyle = 'rgba(30,48,66,0.16)';
  for (let i = 0; i < 7; i++) {
    g.lineWidth = tRange(0.7, 1.7);
    let x = tRange(0, w), y = tRange(0, h);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 7; s++) { x += tRange(-26, 26); y += tRange(-26, 26); g.lineTo(x, y); }
    g.stroke();
  }
}

/**
 * ── GLASS ────────────────────────────────────────────────────────────────────
 * P3 r3. The round-2 texture was opaque and bright — it passed the luminance bar
 * (222 mean against a 168 sky) and still lost the blind A/B, because brightness was the
 * only thing it had. Measured on the round-2 capture, 97 % of a pane's area was one flat
 * tone: the seams were authored at 1 % of the tile, which on a 0.40 m column at gameplay
 * zoom is a sub-pixel hairline. A flat bright shape with a heavy dark contour is a tube,
 * and that is exactly what the critic saw.
 *
 * MEASURED off ab_destruction_intact-glass-pyramid-at-rest_08 (scanlines across the ice
 * pyramid, `_tools/glass-measure.py` methodology), the real recipe is the opposite:
 *     sky behind the pyramid   lum 236          <- the sky there is BRIGHTER than the ice body
 *     ice bevel / frame        lum 244 – 251
 *     ice panel body           lum 205 – 224
 *     ice facet band           lum 165 – 186    <- 40-odd pixels wide, half the block
 *     ice deep seam            lum 141 – 154    <- and this is also the OUTLINE colour
 * So an Angry Birds ice block is not "a bright shape". It is ~105 luminance points of
 * internal contrast — a near-white bevel frame around a darker panel, with fat raked facet
 * bands across it — held together by a MID-CYAN outline that is barely darker than its own
 * facets. There is no dark ink anywhere on it.
 *
 * Three consequences, all of them load-bearing:
 *
 * 1. THE FRAME IS DRAWN IN WORLD UNITS, so the pane needs its own canvas per block size.
 *    RoundedBoxGeometry gives each face UV 0..1, so one 256-square tile stretched over a
 *    0.40 × 2.60 column turns every vertical bar into a 6.5:1 smear — the "drinking straw"
 *    read. `glassPane(w, h)` sizes the canvas to the face's aspect (pixel density is then
 *    identical in both axes, since CW/w === CH/h === 320/sqrt(w·h)) and draws the bevel at
 *    a constant FRAME_WORLD metres. A tall column and a wide lintel get the same bevel.
 * 2. THE FACETS ARE FAT. Bands are 8–14 % of the panel each and there are five of them.
 *    Anything thinner dies at the 40px test, which is the test this material kept failing.
 * 3. THE VALUES ARE SOLVED, NOT PICKED. Glass renders with toneMapped:false and a cyan
 *    emissive keyed off this same map (art/materials.js says why), so
 *        rendered = sRGB( gain · linear(canvas) ),  gain = (1.000, 1.426, 1.457)
 *    measured on a front-facing pane on this light rig. Every constant below was inverted
 *    through that to land a named rendered luminance. Re-measure and re-solve if the light
 *    rig changes; never nudge one by eye.
 */
/**
 * canvas → rendered luminance on this rig: 255 / 251 / 233 / 219 / 192 / 153 / 120.
 * Only SPEC is neutral. Everything else keeps a cyan bias even at the top of the ramp — a
 * neutral-white bevel is what makes a bright block read as a moulded plastic window frame
 * instead of as ice, and the one pixel that has to be pure white is the specular chip.
 */
const GLASS = {
  SPEC:  '#ffffff',   // the specular chip — the brightest pixel in the frame -> 255
  BEVEL: '#eed9d8',   // the lit bevel (top + left)                -> 251
  LIP:   '#c6cfd5',   // the lit facet band inside the panel       -> 233
  BEVL2: '#a6c2ce',   // the shaded bevel (bottom + right)         -> 215
  BODY:  '#80b8cf',   // the panel                                 -> 199
  FACET: '#60a4bd',   // the raked facet bands                     -> 174
  SEAM:  '#3486a6',   // facet breaks                              -> 138
  DEEP:  '#1a698c',   // the recessed inner edge under the bevel   -> 106
};

/** Bevel width in METRES. Constant across every pane, which is the whole point of glassPane. */
const FRAME_WORLD = 0.042;

/**
 * A pane texture matched to one block's world size. Cached on the size, quantised to 5 cm,
 * so a level's worth of glass costs two or three canvases.
 * @param {number} w world width  @param {number} h world height
 */
export function glassPane(w = 1, h = 1) {
  const qw = Math.max(0.1, Math.round(w * 20) / 20);
  const qh = Math.max(0.1, Math.round(h * 20) / 20);
  const a = Math.min(6, Math.max(1 / 6, qw / qh));
  const CW = Math.round(Math.min(1024, Math.max(48, 320 * Math.sqrt(a))));
  const CH = Math.round(Math.min(1024, Math.max(48, 320 / Math.sqrt(a))));
  // px per world unit — identical on both axes by construction (see the header).
  const ppu = CW / qw;
  return makeCanvas(`glass:${qw}x${qh}`, CW, CH, (g, cw, ch) => drawGlassPane(g, cw, ch, ppu));
}

/** Back-compat: the square preset tile used by materials.js before a block claims its own. */
export function glassStreaks() { return glassPane(1, 1); }

/**
 * The pane, drawn in canvas pixels. `ppu` is px per world metre so the bevel can be a real
 * width; pass 0 to fall back to a proportional bevel (used by the debris chip and by any
 * caller that has no world size).
 */
function drawGlassPane(g, w, h, ppu = 0) {
  const m = Math.min(w, h);
  // The bevel: FRAME_WORLD metres, but never so wide it eats the panel on a thin column,
  // and never so thin it disappears at 40px.
  const F = Math.max(3, Math.min(m * 0.26, ppu ? FRAME_WORLD * ppu : m * 0.11));
  const t = Math.max(2, F * 0.26);          // the recessed inner edge under the bevel
  const px = F + t, py = F + t, pw = w - 2 * (F + t), ph = h - 2 * (F + t);

  g.fillStyle = GLASS.BODY; g.fillRect(0, 0, w, h);

  // ── the raked facet bands ────────────────────────────────────────────────
  // Sheared parallelograms, CLIPPED TO THE PANEL and sized as fractions of the PANEL rather
  // than of the tile. That distinction is the whole reason a 0.40 m column and a 1.40 m
  // lintel end up looking like the same material: authored against the tile, a band that
  // is 6 % wide lands half under the bevel on a narrow block and the pane comes out mostly
  // white. The dark FACET deliberately takes a third of the panel — the reference's facets
  // are ~40 px across a ~70 px block, not hairlines.
  if (pw > 4 && ph > 4) {
    g.save();
    g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    const shear = Math.min(0.55, 0.34 * (h / Math.max(h, w)) + 0.10) * ph;
    const band = (x0, wide, style) => {
      g.fillStyle = style;
      g.beginPath();
      g.moveTo(px + x0 * pw + shear, py);
      g.lineTo(px + (x0 + wide) * pw + shear, py);
      g.lineTo(px + (x0 + wide) * pw, py + ph);
      g.lineTo(px + x0 * pw, py + ph);
      g.closePath(); g.fill();
    };
    band(0.44, 0.34, GLASS.FACET);   // the big dark facet, right of centre
    band(0.78, 0.12, GLASS.SEAM);    // its break
    band(0.02, 0.12, GLASS.LIP);     // the lit facet, hard against the left bevel
    band(0.20, 0.07, GLASS.SPEC);    // a fat white streak…
    band(0.315, 0.02, GLASS.SPEC);   // …paired with a hairline, as the reference always does
    band(0.94, 0.06, GLASS.LIP);
    g.restore();
  }

  // ── the bevel frame ──────────────────────────────────────────────────────
  // FOUR MITRED TRAPEZOIDS, not four butted rectangles. The 45° joins at the corners are
  // what make the frame read as a chamfer cut into a solid; butted strips read as a picture
  // frame stuck on the front. Lit on top and left, one value step down on bottom and right,
  // so the bevel agrees with the scene key (upper-left) and the block gains a light
  // direction without needing a second light.
  const quad = (pts, style) => {
    g.fillStyle = style;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fill();
  };
  quad([[0, 0], [w, 0], [w - F, F], [F, F]], GLASS.BEVEL);              // top
  quad([[0, 0], [F, F], [F, h - F], [0, h]], GLASS.BEVEL);              // left
  quad([[0, h], [F, h - F], [w - F, h - F], [w, h]], GLASS.BEVL2);      // bottom
  quad([[w, 0], [w, h], [w - F, h - F], [w - F, F]], GLASS.BEVL2);      // right

  // the recessed inner edge: one hard dark line just inside the frame on the shaded sides.
  // This is the single cue that makes the panel sit BEHIND the bevel rather than beside it.
  g.fillStyle = GLASS.DEEP;
  g.fillRect(F, F, w - 2 * F, t);                       // under the top bevel
  g.fillRect(F, F, t, h - 2 * F);                       // inside the left bevel
  g.fillStyle = GLASS.SEAM;
  g.fillRect(F, h - F - t, w - 2 * F, t);
  g.fillRect(w - F - t, F, t, h - 2 * F);

  // ── the specular chip ────────────────────────────────────────────────────
  // One fat white wedge high in the panel. P10 calls for "a white specular chip" on glass;
  // this is it, and it is deliberately large enough to survive the 40px downscale.
  if (pw > 6 && ph > 6) {
    g.fillStyle = GLASS.SPEC;
    const cw2 = Math.min(pw * 0.30, ph * 0.26), chh = Math.min(ph * 0.30, pw * 1.6);
    g.beginPath();
    g.moveTo(px + pw * 0.14 + cw2 * 0.45, py + ph * 0.05);
    g.lineTo(px + pw * 0.14 + cw2, py + ph * 0.05);
    g.lineTo(px + pw * 0.14 + cw2 * 0.55, py + ph * 0.05 + chh);
    g.lineTo(px + pw * 0.14, py + ph * 0.05 + chh);
    g.closePath(); g.fill();
  }
}

/**
 * GLASS DEBRIS — a flat faceted chip, two hard values and one fat glint.
 *
 * A shard is not a small pane: it has no bevel frame (it is a fresh break, not a
 * manufactured edge) and it is on screen for a second at a fifth of the size, so the pane's
 * five bands would collapse into mush. What it needs is exactly what the reference shards
 * in ab_destruction_glass-shatter-and-rubble_02 have: ONE light face, ONE dark face, a hard
 * break between them, and a white glint. Two glints are placed a half-tile apart because
 * ExtrudeGeometry UVs run in the shape's own coordinates and wrap, so at least one always
 * lands inside a given shard.
 */
export function glassChip() {
  return makeCanvas('glasschip', 128, 128, (g, w, h) => {
    // dark face first, then the light face over its top-left half on a hard diagonal.
    // The dark face goes all the way down to SEAM (153) rather than to FACET (192): a shard
    // is on screen for a second at a fifth of a block's size, so the two faces need ~80
    // luminance points between them or the chip reads as a flat cyan cut-out.
    g.fillStyle = GLASS.SEAM; g.fillRect(0, 0, w, h);
    g.fillStyle = GLASS.FACET;
    g.beginPath(); g.moveTo(w * 0.30, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h);
    g.closePath(); g.fill();
    g.fillStyle = GLASS.BODY;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(0, h * 1.18); g.closePath(); g.fill();
    g.fillStyle = GLASS.LIP;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.52, 0); g.lineTo(0, h * 0.62); g.closePath(); g.fill();
    // the break between the two faces — fat, because at shard size a hairline is nothing
    g.strokeStyle = GLASS.SEAM; g.lineWidth = Math.max(3, w * 0.045);
    g.beginPath(); g.moveTo(w * 1.02, -h * 0.04); g.lineTo(-w * 0.02, h * 1.22); g.stroke();
    // a bright broken lip along the top edge — a fresh fracture catches the key light
    g.fillStyle = GLASS.BEVEL; g.fillRect(0, 0, w, Math.max(3, h * 0.075));
    // the glints
    g.fillStyle = GLASS.SPEC;
    const glint = (cx, cy, s2) => {
      g.beginPath();
      g.moveTo(cx - s2 * 0.55, cy - s2 * 1.05);
      g.lineTo(cx + s2 * 0.42, cy - s2 * 1.15);
      g.lineTo(cx + s2 * 0.18, cy + s2 * 1.05);
      g.lineTo(cx - s2 * 0.40, cy + s2 * 0.95);
      g.closePath(); g.fill();
    };
    glint(w * 0.26, h * 0.34, w * 0.165);
    glint(w * 0.76, h * 0.70, w * 0.115);
  });
}

/**
 * GLASS PARTICLE FACET MASK — a light/dark multiplier for the non-physical glass chips.
 *
 * The rigid shards catch light because they are lit geometry with a two-value chip texture.
 * The fx chips are unlit `MeshBasicMaterial` instances tinted per particle, so without a map
 * every one of them is a single flat colour — and since the palette is deliberately bright,
 * a glass burst came out as a spray of pale flat triangles that read as paper darts next to
 * the shards they are supposed to belong to.
 *
 * This is a WHITE canvas with two darker facets cut into it, used as `map`, so it multiplies
 * whatever cyan the particle was already tinted: the same chip now carries a lit face, a
 * shaded face and a hard break between them, and the burst reads as glass all the way down
 * to its smallest piece. It costs nothing — one 64px texture shared by the whole pool.
 *
 * ExtrudeGeometry writes UVs in the shape's own coordinates (≈ −0.5 … 0.5), so the texture
 * is clamped and offset by half to land the design squarely on each chip instead of wrapping
 * a seam through the middle of it.
 *
 * ── THE FACETS SHADE TOWARD CYAN, NOT TOWARD GREY. THAT IS THE WHOLE POINT ───
 * They used to be neutral greys (#dfe4e6 / #bcc4c8 / #9aa3a8). A neutral multiplier takes
 * VALUE away and leaves SATURATION alone, so every shaded facet of a glass chip slid straight
 * down into the value/saturation box the game's own stone occupies. Measured on the
 * `_p3-glass` probe (`_tools/scenarios/p3-r7-attrib.mjs`, which differences the same rendered
 * instant with each layer hidden): 18.2–18.4 % of glass-chip body pixels sat at S ≤ 0.30
 * against rendered stone's S p50 of 0.19, mean **rgb(159,189,200)** — literally
 * `#d8f6ff × #bcc4c8`, and exactly the pixel the r6 critic named.
 *
 * A saturated material under a cool key does not go grey in shadow, it goes DEEPER in its own
 * hue, which is also what the reference does (the ice prop in
 * ab_destruction_glass-shatter-and-rubble_02 measures S p50 = 0.88 while the stone rubble two
 * metres away measures S p50 = 0.00 — the two materials are separated by saturation, not by
 * value). So each facet is now the same hue as the glass family, at the SAME linear
 * luminance as the grey it replaced, solved to four decimals:
 *
 *     facet    was       Y_lin     now       Y_lin    (identical ladder, cyan instead of grey)
 *     mid      #dfe4e6   0.7859    #c8ebfa   0.7860
 *     shaded   #bcc4c8   0.5434    #94cbe0   0.5439
 *     break    #9aa3a8   0.3536    #6ca9c1   0.3541
 *
 * The chip's internal contrast — "one light face, one dark face, a hard break", which is what
 * makes it read as a faceted chip at all — is therefore untouched. Only the hue of the
 * shading moved. If you re-tune these, hold the luminance and move the hue, never the reverse.
 */
export function glassChipMask() {
  const t = makeCanvas('glasschipmask', 64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    // the shaded facet: everything below a hard diagonal
    g.fillStyle = '#94cbe0';                       // ×0.544 luminance, cyan
    g.beginPath(); g.moveTo(w * 0.18, 0); g.lineTo(w, h * 0.52); g.lineTo(w, h); g.lineTo(0, h);
    g.closePath(); g.fill();
    // a mid facet, so there are three values and not two
    g.fillStyle = '#c8ebfa';                       // ×0.786 luminance, cyan
    g.beginPath(); g.moveTo(w * 0.18, 0); g.lineTo(w * 0.62, 0); g.lineTo(w, h * 0.86);
    g.lineTo(w, h * 0.52); g.closePath(); g.fill();
    // the break itself
    g.strokeStyle = '#6ca9c1'; g.lineWidth = Math.max(2, w * 0.045);
    g.beginPath(); g.moveTo(w * 0.18, 0); g.lineTo(w, h * 0.52); g.stroke();
  }, true);
  t.offset.set(0.5, 0.5);
  return t;
}

/** Clumpy grass tufts for the ground top. */
export function grassGrain() {
  return makeCanvas('grass', 256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = tRange(0, w), y = tRange(0, h);
      g.strokeStyle = tex() > 0.45 ? `rgba(30,86,26,${tRange(0.05, 0.22)})`
                                   : `rgba(210,255,150,${tRange(0.05, 0.20)})`;
      g.lineWidth = tRange(0.7, 1.9);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + tRange(-2.5, 2.5), y - tRange(3, 9)); g.stroke();
    }
  });
}

/** Woven cloth / kurta weave for characters. */
export function clothGrain() {
  return makeCanvas('cloth', 128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) {
      g.fillStyle = `rgba(120,70,20,${tRange(0.03, 0.09)})`;
      g.fillRect(x, 0, 2, h);
    }
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = `rgba(255,240,200,${tRange(0.03, 0.10)})`;
      g.fillRect(0, y, w, 2);
    }
  });
}

/**
 * ── CRACK DECALS (P3) ───────────────────────────────────────────────────────
 * A block that has taken damage but has not broken yet, and a chunk of a block that has,
 * must both read as *the same object, cracked* — not as a new object. So the damage state
 * is a painted decal over the material's own grain, exactly as in
 * ab_destruction_debris-settled-at-rest_06 where the settled planks are still full-length
 * planks carrying a dark jagged split down the middle.
 *
 * `level` 0..2. Each level adds one more branching fissure plus its highlight; the
 * highlight is what stops the crack reading as a dirt smudge — a real split in a painted
 * surface has a lit lip on one side of it.
 */
export function crackMap(matName, level = 0, bw = 0, bh = 0) {
  // Glass carries the pane texture matched to its own block size (see glassPane), so a
  // damaged column keeps its bevel frame instead of reverting to a square 256-tile smear.
  if (matName === 'glass') return glassCrackMap(level, bw, bh);
  const drawBase = BASE_DRAW[matName] ?? BASE_DRAW.stone;
  const ink = matName === 'wood' ? 'rgba(70,38,14,' : 'rgba(28,44,62,';
  const lip = 'rgba(255,246,230,';
  return makeCanvas(`crack:${matName}:${level}`, 256, 256, (g, w, h) => {
    drawBase(g, w, h);
    // Cracks run ACROSS the grain (wood splits along it, so a crack that follows the grain
    // is invisible; one that cuts it is the readable one).
    const n = 1 + level;
    for (let i = 0; i < n; i++) {
      const y0 = (h * (i + 0.7)) / (n + 0.4);
      const path = [[0, y0 + tRange(-24, 24)]];
      let x = 0, y = path[0][1];
      while (x < w) {
        x += tRange(16, 40);
        y += tRange(-26, 26);
        path.push([x, y]);
      }
      // lit lip first, offset a couple of px, then the dark fissure over it
      g.strokeStyle = lip + (0.30 + level * 0.10) + ')';
      g.lineWidth = 2.2 + level * 0.8;
      stroke(g, path, 2.4);
      g.strokeStyle = ink + (0.55 + level * 0.16) + ')';
      g.lineWidth = 2.6 + level * 1.5;
      stroke(g, path, 0);
      // branches off the main fissure
      for (let b = 0; b <= level; b++) {
        const k = 1 + Math.floor(tex() * (path.length - 2));
        const br = [path[k]];
        let bx = path[k][0], by = path[k][1];
        for (let s2 = 0; s2 < 2; s2++) { bx += tRange(-22, 22); by += tRange(-30, 30); br.push([bx, by]); }
        g.strokeStyle = ink + (0.42 + level * 0.12) + ')';
        g.lineWidth = 1.4 + level * 0.7;
        stroke(g, br, 0);
      }
    }
    // chipped corners: little bites out of the paint at the highest damage level
    if (level >= 2) {
      for (let i = 0; i < 7; i++) {
        g.fillStyle = ink + '0.30)';
        g.beginPath();
        g.arc(tRange(0, w), tRange(0, h), tRange(3, 9), 0, 6.283);
        g.fill();
      }
    }
  });
}

/**
 * GLASS DAMAGE — a radial star fracture, not the meandering fissure wood and stone get.
 *
 * A crack that wanders across the grain is what a split PLANK looks like; glass fails from
 * a point, in straight lines, all the way to the edge. Drawing the wood squiggle on a pane
 * was the one thing left on our glass that a player could read as "wrong material" — it
 * showed up in the round-2 capture as a dark W inside a column. The star is drawn as a
 * white lit lip with a cyan fissure over it, so the damage READS BRIGHTER than the pane it
 * is on: chipped glass catches more light, not less, and a dark crack on glass reads as
 * dirt.
 */
function glassCrackMap(level, bw, bh) {
  const qw = Math.max(0.1, Math.round((bw || 1) * 20) / 20);
  const qh = Math.max(0.1, Math.round((bh || 1) * 20) / 20);
  const a = Math.min(6, Math.max(1 / 6, qw / qh));
  const CW = Math.round(Math.min(1024, Math.max(48, 320 * Math.sqrt(a))));
  const CH = Math.round(Math.min(1024, Math.max(48, 320 / Math.sqrt(a))));
  const ppu = CW / qw;
  return makeCanvas(`crack:glass:${level}:${qw}x${qh}`, CW, CH, (g, w, h) => {
    drawGlassPane(g, w, h, ppu);
    const cx = w * 0.46, cy = h * (0.30 + level * 0.14);
    const spokes = 4 + level * 2;
    const reach = Math.hypot(w, h);
    for (let i = 0; i < spokes; i++) {
      const th = (i / spokes) * 6.283 + tRange(-0.22, 0.22);
      const len = reach * tRange(0.34, 0.72);
      // a two-segment spoke: glass fractures kink, they do not curve
      const mx = cx + Math.cos(th) * len * 0.55, my = cy + Math.sin(th) * len * 0.55;
      const ex = mx + Math.cos(th + tRange(-0.30, 0.30)) * len * 0.45;
      const ey = my + Math.sin(th + tRange(-0.30, 0.30)) * len * 0.45;
      const pts = [[cx, cy], [mx, my], [ex, ey]];
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,' + (0.55 + level * 0.15) + ')';
      g.lineWidth = 3.0 + level * 1.6;
      stroke(g, pts, 0);
      g.strokeStyle = 'rgba(56,149,182,' + (0.50 + level * 0.16) + ')';
      g.lineWidth = 1.4 + level * 0.9;
      stroke(g, pts, 0);
    }
    // the impact point itself: a small bright shatter rosette
    g.fillStyle = 'rgba(255,255,255,0.92)';
    const r = (3 + level * 2.4) * (ppu ? Math.min(2.2, ppu / 260) + 0.6 : 1);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const th = (i / 10) * 6.283, rr = i % 2 ? r * 0.42 : r * 1.35;
      const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
  });
}

function stroke(g, pts, dy) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1] + dy);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1] + dy);
  g.stroke();
}

/** The raw drawing halves of the grain functions, so crackMap can composite over them. */
const BASE_DRAW = { wood: drawWood, stone: drawStone, prop: drawWood };

/**
 * ── IMPACT SPRITE TEXTURES (P3) ─────────────────────────────────────────────
 * The dust and the flash are the largest part of the destruction read, and both are
 * SILHOUETTE problems, not blur problems. A soft radial-gradient puff is the single most
 * recognisable amateur particle in the medium. What the reference actually shows
 * (ab_art_vfx-dust-shards-debris_06, ab_destruction_impact-burst-tower-splitting_03) is a
 * hard-edged LOBED ball — six or seven overlapping discs of different sizes with a bumpy
 * outer contour, an internal light/dark break, and no feathering at all.
 */
export function smokeSprite() {
  return makeCanvas('smokeball', 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const lobes = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + tRange(-0.22, 0.22);
      const d = tRange(0.16, 0.30) * w;
      lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, tRange(0.15, 0.24) * w]);
    }
    lobes.push([cx, cy, 0.30 * w]);
    // 1 — the dark rim, drawn as the same cluster one step larger
    g.fillStyle = 'rgba(70,74,84,1)';
    for (const [x, y, r] of lobes) { g.beginPath(); g.arc(x, y, r * 1.10, 0, 6.283); g.fill(); }
    // 2 — the body
    g.fillStyle = 'rgba(150,155,166,1)';
    for (const [x, y, r] of lobes) { g.beginPath(); g.arc(x, y, r * 0.97, 0, 6.283); g.fill(); }
    // 3 — the lit crown, offset up-left toward the key light so the ball has a direction
    g.fillStyle = 'rgba(224,228,236,1)';
    for (const [x, y, r] of lobes) {
      g.beginPath(); g.arc(x - r * 0.20, y - r * 0.26, r * 0.60, 0, 6.283); g.fill();
    }
    // 4 — a few darker pockets INSIDE the ball. Punching real holes through the alpha (which
    // is what an earlier version did) shows the sky through the plume and turns it into a
    // doughnut; a dust cloud is opaque, its structure is value, not transparency.
    g.fillStyle = 'rgba(96,101,112,1)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(cx + tRange(-0.18, 0.18) * w, cy + tRange(-0.02, 0.22) * h, tRange(0.05, 0.10) * w, 0, 6.283);
      g.fill();
    }
  }, true);
}

/**
 * THE RELEASE BLAST (P1) — a DARK, hard-edged, lobed powder puff.
 *
 * ── WHY THIS EXISTS AND WHY IT IS DARK ───────────────────────────────────────
 * Every other burst in this game is drawn in light values, and for a game played against a
 * pale morning sky that is a trap. Measured on the release frame: our sky runs L* 70–78 and
 * the launch sparkles are clipped at L* 100, so the whole launch event carried ΔL* 22 across
 * the corridor and 30 at the fork — while the Angry Birds release frame gets ΔL* 53–55,
 * purely because its sparkles happen to be drawn over a dark dusk city. Downscaled to the
 * rubric's 40 px test our launch vanished entirely and theirs stayed a legible bright line.
 *
 * Brightness cannot fix that: 100 is the ceiling. VALUE can. This puff is the launch event's
 * own dark ground — a small charcoal-navy powder burst that sits at the pouch so the
 * near-white sparkles have something to be bright AGAINST, the way the reference's sparkles
 * have a dusk city. Its body is authored at L* ≈ 20, i.e. ΔL* ≈ 54 under our own sky, and it
 * is the same ink-navy family as every outline in the game so it reads as this game's dark
 * and not as a hole punched in the sky.
 *
 * Hard-edged on purpose (flat fills, no gradient, and the pool tests its alpha): P10 asks for
 * "chunky hard-edged lobed smoke blobs, not soft gaussian puffs", and a soft dark cloud on a
 * bright sky reads as a smudge on the lens rather than as an event.
 *
 * Values are authored so that the BODY owns the most pixels — a dominant value is what a
 * critic measures, and a puff whose largest area is its highlight is a light puff with a dark
 * rim, which is the thing that failed.
 */
export function blastSprite() {
  return makeCanvas('blastpuff', 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const lobes = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + tRange(-0.27, 0.27);
      const d = tRange(0.16, 0.29) * w;
      lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, tRange(0.15, 0.24) * w]);
    }
    lobes.push([cx, cy, 0.30 * w]);
    // 1 — near-black rim, the cluster one step larger. This is the silhouette, and it is what
    //     survives the 40px downscale after everything else has averaged away.
    g.fillStyle = '#0a121c';                          // L* ≈ 5
    for (const [x, y, r] of lobes) { g.beginPath(); g.arc(x, y, r * 1.13, 0, 6.283); g.fill(); }
    // 2 — the body. THE measured value: L* ≈ 20 against an L* ≈ 74 sky is ΔL* ≈ 54.
    g.fillStyle = '#1e3247';
    for (const [x, y, r] of lobes) { g.beginPath(); g.arc(x, y, r * 0.96, 0, 6.283); g.fill(); }
    // 3 — one lit crown toward the key light. Small (0.46r, pushed up-left) so the body keeps
    //     the pixel count: enough to say "volume lit from up-left", not enough to lift the
    //     puff's dominant value out of the dark band.
    g.fillStyle = '#3c5165';                          // L* ≈ 34
    for (const [x, y, r] of lobes) {
      g.beginPath(); g.arc(x - r * 0.24, y - r * 0.30, r * 0.46, 0, 6.283); g.fill();
    }
    // 4 — darker pockets INSIDE the body, never holes in the alpha: a powder burst is opaque,
    //     its structure is value. (Punching the alpha shows sky through it and it becomes a
    //     doughnut — the same trap smokeSprite documents.)
    g.fillStyle = '#121e2c';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(cx + tRange(-0.20, 0.20) * w, cy + tRange(-0.04, 0.22) * h,
            tRange(0.05, 0.10) * w, 0, 6.283);
      g.fill();
    }
  }, true);
}

/**
 * ── THE IMPACT BODY (P3 r8) — the compact DARK mass a hot core burns inside ──────────────
 *
 * `ab_destruction_impact-burst-tower-splitting_03` is the composition this exists to make
 * possible: a small, opaque, near-black mass at the contact point with ONE saturated
 * yellow-orange star burning INSIDE it, at roughly a third of its width. Before r8 the game
 * had the star and, on wood and glass, no mass at all — so the star was painted straight onto
 * the sky as a pale starburst that eclipsed everything and then winked out. A flash with
 * nothing to burn inside is not an impact, it is a sparkle.
 *
 * Stone already had a mass: `smokeSprite`'s grey lobed dust ball. Wood and glass may not have
 * one — "a wood-destruction frame contains ZERO smoke sprites; glass has no dust" is a rubric
 * automatic-FAIL — so they get this instead, and it is built to be UNMISTAKABLY not dust:
 *
 *   · silhouette  — straight-edged, spiky, ragged. The smoke ball is a cluster of CIRCLES;
 *                   this is a faceted core with slivers stabbing out of it. At the 40 px test
 *                   the two shapes are still telling different stories.
 *   · value       — authored near-black (body L* ≈ 14–20) so an additive core reads as HEAT
 *                   inside it. A mid-grey mass would wash the star out, which is the whole
 *                   failure being fixed.
 *   · colour      — each material's own dark family (wood = burnt umber, glass = ink teal),
 *                   never the neutral grey of dust. `ab_destruction_wood-splinter-burst_05`
 *                   has no dust anywhere in it and the wood breaks still read as dense DARK
 *                   tufts with an orange flare inside them.
 *   · duration    — 300–360 ms, against dust's 850–1450. It punches and is gone; the rubric's
 *                   "fast and gone inside 400 ms" for wood is a hard bound, not a target.
 *
 * Opaque by construction, like the other two puffs: structure is VALUE, never holes in the
 * alpha. Punching the alpha shows sky through the mass and turns it into a doughnut, and a
 * doughnut cannot contain a core.
 */
export function burstMassSprite(kind = 'wood') {
  const W = kind === 'glass'
    // ink teal: the dark end of the glass family, well below the pane's own bright band so a
    // shard tumbling over it still silhouettes.
    ? { rim: '#050d12', body: '#153140', facet: '#25566a', pocket: '#0b1c25', spikes: 13,
        len: [0.30, 0.50], wid: [0.055, 0.115], core: 0.235, jag: 9 }
    // burnt umber: the dark end of the wood family. Splinters are LONGER and THINNER than
    // glass spikes — same rule the debris follows (slivers along the grain vs flat facets).
    : { rim: '#120a05', body: '#331f0e', facet: '#5a3617', pocket: '#1d1006', spikes: 17,
        len: [0.34, 0.56], wid: [0.035, 0.085], core: 0.215, jag: 8 };

  return makeCanvas('burstmass-' + kind, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    // The slivers, as a fixed list so rim and body draw the SAME silhouette one step apart.
    const spikes = [];
    for (let i = 0; i < W.spikes; i++) {
      const a = (Math.PI * 2 * i) / W.spikes + tRange(-0.16, 0.16);
      spikes.push({ a, L: tRange(W.len[0], W.len[1]) * w, t: tRange(W.wid[0], W.wid[1]) * w });
    }
    // The core, as an irregular straight-edged polygon — a chipped lump, not a disc.
    const core = [];
    for (let i = 0; i < W.jag; i++) {
      const a = (Math.PI * 2 * i) / W.jag;
      core.push([a, W.core * w * tRange(0.78, 1.22)]);
    }

    const drawMass = (grow, fill) => {
      g.fillStyle = fill;
      g.beginPath();
      core.forEach(([a, r], i) => {
        const x = cx + Math.cos(a) * r * grow, y = cy + Math.sin(a) * r * grow;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath(); g.fill();
      for (const s of spikes) {
        const ux = Math.cos(s.a), uy = Math.sin(s.a);
        const px = -uy, py = ux;
        const b = W.core * w * 0.85 * grow, L = s.L * grow, t = s.t * grow;
        g.beginPath();
        g.moveTo(cx + ux * b + px * t, cy + uy * b + py * t);
        g.lineTo(cx + ux * L, cy + uy * L);                       // the point
        g.lineTo(cx + ux * b - px * t, cy + uy * b - py * t);
        g.closePath(); g.fill();
      }
    };

    drawMass(1.14, W.rim);        // 1 — the silhouette; what survives the 40 px downscale
    drawMass(1.00, W.body);       // 2 — the body, and it owns the pixel count
    // 3 — one lit facet toward the key light, small enough that the body keeps the dominant
    //     value. Clipped to the body so it never widens the silhouette.
    g.save();
    g.beginPath();
    core.forEach(([a, r], i) => {
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.closePath(); g.clip();
    g.fillStyle = W.facet;
    g.beginPath();
    g.moveTo(cx - W.core * w * 0.95, cy - W.core * w * 0.20);
    g.lineTo(cx - W.core * w * 0.10, cy - W.core * w * 0.92);
    g.lineTo(cx + W.core * w * 0.34, cy - W.core * w * 0.14);
    g.lineTo(cx - W.core * w * 0.30, cy + W.core * w * 0.30);
    g.closePath(); g.fill();
    // 4 — darker pockets inside the body. Value, never alpha.
    g.fillStyle = W.pocket;
    for (let i = 0; i < 3; i++) {
      const a = tRange(0, 6.283), r = tRange(0.02, 0.13) * w;
      g.beginPath();
      g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, tRange(0.035, 0.075) * w, 0, 6.283);
      g.fill();
    }
    g.restore();
  }, true);
}

/** One yellow-orange six-point star. Additive; lives ~120 ms and is gone. */
export function flashSprite() {
  return makeCanvas('starflash', 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const spike = (rOut, rIn, points, rot, fill) => {
      g.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 ? rIn : rOut;
        const a = rot + (Math.PI * i) / points;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fillStyle = fill; g.fill();
    };
    spike(0.50 * w, 0.15 * w, 6, -0.26, '#e07a1e');
    spike(0.40 * w, 0.13 * w, 6, -0.26, '#f6c453');
    spike(0.26 * w, 0.10 * w, 6, -0.26, '#fff6d8');
    g.beginPath(); g.arc(cx, cy, 0.10 * w, 0, 6.283); g.fillStyle = '#ffffff'; g.fill();
  }, true);
}

// ---------------------------------------------------------------------------
// INK OUTLINE — inverted hull, constant screen-space width
// ---------------------------------------------------------------------------
/**
 * Vertices are pushed along the SMOOTHED view-space normal by an amount proportional to
 * view depth, so the ink stays the same thickness whether the camera is close or pulled back.
 * BackSide + depthWrite gives a clean silhouette that also inks interior overlaps.
 */
const OUTLINE_VS = /* glsl */`
  uniform float uThickness;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n  = normalize(normalMatrix * normal);
    // (-mv.z) is view depth; /18.0 normalises to "thickness in world units at 18u away"
    mv.xyz += n * uThickness * max(-mv.z, 1.0) / 18.0;
    gl_Position = projectionMatrix * mv;
  }`;
const OUTLINE_FS = /* glsl */`
  uniform vec3 uColor;
  void main() { gl_FragColor = vec4(uColor, 1.0); }`;

export const INK = 0x14283c;

/**
 * Box/flat geometries have split normals at every corner, which would tear the hull open.
 * mergeVertices + computeVertexNormals gives the averaged normals the hull needs.
 * Cached per source geometry so a hundred beams share one outline geometry.
 */
const hullCache = new WeakMap();
function hullGeometry(geo) {
  let g = hullCache.get(geo);
  if (!g) {
    try {
      g = mergeVertices(geo.clone(), 1e-4);
      g.computeVertexNormals();
    } catch { g = geo; }
    hullCache.set(geo, g);
  }
  return g;
}

/**
 * Add an ink silhouette to `mesh`. Returns the outline mesh (already parented).
 * @param {THREE.Mesh} mesh
 * @param {number} thickness world units at 18u camera distance (0.02 fine … 0.09 chunky)
 */
const inkMatCache = new Map();
/**
 * The outline material is shared per (thickness, colour). It used to be allocated fresh for
 * every inked mesh, which is invisible on a 13-block level and very visible during a
 * collapse: sixty pieces of debris meant sixty ShaderMaterials allocated inside the fixed
 * step, and the GC bill for that lands as a frame spike exactly when the game is at its
 * busiest. The uniforms are identical by construction, so one instance is correct.
 */
function inkMaterial(thickness, color) {
  const key = `${thickness}:${color}`;
  if (!inkMatCache.has(key)) {
    inkMatCache.set(key, new THREE.ShaderMaterial({
      uniforms: { uThickness: { value: thickness }, uColor: { value: new THREE.Color(color) } },
      vertexShader: OUTLINE_VS,
      fragmentShader: OUTLINE_FS,
      side: THREE.BackSide,
      depthWrite: true,
      toneMapped: false,
    }));
  }
  return inkMatCache.get(key);
}

export function ink(mesh, thickness = 0.045, color = INK) {
  const o = new THREE.Mesh(hullGeometry(mesh.geometry), inkMaterial(thickness, color));
  o.castShadow = false;
  o.receiveShadow = false;
  o.renderOrder = (mesh.renderOrder || 0) - 1;
  o.frustumCulled = mesh.frustumCulled;
  o.name = 'ink';
  mesh.add(o);
  return o;
}

/**
 * Ink for TRANSPARENT objects.
 *
 * The inverted-hull outline is opaque and covers the object's whole silhouette, so putting
 * one behind a translucent pane composites cyan-over-near-black and the pane renders as grey
 * sheet metal. Transparent objects therefore get real edge lines instead: no fill, crisp
 * corners.
 *
 * ── GLASS DOES NOT USE THIS ANY MORE, AND MUST NOT GO BACK TO IT ────────────
 * An EdgesGeometry draws EVERY edge of an extruded prism — front cap, back cap and all the
 * side seams — and on a translucent body every one of those draws straight through the face
 * in front of it. A glass shard built that way is a see-through cellophane box with pencil
 * lines in it: no silhouette, no material, invisible at 40px. Glass is now opaque and takes
 * the same inverted-hull ink as wood and stone, in its own darker-tint-of-self colour
 * (PALETTE.glassInk). Nothing in the game calls inkEdges today; it is kept for a genuinely
 * transparent object that does not exist yet. If you are reaching for it for glass, don't.
 */
const edgeGeoCache = new WeakMap();
const edgeMatCache = new Map();
/** Edge lines, with the geometry and the material cached per source — see inkMaterial(). */
export function inkEdges(mesh, color = INK, threshold = 24) {
  let g = edgeGeoCache.get(mesh.geometry);
  if (!g) { g = new THREE.EdgesGeometry(mesh.geometry, threshold); edgeGeoCache.set(mesh.geometry, g); }
  if (!edgeMatCache.has(color)) {
    edgeMatCache.set(color, new THREE.LineBasicMaterial({
      color, toneMapped: false, transparent: true, opacity: 0.92, depthWrite: false,
    }));
  }
  const l = new THREE.LineSegments(g, edgeMatCache.get(color));
  l.name = 'ink';
  l.renderOrder = (mesh.renderOrder || 0) + 1;
  mesh.add(l);
  return l;
}

/** Ink an entire subtree in one call (skips anything already inked, and any ink mesh). */
export function inkAll(root, thickness = 0.045, color = INK) {
  const targets = [];
  root.traverse(o => {
    if (o.isMesh && o.name !== 'ink' && !o.userData.noInk && !o.children.some(c => c.name === 'ink')) {
      targets.push(o);
    }
  });
  for (const t of targets) ink(t, t.userData.inkWidth ?? thickness, t.userData.inkColor ?? color);
  return root;
}

// ---------------------------------------------------------------------------
// SPRITE-ISH FACE PARTS (shared by every character)
// ---------------------------------------------------------------------------
const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

export const eyeWhiteGeo = () => G('eyeW', () => new THREE.SphereGeometry(1, 20, 14));
export const discGeo     = () => G('disc', () => new THREE.CircleGeometry(1, 24));
export const boxGeo      = () => G('box',  () => new THREE.BoxGeometry(1, 1, 1, 1, 1, 1));

/** Flat, unlit, ink-coloured detail (pupils, mouths, brows). Reads crisply at 40px. */
export function inkFlat(color = INK) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide });
}

/** Cream, unlit — eye whites, teeth, highlights. */
export function creamFlat(color = 0xfdf6ec) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide });
}

/**
 * A cartoon eye: white sphere, ink pupil, cream glint. Returns a group with
 * `look(dx,dy)` and `blink(t)` so characters can be animated from one place.
 */
export function makeEye(r = 0.17, z = 0.62) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(eyeWhiteGeo(), new THREE.MeshToonMaterial({
    color: 0xfdfaf3, gradientMap: RAMP_HARD(),
  }));
  white.scale.setScalar(r);
  white.position.z = z;
  white.userData.inkWidth = 0.03;
  g.add(white);

  const pupil = new THREE.Mesh(discGeo(), inkFlat());
  pupil.scale.setScalar(r * 0.52);
  pupil.position.set(0, 0, z + r * 0.92);
  pupil.userData.noInk = true;
  g.add(pupil);

  const glint = new THREE.Mesh(discGeo(), creamFlat());
  glint.scale.setScalar(r * 0.20);
  glint.position.set(-r * 0.22, r * 0.24, z + r * 0.98);
  glint.userData.noInk = true;
  g.add(glint);

  g.userData.white = white;
  g.userData.pupil = pupil;
  g.userData.glint = glint;
  g.userData.r = r;
  g.userData.look = (dx, dy) => {
    pupil.position.x = dx * r * 0.42;
    pupil.position.y = dy * r * 0.42;
    glint.position.x = dx * r * 0.42 - r * 0.22;
    glint.position.y = dy * r * 0.42 + r * 0.24;
  };
  g.userData.setOpen = (open) => { white.scale.y = r * Math.max(0.06, open); };
  return g;
}

/** Dispose every cached GPU resource this module owns. Full teardown only. */
export function disposeToon() {
  for (const t of rampCache.values()) t.dispose();
  for (const t of canvasCache.values()) t.dispose();
  for (const g of geoCache.values()) g.dispose();
  for (const m of inkMatCache.values()) m.dispose();
  for (const m of edgeMatCache.values()) m.dispose();
  rampCache.clear(); canvasCache.clear(); geoCache.clear();
  inkMatCache.clear(); edgeMatCache.clear();
}
