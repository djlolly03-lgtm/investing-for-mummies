/**
 * crit-P3-r3-probe4.mjs
 *  1. STONE destruction, captured (the r3 pack's stone shot did not break it).
 *  2. Where is the smoke ACTUALLY emitted? Read the smoke pool's instance matrices and
 *     compare them with the projectile position and the break position, over time.
 */
const SMOKE_POS = `
  const f = SS.__world.fx, p = f.pools.smoke, out = [];
  const arr = p.mesh.instanceMatrix.array, n = p.mesh.count;
  for (let i = 0; i < n; i++) out.push({ x:+arr[i*16+12].toFixed(2), y:+arr[i*16+13].toFixed(2),
                                         s:+Math.hypot(arr[i*16],arr[i*16+1],arr[i*16+2]).toFixed(2) });
  const w = SS.__world, pr = (w.projectiles||[])[0];
  return { live:p.live, count:n, inst: out.filter(o=>o.s>0.01),
           proj: pr && !pr.dead ? { x:+pr.body.translation().x.toFixed(2), y:+pr.body.translation().y.toFixed(2) } : null };`;

export default async ({ game, state, shot, filmstrip }) => {
  const P = (k, v) => console.log('PROBE4 ' + k + ' ' + JSON.stringify(v));

  // ── 1. STONE destruction, wide + locked
  await game('return await SS.loadLevel("_p3-stone");');
  await game('return SS.seed(4242);');
  await game('return SS.aimAndFire(0.40, 0.80);');
  const t1 = await game(`let t=0; while(t<3000){ await SS.seek(20); t+=20; const s=await SS.state(); if(s.debris>0) return t; } return null;`);
  P('stone-break-at', t1);
  await game('await SS.seek(60);');
  await shot('stone-break-gameframing');
  P('stone-fx', await game(`const f=SS.__world.fx,o={}; for(const k of Object.keys(f.pools)) o[k]=f.pools[k].live|0; return o;`));
  P('stone-debris', await game(`return (SS.__world.debris||[]).filter(d=>!d.dead).map(d=>({m:d.matName,w:+d.w.toFixed(2),h:+d.h.toFixed(2)}));`));

  await game('return await SS.loadLevel("_p3-stone");');
  await game('return SS.seed(4242);');
  await game('return SS.aimAndFire(0.40, 0.80);');
  await game(`let t=0; while(t<3000){ await SS.seek(20); t+=20; const s=await SS.state(); if(s.debris>0) break; }`);
  await game('SS.camLock({ x: 18, y: 2.0, halfWidth: 3.2 });');
  await game('await SS.seek(60);');
  await shot('stone-LOCKED-impact+60');
  await filmstrip('stone-LOCKED-break', { from: 0, to: 400, step: 50, cols: 3 });
  await game('await SS.seek(2600);');
  await shot('stone-LOCKED-settled');
  await game('SS.camUnlock();');

  // ── 2. smoke provenance on l1
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('return SS.aimAndFire(0.30, 0.90);');
  const track = [];
  for (const t of [100, 300, 500, 700, 740, 900, 1100, 1400, 1800]) {
    await game('await SS.seek(args[0]);', t - (track.length ? track[track.length-1].t : 0));
    track.push({ t, ...(await game(SMOKE_POS)) });
  }
  P('l1-smoke-track', track);
};
