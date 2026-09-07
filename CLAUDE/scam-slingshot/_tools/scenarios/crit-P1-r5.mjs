/**
 * CRITIC P1 round 5 — Launch feel. Written by the critic, not the builder.
 * Every capture below exists to produce a NUMBER against a RUBRIC.md P1 criterion.
 *
 * Occlusion is measured by a three-shot difference (normal / bands hidden / bands+ammo hidden)
 * so "the strap covers >=15% of the ammo silhouette" is counted in real rendered pixels rather
 * than asserted from geometry.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const M = {};                                   // everything measured, written to measure.json
  const log = (k, v) => { M[k] = v; console.log('#', k, JSON.stringify(v)); };

  // ---------- helpers evaluated in page context ----------
  const geom = () => game(`
    const w = SS.__world, s = w.sling, THREE_V3 = w.camera.position.constructor;
    const r = w.renderer.domElement.getBoundingClientRect();
    const P = (x,y,z=0)=>{ const v = new THREE_V3(x,y,z).project(w.camera);
      return { x:+(( v.x*.5+.5)*r.width).toFixed(3), y:+((-v.y*.5+.5)*r.height).toFixed(3) }; };
    // px-per-world at the play plane
    const a = P(0,0), b = P(1,0); const ppu = b.x - a.x;
    const ammo = s.ammo || (w.projectiles||[])[0];
    const am = ammo && ammo.mesh ? ammo.mesh.position : null;
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    return {
      rect: { w:r.width, h:r.height }, ppu,
      drawn: +s.drawn.toFixed(4), slingState: s.state,
      recoilT: +s.recoilT.toFixed(4), recoilAmp: +s.recoilAmp.toFixed(4),
      pouchW: { x:+s.pouch.x.toFixed(4), y:+s.pouch.y.toFixed(4) },
      pouchPx: P(s.pouch.x, s.pouch.y),
      tipL: { x:+s._tipL.x.toFixed(4), y:+s._tipL.y.toFixed(4) },
      tipR: { x:+s._tipR.x.toFixed(4), y:+s._tipR.y.toFixed(4) },
      tipLPx: P(s._tipL.x, s._tipL.y), tipRPx: P(s._tipR.x, s._tipR.y),
      anchorPx: P(0, 3.3),
      groundPx: P(0,0).y,
      bands: bandArr.map(b=>({ side:b.side, pouchR:+b.pouchRadius.toFixed(4),
        prongR:+b.prongRadius.toFixed(4), len:+b.rubberLength.toFixed(4),
        mat: b.mat && b.mat.color ? '#'+b.mat.color.getHexString() : null,
        vis: b.tube ? b.tube.visible : null })),
      previewVisible: s.preview ? s.preview.visible : null,
      previewCount: s.preview && s.preview.count !== undefined ? s.preview.count : null,
      previewPts: s._previewPts ? s._previewPts.length : null,
      ammoW: am ? { x:+am.x.toFixed(4), y:+am.y.toFixed(4) } : null,
      ammoPx: am ? P(am.x, am.y) : null,
      ammoR: ammo ? ammo.radius : null,
      ammoRpx: ammo ? ammo.radius * ppu : null,
      cam: { x:+w.camera.position.x.toFixed(5), y:+w.camera.position.y.toFixed(5),
             z:+w.camera.position.z.toFixed(5), rz:+w.camera.rotation.z.toFixed(6) },
      // visible world height at the play plane (for %H of a camera translation)
      worldH: (()=>{ const f = w.camera.fov*Math.PI/180;
        return 2*Math.tan(f/2)*Math.abs(w.camera.position.z); })(),
      phase: w.phase, simTime:+(w.simTime||0).toFixed(4), tick: SS.tick(),
    };`);

  const setVis = (what, on) => game(`
    const w = SS.__world, s = w.sling;
    const bandArr = Array.isArray(s.bands)? s.bands : [s.bands];
    const which = args[0], on = args[1];
    if (which === 'bands') bandArr.forEach(b => { if (b.tube) b.tube.visible = on; });
    if (which === 'ammo') { const a = s.ammo || (w.projectiles||[])[0]; if (a && a.mesh) a.mesh.visible = on; }
    w.renderer.render(w.scene, w.camera);
    return true;`, what, on);

  // three-shot occlusion set at the current sling pose
  const occSet = async (tag) => {
    const g = await geom();
    const a = await shot(`${tag}-occ-A-normal`);
    await setVis('bands', false);
    const b = await shot(`${tag}-occ-B-nobands`);
    await setVis('ammo', false);
    const c = await shot(`${tag}-occ-C-nobands-noammo`);
    await setVis('ammo', true); await setVis('bands', true);
    return { tag, A:path.basename(a), B:path.basename(b), C:path.basename(c), geom:g };
  };

  // =========================================================================
  // 0. FRESH LOAD, NO INPUT AT ALL  -> preview must not be drawn
  // =========================================================================
  log('state_boot', await state());
  const restG = await geom();
  log('geom_rest_noinput', restG);
  await shot('rest-noinput');

  // sling on-screen footprint, from the real rendered bounding box
  log('sling_footprint', await game(`
    const w = SS.__world, s = w.sling, V3 = w.camera.position.constructor;
    const B3 = new (Object.getPrototypeOf(w.scene).constructor === Object ? Object : Object)();
    // build a Box3 by hand from world vertices of the sling group (excluding the ammo)
    const pts = [];
    s.group.updateWorldMatrix(true, true);
    s.group.traverse(n => { if (!n.isMesh || !n.geometry || !n.visible) return;
      const g = n.geometry; g.computeBoundingBox(); const bb = g.boundingBox;
      for (const X of [bb.min.x, bb.max.x]) for (const Y of [bb.min.y, bb.max.y]) for (const Z of [bb.min.z, bb.max.z])
        pts.push(new V3(X,Y,Z).applyMatrix4(n.matrixWorld)); });
    const r = w.renderer.domElement.getBoundingClientRect();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for (const p of pts) { const v=p.clone().project(w.camera);
      const sx=(v.x*.5+.5)*r.width, sy=(-v.y*.5+.5)*r.height;
      x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy); }
    return { x0:+x0.toFixed(2), x1:+x1.toFixed(2), y0:+y0.toFixed(2), y1:+y1.toFixed(2),
      wPct:+(100*(x1-x0)/r.width).toFixed(2), cxPct:+(100*((x0+x1)/2)/r.width).toFixed(2),
      rightClearPct:+(100*(r.width-x1)/r.width).toFixed(2) };`));

  // =========================================================================
  // 1. THE VERY FIRST DRAG OF THE FIRST LEVEL  -> preview must NOT appear
  // =========================================================================
  const firstDrag = [];
  const g0 = await aimPx(0.30, 0);
  const g1 = await aimPx(0.30, 0.98);
  await game('SS.dragTo(args[0], args[1]);', g0.x, g0.y);
  for (let i = 1; i <= 10; i++) {
    await game('SS.dragTo(args[0], args[1]);', g0.x + (g1.x-g0.x)*i/10, g0.y + (g1.y-g0.y)*i/10);
    const gg = await geom();
    firstDrag.push({ i, drawn: gg.drawn, previewVisible: gg.previewVisible,
                     previewCount: gg.previewCount, previewPts: gg.previewPts });
  }
  log('first_drag_preview', firstDrag);
  await shot('firstdrag-full-stretch');
  const occFull = await occSet('full');
  log('geom_full', occFull.geom);
  log('occ_full_files', { A: occFull.A, B: occFull.B, C: occFull.C });

  // half stretch
  await dragShot(0.30, 0.50, { steps: 6 });
  await shot('firstdrag-half-stretch');
  const occHalf = await occSet('half');
  log('geom_half', occHalf.geom);

  // back to rest (cancel), rest occlusion
  await game('SS.__world.sling.cancelDrag(); SS.__world.rig?.focusSling?.(); SS.__world.renderer.render(SS.__world.scene, SS.__world.camera); return true;');
  await game('await SS.seek(400);');
  const occRest = await occSet('rest');
  log('geom_rest', occRest.geom);
  await shot('rest-after-cancel');

  // =========================================================================
  // 2. RELEASE — deterministic, fine time ladder, individual full-res frames
  // =========================================================================
  await game('SS.seed(2025); await SS.seek(1200);');       // rebuild + settle, driven mode
  const dr = await dragShot(0.30, 0.95, { steps: 12 });
  log('release_drag_report', dr);
  const gPre = await geom();
  log('geom_prerelease', gPre);
  await shot('prerelease');

  const rel = await game('return SS.release();');
  log('release_report', rel);

  const ladder = [0, 8, 8, 9, 8, 17, 17, 17, 16, 25, 25, 25, 25, 50, 50, 50, 50, 50, 50, 50, 100, 100];
  const T = [];
  let t = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (i > 0) { await game('await SS.seek(args[0]);', ladder[i]); t += ladder[i]; }
    const g = await geom();
    const f = await shot(`rel-t${String(t).padStart(4,'0')}`);
    T.push({ t, file: path.basename(f), ...g });
  }
  log('release_ladder', T.map(r => ({ t:r.t, file:r.file, drawn:r.drawn, slingState:r.slingState,
      recoilT:r.recoilT, recoilAmp:r.recoilAmp, ammoPx:r.ammoPx, pouchPx:r.pouchPx,
      ammoRpx:+(r.ammoRpx||0).toFixed(3), tipL:r.tipL, tipR:r.tipR,
      bands:r.bands, cam:r.cam, worldH:r.worldH, groundPx:r.groundPx, phase:r.phase })));

  // =========================================================================
  // 3. FILMSTRIPS (visual judgement of motion)
  // =========================================================================
  await game('SS.seed(2025); await SS.seek(1200);');
  await dragShot(0.30, 0.95, { steps: 12 });
  await game('return SS.release();');
  await filmstrip('release-0-300', { from: 0, to: 300, step: 25, cols: 4 });

  await game('SS.seed(2025); await SS.seek(1200);');
  await dragShot(0.30, 0.95, { steps: 12 });
  await game('return SS.release();');
  await filmstrip('recoil-0-500', { from: 0, to: 500, step: 50, cols: 4 });

  // draw filmstrip: the stretch itself, through the real pointer path
  await game('SS.seed(2025); await SS.seek(1200);');
  {
    const a = await aimPx(0.30, 0);
    const b = await aimPx(0.30, 0.98);
    await game('SS.dragTo(args[0], args[1]);', a.x, a.y);
    for (let i = 0; i <= 7; i++) {
      await game('SS.dragTo(args[0], args[1]);', a.x + (b.x-a.x)*i/7, a.y + (b.y-a.y)*i/7);
      await shot(`draw-step${i}`);
    }
  }

  await writeFile(path.join(OUT, 'measure.json'), JSON.stringify(M, null, 1));
  console.log('WROTE measure.json');
};
