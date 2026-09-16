/**
 * main.js — boot, game loop, state machine, contact routing.
 *
 * Boot order (ARCHITECTURE.md):
 *   bootRenderer() -> bootPhysics() -> loadLevel(id) -> installHooks() -> loop()
 *
 * ── WHAT LIVES HERE AND WHAT DOES NOT ────────────────────────────────────────
 * Here: the renderer + light rig, the fixed-step loop, the phase machine, the contact-force
 * → damage routing, and the pointer/touch input path. That is all.
 * NOT here: any FX, any audio, any camera transform, any scoring rule. Those are subscribers
 * on the event bus (fx/, audio/, camera.js, ui/). If you are about to add a particle or a
 * beep to this file, emit an event instead.
 *
 * ── THE ONE CLOCK ────────────────────────────────────────────────────────────
 * Everything animated — camera, particles, band recoil, villain idle, cloud drift — runs off
 * `world.simTime`, which is `physics.tick * FIXED`. Nothing reads performance.now() except
 * the frame pacing itself and the end-screen count-up (pure presentation). That is what makes
 * `SS.seek(180)` mean "the frame 180 ms after release" and not "roughly thereabouts".
 *
 * ── HIT-STOP AND THE TICK CLOCK ──────────────────────────────────────────────
 * Hit-stop freezes the SOLVER for N ticks while the tick counter keeps advancing (see
 * physics.holdOnce). So `SS.seek(2000)` is still exactly 240 ticks — the determinism gate's
 * step-count check holds — but a big impact still gets its frozen beat. Particles and camera
 * shake keep running during the freeze, which is what sells it.
 */

import * as THREE from 'three';
import { physics, Physics, initRapier, RAPIER, FIXED, GRAVITY_Y } from './physics.js';
import { installHooks } from './hooks.js';
import { mat, PALETTE, disposeMaterials } from './art/materials.js';
import { reseed, currentSeed, rngRange } from './rng.js';
import { emit, on } from './events.js';
import { world, resetWorldLists, entityFor, aliveVillains, ammoLeft } from './world.js';
import { CameraRig } from './camera.js';
import { Slingshot, SLING } from './slingshot.js';
import { syncAll } from './level/entity.js';
import { loadLevelData, buildLevel, updateEnvironment } from './level/loader.js';
import { disposeBlockCaches } from './level/blocks.js';
import { structure } from './level/structure.js';
import { AMMO_TYPES, preloadMedallionFace, medallionFaceVariant } from './ammo/medallion.js';
import { Trail } from './ammo/base.js';
import { FX } from './fx/index.js';
import { ContactShadows } from './level/shadows.js';
import { Audio } from './audio/index.js';
import { Hud } from './ui/hud.js';
import {
  LEVEL_ORDER, levelNumber, nextLevel, isLastLevel, isFixture,
  grade, scoring, recordResult, totalStars, bestFor, hintSeen, markHintSeen,
  resetProgress, progress, storage as progressStorage,
} from './progression.js';

export const VERSION = 'P0-foundation-2';

const SETTLE_TIMEOUT_TICKS = 6 * 120;     // 6s of sim time; a level can never wedge in 'settling'
const QUIET_TICKS = 36;                   // consecutive quiet ticks before we call it settled
let quietRun = 0;

let renderer, scene, camera, stage, canvas;
let sunLight, rimLight;
let levelId = 'l1';
let lastWall = 0;
let settleStart = 0;
/**
 * ── HOW LONG THE WIN SHEET WAITS ─────────────────────────────────────────────────────────
 *
 * This was a flat 132 ticks (1.1 s), and a player reported the sheet arriving "too quickly —
 * there are still parts of the structure falling down". A flat delay cannot be right for both
 * cases: a clean last kill with nothing moving wants to move on, and a tower still mid-collapse
 * wants to be watched. Any single number is too slow for one and too fast for the other.
 *
 * So the beat is a floor, a condition and a ceiling:
 *   MIN    always hold this long, so the kill and its first debris land on screen.
 *   QUIET  after the floor, keep holding while anything is still moving — `worldQuiet()` is
 *          the same 0.85 m/s test the settle gate below uses, so "still falling" means exactly
 *          what it already means everywhere else in this file.
 *   MAX    a hard ceiling, because a projectile can trundle below the sleep threshold for a
 *          very long time and the player must never be left waiting on it. This is a payoff
 *          beat, not a settle gate: nothing after the last villain dies can un-win the level.
 */
const WIN_BEAT_MIN_TICKS = 180;    // 1.5 s at 120 Hz — the floor the player asked for
const WIN_BEAT_MAX_TICKS = 312;    // 2.6 s — never hold longer than this, whatever is moving
const WIN_BEAT_QUIET_TICKS = 18;   // 0.15 s of stillness is enough to call the collapse over
/** Tick the last villain died on, or -1. Drives the short-circuit above. */
let winPendingSince = -1;
/** Consecutive quiet ticks since the win became pending. Separate from `quietRun`, which the
 *  settle gate owns — sharing one counter let each reset the other mid-collapse. */
let winQuietRun = 0;
let launchTick = -1;
let lastImpactPoint = new THREE.Vector3(18, 3, 0);
let dragPointerId = null;
/**
 * THE PLAYER'S LOOK (camera.js `lookBy`). A second, independent pointer identity: a drag that
 * misses the launch bay pans the camera instead of doing nothing at all, which is what it did
 * before. Separate from `dragPointerId` so the two can never be confused for each other — the
 * band always wins the grab test, and only what the band refuses reaches the camera.
 */
let lookPointerId = null;
let lookLastX = 0, lookLastY = 0;
/**
 * ── PINCH TO ZOOM THE LOOK (ROUND 3) ────────────────────────────────────────────────────────
 * `lookZoomBy` was reachable only from `wheel`, i.e. only on a desktop, and this game is played
 * on phones. Every live pointer is tracked here so a SECOND finger can turn a pan into a pinch
 * and back again without either gesture dropping the other.
 *
 * `pinchSpan` is null whenever fewer than two fingers are down, which is also how a pinch that
 * loses a finger re-arms cleanly rather than jumping by the whole ratio on the next move.
 */
const livePointers = new Map();
let pinchSpan = null;
const frameTimes = [];

// ---------------------------------------------------------------------------
// 1. RENDERER
// ---------------------------------------------------------------------------
function bootRenderer() {
  canvas = document.getElementById('game');
  stage = document.getElementById('stage');
  if (!canvas) throw new Error('bootRenderer: #game canvas missing from index.html');

  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false,
  });
  if (!renderer.getContext()) throw new Error('bootRenderer: no WebGL context');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = skyTexture();
  // Far enough out that no framing — landscape, portrait, or a fully drawn band —
  // can ever dolly the playfield into the haze. Fog is for the distant hills only.
  scene.fog = new THREE.Fog(0xbcdff0, 86, 235);

  // 2.5D read: narrow FOV pulled far back. A wide FOV instantly breaks the Angry Birds look.
  camera = new THREE.PerspectiveCamera(30, 1, 0.5, 260);

  // --- light rig: warm key + sky bounce + cool rim. Authored, not defaulted. ---
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x77a047, 1.02));

  sunLight = new THREE.DirectionalLight(0xfff0cf, 2.45);
  sunLight.position.set(-14, 22, 16);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -20; sunLight.shadow.camera.right = 20;
  sunLight.shadow.camera.top = 16; sunLight.shadow.camera.bottom = -8;
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 80;
  sunLight.shadow.bias = -0.0007;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight, sunLight.target);

  rimLight = new THREE.DirectionalLight(0x7fd4ff, 1.05);
  rimLight.position.set(16, 7, -14);
  scene.add(rimLight);

  world.scene = scene; world.camera = camera; world.renderer = renderer;
  // The camera rig keeps the shadow frustum centred on the view (camera.js — commit()).
  world.sun = sunLight;

  addEventListener('resize', resize, { passive: true });
  resize();
}

/** Procedural sky gradient. No image files, no network. */
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#2f7fb8');
  grad.addColorStop(0.34, '#6ebde3');
  grad.addColorStop(0.66, '#b6e2f2');
  grad.addColorStop(0.88, '#e9efd8');
  grad.addColorStop(1.00, '#f6e3bd');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function resize() {
  const w = stage.clientWidth || innerWidth;
  const h = stage.clientHeight || innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // A narrow phone screen needs a slightly wider lens or the camera has to dolly absurdly far
  // back to see anything. 36 degrees still reads near-orthographic; 30 is the desktop ideal.
  camera.fov = camera.aspect < 1.15 ? 36 : 30;
  camera.updateProjectionMatrix();
  world.rig?.onResize();
}

// ---------------------------------------------------------------------------
// 2. PHYSICS
// ---------------------------------------------------------------------------
async function bootPhysics() {
  await initRapier();               // decodes the base64-inlined wasm; no network
  physics.create();
  physics.onStep(drainContacts);
}

/**
 * CONTACT ROUTING — the single place where "something hit something" becomes damage.
 *
 * Rapier reports contact FORCE (newtons). `force * FIXED` is the impulse in N·s, which is
 * directly comparable to `mass × closing speed` and therefore to the `breakImpulse` numbers
 * authored in art/materials.js. Every downstream threshold in the game is in those units.
 */
function drainContacts() {
  const eq = physics.eventQueue;
  if (!eq) return;
  eq.drainContactForceEvents((ev) => {
    const h1 = ev.collider1(), h2 = ev.collider2();
    const a = entityFor(h1), b = entityFor(h2);
    if (!a && !b) return;
    const impulse = ev.totalForceMagnitude() * FIXED;
    if (impulse < 0.12) return;

    // APPROACH SPEED is the difference between "something hit this" and "something is
    // resting on this". A settled tower generates enormous contact forces every single step
    // (it is holding itself up); without this gate the game would emit an impact event, a
    // dust puff and a wood tap 120 times a second on a level nobody has touched yet.
    // `lastSpeed` is each body's speed at the end of the previous tick — i.e. pre-collision.
    const approach = Math.max(a?.lastSpeed ?? 0, b?.lastSpeed ?? 0);

    const point = contactPoint(a, b);
    if (approach >= 1.2) lastImpactPoint.set(point.x, point.y, 0);

    a?.onImpact(impulse, b, point, approach);
    b?.onImpact(impulse, a, point, approach);

    if (approach < 1.2) return;      // damage above may still apply (crush); FX must not

    const material = pickMaterial(a?.matName ?? a?.tag, b?.matName ?? b?.tag);
    emit('impact', { a, b, impulse, point, material, hard: impulse > 6.5, approach });
  });
}

/**
 * Which material does the player HEAR? Only real construction materials make a
 * characteristic noise; 'ammo' and 'villain' and 'ground' defer to whatever they struck.
 * When both are real, the more brittle one wins — glass over wood over stone — because that
 * is the sound your ear picks out of the mix.
 */
const MAT_RANK = { glass: 3, wood: 2, stone: 1, prop: 1 };
function pickMaterial(a, b) {
  const ra = MAT_RANK[a] ?? 0, rb = MAT_RANK[b] ?? 0;
  if (ra === 0 && rb === 0) return 'wood';
  return ra >= rb ? a : b;
}

const _cp = new THREE.Vector3();
/**
 * Real contact point from the manifold when Rapier will give one; a size-weighted midpoint
 * otherwise. Debris and shards spawn here, so "roughly between the two centres" would put
 * a glass spray inside the beam instead of on its face.
 */
function contactPoint(a, b) {
  if (a?.collider && b?.collider) {
    let got = null;
    try {
      physics.world.contactPair(a.collider, b.collider, (manifold) => {
        const n = manifold.numSolverContacts?.() ?? 0;
        if (n > 0) {
          const p = manifold.solverContactPoint(0);
          if (p) got = { x: p.x, y: p.y, z: 0 };
        }
      });
    } catch { /* fall through to the midpoint */ }
    if (got) return got;
  }
  const pa = a ? a.position(_cp.clone()) : null;
  const pb = b ? b.position(_cp.clone()) : null;
  if (pa && pb) return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, z: 0 };
  const p = pa ?? pb ?? new THREE.Vector3();
  return { x: p.x, y: p.y, z: 0 };
}

// ---------------------------------------------------------------------------
// 3. LEVEL
// ---------------------------------------------------------------------------
function teardown() {
  for (const e of [...world.entities]) e.destroy();
  world.sling?.dispose();
  world.sling = null;
  world.trail?.dispose();
  world.trail = null;
  world.fx?.reset();
  if (world.environment) { world.environment.parent?.remove(world.environment); world.environment = null; }
  world.clouds = null;
  resetWorldLists();
  structure.reset();                // no joint graph or pending shocks may cross a level
  physics.create();                 // brand new Rapier world; no residue from the last run
  physics.onStep(drainContacts);
}

async function loadLevel(id = levelId) {
  levelId = id;
  world.phase = 'boot';
  reseed(currentSeed());            // a rebuild consumes the SAME rng stream every time
  teardown();

  const data = await loadLevelData(id);
  buildLevel(data);

  world.trail = new Trail(scene);
  const sling = new Slingshot(scene, world.rig);
  world.sling = sling;
  sling.onLaunch = onLaunch;

  loadNextAmmo();
  // The camera solves its composition from the level's own extents, so it has to re-measure
  // before it frames anything. (camera.js — solveAim())
  world.rig.remeasure();
  world.rig.focusSling(true);
  world.phase = 'settling';
  settleStart = physics.tick;

  emit('levelLoaded', {
    level: levelId, data,
    number: levelNumber(levelId), count: LEVEL_ORDER.length,
    best: bestFor(levelId), totalStars: totalStars(),
  });
  world.hud?.refresh();
  /**
   * THE TUTORIAL HINT IS L1-ONLY, AND ONE-TIME.
   *
   * It used to be unconditional, so "Drag back from the slingshot, then let go" was still on
   * screen on level 3 — a shipping defect the orchestrator saw directly. l1 IS the tutorial
   * (SCOPE CHANGE 2), so the hint belongs to l1 and nowhere else, and once the player has
   * drawn the band back for real they never need it again (`hud`'s `bandStretch` handler,
   * `markHintSeen` on the launch that follows).
   *
   * `instant: true` matters and is not tidiness. Removing the class alone starts a 400 ms
   * opacity fade, so l1 -> l2 carried the tutorial line, legible at opacity .92, across the
   * level boundary and onto the next level. The gate was correct and the render was still
   * wrong; a level load hides it in one frame.
   */
  world.hud?.hint(showTutorialHint(), TUTORIAL_HINT, { instant: true });

  const settleTicks = settleAfterBuild();
  render();                         // guarantee one rendered frame before we resolve
  return {
    level: levelId, blocks: world.blocks.length, villains: world.villains.length,
    phase: world.phase, settleTicks,
  };
}

/**
 * HOOKS.md: `loadLevel(id)` "resolves when the level is settled and playable". It used to
 * resolve the instant the bodies existed, phase still `settling`, structure still dropping
 * the last millimetre onto itself and the camera still springing toward the sling — so a
 * critic's very first screenshot photographed a level mid-move and `state().phase` answered
 * a question nobody asked. Make the sentence true instead of rewording it.
 *
 * The settle is plain solver steps, so it is as deterministic as `seek()`. Afterwards every
 * clock is REBASED to zero: tick 0 is the first playable frame, `SS.tick()` still means
 * "solver steps since the last reset", and `seed(n) + seek(2000)` is still exactly 240.
 * @returns {number} solver steps the settle consumed (diagnostic only)
 */
function settleAfterBuild() {
  const MAX = 420;                  // 3.5 s of sim. A level that cannot settle in that is broken.
  let n = 0;
  while (world.phase !== 'aiming' && n < MAX) { stepOnce(); n++; }
  if (world.phase !== 'aiming') {
    console.error(`[main] level "${levelId}" did not settle in ${MAX} ticks (phase=${world.phase}) ` +
                  `— it is being handed over unsettled, which will make every capture of it a lie.`);
  }
  physics.tick = 0;
  physics.acc = 0;
  world.simTime = 0;
  world.hitStop = 0;
  settleStart = 0;
  launchTick = -1;
  quietRun = 0;
  winPendingSince = -1;
  winQuietRun = 0;
  for (const e of world.entities) e.bornTick = 0;
  return n;
}

async function restart() { return loadLevel(levelId); }

function loadNextAmmo() {
  const id = world.ammoQueue[world.ammoUsed];
  if (!id) { world.sling?.clearAmmo(); return null; }
  const Type = AMMO_TYPES[id];
  if (!Type) throw new Error(`[main] level asks for ammo "${id}" which is not in AMMO_TYPES`);
  const a = new Type({ x: SLING.x, y: SLING.forkY });
  a.trail = world.trail;
  world.sling.load(a);
  return a;
}

// ---------------------------------------------------------------------------
// 4. PHASE MACHINE
// ---------------------------------------------------------------------------
function onLaunch(ammo) {
  world.ammoUsed++;
  // A launch is a COMPLETED drag, which is the moment the tutorial line has done its job.
  if (showTutorialHint()) markHintSeen();
  world.phase = 'flying';
  launchTick = physics.tick;
  /**
   * The traceline is NOT cleared here. In Angry Birds a finished shot's dotted line stays on
   * screen as a static record and the next shot is aimed by the delta from it
   * (ab_launch_two-persisted-tracelines_07: two whole shots' worth coexisting, calmly). This
   * used to call `trail.clear()`, which wiped the only aiming information the player had
   * earned. `beginShot()` opens a new run instead; the old dots are left exactly where they
   * were. They are cleared on level load / restart and nowhere else.
   */
  world.trail?.beginShot(world.sling?.anchor, ammo);
  world.rig.follow(ammo);
  world.hud?.refresh();
}

on('ammoSpent', () => {
  if (world.phase !== 'flying') return;
  world.phase = 'settling';
  settleStart = physics.tick;
  world.rig.frameAll(lastImpactPoint);
});

/**
 * THE SCORING RULES, NAMED. They used to be two magic numbers inline, which meant nothing
 * outside this file could reason about the score — and the star thresholds are derived FROM
 * the score, so `_tools/scenarios/p13-sweep.mjs` had no way to compute a level's structural
 * minimum winning score (every villain down, no ammo left, no blocks broken) except by
 * copying the constant and hoping it stayed in sync. It is exposed through `SS.scoreRules()`.
 */
export const SCORE = {
  /** Per villain removed. */
  villain: 5000,
  /** Per UNUSED ammo at the moment the level is cleared — the efficiency reward, and by far
   *  the biggest term, which is why star bands come out as "shots to clear". */
  ammoBonus: 10000,
};

on('score', ({ amount }) => { world.score += amount; });
/**
 * ── THE ONE MOMENT THE GAME ACTUALLY TEACHES ────────────────────────────────
 *
 * A player asked the fair question: what IS the scammer, what am I learning, why should I
 * avoid this? The honest answer was nothing — the lesson lived on the win sheet, after the
 * fact, and the villains' own `fact` lines were wired only as a FALLBACK behind the level's
 * `teaches` string, so they never rendered at all. Replacing every villain with one shared
 * con man then collapsed nine specific lessons into a single bland line about a suit.
 *
 * So the truth is told at the BUST: the frame a scammer goes down, his own line appears over
 * him. That is the moment the player is looking straight at him and is most receptive, it
 * needs no extra screen and no extra tap, and it makes each of the nine levels teach its own
 * scam rather than all of them teaching "scams are bad".
 *
 * Lines are authored per level in `busts[]`, one per villain, and handed out in order — so a
 * level with six scammers delivers six different facts about the same scam rather than the
 * same fact six times.
 */
on('villainDefeated', ({ point }) => {
  world.score += SCORE.villain;
  const lines = world.level?.busts;
  if (!lines?.length) return;
  const i = world.bustsShown | 0;
  world.bustsShown = i + 1;
  const text = lines[Math.min(i, lines.length - 1)];
  if (text) emit('scamTruth', { point, text });
});

function evaluate() {
  if (aliveVillains() === 0) {
    // unused-ammo bonus, the classic "you were efficient" reward
    const bonus = ammoLeft() * SCORE.ammoBonus;
    world.score += bonus;
    /**
     * GRADING IS NOT A FORMULA ANY MORE. `grade()` reads the thresholds measured from this
     * level's real achievable score range (levels/stars.json, regenerated by
     * _tools/scenarios/p13-sweep.mjs) and guarantees a won level is never worth zero stars.
     * The old `starsFor()` here was `26000 + par*4000` scaled 0.7/1.15/1.55 and it drifted
     * until a 21 600-point WIN on l1 scored 0 of 3 and l2's 3-star band was unreachable.
     */
    world.stars = grade(levelId, world.score, true);
    world.phase = 'won';
    const rec = recordResult(levelId, world.score, world.stars);
    emit('levelWon', {
      score: world.score, stars: world.stars, bonus, level: levelId,
      number: levelNumber(levelId), count: LEVEL_ORDER.length,
      next: nextLevel(levelId), last: isLastLevel(levelId),
      best: rec, totalStars: totalStars(), teaches: world.level?.teaches ?? '',
    });
  } else if (ammoLeft() <= 0) {
    world.stars = 0;
    world.phase = 'lost';
    emit('levelLost', {
      score: world.score, level: levelId, stars: 0,
      number: levelNumber(levelId), count: LEVEL_ORDER.length,
      villainsAlive: aliveVillains(), teaches: world.level?.teaches ?? '',
    });
  } else {
    world.phase = 'aiming';
    loadNextAmmo();
    world.rig.focusSling();
    world.hud?.refresh();
  }
}

// ---------------------------------------------------------------------------
// 4b. PROGRESSION — the chain, and the tutorial hint's one-time life
// ---------------------------------------------------------------------------

export const TUTORIAL_HINT = 'Drag back from the slingshot, then let go';

/** l1 only, and only until the player has completed one real draw. */
function showTutorialHint() { return levelId === LEVEL_ORDER[0] && !hintSeen(); }

/**
 * Advance to the next level in the chain. Returns an honest report rather than silently
 * reloading the same level when there is nothing after this one — the finish panel is the
 * thing that handles the end of the chain, not a wrap-around.
 */
async function goNext() {
  const id = nextLevel(levelId);
  if (!id) return { ok: false, reason: `"${levelId}" is the last level in the chain`, level: levelId };
  const r = await loadLevel(id);
  return { ok: true, ...r };
}

/** Start the whole game over from level 1. Used by the finish panel. */
async function goFirst() { return { ok: true, ...(await loadLevel(LEVEL_ORDER[0])) }; }

/**
 * The level named by `?level=lN`, if it is a real level. Before this existed the owner could
 * not reach l2 or l3 without typing into a devtools console, which is the gap this piece is
 * here to close; it also lets a scenario deep-link a level without a second round trip.
 */
function requestedLevel() {
  let id = null;
  try { id = new URLSearchParams(location.search).get('level'); } catch { /* no location in some embedders */ }
  if (!id) return null;
  if (!LEVEL_ORDER.includes(id)) {
    console.warn(`[main] ?level=${id} is not one of ${LEVEL_ORDER.join(', ')} — starting at ${LEVEL_ORDER[0]}.`);
    return null;
  }
  return id;
}

// ---------------------------------------------------------------------------
// 5. STEP + RENDER
// ---------------------------------------------------------------------------
function stepOnce() {
  const frozen = world.hitStop > 0;
  if (frozen) { world.hitStop--; physics.holdOnce(); }
  else physics.stepOnce();

  world.simTime = physics.tick * FIXED;

  // Entity updates: snapshot the list, because a fracture or an ability can add entities
  // mid-iteration and we must not update something born this tick twice (or miss one).
  if (!frozen) {
    const es = world.entities.slice();
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      e.update(FIXED);
      // Recorded AFTER the step, so on the NEXT step's contact events this is the
      // pre-collision speed. See drainContacts().
      e.lastSpeed = e.body ? e.speed() : 0;
    }

    // The structural shock queue: how a break becomes a collapse of everything AROUND it.
    // Runs inside the fixed step, after entity updates, and is a no-op on any tick where
    // nothing has broken. See level/structure.js.
    structure.update();

    // villains look at whatever is flying at them
    if (world.projectiles.length) {
      const live = world.projectiles.filter(p => !p.dead && p.launched);
      for (const v of world.villains) if (v.alive) v.senseIncoming(live);
    }
    updateEnvironment(FIXED);
  }

  // These keep running through hit-stop — that is what makes the freeze read as impact
  // rather than as a stutter.
  world.fx?.update(FIXED);
  world.sling?.update(FIXED);
  world.rig?.update(FIXED);

  // A shot can never leave the game stuck in 'flying'. If the projectile has somehow not
  // reported itself spent after 10 s of flight, force the transition and move on.
  if (world.phase === 'flying' && launchTick >= 0 && physics.tick - launchTick > 10 * 120) {
    for (const p of world.projectiles) if (!p.dead) p.spentEmitted = true;
    world.phase = 'settling';
    settleStart = physics.tick;
    world.rig.frameAll(lastImpactPoint);
  }

  /**
   * ── THE OUTCOME IS DECIDED THE MOMENT THE LAST VILLAIN DIES ──────────────────────────────
   * Reported by the owner on a real phone: "level 2 I managed to finish with 1 cannonball, but
   * it makes me fire a 2nd before moving forward." Reproduced — on l1 the last villain died
   * while phase was still 'flying', and the win did not register for SIX SECONDS, with the end
   * sheet never appearing in that window. The player sees nothing happen and fires again.
   *
   * Cause: a win was only ever *evaluated* after the world went quiet — 'flying' does not hand
   * over to 'settling' for 10 s, and 'settling' then waits on worldQuiet(). Both are the right
   * rules for deciding whether a level was LOST (debris can still topple the last villain), but
   * they are the wrong rules for a level already WON. Nothing that happens after the last
   * villain dies can un-win it.
   *
   * So: short-circuit on a kill. Hold a brief beat so the death and the collapse actually land
   * on screen — cutting straight to the sheet would throw away the payoff — then evaluate.
   */
  if (world.phase !== 'won' && world.phase !== 'lost' && world.ammoUsed > 0 && aliveVillains() === 0) {
    if (winPendingSince < 0) { winPendingSince = physics.tick; winQuietRun = 0; }
    const held = physics.tick - winPendingSince;
    winQuietRun = worldQuiet() ? winQuietRun + 1 : 0;
    const stillFalling = winQuietRun < WIN_BEAT_QUIET_TICKS;
    if (held >= WIN_BEAT_MIN_TICKS && (!stillFalling || held >= WIN_BEAT_MAX_TICKS)) {
      winPendingSince = -1;
      winQuietRun = 0;
      quietRun = 0;
      emit('settle', { tick: physics.tick });
      evaluate();
      return;
    }
  } else {
    winPendingSince = -1;
    winQuietRun = 0;
  }

  // --- phase transitions that depend on the world quieting down ---
  const elapsed = physics.tick - settleStart;
  if (world.phase === 'settling') {
    // "Asleep" is not enough: a spent projectile can trundle slowly for ages without ever
    // meeting Rapier's sleep threshold, and the player would be left staring at it. Quiet
    // means nothing is moving fast enough to matter, sustained for a third of a second.
    quietRun = worldQuiet() ? quietRun + 1 : 0;
    const quiet = quietRun >= QUIET_TICKS || elapsed > SETTLE_TIMEOUT_TICKS;
    const minimum = world.ammoUsed === 0 ? 24 : 84;   // never cut the drama short
    if (quiet && elapsed > minimum) {
      quietRun = 0;
      emit('settle', { tick: physics.tick });
      if (world.ammoUsed === 0) {
        world.phase = 'aiming';
        world.rig.focusSling();
      } else {
        evaluate();
      }
    }
  }
}

/** Nothing dynamic is moving faster than a slow roll. */
function worldQuiet() {
  let max = 0;
  physics.world.forEachRigidBody((b) => {
    if (b.bodyType() !== RAPIER.RigidBodyType.Dynamic || b.isSleeping()) return;
    const v = b.linvel();
    const s = Math.hypot(v.x, v.y);
    if (s > max) max = s;
  });
  return max < 0.85;
}

function render() {
  syncAll();
  // Contact shadows read the transforms syncAll() just wrote, and must run before the draw.
  world.shadows?.update();
  world.fx?.projectPopups(camera, stage?.clientWidth || innerWidth, stage?.clientHeight || innerHeight);
  renderer.render(scene, camera);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastWall ? (now - lastWall) / 1000 : 1 / 60;
  lastWall = now;
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 90) frameTimes.shift();

  if (!physics.driven) {
    // Fixed timestep with an accumulator. Never feed a variable dt to the solver.
    physics.acc += Math.min(dt, 0.25) * physics.timeScale;
    let n = 0;
    while (physics.acc >= FIXED && n < 8) { stepOnce(); physics.acc -= FIXED; n++; }
    if (physics.acc > FIXED * 8) physics.acc = 0;
  }
  render();
}

// ---------------------------------------------------------------------------
// 6. INPUT — mouse and touch, both first class
// ---------------------------------------------------------------------------
function bootInput() {
  const el = renderer.domElement;

  const worldAt = (ev) => world.sling?.screenToWorld(ev.clientX, ev.clientY);

  /** Live pointers, and the pinch they may add up to. See `livePointers` at the top of the file. */
  const twoDown = () => {
    const p = [...livePointers.values()];
    return p.length === 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : null;
  };
  const forgetPointer = (id) => { livePointers.delete(id); if (livePointers.size < 2) pinchSpan = null; };
  /**
   * `setPointerCapture` THROWS — it does not return false — when the id names no active
   * pointer, and a throw here aborts `pointerdown` before the drag or the look is armed, so the
   * touch silently does nothing. That is reachable for real: a pointer whose gesture the OS has
   * already stolen (an iOS edge swipe, a system sheet) can still deliver a `pointerdown` whose
   * capture is refused a moment later. Capture is an optimisation — losing it costs a drag that
   * leaves the canvas, not the drag itself — so it is never worth an exception.
   */
  const capture = (id) => { try { el.setPointerCapture?.(id); } catch { /* not capturable */ } };

  el.addEventListener('pointerdown', (ev) => {
    world.audio?.unlock();
    if (ev.button != null && ev.button !== 0) return;
    livePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    pinchSpan = twoDown();
    const s = world.sling;
    if (!s) return;

    // FIRST TOUCH SKIPS THE ESTABLISHING PAN (camera.js `skipEstablish`). Unconditional: it is
    // a no-op in every other mode, so it does not need to know what the camera is doing.
    world.rig?.skipEstablish?.();

    if (world.phase === 'flying') { tapAbility(); return; }
    if (world.phase !== 'aiming' && world.phase !== 'settling') return;

    const p = worldAt(ev);
    // Generous grab: near the pouch, OR anywhere in the launch bay. Missing the pouch on a
    // phone is the fastest way to make a slingshot feel broken.
    const near = !!p && Math.hypot(p.x - s.anchor.x, p.y - s.anchor.y) < SLING.grabRadius;
    const inBay = !!p && p.x < s.anchor.x + 5.5 && p.y < 9;
    /**
     * ── A DRAG THAT MISSES THE BAND LOOKS AROUND INSTEAD OF DOING NOTHING ──────
     * The band is asked FIRST and always wins, so this can only ever pick up a drag the
     * slingshot has already refused. ROUND 3: the portrait aim frame now holds the whole shot
     * — sling, band and structure — so the look is no longer how a student finds the target at
     * all. It is how they go and INSPECT it: `lookZoomMin` takes l1's frame to 15.8 units and
     * the tower to 27.4 %H, which is a size the static frame cannot deliver while the sling is
     * on screen (see camera.js `aimFarMarginPortrait`). Pan with one finger, pinch with two.
     */
    if (s.state !== 'loaded' || !near && !inBay) {
      capture(ev.pointerId);
      lookPointerId = ev.pointerId;
      lookLastX = ev.clientX; lookLastY = ev.clientY;
      ev.preventDefault();
      return;
    }

    capture(ev.pointerId);
    dragPointerId = ev.pointerId;
    s.beginDrag(p.x, p.y);
    world.hud?.hint(false);
    ev.preventDefault();
  }, { passive: false });

  el.addEventListener('pointermove', (ev) => {
    if (livePointers.has(ev.pointerId)) livePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    /**
     * TWO FINGERS ARE A PINCH, AND A PINCH OUTRANKS EVERYTHING ELSE THE MOVE COULD MEAN.
     * A second finger arriving mid-drag cancels the draw rather than fighting it — a band that
     * keeps stretching under a zoom gesture is how a phone control stops feeling like a control.
     * The ratio is `newSpan / oldSpan`, which is what `lookZoomMul` is written to take.
     */
    const span = twoDown();
    if (span !== null) {
      // ROUND 4: a cancelled draw must also give the CAMERA back. The portrait draw pans the
      // frame downrange onto the target, and `cancelDrag()` only puts the band back — without
      // this the camera would be stranded on the structure with the sling off screen and
      // nothing left to move it, since `drawing()` is only called by a live draw.
      if (dragPointerId !== null) { dragPointerId = null; world.sling?.cancelDrag(); world.rig?.focusSling?.(); }
      lookPointerId = null;
      if (pinchSpan !== null && pinchSpan > 8 && span > 8) world.rig?.lookZoomMul(pinchSpan / span);
      pinchSpan = span;
      ev.preventDefault();
      return;
    }
    if (lookPointerId === ev.pointerId) {
      world.rig?.lookBy(ev.clientX - lookLastX, ev.clientY - lookLastY);
      lookLastX = ev.clientX; lookLastY = ev.clientY;
      ev.preventDefault();
      return;
    }
    if (dragPointerId !== ev.pointerId) return;
    const p = worldAt(ev);
    if (p) world.sling?.setPouch(p.x, p.y);
    ev.preventDefault();
  }, { passive: false });

  const finish = (ev) => {
    forgetPointer(ev.pointerId);
    if (lookPointerId === ev.pointerId) {
      lookPointerId = null;
      try { el.releasePointerCapture?.(ev.pointerId); } catch { /* already gone */ }
      return;
    }
    if (dragPointerId !== ev.pointerId) return;
    dragPointerId = null;
    try { el.releasePointerCapture?.(ev.pointerId); } catch { /* already gone */ }
    world.sling?.endDrag();
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (ev) => {
    forgetPointer(ev.pointerId);
    if (lookPointerId === ev.pointerId) { lookPointerId = null; return; }
    if (dragPointerId !== ev.pointerId) return;
    dragPointerId = null;
    world.sling?.cancelDrag();
    world.rig?.focusSling?.();      // …and the same for a pointer the OS takes away mid-draw
  });

  /**
   * Wheel / trackpad pinch = zoom the look. Desktop only in practice (a phone has no wheel), and
   * it is the same bounded offset the drag uses — `camera.js` clamps it and every real intent
   * clears it, so it can never leak into a shot.
   */
  el.addEventListener('wheel', (ev) => {
    if (world.phase !== 'aiming' && world.phase !== 'settling') return;
    world.rig?.lookZoomBy(ev.deltaY);
    ev.preventDefault();
  }, { passive: false });

  addEventListener('keydown', (ev) => {
    world.audio?.unlock();
    if (ev.code === 'Space') { ev.preventDefault(); tapAbility(); }
    if (ev.code === 'KeyR') restart();
    if (ev.code === 'KeyM') world.audio?.setMute(!world.audio.muted);
  });

  // A tab that loses focus mid-drag must not come back holding an invisible band.
  addEventListener('blur', () => {
    if (dragPointerId !== null) { dragPointerId = null; world.sling?.cancelDrag(); }
    lookPointerId = null;
    livePointers.clear(); pinchSpan = null;
  });
}

function tapAbility() {
  const live = world.projectiles.filter(p => !p.dead && p.launched && !p.abilityUsed);
  if (!live.length) return { ok: false, reason: 'nothing in flight with an unused ability' };
  return live[0].tryAbility();
}

// ---------------------------------------------------------------------------
// 7. HOOK CONTEXT
// ---------------------------------------------------------------------------
function state() {
  return {
    phase: world.phase,
    level: levelId,
    score: world.score,
    stars: world.stars,
    villainsAlive: aliveVillains(),
    ammoLeft: ammoLeft(),
    bodiesAsleep: physics.countAsleep(),
    // extensions
    bodies: world.entities.filter(e => e.body).length,
    blocks: world.blocks.length,
    debris: world.debris.length,
    slingState: world.sling?.state ?? 'none',
    drawn: +(world.sling?.drawn ?? 0).toFixed(4),
    tick: physics.tick,
    simTime: +world.simTime.toFixed(4),
    seed: currentSeed(),
    driven: physics.driven,
    timeScale: physics.timeScale,
    hitStop: world.hitStop,
    // --- progression (P13) ---
    levelNumber: levelNumber(levelId),
    levelCount: LEVEL_ORDER.length,
    nextLevel: nextLevel(levelId),
    totalStars: totalStars(),
    best: bestFor(levelId),
    /**
     * How many times `grade()` has had to rescue a won level that fell below its own 1-star
     * threshold. MUST be 0: a non-zero value means levels/stars.json has drifted under the
     * real score distribution and needs re-deriving. `p13-stargate.mjs` asserts on it.
     */
    starsClamped: scoring.starsClamped,

    /**
     * ── THE AMMO'S MARK, AS A MEASURED SIZE AND NOT AN INTENTION ──────────────────────────
     *
     * Round 2 of the BALL piece was rejected because the IFM mark was authored and judged at
     * 26 CSS px and shipped at 8.5, and no hook in the game could see the difference. These
     * two fields close that: `faceCssPx` is the live medallion's projected DISC diameter in
     * CSS px through the real camera, and `faceLod` is which of the two marks that size
     * selected. A critic can now assert "the coin is under the detail threshold on a phone"
     * instead of taking a screenshot and squinting.
     *
     * Null when nothing is loaded or in the air, which is a state and not a failure.
     */
    ammoFace: (() => {
      const a = world.sling?.ammo ?? world.projectiles.find(p => !p.dead);
      if (!a || a.faceCssPx === undefined) return null;
      return { lod: a.faceLod, cssPx: +a.faceCssPx.toFixed(2), variant: medallionFaceVariant() };
    })(),

    /**
     * ── THE TUTORIAL HINT: THREE FIELDS, BECAUSE THEY ARE THREE DIFFERENT FACTS ──────────
     *
     * `hintDone` used to be the SAVED FLAG, and it read `true` while the hint was plainly on
     * screen. A hook that lies is worse than the visual bug behind it: a critic checking
     * `hintDone` passes a build that still shows the line on level 3, and the defect ships
     * with the game. So the flag no longer answers a question about the screen.
     *
     *   hintVisible — MEASURED off the DOM every call (offsetParent + computed
     *                 display/visibility/opacity + a box that intersects the viewport). This
     *                 is the ground truth; `innerText` cannot see an opacity-hidden element
     *                 and must never be used for it.
     *   hintDone    — literally "the hint is not on screen". Derived from hintVisible, so
     *                 `hintDone === true` CANNOT coexist with a visible hint by construction.
     *   hintSeen    — the persisted intention: has the player ever completed a real draw?
     *                 Useful, and honestly named — it says nothing about what is rendered.
     */
    hintVisible: hintOnScreen(),
    hintDone: !hintOnScreen(),
    hintSeen: hintSeen(),

    /**
     * WHAT THE HUD IS ACTUALLY SHOWING — text read back out of the DOM. Every field above
     * is the game's intent; this is the render. They have already disagreed on this project
     * (the chip read "Level 1" on level 3 while the level index was correct everywhere a
     * hook could see it), and nothing in the hook surface could see it. Now it can.
     */
    hud: world.hud?.readback() ?? null,

    storageOK: progressStorage.available,
  };
}

/** Rendered truth about the tutorial line. No HUD at all means nothing is on screen. */
function hintOnScreen() { return world.hud?.hintVisible() ?? false; }

/** Full-precision transform dump — the determinism oracle. Hex is the f64 bit pattern. */
function dumpBodies() {
  const buf = new DataView(new ArrayBuffer(8));
  const hex = (n) => { buf.setFloat64(0, n); return buf.getBigUint64(0).toString(16).padStart(16, '0'); };
  return world.entities.filter(e => e.body).map((e, i) => {
    const t = e.body.translation(), r = e.body.rotation(), v = e.body.linvel();
    return {
      i, tag: e.tag,
      t: [t.x, t.y, t.z], r: [r.x, r.y, r.z, r.w], v: [v.x, v.y, v.z],
      sleeping: e.body.isSleeping(),
      bits: [t.x, t.y, t.z, r.x, r.y, r.z, r.w].map(hex).join(''),
    };
  });
}

function perf() {
  const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
  const info = renderer.info;
  return {
    fps: avg ? +(1000 / avg).toFixed(1) : 0,
    frameMs: +avg.toFixed(2),
    drawCalls: info.render.calls,
    tris: info.render.triangles,
    bodies: world.entities.filter(e => e.body).length,
    particles: world.fx?.liveCount ?? 0,
    programs: info.programs?.length ?? 0,
  };
}

// ---------------------------------------------------------------------------
// BOOT
// ---------------------------------------------------------------------------
export async function boot() {
  bootRenderer();
  await bootPhysics();

  world.rig = new CameraRig(camera);
  world.fx = new FX(scene, world.rig);
  // One instanced blob per physical object, so nothing in the game can ever float (P3).
  world.shadows = new ContactShadows(scene);
  world.audio = new Audio();
  world.hud = new Hud();
  world.hud.onRestart = () => { world.audio?.cue('click'); return restart(); };
  world.hud.onNext = () => { world.audio?.cue('click'); return goNext(); };
  world.hud.onFirst = () => { world.audio?.cue('click'); return goFirst(); };
  world.hud.onPickLevel = (id) => { world.audio?.cue('click'); return loadLevel(id); };
  world.hud.onResetProgress = () => { world.audio?.cue('click'); return resetProgress(); };

  /**
   * The IFM medallion's face is composited from assets/ifm-round.png, and it is preloaded
   * HERE — before the first level builds — so the very first projectile the player sees is
   * already branded rather than popping in a frame later. It never rejects and it carries its
   * own timeout: HOOKS.md is explicit that `ready` must not be gated on a fetch that can hang,
   * so a missing asset degrades to a drawn IFM mark and a logged warning, not a stalled boot.
   */
  await preloadMedallionFace();

  await loadLevel(requestedLevel() ?? LEVEL_ORDER[0]);
  bootInput();

  const SS = installHooks({
    version: VERSION,
    renderer, scene, camera, physics, Physics, THREE,
    render, stepOnce, loadLevel, restart, state, dumpBodies, perf,
    audioMute: (on) => world.audio.setMute(on),
    get sling() {
      const s = world.sling;
      if (!s) return null;
      return {
        aim: (o) => s.aim(o),
        dragTo: (x, y) => s.dragTo(x, y),
        release: () => s.release(),
        tapAbility: () => tapAbility(),
      };
    },
    entities: () => world.entities,
    world,
    /**
     * PROGRESSION HOOKS. A three-level game that can only be walked through by a human is a
     * three-level game nobody can gate, so the chain is drivable: `SS.nextLevel()` is the
     * Next Level button, `SS.progress()` is the saved record, `SS.resetProgress()` wipes it.
     */
    progression: {
      next: () => goNext(),
      first: () => goFirst(),
      order: () => LEVEL_ORDER.slice(),
      read: () => ({ ...progress(), totalStars: totalStars(), storage: { ...progressStorage } }),
      reset: () => resetProgress(),
      grade: (id, score, won = true) => grade(id, score, won),
      /**
       * The scoring constants plus the level's own structural MINIMUM winning score — every
       * villain down, zero ammo left, zero blocks broken. The 1-star threshold must sit below
       * this, or a scruffy last-shot win can score below its own 1-star band. l1's sweep never
       * produced a 4-shot win, so a distribution-only derivation could not see that floor.
       */
      rules: () => ({
        ...SCORE,
        level: levelId,
        villains: world.villains.length,
        ammo: world.ammoQueue.length,
        minWinScore: world.villains.length * SCORE.villain,
        maxAmmoBonus: world.ammoQueue.length * SCORE.ammoBonus,
      }),
      thresholds: () => scoring.table(),
      clamped: () => scoring.starsClamped,
    },
  });

  requestAnimationFrame((t) => { lastWall = t; loop(t); });

  // ready only AFTER a real frame has hit the screen — but never hang on it.
  let rafSeen = false;
  await Promise.race([
    new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { rafSeen = true; r(); }))),
    new Promise(r => setTimeout(r, 2000)),
  ]);
  if (!rafSeen) {
    console.warn('[scam-slingshot] rAF did not fire within 2s — falling back to an interval loop.');
    setInterval(() => {
      if (!physics.driven) { physics.acc += FIXED; while (physics.acc >= FIXED) { stepOnce(); physics.acc -= FIXED; } }
      render();
    }, 16);
    render();
  }
  SS.ready = true;

  const bootEl = document.getElementById('boot');
  if (bootEl) { bootEl.classList.add('gone'); setTimeout(() => bootEl.remove(), 500); }

  console.log(`[scam-slingshot] ${VERSION} · three r${THREE.REVISION} · rapier ${RAPIER.version()} ` +
              `· FIXED=${FIXED} (${Math.round(1 / FIXED)}Hz) · g=${GRAVITY_Y.toFixed(2)}`);
  return SS;
}
