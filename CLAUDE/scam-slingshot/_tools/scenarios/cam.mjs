export default async ({ game }) => {
  await game('await SS.seed(3); await SS.seek(1400); SS.aim({angle:0.58,power:1.0});');
  await game('await SS.seek(200);');
  console.log('drawn ', await game('const r=SS.__world.rig; return {mode:r.mode, wantX:+r.want.x.toFixed(2), posX:+r.pos.x.toFixed(2), dist:+r.dist.toFixed(1), wantDist:+r.wantDist.toFixed(1)};'));
  await game('return SS.release();');
  for (const t of [100,200,300,500,700,900]) {
    await game('await SS.seek(200);');
    console.log(t, await game(`
      const r=SS.__world.rig, p=SS.__world.projectiles.filter(q=>!q.dead)[0];
      return {mode:r.mode, hasTarget: !!r.target, tgtDead: r.target?r.target.dead:null,
              px: p?+p.position().x.toFixed(2):null, wantX:+r.want.x.toFixed(2),
              posX:+r.pos.x.toFixed(2), dist:+r.dist.toFixed(1), wantDist:+r.wantDist.toFixed(1),
              stiff:r.stiffness};`));
  }
};
