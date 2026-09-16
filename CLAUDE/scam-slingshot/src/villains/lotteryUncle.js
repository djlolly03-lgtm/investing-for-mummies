/**
 * villains/lotteryUncle.js — THE ₹50 LAKH CHEQUE.  Chapter 1's villain.
 *
 * "Beta, you have WON ₹50 lakh! Only ₹5,000 processing fee!"
 *
 * ── WHAT CHANGED, AND WHY IT IS A DESIGN FIX RATHER THAN A REDRAW ────────────
 * This character used to be LOTTERY UNCLE: a man holding a giant novelty cheque over his
 * head. The class is still called that and still answers to `"lotteryUncle"` in `l1.json`,
 * because the level files, the progression and the scoring are not this round's business.
 * The CHARACTER is now the cheque itself, with a face on it. Three reasons, all measured:
 *
 *  1. THE MAN WAS NEVER VISIBLE. At the game's own framing on a 390-wide phone the whole
 *     villain measured 24.9 x 30.3 CSS px and the head was ~7 px of that — the cap, the
 *     moustache, the collar and both eyes all landed between 1 and 3 px. The CHEQUE was
 *     doing the entire read. So the cheque became the character and inherited the whole
 *     30 px box instead of 8 px of it: the face on it is now 5 px of eyeball, not 2.6.
 *  2. DEMOLISHING A PERSON IS OFF-MESSAGE FOR IFM. `l1.json` teaches "a prize you never
 *     entered is not a prize. It is a bill." The OFFER is the villain, not a man.
 *  3. IFM'S OWN GAME ALREADY WORKS THIS WAY. In "Slash the Scam" you slice the offer, so a
 *     student arriving from it already knows the grammar.
 *
 * ── THE ONE IDEA: A SMUG, OVERSIZED, FLAPPING CHEQUE ─────────────────────────
 * Each word of that is a mechanism rather than an adjective:
 *
 *  · OVERSIZED — the card is 4.55 x 2.40 R = 2.46 x 1.30 world, plus a gold placard
 *    overhanging the right end. Measured at the phone's aim framing it is a 28 x 16 px object.
 *    The old character's entire body PLUS prop was 24.9 x 30.3 px and only 8 px of it named
 *    the scam.
 *
 *    AND IT IS 1.90 : 1, WHICH IS THE SHAPE OF A CHEQUE AND NOT THE SHAPE OF A CARD. That
 *    ratio is the one thing separating this character from l2's credit card in a 40 px black
 *    fill — both are landscape rectangles with a placard on one end, and at 1.65 : 1 (where
 *    this was first authored) they filled to the same slab. A cheque is long and flat; a card
 *    is 1.586 : 1 and chunky. The two now differ by a third of their own aspect.
 *  · FLAPPING — the cheque is THREE PANELS, not one slab: a centre panel carrying the face
 *    and two end flaps hinged on the seams, rotating about Y. That buys two things a single
 *    slab cannot have. In the idle they wave out of phase, so the thing reads as paper
 *    rather than as plywood. And in the FLINCH they curl forward 1.25 rad, which takes the
 *    projected width from 4.10 R to 2.74 R — a 33 % collapse of the silhouette, i.e. a
 *    reaction a player can actually see on a phone, where a change of expression cannot be.
 *  · SMUG — the eyes are enormous for the object they sit on (0.38 R, ~5 px of eyeball), the
 *    brows are heavy and tilted into a hustle, and the grin carries one gold tooth in the
 *    same gold as the placard rim. At this size colour is the only language an expression
 *    has; see the rule block in objectFace.js.
 *
 * ── THE BANDS, AND THE 16-PIXEL BUDGET THEY ARE SPENT AGAINST ────────────────
 * base.js's prop rule: 2-3 HARD VALUE BANDS plus one huge glyph; body copy is a lie at play
 * size. The card is 16 px tall on a phone, so the whole layout is:
 *
 *   navy header   20 % -> 3.2 px   "LUCKY DRAW WINNER" — the official-document block
 *   paper field   62 % -> 9.9 px   the FACE lives here: eyes 5 px, grin 3 px
 *   coral tell    18 % -> 2.9 px   the trap, in the same coral as every other IFM tell
 *
 * The ₹ figure moved OFF the face and onto the LEFT FLAP, where it becomes the cheque's
 * amount box. That is not decoration: with a face in the middle of the paper field there is
 * nowhere for a 45 %-of-height glyph to go, and a number behind a pair of eyes is noise.
 *
 * ── WHERE THE CARD SITS IN z, AND THE ARM THAT WAS PHOTOGRAPHED AND REJECTED ─
 * This was first authored NESTED, at z = 0.30 — inside the blocks' own depth, so l1's bay
 * posts would draw over the card's ends and RUBRIC P6's "level furniture, partly occluded by
 * the structure" would be literally true. It was captured at the play framing and it fails:
 * the bay is 1.34 world wide and the card is 2.21, so the two posts hid 40 % of a 31 px
 * character — both flaps, the amount box, the perforations and the gold placard — and what
 * was left was a square with a face on it. A wide object cannot be read through two vertical
 * bars, and on this cast the object IS the read.
 *
 * So it sits at 0.60, in front of every block (`BLOCK_HALF_DEPTH` 0.525), exactly where the
 * old cheque PROP sat and for exactly the reason base.js gives for props ("THE BAY IS NOT THE
 * LIMIT. z IS"): the camera is near-orthographic, so 0.6 of z costs about half a percent of
 * projected size and buys the entire silhouette. Nothing physical moved — the ball collider is
 * still at z = 0, still wedged between the same two posts — and the picture now reads as what
 * the fiction says it is: the offer, propped up in FRONT of the structure that is about to
 * fall on it. If a future round wants the occlusion back, the card has to get narrower than
 * the narrowest bay it stands in (2.48 R), and it should be measured before it is believed.
 *
 * ── MASS — THE THING THE BRIEF SAYS A COLLAPSE MUST NOT "DELETE" ────────────
 * The 0.646 kg ball collider is untouched (base.js's four damage constants were measured at
 * it). Mass is bought visually, in three places:
 *   · the card's bottom edge is at exactly -1.00 R, the collider's own bottom, so it never
 *     floats and never sinks;
 *   · base.js's HELD crush squash owns the card group's SCALE, because the card group is what
 *     is registered as `belly` — so a storey landing on the cheque flattens it by 30 % of its
 *     height and widens it by the same, and it stays flattened while the weight is on it;
 *   · and `onDuress` droops both end flaps about Z, so the paper SAGS round whatever is
 *     crushing it instead of staying a rigid rectangle. The old character could not sell this
 *     at all: the thing being crushed was a man and the cheque was over his head.
 */

import * as THREE from 'three';
import { Villain, FACE } from './base.js';
import { mat, PALETTE } from '../art/materials.js';
import { RAMP_HARD, inkAll } from '../art/toon.js';
import { Entity, makeBody, shapes } from '../level/entity.js';
import { mountPlaque } from './scamIcon.js';
import {
  makeGoogly, makeMouths, flinch, band, canvasTexture, printedPanel, hardRectGeo,
  drawRupee, fitFont, drawPerf, pinnedSpawn,
} from './objectFace.js';
import { world } from '../world.js';
import { rngRange } from '../rng.js';

/**
 * ── THE PALETTE IS A VALUE LADDER (Rec.709 luminance out of 255) ─────────────
 * At 16 px tall the card is three blocks of value and two marks. Checked against the two
 * things base.js says to check against: the sky (0x89d0e8, 195) and glass (0xa8ecf5, 222),
 * which RUBRIC P7 requires to stay the brightest value in the frame.
 *
 *   paper  0xf0e2c6 ... 224   the field. Above the sky, so the card reads as paper rather
 *                             than as a hole; only 2 units over glass, which is why the
 *                             panels carry a heavy ink contour (0.052) instead of trusting
 *                             value alone to hold their edge.
 *   edge   0xc9b58a ... 183   the cut edge: 41 units under the face, so the card has a
 *                             visible thickness at the 1 px that thickness occupies.
 *   navy   0x1a3a5c ...  57   the header band — 6.5 ramp steps under the paper
 *   coral  0xe76f51 ... 139   the tell band, the same coral as every IFM "fee due"
 *   ink    0x241a12 ...  28   brows, pupils, the grin: the marks that survive any downscale
 */
const PAPER_EDGE = 0xc9b58a;
const NAVY_C  = '#1a3a5c';
const CORAL_C = '#e76f51';
const CREAM_C = '#fdf6ec';
const PAPER_C = '#f0e2c6';

/**
 * ── THE CARD, AND THE THREE PANELS IT IS MADE OF (multiples of R) ────────────
 * `w` is the total printed width; `FLAP` partitions it — one flap at each end, the centre
 * gets the rest. The seams are where the flaps hinge, so they are also where the perforation
 * lines are drawn: a hinge the player can see is a hinge the player believes.
 *
 * d 0.085 R (0.046 world) is deliberately thick for paper. The side wall is what says
 * "object" rather than "decal" when a flap turns, and at 0.04 R it is sub-pixel.
 */
const CARD  = { w: 4.55, h: 2.40, d: 0.085 };
const FLAP  = 1.00;
const HINGE = CARD.w / 2 - FLAP;          // 1.05 R — the seam, from the card's own centre
/**
 * Local z of the whole card — IN FRONT of every block in the level (`BLOCK_HALF_DEPTH` 0.525).
 *
 * This was authored at 0.30, i.e. nested inside the blocks' own depth so l1's bay posts would
 * draw over the card's ends, and it was photographed and rejected: measured at the play
 * framing, the posts hid 40 % of a 31 px character — both flaps, the amount box and the gold
 * placard — and what was left was a square with a face on it. A wide object cannot be read
 * through two vertical bars, and this character IS the read.
 *
 * base.js's own prop rule ("THE BAY IS NOT THE LIMIT. z IS") applies to it exactly as it did
 * when the cheque was a prop: the camera is near-orthographic, so 0.6 of z costs ~0.5 % of
 * projected size and buys the whole silhouette. The BODY is still level furniture in the only
 * sense that matters to the physics — the ball collider is untouched, still wedged in the bay
 * at z = 0 — and the cheque now reads as what it is: the offer, propped up in front of the
 * structure that is about to fall on it.
 */
const CARD_Z = 0.60;

/**
 * THE PAYMENT SLIP — the coral stub clipped across the cheque's right-hand end, and the one
 * piece of this character that becomes a real rigid body when it dies (RUBRIC P11 wants one
 * genuinely physical absurd prop per chapter).
 *
 * It is a child of the RIGHT FLAP rather than of the card, and that is arithmetic rather than
 * tidiness: a slip parented to the card would stay flat while the flap it overlaps turned,
 * and the two would visibly separate on every beat of the idle. Parented to the flap, it
 * turns with it for free.
 */
const SLIP     = { w: 1.75, h: 0.80, d: 0.07, x: 0.42, y: -0.62 };
const GOLD_TAG = { w: 0.84, h: 0.94, d: 0.15, x: 0.60, y: -0.02 };

/**
 * ── THE DEATH PROP'S COLLIDER IS NOT THIS ROUND'S TO RETUNE ──────────────────
 * These are the dimensions the previous character's cheque collider used, kept to the digit.
 * The reason is base.js's "THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER": the prop
 * `onDeath()` spawns is the single channel through which a villain's visual layer can move
 * rigid bodies, l1's outcome is chaotically sensitive to it (measured: individual shots swung
 * between 6,400 and 41,400 points across three prop arms), and `levels/stars.json`'s
 * thresholds were derived against THIS collider. The picture changed; the physics did not.
 *
 * The slip above is authored at 1.75 x 0.80 R precisely so that, for the first time on this
 * project, the collider and the thing you can see are about the same size.
 */
const CHQ_BODY = { w: 1.70, h: 0.80, d: 0.50 };
/**
 * ...and neither is WHERE it is born. See `objectFace.pinnedSpawn` for why the spawn is now a
 * constant offset from the villain's centre instead of the slip's live transform.
 *
 * THESE THREE NUMBERS WERE SWEPT, NOT CHOSEN (`cast-propsweep.mjs`, replaying the three plans
 * `p13-stargate.mjs` replays). l1 is the level base.js warns is chaotically sensitive to this,
 * and it is: the slip's own rest offset (1.47, -0.345) loses the recorded 3-star plan outright
 * — phase "aiming", 7,400 points against a 39,500 threshold. The winning pin is the OLD
 * character's cheque-guard pose, which is where practically every death spawned a prop before
 * this round, since a villain that is being killed is braced:
 *
 *   pin              proof3 (t3 39500)   proof2 (t2 30500)   proofWeak (t1 9500)
 *   (1.47,-0.345)    LOST  7,400         LOST  6,100         —
 *   (0.00, 0.30)     LOST  6,900         won  31,700         —
 *   (0.02, 0.55)     won  41,700         LOST  5,800         —
 *   (0.04, 0.41)     won  41,900         won  31,900         —
 *   (0.02, 0.41, 0.30)  won 43,200 ***   won 31,700          won 12,900
 *
 * The last row is this constant: 3 stars with 9.4 % of headroom over the threshold, 2 stars
 * inside its band, and the weakest win still worth exactly one star. The cost is that the slip
 * VISUALLY jumps 1.45 R — about 9 x 5 px on a phone — from the card's right-hand end to the
 * pin on the frame the villain pops, inside the FX puff `villainDefeated` fires on that same
 * frame. A jump nobody can see behind an explosion is a better trade than a star table that
 * does not replay.
 */
const CHQ_PIN = { id: 'l1', x: 0.02, y: 0.41, rot: 0.30 };

// ---------------------------------------------------------------------------
// THE PRINTED FACE OF THE CHEQUE — one design, painted per panel
// ---------------------------------------------------------------------------

/**
 * THE WHOLE CARD IS LAID OUT ONCE, IN FULL-CARD PIXELS, AND EACH PANEL PAINTS THE SLICE OF IT
 * THAT IT OWNS.
 *
 * Three panels could have had three hand-authored canvases, and that is exactly how bands end
 * up not lining up across a seam: a navy header that is 20 % of the height on the centre panel
 * and 19 % on a flap is a visible step at 3 px tall. So there is ONE layout function in ONE
 * coordinate system, called three times with a translated context. A band is continuous across
 * a seam by construction, and so is the title printed across it.
 *
 * `x0`/`x1` are the panel's span as fractions of the card's width.
 */
function paintCard(g, W, H, x0, x1) {
  const FW = W / (x1 - x0);                 // the full card's width, in this canvas's pixels
  const ox = -x0 * FW;                      // where the full card's left edge sits in it
  const X = (f) => ox + f * FW;             // a fraction of the CARD -> this canvas's x

  g.fillStyle = PAPER_C; g.fillRect(0, 0, W, H);

  // A faint guilloche wash, so the paper is not a flat fill. Low contrast on purpose: it must
  // disappear at 16 px rather than muddy the field's value.
  g.save();
  g.strokeStyle = 'rgba(42,157,143,0.13)'; g.lineWidth = Math.max(2, H * 0.006);
  for (let i = -H; i < W + H; i += H * 0.060) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
  }
  g.restore();

  // ---- band 1: the navy header, 20 % of the card's height ------------------
  const h1 = H * 0.20;
  g.fillStyle = NAVY_C; g.fillRect(0, 0, W, h1);
  // ---- band 3: the coral tell, 18 % ---------------------------------------
  const y3 = H * 0.82;
  g.fillStyle = CORAL_C; g.fillRect(0, y3, W, H - y3);

  g.textBaseline = 'middle';
  g.textAlign = 'center';

  // The title is centred on the CARD, not on the panel, so it crosses the seams exactly as a
  // line of print on a real cheque does.
  g.fillStyle = CREAM_C;
  const tSize = fitFont(g, 'LUCKY DRAW WINNER', FW * 0.46, Math.round(H * 0.15),
    'Georgia, "Times New Roman", serif');
  g.font = `bold ${tSize}px Georgia, "Times New Roman", serif`;
  g.fillText('LUCKY DRAW WINNER', X(0.50), h1 * 0.52);

  // ...and so is the tell. THE ₹ IS DRAWN, NOT TYPED: U+20B9 is missing or tofu in several of
  // the fonts a headless Chrome or an Android WebView actually resolves, and a tofu box in the
  // middle of the teaching device is worse than any amount of ugliness (objectFace.drawRupee).
  const tell = '5,000 FEE DUE · PAY TO BEARER';
  const sSize = fitFont(g, tell, FW * 0.40, Math.round(H * 0.125),
    'Georgia, "Times New Roman", serif');
  g.font = `bold ${sSize}px Georgia, "Times New Roman", serif`;
  g.fillStyle = CREAM_C;
  const tellY = (y3 + H) / 2;
  // LEFT of centre, and that is arithmetic rather than taste: the payment slip is a physical
  // object standing 0.07 R proud of this print from 64 % of the card's width rightward, so any
  // type that runs past there is not "faint", it is GONE — and a line of print running half
  // under a solid object reads as a rendering bug rather than as a design.
  drawRupee(g, X(0.128), tellY - H * 0.058, H * 0.115, CREAM_C);
  g.textAlign = 'left';
  g.fillText(tell, X(0.168), tellY);

  // ---- the amount box, on the LEFT FLAP -----------------------------------
  // The one huge glyph base.js's rule asks for: the ₹ mark at 30 % of the card's height, in a
  // ruled box, which is the shape every cheque in the world puts its number in.
  const boxX = X(0.020), boxW = FW * 0.200;
  g.fillStyle = 'rgba(26,58,92,0.10)';
  g.fillRect(boxX, h1 + H * 0.05, boxW, H * 0.54);
  g.strokeStyle = NAVY_C; g.lineWidth = Math.max(2, H * 0.014);
  g.strokeRect(boxX, h1 + H * 0.05, boxW, H * 0.54);
  drawRupee(g, boxX + boxW * 0.20, h1 + H * 0.11, H * 0.30, NAVY_C);
  g.fillStyle = NAVY_C;
  g.textAlign = 'center';
  const aSize = fitFont(g, '50 LAKH', boxW * 0.88, Math.round(H * 0.15),
    '"Arial Black", Arial, sans-serif');
  g.font = `bold ${aSize}px "Arial Black", Arial, sans-serif`;
  g.fillText('50 LAKH', boxX + boxW / 2, h1 + H * 0.525);

  // ---- the right flap: the endorsement block, set sideways ----------------
  g.save();
  g.translate(X(0.905), H * 0.52);
  g.rotate(-Math.PI / 2);
  g.fillStyle = 'rgba(26,58,92,0.55)';
  const eSize = fitFont(g, 'NOT NEGOTIABLE', H * 0.50, Math.round(H * 0.10), 'Georgia, serif');
  g.font = `bold ${eSize}px Georgia, serif`;
  g.fillText('NOT NEGOTIABLE', 0, 0);
  g.restore();

  // ---- the perforations, ON the seams -------------------------------------
  // Drawn in full-card coordinates, so each panel paints whichever part of them falls inside
  // it and the dashes line up across the join.
  for (const f of [FLAP / CARD.w, 1 - FLAP / CARD.w]) drawPerf(g, X(f), 0, H, undefined, H * 0.05);
}

/** One panel's texture, cached by the panel's own span so the two flaps cannot share by luck. */
const _panelTex = new Map();
function panelTexture(x0, x1) {
  const key = `${x0}:${x1}`;
  if (_panelTex.has(key)) return _panelTex.get(key);
  // 248 px per R of card width: the card is 27 CSS px wide in play and ~55 on desktop, so this
  // is well over an order of magnitude more pixels than it is ever sampled at — enough that
  // the ₹ bars stay hard after mipmapping, cheap enough that all three cost under 2 MB.
  const W = Math.max(8, Math.round(CARD.w * (x1 - x0) * 248));
  const H = Math.round(CARD.h * 248);
  const t = canvasTexture(W, H, (g, w, h) => paintCard(g, w, h, x0, x1));
  _panelTex.set(key, t);
  return t;
}

/** The payment slip's own print: coral, one number, and a perforation along its top edge. */
let _slipTex = null;
function slipTexture() {
  if (_slipTex) return _slipTex;
  _slipTex = canvasTexture(Math.round(SLIP.w * 300), Math.round(SLIP.h * 300), (g, W, H) => {
    g.fillStyle = CORAL_C; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(26,58,92,0.22)'; g.fillRect(0, 0, W, H * 0.17);
    g.save();
    g.strokeStyle = 'rgba(253,246,236,0.80)'; g.lineWidth = Math.max(2, H * 0.045);
    g.setLineDash([H * 0.16, H * 0.13]);
    g.beginPath(); g.moveTo(0, H * 0.09); g.lineTo(W, H * 0.09); g.stroke();
    g.restore();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    drawRupee(g, W * 0.06, H * 0.34, H * 0.38, CREAM_C);
    g.fillStyle = CREAM_C;
    const s = fitFont(g, '5,000 FEE', W * 0.58, Math.round(H * 0.40),
      '"Arial Black", Arial, sans-serif');
    g.font = `bold ${s}px "Arial Black", Arial, sans-serif`;
    g.fillText('5,000 FEE', W * 0.34, H * 0.56);
  });
  return _slipTex;
}

// ---------------------------------------------------------------------------

export class LotteryUncle extends Villain {
  static id = 'lotteryUncle';
  static label = 'The ₹50 Lakh Cheque';
  static fact = 'No real lottery ever asks you to pay a fee to collect your winnings.';

  constructor(o = {}) {
    super({ radius: 0.54, matName: 'villain', ...o });
  }

  buildMesh(g) {
    const R = this.radius ?? 0.54;

    /**
     * ── THE CARD GROUP ──────────────────────────────────────────────────────
     * Everything this character is hangs off one group, and base.js gets that group as
     * `belly`: the breath swells it and the crush squash flattens it. Its y puts the card's
     * bottom edge at exactly -1.00 R, the collider's own bottom, so it neither floats nor
     * sinks at any of the three places the three levels stand one.
     */
    const cardG = new THREE.Group();
    cardG.position.set(0, R * (CARD.h / 2 - 1.00), CARD_Z);
    cardG.rotation.z = -0.03;
    g.add(cardG);
    this.cardG = cardG;
    this.cardRestY = cardG.position.y;

    /** One printed panel of the card, spanning `x0..x1` of its width. */
    const panel = (x0, x1) => {
      const m = printedPanel(hardRectGeo(), panelTexture(x0, x1), PAPER_EDGE, { ink: 0.052 });
      m.scale.set(R * CARD.w * (x1 - x0), R * CARD.h, R * CARD.d);
      return m;
    };

    // ---------------- the centre panel: the face lives here ------------------
    const fL = FLAP / CARD.w;
    const centre = panel(fL, 1 - fL);
    cardG.add(centre);
    this.centre = centre;

    /**
     * ---------------- the two end flaps -------------------------------------
     * Each is a GROUP whose origin is the SEAM, with the panel offset inside it, so
     * `rotation.y` on the group is a hinge on the seam rather than a spin about the panel's
     * own middle. That one detail is the whole mechanism behind both the idle flap and the
     * flinch curl, and it is why the cheque is three meshes instead of one.
     */
    const flapGroup = (side) => {
      const grp = new THREE.Group();
      grp.position.x = side * R * HINGE;
      const m = side < 0 ? panel(0, fL) : panel(1 - fL, 1);
      m.position.x = side * R * FLAP * 0.5;
      grp.add(m);
      cardG.add(grp);
      return grp;
    };
    const flapL = flapGroup(-1);
    const flapR = flapGroup(1);
    this.flapL = flapL; this.flapR = flapR;

    /**
     * ---------------- THE PAYMENT SLIP, and the gold placard on it ----------
     * The stub the whole scam turns on — ₹5,000 due — clipped across the cheque's right-hand
     * end. It is the piece that tears off and becomes a rigid body at the death pop, and it
     * carries `assets/scam-gold.png`, the icon from IFM's "Slash the Scam": a symbol the
     * player brings with them is the cheapest identification this project can buy.
     *
     * The placard OVERHANGS the slip's right end by 0.22 R and the card's own edge by 0.52 R,
     * deliberately. It is the one non-rectangular lump on the silhouette, and it is what stops
     * l1 black-filling to the same slab as l2's credit card at 40 px.
     */
    const slip = printedPanel(hardRectGeo(), slipTexture(), 0xb4553c, { ink: 0.046 });
    slip.scale.set(R * SLIP.w, R * SLIP.h, R * SLIP.d);
    slip.position.set(R * SLIP.x, R * SLIP.y, R * (CARD.d + SLIP.d) * 0.5);
    slip.rotation.z = 0.05;
    flapR.add(slip);
    this.slip = slip;

    this.goldTag = mountPlaque(slip, {
      name: 'scam-gold',
      w: R * GOLD_TAG.w, h: R * GOLD_TAG.h, d: R * GOLD_TAG.d,
    }, { x: R * GOLD_TAG.x, y: R * GOLD_TAG.y, proud: 0.026, rot: -0.06 });

    /**
     * ---------------- THE FACE ---------------------------------------------
     * A child of the CARD GROUP rather than of the centre panel, for two reasons.
     * `registerRig({ bob })` translates it every frame, and a bob node inside a panel that
     * the flinch is also scaling would compound the two motions. And `onDeath()` tears the
     * slip off the right flap — the face must not be anywhere near a piece that can leave.
     *
     * THE NUMBERS, against the card's own 2.45 R height (local y +1.225 at the top edge):
     *   eyes   r 0.38 R at (+-0.44, +0.30)  -> 5.0 px of eyeball on a phone, 0.12 R apart
     *   brows  0.65 R long, resting ON the eyeball's crown at +0.68 R
     *   grin   0.80 R wide at -0.34 R, its lower lip just short of the coral band at -0.78
     * The navy header's lower edge is at +0.735 R, so an ALARMED brow (base.js lifts a brow
     * 0.95 eye-radii = 0.36 R) crosses into the navy. It stays legible because the brow is
     * 0.65 R long against a band only 0.49 R tall — most of it is still over paper — and
     * because the alarm read is carried by the flaps, not by the brow. See THE FLINCH.
     */
    const face = new THREE.Group();
    face.position.set(0, 0, R * CARD.d * 0.5);
    cardG.add(face);
    this.face = face;

    const eyeR = R * 0.40;
    const eyes = [], brows = [];
    for (const s of [-1, 1]) {
      // NO RIM: this eye stands on pale paper, so its own ink contour is the whole separation
      // it needs — see the one-contour note in makeGoogly. And the pair is spread to +-0.50 R
      // (0.24 R of daylight between the eyeballs) because at +-0.44 the two dark contours met
      // in the middle at play size and the face read as one mask.
      const { eye, brow } = makeGoogly(eyeR, { side: s, tilt: 0.36, brow: 0x241a12, rim: false });
      eye.position.set(s * R * 0.52, R * 0.28, 0);
      brow.position.y = eyeR * 1.00;        // clear of the eyeball's crown, not sitting on it
      face.add(eye);
      eyes.push(eye); brows.push(brow);
    }

    const mouths = makeMouths(R * 0.42, { lip: 0x5a1a10, gold: PALETTE.gold });
    for (const k of Object.keys(mouths)) {
      mouths[k].position.set(0, -R * 0.36, eyeR * 0.34);
      face.add(mouths[k]);
    }

    /**
     * A hard cream rule under the header band, as real geometry rather than as texture.
     * objectFace's `band()` block has the reason: a 2 px line drawn into the canvas is
     * resampled along with everything else on it, and a 2 px line that is its own unlit mesh
     * is not, so it still has a hard edge after the 40 px downscale. ONE of these, not three —
     * the other two boundaries are carried by a colour change, which survives on its own.
     */
    const rule = band(R * CARD.w * 0.49, R * 0.055, 0xfdf6ec, { z: R * 0.02 });
    rule.position.set(0, R * 0.72, R * CARD.d * 0.5 + R * 0.012);
    cardG.add(rule);

    // Thinner ink than the blocks get, except on the panels themselves (0.052, set in
    // `printedPanel`): outline weight is a RATIO to what it surrounds, and the eyes and the
    // grin are small round objects that a heavy contour turns into one black smudge.
    inkAll(g, 0.030);

    // ---------------- register with base.js ---------------------------------
    this.registerRig({ belly: cardG, bob: [face], face });
    this.registerFace({ eyes, brows, mouths });

    /**
     * ── THE FLINCH: THE CHEQUE CRINGES ──────────────────────────────────────
     * base.js's `poseable()` owns the half of it that is position and Z rotation: the card
     * DUCKS 0.20 R and tips 0.19 rad, which on its own is the difference between a cheque
     * being waved and a cheque being pulled in.
     *
     * The half that carries the read is the CURL, and `poseable()` cannot drive it, because
     * it is rotation about Y and a scale. So `objectFace.flinch()` supplies the same eased
     * 0..1 blend on the same fixed step and `onIdle` applies it:
     *
     *   projected width   4.10 R idle -> 2.10 + 2 x 1.00 x cos(1.25) = 2.74 R guarded  (-33 %)
     *   projected height  2.75 R idle -> 2.75 x 0.87                 = 2.39 R guarded  (-13 %)
     *
     * Black-filled at 40 px the character therefore goes from a wide smug slab to a small
     * hunched one inside 100 ms. That is a reaction a phone can show; 5 px of eyeball is not.
     */
    this.poseable(cardG, {
      guard: { y: this.cardRestY - R * 0.20, rot: 0.19 },
      snap: 0.09,
    });

    /**
     * ONE detachable, and the count is load-bearing. `releaseDetachables()` draws three
     * `rngRange` values per detached piece off the same deterministic stream every other
     * random thing in the level shares, so adding a second one would shift every subsequent
     * draw and quietly change outcomes the star thresholds were measured against. The old
     * character detached its cap here; this one detaches the WINNER seal — same count, same
     * velocities, same stream.
     */
    const seal = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.20, 16),
      new THREE.MeshToonMaterial({ color: 0xb8321f, gradientMap: RAMP_HARD() }));
    disc.scale.set(R * 0.30, R * 1.0, R * 0.30);
    disc.rotation.x = Math.PI / 2;
    disc.userData.inkWidth = 0.030;
    seal.add(disc);
    const star = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.20, 5),
      new THREE.MeshBasicMaterial({ color: PALETTE.gold, toneMapped: false }));
    star.scale.set(R * 0.17, R * 1.0, R * 0.17);
    star.rotation.x = Math.PI / 2;
    star.position.z = R * 0.05;
    star.userData.noInk = true;
    seal.add(star);
    // Two ribbon tails, so the thing is a ROSETTE at 3 px rather than a dot. They also hang
    // below the card's bottom edge, which is the only part of the silhouette a viewer can use
    // to tell this end of the cheque from the other in a black fill.
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(hardRectGeo(),
        new THREE.MeshToonMaterial({ color: 0x8f2415, gradientMap: RAMP_HARD() }));
      tail.scale.set(R * 0.13, R * 0.40, R * 0.05);
      tail.position.set(s * R * 0.10, -R * 0.30, 0);
      tail.rotation.z = s * 0.34;
      tail.userData.inkWidth = 0.030;
      seal.add(tail);
    }
    // TOP-LEFT, over the navy header's own end, and that placement is a collision fix rather
    // than a composition: at the bottom-left it sat squarely on the amount box and deleted
    // "50 LAKH", which is the one number this character is about. Up here it is red on navy —
    // the highest-contrast pairing on the card — and it overhangs the corner, so it breaks the
    // silhouette at the opposite end from the gold placard.
    seal.position.set(-R * (1.85 - HINGE), R * 0.86, R * (CARD.d * 0.5 + 0.05));
    /**
     * ON THE LEFT FLAP, not on the card — the mirror of the payment slip's own note, and it is
     * the same defect: photographed at full duress with the flap folded 0.34 rad forward, a
     * seal parented to the CARD stayed flat in the plane the flap had just left and sat
     * visibly off the paper, floating over the glass block behind it. Anything glued to a
     * panel has to be a child of that panel.
     */
    flapL.add(seal);
    this.seal = seal;
    this.addDetachable(seal, { vx: -0.9, vy: 5.4, spin: 11, ttl: 1.2 });
  }

  /** Remembered for the flourishes below; base.js owns the four faces themselves. */
  applyFace(state) {
    this.scared = (state === FACE.ALARMED || state === FACE.BRACED || state === FACE.DEFEATED);
  }

  /**
   * THE IDLE — the flap, which is the one thing that makes paper read as paper.
   *
   * Two independent motions at different rates, so the 2 s idle filmstrip RUBRIC P6 asks for
   * has something different in every tile: the two flaps wave out of phase about Y (which
   * changes the SILHOUETTE, not just the shading), and the whole card sways about Z. Both are
   * pure functions of `world.simTime`, so a filmstrip seeked to the same simulated instant
   * draws the same picture.
   *
   * Everything here is ADDITIVE on top of base.js by contract: `updatePerformance()` has
   * already assigned the card's pose and its breath scale, and `onIdle` runs after it.
   */
  onIdle(dt) {
    const t = world.simTime;
    const f = flinch(this, dt, 0.10);
    const cardG = this.cardG;

    // THE CURL. 1.25 rad at full guard — see the arithmetic in THE FLINCH above. The idle flap
    // is a small outward bias plus a wave; the curl is cross-faded in over it, so a shot
    // arriving mid-flap still ends up fully curled rather than fighting the wave.
    const waveL = -0.16 + Math.sin(t * 1.55 + this.bobPhase) * 0.26;
    const waveR = 0.14 + Math.sin(t * 1.55 + this.bobPhase + 2.1) * 0.24;
    this.flapL.rotation.y = waveL * (1 - f) + f * 1.25;
    this.flapR.rotation.y = waveR * (1 - f) - f * 1.25;
    // Reset the droop `onDuress` writes: it only runs while duress > 0, so anything it sets
    // must be re-based here or a cheque that survived a collapse stays permanently folded.
    this.flapL.rotation.z = 0;
    this.flapR.rotation.z = 0;

    // THE SQUAT. MULTIPLIED onto whatever base.js's breath and crush squash left on the group
    // rather than assigned over it — a cheque that is both flinching and being crushed has to
    // show both.
    cardG.scale.y *= 1 - f * 0.13;
    cardG.scale.x *= 1 + f * 0.05;

    // The sway, suppressed while guarding (a cheque being pulled in is held still) and while
    // the gloat owns the card.
    if (this.tauntT < 0 && this.faceState === FACE.IDLE) {
      cardG.rotation.z += Math.sin(t * 1.15 + this.bobPhase) * 0.035;
    }
    // The seal rocks on its rivet — 2 px of travel, and the only thing on the card that is
    // never still, which is what stops two cheques in one level reading as one asset.
    if (this.seal?.parent) this.seal.rotation.z = Math.sin(t * 2.4 + this.bobPhase) * 0.22;
  }

  /**
   * BEING CRUSHED. `k` is `duress`, 0..1. base.js has already given the card the braced face,
   * the HELD squash on its scale and the directional lean by the time this runs, and calls
   * this LAST so everything here is additive on top of the idle.
   *
   * THE SAG is the point, and it is the mass cue the old character could not perform: a sheet
   * of paper with a beam across it does not stay a rectangle, it folds round the weight. Both
   * flaps droop about Z — outer ends down, 0.34 rad at full duress — and flatten toward the
   * camera as they go, so the droop is a fold rather than a scissor. With base.js's squash
   * pinching the middle at the same time, the silhouette is a cheque with a storey on it.
   */
  onDuress(k) {
    const cardG = this.cardG;
    // Mirrored: the left flap's outer end is at -x, so a POSITIVE Z rotation drops it and the
    // right flap needs the opposite sign to drop its own.
    this.flapL.rotation.z = k * 0.34;
    this.flapR.rotation.z = -k * 0.34;
    this.flapL.rotation.y += k * 0.30;
    this.flapR.rotation.y -= k * 0.30;
    // ...and the card itself creases forward over whatever is on it.
    cardG.rotation.z += k * 0.16;
    if (this.slip) this.slip.rotation.z = 0.05 + k * 0.30;
  }

  /**
   * THE GLOAT, after a shot that failed to kill it (RUBRIC P11: a miss is punished with a
   * visible taunt inside a second). The cheque WAVES ITSELF at the player — a translation in
   * x plus a hard flap, because a 27 px slab sliding a fifth of its own width is far more
   * visible on a phone than any rotation is.
   */
  onTaunt(k) {
    const swing = Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI);
    const cardG = this.cardG;
    cardG.position.x = this.radius * swing * 0.34;
    cardG.rotation.z = -0.03 + swing * 0.16;
    this.flapL.rotation.y = -0.16 - swing * 0.45;
    this.flapR.rotation.y = 0.14 + swing * 0.45;
  }

  /**
   * THE DEATH POP — and the one beat that had to be authored rather than inherited.
   *
   * base.js's three beats scale the whole mesh (compress, inflate, pop) and counter-scale the
   * bob nodes so the face stays at 1x, which is the gag. What a CARD needs on top of that is a
   * CRUMPLE: on the compress beat both flaps slam forward to 1.45 rad, so the frame the
   * hit-stop holds — the one the player actually looks at, ~155 ms of it — is the cheque
   * screwing itself into a ball rather than a rectangle getting shorter.
   */
  onDeathBeat(beat, k) {
    if (beat === 0) {
      this.flapL.rotation.y = 1.45 * k;
      this.flapR.rotation.y = -1.45 * k;
      if (this.seal?.parent) this.seal.position.y = -this.radius * (0.50 - k * 0.30);
    } else if (beat === 1) {
      this.flapL.rotation.y = 1.45 - k * 0.50;
      this.flapR.rotation.y = -1.45 + k * 0.50;
    }
  }

  /**
   * THE PAYMENT SLIP TEARS OFF AND BECOMES A REAL, FALLING, TUMBLING PHYSICS PROP.
   *
   * Spawned at a PINNED offset from the villain's centre rather than at the transform its mesh
   * happens to hold — read `objectFace.pinnedSpawn` for the measurement that forced that, and
   * the `CHQ_PIN` block above for these three numbers.
   *
   * READ base.js's "THE ONE PLACE A VILLAIN'S POSE REACHES THE SOLVER" before touching
   * anything in here. The collider, the damping, the contact force and the three `rngRange`
   * draws are the previous character's to the digit, for the reason the `CHQ_BODY` block
   * gives: this is the only line from a villain's visual layer into the solver, and
   * `stars.json` was measured through it.
   */
  onDeath(point) {
    const R = this.radius;
    const s = this.slip;
    if (!s) return;
    const at = pinnedSpawn(point, R, CHQ_PIN);
    const m = mat('prop', { color: PALETTE.cream });
    const { body, collider } = makeBody({
      kind: 'dynamic',
      x: at.x, y: at.y, rot: at.rot, m,
      shape: shapes.box(R * CHQ_BODY.w, R * CHQ_BODY.h, R * CHQ_BODY.d),
      // Explicit, and not a leftover literal: this is a strip of PAPER, so it keeps a damping
      // far above the prop material's 0.030. Air drag on a torn-off stub is the joke — it has
      // to flutter down after the cheque has gone, not drop like the block it is made of.
      linearDamping: 0.55, angularDamping: 0.6, contactForce: 20,
    });
    // Hand it to the scene at its own world transform. Scale is carried on the mesh itself so
    // it survives the re-parent untouched; position and rotation now belong to the body.
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
    body.setLinvel({ x: rngRange(-2.5, 3.5), y: rngRange(3.5, 7.0), z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: rngRange(-9, 9) }, true);
    this.slip = null;
    this.goldTag = null;
  }
}

export const VILLAIN_TYPES = { lotteryUncle: LotteryUncle };
