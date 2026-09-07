/**
 * PW r3 CRITIC — validate the contact index against the game's OWN impact event, and watch the
 * structure pool's credit/spend ledger tick by tick to see whether the credit is caused by the
 * player's blow or by the layer's own writes.
 */
export default async ({ game, dragShot }) => {
  for (const [angle,power] of [[0.34,0.92],[0.32,0.94],[0.30,0.90]]) {
    await game(`SS.freeze(); await SS.seed(7); SS.freeze();`);
    await game(`
      const mod = await import('/scam-slingshot/src/level/structure.js');
      const bl  = await import('/scam-slingshot/src/level/blocks.js');
      window.__H = { hits: [], impacts: 0 };
      const proto = bl.Block.prototype;
      const oi = proto.onImpact;
      proto.onImpact = function (...a) {
        const src = a[0] && (a[0].source || a[0].src || a[0].other || a[0].from);
        window.__H.impacts++;
        window.__H.hits.push({ tick: SS.tick(), arg: JSON.stringify(a[0], (k,v)=> (v&&v.tag)?('ENT:'+v.tag):v ).slice(0,220) });
        return oi.apply(this, a);
      };
      return { patched: true };
    `);
    const drag = await dragShot(angle,power,{steps:6});
    await game(`return SS.release();`);
    const r = await game(`
      const mod = await import('/scam-slingshot/src/level/structure.js');
      const w = SS.__world;
      const dart = w.projectiles[0] && w.projectiles[0].body;
      const rows=[];
      for(let i=0;i<300;i++){
        SS.stepOnce();
        const v = (dart && dart.isValid()) ? dart.linvel() : null;
        rows.push({ i, t: Math.round(i*1000/120),
          dS: v ? +Math.hypot(v.x,v.y).toFixed(2) : null,
          credit:+ (mod.structure.stats.creditJ||0).toFixed(2),
          spent:+ (mod.structure.stats.spentJ||0).toFixed(2),
          pool:+ (mod.structure.pool||0).toFixed(2),
          hits: window.__H.impacts });
      }
      return { rows, hitLog: window.__H.hits.slice(0,6), stats: JSON.parse(JSON.stringify(mod.structure.stats)) };
    `);
    console.log(`\n===== ${angle}@${power} =====`);
    console.log('first 6 Block.onImpact events: ' + JSON.stringify(r.hitLog, null, 0).slice(0,900));
    console.log(' t(ms) dartSpeed  creditJ  spentJ   pool  impacts');
    let prevHits=0;
    for (const x of r.rows) {
      if (x.t % 50 === 0 || x.hits !== prevHits) {
        if (x.t % 50 === 0 || (x.hits!==prevHits && x.t<1400))
          console.log(`${String(x.t).padStart(6)} ${String(x.dS).padStart(9)} ${String(x.credit).padStart(8)} ${String(x.spent).padStart(7)} ${String(x.pool).padStart(6)} ${String(x.hits).padStart(8)}`);
      }
      prevHits = x.hits;
    }
    console.log('final stats: ' + JSON.stringify(r.stats));
  }
};
