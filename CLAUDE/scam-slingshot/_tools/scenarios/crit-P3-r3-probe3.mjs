/**
 * crit-P3-r3-probe3.mjs — two questions the round-3 evidence left open:
 *   1. Can a STONE block be destroyed at all, by any reachable shot?
 *   2. Is the grey dust ball in the wood/glass break frames emitted by the BREAK,
 *      or is it the ammo hitting the ground? (control: a shot that hits nothing)
 */
export default async ({ game, state, shot, filmstrip }) => {
  const P = (k, v) => console.log('PROBE3 ' + k + ' ' + JSON.stringify(v));
  const FX = `const f=SS.__world.fx,o={}; for(const k of Object.keys(f.pools||{})) o[k]=f.pools[k].live|0; return o;`;

  // ── 1. stone breakability sweep
  const rows = [];
  for (const a of [0.10,0.16,0.22,0.28,0.34,0.40,0.46]) {
    for (const p of [0.80,0.90,1.00]) {
      await game('return await SS.loadLevel("_p3-stone");');
      await game('return SS.seed(4242);');
      const r = await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      if (!r.ok) continue;
      const w = await game(`
        let t=0, first=null, maxCrack=-1, maxDmg=0;
        while (t<3500){ await SS.seek(20); t+=20;
          for (const b of SS.__world.blocks) { if(!b.dead){ maxCrack=Math.max(maxCrack,b.crackStep); maxDmg=Math.max(maxDmg,b.damage); } }
          const s=await SS.state(); if(first===null&&s.debris>0){first=t;break;} }
        await SS.seek(2500); const s=await SS.state();
        return { first, blocks:s.blocks, debris:s.debris, score:s.score, maxCrack, maxDmg:+maxDmg.toFixed(3) };`);
      rows.push({ a, p, ...w });
    }
  }
  P('stone-sweep', rows);
  P('stone-any-debris', rows.some(r => r.debris > 0));

  // fire ALL FOUR ammo at the stone column, hardest hits, and see if it ever fragments
  await game('return await SS.loadLevel("_p3-stone");');
  await game('return SS.seed(4242);');
  const best = rows.filter(r=>r.maxDmg>0).sort((x,y)=>y.maxDmg-x.maxDmg)[0] || { a:0.22, p:0.8 };
  const four = [];
  for (let i = 0; i < 4; i++) {
    const r = await game('return SS.aimAndFire(args[0], args[1]);', best.a, best.p);
    if (!r.ok) { four.push({ i, ok:false, reason:r.reason }); break; }
    await game('await SS.seek(4000);');
    const s = await state();
    four.push({ i, blocks:s.blocks, debris:s.debris, score:s.score,
      crack: await game('return SS.__world.blocks.map(b=>({m:b.matName,c:b.crackStep,d:+b.damage.toFixed(2),broken:b.broken}));') });
  }
  P('stone-four-ammo', { shot: best, four });
  await shot('stone-after-4-hits');

  // ── 2. dust control: a shot that hits NOTHING but the ground
  await game('return await SS.loadLevel("_p3-wood");');
  await game('return SS.seed(4242);');
  const pre = await game('return SS.aimAndFire(0.16, 0.90);');   // measured miss
  P('miss-release', { ok: pre.ok });
  const missWalk = await game(`
    let t=0, rows=[];
    while (t<3000){ await SS.seek(20); t+=20;
      const f=SS.__world.fx,o={t}; for(const k of Object.keys(f.pools||{})) o[k]=f.pools[k].live|0;
      const s=await SS.state(); o.debris=s.debris; o.blocks=s.blocks; rows.push(o); }
    return rows.filter((r,i)=> i%5===0);`);
  P('miss-fx', missWalk.filter(r=>r.smoke>0 || r.t<400).slice(0,24));
  await shot('miss-ground-only');

  // ── 3. does a WOOD break emit smoke at all? measure smoke BEFORE vs AT the break
  await game('return await SS.loadLevel("_p3-wood");');
  await game('return SS.seed(4242);');
  await game('return SS.aimAndFire(0.22, 0.80);');
  const woodWalk = await game(`
    let t=0, rows=[];
    while (t<2200){ await SS.seek(20); t+=20;
      const f=SS.__world.fx,o={t}; for(const k of Object.keys(f.pools||{})) o[k]=f.pools[k].live|0;
      const s=await SS.state(); o.debris=s.debris; rows.push(o); }
    return rows;`);
  P('wood-fx-walk', woodWalk.filter(r => r.t>=820 && r.t<=1200));
  P('wood-fx-first-smoke', woodWalk.find(r=>r.smoke>0) || 'never');
  P('wood-fx-first-debris', woodWalk.find(r=>r.debris>0) || 'never');
};
