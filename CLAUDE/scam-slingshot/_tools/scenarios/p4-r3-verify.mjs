/**
 * p4-r3-verify.mjs — self-check of every P4 criterion after the round-3 arrival rework.
 * Numbers only; the pictures are p4-r3-lead.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(2), h:+((1-(v.y*0.5+0.5))*100).toFixed(2) }; };
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z;
  const vw = () => vh()*cam.aspect;
  const liveExtents = () => { let right=-1e9, left=1e9, top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      const hw=(b.halfW||0.5), hh=(b.halfH||0.5);
      right=Math.max(right,t.x+hw); left=Math.min(left,t.x-hw); top=Math.max(top,t.y+hh); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); top=Math.max(top,t.y+0.9); }
    return { left:+left.toFixed(3), right:+right.toFixed(3), top:+top.toFixed(3) }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel();
    return { x:+t.x.toFixed(3), y:+t.y.toFixed(3), vx:+v.x.toFixed(3) }; };
`;
const SETUP = 'await SS.seed(3); await SS.seek(2600);';

export default async ({ page, game, state, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = {};

  // ---- 4: mid-flight lead, on a shot that HITS ------------------------------
  const FIRE = SETUP + ' SS.aim({angle:0.30, power:0.90}); await SS.seek(300); SS.release(); SS.freeze();';
  await g(FIRE);
  const flight = [];
  for (let t = 0; t <= 1200; t += 40) {
    flight.push({ t, ...(await g(`
      const p = proje(), e = liveExtents();
      const V = vw();
      return { px: p&&p.x, vx: p&&p.vx, projPctW: p ? proj(p.x,p.y).w : null,
               allStandingPctW: proj((e.left+e.right)/2, 1.5).w,
               struckTowerPctW: proj(18.0, 1.5).w, slingPctW: proj(0.75,1.5).w,
               vw:+V.toFixed(2), roll:+cam.quaternion.z.toFixed(8), mode: W.rig.mode,
               groundPctH: proj(0,0).h, blocks: W.blocks.filter(b=>!b.dead).length };`)) });
    if (t < 1200) await g('await SS.seek(40);');
  }
  M.flight = flight;
  let impact = flight.find((r, i) => i > 2 && flight[i-1].vx > r.vx + 3);
  impact = impact || flight.find(r => r.blocks < 13) || flight[11];
  M.impact = impact;
  M.didHit = flight.some(r => r.blocks < 13);
  if (!M.didHit) console.log('!! WARNING: the canonical shot did NOT hit on this run — lead numbers are for a flyover');
  const window = flight.filter(r => r.t >= 120 && r.t <= impact.t);
  M.leadWindow = { fromMs: 120, toMs: impact.t,
    projMin: Math.min(...window.map(r => r.projPctW)), projMax: Math.max(...window.map(r => r.projPctW)),
    struckMin: Math.min(...window.map(r => r.struckTowerPctW)), struckMax: Math.max(...window.map(r => r.struckTowerPctW)),
    allMin: Math.min(...window.map(r => r.allStandingPctW)), allMax: Math.max(...window.map(r => r.allStandingPctW)) };

  // ---- 2 & 3: the aim frame -------------------------------------------------
  await g(SETUP);
  M.aim = await g(`const e = liveExtents(); const s = W.sling.anchor;
    return { slingPctW: proj(s.x, s.y).w, furthestPctW: proj(e.right, 1.5).w,
             tallestPctH: proj((e.left+e.right)/2, e.top).h, groundPctH: proj(0, 0).h,
             vw:+vw().toFixed(3), camx:+cam.position.x.toFixed(3),
             roll:+cam.quaternion.z.toFixed(8), fov: cam.fov, aspect:+cam.aspect.toFixed(4) };`);
  M.aim.emptySkyPctH = +M.aim.tallestPctH.toFixed(2);

  // ---- 5: pull-back ---------------------------------------------------------
  const pull = [{ t: 'rest', vw: M.aim.vw }];
  for (const p of [0.25, 0.5, 0.75, 1.0]) {
    await g(`SS.aim({angle:0.55, power:args[0]}); await SS.seek(500);`, p);
    pull.push({ t: 'p' + p, vw: await g('return +vw().toFixed(3);') });
  }
  M.pullback = { samples: pull, growthPct: +(((pull[4].vw / pull[0].vw) - 1) * 100).toFixed(2) };
  await g(SETUP + ' SS.aim({angle:0.55, power:1.0}); await SS.seek(600);');
  const drawnVw = await g('return +vw().toFixed(3);');
  const rel = [];
  await g('SS.release(); SS.freeze();');
  for (let t = 0; t <= 900; t += 100) { rel.push({ t, vw: await g('return +vw().toFixed(3);') }); if (t < 900) await g('await SS.seek(100);'); }
  M.pullbackReturn = { restVw: M.aim.vw, drawnVw, afterRelease: rel,
    minAfterRelease: Math.min(...rel.map(r => r.vw)), returnedBelowRestByMs: (rel.find(r => r.vw <= M.aim.vw) || {}).t };

  // ---- 1: horizon under a pure X pan (ground line, world y=0) ---------------
  const inFlight = flight.filter(r => r.mode === 'follow');
  M.groundLine = { aim: M.aim.groundPctH, mid: flight.find(r => r.t === 400).groundPctH,
                   impact: impact.groundPctH,
                   flightMin: Math.min(...inFlight.map(r => r.groundPctH)),
                   flightMax: Math.max(...inFlight.map(r => r.groundPctH)),
                   maxDriftDuringFlightPctH: +(Math.max(...inFlight.map(r => Math.abs(r.groundPctH - M.aim.groundPctH)))).toFixed(3) };
  M.rollMax = Math.max(...flight.map(r => Math.abs(r.roll)));

  // ---- 6: shake + does the camera stop ---------------------------------------
  await g(FIRE);
  const settle = [];
  for (let t = 0; t <= 6000; t += 100) {
    settle.push({ t, ...(await g(`
      let asleep = 0, total = 0;
      for (const l of [W.blocks, W.debris]) for (const e of l) if (!e.dead) { total++; if (e.body.isSleeping()) asleep++; }
      return { camx:+cam.position.x.toFixed(4), camy:+cam.position.y.toFixed(4), camz:+cam.position.z.toFixed(4),
               shake:+(W.rig.shake||0).toFixed(4), mode: W.rig.mode, asleep, total };`)) });
    if (t < 6000) await g('await SS.seek(100);');
  }
  M.settleTrace = settle;
  // "all asleep" must mean AFTER the collapse, and must STAY asleep — the level starts asleep.
  let allAsleepAt = null;
  for (let i = 0; i < settle.length; i++) {
    if (settle[i].t < 800) continue;
    if (settle.slice(i).every(r => r.total > 0 && r.asleep === r.total)) { allAsleepAt = settle[i].t; break; }
  }
  // The camera's return to the sling for the NEXT shot is a new intent, not settle drift, so the
  // settle-stop measurement ends when the rig leaves 'settle'.
  const settleOnly = settle.filter(r => r.mode === 'settle');
  let lastMove = 0;
  for (let i = 1; i < settleOnly.length; i++) {
    const d = Math.abs(settleOnly[i].camx - settleOnly[i-1].camx) + Math.abs(settleOnly[i].camy - settleOnly[i-1].camy) + Math.abs(settleOnly[i].camz - settleOnly[i-1].camz);
    if (d > 0.004) lastMove = settleOnly[i].t;
  }
  M.stopping = { allBodiesAsleepMs: allAsleepAt, lastSettleMoveMs: lastMove,
                 settleEndsMs: settleOnly.length ? settleOnly[settleOnly.length-1].t : null,
                 marginMs: allAsleepAt === null ? null : allAsleepAt - lastMove };

  // ---- 7: survivors framed --------------------------------------------------
  M.survivors = await g(`const out = [];
    for (const v of W.villains) if (v.alive) { const t = v.body.translation(); const p = proj(t.x, t.y); out.push({ x:+t.x.toFixed(2), pctW:p.w, pctH:p.h }); }
    return { count: out.length, list: out, vw:+vw().toFixed(2) };`);

  // ---- 8: vertical edge drift ----------------------------------------------
  await g(SETUP);
  M.edgeDrift = await g(`const out = [];
    for (const x of [10, 14, 18, 22]) { const a = proj(x, 0.2), b = proj(x, 4.2);
      out.push({ x, pctW:a.w, angleDeg:+(Math.atan2(b.w-a.w, b.h-a.h)*180/Math.PI).toFixed(3) }); }
    const angs = out.map(o=>o.angleDeg);
    return { samples: out, driftDeg: +(Math.max(...angs)-Math.min(...angs)).toFixed(3) };`);

  M.errors = await g('return SS.errors.map(e=>e.text);');
  await writeFile(path.join(OUT, 'VERIFY.json'), JSON.stringify(M, null, 1));

  const R = [];
  R.push(`1 groundline  aim ${M.groundLine.aim} %H  during flight ${M.groundLine.flightMin}-${M.groundLine.flightMax} %H (drift ${M.groundLine.maxDriftDuringFlightPctH})  roll max ${M.rollMax}`);
  R.push(`2 sky above tallest  ${M.aim.emptySkyPctH} %H  (need >= 40)`);
  R.push(`3 aim  sling ${M.aim.slingPctW} %W (10-18)   furthest ${M.aim.furthestPctW} %W (82-92)`);
  R.push(`4 lead ${M.leadWindow.fromMs}-${M.leadWindow.toMs} ms  proj ${M.leadWindow.projMin}-${M.leadWindow.projMax} %W (55-75)`);
  R.push(`  struck tower ${M.leadWindow.struckMin}-${M.leadWindow.struckMax} %W   all-standing ${M.leadWindow.allMin}-${M.leadWindow.allMax} %W (40-60)`);
  R.push(`  AT IMPACT t=${M.impact.t}  proj ${M.impact.projPctW}  struckTower ${M.impact.struckTowerPctW}  allStanding ${M.impact.allStandingPctW}  sling ${M.impact.slingPctW}  vw ${M.impact.vw}`);
  R.push(`5 pullback +${M.pullback.growthPct} % (8-20)  rest ${M.pullbackReturn.restVw} drawn ${M.pullbackReturn.drawnVw} minAfterRelease ${M.pullbackReturn.minAfterRelease} backBelowRestAt ${M.pullbackReturn.returnedBelowRestByMs} ms`);
  R.push(`6 stop: all asleep ${M.stopping.allBodiesAsleepMs} ms, last SETTLE move ${M.stopping.lastSettleMoveMs} ms (settle ends ${M.stopping.settleEndsMs} ms), margin ${M.stopping.marginMs} ms`);
  R.push(`  shake peak ${Math.max(...M.settleTrace.map(r=>r.shake))}`);
  R.push(`7 survivors ${M.survivors.count}: ${JSON.stringify(M.survivors.list)}`);
  R.push(`8 vertical edge drift ${M.edgeDrift.driftDeg} deg (<= 3)   fov ${M.aim.fov}`);
  R.push(`errors ${JSON.stringify(M.errors)}`);
  console.log(R.join('\n'));
};
