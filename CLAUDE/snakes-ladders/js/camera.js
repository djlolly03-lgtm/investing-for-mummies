/* camera.js — the camera director.
 *
 * The number one way a 3D board game fails is by disorienting the player, so this
 * module's whole job is to be almost invisible. It owns exactly one thing: where
 * 'scene.camera' is, every frame. It renders no DOM, injects no CSS, and holds no
 * game state.
 *
 * DESIGN.md §6.2 is the law here, and the rule underneath all of it is:
 *   the camera must ALWAYS return to a pose where the whole board is legible
 *   within CFG.timing.cameraLegibleBy (900 ms) of an action ending.
 *
 * How it is built
 * ───────────────
 * The pose is four scalars around a look-at target — azimuth, elevation, distance,
 * target — composed from four ADDITIVE layers, so nothing ever fights anything else:
 *
 *   base   scripted moves (overview / focusCell / dramatic / finishShot / follow)
 *   user   the player's drag + pinch offsets, which spring back to zero
 *   idle   a few tenths of a degree of slow parallax so a still board breathes
 *   shake  a decaying, hard-capped translation for the snake bite only
 *
 * Framing is COMPUTED, never hard-coded: 'computeFit()' solves for the exact dolly
 * distance that puts 'framingBox()' — the 100 squares plus a token of headroom,
 * NOT the wooden frame, which is allowed to bleed off the edges — inside the safe
 * rect for the current viewport aspect. A 390x844 phone lands around 52 world
 * units; a 1920x1080 projector around 34. Both frame every one of the 100
 * squares, and 'getPose().framing' reports how much of the screen they fill.
 *
 * 'surfaceMargin()' returns the smallest gap, in NDC, between the PLAYING
 * SURFACE's outline and the safe rect. Every non-overview move is bisected
 * against it, so "no square is ever cropped, on any device, at any moment" is a
 * measured guarantee and not an intention. ('boardCoverage()' — 70% of the
 * square CENTRES inside the band — was the old law and was far too weak: a 35%
 * dolly-in satisfies it while running the whole right-hand column off the
 * screen. It survives only as a reported number on getPose().)
 */

import { CFG, dur } from './config.js';
import { clamp, lerp, damp, ease, prefersReducedMotion } from './util.js';

/* ═══════════════════════════════════════════════════════════════════════════
   0. Constants pulled out of CFG once. Feel numbers live in config.js.
   ═══════════════════════════════════════════════════════════════════════════ */

const C   = CFG.camera;
const B   = CFG.board;
const L   = CFG.layout;
const DEG = Math.PI / 180;

const REST_AZ = C.azimuthDeg   * DEG;
const REST_EL = C.elevationDeg * DEG;
const EL_MIN  = C.pitchMinDeg  * DEG;   // clamps scripted moves AND user tilt
const EL_MAX  = C.pitchMaxDeg  * DEG;

/* §6.2 says ±25° yaw; the director brief says ±22°. 22 satisfies both. */
const YAW_LIMIT   = Math.min(C.yawLimitDeg, 22) * DEG;
const ZOOM_LIMIT  = [0.80, 1.22];     // multiples of the fitted rest distance
const REST_IDLE   = 2500;             // ms of no input before the user offset springs back
const DRAG_SLOP   = 8;                // px before a touch becomes a drag, so taps survive
const TAP_MS      = 320;              // double-tap window
const TAP_SLOP    = 28;               // px
const RESET_MS    = Math.round(CFG.timing.cameraSpringBack * 0.4);  // double-tap reset
const SHAKE_MAX_MS= 400;              // motion sickness is a real risk on a phone

/* The margin, in NDC, that a scripted move must leave between the outermost
   square and the safe rect. It is what the idle parallax is allowed to spend:
   1.6° of azimuth moves a corner column by ~0.012 NDC, so a move clamped to
   exactly zero margin would be cropped a second later by the drift. Capped at
   whatever the REST pose itself achieves — a move is never held to a standard
   the resting board does not meet. */
const BAND_GUARD  = 0.014;

/* The board's bounding box, in world units. CONTRACT.md fixes the coordinate
   system: X,Z ∈ [-5,+5], top surface at y=0, one cell = one unit. */
const HALF   = B.half + B.border;                       // 5.45 — includes the wooden frame
const TOP_Y  = B.rowRise * (B.size - 1) + CFG.tokens.height + 0.25;  // a token at row 9
const BOT_Y  = -B.thickness;

/* ── What the camera actually FRAMES (ART-DIRECTION v2 §6) ────────────────────
   v1 fitted the whole board OBJECT: the 0.45-unit wooden frame on all four
   sides, the 0.35 of board thickness underneath, and 1.68 units of token
   headroom above row 9. On a portrait phone the WIDTH sets the dolly, so those
   allowances were bought entirely out of the board's on-screen size — the
   playfield came out at 85.6% of the width and 30.4% of the height, ringed by
   dead table. A board game photographed on a table does not politely fit its
   frame inside the print; the frame runs off the edge.

   So the framing box is now the PLAYFIELD ONLY — x,z ∈ [-5,+5], the exact
   extent of the 100 squares, plus one token of headroom so a piece standing on
   row 9 is never clipped. The wooden border and the board's edge thickness are
   allowed to bleed past the safe rect. "Never crop a square" is still absolute
   and is now measured on the squares' own EDGES by surfaceMargin(); "never crop
   a millimetre of frame" was never a rule, and it was costing 9% of the board's
   width.

   The headroom is a WEDGE, not a slab. A token's head sits at
   'rowRise*row + tokens.height', so only the FAR edge needs the full 1.43
   units; the near edge is row 0 and needs 0.62. A slab demanded 1.43 at
   z = +5 too — and on a portrait phone that phantom corner, being the closest
   point in the box to the camera, was the corner that SET THE DOLLY. The board
   was being pushed back to make room for a token that cannot exist. Removing
   it is worth 1.4% of the board's width and, at the rest elevation, 0.6% of
   the screen's height, for nothing. */
const FIT_HX  = B.half;                                  // squares only — the frame bleeds
const FIT_Y1  = B.rowRise * (B.size - 1) + CFG.tokens.height;   // far edge: a token on row 9
const FIT_Y1N = CFG.tokens.height;                              // near edge: a token on row 0

/* The board sits a touch high in frame so the dice tray at the bottom of the
   screen is never fighting the board for the same pixels (§7.5). */
const REST_TZ = 0.60;
/* §7.5 says 92% of the width. On a phone the width is the only thing that sets
   how big the board can be, so it is worth the extra 4%. */
const PORTRAIT_WIDTH_PCT = 0.96;
/* 0 = board centred in the band, 1 = pinned to its bottom edge. */
const BOARD_BIAS = 0.62;
const REST_TY = C.target[1];

/* Rest elevation, per orientation. See restEl() for the arithmetic. The two
   numbers pull in OPPOSITE directions because the binding constraint is
   different in each orientation, which is the thing v1 got wrong by shipping
   one number for both. */
const PORTRAIT_EL_DEG  = 72;
const LANDSCAPE_EL_DEG = 36;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Pure geometry — no DOM, no THREE. Exported so tests/camera.test.mjs can
      assert the framing without a browser.
   ═══════════════════════════════════════════════════════════════════════════ */

/* board3d.cellToWorld, if game.js injects it. Declared HERE, above the first
   caller: the CELLS table below is built during module evaluation. */
let _cellResolver = null;

/** Centre of square 'n', per CONTRACT.md. 'n = 0' is the off-board start pad.
 *  Boustrophedon: 1 is bottom-left (+Z is toward the camera), 100 is top-left. */
export function cellToWorld(n) {
  if (_cellResolver) return _cellResolver(n);
  if (!n) return { x: B.startPad.x, y: B.startPad.y, z: B.startPad.z };
  const i = clamp(Math.round(n), 1, B.size * B.size) - 1;
  const row = Math.floor(i / B.size);
  let   col = i % B.size;
  if (row % 2 === 1) col = B.size - 1 - col;          // odd rows run right→left
  return {
    x: -B.half + B.cell * (col + 0.5),
    y: B.rowRise * row,
    z:  B.half - B.cell * (row + 0.5),
  };
}

/** Orthonormal camera basis for a spherical pose.
 *  'dir' points target→camera, so position = target + dir * distance. */
export function basis(az, el) {
  const ca = Math.cos(az), sa = Math.sin(az);
  const ce = Math.cos(el), se = Math.sin(el);
  return {
    dir:   [ sa * ce,  se,  ca * ce],
    fwd:   [-sa * ce, -se, -ca * ce],
    right: [ ca,       0,  -sa      ],
    up:    [-sa * se,  ce,  -ca * se],
  };
}

const dot3 = (a, x, y, z) => a[0] * x + a[1] * y + a[2] * z;

/** Half-tangents of the frustum, shrunk by the safe-frame fractions. */
function tans(aspect, safe) {
  const ty = Math.tan(C.fov * 0.5 * DEG);
  return { txFull: ty * aspect, tyFull: ty, tx: ty * aspect * safe.x, ty: ty * safe.y };
}

/**
 * Smallest distance that keeps ONE corner inside the safe band vertically.
 * The band is not symmetric about the screen centre: 'safe.oy' is where its
 * centre sits in NDC, because the HUD strip above and the dice tray below are
 * different heights (§7.5). Both edges give a closed-form lower bound on 'd'.
 */
function fitY(u, behind, t, safe) {
  const oy = safe.oy || 0, sy = safe.y;
  const top = oy + sy, bot = oy - sy;          // NDC edges of the band
  let d = -Infinity;
  if (top >  1e-4) d = Math.max(d, u / (top * t.tyFull) - behind);
  if (bot < -1e-4) d = Math.max(d, u / (bot * t.tyFull) - behind);
  if (!Number.isFinite(d)) d = Math.abs(u) / t.ty - behind;   // degenerate band
  return d;
}

/**
 * Solve for the smallest dolly distance that puts every corner of 'box' inside
 * the safe rect. Exact, not iterative: with the view direction fixed, a corner's
 * depth is 'd + v·fwd', so each corner gives a closed-form lower bound on 'd'.
 *
 * @param {{az,el,tx,ty,tz}} pose
 * @param {number} aspect  viewport width / height
 * @param {{x,y}}  safe    fraction of the viewport the board may occupy
 * @param {{x,y,z}} box    half-extents + y range: {hx, y0, y1, z0, z1}, plus an
 *                         optional 'y1n' — the ceiling at the NEAR edge (z1)
 *                         when the box is a wedge rather than a slab.
 */
export function computeFit(pose, aspect, safe, box = boardBox()) {
  const { right, up, fwd } = basis(pose.az, pose.el);
  const t = tans(aspect, safe);
  let d = C.fit.minDistance;
  for (const cx of [-box.hx, box.hx])
    for (const cz of [box.z0, box.z1])
      for (const cy of [box.y0, (box.y1n != null && cz === box.z1) ? box.y1n : box.y1]) {
        const vx = cx - pose.tx, vy = cy - pose.ty, vz = cz - pose.tz;
        const behind = dot3(fwd, vx, vy, vz);
        const ax = Math.abs(dot3(right, vx, vy, vz));
        d = Math.max(d, ax / t.tx - behind, fitY(dot3(up, vx, vy, vz), behind, t, safe));
      }
  return clamp(d, C.fit.minDistance, C.fit.maxDistance);
}

/** The board OBJECT's full bounds — frame, thickness, token headroom and all. */
export function boardBox() {
  return { hx: HALF, y0: BOT_Y, y1: TOP_Y, z0: -HALF, z1: HALF };
}

/** What the camera frames: the 100 squares, plus one token of headroom —
 *  1.43 units of it at the far edge (row 9) tapering to 0.62 at the near edge
 *  (row 0), because that is where a token's head actually is. */
export function framingBox() {
  return { hx: FIT_HX, y0: 0, y1: FIT_Y1, y1n: FIT_Y1N, z0: -FIT_HX, z1: FIT_HX };
}

/* The 100 square centres, precomputed once — the coverage probe's sample set.
   Using cell centres (not a grid) means "coverage" reads literally as
   "how many of the hundred squares can she see". */
const CELLS = (() => {
  const a = [];
  for (let n = 1; n <= 100; n++) { const p = cellToWorld(n); a.push(p.x, p.y, p.z); }
  return a;
})();

/**
 * Fraction of the 100 square centres inside the safe rect for a candidate pose.
 * 1.0 at overview, by construction. Reported on getPose() and asserted by the
 * tests; the moves themselves are bisected against surfaceMargin(), which is
 * strictly stronger — it counts square EDGES, not centres.
 */
export function boardCoverage(pose, aspect, safe) {
  const { right, up, fwd } = basis(pose.az, pose.el);
  const t = tans(aspect, safe);
  let seen = 0;
  for (let i = 0; i < CELLS.length; i += 3) {
    const vx = CELLS[i] - pose.tx, vy = CELLS[i + 1] - pose.ty, vz = CELLS[i + 2] - pose.tz;
    const depth = pose.dist + dot3(fwd, vx, vy, vz);
    if (depth <= C.near) continue;
    const nx = dot3(right, vx, vy, vz) / (depth * t.txFull);
    const ny = dot3(up,    vx, vy, vz) / (depth * t.tyFull);
    if (Math.abs(nx) <= safe.x && Math.abs(ny - (safe.oy || 0)) <= safe.y) seen++;
  }
  return seen / 100;
}

const blendPose = (a, b, k) => ({
  az:   lerp(a.az,   b.az,   k),
  el:   lerp(a.el,   b.el,   k),
  dist: lerp(a.dist, b.dist, k),
  tx:   lerp(a.tx,   b.tx,   k),
  ty:   lerp(a.ty,   b.ty,   k),
  tz:   lerp(a.tz,   b.tz,   k),
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. State
   ═══════════════════════════════════════════════════════════════════════════ */

let cam = null;                 // the THREE.PerspectiveCamera, owned by scene.js
let canvas = null;
let started = false;
let externallyDriven = false;   // set once someone calls update(dt) by hand

let aspect = 0.5;
let safe   = { x: 0.92, y: 0.62, oy: 0 };
let safeOverride = null;

/** the rest pose — recomputed on every resize */
let rest = { az: REST_AZ, el: REST_EL, dist: C.distance, tx: 0, ty: REST_TY, tz: REST_TZ };
/** the live base pose, driven by scripted moves */
let P = { ...rest };

/** the in-flight scripted move */
let mv = null;                  // { from, to, t0, ms, fn, resolve }
let director = 0;               // bumped by every new scripted sequence; cancels the old

/** user gesture layer — additive offsets that spring back to zero */
const U = { az: 0, el: 0, zoom: 1, gAz: 0, gEl: 0, gZoom: 1, active: false, since: 0 };
let springing = null;           // { from:{az,el,zoom}, t0, ms }

/** idle drift */
let idleGain = 0;

/** shake */
let shk = null;                 // { amp, ms, t0 }

/** follow */
let followId = null;
let tokenProvider = null;       // (playerId) -> {x,y,z} | null
const playerCells = new Map();  // playerId -> cell, a cheap fallback source

/** projector / workshop lock — §6.2 "Camera locked at default. All push-ins disabled." */
let locked = false;
/** gestures. See the DEVIATION note in the header of §6 below. */
const gestures = { drag: true, pinch: true, keyboard: true, enabled: true };

const rm = () => prefersReducedMotion();
const easeFn = (name) => ease[name] || ease.inOut;

/* ═══════════════════════════════════════════════════════════════════════════
   3. Framing
   ═══════════════════════════════════════════════════════════════════════════ */

function readViewport() {
  let w = 0, h = 0;
  if (canvas && canvas.clientWidth)  { w = canvas.clientWidth; h = canvas.clientHeight; }
  if ((!w || !h) && typeof window !== 'undefined') { w = window.innerWidth; h = window.innerHeight; }
  if (!w || !h) { w = 390; h = 844; }
  aspect = w / h;
  if (safeOverride) { safe = { ...safeOverride }; return; }
  /* Portrait is the shipped layout (§7.5): the board is 92% of the width and lives
     in the middle 62% of the height, which is exactly the gap between the standings
     strip and the dice tray. Landscape (a projector, a tablet) has no such tray, so
     it gets a plain symmetric margin instead of a portrait band it does not have. */
  /* boardBandPct is [top, bottom] as fractions of the viewport from the TOP.
     NDC runs +1 at the top, so the band's half-height is (b1-b0) and its centre
     is 1 - (b0+b1), both halved into NDC units. */
  const band = (b0, b1) => ({ y: (b1 - b0), oy: 1 - (b0 + b1) });
  safe = aspect < 1
    ? { x: PORTRAIT_WIDTH_PCT, ...band(L.boardBandPct[0], L.boardBandPct[1]) }
    : { x: 0.88, ...band(0.13, 0.87) };
}

/**
 * The rest elevation — the single biggest lever on how much of the screen the
 * board occupies, and the ONE number that must be different in the two
 * orientations, because the constraint that binds is different in each.
 *
 * PORTRAIT (phone, tablet). The WIDTH sets the fit distance: ten columns have
 * to reach across 390 px and there is nothing else to trade. A square board
 * seen at elevation E projects to sin(E) of its own on-screen width, so
 * elevation is the only thing that converts dead table into board. 38° gave
 * 28% of the height, 48° gave 33%, 64° gave 39.5%; PORTRAIT_EL_DEG is now 72,
 * which reads 41.7%. The cost is that a vertical unit projects cos(E) — 0.44 at
 * 64°, 0.31 at 72° — but the pieces are 0.62 units tall and the board rail 0.35,
 * so at 72° a token still stands ~14 px proud of the tiles on a phone and the
 * front rail still shows its thickness. Rendered at 64 / 68 / 72 / 76 and
 * compared: 76 is where the rail finally goes to a line, so 72 is the stop
 * before that.
 *
 * The hard ceiling, stated once so nobody hunts for the missing five per cent:
 * with all ten columns on a 390x844 screen the playing surface cannot project
 * taller than about 44% of the height even at a dead plan view (E = 90 gives
 * width x aspect = 0.96 x 0.462, halved again by perspective on the far row).
 * ART-DIRECTION §6 asks for 45%. It is not reachable without cropping a column,
 * and cropping a square is the one thing this module may never do. 72° gets the
 * surface to 41.7% and the board OBJECT, frame and all, to ~46%.
 *
 * LANDSCAPE (projector, laptop, tablet turned sideways). Everything above
 * inverts. There the HEIGHT band sets the fit, so tilting UP makes the board
 * taller per unit of distance, forces the camera BACK, and the board gets
 * NARROWER — which is exactly what shipped: 48° on a 1920x1080 projector left
 * the board at 44.7% of the width with 1060 px of bare table either side of it.
 * Flattening is the lever here, and it is nearly free, because the numerals are
 * billboarded sprites that do not foreshorten: at LANDSCAPE_EL_DEG (36) the
 * board is 59% of the width, the numerals are drawn a third bigger, and the
 * board covers a third more of the frame. 36 and not 30: a token 0.62 units tall
 * hides 0.62/tan(E) of a cell behind it — 0.85 of a cell at 36°, 1.07 at 30° —
 * and past about a cell the far row starts disappearing behind the near one.
 *
 * A side benefit worth naming: landscape rest used to sit ON pitchMaxDeg (48),
 * so the drag-tilt range in landscape was exactly zero degrees and the ladder
 * lift was silently clamped to nothing. At 36° both work again, inside the
 * unchanged [30, 48] clamp.
 */
function restEl() {
  return (aspect < 1 ? PORTRAIT_EL_DEG : LANDSCAPE_EL_DEG) * DEG;
}

/* The pitch clamps. CFG.camera.pitchMaxDeg (48) is the ceiling for every
   scripted move and every gesture, but the portrait REST pose sits above it, so
   the ceiling has to admit the pose it is clamping or refit() would be undone
   one line after it ran. Landscape is untouched at [30, 48] — its rest pose has
   moved DOWN into that range rather than out of it. Portrait is [30, 72] with
   the rest pose ON the ceiling, which is what portrait has always been. */
const elMax = () => Math.max(EL_MAX, restEl());
const elMin = () => Math.min(EL_MIN, restEl());

/** Recompute the rest pose for the current viewport. Cheap; safe to call often. */
function refit() {
  readViewport();
  const oy = safe.oy || 0;
  const el = restEl();
  const box = framingBox();
  let base = { az: REST_AZ, el, tx: 0, ty: REST_TY, tz: REST_TZ };
  let d = computeFit(base, aspect, safe, box);

  /* Slide the target along the camera's own up-axis so the board's projected
     centre lands in the MIDDLE OF THE BAND rather than the middle of the screen.
     Without this 'oy' can only change the fit distance, and on a portrait phone —
     where width sets that distance — it would do nothing at all. */
  if (Math.abs(oy) > 1e-3) {
    const { up } = basis(base.az, base.el);
    const ty = Math.tan(C.fov * 0.5 * DEG);
    for (let i = 0; i < 3; i++) {
      const k = oy * d * ty;
      base = { ...base, ty: REST_TY - up[1] * k, tz: REST_TZ - up[2] * k };
      d = computeFit(base, aspect, safe, box);
    }
  }

  /* On a portrait phone the WIDTH sets the distance, so the board ends up
     shorter than the band it was fitted into. Centred, that leaves two equal
     strips of bare table. Sliding it toward the bottom of the band instead
     puts board, die, ribbon and the roll plaque into one continuous column and
     leaves the spare table in one place, under the HUD, where it reads as the
     room the board is sitting in rather than as a gap. */
  const slack = bandSlack({ ...base, dist: d });
  if (slack > 0.02) {
    const { up } = basis(base.az, base.el);
    const k = -slack * BOARD_BIAS * d * Math.tan(C.fov * 0.5 * DEG);
    base = { ...base, ty: base.ty - up[1] * k, tz: base.tz - up[2] * k };
  }

  /* Belt and braces: if the closed-form fit ever left a square outside the safe
     rect (a pathological aspect, a clamped maxDistance), push out until it does not. */
  for (let i = 0; i < 8 && boardCoverage({ ...base, dist: d }, aspect, safe) < 1; i++) {
    if (d >= C.fit.maxDistance) break;
    d = Math.min(C.fit.maxDistance, d * 1.04);
  }
  rest = { ...base, dist: d };
}

/**
 * Spare NDC height, per side, between the PLAYING SURFACE's projection and the
 * band. Measured on the surface's own outline — the four corners of every row's
 * quad — not on the cell centres, because the bias below shifts the board by a
 * fraction of this and a half-cell error at each end is what would push row 1
 * under the lesson ribbon.
 */
function surfaceRows(fn) {
  const h = B.half, rise = B.rowRise;
  for (let r = 0; r < B.size; r++) {
    const y = rise * r, zN = h - B.cell * r, zF = h - B.cell * (r + 1);
    for (const x of [-h, 0, h]) for (const z of [zN, zF]) fn(x, y, z);
  }
}

function bandSlack(pose) {
  const { up, fwd } = basis(pose.az, pose.el);
  const tyy = Math.tan(C.fov * 0.5 * DEG);
  let lo = Infinity, hi = -Infinity;
  surfaceRows((x, y, z) => {
    const vx = x - pose.tx, vy = y - pose.ty, vz = z - pose.tz;
    const depth = pose.dist + dot3(fwd, vx, vy, vz);
    if (depth <= C.near) return;
    const ny = dot3(up, vx, vy, vz) / (depth * tyy);
    if (ny < lo) lo = ny;
    if (ny > hi) hi = ny;
  });
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  return safe.y - (hi - lo) / 2;
}

/**
 * The playing surface's on-screen bounding box, as fractions of the viewport.
 * ART-DIRECTION v2 §6 states the framing target as a percentage of screen
 * height, so the module reports the number it is judged on rather than leaving
 * it to be eyeballed off a screenshot. Exposed through getPose().framing.
 */
export function surfaceFrame(pose = rest) {
  const { right, up, fwd } = basis(pose.az, pose.el);
  const t = tans(aspect, safe);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  surfaceRows((x, y, z) => {
    const vx = x - pose.tx, vy = y - pose.ty, vz = z - pose.tz;
    const depth = pose.dist + dot3(fwd, vx, vy, vz);
    if (depth <= C.near) return;
    const nx = dot3(right, vx, vy, vz) / (depth * t.txFull);
    const ny = dot3(up,    vx, vy, vz) / (depth * t.tyFull);
    if (nx < x0) x0 = nx; if (nx > x1) x1 = nx;
    if (ny < y0) y0 = ny; if (ny > y1) y1 = ny;
  });
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return { widthPct: 0, heightPct: 0 };
  return { widthPct: (x1 - x0) / 2, heightPct: (y1 - y0) / 2 };
}

/**
 * The smallest gap, in NDC, between the playing surface and the safe rect under
 * 'pose'. Positive means every square is inside the band with room to spare;
 * negative means at least one square is outside it, and on a phone "outside the
 * band" is usually "off the screen".
 *
 * Measured on the row quads' own corners. Each row is planar and its projection
 * is convex, so every square in that row lies inside the projected quad, and the
 * margin — a concave function over a convex polygon — takes its minimum at a
 * corner. Sixty points therefore certify all four hundred square corners.
 */
function surfaceMargin(pose) {
  const { right, up, fwd } = basis(pose.az, pose.el);
  const t = tans(aspect, safe);
  const oy = safe.oy || 0;
  let m = Infinity;
  surfaceRows((x, y, z) => {
    const vx = x - pose.tx, vy = y - pose.ty, vz = z - pose.tz;
    const depth = pose.dist + dot3(fwd, vx, vy, vz);
    if (depth <= C.near) { m = -Infinity; return; }
    const nx = dot3(right, vx, vy, vz) / (depth * t.txFull);
    const ny = dot3(up,    vx, vy, vz) / (depth * t.tyFull);
    const mx = safe.x - Math.abs(nx), my = safe.y - Math.abs(ny - oy);
    if (mx < m) m = mx;
    if (my < m) m = my;
  });
  return m;
}

/** Furthest blend from 'from' toward 'to' that still leaves 'g' of margin. */
function bisectBand(from, to, g) {
  if (surfaceMargin(to) >= g) return to;
  let lo = 0, hi = 1;
  for (let i = 0; i < 12; i++) {
    const k = (lo + hi) / 2;
    if (surfaceMargin(blendPose(from, to, k)) >= g) lo = k; else hi = k;
  }
  return lo > 0 ? blendPose(from, to, lo) : from;
}

/**
 * The law: no scripted move may put any part of any square outside the safe
 * band. Everything except overview() goes through here.
 *
 * Two bisections, not one, and in this order. A focus move is a SHAPE (where
 * the camera stands: azimuth, elevation, dolly) and an AIM (what it is pointed
 * at). One bisection over both would throw away the pan the band can afford
 * merely because the dolly-in on the same segment cannot be afforded — and the
 * dolly is always the expensive half. So the shape is fitted first, and the aim
 * is then walked as far as whatever is left will allow.
 *
 * The guard is capped at the rest pose's own margin: on a phone the board now
 * fills 95% of a 96% band, so a move is never held to a standard the resting
 * board itself does not meet. The honest consequence, stated plainly: when the
 * board already fills the frame there is nowhere to zoom to, and focusCell()
 * correctly becomes a few pixels of pan or nothing at all. A camera that holds
 * still on a full-screen board is the good outcome, not a lost feature.
 */
function clampToBand(goal, guard = BAND_GUARD) {
  const g = Math.min(guard, surfaceMargin(rest));
  const shape = bisectBand(rest, { ...rest, az: goal.az, el: goal.el, dist: goal.dist }, g);
  return bisectBand(shape, { ...shape, tx: goal.tx, ty: goal.ty, tz: goal.tz }, g);
}

/** World units per CSS pixel at the board plane, for the §6.2 "140 px" pan. */
function worldPerPx(dist) {
  const h = (canvas && canvas.clientHeight) ||
            (typeof window !== 'undefined' ? window.innerHeight : 844) || 844;
  return (2 * dist * Math.tan(C.fov * 0.5 * DEG)) / h;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. The scripted-move engine — re-entrant and blending, never jumping
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ease the base pose to 'goal' over 'ms'.
 * Re-entrancy: a second call mid-move rebases 'from' onto the LIVE pose, so the
 * camera is positionally continuous. An interrupted move also switches to
 * 'ease.out' (which starts at full velocity) instead of 'inOut', so there is no
 * visible hitch where the old move was cut.
 */
function moveTo(goal, ms, name = CFG.easing.camera) {
  const interrupted = !!mv;
  if (mv) { const r = mv.resolve; mv = null; r && r(); }
  if (!ms || ms <= 0 || rm()) { P = { ...P, ...goal }; return Promise.resolve(); }
  return new Promise((resolve) => {
    mv = {
      from: { ...P }, to: { ...P, ...goal },
      t0: now(), ms,
      fn: interrupted ? ease.out : easeFn(name),
      resolve,
    };
  });
}

function stepMove(t) {
  if (!mv) return;
  const k = clamp((t - mv.t0) / mv.ms, 0, 1);
  const e = mv.fn(k);
  P = blendPose(mv.from, mv.to, e);
  if (k >= 1) { const r = mv.resolve; mv = null; r && r(); }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ═══════════════════════════════════════════════════════════════════════════
   5. Composition + the frame loop
   ═══════════════════════════════════════════════════════════════════════════ */

let rafId = 0, lastT = 0;

function loop(t) {
  rafId = requestAnimationFrame(loop);
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
  lastT = t;
  frame(t, dt);
}

/** Public per-frame step. Calling this yourself detaches the internal rAF. */
export function update(dt = 0.016) {
  if (!externallyDriven) {
    externallyDriven = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  frame(now(), dt);
}

function frame(t, dt) {
  if (!cam) return;
  stepMove(t);
  stepFollow(dt);
  stepUser(t, dt);
  stepIdle(t, dt);
  compose(t);
}

/* ── follow ─────────────────────────────────────────────────────────────── */

function followPoint() {
  if (followId == null) return null;
  if (tokenProvider) { const p = tokenProvider(followId); if (p) return p; }
  if (playerCells.has(followId)) return cellToWorld(playerCells.get(followId));
  return null;
}

function stepFollow(dt) {
  if (followId == null || locked || rm() || mv) return;
  const p = followPoint();
  if (!p) return;
  /* Keep the token inside the lower-middle band (§6.2, CFG.camera.followBandY).
     Only correct when it drifts out — a camera that tracks every hop is worse
     than one that holds still. */
  const goal = clampToBand(desiredFocus(p, 1));
  const band = C.followBandY;
  const ndc = ndcOf(p, currentPose());
  const outside = !ndc || ndc.y < -(band[1] * 2 - 1) || ndc.y > -(band[0] * 2 - 1);
  const lambda = (outside ? 3.0 : 0.9) * (1000 / Math.max(1, CFG.timing.cameraFollow));
  P.tx = damp(P.tx, goal.tx, lambda, dt);
  P.tz = damp(P.tz, goal.tz, lambda, dt);
  P.dist = damp(P.dist, goal.dist, lambda * 0.7, dt);
}

/** Screen-space position of a world point under a pose, in NDC. */
function ndcOf(p, pose) {
  const { right, up, fwd } = basis(pose.az, pose.el);
  const vx = p.x - pose.tx, vy = (p.y ?? 0) - pose.ty, vz = p.z - pose.tz;
  const depth = pose.dist + dot3(fwd, vx, vy, vz);
  if (depth <= C.near) return null;
  const t = tans(aspect, safe);
  return { x: dot3(right, vx, vy, vz) / (depth * t.txFull),
           y: dot3(up,    vx, vy, vz) / (depth * t.tyFull) };
}

/** The desired (unclamped) focus pose for a world point.
 *  'strength' 0..1 scales both the pan and the dolly. */
function desiredFocus(p, strength = 1) {
  const panWorld = C.turnPanPx * worldPerPx(rest.dist) * strength;
  const dx = p.x - rest.tx, dz = p.z - rest.tz;
  const len = Math.hypot(dx, dz) || 1;
  const k = Math.min(1, panWorld / len);
  /* CFG.camera.focusDistance is the DESIRE (about 65% of overview). The 70%
     coverage rule below is the LAW, and normally pulls this back to ~0.85. */
  const ratio = lerp(1, C.focusDistance / C.distance, strength);
  return {
    az: rest.az, el: rest.el,
    dist: rest.dist * ratio,
    tx: rest.tx + dx * k, ty: rest.ty, tz: rest.tz + dz * k,
  };
}

/* ── user gesture layer ─────────────────────────────────────────────────── */

function stepUser(t, dt) {
  if (U.active) { U.az = U.gAz; U.el = U.gEl; U.zoom = U.gZoom; return; }
  if (springing) {
    const k = clamp((t - springing.t0) / springing.ms, 0, 1);
    const e = ease.inOut(k);
    U.az   = lerp(springing.from.az,   0, e);
    U.el   = lerp(springing.from.el,   0, e);
    U.zoom = lerp(springing.from.zoom, 1, e);
    if (k >= 1) springing = null;
    return;
  }
  /* idle for REST_IDLE after the last touch, then ease home */
  if ((U.az || U.el || U.zoom !== 1) && U.since && t - U.since > REST_IDLE) {
    springBack(dur('cameraSpringBack', rm()));
  }
}

function springBack(ms) {
  if (!ms || rm()) { U.az = U.el = 0; U.zoom = 1; U.gAz = U.gEl = 0; U.gZoom = 1; springing = null; return; }
  springing = { from: { az: U.az, el: U.el, zoom: U.zoom }, t0: now(), ms };
  U.gAz = 0; U.gEl = 0; U.gZoom = 1;
}

/* ── idle drift ─────────────────────────────────────────────────────────── */
/* A few tenths of a degree of slow parallax on incommensurable periods, so a
   still board never looks frozen and nobody consciously notices why. */

function stepIdle(t, dt) {
  const want = (rm() || locked || mv || U.active || springing || followId != null) ? 0 : 1;
  idleGain = damp(idleGain, want, 1.4, dt);
  if (idleGain < 0.001) { idleGain = 0; }
}

function idleOffset(t) {
  if (idleGain <= 0) return { az: 0, el: 0, tz: 0 };
  const s = t / 1000;
  return {
    az: (Math.sin(s * 0.113) * 1.05 + Math.sin(s * 0.047 + 1.7) * 0.55) * DEG * idleGain,
    el: (Math.sin(s * 0.073 + 0.9) * 0.42) * DEG * idleGain,
    tz: Math.sin(s * 0.061 + 2.3) * 0.035 * idleGain,
  };
}

/* ── shake ──────────────────────────────────────────────────────────────── */
/* Smooth, band-limited and hard-capped. Per-frame random is what makes people
   queasy; two decaying sines at ~12 and ~19 Hz read as a knock on the table. */

function shakeOffset(t) {
  if (!shk) return null;
  const k = (t - shk.t0) / shk.ms;
  if (k >= 1) { shk = null; return null; }
  const decay = (1 - k) * (1 - k);
  const s = (t - shk.t0) / 1000;
  return {
    x: (Math.sin(s * 75.4) * 0.62 + Math.sin(s * 119.3 + 1.1) * 0.38) * shk.amp * decay,
    y: (Math.sin(s * 96.1 + 0.7) * 0.55 + Math.sin(s * 61.8 + 2.4) * 0.45) * shk.amp * decay * 0.7,
  };
}

/* ── compose ────────────────────────────────────────────────────────────── */

function currentPose() {
  const idle = idleOffset(lastT || now());
  return {
    az: P.az + U.az + idle.az,
    el: clamp(P.el + U.el + idle.el, elMin(), elMax()),
    dist: clamp(P.dist * U.zoom, C.fit.minDistance, C.fit.maxDistance),
    tx: P.tx, ty: P.ty, tz: P.tz + idle.tz,
  };
}

function compose(t) {
  const idle = idleOffset(t);
  const az = P.az + U.az + idle.az;
  const el = clamp(P.el + U.el + idle.el, elMin(), elMax());
  const dist = clamp(P.dist * U.zoom, C.fit.minDistance, C.fit.maxDistance);
  const tx = P.tx, ty = P.ty, tz = P.tz + idle.tz;

  const { dir, right, up } = basis(az, el);
  let px = tx + dir[0] * dist, py = ty + dir[1] * dist, pz = tz + dir[2] * dist;
  let lx = tx, ly = ty, lz = tz;

  const s = shakeOffset(t);
  if (s) {
    /* Mostly translation with a whisper of rotation, so the board rocks on the
       table rather than the world tilting. */
    px += right[0] * s.x + up[0] * s.y;  py += right[1] * s.x + up[1] * s.y;  pz += right[2] * s.x + up[2] * s.y;
    lx += (right[0] * s.x + up[0] * s.y) * 0.35;
    ly += (right[1] * s.x + up[1] * s.y) * 0.35;
    lz += (right[2] * s.x + up[2] * s.y) * 0.35;
  }

  cam.position.set(px, py, pz);
  cam.lookAt(lx, ly, lz);

  /* scene.js owns resize, but the projection must agree with the framing we just
     solved or the fit is a lie. Both write identical values, so this is a no-op
     whenever scene.js got there first. */
  if (cam.isPerspectiveCamera) {
    let dirty = false;
    if (cam.fov !== C.fov)   { cam.fov = C.fov; dirty = true; }
    if (cam.near !== C.near) { cam.near = C.near; dirty = true; }
    if (cam.far !== C.far)   { cam.far = C.far; dirty = true; }
    if (Math.abs((cam.aspect || 0) - aspect) > 1e-4) { cam.aspect = aspect; dirty = true; }
    if (dirty) cam.updateProjectionMatrix();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. Public API — CONTRACT.md §camera.js
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {THREE.PerspectiveCamera} camera  the camera scene.js created
 * @param {object} [opts] { canvas, locked, gestures }
 */
export function initCamera(camera, opts = {}) {
  disposeCamera();
  cam = camera;
  canvas = opts.canvas ||
    (typeof document !== 'undefined' ? document.getElementById('snl-canvas') : null);
  locked = !!opts.locked;
  if (opts.gestures) Object.assign(gestures, opts.gestures);

  refit();
  P = { ...rest };
  U.az = U.el = U.gAz = U.gEl = 0; U.zoom = U.gZoom = 1; U.active = false; U.since = 0;
  mv = null; shk = null; springing = null; followId = null; idleGain = 0;
  director++;

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    bindGestures();
  }
  compose(now());
  if (!started && !externallyDriven && typeof requestAnimationFrame === 'function') {
    started = true; lastT = 0; rafId = requestAnimationFrame(loop);
  }
  return getPose();
}

/** The default rest pose: the whole 10x10 board legible, dice space below it. */
export function overview(ms) {
  director++;
  followId = null;
  const d = rm() ? 0 : (ms ?? CFG.timing.cameraEase);
  return moveTo({ ...rest }, d, CFG.easing.camera);
}

/**
 * A small, gentle dolly toward square 'n'. Pans by CFG.camera.turnPanPx worth of
 * world distance and closes in — then bisects the whole thing against the 70%
 * coverage rule, so the board is never lost.
 */
export function focusCell(n, ms) {
  director++;
  if (locked) return overview(ms);
  const d = rm() ? 0 : (ms ?? CFG.timing.cameraFollow);
  const goal = clampToBand(desiredFocus(cellToWorld(n), 1));
  return moveTo(goal, d, C.focusEase);
}

/** Track a player's token. Off returns to the rest framing. */
export function follow(playerId, on = true) {
  if (!on) {
    if (followId === playerId || playerId == null) { followId = null; return overview(); }
    return Promise.resolve();
  }
  if (locked || rm()) { followId = null; return Promise.resolve(); }
  followId = playerId;
  return Promise.resolve();
}

/**
 * The only place drama is allowed: a slow arc that follows the token down a snake
 * or up a ladder, then settles back to overview well inside cameraLegibleBy.
 *
 *   A  lead-in   lift 10° / pull 12%  (ladder)  ·  dip 8° / push 12%  (snake)
 *   B  follow    target pans from → to across the slide
 *   C  settle    overview, ≤ 500 ms after the move ends
 *
 * @param {number} fromCell
 * @param {number} toCell
 * @param {number} ms  the token's travel duration (snakeSlide / ladderClimb)
 */
export function dramatic(fromCell, toCell, ms) {
  const up = toCell > fromCell;
  const total = ms ?? (up ? CFG.timing.ladderClimb : CFG.timing.snakeSlide);
  const leadKey = up ? 'cameraLadderOut' : 'cameraSnakeIn';
  const backKey = up ? 'cameraLadderBack' : 'cameraSnakeBack';

  director++;
  const mine = director;
  followId = null;

  if (rm() || locked) return overview(0);

  const a = cellToWorld(fromCell), b = cellToWorld(toCell);
  /* §6.2: lift and pull back for a ladder so its TOP enters frame before the
     token does; dip and push in for a snake so the bite is close. The elevation
     is clamped by pitchMin/pitchMax, which trims the 10° lift to 8° — config's
     clamp wins over config's nominal, deliberately. */
  const el = clamp(rest.el + (up ? C.ladderLiftDeg : -C.snakeDipDeg) * DEG, elMin(), elMax());
  const dist = rest.dist * (up ? 1 + C.ladderPullPct : 1 - C.snakePushPct);

  const poseAt = (p, bias) => clampToBand({
    az: rest.az, el, dist,
    tx: lerp(rest.tx, p.x, bias), ty: rest.ty, tz: lerp(rest.tz, p.z, bias),
  });

  const lead = Math.min(dur(leadKey, false), total * 0.4);
  const swing = Math.max(0, total - lead);

  return (async () => {
    await moveTo(poseAt(a, 0.55), lead, CFG.easing.camera);
    if (director !== mine) return;
    await moveTo(poseAt(b, 0.55), swing, CFG.easing.camera);
    if (director !== mine) return;
    await moveTo({ ...rest }, dur(backKey, false), CFG.easing.camera);
  })();
}

/**
 * Tiny, for the snake bite only. 'strength' is in world units and is capped hard
 * at CFG.camera.shakeMax (0.14) — a board knocked on a table, never an explosion.
 * Off entirely under reduced motion.
 */
export function shake(strength = CFG.fx.shake.snake[0], ms = CFG.fx.shake.snake[1]) {
  if (rm() || !CFG.reduced.shake && rm()) return;
  if (rm() || locked) return;
  const amp = clamp(Math.abs(strength), 0, C.shakeMax);
  if (amp <= 0) return;
  shk = { amp, ms: clamp(ms, 60, SHAKE_MAX_MS), t0: now() };
}

/**
 * §6.2 finish: the camera settles looking slightly UP at square 100 — the board
 * becomes a thing you climbed. §6.2 used to let this one shot crop the board to
 * 62% coverage. It no longer may: the endgame plate has been pulled off the
 * board so the winning square is actually visible behind it, and a victory
 * frame with the right-hand column sliced off is not a hero shot. The look-up
 * and the pan survive; only whatever part of the 8% push-in the band cannot
 * afford is trimmed.
 */
export function finishShot(ms) {
  director++;
  followId = null;
  const d = rm() ? 0 : (ms ?? CFG.timing.finishRise);
  if (rm()) return Promise.resolve();
  const p = cellToWorld(100);
  const goal = clampToBand({
    az: rest.az,
    el: clamp(rest.el - C.finishLookUpDeg * DEG, elMin(), elMax()),
    dist: rest.dist * 0.92,
    tx: lerp(rest.tx, p.x, 0.5), ty: rest.ty + 0.25, tz: lerp(rest.tz, p.z, 0.5),
  });
  return moveTo(goal, d, CFG.easing.camera);
}

/* ── housekeeping + extras (additive; nothing in CONTRACT.md is changed) ─── */

/** Recompute the framing for the current viewport. Called on resize automatically. */
export function resize() {
  const before = rest.dist;
  refit();
  if (!mv && followId == null) {
    /* Keep the pose in the same relative place so a rotation is not a jump-cut. */
    const k = before ? rest.dist / before : 1;
    P.dist *= k;
    if (!isMoving()) P = { ...rest, dist: P.dist };
  }
}

let resizePending = false;
function onResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => { resizePending = false; resize(); });
}

/** Projector / workshop mode: locked at default, all push-ins and gestures off. */
export function setLocked(on) {
  locked = !!on;
  if (locked) { followId = null; springBack(0); overview(dur('cameraEase', rm())); }
}
export function isLocked() { return locked; }

/** Gate the gesture layer (e.g. §6.2's 'dragBetweenTurnsOnly'). */
export function setInputEnabled(on) {
  gestures.enabled = !!on;
  if (!on) springBack(dur('cameraSpringBack', rm()));
}
export function setGestures(patch) { Object.assign(gestures, patch || {}); }

/** Where a player's token is, for follow(). game.js may inject tokens3d's getter. */
export function setTokenProvider(fn) { tokenProvider = typeof fn === 'function' ? fn : null; }
/** …or just tell us the cell after every move; cheaper and needs no coupling. */
export function setPlayerCell(playerId, cell) { playerCells.set(playerId, cell); }
/** Optional: swap in board3d.cellToWorld if it ever diverges from CONTRACT.md. */
export function setCellResolver(fn) { _cellResolver = typeof fn === 'function' ? fn : null; }

/** Tell the camera the real safe rect (fractions of the viewport). */
export function setSafeFrame(x, y, oy = 0) {
  safeOverride = (x == null) ? null
    : { x: clamp(x, 0.3, 1), y: clamp(y, 0.14, 1), oy: clamp(oy, -0.6, 0.6) };
  resize();
}

/** True while a scripted move is in flight — window.__SNL.settle() wants this. */
export function isMoving() { return !!mv; }

/** A JSON-safe snapshot, for probes and tests. */
export function getPose() {
  const p = currentPose();
  const { dir } = basis(p.az, p.el);
  return {
    azimuthDeg: p.az / DEG, elevationDeg: p.el / DEG, distance: p.dist,
    target: [p.tx, p.ty, p.tz],
    position: [p.tx + dir[0] * p.dist, p.ty + dir[1] * p.dist, p.tz + dir[2] * p.dist],
    aspect, safe: { ...safe },
    coverage: boardCoverage(p, aspect, safe),
    framing: surfaceFrame(p),
    moving: isMoving(), following: followId, locked, reducedMotion: rm(),
  };
}

export function disposeCamera() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    unbindGestures();
  }
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  started = false;
  mv = null; shk = null; springing = null; followId = null;
  cam = null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. Gestures
   ───────────────────────────────────────────────────────────────────────────
   DEVIATION, stated loudly. DESIGN.md §6.2 and CFG.camera specify TWO-finger
   drag, between turns only, with pinch DISABLED. The module brief asks for a
   ONE-finger drag (±22° yaw, tilt clamped), a tightly-clamped pinch, an ease
   back to rest after 2.5 s of no input, and a double-tap reset. The brief wins
   here and this is what ships, with three safeguards that keep §6.2's intent:
     · yaw is capped at 22° (inside §6.2's 25°) and tilt at pitchMin/pitchMax;
     · pinch/wheel is clamped to 0.80–1.22× of the FITTED distance, so the whole
       board stays in frame at both ends of the range;
     · projector/workshop mode (setLocked) and prefers-reduced-motion turn the
       whole layer off, which is where §6.2's queasy-room argument actually bites.
   'setGestures({ drag:false, pinch:false })' restores §6.2 exactly, and
   'setInputEnabled(false)' implements 'dragBetweenTurnsOnly' for game.js.

   Taps must survive: nothing is preventDefault-ed until a pointer has moved past
   DRAG_SLOP, so "tap anywhere to skip an animation" (CONTRACT amendment 10) is
   never eaten by the camera.
   ═══════════════════════════════════════════════════════════════════════════ */

const pointers = new Map();
let dragging = false, pinching = false;
let startAz = 0, startEl = 0, startZoom = 1, startDist = 0;
let anchorX = 0, anchorY = 0;
let lastTapT = 0, lastTapX = 0, lastTapY = 0;

const gestureLive = () => gestures.enabled && !locked && !rm();

function bindGestures() {
  if (!canvas) return;
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
}

function unbindGestures() {
  if (canvas) {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('wheel', onWheel);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey);
  }
  pointers.clear(); dragging = pinching = false;
}

function onDown(e) {
  if (!gestureLive()) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    anchorX = e.clientX; anchorY = e.clientY;
    startAz = U.az; startEl = U.el; startZoom = U.zoom;
  } else if (pointers.size === 2 && gestures.pinch) {
    pinching = true; dragging = false;
    startDist = pinchDistance();
    startZoom = U.zoom;
  }
  springing = null;
  U.gAz = U.az; U.gEl = U.el; U.gZoom = U.zoom;
}

function pinchDistance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}

function onMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gestureLive()) return;

  if (pinching && pointers.size >= 2) {
    e.preventDefault();
    U.active = true;
    const k = pinchDistance() / startDist;
    U.gZoom = clamp(startZoom / k, ZOOM_LIMIT[0], ZOOM_LIMIT[1]);
    return;
  }
  if (pointers.size !== 1 || !gestures.drag) return;

  const dx = e.clientX - anchorX, dy = e.clientY - anchorY;
  if (!dragging) {
    if (Math.hypot(dx, dy) < DRAG_SLOP) return;   // still a tap — hands off
    dragging = true; U.active = true;
  }
  e.preventDefault();
  const h = (canvas?.clientHeight || window.innerHeight || 844);
  /* Match the grab-the-board feel of every orbit control ever shipped: drag
     right and the board follows your thumb; drag down and you rise over it. */
  U.gAz = clamp(startAz - (dx / h) * Math.PI * 0.9, -YAW_LIMIT, YAW_LIMIT);
  const elRange = Math.min(rest.el - elMin(), elMax() - rest.el);
  U.gEl = clamp(startEl + (dy / h) * Math.PI * 0.5, -elRange, elRange);
}

function onUp(e) {
  if (!pointers.has(e.pointerId)) return;
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);

  if (pointers.size < 2) pinching = false;
  if (pointers.size === 0) {
    const wasDrag = dragging;
    dragging = false;
    U.active = false;
    U.since = now();
    if (!wasDrag && gestureLive()) {
      /* double-tap → straight home, no 2.5 s wait */
      const t = now();
      if (t - lastTapT < TAP_MS && Math.hypot(p.x - lastTapX, p.y - lastTapY) < TAP_SLOP) {
        springBack(RESET_MS);
        director++; followId = null;
        moveTo({ ...rest }, RESET_MS, CFG.easing.camera);
        lastTapT = 0;
      } else { lastTapT = t; lastTapX = p.x; lastTapY = p.y; }
    }
  } else if (pointers.size === 1) {
    /* one finger lifted out of a pinch — re-anchor so the drag does not jump */
    const [q] = [...pointers.values()];
    anchorX = q.x; anchorY = q.y; startAz = U.az; startEl = U.el; startZoom = U.zoom;
  }
}

function onWheel(e) {
  if (!gestureLive() || !gestures.pinch) return;
  e.preventDefault();
  springing = null;
  U.active = false;
  U.gZoom = U.zoom = clamp(U.zoom * (1 + clamp(e.deltaY, -60, 60) * 0.0012),
                           ZOOM_LIMIT[0], ZOOM_LIMIT[1]);
  U.since = now();
}

/* Keyboard parity for the look-around, without hijacking anything: it only acts
   when nothing is focused (so ui.js's buttons always keep their own keys) and it
   never preventDefaults, so any other handler still sees the event. */
function onKey(e) {
  if (!gestureLive() || !gestures.keyboard) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const a = typeof document !== 'undefined' ? document.activeElement : null;
  if (a && a !== document.body && a !== canvas) return;
  const step = 4 * DEG;
  let hit = true;
  switch (e.key) {
    case 'ArrowLeft':  U.gAz = U.az = clamp(U.az + step, -YAW_LIMIT, YAW_LIMIT); break;
    case 'ArrowRight': U.gAz = U.az = clamp(U.az - step, -YAW_LIMIT, YAW_LIMIT); break;
    case 'ArrowUp':    U.gEl = U.el = clamp(U.el - step, elMin() - rest.el, elMax() - rest.el); break;
    case 'ArrowDown':  U.gEl = U.el = clamp(U.el + step, elMin() - rest.el, elMax() - rest.el); break;
    case 'Escape': case '0': springBack(RESET_MS); hit = false; break;
    default: return;
  }
  springing = null;
  U.since = now();
  if (!hit) return;
}
