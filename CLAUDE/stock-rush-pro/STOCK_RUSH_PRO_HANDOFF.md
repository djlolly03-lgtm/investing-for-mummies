# Stock Rush Pro — Session Handoff (2026-05-22)

Drop this file into a fresh chat and you have full context. Read top-to-bottom once, then jump to "Quickstart for next session" at the bottom.

---

## 1. What this is

**Stock Rush Pro** is the premium-tier sibling of Stock Rush. Same 8 Indian stocks, same 5 rounds 2016→2025, but with:
- ₹2,00,000 starting cash (vs teen's ₹1L)
- 6 corporate actions (dividend, split, IPO, bonus, buyback, rights) — teen has none
- 2026 finale reveal after round 5
- Auto-advance per-round countdown with teacher pause/force-advance
- Live drama (trade flashes, lead-change banners)
- Rich final-results analysis (per-student lesson, counterfactual, sector donut)

**Audience:** Mummies / first-time adult investors. Brand line:
> "9 years of India's markets · in 30 minutes"

**Status:** Live in production. Last deploy `v=20260522a`.

---

## 2. Where it lives

| Asset | Path / URL |
|---|---|
| Source folder | `/Users/lollyg/Documents/investing for Mummies/CLAUDE/stock-rush-pro/` |
| Deploy command | `cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --prod` |
| Vercel URL | `https://ifm-deploy.vercel.app/stock-rush-pro/` |
| WordPress page | `https://investingformummies.com/stock-rush-pro` (iframes the Vercel URL) |
| WP snippet file | `/CLAUDE/stock-rush-pro_wp_snippet.html` (paste into WP Custom HTML block) |
| QA report | `/.gstack/qa-reports/qa-report-stock-rush-pro-2026-05-21.md` |
| Teen reference (read-only) | `/CLAUDE/stock-rush/` — **NEVER edit this** |

**Hard rule from earlier in the project:** never touch anything under `/CLAUDE/stock-rush/`. Teen is the validated production reference. All changes go in `/CLAUDE/stock-rush-pro/`.

---

## 3. File structure

```
stock-rush-pro/
├── index.html         — Entry point, loads scripts, defaults role=host
├── game-data.js       — All static content (stocks, prices, news, config)
├── engine.js          — State machine + Supabase realtime + bot AI
├── ui-common.jsx      — Shared React components (Avatar, RoundTimer, etc.)
├── host-view.jsx      — Teacher / projector view
├── player-view.jsx    — Student / phone view
├── styles.css         — All CSS (heavy use of inline styles in JSX too)
└── STOCK_RUSH_PRO_HANDOFF.md — This file
```

All `.jsx` files are loaded as `<script type="text/babel">` and transpiled in-browser by `babel-standalone`. No build step. (QA flagged this as a perf concern but it's deploy-pipeline scope.)

---

## 4. Engine API (window.StockRush)

```js
window.StockRush = {
  getState(),                          // returns current state snapshot
  subscribe(fn),                       // listen to state changes, returns unsub
  ready,                               // Promise resolving after initial DB peek

  // Lifecycle
  goLive(),                            // teacher taps "Resume this game →"
  forceNewGame(),                      // teacher taps "Start a fresh game"
  hasExistingGame(),                   // does the DB have a recent live game?
  existingGameInfo(),                  // { phase, round, humanCount, ageMs }
  startGame(),                         // lobby → round 1 (also runs _balanceBots)
  reset(),                             // wipe to fresh state mid-game

  // Player management
  join(player),                        // student joins
  leave(playerId),                     // student taps NOT YOU?
  kick(playerId),                      // teacher removes a player
  onKick(fn),                          // listen for kicks (returns unsub)

  // Trading
  buy(playerId, ticker, qty),          // buy stock (gated to trading phase + !paused)
  sell(playerId, ticker, qty),         // sell stock (allowed during events for IPO sell-to-fund)
  react(playerId, emoji),              // emoji reaction during news

  // Lock + round flow
  lock(playerId),                      // student locks in trades
  advanceRound(),                      // teacher force-advances (or auto-fires)
  togglePause(),                       // pause/resume trading + timer
  dismissCurrentEvent(),               // force-advance through events
  endFromFinale(),                     // 2026 finale → ended

  // Events
  submitChoice(playerId, choice),      // player responds to IPO/buyback/rights
};
```

**State shape (engine.js _freshState):**
```js
{
  phase: 'lobby' | 'events' | 'trading' | 'finale' | 'ended',
  round: 0..5,                          // 1-indexed when playing
  roundStartedAt: timestamp,
  paused: bool,
  pausedAt: timestamp | null,
  pausedMs: number,                     // accumulated paused ms this round
  eventQueue: [...],
  currentEvent: { type, stockId, ... } | null,
  eventChoices: { [playerId]: choice },
  stocks: [{ id, name, sector, cap, risk, price, prevPrice, history, ... }],
  players: { [id]: { id, name, color, avatar, isBot, cash, holdings, holdingsCost, worthHistory, dividendsEarned, zomatoAllocated } },
  locks: { [playerId]: true },
  news: [{ headline, subhead, notes, round, type, t }],
  activity: [{ id, text, t }],
  reactions: [{ id, playerId, emoji, t }],
  hostId, tickCount,
}
```

---

## 5. Game data reference

**Config** (`window.GAME_CONFIG`):
- `rounds: 5`
- `startingCash: 200000`
- `tickMs: 1000`
- `roomCode: 'PRO'` (overridden by URL `?room=`)
- `gameKey: 'pro'` (namespace for Supabase channel: `room:pro-PRO`)
- `ipoApplyOptions: [10000, 25000, 50000]`
- `ipoAllocationMin: 30`, `ipoAllocationMax: 45` (%)

**Round durations** (`window.ROUND_DURATIONS`):
| Round | Auto-advance |
|---|---|
| R1 → R2 | 150 s (2:30) |
| R2 → R3 | 130 s (2:10) |
| R3 → R4 | 110 s (1:50) |
| R4 → R5 | 90 s (1:30) |
| R5 → finale | 80 s (1:20) |

**Stocks (8 + Zomato IPO):** ITC, RELIANCE, INFY, YESBK, TITAN, TRENT, DIXON, DMART + ZOMATO (post round-3 IPO).

**Mascot avatars (8, hue-distinct):**
| Emoji | Label | Color |
|---|---|---|
| 🦉 | Owl | `#1a5c47` emerald |
| 🐢 | Tortoise | `#1f7a4d` forest green |
| 🦁 | Lion | `#d4953a` amber |
| 🦋 | Butterfly | `#7c3aed` violet |
| 🐝 | Bee | `#c44d8c` pink |
| 🐘 | Elephant | `#3b82c4` steel blue |
| 🦊 | Fox | `#dc2626` crimson |
| 🐬 | Dolphin | `#2a9d8f` teal |

**Bots (6, fill up to 6 total players):** Maya 🦉, Theo 🐘, Zara 🦋, Kai 🦊, Iris 🐝, Asha 🦁.
Formula: `botsNeeded = max(0, 6 - humanCount)` applied at `startGame`.

**Tagline** (`window.IFM_TAGLINE`): "9 years of India's markets · in 30 minutes"

**Final 2026 reveal** (`window.FINAL_PRICES` + `window.FINAL_NEWS`): 5 winners + 4 losers narrative, applied between round 5 and ended.

---

## 6. Feature inventory (what's been built)

### Lifecycle / entry
- ✅ Splash screen with **Resume / Start fresh** choice when stale game detected
- ✅ Default role = host on bare URL; players come in via `?role=player&room=PRO`
- ✅ 30-minute staleness threshold (game older than 30 min counts as abandoned)
- ✅ `forceNewGame()` wipes DB and seeds fresh state

### Lobby (host)
- ✅ 280-px QR code, bigger room code, single tagline
- ✅ Player chips: 68-px disc + name, hue-distinct colors, gentle bob animation
- ✅ 🎉 Arrival flash banner when a new human joins (center-screen, ~3.4 sec)
- ✅ Concept chips ("Stock Split / Dividend / IPO / Bonus / Buyback / Rights")
- ✅ **Sticky Start button** — pinned at bottom of scrollable card (fixes 12-player overflow)
- ✅ Dynamic start text: `Start with 6 Bots →` / `Start Game with N + M bots = 6 players →` / `Start Game with N Players →`

### Trading (host)
- ✅ Header: brand + Room + Classroom edition subtitle + Pause/Drama/Next buttons
- ✅ Big round timer (20 px font) with countdown, < 15 s warning, < 5 s pulse, paused state
- ✅ Market sentiment chip (📰 COVID Crash / 📰 India Roars Back / etc.) under round label
- ✅ Two-column body: leaderboard left + events log; activity + market ticker right
- ✅ Live leaderboard with per-row colored stripe (player's avatar color), podium gradients top 3
- ✅ Sector-tinted portfolio chips, big worth + P&L pills
- ✅ Trade flash stack (top-right, currently `top: 480` — QA flags overlap with Market Prices)
- ✅ Lead change banner (teal gradient, 14 sneaky comments randomized)
- ✅ Activity feed colored: buy=green / sell=red / lock=indigo / round=amber / event=violet
- ✅ Kickable lock chips (hover → red ✕ → confirm → engine.kick)

### Trading (player)
- ✅ Always-visible "YOURS" holdings strip
- ✅ Summary strip: Cash / Stocks / Total / P&L
- ✅ WorthChart with smart-append (live total as trailing point)
- ✅ Lock confirm modal showing this-round trades + portfolio review
- ✅ Round-trades counter under lock button
- ✅ Trade tab: TradeCard with **tap-to-expand briefing** (company desc + this-round news + fun fact + watch-for)
- ✅ Portfolio tab with count badge; News tab with badge
- ✅ Trade sheet (bottom drawer) with % presets (25/50/75/MAX)
- ✅ Paused banner (amber, pulsing) when teacher pauses
- ✅ NewsToast as full modal with X-close, no auto-dismiss
- ✅ Tabs accessible even when locked

### Events (corporate actions)
**All 6 events have:**
- Auto event header: 64-px theme-colored icon disc + badge + stock name
- Light-card background (was dark, fixed)
- Themed impact panel
- Body explanation

**Auto events (dividend / split / bonus):**
- Hero "+₹500 cash" panel (dividend)
- Visual before/after card with badge (split: "×5", bonus: "+50 FREE")
- Reassurance strip ("Your value is unchanged" / "Cost to you: ₹0")

**Choice events (IPO / buyback / rights):**
- Hero card with market price ↔ offer price comparison
- BigChoiceRow: green accept gradient + neutral reject
- Disabled state for insufficient cash

**IPO sell-to-fund:**
- Step 1: tier buttons (₹10k / ₹25k / ₹50k), disabled if insufficient
- Step 2 (only if cash < min): "Sell holdings to free up cash" with one-tap SELL ALL per stock
- Step engineering: `engine.sell` works during `events` phase (sells only)

### Teacher event overlay (EventPhaseOverlay)
- ✅ EVENT_EDU teaching panel: WHAT IT IS / HOW IT WORKS / WHY IT MATTERS + 🗣️ TALK ABOUT
- ✅ Continue → / Force advance (auto-rejects non-responders if students AFK)
- ✅ Fonts bumped 30% (event-phase-headline: 60 px, body: 25 px)

### Auto-advance + pause
- ✅ Per-round durations baked in
- ✅ `_tick` auto-fires `advanceRound` when elapsed ≥ duration
- ✅ Pause-aware: pausedMs accumulates, freezes countdown, blocks trades
- ✅ Pause button pulses amber when active; resume picks up exactly where stopped
- ✅ Force-advance buttons bypass timer at every stage

### Drama
- ✅ TradeFlashStack: green for buys, red for sells, "🔥" badge for trades ≥ ₹1L, "⚡" for ≥ ₹30k
- ✅ LeadChangeBanner: teal gradient, 84-px avatar, 14 randomized snarky comments
- ✅ 🔕 Drama muted toggle hides both overlays for quieter sessions

### Finale (2026 reveal)
- ✅ Round 5 ends → `_applyFinale` snaps prices to `FINAL_PRICES`
- ✅ FINAL_NEWS pushed to news feed
- ✅ worthHistory gets an extra entry at 2026 prices
- ✅ Phase = `'finale'` (new)
- ✅ FinaleOverlay (host): "ONE YEAR LATER · 2026" with 9 stock cards + 🏁 Reveal Final Results →
- ✅ PlayerFinale (student): navy-teal gradient card with their final number

### Ended screen
**Host (EndedOverlay):**
- ✅ Class-level headline stats: Top return / Class avg / Beat the bots / Most owned
- ✅ Two-column layout: leaderboard + per-student breakdown
- ✅ Per-student: avatar + sparkline + style badge + PortfolioDonut + 4 MiniStats + round chips + pick pills + 2-line lesson
- ✅ ClassReturnsChart (horizontal bars)
- ✅ StockPopularity component exists but **not rendered** (kept for future)
- ✅ ResetConfirmModal on Play Again

**Player (PlayerEnded):**
- ✅ Hero card: rank + avatar + worth + profit + style badge + lesson + WorthChart
- ✅ 📤 Share my result button (teal, uses html2canvas + Web Share API)
- ✅ 3-stat grid: Stocks / Hit rate / Beat bots
- ✅ Best / Worst pick cards
- ✅ Round-by-round journey table
- ✅ Sector composition donut
- ✅ "What if you'd just bought one stock" counterfactual

---

## 7. Outstanding QA issues (from 2026-05-21 report)

Full report at `/.gstack/qa-reports/qa-report-stock-rush-pro-2026-05-21.md`.

| ID | Severity | Issue | Status |
|---|---|---|---|
| 001 | 🔴 Critical | Round-transition popup persists past force-advance | **Open** |
| 002 | 🔴 Critical | Trade flash stack overlaps Market Prices sidebar (`top: 480`) | **Open** |
| 003 | 🟠 High | Bots-only ended screen is empty ("No students played") | **Open** |
| 004 | 🟡 Medium | Lobby helper text says "5 bots" — feature is now 6 | **Open** |
| 005 | 🟡 Medium | Empty lobby PLAYERS panel reserves ~400 px of dead space | **Open** |
| 006 | 🟡 Medium | Player onboard subtitle still reads "The full market experience…" — didn't get new tagline | **Open** |
| 007 | 🟡 Medium | Player onboard brand mark is `SR` (missing `PRO` superscript) | **Open** |
| 008 | 🟡 Medium | "0/0 LOCKED" + "No students yet" appear together — contradictory | **Open** |
| 009 | 🟠 High | Player can join AFTER ended → ranked last with ₹2L, pollutes class debrief | **Open** |
| 010 | 🟢 Low | Counterfactual ₹1.88 Cr Dixon needs "perfect hindsight" framing | **Open** |
| 011 | 🟢 Low | Babel-standalone in production warning (50-150 ms TTI cost) | **Open** |
| **12-player Start button hidden below fold** | 🔴 Critical | Was open, **FIXED 2026-05-22** with sticky footer (Option B) | ✅ Closed |

---

## 8. Deploy + cache conventions

**Single deploy command** from `/CLAUDE/` (not `/CLAUDE/stock-rush-pro/`):
```bash
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --prod
```
This pushes everything in CLAUDE/ to Vercel — including the main `index.html` games hub.

**Cache stamps:** every `.jsx`, `.js`, and `.css` URL in `stock-rush-pro/index.html` has `?v=YYYYMMDDx`. Bump the letter (`a` → `b` → …) before each deploy:
```bash
sed -i.bak 's/v=20260522a/v=20260522b/g' index.html && rm -f *.bak
```

**Verification after deploy:**
```bash
curl -s "https://ifm-deploy.vercel.app/stock-rush-pro/host-view.jsx?v=20260522a" | grep -c "marker-string"
```

**Sanity-check before deploy** (catches brace/paren imbalance):
```bash
node --check engine.js   # JSON-strict check on the .js file
node -e "const c = require('fs').readFileSync('host-view.jsx','utf8');
console.log('braces:', (c.match(/\{/g)||[]).length - (c.match(/\}/g)||[]).length);"
```

**Per-edit convention:** end every assistant turn with **DONE** in bold on its own line, preceded by REFRESH instructions if a deploy happened.

---

## 9. Critical project rules (carry over to every session)

1. **NEVER edit `/CLAUDE/stock-rush/`** — teen is frozen reference.
2. **Bump cache stamps** every deploy. Browsers cache aggressively.
3. **`vercel deploy --prod` from CLAUDE/**, not stock-rush-pro/.
4. **Single Supabase project** — Pro uses `gameKey: 'pro'`, room channel is `room:pro-XXXX`. Teen uses `gameKey: 'sr'`, channel `room:sr-XXXX`. Never collide.
5. **WP snippet** is at `/CLAUDE/stock-rush-pro_wp_snippet.html` — paste into investingformummies.com WP page's Custom HTML block.
6. **Mobile-first for player views**, projector-first for host views.
7. **Pause-aware** anything that times out — students may be AFK or teacher paused.

---

## 10. Major engine state quirks worth remembering

- **`state.phase`** flows: `lobby → events → trading → events → trading → ... → finale → ended`. Events fire at the start of any round that has them; trading is always last in the round cycle. Finale is new (2026 reveal).
- **Bots seed at goLive** but get re-balanced at `startGame` to hit `max(0, 6 - humans)`. If 7+ humans, bots get evicted.
- **Auto events** (dividend/split/bonus) apply effect immediately but the popup stays visible. Teacher must tap Continue → to advance. (This was a bug fix — they used to skip silently.)
- **Choice events** (IPO/buyback/rights) auto-advance when all players (including bots) submit. Teacher's Force advance auto-rejects non-responders.
- **`leave()`** removes a player from state. **`kick()`** also broadcasts a `'kick'` channel event so the player's tab can self-clear (handled via `onKick` listener).
- **`paused` state** blocks both bot trades AND auto-advance. `pausedMs` accumulates so the countdown resumes from the exact second it stopped.
- **`state.news[0]`** is the most-recent resolved event for the NewsToast on student trading screen.
- **`worthHistory`** is snapshotted at the END of each round before prices change, and AGAIN at finale. So a complete game has 7 entries: [start, R1end, R2end, R3end, R4end, R5end, 2026].

---

## 11. Files most often edited (top 5)

1. **`host-view.jsx`** — teacher projector logic, all overlays
2. **`player-view.jsx`** — student phone view, all event popups
3. **`game-data.js`** — content edits (prices, news, durations, tagline, mascots)
4. **`engine.js`** — state machine + Supabase wiring + bot AI
5. **`styles.css`** — CSS for `.event-card`, `.hero-row`, `.lobby-overlay`, etc.

`ui-common.jsx` (shared components like Avatar, RoundTimer) and `index.html` (cache stamps + html2canvas CDN) are edited less often.

---

## 12. Recent decisions worth remembering

- **Stock Popularity panel removed** from EndedOverlay (kept component code for future). User wanted a tighter final screen.
- **Lead change banner is teal**, not gold (per the brand-palette consolidation pass).
- **Player onboard kept the OLD subtitle** ("The full market experience…") — flagged as ISSUE-006 but not fixed yet.
- **Mascot picker labels** are short single words now ("Owl" not "Owl · the Researcher").
- **Mute Drama toggle** is local React state on HostGame, not engine state — doesn't sync to other tabs.
- **Pause** is engine state and DOES sync. Other host tabs see the pause; students see it.

---

## 13. Quickstart for next session

If you're a fresh agent opening this:

1. **Read this file** top to bottom (5 min).
2. **Read the project's CLAUDE.md (user memory)** — the "Stock Rush Pro scope" feedback says never edit teen.
3. **Open the live game** in incognito on phone: `https://investingformummies.com/stock-rush-pro/?role=player&room=PRO` — see what the student experiences.
4. **Open the host view**: `https://ifm-deploy.vercel.app/stock-rush-pro/?role=host` — start a fresh game with bots to see the full flow.
5. **Check the QA report** at `/.gstack/qa-reports/qa-report-stock-rush-pro-2026-05-21.md` for the 11 open issues. Don't fix without user direction.
6. **The user gives you instructions like: "fix issue 002" or "the trade flash overlaps prices, move it lower"** — they direct fixes; you execute and deploy.

**Last cache stamp shipped:** `v=20260522a`. Bump to `v=20260522b` on next deploy.

**Last critical fix:** sticky Start button in lobby (overflow with 12 players issue).

**Most likely next ask:** one of the 11 open QA issues. Probably ISSUE-001 (popup desync) or ISSUE-002 (trade flash overlap) since both are 🔴 critical.

---

*End of handoff. Good luck.*
