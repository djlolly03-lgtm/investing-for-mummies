/** Does a level-sequence in ONE page session reproduce? (fresh vs after another level) */
const L1 = `
  await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
  SS.aim({angle:0.30,power:1.0}); SS.release(); await SS.seek(4200);
  return { score: SS.state().score, phase: SS.state().phase, blocks: SS.__world.blocks.length,
           debris: SS.__world.debris.length, simTime: +SS.__world.simTime.toFixed(4) };`;
export default async ({ game }) => {
  console.log('### FRESH-A ' + JSON.stringify(await game(L1)));
  console.log('### FRESH-B ' + JSON.stringify(await game(L1)));
  await game(`await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.18,power:0.86}); SS.release(); await SS.seek(1700);`);
  console.log('### AFTER-PROBE ' + JSON.stringify(await game(L1)));
  console.log('### AGAIN ' + JSON.stringify(await game(L1)));
};
