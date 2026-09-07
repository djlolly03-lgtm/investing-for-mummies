/** crit-PW-r2j.mjs — PW r2: NOISE FLOOR for the fixed-cohort energy estimator.
 *  Same estimator, same level, but no shot: 240 steps of an untouched settled l1, and 240
 *  steps of the same l1 while the dart is in FLIGHT but has not landed. If the estimator
 *  reads ~0 there, a +37.6 J single-step reading during a collapse is not estimator noise. */
const G = 9.81 * 2.4;
const AUDIT = `
  const w = SS.__world, G = ${G};
  const snap = () => { const m = new Map();
    for (const b of w.blocks) { const t=b.body.translation(), v=b.body.linvel(); m.set(b,[b.body.mass(),v.x,v.y,t.y]); }
    for (const d of w.debris) { if(!d.body) continue; const t=d.body.translation(), v=d.body.linvel(); m.set(d,[d.body.mass(),v.x,v.y,t.y]); }
    const p = w.projectiles && w.projectiles[0];
    if (p && p.body) { const t=p.body.translation(), v=p.body.linvel(); m.set(p,[p.body.mass(),v.x,v.y,t.y]); }
    return m; };
  let prev = snap(); let pos = 0, neg = 0, mx = 0;
  for (let n = 0; n < args[0]; n++) {
    SS.stepOnce();
    const cur = snap(); let dKE = 0, dPE = 0;
    for (const [k,a] of cur) { const b = prev.get(k); if(!b) continue;
      dKE += 0.5*a[0]*(a[1]*a[1]+a[2]*a[2]) - 0.5*b[0]*(b[1]*b[1]+b[2]*b[2]);
      dPE += b[0]*G*(b[3]-a[3]); }
    const e = dKE - dPE; if (e > 0) { pos += e; mx = Math.max(mx, e); } else neg += e;
    prev = cur;
  }
  return { created: +pos.toFixed(2), dissipated: +neg.toFixed(2), biggestSingleStep: +mx.toFixed(2) };
`;
export default async ({ game, OUT }) => {
  const R = {};
  await game(`SS.freeze();`); await game(`await SS.loadLevel('l1');`); await game(`await SS.seed(4242);`);
  R.idle = await game(AUDIT, 240);
  await game(`SS.freeze();`); await game(`await SS.loadLevel('l1');`); await game(`await SS.seed(4242);`);
  await game(`return SS.aimAndFire(0.30, 0.90);`);
  R.inFlight = await game(AUDIT, 45);           // before the dart lands (contact at step ~55)
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2j.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R));
};
