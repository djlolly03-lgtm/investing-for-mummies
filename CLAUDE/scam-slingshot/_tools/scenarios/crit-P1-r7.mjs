/**
 * crit-P1-r7.mjs — INDEPENDENT critic capture for P1 (launch feel), round 7.
 *
 * Nothing here trusts the game's own bandMetrics(): every rubric threshold is re-derived from
 * PIXELS via visibility-toggle masks (sling on/off, bands on/off, ammo on/off), and every
 * millisecond claim is taken one solver step at a time through SS.stepOnce().
 *
 * Writes:
 *   masks/*.png       raw render masks for the python pixel pass
 *   p1r7.json         every number this critic quotes
 *   *-FILMSTRIP.png   release strips
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const MASK = path.join(OUT, 'masks');
  await mkdir(MASK, { recursive: true });
  const out = {};
  const png = (n) => page.screenshot({ path: path.join(MASK, n + '.png') });

  const setup = async (seedN = 7) => {
    await game('SS.audioMute(true); return SS.seed(args[0]);', seedN);
    await game('await SS.seek(700);');            // let the camera spring arrive at focusSling
  };

  // ---------------------------------------------------------------- geometry helpers (page)
  const proj = (pts) => game(`
    const w = SS.__world, cam = w.camera, el = w.renderer.domElement;
    const r = el.getBoundingClientRect();
    const V3 = cam.position.constructor;
    return args[0].map(p => {
      const v = new V3(p[0], p[1], p[2] ?? 0).project(cam);
      return { x: (v.x*0.5+0.5)*r.width, y: (-v.y*0.5+0.5)*r.height };
    });
  `, pts);

  const view = () => game(`
    const w = SS.__world, r = w.renderer.domElement.getBoundingClientRect();
    return { w: r.width, h: r.height, dpr: window.devicePixelRatio };
  `);

  const slingGeom = () => game(`
    const s = SS.__world.sling;
    return {
      anchor: { x: s.anchor.x, y: s.anchor.y },
      pouch: { x: s.pouch.x, y: s.pouch.y },
      drawn: s.drawn, state: s.state,
      tipL: { x: s.prongs[0].tip.x, y: s.prongs[0].tip.y },
      tipR: { x: s.prongs[1].tip.x, y: s.prongs[1].tip.y },
      frontCtrl: s.bands[0].ctrl.map(c => ({ x: c.x, y: c.y, z: c.z })),
      metrics: s.bandMetrics(),
      ad: s.ammoDiameter(), adFx: s.ammoSpan(),
      ammo: s.ammo ? { x: s.ammo.mesh.position.x, y: s.ammo.mesh.position.y } : null,
    };
  `);

  const vis = (spec) => game(`
    const s = SS.__world.sling;
    const a = args[0];
    if (a.sling !== undefined) s.group.visible = a.sling;
    if (a.bands !== undefined) for (const b of s.bands) b.tube.group.visible = a.bands;
    if (a.ammo !== undefined && s.ammo) s.ammo.mesh.visible = a.ammo;
    SS.__render();
    return true;
  `, spec);

  // ---------------------------------------------------------------- 1. COMPOSITION + MASKS
  await setup();
  out.view = await view();
  out.rest = await slingGeom();
  await shot('rest-loaded');

  // mask quad at REST (drawn = 0)
  await vis({ sling: true, bands: true, ammo: true });  await png('rest-full');
  await vis({ ammo: false });                            await png('rest-noammo');
  await vis({ bands: false, ammo: true });               await png('rest-nobands');
  await vis({ ammo: false });                            await png('rest-nobands-noammo');
  await vis({ sling: false, bands: true, ammo: false }); await png('rest-nosling-noammo');
  await vis({ sling: true, bands: true, ammo: true });

  // ---------------------------------------------------------------- 2. FULL DRAW, real pointer
  const draw = await dragShot(0.30, 1.0, { steps: 14 });
  out.dragReport = draw;
  await game('await SS.seek(250);');                     // camera settles on the drawn pose
  out.full = await slingGeom();
  await shot('full-draw');

  await vis({ sling: true, bands: true, ammo: true });   await png('full-full');
  await vis({ ammo: false });                            await png('full-noammo');
  await vis({ bands: false, ammo: true });               await png('full-nobands');
  await vis({ ammo: false });                            await png('full-nobands-noammo');
  await vis({ sling: false, bands: true, ammo: false }); await png('full-nosling-noammo');
  await vis({ sling: true, bands: true, ammo: true });

  // screen projections needed by the python pass, taken in the SAME camera state as the masks
  const pw = (g) => proj([
    [g.tipR.x, g.tipR.y], [g.tipL.x, g.tipL.y],
    [g.pouch.x, g.pouch.y], [g.anchor.x, g.anchor.y],
    [g.frontCtrl[0].x, g.frontCtrl[0].y], [g.frontCtrl[3].x, g.frontCtrl[3].y],
    [g.anchor.x, g.anchor.y], [g.anchor.x + 1, g.anchor.y],      // 1 world unit, for px scale
  ]);
  out.fullPx = await pw(out.full);

  // mid draws, for the deformation curve
  out.curve = [];
  for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
    await setup(); await dragShot(0.30, p, { steps: 6 });
    const g = await slingGeom();
    out.curve.push({ power: p, drawn: g.drawn, m: g.metrics,
                     tipSpan: +(g.tipR.x - g.tipL.x).toFixed(4) });
  }

  // rest-pose projections (camera at focusSling, ammo loaded, no drag)
  await setup();
  out.restPx = await pw(out.rest);

  // ---------------------------------------------------------------- 3. PREVIEW GATING
  await setup();
  await dragShot(0.30, 0.9, { steps: 8 });
  out.previewFirstDrag = await game(`
    const s = SS.__world.sling;
    return { visible: s.preview.visible, ammoUsed: SS.__world.ammoUsed ?? null, drawn: s.drawn };
  `);
  out.previewNoDrag = await (async () => {
    await setup();
    return game('const s = SS.__world.sling; return { visible: s.preview.visible, state: s.state };');
  })();

  // ---------------------------------------------------------------- 4. RELEASE TRACE (per step)
  await setup();
  await dragShot(0.30, 1.0, { steps: 14 });
  await game('await SS.seek(250);');
  const preRelease = await slingGeom();
  out.preRelease = preRelease;
  out.release = await game(`
    const s = SS.__world.sling;
    const r = SS.release();
    return r;
  `);
  out.trace = await game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const el = w.renderer.domElement, rect = el.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const P0 = { x: args[0].x, y: args[0].y };                 // pouch at the instant of release
    const AD = args[1];
    const projY = (x, y) => {
      const v = new V3(x, y, 0).project(cam);
      return { x: (v.x*0.5+0.5)*rect.width, y: (-v.y*0.5+0.5)*rect.height };
    };
    const dir = { x: Math.cos(args[2]), y: Math.sin(args[2]) };
    const rows = [];
    const sample = (i) => {
      const proj = w.projectiles && w.projectiles.length ? w.projectiles[w.projectiles.length-1] : null;
      const m = proj?.mesh;
      const px = m ? m.position.x : NaN, py = m ? m.position.y : NaN;
      const d = Math.hypot(px - P0.x, py - P0.y);
      const off = (s.pouch.x - s.anchor.x) * dir.x + (s.pouch.y - s.anchor.y) * dir.y;
      const g = projY(0, 0);           // fixed world point: camera kick shows up as its screen drift
      const gg = projY(20, 0);
      // launch VFX: spark4 + flash pools
      let n = 0, cx = 0, cy = 0, far = 0;
      for (const key of ['spark4', 'flash']) {
        const pool = w.fx?.pools?.[key]; if (!pool) continue;
        const p = pool.p;
        for (let k = 0; k < pool.max; k++) {
          if (p.life[k] <= 0) continue;
          n++; cx += p.x[k]; cy += p.y[k];
        }
      }
      if (n) { cx /= n; cy /= n;
        for (const key of ['spark4', 'flash']) {
          const pool = w.fx?.pools?.[key]; if (!pool) continue;
          const p = pool.p;
          for (let k = 0; k < pool.max; k++) {
            if (p.life[k] <= 0) continue;
            far = Math.max(far, Math.hypot(p.x[k]-cx, p.y[k]-cy));
          }
        }
      }
      rows.push({
        step: i, t: +(i * 1000 / 120).toFixed(2),
        ammo: { x: +px.toFixed(4), y: +py.toFixed(4) },
        distAD: +(d / AD).toFixed(3),
        recoilOff: +off.toFixed(5),
        camY0: +g.y.toFixed(3), camX0: +g.x.toFixed(3), camY20: +gg.y.toFixed(3),
        fx: { n, cx: +cx.toFixed(3), cy: +cy.toFixed(3), spread: +far.toFixed(3),
              dPouchAD: +(Math.hypot(cx - P0.x, cy - P0.y) / AD).toFixed(3),
              dAmmoAD: +(Math.hypot(cx - px, cy - py) / AD).toFixed(3) },
        slingState: s.state,
      });
    };
    sample(0);
    for (let i = 1; i <= 72; i++) { SS.stepOnce(); sample(i); }
    return rows;
  `, preRelease.pouch, out.release.ad ?? out.rest.ad, out.release.angle ?? 0.30);

  // ---------------------------------------------------------------- 5. RELEASE FILMSTRIPS
  await setup();
  await dragShot(0.30, 1.0, { steps: 14 });
  await game('await SS.seek(250);');
  await game('return SS.release();');
  await filmstrip('release-fine', { from: 0, to: 300, step: 25, cols: 4 });

  await setup();
  await dragShot(0.30, 1.0, { steps: 14 });
  await game('await SS.seek(250);');
  await game('return SS.release();');
  await filmstrip('release-ringdown', { from: 0, to: 600, step: 50, cols: 4 });

  // single frames for the blind pair: the instant after release, at the game's own framing
  for (const t of [50, 80, 120]) {
    await setup();
    await dragShot(0.30, 1.0, { steps: 14 });
    await game('await SS.seek(250);');
    await game('return SS.release();');
    await game('await SS.seek(args[0]);', t);
    await shot('release-t' + t);
  }

  // sling-local zoom of the release instant, for band-recoil legibility only (camLock AFTER release)
  await setup();
  await dragShot(0.30, 1.0, { steps: 14 });
  await game('await SS.seek(250);');
  await game('return SS.release();');
  await game(`const s = SS.__world.sling;
    return SS.camLock({ x: s.anchor.x + 1.5, y: s.anchor.y - 0.4, halfWidth: 5.0 });`);
  await filmstrip('release-sling-LOCKED', { from: 0, to: 400, step: 25, cols: 4 });
  await game('return SS.camUnlock();');

  // ---------------------------------------------------------------- 6. rest vs stretch, ammo masked
  await setup();
  await game('const s = SS.__world.sling; if (s.ammo) s.ammo.mesh.visible = false; SS.__render();');
  await shot('band-REST-ammo-masked');
  await dragShot(0.30, 1.0, { steps: 14 });
  await game('await SS.seek(250);');
  await game('const s = SS.__world.sling; if (s.ammo) s.ammo.mesh.visible = false; SS.__render();');
  await shot('band-FULL-ammo-masked');
  await game('const s = SS.__world.sling; if (s.ammo) s.ammo.mesh.visible = true;');

  out.finalState = await state();
  await writeFile(path.join(OUT, 'p1r7.json'), JSON.stringify(out, null, 2));
  console.log('WROTE p1r7.json');
};
