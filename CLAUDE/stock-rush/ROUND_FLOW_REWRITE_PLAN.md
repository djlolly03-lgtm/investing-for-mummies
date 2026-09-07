# Stock Rush teen — round-transition rewrite plan

**Written 2026-07-30 evening. No code changes yet.**

## Problem

Random glitches during round transitions. Different round each playthrough. Symptoms:
- Rows jump / snap unexpectedly.
- Popup dismiss doesn't take on first click.
- View briefly shows old prices then new.
- Final Results screen text is too small for classroom projection.

Patch attempts so far (all shipped): FLIP sign flip, ticker CSS extraction, freeze via useLayoutEffect + structuredClone, popup fade-out, clone-on-phase-transition, kill 220ms row transitions, force-reflow before FLIP. Reduced glitches but not eliminated. **The glitches are timing races, not data bugs.**

## Root causes (analysed)

1. **Multiple `useLayoutEffect`s racing.** freeze snapshot, FLIP animation, sound cues, banter, big-moment, arrival — all fire in unpredictable order on each state change.
2. **`popupUp` is derived state.** `showRoundPopup || showNewsPopup` can flip briefly to false during batched React updates, causing the freeze to release prematurely.
3. **`structuredClone` runs on every state change during 'playing'** when popupUp is false. Each clone is 3-8ms on the full state. Live activity from bots trading + Supabase broadcasts trigger many clones per second → render thrashing.
4. **FLIP fires on `rankKey` change.** rankKey depends on frozen state. Frozen state can update at unexpected times (e.g. after popup dismiss but before user's eye is on the leaderboard) → FLIP plays invisibly, then completes silently, so no "reveal drama."
5. **Popup dismiss uses closure over `state`.** In React 18 concurrent mode the closure can capture stale values, so `setSeenPopupRound(state.round)` sometimes sets the wrong round → popup persists or shows twice.
6. **Effects scheduled off state changes cascade.** `state.news[0].round` change → banter effect fires → setBanter → re-render → next effect fires → etc. Every cascade is another chance for a paint with mid-transition data.

## Fix: explicit finite state machine

Replace all the derived flags with one reducer that owns the round-transition flow.

### New state shape

```js
const [flow, dispatch] = useReducer(flowReducer, {
  subPhase: 'live',            // 'live' | 'popup-open' | 'popup-closing' | 'reveal'
  viewSnapshot: initialClone,  // frozen state used by every view component
  seenPopupRound: 0,
  seenNewsRound: null,
  pendingPopup: null,          // {round, news, roundNews} or null
});
```

Then `state` (engine) is the ground truth. `flow.viewSnapshot` is what every view component reads. The two are decoupled — engine can tick freely, view only updates when the reducer says so.

### Actions

- `ENGINE_STATE(next)` — engine notified, dispatched from a single `useEffect` subscribed to StockRush. If `subPhase === 'live'`, refresh viewSnapshot immediately. Otherwise stash `next` in `pendingEngineState` for later.
- `ROUND_ADVANCED(fromRound, toRound, news)` — dispatched from an effect watching `state.round`. Freezes viewSnapshot at pre-advance, opens popup (`subPhase = 'popup-open'`), fills `pendingPopup`.
- `CONTINUE_CLICKED` — dismiss handler. `subPhase = 'popup-closing'`, marks `seenPopupRound`, `seenNewsRound`. **Immediately** (same reducer step) schedules the reveal via a self-dispatched action after fade-out.
- `POPUP_CLOSED` — subPhase = 'reveal', swaps viewSnapshot to current live state, unfreezes.
- `REVEAL_COMPLETE` — after FLIP animation (550ms), subPhase = 'live'. Now normal render resumes.

### View rendering rules

- **Always pass `flow.viewSnapshot` to child components.** Never pass live `state` to the ticker, leaderboard, news panel, activity feed, or market list.
- Live `state` is only used by:
  - `HostHeader` (timer needs live data)
  - the reducer effects that decide when to fire actions
- **The two decouple cleanly**: engine can update state 10 times a second and view components don't rerender unless the reducer swaps the snapshot.

### FLIP animation

- Runs ONCE per snapshot swap.
- Triggered by `useLayoutEffect(() => {...}, [flow.subPhase])` — fires when subPhase transitions from `popup-closing` → `reveal`.
- Reads `viewSnapshot.players` (pre-advance ranks) and current live ranks.
- Applies transforms + animates to zero.

### Popup dismiss timing

- Continue click → `dispatch({type: 'CONTINUE_CLICKED'})`.
- Reducer synchronously sets subPhase = 'popup-closing', updates seenPopupRound/seenNewsRound.
- Popup renders with fade-out (280ms).
- Reducer's action also schedules `setTimeout(() => dispatch({type: 'POPUP_CLOSED'}), 280)`.
- POPUP_CLOSED swaps viewSnapshot, unfreezes, subPhase = 'reveal'.
- FLIP fires from subPhase transition.
- After 550ms → `dispatch({type: 'REVEAL_COMPLETE'})`, subPhase = 'live'.

### Effects consolidation

Move ALL side effects (sound, banter, big-moment, arrival) into either:
- The reducer itself (for actions that trigger sounds — dispatch with a `sfx` field)
- A **single** effect keyed on `state.round` change that runs all round-transition side effects in sequence.

No more racing effects.

## Text sizing (Final Results screen)

Every element bumped for classroom projection from the back of the room:

| Element | Current | New |
|---|---|---|
| "GAME OVER · N STUDENTS · N ROUNDS" | 13px | **22px** |
| "Final results" italic serif | 56px | keep (already large) |
| "MAR 2026 REVEAL" pill | 13px | **18px** |
| Counterfactual body ("Buying N shares of X...") | 16px | **22px** |
| Counterfactual gold values (b tags) | 16px | **26px bold** |
| ×N.N gold pill | 34px | keep |
| "STORY OF THE GAME" section header | 14px | **20px** |
| Story card "ROUND N · YEAR → YEAR" | 12px | **16px** |
| Story card headline body | 16px | **20px** |
| Story card stock chips | 14px | **17px** |
| "STOCK MOVERS" section header | 14px | **20px** |
| Movers row ticker (DIXON) | 17px | **24px** |
| Movers row name (Dixon Tech) | 12px | **16px** |
| Movers row prices (₹160 → ₹4,223) | 12px | **20px** |
| Movers row % delta | 12px | **20px** |
| Movers row "0/0 held" | 12px | **15px** |
| Sparkline width | 140px | **220px** |
| Top-return/Class-avg/Beat-bots values | 34px | **48px** |
| Their labels | 12px | **16px** |

Also: increase overlay-card `maxWidth` from 1520 to `100vw` less small padding — use the whole projector screen.

## Build order

1. **(~10 min)** Bump end-screen text sizes. Ship + verify visually. Standalone fix, no risk.
2. **(~30 min)** Introduce reducer with initial `subPhase: 'live'` and `viewSnapshot`. Make it a no-op that just mirrors live state. Ship, confirm nothing broke.
3. **(~30 min)** Wire `ROUND_ADVANCED` + `CONTINUE_CLICKED` + `POPUP_CLOSED`. Freeze snapshot during popup lifetime. Ship, test R1→R5.
4. **(~20 min)** Move FLIP to fire on `subPhase` transition only. Ship, test rank shuffles across all rounds.
5. **(~30 min)** Consolidate effects (sound/banter/big-moment/arrival) into a single round-change effect. Ship, test.
6. **(~15 min)** Regression pass: play through 5 full games, verify no glitches at any round.
7. **(~10 min)** Deploy final version.

Total: **~2.5 hours.**

## Risks + mitigations

- **Regression on other flows.** Lobby, ended, force-end paths all go through the reducer. Test each explicitly.
- **Effect ordering.** Some effects assume live state (news drop sound depends on `state.news[0].round`). Careful: switch them to read from the reducer's snapshot or from a single "round changed" trigger.
- **Bots trading during popup.** Live state diverges from snapshot while popup is up. When popup dismisses and snapshot updates, the view catches up all at once. This is CORRECT behaviour — teacher just sees the leaderboard settle after the "story of the round" moment.
- **Supabase realtime echoes.** Host tab already ignores its own DB events (engine.js:208). Verified.

## What NOT to do

- Don't try to fix the current derived-state architecture with more effects. Every patch layer adds more race surfaces.
- Don't move FLIP to CSS-only (via `view-transition` API) yet — browser support is uneven.
- Don't rewrite the engine. It's fine. The bug is in the React layer's response to engine updates.
