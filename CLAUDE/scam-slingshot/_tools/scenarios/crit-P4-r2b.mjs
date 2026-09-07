/**
 * crit-P4-r2b.mjs — P4 round 2, part B. Same critic, now on a shot that actually CONNECTS
 * (a=0.45 p=0.80 clears l1), so the lead / shake / settle criteria are measured on a real impact.
 *
 * Also: pixel-space horizon under a pure X pan (camera translated in x with nothing else changed).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z;
  const vw = () => vh()*cam.aspect;
  const camI = () => ({ x:+cam.position.x.toFixed(4), y:+cam.position.y.toFixed(4), z:+cam.position.z.toFixed(4),
      fov:+cam.fov.toFixed(3), vw:+vw().toFixed(4), vh:+vh().toFixed(4), roll:+cam.quaternion.z.toFixed(8) });
  const liveExtents = () => { let right=-1e9, left=1e9, top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      right=Math.max(right,t.x+(b.halfW||0.5)); left=Math.min(left,t.x-(b.halfW||0.5)); top=Math.max(top,t.y+(b.halfH||0.5)); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); top=Math.max(top,t.y+0.9); }
    return { left:+left.toFixed(3), right:+right.toFixed(3), top:+top.toFixed(3) }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel();
    return { x:+t.x.toFixed(3), y:+t.y.toFixed(3), vx:+v.x.toFixed(3), vy:+v.y.toFixed(3) }; };
  const towerC = () => { // centre of the ORIGINAL structure, from the authored level, so it is
    let s=0,n=0; for (const b of W.level.blocks){ s+=b.x; n++; } return n? s/n : 19; };
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = { note: 'P4 r2 part B — measured on a CONNECTING shot (a=0.45 p=0.80, clears l1)' };
  const g = (body, ...a) => game(PRE + body, ...a);

  const an = await page.browser().newPage();
  await an.setContent('<canvas id="c"></canvas>');
  const analyze = async (file, code) => {
    const b64 = (await readFile(file)).toString('base64');
    return an.evaluate(async (src, codeStr) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = (x, y) => { const i = (((y | 0) * d.width) + (x | 0)) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
      const lum = (x, y) => { const p = px(x, y); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
      return new Function('px', 'lum', 'W', 'H', codeStr)(px, lum, d.width, d.height);
    }, 'data:image/png;base64,' + b64, code);
  };

  // The sky/land boundary as PIXELS: scanning DOWN a column, the first y where the pixel stops
  // being sky-blue (b > r by a wide margin) for 6 consecutive rows.
  const SKYEDGE = `
    const out = [];
    for (const fx of [0.05, 0.30, 0.55, 0.80, 0.95]) {
      const x = Math.min(W-1, Math.round(W*fx));
      let hit = null;
      for (let y = 2; y < H-8; y++) {
        let ok = true;
        for (let k = 0; k < 6; k++) { const p = px(x, y+k); if (p[2] - p[0] > 24) { ok = false; break; } }
        if (ok) { hit = y; break; }
      }
      out.push({ pctW: fx*100, skyEndsPctH: hit === null ? null : +(hit/H*100).toFixed(2) });
    }
    return out;`;
  const skyEdge = (f) => analyze(f, SKYEDGE);

  const hideHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u => u.style.visibility = 'hidden');
  });
  const showHud = () => page.evaluate(() => {
    document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u => u.style.visibility = '');
  });

  const SETUP = 'await SS.seed(7); await SS.seek(2600);';
  const FIRE = SETUP + ' SS.aim({angle:0.45, power:0.80}); await SS.seek(500); SS.release();';

  // ---------- A. horizon under a pure X pan (aim frame vs late-flight frame) ----------
  await g(SETUP);
  await hideHud();
  const fAim = await shot('pan-a-aim');
  M.panA = { cam: await g('return camI();'), sky: await skyEdge(fAim) };
  await g(FIRE + ' await SS.seek(700);');
  const fPan = await shot('pan-b-flight');
  M.panB = { cam: await g('return camI();'), sky: await skyEdge(fPan) };
  await showHud();

  // ---------- B. lead, measured only while the projectile is still SHORT of the tower ----------
  await g(FIRE);
  const flight = [];
  for (let t = 0; t <= 1400; t += 50) {
    flight.push({ t, ...(await g(`
      const p = proje(); const tc = towerC();
      const st = proj(tc, 1.6);
      return { pw: p ? proj(p.x,p.y).w : null, ph: p ? proj(p.x,p.y).h : null,
               px_: p && p.x, vx: p && p.vx, towerX: +tc.toFixed(2), towerPctW: st.w,
               camx:+cam.position.x.toFixed(3), vw:+vw().toFixed(3), roll:+cam.quaternion.z.toFixed(8),
               blocksAlive: W.blocks.filter(b=>!b.dead).length };`)) });
    if (t < 1400) await g('await SS.seek(50);');
  }
  M.flight = flight;

  await g(FIRE);
  await hideHud();
  await filmstrip('lead-hit', { from: 100, to: 1000, step: 100, cols: 5 });
  await showHud();

  // the single best "camera leads" still: last tile before contact
  const preHit = flight.filter(f => f.blocksAlive === flight[0].blocksAlive && f.pw !== null);
  const bestT = preHit.length ? preHit[preHit.length - 1].t : 600;
  M.bestLeadT = bestT;
  await g(FIRE + ` await SS.seek(${bestT});`);
  await hideHud();
  await shot('lead-still-nohud');
  await showHud();

  // ---------- C. shake on a REAL impact ----------
  await g(FIRE);
  const trace = [];
  for (let t = 0; t <= 5000; t += 20) {
    trace.push(await g(`
      let asleep=0, tot=0;
      for (const b of W.blocks) if (!b.dead) { tot++; if (b.body.isSleeping()) asleep++; }
      for (const d of (W.debris||[])) if (d.body) { tot++; if (d.body.isSleeping()) asleep++; }
      return { t: args[0], x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5),
               vh:+vh().toFixed(5), roll:+cam.quaternion.z.toFixed(8), asleep, tot, hitStop: W.hitStop,
               blocks: W.blocks.filter(b=>!b.dead).length, debris:(W.debris||[]).length };`, t));
    if (t < 5000) await g('await SS.seek(20);');
  }
  M.shakeTrace = trace;

  // find the impact tick (first frame where a block dies or debris appears)
  const b0 = trace[0].blocks, d0 = trace[0].debris;
  const impact = trace.find(s => s.blocks < b0 || s.debris > d0);
  M.impactT = impact ? impact.t : null;

  if (impact) {
    await g(FIRE + ` await SS.seek(${Math.max(0, impact.t - 60)});`);
    await hideHud();
    await filmstrip('impact-shake-hit', { from: 0, to: 800, step: 50, cols: 5 });
    await showHud();
  }

  // ---------- D. settle / auto-frame / drift ----------
  await g(FIRE + ' await SS.seek(8000);');
  M.settleState = await state();
  M.settle = await g(`
    const out = [];
    for (const v of W.villains) if (v.alive) { const t=v.body.translation(); const p=proj(t.x,t.y);
      out.push({ x:+t.x.toFixed(2), pctW:p.w, pctH:p.h, marginPctW:+Math.min(p.w,100-p.w).toFixed(2) }); }
    let l=1e9,r=-1e9,tp=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation(); l=Math.min(l,t.x); r=Math.max(r,t.x); tp=Math.max(tp,t.y); }
    for (const d of (W.debris||[])) if (d.body) { const t=d.body.translation(); l=Math.min(l,t.x); r=Math.max(r,t.x); }
    return { villains: out, cam: camI(),
             wreckLeftPctW: proj(l,0.5).w, wreckRightPctW: proj(r,0.5).w }; `);
  await hideHud();
  await shot('settled-hit-nohud');
  await filmstrip('settle-quiet-hit', { from: 0, to: 2400, step: 200, cols: 4 });
  await showHud();
  const drift = [];
  for (let t = 0; t <= 1500; t += 100) {
    drift.push(await g('return { t:args[0], x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5) };', t));
    if (t < 1500) await g('await SS.seek(100);');
  }
  M.settleDrift = drift;

  await writeFile(path.join(OUT, 'MEASURE.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({ panA: M.panA, panB: M.panB, impactT: M.impactT, bestLeadT: M.bestLeadT,
    settle: M.settle, settleState: M.settleState }, null, 2));
  await an.close();
};
