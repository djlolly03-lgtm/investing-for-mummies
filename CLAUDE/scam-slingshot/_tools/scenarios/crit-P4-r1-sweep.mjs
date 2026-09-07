/** find a shot that actually lands on the tower, for the P4 lead/settle tests */
export default async ({ game, state }) => {
  for (const [a, p] of [[0.18, 1], [0.22, 1], [0.26, 1], [0.30, 1], [0.34, 1], [0.40, 1], [0.46, 1], [0.52, 1], [0.60, 0.8], [0.70, 0.75]]) {
    await game('await SS.seed(3); await SS.seek(2600); SS.aim({angle:args[0],power:args[1]}); await SS.seek(300); SS.release(); await SS.seek(6000);', a, p);
    const s = await state();
    const first = await game(`
      // where did it first touch something? report min distance the projectile got to the tower centre
      return { blocksAlive: SS.__world.blocks.filter(b=>!b.dead).length, debris: SS.__world.debris.length };`);
    console.log(a, p, JSON.stringify({ villains: s.villainsAlive, score: s.score, phase: s.phase, ...first }));
  }
};
