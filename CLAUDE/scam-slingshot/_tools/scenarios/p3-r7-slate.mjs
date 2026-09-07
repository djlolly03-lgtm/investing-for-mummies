/**
 * p3-r7-slate.mjs — HOW MUCH OF A RIGID SHARD IS ITS EXTRUSION WALL?
 *
 * The r6 gap named the rigid shard's extruded side walls as the cause of the desaturated
 * slate: "once it rotates past edge-on the unlit extrusion facet dominates the silhouette".
 * `p3-r7-attrib.mjs` shows by layer-differencing that the slate belongs to the fx chips, not
 * to the rigid shards. This is the other half of the disproof, on the mechanism itself:
 *
 *  1. `ExtrudeGeometry` emits two groups — 0 = the front/back caps, 1 = the bevel + side
 *     walls. Paint group 1 magenta and count how much of the shard it actually owns.
 *  2. `physics.planeLock()` calls `setEnabledRotations(false, false, true, true)` on EVERY
 *     dynamic body, so a shard rotates about Z only. It always presents a cap to the camera
 *     and can never turn edge-on. The number in (1) is therefore its ceiling, not a sample.
 */
const GEO = `
const d = SS.__world.debris.find(x => x.matName === 'glass');
if (!d) return { none: true };
const g = d.mesh.geometry;
return {
  groups: g.groups.map(gr => ({ start: gr.start, count: gr.count, mi: gr.materialIndex })),
  verts: g.attributes.position.count,
  bodyRotationsEnabled: (() => { const b = d.body; const r = b.rotation();
    return { x: +r.x.toFixed(6), y: +r.y.toFixed(6), z: +r.z.toFixed(6), w: +r.w.toFixed(6) }; })(),
};`;

/** Paint the extrusion-wall group magenta on every glass shard; caps keep the real material. */
const PAINT = `
let sideM = null, n = 0;
for (const d of SS.__world.debris) {
  if (d.dead || d.matName !== 'glass') continue;
  const base = Array.isArray(d.mesh.material) ? d.mesh.material[0] : d.mesh.material;
  if (!sideM) {
    sideM = base.clone(); sideM.map = null; sideM.emissiveMap = null;
    sideM.emissive.setHex(0x000000); sideM.color.setHex(0xff00ff); sideM.needsUpdate = true;
  }
  d.mesh.material = [base, sideM];
  n++;
}
return n;`;

/** Put every shard back on its own single material, so the next sample starts clean. */
const UNPAINT = `
let n = 0;
for (const d of SS.__world.debris) {
  if (d.dead || !Array.isArray(d.mesh.material)) continue;
  d.mesh.material = d.mesh.material[0]; n++;
}
return n;`;

const HIDE_FX = `
for (const o of SS.__world.scene.children)
  if (o.name && o.name.startsWith('fx-')) o.visible = !args[0];
return true;`;

/** Sample every dynamic body's quaternion — x and y must be exactly 0 if rotation is Z-locked. */
const QUAT = `
let worstX = 0, worstY = 0, n = 0;
for (const d of SS.__world.debris) { if (d.dead) continue; const r = d.body.rotation();
  worstX = Math.max(worstX, Math.abs(r.x)); worstY = Math.max(worstY, Math.abs(r.y)); n++; }
return { n, worstX, worstY };`;

export default async ({ shot, game }) => {
  const L = (...a) => console.log(...a);
  await game('return await SS.loadLevel("_p3-glass");');
  await game('return SS.seed(777);');
  await game('await SS.seek(1500);');
  await game(`const B = SS.__world.blocks[0].constructor.prototype; window.__fx = [];
    if (!B.__r7s) { B.__r7s = true; const of = B.fracture;
      B.fracture = function (i, p) { const k = of.call(this, i, p); window.__fx.push(1); return k; }; }
    return true;`);
  await game('return SS.aimAndFire(0.16, 0.88);');
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__fx.length;')) break; }
  L(`first fracture at fire+${t} ms`);

  let at = 0;
  for (const ms of [200, 450, 700, 1200]) {
    await game('await SS.seek(args[0]);', ms - at); at = ms;
    if (ms === 200) L(`GEOMETRY ${JSON.stringify(await game(GEO))}`);
    L(`+${ms} ms rotation lock: ${JSON.stringify(await game(QUAT))}`);
    await game(HIDE_FX, true);
    await shot(`shards${ms}-PLAIN`);
    const n = await game(PAINT);
    await game('return SS.__render();');
    await shot(`shards${ms}-WALLS-MAGENTA`);
    L(`  painted ${n} shards, unpainted ${await game(UNPAINT)}`);
    await game('return SS.__render();');
    await game(HIDE_FX, false);
  }
};
