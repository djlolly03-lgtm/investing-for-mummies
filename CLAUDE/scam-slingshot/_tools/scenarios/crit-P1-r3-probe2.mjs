/**
 * crit-P1-r3-probe2.mjs — CRITIC re-measurement in WORLD space.
 * The first pass measured the lance along a screen axis anchored on a pouch pixel
 * captured BEFORE release; the camera then pans, so that pixel is no longer the pouch.
 * World space removes the camera entirely. AD here is release_info.ad (world units).
 */
export default async ({ game, state, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  await game('SS.seed(11); await SS.seek(2000);');
  say('rig_keys', await game('return Object.keys(SS.__world.rig);'));
  say('rig_shakeish', await game(`
    const r = SS.__world.rig; const out = {};
    for (const k of Object.keys(r)) { const v = r[k];
      if (typeof v === 'number') out[k] = +v.toFixed(5); }
    return out;`));

  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');

  const res = await game(`
    const w = SS.__world, s = w.sling;
    const info = await SS.release();
    const AD = info.ad;
    const anchor = { x: s.anchor.x, y: s.anchor.y };
    const out = { info, AD, samples: [] };
    let t = 0;
    for (let i = 0; i <= 45; i++) {
      const p0 = w.projectiles && w.projectiles[0];
      const px = p0 ? p0.body.translation() : null;
      const pouch = { x: s.pouch.x, y: s.pouch.y };
      // shot axis in WORLD space: anchor -> projectile
      let ax = 1, ay = 0;
      if (px) { ax = px.x - anchor.x; ay = px.y - anchor.y;
        const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L; }
      const pool = w.fx.pools.spark4, P = pool.p;
      const along = [], perp = [], sizes = [];
      for (let j = 0; j < pool.max; j++) if (P.life[j] > 0) {
        const dx = P.x[j] - anchor.x, dy = P.y[j] - anchor.y;
        along.push(dx * ax + dy * ay);
        perp.push(Math.abs(dx * -ay + dy * ax));
        sizes.push([P.sx[j], P.sy[j]]);
      }
      const srt = [...along].sort((a, b) => a - b);
      const sx = sizes.map(v => v[0]).sort((a, b) => a - b);
      const sy = sizes.map(v => v[1]).sort((a, b) => a - b);
      const med = (a) => a.length ? a[Math.floor(a.length / 2)] : null;
      const ammoAlong = px ? ((px.x - anchor.x) * ax + (px.y - anchor.y) * ay) : null;
      const bins = new Array(26).fill(0);
      for (const v of along) { const b = Math.floor(v / AD); if (b >= 0 && b < 26) bins[b]++; }
      out.samples.push({ t: Math.round(t), n: along.length,
        state: s.state,
        pouchAlong: +(((pouch.x - anchor.x) * ax + (pouch.y - anchor.y) * ay) / AD).toFixed(3),
        ammoAD: ammoAlong != null ? +(ammoAlong / AD).toFixed(2) : null,
        tailAD: along.length ? +(Math.min(...along) / AD).toFixed(2) : null,
        headAD: along.length ? +(Math.max(...along) / AD).toFixed(2) : null,
        medAD: along.length ? +(med(srt) / AD).toFixed(2) : null,
        p25AD: along.length ? +(srt[Math.floor(srt.length * 0.25)] / AD).toFixed(2) : null,
        p75AD: along.length ? +(srt[Math.floor(srt.length * 0.75)] / AD).toFixed(2) : null,
        fanAD: perp.length ? +(Math.max(...perp) / AD).toFixed(2) : null,
        medSxAD: sx.length ? +(med(sx) / AD).toFixed(3) : null,
        medSyAD: sy.length ? +(med(sy) / AD).toFixed(3) : null,
        maxSxAD: sx.length ? +(sx[sx.length - 1] / AD).toFixed(3) : null,
        bins,
      });
      await SS.seek(10); t += 10;
    }
    return out;`);

  const A = res.samples;
  say('AD_world', res.AD);
  say('release_info', res.info);
  say('lance_world', A.filter(s => [0, 10, 20, 30, 50, 80, 100, 150, 200, 250, 300, 400].includes(s.t))
    .map(s => ({ t: s.t, n: s.n, ammoAD: s.ammoAD, pouchAD: s.pouchAlong,
      tail: s.tailAD, p25: s.p25AD, med: s.medAD, p75: s.p75AD, head: s.headAD,
      headMinusAmmo: s.headAD != null && s.ammoAD != null ? +(s.headAD - s.ammoAD).toFixed(2) : null,
      fan: s.fanAD, medSx: s.medSxAD, medSy: s.medSyAD })));
  say('bins_t0', A.find(s => s.t === 0).bins);
  say('bins_t50', A.find(s => s.t === 50).bins);
  say('bins_t100', A.find(s => s.t === 100).bins);
  say('bins_t200', A.find(s => s.t === 200).bins);
  console.log('### DONE');
};
