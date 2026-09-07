/**
 * p1-r4-look.mjs — the release, seen properly.
 *
 * Two strips of the same shot:
 *   · a full-frame filmstrip, so the lance-to-ammo read is judgeable
 *   · CLIPPED crops centred on the sling, written as numbered PNGs for tiling, because at
 *     13 %W the whole point of this piece is about 90 px wide in a full frame.
 * The clip box is derived from the LIVE anchor projected through the game's own camera —
 * never hard-coded pixels (capture.mjs's aimPx note explains what those cost).
 */
export default async ({ page, game, filmstrip, shot, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
  await shot('aim-loaded');

  /** Where the sling is on screen right now, in CSS px. */
  const slingPx = () => game(`
    const w = SS.__world, s = w.sling;
    const V3 = w.camera.position.constructor;
    const v = new V3(s.anchor.x, s.anchor.y, 0).project(w.camera);
    const r = w.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x * .5 + .5) * r.width, y: r.top + (-v.y * .5 + .5) * r.height,
             W: r.width, H: r.height };`);

  const a = await slingPx();
  say('sling_px', a);
  // A window that holds the pouch and the first ~6 AD of the shot, biased up-and-right
  // because that is where the ammo and the wedge go.
  const CW = 700, CH = 420;
  const clip = {
    x: Math.max(0, Math.min(a.W - CW, a.x - CW * 0.26)),
    y: Math.max(0, Math.min(a.H - CH, a.y - CH * 0.62)),
    width: CW, height: CH,
  };
  say('clip', clip);

  await game('SS.release();');
  const label = (t) => page.evaluate((t, cx, cy) => {
    let el = document.getElementById('__strip_label');
    if (!el) {
      el = document.createElement('div');
      el.id = '__strip_label';
      el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
        'font:700 22px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.72);' +
        'padding:4px 10px;border-radius:8px';
      document.body.appendChild(el);
    }
    // Inside the CLIP box, not at the page origin — a label the crop cannot see is no label.
    el.style.left = (cx + 10) + 'px';
    el.style.top = (cy + 8) + 'px';
    el.textContent = t;
  }, t, clip.x, clip.y);

  let t = 0;
  for (let i = 0; i <= 12; i++) {
    await label(`t=${t}ms`);
    await page.screenshot({ path: `${OUT}/crop-${String(i).padStart(2, '0')}.png`, clip });
    t += 20;
    if (i < 12) await game('await SS.seek(20);');
  }
  await page.evaluate(() => document.getElementById('__strip_label')?.remove());

  // Reset and take the wide view of the same shot.
  await game('SS.seed(11); await SS.seek(2000); await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); SS.release();');
  await filmstrip('release-wide', { from: 0, to: 440, step: 40, cols: 4 });
  console.log('### DONE');
};
