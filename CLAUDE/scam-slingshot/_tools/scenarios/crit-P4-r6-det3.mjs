/** crit-P4-r6-det3 — isolate WHICH observation perturbs the sim. Same steps, different probes. */
const CAM = `const c=SS.__world.camera; return { x:+c.position.x.toFixed(6), z:+c.position.z.toFixed(6), tick:SS.tick() };`;
export default async ({ game, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const R = {};
  const run = async (probe) => {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(0.30, 0.90, { steps: 10 });
    await game('SS.release(); await SS.seek(600);');
    for (let t = 600; t < 4200; t += 100) { if (probe) await game(probe); await game('await SS.seek(100);'); }
    return await game(`const c=SS.__world.camera, s=await SS.state();
      return { x:+c.position.x.toFixed(6), z:+c.position.z.toFixed(6), tick:SS.tick(), phase:s.phase, score:s.score, blocks:s.blocks, debris:s.debris };`);
  };
  R.noProbe      = await run(null);
  R.camOnly      = await run(CAM);
  R.stateOnly    = await run(`return await SS.state();`);
  R.dumpBodies   = await run(`return SS.dumpBodies().length;`);
  R.perfOnly     = await run(`return SS.perf();`);
  R.stateOnly2   = await run(`return await SS.state();`);
  R.noProbe2     = await run(null);
  await fs.writeFile(path.join(OUT,'DET3.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify(R,null,2));
};
