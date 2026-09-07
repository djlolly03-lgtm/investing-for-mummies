/**
 * p4-r5-pansweep.mjs — where should the arrival pan START?
 *
 * The anchor slide from the ball to the subject costs the projectile its screen mark: the
 * earlier it starts, the lower the ball's peak %W (rubric criterion 4a wants 55-75 %W
 * mid-flight) and the gentler the camera move. This sweeps `arrivePanAt` through the live
 * `rig.compose` and reports, per setting:
 *
 *   projPeak   the highest %W the ball reaches during the traverse   (want >= 55)
 *   camvxMax   peak camera pan rate in world units/s                 (lower is calmer)
 *   dropStep   the biggest single-step FALL in camera speed          (the clamp's bite)
 *   stillMs    how long the frame is dead still before contact       (want > 100 ms)
 *   standMid   the standing structure's centre at contact %W         (want 40-60)
 *   projAt     the ball's %W at contact
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRE } from './p4-r5-lead.mjs';

const AT = [0.42, 0.48, 0.54, 0.60, 0.66];

export default async ({ game, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const rows = [];
  for (const at of AT) {
    await g(`await SS.seed(3); await SS.seek(2600);
             SS.__world.rig.compose.arrivePanAt = ${at};
             SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();`);
    const tr = [];
    for (let t = 0; t <= 900; t += 20) {
      tr.push({ t, ...(await g('return frame();')) });
      if (t < 900) await g('await SS.seek(20);');
    }
    const n0 = tr[0].blocks;
    let ci = -1;
    for (let i = 2; i < tr.length; i++) {
      if (tr[i].t < 200) continue;
      if (tr[i].blocks < n0) { ci = i; break; }
      if (tr[i - 1].vx > 4 && tr[i].vx < tr[i - 1].vx * 0.6) { ci = i; break; }
    }
    const upto = ci >= 0 ? ci : tr.length - 1;
    const seg = tr.slice(0, upto + 1);
    let drop = 0, camvxMax = 0;
    for (let i = 1; i < seg.length; i++) {
      camvxMax = Math.max(camvxMax, seg[i].camvx);
      drop = Math.max(drop, seg[i - 1].camvx - seg[i].camvx);
    }
    // "still": camera x moving under 0.02 units per 20 ms sample (= 1 unit/s) up to contact
    let still = 0;
    for (let i = seg.length - 1; i > 0; i--) {
      if (Math.abs(seg[i].camx - seg[i - 1].camx) > 0.02) break;
      still += 20;
    }
    rows.push({
      at, projPeak: Math.max(...seg.map(r => r.projPctW ?? 0)),
      msAbove55: seg.filter(r => (r.projPctW ?? 0) >= 55).length * 20,
      camvxMax: +camvxMax.toFixed(1), dropStep: +drop.toFixed(1), stillMs: still,
      contactT: ci >= 0 ? tr[ci].t : null,
      standMid: ci >= 0 ? tr[ci].standMidPctW : null,
      projAt: ci >= 0 ? tr[ci].projPctW : null,
      standL: ci >= 0 ? tr[ci].standLeftPctW : null,
      standR: ci >= 0 ? tr[ci].standRightPctW : null,
    });
  }
  await g('SS.__world.rig.compose.arrivePanAt = 0.48;');   // shipped value, restored
  await writeFile(path.join(OUT, 'PANSWEEP.json'), JSON.stringify(rows, null, 1));
  console.log(' panAt  projPeak  ms>=55  camvxMax  dropStep  stillMs  contact  standMid  standL->standR  projAt');
  for (const r of rows) {
    console.log(`  ${r.at.toFixed(2)}   ${String(r.projPeak).padStart(6)}   ${String(r.msAbove55).padStart(4)}    ${String(r.camvxMax).padStart(6)}` +
      `    ${String(r.dropStep).padStart(6)}    ${String(r.stillMs).padStart(4)}    ${String(r.contactT).padStart(4)}` +
      `    ${String(r.standMid).padStart(6)}   ${String(r.standL).padStart(6)}->${String(r.standR).padStart(6)}` +
      `  ${String(r.projAt).padStart(6)}`);
  }
};
