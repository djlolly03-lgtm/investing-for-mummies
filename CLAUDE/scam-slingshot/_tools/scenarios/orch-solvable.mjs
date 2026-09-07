/** Orchestrator probe: is l1 still winnable after the piece-builders' balance changes?
 *  Sweeps angle x power via the deterministic aim hook, one fresh shot each. */
export default async ({ game, state, shot }) => {
  const results = [];
  for (const angle of [0.20, 0.28, 0.36, 0.44, 0.52, 0.62, 0.75]) {
    for (const power of [0.75, 1.0]) {
      await game('await SS.restart(); await SS.seed(3);');
      await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', angle, power);
      await game('await SS.seek(6000);');
      const s = await state();
      results.push({ angle, power, killed: 2 - s.villainsAlive, score: s.score,
                     blocksLeft: s.blocks, phase: s.phase });
    }
  }
  const best = results.reduce((a, b) => (b.killed > a.killed || (b.killed === a.killed && b.score > a.score)) ? b : a);
  console.log('SWEEP:', JSON.stringify(results));
  console.log('BEST SINGLE SHOT:', JSON.stringify(best));

  // can a full 4-ammo run actually clear it?
  await game('await SS.restart(); await SS.seed(3);');
  let fired = 0;
  for (const a of [best.angle, best.angle + 0.06, best.angle - 0.06, best.angle + 0.12]) {
    const st = await state();
    if (st.phase === 'won' || st.ammoLeft === 0) break;
    // best.power, NOT a hard-coded 1.0. This used to find the best shot at one power and then
    // fire four shots at another, so the run reported "NOT WON" for a level the sweep two lines
    // above had just cleared in a single shot.
    await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', a, best.power);
    await game('await SS.seek(5000);');
    fired++;
  }
  const fin = await state();
  console.log('FULL RUN:', JSON.stringify({ fired, phase: fin.phase, score: fin.score,
              stars: fin.stars, villainsAlive: fin.villainsAlive }));
  console.log(fin.phase === 'won' ? 'VERDICT: l1 IS WINNABLE' : 'VERDICT: l1 NOT WON in 4 shots');
  await shot('after-full-run');
};
