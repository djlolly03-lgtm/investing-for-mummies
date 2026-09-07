export default async ({ page, game, state, OUT }) => {
  const info = await game(`
    const w = SS.__world;
    const keys = Object.keys(w);
    const cam = w.camera;
    return {
      keys,
      state: await SS.state(),
      cam: { fov: cam.fov, aspect: cam.aspect, pos: cam.position.toArray(), quat: cam.quaternion.toArray(), rot: [cam.rotation.x, cam.rotation.y, cam.rotation.z], near: cam.near, far: cam.far },
      rigKeys: w.rig ? Object.keys(w.rig) : null,
      slingKeys: w.sling ? Object.keys(w.sling) : null,
      villains: (w.villains||[]).map(v => ({ tag: v.tag, alive: v.alive, x: v.mesh?.position.x, y: v.mesh?.position.y, keys: Object.keys(v).slice(0,25) })),
      blocksN: (w.blocks||[]).length,
      block0: w.blocks && w.blocks[0] ? Object.keys(w.blocks[0]) : null,
      hooks: Object.keys(SS),
    };
  `);
  console.log(JSON.stringify(info, null, 2).slice(0, 6000));
};
