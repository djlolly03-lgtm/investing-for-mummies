/**
 * crit-P4-r3.mjs — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 3.
 *
 * Written from RUBRIC.md §P4 only. Numbers come from PIXELS wherever pixels can give them;
 * the world->screen projection is a cross-check, never the sole source.
 *
 *  1 horizon 40-60 %H, does not move vertically during an X pan, all gameplay below it
 *  2 >= 40 %H of frame above the tallest object is empty graded sky
 *  3 at aim: sling 10-18 %W, furthest target 82-92 %W, gap deliberately empty
 *  4 mid-flight: projectile 55-75 %W toward travel, target structure 40-60 %W, never centred
 *  5 pull-back on drag: world width +8..20 %, eased, returns after release
 *  6 shake peak <= 2.5 %H, < 0.2 %H by 350 ms, no roll, stops < 600 ms after last body sleeps
 *  7 after settle every surviving villain inside frame with >= 5 % margin
 *  8 narrow FOV: vertical edge angle drift centre -> edge <= 3 deg
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const V3 = cam.position.constructor;
  const proj = (x,y,z) => { const v = new V3(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const dist = () => cam.position.z;
  const vh   = () => 2*Math.tan(cam.fov*Math.PI/360)*dist();
  const vw   = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:+cam.fov.toFixed(3), aspect:+cam.aspect.toFixed(4), vw:+vw().toFixed(4), vh:+vh().toFixed(4),
      roll:+cam.quaternion.z.toFixed(8), qx:+cam.quaternion.x.toFixed(8), qy:+cam.quaternion.y.toFixed(8) });
  // every STANDING (non-dead, non-debris) block + alive villain, real half-extents
  const standing = () => { const out=[];
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      out.push({ x:t.x, y:t.y, hw:(b.w||1)/2, hh:(b.h||1)/2, mat:b.matName }); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      out.push({ x:t.x, y:t.y, hw:(v.radius||0.5), hh:(v.radius||0.5)*1.5, mat:'villain' }); }
    return out; };
  const extents = () => { const s=standing(); if(!s.length) return null;
    let l=1e9,r=-1e9,t=-1e9,b=1e9, sx=0,n=0;
    for (const o of s){ l=Math.min(l,o.x-o.hw); r=Math.max(r,o.x+o.hw); t=Math.max(t,o.y+o.hh); b=Math.min(b,o.y-o.hh); sx+=o.x; n++; }
    return { left:+l.toFixed(3), right:+r.toFixed(3), top:+t.toFixed(3), bottom:+b.toFixed(3), cx:+(sx/n).toFixed(3), n }; };
  const slingWorld = () => { const a = W.sling && W.sling.anchor; return a ? { x:a.x, y:a.y } : null; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel();
    return { x:+t.x.toFixed(3), y:+t.y.toFixed(3), vx:+v.x.toFixed(3), vy:+v.y.toFixed(3) }; };
  const damageSum = () => { let d=0; for (const b of W.blocks) d += (b.damage||0); return +d.toFixed(3); };
  const sleepInfo = () => { let a=0,n=0;
    for (const b of W.blocks) if(!b.dead){ n++; if(b.body.isSleeping()) a++; }
    for (const d of (W.debris||[])) if(d.body){ n++; if(d.body.isSleeping()) a++; }
    return { asleep:a, total:n }; };
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = { note: 'INDEPENDENT P4 critic r3. Thresholds from RUBRIC.md §P4.' };
  const g = (body, ...a) => game(PRE + body, ...a);

  // ---------- pixel analyser ----------
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
      const px = (x, y) => { const i = (((y|0) * d.width) + (x|0)) * 4; return [d.data[i], d.data[i+1], d.data[i+2]]; };
      const lum = (x, y) => { const p = px(x, y); return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]; };
      return new Function('px', 'lum', 'W', 'H', codeStr)(px, lum, d.width, d.height);
    }, 'data:image/png;base64,' + b64, code);
  };

  // strongest luminance step down a column -> the pixel horizon
  const HORIZON = `
    const col = Math.round(W*ARGX);
    let best=null, prev=lum(col,1), steps=[];
    for (let y=2; y<H; y++) { const l=lum(col,y), d=l-prev;
      if (Math.abs(d)>5) steps.push({ pctH:+(y/H*100).toFixed(3), d:+d.toFixed(1) });
      if (!best || Math.abs(d)>Math.abs(best.d)) best={ y, pctH:+(y/H*100).toFixed(3), d:+d.toFixed(1) };
      prev=l; }
    return { col, strongest:best, steps: steps.slice(0,10) };`;
  const horizonAt = (f, x) => analyze(f, HORIZON.replace(/ARGX/g, String(x)));

  // ink profile: for each of 200 columns the highest non-sky y (silhouette top)
  const INK = `
    const cols=[];
    for (let i=0;i<200;i++){
      const x=Math.min(W-1, Math.round(W*(i+0.5)/200));
      let firstY=null;
      for (let y=2;y<H;y++){
        const p=px(x,y), ref=px(x, Math.max(0, y-Math.round(H*0.05)));
        const dd=Math.abs(p[0]-ref[0])+Math.abs(p[1]-ref[1])+Math.abs(p[2]-ref[2]);
        if (dd>46){ firstY=y; break; }
      }
      cols.push({ pctW:+((i+0.5)/2).toFixed(2), topPctH: firstY===null?null:+(firstY/H*100).toFixed(2) });
    }
    const f=cols.filter(c=>c.topPctH!==null);
    return { cols, highestInkPctH: f.length?Math.min(...f.map(c=>c.topPctH)):null,
             leftmostInkPctW: f.length?f[0].pctW:null, rightmostInkPctW: f.length?f[f.length-1].pctW:null };`;

  const hideHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui],#__strip_label').forEach(u => u.style.visibility='hidden');
  });
  const showHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u => u.style.visibility='');
  });

  const SETUP = 'await SS.seed(7); await SS.seek(2600);';

  // ================= 0. level geometry & sanity =================
  await g(SETUP);
  M.state = await state();
  M.geom = await g('return { extents: extents(), sling: slingWorld(), standing: standing().map(o=>({x:+o.x.toFixed(2),y:+o.y.toFixed(2),hw:+o.hw.toFixed(2),hh:+o.hh.toFixed(2),mat:o.mat})), cam: camI(), compose: W.rig.compose };');

  // ================= 1. AIM FRAME =================
  const aimHud = await shot('aim-hud');
  await hideHud(); const aimNo = await shot('aim-nohud'); await showHud();
  M.files = { aimHud: path.basename(aimHud), aimNo: path.basename(aimNo) };

  M.aim = await g(`
    const e=extents(), s=slingWorld();
    const sp=proj(s.x,s.y), spBase=proj(s.x,0.0);
    const far=proj(e.right,0.8), farV=(()=>{ let best=null;
      for (const v of W.villains) if (v.alive) { const t=v.body.translation();
        if (!best || t.x>best.x) best={x:t.x,y:t.y}; }
      return best?proj(best.x,best.y):null; })();
    const tallTop=proj(e.cx,e.top);
    return { cam:camI(), extents:e, slingWorld:s, slingPctW:sp.w, slingPctH:sp.h, slingBasePctH:spBase.h,
             farthestBlockEdgePctW:far.w, farthestVillainPctW: farV&&farV.w,
             tallestTopPctH: tallTop.h, leftEdgePctW: proj(e.left, e.top).w, rightEdgePctW: proj(e.right,e.top).w };`);

  M.aimHorizonPx = { at03: await horizonAt(aimNo,0.03), at30: await horizonAt(aimNo,0.30),
                     at45: await horizonAt(aimNo,0.45), at97: await horizonAt(aimNo,0.97) };
  M.aimInk = await analyze(aimNo, INK);
  M.aimSky = await analyze(aimNo, `
    const L=(p)=>+(0.2126*p[0]+0.7152*p[1]+0.0722*p[2]).toFixed(1);
    const t=px(Math.round(W*0.5),2), m=px(Math.round(W*0.5),Math.round(H*0.22)), b=px(Math.round(W*0.5),Math.round(H*0.40));
    return { topRGB:t, topLum:L(t), midRGB:m, midLum:L(m), lowRGB:b, lowLum:L(b), gradTopToLow:+(L(b)-L(t)).toFixed(1) };`);

  // ================= 2. PULL-BACK ON DRAG =================
  await g(SETUP);
  const restVw = await g('return +vw().toFixed(4);');
  const pull=[{tag:'rest', vw:restVw}];
  for (const p of [0.25,0.5,0.75,1.0]) {
    await g('SS.aim({angle:0.30, power:args[0]}); await SS.seek(600);', p);
    pull.push({ tag:'p'+p, vw: await g('return +vw().toFixed(4);') });
  }
  M.pullback = { samples: pull, pctGrowth: +(((pull[4].vw/pull[0].vw)-1)*100).toFixed(2) };
  await hideHud(); await shot('drawn-full-nohud'); await showHud();

  await g(SETUP + ' SS.aim({angle:0.30, power:1.0});');
  const ease=[];
  for (let t=0;t<=900;t+=60){ ease.push({t, vw: await g('return +vw().toFixed(4);')}); if(t<900) await g('await SS.seek(60);'); }
  M.pullbackEase = ease;

  await g(SETUP + ' SS.aim({angle:0.30, power:1.0}); await SS.seek(700);');
  const drawnVw = await g('return +vw().toFixed(4);');
  await g('SS.release(); await SS.seek(1200);');
  M.pullbackReturn = { restVw, drawnVw, afterReleaseVw: await g('return +vw().toFixed(4);') };

  // ================= 3. MID-FLIGHT LEAD (the winning shot) =================
  const FIRE = SETUP + ' SS.aim({angle:0.30, power:0.90}); await SS.seek(600); SS.release();';
  await g(FIRE);
  const flight=[]; let impactT=null;
  for (let t=0;t<=2400;t+=40) {
    const s = await g(`
      const p=proje(), e=extents();
      const pp = p?proj(p.x,p.y):null;
      const cxp = e?proj(e.cx, (e.top+e.bottom)/2):null;
      const lp = e?proj(e.left,0.5):null, rp = e?proj(e.right,0.5):null;
      return { proj: pp, wx:p&&p.x, wy:p&&p.y, vx:p&&p.vx, vy:p&&p.vy,
               structCxPctW: cxp&&cxp.w, structLeftPctW: lp&&lp.w, structRightPctW: rp&&rp.w,
               extentPctW: (lp&&rp)?+(rp.w-lp.w).toFixed(2):null,
               vw:+vw().toFixed(3), camx:+cam.position.x.toFixed(3), camy:+cam.position.y.toFixed(3),
               roll:+cam.quaternion.z.toFixed(8), damage: damageSum(), debris:(W.debris||[]).length,
               phase: W.phase };`);
    flight.push({ t, ...s });
    if (impactT===null && (s.debris>0 || s.damage>0)) impactT = t;
    if (t<2400) await g('await SS.seek(40);');
  }
  M.flight = flight; M.impactT = impactT;

  // struck-tower framing at the impact instant, at finer resolution
  if (impactT !== null) {
    const t0 = Math.max(0, impactT - 200);
    await g(FIRE + ' await SS.seek(args[0]);', t0);
    const near=[];
    for (let t=t0;t<=impactT+200;t+=20) {
      near.push({ t, ...(await g(`
        const p=proje(), e=extents();
        const pp=p?proj(p.x,p.y):null, cxp=e?proj(e.cx,(e.top+e.bottom)/2):null;
        const lp=e?proj(e.left,0.5):null, rp=e?proj(e.right,0.5):null;
        return { projPctW: pp&&pp.w, projPctH: pp&&pp.h, structCxPctW: cxp&&cxp.w,
                 extentPctW:(lp&&rp)?+(rp.w-lp.w).toFixed(2):null, vw:+vw().toFixed(3),
                 debris:(W.debris||[]).length, damage:damageSum() };`)) });
      if (t<impactT+200) await g('await SS.seek(20);');
    }
    M.impactWindow = near;
  }

  await g(FIRE); await hideHud();
  await filmstrip('flight-lead', { from: 80, to: 1680, step: 200, cols: 3 });
  await showHud();

  await g(FIRE + ' await SS.seek(args[0]);', impactT === null ? 900 : Math.max(0, impactT - 60));
  await hideHud(); const arrival = await shot('arrival-nohud'); await showHud();
  M.arrivalCam = await g('return camI();');
  M.arrivalHorizonPx = { at03: await horizonAt(arrival,0.03), at30: await horizonAt(arrival,0.30), at97: await horizonAt(arrival,0.97) };
  M.arrivalInk = await analyze(arrival, INK);

  // mid-traverse still (halfway through the flight)
  await g(FIRE + ' await SS.seek(args[0]);', impactT === null ? 400 : Math.round(impactT*0.5));
  await hideHud(); const trav = await shot('traverse-nohud'); await showHud();
  M.traverseCam = await g('return camI();');
  M.traverseHorizonPx = { at03: await horizonAt(trav,0.03), at30: await horizonAt(trav,0.30), at97: await horizonAt(trav,0.97) };

  // ================= 4. SHAKE / QUIET =================
  await g(FIRE + ' await SS.seek(args[0]);', impactT === null ? 700 : impactT);
  const shake=[]; const vh0 = await g('return vh();');
  const cam0 = await g('return { x:cam.position.x, y:cam.position.y, z:cam.position.z };');
  for (let t=0;t<=3600;t+=20) {
    shake.push({ t, ...(await g(`
      const s=sleepInfo();
      return { x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5),
               roll:+cam.quaternion.z.toFixed(8), vh:+vh().toFixed(5), asleep:s.asleep, total:s.total,
               hitStop:W.hitStop, phase:W.phase };`)) });
    if (t<3600) await g('await SS.seek(20);');
  }
  M.shakeTrace = shake; M.shakeRefVh = vh0; M.shakeCam0 = cam0;

  await g(FIRE + ' await SS.seek(args[0]);', impactT === null ? 700 : Math.max(0, impactT-40));
  await hideHud(); await filmstrip('impact-shake', { from: 0, to: 600, step: 40, cols: 4 }); await showHud();

  // ================= 5. SETTLE / AUTO-FRAME =================
  // (a) the winning shot: does the camera come to rest cleanly?
  await g(FIRE + ' await SS.seek(7000);');
  M.settleStateWin = await state();
  await hideHud(); const settledWin = await shot('settled-win-nohud'); await showHud();
  M.settleWin = await g(`
    const out=[]; for (const v of W.villains) if (v.alive) { const t=v.body.translation(); const p=proj(t.x,t.y);
      out.push({ x:+t.x.toFixed(2), pctW:p.w, pctH:p.h, marginPctW:+Math.min(p.w,100-p.w).toFixed(2), marginPctH:+Math.min(p.h,100-p.h).toFixed(2) }); }
    return { villains: out, cam: camI(), sleep: sleepInfo() };`);
  const driftWin=[];
  for (let t=0;t<=2000;t+=100){ driftWin.push({t, ...(await g('return { x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5), vh:+vh().toFixed(5) };'))}); if(t<2000) await g('await SS.seek(100);'); }
  M.settleDriftWin = driftWin;
  await hideHud(); await filmstrip('settle-quiet', { from: 0, to: 2400, step: 200, cols: 4 }); await showHud();

  // (b) a shot that leaves villains alive -> auto-frame test
  const WEAK = SETUP + ' SS.aim({angle:0.55, power:0.55}); await SS.seek(600); SS.release();';
  await g(WEAK + ' await SS.seek(7000);');
  M.settleStateWeak = await state();
  await hideHud(); await shot('settled-survivors-nohud'); await showHud();
  M.settleWeak = await g(`
    const out=[]; for (const v of W.villains) if (v.alive) { const t=v.body.translation(); const p=proj(t.x,t.y);
      out.push({ x:+t.x.toFixed(2), pctW:p.w, pctH:p.h, marginPctW:+Math.min(p.w,100-p.w).toFixed(2), marginPctH:+Math.min(p.h,100-p.h).toFixed(2) }); }
    return { villains: out, cam: camI(), sleep: sleepInfo() };`);

  // ================= 6. FOV / EDGE READ =================
  await g(SETUP);
  M.fov = await g(`
    const e=extents(), out=[];
    const xs=[e.left-4, e.left, e.cx, e.right, e.right+4];
    for (const x of xs) {
      const a=proj(x,0.4,0.6), b=proj(x,3.4,0.6);
      const back=proj(x,3.4,-0.6);
      const ang=Math.atan2(b.w-a.w, a.h-b.h)*180/Math.PI;
      out.push({ x:+x.toFixed(2), pctW:a.w, edgeAngleDeg:+ang.toFixed(3), depthWedgePctW:+(back.w-b.w).toFixed(3) });
    }
    return { fovDeg:+cam.fov.toFixed(2), dist:+dist().toFixed(2), edges: out };`);

  // ================= 7. ORBIT / ROLL check across the whole run =================
  M.rollExtremes = (() => {
    const rolls = M.shakeTrace.map(s => Math.abs(s.roll));
    return { maxAbsRollQuatZ: Math.max(...rolls), atAim: Math.abs(M.geom.cam.roll) };
  })();

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));

  // ---- console summary of the numbers that decide the verdict ----
  const flightIn = M.flight.filter(f => f.proj && f.wy > 0.5);
  const sum = {
    IMPACT_T: impactT,
    AIM: { slingPctW: M.aim.slingPctW, farBlockPctW: M.aim.farthestBlockEdgePctW,
           farVillainPctW: M.aim.farthestVillainPctW, tallestTopPctH: M.aim.tallestTopPctH,
           highestInkPctH: M.aimInk.highestInkPctH,
           horizonPctH: { at03: M.aimHorizonPx.at03.strongest.pctH, at30: M.aimHorizonPx.at30.strongest.pctH,
                          at45: M.aimHorizonPx.at45.strongest.pctH, at97: M.aimHorizonPx.at97.strongest.pctH } },
    HORIZON_PAN: { aim97: M.aimHorizonPx.at97.strongest.pctH, traverse97: M.traverseHorizonPx.at97.strongest.pctH,
                   arrival97: M.arrivalHorizonPx.at97.strongest.pctH,
                   camX: { aim: M.geom.cam.x, traverse: M.traverseCam.x, arrival: M.arrivalCam.x } },
    LEAD: flightIn.map(f => ({ t: f.t, projPctW: f.proj.w, structPctW: f.structCxPctW, extentPctW: f.extentPctW, vw: f.vw })),
    PULLBACK: M.pullback.pctGrowth, PULLBACK_RETURN: M.pullbackReturn,
    FOV: M.fov.fovDeg, EDGE_DRIFT: M.fov.edges.map(e => e.edgeAngleDeg),
    SETTLE_WIN: M.settleWin.villains, SETTLE_WEAK: M.settleWeak.villains,
    ROLL: M.rollExtremes,
  };
  console.log(JSON.stringify(sum, null, 2));
  await an.close();
};
