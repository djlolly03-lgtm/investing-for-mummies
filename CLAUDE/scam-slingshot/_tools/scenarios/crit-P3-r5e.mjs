/**
 * crit-P3-r5e.mjs — the impact instant, at a size where it can actually be judged.
 *
 * camLock tight on the true contact point (geometry criterion — P3 explicitly allows it),
 * 20 ms steps, so "one dark grey smoke ball with a SINGLE yellow-orange star flash at its
 * centre, gone within 150 ms" is either there in a tile or it is not.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = []; window.__hits = [];
if (!B.__ePatched) {
  B.__ePatched = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2)
      (window.__hits ||= []).push({ tick: SS.tick(), mat: this.matName, imp, x: pt?.x, y: pt?.y });
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) {
    const t = SS.tick(), k = of.call(this, imp, pt);
    (window.__fx ||= []).push({ tick: t, mat: this.matName, imp, kids: k.length, x: pt?.x, y: pt?.y });
    return k;
  };
}
return true;`;

async function toFracture(game, lvl, ang, pow) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return (window.__fx||[]).length;')) break; }
  return t;
}

export default async ({ shot, filmstrip, game }) => {
  const L = (...a) => console.log(...a);

  // --- the impact instant, TIGHT ------------------------------------------
  await toFracture(game, 'l1', 0.36, 1.00);
  const f = await game('return window.__fx[0];');
  L(`fracture at (${f.x.toFixed(2)}, ${f.y.toFixed(2)}) mat=${f.mat} imp=${f.imp.toFixed(2)}`);
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 3.0});', f.x, f.y);
  await filmstrip('impact-TIGHT-0-240-20step', { from: 0, to: 240, step: 20, cols: 4 });
  await game('return SS.camUnlock();');

  // --- alpha/scale of the flash + smoke particles, sampled from the pool ---
  L('\n--- flash pool: live count, mean alpha, mean on-screen size ---');
  await toFracture(game, 'l1', 0.36, 1.00);
  let seen = 0;
  const POOLQ = `
  const w = SS.__world, r = w.renderer.domElement.getBoundingClientRect(), cam = w.camera;
  const V3 = cam.position.constructor;
  const spanPx = (x,y,s)=>{const a=new V3(x,y,0).project(cam),b=new V3(x+s,y,0).project(cam);
    return Math.abs((b.x-a.x)*0.5*r.width);};
  const out = {};
  for (const k of ['flash','smoke']) {
    const p = w.fx.pools[k]; const rows = [];
    for (let i=0;i<p.max;i++) if (p.p.life[i] > 0) rows.push({ a: p.alpha.array[i], sx: p.p.sx[i],
      px: spanPx(p.p.x[i], p.p.y[i], p.p.sx[i]) });
    out[k] = { live: p.live, n: rows.length,
      meanA: rows.length ? rows.reduce((s,x)=>s+x.a,0)/rows.length : 0,
      maxA: rows.length ? Math.max(...rows.map(x=>x.a)) : 0,
      meanPx: rows.length ? rows.reduce((s,x)=>s+x.px,0)/rows.length : 0,
      maxPx: rows.length ? Math.max(...rows.map(x=>x.px)) : 0 };
  }
  return out;`;
  for (const at of [0, 20, 40, 60, 80, 100, 120, 150, 180, 220, 300, 400]) {
    if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
    const q = await game(POOLQ);
    L(` frac+${String(at).padStart(3)}  FLASH n=${q.flash.n} maxAlpha=${q.flash.maxA.toFixed(3)} meanAlpha=${q.flash.meanA.toFixed(3)} maxPx=${q.flash.maxPx.toFixed(1)}` +
      ` | SMOKE n=${q.smoke.n} maxAlpha=${q.smoke.maxA.toFixed(3)} maxPx=${q.smoke.maxPx.toFixed(1)}`);
  }

  // --- a hard STONE hit: does stone ever break, at any impulse? ------------
  L('\n--- can the projectile EVER break stone / wood? direct probe-column sweep, wide ---');
  for (const m of ['stone', 'wood']) {
    let bestImp = 0, broke = false;
    for (const [a, p] of [[0.10,1.0],[0.14,1.0],[0.18,1.0],[0.22,1.0],[0.26,0.9],[0.30,0.8],
                          [0.34,0.7],[0.06,0.9],[0.16,0.75],[0.20,0.7],[0.12,0.95],[0.24,0.65]]) {
      await game('return await SS.loadLevel(args[0]);', `_p3-${m}`);
      await game('return SS.seed(777);');
      await game('await SS.seek(1200);');
      await game(INSTRUMENT);
      await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      await game('await SS.seek(3500);');
      const d = await game('return { h: window.__hits, f: window.__fx };');
      const mx = Math.max(0, ...d.h.map(x => x.imp));
      if (mx > bestImp) bestImp = mx;
      if (d.f.length) broke = true;
    }
    L(` ${m}: 12 shots, peak ammo impulse ${bestImp.toFixed(2)} N.s vs threshold ${m === 'stone' ? 17 : 9.5} — fractured: ${broke}`);
  }

  // --- the wreckage, big and unobstructed (no level-end overlay in the way) -
  L('\n--- clean wreckage close read ---');
  await toFracture(game, 'l1', 0.36, 1.00);
  await game('await SS.seek(3500);');
  const c = await game(`const w=SS.__world; const d=w.debris.filter(x=>!x.dead);
    return { n:d.length, cx:d.reduce((s,x)=>s+x.body.translation().x,0)/d.length,
             cy:d.reduce((s,x)=>s+x.body.translation().y,0)/d.length };`);
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 3.4});', c.cx, c.cy + 0.4);
  await game('await SS.seek(33);');
  await shot('wreckage-CAMLOCK-3.4m');
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 8.0});', c.cx, c.cy + 1.0);
  await game('await SS.seek(33);');
  await shot('wreckage-CAMLOCK-8m');
  await game('return SS.camUnlock();');
  await game('await SS.seek(33);');
  await shot('wreckage-gameframing');
};
