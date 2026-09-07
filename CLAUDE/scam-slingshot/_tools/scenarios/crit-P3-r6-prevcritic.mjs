/**
 * CRIT P3 r6 — independent critic capture for "Destruction & structures".
 *
 * Written from the RUBRIC's P3 criteria only. Every filmstrip that claims a millisecond is
 * timed from the REAL first ammo contact (Block.onImpact wrap), never from a velocity
 * heuristic (ORCHESTRATOR-NOTES: the r5 gate's detector trips up to 900 ms early).
 *
 * camLock is used ONLY for shard-silhouette / dust-structure geometry shots and every such
 * file is named -LOCKED. Composition frames are shot at the game's own framing.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const R = {};

export default async ({ shot, filmstrip, game, state, OUT }) => {
  // ---- shared page-side helpers ------------------------------------------------------
  const install = () => game(`
    const w = SS.__world;
    // world -> screen px, using the game's own camera
    window.__proj = (x, y) => {
      const V3 = w.camera.position.constructor;
      const v = new V3(x, y, 0).project(w.camera);
      const r = w.renderer.domElement.getBoundingClientRect();
      return { x: r.left + (v.x*0.5+0.5)*r.width, y: r.top + (-v.y*0.5+0.5)*r.height };
    };
    window.__pxPerWorld = () => {
      const a = window.__proj(18, 3), b = window.__proj(19, 3);
      return Math.abs(b.x - a.x);
    };
    return { px: window.__pxPerWorld() };
  `);

  // Instrument fracture + impact so we know WHO killed each block and how many pieces it made.
  const instrument = () => game(`
    const w = SS.__world;
    const B = w.blocks[0] && Object.getPrototypeOf(w.blocks[0]);
    if (!B) throw new Error('no blocks to instrument');
    window.__log = { impacts: [], fractures: [], firstAmmoTick: null };
    if (!B.__wrapped) {
      B.__wrapped = true;
      const oi = B.onImpact, os = B.onShock, of = B.fracture;
      B.onImpact = function (imp, other, point, approach = 0) {
        const tag = other && other.tag;
        if (tag === 'ammo' && approach >= 1.2 && window.__log.firstAmmoTick === null)
          window.__log.firstAmmoTick = SS.tick();
        this.__lastSrc = (tag === 'ammo' && (other.lastSpeed ?? 0) >= 6) ? 'AMMO'
                        : tag ? tag.toUpperCase() : 'X';
        window.__log.impacts.push({ t: SS.tick(), tag, imp: +imp.toFixed(2), ap: +approach.toFixed(1), mat: this.matName });
        return oi.call(this, imp, other, point, approach);
      };
      B.onShock = function (d, ux, uy) { this.__lastSrc = 'SHOCK'; return os.call(this, d, ux, uy); };
      B.fracture = function (imp, point) {
        const before = w.debris.length;
        const r = of.call(this, imp, point);
        window.__log.fractures.push({
          t: SS.tick(), mat: this.matName, killer: this.__lastSrc || '?',
          w: +this.w.toFixed(2), h: +this.h.toFixed(2),
          pieces: w.debris.length - before,
          sizes: w.debris.slice(before).map(d => [+d.w.toFixed(3), +d.h.toFixed(3)]),
        });
        return r;
      };
    }
    return true;
  `);

  const census = () => game(`
    const w = SS.__world;
    const byMat = {};
    for (const d of w.debris) { byMat[d.matName] = (byMat[d.matName]||0)+1; }
    return {
      blocks: w.blocks.filter(b => !b.broken && !b.fixed).length,
      broken: w.blocks.filter(b => b.broken).length,
      debris: w.debris.length, byMat,
      debrisSizes: w.debris.map(d => ({ m: d.matName, w: +d.w.toFixed(3), h: +d.h.toFixed(3) })),
      villains: w.villains.filter(v => !v.dead).length,
      phase: w.phase,
    };
  `);

  // ==========================================================================
  // A. REST STABILITY — the hard bar. l1, untouched.
  // ==========================================================================
  await game('await SS.loadLevel("l1"); SS.seed(11);');
  await install();
  await game('await SS.seek(2000);');
  const restA = await game('return SS.dumpBodies();');
  await game('await SS.seek(1000);');
  const restB = await game('return SS.dumpBodies();');
  const pxw = (await install()).px;

  let maxD = 0, maxTag = '', asleep = 0;
  const byIdx = new Map(restB.map(b => [b.i, b]));
  for (const a of restA) {
    const b = byIdx.get(a.i); if (!b) continue;
    const d = Math.hypot(b.t[0] - a.t[0], b.t[1] - a.t[1]);
    if (d > maxD) { maxD = d; maxTag = `${a.tag}#${a.i}`; }
    if (b.sleeping) asleep++;
  }
  R.rest = {
    bodies: restA.length, asleepAt3s: asleep,
    maxWorldDrift2to3s: +maxD.toFixed(6),
    maxScreenDriftPx: +(maxD * pxw).toFixed(4),
    worstBody: maxTag, pxPerWorldUnit: +pxw.toFixed(2),
    maxAbsZ: +Math.max(...restB.map(b => Math.abs(b.t[2]))).toExponential(2),
  };
  await shot('rest-establishing-GAMEFRAME');

  // close read of an untouched stack: gaps, contact shadows, chamfers
  await game('SS.camLock({ x: 18.0, y: 3.4, halfWidth: 4.6 }); await SS.seek(60);');
  await shot('rest-towerA-LOCKED');
  await game('SS.camLock({ x: 22.8, y: 2.4, halfWidth: 3.6 }); await SS.seek(60);');
  await shot('rest-towerB-LOCKED');
  await game('SS.camUnlock(); await SS.seek(200);');

  // ==========================================================================
  // B. THE SHOT — timed from the real first ammo contact.
  // ==========================================================================
  await game('await SS.restart(); SS.seed(11); await SS.seek(1200);');
  await install(); await instrument();
  const fired = await game('return SS.aimAndFire(0.30, 0.90);');
  R.shot = { angle: 0.30, power: 0.90, speed: fired.speed, exitSpeed: fired.exitSpeed };

  // walk forward in 10 ms slices until the ammo genuinely touches a block
  let ms = 0, contactMs = null;
  while (ms < 3000) {
    await game('await SS.seek(10);'); ms += 10;
    const t = await game('return window.__log.firstAmmoTick;');
    if (t !== null) { contactMs = ms; break; }
  }
  R.shot.contactMs = contactMs;
  if (contactMs === null) throw new Error('crit-P3-r6: the shot never touched a block');

  // IMPACT: what happens in the first quarter second at the contact point.
  await shot('impact-t0-GAMEFRAME');
  await filmstrip('impact-0to240-step30', { from: 0, to: 240, step: 30, cols: 3 });
  const at240 = await census();

  // COHESION at contact+300 ms is measured on a separate run so the filmstrip's seeks
  // cannot be blamed; here we are already at +240, so seek 60 more.
  await game('await SS.seek(60);');
  const coh = await game(`
    const w = SS.__world;
    const live = w.blocks.filter(b => !b.broken);
    // "in contact with a neighbour": any other live block whose AABB is within 12 cm
    const box = b => { const t = b.body.translation(); return { x:t.x, y:t.y, hw:b.w/2, hh:b.h/2 }; };
    const bs = live.map(box);
    let touching = 0;
    for (let i=0;i<bs.length;i++) {
      let ok = false;
      for (let j=0;j<bs.length;j++) { if (i===j) continue;
        const a=bs[i], c=bs[j];
        if (Math.abs(a.x-c.x) <= a.hw+c.hw+0.12 && Math.abs(a.y-c.y) <= a.hh+c.hh+0.12) { ok=true; break; }
      }
      if (ok) touching++;
    }
    // movement: blocks that have shifted from their authored spot
    return { live: live.length, touching, moving: live.filter(b => b.body.linvel().x**2 + b.body.linvel().y**2 > 0.25).length };
  `);
  R.cohesionAt300 = { ...coh, pct: +(100 * coh.touching / Math.max(1, coh.live)).toFixed(1) };

  // CHAIN COLLAPSE across the next 1.6 s
  await filmstrip('chain-300to1900-step200', { from: 0, to: 1600, step: 200, cols: 3 });
  R.afterChain = await census();

  // settle out
  for (let i = 0; i < 12; i++) {
    await game('await SS.seek(500);');
    const s = await state();
    if (s.phase !== 'flying' && s.phase !== 'settling') break;
  }
  await game('await SS.seek(1500);');
  R.settled = await census();
  R.log = await game('return window.__log;');
  R.settledState = await state();
  await shot('settled-GAMEFRAME');
  await game('SS.camLock({ x: 18.2, y: 1.6, halfWidth: 5.0 }); await SS.seek(60);');
  await shot('settled-wreckage-LOCKED');
  await game('SS.camUnlock(); await SS.seek(120);');

  // settled stillness (debris must be at rest, nothing floating)
  const sA = await game('return SS.dumpBodies();');
  await game('await SS.seek(1000);');
  const sB = await game('return SS.dumpBodies();');
  const mB = new Map(sB.map(b => [b.i, b]));
  let sMax = 0, sTag = '';
  for (const a of sA) { const b = mB.get(a.i); if (!b) continue;
    const d = Math.hypot(b.t[0]-a.t[0], b.t[1]-a.t[1]);
    if (d > sMax) { sMax = d; sTag = `${a.tag}#${a.i}`; } }
  R.settledStillness = { maxWorldDrift1s: +sMax.toFixed(5), maxScreenPx: +(sMax*pxw).toFixed(3), worst: sTag,
    asleep: sB.filter(b => b.sleeping).length, of: sB.length };

  // ==========================================================================
  // C. PER-MATERIAL BREAKS — one column, three materials, identical geometry.
  // ==========================================================================
  R.materials = {};
  for (const [lvl, mname] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    await game('await SS.loadLevel(args[0]); SS.seed(5); await SS.seek(1200);', lvl);
    await install(); await instrument();
    await game('return SS.aimAndFire(0.24, 0.92);');
    let m = 0, c = null;
    while (m < 3000) { await game('await SS.seek(10);'); m += 10;
      const t = await game('return window.__log.firstAmmoTick;'); if (t !== null) { c = m; break; } }
    // lens on the column so shard silhouettes and dust structure are readable
    await game('SS.camLock({ x: 18.0, y: 2.2, halfWidth: 3.2 });');
    await filmstrip(`${mname}-break-0to400-step50-LOCKED`, { from: 0, to: 400, step: 50, cols: 3 });
    const burst = await game(`
      const w = SS.__world;
      // debris spread, in block widths, right after the break
      const xs = w.debris.map(d => d.body.translation().x);
      return { debris: w.debris.length,
        spreadX: xs.length ? +(Math.max(...xs) - Math.min(...xs)).toFixed(2) : 0,
        fx: Object.keys(w.fx || {}) };
    `);
    await game('await SS.seek(2600);');
    await shot(`${mname}-settled-LOCKED`);
    await game('SS.camLock({ x: 18.0, y: 0.9, halfWidth: 1.7 }); await SS.seek(30);');
    await shot(`${mname}-shard-CROP-LOCKED`);
    await game('SS.camUnlock();');
    R.materials[mname] = { contactMs: c, burst, log: await game('return window.__log;'), census: await census() };
  }

  await writeFile(path.join(OUT, 'P3-r6-measurements.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2).slice(0, 200));
};
