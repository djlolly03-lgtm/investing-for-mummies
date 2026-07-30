# Stock Rush — Quick Reference

## What it is
A classroom stock-market game. Teacher projects a host screen. Students join from phones by scanning a QR code, pick an emoji avatar, get ₹1L, trade 8 Indian stocks over 5 rounds (2016 → 2025). Real historical news (Demonetisation, COVID, etc.) moves prices between rounds.

---

## How to make the Pro version

The engine has built-in namespacing so Pro and Teen can run on the same Vercel + Supabase backend without interfering.

### 3 steps

**1. Copy the folder**
```bash
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE"
cp -R stock-rush stock-rush-pro
```

**2. Edit only one file: `stock-rush-pro/game-data.js`**

Change exactly one line at the top of the file to flip the namespace:

```js
window.GAME_CONFIG = {
  rounds: 5,
  roundSeconds: 60,
  startingCash: 100000,
  tickMs: 1000,
  roomCode: 'TEEN',
  gameKey: 'pro',          // ← change 'sr' to 'pro'
};
```

That's the only mandatory change. Everything else is optional — swap stocks, news, bot names, avatars, rounds, starting cash as you like for the pro narrative.

**3. Deploy**
```bash
vercel deploy --prod
```

Pro will live at `ifm-deploy.vercel.app/stock-rush-pro/`. Embed that URL in a new WordPress page (copy `stock-rush_wp_snippet.html`, change the iframe `src` to `/stock-rush-pro/`).

---

## Why this works

The engine prefixes the room code with `gameKey` everywhere it talks to Supabase:

| User sees | Stored as | Channel |
|---|---|---|
| Teen room "TEEN" | `sr-TEEN` | `room:sr-TEEN` |
| Pro room "TEEN" | `pro-TEEN` | `room:pro-TEEN` |

Same Supabase project, same `games` table, zero interference. Two classes can play simultaneously even with identical room codes.

---

## What's in the game (feature list)

### Host (teacher projector)
- "Go Live" splash → auto-resume on refresh
- Lobby with QR code + students' joined chips (hover → ✕ kicks)
- Live leaderboard with gold/silver/bronze top 3, emoji avatars, sector-coloured portfolio chips
- Round timer (⏱ MM:SS)
- Breaking news panel + activity feed with reaction avatars + market ticker
- Round transition popup (single dismiss between rounds)
- "↺ New game" button with branded confirm modal
- 30-min idle auto-reset
- Final results: per-student portfolio donut, sparkline, trading style badge, best/worst pick, 2-line lesson

### Student (phone)
- Pick from 8 emoji avatars
- Company briefing — tap each stock for sector, risk, fun fact, "watch for" hint
- Trade screen with sector chips, BUY/SELL, big quantity stepper
- Always-visible "YOURS" holdings strip
- Round timer in header
- Lock-in confirm modal with all trades + portfolio review
- Closeable news toast
- Final results with style badge + 2-line lesson + worth chart

### Engine
- Supabase Realtime + DB persistence
- Per-classroom isolated channels
- Round 1 starts at base May 2016 prices
- News fires when a round locks → prices move → next round begins
- Sticky session — no "Waiting for teacher" flicker mid-game

---

## Deploy

From the parent folder:
```bash
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --prod
```

Cache-bust by bumping `?v=YYYYMMDDx` stamps in `index.html`.

---

## Files (only edit these)

- `game-data.js` — all stocks, news, bots, config. **Edit this for Pro.**
- `index.html` — bump cache version
- Everything else is mechanics, don't touch unless changing behaviour
