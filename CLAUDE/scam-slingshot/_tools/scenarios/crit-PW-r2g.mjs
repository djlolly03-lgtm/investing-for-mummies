/**
 * crit-PW-r2g.mjs — PW r2, part 7. ENERGY CREATION, on a FIXED COHORT.
 *
 * A ledger over `world.blocks` cannot prove energy is created, because the set changes: a
 * fracture removes a block's KE and PE from the sum (a negative jump) and its debris is never
 * added. So compute the step-to-step change over only the bodies present in BOTH consecutive
 * steps, tracked by identity, and add gravity's own budget for that step (sum of m*g*(-dy),
 * exactly the PE the cohort released) as the one legitimate source. Anything left over is
 * energy nothing in the world supplied.
 *
 *   dE_extra(k) = [KE(k+1) - KE(k)] - [PE(k) - PE(k+1)]     over the common cohort
 *
 * Contacts and damping can only make this negative. A positive value is created energy, in
 * joules, at a named millisecond.
 */
const G = 9.81 * 2.4;
export default async ({ game, OUT }) => {
  const runs = [];
  for (const [ang, pow] of [[0.30, 0.90], [0.26, 0.95], [0.24, 0.92], [0.34, 0.92]]) {
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
    const rel = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const r = await game(`
      const w = SS.__world, G = ${G};
      const snap = () => {
        const m = new Map();
        for (const b of w.blocks) { const t = b.body.translation(), v = b.body.linvel();
          m.set(b, [b.body.mass(), v.x, v.y, t.y, 'block', b.matName]); }
        for (const d of w.debris) { if (!d.body) continue; const t = d.body.translation(), v = d.body.linvel();
          m.set(d, [d.body.mass(), v.x, v.y, t.y, 'debris', d.matName]); }
        const p = w.projectiles && w.projectiles[0];
        if (p && p.body) { const t = p.body.translation(), v = p.body.linvel();
          m.set(p, [p.body.mass(), v.x, v.y, t.y, 'ammo', 'ammo']); }
        return m;
      };
      let prev = null, hitAt = -1;
      const jumps = [];
      let posSum = 0, negSum = 0, nSteps = 0;
      for (let n = 0; n < 480; n++) {
        SS.stepOnce();
        if (hitAt < 0 && window.__hit) hitAt = n;
        const cur = snap();
        if (prev && hitAt >= 0 && n - hitAt <= 240) {
          let dKE = 0, dPEreleased = 0, cohort = 0;
          for (const [k, a] of cur) {
            const b = prev.get(k); if (!b) continue;      // born this step -> not in cohort
            cohort++;
            dKE += 0.5 * a[0] * (a[1]*a[1] + a[2]*a[2]) - 0.5 * b[0] * (b[1]*b[1] + b[2]*b[2]);
            dPEreleased += b[0] * G * (b[3] - a[3]);
          }
          const extra = dKE - dPEreleased;
          nSteps++;
          if (extra > 0) posSum += extra; else negSum += extra;
          if (Math.abs(extra) > 2) jumps.push([n - hitAt, +extra.toFixed(2), cohort]);
        }
        prev = cur;
      }
      return { hit: window.__hit, jumps, posSum: +posSum.toFixed(1), negSum: +negSum.toFixed(1),
               nSteps, standing: w.blocks.length, debris: w.debris.length, score: (await SS.state()).score };
    `);
    runs.push({ angle: ang, power: pow,
                muzzleKE: +(0.5 * 0.6166 * rel.speed * rel.speed).toFixed(1),
                exitKE: +(0.5 * 0.6166 * rel.exitSpeed * rel.exitSpeed).toFixed(1), ...r });
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2g.json`, JSON.stringify(runs, null, 2));
  for (const r of runs) console.log(r.angle, r.power, 'hit', r.hit && r.hit.mat,
    '| created +', r.posSum, 'J  dissipated', r.negSum, 'J | shot KE cruise', r.muzzleKE, 'exit', r.exitKE,
    '| biggest jumps', JSON.stringify(r.jumps.filter(j => j[1] > 0).slice(0, 6)));
};
