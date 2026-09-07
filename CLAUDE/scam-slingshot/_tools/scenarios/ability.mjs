/** Mid-air ability: the SIP Arrow must actually become three arrows. */
export default async ({ shot, filmstrip, game, state }) => {
  await game('await SS.seed(5); await SS.seek(1400);');
  await game('SS.aim({angle:0.72, power:1.0}); SS.release();');
  await game('await SS.seek(430);');
  console.log('  before :', JSON.stringify(await game('return {n: SS.__world.projectiles.filter(p=>!p.dead).length};')));
  await shot('pre-split');
  console.log('  tap    :', JSON.stringify(await game('return SS.tapAbility();')));
  console.log('  after  :', JSON.stringify(await game('return {n: SS.__world.projectiles.filter(p=>!p.dead).length};')));
  await filmstrip('split', { from: 0, to: 700, step: 70, cols: 4 });
  console.log('  state  :', JSON.stringify(await state()));
  console.log('  again  :', JSON.stringify(await game('return SS.tapAbility();')));
  console.log('  errors :', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
