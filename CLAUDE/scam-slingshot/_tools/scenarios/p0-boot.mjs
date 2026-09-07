/**
 * P0 boot proof scenario.
 *   cd _tools && NODE_PATH=/opt/homebrew/lib/node_modules node capture.mjs \
 *     --scenario ./scenarios/p0-boot.mjs --out ../_shots/P0/boot
 *
 * Proves, from the actual rendered game:
 *   1. three + Rapier boot from vendored files with no CDN and no console errors
 *   2. the fixed timestep drives motion (a filmstrip of three blocks falling and stacking)
 *   3. every body stays plane-locked to z=0
 *   4. the stack settles (bodies asleep) and the phase machine notices
 */
export default async ({ shot, filmstrip, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const log = [];
  const say = (k, v) => { log.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  say('version', await game('return SS.version;'));

  // Deterministic start: seed rebuilds the level and enters driven mode.
  await game('await SS.seed(1);');
  say('stateAtT0', await state());
  await shot('t0-blocks-in-air');

  // ---- motion, judged from a single contact sheet -------------------------
  await filmstrip('fall-and-stack', { from: 0, to: 1400, step: 100, cols: 5 });

  // ---- settle -------------------------------------------------------------
  await game('await SS.seek(3000);');
  const settled = await state();
  say('stateAfter4400ms', settled);
  await shot('settled-stack');

  // ---- plane lock: every body must be exactly z = 0 ------------------------
  const bodies = await game('return SS.dumpBodies();');
  const offPlane = bodies.filter(b => b.t[2] !== 0 || b.r[0] !== 0 || b.r[1] !== 0);
  say('bodyCount', bodies.length);
  say('offPlaneBodies', offPlane.length);
  say('positions', bodies.map(b => ({ tag: b.tag, x: +b.t[0].toFixed(4), y: +b.t[1].toFixed(4), z: b.t[2], sleeping: b.sleeping })));

  // ---- did they actually STACK? (three distinct, ascending y) --------------
  const blocks = bodies.filter(b => b.tag === 'block').map(b => b.t[1]).sort((a, b) => a - b);
  const stacked = blocks.length === 3 && blocks[0] > 0.2 && blocks[1] > blocks[0] + 0.5 && blocks[2] > blocks[1] + 0.5;
  say('blockHeights', blocks.map(v => +v.toFixed(4)));
  say('stacked', stacked);

  // ---- perf ---------------------------------------------------------------
  say('perf', await game('return SS.perf();'));

  // ---- honest hook audit: which HOOKS.md members actually exist ------------
  say('hooks', await game(`
    const need = ['ready','version','loadLevel','restart','state','aim','dragTo','release',
      'tapAbility','aimAndFire','setTimeScale','freeze','resume','seek','seed','errors','perf','audioMute'];
    return need.map(k => k + (k in SS ? '' : ' MISSING')).filter(s => s.includes('MISSING')).length === 0
      ? 'all present' : need.filter(k => !(k in SS));
  `));

  // ---- restart must return to the same t=0 state --------------------------
  await game('await SS.seed(1);');
  const t0b = await game('return SS.dumpBodies().map(b => b.bits).join("|");');
  await game('await SS.seed(1);');
  const t0c = await game('return SS.dumpBodies().map(b => b.bits).join("|");');
  say('rebuildIdentical', t0b === t0c);

  await fs.writeFile(path.join(OUT, 'p0-report.json'), JSON.stringify({ log, stacked, offPlane: offPlane.length }, null, 2));
};
