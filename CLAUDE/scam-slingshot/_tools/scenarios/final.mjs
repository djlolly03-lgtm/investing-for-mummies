/**
 * final.mjs — the acceptance run for the vertical slice.
 *   1. full HOOKS.md surface audit (every member present, and honest)
 *   2. seek() exactness, freeze/resume, timeScale, audioMute
 *   3. real pointer path: dragTo -> release
 *   4. win, with the overlay given time to animate
 *
 * ── WHY THERE ARE NO PIXEL CONSTANTS IN HERE ANY MORE ────────────────────────
 * This scenario used to drag to `(0.155 W, 0.735 H)` and got a sensible 0.36 rad shot. P4 then
 * re-solved the camera framing from the level (camera.js COMPOSE puts the sling at 13 %W), and
 * that pixel — unchanged — landed 0.78 world units IN FRONT OF the fork. The slingshot's
 * rear-hemisphere clamp folded it onto the +0.10 boundary, and the acceptance run fired 1.6077
 * rad, essentially straight up, into an empty sky: `lost`, score 0, 13/13 blocks untouched.
 * Every hook still returned `ok:true`, so nothing failed loudly; the run just quietly stopped
 * testing the thing it is named after.
 *
 * The mapping itself was never wrong — screen->world round-trips at 0.000000 px across the
 * canvas, the drag fan is the exact inverse of the drag direction, and SS.aim() and the pointer
 * path agree to 0.0000 deg (`_tools/scenarios/p0-aimmap.mjs` measures all of it).
 *
 * So: aim by NAMING THE SHOT. `dragShot(angle, power)` derives its pixels from the live sling
 * anchor and the live camera, and the drag is asserted below against the angle it was asked
 * for. Change the camera again and this scenario follows; break the mapping and it fails loudly.
 */
export default async ({ shot, game, state, dragShot, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  // ---- 1. hook surface ----
  say('hooksPresent', await game(`
    const need = ['ready','version','loadLevel','restart','state','aim','dragTo','release',
      'tapAbility','aimAndFire','setTimeScale','freeze','resume','seek','seed','errors','perf',
      'audioMute','dumpBodies','tick','driven','stepOnce','currentSeed','warnings'];
    const missing = need.filter(k => !(k in SS));
    return missing.length ? { missing } : 'all ' + need.length + ' present';
  `));
  say('stateShape', await game(`
    const s = SS.state();
    const need = ['phase','level','score','stars','villainsAlive','ammoLeft','bodiesAsleep'];
    const missing = need.filter(k => !(k in s));
    return missing.length ? { missing } : 'all present';
  `));

  // ---- 2. determinism primitives ----
  await game('await SS.seed(11);');
  const t0 = await game('return SS.tick();');
  await game('await SS.seek(1000);');
  say('seek1000_ticks', (await game('return SS.tick();')) - t0);
  say('driven', await game('return SS.driven();'));
  say('freeze', await game('SS.freeze(); return SS.driven();'));
  const tf = await game('return SS.tick();');
  await new Promise(r => setTimeout(r, 350));
  say('frozenTicksAdvanced', (await game('return SS.tick();')) - tf);
  say('resume', await game('SS.resume(); return SS.driven();'));
  await new Promise(r => setTimeout(r, 250));
  say('resumedTicksAdvanced', (await game('return SS.tick();')) > tf);
  say('timeScale0Freezes', await game('SS.setTimeScale(0); return SS.driven();'));
  say('audioMute', await game('return SS.audioMute(true);'));
  say('aimAndFireExists', await game('return typeof SS.aimAndFire;'));

  // ---- 3. real pointer path, then win ----
  await game('await SS.seed(3); await SS.seek(1400);');
  say('preShot', await state());

  /**
   * A shot that both exercises the pointer path AND starts resolving the level, so item 4
   * above is a result rather than a hope.
   *
   * ── THE FOLLOW-UPS ARE A PLAN NOW, NOT A REPEAT ──────────────────────────────
   * This used to fire the SAME shot up to five times, which only ever won because one draw
   * happened to clear the whole of l1 at once. l1 has two targets at two different ranges —
   * villain 1 inside the tower, villain 2 on the far outpost roof — so the retry list below
   * alternates the tower draw and the full draw that reaches the outpost. Measured over
   * seeds 1 / 3 / 7 by `p2-win.mjs`: clears l1 on all three.
   *
   * Re-measure with `p2-sweep.mjs` after ANY change to `SLING`, `power()` or l1. Every
   * previous version of this constant went stale exactly that way.
   */
  const WANT_ANGLE = 0.40, WANT_POWER = 0.60;
  const FOLLOW_UPS = [[0.48, 1.00], [0.44, 0.60], [0.56, 1.00]];
  const drag = await dragShot(WANT_ANGLE, WANT_POWER, { steps: 4 });
  say('dragTo', drag);
  // The assertion that would have caught the silent failure. A drag is only a test of the
  // input path if the shot it produced is the shot it asked for.
  const angleErr = Math.abs(drag.angle - WANT_ANGLE);
  const dragOK = drag.ok === true && angleErr < 0.01 && drag.grabbable === true
    && !drag.clamped.hemisphere && Math.abs(drag.drawn - WANT_POWER) < 0.01;
  say('dragMatchesTheShotItAskedFor', dragOK ? 'yes' : {
    FAIL: 'the real pointer path did not produce the requested shot',
    wanted: { angle: WANT_ANGLE, power: WANT_POWER },
    got: { angle: drag.angle, drawn: drag.drawn },
    angleErrRad: +angleErr.toFixed(5), clamped: drag.clamped, grabbable: drag.grabbable,
    hint: 'clamped.hemisphere means the drag pixel landed IN FRONT of the fork',
  });
  // Do not throw here — the rest of the run (perf, errors, the win) is still worth capturing.
  // The failure is re-raised at the very end, after final.json has been written.
  const acceptanceFailures = dragOK ? [] :
    [`dragTo produced angle ${drag.angle} rad, wanted ${WANT_ANGLE} rad`];

  await game('await SS.seek(300);');
  await shot('drawn');
  say('release', await game('return SS.release();'));

  for (let i = 0; i < FOLLOW_UPS.length + 1; i++) {
    const s = await state();
    if (s.phase === 'won' || s.phase === 'lost') break;
    if (s.phase === 'aiming') {
      const [a, p] = FOLLOW_UPS[Math.min(i, FOLLOW_UPS.length - 1)];
      await game('SS.aim({angle: args[0], power: args[1]}); SS.release();', a, p);
    }
    for (let k = 0; k < 14; k++) {
      await game('await SS.seek(1000);');
      const s2 = await state();
      if (s2.phase === 'aiming' || s2.phase === 'won' || s2.phase === 'lost') break;
    }
  }
  const fin = await state();
  say('final', fin);
  // Item 4 in the header says "win". Assert it, or the header is a lie the next reader inherits.
  if (fin.phase !== 'won') {
    acceptanceFailures.push(`level did not resolve as won (phase="${fin.phase}", score=${fin.score}, villainsAlive=${fin.villainsAlive})`);
  }
  say('RESULT', fin.phase === 'won' ? `won, score ${fin.score}, ${fin.stars} stars` : `DID NOT WIN (${fin.phase})`);
  await new Promise(r => setTimeout(r, 1800));    // overlay tally + star pops
  await shot('end-overlay');

  say('perf', await game('return SS.perf();'));
  say('errors', await game('return SS.errors.map(e => e.text);'));
  say('warnings', await game('return SS.warnings.map(e => e.text).slice(0,6);'));
  await fs.writeFile(path.join(OUT, 'final.json'), JSON.stringify(out, null, 2));
  if (acceptanceFailures.length) throw new Error('ACCEPTANCE FAILED: ' + acceptanceFailures.join('; '));
};
