export default async ({ game, dragShot }) => {
  const d = (o) => console.log(JSON.stringify(o, null, 1));
  const q = async (tag) => d({tag, ...await game(`
    const w=SS.__world, s=w.sling;
    const col=(m)=> !m?'-':(Array.isArray(m)?'multi':(m.color?'#'+m.color.getHexString():m.type));
    const b = Array.isArray(s.bands)? s.bands : [s.bands];
    const info = b.map(x=>{
      if (!x) return null;
      if (x.isObject3D) return {kind:'obj3d', type:x.type};
      const o={keys:Object.keys(x)};
      for (const k of Object.keys(x)) { const v=x[k];
        if (v && v.isObject3D) o[k]={type:v.type, mat:col(v.material), geo:v.geometry&&v.geometry.type,
           vcount: v.geometry&&v.geometry.attributes&&v.geometry.attributes.position? v.geometry.attributes.position.count:null,
           scale:[+v.scale.x.toFixed(3),+v.scale.y.toFixed(3),+v.scale.z.toFixed(3)]};
        else if (typeof v==='number') o[k]=+v.toFixed(4);
      }
      return o; });
    const prongs = (Array.isArray(s.prongs)?s.prongs:[s.prongs]).map(p=> p&&p.isObject3D? {type:p.type, mat:col(p.material), rz:+p.rotation.z.toFixed(4), pos:[+p.position.x.toFixed(3),+p.position.y.toFixed(3)]} : (p?Object.keys(p):null));
    return { drawn:+s.drawn.toFixed(3), tipL:{x:+s._tipL.x.toFixed(3),y:+s._tipL.y.toFixed(3)}, tipR:{x:+s._tipR.x.toFixed(3),y:+s._tipR.y.toFixed(3)}, bands: info, prongs, leather: col(s.leatherMat) };
  `)});
  await q('rest');
  await dragShot(0.30, 0.98, {steps:10});
  await q('full');
};
