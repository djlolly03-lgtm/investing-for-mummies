/**
 * p3-r6-chain.mjs — WHO actually kills each block?
 *
 * For every fracture in an l1 sweep, record the source of the blow that finished it
 * (ammo / block / debris / shock) and the raw impulse it carried. The r5-era build broke
 * everything by accumulated jostling; the rubric wants the projectile to be the agent of
 * fragmentation. This is the measurement that says which of those is true.
 *
 * Also logs every AMMO contact with the projectile's own pre-collision speed, so the
 * AMMO_PUNCH speed ramp can be checked against where the punch is actually landing.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = []; window.__ammo = []; window.__last = new Map(); window.__peakDmg = new Map();
const note = (b) => { const k = b.matName + '#' + b.id, thr = b.material.physics.breakImpulse;
  const f = b.damage / thr; if (!(window.__peakDmg.has(k)) || f > window.__peakDmg.get(k)) window.__peakDmg.set(k, f); };
if (!B.__r6c) {
  B.__r6c = true;
  const oi = B.onImpact, of = B.fracture, os = B.onShock;
  B.onImpact = function (imp, other, pt, app) {
    if (app >= 1.2 && !this.fixed && !this.broken) {
      window.__last.set(this.id, { src: other?.tag ?? '?', imp, spd: other?.lastSpeed ?? 0 });
      if (other?.tag === 'ammo') window.__ammo.push({ mat: this.matName, id: this.id, imp,
        spd: other.lastSpeed ?? 0, dmg0: this.damage });
    }
    const r = oi.call(this, imp, other, pt, app);
    if (!this.broken) note(this);
    return r;
  };
  B.onShock = function (d, ux, uy) {
    if (!this.broken) window.__last.set(this.id, { src: 'shock', imp: d, spd: 0 });
    const r = os.call(this, d, ux, uy);
    if (!this.broken) note(this);
    return r;
  };
  B.fracture = function (imp, pt) {
    const src = window.__last.get(this.id) ?? { src: 'none', imp: 0, spd: 0 };
    const k = of.call(this, imp, pt);
    window.__fx.push({ mat: this.matName, kids: k.length, src: src.src, raw: src.imp, spd: src.spd });
    return k;
  };
}
return true;`;

const SHOTS = [[0.30, 0.90], [0.20, 1.00], [0.26, 0.95], [0.36, 1.00],
               [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96]];

export default async ({ game }) => {
  const L = (...a) => console.log(...a);
  const bySrc = {}; const byMatSrc = {};

  for (const [a, p] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__fx=[]; window.__ammo=[]; window.__last=new Map(); window.__peakDmg=new Map(); return true;');
    await game('return SS.aimAndFire(args[0],args[1]);', a, p);
    await game('await SS.seek(6000);');
    const d = await game(`return { fx: window.__fx, ammo: window.__ammo,
      peak: window.__peakDmg ? [...window.__peakDmg] : [] };`);
    L(`\n${a}@${p}`);
    L(`  peak damage / threshold on surviving blocks: ${d.peak.map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ') || '-'}`);
    L(`  ammo contacts: ${d.ammo.map(x => `${x.mat[0].toUpperCase()}(v${x.spd.toFixed(0)},raw${x.imp.toFixed(1)})`).join(' ')}`);
    L(`  fractures: ${d.fx.map(f => `${f.mat}<-${f.src}@${f.raw.toFixed(1)}`).join('  ')}`);
    for (const f of d.fx) {
      bySrc[f.src] = (bySrc[f.src] ?? 0) + 1;
      const k = `${f.mat}<-${f.src}`; byMatSrc[k] = (byMatSrc[k] ?? 0) + 1;
    }
  }
  L(`\n== WHO KILLS BLOCKS (8 shots) ==`);
  L(JSON.stringify(bySrc));
  L(JSON.stringify(byMatSrc));
};
