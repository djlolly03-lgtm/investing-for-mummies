/**
 * crit-P1-r8.mjs — INDEPENDENT critic capture for P1 (launch feel), round 8.
 *
 * Everything the verdict quotes is either (a) a pixel population isolated by a visibility
 * toggle and differenced against a background plate, or (b) a per-solver-step trace taken
 * through SS.stepOnce(). Nothing here reads the game's own bandMetrics() as evidence.
 *
 * Writes:  masks/*.png (for the python pixel pass), p1r8.json, filmstrips, single frames.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const MASK = path.join(OUT, 'masks');
  await mkdir(MASK, { recursive: true });
  const out = {};
  const png = (n) => page.screenshot({ path: path.join(MASK, n + '.png') });

  const SEED = 11;
  const setup = async (seedN = SEED) => {
    await game('SS.audioMute(true); return SS.seed(args[0]);', seedN);
    await game('await SS.seek(800);');          // camera spring arrives at focusSling
  };

  const view = () => game(`
    const r = SS.__world.renderer.domElement.getBoundingClientRect();
    return { w: r.width, h: r.height, dpr: window.devicePixelRatio };
  `);

  const proj = (pts) => game(`
    const w = SS.__world, cam = w.camera;
    const r = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    return args[0].map(p => {
      const v = new V3(p[0], p[1], p[2] ?? 0).project(cam);
      return { x: (v.x*0.5+0.5)*r.width, y: (-v.y*0.5+0.5)*r.height };
    });
  `, pts);

  const slingGeom = () => game(`
    const s = SS.__world.sling;
    return {
      anchor: { x: s.anchor.x, y: s.anchor.y },
      pouch:  { x: s.pouch.x,  y: s.pouch.y },
      drawn: s.drawn, state: s.state,
      tipL: { x: s.prongs[0].tip.x, y: s.prongs[0].tip.y },
      tipR: { x: s.prongs[1].tip.x, y: s.prongs[1].tip.y },
      restL: { x: s.prongs[0].rest.x, y: s.prongs[0].rest.y },
      restR: { x: s.prongs[1].rest.x, y: s.prongs[1].rest.y },
      frontCtrl: s.bands[0].ctrl.map(c => ({ x: c.x, y: c.y })),
      backCtrl:  s.bands[1] ? s.bands[1].ctrl.map(c => ({ x: c.x, y: c.y })) : null,
      metricsSELFREPORTED: s.bandMetrics ? s.bandMetrics() : null,
      adSELFREPORTED: s.ammoDiameter ? s.ammoDiameter() : null,
      ammo: s.ammo ? { x: s.ammo.mesh.position.x, y: s.ammo.mesh.position.y } : null,
      previewVisible: s.preview ? s.preview.visible : null,
    };
  `);

  // sling group / bands / ammo visibility. bands live under s.group, so sling:false hides all.
  const vis = (spec) => game(`
    const s = SS.__world.sling, a = args[0];
    if (a.sling !== undefined) s.group.visible = a.sling;
    if (a.bands !== undefined) for (const b of s.bands) b.tube.group.visible = a.bands;
    if (a.ammo  !== undefined && s.ammo) s.ammo.mesh.visible = a.ammo;
    if (a.preview !== undefined && s.preview) s.preview.visible = a.preview;
    SS.__render();
    return true;
  `, spec);

  const maskSet = async (tag) => {
    await vis({ sling: true, bands: true, ammo: true });   await png(tag + '-full');
    await vis({ ammo: false });                            await png(tag + '-noammo');
    await vis({ bands: false, ammo: true });                await png(tag + '-nobands');
    await vis({ ammo: false });                             await png(tag + '-nobands-noammo');
    await vis({ sling: false });                            await png(tag + '-plate');   // background only
    await vis({ sling: true, bands: true, ammo: true });
  };

  // ------------------------------------------------------------------ 1. REST / AIM POSE
  await setup();
  out.view = await view();
  out.rest = await slingGeom();
  const bestAim = await shot('aim-rest');
  await maskSet('rest');
  out.restPx = await proj([
    [out.rest.tipL.x, out.rest.tipL.y], [out.rest.tipR.x, out.rest.tipR.y],
    [out.rest.pouch.x, out.rest.pouch.y], [out.rest.anchor.x, out.rest.anchor.y],
    [out.rest.anchor.x + 1, out.rest.anchor.y],
  ]);

  // ------------------------------------------------------------------ 2. FULL DRAW
  const draw = await dragShot(0.30, 1.0, { steps: 16 });
  out.dragReport = { angle: draw.angle, clamped: draw.clamped, grabbable: draw.grabbable,
                     wanted: [draw.wantedAngle, draw.wantedPower] };
  await game('await SS.seek(250);');
  out.full = await slingGeom();
  await shot('full-draw');
  await maskSet('full');
  out.fullPx = await proj([
    [out.full.tipL.x, out.full.tipL.y], [out.full.tipR.x, out.full.tipR.y],
    [out.full.pouch.x, out.full.pouch.y], [out.full.anchor.x, out.full.anchor.y],
    [out.full.anchor.x + 1, out.full.anchor.y],
  ]);

  // half draw, for the deformation curve
  await setup();
  await dragShot(0.30, 0.5, { steps: 8 });
  await game('await SS.seek(250);');
  out.half = await slingGeom();
  await maskSet('half');
  out.halfPx = await proj([
    [out.half.tipL.x, out.half.tipL.y], [out.half.tipR.x, out.half.tipR.y],
    [out.half.pouch.x, out.half.pouch.y], [out.half.anchor.x, out.half.anchor.y],
    [out.half.anchor.x + 1, out.half.anchor.y],
  ]);

  // ------------------------------------------------------------------ 3. PREVIEW GATING
  await setup();
  out.previewBeforeAnyInput = await game(
    'const s = SS.__world.sling; return { visible: s.preview.visible, state: s.state };');
  await dragShot(0.30, 0.9, { steps: 8 });
  out.previewFirstDrag = await game(`
    const s = SS.__world.sling;
    return { visible: s.preview.visible, drawn: s.drawn,
             ammoLeft: (await SS.state()).ammoLeft };
  `);

  // ------------------------------------------------------------------ 4. FX POOL CENSUS + TRACE
  await setup();
  await dragShot(0.30, 1.0, { steps: 16 });
  await game('await SS.seek(250);');
  const pre = await slingGeom();
  out.preRelease = pre;
  out.release = await game('return SS.release();');

  out.trace = await game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const rect = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const P0 = { x: args[0].x, y: args[0].y };        // pouch at the instant of release (world)
    const ANG = args[1];
    const dir = { x: Math.cos(ANG), y: Math.sin(ANG) };
    const pj = (x, y) => { const v = new V3(x, y, 0).project(cam);
      return { x: (v.x*0.5+0.5)*rect.width, y: (-v.y*0.5+0.5)*rect.height }; };
    const rows = [];
    const sample = (i) => {
      const proj = w.projectiles && w.projectiles.length ? w.projectiles[w.projectiles.length-1] : null;
      const m = proj?.mesh;
      const px = m ? m.position.x : NaN, py = m ? m.position.y : NaN;
      const d = Math.hypot(px - P0.x, py - P0.y);
      // signed pouch offset along the launch direction: negative = past the rest line
      const off = (s.pouch.x - s.anchor.x) * dir.x + (s.pouch.y - s.anchor.y) * dir.y;
      const g0 = pj(0, 0), g20 = pj(20, 0);
      // every live particle in every pool, so nothing is missed by guessing pool names
      let n = 0, cx = 0, cy = 0, far = 0; const byPool = {};
      for (const key in (w.fx?.pools || {})) {
        const pool = w.fx.pools[key], p = pool.p; let k2 = 0;
        for (let k = 0; k < pool.max; k++) { if (p.life[k] <= 0) continue; k2++; n++; cx += p.x[k]; cy += p.y[k]; }
        if (k2) byPool[key] = k2;
      }
      if (n) { cx /= n; cy /= n;
        for (const key in (w.fx?.pools || {})) {
          const pool = w.fx.pools[key], p = pool.p;
          for (let k = 0; k < pool.max; k++) { if (p.life[k] <= 0) continue;
            far = Math.max(far, Math.hypot(p.x[k]-cx, p.y[k]-cy)); }
        }
      }
      rows.push({ step: i, t: +(i * 1000 / 120).toFixed(2),
        ammo: { x: +px.toFixed(4), y: +py.toFixed(4) },
        dist: +d.toFixed(4),
        recoilOff: +off.toFixed(5),
        pouch: { x: +s.pouch.x.toFixed(4), y: +s.pouch.y.toFixed(4) },
        tipR: { x: +s.prongs[1].tip.x.toFixed(4), y: +s.prongs[1].tip.y.toFixed(4) },
        camY0: +g0.y.toFixed(3), camX0: +g0.x.toFixed(3), camY20: +g20.y.toFixed(3),
        fx: { n, byPool, cx: +cx.toFixed(3), cy: +cy.toFixed(3), spread: +far.toFixed(3),
              dPouch: +(Math.hypot(cx - P0.x, cy - P0.y)).toFixed(3),
              dAmmo: +(Math.hypot(cx - px, cy - py)).toFixed(3) },
        state: s.state });
    };
    sample(0);
    for (let i = 1; i <= 96; i++) { SS.stepOnce(); sample(i); }   // 800 ms
    return rows;
  `, pre.pouch, out.release.angle ?? 0.30);

  // ------------------------------------------------------------------ 5. FILMSTRIPS
  const fire = async () => {
    await setup();
    await dragShot(0.30, 1.0, { steps: 16 });
    await game('await SS.seek(250);');
    return game('return SS.release();');
  };

  await fire();
  await filmstrip('release-fine', { from: 0, to: 300, step: 25, cols: 4 });

  await fire();
  await filmstrip('release-ringdown', { from: 0, to: 600, step: 50, cols: 4 });

  await fire();
  await game(`const s = SS.__world.sling;
    return SS.camLock({ x: s.anchor.x + 1.2, y: s.anchor.y - 0.3, halfWidth: 4.5 });`);
  await filmstrip('release-sling-LOCKED', { from: 0, to: 400, step: 25, cols: 4 });
  await game('return SS.camUnlock();');

  // ------------------------------------------------------------------ 6. SINGLE POST-RELEASE FRAMES
  out.frames = {};
  for (const t of [0, 25, 50, 80, 120]) {
    await fire();
    if (t > 0) await game('await SS.seek(args[0]);', t);
    else await game('SS.__render();');
    out.frames['t' + t] = await shot('release-t' + t);
  }

  // ------------------------------------------------------------------ 7. rest vs stretch, ammo masked
  await setup();
  await vis({ ammo: false });  await shot('band-REST-ammo-masked');
  await dragShot(0.30, 1.0, { steps: 16 });
  await game('await SS.seek(250);');
  await vis({ ammo: false });  await shot('band-FULL-ammo-masked');
  await vis({ ammo: true });

  out.finalState = await state();
  await writeFile(path.join(OUT, 'p1r8.json'), JSON.stringify(out, null, 2));
  console.log('WROTE p1r8.json  bestAim=' + bestAim);
};
