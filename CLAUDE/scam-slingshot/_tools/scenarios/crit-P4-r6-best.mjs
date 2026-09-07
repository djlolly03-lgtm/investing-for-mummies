/** crit-P4-r6-best — the two frames P4 is judged on, from the CURRENT build. */
export default async ({ shot, game, dragShot }) => {
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  await shot('BEST-aim-establishing');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release(); await SS.seek(450);');
  await shot('BEST-midflight');
  await game('await SS.seek(150);');
  await shot('BEST-impact');
};
