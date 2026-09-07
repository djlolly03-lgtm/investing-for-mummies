/**
 * crit-P1-r2c.mjs — critic probe #3 for P1 r2.
 * Timestamps that are TRUE: Physics.stepsFor(ms) = round(ms/8.333), so seek(20) really
 * advances 16.67 ms and seek(10) advances 8.33 ms. Every strip here steps in whole
 * 8.333 ms solver steps (25 ms = 3 steps, 50 ms = 6 steps) and the label is drawn INSIDE
 * the crop box, so a tile that says t=75 really is 75 ms of simulated time.
 */
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);

const P = `
const w = SS.__world; const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
 return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
const proj=(x,y,z)=>{let p=applyM(cam.matrixWorldInverse,[x,y,z||0]);p=applyM(cam.projectionMatrix,p);
 return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
const bboxScreen=(o)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,m=0;o.updateWorldMatrix(true,true);
 o.traverse(q=>{if(!q.isMesh)return;const g=q.geometry;if(!g)return;if(!g.boundingBox)g.computeBoundingBox();
  const b=g.boundingBox;if(!b)return;m++;for(const a of[b.min.x,b.max.x])for(const c of[b.min.y,b.max.y])for(const d of[b.min.z,b.max.z]){
   const wp=applyM(q.matrixWorld,[a,c,d]);const s=proj(wp[0],wp[1],wp[2]);
   if(s[0]<x0)x0=s[0];if(s[0]>x1)x1=s[0];if(s[1]<y0)y0=s[1];if(s[1]>y1)y1=s[1];}});
 return m?{x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}:null;};
const fxSpan=()=>{const o={};const pools=w.fx?.pools||{};
 for(const k of Object.keys(pools)){const p=pools[k].p,mx=pools[k].max;const L=[];
  for(let i=0;i<mx;i++) if(p.life[i]>0) L.push(proj(p.x[i],p.y[i],p.z[i]));
  if(!L.length){o[k]={n:0};continue;}
  let cx=0,cy=0,x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const s of L){cx+=s[0];cy+=s[1];if(s[0]<x0)x0=s[0];if(s[0]>x1)x1=s[0];if(s[1]<y0)y0=s[1];if(s[1]>y1)y1=s[1];}
  o[k]={n:L.length,cx:+(cx/L.length).toFixed(1),cy:+(cy/L.length).toFixed(1),x0:+x0.toFixed(1),x1:+x1.toFixed(1),y0:+y0.toFixed(1),y1:+y1.toFixed(1)};}
 return o;};
`;

export default async ({ page, shot, game, state, OUT }) => {
  const G = (b, ...a) => game(P + b, ...a);
  const R = {}; const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };
  const fresh = () => game('SS.seed(11); await SS.seek(2000);');

  const strip = async (name, clip, times, { cols = 0, scale = 620 } = {}) => {
    const tmp = path.join(OUT, `.s-${name}`);
    await rm(tmp, { recursive: true, force: true }); await mkdir(tmp, { recursive: true });
    const label = (t, cx, cy) => page.evaluate((txt, x, y) => {
      let el = document.getElementById('__lb');
      if (!el) { el = document.createElement('div'); el.id = '__lb';
        el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
          'font:700 26px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.82);' +
          'padding:3px 10px;border-radius:6px'; document.body.appendChild(el); }
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.textContent = txt;
    }, t, cx, cy).catch(() => {});
    let i = 0, prev = 0;
    for (const t of times) {
      const d = t - prev; prev = t;
      if (d > 0) await game('await SS.seek(args[0]);', d);
      await label(`t=${t}ms`, clip.x + 8, clip.y + 8);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`), clip });
      i++;
    }
    await page.evaluate(() => document.getElementById('__lb')?.remove()).catch(() => {});
    const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
    const c = Math.max(1, cols || Math.min(4, Math.ceil(Math.sqrt(files.length))));
    const rows = Math.ceil(files.length / c);
    const out = path.join(OUT, `${name}-STRIP.png`);
    await exec('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i',
      path.join(tmp, 'f*.png'), '-filter_complex',
      `scale=${scale}:-2,tile=${c}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', out]);
    await rm(tmp, { recursive: true, force: true });
    return out;
  };

  await fresh();
  const c0 = await G(`const b = bboxScreen(w.sling.group); return b;`);
  const clip = {
    x: Math.max(0, Math.round(c0.x0 - 120)), y: Math.max(0, Math.round(c0.y0 - 120)),
    width: Math.round(c0.w + 380), height: Math.round(c0.h + 250),
  };
  clip.width = Math.min(clip.width, 1280 - clip.x);
  clip.height = Math.min(clip.height, 720 - clip.y);
  say('clip', clip);

  const T = [0, 25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400];
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release(); return 1;`);
  say('band_recoil_TRUEms', await strip('band-recoil-true', clip, T, { cols: 4, scale: 520 }));

  /* the first 100 ms, 8.33 ms per tile — the hard-cut window */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release(); return 1;`);
  say('hardcut_8ms', await strip('hardcut-8ms', clip,
    [0, 8, 17, 25, 33, 42, 50, 58, 67, 75, 83, 92], { cols: 4, scale: 520 }));

  /* burst pinned? numbers at true 0/25/50/75/100/150 ms */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); return 1;`);
  const burst = await G(`
    const s = w.sling; await SS.release();
    const out = []; const T = [0,25,25,25,25,50,50,50,100];
    let acc = 0;
    for (let i=0;i<T.length;i++) {
      if (i>0) { await SS.seek(T[i]); acc += T[i]; }
      const p0 = w.projectiles?.[0];
      const am = p0?.mesh ? bboxScreen(p0.mesh) : null;
      const ps = proj(s.pouch.x, s.pouch.y, 0);
      out.push({ t: acc, pouch:[+ps[0].toFixed(1), +ps[1].toFixed(1)],
        ammo: am ? [+am.cx.toFixed(1), +am.cy.toFixed(1)] : null,
        fx: fxSpan() });
    }
    return out;
  `);
  say('burst_pinned', burst.map(b => ({
    t: b.t, pouchX: b.pouch[0], ammoX: b.ammo?.[0],
    chipN: b.fx.chip?.n, chipX0: b.fx.chip?.x0, chipX1: b.fx.chip?.x1, chipCx: b.fx.chip?.cx,
    flashN: b.fx.flash?.n, flashCx: b.fx.flash?.cx,
  })));

  await writeFile(path.join(OUT, 'M3.json'), JSON.stringify({ R, burst }, null, 2));
  console.log('### DONE3');
};
