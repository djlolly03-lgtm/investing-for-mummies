# Scam Slingshot — standing build context
Read this first. It replaces the long preamble that used to be inlined into every agent prompt.

## What this is
An Angry-Birds-level browser game about dodging financial scams, for Investing for Mummies (IFM).
It PUBLISHES FOR STUDENTS TO PLAY, mostly on phones. Three levels: l1 lottery cheque, l2 credit-card
minimum payment, l3 Ponzi pyramid.

## Where things are
- Working dir: `/Users/lollyg/Developer/scam-slingshot` (outside iCloud, deliberately).
- Dev server is ALREADY RUNNING at http://localhost:8744/scam-slingshot/ — never start another.
- ALWAYS pass `--url http://localhost:8744/scam-slingshot/` to capture.mjs.
- The copy under `.../CLAUDE/scam-slingshot` is a synced snapshot — never read or write it.

## Harness
    cd _tools && node capture.mjs --scenario ./scenarios/<yours>.mjs \
        --url http://localhost:8744/scam-slingshot/ --out ../_shots/<tag> [--mobile]
Scenario receives `{ page, shot, filmstrip, game, state, OUT }`. `filmstrip(name,{from,to,step})`
seeks deterministically and tiles timestamped frames into ONE contact sheet — the only way to judge
motion from a still. Use `aimPx`/`dragShot`; never hard-code screen pixels. Prune `_shots` if it
grows past a few hundred MB.

## Staged brand assets — in `assets/`, already downscaled. Use these; download nothing.
`ifm-round.png` (the cannonball) · `scam-cardfire/ponzi/gold/joker/mask/poison/pump/diamond.png`
(villain props, from the IFM game "Slash the Scam") · `mist-ifm.png` (backdrop atmosphere).

## THE HARD RULE — contrast hierarchy
Branding must never compete with play. Descending order of contrast:
1. ammo in flight + villains  2. structures  3. HUD  4. branded backdrop.
A backdrop more eye-catching than the tower is a FAIL, however handsome. Squint-test a mobile capture.

## Standing acceptance tests
- **Measure at phone size (390x844, `--mobile`).** A test passed at desktop size is not passed.
- **Is it legible at the size actually played?** Crop the element out of a real frame and ask whether
  it is nameable with no other context. Three defects on this project came from authoring at a size
  the element is never seen at.
- **Measure visibility properly.** `innerText` respects `display:none` but IGNORES opacity and
  visibility. Use `offsetParent` + `getComputedStyle` + `getBoundingClientRect`.
- **`state().hud`** is a readback of what is RENDERED. Prefer it over intent flags.

## PROTECTED GROUND — re-run and report numbers; a regression outweighs your gain
progression l1->l2->l3 and HUD "Level n of 3" · derived star thresholds (3 stars reachable, no win
scores 0) · hint gated to l1 with an honest `hintDone` · energy honesty · collapse propagation
(blocks moved ~8.5-9, frame reacting ~5/6) · three materials breakable · BOTH determinism gates
including the shot-firing one · hooks 24/24 · P2's power curve · P1's >=8 AD clear at t=50ms.
**l3's pyramid — recruits with ARMS UP holding the tier above them — is the best design work on this
project. Preserve it.**

## Do not rediscover (full detail in `_reference/ORCHESTRATOR-NOTES.md`)
- Locking BOTH translations and rotations makes Rapier's friction solve singular and removes ALL
  friction. Either lock alone is fine; z=0 is held by `physics.clampPlane()`.
- Bodies do NOT sleep mid-collapse — tested and disproved.
- A repeated velocity match is a SERVO, not a ramp: it tops the member back up and injects energy.
- An exclusion in a measurement spec is where defects hide. Audit what ENTERS and LEAVES.
- ffmpeg here has NO `drawtext` filter — composite in headless Chrome.
- Never judge via the shared Browser pane: a hidden pane throttles rAF to ~2Hz.

## Rules
Work ONLY inside this directory. Never deploy. Never run git commit/push/checkout/reset/stash/clean.
No paid media APIs, no downloads. `_reference/` holds real Angry Birds screenshots used privately as
a critique baseline — gitignored and .vercelignore'd; NEVER copy them into the game or ship them.
LOG OFTEN (usage limits and stalls have killed ~60% of this project's agents mid-task):
    cd _tools && node prog.mjs --piece <id> --name "<n>" --status <s> --round <r> [--verdict ..] [--gap ".."] [--shot ..]
The bar is Angry Birds. "Good for a browser game" is a failure.
