/**
 * crit-P3-r7.mjs — INDEPENDENT CRITIC, P3 (destruction & materials), round 7.
 *
 * Nothing here trusts a builder claim. Every number comes from either the running game's own
 * objects or from pixels. Timing is taken from the REAL ammo contact (ORCHESTRATOR-NOTES r5 §2:
 * the "a block moved" detector trips up to 900 ms early), and every filmstrip is seeked, never
 * wall-clocked.
 *
 * What it measures, criterion by criterion:
 *   A  fragment COUNT and SIZE per fracture            (rubric: 4-8 pieces, each >= 1/6 BW)
 *   B  smoke discipline per material                   (wood 0 smoke, glass 0 smoke; stone yes)
 *   C  flash lifetime after a break                    (gone within 150 ms)
 *   D  the debris cone: biggest lowest, smallest highest/furthest
 *   E  rest stability, in SCREEN PIXELS                (t=2000 vs t=3000, <= 0.5 px)
 *   F  settled wreckage: floaters, interpenetration, piece-size census
 *   G  the money frames, at the game's own framing, for the blind A/B
 */

const BLOCK_CENSUS = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>({
  id:b.id, m:b.matName, w:b.w, h:b.h }));`;

/** Wrap fracture + the three fx entry points. Records EVERYTHING with a tick stamp. */
const INSTRUMENT = `
const B  = SS.__world.blocks[0].constructor.prototype;
const FX = SS.__world.fx;
window.__F = [];         // fractures: {tick, mat, w, h, imp, kids:[{w,h}]}
window.__S = [];         // fx.smoke calls
window.__L = [];         // fx.flash calls
window.__B = [];         // fx.burst calls
window.__hit = null;     // tick of first ammo->block contact
if (!B.__critP3r7) {
  B.__critP3r7 = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other && other.tag === 'ammo' && app >= 1.2 && window.__hit === null) window.__hit = SS.tick();
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) {
    const m = this.matName, w = this.w, h = this.h, t = SS.tick();
    const kids = of.call(this, imp, pt);
    window.__F.push({ tick:t, mat:m, w, h, imp,
      kids: kids.map(k => ({ w:k.w, h:k.h })) });
    return kids;
  };
}
if (!FX.__critP3r7) {
  FX.__critP3r7 = true;
  const os = FX.smoke, ol = FX.flash, ob = FX.burst;
  FX.smoke = function (at, size, n, kind, o) {
    window.__S.push({ tick: SS.tick(), size, n, kind: kind ?? 'stone',
      x: at && at.x, y: at && at.y });
    return os.call(this, at, size, n, kind, o);
  };
  FX.flash = function (at, size, o) {
    window.__L.push({ tick: SS.tick(), size, x: at && at.x, y: at && at.y });
    return ol.call(this, at, size, o);
  };
  FX.burst = function (name, at, n, o) {
    window.__B.push({ tick: SS.tick(), name, n });
    return ob.call(this, name, at, n, o);
  };
}
return true;`;

const RESET_LOG = `window.__F=[]; window.__S=[]; window.__L=[]; window.__B=[]; window.__hit=null; return true;`;

const POOLS = `const p = SS.__world.fx.pools; const o = {};
for (const k of Object.keys(p)) { let n = 0; const L = p[k].p.life;
  for (let i=0;i<L.length;i++) if (L[i] > 0) n++; o[k] = n; }
return o;`;

/** Every live rigid body that matters, with its screen projection. */
const SCREEN = `const w = SS.__world, cam = w.camera;
const r = w.renderer.domElement.getBoundingClientRect();
const V3 = cam.position.constructor;
const rows = [];
const push = (tag, id, b, ww, hh, mat) => {
  const t = b.translation(), q = b.rotation();
  const v = new V3(t.x, t.y, 0).project(cam);
  rows.push({ tag, id, mat, w:ww, h:hh, x:t.x, y:t.y,
    a: Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)),
    px: r.left + (v.x*0.5+0.5)*r.width, py: r.top + (-v.y*0.5+0.5)*r.height,
    vx: b.linvel().x, vy: b.linvel().y, sleeping: b.isSleeping() });
};
for (const b of w.blocks)  if (!b.dead) push('block', b.id, b.body, b.w, b.h, b.matName);
for (const d of w.debris)  if (!d.dead) push('debris', d.id, d.body, d.w, d.h, d.matName);
for (const v of w.villains) if (!v.dead) push('villain', v.id, v.body, 0.9, 0.9, 'villain');
return rows;`;

async function loadAndArm(game, lvl, seed) {
  await game('return SS.freeze();');
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game(RESET_LOG);
}

/** Fire and walk forward in 20 ms slices until the AMMO actually touches a block. */
async function fireToContact(game, ang, pow, cap = 6000) {
  const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
  if (!r.ok) throw new Error('fire failed: ' + r.reason);
  let t = 0;
  while (t < cap) {
    await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__hit !== null;')) return t;
  }
  return null;
}

/** Same, but stop at the first FRACTURE (the probe levels are a single column). */
async function fireToFracture(game, ang, pow, cap = 6000) {
  const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
  if (!r.ok) throw new Error('fire failed: ' + r.reason);
  let t = 0;
  while (t < cap) {
    await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__F.length;')) return t;
  }
  return null;
}

const med = (a) => { if (!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); const h=s.length>>1;
  return s.length%2 ? s[h] : (s[h-1]+s[h])/2; };

export default async ({ shot, filmstrip, game, state, OUT }) => {
  const L = (...a) => console.log(...a);
  const REPORT = {};

  // ===================================================================== A + D + G
  L('\n########## A/D/G — l1 collapse: fragments, cone, money frames ##########');
  await loadAndArm(game, 'l1', 4242);
  const census = await game(BLOCK_CENSUS);
  const BW = med(census.map(b => Math.max(b.w, b.h)));
  const BWmin = med(census.map(b => Math.min(b.w, b.h)));
  L(`l1 census ${census.length} blocks; BW(long) median ${BW.toFixed(2)} m, short ${BWmin.toFixed(2)} m`);
  L(`  materials: ${JSON.stringify(census.reduce((o,b)=>(o[b.m]=(o[b.m]??0)+1,o),{}))}`);

  const c1 = await fireToContact(game, 0.22, 0.96);
  L(`first AMMO contact at fire+${c1} ms`);

  // impact + early collapse at the GAME's own framing (this is the blind-A/B candidate)
  await filmstrip('l1-impact-0-600', { from: 0, to: 600, step: 40, cols: 4 });
  const poolsMid = await game(POOLS);
  await filmstrip('l1-chain-600-1800', { from: 0, to: 1200, step: 100, cols: 4 });

  // the cone, measured at contact+300 (re-run cleanly so the seek ladder is exact)
  await loadAndArm(game, 'l1', 4242);
  await fireToContact(game, 0.22, 0.96);
  await game('await SS.seek(300);');
  const cone = await game(SCREEN);
  const air = cone.filter(r => r.tag === 'debris' && r.y > 0.6);
  const fr300 = await game('return window.__F;');
  L(`\n-- D. CONE at contact+300ms: ${air.length} airborne fragments`);
  if (air.length >= 5) {
    const areas = air.map(r => r.w * r.h);
    const ys = air.map(r => r.y);
    const impactX = fr300.length ? null : null;
    // rank correlation area vs height
    const rank = (v) => { const idx = v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]);
      const r = new Array(v.length); idx.forEach(([,i],k)=>r[i]=k); return r; };
    const ra = rank(areas), ry = rank(ys);
    const n = air.length;
    let d2 = 0; for (let i=0;i<n;i++) d2 += (ra[i]-ry[i])**2;
    const rho = 1 - 6*d2/(n*(n*n-1));
    const bigY = med(air.filter(r=>r.w*r.h >= med(areas)).map(r=>r.y));
    const smlY = med(air.filter(r=>r.w*r.h <  med(areas)).map(r=>r.y));
    L(`  spearman rho(area, height) = ${rho.toFixed(2)}  (want NEGATIVE: big pieces low)`);
    L(`  median height  BIG half ${bigY.toFixed(2)} m   SMALL half ${smlY.toFixed(2)} m`);
    REPORT.coneRho = rho; REPORT.bigY = bigY; REPORT.smlY = smlY;
  }

  // let it settle, then census the wreckage
  let guard = 0;
  while (guard++ < 40) { const s = await state();
    if (s.phase !== 'flying' && s.phase !== 'settling') break; await game('await SS.seek(400);'); }
  await game('await SS.seek(2000);');
  await shot('l1-settled-gameframing');
  const settled = await game(SCREEN);
  const F = await game('return window.__F;');
  const S = await game('return window.__S;');
  const Lg = await game('return window.__L;');
  const Bg = await game('return window.__B;');

  // ---- A. fragment count + size
  L(`\n-- A. FRACTURES on this shot: ${F.length}`);
  const counts = [], relSizes = [];
  for (const f of F) {
    const ks = f.kids.map(k => Math.max(k.w, k.h));
    counts.push(f.kids.length);
    for (const k of ks) relSizes.push(k / BW);
    L(`   ${f.mat.padEnd(5)} ${f.w.toFixed(2)}x${f.h.toFixed(2)} imp=${f.imp.toFixed(1)}  ` +
      `${f.kids.length} pieces  maxdim/BW: [${ks.map(v=>(v/BW).toFixed(2)).join(' ')}]`);
  }
  const tiny = relSizes.filter(v => v < 1/6).length;
  L(`   COUNT per fracture: ${JSON.stringify(counts)}  (rubric 4-8)`);
  L(`   PIECES below 1/6 BW: ${tiny}/${relSizes.length}  (rubric: none)`);
  REPORT.counts = counts; REPORT.tiny = `${tiny}/${relSizes.length}`;

  // ---- F. settled wreckage audit
  const deb = settled.filter(r => r.tag === 'debris');
  const all = settled;
  const corners = (r) => { const ca=Math.abs(Math.cos(r.a)), sa=Math.abs(Math.sin(r.a));
    const hw=(r.w*ca+r.h*sa)/2, hh=(r.w*sa+r.h*ca)/2;
    return { x0:r.x-hw, x1:r.x+hw, y0:r.y-hh, y1:r.y+hh }; };
  let floaters = 0, worstPen = 0, penPairs = 0;
  for (const d of deb) {
    const e = corners(d);
    if (e.y0 <= 0.08) continue;                 // resting on the ground
    let supported = false;
    for (const o of all) { if (o === d) continue;
      const f = corners(o);
      const ox = Math.min(e.x1,f.x1) - Math.max(e.x0,f.x0);
      const oy = Math.min(e.y1,f.y1) - Math.max(e.y0,f.y0);
      if (ox > 0 && oy > -0.10) { supported = true; break; } }
    if (!supported) floaters++;
  }
  for (let i=0;i<all.length;i++) for (let j=i+1;j<all.length;j++) {
    const e = corners(all[i]), f = corners(all[j]);
    const ox = Math.min(e.x1,f.x1) - Math.max(e.x0,f.x0);
    const oy = Math.min(e.y1,f.y1) - Math.max(e.y0,f.y0);
    const pen = Math.min(ox, oy);
    if (pen > 0.14) { penPairs++; worstPen = Math.max(worstPen, pen); }
  }
  const sizes = deb.map(d => Math.max(d.w,d.h)/BW);
  L(`\n-- F. SETTLED: ${deb.length} debris, ${settled.filter(r=>r.tag==='block').length} blocks left`);
  L(`   floaters (no ground, no neighbour): ${floaters}`);
  L(`   AABB interpenetration pairs > 0.14 m: ${penPairs}   worst ${worstPen.toFixed(2)} m`);
  L(`   debris maxdim/BW  min ${Math.min(...sizes).toFixed(2)}  med ${med(sizes).toFixed(2)}  max ${Math.max(...sizes).toFixed(2)}`);
  L(`   below 1/6 BW: ${sizes.filter(v=>v<1/6).length}/${sizes.length}`);
  REPORT.floaters = floaters; REPORT.penPairs = penPairs; REPORT.debrisN = deb.length;

  L(`\n-- fx on this shot: smoke ${S.length} calls, flash ${Lg.length}, bursts ${Bg.length}`);
  L(`   smoke: ${JSON.stringify(S.map(s=>({t:s.tick,k:s.kind,sz:+s.size.toFixed(2),n:s.n})))}`);
  L(`   pools live at impact strip end: ${JSON.stringify(poolsMid)}`);

  // ===================================================================== B + C
  L('\n########## B/C — per-material break: smoke discipline + flash lifetime ##########');
  for (const [lvl, mat] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    await loadAndArm(game, lvl, 777);
    const t = await fireToFracture(game, 0.16, 0.88);
    if (t === null) { L(`${mat}: NO FRACTURE — skipped`); continue; }
    const brk = await game('return window.__F[0];');
    const tick0 = brk.tick;
    // walk 20ms at a time for 600ms, sampling pool occupancy
    const trace = [];
    for (let k = 0; k <= 30; k++) {
      const p = await game(POOLS);
      trace.push({ ms: k*20, smoke: p.smoke, flash: p.flash,
        chips: (p[mat] ?? 0), spark4: p.spark4 });
      await game('await SS.seek(20);');
    }
    const S2 = await game('return window.__S;');
    const L2 = await game('return window.__L;');
    const B2 = await game('return window.__B;');
    const F2 = await game('return window.__F;');
    const maxSmoke = Math.max(...trace.map(r=>r.smoke));
    const lastFlash = trace.filter(r=>r.flash>0).map(r=>r.ms).pop();
    const firstFlash = trace.find(r=>r.flash>0);
    const chipEnd = trace.filter(r=>r.chips>0).map(r=>r.ms).pop();
    L(`\n${mat.toUpperCase()}  first fracture fire+${t} ms  (${F2.length} fractures, ${F2[0].kids.length} pieces)`);
    L(`   smoke CALLS ${S2.length} ${JSON.stringify(S2.map(s=>s.kind))}   peak live smoke sprites ${maxSmoke}`);
    L(`   flash calls ${L2.length}   flash sprites live from ${firstFlash?firstFlash.ms:'-'} to ${lastFlash ?? '-'} ms after fracture`);
    L(`   bursts ${JSON.stringify(B2.map(b=>b.name+':'+b.n))}`);
    L(`   ${mat} chips live until +${chipEnd ?? 0} ms`);
    L(`   trace ${trace.filter((_,i)=>i%2===0).map(r=>`${r.ms}:s${r.smoke}/f${r.flash}/c${r.chips}`).join(' ')}`);
    REPORT['smoke_'+mat] = maxSmoke;
    REPORT['flashEnd_'+mat] = lastFlash;

    // one camLocked look at the burst itself
    await loadAndArm(game, lvl, 777);
    await fireToFracture(game, 0.16, 0.88);
    const c = await game(`const d = SS.__world.debris.filter(x=>!x.dead);
      if (!d.length) return null; let sx=0, sy=0;
      for (const x of d) { const t = x.body.translation(); sx+=t.x; sy+=t.y; }
      return { n:d.length, cx:sx/d.length, cy:sy/d.length };`);
    if (c) {
      await game('return SS.camLock({x:args[0], y:args[1], halfWidth:2.4});', c.cx, c.cy + 0.3);
      await filmstrip(`${mat}-break-CAMLOCK-0-400`, { from: 0, to: 400, step: 50, cols: 3 });
      await game('return SS.camUnlock();');
    }
  }

  // ===================================================================== E
  L('\n########## E — REST STABILITY on an untouched l1, in screen pixels ##########');
  await game('return SS.freeze();');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(2000);');
  const r2 = await game(SCREEN);
  const st2 = await state();
  await game('await SS.seek(1000);');
  const r3 = await game(SCREEN);
  const st3 = await state();
  const by = new Map(r2.map(r => [r.tag + r.id, r]));
  let maxPx = 0, who = '';
  for (const r of r3) { const a = by.get(r.tag + r.id); if (!a) continue;
    const d = Math.hypot(r.px - a.px, r.py - a.py);
    if (d > maxPx) { maxPx = d; who = `${r.tag}#${r.id} ${r.mat}`; } }
  L(`   max SCREEN movement t=2000 -> t=3000: ${maxPx.toFixed(4)} px  (${who})  [rubric <= 0.5]`);
  L(`   asleep ${st2.bodiesAsleep}/${st2.bodies} -> ${st3.bodiesAsleep}/${st3.bodies}`);
  const lowest = Math.min(...r3.filter(r=>r.tag!=='villain').map(r=>r.y - Math.max(r.w,r.h)/2));
  L(`   lowest block bottom edge: ${lowest.toFixed(3)} m (want >= -0.02, no sinking)`);
  REPORT.restPx = maxPx; REPORT.asleep = `${st3.bodiesAsleep}/${st3.bodies}`;
  await shot('l1-at-rest');

  // ===================================================================== G
  L('\n########## G — money frames ##########');
  await loadAndArm(game, 'l1', 4242);
  await fireToContact(game, 0.22, 0.96);
  await game('await SS.seek(260);');
  await game('return SS.__render();');
  await shot('l1-t260-MONEY');
  await game('await SS.seek(140);');
  await game('return SS.__render();');
  await shot('l1-t400-MONEY');
  await game('await SS.seek(200);');
  await game('return SS.__render();');
  await shot('l1-t600-MONEY');
  await game('await SS.seek(300);');
  await game('return SS.__render();');
  await shot('l1-t900-MONEY');

  L('\n===== REPORT =====\n' + JSON.stringify(REPORT, null, 2));
};
