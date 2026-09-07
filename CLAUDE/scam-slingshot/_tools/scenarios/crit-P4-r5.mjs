/**
 * crit-P4-r5 — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 5.
 * Owns: aim composition, sky headroom, sling/target %W, mid-flight lead, drag pull-back,
 * shake decay/quiet, settle auto-frame, FOV parallelism, horizon stability under pure X pan.
 * Nothing here reads builder notes; every number comes from the live camera or from pixels.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MEAS = `
  const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
  const V3 = cam.position.constructor;
  const p2s = (x, y) => { const v = new V3(x, y, 0).project(cam);
    return { x: (v.x*0.5+0.5)*r.width, y: (-v.y*0.5+0.5)*r.height,
             pw: (v.x*0.5+0.5)*100, ph: (-v.y*0.5+0.5)*100 }; };
  const s2w = (px, py) => { const v = new V3((px/r.width)*2-1, -((py/r.height)*2-1), 0.5).unproject(cam);
    const dir = v.sub(cam.position).normalize(); const t = -cam.position.z / dir.z;
    return { x: cam.position.x + dir.x*t, y: cam.position.y + dir.y*t }; };
`;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const out = {};
  const W = (await page.viewport()).width, H = (await page.viewport()).height;
  out.viewport = { W, H };

  // ---------- 0. deterministic world -------------------------------------------------
  await game('SS.seed(1); await SS.seek(2000);');
  out.state_aim = await state();

  // ---------- 1. AIM COMPOSITION -----------------------------------------------------
  const aim = await game(`${MEAS}
    const sling = w.sling;
    const anchor = p2s(sling.anchor.x, sling.anchor.y);
    const pouch  = p2s(sling.pouch.x,  sling.pouch.y);
    // sling extent on screen: sample the whole slingshot group bbox
    const BOX = w.scene.constructor ? null : null;
    let bb = null;
    w.sling.group.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      bb = bb ? bb.union(b) : b; } });
    const slingBox = bb ? { minx: bb.min.x, maxx: bb.max.x, miny: bb.min.y, maxy: bb.max.y } : null;
    const sbL = slingBox ? p2s(slingBox.minx, slingBox.miny) : null;
    const sbR = slingBox ? p2s(slingBox.maxx, slingBox.maxy) : null;

    const vil = (w.villains||[]).filter(v => v.alive !== false).map(v => {
      const m = v.mesh || v.group; const pos = m.position;
      return { x: pos.x, y: pos.y, s: p2s(pos.x, pos.y) };
    });
    const blocks = (w.blocks||[]).map(b => {
      const m = b.mesh; const pos = m.position;
      m.geometry.computeBoundingBox();
      const bx = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
      return { x: pos.x, y: pos.y, maxx: bx.max.x, maxy: bx.max.y, minx: bx.min.x, miny: bx.min.y,
               tl: p2s(bx.min.x, bx.max.y), br: p2s(bx.max.x, bx.min.y) };
    });
    const tallest = blocks.concat(vil.map(v=>({maxy:v.y, tl:v.s, br:v.s}))).reduce((a,b)=> (b.maxy>a.maxy?b:a));
    const furthestBlockX = Math.max(...blocks.map(b=>b.maxx));
    const furthestVil = vil.reduce((a,b)=> b.x>a.x?b:a, vil[0]);
    const structMinX = Math.min(...blocks.map(b=>b.minx));
    const worldL = s2w(0, r.height/2), worldR = s2w(r.width, r.height/2);
    const worldT = s2w(r.width/2, 0), worldB = s2w(r.width/2, r.height);
    return {
      anchor, pouch, slingBox,
      slingScreen: sbL && sbR ? { x0: Math.min(sbL.pw, sbR.pw), x1: Math.max(sbL.pw, sbR.pw),
                                  centre: (sbL.pw + sbR.pw)/2, widthPct: Math.abs(sbR.pw - sbL.pw) } : null,
      villains: vil, nBlocks: blocks.length,
      tallestTopPH: tallest.tl.ph, tallestTopWorldY: tallest.maxy,
      furthestBlockPW: p2s(furthestBlockX, 0).pw, furthestBlockX,
      furthestVillainPW: furthestVil ? furthestVil.s.pw : null, furthestVillainX: furthestVil ? furthestVil.x : null,
      structLeftPW: p2s(structMinX, 0).pw, structRightPW: p2s(furthestBlockX, 0).pw,
      structWidthPct: p2s(furthestBlockX,0).pw - p2s(structMinX,0).pw,
      groundLinePH: p2s(0, 0).ph,
      cam: { fov: cam.fov, pos: cam.position.toArray(), quat: cam.quaternion.toArray() },
      visibleWorldWidth: worldR.x - worldL.x,
      visibleWorldHeight: worldT.y - worldB.y,
      worldLeftX: worldL.x, worldRightX: worldR.x, worldTopY: worldT.y, worldBottomY: worldB.y,
    };
  `);
  out.aim = aim;
  await shot('aim');

  // ---------- 2. FOV / PARALLELISM ---------------------------------------------------
  // A 1-unit vertical world segment at the play plane, projected at frame centre and at
  // both frame edges. Angle from screen-vertical must drift <= 3 deg.
  out.fov = await game(`${MEAS}
    const yb = 0.4, yt = 3.4;                        // a typical block's vertical edge
    const xs = [];
    for (const f of [0.5, 0.08, 0.92, 0.02, 0.98]) {
      const wx = s2w(f * r.width, r.height * 0.7).x;
      const a = p2s(wx, yb), b = p2s(wx, yt);
      xs.push({ framePct: f*100, worldX: +wx.toFixed(2),
                angleFromVertical: +(Math.atan2(b.x - a.x, a.y - b.y) * 180 / Math.PI).toFixed(3) });
    }
    return { fov: cam.fov, camZ: cam.position.z, samples: xs,
             drift_centre_to_edge: +(Math.max(...xs.map(s=>Math.abs(s.angleFromVertical)))).toFixed(3) };
  `);

  // ---------- 3. PULL-BACK ON DRAG --------------------------------------------------
  const pull = [];
  const rest = await game(`${MEAS} const a = s2w(0,r.height/2), b = s2w(r.width,r.height/2);
    return { vw: b.x-a.x, camZ: cam.position.z, camX: cam.position.x, camY: cam.position.y };`);
  pull.push({ label: 'rest', drawn: 0, ...rest });
  const g0 = await aimPx(0.30, 0);
  await game('SS.dragTo(args[0], args[1]);', g0.x, g0.y);
  for (const p of [0.25, 0.5, 0.75, 1.0]) {
    const d = await aimPx(0.30, p);
    await game('SS.dragTo(args[0], args[1]);', d.x, d.y);
    await game('await SS.seek(400);');     // let the spring arrive
    const m = await game(`${MEAS} const a = s2w(0,r.height/2), b = s2w(r.width,r.height/2);
      return { vw: b.x-a.x, camZ: cam.position.z, camX: cam.position.x, camY: cam.position.y, drawn: w.sling.drawn };`);
    pull.push({ label: 'draw' + p, want: p, ...m });
  }
  await shot('full-stretch');
  out.pullback = {
    samples: pull,
    growthPct: +(((pull[pull.length-1].vw / pull[0].vw) - 1) * 100).toFixed(2),
  };
  // drag easing: filmstrip while the spring travels back out from a snap to full draw
  await game('SS.dragTo(args[0], args[1]);', g0.x, g0.y);
  await game('await SS.seek(600);');
  const dfull = await aimPx(0.30, 1.0);
  await game('SS.dragTo(args[0], args[1]);', dfull.x, dfull.y);
  await filmstrip('drag-pullback', { from: 0, to: 480, step: 60, cols: 3 });

  // ---------- 4. RELEASE + FLIGHT LEAD ----------------------------------------------
  // restore a clean world, then fire the known-clearing shot.
  await game('SS.seed(1); await SS.seek(2000);');
  await game('SS.aim({angle: args[0], power: args[1]});', 0.30, 0.90);
  await game('await SS.seek(300);');
  const rel = await game('return SS.release();');
  out.release = rel;

  const lead = [];
  for (let t = 0; t <= 1400; t += 100) {
    if (t) await game('await SS.seek(100);');
    const m = await game(`${MEAS}
      const pr = (w.projectiles||[]).filter(p => p && p.mesh);
      const p = pr[pr.length-1];
      const blocks = (w.blocks||[]);
      let cx = 0, n = 0, minx = 1e9, maxx = -1e9;
      for (const b of blocks) { const q = b.mesh.position; cx += q.x; n++; minx = Math.min(minx,q.x); maxx = Math.max(maxx,q.x); }
      cx = n ? cx/n : 0;
      const ps = p ? p2s(p.mesh.position.x, p.mesh.position.y) : null;
      return { proj: p ? { x: p.mesh.position.x, y: p.mesh.position.y, pw: ps.pw, ph: ps.ph,
                            vx: p.body ? p.body.linvel().x : null } : null,
               structCentrePW: n ? p2s(cx, 2).pw : null,
               structLeftPW: n ? p2s(minx,2).pw : null, structRightPW: n ? p2s(maxx,2).pw : null,
               structWidthPct: n ? p2s(maxx,2).pw - p2s(minx,2).pw : null,
               camX: cam.position.x, camY: cam.position.y, camZ: cam.position.z,
               quat: cam.quaternion.toArray(),
               vw: s2w(r.width, r.height/2).x - s2w(0, r.height/2).x,
               phase: w.phase };
    `);
    lead.push({ t, ...m });
  }
  out.lead = lead;
  // flight filmstrip from a fresh identical shot
  await game('SS.seed(1); await SS.seek(2000); SS.aim({angle:0.30, power:0.90}); await SS.seek(300); SS.release();');
  await filmstrip('flight-lead', { from: 60, to: 1260, step: 100, cols: 4 });

  // ---------- 5. IMPACT SHAKE + QUIET ------------------------------------------------
  await game('SS.seed(1); await SS.seek(2000); SS.aim({angle:0.30, power:0.90}); await SS.seek(300); SS.release();');
  const cam0 = await game('const c = SS.__world.camera; return { x:c.position.x, y:c.position.y, z:c.position.z };');
  const trace = [];
  for (let t = 0; t <= 4000; t += 25) {
    if (t) await game('await SS.seek(25);');
    const m = await game(`
      const w = SS.__world, c = w.camera;
      let asleep = 0, tot = 0, dbg = 0;
      SS.__physics.world.bodies.forEach(b => { if (b.isDynamic && b.isDynamic()) { tot++; if (b.isSleeping()) asleep++; } });
      return { x:c.position.x, y:c.position.y, z:c.position.z, q:c.quaternion.toArray(),
               shake: w.rig ? (w.rig.shake && w.rig.shake.length !== undefined ? w.rig.shake.length() : w.rig.shake) : null,
               asleep, tot, phase: w.phase, debris: (w.debris||[]).length, hitStop: SS.state? undefined : undefined };
    `);
    trace.push({ t, ...m });
  }
  out.shakeTrace = trace;
  await game('SS.seed(1); await SS.seek(2000); SS.aim({angle:0.30, power:0.90}); await SS.seek(300); SS.release();');
  await game('await SS.seek(900);');
  await filmstrip('impact-shake', { from: 0, to: 700, step: 50, cols: 4 });

  // ---------- 6. SETTLE AUTOFRAME ---------------------------------------------------
  const settle = await game(`${MEAS}
    const vil = (w.villains||[]).filter(v => v.alive !== false).map(v => {
      const m = v.mesh || v.group; return { x: m.position.x, y: m.position.y, s: p2s(m.position.x, m.position.y) }; });
    const blocks = (w.blocks||[]).map(b => p2s(b.mesh.position.x, b.mesh.position.y));
    return { villains: vil, nAlive: vil.length,
             blockPW: { min: Math.min(...blocks.map(b=>b.pw)), max: Math.max(...blocks.map(b=>b.pw)) },
             vw: s2w(r.width, r.height/2).x - s2w(0, r.height/2).x,
             camZ: cam.position.z, phase: w.phase, state: await SS.state() };
  `);
  out.settle = settle;
  await shot('settled');

  // ---------- 7. QUIET AFTER SLEEP --------------------------------------------------
  await filmstrip('settle-quiet', { from: 0, to: 1200, step: 120, cols: 3 });
  const quiet = [];
  for (let t = 0; t <= 1500; t += 50) {
    if (t) await game('await SS.seek(50);');
    quiet.push(await game('const c=SS.__world.camera; return { x:c.position.x, y:c.position.y, z:c.position.z };').then(v=>({t,...v})));
  }
  out.quietTail = quiet;

  // ---------- 8. PURE X PAN: does the horizon move? ---------------------------------
  await game('SS.seed(1); await SS.seek(2000);');
  const panShots = [];
  for (const cx of [6, 13, 20, 27]) {
    await game('SS.camLock({x: args[0], y: args[1], halfWidth: args[2]}); await SS.seek(300);', cx, 5.4, 12.0);
    const s = await shot(`xpan-${cx}`);
    panShots.push({ cx, file: path.basename(s),
      cam: await game('const c=SS.__world.camera; return { x:c.position.x, y:c.position.y, z:c.position.z, q:c.quaternion.toArray() };') });
  }
  await game('SS.camUnlock(); await SS.seek(300);');
  out.xpan = panShots;

  // ---------- 9. establishing frame for the blind A/B --------------------------------
  await game('SS.seed(1); await SS.seek(2000);');
  await shot('establishing-for-blind');

  await writeFile(path.join(OUT, 'p4-measure.json'), JSON.stringify(out, null, 2));
  console.log('WROTE p4-measure.json');
};
