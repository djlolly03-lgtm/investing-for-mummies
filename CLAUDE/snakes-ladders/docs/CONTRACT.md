# Saanp Seedhi — Engineering Contract

**Every module owner MUST obey this file.** It exists so ~15 agents can work on ~15 files
in parallel without breaking each other. If you need to change an interface here, you may
NOT do it silently — say so loudly in your final report.

## Ground rules

- Vanilla ES modules, relative imports only. `import * as THREE from '../vendor/three.module.js'`
- **No build step. No npm. No CDN at runtime** except Google Fonts in `index.html`.
- No framework. No TypeScript. Plain modern JS (ES2022) — top-level await is allowed.
- **You own exactly one file.** Never edit another module's file. Never edit `index.html`
  unless you are the shell owner. If you need something from another module, use its
  documented interface; if it doesn't exist yet, code against the contract anyway.
- Every module exports named functions. No default exports except where stated.
- No `console.log` left in shipped code except behind `DEBUG` in `config.js`.
- Comment density: match the rest of the IFM codebase — brief section banners, terse notes.

## Brand (non-negotiable)

Fonts: `Nunito` (400/600/700/800/900) for UI, `Lora` italic 600 for headings.
Colours — CSS variables in `index.html`, mirrored as hex in `config.js`:
`--teal #2a9d8f` `--teal-d #1f7d72` `--navy #1a3a5c` `--muted #5a7d8a`
`--cream #f7faf9` `--mint #bde9e4` `--mint-lt #e0f3f0` `--gold #c8900a` `--gold-lt #fff5d6`
Money: always Indian digit grouping via `indianFormat()` — `₹1,00,000`, never `₹100,000`.

## Board coordinate system (fixed, do not change)

- 10x10 grid. Square **1 is bottom-left**. Boustrophedon: row 0 runs left→right (1..10),
  row 1 runs right→left (11..20), and so on. **100 is top-left.**
- World space: **+X right, +Z toward the camera (down-screen), +Y up.**
- Board spans `X ∈ [-5, +5]`, `Z ∈ [-5, +5]`. One cell = 1 world unit.
- Board top surface sits at `y = 0`. Tokens stand on `y = 0`.
- `cellToWorld(n)` returns `{x, y, z}` for the **centre** of square `n`, `y = 0`.
  For `n = 0` (the start pad, off-board) it returns the pad position.

## Module map — one owner each

| File | Owns | Must not touch |
|---|---|---|
| `index.html` | thin shell only: fonts, CSS custom properties, reset, loading screen, `<canvas>` + 3 empty root divs | any js/ |
| `js/config.js` | every tunable number: timings, colours, sizes, quality tiers | — |
| `js/util.js` | **DONE — do not edit** (easing, `indianFormat`, seeded RNG, `tween`, `injectCss`) | — |
| `js/content.js` | SQUARES/SNAKES/LADDERS/GLOSSARY data only — pure data, no logic | — |
| `js/rules.js` | **DONE + TESTED — do not edit** | — |
| `js/audio.js` | all sound, generated with WebAudio — no audio files | — |
| `js/scene.js` | renderer, lights, env, resize, quality tier, frame loop | — |
| `js/board3d.js` | board mesh, cell art, highlights, `cellToWorld` | — |
| `js/snakes3d.js` | snake + ladder meshes and their animations | — |
| `js/tokens3d.js` | player tokens and their movement animation | — |
| `js/dice3d.js` | the 3D die and its roll | — |
| `js/camera.js` | camera director | — |
| `js/fx.js` | confetti, sparkle, dust, shake | — |
| `js/ui.js` | HUD: turn banner, player strip, roll button, log, settings | — |
| `js/lesson.js` | the teaching moment: card, deep-dive, quiz | — |
| `js/setup.js` | first screen: players, tokens, how-to-play | — |
| `js/endgame.js` | end scorecard + "what you learned" | — |
| `js/i18n.js` | strings, EN + HI/Hinglish | — |
| `js/game.js` | the conductor. The ONLY module allowed to know all others | — |
| `js/main.js` | boot + error fallback | — |

## Interfaces

### `config.js`
```js
export const CFG = {
  DEBUG: false,
  timing: { diceRoll: 900, hopPerCell: 165, hopArc: 0.55, ladderClimb: 1100,
            snakeSlide: 1250, lessonIn: 260, cameraEase: 700, celebrate: 1600 },
  board:  { size: 10, cell: 1, thickness: 0.35 },
  colors: { teal: 0x2a9d8f, navy: 0x1a3a5c, /* … */ },
  quality:{ /* tier definitions */ },
};
```
Anything another module hard-codes that is a *feel* number is a bug — it belongs here.

### `util.js`
```js
export function indianFormat(n)        // 100000 -> "1,00,000"
export function rupees(n)              // -> "₹1,00,000"
export function lakhCrore(n)           // 2500000 -> "₹25 lakh"
export const ease = { out, inOut, back, bounce, elastic }   // t:0..1 -> 0..1
export function lerp(a,b,t), clamp(v,lo,hi), damp(a,b,l,dt)
export function makeRng(seed)          // -> () => 0..1, deterministic
export function emitter()              // -> { on(k,fn), off(k,fn), emit(k,payload) }
export function wait(ms)               // -> Promise
export function prefersReducedMotion() // -> boolean
```

### CSS ownership — important

`index.html` holds **only**: font links, the `:root` custom properties, a css reset, the
loading screen, and this markup:

```html
<canvas id="snl-canvas"></canvas>
<div id="snl-hud"></div>      <!-- ui.js mounts here      -->
<div id="snl-overlay"></div>  <!-- lesson/setup/endgame   -->
<div id="snl-live" aria-live="polite" class="sr-only"></div>
```

**Every other module injects its own CSS** with `injectCss('lesson', css)` from `util.js`,
and namespaces every selector with `.snl-<module>`. Two agents must never edit one
stylesheet. Use the `var(--teal)` etc. custom properties — never re-declare colours.

### `content.js`
```js
export const SQUARES = [ { n:1, title, kind, lesson, deep?, term? }, … 100 items ]
   // kind: 'plain' | 'lesson' | 'quiz' | 'milestone' | 'finish'
export const SNAKES  = [ { from, to, name, why, escape, deep } ]
export const LADDERS = [ { from, to, name, why, how,   deep } ]
export const GLOSSARY= [ { term, hinglish, plain } ]
export function squareAt(n), snakeAt(n), ladderAt(n)
```
`deep` = the 40-80 word Varsity-grade explainer. Content must be arithmetically correct.

### `rules.js` — pure, synchronous, no side effects
```js
export function newGame({ players, board, seed, options }) -> State
export function roll(state) -> number                    // 1..6, seeded
export function applyRoll(state, value) -> events[]      // mutates state, returns ordered events
export const EVENT_SQUARES = [15,31,44,59,73,86]         // Jhatka — "aapki galti nahi"
// events: roll · blocked · mercy · move · ladder · snake · shield · shieldGranted ·
//         event · land · win · ranked · extraTurn · turn
// events: [{ type, playerId, from, to, path:[cells], meta }]
export function currentPlayer(state), isOver(state), legalMove(state, value)
```
`applyRoll` mutates `state` and returns the ordered event list. `game.js` plays those out as
animation. **All randomness comes from `state.rngState`** so a probe replays a seeded game exactly.

**rules.js is FINAL and TESTED — 36 assertions in `tests/rules.test.mjs`, plus the board
pacing gate `tests/board.sim.mjs` (40,000 simulated games). Do not edit it.** It already
implements DESIGN.md §10 in full: overshoot-wins, end-at-first-finish, the Bura Waqt Fund
shield, the Jhatka deck, and the third-six rule. Measured: 2-player median 21 rounds
(p99 42), 4-player median 17; the shield closes the final gap from 36 squares to 21.

### `audio.js`
```js
export function initAudio()            // must be called from a user gesture
export const sfx = { dice, hopStep, land, ladder, snake, lesson, correct, wrong,
                     milestone, win, click, whoosh }
export function setMuted(b), isMuted()
export function duckFor(ms)
```
All sounds synthesised. Warm, soft, never harsh. Nothing above ~4kHz sharp. No sound may
exceed 400ms except `win`.

### `scene.js`
```js
export function initScene(canvas) -> { scene, camera, renderer, tier }
export function onFrame(fn)            // fn(dt, elapsed)
export function offFrame(fn)
export function resize()
export function getTier()              // 'low' | 'mid' | 'high'
export function screenshotReady()      // Promise resolving when first frame is painted
```
Renderer: `antialias` only on mid/high, `ACESFilmicToneMapping`, `outputColorSpace = SRGBColorSpace`,
pixel ratio capped at 2 (1.5 on low). Soft shadows on high only.

### `board3d.js`
```js
export function buildBoard(scene) -> Group
export function cellToWorld(n) -> {x,y,z}
export function highlightCell(n, style)   // style: 'active'|'target'|'none'
export function pulseCell(n)
export function setCellLabelsVisible(b)
```

### `snakes3d.js`
```js
export function buildSnakesAndLadders(scene)
export function snakePath(snake) -> THREE.Curve   // used by tokens3d to slide along
export function ladderPath(ladder) -> THREE.Curve
export function animateSnake(snake) -> Promise    // the snake reacts
export function animateLadder(ladder) -> Promise
```

### `tokens3d.js`
```js
export function buildTokens(scene, players)
export function hopAlong(playerId, cells) -> Promise   // one hop per cell, with sfx per hop
export function slideAlong(playerId, curve, ms) -> Promise
export function climbAlong(playerId, curve, ms) -> Promise
export function setActive(playerId)
export function placeAt(playerId, cell)                // instant, no animation
```
Multiple tokens on one cell must fan out and never fully overlap.

### `dice3d.js`
```js
export function buildDice(scene)
export function rollDice(value) -> Promise   // lands showing exactly `value`
export function setDiceEnabled(b)
```

### `camera.js`
```js
export function initCamera(camera)
export function overview(ms)               // whole board, the default rest pose
export function focusCell(n, ms)
export function follow(playerId, on)
export function dramatic(fromCell, toCell, ms)   // for snakes/ladders
export function shake(strength, ms)
```
The camera must ALWAYS return to a pose where the whole board is legible within 900ms of
an action ending. Never leave the player disoriented. Honour `prefersReducedMotion`.

### `fx.js`
```js
export function confetti(worldPos, count)
export function sparkle(worldPos)
export function dust(worldPos)
export function glowRing(worldPos, color)
export function updateFx(dt)
```

### `ui.js`
```js
export function mountUI(root, hooks)   // hooks: { onRoll, onMenu, onMute, onHelp, onLangToggle }
export function setTurn(player, hint)
export function setPlayers(players)
export function setRollEnabled(b)
export function log(html)
export function toast(text, ms)
export function setDiceFace(v)
```

### `lesson.js`
```js
export function showLesson(payload) -> Promise   // resolves when dismissed
// payload: { kind:'ladder'|'snake'|'square'|'milestone', title, line, why, action, deep, term, color }
export function showQuiz(payload) -> Promise<boolean>
export function isOpen()
```
**The teaching moment must never block the fun.** Card auto-advances; it always has a single
obvious primary button; deep-dive is opt-in and one tap away.

### `setup.js`
```js
export function showSetup(root) -> Promise<{ players, options, lang }>
```

### `endgame.js`
```js
export function showEndgame(root, summary) -> Promise<'again'|'home'>
```

### `i18n.js`
```js
export function t(key, vars) , setLang('en'|'hi'), getLang(), onLangChange(fn)
```

### `game.js`
```js
export async function startGame(opts)
export function getDebugApi()      // -> the object exposed as window.__SNL
```

## The probe API — `window.__SNL` (game.js owns it; nobody may remove it)

```js
window.__SNL = {
  ready: Promise,                    // resolves once first frame is painted & setup is interactive
  version: 'x',
  state(),                           // -> a JSON-safe snapshot of rules state
  screen(),                          // -> 'setup' | 'playing' | 'lesson' | 'endgame'
  quickStart(nPlayers = 2),          // -> Promise; skips setup with sensible defaults
  forceRoll(value),                  // -> Promise; takes a turn with a forced die value
  jumpTo(cell),                      // -> Promise; teleports the current player (test only)
  dismissLesson(),                   // -> closes any open teaching card
  lessonText(),                      // -> the text currently shown, or null
  errors: [],                        // any runtime errors captured
  fps(),                             // -> rolling average fps
  settle(),                          // -> Promise that resolves when all animation is idle
};
```
Probes drive the game through this. **It must always work** — it is how quality is judged.

## Performance budget

- First paint of the board: **< 1.8s** on a mid Android (throttled 4x CPU).
- Sustained **60fps** on desktop, **≥ 45fps** on a throttled mid phone during a hop.
- Total transfer excluding fonts: **< 1.2 MB** (three.module.js is 687 KB of that).
- Draw calls at rest: **< 90**. Triangles: **< 220k**.

## Accessibility

- Every interactive control reachable by keyboard, visible focus ring, `aria-label`.
- `prefers-reduced-motion` → no camera moves, instant-ish token placement, no shake, no confetti burst.
- Text contrast ≥ 4.5:1 on all UI. Never colour alone to convey state.
- Minimum touch target 44x44 CSS px.
- The whole game must be *playable and understandable* with sound off. Sound is a bonus, never a channel.


---

## Amendments applied 3 Sep (from DESIGN.md, already in force)

1. `timing.snakeSlide` is **1100 ms and CONSTANT** for every snake regardless of length.
   The longest, most expensive snake must not feel like the longest punishment.
2. `SQUARES[].kind` set is `'plain' | 'lesson' | 'quiz' | 'event' | 'milestone' | 'finish'`.
3. Finish rule is **overshoot wins**; `options.exactFinish` opts into exact landing *with*
   a two-attempt mercy rule.
4. **The game ends the instant the first token reaches 100.** Everyone else is ranked by
   the square they are standing on. Nobody keeps rolling after the winner is done.
5. `players[].shield` / `shieldUsed` / `eventsHit` exist; events `shield`, `shieldGranted`
   and `event` are emitted. Auto-grant at 25 squares behind the leader.
6. `showLesson()` payload gains `counterparty`, `heritage`, `handoffLabel`.
7. There is no `bot.js`. Mithu the brass parrot is a turn policy inside `game.js`;
   `rules.js` cannot tell her apart from a human, and that is deliberate.
8. `tests/board.sim.mjs` is a gate. Any change to `SNAKES`/`LADDERS` must re-run it.
9. `tests/content.lint.mjs` is a gate (DESIGN.md §5.6).
10. **Every animation in the game is tap-skippable at all times, without exception.**

---

## Amendments applied 4 Sep — by the INTEGRATOR, after driving the real game

These are deviations that were forced by the first run. They are in force; later
agents inherit them.

1. **`js/game.js` owns the handoff card.** No other module built it. It injects
   `injectCss('handoff', …)` and namespaces `.snl-handoff`. On viewports wider
   than 820 px in landscape it renders as a plaque over a scrim instead of
   full-bleed, because a projector or a laptop is never physically passed and a
   full screen of flat colour between turns hides the board a room is watching.
   Portrait keeps the §3.1 full-bleed card exactly as specified.

2. **`camera.js`'s safe rect is now asymmetric.** `safe` is `{ x, y, oy }` where
   `oy` is the NDC-y centre of the band the board must fit inside. The HUD strip
   above and the dice tray below are different heights, so a band centred on the
   viewport centre cropped rows 1–10 behind the ribbon on every device.
   - `setSafeFrame(x, y, oy = 0)` — `y` is the band's HALF-height in NDC (as
     before), `oy` its centre.
   - `computeFit()` gained `fitY()`, a closed-form bound per band edge.
   - `boardCoverage()` tests `|ny - oy| <= safe.y`.
   - `game.js` measures the real gap (`--snl-tray-h` from ui.js, the HUD strip's
     bottom, `layout.ribbonH`) and calls `setSafeFrame()` on boot and on resize.

3. **`camera.js` TDZ fix.** `_cellResolver` was declared after `cellToWorld()`,
   which the module-level `CELLS` table calls during evaluation. Moved above.

4. **`dice3d.js` gained `refitDice()` / `diceFit()`.** `D.size` is world units
   tuned for a 390 px portrait phone; on a laptop the camera sits far closer to
   the tray and the same cube rendered ~2.5× too big. `refitDice()` solves for
   the group scale that draws the die at `layout.diceDrawn` CSS px on the current
   viewport and slides the group so the die stays on the same table spot. The hit
   sphere scales with it but never below 62% of its nominal radius, so the touch
   target stays over 44 px. `game.js` calls it after the camera is fitted and on
   every resize. `buildDice()` must therefore run AFTER `initCamera()`.

5. **`showLesson()` payload additions**, all optional and all honoured by
   `lesson.js` as shipped: `ribbonOnly`, `card`, `repeat`, `cardKey`, `playerId`,
   `turnId`, `landIn`, `onLanded`, `bullets`, `what`, `number`, `numberLabel`,
   `workshop`. `showLesson()` returns a promise carrying `.land()` and
   `.dismiss()`; `game.js` calls `.land()` on the exact frame the last motion of
   the turn ends rather than trusting a timeout.

6. **`window.__SNL` gains three read-only extras** the probe already calls:
   `content()` → `{ snakes, ladders }`, `renderInfo()` → `scene.renderInfo()`,
   and `ui()` → `ui.snapshotUI()`. `state()` also carries `tier`, `screen` and
   `turnId`.

7. **`settle()` semantics.** It resolves when no animation is in flight and the
   teaching moment has finished *arriving* — a card waiting for a tap, or a
   ribbon holding its 1800 ms, is idle, not busy. Waiting for dismissal would
   deadlock any probe. `forceRoll()` additionally consumes a standing handoff
   card so the game is left on the live board, which is what a screenshot needs
   to be able to see.

8. **Mithu** is a turn policy in `game.js` (`awaitRoll`): 900 ms think beat, one
   soft chirp, no handoff card, ribbons but never a card (`ribbonOnly` is forced
   for a bot). `rules.js` still cannot tell her apart from a human.


---

## Measured facts, so nobody re-investigates them (4 Sep)

- **`fps` from the headless probe is meaningless.** Headless Chrome schedules frames at
  roughly 30Hz with no display attached, from the very first sample. Measured in a real
  browser the game runs at **120fps median, 98fps p95, 52 draw calls**. A 30 in a probe
  report is not a regression — judge render cost by `drawCalls` / `triangles` / `geometries`.
- **There is no leak.** Over 30 played turns: draw calls 52→55, triangles flat at ~59.5k,
  textures flat at 23, DOM nodes 310→316, JS heap 12→14 MB. Verified directly.
- **Payload is 463 KB** (three.module.js 166 KB gzipped + ~200 KB of modules + a 59 KB mark),
  against a 1.2 MB budget. It was 1528 KB until the 1 MB print watermark was removed from
  the page; that asset is now referenced only by `og:image`, which crawlers fetch and
  players do not.
- **The boot safety net is now reversible.** It polls, never fires while `window.__SNL`
  exists, and takes itself down if the game arrives late. The previous one-way version
  permanently buried a working game under the no-WebGL apology page on a slow connection,
  logging nothing anywhere.
