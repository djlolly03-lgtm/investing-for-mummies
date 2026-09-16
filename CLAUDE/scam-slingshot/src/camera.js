/**
 * camera.js — the SINGLE owner of the camera. Nothing else may touch camera.position.
 *
 * ARCHITECTURE.md: "Exposes intents, not transforms: focusSling(), follow(entity),
 * frameAll(), punch(strength), zoomTo(z, dur)."
 *
 * ── THE COMPOSITION IS SOLVED, NOT TUNED ─────────────────────────────────────
 * The old version carried four hand-tuned `{hw,hh,cx,cy}` presets that happened to fit l1 on
 * a 16:9 screen. They were wrong even there (the structure's right edge landed at 97.6 %W —
 * clipped against the frame) and catastrophic on a phone (the whole target sat at 214 %W, i.e.
 * entirely off screen). Hand-tuned framing does not survive a second level or a second aspect
 * ratio, so it is gone.
 *
 * Instead the aim framing is SOLVED from the level's own geometry against four composition
 * numbers measured off the reference frames:
 *
 *      slingPctW  0.130   sling sits 13 % in from the left      (ab_camera_..._01: 13 %)
 *      targetPctW 0.875   furthest target sits at 87.5 %W       (ab_camera_..._01: 87 %)
 *      groundPctH 0.775   the play-plane ground line            (ab_camera_..._01: 75 %)
 *      skyMinPctH 0.400   empty graded sky above the tallest    (ab_camera_..._01: 42 %)
 *
 * Closed form, given the level's furthest x (`right`) and tallest y (`top`), with the sling
 * at x = slingX and the ground plane at y = 0:
 *
 *   LANDSCAPE — fit the WIDTH:
 *      vw = (right - slingX) / (targetPctW - slingPctW)      // width that places both marks
 *      vh = max(vw / aspect,  top / (groundPctH - skyMinPctH))
 *      vw = vh * aspect                                      // sky constraint may pull back
 *
 *   PORTRAIT — fit the HEIGHT (aspect < 1.15):
 *      vh = top / towerPctH_portrait                         // the tower gets 37 %H …
 *      vw = max(vh * aspect, minVwPortrait)                  // … and the width simply crops
 *
 *   both:
 *      cy = (groundPct() - 0.5) * vh
 *      cx = slingX - slingPct(vw) * vw + vw / 2     // portrait's mark is derived, see slingPct
 *
 * The second term of landscape's `vh` is the sky rule written as algebra: the tallest object's
 * screen height is `groundPctH - top/vh`, and that must stay at or above `skyMinPctH`. So a
 * level with a taller tower automatically dollies the camera back instead of eating the sky.
 *
 * A PHONE CANNOT USE THAT SOLVE AT ALL, and the first version of this file thought it could.
 * At aspect 0.462 the width term gives a frame 2.2x taller than it is wide, so fitting the
 * level's width fits 72 world units of height to hold 7 units of tower: measured at 390x844,
 * the tower stood at 10.19 %H on l1, 4.96 % on l2, 9.48 % on l3, with sky over ~70 % of the
 * frame. The rubric's "accept a taller sky band, NOT crop the target out" is a LANDSCAPE
 * instruction — on a 9:19.5 screen the two are not alternatives, and the band it buys is not a
 * composition, it is the game disappearing. Portrait therefore fits the height, crops the
 * width, and pans: `COMPOSE.towerPctH_portrait` carries the numbers and the consequences.
 *
 * ── THE REST OF THE SYSTEM ───────────────────────────────────────────────────
 *   · narrow FOV, pulled far back  -> reads nearly orthographic, keeps a little parallax
 *   · moves in X and Y only, plus a dolly. Never orbits, never rolls, never tilts. The
 *     optical axis is always parallel to -Z, so eye level is ALWAYS exactly 50 %H and a pure
 *     X pan cannot move the horizon by construction, not by tuning.
 *   · LAG then LEAD on a launch, where LEAD means where the projectile sits ON SCREEN, not
 *     where the camera sits in the world. The shot rips out of frame-left while the camera
 *     pushes in; the camera then picks the projectile up on a fixed screen mark at 59 %W and
 *     holds it there, so the ball is always ahead of centre in its direction of travel and the
 *     launch point is off screen before the hit lands. A camera that locks the projectile to
 *     frame centre reads as a spreadsheet, and one that runs AHEAD of it in world space puts
 *     the ball on the left of frame, which is the same failure wearing a different hat.
 *   · every framing move that is NOT tracking something is an exponential glide with a snap
 *     threshold, so it PROVABLY stops. A spring is asymptotic — it is still creeping a second
 *     later, which is the rubric's "camera is still moving after every body is asleep" fail.
 *   · punch(): deterministic decaying shake in %H, driven by simTime, never rng, never roll.
 *   · frameAll(): fits the surviving villains + the last impact with a real screen-space
 *     margin, with a deadzone so debris landing does not make the camera hunt.
 *
 * DETERMINISM: update(dt) is called from the fixed step with dt = FIXED. The camera is
 * therefore part of the reproducible simulation, which is what makes "the frame at
 * t=180 ms after release" a real thing.
 */

import * as THREE from 'three';
import { world } from './world.js';
import { on } from './events.js';
import { GRAVITY_Y } from './physics.js';

const DEG = Math.PI / 180;

/**
 * Composition constants. Every one of these is a measurement off a reference frame, not a
 * preference — see the header. Change them only with a new measurement in hand.
 */
export const COMPOSE = {
  slingPctW:   0.130,   // sling centre, fraction of frame width from the left
  targetPctW:  0.875,   // furthest target, fraction of frame width
  groundPctH:  0.775,   // the play-plane ground line, fraction of frame height
  /**
   * ── PORTRAIT'S GROUND LINE — THE ONLY LEVER THAT MOVES THE SKY BAND FOR FREE (ROUND 3) ───
   * It used to be 0.865: "empty sky is the arc's stage and empty soil is nothing at all."
   * That is a LANDSCAPE argument. In portrait the frame is ~48 world units tall to carry a
   * 7.3-unit tower, so `skyAboveTower = groundPctH − towerPctH`, and 0.865 spends 86.5 %H above
   * a subject that occupies 15 of it. Measured at 390x660 on the round-2 build: 68.7-73.3 %H of
   * empty sky at aim across the three levels.
   *
   * The ground line is the ONLY term in the solve that moves that number without moving the
   * frame WIDTH, and therefore without moving anything the tower height or the on-screen
   * fraction depend on — `towerPctH = top·aspect/vw` has no `groundPctH` in it. So it is free,
   * up to the point where the frame runs out of ground to stand on.
   *
   * 0.780 is where that point is, and it was found by rendering candidates and looking
   * (`_shots/CAM/r3-probe`, one still per level per value). At 0.780 the soil band is 22 %H and
   * reads as a foreground: grass, then soil, then the near blades along the bottom edge. At
   * 0.700 those blades are ~230 px tall and stand across the bottom THIRD of the frame,
   * competing with the tower — a contrast-hierarchy failure — and buy only 8 more points of
   * sky. 0.640 is worse again.
   *
   * Worth: 8.5 points of sky at aim on every level. It does NOT reach round 3's 55 %H target
   * and no ground line can; see `aimFarMarginPortrait` for why the frame is 28-30 units wide
   * in the first place, which is what actually sets the sky band.
   */
  groundPctH_portrait: 0.780,
  /**
   * ── PORTRAIT IS SOLVED FROM HEIGHT, NOT FROM WIDTH ────────────────────────────────────
   * The width solve fits `slingX -> right` across the frame and then derives vh = vw / aspect.
   * At 390x844 the aspect is 0.462, so the vertical field comes out 2.2x the horizontal one
   * and the level arrives TINY inside it. Measured at 390x844 before this change, the tallest
   * point of the structure stood at **10.19 %H on l1, 4.96 % on l2, 9.48 % on l3** — a 70 %
   * sky band with the whole game in a strip along the bottom edge. That is not a composition,
   * it is a consequence of fitting the wrong axis.
   *
   * So in portrait the frame is solved from the LEVEL'S HEIGHT and the level's width is
   * allowed to crop:  `vh = top / towerPctH_portrait`,  `vw = vh * aspect`.
   *
   * The number is PARITY, not a new preference. In landscape the sky rule (below) binds on
   * every level tall enough for it to matter, and where it binds it is an EQUALITY, so the
   * tower's screen height there is exactly `groundPctH - skyMinPctH` = 0.775 - 0.405 = 0.370.
   * Using the same 0.370 in portrait hands the phone the SAME vertical slice of the world the
   * desktop gets — measured, 19.78 world units of frame on l1 and 18.16 on l3, the landscape
   * solve's own numbers — so the two screens now differ only in how much WIDTH the phone
   * crops, which is the honest difference between them.
   *
   * Two consequences, both deliberate and both measured:
   *   · the sling and the structure are NOT on screen together any more. l3's nearest block is
   *     13.6 world units downrange of the sling and the portrait frame is 8.4 units wide; no
   *     frame at aspect 0.462 holds both with the tower above 20 %H. The shot's own pan is what
   *     carries the frame from the one to the other, and the settle framing after every shot is
   *     what puts the structure on screen between shots.
   *   · l2 is short and wide (top 3.76, structure 11.7 across), so its portrait frame closes to
   *     4.70 units and shows ~40 % of its own structure at once — the price of a 37 %H tower on
   *     a level whose tower is 3.76 units tall.
   */
  towerPctH_portrait: 0.370,
  /**
   * ── ROUND 2 — NO STATIC PORTRAIT FRAME CAN DO THIS, SO THE CAMERA MOVES ────────────────
   *
   * Round 1 ended with the portrait frame solved as `vw = max(vh·aspect, minVwPortrait,
   * span·portraitSpanMargin)`, i.e. WIDE ENOUGH TO HOLD THE WHOLE LEVEL. That fixed the real
   * defect it was written for (l2's structure running off the right edge on a real iPhone) and
   * it is the reason `onScreenFracW` below reads 1.000 everywhere. It also made the span term
   * bind on all three levels, which set the frame from the LEVEL'S WIDTH again — the exact
   * thing the height solve exists to avoid. Measured on the shipped round-1 build at 390x660
   * (`_shots/CAM/r2-base-390x660`), the tower at aim:
   *
   *        l1  13.46 %H      l2  6.55 %H      l3  12.52 %H      (sky above it ~73 %H)
   *
   * and at 390x844, 10.5 / 5.0 / 9.5 %H. The owner's reading of a real iPhone — "the tower is
   * small and roughly 60-65 % of the frame is empty sky" — is that solve, stated honestly.
   *
   * THE ARITHMETIC IS CLOSED. A perspective frame has `vh = vw / aspect`, so at 390x660
   * (aspect 0.591) a frame wide enough to hold l1's 24.7-unit sling->target span is 54 world
   * units TALL to carry 7.3 units of tower. Tower %H is `top·aspect/vw`; the only way to raise
   * it is to lower vw, and the only thing vw buys is how much of the level is in shot. There is
   * no third option and no amount of tuning invents one — two previous rounds proved it by
   * failing in both directions (one framed so tight the structure left the viewport entirely;
   * one so wide the tower read 5-12 %H).
   *
   * So the static frame is no longer asked to do the whole job. The aim frame is now solved as
   * THE TIGHTEST FRAME THAT STILL SHOWS THE NEAREST STANDING EDGE, capped by play scale:
   *
   *      vwNear = (near − slingX + drawClearance) / aimNearEdgePctW
   *      vw     = clamp(vwNear, vwTight, maxVwPortrait)
   *
   * and the three things the old frame was carrying on its own are carried by MOVES instead:
   *   · `establish()` — the level opens ON THE TARGET, so the player sees the scam and what
   *     they are aiming at before they see the sling, then the camera travels back.
   *   · the DRAW reveals — portrait's pull-back is a real reveal (`drawPullBackMaxPortrait`),
   *     so the act of aiming opens the frame back out over the level.
   *   · the FLIGHT pushes in (`portraitArriveByContact`) so the collapse is seen CLOSE.
   *   · and `lookBy()` — drag anywhere off the sling to pan, which did not exist at all.
   */
  /**
   * Where the nearest standing edge sits at aim, and the number this whole trade is decided by.
   * It is a WANT, not a floor — the cap below overrides it — and it is why the aim frame is
   * per-level rather than a constant: l1 solves to 24.3, l2 to 23.2, l3 to 22.0 at every aspect,
   * because what sets it is how far downrange the level puts its first block.
   *
   * ── 0.78 IS A MEASURED COMPROMISE, NOT A PREFERENCE. THE FIRST TRY WAS 0.94. ──────────────
   * At 0.94 the near edge sits just inside the frame and the numbers look excellent: tower
   * 21.4 / 11.5 / 21.7 %H at 390x660, up 59-76 % on round 1. The SCREENSHOT of it
   * (`_shots/CAM/r2-new-390x660/03-l1-c-aim.png`, kept deliberately) is the argument against it:
   * a slingshot, a lot of grass, the same enormous sky, and one sliver of a glass column at the
   * right edge. `onScreenFracW` read **0.128** — the player aims at something they cannot see.
   * That is the failure mode the round before this one was failed for, arrived at by a different
   * route, and no tower percentage buys it back.
   *
   * At 0.78 the same structure reads MORE THAN HALF on screen (l1 0.56) with the tower still up
   * a third on round 1, and the draw reveal opens it the rest of the way at the exact moment the
   * player is looking downrange. Both numbers are reported side by side for every claim in this
   * file for precisely this reason: a size claim without an on-screen claim can be made to say
   * anything.
   */
  aimNearEdgePctW: 0.78,          // RETIRED in round 3 — see `aimFarMarginPortrait`.
  /**
   * ── ROUND 3: THE AIM FRAME IS THE *SHOT* FRAME, AND THE ARITHMETIC IS CLOSED ──────────────
   *
   * Round 2 solved the aim frame from the level's NEAR edge and cropped the far end. Measured
   * on that build at 390x660 (`_shots/CAM/r3-base-390x660`): tower 17.79 / 9.57 / 17.99 %H at
   * aim with `onScreenFracW` **0.563 / 0.436 / 0.444** — the player aims at a structure with
   * nearly half of it outside the frame, and the far half is where l1's outpost, l2's outpost
   * and l3's third recruit stand. Round 1 solved it from the level's SPAN and delivered the
   * mirror-image failure: 13.46 / 6.55 / 12.52 %H with nothing cropped.
   *
   * BOTH ARE POINTS ON ONE CURVE, AND THE CURVE IS FORCED BY THE LEVELS, NOT BY THE CAMERA.
   * Two facts do all the work. First, a frame that holds the loaded band and the structure must
   * span from `slingX − drawClearance` to the structure's far edge:
   *
   *        vwMin = right − (slingX − drawClearance)      l1 28.45   l2 29.82   l3 28.11
   *
   * Second, the tower's height on screen is nothing but
   *
   *        towerPctH = top · aspect / vw    ⟺    towerPx = top · canvasWidthPx / vw
   *
   * — it does not contain the frame height, the ground line, the camera distance or the FOV.
   * So at 390 px of canvas width the tower is 100 px (l1), 49 px (l2), 93 px (l3) AND THERE IS
   * NO SETTING OF THIS FILE THAT MAKES IT LARGER while the sling is on screen. Against a 660 px
   * viewport that is 15.2 / 7.4 / 14.1 %H. Round 3's target of 25 %H needs vw ≤ 17.30 on l1,
   * and a 17.30-unit frame holding the band starts at −3.75 and ends at 13.55 — 1.65 units
   * SHORT of l1's nearest block. At 25 %H the structure is not cropped, it is absent.
   *
   * The frontier, measured on l1 (frame left edge pinned at the drawn band, aspect 0.5909):
   *
   *        vw     17.3   20.0   22.0   24.29*   26.0   27.6   28.45
   *        tower  25.0   21.6   19.6   17.79    16.6   15.7   15.2   %H
   *        onScr  0.00   0.15   0.36   0.563*   0.78   0.95   1.00
   *                                    * = the round-2 build
   *
   * Every pair on that line is available and no pair above it is. Round 2 bought 2.6 points of
   * tower with 44 % of the structure; round 3 buys the structure back. The choice is made on
   * which failure a student can recover from: a small target is read by looking harder (and
   * `lookBy`/`lookZoomBy` now let them go and look), a target outside the frame cannot be read
   * at all, and a slingshot outside the frame cannot be used at all.
   *
   * WHAT WOULD ACTUALLY MOVE IT — both cost something outside this file:
   *   · MOVE THE SLING DOWNRANGE. `vwMin` is 19-20 units of empty grass between the band and
   *     the first block; that gap is 66 %W of the aim frame on l1 and it is the whole defect.
   *     Halving it puts l1 at 22.5 %H and l3 at 21 %H with nothing cropped. It changes every
   *     trajectory, so it re-derives the star thresholds and both determinism gates.
   *   · GIVE PORTRAIT A WIDER GAMEPLAY CANVAS. `towerPx` is fixed, so shortening the canvas
   *     raises `towerPctH` honestly (the pixels removed are pure sky). A 390x410 play window
   *     puts l1 at 25.0 %H and l3 at 23.3 %H — and costs 250 px of the phone's 660, which is
   *     why it is reported rather than shipped.
   *   · l2 IS OUT OF REACH OF BOTH. Its tallest point is 3.76 units against an 11.72-unit-wide
   *     structure, so even a frame holding NOTHING but the structure reads 18.96 %H, and 25 %H
   *     needs vw ≤ 8.89 against a structure 11.72 wide. l2 cannot reach 25 %H in portrait at
   *     any camera setting whatsoever; only its geometry can fix it.
   *
   * This number is the air in FRONT of the structure's far edge, in world units — the far
   * block must not sit flush against the frame edge, because a block touching the edge reads as
   * cropped whatever `onScreenFracW` says. 0.25 units is 3.4 CSS px at 390x660.
   */
  aimFarMarginPortrait: 0.25,
  /**
   * ══ ROUND 4 — THE PORTRAIT FRAME STOPS PAYING FOR TWO SUBJECTS AT ONCE ═══════════════════
   *
   * Round 3 solved the aim frame as `right + margin − (slingX − drawClearance)` — one static
   * frame holding the band AND the whole structure. Measured on that build at 390x660:
   *
   *      camVW  28.70 / 30.07 / 28.36 world units      tower 15.5 / 7.9 / 15.7 %H
   *      empty sky above the topmost gameplay pixel    62.4 / 69.9 / 62.5 %H
   *
   * At aspect 0.5909 a 28.7-unit-wide frame is 48.6 units TALL, and l1 has 7.3 units of tower
   * to put in it. That is the whole defect stated as one ratio: 15 % of the screen is the game
   * and 62 % is sky, because the frame is sized by the 19 units of empty grass between the band
   * and the first block — a distance with nothing in it to look at.
   *
   * The closed arithmetic in `aimFarMarginPortrait` above is still true and still closed. What
   * round 4 changes is the premise it is closed under: "WHILE THE SLING IS ON SCREEN". It no
   * longer has to be, all the time — because the frame MOVES.
   *
   *   THE BAY POSE      the launch bay: the sling on its derived mark with the runway ahead of
   *                     it. This is where a level rests and where every drag begins, so the
   *                     band is always on screen when the player reaches for it.
   *   THE STRIKE POSE   the structure, framed as tightly as its own proportions allow. It is
   *                     the moment-of-decision frame AND the flight frame AND the impact
   *                     frame — one pose, held from full draw through collapse.
   *
   * BOTH POSES ARE THE SAME WIDTH. That is deliberate: the move between them is then a pure
   * lateral PAN at constant scale, not a zoom, so the world never changes size under the player
   * and one number per level sets play scale everywhere. The width is solved from the TARGET,
   * because the target is the thing that has to be legible:
   *
   *      vw = clamp( top·aspect / strikeTowerPctH,  structW/strikeFillMax, structW/strikeFillMin )
   *
   * Solved at 390x660 (aspect 0.5909) on the shipped levels:
   *
   *      l1  vw 11.69   tower 37.0 %H   structure 81 %W of the frame
   *      l2  vw 12.34   tower 18.0 %H   structure 95 %W      (its own proportions — see below)
   *      l3  vw 11.49   tower 34.6 %H   structure 95 %W
   *
   * l2 IS NOT REACHABLE AND THE REASON IS THE LEVEL, NOT THE CAMERA. Its tallest point is 3.76
   * units against a structure 11.72 wide — 3.1x wider than it is tall — so a portrait frame
   * that holds its width is 1.7x taller than that again, and 18 %H is the ceiling for a frame
   * with nothing cropped. Cropping is available (vw 9.66 would read 23 %H) and is refused: the
   * far quarter of l2 is a standing outpost the player has to see before they fire.
   */
  strikeTowerPctH: 0.37,
  /**
   * The most of the above-ground frame height the structure may occupy in the strike pose.
   * This is the floor that stops the width-based fill rule cropping a tall tower; see the
   * long note in `strikeFrame()` for the measurement that forced it.
   */
  strikeTowerFitPct: 0.88,
  /**
   * The most of the above-ground AIM frame the structure may occupy. Looser than the strike
   * pose's because this frame carries the slingshot and the approach as well as the tower.
   * Exists to stop `targetPctWMin` cropping the level on a wide screen — see `solveAim()`.
   */
  aimTowerFitPct: 0.90,
  /**
   * The least of the sling-to-target span the strike frame may show. Under 1.0 so impact is
   * still a small push-in rather than a cut straight back to the aim frame, but high enough
   * that the slingshot never leaves the screen.
   */
  strikeSpanPctMin: 0.85,
  /** Tightest allowed: the structure may span at most this much of the strike frame's width. */
  strikeFillMax: 0.95,
  /** Widest allowed: it must span at least this much, or the tight frame is not tight. */
  strikeFillMin: 0.80,
  /**
   * Where the structure's far edge sits in the strike frame. Under 1.0 so the far block is never
   * flush against the edge, and the remainder falls on the LEFT — the side the ball arrives
   * from, so it is on screen for a beat before it lands rather than appearing inside the frame
   * it is already hitting.
   */
  strikeFarPctW: 0.94,
  /**
   * ── RETIRED IN ROUND 9: THE DRAW NO LONGER PANS AT ALL ───────────────────────────────────
   * These used to time round 4's bay→strike travel: nothing for the first `drawHoldPortrait`,
   * eased to the strike pose by `drawStrikePortrait`, glided at `drawGlideRatePortrait`. The
   * paragraph that used to sit here ended "WHAT THIS COSTS, STATED PLAINLY: past ~26 % draw the
   * band is off screen" — which is the blind shot the owner reported from a real phone, written
   * down in advance and accepted. Round 9 does not accept it. See the long block in `drawing()`
   * for the measurements, and for why removing the travel costs the composition nothing.
   *
   * `drawHoldPortrait` and `drawStrikePortrait` are dead and kept at their old values only so an
   * old reference cannot silently read 0 and re-enable a pan.
   *
   * `drawGlideRatePortrait` IS STILL LIVE and still correct. A draw releases the player's own
   * `lookX`/`lookZoom`, so a player who pinched or panned before reaching for the band has a
   * real move to make on first touch; 11.0 /s brings a 17-unit offset home inside ~340 ms.
   */
  drawHoldPortrait: 0.06,        // DEAD (round 9)
  drawStrikePortrait: 0.26,      // DEAD (round 9)
  drawGlideRatePortrait: 11.0,
  /**
   * The flight and the aim are the same frame in portrait now, so the arrival must not tighten
   * below it: `flightZoomArrivalMax` (0.80) is a fraction of a flight frame that used to be
   * twice this wide, and applying it here would close an 11.7-unit frame onto a 9.5-unit
   * structure and crop the impact. 1.00 hands the decision to `solveLead()`'s fill rule.
   */
  flightZoomArrivalMaxPortrait: 1.00,
  /**
   * …and the aftermath may open slightly past it, because wreckage spreads wider than the
   * structure that made it. Capped, so a settle can never walk back to a round-3 frame.
   */
  settleOpenMaxPortrait: 1.35,
  /** …and it may close by 15 % and no more — see `resolveSettle()`. */
  settleFloorPortrait: 0.85,
  /**
   * RETIRED in round 3. It was a play-scale ceiling (a villain must stay ~20 CSS px), and the
   * shot frame breaks it: at vw 28.7 a 1.2-unit villain is 16.3 px, not 19. That is the price
   * of the closed arithmetic above and it is charged honestly rather than hidden — the frame
   * cannot be tightened to buy it back without cropping the structure or the band. Left in
   * place at a value that cannot bind so the landscape path and any future level keep a
   * backstop against a runaway solve.
   */
  maxVwPortrait: 40.0,
  /**
   * An absolute floor, so a level with a very short tallest point cannot solve its way into a
   * keyhole. It does not bind on any shipped level (the draw clearance term is larger on all
   * three) and it is well under `maxVwPortrait`, which is what it has to be now that the
   * ceiling is the binding rule rather than this.
   */
  minVwPortrait: 19.0,
  /**
   * Multiplier on the level's sling->target span for the frame that holds the WHOLE level.
   * 1.0 would put the sling on one edge and the target on the other; the extra 30 % is the draw
   * behind the sling plus lead in front of the target, so neither is ever flush against an edge.
   * RETIRED from the aim solve in round 2 (it is what made the span bind and the tower 13 %H);
   * it now sets the ceiling the DRAW reveal opens toward — see `drawPullBackMaxPortrait`.
   */
  portraitSpanMargin: 1.30,
  /**
   * ── THE FRAME HAS TO HOLD THE DRAW, AND 13 %W DOES NOT ────────────────────────────────
   * `slingPctW` is a landscape number: on a 35-unit frame the band's 2.80-unit travel is 8 %W,
   * so the anchor can sit 13 % in from the left and the drawn pouch still has room behind it.
   * The portrait frame is 4.7-9.1 units wide, where the same travel is 31-60 %W, and at 13 %
   * the thing the player is dragging goes off the left edge: measured at full draw, 390x844,
   * the pouch sat at **-16.3 %W on l1, -44.0 % on l2, -18.9 % on l3** and the ammo with it.
   * A frame that loses the ammo while you are aiming it is not playable, whatever the tower
   * measures.
   *
   * So in portrait the anchor's mark is DERIVED from the draw instead of being a constant:
   * the frame must hold `drawClearance` world units behind the anchor, and the anchor goes
   * wherever that puts it. 4.04 = the band's own 2.80 travel (`SLING.maxStretch`, at the
   * flattest legal angle, where the whole of it lands on x) + the loaded ammo's measured
   * visual half-width (0.79, which is NOT its 0.40 collider) + 0.45 of margin.
   */
  drawClearance: 4.04,
  /**
   * The three pieces `drawClearance` is made of, named separately because round 3's draw
   * push-in has to re-derive the frame's left edge against the LIVE pouch rather than against
   * the worst case. They are measurements, not preferences:
   *   ammoVisualHalf   the loaded ball's rendered half-width, 0.79 (its collider is 0.40 — the
   *                    ring and the highlight are the rest, and they are what a player sees
   *                    leave the frame).
   *   slingLeftHalf    the fork's own left extent from `SLING.x`: prongDX 0.60 plus the limb's
   *                    stroke. The frame must hold this even when the band is slack.
   *   drawEdgeMargin   air between the ball's edge and the frame's, so "inside the frame" is
   *                    not "touching the frame".
   * 2.80 (SLING.maxStretch) + 0.79 + 0.45 = 4.04, which is `drawClearance` above.
   *
   * ROUND 9 RAISED `drawEdgeMargin` FROM 0.16 TO 0.45, and it is the only number the blind-shot
   * fix changes. With the draw's pan removed the reserve is finally spent on what it was
   * reserved for, so its arithmetic became visible: at the flattest legal full pull on l1 the
   * drawn ball's left edge landed at 0.42 %W — on screen, but 1.6 CSS px from the bezel at
   * 390x660, which reads as cropped however the measurement scores it. 0.45 units is 4.6 px of
   * air there. It is portrait-only by construction (`slingPct` returns the constant `slingPctW`
   * in landscape) so desktop cannot move, and the whole cost in portrait is +0.29 units of
   * aim-frame width on each level — l1 37.78 -> 38.07 (+0.77 %), l2 36.50 -> 36.79 (+0.79 %),
   * l3 19.01 -> 19.30 (+1.5 %); `needBoth` binds on all three, so `drawClearance` passes
   * straight through into the width. `flightVw` follows it by the same amount and nothing else
   * downstream moves: measured field-by-field against the pre-round build by
   * `_tools/scenarios/cam-pure.mjs`, the ONLY portrait fields that differ are these, `aimCx`
   * (-0.145), `slingPct` (+0.007), `bounds.maxX` (+0.029) and the draw rows this round removed.
   * At 1280x720 not one field differs.
   */
  ammoVisualHalf: 0.79,
  slingLeftHalf: 0.80,
  drawEdgeMargin: 0.45,
  /**
   * …with a ceiling, so a level cannot push the sling so far right that the launch has nowhere
   * to happen. It used to bind on l2 back when the portrait aim frame was ~4.7 units wide. The
   * levels were rescaled and round 5 widened the bay pose to hold the target, so on the shipped
   * three it is now inert and should stay that way — measured at 390x660 after round 9,
   * `drawClearance / vw` = 4.04/38.07 = 0.106 (l1), 4.04/36.79 = 0.110 (l2), 4.04/19.01 = 0.213
   * (l3). If it ever binds again the frame is too narrow for the band and the fix is the level or
   * a camera MOVE, not a fit; see the ROUND 1 note in `towerPctH_portrait`.
   */
  slingPctWMaxPortrait: 0.80,
  /**
   * How far the follow camera may lift above its resting height to keep a towering arc in
   * frame, as a fraction of frame height. 0.26 is the landscape number and it is unchanged —
   * see the VERTICAL DEADZONE note in `followBody` for what it protects. Portrait needs more
   * because the SAME 14-unit arc has to fit in a frame less than half as tall: l2's worst
   * legal lob asks for 0.59 of its frame, so 0.70 clears it with margin and still refuses to
   * chase anything an ordinary shot does.
   */
  /**
   * THE LIFT CEILINGS, RE-DERIVED. A player reported "sometimes the screen follows the cannon
   * ball too high — it should keep the structure in view, the fun is seeing the structure break
   * down", which is the correct priority: the subject of this game is the tower, not the ball.
   *
   * Both numbers were sized against frames that no longer exist. The portrait one in particular
   * was set when l2's portrait frame was 10.2 units tall and an arc could genuinely leave it;
   * that frame is now 41.1 units, so 0.70 of it is 28.8 units of licence to climb — far more
   * than any arc in the game needs, and the camera spends it. Measured on l2 in landscape, the
   * rig climbed from camY 3.66 at rest to 6.13 at impact and took the ground line off the
   * bottom of the frame with it.
   *
   * `needY` still asks for exactly the lift the projectile needs and no more, so these are
   * ceilings, not targets: an arc that genuinely threatens the top edge still gets room. They
   * simply stop the camera buying height it was never asked for.
   */
  /** How far above its resting height the rig may climb, as a fraction of the aim frame. */
  camRiseMaxPctH: 0.10,
  followLiftMax: 0.10,
  followLiftMaxPortrait: 0.14,
  /**
   * Empty graded sky above the tallest object. The sky rule is an EQUALITY, not a floor —
   * `solveAim` dollies back until it is met exactly — so setting this to the rubric's 40 %
   * floor parks the frame ON the line and any measurement noise reads as a miss (a critic's
   * own probe read 39.52 %H against a solve that had delivered 40.00). The reference frame
   * `ab_camera_full-level-establishing-no-hud_01` measures 42 %, so aiming a little above the
   * floor is also closer to the thing being matched. 0.405 costs 1.3 % of frame width and
   * leaves the furthest target at 83.2 %W, still mid-band on criterion 3 (82-92 %W).
   */
  skyMinPctH:  0.405,
  /**
   * Floor on where the furthest target may sit, as a fraction of frame width, when the sky rule
   * tries to widen the frame. 0.62 keeps the target in the right-hand third instead of letting
   * it drift to 34 % on a compact level. Only ever binds in landscape.
   */
  targetPctWMin: 0.62,
  /**
   * The DRAG pull-back and the ARRIVAL push-in are two different moves and must not be confused
   * with each other. This one is the drag: +13.5 % of visible width (measured 11.4 % at 16:9),
   * eased, and gone within 250 ms of release — the traverse frame at 0.84x is 29.1 units
   * against a 34.7-unit rest, so the pull-back does not merely return, it overshoots back past
   * rest. The arrival push-in is a separate, later move that belongs to the target rather than
   * to the band, and it carries the frame further in again, to ~20.7.
   */
  drawPullBack: 0.135,  // visible world width grows this much at full draw (rubric: 8–20 %)
  /**
   * ── ROUND 3: PORTRAIT NO LONGER PULLS BACK AT ALL. A DRAW MAY ONLY PUSH IN. ───────────────
   * Round 2 opened the portrait frame by up to 1.50× as the band came out, on the argument
   * that the tight aim frame left something to reveal. Measured at 390x660, what it actually
   * did was shrink the target at the exact moment the player was staring at it:
   *
   *        l1 17.79 → 13.05 %H     l2 9.57 → 6.99 %H     l3 17.99 → 12.65 %H
   *
   * A player draws in order to look HARDER at the thing they are about to hit. Backwards is
   * the right word for it. The rule is now absolute and one-directional:
   *
   *        **`vw` while drawing may never exceed the aim frame's `vw`.**
   *
   * so `towerPctH` at full draw is >= `towerPctH` at aim on every level, at every aspect, by
   * construction rather than by tuning. The aim frame already holds the WORST-CASE draw
   * (`drawClearance`, the flattest legal full pull), so the common case leaves slack behind the
   * band and the frame is free to close on it — that slack, and only that slack, is the
   * push-in, and it moves the frame TOWARD the target because the far edge is pinned.
   *
   * Capped here as a fraction of the aim width. The cap matters for two reasons: the frame the
   * shot crosses must still be recognisably the frame it was aimed from (round 7's rule), and
   * `follow()` seeds the flight's monotone-x floor from where the camera actually IS at release
   * — so an unbounded draw push-in would quietly re-seed the whole flight composition. At 0.06
   * the release seed moves by at most 3 % of a half-width; measured effect on the flight,
   * impact and collapse numbers: none (see the round-3 evidence table).
   */
  drawPushInMaxPortrait: 0.06,
  drawPullBackMaxPortrait: 0.50,   // RETIRED — kept so an old reference cannot silently read 0
  /**
   * Where the level's far edge lands at full draw. 96.5 %W — the same 3.5 %W of air the arrival
   * framing leaves (`arrivalEdgePctW`), so the far outpost and whatever is standing on it are
   * not shaved by the frame at the one moment the player is looking straight at them.
   */
  drawFarEdgePctW: 0.965,
  /**
   * FLIGHT FRAMING — THE SHOT ONLY EVER GETS TIGHTER. RELEASE > TRAVERSE > IMPACT.
   *
   * ── ROUND 3 SOLVED THE WRONG INEQUALITY, AND IT COST THE BLIND A/B ─────────
   * The rubric asks for two things at once mid-flight: the projectile at 55–75 %W and the
   * target structure at 40–60 %W. Both live on the same screen, so their separation is not a
   * free parameter:
   *
   *        structPctW − projPctW = 100 · d / vw ,   d = structMidX − projX (world units)
   *
   * The bands overlap only on [55, 60], so the pair "fits" iff **vw ≥ 20·d**. Round 3 took
   * that as an instruction and solved the ARRIVAL width from it. It is arithmetically correct
   * and cinematically fatal: `d` at the moment of contact is 2–3 units on l1, so the camera
   * hauled the frame out to 65 world units at the exact instant of the hit — **1.87× the
   * establishing frame**. Measured on the shipped round-3 build (`_shots/P4/r4-before`):
   *
   *        aim 34.70  ->  t=120 ms 31.89  ->  CONTACT 65.08  ->  19.43 after the collapse
   *        struck structure  27.37 %W at aim  ->  14.59 %W at the hit
   *        horizon           60.2 %H at aim   ->  66.5 %H at the hit
   *
   * i.e. the camera ran AWAY from the only moment the whole shot exists for, arrived at its
   * widest on the frame of first damage, and then dived back in to 19.4 once the collapse was
   * over and there was nothing left to see. A fresh critic drove it blind against real Angry
   * Birds and picked Angry Birds, naming exactly this. `20·d` is a statement about what the
   * rubric's two %W bands cost, not a composition — and satisfying a %W band by making the
   * subject tiny satisfies the letter of a criterion by destroying the thing it is for.
   *
   * ── SO THE ARRIVAL IS NOW SOLVED FROM THE SUBJECT, NOT FROM THE BAND ───────
   * A push-in. The frame width falls monotonically from the drawn frame, through the traverse,
   * to its tightest on the frame of contact, and the arrival width is solved from two rules
   * that are both about the SUBJECT rather than about a percentage:
   *
   *   1. IT MUST FIT.   With the standing structure's centre on its arrival mark, neither end
   *      of it may be cut off by the frame edge:
   *          vwFit = max(standRight − standMid, standMid − standLeft)
   *                  / (arrivalEdgePctW − arrivalStructPctW)
   *      (ROUND 5 restated this. It used to be measured from the PROJECTILE's screen mark —
   *      `(standRight − contactX) / (edgePctW − 55.5 %W)` — which is the right question only
   *      while the ball owns the frame's X. It no longer does; see the ROUND 5 block below.)
   *
   *   2. IT MUST READ.  The standing structure fills at most `arrivalFillMax` of the frame
   *      width, which floors the frame at  vwFill = standSpan / arrivalFillMax  (l1: 9.5/0.50
   *      = 19.0). This is the rule that stops a deep hit diving into a close-up of one plank.
   *
   *      vw_arrival = clamp( max(vwFit, vwFill), zoomMin·vw_aim, zoomMax·vw_aim )
   *
   * On l1 that lands at 20.7 units — 0.60× the establishing frame — with the standing
   * structure filling 46 %W (the reference establishing frame reads 11 %W; the round-3 build
   * read 14.6 %W at the hit) and the horizon back at ~53 %H.
   *
   * The mark solve below is unchanged and needs no special case: at these widths the pair
   * cannot fit, so it clamps to the low edge of the projectile's band — which is exactly the
   * right answer, because every world unit not spent on lead is spent on the structure.
   *
   *   flightZoomTraverse  the frame while the shot is still crossing empty sky, and the WIDEST
   *                   point of the flight. A real push-in off the drawn frame — it is the
   *                   release punch, and it is what makes the drag pull-back visibly RETURN
   *                   (rest 34.7 -> drawn 39.0 -> 29.5 by +200 ms, i.e. back past rest).
   *                   Under ~0.8 it crops the tower off the right during the traverse.
   *   arrivalFillMax  the structure may fill at most this much of the frame width at the hit.
   *                   0.47, and it is now the BINDING rule on l1 rather than a backstop: once
   *                   the subject is centred, the fit rule only asks for span/0.89, so the
   *                   width is set by legibility alone. 0.47 rather than the 0.50 top of the
   *                   round-4 critic's 35–50 %W band, for the same reason `skyMinPctH` carries
   *                   margin — a band edge is not a target. It reproduces round 4's measured
   *                   arrival width to within 1 % (20.2 vs 20.05), so the push-in is unchanged.
   *   arrivalEdgePctW how close to the right edge the furthest standing thing may sit at the
   *                   moment of contact. 96.5 %W — 3.5 %W of air, enough that the far cap and
   *                   the villain on it are not shaved by the frame.
   *   flightZoomArrivalMin / Max   legibility clamp on the solve, as multiples of the
   *                   ESTABLISHING frame, and BOTH BELOW 1.0 — the arrival can never be wider
   *                   than the aim frame again, which is the defect this round exists to kill.
   *                   Min 0.52 (18.0 units on l1) is the refusal point going in: tighter and
   *                   the incoming traceline has no room and the far outpost leaves frame.
   *                   Max 0.80 (27.8 units) is the refusal point going out: wider and the
   *                   structure drops under the critic's 35 %W floor.
   *   flightZoomArrival   fallback width for a shot whose landing point cannot be predicted at
   *                   all (a clean flyover with nothing ahead of it). Nothing to compose
   *                   against, so it simply keeps closing a little past the traverse — a shot
   *                   that ends in the grass still ends tighter than it started.
   *   leadProjMinPctW / leadStructMaxPctW / leadBandMargin   the rubric's own [55, 60] %W
   *                   overlap and the margin the mark aims inside it. Quoted, not chosen.
   *   flightProjPctW  fallback mark, used only in the no-prediction case.
   */
  /**
   * ── ROUND 7 — THE SHOT CROSSES THE FRAME. THE CAMERA DOES NOT GO AND GET IT. ──
   *
   * Rounds 3–6 each fixed a defect in the camera's MOTION and left the same premise standing:
   * that the flight camera's job is to acquire the projectile and carry it. Measured on the
   * shipped round-6 build (`_shots/P4/r7-base/LEAD6.json`, six shots):
   *
   *        projectile   55.98 – 56.18 %W for 100 % of the traverse   (0.15 %W of variation
   *                     over 360 ms — the dart is WELDED to the glass)
   *        sling         13.0 %W at aim -> 16.1–17.8 %W by t = 100 ms  (the camera panning
   *                     BACKWARDS 1.8–2.5 world units to grab the lock)
   *                     -> −0.6 to −10.7 %W at contact (off the left edge, on 5 of 6 shots)
   *        structure     70.4 %W at aim -> 78–80 %W in the same 100 ms, far edge to 93.4
   *
   * Three things wrong at once, all of them the same thing. The camera lurches backwards
   * against the shot at the exact moment the player is reading it; it throws the launch point
   * away; and it leaves 54 %W of frame dead BEHIND the dart, which is the half of the picture
   * nothing is going to happen in. Both mid-flight reference frames do the opposite — the
   * sling is still in shot (8.9 %W in `ab_camera_sky-dominant-low-horizon_02`, 17.8 %W in
   * `ab_launch_release-instant-band-recoil_03`) and the bird is somewhere in the middle of a
   * frame it is crossing.
   *
   * So the flight framing is now the AIM framing, held. Three parts, and all three are needed
   * — each one alone leaves a different piece of the same lurch behind:
   *   1. `flightZoomTraverse` is 1.0. The drag pull-back returns to rest and stops there, so
   *      the frame the shot crosses is the frame the player composed the shot in.
   *   2. `_camFloorX` is seeded at the camera's own position on the frame of release rather
   *      than at `bounds.minX`. That seed is what made the backwards lurch legal in the first
   *      place: `bounds.minX` sits 0.15·vw LEFT of the resting centre, so "the camera never
   *      pans back" was true only relative to a floor five world units behind where the
   *      player was actually looking.
   *   3. `drawing()` no longer drifts the camera centre downrange as the band comes back (see
   *      the docblock there). It used to move 1.06 units right over the draw, and because (2)
   *      seeds the floor at the camera's ACTUAL position, that drift was inherited by the
   *      whole traverse — the shot crossed a frame one unit downrange of the aim framing, and
   *      the sling slid from its 13 %W mark to 11.1 %W while the frame was nominally "held".
   *
   * The projectile then does what it does in the reference: it crosses. Measured after all
   * three, `_shots/P4/r7-final/CROSS.json`, eight shots:
   *
   *        pan backwards, worst of 8 shots    0.000 world units   (was 1.8–2.5)
   *        ball, canonical    40.4 -> 59.6 %W with camx frozen at 13.013 for 100 % of the
   *                           pre-contact flight  (was 56.0 -> 56.2 with the camera moving)
   *        ball, flyover      40.6 -> 69.9 %W     — the mark is only reached on a shot long
   *                           enough to need it, and it is a boundary, not a peg
   *        sling              16.9 %W at release -> 13.6 %W at contact, IN FRAME for 100 %
   *                           of five of eight shots and >= 91 % of the rest
   *        structure          56.1 -> 82.6 %W held (aim framing reads 56.2 -> 83.2)
   *
   * The empty frame is ahead of the dart instead of behind it.
   *
   * `flightZoomTraverse` at 1.0 is not "no push-in": the drawn frame is 1.135× (39.4 units),
   * so release still closes 13.5 % of visible width, and the arrival push-in from 35.2 to
   * ~20.7 on the hit is now the biggest lens move in the shot rather than a footnote to it.
   *
   * ── STATED PLAINLY: CRITERION 3 AND CRITERION 4a CONFLICT, AND 3 WINS ─────
   * Criterion 4a wants the projectile at 55–75 %W mid-flight. On a shot that HITS, holding
   * the aim framing cannot deliver that, and the arithmetic is closed-form rather than a
   * matter of tuning. Criterion 3 fixes the frame: sling at 13 %W and furthest target at
   * 83 %W puts the camera centre at world x = 13.01 with vw = 35.17. l1's ammo leaves the
   * muzzle at x = 9.23 and first touches the tower at x = 16.87, so the whole visible flight
   * spans 40.4 → 59.6 %W — 22 % of the picture — and its MIDPOINT is at x = 13.05, which is
   * the frame's own centre to within 4 cm. Putting that midpoint at 65 %W needs camx = 7.7,
   * which puts the sling at 29 %W and the furthest target at 98 %W: criterion 3 destroyed.
   * The only other way to buy 4a is to weld the ball to a screen mark and haul the world
   * past it — which is what round 6 did, and the fresh critic that drove it blind against
   * Angry Birds picked Angry Birds and named exactly that.
   * So 4a is bought where it can be honestly bought — a shot with room ahead of it IS picked
   * up and led (the flyover measures 69.9 %W, inside the band, against `traverseMarkPctW`) —
   * and on a hitting shot the ball crosses THROUGH centre rather than sitting on it. That is
   * the distinction criterion 4's automatic FAIL is written on: "the projectile is CENTRED
   * during flight instead of led", i.e. pinned, not passing through. Both mid-flight
   * reference frames confirm the crossing reading: `ab_launch_release-instant-band-recoil_03`
   * has the bird at 40.6 %W and `ab_camera_sky-dominant-low-horizon_02` has it at 66.7 %W,
   * with the sling still in shot in both — which is 40 → 67 %W, our 40 → 60 with a longer
   * level to cross. Widening l1's sling-to-tower span is P12's lever, not the camera's.
   */
  flightZoomTraverse: 1.00,
  flightZoomArrival:  0.780,
  /**
   * Fallback mark for a shot with nothing ahead of it to compose against (a clean flyover).
   * Raised from 55.25 %W to the traverse mark for the same reason as `traverseMarkPctW` —
   * a camera that carries the ball at 55 %W is a camera with the empty half of the frame
   * behind the shot.
   */
  flightProjPctW: 0.700,
  leadProjMinPctW:   0.55,   // rubric P4 criterion 4: projectile 55–75 %W
  leadProjMaxMark:   0.70,   // …but never park it near the top of that band on purpose
  /**
   * ── THE TRAVERSE MARK IS A BOUNDARY, NOT A PEG. (ROUND 7) ─────────────────
   * The mark solve below is a real solve only while the projectile-to-structure separation
   * is small enough for the rubric's two %W bands to fit — `vw ≥ 20·d`, which on l1 needs a
   * 60–140 unit frame and therefore never happens (see the FLIGHT FRAMING block). So for
   * every frame of every real traverse the solve returns a value below the band and CLAMPS,
   * and it is the clamp, not the solve, that is the composition. Round 6 clamped it to
   * 55 %W + margin — the bottom of the band — which is why the dart sat at 56.0 %W for the
   * whole flight with the camera hauling the world past it.
   *
   * Clamping to the TOP of the band instead turns the mark from a peg into a boundary: the
   * camera holds still, the shot crosses the frame freely, and the camera only begins to
   * carry it at the point where it would otherwise run out of frame ahead of it. On l1's
   * canonical shot the ball never gets there before it lands, so the camera is still for the
   * whole traverse; on a long flat shot it is picked up at 70 %W with 30 %W of frame still
   * in front of it, which is inside the rubric's 55–75 band and is a lead, not a lock.
   */
  traverseMarkPctW:  0.700,
  leadStructMaxPctW: 0.60,   // rubric P4 criterion 4: target structure 40–60 %W
  leadStructMinPctW: 0.40,
  /**
   * How far inside the band edge the projectile's mark is aimed. 1.0 %W, not 0.5: the pair
   * of bands does not fit at an arrival width (see the FLIGHT FRAMING block), so the mark
   * solve clamps to this floor for most of the shot, and the camera's own residual tracking
   * error hangs off it in both directions. At 0.5 %W the measured minimum was 54.84 %W —
   * outside the rubric's band while nominally on its edge. The structure pays the extra
   * 0.5 %W on the other side and can afford it; it is 47 %W wide and the ball is ~1 %W.
   */
  leadBandMargin:    0.010,
  arrivalFillMax:    0.47,   // the structure fills at most this much of the frame at the hit
  /**
   * ── THE "IT MUST READ" RULE IS AN ASPECT RULE, AND 0.47 IS THE LANDSCAPE ONE (ROUND 2) ────
   * `arrivalFillMax` floors the arrival frame at `standSpan / fill`, which is what stops a deep
   * hit diving into a close-up of one plank. On 16:9 a structure filling 47 %W is already 37 %H
   * tall, so the rule costs nothing. In portrait the same 47 %W is 28 %H at 390x660 and 22 %H at
   * 390x844 — and the structure is WIDER than it is tall (l1: 9.5 × 7.3), so a frame that keeps
   * it under half the width is a frame in which it is small. l1's structure at 0.82 fills 79 %W,
   * which is not a close-up of a plank: it is the whole structure, filling a phone.
   */
  arrivalFillMaxPortrait: 0.82,
  arrivalEdgePctW:   0.965,  // …and its far edge stays this far inside the frame
  /**
   * ── ROUND 5 — THE ARRIVAL IS COMPOSED ON THE SUBJECT, NOT ON THE BALL ─────
   *
   * Round 4 got the frame WIDTH right (a monotone push-in, tightest on the frame of contact)
   * and left the frame's X pinned to the projectile for the whole flight: `camx = p.x −
   * (mark − 0.5)·vw` with `mark` clamped at 55.5 %W from release to impact. Measured on the
   * shipped round-4 build (`_shots/P4/r5-base`, five different shots):
   *
   *        projectile      55.6 – 58.1 %W        (criterion 4a: 55–75  ✓)
   *        structure MID   68.5 – 73.6 %W        (criterion 4b: 40–60  ✗ by 9–14 points)
   *        structure right 92.0 – 95.4 %W        (nothing between it and the frame edge)
   *        structure left  45.1 – 53.0 %W        (i.e. HALF THE FRAME behind the shot, empty)
   *
   * A fresh critic drove that blind against real Angry Birds and picked Angry Birds, naming
   * the composition: the whole event is jammed against the right edge, the debris has nowhere
   * to go, and the left half of the picture is grass. Which is what a ball-locked camera must
   * produce — the ball is ~1 %W wide and the thing it is flying at is 47 %W wide, so pinning
   * the small one to a screen mark hands the big one whatever is left over.
   *
   * So the arrival anchor is the SUBJECT. As the shot comes in, the camera's X blends off the
   * projectile and onto a pose solved from the standing structure: its centre on
   * `arrivalStructPctW`, with the contact point itself kept off the frame edges. The ball then
   * flies INTO a composed frame instead of dragging the frame along behind it.
   *
   * ── THE HONEST PART: 4a AND 4b DO NOT BOTH FIT, AND 4b IS THE ONE THAT MATTERS ──
   * Their screen separation is not a free parameter — it is `100·d/vw` with
   * `d = structMid − projX` — so the pair fits only when `vw ≥ 20·d`. On l1's canonical hit
   * d = 3.55, i.e. vw ≥ 71: TWICE the establishing frame, which is precisely the round-3
   * defect (the frame ran away from the hit and the struck tower shrank to 14.6 %W). Round 4
   * bought 4a and lost the blind A/B on 4b. Round 5 buys 4b and reports 4a honestly:
   * the projectile holds 55–58 %W for the traverse — the whole time it is the only thing on
   * screen — and then falls to ~35 %W as the camera settles onto the target. At 35 %W with
   * 65 %W of frame ahead of it in its direction of travel, the ball is LED, which is what
   * criterion 4's headline sentence and its automatic-FAIL clause ("the projectile is centred
   * during flight") actually protect. It is not centred and it is not trailing.
   *
   *   arrivalStructPctW      where the standing structure's centre sits at contact. 0.52 —
   *                    mid-band on the rubric's 40–60, so no measurement noise can push it
   *                    out, and a hair right of dead centre because the ball and its
   *                    traceline enter from the left and want the room.
   *   arrivalContactMin/MaxPctW   …but the EVENT may not be marginalised by centring the
   *                    structure: a hit on the far outpost of a wide level would otherwise
   *                    land at 80 %W. Clamped into 22–70 %W, which on l1's canonical hit is
   *                    slack (the contact lands at ~35 %W) and only bites on a deep hit.
   *   arrivePanAt / arrivePanBy   the fraction of the run over which the anchor slides from
   *                    the ball to the subject. ROUND 6 RETIMED THESE AND CHANGED THE
   *                    REASONING — see the round-6 block immediately below. Round 5 ran the
   *                    slide from 0.48 to 0.90 of a run measured to `e.left`, on the argument
   *                    that "a camera still travelling on the frame of impact reads as a
   *                    camera that got there late". That argument is right about a camera
   *                    that is CHASING and wrong about one that is being SHOVED, and the cost
   *                    of it was a rig parked on the impact framing 180 ms early with the
   *                    shot still crawling in behind it. They are now 0.80 -> 1.00 of a run
   *                    measured to the PREDICTED CONTACT, and the lead ratchet grants only as
   *                    much of the slide as can be paid for without overtaking the ball; the
   *                    rest lands on the impact beat.
   */
  arrivalStructPctW:     0.52,
  arrivalContactMinPctW: 0.22,
  arrivalContactMaxPctW: 0.70,
  /**
   * ── ROUND 6 — THE CAMERA MAY NOT OVERTAKE THE SHOT ────────────────────────
   *
   * Round 5 composed the arrival correctly and then ARRIVED AT IT TOO EARLY. Measured on the
   * shipped round-5 build (`_shots/P4/r6-base/LEAD.json`, canonical shot, contact at 560 ms):
   *
   *        t      0    140    240    300    380    460    560(hit)
   *        vw   39.3   32.2   28.0   25.5   22.8   21.4   20.8
   *        camx 13.9   10.5   14.0   17.3   19.5   19.5   19.5    <- ARRIVED AT t=380
   *        ball  9.2   12.5   13.5   14.2   15.0   15.8   16.9
   *        proj 38.0   56.1   48.2   37.7   30.4   32.8   37.4 %W
   *
   * Between t = 140 and t = 380 the camera travelled NINE world units while the projectile
   * travelled two and a half. It reached the impact framing 180 ms before the ammo did and
   * then sat there waiting, so the ball — the only thing moving — spent the whole second half
   * of the shot sliding BACKWARDS across the frame into the left third. That is the rubric's
   * "the projectile is centred during flight instead of led" failure by a different route: not
   * pinned to centre, but overtaken and dumped behind it.
   *
   * Round 3 fixed a symptom by zooming out at the hit. Round 4 fixed a symptom by pinning the
   * ball to a mark for the whole flight and jamming the tower against the right edge. Both
   * lost their blind A/B. The defect underneath all three rounds is the same and it is a
   * KINEMATIC one, so this round states it as a kinematic rule rather than as another set of
   * percentages:
   *
   *      THE PROJECTILE'S SCREEN POSITION IS MONOTONE NON-DECREASING IN ITS DIRECTION OF
   *      TRAVEL, FROM RELEASE TO CONTACT.
   *
   * The camera may pan (it never pans back — `_camFloorX`) and it may dolly, but it may not do
   * either fast enough to walk the shot backwards across the frame. `_markFloor` below is the
   * ratchet that enforces it. Everything else in the flight — the mark solve, the arrival
   * anchor, the push-in — is now a WANT that is granted only as far as this rule allows, which
   * is why the arrival composition can stay exactly as round 5 solved it and still not eat the
   * traverse: what cannot be paid for before the hit is simply paid for ON the hit.
   *
   *   (ROUND 8 removed `arrivePushAt` / `arrivePanAt` / `arrivePanBy`. Both ramps started at
   *    80 % of the run, which is what made the flight a FREEZE followed by a LUNGE — see the
   *    ROUND 8 block below. The pan is now a traverse that runs the whole flight and the
   *    push-in is now entirely the impact beat, so neither ramp has anything left to key.)
   *
   *   arrivalEventBias  the arrival frame is composed on the EVENT as well as on the subject.
   *                    l1's standing set spans 15.2–24.7 with its mid at 19.95 — which is the
   *                    GAP between the tower and the outpost, so centring it centred nothing
   *                    and pushed the actual collision out to 37 %W. The anchor is now
   *                    `lerp(standMid, contactX, bias)`: at 0.45 the collision lands ~44 %W
   *                    with the standing structure's mid still at ~59 %W, inside criterion 4's
   *                    40–60 band. It also halves the distance the beat has to travel.
   */
  arrivalEventBias: 0.45,
  /**
   * ── ROUND 8 — THE TRAVERSE RUNS THE WHOLE FLIGHT. ─────────────────────────
   *
   * Round 7 held the aim framing through the flight so the shot could cross a composed frame,
   * which fixed the backwards lurch and put the sling back in shot. What it left behind is the
   * shape of the move, measured by the round-7 critic on the shipped build and reproduced
   * exactly by `_tools/scenarios/p4-r8-traverse.mjs` (`_shots/P4/r8-base`):
   *
   *        pan in the first 400 ms of flight        0.000 world units  (0.54 on one of 8 shots)
   *        pan in the 170 ms straddling contact     3.07 – 4.15 units
   *        front-load (that 170 ms / the whole)     0.42 – 0.89
   *        zoom peak                                −240 to −326 %frame/s, always at contact
   *        criterion 4 satisfied                    0 of 28 in-flight samples
   *
   * i.e. the shot crosses a STILL frame and then the camera is fired at the target. A still
   * frame is not a composition that leads; it is the absence of one. So the arrival move is
   * now spread across the whole flight as a designed traverse, and the three things that made
   * that dangerous in rounds 5 and 6 are each answered rather than avoided:
   *
   *   · it is keyed to the fraction of THIS SHOT'S OWN FLIGHT TIME that has elapsed
   *     (`followT / (followT + predicted time to contact)`), not to distance along the run.
   *     The launch kick covers 38 % of l1's run in the first 100 ms, so a spatial ramp
   *     front-loads the entire pan into the kick — a lurch at the exact moment round 7 fixed.
   *   · its END POSE is solved so the ball lands on `leadContactMark` on the frame of contact,
   *     which is what keeps the ball's screen position monotone non-decreasing (round 6's
   *     rule) — the camera travels strictly slower than the shot, so the shot still crosses;
   *   · it eases with a smoothstep, so it leaves and arrives at zero pan rate. Peak pan rate is
   *     1.5 × mean, and on l1 that is ~4.4 m/s against a 12.8 m/s ball.
   *
   * WHAT IT COSTS, STATED PLAINLY: the ball's on-screen travel and the camera's pan come out of
   * ONE budget. The ball crosses `100·T/vw` %W of the picture over a flight of T world units,
   * and every %W the camera pans is a %W the ball does not cross. On l1, T = 7.45 units at
   * vw = 35.2, so the whole budget is 21.2 %W. Round 7 spent it all on the crossing (0 %W of
   * pan, 19.3 %W of crossing). This round spends 5.6 on the pan and 15.4 on the crossing.
   * There is no setting that buys both, and the budget is not the camera's to widen: l1's ammo
   * is teleported 9.98 world units — 28 %W, more than the entire remaining budget — clear of
   * the pouch on the frame of release (`SLING.muzzleBase + muzzleLead·speed`, P1's constant).
   *
   *   leadContactMark   where the ball sits on the frame of first contact, and therefore the
   *                    whole traverse: `camEnd = contactX − (mark − 0.5)·vw`. It is a MAXIMIN,
   *                    not a preference. The rubric wants proj ≥ 55 %W and the struck
   *                    structure ≤ 60 %W, and their screen separation at contact is fixed by
   *                    geometry at `100·(structMid − contactX)/vw` = 3.7 %W on l1's canonical
   *                    hit. That leaves 1.3 %W of total slack to split between the two bands,
   *                    so the mark goes in the middle of it: proj 55.6 %W (0.6 above the
   *                    floor), struck structure 59.4 %W (0.6 below the ceiling). Anything
   *                    further right satisfies 4a with more margin and pushes the structure
   *                    out of 4b, and vice versa.
   */
  leadContactMark: 0.556,
  /**
   * Tracking-spring stiffness while the camera is on the projectile. Lives here rather than
   * as a literal in `followBody` because ROUND 5 made the WANT ITSELF travel — the anchor
   * slides ~9 world units from the ball to the subject during the arrival — and a spring's
   * steady-state error against an accelerating want is −A/k. At k = 110 that error was 0.4
   * units mid-ramp, which the camera then paid back as 33 units/s of velocity it had to shed
   * in a single 20 ms sample when it caught up: a pan that STOPS rather than decelerates.
   * The easing belongs to the designed trajectory (a smoothstep, which arrives with zero
   * velocity), so the controller's job is to be tight enough to reproduce it. Measured on the
   * canonical shot (`_shots/P4/r5-stiff`), worst single-sample speed shed / worst lag behind
   * its own want:  110 -> 32.6 / 1.51,  180 -> 26.8 / 1.13,  **260 -> 22.4 / 0.87**,
   * 380 -> 18.3 / 0.66, 550 -> 14.8 / 0.47. It is stable by a mile at FIXED = 1/120
   * (c·dt = 0.27 against a limit of 2; k·dt² = 0.018 against 4), and past ~260 the curve
   * flattens while the camera starts reproducing every wrinkle of its own want.
   */
  trackStiffness: 260.0,
  /**
   * THE HOLD GUARD (see the `vwCmd` floor in `followBody`). Not a composition — a floor under
   * the push-in that keeps the standing level inside the frame while the shot is in the air.
   * `holdEdgePctW` is deliberately almost the frame edge (99.5 %W) so the guard engages only
   * when something would genuinely be cut off, and `holdEdgePad` is the world-space slack that
   * absorbs the camera's tracking lag behind its own want (measured at up to 0.43 units).
   */
  holdEdgePctW:      0.995,
  holdEdgePad:       0.15,
  /**
   * RAISED after a player reported the impact "zoomed too deep, top of the structure cut off,
   * can't see where the slingshot is". Measured on l2 at the old values: aim frame 23.63 units
   * and camY 3.66, pushing to 14.85 / 6.13 at the hit and back out to 23.40 on settle — a 1.6x
   * zoom and a 2.5-unit climb, twice, every shot. The round trip is what disorients.
   *
   * The multipliers themselves were not wrong when they were set; the frame they multiply
   * changed underneath them. The docblock above quotes "Min 0.52 (18.0 units on l1)", i.e. they
   * were tuned against a ~34.7-unit establishing frame. Today's is 23.6, so the same 0.52 buys
   * 12.3 units instead of 18.0. Re-derived to hold roughly the absolute widths the original
   * tuning was aiming at, which keeps a push-in on the arrival without losing the ground line
   * or the sling.
   */
  flightZoomArrivalMin: 0.52,
  flightZoomArrivalMax: 0.80,
  /**
   * ── HOW MUCH OF THE PUSH-IN HAPPENS BEFORE THE HIT (PORTRAIT ONLY, ROUND 2) ───────────────
   * Round 8 moved the ENTIRE push-in into the impact beat, and the reason is sound: an
   * exponential ramp over the last 20 % of the run put a −240 to −326 %frame/s lens move into
   * the 120 ms before contact, which the player reads as the camera flinching early.
   *
   * In landscape that costs nothing, because the traverse frame already shows the structure at
   * 37 %H — it is readable at the moment of impact whether or not the lens has moved yet. In
   * portrait the traverse frame is the aim frame, so the measured structure AT THE FRAME OF
   * CONTACT was the aim frame's 13.2 / 6.4 / 12.3 %H, with the whole push-in landing 400 ms
   * LATER, on the wreckage. The payoff of the entire game is the collapse, and the camera was
   * arriving for it after it had started.
   *
   * So in portrait the width travels with the traverse: the same `smoothstep(u)` keyed to the
   * same fraction of this shot's own predicted flight TIME, reaching this much of the way to the
   * arrival width by contact and leaving the rest to the beat. Because it is the traverse's own
   * easing it starts and ends at zero rate and it is spread over the WHOLE flight, so the peak
   * lens rate is ~90 %frame/s rather than 326 — a quarter of what round 8 removed, for a move
   * that is four times longer. The remaining 20 % is what the hit itself still has to shove.
   */
  portraitArriveByContact: 0.80,
  flightSpeedGrow: 0.0015,  // per m/s of projectile speed, capped
  flightSpeedGrowMax: 0.035,
  /**
   * ── THE LAUNCH KICK IS NOT A SPEED THE CAMERA CAN BE HANDED ────────────────
   * `SLING.kick` triples the exit speed and unwinds it over `SLING.kickTicks` (10 steps,
   * 83 ms): the projectile leaves at ~49 m/s and is down to ~15 m/s a tenth of a second later.
   * Acquisition seeds the tracking spring with the projectile's own velocity so the handover
   * carries no lag — which is right, and is catastrophic if it happens DURING the kick, because
   * the camera is launched at 49 m/s at a want that is about to slow to 15. Measured: the
   * camera sailed 6 world units past its mark by t = 280 ms and never came back, holding the
   * projectile at 35-45 %W for the whole flight and then lurching 3 units LEFT on the impact
   * snap to get back to the pose the composition had asked for all along.
   * So the mark is not acquired until the kick has unwound. It costs nothing: the camera is
   * pinned at its floor for those 100 ms anyway, and the shot ripping across a still frame is
   * the lag the composition wants.
   */
  acquireHold: 0.10,        // seconds after release before the screen mark may be acquired
  flightDollyRate: 15.0,    // 1/s. Both dolly moves: the release punch from the drawn frame down
                            // to the traverse, and the arrival push-in onto the target. Raised
                            // from 12 when the punch had only ~150 ms before the arrival ramp
                            // started, and at 12 never actually reached the traverse width — the
                            // visible width bottomed out at 31.6 against a 31.3 resting frame,
                            // i.e. the drag pull-back did not measurably return.
  flightGlideRate: 14.0,    // 1/s. Pan rate BEFORE the camera has acquired the projectile.
  /**
   * RETIRED IN ROUND 8, and kept only as documentation of why. This was the rate of the impact
   * beat, when the beat was an exponential glide. An exponential leaves the gate at
   * `rate × distance` — its fastest frame is the first — so the hit arrived as a step change in
   * camera velocity and the lens spiked at −240 to −326 %frame/s on the samples straddling
   * contact. The beat is now a timed smoothstep over `IMPACT_SNAP` (see there), which starts
   * and ends at zero rate and provably lands, so there is no rate constant left to set.
   */
  settleMargin: 0.12,   // screen margin around the auto-framed subjects (rubric: >= 5 %)
  settleDeadzone: 0.03, // re-aim only when the solved box moves more than this much of vw
  /**
   * Seconds the settle framing may keep re-solving before it is locked outright. The stop
   * must not be conditional on the wreckage going to sleep — see `resolveSettle`.
   */
  settleHoldSec: 2.5,
  /**
   * ══ SHAKE, AND THE THREE NUMBERS THAT KEEP IT PUNCTUATION (ROUND 9) ══════════════════════
   * See the long block on `punch()` for the measurement that forced this round. All three are
   * in %H — screen-relative — so a phone and a desktop get the same amplitude as a fraction of
   * the frame, and the cut below therefore lands on both. In CSS px at 390x660, one unit of
   * `shake` is `shakeMaxPctH * 660` px of horizontal displacement and 0.8 of that vertically.
   *
   * `shakeMaxPctH` 0.024 -> 0.015. The rubric caps peak displacement at 2.5 %H and P1 wants the
   *   launch kick inside a 0.5-2 %H window; at 0.024 the kick sat at 1.0 %H and a collapse could
   *   legally reach 2.2 %H (14.2 px measured). At 0.015 the kick is 0.63 %H — still inside P1's
   *   window, with the window's floor a comfortable 19 % below it — and the hardest reachable
   *   pile-up is `shakeCeil` = 0.83 %H.
   * `shakeDecay` 8.6 -> 12.0 /s. e^(-12*0.20) = 9 %, so the house rumble is under 0.2 %H about
   *   200 ms after its last top-up instead of 350. A collapse fires impacts every 40-80 ms, so
   *   this is the difference between the gaps between hits being audible and not.
   * `shakeCeil` 0.55 is the hard ceiling on accumulation (was an implicit 1.0).
   * `shakeStack` 0.25 is how much of itself a punch QUIETER than the current ring may add.
   */
  shakeMaxPctH: 0.015,  // peak shake displacement (rubric: <= 2.5 %H)
  shakeDecay:  12.0,    // 1/s. e^(-12*0.20) = 9 % -> a 0.8 %H ring is under 0.2 %H in 200 ms
  shakeCeil:   0.55,    // hardest amplitude any pile-up of punches may reach (0.83 %H)
  shakeStack:  0.25,    // a punch under the current ring adds only this much of itself

  /**
   * ══ THE ESTABLISHING MOVE (ROUND 2) ═══════════════════════════════════════════════════════
   * PORTRAIT ONLY, and the "only" is load-bearing twice over. A landscape level already opens
   * with the whole structure in shot at 37 %H — there is nothing to establish, the aim frame IS
   * the establishing frame — and making landscape pan would change the first two seconds of
   * every level on desktop, which is a regression by definition. In portrait the aim frame is now
   * the tight near-field one, so the player would otherwise meet a level without ever having
   * seen what they are shooting at or WHICH SCAM it is.
   *
   * The shape is a CUT to the target, a hold, then one eased travel back to the sling:
   *   · the cut, not a pan in: the level opens on the scam the way a title card does, and a
   *     pan in from nowhere would spend a second on empty sky before saying anything.
   *   · `establishHold` on the target, long enough to read a villain and its prop.
   *   · `establishTravel` back to the aim pose, a single smoothstep — it leaves and arrives at
   *     zero rate, and it provably LANDS (it is a timed interpolation, not a glide), so the aim
   *     framing is exact and identical to the one a scenario that seeks past it measures.
   * Total 1.75 s, which is inside the 2 s every capture already seeks after a level load, so no
   * existing measurement lands mid-move.
   *
   * It is driven from `update(dt)` off the FIXED step, so it is part of the reproducible
   * simulation like everything else here, and `skipEstablish()` (first touch) or any real intent
   * — a draw, a launch, a settle — cancels it on the spot.
   */
  /**
   * ROUND 4 RE-BALANCED THESE, because the move they time changed shape. It used to be a
   * 2.4x pull-back that had something new in frame the whole way; it is now a PAN across ~18
   * world units of empty grass at a constant width, so every millisecond of travel past what
   * the eye needs is a millisecond of nothing. The hold — the half of the move that has the
   * scam in it — takes the time the travel gives up: 0.70 + 0.95 against 0.55 + 1.20.
   */
  establishHold:   0.70,   // seconds held on the target before the camera starts back
  establishTravel: 0.95,   // seconds of the eased travel from the target to the sling
  /**
   * The target pose. The standing structure fills this much of the frame width — 80 %, i.e.
   * 10 %W of air either side, the same margin the landscape establishing reference frame has —
   * with a floor from the tower so a SHORT wide structure (l2: 11.7 × 3.76) is still framed on
   * its width rather than blown up on its height.
   */
  establishFillMax:   0.80,
  establishTowerPctH: 0.42,

  /**
   * ══ PLAYER LOOK ═══════════════════════════════════════════════════════════════════════════
   * Drag anywhere that is not the slingshot's launch bay to pan; wheel to zoom. Before this the
   * camera could not be moved by the player at all — a drag and a wheel moved it 0.00 units —
   * which is survivable while the aim frame holds the whole level and indefensible once it does
   * not. A student who wants to check the target can now simply look at it.
   *
   * It is an OFFSET on the solved composition, never a replacement for it: it is additive, it is
   * clamped by the same `bounds` every other mode is, and it is cleared by every real intent
   * (a draw, a launch, a level load). So no shot is ever fired from an uncomposed frame, and
   * nothing the player does to the camera can persist into the flight framing.
   */
  lookZoomMin: 0.55,    // multiples of the solved aim width
  lookZoomMax: 1.70,
  lookZoomStep: 0.0016, // per wheel delta unit
};

/**
 * A phone is 9:19.5. Fitting the same world WIDTH there needs the camera three times further
 * back, and the old code's answer was to fit a different, much narrower world — which put the
 * target 214 % of the way across the frame, i.e. off screen entirely. The rubric is explicit
 * that this is the wrong trade. So the camera really does go that far back, and the fog and
 * the far plane are made relative to the dolly distance so nothing greys out when it does.
 */
/**
 * Raised from 150 when the arrival width became a solve rather than a constant, and KEPT at 260
 * now that the arrival pushes in rather than out. A phone needs dist ≈ 126 just to hold the
 * ESTABLISHING frame (vw 32.2 at aspect 0.46), and a silent clip against this ceiling does not
 * fail loudly — it quietly hands portrait a different frame from the one the composition asked
 * for. The arrival can no longer exceed the establishing frame (`flightZoomArrivalMax` 0.80), so
 * the headroom is now enormous rather than marginal; it costs nothing, because fog range and the
 * far plane are both relative to `dist` (see `commit`) rather than to this number.
 */
export const MAX_DIST = 260;
const PORTRAIT_ASPECT = 1.15;

/**
 * SNAP TO IMPACT, THEN LET GO. On a real hit the camera stops chasing the ball and holds
 * the frame it arrived with for a beat — that beat is what makes the hit feel like an
 * event rather than a place the ball happened to arrive — and then hands over to the settle
 * framing while the structure is still coming down, so the collapse is the shot you get.
 * Before this, `follow` held on for THREE SECONDS after impact, drifting slowly after a
 * spent ball rolling in the grass. That is the rubric's "camera still moving" fail, and it
 * is also just boring.
 */
/**
 * Seconds the camera holds the pose it arrived with. It used to be 0.34 s of pinning the
 * camera ONTO the contact point, which was both a reframe-after-the-fact and long enough that
 * the collapse had half finished before the settle framing got a look in. Now that the lead has
 * already composed the collision, the beat only has to say "that happened" — so it is shorter,
 * and it hands over to the settle glide while the tower is still coming down.
 */
/**
 * ROUND 6 CHANGED WHAT THIS BEAT IS. It used to be a FREEZE on whatever pose the arrival had
 * already reached — which only made sense because the arrival had reached it 180 ms early. Now
 * the flight is a lead, held wide, that deliberately does NOT arrive: the push-in from the
 * traverse width and the slide onto the subject-anchored pose are the beat, and they run
 * during this window, kicked off by the hit itself. 0.28 s rather than 0.22 so an
 * `impactGlideRate` move is ~92 % complete before the settle framing takes the frame over,
 * and still short enough that the settle owns nearly all of a ~3.5 s collapse.
 */
/**
 * ── ROUND 8 — THE BEAT IS A SWELL, NOT A SNAP, AND IT ARRIVES ─────────────────
 * The beat used to be an exponential glide at `impactGlideRate`, which leaves the gate at its
 * MAXIMUM rate: `rate × distance`. That is where the round-7 critic's "-376 %frame/s in the
 * 170 ms straddling impact" comes from — measured here at −240 to −326 %frame/s across eight
 * shots, always in the first two samples of the beat, with a step change in rate on the frame
 * of the hit. A hit should shove the camera; it should not teleport it.
 *
 * So the beat is now a TIMED SMOOTHSTEP from the pose the camera was in when the hit landed to
 * the arrival pose, over exactly `IMPACT_SNAP`. Three consequences, all of them the point:
 *   · the rate is ZERO on the frame of the hit and zero again when it lands, peaking at
 *     1.5 × mean in the middle — the shape of something with mass being shoved;
 *   · it provably ARRIVES, at the end of the window, instead of asymptotically approaching.
 *     0.28 s existed because an exponential needed the extra time to get to 92 %; a move that
 *     lands exactly can afford to be slower, so the window is 0.40 s and the peak rate falls
 *     by ~40 % for the same push-in depth;
 *   · the settle framing still takes over with ~3.1 s of a ~3.5 s collapse left, and it takes
 *     over from a pose that is exactly the composed one rather than 8 % short of it.
 */
const IMPACT_SNAP = 0.40;      // seconds of the impact push-in beat
const HANDOVER_SPEED = 4.0;    // m/s: below this the projectile has stopped being the story
const HANDOVER_HOLD = 0.18;    // seconds it must stay below it

/** Fallback level extents, used only before a level exists (boot frame). */
const DEFAULT_EXTENT = { slingX: 0, right: 23, left: 15, top: 6.5, cx: 18 };

export class CameraRig {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.cam = camera;
    this.mode = 'sling';
    this.target = null;
    /**
     * A live reference to the composition constants, so a measurement scenario can read the
     * numbers it is checking against instead of hard-coding a second copy of them (and so a
     * P4 sweep can explore the composition space inside ONE capture run rather than editing
     * this file 40 times). It is the same object `COMPOSE` is, not a copy — nothing here
     * changes behaviour, and every flight constant is read per-frame in `followBody`, so a
     * scenario that pokes it sees the effect on the next step.
     */
    this.compose = COMPOSE;

    this.pos = new THREE.Vector3(0, 5, 0);
    this.vel = new THREE.Vector3();
    this.want = this.pos.clone();
    /**
     * VELOCITY FEEDFORWARD. A plain position spring chasing a moving target has a permanent
     * steady-state lag of 2·v/√k — for a 24 m/s projectile that is FOUR METRES, and the shot
     * spends its whole flight drifting toward the edge of frame. Damping the spring against
     * the target's velocity instead of against zero removes that lag entirely while keeping
     * the springy feel for everything else (which has wantVel = 0).
     */
    this.wantVel = new THREE.Vector3();

    this.dist = 30;
    this.distVel = 0;
    this.wantDist = 30;

    this.shake = 0;                 // 0..1, scaled to world units by the current frame height
    this.shakeDecay = COMPOSE.shakeDecay;
    /**
     * The %H that `shake === 1` is worth, exposed so a measurement does not have to hard-code
     * it. `p4-quiet.mjs` and `p4-r4b-quiet.mjs` both carried a literal `* 2.4`, which would
     * have gone on reporting round 8's amplitude for round 9's shake — a passing gate that has
     * quietly stopped measuring the thing it names.
     */
    this.shakePctH = COMPOSE.shakeMaxPctH * 100;

    this.stiffness = 9.0;
    this.damping = 1.0;
    this.followT = 0;

    this.bounds = { minX: -8, maxX: 60, minY: 1.5, maxY: 40 };
    this._extent = null;            // cached level measurement
    this._aim = null;               // cached solved aim framing
    this._settleBox = null;
    this._settleLocked = false;
    this._settleQuiet = 0;
    this._settleT = 0;
    this._tmp = new THREE.Vector3();
    this._tmp2 = new THREE.Vector3();

    // --- handover state: follow -> SNAP TO IMPACT -> settle --------------
    this.lastImpact = new THREE.Vector3(0, 2, 0);
    this._impactHold = 0;     // seconds left on the impact beat
    this._beat = false;       // is the impact beat running? (it glides at its own rate)
    this._holdWant = null;    // the pose the beat lands on
    this._holdDist = 0;
    this._slowT = 0;          // how long the tracked projectile has been crawling
    this._camFloorX = null;   // running max of the camera's own x during a flight: the camera
                             // may pan right and it may open out, but it never pans BACK.
    this._lastWantX = null;   // for the tracking feedforward
    this._lastWantY = null;   // same, on Y: the ground line must not sag while the dolly opens
    this._tracking = false;   // is the camera on the projectile's screen mark THIS step?
    this._acquired = false;   // has it EVER been, this flight? (the velocity seed fires once)
    this._stand = null;       // standing play geometry, cached one solver step (standing())
    this._standBoxes = null;  // its reusable box array — this runs every step, do not allocate
    this._standTime = -1;
    this._lead = null;        // last solveLead() result, exposed for the P4 measurement runs
    this._arrX = null;        // ROUND 5: the arrival anchor, monotone in the direction of travel
    this._vwCap = null;       // running MIN of the flight frame width — a shot only tightens
    this._markFloor = null;   // ROUND 6: the lead ratchet — the projectile's screen mark, which
                              // may rise and may never fall while the shot is in the air
    this._leadSgn = null;     // …and the direction that ratchet is measured in, fixed at release
    this._arrPose = null;     // ROUND 6: the fully-solved arrival pose {x, vw}. The flight is
                              // not allowed to reach it; the impact beat is what lands it.
    this._camStartX = null;   // ROUND 8: where the traverse starts — the camera's own x on the
                              // frame of release, so the move is continuous with the aim framing
    this._leadEndX = null;    // …and where it ends: the pose that puts the ball on
                              // `leadContactMark` at the predicted contact. Monotone.
    this._traverseU = null;   // …and how far along it is, as a fraction of THIS shot's own
                              // predicted flight TIME. Monotone.
    this._flightSpan = null;  // smoothed prediction of this shot's whole flight time, seconds
    this._beatFrom = null;    // ROUND 8: the pose the impact beat interpolates FROM
    this._beatT = 0;          // …and how far into `IMPACT_SNAP` that interpolation is

    // --- ROUND 2: the establishing move (portrait only) -------------------
    this._estT = 0;           // seconds into the establishing move
    this._estA = null;        // the pose it opens on: {x, y, vw}

    /**
     * ROUND 2: the PLAYER's look. An offset on the solved composition — never a replacement for
     * it — cleared by every real intent. `lookX` is world units of pan; `lookZoom` multiplies
     * the solved frame width. Both are zero/one on every frame of every capture unless a
     * scenario drives the pointer, so the determinism gates are untouched by their existence.
     */
    this.lookX = 0;
    this.lookZoom = 1;

    /** The view a live drag maps its pixels through — see `captureDragFrame()`. */
    this._dragFrame = null;

    /**
     * The camera is a pure subscriber (ARCHITECTURE.md). It listens for the one thing it
     * cannot be told any other way: WHERE the shot actually landed. Everything else comes in
     * as an intent call from main.js.
     */
    on('impact', ({ point, hard, approach, a, b }) => {
      // The ground is not a subject. A shot that sails over the level and thumps into the
      // grass at x = 45 must not become the thing the settle camera frames.
      const subject = (e) => e && (e.tag === 'block' || e.tag === 'villain' || e.tag === 'debris');
      if (!point || !(subject(a) || subject(b))) return;
      this.lastImpact.set(point.x, point.y, 0);
      /**
       * A real hit — not a block settling against its neighbour — grabs the camera, and
       * (ROUND 6) it grabs it by PUSHING IN. The flight is a lead: it holds the traverse
       * width and keeps the shot ahead of centre all the way to the tower, which means it
       * deliberately has NOT reached the arrival composition when the hit lands. So the hit
       * is what lands it — the frame tightens from the traverse width onto the subject over
       * `IMPACT_SNAP`, and the camera is shoved forward at roughly twice the pan rate it came
       * in at. That is a beat caused by the collision, not a reframe after the fact: the
       * pose it is heading for was solved from THIS shot's own predicted contact point half a
       * second earlier (`_arrPose`), so nothing about it is discovered late.
       *
       * The old behaviour — freeze the pose we arrived with — is kept as the fallback for a
       * hit with no predicted contact to compose against (a ricochet, a block falling on a
       * villain), because there the arrived pose really is the best information there is.
       */
      const mine = (this.target && (a === this.target || b === this.target));
      if ((hard || mine) && approach >= 4 && this.mode === 'follow' && this._impactHold <= 0) {
        this._impactHold = IMPACT_SNAP;
        const pose = this._arrPose;
        if (pose) {
          const vwA = pose.vw, vhA = vwA / this.cam.aspect;
          /**
           * THE BEAT MAY NOT PAN BACK EITHER. (ROUND 8.) `_camFloorX` is the flight's monotone
           * floor, and the traverse now spends a real part of the arrival move BEFORE the hit —
           * so on a shot that lands deep enough for the traverse to have passed the arrival
           * pose, landing that pose verbatim would be a leftward pan on the frame of impact.
           * Clamping the beat's target to the floor keeps the one promise the whole rig is
           * built on; on l1's canonical hit it is slack by 3.1 units and never binds.
           */
          const sgn = this._leadSgn ?? 1;
          const floor = this._camFloorX;
          const px = floor === null ? pose.x
            : (sgn >= 0 ? Math.max(pose.x, floor) : Math.min(pose.x, floor));
          this._holdWant = new THREE.Vector3(px, (this.groundPct() - 0.5) * vhA, 0);
          this.setView(vwA, vhA);
          this._vwCap = vwA;
          this._holdDist = this.wantDist;
        } else {
          this._holdWant = this.want.clone();
          this._holdDist = this.wantDist;
        }
        /**
         * The pose the beat STARTS from, captured on the frame of the hit, because the beat is
         * a timed interpolation rather than a rate: see IMPACT_SNAP.
         */
        this._beatFrom = { x: this.pos.x, y: this.pos.y, dist: this.dist };
        this._beatT = 0;
      }
    });
    on('break', ({ point }) => { if (point) this.lastImpact.set(point.x, point.y, 0); });

    this.focusSling(true);
  }

  // -------------------------------------------------------------------------
  // COMPOSITION SOLVER
  // -------------------------------------------------------------------------

  /**
   * Measure the level once: how far right the furthest thing worth shooting at is, and how
   * tall the tallest thing is. Read off the authored JSON, not off live bodies, so the
   * framing cannot drift as the structure falls over.
   */
  measureLevel() {
    const L = world.level;
    if (!L) return DEFAULT_EXTENT;
    const slingX = world.sling?.anchor?.x ?? 0;
    let right = -Infinity, left = Infinity, top = 0;
    for (const b of L.blocks) {
      // Rotation counts. A 0.4 x 2.6 column laid at 45 deg is 2.12 wide and 2.12 tall, not
      // 0.4 x 2.6 — and `top` feeds the sky rule, which is what decides how far back the
      // camera stands. l1 has no rotated blocks so this is invisible today; the first level
      // that leans a plank would silently lose its sky margin without it.
      const rot = b.rot || 0;
      const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
      const hw = (b.w * c + b.h * s) / 2, hh = (b.w * s + b.h * c) / 2;
      right = Math.max(right, b.x + hw);
      left = Math.min(left, b.x - hw);
      top = Math.max(top, b.y + hh);
    }
    for (const v of L.villains) {
      const r = 0.6;
      right = Math.max(right, v.x + r);
      left = Math.min(left, v.x - r);
      top = Math.max(top, v.y + r);
    }
    if (!Number.isFinite(right)) return DEFAULT_EXTENT;
    return { slingX, right, left, top, cx: (left + right) / 2 };
  }

  /** Where the play-plane ground line sits, as a fraction of frame height. */
  groundPct() {
    return this.cam.aspect < PORTRAIT_ASPECT ? COMPOSE.groundPctH_portrait : COMPOSE.groundPctH;
  }

  /**
   * Where the sling's anchor sits, as a fraction of frame width from the left. Constant in
   * landscape; in portrait it is derived from the DRAW, because the frame there is narrower
   * than the band's travel — see `COMPOSE.drawClearance`.
   */
  slingPct(vw) {
    if (this.cam.aspect >= PORTRAIT_ASPECT) return COMPOSE.slingPctW;
    /**
     * ROUND 3: no lower clamp. `slingPctW` (13 %) as a FLOOR quietly moved the frame's left edge
     * further back than the draw needs on any level whose solve came out wider than 28.8 units,
     * and since the width is fixed the whole of that came off the RIGHT edge — l2 lost 0.16 of
     * its 0.25 units of far-edge air to it. The mark is the draw and nothing else; the ceiling
     * stays, so a level cannot push the sling so far right that the launch has nowhere to go.
     */
    return Math.min(COMPOSE.drawClearance / vw, COMPOSE.slingPctWMaxPortrait);
  }

  /** Solve the aim framing from the level extents + the composition constants. */
  /**
   * THE STRIKE POSE — the portrait frame the level OPENS on, and the width floor the bay pose
   * is solved against. Round 4 also made it the pose the DRAW travelled to; round 9 removed that
   * (see `drawing()`) because it cost the player sight of the band and the release undid it
   * 60 ms later. The flight and the impact are framed from `flightVw`, not from here.
   *
   * Solved from the structure alone: its own height sets the width it can be read at, its own
   * width sets the bounds that solve is clamped into, and its far edge is placed on
   * `strikeFarPctW` so the lead-in space falls on the side the ball comes from. Nothing about
   * the sling, the draw or the 19 units of grass between them appears in it — that is the whole
   * point of the round. See the `strikeTowerPctH` block in COMPOSE for the measured numbers.
   */
  strikeFrame(e) {
    const C = COMPOSE;
    const aspect = this.cam.aspect;
    const structW = Math.max(0.5, e.right - e.left);
    const want = Math.max(e.top, 0.5) * aspect / C.strikeTowerPctH;
    let vw = clamp(want, structW / C.strikeFillMax, structW / C.strikeFillMin);

    /**
     * ── TWO FLOORS THE FILL RULE IS NOT ALLOWED TO UNDERCUT ──────────────────────────────
     *
     * The fill rule above sizes the strike frame from the structure's WIDTH, and the levels it
     * was tuned against were short and wide — the docblock at `strikeTowerPctH` still describes
     * l2 as "3.76 units tall against a structure 11.72 wide". The rebuilt levels are the other
     * way round: l2 is 9.0 tall and 7.9 wide. So `want` (which fits the height) was being
     * clamped DOWN to `structW / strikeFillMin` and the height rule lost every time.
     *
     * Measured on l2 in landscape before this fix: vw 9.88, so vh 5.56, of which 0.775 sits
     * above the ground line — 4.31 units of headroom for a 9.0-unit tower. More than half the
     * structure was cropped off the top of the impact frame, and the slingshot was far outside
     * it, which is exactly the "zoomed too deep, top cut off, can't tell where anything is"
     * the player reported.
     *
     *   1. THE TOWER MUST FIT. It may use at most `strikeTowerFitPct` of the height above the
     *      ground line. Tighter than the aim frame's sky rule on purpose — this is the action
     *      pose and it is allowed to be closer — but it can no longer crop.
     *   2. THE SLINGSHOT MUST STAY IN SIGHT. A frame that drops the sling leaves the player
     *      with nothing to orient against at the moment the most is happening. The floor is a
     *      fraction of the full sling-to-target span rather than the whole span, so impact
     *      still pushes in slightly instead of being a pure cut to the aim frame.
     */
    const minVhFit = Math.max(e.top, 0.5) / (this.groundPct() * C.strikeTowerFitPct);
    if (vw / aspect < minVhFit) vw = minVhFit * aspect;

    const span = (e.right + C.aimFarMarginPortrait) - (e.slingX - C.drawClearance);
    vw = Math.max(vw, span * C.strikeSpanPctMin);

    vw = clamp(vw, C.minVwPortrait, C.maxVwPortrait);
    const cx = e.right + C.aimFarMarginPortrait - C.strikeFarPctW * vw + vw / 2;
    return { vw, cx };
  }

  solveAim() {
    const e = this._extent ?? (this._extent = this.measureLevel());
    const C = COMPOSE;
    const aspect = this.cam.aspect;
    let vw, vh;
    let strike = null;
    if (aspect < PORTRAIT_ASPECT) {
      /**
       * ── PORTRAIT — THE BAY POSE (ROUND 4) ────────────────────────────────────────────────
       * Round 3 solved this as `right + margin − (slingX − drawClearance)`: one frame holding
       * the band and the whole structure, 28.7 units wide, 48.6 units tall, 15.5 %H of tower.
       * Round 4 keeps only its LEFT mark and takes the width from the strike pose instead:
       *
       *   backX  `slingX − drawClearance` — the deepest the loaded ammo can travel on the
       *          flattest legal full pull, so the band, the pouch and the ball are inside the
       *          frame at every draw the camera is still here for, and it never has to open to
       *          catch up with them. It survives as `slingPct(vw)`, which derives the anchor's
       *          mark from that clearance rather than from a landscape percentage.
       *
       * The far mark is gone, because the far end of the level is no longer this frame's job.
       * The frame is the strike frame's width parked over the launch bay, so the pan between
       * them changes nothing but WHERE the camera is looking.
       */
      strike = this.strikeFrame(e);
      /**
       * ── ROUND 5: THE BAY POSE MUST ALSO HOLD THE TARGET ──────────────────────────────────
       * Round 4's bay pose deliberately dropped the far mark — the far end of the level was
       * "no longer this frame's job", because a pan would go and get it. That was sound when
       * the structures were ~7 units tall and holding both meant a 49-unit frame carrying 7
       * units of content. It stopped being sound the moment the levels were rescaled: the
       * owner's words on a real phone were "how not to see what you are about to hit".
       *
       * The structures are now ~21 units tall, which changes the arithmetic that forced the
       * split in the first place. A frame from the draw-back mark to just past the structure
       * is ~37 units wide and ~62 tall, and a 22-unit tower fills ~35 %H of it — inside target,
       * where round 3's 7-unit tower could only manage 15 %H in the same shape.
       *
       * So the far mark comes back, as a FLOOR rather than a replacement: take the strike
       * width when it is already generous enough, otherwise open up far enough to hold the
       * target. Tall levels make this affordable; short ones fall back to the strike width.
       */
      const backX = e.slingX - C.drawClearance;
      const needBoth = (e.right + C.aimFarMarginPortrait) - backX;
      vw = Math.min(Math.max(strike.vw, needBoth), C.maxVwPortrait);
      vh = vw / aspect;
    } else {
      const span = Math.max(4, e.right - e.slingX);
      // width that puts the sling and the furthest target on their marks …
      vw = span / (C.targetPctW - C.slingPctW);
      vh = vw / aspect;
      // … then the sky rule, which can only ever pull further back.
      const minVh = e.top / (this.groundPct() - C.skyMinPctH);
      if (vh < minVh) { vh = minVh; vw = vh * aspect; }
      /**
       * ── THE SKY RULE MUST NOT STRAND THE LEVEL IN AN EMPTY FIELD ─────────────────────────
       * The sky rule asks for >= skyMinPctH of frame height above the tower. In LANDSCAPE,
       * height drags width with it, so on a compact level it blows the frame far past anything
       * the level occupies. Measured after the levels were rebuilt to l3's proportions: a level
       * spanning 14.8 units was being framed at 43.2 — the sling and the structure huddled on
       * the left with ~28 units of empty grass to the right. The owner's words, with a
       * screenshot: "see how close the structure is to the sling and soo much space on the
       * right."
       *
       * The rule itself is sound; it was simply tuned against 7-unit towers on 33-unit levels
       * and both halves of that changed. So cap it: the sky may grow the frame, but never so far
       * that the furthest target falls inside `targetPctWMin` of the width. Sky yields to the
       * level, not the other way round.
       */
      const vwCap = span / C.targetPctWMin;
      if (vw > vwCap) { vw = vwCap; vh = vw / aspect; }

      /**
       * ...BUT THE CAP MAY NEVER CROP THE LEVEL, and on a phone held sideways it was doing
       * exactly that. `vwCap` trims the WIDTH, and in landscape height follows width, so the
       * wider the screen the shorter the frame gets: measured on l2 at a phone's 844x390
       * (aspect 2.164) the cap left vh 10.9, of which 0.775 is above the ground line — 8.45
       * units of headroom for a 9.0-unit tower, and the top storey and the villain standing on
       * it were sliced off by the top edge before the player had even fired.
       *
       * So the fit floor is re-asserted AFTER the cap rather than before it. `aimTowerFitPct`
       * is looser than the strike pose's (this frame also has to hold the sling and a lot of
       * approach), and it binds only where the aspect is extreme: on desktop 1.778 it asks for
       * 22.9 against a frame already at 23.6 and changes nothing, and in portrait it is inert
       * by a mile. Phone landscape is the only place it does any work, which is the point.
       */
      const minVhFit = Math.max(e.top, 0.5) / (this.groundPct() * C.aimTowerFitPct);
      if (vh < minVhFit) { vh = minVhFit; vw = vh * aspect; }
    }
    /**
     * ── THE AIM FRAME AND THE FLIGHT FRAME ARE ANSWERING DIFFERENT QUESTIONS (ROUND 3) ──────
     * They were one number until round 3, and widening the aim frame to hold the whole
     * structure quietly widened the flight with it: `flightZoomTraverse`, the arrival clamp and
     * the settle floor are all multiples of it, so l1's impact frame went 16.60 -> 18.66 and the
     * struck tower 26.02 -> 23.16 %H. That is protected ground and the owner had already called
     * it good, so the coupling — not the impact framing — is the thing that was wrong.
     *
     * THE AIM FRAME has to hold a CONTROL: the sling, the band and the ball, on the far side of
     * 19 units of empty grass, because the player is about to use them.
     * THE FLIGHT FRAME has to hold a SUBJECT: the projectile and the structure it is heading
     * for. The sling has been used by then and the shot is already past it.
     *
     * So portrait now solves both. `flightVw` is the near-edge solve the flight, the arrival and
     * the settle were tuned against — the tightest frame that shows the target's near edge with
     * the band's clearance behind it — and it is capped at the aim frame so the flight can never
     * be WIDER than the frame the shot was aimed from. Landscape keeps one number for both,
     * because there the aim frame already holds the level and the two questions have one answer.
     *
     * Both frames share a left edge (`slingX − drawClearance`), which is why the release seed,
     * `_camFloorX`'s fallback and the pan bounds all read the same under either.
     */
    /**
     * ROUND 4 CLOSES THAT SPLIT AGAIN, FROM THE OTHER END. The paragraph above is describing a
     * flight frame that had to be NARROWER than a 28.7-unit aim frame to be worth watching. The
     * aim frame is now 11.7 units and is already the answer to the flight's question, so
     * portrait has one width for the whole shot: aim, draw, traverse, arrival, impact. Nothing
     * downstream has to be re-tuned for a second number, and — the point of the round — the
     * frame the collapse is seen in is exactly the frame the shot was aimed from.
     */
    let flightVw = vw;
    const flightVh = flightVw / aspect;
    const cy = (this.groundPct() - 0.5) * vh;
    const cx = e.slingX - this.slingPct(vw) * vw + vw / 2;
    /**
     * Pan bounds, derived not guessed. A shot that sails clean over the level used to drag
     * the camera out to x = 38 chasing it, leaving the structure at -13 %W — off the left of
     * the frame, with nothing to look at but grass.
     *
     * The left bound is an EDGE rule, not a centre rule. The old `cx - vw*0.06` said "the
     * camera centre never goes left of the aim centre", which also forbade the launch push-in:
     * the flight frame is 12 % narrower, so holding its LEFT EDGE still while it narrows means
     * the centre must travel left. That clamp is why the projectile could never reach its
     * screen mark and stayed pinned at ~51 %W for the whole flight. This is only the outer
     * backstop for a wild shot — the per-frame "never pan back" rule lives on `_camFloorX`.
     */
    const drawnLeftEdge = cx - vw * 0.5 * this.pullBackGrow(vw);
    // …and the backstop is measured with the FLIGHT frame's half-width, not the aim frame's:
    // the bound exists to stop a wild shot dragging the camera, and the camera that gets
    // dragged is the flight one. Reading `vw` here would park the floor at the aim CENTRE in
    // portrait (4.4 units right of where a narrower flight frame legitimately sits) and clamp
    // the traverse before it began.
    this.bounds.minX = drawnLeftEdge + flightVw * COMPOSE.flightZoomTraverse * 0.5;
    this.bounds.maxX = e.right + vw * 0.10;
    this.bounds.minY = 0.5;
    /**
     * THE CEILING ON HOW HIGH THE CAMERA MAY CLIMB. Was `cy + vh * 0.9` — 15.6 world units on
     * l2, i.e. not a ceiling at all, which is why every attempt to tame the climb through
     * `followLiftMax` did nothing: that clamp was never the binding one.
     *
     * The rule this encodes is the player's: "it should keep the structure in view, the fun is
     * seeing the structure break down". The tower is the subject; the ball is how you address
     * it. So the rig may rise a little to keep a steep arc readable and no further, and a shot
     * that climbs past that simply leaves the top of the frame for a moment — which is the
     * right trade, because the thing worth watching is where it lands.
     */
    this.bounds.maxY = cy + vh * C.camRiseMaxPctH;
    /**
     * In portrait `flightVw === vw` and the drawn left edge IS `cx − vw/2`, so `bounds.minX`
     * lands exactly on the bay pose's own centre — the leftmost pose the composition has, and
     * therefore the correct floor. The strike pose sits well inside `maxX`. Both are asserted
     * here rather than assumed, because a bound that quietly clamps the pose it is supposed to
     * permit is the failure mode this file has hit twice (round 1's `minVwPortrait`, round 2's
     * left-bound clamp on the launch push-in) and it never fails loudly.
     */
    if (strike) {
      this.bounds.minX = Math.min(this.bounds.minX, cx);
      this.bounds.maxX = Math.max(this.bounds.maxX, strike.cx);
      return { vw, vh, cx, cy, flightVw, flightVh, strikeVw: strike.vw, strikeCx: strike.cx };
    }
    return { vw, vh, cx, cy, flightVw, flightVh, strikeVw: vw, strikeCx: cx };
  }

  /**
   * Every box still standing on the play plane, with its TRUE half-extents, plus the bounding
   * span of the lot. Cached per solver step — `world.simTime` advances exactly one step at a
   * time, including inside SS.seek(), so this is one rebuild per step and it stays
   * deterministic. Debris is deliberately excluded: wreckage is not the target structure.
   */
  standing() {
    if (this._standTime === world.simTime && this._stand) return this._stand;
    const boxes = this._standBoxes || (this._standBoxes = []);
    boxes.length = 0;
    let left = Infinity, right = -Infinity;
    for (const b of world.blocks) {
      if (b.dead) continue;
      const t = b.body.translation(), r = b.body.rotation();
      // z-rotation only (the plane lock guarantees it), so the AABB half-extents are exact
      const ang = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      boxes.push({ x: t.x, y: t.y, hw: (b.w * c + b.h * s) / 2, hh: (b.w * s + b.h * c) / 2 });
      left = Math.min(left, t.x - boxes[boxes.length - 1].hw);
      right = Math.max(right, t.x + boxes[boxes.length - 1].hw);
    }
    for (const v of world.villains) {
      if (!v.alive) continue;
      const t = v.body.translation();
      boxes.push({ x: t.x, y: t.y, hw: 0.6, hh: 0.6 });
      left = Math.min(left, t.x - 0.6); right = Math.max(right, t.x + 0.6);
    }
    this._standTime = world.simTime;
    this._stand = boxes.length ? { boxes, left, right, midX: (left + right) / 2 } : null;
    return this._stand;
  }

  /**
   * WHERE THIS SHOT IS GOING TO LAND — the whole reason the arrival framing can be solved at
   * all. The composition needs `d = structMidX − contactX` a good half-second BEFORE contact,
   * because a dolly that only learns d when the ball is 40 ms out cannot travel; measured, the
   * live-d version reached barely a third of the width it had asked for. Ballistics are cheap
   * and exact, so the camera simply integrates the projectile's own arc forward — same gravity,
   * same linear damping, the semi-implicit Euler the solver itself uses — and returns the world
   * x of the first standing box the swept ball enters.
   *
   * Deliberately NOT a full physics query: no restitution, no other projectile, no debris. It
   * answers one question ("what is this shot about to hit") and is allowed to be wrong about
   * everything after the first contact, because the camera freezes its pose at the impact anyway
   * (`_impactHold`). Returns null for a shot that lands in the grass or sails off the level —
   * there is nothing to compose against, and the framing falls back to the constant.
   *
   * ROUND 8 also takes the TIME the same integration takes to get there. The traverse is keyed
   * to the fraction of the flight that has elapsed, and time is the axis the kick does not
   * distort: `SLING.kick` covers 38 % of l1's run inside the first 100 ms, so a ramp keyed to
   * distance spends a third of the pan while the ball is still doing 50 m/s.
   */
  predictContact(px, py, vx, vy) {
    const st = this.standing();
    if (!st) return null;
    const r = this.target?.radius ?? 0.4;
    const damp = this.target?.body?.linearDamping?.() ?? 0.055;
    const h = 1 / 60;
    const decay = 1 / (1 + damp * h);
    let x = px, y = py, ux = vx, uy = vy;
    for (let i = 0; i < 240; i++) {
      uy += GRAVITY_Y * h;
      ux *= decay; uy *= decay;
      x += ux * h; y += uy * h;
      if (y < r) return null;                       // it lands in the grass, not on the level
      if (x > st.right + 4 || x < st.left - 40) return null;
      if (x + r < st.left || x - r > st.right) continue;
      for (let k = 0; k < st.boxes.length; k++) {
        const b = st.boxes[k];
        if (x + r < b.x - b.hw || x - r > b.x + b.hw) continue;
        if (y + r < b.y - b.hh || y - r > b.y + b.hh) continue;
        return { x, t: (i + 1) * h };
      }
    }
    return null;
  }

  /** Back-compat shim: the x alone, for probes that only ask where. */
  predictContactX(px, py, vx, vy) {
    const c = this.predictContact(px, py, vx, vy);
    return c === null ? null : c.x;
  }

  /**
   * THE ARRIVAL COMPOSITION, SOLVED — AS A PUSH-IN. Given where the shot will land, return the
   * frame width (as a multiple of the establishing frame) that makes the struck structure the
   * biggest and clearest it has been all shot, without cutting it off.
   *
   *      vwFit  = (subject's longer half-span) / (edgePctW − arrivalStructPctW)
   *      vwFill = (span of the standing structure) / arrivalFillMax
   *      vw     = clamp( max(vwFit, vwFill), zoomMin·vw_aim, zoomMax·vw_aim )
   *
   * ROUND 5 restated the FIT rule. It used to be measured out from the PROJECTILE's screen
   * mark, because the projectile owned the frame's X: `(standRight − contactX) / (edgePctW −
   * 55.5 %W)`. The arrival is now composed on the SUBJECT (see the ROUND 5 block on COMPOSE),
   * so the question "does it fit" is asked about the subject's own centre. On l1 the fit rule
   * is consequently slack (it asks for span/0.89) and `vwFill` sets the width, which is the
   * right hierarchy: at an arrival this tight, legibility is the binding constraint, not
   * geometry.
   *
   * `d = standMid − contactX` is still reported — the mark solve in `followBody` consumes it,
   * and the P4 measurement scenarios read it off `rig._lead` — but it sets neither the width
   * nor, now, the anchor.
   */
  solveLead(px, py, vx, vy) {
    const C = COMPOSE;
    const a = this.aimFraming();
    const st = this.standing();
    const miss = { zoom: C.flightZoomArrival, d: null, contactX: null, contactT: null, focusX: null };
    if (!st) return miss;
    const hit = this.predictContact(px, py, vx, vy);
    if (hit === null) return miss;
    const contactX = hit.x;
    /**
     * ROUND 6 — WHAT THE ARRIVAL IS COMPOSED ON. `st.midX` alone is the centre of the bounding
     * box of everything standing, and on l1 that is x = 19.95: the GAP between the tower and
     * the outpost. Centring it put the collision itself at 37 %W and the camera dead centre on
     * nothing. The anchor is the event and the subject together.
     */
    const focusX = st.midX + (contactX - st.midX) * C.arrivalEventBias;
    // 1. the subject has to FIT: with the anchor on `arrivalStructPctW`, neither end of what is
    //    still standing may be cut off, with `arrivalEdgePctW` of the frame left over.
    const half = Math.max(st.right - focusX, focusX - st.left);
    const vwFit = half / Math.max(0.05, C.arrivalEdgePctW - C.arrivalStructPctW);
    // 2. …and it has to READ: it never fills more than `arrivalFillMax` of the frame width,
    //    which is what stops a hit on the far end of a level diving into one plank. The limit is
    //    ASPECT-DEPENDENT (see `arrivalFillMaxPortrait`): 47 %W of a 16:9 frame is a structure
    //    37 %H tall, and 47 %W of a 9:19.5 frame is the same structure at 22 %H.
    const fill = this.cam.aspect < PORTRAIT_ASPECT ? C.arrivalFillMaxPortrait : C.arrivalFillMax;
    const vwFill = (st.right - st.left) / fill;
    const need = Math.max(vwFit, vwFill);
    const zoomMax = this.cam.aspect < PORTRAIT_ASPECT
      ? C.flightZoomArrivalMaxPortrait : C.flightZoomArrivalMax;
    return {
      zoom: clamp(need / a.flightVw, C.flightZoomArrivalMin, zoomMax),
      d: st.midX - contactX, contactX, contactT: hit.t, focusX,
    };
  }

  /** The solved aim framing for the current aspect (cached until the screen shape changes). */
  aimFraming() {
    if (!this._aim) this._aim = this.solveAim();
    return this._aim;
  }

  /**
   * THE DRAW PULL-BACK, as a multiplier on the aim frame width. Landscape is the rubric's flat
   * 13.5 % and nothing about it moves.
   *
   * PORTRAIT RETURNS 1.0 AND CANNOT RETURN MORE — see `COMPOSE.drawPushInMaxPortrait`. Growth
   * here would shrink the target at the moment the player is aiming at it, which is round 3's
   * headline defect. The portrait draw's only freedom is to close (in `drawing()`), so this is
   * the CEILING on the drawn frame rather than the drawn frame itself, and every caller that
   * needs "how wide can the frame get while drawing" — `solveAim`'s pan bounds included — gets
   * the right answer from it unchanged.
   *
   * Takes vw rather than reading the cache, because `solveAim` needs it mid-solve.
   */
  pullBackGrow(vw) {                                        // eslint-disable-line no-unused-vars
    return this.cam.aspect >= PORTRAIT_ASPECT ? 1 + COMPOSE.drawPullBack : 1;
  }

  /**
   * THE PORTRAIT DRAW PUSH-IN, as a multiplier on the aim frame width (<= 1, never above).
   *
   * The aim frame reserves `drawClearance` behind the anchor because that is where the ball
   * ends up on the flattest legal full pull. Almost no real draw is that: at 30 deg and full
   * power the ball's left edge is 0.8 units short of the reserve, at 45 deg 1.4 units short.
   * That shortfall is dead frame, and because the far edge is PINNED, spending it is a move
   * toward the target — the frame closes on the structure while the band comes out.
   *
   * Solved from the LIVE pouch, so it is exact rather than a curve: `need` is where the frame's
   * left edge has to be for the drawn ball to stay fully inside it, and the frame closes to
   * that, capped. Returns 1 when the sling is not drawn or is drawn flat and full.
   */
  drawPushIn() {
    if (this.cam.aspect >= PORTRAIT_ASPECT) return 1;
    const a = this._aim ?? (this._aim = this.solveAim());
    const e = this._extent ?? (this._extent = this.measureLevel());
    const s = world.sling;
    if (!s) return 1;
    const backX = e.slingX - COMPOSE.drawClearance;             // the frame's left edge at aim
    const frontX = backX + a.vw;                                // …pinned; only the left moves
    // The band's own left extent: the drawn ball, or the fork itself when the band is slack.
    const need = Math.min(e.slingX - COMPOSE.slingLeftHalf,
                          s.pouch.x - COMPOSE.ammoVisualHalf - COMPOSE.drawEdgeMargin);
    return clamp((frontX - need) / a.vw, 1 - COMPOSE.drawPushInMaxPortrait, 1);
  }

  /**
   * THE POSE THE LEVEL OPENS ON — the target, framed so the scam is readable. The standing
   * structure fills `establishFillMax` of the frame width, with a floor from the tower so a
   * short wide structure is framed on its width rather than blown up on its height. Returns null
   * when there is nothing to establish on (no level, or nothing standing).
   */
  establishPose() {
    const e = this._extent ?? (this._extent = this.measureLevel());
    const span = e.right - e.left;
    if (!(span > 0)) return null;
    const C = COMPOSE;
    const a = this.aimFraming();
    /**
     * ROUND 4: the level OPENS ON THE STRIKE POSE, exactly — the same frame the shot will be
     * decided, flown and landed in. It used to open on a separate `establishFillMax` solve and
     * then spend 1.3 s pulling back 2.4x to a frame the slingshot could fit into, which is a
     * long way to travel to make the tower smaller. The establish move is a travel from the
     * target to the launch bay — the player is shown the trip they are about to make, in the
     * direction they will make it.
     *
     * ROUND 9 NOTE: it is no longer the exact reverse of the draw, because the draw no longer
     * moves (see `drawing()`). The move it previews is the SHOT's — `follow()`'s traverse runs
     * bay→contact, which is the same direction at the same scale. Round 5 having widened the bay
     * pose past the strike width, this is a small zoom as well as a pan; that was already true
     * before round 9 and is unchanged by it.
     */
    if (this.cam.aspect < PORTRAIT_ASPECT) {
      const s = this.strikeFrame(e);
      return { x: s.cx, y: (this.groundPct() - 0.5) * (s.vw / this.cam.aspect), vw: s.vw };
    }
    const vw = Math.min(a.vw, Math.max(span / C.establishFillMax,
                                       Math.max(e.top, 0.5) / C.establishTowerPctH * this.cam.aspect));
    const vh = vw / this.cam.aspect;
    return { x: (e.left + e.right) / 2, y: (this.groundPct() - 0.5) * vh, vw };
  }

  /**
   * Invalidate the cached framing — after a level load or a resize.
   *
   * `_fresh` is how the rig tells those two apart, and it has to, because only one of them is a
   * new level to establish on. A LEVEL LOAD is `remeasure()` immediately followed by
   * `focusSling(true)` (main.js), and nothing else in the codebase makes that pair: `onResize()`
   * remeasures and then calls `focusSling()` with no snap, and `unlock()` snaps without
   * remeasuring. Keying on `world.level` having changed does NOT work and was tried —
   * `loadLevelData` caches its parsed JSON, so reloading the same level hands back the identical
   * object and the establish silently never fired (measured: `_estT` frozen at 1.758 from the
   * boot load, through five reloads).
   */
  remeasure() { this._extent = null; this._aim = null; this._fresh = true; }

  // -------------------------------------------------------------------------
  // INTENTS
  // -------------------------------------------------------------------------

  /** Idle framing: sling on its mark, the whole target read visible, sky above it. */
  focusSling(snap = false) {
    /**
     * ── THE ESTABLISHING MOVE OWNS THE FIRST 1.75 s OF A PORTRAIT LEVEL (ROUND 2) ──────────
     * Two guards, and both are about who gets to interrupt it.
     *
     * `snap` is how a LEVEL LOAD arrives here (main.js: `remeasure(); focusSling(true)`), and it
     * is also how `unlock()` arrives — so the establish is keyed to the level object actually
     * having changed rather than to the flag, which is the only fact that distinguishes the two.
     *
     * The no-snap guard matters just as much and is much easier to miss: the phase machine calls
     * `focusSling()` the moment the freshly built level goes quiet, ~0.2-0.5 s after the load.
     * Without this the establish would be cancelled by the game's own settle before the player
     * ever saw it. A non-snapping focusSling during the move is therefore a no-op — which is
     * safe because the move ENDS on exactly the pose this function would have set.
     */
    const fresh = this._fresh;
    this._fresh = false;
    if (snap && fresh && world.level && this.cam.aspect < PORTRAIT_ASPECT
        && this.establish()) return;
    if (this.mode === 'establish' && !snap) return;
    this.mode = 'sling'; this.target = null;
    this.lookX = 0; this.lookZoom = 1;
    const a = this.aimFraming();
    this.want.set(a.cx, a.cy, 0);
    this.setView(a.vw, a.vh);
    if (snap) this.snap();
  }

  /**
   * OPEN ON THE TARGET, THEN TRAVEL BACK TO THE SLING. See the ESTABLISHING MOVE block on
   * COMPOSE for the shape and for why it is portrait-only. Returns false — changing nothing —
   * when there is no pose to open on, so the caller can fall through to the ordinary framing.
   */
  establish() {
    const pose = this.establishPose();
    if (!pose) return false;
    this.mode = 'establish';
    this.target = null;
    this.lookX = 0; this.lookZoom = 1;
    this._estA = pose;
    this._estT = 0;
    this.want.set(pose.x, pose.y, 0);
    this.setView(pose.vw, pose.vw / this.cam.aspect);
    this.snap();                 // a CUT to the target, not a pan in from nowhere
    return true;
  }

  /**
   * FIRST TOUCH SKIPS IT. Not a snap: the camera glides the rest of the way to the aim pose at
   * the ordinary non-tracking rate, because a player who taps during the hold has asked to get
   * on with it, not to be teleported. A no-op in every other mode, so the caller (main.js's
   * pointerdown) can call it unconditionally.
   */
  skipEstablish() {
    if (this.mode !== 'establish') return { ok: false, reason: 'not establishing' };
    this.mode = 'sling';
    const a = this.aimFraming();
    this.want.set(a.cx, a.cy, 0);
    this.setView(a.vw, a.vh);
    return { ok: true };
  }

  /**
   * THE PLAYER'S LOOK — pan by a screen-pixel delta, converted through the live frame so it
   * tracks the finger one-to-one at every zoom. Clamped by the same `bounds` every other mode
   * is, so it cannot wander off the level, and it cancels the establishing move (a drag is an
   * intent at least as explicit as a tap).
   */
  lookBy(dxPx, dyPx = 0) {
    if (this.mode === 'establish') this.skipEstablish();
    const el = world.renderer?.domElement;
    const w = el?.clientWidth || 1;
    const a = this.aimFraming();
    const vw = a.vw * this.lookZoom;
    this.lookX = clamp(this.lookX - dxPx / w * vw,
                       this.bounds.minX - a.cx, this.bounds.maxX - a.cx);
    return { ok: true, lookX: +this.lookX.toFixed(4), lookZoom: +this.lookZoom.toFixed(4) };
  }

  /** …and zoom. `delta` is a wheel delta; positive zooms out, matching every map on earth. */
  lookZoomBy(delta) {
    return this.lookZoomMul(1 + delta * COMPOSE.lookZoomStep);
  }

  /**
   * ZOOM BY A RATIO — the pinch path, and what `lookZoomBy` is now written on top of.
   *
   * ── ROUND 3: A PHONE HAS NO WHEEL, WHICH IS WHERE THE ZOOM WAS ────────────────────────
   * `lookZoomBy` takes a WHEEL delta, so on the device this game is played on the look could
   * pan but never zoom. That mattered little while the portrait aim frame was tight; it
   * matters a great deal now that the aim frame is the shot frame and has to hold 19 units of
   * empty grass between the band and the first block. `lookZoomMin` 0.55 takes l1's 28.7-unit
   * frame to 15.8 units — the tower at 27.4 %H — so two fingers put a student at a size the
   * static frame provably cannot give them while the sling is on screen.
   *
   * A ratio rather than a delta because a pinch IS a ratio: `newSpan / oldSpan` composes
   * correctly across a stream of pointermove events at any frame rate, where a per-event delta
   * does not.
   */
  lookZoomMul(factor) {
    if (this.mode === 'establish') this.skipEstablish();
    if (!Number.isFinite(factor) || factor <= 0) {
      return { ok: false, reason: `lookZoomMul: bad factor ${factor}` };
    }
    this.lookZoom = clamp(this.lookZoom * factor, COMPOSE.lookZoomMin, COMPOSE.lookZoomMax);
    return { ok: true, lookX: +this.lookX.toFixed(4), lookZoom: +this.lookZoom.toFixed(4) };
  }

  /** Hand the camera back. Called by every real intent; exposed for a test to assert on. */
  resetLook() { this.lookX = 0; this.lookZoom = 1; return { ok: true }; }

  /**
   * ══ THE DRAG'S FRAME OF REFERENCE, FROZEN AT THE GRAB (ROUND 4) ═════════════════════════
   *
   * `Slingshot.setPouch()` takes a WORLD point, and `screenToWorld()` derives that point from
   * the live camera. That is correct exactly while the camera is still — and round 4's draw
   * moves the camera 17-19 world units downrange while the finger is down. Left alone, a
   * MOTIONLESS finger would map to a world point sliding right with the pan, the pouch would be
   * dragged forward into the fork, the rear-hemisphere clamp would fold it onto its boundary,
   * and the draw would collapse to nothing halfway through every shot. The camera move would
   * have silently eaten the control it was supposed to be serving.
   *
   * So a drag maps through the frame it BEGAN in. The finger's screen position keeps meaning
   * the world point it meant when the player took hold, for as long as they hold it, whatever
   * the camera does — which is also what a hand expects, since the hand is not moving.
   *
   * IT IS THE SAME RULE ON BOTH INPUT PATHS, and that is load-bearing. `capture.mjs`'s `aimPx`
   * projects the pouch with the LIVE camera and hands the pixel to `SS.dragTo()`; if the hook
   * path mapped through a frame the harness could not see, every scripted drag would land on a
   * different shot from the one it asked for and would still report `ok: true` — the exact
   * class of silent failure that cost this project four scenarios between P1 and P4. The frame
   * is therefore re-captured by `aim()` as well as by `beginDrag()`: both are moments when the
   * pouch is placed deliberately against the frame that is on screen right now, so after either
   * one the frozen frame and the live camera agree, and a harness that calls `aim()` before it
   * projects (all of them do) is mapping through exactly the frame it measured.
   */
  captureDragFrame() { this._dragFrame = this.view(); return this._dragFrame; }
  dragFrame() { return this._dragFrame; }
  clearDragFrame() { this._dragFrame = null; }

  /**
   * Pull back while the band is drawn. `t` is the 0..1 draw amount.
   * The rubric wants the VISIBLE WORLD WIDTH to grow 8–20 %, so that is what is interpolated —
   * growing a half-width by 20 % does not grow the visible width by 20 % once the fit flips to
   * the other axis, which is how the old code ended up delivering 8.3 % and calling it 19 %.
   */
  drawing(t) {
    this.mode = 'drawing'; this.target = null;
    /**
     * A DRAW IS AN INTENT, SO IT TAKES THE CAMERA BACK. Whatever the player had panned or
     * zoomed to is released here rather than carried into the shot, so no shot is ever fired
     * from an uncomposed frame and `follow()`'s floor is always the frame the composition
     * solved. It glides back at the ordinary non-tracking rate while the band comes out.
     */
    this.lookX = 0; this.lookZoom = 1;
    const a = this.aimFraming();
    const k = smoothstep(t);
    /**
     * ══ ROUND 9 — THE DRAW IS NOT A MOVE. THE DRAW IS THE INPUT. ════════════════════════════
     *
     * THE BUG, in the owner's words, from a real phone: *"on the phone when u pull the sling,
     * the camera zooms to the structure, so you really cant see the sling, it makes a blind
     * shot!"* Measured at 390x660 on the build that had round 4's travel (`_shots/CAM/r1-before`,
     * the settled pose at each draw amount, fork = the sling group's rendered bounding box):
     *
     *            draw 0            draw 0.25 .. 1.0         ammo at full draw
     *      l1    fork  7.2–12.7 %W   fork −34.4 .. −26.8 %W   −42.9 .. −37.1 %W
     *      l2    fork  7.4–13.2 %W   fork −37.9 .. −29.7 %W   −46.8 .. −40.6 %W
     *      l3    fork 14.2–25.3 %W   fork   8.2 .. 19.2 %W     −3.9 ..   4.4 %W
     *
     * i.e. on l1 and l2 the ENTIRE slingshot — fork, limbs, band, pouch and ball — is off the
     * left of the screen from 25 % draw onward, and on l3 the ball crosses the left edge at
     * ~70 % draw. The player is dragging an object that is not on screen, and the drag IS the
     * aim. Round 4's own COMPOSE block admitted it ("past ~26 % draw the band is off screen")
     * and accepted it as a price; it is not a price worth paying, because the draw is not a
     * cutscene, it is the control.
     *
     * ROUND 4'S TRAVEL ALSO BOUGHT NOTHING, which is what makes this a clean removal rather
     * than a trade. Its premise was that "everything downstream — the release, the traverse,
     * the arrival, the impact beat — inherits the pose it lands on". That stopped being true
     * when round 5 widened the bay pose to hold the target as well (`needBoth`): the flight
     * width is solved from `a.flightVw`, which is the BAY width, so the strike pose the draw
     * travelled to was thrown away 60 ms after release. Measured on l1 (`r1-shotframe-before`):
     *
     *      full draw   vw 27.31   tower 47.5 %H        <- where the draw had dragged us
     *      release +0  vw 27.31   tower 47.5 %H
     *      release +60 vw 33.26   tower 39.0 %H        <- already zooming back OUT
     *      release+120 vw 34.63   tower 37.5 %H        <- the frame the shot actually crosses
     *
     * So the draw zoomed in 27 % and panned 6.9 units downrange, and the release immediately
     * undid both. The sling was sacrificed for a pose that lasted one frame.
     *
     * WHAT HAPPENS INSTEAD: in portrait the draw holds the bay pose exactly — the same frame
     * `focusSling()` set, the frame the level has been resting in, the frame round 5 widened
     * precisely so that it holds the band AND the target at once. Zero pan, zero zoom, from
     * first touch to full pull. The sling stays where the player's thumb left it.
     *
     * THE TRAVEL TOWARD THE TARGET STILL EXISTS — it just happens after release, where it
     * belongs, and it is unchanged code: `follow()` seeds the flight floor at `this.pos.x` and
     * the width solve commands `a.flightVw · zoom · grow`. Both now START from the bay pose
     * instead of from the strike pose, which turns a 27 % zoom-OUT at release into a small
     * push-IN. The flight, arrival and impact framing are solved from `a.flightVw` and do not
     * move by one thousandth.
     *
     * AND THE DRAWN BALL IS INSIDE THE FRAME BY CONSTRUCTION, not by luck: `slingPct(vw)`
     * derives the fork's mark from `drawClearance` = `SLING.maxStretch` (2.80, the whole of the
     * band's travel at the flattest legal angle) + `ammoVisualHalf` (0.79) + `drawEdgeMargin`
     * (0.16). That reserve was always there; round 4 spent it by panning off it.
     *
     * `t` is therefore unused in portrait, and `drawHoldPortrait` / `drawStrikePortrait` /
     * `drawGlideRatePortrait` no longer time a pan. The glide rate is kept and still earns its
     * keep: a draw releases the player's own `lookX`/`lookZoom` (above), so when a player has
     * pinched or panned before drawing, this is the rate the camera comes home at.
     */
    if (this.cam.aspect < PORTRAIT_ASPECT) {
      this.want.set(a.cx, a.cy, 0);
      this.setView(a.vw, a.vh);
      return;
    }
    /**
     * ── ROUND 3: IN PORTRAIT THE DRAW CLOSES THE FRAME, IT NEVER OPENS IT ─────
     * `grow` is <= 1 in portrait and >= 1 in landscape, and the two branches are separate
     * because they are answering different questions. Landscape pulls back to say "this is
     * loaded" against a frame that already holds the whole level. Portrait's frame is 66 %W
     * empty grass between the band and the first block, so what a draw should do there is
     * spend the reserve behind the band and CLOSE on the target — see `drawPushIn()`.
     * The eased `k` is the same in both, so the move still belongs to the player's thumb.
     */
    const grow = this.cam.aspect >= PORTRAIT_ASPECT
      ? 1 + (this.pullBackGrow(a.vw) - 1) * k
      : 1 + (this.drawPushIn() - 1) * k;
    const vw = a.vw * grow, vh = a.vh * grow;
    /**
     * ── THE PULL-BACK IS A ZOOM. IT IS NOT A PAN. (ROUND 7) ───────────────────
     * This line used to read `a.cx + a.vw * 0.030 * k` — a deliberate 3 %-of-width drift of
     * the camera CENTRE toward the target as the band came back, on the argument that the
     * shot being lined up should gain room and the empty ground behind the sling should lose
     * it. In world space that argument is sound (it does show one more unit downrange). In
     * SCREEN space, which is where every composition criterion is written, it is a rightward
     * pan of 1.06 world units, and `follow()` seeds the flight floor at the camera's actual
     * position on the frame of release — so the drift did not end at release. It was baked
     * into the whole traverse:
     *
     *              with drift            without
     *   floor x     13.93                 13.01      (aim composition = 13.013)
     *   sling       14.55 -> 11.14 %W     13.0 %W held, exactly its composed mark
     *   ball        38.04 -> 57.20 %W     40.6 -> 59.8 %W
     *
     * i.e. the frame the shot crossed was not the frame the player aimed from; it was that
     * frame slid a unit downrange, and the whole crossing sat 2.6 %W lower for it. "Hold the
     * aim framing through release" is only true if the aim framing is what release starts
     * from, and a pan during the draw is the one thing that can make it false.
     *
     * A pull-back that pins the sling on its mark and moves only the far end of the level is
     * also, geometrically, a zoom PLUS a pan — the asymmetry is the pan. Growing the frame
     * about its own centre moves both ends toward the middle by the same fraction, which is
     * what a pull-back looks like. Cost, measured at full draw: the sling reads 17.4 %W
     * instead of 14.8 (rubric band 10–18) and the furthest target 79.3 %W instead of 76.6 —
     * the DRAWN frame, which criterion 5 judges on width growth; criterion 3's marks are
     * measured at aim, where they are now held exactly rather than approached.
     */
    /**
     * ── AND IT IS PINNED ON THE FAR EDGE, NOT ON THE CENTRE (ROUND 3) ─────────
     * Landscape's pull-back grows about the frame's own centre, for the round-7 reason quoted
     * above: an asymmetric zoom is a zoom plus a pan, and there the pan is a defect. In
     * portrait the SAME symmetry would be the defect. Closing a 28.7-unit frame about its
     * centre pulls the right edge inward too, and the right edge is the structure's far block —
     * so a symmetric push-in would crop the very thing the round exists to stop cropping. The
     * far edge is therefore held still and the whole of the move is spent on the left, where
     * the reserve is. That makes it a pan toward the target as well as a push-in, which is
     * exactly what a draw should be, and `onScreenFracW` does not move by one thousandth.
     */
    const cx = this.cam.aspect >= PORTRAIT_ASPECT ? a.cx : a.cx + (a.vw - vw) / 2;
    this.want.set(cx, (this.groundPct() - 0.5) * vh, 0);
    this.setView(vw, vh);
  }

  /**
   * Track a projectile. LAG, then LEAD — but the lag is not a hand-tuned timer any more, it
   * falls out of one physical rule: **the flight camera only ever pushes IN from the launch
   * frame; it never pans back left.** The left edge of the frame at the moment of release is
   * frozen as a floor. While the camera is still wide, that floor is to the RIGHT of where the
   * projectile's screen mark wants the camera, so the camera holds and the shot rips across
   * the frame (the lag). As the dolly closes to the flight width the floor slides left with
   * the half-width, the two curves meet — with no positional error, so there is no catch-up
   * jerk — and from there the camera tracks the mark exactly (the lead).
   */
  follow(entity) {
    this.mode = 'follow';
    this.target = entity;
    this.lookX = 0; this.lookZoom = 1;   // the flight framing is not the player's to offset
    this.followT = 0;
    this._impactHold = 0;
    this._beat = false;
    this._holdWant = null;
    this._slowT = 0;
    this._lastWantX = null;
    this._lastWantY = null;
    this._tracking = false;
    this._acquired = false;
    this._lead = null;
    /**
     * THE ARRIVAL ANCHOR (ROUND 5, see `followBody`). Monotone in the shot's direction of
     * travel for the same reason `_camFloorX` is: `predictContactX` is re-solved every step
     * against live geometry, and a prediction that steps from the tower to the outpost must
     * not be able to walk the composition backwards mid-flight.
     */
    this._arrX = null;
    /**
     * THE RATCHET. `_vwCap` is the running minimum of the commanded frame width for this
     * flight, so a shot can only ever get TIGHTER — release, traverse, impact, in that order,
     * with no step in between allowed to widen. The solve is already monotone on a normal
     * shot (both `arrive` and the speed term fall), but it is re-solved every step against
     * live geometry: a block toppling out of the standing set moves `st.right`, and the
     * predicted contact can jump from the tower to the outpost mid-flight. Either would put a
     * kink back into the one curve this round exists to straighten, so it is forbidden here
     * rather than hoped for.
     */
    this._vwCap = null;
    /**
     * ROUND 6. `_markFloor` is the lead ratchet; `_arrPose` is the composition the impact beat
     * lands on. Both are per-flight and MUST be cleared here — a stale `_markFloor` from the
     * previous shot would cap the next one's camera against a mark it never earned, and
     * identical shots would stop being identical.
     */
    this._markFloor = null;
    this._leadSgn = null;
    this._arrPose = null;
    /**
     * ROUND 8, and for exactly the same reason: the traverse is per-flight state. A stale
     * `_traverseU` would start the next shot's pan already finished, and a stale `_leadEndX`
     * would aim it at the last shot's contact point — and two identical shots from one seed
     * would stop being identical, which `p3-r5-detshot.mjs` exists to catch.
     */
    this._camStartX = null;
    this._leadEndX = null;
    this._traverseU = null;
    this._flightSpan = null;
    this._beatFrom = null;
    this._beatT = 0;
    this.wantVel.set(0, 0, 0);
    const a = this.aimFraming();
    /**
     * The promise, and the whole of the lag: **THE CAMERA NEVER PANS BACK.** Its x is
     * monotonically non-decreasing from the moment of release, so the shot can only ever be
     * chased forward — there is no leftward dive, ever, in any mode.
     *
     * This replaces the round-2 rule, which froze the frame's LEFT EDGE at the aim frame's
     * edge and derived the floor from it. An edge rule is not equivalent to a monotone-x rule
     * the moment the frame CHANGES WIDTH: holding an edge while the frame narrows forces the
     * centre left (a pan back — the actual defect), and holding it while the frame widens
     * forces the centre right, which drives the projectile toward frame centre. Round 3
     * measured the second failure at vw 37, where the mark sat at 54.3 %W, under the rubric's
     * floor, while the rig was busy protecting a rule about grass. Monotone-x forbids only the
     * real defect — a camera that reverses — and leaves the dolly free in both directions.
     *
     * ── ROUND 7: SEEDED WHERE THE CAMERA ACTUALLY IS, NOT AT `bounds.minX`. ──
     * That seed is where the backwards lurch lived. `bounds.minX` is an outer backstop for a
     * wild shot — the DRAWN frame's left edge plus half a traverse frame — and on l1 it sits
     * 5.1 world units LEFT of where the camera is sitting when the player lets go. So "the
     * camera never pans back" was true only against a floor nobody was looking at, and the
     * first thing every shot did was slide 1.8–2.5 units backwards to reach the mark: sling
     * 13.0 -> 17.8 %W, structure 70.4 -> 80.3 %W with its far edge at 93.4, all inside the
     * first 100 ms, i.e. exactly while the player is reading their own shot.
     *
     * Seeded at `this.pos.x` the promise becomes the one it always claimed to be: THE FRAME
     * THE PLAYER AIMED FROM IS THE FLOOR. The camera can hold it or advance from it and can
     * never retreat behind it, so release is a still frame with the shot ripping across it —
     * and because `flightZoomTraverse` is now 1.0, that still frame is the composed aim
     * framing, sling on its 13 %W mark and the whole structure in shot.
     *
     * `pos`, not `want`: the drag glide may still be a few centimetres short of its target on
     * the frame of release, and seeding from `want` would make the floor jump forward past
     * the camera — a small teleport instead of a small lurch.
     */
    this._camFloorX = this.pos.x;
    /**
     * …and the traverse starts from the same place, for the same reason. Seeding it from the
     * SOLVED aim centre instead would put a step into the first frame of every flight whenever
     * the drag glide was a few centimetres short of it — a teleport at release, which is the
     * one moment of the shot the player is reading most closely.
     */
    /**
     * ── THE RELEASE CUT MAY NOT LAND OUTSIDE THE FRAME ────────────────────────
     * `Slingshot.release()` is a CUT: the ammo is teleported to `muzzlePoint()`, which is
     * `muzzleBase*ramp + muzzleLead*speed` clear of the anchor — 9.4 world units on l1's
     * canonical shot, because it scales with the exit speed and nothing else. In landscape
     * that lands the ball at 40.8 %W of a 35-unit frame and the designed LAG (the camera holds
     * the aim pose while the shot rips across it) is exactly right.
     *
     * In portrait the frame is 9.1 units wide — NARROWER THAN THE CUT — so the same lag put
     * the ball at **113.9 %W on the release frame and off screen for the first 83 ms** of every
     * shot, measured on all three levels. A lag that loses the projectile is not a lag.
     *
     * So when the cut overshoots the frame, the camera takes the cut WITH it: the start pose is
     * advanced just far enough to put the ball on `traverseMarkPctW`, the same 70 %W boundary
     * the flight already refuses to let it pass. Three properties make this safe:
     *   · it is a CLAMP ON AN OVERSHOOT, not a new composition — in landscape the mark is
     *     40.8 %W, the test fails, and nothing moves. Desktop cannot change by construction.
     *   · it moves `pos`, `want` and both per-flight anchors together, so the floor is still
     *     the frame the flight starts in and the camera still never pans back from it.
     *   · it is a pure function of the release state, so it is as deterministic as the cut it
     *     is following.
     */
    const p0 = entity?.position?.(this._tmp);
    if (p0) {
      const v0 = entity.velocity?.(this._tmp2);
      const sgn0 = (v0 && v0.x < 0) ? -1 : 1;
      const vwF = a.flightVw * COMPOSE.flightZoomTraverse;
      const onMark = p0.x - sgn0 * (COMPOSE.traverseMarkPctW - 0.5) * vwF;
      if (sgn0 > 0 ? onMark > this.pos.x : onMark < this.pos.x) {
        this.pos.x = onMark;
        this.want.x = onMark;
        this._camFloorX = onMark;
      }
      /**
       * …and the same in Y, because the cut is along the LAUNCH AXIS. At 0.78 rad and full
       * draw the muzzle is 10.29 units out, which is 7.2 units of it in Y: the ball starts at
       * y = 10.5 while l2's portrait frame tops out at 8.8, so it was above the screen for the
       * first 80-120 ms of every steep shot (-16 %H measured) while the vertical spring caught
       * up. Same rule as the ceiling below it — lift only as far as the projectile needs, never
       * past `followLiftMax*` — and, like the X cut, it is inert wherever the frame is already
       * tall enough to contain the muzzle, which is every landscape shot measured.
       */
      const vhF = a.flightVh * COMPOSE.flightZoomTraverse;
      const floorY0 = (this.groundPct() - 0.5) * vhF;
      const liftMax0 = this.cam.aspect < PORTRAIT_ASPECT
        ? COMPOSE.followLiftMaxPortrait : COMPOSE.followLiftMax;
      const needY0 = clamp(p0.y + vhF * 0.085 - vhF * 0.5, floorY0, floorY0 + vhF * liftMax0);
      // …and the launch cut obeys the same ceiling. It writes `pos.y` directly, so without
      // this it walks straight through `bounds.maxY` and the clamp below never sees it.
      const cappedY0 = Math.min(needY0, this.bounds.maxY);
      if (cappedY0 > this.pos.y) { this.pos.y = cappedY0; this.want.y = cappedY0; }
    }
    this._camStartX = this.pos.x;
    this.setView(a.flightVw * COMPOSE.flightZoomTraverse, a.flightVh * COMPOSE.flightZoomTraverse);
  }

  /**
   * Fit whatever the player should be looking at now.
   *   · villains still alive  -> frame them, plus the last impact, so you see what is left
   *   · none left             -> frame the WRECKAGE. This is the victory beat; zooming into
   *                              the single last impact point throws away the money shot.
   * The box is re-solved every step, but only ACTED ON when it has moved more than a
   * deadzone, so a chunk of debris rolling to a stop cannot make the camera hunt.
   */
  frameAll(extra = null) {
    this.mode = 'settle';
    this.target = null;
    this.lookX = 0; this.lookZoom = 1;
    this._settleExtra = extra ? extra.clone() : null;
    this._settleBox = null;
    this._settleLocked = false;
    this._settleQuiet = 0;
    this._settleT = 0;
    this.resolveSettle(true);
  }

  resolveSettle(force = false) {
    if (this._settleLocked && !force) return;
    /**
     * ── THE HARD STOP ────────────────────────────────────────────────────────
     * The deadzone lock below only fires if the solved box sits still for half a second, which
     * assumes the wreckage eventually stops asking. Measured on l1 out to 14 s (`p4-r4b-quiet`):
     * **1 of 12 bodies asleep at t = 13.4 s**, and the camera was still micro-correcting its x
     * by ~0.013 units a second apart at 13.0–13.3 s. A never-sleeping body is P3's problem, but
     * "the camera is still moving one second after every body is asleep" is P4's AUTOMATIC FAIL
     * and "no drift, hunting or oscillation in the final ten tiles" is P4's criterion — so the
     * camera may not make its stopping conditional on the physics stopping.
     *
     * After `settleHoldSec` in the settle framing the composition is locked outright. That is
     * long enough to have followed the whole collapse (l1's is over by ~3.5 s) and it makes the
     * stop unconditional rather than emergent. A new shot calls `frameAll()`, which clears both
     * the lock and this clock, so the next settle gets its own full look.
     */
    if (!force && this._settleT > COMPOSE.settleHoldSec) { this._settleLocked = true; return; }
    const pts = [];
    for (const v of world.villains) if (v.alive) pts.push(v.position(new THREE.Vector3()));
    const victory = pts.length === 0;
    if (victory) {
      for (const list of [world.blocks, world.debris]) {
        for (const e of list) if (!e.dead) pts.push(e.position(new THREE.Vector3()));
      }
    }
    if (!pts.length) { this.focusSling(); return; }
    // Include the last impact only if it is part of the same story as the survivors —
    // otherwise a wild miss drags the framing out over empty grass.
    if (this._settleExtra) {
      let near = false;
      for (const p of pts) if (Math.abs(p.x - this._settleExtra.x) < this.aimFraming().flightVw * 0.35) near = true;
      if (near) pts.push(this._settleExtra);
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const a = this.aimFraming();
    const m = COMPOSE.settleMargin;
    // Screen margin -> world size: the subject box must occupy at most (1 - 2m) of the frame.
    /**
     * A floor on how far in the settle framing may push. Diving to a 13-unit-wide close-up
     * loses the ground line and the sky and turns the payoff shot into a texture study; the
     * "look what you did" beat wants the wreckage AND the space around it.
     */
    /**
     * ROUND 4: the floor is a fraction of the flight frame, and portrait's flight frame just
     * lost half its width — 0.56 of it is a 6.55-unit keyhole with a single villain filling the
     * screen and the wreck that made it cropped away. The aftermath is allowed a push-in, not a
     * close-up, so portrait floors at `settleFloorPortrait` of the strike frame instead.
     */
    const floorK = this.cam.aspect < PORTRAIT_ASPECT ? COMPOSE.settleFloorPortrait : 0.56;
    let vw = Math.max(a.flightVw * floorK, (maxX - minX) / (1 - 2 * m));
    let vh = Math.max(a.flightVh * floorK, (maxY - minY) / (1 - 2 * m));
    // keep the authored aspect: whichever axis needs more room wins
    if (vw / this.cam.aspect > vh) vh = vw / this.cam.aspect; else vw = vh * this.cam.aspect;
    /**
     * ROUND 4: the ceiling is the flight frame in landscape and a bounded opening of it in
     * portrait. Portrait's flight frame is now the strike frame (11.5-12.3 units), and wreckage
     * routinely spreads wider than the structure that made it — capping the settle at the strike
     * width would frame the aftermath by cropping it. `settleOpenMaxPortrait` lets it breathe by
     * a third and no further, which is still under half of the round-3 frame.
     */
    const openMax = this.cam.aspect < PORTRAIT_ASPECT ? COMPOSE.settleOpenMaxPortrait : 1;
    vw = Math.min(vw, a.flightVw * openMax); vh = Math.min(vh, a.flightVh * openMax);

    const cx = (minX + maxX) / 2;
    // Keep the ground line in shot: never let the frame's floor climb above the grass, or the
    // wreckage floats in an unreadable void.
    const cy = Math.max((maxY + minY) / 2 + vh * 0.06, (this.groundPct() - 0.5) * vh * 0.85);

    if (!force && this._settleBox) {
      const d = Math.abs(cx - this._settleBox.cx) + Math.abs(cy - this._settleBox.cy)
              + Math.abs(vw - this._settleBox.vw);
      if (d < vw * COMPOSE.settleDeadzone) {
        /**
         * Once the solved box has sat inside the deadzone for half a second the framing is
         * LOCKED for the rest of the settle. A last chunk of debris rolling an inch must not
         * be able to nudge the camera again — "no drift, hunting or oscillation in the final
         * ten tiles" is a criterion, and the only way to be sure is to stop asking.
         */
        this._settleQuiet += 1 / 120;
        if (this._settleQuiet > 0.5) this._settleLocked = true;
        return;
      }
      this._settleQuiet = 0;
    }
    this._settleBox = { cx, cy, vw, vh };
    this.want.set(cx, cy, 0);
    this.setView(vw, vh);
  }

  /**
   * Camera kick. strength ~0.01 (tap) … 0.42 (launch), DOMINANT rather than additive, capped.
   *
   * ══ ROUND 9 — A PUNCH SETS AN AMPLITUDE. PUNCHES DO NOT SUM INTO A SIREN. ════════════════
   *
   * THE BUG, in the owner's words, from a real phone: *"too much vibration on screen."* The
   * cause was this one line, which used to read `this.shake = min(1, this.shake + strength)`.
   * Measured at 390x660 on l1's canonical shot (`_shots/CAM/r1-shake-before`, the committed
   * offset between `rig.pos` and `cam.position` converted to CSS px through the live frame):
   *
   *      550 punches in one 8.26 s shot · peak 14.2 px · 5.94 s above 2 px · 3.89 s above 4 px
   *      longest unbroken run above 1 px: 1.38 s · shake saturated at 0.93 of full
   *
   * i.e. 72 % of the shot was shaking harder than 2 px on a 390 px screen. That is not
   * punctuation, it is a constant state — and it is worse than it looks, because `world.hitStop`
   * is a `Math.max` topped up by every one of those same impacts, so 219 of 300 steps of l1's
   * collapse were FROZEN while the camera vibrated. A still world under a shaking lens is the
   * purest form of the thing the owner was complaining about.
   *
   * Additive accumulation is what did it. 548 impact/break punches summing to 41.5 of requested
   * strength cannot decay: every event tops the amplitude back up before the previous one has
   * fallen. (This is the same mistake as the `_reference` note about a repeated velocity match
   * being a SERVO rather than a ramp — a sum over an event stream is a level, not an impulse.)
   *
   * So the law is now DOMINANT-WINS, which is how a shake is actually heard:
   *   · a punch louder than what is currently ringing SETS the amplitude to exactly its own
   *     strength — one big hit reads at its own size, no louder;
   *   · a punch quieter than what is ringing adds only `shakeStack` of itself, so a hundred
   *     small impacts thicken a rumble instead of sirening it;
   *   · `shakeCeil` caps the lot well under 1, so no pile-up can reach full scale.
   *
   * THE DECAY IS ALSO OWNED BY THE LOUD ONE. It used to be "the most recent punch owns the
   * decay", which let a collapse punch (8.6 /s) reset the launch kick's deliberately fast
   * 15 /s falloff and hold the kick on screen past its +250 ms budget. A dominant punch now
   * brings its own decay; a quieter one can only make the falloff FASTER, never slower.
   *
   * @param {number} strength 0..1 of COMPOSE.shakeMaxPctH
   * @param {number} [decay]  1/s. A launch kick has to be gone by +250 ms (P1), much faster
   *   than a structural collapse wants, so the caller may set its own falloff.
   */
  punch(strength = 0.15, decay = COMPOSE.shakeDecay) {
    const s = Math.max(0, strength);
    const prev = this.shake;
    this.shake = Math.min(COMPOSE.shakeCeil,
                          s >= prev ? s : prev + s * COMPOSE.shakeStack);
    this.shakeDecay = s >= prev ? decay : Math.max(this.shakeDecay, decay);
  }

  /** Dolly to a given world half-width (kept for the ARCHITECTURE.md signature). */
  zoomTo(halfWidth, halfHeight = null) {
    this.setView(halfWidth * 2, (halfHeight ?? halfWidth / this.cam.aspect) * 2);
  }

  /**
   * DIAGNOSTIC FRAMING — park the camera on a fixed world box and stop the solver touching
   * it. Exposed as `SS.camLock()`; it exists so a critic can inspect something small at a
   * readable size (block joints, a shard silhouette, dust structure) without the rig
   * re-framing between two tiles of a filmstrip.
   *
   * It is a debug lens, not a gameplay mode: no gameplay code calls it, `focusSling()` /
   * `follow()` / `frameAll()` all clear it, and the game never enters it on its own. Judge
   * COMPOSITION at the game's own framing; use this only to judge things whose criteria are
   * about geometry rather than about where the camera put them.
   */
  lock(cx, cy, halfWidth) {
    this.mode = 'locked';
    this.target = null;
    const vw = halfWidth * 2;
    this.want.set(cx, cy, 0);
    this.wantVel.set(0, 0, 0);
    this.setView(vw, vw / this.cam.aspect);
    this.snap();
    return { ok: true, mode: this.mode, cx, cy, halfWidth, dist: this.dist };
  }

  unlock() {
    if (this.mode === 'locked') this.focusSling(true);
    return { ok: true, mode: this.mode };
  }

  // -------------------------------------------------------------------------
  // INTERNALS
  // -------------------------------------------------------------------------

  /** Visible world box -> dolly distance. `_hw`/`_hh` stay as half-extents for the probes. */
  setView(vw, vh) {
    this._hw = vw / 2; this._hh = vh / 2;
    const t = Math.tan(this.cam.fov * DEG / 2);
    this.wantDist = Math.min(MAX_DIST, Math.max(vh / 2 / t, vw / 2 / (t * this.cam.aspect)));
  }

  /** Back-compat alias — a couple of probe scenarios call this. */
  setFit(halfWidth, halfHeight) { this.setView(halfWidth * 2, halfHeight * 2); }

  snap() {
    this.pos.copy(this.want); this.vel.set(0, 0, 0); this.wantVel.set(0, 0, 0);
    this.dist = this.wantDist; this.distVel = 0;
    this.commit(world.simTime);
  }

  /** Re-fit after a resize or a level load. */
  onResize() {
    this.remeasure();
    this._fresh = false;      // a resize is not a level load — see `remeasure()`
    /**
     * A RESIZE MID-ESTABLISH re-solves the pose it is travelling FROM. On a phone this is not
     * hypothetical: `index.html` re-pins the stage (and fires `resize`) every time Safari's URL
     * bar slides, which happens on the first touch — i.e. during the establishing move. Without
     * this the move would keep interpolating from a pose solved for the old aspect and land on
     * the new aim framing from the wrong direction.
     */
    if (this.mode === 'establish') { this._estA = this.establishPose() ?? this._estA; return; }
    if (this.mode === 'sling' || this.mode === 'boot' || this.mode === 'drawing') this.focusSling();
    else if (this.mode === 'settle') this.resolveSettle(true);
    else {
      const a = this.aimFraming();
      this.setView(a.flightVw * COMPOSE.flightZoomArrival, a.flightVh * COMPOSE.flightZoomArrival);
    }
  }

  update(dt) {
    const a = this.aimFraming();

    if (this.mode === 'locked') { this.decayShake(dt); this.commit(world.simTime); return; }

    /**
     * THE ESTABLISHING MOVE (ROUND 2) is a TIMED interpolation, like the impact beat and for the
     * same reason: it has to arrive. A glide is asymptotic and would leave the aim framing 2 %
     * short of the pose every scenario measures; a spring would still be creeping. So it drives
     * `pos` and `dist` directly from its own clock and hands over on the exact frame it lands.
     */
    if (this.mode === 'establish') {
      this.establishStep(dt, a);
      this.decayShake(dt);
      this.commit(world.simTime);
      return;
    }

    /**
     * THE PLAYER'S LOOK, re-applied every frame so a drag is live rather than a one-shot nudge.
     * Idle framing only: during a draw it has already been released (`drawing()`), during a
     * flight the composition is not the player's to offset, and during the settle the camera is
     * delivering the payoff. With `lookX = 0` and `lookZoom = 1` — every frame of every capture
     * — this is exactly the want `focusSling()` set, so nothing about it is observable until
     * somebody actually drags.
     */
    if (this.mode === 'sling') {
      const vw = a.vw * this.lookZoom, vh = a.vh * this.lookZoom;
      this.want.set(a.cx + this.lookX, (this.groundPct() - 0.5) * vh, 0);
      this.setView(vw, vh);
    }

    if (this.mode === 'follow' && this.target && this.target.dead) {
      // whatever we were watching is gone — go and look at the damage
      this.frameAll(this.lastImpact);
    } else if (this.mode === 'follow' && this.target) {
      this.followT += dt;
      const spNow = this.target.speed();
      this._slowT = (this.followT > 0.5 && spNow < HANDOVER_SPEED) ? this._slowT + dt : 0;

      if (this._impactHold > 0) {
        /**
         * THE BEAT (ROUND 6). The camera stops tracking the ball — the ball has stopped being
         * the story — and lands the arrival composition it was deliberately holding back from:
         * the frame tightens from the traverse width onto the subject and slides the last two
         * or three units so the collision, not the gap between two towers, is what the frame
         * is built on. It is not a reframe after the fact: `_arrPose` was solved from this
         * shot's own predicted contact point half a second before it landed. It is the hit
         * shoving the camera, which is why the move is triggered by the impact event and eased
         * by `impactGlideRate` rather than by the flight controller.
         */
        this._impactHold -= dt;
        if (this._holdWant) { this.want.copy(this._holdWant); this.wantDist = this._holdDist; }
        this.wantVel.set(0, 0, 0);
        this._tracking = false;
        this._beat = true;
        this._beatT += dt;
        if (this._impactHold <= 0) { this._holdWant = null; this._beat = false; this._beatFrom = null; this.frameAll(this.lastImpact); }
      } else if (this._slowT >= HANDOVER_HOLD) {
        this.frameAll(this.lastImpact);
      } else {
        this.followBody(dt, a);
      }
    } else if (this.mode === 'settle') {
      this._settleT += dt;
      this.resolveSettle(false);
    }

    /**
     * PAN LIMITS. Clamping only `want` is not enough: the velocity feedforward keeps driving
     * the spring at the projectile's own speed, so a shot that sails off the end of the level
     * carried the camera ELEVEN UNITS past the clamp (measured: want.x 26.5, pos.x 38.0) and
     * pushed the whole structure off the left of the frame. Killing the feedforward on the
     * axis that is clamped removes the cause; clamping `pos` as well is the backstop.
     */
    const rawX = this.want.x, rawY = this.want.y;
    this.want.x = clamp(rawX, this.bounds.minX, this.bounds.maxX);
    this.want.y = clamp(rawY, this.bounds.minY, this.bounds.maxY);
    if (this.want.x !== rawX) this.wantVel.x = 0;
    if (this.want.y !== rawY) this.wantVel.y = 0;

    if (this.mode === 'follow' && this._beat && this._beatFrom) {
      /**
       * ── THE BEAT IS A TIMED MOVE (ROUND 8) ────────────────────────────────
       * Not a rate. An exponential glide leaves the gate at `rate × distance` — its fastest
       * frame is the FIRST one — so the hit landed as a step change in camera velocity and the
       * lens rate spiked at −240 to −326 %frame/s on the two samples either side of contact
       * (measured across eight shots, `_shots/P4/r8-base`). A smoothstep over the beat's own
       * window starts at zero rate, peaks at 1.5 × mean in the middle and ends at zero rate on
       * the exact frame the settle framing takes over — a shove with mass in it, and one that
       * provably arrives rather than asymptotically approaching. Position and dolly are driven
       * together so the pan and the push-in cannot drift out of phase with each other.
       */
      const uB = clamp(this._beatT / IMPACT_SNAP, 0, 1);
      const eB = smoothstep(uB);
      this.vel.set(0, 0, 0); this.distVel = 0;
      this.pos.x = lerp(this._beatFrom.x, this.want.x, eB);
      this.pos.y = lerp(this._beatFrom.y, this.want.y, eB);
      this.dist = lerp(this._beatFrom.dist, this.wantDist, eB);
    } else if (this.mode === 'follow' && !this._tracking) {
      /**
       * NOT YET ACQUIRED — glide, do not spring. The camera's want during the push-in is
       * `leftEdgeAtRelease + vw/2`, and vw is itself closing exponentially, so that want leaves
       * the gate at ~70 m/s and decays. A critically damped spring cannot follow a target with
       * that much acceleration: at stiffness 7 it fell FIVE UNITS behind, which is 20 %W, and
       * the projectile therefore arrived at a camera that was still four units right of where
       * the composition said it should be — the acquisition never actually happened and the
       * ball sat near frame centre for the rest of the flight. A first-order glide has no
       * inertia to fight, so the camera stays glued to the push-in and hands over to the
       * tracking spring with ZERO positional error, which is the whole point of the design.
       */
      /**
       * ROUND 8: the beat no longer comes through here at all — it is a timed move, in the
       * branch above, and `_beatFrom` is set on every hit that starts one. This is now purely
       * the pre-acquisition glide.
       */
      const f = 1 - Math.exp(-COMPOSE.flightGlideRate * dt);
      const eps = 0.0015 * (this._hh * 2);
      this.vel.set(0, 0, 0);
      this.pos.x = approach(this.pos.x, this.want.x, f, eps);
      this.pos.y = approach(this.pos.y, this.want.y, f, eps);
      const fd = 1 - Math.exp(-COMPOSE.flightDollyRate * dt);
      this.distVel = 0;
      this.dist = approach(this.dist, this.wantDist, fd, 0.0015 * this.dist);
    } else if (this.mode === 'follow') {
      spring(this.pos, this.vel, this.want, this.wantVel, this.stiffness, this.damping, dt);
      /**
       * ── NO OVERSHOOT. THE PROMISE IS STRUCTURAL, NOT TUNED. (ROUND 5) ───────
       * `want.x` during a flight is `max(idealX, _camFloorX)` with `_camFloorX` the running
       * maximum of that — it is MONOTONE NON-DECREASING by construction, and the camera starts
       * behind it and catches up. So the camera being to the RIGHT of its own want is never a
       * composition; it is ringing, and it is the one way the rig can still pan back.
       *
       * It showed up the moment round 5 made the anchor travel: the arrival pan asks for ~9
       * world units while the ball covers 6, so the want accelerates hard, and a critically
       * damped spring carries a steady-state error of −A/k against an accelerating target
       * (the same arithmetic the `stiffness` note below is about). Measured on the canonical
       * shot before this clamp: the camera ran 1.51 units PAST its want at t=440 ms and was
       * still walking back left at 0.5 units/s through the whole impact hold — the frame
       * drifting during the collapse, which is precisely the "hunting" the rubric forbids.
       *
       * Clamping the position alone would leave the velocity to push it straight back out, so
       * the velocity is clamped to the want's own rate at the same time: the camera lands on
       * its want and then RIDES it, which is what it was asked to do.
       */
      if (this.pos.x > this.want.x) {
        this.pos.x = this.want.x;
        if (this.vel.x > this.wantVel.x) this.vel.x = this.wantVel.x;
      }
      /**
       * The DOLLY is a glide, not a spring. As a spring geared off the tracking stiffness it
       * took most of a second to close the 13 % draw pull-back plus the 26 % flight zoom — so
       * the frame was still 35 units wide at the moment of impact, which is both why the
       * launch point was still on screen and why the projectile's screen mark could never be
       * reached (the mark offset is a fraction of vw, and vw was enormous). A fixed-rate glide
       * closes 95 % of it in 270 ms and provably arrives.
       */
      const f = 1 - Math.exp(-COMPOSE.flightDollyRate * dt);
      this.distVel = 0;
      this.dist = approach(this.dist, this.wantDist, f, 0.0015 * this.dist);
    } else {
      /**
       * Every non-tracking move is an exponential glide with a hard snap threshold. A spring
       * is asymptotic: it is still creeping micrometres a full second later, and "the camera
       * is still moving one second after every body is asleep" is an automatic FAIL. This
       * provably reaches the target and STOPS — 99 % of the move in 0.63 s, dead still after.
       */
      /**
       * ROUND 4: the portrait draw's pan is 17-19 world units, where every other move on this
       * branch is a settle or a re-frame of a couple of units, so it gets its own rate. 9.0 /s
       * is 500 ms to within 0.2 units of a 17.7-unit pan and ~1.6 units short at 150 ms — which
       * is the lag that keeps the band on screen through a fast pull.
       */
      const rate = this.mode === 'settle' ? 6.6
        : (this.mode === 'drawing' && this.cam.aspect < PORTRAIT_ASPECT)
          ? COMPOSE.drawGlideRatePortrait : 7.4;
      const f = 1 - Math.exp(-rate * dt);
      this.vel.set(0, 0, 0); this.wantVel.set(0, 0, 0); this.distVel = 0;
      const eps = 0.0035 * (this._hh * 2);
      this.pos.x = approach(this.pos.x, this.want.x, f, eps);
      this.pos.y = approach(this.pos.y, this.want.y, f, eps);
      this.dist = approach(this.dist, this.wantDist, f, eps);
    }

    this.pos.x = clamp(this.pos.x, this.bounds.minX, this.bounds.maxX);
    // Y was never clamped here, only `want.y` was — so anything writing `pos.y` directly
    // (the launch cut, a beat) could sit outside the bounds indefinitely.
    this.pos.y = clamp(this.pos.y, this.bounds.minY, this.bounds.maxY);
    this.pos.y = clamp(this.pos.y, this.bounds.minY, this.bounds.maxY);

    this.decayShake(dt);
    this.commit(world.simTime);
  }

  /**
   * ── SCREEN MARK, NOT WORLD OFFSET ──────────────────────────────────────────
   * The old tracker asked for a WORLD-SPACE lead: `want.x = p.x + dir * min(0.17*vw, 0.2*sp)`,
   * i.e. put the camera AHEAD of the ball. That is the wrong sign for the thing it was trying
   * to buy. Where the projectile lands on screen is
   *
   *        projPctW = 50 + (p.x - camx) / vw * 100
   *
   * so a camera ahead of the ball drives the ball toward the LEFT of frame, and the only thing
   * that stopped it looking like that was the old `bounds.minX` clamp, which pinned the camera
   * and left the projectile sitting at 50.6-54.1 %W for the whole flight — dead centre, the
   * rubric's "projectile is centred during flight instead of led" automatic FAIL.
   *
   * So the composition is written where it is actually measured: on the screen. The projectile
   * is placed on a MARK (COMPOSE.flightProjPctW, 55.6 %W, inside the rubric's 55-75 %W band)
   * and the camera position is solved from it:
   *
   *        want.x = p.x - (mark - 0.5) * vw          <- camera trails, ball leads
   *
   * Two consequences worth stating, because they are what makes this a composition rather than
   * a follow-cam:
   *   · the mark is a fraction of the CURRENT frame, so it holds while the dolly is still
   *     moving and it holds identically in portrait, where vw is the same but vh is 4x.
   *   · the mark is only half the composition. What the OTHER subject does is set by the frame
   *     WIDTH, because the projectile-to-structure separation is a fixed number of world units
   *     at the moment of contact and only vw converts it into %W. That is why round 3 changed
   *     the arrival zoom rather than the mark: see the geometry block on COMPOSE.
   *
   * Round 2 deliberately drove the SLINGSHOT OFF FRAME before the hit, by tightening the
   * arrival frame to 0.71x. That was a mistake dressed as a feature: it left the whole left
   * half of the impact frame as empty grass with an unanchored dotted trail drifting into it
   * (see `_shots/P4/r3-cand`, panel A). Opening the arrival frame instead puts the fork back at
   * ~10 %W with the traceline anchored on it — which is exactly how the reference frame is
   * built, and it fills the half of the picture that used to be nothing.
   *
   * The floor (`_camFloorX`, see follow()) is the whole of the lag: the camera never pans back.
   */
  /**
   * One step of the establishing move: hold on the target, then one eased travel to the aim
   * pose. `u` is the fraction of the TRAVEL (not of the whole move) that has elapsed, so the
   * hold is simply the part where u is still clamped at 0 and nothing moves.
   *
   * The ground line is recomputed from the interpolated width rather than interpolated itself:
   * the move crosses a real dolly (l1: 11.9 -> 20.2 world units of frame), and a lerped cy would
   * walk the horizon while the frame grew. This way the grass stays pinned at `groundPct()` for
   * every frame of the move, which is the one thing the whole rig refuses to let move.
   */
  establishStep(dt, a) {
    const C = COMPOSE, A = this._estA;
    this._estT += dt;
    const u = clamp((this._estT - C.establishHold) / Math.max(0.01, C.establishTravel), 0, 1);
    const e = smoothstep(u);
    const vw = lerp(A.vw, a.vw, e);
    const vh = vw / this.cam.aspect;
    this.want.set(lerp(A.x, a.cx, e), (this.groundPct() - 0.5) * vh, 0);
    this.setView(vw, vh);
    this.vel.set(0, 0, 0); this.wantVel.set(0, 0, 0); this.distVel = 0;
    this.pos.copy(this.want);
    this.dist = this.wantDist;
    // It lands ON the aim pose, so the handover is a mode change and nothing else moves.
    if (u >= 1) { this.mode = 'sling'; this.target = null; this._estA = null; }
  }

  followBody(dt, a) {
    const p = this.target.position(this._tmp);
    const v = this.target.velocity(this._tmp2);
    const sp = Math.hypot(v.x, v.y);

    /**
     * FLIGHT FRAMING — wide across the sky, CLOSING as the target arrives.
     * `arrive` is how far the shot has come along the run from the sling to the near face of
     * the structure, so it is a property of the LEVEL, not a timer: a slow lob and a flat
     * bullet close the frame at the same place in space, which is the place that matters.
     */
    const e = this._extent ?? (this._extent = this.measureLevel());
    const lead = this._lead = this.solveLead(p.x, p.y, v.x, v.y);
    /**
     * ── ROUND 8 REMOVED THE SPATIAL RUN ENTIRELY ──────────────────────────────
     * `runStart` / `runEnd` / `runS` — the shot's progress in WORLD X from the muzzle to the
     * predicted contact — drove both the push-in ramp and the arrival pan through rounds 3-7.
     * Neither exists any more: the push-in is the impact beat and the traverse is keyed to
     * elapsed flight TIME (see the X solve below), which is the axis the launch kick does not
     * distort. The prediction itself is still the whole basis of the composition; it is
     * consumed as `lead.contactX` / `lead.contactT` rather than as a fraction of a run.
     */
    /**
     * ── ROUND 8: THE FRAME THE SHOT CROSSES IS THE FRAME THE PLAYER AIMED FROM ──
     * There is no in-flight push-in at all any more. It used to ramp in over the last 20 % of
     * the run, which put a −240 to −326 %frame/s lens move into the ~120 ms BEFORE the hit — a
     * zoom the player reads as the camera flinching early — and it bought nothing: the width
     * lands on the arrival value during the beat either way. The whole push-in is now the
     * beat, and the traverse is a pure PAN. Two things follow, both wanted:
     *   · the projectile's screen mark is an offset of `(mark − 0.5)·vw`, so a frame that is
     *     closing walks the camera forward past the ball for free — the traverse can now be
     *     designed against a constant width instead of against a moving one;
     *   · criterion 4b is a separation of `100·d/vw`, and every unit the frame closes before
     *     the hit pushes the struck structure FURTHER from the ball on screen, not closer.
     */
    const zoom = COMPOSE.flightZoomTraverse;
    // …and a touch more when it is really moving. Reads as speed, and decays with the shot.
    const grow = 1 + Math.min(COMPOSE.flightSpeedGrowMax, sp * COMPOSE.flightSpeedGrow);
    /**
     * ── HOW FAR THROUGH THE FLIGHT WE ARE (hoisted in ROUND 2) ────────────────
     * TIME, not distance along the run: `SLING.kick` covers 38 % of l1's run inside the first
     * 100 ms, so a spatial ramp spends a third of the move while the ball is still doing 50 m/s
     * — a lurch at release, which is precisely what round 7 removed. `lead.contactT` is the
     * remaining time from the same ballistic integration that gives `contactX`, so
     * `followT + contactT` is the whole flight; smoothed because the prediction refines as the
     * arc resolves (l1's canonical shot walks its own contact point from x 17.6 to 16.9 over the
     * first 100 ms), and latched monotone so a flickering prediction can never rewind the move.
     *
     * It was computed inside the X solve until round 2 needed it for the WIDTH as well (see the
     * portrait push-in immediately below). Nothing in the block depends on the frame width, so
     * hoisting it is a pure reordering — the traverse reads the identical `u` it always did.
     */
    let u = this._traverseU ?? 0;
    if (lead.contactT !== null) {
      const span = this.followT + lead.contactT;
      this._flightSpan = this._flightSpan === null
        ? span : this._flightSpan + (span - this._flightSpan) * Math.min(1, dt * 8);
      u = Math.max(u, clamp(this.followT / Math.max(0.08, this._flightSpan), 0, 1));
    }
    this._traverseU = u;
    /**
     * ── THE PUSH-IN MAY NOT SHOVE THE LEVEL OUT OF FRAME ──────────────────────
     * The arrival ramp is driven by the PROJECTILE's progress along the run; the camera's own
     * progress is a different and much slower thing, because the camera does not leave the
     * launch end until the mark solve acquires it. On a flat shot the two nearly coincide and
     * nothing shows. On a lofted one they do not, and the frame narrows around a camera that is
     * still back near the sling — so the far end of the level is squeezed off the right edge
     * while the shot is still in the air. Measured over a 12-shot grid on l1 before this guard:
     * the standing structure's right edge reached **109.7 %W** on 6 of 12 shots (a0.44 107.8,
     * a0.52 109.6, a0.62 102.2, a0.75 109.7, 0.30@0.55 101.2, 0.30@0.35 107.5), i.e. the outpost
     * and the villain standing on it were off screen for most of the traverse. The canonical
     * shot survived at 99.49 %W — by 0.5 %W, which is luck, not composition.
     *
     * So the width carries a FLOOR as well as a ratchet: from where the camera is entitled to
     * be, the frame must still be wide enough to hold everything still standing, with a hair of
     * margin. It is anchored on `_camFloorX` — the monotone camera floor — and NOT on the live
     * camera x, precisely so the floor is monotone NON-INCREASING (`_camFloorX` only ever rises,
     * and `st.right` only ever shrinks as blocks die), which is what keeps the whole width curve
     * monotone down. A floor read off a camera that can wobble would put a rise back into the
     * one curve this round exists to straighten.
     *
     * It is a guard, not a composition: the edge target is 99.5 %W, so it engages only when
     * something would genuinely leave the frame. On the canonical shot it binds for ~60 ms and
     * costs 0.3 world units; the arrival width is unchanged.
     */
    let vwCmd = a.flightVw * zoom * grow;
    /**
     * ── PORTRAIT: THE PUSH-IN TRAVELS WITH THE TRAVERSE (ROUND 2) ─────────────
     * In landscape the traverse frame already shows the structure at 37 %H, so the width can
     * afford to sit still until the hit shoves it (round 8's beat) — and it should, because a
     * late exponential ramp is what spiked the lens at −326 %frame/s.
     *
     * In portrait the traverse frame is the tight near-field aim frame, and measured on the
     * round-1 build the structure at the FRAME OF CONTACT read 13.2 / 6.4 / 12.3 %H with the
     * entire push-in landing 400 ms after the collapse had begun. So the width rides the
     * traverse's own `smoothstep(u)` — one move, one easing, zero rate at both ends, spread over
     * the whole flight instead of the last fifth of it — and stops `portraitArriveByContact` of
     * the way there, leaving the rest for the hit to pay.
     *
     * `lead.contactX === null` (a flyover with nothing ahead of it) skips this entirely: there
     * is no arrival to push in toward, and a shot that ends in the grass keeps the aim frame.
     */
    if (this.cam.aspect < PORTRAIT_ASPECT && lead.contactX !== null) {
      vwCmd = lerp(vwCmd, a.flightVw * lead.zoom, smoothstep(u) * COMPOSE.portraitArriveByContact);
    }
    const st = this.standing();
    /**
     * …and the guard is a LANDSCAPE guard. It asks for a frame wide enough to hold everything
     * still standing, which portrait has explicitly given up on: the portrait frame is 4.7–9.1
     * units wide against structures 8.7–11.7 units across, so `need` is unreachable on every
     * frame of every shot and the guard simply sat on its own ceiling — measured, it widened
     * the flight frame from 9.14 to 10.38 (the `a.vw * 1.135` cap) for the first half of the
     * flight on l1, which both broke "the frame the shot crosses is the frame the player aimed
     * from" and dropped the tower from 37 %H to 32.6 %H mid-flight. A clamp that is always
     * saturated is not a guard, it is a different composition arriving through the back door.
     */
    if (st && this.cam.aspect >= PORTRAIT_ASPECT) {
      const anchorX = this._camFloorX ?? (a.cx - a.vw * 0.5 + vwCmd * 0.5);
      // signed distance from the camera's entitled centre to the edge the shot is running at.
      // Negative means the camera is already past it — nothing to protect, guard off.
      const reach = v.x >= 0 ? (st.right + COMPOSE.holdEdgePad) - anchorX
                             : anchorX - (st.left - COMPOSE.holdEdgePad);
      const need = reach / (COMPOSE.holdEdgePctW - 0.5);
      if (need > vwCmd) vwCmd = Math.min(need, a.flightVw * (1 + COMPOSE.drawPullBack));
    }
    /** THE RATCHET (see `follow()`): the commanded flight frame may narrow, never widen. */
    if (this._vwCap !== null) vwCmd = Math.min(vwCmd, this._vwCap);
    this._vwCap = vwCmd;
    this.setView(vwCmd, vwCmd / this.cam.aspect);
    /**
     * ── COMPOSE AGAINST THE FRAME THAT IS ACTUALLY ON SCREEN ───────────────────
     * `setView` sets the frame the dolly is heading FOR; `this.dist` is the frame the renderer
     * is about to draw, and during a 9-unit push-in the two are meaningfully different. Composing
     * against the commanded width is not a rounding error, it is a feedback loop: the mark
     * offset is `(mark − 0.5)·vw`, so an over-wide vw pushes `idealX` LEFT, `idealX` drops
     * below the monotone camera floor, the rig decides it has lost the projectile and falls
     * back to the un-fed-forward glide — measured, the canonical shot dropped out of tracking
     * at t=220 ms and never got back in, and arrived with the camera 0.43 units behind its own
     * want and the projectile 1.0 %W off its mark. Composing against `distNow` — the exact
     * value `update()` is about to integrate to, same rate, same inputs, so it is not a guess —
     * closes the loop. `_hw`/`_hh` stay as the commanded frame; they are the dolly's target and
     * that is what shake amplitude and the glide epsilons want.
     */
    const dollyF = 1 - Math.exp(-COMPOSE.flightDollyRate * dt);
    const distNow = approach(this.dist, this.wantDist, dollyF, 0.0015 * this.dist);
    const vh = 2 * distNow * Math.tan(this.cam.fov * DEG / 2);
    const vw = vh * this.cam.aspect;              // the frame we are in NOW, mid-dolly

    // --- X: THE TRAVERSE (round 8) -------------------------------------------
    /**
     * ── THE FLIGHT IS ONE DESIGNED MOVE, NOT A CLAMP THAT OCCASIONALLY BINDS ──
     *
     * Rounds 3–7 all solved the camera's x from the projectile's screen MARK, and the mark was
     * always a clamp: the pair of %W bands the rubric asks for needs `vw ≥ 20·d`, which never
     * holds on l1, so the solve returned a value outside the band on every frame of every
     * flight and the camera obeyed the clamp instead. Round 6 clamped at the band's bottom edge
     * and the ball welded to 56 %W; round 7 clamped at the top and the camera froze solid,
     * which is what this round exists to fix. A composition that is only ever expressed as the
     * edge of a feasible set is not a composition.
     *
     * So the flight is now stated as the move it should be: a TRAVERSE from the frame the
     * player aimed in to a frame that has the collision composed in it, eased across the whole
     * flight, with the ball's own screen position falling out of it rather than driving it.
     * Three terms, in order of authority:
     *
     *   1. THE TRAVERSE ITSELF — `startX -> _leadEndX` over `smoothstep(u)`, where `u` is the
     *      fraction of this shot's own predicted flight TIME that has elapsed (see below), and
     *      `_leadEndX` is the pose that puts the ball on `leadContactMark` at the predicted
     *      contact point. It leaves and arrives at zero pan rate.
     *   2. THE BOUNDARY — the ball may never run past `traverseMarkPctW` (70 %W, the top of the
     *      rubric's band). This is round 7's rule and it is kept exactly: on a shot with room
     *      ahead of it (a flyover with nothing to hit) the traverse has no end pose to aim at,
     *      the camera holds, and the boundary is what eventually picks the shot up and leads
     *      it. On a hitting shot it never binds — the traverse is already ahead of it.
     *   3. THE FLOOR — `_camFloorX`: the camera never pans back. Unchanged, and it still wins.
     *
     * `dir` still mirrors the composition for a shot fired leftward; `sgn` is the same fact
     * latched at release, because `dir` flips the instant a shot stalls or bounces.
     */
    this._leadSgn ??= (v.x >= 0 ? 1 : -1);
    const sgn = this._leadSgn;
    const dir = clamp(v.x / 6, -1, 1);
    const floorX = this._camFloorX ?? (a.cx - a.vw * 0.5 + vw * 0.5);
    const startX = this._camStartX ?? floorX;

    // 1. …how far through the flight we are — `u`, solved above the width block (round 2
    //    hoisted it so the portrait push-in could ride the same easing). Unchanged otherwise.
    /**
     * …and where it is going. SMOOTHED, NOT LATCHED, and that distinction was worth 2.2 %W of
     * composition on the canonical shot and 13 %W on a lob. The first version latched this
     * monotone in the direction of travel, on `_arrX`'s reasoning — a prediction that steps
     * from the tower to the outpost must not walk the composition backwards. But the
     * prediction does not only step outward; it REFINES INWARD as the arc resolves (l1's
     * canonical shot walks its contact from x 17.6 to 16.9 over the first 100 ms, and a lofted
     * shot's first guess is often the outpost four units past the tower it actually hits).
     * Latching the maximum therefore aims the traverse at the shot's most pessimistic early
     * guess and lands the camera ahead of the ball: measured, the ball arrived at 53.4 %W
     * instead of 55.6 on the canonical shot and at 42.4 %W on the steep lob.
     * Smoothing costs nothing that the latch was protecting, because the promise that the
     * camera never reverses does not live here — it lives on `_camFloorX`, which clamps the
     * WANT and is applied after every term in this solve.
     */
    if (lead.contactX !== null) {
      const end = lead.contactX - sgn * (COMPOSE.leadContactMark - 0.5) * vw;
      this._leadEndX = this._leadEndX === null
        ? end : this._leadEndX + (end - this._leadEndX) * Math.min(1, dt * 8);
    }
    const traverseX = this._leadEndX === null
      ? startX
      : startX + (this._leadEndX - startX) * smoothstep(u);

    // 2. …and the boundary the shot may not cross ahead of the camera.
    const boundMark = lead.d === null ? COMPOSE.flightProjPctW : COMPOSE.traverseMarkPctW;
    const boundX = p.x - sgn * (boundMark - 0.5) * vw;

    let idealX = sgn >= 0 ? Math.max(traverseX, boundX) : Math.min(traverseX, boundX);
    /**
     * ── THE ARRIVAL ANCHOR: THE SUBJECT TAKES THE FRAME OVER ──────────────────
     * (ROUND 5. See the long block on COMPOSE for the measurements this exists to fix.)
     *
     * While the shot is crossing empty sky the projectile is the only thing on screen, so the
     * frame belongs to it and `projIdealX` above is the whole composition. Once the structure
     * it is going to hit is genuinely in the frame, the projectile is a 1 %W dot flying at a
     * 47 %W subject, and a camera that keeps the dot on a mark hands the subject whatever is
     * left over — measured on round 4, that was 68–74 %W with its far edge at 92–95 %W and
     * half the frame empty behind the shot.
     *
     * So over the last stretch of the run the anchor slides from the ball to a pose solved
     * from the subject, and the camera is STILL by the time the ball gets there:
     *
     *     arrX = standMid − (arrivalStructPctW − 0.5)·vw        the subject, centred
     *          clamped so the CONTACT POINT stays in [contactMin, contactMax] %W   …the event
     *          clamped so nothing standing crosses `arrivalEdgePctW`              …the frame
     *
     * Three properties make this safe rather than merely nicer:
     *   · it is monotone in the direction of travel (`_arrX`), for exactly the reason
     *     `_camFloorX` is — a prediction that flickers must never make the camera reverse;
     *   · it is blended, not switched, so there is no frame where the want jumps;
     *   · it degrades to nothing. A shot with no predicted contact (a clean flyover) has no
     *     subject to compose against and keeps the pure ball-lead framing, unchanged.
     *
     * ROUND 8: this block no longer touches the flight's want at all. It solves the pose the
     * IMPACT BEAT lands on and nothing else — the traverse above is what the camera does while
     * the shot is in the air. Round 6 blended the two with a ramp over the last 20 % of the
     * run, which is the "lunge" half of the round-7 critic's gap: 3.1–4.2 world units of pan
     * inside the 170 ms straddling the hit, against 0.0 in the preceding 400 ms.
     */
    if (st && lead.contactX !== null) {
      const mirror = (q) => 0.5 + (q - 0.5) * dir;
      /**
       * The SUBJECT's pose is what gets latched — it is the thing that must not walk backwards
       * when the prediction jumps. The two clamps below are re-applied to the latched value
       * every step rather than folded into it, because both of their bounds are functions of
       * the LIVE frame width and the frame is closing: latching a clamp evaluated at vw = 39
       * and then re-using it at vw = 21 silently leaves the clamp unsatisfied (measured — with
       * `arrivalContactMinPctW` forced to 0.45 the contact still came out at 39.3 %W instead
       * of 45.0). Clamping last costs nothing: `wantX = max(idealX, _camFloorX)` is what
       * actually guarantees the camera never pans back, and it is untouched by this.
       */
      const subject = (lead.focusX ?? st.midX) - (mirror(COMPOSE.arrivalStructPctW) - 0.5) * vw;
      this._arrX = this._arrX === null ? subject
        : (dir >= 0 ? Math.max(this._arrX, subject) : Math.min(this._arrX, subject));
      // …the EVENT may not be pushed into a corner by centring the subject…
      const cA = mirror(COMPOSE.arrivalContactMinPctW), cB = mirror(COMPOSE.arrivalContactMaxPctW);
      const cLo = Math.min(cA, cB), cHi = Math.max(cA, cB);
      let arr = clamp(this._arrX, lead.contactX - (cHi - 0.5) * vw,
                                  lead.contactX - (cLo - 0.5) * vw);
      // …and nothing still standing ahead of the shot may be cut off by the frame edge.
      const edge = (COMPOSE.arrivalEdgePctW - 0.5) * vw;
      arr = dir >= 0 ? Math.max(arr, st.right - edge) : Math.min(arr, st.left + edge);
      /**
       * ROUND 6 — the fully-solved arrival pose, recorded every step and NOT reached in flight.
       * `_impactHold` glides onto it when the hit lands (see the `impact` subscriber): the
       * push-in and the slide onto the subject are the beat, not a rehearsal for it. Storing
       * it here rather than solving it in the event handler keeps the handler a pure consumer
       * and means the pose is always the one this shot's own prediction asked for.
       */
      (this._arrPose ??= { x: 0, vw: 0 });
      this._arrPose.x = arr;
      this._arrPose.vw = a.flightVw * lead.zoom;
    }
    let wantX = Math.max(idealX, floorX);
    /**
     * ── THE LEAD RATCHET: THE CAMERA MAY NOT OVERTAKE THE SHOT ────────────────
     * (ROUND 6 — the one rule this round exists for. See the COMPOSE block for the numbers.)
     *
     * `_markFloor` is the projectile's screen mark, and it is monotone non-decreasing for the
     * whole flight. The camera is free to pan (never backwards — `floorX`) and free to dolly,
     * but the composition of those two moves may never walk the ball backwards across the
     * frame. Round 5 had no such rule and the arrival pan ran at 40 m/s against a 12 m/s ball,
     * which put the shot at 30 %W for the second half of every flight while the camera sat on
     * the impact framing waiting for it.
     *
     * It is a CAP on a want, not a controller: the mark rises freely (the launch lag is the
     * ball catching up to its mark across a nearly still frame, and that is unaffected), and
     * whatever part of the arrival pose it refuses to pay for before the hit is paid for by
     * the impact beat instead, when the projectile has stopped being the subject.
     *
     * `floorX` is re-applied afterwards so the never-pan-back promise still wins outright: the
     * cap can only ever hold the camera further BACK, and holding it back can never be a pan.
     */
    /**
     * The ratchet's sign is fixed at release, not read off `dir` each step. `dir` is
     * `v.x / 6` and it flips the instant a shot bounces back or stalls, which would reinterpret
     * a mark accumulated in one direction as a mark in the other and hand the camera a cap on
     * the wrong side of the ball. (`sgn` is latched at the top of the X solve, above, because
     * round 8's traverse needs the same fact before this point.)
     *
     * ROUND 8 keeps this rule even though the traverse is designed to satisfy it by
     * construction — `_leadEndX` is solved so the ball's mark RISES from release to contact, so
     * the cap should never bind on a hitting shot. It stays because "should never" is not a
     * guarantee: the prediction can jump, a block can fall out of the standing set and move
     * `st.right`, and the shot itself can be deflected. The rule is cheap and it is the one
     * that round 6 was failed for not having.
     */
    const implied = 0.5 + sgn * (p.x - wantX) / Math.max(0.1, vw);
    if (this._markFloor === null) this._markFloor = Math.min(implied, COMPOSE.leadProjMaxMark);
    else if (implied > this._markFloor) {
      this._markFloor = Math.min(implied, COMPOSE.leadProjMaxMark);
    }
    const leadCap = p.x - sgn * (this._markFloor - 0.5) * vw;
    wantX = Math.max(sgn > 0 ? Math.min(wantX, leadCap) : Math.max(wantX, leadCap), floorX);
    /**
     * ACQUISITION IS ONE-WAY. `idealX > floorX` is the right test for WHEN the camera first
     * catches the projectile, and a terrible one for whether it still has it: while the arrival
     * frame opens, `idealX` grazes back under the monotone floor for a step here and there, and
     * every graze dropped the rig out of the tracking branch into the glide — which begins
     * `this.vel.set(0,0,0)`. The camera's velocity was being thrown away mid-flight (measured:
     * 7.6 m/s -> 1.0 m/s in one step at t=340 ms), and it then had to rebuild it against a want
     * running at 13, ending the shot 0.3 units behind its own composition. The floor still does
     * its job — it clamps `wantX`, so the camera still never pans back — it just no longer gets
     * to revoke the handover.
     */
    /**
     * ROUND 8 — WHAT "ACQUIRED" NOW MEANS. On a hitting shot the traverse leaves the aim pose
     * on the first flight frame with ZERO positional error (it starts at `_camStartX`, which is
     * the camera's own x at release), so there is no acquisition transient left to protect and
     * the camera tracks from step one. `acquireHold` therefore no longer gates a hitting shot;
     * it still gates the case it was written for — a shot with NO predicted contact, where the
     * want is the 70 %W boundary and the handover really does happen mid-flight, at speed.
     */
    const tracking = this._acquired ||
      (idealX > floorX && (this._leadEndX !== null || this.followT >= COMPOSE.acquireHold));
    this._camFloorX = wantX;      // monotone: the camera never pans back

    /**
     * VERTICAL DEADZONE — the single biggest thing keeping the horizon still.
     * The resting camera height already puts the frame's top edge well above the tallest
     * block, so almost every arc fits without the camera moving in Y at all. Only a shot that
     * would actually leave the top of the frame pushes the camera up, and only by exactly as
     * much as it needs. A camera that tracks the projectile's y directly bobs the ground line
     * between 78 %H and 94 %H on an ordinary shot, which is the rubric's "the horizon moves"
     * fail dressed up as follow-cam.
     */
    const floorY = (this.groundPct() - 0.5) * vh;
    /**
     * The pad is deliberately small — 8.5 % of frame height, not 14. The flight frame is
     * narrower than the establishing frame, so the SAME arc that used to sit comfortably inside
     * it now comes closer to the top edge, and a generous pad meant the camera lifted on
     * ordinary lobs: measured on the over-the-top shot, the ground line walked 3.6 %H up and
     * took 900 ms to come back, which reads exactly like a camera that will not settle. At
     * 8.5 % the same shot needs no lift at all and the ground line is pinned for the whole
     * flight; a genuinely towering arc still gets the room, it just has to earn it.
     */
    const topPad = vh * 0.085;
    const diry = sp > 0.001 ? v.y / sp : 0;
    const needY = p.y + diry * vh * 0.04 + topPad - vh * 0.5;
    /**
     * ── THE LIFT CEILING IS A FRACTION OF THE FRAME, AND THE ARC IS NOT ───────
     * 0.26 of a 19.7-unit landscape frame is 5.1 world units of lift; 0.26 of l2's 10.2-unit
     * PORTRAIT frame is 2.6, while the arc it has to hold is the same 14.0 units high (the
     * apex of 0.78 rad at full draw, `p2-sweep`). Measured on the shot grid at 390x844 before
     * this line was orientation-aware: **l2 0.78@1.00 spent 760 ms of its flight above the top
     * of the frame** (-23.5 %H at worst) and 0.62@1.00 lost the first 120 ms the same way,
     * against 0/18 lost at 1280x720. A camera that cannot lift far enough to hold the shot is
     * the same defect as a frame too wide to see it.
     *
     * `needY` is unchanged — it still asks for EXACTLY the lift the projectile needs and no
     * more, so this ceiling changes nothing on an ordinary shot: l1's canonical arc (apex 7.02
     * in a 19.8-unit frame) asks for a negative lift and gets none, and the ground line stays
     * pinned at 86.5 %H exactly as before. It only stops being a lid on the towering lob it
     * was never sized for.
     */
    const liftMax = this.cam.aspect < PORTRAIT_ASPECT
      ? COMPOSE.followLiftMaxPortrait : COMPOSE.followLiftMax;
    const wantY = clamp(Math.max(floorY, needY), floorY, floorY + vh * liftMax);
    this.want.set(wantX, wantY, 0);

    /**
     * FEEDFORWARD. A position spring chasing a moving target carries a permanent lag of
     * 2*v/sqrt(k) — four metres at 24 m/s, i.e. the mark would sit 12 %W off wherever it was
     * asked to be. Damping against the target's own velocity removes it. `want.x` is a smooth
     * function of both the projectile AND the still-moving dolly, so its derivative is taken
     * numerically rather than assumed to be v.x: during the push-in the want is sliding left
     * at half the dolly rate while the projectile flies right, and guessing v.x there would
     * drive the camera straight through the floor.
     */
    if (this._lastWantX === null) this._lastWantX = wantX;
    const rawVelX = (wantX - this._lastWantX) / dt;
    this._lastWantX = wantX;
    const smooth = Math.min(1, dt * 60);
    this.wantVel.x += (rawVelX - this.wantVel.x) * smooth;
    /**
     * The SAME feedforward on Y, and for a reason that only appeared once the arrival frame
     * became a real dolly move: `floorY` is (groundPct − 0.5)·vh, so while the dolly runs, the
     * height the camera must sit at to keep the ground line on 77.5 %H moves with it — climbing
     * at ~2 m/s while the frame opened in round 3, and now DESCENDING at a similar rate as the
     * push-in closes.
     * A spring with a zero reference velocity lags that by v/√k and the ground line sags —
     * measured, 77.5 %H → 75.1 %H and back over the flight, which is exactly the "the horizon
     * moves" defect read at a quarter of its usual size. Damping against the want's own
     * numeric rate removes it; it also subsumes the old `v.y * 0.45` guess for the case where
     * a towering arc really is pushing the camera up.
     */
    if (this._lastWantY === null) this._lastWantY = wantY;
    const rawVelY = (wantY - this._lastWantY) / dt;
    this._lastWantY = wantY;
    this.wantVel.y += (rawVelY - this.wantVel.y) * smooth;

    /**
     * ACQUISITION. The instant the mark overtakes the floor the camera stops gliding and starts
     * tracking, and it is handed the projectile's own x velocity as it goes — the ANALYTIC want
     * velocity, not the numeric one, because at the crossing step the numeric derivative is
     * still half made of the old, nearly stationary, clamped want. Seed it from that and the
     * spring starts at rest against a want already running at 25 m/s, winds up over ~120 ms and
     * eats a two-unit hole in the composition: measured, the projectile sat at 65.5 %W instead
     * of 58 and the slingshot was STILL 3 %W inside the frame at the moment of impact, because
     * the camera was two units short of where the composition said it should be. Seeded, the
     * handover is invisible — same position, same velocity, different controller.
     */
    /**
     * …and it must happen EXACTLY ONCE. `tracking` is `idealX > floorX`, and a changing frame
     * width moves `idealX` on its own (the mark offset is (mark − 0.5)·vw), so it can dip back
     * under the monotone floor for a single step. Gating the seed on
     * `!this._tracking` therefore re-fired it every time the floor grazed — measured, four
     * times on the canonical shot — and each re-fire slams the camera's velocity AND its
     * feedforward reference back up to the projectile's 13 m/s while the composition's own want
     * is travelling at 6. The spring then holds `pos − want = (c/k)(ref − vel) > 0`, the camera
     * sits permanently AHEAD of its own composition, and the projectile sags to 54.6 %W — under
     * the rubric's floor — with the rig reporting itself on its mark. Once acquired, stay
     * acquired: the numeric feedforward is correct from there on and needs no help.
     */
    /**
     * ROUND 8 — SEED THE WANT'S OWN RATE, NOT THE BALL'S. The seed was `v.x` because the want
     * at the handover was the ball's screen mark, so the want's rate WAS the ball's rate. That
     * is still true in the one case the handover survives in (the 70 %W boundary picking up a
     * flyover — `boundX = p.x − 0.2·vw`, whose derivative is v.x), and it is emphatically false
     * for the traverse, which travels at ~4 m/s against a 13 m/s ball: seeding 13 there would
     * fire the camera three times faster than its own composition and cost the whole pan back
     * as overshoot. So the seed is chosen by which term is actually driving the want.
     */
    if (tracking && !this._acquired) {
      const seed = (this._leadEndX !== null && idealX === traverseX) ? rawVelX : v.x;
      this.vel.x = seed; this.vel.y = 0; this.wantVel.x = seed;
      this._acquired = true;
    }
    this._tracking = tracking;
    /**
     * Stiff, because the want is not a noisy signal — it is the projectile's own smooth
     * trajectory plus a smooth dolly — and any residual softness shows up directly as the mark
     * drifting off its number. At 18 the camera sat ~0.5 units behind the solved position while
     * the dolly was still closing, which is 2 %W of composition given away for nothing.
     *
     * 30 was not enough either, and the reason is worth writing down because it is not a feel
     * problem, it is arithmetic. Velocity feedforward cancels the FIRST-order lag; what is left
     * is the second-order one, `pos − want = −A/k` for a want accelerating at A. The want here
     * is `p.x − (mark − 0.5)·vw` and vw is a multi-unit dolly move, so A swings ±25 m/s² across
     * the arrival ramp — which at k = 30 is 0.8 world units, i.e. 1.6 %W of composition, and it
     * showed up exactly there: the projectile sagged to 54.4 %W mid-ramp, under the
     * rubric's 55 %W floor, while the camera reported itself perfectly on its want. At 110 the
     * same A costs 0.007 units. It is stable by a mile at FIXED = 1/120 (c·dt = 0.17, and the
     * explicit-Euler limit is k ≪ 4/dt² = 57600) and it does not read as rigid, because the
     * thing it is now rigidly holding is a composition that is itself moving.
     */
    this.stiffness = COMPOSE.trackStiffness;
  }

  decayShake(dt) {
    if (this.shake > 0) {
      this.shake *= Math.exp(-this.shakeDecay * dt);
      if (this.shake < 0.004) this.shake = 0;
    }
  }

  /**
   * Deterministic pseudo-noise shake, in %H of the current frame so the same punch reads the
   * same at every zoom and on every screen. sin() of simTime — no rng, no wall clock, so the
   * same shot shakes identically in every capture and every replay.
   *
   * NO ROLL, NO TILT, EVER. `cam.up` is hard-set to +Y and lookAt is always straight down -Z:
   * that is what makes eye level exactly 50 %H in every frame and makes a pure X pan
   * incapable of moving the horizon.
   */
  commit(t) {
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      const amp = this.shake * COMPOSE.shakeMaxPctH * (this._hh * 2);
      sx = (Math.sin(t * 51.3) * 0.62 + Math.sin(t * 88.7 + 1.7) * 0.38) * amp;
      sy = (Math.sin(t * 43.1 + 2.4) * 0.62 + Math.sin(t * 97.2 + 0.6) * 0.38) * amp * 0.8;
    }
    const cx = this.pos.x + sx;
    const cy = this.pos.y + sy;
    this.cam.position.set(cx, cy, this.dist);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(cx, cy, 0);

    /**
     * Depth cues are a function of how far back the camera is, so the camera owns them.
     * A fixed fog range that looked right at 32 units turns the whole playfield into pale
     * blue nothing at the 100+ units a portrait phone needs. Relative ranges keep the play
     * plane perfectly sharp at every zoom and give the distant hills a constant ~10 % haze.
     */
    const fog = world.scene?.fog;
    if (fog) { fog.near = this.dist + 14; fog.far = this.dist + 190; }
    if (this.cam.far < this.dist + 210) { this.cam.far = this.dist + 210; this.cam.updateProjectionMatrix(); }
    /**
     * Keep the shadow frustum centred on what we are looking at, or blocks at the right-hand
     * end of a level fall outside the 40-unit ortho box and silently lose their contact
     * shadows. The light and its target slide TOGETHER so the key-light DIRECTION is
     * unchanged — every contact shadow in the game still points the same way (P7).
     */
    const sun = world.sun;
    if (sun?.target) {
      if (sun.userData.homePos === undefined) {
        sun.userData.homePos = sun.position.clone();
        sun.userData.homeTgt = sun.target.position.clone();
      }
      const h = sun.userData.homePos, ht = sun.userData.homeTgt;
      sun.position.set(h.x + cx, h.y, h.z);
      sun.target.position.set(ht.x + cx, ht.y, ht.z);
      sun.target.updateMatrixWorld();
    }
  }

  // --- probes -------------------------------------------------------------
  /** The visible world box right now, for tests and for anything that needs screen maths. */
  view() {
    const t = Math.tan(this.cam.fov * DEG / 2);
    const vh = 2 * this.dist * t;
    return { vw: vh * this.cam.aspect, vh, cx: this.cam.position.x, cy: this.cam.position.y };
  }
}

// --- maths -----------------------------------------------------------------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Exponential approach with a hard arrival: never asymptotic, never overshoots. */
function approach(v, want, f, eps) {
  const d = want - v;
  if (Math.abs(d) < eps) return want;
  return v + d * f;
}

/**
 * Semi-implicit critically damped spring — stable at any dt, never overshoots at damping 1.
 * `ref` is the target's own velocity: damping against (vel - ref) rather than (vel - 0) is
 * what removes the steady-state lag when chasing something that is moving.
 */
function spring(pos, vel, want, ref, k, z, dt) {
  const c = 2 * z * Math.sqrt(k);
  vel.x += (-k * (pos.x - want.x) - c * (vel.x - ref.x)) * dt; pos.x += vel.x * dt;
  vel.y += (-k * (pos.y - want.y) - c * (vel.y - ref.y)) * dt; pos.y += vel.y * dt;
}

function springScalar(v, vel, want, k, z, dt) {
  const c = 2 * z * Math.sqrt(k);
  vel += (-k * (v - want) - c * vel) * dt;
  return { v: v + vel * dt, vel };
}
