/**
 * P2 evidence pack. The claim under test is "full power at a sensible angle is a GOOD shot,
 * not an automatic overfly", so the strips have to SHOW the full-power shot arriving.
 */
export default async ({ game, state, shot, filmstrip }) => {
  await game("await SS.loadLevel('l1'); await SS.seed(3); await SS.seek(400);");
  await shot('aim-framing');

  // full draw, mid angle — the shot that used to sail clean over the level
  await game('SS.aim({angle:0.48, power:1.0}); SS.release();');
  await filmstrip('fullpower-0p48-connects', { from: 0, to: 1800, step: 150, cols: 4 });
  console.log('  full power 0.48:', JSON.stringify(await state()));

  // the tower shot
  await game('await SS.restart(); await SS.seed(3); await SS.seek(200);');
  await game('SS.aim({angle:0.40, power:0.60}); SS.release();');
  await filmstrip('draw0p60-0p40-collapse', { from: 0, to: 2400, step: 200, cols: 4 });
  console.log('  draw 0.60 0.40:', JSON.stringify(await state()));
  await game('await SS.seek(3000);');
  await shot('settled');
};
