# Scam Slingshot — RESUME HERE (updated 10 Sep 2026, paused on request — low credits)

**Verified at pause**: 24/24 hooks · all three levels play · l1 won · 0 console errors · desktop
unregressed · portrait playable (after a stopgap, see below). Nothing half-written.

## ✅ WHAT LANDED THIS SESSION
- **IFM branding, complete and measured.** IFM mountain silhouette + low-opacity logo in the sky +
  layered parallax + haze + foreground grass; scam-icon villain props from the Slash the Scam set;
  branded shell (Nunito/Lora, teal #2a9d8f, navy #1a3a5c, logo on loading + level-complete sheets).
- **Contrast hierarchy verified by measurement**, not eyeball: villains > structures > ground/HUD >
  backdrop, on all three levels, at both viewports. Structures out-edge the backdrop 4.5-24x. The
  branding made the backdrop QUIETER than what it replaced (saturation 38.4 -> 19.7) while the
  tower's edge energy was unchanged. Branding added identity without stealing attention.
- **The IFM cannonball reads.** Medallion at 46 CSS px, navy rim, cream face, arc lettering legible.
- **Zero parallel-edit collisions** from four simultaneous builders.

## ⚠️ THE ONE OPEN BLOCKER — portrait framing (stopgap applied, not finished)
The camera fix hit its tower-height target while putting the structure 100% OFF-SCREEN
(`onScreenFracW = 0.000`). I applied a stopgap myself — `COMPOSE.minVwPortrait` 4.2 -> **25.0** —
which puts the sling and the whole structure back on screen and makes portrait playable. Cost: the
tower is ~12 %H instead of the 35-45 % target. Playable-and-small beats unplayable-and-large, but it
is not the finished answer. Original camera backed up at `/tmp/camera.js.bak`.
**The real fix** is a camera MOVE, not a fit: an establishing pan on load, and/or a projectile
follow, and/or player pan-zoom (currently absent — drag and wheel move the camera 0.00 units).
Full detail in `_reference/ORCHESTRATOR-NOTES.md`.

## 🚀 TO PUBLISH (all three commands are yours to run; none cost Claude credits)
    /Users/lollyg/Developer/sync-back-to-repo.sh            # dry run
    /Users/lollyg/Developer/sync-back-to-repo.sh --go       # bring the build into the repo
    cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --yes
`vercel deploy --yes` is a PREVIEW deploy — public URL, does not touch the live site. Add `--prod`
only when you want it live. **Deploy from INSIDE `CLAUDE/`** — deploying the parent wipes the site.
`_reference/` holds real Angry Birds screenshots used privately as a critique baseline; it is blocked
by BOTH .gitignore and .vercelignore and MUST stay blocked.

## FIRST THREE COMMANDS ON RESUME
1. Start the server: launch config **`ss-build`** (serves `~/Developer` on :8744). Never survives a
   session — restart every time. Game: http://localhost:8744/scam-slingshot/
2. Health check:
   `cd ~/Developer/scam-slingshot/_tools && node capture.mjs --scenario ./scenarios/final.mjs --url http://localhost:8744/scam-slingshot/ --out ../_shots/check`
3. Relaunch the wave (stopped mid-run; the hint phase is done, energy was on round 9):
   `Workflow({ scriptPath: "/Users/lollyg/.claude/projects/-Users-lollyg-Documents-investing-for-Mummies/30f1b549-eb06-4147-9b13-cf3a1460fcc4/workflows/scripts/scam-slingshot-night4-wf_e9368f03-e2f.js" })`
   The hint phase will re-run harmlessly (it is idempotent); energy resumes at round 9.

## SCOPE (Hiral) — full detail in "SCOPE CHANGE 2" at the end of scam-slingshot-BRIEF.md
**Three levels, published for students to play, mostly on phones.** Look-and-feel polish is DEFERRED
("we will build that"). P1 launch feel and P4 camera are PARKED at working state — do not iterate.
Villain IDENTITY is IN scope: it is how the scam is taught.

## STATE — roughly 75% of the 3-level launch scope
| area | state |
|---|---|
| Foundation, determinism, hooks | PASS — 24/24 honest hooks, both determinism gates green |
| P2 flight & tuning | done — zero-score shots 14/24 -> 0/24 |
| P3 destruction & materials | **won a blind A/B (critic picked OURS)** on materials |
| Three levels | ALL BUILT and playable: l1 lottery · l2 credit-card trap · l3 Ponzi pyramid |
| Progression | **LANDED** — levelNumber/levelCount/nextLevel wired, HUD reads "LEVEL n OF 3" |
| Stars | **LANDED** — thresholds DERIVED per level with a recorded proof plan; 3 stars provably reachable (l3 t3=60,500, proof run 63,500). A 22,400 win now scores 1 star, was 0 |
| Persistence | totalStars + per-level best in localStorage, storageOK true |
| PW energy | converging, NOT done — created energy 522 J -> ~50 J vs a ~60 J dart |
| P6 villain identity | FAIL — reactions invisible at played size |
| Brand pass, mobile perf, deploy | not started |

## OPEN DEFECTS, most important first
1. **Fracture energy still creates ~50 J** against a dart delivering ~60 J. Down from 522 J over four
   rounds and converging — finish it. Children must not exceed the parent's KE plus a bounded,
   priced burst. Do NOT buy it by losing propagation; make the structure more precarious instead.
2. **Villain reactions are invisible at the size played.** Measured: `guardK = 0.0000` on 8/8 shots,
   root rotation 0.05 deg; the only change is eye geometry — ~9px/4px desktop, ~3px/1px on a phone.
   Put the reaction in the SILHOUETTE (cheque jerked up as a shield, body duck). Also still open:
   villains are crushed without performing it — `crushLoad` drives damage but no brace/squash/tilt.
3. ~~Tutorial hint on all three levels + lying `hintDone`~~ — **FIXED AND VERIFIED 9 Sep.** Hint is
   visible on l1 only (opacity 0.92) and opacity 0 on l2/l3; dismissed on the first real draw.
   `SS.state()` now also exposes an honest `hud` object (level chip, level name, score, ammo pips,
   end-sheet title/button, `hintVisible`) so critics can check what is RENDERED, not an intent flag.
4. Villains and props are below the 40px readability floor at phone size (Lottery Uncle 14x25 CSS px,
   cheque 11x6). The scam does not read on the device students will use.
5. Draw calls 245-365 — needs a mid-range phone check before publishing.

## BEFORE PUBLISHING
Sync back to the repo (above) · `/ifm-finish-game` brand pass on the shell UI · mobile performance ·
then deploy from INSIDE `CLAUDE/` with Hiral's explicit approval. Two open questions from Hiral:
how far branding should reach into the game world (default: UI shell only, world keeps its own art
direction), and where the IFM logo goes.

## HARD-WON FACTS — do not rediscover (full list in _reference/ORCHESTRATOR-NOTES.md)
- Locking BOTH translations and rotations makes Rapier's friction solve singular and removes ALL
  friction. Either alone is fine. z=0 is held by `physics.clampPlane()`.
- Bodies do NOT sleep mid-collapse (tested, disproved).
- A repeated velocity match is a SERVO not a ramp — it tops the member back up and injects energy.
- **An exclusion in a measurement spec is where defects hide.** "Fixed cohort, births/deaths excluded"
  was blind to fracture spawn creating 2-17x the parent's KE (+522 J). Audit what ENTERS and LEAVES.
- **Test at the size actually played.** The 40px villain floor was being applied at desktop size.
- **`innerText` ignores opacity and visibility** — use offsetParent + computed style + bounding box.
- ffmpeg here has NO `drawtext` (no libfreetype); composite in headless Chrome.
- Never judge via the shared Browser pane — a hidden pane throttles rAF to ~2Hz and looks like a stall.
- `structure.lean` must reset on `reset()`; the determinism gate that fires no shot cannot see this.

## PROCESS NOTES THAT EARNED THEIR PLACE
- Keep a PHYSICS critic pointed at the destruction work permanently. P3 won a blind A/B with a
  mechanism that was quietly injecting energy; the appearance-critic could not see it.
- Watch for METRIC GAMING — a builder once hit "structure <= 60 %W at impact" by zooming the camera
  far out. Both roles are warned about it explicitly now.
- Independent fresh critics can CONTRADICT each other (P1 oscillated on the lance for three rounds).
  When that happens the orchestrator must look at the reference itself and rule.
- When a piece fails ~6 rounds by overcorrecting, stop iterating and run a 3-way bake-off. P4's is
  designed (lookahead / springrail / framefit) and still un-run.
- Throughput: ~60% of this project's agents have been killed mid-task by usage limits.
