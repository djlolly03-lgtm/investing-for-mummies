export default async ({ shot, game }) => {
  for (const t of [120, 150, 180, 220, 260]) {
    await game('SS.seed(7); await SS.seek(2000);');
    await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); await SS.seek(args[0]);', t);
    await shot(`postrelease-t${t}`);
  }
};
