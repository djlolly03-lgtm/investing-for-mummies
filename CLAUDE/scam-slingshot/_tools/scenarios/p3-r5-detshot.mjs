/**
 * p3-r5-detshot.mjs — DETERMINISM, BUT WITH A SHOT FIRED.
 *
 * `_tools/determinism.mjs` proves that a level REBUILDS and SETTLES identically. It never
 * fires. That blind spot hid a real bug for a whole round: level/structure.js kept its
 * collapse lean direction across `reset()`, so three identical shots from an identical seed
 * were bit-identical right up to the first fracture and then diverged — one run demolished
 * the tower, the next left it standing, and every critic measurement of a collapse was
 * quietly unrepeatable.
 *
 * So: fire the SAME shot three times from the same seed and diff `dumpBodies()` at a ladder
 * of timestamps that straddles first contact and first fracture. Every row must read
 * `0==1:true 1==2:true`. Run this after ANY change to level/structure.js, level/blocks.js,
 * or anything that reaches a rigid body from an event subscriber.
 */
export default async ({ game }) => {
  const stamps = [100, 200, 300, 400, 440, 460, 480, 500, 560, 700, 1000, 1600];
  const runs = [];
  for (let i = 0; i < 3; i++) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    const row = { t0: await game('return JSON.stringify(SS.dumpBodies());') };
    await game('return SS.aimAndFire(0.24,0.92);');
    let seen = 0;
    for (const at of stamps) {
      await game('await SS.seek(args[0]);', at - seen); seen = at;
      row[at] = await game('return JSON.stringify(SS.dumpBodies());');
      row['n' + at] = await game('return SS.__world.debris.length + "/" + SS.__world.blocks.filter(b=>!b.dead).length + "/" + SS.__world.entities.length;');
    }
    runs.push(row);
  }
  console.log('t0 same:', runs[0].t0 === runs[1].t0, runs[1].t0 === runs[2].t0);
  for (const at of stamps) {
    console.log(`t+${String(at).padStart(4)}  0==1:${String(runs[0][at] === runs[1][at]).padEnd(5)} 1==2:${String(runs[1][at] === runs[2][at]).padEnd(5)} counts ${runs[0]['n'+at]} | ${runs[1]['n'+at]} | ${runs[2]['n'+at]}`);
  }
};
