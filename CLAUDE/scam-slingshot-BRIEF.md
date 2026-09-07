# SCAM SLINGSHOT — Overnight Build Brief
**Authored:** 4 Sep 2026, 15:35 IST · **Executes:** 4 Sep 2026, 22:00 IST (scheduled task `scam-slingshot-overnight`)
**Authorised by:** Hiral (IFM founder), in-session, 4 Sep 2026.

---

## 0. THE ASK (verbatim intent)

Build an **Angry Birds–style browser game about dodging financial scams** — lottery wins, credit card
traps, Ponzi schemes, hot stock tips — **at the level of Angry Birds**. Utterly perfect, funny and
satisfying, with *every single thing* done at that standard: the launch feel, the destruction, the
visual comedy, and anything else you can think of.

Break the game into the **smallest pieces that can be improved and judged on their own** — the pieces
are defined in §3 below. Fan out sub-agents, one per piece. **Loop** on each piece: a separate
sub-agent with **fresh context** inspects the **actual rendered game** — never the builder's summary —
and checks it visually against real Angry Birds. That critic is a **really harsh** critic. If it
doesn't look and feel at that level, it keeps going.

**Do not stop until each critic is utterly wowed** compared with the real Angry Birds. The critic must
**literally compare them side by side, blind**, say which one looks better, and when ours loses, name
**the single biggest gap** and send the builder back in. **No fixed number of rounds.**

Between major waves, spawn **one fresh agent to play the whole game** and smooth everything into one
coherent thing.

Keep a **simple live progress page** updated as you work so it can be watched evolving.

Three.js, runs in a browser. Use the Workflow tool (ultracode). `/loop` until utterly perfect.

## 0a. DECISIONS ALREADY MADE BY THE USER — DO NOT RE-ASK

| Decision | Answer |
|---|---|
| Start time | 22:00 IST, 4 Sep 2026 |
| On completion | **BUILD ONLY. DO NOT DEPLOY.** No `vercel` command. No WordPress. No homepage embed. No git commit, no git push. Leave everything in the working tree. |
| Review | Hiral reviews in the morning. |

---

## 1. HARD CONSTRAINTS

1. **DO NOT DEPLOY.** Never run `vercel`, never publish to WordPress, never touch the homepage
   (`CLAUDE/index.html`), never add a game card or screen div. The build stays local.
2. **DO NOT run state-changing git commands** (`commit`, `push`, `checkout`, `reset`, `stash`, `clean`).
   The working tree already has many unrelated modified files. Leave it alone.
3. **Only create/modify files inside** `CLAUDE/scam-slingshot/` plus these three:
   - `CLAUDE/scam-slingshot-progress.html` (live progress page)
   - `CLAUDE/scam-slingshot-BRIEF.md` (this file — append a run log at the bottom)
   - `CLAUDE/scam-slingshot-REPORT.md` (morning handover, written at the end)
   Never edit any other existing game, doc, or asset.
4. **Do not reorganise `CLAUDE/`.** Live URLs depend on its layout.
5. **Hard stop at 07:00 IST, 5 Sep 2026**, even mid-wave. Before stopping: finish the file you are
   writing, make sure the game LOADS AND PLAYS without console errors, update the progress page to
   final state, and write `scam-slingshot-REPORT.md`. A broken game at 07:00 is a failed run — always
   leave the last known-good state playable. Keep `CLAUDE/scam-slingshot/index.html` in a
   loads-clean state at the end of every wave, not just at the end of the night.
6. **No paid media generation.** No Higgsfield, no image/video MCP credits. All art is code-generated
   (Three.js geometry + procedural/canvas textures) or hand-authored SVG/canvas. Audio is synthesised
   with the Web Audio API — no licensed samples, no downloads from untrusted sources.
7. **No copyrighted Rovio assets in the shipped game.** Angry Birds reference frames are used ONLY as
   private, local, side-by-side critique reference in `CLAUDE/scam-slingshot/_reference/` (which must
   be listed in a local `.gitignore` inside the game folder and never deployed). Do not trace, copy,
   or reproduce Rovio art, characters, or the Angry Birds name/marks in the game itself. We match the
   **craft bar**, not the artwork. Our cast is entirely original IFM characters.

---

## 2. TECHNICAL ARCHITECTURE (decided — build to this)

**Location:** `CLAUDE/scam-slingshot/` — a folder, not a single file (this is too big for one file;
follow the `stock-rush-pro/` precedent).

```
CLAUDE/scam-slingshot/
  index.html          # importmap + canvas + boot
  src/
    main.js           # boot, game loop, state machine
    physics.js        # Rapier world, 2.5D plane lock, material defs
    slingshot.js      # launch feel: drag, band, trajectory, release
    ammo/             # one file per ammo type + shared base
    villains/         # one file per scam villain + shared base
    level/            # level loader + level data (JSON)
    fx/               # particles, shake, hit-stop, decals, popups
    audio/            # Web Audio synth engine + cue table
    ui/               # menu, level select, HUD, overlays (IFM brand)
    art/              # material library, toon shaders, outline pass
  levels/*.json
  _reference/         # Angry Birds critique frames — LOCAL ONLY, gitignored
  _shots/             # critic screenshots/clips — LOCAL ONLY, gitignored
```

**Renderer:** Three.js (pin an exact recent version, ESM via importmap from jsDelivr; vendor a local
copy into `src/vendor/` as a fallback so the game works offline).

**Physics:** **Rapier3D** (`@dimforge/rapier3d-compat`, WASM) — not cannon-es. Rapier's solver is
markedly better at the stable stacking, joints and chain-collapse that Angry Birds destruction depends
on. Vendor the WASM locally.

**Dimensionality: 2.5D — this is the single most important architectural call.**
Angry Birds is a 2D game. Build it as a 2D game *rendered in 3D*:
- All rigid bodies are locked to the XY plane (lock Z translation and X/Y rotation; only Z-rotation
  is free). Do this at the body level, every body, no exceptions — a single unlocked body ruins the
  whole feel by drifting out of plane.
- Perspective camera with a **narrow FOV (~28–35°) pulled far back** so the scene reads nearly
  orthographic but keeps a little parallax and depth. A wide FOV instantly breaks the Angry Birds read.
- Camera moves along X only (plus a controlled zoom). Never orbit. Never let the player rotate it.
- Art gets full 3D benefit: real geometry, real shadows, rim light, chunky depth on characters and
  blocks. That is our one legitimate advantage over the original — use it.

**Input:** mouse + touch, both first-class. Must work one-handed on a phone in portrait *and* on
desktop. Target 60fps on a mid-range laptop; degrade particle counts gracefully, never the physics rate.
Fixed physics timestep with an accumulator — never feed a variable dt to the solver.

**Serving it locally:** `.claude/launch.json` already has an `ifm-game` config serving `CLAUDE/` on
port **8743**. The game is therefore at `http://localhost:8743/scam-slingshot/`. Reuse it — do not add
a new launch config, do not run dev servers via raw Bash.

---

## 3. THE PIECES (18 independently buildable, independently judgeable units)

Each piece gets its own builder→critic loop. Each has its own acceptance bar. A piece is DONE only
when its harsh critic, in a blind A/B against real Angry Birds, picks **ours**.

| # | Piece | What "Angry Birds level" means here |
|---|---|---|
| **P1** | **Launch feel** | Grab, stretch, rubber-band deform, taut creak, dotted trajectory arc that appears only after you've earned it, release snap, band recoil wobble, tiny camera kick. The 300ms around release is the most-repeated moment in the game and must feel *physically satisfying* on the thousandth pull. |
| **P2** | **Projectile flight** | Weighty parabola, subtle air drag, spin, a trail that reads without smearing, mid-air ability tap with a crisp input window and unmistakable feedback. |
| **P3** | **Destruction & structures** | Three materials — glass (shatters), wood (splinters/snaps), stone (cracks then crumbles) — each with distinct break thresholds, break-apart geometry, debris that settles believably, and **chain collapse** that makes the player gasp. Structures must be stable at rest and catastrophic under load. |
| **P4** | **Camera** | Pull-back on drag, follow the projectile with lead and lag, snap to impact, settle when the world quiets, controlled shake, auto-frame the remaining villains, smooth return to the slingshot. Camera is 40% of the feel; treat it as a first-class system, not an afterthought. |
| **P5** | **Ammo cast** (our "birds") | 5–6 original characters = investor tools. Each has a silhouette readable at 40px, an idle animation on the sling, a launch pose, a mid-air tap ability, and a distinct impact behaviour. Suggested: **SIP Arrow** (steady, splits into 3 on tap), **Emergency Fund** (heavy, drops straight down like a brick), **Diversify** (splits into 5 fanned shards), **Compounding Snowball** (grows the further it travels — the "wow" ammo), **Index Fund** (huge, slow, ploughs straight through), **Due Diligence** (sticks to a structure and pops after a beat). Names and mechanics may be improved — the *distinctness* may not. |
| **P6** | **Villain cast** (our "pigs") | 5 scam archetypes, escalating: **Lottery Uncle** ("You've WON ₹50 lakh!"), **Credit-Card Trap** (a grinning card with a minimum-payment jaw), **Ponzi Pyramid Guy** (stacks — kill the base and the whole pyramid goes), **Hot-Tip Bhai** (whispers a stock tip, hides behind others), **Crypto Rug-Pull** (looks strongest, evaporates comically). Each needs: idle bob, blink, a nervous look when a projectile is incoming, a taunt when you miss, and a *funny* death pop. |
| **P7** | **Art direction & materials** | A coherent, committed cartoon look: toon/gradient ramp materials, crisp outlines, saturated but controlled palette, rim light, soft contact shadows. It must look *authored*, not defaulted. Nothing may ship with `MeshStandardMaterial` in its stock grey. |
| **P8** | **Environment** | Parallax background layers, sky gradient with time-of-day variation per level chapter, drifting clouds, foreground grass/props that occlude slightly, believable ground. Depth without clutter. |
| **P9** | **Audio** | Web Audio synth: band stretch creak, launch twang, whoosh, per-material impacts (glass/wood/stone), villain grunts and taunts, crowd reaction, level-clear jingle, ambient bed. Mixed, ducked, non-fatiguing, mute-able, and it must never be the reason someone closes the tab. |
| **P10** | **Juice / VFX** | Hit-stop on big impacts, squash-and-stretch, dust puffs, glass shards, splinters, score popups that arc and fade, combo escalation, screen shake with proper falloff, slow-mo on the final villain. This is the layer that separates "a physics demo" from "a game". |
| **P11** | **Visual comedy** | The reason to play. Villain reaction faces, ragdoll flops, absurd props (Lottery Uncle's giant novelty cheque as a physics object), sight gags, speech-bubble barks with actual jokes, and a final-villain death that earns a laugh. Comedy is a *deliverable*, not a bonus. |
| **P12** | **Level design** | 12–15 levels in 3 chapters, each level teaching exactly one scam through its *structure*, not through text. Difficulty curve: teach → test → twist. Every level must be solvable in at least two ways and 3-starrable in one. Hand-tune every single one; no procedural filler. |
| **P13** | **Scoring & level-end** | Points on destruction, unused-ammo bonus, animated count-up tally, 3-star pop with escalating chimes, "new best" flourish, fast replay. The tally sequence should make you want to beat it. |
| **P14** | **UI shell** | Title screen, chapter/level select map with star counts, pause, HUD, win/lose overlays, settings. **This is the only layer that follows the IFM design system** (Nunito + Lora, teal `#2a9d8f`, navy/ink `#1a3a5c`, 14px soft-shadow cards, IFM logo). Must not feel like a web page bolted onto a game. |
| **P15** | **Performance & responsiveness** | 60fps with a full structure collapsing. Portrait phone, landscape phone, tablet, desktop. Fast first load (progressive: show something in <1s). No layout jank, no stalls on level change. |
| **P16** | **Educational payload** | The IFM point, delivered without killing the fun: a one-line scam fact on each villain's defeat, an end-of-chapter "what you just learned" card. Funny first, educational second — if it reads like a lesson, it has failed. |
| **P17** | **Onboarding** | Teaches drag-release, ability-tap and the goal in the first 30 seconds with **near-zero text**, the way Angry Birds does with one animated hand. |
| **P18** | **Meta polish** | Loading screen with personality, title-screen animation, scene transitions, credits, tab title/favicon, an easter egg. The frame around the game. |

---

## 4. THE LOOP PROTOCOL (this is the heart of the brief — follow it exactly)

### 4.0 Wave 0 — reference gathering (do this FIRST, once)
Before any building, one agent assembles the critique reference set into
`CLAUDE/scam-slingshot/_reference/`:
- Gather genuine Angry Birds gameplay frames covering each piece (slingshot pull, mid-flight,
  a structure collapsing, a pig's death, the level-end star tally, the level select map, the title
  screen). Use web search / official Rovio press screenshots. Save as `ab_<piece>_<n>.png`.
- Write `_reference/RUBRIC.md`: for each piece, 5–8 concrete, observable criteria distilled from those
  frames (e.g. for P1: "band visibly deforms and thickens under tension", "trajectory dots are spaced
  by velocity not evenly", "release produces a 2–4 frame camera kick"). Criteria must be things a
  critic can *see in a screenshot or a 5-second clip*, never vibes.
- These files are reference-only and gitignored. **They never enter the shipped game.**

### 4.1 Builder agent (per piece, per round)
Gets: the piece spec, the rubric for that piece, the current code, and — from round 2 on — **only the
critic's verdict + named single biggest gap**. Builds. Returns nothing that the critic will ever read.

### 4.2 Critic agent (per piece, per round) — FRESH CONTEXT, HARSH
**Absolute rule: the critic never sees the builder's summary, message, changelog, or self-assessment.**
It sees only (a) the rubric, (b) the reference frames, (c) **the actual rendered game**.

The critic inspects the *running* game itself:
- Drives `http://localhost:8743/scam-slingshot/` headlessly with Puppeteer + Chrome (this project
  already has a working Puppeteer screenshot/screencast recipe — see the teaser-video pipeline notes;
  reuse it). Each critic writes its own script and its own frames into `_shots/<piece>/<round>/` so
  parallel critics never collide. **Do not use the shared Browser pane for parallel critics** — one
  pane, many agents, guaranteed collision.
- Captures the exact moments the rubric needs — including mid-motion frames, not just resting states.
  A launch-feel critic that only screenshots a static slingshot has done nothing.
- Also reads the browser console. Any error or warning is an automatic FAIL regardless of looks.

**The blind A/B — mandatory, and it must actually be blind:**
1. The critic copies its own capture and the matching Angry Birds reference frame into a scratch dir
   under **anonymised, shuffled filenames** (`a.png` / `b.png`), with the mapping written to a file it
   does **not** read until after it has judged.
2. It judges `a` vs `b` on the rubric and states which looks/feels better **and why**, in writing,
   before opening the mapping.
3. It then reveals the mapping.
4. **If ours lost or tied:** verdict `FAIL`, and it must name **the single biggest gap** — one
   specific, actionable thing, not a list. That single gap is the entire input to the next builder round.
5. **If ours won:** verdict `PASS`, plus the one thing it would still improve (recorded, not blocking).

Critic tone: harsh. The default verdict is FAIL. "Good for a browser game" is a FAIL. "Nearly there"
is a FAIL. The only PASS is *"I'd genuinely pick ours over Angry Birds in this frame."*

### 4.3 Iteration
Loop each piece builder→critic with **no fixed round count**. Fresh critic context every round —
never reuse a critic that has already seen our game, or it grades on improvement instead of on
absolute quality. Guards, so an unattended night can't stall:
- If a piece hits **6 rounds** without a PASS, escalate: spawn 3 independent builders on the *same*
  named gap with different approaches, have 3 fresh critics blind-rank the three attempts, keep the
  winner, and resume the normal loop. Log the escalation on the progress page.
- If a piece hits **10 rounds**, log it prominently as an unresolved risk in the morning report and
  move on rather than burning the whole night on one piece.

### 4.4 Waves
- **Wave 0:** reference + rubric (§4.0). Then a thin end-to-end vertical slice: one level, one ammo,
  one villain, launch → destroy → win. **Everything after this is improvement, never scaffolding** —
  the game must be playable from the end of Wave 0 onward.
- **Wave 1 — Feel:** P1, P2, P3, P4 (parallel).
- **Wave 2 — Cast & look:** P5, P6, P7, P8 (parallel).
- **Wave 3 — Sensation:** P9, P10, P11, P13 (parallel).
- **Wave 4 — The game around it:** P12, P14, P16, P17 (parallel).
- **Wave 5 — The finish:** P15, P18 + a full-game harmonisation pass.
- **Between every wave:** one **fresh** agent plays the *whole* game start to finish and smooths it
  into one coherent thing — consistent tone, consistent palette, consistent audio levels, consistent
  pacing, no seams between systems built by different agents. Its findings become mandatory work
  items in the next wave. This agent is also the only one authorised to say "this piece regressed".
- After Wave 5, if time remains before 07:00, run further full-cycle waves on whichever pieces the
  playthrough agent rates weakest. **Never stop early because a wave list is finished** — the
  stopping condition is quality, not a checklist.

---

## 5. LIVE PROGRESS PAGE

`CLAUDE/scam-slingshot-progress.html` — a self-contained HTML file, **auto-refreshing every 15s**,
readable at `http://localhost:8743/scam-slingshot-progress.html`.

Must show, at a glance:
- Current wave + elapsed time + time until the 07:00 hard stop.
- A row per piece: name, status (queued / building / under critique / PASS), round number, and the
  **critic's current named biggest gap** verbatim. The gap text is the most interesting thing on the
  page — make it prominent.
- The last blind A/B verdict per piece ("critic picked OURS" / "critic picked Angry Birds").
- A strip of the most recent critic screenshots (thumbnails, click to enlarge) so progress is
  *visible*, not just tabulated.
- A rolling event log (newest first, capped at ~200 entries).
- Any escalations, unresolved risks, and console errors.

Style it with the IFM palette. Update it **after every single critic verdict** — not on a timer, not
at wave boundaries. It is the only window into an overnight run.

Also publish it once as a **private Artifact** so it can be watched from a phone, and republish it to
the same URL at each wave boundary. Put the artifact URL at the top of the morning report. (This is
the progress dashboard only — the game itself is still not to be deployed.)

---

## 6. ORCHESTRATION

- Load the `workflow-authoring` skill, then drive the whole night with the **Workflow** tool: one
  workflow per wave, `pipeline()` for builder→critic chains, `parallel()` only at genuine barriers
  (wave boundaries and the blind-rank escalations). Read each wave's result before authoring the next
  — stay in the loop between waves.
- Give each piece a stable `label` so the progress tree is legible.
- Critics and builders for the same piece **must not share context**. Separate `agent()` calls, always.
- If the Workflow tool is unavailable in the scheduled session, fall back to `Agent` fan-out with the
  same structure — the protocol matters, the tool does not.
- Do not use `isolation: 'worktree'` — agents write to disjoint files under `src/`, and worktrees would
  fragment the single running game the critics need to load.
- Serialise writes to `index.html` and `main.js` (one agent at a time) since several pieces touch them.

## 7. MORNING HANDOVER

Write `CLAUDE/scam-slingshot-REPORT.md` before stopping:
- One-line honest verdict: is it at Angry Birds level, yes or no.
- Per-piece final status, round count, and final critic quote.
- The blind A/B win/loss record.
- What to look at first, how to run it (`ifm-game` launch config → `localhost:8743/scam-slingshot/`).
- Known gaps, unresolved risks, and the single highest-value next thing to do.
- Total agents run, and where the screenshots live.
Then append a short run log to the bottom of this brief.

**Be honest in the report.** If pieces did not reach the bar, say so plainly with the critic's own
words. An overstated report is worse than an unfinished game.

---

# ⚠️ SCOPE CHANGE — 6 Sep 2026, decided by Hiral. THIS OVERRIDES §3 AND §4.4 ABOVE.

**Ship ONE level, finished to the Angry Birds bar. Then, and only then, build the rest.**

The 18-piece / 12-15-level plan in §3 and the Wave 0-5 sequence in §4.4 are SUSPENDED. Every agent
now works toward a single goal: **Level 1 ("The ₹50 Lakh Cheque") is completely, unimprovably done.**

## Explicit priority order (Hiral's words: "correct breaking physics and gravity and others")
1. **Breaking physics** — fracture, per-material break thresholds, debris that is the right size and
   count, and above all COLLAPSE PROPAGATION. A struck tower must come down, not shrug.
2. **Gravity and weight** — everything must have believable mass. Stone falls like stone, glass like
   glass, wood like wood. Momentum transfer through a stack must read as physical. Arc weight on the
   projectile. This is its own acceptance area, not a side effect of P3.
3. Then the rest of the L1 experience, in this order: launch feel (P1) · projectile flight (P2) ·
   camera (P4) · the L1 villain, Lottery Uncle (P6) · art direction (P7) · the L1 environment (P8) ·
   juice/VFX (P10) · audio (P9) · visual comedy (P11) · scoring + level-end for ONE level (P13) ·
   onboarding, since L1 *is* the tutorial (P17) · the one scam fact on defeat (P16) ·
   performance (P15).

## IN SCOPE for this phase
- Exactly one level: l1. Its structures, its two Lottery Uncles, its ammo.
- The minimum UI shell to play it: HUD, win overlay, lose overlay, restart, mute. Nothing more.
- Whatever ammo types L1 genuinely needs — do NOT build the full 6-piece roster yet.

## OUT OF SCOPE — do not build, do not spend a round on
- Levels 2+, chapters, the level-select map, star totals across levels, progression.
- The remaining ammo cast and villain archetypes (Credit-Card Trap, Ponzi Pyramid, Hot-Tip Bhai,
  Crypto Rug-Pull) — they come after L1 is signed off.
- Title screen, credits, easter eggs, meta polish beyond a clean load (P18).
- Anything that only pays off across multiple levels.

If you are unsure whether something is in scope, ask: "does this make LEVEL ONE better?" If no, it
does not get built now.

**Rationale:** L1 finished to the bar becomes the reference implementation — its physics constants,
material definitions, fracture behaviour, camera rig, audio bed and art direction are what every
later level inherits. Getting it exactly right once is cheaper than getting fifteen levels
approximately right and re-doing them.

---

# ⚠️ SCOPE CHANGE 2 — 7 Sep 2026, Hiral. OVERRIDES SCOPE CHANGE 1.

**Three levels, launched for students to play. Look-and-feel polish deferred.**

## The target
1. **L1 "The ₹50 Lakh Cheque"** (lottery) — BUILT. Teaches: a prize you never entered is a bill.
2. **L2 "The Minimum Payment"** (credit-card trap) — TO BUILD. Most universally relevant scam for the
   IFM audience. Structure looks small but is anchored deep: it takes more than you expect to bring
   down, which IS the lesson.
3. **L3 "The Pyramid"** (Ponzi) — TO BUILD. An actual pyramid: take out the base and everything above
   collapses at once. The physics teaches the scam without a line of text.
Curve: teach -> test -> twist.

## IN SCOPE NOW
- Levels 2 and 3, hand-authored. Level progression, transitions, and scoring/stars across 3 levels.
- **Villain IDENTITY for all three** — agreed with Hiral that this is FUNCTION, not decoration: the
  villain is how the scam is taught. A player must recognise the scam from the character at a glance.
  Lottery Uncle (novelty cheque), the Credit-Card Trap, the Ponzi Pyramid Guy. Silhouette, readable
  personality, a reaction and a death worth watching. NOT a full art pass — identity and readability.
- Scoring/stars fixed (currently a won level can award 0 stars) and working across three levels.
- Onboarding (L1 is the tutorial). Performance. The one-line scam payload per level.
- The minimum shell: HUD, win/lose, restart, next-level, mute.
- **Because this PUBLISHES FOR STUDENTS:** the IFM brand pass applies to the shell UI
  (Nunito + Lora, teal #2a9d8f, navy/ink #1a3a5c, 14px soft-shadow cards) and `/ifm-finish-game`
  runs before release. Educational payload must actually land — this is teaching material.

## PARKED at current state — do not spend further rounds for now
- P1 launch feel (r8) and P4 camera (r8). Both FUNCTIONAL. Hiral: "leave the look and the feel
  later, we will build that." Breadth now beats another round perfecting one shot.
  P4's 3-way bake-off (lookahead / springrail / framefit) is designed and waiting in the workflow
  history — resume it in the look-and-feel phase, do NOT iterate the current rig.

## DEFERRED to the look-and-feel phase (explicitly not now)
Art direction · parallax environment and sky depth · juice/VFX beyond the functional · visual comedy
flourishes · audio beyond basic cues · meta polish, title screen, credits.

## STILL OUT
Levels 4+, the remaining villain archetypes and ammo roster, chapters, a level-select map.

## Deploy (end of phase — CONFIRM WITH HIRAL BEFORE RUNNING)
Per the IFM build guide: deploy from INSIDE `CLAUDE/` (deploying the parent wipes the whole site),
then game card + screen div + lazy-load iframe on the portal. Supersedes SCOPE CHANGE 1's
"BUILD ONLY — DO NOT DEPLOY": publishing is now the goal, but the act of deploying still needs
Hiral's explicit go-ahead at the time.
