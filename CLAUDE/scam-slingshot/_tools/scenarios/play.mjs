/**
 * play.mjs — a whole level, start to finish, through the real input path where possible.
 * Four shots; checks the win/lose overlay actually appears and the phase machine advances.
 */
export default async ({ shot, filmstrip, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const log = [];
  const say = (k, v) => { log.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  await game('await SS.seed(3);');
  await game('await SS.seek(1400);');
  say('start', await state());

  const shots = [[0.58, 1.0], [0.44, 1.0], [0.70, 0.92], [0.52, 1.0]];
  for (let i = 0; i < shots.length; i++) {
    const st = await state();
    if (st.phase === 'won' || st.phase === 'lost') break;
    if (st.phase !== 'aiming') { say(`shot${i}-blocked`, st); break; }
    say(`aim${i}`, await game('return SS.aim({angle:args[0], power:args[1]});', shots[i][0], shots[i][1]));
    await game('await SS.seek(240);');
    if (i === 0) await shot(`draw${i}`);
    say(`fire${i}`, await game('return SS.release();'));
    await game('await SS.seek(400);');
    if (i === 0) await shot(`flight${i}`);
    // give the world up to 12s to settle and hand back control
    for (let k = 0; k < 14; k++) {
      await game('await SS.seek(1000);');
      const s2 = await state();
      if (s2.phase === 'aiming' || s2.phase === 'won' || s2.phase === 'lost') break;
    }
    say(`after${i}`, await state());
    await shot(`after${i}`);
  }

  say('final', await state());
  await shot('final');
  say('errors', await game('return SS.errors.map(e=>e.text).slice(0,8);'));
  say('perf', await game('return SS.perf();'));
  await fs.writeFile(path.join(OUT, 'play.json'), JSON.stringify(log, null, 2));
};
