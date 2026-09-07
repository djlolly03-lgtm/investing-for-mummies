/* dice3d.js — the die.
 *
 * The player taps this object sixty-plus times a game. It is the primary button
 * of the whole product (the HUD button in ui.js is the secondary one), so it is
 * built as a real object: a rounded ivory cube with inset teal pips, a contact
 * shadow, a press glow, a toss, and a landing.
 *
 * DESIGN.md §3.1 beat sheet · §6.4 rule 5 (NEVER a physics sim) · §7.2 materials ·
 * §9 #7–#11 motion · §10.4 the six.  CONTRACT.md: buildDice / rollDice / setDiceEnabled.
 *
 * The rule that governs everything below: 'rollDice(v)' lands showing exactly 'v',
 * every time, on every device, and it never snaps to get there. The tumble is a
 * baked curve whose extra spin is an integer number of turns about a random axis,
 * so it is the identity at t=1; the underlying slerp lands on the exact face
 * quaternion with zero angular velocity. Deterministic, identical everywhere,
 * cannot land cocked, cannot disagree with rules.js.
 */

import * as THREE from '../vendor/three.module.js';
import * as SCENE from './scene.js';
import { colors, css, timing, materials, quality, board as BOARD, layout } from './config.js';
/* Namespace copy of the same module, so 'config.dice' — the tunable block the
   config owner is adding — is read if it exists and is simply 'undefined' if it
   does not. A named 'import { dice }' would be a hard SyntaxError until that
   block lands, taking the whole game down with it. */
import * as CONFIG from './config.js';
const DICE_CFG = CONFIG.dice || null;
import { ease, clamp, lerp, makeRng, prefersReducedMotion, injectCss } from './util.js';

/* fx.js and audio.js are optional at load: the die must still work if they are
   not there yet. Non-blocking so we never delay the module graph. */
let FX = null, AUD = null;
import('./fx.js').then(m => { FX = m; }).catch(() => {});
import('./audio.js').then(m => { AUD = m; }).catch(() => {});

/* ═════════════════════════════════════════════════════════════════════════
   Tunables.
   These belong in config.js. Defaults live here; 'config.dice' overrides them
   the moment that block exists, and 'globalThis.CFG.dice' overrides both at
   runtime (probes and the debug console).
   ═════════════════════════════════════════════════════════════════════════ */
const D = Object.assign({
  size:        1.60,   // world units. ~64 CSS px on a 390px phone at the fitted camera.
  bevel:       0.13,   // × size. A real bevel — a hard-edged cube looks cheap.
  hitRadius:   0.86,   // × size. Hit sphere ⇒ ~100 CSS px target (layout.diceHit is 88).
  roughness:   0.46,   // "warm ivory, soft gloss". config.materials.dice says 0.70 (wood).
  x:           0.45,   // × (board half + frame). Right of centre, §7.5.
  zGap:        1.95,   // × size, beyond the board frame. Clears the frame entirely and
                       // stands in the empty tray band — it must never overlap a numeral
                       // (§6.4 rule 2). At 0.78 it sat on squares 8–9.
  tossHeight:  0.72,   // × size
  tossDrift:  [-0.14, -0.07], // × size, x/z — the die tosses toward the board and back
  idlePulse:   0.06,   // §9 #7  1.00 → 1.06 → 1.00
  pressScale:  0.92,   // §9 #8
  pipPop:      0.15,   // §9 #11 1.00 → 1.15 → 1.00
  holdAfter:   220,    // ms before a held press starts to shake
  holdShake:   0.016,  // × size, peak jitter of the hold shake
  shadowAlpha: 0.26,
  reducedMs:   250,    // brief: reduced motion is a 250ms cross-fade, no tumble
  baseYaw:     8,      // degrees. Just enough to read as hand-placed. Squared up, because
  yawJitter:   4,      // ± degrees.  a yawed cube hides the up-face behind two others.
  presentTip:  13,     // degrees, CONSTANT. Tips the up-face toward the camera so the
                       // number is the dominant face of the silhouette, not 38% of it.
  sixEmissive: 0.55,   // §10.4 peak gold wash on a six. 0.24 was a whisper.
}, DICE_CFG || {}, (globalThis.CFG && globalThis.CFG.dice) || {});

/* ── ART-DIRECTION v2 ─────────────────────────────────────────────────────
   The client rejected v1 as "not rich": the die read as a blown-out white
   cube hovering in dead table below the board. ART-DIRECTION.md §1 asks for
   aged ivory at roughness ~.35, inset pips, and a contact shadow; §6 asks
   for everything to be pulled in toward the board.

   config.dice still carries the v1 numbers, and it is merged ABOVE this
   module's defaults, so simply editing the defaults above would change
   nothing. Instead: where config still holds the exact v1 value, v2 wins;
   where the config owner has since moved a value off that default, that is
   a deliberate decision and it is left alone. Runtime CFG always wins. */
const V1_TO_V2 = [
  ['roughness',   0.46, 0.36],  // washed-out matte → aged ivory with a soft sheen
  ['bevel',       0.13, 0.155], // a corner you can see the light roll around
  ['zGap',        1.95, 1.02],  // stood ~3.1 units clear of the frame, alone in beige
  ['shadowAlpha', 0.26, 0.46],  // there was no readable contact shadow at all
];
for (const [k, v1, v2] of V1_TO_V2) if (D[k] === v1) D[k] = v2;
Object.assign(D, (globalThis.CFG && globalThis.CFG.dice) || {});

/* The die stands on the TABLE, not on the board plane. scene.js's table sits at
   -board.thickness - 0.002; the die's base has to meet it or it hovers — which
   is exactly what v1 did, 0.35 units up in clear air. */
const TABLE_Y = -(BOARD.thickness != null ? BOARD.thickness : 0.35) - 0.002;

/* roughnessMap multiplies material.roughness by the map's green channel, so the
   material carries the ceiling and the map carves the variation out of it:
   0.86 over the faces lands on D.roughness, the worn rim drops to ~0.7×
   (handled ivory takes a polish) and the painted pips come back matte. */
const ROUGH_CEIL = clampNum(D.roughness / 0.86, 0.05, 1);
function clampNum(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* Western (right-handed) die: 1↑ 2 front 3 right, opposite faces sum to 7.
   Face normals in local space, and BoxGeometry's group order. */
const FACE_OF_GROUP = [3, 4, 1, 6, 2, 5];   // +X, -X, +Y, -Y, +Z, -Z

/* Rotation that brings face 'v' to +Y. Built once, in FACE_Q below. */
const FACE_AXIS = {
  1: [1, 0, 0,  0],            // already up
  2: [1, 0, 0, -Math.PI / 2],  // +Z → +Y
  3: [0, 0, 1,  Math.PI / 2],  // +X → +Y
  4: [0, 0, 1, -Math.PI / 2],  // -X → +Y
  5: [1, 0, 0,  Math.PI / 2],  // -Z → +Y
  6: [1, 0, 0,  Math.PI],      // -Y → +Y
};
const FACE_Q = {};
for (const v of [1, 2, 3, 4, 5, 6]) {
  const [x, y, z, a] = FACE_AXIS[v];
  FACE_Q[v] = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), a);
}

const DEG = Math.PI / 180;
const rng = makeRng(0x5AA9);   // cosmetic only — spin axis and yaw. Never touches rules.js.

/* The presentation tip. The camera lives at +Z (config.camera.position is
   (0, 16.01, 20.49)), so rotating the up-face about world +X by a POSITIVE
   angle swings its normal from +Y toward +Z — i.e. toward the lens. At the 38°
   rest elevation that takes the angle between the up-face normal and the eye
   vector from ~39° to ~26°, which is the difference between decoding the number
   and reading it. Constant and never randomised, so the landing stays exact. */
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const TIP_Q = new THREE.Quaternion().setFromAxisAngle(AXIS_X, (D.presentTip || 0) * DEG);

/* ═════════════════════════════════════════════════════════════════════════
   Module state
   ═════════════════════════════════════════════════════════════════════════ */
let group = null, die = null, shadow = null, pressRing = null, impactRing = null;
let mat = null, shadowMat = null, atlasTex = null, bumpTex = null, roughTex = null, geo = null;
let camera = null, canvas = null, proxy = null;

/* §7.5 wants the die drawn at ~64 CSS px. D.size is world units and was tuned
   for a 390px portrait phone; on a laptop the camera sits much closer to the
   tray, so the same cube renders enormous. refitDice() solves for the scale
   that puts it back at 64 px on THIS viewport. */
let fitK = 1;
/** where the die actually stands after the fit — hit test and proxy read this */
const REST_W = new THREE.Vector3();

let enabled = false;      // setDiceEnabled
let rolling = false;      // a roll is on screen
let skip = false;         // tap-to-skip, CONTRACT amendment 10
let locked = false;       // fired, waiting for game.js — a double-tap cannot double-roll
let pressing = false, pressT = 0, pressAmt = 0, pointerId = null;
let dimAmt = 1;           // 1 = live, 0 = fully dimmed
let value = 5;            // face currently shown at rest
let sixFlash = 0;         // 0..1, §10.4
let elapsed = 0;
let audioOn = true;
let disposed = false;

const REST = new THREE.Vector3();
const restQ = new THREE.Quaternion();
const listeners = new Set();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _sphere = new THREE.Sphere();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

/* ═════════════════════════════════════════════════════════════════════════
   A rounded box that is genuinely rounded.
   Take a segmented cube, clamp every vertex into the inner box, then push it
   back out by the corner radius. The flat centre of each face is untouched
   (so the pips stay flat and the UVs stay honest); only the rim curves. The
   normal is analytic, so the bevel is smooth and the two faces meeting across
   it agree exactly — no crease, no seam.
   ═════════════════════════════════════════════════════════════════════════ */
function roundedBox(size, radius, seg) {
  const n = Math.max(2, seg) * 2 + 1;
  const g = new THREE.BoxGeometry(size, size, size, n, n, n);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const h = size / 2;
  const r = Math.min(radius, h - 1e-4);
  const inner = h - r;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const cx = clamp(px, -inner, inner), cy = clamp(py, -inner, inner), cz = clamp(pz, -inner, inner);
    let dx = px - cx, dy = py - cy, dz = pz - cz;
    const L = Math.hypot(dx, dy, dz) || 1;
    dx /= L; dy /= L; dz /= L;
    pos.setXYZ(i, cx + dx * r, cy + dy * r, cz + dz * r);
    nor.setXYZ(i, dx, dy, dz);
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/* Remap each face's 0..1 UVs into its tile of a 3×2 atlas. Canvas textures are
   flipY, so drawn row 0 (top of the image) is uv row 1. */
function atlasUvs(g, inset) {
  const uv = g.attributes.uv;
  for (const grp of g.groups) {
    const col = grp.materialIndex % 3;
    const uvRow = 1 - Math.floor(grp.materialIndex / 3);
    const idx = g.index;
    const seen = new Set();
    for (let k = grp.start; k < grp.start + grp.count; k++) {
      const i = idx ? idx.getX(k) : k;
      if (seen.has(i)) continue;
      seen.add(i);
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i,
        (col + inset + u * (1 - 2 * inset)) / 3,
        (uvRow + inset + v * (1 - 2 * inset)) / 2);
    }
  }
  uv.needsUpdate = true;
  g.clearGroups();                       // one material, one draw call
  g.addGroup(0, (g.index ? g.index.count : g.attributes.position.count), 0);
  return g;
}

/* ═════════════════════════════════════════════════════════════════════════
   The faces. Warm ivory ground (colors.dice, lifted for the paint highlight),
   IFM-teal pips, each drilled in: a soft navy shadow up-left, the teal disc,
   a pale catch-light bottom-right. A matching height map does the rest.
   ═════════════════════════════════════════════════════════════════════════ */
const PIP_O = 0.245;   // pip offset from face centre, in face units
const PIPS = {
  1: [[0, 0]],
  2: [[-PIP_O, -PIP_O], [PIP_O, PIP_O]],
  3: [[-PIP_O, -PIP_O], [0, 0], [PIP_O, PIP_O]],
  4: [[-PIP_O, -PIP_O], [PIP_O, -PIP_O], [-PIP_O, PIP_O], [PIP_O, PIP_O]],
  5: [[-PIP_O, -PIP_O], [PIP_O, -PIP_O], [0, 0], [-PIP_O, PIP_O], [PIP_O, PIP_O]],
  6: [[-PIP_O, -PIP_O], [-PIP_O, 0], [-PIP_O, PIP_O],
      [PIP_O, -PIP_O], [PIP_O, 0], [PIP_O, PIP_O]],
};

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
function lighten(n, amt) {
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(c + (255 - c) * amt);
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
function shade(n, amt) {                     // toward black
  const k = 1 - amt;
  return (Math.round(((n >> 16) & 255) * k) << 16)
       | (Math.round(((n >> 8) & 255) * k) << 8)
       | Math.round((n & 255) * k);
}
function mix(a, b, t) {                      // linear blend of two 0xRRGGBB
  const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
}
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
const grey = (v) => { const k = Math.round(clamp(v, 0, 1) * 255); return `rgb(${k},${k},${k})`; };

/* ── The ivory ────────────────────────────────────────────────────────────
   'colors.dice' (#efe3cb) is the paint chip, not the render. Measured off the
   v1 screenshot it came out of ACES + a 1.1 key at roughly (250,250,248) —
   printer paper. ART-DIRECTION.md asks for AGED ivory, so the albedo is pulled
   down and warmed toward old bone before it ever reaches the tone mapper; it
   lands back around (232,220,193) on screen, which is where it should have been.
   Everything is derived from config's hue, so the config owner still owns it. */
const AGE       = 0x8a6a3c;                          // old-bone / tea stain
const IVORY     = mix(colors.dice, AGE, 0.30);       // the ground
const IVORY_HI  = mix(colors.dice, 0xffffff, 0.22);  // where the light rakes across
const IVORY_LO  = mix(colors.dice, AGE, 0.56);       // grime settled in the bevel
const IVORY_GR  = mix(colors.dice, AGE, 0.44);       // grain streaks and speckle

/* ── The pips ─────────────────────────────────────────────────────────────
   ART-DIRECTION.md §1: "pips inset with a soft shadow inside each dimple, in
   IFM teal". Legibility is the rule that outranks it, so the pip is teal all
   the way through but shaded like a real drilled hole: the floor of the dimple
   is teal at 45% value (#134740, ~6.2:1 against the ivory above), the wall is
   teal-d, the lit rim is full --teal. It reads unmistakably teal AND it has a
   dark core, which is what carries the shape at 84 CSS px on a phone. */
const PIP_DEEP = shade(colors.teal, 0.55);
const PIP_WALL = colors.tealD;
const PIP_FACE = colors.teal;
const PIP_RIM  = mix(colors.teal, 0xffffff, 0.30);

const arng = makeRng(0xD1CE);   // texture noise only — never touches a roll

function mkCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

function faceAtlas(ts) {
  const W = ts * 3, H = ts * 2;
  const cv = mkCanvas(W, H), c = cv.getContext('2d');   // albedo
  const bv = mkCanvas(W, H), b = bv.getContext('2d');   // height  (dark = recessed)
  const rv = mkCanvas(W, H), r = rv.getContext('2d');   // roughness (dark = polished)

  const pipR = ts * 0.088;

  for (let g = 0; g < 6; g++) {
    const ox = (g % 3) * ts, oy = Math.floor(g / 3) * ts;
    const v = FACE_OF_GROUP[g];

    /* 1. ground — a diagonal rake, so the face is never a flat swatch */
    const grad = c.createLinearGradient(ox, oy, ox + ts, oy + ts);
    grad.addColorStop(0.00, hex(IVORY_HI));
    grad.addColorStop(0.42, hex(IVORY));
    grad.addColorStop(1.00, hex(mix(IVORY, AGE, 0.16)));
    c.fillStyle = grad; c.fillRect(ox, oy, ts, ts);
    b.fillStyle = grey(0.50); b.fillRect(ox, oy, ts, ts);
    r.fillStyle = grey(0.86); r.fillRect(ox, oy, ts, ts);

    /* 2. bone grain — fine drawn streaks, then speckle. This is the single
          cheapest thing that stops a die looking injection-moulded. */
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const y = oy + arng() * ts, len = ts * (0.14 + arng() * 0.5);
      c.globalAlpha = 0.05 + arng() * 0.07;
      c.strokeStyle = hex(arng() < 0.4 ? IVORY_HI : IVORY_GR);
      c.lineWidth = ts * (0.004 + arng() * 0.008);
      c.beginPath();
      c.moveTo(ox + arng() * ts * 0.7, y);
      c.lineTo(ox + arng() * ts * 0.7 + len, y + (arng() - 0.5) * ts * 0.03);
      c.stroke();
    }
    c.restore();
    b.save();
    for (let i = 0; i < 34; i++) {
      b.globalAlpha = 0.16;
      b.fillStyle = grey(arng() < 0.5 ? 0.44 : 0.57);
      b.fillRect(ox + arng() * ts, oy + arng() * ts, ts * (0.05 + arng() * 0.3), ts * 0.012);
    }
    b.restore();

    /* 3. age — two or three faint tea blooms, never over a pip position */
    c.save();
    for (let i = 0; i < 3; i++) {
      const bx = ox + ts * (0.10 + arng() * 0.80), by = oy + ts * (0.10 + arng() * 0.80);
      const br = ts * (0.10 + arng() * 0.16);
      const bg2 = c.createRadialGradient(bx, by, 0, bx, by, br);
      bg2.addColorStop(0, rgba(AGE, 0.085));
      bg2.addColorStop(1, rgba(AGE, 0));
      c.fillStyle = bg2; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
    }
    c.restore();

    /* 4. the worn edge. Grime banks up in the bevel and the ivory just inside it
          takes a polish from sixty years of thumbs. Both are painted here and
          the roughness map follows: rim smoother, faces matte. */
    c.save();
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const inset = t * ts * 0.115;
      c.globalAlpha = 0.20 * (1 - t) * (1 - t);
      c.strokeStyle = hex(IVORY_LO);
      c.lineWidth = ts * 0.016;
      c.strokeRect(ox + inset, oy + inset, ts - inset * 2, ts - inset * 2);
      r.globalAlpha = 0.26 * (1 - t);
      r.strokeStyle = grey(0.40);
      r.lineWidth = ts * 0.016;
      r.strokeRect(ox + inset, oy + inset, ts - inset * 2, ts - inset * 2);
      b.globalAlpha = 0.14 * (1 - t);
      b.strokeStyle = grey(0.40);
      b.lineWidth = ts * 0.016;
      b.strokeRect(ox + inset, oy + inset, ts - inset * 2, ts - inset * 2);
    }
    c.globalAlpha = 0.30; c.strokeStyle = hex(IVORY_HI); c.lineWidth = ts * 0.022;
    c.strokeRect(ox + ts * 0.062, oy + ts * 0.062, ts * 0.876, ts * 0.876);
    c.restore(); r.globalAlpha = 1; b.globalAlpha = 1;

    /* 5. the pips — drilled, not printed */
    for (const [u, w] of PIPS[v]) {
      const px = ox + ts * (0.5 + u), py = oy + ts * (0.5 + w);

      // the dimple's own shadow spilling onto the ivory, offset away from the key
      c.save();
      const halo = c.createRadialGradient(px + pipR * 0.10, py + pipR * 0.14, pipR * 0.8,
                                          px + pipR * 0.10, py + pipR * 0.14, pipR * 1.62);
      halo.addColorStop(0, rgba(0x2a1c0e, 0.30));
      halo.addColorStop(1, rgba(0x2a1c0e, 0));
      c.fillStyle = halo;
      c.beginPath(); c.arc(px + pipR * 0.10, py + pipR * 0.14, pipR * 1.62, 0, 7); c.fill();
      c.restore();

      // the bowl: deep teal at the floor, tealD up the wall, full teal at the lit rim
      const pg = c.createRadialGradient(px + pipR * 0.16, py + pipR * 0.20, pipR * 0.06,
                                        px, py, pipR);
      pg.addColorStop(0.00, hex(PIP_DEEP));
      pg.addColorStop(0.44, hex(mix(PIP_DEEP, PIP_WALL, 0.75)));
      pg.addColorStop(0.80, hex(PIP_FACE));
      pg.addColorStop(1.00, hex(PIP_RIM));
      c.fillStyle = pg;
      c.beginPath(); c.arc(px, py, pipR, 0, 7); c.fill();

      // ambient occlusion right where the wall meets the face — the "inset" read
      c.save();
      c.globalAlpha = 0.38; c.strokeStyle = rgba(shade(colors.teal, 0.72), 1);
      c.lineWidth = pipR * 0.13;
      c.beginPath(); c.arc(px, py, pipR * 0.95, 0, 7); c.stroke();
      c.restore();

      // and the catch-light on the near rim of the drill, up-left toward the key
      c.save();
      c.globalAlpha = 0.5; c.strokeStyle = hex(IVORY_HI); c.lineWidth = pipR * 0.15;
      c.beginPath(); c.arc(px, py, pipR * 1.04, Math.PI * 0.98, Math.PI * 1.72); c.stroke();
      c.restore();

      // height: a real bowl, with a lip of raised ivory around it
      const bg = b.createRadialGradient(px, py, pipR * 0.10, px, py, pipR * 1.30);
      bg.addColorStop(0.00, grey(0.04));
      bg.addColorStop(0.62, grey(0.16));
      bg.addColorStop(0.80, grey(0.44));
      bg.addColorStop(0.90, grey(0.62));
      bg.addColorStop(1.00, grey(0.50));
      b.fillStyle = bg;
      b.beginPath(); b.arc(px, py, pipR * 1.30, 0, 7); b.fill();

      // painted enamel in the bowl is matte next to the polished ivory
      r.save();
      r.fillStyle = grey(1.0);
      r.beginPath(); r.arc(px, py, pipR * 1.02, 0, 7); r.fill();
      r.restore();
    }
  }

  const t1 = new THREE.CanvasTexture(cv);
  const t2 = new THREE.CanvasTexture(bv);
  const t3 = new THREE.CanvasTexture(rv);
  for (const t of [t1, t2, t3]) {
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = quality.current.anisotropy || 1;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
  }
  if ('SRGBColorSpace' in THREE) t1.colorSpace = THREE.SRGBColorSpace;
  return { map: t1, bump: t2, rough: t3 };
}

/* ── The contact shadow ───────────────────────────────────────────────────
   ART-DIRECTION.md §3: "every raised object must cast a contact shadow onto
   the surface beneath it — this single change is most of the richness." v1
   drew a symmetric muted-blue haze at 0.26 that measured about 5% against the
   table and read as nothing at all; the die simply hovered.

   This is two shadows baked into one texture on one mesh: a tight, dark,
   warm core the size of the die's footprint (that is the contact), and a wide
   soft ambient pool around it. Both are pushed away from the key, which
   §3 puts at 45° from the FRONT-LEFT — so the shadow falls back and right. */
function shadowTexture() {
  const S = 256, HC = S / 2;
  const cv = mkCanvas(S, S);
  const c = cv.getContext('2d');
  const offX = S * 0.055, offY = -S * 0.075;      // back-right, away from the key

  // wide ambient occlusion pool
  const amb = c.createRadialGradient(HC + offX * 0.5, HC + offY * 0.5, S * 0.06,
                                     HC + offX * 0.5, HC + offY * 0.5, S * 0.49);
  amb.addColorStop(0.00, 'rgba(255,255,255,0.58)');
  amb.addColorStop(0.42, 'rgba(255,255,255,0.30)');
  amb.addColorStop(1.00, 'rgba(255,255,255,0)');
  c.fillStyle = amb; c.fillRect(0, 0, S, S);

  // the hard contact directly under the cube — squashed along the light
  c.save();
  c.translate(HC + offX, HC + offY);
  c.scale(1.0, 0.82);
  const core = c.createRadialGradient(0, 0, S * 0.02, 0, 0, S * 0.26);
  core.addColorStop(0.00, 'rgba(255,255,255,1)');
  core.addColorStop(0.52, 'rgba(255,255,255,0.86)');
  core.addColorStop(1.00, 'rgba(255,255,255,0)');
  c.fillStyle = core;
  c.beginPath(); c.arc(0, 0, S * 0.26, 0, 7); c.fill();
  c.restore();

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  return t;
}

function ring(color, inner, outer, opacity) {
  const g = new THREE.RingGeometry(inner, outer, 44);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.visible = false;
  mesh.renderOrder = 4;
  return mesh;
}

/* ═════════════════════════════════════════════════════════════════════════
   buildDice
   ═════════════════════════════════════════════════════════════════════════ */
export function buildDice(scene, cam) {
  disposeDice();
  disposed = false;
  if (cam) camera = cam;

  const q = quality.current;
  const half = (BOARD.half || 5) + (BOARD.border || 0.45);
  /* Local space. The whole group is dropped to TABLE_Y in refitDice(), so
     REST.y is just "half a die above whatever it is standing on". */
  REST.set(half * D.x, D.size * 0.5, half + D.size * D.zGap);

  /* geometry — bevel floored at 3 segments even on low tier. A hard-edged cube
     is the one thing this object may never look like, and at 2 segments the
     rounded corner still stepped; 3 costs ~500 triangles out of a 220k budget. */
  geo = atlasUvs(roundedBox(D.size, D.size * D.bevel, Math.max(3, q.diceBevelSeg || 3)), 0.008);

  const ts = (q.textureSize || 1024) >= 1024 ? 320 : 192;
  const tex = faceAtlas(ts);
  atlasTex = tex.map; bumpTex = tex.bump; roughTex = tex.rough;

  mat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    bumpMap: bumpTex,
    bumpScale: 0.18,            // was 0.022 — the dimples were mathematically there
                                // and visually absent. This is the "inset" read.
    roughnessMap: roughTex,
    roughness: ROUGH_CEIL,      // the map carves 0.36 faces / ~0.17 worn rim out of it
    metalness: materials.dice.metalness || 0,
    envMapIntensity: 0.9,       // ivory has to CATCH the window, or it is a diagram
    emissive: new THREE.Color(colors.gold),
    emissiveIntensity: 0,
    transparent: true,          // needed for the dim and the reduced-motion cross-fade
    opacity: 1,
    depthWrite: true,
  });

  die = new THREE.Mesh(geo, mat);
  die.castShadow = q.shadows === 'soft';
  die.receiveShadow = false;
  die.position.copy(REST);
  die.renderOrder = 3;

  /* Warm, not blue: a shadow on a wooden table is the table minus its light.
     colors.muted (#5a7d8a) at 0.26 was a cool haze that measured ~5% against
     the ground and was invisible in the shipped screenshot. */
  shadowMat = new THREE.MeshBasicMaterial({
    color: colors.woodDark || 0x4a2c17, map: shadowTexture(), transparent: true,
    opacity: D.shadowAlpha, depthWrite: false,
  });
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(D.size * 2.6, D.size * 2.6), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(REST.x, 0.004, REST.z);
  shadow.renderOrder = 1;

  pressRing = ring(colors.teal, D.size * 0.60, D.size * 0.80, 0);
  impactRing = ring(colors.goldLt, D.size * 0.52, D.size * 0.62, 0);
  pressRing.position.set(REST.x, 0.010, REST.z);
  impactRing.position.set(REST.x, 0.012, REST.z);

  group = new THREE.Group();
  group.name = 'dice';
  group.add(shadow, pressRing, impactRing, die);
  if (scene) scene.add(group);

  restQ.copy(faceQuat(value));
  die.quaternion.copy(restQ);

  bindInput();
  buildProxy();
  addFrame(tick);
  applyDim(true);
  refitDice();
  return group;
}

export function disposeDice() {
  disposed = true;
  unbindInput();
  if (typeof SCENE.offFrame === 'function') { try { SCENE.offFrame(tick); } catch { /* noop */ } }
  if (group && group.parent) group.parent.remove(group);
  for (const o of [geo, shadow && shadow.geometry, pressRing && pressRing.geometry,
                   impactRing && impactRing.geometry]) o && o.dispose && o.dispose();
  for (const m of [mat, shadowMat, pressRing && pressRing.material,
                   impactRing && impactRing.material]) m && m.dispose && m.dispose();
  for (const t of [atlasTex, bumpTex, roughTex]) t && t.dispose && t.dispose();
  if (proxy && proxy.parentNode) proxy.parentNode.removeChild(proxy);
  group = die = shadow = pressRing = impactRing = null;
  mat = shadowMat = atlasTex = bumpTex = roughTex = geo = proxy = null;
  rolling = pressing = locked = false;
}

/* Final orientation for a value: the face up, tipped toward the camera, plus a
   small hand-placed yaw. Both the yaw and the tip are deliberately small — the
   up-face must dominate the silhouette, not share it with two other numbers. */
function faceQuat(v) {
  const yaw = (D.baseYaw + (rng() * 2 - 1) * D.yawJitter) * DEG;
  _q.setFromAxisAngle(AXIS_Y, yaw);
  return _q.clone().multiply(TIP_Q).multiply(FACE_Q[v] || FACE_Q[1]);
}

/* ═════════════════════════════════════════════════════════════════════════
   rollDice — the whole point of the file.
   ═════════════════════════════════════════════════════════════════════════ */
export function rollDice(v) {
  const val = clamp(Math.round(Number(v) || 1), 1, 6);
  if (!die) { value = val; return Promise.resolve(val); }
  if (rolling) return Promise.resolve(val);

  rolling = true; skip = false; locked = false;
  pressing = false; pressAmt = 0; pointerId = null;
  hideRing(pressRing);
  syncProxy();

  return (prefersReducedMotion() ? reducedRoll(val) : tumbleRoll(val))
    .then(() => {
      value = val;
      rolling = false;
      syncProxy();
      return val;
    });
}

function reducedRoll(val) {
  /* §9 closing block + the brief: no tumble at all. A 250ms cross-fade to the
     final face. The teaching timings around it are untouched. */
  const half = D.reducedMs / 2;
  const qEnd = faceQuat(val);
  play('dice');
  return frames(D.reducedMs, (t) => {
    const a = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
    mat.opacity = lerp(1, 0.12, ease.out(a)) * dimOpacity();
    if (t >= 0.5 && die.quaternion.angleTo(qEnd) > 1e-4) {
      die.quaternion.copy(qEnd);
      restQ.copy(qEnd);
      play('land');
    }
  }).then(() => {
    die.quaternion.copy(qEnd); restQ.copy(qEnd);
    die.position.copy(REST); die.scale.set(1, 1, 1);
    mat.opacity = dimOpacity();
    if (val === 6) sixFlash = 1;
    void half;
  });
}

function tumbleRoll(val) {
  const T  = timing.diceRoll   || 900;
  const TU = Math.min(timing.diceTumble  || 700, T);
  const ST = Math.min(timing.diceSettle  || 140, T - TU);
  const PP = Math.max(0, T - TU - ST);

  const q0 = die.quaternion.clone();
  const qEnd = faceQuat(val);

  /* An INTEGER number of extra turns about a random, mostly-horizontal axis.
     Integer ⇒ the extra rotation is exactly the identity at t=1, so the die
     arrives on 'qEnd' without a correction step. This is why it never snaps. */
  const axis = new THREE.Vector3(rng() * 2 - 1, (rng() * 2 - 1) * 0.35, rng() * 2 - 1);
  if (axis.lengthSq() < 1e-6) axis.set(1, 0.2, 0.4);
  axis.normalize();
  const spins = 2 + rng.int(2);          // 2 or 3 tumbles
  const spinTotal = spins * Math.PI * 2;

  const H = D.size * D.tossHeight;
  const [dx, dz] = D.tossDrift;
  let landed = false;

  play('dice');

  return frames(T, (t) => {
    const ms = t * T;

    if (ms <= TU) {
      /* — tumble: a toss up, then a fall that accelerates — */
      const u = TU ? ms / TU : 1;
      const y = u < 0.42
        ? H * ease.out(u / 0.42)
        : H * (1 - ease.in((u - 0.42) / 0.58));
      const drift = Math.sin(Math.PI * u);
      die.position.set(REST.x + D.size * dx * drift, REST.y + y, REST.z + D.size * dz * drift);

      const w = ease.outQuint(u);
      _q.copy(q0).slerp(qEnd, w);                                     // → exactly qEnd
      _q2.setFromAxisAngle(axis, spinTotal * (1 - ease.outQuint(1 - u) * 0 + w) * 0 + spinTotal * w);
      die.quaternion.copy(_q2).multiply(_q);                          // world-space spin
      die.scale.setScalar(1);
    } else if (ms <= TU + ST) {
      /* — settle: the bounce and the squash — */
      if (!landed) { landed = true; onLand(val); }
      const v2 = ST ? (ms - TU) / ST : 1;
      const bounce = Math.exp(-4.2 * v2) * Math.abs(Math.sin(Math.PI * v2 * 1.7));
      const sq = Math.exp(-5 * v2) * Math.cos(v2 * Math.PI * 2.4);
      die.position.set(REST.x, REST.y + D.size * 0.14 * bounce, REST.z);
      die.quaternion.copy(qEnd);
      die.scale.set(1 + 0.10 * sq, 1 - 0.15 * sq, 1 + 0.10 * sq);
    } else {
      /* — pip pop: the number arrives — */
      const w = PP ? (ms - TU - ST) / PP : 1;
      const s = 1 + D.pipPop * Math.sin(Math.PI * clamp(w, 0, 1));
      die.position.copy(REST);
      die.quaternion.copy(qEnd);
      die.scale.setScalar(s);
    }
    updateShadow();
  }).then(() => {
    if (!landed) onLand(val);
    die.position.copy(REST);
    die.quaternion.copy(qEnd);
    die.scale.set(1, 1, 1);
    restQ.copy(qEnd);
    updateShadow();
  });
}

function onLand(val) {
  play('land');
  if (FX && typeof FX.dust === 'function') {
    try { FX.dust(_v.set(REST_W.x, TABLE_Y + 0.02, REST_W.z)); } catch { /* noop */ }
  }
  flashRing(impactRing, val === 6 ? colors.gold : colors.goldLt);
  if (val === 6) { sixFlash = 1; play('six'); }
}

/* ═════════════════════════════════════════════════════════════════════════
   Enable / disable — §16 of the anti-patterns says there is no error state, so
   a disabled die must read as "not your turn", not as "broken". It dims, it
   stops pulsing, it shrinks a touch, and it stops answering taps. Three
   signals, never colour alone.
   ═════════════════════════════════════════════════════════════════════════ */
/**
 * Re-solve the die's world size so it draws at 'layout.diceDrawn' CSS px on the
 * current viewport. Scaling the whole group and sliding it back keeps the die
 * standing on the same table spot, so nothing else has to know.
 * Call after the camera has been fitted, and on every resize.
 */
export function refitDice() {
  if (!group) return fitK;
  const cam = getCamera(), cv = getCanvas();
  if (!cam || !cv || !cv.clientHeight) return fitK;
  const edge = (BOARD.half || 5) + (BOARD.border || 0.45);
  const worldRest = _v.set(REST.x, TABLE_Y + REST.y * fitK, edge + D.size * fitK * D.zGap);
  const depth = Math.abs(cam.position.distanceTo(worldRest)) || cam.position.length();
  const worldH = 2 * depth * Math.tan((cam.fov || 26) * 0.5 * DEG);
  const pxPerWorld = cv.clientHeight / (worldH || 1);
  /* diceDrawn is the SILHOUETTE width §7.5 asks for. A cube seen from a corner
     projects about 1.45x its own edge at this elevation, so solve for the edge,
     not the outline. (1.35 measured too generous and the die read a size larger
     than the board it is meant to belong to.) */
  const want = (layout.diceDrawn || 64) / 1.45 / (pxPerWorld || 1);
  fitK = clamp(want / D.size, 0.30, 1.35);
  /* A smaller die must also sit CLOSER to the board — the gap is a die's width,
     not a nominal die's width — or a 0.45x die floats a long way out and lands
     under the teaching ribbon. Solving die.z = edge + size*fitK*zGap for the
     group offset gives edge*(1 - fitK). The y offset drops the whole group onto
     the table so the die's base and its shadow meet the surface. */
  group.scale.setScalar(fitK);
  group.position.set(REST.x * (1 - fitK), TABLE_Y, edge * (1 - fitK));
  REST_W.set(REST.x, TABLE_Y + REST.y * fitK, edge + D.size * fitK * D.zGap);
  syncProxyPosition();
  return fitK;
}

export function diceFit() { return fitK; }

export function setDiceEnabled(b) {
  const next = !!b;
  if (next && !enabled) locked = false;
  enabled = next;
  if (!enabled) { pressing = false; pointerId = null; hideRing(pressRing); }
  syncProxy();
}

export function isDiceEnabled() { return enabled; }
export function isDiceRolling() { return rolling; }
export function diceValue() { return value; }
export function diceObject() { return group; }

/** The die is the primary button. Returns an unsubscribe. */
export function onDiceClick(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** camera.js / game.js may hand us the camera; otherwise we find it ourselves. */
export function setDiceCamera(cam) { camera = cam || camera; }
/** i18n.js / game.js can localise the keyboard proxy's label. */
export function setDiceLabel(s) { if (proxy && s) proxy.setAttribute('aria-label', String(s)); }
/** game.js may prefer to own the dice cues; this hands them back. */
export function setDiceAudio(b) { audioOn = !!b; }

/* ═════════════════════════════════════════════════════════════════════════
   Frame
   ═════════════════════════════════════════════════════════════════════════ */
function tick(dt) {
  if (disposed || !die) return;
  const d = (typeof dt === 'number' && dt < 1 ? dt : 0.016);
  elapsed += d * 1000;

  /* dim */
  const target = enabled ? 1 : 0;
  dimAmt = lerp(dimAmt, target, 1 - Math.exp(-9 * d));
  if (Math.abs(dimAmt - target) < 0.002) dimAmt = target;
  applyDim(false);

  if (!rolling) {
    /* press / hold */
    const wantPress = pressing ? 1 : 0;
    pressAmt = lerp(pressAmt, wantPress, 1 - Math.exp(-22 * d));

    let s = 1;
    if (enabled && !locked && pressAmt < 0.02) {
      // §9 #7 the idle pulse. It is the entire tutorial — nothing else moves.
      s = 1 + D.idlePulse * 0.5 * (1 - Math.cos(elapsed * 2 * Math.PI / (timing.diceIdlePulse || 1000)));
    }
    s = lerp(s, D.pressScale, pressAmt);
    if (!enabled) s *= 0.94;
    die.scale.setScalar(s);

    /* the held press: a wind-up, so the tap feels like an act */
    let jx = 0, jz = 0, jr = 0;
    if (pressing) {
      pressT += d * 1000;
      if (pressT > D.holdAfter) {
        const k = clamp((pressT - D.holdAfter) / 420, 0, 1) * D.holdShake * D.size;
        jx = Math.sin(pressT * 0.055) * k;
        jz = Math.sin(pressT * 0.041 + 1.7) * k;
        jr = Math.sin(pressT * 0.048) * k * 0.7;
      }
    } else { pressT = 0; }
    die.position.set(REST.x + jx, REST.y - D.size * 0.03 * pressAmt, REST.z + jz);
    die.quaternion.copy(restQ);
    if (jr) {
      _q.setFromAxisAngle(_v.set(0, 1, 0), jr);
      die.quaternion.premultiply(_q);
    }

    /* the press glow ring */
    if (pressAmt > 0.01) {
      showRing(pressRing, colors.teal);
      pressRing.material.opacity = 0.55 * pressAmt * dimAmt;
      const rs = lerp(0.72, 1.14, ease.out(pressAmt));
      pressRing.scale.set(rs, 1, rs);
    } else { hideRing(pressRing); }

    updateShadow();
  }

  /* §10.4 the six — a warm gold wash over the whole die, never a flourish */
  if (sixFlash > 0) {
    sixFlash = Math.max(0, sixFlash - d * 1000 / (timing.sixFlash || 450));
    mat.emissiveIntensity = (D.sixEmissive || 0.55) * Math.sin(Math.PI * (1 - sixFlash)) * dimAmt;
  } else if (mat.emissiveIntensity) { mat.emissiveIntensity = 0; }

  /* the impact ring lives its own short life */
  if (impactRing.visible) {
    const m = impactRing.material;
    m.opacity = Math.max(0, m.opacity - d * 3.2);
    const rs = impactRing.scale.x + d * 2.6;
    impactRing.scale.set(rs, 1, rs);
    if (m.opacity <= 0.01) impactRing.visible = false;
  }

  syncProxyPosition();
}

function updateShadow() {
  if (!shadow) return;
  const lift = clamp((die.position.y - REST.y) / (D.size * D.tossHeight), 0, 1);
  const sq = die.scale.y / (die.scale.x || 1);        // squashed die ⇒ wider shadow
  /* A thrown die's shadow spreads AND fades as it rises — the contact core goes
     first, which is the cue that reads as "in the air". */
  const s = lerp(1.0, 1.34, lift) * lerp(1, 1.10, clamp(1 - sq, 0, 1) * 4);
  shadow.scale.set(s, s, s);
  shadow.position.x = REST.x + (die.position.x - REST.x) * 0.55;
  shadow.position.z = REST.z + (die.position.z - REST.z) * 0.55;
  shadowMat.opacity = lerp(D.shadowAlpha, 0.10, ease.out(lift)) * lerp(0.5, 1, dimAmt);
}

function dimOpacity() { return lerp(0.42, 1, dimAmt); }

function applyDim(force) {
  if (!mat) return;
  if (force || !rolling) mat.opacity = dimOpacity();
  mat.roughness = lerp(0.95, ROUGH_CEIL, dimAmt);   // dull, not just faded
  if (shadowMat) shadowMat.opacity = Math.min(shadowMat.opacity, D.shadowAlpha) * (force ? 1 : 1);
}

function showRing(r, color) {
  if (!r) return;
  r.visible = true;
  r.material.color.setHex(color);
}
function hideRing(r) { if (r) { r.visible = false; r.material.opacity = 0; } }
function flashRing(r, color) {
  if (!r) return;
  showRing(r, color);
  r.material.opacity = 0.62;
  r.scale.set(0.9, 1, 0.9);
}

/* ═════════════════════════════════════════════════════════════════════════
   Input — the die itself is the button. Raycast against a generous hit sphere
   so the touch target is ~100 CSS px on a phone (layout.diceHit asks for 88).
   ═════════════════════════════════════════════════════════════════════════ */
function getCamera() {
  if (camera) return camera;
  if (typeof SCENE.getCamera === 'function') { try { camera = SCENE.getCamera(); } catch { /* noop */ } }
  if (!camera && group) {
    let root = group; while (root.parent) root = root.parent;
    root.traverse((o) => { if (!camera && o.isCamera) camera = o; });
  }
  if (!camera && typeof globalThis !== 'undefined' && globalThis.__SNL && globalThis.__SNL.camera) {
    camera = globalThis.__SNL.camera;
  }
  return camera;
}

function getCanvas() {
  if (canvas && canvas.isConnected) return canvas;
  if (typeof SCENE.getRenderer === 'function') {
    try { canvas = SCENE.getRenderer().domElement; } catch { /* noop */ }
  }
  if (!canvas && typeof document !== 'undefined') canvas = document.getElementById('snl-canvas');
  return canvas;
}

function hits(ev) {
  const cam = getCamera(), cv = getCanvas();
  if (!cam || !cv || !die) return false;
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  _ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1,
           -((ev.clientY - r.top) / r.height) * 2 + 1);
  _ray.setFromCamera(_ndc, cam);
  _sphere.set(_v.copy(REST_W), D.size * D.hitRadius * Math.max(fitK, 0.62));
  return _ray.ray.intersectsSphere(_sphere);
}

function onDown(ev) {
  if (disposed || !die) return;
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  if (!hits(ev)) return;

  /* CONTRACT amendment 10: every animation is tap-skippable, this one included. */
  if (rolling) { skip = true; return; }
  if (!enabled || locked) return;

  pressing = true; pressT = 0; pointerId = ev.pointerId;
  showRing(pressRing, colors.teal);
  try { navigator.vibrate && navigator.vibrate(timing.diceHaptic || 12); } catch { /* noop */ }
  play('click');
}

function onMove(ev) {
  if (!pressing || ev.pointerId !== pointerId) return;
  if (!hits(ev)) { pressing = false; pointerId = null; }   // dragged off — a real button cancels
}

function onUp(ev) {
  if (!pressing || (pointerId !== null && ev.pointerId !== pointerId)) return;
  const inside = hits(ev);
  pressing = false; pointerId = null;
  if (!inside || !enabled || locked || rolling) return;
  fire();
}

function onCancel() { pressing = false; pointerId = null; }

function fire() {
  /* Locked instantly, so a double-tap can never double-roll. Cleared by
     rollDice(), or by the next setDiceEnabled(true). */
  locked = true;
  syncProxy();
  for (const fn of Array.from(listeners)) {
    try { fn(); } catch (e) { if (globalThis.__SNL && globalThis.__SNL.errors) globalThis.__SNL.errors.push(e); }
  }
}

let bound = false;
function bindInput() {
  const cv = getCanvas();
  if (!cv || bound) return;
  bound = true;
  cv.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onCancel, { passive: true });
}
function unbindInput() {
  if (!bound) return;
  bound = false;
  const cv = canvas;
  if (cv) cv.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);
}

/* ═════════════════════════════════════════════════════════════════════════
   Keyboard reach. A 3D mesh cannot take focus, so a transparent button tracks
   the die's screen position. It is pointer-events:none — taps go to the
   raycast above — but Enter and Space still activate it, and :focus-visible
   draws a real ring around the die.
   ═════════════════════════════════════════════════════════════════════════ */
function buildProxy() {
  if (typeof document === 'undefined') return;
  injectCss('dice3d', `
.snl-dice3d{
  position:fixed;left:0;top:0;z-index:9;
  display:block;margin:0;padding:0;border:0;background:transparent;
  border-radius:50%;color:transparent;font:inherit;
  pointer-events:none;                 /* the mesh raycast owns the pointer */
  -webkit-tap-highlight-color:transparent;
  transform:translate(-50%,-50%);
}
.snl-dice3d:focus-visible{
  outline:3px solid var(--teal);
  outline-offset:2px;
  box-shadow:0 0 0 6px rgba(42,157,143,.18);
}
.snl-dice3d[aria-disabled="true"]{ outline-color:var(--muted); }
`);
  proxy = document.createElement('button');
  proxy.type = 'button';
  proxy.className = 'snl-dice3d';
  proxy.setAttribute('aria-label', 'Pasa phenko — roll the dice');
  const px = Math.max(layout.touchMinHard || 44, layout.diceHit || 88);
  proxy.style.width = px + 'px';
  proxy.style.height = px + 'px';
  proxy.addEventListener('click', (e) => {
    e.preventDefault();
    if (rolling) { skip = true; return; }
    if (!enabled || locked) return;
    try { navigator.vibrate && navigator.vibrate(timing.diceHaptic || 12); } catch { /* noop */ }
    play('click');
    fire();
  });
  document.body.appendChild(proxy);
  syncProxy();
}

function syncProxy() {
  if (!proxy) return;
  const live = enabled && !locked && !rolling;
  proxy.setAttribute('aria-disabled', live ? 'false' : 'true');
  proxy.tabIndex = live ? 0 : -1;
}

function syncProxyPosition() {
  if (!proxy) return;
  const cam = getCamera(), cv = getCanvas();
  if (!cam || !cv) return;
  const r = cv.getBoundingClientRect();
  _v.copy(REST_W.lengthSq() ? REST_W : REST).project(cam);
  proxy.style.left = (r.left + (_v.x * 0.5 + 0.5) * r.width) + 'px';
  proxy.style.top  = (r.top + (-_v.y * 0.5 + 0.5) * r.height) + 'px';
}

/* ═════════════════════════════════════════════════════════════════════════
   Plumbing
   ═════════════════════════════════════════════════════════════════════════ */
function play(cue) {
  if (!audioOn || !AUD || !AUD.sfx) return;
  const f = AUD.sfx[cue];
  if (typeof f === 'function') { try { f(); } catch { /* noop */ } }
}

/** scene.js drives the frame; if it is not there yet, drive our own. */
function addFrame(fn) {
  if (typeof SCENE.onFrame === 'function') { SCENE.onFrame(fn); return; }
  let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const loop = (now) => {
    if (disposed) return;
    fn(Math.min(0.05, (now - last) / 1000), now);
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/**
 * A raw 0→1 driver. util.js's 'tween' snaps under reduced motion, which is
 * correct everywhere else in the game — but the die handles reduced motion
 * itself (a 250ms cross-fade), so it needs a timeline that still runs. It also
 * honours the tap-to-skip latch, which 'tween' has no concept of.
 */
function frames(ms, fn) {
  return new Promise((res) => {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const step = (now) => {
      if (disposed) { res(); return; }
      let t = clamp((now - t0) / (ms || 1), 0, 1);
      if (skip) t = 1;
      fn(t);
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
