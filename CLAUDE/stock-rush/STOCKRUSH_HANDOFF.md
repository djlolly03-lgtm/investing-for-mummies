# Stock Rush — handoff for backend wiring

A classroom stock-market game. Teacher hosts (projected screen); students join from their phones to trade in real-time.

**Stack right now:** vanilla HTML/CSS + React via Babel (no build step) + cross-tab messaging via `BroadcastChannel` to simulate multiplayer.

**What needs to change for production:** swap the `BroadcastChannel` layer in `engine.js` for a real backend (Supabase Realtime is a great fit). The UI does not need to change.

---

## Files

| File | What it does |
|---|---|
| `index.html` | Entry point. Role picker (Host / Player) + boots React. |
| `styles.css` | All styles. Clean-minimal aesthetic (white/black, mono numbers). |
| `game-data.js` | The 8 stocks, the 8 scripted news events, bot names, game config (rounds, timers, starting cash). |
| `engine.js` | **THIS IS THE FILE TO REWRITE.** The full game engine — state machine, tick loop, trade application, news drops, bot trading. Currently uses `localStorage` + `BroadcastChannel`. |
| `ui-common.jsx` | Shared UI bits: sparkline, avatar, price delta, money formatter. |
| `host-view.jsx` | The teacher's projected view (leaderboard, market board, news, activity feed, lobby). |
| `player-view.jsx` | The student's phone view (onboard, trade list, portfolio, news, reactions). |

---

## Engine API contract (what views expect)

Views never touch storage directly. They only call `window.StockRush.*` and subscribe to state changes. **Keep this surface identical when you rewrite `engine.js`** and the views won't need to change.

```js
window.StockRush = {
  myId,                                   // unique id for THIS client
  getState() -> State,                    // current game state
  subscribe(fn) -> unsubscribe,           // fn(state) on every change
  join(player),                           // {id, name, color}
  leave(playerId),
  trade(playerId, ticker, qty),           // qty > 0 buys, < 0 sells
  react(playerId, emoji),
  startGame(),
  reset(),
}
```

### Shape of `State`
```js
{
  phase: 'lobby' | 'playing' | 'ended',
  round: number,                          // 1..8
  timeLeft: number,                       // seconds remaining in round
  stocks: [
    { id, name, sector, mono, price, prevPrice, history: [...] }
  ],
  players: {
    [id]: { id, name, color, isBot, cash, holdings: { [ticker]: qty } }
  },
  activity: [{ id, text, t }],            // newest first, max ~30
  reactions: [{ id, playerId, emoji, t }],// recent only (last 3.5s)
  news: [{ round, headline, body, impacts: { [ticker]: multiplier }, t }],
}
```

---

## Supabase wiring (suggested approach)

You have two solid options. I'd start with **Option A** because it's simpler.

### Option A — Single "game" row + Realtime subscription

One table, one row per active room. The whole `State` blob lives in a `jsonb` column. Host clients write to it; everyone subscribes via Supabase Realtime.

```sql
create table games (
  room_code text primary key,            -- e.g. 'TEEN'
  state jsonb not null,
  host_id text,
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table games;
```

**Engine rewrite outline:**
- One client per room becomes the host (use the same "first-to-claim" pattern, but write to `host_id` column with a timestamp; if `updated_at` is stale > 5s, any client can take over).
- The host runs the tick loop locally and writes `state` to the row every tick.
- All clients (including the host) subscribe to row changes via Realtime and update local state.
- `trade(playerId, ticker, qty)`: if I'm the host, apply locally + write. If I'm not the host, write an entry to a `pending_actions` table OR call a Supabase Edge Function.

**Pros:** dead simple. Whole state syncs as one blob. Easy to reason about.
**Cons:** every tick writes the whole state — fine for one classroom, would not scale to thousands of concurrent rooms.

### Option B — Authoritative server via Edge Function

Move the tick loop OUT of the browser entirely. Run it as a Supabase Edge Function on a scheduled trigger (or have host clients call it). Clients only send actions; the server is authoritative.

More work, but the right shape if this ever grows.

---

## Recommended Claude Code prompts

1. **"Read `engine.js` and `STOCKRUSH_HANDOFF.md`. Set up a Supabase project, create the `games` table, and rewrite `engine.js` to use Supabase Realtime instead of BroadcastChannel. Keep the `window.StockRush` API identical so the views don't need to change."**

2. **"Add room-code support — when a Host loads, generate a random 4-letter code and update the `roomCode` in the UI. When a Player loads, the room code becomes a required input that looks up the right `games` row."**

3. **"Replace the cross-tab host-election with a server-side authoritative tick: a Supabase Edge Function that advances the game state on a schedule for any room in 'playing' phase."** (Phase 2 — only if you outgrow Option A.)

---

## Things to know before you start

- **Room codes are hardcoded to `TEEN`** right now — `window.GAME_CONFIG.roomCode` in `game-data.js`. Generate per-game when you add Supabase.
- **Bots are seeded by the host** when a game resets (`engine.js` → `reset()` / `_startGame()`). Keep that logic; it makes single-student demos feel populated.
- **News events fire on time elapsed within a round** (`engine.js` → `_tick()`). The `dropAt` field is "seconds since round started," not absolute time. Keep that.
- **Reactions are ephemeral** — pruned 3.5s after they land. They're not persisted; if a player joins late they just won't see the reaction.
- **Trades are validated on the host** (can't buy if cash < cost; can't sell if holdings < qty). Keep that validation server-side when you move to Supabase — never trust the client.

---

## Things I'd improve next

- Per-game room codes (right now everyone joins "TEEN")
- Teacher-controlled round advancement (toggle to skip auto-timer)
- "Custom news" — let the teacher type their own headline + pick a stock + a direction
- End-of-game stats: best trade, worst trade, total trades, biggest gain/loss
- A discussion phase between rounds where the timer pauses
- QR code generation on the host view (Supabase room code → QR)

Good luck. The UI is the easy part — once `engine.js` is talking to Supabase, you've got a real classroom product.
