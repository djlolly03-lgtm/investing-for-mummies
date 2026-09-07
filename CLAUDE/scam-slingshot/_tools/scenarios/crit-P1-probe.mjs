import { writeFile } from 'node:fs/promises';
import path from 'node:path';
export default async ({ game, state, OUT }) => {
  const s = await state();
  const probe = await game(`
    const w = SS.__world;
    const keys = (o) => o ? Object.keys(o) : null;
    const sling = w.sling;
    const desc = {};
    if (sling) {
      for (const k of Object.keys(sling)) {
        const v = sling[k];
        desc[k] = v && v.isObject3D ? ('Object3D:'+v.type+':'+(v.name||'')+' children='+v.children.length)
                : (typeof v === 'object' && v !== null ? (Array.isArray(v)?('array['+v.length+']'):('obj{'+Object.keys(v).slice(0,12).join(',')+'}'))
                : String(v));
      }
    }
    return {
      worldKeys: keys(w),
      slingKeys: keys(sling),
      slingDesc: desc,
      rigKeys: keys(w.rig),
      hasCamera: !!(w.rig && w.rig.camera),
      projectileCount: (w.projectiles||[]).length,
      fxKeys: keys(w.fx),
      entityCount: (w.entities||[]).length,
    };
  `);
  await writeFile(path.join(OUT, 'probe.json'), JSON.stringify({ state: s, probe }, null, 2));
  console.log(JSON.stringify(probe, null, 2));
};
