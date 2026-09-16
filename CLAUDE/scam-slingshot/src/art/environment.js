/**
 * art/environment.js — the sky, the haze, the IFM backdrop and every parallax layer.
 *
 * Everything behind (and slightly in front of) the play plane lives here. `level/loader.js`
 * calls `buildEnvironment(scene)` once per level build and `main.js` ticks
 * `updateEnvironment(dt)` off `world.simTime`.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO OBEY ────────────────────────────────────
 * BUILD-CONTEXT.md's contrast hierarchy: ammo + villains > structures > HUD > branded
 * backdrop. Depth here comes from LOW-contrast layering, never from bright shapes. A
 * student's eye must land on the tower; if it lands on the mountain, this file has failed
 * however handsome the mountain is. Concretely, three things enforce that:
 *
 *   1. SATURATION IS THE LEVER, NOT BRIGHTNESS. Measured on the pre-branding build, the
 *      backdrop ran sat 0.45 against the tower's 0.47 — i.e. the sky and the hills were as
 *      colourful as the thing you are meant to be aiming at, which is why the old bright
 *      green hill band pulled the eye. Every colour below is authored low-sat and pulled
 *      toward IFM teal #2a9d8f / navy #1a3a5c, so the tower keeps the only saturated
 *      colour on screen.
 *   2. FOG DOES THE WORK FOR FREE. The camera sits ~110 units back with fog at
 *      near = dist+14, far = dist+190 (camera.js). So a layer at z = -90 is 46 % dissolved
 *      into the haze before it is drawn. Pushing the branded layers FAR BACK is what makes
 *      them quiet — much more reliable than picking a timid colour up close.
 *   3. NOTHING BACK HERE IS INKED. `userData.noInk = true` everywhere: a toon outline is a
 *      hard black edge, and a hard edge is exactly what makes a shape shout.
 *
 * ── THE IFM BACKDROP ─────────────────────────────────────────────────────────
 * Two devices, both deliberately near the noise floor:
 *   · THE PEAK. The central mountain's silhouette is the IFM roundel's figure — a body with
 *     two arms swept up and out, a small knob at each hand where the logo's rupee coins sit,
 *     and a rounded crown. `ifmPeakOutline()` is that curve, and it is mirrored so the
 *     silhouette is exactly symmetric the way the mark is.
 *   · THE ROUNDEL. `assets/mist-ifm.png` (the wordless tree-and-mother form) hung in the sky
 *     inside a thin ring, cradled between the peak's arms. No wordmark: a legible
 *     "INVESTING FOR MUMMIES" in the sky is a billboard, and a billboard is shouting. The
 *     wordmark already lives on the ammo's face and in the HUD.
 *
 * ── DRAW CALLS ───────────────────────────────────────────────────────────────
 * The environment this replaced was ~320 separate meshes — 62 grass clumps of 3-5 individual
 * blades, 9 clouds of 3-5 individual lobes, 8 two-part trees — which was most of the frame's
 * whole draw-call budget spent on scenery. Everything here is instanced or merged: grass is
 * two InstancedMeshes, clouds are one per depth layer, trees and hills are merged into one
 * geometry per band. That is what pays for the extra layers.
 *
 * ── RANDOMNESS ───────────────────────────────────────────────────────────────
 * A PRIVATE stream (`envRandom`), reseeded from the level seed on every build. rng.js's rule
 * is that anything whose result reaches a rigid body draws from the simulation stream and
 * nothing else may — scenery is pure pixels, so it gets its own state and cannot shift the
 * block jitter (or anything downstream of it) by existing.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { currentSeed } from '../rng.js';
import { world } from '../world.js';

// ---------------------------------------------------------------------------
// PRIVATE RNG — see the header. Same generator as rng.js, a different state.
// ---------------------------------------------------------------------------
let _e = 0;
function envReseed(n) { _e = ((n >>> 0) ^ 0x27d4eb2f) >>> 0; }
function eR() {
  _e = (_e + 0x6D2B79F5) >>> 0;
  let t = _e;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const eRange = (a, b) => a + (b - a) * eR();
const eJit = (m) => (eR() * 2 - 1) * m;

// ---------------------------------------------------------------------------
// PALETTE — every value here is low-saturation on purpose. The comment on each
// line is its HSV S, because S is the number the contrast rule is actually about.
// ---------------------------------------------------------------------------
const C = {
  // sky gradient, top -> horizon. Was 0x2f7fb8 (S 0.75!) at the top, which on a portrait
  // phone is most of the screen, and was single-handedly most of the backdrop's colour.
  sky0: '#4e7186',   // S 0.42  IFM navy pulled toward teal, then greyed
  sky1: '#7aa0b0',   // S 0.30
  sky2: '#a9c5c8',   // S 0.16
  sky3: '#cdd8d1',   // S 0.06
  sky4: '#e2dccd',   // S 0.10  warm haze at the horizon

  fog:  0xb4c9c9,    // sits on the sky ramp around 62 %H, where the fogged layers live

  peakFar:  0x7d97a6, // the IFM range     S 0.24
  peakMid:  0x6f8d9c, // second range      S 0.29
  hillA:    0x6b8b91, // teal-grey         S 0.26
  hillB:    0x5f8a7c, // teal-green        S 0.30
  /**
   * hillC is the band that sits DIRECTLY BEHIND the tower and directly behind the shot's
   * arc as it comes down. It was 0x5f9e63 — lum 141, bright and saturated — which is why
   * the eye kept landing there. Round 2 took it to lum 122, which turned out to be almost
   * exactly the IFM medallion's own luminance (131): the ammo crossing it went nearly
   * invisible for the length of the band. 0x55785a is lum 110, i.e. clear of the ammo in
   * the other direction, and S 0.29.
   */
  hillC:    0x55785a,

  treeFar:  0x53757a, treeFarCrown: 0x5a8375,
  treeMid:  0x4a6b52, treeMidCrown: 0x568a5b,

  cloudFar: 0xc9dade, cloudMid: 0xdfe9e6, cloudNear: 0xeef2ea,  // never pure white

  grassFar: 0x6a9b52, grassMid: 0x4f8b3c, grassNear: 0x2e5c2c, grassDeep: 0x21472a,

  ifm:      0x2a9d8f, // the brand teal — used ONLY at low opacity, far back
  ink:      0x1a3a5c,
};

/**
 * ── PER-LEVEL SETTINGS: EACH SCAM IN THE PLACE IT ACTUALLY HAPPENS ───────────────────────
 *
 * Every level used to draw the same meadow, so three different scams were taught against one
 * indistinguishable backdrop and the level you were on was something you read in the HUD
 * rather than something you could see. A level's `setting` key picks a row here.
 *
 * WHAT A SETTING IS ALLOWED TO CHANGE, and what it is not. It may change the sky ramp, the
 * fog, the three midground band colours, the SHAPE those bands are cut into, and whether
 * trees are drawn. It may NOT touch the IFM peak, the roundel, the grass or the play plane:
 * the brand backdrop and the ground the player reads distance against stay constant, so the
 * game still looks like one game across three places.
 *
 * Every palette here obeys the contrast doctrine at the top of this file — low saturation,
 * pulled toward IFM teal/navy, and quiet enough that the tower keeps the eye. A setting that
 * is more interesting than the thing you are aiming at has failed, however handsome it is.
 */
const SETTINGS = {
  /** The original meadow. Kept as the default so any level without a `setting` is unchanged. */
  meadow: {
    sky: [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4], fog: C.fog, shape: 'hill', trees: true,
    bands: [C.hillA, C.hillB, C.hillC], ranges: [C.peakFar, C.peakMid],
    grass: [C.grassFar, C.grassMid, C.grassNear, C.grassDeep], ground: null, hoardings: [],
    queue: null, motif: null, paper: null,
  },

  /**
   * BAZAAR — the roadside stall. Where a prize you never entered is handed to you on a
   * printed cheque. Dusty and warm; the silhouettes are shuttered shopfronts with hand-painted
   * hoardings standing proud of the parapet, which is the shape that says "market street" at
   * the 20 px these bands are actually read at.
   */
  bazaar: {
    sky: ['#6f7f80', '#93a099', '#bfc3ae', '#dcd6bd', '#e8dcc2'], fog: 0xc9c7ae,
    shape: 'shop', trees: true,
    bands: [0x7d8479, 0x6f7a67, 0x5d6b52], ranges: [0x8b9088, 0x7c8579],
    // dry roadside scrub, not lawn
    grass: [0x8e9463, 0x76803f, 0x545c2c, 0x3d4423], ground: [0xb4b163, 0x6e7a35],
    hoardings: [
      { x: 3.2, y: 12.6, w: 7.4, h: 2.6, z: -52, lines: ['YOU HAVE WON', '\u20b950,00,000'] },
      { x: 19.5, y: 10.4, w: 5.8, h: 2.1, z: -52, lines: ['CLAIM YOUR PRIZE'] },
    ],
    queue: { x: -3.0, y: -1.7, n: 7 }, motif: 'board', paper: 'ticket',
  },

  /**
   * CITY — the glass financial district. Where the card statement comes from. Coolest and
   * greyest of the three, with setback office towers and NO trees: a bare skyline is most of
   * what separates this from the meadow at a glance.
   */
  city: {
    sky: ['#44566b', '#6b8298', '#9ab0bd', '#c2ccce', '#d8dcd6'], fog: 0xb9c6cc,
    shape: 'tower', trees: false,
    bands: [0x68798c, 0x5c6e80, 0x4e6070], ranges: [0x76899c, 0x6a7d90],
    // a municipal verge between the pavement and the glass
    grass: [0x6c8474, 0x527058, 0x35513c, 0x28402f], ground: [0x7fae86, 0x3d6b47],
    hoardings: [
      { x: 3.0, y: 12.8, w: 7.6, h: 2.7, z: -52, lines: ['PRE-APPROVED', '0% EMI'] },
      { x: 17.0, y: 12.2, w: 5.6, h: 2.0, z: -52, lines: ['MIN DUE \u20b9700'] },
    ],
    queue: { x: -3.2, y: -1.7, n: 8 }, motif: 'tower', paper: 'statement',
  },

  /**
   * COLONY — dense low-rise housing, water tanks and stair heads on every roof. Where the
   * 12 %-a-month man is someone's neighbour, which is the whole reason the scheme spreads.
   * Warmest of the three: late-afternoon, the hour people actually knock on doors.
   */
  colony: {
    sky: ['#6a6f7e', '#928f96', '#bda9a2', '#d8c1ac', '#e6d2b4'], fog: 0xc8b9a9,
    shape: 'lowrise', trees: true,
    bands: [0x7b7a7d, 0x6e6a6b, 0x5e5a5c], ranges: [0x8a868c, 0x7b777d],
    // trodden ground between the houses
    grass: [0x8a8a5e, 0x707a45, 0x4e5630, 0x3a4026], ground: [0xaeae6a, 0x66703a],
    hoardings: [
      { x: 2.4, y: 13.0, w: 7.8, h: 2.7, z: -52, lines: ['12% EVERY MONTH', 'GUARANTEED'] },
      { x: 19.6, y: 10.0, w: 5.6, h: 2.0, z: -52, lines: ['BRING SIX FRIENDS'] },
    ],
    queue: { x: -3.0, y: -1.7, n: 9 }, motif: 'pyramid', paper: 'flyer',
  },
};

for (const [k, v] of Object.entries(SETTINGS)) v.key = k;

/**
 * The ground cap's [light, dark] for the active setting, or null to keep the meadow's.
 * `level/loader.js` asks for this when it builds the ground: the flat band the level stands
 * on is the bottom sixth of every frame and has to move with the rest of the setting.
 */
export function settingGround() { return activeSetting().ground ?? null; }

/** The active setting, from the level. Unknown or missing names fall back to the meadow. */
function activeSetting() {
  const key = world.level?.setting;
  return SETTINGS[key] ?? SETTINGS.meadow;
}

// ---------------------------------------------------------------------------
// SHARED ASSETS
// ---------------------------------------------------------------------------
let _skyTex = {};   // setting key -> gradient texture
let _mistTex = null;
let _hazeTex = null;
let _ringTex = null;
const _paperTex = {};   // kind -> texture

/**
 * The sky gradient. Rebuilt only once per page: `scene.background` is reassigned on every
 * level build, so making a fresh CanvasTexture each time would leak one per level.
 */
export function skyTexture(S = activeSetting()) {
  /**
   * ONE TEXTURE PER SETTING, CACHED AND NEVER DISPOSED. `scene.background` is reassigned on
   * every level build, so building a fresh gradient each time would leak one texture per
   * level loaded — the exact bug the single global cache was written to prevent. Keying the
   * cache by setting keeps that guarantee while letting three levels have three skies: at
   * most one texture per row of SETTINGS, for the life of the page.
   */
  const key = S.key ?? 'meadow';
  if (_skyTex[key]) return _skyTex[key];
  const stops = S.sky ?? SETTINGS.meadow.sky;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  [0.00, 0.24, 0.58, 0.82, 1.00].forEach((at, i) => grad.addColorStop(at, stops[i]));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  _skyTex[key] = t;
  return t;
}

/**
 * assets/mist-ifm.png — the soft, wordless IFM tree-and-mother form. Used twice: as the sky
 * roundel's interior, and (stretched hard, flipped, at a whisper) as the drifting mist that
 * sits between the layers.
 *
 * Loaded once, lazily, and NEVER awaited. HOOKS.md forbids gating readiness on a fetch that
 * can hang, and the backdrop is the least critical thing in the game: if it never arrives the
 * mist planes simply stay invisible and everything else is unaffected.
 */
function mistTexture() {
  if (_mistTex) return _mistTex;
  const url = new URL('../../assets/mist-ifm.png', import.meta.url).href;
  _mistTex = new THREE.TextureLoader().load(
    url,
    (t) => { t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; },
    undefined,
    () => console.warn(`[env] mist-ifm.png did not load (${url}) — the backdrop keeps its ` +
                       `mountains and haze, and loses only the soft IFM presence.`),
  );
  _mistTex.colorSpace = THREE.SRGBColorSpace;
  return _mistTex;
}

/** A vertical alpha ramp: opaque at the bottom, gone by the top. The haze that eats the
 *  base of every distant band, which is what makes a flat cut-out read as far away. */
function hazeTexture() {
  if (_hazeTex) return _hazeTex;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.26, 'rgba(255,255,255,0.86)');
  grad.addColorStop(0.58, 'rgba(255,255,255,0.42)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  _hazeTex = t;
  return t;
}

/**
 * The roundel's ring — the two arc brackets of the IFM mark, drawn as a soft-edged annulus.
 * Deliberately a RING and not a filled disc: a filled disc in the sky is a second sun.
 */
function ringTexture() {
  if (_ringTex) return _ringTex;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  const cx = S / 2, cy = S / 2, r = S * 0.435;
  // Two arcs with gaps at the top and bottom, exactly like the mark's brackets.
  g.lineWidth = S * 0.030;
  for (const [a0, a1] of [[0.60, 2.54], [3.74, 5.68]]) {
    g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
  }
  // A hairline full circle inside it, so the eye still closes the shape at a glance.
  g.lineWidth = S * 0.010;
  g.globalAlpha = 0.55;
  g.beginPath(); g.arc(cx, cy, r * 0.90, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  _ringTex = t;
  return t;
}

// ---------------------------------------------------------------------------
// FOG — colour only. camera.js re-solves near/far every frame from the rig distance,
// so this must never set them or it fights the camera.
// ---------------------------------------------------------------------------
export function makeFog(color = C.fog) {
  return new THREE.Fog(color, 86, 235);
}

// ---------------------------------------------------------------------------
// THE IFM PEAK
// ---------------------------------------------------------------------------
/**
 * Half of the IFM roundel's figure as a mountain ridge, in normalised units: x in [-1, 0],
 * y in [0, 1]. Mirrored by the caller, so the silhouette is exactly symmetric — the mark is,
 * and an asymmetric echo of a symmetric mark just reads as a lumpy hill.
 *
 * Reading it from the foot inwards: a long shallow apron, the ridge steepening into the
 * raised ARM, a small ROUNDED knob at the HAND (the logo's rupee coin), back down the inside
 * of the arm into the shoulder, then the broad domed CROWN.
 *
 * THE PROPORTIONS ARE THE WHOLE READ, and round 1 got them wrong. With the hands at 0.82 of
 * the height and the crown a near-point at 1.00, the silhouette came out as two sharp spikes
 * beside a lump — a jagged twin peak, which is not what the mark looks like. The hands are
 * now at 0.73 and the crown is a dome 0.66 of the peak's width, so the shape reads the way
 * the logo does: a wide canopy with two arms raised beside it.
 */
const IFM_HALF = [
  [-1.000, 0.000], [-0.910, 0.070], [-0.820, 0.128], [-0.744, 0.202],  // apron
  [-0.684, 0.300], [-0.644, 0.412], [-0.614, 0.522], [-0.598, 0.612],
  [-0.589, 0.666],                                                      // wrist
  [-0.578, 0.700], [-0.560, 0.722], [-0.537, 0.726],                    // the hand's coin,
  [-0.517, 0.712], [-0.505, 0.686], [-0.499, 0.654],                    // rounded, not spiked
  [-0.477, 0.560], [-0.445, 0.470], [-0.408, 0.408],                    // inside of the arm
  [-0.362, 0.372],                                                      // armpit
  [-0.330, 0.400], [-0.300, 0.472], [-0.266, 0.576], [-0.228, 0.684],   // the crown, a broad
  [-0.186, 0.782], [-0.140, 0.868], [-0.096, 0.934], [-0.056, 0.976],   // dome — this is the
  [-0.024, 0.996], [-0.004, 1.000],                                     // roundel's canopy
];

/** A closed THREE.Shape for the IFM peak, W half-width, H height, sunk `foot` below y=0. */
function ifmPeakShape(W, H, foot = 26) {
  const s = new THREE.Shape();
  s.moveTo(-W, -foot);
  s.lineTo(-W, 0);
  for (const [x, y] of IFM_HALF) s.lineTo(x * W, y * H);
  for (let i = IFM_HALF.length - 1; i >= 0; i--) {
    const [x, y] = IFM_HALF[i];
    s.lineTo(-x * W, y * H);
  }
  s.lineTo(W, 0);
  s.lineTo(W, -foot);
  s.closePath();
  return s;
}

/** An ordinary peak: a rounded, slightly asymmetric hump. Fills the range either side. */
function plainPeakShape(W, H, skew, foot = 26) {
  const s = new THREE.Shape();
  s.moveTo(-W, -foot);
  s.lineTo(-W, 0);
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;                       // 0..1 across the peak
    const x = -W + 2 * W * t;
    // a cosine hump, biased by `skew` so no two peaks are the same shape
    const b = 0.5 + skew * 0.5;
    const u = t < b ? (t / b) * 0.5 : 0.5 + (t - b) / (1 - b) * 0.5;
    const y = H * Math.pow(Math.sin(Math.PI * u), 1.35);
    s.lineTo(x, y);
  }
  s.lineTo(W, -foot);
  s.closePath();
  return s;
}

/**
 * A BUILT silhouette, for the settings whose midground is a street rather than a hillside.
 * Same contract as `plainPeakShape`: half-width W, height H, a `skew` in roughly [-0.5, 0.5]
 * that keeps neighbours from being identical, and a foot that sinks the shape below the band.
 *
 * The kind is carried entirely in the ROOFLINE, because at the 15-25 px these bands occupy
 * that is the only part of a building anyone can actually resolve — walls are a flat fill at
 * this size whatever you do to them, and the doctrine forbids windows or ink that would draw
 * the eye. So: a setback crown says office tower, a hoarding standing proud of the parapet
 * says shopfront, a tank-and-stairhead box says low-rise housing.
 */
function builtShape(W, H, skew, foot = 26, kind = 'tower') {
  const s = new THREE.Shape();
  s.moveTo(-W, -foot);
  s.lineTo(-W, H);
  if (kind === 'tower') {
    const sw = W * (0.50 + 0.18 * Math.abs(skew));     // the setback's half-width
    const sh = H * (1.08 + 0.10 * skew);               // and how far its crown stands proud
    s.lineTo(-sw, H); s.lineTo(-sw, sh); s.lineTo(sw, sh); s.lineTo(sw, H);
  } else if (kind === 'shop') {
    const hw = W * 0.40, hh = H * (0.16 + 0.08 * Math.abs(skew));
    const hx = W * skew * 0.35;                        // the hoarding sits off-centre
    s.lineTo(hx - hw, H); s.lineTo(hx - hw, H + hh);
    s.lineTo(hx + hw, H + hh); s.lineTo(hx + hw, H);
  } else {                                             // 'lowrise'
    const bx = W * (0.18 + 0.34 * skew), bw = W * 0.24, bh = H * (0.18 + 0.06 * skew);
    s.lineTo(bx - bw, H); s.lineTo(bx - bw, H + bh);
    s.lineTo(bx + bw, H + bh); s.lineTo(bx + bw, H);
  }
  s.lineTo(W, H);
  s.lineTo(W, -foot);
  s.closePath();
  return s;
}

/**
 * ── THE SCAM'S OWN ADVERTISING ───────────────────────────────────────────────
 * A hoarding in the midground, carrying the pitch the level is about: "YOU HAVE WON
 * ₹50,00,000" behind l1, "PRE-APPROVED · 0% EMI" behind l2, "12% EVERY MONTH GUARANTEED"
 * behind l3. The settings already said WHERE you are; this is what says WHAT is being sold
 * to you, which is the thing a player asked for — the background showing the scam.
 *
 * IT IS DELIBERATELY ALMOST UNREADABLE, and that is the hard part of this piece rather than
 * an admission of failure. Everything in this file obeys one rule: the tower keeps the eye.
 * A billboard is a shape whose entire purpose in the real world is to STEAL attention, so
 * dropped in at honest contrast it would beat the structure instantly and break the
 * hierarchy the whole backdrop is built to protect. So:
 *   · it sits on the -36 band, i.e. behind the buildings and ~32 % dissolved into fog;
 *   · the board is barely lighter than the band it stands on (a value step, not a colour);
 *   · the type is lighter again but still well under the structure's contrast, so it reads
 *     as "there is writing on that hoarding" from the play frame and only resolves into
 *     words if a student actually looks at it. That is the correct amount of legible: the
 *     scam is named by the villain and the level title, not by the scenery.
 */
function boardTexture(lines, board, ink) {
  const W = 512, H = Math.round(512 * 0.34);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = board; g.fillRect(0, 0, W, H);
  // a hairline border: what makes a rectangle read as a hoarding rather than as a wall
  g.strokeStyle = ink; g.globalAlpha = 0.30; g.lineWidth = Math.max(2, H * 0.035);
  g.strokeRect(g.lineWidth, g.lineWidth, W - g.lineWidth * 2, H - g.lineWidth * 2);
  g.globalAlpha = 1;
  g.fillStyle = ink;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((t, i) => {
    const size = Math.round(H * (n > 1 ? 0.30 : 0.42));
    g.font = `bold ${size}px "Arial Black", Arial, sans-serif`;
    // squeeze to fit rather than overflow: these strings are authored per level and vary
    let w = g.measureText(t).width, scale = Math.min(1, (W * 0.86) / w);
    g.save();
    g.translate(W / 2, H * (n > 1 ? (0.34 + i * 0.34) : 0.5));
    g.scale(scale, 1);
    g.fillText(t, 0, 0);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return own(tex);
}

function buildHoardings(g, S) {
  const list = S.hoardings ?? [];
  if (!list.length) return;
  // Board and type are BOTH derived from the band the hoarding stands on, so a setting can
  // never accidentally author a billboard brighter than its own scenery.
  const band = new THREE.Color(S.bands[1]);
  const board = band.clone().lerp(new THREE.Color(0xffffff), 0.10).getStyle();
  const ink = band.clone().lerp(new THREE.Color(0xffffff), 0.30).getStyle();

  for (const b of list) {
    const post = own(new THREE.PlaneGeometry(b.w * 0.055, b.h * 0.85));
    addFlat(g, post, flat(S.bands[1]), b.x, b.y - b.h * 0.62, b.z + 0.4);
    addFlat(g, own(new THREE.PlaneGeometry(b.w, b.h)),
      flat(0xffffff, { map: boardTexture(b.lines, board, ink), transparent: false }),
      b.x, b.y, b.z + 0.5);
  }
}

/**
 * ── THE QUEUE: OTHER PEOPLE ARE FALLING FOR THIS RIGHT NOW ───────────────────
 * A line of small figures shuffling toward a counter, on the nearest midground band. It is
 * the one piece of scenery in this game that carries an idea rather than a place: the hoarding
 * says what is being sold, the buildings say where you are, and the queue says YOU ARE NOT THE
 * ONLY ONE. For a game teaching students to spot a scam, that is the most useful thing the
 * background can tell them — these things work because the queue is real.
 *
 * Drawn as ONE merged silhouette in the band's own colour, a shade darker. No faces, no
 * detail, no ink: at this distance a figure is a head and a shoulder line, and anything more
 * would pull the eye off the tower. They are deliberately all slightly different heights,
 * because a row of identical ones reads as a fence.
 */
function figureShape(h, w) {
  const s = new THREE.Shape();
  const hw = w / 2, headR = w * 0.40, neck = h - headR * 2.1;
  s.moveTo(-hw, 0);
  s.lineTo(-hw * 0.82, neck * 0.92);          // shoulders taper in
  s.quadraticCurveTo(-hw * 0.55, neck, -headR * 0.72, neck + headR * 0.25);
  s.absarc(0, neck + headR * 1.05, headR, Math.PI * 0.92, Math.PI * 0.08, true);
  s.quadraticCurveTo(hw * 0.55, neck, hw * 0.82, neck * 0.92);
  s.lineTo(hw, 0);
  s.closePath();
  return s;
}

function buildQueue(g, S) {
  if (!S.queue) return;
  const band = new THREE.Color(S.bands[2]);
  const col = band.clone().lerp(new THREE.Color(0x000000), 0.22);
  const geos = [];
  let x = S.queue.x;
  for (let i = 0; i < S.queue.n; i++) {
    const h = eRange(1.5, 2.1), w = h * eRange(0.36, 0.46);
    const geo = new THREE.ShapeGeometry(figureShape(h, w), 8);
    geo.translate(x, 0, 0);
    geos.push(geo);
    x += w * eRange(1.25, 2.10);              // an uneven queue, not a picket fence
  }
  // the counter they are queuing at: a low slab with a booth above it
  const slab = new THREE.PlaneGeometry(3.2, 0.9); slab.translate(x + 1.4, 0.45, 0);
  const booth = new THREE.PlaneGeometry(2.2, 2.4); booth.translate(x + 1.4, 2.0, 0);
  geos.push(slab, booth);
  const merged = own(mergeGeometries(geos, false));
  for (const q of geos) q.dispose();
  addFlat(g, merged, flat(col.getHex()), 0, S.queue.y, -21.5);
}

/**
 * ── THE SCAM, REPEATED TO THE HORIZON ────────────────────────────────────────
 * The level's own structure echoed into the far band, smaller and smaller. A Ponzi with one
 * pyramid in it is one crook; a horizon full of pyramids is an industry, which is the truer
 * and more useful thing for a student to come away with. Far back (-74) and low contrast, so
 * it reads as a pattern in the haze rather than as a second level to aim at.
 */
function motifShape(kind, w, h) {
  const s = new THREE.Shape();
  if (kind === 'pyramid') {
    s.moveTo(-w, 0); s.lineTo(0, h); s.lineTo(w, 0); s.closePath();
  } else if (kind === 'tower') {
    s.moveTo(-w, 0); s.lineTo(-w, h); s.lineTo(-w * 0.45, h);
    s.lineTo(-w * 0.45, h * 1.14); s.lineTo(w * 0.45, h * 1.14);
    s.lineTo(w * 0.45, h); s.lineTo(w, h); s.lineTo(w, 0); s.closePath();
  } else {                                    // 'board' — a hoarding on two legs
    s.moveTo(-w * 0.12, 0); s.lineTo(-w * 0.12, h * 0.55); s.lineTo(-w, h * 0.55);
    s.lineTo(-w, h); s.lineTo(w, h); s.lineTo(w, h * 0.55);
    s.lineTo(w * 0.12, h * 0.55); s.lineTo(w * 0.12, 0); s.closePath();
  }
  return s;
}

function buildMotifs(g, S) {
  if (!S.motif) return;
  const col = new THREE.Color(S.bands[0]).lerp(new THREE.Color(0x000000), 0.16);
  const geos = [];
  let x = -14;
  for (let i = 0; i < 10; i++) {
    const h = eRange(8.0, 15.0), w = h * eRange(0.50, 0.78);
    const geo = new THREE.ShapeGeometry(motifShape(S.motif, w, h), 10);
    geo.translate(x + w, 0, 0);
    geos.push(geo);
    x += w * eRange(1.15, 1.75);
  }
  const merged = own(mergeGeometries(geos, false));
  for (const q of geos) q.dispose();
  addFlat(g, merged, flat(col.getHex()), 0, -3.2, -44.0);
}

/**
 * ── PAPER ON THE WIND ────────────────────────────────────────────────────────
 * Statements, notices and unread small print blowing across the midground. Registered on the
 * same `drift` list the mist uses, so it wraps and costs nothing per frame beyond a position
 * add. Cream, low opacity, and small — it is meant to be noticed the third time you play, not
 * the first.
 */
function paperTexture(kind = 'statement') {
  if (_paperTex[kind]) return _paperTex[kind];
  /**
   * THE PAPER IS THE SCAM'S PAPER. Generic ruled sheets said "there is litter in the air";
   * these say which scam you are standing in. Still tiny and still mostly dissolved into the
   * haze — you are meant to notice on the third play, not the first — but a student who does
   * look sees a lottery ticket, a card statement or a chain-letter flyer rather than nothing.
   */
  const c = document.createElement('canvas');
  c.width = 64; c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#efe8d8'; g.fillRect(0, 0, 64, 44);
  const ink = 'rgba(60,70,80,0.34)';
  if (kind === 'ticket') {
    // a prize ticket: a torn stub down one side and a big number box
    g.fillStyle = 'rgba(231,111,81,0.30)'; g.fillRect(0, 0, 14, 44);
    g.strokeStyle = ink; g.lineWidth = 2; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(15, 2); g.lineTo(15, 42); g.stroke(); g.setLineDash([]);
    g.fillStyle = ink; g.fillRect(22, 12, 34, 8);
    g.fillRect(22, 26, 22, 5);
  } else if (kind === 'flyer') {
    // a chain-letter flyer: a little pyramid and two lines under it
    g.fillStyle = ink;
    g.beginPath(); g.moveTo(32, 8); g.lineTo(46, 26); g.lineTo(18, 26); g.closePath(); g.fill();
    g.fillRect(14, 32, 36, 4); g.fillRect(14, 38, 24, 3);
  } else {
    // a statement: a header band and ruled rows, one of them short (the balance line)
    g.fillStyle = 'rgba(26,58,92,0.32)'; g.fillRect(0, 0, 64, 9);
    g.strokeStyle = ink; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(8, 16 + i * 7); g.lineTo(56 - (i % 2) * 18, 16 + i * 7); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  _paperTex[kind] = t;
  return t;
}

function buildPaper(g, S) {
  if (!S.paper) return;   // a setting names WHICH paper: 'ticket' | 'statement' | 'flyer'
  const tex = paperTexture(S.paper);
  for (let i = 0; i < 7; i++) {
    const sc = eRange(0.55, 1.15);
    const z = eRange(-30, -14);
    const m = addFlat(g, own(new THREE.PlaneGeometry(1.5 * sc, 1.0 * sc)),
      flat(0xffffff, { map: tex, transparent: true, opacity: eRange(0.30, 0.55), depthWrite: false }),
      eRange(-60, 90), eRange(3.5, 14.0), z);
    m.rotation.z = eRange(-0.6, 0.6);
    drift.push({ obj: m, speed: 0.5 + (z + 30) / 16 * 0.9, wrapAt: 100, wrapTo: -70 });
  }
}

// ---------------------------------------------------------------------------
// BUILD
// ---------------------------------------------------------------------------
const disposables = [];
function own(x) { disposables.push(x); return x; }

/** A flat, unlit, un-inked backdrop material. Fog IS applied — that is the whole point. */
function flat(color, extra = {}) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: true, ...extra });
  return own(m);
}

function addFlat(group, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.userData.noInk = true;
  m.frustumCulled = false;      // these are enormous and always on screen; culling them costs
  group.add(m);                 // a bounding-sphere test for nothing
  return m;
}

/**
 * Build every backdrop layer and return the group. The caller owns registering it as an
 * entity and clearing `world.environment`.
 *
 * Also (re)assigns `scene.background` and `scene.fog.color`, so main.js needs no changes and
 * cannot drift out of step with the palette here.
 */
export function buildEnvironment(scene) {
  // The previous build's group has already been removed from the scene by the level teardown,
  // so this is the moment its GPU resources become garbage. Three levels of play used to
  // leave three environments' worth of buffers alive.
  disposeEnvironment();
  envReseed(currentSeed());
  const g = new THREE.Group();
  g.name = 'environment';

  const S = activeSetting();

  scene.background = skyTexture(S);
  if (scene.fog) scene.fog.color.setHex(S.fog);
  else scene.fog = makeFog(S.fog);

  buildRanges(g, S);
  buildHills(g, S);
  buildHoardings(g, S);
  buildMotifs(g, S);
  buildQueue(g, S);
  buildPaper(g, S);
  buildIfmRoundel(g);
  buildMist(g);
  // A bare skyline is most of what tells the city apart from the meadow at a glance, so the
  // setting is allowed to withhold the trees entirely.
  if (S.trees !== false) buildTrees(g);
  buildClouds(g);
  buildGrass(g, S);

  scene.add(g);
  return g;
}

/**
 * The two mountain ranges. The far one carries the IFM peak.
 *
 * Both live a long way back (z -92 and -74) for one reason: at the rig's ~110-unit working
 * distance that is 42 % and 32 % fog respectively, so they arrive on screen already half
 * dissolved. Depth, not timidity, is what keeps them quiet — and it is the depth that makes
 * them parallax properly against the hills when the camera tracks a shot.
 */
function buildRanges(g, S = SETTINGS.meadow) {
  const ranges = [
    {
      z: -92, y: -3.0, color: S.ranges[0], ifm: true,
      // half-width, height, centre x
      peaks: [
        { w: 15, h: 14.0, x: -36, skew: -0.32 },
        { w: 12, h: 10.5, x: -14, skew: 0.28 },
        { w: 27, h: 30.0, x: 15, ifm: true },
        { w: 13, h: 12.0, x: 49, skew: -0.22 },
        { w: 17, h: 15.0, x: 72, skew: 0.30 },
      ],
      haze: { y: 12.0, h: 30 },
    },
    {
      z: -74, y: -3.4, color: S.ranges[1], ifm: false,
      /**
       * NOTE THE HOLE IN THE MIDDLE. The second range deliberately drops to a low shoulder
       * between x 4 and x 36: in round 1 a 14-unit peak sat exactly in front of the IFM
       * crown and cut the silhouette in half. A branded shape that another layer bisects is
       * not a quiet brand, it is an unreadable one.
       */
      peaks: [
        { w: 15, h: 13.0, x: -30, skew: 0.30 },
        { w: 11, h: 9.5, x: -6, skew: -0.26 },
        { w: 19, h: 6.5, x: 19, skew: 0.18 },
        { w: 12, h: 11.5, x: 46, skew: -0.30 },
        { w: 15, h: 13.5, x: 66, skew: 0.22 },
      ],
      haze: { y: 8.0, h: 22 },
    },
  ];

  for (const r of ranges) {
    const geos = [];
    for (const p of r.peaks) {
      const shape = p.ifm
        ? ifmPeakShape(p.w, p.h)
        : plainPeakShape(p.w, p.h, p.skew);
      const geo = new THREE.ShapeGeometry(shape, 24);
      geo.translate(p.x, 0, 0);
      geos.push(geo);
    }
    const merged = own(mergeGeometries(geos, false));
    for (const q of geos) q.dispose();
    addFlat(g, merged, flat(r.color), 0, r.y, r.z);

    // The haze that eats the range's feet. Without it the bottom of a flat cut-out is a
    // dead straight line across the whole screen and the illusion dies instantly.
    addFlat(g, own(new THREE.PlaneGeometry(320, r.haze.h)),
      flat(C.fog, { map: hazeTexture(), transparent: true, opacity: 0.92, depthWrite: false }),
      14, r.y + r.haze.y - r.haze.h / 2, r.z + 1.2);
  }
}

/**
 * Three hill bands marching toward the play plane, each one a single merged mesh, each with
 * its own haze veil in front of it.
 *
 * The third band is the one that sits directly behind the tower, and it is the one the old
 * build got wrong: a bright, saturated green (0x5f9e63) right underneath the thing the player
 * is supposed to be looking at. It is now a muted green under the heaviest haze veil of the
 * three, so the tower's silhouette meets a pale, quiet wash rather than a competing colour.
 */
function buildHills(g, S = SETTINGS.meadow) {
  /**
   * The three midground bands. A SETTING supplies their colours and the shape they are cut
   * into; everything else — the depths, the apron, the haze — is shared, because those are
   * what keep the bands quiet and every setting has to obey that equally.
   *
   * The built settings get NARROWER, TALLER pieces than the hills do: a hillside reads as one
   * long mass, a street reads as many separate frontages, and the count is what carries that.
   */
  const built = S.shape && S.shape !== 'hill';
  const bands = built ? [
    { z: -52, y: -3.2, color: S.bands[0], n: 13, w: [4.0, 9.0], h: [7, 14],  haze: 0.78, hh: 15 },
    { z: -36, y: -2.9, color: S.bands[1], n: 15, w: [3.4, 7.5], h: [5, 10],  haze: 0.62, hh: 11 },
    { z: -23, y: -2.4, color: S.bands[2], n: 17, w: [2.8, 6.0], h: [3.4, 7], haze: 0.48, hh: 8 },
  ] : [
    { z: -52, y: -3.2, color: S.bands[0], n: 7,  w: [13, 26], h: [7, 13],   haze: 0.78, hh: 15 },
    { z: -36, y: -2.9, color: S.bands[1], n: 8,  w: [11, 22], h: [5, 10],   haze: 0.62, hh: 11 },
    { z: -23, y: -2.4, color: S.bands[2], n: 10, w: [9, 18],  h: [3.4, 7.0], haze: 0.48, hh: 8 },
  ];

  for (const b of bands) {
    const geos = [];
    // a solid apron under the band: without it a sliver of the sky's warm horizon glow shows
    // between the ground's far edge and the band's flat bottom, as a bright line across the
    // whole screen that reads as a rendering bug, because it is one.
    const apron = new THREE.PlaneGeometry(340, 40);
    apron.translate(14, -20, 0);
    geos.push(apron);
    let x = -40;
    for (let i = 0; i < b.n; i++) {
      const w = eRange(b.w[0], b.w[1]);
      const h = eRange(b.h[0], b.h[1]);
      const geo = new THREE.ShapeGeometry(
        built ? builtShape(w, h, eJit(0.42), 30, S.shape)
              : plainPeakShape(w, h, eJit(0.42), 30), 20);
      geo.translate(x + w, 0, 0);
      geos.push(geo);
      x += w * (built ? eRange(1.02, 1.30) : eRange(1.05, 1.75));
    }
    const merged = own(mergeGeometries(geos, false));
    for (const q of geos) q.dispose();
    addFlat(g, merged, flat(b.color), 0, b.y, b.z);

    addFlat(g, own(new THREE.PlaneGeometry(340, b.hh)),
      flat(C.fog, { map: hazeTexture(), transparent: true, opacity: b.haze, depthWrite: false }),
      14, b.y + b.hh * 0.30 - b.hh / 2, b.z + 1.0);
  }
}

/**
 * THE IFM ROUNDEL IN THE SKY.
 *
 * A ring plus the mist form, hung between the peak's raised arms so the mountain appears to
 * hold it up — which is the mark's own composition (the mother's arms raised under the tree).
 *
 * Opacities are the whole design. They are low enough that the roundel is something you find
 * when you look for it and never something that arrives uninvited while you are aiming; the
 * z of -104 puts it at ~54 % fog on top of that, so even the ring's own value is more than
 * half sky by the time it is drawn.
 */
function buildIfmRoundel(g) {
  const Z = -104;
  const CX = 16, CY = 47, D = 40;

  // the mist form (tree + figure), tinted brand teal, sitting slightly DARKER than the sky
  addFlat(g, own(new THREE.PlaneGeometry(D * 0.80, D * 0.80)),
    flat(C.ifm, { map: mistTexture(), transparent: true, opacity: 0.27, depthWrite: false }),
    CX, CY, Z);

  // the ring
  addFlat(g, own(new THREE.PlaneGeometry(D, D)),
    flat(0xd9e6e2, { map: ringTexture(), transparent: true, opacity: 0.23, depthWrite: false }),
    CX, CY, Z + 0.5);

  /**
   * A hillside echo, laid flat against the mid hill band: the same form again, much smaller
   * and fainter, like a chalk figure cut into a far slope. The owner asked for the mark "in
   * the sky or on the hillside" — this is the hillside half, kept to a whisper so the two
   * together still read as one quiet backdrop rather than as two logos.
   */
  addFlat(g, own(new THREE.PlaneGeometry(17, 17)),
    flat(C.ifm, { map: mistTexture(), transparent: true, opacity: 0.16, depthWrite: false }),
    -8, 3.0, -34.6);
}

/**
 * Drifting mist between the layers — `assets/mist-ifm.png` stretched hard and flipped, which
 * turns the tree form into soft vertical streaks. That is the asset doing atmospheric work
 * rather than logo work, and it is what stops the gaps between bands reading as flat paper.
 */
function buildMist(g) {
  const tex = mistTexture();
  const bands = [
    { z: -84, y: 4.0, w: 90, h: 26, o: 0.16, n: 4 },
    { z: -62, y: 1.5, w: 74, h: 20, o: 0.15, n: 4 },
    { z: -44, y: 0.5, w: 62, h: 15, o: 0.13, n: 4 },
    { z: -28, y: 0.0, w: 52, h: 11, o: 0.11, n: 3 },
  ];
  drift.length = 0;
  for (const b of bands) {
    for (let i = 0; i < b.n; i++) {
      const geo = own(new THREE.PlaneGeometry(b.w * eRange(0.8, 1.35), b.h * eRange(0.7, 1.2)));
      const m = flat(0xdfeae6, {
        map: tex, transparent: true, opacity: b.o * eRange(0.75, 1.2),
        depthWrite: false,
      });
      const mesh = addFlat(g, geo, m,
        eRange(-60, 90), b.y + eJit(3.0), b.z + eJit(2.0));
      mesh.scale.y = eRange(0.5, 0.8);          // squash: haze lies along the horizon
      if (eR() < 0.5) mesh.scale.x *= -1;       // mirrored so the tree form never repeats
      drift.push({ obj: mesh, speed: 0.020 + (b.z + 96) / 96 * 0.055, wrapAt: 100, wrapTo: -70 });
    }
  }
}

/** Two tree bands, one merged mesh each, vertex-coloured so trunk and crown share a draw. */
function buildTrees(g) {
  const bands = [
    { z: -30, y: -0.6, n: 14, s: 1.15, trunk: C.treeFar, crown: C.treeFarCrown, x: [-40, 82] },
    { z: -17, y: -0.3, n: 11, s: 0.95, trunk: C.treeMid, crown: C.treeMidCrown, x: [-34, 74] },
  ];
  for (const b of bands) {
    const geos = [];
    const tc = new THREE.Color(b.trunk), cc = new THREE.Color(b.crown);
    for (let i = 0; i < b.n; i++) {
      const s = b.s * eRange(0.72, 1.30);
      const th = eRange(1.7, 3.0) * s;
      const trunk = new THREE.BoxGeometry(0.42 * s, th, 0.42 * s);
      trunk.translate(0, th / 2, 0);
      paint(trunk, tc);
      const cr = eRange(1.25, 2.15) * s;
      const crown = new THREE.SphereGeometry(cr, 9, 7);
      crown.scale(1, 0.86, 0.5);
      crown.translate(0, th + cr * 0.42, 0);
      paint(crown, cc);
      const x = eRange(b.x[0], b.x[1]), dz = eJit(3.0);
      for (const q of [trunk, crown]) q.translate(x, eJit(0.4), dz);
      geos.push(trunk, crown);
    }
    const merged = own(mergeGeometries(geos, false));
    for (const q of geos) q.dispose();
    addFlat(g, merged, flat(0xffffff, { vertexColors: true }), 0, b.y, b.z);
  }
}

function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

/**
 * Clouds — three depth layers, one InstancedMesh each, every lobe an instance.
 *
 * They were pure 0xfdfbf4 before, i.e. the brightest thing anywhere on screen including the
 * ammo. Graded now: the far layer is barely separable from the sky it sits on and only the
 * near layer approaches white, which keeps the backdrop's 95th-percentile luminance down —
 * the number that actually decides whether a "quiet" backdrop still flashes at you.
 */
const cloudLayers = [];
function buildClouds(g) {
  cloudLayers.length = 0;
  const geo = own(new THREE.SphereGeometry(1, 10, 7));
  const layers = [
    { z: [-88, -66], color: C.cloudFar, n: 7, y: [16, 46], s: [2.6, 4.6], o: 0.55, speed: 0.05 },
    { z: [-58, -38], color: C.cloudMid, n: 7, y: [12, 40], s: [2.0, 3.6], o: 0.72, speed: 0.11 },
    { z: [-32, -16], color: C.cloudNear, n: 5, y: [10, 30], s: [1.4, 2.4], o: 0.76, speed: 0.19 },
  ];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const pos = new THREE.Vector3(), scl = new THREE.Vector3();

  for (const L of layers) {
    const clouds = [];
    let lobeCount = 0;
    for (let i = 0; i < L.n; i++) {
      const lobes = 3 + Math.floor(eR() * 3);
      const c = { x: eRange(-58, 96), y: eRange(L.y[0], L.y[1]), z: eRange(L.z[0], L.z[1]),
                  speed: L.speed * eRange(0.7, 1.35), lobes: [] };
      for (let k = 0; k < lobes; k++) {
        const s = eRange(L.s[0], L.s[1]);
        c.lobes.push({
          dx: (k - (lobes - 1) / 2) * s * eRange(0.85, 1.25),
          dy: eJit(s * 0.28), dz: eJit(1.2),
          sx: s * 1.55, sy: s * 0.80, sz: s * 0.35,
        });
        lobeCount++;
      }
      clouds.push(c);
    }
    const mesh = new THREE.InstancedMesh(geo,
      flat(L.color, { transparent: true, opacity: L.o, depthWrite: false }), lobeCount);
    mesh.userData.noInk = true;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.add(mesh);
    // seed the matrices once so the very first rendered frame is already correct
    let n = 0;
    for (const c of clouds) {
      for (const l of c.lobes) {
        pos.set(c.x + l.dx, c.y + l.dy, c.z + l.dz);
        scl.set(l.sx, l.sy, l.sz);
        mesh.setMatrixAt(n++, m4.compose(pos, q, scl));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    cloudLayers.push({ mesh, clouds });
  }
}

/**
 * Grass, in two instanced bands.
 *
 * The near band is the one the brief asks for: it sits IN FRONT of the play plane (z ≈ +14)
 * and is authored dark (lum ~55-75) and low-sat, so it frames the bottom of the frame as a
 * silhouette rather than as content. Six taller clumps break the line — placed only in the x
 * windows that are empty in all three levels (behind and left of the sling, and in the gap
 * between the sling and the tower), because a foreground frond growing through the target is
 * an occlusion bug, not depth.
 */
function buildGrass(g, S = activeSetting()) {
  // The ground cover is a THIRD of a portrait frame, so leaving it the same bright meadow
  // green under all three settings was most of why the levels still read as one place.
  const G = S.grass ?? SETTINGS.meadow.grass;
  const blade = own(new THREE.ConeGeometry(0.13, 1, 4));
  blade.translate(0, 0.5, 0);           // pivot at the base, so scale.y grows upward
  /**
   * A WHITE per-vertex colour attribute, and `vertexColors: true` on the materials below.
   * This is not decoration and it is not optional: three's `color_fragment` chunk only
   * applies `vColor` when USE_COLOR is defined, and USE_COLOR comes from `vertexColors`,
   * NOT from the presence of an instanceColor buffer. Set instanceColor without it and the
   * per-blade tints are computed in the vertex shader and then thrown away; set
   * `vertexColors` without a colour attribute and the unbound attribute reads (0,0,0) and
   * every blade renders black.
   */
  paint(blade, new THREE.Color(0xffffff));

  const bands = [
    // far tufts, on the play plane's own ground
    { z: [3.4, 5.2], n: 170, y: [-0.10, 0.05], h: [0.45, 1.05], sp: [-26, 62],
      colors: [G[0], G[1]], w: 1.0 },
    // the near, dark, framing band
    { z: [11.0, 16.0], n: 150, y: [-6.4, -5.6], h: [3.4, 5.6], sp: [-14, 40],
      colors: [G[2], G[3]], w: 1.7 },
  ];

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const pos = new THREE.Vector3(), scl = new THREE.Vector3();
  const col = new THREE.Color();

  for (const b of bands) {
    const mesh = new THREE.InstancedMesh(blade,
      flat(0xffffff, { vertexColors: true }), b.n);
    mesh.userData.noInk = true;
    mesh.frustumCulled = false;
    for (let i = 0; i < b.n; i++) {
      const h = eRange(b.h[0], b.h[1]);
      pos.set(eRange(b.sp[0], b.sp[1]), eRange(b.y[0], b.y[1]), eRange(b.z[0], b.z[1]));
      scl.set(eRange(0.7, 1.25) * b.w, h, eRange(0.7, 1.25) * b.w);
      q.setFromAxisAngle(AXIS_Z, eJit(0.30));
      mesh.setMatrixAt(i, m4.compose(pos, q, scl));
      col.setHex(b.colors[eR() < 0.55 ? 0 : 1]).multiplyScalar(eRange(0.86, 1.10));
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    g.add(mesh);
  }

  // the taller foreground clumps — x windows chosen to miss the sling (x 0, drawn back to
  // -2.8) and every level's tower (x >= 11)
  const TALL_X = [-11.5, -7.4, 5.2, 7.8, 33.0, 38.5];
  const tall = new THREE.InstancedMesh(blade, flat(0xffffff, { vertexColors: true }),
                                       TALL_X.length * 4);
  tall.userData.noInk = true;
  tall.frustumCulled = false;
  let n = 0;
  for (const bx of TALL_X) {
    for (let k = 0; k < 4; k++) {
      const h = eRange(7.2, 10.4);
      pos.set(bx + eJit(1.5), eRange(-6.6, -5.9), eRange(12.5, 15.5));
      scl.set(eRange(1.5, 2.4), h, eRange(1.5, 2.4));
      q.setFromAxisAngle(AXIS_Z, eJit(0.34));
      tall.setMatrixAt(n, m4.compose(pos, q, scl));
      col.setHex(G[3]).multiplyScalar(eRange(0.82, 1.06));
      tall.setColorAt(n, col);
      n++;
    }
  }
  tall.count = n;
  tall.instanceMatrix.needsUpdate = true;
  if (tall.instanceColor) tall.instanceColor.needsUpdate = true;
  g.add(tall);
}

const AXIS_Z = new THREE.Vector3(0, 0, 1);

// ---------------------------------------------------------------------------
// UPDATE — everything drifts on SIM time, so a filmstrip replays it exactly.
// ---------------------------------------------------------------------------
const drift = [];
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function updateEnvironment(dt) {
  for (const layer of cloudLayers) {
    let n = 0;
    let moved = false;
    for (const c of layer.clouds) {
      c.x += c.speed * dt;
      if (c.x > 104) c.x = -72;
      moved = true;
      for (const l of c.lobes) {
        _p.set(c.x + l.dx, c.y + l.dy, c.z + l.dz);
        _s.set(l.sx, l.sy, l.sz);
        layer.mesh.setMatrixAt(n++, _m4.compose(_p, _q, _s));
      }
    }
    if (moved) layer.mesh.instanceMatrix.needsUpdate = true;
  }
  for (const d of drift) {
    d.obj.position.x += d.speed * dt;
    if (d.obj.position.x > d.wrapAt) d.obj.position.x = d.wrapTo;
  }
}

/** Drop every geometry/material this module owns. Called from the level teardown. */
export function disposeEnvironment() {
  for (const d of disposables) d.dispose?.();
  disposables.length = 0;
  cloudLayers.length = 0;
  drift.length = 0;
}
