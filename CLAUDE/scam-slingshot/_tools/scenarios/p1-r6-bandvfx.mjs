/**
 * p1-r6-bandvfx.mjs — THE r5-critic METRIC, made measurable.
 *
 * "During the first 150 ms the recoiling BAND — not a smoke cloud — must be the
 *  highest-contrast thing at the sling. Band pixels must outnumber launch-VFX pixels in a
 *  520 px box on the pouch."
 *
 * Method (honest isolation, all three renders of the SAME simulated instant via SS.__render):
 *   A        = the frame as shipped
 *   A_noFX   = same instant, every fx-* pool hidden      -> diff(A,A_noFX) = VFX pixels ACTUALLY
 *                                                           VISIBLE in the composite
 *   A_noBand = same instant, both band straps hidden     -> diff(A,A_noBand) = BAND pixels ACTUALLY
 *                                                           VISIBLE in the composite
 * Both diffs are taken against the SAME shipped frame, so a band buried under an opaque plume
 * correctly counts as zero band pixels and the ratio cannot be gamed by drawing the band on top
 * of something that hides it.
 *
 * Writes geom.json (pouch px, AD px, device pixel ratio) + A/NOFX/NOBAND PNGs per timestamp.
 * Analysed by _tools/p1-r6-bandvfx.py.
 */
export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const TS = [0, 30, 60, 100, 150];

  // Default shot is the one every r6 measurement was taken on. P1_ANGLE / P1_POWER override it
  // so the same metric can be swept across the draw without forking the scenario — a fan that
  // only wins the pixel ratio at one draw has not won it.
  const ANGLE = +(process.env.P1_ANGLE ?? 0.42);
  const POWER = +(process.env.P1_POWER ?? 0.90);
  say('shot', { angle: ANGLE, power: POWER });
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(400);', ANGLE, POWER);

  const info = await game('return await SS.release();');
  say('release', { ad: info.ad, muzzleAD: info.muzzleAD, power: info.power });

  /**
   * The box has to be re-centred at EVERY timestamp, not pinned to the release-time pixel.
   * The camera pans and dollies during flight (P4), so a fixed box slides off the sling: on
   * the 0.60 rad / 0.60 draw sweep it had left the band entirely by t = 150 ms and reported
   * `bandpx 0`, i.e. "the band is invisible", for a band that was ringing in plain sight
   * 300 px away. Same class of error as the stale drag pixels in capture.mjs's aimPx note.
   */
  const probe = () => game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const r = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const P = (x,y) => { const v = new V3(x,y,0).project(cam);
      return [ (v.x*0.5+0.5)*r.width, (-v.y*0.5+0.5)*r.height ]; };
    const halfH = Math.abs(cam.position.z) * Math.tan(cam.fov*Math.PI/360);
    return { anchorPx: P(s.anchor.x, s.anchor.y),
             pxPerWorld: (r.height/2)/halfH,
             cssW: r.width, cssH: r.height, dpr: devicePixelRatio };`);
  const geom = await probe();
  const adPx = info.ad * geom.pxPerWorld;
  say('geom', { ...geom, adPx: +adPx.toFixed(2) });
  const perT = {};

  // Visibility toggles. FX pools are scene children named fx-*; the two band straps hang off
  // the sling. Nothing is stepped between the three renders, so all three are the same instant.
  const setVis = (what, on) => game(`
    const w = SS.__world;
    if (args[0] === 'fx') {
      w.scene.traverse(o => { if (o.name && o.name.startsWith('fx-')) o.visible = args[1]; });
    } else {
      for (const b of w.sling.bands) b.tube.group.visible = args[1];
    }
    SS.__render();
    return true;`, what, on);

  let n = 0;
  const cap = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png` });
    n++;
  };

  let t = 0;
  for (const want of TS) {
    if (want > t) { await game('await SS.seek(args[0]);', want - t); t = want; }
    await game('SS.__render();');
    const p = await probe();
    perT[want] = { anchorPx: p.anchorPx, adPx: info.ad * p.pxPerWorld };
    await cap(`A-t${want}`);
    await setVis('fx', false);  await cap(`NOFX-t${want}`);  await setVis('fx', true);
    await setVis('band', false); await cap(`NOBAND-t${want}`); await setVis('band', true);
    await game('SS.__render();');
  }

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/geom.json`, JSON.stringify(
    { ...geom, adPx, ts: TS, ad: info.ad, muzzleAD: info.muzzleAD,
      angle: ANGLE, power: POWER, perT }, null, 2));
  say('shots', n);
  console.log('### DONE');
};
