# Resume here — tonight's list

Paused 7 Sep at the user's request. Build verified clean after the stop: all 19 modules
parse, all four gates green, full 51-turn game, **0 errors**.

Play: `cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && npx serve -l 8791 .`
→ http://localhost:8791/snakes-ladders/  ·  build log at /snakes-ladders/progress.html

## Where it stands

Round-2 re-score by eight fresh critics who each drove the real game: **avg 3.75 → 6.75**.

| slice | r1 | r2 | benchmark | |
|---|---|---|---|---|
| endgame | 6 | **7.5** | 6 | **ours** |
| teaching | 5 | **7** | 6 | **ours** |
| hud | 4 | **7** | 8 | tie |
| language | 3 | **7** | 9 | reference |
| handoff | 3 | **7** | 8 | reference |
| projector | 4 | **6.5** | 7 | reference |
| first30 | 1 | **6** | 8 | reference |
| board | 4 | **6** | 9 | reference |

## THE BALANCE — 5 items. This is the whole list.

Full detail with measured numbers in `docs/CRITIC-QUEUE-R2.md`.

1. **`js/camera.js` — the camera never fills the screen.** THE BIG ONE: three of eight
   critics traced their biggest gap to it. Board is 38.6–42% of phone height with ~580px of
   bare table; **15% of a projector's pixels** with 83% wood. Width is already 93.6%, so the
   lever is **elevation, not zoom** — landscape still takes REST_EL while portrait got the
   64° treatment. AND the lesson zoom **overshoots**, cropping the right column (91, 90, 71,
   70, 51, 31, 11 sliced; "30" and "10" cut mid-badge). No square may ever be cropped.
2. **`js/ui.js` — the HUD spoils the dice.** Roll plaque prints the value at t≤60ms, ~800ms
   before the die settles, and the pips pop in against an empty button so the spoiler is the
   first thing that moves. Reveal must land *with* the die's settle.
3. **`js/game.js` — handoff card fails contrast.** White on saffron #e08a1e is 2.68:1 (name)
   and 2.40:1 (standings/TAP) against a 4.5:1 spec — the most-shown screen in the game. Fix
   for all four player colours, computing with the proper WCAG formula (linearise sRGB
   first; an agent already got this wrong once by weighting gamma-encoded values).
4. **`js/lesson.js` — "Read more" auto-scrolls to the bottom** on every card, throwing the
   title, arithmetic, gold rupee figure, term chip and mint escape band off the top with a
   mid-glyph slice. DESIGN.md §5.3 says it expands *in place*.
5. **`js/endgame.js` — the win isn't a moment.** Zero visible confetti (two of three seeds
   fire at squares 45 and 56, behind the opaque plate), the plate hides the board it is
   celebrating (entirely, on phone — against §12 beat 1), and the other player's navy shield
   snackbar is still painted across the board under the button.

Then: re-score, then **deploy** (outward-facing — ask first).

## Run it like this

```
Workflow({scriptPath: "<scratchpad>/wave6.js"})
```
Already rewritten to run **three at a time, in two sequential batches**, then verify.

**Why that matters:** six agents each driving a headless Chrome thrashed this 10-core /
16GB box — every one stalled 3–4 times (`stalled after 1786s`, `1037s`, `944s`) and the wave
burned 1.35M tokens to land a single file. Do not raise the parallelism back to six.

## Done since round 2

- **Devanagari fonts (was item 2 of 6).** `index.html` now loads Noto Sans Devanagari
  400–900 for UI and **Martel** as the Devanagari display face pairing with Lora — no
  synthetic oblique. Verified with `document.fonts.check()` and the computed family actually
  resolved on Devanagari runs.

## Hard-won facts — do not re-investigate

- Probe `fps` is meaningless headless (~30Hz, no display). Real browser: 120fps median.
  Judge cost by drawCalls/triangles. There is no leak.
- Round-1's "setup screen is inert" was WRONG and is disproved.
- **Never put a backtick in a comment inside a CSS/tagged template literal** — silently
  breaks the module. Cost a boot failure once.
- `{once:true}` listeners only self-remove when they FIRE.
- Check module syntax as ESM: `cp file.js /tmp/c.mjs && node --check /tmp/c.mjs`.
- The probe's `endgame` scenario is degenerate (jumps P1 to 99, P2 stays on 0). Drive a real
  game to judge the win.
