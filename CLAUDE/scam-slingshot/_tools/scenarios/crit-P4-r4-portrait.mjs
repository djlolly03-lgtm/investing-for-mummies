/**
 * crit-P4-r4-portrait.mjs — P4 round-4 critic, PORTRAIT PHONE.
 * RUBRIC §P4 "Where we legitimately differ": judge portrait against criteria 1, 3 and 8.
 *   1 horizon 40-60 %H, fixed during an X pan
 *   3 sling 10-18 %W, furthest target 82-92 %W, gap empty
 *   8 vertical edges near-parallel (28-35 deg call)
 * Plus the anti-gaming scale block: portrait must be solved by pulling BACK and accepting a
 * taller sky band, NOT by cropping the target out — so the target's on-screen position and the
 * play geometry's on-screen size are both recorded.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const V3 = cam.position.constructor;
  const proj = (x,y,z) => { const v = new V3(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z;
  const vw = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:+cam.fov.toFixed(3), aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(4), vh:+vh().toFixed(4),
      roll:+cam.quaternion.z.toFixed(8) });
  const standing = () => { const out=[];
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      out.push({ x:t.x, y:t.y, hw:(b.w||1)/2, hh:(b.h||1)/2 }); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      out.push({ x:t.x, y:t.y, hw:(v.radius||0.5), hh:(v.radius||0.5)*1.5 }); }
    return out; };
  const extents = () => { const s=standing(); if(!s.length) return null;
    let l=1e9,r=-1e9,t=-1e9,b=1e9,sx=0,n=0;
    for (const o of s){ l=Math.min(l,o.x-o.hw); r=Math.max(r,o.x+o.hw); t=Math.max(t,o.y+o.hh); b=Math.min(b,o.y-o.hh); sx+=o.x; n++; }
    return { left:+l.toFixed(3), right:+r.toFixed(3), top:+t.toFixed(3), bottom:+b.toFixed(3), cx:+(sx/n).toFixed(3), n }; };
  const scale = () => { let bw=null,bh=null;
    for (const b of W.blocks) if(!b.dead){ bw=b.w; bh=b.h; break; }
    let vhh=null; for (const v of W.villains) if (v.alive) { vhh=(v.radius||0.5)*2; break; }
    const e=extents();
    return { vw:+vw().toFixed(3), vh:+vh().toFixed(3),
      blockWpctW: bw!=null?+((bw/vw())*100).toFixed(3):null,
      villainHpctH: vhh!=null?+((vhh/vh())*100).toFixed(3):null,
      structExtentPctW: e?+(((e.right-e.left)/vw())*100).toFixed(3):null,
      structHeightPctH: e?+(((e.top-e.bottom)/vh())*100).toFixed(3):null }; };
`;

export default async ({ shot, filmstrip, game, state, OUT }) => {
  const M = { note: 'P4 r4 critic, portrait 390x844.' };
  const g = (b, ...a) => game(PRE + b, ...a);
  const SETUP = 'await SS.seed(11); await SS.seek(2600);';

  await g(SETUP);
  M.state = await state();
  M.aim = await g(`
    const e=extents(), a=W.sling.anchor;
    const sp=proj(a.x,a.y);
    let bv=null; for (const v of W.villains) if (v.alive) { const t=v.body.translation(); if(!bv||t.x>bv.x) bv={x:t.x,y:t.y}; }
    const fv = bv?proj(bv.x,bv.y):null;
    return { cam:camI(), scale:scale(), extents:e,
             slingPctW: sp.w, slingPctH: sp.h,
             farBlockEdgePctW: proj(e.right,0.8).w, farVillainPctW: fv&&fv.w, farVillainPctH: fv&&fv.h,
             tallestTopPctH: proj(e.cx,e.top).h, groundPctH: proj(e.cx,0).h };`);
  await shot('portrait-aim');

  // fov / vertical-edge read
  M.fov = await g(`
    const e=extents(), out=[];
    for (const x of [e.left-4, e.left, e.cx, e.right, e.right+4]) {
      const a=proj(x,0.4,0.6), b=proj(x,3.4,0.6), back=proj(x,3.4,-0.6);
      out.push({ x:+x.toFixed(2), pctW:a.w, edgeAngleDeg:+(Math.atan2(b.w-a.w, a.h-b.h)*180/Math.PI).toFixed(3),
                 depthWedgePctW:+(back.w-b.w).toFixed(3) }); }
    return { fovDeg:+cam.fov.toFixed(2), edges: out };`);

  // pan: horizon must not move
  const FIRE = SETUP + ' SS.aim({angle:0.30, power:0.90}); await SS.seek(600); SS.release();';
  const pan = [];
  for (const t of [0, 250, 500, 750, 1000]) {
    await g(FIRE + ' await SS.seek(args[0]);', t);
    await shot(`portrait-pan-t${t}`);
    pan.push({ t, ...(await g('return { cam:camI(), scale:scale() };')) });
  }
  M.pan = pan;

  await g(FIRE);
  await filmstrip('portrait-flight', { from: 100, to: 1300, step: 200, cols: 3 });

  await g(FIRE + ' await SS.seek(8000);');
  M.settle = await state();
  await shot('portrait-settled');

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({ AIM: M.aim, FOV: M.fov, PAN: M.pan.map(p=>({t:p.t, ...p.cam})), STATE: M.settle }, null, 2));
};
