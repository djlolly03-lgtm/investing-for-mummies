/**
 * PW r3 CRITIC — is the authored shove delivered INTO A WORLD THAT HAS ALREADY STOPPED?
 * Tracks cohort max/mean speed, count of bodies above 0.2 m/s, asleep count, and the
 * structure pool's spend, on the same solver clock.
 */
export default async ({ game, dragShot, filmstrip }) => {
  for (const [angle,power] of [[0.34,0.92],[0.32,0.94],[0.30,0.90],[0.28,0.92]]) {
    await game(`SS.freeze(); await SS.seed(7); SS.freeze();`);
    await dragShot(angle,power,{steps:6});
    await game(`return SS.release();`);
    const r = await game(`
      const mod = await import('/scam-slingshot/src/level/structure.js');
      const w = SS.__world, ph = SS.__physics;
      const cohort = w.entities.filter(e=>e.body && !e.dead && e.body.isDynamic() && e.tag!=='ammo');
      const rows=[];
      for(let i=0;i<330;i++){
        SS.stepOnce();
        let vmax=0,sum=0,n=0,fast=0,asleep=0;
        for(const e of cohort){ if(e.dead||!e.body) continue;
          try{ if(!e.body.isValid())continue; const v=e.body.linvel();
            const s=Math.hypot(v.x,v.y); if(s>vmax)vmax=s; sum+=s; n++;
            if(s>0.20)fast++; if(e.body.isSleeping())asleep++;}catch(_){}}
        rows.push({t:Math.round(i*1000/120), vmax:+vmax.toFixed(3), vmean:+(n?sum/n:0).toFixed(3),
          fast, alive:n, asleep, spent:+(mod.structure.stats.spentJ||0).toFixed(2),
          racks:mod.structure.stats.racks, detached:mod.structure.stats.detached,
          credit:+(mod.structure.stats.creditJ||0).toFixed(2)});
      }
      return { rows, stats: JSON.parse(JSON.stringify(mod.structure.stats)), st: await SS.state() };
    `);
    // impact = first row where vmax > 0.3
    const c = r.rows.findIndex(x=>x.vmax>0.30);
    const firstSpend = r.rows.findIndex(x=>x.spent>0.001);
    // quiet window between impact and first spend
    const quiet = r.rows.slice(c, firstSpend<0?r.rows.length:firstSpend);
    const preSpend = firstSpend>0 ? r.rows[firstSpend-1] : null;
    console.log(`\n===== ${angle}@${power} =====`);
    console.log(`impact @ ${r.rows[c].t} ms | first authored spend @ ${firstSpend<0?'never':r.rows[firstSpend].t+' ms'}  => delay ${firstSpend<0?'-':(r.rows[firstSpend].t-r.rows[c].t)} ms`);
    if (preSpend) console.log(`state ONE STEP BEFORE the first authored write: vmax ${preSpend.vmax} m/s, vmean ${preSpend.vmean}, bodies>0.2m/s ${preSpend.fast}/${preSpend.alive}, asleep ${preSpend.asleep}/${preSpend.alive}`);
    console.log('   t   vmax  vmean fast/alive asleep  spentJ racks det');
    for (const x of r.rows) if (x.t % 50 === 0 || (firstSpend>0 && Math.abs(x.t-r.rows[firstSpend].t)<30))
      console.log(`${String(x.t).padStart(5)} ${String(x.vmax).padStart(6)} ${String(x.vmean).padStart(6)}  ${String(x.fast).padStart(2)}/${String(x.alive).padStart(2)}    ${String(x.asleep).padStart(2)}   ${String(x.spent).padStart(6)} ${String(x.racks).padStart(4)} ${String(x.detached).padStart(3)}`);
    console.log('stats ' + JSON.stringify(r.stats) + ' | ' + JSON.stringify({phase:r.st.phase,score:r.st.score,blocks:r.st.blocks,debris:r.st.debris}));
  }
};
