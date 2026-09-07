/** crit-P4-r6-xproc — ONE fired shot per browser process; run it N times and diff. */
export default async ({ game, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  const drag = await dragShot(0.30, 0.90, { steps: 10 });
  const rel = await game('return SS.release();');
  await game('await SS.seek(4200);');
  const out = await game(`const c=SS.__world.camera,s=await SS.state();
    return { camx:+c.position.x.toFixed(6), camz:+c.position.z.toFixed(6), tick:SS.tick(),
             score:s.score, phase:s.phase, blocks:s.blocks, debris:s.debris,
             bits: SS.dumpBodies().map(b=>b.bits).join('').slice(0,64) };`);
  const rec = { dragAngle: drag.angle, relAngle: rel.angle, exitSpeed: rel.exitSpeed, ...out };
  await fs.writeFile(path.join(OUT,'X.json'), JSON.stringify(rec,null,2));
  console.log(JSON.stringify(rec));
};
