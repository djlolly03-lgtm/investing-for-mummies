/** Find a shot sequence that actually clears l1, so final.mjs's "4. win" stops being a claim. */
export default async ({ game, state }) => {
  // Where does a single shot LAND, and what does it do? Sweep angle x power.
  const singles = [];
  for (const a of [0.20, 0.30, 0.36, 0.44, 0.52, 0.62, 0.75])
    for (const p of [0.70, 0.80, 0.90, 1.00]) {
      await game('await SS.seed(3); await SS.seek(1400);');
      await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', a, p);
      for (let k = 0; k < 16; k++) {
        await game('await SS.seek(500);');
        const s2 = await state();
        if (s2.phase !== 'flying' && s2.phase !== 'settling') break;
      }
      const f = await state();
      singles.push({ a, p, score: f.score, villains: f.villainsAlive, blocks: f.blocks });
    }
  singles.sort((x, y) => y.score - x.score);
  console.log('  best single shots:', JSON.stringify(singles.slice(0, 8)));

  // Greedy: repeat the best single shot four times, and also try the top-3 as an opener.
  for (const opener of singles.slice(0, 3)) {
    for (const follow of singles.slice(0, 3)) {
      await game('await SS.seed(3); await SS.seek(1400);');
      for (let shot = 0; shot < 4; shot++) {
        const s = await state();
        if (s.phase !== 'aiming') break;
        const cfg = shot === 0 ? opener : follow;
        await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', cfg.a, cfg.p);
        for (let k = 0; k < 16; k++) {
          await game('await SS.seek(500);');
          const s2 = await state();
          if (s2.phase !== 'flying' && s2.phase !== 'settling') break;
        }
      }
      const f = await state();
      console.log(`   opener(${opener.a},${opener.p}) then(${follow.a},${follow.p}) ->`,
        JSON.stringify({ phase: f.phase, score: f.score, villains: f.villainsAlive, ammoLeft: f.ammoLeft }));
    }
  }
};
