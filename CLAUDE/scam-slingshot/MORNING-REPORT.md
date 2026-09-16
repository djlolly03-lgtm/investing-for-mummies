# Scam Slingshot — combined check, branding wave
**10 Sep 2026 · single combined critic · judged only from the running game at
http://localhost:8744/scam-slingshot/ · no builder summary or diff was read.**

---

## Verdict

**YES — this is ready to publish for students, with one caveat the owner should decide on
before it goes in front of a class: on a portrait phone the play area is tiny.**

Every protected gate passes, with numbers, below. The four parallel edits produced **no
collisions I can find** — no double-application, no contradictory state, no reverted work,
`src/main.js` internally consistent, zero console errors in 24 capture runs. The branded
backdrop is measurably **quieter** than the plain gradient it replaced, so the one aesthetic
call that is mine is a clear pass. Performance did **not** regress: the whole branded
backdrop costs a flat 36 draw calls and 0.05–0.07 ms of a 16.7 ms frame.

The caveat is not this wave's doing and is pre-existing, but it is the biggest thing between
this build and a good classroom session, so it leads the defect list.

---

## 1. Contrast hierarchy — PASS

Measured on real 390×844 frames, at CSS pixels (what the eye sees), regions taken from the
live scene graph and DOM boxes, never guessed. `EDGE` = mean Sobel magnitude of luminance;
squinting is a low-pass filter, so edge energy is what survives it. `S` = HSV saturation.

**The order my eye actually lands in, and the numbers behind it:**

| level | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|
| l1 | villains 11.97 | structures 8.76 | ground 3.85 | HUD 3.73 | backdrop 1.43 / 0.41 |
| l2 | villains 12.76 | structures 10.49 | HUD 3.84 | ground 3.66 | backdrop 2.34 / 0.41 |
| l3 | villains 10.68 | structures 10.53 | HUD 4.33 | ground 3.81 | backdrop 1.66 / 0.41 |

(two backdrop figures: the band immediately behind the tower, then the open sky)

**The rule — backdrop must not out-edge or out-saturate the structures — holds everywhere:**

| | structures EDGE | backdrop EDGE | structures S | backdrop S |
|---|---|---|---|---|
| l1 | 8.76 | 1.43 | 44.2 | 32.4 |
| l2 | 10.49 | 2.34 | 41.1 | 33.7 |
| l3 | 10.53 | 1.66 | 41.1 | 32.7 |

Same result at 1280×720 (structures 4.72–5.89 vs backdrop 0.81–1.27). **Ammo in flight** is
the one item the written order puts first that I cannot honestly rank first: at 390×844 it
projects to a **16×13 px** disc. It is bright and trailed, but it is small.

**The branding made the backdrop quieter, not louder.** Same instrument, same crop, on a
pre-wave capture (`_shots/ind-ball-lv-m/01-l1-rest.png`, 12:30 today) versus now:

| | pre-wave | post-wave |
|---|---|---|
| tower EDGE | 8.89 | 8.76 (−1.5%, unchanged) |
| tower saturation | 47.9 | 44.2 |
| **backdrop saturation** | 38.4 | **19.7 — halved** |
| backdrop EDGE | 0.13 | 0.37 (still 24× under the tower) |
| grass horizon | y = 718 | y = 718 (framing identical) |

Squint sheet (10 px blur, all three levels, at rest and mid-flight):
`_shots/CHK/EVIDENCE/squint-all-levels.png`. Read honestly, what survives that blur first is
the **HUD chips**, then the cloud masses, then the ground band — because on a portrait phone
the tower is 3% of the frame and the sky is 61%. That is a framing problem, not a backdrop
problem: crop to the play area and the tower wins on every measure. See defect 1.

---

## 2. Parallel-edit damage — NONE FOUND

Four agents, one wave. Everything below was checked at runtime, not in a diff.

| check | result |
|---|---|
| git conflict markers anywhere in `src/`, `index.html`, `levels/` | none |
| duplicate top-level declarations (every non-vendor `.js`) | none |
| duplicate DOM ids | none |
| `environment` groups in the scene | exactly **1** on l1/l2/l3 |
| `#hud` / `#ui` / `<canvas>` roots | 1 / 1 / 1 |
| objects sharing a name **and** a world position (a real double-apply) | none |
| subsystems `main.js` owns (scene, camera, renderer, rig, sling, fx, audio, hud, sun, trail) | all attached, all non-null, on all three levels |
| assets fetched twice, 404, or failed | none — cold boot pulls 3 fonts + `ifm-logo-ui` + `ifm-round` + `mist-ifm` + `scam-gold`; l2 lazily pulls `scam-cardfire`, l3 `scam-ponzi` |
| in-game errors / warnings | **0 / 0** on every level |
| `console.json` across 24 capture runs | clean — the only two errors anywhere are the ones `p0-hook-audit` injects on purpose |

`src/main.js` is in one consistent state. I did not need to touch it, and I did not.

**I fixed nothing.** There was no clear breakage to fix, and I did not restyle anything — that
is the owner's call.

---

## 3. Protected gates — all pass, with numbers

| gate | result |
|---|---|
| **progression l1→l2→l3** | walked end to end through the real **"Next level →"** button, not `loadLevel()`. Chips read `Level 1 of 3` / `Level 2 of 3` / `Level 3 of 3`. Finish sheet reached, `finishSheet: true`, `totalStars: 7`. |
| **button route ≡ gate route** | l2 reached by pressing the button is **byte-identical** to l2 reached by `loadLevel('l2')` — same full-precision body dump, same camera, and the same shot scores 6,100 either way. Every l2/l3 gate number is therefore measured on the level students actually see. |
| **star thresholds** | l1 9 500 / 30 500 / 39 500 · l2 9 500 / 11 500 / 21 000 · l3 28 500 / 60 500 / 70 000. 3 stars reachable on all three (44 000 / 22 200 / 73 200). Weakest measured wins 12 400 / 12 200 / 33 000 — all above 1★. **`starsClamped: 0`**, no win scores 0, bands monotone. `RESULT: PASS` |
| **hint gated to l1, honest `hintDone`** | 21 samples across the chain, deep-links, first-draw dismissal, post-shot reload and the end panel, each taken twice (immediately and +700 ms). l1 opacity .94 visible; l2/l3 opacity 0. `hintDone` never equals `hintVisible`. `PASS — all samples honest` at 390×844. |
| **energy honesty** | created median **5.96 J / 2 s** with the structure layer on (0.86 with it off) against a dart delivering **102–138 J**. Worst single step median **1.44 J**. Both better than the 10.41 / 1.90 the notes record for the alternative ramp. Flight floor −0.04 J/step, i.e. no injection pre-contact. |
| **collapse propagation** | MOVED median **9** (baseline 8.5) `[8,9,9,2,9,9,9,8]` · FRAME median **5/6** (baseline 5/6). Cohesion@300 ms **100%** on all 8 shots. Standing@settle median 11.5 (baseline 12). |
| **three materials breakable** | fractures across the sweep: **wood 18, glass 15, stone 8**. Shots that fractured each: wood 7/8, glass 8/8, stone 5/8. Settled debris wood 43% / glass 43% / stone 13%. Stone — the canary — is alive. |
| **determinism, gate 1 (rebuild + settle)** | `✅ DETERMINISTIC` — two browser processes identical, one `seek(2000)` ≡ twenty `seek(100)`, different seed differs, all runs exactly 240 steps, zero console errors. |
| **determinism, gate 2 (shot fired)** | three identical shots from seed 4242, diffed at 12 timestamps straddling first contact and first fracture: **`0==1:true 1==2:true` on every row**, counts identical. |
| **hooks** | **24/24 honest.** |
| **P2 power curve** | monotone: power 0.6 → speed 10.873 / exit 42.404; 0.8 → 12.737 / 49.674; 1.0 → 14.400 / 56.160. 24-shot sweep: 5 one-shot wins, 12 shots killing ≥1, **1** zero-score shot. |
| **P1 ≥8 AD clear at t = 50 ms** | `RESULT: hard cut confirmed — every draw >=0.8 clears 8 AD by t=50ms` (9 shots, worst 9.36 AD). |
| **l3's recruits holding the tier above** | **preserved.** 3 base + 2 middle + 1 apex at y = 0.48 / 2.44 / 6.11; the two middle recruits carry a wooden member with a **0.09 u** gap. Arms visibly raised into the beam — see `_shots/CHK/EVIDENCE/l3-pyramid-zoom.png`. |

---

## 4. Performance — did the textures regress it? No.

Measured at 390×844, headless Chrome, real rAF frames.

| | l1 | l2 | l3 |
|---|---|---|---|
| draw calls | 326 | 302 | **493** |
| …of which the branded backdrop | 36 | 36 | 36 |
| …of which per-mesh `ink` outlines | 63 | 55 | **114** |
| frame ms, aiming — p50 / p95 / worst | 8.3 / 9.8 / 10.9 | 8.3 / 10.6 / 11.6 | 8.3 / 9.9 / 10.8 |
| frame ms, through a live collapse | 8.3 / 10.3 / **28.9** | 8.3 / 10.9 / 13.7 | 8.3 / 9.9 / 11.0 |

Against the **245–365** baseline: l1 and l2 sit inside it. **l3 is over at 493**, and the
excess is not textures — **114 of its calls are one-per-mesh ink outlines** on the 6-recruit
pyramid, which is protected ground and predates this wave. Strip the backdrop entirely and l3
is still 457.

The backdrop's true cost, timed as 240 back-to-back renders with it on and off (a ratio, so it
does not depend on this Mac): **0.048 / 0.063 / 0.065 ms per frame — 10–14% of draw submission,
0.4% of a 60 fps budget.** That is not a regression.

p50 is pinned at 8.3 ms because that is the vsync ceiling here, so it proves headroom exists,
not that a low-end Android is fine. One 28.9 ms hitch in 1,140 sampled frames, at l1's first
collapse — a one-off warm-up, it does not recur.

---

## 5. The playthrough

Booted cold, played all three levels through **genuine DOM pointer drags** (press at the
pouch, pull, release — pixel re-derived every step from the live camera) and the HUD's own
buttons. No `loadLevel`, no `aim()`.

```
BOOT -> level=l1 chip="Level 1 of 3" phase=aiming storageOK=true
l1  4 shots -> won, 14,900, ★☆☆   -> pressed "Next level →" -> l2, hint correctly gone
l2  4 shots -> won, 12,200, ★★☆   -> pressed "Next level →" -> l3
l3  attempts 1-3 lost (29,500 / 29,500 / 29,200), pressed "Try again" each time
l3  attempt 4  -> won, 52,800, ★☆☆ -> "See your results" -> finish sheet, 4 of 9 stars
in-game errors: 0   warnings: 0
```

It holds together. The chips, the ammo pips, the "scammers left" counter, the star pops, the
count-up, the per-level lesson cards and the finish recap are all correct and all legible at
phone size. The end sheet and finish sheet are the strongest UI on the project.

Other shell facts, all measured: mute toggles cleanly true/false/true · progress survives a
real page reload byte-for-byte · `?level=l3` deep-links correctly with the hint suppressed ·
every button is ≥ 44 px on its short side (mute is exactly 44×44) · the boot screen is fully
removed from the DOM once ready · all three brand faces report `loaded` and the HUD renders
in Nunito.

---

## 6. Open defects, most important first

### 1 — On a portrait phone the play area is a 90 px strip. **Pre-existing, not this wave.**
The camera solves its frame from the level's width, then `vh = vw / aspect`; at 0.46 aspect
that makes the vertical field 2.2× the horizontal, so the sky eats the screen.

| viewport | l1 tower | l2 tower | l3 tower |
|---|---|---|---|
| **portrait 390×844** | 89 px (10% of height) | **44 px (5%)** | 79 px (9%) |
| landscape 844×390 | 146 px (37%) | 93 px (24%) | 139 px (36%) |
| desktop 1280×720 | 270 px (37%) | 141 px (20%) | 253 px (35%) |

61–66% of a portrait frame is empty sky; the structures are 1.8–3.1% of it. On l2 the whole
tower is 44 CSS px and a villain is 28. Confirmed pre-existing: the grass horizon is at
**y = 718 in both a pre-wave and a post-wave capture**, and `camera.js` was last touched 7 Sep.
Compare `EVIDENCE/l2-390x844.png` with `EVIDENCE/l1-1280x720-desktop.png` — the same game,
composed properly. **Rotating the phone to landscape fixes it completely.** Cheapest mitigation
for a class: tell students to turn the phone sideways. Real fix: let portrait crop horizontally
instead of solving from level width — a camera change, not a branding one, and not something to
do on a fast path.

### 2 — l2 is the difficulty spike, and it is harder than l3.
Swept the full angle × power grid in the **unseeded** state a student meets:

| | one-shot wins | shots that kill anything | zero-score shots |
|---|---|---|---|
| l1 | 5 / 24 | 12 / 24 | 1 / 24 |
| **l2** | 0 / 48 | **4 / 48 (8%)** | 0 / 48 |
| l3 | 0 / 48 | 19 / 48 | 0 / 48 |

l2 is winnable — two shots for 32,500 and 3 stars — but only 8% of the aim space touches a
villain, and it is knife-edge: the *same* shot scores 1,100 or 6,100 depending on millimetres
of rest-state drift. Combined with defect 1 (l2's tower is the smallest of the three at 44 px)
a student on a phone is aiming at something they can barely see, with a thin margin. This is
gameplay, not branding, and the owner has already played it — flagging it with numbers, not
asking for a change.

### 3 — GPU geometry leak: **+39 geometries per level load, never released.**
Reproducible and linear: `renderer.info.memory.geometries` goes 194 → 1,096 over 22 loads
(ten l1 reloads, two laps of the chain, six restart-and-shoot cycles). Textures and programs
plateau (39–41, 22); geometries do not.

Root cause, measured: `level/entity.js`'s `disposeTree()` only disposes meshes flagged
`userData.ownsGeometry` — and **not one mesh in the entire scene sets that flag** (132 unique
geometries, 0 flagged). The contract has never been honoured, so the function has never
disposed anything. 64 geometries leave the scene undisposed on each l1 load: 57 toon-material
meshes inside entity groups and 7 `ink` outlines. **The `environment` group is not among them —
the branded backdrop disposes correctly.** So this is long-standing, not this wave.

Not a publish blocker — a geometry is small and frame time did not degrade over 22 loads — but
a classroom session with many replays will accumulate it. Fix is one flag at each block/villain
mesh creation site, or an explicit dispose list per entity. Do it in a calm wave, not this one:
it touches the same files four agents just edited.

### 4 — Minor, worth one line each
- **A reload always reopens on l1.** Best scores and stars persist correctly, but a student who
  refreshes mid-session replays level 1. `?level=l2` is the workaround.
- **5 of the 8 staged villain props are never fetched** (joker, mask, poison, pump, diamond) —
  ~460 KB of PNGs that will ship without being used. Delete or leave, but know they are there.
- **`#btn-mute` carries no `aria-pressed`** and no state class; its state lives only in the icon.
- **The top ~10% of the draw is still unusable on l1** (0.48@0.80 scores 0 with 17/17 blocks
  untouched) — the known P1/P2 tuning gap, unchanged, 1 zero-score shot in 24.

---

## 7. Evidence

| what | path |
|---|---|
| **l1, clean, 390×844** | `_shots/CHK/EVIDENCE/l1-390x844.png` |
| **l2, clean, 390×844** | `_shots/CHK/EVIDENCE/l2-390x844.png` |
| **l3, clean, 390×844** | `_shots/CHK/EVIDENCE/l3-390x844.png` |
| finish sheet, 390×844 | `_shots/CHK/EVIDENCE/finish-sheet-390x844.png` |
| l3 pyramid, readable size (camLock — a lens, declared) | `_shots/CHK/EVIDENCE/l3-pyramid-zoom.png` |
| squint sheet, all three levels, rest + flight | `_shots/CHK/EVIDENCE/squint-all-levels.png` |
| the same game at desktop, for the framing comparison | `_shots/CHK/EVIDENCE/l1-1280x720-desktop.png` |

Instruments written for this check (all reusable):
`_tools/chk-contrast.py` · `_tools/chk-squint.py` ·
`_tools/scenarios/chk-r1-{frames,perf,leak,leakwho,leakid,collide,assets,playthrough,
sweep-nat,sweep23,pathdiff,nextpath,flight,pyr2,shell}.mjs`

---

## 8. Publish checklist

1. **Sync the build copy back into the deploy repo**
   ```bash
   /Users/lollyg/Developer/sync-back-to-repo.sh            # dry run first — prints what moves
   /Users/lollyg/Developer/sync-back-to-repo.sh --go
   ```
   It excludes `_shots/`, `_state/`, `_reference/`, `_tools/` and `* 2*` conflict copies.
2. **Confirm `_reference/` stays blocked.** `CLAUDE/.vercelignore` already lists
   `scam-slingshot/_reference`, `_shots`, `_state`, `_tools` and
   `scam-slingshot/BUILDING-ELSEWHERE.md`. Verify those five lines are still present before
   deploying — `_reference/` holds real Angry Birds screenshots used privately as a critique
   baseline and must never reach the live site.
   *Note:* rsync's `--exclude` also protects those directories at the destination, so stale
   copies already sitting in the repo will not be deleted by the sync. They stay blocked from
   the deploy, but they are in the git tree.
3. **Check the working tree.** More than one Claude session can be open on this repo and a
   deploy publishes the whole tree.
   ```bash
   cd "/Users/lollyg/Documents/investing for Mummies" && git status
   ```
4. **Deploy from INSIDE `CLAUDE/` — never the parent.**
   ```bash
   cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --prod --yes
   ```
   Deploying the parent wipes the site and 404s every live URL.
5. **Smoke the live URL on a real phone**, portrait and landscape, and confirm:
   level chip reads `Level 1 of 3`, the tutorial hint shows on l1 only, "Next level →" advances,
   and the finish sheet lists all three lessons.

**Needs the owner's explicit approval before step 4. I did not deploy and did not touch git.**
