/**
 * world.js — the shared runtime registry.
 *
 * Every system needs to reach the scene, the entity list and the current phase. Passing all
 * of that down through constructors turns into a spiderweb and importing main.js from a
 * subsystem makes a cycle. So there is exactly ONE mutable registry, here, and main.js is
 * the only file allowed to assign the top-level slots (scene/camera/renderer/rig/...).
 *
 * `simTime` is the ONLY clock any animation may read. It is `tick * FIXED`, i.e. it advances
 * exactly one solver step at a time — including inside SS.seek(). Anything animated off
 * performance.now() would make every critic filmstrip unreproducible.
 */

export const world = {
  // --- filled by main.js at boot ---
  scene: null,
  camera: null,     // THREE.PerspectiveCamera
  renderer: null,
  rig: null,        // CameraRig  (camera.js)
  sling: null,      // Slingshot  (slingshot.js)
  fx: null,         // FX         (fx/index.js)
  audio: null,      // Audio      (audio/index.js)
  hud: null,        // Hud        (ui/hud.js)
  sun: null,        // the key DirectionalLight; the camera rig slides its shadow frustum

  // --- per level ---
  level: null,      // the parsed level JSON
  entities: [],     // every live Entity, creation order (determinism depends on this order)
  byCollider: new Map(),   // Rapier collider handle -> Entity
  villains: [],
  blocks: [],
  debris: [],
  projectiles: [],

  // --- game state ---
  phase: 'boot',    // boot|menu|aiming|flying|settling|won|lost
  score: 0,
  stars: 0,
  ammoQueue: [],    // remaining ammo type ids, index 0 is loaded next
  ammoUsed: 0,

  // --- deterministic clock ---
  simTime: 0,       // seconds, = tick * FIXED
  hitStop: 0,       // solver steps to hold the world still (deterministic, tick-counted)

  /**
   * PER-LEVEL SCAM STATE — the one flag each level's scam mechanic runs on.
   *
   * The scam used to be a SKIN: villains named the scam, `teaches` explained it, and the
   * verbs underneath were plain Angry Birds. A student could clear all three levels without
   * ever feeling what a scam does to you. These flags are how a scam becomes a MECHANIC —
   * see the gate in level/blocks.js `fracture()`.
   *
   *   interestCleared  L2, toxic debt. While false, every load-bearing block in the debt
   *                    tower ABSORBS its damage instead of breaking: the tower shakes, chips
   *                    fly off the top, the score ticks — and the debt does not come down.
   *                    Killing the interest meter flips it and the whole structure becomes
   *                    breakable. That is the lesson as a verb: paying the minimum is not
   *                    progress, and the thing to kill is the interest.
   */
  scam: { interestCleared: false },
  /** Index into the level's `busts[]` — see the villainDefeated handler in main.js. */
  bustsShown: 0,
};

/** Register an entity. Creation order matters — it is the determinism ordering. */
export function register(e) {
  world.entities.push(e);
  if (e.collider) world.byCollider.set(e.collider.handle, e);
  return e;
}

export function unregister(e) {
  const i = world.entities.indexOf(e);
  if (i > -1) world.entities.splice(i, 1);
  if (e.collider) world.byCollider.delete(e.collider.handle);
  for (const list of [world.villains, world.blocks, world.debris, world.projectiles]) {
    const j = list.indexOf(e);
    if (j > -1) list.splice(j, 1);
  }
}

export function entityFor(colliderHandle) {
  return world.byCollider.get(colliderHandle) ?? null;
}

/** Wipe every per-level list. main.js calls this before rebuilding. */
export function resetWorldLists() {
  world.entities = [];
  world.byCollider = new Map();
  world.villains = [];
  world.blocks = [];
  world.debris = [];
  world.projectiles = [];
  world.score = 0;
  world.stars = 0;
  world.ammoUsed = 0;
  world.simTime = 0;
  world.hitStop = 0;
  // a retry must meet the scam intact
  world.scam = { interestCleared: false };
  world.bustsShown = 0;      // how many truth lines this level has spent
}

export function aliveVillains() { return world.villains.filter(v => v.alive).length; }
export function ammoLeft() { return Math.max(0, world.ammoQueue.length - world.ammoUsed); }
