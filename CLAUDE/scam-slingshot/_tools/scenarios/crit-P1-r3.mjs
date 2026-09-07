/**
 * crit-P1-r3.mjs — INDEPENDENT CRITIC capture for P1 (Launch feel), round 3.
 *
 * Written by the critic. Nothing here trusts a builder claim; every number is either
 * a projection of what the renderer is actually drawing, or a count of PIXELS in a
 * screenshot diff (mask a layer, shoot twice, subtract).
 *
 * No hard-coded drag pixels (HOOKS.md P0 r3). All clips derive from the LIVE
 * screen-space bbox of the sling.
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

/* strap cross-section in SCREEN px, ring by ring (same instrument the r2 critic used) */
const stripProfile = (b) => {
  const t = b.tube; if (!t || !t._pts || !t._rad) return null;
  const P = t._pts, RAD = t._rad, S = t.rings;
  const M = t.group; M.updateWorldMatrix(true, true);
  const mw = M.matrixWorld;
  const wp = (i) => applyM(mw, [P[i*3], P[i*3+1], P[i*3+2]]);
  const wpts = []; for (let i=0;i<=S;i++) wpts.push(wp(i));
  const scr = wpts.map(p => proj(p[0],p[1],p[2]));
  let len = 0; for (let i=1;i<=S;i++) len += Math.hypot(scr[i][0]-scr[i-1][0], scr[i][1]-scr[i-1][1]);
  const o = applyM(mw, [0,0,0]), ux = applyM(mw, [1,0,0]);
  const sc = Math.hypot(ux[0]-o[0], ux[1]-o[1], ux[2]-o[2]) || 1;
  const widths = [];
  for (let i=0;i<=S;i++) {
    const a = wpts[Math.max(0,i-1)], c = wpts[i], d = wpts[Math.min(S,i+1)];
    let tx = d[0]-a[0], ty = d[1]-a[1];
    const tl = Math.hypot(tx,ty) || 1; tx/=tl; ty/=tl;
    const nx = -ty, ny = tx;
    const r = RAD[i] * sc;
    const s1 = proj(c[0]+nx*r, c[1]+ny*r, c[2]);
    const s2 = proj(c[0]-nx*r, c[1]-ny*r, c[2]);
    widths.push(+Math.hypot(s1[0]-s2[0], s1[1]-s2[1]).toFixed(3));
  }
  return { widths, screenLen: +len.toFixed(2), rings: S };
};
const bandReport = () => w.sling.bands.map(b => {
  const p = stripProfile(b); const wds = p ? p.widths : [];
  return { side: b.side, core: hex(b.tube?.core), coreLum: lum(hex(b.tube?.core)), coreHue: hueOf(hex(b.tube?.core)),
    screenLen: p?.screenLen,
    widthAtPouch: wds.length ? +Math.min(...wds.slice(-3)).toFixed(3) : null,
    widthAtFork:  wds.length ? +Math.max(...wds.slice(0,3)).toFixed(3) : null };
});
const forkReport = () => w.sling.prongs.map(p => ({ s: p.s,
  core: hex(p.tube?.core), coreLum: lum(hex(p.tube?.core)), coreHue: hueOf(hex(p.tube?.core)),
  tip: p.tip ? [+p.tip.x.toFixed(4), +p.tip.y.toFixed(4)] : null,
  rest: p.rest ? [+p.rest.x.toFixed(4), +p.rest.y.toFixed(4)] : null }));

/* every live particle of a pool, in SCREEN space */
const poolPoints = (k) => {
  const pool = w.fx?.pools?.[k]; if (!pool) return null;
  const P = pool.p, max = pool.max, out = [];
  for (let i=0;i<max;i++) if (P.life[i] > 0) {
    const s = proj(P.x[i], P.y[i], P.z[i]);
    out.push({ x:+s[0].toFixed(2), y:+s[1].toFixed(2), life:+(P.life[i]).toFixed(4),
               s: P.s ? +(P.s[i]).toFixed(4) : null });
  }
  return out;
};
const poolKeys = (k) => { const pool = w.fx?.pools?.[k]; return pool ? Object.keys(pool.p) : null; };
`;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const G = (body, ...a) => game(PRELUDE + body, ...a);
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };
  const DPR = 2;

  const crop = async (name, clip) => {
    const f = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: f, clip });
    return f;
  };

  const cropStrip = async (name, clip, { from = 0, to = 480, step = 40, cols = 0, scale = 560 } = {}) => {
    const tmp = path.join(OUT, `.cs-${name}`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    const label = (t) => page.evaluate((txt) => {
      let el = document.getElementById('__cs_label');
      if (!el) {
        el = document.createElement('div'); el.id = '__cs_label';
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

  const setVis = (name, v) => G(`
    const o = w.scene.getObjectByName(args[0]); if (!o) return false;
    o.visible = args[1]; SS.stepOnce(); return true;`, name, v);

  const fresh = () => game('SS.seed(11); await SS.seek(2000);');
  const ANG = 0.42, POW = 0.90;

  /* ============================================================= 0. HOOK SANITY */
  await fresh();
  say('state_fresh', await state());
  say('spark_pool_fields', await G(`return { spark4: poolKeys('spark4'), chip: poolKeys('chip') };`));

  /* ============================================================= 1. AUTO-FAIL: preview before earned */
  say('preview_before_any_input', await G(`
    const s = w.sling;
    return { visible: !!s.preview?.visible, drawn: s.drawn, state: s.state, level: w.level?.id ?? null };`));
  const firstDrag = await dragShot(ANG, 0.85, { steps: 6 });
  await game('SS.stepOnce();');
  say('first_drag', { angle: firstDrag.angle, clamped: firstDrag.clamped, grabbable: firstDrag.grabbable });
  say('preview_on_FIRST_drag_of_FIRST_level', await G(`
    const s = w.sling; return { visible: !!s.preview?.visible, drawn: +s.drawn.toFixed(3) };`));

  /* ============================================================= 2. RESTING COMPOSITION */
  await fresh();
  const compose = await G(`
    const s = w.sling;
    const sb = bboxScreen(s.group);
    const ammoB = s.ammo ? bboxScreen(s.ammo.mesh) : null;
    let far = -1e9;
    for (const b of [...(w.blocks||[]), ...(w.villains||[])]) {
      const bb = b.mesh ? bboxScreen(b.mesh) : null; if (!bb) continue;
      if (bb.x1 > far) far = bb.x1;
    }
    return { VW, VH, sling: sb,
      slingPctW:+(sb.w/VW*100).toFixed(2), slingCentrePctW:+(sb.cx/VW*100).toFixed(2),
      rightOfSlingPctW:+((VW-sb.x1)/VW*100).toFixed(2),
      furthestTargetPctW:+(far/VW*100).toFixed(2),
      ammo: ammoB, AD:+(ammoB?.h ?? 0).toFixed(2),
      pouchScreen: proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)),
      anchorScreen: proj(s.anchor.x,s.anchor.y,0).map(v=>+v.toFixed(2)),
      camZ:+cam.position.z.toFixed(3), fovY: cam.fov, worldWidthAtPlane: null };`);
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

  say('band_at_rest', await G(`return bandReport();`));
  say('fork_at_rest', await G(`return forkReport();`));

  /* --- occlusion: ammo crop with / without bands, measured in pixels later --- */
  const ammoClipFor = (a) => {
    const p = Math.max(16, a.h * 0.6);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y, width: Math.min(compose.VW - x, Math.round(a.w + p * 2)),
             height: Math.min(compose.VH - y, Math.round(a.h + p * 2)) };
  };
  const occl = async (tag, ammoBox) => {
    const c = ammoClipFor(ammoBox);
    await G(`w.sling.bands.forEach(b=>b.tube.group.visible=false); w.sling.prongs.forEach(p=>p.tube.group.visible=false); SS.stepOnce(); return 1;`);
    await crop(`occl-${tag}-AMMOONLY`, c);
    await G(`w.sling.bands.forEach(b=>b.tube.group.visible=true); SS.stepOnce(); return 1;`);
    await crop(`occl-${tag}-WITHBANDS`, c);
    await G(`w.sling.prongs.forEach(p=>p.tube.group.visible=true); SS.stepOnce(); return 1;`);
    return c;
  };
  say('occl_clip_rest', await occl('rest', compose.ammo));

  /* ============================================================= 3. STRETCH LADDER */
  const ladder = [];
  for (const p of [0, 0.5, 1.0]) {
    await fresh();
    if (p > 0) await G(`await SS.aim({angle:${ANG}, power:args[0]}); await SS.seek(320); return 1;`, p);
    else await G(`await SS.seek(320); return 1;`);
    const m = await G(`
      const s = w.sling; const a = bboxScreen(s.ammo.mesh);
      return { drawn:+s.drawn.toFixed(3), bands:bandReport(), fork:forkReport(), ammo:a, AD:+a.h.toFixed(2) };`);
    ladder.push({ power: p, ...m });
    await crop(`stretch-${String(p).replace('.', '')}-sling`, clipSling);
    await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
    await crop(`stretch-${String(p).replace('.', '')}-band-NOAMMO`, clipSling);
    await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);
    if (p === 1.0) say('occl_clip_full', await occl('full', m.ammo));
  }
  await writeFile(path.join(OUT, 'stretch-ladder.json'), JSON.stringify(ladder, null, 2));
  say('stretch_summary', ladder.map(l => ({
    power: l.power, drawn: l.drawn,
    lenL: l.bands[0]?.screenLen, wPouchL: l.bands[0]?.widthAtPouch, wForkL: l.bands[0]?.widthAtFork,
    tipL: l.fork[0]?.tip, restL: l.fork[0]?.rest, tipR: l.fork[1]?.tip, restR: l.fork[1]?.rest, AD: l.AD })));

  /* ============================================================= 4. RELEASE — dense numeric sampling */
  await fresh();
  await G(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); return 1;`);
  const rel = await G(`
    const s = w.sling;
    const dirRef = { x: s.anchor.x - s.pouch.x, y: s.anchor.y - s.pouch.y };
    const L = Math.hypot(dirRef.x, dirRef.y) || 1; dirRef.x/=L; dirRef.y/=L;
    const pouch0 = proj(s.pouch.x, s.pouch.y, 0);
    const info = await SS.release();
    const samples = []; let t = 0;
    for (let i=0;i<=60;i++) {
      const p0 = w.projectiles && w.projectiles[0];
      const am = p0 && p0.mesh ? bboxScreen(p0.mesh) : null;
      const pS = proj(s.pouch.x, s.pouch.y, 0);
      const gS = proj(0, 0, 0), hS = proj(70, 0, 0);
      const off = (s.pouch.x - s.anchor.x) * dirRef.x + (s.pouch.y - s.anchor.y) * dirRef.y;
      const sp = poolPoints('spark4') || [];
      // shot axis in screen space: pouch -> ammo
      let axis = null, lance = null;
      if (am && sp.length) {
        let ax = am.cx - pouch0[0], ay = am.cy - pouch0[1];
        const al = Math.hypot(ax,ay) || 1; ax/=al; ay/=al;
        const proj1 = sp.map(q => (q.x-pouch0[0])*ax + (q.y-pouch0[1])*ay);
        const perp  = sp.map(q => Math.abs((q.x-pouch0[0])*(-ay) + (q.y-pouch0[1])*ax));
        const dPouch = sp.map(q => Math.hypot(q.x-pouch0[0], q.y-pouch0[1]));
        const sorted = [...proj1].sort((a,b)=>a-b);
        // histogram of along-axis distance in 1-AD bins out to the ammo
        const bins = [];
        for (let b=0;b<14;b++) bins.push(0);
        for (const v of proj1) { const b = Math.floor(v/args[0]); if (b>=0 && b<14) bins[b]++; }
        lance = { n: sp.length,
          minAlong:+Math.min(...proj1).toFixed(2), maxAlong:+Math.max(...proj1).toFixed(2),
          medAlong:+sorted[Math.floor(sorted.length/2)].toFixed(2),
          nearestToPouchPx:+Math.min(...dPouch).toFixed(2),
          maxPerpPx:+Math.max(...perp).toFixed(2),
          binsPerAD: bins, axisLenPx:+al.toFixed(2) };
      }
      samples.push({ t: Math.round(t), state: s.state,
        pouchOffAlongShot:+off.toFixed(5),
        pouchScreen:[+pS[0].toFixed(2), +pS[1].toFixed(2)],
        bandLenL: (stripProfile(s.bands[0])||{}).screenLen ?? null,
        ammo: am ? { cx:+am.cx.toFixed(2), cy:+am.cy.toFixed(2), h:+am.h.toFixed(2), w:+am.w.toFixed(2),
                     x0:+am.x0.toFixed(2), y0:+am.y0.toFixed(2), x1:+am.x1.toFixed(2), y1:+am.y1.toFixed(2) } : null,
        gapPx: am ? +Math.hypot(am.cx-pS[0], am.cy-pS[1]).toFixed(2) : null,
        groundY:+gS[1].toFixed(3), horizonY:+hS[1].toFixed(3),
        camY:+cam.position.y.toFixed(5), camRotZ:+cam.rotation.z.toFixed(6),
        lance,
        flash: (poolPoints('flash')||[]).length, smoke: (poolPoints('smoke')||[]).length,
        chip: (poolPoints('chip')||[]).length });
      await SS.seek(10); t += 10;
    }
    return { info, pouch0, samples };`, AD);
  await writeFile(path.join(OUT, 'release-samples.json'), JSON.stringify(rel, null, 2));
  say('release_info', rel.info);
  const S = rel.samples;
  const at = (ms) => S.find(s => s.t === ms);

  say('release_key_frames', [0, 10, 20, 30, 50, 80, 100, 150, 250, 400, 600].map(ms => {
    const s = at(ms); if (!s) return { t: ms, missing: true };
    const l = s.lance;
    return { t: ms, gapAD: s.gapPx != null ? +(s.gapPx / AD).toFixed(2) : null,
      pouchOff: s.pouchOffAlongShot, bandLen: s.bandLenL,
      lanceN: l?.n ?? 0,
      lanceNearPouchAD: l ? +(l.nearestToPouchPx / AD).toFixed(2) : null,
      lanceHeadAD: l ? +(l.maxAlong / AD).toFixed(2) : null,
      lanceTailAD: l ? +(l.minAlong / AD).toFixed(2) : null,
      lanceMedAD: l ? +(l.medAlong / AD).toFixed(2) : null,
      ammoCentreAD: s.ammo ? +(s.gapPx / AD).toFixed(2) : null,
      headToAmmoAD: (l && s.gapPx != null) ? +((s.gapPx - l.maxAlong) / AD).toFixed(2) : null,
      fanWidthAD: l ? +(l.maxPerpPx / AD).toFixed(2) : null,
      binsPerAD: l?.binsPerAD, flash: s.flash, smoke: s.smoke, chip: s.chip };
  }));

  const offs = S.map(s => s.pouchOffAlongShot);
  const crossings = []; for (let i = 1; i < offs.length; i++) if ((offs[i-1] >= 0) !== (offs[i] >= 0)) crossings.push(S[i].t);
  const extrema = []; for (let i = 1; i < offs.length-1; i++) if ((offs[i]-offs[i-1])*(offs[i+1]-offs[i]) < 0) extrema.push({ t: S[i].t, off: offs[i] });
  say('recoil_zero_crossings_ms', crossings);
  say('recoil_extrema', extrema);
  say('recoil_still_after_ms', (() => {
    for (let i = 0; i < S.length; i++) if (S.slice(i).every(s => Math.abs(s.pouchOffAlongShot) < 0.005)) return S[i].t;
    return null; })());
  const g0 = S[0].groundY;
  say('camera_kick', {
    maxAbsPctH: +Math.max(...S.map(s => Math.abs(s.groundY - g0) / compose.VH * 100)).toFixed(3),
    at100_pctH: +((at(100).groundY - g0) / compose.VH * 100).toFixed(3),
    at250_pctH: +((at(250).groundY - g0) / compose.VH * 100).toFixed(3),
    camRotZ_max: +Math.max(...S.map(s => Math.abs(s.camRotZ))).toFixed(6),
    series: S.filter(s => s.t <= 300).map(s => ({ t: s.t, pctH: +((s.groundY-g0)/compose.VH*100).toFixed(3) })) });
  say('first_frame_at_8AD', (() => { const f = S.find(s => s.gapPx != null && s.gapPx / AD >= 8); return f ? { t: f.t, gapAD: +(f.gapPx/AD).toFixed(2) } : null; })());

  /* ============================================================= 5. LANCE PIXEL DIFF */
  /* Mask fx-spark4 and shoot the same frame twice. The difference IS the lance's
     rendered footprint — no scene-graph faith required. Clip spans pouch -> ammo. */
  const setup = async () => {
    await fresh();
    await G(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); await SS.release(); return 1;`);
  };

  const lanceClipAt = async () => G(`
    const s = w.sling; const p0 = w.projectiles?.[0];
    const pS = proj(s.pouch.x, s.pouch.y, 0);
    const am = p0?.mesh ? bboxScreen(p0.mesh) : null;
    const x0 = Math.min(pS[0], am ? am.x0 : pS[0]) - 90;
    const x1 = Math.max(pS[0], am ? am.x1 : pS[0]) + 90;
    const y0 = Math.min(pS[1], am ? am.y0 : pS[1]) - 90;
    const y1 = Math.max(pS[1], am ? am.y1 : pS[1]) + 90;
    return { x: Math.max(0, Math.round(x0)), y: Math.max(0, Math.round(y0)),
             width: Math.min(VW - Math.max(0, Math.round(x0)), Math.round(x1-x0)),
             height: Math.min(VH - Math.max(0, Math.round(y0)), Math.round(y1-y0)),
             pouch:[+pS[0].toFixed(2), +pS[1].toFixed(2)], ammo: am };`);

  const diffPack = {};
  for (const t of [0, 30, 60, 100, 160]) {
    await setup();
    if (t > 0) await game('await SS.seek(args[0]);', t);
    const c = await lanceClipAt();
    diffPack['t' + t] = c;
    await crop(`lance-t${t}-ON`, c);
    await setVis('fx-spark4', false);
    await crop(`lance-t${t}-OFF`, c);
    await setVis('fx-spark4', true);
  }
  say('lance_diff_clips', diffPack);
  await writeFile(path.join(OUT, 'lance-clips.json'), JSON.stringify(diffPack, null, 2));

  /* ============================================================= 6. FILMSTRIPS */
  await setup();
  say('fs_release_wide', await filmstrip('release-wide', { from: 0, to: 600, step: 50, cols: 4 }));
  await setup();
  say('fs_release_early', await filmstrip('release-early-20ms', { from: 0, to: 180, step: 20, cols: 5 }));

  const forkClip = {
    x: Math.max(0, Math.round(sb.x0 - 140)),
    y: Math.max(0, Math.round(sb.y0 - 170)),
    width: Math.round(sb.w + 560),
    height: Math.round(sb.h + 340),
  };
  forkClip.width = Math.min(forkClip.width, compose.VW - forkClip.x);
  forkClip.height = Math.min(forkClip.height, compose.VH - forkClip.y);
  say('forkClip', forkClip);
  await setup();
  say('cs_release_fine', await cropStrip('lance-fine', forkClip, { from: 0, to: 160, step: 20, cols: 3, scale: 620 }));
  await setup();
  say('cs_band_recoil', await cropStrip('band-recoil', forkClip, { from: 0, to: 450, step: 25, cols: 5, scale: 460 }));

  /* ============================================================= 7. BLIND CANDIDATE */
  const target = S.find(s => s.gapPx != null && s.gapPx / AD >= 8);
  const tBlind = target ? target.t : 80;
  say('blind_frame_t', tBlind);
  await setup();
  if (tBlind > 0) await game('await SS.seek(args[0]);', tBlind);
  say('blind_frame_state', await G(`
    const s = w.sling; const p0 = w.projectiles?.[0];
    return { slingState: s.state, ammo: p0?.mesh ? bboxScreen(p0.mesh) : null,
             spark: (poolPoints('spark4')||[]).length,
             pouchScreen: proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)) };`));
  await shot('BLIND-CANDIDATE-release-instant');

  await setup();
  await game('await SS.seek(args[0]);', 40);
  await shot('BLIND-CANDIDATE-t40');

  await writeFile(path.join(OUT, 'MEASUREMENTS.json'), JSON.stringify(R, null, 2));
  console.log('### DONE');
};
