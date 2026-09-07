/**
 * p1-r4-burst.mjs — BUILDER measurement of the release burst, in WORLD space.
 *
 * Reproduces the three numbers the r3 critic used to fail the piece, so the fix can be
 * checked against the same yardstick:
 *   · fan half-width  (max |perp| of live launch sparkles about the shot axis), in AD
 *   · coverage of a 1.5-AD-diameter disc centred on the pouch, %
 *   · live particle count, and how many are parked inside 1 AD of the pouch
 *
 * Everything is in AD (rubric §1) and anchored on the sling's own anchor, so a camera move
 * cannot change a reading.
 */
export default async ({ game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');

  const res = await game(`
    const w = SS.__world, s = w.sling;
    const anchor = { x: s.anchor.x, y: s.anchor.y };
    const info = await SS.release();
    const AD = info.ad;
    // Shot axis, fixed for the whole measurement (the launch direction, not a live chase).
    const ax = Math.cos(info.angle), ay = Math.sin(info.angle);
    const out = { info, AD, samples: [] };

    /** Every live particle in the launch pools, in AD, relative to the ANCHOR. */
    const sample = () => {
      const rows = [];
      for (const key of ['spark4', 'flash']) {
        const pool = w.fx.pools[key]; if (!pool) continue;
        const P = pool.p;
        for (let j = 0; j < pool.max; j++) {
          if (P.life[j] <= 0) continue;
          const dx = P.x[j] - anchor.x, dy = P.y[j] - anchor.y;
          rows.push({
            pool: key,
            a: (dx * ax + dy * ay) / AD,            // along the shot axis
            p: (dx * -ay + dy * ax) / AD,           // perpendicular to it
            sx: P.sx[j] / AD, sy: P.sy[j] / AD,
            al: P.life[j] / P.max[j] < 0.25 ? (P.life[j] / P.max[j]) / 0.25 : 1,
          });
        }
      }
      return rows;
    };

    /**
     * Coverage of a disc of DIAMETER 1.5 AD centred on the POUCH, by the sparkles' own
     * quads. Rasterised on a 96x96 grid over the disc's bbox; a cell counts if any
     * particle's (axis-aligned) footprint contains its centre and the particle is not
     * essentially transparent. Rotation is ignored on purpose — these are near-square
     * sparkles and the metric only has to be monotone in "how much glitter is piled here".
     */
    const coverage = (rows, cx, cy, diamAD) => {
      const R = diamAD / 2, N = 96;
      let inside = 0, hit = 0;
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const x = cx - R + (ix + 0.5) * (2 * R / N);
        const y = cy - R + (iy + 0.5) * (2 * R / N);
        if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
        inside++;
        for (const r of rows) {
          if (r.al < 0.12) continue;
          if (Math.abs(x - r.a) <= r.sx / 2 && Math.abs(y - r.p) <= r.sy / 2) { hit++; break; }
        }
      }
      return inside ? +(hit / inside * 100).toFixed(1) : 0;
    };

    let t = 0;
    for (let i = 0; i <= 40; i++) {
      const rows = sample();
      // The burst is emitted AT THE ANCHOR (slingshot.js pins 'launch'.point there), so the
      // disc is centred there too; the live pouch swings +-0.35 AD during recoil and would
      // otherwise wobble the reading by itself.
      const pouch = { a: 0, p: 0 };
      const livePouch = ((s.pouch.x - anchor.x) * ax + (s.pouch.y - anchor.y) * ay) / AD;
      const perp = rows.map(r => Math.abs(r.p)).sort((a, b) => a - b);
      // The fan AT THE SLING: only sparkles still within 2.5 AD of the pouch count. A tip
      // sparkle 12 AD downrange is the lance, not the fan.
      const near = rows.filter(r => Math.hypot(r.a - pouch.a, r.p - pouch.p) <= 2.5);
      const nearPerp = near.map(r => Math.abs(r.p - pouch.p)).sort((a, b) => a - b);
      const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * f))] : null;
      const p0 = w.projectiles && w.projectiles[0];
      const px = p0 ? p0.body.translation() : null;
      out.samples.push({
        t: Math.round(t),
        n: rows.length,
        nSpark: rows.filter(r => r.pool === 'spark4').length,
        nFlash: rows.filter(r => r.pool === 'flash').length,
        within1AD: rows.filter(r => Math.hypot(r.a - pouch.a, r.p - pouch.p) <= 1).length,
        within2AD: rows.filter(r => Math.hypot(r.a - pouch.a, r.p - pouch.p) <= 2).length,
        cov15: coverage(rows, pouch.a, pouch.p, 1.5),
        fanMax: perp.length ? +q(perp, 0.999).toFixed(3) : null,
        fanNearMax: nearPerp.length ? +q(nearPerp, 0.999).toFixed(3) : null,
        fanNearP90: nearPerp.length ? +q(nearPerp, 0.90).toFixed(3) : null,
        headAD: rows.length ? +Math.max(...rows.map(r => r.a)).toFixed(2) : null,
        tailAD: rows.length ? +Math.min(...rows.map(r => r.a)).toFixed(2) : null,
        ammoAD: px ? +(((px.x - anchor.x) * ax + (px.y - anchor.y) * ay) / AD).toFixed(2) : null,
        pouchAD: +livePouch.toFixed(3),
      });
      await SS.seek(10); t += 10;
    }
    return out;`);

  say('AD_world', res.AD);
  say('release_info', {
    muzzleAD: res.info.muzzleAD, kickMs: res.info.kickMs, exitSpeed: res.info.exitSpeed,
    ad: res.info.ad,
  });
  const pick = [0, 20, 40, 60, 80, 100, 130, 160, 180, 200, 250, 300, 400];
  say('burst', res.samples.filter(s => pick.includes(s.t)).map(s => ({
    t: s.t, n: s.n, in1: s.within1AD, in2: s.within2AD, cov15: s.cov15,
    fanNear: s.fanNearMax, fanNearP90: s.fanNearP90, fanAll: s.fanMax,
    head: s.headAD, ammo: s.ammoAD,
  })));
  const at = (t) => res.samples.find(s => s.t === t);
  const g = (a, b) => (a && b && b !== 0) ? +(a / b).toFixed(2) : null;
  say('VERDICT', {
    fanGrowth_0_to_80: g(at(80).fanNearMax, at(0).fanNearMax),
    fanGrowth_0_to_100: g(at(100).fanNearMax, at(0).fanNearMax),
    cov_t0: at(0).cov15, cov_t80: at(80).cov15, cov_t180: at(180).cov15, cov_t250: at(250).cov15,
    covFalls: at(0).cov15 > at(80).cov15 && at(80).cov15 >= at(180).cov15,
    live_t0: at(0).n, live_t180: at(180).n, live_t200: at(200).n, live_t250: at(250).n,
    parked_t0: at(0).within1AD, parked_t180: at(180).within1AD, parked_t250: at(250).within1AD,
  });
  console.log('### DONE');
};
