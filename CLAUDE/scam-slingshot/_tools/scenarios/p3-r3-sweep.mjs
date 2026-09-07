/** Find an angle/power that actually SHATTERS the probe glass column. Numbers only. */
export default async ({ game }) => {
  const rows = [];
  for (const a of [0.10, 0.14, 0.18, 0.22, 0.26, 0.30, 0.36, 0.44]) {
    for (const p of [0.72, 0.86, 1.0]) {
      const r = await game(`
        await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
        SS.aim({angle:args[0],power:args[1]}); SS.release();
        let firstDebris = -1, t = 0;
        for (; t < 3000; t += 10) {
          await SS.seek(10);
          if (firstDebris < 0 && SS.__world.debris.length > 0) { firstDebris = t; break; }
        }
        return { a: args[0], p: args[1], firstDebris,
                 debris: SS.__world.debris.length, blocks: SS.__world.blocks.length };
      `, a, p);
      rows.push(r);
      console.log('### ' + JSON.stringify(r));
    }
  }
  console.log('### BEST ' + JSON.stringify(rows.filter(r => r.firstDebris >= 0)));
};
