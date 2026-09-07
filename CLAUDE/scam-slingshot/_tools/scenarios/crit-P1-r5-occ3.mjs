/** Ammo-silhouette occlusion, measured four ways per pose.
 *  A = normal, B = sling group hidden (only the pouch strap can still cover the ammo),
 *  C = ammo hidden (background+strap+sling), D = ammo forced on top (its FULL silhouette). */
export default async ({ shot, game, dragShot }) => {
  const collect = () => game(`
    const w=SS.__world, s=w.sling;
    window.__sling=[]; s.group.traverse(n=>{ if(n.isMesh) window.__sling.push(n); });
    const a = s.ammo||(w.projectiles||[])[0];
    window.__ammoRoot = a.mesh;
    // every mesh whose world position is within 1.2 world units of the pouch and is NOT in s.group
    window.__ammoGroupMeshes = [];
    const root = a.mesh.parent || a.mesh;
    root.traverse(n=>{ if(n.isMesh) window.__ammoGroupMeshes.push(n); });
    return { sling: window.__sling.length, ammoGroup: window.__ammoGroupMeshes.length };`);

  const pinHide = (arrName) => game(`for (const o of window[args[0]]) {
      try { Object.defineProperty(o,'visible',{get:()=>false,set:()=>{},configurable:true}); } catch(e){} }
    return window[args[0]].length;`, arrName);
  const unpin = (arrName) => game(`for (const o of window[args[0]]) {
      try { Object.defineProperty(o,'visible',{value:true,writable:true,configurable:true}); } catch(e){} }
    return true;`, arrName);
  const onTop = (on) => game(`for (const o of window.__ammoGroupMeshes) {
      const ms = Array.isArray(o.material)?o.material:[o.material];
      for (const m of ms) if (m) { m.depthTest = !args[0]; m.needsUpdate = true; }
      o.renderOrder = args[0] ? 9999 : 0; }
    return true;`, on);

  const pose = async (tag, setup) => {
    await game('SS.seed(2025); await SS.seek(1500);');
    if (setup) await setup();
    await game('SS.freeze(); return true;');
    console.log('#COLLECT', tag, JSON.stringify(await collect()));
    await new Promise(r=>setTimeout(r,200)); await shot(`${tag}-A-normal`);
    await pinHide('__sling'); await new Promise(r=>setTimeout(r,220)); await shot(`${tag}-B-noSling`);
    await unpin('__sling');  await new Promise(r=>setTimeout(r,220));
    await pinHide('__ammoGroupMeshes'); await new Promise(r=>setTimeout(r,220)); await shot(`${tag}-C-noAmmo`);
    await unpin('__ammoGroupMeshes'); await onTop(true); await new Promise(r=>setTimeout(r,220));
    await shot(`${tag}-D-ammoOnTop`); await onTop(false);
  };

  await pose('rest', null);
  await pose('half', async () => { await dragShot(0.30, 0.50, { steps: 8 }); });
  await pose('full', async () => { await dragShot(0.30, 0.98, { steps: 10 }); });
};
