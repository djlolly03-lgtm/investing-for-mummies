export default async ({ game }) => {
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
  await game('return await SS.release();');
  const r = await game(`
    const w = SS.__world;
    const pool = w.fx.pools.spark4;
    const P = pool.p; let nan=0, live=0, minx=1e9, maxx=-1e9;
    for (let i=0;i<pool.max;i++){ if(P.life[i]>0){ live++; if(!isFinite(P.x[i])||!isFinite(P.y[i])) nan++; else {minx=Math.min(minx,P.x[i]);maxx=Math.max(maxx,P.x[i]);} } }
    return { live, nan, minx, maxx, pouch: w.sling.pouchPoint ? w.sling.pouchPoint() : null };`);
  console.log('### probe ' + JSON.stringify(r));
  console.log('### DONE');
};
