/**
 * p3-r8-core.mjs — DOES THE IMPACT COMPOSE A HOT CORE INSIDE A DARK MASS?
 *
 * Measures, from the TRUE first ammo contact (per ORCHESTRATOR-NOTES P3 r5 §2 — never from the
 * r5 gate's early contact detector), for every fx pool:
 *   · how many sprites are LIVE at t = 0/40/80/120/200/300/400/600 ms after contact
 *   · the world width and the ON-SCREEN width of the biggest mass sprite (smoke/tuft) and of
 *     the biggest core sprite (flash) at that instant
 *   · the CORE : MASS width ratio, which is the number the r7 critic measured at 0.96x against
 *     a reference of 0.36x.
 *
 * Run on l1's canonical opening shot (the wood beam the whole level is built around) and on
 * each single-material probe level, so "every impact, not only a stone break" is testable.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__hits = [];
if (!B.__r8) {
  B.__r8 = true;
  const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__firstHit == null) {
      window.__firstHit = SS.tick();
      window.__firstHitInfo = { m: this.matName, imp, app };
    }
    return oi.call(this, imp, other, pt, app);
  };
}
window.__firstHit = null; window.__firstHitInfo = null;
return true;`;

/** Live sprites per pool + the widest mass and the widest core, in world AND screen units. */
const PROBE = `
const w = SS.__world, F = w.fx, cam = w.camera;
const V3 = cam.position.constructor;
const rect = w.renderer.domElement.getBoundingClientRect();
const scr = (wx, wy, worldW) => {
  const a = new V3(wx - worldW / 2, wy, 0).project(cam);
  const b = new V3(wx + worldW / 2, wy, 0).project(cam);
  return Math.abs(b.x - a.x) * 0.5 * rect.width;
};
const MASS = ['smoke', 'tuftWood', 'tuftGlass'];
const out = { counts: {}, mass: null, core: null };
let best = null, bestCore = null;
for (const k in F.pools) {
  const p = F.pools[k], P = p.p;
  let n = 0;
  for (let i = 0; i < p.max; i++) {
    if (P.life[i] <= 0) continue;
    n++;
    // on-screen size uses the SAME law the pool's update() uses
    const t = P.life[i] / P.max[i], age = 1 - t;
    const openFrac = p.openFrac ?? 0.10, openFrom = p.openFrom ?? 0.45;
    const pop = (p.popIn && t > 1 - openFrac) ? openFrom + (1 - openFrom) * (1 - t) / openFrac : 1;
    const gp = p.growPow ?? 1;
    const grow = 1 + (P.grow[i] - 1) * Math.pow(age, gp);
    const ww = P.sx[i] * pop * grow;
    const row = { pool: k, i, x: P.x[i], y: P.y[i], ww, px: scr(P.x[i], P.y[i], ww),
                  life: +P.life[i].toFixed(3), max: +P.max[i].toFixed(3) };
    if (MASS.includes(k) && (!best || ww > best.ww)) best = row;
    // the CORE pool if the build has one; otherwise the biggest sprite in the shared flash
    // pool, which is what the star used to live in
    const coreKey = F.pools.core ? 'core' : 'flash';
    if (k === coreKey && (!bestCore || ww > bestCore.ww)) bestCore = row;
  }
  out.counts[k] = n;
}
out.mass = best; out.core = bestCore;
out.ratio = (best && bestCore) ? +(bestCore.ww / best.ww).toFixed(3) : null;
return out;`;

async function run({ game }, lvl, seed, ang, pow, label) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
  let t = 0, hit = null;
  while (t < 5000) {
    await game('await SS.seek(10);'); t += 10;
    hit = await game('return window.__firstHit;'); if (hit != null) break;
  }
  const info = await game('return window.__firstHitInfo;');
  console.log(`\n=== ${label}  ${lvl} ${ang}@${pow}  first AMMO contact at fire+${t}ms  ` +
    `mat=${info?.m} impulse=${info?.imp?.toFixed(2)} N.s approach=${info?.app?.toFixed(1)} m/s`);
  let seen = 0;
  for (const at of [0, 40, 80, 120, 200, 300, 400, 600]) {
    if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
    const r = await game(PROBE);
    const cs = Object.entries(r.counts).filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`).join(' ') || '(NO SPRITES AT ALL)';
    const f3 = (v) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(3) : String(v);
    const f0 = (v) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(0) : String(v);
    const m = r.mass ? `mass ${r.mass.pool} w=${f3(r.mass.ww)}m ${f0(r.mass.px)}px` : 'mass —';
    const c = r.core ? `core w=${f3(r.core.ww)}m ${f0(r.core.px)}px` : 'core —';
    console.log(` hit+${String(at).padStart(3)}ms  ${cs}\n            ${m} | ${c} | CORE:MASS ${r.ratio ?? '—'}`);
  }
}

export default async (ctx) => {
  await run(ctx, 'l1', 4242, 0.26, 0.95, 'L1 OPENING SHOT (the shot the level is built around)');
  await run(ctx, '_p3-wood', 777, 0.16, 0.88, 'WOOD probe');
  await run(ctx, '_p3-glass', 777, 0.16, 0.88, 'GLASS probe');
  await run(ctx, '_p3-stone', 777, 0.16, 0.88, 'STONE probe');
};
