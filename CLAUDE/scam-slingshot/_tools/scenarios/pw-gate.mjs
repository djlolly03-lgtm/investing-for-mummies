/**
 * pw-gate.mjs — PW's INSTRUMENT (weight & gravity). Numbers only; the verdict is the critic's.
 *
 * Five measurements, all of them "does this thing have mass":
 *   1. MASS CENSUS   — what every object in l1 weighs, and which one is heaviest.
 *   2. DROP RIG      — the same 0.90 cube from the same height at the same tilt, in wood,
 *                      glass and stone, plus a villain dropped from the same height.
 *                      Landing speed, rebound, bounces, slide, spin decay, rest, sleep.
 *                      GATE: the three rows must not be interchangeable.
 *   3. MASS RATIO    — identical stone anvil, identical drop, three hammers. A heavy hammer
 *                      must drive the anvil; a light one must not.
 *   4. DEBRIS FLOAT  — after a real l1 shot: time-to-rest per material, and how many
 *                      fragments are still drifting at fixed times. GATE: nothing crawls.
 *   5. ARC WEIGHT    — hang time, apex height and apex fraction across three draws, so a
 *                      gravity change (or the refusal to make one) is an argued number.
 *
 * Every level load is followed by SS.freeze(): loadLevel() leaves the rAF loop running on
 * the wall clock, and on a DROP RIG two puppeteer round trips is the whole fall.
 */

import { INSTALL, START, CUT, DUMP, MASSES, tracks, dropMetrics, table, ms } from './pw-probe.mjs';

const SHOT = [0.30, 0.90];
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

export default async ({ game, state }) => {
  const out = [];
  const say = (s = '') => { out.push(s); console.log(s); };
  await game(INSTALL);

  // ---------------------------------------------------------------- 1. census
  await game('return await SS.loadLevel("l1");');
  await game('return await SS.seed(4242);');
  const census = await game(MASSES);
  say('=== 1. MASS CENSUS (l1) ===');
  const byMat = {};
  for (const c of census) (byMat[c.mat] ??= []).push(c);
  for (const [m, list] of Object.entries(byMat)) {
    const d = list.map(c => c.mass / c.vol);
    say(`  ${m.padEnd(8)} n=${String(list.length).padStart(2)}  mass ` +
        `${Math.min(...list.map(c => c.mass)).toFixed(3)}–${Math.max(...list.map(c => c.mass)).toFixed(3)} kg` +
        `   density ${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(3)}`);
  }
  const hv = census.reduce((a, b) => a.mass > b.mass ? a : b);
  const lt = census.reduce((a, b) => a.mass < b.mass ? a : b);
  say(`  HEAVIEST OBJECT ON SCREEN: ${hv.mat} ${hv.mass} kg      lightest: ${lt.mat} ${lt.mass} kg   spread ${(hv.mass / lt.mass).toFixed(2)}x`);
  say('');

  // ---------------------------------------------------------------- 2. drop rig
  await game('return SS.freeze();');          // before the load — see pw-look.mjs's rig()
  await game(CUT(1));
  await game('return await SS.loadLevel("_pw-drop");');
  await game('return SS.freeze();');
  await game(START);
  await game('return await SS.seek(3200);');
  const rows = await game(DUMP);
  const all = tracks(rows);
  const dm = all.filter(t => t.kind !== 'D').map(dropMetrics).sort((a, b) => a.mass - b.mass);
  say('=== 2. DROP RIG — same cube, 1.02 m of fall, 0.60 rad tilt, all three survive ===');
  say(table(dm, [
    { h: 'material', w: 9, k: 'mat' }, { h: 'kg', w: 6, k: 'mass' },
    { h: 'landMs', w: 7, k: 'landMs' }, { h: 'hitV', w: 6, k: 'hitV' },
    { h: 'COR', w: 6, k: 'cor' }, { h: 'nB', w: 3, k: 'bounces' },
    { h: 'slideM', w: 7, k: 'slideM' }, { h: 'wPeak', w: 6, k: 'wPeak' },
    { h: 'spinMs', w: 7, k: 'spinMs' }, { h: 'restMs', w: 7, k: 'restMs' },
    { h: 'sleepMs', w: 8, k: 'sleepMs' },
  ]));
  const blk = dm.filter(r => r.kind === 'B');
  const spread = (key) => {
    const v = blk.map(r => r[key] ?? 0), lo = Math.min(...v), hi = Math.max(...v);
    return { lo, hi, x: lo === 0 ? (hi === 0 ? 1 : Infinity) : hi / lo, d: hi - lo };
  };
  for (const k of ['cor', 'slideM', 'spinDeg', 'spinMs', 'restMs', 'sleepMs']) {
    const s = spread(k);
    say(`  SEPARATION ${k.padEnd(8)} ${String(s.lo).padStart(7)} .. ${String(s.hi).padStart(7)}   ` +
        `ratio ${s.x === Infinity ? 'inf' : s.x.toFixed(2) + 'x'}   delta ${(+s.d.toFixed(3))}`);
  }
  const dbg = all.filter(t => t.kind === 'D');
  say(`  fragments spawned by the landing: ${dbg.length}` +
      (dbg.length ? ` (${[...new Set(dbg.map(d => d.mat))].join(',')})` : ''));
  say('');

  // ---------------------------------------------------------------- 2b. topple rig
  await game('return SS.freeze();');
  await game(CUT(1));
  await game('return await SS.loadLevel("_pw-topple");');
  await game('return SS.freeze();');
  await game(START);
  await game('return await SS.seek(3200);');
  const trows = tracks(await game(DUMP)).filter(t => t.kind === 'B');
  const tm = trows.map(dropMetrics).sort((a, b) => a.mass - b.mass);
  say('=== 2b. TOPPLE RIG — same 0.44 x 1.80 column, same 0.35 rad lean, past tipping ===');
  say('  LOW-ENERGY CONTROL, and it is expected to separate weakly: a column pivots about its');
  say('  base and lands along its length, so the centre of mass arrives at 1.5-1.8 m/s and there');
  say('  is almost nothing for restitution or friction to act on. Read section 2, not this one,');
  say('  for the material spread; this one exists to show that the spread is energy-dependent.');
  say(table(tm, [
    { h: 'material', w: 9, k: 'mat' }, { h: 'kg', w: 6, k: 'mass' },
    { h: 'landMs', w: 7, k: 'landMs' }, { h: 'hitV', w: 6, k: 'hitV' },
    { h: 'COR', w: 6, k: 'cor' }, { h: 'nB', w: 3, k: 'bounces' },
    { h: 'slideM', w: 7, k: 'slideM' }, { h: 'wPeak', w: 6, k: 'wPeak' },
    { h: 'spin°', w: 6, k: 'spinDeg' }, { h: 'spinMs', w: 7, k: 'spinMs' },
    { h: 'restMs', w: 7, k: 'restMs' }, { h: 'sleepMs', w: 8, k: 'sleepMs' },
  ]));
  for (const k of ['cor', 'slideM', 'spinDeg', 'restMs', 'sleepMs']) {
    const v = tm.map(r => r[k] ?? 0), lo = Math.min(...v), hi = Math.max(...v);
    say(`  SEPARATION ${k.padEnd(8)} ${String(lo).padStart(7)} .. ${String(hi).padStart(7)}   ` +
        `ratio ${lo === 0 ? (hi === 0 ? '1.00x' : 'inf') : (hi / lo).toFixed(2) + 'x'}`);
  }
  say('');

  // ---------------------------------------------------------------- 3. mass ratio
  await game('return SS.freeze();');
  await game(CUT(1));
  await game('return await SS.loadLevel("_pw-mass");');
  await game('return SS.freeze();');
  const rig = await game(`return SS.__world.blocks.map(b=>({id:b.id, mat:b.matName,
     x:+b.body.translation().x.toFixed(2), y:+b.body.translation().y.toFixed(2), m:+b.body.mass().toFixed(3)}));`);
  await game(START);
  await game('return await SS.seek(2500);');
  const mtr = tracks(await game(DUMP));
  say('=== 3. MASS RATIO — identical free-standing wood column, identical 0.55 m drop ===');
  say('  "a heavy block landing on a light one drives it; a light one does not"');
  const mr = [];
  for (const cx of [9.0, 13.0, 17.0]) {
    const col = rig.find(b => Math.abs(b.x - cx) < 0.4 && b.y < 2);
    const ham = rig.find(b => Math.abs(b.x - (cx + 0.3)) < 0.4 && b.y > 3);
    const ct = mtr.find(t => t.id === col?.id), ht = mtr.find(t => t.id === ham?.id);
    if (!ct || !ht) { say(`  x=${cx}: column or hammer destroyed before it could be measured`); continue; }
    const hitV = Math.abs(Math.min(...ht.s.map(p => p.vy)));
    let pkW = 0, pkV = 0;
    for (const p of ct.s) { pkW = Math.max(pkW, Math.abs(p.az)); pkV = Math.max(pkV, Math.hypot(p.vx, p.vy)); }
    const last = ct.s[ct.s.length - 1];
    mr.push({
      hammer: ham.mat, hkg: ham.m, tkg: col.m, ratio: +(ham.m / col.m).toFixed(2),
      hamHitV: +hitV.toFixed(2), colPeakV: +pkV.toFixed(2), colPeakW: +pkW.toFixed(2),
      colDx: +(last.x - ct.s[0].x).toFixed(2), colDy: +(last.y - ct.s[0].y).toFixed(2),
      fell: last.y < ct.s[0].y - 0.6 ? 'YES' : 'no',
    });
  }
  say(table(mr, [
    { h: 'hammer', w: 7, k: 'hammer' }, { h: 'ham kg', w: 8, k: 'hkg' }, { h: 'col kg', w: 8, k: 'tkg' },
    { h: 'm ratio', w: 8, k: 'ratio' }, { h: 'ham hitV', w: 9, k: 'hamHitV' },
    { h: 'col pkV', w: 8, k: 'colPeakV' }, { h: 'col pkW', w: 8, k: 'colPeakW' },
    { h: 'col dx', w: 7, k: 'colDx' }, { h: 'col dy', w: 7, k: 'colDy' }, { h: 'toppled', w: 8, k: 'fell' },
  ]));
  if (mr.length >= 2) {
    const lo = mr.reduce((a, b) => a.hkg < b.hkg ? a : b), hi = mr.reduce((a, b) => a.hkg > b.hkg ? a : b);
    say(`  DRIVE SPREAD: ${hi.hammer} (${hi.hkg} kg) vs ${lo.hammer} (${lo.hkg} kg) — mass ratio ` +
        `${(hi.hkg / lo.hkg).toFixed(2)}x, peak column speed ratio ${(hi.colPeakV / (lo.colPeakV || 1e-6)).toFixed(2)}x, ` +
        `spin ratio ${(hi.colPeakW / (lo.colPeakW || 1e-6)).toFixed(2)}x`);
  }
  say('');

  // ---------------------------------------------------------------- 4. debris float
  await game('window.__PW.cut = 0; return true;');
  await game('return await SS.loadLevel("l1");');
  await game('return await SS.seed(4242);');
  await game('return SS.aimAndFire(args[0], args[1]);', SHOT[0], SHOT[1]);
  await game(START);
  await game('return await SS.seek(6000);');
  const drows = await game(DUMP);
  const deb = tracks(drows).filter(t => t.kind === 'D');
  say(`=== 4. DEBRIS: FLOAT, TRAVEL AND BALLISTIC FIDELITY — l1, shot ${SHOT.join('@')} ===`);
  const G = 9.81 * 2.4, DT = 1 / 120;
  const lives = deb.map(d => {
    const n = d.s.length; let iRest = 0;
    for (let i = n - 1; i >= 0; i--) {
      if (Math.hypot(d.s[i].vx, d.s[i].vy) >= 0.25) { iRest = Math.min(i + 1, n - 1); break; }
    }
    // BALLISTIC FIDELITY: while a fragment is airborne and not in contact, its vertical
    // acceleration must be -g. Linear damping is the only thing that can bend it, so the
    // median of |dvy| / (g*dt) over the free-flight steps is a direct read on how floaty
    // the debris is. 1.00 = a real parabola. The old flat 0.42 of damping put this at ~0.9
    // on a fast chip and much lower on a slow one, which is exactly what "drifts" looks like.
    const rat = [];
    for (let i = 1; i < n; i++) {
      const sp = Math.hypot(d.s[i].vx, d.s[i].vy);
      if (sp < 1.5) continue;                       // too slow to be flying
      const dvy = d.s[i].vy - d.s[i - 1].vy;
      if (dvy > 0) continue;                        // a bounce, not free flight
      rat.push(Math.abs(dvy) / (G * DT));
    }
    rat.sort((a, b) => a - b);
    return { mat: d.mat, mass: d.mass, restMs: ms(d.s[iRest].i - d.first),
      travel: Math.abs(d.s[n - 1].x - d.s[0].x),
      ball: rat.length ? rat[rat.length >> 1] : null };
  });
  for (const m of ['wood', 'glass', 'stone']) {
    const g = lives.filter(l => l.mat === m);
    if (!g.length) { say(`  ${m.padEnd(6)} none`); continue; }
    const b = g.map(x => x.ball).filter(x => x != null);
    say(`  ${m.padEnd(6)} n=${String(g.length).padStart(3)}  piece ${med(g.map(x => x.mass)).toFixed(3)} kg  ` +
        `rest median ${String(med(g.map(x => x.restMs))).padStart(4)}ms worst ${String(Math.max(...g.map(x => x.restMs))).padStart(4)}ms  ` +
        `travel median ${med(g.map(x => x.travel)).toFixed(2)} m max ${Math.max(...g.map(x => x.travel)).toFixed(2)} m  ` +
        `ballistic ${b.length ? med(b).toFixed(3) : '—'}`);
  }
  say(`  ALL    n=${String(lives.length).padStart(3)}  rest median ${med(lives.map(x => x.restMs))}ms  worst ${Math.max(...lives.map(x => x.restMs), 0)}ms`);
  for (const t of [800, 1500, 2500, 4000]) {
    const i = Math.round(t / (1000 / 120));
    let crawl = 0, air = 0, tot = 0;
    for (const d of deb) {
      const p = d.s.find(q => q.i === i); if (!p) continue;
      if (d.first > i - 60) continue;              // born in the last half second: still a real arc
      tot++;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 0.25 && sp < 2.2) crawl++;
      if (sp > 0.25 && p.y > 1.2) air++;
    }
    say(`  t=${String(t).padStart(4)}ms  fragments older than 500 ms: ${String(tot).padStart(3)}  ` +
        `CRAWLING(0.25–2.2 m/s) ${String(crawl).padStart(3)} (${tot ? Math.round(100 * crawl / tot) : 0}%)  airborne&moving ${air}`);
  }
  say('');

  // ---------------------------------------------------------------- 5. arc weight
  say('=== 5. ARC WEIGHT ===');
  say(`  gravity ${(await game('return SS.__physics.world.gravity.y;')).toFixed(3)} m/s^2  ` +
      `(GRAVITY_SCALE x ${(Math.abs(await game('return SS.__physics.world.gravity.y;')) / 9.81).toFixed(2)})`);
  for (const [ang, pow] of [[0.30, 0.60], [0.30, 0.90], [0.55, 1.00]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return await SS.seed(4242);');
    await game('return SS.aim({angle: args[0], power: args[1]});', ang, pow);
    const rel = await game('return SS.release();');
    const path = [];
    for (let t = 0; t <= 4000; t += 25) {
      if (t) await game('await SS.seek(25);');
      const p = await game(`const p = SS.__world.projectiles.find(q=>!q.dead && q.launched);
        if (!p) return null; const tr = p.body.translation(), v = p.body.linvel();
        return { x:tr.x, y:tr.y, vx:v.x, vy:v.y, hit:p.hasHit };`);
      if (!p) break;
      path.push({ t, ...p });
      if (p.hit) break;
    }
    if (!path.length) { say(`  ${ang}@${pow}: no flight captured`); continue; }
    const apex = path.reduce((a, b) => a.y > b.y ? a : b, path[0]);
    const last = path[path.length - 1];
    say(`  ${ang}@${pow}  exit ${(rel.speed ?? 0).toFixed(2)} m/s  hang ${String(last.t).padStart(4)}ms  ` +
        `rise ${(apex.y - path[0].y).toFixed(2)} m  apex@${(apex.t / Math.max(last.t, 1)).toFixed(2)} of flight  ` +
        `range ${(last.x - path[0].x).toFixed(2)} m  land x ${last.x.toFixed(2)}  impact ${Math.hypot(last.vx, last.vy).toFixed(2)} m/s`);
  }
  say('');
  await game('return await SS.loadLevel("l1");');
  const st = await state();
  say(`state after: phase=${st.phase} blocks=${st.blocks}`);
  return out.join('\n');
};
