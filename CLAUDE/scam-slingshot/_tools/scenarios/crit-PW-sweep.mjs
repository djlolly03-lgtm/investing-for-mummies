/**
 * PW r1 critic — is "stone shatters when it lands" reachable in normal l1 play?
 * 10 plausible shots x 1 ammo each, fresh seeded level per shot, 6 s settle.
 * Records every fracture with its source, plus a per-material census of what survives.
 */
export default async ({ game }) => {
  const SHOTS = [[0.20,1.0],[0.24,0.95],[0.28,1.0],[0.30,0.90],[0.32,0.95],
                 [0.36,1.0],[0.40,0.85],[0.44,1.0],[0.26,0.80],[0.34,0.92]];
  const rows = [];
  for (const [a,p] of SHOTS) {
    const r = await game(`
      const [a,p] = args;
      SS.freeze(); await SS.loadLevel('l1'); await SS.seed(9001);
      const w = SS.__world;
      const kills = [];
      const proto = Object.getPrototypeOf(w.blocks[0]);
      const orig = proto.onImpact;
      proto.onImpact = function (impulse, other, point, approach = 0) {
        const was = this.broken;
        const r = orig.call(this, impulse, other, point, approach);
        if (!was && this.broken) kills.push({ m:this.matName, src: other?.tag ?? 'ground',
          raw:+impulse.toFixed(2), t:+(w.simTime*1000).toFixed(0),
          y:+(point?.y ?? -1).toFixed(2) });
        return r;
      };
      SS.aim({ angle:a, power:p }); SS.release();
      for (let i=0;i<48;i++) await SS.seek(125);      // 6 s
      proto.onImpact = orig;
      const census = {};
      for (const b of w.blocks) census[b.matName] = (census[b.matName]||0)+1;
      return { a, p, kills, census, st: await SS.state() };
    `, a, p);
    rows.push(r);
    const stoneGround = r.kills.filter(k=>k.m==='stone' && k.src==='ground');
    const stoneAny = r.kills.filter(k=>k.m==='stone');
    console.log(`${a}@${p}  score ${String(r.st.score).padStart(6)} villains ${r.st.villainsAlive} ` +
      `broke ${r.kills.length} | stone broken ${stoneAny.length} (by ground: ${stoneGround.length}) ` +
      `| standing ${JSON.stringify(r.census)}`);
    if (stoneAny.length) console.log('     stone kills: ' + JSON.stringify(stoneAny));
  }
  const allKills = rows.flatMap(r=>r.kills);
  const by = {};
  for (const k of allKills) { const key = k.m+'<-'+k.src; by[key]=(by[key]||0)+1; }
  console.log('\nKILLER CENSUS over 10 shots: ' + JSON.stringify(by));
  const g = allKills.filter(k=>k.src==='ground');
  console.log(`GROUND kills: ${g.length} of ${allKills.length} — ` + JSON.stringify(g.map(k=>k.m+':'+k.raw)));
};
