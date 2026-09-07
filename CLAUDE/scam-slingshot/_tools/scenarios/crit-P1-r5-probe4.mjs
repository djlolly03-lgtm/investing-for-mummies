export default async ({ game, dragShot }) => {
  const rows = [];
  const q = () => game(`
    const w=SS.__world, s=w.sling;
    const a = s.ammo || (w.projectiles||[])[0];
    const am = a && a.mesh ? a.mesh.position : null;
    // fx particle census, world space, if the fx system exposes one
    let fx = null;
    try {
      const f = w.fx;
      if (f) {
        const keys = Object.keys(f);
        const pools = [];
        for (const k of keys) { const v=f[k];
          if (Array.isArray(v) && v.length && v[0] && (v[0].position || v[0].p)) pools.push({k, n:v.length}); }
        fx = { keys, pools };
      }
    } catch(e) { fx = 'err '+e.message; }
    return { tick: SS.tick(), simTime:+(w.simTime||0).toFixed(4),
      pouch:{x:+s.pouch.x.toFixed(4),y:+s.pouch.y.toFixed(4)}, drawn:+s.drawn.toFixed(4),
      st:s.state, recoilT:+s.recoilT.toFixed(4),
      ammo: am? {x:+am.x.toFixed(4), y:+am.y.toFixed(4)} : null,
      vel: a && a.body ? (()=>{const v=a.body.linvel(); return {x:+v.x.toFixed(3),y:+v.y.toFixed(3), sp:+Math.hypot(v.x,v.y).toFixed(3)};})() : null,
      fx };
  `);
  await game('SS.seed(2025); await SS.seek(1200);');
  await dragShot(0.30, 0.95, {steps:12});
  rows.push({t:'pre', ...await q()});
  const rel = await game('return SS.release();');
  console.log('REL', JSON.stringify(rel));
  rows.push({t:0, ...await q()});
  let t=0;
  for (const dt of [8,8,9,8,17,17,17,16,25,25,25,25,50,50,50,50,50,50,50,100,100,100,100]) {
    await game('await SS.seek(args[0]);', dt); t+=dt;
    rows.push({t, ...await q()});
  }
  console.log('LADDER');
  for (const r of rows) console.log(JSON.stringify(r));
};
