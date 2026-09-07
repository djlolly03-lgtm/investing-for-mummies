/**
 * pw-r2-look.mjs — PW ROUND 2's EYES. One question only:
 *
 *   WITH THE TEXTURES DOING NOTHING FOR YOU, CAN YOU NAME THE MATERIAL FROM HOW IT FALLS?
 *
 * Three identical 0.90 m cubes, identical height, identical 0.60 rad tilt, side by side in
 * ONE locked frame, so the only variable in the picture is the material. Two heights,
 * because the round-1 critic's gap was that the FAILURE order was inverted (the heaviest
 * cube was the only one that shattered) and one height cannot show both halves:
 *
 *   · SMASH (2.62 m) — the failure read. Glass must be the one that goes; stone must be the
 *     one that does not. If the stone column of this strip is the pile of rubble, the round
 *     has failed no matter what the tables say.
 *   · DROP (1.02 m)  — the landing read, all three surviving: wood bounces and keeps
 *     turning, glass slides flat, stone stops dead on the first contact.
 *
 * Plus a real l1 collapse at the game's own framing, because a rig is not a game.
 *
 * SS.freeze() BEFORE every load and a fresh load before every strip — both traps are
 * documented in pw-look.mjs and both silently photograph the wrong instant.
 */
import { INSTALL, CUT } from './pw-probe.mjs';

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

  // ── THE HEADLINE. wood | glass | stone, left to right, 2.62 m of fall. ──────
  await rig(ctx, '_pw-smash', { x: 11.0, y: 1.5, halfWidth: 5.0 }, [
    { name: 'A-smash-land', from: 380, to: 860, step: 40, cols: 4 },
    { name: 'B-smash-settle', from: 0, to: 2400, step: 240, cols: 4 },
  ]);

  // ── THE LANDING READ, all three surviving. ─────────────────────────────────
  await rig(ctx, '_pw-drop', { x: 11.0, y: 0.95, halfWidth: 4.4 }, [
    { name: 'C-drop-land', from: 200, to: 480, step: 20, cols: 5 },
    { name: 'D-drop-settle', from: 0, to: 1800, step: 180, cols: 4 },
  ]);

  // ── The three cubes at rest, one frame, after everything has stopped. ───────
  await game('return SS.freeze();');
  await game(CUT(1));
  await game('return await SS.loadLevel("_pw-smash");');
  await game('return SS.freeze();');
  await game('return SS.camLock({x:11.0, y:1.5, halfWidth:5.0});');
  await game('return await SS.seek(4000);');
  await game('return SS.__render();');
  await shot('E-smash-at-rest');

  // ── A real collapse, at the game's own framing. ────────────────────────────
  await game('window.__PW.cut = 0; return true;');
  await game('return await SS.loadLevel("l1");');
  await game('return await SS.seed(4242);');
  await game('return SS.camUnlock();');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await filmstrip('F-l1-collapse', { from: 400, to: 2400, step: 200, cols: 4 });
  await game('return await SS.seek(4000);');
  await shot('G-l1-settled');
  return 'ok';
};
