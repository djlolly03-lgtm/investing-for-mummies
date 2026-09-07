/**
 * level/loader.js — builds a level from JSON, and validates loudly.
 *
 * ARCHITECTURE.md level format:
 *   { id, name, chapter, sky, par, ammo:['sip'], blocks:[{mat,x,y,w,h,rot}],
 *     villains:[{type,x,y}], props:[{type,x,y}] }
 *
 * "The loader validates and throws loudly on bad data." A level with a typo'd material or a
 * block half-buried in the ground must fail at load with a message naming the index, not
 * silently produce a structure that behaves oddly six shots later.
 *
 * ── SEEDED IMPERFECTION ──────────────────────────────────────────────────────
 * Every block gets a jitter of a few thousandths of a unit on x and rotation, drawn from
 * rng.js. It is far too small to see (0.004 world units is a twentieth of a pixel at our
 * camera distance) and far too small to destabilise a stack, but it makes the level a real
 * function of the seed, which is what keeps `SS.seed(n)` honest. Hand-authored levels with
 * zero randomness would make the determinism gate's "different seed => different world"
 * check trivially, uselessly true.
 */

import * as THREE from 'three';
import { Block } from './blocks.js';
import { structure } from './structure.js';
import { Entity, makeBody, shapes } from './entity.js';
import { mat, PALETTE, MATERIAL_NAMES } from '../art/materials.js';
import { inkAll, RAMP_SOFT, RAMP_STD } from '../art/toon.js';
import { VILLAIN_TYPES } from '../villains/lotteryUncle.js';
import { world } from '../world.js';
import { rng, rngRange, rngJitter } from '../rng.js';

const BREAKABLE = new Set(['wood', 'glass', 'stone', 'prop']);

export const LEVELS = { l1: null };     // filled by loadLevelData

/** Fetch + parse + validate. Throws with a useful message. */
export async function loadLevelData(id) {
  // Memoised: SS.seed() rebuilds the level on every call, and HOOKS.md forbids gating on a
  // fetch that can hang. One fetch per level id per page load, then it is pure memory.
  if (LEVELS[id]) return LEVELS[id];
  const url = new URL(`../../levels/${id}.json`, import.meta.url);
  let json;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    throw new Error(`[level] could not load levels/${id}.json — ${e.message}`);
  }
  validate(json, id);
  LEVELS[id] = json;
  return json;
}

function validate(L, id) {
  const die = (msg) => { throw new Error(`[level ${id}] ${msg}`); };
  if (!L || typeof L !== 'object') die('not an object');
  for (const k of ['id', 'name', 'ammo', 'blocks', 'villains']) {
    if (!(k in L)) die(`missing required key "${k}"`);
  }
  if (!Array.isArray(L.ammo) || !L.ammo.length) die('"ammo" must be a non-empty array');
  if (!Array.isArray(L.blocks)) die('"blocks" must be an array');
  if (!Array.isArray(L.villains) || !L.villains.length) die('"villains" must be a non-empty array');

  L.blocks.forEach((b, i) => {
    if (!BREAKABLE.has(b.mat)) {
      die(`blocks[${i}].mat = "${b.mat}" is not one of ${[...BREAKABLE].join('|')}`);
    }
    for (const k of ['x', 'y', 'w', 'h']) {
      if (!Number.isFinite(b[k])) die(`blocks[${i}].${k} is not a finite number (got ${b[k]})`);
    }
    if (b.w <= 0 || b.h <= 0) die(`blocks[${i}] has a non-positive size ${b.w}x${b.h}`);
    // A block sunk into the ground will jump out on the first step and knock the tower over
    // "for no reason". Catch it here instead.
    if (b.y - b.h / 2 < -0.02) die(`blocks[${i}] starts below ground (y=${b.y}, h=${b.h})`);
  });

  L.villains.forEach((v, i) => {
    if (!VILLAIN_TYPES[v.type]) {
      die(`villains[${i}].type = "${v.type}" is unknown. Known: ${Object.keys(VILLAIN_TYPES).join(', ')}`);
    }
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) die(`villains[${i}] has a bad position`);
  });
  return L;
}

// ---------------------------------------------------------------------------
// BUILD
// ---------------------------------------------------------------------------

/** @returns {{blocks:number, villains:number}} */
export function buildLevel(L) {
  world.level = L;
  buildGround();
  buildEnvironment();

  for (const b of L.blocks) {
    new Block({
      matName: b.mat,
      x: b.x + rngJitter(0.004),
      y: b.y,
      w: b.w, h: b.h,
      rot: (b.rot ?? 0) + rngJitter(0.0025),
    });
  }

  for (const v of L.villains) {
    const Type = VILLAIN_TYPES[v.type];
    new Type({ x: v.x + rngJitter(0.004), y: v.y });
  }

  world.ammoQueue = L.ammo.slice();
  world.ammoUsed = 0;

  /**
   * The joint graph is solved from the authored poses, AFTER every block exists. It is what
   * turns "this block broke" into "the tower comes down" — see level/structure.js.
   */
  structure.build();

  return { blocks: L.blocks.length, villains: L.villains.length };
}

function buildGround() {
  const H = 3.0;
  const D = 9.0;                    // shallower than it looks — see the note below
  const m = mat('ground');
  const { body, collider } = makeBody({
    kind: 'fixed', x: 10, y: -H / 2, m,
    shape: shapes.box(120, H, D),
    contactForce: 40,
  });

  /**
   * The ground's FRONT FACE is a big piece of screen real estate in a side-on game — it is
   * the bottom 15% of every frame, forever. A single flat brown box there is the fastest
   * way to make the whole thing look unfinished. So it is built as a designed cross-section:
   * a grass cap with an overhanging lip, three soil strata that get darker with depth, and
   * embedded pebbles. Keeping D small (9 rather than 14) also stops the near face from
   * looming: at a 30 mm-equivalent FOV the front face is much closer than the play plane.
   */
  const g = new THREE.Group();

  const strata = [
    { c: 0x8a5730, h: 0.70, y: 1.00 },      // just under the roots
    { c: 0x77482a, h: 0.95, y: 0.18 },
    { c: 0x603721, h: 1.35, y: -0.98 },     // deep, cool, nearly out of frame
    // BEDROCK. Absurdly deep on purpose: on a tall portrait phone the camera has to sit far
    // enough back that the frame extends ~14 world units below the grass, and without this
    // you look straight under the level and see the sky-coloured backdrop through the floor.
    { c: 0x452617, h: 30.0, y: -16.0 },
  ];
  for (const st of strata) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(120, st.h, D + 0.02),
      new THREE.MeshToonMaterial({ color: st.c, map: stoneGrainMap(), gradientMap: RAMP_SOFT() }));
    b.position.y = st.y;
    b.receiveShadow = true;
    b.userData.noInk = true;
    g.add(b);
  }

  // pebbles pressed into the cut face
  const pebbleMat = new THREE.MeshToonMaterial({ color: 0x9a8570, gradientMap: RAMP_SOFT() });
  for (let i = 0; i < 44; i++) {
    const pb = new THREE.Mesh(new THREE.SphereGeometry(rngRange(0.06, 0.17), 7, 5), pebbleMat);
    pb.position.set(rngRange(-46, 56), rngRange(-1.4, 1.5), D / 2 - 0.03);
    pb.scale.set(1, rngRange(0.6, 1.0), 0.55);
    pb.userData.noInk = true;
    g.add(pb);
  }

  // grass cap, and the lip that overhangs the cut
  const cap = new THREE.Mesh(new THREE.BoxGeometry(120, 0.52, D + 0.04), m.three);
  cap.position.y = H / 2 - 0.26;
  cap.receiveShadow = true;
  g.add(cap);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(120, 0.30, 0.34),
    mat('ground', { color: 0x6fb83f }).three);
  lip.position.set(0, H / 2 - 0.62, D / 2 + 0.14);
  lip.userData.noInk = true;
  g.add(lip);

  g.position.set(10, -H / 2, 0);
  world.scene.add(g);
  new Entity({ mesh: g, body, collider, material: m, tag: 'ground' });
}

/** Shared, pre-repeated stone grain for the soil strata. */
let _soilTex = null;
function stoneGrainMap() {
  if (!_soilTex) {
    _soilTex = mat('soil').three.map;
    if (_soilTex) { _soilTex.repeat.set(14, 1.4); _soilTex.needsUpdate = true; }
  }
  return _soilTex;
}

/**
 * Environment: sky is on the scene background; this adds the parallax layers.
 * Deliberately restrained — depth without clutter. P8 owns making this sing.
 */
function buildEnvironment() {
  const g = new THREE.Group();
  g.name = 'environment';

  // --- distant hills, two bands, cool and desaturated so they read as far away ---
  const hillBands = [
    { z: -34, y: -3.4, color: 0x6f9fb8, scale: 1.0, n: 7, h: 7.0 },
    { z: -22, y: -2.6, color: 0x5f9e63, scale: 0.8, n: 9, h: 5.0 },
  ];
  for (const band of hillBands) {
    const mtl = new THREE.MeshBasicMaterial({ color: band.color, toneMapped: false });
    // A solid filler under each band. Without it you see a sliver of the sky gradient's warm
    // horizon glow between the ground's far edge and the hills' flat bottoms — a bright white
    // line across the whole screen that reads as a rendering bug, because it is one.
    const filler = new THREE.Mesh(new THREE.PlaneGeometry(190, 30), mtl);
    filler.position.set(14, band.y - 15, band.z + 0.02);
    filler.userData.noInk = true;
    g.add(filler);
    for (let i = 0; i < band.n; i++) {
      const w = rngRange(9, 20) * band.scale;
      const h = rngRange(band.h * 0.5, band.h);
      const hill = new THREE.Mesh(new THREE.CircleGeometry(1, 18, 0, Math.PI), mtl);
      hill.scale.set(w, h, 1);
      hill.position.set(-24 + i * rngRange(8, 13), band.y, band.z);
      hill.userData.noInk = true;
      g.add(hill);
    }
  }

  // --- drifting clouds: chunky lozenges, three per layer ---
  {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfdfbf4, toneMapped: false });
    world.clouds = [];
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const lobes = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < lobes; k++) {
        const s = rngRange(0.7, 1.6);
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cloudMat);
        lobe.scale.set(s * 1.5, s * 0.9, s * 0.4);
        lobe.position.set((k - lobes / 2) * rngRange(1.0, 1.7), rngJitter(0.5), rngJitter(0.4));
        lobe.userData.noInk = true;
        c.add(lobe);
      }
      const z = -14 - rngRange(0, 22);
      c.position.set(rngRange(-30, 52), rngRange(9, 17), z);
      c.userData.speed = 0.10 + (z + 36) / 36 * 0.22;
      g.add(c);
      world.clouds.push(c);
    }
  }

  // --- foreground grass: clumps of blades right at the cut edge, plus a darker,
  //     closer band that genuinely occludes the play plane and gives real depth ---
  const bladeGeo = new THREE.ConeGeometry(0.13, 1, 4);
  const tuftMats = [
    new THREE.MeshToonMaterial({ color: 0x5fb63a, gradientMap: RAMP_SOFT() }),
    new THREE.MeshToonMaterial({ color: 0x4a9e2e, gradientMap: RAMP_SOFT() }),
    new THREE.MeshToonMaterial({ color: 0x2f7a23, gradientMap: RAMP_SOFT() }),
  ];
  for (let i = 0; i < 62; i++) {
    const near = i > 46;
    const clump = new THREE.Group();
    const blades = 3 + Math.floor(rng() * 3);
    const scale = near ? rngRange(0.85, 1.25) : rngRange(0.45, 0.80);
    for (let k = 0; k < blades; k++) {
      const b = new THREE.Mesh(bladeGeo, tuftMats[near ? 2 : (k % 2)]);
      b.scale.set(rngRange(0.7, 1.2), rngRange(0.55, 1.15) * scale, rngRange(0.7, 1.2));
      b.position.set(rngJitter(0.26 * scale), b.scale.y * 0.5 - 0.06, rngJitter(0.16));
      b.rotation.z = rngJitter(0.34);
      b.userData.noInk = true;
      clump.add(b);
    }
    clump.position.set(rngRange(-18, 48), rngRange(-0.10, 0.06), near ? rngRange(6.2, 7.6) : rngRange(4.2, 5.4));
    g.add(clump);
  }

  // --- a few background trees on the far bank ---
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x4a6b4a, toneMapped: false });
  const leafMat = new THREE.MeshBasicMaterial({ color: 0x57a04a, toneMapped: false });
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.4, rngRange(1.6, 2.8), 0.4), trunkMat);
    trunk.userData.noInk = true;
    t.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rngRange(1.2, 2.0), 10, 8), leafMat);
    crown.position.y = 1.9;
    crown.scale.y = 0.9;
    crown.userData.noInk = true;
    t.add(crown);
    t.position.set(rngRange(-22, 50), rngRange(-0.4, 0.4), -12 - rngRange(0, 6));
    g.add(t);
  }

  world.scene.add(g);
  world.environment = g;
  new Entity({ mesh: g, body: null, collider: null, material: null, tag: 'decor' });
}

/** Clouds drift on sim time so a filmstrip replays them exactly. */
export function updateEnvironment(dt) {
  const cs = world.clouds;
  if (!cs) return;
  for (const c of cs) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 58) c.position.x = -34;
  }
}
