export default async ({ shot, game, dragShot }) => {
  const setup = () => game(`
    const w=SS.__world, s=w.sling; const a=s.ammo||(w.projectiles||[])[0];
    window.__ammo = a.mesh; window.__ammoSub = []; a.mesh.traverse(n=>{ if(n.isMesh) window.__ammoSub.push(n); });
    return window.__ammoSub.length;`);
  const hideAmmo = (on) => game(`
    if (args[0]) Object.defineProperty(window.__ammo,'visible',{get:()=>false,set:()=>{},configurable:true});
    else Object.defineProperty(window.__ammo,'visible',{value:true,writable:true,configurable:true});
    return true;`, on);
  const top = (on) => game(`
    for (const o of window.__ammoSub) { const ms=Array.isArray(o.material)?o.material:[o.material];
      for (const m of ms) if (m) { m.depthTest = !args[0]; m.needsUpdate = true; }
      o.renderOrder = args[0] ? 9999 : 0; }
    return true;`, on);
  const pose = async (tag, s) => {
    await game('SS.seed(2025); await SS.seek(1500);');
    if (s) await s();
    await game('SS.freeze(); return true;');
    console.log('#SUB', tag, await setup());
    await new Promise(r=>setTimeout(r,200)); await shot(`${tag}-A`);
    await top(true); await new Promise(r=>setTimeout(r,220)); await shot(`${tag}-D-ontop`); await top(false);
    await hideAmmo(true); await new Promise(r=>setTimeout(r,220)); await shot(`${tag}-C-noammo`); await hideAmmo(false);
  };
  await pose('rest', null);
  await pose('half', async()=>{ await dragShot(0.30,0.50,{steps:8}); });
  await pose('full', async()=>{ await dragShot(0.30,0.98,{steps:10}); });
};
