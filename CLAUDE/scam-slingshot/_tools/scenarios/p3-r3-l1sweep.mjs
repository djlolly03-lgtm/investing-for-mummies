/** l1 shot map from a FRESH page each time — is the level still winnable, and which shots land? */
export default async ({ game }) => {
  for (const a of [0.14, 0.20, 0.24, 0.28, 0.30, 0.34, 0.40]) {
    for (const p of [0.86, 1.0]) {
      const r = await game(`
        await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
        SS.aim({angle:args[0],power:args[1]}); SS.release(); await SS.seek(5000);
        const s = SS.state();
        return { a: args[0], p: args[1], score: s.score, phase: s.phase,
                 blocks: SS.__world.blocks.length, debris: SS.__world.debris.length,
                 alive: s.villainsAlive };`, a, p);
      console.log('### ' + JSON.stringify(r));
    }
  }
};
