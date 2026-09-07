/**
 * P3 r3 — GLASS, the one thing this round owns.
 *
 *   01 aim-l1                the game's own framing, untouched (this is the frame the critic sees)
 *   02 glass-column-LOCKED   the probe column close, for the material read
 *   03 shatter FILMSTRIP     0 -> 480 ms in 60 ms steps, from the first fragment
 *   04 glass-shards-LOCKED   the shards close, while the probe level is still IN PLAY
 *   05 settled-pile-l1       real level, one shot, settled
 *   06 mixed-carnage         real level, two shots — is debris still sorted by material?
 *
 * probe.json carries the on-screen rect of every block + every debris piece so that
 * "is glass the brightest thing on screen" is MEASURED at known pixels, never eyeballed.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROBE = `
  const w = SS.__world, cam = w.camera, r = w.renderer;
  const W = r.domElement.clientWidth, H = r.domElement.clientHeight;
  const V3 = w.scene.position.constructor;
  const proj = (x, y, z = 0.55) => {
    const v = new V3(x, y, z);
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
    const p2 = proj(t.x + (d.w || 0.2) / 2, t.y + (d.h || 0.2) / 2);
    out.debris.push({ mat: d.matName, cx: p[0], cy: p[1],
                      hw: Math.abs(p2[0] - p[0]), hh: Math.abs(p2[1] - p[1]) });
  }
  return out;
`;

export default async ({ game, shot, filmstrip, state, OUT }) => {
  const probes = {};

  // 01 — the real level at its own framing
  await game(`await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1400);`);
  await shot('aim-l1');
  probes.aimL1 = await game(PROBE);

  // 02 — the glass column, locked
  await game(`await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
              SS.camLock({ x: 18, y: 2.1, halfWidth: 5.2 }); await SS.seek(60);`);
  await shot('glass-column-LOCKED');
  probes.column = await game(PROBE);

  // 03 — THE BREAK. angle/power come from `p3-r3-sweep.mjs`, which swept 24 shots and
  // reported which ones actually put debris on the ground: 0.24/1.0 (the round-2 scenario's
  // shot) sails clean over the column and kills the villain, so the round-2 "shatter"
  // filmstrip was nine tiles of an intact column. 0.18/0.86 lands on it at t=840 ms.
  await game(`SS.camUnlock(); await SS.seek(30);
              SS.aim({angle:0.18,power:0.86}); SS.release();
              let t=0; for(;t<3000;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }`);
  console.log('### phase at first fragment ' + JSON.stringify(await state()));
  await game(`SS.camLock({ x: 18.2, y: 1.9, halfWidth: 3.4 });`);
  await filmstrip('shatter-LOCKED', { from: 0, to: 480, step: 60, cols: 3 });

  await game(`await SS.seek(900);`);
  console.log('### phase at shard close-up ' + JSON.stringify(await state()));
  await shot('glass-shards-LOCKED');
  probes.shards = await game(PROBE);

  // 05 — the wreckage on the real level, with the level still IN PLAY.
  // 0.20/1.0 breaks two blocks and leaves one villain alive, so the frame is real wreckage
  // and NOT dimmed by the level-clear overlay. (0.14/0.86 is the one-shot clear — it kills
  // both villains, the world desaturates behind the tally, and every luminance measured off
  // that frame is a measurement of the overlay.)
  await game(`SS.camUnlock(); await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
              SS.aim({angle:0.20,power:1.0}); SS.release(); await SS.seek(4200);`);
  console.log('### phase after l1 shot ' + JSON.stringify(await state()));
  await shot('settled-pile-l1');
  probes.settled = await game(PROBE);

  await game(`SS.camLock({ x: 20.4, y: 1.6, halfWidth: 5.4 }); await SS.seek(60);`);
  await shot('settled-pile-LOCKED');
  probes.settledLocked = await game(PROBE);

  // 06 — mid-collapse on the one-shot clear, at +900 ms: the structure is still hinging
  // apart, all three materials are fragmenting at once, and the tally has not dimmed it yet.
  await game(`SS.camUnlock(); await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
              SS.aim({angle:0.14,power:0.86}); SS.release(); await SS.seek(900);`);
  console.log('### phase mid-collapse ' + JSON.stringify(await state()));
  await shot('mixed-carnage');
  probes.carnage = await game(PROBE);

  // 07 — THE MONEY SHOT. The glass break inside the real level, framed on the structure,
  // 60 ms steps from the first fragment. This is the frame this piece is judged on.
  await game(`SS.camUnlock(); await SS.loadLevel('l1'); await SS.seed(7); await SS.seek(1200);
              SS.aim({angle:0.14,power:0.86}); SS.release();
              let t=0; for(;t<3000;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
              SS.camLock({ x: 18.6, y: 3.0, halfWidth: 6.4 });`);
  console.log('### phase at l1 first fragment ' + JSON.stringify(await state()));
  await filmstrip('l1-glass-break', { from: 0, to: 480, step: 60, cols: 3 });

  await writeFile(path.join(OUT, 'probe.json'), JSON.stringify(probes, null, 1));
  console.log('### PROBE written');
};
