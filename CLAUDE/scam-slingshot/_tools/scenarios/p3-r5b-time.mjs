/**
 * p3-r5b-time.mjs — WHEN does the ground floor react, measured from the TRUE first hit?
 *
 * The r5 gate walks forward in 20 ms slices until "a block moves > 0.5 m/s or debris exists",
 * which can trip on a graze long before the shot lands. This probe instead records the tick of
 * the first onImpact whose source is the projectile, and then samples the six load-bearing
 * members every 100 ms from that instant.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
if (!B.__tpatched) {
  B.__tpatched = true;
  const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__firstHit == null) window.__firstHit = SS.tick();
    return oi.call(this, imp, other, pt, app);
  };
}
return true;`;

const FRAME = [
  ['botBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y, a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

export default async ({ game }) => {
  for (const [ang, pow] of [[0.26, 0.95], [0.24, 0.92], [0.30, 0.90], [0.36, 1.00]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__firstHit = null;');
    const base = await game(SNAP);
    const byId = new Map(base.map(b => [b.id, b]));
    const idOf = (fx, fy) => (base.find(b => Math.hypot(b.x - fx, b.y - fy) < 0.25) ?? {}).id;
    const fids = FRAME.map(([n, fx, fy]) => [n, idOf(fx, fy)]);

    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    let t = 0, hitTick = null;
    while (t < 4000) { await game('await SS.seek(20);'); t += 20;
      hitTick = await game('return window.__firstHit;'); if (hitTick != null) break; }
    console.log(`\n=== ${ang}@${pow}  first projectile hit at fire+${t}ms`);
    let seen = 0;
    for (const at of [0, 200, 400, 600, 800, 1200, 1600, 2400]) {
      if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
      const now = await game(SNAP);
      const live = new Map(now.map(b => [b.id, b]));
      const cells = fids.map(([n, id]) => {
        const cur = live.get(id); if (!cur) return `${n}:GONE`;
        const b0 = byId.get(id);
        const d = Math.hypot(cur.x - b0.x, cur.y - b0.y), da = Math.abs(cur.a - b0.a);
        return `${n} ${d.toFixed(2)}/${da.toFixed(2)}`;
      });
      let moved = 0;
      for (const b of now) { const b0 = byId.get(b.id); if (!b0) continue;
        if (Math.abs(b.a - b0.a) >= 0.15 || Math.hypot(b.x - b0.x, b.y - b0.y) >= 0.3) moved++; }
      console.log(` hit+${String(at).padStart(4)}ms  alive=${now.length} MOVED=${moved}  ${cells.join(' | ')}`);
    }
  }
};
