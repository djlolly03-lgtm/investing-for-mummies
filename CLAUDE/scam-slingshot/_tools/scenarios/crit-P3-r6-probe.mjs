/** CRIT P3 r6 — find a shot that actually hits the single-column probe levels. */
export default async ({ game, OUT }) => {
  const rows = [];
  for (const a of [0.10, 0.16, 0.22, 0.28, 0.34, 0.40]) {
    for (const p of [0.55, 0.65, 0.75, 0.85]) {
      await game('await SS.loadLevel("_p3-wood"); SS.seed(7); await SS.seek(900);');
      await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      await game('await SS.seek(3500);');
      const r = await game(`
        const w = SS.__world;
        return { debris: w.debris.length, standing: w.blocks.filter(b=>!b.broken).length,
                 ammoX: w.projectiles[0] ? +w.projectiles[0].body.translation().x.toFixed(2) : null };
      `);
      rows.push({ a, p, ...r });
    }
  }
  console.log('angle power debris standing ammoX');
  for (const r of rows) console.log(r.a.toFixed(2), r.p.toFixed(2), r.debris, r.standing, r.ammoX);
};
