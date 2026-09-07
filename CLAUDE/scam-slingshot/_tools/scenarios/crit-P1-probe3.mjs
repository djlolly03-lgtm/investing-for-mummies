export default async ({ game }) => {
  const r = await game(`
    const w = SS.__world; const s = w.sling;
    const t = s.bands[0].tube;
    const info = t == null ? null : { ctor: t.constructor?.name, isObject3D: !!t.isObject3D, type: t.type,
       keys: Object.keys(t).slice(0,40) };
    const kids = [];
    s.group.traverse(o => { kids.push({type:o.type, name:o.name, geom:o.geometry?.type, matName:o.material?.name, matColor: o.material?.color ? '#'+o.material.color.getHexString() : null, visible:o.visible}); });
    return { tube: info, ctrl: Array.isArray(s.bands[0].ctrl) ? s.bands[0].ctrl.length : (s.bands[0].ctrl && Object.keys(s.bands[0].ctrl)),
             pouchRadius: s.bands[0].pouchRadius, prongRadius: s.bands[0].prongRadius, rubberLength: s.bands[0].rubberLength,
             prong0: Object.fromEntries(Object.entries(s.prongs[0]).map(([k,v])=>[k, v && v.isObject3D ? 'O3D:'+v.type+':'+(v.name||'') : (typeof v==='object'&&v!==null? JSON.stringify(v).slice(0,120) : String(v))])),
             kids };
  `);
  console.log(JSON.stringify(r, null, 2));
};
