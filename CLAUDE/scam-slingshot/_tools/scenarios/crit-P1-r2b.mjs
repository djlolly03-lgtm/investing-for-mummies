/**
 * crit-P1-r2b.mjs — critic probe #2 for P1 round 2.
 *  (a) four-render occlusion measurement (background / ammo-only / bands-only / full)
 *      so "the strap occludes >= 15 % of the ammo silhouette" becomes a real number.
 *  (b) camera KICK isolated from camera FOLLOW: shake offset = cam.position - rig.pos.
 *  (c) recoil settle measured in PIXELS, sampled at 5 ms.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const P = `
const w = SS.__world;
const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM = (m, p) => { const e=m.elements;
  const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
  return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
          (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
          (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw]; };
const proj = (x,y,z) => { let p = applyM(cam.matrixWorldInverse,[x,y,z||0]);
  p = applyM(cam.projectionMatrix,p); return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH]; };
const bboxScreen = (obj) => { let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,m=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o=>{ if(!o.isMesh) return; const g=o.geometry; if(!g) return;
    if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox; if(!b) return; m++;
    for(const cx of [b.min.x,b.max.x]) for(const cy of [b.min.y,b.max.y]) for(const cz of [b.min.z,b.max.z]){
      const wp=applyM(o.matrixWorld,[cx,cy,cz]); const s=proj(wp[0],wp[1],wp[2]);
      if(s[0]<x0)x0=s[0]; if(s[0]>x1)x1=s[0]; if(s[1]<y0)y0=s[1]; if(s[1]>y1)y1=s[1]; }});
  return m?{x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}:null; };
const showBands = (v) => w.sling.bands.forEach(b=>b.tube.group.visible=v);
const showAmmo  = (v) => { if (w.sling.ammo?.mesh) w.sling.ammo.mesh.visible = v; };
`;

export default async ({ page, shot, game, state, OUT }) => {
  const G = (b, ...a) => game(P + b, ...a);
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };
  const crop = async (n, clip) => { const f = path.join(OUT, `${n}.png`); await page.screenshot({ path: f, clip }); return f; };
  const fresh = () => game('SS.seed(11); await SS.seek(2000);');

  /* ---------------- (a) OCCLUSION, four renders per stretch --------------- */
  for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
    await fresh();
    if (p > 0) await G(`await SS.aim({angle:0.42, power:args[0]}); await SS.seek(320); return 1;`, p);
    else await G(`await SS.seek(320); return 1;`);
    const a = await G(`const b = bboxScreen(w.sling.ammo.mesh); return b;`);
    const pad = Math.max(18, a.h * 0.7);
    const clip = {
      x: Math.max(0, Math.round(a.x0 - pad)), y: Math.max(0, Math.round(a.y0 - pad)),
      width: Math.round(a.w + pad * 2), height: Math.round(a.h + pad * 2),
    };
    clip.width = Math.min(clip.width, 1280 - clip.x);
    clip.height = Math.min(clip.height, 720 - clip.y);
    const tag = `occ-${String(p).replace('.', '')}`;
    await G(`showBands(true); showAmmo(true); SS.stepOnce(); return 1;`); await crop(`${tag}-FULL`, clip);
    await G(`showBands(false); showAmmo(true); SS.stepOnce(); return 1;`); await crop(`${tag}-AMMO`, clip);
    await G(`showBands(true); showAmmo(false); SS.stepOnce(); return 1;`); await crop(`${tag}-BAND`, clip);
    await G(`showBands(false); showAmmo(false); SS.stepOnce(); return 1;`); await crop(`${tag}-BG`, clip);
    await G(`showBands(true); showAmmo(true); SS.stepOnce(); return 1;`);
    say(`${tag}_clip`, clip);
  }

  /* ---------------- (b) CAMERA KICK, isolated from FOLLOW ------------------ */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); return 1;`);
  const kick = await G(`
    const rig = w.rig;
    const info = await SS.release();
    const out = []; let t = 0;
    for (let i=0;i<=120;i++) {
      const hh = rig._hh ?? null;
      out.push({ t:+t.toFixed(1),
        shake:+(rig.shake??0).toFixed(5),
        sx:+(cam.position.x - rig.pos.x).toFixed(5),
        sy:+(cam.position.y - rig.pos.y).toFixed(5),
        hh: hh!=null?+hh.toFixed(4):null,
        rotZ:+cam.rotation.z.toFixed(8) });
      await SS.seek(5); t += 5;
    }
    return { info, out };
  `);
  const hh = kick.out.find(o => o.hh)?.hh ?? null;
  const pctH = (v) => hh ? +(Math.abs(v) / (2 * hh) * 100).toFixed(3) : null;
  const early = kick.out.filter(o => o.t <= 100);
  say('kick_peak_sy_pctH_0_100ms', Math.max(...early.map(o => pctH(o.sy) ?? 0)));
  say('kick_peak_sx_pctH_0_100ms', Math.max(...early.map(o => pctH(o.sx) ?? 0)));
  say('kick_peak_sy_pctH_all', Math.max(...kick.out.map(o => pctH(o.sy) ?? 0)));
  say('kick_series', kick.out.filter(o => o.t % 10 === 0 && o.t <= 400)
    .map(o => ({ t: o.t, shake: o.shake, syPctH: pctH(o.sy), sxPctH: pctH(o.sx) })));
  say('kick_zero_after_ms', (() => { for (const o of kick.out) if (o.shake === 0) return o.t; return null; })());
  say('kick_below_0p2pctH_after_ms', (() => {
    for (let i = 0; i < kick.out.length; i++)
      if (kick.out.slice(i).every(o => (pctH(o.sy) ?? 0) < 0.2 && (pctH(o.sx) ?? 0) < 0.2)) return kick.out[i].t;
    return null;
  })());
  say('cam_rotZ_max', Math.max(...kick.out.map(o => Math.abs(o.rotZ))));
  await writeFile(path.join(OUT, 'kick.json'), JSON.stringify(kick, null, 2));

  /* ---------------- (c) RECOIL in PIXELS, 5 ms ---------------------------- */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); return 1;`);
  const rec = await G(`
    const s = w.sling;
    const dx = s.anchor.x - s.pouch.x, dy = s.anchor.y - s.pouch.y;
    const L = Math.hypot(dx,dy)||1; const ux = dx/L, uy = dy/L;
    const a0 = proj(s.anchor.x, s.anchor.y, 0);
    await SS.release();
    const out = []; let t = 0;
    for (let i=0;i<=100;i++) {
      const ps = proj(s.pouch.x, s.pouch.y, 0);
      const off = (s.pouch.x-s.anchor.x)*ux + (s.pouch.y-s.anchor.y)*uy;
      out.push({ t, off:+off.toFixed(6), px:+Math.hypot(ps[0]-a0[0], ps[1]-a0[1]).toFixed(3),
                 sgnPx:+(off>=0?1:-1)*+Math.hypot(ps[0]-a0[0], ps[1]-a0[1]).toFixed(3),
                 state:s.state, simTime:+w.simTime.toFixed(4), hitStop:w.hitStop });
      await SS.seek(5); t += 5;
    }
    return out;
  `);
  await writeFile(path.join(OUT, 'recoil.json'), JSON.stringify(rec, null, 2));
  const ext = [];
  for (let i = 1; i < rec.length - 1; i++)
    if ((rec[i].sgnPx - rec[i - 1].sgnPx) * (rec[i + 1].sgnPx - rec[i].sgnPx) < 0)
      ext.push({ t: rec[i].t, px: rec[i].sgnPx });
  say('recoil_extrema_px', ext);
  say('recoil_first_px', rec[0]);
  say('recoil_still_under_1px_after_ms', (() => {
    for (let i = 0; i < rec.length; i++) if (rec.slice(i).every(r => Math.abs(r.sgnPx) < 1)) return rec[i].t;
    return null;
  })());
  say('recoil_still_under_0p5px_after_ms', (() => {
    for (let i = 0; i < rec.length; i++) if (rec.slice(i).every(r => Math.abs(r.sgnPx) < 0.5)) return rec[i].t;
    return null;
  })());
  say('simTime_vs_seek', rec.filter(r => r.t % 50 === 0).map(r => ({ t: r.t, sim: r.simTime, state: r.state })));

  /* ---------------- (d) AD honesty: ammo size at rest vs stretch ---------- */
  await fresh();
  say('ammo_scale_rest', await G(`
    const m = w.sling.ammo.mesh; const b = bboxScreen(m);
    return { scale:[+m.scale.x.toFixed(4),+m.scale.y.toFixed(4),+m.scale.z.toFixed(4)],
             rotZ:+m.rotation.z.toFixed(4), bbox:{w:+b.w.toFixed(2),h:+b.h.toFixed(2)} };`));
  await G(`await SS.aim({angle:0.42, power:1.0}); await SS.seek(320); return 1;`);
  say('ammo_scale_full', await G(`
    const m = w.sling.ammo.mesh; const b = bboxScreen(m);
    return { scale:[+m.scale.x.toFixed(4),+m.scale.y.toFixed(4),+m.scale.z.toFixed(4)],
             rotZ:+m.rotation.z.toFixed(4), bbox:{w:+b.w.toFixed(2),h:+b.h.toFixed(2)} };`));

  await writeFile(path.join(OUT, 'MEASUREMENTS2.json'), JSON.stringify(R, null, 2));
  console.log('### DONE2');
};
