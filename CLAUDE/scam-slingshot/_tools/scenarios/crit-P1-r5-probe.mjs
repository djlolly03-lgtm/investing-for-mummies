// CRITIC P1 r5 — probe: what is on screen, where, and in what colours.
export default async ({ page, shot, game, state, aimPx, OUT }) => {
  const st = await state();
  console.log('STATE', JSON.stringify(st));

  const info = await game(`
    const w = SS.__world, s = w.sling;
    const keys = Object.keys(s);
    const num = {};
    for (const k of keys) { const v = s[k]; if (typeof v === 'number') num[k] = v;
      else if (v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number') num[k] = {x:v.x,y:v.y,z:v.z}; }
    return { keys, num, phase: w.phase, ammoTag: w.projectiles?.length };
  `);
  console.log('SLING', JSON.stringify(info, null, 1));

  const proj = await game(`
    const w = SS.__world;
    const V3 = w.camera.position.constructor;
    const r = w.renderer.domElement.getBoundingClientRect();
    const P = (x,y)=>{ const v=new V3(x,y,0).project(w.camera);
      return { x: r.left+(v.x*.5+.5)*r.width, y: r.top+(-v.y*.5+.5)*r.height }; };
    const s = w.sling;
    return { rect:{w:r.width,h:r.height}, anchor: s.anchor ? P(s.anchor.x,s.anchor.y):null,
             pouch: s.pouch ? P(s.pouch.x,s.pouch.y) : null,
             origin: P(0,0), ground: P(0,0), tenM: P(10,0),
             camPos: {x:w.camera.position.x,y:w.camera.position.y,z:w.camera.position.z},
             fov: w.camera.fov };
  `);
  console.log('PROJ', JSON.stringify(proj, null, 1));

  // scene graph names near the sling
  const names = await game(`
    const w = SS.__world, s = w.sling;
    const out = [];
    const root = s.group || s.root || s.object3d || s.mesh;
    const walk = (o, d) => { if (!o || d>4) return; out.push({d, name:o.name||o.type, type:o.type,
      mat: o.material ? (Array.isArray(o.material)? 'multi' : (o.material.color? '#'+o.material.color.getHexString():'-')) : '-'});
      (o.children||[]).forEach(c=>walk(c,d+1)); };
    walk(root, 0);
    return { rootFound: !!root, out };
  `);
  console.log('GRAPH', JSON.stringify(names, null, 1));

  await shot('00-boot');
};
