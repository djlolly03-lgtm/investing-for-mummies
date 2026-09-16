/**
 * villains/creditCardTrap.js — THE CREDIT CARD THAT EATS YOU.  Chapter 2's villain.
 *
 * "Relax sir, only ₹700 due this month. Pay the minimum, keep the card active!"
 *
 * ── WHAT CHANGED ────────────────────────────────────────────────────────────
 * This was a man whose HEAD was a credit card, holding out a long paper statement. The class
 * name, the id `"creditCardTrap"` and the level file are unchanged; the character is now the
 * card itself, with a hinged jaw. The reasons are the ones in `objectFace.js`'s header, and
 * one more that is specific to this chapter: the old character's own doc-comment argued that
 * the card had to move onto a man's shoulders so that l1 and l2 would not black-fill to the
 * same silhouette. Once l1 became a cheque and l2 a card, that argument is spent — two
 * rectangles is the problem, and the answer is not a man to hang one on, it is a JAW.
 *
 * ── THE ONE IDEA: A GRINNING CARD THAT CHOMPS ───────────────────────────────
 * The card is cut in two along a bite line 0.05 R above its own middle. The lower half is the
 * body; the upper half is HINGED at its right-hand end and lifts. Both halves carry a row of
 * cream teeth on the cut, with a near-black gullet behind them, so:
 *
 *   · CLOSED it is a card: rounded corners, a magstripe along the top, a silver chip, and a
 *     row of teeth reading as one hard bright line across the plastic — a grin.
 *   · OPEN it is a MOUTH. At the idle chomp (0.16 rad) the far corner lifts 0.55 R; at the
 *     alarmed gape (0.30 rad) it lifts 1.03 R and the silhouette gains a black wedge with
 *     teeth in it. Nothing else in the game has that outline.
 *
 * WHY IT HINGES ON THE RIGHT AND OPENS TO THE LEFT: the slingshot is at x 0 and every villain
 * is downrange of it, so the player is always looking at this character's left-hand side. A
 * mouth that opens away from the player is a mouth nobody sees. It also means the character
 * is chewing TOWARD the incoming shot, which is the whole joke of the chapter.
 *
 * AND WHY THE UPPER HALF LIFTS RATHER THAN THE LOWER HALF DROPPING, which is the obvious way
 * to build a jaw and is wrong here: the card's bottom edge sits at -1.00 R, which is the
 * ground (or, for the second villain, the top of a stone platform). A lower jaw 3.6 R long
 * swinging down about a hinge disappears INTO the floor — measured, at 0.62 rad its tip is
 * 2.18 R below centre, more than a radius underground. Lifting the top half spends headroom
 * instead, and headroom is the one thing both of l2's bays have: the gape's top corner reaches
 * 2.29 R against a ceiling budget of 2.33 R under the vault lintel and 2.70 R under the
 * counter beam.
 *
 * ── THE BANDS, AGAINST A 22 x 15 PX BUDGET ──────────────────────────────────
 *   magstripe   20 % of the card's height, near-black, along the top edge. The one mark that
 *               is on every credit card in the world and survives any downscale.
 *   gold field  the plastic: two eyes, and the CHIP between them where a nose goes — the
 *               brightest COOL value on a warm card, so it holds at 40 px when nothing else
 *               on the face does.
 *   the bite    teeth and gullet across the middle. It is the silhouette, so it is geometry
 *               (objectFace.teethRow) and not paint: a zig-zag drawn into the canvas vanishes
 *               the moment the jaw opens, because what the player is reading then is the gap
 *               between two edges rather than the print on either.
 *
 * ── THE MINIMUM-DUE SLIP, AND WHAT IT TEACHES ───────────────────────────────
 * `l2.json` teaches "pay the minimum and you are not clearing the debt. You are feeding it."
 * The slip clipped under the card's left end carries both numbers — TOTAL ₹40,000 set large,
 * MIN ₹700 set small next to it — because the lie is the RATIO and a ratio needs both halves.
 * It is also the piece that becomes a rigid body at the death pop, and it is sized to the
 * collider the old statement used (`STM_BODY`), which is not this round's to retune.
 *
 * ── MASS ────────────────────────────────────────────────────────────────────
 * The ball collider, its density and all four damage constants are untouched. Weight is sold
 * the same way it is on l1: the visual's bottom edge is exactly the collider's bottom, the
 * card group is registered as `belly` so base.js's HELD crush squash flattens the whole card
 * under a storey, and `onDuress` BITES DOWN — the jaw clamps past closed and the card folds
 * about its own bite line, which is what a plastic card does when something stands on it.
 */

import * as THREE from 'three';
import { Villain, FACE } from './base.js';
import { mat, PALETTE } from '../art/materials.js';
import { RAMP_HARD, inkAll } from '../art/toon.js';
import { Entity, makeBody, shapes } from '../level/entity.js';
import { makeScamPlaque } from './scamIcon.js';
import {
  makeGoogly, makeMouths, flinch, band, canvasTexture, printedPanel, roundRectGeo,
  hardRectGeo, teethRow, drawRupee, fitFont, pinnedSpawn,
} from './objectFace.js';
import { world } from '../world.js';
import { rngRange } from '../rng.js';

/**
 * ── THE PALETTE IS A VALUE LADDER (Rec.709 luminance out of 255) ─────────────
 *   card    0xe8c66a ... 199   the plastic. Warm, and four units off the sky (195) — the
 *                              separation is HUE, so the contour has to hold the value edge,
 *                              which is why the panels carry a 0.052 ink.
 *   edge    0xb5883a ... 143   the card's cut edge, 56 units under its face
 *   stripe  0x191319 ...  21   the magstripe: the mark that survives any downscale
 *   chip    0xd9dee6 ... 221   the one COOL bright on a warm card, just under glass (222) so
 *                              RUBRIC P7's "glass is the brightest value" still holds
 *   gullet  0x2a1220 ...  30   behind the teeth. Darker than the stripe on purpose: an open
 *                              mouth has to be the darkest hole on the character.
 */
const CARD_C   = 0xe8c66a;
const EDGE_C   = 0xb5883a;
const STRIPE   = 0x191319;
const CHIP     = 0xd9dee6;
const GULLET   = 0x2a1220;
const PAPER_C  = '#e9dcc0';
const NAVY_C   = '#1a3a5c';
const CORAL_C  = '#e76f51';
const CREAM_C  = '#fdf6ec';
/** The palette above is the single source; a canvas needs the same value as a CSS string. */
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/**
 * ── THE CARD (multiples of R) ────────────────────────────────────────────────
 * 3.60 x 2.50 R = 1.94 x 1.35 world, i.e. 22 x 15 CSS px at the phone's draw framing, with
 * the gape adding up to 8 px of height on top. `bite` is where the cut runs, measured from the
 * card's centre: slightly ABOVE it, so the jaw is the bigger half and the mouth sits low on
 * the face the way a mouth does.
 *
 * The corner radius is 0.075 of the short side — the real ISO card radius is about that, and
 * it is most of what makes a gold rectangle read as a CARD rather than as a sign once every
 * mark on its face has dissolved.
 */
const CARD = { w: 3.60, h: 2.20, d: 0.16, bite: 0.05, r: 0.060 };
/** In front of every block: the same measured decision as l1's, and the same note applies. */
const CARD_Z = 0.60;
/** How far the jaw opens, in radians of the upper half about its right-hand hinge. */
const CHOMP = 0.15;      // the idle chew, on top of the 0.085 the jaw rests open at
/**
 * ── THE GAPE IS SET BY A CEILING, AND IT WAS MEASURED, NOT CHOSEN ────────────
 * The jaw is 3.60 R long and hinged at one end, so every radian of opening lifts its far
 * corner by 3.60 R — an enormous lever, and the reason the first number here was wrong.
 * `_tools/scenarios/cast-extremes.mjs` reports each villain's guard-pose top against the
 * lowest block actually above it, and at 0.30 rad on a 2.50 R card this character went
 * THROUGH both of l2's ceilings: -0.08 world under the counter beam and -0.24 under the vault
 * lintel. A gape that clips a lintel is a defect no idle still can show.
 *
 * Two changes bought it back, and the arithmetic is:
 *     top = cardOffset(0.10) + hinge(0.05) + 3.60 sin a + hUp cos a   <=  2.25 R
 * · the card is 2.20 R tall rather than 2.50, which lowers `cardOffset` from 0.25 to 0.10 R
 *   and `hUp` from 1.20 to 1.05 — and, as a bonus, 3.60 : 2.20 is 1.64, within a whisker of
 *   the real ISO card ratio of 1.586, which is most of what makes a gold rectangle read as a
 *   CARD once every mark on it has dissolved;
 * · the guard no longer rears the whole card BACK (-0.14 rad lifted its left side another
 *   0.25 R for nothing); it tips very slightly forward instead.
 * At 0.28 rad the corner lands at 2.00 R, which clears the tighter of the two ceilings by
 * 0.10 R. Re-run cast-extremes.mjs if the card's height, the hinge or either level moves.
 */
const GAPE  = 0.28;

/** The minimum-due slip: the teaching device, and the death prop. */
const SLIP     = { w: 1.70, h: 0.62, d: 0.06, x: -0.86, y: -0.86 };
const CARD_TAG = { w: 0.86, h: 0.98, d: 0.15, x: 1.94, y: -0.34 };

/**
 * ── THE DEATH PROP'S COLLIDER IS NOT THIS ROUND'S TO RETUNE ──────────────────
 * The old statement's dimensions, kept to the digit, for the reason `lotteryUncle.js`'s
 * `CHQ_BODY` block gives: `onDeath()`'s spawn is the one channel from a villain's visual layer
 * into the solver, and `levels/stars.json` was measured through it. The slip above is authored
 * at 1.70 x 0.62 R so the collider and the picture are finally about the same size.
 */
const STM_BODY = { w: 1.55, h: 0.58, d: 0.34 };
/**
 * Where that body is born — pinned, and SWEPT (`cast-propsweep.mjs`). This one is the happy
 * case: the winning offset IS the slip's own rest offset, so the prop spawns exactly where it
 * was drawn — no jump at all — and l2's recorded plans replay to the point:
 *
 *   pin              proof3 (t3 21000)   proof2 (t2 11500)
 *   (0.00, 0.30)     won  22,200         LOST  6,900        <- the first guess
 *   (-0.86, 0.10)    won  22,200         LOST  8,000
 *   (-0.70,-0.30)    LOST  7,500         LOST  6,900
 *   (-0.86,-0.76)    won  22,200         won  12,200  ***   <- and both are the recorded scores
 */
const STM_PIN = { id: 'l2', x: -0.86, y: -0.76, rot: -0.06 };

// ---------------------------------------------------------------------------
// THE PRINTED FACE OF THE CARD — one design, painted per half
// ---------------------------------------------------------------------------

/**
 * The card is laid out once in full-card pixels and each half paints its own slice, for the
 * reason `lotteryUncle.paintCard` gives at length: two hand-authored canvases is how a band
 * ends up 20 % of the height on one piece and 19 % on the other, which at 3 px tall is a step
 * you can see. `y0`/`y1` are the piece's span as fractions of the card's height from the TOP.
 */
function paintCard(g, W, H, y0, y1) {
  const FH = H / (y1 - y0);
  const oy = -y0 * FH;
  const Y = (f) => oy + f * FH;

  g.fillStyle = hex(CARD_C); g.fillRect(0, 0, W, H);
  // The plastic's sheen: one soft diagonal, low contrast, so it disappears at 15 px rather
  // than competing with the chip.
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.beginPath();
  g.moveTo(0, Y(0.44)); g.lineTo(W, Y(0.06)); g.lineTo(W, Y(0.24)); g.lineTo(0, Y(0.62));
  g.closePath(); g.fill();
  g.restore();

  // ---- the magstripe, 18 % of the card's height ---------------------------
  // The eyes deliberately OVERLAP its lower edge by 0.12 R and the brows sit squarely on it —
  // see the face block. A black band with two white discs half-sunk into it is a bandit's mask,
  // which is both the highest-contrast arrangement available on this character and, for a scam
  // villain, the correct one. It only works because the brows go CREAM where they cross it.
  g.fillStyle = hex(STRIPE);
  g.fillRect(0, Y(0), W, Y(0.18) - Y(0));
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, Y(0.158), W, Y(0.18) - Y(0.158));

  // ---- the embossed number, along the lower half --------------------------
  // Desktop-only detail by base.js's own rule (body copy is a lie at play size), and it is
  // here because a card with no number reads as a blank swatch when the camera does come in.
  g.fillStyle = 'rgba(90,60,10,0.55)';
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const nSize = fitFont(g, '4929  ••••  ••••  0000', W * 0.80, Math.round(FH * 0.105),
    '"Arial Black", Arial, sans-serif');
  g.font = `bold ${nSize}px "Arial Black", Arial, sans-serif`;
  g.fillText('4929  ••••  ••••  0000', W * 0.09, Y(0.735));
  const vSize = fitFont(g, 'VALID THRU  12/49', W * 0.42, Math.round(FH * 0.070), 'Arial, sans-serif');
  g.font = `bold ${vSize}px Arial, sans-serif`;
  g.fillText('VALID THRU  12/49', W * 0.09, Y(0.855));
  g.textAlign = 'right';
  g.fillStyle = 'rgba(90,60,10,0.40)';
  g.fillText('EASYCREDIT', W * 0.94, Y(0.855));
}

const _cardTex = new Map();
function cardTexture(y0, y1) {
  const key = `${y0}:${y1}`;
  if (_cardTex.has(key)) return _cardTex.get(key);
  const W = Math.round(CARD.w * 260);
  const H = Math.max(8, Math.round(CARD.h * (y1 - y0) * 260));
  const t = canvasTexture(W, H, (g, w, h) => paintCard(g, w, h, y0, y1));
  _cardTex.set(key, t);
  return t;
}

/**
 * THE SLIP'S PRINT — and the one piece of type on this character that is not decoration.
 * TOTAL is set four times the size of MIN because the scam is the ratio between them: a
 * statement that shows you a small number and hides a large one is the whole of `l2.json`'s
 * "you are not clearing the debt, you are feeding it".
 */
let _slipTex = null;
function slipTexture() {
  if (_slipTex) return _slipTex;
  _slipTex = canvasTexture(Math.round(SLIP.w * 320), Math.round(SLIP.h * 320), (g, W, H) => {
    g.fillStyle = PAPER_C; g.fillRect(0, 0, W, H);
    g.fillStyle = NAVY_C; g.fillRect(0, 0, W, H * 0.22);
    g.fillStyle = CREAM_C;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    let s = fitFont(g, 'STATEMENT', W * 0.5, Math.round(H * 0.17), 'Georgia, serif');
    g.font = `bold ${s}px Georgia, serif`;
    g.fillText('STATEMENT', W * 0.05, H * 0.12);

    drawRupee(g, W * 0.05, H * 0.34, H * 0.42, '#1a3a5c');
    g.fillStyle = NAVY_C;
    s = fitFont(g, '40,000', W * 0.42, Math.round(H * 0.46), '"Arial Black", Arial, sans-serif');
    g.font = `bold ${s}px "Arial Black", Arial, sans-serif`;
    g.fillText('40,000', W * 0.19, H * 0.56);

    g.fillStyle = CORAL_C;
    g.fillRect(W * 0.62, H * 0.30, W * 0.35, H * 0.56);
    g.fillStyle = CREAM_C;
    g.textAlign = 'center';
    s = fitFont(g, 'MIN DUE', W * 0.31, Math.round(H * 0.16), 'Arial, sans-serif');
    g.font = `bold ${s}px Arial, sans-serif`;
    g.fillText('MIN DUE', W * 0.795, H * 0.44);
    s = fitFont(g, '700', W * 0.28, Math.round(H * 0.30), '"Arial Black", Arial, sans-serif');
    g.font = `bold ${s}px "Arial Black", Arial, sans-serif`;
    g.fillText('700', W * 0.795, H * 0.70);
  });
  return _slipTex;
}

// ---------------------------------------------------------------------------

export class CreditCardTrap extends Villain {
  static id = 'creditCardTrap';
  static label = 'The Credit-Card Trap';
  static fact = '₹40,000 at the minimum takes eighteen years. The card is in no hurry.';

  constructor(o = {}) {
    super({ radius: 0.54, matName: 'villain', ...o });
  }

  buildMesh(g) {
    const R = this.radius ?? 0.54;

    /**
     * ── THE CARD GROUP ──────────────────────────────────────────────────────
     * Registered with base.js as `belly`, so the breath swells it and the crush squash
     * flattens it. Its y puts the card's bottom edge at exactly -1.00 R — the collider's own
     * bottom — so it neither floats nor sinks on either of the two very different perches
     * `l2.json` gives it (bare ground at y 0.54, a stone platform at y 1.18).
     */
    const cardG = new THREE.Group();
    cardG.position.set(0, R * (CARD.h / 2 - 1.00), CARD_Z);
    cardG.rotation.z = 0.02;
    g.add(cardG);
    this.cardG = cardG;
    this.cardRestY = cardG.position.y;

    // The bite line, in card-local units, and the two halves it makes.
    const yBite = R * CARD.bite;
    const hUp = R * CARD.h / 2 - yBite;             // the upper half's height
    const hLo = R * CARD.h / 2 + yBite;             // the lower half's
    const half = R * CARD.w / 2;

    /**
     * ---------------- THE LOWER HALF: the body ------------------------------
     * `CARD.r` is a fraction of the UNIT shape, so a non-uniform scale turns the corners into
     * quarter-ellipses rather than quarter-circles. That is deliberate and it is cheap: at the
     * 22 px this card is drawn at, the difference between a 0.22 R x 0.08 R corner and a round
     * one is a fifth of a pixel, and the alternative is two shape geometries per half so the
     * radius can be un-scaled. What matters is that both halves take the SAME fraction, so the
     * card still reads as one object when the jaw is shut.
     */
    const lower = printedPanel(roundRectGeo(CARD.r),
      cardTexture(0.5 - CARD.bite / CARD.h, 1), EDGE_C, { ink: 0.052 });
    lower.scale.set(R * CARD.w, hLo, R * CARD.d);
    lower.position.set(0, -hLo / 2 + yBite, 0);
    cardG.add(lower);
    this.lower = lower;

    /**
     * ---------------- THE GULLET --------------------------------------------
     * A near-black slab spanning the bite, standing BEHIND both halves in z. Without it an
     * open jaw shows the sky through the character, which reads as a hole in the art rather
     * than as a mouth. It is 0.55 R tall, which covers the widest gape with margin.
     */
    const gullet = new THREE.Mesh(hardRectGeo(),
      new THREE.MeshToonMaterial({ color: GULLET, gradientMap: RAMP_HARD() }));
    gullet.scale.set(R * CARD.w * 0.92, R * 1.30, R * CARD.d * 0.5);
    gullet.position.set(-R * 0.10, yBite - R * 0.34, -R * CARD.d * 0.30);
    gullet.userData.inkWidth = 0.030;
    cardG.add(gullet);

    /**
     * ---------------- THE UPPER HALF: the jaw -------------------------------
     * A GROUP whose origin is the hinge — the card's right-hand end, on the bite line — with
     * the panel offset inside it, so `rotation.z` is a hinge and not a spin. Everything that
     * belongs to the upper jaw (the magstripe, the eyes, the upper teeth) is a child of it and
     * lifts with it, which is what makes the gape read as a head tipping back.
     */
    const jaw = new THREE.Group();
    jaw.position.set(half, yBite, 0);
    /**
     * THE MOUTH IS NEVER QUITE SHUT, and that came off a play-size capture: with the jaw closed
     * the tooth rows interlock into a single 1 px line and the character read as a plain card
     * with eyes — no mouth at all for two thirds of the chew cycle, which is most of the frames
     * a player ever sees it in. At 0.085 rad the far corner stands 0.29 R proud, which is 3 px
     * of black gullet with white teeth in it: enough that the grin exists in every frame, small
     * enough that it still reads as a closed smile rather than as a gape.
     */
    jaw.rotation.z = -0.085;
    cardG.add(jaw);
    this.jaw = jaw;

    const upper = printedPanel(roundRectGeo(CARD.r),
      cardTexture(0, 0.5 - CARD.bite / CARD.h), EDGE_C, { ink: 0.052 });
    upper.scale.set(R * CARD.w, hUp, R * CARD.d);
    upper.position.set(-half, hUp / 2, 0);
    jaw.add(upper);
    this.upper = upper;

    /**
     * ---------------- THE TEETH ---------------------------------------------
     * Real geometry on both edges of the cut — see objectFace.teethRow for why they cannot be
     * paint. They stop 0.6 R short of the hinge end, because a tooth at the hinge of a jaw
     * reads as a broken corner rather than as a tooth, and because that is where the two rows
     * would interpenetrate at full gape.
     */
    const teethUp = teethRow(6, R * 2.55, R * 0.34, { down: true, x0: -R * 0.30 });
    teethUp.position.set(-half, 0, R * CARD.d * 0.22);
    jaw.add(teethUp);
    const teethLo = teethRow(5, R * 2.20, R * 0.26, { down: false, x0: -R * 0.42 });
    teethLo.position.set(0, yBite, R * CARD.d * 0.22);
    cardG.add(teethLo);

    /**
     * ---------------- THE FACE ----------------------------------------------
     * The eyes are children of the JAW, so they tilt with it: at the gape the left eye rides
     * 0.79 R higher than the right, which is a head thrown back with its mouth open, and it
     * costs nothing because the hinge does it.
     *
     * THE NUMBERS, against the upper half (0 at the bite, +1.20 R at the card's top edge):
     *   eyes   r 0.36 R at (+-0.56, +0.46) -> 4.3 px of eyeball, 0.40 R of daylight between them,
     *          their crowns sunk 0.12 R into the magstripe (lower edge +0.704 R) and their
     *          floors 0.05 R clear of the bite line, which is the tighter of the two limits:
     *          an eyeball hanging past the jaw's cut edge would read as a tooth.
     *   brows  0.61 R long at +0.84 R — on the stripe, and therefore CREAM. See below.
     *   chip   NOT between the eyes. See its own block.
     */
    const face = new THREE.Group();
    face.position.set(-half, 0, R * CARD.d * 0.5);
    jaw.add(face);
    this.face = face;

    const eyeR = R * 0.36;
    const eyes = [], brows = [];
    for (const s of [-1, 1]) {
      // RIMMED, unlike l1's: these eyes sit under a near-black magstripe on a mid-value gold
      // field, so the rim is what gives them a socket. See the one-contour note in makeGoogly.
      // CREAM brows, not dark ones, because they land on the near-black magstripe — a dark brow
      // there is not a scowl, it is a deleted brow, and at 4.3 px of eyeball the brows are half
      // of what is left of an expression. Rimmed, because the eyeball's lower half stands on
      // mid-value gold where an unrimmed white would float.
      const { eye, brow } = makeGoogly(eyeR, { side: s, tilt: 0.30, brow: 0xf3e3c2, rim: true });
      eye.position.set(s * R * 0.56, R * 0.46, 0);
      brow.position.y = eyeR * 1.05;
      face.add(eye);
      eyes.push(eye); brows.push(brow);
    }

    /**
     * THE CHIP — ON THE LOWER HALF, WHERE A CHIP ACTUALLY IS.
     * It was first placed between the eyes, as a nose, which is the obvious cartoon move and
     * the wrong one: the eyes and the jaw already say FACE loudly, and the one job left is to
     * say CARD. A silver square in the lower-left quadrant of a gold rectangle is the most
     * recognisable arrangement in consumer finance, it is the brightest COOL value on a warm
     * object, and it is the only mark on this character that is neither an eye nor a tooth —
     * so at 40 px, where every line of print has gone, what survives still reads as a card.
     * It also has to live on the LOWER half: the upper half is the jaw, and a chip that swung
     * open with the mouth would be a tooth.
     */
    const chip = new THREE.Group();
    const plate = new THREE.Mesh(roundRectGeo(0.22),
      new THREE.MeshToonMaterial({ color: CHIP, gradientMap: RAMP_HARD() }));
    plate.scale.set(R * 0.46, R * 0.38, R * 0.05);
    plate.userData.inkWidth = 0.030;
    chip.add(plate);
    // TWO contact lines, not three: at three the plate read as a barcode label rather than as a
    // chip, and a chip is identified by its outline and its VALUE (the one cool bright on a warm
    // card), not by its contacts. They are dimmer than the plate for the same reason.
    for (const i of [-1, 1]) {
      const wire = band(R * 0.34, R * 0.030, 0x9aa2ac, { z: R * 0.02 });
      wire.position.set(0, i * R * 0.085, R * 0.036);
      chip.add(wire);
    }
    chip.position.set(-R * 1.18, -R * 0.34, R * CARD.d * 0.5 + R * 0.02);
    cardG.add(chip);
    this.chip = chip;

    /**
     * The four mouths base.js switches between still exist, and they are DELIBERATELY small
     * here: on this character the mouth's job is done by the jaw, and the four states are
     * carried by the eyes plus the gape. So they are parked inside the gullet, where they read
     * as a tongue at the back of an open mouth and as nothing at all when it is shut.
     */
    const mouths = makeMouths(R * 0.26, { lip: 0x7a1f28, gold: PALETTE.gold, teeth: false });
    for (const k of Object.keys(mouths)) {
      mouths[k].position.set(-R * 0.10, yBite - R * 0.30, -R * CARD.d * 0.20);
      cardG.add(mouths[k]);
    }

    /**
     * ---------------- THE MINIMUM-DUE SLIP, and the placard on it -----------
     * Clipped under the card's LEFT end — the end the player is looking at, and the end the
     * jaw opens toward, so it is in shot in every frame that matters. It carries
     * `assets/scam-cardfire.png`, the burning-card icon from IFM's "Slash the Scam".
     *
     * A child of the CARD GROUP rather than of the jaw: the jaw is the half that moves, and a
     * slip that swung open with it would read as a tongue. It cannot be a child of the lower
     * PANEL either — that panel carries its own size in `scale`, so anything parented to it
     * inherits a 3.60 x 1.30 distortion.
     */
    const slip = printedPanel(hardRectGeo(), slipTexture(), 0xbfae8c, { ink: 0.044 });
    slip.scale.set(R * SLIP.w, R * SLIP.h, R * SLIP.d);
    slip.position.set(R * SLIP.x, R * SLIP.y, R * (CARD.d + SLIP.d) * 0.5);
    slip.rotation.z = -0.06;
    // The lower half carries its size in `scale`, so a child of it would inherit that scale;
    // the slip therefore hangs off the CARD group and is re-based in y by hand above.
    cardG.add(slip);
    this.slip = slip;

    /**
     * THE BURNING-CARD PLACARD — `assets/scam-cardfire.png` from IFM's "Slash the Scam".
     *
     * On the CARD's right-hand end, not on the slip, and that is a collision fix: mounted on
     * the slip it covered the left 60 % of it, which is exactly where ₹40,000 is printed — and
     * that number is half of the ratio this whole chapter teaches. Out here it overhangs the
     * card's own edge by 0.58 R, which is the one non-rectangular lump on the silhouette and
     * the reason this character does not black-fill to l1's cheque at 40 px.
     */
    this.cardTag = makeScamPlaque({
      name: 'scam-cardfire',
      w: R * CARD_TAG.w, h: R * CARD_TAG.h, d: R * CARD_TAG.d,
    });
    this.cardTag.position.set(R * CARD_TAG.x, R * CARD_TAG.y, R * (CARD.d * 0.5 + 0.10));
    this.cardTag.rotation.z = 0.05;
    cardG.add(this.cardTag);

    inkAll(g, 0.030);

    // ---------------- register with base.js ---------------------------------
    this.registerRig({ belly: cardG, bob: [face], face });
    this.registerFace({ eyes, brows, mouths });

    /**
     * ── THE FLINCH: THE CARD GAPES ──────────────────────────────────────────
     * l1's cheque CURLS UP and gets smaller. This one does the opposite and gets BIGGER: the
     * jaw swings to `GAPE`, the card rears back 0.14 rad and the whole silhouette grows a
     * toothed wedge that is 8 px of extra height on a phone. Two characters that both shrank
     * would be one reaction in two colours.
     *
     * `poseable()` owns the rear-back (position and Z rotation of the card). The JAW is also a
     * Z rotation, so it is poseable too — this is the one character whose whole guard read
     * fits inside base.js's own channel, and `objectFace.flinch()` is used only for the small
     * scale change that keeps the card from looking like a cut-out.
     */
    this.poseable(cardG, {
      guard: { y: this.cardRestY + R * 0.04, rot: 0.06 },
      snap: 0.09,
    });
    this.poseable(jaw, { guard: { rot: -GAPE }, snap: 0.08 });   // rest = the authored -0.085

    /**
     * ONE detachable, and the count is load-bearing: `releaseDetachables()` draws three
     * `rngRange` values per piece off the same deterministic stream the rest of the level
     * shares. The chip pops off, exactly as it did on the old character — same count, same
     * velocities, same stream.
     */
    this.addDetachable(chip, { vx: -1.4, vy: 4.8, spin: 14, ttl: 1.1 });
  }

  applyFace(state) {
    this.scared = (state === FACE.ALARMED || state === FACE.BRACED || state === FACE.DEFEATED);
  }

  /**
   * THE IDLE — THE CHEW.
   *
   * A sine would read as panting. A card that is EATING opens slowly, hangs, and snaps shut:
   * `max(0, sin)^3` spends about a third of its 4.8 s cycle open and the rest closed, with the
   * close much faster than the open because that is the shape of a bite. It is a pure function
   * of `world.simTime`, so a filmstrip seeked to the same simulated instant draws the same
   * frame, and it is cross-faded out by the flinch so a gape arriving mid-chew does not fight
   * the chew's own curve.
   *
   * Everything here is additive on base.js by contract — `updatePerformance()` has already
   * assigned the poses and the breath scale, and `onIdle` runs after it.
   */
  onIdle(dt) {
    const t = world.simTime;
    const f = flinch(this, dt, 0.09);
    const cardG = this.cardG;

    const s = Math.sin(t * 1.30 + this.bobPhase);
    const chew = s > 0 ? s * s * s : 0;
    this.jaw.rotation.z -= chew * CHOMP * (1 - f);

    // The card breathes wider as it chews — 3 % on the x, which at 22 px is half a pixel of
    // travel and reads as the plastic flexing rather than as a scale animation.
    cardG.scale.x *= 1 + chew * 0.03 - f * 0.02;
    cardG.scale.y *= 1 + f * 0.04;

    // The sway, suppressed while guarding and while the gloat owns the card.
    if (this.tauntT < 0 && this.faceState === FACE.IDLE) {
      cardG.rotation.z += Math.sin(t * 1.05 + this.bobPhase) * 0.028;
    }
    // The slip flutters on its clip, and the chip sits back up. Both re-based here rather than
    // left where onDuress put them: that hook only runs while duress > 0, so anything it writes
    // has to be re-established every frame or a card that survived a collapse stays folded.
    if (this.slip) this.slip.rotation.z = -0.06 + Math.sin(t * 1.9 + this.bobPhase) * 0.05;
    if (this.chip?.parent) this.chip.position.y = this.radius * -0.34;
    this.lower.rotation.z = 0;
  }

  /**
   * BEING CRUSHED. `k` is `duress`, 0..1. base.js has already given the card the braced face,
   * the HELD squash on its scale and the directional lean, and calls this LAST.
   *
   * THE CARD BITES DOWN. The jaw clamps 0.10 rad PAST closed, so the two tooth rows overlap
   * and the cut line disappears — a card gritting its teeth — and the whole card folds about
   * that line. That is what a piece of plastic does when a storey stands on it, and it is the
   * inverse of the gape, so a player can tell "something is coming at me" from "something is
   * already on me" by silhouette alone at 22 px.
   */
  onDuress(k) {
    const cardG = this.cardG;
    this.jaw.rotation.z += k * 0.10;
    cardG.rotation.z -= k * 0.14;
    // The fold: the lower half tips one way and the jaw the other, about the bite line.
    this.lower.rotation.z = k * 0.13;
    if (this.slip) this.slip.rotation.z = -0.06 - k * 0.42;
    if (this.chip?.parent) this.chip.position.y = this.radius * (-0.34 - k * 0.06);
  }

  /**
   * THE GLOAT, after a shot that failed to kill it (RUBRIC P11). The card CHOMPS TWICE at the
   * player — the same gesture as the idle chew, at four times the rate and twice the amplitude,
   * with the whole card leaning into each bite. On the old character the gag was that the bill
   * grew longer; this one eats the shot that missed it.
   */
  onTaunt(k) {
    const swing = Math.abs(Math.sin(k * Math.PI * 2)) * Math.sin(k * Math.PI);
    this.jaw.rotation.z = -swing * 0.34;
    this.cardG.rotation.z = 0.02 - swing * 0.10;
    this.cardG.position.x = -this.radius * swing * 0.22;
  }

  /**
   * THE DEATH POP. base.js scales the whole mesh and counter-scales the face; what a CARD adds
   * is the one image everybody already has of a credit card being dealt with: it SNAPS. On the
   * compress beat the jaw tears open past its own hinge travel and the lower half shears the
   * other way, so the frame the hit-stop holds — ~155 ms, the frame the player actually looks
   * at — is a card in two pieces rather than a card getting shorter.
   */
  onDeathBeat(beat, k) {
    if (beat === 0) {
      this.jaw.rotation.z = -k * 0.85;
      this.lower.rotation.z = k * 0.42;
    } else if (beat === 1) {
      this.jaw.rotation.z = -0.85 - k * 0.30;
      this.lower.rotation.z = 0.42 + k * 0.24;
    }
  }

  /**
   * THE STATEMENT SLIP TEARS OFF AND BECOMES A REAL, FALLING, TUMBLING PHYSICS PROP.
   *
   * READ base.js's "THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER" before touching this.
   * The collider, the damping, the contact force and the three `rngRange` draws are the old
   * character's to the digit — see the `STM_BODY` block.
   */
  onDeath(point) {
    const R = this.radius;
    const s = this.slip;
    if (!s) return;
    const at = pinnedSpawn(point, R, STM_PIN);
    const m = mat('prop', { color: PALETTE.cream });
    const { body, collider } = makeBody({
      kind: 'dynamic',
      x: at.x, y: at.y, rot: at.rot, m,
      shape: shapes.box(R * STM_BODY.w, R * STM_BODY.h, R * STM_BODY.d),
      // Explicit, and not a leftover literal: this is a strip of PAPER, so it keeps a damping
      // far above the prop material's 0.030 — it has to flutter down after the card has gone,
      // not drop like the block it is made of.
      linearDamping: 0.62, angularDamping: 0.7, contactForce: 20,
    });
    s.position.set(0, 0, 0);
    s.rotation.set(0, 0, 0);
    s.parent?.remove(s);
    world.scene.add(s);
    const e = new Entity({ mesh: s, body, collider, material: m, tag: 'prop' });
    e.update = function () {
      if (!this.body) return;
      const t = this.body.translation();
      if (t.y < -8) this.destroy();
    };
    body.setLinvel({ x: rngRange(-3.0, 2.0), y: rngRange(3.2, 6.4), z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: rngRange(-11, 11) }, true);
    this.slip = null;
    this.cardTag = null;
  }
}

export const VILLAIN_TYPES = { creditCardTrap: CreditCardTrap };
