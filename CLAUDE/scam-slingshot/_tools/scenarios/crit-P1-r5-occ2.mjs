export default async ({ shot, game, dragShot }) => {
  await game('SS.seed(2025); await SS.seek(1500);');
  await dragShot(0.30, 0.98, { steps: 10 });
  await game('SS.freeze(); return true;');
  const list = await game(`
    const w=SS.__world, s=w.sling;
    window.__meshes = [];
    s.group.updateWorldMatrix(true,true);
    s.group.traverse(n=>{ if(n.isMesh) window.__meshes.push(n); });
    const a = s.ammo||(w.projectiles||[])[0];
    if (a && a.mesh) { window.__ammoMesh = a.mesh; }
    const col=(m)=> !m?'-':(Array.isArray(m)?'multi':(m.color?'#'+m.color.getHexString():m.type));
    return window.__meshes.map((n,i)=>({i, name:n.name||'-', geo:n.geometry&&n.geometry.type, mat:col(n.material), vis:n.visible}));`);
  console.log('#MESHES', JSON.stringify(list));
  await shot('base');
  for (let i = 0; i < list.length; i++) {
    await game(`const o = window.__meshes[args[0]];
      Object.defineProperty(o,'visible',{get:()=>false,set:()=>{},configurable:true});
      return true;`, i);
    await new Promise(r=>setTimeout(r,160));
    await shot(`hide-${String(i).padStart(2,'0')}`);
    await game(`const o = window.__meshes[args[0]];
      Object.defineProperty(o,'visible',{value:true,writable:true,configurable:true});
      return true;`, i);
    await new Promise(r=>setTimeout(r,120));
  }
};
