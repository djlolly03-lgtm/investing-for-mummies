/**
 * P15's criterion, now testable: particles degrade under load, physics does not.
 * Same seed, same shot, three different particle budgets -> byte-identical body transforms.
 */
export default async ({ game }) => {
  const run = async (budget) => game(`
    await SS.seed(11);
    SS.__world.fx.budget = ${budget};
    await SS.seek(900); SS.aim({angle:0.22,power:1.0}); SS.release();
    await SS.seek(4000);
    return { bits: SS.dumpBodies().map(b=>b.bits).join(''),
             bodies: SS.dumpBodies().length,
             particles: SS.__world.fx.liveCount };
  `);
  const full = await run(1.0);
  const half = await run(0.5);
  const off  = await run(0.05);
  console.log('budget 1.00 ->', full.bodies, 'bodies');
  console.log('budget 0.50 ->', half.bodies, 'bodies  identical:', half.bits === full.bits);
  console.log('budget 0.05 ->', off.bodies,  'bodies  identical:', off.bits === full.bits);
  console.log(full.bits === half.bits && full.bits === off.bits
    ? 'PASS  particle budget does not touch the simulation'
    : 'FAIL  particle budget perturbs rigid-body transforms');
};
