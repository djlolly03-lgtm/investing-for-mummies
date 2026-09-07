/** Waste all four shots into the dirt: the lose path and the lose overlay must both work. */
export default async ({ shot, game, state }) => {
  await game('await SS.seed(9); await SS.seek(1400);');
  for (let i = 0; i < 5; i++) {
    const st = await state();
    console.log(`  before${i}:`, st.phase, 'ammo', st.ammoLeft, 'foes', st.villainsAlive);
    if (st.phase !== 'aiming') break;
    await game('SS.aim({angle:-0.25, power:0.20}); SS.release();');   // straight into the ground
    for (let k = 0; k < 14; k++) {
      await game('await SS.seek(1000);');
      const s2 = await state();
      if (s2.phase !== 'flying' && s2.phase !== 'settling') break;
    }
  }
  const f = await state();
  console.log('  final:', JSON.stringify(f));
  await new Promise(r => setTimeout(r, 1500));   // let the overlay tally + stars animate
  await shot('lose-overlay');
  console.log('  errors:', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
