/**
 * crit-P3-r5c.mjs — how hard does the PROJECTILE actually hit, and when does the first
 * fracture happen relative to that hit?
 *
 * Logs every ammo->block contact impulse (post SOURCE_SCALE) and every fracture, across an
 * l1 sweep, so "the projectile's own hit breaks nothing" is a number rather than an
 * impression. breakImpulse: glass 2.6, wood 9.5, stone 17.0 N.s.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__hits = []; window.__fx = [];
if (!B.__cPatched) {
  B.__cPatched = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2) {
      (window.__hits ||= []).push({ tick: SS.tick(), mat: this.matName, imp, app,
        thr: this.material.physics.breakImpulse, x: pt?.x, y: pt?.y });
    }
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) {
    const t0 = SS.tick();
    const kids = of.call(this, imp, pt);
    (window.__fx ||= []).push({ tick: t0, mat: this.matName, imp, kids: kids.length });
    return kids;
  };
}
return true;`;

export default async ({ game, state }) => {
  const L = (...a) => console.log(...a);
  const shots = [[0.20,1.0],[0.24,0.92],[0.26,0.95],[0.28,1.0],[0.30,0.90],[0.32,0.85],
                 [0.34,0.95],[0.36,1.00],[0.16,0.90],[0.12,0.85],[0.22,0.80],[0.40,0.90]];
  L('shot        fireTick  hits(ammo->block)                    1stFrac  frac  deb  blocksLeft  score');
  const rows = [];
  for (const [ang, pow] of shots) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    const t0 = await game('return SS.tick();');
    await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
    await game('await SS.seek(7000);');
    const d = await game('return { hits: window.__hits, fx: window.__fx, blocks: SS.__world.blocks.filter(b=>!b.dead).length, deb: SS.__world.debris.filter(x=>!x.dead).length, st: await SS.state() };');
    const hits = d.hits.map(h => `${h.mat[0]}${h.imp.toFixed(1)}/${h.thr}`).join(' ');
    const maxByMat = {};
    for (const h of d.hits) maxByMat[h.mat] = Math.max(maxByMat[h.mat] ?? 0, h.imp);
    const firstHitTick = d.hits[0]?.tick, firstFrac = d.fx[0]?.tick;
    const gapMs = (firstHitTick != null && firstFrac != null) ? Math.round((firstFrac - firstHitTick) * 1000 / 120) : null;
    rows.push({ ang, pow, hits: d.hits.length, maxByMat, gapMs, frac: d.fx.length,
      deb: d.deb, blocks: d.blocks, score: d.st.score, stars: d.st.stars, phase: d.st.phase });
    L(`${ang}@${pow}  hits=${String(d.hits.length).padStart(2)} [${hits}]  hit->frac ${gapMs == null ? '   -' : String(gapMs).padStart(5)+'ms'}  frac=${d.fx.length} deb=${String(d.deb).padStart(2)} left=${d.blocks} score=${d.st.score} ${d.st.phase}`);
  }
  L('\n--- ammo peak impulse vs material break threshold (glass 2.6 / wood 9.5 / stone 17.0) ---');
  const peak = {};
  for (const r of rows) for (const k in r.maxByMat) peak[k] = Math.max(peak[k] ?? 0, r.maxByMat[k]);
  L(JSON.stringify(peak));
  L(`\nBEST DESTRUCTION SHOT (most fractures): ${JSON.stringify(rows.slice().sort((a,b)=>b.frac-a.frac)[0])}`);
  L(`Shots where the projectile's OWN hit exceeded the material threshold: ` +
    rows.filter(r => Object.entries(r.maxByMat).some(([m, v]) => v >= ({glass:2.6,wood:9.5,stone:17})[m])).length + ` / ${rows.length}`);
};
