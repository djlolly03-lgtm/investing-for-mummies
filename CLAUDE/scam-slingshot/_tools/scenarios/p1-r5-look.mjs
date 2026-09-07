/**
 * p1-r5-look.mjs — the pictures. Does the r5 plume actually look like a launch, at every
 * draw, on every ammo, and on a phone?
 *
 * The numbers say the value problem is solved; only eyes can say the frame got better. This
 * captures the moment the piece owns (0–240 ms) plus the three cases most likely to expose a
 * constant that was really tuned at one size: a feeble draw, the next ammo (different AD),
 * and portrait.
 */
export default async ({ page, game, filmstrip, shot, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  const fire = async (angle, power, settleMs = 400) => {
    await game('SS.seed(11); await SS.seek(2000);');
    await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(args[2]);',
               angle, power, settleMs);
    return game('return await SS.release();');
  };

  // 1 — the moment, full frame
  say('full', await fire(0.42, 0.90));
  await filmstrip('release-0-240', { from: 0, to: 240, step: 30, cols: 3 });

  // 2 — release frame + 80 ms, uncropped, for a blind pair
  say('blindshot', await fire(0.42, 0.90));
  await shot('release-t0');
  await game('await SS.seek(80);');
  await shot('release-t80');

  // 3 — a feeble draw: the plume is written in AD and in fractions of the muzzle reach, so it
  //     should be the same object, smaller — not a constant that only works at full power.
  say('weak', await fire(0.42, 0.35));
  await filmstrip('weak-draw', { from: 0, to: 120, step: 40, cols: 4 });

  // 4 — a steep draw at a different angle
  say('steep', await fire(0.75, 1.00));
  await shot('steep-t40');

  // 5 — the NEXT ammo in the queue: different silhouette, different AD.
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aimAndFire(0.42, 0.90); await SS.seek(2600);');
  const second = await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(300); return await SS.release();');
  say('ammo2', { ad: second.ad, ammo: second.ammo, muzzleAD: second.muzzleAD });
  await shot('ammo2-t0');
  await game('await SS.seek(60);');
  await shot('ammo2-t60');
  console.log('### DONE');
};
