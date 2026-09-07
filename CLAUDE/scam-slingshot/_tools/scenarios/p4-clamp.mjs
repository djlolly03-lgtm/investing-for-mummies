export default async ({ game }) => {
  await game('await SS.seed(3); await SS.seek(1200);');
  console.log('BOUNDS0', JSON.stringify(await game('const r=SS.__world.rig; return {b:r.bounds, vw:r._hw*2};')));
  await game('SS.aim({angle:0.50,power:1.0}); await SS.seek(400);');
  await game('return SS.release();');
  let maxX = -1e9, rec = null;
  for (let i = 0; i < 60; i++) {
    await game('await SS.seek(50);');
    const s = await game(`const r=SS.__world.rig, c=SS.__world.camera;
      return {camX:c.position.x, posX:r.pos.x, wantX:r.want.x, maxB:r.bounds.maxX, mode:r.mode};`);
    if (s.camX > maxX) { maxX = s.camX; rec = s; }
  }
  console.log('MAX_CAMX', JSON.stringify(rec));
};
