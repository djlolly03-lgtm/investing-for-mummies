/** crit-P4-r6-nd — the same shot, repeated, with and without a preceding different shot. */
export default async ({ game, dragShot, OUT }) => {
  const fs=await import('node:fs/promises'); const path=await import('node:path');
  const END = `const s=await SS.state(); const c=SS.__world.camera;
    return { phase:s.phase, score:s.score, blocks:s.blocks, debris:s.debris, alive:s.villainsAlive,
             ammoLeft:s.ammoLeft, tick:SS.tick(), camx:+c.position.x.toFixed(4) };`;
  const run = async (a,p,seekMs) => {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    const pre = await game(`const s=await SS.state(); return { ammoLeft:s.ammoLeft, blocks:s.blocks, alive:s.villainsAlive };`);
    const d = await dragShot(a,p,{steps:10});
    const rel = await game('return SS.release();');
    await game('await SS.seek(args[0]);', seekMs);
    return { a, p, pre, ammo: rel.ammo, relOk: rel.ok, relAngle: rel.angle, ...(await game(END)) };
  };
  const R = { seq: [] };
  R.seq.push(await run(0.34,0.88,7000));   // 1 fresh
  R.seq.push(await run(0.34,0.88,7000));   // 2 repeat
  R.seq.push(await run(0.34,0.88,4200));   // 3 shorter seek
  R.seq.push(await run(0.34,0.88,7000));   // 4 repeat
  R.seq.push(await run(0.30,0.90,7000));   // 5 a winning shot
  R.seq.push(await run(0.34,0.88,7000));   // 6 after a win
  R.seq.push(await run(0.40,0.82,7000));
  R.seq.push(await run(0.40,0.82,4200));
  await fs.writeFile(path.join(OUT,'ND.json'), JSON.stringify(R,null,2));
  for (const r of R.seq) console.log(JSON.stringify(r));
};
