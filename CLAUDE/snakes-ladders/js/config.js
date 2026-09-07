/* config.js — the single source of truth for every tunable number in Saanp Seedhi.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  FEEL NUMBERS LIVE HERE AND NOWHERE ELSE.
 *
 *  If another module hard-codes a duration, an easing name, a camera angle, a
 *  hex colour, a material roughness, a particle count, a font size or a hit-rect
 *  size, that is a bug — it belongs in this file. One place to tune, one place
 *  to diff, one place a reviewer has to read to know how the game feels.
 *
 *  Every number below that DESIGN.md states is transcribed verbatim from
 *  DESIGN.md §6–§11 (the motion spec is §9). Numbers DESIGN.md does not state
 *  carry a one-line '//' saying why they were chosen — almost always "this is
 *  what Ludo King does and it is the reason it feels instant".
 *
 *  Sources: DESIGN.md §3 beat sheet · §4 board · §5 teaching moment ·
 *  §6 3D direction · §7 art direction · §8 audio · §9 motion spec · §10 rules ·
 *  §11 setup · §12 endgame · §13 a11y.  CONTRACT.md: coordinates, perf budget.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const VERSION = '1.0.0';

/* Flip to true to unlock console tracing. Nothing logs in shipped code
   unless this is on — CONTRACT.md "Ground rules". */
export const DEBUG = false;

/* ═══════════════════════════════════════════════════════════════════════════
   1. TIMING — DESIGN.md §9, the motion spec. All values in milliseconds.
      'ease' names refer to util.js's 'ease' map: linear|out|in|inOut|outQuint|
      back|elastic|bounce|settle.
   ═══════════════════════════════════════════════════════════════════════════ */

export const timing = {
  /* — boot & setup — */
  boardFadeIn:      400,   // §9 #1  once, on boot
  setupIn:          260,   // §9 #2
  setupOut:         180,   // §9 #2
  oneLineIn:        300,   // §9 #3  the equal-start line
  oneLineHold:     2600,   // §9 #3
  oneLineOut:       300,   // §9 #3

  /* — handoff — */
  handoffIn:        220,   // §9 #4  scale 0.94 -> 1.00, mild `back`
  handoffOut:       180,   // §9 #5  upward wipe
  handoffToLive:    180,   // §3.1  card wipes up, board live at +180ms

  /* — dice — CONTRACT.md quotes diceRoll:900; that is tumble+settle+pip. — */
  diceRoll:         900,   // §3.1  total: 700 tumble + 140 settle + 60 pip pop
  diceIdlePulse:   1000,   // §9 #7  sine loop, scale 1.00 -> 1.06 -> 1.00
  dicePress:         60,   // §9 #8  scale -> 0.92
  diceHaptic:        12,   // §3.1  navigator.vibrate on press
  diceTumble:       700,   // §9 #9  BAKED curve, randomised axis. Never physics.
  diceSettle:       140,   // §9 #10 overshoot bounce; number legible at 840ms
  dicePipPop:        60,   // §9 #11 1.00 -> 1.15 -> 1.00
  sixFlash:         700,   // §10.4 gold flash on the die face for a six. Was 450: at that
                           // length the 1-in-6 jackpot was the quietest beat in the loop.

  /* — token travel — */
  hopPerCell:       165,   // §9 #12 ONE HOP PER CELL. Never tween to destination.
  tokenSquash:      105,   // §9 #13 tokens.squash -> 1.00 on each landing. settleAnim()
                           // multiplies this by 1.85, so arrival is a ~194ms beat: deep
                           // enough to read on a 21px-tall token, slow enough not to glitch.
  tokenFanOut:      180,   // shuffle when 2+ tokens share a cell. Ludo King re-fans
                           // in under 200ms so the eye never loses a piece.
  placeInstant:      90,   // placeAt()/resume — fast enough to read as "already there"

  /* — ladder — */
  ladderClimb:     1100,   // §9 #14 four rung ticks
  ladderRungTick:   275,   // ladderClimb / 4 rungs — the tick lands on each rung

  /* — snake — */
  snakeFreeze:       90,   // §9 #15 whole board holds still. This is what makes it land.
  snakeLunge:       120,   // §9 #16 head lunge, `back`
  snakeSlide:      1100,   // §9 #17 CONSTANT for every snake regardless of length.
                           // The longest snake must not feel like the longest punishment.
  snakeRecoil:      400,   // §9 #18 shield absorbed — head jerks away, token does not move

  /* — the Bura Waqt Fund — */
  shieldRing:       240,   // §9 #19 brass ring at token base, then a mint particle burst
  shieldGrantRibbon:2200,  // "Priya ko Bura Waqt Fund mila." Long enough to be read
                           // across a table, short enough not to stall the turn.

  /* — the teaching moment, §5 + §9 #20–#26 — */
  lessonIn:         260,   // §9 #20 ribbon slides up 88dp, ease-out-cubic
  lessonAt:         0.60,  // §3.1  ribbon fires at travel * 0.6 — readable BEFORE landing
  ribbonPulse:      120,   // §9 #21 left edge pulses once on the landing frame
  ribbonHold:      1800,   // §9 #22
  ribbonOut:        200,   // §9 #22
  ribbonKill:       120,   // §5.2  any tap, any moment
  cardGrow:         300,   // §9 #23 ribbon grows upward into the card
  cardStagger:  [0, 180, 600, 800, 1000, 1200], // §9 #24 what/number/name/way-out/
                           // counterparty/button. This ORDER is the pedagogy (§5.3).
  countUp:          400,   // §9 #25 rupee figure counts up from zero
  cardOut:          200,   // §9 #26 tap anywhere, any time
  cardAutoAdvance: 4500,   // §5.4 #3 home mode only. NEVER in workshop mode.
  lessonDuck:       260,   // §8 all audio ducks to 30% for 260ms so nothing competes

  /* — quiz (Sabka Sawaal) — */
  quizChipPress:     80,   // §9 #27
  quizReveal:       400,   // §9 #28 count-up + `correct`

  /* — event (Jhatka) & milestone — */
  eventCardIn:      250,   // §9 #29 slides in from the left
  milestoneIn:      300,   // §9 #30
  milestoneHold:   2600,   // §9 #30

  /* — camera, §6.2 + §9 #6/#32/#33 — */
  cameraEase:       700,   // §9 #6  return to overview(). Every turn. Non-negotiable.
  cameraFollow:     400,   // §6.2  dolly to keep the token in the lower-middle third
  cameraLadderOut:  500,   // §9 #32 lift 10deg, pull back 12%
  cameraLadderBack: 500,   // §9 #32
  cameraSnakeIn:    400,   // §9 #33 dip 8deg, push in 12%
  cameraSnakeBack:  500,   // §9 #33
  cameraSpringBack: 400,   // §6.2  two-finger yaw drag springs back on release
  cameraLegibleBy:  900,   // §6.2  HARD RULE: whole board legible within 900ms of any
                           // action ending. Nothing may exceed this.

  /* — turn furniture — */
  plaqueGlowMove:   300,   // §9 #31
  turnTimer:      20000,   // §3.1  home mode only; AUTO-ROLLS on expiry, never skips.
                           // Workshop mode has no timer at all.
  botThink:         900,   // §10.8 Mithu's "thinking" beat before her turn auto-plays
  botChirp:         260,   // one soft chirp under the think beat. That is her personality.
  turnBudget:     10000,   // §3.1  design budget for a real pass-and-play turn (4 players)
  turnBudgetSolo:  4000,   // §10.8 solo/bot: handoff card removed, ~6 minute game

  /* — finish & endgame, §11–§12 — */
  finishRise:       700,   // §9 #34 square 100 rises 40px out of the board plane
  celebrate:       1600,   // §9 #35 confetti, non-modal, tap-skippable
  endgameIn:        400,   // §9 #36 scorecard in
  replayReset:      800,   // §12  "Phir se khelo" — board back in under 800ms

  /* — misc — */
  toast:           2400,   // ui.js transient line. Two beats longer than a ribbon hold
                           // minus its slide, so it never collides with one.
  focusRingFade:    120,   // a11y focus ring — fast, never a flourish
  autosaveDebounce: 200,   // §11 localStorage write after every resolved turn
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. EASING — which curve each animation uses. DESIGN.md §9, column 3.
      Values are keys into util.js 'ease'. 'sine' and 'baked' are handled by
      their owning modules (dice tumble is a baked curve, not an easing).
   ═══════════════════════════════════════════════════════════════════════════ */

export const easing = {
  boardFadeIn:  'out',
  setupIn:      'out',      setupOut:      'inOut',
  oneLine:      'out',
  handoffIn:    'back',     handoffOut:    'out',      // #4 mild back
  diceIdle:     'sine',     dicePress:     'out',
  diceTumble:   'linear',   diceSettle:    'back',     dicePipPop: 'out',
  hop:          'inOut',    tokenSquash:   'out',
  ladderClimb:  'inOut',
  snakeLunge:   'back',     snakeSlide:    'inOut',    snakeRecoil: 'back',
  shieldRing:   'out',
  ribbonIn:     'out',      ribbonPulse:   'out',      ribbonOut:  'out',
  cardGrow:     'out',      cardStagger:   'out',      cardOut:    'inOut',
  countUp:      'out',
  quizChip:     'out',      quizReveal:    'out',
  eventCardIn:  'out',      milestoneIn:   'out',
  camera:       'inOut',    plaqueGlow:    'inOut',
  finishRise:   'back',     celebrate:     'out',      endgameIn:  'out',
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. REDUCED MOTION — DESIGN.md §9 closing block, and the 'Kam hilna' toggle.
      "Every duration halved; #12 loses its arc but keeps the per-cell step and
       the tik; #14 and #17 become a 300ms fade-and-place; #6, #32, #33, #34
       removed entirely; #35 becomes a static gold bloom. Ribbon and card
       timings (#20–#26) are UNCHANGED, so the teaching is identical."
      Use 'dur(key)' below — never branch on prefersReducedMotion() by hand.
   ═══════════════════════════════════════════════════════════════════════════ */

export const reduced = {
  scale: 0.5,                       // every duration halved…
  keepArc: false,                   // …#12 loses its arc, keeps the step and the tik
  fadeAndPlace: 300,                // #14 ladderClimb and #17 snakeSlide become this
  /* Untouched, so the teaching is byte-identical between the two modes. */
  unchanged: ['lessonIn', 'ribbonPulse', 'ribbonHold', 'ribbonOut', 'ribbonKill',
              'cardGrow', 'countUp', 'cardOut', 'cardAutoAdvance', 'lessonDuck',
              'quizChipPress', 'quizReveal', 'turnTimer', 'toast', 'shieldGrantRibbon',
              'autosaveDebounce', 'cardStagger', 'lessonAt'],
  /* Removed entirely — the camera does not move, square 100 does not rise. */
  removed:   ['cameraEase', 'cameraFollow', 'cameraLadderOut', 'cameraLadderBack',
              'cameraSnakeIn', 'cameraSnakeBack', 'cameraSpringBack', 'finishRise'],
  /* #35: a static gold bloom instead of a confetti burst. */
  celebrate: 600,
  particles: 0,
  shake:     false,
};

/* ═══════════════════════════════════════════════════════════════════════════
   4. BOARD — CONTRACT.md "Board coordinate system" (fixed) + DESIGN.md §4.
      10x10, square 1 bottom-left, boustrophedon, 100 top-left.
      +X right, +Z toward camera, +Y up. X,Z in [-5,+5]. One cell = 1 unit.
      Board top surface at y = 0. Tokens stand on y = 0.
   ═══════════════════════════════════════════════════════════════════════════ */

export const board = {
  size:        10,       // 10x10 = 100 squares
  cell:        1,        // one cell = one world unit — CONTRACT
  half:        5,        // board spans [-5, +5] on X and Z — CONTRACT
  thickness:   0.35,     // CONTRACT.md config.js sketch
  bevel:       0.035,    // tile edge catch-light. Small enough to stay merged geometry.
  border:      0.45,     // stained mango-wood frame width, in world units
  borderRise:  0.06,     // frame stands proud of the tile plane so the bevel reads
  borderBevel: 0.06,     // §7.2 "a visible bevel catching the key light"
  rowRise:     0.09,     // §4  the ghat road climbs 0.09/row; row 9 sits 0.81 above row 0.
                         // "Near the top" becomes a fact about the picture, not a number.
  tileGap:     0.02,     // a hairline of frame showing between tiles. Any more and 100
                         // tiles stop reading as one painted board.
  startPad:    { x: -4.52, y: 0, z: 5.22 },  // cellToWorld(0) — the wooden front rail
                         // directly below square 1. Off the tiles, so a resting token never
                         // sits on square 1, but INSIDE the fitted frame: at 96% of a phone's
                         // width anything beyond the rail is cropped, and a player who cannot
                         // see her own piece on turn one has been told nothing.
  numberSize:  0.34,     // billboarded sprite height, in cell units — §6.4 rule 2
  numberInset: 0.30,     // numeral sits in the tile's lower-left corner, cell units
  zoneStep:    0.02,     // the carved stone step marking a zone edge (§4)
  zones: [               // §4 five zones. `tint` keys into colors.zoneTints.
    { from:  1, to:  20, key: 'ghar',     tint: 0 },
    { from: 21, to:  40, key: 'buraWaqt', tint: 1 },
    { from: 41, to:  60, key: 'suraksha', tint: 2 },  // the only zone lit cooler
    { from: 61, to:  80, key: 'badhna',   tint: 3 },
    { from: 81, to: 100, key: 'manzil',   tint: 4 },
  ],

  /* Furniture sits ABOVE the tile plane so no square number is ever obscured.
     This is the legibility fix that justifies the whole renderer (§6.1). */
  ladderHeight: 0.27,    // bamboo rails stand on posts clear of the tiles
  ladderRungs:  4,       // §7.2 "four rungs"
  ladderWidth:  0.28,    // narrower than a cell so the numerals stay readable beside it
  ladderRail:   0.027,   // rail radius
  snakeHeight:  0.22,    // body rests on low supports above the tiles
  snakeSupports:3,       // head, mid, tail — enough to read as an object on a board

  /* §4 "the snake's body thickness is proportional to its rupee cost, so you can
     read the price of a product from across the room before you can read a word."
     Costs on this board run ₹8,000 (96→88) to ₹2,50,000 (27→9); log scale, because
     linear would make seven of the eight snakes the same thickness. */
  snakeRadiusMin: 0.055,
  snakeRadiusMax: 0.135,
  snakeCostRange: [8000, 250000],
  snakeCostScale: 'log',
  snakeSpineText: 0.20,  // §4 the gold rupee cost painted along the spine, cell units
                         // (20sp at the default camera framing)

  finishRisePx:  40,     // §9 #34 square 100 rises 40 CSS px out of the plane
};

/* ═══════════════════════════════════════════════════════════════════════════
   5. COLOURS — DESIGN.md §7.4 and CONTRACT.md "Brand (non-negotiable)".
      Each colour means EXACTLY ONE THING everywhere. Numbers are 0xRRGGBB for
      three.js; 'css' mirrors them as strings for DOM modules, which should
      normally use var(--teal) etc. from index.html instead.
   ═══════════════════════════════════════════════════════════════════════════ */

export const colors = {
  /* IFM palette — semantic, one meaning each */
  cream:   0xf7faf9,  // board surface, every card ground
  navy:    0x1a3a5c,  // all body text, all square numerals, the board frame
  ink:     0x1a3a5c,  // alias for navy, per the IFM brand doc
  teal:    0x2a9d8f,  // LADDERS · ladder cards · active player · primary button. Progress.
  tealD:   0x1f7d72,  // pressed states, the 4px button under-edge
  muted:   0x5a7d8a,  // counterparty lines, the Jhatka card edge, disabled ink
  mint:    0xbde9e4,  // ladder-foot tiles, the "way out" band on every card
  mintLt:  0xe0f3f0,  // zone tints, the standings strip ground
  gold:    0xc8900a,  // RUPEE NUMBERS · milestones · square 100 · the snake's back.
                      // Money and arrival — nothing else, ever.
  goldLt:  0xfff5d6,  // milestone tile fill, the finish bloom

  /* §7.4 — snakes only. Deliberately NOT alarm red: a nine-year-old should laugh. */
  /* Measured on the render, not picked by eye: the old clay (0xc0674a) came out
     of the pipeline at (112,77,48) — indistinguishable from the frame (118,71,36)
     and the table (118,97,69). A snake read as furniture. These are lifted and
     saturated so warm clay is a reserved semantic again. */
  clay:    0xd8734f,
  clayD:   0xa8452c,  // the shaded side of a terracotta body
  indigoPattern: 0x2b3f7a, // kalamkari pattern painted on the snake glaze

  /* materials (§7.2) */
  bamboo:  0xa8791f,  // raw bamboo rail. Was 0xd8c48a, which measured 1.02:1 against the
                      // tile — invisible on a 400-nit LCD. This lands ~3.3:1 (WCAG floor
                      // for non-text graphics is 3:1) against the measured tile.
  bambooTip: 0xf0c94a,// gold-leaf rung tips only — still the bright accent above the rail
  wood:    0x6e4426,  // stained mango frame, darkened so a clay snake reads off it
  woodDark:0x4a2c17,
  dice:    0xefe3cb,  // pale wood die
  dicePip: 0x1a3a5c,  // navy pips
  brass:   0xc9a227,  // brass tokens, the lota, the temple bell
  clayToken: 0xb5754b,// unglazed clay tokens

  /* lighting (§7.3) — late-afternoon light through a window. Never studio. */
  skyLight:   0xf7faf9,
  groundLight:0xe8d9c0,  // warm floor bounce off the table
  keyLight:   0xfff6e4,

  /* zone tints, laid over --mint-lt at very low alpha (see tokens.zoneTintAlpha) */
  zoneTints: [0xe0f3f0, 0xe6efe4, 0xdfe7ee, 0xe4f0e6, 0xfff5d6],

  /* semantic edge colours for the ribbon's 3dp left edge (§5.2) */
  edgeLadder:   0x2a9d8f,  // teal
  edgeSnake:    0xd8734f,  // warm clay — tracks `clay` above
  edgeMilestone:0xc8900a,  // gold
  edgeEvent:    0x5a7d8a,  // muted grey
  edgePlain:    0x1a3a5c,  // navy
};

/* String mirrors, for CSS-in-JS and canvas 2D. Same values, no new colours. */
export const css = Object.fromEntries(
  Object.entries(colors)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
);

/* ═══════════════════════════════════════════════════════════════════════════
   6. TOKENS — DESIGN.md §7.4 + §11.
      Four maximally-separated hues drawn OUTSIDE the semantic palette so a
      token is never confused with a meaning (teal is reserved for progress).
      Checked against deuteranopia and protanopia; red and orange are never both
      in play. Colour is NEVER the only signal — every token also has a distinct
      silhouette repeated on the plaque, the handoff card and the standings strip.
   ═══════════════════════════════════════════════════════════════════════════ */

export const tokens = {
  players: [
    { id: 'p1', key: 'matka',  name: 'Khiladi 1', emoji: '🏺',
      color: 0x3a4f9b, colorD: 0x2c3c78, css: '#3a4f9b', hue: 'indigo',
      material: 'clay',  label: 'Matka',  // wide-bellied pot — the widest silhouette
      /* deuteranopia: reads dark blue; protanopia: reads blue. Separated from
         every other token by >40 CIE ΔE under both simulations. */ },
    { id: 'p2', key: 'diya',   name: 'Khiladi 2', emoji: '🪔',
      color: 0xe08a1e, colorD: 0xb06a12, css: '#e08a1e', hue: 'saffron',
      material: 'clay',  label: 'Diya',   // low, flared, with a flame tip — lowest profile
    },
    { id: 'p3', key: 'chaabi', name: 'Khiladi 3', emoji: '🔑',
      color: 0x8a3f6b, colorD: 0x6b2f53, css: '#8a3f6b', hue: 'plum',
      material: 'brass', label: 'Chaabi', // tall and thin with a toothed head
    },
    { id: 'p4', key: 'ghanti', name: 'Khiladi 4', emoji: '🔔',
      color: 0x3f7a4a, colorD: 0x2f5c38, css: '#3f7a4a', hue: 'forest',
      material: 'brass', label: 'Ghanti', // domed with a handle on top
    },
  ],
  /* §10.8 — Mithu is a turn policy inside game.js, not a rules.js concept. */
  bot: { id: 'bot', key: 'mithu', name: 'Mithu', emoji: '🦜',
         color: 0xc9a227, colorD: 0x9a7c1d, css: '#c9a227', hue: 'brass',
         material: 'brass', label: 'Mithu' },

  height:      0.62,   // tokens stand TALLER than a tile so they read above the grid (§6.4)
  radius:      0.20,   // 0.20 of a cell — big enough to hit visually, never a tap target
  hopArc:      0.86,   // §9 #12 arc height, in cells. Authored in SCREEN pixels, not world
                       // units: at elevationDeg 48 a 0.55 arc projects to ~12 px on a 33 px
                       // phone cell (0.36 of a cell), under the 0.5–0.8 band the reference
                       // specifies. 0.86 puts the apex back at ~0.55 of a cell AS SEEN.
  squash:      [1.20, 0.83],  // §9 #13 x-scale, y-scale on landing. Same reasoning: 0.94 on
                       // a 21 px-tall token is 1.3 px of deformation — invisible. 0.83 is
                       // 3.6 px, the smallest squash a person reads at arm's length.
  fanRadius:   0.36,   // multiple tokens on one cell fan out and NEVER fully overlap.
                       // 0.24 gave 11 px of separation between 13 px-wide tokens on a phone;
                       // 0.36 gives ~24 px, wider than a token.
  fanAngles:   [180, 0, 214, 326],  // degrees; deterministic so a token never jumps seat.
                       // The old 45/135/225/315 spread ALONG the camera axis, so at a
                       // three-quarter view the back pair hid behind the front pair.
                       // 180/0 is the pure screen-horizontal axis — zero occlusion, maximum
                       // separation; 214/326 pull the back pair out and toward the camera.
  activeRing:  0.30,   // teal glow ring radius under the active token, in cells
  activeRingPulse: 1400, // ms; slower than the dice pulse so the two never sync and beat
  shieldOrbit: 0.30,   // the brass lota rides this far from the token centre (§10.6)
  shieldSize:  0.14,
  contactShadow: 0.26, // blob shadow radius. On low tier this is the ONLY shadow.
  zoneTintAlpha: 0.08, // zone tint over the tile ground; any stronger and it reads as state
};

/* ═══════════════════════════════════════════════════════════════════════════
   7. CAMERA — DESIGN.md §6.2. Angles in degrees, distances in world units.
      The rule underneath all of it: the camera must ALWAYS return to a pose
      where the whole board is legible within 'timing.cameraLegibleBy' of an
      action ending, and it resets to 'overview' on every single handoff.
   ═══════════════════════════════════════════════════════════════════════════ */

export const camera = {
  fov:            26,      // §6.2 near-orthographic and pulled back, so a tile at row 9
                           // is the same size as a tile at row 0
  near:           0.5,
  far:            220,

  /* the default rest pose — this is where the camera LIVES */
  elevationDeg:   48,      // §6.2 three-quarter isometric. Was 38: a square board can only
                           // project to 0.62x its width in height at 38deg, so the board
                           // filled 85% of a phone's width but only 35% of its height —
                           // ~1600 px of dead tabletop. At 48deg it projects 0.74x.
                           // Second benefit: geometry standing h above the tile plane now
                           // projects h/tan(48) = 0.20 cells toward the viewer instead of
                           // 0.28, so furniture covers 29% less of each numeral.
  azimuthDeg:     0,       // §6.2
  distance:       26,      // base dolly; camera.js re-fits per aspect (see `fit`)
  target:         [0, 0.30, 0],  // mid-height of the climbing road, not the tile plane
  position:       [0, 19.32, 17.40], // = distance * (0, sin48, cos48). Precomputed so a
                           // probe can assert the rest pose without trigonometry.

  /* fitting the whole board into a portrait phone, §7.5: board = 92% of width */
  fit: { widthFrac: 0.92, marginY: 1.06, minDistance: 18, maxDistance: 62 },

  focusDistance:  17,      // focusCell() — about 65% of overview. Any closer and the
                           // player loses the two rows above and below her token.
  focusEase:      'inOut',

  turnPanPx:      140,     // §6.2 ease 140 CSS px toward the active token. NEVER a rotation.
  followBandY:    [0.42, 0.72], // keep a moving token inside the lower-middle third (§6.2)

  /* dramatic moves — the only two the camera is allowed to make */
  ladderLiftDeg:  10,      // §6.2 lift 10deg…
  ladderPullPct:  0.12,    // …and pull back 12%, so the TOP of the ladder enters frame
                           // before the token gets there
  snakeDipDeg:    8,       // §6.2 dip 8deg…
  snakePushPct:   0.12,    // …and push in 12%

  finishLookUpDeg: 6,      // §6.2 the camera settles looking slightly UP at square 100.
                           // The board becomes a thing you climbed.

  /* player input — §6.2 */
  yawLimitDeg:    25,      // two-finger drag, BETWEEN TURNS ONLY, springs back
  pitchMinDeg:    30,      // pitch is not player-controllable; these clamp scripted moves
  pitchMaxDeg:    48,      // MUST be >= elevationDeg or camera.js clamps the rest pose back
                           // down and the 48deg fix above does nothing. camera.js also uses
                           // this as the portrait rest elevation, so the two are now the
                           // same number in both orientations — which is what it was in
                           // portrait already (46 rest, 46 ceiling, no ladder lift).
  pinchZoom:      false,   // disabled. Full stop.
  dragBetweenTurnsOnly: true,

  shakeMax:       0.14,    // world units. fx.shake() amplitude ceiling — a board on a
                           // table, never a explosion. Off entirely under reduced motion.
  projector: { locked: true, pushIns: false, numeralScale: 1.20 }, // §6.2 projector mode
};

/* ═══════════════════════════════════════════════════════════════════════════
   8. LIGHTING & MATERIALS — DESIGN.md §7.2 / §7.3.
      "Late-afternoon light through a window, never studio, never neon,
       never night."  One baked hemisphere + ONE directional key. That is all.
   ═══════════════════════════════════════════════════════════════════════════ */

export const lighting = {
  hemi:      { sky: colors.skyLight, ground: colors.groundLight, intensity: 1.00 },
  key:       { color: colors.keyLight, intensity: 1.1,
               elevationDeg: 40, azimuthDeg: 35 },   // §7.3, verbatim
  toneMapping: 'ACESFilmic',   // §7.3 + CONTRACT scene.js. STAYS — it is what keeps gold
                               // and brass from clipping.
  exposure:    1.28,           // §7.3. Measured: at exposure 1.0 ACES rolled the cream
                               // surface (#f7faf9 = 247,250,249) down to 192,196,190 and
                               // desaturated it, so the board read as cold grey card.
                               // Acceptance: mean tile RGB must be >= (232,234,228).
  outputColorSpace: 'srgb',    // CONTRACT scene.js
  shadow: { mapSize: 1024, bias: -0.0006, normalBias: 0.02, radius: 3.5,
            near: 4, far: 60, extent: 9 },  // High tier only.
  envIntensity: 0.55,          // a soft cream room bounce so brass is not flat black
};

export const materials = {
  /* Every value here is DESIGN.md §7.2, verbatim. */
  tile:    { roughness: 0.85, metalness: 0.0 },  // matte painted card, faint paper grain
  frame:   { roughness: 0.60, metalness: 0.0 },  // stained mango wood
  ladder:  { roughness: 0.90, metalness: 0.0 },  // raw bamboo
  ladderTip:{ roughness: 0.45, metalness: 0.85 },// gold-leaf rung tips ONLY
  snake:   { roughness: 0.45, metalness: 0.0 },  // glazed terracotta — the curve must catch
                                                 // a highlight or the gold lettering dies
  snakeGold:{ roughness: 0.40, metalness: 0.80 },// the rupee cost on the spine
  brass:   { roughness: 0.35, metalness: 0.70 }, // §7.2 tokens
  clay:    { roughness: 0.95, metalness: 0.0 },  // §7.2 tokens
  dice:    { roughness: 0.70, metalness: 0.0 },  // pale wood
  paperGrain: 0.14,   // atlas grain strength. Any more and it reads as noise on a phone.
};

/* ═══════════════════════════════════════════════════════════════════════════
   9. QUALITY TIERS — DESIGN.md §6.3, and the hard budget in CONTRACT.md.
      LOW IS GENEROUS ON PURPOSE. A ₹9,000 Android must hold 45fps during a hop,
      and the entire curriculum survives at every tier — only the hillside goes.
   ═══════════════════════════════════════════════════════════════════════════ */

const TIERS = {
  high: {
    tier: 'high',
    antialias:      true,
    pixelRatio:     2,      // §6.3
    shadows:        'soft', // one soft directional
    shadowMapSize:  1024,
    blobShadows:    true,
    particles:      60,     // §6.3 ceiling
    textureSize:    1024,   // one atlas
    anisotropy:     4,
    /* segment counts — chosen to hit §6.3's triangle targets exactly */
    snakeTubular:   260, snakeRadial: 14,   // 260*14*2 = 7,280 tri  (target 8k)
    ladderSeg:      12,
    tokenSeg:       24,
    diceBevelSeg:   4,
    numberAtlas:    true,   // billboarded numeral sprites from one atlas
    envMap:         true,
    fogged:         true,
    spineText:      true,   // the gold rupee cost along the snake's back
    confetti:       true,
  },
  mid: {
    tier: 'mid',
    antialias:      true,
    pixelRatio:     2,
    shadows:        'baked',// baked + blob
    shadowMapSize:  0,
    blobShadows:    true,
    particles:      30,
    textureSize:    1024,
    anisotropy:     2,
    snakeTubular:   130, snakeRadial: 9,    // 130*9*2 = 2,340 tri   (target 2.5k)
    ladderSeg:      8,
    tokenSeg:       16,
    diceBevelSeg:   2,
    numberAtlas:    true,
    envMap:         true,
    fogged:         true,
    spineText:      true,   // NEVER dropped — §6.4: it is the one unskippable lesson
    confetti:       true,
  },
  low: {
    tier: 'low',
    antialias:      false,
    pixelRatio:     1.5,    // §6.3
    shadows:        'none',
    shadowMapSize:  0,
    blobShadows:    true,   // the blob stays: it is what makes a hop read as a hop (§6.1)
    particles:      0,
    textureSize:    512,
    anisotropy:     1,
    snakeTubular:   80,  snakeRadial: 7,    // 80*7*2 = 1,120 tri    (target 1.2k)
    ladderSeg:      6,
    tokenSeg:       10,
    diceBevelSeg:   1,
    numberAtlas:    true,   // numerals are NEVER dropped — §6.4 rule 2
    envMap:         false,
    fogged:         false,
    spineText:      true,   // still drawn, as a flat texture strip instead of geometry
    confetti:       false,  // celebration becomes a static gold bloom
  },
};

export const quality = {
  tiers: TIERS,
  /* The live, resolved tier. Modules should read 'CFG.quality.current.<key>' and
     re-read it after a demote — applyTier() mutates this object IN PLACE so
     captured references stay valid. */
  current: { ...TIERS.mid },
  auto: true,

  /* §6.3 "Auto-demotes silently after 8 dropped frames in any 2s window, mid-game,
     preserving state. The player is never told anything is wrong, because nothing is." */
  demote: { droppedFrames: 8, windowMs: 2000, cooldownMs: 8000, frameBudgetMs: 20 },
  /* §6.3 the 2D fallback is a first-class mode, not an apology. */
  fallback2D: { onNoWebGL: true, belowFps: 25, sampleMs: 2000,
                jumpMs: 400 },   // snake/ladder jumps become a 400ms curved translate

  /* CONTRACT.md "Performance budget" — asserted by the probe, not aspirational. */
  budget: { firstPaintMs: 1800, drawCalls: 90, triangles: 220000,
            transferBytes: 1.2 * 1024 * 1024, fpsDesktop: 60, fpsPhone: 45 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   10. AUDIO — DESIGN.md §8. All synthesised in WebAudio; no asset files.
       "Warm, wooden, domestic. Nothing above ~4kHz sharp. Nothing over 400ms
        except 'win'."  Every sound has a visual twin — the game is 100%
        playable and 100% comprehensible on mute.
       Frequencies in Hz, durations in ms, gains 0..1 pre-master.
   ═══════════════════════════════════════════════════════════════════════════ */

export const audio = {
  master:        0.90,
  defaultMuted:  false,     // §8 default ON, with a persistent 44dp mute chip
  duckTo:        0.30,      // §8 all audio ducks to 30%…
  duckMs:        260,       // …for 260ms, so nothing competes with reading
  ceilingHz:     4000,      // §8 nothing above ~4kHz sharp. audio.js must lowpass here.

  sfx: {
    /* dry wooden rattle under the whole tumble — wood in a cupped hand */
    dice: { dur: 700, gain: 0.28, impulses: 9, gapMs: [60, 110], burstMs: 12,
            bandHz: 900, bandQ: 1.4, clickHz: 180, clickGain: 0.08, type: 'noise' },

    /* the settle clack at the 700ms mark */
    land: { dur: 90, gain: 0.30, bandHz: 1100, bandQ: 2, blipHz: 220,
            blipDecayMs: 40, blipType: 'triangle', type: 'noise' },

    /* THE MOST IMPORTANT SOUND IN THE BUILD. Half the table is not looking at the
       screen, and the tik is how four people count the roll together. */
    hopStep: { dur: 40, gain: 0.34, freq: 520, type: 'triangle', lowpassHz: 2000,
               decay: 'exponential', semitoneStep: 1.5, maxSteps: 6 },

    /* four plucked notes up a pentatonic run, resolving on a small brass ring.
       Pleased, never triumphant. */
    ladder: { dur: 1100, gain: 0.30, stringHz: 300, damping: 0.4, notes: 4,
              runMs: 900, scale: [0, 2, 4, 7, 9], ringHz: 880, ringPartials: 3,
              type: 'karplus' },

    /* comic and low, never a hiss, never a horror sting */
    snake: { dur: 1100, gain: 0.32, freq: 260, type: 'sawtooth',
             sweepHz: [1400, 380], sweepMs: 900,
             thumpHz: 110, thumpMs: 90, thumpDrop: 0.15 },

    /* DELIBERATELY the most satisfying sound in the product, because it is the
       most important lesson in it. A room should say "arre!" out loud. */
    shield: { dur: 700, gain: 0.42, thumpHz: 110, thumpMs: 90,
              bellHz: 1320, bellIndex: 3, bellMs: 140,
              releaseHz: [660, 880], releaseMs: 220, type: 'fm' },

    /* barely there — it exists only to say "read this" */
    lesson: { dur: 60, gain: 0.12, freq: 440, type: 'sine' },

    /* one note above the ladder resolve */
    correct: { dur: 300, gain: 0.28, freq: 988, partials: 3, type: 'fm' },

    /* NEVER fires on a wrong answer — there are no wrong answers. Blocked input only.
       Never a buzzer, never a descending trombone. 45-year-olds who left school at
       16 have been buzzed at enough. */
    wrong: { dur: 60, gain: 0.18, freq: 190, type: 'knock', lowpassHz: 900 },

    /* one temple bell */
    milestone: { dur: 900, gain: 0.34, freq: 660, partials: 3,
                 inharmonic: [1, 2.76, 5.40], type: 'fm' },

    /* serious, never comic — these are nobody's fault and the audio must not laugh */
    event: { dur: 400, gain: 0.26, freq: 140, type: 'sawtooth',
             lowpassHz: [700, 260], lowpassMs: 400 },

    /* page-turn under the handoff card */
    whoosh: { dur: 120, gain: 0.16, highpassHz: 600, type: 'noise', decay: 'fast' },

    click: { dur: 25, gain: 0.14, freq: 700, type: 'triangle' },

    /* §10.4 a six. Quieter than the settle clack (0.30) so it never becomes
       annoying at ~1 turn in 6. */
    six: { dur: 260, gain: 0.20, freq: [587, 784], type: 'triangle' },

    /* an arrival, not a jackpot. No fanfare, no crowd, no coin cascade. */
    win: { dur: 1600, gain: 0.38, freqs: [130, 195, 260], detune: 6,
           type: 'sawtooth', lowpassHz: [200, 2600], openMs: 900,
           bellHz: 660, bellDelayMs: 400 },
  },

  /* §8 no music bed by default. A loop under a pass-and-play family game becomes
     noise in the room within four minutes. */
  drone: { enabled: false, gain: 0.06, freqs: [130.8, 196.0], thinPerRow: 0.06 },
  /* §8 no voice-over ever during play. Titles and the rupee figure only, opt-in. */
  voice: { enabled: false, rate: 0.95, pitch: 1.0, titlesOnly: true },
};

/* ═══════════════════════════════════════════════════════════════════════════
   11. LAYOUT & TYPE — DESIGN.md §7.5 / §7.6 / §13. Portrait only, one layout.
       All sizes in CSS px (== dp for our purposes).
   ═══════════════════════════════════════════════════════════════════════════ */

export const layout = {
  portraitOnly:  true,
  boardWidthPct: 0.92,   // §7.5 board occupies 92% of screen width…
  boardBandPct:  [0.19, 0.81],  // …vertically centred in the middle 62%
  standingsPct:  0.12,   // §7.5 top 12% — token silhouette, name, square number, ordered
  diceTrayPct:   0.26,   // §7.5 bottom 26%
  noTouchTopPct: 0.20,   // §7.5 NOTHING interactive in the top 20% — the phone is passed
                         // one-handed across a table
  diceDrawn:     84,     // §7.5 says 64 dp. Measured: at 64 the readable up-face is only
                         // ~40x25 px, because the up-face is a fraction of the cube's
                         // silhouette at a three-quarter view. 84 puts the face at ~52x33 px
                         // and keeps the OBJECT inside Ludo King's 56–64 dp band.
  diceHit:       88,     // §7.5 hit rect
  touchMin:      48,     // §13 every hit rect >= 48dp regardless of drawn size
  touchMinHard:  44,     // CONTRACT.md absolute floor
  chip:          44,     // the हिं/EN and mute chips, top-right, always visible
  ribbonH:       88,     // §5.2 the cream band
  ribbonEdge:    3,      // §5.2 the semantic left edge
  cardMaxPct:    0.45,   // §5.3 card grows to 45% of screen height AND NEVER MORE
  cardSnakePct:  0.52,   // §5.5 snake variant only, to fit the escape line
  cardRadius:    20,     // §5.3
  cardShadow:    '0 10px 30px rgba(26,58,92,.14)',
  primaryBtnH:   56,     // §5.3 full-width teal plaque…
  primaryBtnEdge:4,      // …with a 4px darker bottom edge (tealD)
  quizChipH:     72,     // §3.2 two chunky chips
  setupPlaqueH:  72,     // §2 one row of four plaque buttons, icon over label
  handoffToken:  96,     // §2 token silhouette on the handoff card
  boardDimOnEvent: 0.15, // §9 #29 board dims 15% behind the Jhatka card
  textScales:    [1.0, 1.25, 1.50],  // §11 in-app text size step, two taps away
  maxOsTextScale: 2.0,   // §13 OS text size honoured to 200% WITHOUT clipping —
                         // the card grows and scrolls rather than truncating
};

/* ═══════════════════════════════════════════════════════════════════════════
   11b. THE DIE — DESIGN.md §3.1 · §6.4 rule 5 · §7.2 · §9 #7–#11 · §10.4.

   dice3d.js is the primary button of the product and every one of its feel
   numbers belongs here, not in that module's local defaults. It merges, in
   order: its own defaults ← 'config.dice' (this block) ← 'globalThis.CFG.dice'.
   Until this block existed the second link was dead and none of these were
   reachable from the file that claims to own every tunable.

   Sizes marked "× size" are multiples of 'size'; 'size' itself is world units,
   then re-fitted per viewport by dice3d.refitDice() to draw at
   'layout.diceDrawn' CSS px. Angles in degrees, durations in ms.

   NOTE: dice3d.js also carries 'presentTip' (13°, the constant tilt that turns
   the up-face toward the camera). It is deliberately NOT overridden here —
   it is a geometric consequence of 'camera.elevationDeg', not a feel number,
   and Object.assign leaves any key this block omits at the module default.
   ═══════════════════════════════════════════════════════════════════════════ */

export const dice = {
  size:        1.60,   // world units at the nominal 390 px portrait fit
  bevel:       0.13,   // × size. A real bevel — a hard-edged cube looks cheap
  hitRadius:   0.86,   // × size ⇒ ~100 CSS px target; layout.diceHit is 88, floor is 44
  roughness:   0.46,   // warm ivory with a soft gloss, not the 0.70 matte of materials.dice
  x:           0.45,   // × (board.half + board.border). Right of centre, §7.5
  zGap:        1.95,   // × size beyond the frame — the die must never sit on a numeral (§6.4)
  tossHeight:  0.72,   // × size
  tossDrift:  [-0.14, -0.07],  // × size, x/z — tosses toward the board and back
  idlePulse:   0.06,   // §9 #7  1.00 -> 1.06 -> 1.00 on timing.diceIdlePulse
  pressScale:  0.92,   // §9 #8  timing.dicePress
  pipPop:      0.15,   // §9 #11 1.00 -> 1.15 -> 1.00 on timing.dicePipPop
  holdAfter:   220,    // ms a press is held before the die starts to shake in the hand
  holdShake:   0.016,  // × size, peak jitter of that hold shake
  shadowAlpha: 0.26,   // contact pool under the die — matches tokens.contactShadow
  reducedMs:   250,    // reduced motion: a 250 ms cross-fade, no tumble at all
  baseYaw:     8,      // degrees. Just enough to read as hand-placed, not machine-set…
  yawJitter:   4,      // ± degrees. …and squared up, because a yawed cube hides the up-face
  sixEmissive: 0.55,   // §10.4 peak gold wash on a six. At 0.24, with a 450 ms flash, the
                       // 1-in-6 jackpot was the quietest beat in the loop; timing.sixFlash
                       // is now 700 ms and this is the matching amplitude.
};

export const type = {
  ui:      "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Lora', Georgia, serif",   // italic 600 only
  weights: { button: 800, title: 800, lesson: 600, body: 600, quiet: 400 },
  /* §7.6 — nothing below 16sp anywhere EXCEPT the two deliberately-quiet 13sp lines */
  size: {
    ribbonTitle:  22,   // Lora italic, navy
    ribbonLine:   17,   // Nunito 600
    cardWhat:     20,   // Nunito, navy — "what happened, in her own voice"
    cardNumber:   32,   // Lora, gold, alone, counting up from zero
    cardName:     15,   // Nunito bold teal, small, above the line
    cardWayOut:   16,   // Nunito, on the mint band
    counterparty: 13,   // deliberately quiet
    heritage:     13,   // Lora italic, muted, once ever per square per session
    button:       18,
    quizChip:     17,
    standings:    16,
    minimum:      16,   // hard floor for everything else
  },
  lineHeight: { tight: 1.25, body: 1.45 },
  /* §5.6 content lint mirrors — kept here so ui/lesson can truncate-guard safely */
  caps: { title: 26, ribbonLine: 90, why: 140, escape: 110, deepWords: [40, 80],
          quizQuestionWords: 12, quizChipWords: 6 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   12. RULES — the default options object handed to rules.js 'newGame()'.
       Matches DESIGN.md §10 exactly. rules.js is FINAL; these are the shipped
       defaults and the toggles behind the settings sheet (§11).
   ═══════════════════════════════════════════════════════════════════════════ */

export const rules = {
  exactFinish:        false,  // §10.3 OVERSHOOT WINS is the default, and it is measured
  mercyAfter:         2,      // §10.3 with exactFinish on: two failed attempts, then any roll
  sixExtraTurn:       true,   // §10.4 a six grants ONE extra roll
  maxConsecutiveSixes:3,      // §10.4 a third six simply ends the turn. Not a punishment.
  jhatka:             true,   // §10.5 the structural-risk deck
  shield:             true,   // §10.6 the Bura Waqt Fund — the only catch-up mechanic
};

/* Everything else that governs a session but is not a rules.js option. */
export const game = {
  seed:            20260903,   // rules.js default; setup.js re-seeds from Date.now()
  minPlayers:      2,
  maxPlayers:      4,
  eventSquares:    [15, 31, 44, 59, 73, 86],   // mirrors rules.EVENT_SQUARES for the UI
  eventCost:       4,                          // §10.5 squares
  shieldLadderFrom:25,                         // §10.6 the board's biggest lift
  shieldBehindBy:  25,                         // §10.6 auto-grant trigger
  milestones:      [10, 50, 75, 92],           // §3.2
  quizSquares:     [8, 29, 45, 61, 87],        // §4.4
  heritageSquares: [12, 51, 69, 76, 78, 99],   // §4 shown once per session, first landing
  repeatShowsRibbonOnly: true,                 // §3.2 the fourth landing on 38 reads once
  neverTwoCardsInARow:   true,                 // §3.2
  skipEverything:  true,      // §9 closing line, and CONTRACT amendment 10:
                              // EVERY animation is tap-skippable at all times, no exception
  autoRollOnTimeout: true,    // §3.1 home mode — the timer auto-rolls, it never skips
  workshopMode:    { turnTimer: false, cardAutoAdvance: false, cameraLocked: true },
  storageKey:      'snl.save.v1',      // §11 written after EVERY resolved turn
  prefsKey:        'snl.prefs.v1',
  taskKey:         'snl.task.v1',      // §12 beat 6 — the one weekly job, ticked on Saturday
};

/* ═══════════════════════════════════════════════════════════════════════════
   13. FX — DESIGN.md §9 #19/#35 and the particle ceilings in §6.3.
   ═══════════════════════════════════════════════════════════════════════════ */

export const fx = {
  confetti:   { count: 60, ms: 1600, spread: 2.4, gravity: -3.2, size: [0.05, 0.11],
                colors: [colors.gold, colors.teal, colors.mint, colors.goldLt] },
  shieldBurst:{ count: 30, ms: 240, spread: 0.9, color: colors.mint },  // §9 #19 "<= 30"
  sparkle:    { count: 12, ms: 420, color: colors.goldLt },
  dust:       { count: 8,  ms: 300, color: colors.groundLight },        // token landings
  glowRing:   { ms: 420, from: 0.2, to: 0.9, color: colors.teal },
  goldBloom:  { ms: 600, color: colors.goldLt },  // the reduced-motion celebration
  shake:      { snake: [0.06, 180], finish: [0.03, 140] },  // [strength, ms]
};

/* ═══════════════════════════════════════════════════════════════════════════
   14. THE ONE OBJECT — CFG. Import this, not the individual pieces.
   ═══════════════════════════════════════════════════════════════════════════ */

export const CFG = {
  VERSION, DEBUG,
  timing, easing, reduced,
  board, colors, css, tokens, camera,
  lighting, materials, quality, audio,
  layout, type, rules, game, fx,
};

export default CFG;

/* ═══════════════════════════════════════════════════════════════════════════
   15. REDUCED-MOTION DURATION HELPER
       Modules ask 'dur('snakeSlide')' instead of branching on reduced motion by
       hand, so §9's closing block is implemented in exactly one place.
       Returns 0 for animations that are REMOVED under reduced motion — callers
       must treat 0 as "do it instantly".
   ═══════════════════════════════════════════════════════════════════════════ */

export function dur(key, reducedMotion = false) {
  const base = timing[key];
  if (typeof base !== 'number') return 0;
  if (!reducedMotion) return base;
  if (reduced.unchanged.includes(key)) return base;
  if (reduced.removed.includes(key)) return 0;
  if (key === 'ladderClimb' || key === 'snakeSlide') return reduced.fadeAndPlace;
  if (key === 'celebrate') return reduced.celebrate;
  return Math.round(base * reduced.scale);
}

/* ═══════════════════════════════════════════════════════════════════════════
   16. TIER DETECTION
       Generous by design. We only drop to 'low' on POSITIVE evidence that the
       device is weak — a ₹9,000 Android that reports nothing useful gets 'mid',
       because a wrong 'low' is a permanently uglier game and a wrong 'mid' is
       one silent auto-demote (quality.demote) eight dropped frames later.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Renderer strings that are always weak: software rasterisers and old mobile GPUs. */
const WEAK_GPU = /swiftshader|llvmpipe|software|microsoft basic|mesa offscreen|adreno.*\b([23]\d\d|4\d\d|5[0-2]\d)\b|mali-(t\d|4\d\d|g3[0-9]|g5[0-2])|powervr.*(sgx|ge8[01]|rogue g6)|videocore|tegra [23]/i;

/* Renderer strings that are always strong: desktop discretes, Apple silicon,
   and the current generation of Android flagship GPUs. */
const STRONG_GPU = /apple (a1[2-9]|a2\d|m[1-9])|apple gpu|nvidia|geforce|radeon|rx \d{3,4}|arc a\d|iris xe|adreno.*\b(6[5-9]\d|7\d\d|8\d\d)\b|mali-g(6[89]|7\d|[89]\d)|immortalis|xclipse/i;

/** Is WebGL available at all? §6.3 — no WebGL means the 2D fallback, which is a
 *  first-class mode, not an apology. Kept separate from detectTier() because
 *  CONTRACT.md's getTier() only ever returns low|mid|high. */
export function hasWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/** Read the unmasked GPU string, or '' if the browser will not tell us. */
export function gpuString() {
  if (typeof document === 'undefined') return '';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const s = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(s || '');
  } catch { return ''; }
}

/**
 * Pick a starting quality tier from device memory, core count and the GPU string.
 * @returns {'low'|'mid'|'high'}
 */
export function detectTier() {
  // node / SSR / any non-DOM host — stay neutral, never guess 'low'
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return 'mid';
  if (!hasWebGL()) return 'low';

  const gpu    = gpuString();
  const mem    = navigator.deviceMemory;               // undefined on Safari/iOS
  const cores  = navigator.hardwareConcurrency || 0;   // 0 when unreported
  const dpr    = (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  const touch  = (navigator.maxTouchPoints || 0) > 0;

  /* Hard floor: a software rasteriser or a 2016-era mobile GPU cannot hold 45fps
     however many cores it claims. */
  if (gpu && WEAK_GPU.test(gpu)) return 'low';
  /* Hard ceiling: a known-strong GPU wins outright, even on a 4GB machine —
     deviceMemory is capped at 8 by the spec and lies on plenty of phones. */
  if (gpu && STRONG_GPU.test(gpu)) return 'high';

  /* Otherwise, score. Every unknown scores 0, so a device that tells us nothing
     lands on 'mid'. */
  let score = 0;
  if (mem !== undefined) {
    if (mem <= 2) score -= 2; else if (mem <= 3) score -= 1;
    else if (mem >= 8) score += 2; else if (mem >= 6) score += 1;
  }
  if (cores) {
    if (cores <= 2) score -= 2; else if (cores <= 4) score -= 1;
    else if (cores >= 12) score += 2; else if (cores >= 8) score += 1;
  }
  /* A cheap phone almost always pairs a low-density screen with few cores.
     A high-DPR phone with few cores is the classic 45fps trap — nudge it down. */
  if (touch && dpr >= 3 && cores && cores <= 4) score -= 1;
  /* Desktop-shaped devices (no touch, real cores) get the benefit of the doubt. */
  if (!touch && cores >= 8) score += 1;

  if (score <= -2) return 'low';
  if (score >= 2)  return 'high';
  return 'mid';
}

/**
 * Apply a tier. Mutates 'CFG.quality.current' IN PLACE so every module that
 * captured a reference to it sees the change after a silent auto-demote.
 * @param {'low'|'mid'|'high'|'auto'} t
 * @returns {object} the resolved tier object (=== CFG.quality.current)
 */
export function applyTier(t) {
  const name = (t === 'auto' || !t) ? detectTier() : t;
  const next = TIERS[name] || TIERS.mid;
  for (const k of Object.keys(quality.current)) delete quality.current[k];
  Object.assign(quality.current, next);
  quality.auto = (t === 'auto' || !t);
  if (typeof devicePixelRatio === 'number') {
    quality.current.pixelRatio = Math.min(next.pixelRatio, Math.max(1, devicePixelRatio));
  }
  return quality.current;
}

/** The next tier down, or null at the bottom. Used by scene.js's silent demote. */
export function demoteTier(from = quality.current.tier) {
  return from === 'high' ? 'mid' : from === 'mid' ? 'low' : null;
}

export function getTier() { return quality.current.tier; }
