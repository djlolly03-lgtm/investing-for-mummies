# Saanp Seedhi — Canonical Design

**Status:** final. This supersedes the four rival designs. Where this document and
`CONTRACT.md` disagree, this document states the change explicitly under
**"Contract amendments"** at the end — nothing here is silent.

**Lineage.** The spine is the Ludo-first turn loop (it won the producer panel and is the
only loop that survives turn nine on a real phone). Grafted in: the Varsity-first
*card-is-the-handoff-button* — but only on teaching squares — plus its zone architecture,
its guess-before-reveal quiz and its "what nobody landed on" end block; the Mother-first
voice, counterparty line, content lint and snake-thickness-equals-cost geometry; the
Classroom-first restraint rules, Sabka Sawaal and printable A4. All four rivals
independently converged on four rules — Bura Waqt Fund shield, game ends at first finish,
overshoot wins, no money counter — so those are settled and are not re-litigated.

---

## 1. The Promise

Saanp Seedhi is the Snakes & Ladders board an Indian family already owns, rebuilt in 3D on
a phone, where the size of every fall is set by what the mistake actually costs. It opens
in two taps with nothing typed, plays in about twelve minutes with two to four people
passing one phone, and teaches by putting the rupee number *inside* the animation you most
want to watch — the cost of an F&O punt is painted in gold along the snake's back and
scrolls under your token as you slide down it. The snakes are never your character; they
are products and pitches, each naming who got paid. The ladders are never virtue; they are
plumbing — a linked mobile, an auto-debit, a nominee. Nobody is eliminated, nobody is
ranked by wealth, and the top square is not "richest" but *lakshya poora* — your goal,
funded. It is a game first. The teaching rides in the animation time the game was spending
anyway, and is banked properly on a scorecard you earned twelve minutes of dice to see.

---

## 2. First 30 Seconds

**Target: 2 taps to the first dice roll. 0 fields typed. 0 permissions. 0 network after
first load.**

| t | What is on screen | Notes |
|---|---|---|
| 0 ms | Loading screen from `index.html`: cream ground, "Saanp Seedhi" in Lora italic 600, a single 3px teal progress bar, no percentage, no tips. | Bar only; never a spinner. |
| ≤ 1800 ms | Board fades in already built and already lit, tokens resting on the start pad, camera at `overview()`. Fade 400 ms. | Hard budget: first board paint < 1800 ms on a 4×-throttled mid Android. |
| +0 ms | **Setup card**, mounted in `#snl-overlay` by `setup.js`. One row of four plaque buttons, 72 dp tall, icon over label: **2 khiladi · 3 khiladi · 4 khiladi · Mithu ke saath** (bot). Nothing else on the card. | No difficulty, no rules screen, no language wall. |
| — | Persistent chips, visible from this frame and forever after, top-right, 44 dp each: **हिं / EN** and a speaker (mute). Neither ever gates or interrupts anything. | Language switch mid-turn is legal and instant. |
| **TAP 1** | Players are created pre-named **Khiladi 1…4** with four distinct token silhouettes (matka, diya, chaabi, ghanti) and four maximally-separated colours. A small `naam badlo` pencil sits beside each and is offered again after round one — never before. `initAudio()` is called here, on this gesture. | Typing four names on a shared phone is a 60-second tax before anyone has had fun. |
| +300 ms | **The one line.** Held 2600 ms over the board, in Lora italic, then gone for the rest of the product's life: *"Sab yahin se, ek jaise shuru kar rahe hain. Asli zindagi mein aisa nahi hota — woh alag ladai hai, aur woh akele aapki nahi hai."* | Says the equal-start fiction out loud, once. Does its work by being true. Tap skips it. |
| **TAP 2** | Handoff card for Khiladi 1 — full-bleed player colour, 96 dp token silhouette, name, one word: **TAP**. | Skipped entirely in solo/bot mode. |
| +180 ms | Board live. Khiladi 1's plaque has a glow ring. The dice sits in the bottom third, 64 dp, and begins its idle pulse 1.00 → 1.06 → 1.00 on a 1000 ms sine loop. **Nothing else on screen is moving.** | The pulse is the entire tutorial. No arrow, no tooltip, no "tap here". |
| ~12–15 s | She taps. Rattle, tumble, clack, a number. Token hops *tik–tik–tik*. A ribbon reads a true thing about money. | She has learned something and has not read an instruction. |
| ~20 s | **"KHILADI 2 KO DO"** fills the screen in the next player's colour. Phone changes hands. | The rules have been taught by having been obeyed. |

**Never asked, ever:** account, email, phone, OTP, password, age, income, city, gender, any
OS permission, any difficulty setting, any forced tutorial, any rules screen.

A `Kaise khelein?` link sits at the bottom of the setup card for the one person in fifty
who wants it: three lines with a picture each — dice → chalo; seedhi → upar; saanp →
neeche. It is never shown unprompted.

---

## 3. Core Turn Loop

One turn, beat by beat. Timings are the shipped defaults and live in `config.js`.

### 3.1 The beat sheet

| t (ms) | Beat | On screen | Audio |
|---|---|---|---|
| 0 | **Handoff card** | Full-bleed player colour, 96 dp token silhouette, name, "TAP". Fades/scales in over 220 ms. Behind it, `camera.overview()` eases the camera back to the exact default over `cameraEase` 700 ms. | soft page-turn, 120 ms |
| tap | Card wipes up, 180 ms | Board live. Active plaque glow ring on. | — |
| +180 | **Idle-ready** | Dice pulses 1.00→1.06→1.00 @ 1000 ms. Nothing else moves. A 20 s arc drains around the active plaque — **home mode only, and it auto-rolls on expiry; it never skips the player.** In workshop mode there is no timer at all. | — |
| tap | **Press** | Dice depresses to 0.92 in 60 ms. Input locked instantly so a double-tap cannot double-roll. Haptic 12 ms. | — |
| 0→700 | **Tumble** | Pre-baked 3D tumble curve with a randomised spin axis, resolving to the face the rules engine already chose. **No physics sim, ever** — it must never land cocked, never roll off, never disagree with the number. | dry wooden rattle under the whole 700 ms |
| 700→840 | **Settle** | Overshoot bounce, ease-out-back. Number legible at ~840 ms. | one dry clack, 90 ms |
| 840→900 | **Pip pop** | Die face scales 1.00→1.15→1.00. The destination square lights faintly — she knows where she is going before the token moves. The pip count is also mirrored as that many dots under the active token, for anyone who cannot read a die face. | — |
| 900 | **Travel begins** | Token hops **cell by cell, never tweened to the destination**. `hopPerCell` 165 ms, arc height `hopArc` 0.55 of a cell, ease-in-out. Squash 1.08 × 0.94 on each landing, recovering over 60 ms. A 3 = 495 ms; a 6 = 990 ms. Bigger rolls are physically longer and therefore feel bigger. | one **tik** per cell, pitched up 1.5 semitones per consecutive cell in a move |
| travel × 0.6 | **The teaching gap** | The ribbon for the destination square begins sliding up over `lessonIn` 260 ms, so it is fully readable ~250 ms *before* the token lands. On a 6 that is 594 ms of animation the game was spending anyway, doing the pedagogic work. | audio ducks to 30% for 260 ms |
| land | **Resolve** — one of six, see §3.2 | Dice re-arms and resumes pulsing **on this exact frame** for plain squares. | per case |
| end | **Handoff card** for the next player | `camera.overview()` begins under it. | page-turn |

**Turn budget.** Plain square: ~2.2 s of screen time. Snake with a card: ~4.3 s. Real
elapsed time with four people passing a phone: budget **10 s per turn**. Every second
added to an animation costs ~66 seconds of total session at four players — treat the
animation budget as fixed.

### 3.2 The six landing cases

| Case | Count | What happens | Total |
|---|---|---|---|
| **Plain** | 62 squares | Ribbon holds 1800 ms then slides out over 200 ms. **Dice re-arms on the landing frame** — she can tap straight through the ribbon. | ~1.8 s, or 0 if she taps |
| **Lesson** (card) | 22 squares — 8 snake heads, 8 ladder feet, 6 standalone big ideas | Ribbon grows upward into the Lesson Card, §5. | card-governed |
| **Quiz** (Sabka Sawaal) | 5 squares | Two chunky 72 dp chips, question ≤ 12 words. No timer, no score, no wrong answer, no penalty. Either chip reveals the answer with a 400 ms count-up. | median ~2.5 s |
| **Event** (Jhatka) | 6 squares | Card slides in from the left, muted-grey edge, fixed header **"AAPKI GALTI NAHI"**. If the player holds the Bura Waqt Fund it flashes and absorbs, and she moves nothing. If not, she drops 4 squares. | ≤ 2.2 s |
| **Milestone** | 4 squares (10, 50, 75, 92) | Card with three flat one-line bullets recapping the zone just crossed. No new information. | ~2.6 s |
| **Finish** | 100 | §11. | — |

**Auto-resolve, borrowed wholesale.** One token per player, so there is never a move to
choose. There is no illegal move, no disabled control, no error state, no confirmation
dialog, no "are you sure". The player's entire input on a turn is one tap on a glowing
object — and, on about one turn in five, one tap on one of two big buttons.

**Never two cards in a row.** If a snake or ladder lands the token on a square that would
itself open a card, only the snake/ladder card shows. If a milestone is reached by sliding
down a snake, the milestone is suppressed.

**Repeat visits show the ribbon only.** The fourth time anyone lands on square 38 in a
session, nobody has to read the card again. Tracked per player per game.

---

## 4. The Board Metaphor

**A ghat road climbing a hillside out of a bazaar.** Ten switchbacks, boustrophedon,
square 1 bottom-left, 100 top-left — the original Moksha Patam ascent, kept because it
means something: one continuous climb, never a lap.

The road rises **0.09 world units per row**, so row 9 sits 0.81 units above row 0. That is
enough that "I am near the top" is a fact about the picture rather than a number you read,
and small enough that the board still reads flat and legible from the default camera.
Progress is geometry. Nobody counts.

### Five zones, and why the order is causal, not thematic

Each zone teaches one thing and repeats it across three to five squares, so **no dice path
can miss a concept.** The zone edge is a carved stone step on the board.

| Squares | Zone | Teaches |
|---|---|---|
| 1–20 | **Ghar ka hisaab** (bazaar, shutters, chai stall) | Where the money goes; mehngai; the first ₹500. **No snake bites below 27** — the first three minutes never punish anyone. All three easy ladders live here. |
| 21–40 | **Bura waqt aur kaagaz** (water tank, brass lota, a bank shutter) | The buffer; the paperwork that stops most first attempts; insurance ≠ investment; the card. |
| 41–60 | **Suraksha aur dhokha** (a verandah, then a narrow unlit lane) | Health cover; term cover; chain systems; the gold that gets pledged. The only zone lit cooler. |
| 61–80 | **Badhna** (open terrace, a young peepal) | SIP, cost, trading vs investing, patience. |
| 81–100 | **Kaagaz aur manzil** (a lit landing, a house with its door open) | Scams, nominee, telling the family, the goal. |

### The mechanic carries the meaning

The single rule that separates this from Chutes and Ladders: **a square's financial content
sets its jump size.** The six mid-board snakes all drop 17–19 squares because they all cost
a household roughly a year of savings. The two late snakes drop 10 and 8 because those
mistakes are recoverable. And the snake's **body thickness is proportional to its rupee
cost**, so you can read the price of a product from across the room before you can read a
word.

### Board furniture

- **Ladders**: plain bamboo, four rungs, unpainted, standing on posts **clear of the tile
  plane**. Deliberately boring — ladders here are plumbing, not righteousness.
- **Snakes**: kalamkari-painted terracotta and indigo, resting on low supports, again clear
  of the tiles. Mouth open at the head square. **The rupee cost is painted in gold, 20 sp,
  along the spine, oriented to the slide direction**, so it scrolls under the token during
  the descent. This is the one teaching moment in the whole game that cannot be skipped
  without skipping the thing players most want to watch.
- Both live *above* the tile plane, which is the legibility fix that justifies the whole
  renderer: no snake body ever obscures a square number.

### Inherited coordinates, re-tenanted

We keep the traditional numbers and change the tenant. A single grey Lora-italic line,
13 sp, appears on the card **the first time that square is landed on in a session and never
again**:

| Square | The old board said | Now |
|---|---|---|
| 12 | Faith (*shraddha*) | Your first ₹500 SIP. The hardest step is still the first one. |
| 51 | Reliability | The salary-day auto-debit. Reliability outsourced to a machine. |
| 69 | Debt | "Kaun kama raha hai" — ask who gets paid. |
| 76 | Knowledge (*gyana*) | Read the yearly cut before you sign. |
| 78 | Asceticism (*tapas*) | You sat through a 30% fall and did nothing. |
| 99 | Lust — one step from moksha | **Deleted, and we say so.** A snake at 99 is the original's cruellest joke and the worst possible money lesson. |

That turns heritage from decoration into an argument.

**Text on the play surface: square numbers and nothing else.** A silent screenshot must
answer whose turn it is, who is ahead, and what just happened.

---

## 5. The Teaching Moment

### 5.1 The governing rule

**It is a ribbon that grows, never a popup that lands.** The board is never covered, the
next tap is never blocked, and it can always be killed by tapping anywhere.

### 5.2 State 1 — the ribbon (every square, all 100)

A cream band, 88 dp tall, full width, pinned to the bottom edge **above** the dice tray so
the dice is never covered and never unreachable. A 3 dp left edge carries the semantic
colour: teal = ladder, warm clay = snake, gold = milestone, muted grey = event, navy =
plain.

Contents: square title in Lora italic 22 sp navy, and one lesson line in Nunito 17 sp,
**maximum two visual lines, hard cap 90 characters.** No icon, no button, no X, no "Got
it", no "Learn more".

Timing:
- `t = travel × 0.6` — slides up 88 dp over `lessonIn` 260 ms, ease-out-cubic. **Fully
  readable before the token stops moving.**
- `t = land` — the left edge pulses once, 120 ms. **The dice re-arms and resumes pulsing on
  this frame.** She can already roll.
- `t = land + 1800 ms` — slides down over 200 ms, gone.
- Any tap, any moment — leaves in 120 ms. Tapping the dice both dismisses it and rolls.
  **There is no state in which the ribbon costs a player a tap.**

62 of 100 squares stop here. That is what stops the game feeling like a lecture.

### 5.3 State 2 — the card (38 squares: 22 lesson, 5 quiz, 6 event, 4 milestone, 1 finish)

The ribbon keeps growing upward over 300 ms to **45% of screen height and never more** —
the token and the snake or ladder it just used must stay visible above it, because the room
is looking at the board, not at the card. Cream sheet, 20 px radius, soft shadow. **Never a
full-screen modal. Never a dimming scrim.**

Order of appearance — this order *is* the pedagogy, and it is Varsity's sequence, not a
dictionary's. The label comes seventh, not first.

| t | Element | Spec |
|---|---|---|
| 0 ms | **What happened**, in her own voice | Nunito 20 sp navy. "Ek 'FD se better' scheme mein ₹50,000 saal ka." |
| +180 ms | **The number** | Gold, Lora, 32 sp, alone, **counting up from zero over 400 ms** so the figure physically arrives. One number per card. Never two. |
| +600 ms | **The name** | Nunito 15 sp bold teal, small, above the line. "Endowment policy". The label is a receipt for something already understood, not a ticket to enter. |
| +800 ms | **The way out** | Mint band, small key glyph, Nunito 16 sp. Always second person, always an action, ≤ 110 characters. **Every snake card ends on a door, never on the damage.** |
| +1000 ms | **The counterparty** | Nunito 13 sp `--muted`, one line: "Yeh paisa kisko gaya: the agent and the bank branch." Every snake names who got paid. This one line is the whole ethics of the game — it moves blame from the person to the product without becoming a conspiracy, because it is simply accurate. |
| once ever | **The heritage line** | Lora italic 13 sp, muted, only on 12/51/69/76/78/99, first landing only, per session. |
| +1200 ms | **The button** | Full width, 56 dp, teal plaque with a 4 px darker bottom edge. **In pass-and-play its label is "PRIYA KO DO ▸" — the card *is* the pass-the-phone button.** The dice has gone (the turn is ending anyway), so NEXT appears in the exact screen position the thumb just left. Reading costs zero extra taps and cannot be routed around. In solo mode: "AAGE ▸". |
| corner | **"Aur padho" chevron** | Opt-in, one tap, expands to the 40–80 word Varsity-grade explainer from `content.js` with its arithmetic and its source. Invisible to everyone who does not want it. This is how the game earns the one person in a thousand who checks. |

### 5.4 Dismissal and the never-blocks-fun guarantees

1. **Never modal.** The board is always visible. The card never covers the standings strip.
2. **Tap anywhere dismisses**, from millisecond zero, in 200 ms. Nothing here is
   un-skippable.
3. **Auto-advance at 4500 ms** in home mode. **Never** in workshop mode.
4. **Never two cards in a row** (§3.2).
5. **Repeat visits show the ribbon only** (§3.2).
6. **No confirmation, no "did you understand?", no score on the card.** The lesson is never
   a toll gate.
7. A player who taps through in 400 ms loses the reading and the game lets her. §12 catches
   it.

### 5.5 Variants

- **Snake card.** Fires after the slide. Header is warm and never accusing: *"Yeh bahut
  logon ke saath hota hai."* Grows to 52% height for this variant only, to fit the escape
  line. The rupee cost has already been read off the snake's back on the way down.
- **Ladder card.** Header *"Achha kiya."* Carries the **how** (the concrete first step),
  never the **why** — mid-climb she wants the action, not the argument. The why lives in
  "Aur padho" and on the scorecard.
- **Quiz card (Sabka Sawaal).** Fires *before* the answer exists. Question ≤ 12 words, two
  72 dp chips, ≤ 6 words each. Every chip is tappable, neither is wrong, there is no score.
  Tapping reveals with a 400 ms count-up, and the reveal line **always opens by
  normalising error**: "Zyaadatar log kam bataate hain." — most people guess low. In
  **workshop mode** the ambient bed drops to a single held note and the card says
  *"Poori class se poochho"*; silence is the cue that the room is being asked something.
- **Event card (Jhatka).** Muted grey edge, fixed header **"AAPKI GALTI NAHI"**, one line
  of event, then either the shield absorbing it or the setback and one line about what a
  buffer would have done. **No blame anywhere and no advice about avoiding it, because it
  was not avoidable.**
- **Milestone card.** Three flat bullets, one line each, no new information, written as
  portable rules. Varsity's Key Takeaways block, four times a board.

### 5.6 Content lint — enforced at build, not by good intentions

`tests/content.lint.mjs` fails the build if any square, snake or ladder violates:

- title ≤ 26 characters; ribbon line ≤ 90 characters and ≤ 1 sentence
- `why` ≤ 140 characters and **must contain a `₹` figure**
- `escape` / `how` ≤ 110 characters and must be an action, not an opinion
- `deep` is 40–80 words
- **No percentage may appear anywhere without a rupee amount within the same field**
- **Banned words anywhere**: `lazy`, `careless`, `foolish`, `greedy`, `should have`,
  `stupid`, `waste`, `guaranteed returns`, `will grow`, `you will get`
- Any growth figure must be accompanied by the literal string `not guaranteed`
- Second person for what she controls; third person for what the system does to her —
  checked by a heuristic that flags `you` inside a `why` field for review
- Weddings, medical care, education and parents are **never** a snake. Hard assert.

**The read-aloud test.** Before ship, every snake line is read aloud to somebody who did
that exact thing last month. If they flinch at being *described* rather than *informed*,
it is rewritten. This is a gate, not a suggestion.

---

## 6. 3D Direction

### 6.1 What the 3D actually buys us — three things. If a fourth appears, cut it.

1. **The hop reads as physical.** In 2D a token slides; in 3D it arcs, lifts off the
   surface, squashes on landing and casts a contact shadow. That is what converts a die's
   "4" into four felt events.
2. **Snakes and ladders are objects above the tile plane**, so they never obscure a square
   number — the legibility failure of every printed board — and the snake's *thickness*
   can carry the size of the money.
3. **The climb is elevation.** Ten switchbacks rising 0.09 units per row means "near the
   top" is visible from the back of a workshop hall by someone who cannot read the
   numbers.

### 6.2 Camera behaviour (`camera.js`)

| Situation | Move |
|---|---|
| **Default rest pose** | Three-quarter isometric, **38° elevation, 0° azimuth**, near-orthographic (fov 26°, pulled back) so a tile at row 9 is the same size as a tile at row 0. Whole board in frame. This is where the camera lives. |
| Turn change | Ease 140 px toward the active token over `cameraEase` 700 ms. Never a rotation. |
| Token moving | Dolly to keep the token in the lower-middle third, 400 ms ease. |
| Ladder fires | Lift 10°, pull back 12% over 500 ms so the top of the ladder enters frame **before** the token gets there; return over 500 ms. |
| Snake fires | Dip 8°, push in 12% over 400 ms, hold, return over 500 ms. |
| Finish | Square 100 rises 40 px out of the board plane over 700 ms with a warm gold key light; camera settles looking slightly *up* at it. The board becomes a thing you climbed. One shot, and it is worth the renderer. |
| **Handoff card** | `overview()` — eases back to the **exact** default over 700 ms, under the card, **every single turn, non-negotiable.** |
| Player input | Two-finger drag rotates within **±25° yaw only**, between turns only, and springs back over 400 ms on release. Pinch-zoom is **disabled**. |
| Projector mode | Camera locked at default. All push-ins disabled. Numerals +20%. A moving camera on a projector makes half a room queasy and the other half lost. |
| `prefers-reduced-motion` | All camera movement off. Default pose only. |

**The rule underneath all of it:** the camera must always return to a pose where the whole
board is legible within 900 ms of an action ending. A player receiving the phone
upside-down is the single most common failure in 3D board games ported to touch, and it is
fully solved by resetting on handoff.

### 6.3 Quality bar and tiers (`scene.js`)

| | High | Mid | Low | No WebGL |
|---|---|---|---|---|
| Antialias | on | on | off | — |
| Pixel ratio cap | 2 | 2 | 1.5 | — |
| Shadows | one soft directional | baked + blob | blob only | — |
| Snake mesh | 8k tri | 2.5k tri | 1.2k tri | SVG |
| Board texture | 1024 atlas | 1024 | 512 | CSS |
| Particles | ≤ 60 | ≤ 30 | 0 | 0 |

Auto-demotes silently after **8 dropped frames in any 2 s window**, mid-game, preserving
state. The player is never told anything is wrong, because nothing is.

**Budget, hard:** < 90 draw calls at rest, < 220k triangles, one 1024 px texture atlas,
baked lighting only, zero post-processing, zero physics. All 100 tiles are one merged
geometry. Total transfer excluding fonts < 1.2 MB. Sustained 60 fps desktop, ≥ 45 fps on a
4×-throttled mid phone during a hop.

**The 2D fallback is a first-class mode, not an apology.** No WebGL, or two seconds
averaging under 25 fps, switches to a flat CSS/SVG board: same 10×10 grid, same colours,
same numbers, same hop timings, same tik sounds, same 100 lesson lines, same 38 cards. Snake
and ladder jumps become a 400 ms curved translate. **Every word of the curriculum
survives.** A 45-year-old in Nagpur on a five-year-old Android gets the entire education;
she just does not get the hillside. That is the correct trade, and the 3D is built as a
layer on top of the 2D rather than the reverse.

### 6.4 What must never be sacrificed for 3D — in priority order

1. **Frame rate over fidelity.** Always.
2. **Square numbers are billboarded sprites, always upright, always camera-facing, never
   obscured by geometry.** If a number is ever occluded, the geometry loses.
3. **The whole snake body stays visible on the board** — a room needs to trace where it
   goes with a finger *before* anybody lands on it. No snake may be foreshortened into
   ambiguity.
4. **Token identity by silhouette at the default camera.** If the ghanti reads as the matka
   at 38°, the model is wrong. Tokens stand taller than a tile so they read above the grid.
5. **The dice is never a physics simulation.** It is a baked tumble curve with a randomised
   spin axis, resolving to the value `rules.js` already chose. Deterministic, identical on
   every device, can never land cocked or roll off, can never disagree with the code.
6. **HUD, dice tray, standings strip and lesson card are flat DOM over the render** — never
   3D objects, never subject to the camera.

---

## 7. Art Direction

### 7.1 The object

A warm painted board resting on a wooden table in a house — the thing a family already
owns, not a video game. If it ever looks like an app skin, it is wrong.

### 7.2 Materials

| Element | Material |
|---|---|
| Board tiles | Matte painted card. Roughness 0.85, metalness 0. Faint paper grain in the atlas. |
| Board frame | Stained mango wood, roughness 0.6, a visible bevel catching the key light. |
| Ladders | Raw bamboo, roughness 0.9, gold-leaf rung tips only. |
| Snakes | Glazed terracotta body with kalamkari indigo pattern, roughness 0.45 so the curve catches a highlight and the gold rupee lettering reads. |
| Tokens | Brass (metalness 0.7, roughness 0.35) and unglazed clay (roughness 0.95). Two materials, four silhouettes. |
| Dice | Pale wood, painted navy pips, roughness 0.7. |
| Table | Out of frame except as a warm bounce colour. |

### 7.3 Lighting

One baked hemisphere (cream sky `#f7faf9`, warm floor bounce `#e8d9c0`) plus **one**
directional key at 40° elevation / 35° azimuth, colour `#fff6e4`, intensity 1.1, casting a
single soft shadow on High only. `ACESFilmicToneMapping`, exposure 1.0,
`outputColorSpace = SRGBColorSpace`. It should look like late-afternoon light through a
window, never studio, never neon, never night.

### 7.4 Colour, against the IFM palette

The palette is used **semantically**, and each colour means exactly one thing everywhere:

| Token | Hex | Means, and only this |
|---|---|---|
| `--cream` | `#f7faf9` | The board surface, every card ground. |
| `--navy` | `#1a3a5c` | All body text, all square numerals, the board frame. |
| `--teal` | `#2a9d8f` | **Ladders, ladder cards, the active player highlight, the primary button.** Progress. |
| `--teal-d` | `#1f7d72` | Pressed states, the 4 px button under-edge. |
| `--mint` | `#bde9e4` | Ladder-foot tiles; the "way out" band on every card. |
| `--mint-lt` | `#e0f3f0` | Zone tints, the standings strip ground. |
| `--gold` | `#c8900a` | **Rupee numbers, milestones, square 100, the number on a snake's back.** Money and arrival — nothing else. |
| `--gold-lt` | `#fff5d6` | Milestone tile fill, the finish bloom. |
| `--muted` | `#5a7d8a` | Counterparty lines, the Jhatka card edge, disabled ink. |
| warm clay | `#c0674a` | **Snakes only.** Never used for anything else, and deliberately not alarm-red — a nine-year-old should laugh, not flinch. |

Player colours are drawn **outside** this palette so a token is never confused with a
semantic: `#2a9d8f` teal is reserved, so players are **indigo `#3a4f9b`, saffron
`#e08a1e`, plum `#8a3f6b`, forest `#3f7a4a`** — four maximally separated hues, checked
against deuteranopia and protanopia, each also carrying a distinct silhouette. Red and
orange are never both in play.

No hairlines. No grey-on-grey. No icon-only control without a word. Nothing thin. The
board must survive a 400-nit LCD in Indian daylight and a washed-out projector.

### 7.5 Proportions (portrait only)

- Board occupies **92% of screen width**, vertically centred in the middle 62% of the
  screen.
- **Top 12%**: standings strip — token silhouette, name, square number, ordered. Always
  visible. "Aap 2nd, 4 ghar peeche" is a completely different feeling from "you are
  losing".
- **Bottom 26%**: the dice tray. The dice is 64 dp drawn, 88 dp hit rect, right of centre.
- **Nothing interactive in the top 20% of the screen** — the phone is passed one-handed
  across a table.
- Ribbon: 88 dp. Card: ≤ 45% of screen height (52% for snakes).

### 7.6 Type

Nunito for everything a player must act on: 800 for buttons and titles, 600 for lesson
lines, 400 for the counterparty line. Lora italic 600 for the product name, the four
heritage whispers, square titles, and the rupee figure on a card. Nothing below **16 sp**
anywhere except the 13 sp counterparty and heritage lines, which are deliberately quiet.

---

## 8. Audio Direction

**All procedurally generated in WebAudio. No asset files. Nothing above ~4 kHz sharp.
Nothing over 400 ms except `win`.** Warm, wooden, domestic — a board on a table in a house.
If a sound could be mistaken for a slot machine, a coin, or a cash register, it is deleted.

`initAudio()` is called on the first setup tap. Default **on**, with a persistent 44 dp
mute chip whose state is remembered on the device. **Every sound has a visual twin — the
game is 100% playable and 100% comprehensible in silence**, which is how it will be played
on a bus and in half the classrooms.

| Cue | Trigger | Synthesis | Length |
|---|---|---|---|
| `dice` | tumble | Filtered noise burst train: 9 impulses at irregular 60–110 ms gaps, each a 12 ms white-noise burst through a bandpass at 900 Hz Q 1.4, plus a 180 Hz sine click at 8% gain. Reads as wood in a cupped hand. | 700 ms |
| `land` (dice settle) | 700 ms mark | Single 90 ms bandpass noise burst at 1.1 kHz Q 2, plus a 220 Hz triangle blip with a 40 ms decay. | 90 ms |
| `hopStep` | every cell | 40 ms triangle at 520 Hz through a lowpass at 2 kHz, exponential decay. **Pitch +1.5 semitones per consecutive cell within one move**, so a 6 audibly rises and a 1 does not. This is the most important sound in the build: half the table is not looking at the screen, and the tik is how four people count the roll together. | 40 ms |
| `ladder` | ladder climb | Four plucked notes (Karplus-Strong on a 300 Hz string, damping 0.4) ascending a pentatonic run over 900 ms, resolving on a small brass ring — a 3-partial FM bell at 880 Hz. Pleased, never triumphant. | 1100 ms |
| `snake` | snake slide | A sawtooth at 260 Hz through a lowpass sweeping 1400 → 380 Hz over 900 ms, plus a soft dholak-rim thump on landing (110 Hz sine, 90 ms, pitch-dropping 15%). **Comic and low, never a hiss, never a horror sting.** | 1100 ms |
| `shield` | Bura Waqt Fund absorbs | The dholak thud, then a bright metallic "tunk" (FM bell, carrier 1320 Hz, index 3, 140 ms), then a rising two-note release. **Deliberately the most satisfying sound in the product**, because it is the most important lesson in it. A room should say "arre!" out loud. | 700 ms |
| `lesson` | card opens | A single soft 60 ms sine swell at 440 Hz, barely there. All other audio ducks to 30% for 260 ms so nothing competes with reading. | 60 ms |
| `correct` | quiz reveal | Brass ring, one note above the ladder resolve. | 300 ms |
| `wrong` | never fires on a wrong answer — **there are no wrong answers.** Used only for a blocked/no-op input. | A neutral 60 ms wooden knock. **Never a buzzer, never a descending trombone.** 45-year-olds who left school at 16 have been buzzed at enough. | 60 ms |
| `milestone` | 10, 50, 75, 92 | One temple bell: FM, carrier 660 Hz, 3 inharmonic partials, 900 ms decay. | 900 ms |
| `event` (Jhatka) | event square | One low bowed note, 140 Hz sawtooth through a slow lowpass, no melody. **Serious, never comic** — these are nobody's fault and the audio must not laugh at them. | 400 ms |
| `whoosh` (handoff) | handoff card | A 120 ms filtered-noise page-turn, highpass 600 Hz, fast decay. | 120 ms |
| `click` | any button | 25 ms triangle at 700 Hz. | 25 ms |
| `win` | square 100 | A tanpura-ish swell (three detuned sawtooths at 130/195/260 Hz through a slow-opening lowpass) with one temple bell over it. **No fanfare, no crowd, no coin cascade.** This is an arrival, not a jackpot. | 1600 ms |

**No music bed by default.** A loop underneath a pass-and-play family game becomes noise in
the room within four minutes. An optional very-low tanpura drone exists behind one toggle,
off by default, and thins as you climb the rows.

**No voice-over, ever, during play.** An optional Hinglish voice reads *only* the square
title and the rupee figure on a card — titles only, never the whole card — for players who
read slowly and for the projector. Voice-over is the thing that makes a facilitator mute
the app, and muting takes the tik with it.

---

## 9. Motion Spec

All easings from `util.js`'s `ease`. `ms` are the shipped defaults in `config.js`.

| # | Animation | Duration | Easing | Notes |
|---|---|---|---|---|
| 1 | Board fade-in on boot | 400 | `out` | Once. |
| 2 | Setup card in / out | 260 / 180 | `out` / `inOut` | |
| 3 | The one line (equal start) | 300 in, 2600 hold, 300 out | `out` | Once per install. |
| 4 | Handoff card in | 220 | `back` (mild) | Scale 0.94 → 1.00. |
| 5 | Handoff card wipe out | 180 | `out` | Upward wipe. |
| 6 | Camera return to `overview()` | **700** (`cameraEase`) | `inOut` | Under the handoff card. Every turn. |
| 7 | Dice idle pulse | 1000 loop | sine | Scale 1.00 → 1.06 → 1.00. |
| 8 | Dice press | 60 | `out` | Scale → 0.92. Haptic 12 ms. |
| 9 | Dice tumble | **700** | linear (baked curve) | Randomised spin axis. Never physics. |
| 10 | Dice settle | 140 | `back` | Overshoot bounce. Number legible at 840 ms. |
| 11 | Dice pip pop | 60 | `out` | 1.00 → 1.15 → 1.00. |
| 12 | **Token hop, per cell** | **165** (`hopPerCell`) | `inOut` | Arc 0.55 cell (`hopArc`). One `hopStep` per cell. |
| 13 | Token squash on land | 60 | `out` | 1.08 × 0.94 → 1.00. |
| 14 | Ladder climb | **1100** (`ladderClimb`) | `inOut` | Four rung ticks. Camera lift 500 ms before. |
| 15 | Snake impact freeze | 90 | — | Whole board holds still. This is what makes it land. |
| 16 | Snake head lunge | 120 | `back` | |
| 17 | **Snake slide** | **1100** (`snakeSlide`) — **CONSTANT regardless of snake length** | `inOut` along a Catmull-Rom spline, banking into curves | The longest, most expensive snake must not feel like the longest punishment. |
| 18 | Snake recoil (shield absorbs) | 400 | `back` | Head jerks away. Token does not move. |
| 19 | Shield ring flash | 240 | `out` | Brass ring at token base, then a ≤ 30-particle mint burst. |
| 20 | Ribbon in | **260** (`lessonIn`) | `out` cubic | Fires at `travel × 0.6`. |
| 21 | Ribbon left-edge pulse | 120 | `out` | On the landing frame. |
| 22 | Ribbon hold | 1800 | — | Then out over 200 ms. |
| 23 | Ribbon → card grow | 300 | `out` cubic | To ≤ 45% height (52% snakes). |
| 24 | Card element stagger | 0 / 180 / 600 / 800 / 1000 / 1200 | `out` | See §5.3 table. |
| 25 | Rupee figure count-up | 400 | `out` | From zero. One number per card. |
| 26 | Card dismiss | 200 | `inOut` | Tap anywhere, any time. |
| 27 | Quiz chip press | 80 | `out` | |
| 28 | Quiz answer reveal | 400 | `out` | Count-up + `correct`. |
| 29 | Event card in (from left) | 250 | `out` | Board dims 15%. |
| 30 | Milestone card | 300 in, 2600 hold | `out` | |
| 31 | Turn handoff plaque glow move | 300 | `inOut` | |
| 32 | Camera dramatic (ladder) | 500 out, 500 back | `inOut` | Lift 10°, pull 12%. |
| 33 | Camera dramatic (snake) | 400 in, 500 back | `inOut` | Dip 8°, push 12%. |
| 34 | Square 100 rise | 700 | `back` | +40 px, gold key light. |
| 35 | Celebration | **1600** (`celebrate`) | `out` | Confetti ≤ 60 particles, non-modal, tap-skippable, board stays visible. |
| 36 | Endgame scorecard in | 400 | `out` | |

**Reduced motion** (`prefers-reduced-motion` or the `Kam hilna` toggle): every duration
halved; #12 loses its arc but keeps the per-cell step and the tik; #14 and #17 become a
300 ms fade-and-place; #6, #32, #33, #34 removed entirely; #35 becomes a static gold bloom.
**Ribbon and card timings (#20–#26) are unchanged, so the teaching is identical.**

**Every animation in the game is tap-skippable at all times, without exception.**

---

## 10. Rules

### 10.1 The board — measured, not guessed

8 ladders and 8 snakes, spans 8–24. This exact board was simulated over an absorbing
Markov chain: **E[turns] 28.1, SD 11.1, median 26, p90 43, p99 64** (against the classic
board's 35.8 / 23.4 / 29 / 66 / 119). Net economy **+3.4 squares**, deliberately gentle.
The disaster tail is gone; the drama is not — SD 11 is still four times an empty board's
2.6.

**Do not add a ninth snake or ladder without re-running `tests/board.sim.mjs`.**

```
LADDERS  3→22   12→30   17→36   25→49   41→62   54→71   68→85   78→94
SNAKES   27→9   38→20   46→28   57→40   66→47   74→55   89→79   96→88
```

**Nothing bites above 96, and the two late snakes drop 10 and 8.** On the classic board a
player has a 77% chance of being bitten inside the last fifteen squares, and 87→24 costs
nine turns. Here it is ~55%, and it costs about one turn. **You can lose the lead near the
top. You can never lose the game near the top.**

### 10.2 Movement

- One token per player. There is never a move to choose.
- Roll a d6, hop that many cells, one at a time.
- Land on a ladder foot → climb. Land on a snake head → slide. Resolved automatically,
  never chained (a ladder top that is also a snake head does not fire; by construction no
  such square exists on this board).
- Land on an event square → Jhatka, §10.5.

### 10.3 Finish rule — **OVERSHOOT WINS** (default)

A roll that takes you past 100 finishes you. This is a measured decision, not a
convenience: exact-finish imposes a ~4-turn tax levied **entirely inside squares 95–99**,
at the precise moment attention and tension peak. On this board, time stuck in 95–99 is
1.29 turns with overshoot and 5.44 with exact. On a phone with a 840 ms dice that is eight
seconds of pure nothing per player at the emotional climax.

**Optional `Poora hisaab` toggle, off by default:** exact landing required, **with a mercy
rule — after two failed exact attempts, any roll finishes.** Costs about one turn, keeps
the ritual of the precise arrival that *moksha* demanded, and kills the tax. For teachers
and purists.

**The game ends the instant the first token reaches 100.** Everyone else is ranked by the
square they are standing on, with no further rolls. On a standard board a four-player last
place otherwise keeps rolling for **43 more rounds after the winner is done** — that, not
snake placement, is why families abandon this game mid-session. Ending at first finish
removes 100% of it for zero design cost.

### 10.4 Sixes

Rolling a 6 grants **one** extra roll. A second consecutive 6 grants another. **A third 6
simply ends the turn — it does not forfeit anything, and no message calls it a
punishment.** There is no punishment mechanic anywhere on this board. P(three 6s) = 1/216.

A 6 gets a 450 ms gold flash on the die face and a rising two-note figure, quieter than the
settle clack so it never becomes annoying at ~1 turn in 6.

### 10.5 Jhatka — the structural-risk deck

Six squares: **15, 31, 44, 59, 73, 86.** Repairs, illness, a rent rise, work stopping, a
parent needing care, an unforeseeable bill. Each is labelled **"AAPKI GALTI NAHI"** and
costs **4 squares** — unless the shield eats it.

These exist so the game can never say "you are behind because you were foolish". The
original board's thesis is that your position is deserved; transplanted onto household
finance that is a slander, and the Jhatka deck is the mechanical answer to it, in the code,
not a disclaimer in a footer.

### 10.6 Catch-up — the Bura Waqt Fund, and it is the only one

A small brass lota rides beside a player's token. It **absorbs one snake bite or one Jhatka
completely**: the head strikes, the token bumps, the snake recoils over 400 ms, the lota
flashes and is spent, and the player stays exactly where she was.

Earned two ways:
1. Climb the **25→49** ladder — the board's biggest lift, deliberately.
2. **Automatically**, once per player per game, the moment a player falls **25 or more
   squares behind the leader.** Announced plainly in a ribbon everyone can read: *"Priya ko
   Bura Waqt Fund mila."* **No pity framing, no "you are losing" language, no separate
   screen, no consolation-prize wording.** It re-arms if she falls 25 behind again after
   spending it.

**Why this one and nothing else.** Measured over 4-player games at a 25-square trigger:

| Mechanic | Gap 1st→last | Gap closed | P(round-15 last place wins) | Distortion |
|---|---|---|---|---|
| *none* | 43.3 rounds | — | 8.7% | — |
| **Snake immunity** | **16.0** | **−27.3** | **8.4%** | **−0.3 pp** |
| Double your move | 26.4 | −16.9 | 10.0% | +1.3 pp |
| Roll 2, take best | 35.5 | −7.8 | 8.8% | +0.1 pp |
| +1 to the die | 36.6 | −6.7 | 9.2% | +0.5 pp |
| Reroll a 1 or 2 | 38.5 | −4.8 | 8.7% | 0.0 pp |

Immunity closes 27 rounds of dead time while *lowering* the trailing player's win rate,
because it prevents catastrophe rather than granting speed. Nothing else is close.

**And that is exactly the lesson.** The buffer does not make you rich; it stops you being
destroyed. The mathematically fairest comeback mechanic on the board and the
highest-impact-per-minute concept in Indian household finance are the same object. That is
the reason this design exists.

The shield is **visible on every plaque at all times, to everyone.** Open information. On a
shared phone anything you have to hide kills the social game.

**What we refuse:** no rubber-banding of the dice, no secret weighting, no "lucky"
anything. If a player can construct a story in which the game cheated her, the game has
lost permanently — a fair RNG is not enough; *perceived* fairness is a design deliverable.
The die is a plain, visible, uniform d6 and the shield is a visible object.

### 10.7 Nobody is ever eliminated

Snakes & Ladders has no elimination and we do not add one. No bankruptcy, no skipped turns,
no negative state, no resource to run out of.

### 10.8 Bot behaviour (Mithu, the brass parrot)

Mithu exists so one person can play alone and so a family of three can have a fourth. Mithu
is **not an opponent to be beaten; she is a companion who keeps the board busy.**

- Mithu rolls the same uniform d6 from the same seeded RNG. **She has no advantage and no
  handicap.** The rules engine cannot tell her apart from a human.
- Her turn auto-plays after a **900 ms "thinking" beat** (her plaque tilts, one soft
  chirp), then runs the identical animation loop.
- Her handoff card is **skipped**; she never asks anyone to pass the phone.
- She **shows her lesson ribbons but never opens a card.** Her cards would be reading the
  player did not earn, and would double the session length in solo play.
- She earns and spends the Bura Waqt Fund on the same rules as everyone.
- On a snake she gives a small dejected chirp; on a ladder, a pleased one. That is her
  entire personality and it is enough.
- In solo mode the whole handoff card is removed and the turn budget drops to ~4 s, so a
  solo game runs about 6 minutes.

---

## 11. Player Setup

- **2, 3, or 4 humans, or 1 human + Mithu.** Chosen by one tap on a picture plaque. That is
  the only decision before play.
- Names pre-filled **Khiladi 1…4**. Rename is available forever and requested never; the
  pencil is offered again after round one, when people are actually invested.
- Tokens pre-assigned, each with **both** a distinct colour and a distinct silhouette:
  **matka** (indigo), **diya** (saffron), **chaabi** (plum), **ghanti** (forest), and
  **Mithu** the brass parrot. Colour is never the only signal — "red" and "orange" are the
  same thing on a cheap LCD in daylight and to roughly one man in twelve.
- Multiple tokens on one cell **fan out and never fully overlap** (`tokens3d.js`).
- **Options**, all off by default, all behind one `settings` sheet reachable in two taps:
  `Poora hisaab` (exact finish), `Workshop mode`, `Kam hilna` (reduced motion), `Turn timer`,
  `Awaaz` (voice titles), `Drone`, text size 100 / 125 / 150%.
- **Resume.** State is written to `localStorage` after **every resolved turn**. On reload
  the game restores to the handoff card of the interrupted turn. A shared phone takes calls
  from Amma; losing a twelve-minute family game to one ends the session permanently and
  probably ends the relationship with the product.

---

## 12. End of Game — the takeaway scorecard

**The end screen is the worksheet.** It is the only place in the product where reading is
expected, and it is earned by twelve minutes of dice. It is designed to be photographed and
sent to a WhatsApp group, and to be the thing a teacher reads off a group's phone when she
calls time.

| Beat | Content |
|---|---|
| **1 — Arrival**, 1600 ms, non-modal | Winning token lands, square 100 rises, gold bloom, one temple bell, one line in Lora italic: **"Lakshya poora."** Board stays visible. Tap skips. |
| **2 — Sab pahunche** | One line per player: name, the square they finished on, and what that square means. **Every player gets a rank; the word "lost" appears nowhere; there is no rupee total and no score.** "Priya — 100 · lakshya poora." "Amma — 91 · kaagaz taiyaar, manzil paas." |
| **3 — Aapka raasta** (per player, equal size and dignity) | **SEEDHIYAN**: every ladder climbed, as a checklist of things she now has, each with its concrete first step in full. **SAANP**: every snake that bit her, named, with the rupee cost and — set larger than the cost — **the escape line**. The escape is the deliverable; the cost was only the hook. **SHIELD**: called out separately — "Bura Waqt Fund ne aapko ek baar bachaya." |
| **4 — Ek number** | One figure, gold, Lora, huge, chosen as the most consequential number on **her own** path. One number is what a person carries out of a room. |
| **5 — Aap sabse zyada padhi** (trailing player only) | *"Aapne 6 leaks dekhe. Ravi ne 2. Ab paanchon ka naam aap bata sakti hain."* The player who fell furthest read the most. It is true, it is computed from her own path, and it is the only honest consolation in the game. |
| **6 — Is hafte ek kaam** | **Exactly one action**, never a list. Chosen as the **earliest** ladder in curriculum order that she did *not* climb, expressed as a 15-minute job. "Is hafte: apne Aadhaar se juda mobile number check karo." A checkbox that persists in `localStorage` so she can reopen the tab on Saturday and tick it. Never a second task, never a product, never a fund, insurer or company name, never personalised advice. |
| **7 — Jo chhoot gaya** | Collapsed by default, one tap: the lesson squares **nobody at the table landed on**, as a plain list. This is how a 100-square syllabus survives a 20-square path, and in a classroom it is what the teacher reads out. |
| **8 — Teacher's question** (workshop mode) | A bordered box: *"Table se poochho: kis saanp ne sabse zyada nuksaan kiya, aur kyun?"* Groups finish at different times (median 26 rounds, p90 43), so fast tables have something to argue about while slow tables are still rolling. **The end screen is designed to be the activity, not the exit.** |
| **Buttons** | **"Phir se khelo"** — same players, same seats, board in under 800 ms. **"Photo save karo"** — renders the whole scorecard as one tall PNG to the camera roll. **"Board print karo"** — a one-page A4 of all 100 squares with their lessons, the 8 snakes and the 8 ladders. Plenty of workshops happen where the phone stays in the bag, and the sheet is what goes inside the almirah door. |

**Never on this screen:** a score, stars, coins, XP, a streak, "come back tomorrow", a
leaderboard, a comparison of rupees between players, a share-to-unlock, an email box, a
sign-up prompt, a product recommendation, "open an account". **The absence of the ask is
the pitch.**

---

## 13. Accessibility & Language

### Language

- **Hinglish is the default register, not a translation.** English nouns people already own
  — SIP, EMI, KYC, PAN, Aadhaar, CIBIL, nominee, policy, premium, card, bank — stay in
  English, wrapped in Hindi verbs and Hindi consequences.
- **Banned in all languages**, because textbook Hindi is recognised and not *felt* — it
  reads as a government pamphlet and produces nodding without understanding:

| Never write | Always write |
|---|---|
| inflation / मुद्रास्फीति | **mehngai** |
| chakravriddhi byaj | **byaj pe byaj** |
| nivesh | **paisa lagana** |
| jokhim | **paisa doob sakta hai** |
| aapatkalin nidhi | **bura waqt fund** |
| diversification | **paisa alag-alag jagah rakho** |
| portfolio / corpus / net worth | **aapka paisa kahan-kahan laga hai** |
| liquidity | **zaroorat pade toh kitni jaldi nikal sakte ho** |
| volatility | **utaar-chadhav** |
| returns (as %) | **kitna badhkar mila** — and always in rupees |

- A **हिं / EN** chip is visible in the first frame and switchable **mid-turn without
  interrupting anything.** Persists on the device. Hindi mode is Devanagari at the same
  spoken register.
- Rupee amounts always in Indian grouping via `indianFormat()` — **₹1,00,000, never
  ₹100,000** — and lakh/crore for large numbers. The numbers are the real language and they
  are identical in both modes.

### Reading

- Nothing below **16 sp** except the two deliberately-quiet 13 sp lines.
- Lesson lines: **≤ 90 characters, ≤ 2 visual lines, one sentence.**
- OS text size honoured to **200%** without clipping — the card grows and scrolls rather
  than truncating. Also a 100 / 125 / 150% in-app step, two taps away.
- **No screen requires reading to advance.** A player who reads nothing still learns from
  the colour of the ribbon edge and the size of the fall.

### Touch and input

- Every hit rect **≥ 48 dp** regardless of drawn size. Dice: 64 dp drawn, 88 dp target.
- **Tokens are never tap targets** — there is no move to choose, so a 17 dp piece never has
  to be hit.
- Nothing interactive in the **top 20%** of the screen.
- Portrait only. One layout.
- Every control keyboard-reachable with a visible focus ring and an `aria-label`.

### Motion, colour, sound

- `Kam hilna` toggle, auto-enabled from `prefers-reduced-motion`. See §9.
- Every player has a **silhouette and a colour**; the silhouette is repeated on the plaque,
  the handoff card and the standings strip. Contrast ≥ 4.5:1 everywhere, checked in the
  build.
- Every audio cue has a visual twin. The game is fully playable and fully teachable on
  mute.
- **No timers in workshop mode at all.** In home mode a single 20 s turn arc auto-rolls
  rather than skipping — a distracted player never becomes everyone's problem.

### Screen reader

A polite live region in `#snl-live` announces each turn as one plain sentence: *"Priya ne 4
daala. 22 se 26. Company ka cover. Office health cover ends the day the job ends."* The
board is exposed as an ordered list of 100 items with position, kind and occupant, so the
whole journey can be read without playing.

### Robustness

No login, no signup, no name typing, no permissions, no network after first load, no
analytics beacon in the loop, no CDN call at runtime, no font fetched mid-game. Total
transfer < 1.2 MB. State persisted after every turn.

---

## 14. Anti-patterns — what this game must never do

**Money and monetisation**
1. No login, signup, email, phone, OTP, or password. Ever.
2. No coins, gems, XP, currency counter, wallet, shop, or any `+` that opens anything.
3. No ads of any kind, no rewarded video, no interstitial, no paid ad-removal.
4. No purchases. Nothing in this game can be bought.
5. No spin wheel, daily bonus, streak, timed mission, login reward, or "lucky" anything.
   These are casino patterns rendered in children's colours and they are the specific thing
   an Indian parent is scanning for.
6. **No rupee total attached to winning.** No player is ever "richest". A money counter
   turns a family game into a comparison machine and a game that ranks a mother against her
   daughter by net worth is a game that gets closed.

**Teaching and honesty**
7. **Never personalised investment advice.** No product, fund, AMC, insurer, broker or app
   is ever named as a recommendation. The game teaches mechanisms.
8. **Never promise a return.** Any growth figure carries the literal words *"if it grew at
   12% a year — not guaranteed"*. Lint-enforced.
9. **Never a percentage without a rupee amount beside it.** Lint-enforced.
10. **Never blame the player.** Snakes indict the product and name the counterparty. The
    banned-word list is enforced at build.
11. **Weddings, medical care, education and parents are never a snake.** Hard assert.
12. Never a wrong answer, never a buzzer, never a penalty for a quiz.
13. Never say "SEBI-registered" as if it settles anything — only 21% of Indians can name
    SEBI as the regulator. Say "check the registration number on the regulator's own site".

**Game feel**
14. **No modal during play.** Not the win, not a snake, not a quiz, not a milestone.
15. **No un-skippable animation.** Tapping during anything advances it.
16. No confirmation dialog, no "are you sure", no error state, no disabled control, no
    illegal move. Illegal actions are impossible by construction, so there is nothing to
    apologise for.
17. No elimination, no bankruptcy, no skipped turn, no forfeit.
18. **No hidden information.** No secret goals, no private cards, no hand to shield. On a
    shared device anything you must hide is the moment the social game dies.
19. Never lengthen an animation to make room for a sentence. If a lesson and the dice want
    the same 400 ms, **the dice wins** and the lesson moves to the scorecard.
20. Never rubber-band the dice or weight the RNG. Not once, not invisibly, not "to be
    kind".
21. Never leave the player disoriented — the camera returns to a legible pose within 900 ms
    of any action, and always resets on handoff.

---

## 15. Open Questions

1. **Does the ribbon become wallpaper by turn eight?** The honest expectation is that a
   player retains two or three things, not twenty. The snake-spine number and the
   card-as-handoff-button on 38 squares are the defences. **Test:** sit four mothers in
   Nagpur down, let them play twice, then ask them with no screen to name one snake and
   what it cost. If fewer than three of four can, the fix is **never** more seconds on
   screen — that breaks the rhythm and the whole design. It is moving more teaching onto
   things that cannot be skipped: more of the number onto the snake's body, the escape line
   onto the ladder rungs, the milestone recap into the handoff card where the player is
   already waiting.
2. **Does the warmth read as condescension?** Every line containing "you" is suspect until
   read aloud to a real person who is not on the team. The failure mode is invisible from
   inside the build, because the writer feels kind while doing it. Panel feedback already
   cut the "money in your own name" framing for importing a household argument that may not
   be hers, read in front of her daughter. Expect to rewrite roughly a third of the lines
   after one workshop pass.
3. **Does the RUKO / workshop pause turn this into a lecture?** The button is in the
   teacher's hand and we cannot design that away. If real testing shows the median workshop
   session running past 25 minutes, the fix is **not** faster animations — it is a
   `Chhota game` mode that starts every token on square 26 and finishes at 75, keeping
   every timing untouched. That is Quick Ludo's lesson: change the starting state and the
   win condition, never the feel.
4. **Six Jhatka squares — enough?** If playtesting shows players still reading the board as
   a verdict on themselves, the mechanical fix is to raise the Jhatka count and lower the
   snake count, so more of what happens is visibly not her doing. That is a truer picture of
   an Indian household's finances anyway. It requires re-running the board simulation.
5. **Is `Bura Waqt Fund` the right name?** It is our coinage. It may read as charming or as
   patronising and we cannot tell from here. Alternatives to test: `Bura waqt ka paisa`,
   `Emergency fund` (Tier-A English), `Tinka fund`.
6. **Do the five quiz squares survive the kitchen table?** Panel 1 warned that "room answers
   out loud" becomes an awkward silence with only a mother and a daughter present. The
   two-chip home-mode presentation is the mitigation; verify it does not still stall.
7. **Numbers go stale.** Every figure in `CONTENT.md` carries its vintage and its source.
   A dated review is required annually — F&O loss shares, expense ratios, term premiums,
   FD rates and unclaimed-money totals all move.

---

## Contract amendments — stated loudly, as required

1. **`config.js` → `timing.snakeSlide`: 1250 → 1100 ms, and it is now a CONSTANT for every
   snake regardless of length.** Long snakes move faster, not longer.
2. **`content.js` → `SQUARES[].kind` gains `'event'`.** Full set:
   `'plain' | 'lesson' | 'quiz' | 'event' | 'milestone' | 'finish'`. Snake heads and ladder
   feet carry `kind: 'lesson'` and are resolved via `snakeAt()` / `ladderAt()`.
3. **`rules.js` → the default finish rule is OVERSHOOT WINS, not bounce-back.** The current
   implementation bounces. It must accept `options.exactFinish` (default `false`); when
   `true` it uses exact-finish **with the two-attempt mercy rule** (`blocked` twice, then
   any roll finishes). The `bounce` event stays in the API but only fires under
   `exactFinish` legacy mode, which nothing ships with.
4. **`rules.js` → the game ends at first finish.** `isOver()` returns true the moment any
   player reaches 100; remaining players are ranked by `pos`. No further turns are taken.
5. **`rules.js` → new state**: `players[].shield` (boolean), `players[].shieldUsed` (int),
   `players[].eventsHit` (array). New events: `shield` (absorbed), `shieldGranted`,
   `event` (Jhatka). Auto-grant trigger: `leaderPos - p.pos >= 25`, once per player per
   game per spend.
6. **`lesson.js` → `showLesson()` payload gains `counterparty`, `heritage`, `handoffLabel`.**
7. **New file `js/bot.js`** is *not* added — Mithu lives inside `game.js` as a turn policy,
   because she makes no decisions. `rules.js` must not know she exists.
8. **New test `tests/board.sim.mjs`** — the Markov/Monte-Carlo board simulation. It is a
   gate: any change to `SNAKES` or `LADDERS` must re-run it and keep median ≤ 28 rounds and
   p99 ≤ 70.
9. **New test `tests/content.lint.mjs`** — §5.6. It is a gate.
