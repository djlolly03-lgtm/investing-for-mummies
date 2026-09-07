/**
 * crit-P1-r3-occ.mjs — CRITIC: the two numbers the first two passes could not close.
 *  (a) strap-over-ammo occlusion, from a full 4-state pixel matrix (bands x ammo)
 *  (b) camera KICK isolated from camera FOLLOW — rig.shake sampled directly, plus the
 *      ground-line series with follow left in, so both readings are on the record.
 * Nothing here steps the simulation between members of a pixel pair.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const raf2 = () => page.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(1)))));
  const vis = async (bands, ammo) => {
    await game(`const s = SS.__world.sling;
      s.bands.forEach(b=>b.tube.group.visible=args[0]);
      if (s.ammo) s.ammo.mesh.visible = args[1];
      return 1;`, bands, ammo);
    await raf2();
  };
  const crop = async (name, clip) => { const f = path.join(OUT, `${name}.png`); await page.screenshot({ path: f, clip }); return f; };
  const ammoBox = () => game(`
    const w = SS.__world, s = w.sling, cam = w.camera, VW=innerWidth, VH=innerHeight;
    const aM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const proj=(x,y,z)=>{let p=aM(cam.matrixWorldInverse,[x,y,z||0]);p=aM(cam.projectionMatrix,p);
      return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; const o=s.ammo.mesh; o.updateWorldMatrix(true,true);
    o.traverse(m=>{if(!m.isMesh||m.visible===false)return;const g=m.geometry;if(!g)return;
      if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;
      for(const cx of[b.min.x,b.max.x])for(const cy of[b.min.y,b.max.y])for(const cz of[b.min.z,b.max.z]){
        const wp=aM(m.matrixWorld,[cx,cy,cz]);const s2=proj(wp[0],wp[1],wp[2]);
        if(s2[0]<x0)x0=s2[0];if(s2[0]>x1)x1=s2[0];if(s2[1]<y0)y0=s2[1];if(s2[1]>y1)y1=s2[1];}});
    return {x0,y0,x1,y1,w:x1-x0,h:y1-y0,VW,VH};`);

  const fresh = () => game('SS.seed(11); await SS.seek(2000);');
  const matrix = {};
  for (const [tag, pow] of [['rest', 0], ['half', 0.5], ['full', 1.0]]) {
    await fresh();
    if (pow > 0) await game('await SS.aim({angle:0.42, power:args[0]}); await SS.seek(320);', pow);
    const a = await ammoBox();
    const p = Math.max(24, a.h);
    const c = { x: Math.max(0, Math.round(a.x0 - p)), y: Math.max(0, Math.round(a.y0 - p)) };
    c.width = Math.min(a.VW - c.x, Math.round(a.w + p * 2));
    c.height = Math.min(a.VH - c.y, Math.round(a.h + p * 2));
    matrix[tag] = { clip: c, ammoH: a.h, ammoW: a.w };
    await vis(true, true);   await crop(`occ-${tag}-B1A1`, c);
    await vis(false, true);  await crop(`occ-${tag}-B0A1`, c);
    await vis(true, false);  await crop(`occ-${tag}-B1A0`, c);
    await vis(false, false); await crop(`occ-${tag}-B0A0`, c);
    await vis(true, true);
  }
  await writeFile(path.join(OUT, 'occ-matrix.json'), JSON.stringify(matrix, null, 2));
  say('occ_matrix', matrix);

  /* ---- camera: kick isolated from follow ---- */
  await fresh();
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
  const cam = await game(`
    const w = SS.__world, rig = w.rig, cam = w.camera, VH = innerHeight;
    const aM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const proj=(x,y,z)=>{let p=aM(cam.matrixWorldInverse,[x,y,z||0]);p=aM(cam.projectionMatrix,p);
      return [(p[0]*0.5+0.5)*innerWidth,(-p[1]*0.5+0.5)*VH];};
    await SS.release();
    const out = []; let t = 0;
    for (let i = 0; i <= 60; i++) {
      out.push({ t: Math.round(t), shake: +rig.shake.toFixed(5), mode: rig.mode,
        camY: +cam.position.y.toFixed(5), camX: +cam.position.x.toFixed(5),
        dist: +rig.dist.toFixed(4),
        groundYpctH: +(proj(0,0,0)[1] / VH * 100).toFixed(4),
        rotZ: +cam.rotation.z.toFixed(6) });
      await SS.seek(10); t += 10;
    }
    return out;`);
  await writeFile(path.join(OUT, 'camera.json'), JSON.stringify(cam, null, 2));
  say('rig_shake_series', cam.filter(s => s.t <= 400).map(s => [s.t, s.shake]));
  say('rig_shake_peak', Math.max(...cam.map(s => s.shake)));
  say('rig_shake_below_02_after_ms', (() => { for (const s of cam) if (s.shake < 0.002 && s.t > 0) return s.t; return null; })());
  say('cam_mode_series', cam.filter(s => s.t % 50 === 0).map(s => [s.t, s.mode, s.camX, s.camY, s.dist]));
  say('rotZ_max', Math.max(...cam.map(s => Math.abs(s.rotZ))));
  console.log('### DONE');
};
