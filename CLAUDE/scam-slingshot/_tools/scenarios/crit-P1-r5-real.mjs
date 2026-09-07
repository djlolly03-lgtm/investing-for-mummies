/** Is the release "muzzle jump" real, or a hook artefact? Fire through genuine DOM pointer events. */
export default async ({ page, shot, game, aimPx }) => {
  await game('SS.seed(2025); await SS.seek(1500);');
  const g0 = await aimPx(0.30, 0);
  const g1 = await aimPx(0.30, 0.95);
  await page.mouse.move(g0.x, g0.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(g0.x + (g1.x-g0.x)*i/12, g0.y + (g1.y-g0.y)*i/12);
  const before = await game(`const w=SS.__world,s=w.sling,a=s.ammo||(w.projectiles||[])[0];
    return { tick: SS.tick(), drawn:+s.drawn.toFixed(3), st:s.state,
      pouch:{x:+s.pouch.x.toFixed(4),y:+s.pouch.y.toFixed(4)},
      ammo:{x:+a.mesh.position.x.toFixed(4), y:+a.mesh.position.y.toFixed(4)} };`);
  await shot('real-prerelease');
  await page.mouse.up();
  const after = await game(`const w=SS.__world,s=w.sling; const a=(w.projectiles||[])[0]||s.ammo;
    return { tick: SS.tick(), drawn:+s.drawn.toFixed(3), st:s.state,
      pouch:{x:+s.pouch.x.toFixed(4),y:+s.pouch.y.toFixed(4)},
      ammo:{x:+a.mesh.position.x.toFixed(4), y:+a.mesh.position.y.toFixed(4)} };`);
  await shot('real-t0');
  console.log('#BEFORE', JSON.stringify(before));
  console.log('#AFTER ', JSON.stringify(after));
  const dx = after.ammo.x - before.ammo.x, dy = after.ammo.y - before.ammo.y;
  console.log('#JUMP world units', Math.hypot(dx,dy).toFixed(3), 'in solver steps', after.tick-before.tick);

  // muzzle distance vs power, through the hook path
  for (const p of [0.2,0.4,0.6,0.8,0.95,1.0]) {
    await game('SS.seed(2025); await SS.seek(1200);');
    const a = await aimPx(0.30, 0), b = await aimPx(0.30, p);
    await game('SS.dragTo(args[0],args[1]);', a.x, a.y);
    await game('SS.dragTo(args[0],args[1]);', b.x, b.y);
    const r = await game('return SS.release();');
    console.log(`#POWER ${p}  muzzleDist=${r.muzzleDist} muzzleAD=${r.muzzleAD} speed=${r.speed} exit=${r.exitSpeed}`);
  }
};
