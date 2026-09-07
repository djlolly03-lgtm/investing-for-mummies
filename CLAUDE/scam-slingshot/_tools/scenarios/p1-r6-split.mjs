/**
 * p1-r6-split.mjs — which RELEASE LAYER owns the pixels at the sling.
 *
 * `p1-r6-bandvfx` says whether the band beats the launch VFX in the 520 px box. When it does
 * not, this says which of the three layers to spend the cut on, instead of shaving all three
 * and hoping. Layers are tagged AT EMISSION (wrapping FX.lance and FX.burst) — no heuristic —
 * and hidden one at a time by zeroing their instance scale and re-running FX.update(0), which
 * rewrites the instance matrices without advancing the simulation. Every render is therefore
 * the same instant.
 *
 * Writes A / NOTRAIL / NOFAN / NOCORE / NOBAND per timestamp + geom.json; read with
 * p1-r6-split.py.
 */
export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const TS = [0, 30, 60, 100, 150];
  const ANGLE = +(process.env.P1_ANGLE ?? 0.42);
  const POWER = +(process.env.P1_POWER ?? 0.90);
  say('shot', { angle: ANGLE, power: POWER });

  await game('SS.seed(11); await SS.seek(2000);');
  await game(`
    const w = SS.__world, fx = w.fx;
    const sp = fx.pools.spark4, fl = fx.pools.flash;
    w.__tag = { spark4: new Int8Array(sp.max), flash: new Int8Array(fl.max) };
    const snap = (p) => { const a = new Uint8Array(p.max); for (let i=0;i<p.max;i++) a[i] = p.p.life[i] > 0 ? 1 : 0; return a; };
    const mark = (p, key, before, v) => { const t = w.__tag[key];
      for (let i=0;i<p.max;i++) if (p.p.life[i] > 0 && !before[i]) t[i] = v; };
    const L = fx.lance.bind(fx), B = fx.burst.bind(fx);
    fx.lance = (...a) => { const s = snap(sp); const r = L(...a); mark(sp, 'spark4', s, 1); return r; };
    fx.burst = (k, ...a) => {
      if (k === 'launchSpark') { const s = snap(sp); const r = B(k, ...a); mark(sp, 'spark4', s, 2); return r; }
      if (k === 'launchCore')  { const s = snap(fl); const r = B(k, ...a); mark(fl, 'flash', s, 3); return r; }
      return B(k, ...a);
    };
    return true;`);

  await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(400);', ANGLE, POWER);
  const info = await game('return await SS.release();');
  say('release', { ad: info.ad, muzzleAD: info.muzzleAD });

  const probe = () => game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const r = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const v = new V3(s.anchor.x, s.anchor.y, 0).project(cam);
    const halfH = Math.abs(cam.position.z) * Math.tan(cam.fov*Math.PI/360);
    return { anchorPx: [ (v.x*0.5+0.5)*r.width, (-v.y*0.5+0.5)*r.height ],
             pxPerWorld: (r.height/2)/halfH, cssW: r.width, cssH: r.height };`);

  /** Hide one tag value (1 trail / 2 fan / 3 core), render, restore. */
  const withHidden = (tagVal) => game(`
    const w = SS.__world, fx = w.fx;
    const key = args[0] === 3 ? 'flash' : 'spark4';
    const pool = fx.pools[key], P = pool.p, tag = w.__tag[key];
    const sx = [], sy = [];
    for (let i = 0; i < pool.max; i++) if (tag[i] === args[0] && P.life[i] > 0) {
      sx.push([i, P.sx[i]]); sy.push([i, P.sy[i]]); P.sx[i] = 0; P.sy[i] = 0; }
    fx.update(0); SS.__render();
    return sx.length;`, tagVal);
  const restore = () => game(`SS.__world.fx.update(0); SS.__render(); return true;`);
  // Zeroing scale is destructive, so re-emit is impossible; instead we snapshot/restore the
  // two size arrays around each hidden render.
  const hideRender = async (tagVal, name) => {
    const saved = await game(`
      const w = SS.__world, fx = w.fx;
      const key = args[0] === 3 ? 'flash' : 'spark4';
      const pool = fx.pools[key], P = pool.p, tag = w.__tag[key];
      const out = [];
      for (let i = 0; i < pool.max; i++) if (tag[i] === args[0] && P.life[i] > 0) out.push([i, P.sx[i], P.sy[i]]);
      for (const [i] of out) { P.sx[i] = 0; P.sy[i] = 0; }
      fx.update(0); SS.__render();
      return out;`, tagVal);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await game(`
      const w = SS.__world, fx = w.fx;
      const key = args[0] === 3 ? 'flash' : 'spark4';
      const P = fx.pools[key].p;
      for (const [i, sx, sy] of args[1]) { P.sx[i] = sx; P.sy[i] = sy; }
      fx.update(0); SS.__render(); return true;`, tagVal, saved);
    return saved.length;
  };
  const hideBand = async (name) => {
    await game(`for (const b of SS.__world.sling.bands) b.tube.group.visible = false; SS.__render(); return true;`);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await game(`for (const b of SS.__world.sling.bands) b.tube.group.visible = true; SS.__render(); return true;`);
  };

  const perT = {};
  let t = 0;
  for (const want of TS) {
    if (want > t) { await game('await SS.seek(args[0]);', want - t); t = want; }
    await game('SS.__render();');
    const p = await probe();
    perT[want] = { anchorPx: p.anchorPx, adPx: info.ad * p.pxPerWorld };
    await page.screenshot({ path: `${OUT}/A-t${want}.png` });
    const nTrail = await hideRender(1, `NOTRAIL-t${want}`);
    const nFan = await hideRender(2, `NOFAN-t${want}`);
    const nCore = await hideRender(3, `NOCORE-t${want}`);
    await hideBand(`NOBAND-t${want}`);
    say('alive-t' + want, { trail: nTrail, fan: nFan, core: nCore });
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/geom.json`, JSON.stringify(
    { ts: TS, ad: info.ad, muzzleAD: info.muzzleAD, angle: ANGLE, power: POWER,
      cssW: (await probe()).cssW, perT }, null, 2));
  console.log('### DONE');
};
