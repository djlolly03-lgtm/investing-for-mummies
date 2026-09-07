/**
 * CRITIC P1 round 6 — part B. Same criteria, but every mask set is taken with the world FROZEN
 * (driven mode), because in r6a the wall-clock background animated between the A/B/C/D screenshots
 * and poisoned every pixel diff (ammo "silhouette" bbox spanned the whole frame).
 *
 * Adds: mask E (bands visible, ammo hidden) for the rest-vs-full silhouette comparison,
 * a per-particle release-burst extent probe, and a band-vs-launch-VFX pixel count at the sling.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const M = {};
  const log = (k, v) => { M[k] = v; console.log('#', k, JSON.stringify(v)); };

  const geom = () => game(`
    const w = SS.__world, s = w.sling, V3 = w.camera.position.constructor;
    const r = w.renderer.domElement.getBoundingClientRect();
    const P=(x,y,z=0)=>{const v=new V3(x,y,z).project(w.camera);
      return {x:+((v.x*.5+.5)*r.width).toFixed(3), y:+((-v.y*.5+.5)*r.height).toFixed(3)};};
    const a=P(0,0), b=P(1,0);
    const ammo = s.ammo || (w.projectiles||[])[0];
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    return { ppu:+(b.x-a.x).toFixed(4), drawn:+s.drawn.toFixed(4), state:s.state,
      pouchPx:P(s.pouch.x,s.pouch.y), tipLPx:P(s._tipL.x,s._tipL.y), tipRPx:P(s._tipR.x,s._tipR.y),
      tipSpan:+(s._tipR.x-s._tipL.x).toFixed(4),
      ammoPx: ammo&&ammo.mesh ? P(ammo.mesh.position.x, ammo.mesh.position.y) : null,
      bands: bandArr.map(b=>({side:b.side,pouchR:+b.pouchRadius.toFixed(4),prongR:+b.prongRadius.toFixed(4),
        len:+b.rubberLength.toFixed(4)})), driven: SS.driven(), simTime:+(w.simTime||0).toFixed(4) };`);

  const setVis = (which, on) => game(`
    const w=SS.__world, s=w.sling, which=args[0], on=args[1];
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    if (which==='bands') bandArr.forEach(b=>{ if(b.tube) b.tube.group.visible=on; });
    if (which==='ammo'){ const a=s.ammo||(w.projectiles||[])[0]; if(a&&a.mesh) a.mesh.visible=on; }
    if (which==='prongs') (s.prongs||[]).forEach(p=>{p.tube.group.visible=on;p.cap.visible=on;p.whip.visible=on;});
    if (which==='fx') Object.values(w.fx?w.fx.pools:{}).forEach(p=>{p.mesh.visible=on;});
    w.renderer.render(w.scene,w.camera); return true;`, which, on);

  // FROZEN mask set — A normal / B no-bands / C no-bands-no-ammo / D no-prongs / E no-ammo
  const maskSet = async (tag) => {
    await game('SS.freeze(); return true;');
    const g = await geom();
    const A = await shot(`${tag}-A-normal`);
    await setVis('bands', false);            const B = await shot(`${tag}-B-nobands`);
    await setVis('ammo', false);             const C = await shot(`${tag}-C-nobands-noammo`);
    await setVis('bands', true);             const E = await shot(`${tag}-E-noammo`);
    await setVis('ammo', true);
    await setVis('prongs', false);           const D = await shot(`${tag}-D-noprongs`);
    await setVis('prongs', true);
    await game('const w=SS.__world; w.renderer.render(w.scene,w.camera); return true;');
    return { tag, geom: g, files: [A,B,C,E,D].map(f=>path.basename(f)) };
  };

  // ---------------- rest / half / full / steep, all frozen ----------------
  await game('SS.seed(7); await SS.seek(1500);');
  const rest = await maskSet('rest');  log('rest', rest);

  await game('SS.seed(7); await SS.seek(1500);');
  await dragShot(0.30, 0.50, { steps: 8 });
  const half = await maskSet('half');  log('half', half);

  await game('SS.seed(7); await SS.seek(1500);');
  await dragShot(0.30, 1.00, { steps: 12 });
  const full = await maskSet('full');  log('full', full);

  await game('SS.seed(7); await SS.seek(1500);');
  await dragShot(0.62, 0.95, { steps: 10 });
  const steep = await maskSet('steep'); log('steep', steep);

  // ---------------- release burst: per-particle extents -------------------
  const burst = () => game(`
    const w=SS.__world, s=w.sling, V3=w.camera.position.constructor;
    const r=w.renderer.domElement.getBoundingClientRect();
    const P=(x,y)=>{const v=new V3(x,y,0).project(w.camera);
      return {x:+((v.x*.5+.5)*r.width).toFixed(1), y:+((-v.y*.5+.5)*r.height).toFixed(1)};};
    const ammo=(w.projectiles||[])[0];
    const ax = ammo? ammo.mesh.position.x : null, ay = ammo? ammo.mesh.position.y : null;
    const px = s.pouch.x, py = s.pouch.y;
    const out = { pouch:{x:+px.toFixed(3),y:+py.toFixed(3)}, ammo: ammo?{x:+ax.toFixed(3),y:+ay.toFixed(3)}:null,
                  pouchPx:P(px,py), ammoPx: ammo?P(ax,ay):null, pools:{} };
    for (const [k,p] of Object.entries(w.fx?w.fx.pools:{})) {
      const d=[], dp=[], da=[];
      for (let i=0;i<p.max;i++) if (p.p.life[i]>0) {
        const x=p.p.x[i], y=p.p.y[i];
        d.push([x,y]); dp.push(Math.hypot(x-px,y-py)); if (ammo) da.push(Math.hypot(x-ax,y-ay));
      }
      if (!d.length) continue;
      const xs=d.map(v=>v[0]), ys=d.map(v=>v[1]);
      const q=(a,f)=>{const b=[...a].sort((m,n)=>m-n); return +b[Math.floor(f*(b.length-1))].toFixed(2);};
      out.pools[k]={ n:d.length,
        minX:+Math.min(...xs).toFixed(2), maxX:+Math.max(...xs).toFixed(2),
        minY:+Math.min(...ys).toFixed(2), maxY:+Math.max(...ys).toFixed(2),
        distPouch:{ min:q(dp,0), p25:q(dp,.25), med:q(dp,.5), p75:q(dp,.75), max:q(dp,1) },
        distAmmo: da.length? { min:q(da,0), med:q(da,.5), max:q(da,1) } : null,
        nearPouch2AD: dp.filter(v=>v<=1.9).length, nearAmmo2AD: da.filter(v=>v<=1.9).length };
    }
    return out;`);

  await game('SS.seed(7); await SS.seek(1500);');
  await dragShot(0.30, 0.95, { steps: 12 });
  const rel = await game('return SS.release();');
  log('release_report', rel);
  const B = [];
  const tt = [0, 25, 25, 30, 40, 40, 50, 50];
  let t = 0;
  B.push({ t: 0, ...(await burst()) });
  for (const s of tt.slice(1)) { await game('await SS.seek(args[0]);', s); t += s; B.push({ t, ...(await burst()) }); }
  log('burst_extent', B);

  // band vs launch-VFX pixel weight inside a box at the sling (independent of the builder's own probe)
  await game('SS.seed(7); await SS.seek(1500);');
  await dragShot(0.30, 0.95, { steps: 12 });
  await game('return SS.release();');
  for (const ms of [0, 40, 80, 160]) {
    if (ms) await game('await SS.seek(args[0]);', ms === 40 ? 40 : ms === 80 ? 40 : 80);
    await game('SS.freeze(); return true;');
    const g = await geom();
    await shot(`sling-t${String(ms).padStart(3,'0')}-A-all`);
    await setVis('fx', false);   await shot(`sling-t${String(ms).padStart(3,'0')}-B-nofx`);
    await setVis('bands', false); await shot(`sling-t${String(ms).padStart(3,'0')}-C-nofx-nobands`);
    await setVis('bands', true); await setVis('fx', true);
    log(`sling_geom_t${ms}`, g);
  }

  await writeFile(path.join(OUT, 'measure.json'), JSON.stringify(M, null, 1));
  console.log('WROTE measure.json');
};
