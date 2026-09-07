export default async ({ game, state }) => {
  const P = (k, v) => console.log('PROBE ' + k + ' ' + JSON.stringify(v));

  await game('return await SS.loadLevel("_p3-wood");');
  await game('return SS.seed(4242);');
  P('fx-pools', await game(`
    const f=SS.__world.fx; const o={};
    for (const k of Object.keys(f.pools||{})) { const p=f.pools[k];
      o[k] = { ctor: p&&p.constructor&&p.constructor.name, keys: p?Object.keys(p).slice(0,12):null }; }
    return o;`));

  // sweep for a shot that actually breaks the probe column
  const sweep = [];
  for (const a of [0.10,0.16,0.22,0.28,0.34,0.40]) {
    for (const p of [0.70,0.80,0.90,1.00]) {
      await game('return SS.seed(4242);');
      const r = await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      if (!r.ok) { sweep.push({a,p,ok:false}); continue; }
      const w = await game(`
        let t=0, first=null;
        while (t<4000){ await SS.seek(20); t+=20; const s=await SS.state(); if(first===null&&s.debris>0){first=t;break;} }
        await SS.seek(2500); const s=await SS.state();
        return { first, blocks:s.blocks, debris:s.debris, score:s.score };`);
      sweep.push({ a, p, ...w });
    }
  }
  P('wood-sweep', sweep.filter(s=>s.debris>0 || s.blocks<2));
  P('wood-sweep-all', sweep.map(s=>[s.a,s.p,s.first,s.blocks,s.debris]));
};
