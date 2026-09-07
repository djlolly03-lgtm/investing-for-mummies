/**
 * level/fragments.js — the SILHOUETTE of a broken thing.
 *
 * The single loudest tell of amateur destruction is that every material breaks into the same
 * shape. Angry Birds' whole destruction read is carried by three unmistakable shard
 * languages, and you are supposed to be able to name the material from one cropped chunk
 * with no surrounding context:
 *
 *   wood   long thin sliver, SNAPPED — one end is a jagged splinter, the other is a clean cut
 *   glass  flat faceted triangle, three or four straight edges, no bevel to speak of
 *   stone  rounded irregular lump, heavily chamfered, 7-ish sides, no straight run anywhere
 *
 * So: real extruded geometry per material, not a scaled box. Everything here is a UNIT
 * shape — it spans -0.5..0.5 on all three axes — so a caller gets its actual size purely
 * from `mesh.scale`, and one cached geometry serves every fragment of that material.
 *
 * ── WHY THE GEOMETRY IS CACHED AND WHY IT HAS ITS OWN PRNG ───────────────────
 * Six variants per material, built once, shared for the life of the page. A fracture picks a
 * variant with the gameplay `rng()`, which is what makes the CHOICE deterministic; the
 * shapes themselves must NOT consume the gameplay stream, because they are built lazily on
 * first use and a later rebuild would find them cached and consume nothing — `seed(n)` would
 * stop meaning anything. Same rule, same reason, as art/toon.js. Do not "simplify" this by
 * importing rng().
 *
 * ── AND WHY THE COLLIDER IS STILL A BOX ──────────────────────────────────────
 * A convex hull per chunk is a solver cost and a stacking-stability cost for something the
 * player cannot see: at fragment size the difference between a hull and its bounding box is
 * a couple of pixels. The visual carries the read; the box carries the physics.
 */

import * as THREE from 'three';

// --- private geometry-only PRNG (see header) --------------------------------
let _gs = 0x51ed2701 >>> 0;
function g() {
  _gs = (_gs + 0x6D2B79F5) >>> 0;
  let t = _gs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const R = (a, b) => a + (b - a) * g();

export const VARIANTS = 6;

const cache = new Map();

/**
 * @param {'wood'|'glass'|'stone'|'prop'} matName
 * @param {number} variant 0..VARIANTS-1
 * @param {boolean} tall   rotate the shape 90° so its long axis runs along Y
 * @returns {THREE.BufferGeometry} unit-sized, centred on the origin
 */
export function shardGeo(matName, variant = 0, tall = false) {
  const key = `${matName}:${variant % VARIANTS}:${tall ? 'v' : 'h'}`;
  if (cache.has(key)) return cache.get(key);
  // Both orientations of a variant must be the SAME shape, so build the horizontal one and
  // rotate a clone. Otherwise a tall sliver and a wide sliver look like different materials.
  const base = tall ? shardGeo(matName, variant, false).clone() : buildShard(matName, variant);
  if (tall) base.rotateZ(Math.PI / 2);
  cache.set(key, base);
  return base;
}

function buildShard(matName, variant) {
  // Reset the private stream per (material, variant) so a geometry is identical no matter
  // what order the six variants happen to be asked for.
  _gs = (0x51ed2701 ^ (variant * 0x9e3779b1) ^ hash(matName)) >>> 0;
  const pts = matName === 'glass' ? glassOutline()
    : matName === 'stone' ? stoneOutline()
    : woodOutline();
  const bevel = matName === 'stone' ? 0.10 : matName === 'wood' ? 0.035 : 0.012;

  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: matName === 'stone' ? 2 : 1,
    curveSegments: 1,
  });
  geo.center();
  normalise(geo);
  // Flat facets are the point for stone and glass — a smooth-shaded lump reads as a pebble
  // in a puddle, a faceted one reads as broken rock.
  geo.computeVertexNormals();
  return geo;
}

/** Rescale so the geometry exactly fills the unit cube. `mesh.scale` then IS the size. */
function normalise(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const sx = 1 / Math.max(1e-6, b.max.x - b.min.x);
  const sy = 1 / Math.max(1e-6, b.max.y - b.min.y);
  const sz = 1 / Math.max(1e-6, b.max.z - b.min.z);
  geo.scale(sx, sy, sz);
}

/**
 * WOOD — a snapped plank. Clean square cut at -X (that is the sawn end of the original
 * beam), a jagged splintered break at +X, and a slightly uneven grain edge along the top so
 * it never reads as a rectangle. This is the shape in ab_destruction_debris-settled-at-rest_06:
 * you can see which end broke.
 */
function woodOutline() {
  const h = R(0.34, 0.5);                    // half-height of the plank
  const p = [[-0.5, -h], [-0.5, h]];
  // top edge, drifting slightly
  const segs = 3;
  for (let i = 1; i <= segs; i++) {
    const x = -0.5 + (0.86 * i) / segs;
    p.push([x, h * R(0.86, 1.0)]);
  }
  // the splintered end: 3 teeth of different length, the classic snapped-timber zigzag
  const teeth = 3;
  for (let i = 0; i < teeth; i++) {
    const y = h - ((2 * h) * (i + 0.5)) / teeth;
    p.push([0.5, y + h * R(-0.14, 0.14)]);
    p.push([0.30 + R(0, 0.16), y - h / teeth]);
  }
  p.push([0.5, -h * R(0.9, 1.0)]);
  // bottom edge back to the start
  for (let i = segs; i >= 1; i--) {
    const x = -0.5 + (0.86 * i) / segs;
    p.push([x, -h * R(0.86, 1.0)]);
  }
  return p;
}

/**
 * GLASS — a flat faceted triangle (occasionally a sliver quad). Straight edges, sharp
 * corners, one obviously long spike: ab_destruction_glass-shatter-and-rubble_02.
 */
function glassOutline() {
  const n = g() < 0.72 ? 3 : 4;
  const p = [];
  let a = R(0, 0.9);
  for (let i = 0; i < n; i++) {
    a += (Math.PI * 2) / n * R(0.72, 1.28);
    const r = 0.5 * R(0.55, 1.0);
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // stretch one corner into a spike — a shard always has one
  const k = Math.floor(g() * n);
  p[k] = [p[k][0] * R(1.5, 2.1), p[k][1] * R(1.5, 2.1)];
  return p;
}

/**
 * STONE — a rounded irregular lump. Seven to nine sides at jittered radii; the fat bevel in
 * buildShard() is what turns the polygon into a boulder rather than a gem.
 */
function stoneOutline() {
  const n = 7 + Math.floor(g() * 3);
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + R(-0.18, 0.18);
    const r = 0.5 * R(0.74, 1.0);
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

function hash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The same three silhouettes at particle scale, for the non-physical chips in fx/.
 * One geometry per material, instanced — so a splinter burst is still splinter-shaped.
 */
export function chipGeo(matName) {
  const key = `chip:${matName}`;
  if (cache.has(key)) return cache.get(key);
  const geo = shardGeo(matName, 1, false).clone();
  cache.set(key, geo);
  return geo;
}

export function disposeFragments() {
  for (const gm of cache.values()) gm.dispose();
  cache.clear();
}
