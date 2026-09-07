/** Find the shot that best exercises the destruction: angle sweep, outcome per angle. */
export default async ({ game }) => {
  for (const a of [0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70]) {
    await game(`await SS.seed(7); await SS.seek(900); SS.aim({angle:${a},power:1.0}); SS.release();`);
    let firstBreak = null;
    for (let t = 0; t < 4000; t += 20) {
      const n = await game('await SS.seek(20); return SS.__world.debris.length;');
      if (n > 0 && firstBreak === null) firstBreak = t;
    }
    const r = await game(`
      const w = SS.__world;
      return { blocksLeft: w.blocks.length, debris: w.debris.length,
        villains: w.villains.filter(v=>v.alive).length, score: (await SS.state()).score };
    `);
    console.log(`angle=${a}  break@${firstBreak}ms  ${JSON.stringify(r)}`);
  }
};
