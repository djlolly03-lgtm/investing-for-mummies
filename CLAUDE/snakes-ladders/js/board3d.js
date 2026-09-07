/* board3d.js — the board itself.
 *
 * The first thing anyone sees. ART-DIRECTION.md v2: not a printed diagram but a
 * lacquered, slightly worn, hand-made Indian board photographed on a wooden
 * table in warm afternoon light. Warm ivory tiles with a linen tooth, every
 * square carved with an inset bevel, a dark walnut frame carrying a block-print
 * border and a brass inlay keyline, gold leaf on the milestones, and a paisley
 * watermark so the middle of the board is never dead white.
 *
 * Coordinates are CONTRACT.md's, exactly: square 1 bottom-left, boustrophedon,
 * 100 top-left, +X right, +Z toward the camera, X,Z in [-5,+5], one cell = 1 unit,
 * row 0's top face at y = 0.
 *
 * Draw calls: table 1 · table vignette 1 · slab 1 · frame 1 · brass keyline 1 ·
 * IFM emboss 1 · 99 tiles 1 · square-100 plaque 1 · plaque bezel 1 ·
 * finish bloom 1 · start pad 1 · three highlight rings 3  =  14.
 * All 100 cells share ONE CanvasTexture atlas — never 100 textures, never 100
 * meshes — plus one half-size non-colour atlas carrying bump/roughness/metalness,
 * which is how a milestone gets real gold leaf without a second draw call.
 */

import * as THREE from '../vendor/three.module.js';
import { CFG } from './config.js';
import { SQUARES, SNAKES, LADDERS, squareAt, snakeAt, ladderAt, zoneOf } from './content.js';
import { clamp, ease, lerp, makeRng, prefersReducedMotion } from './util.js';

const B  = CFG.board;
const N  = B.size;      // 10
const CELL = B.cell;    // 1
const HALF = B.half;    // 5

/* ═══════════════════════════════════════════════════════════════════════════
   Board-art numbers CFG.board does not carry yet. Assign to ART before
   buildBoard() to retune without editing this file; every one of them should
   move into CFG.board on the next tune pass.
   ═══════════════════════════════════════════════════════════════════════════ */
export const ART = {
  bevelDrop:    0.60,   // the tile bevel falls this fraction of its width
  plateDepth:   0.05,   // tiles are plates this thick, standing on the slab
  zoneBlend:    0.34,   // v2: was 0.42 against a cream ground and still invisible,
                        // because the zone tints are near-white. The 2x2 ivory
                        // blocks are the pattern now; the zone is a whisper over it.
  checkerAlpha: 0.000,  // v2: replaced by blockTint — a per-square checker is noise
                        // at phone size (ART-DIRECTION §2).
  blockTint:    1.00,   // strength of the 2x2 ivory/mint block alternation
  grainAlpha:   0.34,   // linen tooth (CFG.materials.paperGrain scaled for canvas)
  hairline:     0.055,  // printed inner rule, as a fraction of a cell
  carveRim:     0.062,  // the dark lip at the edge of every tile. NOT a free number:
                        // addTile's UV padding means the flat top face only samples
                        // 6.1%..93.9% of a cell and the bevel ring plus the skirt
                        // sample 2.8%..6.1%. A rim thinner than 0.061 is painted into
                        // texels no triangle ever reads, which is why the first pass
                        // drew a carve nobody could see.
  carveInset:   0.100,  // where the inset bevel line is cut, fraction of a cell
  patina:       1.00,   // strength of the board-scale lacquer wear
  edgeStrip:    0.058,  // the semantic left edge — the ribbon's 3dp edge, on the board
  badge:        0.30,   // top-right marker size, cell units
  ringInner:    0.34,   // highlight ring, cell units
  ringOuter:    0.50,
  ringPlane:    1.30,   // ring texture plane size, cell units (glow needs headroom)
  pulseMs:      CFG.fx.glowRing.ms,          // 420
  activePulseMs:CFG.tokens.activeRingPulse,  // 1400
  targetSpinMs: 5200,   // the dashed target ring turns slowly, like a compass
  bloomMs:      2600,   // square 100 breathes
  tableSize:    62,     // the table plane, world units. Only ever a warm border.
  watermark:    0.150,  // ART §4 "a faint paisley watermark at ~6% opacity". 6% of the
                        // canvas ink; ACES plus a 1.95 key then eats about a third of it,
                        // so it is carried at 10.5 to LAND at six.
  haloPlain:    0.24,   // the cream halo behind EVERY numeral…
  haloCrossed:  0.92,   // …and behind one a snake or ladder crosses (§5)
};

/* ── ART DIRECTION v2 ──────────────────────────────────────────────────────
   config.js still carries the v1 material numbers DESIGN §7.2 stated, and
   config.js is another agent's file. Same convention dice3d.js and tokens3d.js
   already use: where config still holds the exact v1 value, the v2 art
   direction wins; where a human has retuned it since, the human wins.
   ─────────────────────────────────────────────────────────────────────────── */
const V2 = {
  tileRough:   0.60,    // §1 "roughness .55-.65 so light rakes across them"  (v1: 0.85)
  tileMetal:   0.90,    // ceiling; the metalness map is 0 everywhere but gold leaf
  tileMetalLo: 0.14,    // low tier has no env map, so metal there would read black
  frameRough:  0.45,    // §1 dark walnut                                     (v1: 0.60)
  slabRough:   0.55,
  brassRough:  0.30,    // §1 brass inlay keyline
  brassMetal:  0.85,
  tableRough:  0.60,    // §1 table
  bump:        0.010,   // world units of relief the R channel of the pbr atlas carries
};
if (CFG.materials.tile.roughness  !== 0.85) V2.tileRough  = CFG.materials.tile.roughness;
if (CFG.materials.frame.roughness !== 0.60) V2.frameRough = CFG.materials.frame.roughness;

/* §2 — the palette, at full strength this time.
   The two ivories are ART-DIRECTION §2's #f4ece0 / #e8f1ee, pulled down about
   6% and pushed warmer: measured off the render, a 1.95 key at exposure 1.36
   through ACES lands #f4ece0 at (216,212,206) — a grey. These land it at the
   warm ivory the brief asks for instead. */
const P = {
  ivoryA:  0xd2b587,   // warm ivory
  ivoryB:  0xb3cabf,   // the second tint, alternating in 2x2 BLOCKS
  walnut:  0x5b3a24,   // §2 deep walnut frame
  walnutD: 0x33200f,   // the shadowed side of it, and the carved tile lip
  walnutL: 0x8f5c34,   // the lit grain
  tableBase: 0x8a6242, // §2 table
  tableVig:  0x4e3524, // §2 vignetted to this at the corners
  goldLeaf: 0xd8a520,
  goldPale: 0xfbeab4,
  haloInk:  0xfff3da,  // the cream halo behind a numeral
};

/* The five zones as bands of colour across the hillside (DESIGN §4). CFG's
   zoneTints are all within 4% of white, which is why the zones have never once
   been visible on a render; these are the same five hues with enough left in
   them to survive ACES. Laid UNDER the 2x2 ivory blocks, never over. */
const BAND = [0xe0c795, 0xd8b48c, 0xb8cfc8, 0xc3d2a6, 0xe9cf88];

/* ═══════════════════════════════════════════════════════════════════════════
   1. COORDINATES — the part every other module depends on. Pure, no THREE.
   ═══════════════════════════════════════════════════════════════════════════ */

/** row 0..9 from the bottom, col 0..9 from the left, after the boustrophedon flip. */
export function cellRowCol(n) {
  const i = clamp(Math.round(n) || 1, 1, N * N) - 1;
  const row = Math.floor(i / N);
  const c = i % N;
  return { row, col: row % 2 === 1 ? N - 1 - c : c };
}

/** The ghat road. Row r sits this high; zone edges add a carved stone step. */
export function rowY(row) {
  const r = clamp(row, 0, N - 1);
  return r * B.rowRise + B.zoneStep * Math.floor(r / 2);
}

/** The surface height under any z — used by the frame rails and by camera fits. */
export function surfaceYAtZ(z) {
  return rowY(clamp(Math.floor(HALF - z), 0, N - 1));
}

/**
 * Centre of square 'n', on its top face. 'n = 0' is the off-board start pad.
 * @returns {{x:number,y:number,z:number}}
 */
export function cellToWorld(n) {
  const k = Math.round(n) || 0;
  if (k <= 0) return { x: B.startPad.x, y: B.startPad.y, z: B.startPad.z };
  const { row, col } = cellRowCol(k);
  return {
    x: -HALF + (col + 0.5) * CELL,
    y: rowY(row),
    z:  HALF - (row + 0.5) * CELL,
  };
}

/** Inverse of cellToWorld, for hit-testing and camera framing. 0 = off the board. */
export function worldToCell(x, z) {
  const col = Math.floor((x + HALF) / CELL);
  const row = Math.floor((HALF - z) / CELL);
  if (col < 0 || col >= N || row < 0 || row >= N) return 0;
  return row * N + (row % 2 === 1 ? N - 1 - col : col) + 1;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. MODULE STATE
   ═══════════════════════════════════════════════════════════════════════════ */

let group = null;            // the returned THREE.Group
let atlasCanvas = null, atlasTex = null, atlasPx = 0;
let pbrCanvas = null, pbrTex = null, pbrPx = 0;
let ovCanvas = null, ovTex = null, ovMesh = null;
let tilesMesh = null, finishTile = null, finishGroup = null, finishBloom = null;
let ringActive = null, ringTarget = null, ringPulse = null;
let showTitles = false;      // DESIGN §4: "Text on the play surface: square numbers
                             // and nothing else." setCellLabelsVisible(true) overrides.
let numeralScale = 1;
const disposables = [];

const hl = {
  active: { cell: 0, on: false },
  target: { cell: 0, on: false },
  pulse:  { cell: 0, t: 1 },
};
let finishRise = 0, finishRiseTarget = 0, finishRiseMs = 0, finishRiseT = 1, finishRiseFrom = 0;
let clockMs = 0;

/* ═══════════════════════════════════════════════════════════════════════════
   3. COLOUR HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const C = CFG.colors;
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
function mixHex(a, b, t) {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

/* Which special treatment does a square carry? Shape first, colour second —
   §13: never colour alone. */
function cellKind(n) {
  if (n === N * N) return 'finish';
  if (ladderAt(n)) return 'ladder';
  if (snakeAt(n))  return 'snake';
  const sq = squareAt(n);
  const k = sq && sq.kind;
  if (k === 'milestone') return 'milestone';
  if (k === 'event') return 'event';
  if (k === 'quiz') return 'quiz';
  return 'plain';
}
const EDGE = {
  ladder: C.edgeLadder, snake: C.edgeSnake, milestone: C.edgeMilestone,
  event: C.edgeEvent, quiz: C.teal, finish: C.gold, plain: null,
};
const isGold = (kind) => kind === 'milestone' || kind === 'finish';

/* ── Which squares does a snake or a ladder pass over? ─────────────────────
   §5: "Any snake or ladder crossing a numeral gets a subtle cream halo behind
   that numeral." snakes3d owns the real curves, so this samples the corridor
   between head and tail — generously, and with a lateral bow for the snakes,
   which are S-curves rather than straight runs. Cheap, computed once. */
let crossedSet = null;
function crossedCells() {
  if (crossedSet) return crossedSet;
  crossedSet = new Set();
  const mark = (x, z) => {
    const c0 = Math.floor((x + HALF) / CELL), r0 = Math.floor((HALF - z) / CELL);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || r >= N || c < 0 || c >= N) continue;
      const cx = -HALF + (c + 0.5) * CELL, cz = HALF - (r + 0.5) * CELL;
      if (Math.hypot(cx - x, cz - z) < 0.82) {
        crossedSet.add(r * N + (r % 2 === 1 ? N - 1 - c : c) + 1);
      }
    }
  };
  const run = (list, bow) => {
    for (const it of list || []) {
      const a = cellToWorld(it.from), b = cellToWorld(it.to);
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const px = -dz / L, pz = dx / L;              // the perpendicular, in XZ
      for (let s = 0; s <= 56; s++) {
        const t = s / 56;
        const w = bow * Math.sin(t * Math.PI * 2);
        mark(a.x + dx * t + px * w, a.z + dz * t + pz * w);
      }
    }
  };
  run(LADDERS, 0);
  run(SNAKES, 0.72);
  return crossedSet;
}

/* ── WHERE the furniture lands, to the fraction of a tile ──────────────────
   crossedCells() answers "is this square crossed at all", which is enough for a
   halo and not nearly enough for placement. This answers the harder question:
   which PART of a tile does a rail or a spine take away from the camera.

   A raised object never hides the tile beneath itself. At the rest elevation E
   an object h units up hides the ground BEHIND it, h / tan(E) units in -Z —
   so a sample of a rail at (x, y, z) is recorded as a disc at (x, z - h/tanE).
   Feed the board the whole set of those discs and every numeral can be put in
   a corner nothing reaches. Computed once; ~3k discs, bucketed per cell. */

const ELEV_TAN = Math.tan((((CFG.camera && CFG.camera.elevationDeg) || 48) * Math.PI) / 180) || 1;
const GK = (r, c) => (r + 1) * (N + 2) + (c + 1);      // one bucket per cell, plus a fringe

let footprint = null;
const placed = new Map();      // n -> the corner drawNumeral() actually used
function footprintGrid() {
  if (footprint) return footprint;
  footprint = new Map();
  const add = (x, y, z, r) => {
    const zz = z - Math.max(0, y - surfaceYAtZ(z)) / ELEV_TAN;
    const gr = Math.floor((HALF - zz) / CELL), gc = Math.floor((x + HALF) / CELL);
    if (gr < -1 || gr > N || gc < -1 || gc > N) return;
    const k = GK(gr, gc);
    let a = footprint.get(k);
    if (!a) { a = []; footprint.set(k, a); }
    a.push(x, zz, r);
  };

  /* ── the ladders: two rails plus the rungs between them, so the whole band
        counts as opaque. A numeral peeping between two rungs is not legible. */
  const hW  = (B.ladderWidth || 0.28) / 2;
  const rr  = B.ladderRail || 0.027;
  const yL  = B.ladderHeight || 0.27;
  const over = 0.20;                                    // rails overhang, as snakes3d builds them
  for (const ld of LADDERS || []) {
    const A = cellToWorld(ld.from), Z = cellToWorld(ld.to);
    const dx = Z.x - A.x, dz = Z.z - A.z, L = Math.hypot(dx, dz) || 1;
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const yMid = ((A.y || 0) + (Z.y || 0)) / 2 + yL;
    const span = L + over * 2, steps = Math.max(10, Math.ceil(span / 0.09));
    for (let i = 0; i <= steps; i++) {
      const s = -over + (span * i) / steps;
      const bx = A.x + ux * s, bz = A.z + uz * s;
      for (const o of [-1, -0.5, 0, 0.5, 1]) {
        /* add() is (x, HEIGHT, z, r). The first pass wrote (x, z, y) here,
           which scattered every ladder sample to a nonsense place and is why
           every numeral still crossed after that pass was under a RAIL. */
        add(bx + px * hW * o, yMid, bz + pz * hW * o, rr * 1.9);
      }
    }
  }

  /* ── the snakes. This mirrors snakes3d's snakeSpine(): the same corridor,
        the same deterministic bend sign, the same amplitude fit. It is a copy
        on purpose — board3d may not import snakes3d, which imports board3d —
        and it is deliberately drawn a little fatter than the animal, so the
        model never claims a corner is free when the body is on it. If the two
        ever drift, the opaque plaque below is the backstop. */
  const [cLo, cHi] = B.snakeCostRange || [8000, 250000];
  const CLEAR = 0.085, ARCH = Math.max(0, (B.snakeHeight || 0.22) - 0.10) * 0.55;
  for (const sn of SNAKES || []) {
    const A = cellToWorld(sn.from), Z = cellToWorld(sn.to);
    const c = clamp(Number(sn.cost) || cLo, cLo, cHi);
    const t01 = (Math.log(c) - Math.log(cLo)) / (Math.log(cHi) - Math.log(cLo) || 1);
    const rHead = lerp(B.snakeRadiusMin || 0.055, B.snakeRadiusMax || 0.135, t01);

    const pad = rHead + 0.035, h2 = CELL * 0.5;
    const box = {
      x0: Math.min(A.x, Z.x) - h2 + pad, x1: Math.max(A.x, Z.x) + h2 - pad,
      z0: Math.min(A.z, Z.z) - h2 + pad, z1: Math.max(A.z, Z.z) + h2 - pad,
    };
    if (box.x1 < box.x0) { const m = (box.x0 + box.x1) / 2; box.x0 = box.x1 = m; }
    if (box.z1 < box.z0) { const m = (box.z0 + box.z1) / 2; box.z0 = box.z1 = m; }

    const dx = Z.x - A.x, dz = Z.z - A.z, L = Math.hypot(dx, dz) || 1;
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const sign = makeRng(977 + sn.from * 31)() < 0.5 ? -1 : 1;
    const cycles = L > 5 ? 1.5 : 1;
    const shape = (t) => Math.pow(Math.sin(Math.PI * t), 0.35) * Math.sin(2 * Math.PI * cycles * t);
    const axis = (p, d, lo, hi) => (d > 1e-6 ? (hi - p) / d : d < -1e-6 ? (lo - p) / d : Infinity);
    const room = (x, z) => Math.max(0, Math.min(
      Math.min(axis(x, px, box.x0, box.x1), axis(z, pz, box.z0, box.z1)),
      Math.min(axis(x, -px, box.x0, box.x1), axis(z, -pz, box.z0, box.z1))));
    let fit = Infinity;
    for (let i = 0; i <= 21; i++) {
      const t = i / 21, w = Math.abs(shape(t));
      if (w < 1e-3) continue;
      fit = Math.min(fit, room(A.x + dx * t, A.z + dz * t) / w);
    }
    const amp = Math.min(clamp(L * 0.17, 0.26, 1.05), Number.isFinite(fit) ? fit : 1.05);

    const steps = Math.max(24, Math.ceil(L / 0.06));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const env = Math.pow(Math.sin(Math.PI * t), 0.35);
      const off = sign * amp * Math.sin(2 * Math.PI * cycles * t) * env;
      const drag = sign * amp * 0.09 * Math.sin(4 * Math.PI * t) * env;
      const x = clamp(A.x + dx * t + px * off + ux * drag, box.x0, box.x1);
      const z = clamp(A.z + dz * t + pz * off + uz * drag, box.z0, box.z1);
      /* thickness follows snakes3d's taper(), fattest at the skull */
      const rad = rHead * (0.22 + 0.78 * Math.pow(1 - t, 1.35));
      const y = lerp(A.y || 0, Z.y || 0, t) + CLEAR + rad + ARCH * Math.pow(Math.sin(Math.PI * t), 1.2);
      add(x, y, z, rad * 1.30 + 0.02);
    }
    /* the head is a skull, wider than the tube, and it is the thing that most
       often lands squarely on a numeral */
    add(A.x, (A.y || 0) + CLEAR + rHead + 0.02, A.z, rHead * 2.1);
  }

  return footprint;
}

/** Is the world-space disc (x, z, r) touched by any furniture footprint? */
function footprintHits(x, z, r) {
  const G = footprintGrid();
  const gr = Math.floor((HALF - z) / CELL), gc = Math.floor((x + HALF) / CELL);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const a = G.get(GK(gr + dr, gc + dc));
    if (!a) continue;
    for (let i = 0; i < a.length; i += 3) {
      const d = r + a[i + 2];
      const ex = a[i] - x, ez = a[i + 1] - z;
      if (ex * ex + ez * ez < d * d) return true;
    }
  }
  return false;
}

/* ── WHERE ON A TILE THE NUMERAL GOES ──────────────────────────────────────
   Cell-local everywhere below, as fractions of a cell, in canvas space: x runs
   with world +X, y runs DOWN the canvas, which is world +Z, which is toward the
   camera. So 'front' is the bottom of the cell in the atlas and the near edge
   on screen, and the historic home is the front-left.

   The previous pass offered four fixed corners and got the damage down from ~24
   numerals to ~14. It could not do better, because a long diagonal ladder
   crosses a cell corner to corner and its projected band is wide enough that a
   glyph inset 0.137 from a corner is still under a rail. So this does the real
   thing: build an occupancy map of each tile from the furniture footprint, as a
   summed-area table, then slide the glyph box anywhere on its own tile that is
   free, preferring the historic home. Pure and deterministic — a numeral never
   moves between renders. Where nothing at all is free, the caller sends the
   numeral to the overlay layer instead. */

const OCCN = 20;                       // occupancy samples across one cell
const GLYPH_PAD = 0.045;               // world units of clearance around the ink
const occCache = new Map();            // n -> Float32Array, (OCCN+1)^2 summed-area

/** The furniture map of one tile, as a summed-area table over an OCCN x OCCN grid. */
function cellOcc(n) {
  let sat = occCache.get(n);
  if (sat) return sat;
  const G = footprintGrid();
  const { row, col } = cellRowCol(n);
  const cx = -HALF + (col + 0.5) * CELL, cz = HALF - (row + 0.5) * CELL;
  const M = OCCN, S = M + 1;
  const hit = new Uint8Array(M * M);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const a = G.get(GK(row + dr, col + dc));
    if (!a) continue;
    for (let i = 0; i < a.length; i += 3) {
      const fx = (a[i] - cx) / CELL + 0.5;
      const fy = (a[i + 1] - cz) / CELL + 0.5;
      const fr = (a[i + 2] + GLYPH_PAD) / CELL;
      const a0 = Math.max(0, Math.floor((fx - fr) * M)), a1 = Math.min(M - 1, Math.ceil((fx + fr) * M));
      const b0 = Math.max(0, Math.floor((fy - fr) * M)), b1 = Math.min(M - 1, Math.ceil((fy + fr) * M));
      for (let b = b0; b <= b1; b++) {
        const dy = (b + 0.5) / M - fy;
        for (let q = a0; q <= a1; q++) {
          if (hit[b * M + q]) continue;
          const dx = (q + 0.5) / M - fx;
          if (dx * dx + dy * dy < fr * fr) hit[b * M + q] = 1;
        }
      }
    }
  }
  sat = new Float32Array(S * S);
  for (let b = 0; b < M; b++) {
    for (let q = 0; q < M; q++) {
      sat[(b + 1) * S + q + 1] = hit[b * M + q] + sat[b * S + q + 1] + sat[(b + 1) * S + q] - sat[b * S + q];
    }
  }
  occCache.set(n, sat);
  return sat;
}

/** Fraction of the cell-local rect x0,y0 - x1,y1 that furniture takes away. 0..1 */
function occRect(n, x0, y0, x1, y1) {
  const M = OCCN, S = M + 1, sat = cellOcc(n);
  const a0 = clamp(Math.floor(x0 * M), 0, M), a1 = clamp(Math.ceil(x1 * M), 0, M);
  const b0 = clamp(Math.floor(y0 * M), 0, M), b1 = clamp(Math.ceil(y1 * M), 0, M);
  if (a1 <= a0 || b1 <= b0) return 0;
  const s = sat[b1 * S + a1] - sat[b0 * S + a1] - sat[b1 * S + a0] + sat[b0 * S + a0];
  return s / ((a1 - a0) * (b1 - b0));
}

/** What the tile's own art already owns: x0,y0,x1,y1 boxes, cell-local. */
function artRects(n, kind) {
  const r = [];
  // the badge — square 100's is smaller and pulled inside its bezel, so the
  // numeral router has to be told about the box it actually occupies
  if (kind === 'finish') r.push([0.545, 0.205, 0.795, 0.455]);
  else if (kind !== 'plain') r.push([0.575, 0.030, 0.960, 0.415]);
  if (CFG.game.heritageSquares.includes(n)) r.push([0.780, 0.780, 0.940, 0.940]);
  if (n === CFG.game.shieldLadderFrom) r.push([0.775, 0.515, 0.945, 0.685]);
  const sq = squareAt(n);
  if (showTitles && sq && sq.title) r.push([0.080, 0.170, 0.720, 0.460]);
  return r;
}
function overlapFrac(b, r) {
  const w = Math.min(b[2], r[2]) - Math.max(b[0], r[0]);
  const h = Math.min(b[3], r[3]) - Math.max(b[1], r[1]);
  return w <= 0 || h <= 0 ? 0 : (w * h) / Math.max(1e-6, (b[2] - b[0]) * (b[3] - b[1]));
}
const cornerName = (x0, base) => (base > 0.62 ? 'F' : 'B') + (x0 > 0.45 ? 'R' : 'L');

const HOME_X = 0.140, HOME_BASE = 0.878, STEP = 0.038;
const SHRINK_COST = 40;        // what one unit of lost cap height is worth

/* The clear inside of square 100's raised gold bezel, in cell units.
   The bezel is TorusGeometry(CELL*0.545, CELL*0.048, 6, 4) turned 45deg, so its
   flat sides sit 0.545*cos45 = 0.385 from centre and the tube adds 0.048 either
   way: the inner edge lands at 0.5 - 0.337 = 0.163 / 0.5 + 0.337 = 0.837. The
   extra 0.027 of margin covers the fact that the tube stands proud of the tile
   and therefore eats a little more than its footprint at a raked camera. */
const FINISH_SAFE = [0.190, 0.810];

/**
 * Where on square n does the numeral go?
 * @param {number} n  square
 * @param {string} kind  cellKind(n)
 * @param {number} wf  glyph width, as a fraction of a cell
 * @param {number} hf  glyph cap height, as a fraction of a cell
 * @returns {{id:string, x0:number, base:number, occ:number, scale:number}}
 */
function numeralCorner(n, kind, wf, hf, ignoreOcc = false) {
  const gold = isGold(kind);
  /* Gold squares carry a keyline at 0.132/0.868 — stay inside it.
     Square 100 is the exception, and 0.152/0.846 was NOT inside it: the finish
     plaque's bezel is a *raised torus*, not a painted keyline. Measured, its
     flat sides run 0.163..0.837 in cell units, so a baseline at 0.846 put the
     bottom of "100" under a lit gold tube standing 0.018 above the tile — the
     one numeral on the board that a player has to read to know she has won,
     sliced by its own frame. FINISH_SAFE keeps it clear with margin for the
     bezel's height in perspective. */
  const xLo = kind === 'finish' ? FINISH_SAFE[0] : gold ? 0.152 : 0.136;
  const xHi = kind === 'finish' ? FINISH_SAFE[1] : gold ? 0.848 : 0.896;
  const yLo = kind === 'finish' ? FINISH_SAFE[0] : gold ? 0.152 : 0.130;
  const yHi = kind === 'finish' ? FINISH_SAFE[1] : gold ? 0.846 : 0.896;
  const bx0 = Math.max(xLo, Math.min(HOME_X, xHi)), by0 = Math.min(HOME_BASE, yHi);
  const art = artRects(n, kind);
  let best = null;
  for (const sc of [1, 0.88, 0.76]) {
    const w = wf * sc, h = hf * sc;
    if (w > xHi - xLo || h > by0 - yLo) continue;
    for (let bi = 0; ; bi++) {
      const base = by0 - bi * STEP;
      if (base - h < yLo) break;
      for (let ai = 0; ; ai++) {
        const x0 = bx0 + ai * STEP;
        if (x0 + w > xHi) break;
        const y0 = base - h, x1 = x0 + w;
        const occ = occRect(n, x0, y0, x1, base);
        let pen = 0;
        for (const r of art) pen += overlapFrac([x0, y0, x1, base], r);
        /* SHRINK_COST: cap height is legibility. It used to be 14, which made a
           24% shrink as cheap as a 2.8% graze of the glyph box — so 19 of the
           100 numerals came out at 5.7-6.8 CSS px on a phone while the rest ran
           7.4-8.5. At 40, dropping to 0.88 has to buy 4% of clearance and 0.76
           has to buy 8%. Anything still crossed after that goes to the overlay
           plaque, which is opaque and needs no shrink at all. */
        const score = (ignoreOcc ? 0 : occ * 120) + pen * 9 + (1 - sc) * SHRINK_COST
                    + Math.abs(x0 - HOME_X) * 1.0 + Math.abs(base - HOME_BASE) * 1.6;
        if (!best || score < best.score) {
          best = { id: cornerName(x0, base), x0, base, occ, scale: sc, score };
        }
      }
    }
    /* full size and completely clear — nothing smaller can beat that */
    if (best && best.scale === 1 && (ignoreOcc || best.occ <= 0.001)) break;
  }
  return best || { id: 'FL', x0: bx0, base: by0, occ: 1, scale: 1, score: 99 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. THE ATLAS — one canvas, one texture, 100 cells. Redrawn only on a
      settings change (labels, numeral scale) or when the webfont arrives.
   ═══════════════════════════════════════════════════════════════════════════ */

function atlasSize() {
  const t = CFG.quality.current.tier;
  // CFG.quality.current.textureSize is 1024/1024/512; the board atlas is the one
  // texture in the build that carries type, so high tier gets the extra step, and
  // low is lifted off 512 because 24 of the 100 numerals sit under furniture and
  // a 51 px cell cannot afford to lose any of one (§5, legibility beats ornament).
  return t === 'high' ? 2048 : 1024;
}

/* ── the linen tooth ───────────────────────────────────────────────────────
   §1: "warm ivory with a paper/linen grain". White noise alone reads as video
   noise; a weave needs threads. Two crossed sets of soft lines under the noise
   is what makes it look like card stock rather than a JPEG artefact. */
let grainPattern = null;
function makeGrain(g) {
  if (grainPattern) return grainPattern;
  const s = 128, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const c2 = cv.getContext('2d');
  const img = c2.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() * 2 - 1) * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c2.putImageData(img, 0, 0);
  c2.lineWidth = 1;
  for (let i = 0; i < s; i += 3) {
    const a = 0.10 + Math.random() * 0.16;
    c2.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    c2.beginPath(); c2.moveTo(0, i + 0.5); c2.lineTo(s, i + 0.5); c2.stroke();
    c2.strokeStyle = 'rgba(0,0,0,' + (a * 0.7).toFixed(3) + ')';
    c2.beginPath(); c2.moveTo(i + 1.5, 0); c2.lineTo(i + 1.5, s); c2.stroke();
  }
  grainPattern = g.createPattern(cv, 'repeat');
  return grainPattern;
}

function roundRect(g, x, y, w, h, r) {
  if (typeof g.roundRect === 'function') { g.beginPath(); g.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

const font = (w, px) => `${w} ${Math.round(px)}px ${CFG.type.ui}`;
const fontD = (px) => `italic 600 ${Math.round(px)}px ${CFG.type.display}`;

/* ── the watermark ─────────────────────────────────────────────────────────
   §4: "a faint paisley or diamond watermark in the empty centre of the
   playfield, at ~6% opacity, so the middle of the board is not dead white."
   Drawn ONCE at board scale into an offscreen canvas, then each cell blits its
   own window out of it — so the motif is continuous across squares instead of
   stamped into each one, which is what makes it read as printed paper. */
let wmCanvas = null;
function watermarkCanvas() {
  if (wmCanvas) return wmCanvas;
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const c = S / 2;

  /* a diamond lattice over the whole field */
  const step = S / 10;
  g.lineWidth = S * 0.0035;
  g.strokeStyle = rgba(C.navy, 0.55);
  for (let i = -10; i <= 20; i++) {
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step + S, S); g.stroke();
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step - S, S); g.stroke();
  }

  /* a paisley rosette in the middle — eight petals around a lotus core */
  g.save();
  g.translate(c, c);
  for (let k = 0; k < 8; k++) {
    g.save();
    g.rotate((k / 8) * Math.PI * 2);
    g.beginPath();
    g.moveTo(0, -S * 0.06);
    g.bezierCurveTo(S * 0.10, -S * 0.13, S * 0.11, -S * 0.30, 0, -S * 0.345);
    g.bezierCurveTo(-S * 0.11, -S * 0.30, -S * 0.10, -S * 0.13, 0, -S * 0.06);
    g.closePath();
    g.lineWidth = S * 0.006; g.strokeStyle = rgba(C.navy, 0.85); g.stroke();
    g.beginPath();
    g.moveTo(0, -S * 0.10);
    g.bezierCurveTo(S * 0.05, -S * 0.15, S * 0.055, -S * 0.25, 0, -S * 0.285);
    g.bezierCurveTo(-S * 0.055, -S * 0.25, -S * 0.05, -S * 0.15, 0, -S * 0.10);
    g.closePath();
    g.lineWidth = S * 0.004; g.strokeStyle = rgba(C.gold, 0.80); g.stroke();
    g.restore();
  }
  for (const r of [0.055, 0.085]) {
    g.beginPath(); g.arc(0, 0, S * r, 0, Math.PI * 2);
    g.lineWidth = S * 0.005; g.strokeStyle = rgba(C.gold, 0.9); g.stroke();
  }
  g.restore();

  /* four corner quarter-fans, so the field is never empty anywhere */
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    g.save();
    g.translate(qx * S, qy * S);
    g.rotate((qx ? Math.PI : 0) + (qy ? (qx ? -Math.PI / 2 : Math.PI / 2) : 0));
    g.lineWidth = S * 0.005; g.strokeStyle = rgba(C.navy, 0.7);
    for (let r = 0.10; r <= 0.26; r += 0.04) {
      g.beginPath(); g.arc(0, 0, S * r, 0, Math.PI / 2); g.stroke();
    }
    g.restore();
  }

  /* fade it away from the middle, so ornament never competes with the numerals
     at the busy bottom-left of each square */
  const fade = g.createRadialGradient(c, c, S * 0.06, c, c, S * 0.62);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.62, 'rgba(0,0,0,0.55)');
  fade.addColorStop(1, 'rgba(0,0,0,0.10)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = fade; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over';

  wmCanvas = cv;
  return cv;
}

/* ── the lacquer wear ──────────────────────────────────────────────────────
   §"a beautiful, SLIGHTLY WORN, hand-made board". 100 identical tiles is the
   other half of why v1 read as a diagram: no square had a history. This is one
   board-scale layer of soft warm blotching plus an edge fall-off, blitted per
   cell out of the same window the watermark uses, so no two squares are the
   same shade and the middle of the board glows a little. */
let patinaCanvas = null;
function patina() {
  if (patinaCanvas) return patinaCanvas;
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, S, S);
  let seed = 20260904;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S, y = rnd() * S, r = S * (0.05 + rnd() * 0.17);
    const warm = rnd() < 0.62;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, warm ? 'rgba(120,78,40,0.13)' : 'rgba(255,246,226,0.13)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  /* the edges of a board get handled more than the middle */
  const eg = g.createRadialGradient(S / 2, S / 2, S * 0.20, S / 2, S / 2, S * 0.74);
  eg.addColorStop(0, 'rgba(96,62,30,0)');
  eg.addColorStop(0.70, 'rgba(96,62,30,0.06)');
  eg.addColorStop(1, 'rgba(96,62,30,0.17)');
  g.fillStyle = eg; g.fillRect(0, 0, S, S);
  patinaCanvas = cv;
  return cv;
}

/** Draw every one of the 100 cells into the atlas canvas. */
function drawAtlas() {
  const S = atlasPx, u = S / N;                 // u = one cell, in atlas pixels
  const g = atlasCanvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  overlayJobs.length = 0;
  for (let n = 1; n <= N * N; n++) {
    const { row, col } = cellRowCol(n);
    g.save();
    g.translate(col * u, (N - 1 - row) * u);    // canvas y is down; row 0 is the bottom
    drawCell(g, n, u, row, col);
    g.restore();
  }
  drawOverlayAtlas();
}

/* ── the numeral overlay atlas ─────────────────────────────────────────────
   Same 10 x 10 cell layout as the board atlas and the same cell-local
   coordinates, so a numeral painted here lands on exactly the spot on the tile
   that numeralCorner() picked. Transparent everywhere except the few squares a
   ladder or a snake crosses end to end, which is why one texture and one
   draw call buy every numeral back. Its mesh renders with depthTest off, so
   what is painted here is on top of the furniture, not under it. */
const OVERLAY_PX = 1024;        // 102 px per cell — a phone tile is ~100 device px

function drawOverlayAtlas() {
  if (!ovCanvas) {
    if (typeof document === 'undefined') return;
    ovCanvas = document.createElement('canvas');
    ovCanvas.width = ovCanvas.height = OVERLAY_PX;
  }
  const S = OVERLAY_PX, u = S / N;
  const g = ovCanvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  for (const job of overlayJobs) {
    const { row, col } = cellRowCol(job.n);
    g.save();
    g.translate(col * u, (N - 1 - row) * u);
    paintNumeral(g, job.n, u, job.kind, job.spot, true);
    g.restore();
  }
  if (ovTex) ovTex.needsUpdate = true;
}

/** One flat quad per eligible cell, at that cell's own surface, mapped 1:1 to
 *  its overlay-atlas cell. About 40 quads, one draw call. */
function buildNumeralOverlay() {
  const G = newGeo(true);
  const k = 1 / N, h = CELL / 2;
  for (let n = 1; n <= N * N; n++) {
    if (!overlayEligible(n)) continue;
    const { row, col } = cellRowCol(n);
    const cx = -HALF + (col + 0.5) * CELL, cz = HALF - (row + 0.5) * CELL;
    const y = rowY(row) + 0.004;
    const u0 = col / N, v0 = row / N;
    pushQuad(G,
      [cx - h, y, cz - h], [cx + h, y, cz - h], [cx + h, y, cz + h], [cx - h, y, cz + h], UP,
      [u0, v0 + k], [u0 + k, v0 + k], [u0 + k, v0], [u0, v0]);
  }
  return G.pos.length ? finishGeo(G) : null;
}

function drawCell(g, n, u, row, col) {
  const kind = cellKind(n);
  const zone = zoneOf(n);
  const zi = zone ? zone.id - 1 : 0;
  const tint = BAND[zi] != null ? BAND[zi] : BAND[0];

  /* — ground: warm ivory, alternating in 2x2 BLOCKS (§2 — a per-square checker
       is noise at phone size), over the zone band so the five zones read as
       colour from the back of a hall — */
  const block = ((row >> 1) + (col >> 1)) % 2;
  const ground = mixHex(block ? P.ivoryB : P.ivoryA, tint, ART.zoneBlend * ART.blockTint);
  g.fillStyle = hex(ground);
  g.fillRect(0, 0, u, u);

  if (isGold(kind)) {
    /* gold leaf — a raking sheen across the square, brightest where the key
       light comes from, so the metalness map has something to be metal ON */
    const grd = g.createLinearGradient(0, u, u, 0);
    if (kind === 'finish') {
      grd.addColorStop(0.00, hex(mixHex(P.goldLeaf, 0x8a5c06, 0.35)));
      grd.addColorStop(0.42, hex(P.goldPale));
      grd.addColorStop(0.70, hex(P.goldLeaf));
      grd.addColorStop(1.00, hex(mixHex(P.goldLeaf, 0x8a5c06, 0.25)));
    } else {
      grd.addColorStop(0.00, hex(mixHex(C.goldLt, P.goldLeaf, 0.30)));
      grd.addColorStop(0.46, hex(P.goldPale));
      grd.addColorStop(1.00, hex(mixHex(C.goldLt, P.goldLeaf, 0.46)));
    }
    g.fillStyle = grd; g.fillRect(0, 0, u, u);
  }

  /* — the watermark, blitted from the board-scale motif (§4) — */
  const wm = watermarkCanvas();
  g.save();
  g.globalAlpha = ART.watermark * (isGold(kind) ? 0.5 : 1);
  const wu = wm.width / N;
  g.drawImage(wm, col * wu, (N - 1 - row) * wu, wu, wu, 0, 0, u, u);
  g.restore();

  /* — the lacquer wear, from the same board-scale window — */
  const pt = patina();
  g.save();
  g.globalAlpha = ART.patina;
  const pu = pt.width / N;
  g.drawImage(pt, col * pu, (N - 1 - row) * pu, pu, pu, 0, 0, u, u);
  g.restore();

  /* — painted-card depth: a faint centre lift, then the linen tooth — */
  const vg = g.createRadialGradient(u * 0.40, u * 0.34, u * 0.05, u * 0.5, u * 0.5, u * 0.82);
  vg.addColorStop(0, 'rgba(255,246,224,0.10)');
  vg.addColorStop(1, 'rgba(58,36,21,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, u, u);

  g.save();
  g.globalAlpha = ART.grainAlpha * (CFG.materials.paperGrain / 0.14);
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = makeGrain(g);
  g.fillRect(0, 0, u, u);
  g.restore();

  /* — THE CARVE (§1): the tile's whole bevel ring, and the skirt below it, are
       a darker shade of the tile's own colour — a piece set into the board, not
       a rectangle printed on it — and an inset bevel line a little further in,
       cut as a groove with a lit lip. This is what turns 100 printed rectangles
       into 100 seated pieces. — */
  const rim = u * ART.carveRim;
  const rimG = g.createLinearGradient(0, 0, u, u);
  rimG.addColorStop(0, hex(mixHex(ground, P.walnut, 0.30)));
  rimG.addColorStop(1, hex(mixHex(ground, P.walnutD, 0.54)));
  g.fillStyle = rimG;
  g.fillRect(0, 0, u, rim); g.fillRect(0, u - rim, u, rim);
  g.fillRect(0, 0, rim, u); g.fillRect(u - rim, 0, rim, u);

  const ins = u * ART.carveInset;
  g.lineWidth = Math.max(1.2, u * 0.015);
  g.strokeStyle = rgba(0x3a2415, 0.42);
  roundRect(g, ins, ins, u - ins * 2, u - ins * 2, u * 0.045);
  g.stroke();
  /* the lit lip of the groove, and ONLY on the two edges the key can reach.
     The key sits at 45 degrees off the front-left (scene.js RIG), and a cell's
     canvas lower-left is the board's front-left, so a ring of highlight all the
     way round is what made every tile look like a plastic button. */
  const lw = Math.max(1, u * 0.011), q = ins + lw * 1.5;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,248,232,0.30)';
  g.beginPath();
  g.moveTo(q, ins + u * 0.10); g.lineTo(q, u - q);
  g.lineTo(u - ins - u * 0.10, u - q);
  g.stroke();
  g.strokeStyle = rgba(0x3a2415, 0.20);
  g.beginPath();
  g.moveTo(u - q, u - ins - u * 0.10); g.lineTo(u - q, q);
  g.lineTo(ins + u * 0.10, q);
  g.stroke();
  g.lineCap = 'butt';

  /* — the printed inner rule: craft, at zero cost — */
  const m = u * ART.hairline * 2.0;
  g.strokeStyle = rgba(C.navy, kind === 'plain' ? 0.07 : 0.11);
  g.lineWidth = Math.max(1, u * 0.008);
  roundRect(g, m, m, u - m * 2, u - m * 2, u * 0.04);
  g.stroke();

  /* — the carved zone step, printed on the first row of each zone (DESIGN §4) — */
  if (row > 0 && row % 2 === 0) {
    g.fillStyle = rgba(P.walnutD, 0.30);
    g.fillRect(rim, rim, u - rim * 2, Math.max(1.5, u * 0.020));
  }

  /* — the semantic left edge: the lesson ribbon's 3dp edge, on the board itself,
       so a snake head is obvious BEFORE anyone lands on it (§5.2) — */
  const edge = EDGE[kind];
  if (edge != null) {
    const ex = rim, ew = u * ART.edgeStrip;
    const eg = g.createLinearGradient(ex, 0, ex + ew, 0);
    eg.addColorStop(0, hex(mixHex(edge, 0x000000, 0.22)));
    eg.addColorStop(0.55, hex(edge));
    eg.addColorStop(1, hex(mixHex(edge, 0xffffff, 0.18)));
    g.fillStyle = eg;
    g.fillRect(ex, rim, ew, u - rim * 2);
    g.fillStyle = rgba(0x000000, 0.16);
    g.fillRect(ex + ew, rim, u * 0.012, u - rim * 2);
  }

  if (isGold(kind)) {
    g.strokeStyle = rgba(P.goldLeaf, 0.95);
    g.lineWidth = Math.max(1.6, u * 0.030);
    roundRect(g, u * 0.090, u * 0.090, u * 0.820, u * 0.820, u * 0.050);
    g.stroke();
    g.strokeStyle = rgba(P.goldPale, 0.70);
    g.lineWidth = Math.max(1, u * 0.011);
    roundRect(g, u * 0.132, u * 0.132, u * 0.736, u * 0.736, u * 0.042);
    g.stroke();
  }

  drawBadge(g, n, u, kind);

  /* — heritage: a quiet mark, bottom-right, on the six re-tenanted squares (§4) — */
  if (CFG.game.heritageSquares.includes(n)) {
    g.save();
    g.translate(u * 0.86, u * 0.86);
    g.fillStyle = rgba(C.muted, 0.55);
    star(g, 4, u * 0.052, u * 0.017, Math.PI / 4);
    g.fill();
    g.restore();
  }

  /* — the Bura Waqt Fund ladder foot gets the brass lota dot (§10.6) — */
  if (n === CFG.game.shieldLadderFrom) {
    g.beginPath();
    g.arc(u * 0.86, u * 0.60, u * 0.055, 0, Math.PI * 2);
    g.fillStyle = hex(C.brass); g.fill();
    g.lineWidth = Math.max(1, u * 0.012);
    g.strokeStyle = rgba(C.navy, 0.35); g.stroke();
  }

  if (showTitles) drawTitle(g, n, u, kind);

  /* — LAST, always (§5: ornament must never cost a numeral) — */
  drawNumeral(g, n, u, kind);
}

/* the square number — Nunito 800 navy, never dropped and never covered (§6.4
   rule 2: "if a number is ever occluded, the geometry loses").

   Two layers do that between them.
   1. The tile atlas, where the numeral belongs: it is part of the painted board,
      it sits at the tile's own height so it can never drift off its square, and
      numeralCorner() slides it to whatever patch of its own tile the furniture's
      projected footprint does not reach — normally the historic front-left.
   2. The overlay, for the handful of squares a long diagonal ladder crosses
      corner to corner, where no patch is free at all. A plaque painted into the
      tile atlas cannot help there: the atlas is UNDER the rail, so the rail
      paints over the plaque too. Those numerals are queued here and drawn by
      drawOverlayAtlas() into a second texture that renders last with depth
      testing off, so the number sits ON the rail. That layer is the only thing
      in the build allowed to break depth, and it is allowed because a square
      that lies about its own number breaks the whole game. */
const OVERLAY_OCC = 0.015;     // above this the tile atlas cannot win; go overlay
const overlayJobs = [];        // {n, kind, spot} — filled by drawAtlas, drained after

/* Which squares may use the overlay at all. Furniture-free squares never can,
   which keeps the overlay mesh down to the ~40 quads it can actually paint —
   and square 100 never can either, because it rides finishGroup and rises out
   of the board while the overlay stays flat. Both the mesh and the painter read
   this one predicate, so a job can never exist without a quad under it. */
function overlayEligible(n) {
  return n !== N * N && occRect(n, 0, 0, 1, 1) > 0;
}

function numeralMetrics(g, n, u, kind, sc) {
  const boost = kind === 'finish' ? 1.24 : kind === 'milestone' ? 1.10 : 1.0;
  const s = String(n);
  let px = B.numberSize * u * boost * numeralScale * (sc || 1);
  if (s.length >= 3) px *= 0.80;
  g.font = font(800, px);
  return { s, px, w: g.measureText(s).width };
}

function drawNumeral(g, n, u, kind) {
  const m = numeralMetrics(g, n, u, kind, 1);
  /* cap height, not em box — a digit's ink is about 72% of its point size */
  const wf = m.w / u, hf = (m.px * 0.72) / u;
  let spot = numeralCorner(n, kind, wf, hf);
  /* square 100 rides finishGroup and rises out of the board; the overlay is
     flat, so that one numeral always stays welded to its own tile */
  if (spot.occ > OVERLAY_OCC && overlayEligible(n)) {
    /* The overlay plaque is OPAQUE and draws above the furniture, so nothing
       under it can touch the glyph. Every square unit the router gave up to
       dodge a rail was therefore given up for nothing. Re-place with the
       furniture ignored: full size, at home, on the tablet. */
    const free = numeralCorner(n, kind, wf, hf, true);
    free.occ = occRect(n, free.x0, free.base - hf * free.scale, free.x0 + wf * free.scale, free.base);
    placed.set(n, free);
    overlayJobs.push({ n, kind, spot: free });
    return;
  }
  placed.set(n, spot);          // describeCell() reports it, so a probe can audit
  paintNumeral(g, n, u, kind, spot, false);
}

/**
 * Paint one numeral at its chosen spot.
 * @param {boolean} plaque  true on the overlay: an opaque ivory tablet, because
 *   the thing behind it is a bamboo rail and a halo would not survive it.
 */
function paintNumeral(g, n, u, kind, spot, plaque) {
  const m = numeralMetrics(g, n, u, kind, spot.scale);
  const px = m.px, w = m.w, s = m.s;
  const x = spot.x0 * u, y = spot.base * u;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';

  if (plaque) {
    const bx = x - px * 0.26, by = y - px * 0.84;
    const bw = w + px * 0.52, bh = px * 1.02;
    const r = bh * 0.30;
    g.save();
    /* a real drop shadow: the tablet has to read as sitting above the rail */
    g.fillStyle = 'rgba(34,20,10,0.34)';
    roundRect(g, bx + u * 0.012, by + u * 0.016, bw, bh, r); g.fill();
    g.fillStyle = rgba(P.haloInk, 1);
    roundRect(g, bx, by, bw, bh, r); g.fill();
    g.lineWidth = Math.max(1.4, u * 0.014);
    g.strokeStyle = rgba(P.walnutD, 0.55);
    roundRect(g, bx, by, bw, bh, r); g.stroke();
    g.restore();
  } else {
    const strength = crossedCells().has(n) ? ART.haloCrossed : ART.haloPlain;
    const rx = w * 0.72 + px * 0.34, ry = px * 0.74;
    g.save();
    g.translate(x + w / 2, y - px * 0.34);
    g.scale(rx / ry, 1);
    const hg = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    hg.addColorStop(0.00, rgba(P.haloInk, 0.96 * strength));
    hg.addColorStop(0.52, rgba(P.haloInk, 0.78 * strength));
    hg.addColorStop(1.00, rgba(P.haloInk, 0));
    g.fillStyle = hg;
    g.beginPath(); g.arc(0, 0, ry, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  g.font = font(800, px);
  g.fillStyle = plaque ? 'rgba(58,36,21,0.22)' : 'rgba(58,36,21,0.30)';
  g.fillText(s, x + Math.max(1, u * 0.006), y + Math.max(1, u * 0.006));
  /* Square 100 sits on a raised gold plaque whose specular highlight lands
     exactly where the numeral does, and it washed navy out to a mid steel blue
     — measured at 2.79:1 against its own tile while 99 next door ran 5:1. It is
     the one numeral a player has to read to know she has won, so its ink is
     mixed much further toward black to survive the glint the art direction
     explicitly asks that plaque to catch. */
  const inkMix = kind === 'plain' ? 0 : kind === 'finish' ? 0.62 : 0.18;
  g.fillStyle = hex(inkMix ? mixHex(C.navy, 0x000000, inkMix) : C.navy);
  g.fillText(s, x, y);
}

/* the top-right marker. Shape carries the meaning; colour only reinforces it. */
function drawBadge(g, n, u, kind) {
  if (kind === 'plain') return;
  /* Square 100's badge used to be laid out like every other tile's — top-right,
     0.075 in from the cell edge — which put two thirds of the IFM roundel
     underneath the raised bezel. It is the only tile whose art is inset, so it
     is the only tile whose badge has to be. */
  const fin = kind === 'finish';
  const s = u * (fin ? ART.badge * 0.74 : ART.badge);
  const cx = fin ? u * (FINISH_SAFE[1] - 0.020) - s * 0.54
                 : u - u * 0.075 - s * 0.5;
  const cy = fin ? u * (FINISH_SAFE[0] + 0.020) + s * 0.54
                 : u * 0.075 + s * 0.5;
  const L = ladderAt(n), S = snakeAt(n);
  g.save();
  g.translate(cx, cy);
  g.lineJoin = 'round';

  if (kind === 'ladder' || kind === 'snake') {
    const up = kind === 'ladder';
    const col = up ? C.teal : C.clay;
    g.beginPath(); g.arc(0, s * 0.05, s * 0.50, 0, Math.PI * 2);
    g.fillStyle = 'rgba(58,36,21,0.28)'; g.fill();
    g.beginPath(); g.arc(0, 0, s * 0.50, 0, Math.PI * 2);
    g.fillStyle = hex(col); g.fill();
    g.strokeStyle = rgba(0xffffff, 0.88); g.lineWidth = Math.max(1, s * 0.07); g.stroke();
    /* a solid triangle — readable as a shape at 6 CSS px, when the colour is not */
    g.beginPath();
    const t = s * 0.26;
    if (up) { g.moveTo(0, -t); g.lineTo(t, t * 0.75); g.lineTo(-t, t * 0.75); }
    else    { g.moveTo(0,  t); g.lineTo(t, -t * 0.75); g.lineTo(-t, -t * 0.75); }
    g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    /* the destination square, when the atlas can carry legible type */
    if (showTitles && (L || S)) {
      g.font = font(800, s * 0.44);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = hex(col);
      const box = s * 0.62;
      roundRect(g, -box * 1.35, s * 0.52, box * 2.7, box * 0.86, box * 0.3);
      g.fillStyle = rgba(0xffffff, 0.92); g.fill();
      g.fillStyle = hex(col);
      g.fillText(String((L || S).to), 0, s * 0.52 + box * 0.45);
    }
  } else if (kind === 'event') {
    /* a diamond — the Jhatka deck. Muted grey, never alarming. */
    g.beginPath();
    g.moveTo(0, -s * 0.52); g.lineTo(s * 0.52, 0); g.lineTo(0, s * 0.52); g.lineTo(-s * 0.52, 0);
    g.closePath();
    g.fillStyle = hex(C.muted); g.fill();
    g.strokeStyle = rgba(0xffffff, 0.85); g.lineWidth = Math.max(1, s * 0.07); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(-s * 0.045, -s * 0.24, s * 0.09, s * 0.30);
    g.beginPath(); g.arc(0, s * 0.20, s * 0.055, 0, Math.PI * 2); g.fill();
  } else if (kind === 'quiz') {
    /* a square with a question mark — Sabka Sawaal. No wrong answers here. */
    roundRect(g, -s * 0.48, -s * 0.48, s * 0.96, s * 0.96, s * 0.22);
    g.fillStyle = hex(C.mint); g.fill();
    g.strokeStyle = hex(C.tealD); g.lineWidth = Math.max(1, s * 0.08); g.stroke();
    g.font = font(900, s * 0.70);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = hex(C.navy);
    g.fillText('?', 0, s * 0.03);
  } else if (kind === 'milestone') {
    g.fillStyle = 'rgba(90,58,12,0.35)';
    star(g, 8, s * 0.54, s * 0.23, 0.06); g.fill();
    g.fillStyle = hex(P.goldLeaf);
    star(g, 8, s * 0.52, s * 0.22, 0); g.fill();
    g.beginPath(); g.arc(0, 0, s * 0.17, 0, Math.PI * 2);
    g.fillStyle = hex(P.goldPale); g.fill();
  } else if (kind === 'finish') {
    /* the IFM mark: a gold roundel. Arrival, and nothing else, is gold. */
    g.beginPath(); g.arc(0, 0, s * 0.54, 0, Math.PI * 2);
    g.fillStyle = hex(C.navy); g.fill();
    g.beginPath(); g.arc(0, 0, s * 0.54, 0, Math.PI * 2);
    g.strokeStyle = hex(P.goldLeaf); g.lineWidth = Math.max(1.2, s * 0.09); g.stroke();
    g.font = font(900, s * 0.40);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = hex(C.goldLt);
    g.fillText('IFM', 0, s * 0.02);
  }
  g.restore();
}

/* opt-in only (projector, or a big screen). DESIGN §4 keeps the play surface to
   numbers alone by default; a title at 36 CSS px of cell height cannot be read. */
function drawTitle(g, n, u, kind) {
  const sq = squareAt(n);
  if (!sq || !sq.title) return;
  const px = u * 0.105;
  g.font = font(700, px);
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillStyle = rgba(kind === 'plain' ? C.navy : C.navy, 0.78);
  const maxW = u * 0.60, words = String(sq.title).split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    if (lines.length === 2) break;
  }
  if (lines.length < 2 && line) lines.push(line);
  const x = u * 0.10, y0 = u * 0.185;
  lines.slice(0, 2).forEach((t, i) => g.fillText(t, x, y0 + i * px * 1.18));
}

/** an n-pointed star path, centred at the current origin */
function star(g, points, outer, inner, rot) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / points;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

/* ── the non-colour atlas ──────────────────────────────────────────────────
   R = bump height, G = roughness, B = metalness, packed into ONE texture that
   the tile material binds three times. This is how §2's "milestones in gold
   leaf with real metalness, so they glint as the key light moves" happens
   without a second mesh, a second material or a second draw call — and it is
   also what makes the inset bevel a groove in the light rather than a line
   somebody drew. Skipped on low, which has no env map for metal to reflect. */
function drawPbrAtlas() {
  const S = pbrPx, u = S / N;
  const g = pbrCanvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  const ROUGH = Math.round(255 * 0.92);       // paper, before material.roughness
  for (let n = 1; n <= N * N; n++) {
    const { row, col } = cellRowCol(n);
    const kind = cellKind(n);
    g.save();
    g.translate(col * u, (N - 1 - row) * u);

    g.fillStyle = `rgb(150,${ROUGH},0)`;
    g.fillRect(0, 0, u, u);

    if (isGold(kind)) {
      /* the gold field: smoother, and properly metal */
      g.fillStyle = 'rgb(150,84,236)';
      g.fillRect(u * 0.075, u * 0.075, u * 0.85, u * 0.85);
      /* the raised gold keyline around it */
      g.strokeStyle = 'rgb(226,62,250)';
      g.lineWidth = Math.max(1.6, u * 0.030);
      roundRect(g, u * 0.090, u * 0.090, u * 0.820, u * 0.820, u * 0.050);
      g.stroke();
    }

    /* the carved lip: low and rough */
    const rim = u * ART.carveRim;
    g.fillStyle = `rgb(40,${Math.round(255 * 0.98)},0)`;
    g.fillRect(0, 0, u, rim); g.fillRect(0, u - rim, u, rim);
    g.fillRect(0, 0, rim, u); g.fillRect(u - rim, 0, rim, u);

    /* the inset bevel: a groove, then the ridge beside it */
    const ins = u * ART.carveInset;
    g.lineWidth = Math.max(1.2, u * 0.014);
    g.strokeStyle = `rgb(58,${Math.round(255 * 0.98)},0)`;
    roundRect(g, ins, ins, u - ins * 2, u - ins * 2, u * 0.045);
    g.stroke();
    g.lineWidth = Math.max(1, u * 0.010);
    g.strokeStyle = `rgb(214,${Math.round(255 * 0.80)},0)`;
    roundRect(g, ins + g.lineWidth * 1.35, ins + g.lineWidth * 1.35,
              u - (ins + g.lineWidth * 1.35) * 2, u - (ins + g.lineWidth * 1.35) * 2, u * 0.040);
    g.stroke();

    g.restore();
  }
}

function usePbr() { return CFG.quality.current.tier !== 'low'; }

function ensureAtlas() {
  const want = atlasSize();
  if (!atlasCanvas || atlasPx !== want) {
    atlasPx = want;
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasCanvas.height = want;
    if (atlasTex) { atlasTex.dispose(); atlasTex = null; }
  }
  drawAtlas();
  if (!atlasTex) {
    atlasTex = new THREE.CanvasTexture(atlasCanvas);
    atlasTex.colorSpace = THREE.SRGBColorSpace;
    atlasTex.anisotropy = CFG.quality.current.anisotropy || 1;
    atlasTex.generateMipmaps = true;
    atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTex.magFilter = THREE.LinearFilter;
    disposables.push(atlasTex);
  }
  atlasTex.needsUpdate = true;

  if (ovCanvas && !ovTex) {
    ovTex = new THREE.CanvasTexture(ovCanvas);
    ovTex.colorSpace = THREE.SRGBColorSpace;
    ovTex.anisotropy = CFG.quality.current.anisotropy || 1;
    ovTex.generateMipmaps = true;
    ovTex.minFilter = THREE.LinearMipmapLinearFilter;
    ovTex.magFilter = THREE.LinearFilter;
    disposables.push(ovTex);
  }
  if (ovTex) ovTex.needsUpdate = true;

  if (usePbr()) {
    const pw = Math.max(512, want / 2);
    if (!pbrCanvas || pbrPx !== pw) {
      pbrPx = pw;
      pbrCanvas = document.createElement('canvas');
      pbrCanvas.width = pbrCanvas.height = pw;
      if (pbrTex) { pbrTex.dispose(); pbrTex = null; }
    }
    drawPbrAtlas();
    if (!pbrTex) {
      pbrTex = new THREE.CanvasTexture(pbrCanvas);
      pbrTex.colorSpace = THREE.NoColorSpace;   // bump/rough/metal are data, not colour
      pbrTex.anisotropy = CFG.quality.current.anisotropy || 1;
      pbrTex.minFilter = THREE.LinearMipmapLinearFilter;
      pbrTex.magFilter = THREE.LinearFilter;
      disposables.push(pbrTex);
    }
    pbrTex.needsUpdate = true;
  }
  return atlasTex;
}

function redrawAtlas() {
  if (!atlasCanvas) return;
  drawAtlas();
  if (atlasTex) atlasTex.needsUpdate = true;
  if (ovTex) ovTex.needsUpdate = true;
  if (usePbr() && pbrCanvas) { drawPbrAtlas(); if (pbrTex) pbrTex.needsUpdate = true; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. GEOMETRY — hand-built so every quad's winding is derived, never guessed.
   ═══════════════════════════════════════════════════════════════════════════ */

const UP = [0, 1, 0];
function newGeo(withUv) { return { pos: [], nor: [], uv: withUv ? [] : null, idx: [] }; }

function triNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz);
  return l < 1e-9 ? null : [nx / l, ny / l, nz / l];
}

/** Push one quad a→b→c→d, oriented so its face normal agrees with 'ref'. */
function pushQuad(G, a, b, c, d, ref, ua, ub, uc, ud) {
  const n = triNormal(a, b, c) || triNormal(a, c, d);
  if (!n) return;
  const flip = n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0;
  const V = flip ? [a, d, c, b] : [a, b, c, d];
  const U = flip ? [ua, ud, uc, ub] : [ua, ub, uc, ud];
  const nn = flip ? [-n[0], -n[1], -n[2]] : n;
  const i0 = G.pos.length / 3;
  for (let k = 0; k < 4; k++) {
    G.pos.push(V[k][0], V[k][1], V[k][2]);
    G.nor.push(nn[0], nn[1], nn[2]);
    if (G.uv) G.uv.push(U[k] ? U[k][0] : 0, U[k] ? U[k][1] : 0);
  }
  G.idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
}

function finishGeo(G) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(G.nor, 3));
  if (G.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(G.uv, 2));
  g.setIndex(G.idx);
  g.computeBoundingSphere();
  disposables.push(g);
  return g;
}

const UVPAD = 0.018;   // keep a tile's texels off its neighbour's under mipmapping

/** one painted tile: top face, bevel ring, skirt down to the slab */
function addTile(G, n, skirtTo) {
  const { row, col } = cellRowCol(n);
  const cx = -HALF + (col + 0.5) * CELL, cz = HALF - (row + 0.5) * CELL, y = rowY(row);
  const h = (CELL - B.tileGap) / 2;
  const bv = Math.min(B.bevel, h * 0.45);
  const ih = h - bv;
  const drop = bv * ART.bevelDrop;
  const baseY = skirtTo != null ? skirtTo : -ART.plateDepth;
  const u0 = col / N, v0 = row / N;
  const uv = (lx, lz) => [
    u0 + (UVPAD + (lx / CELL + 0.5) * (1 - 2 * UVPAD)) / N,
    v0 + (UVPAD + (0.5 - lz / CELL) * (1 - 2 * UVPAD)) / N,
  ];
  const P2 = (lx, lz, ly) => [cx + lx, ly, cz + lz];

  const inner = [[-ih, -ih], [ih, -ih], [ih, ih], [-ih, ih]];
  const outer = [[-h, -h], [h, -h], [h, h], [-h, h]];

  pushQuad(G,
    P2(inner[0][0], inner[0][1], y), P2(inner[1][0], inner[1][1], y),
    P2(inner[2][0], inner[2][1], y), P2(inner[3][0], inner[3][1], y), UP,
    uv(inner[0][0], inner[0][1]), uv(inner[1][0], inner[1][1]),
    uv(inner[2][0], inner[2][1]), uv(inner[3][0], inner[3][1]));

  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    const ai = inner[k], bi = inner[k2], co = outer[k2], dOut = outer[k];
    // outward unit vector for this edge, in XZ
    let ox = (dOut[0] + co[0]) / 2 - (ai[0] + bi[0]) / 2;
    let oz = (dOut[1] + co[1]) / 2 - (ai[1] + bi[1]) / 2;
    const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
    const bl = Math.hypot(bv * 0, drop, bv) || 1;
    const bevRef = [ox * drop / bl, bv / bl, oz * drop / bl];

    pushQuad(G,
      P2(ai[0], ai[1], y), P2(bi[0], bi[1], y),
      P2(co[0], co[1], y - drop), P2(dOut[0], dOut[1], y - drop), bevRef,
      uv(ai[0], ai[1]), uv(bi[0], bi[1]), uv(co[0], co[1]), uv(dOut[0], dOut[1]));

    pushQuad(G,
      P2(dOut[0], dOut[1], y - drop), P2(co[0], co[1], y - drop),
      P2(co[0], co[1], baseY), P2(dOut[0], dOut[1], baseY), [ox, 0, oz],
      uv(dOut[0], dOut[1]), uv(co[0], co[1]), uv(co[0], co[1]), uv(dOut[0], dOut[1]));
  }
}

function buildTiles(cells, skirtTo) {
  const G = newGeo(true);
  for (const n of cells) addTile(G, n, skirtTo);
  return finishGeo(G);
}

/* ── the frame path — shared by the walnut frame and the brass keyline ────── */
function framePath() {
  const pts = [];
  const push = (x, y, z) => {
    const p = pts[pts.length - 1];
    if (p && Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - y) < 1e-6 && Math.abs(p[2] - z) < 1e-6) return;
    pts.push([x, y, z]);
  };
  push(-HALF, rowY(0), HALF);
  for (let r = 0; r < N; r++) { push(HALF, rowY(r), HALF - r); push(HALF, rowY(r), HALF - r - 1); }
  push(-HALF, rowY(N - 1), -HALF);
  for (let r = N - 1; r >= 0; r--) { push(-HALF, rowY(r), HALF - r - 1); push(-HALF, rowY(r), HALF - r); }
  const first = pts[0], last = pts[pts.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1], first[2] - last[2]) < 1e-6) pts.pop();

  /* arc length in XZ only — a vertical riser must not stretch the block print */
  const s = new Array(pts.length + 1).fill(0);
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s[i + 1] = s[i] + Math.hypot(pts[j][0] - pts[i][0], pts[j][2] - pts[i][2]);
  }
  return { pts, s, len: s[pts.length] };
}

/** which way is "outward" from a point sitting on the playfield boundary */
function outwardOf(x, z) {
  return [Math.abs(Math.abs(x) - HALF) < 1e-6 ? Math.sign(x) : 0,
          Math.abs(Math.abs(z) - HALF) < 1e-6 ? Math.sign(z) : 0];
}

/** the dark walnut frame — a staircase rail, because the road is a hillside.
    UV'd along its own perimeter so it can carry a block-print border (§4). */
function buildFrame(path) {
  const { pts, s, len } = path;
  const REP = Math.max(4, Math.round(len / 3.6));   // one motif tile per 3.6 units
  const bw = B.border, rise = B.borderRise, bot = -B.thickness;
  const out = pts.map(([x, y, z]) => {
    const [ox, oz] = outwardOf(x, z);
    return [x + ox * bw, y + rise, z + oz * bw, ox, oz];
  });

  const G = newGeo(true);
  const U = (i) => (s[i] / len) * REP;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const a = pts[i], b = pts[j], c = out[j], d = out[i];
    const ui = U(i), uj = i === pts.length - 1 ? REP : U(j);
    // top band, sloping gently up from the tile plane to the rim — the ornament lives here
    pushQuad(G, [a[0], a[1], a[2]], [b[0], b[1], b[2]],
                [c[0], c[1], c[2]], [d[0], d[1], d[2]], UP,
                [ui, 0.02], [uj, 0.02], [uj, 0.48], [ui, 0.48]);
    // outer wall
    let rx = d[3] + c[3], rz = d[4] + c[4];
    const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    pushQuad(G, [d[0], d[1], d[2]], [c[0], c[1], c[2]],
                [c[0], bot, c[2]], [d[0], bot, d[2]], [rx, 0, rz],
                [ui, 0.52], [uj, 0.52], [uj, 0.99], [ui, 0.99]);
    // inner wall, only where the row steps up — this is what carves the ghat steps.
    // Zero XZ length, so it takes a fixed patch of plain grain instead of a smear.
    if (Math.abs(a[1] - b[1]) > 1e-6) {
      const lo = Math.min(a[1], b[1]);
      pushQuad(G, [a[0], a[1], a[2]], [b[0], b[1], b[2]],
                  [b[0], lo, b[2]], [a[0], lo, a[2]],
                  [a[0] === b[0] ? -Math.sign(a[0]) : 0, 0, a[2] === b[2] ? -Math.sign(a[2]) : 0],
                  [0.03, 0.56], [0.11, 0.56], [0.11, 0.74], [0.03, 0.74]);
    }
  }
  return finishGeo(G);
}

/** §1 — the brass inlay keyline between the frame and the playfield. */
function buildKeyline(path) {
  const { pts } = path;
  const w = 0.062, lift = 0.005;
  const G = newGeo(false);
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const a = pts[i], b = pts[j];
    if (Math.abs(a[1] - b[1]) > 1e-6) continue;      // a riser has no keyline
    const [ax, az] = outwardOf(a[0], a[2]);
    const [bx, bz] = outwardOf(b[0], b[2]);
    pushQuad(G,
      [a[0], a[1] + lift, a[2]], [b[0], b[1] + lift, b[2]],
      [b[0] + bx * w, b[1] + lift, b[2] + bz * w],
      [a[0] + ax * w, a[1] + lift, a[2] + az * w], UP);
  }
  return finishGeo(G);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LITTLE TEXTURES — the table, the frame strip, the pad, the rings
   ═══════════════════════════════════════════════════════════════════════════ */

function canvasTex(px, draw, h) {
  const cv = document.createElement('canvas');
  cv.width = px; cv.height = h || px;
  draw(cv.getContext('2d'), px, h || px);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = CFG.quality.current.anisotropy || 1;
  disposables.push(t);
  return t;
}

/* ── the table (§1/§2) ─────────────────────────────────────────────────────
   Was a flat beige radial gradient, which is what a background looks like. It
   is lacquered plank wood now: real seams every 4 world units, per-plank colour
   drift, long grain and a few knots. The texture is one 16-unit patch tiled
   across the 62-unit plane, so a plank seam is 64 texels per world unit rather
   than 8 — sharp at the camera's rest pose instead of a smear. */
function tableTexture() {
  const t = canvasTex(1024, (g, S) => {
    const planks = 4, ph = S / planks;
    for (let i = 0; i < planks; i++) {
      const drift = (i % 2 ? 0.07 : -0.05) + (i === 2 ? 0.04 : 0);
      g.fillStyle = hex(mixHex(P.tableBase, drift > 0 ? 0x4a3020 : 0xb08a63, Math.abs(drift) * 2.2));
      g.fillRect(0, i * ph, S, ph);
      // long grain, running with the plank; symmetric so it tiles in x
      for (let k = 0; k < 130; k++) {
        const y = i * ph + Math.random() * ph;
        const lit = Math.random() < 0.42;
        g.strokeStyle = lit ? 'rgba(226,196,158,0.10)' : 'rgba(46,28,15,0.14)';
        g.lineWidth = 0.4 + Math.random() * 2.4;
        const d = Math.random() * 5 - 2.5;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(S * 0.3, y + d, S * 0.7, y - d, S, y);
        g.stroke();
      }
      // a knot or two per plank
      for (let k = 0; k < 2; k++) {
        const kx = S * (0.12 + Math.random() * 0.72), ky = i * ph + ph * (0.25 + Math.random() * 0.5);
        for (let r = 7; r > 0; r--) {
          g.strokeStyle = 'rgba(52,30,16,' + (0.05 + r * 0.012).toFixed(3) + ')';
          g.lineWidth = 1.4;
          g.beginPath(); g.ellipse(kx, ky, r * 3.6, r * 2.0, 0.3, 0, Math.PI * 2); g.stroke();
        }
      }
      // the seam
      g.fillStyle = 'rgba(38,22,11,0.55)';
      g.fillRect(0, i * ph, S, Math.max(2, S * 0.0035));
      g.fillStyle = 'rgba(232,206,168,0.10)';
      g.fillRect(0, i * ph + Math.max(2, S * 0.0035), S, Math.max(1, S * 0.002));
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const rep = ART.tableSize / 16;
  t.repeat.set(rep, rep);
  return t;
}

/* The vignette (§1 "a vignette so the corners fall off") plus, on tiers with no
   real shadow map, the board's baked contact pool. Painted over the planks as
   one transparent overlay, because a repeating texture cannot carry a gradient
   that is unique to the middle of the table. */
function tableVignetteTexture(bakePool) {
  return canvasTex(1024, (g, S) => {
    const c = S / 2, unit = S / ART.tableSize;   // px per world unit
    g.clearRect(0, 0, S, S);
    const from = 6.4 * unit, to = 19.0 * unit;
    const vg = g.createRadialGradient(c, c, from, c, c, to);
    vg.addColorStop(0.00, rgba(P.tableVig, 0));
    vg.addColorStop(0.45, rgba(P.tableVig, 0.30));
    vg.addColorStop(0.80, rgba(P.tableVig, 0.66));
    vg.addColorStop(1.00, rgba(P.tableVig, 0.86));
    g.fillStyle = vg; g.fillRect(0, 0, S, S);
    g.fillStyle = rgba(P.tableVig, 0.86);
    g.fillRect(0, 0, S, S * 0.02); g.fillRect(0, S * 0.98, S, S * 0.02);
    g.fillRect(0, 0, S * 0.02, S); g.fillRect(S * 0.98, 0, S * 0.02, S);
    if (!bakePool) return;
    /* the key is front-left at 45 degrees, so the board's shadow falls back-right */
    const bw = (HALF + B.border) * unit;
    const sx = c + unit * 0.45, sy = c - unit * 0.45;
    const sh = g.createRadialGradient(sx, sy, bw * 0.62, sx, sy, bw * 1.62);
    sh.addColorStop(0.00, 'rgba(32,19,10,0.50)');
    sh.addColorStop(0.50, 'rgba(32,19,10,0.24)');
    sh.addColorStop(1.00, 'rgba(32,19,10,0)');
    g.fillStyle = sh; g.fillRect(0, 0, S, S);
  });
}

/* ── the frame strip (§1 grain, §4 block print) ────────────────────────────
   v 0.00-0.50 is the top band — the face that carries the border motif.
   v 0.50-1.00 is the outer wall, plain darker walnut.
   One 1024x256 patch spans 3.6 world units along the perimeter, so the print
   is the same size on the front rail as on the sides. */
function frameTexture() {
  const t = canvasTex(1024, (g, W, H) => {
    g.fillStyle = hex(P.walnut);
    g.fillRect(0, 0, W, H);

    /* walnut grain, both halves */
    for (let i = 0; i < 460; i++) {
      const y = Math.random() * H;
      const lit = Math.random() < 0.42;
      g.strokeStyle = lit ? rgba(P.walnutL, 0.10 + Math.random() * 0.12)
                          : rgba(0x2a1608, 0.08 + Math.random() * 0.16);
      g.lineWidth = 0.4 + Math.random() * 2.6;
      const d = Math.random() * 6 - 3;
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(W * 0.28, y + d, W * 0.72, y - d, W, y);
      g.stroke();
    }
    /* the outer wall is in its own shade */
    g.fillStyle = 'rgba(24,13,5,0.30)';
    g.fillRect(0, H * 0.5, W, H * 0.5);

    /* — the block print, on the top band only — */
    const bandTop = 0, bandH = H * 0.5;
    g.save();
    g.beginPath(); g.rect(0, bandTop, W, bandH); g.clip();

    /* two running rules, the way a printed border is bounded */
    for (const [yy, a, col] of [[bandH * 0.15, 0.55, P.walnutD], [bandH * 0.17, 0.32, P.walnutL],
                                [bandH * 0.85, 0.55, P.walnutD], [bandH * 0.83, 0.28, P.walnutL]]) {
      g.fillStyle = rgba(col, a);
      g.fillRect(0, yy, W, Math.max(1.5, bandH * 0.018));
    }

    const STAMPS = 5;                     // five per patch = one per 0.72 world units.
    const cyc = W / STAMPS;               // eight was 7 CSS px on a phone: invisible.
    for (let i = 0; i < STAMPS; i++) {
      const cx = (i + 0.5) * cyc, cy = bandH * 0.5;
      const R = bandH * 0.30;
      /* the carved shadow first, then the lit face — a block print is pressed in */
      for (const [dx, dy, col, al] of [[bandH * 0.040, bandH * 0.040, P.walnutD, 0.80],
                                       [0, 0, P.walnutL, 0.78]]) {
        g.save();
        g.translate(cx + dx, cy + dy);
        g.fillStyle = rgba(col, al);
        if (i % 2 === 0) {
          /* a lotus diamond */
          star(g, 4, R * 1.35, R * 0.42, 0); g.fill();
          g.beginPath(); g.arc(0, 0, R * 0.24, 0, Math.PI * 2); g.fill();
        } else {
          /* a paisley teardrop, leaning the way a hand-cut block leans */
          g.beginPath();
          g.moveTo(0, -R * 1.15);
          g.bezierCurveTo(R * 0.95, -R * 0.45, R * 0.72, R * 0.85, 0, R * 1.05);
          g.bezierCurveTo(-R * 0.72, R * 0.85, -R * 0.95, -R * 0.45, 0, -R * 1.15);
          g.closePath(); g.fill();
        }
        g.restore();
      }
      /* the tie between the stamps */
      g.strokeStyle = rgba(P.walnutL, 0.50);
      g.lineWidth = Math.max(1.5, bandH * 0.032);
      g.beginPath();
      g.moveTo(cx + cyc * 0.26, cy);
      g.quadraticCurveTo(cx + cyc * 0.5, cy - bandH * 0.17, cx + cyc * 0.74, cy);
      g.stroke();
    }
    g.restore();
  }, 256);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* §4 — "the IFM mark EMBOSSED, not pasted, into the board's frame at one
   corner." A carved mark on the front rail: the same glyph three times, a dark
   cut down-right and a lit lip up-left, which is where a raking key light from
   the front-left puts them. */
function ifmMarkTexture() {
  return canvasTex(512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const draw = (dx, dy, col, a) => {
      g.save();
      g.translate(W / 2 + dx, H / 2 + dy);
      g.globalAlpha = a;
      g.strokeStyle = col; g.fillStyle = col;
      g.lineWidth = W * 0.016;
      g.beginPath(); g.ellipse(0, 0, W * 0.40, H * 0.30, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(0, 0, W * 0.355, H * 0.245, 0, 0, Math.PI * 2); g.stroke();
      g.font = font(900, H * 0.30);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('IFM', 0, -H * 0.005);
      g.font = fontD(H * 0.115);
      g.fillText('saanp seedhi', 0, H * 0.165);
      g.restore();
    };
    draw(W * 0.010, -H * 0.014, '#f4d9b4', 0.55);   // the lit lip, toward the key
    draw(-W * 0.010, H * 0.014, '#1b0e04', 0.72);   // the cut, away from it
    draw(0, 0, '#7a5030', 0.85);                    // the face of the carving
  }, 256);
}

function padTexture() {
  return canvasTex(256, (g, S) => {
    g.fillStyle = hex(mixHex(P.ivoryA, C.mintLt, 0.5));
    roundRect(g, 6, 6, S - 12, S - 12, S * 0.14); g.fill();
    g.setLineDash([S * 0.05, S * 0.038]);
    g.strokeStyle = rgba(C.muted, 0.75); g.lineWidth = S * 0.022;
    roundRect(g, S * 0.10, S * 0.10, S * 0.80, S * 0.80, S * 0.10); g.stroke();
    g.setLineDash([]);
    g.font = font(800, S * 0.17);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = hex(C.navy);
    g.fillText('SHURU', S / 2, S / 2);
  });
}

/** a soft ring, faked with stacked strokes so it works without ctx.filter */
function ringTexture(color, { dashed = false, fill = 0 } = {}) {
  return canvasTex(256, (g, S) => {
    const c = S / 2, R = S * 0.365;
    if (fill > 0) {
      const grd = g.createRadialGradient(c, c, 0, c, c, R);
      grd.addColorStop(0, rgba(color, fill));
      grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    }
    if (dashed) g.setLineDash([S * 0.082, S * 0.062]);
    g.lineCap = dashed ? 'butt' : 'round';
    for (let i = 8; i >= 0; i--) {
      g.strokeStyle = rgba(color, i === 0 ? 0.95 : 0.055 * (1 - i / 9));
      g.lineWidth = S * (0.048 + i * 0.019);
      g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.stroke();
    }
    g.setLineDash([]);
  });
}

function bloomTexture() {
  return canvasTex(256, (g, S) => {
    const c = S / 2;
    const grd = g.createRadialGradient(c, c, 0, c, c, c);
    grd.addColorStop(0, rgba(C.goldLt, 0.95));
    grd.addColorStop(0.34, rgba(C.gold, 0.42));
    grd.addColorStop(1, rgba(C.gold, 0));
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  });
}

function flatPlane(size, tex, opts = {}) {
  const geo = new THREE.PlaneGeometry(size, size);
  disposables.push(geo);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false, ...opts,
  });
  disposables.push(mat);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. BUILD
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build the board and add it to 'scene'.
 * @returns {THREE.Group}
 */
export function buildBoard(scene) {
  if (group) disposeBoard();
  const tier = CFG.quality.current;
  const shadows = tier.shadows === 'soft';

  group = new THREE.Group();
  group.name = 'snl-board';

  const tex = ensureAtlas();
  const envI = CFG.lighting.envIntensity;

  /* — the table — */
  const tableGeo = new THREE.PlaneGeometry(ART.tableSize, ART.tableSize);
  const tableMat = new THREE.MeshStandardMaterial({
    map: tableTexture(), roughness: V2.tableRough, metalness: 0,
    envMapIntensity: envI,
  });
  disposables.push(tableGeo, tableMat);
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -B.thickness - 0.004;
  table.receiveShadow = shadows;
  table.name = 'snl-table';
  group.add(table);

  /* — the vignette over it, and (where there is no shadow map) the board's
       baked contact pool — */
  const vig = flatPlane(ART.tableSize, tableVignetteTexture(!shadows), { toneMapped: true });
  vig.position.y = -B.thickness - 0.0034;
  vig.renderOrder = -850;
  vig.name = 'snl-table-vignette';
  group.add(vig);

  /* — the slab the tiles stand on. Dark, deliberately: it is what shows through
       the 0.02 gap between tiles, and a dark line there is the difference
       between a grid that is carved and a grid that is printed. — */
  const slabGeo = new THREE.BoxGeometry(HALF * 2, B.thickness - ART.plateDepth, HALF * 2);
  const slabMat = new THREE.MeshStandardMaterial({
    color: mixHex(P.walnutD, 0x000000, 0.25), roughness: V2.slabRough, metalness: 0,
    envMapIntensity: envI,
  });
  disposables.push(slabGeo, slabMat);
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = -(ART.plateDepth + (B.thickness - ART.plateDepth) / 2);
  slab.receiveShadow = shadows;
  slab.name = 'snl-slab';
  group.add(slab);

  /* — the dark walnut frame, with its block-print border — */
  const path = framePath();
  const frameTex = frameTexture();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: frameTex,
    bumpMap: frameTex, bumpScale: 0.35,
    roughness: V2.frameRough, metalness: CFG.materials.frame.metalness,
    envMapIntensity: envI,
  });
  disposables.push(frameMat);
  const frame = new THREE.Mesh(buildFrame(path), frameMat);
  frame.receiveShadow = shadows;
  frame.castShadow = shadows;
  frame.name = 'snl-frame';
  group.add(frame);

  /* — the brass inlay keyline between frame and playfield (§1) — */
  const keyMat = new THREE.MeshStandardMaterial({
    color: mixHex(C.brass, P.walnut, 0.30), roughness: V2.brassRough, metalness: V2.brassMetal,
    envMapIntensity: envI * 0.95,
  });
  disposables.push(keyMat);
  const keyline = new THREE.Mesh(buildKeyline(path), keyMat);
  keyline.name = 'snl-keyline';
  group.add(keyline);

  /* — the IFM mark, carved into the front rail (§4) — */
  const markGeo = new THREE.PlaneGeometry(1.05, 0.30);
  const markMat = new THREE.MeshStandardMaterial({
    map: ifmMarkTexture(), transparent: true, roughness: 0.52, metalness: 0,
    envMapIntensity: envI, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  disposables.push(markGeo, markMat);
  const mark = new THREE.Mesh(markGeo, markMat);
  mark.position.set(3.32, rowY(0) + B.borderRise * 0.5 + 0.004, HALF + B.border * 0.5);
  mark.rotation.x = -Math.PI / 2 - Math.atan2(B.borderRise, B.border);
  mark.renderOrder = 2;
  mark.name = 'snl-ifm-mark';
  group.add(mark);

  /* — 99 painted tiles, one mesh, one texture (plus the packed pbr atlas, which
       is what gives the milestones real gold leaf) — */
  const tileMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: V2.tileRough, metalness: 0,
    envMapIntensity: envI * 0.65,
  });
  if (usePbr() && pbrTex) {
    tileMat.roughnessMap = pbrTex;
    tileMat.metalnessMap = pbrTex;
    tileMat.bumpMap = pbrTex;
    tileMat.bumpScale = V2.bump;
    tileMat.roughness = V2.tileRough / 0.92;   // the map's 0.92 lands back on V2.tileRough
    tileMat.metalness = tier.envMap ? V2.tileMetal : V2.tileMetalLo;
  }
  disposables.push(tileMat);
  const body = [];
  for (let n = 1; n < N * N; n++) body.push(n);
  tilesMesh = new THREE.Mesh(buildTiles(body), tileMat);
  tilesMesh.receiveShadow = shadows;
  tilesMesh.name = 'snl-tiles';
  group.add(tilesMesh);

  /* — the numeral overlay (§6.4 rule 2). Flat quads on the tiles, drawn last
       with depth testing off, carrying only the numerals a ladder or a snake
       would otherwise cross out. Everywhere else the texture is transparent and
       nothing is painted at all. One draw call, 200 triangles. — */
  const ovGeo = ovTex ? buildNumeralOverlay() : null;
  if (ovGeo) {
    const ovMat = new THREE.MeshBasicMaterial({
      map: ovTex, transparent: true, depthTest: false, depthWrite: false,
      toneMapped: false,
    });
    disposables.push(ovMat);
    ovMesh = new THREE.Mesh(ovGeo, ovMat);
    ovMesh.renderOrder = 40;
    ovMesh.frustumCulled = false;
    ovMesh.name = 'snl-numerals';
    group.add(ovMesh);
  }

  /* — square 100: its own mesh so it can rise out of the board (§9 #34), and a
       raised gold bezel around it so it reads as a plaque, not a tile (§2) — */
  finishGroup = new THREE.Group();
  finishGroup.name = 'snl-finish';
  const f = cellToWorld(N * N);
  finishTile = new THREE.Mesh(buildTiles([N * N], -(ART.plateDepth + 1.0)), tileMat);
  finishTile.receiveShadow = shadows;
  finishGroup.add(finishTile);

  const rimGeo = new THREE.TorusGeometry(CELL * 0.545, CELL * 0.048, 6, 4, Math.PI * 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: P.goldLeaf, roughness: 0.22, metalness: 0.88,
    envMapIntensity: envI * 1.8,
  });
  disposables.push(rimGeo, rimMat);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.rotation.z = Math.PI / 4;
  rim.position.set(f.x, f.y + 0.018, f.z);
  rim.castShadow = shadows;
  rim.name = 'snl-finish-bezel';
  finishGroup.add(rim);

  finishBloom = flatPlane(CELL * 2.1, bloomTexture(), { blending: THREE.AdditiveBlending });
  finishBloom.position.set(f.x, f.y + 0.010, f.z);
  finishBloom.material.opacity = 0.30;
  finishBloom.renderOrder = 3;
  finishGroup.add(finishBloom);
  group.add(finishGroup);

  /* — the start pad, where cellToWorld(0) puts resting tokens. It rides the
       wooden front rail below square 1, so it is inside the camera's fit box on
       every device: a player who cannot see her own piece on turn one has been
       told nothing. Shaped to the rail rather than square, so it never sits on
       a numbered tile. — */
  const padGeo = new THREE.BoxGeometry(1.55, 0.07, 0.40);
  const padSide = new THREE.MeshStandardMaterial({ color: mixHex(P.ivoryA, P.walnut, 0.30), roughness: 0.7 });
  const padTop = new THREE.MeshStandardMaterial({ map: padTexture(), roughness: 0.62, metalness: 0 });
  disposables.push(padGeo, padSide, padTop);
  const pad = new THREE.Mesh(padGeo, [padSide, padSide, padTop, padSide, padSide, padSide]);
  pad.position.set(B.startPad.x, B.startPad.y - 0.035, B.startPad.z);
  pad.receiveShadow = shadows;
  pad.name = 'snl-startpad';
  group.add(pad);

  /* — highlights: three meshes, moved and animated, never redrawn — */
  ringActive = flatPlane(CELL * ART.ringPlane, ringTexture(C.teal, { fill: 0.10 }));
  ringActive.renderOrder = 5; ringActive.visible = false;
  ringActive.name = 'snl-hl-active';
  group.add(ringActive);

  ringTarget = flatPlane(CELL * (ART.ringPlane + 0.06), ringTexture(C.gold, { dashed: true }));
  ringTarget.renderOrder = 5; ringTarget.visible = false;
  ringTarget.name = 'snl-hl-target';
  group.add(ringTarget);

  ringPulse = flatPlane(CELL * ART.ringPlane, ringTexture(C.teal, { fill: 0.16 }));
  ringPulse.renderOrder = 6; ringPulse.visible = false;
  ringPulse.name = 'snl-hl-pulse';
  group.add(ringPulse);

  if (scene && scene.add) scene.add(group);
  startFrameLoop();

  /* Nunito arrives after first paint on a cold load — redraw once it does, so the
     numerals are never the fallback face. One extra 20-40 ms canvas pass, once. */
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (group) redrawAtlas(); }).catch(() => {});
  }
  return group;
}

export function getBoardGroup() { return group; }

/* ═══════════════════════════════════════════════════════════════════════════
   8. HIGHLIGHTS
   ═══════════════════════════════════════════════════════════════════════════ */

function placeRing(mesh, n) {
  const p = cellToWorld(n);
  mesh.position.set(p.x, p.y + 0.006, p.z);
}

/**
 * @param {number} n      square 1..100
 * @param {'active'|'target'|'none'} style
 *   'active' — a soft pulsing teal ring: whose token this is.
 *   'target' — a dashed gold ring: where this roll lands. Shown before the hop.
 *   'none'   — clear the highlight on that square (falsy 'n' clears everything).
 */
export function highlightCell(n, style = 'active') {
  if (!group) return;
  const cell = Math.round(n) || 0;
  if (style === 'none' || style == null) {
    if (!cell) {
      hl.active.on = hl.target.on = false;
      ringActive.visible = ringTarget.visible = false;
    } else {
      if (hl.active.cell === cell) { hl.active.on = false; ringActive.visible = false; }
      if (hl.target.cell === cell) { hl.target.on = false; ringTarget.visible = false; }
    }
    return;
  }
  const isTarget = style === 'target';
  const mesh = isTarget ? ringTarget : ringActive;
  const rec = isTarget ? hl.target : hl.active;
  if (cell < 1) { rec.on = false; mesh.visible = false; return; }
  rec.cell = cell; rec.on = true;
  placeRing(mesh, cell);
  mesh.visible = true;
  if (prefersReducedMotion()) {
    mesh.material.opacity = isTarget ? 0.85 : 0.7;
    mesh.scale.setScalar(1);
  }
}

/** One expanding ring — a landing, a shield grant, a square worth looking at. */
export function pulseCell(n) {
  if (!group) return;
  const cell = Math.round(n) || 0;
  if (cell < 1) return;
  hl.pulse.cell = cell;
  hl.pulse.t = 0;
  placeRing(ringPulse, cell);
  ringPulse.visible = true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Square titles on the play surface. OFF by default: DESIGN §4 says the play
 * surface carries "square numbers and nothing else", and a 23-character title
 * inside a 36 CSS px cell on a 390 px phone cannot be read at any atlas size.
 * The numerals are NEVER hidden by this (§6.4 rule 2). Turn it on for a
 * projector, a desktop, or a debug screenshot.
 */
export function setCellLabelsVisible(b) {
  const want = !!b;
  if (want === showTitles) return;
  showTitles = want;
  redrawAtlas();
}
export function cellLabelsVisible() { return showTitles; }

/** Projector mode wants the numerals 20% bigger (CFG.camera.projector). */
export function setNumeralScale(k) {
  const v = clamp(Number(k) || 1, 0.6, 2);
  if (Math.abs(v - numeralScale) < 1e-3) return;
  numeralScale = v;
  redrawAtlas();
}

/** Re-cut the atlas after a silent quality demote (scene.js calls this). */
export function refreshQuality() {
  if (!group) return;
  const want = atlasSize();
  const pbrWanted = usePbr();
  if (want !== atlasPx || (pbrWanted && !pbrTex)) {
    ensureAtlas();
    if (tilesMesh) {
      tilesMesh.material.map = atlasTex;
      if (pbrWanted && pbrTex) {
        tilesMesh.material.roughnessMap = pbrTex;
        tilesMesh.material.metalnessMap = pbrTex;
        tilesMesh.material.bumpMap = pbrTex;
      }
      tilesMesh.material.needsUpdate = true;
    }
  }
  if (tilesMesh && !pbrWanted && tilesMesh.material.roughnessMap) {
    const m = tilesMesh.material;
    m.roughnessMap = m.metalnessMap = m.bumpMap = null;
    m.roughness = V2.tileRough; m.metalness = 0;
    m.needsUpdate = true;
  }
  const shadows = CFG.quality.current.shadows === 'soft';
  group.traverse((o) => { if (o.isMesh && o.name !== 'snl-hl-pulse') o.receiveShadow = shadows; });
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. THE FINISH — square 100 rises out of the board (§9 #34)
   ═══════════════════════════════════════════════════════════════════════════ */

/** How far 40 CSS px is, in world units, at the default board framing. */
function finishRiseUnits() {
  const w = (typeof window !== 'undefined' && window.innerWidth) || 390;
  const pxPerUnit = (w * CFG.layout.boardWidthPct) / (HALF * 2);
  return clamp(B.finishRisePx / pxPerUnit, 0.22, 0.80);
}

/** Raise (or, with 'up=false', settle) square 100. Resolves when it lands. */
export function riseFinish(up = true, ms = CFG.timing.finishRise || 700) {
  if (!finishGroup) return Promise.resolve();
  finishRiseFrom = finishRise;
  finishRiseTarget = up ? finishRiseUnits() : 0;
  finishRiseMs = prefersReducedMotion() ? 0 : ms;
  finishRiseT = finishRiseMs > 0 ? 0 : 1;
  if (finishRiseMs === 0) {
    finishRise = finishRiseTarget;
    finishGroup.position.y = finishRise;
    return Promise.resolve();
  }
  return new Promise((res) => { finishRiseDone = res; });
}
let finishRiseDone = null;

/* ═══════════════════════════════════════════════════════════════════════════
   11. FRAME LOOP — scene.js drives us when it exists; otherwise we drive
       ourselves, so the board is never dead in isolation or in a probe.
   ═══════════════════════════════════════════════════════════════════════════ */

let attached = false, ownRaf = 0, sceneOff = null, lastNow = 0;

export function updateBoard(dt) {
  const d = typeof dt === 'number' && dt > 0 && dt < 0.25 ? dt : 1 / 60;
  clockMs += d * 1000;
  const reduced = prefersReducedMotion();

  if (ringActive && ringActive.visible && hl.active.on) {
    if (reduced) { ringActive.material.opacity = 0.70; ringActive.scale.setScalar(1); }
    else {
      const p = (Math.sin((clockMs / ART.activePulseMs) * Math.PI * 2) + 1) / 2;
      ringActive.material.opacity = 0.42 + p * 0.46;
      ringActive.scale.setScalar(0.985 + p * 0.045);
    }
  }
  if (ringTarget && ringTarget.visible && hl.target.on) {
    if (reduced) { ringTarget.material.opacity = 0.85; ringTarget.rotation.z = 0; }
    else {
      ringTarget.rotation.z = (clockMs / ART.targetSpinMs) * Math.PI * 2;
      const p = (Math.sin((clockMs / (ART.activePulseMs * 1.35)) * Math.PI * 2) + 1) / 2;
      ringTarget.material.opacity = 0.62 + p * 0.32;
    }
  }
  if (ringPulse && ringPulse.visible) {
    hl.pulse.t += (d * 1000) / ART.pulseMs;
    if (hl.pulse.t >= 1) { ringPulse.visible = false; hl.pulse.t = 1; }
    else {
      const e = ease.out(hl.pulse.t);
      ringPulse.material.opacity = 0.9 * (1 - e);
      ringPulse.scale.setScalar(reduced ? 1 : 0.6 + e * 0.85);
    }
  }
  if (finishBloom) {
    if (reduced) finishBloom.material.opacity = 0.32;
    else {
      const p = (Math.sin((clockMs / ART.bloomMs) * Math.PI * 2) + 1) / 2;
      finishBloom.material.opacity = 0.22 + p * 0.24;
    }
  }
  if (finishGroup && finishRiseT < 1) {
    finishRiseT = Math.min(1, finishRiseT + (d * 1000) / finishRiseMs);
    const e = ease.back(finishRiseT);
    finishRise = finishRiseFrom + (finishRiseTarget - finishRiseFrom) * e;
    finishGroup.position.y = finishRise;
    if (finishRiseT >= 1 && finishRiseDone) { const r = finishRiseDone; finishRiseDone = null; r(); }
  }
}

function startFrameLoop() {
  if (attached) return;
  attached = true;
  import('./scene.js').then((m) => {
    if (m && typeof m.onFrame === 'function') {
      m.onFrame(updateBoard);
      sceneOff = () => { try { m.offFrame && m.offFrame(updateBoard); } catch (e) { /* noop */ } };
    } else ownLoop();
  }).catch(() => ownLoop());
}

function ownLoop() {
  if (typeof requestAnimationFrame !== 'function') return;
  const tick = (now) => {
    if (!attached) return;
    const dt = lastNow ? (now - lastNow) / 1000 : 1 / 60;
    lastNow = now;
    updateBoard(dt);
    ownRaf = requestAnimationFrame(tick);
  };
  ownRaf = requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. TEARDOWN
   ═══════════════════════════════════════════════════════════════════════════ */

export function disposeBoard() {
  attached = false;
  if (ownRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(ownRaf);
  ownRaf = 0; lastNow = 0;
  if (sceneOff) { sceneOff(); sceneOff = null; }
  if (group && group.parent) group.parent.remove(group);
  for (const d of disposables) { try { d.dispose(); } catch (e) { /* noop */ } }
  disposables.length = 0;
  group = tilesMesh = finishTile = finishGroup = finishBloom = null;
  ringActive = ringTarget = ringPulse = null;
  atlasTex = null; atlasCanvas = null; atlasPx = 0; grainPattern = null;
  pbrTex = null; pbrCanvas = null; pbrPx = 0; wmCanvas = null; crossedSet = null;
  ovTex = null; ovCanvas = null; ovMesh = null;
  overlayJobs.length = 0; placed.clear();
  footprint = null; occCache.clear();
  hl.active = { cell: 0, on: false };
  hl.target = { cell: 0, on: false };
  hl.pulse = { cell: 0, t: 1 };
  finishRise = finishRiseTarget = 0; finishRiseT = 1; finishRiseDone = null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   13. SCREEN-READER SUPPORT — the board as an ordered list (§13).
       ui.js owns the live region; this is the data it reads from.
   ═══════════════════════════════════════════════════════════════════════════ */

export function describeCell(n) {
  const sq = squareAt(n), L = ladderAt(n), S = snakeAt(n);
  return {
    n, kind: cellKind(n), title: sq ? sq.title : '',
    zone: zoneOf(n) ? zoneOf(n).name : '',
    ladderTo: L ? L.to : null, snakeTo: S ? S.to : null,
    numeralCorner: (placed.get(n) || {}).id || null,
    numeralOcc: (placed.get(n) || {}).occ ?? null,
    ...cellRowCol(n),
  };
}
export function describeBoard() {
  const out = [];
  for (let n = 1; n <= N * N; n++) out.push(describeCell(n));
  return out;
}

export const __probeTmp = {
  footprintGrid, footprintHits, numeralCorner, cellOcc, occRect, cellKind,
  overlayCells: () => overlayJobs.map((j) => j.n),
  /* the exact cell-local ink box a numeral was painted into, for pixel audits */
  placedSpot: (n) => {
    const sp = placed.get(n);
    if (!sp) return null;
    const g = atlasCanvas ? atlasCanvas.getContext('2d') : null;
    if (!g) return { ...sp };
    const m = numeralMetrics(g, n, atlasSize() / N, cellKind(n), sp.scale);
    return { ...sp, w: m.w / (atlasSize() / N), h: (m.px * 0.72) / (atlasSize() / N) };
  },
  cellSize: () => CELL,
  boardHalf: () => HALF,
};
