# Tap-to-rejoin — deferred games

Written 2026-09-17 after auditing all 9 multiplayer games for the iOS
phone-call → dead-socket bug. Five games shipped with tap-to-rejoin the
same day (Stock Rush Pro, Fund Manager, Broke by Friday LIVE, Sapno Ka
Ghar, KBC Quiz). Four are parked here — they each need architectural work
FIRST before the same fix is safe to apply.

## The bug this fixes

Student on iOS Safari is mid-multiplayer-game. Phone rings, they pick up.
The Supabase Realtime WebSocket dies silently while the tab is
backgrounded. When the call ends and the tab wakes up, no state updates
ever arrive. Student appears "logged out" and can't get back in.

**Actual fix:** an overlay that appears when the tab has been
backgrounded and has not received a state update for a few seconds after
becoming visible again. Overlay shows "Tap to rejoin" and reloads the
page. On reload, engine re-inits, new WebSocket, join is deduped by the
host (existing player.id is preserved). Portfolio safe.

## What blocks the other 4

### 1. LTM Live — `ltm-live/`

**Blocker:** identity is `crypto.randomUUID()` per page load
(`engine.js:159`). No `localStorage` persistence. If we let the student
reload, they come back as a brand-new player with a new UUID and their
old picks/portfolio are orphaned.

**Prep needed before tap-to-rejoin:**
1. Persist `MY_ID` in `localStorage` under `ltm_pid` — same pattern as
   the shipped games (~5 lines).
2. Relax `startJoinRetry` (`engine.js:398-404`) so mid-game rejoin
   actually retries — currently stops the retry once
   `phase !== 'lobby'`.

**Estimated effort:** 30 min prep + 15 min for the overlay = 45 min.

### 2. Stock Rush teen — `stock-rush/`

**Blocker:** identity is in `sessionStorage`, not `localStorage`
(`player-view.jsx:8`). Comment there notes this is deliberate: every
fresh QR scan opens a new tab → empty sessionStorage → name-entry
screen. Tap-to-rejoin using reload would still work when the tab is
alive but frozen (which is 90% of phone-call cases), but if iOS killed
the tab entirely, sessionStorage is gone and the student loses identity.

Also has a `sessionId` guard in `_applyJoin` (`engine.js:311`) — a
rejoin with a mismatched sessionId is silently rejected.

**Options:**
- Ship tap-to-rejoin anyway. Covers the frozen-tab case (majority).
  Killed-tab case falls back to current behaviour (student re-scans QR
  → new identity → new joiner). Net win, partial coverage.
- Move identity to `localStorage` (behaviour change — a fresh QR scan
  no longer resets identity). Discuss with user first.

**Estimated effort:** 20 min if we accept partial coverage.

### 3. Swayamvar — `swayamvar/`

**Blocker:** not really blocked, but the mechanism is different from
the shipped games. Swayamvar players write directly to the Supabase
`state` row (not via broadcast-to-host), so a "tap to rejoin" via
`location.reload()` works fine, but the READ side is what actually fails
(the `postgres_changes` subscription dies). Reload rebuilds the
subscription, so the fix still works.

The player object gets overwritten on rejoin (unlike the safe no-op in
the shipped games). Verified this is portfolio-safe because votes live
in `state.votes[roundId][MY_ID]`, not on the player object.

**Estimated effort:** 30 min. Different overlay wiring; same behaviour.

### 4. Swipe Right on SIP — `swipe-right-sip-live.html`

Same story as Swayamvar. Direct DB write pattern. Swipes live in
`state.swipes[fundIdx][MY_ID]` so overwriting the player object is
portfolio-safe.

**Estimated effort:** 20 min (single-file HTML, easier than folder-based).

## Total remaining effort if you want all 4 done

~2 hours. Best done as a single batch after we've seen the shipped 5 in
classroom for a week and confirmed the fix actually helps.

## Sanity checks to run before shipping any of these 4

1. Grep the engine for anything that writes to state on join beyond
   identity (dividends, streak resets, timers). Confirm nothing that
   would corrupt on a duplicate join.
2. Verify identity storage key matches between engine and player-view.
3. Test locally: open student tab, kill Wi-Fi, wait 15s, restore Wi-Fi,
   confirm overlay fires and reload rescues.
