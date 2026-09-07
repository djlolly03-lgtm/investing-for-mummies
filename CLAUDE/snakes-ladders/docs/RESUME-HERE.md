# Resume here

Paused 7 Sep at the user's request, mid re-score. **Critics were read-only, so nothing is half-edited.**

## State: feature-complete, verified, playable. Not yet deployed.

19 modules. Setup → play → teaching → endgame. 1–4 players plus Mithu the bot.
100-square curriculum, 8 snakes, 8 ladders, deep explainers, 57-term glossary.
English + Hindi (173/173 keys). All four gates green, content lint at 0 warnings.

Independently verified (not self-reported by the agent that wrote it):

| | |
|---|---|
| Numerals legible | 100/100 phone · 100/100 projector |
| Tap "Start playing" → board | 0.32 s median, four clean profiles |
| Smallest on-screen type @1920×1080 | 21.9 px |
| Console + page errors | 0 — both languages, every human run |
| Draw calls / triangles / transfer | 62 / 90,258 / 561 KB |
| Board share of phone height | 39.7% playfield · 45.1% with frame · 93.6% of width |
| A11y | 7 controls, 0 unlabelled, 0 unfocusable, 0 sub-44px targets |

Played by hand with real touch taps on a clean profile — Start → 39 rolls → 69 lessons
read and dismissed → reached 100 → "Play again" returns to a live board. Same in Hindi.

Play it:
```bash
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && npx serve -l 8791 .
```
→ http://localhost:8791/snakes-ladders/  (build log at /snakes-ladders/progress.html)

## What is left, in order

1. **The re-score.** Eight critics re-judging the current build blind against Ludo King and
   Zerodha Varsity. **This never completed** — it hit the session limit twice, then was
   paused. The scores in `docs/CRITIC-QUEUE.md` (1–7 vs 6–9) are STALE; they predate three
   waves of work. Nobody has scored the current build.
   ```
   Workflow({scriptPath: "<scratchpad>/wave5.js", resumeFromRunId: "wf_3a2437dc-7d0"})
   ```
   Fixers and the verify pass replay from cache; only the eight critics cost anything.

2. **Two caveats the verifier refused to paper over.**
   - Playfield is **39.7% of phone height, not the 45%** in `docs/ART-DIRECTION.md` §6.
     Width is the binding constraint (already 93.6%), so closing it needs a camera
     *elevation* change in `js/camera.js` — an art-direction call with regression risk
     across four devices. Deliberately left alone.
   - Smallest in-game phone type is **13 px** (`.snl-ui__pname`). Legible, but at the floor.

3. **Deploy.** Localhost only so far. `CLAUDE/.vercelignore` already excludes
   `snakes-ladders/tests/` (it holds a puppeteer symlink). Follow the memory note
   "Embed New Game Guide": `vercel deploy --prod` **from inside CLAUDE/** — never the
   parent, which wipes the site — then card + screen div + lazy-load iframe in index.html.
   Outward-facing, so confirm with the user first.

## Hard-won facts — do not re-investigate

- The probe's `fps` number is meaningless headless (~30 Hz with no display). Real browser:
  120 fps median, 98 p95. Judge cost by drawCalls/triangles.
- There is no leak. Verified over 30 turns.
- The round-1 "setup screen is inert" verdict was WRONG and is disproved.
- **Never put a backtick inside a comment sitting within a CSS/tagged template literal** —
  it terminates the literal and silently breaks the module. Cost a boot failure once.
- `{once:true}` listeners only self-remove when they FIRE. A skip-tap listener left armed
  after its timeout ate the player's next tap.
- Check module syntax as ESM: `cp file.js /tmp/c.mjs && node --check /tmp/c.mjs`.
  Plain `node --check` on a `.js` will not catch it.
