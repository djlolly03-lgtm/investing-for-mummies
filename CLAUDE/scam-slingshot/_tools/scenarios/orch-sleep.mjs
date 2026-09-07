export default async ({ game }) => {
  await game('await SS.restart(); await SS.seed(3); SS.audioMute(true);');
  await game('SS.aim({angle:0.30,power:0.95}); SS.release();');
  for (const t of [400, 800, 1200, 1600]) {
    await game('await SS.seek(args[0]);', t === 400 ? 400 : 400);
    const r = await game(`
      const bs = SS.dumpBodies ? SS.dumpBodies() : [];
      const airborne = bs.filter(b => b.y > 1.2);
      return {
        total: bs.length,
        asleep: bs.filter(b=>b.asleep).length,
        airborneCount: airborne.length,
        airborneAsleep: airborne.filter(b=>b.asleep).length,
        airborneAsleepSample: airborne.filter(b=>b.asleep).slice(0,4)
          .map(b=>({y:+b.y.toFixed(2), vy:+(b.vy??0).toFixed(3), kind:b.kind||b.mat}))
      };`);
    console.log('t=' + t + 'ms', JSON.stringify(r));
  }
};
