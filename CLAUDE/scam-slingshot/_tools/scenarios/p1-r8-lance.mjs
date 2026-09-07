/**
 * p1-r8-lance.mjs — THE r7-critic METRIC: the shape of the lance along the shot axis.
 *
 * The r7 critic measured our launch trail "tapered backwards": half-width 0.23 AD at 4–6 AD
 * from the fork growing to 0.78–0.85 AD at 12–14 AD, which is exactly where the dart is — so
 * the widest, densest end of the trail sat ON the projectile and engulfed a ~1 AD silhouette,
 * with 26–31 sparkles inside 2 AD of the ammo from t = 0 to t = 100 ms.
 *
 * Method is `p1-r6-bandvfx.mjs`'s honest isolation, extended: three renders of the SAME
 * simulated instant via SS.__render() (shipped / fx hidden / band hidden), so the VFX pixel
 * set is a DIFFERENCE and needs no colour guess, and a band buried under the burst correctly
 * counts as zero band pixels. What is new here is that it also records the PROJECTILE's screen
 * position at every timestamp, which is what lets the analyser bin the VFX along the real
 * pouch->ammo axis and say where the trail ends relative to the shot.
 *
 * Writes A/NOFX/NOBAND PNGs + geom.json. Analysed by `_tools/p1-r8-lance.py`.
 * Run it alongside `p1-r6-bandvfx.mjs` after ANY change to LANCE — the two metrics pull in
 * opposite directions (moving trail mass off the ammo moves it toward the sling, where the
 * band has to keep winning the pixel count) and neither is allowed to buy the other.
 */
export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const TS = [0, 30, 50, 60, 100, 150];
  const ANGLE = +(process.env.P1_ANGLE ?? 0.42);
  const POWER = +(process.env.P1_POWER ?? 0.90);
  say('shot', { angle: ANGLE, power: POWER });

  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(400);', ANGLE, POWER);
  const info = await game('return await SS.release();');
  say('release', { ad: info.ad, muzzleAD: info.muzzleAD, power: info.power, ammo: info.ammo });

  /** Pouch + live projectile, both projected with the game's own camera, every timestamp. */
  const probe = () => game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const r = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const P = (x,y) => { const v = new V3(x,y,0).project(cam);
      return [ (v.x*0.5+0.5)*r.width, (-v.y*0.5+0.5)*r.height ]; };
    const halfH = Math.abs(cam.position.z) * Math.tan(cam.fov*Math.PI/360);
    const shot = w.projectiles[w.projectiles.length - 1];
    const m = shot && shot.mesh ? shot.mesh.position : null;
    return { anchorPx: P(s.anchor.x, s.anchor.y),
             ammoPx: m ? P(m.x, m.y) : null,
             ammoWorld: m ? { x: m.x, y: m.y } : null,
             pxPerWorld: (r.height/2)/halfH,
             cssW: r.width, cssH: r.height, dpr: devicePixelRatio };`);

  const setVis = (what, on) => game(`
    const w = SS.__world;
    if (args[0] === 'fx') {
      w.scene.traverse(o => { if (o.name && o.name.startsWith('fx-')) o.visible = args[1]; });
    } else {
      for (const b of w.sling.bands) b.tube.group.visible = args[1];
    }
    SS.__render();
    return true;`, what, on);

  const cap = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

  const perT = {};
  let t = 0;
  for (const want of TS) {
    if (want > t) { await game('await SS.seek(args[0]);', want - t); t = want; }
    await game('SS.__render();');
    const p = await probe();
    perT[want] = { anchorPx: p.anchorPx, ammoPx: p.ammoPx, adPx: info.ad * p.pxPerWorld };
    await cap(`A-t${want}`);
    await setVis('fx', false);   await cap(`NOFX-t${want}`);   await setVis('fx', true);
    await setVis('band', false); await cap(`NOBAND-t${want}`); await setVis('band', true);
    await game('SS.__render();');
  }

  const fs = await import('node:fs/promises');
  const g0 = await probe();
  await fs.writeFile(`${OUT}/geom.json`, JSON.stringify(
    { ...g0, ts: TS, ad: info.ad, muzzleAD: info.muzzleAD, adPx: info.ad * g0.pxPerWorld,
      angle: ANGLE, power: POWER, perT }, null, 2));
  console.log('### DONE');
};
