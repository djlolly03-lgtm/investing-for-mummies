/**
 * P1 — LAUNCH FEEL. Everything the rubric asks for a number on, plus the contact sheets.
 *
 * Shots:
 *   rest / drag-45 / drag-full            full-frame
 *   zz-sling-REST / zz-sling-FULLDRAW     matched crops for the side-by-side deform test
 *   zz-pouch-REST / zz-pouch-FULLDRAW     tight crops: band cross-section + ammo occlusion
 *   FILMSTRIP release-300ms  0..320 @ 20  the cut, the burst, the recoil
 *   FILMSTRIP recoil-400ms   0..420 @ 30  overshoot count, still-by-400ms
 *   shot2-*                               the EARNED preview + the persisted traceline
 *
 * measure.json carries: band metrics at rest and at full draw, the release marks, the recoil
 * trace, the measured pixel occlusion of the ammo by the pouch strap, and trail metrics.
 */
export default async ({ shot, filmstrip, game, state, page, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  /** Pinhole projection helper — the camera always looks straight down -Z (camera.js). */
  const BOX = `
    const cam = SS.__world.camera, el = SS.__world.renderer.domElement;
    const r = el.getBoundingClientRect();
    const tanH = Math.tan(cam.fov * Math.PI / 360);
    const d = cam.position.z;
    const proj = (x, y) => ({
      x: (((x - cam.position.x) / (tanH * cam.aspect * d)) * 0.5 + 0.5) * r.width,
      y: ((-((y - cam.position.y) / (tanH * d))) * 0.5 + 0.5) * r.height });
  `;
  const worldBox = (x0, y1, x1, y0) => game(BOX + `
    const a = proj(args[0], args[1]), b = proj(args[2], args[3]);
    return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)),
             width: Math.max(40, Math.round(b.x - a.x)), height: Math.max(40, Math.round(b.y - a.y)) };
  `, x0, y1, x1, y0);

  /**
   * Crop at DEVICE resolution, not CSS resolution. puppeteer's `clip` is in CSS pixels and
   * does NOT multiply by deviceScaleFactor, so a tight crop of the pouch came back 174 px
   * wide — far too small to judge a band cross-section on. Reading the pixels straight off
   * the WebGL canvas gives the real 2x buffer.
   */
  const crop = async (name, wbox, zoom = 3, fixed = null) => {
    const dataUrl = await game(`
      const el = SS.__world.renderer.domElement;
      const rect = el.getBoundingClientRect();
      const dpr = el.width / rect.width;
      const b = args[0], z = args[1], fixed = args[2];
      const cv = document.createElement('canvas');
      // A fixed output size matters for filmstrip tiles: the camera moves, so the same world
      // box projects to a different pixel box every frame, and ffmpeg's tiler silently drops
      // every frame after the first if their sizes disagree.
      cv.width = fixed ? fixed[0] : Math.round(b.width * dpr * z);
      cv.height = fixed ? fixed[1] : Math.round(b.height * dpr * z);
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      SS.__render();
      g.drawImage(el, Math.round(b.x * dpr), Math.round(b.y * dpr),
                  Math.round(b.width * dpr), Math.round(b.height * dpr),
                  0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png');
    `, wbox, zoom, fixed);
    await fs.writeFile(path.join(OUT, `zz-${name}.png`),
      Buffer.from(dataUrl.split(',')[1], 'base64'));
  };

  /**
   * MEASURED OCCLUSION. Render the same simulated instant three times — all in, ammo hidden,
   * front strap hidden — and diff the frames inside the page, so the answer is a pixel count
   * and not an opinion. `SS.__render()` advances nothing, so all three really are the same
   * instant of the same simulation. Also returns the ammo silhouette's pixel HEIGHT, which is
   * the rubric's AD unit measured exactly as the rubric defines it.
   */
  const occlusion = (x0, y1, x1, y0) => game(`
    const s = SS.__world.sling;
    ${BOX}
    const rect = el.getBoundingClientRect();
    const a = proj(args[0], args[1]), b = proj(args[2], args[3]);
    const dpr = el.width / rect.width;
    const sx = Math.round(a.x * dpr), sy = Math.round(a.y * dpr);
    const sw = Math.round((b.x - a.x) * dpr), sh = Math.round((b.y - a.y) * dpr);
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const grab = () => { g.clearRect(0, 0, sw, sh); g.drawImage(el, sx, sy, sw, sh, 0, 0, sw, sh);
                         return g.getImageData(0, 0, sw, sh).data; };
    const ammo = s.ammo.mesh, front = s.bands[0].tube.group;
    // Shadows OFF for the measurement: hiding the ammo also removes its cast shadow, and
    // those shadow pixels would then be counted as part of its silhouette — which inflated
    // the measured AD from 0.7 to 1.08 world units and the occlusion along with it.
    const sun = SS.__world.sun; const hadShadow = sun ? sun.castShadow : false;
    if (sun) sun.castShadow = false;
    SS.__render(); const withAll = grab();
    ammo.visible = false; SS.__render(); const noAmmo = grab();
    ammo.visible = true;
    front.visible = false; SS.__render(); const noStrap = grab();
    front.visible = true;
    if (sun) sun.castShadow = hadShadow;
    SS.__render();
    let sil = 0, hidden = 0, top = 1e9, bot = -1;
    for (let py = 0; py < sh; py++) for (let px = 0; px < sw; px++) {
      const i = (py * sw + px) * 4;
      const dNo = Math.abs(noStrap[i]-noAmmo[i]) + Math.abs(noStrap[i+1]-noAmmo[i+1]) + Math.abs(noStrap[i+2]-noAmmo[i+2]);
      if (dNo <= 18) continue;                       // not an ammo pixel
      sil++;
      if (py < top) top = py;
      if (py > bot) bot = py;
      const dAll = Math.abs(withAll[i]-noAmmo[i]) + Math.abs(withAll[i+1]-noAmmo[i+1]) + Math.abs(withAll[i+2]-noAmmo[i+2]);
      if (dAll <= 18) hidden++;
    }
    const worldPerPx = (args[2] - args[0]) / sw;
    return { silhouettePx: sil, hiddenPx: hidden,
             occlusionPct: sil ? +(100 * hidden / sil).toFixed(1) : null,
             ADworld: bot >= 0 ? +((bot - top + 1) * worldPerPx).toFixed(4) : null };
  `, x0, y1, x1, y0);

  const bands = () => game(`
    const s = SS.__world.sling;
    return { previewVisible: !!s.preview?.visible, state: s.state, drawn: s.drawn,
             band: s.bandMetrics(), gaps: s.previewGaps() };
  `);

  await game('await SS.seed(7);');
  await game('await SS.seek(600);');

  // ---- 1. AT REST. No drag has happened, so the preview must not exist at all. ----
  await shot('rest');
  const restM = await bands();
  await crop('sling-REST', await worldBox(-3.4, 5.0, 2.8, 0.2));
  await crop('pouch-REST', await worldBox(-1.3, 4.4, 1.4, 2.2));
  const occRest = await occlusion(-1.3, 4.4, 1.4, 2.2);

  // ---- 2/3. the draw ----
  await game('SS.aim({angle: 0.62, power: 0.45}); await SS.seek(260);');
  await shot('drag-45');
  await game('SS.aim({angle: 0.62, power: 1.0}); await SS.seek(320);');
  await shot('drag-full');
  const fullM = await bands();
  await crop('sling-FULLDRAW', await worldBox(-3.4, 5.0, 2.8, 0.2));
  await crop('pouch-FULLDRAW', await worldBox(-3.4, 3.2, -0.7, 1.0));
  const occ = await occlusion(-3.4, 3.2, -0.7, 1.0);

  // ---- 4. the release, 20 ms apart ----
  await game('return SS.release();');
  await filmstrip('release-300ms', { from: 0, to: 320, step: 20, cols: 5 });

  // ---- 5. numbers through the release ----
  await game('await SS.seed(7); await SS.seek(600); SS.aim({angle:0.62,power:1.0}); await SS.seek(320);');
  const rel = await game('return SS.release();');
  const marks = [];
  let at = 0;
  for (const t of [0, 20, 40, 60, 80, 100, 120, 140, 160, 200, 250, 300, 400]) {
    if (t > at) { await game('await SS.seek(args[0]);', t - at); at = t; }
    marks.push(await game(`
      const w = SS.__world, s = w.sling;
      const p = w.projectiles.filter(p => !p.dead)[0];
      const pt = p ? p.body.translation() : null;
      return { t: args[0],
        ammo: pt ? { x: +pt.x.toFixed(3), y: +pt.y.toFixed(3) } : null,
        distFromPouch: pt ? +Math.hypot(pt.x - s.pouch.x, pt.y - s.pouch.y).toFixed(3) : null,
        distFromAnchor: pt ? +Math.hypot(pt.x - s.anchor.x, pt.y - s.anchor.y).toFixed(3) : null,
        pouchFwd: +((s.pouch.x - s.anchor.x) * s.recoilDir.x + (s.pouch.y - s.anchor.y) * s.recoilDir.y).toFixed(4),
        slingState: s.state, camY: +w.camera.position.y.toFixed(4),
        shake: +(w.rig.shake ?? 0).toFixed(5) };
    `, t));
  }

  // ---- 6. recoil, fine-grained ----
  await game('await SS.seed(7); await SS.seek(600); SS.aim({angle:0.62,power:1.0}); await SS.seek(320); SS.release();');
  const recoil = [];
  for (let i = 0; i <= 45; i++) {
    recoil.push(await game(`
      const s = SS.__world.sling;
      return { ms: args[0],
               fwd: +((s.pouch.x - s.anchor.x) * s.recoilDir.x + (s.pouch.y - s.anchor.y) * s.recoilDir.y).toFixed(5),
               shake: +(SS.__world.rig.shake ?? 0).toFixed(5) };`, i * 10));
    if (i < 45) await game('await SS.seek(10);');
  }
  await game('await SS.seed(7); await SS.seek(600); SS.aim({angle:0.62,power:1.0}); await SS.seek(320); SS.release();');
  await filmstrip('recoil-400ms', { from: 0, to: 420, step: 30, cols: 5 });

  /**
   * The same 400 ms again, but CROPPED to the sling. At the level's aim framing the whole
   * slingshot is ~7 %W, so a full-frame filmstrip cannot show a band recoil or a spark fan
   * at all — it shows a brown twig. Tiles get stitched by tools/tile-p1.sh.
   */
  await game('await SS.seed(7); await SS.seek(600); SS.aim({angle:0.62,power:1.0}); await SS.seek(320); SS.release();');
  for (let i = 0; i <= 12; i++) {
    await crop(`tile-${String(i).padStart(2, '0')}-t${i * 30}ms`,
      await worldBox(-3.6, 6.6, 4.4, 0.6), 2, [900, 675]);
    if (i < 12) await game('await SS.seek(30);');
  }

  // ---- 7. shot two: the EARNED preview, and last shot's traceline still on screen ----
  // A LOFTED shot: the rubric's dot-spacing criterion is stated for a lofted arc, because
  // that is the case where the apex genuinely slows down (a flat shot barely does).
  await game('await SS.seed(7); await SS.seek(600); SS.aim({angle:1.02,power:0.92}); await SS.seek(300); SS.release();');
  for (let i = 0; i < 45; i++) {
    const st = await state();
    if (st.phase === 'aiming' || st.phase === 'won' || st.phase === 'lost') break;
    await game('await SS.seek(200);');
  }
  await shot('after-shot1-traceline-persists');
  const trailM = await game('return SS.__world.trail.metrics();');
  await game('SS.aim({angle: 0.92, power: 0.95}); await SS.seek(260);');
  await shot('shot2-earned-preview');
  const shot2M = await bands();

  await fs.writeFile(path.join(OUT, 'measure.json'), JSON.stringify(
    { restM, fullM, occRest, occ, rel, marks, recoil, shot2M, trailM }, null, 2));

  const r = restM.band, f = fullM.band;
  const AD = occRest.ADworld;
  console.log('AD (measured ammo silhouette height at rest):', AD, 'world units');
  console.log('band width @pouch  rest -> full :', r.rubberWidthAtPouch, '->', f.rubberWidthAtPouch,
    `(${(100 * (1 - f.rubberWidthAtPouch / r.rubberWidthAtPouch)).toFixed(0)}% narrower, need >=25%)`);
  console.log('rubber length front rest -> full:', r.rubberLenFront, '->', f.rubberLenFront,
    `(${(f.rubberLenFront / r.rubberLenFront).toFixed(2)}x, need >=2.5x)`);
  console.log('rubber length back  rest -> full:', r.rubberLenBack, '->', f.rubberLenBack,
    `(${(f.rubberLenBack / r.rubberLenBack).toFixed(2)}x, need >=2.5x)`);
  console.log('fork span rest -> full:', r.forkSpanX, '->', f.forkSpanX,
    `(${(100 * (1 - f.forkSpanX / r.forkSpanX)).toFixed(0)}% inward)`);
  console.log('occlusion of ammo by front strap  at rest:', occRest.occlusionPct + '%', '(need >=15%)');
  console.log('occlusion of ammo by front strap full draw:', occ.occlusionPct + '%', '(need >=15%)');
  console.log('preview visible  rest / shot1 draw / shot2 draw:',
    restM.previewVisible, fullM.previewVisible, shot2M.previewVisible, '(need false false true)');
  console.log('preview gap ratio (apex third / muzzle third):', shot2M.gaps && shot2M.gaps.ratio);
  console.log('trail:', JSON.stringify(trailM));
  const inAD = (v) => +(v / AD).toFixed(2);
  console.log('ammo clear of pouch, in AD:', marks.map(m => `${m.t}=${inAD(m.distFromPouch)}`).join(' '));
  console.log('pouch fwd offset:', recoil.filter((_, i) => i % 2 === 0).map(x => `${x.ms}:${x.fwd}`).join(' '));
  console.log('shake:', recoil.filter((_, i) => i % 3 === 0).map(x => `${x.ms}:${x.shake}`).join(' '));
};
