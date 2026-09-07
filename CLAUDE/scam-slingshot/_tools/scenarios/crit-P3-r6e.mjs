/** CRIT P3 r6 — part 5. Why are a quarter of the glass shards slate-grey rather than cyan? */
export default async ({ game, shot }) => {
  await game('await SS.loadLevel("_p3-glass"); SS.seed(7); await SS.seek(900);');
  await game('return SS.aimAndFire(0.22, 0.75);');
  await game('await SS.seek(900);');
  const out = await game(`
    const w = SS.__world;
    const rows = w.debris.map(d => {
      const m = d.mesh.material;
      const mats = Array.isArray(m) ? m : [m];
      return { mat: d.matName, cracked: d.cracked,
        nMat: mats.length,
        colors: mats.map(x => '#' + (x.color ? x.color.getHexString() : '??')),
        types: mats.map(x => x.type),
        side: mats.map(x => x.side), vertexColors: mats.map(x => !!x.vertexColors),
        geoGroups: d.mesh.geometry.groups.length };
    });
    // also the FX glass chip pool tint
    const p = w.fx.pools.glass;
    return { debris: rows, fxGlassPoolColorAttr: p.mesh.instanceColor
      ? Array.from(p.mesh.instanceColor.array.slice(0, 12)).map(v=>+v.toFixed(3)) : null };
  `);
  console.log(JSON.stringify(out, null, 1).slice(0, 4000));
  await game('SS.camLock({ x: 18.0, y: 2.6, halfWidth: 2.4 });');
  await shot('glass-shards-closeup-LOCKED');
};
