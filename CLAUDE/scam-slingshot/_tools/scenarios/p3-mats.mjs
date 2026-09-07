/** Find the shot that breaks each single-column probe level. */
export default async ({ game }) => {
  for (const lvl of ['_p3-wood', '_p3-glass', '_p3-stone']) {
    for (const a of [0.20, 0.24, 0.28, 0.32]) {
      await game(`await SS.loadLevel('${lvl}'); await SS.seed(5); await SS.seek(900);
                  SS.aim({angle:${a},power:1.0}); SS.release();`);
      for (let t = 0; t < 2400; t += 40) await game('await SS.seek(40);');
      const r = await game(`
        const w = SS.__world;
        const by = {}; for (const d of w.debris) by[d.matName] = (by[d.matName]||0)+1;
        return { by, blocksLeft: w.blocks.length };
      `);
      console.log(`${lvl} angle=${a}`, JSON.stringify(r));
    }
  }
};
