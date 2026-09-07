export default async ({ page, shot, game, state, aimPx, dragShot }) => {
  const d = (o) => console.log(JSON.stringify(o, null, 1));
  const dump = async (tag) => d({ tag, ...await game(`
    const w = SS.__world, s = w.sling;
    const col = (m)=> !m ? '-' : (Array.isArray(m) ? 'multi' : (m.color? '#'+m.color.getHexString() : m.type));
    const desc = (o,p='')=>{ const r=[]; const walk=(n,path)=>{ if(!n) return;
        r.push({path, type:n.type, name:n.name, vis:n.visible, mat: col(n.material),
          op: n.material&&!Array.isArray(n.material)? n.material.opacity : null,
          geo: n.geometry? n.geometry.type : null,
          params: n.geometry&&n.geometry.parameters? Object.fromEntries(Object.entries(n.geometry.parameters).filter(([k,v])=>typeof v==='number')) : null,
          scale: n.scale? [+n.scale.x.toFixed(3),+n.scale.y.toFixed(3),+n.scale.z.toFixed(3)]:null,
          pos: n.position? [+n.position.x.toFixed(3),+n.position.y.toFixed(3),+n.position.z.toFixed(3)]:null,
          rz: n.rotation? +n.rotation.z.toFixed(3):null });
        (n.children||[]).forEach((c,i)=>walk(c, path+'/'+(c.name||c.type)+i)); };
      walk(o,p); return r; };
    const bandsArr = Array.isArray(s.bands)? s.bands : [s.bands];
    const out = { drawn: s.drawn, state: s.state, recoilT: s.recoilT, recoilAmp: s.recoilAmp,
      pouch: {x:s.pouch.x,y:s.pouch.y},
      bands: bandsArr.map((b,i)=>desc(b,'band'+i)).flat(),
      preview: s.preview? desc(s.preview,'prev') : null,
      ammo: s.ammo? { keys:Object.keys(s.ammo).slice(0,40), r: s.ammo.radius, tag: s.ammo.tag||s.ammo.kind } : null };
    return out;
  `)});
  await dump('rest');
  await dragShot(0.30, 0.5, { steps: 8 });
  await dump('half');
  await dragShot(0.30, 0.98, { steps: 8 });
  await dump('full');
};
