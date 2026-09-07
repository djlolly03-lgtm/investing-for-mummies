/** crit-P4-r6-det4 — does a CDP round trip between release() and seek() change the world? */
export default async ({ game, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const R = {};
  const setup = async () => { await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    return await dragShot(0.30, 0.90, { steps: 10 }); };

  // pattern A: release and seek in the SAME evaluate
  R.dragA = await setup();
  R.relA = await game('const r = SS.release(); return { rel:r, driven: SS.driven(), tick: SS.tick() };');
  await game('await SS.seek(4200);');
  R.endA = await game('const c=SS.__world.camera,s=await SS.state();return {x:+c.position.x.toFixed(6),z:+c.position.z.toFixed(6),tick:SS.tick(),score:s.score,phase:s.phase,driven:SS.driven()};');

  // pattern B: release, then a round trip, then seek
  R.dragB = await setup();
  R.relB = await game('const r = SS.release(); return { rel:r, driven: SS.driven(), tick: SS.tick() };');
  R.midB = await game('return { driven: SS.driven(), tick: SS.tick(), simTime: SS.__world.simTime };');
  await new Promise(r => setTimeout(r, 400));            // let the wall clock run
  R.midB2 = await game('return { driven: SS.driven(), tick: SS.tick(), simTime: SS.__world.simTime };');
  await game('await SS.seek(4200);');
  R.endB = await game('const c=SS.__world.camera,s=await SS.state();return {x:+c.position.x.toFixed(6),z:+c.position.z.toFixed(6),tick:SS.tick(),score:s.score,phase:s.phase,driven:SS.driven()};');

  // pattern C: same as A but seek in 42 chunks, all separate evaluates
  R.dragC = await setup();
  await game('SS.release();');
  for (let i=0;i<42;i++) await game('await SS.seek(100);');
  R.endC = await game('const c=SS.__world.camera,s=await SS.state();return {x:+c.position.x.toFixed(6),z:+c.position.z.toFixed(6),tick:SS.tick(),score:s.score,phase:s.phase};');

  // pattern D: release+seek(600) same evaluate, then 36 chunks
  R.dragD = await setup();
  await game('SS.release(); await SS.seek(600);');
  for (let i=0;i<36;i++) await game('await SS.seek(100);');
  R.endD = await game('const c=SS.__world.camera,s=await SS.state();return {x:+c.position.x.toFixed(6),z:+c.position.z.toFixed(6),tick:SS.tick(),score:s.score,phase:s.phase};');

  await fs.writeFile(path.join(OUT,'DET4.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify({ dragA:{a:R.dragA.angle,c:R.dragA.clamped}, dragB:{a:R.dragB.angle},
    relA:R.relA, relB:R.relB, midB:R.midB, midB2:R.midB2,
    endA:R.endA, endB:R.endB, endC:R.endC, endD:R.endD }, null, 2));
};
