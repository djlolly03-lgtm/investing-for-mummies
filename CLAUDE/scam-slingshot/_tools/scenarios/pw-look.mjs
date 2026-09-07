/**
 * pw-look.mjs — PW's EYES.
 *
 * 1. THE DROP RIG. Three identical 0.90 cubes, same height, same 0.60 rad tilt, wood /
 *    glass / stone, side by side in ONE locked frame, so the only variable in the picture
 *    is the material. If the three columns of the filmstrip are interchangeable, the piece
 *    has not shipped.
 * 2. THE SMASH RIG. The same three cubes from 2.62 m — hard enough that the materials fail
 *    differently as well as land differently.
 * 3. THE MASS-RATIO RIG. Identical free-standing wood column, identical drop, three
 *    hammers. The picture of "a heavy block drives a light one and a light one does not".
 * 4. A real l1 collapse at the game's own framing.
 *
 * SS.freeze() immediately after every load: loadLevel() leaves the rAF loop running on the
 * wall clock, and on a drop rig two puppeteer round trips is the whole fall.
 */
import { INSTALL, CUT } from './pw-probe.mjs';

/**
 * FREEZE BEFORE THE LOAD, AND RELOAD BEFORE EVERY STRIP. Two harness traps, both of which
 * silently photographed the wrong instant:
 *  · loadLevel() resolves with the rAF loop still stepping on the wall clock, and the
 *    puppeteer round trips that follow it (camLock, render, the first screenshot) are worth
 *    hundreds of milliseconds of simulation. A rig whose whole event is 500 ms was over
 *    before t=0. SS.freeze() first costs nothing — settleAfterBuild() steps the solver
 *    explicitly, so it still runs in driven mode — and nothing can leak afterwards.
 *  · filmstrip()'s `from` is a RELATIVE seek, not an absolute timestamp, so three strips in
 *    a row start where the previous one stopped. Each strip gets its own fresh load.
 */
const rig = async ({ game, filmstrip }, level, lock, strips) => {
  for (const st of strips) {
    await game('return SS.freeze();');
    await game(CUT(1));
    await game('return await SS.loadLevel(args[0]);', level);
    await game('return SS.freeze();');
    await game('return SS.camLock(args[0]);', lock);
    await game('return SS.__render();');
    await filmstrip(st.name, st);
  }
};

export default async (ctx) => {
  const { game, filmstrip, shot } = ctx;
  await game(INSTALL);

  // THE TOPPLE is the headline picture. A cube dropped 1 m under 2.4 g is on the floor in
  // two frames and every material read is over before a filmstrip can sample it; a column
  // past its own tipping point falls for 600 ms, lands along its length and then SETTLES,
  // which is where wood, glass and stone actually part company.
  await rig(ctx, '_pw-topple', { x: 11.0, y: 1.05, halfWidth: 4.6 }, [
    { name: 'topple-fall', from: 0, to: 660, step: 60, cols: 4 },
    { name: 'topple-settle', from: 0, to: 2000, step: 200, cols: 4 },
  ]);

  await rig(ctx, '_pw-drop', { x: 11.0, y: 0.95, halfWidth: 4.4 }, [
    { name: 'drop-land', from: 200, to: 480, step: 20, cols: 5 },
  ]);

  await rig(ctx, '_pw-smash', { x: 11.0, y: 1.5, halfWidth: 5.0 }, [
    { name: 'smash-land', from: 380, to: 860, step: 40, cols: 4 },
    { name: 'smash-settle', from: 0, to: 2400, step: 240, cols: 4 },
  ]);

  await rig(ctx, '_pw-mass', { x: 13.15, y: 2.0, halfWidth: 6.2 }, [
    { name: 'mass-drive', from: 250, to: 1300, step: 105, cols: 4 },
  ]);

  await game('window.__PW.cut = 0; return true;');
  await game('return await SS.loadLevel("l1");');
  await game('return await SS.seed(4242);');
  await game('return SS.camUnlock();');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await filmstrip('l1-collapse', { from: 400, to: 2400, step: 200, cols: 4 });
  await game('return await SS.seek(4000);');
  await shot('l1-settled');
  return 'ok';
};
