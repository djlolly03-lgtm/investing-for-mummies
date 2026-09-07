/** crit-P4-r6-det — is the camera advanced by the FIXED step, or by the wall clock? */
const CAM = `const c = SS.__world.camera; return { x:c.position.x, y:c.position.y, z:c.position.z, tick: SS.tick() };`;
export default async ({ game, state, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const R = {};
  const fire = async () => { await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(0.30, 0.90, { steps: 10 }); await game('SS.release();'); };

  // A: one big seek
  await game('await SS.loadLevel("l1");');
  await fire(); await game('await SS.seek(4200);');
  R.oneSeek = await game(CAM);
  // B: same total time, 42 small seeks
  await fire();
  for (let i = 0; i < 42; i++) await game('await SS.seek(100);');
  R.manySeeks = await game(CAM);
  // C: one big seek again (repeatability of A)
  await fire(); await game('await SS.seek(4200);');
  R.oneSeek2 = await game(CAM);
  // D: FROZEN wall-clock test — seek, then just wait 2s of real time with no seek
  await fire(); await game('await SS.seek(4200);');
  const before = await game(CAM);
  await new Promise(r => setTimeout(r, 2500));
  const after = await game(CAM);
  R.wallClock = { before, after,
    moved: Math.hypot(after.x-before.x, after.y-before.y, after.z-before.z), tickDelta: after.tick-before.tick };
  // E: 420 tiny seeks of 10ms (max CDP round trips)
  await fire();
  for (let i = 0; i < 420; i++) await game('await SS.seek(10);');
  R.tinySeeks = await game(CAM);
  await fs.writeFile(path.join(OUT,'DET.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify(R,null,2));
};
