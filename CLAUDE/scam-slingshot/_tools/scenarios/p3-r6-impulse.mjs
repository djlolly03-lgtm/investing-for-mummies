/**
 * p3-r6-impulse.mjs — WHAT DOES A SHOT ACTUALLY DELIVER?
 *
 * The r5 critic measured a ~9.5 N·s ceiling on the PER-EVENT ammo impulse. But the damage
 * model accumulates across the contact, so the number that matters for a breakImpulse
 * threshold is the accumulated damage the block reaches, not the biggest single event.
 * This probe measures both, plus the contact length in solver steps, plus the ammo's
 * closing speed and mass, so the three thresholds can be re-spread against real numbers.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__ev = []; window.__fx = []; window.__peak = {};
if (!B.__r6) {
  B.__r6 = true;
  const oi = B.onImpact, of = B.fracture, os = B.onShock;
  B.onImpact = function (imp, other, pt, app) {
    const before = this.damage;
    const r = oi.call(this, imp, other, pt, app);
    if (other?.tag === 'ammo')
      window.__ev.push({ tick: SS.tick(), mat: this.matName, id: this.id, imp, app,
        d0: before, d1: this.damage, spd: other.velocity ? Math.hypot(other.velocity(new (SS.__world.camera.position.constructor)()).x, 0) : 0 });
    const k = this.matName + ':' + this.id;
    if (!(k in window.__peak) || this.damage > window.__peak[k]) window.__peak[k] = this.damage;
    return r;
  };
  B.onShock = function (d, ux, uy) {
    const r = os.call(this, d, ux, uy);
    const k = this.matName + ':' + this.id;
    if (!(k in window.__peak) || this.damage > window.__peak[k]) window.__peak[k] = this.damage;
    return r;
  };
  B.fracture = function (imp, pt) {
    const t = SS.tick(), k = of.call(this, imp, pt);
    window.__fx.push({ tick: t, mat: this.matName, imp, kids: k.length });
    return k;
  };
}
return true;`;

const RESET = `window.__ev = []; window.__fx = []; window.__peak = {}; return true;`;

async function fire(game, lvl, seed, ang, pow, settle = 4000) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game(RESET);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  await game('await SS.seek(args[0]);', settle);
  return game('return { ev: window.__ev, fx: window.__fx, peak: window.__peak };');
}

export default async ({ game }) => {
  const L = (...a) => console.log(...a);

  L('--- ammo mass / geometry ---');
  L(JSON.stringify(await game(`
    const p = SS.__world.projectiles?.[0]; const w = SS.__world;
    return { proj: p ? { r: p.radius, mass: p.body.mass() } : null,
      blocks: w.blocks.slice(0,3).map(b=>({mat:b.matName,w:b.w,h:b.h,mass:b.body.mass(),thr:b.material.physics.breakImpulse})) };`)));

  const SHOTS = [[0.10, 1.0], [0.14, 1.0], [0.18, 1.0], [0.22, 1.0], [0.26, 0.95],
                 [0.30, 0.90], [0.34, 0.95], [0.16, 0.80], [0.20, 0.70], [0.12, 0.90]];

  for (const lvl of ['_p3-stone', '_p3-wood', '_p3-glass']) {
    L(`\n######## ${lvl} ########`);
    let bestEv = 0, bestAcc = 0, anyFrac = false;
    for (const [a, p] of SHOTS) {
      const d = await fire(game, lvl, 777, a, p, 3500);
      const ammoEv = d.ev.filter(e => e.app >= 1.2);
      const mx = Math.max(0, ...ammoEv.map(e => e.imp));
      const accs = Object.values(d.peak);
      const acc = Math.max(0, ...accs);
      // the biggest single-block ammo-only run: sum of ammo events on one block id
      const byId = {};
      for (const e of ammoEv) byId[e.id] = (byId[e.id] ?? 0) + e.imp;
      const sum = Math.max(0, ...Object.values(byId));
      if (mx > bestEv) bestEv = mx;
      if (acc > bestAcc) bestAcc = acc;
      if (d.fx.length) anyFrac = true;
      L(` ${a}@${p}  events=${ammoEv.length}  maxEv=${mx.toFixed(2)}  sumOnOneBlock=${sum.toFixed(2)}` +
        `  peakDamage=${acc.toFixed(2)}  frac=${d.fx.length}` +
        (ammoEv.length ? `  [${ammoEv.slice(0, 8).map(e => e.imp.toFixed(1)).join(',')}]` : ''));
    }
    L(` >> ${lvl}: peak single event ${bestEv.toFixed(2)}, peak accumulated ${bestAcc.toFixed(2)}, fractured: ${anyFrac}`);
  }

  L(`\n######## l1 (the real level) ########`);
  for (const [a, p] of [[0.34, 0.95], [0.36, 1.00], [0.30, 0.90], [0.26, 0.95], [0.20, 0.85]]) {
    const d = await fire(game, 'l1', 4242, a, p, 5000);
    const ammoEv = d.ev.filter(e => e.app >= 1.2);
    const mats = {};
    for (const f of d.fx) mats[f.mat] = (mats[f.mat] ?? 0) + 1;
    const byId = {};
    for (const e of ammoEv) byId[e.id] = (byId[e.id] ?? 0) + e.imp;
    L(` ${a}@${p} ammoEvents=${ammoEv.length} maxEv=${Math.max(0, ...ammoEv.map(e => e.imp)).toFixed(2)}` +
      ` maxSumOneBlock=${Math.max(0, ...Object.values(byId)).toFixed(2)}` +
      ` peakDamageAnyBlock=${Math.max(0, ...Object.values(d.peak)).toFixed(2)}` +
      ` fractures=${d.fx.length} byMat=${JSON.stringify(mats)}`);
    L(`     ammo hit materials: ${ammoEv.map(e => `${e.mat}:${e.imp.toFixed(1)}`).join(' ')}`);
  }
};
