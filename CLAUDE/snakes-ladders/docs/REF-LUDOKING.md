<!-- Measured research, gathered 3 Sep 2026. This is the BENCHMARK critics judge against. -->

Reset done. Here is the teardown.

---

# LUDO KING — UX & ANIMATION TEARDOWN
**Purpose:** engineering spec reference for animation timings and UX beats.
**Provenance markers:** `[V]` verified from a cited source · `[O]` observed by me running the game this session · `[K]` well-established knowledge of the title · `[S]` recommended spec target derived from the above (not a measured value — treat as our engineering number, not a claim about Ludo King)

---

## 0. Scale context (why this is worth copying)

| Metric | Value | |
|---|---|---|
| Lifetime downloads | 1 bn+ | [V] |
| Share of downloads from India | ~80% | [V] |
| Share of revenue from India | >40% | [V] |
| Rank, India downloads Q1–Q3 2024 | #1 game overall | [V] |
| Peak DAU (pandemic) | 51 M | [V] |
| Avg session length | 15–20 min | [V] |
| Install size | 631.5 MB (iOS) / ~183 MB APK, ~250 MB installed (Android) | [V] |
| Min OS | iOS 15.0 / Android 7.0 | [V] |
| Runs on | 1 GB RAM | [V] |
| iOS US rating | 3.7★ / 19k ratings | [V] |
| Ads share of revenue | ~70% (secondary estimate, treat as directional) | [V] |
| Smallest IAP in India | ₹9 (~$0.11) | [V] |
| Effect of the sub-₹10 pack | ~1,000× lift in new-buyer conversion | [V] |
| Engine / orientation (web build) | HTML5, **portrait** | [V][O] |

**The single most important fact:** Ludo King has essentially no onboarding, because the onboarding happened in the player's childhood. The app's entire job is to not get in the way of a mental model that is already installed. Everything below is downstream of that.

---

## 1. First 30 seconds

### What actually happens
1. **Splash**: full-bleed tiled dark-blue background of embossed dice pips; gold-crowned "LUDO KING" wordmark; four glossy tokens (red/blue/green/yellow) flanking a mini board and one white die; caption "The Official Ludo King™ Game"; a single horizontal progress bar. No spinner, no percentage text, no tips. `[O]`
2. **First run identity**: name is **pre-filled** with an auto-generated handle (I was handed `Guest1234`) and a default avatar tile is pre-selected. You may change either. You may also just proceed. `[O]`
3. **Main menu**: a vertical stack of chunky gold-plaque buttons over the board artwork — *Play Online / Play with Friends / Computer / Pass n Play* as a 2×2 grid of large icon+label plaques, plus a bottom rail of secondary items (Lucky/Spin, daily gift, shop). `[V][K]`
4. **Mode pick → colour pick → board.** Board loads with your plaque highlighted and the dice already pulsing.

### Tap count to first meaningful action

| Path | Taps from cold launch to first dice roll |
|---|---|
| Computer mode (offline) | **4–5** (icon → accept name → Computer → 2/4 players → dice) `[K]` |
| Pass-n-Play | **4–5** `[K]` |
| Online multiplayer | **5–6**, plus a "fetches players within a few seconds" wait `[V]` |

**Time to first dice tap on a warm start: under 15 seconds. The first *game* interaction is a single tap on a large object that is already glowing.**

### What is NOT asked — the important list
- ❌ No account, email, phone number, or OTP
- ❌ No password
- ❌ No permission prompts gating play (no contacts/location/camera before the board)
- ❌ No forced tutorial, no walkthrough overlay, no "skip" you have to find
- ❌ No difficulty selection
- ❌ No typing at all (name is pre-filled)
- ❌ No internet (Computer + Pass-n-Play are fully offline) `[V]`
- ❌ No rules screen — the rules are assumed known
- ❌ No reading beyond one or two words per button
- ❌ No configuration decisions of any kind

**Spec rule:** every decision put in front of a first-time player before their first tap costs you a share of tier-2 mothers. Ludo King's count is effectively **one** (which mode), and even that is a 2×2 grid of pictures.

---

## 2. The dice tap

This is the game's atomic unit. Everything else is consequence.

### The anticipation beat
- The dice is **always already on screen**, in a fixed tray adjacent to the active player's avatar plaque. You never hunt for it, never scroll to it, never open anything. `[K]`
- When it becomes your turn, the dice **pulses** — a slow scale loop, roughly 1.00 → 1.06 → 1.00 on a ~900–1100 ms cycle — and your avatar plaque gets a glow ring. `[K]`
- A **circular countdown arc drains around the active avatar**. Online turn windows across this class of game run **10–30 s**. `[V]`
- The pulse is the entire tutorial. No text says "tap the dice." The only moving, glowing thing on a static board is the dice.

### The roll
| Beat | Timing | |
|---|---|---|
| Touch-down → visual response | immediate; dice depresses/scales down ~0.92 | `[S]` |
| Tumble animation | **~600–900 ms** — sprite-sequence "3D" tumble, not a physics sim | `[K]`/`[S]` |
| Settle | small overshoot bounce, ~120–150 ms, ease-out-back | `[S]` |
| Sound | dry wooden/plastic **rattle** during tumble, single **clack** on settle | `[K]` |
| Total tap → number legible | **≈750–1000 ms** | `[S]` |

Critically the tumble is **short enough not to be a wait, long enough to be a suspense beat**. Under ~400 ms it reads as a number appearing (no drama). Over ~1200 ms it reads as lag. The 600–900 ms band is the whole trick.

### The "6" — the engine of the game
- P(6) = 1/6 ≈ **16.7% of every tap is a jackpot.** `[K]`
- A 6 grants: token out of base **and** an extra roll. `[V]`
- Capture also grants an extra roll. Getting a token home also grants an extra roll. `[V]`
- **Net: roughly 1 in 4–5 rolls produces a "you go again" event.** That is a variable-ratio reinforcement schedule with a mean interval of ~5 taps — extremely dense by casual-game standards.
- The 6 gets its own louder treatment: flash/sparkle on the die face, a distinct rising sfx, and the dice stays hot rather than passing to the next player.
- **The only punishment in the game** is three consecutive 6s forfeiting the turn. `[V]` P = 1/216 ≈ **0.46%.** It is rare enough to be a funny story, not a loss. **There is essentially no loss aversion anywhere in the loop.**

### Auto-move vs manual pick — the most under-copied mechanic
- **Exactly one legal move → the game moves the token for you.** No second tap. `[V]`
- **Multiple legal moves → legal tokens bob/glow; you tap one.** `[V]`
- **Zero legal moves → a brief message and the turn passes automatically.** `[K]`

The consequence: **on a large fraction of turns the player's entire input is one tap on the dice.** They are never presented with a choice they don't understand, never stall, never make an illegal move, never see an error. The game plays itself except at the moments where a real decision exists.

> **Spec rule:** compute the legal move set before asking anything. If `|legal| == 0`, auto-pass with a 700–1000 ms notice. If `|legal| == 1`, auto-execute. Only if `|legal| >= 2` do you ask. Never show a disabled control; never show an "invalid move" error.

---

## 3. Token movement

### The hop
- Tokens travel **cell by cell**, not by tweening in a straight line to the destination. This is non-negotiable — it is what makes the dice number *physical*. `[K]`
- Per-cell arc hop: **~130–180 ms**, ease-in-out, with a vertical arc of roughly 0.5–0.8× cell height. `[S]`
- **One "tik" click sound per cell.** The player *hears* the count. `[K]`
- A 6 therefore takes **≈800–1100 ms** of travel; a 1 takes ~150 ms. Bigger rolls literally feel longer and more rewarding — the reward is stretched in time, not just in number.
- Slight squash on landing each cell (scale ~1.08 × 0.94), recovering in ~60 ms. `[S]`

### Capture / kill
The loudest non-victory moment in the game.
| Beat | Timing | |
|---|---|---|
| Impact freeze | ~80–120 ms hold on contact | `[S]` |
| Captured token launch | curved parabolic arc back to its home yard, **~500–700 ms** | `[K]`/`[S]` |
| Sound | comedic "boing"/whoosh + a splat/thud on landing in the yard | `[K]` |
| Extra-turn cue | dice re-lights immediately after the arc lands | `[V]` |
| Total | **≈700–900 ms, then straight back to your dice** | `[S]` |

The captured token is **thrown**, visibly, across the board to its origin. The victim watches their progress physically undone. This is the game's entire emotional peak and it costs one arc tween and two sound files.

### Reaching home
- Token pops into the centre triangle with an upward scale + chime, **~400–600 ms**, plus an extra roll. `[K]`

### How the board reads at a glance
This is the part most clones get wrong.
- **15 × 15 cell grid.** Four 6×6 coloured home yards at the corners; three-wide cross arms; 3×3 centre home triangle; 52-cell shared track; 6-cell coloured home column per player. `[K]`
- Each token travels **51 track cells + 6 home cells = 57 steps**; ×4 tokens = **228 steps minimum per player.** `[K]`
- **Ownership = colour.** Four maximally-separated saturated hues (red / green / yellow / blue; +purple, orange in 6-player). No two are confusable at 3 metres or on a bad LCD. `[V][O]`
- **Progress = geometry.** The arms point inward. *Closer to the middle = closer to winning* is spatially self-evident. Nobody counts.
- **"How am I doing?" = how empty is my yard.** The 6×6 yard makes "3 of my 4 tokens are still stuck" a single glance, no number, no HUD.
- **Text on the board: essentially zero.** Only player names and coin counts, and both are outside the board. `[O]`
- Safe cells are marked with a **star glyph** (4 starred + the 4 coloured entry squares) — an icon, not a word. `[V]`
- Two same-colour tokens on one cell render as a **stacked/doubled piece** = a block other tokens cannot pass. Read as a visual, not a rule. `[V]`

> **Spec rule:** a player must be able to answer "whose turn, who's winning, what happened last" from a silent screenshot, with no text.

---

## 4. Visual language

### Colour
- Pure, high-chroma primaries — approximately red `#E63329`, green `#2AA84F`, yellow `#F5C518`, blue `#1E88E5` — on **white** board cells, inside a **deep navy-blue** frame with **gold** furniture. `[O]`
- Deliberately unfashionable and deliberately high-contrast: it survives a cheap 400-nit LCD in Indian daylight, and it survives ageing eyes. There is no low-contrast grey-on-grey anywhere.
- Gold = "special/reward" throughout (crown, plaques, coins). One consistent semantic.

### Shape chunkiness
- Tokens are **glossy chess-pawn silhouettes**, taller than a cell, with a highlight blob — they *stand up* off the grid rather than sitting flush, so they read above the board lines. `[O]`
- Buttons are **thick bevelled plaques** with a visible 3–5 px darker bottom edge, i.e. they look physically pressable. No flat/ghost/outline buttons anywhere in the primary flow.
- Nothing is thin. No hairlines, no 1 px borders as meaningful UI, no icon-only affordances without a label.

### Touch targets
| Element | Approx size | |
|---|---|---|
| Dice | ~2.5× a board cell ≈ **56–64 dp** square | `[S]` |
| Menu plaque buttons | **64–72 dp** tall, near-full-width or half-width in a 2×2 | `[S]` |
| Board cell (360 dp screen, 16 dp margins) | 328 / 15 ≈ **21.8 dp** | `[S]` |
| Token visual | ~0.8 cell ≈ **17 dp wide** — *smaller than a fingertip* | `[S]` |

**The token problem and how Ludo King dodges it:** a 17 dp token cannot be a reliable tap target. Ludo King's answer is *not* bigger tokens — it's **auto-move**, which removes the need to tap a token on most turns. When you must tap, only 2–4 tokens are legal, they bob to advertise themselves, and their hit rects are inflated well beyond their sprites.

> **Spec rule:** inflate hit rects to ≥ 44–48 dp regardless of sprite size, and design the loop so precise taps are rare rather than making the art bigger.

### Text
- Almost none. Button labels are **1–2 words, bold, often uppercase**, paired with an icon that carries the meaning on its own. `[O]`
- Approximate scale: button labels **16–20 sp bold**, coin/diamond counters **14–16 sp**, player names **12–14 sp**. `[S]`
- **Numbers beat words** everywhere: pip faces, coin counts, token counts.
- Localisation reach is enormous (14 languages / 30 countries in 2021; voice content spanning 22 official Indian languages and 121 dialects) `[V]` — but the *game* needs almost none of it, because the board is the language.

### Low-end Android / small screens
- **2D sprites, not 3D.** The "3D" tumbling die is a sprite sequence. No shaders, no physics engine, no particle storms. `[K]`
- Runs at 1 GB RAM. `[V]`
- Single static background; the board is the only busy region.
- **Portrait-locked.** `[V][O]` One layout to get right; matches one-handed phone use.
- Board occupies ~90–95% of screen width, vertically centred; top bar (~8% height) for currency/settings; bottom band (~15%) for the dice tray and player plaques. `[S]`
- Fully playable offline — no network round-trip in the core loop. `[V]`

---

## 5. Feedback and juice

### Frequency
- **Something moves or sounds every 2–4 seconds.** There is no quiet state longer than one turn timer.
- A **reward moment** (a 6, a capture, a token home, a block formed) fires roughly **every 4–6 rolls**.
- The player's own turn arrives every ~10–40 s in a 4-player game, and turn timers cap the worst case.

### Duration — all short
| Moment | Duration | |
|---|---|---|
| Dice settle + number pop | ~150 ms | `[S]` |
| "6!" flash + sfx | ~400–600 ms | `[S]` |
| Per-cell hop tick | 130–180 ms | `[S]` |
| Capture sequence | 700–900 ms | `[S]` |
| Token reaches home | 400–600 ms | `[S]` |
| Turn handoff (plaque glow moves) | ~300 ms | `[S]` |
| Match victory (confetti + trophy + coins counting up) | **3–5 s**, then a Play Again button | `[K]` |

### What never blocks the player
- **No celebration is modal during play.** Confetti, sparkles and flying tokens are overlays; the board stays visible and the next turn begins underneath/behind them.
- **No un-skippable animation.** Tapping during a celebration advances it.
- **No mid-turn popup.** The interruption points are *between* matches, never mid-board. (This is also where the ads live — see §7.)
- **No error states.** Illegal actions are impossible by construction, so there is nothing to apologise for.
- **No confirmation dialogs** in the core loop.

> **Spec rule:** every celebration must be ≤ 1.5 s, non-modal, tap-skippable, and must never gate the next input.

---

## 6. Session shape

| Mode | Length | |
|---|---|---|
| Classic 4-player | **15–40 min** | `[V]` |
| **Quick Ludo** | **~5 min** (5–10 max) | `[V]` |
| Typical measured session | 15–20 min | `[V]` |

### How Quick Ludo compresses the game (a masterclass in mode design)
- **Two tokens start already on the board.** You are never stuck rolling for a 6 to begin. `[V]`
- **Win = get one token home** — but **you must have captured at least one opponent token.** `[V]`
- That single condition forces aggression and prevents a pure race, so a 5-minute game still contains the game's best moment (the kill).
- Optional diamond-cost **undo** to re-roll after a bad dice. `[V]`

**This is the highest-value thing to port:** they did not make the game shorter by speeding up animations. They changed the *starting state* and the *win condition*, and left the feel untouched.

### Waiting for other players
- Matchmaking "fetches players within a few seconds" and starts instantly once filled. `[V]`
- During opponents' turns: **preset chat**, **emoji throwing** at opponents, voice chat in the app build. `[V]` The wait is turned into a social channel, not a loading state.
- The **turn timer (10–30 s)** hard-caps dead time. `[V]` In a 4-player game the worst case between your turns is ~90 s and the typical case is far shorter.
- **Auto-move on timeout** keeps a distracted or disconnected player in the game rather than stalling the table. `[V]` A missed turn does not become everyone's problem.
- 2–6 online players, 8-player tournament, computer bots, and local pass-and-play all exist `[V]` — so **there is always a game available**, network or not, friends or not.

### Never nothing to do
The board itself is the entertainment while waiting. Opponents' tokens hopping, dice tumbling and captures happening are *watchable*. There is no hidden state, no fog of war, no private hand — **every player can follow every other player's turn**, which is precisely why it works as a room-full-of-family game and why spectating never feels like waiting.

---

## 7. Trust — honest ledger

### What earns a tier-2 mother's trust

1. **It is a physical object she already owns.** Zero learning, zero risk of looking foolish in front of her children. The strongest trust signal in the product is that it isn't new.
2. **No signup wall.** No email, no phone, no OTP, no password. She hands over nothing to play. `[O]`
3. **Fully playable offline and free forever.** Computer mode and Pass-n-Play require no network and no spend. `[V]`
4. **No paywall in the core loop.** You never lose a match because you didn't pay. Coins buy cosmetics and entry to coin tables, not dice.
5. **Coins and diamonds cannot be converted to real money** — stated explicitly in the official FAQ. `[V]` This is the line that keeps it out of "gambling app" territory in a parent's mind.
6. **4+ age rating.** `[V]` No violence, no suggestive content.
7. **RNG certified by iTech Labs** and stated publicly. `[V]`
8. **It works on her actual phone.** 1 GB RAM, Android 7. `[V]`
9. **Family framing, not gamer framing.** "Recall your childhood." Pass-n-Play means one phone, four people, same sofa.
10. **No reading required**, in any language.

### What is predatory — the list we must NOT copy

1. **Ads are ~70% of revenue** `[V]` — the product is structurally an ad delivery vehicle. Interstitials fire between matches and on loading screens; rewarded video is offered everywhere.
2. **Persistent currency HUD.** Coin and diamond counters sit top-left on every screen, each with a **+** that opens a shop. The economy is never out of the player's eyeline. `[O]`
3. **Slot-machine grammar aimed at a 4+ audience**: spin-the-wheel, daily bonus, "lucky dice," streaks, daily goals. `[V]` These are casino UI patterns rendered in children's colours.
4. **Ad-removal is a paid upgrade** ("King Pass / Get Verified," **$9.99**). `[V]` The free experience is deliberately degraded to sell the fix.
5. **Coin-wager tables** with meaningful buy-ins (₹100-level entries reported). `[V]` Even though coins aren't cashable, this *looks and feels* like betting, and it is the exact thing an Indian parent is scanning for.
6. **The dice-rigging perception is a live trust failure.** iOS US sits at **3.7★ across 19k ratings**, with recurring reviews alleging biased dice and pay-to-win. `[V]` Note what this means for us: *a certified-fair RNG is not enough.* If a player can construct a story where the game cheated them into buying something, they will, and your rating carries it forever. **Perceived fairness is a design deliverable, not a legal one.**
7. **Themes and crowns gated behind timed missions** ("win 2 matches within 6 hours") — manufactured urgency. `[V]`
8. **Poorly moderated stranger chat.** `[V]` A serious problem in a 4+ app that families hand to children.
9. **631 MB on iOS** `[V]` for a board game — largely ad SDKs, seasonal content and video. On a metered connection that is a real cost imposed on the user.
10. **Home-screen clutter.** Roughly ten competing CTAs, most of them monetisation surfaces, wrapped around the two buttons anyone actually wants. `[V]`

**The honest summary:** Ludo King earns trust with its *game* and spends it with its *shell*. The board is generous, legible and fair. Everything surrounding the board is an extraction funnel. The 3.7★ is the price of that trade.

---

## 8. Port list — what to lift, what to leave

### Lift (with numbers)

| Beat | Target |
|---|---|
| Taps from launch to first meaningful action | **≤ 3** |
| Fields to fill before playing | **0** (pre-fill the name) |
| Words on any primary button | **≤ 2**, always with an icon |
| Text visible on the play surface | **~0** |
| Primary action affordance | already on screen, already glowing, pulse 1.00→1.06 @ ~1 s |
| Dice/roll suspense window | **600–900 ms** — never shorter, never longer |
| Per-step travel + one tick sound | **130–180 ms/cell**, arc hop, squash on land |
| "You go again" event probability | **~1 in 5** — make it loud |
| Punishment probability | **< 1%**, and make it funny |
| Auto-resolve rule | 0 legal moves → auto-pass; 1 legal move → auto-execute; ≥2 → ask |
| Celebration duration | **≤ 1.5 s**, non-modal, tap-skippable |
| Turn timeout | **15–20 s**, with a draining arc on the active avatar, then auto-move |
| Hit rects | **≥ 44–48 dp** irrespective of sprite size |
| Colour | 4 maximally-separated saturated hues, white cells, high contrast |
| Progress legibility | encode progress in **geometry** (inward = winning) and **an emptying yard**, not in a number |
| Short mode | change the **start state and win condition**, never the animation speed |
| Idle-time design | give waiting players something expressive to do, and make every turn watchable by everyone |

### Leave

- Persistent currency HUD and any `+` that opens a store
- Spin wheels, daily streaks, timed missions, "lucky" anything
- Interstitials, rewarded video, and paid ad removal
- Any wagering or entry-fee surface
- Stranger chat
- Anything that lets a losing player construct a "the game cheated me to sell me something" story — **including** cosmetics that could be misread as advantage

---

**Sources:**
[Naavik — Why Ludo King Dominates in India](https://naavik.co/digest/ludo-king-takes-over-the-indian-mobile-games-market/) · [Ludo King on the App Store](https://apps.apple.com/us/app/ludo-king/id993090598) · [Ludo King official FAQ](https://ludoking.com/faq) · [CrazyGames — Ludo King rules & features](https://www.crazygames.com/game/ludo-king) · [Gametion blog — Quick Mode & 6-Player launch](https://blog.gametion.com/2021/01/ludo-king-rolls-out-quick-mode-and-6-player-online-multiplayer-updates/) · [GamingOnPhone — Ludo King guide](https://gamingonphone.com/guides/ludo-king-guide/) · [Bandopadhyay, John & Karandikar (2023), *Ludo King Through the Lens of UI and TAM*, Journal of Research Administration 5(2)](https://journlra.org/index.php/jra/article/download/1006/886/2975) · [AppBrain — Ludo King](https://www.appbrain.com/app/ludo-king%C2%AE/com.ludo.king) · [Zupee — Ludo rules](https://www.zupee.com/ludo/ludo-rules/) · [SmartAds — Ludo King advertising](https://smartads.in/services/digital/ludo-king-app-digital-advertising) · [Republic World — How to play Ludo King](https://www.republicworld.com/tech/gaming/how-to-play-ludo-king) · [Singular — Top mobile games 2026](https://www.singular.net/blog/top-mobile-games/)