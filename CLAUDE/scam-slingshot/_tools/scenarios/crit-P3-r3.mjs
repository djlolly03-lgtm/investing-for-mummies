/**
 * crit-P3-r3.mjs — INDEPENDENT CRITIC capture, P3 (destruction & structures), round 3.
 *
 * Written by the critic. Judges ONLY rendered output; no builder notes were read.
 * camLock is used ONLY for the shard-silhouette close-ups (files named *-LOCKED-*).
 * Every composition / collapse / settled frame is shot at the game's own framing.
 *
 * Measured constants found by crit-P3-r3-probe*.mjs (not guessed):
 *   l1  + aimAndFire(0.30,0.90) -> first debris at t = 720 ms after release
 *   _p3-<mat> + aimAndFire(0.22,0.80) -> first debris at t ~ 980 ms after release
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const RECT_DUMP = `
  const w = SS.__world, out = [];
  const push = (e, kind) => {
    if (!e || e.dead) return;
    const p = e.body.translation(), q = e.body.rotation();
    const ang = Math.atan2(2*(q.w*q.z + q.x*q.y), 1 - 2*(q.y*q.y + q.z*q.z));
    out.push({ kind, id:e.id, mat:e.matName, w:e.w, h:e.h, x:p.x, y:p.y, z:p.z, ang,
               broken:!!e.broken, crackStep:e.crackStep,
               sleeping: e.body.isSleeping ? e.body.isSleeping() : null });
  };
  (w.blocks||[]).forEach(e=>push(e,'block'));
  (w.debris||[]).forEach(e=>push(e,'debris'));
  return out;`;

const FX_LIVE = `
  const f = SS.__world.fx, o = { total:0 };
  for (const k of Object.keys(f.pools||{})) { o[k] = f.pools[k].live|0; o.total += o[k]; }
  o.popups = (f.popups||[]).length;
  return o;`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('P3R3 ' + k + ' ' + JSON.stringify(v)); };

  const proj = await game(`
    const w=SS.__world, V3=w.camera.position.constructor;
    const r=w.renderer.domElement.getBoundingClientRect();
    const a=new V3(18,2,0).project(w.camera), b=new V3(19,2,0).project(w.camera);
    return { pxPerUnit: Math.abs((b.x-a.x)*0.5*r.width), rw:r.width, rh:r.height };`);
  say('proj', proj);

  const fresh = async (id, seed = 4242) => {
    await game('return await SS.loadLevel(args[0]);', id);
    return game('return SS.seed(args[0]);', seed);
  };

  // ───────────────────────────── A. STABLE AT REST (l1, untouched)
  await fresh('l1');
  await game('await SS.seek(2000);');
  const A = await game('return SS.dumpBodies();');
  const rectsRest = await game(RECT_DUMP);
  await shot('rest-l1-gameframing');
  await game('await SS.seek(1000);');
  const B = await game('return SS.dumpBodies();');
  const fxRest = await game(FX_LIVE);

  let maxMove = 0, maxTag = '', maxZ = 0, moved = [];
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = B.find(x => x.i === a.i) || B[i];
    const d = Math.hypot(b.t[0]-a.t[0], b.t[1]-a.t[1]);
    maxZ = Math.max(maxZ, Math.abs(b.t[2]));
    if (d > maxMove) { maxMove = d; maxTag = a.tag; }
    if (d * proj.pxPerUnit > 0.05) moved.push({ tag:a.tag, px:+(d*proj.pxPerUnit).toFixed(4) });
  }
  say('rest', {
    bodies: A.length,
    maxMovePx_2000_to_3000: +(maxMove*proj.pxPerUnit).toFixed(4), maxTag,
    maxAbsZ: maxZ,
    asleep: B.filter(b=>b.sleeping).length, awake: B.filter(b=>!b.sleeping).length,
    movers: moved.slice(0,8), fxLive: fxRest,
    blockCount: rectsRest.filter(r=>r.kind==='block').length,
  });

  // ───────────────────────────── B. IMPACT MICRO-STRIP (flash lifetime, dust shape)
  await fresh('l1');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await game('await SS.seek(660);');                       // impact-60ms
  await filmstrip('impact-25ms-steps', { from: 0, to: 300, step: 25, cols: 5 });

  // fx census across the impact, 20 ms resolution, reported not guessed
  await fresh('l1');
  await game('return SS.aimAndFire(0.30, 0.90);');
  const fxWalk = await game(`
    let t=0, rows=[];
    while (t < 1600) { await SS.seek(20); t += 20;
      const f = SS.__world.fx, o = {t};
      for (const k of Object.keys(f.pools||{})) o[k] = f.pools[k].live|0;
      const s = await SS.state(); o.debris = s.debris; o.blocks = s.blocks;
      rows.push(o); }
    return rows;`);
  say('fx-l1-impact', fxWalk.filter(r => r.t >= 640 && r.t <= 1200));
  const flashRows = fxWalk.filter(r => r.flash > 0);
  say('flash-lifetime-ms', flashRows.length ? { first: flashRows[0].t, last: flashRows[flashRows.length-1].t,
      span: flashRows[flashRows.length-1].t - flashRows[0].t + 20, peak: Math.max(...flashRows.map(r=>r.flash)) } : 'NO FLASH EVER');

  // ───────────────────────────── C. COLLAPSE STRIP + mid-collapse stills at game framing
  await fresh('l1');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await game('await SS.seek(620);');
  await filmstrip('collapse-100ms-steps', { from: 0, to: 1400, step: 100, cols: 5 });

  // single stills for the blind A/B, at the game's own framing
  for (const [name, tAfterImpact] of [['p120',120],['p250',250],['p400',400],['p650',650],['p1000',1000]]) {
    await fresh('l1');
    await game('return SS.aimAndFire(0.30, 0.90);');
    await game('await SS.seek(args[0]);', 720 + tAfterImpact);
    await shot('midcollapse-' + name);
    if (tAfterImpact === 250) say('fx-at-impact+250', await game(FX_LIVE));
  }

  // ───────────────────────────── D. HINGE TEST: t = impact+300, neighbour contact fraction
  await fresh('l1');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await game('await SS.seek(1020);');
  const rects300 = await game(RECT_DUMP);
  say('hinge-raw', { blocks: rects300.filter(r=>r.kind==='block').length,
                     debris: rects300.filter(r=>r.kind==='debris').length });
  await writeFile(path.join(OUT, 'rects-impact+300.json'), JSON.stringify(rects300, null, 1));

  // ───────────────────────────── E. SETTLED WRECKAGE
  await fresh('l1');
  await game('return SS.aimAndFire(0.30, 0.90);');
  await game('await SS.seek(7000);');
  const settledA = await game('return SS.dumpBodies();');
  const rectsSettled = await game(RECT_DUMP);
  await shot('settled-gameframing');
  await game('await SS.seek(1000);');
  const settledB = await game('return SS.dumpBodies();');
  let sMax = 0;
  for (const a of settledA) { const b = settledB.find(x=>x.i===a.i); if (!b) continue;
    sMax = Math.max(sMax, Math.hypot(b.t[0]-a.t[0], b.t[1]-a.t[1])); }
  say('settled', {
    stillMovingPx_over_1s: +(sMax*proj.pxPerUnit).toFixed(3),
    asleep: settledB.filter(b=>b.sleeping).length, total: settledB.length,
    blocks: rectsSettled.filter(r=>r.kind==='block').length,
    debris: rectsSettled.filter(r=>r.kind==='debris').length,
    fxLive: await game(FX_LIVE), state: await state(),
  });
  await writeFile(path.join(OUT, 'rects-settled.json'), JSON.stringify(rectsSettled, null, 1));

  // ───────────────────────────── F. ONE BREAK PER MATERIAL
  const perMat = {};
  for (const mat of ['wood','glass','stone']) {
    const id = '_p3-' + mat;
    // wide, game framing, at impact + 80 ms
    await fresh(id);
    await game('return SS.aimAndFire(0.22, 0.80);');
    const first = await game(`
      let t=0, first=null;
      while (t<2500){ await SS.seek(20); t+=20; const s=await SS.state(); if(s.debris>0){first=t;break;} }
      return first;`);
    await game('await SS.seek(60);');
    await shot(mat + '-impact+60-gameframing');
    const fxAtImpact = await game(FX_LIVE);
    const rectsBreak = await game(RECT_DUMP);

    // close-up of the same instant — camLock AFTER the shot, per HOOKS.md
    await fresh(id);
    await game('return SS.aimAndFire(0.22, 0.80);');
    await game(`let t=0; while (t<2500){ await SS.seek(20); t+=20; const s=await SS.state(); if(s.debris>0) break; }`);
    await game('SS.camLock({ x: 18, y: 2.2, halfWidth: 3.2 });');
    await game('await SS.seek(60);');
    await shot(mat + '-LOCKED-impact+60');
    await filmstrip(mat + '-LOCKED-break', { from: 0, to: 400, step: 50, cols: 3 });
    await game('await SS.seek(2600);');
    await shot(mat + '-LOCKED-settled-shards');
    const rectsShards = await game(RECT_DUMP);
    await game('SS.camUnlock();');

    const deb = rectsBreak.filter(r=>r.kind==='debris');
    perMat[mat] = {
      impactMs: first, fxAtImpact,
      debrisCount: deb.length,
      debris: deb.map(d=>({ mat:d.mat, w:+d.w.toFixed(3), h:+d.h.toFixed(3),
                            aspect:+(Math.max(d.w,d.h)/Math.min(d.w,d.h)).toFixed(2) })),
      settledDebris: rectsShards.filter(r=>r.kind==='debris').length,
      blocksLeft: rectsBreak.filter(r=>r.kind==='block').length,
    };
  }
  say('per-material', perMat);

  // ───────────────────────────── G. FULL-CARNAGE FRAME (material sorting test)
  await fresh('l1');
  for (let i = 0; i < 3; i++) {
    const s = await state();
    if (s.phase === 'won' || s.phase === 'lost' || s.ammoLeft <= 0) break;
    const r = await game('return SS.aimAndFire(args[0], args[1]);', [0.30,0.26,0.34][i], 0.90);
    if (!r.ok) break;
    await game('await SS.seek(3000);');
  }
  await shot('carnage-3-shots');
  say('carnage', { state: await state(), rects: (await game(RECT_DUMP)).length });

  await writeFile(path.join(OUT, 'p3-r3-measurements.json'), JSON.stringify(R, null, 2));
};
