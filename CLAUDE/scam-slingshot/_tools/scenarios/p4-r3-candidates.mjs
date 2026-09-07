/** p4-r3-candidates.mjs — six candidate IMPACT frames, tiled, so the choice is made by eye. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(2), h:+((1-(v.y*0.5+0.5))*100).toFixed(2) }; };
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
  const tmp = path.join(OUT, '.cand'); await mkdir(tmp, { recursive: true });
  const label = (s) => page.evaluate((t) => {
    let el = document.getElementById('__lbl'); if (!el) { el = document.createElement('div'); el.id='__lbl';
      el.style.cssText='position:fixed;left:14px;top:12px;z-index:2147483647;font:700 26px ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.75);padding:6px 14px;border-radius:9px'; document.body.appendChild(el); }
    el.textContent = t; }, s);

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:0.90}); await SS.seek(300); SS.release(); await SS.seek(760);');
  await page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility='hidden'; });

  // [tag, vw, mode, value]  mode 'proj' = put projectile at value %W ; 'tower' = put x=18 at value %W
  const CAND = [
    ['A now',  23.2, 'proj', 58.5],
    ['B',      28,   'proj', 57.0],
    ['C',      32,   'proj', 56.0],
    ['D',      36,   'proj', 55.5],
    ['E',      40,   'proj', 55.5],
    ['F ABish',26,   'tower', 52.0],
  ];
  const rows = [];
  let i = 0;
  for (const [tag, vw, mode, val] of CAND) {
    const r = await g(`
      const [tag, vw, mode, val] = args;
      const aspect = cam.aspect, vh = vw/aspect;
      const p = proje(), e = liveExtents();
      const anchor = mode === 'proj' ? p.x : 18.0;
      const cx = anchor - (val/100 - 0.5)*vw;
      SS.camLock({ x: cx, y: (0.775-0.5)*vh, halfWidth: vw/2 });
      SS.__render();
      const st = proj((e.left+e.right)/2, 1.5), pp = proj(p.x, p.y);
      return { tag, vw, projPctW: pp.w, structBboxPctW: st.w, towerPctW: proj(18.0,1.5).w,
               slingPctW: proj(0.75,1.5).w, contentLeftPctW: proj(e.left,1.5).w, contentRightPctW: proj(e.right,1.5).w,
               blockPx: +(0.9/vw*1280).toFixed(0) };`, tag, vw, mode, val);
    rows.push(r);
    await label(`${tag}  vw=${vw}  proj=${r.projPctW}  tower=${r.towerPctW}  bbox=${r.structBboxPctW}  sling=${r.slingPctW}`);
    await page.screenshot({ path: path.join(tmp, `f${String(i++).padStart(3,'0')}.png`) });
    console.log(JSON.stringify(r));
  }
  await writeFile(path.join(OUT, 'CANDIDATES.json'), JSON.stringify(rows, null, 1));
  const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
  await exec('ffmpeg', ['-y','-loglevel','error','-pattern_type','glob','-i', path.join(tmp,'f*.png'),
    '-filter_complex', `scale=900:-1,tile=2x3:padding=10:color=0x111111`, '-frames:v','1',
    path.join(OUT, '00-CANDIDATES.png')]);
  await rm(tmp, { recursive: true, force: true });
  await g('SS.camUnlock();');
};
