/**
 * p4-r3x-probe.mjs — where does the shot ACTUALLY make contact, and what does that make the
 * criterion-4 geometry?  Numbers only; no pictures.
 *
 * Criterion 4 wants proj ∈ [55,75] %W and struct ∈ [40,60] %W at the same time. Since a shot
 * travelling right meets the structure's left half, struct − proj = 100·d/vw with d > 0, and
 * the bands overlap only on [55,60], so the pair fits **iff vw ≥ 20·d**. That single number is
 * what this probe measures, per shot and per reading of "the structure".
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRE, TRACE } from './_p4measure.mjs';

const SHOTS = [
  [0.20, 1.00], [0.24, 1.00], [0.28, 1.00], [0.30, 0.90], [0.34, 0.90],
  [0.30, 1.00], [0.36, 0.95], [0.40, 0.85], [0.22, 0.95], [0.26, 0.90],
];

export default async ({ game, OUT }) => {
  const g = (b, ...a) => game(PRE + TRACE + b, ...a);
  const rows = [];
  for (const [angle, power] of SHOTS) {
    const r = await g(`
      const rows = await fire(args[0], args[1], 1000, 20);
      const i = contactIdx(rows);
      const c = i < 0 ? null : rows[i];
      return { rows, i, c, aimVw: rows.length ? null : null };`, angle, power);
    const c = r.c;
    rows.push({
      angle, power, hit: !!c, tMs: c && c.t, px: c && c.x, vw: c && c.vw,
      proj: c && c.projPctW, struck: c && c.struckPctW, all: c && c.allPctW, area: c && c.areaPctW,
      dStruck: c && +(c.struckMidX - c.x).toFixed(3),
      dAll: c && +(c.allMidX - c.x).toFixed(3),
      dArea: c && +(c.areaMidX - c.x).toFixed(3),
      vwNeedStruck: c && +(20 * (c.struckMidX - c.x)).toFixed(1),
      vwNeedAll: c && +(20 * (c.allMidX - c.x)).toFixed(1),
      vwNeedArea: c && +(20 * (c.areaMidX - c.x)).toFixed(1),
      clusters: c && c.clusters,
    });
  }
  await writeFile(path.join(OUT, 'PROBE.json'), JSON.stringify(rows, null, 1));
  console.log('angle power  hit  t   px     vw     proj  struck  all   area | d_struck d_all d_area | vwNeed struck/all/area');
  for (const r of rows) {
    if (!r.hit) { console.log(`${r.angle.toFixed(2)}  ${r.power.toFixed(2)}   MISS`); continue; }
    console.log(`${r.angle.toFixed(2)}  ${r.power.toFixed(2)}   hit ${String(r.tMs).padStart(4)} ${String(r.px).padStart(6)} ${String(r.vw).padStart(6)} ` +
      `${String(r.proj).padStart(6)} ${String(r.struck).padStart(6)} ${String(r.all).padStart(6)} ${String(r.area).padStart(6)} | ` +
      `${String(r.dStruck).padStart(6)} ${String(r.dAll).padStart(6)} ${String(r.dArea).padStart(6)} | ` +
      `${r.vwNeedStruck} / ${r.vwNeedAll} / ${r.vwNeedArea}`);
  }
};
