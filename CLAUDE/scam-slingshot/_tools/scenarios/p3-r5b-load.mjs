/** p3-r5b-load.mjs — why does the rack not fire on the two stubborn shots? */
export default async ({ game }) => {
  for (const [ang, pow] of [[0.26, 0.95], [0.36, 1.00], [0.30, 0.90]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game('window.__fh=null; const B=SS.__world.blocks[0].constructor.prototype; if(!B.__lp){B.__lp=1; const oi=B.onImpact; B.onImpact=function(i,o,p,a){ if(o?.tag==="ammo"&&a>=1.2&&window.__fh==null) window.__fh=1; return oi.call(this,i,o,p,a);};} return 1;');
    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    let t = 0;
    while (t < 4000) { await game('await SS.seek(20);'); t += 20;
      if (await game('return window.__fh;')) break; }
    console.log(`\n=== ${ang}@${pow} hit at ${t}ms`);
    let seen = 0;
    for (const at of [100, 300, 600, 900, 1400]) {
      await game('await SS.seek(args[0]);', at - seen); seen = at;
      const r = await game('return SS.__structure();');
      console.log(` hit+${at}ms armed=${r.armed} racks=${r.racks} tips=${r.tips} hinges=${r.hinges} detached=${r.detached} audits=${r.audits} collapses=${r.collapses}`);
      for (const n of r.nodes.filter(n => n.beam || n.col)) {
        console.log(`   ${n.m.padEnd(5)} (${n.x},${n.y}) ${n.col?'COL ':'BEAM'} car=${n.carried}/${n.carried0} rf=${n.rackedFrac} rel=${n.released?'Y':'.'} det=${n.detached?'Y':'.'} below=${n.below} above=${n.above}`);
      }
    }
  }
};
