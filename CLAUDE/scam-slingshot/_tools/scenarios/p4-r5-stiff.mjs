/** p4-r5-stiff.mjs — how tight must the tracking spring be for the arrival pan to DECELERATE? */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRE } from './p4-r5-lead.mjs';

const K = [110, 180, 260, 380, 550];

export default async ({ game, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const rows = [];
  for (const k of K) {
    await g(`await SS.seed(3); await SS.seek(2600);
             SS.__world.rig.compose.trackStiffness = ${k};
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
    const seg = tr.slice(0, (ci >= 0 ? ci : tr.length - 1) + 1);
    let drop = 0, vmax = 0, lag = 0;
    for (let i = 1; i < seg.length; i++) {
      vmax = Math.max(vmax, seg[i].camvx);
      drop = Math.max(drop, seg[i - 1].camvx - seg[i].camvx);
      if (seg[i].t >= 140) lag = Math.max(lag, seg[i].wantx - seg[i].camx);
    }
    let still = 0;
    for (let i = seg.length - 1; i > 0; i--) {
      if (Math.abs(seg[i].camx - seg[i - 1].camx) > 0.02) break;
      still += 20;
    }
    rows.push({ k, projPeak: Math.max(...seg.map(r => r.projPctW ?? 0)),
      camvxMax: +vmax.toFixed(1), dropStep: +drop.toFixed(1), lagMax: +lag.toFixed(3), stillMs: still,
      standMid: ci >= 0 ? tr[ci].standMidPctW : null, projAt: ci >= 0 ? tr[ci].projPctW : null });
  }
  await g('SS.__world.rig.compose.trackStiffness = 260;');  // shipped value, restored
  await writeFile(path.join(OUT, 'STIFF.json'), JSON.stringify(rows, null, 1));
  console.log('    k   projPeak  camvxMax  dropStep  lagMax  stillMs  standMid  projAt');
  for (const r of rows) console.log(`  ${String(r.k).padStart(3)}   ${String(r.projPeak).padStart(6)}    ${String(r.camvxMax).padStart(6)}    ${String(r.dropStep).padStart(6)}  ${String(r.lagMax).padStart(6)}    ${String(r.stillMs).padStart(4)}    ${String(r.standMid).padStart(6)}  ${String(r.projAt).padStart(6)}`);
};
