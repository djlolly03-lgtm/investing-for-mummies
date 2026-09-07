/** crit-P4-r2-sweep.mjs — find a shot that actually HITS the tower, so the lead/shake
 *  measurements are taken on a real impact instead of an overshoot. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ game, state, OUT }) => {
  const rows = [];
  for (const a of [0.30, 0.38, 0.45, 0.52, 0.60, 0.68, 0.75]) {
    for (const p of [0.70, 0.80, 0.90, 1.0]) {
      await game('await SS.seed(7); await SS.seek(2600); SS.aim({angle:args[0], power:args[1]}); await SS.seek(400); SS.release(); await SS.seek(7000);', a, p);
      const s = await state();
      rows.push({ a, p, score: s.score, villains: s.villainsAlive, blocks: s.blocks, debris: s.debris, phase: s.phase });
    }
  }
  rows.sort((x, y) => (y.score - x.score));
  await writeFile(path.join(OUT, 'SWEEP.json'), JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(rows.slice(0, 12), null, 1));
};
