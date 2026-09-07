/**
 * crit-P4-r7.mjs — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 7.
 *
 * Written from RUBRIC.md P4 alone. Every number is projected with the GAME'S OWN camera or
 * read off the rendered pixels. No hard-coded screen pixels (aimPx/dragShot only).
 * No camLock anywhere: composition is judged at the game's own framing.
 */
const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x, y) => { const v = new V3(x, y, 0).project(cam);
    return { w: (v.x * .5 + .5) * 100, h: (1 - (v.y * .5 + .5)) * 100 }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  const boxes = () => {
    const out = [];
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const a = Math.atan2(2*(r.w*r.z + r.x*r.y), 1 - 2*(r.y*r.y + r.z*r.z));
      const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      out.push({ x:t.x, y:t.y, hw:(b.w*c + b.h*s)/2, hh:(b.w*s + b.h*c)/2, area:b.w*b.h, kind:'block' });
    }
    for (const v of W.villains) if (v.alive) {
      const t = v.body.translation(); const r = v.radius || 0.6;
      out.push({ x:t.x, y:t.y, hw:r, hh:r, area:4*r*r, kind:'villain' });
    }
    return out;
  };
  const bbox = (bs) => bs.length ? {
    L: Math.min(...bs.map(b=>b.x-b.hw)), R: Math.max(...bs.map(b=>b.x+b.hw)),
    B: Math.min(...bs.map(b=>b.y-b.hh)), T: Math.max(...bs.map(b=>b.y+b.hh)),
  } : null;
  const areaMid = (bs) => bs.length ? bs.reduce((a,b)=>a+b.x*b.area,0)/bs.reduce((a,b)=>a+b.area,0) : null;
  const ball = () => { const p = (W.projectiles||[]).find(p=>p && p.body && !p.dead); if(!p) return null;
    const t = p.body.translation(), v = p.body.linvel(); return { x:t.x, y:t.y, vx:v.x, vy:v.y }; };
  const camSnap = () => ({ x:cam.position.x, y:cam.position.y, z:cam.position.z, fov:cam.fov,
    vw:vw(), vh:vh(), rot:[cam.rotation.x, cam.rotation.y, cam.rotation.z],
    up:[cam.up.x,cam.up.y,cam.up.z], quat:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w] });
`;

const SHOT_A = 0.30, SHOT_P = 0.90;   // the canonical l1 clearing shot

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const VP = await page.viewport();
  const R = { viewport: VP };
  const g = (body, ...a) => game(PRE + body, ...a);
  const reset = async () => { await game('SS.freeze(); await SS.restart(); SS.seed(11); await SS.seek(2500);'); };

  // ================================================================ 1. AIM / ESTABLISHING
  await game('SS.freeze(); await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2500);');
  R.aim = await g(`
    const s = W.sling, a = s.anchor || s.pouch;
    const bs = boxes(), bb = bbox(bs);
    const tallest = bs.reduce((m,b)=> (b.y+b.hh) > (m.y+m.hh) ? b : m, bs[0]);
    const vills = W.villains.filter(v=>v.alive).map(v=>{ const t=v.body.translation();
      const r = v.radius||0.6;
      return { x:t.x, y:t.y, r, c:proj(t.x,t.y),
               L:proj(t.x-r,t.y).w, Rr:proj(t.x+r,t.y).w, T:proj(t.x,t.y+r).h, B:proj(t.x,t.y-r).h }; });
    return {
      cam: camSnap(), aspect: cam.aspect,
      slingPctW: proj(a.x, a.y).w, slingWorld: { x:a.x, y:a.y },
      slingForkTopPctH: proj(a.x, a.y + 1.0).h,
      standBox: bb,
      standLPctW: proj(bb.L, 1.5).w, standRPctW: proj(bb.R, 1.5).w,
      furthestTargetPctW: Math.max(proj(bb.R,1.5).w, ...vills.map(v=>v.Rr)),
      tallestTopPctH: proj(tallest.x, tallest.y + tallest.hh).h,
      tallestWorldTop: tallest.y + tallest.hh,
      groundLinePctH: proj(bb.L, 0).h,
      villains: vills,
      edgeDrift: [-0.45,-0.3,0,0.3,0.45].map(f => {
        const x = cam.position.x + f * vw();
        const p0 = proj(x, 0.2), p1 = proj(x, 3.2);
        return { fracW:f, deg: Math.atan2((p1.w-p0.w)*${VP.width}/100, (p0.h-p1.h)*${VP.height}/100)*180/Math.PI };
      }),
      state: await SS.state(),
    };
  `);
  R.aimShot = await shot('aim-establishing');

  // ================================================================ 2. PULL-BACK ON DRAG
  const pull = [];
  const restVw = await g('return vw();');
  for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
    await reset();
    await dragShot(SHOT_A, p, { steps: 8 });
    await game('await SS.seek(600);');
    pull.push({ power: p, ...(await g('return { vw: vw(), camx: cam.position.x, camy: cam.position.y, camz: cam.position.z };')) });
  }
  await reset();
  await dragShot(SHOT_A, 1.0, { steps: 10 });
  R.pullShot = await shot('drag-full-stretch');
  const ease = [];
  for (let t = 0; t <= 700; t += 50) { ease.push({ t, vw: await g('return vw();') }); await game('await SS.seek(50);'); }
  R.pullBack = { restVw, pull, ease };

  // does it come back after release?
  await reset();
  const preVw = await g('return vw();');
  await dragShot(SHOT_A, 1.0, { steps: 10 });
  const drawnVw = await g('return vw();');
  await game('SS.release(); await SS.seek(9000);');
  let guard = 0, ph = (await state()).phase;
  while ((ph === 'flying' || ph === 'settling') && guard++ < 30) { await game('await SS.seek(500);'); ph = (await state()).phase; }
  R.pullBack.preVw = preVw; R.pullBack.drawnVw = drawnVw;
  R.pullBack.afterVw = await g('return vw();');

  // ================================================================ 3. FLIGHT LEAD
  await reset();
  const relD = await dragShot(SHOT_A, SHOT_P, { steps: 10 });
  const rel = await game('return SS.release();');
  await g(`W.__firstHit = null;
    const B = W.blocks[0] && W.blocks[0].constructor;
    if (B && !B.__critP4r7) { const o = B.prototype.onImpact; B.prototype.onImpact = function(info){
      if (W.__firstHit === null && info && (info.tag === 'ammo' || info.src === 'ammo' ||
          (info.other && String(info.other.tag).includes('ammo')))) W.__firstHit = W.simTime;
      return o.apply(this, arguments); }; B.__critP4r7 = true; }
    return true;`).catch(()=>{});
  const track = [];
  for (let t = 0; t <= 1800; t += 20) {
    track.push(await g(`
      const b = ball(); const bs = boxes(); const bb = bbox(bs);
      return { t:${t}, cam: camSnap(), ball: b, ballPctW: b ? proj(b.x,b.y).w : null,
        ballPctH: b ? proj(b.x,b.y).h : null,
        allMidPctW: bb ? proj((bb.L+bb.R)/2, 1.5).w : null,
        areaMidPctW: bs.length ? proj(areaMid(bs),1.5).w : null,
        standLPctW: bb ? proj(bb.L,1.5).w : null, standRPctW: bb ? proj(bb.R,1.5).w : null,
        debris: W.debris.length, standing: bs.filter(x=>x.kind==='block').length,
        firstHit: W.__firstHit, simTime: W.simTime };
    `));
    if (t < 1800) await game('await SS.seek(20);');
  }
  R.flight = { rel, relD, track };
  await fs.writeFile(path.join(OUT, 'FLIGHT.json'), JSON.stringify(R.flight, null, 2));

  // flight filmstrip + per-frame stills for pixel horizon during the pan
  await reset();
  await dragShot(SHOT_A, SHOT_P, { steps: 10 });
  await game('SS.release();');
  await filmstrip('flight-lead', { from: 0, to: 900, step: 75, cols: 4 });

  R.panFrames = [];
  await reset();
  await dragShot(SHOT_A, SHOT_P, { steps: 10 });
  await game('SS.release();');
  for (let i = 0; i <= 6; i++) {
    const c = await g('return camSnap();');
    const f = path.join(OUT, `pan-${String(i).padStart(2,'0')}.png`);
    await page.screenshot({ path: f });
    R.panFrames.push({ i, t: i * 120, file: path.basename(f), cam: c });
    await game('await SS.seek(120);');
  }

  // ================================================================ 4. SHAKE / QUIET (per-solver-step)
  await reset();
  await dragShot(SHOT_A, SHOT_P, { steps: 10 });
  await game('SS.release();');
  // walk to first ammo contact
  await g(`W.__firstHit = null; return true;`);
  let hitT = null;
  for (let t = 0; t <= 2000; t += 20) {
    const h = await g('return W.__firstHit;');
    if (h != null) { hitT = t; break; }
    await game('await SS.seek(20);');
  }
  // fine per-step camera trace across the impact + 4s
  R.shakeTrace = await g(`
    const rows = []; const N = 520;                     // ~4.3 s at 1/120
    for (let i = 0; i < N; i++) {
      rows.push([ +W.simTime.toFixed(4), cam.position.x, cam.position.y, cam.position.z,
                  cam.rotation.z, cam.quaternion.x, cam.quaternion.y, cam.quaternion.z ]);
      SS.stepOnce();
    }
    return rows;
  `);
  R.hitT = hitT;
  // settle quiet: sleep vs camera motion
  const quiet = [];
  for (let t = 0; t <= 8000; t += 100) {
    quiet.push(await g(`const st = await SS.state();
      return { t:${t}, cam: camSnap(), asleep: st.bodiesAsleep, bodies: st.bodies, phase: st.phase };`));
    await game('await SS.seek(100);');
  }
  R.quiet = quiet;
  R.settleShot = await shot('settled-framing');
  R.settleFrame = await g(`
    const bs = boxes(), bb = bbox(bs);
    const vills = W.villains.map(v=>{ const t=v.body.translation(); const r=v.radius||0.6;
      return { alive:v.alive, x:t.x, y:t.y, c:proj(t.x,t.y),
               L:proj(t.x-r,t.y).w, Rr:proj(t.x+r,t.y).w, T:proj(t.x,t.y+r).h, B:proj(t.x,t.y-r).h }; });
    return { cam: camSnap(), villains: vills,
             standPct: bb ? { L: proj(bb.L,1.5).w, R: proj(bb.R,1.5).w } : null, state: await SS.state() };
  `);
  await filmstrip('settle-tail', { from: 0, to: 2700, step: 300, cols: 5 });

  // ================================================================ 5. SURVIVOR AUTO-FRAME
  await reset();
  await dragShot(0.52, 0.55, { steps: 10 });
  await game('SS.release(); await SS.seek(10000);');
  R.survivor = await g(`
    const vills = W.villains.map(v=>{ const t=v.body.translation(); const r=v.radius||0.6;
      return { alive:v.alive, x:t.x, y:t.y, c:proj(t.x,t.y),
               L:proj(t.x-r,t.y).w, Rr:proj(t.x+r,t.y).w, T:proj(t.x,t.y+r).h, B:proj(t.x,t.y-r).h }; });
    return { cam: camSnap(), villains: vills, state: await SS.state() };
  `);
  R.survivorShot = await shot('settle-villain-alive');

  await fs.writeFile(path.join(OUT, 'P4.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify({
    fov: R.aim.cam.fov, rotZ: R.aim.cam.rot[2], up: R.aim.cam.up,
    slingPctW: +R.aim.slingPctW.toFixed(2),
    furthestTargetPctW: +R.aim.furthestTargetPctW.toFixed(2),
    tallestTopPctH: +R.aim.tallestTopPctH.toFixed(2),
    groundLinePctH: +R.aim.groundLinePctH.toFixed(2),
    edgeDrift: R.aim.edgeDrift.map(e => +e.deg.toFixed(3)),
    restVw: +R.pullBack.restVw.toFixed(3),
    pull: R.pullBack.pull.map(p => `${p.power}:${p.vw.toFixed(2)}`),
    drawnVw: +R.pullBack.drawnVw.toFixed(3), afterVw: +R.pullBack.afterVw.toFixed(3),
    hitT: R.hitT,
  }, null, 2));
};
