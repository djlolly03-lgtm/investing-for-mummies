export default async ({ game }) => {
  await game(`SS.freeze(); await SS.loadLevel('_pw-drop'); SS.freeze();`);
  const r = await game(`
    const w=SS.__world; const bl=w.entities.filter(e=>e.tag==='block');
    return bl.map(e=>({ id:e.id, tag:e.tag, keys:Object.keys(e),
      matType: typeof e.material, matKeys: e.material? Object.keys(e.material).slice(0,25):null,
      matName: e.material && (e.material.name ?? e.material.id ?? e.material.key ?? e.material.mat ?? null),
      matStr: e.material? JSON.stringify(e.material).slice(0,300):null,
      y: e.body.translation().y, sleeping: e.body.isSleeping(), m:e.body.mass() }));
  `);
  console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  const r2 = await game(`
    const w=SS.__world; await SS.loadLevel('_pw-mass');
    const bl=w.entities.filter(e=>e.tag==='block');
    return bl.map(e=>({id:e.id, y:+e.body.translation().y.toFixed(2), x:+e.body.translation().x.toFixed(2), m:+e.body.mass().toFixed(3)}));
  `);
  console.log('MASS RIG ' + JSON.stringify(r2));
};
