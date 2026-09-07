/**
 * CRIT P3 — round 6, independent critic capture for "Destruction & materials".
 *
 * Written from RUBRIC.md's P3 criteria alone. I did not build this and did not read a
 * builder summary.
 *
 * Timing rule (ORCHESTRATOR-NOTES): every millisecond claim is measured from the REAL first
 * ammo contact, found by wrapping Block.onImpact and requiring tag==='ammo' with a live
 * closing speed — never from a "something moved" heuristic, which trips up to 900 ms early.
 *
 * camLock is a LENS. Every file that uses it is named -LOCKED and is used only for geometry
 * criteria (shard silhouette, dust structure, contact shadows). Composition frames are shot
 * at the game's own framing and named -GAMEFRAME.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const R = { units: {}, rest: {}, impact: {}, chain: {}, settled: {}, materials: {}, late: {} };

export default async ({ shot, filmstrip, game, state, OUT }) => {

  // ---------------------------------------------------------------- helpers
  const install = () => game(`
    const w = SS.__world;
    window.__proj = (x, y) => {
      const V3 = w.camera.position.constructor;
      const v = new V3(x, y, 0).project(w.camera);
      const r = w.renderer.domElement.getBoundingClientRect();
      return { x: r.left + (v.x*0.5+0.5)*r.width, y: r.top + (-v.y*0.5+0.5)*r.height };
    };
    const a = window.__proj(18,3), b = window.__proj(19,3);
    return { pxPerWorld: Math.abs(b.x-a.x), vw: w.renderer.domElement.getBoundingClientRect().width };
  `);

  /** Wrap fracture/onImpact/onShock so we know WHO killed each block and what it made. */
  const instrument = () => game(`
    const w = SS.__world;
    const B = w.blocks[0] && Object.getPrototypeOf(w.blocks[0]);
    if (!B) throw new Error('no blocks to instrument');
    window.__log = { impacts: [], fractures: [], firstAmmo: null, cracks: [] };
    if (!B.__critWrapped) {
      B.__critWrapped = true;
      const oi = B.onImpact, os = B.onShock, of = B.fracture, sd = B.showDamage;
      B.onImpact = function (imp, other, point, approach = 0) {
        const tag = other && other.tag;
        const live = tag === 'ammo' && (other.lastSpeed ?? 0) >= 6;
        if (live && window.__log.firstAmmo === null)
          window.__log.firstAmmo = { tick: SS.tick(), mat: this.matName, imp: +imp.toFixed(2) };
        this.__src = live ? 'AMMO' : tag ? String(tag).toUpperCase() : 'X';
        window.__log.impacts.push({ t: SS.tick(), src: this.__src, imp: +imp.toFixed(2),
                                    ap: +approach.toFixed(1), mat: this.matName });
        return oi.call(this, imp, other, point, approach);
      };
      B.onShock = function (d, ux, uy) { this.__src = 'SHOCK'; return os.call(this, d, ux, uy); };
      if (sd) B.showDamage = function (s) { window.__log.cracks.push({ t: SS.tick(), mat: this.matName, step: s }); return sd.call(this, s); };
      B.fracture = function (imp, point) {
        const before = w.debris.length;
        const asleep = (() => { let a=0,n=0; for (const b of w.blocks) { if (b.broken||b.fixed) continue;
          n++; if (b.body.isSleeping && b.body.isSleeping()) a++; } return n ? a/n : 1; })();
        const r = of.call(this, imp, point);
        window.__log.fractures.push({
          t: SS.tick(), mat: this.matName, killer: this.__src || '?', imp: +imp.toFixed(2),
          w: +this.w.toFixed(2), h: +this.h.toFixed(2), asleepFrac: +asleep.toFixed(2),
          pieces: w.debris.length - before,
          sizes: w.debris.slice(before).map(d => [+d.w.toFixed(3), +d.h.toFixed(3)]),
        });
        return r;
      };
    }
    return true;
  `);

  const fxLive = () => game(`
    const p = SS.__world.fx.pools, o = {};
    for (const k of Object.keys(p)) { let n=0; const L=p[k].p.life; for (let i=0;i<L.length;i++) if (L[i]>0) n++; o[k]=n; }
    return o;
  `);

  const census = () => game(`
    const w = SS.__world, byMat = {};
    for (const d of w.debris) byMat[d.matName] = (byMat[d.matName]||0)+1;
    return {
      standing: w.blocks.filter(b => !b.broken && !b.fixed).length,
      broken: w.blocks.filter(b => b.broken).length,
      debris: w.debris.length, byMat,
      villainsAlive: w.villains.filter(v => !v.dead).length, phase: w.phase,
    };
  `);

  // Blocks that have MOVED from their authored position (propagation oracle).
  const snapshotPos = () => game(`
    const w = SS.__world; const o = {};
    w.blocks.forEach((b,i) => { const t = b.body.translation();
      o[i] = { x:t.x, y:t.y, rot: b.body.rotation().z, mat:b.matName, w:b.w, h:b.h, broken:b.broken }; });
    return o;
  `);
  const movedSince = (base) => game(`
    const w = SS.__world, base = args[0]; let moved = 0, rot = 0; const which = [];
    w.blocks.forEach((b,i) => {
      const t = b.body.translation(), r = b.body.rotation().z, o = base[i]; if (!o) return;
      const d = Math.hypot(t.x-o.x, t.y-o.y), dr = Math.abs(r-o.rot);
      if (b.broken || d > 0.10 || dr > 0.06) { moved++; which.push({ i, mat:o.mat, w:+o.w.toFixed(2), h:+o.h.toFixed(2),
        d:+d.toFixed(2), dr:+dr.toFixed(3), broken:b.broken }); }
      if (!b.broken && dr > 0.06) rot++;
    });
    return { moved, of: w.blocks.length, rotated: rot, which };
  `, base);

  // ==========================================================================
  // A. REST — the hard bar. l1, untouched.
  // ==========================================================================
  await game('await SS.loadLevel("l1"); SS.seed(2026);');
  const u = await install(); R.units.pxPerWorld = +u.pxPerWorld.toFixed(2); R.units.viewW = u.vw;
  await game('await SS.seek(2000);');
  const a2 = await game('return SS.dumpBodies();');
  await game('await SS.seek(1000);');
  const a3 = await game('return SS.dumpBodies();');
  const m3 = new Map(a3.map(b => [b.i, b]));
  let mx = 0, worst = '';
  for (const b of a2) { const c = m3.get(b.i); if (!c) continue;
    const d = Math.hypot(c.t[0]-b.t[0], c.t[1]-b.t[1]);
    if (d > mx) { mx = d; worst = `${b.tag}#${b.i}`; } }
  R.rest = {
    bodies: a2.length, asleepAt3s: a3.filter(b => b.sleeping).length,
    drift2to3sWorld: +mx.toFixed(6), drift2to3sScreenPx: +(mx * u.pxPerWorld).toFixed(4),
    worstBody: worst, maxAbsZ: +Math.max(...a3.map(b => Math.abs(b.t[2]))).toExponential(2),
  };
  // interpenetration of live blocks at rest
  R.rest.overlaps = await game(`
    const w = SS.__world, bs = w.blocks.filter(b => !b.broken).map(b => { const t=b.body.translation();
      return { x:t.x, y:t.y, hw:b.w/2, hh:b.h/2, m:b.matName }; });
    const out = [];
    for (let i=0;i<bs.length;i++) for (let j=i+1;j<bs.length;j++) {
      const a=bs[i], c=bs[j];
      const ox = a.hw+c.hw - Math.abs(a.x-c.x), oy = a.hh+c.hh - Math.abs(a.y-c.y);
      if (ox > 0.005 && oy > 0.005) out.push({ a:a.m, b:c.m, ox:+ox.toFixed(4), oy:+oy.toFixed(4) });
    }
    return out;
  `);
  await shot('rest-l1-GAMEFRAME');
  await game('SS.camLock({ x: 18.0, y: 3.6, halfWidth: 4.2 }); await SS.seek(50);');
  await shot('rest-towerA-LOCKED');
  await game('SS.camLock({ x: 22.7, y: 2.2, halfWidth: 3.2 }); await SS.seek(50);');
  await shot('rest-towerB-LOCKED');
  await game('SS.camUnlock(); await SS.seek(150);');

  // ==========================================================================
  // B. THE SHOT — impact read, timed from the real first ammo contact.
  // ==========================================================================
  await game('await SS.restart(); SS.seed(2026); await SS.seek(1200);');
  await install(); await instrument();
  const authored = await snapshotPos();
  const fired = await game('return SS.aimAndFire(0.30, 0.90);');
  R.impact.shot = { angle: 0.30, power: 0.90, speed: +(fired.speed ?? 0).toFixed(2),
                    exitSpeed: +(fired.exitSpeed ?? 0).toFixed(2) };
  let ms = 0, contact = null;
  while (ms < 4000) { await game('await SS.seek(10);'); ms += 10;
    contact = await game('return window.__log.firstAmmo;'); if (contact) break; }
  if (!contact) throw new Error('crit-P3-r6: the shot never reached a block');
  R.impact.contactAtMs = ms; R.impact.firstAmmo = contact;

  // fine read of the impact instant: flash lifetime, one smoke ball, no global fog
  R.impact.fx = [];
  await game('SS.camLock({ x: 17.6, y: 3.0, halfWidth: 4.0 });');
  for (let t = 0; t <= 300; t += 20) {
    R.impact.fx.push({ t, ...(await fxLive()) });
    if (t < 300) await game('await SS.seek(20);');
  }
  R.impact.fxAt300 = await census();
  // re-run for the strips so the fx sampling seeks cannot be blamed for the frames
  await game('await SS.restart(); SS.seed(2026); await SS.seek(1200);');
  await install(); await instrument();
  await game('return SS.aimAndFire(0.30, 0.90);');
  let m2 = 0; while (m2 < 4000) { await game('await SS.seek(10);'); m2 += 10;
    if (await game('return window.__log.firstAmmo;')) break; }
  await shot('impact-t0-GAMEFRAME');
  await game('SS.camLock({ x: 17.6, y: 3.0, halfWidth: 4.2 });');
  await filmstrip('impact-0to240-step30-LOCKED', { from: 0, to: 240, step: 30, cols: 3 });
  await game('SS.camUnlock(); await SS.seek(60);');   // now at contact+300

  R.impact.cohesionAt300 = await game(`
    const w = SS.__world;
    const live = w.blocks.filter(b => !b.broken && !b.fixed);
    const box = b => { const t = b.body.translation(); return { x:t.x, y:t.y, hw:b.w/2, hh:b.h/2 }; };
    const bs = live.map(box); let touching = 0;
    for (let i=0;i<bs.length;i++) { for (let j=0;j<bs.length;j++) { if (i===j) continue;
      const a=bs[i], c=bs[j];
      if (Math.abs(a.x-c.x) <= a.hw+c.hw+0.12 && Math.abs(a.y-c.y) <= a.hh+c.hh+0.12) { touching++; break; } } }
    return { live: live.length, touching, pct: +(100*touching/Math.max(1,live.length)).toFixed(1) };
  `);
  R.impact.movedAt300 = await movedSince(authored);

  // ==========================================================================
  // C. CHAIN COLLAPSE — staggering, propagation at +800 ms
  // ==========================================================================
  await filmstrip('chain-300to1900-step200-GAMEFRAME', { from: 0, to: 1600, step: 200, cols: 3 });
  // we are now at contact+1900; re-run to sample exactly +800
  R.chain.censusAt1900 = await census();
  R.chain.fxOverCollapse = [];
  await game('await SS.restart(); SS.seed(2026); await SS.seek(1200);');
  await install(); await instrument();
  const authored2 = await snapshotPos();
  await game('return SS.aimAndFire(0.30, 0.90);');
  let m3b = 0; while (m3b < 4000) { await game('await SS.seek(10);'); m3b += 10;
    if (await game('return window.__log.firstAmmo;')) break; }
  for (let t = 0; t <= 1600; t += 100) {
    R.chain.fxOverCollapse.push({ t, ...(await fxLive()), ...(await census()) });
    if (t === 800) R.chain.movedAt800 = await movedSince(authored2);
    if (t < 1600) await game('await SS.seek(100);');
  }
  // frame reaction: is the load-bearing structure itself moving, or only the top?
  R.chain.frameAt800 = await game(`
    const w = SS.__world;
    // the four ground-storey posts + the two long beams are the load-bearing frame of l1
    const isFrame = b => (b.w >= 3.0 && b.h <= 0.6) || (b.h >= 2.2 && b.w <= 0.6);
    const f = w.blocks.filter(isFrame);
    return { frameBlocks: f.length,
      reacting: f.filter(b => b.broken || Math.hypot(b.body.linvel().x, b.body.linvel().y) > 0.4
                              || Math.abs(b.body.angvel().z) > 0.25).length };
  `);

  // settle
  for (let i = 0; i < 14; i++) { await game('await SS.seek(500);');
    const s = await state(); if (s.phase !== 'flying' && s.phase !== 'settling') break; }
  await game('await SS.seek(1200);');
  R.settled.census = await census();
  R.settled.state = await state();
  R.settled.log = await game('return window.__log;');
  await shot('settled-l1-GAMEFRAME');
  await game('SS.camLock({ x: 18.0, y: 1.4, halfWidth: 4.6 }); await SS.seek(40);');
  await shot('settled-wreckage-A-LOCKED');
  await game('SS.camLock({ x: 22.7, y: 1.2, halfWidth: 3.6 }); await SS.seek(40);');
  await shot('settled-wreckage-B-LOCKED');
  await game('SS.camUnlock(); await SS.seek(120);');

  // settled stillness + floaters
  const s1 = await game('return SS.dumpBodies();');
  await game('await SS.seek(1000);');
  const s2 = await game('return SS.dumpBodies();');
  const sm = new Map(s2.map(b => [b.i, b]));
  let smax = 0, sw = '';
  for (const b of s1) { const c = sm.get(b.i); if (!c) continue;
    const d = Math.hypot(c.t[0]-b.t[0], c.t[1]-b.t[1]); if (d > smax) { smax = d; sw = `${b.tag}#${b.i}`; } }
  R.settled.stillness = { drift1sWorld: +smax.toFixed(5), drift1sPx: +(smax*u.pxPerWorld).toFixed(3),
    worst: sw, asleep: s2.filter(b => b.sleeping).length, of: s2.length };

  // ==========================================================================
  // D. LATE FRACTURE — does anything break in a world that has stopped moving?
  // ==========================================================================
  const before = (await game('return window.__log.fractures.length;'));
  await game('await SS.seek(3000);');
  const after = (await game('return window.__log.fractures;'));
  R.late = { fracturesDuringIdle3s: after.length - before,
             idleFractures: after.slice(before),
             asleepFracsOfAllFractures: after.map(f => f.asleepFrac) };

  // ==========================================================================
  // E. PER-MATERIAL — identical geometry in three materials
  // ==========================================================================
  for (const [lvl, mn] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    await game('await SS.loadLevel(args[0]); SS.seed(7); await SS.seek(1200);', lvl);
    await install(); await instrument();
    await game('return SS.aimAndFire(0.24, 0.92);');
    let mm = 0, c = null;
    while (mm < 4000) { await game('await SS.seek(10);'); mm += 10;
      c = await game('return window.__log.firstAmmo;'); if (c) break; }
    const fx = [];
    for (let t = 0; t <= 500; t += 50) { fx.push({ t, ...(await fxLive()) }); if (t < 500) await game('await SS.seek(50);'); }
    const spread = await game(`
      const w = SS.__world; const xs = w.debris.map(d => d.body.translation().x);
      const ys = w.debris.map(d => d.body.translation().y);
      return { n: w.debris.length,
        spreadX: xs.length ? +(Math.max(...xs)-Math.min(...xs)).toFixed(2) : 0,
        spreadY: ys.length ? +(Math.max(...ys)-Math.min(...ys)).toFixed(2) : 0 };
    `);
    // re-run for the strip
    await game('await SS.restart(); SS.seed(7); await SS.seek(1200);');
    await install(); await instrument();
    await game('return SS.aimAndFire(0.24, 0.92);');
    let m4 = 0; while (m4 < 4000) { await game('await SS.seek(10);'); m4 += 10;
      if (await game('return window.__log.firstAmmo;')) break; }
    await game('SS.camLock({ x: 18.0, y: 2.4, halfWidth: 3.0 });');
    await filmstrip(`${mn}-break-0to400-step50-LOCKED`, { from: 0, to: 400, step: 50, cols: 3 });
    await game('await SS.seek(2600);');
    await shot(`${mn}-settled-LOCKED`);
    await game('SS.camLock({ x: 18.0, y: 0.8, halfWidth: 1.5 }); await SS.seek(30);');
    await shot(`${mn}-shardcrop-LOCKED`);
    await game('SS.camUnlock();');
    R.materials[mn] = { contactMs: mm, fx, spread, log: await game('return window.__log;'),
                        census: await census() };
  }

  await writeFile(path.join(OUT, 'P3-r6-crit.json'), JSON.stringify(R, null, 2));
  console.log('rest drift px', R.rest.drift2to3sScreenPx, '| overlaps', R.rest.overlaps.length,
    '| cohesion@300', R.impact.cohesionAt300.pct, '| moved@800', R.chain.movedAt800?.moved,
    '| settled', JSON.stringify(R.settled.census));
};
