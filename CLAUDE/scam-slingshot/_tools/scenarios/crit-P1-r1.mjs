/**
 * crit-P1-r1.mjs — INDEPENDENT CRITIC capture for P1 (Launch feel), round 1.
 * Written by the critic. Measures, does not trust.
 */
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);

/* ---- in-page measurement toolkit, injected as a string prelude ------------- */
const PRELUDE = `
const w = SS.__world;
const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM = (m, p) => {
  const e = m.elements;
  const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
  return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
          (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
          (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];
};
const proj = (x,y,z) => {
  let p = applyM(cam.matrixWorldInverse, [x,y,z]);
  p = applyM(cam.projectionMatrix, p);
  return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH];
};
const bboxScreen = (obj) => {
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9, meshes=0;
  obj.updateWorldMatrix(true, true);
  obj.traverse(o => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    meshes++;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const wp = applyM(o.matrixWorld, [cx,cy,cz]);
      const s = proj(wp[0],wp[1],wp[2]);
      if (s[0]<x0)x0=s[0]; if (s[0]>x1)x1=s[0]; if (s[1]<y0)y0=s[1]; if (s[1]>y1)y1=s[1];
    }
  });
  return meshes ? {x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2,meshes} : null;
};
/* Cross-section radius of a swept tube, sampled along its length.
   Groups vertices by their position along the tube's dominant axis and reports the
   mean distance of the ring from the ring centre — i.e. the actual strap thickness. */
const radiusProfile = (g) => {
  const pos = g.attributes?.position; if (!pos) return null;
  const n = pos.count; const P = pos.array;
  // find dominant axis
  let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
  for (let i=0;i<n;i++) for (let k=0;k<3;k++){ const v=P[i*3+k]; if(v<mn[k])mn[k]=v; if(v>mx[k])mx[k]=v; }
  const ext = [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]];
  const ax = ext.indexOf(Math.max(...ext));
  const BINS = 12; const bins = Array.from({length:BINS},()=>[]);
  for (let i=0;i<n;i++){
    const t = (P[i*3+ax]-mn[ax]) / (ext[ax]||1);
    const b = Math.min(BINS-1, Math.floor(t*BINS));
    bins[b].push([P[i*3],P[i*3+1],P[i*3+2]]);
  }
  return bins.map(bin => {
    if (bin.length < 3) return null;
    const c=[0,0,0]; for(const v of bin){c[0]+=v[0];c[1]+=v[1];c[2]+=v[2];}
    c[0]/=bin.length;c[1]/=bin.length;c[2]/=bin.length;
    let r=0; for(const v of bin){ r+=Math.hypot(v[0]-c[0],v[1]-c[1],v[2]-c[2]); }
    return +(r/bin.length).toFixed(5);
  });
};
const hex = (m) => { const c = m?.material?.color; return c ? '#'+c.getHexString() : null; };
const lum = (h) => { if(!h) return null; const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
  const f=(v)=> v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  return +(0.2126*f(r)+0.7152*f(g)+0.0722*f(b)).toFixed(4); };
const hueOf = (h) => { if(!h) return null; const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; if(!d) return 0;
  let hh = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; hh*=60; if(hh<0)hh+=360; return +hh.toFixed(1); };
const bandInfo = (b) => {
  const t = b.tube;
  const core = t.core, shell = t.shell;
  const rad = t._rad ? Array.from(t._rad).map(v=>+v.toFixed(5)) : null;
  const pts = t._pts ? Array.from(t._pts).map(p => (p && p.x!==undefined) ? [+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)] : p) : null;
  let plen = null;
  if (pts && pts.length>1 && Array.isArray(pts[0])) { plen = 0; for (let i=1;i<pts.length;i++) plen += Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2]); plen = +plen.toFixed(4); }
  return { side: b.side, pouchRadius: b.pouchRadius, prongRadius: b.prongRadius, rubberLength: b.rubberLength,
           coreColor: hex(core), coreLum: lum(hex(core)), coreHue: hueOf(hex(core)),
           shellColor: hex(shell), rings: t.rings, radial: t.radial,
           radii: rad, minRadius: rad? +Math.min(...rad).toFixed(5):null, maxRadius: rad? +Math.max(...rad).toFixed(5):null,
           pathLength: plen, ptCount: pts?pts.length:null, firstPt: pts?pts[0]:null, lastPt: pts?pts[pts.length-1]:null,
           world: core ? worldBBox(core) : null, screen: core ? bboxScreen(core) : null };
};
const firstGeom = (o) => { let g=null; o.traverse(c=>{ if(!g && c.isMesh && c.geometry?.attributes?.position) g=c; }); return g; };
const worldBBox = (obj) => {
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  obj.updateWorldMatrix(true, true);
  obj.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const p = applyM(o.matrixWorld, [cx,cy,cz]);
      if (p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1];
    }
  });
  return {x0,y0,x1,y1,w:x1-x0,h:y1-y0};
};
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const G = (body, ...a) => game(PRELUDE + body, ...a);
  const report = {};
  const say = (k, v) => { report[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };

  /* ---------- crop-strip: my own high-magnification filmstrip ---------------- */
  const cropStrip = async (name, clip, { from = 0, to = 480, step = 40, cols = 0 } = {}) => {
    const tmp = path.join(OUT, `.cs-${name}`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    const label = (t) => page.evaluate((txt) => {
      let el = document.getElementById('__cs_label');
      if (!el) {
        el = document.createElement('div');
        el.id = '__cs_label';
        el.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483647;pointer-events:none;' +
          'font:700 22px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.75);' +
          'padding:4px 10px;border-radius:7px';
        document.body.appendChild(el);
      }
      el.textContent = txt;
    }, t).catch(() => {});
    let i = 0, t = from;
    if (from > 0) await game('await SS.seek(args[0]);', from);
    while (t <= to) {
      await label(`t=${t}ms`);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`), clip });
      i++; t += step;
      if (t <= to) await game('await SS.seek(args[0]);', step);
    }
    await page.evaluate(() => document.getElementById('__cs_label')?.remove()).catch(() => {});
    const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
    const c = Math.max(1, cols || Math.min(4, Math.ceil(Math.sqrt(files.length))));
    const rows = Math.ceil(files.length / c);
    const out = path.join(OUT, `${name}-CROPSTRIP.png`);
    await exec('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i',
      path.join(tmp, 'f*.png'),
      '-filter_complex', `scale=560:-2,tile=${c}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', out]);
    await rm(tmp, { recursive: true, force: true });
    return out;
  };

  const crop = async (name, clip) => {
    const f = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: f, clip });
    return f;
  };

  /* ================= 0. fresh deterministic level ========================== */
  await game('SS.seed(7); await SS.seek(2000);');
  say('state_after_load', await state());

  /* ================= 1. PREVIEW-BEFORE-EARNED auto-fail check ============== */
  say('preview_before_any_input', await G(`
    const s = w.sling;
    return { visible: s.preview?.visible, pts: s._previewPts?.length,
             drawn: s.drawn, state: s.state, level: w.level?.id ?? w.level?.name };
  `));

  /* real drag input path, first drag of the first level */
  const dragProbe = await G(`
    const s = w.sling;
    const p = proj(s.anchor.x, s.anchor.y, 0);
    const r = await SS.dragTo(p[0]-90, p[1]+55);
    SS.stepOnce();
    return { drag: r, previewVisible: s.preview?.visible, previewPts: s._previewPts?.length,
             drawn: s.drawn, state: s.state, anchorScreen: p };
  `);
  say('preview_on_FIRST_drag_l1', dragProbe);
  await crop('05-first-drag-full', { x: 0, y: 0, width: 1280, height: 720 });

  /* ================= 2. RESTING COMPOSITION ================================ */
  await game('SS.seed(7); await SS.seek(2000);');
  const compose = await G(`
    const s = w.sling;
    const sb = bboxScreen(s.group);
    const ammoB = s.ammo ? bboxScreen(s.ammo.mesh) : null;
    // furthest target = right-most villain / block screen x
    let far = -1e9, farTag = null;
    for (const b of [...(w.blocks||[]), ...(w.villains||[])]) {
      const bb = bboxScreen(b.mesh); if (!bb) continue;
      if (bb.x1 > far) { far = bb.x1; farTag = b.tag || b.constructor?.name; }
    }
    const pouchS = proj(s.pouch.x, s.pouch.y, 0);
    const anchorS = proj(s.anchor.x, s.anchor.y, 0);
    return { VW, VH, sling: sb, ammo: ammoB,
      slingPctW: sb.w/VW*100, slingCentrePctW: sb.cx/VW*100,
      furthestTargetPctW: far/VW*100, farTag,
      rightOfSlingPctW: (VW - sb.x1)/VW*100,
      AD_px: ammoB ? ammoB.h : null, AD_w: ammoB ? ammoB.w : null,
      pouchScreen: pouchS, anchorScreen: anchorS };
  `);
  say('composition_at_rest', compose);
  const AD = compose.AD_px;

  await shot('rest-full');

  /* sling crop box in CSS px, generous */
  const sb = compose.sling;
  const pad = Math.max(60, sb.w * 0.9);
  const clipSling = {
    x: Math.max(0, Math.round(sb.x0 - pad)),
    y: Math.max(0, Math.round(sb.y0 - pad * 0.8)),
    width: Math.min(1280, Math.round(sb.w + pad * 2)),
    height: Math.min(720, Math.round(sb.h + pad * 1.6)),
  };
  clipSling.width = Math.min(clipSling.width, 1280 - clipSling.x);
  clipSling.height = Math.min(clipSling.height, 720 - clipSling.y);
  say('clipSling', clipSling);
  await crop('06-rest-sling-crop', clipSling);

  /* band geometry at rest */
  const bandRest = await G(`
    const s = w.sling;
    const out = [];
    for (const b of s.bands) {
      out.push(bandInfo(b));
    }
    const prongs = s.prongs.map(p => ({ s: p.s,
       tip: p.tip ? {x:+p.tip.x.toFixed(4),y:+p.tip.y.toFixed(4),z:+(p.tip.z??0).toFixed(4)} : null,
       rest: p.rest ? {x:+p.rest.x.toFixed(4),y:+p.rest.y.toFixed(4),z:+(p.rest.z??0).toFixed(4)} : null,
       whip: typeof p.whip === 'number' ? +p.whip.toFixed(4) : (p.whip ? JSON.parse(JSON.stringify(p.whip)) : null) }));
    const forkCols = s.prongs.map(p => ({ coreColor: hex(p.tube?.core), coreLum: lum(hex(p.tube?.core)), coreHue: hueOf(hex(p.tube?.core)),
        capColor: hex(p.cap), whipColor: hex(p.whip), shellColor: hex(p.tube?.shell) }));
    const leather = { color: s.leatherMat?.color ? '#'+s.leatherMat.color.getHexString() : null };
    return { drawn: s.drawn, bands: out, prongs, forkCols, leather,
             pouch: {x:s.pouch.x,y:s.pouch.y}, anchor: {x:s.anchor.x,y:s.anchor.y} };
  `);
  say('band_at_rest', bandRest);

  /* occlusion measurement: crop with bands hidden vs shown, tight on the ammo */
  const ammoClip = (() => {
    const a = compose.ammo;
    const p = Math.max(14, a.h * 0.55);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y, width: Math.min(1280 - x, Math.round(a.w + p * 2)), height: Math.min(720 - y, Math.round(a.h + p * 2)) };
  })();
  say('ammoClip', ammoClip);
  await crop('07-rest-ammo-WITH-bands', ammoClip);
  await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=false;}); SS.stepOnce(); return 1;`);
  await crop('08-rest-ammo-NO-bands', ammoClip);
  await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=true;}); SS.stepOnce(); return 1;`);

  /* band silhouette with ammo masked out, at rest */
  await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
  await crop('09-rest-band-NOAMMO', clipSling);
  await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);

  /* ================= 3. FULL STRETCH ======================================= */
  await G(`const r = await SS.aim({angle: 0.60, power: 1.0}); await SS.seek(400); return r;`);
  const stretch = await G(`
    const s = w.sling;
    const out = [];
    for (const b of s.bands) {
      out.push(bandInfo(b));
    }
    const ammoB = bboxScreen(s.ammo.mesh);
    const sb2 = bboxScreen(s.group);
    const prongs = s.prongs.map(p => ({ s: p.s,
       tip: p.tip ? {x:+p.tip.x.toFixed(4),y:+p.tip.y.toFixed(4),z:+(p.tip.z??0).toFixed(4)} : null,
       rest: p.rest ? {x:+p.rest.x.toFixed(4),y:+p.rest.y.toFixed(4),z:+(p.rest.z??0).toFixed(4)} : null,
       whip: typeof p.whip === 'number' ? +p.whip.toFixed(4) : (p.whip ? JSON.parse(JSON.stringify(p.whip)) : null) }));
    return { drawn: s.drawn, state: s.state, bands: out, prongs,
             pouch:{x:s.pouch.x,y:s.pouch.y}, anchor:{x:s.anchor.x,y:s.anchor.y},
             pouchScreen: proj(s.pouch.x,s.pouch.y,0),
             ammo: ammoB, AD_px: ammoB.h, slingScreen: sb2,
             previewVisible: s.preview?.visible, previewPts: s._previewPts?.length };
  `);
  say('full_stretch', stretch);
  await shot('stretch-full');
  await crop('11-stretch-sling-crop', clipSling);
  await crop('12-stretch-ammo-WITH-bands', (() => {
    const a = stretch.ammo, p = Math.max(14, a.h * 0.55);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y, width: Math.min(1280 - x, Math.round(a.w + p * 2)), height: Math.min(720 - y, Math.round(a.h + p * 2)) };
  })());
  await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=false;}); SS.stepOnce(); return 1;`);
  await crop('13-stretch-ammo-NO-bands', (() => {
    const a = stretch.ammo, p = Math.max(14, a.h * 0.55);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y, width: Math.min(1280 - x, Math.round(a.w + p * 2)), height: Math.min(720 - y, Math.round(a.h + p * 2)) };
  })());
  await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=true;}); SS.stepOnce(); return 1;`);
  await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
  await crop('14-stretch-band-NOAMMO', clipSling);
  await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);

  /* half stretch, for the "continuous deform" read */
  await G(`await SS.aim({angle:0.60, power:0.5}); await SS.seek(300); return 1;`);
  await crop('15-half-stretch-sling-crop', clipSling);
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); return 1;`);

  /* ================= 4. RELEASE — numeric sampling ========================= */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); return 1;`);
  const releaseSamples = await G(`
    const s = w.sling;
    const anchorRest = {x:s.anchor.x, y:s.anchor.y};
    const restPouch = {x:s.pouch.x, y:s.pouch.y};
    const relInfo = await SS.release();
    const samples = [];
    const groundRef = proj(0, 0, 0);
    let t = 0;
    for (let i=0;i<=60;i++) {
      const proj0 = w.projectiles && w.projectiles[0];
      const am = proj0 && proj0.mesh ? bboxScreen(proj0.mesh) : null;
      const pS = proj(s.pouch.x, s.pouch.y, 0);
      const gS = proj(0, 0, 0);
      const hS = proj(60, 0, 0);
      // fx live particles: world positions of live particle meshes
      samples.push({
        t: Math.round(t),
        pouch: {x:+s.pouch.x.toFixed(4), y:+s.pouch.y.toFixed(4)},
        pouchScreen: [ +pS[0].toFixed(2), +pS[1].toFixed(2) ],
        drawn: +s.drawn.toFixed(4),
        recoilT: +(s.recoilT ?? 0).toFixed(4),
        recoilAmp: +(s.recoilAmp ?? 0).toFixed(4),
        slingState: s.state,
        ammoScreen: am ? { cx:+am.cx.toFixed(2), cy:+am.cy.toFixed(2), h:+am.h.toFixed(2), w:+am.w.toFixed(2) } : null,
        groundScreenY: +gS[1].toFixed(3),
        horizonScreenY: +hS[1].toFixed(3),
        camY: +w.camera.position.y.toFixed(4),
        camX: +w.camera.position.x.toFixed(4),
        fxLive: w.fx?.liveCount ?? null,
      });
      await SS.seek(10); t += 10;
    }
    return { relInfo, anchorRest, restPouch, groundRef, samples };
  `);
  await writeFile(path.join(OUT, 'release-samples.json'), JSON.stringify(releaseSamples, null, 2));
  say('release_info', releaseSamples.relInfo);
  say('release_sample_count', releaseSamples.samples.length);

  /* ================= 5. RELEASE — filmstrips =============================== */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  const fsWide = await filmstrip('release-wide', { from: 0, to: 600, step: 50, cols: 4 });
  say('filmstrip_wide', fsWide);

  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  const csClip = { x: 0, y: 120, width: 700, height: 600 };
  const csRelease = await cropStrip('release-sling', csClip, { from: 0, to: 480, step: 40, cols: 4 });
  say('cropstrip_release_sling', csRelease);

  /* very fine strip over the first 120 ms — the "hard cut" criterion */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  const csFine = await cropStrip('release-fine', csClip, { from: 0, to: 160, step: 20, cols: 3 });
  say('cropstrip_release_fine', csFine);

  /* band recoil tail, 0-500ms tight on the fork only */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  const forkClip = {
    x: Math.max(0, Math.round(compose.sling.x0 - 70)),
    y: Math.max(0, Math.round(compose.sling.y0 - 60)),
    width: Math.round(compose.sling.w + 190),
    height: Math.round(compose.sling.h + 140),
  };
  const csFork = await cropStrip('band-recoil', forkClip, { from: 0, to: 500, step: 25, cols: 7 });
  say('cropstrip_band_recoil', csFork);

  await writeFile(path.join(OUT, 'MEASUREMENTS.json'), JSON.stringify(report, null, 2));
};
