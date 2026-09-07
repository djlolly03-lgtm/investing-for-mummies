/** P4 critic — portrait phone: rubric criteria 1 (horizon), 3 (sling/target %W), 8 (FOV read). */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = cam.position.clone(); v.set(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const dist = () => cam.position.z;
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*dist();
  const vw = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:cam.fov, aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(3), vh:+vh().toFixed(3),
      q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w].map(v=>+v.toFixed(7)) });
  const liveTop = () => { let top=-1e9;
    for (const b of W.blocks) if(!b.dead){const t=b.body.translation(); top=Math.max(top,t.y+(b.halfH||0.5));}
    for (const v of W.villains) if(v.alive){const t=v.body.translation(); top=Math.max(top,t.y+0.9);} return top; };
`;

export default async ({ page, shot, game, state, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = {};
  await g('await SS.seed(3); await SS.seek(2600);');
  M.state = await state();
  await shot('portrait-aim-hud');
  await page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; });
  await shot('portrait-aim-nohud');
  M.aim = await g(`
    const sl = proj(0,3.50), tgt = proj(23.35,0.6), tall = proj(18, liveTop()), gr = proj(9,0);
    const out=[]; for (const x of [0, 6, 12, 18, 23.35]) { const a=proj(x,0.44,0.6), b=proj(x,3.04,0.6), bk=proj(x,3.04,-0.6);
      out.push({ x, pctW:a.w, edgeAngleDeg:+(Math.atan2(b.w-a.w, a.h-b.h)*180/Math.PI).toFixed(3), depthWedgePctW:+(bk.w-b.w).toFixed(3) }); }
    return { cam: camI(), slingPctW: sl.w, targetPctW: tgt.w, tallestTopPctH: tall.h, groundPctH: gr.h, edges: out };`);
  await page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });
  await g('SS.aim({angle:0.30,power:1.0}); await SS.seek(500);');
  await shot('portrait-drawn-hud');
  M.drawn = await g('return { cam: camI(), sling: proj(0,3.5), target: proj(23.35,0.6) };');
  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify(M, null, 2));
};
