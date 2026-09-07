/**
 * crit-P4-r1b.mjs — P4 critic, pass 2: a shot that ACTUALLY HITS (angle 0.30, power 1.0 —
 * verified by sweep to hit the tower and leave one survivor), so the lead / shake / auto-frame
 * criteria are measured on a real shot rather than an overshoot.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = cam.position.clone(); v.set(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const dist = () => cam.position.z;
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*dist();
  const vw = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:cam.fov, aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(4),
      q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w].map(v=>+v.toFixed(7)) });
  const proje = () => { const p=W.projectiles.filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel(); return { x:t.x, y:t.y, vx:v.x, vy:v.y }; };
  const aliveCore = () => { // centroid + span of everything still standing (blocks + villains)
    let n=0,sx=0,minx=1e9,maxx=-1e9,maxy=-1e9;
    for (const b of W.blocks) if(!b.dead){const t=b.body.translation();n++;sx+=t.x;minx=Math.min(minx,t.x);maxx=Math.max(maxx,t.x);maxy=Math.max(maxy,t.y);}
    for (const v of W.villains) if(v.alive){const t=v.body.translation();n++;sx+=t.x;minx=Math.min(minx,t.x);maxx=Math.max(maxx,t.x);maxy=Math.max(maxy,t.y);}
    return n?{cx:sx/n,minx,maxx,maxy}:null; };
  const SHOT = 'SS.aim({angle:0.30,power:1.0});';
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = {};
  const g = (b, ...a) => game(PRE + b, ...a);
  const hide = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; });
  const show = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });

  const an = await page.browser().newPage();
  await an.setContent('<canvas id="c"></canvas>');
  const horizonOf = async (file, colfrac) => {
    const b64 = (await readFile(file)).toString('base64');
    return an.evaluate(async (src, cf) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data; const W = c.width, H = c.height;
      const L = (x, y) => { const i = ((y * W) + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; };
      const rgb = (x, y) => { const i = ((y * W) + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      const col = Math.round(W * cf);
      // horizon = the first row (top-down, below 30 %H) where the pixel stops being sky-blue
      // (blue channel dominant by >18) and becomes land (green/brown dominant).
      for (let y = Math.round(H * 0.30); y < Math.round(H * 0.95); y++) {
        const p = rgb(col, y);
        if (p[2] < p[1] - 8 && p[1] > p[2]) {          // green/brown, not sky
          const p2 = rgb(col, y + 6);
          if (p2[2] < p2[1] - 8) return { pctH: +(y / H * 100).toFixed(2), rgb: p, lum: +L(col, y).toFixed(1) };
        }
      }
      return { pctH: null };
    }, 'data:image/png;base64,' + b64, colfrac);
  };

  // ---------------- flight lead, on a shot that hits ----------------
  await g('await SS.seed(3); await SS.seek(2600);' + 'SS.aim({angle:0.30,power:1.0}); await SS.seek(300); SS.release();');
  const lead = [];
  for (let t = 0; t <= 1200; t += 50) {
    lead.push(await g(`
      const p = proje(); const st = proj(18.0, 3.0); const gl = proj(cam.position.x, 0);
      return { t: args[0], pW: p?proj(p.x,p.y).w:null, pH: p?proj(p.x,p.y).h:null,
               wx: p?+p.x.toFixed(2):null, structPctW: st.w, groundPctH: gl.h,
               camx:+cam.position.x.toFixed(3), camy:+cam.position.y.toFixed(4), camz:+cam.position.z.toFixed(4),
               roll:+cam.quaternion.z.toFixed(7), blocksAlive: W.blocks.filter(b=>!b.dead).length,
               hs: W.hitStop };`, t));
    await g('await SS.seek(50);');
  }
  M.lead = lead;

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:1.0}); await SS.seek(300); SS.release();');
  await hide();
  const strip = await filmstrip('lead-hit', { from: 100, to: 900, step: 100, cols: 3 });
  await show();
  M.leadStrip = path.basename(strip);

  // ---------------- horizon stability under the pan ----------------
  const hz = [];
  for (const t of [0, 200, 400, 600, 800]) {
    await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:1.0}); await SS.seek(300); SS.release(); await SS.seek(args[0]);', t);
    await hide();
    const f = await shot('pan-t' + t);
    await show();
    hz.push({ t, cam: await g('return camI();'),
              h30: await horizonOf(f, 0.30), h45: await horizonOf(f, 0.45), h60: await horizonOf(f, 0.60) });
  }
  M.horizonUnderPan = hz;

  // ---------------- shake at impact ----------------
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:1.0}); await SS.seek(300); SS.release();');
  const sh = [];
  for (let t = 0; t <= 2400; t += 20) {
    sh.push(await g(`
      const gl = proj(cam.position.x, 0);
      let asleep=0, tot=0; for (const b of W.blocks) if(!b.dead){tot++; if(b.body.isSleeping()) asleep++;}
      return { t:args[0], glH: gl.h, camx:+cam.position.x.toFixed(4), camy:+cam.position.y.toFixed(5),
               camz:+cam.position.z.toFixed(4), roll:+cam.quaternion.z.toFixed(7),
               asleep, tot, debris: W.debris.length, hs: W.hitStop };`, t));
    await g('await SS.seek(20);');
  }
  M.shake = sh;

  // ---------------- settle / auto-frame with a survivor ----------------
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:1.0}); await SS.seek(300); SS.release(); await SS.seek(7000);');
  M.settleState = await state();
  M.settle = await g(`
    const out=[]; for (const v of W.villains) if (v.alive) { const t=v.body.translation(); const p=proj(t.x,t.y);
      out.push({x:+t.x.toFixed(2),y:+t.y.toFixed(2),pctW:p.w,pctH:p.h,
                marginW:+Math.min(p.w,100-p.w).toFixed(2), marginH:+Math.min(p.h,100-p.h).toFixed(2)}); }
    return { villains: out, core: aliveCore(), cam: camI(), sling: proj(0,3.5) };`);
  await hide(); const settled = await shot('settled-survivor-nohud'); await show();
  M.settledShot = path.basename(settled);
  const drift = [];
  for (let t = 0; t <= 1500; t += 100) {
    drift.push(await g('return { t:args[0], x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5) };', t));
    await g('await SS.seek(100);');
  }
  M.settleDrift = drift;

  // ---------------- level cleared: does the camera frame the aftermath ----------------
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.18,power:1.0}); await SS.seek(300); SS.release(); await SS.seek(7000);');
  M.wonState = await state();
  await hide(); await shot('won-aftermath-nohud'); await show();

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({ settle: M.settle, settleState: M.settleState, horizon: M.horizonUnderPan }, null, 2));
  await an.close();
};
