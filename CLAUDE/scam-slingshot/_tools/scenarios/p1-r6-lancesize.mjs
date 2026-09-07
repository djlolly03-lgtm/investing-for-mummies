/**
 * p1-r6-lancesize.mjs — the realised geometry of the two release elements, in AD.
 *
 * The orchestrator's r6 ruling is that the release is TWO distinct things and both are made of
 * small bright points:
 *   (a) a FAN pinned at the pouch, widening and fading, that does NOT travel with the shot;
 *   (b) a TRAIL of small bright points marking the path the projectile has taken, which DOES
 *       extend far down the muzzle line.
 * This prints, per element, the sparkle-diameter distribution in AD and the along-axis extent
 * in AD at t = 0 / 30 / 60 / 100 / 150 ms — so "small and bright, 1/5–1/6 AD" and "the fan stays
 * at the sling while the trail reaches the shot" are numbers, not adjectives.
 *
 * Elements are separated by their emission signature, not by guesswork: the trail is emitted by
 * FX.lance() with grav 0.04 and drag LANCE.drag, the fan by burst('launchSpark') with the recipe
 * drag. We tag them at emission instead — see the `__p1tag` patch below.
 */
export default async ({ game }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  const ANGLE = +(process.env.P1_ANGLE ?? 0.42);
  const POWER = +(process.env.P1_POWER ?? 0.90);
  say('shot', { angle: ANGLE, power: POWER });
  await game('SS.seed(11); await SS.seek(2000);');

  // Tag every spark4 particle with which call emitted it. Wrapping the two emitters is exact
  // and needs no heuristic; the tag array is only read by this probe.
  await game(`
    const w = SS.__world, fx = w.fx;
    const pool = fx.pools.spark4;
    w.__tag = new Int8Array(pool.max);          // 0 none, 1 trail, 2 fan
    const mark = (before, v) => { for (let i=0;i<pool.max;i++) if (pool.p.life[i] > 0 && !before[i]) w.__tag[i] = v; };
    const snap = () => { const a = new Uint8Array(pool.max); for (let i=0;i<pool.max;i++) a[i] = pool.p.life[i] > 0 ? 1 : 0; return a; };
    const L = fx.lance.bind(fx), B = fx.burst.bind(fx);
    fx.lance = (...a) => { const s = snap(); const r = L(...a); mark(s, 1); return r; };
    fx.burst = (k, ...a) => { if (k !== 'launchSpark') return B(k, ...a);
      const s = snap(); const r = B(k, ...a); mark(s, 2); return r; };
    return true;`);

  await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(400);', ANGLE, POWER);
  const info = await game('return await SS.release();');
  say('release', { ad: info.ad, muzzleAD: info.muzzleAD, power: info.power });

  const sample = () => game(`
    const w = SS.__world, pool = w.fx.pools.spark4, P = pool.p, tag = w.__tag;
    const s = w.sling, a = s.anchor;
    // Pouch at release = the anchor; the axis is the shot direction.
    const v = w.__lastLaunchDir || { x: Math.cos(0.42), y: Math.sin(0.42) };
    const L = Math.hypot(v.x, v.y) || 1, ux = v.x/L, uy = v.y/L;
    const ad = args[0];
    const out = { trail: [], fan: [] };
    for (let i = 0; i < pool.max; i++) {
      if (P.life[i] <= 0 || !tag[i]) continue;
      if (!isFinite(P.x[i]) || !isFinite(P.y[i])) { out.nan = (out.nan||0)+1; continue; }
      const dx = P.x[i] - a.x, dy = P.y[i] - a.y;
      const along = (dx*ux + dy*uy) / ad, perp = Math.abs(-dx*uy + dy*ux) / ad;
      const rec = [ +along.toFixed(3), +perp.toFixed(3), +(P.sx[i]/ad).toFixed(4) ];
      (tag[i] === 1 ? out.trail : out.fan).push(rec);
    }
    return out;`, info.ad);

  const stat = (rows, j) => {
    if (!rows.length) return null;
    const v = rows.map(r => r[j]).sort((a, b) => a - b);
    const q = (p) => +v[Math.min(v.length - 1, Math.floor(p * v.length))].toFixed(3);
    return { n: v.length, min: q(0), p50: q(0.5), p90: q(0.9), max: +v[v.length - 1].toFixed(3) };
  };

  let t = 0;
  for (const want of [0, 41.7, 83.3, 125, 166.7, 200]) {
    if (want > t) { await game('await SS.seek(args[0]);', want - t); t = want; }
    const s = await sample();
    say('t' + Math.round(want), {
      nan: s.nan ?? 0,
      trail: { n: s.trail.length, along: stat(s.trail, 0), perp: stat(s.trail, 1), sizeAD: stat(s.trail, 2) },
      fan: { n: s.fan.length, along: stat(s.fan, 0), perp: stat(s.fan, 1), sizeAD: stat(s.fan, 2) },
    });
  }
  console.log('### DONE');
};
