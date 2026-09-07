/**
 * Motion contact sheets: the release, the flight, and the collapse.
 *
 * The draw is animated through the REAL pointer path, but its pixels are derived from the live
 * sling and the live camera (`aimPx`), never hard-coded. The constants that used to be here
 * (0.30/0.62 then 0.17/0.74) landed 1.25 world units in FRONT of the fork once P4 re-solved the
 * framing, so the hemisphere clamp turned every frame of the release filmstrip into a 91.9 deg
 * straight-up shot — the launch-feel evidence pack was quietly filming the wrong shot entirely.
 *
 * The camera pulls back as the draw builds (CameraRig.drawing), so the target pixel MOVES
 * during the draw: recompute it after each seek rather than reusing the first one.
 */
export default async ({ shot, filmstrip, game, state, aimPx }) => {
  const ANGLE = 0.42, POWER = 0.98;

  await game('await SS.seed(3);');
  await game('await SS.seek(1400);');

  // --- the draw, animated through the real pointer path ---
  const grab = await aimPx(ANGLE, 0);
  await game('SS.dragTo(args[0], args[1]);', grab.x, grab.y);
  await game('await SS.seek(150);');
  const half = await aimPx(ANGLE, POWER * 0.55);      // camera has moved: re-derive
  await game('SS.dragTo(args[0], args[1]);', half.x, half.y);
  await game('await SS.seek(150);');
  const full = await aimPx(ANGLE, POWER);             // and again
  const drew = await game('return SS.dragTo(args[0], args[1]);', full.x, full.y);
  console.log('  draw:', JSON.stringify(drew));
  if (Math.abs(drew.angle - ANGLE) > 0.01 || drew.clamped.hemisphere) {
    throw new Error(`motion.mjs: the draw is not the shot it asked for — ${JSON.stringify(drew)}`);
  }

  await game('await SS.seek(320);');
  await shot('drawn-full');
  console.log('  drawnState:', JSON.stringify(await state()));

  // --- release + first 900 ms, 60 ms apart: the snap, the recoil, the launch ---
  await game('return SS.release();');
  await filmstrip('release', { from: 0, to: 900, step: 60, cols: 4 });

  // --- the impact and collapse ---
  /**
   * This used to be `aim(0.58, power:1.0)` and it MISSED THE LEVEL ENTIRELY: measured, that shot
   * leaves the tower standing, 0 debris and score 0, still `flying` at t+2800 ms. The strip
   * named "impact-collapse" was eighteen tiles of a projectile sailing over an untouched tower.
   *
   * A strip named "collapse" has to CONTAIN a collapse, so the aim is the measured
   * biggest-collapse shot on l1 rather than a plausible-looking one. After P2 round 1 that is
   * (0.40, 0.60): it arrives in the tower's guts at y ~ 3.8 and takes 13 of 17 blocks with it.
   * The WINDOW below was always right — only the aim goes stale. Re-measure with
   * `_tools/scenarios/p2-sweep.mjs` after any change to SLING, `power()` or l1; the assertion
   * a few lines down (`debris > 0`) is what stops this drifting back into a lie.
   */
  await game('await SS.seed(3); await SS.seek(1400); SS.aim({angle:0.40,power:0.60}); SS.release();');
  await filmstrip('impact-collapse', { from: 560, to: 2360, step: 120, cols: 4 });

  const after = await state();
  console.log('  after:', JSON.stringify(after));
  if (after.debris === 0) {
    throw new Error(`motion.mjs: the "impact-collapse" strip contains no impact — ${JSON.stringify(after)}`);
  }
};
