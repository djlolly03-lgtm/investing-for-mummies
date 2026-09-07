/**
 * win.mjs — the WIN path and the win overlay.
 *
 * This used to fire exactly one shot and screenshot whatever was on screen 2.2 s later. That
 * was fine while one shot happened to clear l1, and became a quiet lie the moment the level
 * got harder: it still passed, still wrote `win-overlay.png`, and the picture was of a level
 * in progress. A scenario named `win` must either reach 'won' or say out loud that it did not.
 *
 * It then spent a round honestly printing DID NOT WIN, because every shot in the list was at
 * POWER 1.0 and, under the tuning of the time, a full-power shot OVERFLEW l1 entirely. P2
 * round 1 fixed that at the source: `power()` is concave now, so full draw lands ON the far
 * outpost instead of past the level. The shot list below was re-measured against that tuning
 * and must be re-measured again after any change to `SLING` or to l1 — see `p2-sweep.mjs`.
 */
export default async ({ shot, game, state }) => {
  await game('await SS.seed(3);');
  /**
   * The list has to track the tuning, and this is the FOURTH round it has gone stale, so here
   * is the rule: measure the band, do not guess it. `_tools/scenarios/p2-sweep.mjs` prints,
   * for 8 angles x 3 powers, where each shot first touched the level and what it did; run it
   * after any change to `SLING`, to `power()`, or to l1.
   *
   * l1 now has TWO targets and they want two different draws: villain 1 is inside the tower
   * (a 0.60 draw arrives in its guts at y ~ 3.8) and villain 2 sits on the far outpost roof
   * (only a full draw reaches x ~ 23). One shot for each, then a repeat of each as insurance.
   * Measured over seeds 1 / 3 / 7 by `p2-win.mjs`: this plan clears l1 on all three, in two
   * shots on two of them.
   */
  const shots = [[0.40, 0.60], [0.48, 1.00], [0.44, 0.60], [0.56, 1.00]];
  const log = [];
  for (const [angle, power] of shots) {
    const st = await state();
    if (st.phase === 'won' || st.phase === 'lost') break;
    if (st.phase !== 'aiming') break;
    const fired = await game('return SS.aim({angle:args[0], power:args[1]}), SS.release();', angle, power);
    for (let k = 0; k < 20; k++) {
      await game('await SS.seek(400);');
      const s = await state();
      if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break;
    }
    const s2 = await state();
    log.push({ angle, power, ok: fired?.ok !== false, phase: s2.phase, foes: s2.villainsAlive, score: s2.score });
  }
  const f = await state();
  console.log('  shots:', JSON.stringify(log));
  console.log('  state:', JSON.stringify(f));
  console.log(f.phase === 'won' ? '  RESULT: won' : `  RESULT: DID NOT WIN (phase=${f.phase}, foes=${f.villainsAlive})`);
  await new Promise(r => setTimeout(r, 2200));   // overlay tally + star pops run on the wall clock
  await shot('win-overlay');
  console.log('  starsLit:', await game(`return [...document.querySelectorAll('#end .stars i')].map(e=>e.classList.contains('on'));`));
  console.log('  hudScore:', await game(`return document.getElementById('score').textContent;`));
  console.log('  errors:', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
