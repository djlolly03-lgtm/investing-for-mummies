/**
 * p4-r5-edge.mjs — the two branches the canonical shot never exercises.
 *   1. A FLYOVER (predictContactX -> null): there is no subject to compose against, so the
 *      arrival anchor must not engage at all and the framing must be the round-4 ball-lead.
 *   2. The CONTACT CLAMP: on l1 the hit lands at ~35 %W and the clamp is slack, so it is
 *      forced by raising `arrivalContactMinPctW` and checking the composition actually moves.
 */
import { PRE } from './p4-r5-lead.mjs';
const shotAt = (a, p) => `await SS.seed(3); await SS.seek(2600); SS.aim({ angle: ${a}, power: ${p} }); await SS.seek(300); SS.release(); SS.freeze();`;

export default async ({ game, shot, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const run = async (setup, ms) => {
    await g(setup);
    const tr = [];
    for (let t = 0; t <= ms; t += 20) { tr.push({ t, ...(await g('return frame();')) }); if (t < ms) await g('await SS.seek(20);'); }
    return tr;
  };

  // 1. flyover — 0.52 @ 1.0 sails clean over the level (ORCHESTRATOR-NOTES solvability probe)
  const fly = await run(shotAt(0.52, 1.0), 900);
  const hasArr = fly.filter(r => r.arrx !== null).length;
  const blocks0 = fly[0].blocks, blocksEnd = fly[fly.length - 1].blocks;
  console.log(`FLYOVER  blocks ${blocks0}->${blocksEnd}  frames with an arrival anchor: ${hasArr}/${fly.length}` +
              `  proj %W peak ${Math.max(...fly.map(r => r.projPctW ?? 0))}  at end ${fly[fly.length - 1].projPctW}` +
              `  vw ${fly[0].vw}->${fly[fly.length - 1].vw}`);

  // 2. force the contact clamp
  for (const min of [0.22, 0.45]) {
    await g(`await SS.seed(3); await SS.seek(2600); SS.__world.rig.compose.arrivalContactMinPctW = ${min};` +
            ` SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze(); await SS.seek(620);`);
    const f = await g('return frame();');
    console.log(`contactMin ${min}  ->  standMID ${f.standMidPctW} %W   contact ${f.contactPctW} %W   proj ${f.projPctW} %W   camx ${f.camx}`);
  }
  await g('SS.__world.rig.compose.arrivalContactMinPctW = 0.22;');
  await g(shotAt(0.52, 1.0) + 'await SS.seek(560);');
  await shot('flyover-nohud');
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
