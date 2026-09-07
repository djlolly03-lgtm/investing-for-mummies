/**
 * p4-r3-lead.mjs — the moment P4 owns this round: THE ARRIVAL FRAME.
 * Round 3 stops pushing in on arrival and opens out instead, so the struck tower comes down
 * into the rubric's 40-60 %W band while the projectile stays on its 55 %W+ mark, and the sling
 * is back in shot with the traceline anchored on it.
 */
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const hideHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; });
  const showHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });
  const fire = (a, p) => game('await SS.seed(3); await SS.seek(2600); SS.aim({angle:args[0],power:args[1]}); await SS.seek(300); SS.release();', a, p);

  await game('await SS.seed(3); await SS.seek(2600);');
  await hideHud(); await shot('aim'); await showHud();

  await fire(0.30, 0.90);
  await hideHud();
  await filmstrip('approach', { from: 0, to: 1000, step: 100, cols: 3 });
  await showHud();

  await fire(0.30, 0.90);
  await hideHud();
  await filmstrip('impact-window', { from: 400, to: 940, step: 60, cols: 5 });
  await showHud();

  await fire(0.30, 0.90);
  await game('await SS.seek(520);');
  await hideHud(); await shot('midflight-nohud'); await showHud();
  await game('await SS.seek(140);');
  await hideHud(); await shot('impact-nohud'); await showHud();

  await fire(0.60, 1.0);
  await hideHud();
  await filmstrip('overshoot', { from: 200, to: 1400, step: 200, cols: 3 });
  await showHud();

  await fire(0.30, 0.90);
  await game('await SS.seek(4000);');
  await hideHud(); await shot('settled-nohud'); await showHud();
  console.log(JSON.stringify(await state()));
  console.log('errors:', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
