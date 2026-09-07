/**
 * p3-r6-dmg.mjs — where does a stone block's damage actually get to?
 *
 * Wraps Block.onImpact and reads `this.damage` / `this.lastImpulse` AFTER the real handler
 * has run, so every number here is what the damage model itself computed — not a probe's
 * re-derivation of it. Reports, per block: the biggest single scaled blow it took, the
 * highest its accumulated damage ever reached (as a fraction of its own threshold), how
 * many blows cleared DAMAGE_FLOOR, and the crack step it ended on.
 */

const SHOTS = [[0.30, 0.90], [0.32, 0.94], [0.36, 1.00], [0.24, 0.92], [0.20, 1.00], [0.28, 0.88]];

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__D = new Map();
if (!B.__dmgProbe) {
  B.__dmgProbe = true;
  const oi = B.onImpact, os = B.onShock;
  const rec = (self, before) => {
    let r = window.__D.get(self.id);
    if (!r) { r = { mat: self.matName, thr: self.material.physics.breakImpulse,
                    maxBlow: 0, maxDmg: 0, hits: 0, rawMax: 0, srcMax: '-', broke: false };
              window.__D.set(self.id, r); }
    return r;
  };
  B.onImpact = function (imp, other, pt, app) {
    const r = rec(this); const b4 = this.lastImpulse;
    const out = oi.call(this, imp, other, pt, app);
    if (this.lastImpulse !== b4) {
      r.hits++;
      if (this.lastImpulse > r.maxBlow) { r.maxBlow = this.lastImpulse; r.rawMax = imp; r.srcMax = other?.tag ?? '-'; }
    }
    if (this.damage > r.maxDmg) r.maxDmg = this.damage;
    if (this.broken) r.broke = true;
    return out;
  };
  B.onShock = function (d, ux, uy) {
    const r = rec(this); const out = os.call(this, d, ux, uy);
    if (this.damage > r.maxDmg) r.maxDmg = this.damage;
    if (this.broken) r.broke = true;
    return out;
  };
}
return true;`;

const READ = `const out = [];
for (const [id, r] of window.__D) out.push({ id, ...r });
return out;`;

export default async ({ game }) => {
  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__D.clear(); return true;');
    const r0 = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r0.ok) { console.log(`SHOT ${ang}@${pow} FIRE-FAIL`); continue; }
    await game('await SS.seek(6000);');
    const rows = await game(READ);
    console.log(`\n== ${ang}@${pow} ==`);
    for (const r of rows.filter(r => r.mat !== 'glass')
      .sort((a, b) => (b.maxDmg / b.thr) - (a.maxDmg / a.thr))) {
      console.log(`  ${r.mat.padEnd(5)} id${String(r.id).padStart(3)} ${r.broke ? 'BROKE' : '     '} ` +
        `peakDmg=${(100 * r.maxDmg / r.thr).toFixed(0).padStart(3)}% of ${r.thr}  ` +
        `biggestBlow=${r.maxBlow.toFixed(2).padStart(6)} (raw ${r.rawMax.toFixed(2)} from ${r.srcMax})  ` +
        `blowsPastFloor=${r.hits}`);
    }
  }
};
