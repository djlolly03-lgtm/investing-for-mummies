/**
 * P2 — is l1 still winnable, and at what cost, after the range retune?
 * Plays real 4-ammo runs through the deterministic aim hook, several plans, several seeds.
 * A plan is a list of [angle, power]; the run stops early if the level resolves.
 */
const PLANS = [
  ['tower-then-outpost', [[0.40, 0.60], [0.48, 1.00], [0.44, 0.60], [0.56, 1.00]]],
  ['outpost-then-tower', [[0.48, 1.00], [0.40, 0.60], [0.66, 1.00], [0.56, 0.60]]],
  ['all-full-power',     [[0.48, 1.00], [0.32, 1.00], [0.66, 1.00], [0.24, 1.00]]],
  ['all-mid-power',      [[0.40, 0.80], [0.56, 0.80], [0.32, 0.80], [0.48, 0.80]]],
];
export default async ({ game, state }) => {
  const out = [];
  for (const seed of [1, 3, 7]) {
    for (const [name, plan] of PLANS) {
      await game('await SS.restart(); await SS.seed(args[0]);', seed);
      let fired = 0;
      for (const [a, p] of plan) {
        const st = await state();
        if (st.phase === 'won' || st.phase === 'lost' || st.ammoLeft === 0) break;
        await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', a, p);
        await game('await SS.seek(5000);');
        fired++;
      }
      const f = await state();
      out.push({ seed, name, fired, phase: f.phase, score: f.score, stars: f.stars,
                 alive: f.villainsAlive, blocksLeft: f.blocks });
    }
  }
  console.log('\n#### P2 WINNABILITY');
  for (const r of out) {
    console.log(` seed ${r.seed}  ${r.name.padEnd(20)} shots ${r.fired}  ${String(r.phase).padEnd(8)}` +
      ` score ${String(r.score).padStart(6)}  stars ${r.stars}  villainsAlive ${r.alive}  blocks ${r.blocksLeft}`);
  }
  const won = out.filter(r => r.phase === 'won').length;
  console.log(`\nWON ${won} / ${out.length} runs.  ` +
    (won ? 'VERDICT: l1 IS WINNABLE' : 'VERDICT: l1 NOT WON by any plan'));
};
