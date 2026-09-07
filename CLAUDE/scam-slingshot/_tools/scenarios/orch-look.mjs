/** Orchestrator's own eyes: one good shot, start to settle, as a contact sheet. */
export default async ({ game, state, shot, filmstrip }) => {
  await game('await SS.restart(); await SS.seed(3); SS.audioMute(true);');
  await game('SS.freeze();');
  await game('SS.aim({angle: 0.30, power: 0.95});');
  await shot('A-drawn-full-tension');
  await game('SS.resume(); SS.release();');
  await filmstrip('B-release-and-flight', { from: 0, to: 700, step: 100, cols: 4 });
  await filmstrip('C-impact-and-collapse', { from: 0, to: 1600, step: 200, cols: 3 });
  await game('await SS.seek(3000);');
  await shot('D-settled');
  console.log('STATE:', JSON.stringify(await state()));
};
