/**
 * p4-r3-zoomcost.mjs — WHAT DOES IT COST to satisfy "proj >= 55 %W AND struct <= 60 %W"?
 * At the impact instant of the canonical hitting shot, park the camera at a series of frame
 * widths, each composed so the projectile sits at exactly 55 %W, and photograph the result.
 * The point is to SEE the price of the zoom-out the arithmetic demands (vw >= 59 world units).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const liveExtents = () => { let right=-1e9, left=1e9, top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      const hw=(b.halfW||0.5), hh=(b.halfH||0.5);
      right=Math.max(right,t.x+hw); left=Math.min(left,t.x-hw); top=Math.max(top,t.y+hh); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); top=Math.max(top,t.y+0.9); }
    return { left, right, top }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(); return { x:t.x, y:t.y }; };
`;

export default async ({ page, game, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const files = [], rows = [];
  const label = (t) => page.evaluate((s) => {
    let el = document.getElementById('__lbl'); if (!el) { el = document.createElement('div'); el.id='__lbl';
      el.style.cssText='position:fixed;left:14px;top:12px;z-index:2147483647;font:700 22px ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.72);padding:5px 12px;border-radius:9px'; document.body.appendChild(el); }
    el.textContent = s; }, t);

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:0.90}); await SS.seek(300); SS.release(); await SS.seek(760);');
  await page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility='hidden'; });

  for (const vw of [23.2, 31.3, 40, 50, 59.1, 70]) {
    const r = await g(`
      const vw = args[0], aspect = cam.aspect, vh = vw/aspect;
      const p = proje(), e = liveExtents();
      const cx = p.x - 0.05*vw;               // projectile at exactly 55 %W
      const cy = (0.775-0.5)*vh;              // ground line at 77.5 %H
      SS.camLock({ x: cx, y: cy, halfWidth: vw/2 });
      SS.__render();
      const st = proj((e.left+e.right)/2, 1.5), pp = proj(p.x, p.y);
      const mainMid = 18.0;                    // the tower the shot is actually hitting
      return { vw, projPctW:pp.w, structPctW:st.w, mainTowerPctW: proj(mainMid,1.5).w,
               ammoPx: +(1.0/vw*1280).toFixed(1), blockPx: +(0.9/vw*1280).toFixed(1),
               towerWidthPctW: +(((e.right-e.left)/vw)*100).toFixed(2) };`, vw);
    rows.push(r);
    await label(`vw=${vw}  proj=${r.projPctW}%W  struct(bbox)=${r.structPctW}%W  tower(18.0)=${r.mainTowerPctW}%W`);
    const f = path.join(OUT, `vw-${String(vw).replace('.', '_')}.png`);
    await page.screenshot({ path: f });
    files.push(f);
    console.log(JSON.stringify(r));
  }
  await writeFile(path.join(OUT, 'ZOOMCOST.json'), JSON.stringify(rows, null, 1));
  await exec('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(f => ['-i', f]),
    '-filter_complex', `[0][1][2][3][4][5]xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_2h0|w0_2h0[v];[v]scale=1400:-1[o]`,
    '-map', '[o]', '-frames:v', '1', path.join(OUT, '00-ZOOMCOST-SHEET.png')]).catch(e => console.log('tile failed', e.message));
  await g('SS.camUnlock();');
};
