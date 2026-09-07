/**
 * crit-P3-r5.mjs — INDEPENDENT CRITIC capture for P3 (Destruction & structures), round 5.
 *
 * Written by the critic, not the builder. Every millisecond criterion is timed from the TRUE
 * first ammo->block contact (Block.onImpact patch), never from a velocity heuristic — see
 * ORCHESTRATOR-NOTES finding 2.
 *
 * camLock IS used for the material shard close-ups (P3 explicitly allows it for geometry
 * criteria). Every composition/collapse frame is shot UNLOCKED at the game's own framing.
 */

// True-first-contact instrument (source must be the ammo).
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
if (!B.__critPatched) {
  B.__critPatched = true;
  const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__critHit == null) {
      window.__critHit = { tick: SS.tick(), x: pt?.x, y: pt?.y, mat: this.matName };
    }
    return oi.call(this, imp, other, pt, app);
  };
}
window.__critHit = null; return true;`;

// One census of everything on the play plane, plus live particle counts per pool.
const CENSUS = `
const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
const V3 = cam.position.constructor;
const proj = (x, y) => { const v = new V3(x, y, 0).project(cam);
  return { px: (v.x*0.5+0.5)*r.width, py: (-v.y*0.5+0.5)*r.height }; };
const rowOf = (e, kind) => { const t = e.body.translation(), q = e.body.rotation(), v = e.body.linvel();
  const p = proj(t.x, t.y);
  return { kind, id: e.id, mat: e.matName, x: t.x, y: t.y, w: e.w, h: e.h,
    a: Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)), vx: v.x, vy: v.y,
    sp: Math.hypot(v.x, v.y), px: p.px, py: p.py, sleeping: e.body.isSleeping(),
    vis: e.mesh ? e.mesh.visible : null };
};
const pools = {}; for (const k in w.fx.pools) pools[k] = w.fx.pools[k].live;
// pixels per world metre, measured on the camera actually in use
const p0 = proj(18, 0), p1 = proj(19, 0);
return {
  tick: SS.tick(),
  blocks: w.blocks.filter(b=>!b.dead).map(b=>rowOf(b,'block')),
  debris: w.debris.filter(d=>!d.dead).map(d=>rowOf(d,'debris')),
  pools, pxPerM: Math.abs(p1.px - p0.px), vw: r.width, vh: r.height,
};`;

const px2 = (a, b) => Math.hypot(a.px - b.px, a.py - b.py);

const halfX = (r) => (Math.abs(Math.cos(r.a)) * r.w + Math.abs(Math.sin(r.a)) * r.h) / 2;
const halfY = (r) => (Math.abs(Math.sin(r.a)) * r.w + Math.abs(Math.cos(r.a)) * r.h) / 2;

/** % of surviving blocks whose rotated AABB is within `tol` metres of another block's, both axes. */
function touchPct(blocks, tol = 0.12) {
  if (blocks.length < 2) return 100;
  let n = 0;
  for (const a of blocks) {
    const hit = blocks.some(b => b.id !== a.id &&
      Math.abs(a.x - b.x) <= halfX(a) + halfX(b) + tol &&
      Math.abs(a.y - b.y) <= halfY(a) + halfY(b) + tol);
    if (hit) n++;
  }
  return 100 * n / blocks.length;
}

/** Worst overlap (metres of AABB interpenetration) between any two settled bodies. */
function worstOverlap(rows) {
  let worst = 0, pair = null;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    const ox = halfX(a) + halfX(b) - Math.abs(a.x - b.x);
    const oy = halfY(a) + halfY(b) - Math.abs(a.y - b.y);
    const o = Math.min(ox, oy);
    if (o > worst) { worst = o; pair = `${a.kind}${a.id}(${a.mat}) vs ${b.kind}${b.id}(${b.mat})`; }
  }
  return { worst, pair };
}

export default async ({ shot, filmstrip, game, state }) => {
  const L = (...a) => console.log(...a);

  // =========================================================================
  // A. REST STABILITY — the hard bar. seek(3000), diff t=2000 vs t=3000.
  // =========================================================================
  L('\n########## A. STABLE AT REST (l1, untouched) ##########');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(9001);');
  await game('await SS.seek(2000);');
  const rest2 = await game(CENSUS);
  await game('await SS.seek(1000);');
  const rest3 = await game(CENSUS);

  const by2 = new Map(rest2.blocks.map(b => [b.id, b]));
  let maxPx = 0, maxWho = '', maxRot = 0;
  for (const b of rest3.blocks) {
    const a = by2.get(b.id); if (!a) continue;
    const d = px2(a, b);
    if (d > maxPx) { maxPx = d; maxWho = `${b.mat} @(${b.x.toFixed(2)},${b.y.toFixed(2)})`; }
    maxRot = Math.max(maxRot, Math.abs(b.a - a.a));
  }
  L(`blocks=${rest3.blocks.length} pxPerM=${rest3.pxPerM.toFixed(2)} (${rest3.vw}x${rest3.vh} css px)`);
  L(`REST DRIFT t=2000 -> t=3000: max ${maxPx.toFixed(4)} px  (${maxWho})  maxRot ${maxRot.toFixed(5)} rad`);
  L(`REST asleep: ${rest3.blocks.filter(b => b.sleeping).length}/${rest3.blocks.length}`);
  const ro = worstOverlap(rest3.blocks);
  L(`REST worst interpenetration: ${(ro.worst * rest3.pxPerM).toFixed(2)} px (${ro.worst.toFixed(4)} m) ${ro.pair ?? ''}`);
  L(`REST verdict: ${maxPx <= 0.5 ? 'PASS' : 'FAIL'} (bar: <= 0.5 px)`);
  await shot('l1-rest-establishing');

  // Same on the all-glass probe (the rubric's "glass pyramid must sit dead still").
  L('\n--- rest, all-glass probe column ---');
  await game('return await SS.loadLevel("_p3-glass");');
  await game('return SS.seed(9001);');
  await game('await SS.seek(2000);');
  const g2 = await game(CENSUS);
  await game('await SS.seek(1000);');
  const g3 = await game(CENSUS);
  const gby = new Map(g2.blocks.map(b => [b.id, b]));
  let gmax = 0;
  for (const b of g3.blocks) { const a = gby.get(b.id); if (a) gmax = Math.max(gmax, px2(a, b)); }
  L(`glass probe rest drift: ${gmax.toFixed(4)} px over 1000 ms, asleep ${g3.blocks.filter(b=>b.sleeping).length}/${g3.blocks.length}`);

  // =========================================================================
  // B. THE HIT — impact instant, flash lifetime, dust rules, chain collapse.
  // =========================================================================
  L('\n########## B. IMPACT + COLLAPSE on l1 (0.30 @ 0.90) ##########');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  const before = await game(CENSUS);
  L(`pre-shot: ${before.blocks.length} blocks, pools ${JSON.stringify(before.pools)}`);
  await game('return SS.aimAndFire(0.30, 0.90);');

  // walk to the TRUE first ammo->block contact
  let t = 0, hit = null;
  while (t < 5000) {
    await game('await SS.seek(20);'); t += 20;
    hit = await game('return window.__critHit;');
    if (hit) break;
  }
  L(`TRUE first ammo contact at fire+${t} ms, on ${hit?.mat} at (${hit?.x?.toFixed(2)}, ${hit?.y?.toFixed(2)})`);

  // Particle census on a fine ladder from contact, so "flash gone within 150 ms" is a number.
  let seen = 0;
  const ladder = [0, 20, 40, 60, 80, 100, 120, 150, 200, 300, 400, 600, 800, 1200, 1600, 2400];
  const trace = [];
  for (const at of ladder) {
    if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
    const c = await game(CENSUS);
    const moving = c.blocks.filter(b => b.sp > 0.35).length;
    trace.push({ at, c });
    L(` hit+${String(at).padStart(4)} blk=${String(c.blocks.length).padStart(2)} deb=${String(c.debris.length).padStart(3)}` +
      ` moving=${String(moving).padStart(2)} touch%=${touchPct(c.blocks).toFixed(0).padStart(3)}` +
      `  flash=${c.pools.flash} smoke=${c.pools.smoke} wood=${c.pools.wood} glass=${c.pools.glass} stone=${c.pools.stone} chip=${c.pools.chip}`);
  }

  // structure coherence at contact+300 ms (rubric: >= 60 % of survivors still touching)
  const at300 = trace.find(r => r.at === 300).c;
  L(`\nCOHERENCE at hit+300 ms: ${touchPct(at300.blocks).toFixed(1)} % of ${at300.blocks.length} surviving blocks still in contact (bar: >= 60 %)`);

  // debris size distribution vs BW at hit+600
  const at600 = trace.find(r => r.at === 600).c;
  const BW = 0.90;   // standard single block width on l1 (the stone/glass cubes)
  const sizes = at600.debris.map(d => Math.max(d.w, d.h) / BW).sort((a, b) => b - a);
  L(`DEBRIS at hit+600: n=${sizes.length}; longest dim / BW  max=${sizes[0]?.toFixed(2)} med=${sizes[Math.floor(sizes.length/2)]?.toFixed(2)} min=${sizes.at(-1)?.toFixed(2)};` +
    ` below 1/6 BW: ${sizes.filter(s => s < 1/6).length}`);
  const byMat = {};
  for (const d of at600.debris) byMat[d.mat] = (byMat[d.mat] ?? 0) + 1;
  L(`DEBRIS by material: ${JSON.stringify(byMat)}`);

  // rewind and shoot the real pictures
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(0.30, 0.90);');
  let t2 = 0;
  while (t2 < 5000) { await game('await SS.seek(20);'); t2 += 20; if (await game('return window.__critHit;')) break; }
  await filmstrip('impact-first-240ms-from-true-contact', { from: 0, to: 240, step: 30, cols: 3 });
  await filmstrip('collapse-to-1600ms', { from: 0, to: 1400, step: 200, cols: 4 });
  await game('await SS.seek(3000);');
  await shot('l1-settled-gameframing');
  const settled = await game(CENSUS);
  const so = worstOverlap([...settled.blocks, ...settled.debris]);
  L(`\nSETTLED: ${settled.blocks.length} blocks + ${settled.debris.length} debris; ` +
    `worst interpenetration ${(so.worst * settled.pxPerM).toFixed(2)} px (${so.worst.toFixed(3)} m) ${so.pair ?? ''}`);
  L(`SETTLED awake bodies: ${[...settled.blocks, ...settled.debris].filter(b => !b.sleeping).length}`);
  L(`SETTLED state: ${JSON.stringify(await state())}`);

  // camLock a close read of the settled wreckage (geometry criterion — allowed)
  const heap = settled.debris.length
    ? { x: settled.debris.reduce((s, d) => s + d.x, 0) / settled.debris.length,
        y: settled.debris.reduce((s, d) => s + d.y, 0) / settled.debris.length }
    : { x: 18, y: 1.5 };
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 4.2});', heap.x, heap.y);
  await game('await SS.seek(33);');
  await shot('l1-settled-CAMLOCK-closeread');
  await game('return SS.camUnlock();');

  // =========================================================================
  // C. ONE BREAK PER MATERIAL — shard silhouette + dust rules, camLocked.
  // =========================================================================
  for (const m of ['wood', 'glass', 'stone']) {
    L(`\n########## C. ${m.toUpperCase()} break ##########`);
    await game('return await SS.loadLevel(args[0]);', `_p3-${m}`);
    await game('return SS.seed(777);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    const b0 = await game(CENSUS);
    await game('return SS.aimAndFire(0.22, 0.85);');
    let tm = 0, h = null;
    while (tm < 5000) { await game('await SS.seek(20);'); tm += 20; h = await game('return window.__critHit;'); if (h) break; }
    L(`${m}: true contact at fire+${tm} ms on ${h?.mat}`);
    let s2 = 0, peakSmoke = 0, peakFlash = 0;
    for (const at of [0, 40, 80, 120, 160, 200, 300, 400, 600, 900]) {
      if (at > s2) { await game('await SS.seek(args[0]);', at - s2); s2 = at; }
      const c = await game(CENSUS);
      peakSmoke = Math.max(peakSmoke, c.pools.smoke); peakFlash = Math.max(peakFlash, c.pools.flash);
      L(` +${String(at).padStart(3)} blk=${c.blocks.length} deb=${String(c.debris.length).padStart(2)}` +
        ` flash=${c.pools.flash} smoke=${c.pools.smoke} ${m}pool=${c.pools[m]} chip=${c.pools.chip}`);
    }
    L(`${m}: PEAK smoke sprites = ${peakSmoke} (wood/glass bar: 0), peak flash = ${peakFlash}`);
    const cN = await game(CENSUS);
    const parent = b0.blocks;
    L(`${m}: parent blocks ${parent.length} -> surviving ${cN.blocks.length}, debris ${cN.debris.length}`);
    const spread = cN.debris.map(d => Math.max(d.w, d.h));
    L(`${m}: debris longest-dim m: [${spread.map(s => s.toFixed(2)).join(', ')}]`);
    if (cN.debris.length) {
      const cx = cN.debris.reduce((s, d) => s + d.x, 0) / cN.debris.length;
      const cy = cN.debris.reduce((s, d) => s + d.y, 0) / cN.debris.length;
      await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 2.6});', cx, cy);
      await game('await SS.seek(33);');
      await shot(`${m}-shards-CAMLOCK`);
      await game('return SS.camUnlock();');
    }
  }

  // =========================================================================
  // D. A SECOND l1 SHOT — chain collapse, staggered puffs.
  // =========================================================================
  L('\n########## D. chain collapse strip (0.26 @ 0.95) ##########');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(0.26, 0.95);');
  let t3 = 0;
  while (t3 < 5000) { await game('await SS.seek(20);'); t3 += 20; if (await game('return window.__critHit;')) break; }
  await filmstrip('chain-collapse-60ms', { from: 0, to: 660, step: 60, cols: 4 });
  await game('await SS.seek(4000);');
  await shot('l1-shot2-settled');
  L(`shot2 state: ${JSON.stringify(await state())}`);
};
