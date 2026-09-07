/** P3 critic probe — discover API surface + find the shot that best exercises destruction. */
export default async ({ game }) => {
  const api = await game(`
    const w = SS.__world;
    return {
      ssKeys: Object.keys(SS),
      worldKeys: Object.keys(w),
      rigKeys: w.rig ? Object.keys(w.rig) : null,
      fxKeys: w.fx ? Object.keys(w.fx) : null,
      blockSample: w.blocks[0] ? Object.keys(w.blocks[0]) : null,
      block0: w.blocks[0] ? { mat: w.blocks[0].matName, hw: w.blocks[0].hw, hh: w.blocks[0].hh,
                              w: w.blocks[0].w, h: w.blocks[0].h } : null,
      nBlocks: w.blocks.length, nVillains: w.villains.length,
    };
  `);
  console.log('API:', JSON.stringify(api, null, 1));

  // angle sweep on l1
  for (const a of [0.24, 0.30, 0.36, 0.42, 0.50, 0.58, 0.66]) {
    await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
                SS.aim({angle:${a},power:1.0}); SS.release();`);
    let firstBreak = null;
    for (let t = 0; t < 3600; t += 20) {
      const n = await game('await SS.seek(20); return SS.__world.debris.length;');
      if (n > 0 && firstBreak === null) firstBreak = t;
    }
    const r = await game(`
      const w = SS.__world;
      const by = {}; for (const d of w.debris) by[d.matName ?? d.mat ?? '?'] = (by[d.matName ?? d.mat ?? '?']||0)+1;
      return { blocksLeft: w.blocks.length, debris: w.debris.length, by,
               villains: w.villains.filter(v=>v.alive).length, score: (await SS.state()).score };
    `);
    console.log(`angle=${a} break@${firstBreak}ms ${JSON.stringify(r)}`);
  }
};
