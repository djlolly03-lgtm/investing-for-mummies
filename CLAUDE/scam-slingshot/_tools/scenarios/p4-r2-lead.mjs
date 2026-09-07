/**
 * p4-r2-lead.mjs — the moment P4 owns this round: MID-FLIGHT LEAD.
 * Filmstrips the critic's exact shot (seed 3, {angle:0.30, power:1.0}) across the whole
 * approach, so the composition can be judged from a still — plus the shot that flies over.
 */
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const hideHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; });
  const showHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });

  const fire = (a, p) => game('await SS.seed(3); await SS.seek(2600); SS.aim({angle:args[0],power:args[1]}); await SS.seek(300); SS.release();', a, p);

  // 0. the establishing frame, for reference
  await game('await SS.seed(3); await SS.seek(2600);');
  await hideHud(); await shot('aim'); await showHud();

  // 1. the approach — 100 ms steps from release to just past impact
  await fire(0.30, 1.0);
  await hideHud();
  await filmstrip('approach', { from: 0, to: 1000, step: 100, cols: 3 });
  await showHud();

  // 2. the impact window at 60 ms, HUD on (this is what a player sees)
  await fire(0.30, 1.0);
  await filmstrip('impact-window', { from: 380, to: 920, step: 60, cols: 5 });

  // 3. single frames a critic can measure / blind-A-B
  await fire(0.30, 1.0);
  await game('await SS.seek(500);');
  await hideHud(); await shot('midflight-t500-nohud'); await showHud();
  await game('await SS.seek(100);');
  await hideHud(); await shot('impact-t600-nohud'); await showHud();

  // 4. the shot that flies over the level — the camera must not chase it into the grass
  await fire(0.60, 1.0);
  await hideHud();
  await filmstrip('overshoot', { from: 200, to: 1400, step: 200, cols: 3 });
  await showHud();

  // 5. settle: no drift, survivors framed
  await fire(0.30, 1.0);
  await game('await SS.seek(4000);');
  await hideHud(); await shot('settled-nohud'); await showHud();
  console.log(JSON.stringify(await state()));
};
