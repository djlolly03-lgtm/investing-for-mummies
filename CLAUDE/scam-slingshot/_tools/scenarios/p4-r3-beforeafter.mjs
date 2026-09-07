/**
 * p4-r3-beforeafter.mjs — the same simulated instant, framed by round 2 and by round 3.
 * BEFORE is reconstructed exactly: round 2 put the projectile on a 59.0 %W mark inside a
 * 0.71x arrival frame (vw 23.2 on l1). AFTER is the live round-3 camera, untouched.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return +((v.x*0.5+0.5)*100).toFixed(1); };
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z;
  const vw = () => vh()*cam.aspect;
  const liveExtents = () => { let right=-1e9, left=1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      right=Math.max(right,t.x+(b.halfW||0.5)); left=Math.min(left,t.x-(b.halfW||0.5)); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); }
    return { left, right }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(); return { x:t.x, y:t.y }; };
  const readout = () => { const p = proje(), e = liveExtents();
    return { proj: proj(p.x,p.y), struck: proj(18.0), all: proj((e.left+e.right)/2),
             sling: proj(0.75), vw:+vw().toFixed(1) }; };
`;

export default async ({ page, game, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const tmp = path.join(OUT, '.ba'); await mkdir(tmp, { recursive: true });
  const label = (s) => page.evaluate((t) => {
    let el = document.getElementById('__lbl'); if (!el) { el = document.createElement('div'); el.id='__lbl';
      el.style.cssText='position:fixed;left:14px;top:12px;z-index:2147483647;font:700 25px ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.78);padding:7px 15px;border-radius:9px'; document.body.appendChild(el); }
    el.textContent = t; }, s);

  // Run to the first frame where the shot is level with the tower's near face.
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:0.90}); await SS.seek(300); SS.release(); SS.freeze();');
  for (let i = 0; i < 60; i++) {
    const px = await g('const p = proje(); return p ? p.x : 999;');
    if (px >= 16.3) break;
    await g('await SS.seek(20);');
  }
  await page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility='hidden'; });

  // AFTER — the live round-3 camera
  const after = await g('return readout();');
  await label(`ROUND 3 (live)   proj ${after.proj} %W   struck tower ${after.struck} %W   all standing ${after.all} %W   sling ${after.sling} %W   vw ${after.vw}`);
  await page.screenshot({ path: path.join(tmp, 'f001.png') });

  // BEFORE — round 2's own composition, reconstructed on the same instant
  const before = await g(`
    const a = W.rig.aimFraming(); const vwB = a.vw * 0.71; const p = proje();
    SS.camLock({ x: p.x - (0.590-0.5)*vwB, y: (0.775-0.5)*(vwB/cam.aspect), halfWidth: vwB/2 });
    SS.__render(); return readout();`);
  await label(`ROUND 2 (0.71x arrival, 59 %W mark)   proj ${before.proj} %W   struck tower ${before.struck} %W   all standing ${before.all} %W   sling ${before.sling} %W   vw ${before.vw}`);
  await page.screenshot({ path: path.join(tmp, 'f000.png') });
  await g('SS.camUnlock();');

  console.log('BEFORE', JSON.stringify(before));
  console.log('AFTER ', JSON.stringify(after));
  const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
  await exec('ffmpeg', ['-y','-loglevel','error','-pattern_type','glob','-i', path.join(tmp,'f*.png'),
    '-filter_complex', 'scale=1180:-1,tile=1x2:padding=10:color=0x111111', '-frames:v','1',
    path.join(OUT, '00-BEFORE-AFTER.png')]);
  await rm(tmp, { recursive: true, force: true });
};
