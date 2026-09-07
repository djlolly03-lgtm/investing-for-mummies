/** crit-P4-r6-reset — does restart() from a MID-COLLAPSE world leave residue? */
export default async ({ game, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const END = `const c=SS.__world.camera,s=await SS.state();
    return { camx:+c.position.x.toFixed(6), camz:+c.position.z.toFixed(6), tick:SS.tick(),
             score:s.score, phase:s.phase, blocks:s.blocks, debris:s.debris };`;
  const canonical = async (seekMs) => {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(0.30, 0.90, { steps: 10 });
    await game('SS.release(); await SS.seek(args[0]);', seekMs);
    return await game(END);
  };
  const R = {};
  R.baseline      = await canonical(4200);      // from a fresh page
  R.afterSettled  = await canonical(4200);      // restart from a settled/won world
  R.midCollapse   = await canonical(1200);      // leave the world mid-collapse
  R.afterMid      = await canonical(4200);      // <-- the suspect
  R.afterMid2     = await canonical(4200);
  R.midCollapse2  = await canonical(900);
  R.afterMid3     = await canonical(4200);
  await fs.writeFile(path.join(OUT,'RESET.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify(R,null,2));
};
