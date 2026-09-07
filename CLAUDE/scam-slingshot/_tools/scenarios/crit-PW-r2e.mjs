/**
 * crit-PW-r2e.mjs — PW r2, part 5. DEBRIS WEIGHT.
 * `world.blocks` loses a block the moment it fractures, so a loft audit over blocks alone
 * cannot see the thing the eye actually watches during a collapse: the fragments. Track every
 * Debris entity from birth — mass, peak rise above its birth point, peak upward speed, hang
 * time above +0.3 m, and time to come to rest — and price the rise in joules.
 */
const G = 9.81 * 2.4;
export default async ({ game, OUT }) => {
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('l1');`);
  await game(`await SS.seed(4242);`);
  await game(`return SS.aimAndFire(0.30, 0.90);`);
  const r = await game(`
    const w = SS.__world, G = ${G};
    const rec = new Map();
    for (let n = 0; n < 600; n++) {
      SS.stepOnce();
      for (const d of w.debris) {
        if (!d.body) continue;
        const t = d.body.translation(), v = d.body.linvel();
        let e = rec.get(d);
        if (!e) { e = { mat: d.matName || (d.material && d.material.name) || '?', m: +d.body.mass().toFixed(4),
                        y0: t.y, born: n, peak: 0, vUp: 0, hang: 0, last: n }; rec.set(d, e); }
        e.peak = Math.max(e.peak, t.y - e.y0);
        e.vUp = Math.max(e.vUp, v.y);
        if (Math.hypot(v.x, v.y) > 0.35) { e.hang++; e.last = n; }
      }
    }
    const out = [...rec.values()].map(e => ({ mat: e.mat, m: e.m, y0: +e.y0.toFixed(2),
      peakRise: +e.peak.toFixed(3), vUp: +e.vUp.toFixed(2),
      movingMs: Math.round(e.hang * 1000 / 120), restAtMs: Math.round((e.last - e.born) * 1000 / 120),
      PErise: +(e.m * G * Math.max(0, e.peak)).toFixed(2) }));
    return { n: out.length, out };
  `);
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2e.json`, JSON.stringify(r, null, 2));
  console.log('debris tracked:', r.n);
};
