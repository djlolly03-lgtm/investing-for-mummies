export default async ({ game }) => {
  const r = await game(`
    const w = SS.__world; const s = w.sling;
    const d = (o) => o == null ? null : (o.isObject3D ? {isObject3D:true,type:o.type,name:o.name,children:o.children.length,keys:Object.keys(o).slice(0,25)} : {ctor:o.constructor?.name, keys:Object.keys(o).slice(0,40)});
    return { bands0: d(s.bands[0]), bands1: d(s.bands[1]), prongs0: d(s.prongs[0]),
             group: d(s.group), groupChildren: s.group.children.map(c=>c.type+':'+(c.name||'')+':'+(c.geometry?.type||'')) };
  `);
  console.log(JSON.stringify(r, null, 2));
};
