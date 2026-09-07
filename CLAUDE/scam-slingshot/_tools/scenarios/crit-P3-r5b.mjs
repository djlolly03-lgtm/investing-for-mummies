/**
 * crit-P3-r5b.mjs — critic probe #2.
 *
 * Fixes three measurement holes found in run (a):
 *  1. "first ammo contact" tripped on a CORNER GRAZE 1.7 s before the real hit. Time is now
 *     taken from the first FRACTURE (Block.prototype.fracture patch), which is the event the
 *     rubric's millisecond criteria are actually about.
 *  2. AABB overlap wildly over-reports interpenetration for rotated planks. Real OBB/SAT now.
 *  3. The 0.22@0.85 probe shot did not break the wood or stone columns at all, so the
 *     "wood makes no dust" measurement measured nothing. Sweep for a shot that breaks.
 */

const INSTRUMENT = `
const w = SS.__world;
const B = w.blocks[0].constructor.prototype;
window.__fx = [];
if (!B.__fpatched) {
  B.__fpatched = true;
  const of = B.fracture;
  B.fracture = function (imp, pt) {
    const t0 = SS.tick(), before = SS.__world.debris.length;
    const kids = of.call(this, imp, pt);
    (window.__fx ||= []).push({ tick: t0, mat: this.matName, w: this.w, h: this.h,
      imp, kids: kids.length, dAfter: SS.__world.debris.length - before,
      x: pt?.x, y: pt?.y });
    return kids;
  };
}
return true;`;

const CENSUS = `
const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
const V3 = cam.position.constructor;
const proj = (x, y) => { const v = new V3(x, y, 0).project(cam);
  return { px: (v.x*0.5+0.5)*r.width, py: (-v.y*0.5+0.5)*r.height }; };
const rowOf = (e, kind, shrink) => { const t = e.body.translation(), q = e.body.rotation(), v = e.body.linvel();
  const p = proj(t.x, t.y);
  return { kind, id: e.id, mat: e.matName, x: t.x, y: t.y, w: e.w*shrink, h: e.h*shrink,
    a: Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)), sp: Math.hypot(v.x, v.y),
    px: p.px, py: p.py, sleeping: e.body.isSleeping() };
};
const pools = {}; for (const k in w.fx.pools) pools[k] = w.fx.pools[k].live;
const p0 = proj(18,0), p1 = proj(19,0);
return { tick: SS.tick(),
  blocks: w.blocks.filter(b=>!b.dead).map(b=>rowOf(b,'block',1)),
  debris: w.debris.filter(d=>!d.dead).map(d=>rowOf(d,'debris',0.94)),
  pools, pxPerM: Math.abs(p1.px-p0.px), fx: window.__fx ?? [] };`;

// ---- proper OBB separating-axis penetration (metres) -----------------------
function obbPen(a, b) {
  const corners = (r) => {
    const c = Math.cos(r.a), s = Math.sin(r.a), hw = r.w / 2, hh = r.h / 2;
    return [[hw, hh], [-hw, hh], [-hw, -hh], [hw, -hh]]
      .map(([x, y]) => [r.x + x * c - y * s, r.y + x * s + y * c]);
  };
  const A = corners(a), B = corners(b);
  const axes = [[Math.cos(a.a), Math.sin(a.a)], [-Math.sin(a.a), Math.cos(a.a)],
                [Math.cos(b.a), Math.sin(b.a)], [-Math.sin(b.a), Math.cos(b.a)]];
  let minPen = Infinity;
  for (const [ax, ay] of axes) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, y] of A) { const p = x * ax + y * ay; a0 = Math.min(a0, p); a1 = Math.max(a1, p); }
    for (const [x, y] of B) { const p = x * ax + y * ay; b0 = Math.min(b0, p); b1 = Math.max(b1, p); }
    const ov = Math.min(a1, b1) - Math.max(a0, b0);
    if (ov <= 0) return 0;
    minPen = Math.min(minPen, ov);
  }
  return minPen;
}
function worstPen(rows) {
  let worst = 0, pair = null;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const p = obbPen(rows[i], rows[j]);
    if (p > worst) { worst = p; pair = `${rows[i].kind}${rows[i].id}(${rows[i].mat}) vs ${rows[j].kind}${rows[j].id}(${rows[j].mat})`; }
  }
  return { worst, pair };
}

export default async ({ shot, filmstrip, game, state }) => {
  const L = (...a) => console.log(...a);

  // =========================================================================
  // 1. PROBE SWEEP — find a shot that actually breaks each probe column.
  // =========================================================================
  const best = {};
  for (const m of ['wood', 'glass', 'stone']) {
    L(`\n=== sweep _p3-${m} ===`);
    for (const [ang, pow] of [[0.22, 0.85], [0.30, 0.90], [0.36, 0.95], [0.18, 0.80], [0.26, 1.0], [0.42, 1.0]]) {
      await game('return await SS.loadLevel(args[0]);', `_p3-${m}`);
      await game('return SS.seed(777);');
      await game('await SS.seek(1200);');
      await game(INSTRUMENT);
      await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
      await game('await SS.seek(2500);');
      const c = await game(CENSUS);
      const fx = c.fx;
      L(` ${ang}@${pow}: fractures=${fx.length} kids=[${fx.map(f => f.kids).join(',')}] blocks=${c.blocks.length} debris=${c.debris.length}`);
      if (fx.length && (!best[m] || fx.length > best[m].n)) best[m] = { ang, pow, n: fx.length };
    }
    L(` best for ${m}: ${JSON.stringify(best[m])}`);
  }

  // =========================================================================
  // 2. PER-MATERIAL BREAK, timed FROM THE FRACTURE.
  // =========================================================================
  for (const m of ['wood', 'glass', 'stone']) {
    const b = best[m];
    if (!b) { L(`\n!!! ${m}: NO SHOT IN THE SWEEP BROKE IT — cannot measure`); continue; }
    L(`\n########## ${m.toUpperCase()} break, ${b.ang}@${b.pow} ##########`);
    await game('return await SS.loadLevel(args[0]);', `_p3-${m}`);
    await game('return SS.seed(777);');
    await game('await SS.seek(1200);');
    await game(INSTRUMENT);
    await game('return SS.aimAndFire(args[0], args[1]);', b.ang, b.pow);
    // walk to the first fracture in 20 ms slices
    let t = 0, got = 0;
    while (t < 5000) { await game('await SS.seek(20);'); t += 20;
      got = await game('return (window.__fx||[]).length;'); if (got) break; }
    L(`first fracture at fire+${t} ms`);
    const fx0 = await game('return window.__fx;');
    for (const f of fx0) L(`  FRACTURE ${f.mat} ${f.w.toFixed(2)}x${f.h.toFixed(2)} imp=${f.imp.toFixed(1)} -> ${f.kids} pieces`);
    let seen = 0;
    for (const at of [0, 40, 80, 120, 160, 200, 300, 400]) {
      if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
      const c = await game(CENSUS);
      L(`  break+${String(at).padStart(3)} deb=${String(c.debris.length).padStart(2)} flash=${c.pools.flash}` +
        ` SMOKE=${c.pools.smoke} ${m}=${c.pools[m]} chip=${c.pools.chip} spark4=${c.pools.spark4}`);
    }
    const c = await game(CENSUS);
    const T = c.debris.map(d => Math.max(d.w, d.h) / 0.94);
    const AR = c.debris.map(d => (Math.max(d.w, d.h) / Math.min(d.w, d.h)));
    L(`  ${m} debris n=${c.debris.length}; longest dim m [${T.map(x=>x.toFixed(2)).join(', ')}]`);
    L(`  ${m} debris aspect ratios [${AR.map(x=>x.toFixed(2)).join(', ')}]  mean=${(AR.reduce((s,x)=>s+x,0)/AR.length).toFixed(2)}`);
    // spread of the burst in block-widths (parent column is 0.62 wide)
    if (c.debris.length) {
      const xs = c.debris.map(d => d.x), ys = c.debris.map(d => d.y);
      L(`  ${m} burst extent: ${(Math.max(...xs)-Math.min(...xs)).toFixed(2)} m wide x ${(Math.max(...ys)-Math.min(...ys)).toFixed(2)} m tall (parent col w=0.62)`);
    }
  }

  // =========================================================================
  // 3. l1 — full shot, fracture census + REAL interpenetration at rest.
  // =========================================================================
  L(`\n########## l1 0.30@0.90 — fracture census + SAT rest check ##########`);
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(0.30, 0.90);');
  let t = 0, got = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    got = await game('return (window.__fx||[]).length;'); if (got) break; }
  L(`first fracture at fire+${t} ms`);
  await filmstrip('l1-FROMFRACTURE-0-360', { from: 0, to: 360, step: 40, cols: 5 });
  await filmstrip('l1-FROMFRACTURE-collapse', { from: 0, to: 1200, step: 150, cols: 3 });
  await game('await SS.seek(4000);');
  const fin = await game(CENSUS);
  L(`fractures: ${fin.fx.length}`);
  for (const f of fin.fx) L(`  ${f.mat} ${f.w.toFixed(2)}x${f.h.toFixed(2)} imp=${f.imp.toFixed(1)} tick=${f.tick} -> ${f.kids} pieces`);
  const kidCounts = fin.fx.map(f => f.kids);
  L(`PIECES PER DESTROYED BLOCK: min=${Math.min(...kidCounts)} max=${Math.max(...kidCounts)} (rubric: 4-8)`);
  const wp = worstPen([...fin.blocks, ...fin.debris]);
  L(`SETTLED real OBB interpenetration: ${(wp.worst * fin.pxPerM).toFixed(2)} px (${wp.worst.toFixed(4)} m) ${wp.pair ?? ''}`);
  const awake = [...fin.blocks, ...fin.debris].filter(r => !r.sleeping);
  L(`SETTLED awake: ${awake.length}; max speed ${Math.max(0, ...[...fin.blocks, ...fin.debris].map(r => r.sp)).toFixed(4)} m/s`);
  // settle drift over 1 s
  const a = await game(CENSUS);
  await game('await SS.seek(1000);');
  const b2 = await game(CENSUS);
  const m1 = new Map(a.blocks.concat(a.debris).map(r => [r.id, r]));
  let mx = 0;
  for (const r of b2.blocks.concat(b2.debris)) { const p = m1.get(r.id); if (p) mx = Math.max(mx, Math.hypot(p.px - r.px, p.py - r.py)); }
  L(`POST-COLLAPSE DRIFT over 1000 ms: ${mx.toFixed(4)} px (bar 0.5)`);
  await shot('l1-settled-after-shot1');
  L(`state ${JSON.stringify(await state())}`);
};
