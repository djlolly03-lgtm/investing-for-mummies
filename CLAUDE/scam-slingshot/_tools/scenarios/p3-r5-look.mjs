/**
 * p3-r5-look.mjs — LOOK at the collapse. The moment P3 owns.
 *
 * Two filmstrips per shot: one at the game's own framing (what a player sees) and one
 * camLocked on the tower (so tile-to-tile displacement is meaningful and the hinge is
 * readable). Locks are taken AFTER release — any real camera intent clears camLock.
 */
export default async ({ game, state, shot, filmstrip }) => {
  const runs = [
    { ang: 0.30, pow: 0.90, tag: 'roofhit' },
    { ang: 0.28, pow: 0.88, tag: 'bighit' },
  ];
  for (const r of runs) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await shot(`${r.tag}-00-before`);
    await game('return SS.aimAndFire(args[0],args[1]);', r.ang, r.pow);
    // walk to first contact
    let t = 0;
    while (t < 4000) {
      await game('await SS.seek(20);'); t += 20;
      const hit = await game(`if (SS.__world.debris.length) return true;
        return SS.__world.blocks.filter(b=>!b.dead).some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.5;});`);
      if (hit) break;
    }
    console.log(`${r.tag}: contact at ${t}ms`);
    await filmstrip(`${r.tag}-collapse-gameframing`, { from: 0, to: 1600, step: 100, cols: 5 });
    await game('await SS.seek(4000);');
    await shot(`${r.tag}-settled`);
    console.log(`${r.tag} settled: ${JSON.stringify(await state())}`);
    console.log(`${r.tag} structure: ${JSON.stringify((await game('return SS.__structure();')).queue)} stats ` +
      JSON.stringify(await game('const s=SS.__structure(); return {collapses:s.collapses,joints:s.joints,tips:s.tips,hinges:s.hinges,hops:s.hops};')));
  }

  // the same collapse, camLocked, so the hinge is readable at size
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('return SS.aimAndFire(0.28,0.88);');
  let t = 0;
  while (t < 4000) {
    await game('await SS.seek(20);'); t += 20;
    const hit = await game(`if (SS.__world.debris.length) return true;
      return SS.__world.blocks.filter(b=>!b.dead).some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.5;});`);
    if (hit) break;
  }
  await game('return SS.camLock({x:19.5,y:3.6,halfWidth:7.5});');
  await filmstrip('bighit-collapse-LOCKED', { from: 0, to: 1400, step: 100, cols: 5 });
  await game('return SS.camUnlock();');
};
