/** Why does glass debris read as a translucent wireframe box? Inspect the actual mesh. */
export default async ({ game, shot }) => {
  await game(`await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              let t=0; for(;t<2400;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
              await SS.seek(200);`);
  const info = await game(`
    const w = SS.__world;
    const dump = (m, depth=0) => ({
      name: m.name, type: m.type, visible: m.visible,
      geo: m.geometry ? { type:m.geometry.type, verts:m.geometry.attributes?.position?.count,
                          groups:m.geometry.groups?.length } : null,
      mats: (Array.isArray(m.material)?m.material:[m.material]).filter(Boolean).map(x=>({
        type:x.type, color:x.color?'#'+x.color.getHexString():null, opacity:x.opacity,
        transparent:x.transparent, depthWrite:x.depthWrite, depthTest:x.depthTest,
        side:x.side, wireframe:x.wireframe, blending:x.blending, flatShading:x.flatShading,
        map: !!x.map, polygonOffset:x.polygonOffset })),
      scale: m.scale ? [m.scale.x, m.scale.y, m.scale.z] : null,
      children: depth < 2 ? m.children.map(c=>dump(c, depth+1)) : m.children.length
    });
    const d = w.debris[0];
    const b = w.blocks[0];
    return { debrisMesh: d ? dump(d.mesh) : null,
             blockMesh: b ? dump(b.mesh) : null,
             debrisCount: w.debris.length };
  `);
  console.log('### GLASS_MESH ' + JSON.stringify(info, null, 1));

  // same for wood and stone for comparison
  for (const m of ['wood','stone']) {
    await game(`await SS.loadLevel('_p3-${m}'); await SS.seed(5); await SS.seek(900);
                SS.aim({angle:0.24,power:1.0}); SS.release();
                let t=0; for(;t<2400;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
                await SS.seek(200);`);
    const r = await game(`
      const d = SS.__world.debris[0]; if (!d) return null;
      const mm = (Array.isArray(d.mesh.material)?d.mesh.material:[d.mesh.material]);
      return { type: d.mesh.geometry.type, verts: d.mesh.geometry.attributes.position.count,
               children: d.mesh.children.map(c=>({type:c.type, matType:c.material?.type,
                 color: c.material?.color?'#'+c.material.color.getHexString():null,
                 opacity: c.material?.opacity })),
               mats: mm.map(x=>({type:x.type, color:'#'+x.color.getHexString(), opacity:x.opacity,
                                 transparent:x.transparent, depthWrite:x.depthWrite, side:x.side,
                                 map: !!x.map })) };
    `);
    console.log(`### ${m.toUpperCase()}_DEBRIS_MESH ` + JSON.stringify(r));
  }
};
