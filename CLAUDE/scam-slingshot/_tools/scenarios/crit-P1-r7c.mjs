/** crit-P1-r7c.mjs — burst pinning, measured from the RELEASED pouch (the fork), not the drawn one. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const out = { shots: [] };
  const setup = async () => {
    await game('SS.audioMute(true); return SS.seed(7);');
    await game('await SS.seek(700);');
  };

  for (const power of [0.5, 1.0]) {
    await setup();
    await dragShot(0.30, power, { steps: 12 });
    await game('await SS.seek(250);');
    const rel = await game('return SS.release();');
    const rows = await game(`
      const w = SS.__world, s = w.sling;
      const A = { x: s.anchor.x, y: s.anchor.y };            // the fork: where the pouch snaps back to
      const AD = args[0], ang = args[1];
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const rows = [];
      const sample = (i) => {
        const pr = w.projectiles?.length ? w.projectiles[w.projectiles.length-1] : null;
        const ax = pr?.mesh?.position.x ?? NaN, ay = pr?.mesh?.position.y ?? NaN;
        const buckets = [0,0,0,0,0,0];   // <1AD, 1-2, 2-3, 3-5, 5-8, >8 from the FORK
        let n = 0, perpNear = [], nearAmmo = 0;
        for (const key of ['spark4','flash']) {
          const pool = w.fx?.pools?.[key]; if (!pool) continue;
          const p = pool.p;
          for (let k = 0; k < pool.max; k++) {
            if (p.life[k] <= 0) continue;
            n++;
            const dx = p.x[k]-A.x, dy = p.y[k]-A.y;
            const d = Math.hypot(dx,dy)/AD;
            const b = d<1?0 : d<2?1 : d<3?2 : d<5?3 : d<8?4 : 5;
            buckets[b]++;
            if (d <= 2.5) perpNear.push(Math.abs(-dx*dir.y + dy*dir.x)/AD);
            if (Math.hypot(p.x[k]-ax, p.y[k]-ay)/AD <= 2.0) nearAmmo++;
          }
        }
        const q=(a,f)=>{ if(!a.length) return null; const b=[...a].sort((x,y)=>x-y);
          return +b[Math.min(b.length-1,Math.floor(b.length*f))].toFixed(3); };
        rows.push({ t:+(i*1000/120).toFixed(1), n, buckets,
          atSling: buckets[0]+buckets[1]+buckets[2],       // within 3 AD of the fork
          nearAmmo,
          fanHalfWidth: q(perpNear,0.90), fanMed: q(perpNear,0.5),
          ammoAD: +(Math.hypot(ax-A.x, ay-A.y)/AD).toFixed(2),
        });
      };
      sample(0);
      for (let i=1;i<=30;i++){ SS.stepOnce(); sample(i); }
      return rows;
    `, rel.ad, rel.angle);
    out.shots.push({ power, rel, rows });
  }

  // how much of the trajectory does the player actually see?  fire from the pouch WITHOUT the
  // muzzle jump by integrating the same launch analytically, and compare ranges.
  out.arc = await game(`
    const w = SS.__world, s = w.sling;
    return { gravity: w.physics?.world?.gravity ?? null, SLING: null };
  `);
  await writeFile(path.join(OUT, 'p1r7c.json'), JSON.stringify(out, null, 2));
  console.log('WROTE p1r7c.json');
};
