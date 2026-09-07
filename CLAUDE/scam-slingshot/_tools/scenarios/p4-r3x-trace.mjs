/**
 * p4-r3x-trace.mjs — per-step trace of the arrival solve: what the composition ASKED for
 * (want.x, the solved mark, the predicted contact) against what the camera actually did.
 * This is the file that tells you whether a miss is a solve error or a tracking lag.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRE, TRACE } from './_p4measure.mjs';

const SHOTS = [[0.30, 0.90], [0.20, 1.00], [0.26, 0.90]];

export default async ({ game, OUT }) => {
  const g = (b, ...a) => game(PRE + TRACE + b, ...a);
  const all = {};
  for (const [angle, power] of SHOTS) {
    const rows = await g(`
      await SS.seed(3); await SS.seek(2600);
      SS.aim({ angle: args[0], power: args[1] }); await SS.seek(300);
      SS.release(); SS.freeze();
      const out = [];
      for (let t = 0; t <= 900; t += 20) {
        const s = shot();
        if (s) {
          const L = rig._lead || {};
          out.push({ t, ...s,
            camx: +rig.pos.x.toFixed(3), wantx: +rig.want.x.toFixed(3),
            lagX: +(rig.want.x - rig.pos.x).toFixed(3),
            dist: +rig.dist.toFixed(2), wantDist: +rig.wantDist.toFixed(2),
            velx: +rig.vel.x.toFixed(3), wvelx: +rig.wantVel.x.toFixed(3),
            leadD: L.d === null || L.d === undefined ? null : +L.d.toFixed(3),
            contactX: L.contactX === null || L.contactX === undefined ? null : +L.contactX.toFixed(3),
            zoom: L.zoom === undefined ? null : +L.zoom.toFixed(3),
            tracking: !!rig._tracking });
        }
        if (t < 900) await SS.seek(20);
      }
      return out;`, angle, power);
    const i = rows.findIndex((r, k) => k > 2 && r.t >= 200 && (r.blocks < rows[0].blocks || (rows[k - 1].vx > 4 && r.vx < rows[k - 1].vx * 0.6)));
    all[`${angle}_${power}`] = { rows, contactIdx: i };
    console.log(`\n=== aim ${angle} power ${power}   contact @ t=${i < 0 ? 'none' : rows[i].t}`);
    console.log('  t   px     vw    proj  struck  all   | predX  d    zoom  | camx   wantx  lag    vel   wvel  trk');
    for (const r of rows) {
      if (r.t < 120 || (i >= 0 && r.t > rows[i].t + 60)) continue;
      console.log(`${String(r.t).padStart(4)} ${String(r.x).padStart(6)} ${String(r.vw).padStart(6)} ` +
        `${String(r.projPctW).padStart(6)} ${String(r.struckPctW).padStart(6)} ${String(r.allPctW).padStart(6)} | ` +
        `${String(r.contactX).padStart(6)} ${String(r.leadD).padStart(6)} ${String(r.zoom).padStart(5)} | ` +
        `${String(r.camx).padStart(6)} ${String(r.wantx).padStart(6)} ${String(r.lagX).padStart(6)} ` +
        `${String(r.velx).padStart(6)} ${String(r.wvelx).padStart(6)} ${r.tracking ? 'T' : '.'}`);
    }
  }
  await writeFile(path.join(OUT, 'TRACE.json'), JSON.stringify(all, null, 1));
};
