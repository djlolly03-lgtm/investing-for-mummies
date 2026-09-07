/**
 * p0-tune.mjs — the impulse budget, measured. angle x power on levels/_probe-open.json.
 * Prints, for every shot, the peak single-contact impulse the villain receives from the
 * AMMO and the ammo's speed at contact. This table is what the damage thresholds are
 * chosen from; re-run it after any change to mass, density, maxSpeed or the collider.
 */
export default async ({ game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];

  await game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1);
    if (!window.__tuneInstalled) {
      window.__tuneInstalled = true;
      const VP = Object.getPrototypeOf(Object.getPrototypeOf(SS.__world.villains[0]));
      window.__T = { ev: [] };
      const oi = VP.onImpact, od = VP.die;
      VP.onImpact = function (impulse, other, point, approach = 0) {
        window.__T.ev.push({ imp: impulse, app: approach, other: other ? other.tag : 'null' });
        return oi.call(this, impulse, other, point, approach);
      };
      VP.die = function (i) { window.__T.ev.push({ DIED: 1 }); return od.call(this, i); };
    }`);

  const run = async (angle, power) => game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1); await SS.seek(700);
    window.__T.ev.length = 0;
    SS.aimAndFire(args[0], args[1]);
    await SS.seek(2600);
    const E = window.__T.ev, am = E.filter(e => e.other === 'ammo');
    return { n: am.length,
      peak: +am.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
      sum:  +am.reduce((s,e)=>s+e.imp,0).toFixed(3),
      app:  +am.reduce((m,e)=>Math.max(m,e.app),0).toFixed(2),
      died: E.some(e=>e.DIED), hp: +(SS.__world.villains[0]?.hp ?? -1).toFixed(3) };
  `, angle, power);

  const table = [];
  for (const p of [1.0, 0.8, 0.6, 0.45, 0.3]) {
    for (let a = 0.05; a <= 1.30001; a += 0.05) {
      const r = await run(+a.toFixed(2), p);
      if (r.n > 0) table.push({ power: p, angle: +a.toFixed(2), ...r });
    }
  }
  for (const r of table) console.log(`  p=${r.power} a=${r.angle}  n=${r.n} peak=${r.peak} sum=${r.sum} app=${r.app} died=${r.died} hp=${r.hp}`);

  const byPower = {};
  for (const r of table) {
    byPower[r.power] ??= { hits: 0, maxPeak: 0, minPeak: 9e9, kills: 0 };
    const b = byPower[r.power];
    b.hits++; b.maxPeak = Math.max(b.maxPeak, r.peak); b.minPeak = Math.min(b.minPeak, r.peak);
    if (r.died) b.kills++;
  }
  console.log('  SUMMARY', JSON.stringify(byPower));
  out.push({ table, byPower });
  await fs.writeFile(path.join(OUT, 'tune.json'), JSON.stringify(out, null, 2));
};
