/* scene.js — renderer, lighting, environment, resize, quality tier, frame loop.
 *
 * The look we are building: "a warm painted board resting on a wooden table in a
 * house" (DESIGN §7.1). Late-afternoon light through a window — never studio,
 * never neon, never night (§7.3). Everything here exists to make the board read
 * as a real object with weight and a contact shadow, and nothing here is allowed
 * to cost frame rate, because §6.4 rule 1 is "frame rate over fidelity, always".
 *
 * Owns: the WebGLRenderer, the Scene, the PerspectiveCamera object (camera.js
 * *drives* it — see initCamera), the lights, the procedural environment map, the
 * screen-space backdrop, the resize path, and the single requestAnimationFrame
 * loop the whole game animates on.
 *
 * ── dt UNITS, read this ──────────────────────────────────────────────────────
 *   onFrame(fn)  ->  fn(dt, elapsed)   BOTH IN SECONDS, not milliseconds.
 *   'dt' is clamped to <= 0.05 s so a backgrounded tab never teleports anything.
 *   util.js's damp(a, b, lambda, dt) expects exactly these units.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from '../vendor/three.module.js';
import {
  CFG, DEBUG, applyTier, demoteTier, hasWebGL,
} from './config.js';
import { clamp, emitter, makeRng } from './util.js';

/* ═══════════════════════════════════════════════════════════════════════════
   Module state
   ═══════════════════════════════════════════════════════════════════════════ */

let renderer = null;
let scene = null;
let camera = null;
let canvasEl = null;

let lights = null;          // { hemi, key, fill, rim }
let backdrop = null;        // the full-screen gradient mesh
let table = null;           // ShadowMaterial catcher — the implied table top
let envMap = null;          // PMREM cube render target texture
let envRT = null;           // the render target itself, for dispose()

let booted = false;
let contextLost = false;

/* frame loop */
let rafId = 0;
let running = false;
let lastTs = 0;
let elapsedS = 0;
let frameNo = 0;
const cbSet = new Set();
let cbList = [];            // flat snapshot — no Set iteration in the hot loop

/* fps — a true rolling average over the last N frames */
const FPS_WINDOW = 60;
const fpsRing = new Float32Array(FPS_WINDOW);
let fpsIdx = 0, fpsFilled = 0, fpsSum = 0;

/* silent auto-demote (§6.3) + the 2D-fallback signal */
const dropTimes = [];
let lastDemoteAt = -1e9;
let lowFpsSince = -1;
let fallbackSignalled = false;

/* first-paint promise */
let firstFrameResolve = null;
const firstFramePromise = new Promise((res) => { firstFrameResolve = res; });
let firstFrameDone = false;

/** Anyone can listen: 'tier' · 'resize' · 'fallback2d' · 'contextlost' · 'contextrestored' */
export const sceneEvents = emitter();

/* ═══════════════════════════════════════════════════════════════════════════
   Colour helpers.  Two colour spaces are in play and mixing them is the single
   easiest way to make a cream palette look muddy:
     · the backdrop shader writes FINAL sRGB values (it bypasses tone mapping),
     · the environment scene is rendered LINEAR into a half-float target.
   So we convert explicitly, by hand, rather than trusting a default.
   ═══════════════════════════════════════════════════════════════════════════ */

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hexRGB = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const vec3srgb = (hex) => new THREE.Vector3(...hexRGB(hex));
const linRGB = (hex, mul = 1) => hexRGB(hex).map((v) => srgbToLinear(v) * mul);

/* ═══════════════════════════════════════════════════════════════════════════
   ART DIRECTION v2 (docs/ART-DIRECTION.md).  The v1 rig was one flat hemisphere
   at full strength plus a 1.1 key — which is a diagram lit by an overcast sky.
   Everything below exists to turn that into "a board photographed on a wooden
   table in warm afternoon light": a real key that shapes, a real table that the
   board sits ON, and a grade that puts the saturation back.
   These numbers deliberately supersede CFG.lighting for the values §3 of the
   art direction names by hand — see DEVIATIONS in the report.
   ═══════════════════════════════════════════════════════════════════════════ */

/* The room, warm and lived-in. The backdrop is only ever seen as the last few
   pixels past the table's far edge, so it continues the table's vignette. */
const BG = {
  inner: 0x8a6242,   // the lit tabletop reading up into the frame
  mid:   0x6a4830,   // where the table falls away
  outer: 0x3a2718,   // the room, out of focus
  floor: 0x4e3524,   // §3 vignette colour — the corners of the table
};

/* Light rig — ART-DIRECTION §3, verbatim. Elevation is measured off the XZ
   plane; azimuth 0 = +Z (toward the camera), increasing toward +X, so a
   NEGATIVE azimuth is front-LEFT. */
const RIG = {
  hemi: { sky: 0xffe9c8, ground: 0x5d3f28, intensity: 0.46 },
  key:  { color: 0xfff0d8, intensity: 1.95, elevationDeg: 45, azimuthDeg: -38 },
  fill: { color: 0xcfe6ff, intensity: 0.50, elevationDeg: 28, azimuthDeg: 132 },
  rim:  { color: 0xffc478, intensity: 0.85, elevationDeg: 12, azimuthDeg: 187 },
};

/* Shadow — §3 "2048 map fitted tight to the board bounds". The board plus its
   frame is 10.9 units across; 16 units of frustum is 7.6 mm per texel, so the
   edge of a ladder rail is still a shadow and not a staircase. */
const SHADOW_V2 = { extent: 8.0, radius: 7, bias: -0.00035, normalBias: 0.028,
                    near: 6, far: 62, mapSizeHigh: 2048 };

/* The table — §3. Not a gradient any more: lacquered plank wood with seams,
   a grain-driven roughness break-up, and a vignette that falls to BG.floor. */
const TABLE = {
  size:        64,        // world units. Must exceed board3d's own 62-unit plane.
  tileWorld:   16,        // one texture patch = 16 world units = 4 planks
  plankWorld:  4,         // ~16 cm at the board's scale
  base:        '#8a6242', // §2 table colour
  roughness:   0.60,      // §2
  vignette:    0x4e3524,  // §2 the corners
  vigFrom:     6.4,       // world units from board centre — just past the frame
  vigTo:       19.0,
  poolHalf:    5.62,      // board footprint half-width (5 + frame 0.45 + a hair)
  poolFade:    2.30,      // how far the baked contact pool spreads
  poolOffset:  0.42,      // pushed away from the key, so the board sits into it
};

/* Environment — a warm room with ONE bright window, so gloss and metal have a
   shape to reflect instead of a flat wash. CFG's 0.55 was tuned against a cream
   room; this room is darker, so it can carry more. */
const ENV_TRIM = 1.65;

/* Scene-local caps, tighter than CFG.quality.tiers[].pixelRatio.
   config.js states the CEILING; scene.js spends less of it, because a 2.0 DPR
   mid phone is exactly the device that misses the 45 fps hop budget. Never
   exceeds the config value — see resolveDpr(). */
const DPR_CAP = { high: 2, mid: 1.75, low: 1.25 };

/* ACES eats the top of a cream palette: #f7faf9 at exposure 1.0 lands around
   #e8ebea, which reads grey on a 400-nit LCD in daylight (§7.4). This trim puts
   the cream back where the brand doc has it without blowing the gold out.
   v2: raised again (ART §3 "exposure up"), but only a little — most of the extra
   light now comes from the key, which SHAPES, where exposure only lifts. */
const EXPOSURE_TRIM = 1.06;

/* ═══════════════════════════════════════════════════════════════════════════
   THE GRADE — ART §3 "a gentle contrast and saturation lift".
   ACES is a beautiful, and famously desaturating, curve. Rather than pay for a
   postprocessing chain (zero draw calls is a §6.3 budget line), we patch three
   lines into three's own ACES tone-mapping function, once, before the renderer
   is created. Every material in the game inherits it for free.
   renderer.toneMapping stays ACESFilmicToneMapping — CONTRACT §scene.js.
   ═══════════════════════════════════════════════════════════════════════════ */

const GRADE_SAT      = 1.22;   // put back what ACES takes out
const GRADE_CONTRAST = 1.12;   // around a linear mid-grey pivot
const GRADE_PIVOT    = 0.20;

let gradePatched = false;

function patchToneMapping() {
  if (gradePatched) return;
  gradePatched = true;
  try {
    const key = 'color = ACESOutputMat * color;\n\treturn saturate( color );';
    const src = THREE.ShaderChunk.tonemapping_pars_fragment;
    if (src.indexOf(key) < 0) { if (DEBUG) console.warn('scene: ACES chunk not found, grade skipped'); return; }
    THREE.ShaderChunk.tonemapping_pars_fragment = src.replace(key, /* glsl */`color = ACESOutputMat * color;
	color = saturate( color );
	float _lum = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
	color = mix( vec3( _lum ), color, ${GRADE_SAT.toFixed(3)} );
	color = ( color - ${GRADE_PIVOT.toFixed(3)} ) * ${GRADE_CONTRAST.toFixed(3)} + ${GRADE_PIVOT.toFixed(3)};
	return saturate( color );`);
  } catch (err) {
    if (DEBUG) console.warn('scene: tone grade patch failed, continuing', err);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. INIT
   ═══════════════════════════════════════════════════════════════════════════ */

/** `?tier=high` on the URL pins the quality tier. Headless Chrome renders through
 *  SwiftShader, which detectTier() correctly reads as a weak GPU and drops to
 *  'low' — so a screenshot probe never saw the shadows, the env map or the
 *  antialiasing a real device gets. This is how you photograph the real thing. */
function urlTier() {
  try {
    const t = new URLSearchParams(location.search).get('tier');
    return (t === 'low' || t === 'mid' || t === 'high' || t === 'auto') ? t : null;
  } catch { return null; }
}

/**
 * @param {HTMLCanvasElement} canvas  the #snl-canvas from index.html
 * @param {object} [opts]  { tier:'auto'|'low'|'mid'|'high' }
 * @returns {{ scene:THREE.Scene, camera:THREE.PerspectiveCamera,
 *             renderer:THREE.WebGLRenderer, tier:string }}
 */
export function initScene(canvas, opts = {}) {
  if (booted) return { scene, camera, renderer, tier: getTier() };
  if (!canvas) throw new Error('scene.initScene: no canvas');
  if (!hasWebGL()) throw new Error('scene.initScene: no WebGL');

  canvasEl = canvas;
  const tier = applyTier(opts.tier || urlTier() || 'auto');

  /* Must happen BEFORE the first program is compiled — a ShaderChunk is read at
     compile time and cached per material thereafter. */
  patchToneMapping();

  /* ── renderer ─────────────────────────────────────────────────────────── */
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !!tier.antialias,        // §6.3 — off on low, where fill rate is the wall
    alpha: false,                       // we paint our own backdrop; opaque is cheaper
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,       // captureFrame() renders on demand instead
  });

  renderer.setClearColor(BG.mid, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;   // CONTRACT + §7.3
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // CONTRACT + §7.3
  renderer.toneMappingExposure = CFG.lighting.exposure * EXPOSURE_TRIM;
  renderer.info.autoReset = true;
  renderer.autoClear = true;

  applyShadowSettings(tier);
  applyPixelRatio(tier);

  /* ── scene ────────────────────────────────────────────────────────────── */
  scene = new THREE.Scene();
  scene.name = 'saanp-seedhi';
  applyFog(tier);

  /* ── camera — created here, DRIVEN by camera.js (§6.2) ────────────────── */
  const c = CFG.camera;
  camera = new THREE.PerspectiveCamera(c.fov, aspectNow(), c.near, c.far);
  camera.position.set(c.position[0], c.position[1], c.position[2]);
  camera.lookAt(c.target[0], c.target[1], c.target[2]);
  camera.name = 'director';
  scene.add(camera);

  buildLights(tier);
  buildBackdrop();
  buildEnvironment(tier);
  buildTable(tier);

  /* The board's state is announced through #snl-live and the HUD (CONTRACT
     "Accessibility"), so the canvas itself is decoration to a screen reader.
     An unlabelled canvas in the tab order is worse than no canvas at all. */
  canvas.setAttribute('aria-hidden', 'true');

  bindResize();
  bindContextLoss();
  resize();

  booted = true;
  start();
  return { scene, camera, renderer, tier: tier.tier };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LIGHTING — §7.3
      DESIGN specifies one hemisphere + ONE directional key. We ship that key at
      its stated colour, angle and intensity, and add two very quiet directionals
      — a warm fill and a cool rim — because a single key leaves the shaded side
      of a brass token and the back of a snake as flat black, which is the one
      thing that makes a 3D board read as an app skin instead of an object.
      Both are non-shadow-casting and together they are worth less than a third
      of the key. Stated loudly in the report; see the note in DEVIATIONS below.
   ═══════════════════════════════════════════════════════════════════════════ */

/** az 0 = +Z (toward the camera), increasing toward +X. el measured off the XZ plane. */
function dirFromAngles(elDeg, azDeg, dist) {
  const el = elDeg * Math.PI / 180, az = azDeg * Math.PI / 180;
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist,
  );
}

function buildLights(tier) {
  const L = CFG.lighting;

  const hemi = new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity);
  hemi.position.set(0, 30, 0);
  hemi.name = 'hemi';

  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
  key.position.copy(dirFromAngles(L.key.elevationDeg, L.key.azimuthDeg, 30));
  key.target.position.set(0, 0.3, 0);
  key.name = 'key';

  /* warm fill — the table bouncing light back up into the shaded side */
  const fillCfg = L.fill || { color: CFG.colors.groundLight, intensity: 0.30,
                              elevationDeg: 20, azimuthDeg: -102 };
  const fill = new THREE.DirectionalLight(fillCfg.color, fillCfg.intensity);
  fill.position.copy(dirFromAngles(fillCfg.elevationDeg, fillCfg.azimuthDeg, 30));
  fill.target.position.set(0, 0.3, 0);
  fill.name = 'fill';

  /* cool rim — a mint edge along the top of tokens, snakes and the frame, so a
     silhouette still reads at the default 38° camera (§6.4 rule 4) */
  const rimCfg = L.rim || { color: CFG.colors.mint, intensity: 0.34,
                            elevationDeg: 54, azimuthDeg: 194 };
  const rim = new THREE.DirectionalLight(rimCfg.color, rimCfg.intensity);
  rim.position.copy(dirFromAngles(rimCfg.elevationDeg, rimCfg.azimuthDeg, 30));
  rim.target.position.set(0, 0.3, 0);
  rim.name = 'rim';

  scene.add(hemi, key, key.target, fill, fill.target, rim, rim.target);
  lights = { hemi, key, fill, rim };
  applyShadowCamera(tier);
}

/** Shadow map + a tight ortho frustum around the board. High tier only (§6.3). */
function applyShadowCamera(tier) {
  if (!lights) return;
  const S = CFG.lighting.shadow;
  const key = lights.key;
  const soft = tier.shadows === 'soft';
  key.castShadow = soft;
  if (!soft) return;

  /* config states 1024; a 10x10 board wants more, because the tile bevels and
     the ladder posts are where a coarse map reads as a staircase. 2048 over an
     18-unit frustum is ~114 texels per world unit — one texel per 9 mm of a
     one-metre board. 16 MB, high tier only. */
  const mapSize = tier.tier === 'high' ? 2048 : (tier.shadowMapSize || 1024);
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.bias = S.bias;
  key.shadow.normalBias = S.normalBias;
  key.shadow.radius = S.radius;

  const sc = key.shadow.camera;
  sc.left = -S.extent; sc.right = S.extent;
  sc.top = S.extent;  sc.bottom = -S.extent;
  sc.near = S.near;   sc.far = S.far;
  sc.updateProjectionMatrix();
}

function applyShadowSettings(tier) {
  const soft = tier.shadows === 'soft';
  renderer.shadowMap.enabled = soft;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = soft;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. THE IMPLIED TABLE
      §7.2: "Table — out of frame except as a warm bounce colour." So there is no
      table mesh, only a shadow catcher: fully transparent except where the board
      occludes the key light. That single soft contact shadow is the difference
      between a board resting on something and a board floating in cream.
      Costs one draw call and two triangles, and only exists where there are real
      shadows to catch (mid/low use tokens3d's blob shadows instead).
   ═══════════════════════════════════════════════════════════════════════════ */

function buildTable(tier) {
  if (table) { scene.remove(table); table.geometry.dispose(); table.material.dispose(); table = null; }
  if (tier.shadows !== 'soft') return;
  const g = new THREE.PlaneGeometry(26, 26);
  const m = new THREE.ShadowMaterial({ color: 0x2b3f47, opacity: 0.26, transparent: true });
  m.depthWrite = false;
  m.fog = false;      // a fogged transparent plane paints a visible rectangle
  table = new THREE.Mesh(g, m);
  table.name = 'table-shadow';
  table.rotation.x = -Math.PI / 2;
  table.position.y = -CFG.board.thickness - 0.002;
  table.receiveShadow = true;
  table.renderOrder = -900;
  scene.add(table);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. BACKDROP
      A single screen-space quad drawn before everything, matching index.html's
      loading-screen gradient exactly: radial cream toward mint, a warm floor
      bounce rising from the bottom edge, and a soft vignette that settles the
      corners so the eye lands on the board and stays there.

      It bypasses tone mapping and writes final sRGB, so the ground under the
      board is bit-identical to the CSS the boot screen fades out of.
   ═══════════════════════════════════════════════════════════════════════════ */

const BACKDROP_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);   // straight to clip space, at the far plane
}`;

const BACKDROP_FRAG = /* glsl */`
varying vec2 vUv;
uniform vec3  uInner, uMid, uOuter, uFloor;
uniform float uAspect, uFloorAmt, uVignette;

void main() {
  /* CSS: radial-gradient(120% 80% at 50% 6%, inner 0%, mid 46%, outer 100%)
     CSS y runs from the top, vUv.y from the bottom, so 6% down == 0.94 up. */
  vec2 p = vec2((vUv.x - 0.5) / 1.20, (vUv.y - 0.94) / 0.80);
  float r = clamp(length(p), 0.0, 1.0);
  vec3 col = r < 0.46
    ? mix(uInner, uMid,   r / 0.46)
    : mix(uMid,   uOuter, (r - 0.46) / 0.54);

  /* the warm bounce off the table, gone by 42% of the height */
  col = mix(col, uFloor, smoothstep(0.42, 0.0, vUv.y) * uFloorAmt);

  /* aspect-correct vignette — normalised so it always reaches 1.0 at a corner */
  vec2 v = (vUv - 0.5) * 2.0;
  v.x *= uAspect;
  float vr = length(v) / max(length(vec2(uAspect, 1.0)), 0.0001);
  col *= 1.0 - uVignette * smoothstep(0.50, 1.0, vr);

  gl_FragColor = vec4(col, 1.0);
}`;

function buildBackdrop() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: BACKDROP_VERT,
    fragmentShader: BACKDROP_FRAG,
    uniforms: {
      uInner:    { value: vec3srgb(BG.inner) },
      uMid:      { value: vec3srgb(BG.mid) },
      uOuter:    { value: vec3srgb(BG.outer) },
      uFloor:    { value: vec3srgb(BG.floor) },
      uAspect:   { value: aspectNow() },
      uFloorAmt: { value: 0.44 },   // index.html's rgba(232,217,192,.44)
      uVignette: { value: 0.085 },  // just enough to stop the corners glaring
    },
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,   // it is already the final picture; ACES would grey it
  });
  backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  backdrop.name = 'backdrop';
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;
  backdrop.matrixAutoUpdate = false;
  scene.add(backdrop);
}

/** Projector mode / a debug pass may want the raw board on flat cream. */
export function setBackdropVisible(on) { if (backdrop) backdrop.visible = !!on; }

/* ═══════════════════════════════════════════════════════════════════════════
   5. ENVIRONMENT MAP — built in code, no HDR file, no network.
      A tiny room rendered once through PMREMGenerator: a vertical gradient shell
      (warm ceiling -> cream horizon -> table bounce) plus one bright window panel
      sitting exactly where the key light comes from. The window is the point:
      without a distinct bright shape in the environment the brass tokens, the
      gold-leaf rung tips, the navy dice pips and the glazed snake body have
      nothing to reflect and read as plastic.
   ═══════════════════════════════════════════════════════════════════════════ */

const ENV_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ENV_FRAG = /* glsl */`
varying vec3 vDir;
uniform vec3 uSky, uHorizon, uGround;
void main() {
  float h = normalize(vDir).y;
  vec3 c = h > 0.0
    ? mix(uHorizon, uSky,    pow(h, 0.72))
    : mix(uHorizon, uGround, pow(-h, 0.85));
  gl_FragColor = vec4(c, 1.0);
}`;

function buildEnvironment(tier) {
  disposeEnv();
  if (!tier.envMap) { scene.environment = null; return; }

  let pmrem = null;
  try {
    const env = new THREE.Scene();

    /* the room shell — a big inverted box, shaded by direction */
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(60, 60, 60),
      new THREE.ShaderMaterial({
        vertexShader: ENV_VERT,
        fragmentShader: ENV_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uSky:     { value: new THREE.Vector3(...linRGB(CFG.colors.keyLight, 1.45)) },
          uHorizon: { value: new THREE.Vector3(...linRGB(CFG.colors.cream, 0.92)) },
          uGround:  { value: new THREE.Vector3(...linRGB(CFG.colors.groundLight, 0.60)) },
        },
      }),
    );
    env.add(shell);

    /* the window — one bright panel at the key light's angle. HDR: the colour is
       written straight into the working (linear) space, above 1.0 on purpose. */
    const K = CFG.lighting.key;
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 11),
      new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }),
    );
    const wl = linRGB(K.color, 5.0);
    win.material.color.setRGB(wl[0], wl[1], wl[2], THREE.LinearSRGBColorSpace);
    win.position.copy(dirFromAngles(K.elevationDeg, K.azimuthDeg, 24));
    win.lookAt(0, 0, 0);
    env.add(win);

    /* a second, much softer panel opposite it, so the shaded side of a token
       gets a gradient rather than a hard terminator */
    const bounce = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 16),
      new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }),
    );
    const bl = linRGB(CFG.colors.groundLight, 1.25);
    bounce.material.color.setRGB(bl[0], bl[1], bl[2], THREE.LinearSRGBColorSpace);
    bounce.position.copy(dirFromAngles(16, K.azimuthDeg + 180, 24));
    bounce.lookAt(0, 0, 0);
    env.add(bounce);

    pmrem = new THREE.PMREMGenerator(renderer);
    envRT = pmrem.fromScene(env, 0.02, 0.1, 100);
    envMap = envRT.texture;

    scene.environment = envMap;
    scene.environmentIntensity = CFG.lighting.envIntensity;

    shell.geometry.dispose(); shell.material.dispose();
    win.geometry.dispose();   win.material.dispose();
    bounce.geometry.dispose(); bounce.material.dispose();
  } catch (err) {
    /* An env map is a nicety. Losing it must never lose the game. */
    envMap = null; envRT = null;
    if (scene) scene.environment = null;
    if (DEBUG) console.warn('scene: env map failed, continuing flat', err);
  } finally {
    pmrem?.dispose();
  }
}

function disposeEnv() {
  if (scene) scene.environment = null;
  envRT?.dispose();
  envRT = null;
  envMap = null;
}

/** The PMREM texture, so board3d/tokens3d/dice3d can set material.envMap directly
 *  on anything that is not using the scene default. May be null on low tier. */
export function getEnvMap() { return envMap; }

/* ═══════════════════════════════════════════════════════════════════════════
   6. FOG — a whisper, not weather.
      ~4% of tone difference between the near and far edge of the board. Enough
      that the top of the ghat road sits back in the room; far too little to
      touch the legibility of a square numeral (§6.4 rule 2).
   ═══════════════════════════════════════════════════════════════════════════ */

function applyFog(tier) {
  if (!scene) return;
  scene.fog = tier.fogged ? new THREE.FogExp2(BG.outer, 0.010) : null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. RESIZE
      Three things break a 3D board on a phone: the URL bar sliding away, an
      orientation change reporting a stale size for one frame, and a devicePixel-
      Ratio the GPU cannot afford. All three are handled here and nowhere else.
   ═══════════════════════════════════════════════════════════════════════════ */

let resizePending = false;
let orientationTimer = 0;
let lastW = 0, lastH = 0, lastDpr = 0;

function vv() {
  return (typeof window !== 'undefined' && window.visualViewport) ? window.visualViewport : null;
}

function aspectNow() {
  const { w, h } = measure();
  return w / Math.max(1, h);
}

/** The authoritative size is the canvas's own CSS box — index.html owns that box
 *  ('height:100dvh'), so measuring it means we never fight the stylesheet.
 *  visualViewport is used as a clamp for the window between the URL bar starting
 *  to move and the layout viewport catching up, which is where the board gets
 *  cropped behind browser chrome on iOS Safari. */
function measure() {
  const v = vv();
  let w = canvasEl ? canvasEl.clientWidth : 0;
  let h = canvasEl ? canvasEl.clientHeight : 0;

  if (!w || !h) {
    w = v ? v.width : (typeof innerWidth === 'number' ? innerWidth : 360);
    h = v ? v.height : (typeof innerHeight === 'number' ? innerHeight : 640);
  }
  /* Only trust visualViewport at scale 1 — pinch-zoom and an on-screen keyboard
     both shrink it, and neither should shrink the board. (This game never asks
     for text input, so the keyboard case is belt-and-braces.) */
  if (v && v.height && (v.scale == null || v.scale <= 1.01) && h - v.height > 1) {
    h = v.height;
  }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

function resolveDpr(tier) {
  const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
  const cfgCap = tier.pixelRatio || 2;                       // config's ceiling
  const sceneCap = DPR_CAP[tier.tier] ?? cfgCap;             // scene's tighter budget
  return clamp(Math.min(dpr, cfgCap, sceneCap), 1, 3);
}

function applyPixelRatio(tier) {
  const r = resolveDpr(tier);
  if (Math.abs(r - lastDpr) <= 0.001) return false;
  renderer.setPixelRatio(r); lastDpr = r;
  return true;   // caller must re-setSize, or the new ratio never reaches the buffer
}

/** Immediate, synchronous resize. Contract API. */
export function resize() {
  if (!renderer || !camera || contextLost) return;
  const tier = CFG.quality.current;
  const { w, h } = measure();
  const dprChanged = applyPixelRatio(tier);

  if (w === lastW && h === lastH && !dprChanged) return;
  lastW = w; lastH = h;

  renderer.setSize(w, h, false);   // false: CSS owns the canvas box, we only own pixels
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (backdrop) backdrop.material.uniforms.uAspect.value = w / h;

  sceneEvents.emit('resize', { w, h, dpr: lastDpr, aspect: w / h });
}

/** Coalesced to one resize per frame — visualViewport fires this per scroll tick. */
function scheduleResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => { resizePending = false; resize(); });
}

function bindResize() {
  if (typeof window === 'undefined') return;

  window.addEventListener('resize', scheduleResize, { passive: true });

  /* orientationchange reports the pre-rotation size for a frame or three on
     iOS and on a few Android skins — re-measure after it settles. */
  window.addEventListener('orientationchange', () => {
    scheduleResize();
    clearTimeout(orientationTimer);
    orientationTimer = setTimeout(() => { resize(); scheduleResize(); }, 300);
  }, { passive: true });

  const v = vv();
  if (v) {
    v.addEventListener('resize', scheduleResize, { passive: true });
    v.addEventListener('scroll', scheduleResize, { passive: true });
  }

  /* The most reliable signal of all: the canvas box itself changed. Catches
     dvh recalculation, a parent layout change and desktop window drags. */
  if (typeof ResizeObserver === 'function' && canvasEl) {
    try { new ResizeObserver(scheduleResize).observe(canvasEl); } catch { /* ignore */ }
  }

  document.addEventListener('visibilitychange', onVisibility, { passive: true });
}

function onVisibility() {
  if (document.hidden) { stop(); }
  else { scheduleResize(); start(); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. CONTEXT LOSS — a real, routine event on a phone that has been backgrounded.
      Losing the canvas must not lose a twelve-minute family game (§11 Resume).
   ═══════════════════════════════════════════════════════════════════════════ */

function bindContextLoss() {
  if (!canvasEl) return;
  canvasEl.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
    stop();
    sceneEvents.emit('contextlost', {});
  }, false);

  canvasEl.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    const tier = CFG.quality.current;
    applyShadowSettings(tier);
    applyShadowCamera(tier);
    buildEnvironment(tier);
    lastW = lastH = 0;
    resize();
    sceneEvents.emit('contextrestored', {});
    start();
  }, false);
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. FRAME LOOP — one rAF for the whole game.
      dt and elapsed are in SECONDS. dt is clamped to 50 ms so a tab switch,
      a breakpoint or a slow first frame never teleports a token across the board.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Subscribe to the frame loop. fn(dt, elapsed) — both in seconds. Returns an
 *  unsubscribe function, so 'const off = onFrame(fn)' works as well as offFrame. */
export function onFrame(fn) {
  if (typeof fn !== 'function') return () => {};
  cbSet.add(fn);
  cbList = [...cbSet];
  return () => offFrame(fn);
}

export function offFrame(fn) {
  if (cbSet.delete(fn)) cbList = [...cbSet];
}

/** Rolling average fps over the last 60 frames. Exposed on window.__SNL.fps(). */
export function getFps() {
  if (!fpsFilled || fpsSum <= 0) return 0;
  const spf = fpsSum / fpsFilled;              // mean seconds per frame
  return Math.round((1 / spf) * 10) / 10;      // one decimal, e.g. 59.8
}

/** renderer.info.render + renderer.info.memory, flattened, for the probe. */
export function renderInfo() {
  if (!renderer) return { calls: 0, triangles: 0, points: 0, lines: 0, frame: 0,
                          geometries: 0, textures: 0, programs: 0, fps: 0, tier: getTier() };
  const r = renderer.info.render, m = renderer.info.memory;
  return {
    frame: r.frame, calls: r.calls, triangles: r.triangles, points: r.points, lines: r.lines,
    geometries: m.geometries, textures: m.textures,
    programs: renderer.info.programs ? renderer.info.programs.length : 0,
    fps: getFps(), tier: getTier(), pixelRatio: lastDpr,
    width: lastW, height: lastH,
  };
}

/** Resolves once a real frame has been rendered AND the browser has painted it. */
export function screenshotReady() { return firstFramePromise; }

export function isRunning() { return running; }

export function start() {
  if (running || !renderer || contextLost) return;
  running = true;
  lastTs = 0;
  rafId = requestAnimationFrame(tick);
}

export function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function tick(ts) {
  if (!running) return;
  rafId = requestAnimationFrame(tick);

  /* ── delta ─────────────────────────────────────────────────────────────── */
  if (!lastTs) lastTs = ts;
  const rawMs = ts - lastTs;
  lastTs = ts;
  const dt = Math.min(rawMs, 50) / 1000;   // hard clamp, CONTRACT + task spec
  elapsedS += dt;
  frameNo++;

  /* ── fps ring ──────────────────────────────────────────────────────────── */
  if (rawMs > 0 && rawMs < 1000) {
    fpsSum -= fpsRing[fpsIdx];
    fpsRing[fpsIdx] = rawMs / 1000;
    fpsSum += fpsRing[fpsIdx];
    fpsIdx = (fpsIdx + 1) % FPS_WINDOW;
    if (fpsFilled < FPS_WINDOW) fpsFilled++;
  }

  /* ── subscribers ───────────────────────────────────────────────────────── */
  for (let i = 0; i < cbList.length; i++) {
    try { cbList[i](dt, elapsedS); }
    catch (err) { reportError(err); }
  }

  /* ── draw ──────────────────────────────────────────────────────────────── */
  if (!contextLost) {
    try { renderer.render(scene, camera); }
    catch (err) { reportError(err); }
  }

  if (!firstFrameDone) {
    firstFrameDone = true;
    /* one more frame, so the compositor has actually put pixels on the glass
       before a probe or a screenshot believes us */
    requestAnimationFrame(() => firstFrameResolve({ ms: Math.round(ts), tier: getTier() }));
  }

  watchPerf(ts, rawMs);
}

function reportError(err) {
  try { window.__SNL?.errors?.push(String(err && err.stack || err)); } catch { /* ignore */ }
  if (DEBUG) console.error('scene frame:', err);
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. SILENT AUTO-DEMOTE + THE 2D FALLBACK SIGNAL — §6.3
       "Auto-demotes silently after 8 dropped frames in any 2 s window, mid-game,
        preserving state. The player is never told anything is wrong, because
        nothing is."  No toast, no console, no flag on screen.
   ═══════════════════════════════════════════════════════════════════════════ */

function watchPerf(ts, rawMs) {
  const D = CFG.quality.demote;

  if (rawMs > D.frameBudgetMs) dropTimes.push(ts);
  while (dropTimes.length && ts - dropTimes[0] > D.windowMs) dropTimes.shift();

  if (CFG.quality.auto && dropTimes.length >= D.droppedFrames && ts - lastDemoteAt > D.cooldownMs) {
    const next = demoteTier();
    if (next) {
      lastDemoteAt = ts;
      dropTimes.length = 0;
      setTier(next, { auto: true });
    }
  }

  /* §6.3 the 2D fallback: two seconds averaging under 25 fps. We only raise the
     flag — game.js owns the mode switch, because it owns the state. */
  const F = CFG.quality.fallback2D;
  if (!fallbackSignalled && fpsFilled >= FPS_WINDOW && getTier() === 'low') {
    if (getFps() < F.belowFps) {
      if (lowFpsSince < 0) lowFpsSince = ts;
      else if (ts - lowFpsSince > F.sampleMs) {
        fallbackSignalled = true;
        sceneEvents.emit('fallback2d', { fps: getFps() });
      }
    } else lowFpsSince = -1;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. TIER
   ═══════════════════════════════════════════════════════════════════════════ */

/** 'low' | 'mid' | 'high' — CONTRACT. */
export function getTier() { return CFG.quality.current.tier; }

/**
 * Change tier at runtime. Re-applies everything scene.js owns and tells the rest
 * of the game so it can rebuild its geometry at the new segment counts.
 * NOTE: 'antialias' is fixed at context creation and is deliberately NOT changed
 * here — recreating the WebGL context mid-game would drop every texture and
 * every buffer the other modules hold, which costs far more than the MSAA saves.
 * @param {'low'|'mid'|'high'|'auto'} t
 */
export function setTier(t, meta = {}) {
  const before = getTier();
  const tier = applyTier(t);
  /* applyTier() clears quality.auto for any explicit tier. A silent auto-demote
     is still automatic, so put the flag back or the cascade stops at 'mid'. */
  if (meta.auto) CFG.quality.auto = true;
  if (renderer) {
    applyShadowSettings(tier);
    applyShadowCamera(tier);
    applyPixelRatio(tier);
    applyFog(tier);
    buildTable(tier);
    buildEnvironment(tier);
    lastW = lastH = 0;
    resize();
  }
  if (tier.tier !== before) sceneEvents.emit('tier', { tier: tier.tier, from: before, ...meta });
  return tier.tier;
}

/** Listen for a tier change (including a silent auto-demote). */
export function onTierChange(fn) { return sceneEvents.on('tier', fn); }

/* ═══════════════════════════════════════════════════════════════════════════
   12. ODDS AND ENDS
   ═══════════════════════════════════════════════════════════════════════════ */

export function getScene()    { return scene; }
export function getCamera()   { return camera; }
export function getRenderer() { return renderer; }
export function getSize()     { return { w: lastW, h: lastH, dpr: lastDpr }; }

/** Tone-mapping exposure, so a projector-mode toggle can lift the whole picture
 *  without touching a single material. §6.2 "projector mode". */
export function setExposure(mul = 1) {
  if (renderer) renderer.toneMappingExposure = CFG.lighting.exposure * EXPOSURE_TRIM * mul;
}

/**
 * Render once and hand back a PNG data URL. Done in one synchronous burst so it
 * works without preserveDrawingBuffer (which costs frame rate on some drivers).
 * Used by "Photo save karo" if it ever wants the board itself. §12.
 */
export function captureFrame(type = 'image/png') {
  if (!renderer || !scene || !camera) return null;
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL(type);
}

/** Tear everything down. Only main.js's error path should ever need this. */
export function disposeScene() {
  stop();
  cbSet.clear(); cbList = [];
  disposeEnv();
  if (backdrop) { backdrop.geometry.dispose(); backdrop.material.dispose(); backdrop = null; }
  if (table)    { table.geometry.dispose();    table.material.dispose();    table = null; }
  sceneEvents.clear();
  renderer?.dispose();
  renderer = null; scene = null; camera = null; lights = null;
  booted = false; firstFrameDone = false;
}
