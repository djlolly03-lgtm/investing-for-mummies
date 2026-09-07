/** When does the shot actually hit? Feeds motion.mjs's filmstrip window. */
export default async ({ game, state }) => {
  for (const [a, p] of [[0.58, 1.0], [0.30, 0.90], [0.36, 0.80]]) {
    await game('await SS.seed(3); await SS.seek(1400);');
    await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', a, p);
    const marks = [];
    let firstDebris = null;
    for (let t = 0; t <= 3000; t += 40) {
      const s = await state();
      if (firstDebris === null && s.debris > 0) firstDebris = t;
      if (t % 400 === 0) marks.push({ t, blocks: s.blocks, debris: s.debris, score: s.score, phase: s.phase });
      await game('await SS.seek(40);');
    }
    const f = await state();
    console.log(`  aim(${a}, ${p}) firstDebrisMs=${firstDebris}`,
      JSON.stringify({ endBlocks: f.blocks, endDebris: f.debris, score: f.score, villains: f.villainsAlive }));
    console.log('    ', JSON.stringify(marks));
  }
};
