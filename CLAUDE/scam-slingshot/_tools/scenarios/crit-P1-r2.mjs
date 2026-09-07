/**
 * crit-P1-r2.mjs — INDEPENDENT CRITIC capture for P1 (Launch feel), round 2.
 * Written by the critic. Measures pixels; trusts nothing the builder says.
 *
 * Every capture here is either (a) a full-frame still at the game's own framing, or
 * (b) a tight crop / filmstrip whose clip box is derived from the LIVE screen-space
 * bbox of the sling, never from a hard-coded pixel (see HOOKS.md P0 round 3).
 */
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);

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
  let p = applyM(cam.matrixWorldInverse, [x,y,z||0]);
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
  return meshes ? {x0:+x0.toFixed(2),y0:+y0.toFixed(2),x1:+x1.toFixed(2),y1:+y1.toFixed(2),
                   w:+(x1-x0).toFixed(2),h:+(y1-y0).toFixed(2),cx:+((x0+x1)/2).toFixed(2),cy:+((y0+y1)/2).toFixed(2),meshes} : null;
};
const hex = (m) => { const c = m?.material?.color; return c ? '#'+c.getHexString() : null; };
const lum = (h) => { if(!h) return null; const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
  const f=(v)=> v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  return +(0.2126*f(r)+0.7152*f(g)+0.0722*f(b)).toFixed(4); };
const hueOf = (h) => { if(!h) return null; const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; if(!d) return 0;
  let hh = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; hh*=60; if(hh<0)hh+=360; return +hh.toFixed(1); };

/* Strap cross-section, measured in SCREEN pixels, ring by ring along the strap.
   TubeMesh keeps its centre-line samples in _pts (Float32Array, (rings+1)*3) and its
   ring radii in _rad (Float32Array, rings+1). Screen width of ring i = the projected
   distance across the ring, i.e. project(c + n*r) - project(c - n*r) where n is the
   in-plane normal of the centre-line at that ring. That is the number the criterion is
   about: "strap width AT THE POUCH narrows by >= 25%".
   The tube group carries the sling's own world matrix, so points are transformed by it. */
const stripProfile = (b) => {
  const t = b.tube; if (!t || !t._pts || !t._rad) return null;
  const P = t._pts, RAD = t._rad, S = t.rings;
  const M = t.group; M.updateWorldMatrix(true, true);
  const mw = M.matrixWorld;
  const wp = (i) => applyM(mw, [P[i*3], P[i*3+1], P[i*3+2]]);
  const wpts = []; for (let i=0;i<=S;i++) wpts.push(wp(i));
  const scr = wpts.map(p => proj(p[0],p[1],p[2]));
  let len = 0; for (let i=1;i<=S;i++) len += Math.hypot(scr[i][0]-scr[i-1][0], scr[i][1]-scr[i-1][1]);
  // world scale of the group (uniform assumed) to convert _rad into world units
  const o = applyM(mw, [0,0,0]), ux = applyM(mw, [1,0,0]);
  const sc = Math.hypot(ux[0]-o[0], ux[1]-o[1], ux[2]-o[2]) || 1;
  const widths = [];
  for (let i=0;i<=S;i++) {
    const a = wpts[Math.max(0,i-1)], c = wpts[i], d = wpts[Math.min(S,i+1)];
    let tx = d[0]-a[0], ty = d[1]-a[1];
    const tl = Math.hypot(tx,ty) || 1; tx/=tl; ty/=tl;
    const nx = -ty, ny = tx;                              // in-plane normal
    const r = RAD[i] * sc;
    const s1 = proj(c[0]+nx*r, c[1]+ny*r, c[2]);
    const s2 = proj(c[0]-nx*r, c[1]-ny*r, c[2]);
    widths.push(+Math.hypot(s1[0]-s2[0], s1[1]-s2[1]).toFixed(3));
  }
  return { widths, worldRadii: Array.from(RAD).map(v=>+v.toFixed(5)),
    screenLen: +len.toFixed(2), rings: S,
    first: scr[0].map(v=>+v.toFixed(1)), last: scr[S].map(v=>+v.toFixed(1)) };
};
const bandReport = () => {
  const s = w.sling;
  return s.bands.map(b => {
    const p = stripProfile(b);
    const wds = p ? p.widths : [];
    return {
      side: b.side,
      core: hex(b.tube?.core), coreLum: lum(hex(b.tube?.core)), coreHue: hueOf(hex(b.tube?.core)),
      shell: hex(b.tube?.shell),
      widths: wds,
      worldRadii: p?.worldRadii,
      screenLen: p?.screenLen,
      widthAtPouch: wds.length ? +Math.min(...wds.slice(-3)).toFixed(3) : null,
      widthAtFork: wds.length ? +Math.max(...wds.slice(0,3)).toFixed(3) : null,
      minWidth: wds.length ? +Math.min(...wds).toFixed(3) : null,
      maxWidth: wds.length ? +Math.max(...wds).toFixed(3) : null,
      radPouch: p ? +p.worldRadii[p.worldRadii.length-1].toFixed(5) : null,
      radFork: p ? +p.worldRadii[0].toFixed(5) : null,
      radMin: p ? +Math.min(...p.worldRadii).toFixed(5) : null,
      radMax: p ? +Math.max(...p.worldRadii).toFixed(5) : null,
      screen: bboxScreen(b.tube.group),
    };
  });
};
const strapScreenLength = (b) => { const p = stripProfile(b); return p ? { screenLen: p.screenLen } : null; };
const forkReport = () => w.sling.prongs.map(p => ({
  s: p.s,
  core: hex(p.tube?.core), coreLum: lum(hex(p.tube?.core)), coreHue: hueOf(hex(p.tube?.core)),
  cap: hex(p.cap), capLum: lum(hex(p.cap)),
  tip: p.tip ? [+p.tip.x.toFixed(4), +p.tip.y.toFixed(4)] : null,
  rest: p.rest ? [+p.rest.x.toFixed(4), +p.rest.y.toFixed(4)] : null,
  tipScreen: p.tip ? proj(p.tip.x, p.tip.y, 0).map(v=>+v.toFixed(2)) : null,
  restScreen: p.rest ? proj(p.rest.x, p.rest.y, 0).map(v=>+v.toFixed(2)) : null,
}));
/* live FX particles, per pool, in screen space */
const fxReport = () => {
  const out = {};
  const pools = w.fx?.pools || {};
  for (const k of Object.keys(pools)) {
    const P = pools[k].p, max = pools[k].max;
    const live = [];
    for (let i=0;i<max;i++) if (P.life[i] > 0) live.push(proj(P.x[i], P.y[i], P.z[i]));
    if (!live.length) { out[k] = { n:0 }; continue; }
    let cx=0, cy=0, x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for (const s of live) { cx+=s[0]; cy+=s[1];
      if(s[0]<x0)x0=s[0]; if(s[0]>x1)x1=s[0]; if(s[1]<y0)y0=s[1]; if(s[1]>y1)y1=s[1]; }
    out[k] = { n:live.length, cx:+(cx/live.length).toFixed(2), cy:+(cy/live.length).toFixed(2),
               x0:+x0.toFixed(1), y0:+y0.toFixed(1), x1:+x1.toFixed(1), y1:+y1.toFixed(1),
               spanX:+(x1-x0).toFixed(1), spanY:+(y1-y0).toFixed(1) };
  }
  return out;
};
`;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const G = (body, ...a) => game(PRELUDE + body, ...a);
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };

  const crop = async (name, clip) => {
    const f = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: f, clip });
    return f;
  };

  /* my own high-magnification, deterministic crop filmstrip */
  const cropStrip = async (name, clip, { from = 0, to = 480, step = 40, cols = 0, scale = 560 } = {}) => {
    const tmp = path.join(OUT, `.cs-${name}`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    const label = (t) => page.evaluate((txt) => {
      let el = document.getElementById('__cs_label');
      if (!el) {
        el = document.createElement('div');
        el.id = '__cs_label';
        el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;' +
          'font:700 26px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.8);' +
          'padding:3px 9px;border-radius:6px';
        document.body.appendChild(el);
      }
      el.textContent = txt;
    }, t).catch(() => {});
    let i = 0, t = from;
    if (from > 0) await game('await SS.seek(args[0]);', from);
    while (t <= to) {
      await label(`t=${t}`);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`), clip });
      i++; t += step;
      if (t <= to) await game('await SS.seek(args[0]);', step);
    }
    await page.evaluate(() => document.getElementById('__cs_label')?.remove()).catch(() => {});
    const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
    if (!files.length) throw new Error(`cropStrip ${name}: 0 frames`);
    const c = Math.max(1, cols || Math.min(4, Math.ceil(Math.sqrt(files.length))));
    const rows = Math.ceil(files.length / c);
    const out = path.join(OUT, `${name}-CROPSTRIP.png`);
    await exec('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i',
      path.join(tmp, 'f*.png'),
      '-filter_complex', `scale=${scale}:-2,tile=${c}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', out]);
    await rm(tmp, { recursive: true, force: true });
    return out;
  };

  const fresh = () => game('SS.seed(11); await SS.seek(2000);');

  /* ==================================================================== */
  /* 0. AUTO-FAIL CHECK — preview before the player earned it             */
  /* ==================================================================== */
  await fresh();
  say('state_fresh', await state());
  say('preview_before_any_input', await G(`
    const s = w.sling;
    return { visible: !!s.preview?.visible, drawn: s.drawn, state: s.state,
             level: w.level?.id ?? null };
  `));
  const firstDrag = await dragShot(0.42, 0.85, { steps: 6 });
  say('first_drag_report', { angle: firstDrag.angle, clamped: firstDrag.clamped,
    grabbable: firstDrag.grabbable, drawn: firstDrag.drawn, wanted: firstDrag.wantedAngle });
  await game('SS.stepOnce();');
  say('preview_on_FIRST_drag_of_FIRST_level', await G(`
    const s = w.sling;
    let inst = 0;
    if (s.preview?.visible) inst = s.preview.count ?? 0;
    return { visible: !!s.preview?.visible, instances: inst, drawn: +s.drawn.toFixed(3) };
  `));
  await shot('firstdrag-full');

  /* ==================================================================== */
  /* 1. RESTING COMPOSITION                                               */
  /* ==================================================================== */
  await fresh();
  const compose = await G(`
    const s = w.sling;
    const sb = bboxScreen(s.group);
    const ammoB = s.ammo ? bboxScreen(s.ammo.mesh) : null;
    let far = -1e9, farTag = null;
    for (const b of [...(w.blocks||[]), ...(w.villains||[])]) {
      const bb = b.mesh ? bboxScreen(b.mesh) : null; if (!bb) continue;
      if (bb.x1 > far) { far = bb.x1; farTag = b.tag || b.material || 'x'; }
    }
    return { VW, VH,
      sling: sb, slingPctW:+(sb.w/VW*100).toFixed(2), slingCentrePctW:+(sb.cx/VW*100).toFixed(2),
      rightOfSlingPctW:+((VW-sb.x1)/VW*100).toFixed(2),
      furthestTargetPctW:+(far/VW*100).toFixed(2), farTag,
      ammo: ammoB, AD:+(ammoB?.h ?? 0).toFixed(2),
      pouchScreen: proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)),
      anchorScreen: proj(s.anchor.x,s.anchor.y,0).map(v=>+v.toFixed(2)) };
  `);
  say('composition_at_rest', compose);
  const AD = compose.AD;
  await shot('rest-full');

  const sb = compose.sling;
  const pad = Math.max(70, sb.w * 1.0);
  const clipSling = {
    x: Math.max(0, Math.round(sb.x0 - pad)),
    y: Math.max(0, Math.round(sb.y0 - pad * 0.9)),
    width: Math.round(sb.w + pad * 2),
    height: Math.round(sb.h + pad * 1.8),
  };
  clipSling.width = Math.min(clipSling.width, compose.VW - clipSling.x);
  clipSling.height = Math.min(clipSling.height, compose.VH - clipSling.y);
  say('clipSling', clipSling);
  await crop('a-rest-sling', clipSling);

  const ammoClipFor = (a) => {
    const p = Math.max(16, a.h * 0.6);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y,
      width: Math.min(compose.VW - x, Math.round(a.w + p * 2)),
      height: Math.min(compose.VH - y, Math.round(a.h + p * 2)) };
  };

  /* ---- band + fork material separation ---- */
  say('band_at_rest', await G(`return bandReport();`));
  say('fork_at_rest', await G(`return forkReport();`));

  /* ---- occlusion: ammo crop with and without the bands ---- */
  const ammoClipRest = ammoClipFor(compose.ammo);
  say('ammoClipRest', ammoClipRest);
  await crop('b-rest-ammo-BANDS', ammoClipRest);
  await G(`w.sling.bands.forEach(b=>b.tube.group.visible=false); SS.stepOnce(); return 1;`);
  await crop('b-rest-ammo-NOBANDS', ammoClipRest);
  await G(`w.sling.bands.forEach(b=>b.tube.group.visible=true); SS.stepOnce(); return 1;`);

  /* ---- band silhouette with ammo hidden (rest) ---- */
  await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
  await crop('c-rest-band-NOAMMO', clipSling);
  await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);

  /* ==================================================================== */
  /* 2. STRETCH LADDER  (0 / .25 / .5 / .75 / 1.0)                         */
  /* ==================================================================== */
  const ladder = [];
  for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
    await fresh();
    if (p > 0) await G(`const r = await SS.aim({angle:0.42, power:args[0]}); await SS.seek(320); return r;`, p);
    else await G(`await SS.seek(320); return 1;`);
    const m = await G(`
      const s = w.sling;
      const a = bboxScreen(s.ammo.mesh);
      return { drawn:+s.drawn.toFixed(3), state:s.state, bands:bandReport(), fork:forkReport(),
               ammo:a, AD:+a.h.toFixed(2),
               pouchScreen: proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)),
               previewVisible: !!s.preview?.visible };
    `);
    ladder.push({ power: p, ...m });
    await crop(`d-stretch-${String(p).replace('.', '')}-sling`, clipSling);
    /* ammo crop with / without bands at this stretch — the occlusion criterion is
       "at rest AND at every stretch" */
    const ac = ammoClipFor(m.ammo);
    await crop(`e-stretch-${String(p).replace('.', '')}-ammo-BANDS`, ac);
    await G(`w.sling.bands.forEach(b=>b.tube.group.visible=false); SS.stepOnce(); return 1;`);
    await crop(`e-stretch-${String(p).replace('.', '')}-ammo-NOBANDS`, ac);
    await G(`w.sling.bands.forEach(b=>b.tube.group.visible=true); SS.stepOnce(); return 1;`);
    /* band silhouette, ammo masked */
    await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
    await crop(`f-stretch-${String(p).replace('.', '')}-band-NOAMMO`, clipSling);
    await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);
  }
  await writeFile(path.join(OUT, 'stretch-ladder.json'), JSON.stringify(ladder, null, 2));
  say('stretch_ladder_summary', ladder.map(l => ({
    power: l.power, drawn: l.drawn,
    lenL: l.bands[0]?.screenLen, lenR: l.bands[1]?.screenLen, radPouchL: l.bands[0]?.radPouch, radForkL: l.bands[0]?.radFork,
    wPouchL: l.bands[0]?.widthAtPouch, wForkL: l.bands[0]?.widthAtFork,
    minL: l.bands[0]?.minWidth, maxL: l.bands[0]?.maxWidth,
    tipL: l.fork[0]?.tip, restL: l.fork[0]?.rest,
    tipR: l.fork[1]?.tip, restR: l.fork[1]?.rest,
    AD: l.AD, preview: l.previewVisible,
  })));

  /* full-frame stretch still, for the record */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:1.0}); await SS.seek(320); return 1;`);
  await shot('stretch-full-frame');

  /* ==================================================================== */
  /* 3. RELEASE — dense numeric sampling every 10 ms                       */
  /* ==================================================================== */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); return 1;`);
  const rel = await G(`
    const s = w.sling;
    const anchorScreen = proj(s.anchor.x, s.anchor.y, 0);
    const dirRef = { x: s.anchor.x - s.pouch.x, y: s.anchor.y - s.pouch.y };
    const L = Math.hypot(dirRef.x, dirRef.y) || 1; dirRef.x/=L; dirRef.y/=L;
    const info = await SS.release();
    const samples = [];
    let t = 0;
    for (let i=0;i<=70;i++) {
      const p0 = w.projectiles && w.projectiles[0];
      const am = p0 && p0.mesh ? bboxScreen(p0.mesh) : null;
      const pS = proj(s.pouch.x, s.pouch.y, 0);
      const gS = proj(0, 0, 0);         // ground, at the sling
      const hS = proj(70, 0, 0);        // ground far right — the horizon line
      const off = (s.pouch.x - s.anchor.x) * dirRef.x + (s.pouch.y - s.anchor.y) * dirRef.y;
      samples.push({
        t: Math.round(t),
        state: s.state,
        pouchOffAlongShot: +off.toFixed(5),     // >0 = FORWARD of the fork (overshoot)
        pouchScreen: [+pS[0].toFixed(2), +pS[1].toFixed(2)],
        bandLenL: strapScreenLength(s.bands[0])?.screenLen ?? null,
        ammo: am ? { cx:+am.cx.toFixed(2), cy:+am.cy.toFixed(2), h:+am.h.toFixed(2), w:+am.w.toFixed(2) } : null,
        gapPx: am ? +Math.hypot(am.cx-pS[0], am.cy-pS[1]).toFixed(2) : null,
        groundY: +gS[1].toFixed(3),
        horizonY: +hS[1].toFixed(3),
        camX: +cam.position.x.toFixed(5), camY: +cam.position.y.toFixed(5),
        camZ: +cam.position.z.toFixed(5),
        camRotZ: +cam.rotation.z.toFixed(6),
        fx: fxReport(),
      });
      await SS.seek(10); t += 10;
    }
    return { info, anchorScreen, samples };
  `);
  await writeFile(path.join(OUT, 'release-samples.json'), JSON.stringify(rel, null, 2));
  say('release_info', rel.info);
  const S = rel.samples;
  const at = (ms) => S.find(s => s.t === ms);
  say('release_key_frames', [0, 10, 20, 30, 50, 80, 100, 150, 250, 400].map(ms => {
    const s = at(ms); if (!s) return { t: ms, missing: true };
    return { t: ms, state: s.state, gapPx: s.gapPx, gapAD: s.gapPx != null ? +(s.gapPx / AD).toFixed(2) : null,
      pouchOff: s.pouchOffAlongShot, bandLenL: s.bandLenL,
      chip: s.fx.chip?.n, chipC: s.fx.chip ? [s.fx.chip.cx, s.fx.chip.cy] : null,
      chipSpan: s.fx.chip ? [s.fx.chip.spanX, s.fx.chip.spanY] : null,
      flash: s.fx.flash?.n, flashC: s.fx.flash ? [s.fx.flash.cx, s.fx.flash.cy] : null,
      groundY: s.groundY, horizonY: s.horizonY, camY: s.camY };
  }));

  /* recoil zero-crossings = overshoot count */
  const offs = S.map(s => s.pouchOffAlongShot);
  const crossings = [];
  for (let i = 1; i < offs.length; i++) {
    if ((offs[i - 1] >= 0) !== (offs[i] >= 0)) crossings.push(S[i].t);
  }
  const extrema = [];
  for (let i = 1; i < offs.length - 1; i++) {
    if ((offs[i] - offs[i - 1]) * (offs[i + 1] - offs[i]) < 0) extrema.push({ t: S[i].t, off: offs[i] });
  }
  say('recoil_zero_crossings_ms', crossings);
  say('recoil_extrema', extrema);
  say('recoil_still_after_ms', (() => {
    for (let i = 0; i < S.length; i++) {
      if (S.slice(i).every(s => Math.abs(s.pouchOffAlongShot) < 0.005)) return S[i].t;
    }
    return null;
  })());

  /* camera kick from the ground line */
  const g0 = S[0].groundY;
  say('camera_kick', {
    groundY_series: S.filter(s => s.t <= 400).map(s => ({ t: s.t, dY: +(s.groundY - g0).toFixed(3),
      pctH: +((s.groundY - g0) / compose.VH * 100).toFixed(3) })),
    maxAbsPctH: +Math.max(...S.map(s => Math.abs(s.groundY - g0) / compose.VH * 100)).toFixed(3),
    at250_pctH: +((at(250).groundY - g0) / compose.VH * 100).toFixed(3),
    camRotZ_max: +Math.max(...S.map(s => Math.abs(s.camRotZ))).toFixed(6),
  });

  /* ==================================================================== */
  /* 4. RELEASE — filmstrips (motion cannot be judged from a still)        */
  /* ==================================================================== */
  const setup = async () => {
    await fresh();
    await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release(); return 1;`);
  };

  await setup();
  say('fs_release_wide', await filmstrip('release-wide', { from: 0, to: 600, step: 50, cols: 4 }));

  await setup();
  say('fs_release_early', await filmstrip('release-early-20ms', { from: 0, to: 180, step: 20, cols: 5 }));

  /* tight on the sling — the hard-cut + burst-pinned criteria */
  const forkClip = {
    x: Math.max(0, Math.round(sb.x0 - 130)),
    y: Math.max(0, Math.round(sb.y0 - 150)),
    width: Math.round(sb.w + 420),
    height: Math.round(sb.h + 300),
  };
  forkClip.width = Math.min(forkClip.width, compose.VW - forkClip.x);
  forkClip.height = Math.min(forkClip.height, compose.VH - forkClip.y);
  say('forkClip', forkClip);
  await setup();
  say('cs_release_fine', await cropStrip('g-release-fine', forkClip, { from: 0, to: 160, step: 20, cols: 3, scale: 600 }));
  await setup();
  say('cs_band_recoil', await cropStrip('h-band-recoil', forkClip, { from: 0, to: 450, step: 25, cols: 5, scale: 460 }));

  /* ==================================================================== */
  /* 5. THE BLIND CANDIDATE — our "release instant", full frame            */
  /*    The reference (ab_launch_release-instant-band-recoil_03) is the    */
  /*    instant where the bird is ~8 diameters clear and the sparkle fan   */
  /*    is still pinned at the sling. Find OUR matching instant by         */
  /*    measurement, not by guessing a timestamp.                          */
  /* ==================================================================== */
  const target = S.find(s => s.gapPx != null && s.gapPx / AD >= 8);
  say('first_frame_at_8AD', target ? { t: target.t, gapAD: +(target.gapPx / AD).toFixed(2) } : null);
  const tBlind = target ? target.t : 80;
  await setup();
  if (tBlind > 0) await game('await SS.seek(args[0]);', tBlind);
  say('blind_frame_t', tBlind);
  say('blind_frame_state', await G(`
    const s = w.sling;
    const p0 = w.projectiles?.[0];
    const am = p0?.mesh ? bboxScreen(p0.mesh) : null;
    return { slingState: s.state, ammo: am, fx: fxReport(),
             pouchScreen: proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)) };
  `));
  await shot('BLIND-CANDIDATE-release-instant');

  /* a second candidate a little later, in case the fan has not opened at tBlind */
  await setup();
  await game('await SS.seek(args[0]);', 110);
  await shot('BLIND-CANDIDATE-t110');

  /* ==================================================================== */
  /* 6. STILL-STANDING FULL FRAMES for the 40px / greyscale tests          */
  /* ==================================================================== */
  await fresh();
  await G(`await SS.aim({angle:0.42, power:0.95}); await SS.seek(320); return 1;`);
  await crop('i-stretch95-sling', clipSling);

  await writeFile(path.join(OUT, 'MEASUREMENTS.json'), JSON.stringify(R, null, 2));
  console.log('### DONE');
};
