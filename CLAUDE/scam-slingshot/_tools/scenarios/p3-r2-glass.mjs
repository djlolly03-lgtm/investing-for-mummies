/**
 * P3 r2 — GLASS. The one thing this round owns.
 *
 * Shots, in order:
 *   01 aim-l1              the game's own framing, mixed materials, nothing touched
 *   02 glass-column        camLock on the glass probe column (geometry read, NOT composition)
 *   03 shatter FILMSTRIP   the break, 0 -> 480 ms in 60 ms steps
 *   04 settled-pile        the wreckage at rest
 *   05 mixed-carnage       l1 after two shots — is the debris still sorted by material?
 *
 * Also writes `probe.json`: the on-screen rect of every glass block plus a sky sample
 * point, so the luminance/40px measurements are taken at known pixels rather than by eye.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROBE = `
  const w = SS.__world, cam = w.camera, r = w.renderer;
  const size = r.getSize(new (Object.getPrototypeOf(w.camera.position).constructor)());
  const W = r.domElement.clientWidth, H = r.domElement.clientHeight;
  const proj = (x, y) => {
    const v = new (w.scene.position.constructor)(x, y, 0.55);
    v.project(cam);
    return [ (v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H ];
  };
  const out = { W, H, blocks: [], debris: [] };
  for (const b of w.blocks) {
    const t = b.body.translation();
    const p = proj(t.x, t.y);
    const p2 = proj(t.x + b.w / 2, t.y + b.h / 2);
    out.blocks.push({ mat: b.matName, cx: p[0], cy: p[1],
                      hw: Math.abs(p2[0] - p[0]), hh: Math.abs(p2[1] - p[1]) });
  }
  for (const d of w.debris) {
    const t = d.body.translation();
    const p = proj(t.x, t.y);
    out.debris.push({ mat: d.matName, cx: p[0], cy: p[1], w: d.w, h: d.h });
  }
  return out;
`;

export default async ({ game, shot, filmstrip, OUT }) => {
  const probes = {};

  // --- 01 the real level at its own framing ---------------------------------
  await game(`await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1400);`);
  await shot('aim-l1');
  probes.aimL1 = await game(PROBE);

  // --- 02 the glass column, locked so a shard is readable -------------------
  await game(`await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
              SS.camLock({ x: 18, y: 2.1, halfWidth: 5.2 }); await SS.seek(60);`);
  await shot('glass-column-LOCKED');
  probes.column = await game(PROBE);

  // --- 03 the break ---------------------------------------------------------
  await game(`SS.camUnlock(); await SS.seek(30);
              SS.aim({angle:0.24,power:1.0}); SS.release();
              let t=0; for(;t<2600;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }`);
  await filmstrip('shatter', { from: 0, to: 480, step: 60, cols: 3 });

  // the shards, close, while the probe level is still IN PLAY (its villain dies a beat later
  // and the level-clear overlay dims the whole world — screenshot that and you photograph
  // the panel, not the wreckage)
  await game(`SS.camLock({ x: 18.6, y: 1.2, halfWidth: 4.4 }); await SS.seek(420);`);
  console.log('### phase at shard close-up ' + JSON.stringify(await state()));
  await shot('glass-shards-LOCKED');
  probes.shards = await game(PROBE);

  // --- 04 the settled pile, on the real level so nothing ends --------------
  await game(`SS.camUnlock(); await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
              SS.aim({angle:0.30,power:1.0}); SS.release(); await SS.seek(4200);`);
  console.log('### phase after l1 shot 1 ' + JSON.stringify(await state()));
  await shot('settled-pile-l1');
  probes.settled = await game(PROBE);

  await game(`SS.camLock({ x: 21.5, y: 1.6, halfWidth: 6.0 }); await SS.seek(60);`);
  await shot('settled-pile-LOCKED');
  probes.settledLocked = await game(PROBE);

  // --- 05 mixed carnage -----------------------------------------------------
  await game(`SS.camUnlock(); await SS.seek(30);
              SS.aim({angle:0.20,power:1.0}); SS.release(); await SS.seek(3600);`);
  await shot('mixed-carnage');
  probes.carnage = await game(PROBE);

  await writeFile(path.join(OUT, 'probe.json'), JSON.stringify(probes, null, 1));
  console.log('### PROBE written');
};
