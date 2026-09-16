/**
 * villains/ponziPyramid.js — THE PYRAMID BOSS and his DOWNLINE.  Villains #2 and #3.
 *
 * "Guaranteed 12% a month. Just bring six friends."
 *
 * ── THE SCAM, AND WHY THIS FILE HOLDS TWO CHARACTERS ─────────────────────────
 * `l3.json` says `"teaches": "The returns are real. They are made of the next person's
 * money."` A Ponzi is the one scam whose whole mechanism is a SHAPE: one person at the top
 * is paid by the people below him, who are paid by the people below them, until the level
 * below is empty and the shape falls over. A single character cannot say that. A man at the
 * top with five smaller copies of himself holding him up says it before a word is read, and
 * L3's structure is authored so the player then knocks that exact idea over.
 *
 * So there are two registrations, not one:
 *
 *   ponziPyramid  the BOSS.    R 0.62. Gold, plum, comfortable. Presents THE PLAN.
 *   ponziRecruit  the DOWNLINE. R 0.48. Same suit, no gold, arms up, holding up the tier
 *                 above him. He is the returns.
 *
 * They share every line of geometry code and differ by `static rank`, which is readable
 * during construction via `this.constructor.rank` — `buildMesh` runs inside `Villain`'s
 * constructor, so a subclass INSTANCE field would not exist yet. Do not "tidy" that into an
 * instance flag.
 *
 * ── THE ONE IDEA: THE TRIANGLE ───────────────────────────────────────────────
 * The prop is a pyramid-hierarchy board — the diagram every recruitment deck in the world
 * draws on a whiteboard. It is the only triangle in the game, and a triangle survives the
 * 40 px downscale and the greyscale test in a way no amount of costume does: Lottery Uncle
 * is a man with a RECTANGLE, the Pyramid Boss is a man with a TRIANGLE, and at 25 px that
 * is the entire difference a student needs.
 *
 * THE BOARD IS ONE MESH, and that is worth knowing before you extend it. It is an
 * `ExtrudeGeometry` built from a Shape laid out in a 0..1 box, because three.js's default
 * `WorldUVGenerator.generateTopUV` returns the shape's own XY for the front cap — so a
 * shape authored in 0..1 hands the canvas a 1:1 UV map with no custom generator, and the
 * geometry can then be `translate()`d to centre it without touching the UVs. That collapses
 * a frame + three bands + seven figures into ONE draw call and one shared texture, which is
 * how the boss can carry a full diagram and the recruits can carry the same diagram as a
 * chest badge for one mesh each. (Draw calls are already this project's known scaling
 * problem — see ORCHESTRATOR-NOTES. Six characters on one level is not the place to spend.)
 *
 * ── THE BOARD IS AUTHORED FOR 8 PIXELS, THEN DECORATED FOR DESKTOP ──────────
 * base.js's prop rule: 2-3 HARD VALUE BANDS plus one huge glyph, and body copy is a lie at
 * play size. A triangle cannot carry a 45 %-of-height glyph — its apex is the narrowest part
 * of it — so THE SILHOUETTE IS THE GLYPH, and the internal read is three bands stacked in
 * the order the scam pays out:
 *
 *   GOLD   top 40 %   -> the man who gets paid          (brightest thing on the board)
 *   NAVY   middle 28 % -> the middle, who are told they are next
 *   CORAL  bottom 32 % -> the joiners, who are the money (the game's own "tell" colour,
 *                         the same coral as Lottery Uncle's FEE DUE band)
 *
 * Every band clears base.js's 20 %-of-height floor, so at 8 px tall the board is still a
 * bright-topped, hot-bottomed triangle — which is the lesson. The 1 / 2 / 4 pictograms and
 * the "YOU ARE HERE" line are for the desktop reader and must never grow at the cost of a
 * band's height.
 *
 * ── THE FLINCH IS THE INVERSE OF LOTTERY UNCLE'S, ON PURPOSE ────────────────
 * Villain #1 yanks his prop DOWN to hide behind it. If #2 did the same the two characters
 * would share a reaction as well as a body plan. The boss yanks the board UP OVER HIS HEAD
 * and cowers under it like a man caught in the rain — silhouette goes from "man presenting a
 * triangle" to "man sheltering under a triangle", which is legible as a black fill at 40 px
 * and is the joke: his own pyramid is the only thing he has left to hide under.
 *
 * The recruit's flinch is the one that carries the LESSON rather than the gag. His rest pose
 * is both arms straight up, holding the tier above him. His guard pose is both arms clamped
 * down over his own head. THE MOMENT THERE IS TROUBLE, THE PEOPLE AT THE BOTTOM STOP
 * HOLDING IT UP — you can watch the support leave the structure a beat before the structure
 * notices, and it costs two `poseable()` calls.
 *
 * ── MASS PROFILE, AND THE ONE THING THAT HAD TO BE RE-MEASURED ──────────────
 * base.js's four damage constants were measured at R 0.52-0.54 (0.646 kg) and are expressed
 * in Δv precisely so a villain's size can move — but its header also says to re-derive them
 * after any radius change, so this file's two radii were run through
 * `_tools/scenarios/l3-villain.mjs` (the same shape as `pw-villain.mjs`) and the two
 * populations still do not overlap at either mass. Numbers are in that scenario's output and
 * in the round's log. Nothing in art/materials.js or base.js moved for this file.
 */

import * as THREE from 'three';
import { Villain, FACE } from './base.js';
import { mat, PALETTE } from '../art/materials.js';
import { RAMP_SOFT, RAMP_STD, RAMP_HARD, inkAll, makeEye, inkFlat, creamFlat } from '../art/toon.js';
import { Entity, makeBody, shapes } from '../level/entity.js';
import { mountPlaque } from './scamIcon.js';
import {
  makeGoogly, makeMouths, flinch, canvasTexture, printedPanel, trapezoidGeo, hardRectGeo,
  drawFigure as figure, fitFont as fitF, pinnedSpawn,
} from './objectFace.js';
import { world } from '../world.js';
import { rngRange } from '../rng.js';

const C = {};
const geo = (k, make) => { if (!C[k]) C[k] = make(); return C[k]; };

/**
 * ── THE PALETTE IS A VALUE LADDER, AND IT IS CHECKED AGAINST THE SKY ────────
 * Rec.709 luminance out of 255, because at 25 px tall a character is three or four blocks of
 * value and nothing else. base.js asks for >= 3 steps of a ten-step ramp (25.5 each) between
 * head and body, with a bright notch between them.
 *
 *   SUIT      0x3a2a52 ...  47   the boss's mass. Aubergine, not black: a black body reads
 *                               as a hole in a toon scene and kills the toon ramp.
 *   DOWNLINE  0x5f4478 ...  76   the recruit's. Same dye, cheaper cloth — the family read.
 *   SKIN      0xf0bf90 ... 198   6 ramp steps clear of the suit
 *   CREAM     0xfdf6ec ... 246   the collar: the hard notch between the two
 *   GOLD      0xf6c453 ... 198   bling and the board's frame. Deliberately NOT used on the
 *                               recruits — the absence is the joke and it is a value cue.
 *   HAIR      0x14100c ...  17   the marks that survive any downscale
 *
 * Sky is 0x89d0e8 (195), so nothing on the body is allowed near 195 except the head, which
 * is surrounded by ink. If you re-tint, re-derive — a head at sky value vanishes at its own
 * outline, and the boss is the one character in the game seen against nothing but sky.
 */
const SUIT      = 0x3a2a52;
const DOWNLINE  = 0x5f4478;
const SKIN      = 0xf0bf90;
const SKIN_DARK = 0x8a5a2f;
const HAIR      = 0x14100c;
const CREAM     = 0xfdf6ec;

/**
 * The board's proportions, in multiples of the villain's radius.
 * 2.70 x 1.75 R on the boss = 1.67 x 1.09 world units, which is 1.35x his own body width —
 * base.js's "the prop must be WIDER THAN THE VILLAIN, not merely large". It only fits because
 * it sits at `frontOfStructureZ()` and draws OVER l3's apex vault blocks rather than between
 * them; the gap between those blocks is 1.36 units and this board is 1.67.
 */
const BOARD = { w: 2.80, h: 1.55, d: 0.075 };
/**
 * ── THE BOARD'S RIGID BODY IS SMALLER THAN THE BOARD, AND THAT IS DELIBERATE ──
 * Same lesson as Lottery Uncle's cheque, for the same measured reason: a prop that becomes a
 * rigid body at its picture's full size is a slab as wide as a storey dropped into the middle
 * of a live collapse, and it changes the destruction numbers rather than decorating them. The
 * board is a sheet of foam-core on an easel; the body stands for its stiff middle.
 */
const BOARD_BODY = { w: 1.55, h: 1.00, d: 0.50 };
/**
 * Where that body is born — pinned, and SWEPT (`cast-propsweep.mjs`):
 *
 *   pin                    proof3 (t3 70000)  proof2 (t2 60500)  proofWeak (t1 28500)
 *   (1.86,-0.64,-0.09)     won 73,200         won 63,200         won 32,700   the sign's own
 *                                                                              rest offset
 *   (0.02, 0.34, PI*0.98)  won 73,200         won 63,200         won 33,000   *** this one
 *
 * Both pass every band, and the sign's own offset is the one that costs no visual jump — so it
 * was chosen first, and then measured against something the star gate does not look at. The
 * gate drives the game through `SS.aim()`; `p13-play.mjs` plays the same recorded plans through
 * REAL DOM POINTER DRAGS, and l3's one-shot 3-star plan is right on the edge there: through the
 * pointer path the sign's-own-offset arm left the level unfinished (27,700, phase "aiming").
 *
 * This pin is the OLD board's guard pose, and it reproduces the pre-round scores to the digit
 * on all three plans — which is as close to "the physics did not move" as this round can get.
 * That is worth more than the 13 x 7 px the sign's mesh jumps on the frame the boss pops,
 * inside the FX puff `villainDefeated` fires at the same instant. Same trade as l1's CHQ_PIN.
 */
const BOARD_PIN = { id: 'l3', x: 0.02, y: 0.34, rot: Math.PI * 0.98 };

/**
 * ── THE CRUMBLING-PYRAMID PLAQUE — THE SCAM ICON, ON THE DOWNLINE'S BADGE ────
 * (The boss's copy of it now rides on the promise sign — see `SIGN_TAG`.)
 * `assets/scam-ponzi.png`, the collapsing-pyramid icon from IFM's "Slash the Scam". It is
 * the one icon in that set that is ALREADY this level's idea, so a student who has played
 * that game recognises the whole mechanism before a word of the fact card is read.
 *
 * WHY IT IS A SLAB AND NOT A PRINT ON THE BOARD. See the treatment note in `scamIcon.js`. A
 * photoreal render drawn into `boardTexture()` would be a decal on a decal: the board is
 * already a flat printed surface, so an icon inside its canvas has nothing to be lit by and
 * no edge of its own. Screwed on as a bevelled plate with a gold rim — 0.14 R thick against
 * the board's 0.075 R, standing 0.03 world proud of it — it becomes a second object on the
 * first one, and the toon ramp gives its chamfer a highlight the flat board can never have.
 *
 * THE NUMBERS, and all of them come off the triangle:
 *  · IT SITS IN THE BASE, WHICH IS THE ONLY PART OF A TRIANGLE WIDE ENOUGH TO HOLD ONE. The
 *    board's half-width at normalised height y is (0.5 - y) / 2. At the plaque's top edge
 *    (y = +0.044) that is 0.228, i.e. 0.456 of the board's width available against a plaque
 *    0.339 wide. It clears with 0.06 of board width on each side.
 *  · IT IS ALMOST SQUARE (0.95 x 0.88 R) BECAUSE THE ICON IS. The first pass made it 1.10 x
 *    0.70 — a letterbox — and a square picture in a letterbox is height-limited, so a third
 *    of the plate was empty navy and the icon came out 22 % smaller than the plate could
 *    have carried. Match a plate's aspect to the picture it is for, then size it to the
 *    space; not the other way round.
 *  · IT COVERS THE BOTTOM PICTOGRAM ROW AND "YOU ARE HERE", AND NOTHING ELSE. Both are
 *    documented above as desktop-only decoration that "must never grow at the cost of a
 *    band's height" — the load-bearing read is the three bands, and those survive: the gold
 *    apex is untouched, the navy middle keeps its two figures, and the coral base still runs
 *    out to both corners past the plaque's ends. The plaque's own tell band is coral, so the
 *    board's bottom stays the hottest value on it.
 *  · 0.026 OF BOARD HEIGHT HANGS BELOW THE BASE EDGE, on purpose. A plate whose bottom edge
 *    lines up exactly with the board's reads as printed; one that laps over it reads as
 *    screwed on.
 *  · THE DOWNLINE GETS THE SAME PLATE, SMALLER AND DIMMER. Same icon, same rim, same
 *    arrangement on their own chest badge at 0.42 R against the boss's 1.10 R, and the whole
 *    plate pulled down the value ramp by `dim`. That is the hierarchy stated in the one
 *    language a 40 px silhouette can read — size and value — and it is the Ponzi joke: the
 *    people at the bottom are sold the identical promise in a cheaper frame.
 */
const PONZI_TAG_MINI = { w: 0.46, h: 0.30, d: 0.07, y: -0.180 };

/**
 * ── THE CHART: THREE TIERS, NOT ONE TRIANGLE (multiples of R, R = 0.62) ─────
 * The boss is now the pyramid DIAGRAM itself. It is built as a STACK of three trapezoid
 * tiers rather than as one triangle, and that is the load-bearing decision in this file:
 *
 *  · A STACK CAN BE CRUSHED. One triangle can only be scaled, and a villain that answers a
 *    collapsing storey by getting smaller is the "deleted, not crushed" failure the brief
 *    names. Three tiers can sink into each other, stagger, and lean independently, which is
 *    what a structure does when something lands on it.
 *  · A STACK HAS STEPS, and steps survive the downscale. At 18 px tall the internal rules of
 *    a drawn triangle are gone; three separate meshes with their own contours and their own
 *    hard colour changes are still three things.
 *  · AND THE APEX CAN RETRACT. The flinch pulls the gold tier DOWN into the navy one, so the
 *    silhouette loses its point — see THE FLINCH.
 *
 * Tier y-spans are measured from the chart group's origin, which sits at the character's
 * FEET (-1.00 R, the collider's own bottom) rather than at its centre — so base.js's crush
 * squash, which scales that group, flattens the pyramid DOWN onto its base instead of
 * shrinking it toward the middle and lifting it off the floor.
 *
 * The gold tier's width at the eye line (2.14 R up) is 1.55 R, and the pair of eyes spans
 * 1.40 R, so the face has 0.075 R of gold either side of it. That is the number the whole
 * tier table is solved against: a face on the apex is the brief, and an apex too narrow to
 * hold one is a triangle with two dots on it.
 */
const TIERS = [
  { key: 'coral', y0: 0.00, y1: 0.78, wb: 3.50, wt: 2.62 },
  { key: 'navy',  y0: 0.82, y1: 1.62, wb: 2.60, wt: 2.05 },
  { key: 'gold',  y0: 1.66, y1: 2.62, wb: 2.05, wt: 1.05 },
];
const TIER_D = 0.34;                  // every tier's depth. Thick: the side wall is the step.
/** In front of every block, for the reason lotteryUncle.js's CARD_Z block sets out. */
const CHART_Z = 0.60;
/**
 * THE PROMISE SIGN — "12% A MONTH", bolted to the chart's lower right, and the one piece of
 * this character that becomes a rigid body at the death pop. Sized to `BOARD_BODY` below, so
 * the collider and the picture are about the same object for the first time.
 */
const SIGN     = { w: 1.55, h: 0.95, d: 0.10, x: 1.86, y: 0.36 };
const SIGN_TAG = { w: 0.78, h: 0.86, d: 0.16, x: 0.52, y: 0.00 };

// ---------------------------------------------------------------------------
// THE BOARD FACE — one canvas, shared by the boss's board and every recruit's badge.
// ---------------------------------------------------------------------------

/** A pictogram person: head disc + shoulders. Legible as a blob, which is the point. */
function drawFigure(g, cx, cy, h, color) {
  const head = h * 0.38;
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy - h * 0.30, head, 0, Math.PI * 2);
  g.fill();
  // shoulders: a capsule-ish trapezoid. Drawn as a rounded rect so it survives being 3 px.
  const bw = h * 0.86, bh = h * 0.52, r = bh * 0.42;
  const x = cx - bw / 2, y = cy + h * 0.06;
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + bw - r, y);
  g.quadraticCurveTo(x + bw, y, x + bw, y + r);
  g.lineTo(x + bw, y + bh);
  g.lineTo(x, y + bh);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.fill();
}

/** Shrink a font until the string fits `max` px — guessing point sizes is how band text
 *  ends up overlapping the band above it. */
function fitFont(g, text, max, px, family) {
  let n = px;
  for (; n > 8; n -= 2) { g.font = `bold ${n}px ${family}`; if (g.measureText(text).width <= max) break; }
  return n;
}

let _boardTex = null;
function boardTexture() {
  if (_boardTex) return _boardTex;
  const W = 1024, H = 664;                  // 1.542 : 1, the board's own aspect. Match them
  const c = document.createElement('canvas'); // or the bands shear along the diagonals.
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // CSS strings, not the module's hex NUMBERS. `g.fillStyle = 0xfdf6ec` is silently invalid
  // in canvas 2D — it leaves the previous fill in force — which drew this board's whole
  // middle row of figures navy-on-navy and its tell line navy-on-coral. It looked like a
  // layout bug and it was a type bug; the canvas dump in `l3-villain.mjs` is what caught it.
  const NAVY = '#1a3a5c', CORAL = '#e76f51', GOLD = '#f6c453', CREAM_C = '#fdf6ec';

  // The UV space is the shape's own 0..1 box and three.js flips V, so canvas TOP is the
  // triangle's apex and canvas BOTTOM is its base. The geometry cuts the triangle out of
  // this rectangle, so everything outside the diagonals is never sampled — which is why the
  // bands can be drawn as plain full-width rectangles.
  const yGold = Math.round(H * 0.40);       // 40 % — the man who gets paid
  const yCoral = Math.round(H * 0.68);      // 32 % — the joiners. Both clear base.js's 20 %.
  g.fillStyle = GOLD;  g.fillRect(0, 0, W, yGold);
  g.fillStyle = NAVY;  g.fillRect(0, yGold, W, yCoral - yGold);
  g.fillStyle = CORAL; g.fillRect(0, yCoral, W, H - yCoral);

  // Hairline rules between the bands so the three levels read as LEVELS rather than as a
  // gradient at any size where the pictograms have already dissolved.
  g.fillStyle = 'rgba(26,58,92,0.85)'; g.fillRect(0, yGold - 6, W, 12);
  g.fillStyle = 'rgba(253,246,236,0.75)'; g.fillRect(0, yCoral - 5, W, 10);

  // 1 / 2 / 4 — the shape of the promise. Each row is placed where the triangle is wide
  // enough to hold it: half-width at height y is (y / H) * (W / 2).
  drawFigure(g, W / 2, H * 0.235, H * 0.20, NAVY);
  for (const dx of [-0.145, 0.145]) drawFigure(g, W / 2 + W * dx, H * 0.545, H * 0.155, CREAM_C);
  for (const dx of [-0.285, -0.095, 0.095, 0.285]) drawFigure(g, W / 2 + W * dx, H * 0.815, H * 0.125, NAVY);

  // Desktop-only, and it must never cost a band its height: the line runs along the bottom
  // edge where the triangle is at full width.
  g.fillStyle = CREAM_C;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const tell = 'YOU ARE HERE';
  // 0.90 H, not 0.945: the gold frame is stroked at lineWidth 62 and half of it falls inside
  // the shape, so the last ~31 px of the board is frame. At 0.945 the descenders were being
  // eaten by it.
  const size = fitFont(g, tell, W * 0.42, 46, 'Georgia, "Times New Roman", serif');
  g.font = `bold ${size}px Georgia, "Times New Roman", serif`;
  g.fillText(tell, W / 2, H * 0.900);

  // The gold frame, stroked along the SHAPE's own edges so it follows the geometry exactly
  // instead of boxing the canvas. Half of the stroke falls outside the triangle and is
  // discarded by the geometry, so the visible frame is ~5 % of the board's height.
  g.strokeStyle = GOLD; g.lineWidth = 62; g.lineJoin = 'miter'; g.miterLimit = 8;
  g.beginPath();
  g.moveTo(W / 2, 0); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
  g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  _boardTex = t;
  return t;
}

/**
 * ── ONE TIER'S PRINT ────────────────────────────────────────────────────────
 * The trapezoid's UVs are its own 0..1 box, so anything drawn outside the sloped sides is
 * simply never sampled and every band can be painted as a plain full-width rectangle — the
 * same trick `triangleGeo` documents below, and the reason this cast can carry diagrams for
 * the price of one texture each.
 *
 * `slope` is the tier's top width as a fraction of its bottom, and it is passed in only so
 * the pictograms can be kept inside the sloped edges: a figure drawn at 80 % of the width on
 * a tier that is 51 % as wide at the top is a figure with its head cut off by the geometry.
 *
 * WHAT EACH TIER SAYS, and none of it is decoration:
 *   coral  four joiners and YOU ARE HERE. The bottom of a pyramid is where the player is.
 *   navy   two, who were told they are next.
 *   gold   the top. It carries no pictogram at all, because the FACE is the pictogram —
 *          the man at the top of this diagram is the thing you are shooting at.
 */
const TIER_PAINT = {
  coral: { bg: '#e76f51', ink: '#1a3a5c', n: 4, label: 'YOU ARE HERE', lab: '#fdf6ec' },
  navy:  { bg: '#1a3a5c', ink: '#fdf6ec', n: 2, label: '12% A MONTH', lab: '#f6c453' },
  gold:  { bg: '#f6c453', ink: '#1a3a5c', n: 0, label: '', lab: '#1a3a5c' },
};

const _tierTex = new Map();
/**
 * `aspect` is the TIER'S OWN width:height, and passing it is not tidiness — it is the fix for
 * a defect the first capture showed immediately. A 512 x 256 canvas stretched onto a tier that
 * is 4.49 : 1 multiplies everything drawn on it by 2.24 in x: the four joiner pictograms came
 * out as fat blobs running off both ends of the coral band, and YOU ARE HERE was smeared to
 * twice its proper width. A canvas painted for a prop must have the prop's aspect, always.
 */
function tierTexture(key, slope, aspect) {
  if (_tierTex.has(key)) return _tierTex.get(key);
  const P = TIER_PAINT[key];
  const t = canvasTexture(640, Math.max(48, Math.round(640 / aspect)), (g, W, H) => {
    g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
    // A hard rule along the tier's own top edge: the step-shadow that makes a stack of three
    // read as a STACK at 18 px rather than as one shaded triangle.
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, W, H * 0.09);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, H * 0.09, W, H * 0.04);
    // The pictograms sit on the tier's NARROWEST line (its top) so the geometry cannot clip
    // them, inset by the slope plus a margin.
    const inset = (1 - slope) / 2 + 0.06;
    if (P.n) {
      const span = 1 - inset * 2;
      for (let i = 0; i < P.n; i++) {
        // A PAIR IS PUSHED TO THE EDGES, not spaced evenly. The smirk is a real mesh standing
        // in the middle of the navy tier, and two figures at 1/4 and 3/4 sit squarely behind
        // it — three overlapping shapes inside 0.8 R, which is noise at any size the game is
        // played at. At 0.16 / 0.84 the mouth has the middle of the band to itself.
        const at = P.n === 2 ? [0.16, 0.84][i] : (i + 0.5) / P.n;
        figure(g, (inset + span * at) * W, H * 0.44, H * 0.44, P.ink);
      }
    }
    if (P.label) {
      g.fillStyle = P.lab;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const size = fitF(g, P.label, W * (slope * 0.8), Math.round(H * 0.20), 'Georgia, serif');
      g.font = `bold ${size}px Georgia, serif`;
      g.fillText(P.label, W / 2, H * 0.86);
    }
  });
  _tierTex.set(key, t);
  return t;
}

/** The promise sign's print: the number the whole scam is, and the word that makes it a lie. */
let _signTex = null;
function signTexture() {
  if (_signTex) return _signTex;
  _signTex = canvasTexture(Math.round(SIGN.w * 300), Math.round(SIGN.h * 300), (g, W, H) => {
    g.fillStyle = '#f6c453'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a3a5c'; g.fillRect(0, 0, W, H * 0.26);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fdf6ec';
    let s = fitF(g, 'GUARANTEED', W * 0.9, Math.round(H * 0.20), 'Georgia, serif');
    g.font = `bold ${s}px Georgia, serif`;
    g.fillText('GUARANTEED', W / 2, H * 0.14);
    g.fillStyle = '#1a3a5c';
    s = fitF(g, '12%', W * 0.52, Math.round(H * 0.52), '"Arial Black", Arial, sans-serif');
    g.font = `bold ${s}px "Arial Black", Arial, sans-serif`;
    g.fillText('12%', W * 0.34, H * 0.56);
    s = fitF(g, 'A MONTH', W * 0.40, Math.round(H * 0.18), 'Arial, sans-serif');
    g.font = `bold ${s}px Arial, sans-serif`;
    g.fillText('A MONTH', W * 0.72, H * 0.52);
    g.fillStyle = '#a8452f';
    s = fitF(g, 'BRING SIX FRIENDS', W * 0.9, Math.round(H * 0.15), 'Georgia, serif');
    g.font = `bold ${s}px Georgia, serif`;
    g.fillText('BRING SIX FRIENDS', W / 2, H * 0.88);
  });
  return _signTex;
}

/**
 * A unit triangle slab, apex +Y, centred on the origin, 1 x 1 x 1.
 *
 * Authored in a 0..1 box FIRST and translated afterwards, because `ExtrudeGeometry`'s
 * default UV generator bakes the shape's raw XY into the front-cap UVs at construction
 * time — so the UVs come out 0..1 and `translate()` cannot disturb them. Group 0 is the
 * caps (the printed face), group 1 is the side walls (the frame's edge).
 */
function triangleGeo() {
  return geo('pTri', () => {
    const s = new THREE.Shape();
    s.moveTo(0.5, 1); s.lineTo(1, 0); s.lineTo(0, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 1 });
    g.translate(-0.5, -0.5, -0.5);
    return g;
  });
}

/**
 * The printed board, at a size in world units. One mesh, two SHARED materials, one shared
 * texture — six characters on this level and the boss's board and every recruit's badge all
 * come off the same pair. Allocating per instance would cost six more shader programs for a
 * pixel-identical result.
 */
let _boardMats = null;
function boardMaterials() {
  if (!_boardMats) {
    _boardMats = [
      new THREE.MeshToonMaterial({ color: 0xffffff, map: boardTexture(), gradientMap: RAMP_HARD() }),
      new THREE.MeshToonMaterial({ color: PALETTE.gold, gradientMap: RAMP_HARD() }),
    ];
  }
  return _boardMats;
}

function makeBoard(w, h, d) {
  const m = new THREE.Mesh(triangleGeo(), boardMaterials());
  m.scale.set(w, h, d);
  m.castShadow = true;
  /**
   * A heavier contour than the rest of the character, for the same reason Lottery Uncle's
   * cheque carries one: outline weight is a RATIO to what it surrounds, and this is the
   * biggest flattest surface on the villain. At the body's 0.036 the board's edge is about
   * 1 % of its own width and the gold band dissolves into the sky behind it; at 0.052 the
   * triangle stays hard-edged through the 40 px downscale, which is the whole read.
   */
  m.userData.inkWidth = 0.052;
  return m;
}

// ---------------------------------------------------------------------------

export class PonziPyramid extends Villain {
  static id = 'ponziPyramid';
  static label = 'The Pyramid Boss';
  static fact = 'He never invests anything. He pays the old members with the new members’ money.';
  /** Read in buildMesh via `this.constructor.rank` — see the header for why not an instance field. */
  static rank = 'boss';

  constructor(o = {}) {
    super({ radius: 0.62, matName: 'villain', ...o });
  }

  /**
   * TWO CHARACTERS, ONE CLASS — and after this round they no longer share a body.
   *
   * `static rank` is readable during construction via `this.constructor.rank` (buildMesh runs
   * inside `Villain`'s constructor, so a subclass INSTANCE field would not exist yet). It used
   * to select branches INSIDE one build method; the boss is now an object and the downline is
   * still a person, so there is nothing left for the two to share and the branch is at the top.
   */
  buildMesh(g) {
    if (this.constructor.rank === 'boss') this.buildChart(g);
    else this.buildRecruit(g);
  }

  /**
   * THE PYRAMID CHART — chapter 3's villain, and the only one of the three whose scam is a
   * SHAPE. Everything a Ponzi is is in the outline: a wide base, a narrow top, and the money
   * running the wrong way up it.
   */
  buildChart(g) {
    const R = this.radius ?? 0.62;

    const chartG = new THREE.Group();
    chartG.position.set(0, -R, CHART_Z);       // origin at the feet: see the TIERS block
    chartG.rotation.z = -0.02;
    g.add(chartG);
    this.chart = chartG;

    /**
     * ---------------- THE THREE TIERS ---------------------------------------
     * Each is one extruded trapezoid carrying one canvas. The gold tier is pushed 0.05 R
     * forward in z, and that is not a detail: the FLINCH retracts it into the navy tier
     * below, and two coplanar faces at the same z would z-fight through the whole move
     * instead of one sliding cleanly in front of the other.
     */
    this.tiers = {};
    for (const t of TIERS) {
      const h = t.y1 - t.y0;
      const m = printedPanel(trapezoidGeo(t.wt / t.wb),
        tierTexture(t.key, t.wt / t.wb, t.wb / h),
        t.key === 'gold' ? 0xb98c2c : t.key === 'navy' ? 0x102538 : 0xa8452f, { ink: 0.048 });
      m.scale.set(R * t.wb, R * h, R * TIER_D);
      m.position.set(0, R * (t.y0 + h / 2), t.key === 'gold' ? R * 0.05 : 0);
      chartG.add(m);
      this.tiers[t.key] = m;
      m.userData.restY = m.position.y;
    }

    /**
     * ---------------- THE FACE, ON THE TOP TIER -----------------------------
     * The eyes sit on the gold, the smirk sits on the navy below it, and the whole face is a
     * child of the CHART rather than of either tier. That is deliberate: the flinch and the
     * crush move the tiers by different amounts, and the face has to travel with the gold one
     * exactly — which it does, because both are driven from the same number in `onIdle`.
     * Parenting it to the tier would have been simpler and would have carried the face away on
     * the frame the tier tears off.
     *
     * THE SMIRK. base.js switches four mouths by visibility and the idle one is a symmetric
     * crescent; here it is rotated -0.20 rad and pushed 0.06 R right, which is the whole
     * difference between a grin and a man who knows something you do not. Its cream tooth
     * strip is what carries it against the navy — a dark lip on a 57-luminance band is a lip
     * nobody can see.
     */
    const face = new THREE.Group();
    face.position.set(0, 0, R * (TIER_D * 0.5 + 0.05));
    chartG.add(face);
    this.face = face;
    this.faceRestY = 0;

    const eyeR = R * 0.33;
    const eyes = [], brows = [];
    for (const sd of [-1, 1]) {
      const { eye, brow } = makeGoogly(eyeR, { side: sd, tilt: 0.28, brow: 0x3a2410, rim: false });
      eye.position.set(sd * R * 0.37, R * 2.14, 0);
      brow.position.y = eyeR * 1.10;
      face.add(eye);
      eyes.push(eye); brows.push(brow);
    }
    const mouths = makeMouths(R * 0.34, { lip: 0x4a0f24, gold: PALETTE.gold });
    for (const k of Object.keys(mouths)) {
      mouths[k].position.set(R * 0.06, R * 1.24, 0);
      if (k === 'idle') mouths[k].rotation.z = -0.20;
      face.add(mouths[k]);
    }

    /**
     * ---------------- THE PROMISE SIGN --------------------------------------
     * Bolted to the chart's lower right and overhanging its base by 0.68 R — the one
     * non-rectangular, non-triangular lump on the outline, and the thing that stops a 24 px
     * triangle reading as a piece of level scenery. It carries `assets/scam-ponzi.png`, the
     * collapsing-pyramid icon from IFM's "Slash the Scam", which is the one icon in that set
     * that is already this level's whole idea.
     */
    const sign = printedPanel(hardRectGeo(), signTexture(), 0x8d6a1f, { ink: 0.046 });
    sign.scale.set(R * SIGN.w, R * SIGN.h, R * SIGN.d);
    sign.position.set(R * SIGN.x, R * SIGN.y, R * (TIER_D + SIGN.d) * 0.5);
    sign.rotation.z = -0.07;
    chartG.add(sign);
    this.sign = sign;

    this.tag = mountPlaque(sign, {
      name: 'scam-ponzi',
      w: R * SIGN_TAG.w, h: R * SIGN_TAG.h, d: R * SIGN_TAG.d,
    }, { x: R * SIGN_TAG.x, y: R * SIGN_TAG.y, proud: 0.028, rot: 0.05 });

    /**
     * THE CROWN, and it is the level's thesis in one prop: a little gold coin-crown balanced
     * on the apex, i.e. the person at the top, sitting on everybody else. It is also the one
     * detachable — and the count matters, because `releaseDetachables()` draws three
     * `rngRange` values per piece off the same deterministic stream the rest of the level
     * shares, so a second one would shift every later draw. The old character detached his
     * sunglasses here; same count, same velocities, same stream.
     */
    const crown = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 14),
      new THREE.MeshToonMaterial({ color: PALETTE.gold, gradientMap: RAMP_HARD() }));
    coin.scale.set(R * 0.17, R * 1.0, R * 0.17);
    coin.rotation.x = Math.PI / 2;
    coin.userData.inkWidth = 0.030;
    crown.add(coin);
    for (const dx of [-1, 0, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 4),
        new THREE.MeshBasicMaterial({ color: PALETTE.gold, toneMapped: false }));
      spike.scale.set(R * 0.11, R * 0.26, R * 0.09);
      spike.position.set(dx * R * 0.13, R * 0.20, R * 0.02);
      spike.rotation.y = Math.PI / 4;
      spike.userData.noInk = true;
      crown.add(spike);
    }
    crown.position.set(0, R * 2.70, R * (TIER_D * 0.5 + 0.06));
    chartG.add(crown);
    this.crown = crown;

    inkAll(g, 0.030);

    this.registerRig({ belly: chartG, bob: [face], face });
    this.registerFace({ eyes, brows, mouths });

    /**
     * ── THE FLINCH: THE APEX RETRACTS ───────────────────────────────────────
     * l1's cheque curls up and gets narrower; l2's card gapes and gets taller. This one loses
     * its POINT: the gold tier — with the face and the crown on it — slides 0.62 R down in
     * front of the navy tier, and base.js's `poseable` tips the whole chart 0.10 rad and drops
     * it 0.10 R at the same time.
     *
     *   projected height   2.62 R idle -> 1.90 R guarded   (-27 %)
     *   outline            a stepped triangle -> a squat trapezoid with no apex
     *
     * It is the only one of the three reactions that changes what the shape IS rather than how
     * big it is, and on this character that is the point: the man at the top ducks behind the
     * people he is standing on. `poseable()` cannot drive a child tier's y independently of the
     * face, so the retraction runs on `objectFace.flinch()` — the same eased blend on the same
     * fixed step, applied in `onIdle`.
     */
    this.poseable(chartG, {
      guard: { y: -R - R * 0.10, rot: 0.10 },
      snap: 0.09,
    });

    this.addDetachable(crown, { vx: -1.2, vy: 5.2, spin: 12, ttl: 1.2 });
  }

  /**
   * THE DOWNLINE — UNCHANGED, AND DELIBERATELY SO.
   *
   * Every line of this method is the humanoid recruit exactly as it shipped. The rest of the
   * cast became objects this round; this one did not, because "the people at the bottom are
   * holding up the man at the top" is the entire Ponzi lesson and no object can say it — see
   * the header. The only edit is the split itself: the boss's branches moved out to
   * `buildChart()`, so what is left here is one character rather than two behind an `if`.
   */
  buildRecruit(g) {
    const R = this.radius ?? 0.48;
    const cloth = DOWNLINE;

    /**
     * ── PROPORTIONS ─────────────────────────────────────────────────────────
     * A four-stage taper with the head sitting clear ABOVE the belly rather than inside it
     * (put a head of radius R on a body of radius R and the belly's front face draws over
     * the chin — that is a mistake this codebase has already made once, see lotteryUncle.js).
     *
     *   seat 0.90 R · belly 0.84 R · collar 0.52 R · head 0.60 R
     *   belly top 0.54 R   head bottom 0.58 R   hair crown 1.94 R
     *
     * Bottom of the visual is exactly -1.00 R, the collider's own bottom, so he never floats
     * and never sinks. The boss and the recruit share every number here: the DIFFERENCE
     * between them is R itself (0.62 against 0.48, i.e. 1.29x), the cloth value, and the
     * gold. Two characters that differ only in scale and trim read as the same organisation,
     * which is exactly what a downline is.
     */

    // ---------------- the seated flare — this is where "heavy" comes from ----
    const bodyMat = mat('villain', { color: cloth }).three;
    const seat = new THREE.Mesh(geo('pSeat', () => new THREE.SphereGeometry(1, 22, 12)), bodyMat);
    seat.scale.set(R * 0.90, R * 0.34, R * 0.74);
    seat.position.y = -R * 0.64;
    seat.castShadow = true; seat.receiveShadow = true;
    g.add(seat);
    this.seat = seat;
    this.seatBase = seat.scale.clone();

    // ---------------- belly (this is the part that breathes) -----------------
    const belly = new THREE.Mesh(geo('pBody', () => new THREE.SphereGeometry(1, 24, 16)), bodyMat);
    belly.scale.set(R * 0.84, R * 0.80, R * 0.74);
    belly.position.y = -R * 0.24;
    belly.castShadow = true; belly.receiveShadow = true;
    g.add(belly);

    /**
     * THE LAPEL V and THE COLLAR. Two bright shapes doing one job: keeping a 47-luminance
     * body and a 198-luminance head from reading as one mass. The V also gives the chest an
     * internal direction, which is the cheapest way to make a sphere read as a torso.
     */
    const lapel = new THREE.Mesh(
      geo('pLapel', () => new THREE.ConeGeometry(1, 1, 3)),
      new THREE.MeshToonMaterial({ color: CREAM, gradientMap: RAMP_STD() }));
    lapel.scale.set(R * 0.34, R * 0.46, R * 0.18);
    lapel.position.set(0, R * 0.12, R * 0.62);
    lapel.rotation.z = Math.PI;               // point down: a shirt front, not a bib
    lapel.userData.noInk = true;
    g.add(lapel);

    const collar = new THREE.Mesh(
      geo('pCollar', () => new THREE.CylinderGeometry(0.62, 1, 0.20, 16)),
      new THREE.MeshToonMaterial({ color: CREAM, gradientMap: RAMP_STD() }));
    collar.scale.set(R * 0.52, R * 1.70, R * 0.52);
    collar.position.set(0, R * 0.50, 0);
    g.add(collar);

    // ---------------- head group: head + hair + shades + face all bob together
    const headG = new THREE.Group();
    g.add(headG);

    const skinMat = new THREE.MeshToonMaterial({
      color: SKIN, gradientMap: RAMP_SOFT(),
      emissive: new THREE.Color(SKIN_DARK), emissiveIntensity: 0.14,
    });
    const head = new THREE.Mesh(geo('pHead', () => new THREE.SphereGeometry(1, 24, 16)), skinMat);
    head.scale.set(R * 0.60, R * 0.66, R * 0.56);
    head.position.set(0, R * 1.24, 0);
    head.castShadow = true;
    headG.add(head);

    const face = new THREE.Group();
    face.position.set(0, R * 1.24, 0);
    headG.add(face);
    this.face = face;

    /**
     * HAIR: slicked back and glossy, sitting low at the back so the forehead stays clear for
     * the brows. A half-sphere pushed back in z rather than a cap on the crown, because a cap
     * on the crown is Lottery Uncle's hat and these two must not share a head silhouette.
     */
    const hairMat = new THREE.MeshToonMaterial({ color: HAIR, gradientMap: RAMP_HARD() });
    const hair = new THREE.Mesh(
      geo('pHair', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.50)),
      hairMat);
    // A CAP ON THE CROWN, NOT A SHELL AROUND THE FACE. The first version was a 0.62-polar
    // sphere at 0.62 R wide against a head 0.60 R wide, i.e. wider than the skull at every
    // height: photographed at play size it drew a black ring all the way round the face and
    // the character read as bald in a helmet. A hemisphere NARROWER than the head (0.54 R),
    // sat high (1.50 R) and pushed back (-0.12 R) leaves the whole forehead and both temples
    // in skin, which is where the brows have to live.
    // 0.63 R wide against a 0.60 R head: the cap has to be a HAIR-WIDTH wider than the
    // skull or it reads as a receding hairline rather than as hair. A hemisphere (polar
    // 0.50 pi) sat at 1.34 R caps the crown and leaves the whole forehead in skin, which is
    // the half of the head the brows need; the failure mode in the other direction is a
    // full shell at 0.62 polar, which drew a black ring right round the face.
    hair.scale.set(R * 0.63, R * 0.50, R * 0.58);
    hair.position.set(0, R * 1.34, -R * 0.08);
    hair.rotation.x = -0.34;
    hair.castShadow = true;
    headG.add(hair);

    /**
     * ── THE SHADES-ON-THE-FOREHEAD, WHICH ARE THIS CHARACTER'S MOUSTACHE ────
     * base.js: a reaction may never move the head, so the only thing that can break the head
     * OUTLINE is something wider than the head. The head's half-width is 0.60 R and this bar
     * runs to 0.72 R, so it overhangs by 0.12 R on each side.
     *
     * They are PUSHED UP, not worn, and that is a functional choice rather than a joke: worn
     * shades delete the eyes, and the eyes are where all four face states live. Pushed up
     * they read as "the man who was just on camera", they keep the brows legible underneath,
     * and they are the one thing that flies off when he pops.
     */
    /**
     * BOSS ONLY. The downline gets no shades and no gold anywhere, and the absence is doing
     * real work in both directions: it is the value cue that separates the two ranks at
     * 25 px, and it clears his forehead. Photographed with them on, the gold rim landed on
     * the brow line and read as a headband sitting on top of an eyebrow — two dark bars and
     * a gold one stacked inside 0.2 R, which is noise at any size the game is played at.
     */

    // ---------------- eyes: close-set, permanently pleased with themselves ---
    // +-0.25 R with a 1.70-radius brow leaves a 0.14 R gap between the brows, which survives
    // to about 3 px at gameplay size. Any closer and the two brows render as one chevron and
    // the character has a unibrow instead of an expression.
    const eyeR = R * 0.205;
    const eyeZ = R * 0.37;
    const eL = makeEye(eyeR, eyeZ);
    const eR = makeEye(eyeR, eyeZ);
    eL.position.set(-R * 0.25, -R * 0.02, 0);
    eR.position.set(R * 0.25, -R * 0.02, 0);
    face.add(eL, eR);

    // Brows angled into a pitch. Children of the eye so they travel with it; base.js scales
    // the eye's WHITE rather than the group precisely so this is safe.
    const browMat = inkFlat(0x211a2c);
    const brows = [];
    for (const [e, s] of [[eL, -1], [eR, 1]]) {
      const b = new THREE.Mesh(geo('pBrow', () => new THREE.BoxGeometry(1, 1, 1)), browMat);
      b.scale.set(eyeR * 1.66, eyeR * 0.33, eyeR * 0.26);
      b.position.set(0, eyeR * 1.06, eyeZ + eyeR * 0.62);
      b.rotation.z = s * 0.30;
      b.userData.noInk = true;
      b.userData.side = s;
      b.userData.eyeR = eyeR;
      e.add(b);
      brows.push(b);
    }

    const nose = new THREE.Mesh(geo('pNose', () => new THREE.SphereGeometry(1, 10, 8)), skinMat);
    nose.scale.set(R * 0.095, R * 0.115, R * 0.13);
    nose.position.set(0, -R * 0.26, R * 0.43);
    nose.userData.noInk = true;
    face.add(nose);

    // ---------------- the four mouths ---------------------------------------
    const mouthY = -R * 0.47, mouthZ = R * 0.35;
    const lip = inkFlat(0x3d1030);

    // IDLE — a wide salesman's grin with a cream strip of teeth in it. A dark crescent on its
    // own is a smudge at gameplay size; the bright strip is what makes it read as a SMILE.
    const mSmug = new THREE.Group();
    const crescent = new THREE.Mesh(
      geo('pMouthSmug', () => new THREE.TorusGeometry(1, 0.24, 6, 18, Math.PI * 0.98)), lip);
    crescent.scale.setScalar(R * 0.230);
    crescent.rotation.z = Math.PI;
    crescent.userData.noInk = true;
    mSmug.add(crescent);
    const teeth = new THREE.Mesh(geo('pTeeth', () => new THREE.BoxGeometry(1, 1, 1)), creamFlat());
    teeth.scale.set(R * 0.285, R * 0.062, R * 0.02);
    teeth.position.set(0, -R * 0.018, R * 0.04);
    teeth.userData.noInk = true;
    mSmug.add(teeth);
    mSmug.position.set(0, mouthY, mouthZ);
    face.add(mSmug);

    // ALARMED — the jaw drops into a dark cavity.
    const mOh = new THREE.Mesh(geo('pMouthOh', () => new THREE.SphereGeometry(1, 12, 10)), lip);
    mOh.scale.set(R * 0.150, R * 0.215, R * 0.07);
    mOh.position.set(0, mouthY - R * 0.04, mouthZ + R * 0.02);
    mOh.userData.noInk = true;
    face.add(mOh);

    // BRACED — gritted. A flat wide bar with cream teeth: the silhouette does not change,
    // which is the whole requirement for this state (RUBRIC P6 fails closed eyes on a
    // living villain, and a braced mouth that changes the outline reads as a second state).
    const mGrit = new THREE.Group();
    const gum = new THREE.Mesh(geo('pMouthGrit', () => new THREE.BoxGeometry(1, 1, 1)), lip);
    gum.scale.set(R * 0.30, R * 0.100, R * 0.05);
    gum.userData.noInk = true;
    mGrit.add(gum);
    const grin = new THREE.Mesh(geo('pGritTeeth', () => new THREE.BoxGeometry(1, 1, 1)), creamFlat());
    grin.scale.set(R * 0.255, R * 0.036, R * 0.02);
    grin.position.set(0, 0, R * 0.03);
    grin.userData.noInk = true;
    mGrit.add(grin);
    mGrit.position.set(0, mouthY, mouthZ);
    face.add(mGrit);

    // DEFEATED — asymmetric and downturned. A symmetric frown reads as a cartoon default;
    // an asymmetric one reads as a man who has just watched his own numbers.
    const mSad = new THREE.Mesh(
      geo('pMouthSad', () => new THREE.TorusGeometry(1, 0.23, 6, 18, Math.PI * 0.78)), lip);
    mSad.scale.setScalar(R * 0.185);
    mSad.rotation.z = -0.32;
    mSad.position.set(-R * 0.05, mouthY - R * 0.02, mouthZ);
    mSad.userData.noInk = true;
    face.add(mSad);


    /**
     * ---------------- ARMS -------------------------------------------------
     * Each arm is a GROUP so the hand can sit at unscaled coordinates: a capsule scaled
     * (0.12, 0.48, 0.12) would turn a spherical hand into a lozenge.
     *
     * THE TWO RANKS HOLD COMPLETELY DIFFERENT POSES AND THAT IS THE TEACHING:
     *  · the BOSS's arms come FORWARD and slightly down, hands on the lower corners of the
     *    board. He is presenting it. Nothing is on him.
     *  · the RECRUIT's arms go STRAIGHT UP, hands flat above his head against the tier he is
     *    holding. He is load-bearing. At 40 px that pose is an unmistakable atlas, and a row
     *    of three of them under a stone plinth is the whole scam in one silhouette.
     */
    const armGeo = geo('pArm', () => new THREE.CapsuleGeometry(1, 1.2, 5, 10));
    const handGeo = geo('pHand', () => new THREE.SphereGeometry(1, 10, 8));
    /**
     * THE DOWNLINE'S ARMS ARE LONGER, AND THE NUMBER IS SOLVED FROM THE LEVEL, NOT PICKED.
     * `CapsuleGeometry(1, 1.2)` is 3.2 units tall, so a limb scaled `y` reaches `1.6*y` from
     * the shoulder. At the boss's 0.46 R that puts a raised hand 1.25 R above the villain's
     * centre — BELOW his own hair crown at 1.82 R, i.e. "arms up" that do not clear the head
     * and read as a shrug. l3 stands its downline in a 1.55-unit bay under a stone plinth
     * with the character's centre 0.48 above the floor, so the hand has to reach 1.07 units
     * = 2.23 R to touch it. 0.72 R of limb plus a 0.62 R shoulder gets the fingertips to
     * 1.95 R, which leaves 0.13 units of daylight — close enough to read as CONTACT at play
     * size, and honest, because he is not actually a support and must not look welded on.
     */
    const makeArm = (side) => {
      const arm = new THREE.Group();
      // A THINNER ink than the body (0.026 against 0.036). Outline weight is a ratio to what
      // it surrounds: at the default weight a 0.12 R limb is ~35 % ink and both arms read as
      // black bars at gameplay size.
      const limb = new THREE.Mesh(armGeo, skinMat);
      limb.scale.set(R * 0.120, R * 0.780, R * 0.120);
      limb.castShadow = true;
      limb.userData.inkWidth = 0.026;
      arm.add(limb);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.scale.setScalar(R * 0.150);
      hand.position.y = R * 1.26;
      hand.userData.inkWidth = 0.026;
      arm.add(hand);
      const sleeve = new THREE.Mesh(armGeo, bodyMat);
      sleeve.scale.set(R * 0.152, R * 0.150, R * 0.152);
      sleeve.position.y = -R * 1.04;
      sleeve.castShadow = true;
      sleeve.userData.inkWidth = 0.026;
      arm.add(sleeve);
      g.add(arm);
      return arm;
    };
    const armR = makeArm(1);
    const armL = makeArm(-1);

    /**
     * The downline gets the same diagram as a BADGE — one mesh, the shared texture, worn
     * on the chest like a conference lanyard. It is 4 px on a phone and it is not what
     * makes him readable (the atlas pose is); it is what makes him unmistakably part of
     * THIS scheme rather than a generic bystander when the camera is close.
     */
    const badge = makeBoard(R * 0.86, R * 0.60, R * 0.05);
    badge.position.set(0, -R * 0.10, R * 0.70);
    badge.rotation.z = 0.09;
    badge.userData.inkWidth = 0.030;
    g.add(badge);
    this.badge = badge;
    this.addDetachable(badge, { vx: 1.1, vy: 4.0, spin: 13, ttl: 1.1 });

    /**
     * The same plaque as the boss's, at 38 % of its size and pulled down the value ramp —
     * see the `PONZI_TAG_MINI` note. Mounted on the BADGE, so it detaches with it at the
     * death pop and needs no detachable of its own. No tell band: at this size the band
     * would be sub-pixel, and base.js's rule is that a band below 20 % of the prop's height
     * is texture rather than information.
     */
    this.tag = mountPlaque(badge, {
      name: 'scam-ponzi',
      w: R * PONZI_TAG_MINI.w, h: R * PONZI_TAG_MINI.h, d: R * PONZI_TAG_MINI.d,
      dim: true, rimWeight: 0.12, ink: 0.030,
    }, { x: 0, y: R * PONZI_TAG_MINI.y, proud: 0.012 });

    /**
     * SPLAYED INTO A V, and it costs reach on purpose. base.js: raised arms that run
     * PARALLEL to the neck fill the one concavity a character's silhouette has and turn it
     * into a single column. At the first pose (shoulders +-0.50 R, z 0.62 world = 1.29 R at
     * this radius) both forearms ran straight up ACROSS the face — the arms were in front
     * of the eyes, which is the same legibility failure as the boss's board. At +-0.55 R
     * with a 0.24 rad splay and z 0.30 the hands sit at +-0.85 R, clear of a head half a
     * radius wide, and the head keeps a notch of sky on each side.
     */
    armR.position.set(R * 0.78, R * 0.62, 0.30);
    armR.rotation.z = -0.14;
    armL.position.set(-R * 0.78, R * 0.62, 0.30);
    armL.rotation.z = 0.14;
    this.armR = armR;
    this.armL = armL;

    // Thinner ink than the blocks get: this is a small object made of many small parts, and
    // a 0.05 outline on a 0.06 R detail turns the whole face into a black smudge.
    inkAll(g, 0.036);

    // ---------------- register with base.js ---------------------------------
    this.registerRig({ belly, bob: [headG], face });
    this.registerFace({
      eyes: [eL, eR],
      brows,
      mouths: { idle: mSmug, alarmed: mOh, braced: mGrit, defeated: mSad },
    });

    /**
     * THE RECRUIT'S FLINCH IS THE LESSON, NOT THE GAG.
     * REST: both arms straight up, holding the tier above. GUARD: both arms clamp DOWN
     * over his own head. He stops holding it up the instant something comes at him, which
     * is (a) what a person does and (b) exactly why the structure above him is about to
     * stop existing. Two poseable() calls, no new machinery, and it is legible as a black
     * fill at 40 px because the arms leave the sky above his head.
     */
    this.poseable(armR, { guard: { x: R * 0.62, y: R * 0.24, z: 0.34, rot: -1.52 }, snap: 0.08 });
    this.poseable(armL, { guard: { x: -R * 0.62, y: R * 0.24, z: 0.34, rot: 1.52 }, snap: 0.08 });
  }

  /** The downline's shades slip down his nose as the confidence drains out of him. */
  applyFace(state) {
    const scared = state === FACE.ALARMED || state === FACE.BRACED || state === FACE.DEFEATED;
    this.slip = scared ? (state === FACE.DEFEATED ? 1.0 : 0.5) : 0;
  }

  /**
   * BEING CRUSHED. `k` is `duress`, 0..1 — base.js has already given him the braced face,
   * the held squash and the directional lean by the time this runs, and calls this LAST so
   * everything here is additive on top of the idle.
   *
   * Two additions, both chosen because they survive the 40 px test, which a face does not:
   *
   *  · THE PLAN BUCKLES. The board drops, rotates toward flat and its Y scale is pinched, so
   *    the triangle visibly folds. That is the lesson in one frame — the diagram is the first
   *    thing that collapses — and it is why this hook exists on the base class at all.
   *    Rotation is capped at 0.22 rad: on a board 2.70 R wide, every radian of tilt drops the
   *    low corner by 1.35 R, and past that the corner reaches the brows and cuts the braced
   *    face in half at exactly the moment the crush exists to show it.
   *  · THE DOWNLINE'S ARMS GIVE WAY. They splay outward and his hands drop below his own
   *    shoulders. He is not holding it any more; it is holding him.
   *
   * And the SEAT takes the squash on the boss, because base.js's crush squash widens the
   * BELLY, and at 2.70 R the guard-posed board is over the chest — the mass cue would be
   * silently lost behind paper. The seat flare sits at -0.64 R, well below anything the prop
   * ever covers. Reset every frame by onIdle's contract.
   */
  onDuress(k) {
    const R = this.radius;
    if (this.seat) {
      const s0 = this.seatBase;
      this.seat.scale.set(s0.x * (1 + k * 0.26), s0.y * (1 - k * 0.24), s0.z * (1 + k * 0.26));
    }
    if (this.shades) {
      this.shades.position.set(0, R * (1.50 - k * 0.30), R * (0.34 + k * 0.10));
      this.shades.rotation.z = 0.06 - k * 0.34;
    }
    /**
     * THE PYRAMID BUCKLES, TIER BY TIER — the boss's half of this hook, and the reason the
     * chart is a stack rather than a triangle.
     *
     * base.js's held crush squash has already flattened the whole chart group by up to 30 %
     * of its height, ABOUT ITS FEET (see the TIERS block), so the base stays planted while the
     * top comes down. On top of that the two upper tiers sink further and stagger in opposite
     * directions, and the sign swings off its bolt. What the player reads is a structure whose
     * courses are sliding on each other — which is exactly what is happening to it, and what
     * the whole level is about.
     */
    if (this.chart) {
      const t = this.tiers;
      t.gold.position.y = t.gold.userData.restY - k * R * 0.34 - (this.__retract ?? 0);
      t.navy.position.y = t.navy.userData.restY - k * R * 0.16;
      t.gold.rotation.z = k * 0.17;
      t.navy.rotation.z = -k * 0.10;
      t.coral.scale.x = R * TIERS[0].wb * (1 + k * 0.06);
      if (this.face) this.face.position.y = this.faceRestY - k * R * 0.34 - (this.__retract ?? 0);
      // The crown travels with the tier it is balanced on. Without this it keeps whatever y
      // `onIdle` gave it and hangs in the sky above a pyramid that has been crushed out from
      // under it — measured on the duress capture, 0.42 R of daylight between the two.
      if (this.crown) {
        this.crown.rotation.z = k * 0.55;
        this.crown.position.y = R * 2.70 - (this.__retract ?? 0) - k * R * 0.34;
      }
      if (this.sign) this.sign.rotation.z = -0.07 - k * 0.40;
    }
    if (this.constructor.rank !== 'boss') {
      // The support fails: elbows out, hands down, the classic buckle.
      this.armR.rotation.z = -0.14 - k * 0.95;
      this.armL.rotation.z = 0.14 + k * 0.95;
      this.armR.position.y = R * (0.62 - k * 0.34);
      this.armL.position.y = R * (0.62 - k * 0.34);
    }
  }

  onIdle(dt) {
    const t = world.simTime;
    const R = this.radius;
    // Release anything onDuress writes. It only runs while duress > 0, so anything it sets
    // must be re-based here or a villain who survives a collapse stays permanently folded.
    if (this.seat) this.seat.scale.copy(this.seatBase);
    if (this.shades) {
      const slip = this.slip ?? 0;
      this.shades.position.set(0, R * (1.50 - slip * 0.16), R * (0.34 + slip * 0.06));
      this.shades.rotation.z = 0.06 + Math.sin(t * 2.0 + this.bobPhase) * 0.045 - slip * 0.20;
    }
    if (this.chart) {
      /**
       * THE APEX RETRACTS — the boss's flinch, on `objectFace.flinch()`'s eased blend because
       * `poseable()` cannot drive a child tier's y independently of the face that has to travel
       * with it. Both are moved from the SAME number here, which is the whole reason the face
       * is a child of the chart rather than of the tier.
       *
       * Everything below is re-based every frame rather than left where `onDuress` put it:
       * that hook only runs while duress > 0, so a boss who survived a collapse would stay
       * permanently staggered.
       */
      const f = flinch(this, dt, 0.10);
      const retract = f * R * 0.62;
      this.__retract = retract;
      const tr = this.tiers;
      tr.gold.position.y = tr.gold.userData.restY - retract;
      tr.navy.position.y = tr.navy.userData.restY;
      tr.gold.rotation.z = 0;
      tr.navy.rotation.z = 0;
      tr.coral.scale.x = R * TIERS[0].wb;
      if (this.face) this.face.position.y = this.faceRestY - retract;
      if (this.crown) {
        this.crown.rotation.z = Math.sin(t * 2.1 + this.bobPhase) * 0.10;
        this.crown.position.y = R * 2.70 - retract;
      }
      // A slow presentational sway on the whole chart, ADDITIVE on base.js's pose lerp.
      // Suppressed while guarding (a pyramid hiding its point holds still) and while the
      // gloat owns it.
      if (this.tauntT < 0 && this.faceState === FACE.IDLE) {
        this.chart.rotation.z += Math.sin(t * 1.20 + this.bobPhase) * 0.026;
      }
      if (this.sign) this.sign.rotation.z = -0.07 + Math.sin(t * 1.7 + this.bobPhase) * 0.045;
    }
    if (this.constructor.rank !== 'boss') {
      /**
       * THE STRAIN. The downline's arms are load-bearing, so the idle is not a wave — it is
       * a tremble, at twice the breathing rate and a tenth of the amplitude, with the two
       * arms in counter-phase so the shudder reads as effort rather than as a sway. This is
       * the only motion on the character that is not base.js's breath, and it is what stops
       * three identical figures in a row from reading as furniture.
       */
      const strain = Math.sin(t * 3.1 + this.bobPhase) * 0.030;
      this.armR.rotation.z = -0.14 + strain;
      this.armL.rotation.z = 0.14 - strain;
      this.armR.position.y = R * 0.62;
      this.armL.position.y = R * 0.62;
    }
  }

  /**
   * The gloat, after a shot that failed to kill him (RUBRIC P11: a miss must be punished with
   * a visible taunt inside a second).
   *
   * The boss TAPS THE BOARD — he slides it toward the player and back, twice, the way a man
   * taps a slide he thinks you have not understood. Translation rather than rotation, because
   * a 22 px slab sliding a fifth of its own width is far more visible on a phone than a tilt,
   * and rotation is the axis that fouls his own chin on a board this wide.
   *
   * The downline has no board to wave, so he PUMPS both fists — the recruitment-seminar
   * whoop. Same beat, opposite meaning: the boss is selling, the downline is celebrating a
   * commission he will never see.
   */
  onTaunt(k) {
    const R = this.radius;
    const swing = Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI);
    if (this.chart) {
      /**
       * THE APEX BOUNCES. A shot that missed pays the man at the top: the gold tier and the
       * crown jump 0.30 R twice while the base does not move at all, which is the level's own
       * sentence performed in half a second — the top gets paid, the bottom holds still.
       */
      const lift = Math.max(0, swing) * R * 0.30;
      this.tiers.gold.position.y = this.tiers.gold.userData.restY + lift;
      if (this.face) this.face.position.y = this.faceRestY + lift;
      if (this.crown) this.crown.position.y = R * 2.70 + lift * 1.35;
      this.chart.rotation.z = -0.02 + swing * 0.05;
    } else {
      this.armR.position.y = R * (0.62 + swing * 0.20);
      this.armL.position.y = R * (0.62 + swing * 0.20);
      this.armR.rotation.z = -0.14 - swing * 0.22;
      this.armL.rotation.z = 0.14 + swing * 0.22;
    }
  }

  /** Beat 0 is the oof: the shades jump before they leave, on the frame the body compresses. */
  onDeathBeat(beat, k) {
    const R = this.radius;
    if (beat === 0 && this.shades?.parent) {
      this.shades.position.y = R * (1.50 + k * 0.30);
    }
    /**
     * THE STACK COMES APART, and this is the beat the whole character exists for. base.js
     * scales the mesh and counter-scales the face; what a PYRAMID adds is that its courses
     * slide off each other — gold one way, navy the other, the base staying put — so the frame
     * the hit-stop holds (~155 ms, the frame the player actually looks at) is a structure
     * failing rather than a triangle getting shorter. It is also the only death in the game
     * that states its own lesson: the shape only stood up while the tiers were stacked.
     */
    if (this.chart) {
      const t = this.tiers;
      const g = beat === 0 ? k : 1;
      const h = beat === 1 ? k : beat === 2 ? 1 : 0;
      t.gold.position.x = -R * (0.34 * g + 0.55 * h);
      t.gold.rotation.z = 0.30 * g + 0.42 * h;
      t.navy.position.x = R * (0.20 * g + 0.36 * h);
      t.navy.rotation.z = -0.16 * g - 0.24 * h;
      if (this.face) this.face.position.x = -R * (0.34 * g + 0.55 * h);
      if (this.crown?.parent) this.crown.position.y = R * (2.70 + 0.36 * g);
    }
  }

  /**
   * THE PROMISE SIGN BECOMES A REAL, FALLING, TUMBLING PHYSICS PROP (RUBRIC P11 wants one
   * genuinely physical absurd prop per chapter). It is spawned at the transform its mesh
   * actually HOLDS, not at a hard-coded offset: the crush may have swung it off its bolt, and
   * a prop that teleports back to a rest pose on the frame of death breaks the one frame that
   * matters most.
   *
   * READ base.js's "THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER" block before touching
   * this. That spawn transform is the single channel by which this file's visual layer can
   * move rigid bodies, and l3's outcomes are sensitive to it — re-run `l3-sweep.mjs` in both
   * arms if you change any pose the sign hangs off.
   *
   * ONLY THE BOSS HAS ONE. Five downline members each dropping a rigid body into a live
   * collapse would be five bodies' worth of wedging in the exact bay the collapse has to
   * reach, which is the same mistake Lottery Uncle's full-width cheque collider made and
   * which cost that character a measured half of its level's stone fractures.
   */
  onDeath(point) {
    const R = this.radius;
    const b = this.sign;
    if (!b) return;
    const at = pinnedSpawn(point, R, BOARD_PIN);
    const m = mat('prop', { color: PALETTE.gold });
    const { body, collider } = makeBody({
      kind: 'dynamic',
      x: at.x, y: at.y, rot: at.rot, m,
      // NOT this round's to retune — see the BOARD_BODY block. The sign is authored at
      // 1.75 x 1.05 R so that, for the first time, the collider and the picture match.
      shape: shapes.box(R * BOARD_BODY.w, R * BOARD_BODY.h, R * BOARD_BODY.d),
      // Explicit, and not a leftover literal: this is a lightweight display board, so it keeps
      // a damping well above the prop material's 0.030. It has to sail and clatter down after
      // the chart has gone, not drop like the block it is made of.
      linearDamping: 0.48, angularDamping: 0.55, contactForce: 20,
    });
    b.position.set(0, 0, 0);
    b.rotation.set(0, 0, 0);
    b.parent?.remove(b);
    world.scene.add(b);
    const e = new Entity({ mesh: b, body, collider, material: m, tag: 'prop' });
    e.update = function () {
      if (!this.body) return;
      const t = this.body.translation();
      if (t.y < -8) this.destroy();
    };
    body.setLinvel({ x: rngRange(-2.8, 3.2), y: rngRange(3.2, 6.4), z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: rngRange(-9, 9) }, true);
    this.sign = null;
    this.tag = null;
  }
}

/**
 * THE DOWNLINE. Everything is inherited; only the three statics and the radius differ.
 * `static rank` is what `buildMesh` branches on — see the header for why it cannot be an
 * instance field.
 */
export class PonziRecruit extends PonziPyramid {
  static id = 'ponziRecruit';
  static label = 'Downline Member';
  static fact = 'He was promised 12 % a month. He is the 12 % a month.';
  static rank = 'downline';

  constructor(o = {}) {
    super({ radius: 0.48, ...o });
  }
}

export const VILLAIN_TYPES = {
  ponziPyramid: PonziPyramid,
  ponziRecruit: PonziRecruit,
};
