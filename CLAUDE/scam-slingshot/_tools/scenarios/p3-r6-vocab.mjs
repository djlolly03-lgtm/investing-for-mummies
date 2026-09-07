/**
 * p3-r6-vocab.mjs — THE THREE MATERIALS, AS A GRADED LADDER.
 *
 * The round-6 brief asks for three break behaviours that are distinct AND reachable:
 * "glass shatters easily … wood needs a solid hit … stone needs a very strong hit or a
 * heavy crush". One threshold per material only proves that if you can see WHERE on the
 * power curve each one gives way.
 *
 * So: the identical probe geometry in three materials, hit square at five draw powers.
 * Reports, per (material, power): did it fracture, the impulse of the killing blow, the
 * highest fraction of its own threshold it reached, and how many pieces it made.
 * A ladder — glass breaking at every power, wood from the middle, stone only at the top —
 * is the evidence. All three breaking at 0.5, or stone never breaking, is the failure.
 */

// Power is the wrong axis on the probe levels: below 0.6 the dart falls short and above
// 0.95 it overflies, so a power sweep measures the trajectory, not the material. Sweeping
// the AIM at one power varies how squarely the shot lands, which is exactly the thing the
// three materials are supposed to sort differently — a graze, a solid hit, a square hit.
const POWER = 0.88;
const ANGLES = [0.16, 0.20, 0.24, 0.28, 0.32];

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__V = { frac: [], peak: 0, thr: SS.__world.blocks[0].material.physics.breakImpulse, hit: null };
if (!B.__vocab) {
  B.__vocab = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__V.hit === null)
      window.__V.hit = { raw: +imp.toFixed(2), ap: +app.toFixed(1) };
    const out = oi.call(this, imp, other, pt, app);
    if (this.damage > window.__V.peak) window.__V.peak = this.damage;
    return out;
  };
  B.fracture = function (imp, pt) {
    const k = of.call(this, imp, pt);
    window.__V.frac.push({ mat: this.matName, imp: +imp.toFixed(2), kids: k.length });
    return k;
  };
}
return true;`;

export default async ({ game }) => {
  for (const lvl of ['_p3-glass', '_p3-wood', '_p3-stone']) {
    const line = [];
    for (const a of ANGLES) {
      await game('await SS.loadLevel(args[0]); SS.seed(3); await SS.seek(900);', lvl);
      await game(INSTRUMENT);
      await game('window.__V.frac = []; window.__V.peak = 0; window.__V.hit = null; return true;');
      const r = await game('return SS.aimAndFire(args[0],args[1]);', a, POWER);
      if (!r.ok) { line.push(`${a}:FIRE-FAIL`); continue; }
      await game('await SS.seek(3500);');
      const v = await game('return window.__V;');
      const d = await game('return SS.__world.debris.filter(x=>!x.dead).length;');
      const pct = v.thr ? Math.round(100 * v.peak / v.thr) : 0;
      line.push(`a${a.toFixed(2)} raw${v.hit ? String(v.hit.raw).padStart(5) : '  -  '} ` +
        `${v.frac.length ? `BREAK ${v.frac.length}blk/${d}pc` : `intact ${String(pct).padStart(3)}%`}`);
    }
    console.log(`${lvl.padEnd(10)} thr=${await game('return SS.__world.blocks.length ? SS.__world.blocks[0].material.physics.breakImpulse : 0;')}  |  ${line.join('  |  ')}`);
  }
};
