/**
 * p1-r2b-band.mjs — WHERE IS THE WINNING DRAW BAND?
 *
 * `orch-solvable.mjs` only samples power 0.75 and 1.00. That grid is blind to any tuning whose
 * sweet spot sits between them, and it produced a flatly wrong conclusion this round ("0 wins
 * out of 14" for a config whose winning band was at 0.9). This one sweeps 4 angles x 5 powers
 * so the band's POSITION is visible, not just whether two arbitrary draws happen to land.
 *
 * The number that matters for feel is not "how many win" but WHICH DRAW wins: a game where the
 * working shot is a three-quarter pull is a game whose slingshot lies about its own range.
 */
export default async ({ game, state }) => {
  const ANG = [0.20, 0.30, 0.45, 0.60];
  const POW = [0.70, 0.80, 0.90, 1.00];
  const grid = {};
  for (const power of POW) {
    grid[power] = [];
    for (const angle of ANG) {
      await game('await SS.restart(); await SS.seed(3);');
      await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', angle, power);
      await game('await SS.seek(6000);');
      const s = await state();
      grid[power].push({ angle, killed: 2 - s.villainsAlive, score: s.score,
                         blocks: s.blocks, won: s.phase === 'won' });
    }
    const row = grid[power].map(r =>
      `${r.angle.toFixed(2)}:${r.won ? 'WIN' : r.killed ? `k${r.killed}` : r.score ? 'hit' : ' - '}`).join('  ');
    console.log(`  power ${power.toFixed(2)} | ${row}   scores ${grid[power].map(r => r.score).join('/')}`);
  }
  const tally = POW.map(p => `${p}: ${grid[p].filter(r => r.won).length} wins, ` +
    `${grid[p].filter(r => r.score > 0).length}/4 connected`);
  console.log('BAND: ' + tally.join(' | '));
};
