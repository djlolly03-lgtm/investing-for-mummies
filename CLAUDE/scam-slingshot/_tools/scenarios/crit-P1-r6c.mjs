/**
 * CRITIC P1 r6 — part C. Per-particle anatomy of the release burst.
 * Does the lance GRADE (size / brightness / density varying along its length), or is it the
 * same sparkle repeated at even spacing? Measured, not eyeballed.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ game, shot, state, dragShot, OUT }) => {
  const M = {};
  const log = (k, v) => { M[k] = v; console.log('#', k, JSON.stringify(v)); };

  const anat = () => game(`
    const w=SS.__world, s=w.sling;
    const ammo=(w.projectiles||[])[0];
    const px=s.pouch.x, py=s.pouch.y;
    const ax=ammo?ammo.mesh.position.x:1, ay=ammo?ammo.mesh.position.y:0;
    const dx=ax-px, dy=ay-py, L=Math.hypot(dx,dy)||1; const ux=dx/L, uy=dy/L;
    const rows=[];
    for (const [k,p] of Object.entries(w.fx?w.fx.pools:{})) {
      for (let i=0;i<p.max;i++) if (p.p.life[i]>0) {
        const rx=p.p.x[i]-px, ry=p.p.y[i]-py;
        rows.push({ k, along:+(rx*ux+ry*uy).toFixed(3), perp:+(rx*-uy+ry*ux).toFixed(3),
          sx:+p.p.sx[i].toFixed(4), sy:+p.p.sy[i].toFixed(4),
          life:+p.p.life[i].toFixed(3), max:+p.p.max[i].toFixed(3),
          alpha:+p.alpha.array[i].toFixed(3),
          col:[+p.mesh.instanceColor.array[i*3].toFixed(3),
               +p.mesh.instanceColor.array[i*3+1].toFixed(3),
               +p.mesh.instanceColor.array[i*3+2].toFixed(3)] });
      }
    }
    return { L:+L.toFixed(3), n:rows.length, rows };`);

  const summarise = (a) => {
    const sp = a.rows.filter(r => r.k === 'spark4');
    if (!sp.length) return { n: 0 };
    const q = (arr, f) => { const b = [...arr].sort((x, y) => x - y); return +b[Math.floor(f * (b.length - 1))].toFixed(4); };
    const sz = sp.map(r => r.sx), al = sp.map(r => Math.abs(r.along)), pe = sp.map(r => Math.abs(r.perp));
    const alp = sp.map(r => r.alpha);
    // density in 5 bins along the lance
    const bins = [0, 0, 0, 0, 0];
    for (const r of sp) bins[Math.min(4, Math.max(0, Math.floor(5 * r.along / a.L)))]++;
    // mean size per bin, to see if it grades
    const bsz = [0, 0, 0, 0, 0], bn = [0, 0, 0, 0, 0];
    for (const r of sp) { const b = Math.min(4, Math.max(0, Math.floor(5 * r.along / a.L))); bsz[b] += r.sx; bn[b]++; }
    // colour spread
    const hues = sp.map(r => { const [R, G, B] = r.col; const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx === mn) return 0; let h;
      if (mx === R) h = ((G - B) / (mx - mn)) % 6; else if (mx === G) h = (B - R) / (mx - mn) + 2; else h = (R - G) / (mx - mn) + 4;
      return +(60 * h + 360).toFixed(1) % 360; });
    return { n: sp.length, lanceLen: a.L,
      size: { min: q(sz, 0), p25: q(sz, .25), med: q(sz, .5), p75: q(sz, .75), max: q(sz, 1),
        ratioMaxMin: +(q(sz, 1) / Math.max(1e-6, q(sz, 0))).toFixed(2),
        cv: +(Math.sqrt(sz.reduce((s, v) => s + (v - sz.reduce((a2, b2) => a2 + b2, 0) / sz.length) ** 2, 0) / sz.length) /
             (sz.reduce((a2, b2) => a2 + b2, 0) / sz.length)).toFixed(3) },
      alpha: { min: q(alp, 0), med: q(alp, .5), max: q(alp, 1) },
      alongAbs: { min: q(al, 0), med: q(al, .5), max: q(al, 1) },
      perpAbs: { med: q(pe, .5), p90: q(pe, .9), max: q(pe, 1) },
      densityBins_pouch_to_head: bins,
      meanSizeBins: bsz.map((v, i) => bn[i] ? +(v / bn[i]).toFixed(4) : null),
      hueDistinctCount: new Set(hues.map(h => Math.round(h / 15))).size,
      hueSample: hues.slice(0, 12) };
  };

  await game('SS.seed(2025); await SS.seek(1500);');
  await dragShot(0.30, 0.95, { steps: 12 });
  const rel = await game('return SS.release();');
  log('release', { ad: rel.ad, muzzleAD: rel.muzzleAD, exitSpeed: rel.exitSpeed });
  for (const [label, adv] of [['t0', 0], ['t40', 40], ['t80', 40]]) {
    if (adv) await game('await SS.seek(args[0]);', adv);
    const a = await anat();
    log(`anatomy_${label}`, summarise(a));
    if (label === 't0') await writeFile(path.join(OUT, 'particles-t0.json'), JSON.stringify(a, null, 1));
  }

  await writeFile(path.join(OUT, 'measure.json'), JSON.stringify(M, null, 1));
  console.log('WROTE measure.json');
};
