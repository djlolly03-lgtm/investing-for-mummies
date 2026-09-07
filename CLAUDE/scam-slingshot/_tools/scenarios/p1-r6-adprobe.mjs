export default async ({ game }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  for (const ang of [0.20, 0.30, 0.42, 0.60, 0.75]) {
    await game('await SS.aim({angle:args[0], power:0.90}); await SS.seek(200);', ang);
    say('a' + ang, await game(`
      const s = SS.__world.sling, a = s.ammo, m = a.mesh;
      m.updateWorldMatrix(true, true);
      const inv = m.matrixWorld.clone().invert();
      let box = null;
      m.traverse(o => {
        if (!o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox.clone();
        o.updateWorldMatrix(true, false);
        b.applyMatrix4(o.matrixWorld.clone().premultiply(inv));
        box = box ? box.union(b) : b;
      });
      const d = box ? [box.max.x-box.min.x, box.max.y-box.min.y, box.max.z-box.min.z] : null;
      return { ad: +s.ammoDiameter().toFixed(4), radius: a.radius,
               local: d ? d.map(v => +v.toFixed(4)) : null,
               localMaxXY: d ? +Math.max(d[0], d[1]).toFixed(4) : null };`));
  }
  console.log('### DONE');
};
