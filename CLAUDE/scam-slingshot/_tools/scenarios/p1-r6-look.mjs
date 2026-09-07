/**
 * p1-r6-look.mjs — the pictures for r6. Two elements, one band, five tiles that must read.
 *
 * STEP IS 25 ms ON PURPOSE and every strip here is a multiple of it: SS.seek runs
 * round(ms/1000/FIXED) steps at FIXED = 8.333 ms, so a 30 ms step really advances 33.3 ms and
 * a 10 ms step really advances 8.3 — the label lies unless the step is a whole number of
 * solver steps. 25 ms is exactly 3. (This is the same bug that made p1-r5-verify report the
 * band as still ringing at 400 ms; see the ladder note there.)
 */
export default async ({ game, filmstrip, shot }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const fire = async (angle, power) => {
    await game('SS.seed(11); await SS.seek(2000);');
    await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(400);', angle, power);
    return game('return await SS.release();');
  };

  say('full', await fire(0.42, 0.90));
  await filmstrip('release-full-draw', { from: 0, to: 250, step: 25, cols: 4 });

  say('weak', await fire(0.42, 0.35));
  await filmstrip('release-weak-draw', { from: 0, to: 250, step: 25, cols: 4 });

  say('steep', await fire(0.75, 0.85));
  await filmstrip('release-steep-draw', { from: 0, to: 250, step: 25, cols: 4 });

  // The band's own show, after every launch particle is dead (last one at ~167 ms).
  say('recoil', await fire(0.42, 0.90));
  await filmstrip('band-recoil-alone', { from: 175, to: 400, step: 25, cols: 4 });
  console.log('### DONE');
};
