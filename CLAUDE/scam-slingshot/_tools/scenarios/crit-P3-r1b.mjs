/**
 * P3 CRITIC r1 — part B. Material close-ups at the RIGHT lock box, fx pool census,
 * settled stillness by pixel diff, stone dust test.
 * Every *-LOCKED file is a geometry inspection, never a composition judgement.
 */
export default async ({ shot, filmstrip, game, state, OUT, page }) => {
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };

  const poolCensus = `
    const f = SS.__world.fx;
    const out = {};
    const P = f.pools || {};
    for (const k of Object.keys(P)) {
      const v = P[k];
      out[k] = { ctor: v?.constructor?.name ?? typeof v,
                 live: v?.live ?? v?.alive ?? v?.n ?? v?.count ?? null,
                 instCount: v?.mesh?.count ?? null,
                 keys: v && typeof v === 'object' ? Object.keys(v).slice(0,14) : null };
    }
    out.__liveCount = f.liveCount;
    out.__popups = Array.isArray(f.popups) ? f.popups.length : null;
    out.__budget = f.budget;
  `;

  for (const m of ['wood', 'glass', 'stone']) {
    await game(`await SS.loadLevel('_p3-${m}'); await SS.seed(5); await SS.seek(900);
                SS.aim({angle:0.24,power:1.0}); SS.release();`);
    const hit = await game(`
      let t=0; for (; t<2400; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
      return { breakAtMs:t, debris: SS.__world.debris.length };
    `);
    // lock the camera on the structure so a shard is judgeable at size
    await game(`SS.camLock({ x: 18.0, y: 2.2, halfWidth: 3.2 });`);
    for (const dt of [0, 60, 140, 300]) {
      if (dt) await game(`await SS.seek(${dt === 60 ? 60 : dt === 140 ? 80 : 160});`);
      const pools = await game(`${poolCensus} return out;`);
      say(`FX_${m.toUpperCase()}_PLUS${dt}`, pools);
      await shot(`${m}-LOCKED-plus${String(dt).padStart(3,'0')}ms`);
    }
    // settled wreckage close-up
    await game(`for (let i=0;i<40;i++) await SS.seek(100);`);
    const dcount = await game(`
      const w = SS.__world;
      const by = {}; for (const d of w.debris) by[d.matName]=(by[d.matName]||0)+1;
      return { debris: w.debris.length, by, blocksLeft: w.blocks.length };
    `);
    say(`SETTLED_${m.toUpperCase()}`, dcount);
    await shot(`${m}-LOCKED-settled`);
    await game(`SS.camUnlock();`);
  }

  // ── stone impact: is there ONE dark grey smoke ball + ONE yellow-orange flash? ──
  await game(`await SS.loadLevel('_p3-stone'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              let t=0; for (; t<2400; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
              SS.camLock({ x: 18.0, y: 2.2, halfWidth: 3.2 });`);
  await filmstrip('stone-impact-LOCKED-30ms', { from: 0, to: 300, step: 30, cols: 4 });
  await game(`SS.camUnlock();`);

  // ── wood impact close, same treatment (dust must be ZERO) ──
  await game(`await SS.loadLevel('_p3-wood'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              let t=0; for (; t<2400; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
              SS.camLock({ x: 18.0, y: 2.2, halfWidth: 3.2 });`);
  await filmstrip('wood-impact-LOCKED-30ms', { from: 0, to: 300, step: 30, cols: 4 });
  await game(`SS.camUnlock();`);

  // ── glass impact close ──
  await game(`await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              let t=0; for (; t<2400; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
              SS.camLock({ x: 18.0, y: 2.2, halfWidth: 3.2 });`);
  await filmstrip('glass-impact-LOCKED-30ms', { from: 0, to: 300, step: 30, cols: 4 });
  await game(`SS.camUnlock();`);

  // ── SETTLED STILLNESS, measured as a pixel diff of two frames 1s apart ──
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              for (let i=0;i<70;i++) await SS.seek(100);`);
  const a = await page.screenshot({ encoding: 'base64' });
  await game(`await SS.seek(1000);`);
  const b = await page.screenshot({ encoding: 'base64' });
  const diff = await page.evaluate(async (A, B) => {
    const load = (s) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0);
    const db = x.getImageData(0, 0, c.width, c.height).data;
    let changed = 0, maxd = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i]-db[i]) + Math.abs(da[i+1]-db[i+1]) + Math.abs(da[i+2]-db[i+2]);
      if (d > 12) changed++;
      if (d > maxd) maxd = d;
    }
    return { w: c.width, h: c.height, changedPx: changed,
             pctChanged: +(100*changed/(c.width*c.height)).toFixed(4), maxChannelDelta: maxd };
  }, a, b);
  say('SETTLED_PIXEL_DIFF_1s', diff);
  const sleepState = await game(`
    const bs = SS.dumpBodies();
    return { bodies: bs.length, asleep: bs.filter(b=>b.sleeping).length,
             awake: bs.filter(b=>!b.sleeping).map(b=>({tag:b.tag, v:b.v.map(x=>+x.toFixed(4))})) };
  `);
  say('SETTLED_SLEEP', sleepState);
  await shot('l1-settled-final');

  // ── UNTOUCHED level: does anything ever wake or jitter over 5 s? ──
  await game(`await SS.loadLevel('l1'); await SS.seed(3); await SS.seek(500);`);
  const untouched = await page.screenshot({ encoding: 'base64' });
  await game(`for (let i=0;i<45;i++) await SS.seek(100);`);
  const untouched2 = await page.screenshot({ encoding: 'base64' });
  const d2 = await page.evaluate(async (A, B) => {
    const load = (s) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    // measure ONLY the structure box (right half, above ground) so clouds/HUD don't pollute it
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0);
    const db = x.getImageData(0, 0, c.width, c.height).data;
    const x0 = Math.floor(c.width*0.55), x1 = Math.floor(c.width*0.95);
    const y0 = Math.floor(c.height*0.28), y1 = Math.floor(c.height*0.80);
    let changed = 0, total = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy*c.width + xx)*4; total++;
      const d = Math.abs(da[i]-db[i]) + Math.abs(da[i+1]-db[i+1]) + Math.abs(da[i+2]-db[i+2]);
      if (d > 12) changed++;
    }
    return { box: [x0,y0,x1,y1], changedPx: changed, total, pct: +(100*changed/total).toFixed(4) };
  }, untouched, untouched2);
  say('UNTOUCHED_STRUCTURE_BOX_DIFF_4.5s', d2);

  console.log('\n===== P3 PART B =====\n' + JSON.stringify(R, null, 1));
};
