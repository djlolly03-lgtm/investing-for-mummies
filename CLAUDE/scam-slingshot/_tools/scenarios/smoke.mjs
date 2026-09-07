/**
 * smoke.mjs — does the slice boot, aim, fire, break, kill and end?
 * Prints a machine-readable report and drops a handful of stills.
 */
export default async ({ shot, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const log = [];
  const say = (k, v) => { log.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  say('version', await game('return SS.version;'));
  await game('await SS.seed(1);');
  say('t0', await state());
  await shot('t0-level');

  // let it settle
  await game('await SS.seek(1200);');
  say('settled', await state());
  await shot('settled');

  // aim + draw (no fire) — check the band + preview
  say('aim', await game('return SS.aim({ angle: args[0], power: 0.95 });', 0.60));
  await shot('drawn');

  // fire
  say('fire', await game('return SS.release();'));
  await game('await SS.seek(260);');
  await shot('mid-flight');
  await game('await SS.seek(500);');
  say('afterImpact', await state());
  await shot('impact');
  await game('await SS.seek(3500);');
  say('afterSettle', await state());
  await shot('after-settle');

  say('perf', await game('return SS.perf();'));
  say('errors', await game('return SS.errors.map(e => e.text).slice(0,10);'));
  say('warnings', await game('return SS.warnings.map(e => e.text).slice(0,10);'));

  await fs.writeFile(path.join(OUT, 'smoke.json'), JSON.stringify(log, null, 2));
};
