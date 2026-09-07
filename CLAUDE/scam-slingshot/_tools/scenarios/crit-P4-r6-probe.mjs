/** crit-P4-r6-probe — independent critic probe: what can I read about the camera? */
export default async ({ game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  await game('await SS.loadLevel("l1"); SS.seed(7); await SS.seek(1500);');
  const info = await game(`
    const W = SS.__world, cam = W.camera, rig = W.rig;
    const e = cam.rotation;
    return {
      camKeys: Object.keys(SS).sort(),
      rigKeys: Object.keys(rig).sort(),
      compose: rig.compose ? Object.keys(rig.compose).sort() : null,
      composeVals: rig.compose ? JSON.parse(JSON.stringify(rig.compose)) : null,
      cam: { fov: cam.fov, aspect: cam.aspect, near: cam.near, far: cam.far,
             pos: [cam.position.x, cam.position.y, cam.position.z],
             rot: [e.x, e.y, e.z], up: [cam.up.x, cam.up.y, cam.up.z],
             quat: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w] },
      blockSample: W.blocks.length ? Object.keys(W.blocks[0]).sort() : null,
      villainSample: W.villains.length ? Object.keys(W.villains[0]).sort() : null,
      slingKeys: W.sling ? Object.keys(W.sling).sort() : null,
      state: await SS.state(),
    };
  `);
  await fs.writeFile(path.join(OUT, 'probe.json'), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info.cam, null, 2));
  console.log('rigKeys', info.rigKeys.join(','));
  console.log('compose', JSON.stringify(info.composeVals));
  console.log('blockKeys', (info.blockSample||[]).join(','));
  console.log('villainKeys', (info.villainSample||[]).join(','));
};
