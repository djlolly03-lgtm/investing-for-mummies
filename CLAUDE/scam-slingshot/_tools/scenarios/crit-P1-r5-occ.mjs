/** P1 r5 critic: pouch-strap occlusion of the ammo, measured in rendered pixels.
 *  Frozen first (so nothing drifts between the three shots), and visibility is pinned with
 *  defineProperty because the sling's per-frame update re-asserts .visible. */
export default async ({ shot, game, dragShot, aimPx }) => {
  const pin = (which) => game(`
    const w = SS.__world, s = w.sling;
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    const targets = [];
    if (args[0] === 'bands' || args[0] === 'both') bandArr.forEach(b => { if (b.tube) targets.push(b.tube); });
    if (args[0] === 'ammo' || args[0] === 'both') { const a = s.ammo || (w.projectiles||[])[0];
      if (a && a.mesh) targets.push(a.mesh); }
    for (const o of targets) { try { Object.defineProperty(o, 'visible', { get:()=>false, set:()=>{}, configurable:true }); } catch(e){} }
    return targets.length;`, which);

  const geo = () => game(`
    const w=SS.__world, s=w.sling, V3=w.camera.position.constructor;
    const r=w.renderer.domElement.getBoundingClientRect();
    const P=(x,y)=>{const v=new V3(x,y,0).project(w.camera);
      return {x:(v.x*.5+.5)*r.width, y:(-v.y*.5+.5)*r.height};};
    const a=s.ammo||(w.projectiles||[])[0];
    const ppu = P(1,0).x-P(0,0).x;
    return { ammoPx:P(a.mesh.position.x,a.mesh.position.y), rpx:a.radius*ppu, drawn:+s.drawn.toFixed(3) };`);

  const run = async (tag, setup) => {
    await game('SS.seed(2025); await SS.seek(1500);');
    if (setup) await setup();
    await game('SS.freeze(); SS.__world.renderer.render(SS.__world.scene, SS.__world.camera); return true;');
    const g = await geo();
    console.log('#GEO', tag, JSON.stringify(g));
    await shot(`${tag}-A-normal`);
    console.log('#PIN bands', await pin('bands'));
    await new Promise(r => setTimeout(r, 250));
    await shot(`${tag}-B-nobands`);
    console.log('#PIN ammo', await pin('ammo'));
    await new Promise(r => setTimeout(r, 250));
    await shot(`${tag}-C-none`);
  };

  await run('rest', null);
  await run('half', async () => { await dragShot(0.30, 0.50, { steps: 8 }); });
  await run('full', async () => { await dragShot(0.30, 0.98, { steps: 10 }); });
};
