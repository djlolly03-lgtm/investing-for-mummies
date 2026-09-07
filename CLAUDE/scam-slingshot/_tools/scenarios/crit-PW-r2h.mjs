/**
 * crit-PW-r2h.mjs — PW r2, part 8. ATTRIBUTION for the created energy.
 * A positive fixed-cohort energy jump has two candidate causes: the collapse layer writing
 * velocities, or Rapier's own penetration recovery pushing overlapping bodies apart. Sample
 * structure.stats every step next to the jump and see which steps they land on.
 */
const G = 9.81 * 2.4;
export default async ({ game, OUT }) => {
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('l1');`);
  await game(`await SS.seed(4242);`);
  await game(`
    const w = SS.__world;
    w.blocks.forEach((b, i) => { b.__cid = i; });
    window.__hit = null;
    for (const b of w.blocks) {
      const orig = b.onImpact.bind(b);
      b.onImpact = (imp, other, point, approach) => {
        if (!window.__hit && other && other.tag === 'ammo') window.__hit = { cid: b.__cid, mat: b.matName };
        return orig(imp, other, point, approach);
      };
    }
  `);
  await game(`return SS.aimAndFire(0.30, 0.90);`);
  const r = await game(`
    const w = SS.__world, G = ${G};
    let S = null;
    for (const u of ['/scam-slingshot/src/level/structure.js', './src/level/structure.js',
                     new URL('src/level/structure.js', location.href).href]) {
      try { S = await import(u); if (S && S.structure) break; } catch (e) { S = null; }
    }
    const st = () => {
      const s = (S && S.structure && S.structure.stats) || null;
      return s ? JSON.parse(JSON.stringify(s)) : null;
    };
    const snap = () => {
      const m = new Map();
      for (const b of w.blocks) { const t = b.body.translation(), v = b.body.linvel();
        m.set(b, [b.body.mass(), v.x, v.y, t.y]); }
      for (const d of w.debris) { if (!d.body) continue; const t = d.body.translation(), v = d.body.linvel();
        m.set(d, [d.body.mass(), v.x, v.y, t.y]); }
      const p = w.projectiles && w.projectiles[0];
      if (p && p.body) { const t = p.body.translation(), v = p.body.linvel(); m.set(p, [p.body.mass(), v.x, v.y, t.y]); }
      return m;
    };
    let prev = snap(), prevStats = st(), hitAt = -1;
    const rows = [];
    for (let n = 0; n < 300; n++) {
      SS.stepOnce();
      if (hitAt < 0 && window.__hit) hitAt = n;
      const cur = snap(), curStats = st();
      if (hitAt >= 0 && n - hitAt <= 120) {
        let dKE = 0, dPE = 0, cohort = 0;
        for (const [k, a] of cur) { const b = prev.get(k); if (!b) continue; cohort++;
          dKE += 0.5*a[0]*(a[1]*a[1]+a[2]*a[2]) - 0.5*b[0]*(b[1]*b[1]+b[2]*b[2]);
          dPE += b[0]*G*(b[3]-a[3]); }
        const ds = {};
        if (curStats && prevStats) for (const k of Object.keys(curStats)) {
          const d = curStats[k] - prevStats[k]; if (d) ds[k] = d;
        }
        rows.push([n - hitAt, +(dKE - dPE).toFixed(2), cohort, ds]);
      }
      prev = cur; prevStats = curStats;
    }
    return { statsAvailable: !!prevStats, rows };
  `);
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2h.json`, JSON.stringify(r, null, 2));
  console.log('statsAvailable', r.statsAvailable);
  for (const [k, e, c, ds] of r.rows) {
    if (Math.abs(e) > 1.5 || Object.keys(ds).length) console.log(`k=${k} extraJ=${e} cohort=${c} structureΔ=${JSON.stringify(ds)}`);
  }
};
