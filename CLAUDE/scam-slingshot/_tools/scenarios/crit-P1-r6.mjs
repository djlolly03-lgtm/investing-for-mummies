/**
 * CRITIC P1 round 6 — Launch feel. Written by the critic. Independent of the builder.
 *
 * Every capture exists to produce a NUMBER against a RUBRIC.md P1 criterion:
 *   composition · band colour separation · band deformation · pouch-strap occlusion ·
 *   hard-cut release · burst pinned at the pouch · band ring-down · camera kick · earned preview
 *
 * Pixel-level facts (occlusion %, band-vs-fork value separation, 40px survival) are produced by
 * DIFFERENCING rendered frames with elements hidden, never by reading geometry and asserting.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const M = {};
  const log = (k, v) => { M[k] = v; console.log('#', k, JSON.stringify(v)); };

  // ------------------------------------------------------------------ probes
  const geom = () => game(`
    const w = SS.__world, s = w.sling, V3 = w.camera.position.constructor;
    const r = w.renderer.domElement.getBoundingClientRect();
    const P = (x,y,z=0)=>{ const v = new V3(x,y,z).project(w.camera);
      return { x:+((v.x*.5+.5)*r.width).toFixed(3), y:+((-v.y*.5+.5)*r.height).toFixed(3) }; };
    const a=P(0,0), b=P(1,0); const ppu = b.x-a.x;
    const ammo = s.ammo || (w.projectiles||[])[0];
    const am = ammo && ammo.mesh ? ammo.mesh.position : null;
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    // signed pouch offset along the launch direction (+ = forward of the anchor)
    const dir = { x: Math.cos(0.30), y: Math.sin(0.30) };
    const off = (s.pouch.x - s.anchor.x)*dir.x + (s.pouch.y - s.anchor.y)*dir.y;
    // live FX census
    const cens = {};
    for (const [k,p] of Object.entries(w.fx ? w.fx.pools : {})) {
      let n=0, sx=0, sy=0, xs=[], ys=[], area=0;
      for (let i=0;i<p.max;i++) if (p.p.life[i] > 0) {
        n++; sx+=p.p.x[i]; sy+=p.p.y[i]; xs.push(p.p.x[i]); ys.push(p.p.y[i]);
        area += Math.abs(p.p.sx[i]*p.p.sy[i]);
      }
      if (!n) continue;
      const cx=sx/n, cy=sy/n;
      let rad=0; for (let i=0;i<xs.length;i++) rad=Math.max(rad, Math.hypot(xs[i]-cx, ys[i]-cy));
      cens[k] = { n, cx:+cx.toFixed(3), cy:+cy.toFixed(3), spread:+rad.toFixed(3),
                  area:+area.toFixed(4) };
    }
    return {
      rect:{w:r.width,h:r.height}, ppu:+ppu.toFixed(4),
      drawn:+s.drawn.toFixed(4), slingState:s.state,
      recoilT:+s.recoilT.toFixed(4), recoilAmp:+s.recoilAmp.toFixed(4),
      pouchW:{x:+s.pouch.x.toFixed(4), y:+s.pouch.y.toFixed(4)},
      pouchPx:P(s.pouch.x, s.pouch.y), pouchOff:+off.toFixed(5),
      tipL:{x:+s._tipL.x.toFixed(4), y:+s._tipL.y.toFixed(4)},
      tipR:{x:+s._tipR.x.toFixed(4), y:+s._tipR.y.toFixed(4)},
      tipSpan:+(s._tipR.x - s._tipL.x).toFixed(4),
      bands: bandArr.map(b=>({ side:b.side, pouchR:+b.pouchRadius.toFixed(4),
        prongR:+b.prongRadius.toFixed(4), len:+b.rubberLength.toFixed(4),
        mat: b.mat && b.mat.color ? '#'+b.mat.color.getHexString() : null })),
      previewVisible: s.preview ? s.preview.visible : null,
      previewCount: s.preview ? s.preview.count : null,
      previewPts: s._previewPts ? s._previewPts.length : null,
      ammoW: am ? {x:+am.x.toFixed(4), y:+am.y.toFixed(4)} : null,
      ammoPx: am ? P(am.x, am.y) : null,
      ammoR: ammo ? ammo.radius : null,
      ammoSpeed: ammo && ammo.body ? +Math.hypot(ammo.body.linvel().x, ammo.body.linvel().y).toFixed(3) : null,
      groundPx: P(0,0).y, groundPx12: P(12,0).y,
      shake: w.rig ? +(w.rig.shake ?? 0).toFixed(5) : null,
      camMode: w.rig ? w.rig.mode : null,
      cam:{x:+w.camera.position.x.toFixed(5), y:+w.camera.position.y.toFixed(5), z:+w.camera.position.z.toFixed(5)},
      worldH: (()=>{ const f=w.camera.fov*Math.PI/180; return +(2*Math.tan(f/2)*Math.abs(w.camera.position.z)).toFixed(4); })(),
      fx: cens,
      phase: w.phase, simTime:+(w.simTime||0).toFixed(4), tick: SS.tick(),
    };`);

  const setVis = (which, on) => game(`
    const w = SS.__world, s = w.sling, which=args[0], on=args[1];
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    if (which==='bands') bandArr.forEach(b=>{ if(b.tube) b.tube.group.visible = on; });
    if (which==='frontband') bandArr.filter(b=>b.side>0).forEach(b=>{ if(b.tube) b.tube.group.visible = on; });
    if (which==='ammo') { const a = s.ammo || (w.projectiles||[])[0]; if (a && a.mesh) a.mesh.visible = on; }
    if (which==='prongs') (s.prongs||[]).forEach(p=>{ p.tube.group.visible=on; p.cap.visible=on; p.whip.visible=on; });
    if (which==='fx') Object.values(w.fx ? w.fx.pools : {}).forEach(p=>{ p.mesh.visible = on; });
    w.renderer.render(w.scene, w.camera);
    return true;`, which, on);

  /** 4-shot mask set at the current pose: normal / no-bands / no-bands-no-ammo / no-prongs */
  const maskSet = async (tag) => {
    const g = await geom();
    const A = await shot(`${tag}-mask-A-normal`);
    await setVis('bands', false);
    const B = await shot(`${tag}-mask-B-nobands`);
    await setVis('ammo', false);
    const C = await shot(`${tag}-mask-C-nobands-noammo`);
    await setVis('ammo', true); await setVis('bands', true);
    await setVis('prongs', false);
    const D = await shot(`${tag}-mask-D-noprongs`);
    await setVis('prongs', true);
    await game('const w=SS.__world; w.renderer.render(w.scene,w.camera); return true;');
    return { tag, A:path.basename(A), B:path.basename(B), C:path.basename(C), D:path.basename(D), geom:g };
  };

  // ========================================================== 0. rest, no input
  log('state_boot', await state());
  await game('SS.audioMute(true); return true;');
  const gRest0 = await geom();
  log('geom_rest_noinput', gRest0);
  await shot('rest-noinput');

  log('sling_footprint', await game(`
    const w = SS.__world, s = w.sling, V3 = w.camera.position.constructor;
    const pts=[]; s.group.updateWorldMatrix(true,true);
    s.group.traverse(n=>{ if(!n.isMesh||!n.geometry||!n.visible) return;
      const g=n.geometry; g.computeBoundingBox(); const bb=g.boundingBox;
      for (const X of [bb.min.x,bb.max.x]) for (const Y of [bb.min.y,bb.max.y]) for (const Z of [bb.min.z,bb.max.z])
        pts.push(new V3(X,Y,Z).applyMatrix4(n.matrixWorld)); });
    const r=w.renderer.domElement.getBoundingClientRect();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for (const p of pts){ const v=p.clone().project(w.camera);
      const sx=(v.x*.5+.5)*r.width, sy=(-v.y*.5+.5)*r.height;
      x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy); }
    return { x0:+x0.toFixed(2),x1:+x1.toFixed(2),y0:+y0.toFixed(2),y1:+y1.toFixed(2),
      wPct:+(100*(x1-x0)/r.width).toFixed(2), cxPct:+(100*((x0+x1)/2)/r.width).toFixed(2),
      hPct:+(100*(y1-y0)/r.height).toFixed(2), rightClearPct:+(100*(r.width-x1)/r.width).toFixed(2) };`));

  const restMask = await maskSet('rest');
  log('mask_rest', { files:[restMask.A,restMask.B,restMask.C,restMask.D],
    pouchR: restMask.geom.bands.map(b=>b.pouchR), len: restMask.geom.bands.map(b=>b.len),
    tipSpan: restMask.geom.tipSpan, ppu: restMask.geom.ppu, ammoR: restMask.geom.ammoR });

  // ============================================== 1. first drag: earned preview
  const firstDrag = [];
  {
    const a = await aimPx(0.30, 0), b = await aimPx(0.30, 0.98);
    await game('SS.dragTo(args[0], args[1]);', a.x, a.y);
    for (let i=1;i<=10;i++){
      await game('SS.dragTo(args[0],args[1]);', a.x+(b.x-a.x)*i/10, a.y+(b.y-a.y)*i/10);
      const g = await geom();
      firstDrag.push({ i, drawn:g.drawn, previewVisible:g.previewVisible, previewPts:g.previewPts });
    }
  }
  log('first_drag_preview', firstDrag);

  const fullMask = await maskSet('full');
  log('mask_full', { files:[fullMask.A,fullMask.B,fullMask.C,fullMask.D],
    drawn: fullMask.geom.drawn, pouchR: fullMask.geom.bands.map(b=>b.pouchR),
    len: fullMask.geom.bands.map(b=>b.len), tipSpan: fullMask.geom.tipSpan,
    pouchPx: fullMask.geom.pouchPx, ppu: fullMask.geom.ppu });

  // half stretch
  await dragShot(0.30, 0.50, { steps: 6 });
  const halfMask = await maskSet('half');
  log('mask_half', { files:[halfMask.A,halfMask.B,halfMask.C,halfMask.D],
    drawn: halfMask.geom.drawn, pouchR: halfMask.geom.bands.map(b=>b.pouchR),
    len: halfMask.geom.bands.map(b=>b.len), tipSpan: halfMask.geom.tipSpan });

  // cancel back to rest
  await game('const w=SS.__world; w.sling.cancelDrag(); w.rig?.focusSling?.(); return true;');
  await game('await SS.seek(500);');
  await shot('rest-after-cancel');

  // ========================================== 2. deterministic release ladder
  await game('SS.seed(2025); await SS.seek(1500);');
  const dr = await dragShot(0.30, 0.95, { steps: 12 });
  log('release_drag_report', { angle: dr.angle, clamped: dr.clamped, grabbable: dr.grabbable,
    wanted: dr.wantedAngle, power: dr.wantedPower });
  const gPre = await geom();
  log('geom_prerelease', { drawn:gPre.drawn, pouchOff:gPre.pouchOff, bands:gPre.bands,
    tipSpan:gPre.tipSpan, pouchPx:gPre.pouchPx, ammoPx:gPre.ammoPx, ppu:gPre.ppu, ammoR:gPre.ammoR,
    groundPx:gPre.groundPx, shake:gPre.shake, worldH:gPre.worldH });
  await shot('prerelease');

  const rel = await game('return SS.release();');
  log('release_report', rel);

  // fine ladder: 8ms for the first 100ms, then coarser out to 600ms
  const steps = [];
  for (let i=0;i<12;i++) steps.push(8);      // 0..96
  for (let i=0;i<8;i++) steps.push(17);      // ..232
  for (let i=0;i<8;i++) steps.push(34);      // ..504
  for (let i=0;i<4;i++) steps.push(50);      // ..704
  const L = []; let t = 0;
  const keyShots = new Set([0, 48, 96, 164, 232]);
  L.push({ t:0, ...(await geom()) });
  await shot('rel-t0000');
  for (const s of steps) {
    await game('await SS.seek(args[0]);', s); t += s;
    const g = await geom();
    L.push({ t, ...g });
    if (keyShots.has(t)) await shot(`rel-t${String(t).padStart(4,'0')}`);
  }
  log('release_ladder', L.map(r=>({ t:r.t, slingState:r.slingState, pouchOff:r.pouchOff,
    pouchPx:r.pouchPx, ammoPx:r.ammoPx, ammoSpeed:r.ammoSpeed, drawn:r.drawn,
    bands:r.bands, tipSpan:r.tipSpan, groundPx:r.groundPx, groundPx12:r.groundPx12,
    shake:r.shake, camMode:r.camMode, worldH:r.worldH, ppu:r.ppu, phase:r.phase,
    fx:r.fx })));

  // ============================================================ 3. filmstrips
  const strip = async (name, opts, { lock = null } = {}) => {
    await game('SS.seed(2025); await SS.seek(1500);');
    await dragShot(0.30, 0.95, { steps: 12 });
    await game('return SS.release();');
    if (lock) await game('return SS.camLock(args[0]);', lock);   // AFTER release (see HOOKS.md)
    const f = await filmstrip(name, opts);
    if (lock) await game('return SS.camUnlock();');
    return f;
  };
  await strip('release-0-300', { from: 0, to: 300, step: 25, cols: 4 });
  await strip('recoil-0-500', { from: 0, to: 500, step: 50, cols: 4 });
  // LENS (not a composition judgement): the sling at a readable size through the ring-down
  await strip('sling-lens-0-420', { from: 0, to: 420, step: 30, cols: 5 },
    { lock: { x: 0.0, y: 3.0, halfWidth: 4.0 } });

  // =================================================== 4. draw sequence stills
  await game('SS.seed(2025); await SS.seek(1500);');
  {
    const a = await aimPx(0.30, 0), b = await aimPx(0.30, 0.98);
    await game('SS.dragTo(args[0],args[1]);', a.x, a.y);
    for (let i=0;i<=6;i++){
      await game('SS.dragTo(args[0],args[1]);', a.x+(b.x-a.x)*i/6, a.y+(b.y-a.y)*i/6);
      await shot(`draw-step${i}`);
    }
  }
  // a second draw angle, to check the band read is not tuned to one pose only
  await game('SS.seed(2025); await SS.seek(1500);');
  await dragShot(0.62, 0.95, { steps: 10 });
  const steep = await maskSet('steep');
  log('mask_steep', { files:[steep.A,steep.B,steep.C,steep.D], drawn:steep.geom.drawn,
    pouchR: steep.geom.bands.map(b=>b.pouchR), len: steep.geom.bands.map(b=>b.len) });

  // ========================================== 5. second shot: preview earned?
  await game('SS.seed(2025); await SS.seek(1500);');
  await dragShot(0.30, 0.95, { steps: 10 });
  await game('return SS.release();');
  await game('await SS.seek(5000);');
  log('state_after_shot1', await state());
  {
    const a = await aimPx(0.30, 0), b = await aimPx(0.34, 0.90);
    await game('SS.dragTo(args[0],args[1]);', a.x, a.y);
    const seq = [];
    for (let i=1;i<=6;i++){
      await game('SS.dragTo(args[0],args[1]);', a.x+(b.x-a.x)*i/6, a.y+(b.y-a.y)*i/6);
      const g = await geom();
      seq.push({ i, drawn:g.drawn, previewVisible:g.previewVisible, previewPts:g.previewPts });
    }
    log('second_shot_preview', seq);
    await shot('shot2-drawn-preview');
  }

  await writeFile(path.join(OUT, 'measure.json'), JSON.stringify(M, null, 1));
  console.log('WROTE measure.json');
};
