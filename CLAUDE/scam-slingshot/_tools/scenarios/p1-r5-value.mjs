/**
 * p1-r5-value.mjs — BUILDER measurement of the r4 critic's actual complaint:
 *
 *   "The release burst has no value contrast against our own sky ... ours dL* = 22.3 across
 *    the burst corridor and 30.3 at the fork ... at the 40px test our entire launch event
 *    disappears."
 *
 * Method. The same shot is fired TWICE from the same seed:
 *   A — normally
 *   B — with `fx.enabled = false`, i.e. the identical world with the burst deleted, and the
 *       camera punch re-applied by hand so the two runs frame identically (the punch lives
 *       in the same launch handler the FX layer does, so disabling FX would otherwise shift
 *       every pixel by up to 2 %H and poison a per-pixel diff).
 *
 * B is therefore the exact background the burst is drawn over, per pixel. Everything about
 * value contrast is then a straight L*(A) vs L*(B) comparison in `p1-r5-value.py`; nothing
 * has to guess where the sky ends.
 *
 * Writes: A-t*.png, B-t*.png, geom.json (anchor / shot axis / AD, all in PNG pixels).
 */
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

const TS = [0, 40, 80, 120, 180, 260];

export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  const geomJs = `
    const w = SS.__world, cam = w.camera, s = w.sling;
    const VW = innerWidth, VH = innerHeight;
    const applyM = (m, p) => { const e = m.elements;
      const iw = 1 / (e[3]*p[0] + e[7]*p[1] + e[11]*p[2] + e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
              (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
              (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw]; };
    const proj = (x, y) => { let p = applyM(cam.matrixWorldInverse, [x, y, 0]);
      p = applyM(cam.projectionMatrix, p);
      return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH]; };
    return { proj: 1, VW, VH, anchor: proj(s.anchor.x, s.anchor.y),
             unitX: proj(s.anchor.x + 1, s.anchor.y), unitY: proj(s.anchor.x, s.anchor.y + 1) };`;

  const run = async (label, withFx) => {
    await game('SS.seed(11); await SS.seek(2000);');
    await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
    await game('SS.__world.fx.enabled = args[0];', !!withFx);
    const info = await game(`
      const r = await SS.release();
      // Run B has no FX layer, so nothing called rig.punch(). Reproduce it exactly, from the
      // same numbers fx/index.js uses, or the two runs do not frame alike.
      if (!SS.__world.fx.enabled) SS.__world.rig.punch(0.16 + r.power * 0.26, 15);
      return r;`);
    const geom = await game(geomJs);
    let t = 0;
    for (const target of TS) {
      if (target > t) { await game('await SS.seek(args[0]);', target - t); t = target; }
      await page.screenshot({ path: path.join(OUT, `${label}-t${target}.png`) });
    }
    return { info, geom };
  };

  const A = await run('A', true);
  const B = await run('B', false);
  say('release', { ad: A.info.ad, muzzleAD: A.info.muzzleAD, power: A.info.power,
                   angle: A.info.angle, exitSpeed: A.info.exitSpeed });
  // AD in CSS px: project the ammo diameter (a world length) through the camera by
  // differencing two projected points one world unit apart on the vertical.
  const g = A.geom;
  const pxPerWorld = Math.hypot(g.unitY[0] - g.anchor[0], g.unitY[1] - g.anchor[1]);
  const axis = [g.unitX[0] - g.anchor[0], g.unitX[1] - g.anchor[1]];
  const aLen = Math.hypot(axis[0], axis[1]);
  const ang = A.info.angle;
  // shot axis in SCREEN space: world (cos a, sin a) with y flipped by the projection
  const dir = [Math.cos(ang) * (axis[0] / aLen), -Math.sin(ang) * (axis[0] / aLen)];
  const dl = Math.hypot(dir[0], dir[1]);
  const geom = {
    dsf: 2,
    anchorPx: [g.anchor[0] * 2, g.anchor[1] * 2],
    dir: [dir[0] / dl, dir[1] / dl],
    adPx: A.info.ad * pxPerWorld * 2,
    muzzleAD: A.info.muzzleAD,
    vw: g.VW * 2, vh: g.VH * 2,
    ts: TS,
  };
  await writeFile(path.join(OUT, 'geom.json'), JSON.stringify(geom, null, 2));
  say('geom', geom);
  console.log('### DONE');
};
