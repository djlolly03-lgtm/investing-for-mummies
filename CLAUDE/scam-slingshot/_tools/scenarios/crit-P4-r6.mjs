/**
 * crit-P4-r6.mjs — INDEPENDENT CRITIC capture for P4 (Camera & composition), round 6.
 * Written from RUBRIC.md P4 only. Measures, it does not trust.
 *
 * Everything projected with the game's own camera. No hard-coded screen pixels (aimPx/dragShot only).
 */
const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x, y) => { const v = new V3(x, y, 0).project(cam);
    return { w: (v.x * .5 + .5) * 100, h: (1 - (v.y * .5 + .5)) * 100 }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  /** standing play-plane boxes with TRUE rotated half-extents */
  const boxes = () => {
    const out = [];
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const a = Math.atan2(2*(r.w*r.z + r.x*r.y), 1 - 2*(r.y*r.y + r.z*r.z));
      const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      out.push({ x:t.x, y:t.y, hw:(b.w*c + b.h*s)/2, hh:(b.w*s + b.h*c)/2, area:b.w*b.h, kind:'block' });
    }
    for (const v of W.villains) if (v.alive) {
      const t = v.body.translation();
      out.push({ x:t.x, y:t.y, hw:(v.radius||0.6), hh:(v.radius||0.6), area:4*(v.radius||0.6)**2, kind:'villain' });
    }
    return out;
  };
  const bbox = (bs) => bs.length ? {
    L: Math.min(...bs.map(b=>b.x-b.hw)), R: Math.max(...bs.map(b=>b.x+b.hw)),
    B: Math.min(...bs.map(b=>b.y-b.hh)), T: Math.max(...bs.map(b=>b.y+b.hh)),
  } : null;
  const areaMid = (bs) => bs.length ? bs.reduce((a,b)=>a+b.x*b.area,0)/bs.reduce((a,b)=>a+b.area,0) : null;
  /** contiguous clusters split on gaps > 0.6 world units */
  const clusters = () => {
    const bs = boxes().slice().sort((a,b)=>(a.x-a.hw)-(b.x-b.hw)); const out=[];
    for (const b of bs) { const L=b.x-b.hw, R=b.x+b.hw, last=out[out.length-1];
      if (last && L <= last.R + 0.6) { last.R=Math.max(last.R,R); last.n++; last.area+=b.area; last.xs.push(b); }
      else out.push({L,R,n:1,area:b.area,xs:[b]}); }
    return out;
  };
  const ball = () => { const p = (W.projectiles||[]).find(p=>p && p.body && !p.dead); if(!p) return null;
    const t = p.body.translation(), v = p.body.linvel(); return { x:t.x, y:t.y, vx:v.x, vy:v.y }; };
  const camSnap = () => ({ x:cam.position.x, y:cam.position.y, z:cam.position.z, fov:cam.fov,
    vw:vw(), vh:vh(), rot:[cam.rotation.x, cam.rotation.y, cam.rotation.z],
    up:[cam.up.x,cam.up.y,cam.up.z], quat:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w] });
`;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const W = (await page.viewport()).width, H = (await page.viewport()).height;
  const R = { viewport: { W, H } };
  const g = (body, ...a) => game(PRE + body, ...a);

  // ---------------------------------------------------------------- 1. AIM FRAME
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  R.aim = await g(`
    const s = W.sling, a = s.anchor || s.pouch;
    const bs = boxes(), bb = bbox(bs);
    const vills = W.villains.filter(v=>v.alive).map(v=>{ const t=v.body.translation();
      return { x:t.x, y:t.y, r:v.radius||0.6, pct: proj(t.x, t.y) }; });
    const tallest = bs.reduce((m,b)=> (b.y+b.hh) > (m.y+m.hh) ? b : m, bs[0]);
    return {
      cam: camSnap(),
      slingPctW: proj(a.x, a.y).w,
      slingWorld: { x:a.x, y:a.y },
      furthestTargetPctW: proj(bb.R, 1.5).w,
      furthestVillainPctW: Math.max(...vills.map(v=>v.pct.w)),
      standBox: bb,
      standBoxPct: { L: proj(bb.L,1.5).w, R: proj(bb.R,1.5).w, T: proj(bb.L,bb.T).h },
      tallestTopPctH: proj(tallest.x, tallest.y + tallest.hh).h,
      slingTopPctH: proj(a.x, a.y + 1.2).h,
      groundLinePctH: proj(bb.L, 0).h,
      villains: vills,
      // vertical-edge parallax: a 3-unit vertical world segment at frame centre vs frame edge
      edgeDrift: [-0.45, -0.3, 0, 0.3, 0.45].map(f => {
        const x = cam.position.x + f * vw();
        const p0 = proj(x, 0.2), p1 = proj(x, 3.2);
        return { fracW: f, screenAngleDeg: Math.atan2((p1.w-p0.w)*${W}/100, (p0.h-p1.h)*${H}/100) * 180/Math.PI };
      }),
      state: await SS.state(),
    };
  `);
  R.aimShot = await shot('aim-establishing');

  // ---------------------------------------------------------------- 2. DRAG PULL-BACK
  const pull = [];
  for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
    await dragShot(0.30, p, { steps: 6 });
    await game('await SS.seek(400);');            // let the spring arrive
    pull.push({ power: p, ...(await g('return { vw: vw(), camx: cam.position.x, camz: cam.position.z };')) });
  }
  R.pullBackShot = await shot('drag-full-stretch');
  // eased? sample the transient from rest -> full
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  const restVw = (await g('return vw();'));
  await dragShot(0.30, 1.0, { steps: 10 });
  const ease = [];
  for (let t = 0; t <= 600; t += 50) { ease.push({ t, vw: await g('return vw();') }); await game('await SS.seek(50);'); }
  R.pullBack = { restVw, pull, ease };

  // release, then check the width returns
  await game('SS.release();');
  await game('await SS.seek(6000);');
  let ph = (await state()).phase, guard = 0;
  while (ph === 'flying' || ph === 'settling') { await game('await SS.seek(500);'); ph = (await state()).phase; if (++guard > 40) break; }
  R.pullBack.afterReleaseVw = await g('return vw();');

  // ---------------------------------------------------------------- 3. FLIGHT LEAD (canonical shot)
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  const rel = await game('return SS.release();');
  const track = [];
  let contactT = null;
  await g(`W.__firstHit = null;
    const B = W.blocks[0] && W.blocks[0].constructor;
    if (B && !B.__critPatched) { const o = B.prototype.onImpact; B.prototype.onImpact = function(info){
      if (W.__firstHit === null && info && (info.tag === 'ammo' || info.src === 'ammo' || (info.other && String(info.other.tag).includes('ammo')))) W.__firstHit = W.simTime;
      return o.apply(this, arguments); }; B.__critPatched = true; }
    return true;`).catch(()=>{});
  for (let t = 0; t <= 1600; t += 20) {
    const row = await g(`
      const b = ball(); const bs = boxes(); const bb = bbox(bs); const cl = clusters();
      const big = cl.length ? cl.reduce((m,c)=> c.area > m.area ? c : m, cl[0]) : null;
      return { t: ${t}, cam: camSnap(), ball: b, ballPct: b ? proj(b.x, b.y) : null,
        allMidPctW: bb ? proj((bb.L+bb.R)/2, 1.5).w : null,
        areaMidPctW: bs.length ? proj(areaMid(bs), 1.5).w : null,
        struckMidPctW: big ? proj((big.L+big.R)/2, 1.5).w : null,
        standLPctW: bb ? proj(bb.L,1.5).w : null, standRPctW: bb ? proj(bb.R,1.5).w : null,
        debris: W.debris.length, standing: bs.filter(b=>b.kind==='block').length,
        firstHit: W.__firstHit };
    `);
    track.push(row);
    if (row.firstHit != null && contactT === null) contactT = t;
    if (t < 1600) await game('await SS.seek(20);');
  }
  R.flight = { rel, contactT, track };
  await fs.writeFile(path.join(OUT, 'FLIGHT.json'), JSON.stringify(R.flight, null, 2));

  // flight filmstrip (fresh run, same shot)
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release();');
  await filmstrip('flight-lead', { from: 0, to: 900, step: 75, cols: 4 });

  // ---------------------------------------------------------------- 4. IMPACT + SETTLE QUIET
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release();');
  await game('await SS.seek(600);');
  const quiet = [];
  for (let t = 600; t <= 9000; t += 100) {
    quiet.push(await g(`const st = await SS.state();
      return { t:${t}, cam: camSnap(), asleep: st.bodiesAsleep, bodies: st.bodies, phase: st.phase };`));
    await game('await SS.seek(100);');
  }
  R.quiet = quiet;
  R.settleShot = await shot('settled-framing');
  R.settleFrame = await g(`
    const bs = boxes(), bb = bbox(bs);
    const vills = W.villains.map(v=>{ const t=v.body.translation();
      return { alive:v.alive, x:t.x, y:t.y, pct: proj(t.x,t.y), r:v.radius||0.6,
               leftPct: proj(t.x-(v.radius||0.6), t.y).w, rightPct: proj(t.x+(v.radius||0.6), t.y).w,
               topPct: proj(t.x, t.y+(v.radius||0.6)).h, botPct: proj(t.x, t.y-(v.radius||0.6)).h }; });
    return { cam: camSnap(), villains: vills, standBoxPct: bb ? { L: proj(bb.L,1.5).w, R: proj(bb.R,1.5).w } : null,
             state: await SS.state() };
  `);

  // ---------------------------------------------------------------- 5. A SHOT THAT LEAVES A VILLAIN ALIVE
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.52, 0.55, { steps: 10 });
  await game('SS.release(); await SS.seek(9000);');
  R.survivor = await g(`
    const vills = W.villains.map(v=>{ const t=v.body.translation();
      return { alive:v.alive, x:t.x, y:t.y, pct: proj(t.x,t.y),
               leftPct: proj(t.x-(v.radius||0.6), t.y).w, rightPct: proj(t.x+(v.radius||0.6), t.y).w,
               topPct: proj(t.x, t.y+(v.radius||0.6)).h, botPct: proj(t.x, t.y-(v.radius||0.6)).h }; });
    return { cam: camSnap(), villains: vills, state: await SS.state() };
  `);
  R.survivorShot = await shot('settle-villain-alive');

  // ---------------------------------------------------------------- 6. IMPACT SHAKE FILMSTRIP
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release();');
  await filmstrip('impact-and-settle', { from: 400, to: 2200, step: 150, cols: 4 });
  await game('await SS.seek(4000);');
  await filmstrip('settle-tail', { from: 0, to: 2700, step: 300, cols: 5 });

  await fs.writeFile(path.join(OUT, 'P4.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify({
    fov: R.aim.cam.fov, rot: R.aim.cam.rot, up: R.aim.cam.up,
    slingPctW: R.aim.slingPctW.toFixed(2),
    furthestTargetPctW: R.aim.furthestTargetPctW.toFixed(2),
    tallestTopPctH: R.aim.tallestTopPctH.toFixed(2),
    groundLinePctH: R.aim.groundLinePctH.toFixed(2),
    edgeDrift: R.aim.edgeDrift.map(e=>e.screenAngleDeg.toFixed(3)),
    pull: R.pullBack.pull.map(p=>`${p.power}:${p.vw.toFixed(2)}`),
    afterReleaseVw: R.pullBack.afterReleaseVw.toFixed(2),
    contactT: R.flight.contactT,
  }, null, 2));
};
