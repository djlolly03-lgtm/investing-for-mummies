/**
 * crit-P4-r1.mjs — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 1.
 *
 * Measures every numeric threshold in RUBRIC.md § P4:
 *   1 horizon 40-60 %H, fixed under an X pan, all gameplay below it
 *   2 >= 40 %H of empty graded sky above the tallest object at aim
 *   3 sling 10-18 %W, furthest target 82-92 %W
 *   4 mid-flight lead: projectile 55-75 %W, structure 40-60 %W
 *   5 drag pull-back: visible world width +8..20 %, eased, returns after release
 *   6 shake peak <= 2.5 %H, < 0.2 %H by 350 ms, no roll, stops <600 ms after sleep, no drift
 *   7 after settle every surviving villain inside frame with >= 5 % margin
 *   8 narrow FOV read: vertical edge angle drift <= 3 deg centre -> edge
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = cam.position.clone(); v.set(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const dist = () => cam.position.z;                       // z=0 play plane, camera looks down -Z
  const vh   = () => 2*Math.tan(cam.fov*Math.PI/360)*dist();
  const vw   = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:cam.fov, aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(4), vh:+vh().toFixed(4),
      q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w].map(v=>+v.toFixed(6)),
      up:[cam.up.x,cam.up.y,cam.up.z] });
  const lv = () => W.level;
  const extents = () => { let right=-1e9, top=-1e9, left=1e9;
    for (const b of lv().blocks) { right=Math.max(right,b.x+b.w/2); left=Math.min(left,b.x-b.w/2); top=Math.max(top,b.y+b.h/2); }
    for (const v of lv().villains) { right=Math.max(right,v.x); top=Math.max(top,v.y+0.9); }
    return { left, right, top }; };
  const liveTop = () => { let top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation(); top=Math.max(top, t.y + (b.halfH||0.5)); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation(); top=Math.max(top, t.y+0.9); }
    return top; };
  const proje = () => { const p=W.projectiles.filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel(); return { x:t.x, y:t.y, vx:v.x, vy:v.y }; };
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = { note: 'independent P4 critic, round 1' };
  const g = (body, ...a) => game(PRE + body, ...a);

  // ---------- pixel analyser (separate page; decodes our PNGs and reads real pixels) ----------
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
  // find every strong horizontal luminance edge down one column -> horizon candidates
  const EDGES = `
    const col = Math.round(W*ARGX);
    const out = [];
    let prev = lum(col, 0);
    for (let y = 2; y < H; y += 1) {
      const l = lum(col, y);
      if (Math.abs(l - prev) > 9) out.push({ pctH: +(y / H * 100).toFixed(2), d: +(l - prev).toFixed(1), lum: +l.toFixed(1) });
      prev = l;
    }
    return { col, topLum:+lum(col,4).toFixed(1), midLum:+lum(col,Math.round(H*0.30)).toFixed(1), edges: out.slice(0,40) };`;
  const edgesAt = (f, x) => analyze(f, EDGES.replace(/ARGX/g, String(x)));

  const hideHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; });
  const showHud = () => page.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });

  // ============================ 1. AIM FRAME ============================
  await g('await SS.seed(3); await SS.seek(2600);');
  M.stateAtAim = await state();
  const aimHud = await shot('aim-landscape-hud');
  await hideHud();
  const aimNo = await shot('aim-landscape-nohud');
  await showHud();

  M.aim = await g(`
    const e = extents();
    const sl = proj(0, 3.50);                       // sling fork anchor
    const tgt = proj(e.right, 0.6);                 // furthest target
    const tall = proj(18.0, liveTop());             // tallest live object top
    const ground = proj(9, 0);                      // ground line at play plane
    const eye = proj(cam.position.x, cam.position.y); // optical eye level
    return { cam: camI(), extents: e, slingPctW: sl.w, targetPctW: tgt.w,
             tallestTopPctH: tall.h, groundPctH: ground.h, eyeLevelPctH: eye.h,
             gapEmptyPctW: +(tgt.w - sl.w).toFixed(2) };`);

  M.aimEdges = { at45pctW: await edgesAt(aimNo, 0.45), at97pctW: await edgesAt(aimNo, 0.97) };

  // sky gradient (top vs just above horizon) + emptiness of the sky band
  M.skyBand = await analyze(aimNo, `
    const samp = (fx, fy) => { const p = px(Math.round(W*fx), Math.round(H*fy)); return p; };
    const top = samp(0.5, 0.02), mid = samp(0.5, 0.20), low = samp(0.5, 0.36);
    // emptiness: fraction of pixels in the top 38%H that deviate >14 lum from their row median
    let busy = 0, tot = 0;
    for (let y = 2; y < Math.round(H*0.38); y += 4) {
      const row = []; for (let x = 0; x < W; x += 8) row.push(lum(x, y));
      const med = row.slice().sort((a,b)=>a-b)[row.length>>1];
      for (const l of row) { tot++; if (Math.abs(l - med) > 14) busy++; }
    }
    return { topRGB: top, midRGB: mid, lowRGB: low,
             topLum:+(0.2126*top[0]+0.7152*top[1]+0.0722*top[2]).toFixed(1),
             lowLum:+(0.2126*low[0]+0.7152*low[1]+0.0722*low[2]).toFixed(1),
             busyPctOfSkyBand: +(busy/tot*100).toFixed(2) };`);

  // ============================ 2. PULL-BACK ON DRAG ============================
  const pull = [];
  pull.push({ tag: 'rest', ...(await g('return { vw:+vw().toFixed(4), cx:+cam.position.x.toFixed(3), z:+cam.position.z.toFixed(3) };')) });
  for (const p of [0.25, 0.5, 0.75, 1.0]) {
    await g('SS.aim({angle:0.60, power:args[0]}); await SS.seek(400);', p);
    pull.push({ tag: 'stretch' + p, ...(await g('return { vw:+vw().toFixed(4), cx:+cam.position.x.toFixed(3), z:+cam.position.z.toFixed(3) };')) });
  }
  M.pullback = pull;
  M.pullbackPct = +(((pull[pull.length - 1].vw / pull[0].vw) - 1) * 100).toFixed(2);
  await hideHud(); const drawn = await shot('drawn-full-nohud'); await showHud();
  M.drawnShot = path.basename(drawn);

  // easing of the pull-back, sampled every 60 ms while the drag ramps (aim() is instant, so this
  // shows whether the CAMERA eases into the new width or snaps)
  await g('await SS.seed(3); await SS.seek(2600);');
  const base = await g('return +vw().toFixed(4);');
  await g('SS.aim({angle:0.60, power:1.0});');
  const ease = [];
  for (let t = 0; t <= 720; t += 60) { ease.push({ t, vw: await g('return +vw().toFixed(4);') }); await g('await SS.seek(60);'); }
  M.pullbackEase = { restVw: base, samples: ease };

  // ============================ 3. RELEASE / FLIGHT LEAD ============================
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release();');
  const flight = [];
  for (let t = 0; t <= 1400; t += 100) {
    const s = await g(`
      const p = proje(); const e = extents();
      const st = proj(18.0, 3.0);
      const gl = proj(cam.position.x, 0);
      return { p: p ? proj(p.x, p.y) : null, wx: p ? +p.x.toFixed(2) : null, vx: p ? +p.vx.toFixed(2) : null,
               structPctW: st.w, groundPctH: gl.h, camx: +cam.position.x.toFixed(3), vw: +vw().toFixed(3),
               q: camI().q };`);
    flight.push({ t, ...s });
    await g('await SS.seek(100);');
  }
  M.flight = flight;

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release();');
  await hideHud();
  await filmstrip('flight-lead', { from: 100, to: 1300, step: 150, cols: 3 });
  await showHud();

  // mid-flight single frame for the blind pair candidate + horizon-under-pan check
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release(); await SS.seek(700);');
  await hideHud();
  const midFlight = await shot('midflight-nohud');
  await showHud();
  M.midflightEdges = { at45pctW: await edgesAt(midFlight, 0.45), at97pctW: await edgesAt(midFlight, 0.97) };
  M.midflightCam = await g('return camI();');

  // ============================ 4. SHAKE / QUIET ============================
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release();');
  // find impact tick: step 20 ms until the first block takes damage / speed spikes
  const shake = [];
  for (let t = 0; t <= 3000; t += 20) {
    shake.push(await g(`
      const gl = proj(cam.position.x, 0);
      let asleep = 0, tot = 0;
      for (const b of W.blocks) if (!b.dead) { tot++; if (b.body.isSleeping()) asleep++; }
      return { t: args[0], camY: +cam.position.y.toFixed(5), camX: +cam.position.x.toFixed(4), camZ: +cam.position.z.toFixed(4),
               glH: gl.h, roll: +cam.quaternion.z.toFixed(7), asleep, tot, hs: W.hitStop };`, t));
    await g('await SS.seek(20);');
  }
  M.shakeTrace = shake;

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release(); await SS.seek(700);');
  await hideHud();
  await filmstrip('impact-shake', { from: 0, to: 640, step: 40, cols: 5 });
  await showHud();

  // ============================ 5. SETTLE / AUTO-FRAME ============================
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.60, power:1.0}); await SS.seek(300); SS.release(); await SS.seek(6000);');
  M.settleState = await state();
  M.settle = await g(`
    const out = [];
    for (const v of W.villains) if (v.alive) { const t = v.body.translation(); const p = proj(t.x, t.y);
      out.push({ x:+t.x.toFixed(2), y:+t.y.toFixed(2), pctW:p.w, pctH:p.h }); }
    return { villains: out, cam: camI() };`);
  await hideHud();
  const settled = await shot('settled-nohud');
  await showHud();
  await filmstrip('settle-quiet', { from: 0, to: 2000, step: 200, cols: 4 });
  const settleDrift = [];
  for (let t = 0; t <= 1200; t += 100) {
    settleDrift.push(await g('return { t: args[0], x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4) };', t));
    await g('await SS.seek(100);');
  }
  M.settleDrift = settleDrift;

  // ============================ 6. FOV / VERTICAL EDGE READ ============================
  await g('await SS.seed(3); await SS.seek(2600);');
  M.fov = await g(`
    // a 2.6-unit-tall vertical edge, at the play plane and at the front face (z=+0.6),
    // sampled at several world x that map across the frame. With no roll and lookAt -Z the
    // projected edge should be exactly vertical; the visible "wedge" is the front/back offset.
    const out = [];
    for (const x of [extents().left - 4, 4, 11, 18, extents().right]) {
      const a = proj(x, 0.44, 0.6), b = proj(x, 3.04, 0.6);
      const back = proj(x, 3.04, -0.6);
      const ang = Math.atan2(b.w - a.w, a.h - b.h) * 180 / Math.PI;
      out.push({ x, pctW: a.w, edgeAngleDeg: +ang.toFixed(3), depthWedgePctW: +(back.w - b.w).toFixed(3) });
    }
    return { fovDeg: cam.fov, dist: +dist().toFixed(2), edges: out, cam: camI() };`);

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({
    aim: M.aim, skyBand: M.skyBand, pullbackPct: M.pullbackPct,
    fov: M.fov, settle: M.settle,
  }, null, 2));
  await an.close();
};
