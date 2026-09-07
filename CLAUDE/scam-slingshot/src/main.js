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
import { AMMO_TYPES } from './ammo/sip.js';
import { Trail } from './ammo/base.js';
import { FX } from './fx/index.js';
import { ContactShadows } from './level/shadows.js';
import { Audio } from './audio/index.js';
import { Hud } from './ui/hud.js';

export const VERSION = 'P0-foundation-2';

const SETTLE_TIMEOUT_TICKS = 6 * 120;     // 6s of sim time; a level can never wedge in 'settling'
const QUIET_TICKS = 36;                   // consecutive quiet ticks before we call it settled
let quietRun = 0;

let renderer, scene, camera, stage, canvas;
let sunLight, rimLight;
let levelId = 'l1';
let lastWall = 0;
let settleStart = 0;
let launchTick = -1;
let lastImpactPoint = new THREE.Vector3(18, 3, 0);
let dragPointerId = null;
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

  emit('levelLoaded', { level: levelId, data });
  world.hud?.refresh();
  world.hud?.hint(true, 'Drag back from the slingshot, then let go');

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

on('score', ({ amount }) => { world.score += amount; });
on('villainDefeated', () => { world.score += 5000; });

function evaluate() {
  if (aliveVillains() === 0) {
    // unused-ammo bonus, the classic "you were efficient" reward
    const bonus = ammoLeft() * 10000;
    world.score += bonus;
    world.stars = starsFor(world.score);
    world.phase = 'won';
    emit('levelWon', { score: world.score, stars: world.stars, bonus, level: levelId });
  } else if (ammoLeft() <= 0) {
    world.stars = 0;
    world.phase = 'lost';
    emit('levelLost', { score: world.score, level: levelId });
  } else {
    world.phase = 'aiming';
    loadNextAmmo();
    world.rig.focusSling();
    world.hud?.refresh();
  }
}

function starsFor(score) {
  const par = world.level?.par ?? 3;
  // Thresholds scale with how much ammo the level gives you, so a generous level is not
  // automatically a 3-star level.
  const base = 26000 + par * 4000;
  return score >= base * 1.55 ? 3 : score >= base * 1.15 ? 2 : score >= base * 0.7 ? 1 : 0;
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

  el.addEventListener('pointerdown', (ev) => {
    world.audio?.unlock();
    if (ev.button != null && ev.button !== 0) return;
    const s = world.sling;
    if (!s) return;

    if (world.phase === 'flying') { tapAbility(); return; }
    if (world.phase !== 'aiming' && world.phase !== 'settling') return;
    if (s.state !== 'loaded') return;

    const p = worldAt(ev);
    if (!p) return;
    // Generous grab: near the pouch, OR anywhere in the launch bay. Missing the pouch on a
    // phone is the fastest way to make a slingshot feel broken.
    const near = Math.hypot(p.x - s.anchor.x, p.y - s.anchor.y) < SLING.grabRadius;
    const inBay = p.x < s.anchor.x + 5.5 && p.y < 9;
    if (!near && !inBay) return;

    el.setPointerCapture?.(ev.pointerId);
    dragPointerId = ev.pointerId;
    s.beginDrag(p.x, p.y);
    world.hud?.hint(false);
    ev.preventDefault();
  }, { passive: false });

  el.addEventListener('pointermove', (ev) => {
    if (dragPointerId !== ev.pointerId) return;
    const p = worldAt(ev);
    if (p) world.sling?.setPouch(p.x, p.y);
    ev.preventDefault();
  }, { passive: false });

  const finish = (ev) => {
    if (dragPointerId !== ev.pointerId) return;
    dragPointerId = null;
    el.releasePointerCapture?.(ev.pointerId);
    world.sling?.endDrag();
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (ev) => {
    if (dragPointerId !== ev.pointerId) return;
    dragPointerId = null;
    world.sling?.cancelDrag();
  });

  addEventListener('keydown', (ev) => {
    world.audio?.unlock();
    if (ev.code === 'Space') { ev.preventDefault(); tapAbility(); }
    if (ev.code === 'KeyR') restart();
    if (ev.code === 'KeyM') world.audio?.setMute(!world.audio.muted);
  });

  // A tab that loses focus mid-drag must not come back holding an invisible band.
  addEventListener('blur', () => {
    if (dragPointerId !== null) { dragPointerId = null; world.sling?.cancelDrag(); }
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
  };
}

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
  world.hud.onRestart = () => { world.audio?.cue('click'); restart(); };

  await loadLevel('l1');
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
