/* ═══════════════════════════════════════════════════════════════════════════
   fx.js — celebration and feedback particles.

   Everything here is generated in code. No image files, no textures on disk:
   the four alpha masks are drawn once into 64/128px canvases at init.

   FOUR POOLED InstancedMeshes, pre-allocated, and that is the entire cost of
   the fx system no matter how much is on screen:

     flake  96 · flat paper quads, full 3D tumble   -> confetti
     puff  128 · soft billboarded discs             -> dust · trail · gold bloom
     star   48 · soft billboarded 4-point stars     -> sparkle · shield burst
     ring   16 · soft annulus, flat on the board    -> glowRing

   Each mesh is hidden (mesh.visible = false) while its pool is empty, so the
   fx system costs ZERO draw calls at rest and at most 4 during a celebration.
   Nothing is allocated during play — particles live in flat typed arrays and
   are packed with a swap-remove, so 'mesh.count' is always exactly the live
   count and the instance buffers are always contiguous.

   Per-instance alpha comes from one 'aFxAlpha' InstancedBufferAttribute
   injected into MeshBasicMaterial via onBeforeCompile. That is what lets a
   particle FADE rather than shrink, which is the difference between a puff of
   dust and a disappearing dot.

   Sources: DESIGN.md §9 #19 (shield burst) · #35 (celebration, <=60 particles,
   non-modal, tap-skippable) · §6.3 particle ceilings 60/30/0 · §7.4 palette ·
   §9 closing block (reduced motion -> a static gold bloom, no shake).
   Every feel number is read live from CFG.fx / CFG.board / CFG.quality.current,
   so a silent tier demote (scene.js) applies to the very next burst.

   All sizes are in WORLD UNITS scaled off CFG.board.cell. The camera frames
   the whole board on every device, so a 0.9-cell ring is the same fraction of
   the screen on a phone and on a projector.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.js';
import { CFG } from './config.js';
import { clamp, lerp, damp, ease, makeRng, prefersReducedMotion } from './util.js';

/* ── constants ──────────────────────────────────────────────────────── */

const CELL = CFG.board.cell;

/* particle integration modes */
const M_FLAKE = 0, M_PUFF = 1, M_STAR = 2, M_RING = 3, M_STATIC = 4, M_TRAIL = 5;

/* pool capacities. High tier bursts 60 confetti; the headroom lets a second
   burst land on top of a first without either being cut short. */
const CAP = { flake: 96, puff: 128, star: 48, ring: 16 };

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
/* flat on the tile plane — the ring and any settled flake */
const FLAT_Q = new THREE.Quaternion().setFromAxisAngle(AXIS_X, -Math.PI / 2);
/* facing the default camera pose (§6.2, 38deg elevation / 0deg azimuth).
   Used for billboards before a camera is handed to initFx, so fx never looks
   wrong even if it is driven headless or before the camera director boots. */
const REST_Q = new THREE.Quaternion()
  .setFromAxisAngle(AXIS_X, -CFG.camera.elevationDeg * Math.PI / 180);

/* fx randomness is deterministic and completely separate from state.rngState,
   so a probe screenshots the same burst twice and the game's dice is untouched. */
let rng = makeRng(0x5A17);
export function setFxSeed(seed) { rng = makeRng(seed >>> 0 || 1); }

/* scratch — allocated once, reused every frame, never grows */
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _camQ = new THREE.Quaternion().copy(REST_Q);

/* ── module state ───────────────────────────────────────────────────── */

let group = null;            // the one Group we add to the scene
let pools = null;            // { flake, puff, star, ring }
let sceneRef = null;
let cameraRef = null;
const trails = new Map();    // playerId -> { obj, pos, on, acc, r, g, b }

let _driven = false;         // has anyone called updateFx() from outside?
let _autoTick = null;        // our own scene.js onFrame handle, if we made one
let _offFrame = null;
let _shakeFn = null;         // camera.js's shake(), once we find it
let _shakeTried = false;

/* ═══════════════════════════════════════════════════════════════════════
   1. TEXTURES — four alpha masks, drawn in code. ~30 KB of GPU memory total.
   ═══════════════════════════════════════════════════════════════════════ */

function makeTex(size, draw) {
  if (typeof document === 'undefined') return null;   // node / SSR: no textures
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);
  draw(g, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/* a scrap of paper: rounded rect, soft edge so it never aliases as it tumbles */
const flakeTex = () => makeTex(64, (g, s) => {
  const p = s * 0.10, r = s * 0.16;
  g.fillStyle = '#fff';
  g.beginPath();
  if (g.roundRect) g.roundRect(p, p, s - 2 * p, s - 2 * p, r);
  else g.rect(p, p, s - 2 * p, s - 2 * p);
  g.filter = 'blur(1px)';
  g.fill();
  g.filter = 'none';
});

/* a soft puff of dust: firm-ish core, long tail, nothing sharp */
const discTex = () => makeTex(64, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0.00, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.72)');
  grd.addColorStop(0.70, 'rgba(255,255,255,0.20)');
  grd.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

/* a four-point star with a bright core — reads as a glint, never as a coin */
const starTex = () => makeTex(64, (g, s) => {
  const h = s / 2;
  const core = g.createRadialGradient(h, h, 0, h, h, s * 0.20);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core; g.fillRect(0, 0, s, s);
  g.save(); g.translate(h, h);
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    const arm = g.createLinearGradient(0, 0, 0, -h);
    arm.addColorStop(0, 'rgba(255,255,255,0.95)');
    arm.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = arm;
    g.beginPath();
    g.moveTo(-s * 0.055, 0); g.lineTo(0, -h * 0.96); g.lineTo(s * 0.055, 0);
    g.closePath(); g.fill();
  }
  g.restore();
});

/* an expanding ring: soft on both edges so it reads as light, not as an outline */
const ringTex = () => makeTex(128, (g, s) => {
  const h = s / 2;
  const grd = g.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0.00, 'rgba(255,255,255,0)');
  grd.addColorStop(0.52, 'rgba(255,255,255,0.06)');
  grd.addColorStop(0.74, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.86, 'rgba(255,255,255,1)');
  grd.addColorStop(0.97, 'rgba(255,255,255,0.10)');
  grd.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

/* ═══════════════════════════════════════════════════════════════════════
   2. MATERIAL — MeshBasicMaterial + a per-instance alpha attribute.
      Unlit on purpose: particles are light and paper, not lit geometry, and
      an unlit basic material is one of the cheapest draws three can issue.
   ═══════════════════════════════════════════════════════════════════════ */

function fxMaterial(map) {
  const m = new THREE.MeshBasicMaterial({
    map, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    side: THREE.DoubleSide, toneMapped: true,
  });
  /* inject 'aFxAlpha'. Patched at compile time, once; all four materials share
     one program because the patch source is identical. */
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',
        '#include <common>\nattribute float aFxAlpha;\nvarying float vFxAlpha;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvFxAlpha = aFxAlpha;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\nvarying float vFxAlpha;')
      .replace('#include <opaque_fragment>',
        'diffuseColor.a *= vFxAlpha;\n#include <opaque_fragment>');
  };
  return m;
}

/* ═══════════════════════════════════════════════════════════════════════
   3. POOLS — struct-of-arrays, swap-removed, zero allocation during play.
   ═══════════════════════════════════════════════════════════════════════ */

function makePool(cap, tex, orient) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
  alphaAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aFxAlpha', alphaAttr);

  const mat = fxMaterial(tex);
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;     // particles move; a stale bounding sphere would pop
  mesh.matrixAutoUpdate = false;
  mesh.renderOrder = 12;          // over the board, under nothing (the HUD is DOM)
  mesh.raycast = () => {};        // fx is never a tap target — input is never blocked
  mesh.name = 'snl-fx-' + orient;

  const f = () => new Float32Array(cap);
  return {
    cap, n: 0, mesh, geo, mat, alphaAttr, orient,
    px: f(), py: f(), pz: f(),          // position
    vx: f(), vy: f(), vz: f(),          // velocity
    ax: f(), ay: f(), az: f(),          // euler / spin angle
    wx: f(), wy: f(), wz: f(),          // angular velocity
    sx: f(), sy: f(),                   // size: start/end diameter, or w/h for a flake
    a0: f(), t: f(), ttl: f(), ry: f(), // alpha, age, lifetime, rest height
    cr: f(), cg: f(), cb: f(), ph: f(), // colour (linear) + phase
    mode: new Uint8Array(cap),
  };
}

/* Never drop a burst: at capacity we recycle the oldest particle instead. */
function slot(P) {
  if (P.n < P.cap) return P.n++;
  let worst = 0, wv = -1;
  for (let k = 0; k < P.n; k++) {
    const v = P.t[k] / P.ttl[k];
    if (v > wv) { wv = v; worst = k; }
  }
  return worst;
}

const SOA = ['px','py','pz','vx','vy','vz','ax','ay','az','wx','wy','wz',
             'sx','sy','a0','t','ttl','ry','cr','cg','cb','ph'];

function kill(P, i) {
  const last = --P.n;
  if (i !== last) {
    for (let k = 0; k < SOA.length; k++) { const a = P[SOA[k]]; a[i] = a[last]; }
    P.mode[i] = P.mode[last];
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   4. INIT / TEARDOWN
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Build the pools and attach them to the scene. Idempotent — calling it again
 * (a rematch, a tier change) re-parents the same pools rather than rebuilding.
 * @param {THREE.Scene}  scene
 * @param {THREE.Camera} [camera]  used to billboard dust/sparkle. Optional:
 *        without it, billboards face the default 38deg rest pose (§6.2).
 */
export function initFx(scene, camera) {
  sceneRef = scene || sceneRef;
  if (camera) cameraRef = camera;

  if (!group) {
    group = new THREE.Group();
    group.name = 'snl-fx';
    group.matrixAutoUpdate = false;
    pools = {
      flake: makePool(CAP.flake, flakeTex(), 'euler'),
      puff:  makePool(CAP.puff,  discTex(),  'billboard'),
      star:  makePool(CAP.star,  starTex(),  'billboard'),
      ring:  makePool(CAP.ring,  ringTex(),  'flat'),
    };
    for (const k in pools) group.add(pools[k].mesh);
  }
  if (sceneRef && group.parent !== sceneRef) sceneRef.add(group);

  tryAutoDrive();
  return group;
}

/** Kill every live particle and every trail instantly. Tap-to-skip calls this —
 *  CONTRACT amendment 10: every animation is skippable, without exception. */
export function clearFx() {
  if (!pools) return;
  for (const k in pools) {
    const P = pools[k];
    P.n = 0; P.mesh.count = 0; P.mesh.visible = false;
  }
  trails.clear();
}

/** Full teardown — drop GPU memory when the game unmounts. */
export function disposeFx() {
  clearFx();
  if (pools) {
    for (const k in pools) {
      const P = pools[k];
      P.geo.dispose(); P.mat.map?.dispose(); P.mat.dispose();
    }
  }
  if (group?.parent) group.parent.remove(group);
  if (_autoTick && _offFrame) { try { _offFrame(_autoTick); } catch { /* gone */ } }
  group = null; pools = null; sceneRef = null; cameraRef = null;
  _autoTick = null; _driven = false;
}

/* CONTRACT.md gives fx.js no init hook, so if nobody calls updateFx() we hook
   scene.js's frame loop ourselves. The first external updateFx() wins and we
   unhook, so the pools can never be stepped twice in one frame. */
function tryAutoDrive() {
  if (_driven || _autoTick || typeof window === 'undefined') return;
  const tick = (dt) => { if (!_driven) stepAll(dt); };
  import('./scene.js').then((m) => {
    if (_driven || _autoTick || typeof m.onFrame !== 'function') return;
    _autoTick = tick; _offFrame = m.offFrame;
    m.onFrame(tick);
  }).catch(() => { /* scene.js not up yet — updateFx() will drive us */ });
}

/* ═══════════════════════════════════════════════════════════════════════
   5. BUDGET — DESIGN.md §6.3 particle ceilings, read live so a silent tier
      demote applies to the next burst without anyone being told.
   ═══════════════════════════════════════════════════════════════════════ */

function tierParticles() {
  const p = CFG.quality.current?.particles;
  return typeof p === 'number' ? p : CFG.fx.confetti.count;
}
/* How many particles may this burst spend? 0 on the low tier and under
   reduced motion — where the effect degrades to a single static bloom, which
   is one quad, not a particle system. §6.3 / §9 closing block. */
function budget(n) {
  if (prefersReducedMotion()) return 0;
  return Math.max(0, Math.min(n | 0, tierParticles()));
}

function rgb(c) {
  _c.set(c === undefined || c === null ? 0xffffff : c);
  return _c;   // three converts sRGB -> the linear working space on set()
}

function posOf(p) {
  if (!p) return _v.set(0, 0, 0);
  if (typeof p.x === 'number') return _v.set(p.x, p.y || 0, p.z || 0);
  if (Array.isArray(p)) return _v.set(p[0] || 0, p[1] || 0, p[2] || 0);
  return _v.set(0, 0, 0);
}

/* ═══════════════════════════════════════════════════════════════════════
   6. THE EFFECTS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * The win and big-ladder celebration. Flat paper flakes in the IFM palette,
 * per-particle tumble, gravity, drag and a slow paper sway; they SETTLE on the
 * board and fade there rather than vanishing in mid-air, which is the whole
 * difference between "warm and generous" and "casino".
 *
 * Never modal, never a tap target, and never able to cover the primary button:
 * fx lives in the 3D scene and the HUD is DOM painted over the canvas (§6.4).
 *
 * @param {{x,y,z}} worldPos  usually the winning token
 * @param {number} [count]    clamped to the tier ceiling (60 / 30 / 0)
 * @returns {number} particles actually spawned (0 = the static bloom ran)
 */
export function confetti(worldPos, count = CFG.fx.confetti.count) {
  if (!pools) return 0;
  const p = posOf(worldPos).clone();
  const C = CFG.fx.confetti;
  const n = CFG.quality.current?.confetti === false ? 0 : budget(count);

  /* §9 #35 under reduced motion, and §6.3 on the low tier: one soft gold bloom
     covering exactly the ground the burst would have covered. No motion. */
  if (n <= 0) { goldBloom(p); return 0; }

  const P = pools.flake;
  const swayAmp = C.spread * 0.22 * CELL;
  for (let i = 0; i < n; i++) {
    const k = slot(P);
    const a = rng() * Math.PI * 2, r = rng() * 0.25 * CELL;
    P.px[k] = p.x + Math.cos(a) * r;
    P.py[k] = p.y + 0.34 * CELL + rng() * 0.12 * CELL;
    P.pz[k] = p.z + Math.sin(a) * r;
    P.ry[k] = p.y + 0.015 * CELL;                  // the board it will settle on

    const dir = rng() * Math.PI * 2;
    const sp = rng.range(0.25, 1.0) * C.spread * 0.5 * CELL;
    P.vx[k] = Math.cos(dir) * sp;
    P.vz[k] = Math.sin(dir) * sp;
    P.vy[k] = rng.range(1.9, 3.2) * CELL;

    P.ax[k] = rng() * 6.283; P.ay[k] = rng() * 6.283; P.az[k] = rng() * 6.283;
    P.wx[k] = rng.range(-7, 7); P.wy[k] = rng.range(-5, 5); P.wz[k] = rng.range(-7, 7);

    const w = rng.range(C.size[0], C.size[1]) * CELL;
    P.sx[k] = w; P.sy[k] = w * rng.range(0.55, 0.78);   // paper, not squares

    const col = rgb(C.colors[rng.int(C.colors.length)]);
    P.cr[k] = col.r; P.cg[k] = col.g; P.cb[k] = col.b;

    P.a0[k] = 1; P.t[k] = 0;
    P.ttl[k] = (C.ms / 1000) * rng.range(0.80, 1.0);
    P.ph[k] = rng() * 6.283;
    P.mode[k] = M_FLAKE;
    P.vx[k] += swayAmp * 0;   // sway is applied in the integrator, off ph
  }
  return n;
}

/** Small and bright: a milestone square, or a quiz answer revealed. §5.5 */
export function sparkle(worldPos, color = CFG.fx.sparkle.color, count = CFG.fx.sparkle.count) {
  if (!pools) return 0;
  const p = posOf(worldPos).clone();
  const n = budget(count);
  /* Feedback is never allowed to disappear entirely — a11y: never colour or
     motion alone. With no particle budget it becomes one calm ring. */
  if (n <= 0) { glowRing(p, color); return 0; }

  const P = pools.star, col = rgb(color);
  for (let i = 0; i < n; i++) {
    const k = slot(P);
    const a = rng() * Math.PI * 2, e = rng.range(-0.35, 1.0);
    const r = rng.range(0.05, 0.22) * CELL;
    P.px[k] = p.x + Math.cos(a) * r;
    P.py[k] = p.y + 0.30 * CELL + rng.range(-0.06, 0.18) * CELL;
    P.pz[k] = p.z + Math.sin(a) * r;
    const sp = rng.range(0.30, 0.95) * CELL;
    P.vx[k] = Math.cos(a) * sp; P.vz[k] = Math.sin(a) * sp; P.vy[k] = e * sp * 0.8;
    P.ax[k] = P.ay[k] = 0; P.az[k] = rng() * 6.283;
    P.wx[k] = P.wy[k] = 0; P.wz[k] = rng.range(-2.6, 2.6);
    P.sx[k] = P.sy[k] = rng.range(0.10, 0.20) * CELL;
    P.cr[k] = col.r; P.cg[k] = col.g; P.cb[k] = col.b;
    P.a0[k] = rng.range(0.7, 1.0); P.t[k] = 0;
    P.ttl[k] = (CFG.fx.sparkle.ms / 1000) * rng.range(0.7, 1.0);
    P.ry[k] = p.y; P.ph[k] = 0;
    P.mode[k] = M_STAR;
  }
  return n;
}

/**
 * A soft puff under a token landing and under the die. This is the cheap trick
 * that gives a 3D object weight — use it on every hop, every landing, every
 * clack of the die. Deliberately quiet: the warm floor-bounce colour at low
 * alpha, low and wide, gone in 300 ms.
 */
export function dust(worldPos, count = CFG.fx.dust.count, color = CFG.fx.dust.color) {
  if (!pools) return 0;
  const n = budget(count);
  if (n <= 0) return 0;                 // pure garnish: off on low / reduced motion
  const p = posOf(worldPos).clone();
  const P = pools.puff, col = rgb(color);
  for (let i = 0; i < n; i++) {
    const k = slot(P);
    const a = rng() * Math.PI * 2, r = rng.range(0.02, 0.14) * CELL;
    P.px[k] = p.x + Math.cos(a) * r;
    P.py[k] = p.y + rng.range(0.02, 0.07) * CELL;
    P.pz[k] = p.z + Math.sin(a) * r;
    const sp = rng.range(0.35, 0.95) * CELL;
    P.vx[k] = Math.cos(a) * sp; P.vz[k] = Math.sin(a) * sp;
    P.vy[k] = rng.range(0.18, 0.55) * CELL;
    P.ax[k] = P.ay[k] = 0; P.az[k] = rng() * 6.283;
    P.wx[k] = P.wy[k] = 0; P.wz[k] = rng.range(-1.4, 1.4);
    P.sx[k] = rng.range(0.11, 0.19) * CELL;
    P.sy[k] = P.sx[k] * rng.range(1.8, 2.8);
    P.cr[k] = col.r; P.cg[k] = col.g; P.cb[k] = col.b;
    P.a0[k] = rng.range(0.22, 0.42); P.t[k] = 0;
    P.ttl[k] = (CFG.fx.dust.ms / 1000) * rng.range(0.8, 1.15);
    P.ry[k] = p.y; P.ph[k] = 0;
    P.mode[k] = M_PUFF;
  }
  return n;
}

/**
 * An expanding soft ring, flat on the tile plane: "you landed here", the foot
 * of a ladder, the active square. One quad, one instance, allowed at EVERY
 * tier and under reduced motion (where it does not expand, it just fades) —
 * because on the low tier it is the only landing feedback left.
 */
export function glowRing(worldPos, color = CFG.fx.glowRing.color, ms = CFG.fx.glowRing.ms) {
  if (!pools) return null;
  const p = posOf(worldPos).clone();
  const P = pools.ring, col = rgb(color), G = CFG.fx.glowRing;
  const k = slot(P);
  const rm = prefersReducedMotion();
  P.px[k] = p.x; P.py[k] = p.y + 0.012 * CELL; P.pz[k] = p.z;
  P.vx[k] = P.vy[k] = P.vz[k] = 0;
  P.ax[k] = P.ay[k] = P.az[k] = 0;
  P.wx[k] = P.wy[k] = P.wz[k] = 0;
  /* reduced motion: no expansion — it opens already at full size and fades */
  P.sx[k] = (rm ? G.to * 0.86 : G.from) * CELL;
  P.sy[k] = G.to * CELL;
  P.cr[k] = col.r; P.cg[k] = col.g; P.cb[k] = col.b;
  P.a0[k] = 0.85; P.t[k] = 0; P.ttl[k] = ms / 1000;
  P.ry[k] = p.y; P.ph[k] = 0;
  P.mode[k] = M_RING;
  return k;
}

/**
 * §9 #19 — the Bura Waqt Fund absorbing a bite: a brass ring at the token base,
 * then a <=30 particle mint burst. The most satisfying beat in the product,
 * because it is the most important lesson in it (§10.6).
 */
export function shieldBurst(worldPos) {
  const S = CFG.fx.shieldBurst;
  glowRing(worldPos, CFG.colors.brass, CFG.timing.shieldRing || S.ms);
  return sparkle(worldPos, S.color, S.count);
}

/**
 * §9 #35 reduced-motion / low-tier celebration: a single soft gold bloom that
 * fades. No motion, no particles, one quad. Covers exactly the ground the
 * confetti spread would have covered, so the beat reads at the same size.
 */
export function goldBloom(worldPos, ms = CFG.fx.goldBloom.ms) {
  if (!pools) return null;
  const p = posOf(worldPos).clone();
  const P = pools.puff, col = rgb(CFG.fx.goldBloom.color);
  const k = slot(P);
  const d = CFG.fx.confetti.spread * CELL;
  P.px[k] = p.x; P.py[k] = p.y + 0.30 * CELL; P.pz[k] = p.z;
  P.vx[k] = P.vy[k] = P.vz[k] = 0;
  P.ax[k] = P.ay[k] = P.az[k] = 0;
  P.wx[k] = P.wy[k] = P.wz[k] = 0;
  P.sx[k] = P.sy[k] = d;
  P.cr[k] = col.r; P.cg[k] = col.g; P.cb[k] = col.b;
  P.a0[k] = 0.72; P.t[k] = 0; P.ttl[k] = ms / 1000;
  P.ry[k] = p.y; P.ph[k] = 0;
  P.mode[k] = M_STATIC;
  /* one gold ring under it so the bloom has an edge on a washed-out projector */
  glowRing(p, CFG.colors.gold, ms);
  return k;
}

/**
 * A faint arc trail behind a hopping token. Optional garnish — off on the low
 * tier and under reduced motion.
 *
 *   trail(id, object3D)  attach to a token and start
 *   trail(id)            start, using a previously attached object
 *   trail(id, {x,y,z})   drop one sample right now (works with no attachment)
 *   trail(id, false)     stop
 */
export function trail(playerId, arg) {
  if (!pools) return;
  if (arg === false) { trails.delete(playerId); return; }

  let e = trails.get(playerId);
  if (!e) {
    const col = rgb(playerColor(playerId));
    e = { obj: null, on: true, acc: 0, r: col.r, g: col.g, b: col.b };
    trails.set(playerId, e);
  }
  e.on = true;
  if (arg && arg.isObject3D) { e.obj = arg; return; }
  if (arg && typeof arg.x === 'number') { emitTrail(e, posOf(arg)); return; }
}

function playerColor(playerId) {
  const list = CFG.tokens.players || [];
  const p = typeof playerId === 'number'
    ? list[playerId]
    : list.find(q => q.id === playerId || q.key === playerId);
  return p ? p.color : CFG.colors.teal;
}

function emitTrail(e, v) {
  const P = pools.puff, k = slot(P);
  P.px[k] = v.x; P.py[k] = v.y + 0.16 * CELL; P.pz[k] = v.z;
  P.vx[k] = P.vy[k] = P.vz[k] = 0;
  P.ax[k] = P.ay[k] = P.az[k] = 0;
  P.wx[k] = P.wy[k] = P.wz[k] = 0;
  P.sx[k] = 0.20 * CELL; P.sy[k] = 0.05 * CELL;
  P.cr[k] = e.r; P.cg[k] = e.g; P.cb[k] = e.b;
  P.a0[k] = 0.20; P.t[k] = 0;
  P.ttl[k] = CFG.timing.hopPerCell / 1000;   // one hop's worth of tail, no more
  P.ry[k] = v.y; P.ph[k] = 0;
  P.mode[k] = M_TRAIL;
}

/* ═══════════════════════════════════════════════════════════════════════
   7. SHAKE — camera.js owns the actual move (CONTRACT interface). fx.shake()
      exists because config.js's 'camera.shakeMax' and 'fx.shake' presets name
      it, so this is the one place that clamps it and switches it off under
      reduced motion (§9 closing block: no shake, ever).
   ═══════════════════════════════════════════════════════════════════════ */

/** Let game.js/scene.js wire camera.shake explicitly instead of us finding it. */
export function setShakeHandler(fn) { _shakeFn = typeof fn === 'function' ? fn : null; }

export function shake(strength = CFG.fx.shake.snake[0], ms = CFG.fx.shake.snake[1]) {
  if (prefersReducedMotion() || CFG.reduced.shake === false && prefersReducedMotion()) return;
  const s = clamp(Number(strength) || 0, 0, CFG.camera.shakeMax);
  if (s <= 0) return;
  if (_shakeFn) { _shakeFn(s, ms); return; }
  if (_shakeTried) return;
  _shakeTried = true;
  import('./camera.js')
    .then(m => { if (typeof m.shake === 'function') { _shakeFn = m.shake; _shakeFn(s, ms); } })
    .catch(() => { /* camera director not present — a shake is never load-bearing */ });
}

/** 'shakePreset('snake')' / 'shakePreset('finish')' — values from CFG.fx.shake. */
export function shakePreset(key) {
  const p = CFG.fx.shake[key];
  if (p) shake(p[0], p[1]);
}

/* ═══════════════════════════════════════════════════════════════════════
   8. THE ONE FRAME LOOP
   ═══════════════════════════════════════════════════════════════════════ */

/* scene.js's onFrame(dt) may hand us seconds or milliseconds. A 60fps frame is
   0.0167 s or 16.7 ms, so the two can never be confused below 0.5. Clamped to
   a 20fps step so a backgrounded tab does not teleport every particle. */
function normDt(dt) {
  let s = Number(dt);
  if (!Number.isFinite(s) || s <= 0) return 0;
  if (s > 0.5) s /= 1000;
  return clamp(s, 0, 1 / 20);
}

const fadeIn = (t, k) => (t < k ? t / k : 1);

/**
 * The one shared update, driven from scene.js's frame loop.
 * @param {number} dt seconds (milliseconds are detected and converted)
 */
export function updateFx(dt) {
  if (!_driven) {
    _driven = true;
    if (_autoTick && _offFrame) { try { _offFrame(_autoTick); } catch { /* gone */ } }
    _autoTick = null;
  }
  stepAll(dt);
}

function stepAll(dt) {
  if (!pools) return;
  const d = normDt(dt);
  if (d === 0) return;

  /* billboard orientation, computed once per frame */
  if (cameraRef) _camQ.setFromRotationMatrix(cameraRef.matrixWorld);
  else _camQ.copy(REST_Q);

  stepTrails(d);
  stepPool(pools.flake, d);
  stepPool(pools.puff, d);
  stepPool(pools.star, d);
  stepPool(pools.ring, d);
}

function stepTrails(dt) {
  if (trails.size === 0) return;
  const off = prefersReducedMotion() || tierParticles() <= 0;
  /* about six samples per hop — derived from the hop timing, not invented */
  const every = (CFG.timing.hopPerCell / 1000) / 6;
  for (const e of trails.values()) {
    if (!e.on || !e.obj) continue;
    e.acc += dt;
    if (off) { e.acc = 0; continue; }
    while (e.acc >= every) {
      e.acc -= every;
      e.obj.getWorldPosition(_s);
      emitTrail(e, _s);
    }
  }
}

function stepPool(P, dt) {
  if (P.n === 0) {
    if (P.mesh.visible) { P.mesh.visible = false; P.mesh.count = 0; }
    return;
  }
  const mat = P.mesh.instanceMatrix.array;
  const col = P.mesh.instanceColor.array;
  const alp = P.alphaAttr.array;

  let i = 0;
  while (i < P.n) {
    P.t[i] += dt;
    const ttl = P.ttl[i] || 0.001;
    const t = P.t[i] / ttl;
    if (t >= 1) { kill(P, i); continue; }

    const mode = P.mode[i];
    let d = P.sx[i], dy = P.sy[i], a = P.a0[i];

    switch (mode) {
      case M_FLAKE: {
        /* gravity, air drag, and a slow paper sway across the fall */
        const g = CFG.fx.confetti.gravity * CELL;
        const settled = P.py[i] <= P.ry[i] + 1e-4 && P.vy[i] <= 0;
        if (!settled) {
          P.vy[i] += g * dt;
          const k = Math.exp(-1.1 * dt);
          P.vx[i] *= k; P.vz[i] *= k;
          const sway = Math.sin(P.t[i] * 5.2 + P.ph[i]) * CFG.fx.confetti.spread * 0.22 * CELL;
          P.px[i] += (P.vx[i] + sway) * dt;
          P.pz[i] += P.vz[i] * dt;
          P.py[i] += P.vy[i] * dt;
          P.ax[i] += P.wx[i] * dt; P.ay[i] += P.wy[i] * dt; P.az[i] += P.wz[i] * dt;
          if (P.py[i] <= P.ry[i]) {          // touchdown — paper lands, it does not vanish
            P.py[i] = P.ry[i]; P.vy[i] = 0;
            P.vx[i] *= 0.18; P.vz[i] *= 0.18;
          }
        } else {
          /* come to rest flat on the tile, the way a real flake would */
          const k = Math.exp(-9 * dt);
          P.vx[i] *= k; P.vz[i] *= k;
          P.px[i] += P.vx[i] * dt; P.pz[i] += P.vz[i] * dt;
          P.ax[i] = damp(P.ax[i], -Math.PI / 2, 9, dt);
          P.az[i] = damp(P.az[i], 0, 9, dt);
        }
        a = P.a0[i] * fadeIn(t, 0.05) * (t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34);
        break;
      }
      case M_PUFF: {
        const k = Math.exp(-4.6 * dt);
        P.vx[i] *= k; P.vz[i] *= k;
        P.vy[i] *= Math.exp(-3.0 * dt);
        P.px[i] += P.vx[i] * dt; P.py[i] += P.vy[i] * dt; P.pz[i] += P.vz[i] * dt;
        P.az[i] += P.wz[i] * dt;
        d = dy = lerp(P.sx[i], P.sy[i], ease.out(t));
        a = P.a0[i] * fadeIn(t, 0.10) * Math.pow(1 - t, 1.5);
        break;
      }
      case M_STAR: {
        const k = Math.exp(-3.2 * dt);
        P.vx[i] *= k; P.vy[i] *= k; P.vz[i] *= k;
        P.px[i] += P.vx[i] * dt; P.py[i] += P.vy[i] * dt; P.pz[i] += P.vz[i] * dt;
        P.az[i] += P.wz[i] * dt;
        const s = Math.sin(Math.PI * t);
        d = dy = P.sx[i] * Math.pow(s, 0.55);
        a = P.a0[i] * s;
        break;
      }
      case M_RING: {
        d = dy = lerp(P.sx[i], P.sy[i], ease.out(t));
        a = P.a0[i] * fadeIn(t, 0.08) * Math.pow(1 - t, 1.4);
        break;
      }
      case M_TRAIL: {
        d = dy = lerp(P.sx[i], P.sy[i], t);
        a = P.a0[i] * Math.pow(1 - t, 2);
        break;
      }
      default: {   // M_STATIC — the gold bloom: no motion at all
        d = dy = P.sx[i];
        a = P.a0[i] * fadeIn(t, 0.12) * Math.pow(1 - t, 1.2);
      }
    }

    /* orientation */
    if (P.orient === 'euler') {
      _e.set(P.ax[i], P.ay[i], P.az[i]);
      _q.setFromEuler(_e);
    } else if (P.orient === 'flat') {
      _q.copy(FLAT_Q);
    } else {
      _q.copy(_camQ);
      if (P.az[i]) { _q2.setFromAxisAngle(AXIS_Z, P.az[i]); _q.multiply(_q2); }
    }

    _v.set(P.px[i], P.py[i], P.pz[i]);
    _s.set(mode === M_FLAKE ? d : d, mode === M_FLAKE ? P.sy[i] : dy, 1);
    _m.compose(_v, _q, _s);
    _m.toArray(mat, i * 16);

    const o = i * 3;
    col[o] = P.cr[i]; col[o + 1] = P.cg[i]; col[o + 2] = P.cb[i];
    alp[i] = a < 0 ? 0 : a > 1 ? 1 : a;
    i++;
  }

  P.mesh.count = P.n;
  P.mesh.visible = P.n > 0;
  if (P.n > 0) {
    P.mesh.instanceMatrix.needsUpdate = true;
    P.mesh.instanceColor.needsUpdate = true;
    P.alphaAttr.needsUpdate = true;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   9. PROBE SURFACE — window.__SNL.fps() has a sibling; game.js may fold this
      into its debug api. Cheap, read-only, no side effects.
   ═══════════════════════════════════════════════════════════════════════ */

export function fxStats() {
  if (!pools) return { flake: 0, puff: 0, star: 0, ring: 0, live: 0, drawCalls: 0, trails: 0 };
  const f = pools.flake.n, p = pools.puff.n, s = pools.star.n, r = pools.ring.n;
  const draws = (f > 0) + (p > 0) + (s > 0) + (r > 0);
  return {
    flake: f, puff: p, star: s, ring: r, live: f + p + s + r,
    drawCalls: draws, trails: trails.size,
    tier: CFG.quality.current?.tier, budget: tierParticles(),
    reduced: prefersReducedMotion(),
  };
}
