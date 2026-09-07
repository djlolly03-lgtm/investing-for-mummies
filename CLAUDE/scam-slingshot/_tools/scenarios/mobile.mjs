export default async ({ shot, game, state }) => {
  await game('await SS.seed(3); await SS.seek(1400);');
  await shot('portrait-aiming');
  console.log('  aim:', JSON.stringify(await game('return SS.aim({angle:0.62, power:0.95});')));
  await game('await SS.seek(260);');
  await shot('portrait-drawn');
  await game('return SS.release();');
  await game('await SS.seek(760);');
  await shot('portrait-flight');
  console.log('  perf:', JSON.stringify(await game('return SS.perf();')));
  console.log('  errors:', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
