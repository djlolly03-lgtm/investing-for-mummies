# Scam Slingshot — paused 7 Sep 2026, ~08:45 IST

Paused on request mid-round. **The game is healthy**: loads clean, 24/24 hooks present, l1 won,
0 console errors/warnings. Nothing is half-written.

## To restart
1. Start the server: Claude Code preview config **`ifm-game`** (serves `CLAUDE/` on :8743).
   The server does NOT survive a session — restart it every time.
2. Game:     http://localhost:8743/scam-slingshot/
   Progress:  http://localhost:8743/scam-slingshot-progress.html
3. Health check:
   `cd CLAUDE/scam-slingshot/_tools && NODE_PATH=/opt/homebrew/lib/node_modules node capture.mjs --scenario ./scenarios/final.mjs --out ../_shots/check`

## Scope (set by Hiral, 6 Sep) — see the SCOPE CHANGE section in scam-slingshot-BRIEF.md
**Level 1 only, finished to the Angry Birds bar.** Priority: (1) breaking physics,
(2) gravity/weight, (3) everything else. Levels 2+, other villains, the rest of the ammo roster,
level-select and meta polish are OUT until L1 is signed off.

## Where each area stands
| area | round | state |
|---|---|---|
| P0 Foundation | r3 | PASS — determinism, 24/24 honest hooks, aim mapping verified |
| P2 Flight & tuning | r1 | done — concave power curve; zero-score shots 14/24 -> 0/24 |
| P3 Destruction & materials | r8 | **won a blind A/B (critic picked OURS)** on materials; now FAIL on impact VFX composition |
| PW Weight & gravity | r3 | FAIL — **the big one**, see below |
| P4 Camera | r8 | FAIL — stalled 8 rounds; a 3-way bake-off was mid-flight when paused |
| P1 Launch feel | r8 | FAIL — muzzle lance tapered backwards (widest end on the dart, not the fork) |
| P13 Scoring | r0 | BLOCKED/untended — star thresholds fixed while retuning moves the score range |
| P5-P18 rest | — | not started |

## THE MOST IMPORTANT OPEN ITEM — resume here
**The collapse is authored, not transmitted.** l1 GAINS 97-143 J of mechanical energy in the 2 s
after impact (fixed 23-body cohort, gravity's PE release subtracted) against a dart carrying only
57-60 J, in jolts up to +37.6 J in ONE 8.3 ms step. Noise floor 0.54 J idle / 0.00 J dart-in-flight.
Every jolt above 4 J lands on a `structure.js` hop/tip/joint event.

The "rack" mechanism that won P3's propagation round is shoving the tower over. Cap what
structure.js writes so cumulative added KE cannot exceed the contact energy the fracture delivered.
**If an honest collapse propagates less, make the STRUCTURE more precarious (joint strength, contact
margins, centre of mass, bay stacking) — do not re-inject energy and do not revert propagation.**

Note: P3's appearance-critic could not see this; PW's physics-critic could. Keep PW as a standing
adversary to the destruction work, not a one-off.

## The camera bake-off (was running when paused, will need re-running)
P4 failed 8 rounds by overcorrecting each previous fix: zoomed out (metric-gaming) -> dollied in too
early -> hard positional lock -> frozen-then-lunge. Three distinct approaches were being built behind
a `window.__CAM_APPROACH__` switch in src/camera.js — `lookahead` (solve the ballistic impact point,
interpolate over known flight time), `springrail` (critically-damped spring on a sling-to-target
rail), `framefit` (fit to a must-be-visible bounding box, no follow logic). Then blind-rank them,
blind-A/B the winner vs Angry Birds, promote the winner to default. Re-run this; do not iterate the
existing rig again.

## Hard-won facts — do not rediscover (full list in _reference/ORCHESTRATOR-NOTES.md)
- Locking BOTH translations and rotations makes Rapier's friction solve singular and removes ALL
  friction. Either lock alone is fine. z=0 is held by `physics.clampPlane()`.
- Bodies do NOT sleep mid-collapse — tested and disproved (0 asleep at t=400/800/1200/1600 ms).
- `structure.lean` must reset on `reset()` or identical shots diverge after the first fracture.
  The determinism gate that fires no shot cannot see this; `p3-r5-detshot.mjs` can.
- This machine's ffmpeg has NO `drawtext` filter (no libfreetype). blind.mjs/capture.mjs composite
  in headless Chrome instead — do not reintroduce drawtext.
- Never judge via the shared Browser pane: a hidden pane throttles rAF to ~2 Hz and looks exactly
  like a stalled game loop.
- 48 Angry Birds reference frames in `_reference/` have NO recorded source URLs (process gap). No
  band-under-tension frame exists, so P1's stretch criteria are judged against written criteria only.

## Known open defects not yet owned
- Star thresholds: 43,700 -> 2 stars, 43,200 -> 1, 21,600 -> 0. A won level can award zero. Derive
  thresholds from a measured score sweep and gate that a win never returns 0 stars.
- ~245-365 draw calls for a simple scene; will not survive a full level with debris (P15).
- Tutorial hint stays on screen through the whole shot (P17).
- Villains do not read as characters — no reaction, no taunt, no death worth watching (P6/P11).
- Background is two flat hill bands; the AB2 reference has four parallax layers, haze and DOF (P8).
