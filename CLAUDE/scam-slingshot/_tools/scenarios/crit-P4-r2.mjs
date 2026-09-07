/**
 * crit-P4-r2.mjs — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 2.
 *
 * Written from RUBRIC.md § P4 only. Every threshold gets a number, and every number that can be
 * taken from PIXELS is taken from pixels (the world-space projection is only a cross-check).
 *
 *   1 horizon 40-60 %H, does not move vertically during an X pan, all gameplay below it
 *   2 >= 40 %H of the frame above the tallest object is empty graded sky
 *   3 at aim: sling 10-18 %W, furthest target 82-92 %W, gap deliberately empty
 *   4 mid-flight: projectile 55-75 %W, structure 40-60 %W (camera LEADS)
 *   5 pull-back on drag: visible world width +8..20 %, eased, returns after release
 *   6 shake peak <= 2.5 %H, < 0.2 %H by 350 ms, no roll, stops <600 ms after last body sleeps,
 *     no drift/hunting in the final 10 tiles
 *   7 after settle every surviving villain inside the frame with >= 5 % margin
 *   8 narrow FOV: vertical edge angle drift centre -> edge <= 3 deg (28-35 deg call)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const dist = () => cam.position.z;
  const vh   = () => 2*Math.tan(cam.fov*Math.PI/360)*dist();
  const vw   = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:+cam.fov.toFixed(3), aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(4), vh:+vh().toFixed(4),
      q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w].map(v=>+v.toFixed(6)) });
  const lv = () => W.level;
  const liveExtents = () => { let right=-1e9, left=1e9, top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      const hw=(b.halfW||0.5), hh=(b.halfH||0.5);
      right=Math.max(right,t.x+hw); left=Math.min(left,t.x-hw); top=Math.max(top,t.y+hh); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); top=Math.max(top,t.y+0.9); }
    return { left:+left.toFixed(3), right:+right.toFixed(3), top:+top.toFixed(3) }; };
  const slingWorld = () => { const s = W.sling; if (!s) return null;
    const a = s.anchor || s.forkTop || s.origin || null;
    return a ? { x:+a.x.toFixed(3), y:+a.y.toFixed(3) } : { x:+(s.x||0).toFixed(3), y:+(s.y||0).toFixed(3) }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel();
    return { x:+t.x.toFixed(3), y:+t.y.toFixed(3), vx:+v.x.toFixed(3), vy:+v.y.toFixed(3) }; };
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = { note: 'INDEPENDENT P4 critic, round 2. Thresholds from RUBRIC.md §P4.' };
  const g = (body, ...a) => game(PRE + body, ...a);

  // ---------- pixel analyser: decode our own PNGs and read real pixels ----------
  const an = await page.browser().newPage();
  await an.setContent('<canvas id="c"></canvas>');
  const analyze = async (file, code) => {
    const b64 = (await readFile(file)).toString('base64');
    return an.evaluate(async (src, codeStr) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = (x, y) => { const i = (((y | 0) * d.width) + (x | 0)) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
      const lum = (x, y) => { const p = px(x, y); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
      return new Function('px', 'lum', 'W', 'H', codeStr)(px, lum, d.width, d.height);
    }, 'data:image/png;base64,' + b64, code);
  };

  // strongest horizontal luminance step down a column -> the horizon as PIXELS
  const HORIZON = `
    const col = Math.round(W*ARGX);
    let best = null, prev = lum(col, 1), all = [];
    for (let y = 2; y < H; y++) {
      const l = lum(col, y), d = l - prev;
      if (Math.abs(d) > 6) all.push({ pctH:+(y/H*100).toFixed(3), d:+d.toFixed(1) });
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { y, pctH:+(y/H*100).toFixed(3), d:+d.toFixed(1) };
      prev = l;
    }
    return { col, strongest: best, firstSteps: all.slice(0, 8) };`;
  const horizonAt = (f, x) => analyze(f, HORIZON.replace(/ARGX/g, String(x)));

  const hideHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u => u.style.visibility = 'hidden');
  });
  const showHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u => u.style.visibility = '');
  });

  const SETUP = 'await SS.seed(7); await SS.seek(2600);';

  // ======================= 0. sanity: what am I looking at =======================
  await g(SETUP);
  M.stateAtAim = await state();
  M.worldKeys = await g('return Object.keys(W);');
  M.slingProbe = await g('return { sling: W.sling ? Object.keys(W.sling) : null, val: slingWorld() };');

  // ======================= 1. AIM FRAME (the blind candidate) =======================
  const aimHud = await shot('aim-hud');
  await hideHud();
  const aimNo = await shot('aim-nohud');
  await showHud();
  M.files = { aimHud: path.basename(aimHud), aimNo: path.basename(aimNo) };

  M.aimWorld = await g(`
    const e = liveExtents(), s = slingWorld();
    const sl = s ? proj(s.x, s.y) : null;
    const tgt = proj(e.right, 0.8);
    const tallTop = proj((e.left+e.right)/2, e.top);
    return { cam: camI(), extents: e, sling: s, slingPctW: sl && sl.w, slingPctH: sl && sl.h,
             targetPctW: tgt.w, tallestTopPctH: tallTop.h,
             emptySkyAboveTallestPctH: +tallTop.h.toFixed(2) };`);

  // pixel horizon at three columns, one of them clear of geometry
  M.horizonPx = {
    at12: await horizonAt(aimNo, 0.12),
    at50: await horizonAt(aimNo, 0.50),
    at97: await horizonAt(aimNo, 0.97),
  };

  // sky gradient + emptiness of the sky band above the tallest object
  M.skyBand = await analyze(aimNo, `
    const s = (fx,fy) => px(Math.round(W*fx), Math.round(H*fy));
    const L = p => +(0.2126*p[0]+0.7152*p[1]+0.0722*p[2]).toFixed(1);
    const top = s(0.5,0.02), q = s(0.5,0.15), mid = s(0.5,0.28);
    let busy=0, tot=0;
    for (let y=2; y<Math.round(H*0.34); y+=4) {
      const row=[]; for (let x=0; x<W; x+=6) row.push(lum(x,y));
      const med = row.slice().sort((a,b)=>a-b)[row.length>>1];
      for (const l of row) { tot++; if (Math.abs(l-med) > 14) busy++; }
    }
    return { topRGB:top, topLum:L(top), qLum:L(q), midRGB:mid, midLum:L(mid),
             gradientDeltaLum:+(L(mid)-L(top)).toFixed(1),
             busyPctOfTop34: +(busy/tot*100).toFixed(2) };`);

  // ink-column profile: for each 1%W column, the LOWEST y that is not sky-coloured.
  // This gives the true silhouette of everything in the frame -> real "empty sky above" and
  // real left/right occupancy, from pixels, no world knowledge.
  M.silhouette = await analyze(aimNo, `
    const skyTop = px(Math.round(W*0.5), 2);
    const cols = [];
    for (let i=0;i<100;i++) {
      const x = Math.min(W-1, Math.round(W*(i+0.5)/100));
      let firstY = null;
      for (let y=2; y<H; y++) {
        const p = px(x,y);
        // "not sky": differs from the vertical gradient by a real amount in any channel.
        // Sample the gradient itself at x=1..3 (frame edge is always sky in a wide shot)?  No —
        // instead compare to the running column median above, which is the sky it sits in.
        const ref = px(Math.min(W-1,x), Math.max(0,y-Math.round(H*0.06)));
        const d = Math.abs(p[0]-ref[0])+Math.abs(p[1]-ref[1])+Math.abs(p[2]-ref[2]);
        if (d > 46) { firstY = y; break; }
      }
      cols.push({ pctW:i+0.5, topPctH: firstY===null?null:+(firstY/H*100).toFixed(2) });
    }
    const filled = cols.filter(c=>c.topPctH!==null);
    const minTop = filled.length? Math.min(...filled.map(c=>c.topPctH)) : null;
    return { skyTopRGB: skyTop, cols, highestInkPctH: minTop };`);

  // ======================= 2. PULL-BACK ON DRAG =======================
  await g(SETUP);
  const rest = await g('return { vw:+vw().toFixed(4), x:+cam.position.x.toFixed(3), y:+cam.position.y.toFixed(3), z:+cam.position.z.toFixed(3) };');
  const pull = [{ tag: 'rest', ...rest }];
  for (const p of [0.25, 0.5, 0.75, 1.0]) {
    await g('SS.aim({angle:0.55, power:args[0]}); await SS.seek(500);', p);
    pull.push({ tag: 'p' + p, ...(await g('return { vw:+vw().toFixed(4), x:+cam.position.x.toFixed(3), y:+cam.position.y.toFixed(3), z:+cam.position.z.toFixed(3) };')) });
  }
  M.pullback = { samples: pull, pctGrowth: +(((pull[4].vw / pull[0].vw) - 1) * 100).toFixed(2) };
  await hideHud(); await shot('drawn-full-nohud'); await showHud();

  // easing: is the width change a ramp or a snap?
  await g(SETUP);
  await g('SS.aim({angle:0.55, power:1.0});');
  const ease = [];
  for (let t = 0; t <= 900; t += 60) { ease.push({ t, vw: await g('return +vw().toFixed(4);') }); if (t < 900) await g('await SS.seek(60);'); }
  M.pullbackEase = ease;

  // ...and does it return after release?
  await g(SETUP + ' SS.aim({angle:0.55, power:1.0}); await SS.seek(600);');
  const drawnVw = await g('return +vw().toFixed(4);');
  await g('SS.release(); await SS.seek(900);');
  const afterVw = await g('return +vw().toFixed(4);');
  M.pullbackReturn = { restVw: rest.vw, drawnVw, afterReleaseVw: afterVw };

  // ======================= 3. MID-FLIGHT LEAD =======================
  const FIRE = SETUP + ' SS.aim({angle:0.55, power:1.0}); await SS.seek(500); SS.release();';
  await g(FIRE);
  const flight = [];
  for (let t = 0; t <= 1600; t += 80) {
    flight.push({ t, ...(await g(`
      const p = proje(), e = liveExtents();
      const st = proj((e.left+e.right)/2, 1.5);
      return { proj: p ? proj(p.x,p.y) : null, wx: p&&p.x, vx: p&&p.vx,
               structPctW: st.w, camx:+cam.position.x.toFixed(3), vw:+vw().toFixed(3),
               roll:+cam.quaternion.z.toFixed(7) };`)) });
    if (t < 1600) await g('await SS.seek(80);');
  }
  M.flight = flight;

  await g(FIRE);
  await hideHud();
  await filmstrip('flight-lead', { from: 120, to: 1320, step: 150, cols: 3 });
  await showHud();

  // one clean mid-flight still
  await g(FIRE + ' await SS.seek(560);');
  await hideHud();
  const mid = await shot('midflight-nohud');
  await showHud();
  M.midflightHorizonPx = { at12: await horizonAt(mid, 0.12), at50: await horizonAt(mid, 0.50), at97: await horizonAt(mid, 0.97) };
  M.midflightCam = await g('return camI();');

  // ======================= 4. HORIZON UNDER A PURE X PAN =======================
  // The camera pans in X between aim and flight. Compare the PIXEL horizon in the aim frame and
  // in a frame after the camera has moved a long way in x with no other change.
  M.panHorizon = { aimCamX: M.aimWorld.cam.x, midCamX: M.midflightCam.x,
                   aimPx: M.horizonPx.at97.strongest, midPx: M.midflightHorizonPx.at97.strongest };

  // ======================= 5. SHAKE / QUIET =======================
  await g(FIRE);
  const trace = [];
  for (let t = 0; t <= 4000; t += 20) {
    trace.push(await g(`
      let asleep=0, tot=0;
      for (const b of W.blocks) if (!b.dead) { tot++; if (b.body.isSleeping()) asleep++; }
      for (const d of (W.debris||[])) { tot++; if (d.body && d.body.isSleeping()) asleep++; }
      return { t: args[0], x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5),
               roll:+cam.quaternion.z.toFixed(8), vh:+vh().toFixed(5), asleep, tot, hitStop: W.hitStop };`, t));
    if (t < 4000) await g('await SS.seek(20);');
  }
  M.shakeTrace = trace;

  await g(FIRE + ' await SS.seek(500);');
  await hideHud();
  await filmstrip('impact-shake', { from: 0, to: 700, step: 50, cols: 5 });
  await showHud();

  // ======================= 6. SETTLE / AUTO-FRAME / DRIFT =======================
  await g(FIRE + ' await SS.seek(6500);');
  M.settleState = await state();
  M.settle = await g(`
    const out=[];
    for (const v of W.villains) if (v.alive) { const t=v.body.translation(); const p=proj(t.x,t.y);
      out.push({ x:+t.x.toFixed(2), y:+t.y.toFixed(2), pctW:p.w, pctH:p.h,
                 marginPctW: +Math.min(p.w, 100-p.w).toFixed(2), marginPctH: +Math.min(p.h, 100-p.h).toFixed(2) }); }
    return { villains: out, cam: camI() };`);
  await hideHud();
  await shot('settled-nohud');
  await filmstrip('settle-quiet', { from: 0, to: 2400, step: 200, cols: 4 });
  await showHud();
  const drift = [];
  for (let t = 0; t <= 1500; t += 100) {
    drift.push(await g('return { t: args[0], x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5) };', t));
    if (t < 1500) await g('await SS.seek(100);');
  }
  M.settleDrift = drift;

  // ======================= 7. FOV / VERTICAL EDGE READ =======================
  await g(SETUP);
  M.fov = await g(`
    const e = liveExtents(), out = [];
    const xs = [e.left-3, e.left, (e.left+e.right)/2, e.right, e.right+3];
    for (const x of xs) {
      const a = proj(x, 0.4, 0.6), b = proj(x, 3.0, 0.6);
      const back = proj(x, 3.0, -0.6);
      const ang = Math.atan2(b.w-a.w, a.h-b.h) * 180/Math.PI;
      out.push({ x:+x.toFixed(2), pctW:a.w, edgeAngleDeg:+ang.toFixed(3), depthWedgePctW:+(back.w-b.w).toFixed(3) });
    }
    return { fovDeg:+cam.fov.toFixed(2), dist:+dist().toFixed(2), edges: out };`);

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({
    aimWorld: M.aimWorld, horizonPx: { at12: M.horizonPx.at12.strongest, at50: M.horizonPx.at50.strongest, at97: M.horizonPx.at97.strongest },
    skyBand: M.skyBand, highestInk: M.silhouette.highestInkPctH,
    pullback: M.pullback.pctGrowth, pullbackReturn: M.pullbackReturn,
    fov: M.fov, settle: M.settle,
  }, null, 2));
  await an.close();
};
