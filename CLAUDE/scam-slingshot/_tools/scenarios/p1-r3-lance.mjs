/**
 * P1 round 3 — THE SPARK LANCE.
 *
 * The round-2 critic's measurement, restated so this file can be checked against it:
 *   · the ammo is muzzle-jumped 315 px (10.8 AD) clear of the pouch on frame one  — KEEP
 *   · the burst's LEADING particle only reached 197 px (63 % of the way), leaving 4.0 AD of
 *     empty sky between sling and ammo at t=0, widening to 6.4 AD by t=100 ms            — FIX
 *   · particles were BoxGeometry chips of median 0.31 AD / max 0.99 AD instead of hard
 *     sparkles at 1/5–1/6 AD                                                             — FIX
 *
 * So this scenario measures, per shot, in AD and in pixels:
 *   muzzleAD          how far the ammo is jumped        (must not regress below ~8)
 *   tipAD             how far the lance's leading sparkle reaches from the pouch
 *   gapAD             tip -> ammo, i.e. the hole in the sky. Must stay under ~1 AD to 100 ms
 *                     and must never go NEGATIVE (that would be the lance overtaking).
 *   coverage          tipAD / ammoAD — the fraction of the cut the lance actually bridges
 *   sizes             median / max on-screen sparkle diameter, in AD and in px
 *   n                 live release-burst particle count
 *
 * It ASSERTS at the end, so a regression fails the capture instead of quietly printing.
 */

const PRELUDE = `
const w = SS.__world;
const proj = (x, y) => {
  const V3 = w.camera.position.constructor;
  const v = new V3(x, y, 0).project(w.camera);
  const r = w.renderer.domElement.getBoundingClientRect();
  return [(v.x * 0.5 + 0.5) * r.width, (-v.y * 0.5 + 0.5) * r.height];
};
/** px per world unit, measured on the live camera at the play plane */
const pxPerWorld = () => {
  const a = proj(0, 0), b = proj(1, 0);
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
};
/**
 * Every live RELEASE-burst particle: the lance + its root fan + the muzzle core.
 * Deliberately not "every live particle" — smoke is a different silhouette and a different
 * criterion, and folding it in would flatter the size numbers.
 */
const burstParticles = () => {
  const fx = w.fx; if (!fx || !fx.pools) return [];
  const out = [];
  for (const key of ['spark4', 'flash', 'chip']) {
    const pool = fx.pools[key];
    if (!pool || !pool.p) continue;
    const P = pool.p;
    for (let i = 0; i < pool.max; i++) {
      if (P.life[i] <= 0) continue;
      // on-screen extent of the instance, in world units (max of the two axes)
      out.push({ pool: key, x: P.x[i], y: P.y[i], s: Math.max(P.sx[i], P.sy[i]) });
    }
  }
  return out;
};
const median = (a) => {
  if (!a.length) return 0;
  const s = a.slice().sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
`;

export default async function ({ page, shot, filmstrip, game, OUT }) {
  const G = (b, ...a) =>
    page.evaluate(new Function('...args', `const SS = window.SS; ${PRELUDE} return (async()=>{${b}})();`), ...a);
  const out = { shots: [] };

  const SHOTS = [[0.60, 1.00], [0.60, 0.80], [0.30, 1.00], [0.45, 0.60], [0.785, 1.00]];

  for (const [angle, power] of SHOTS) {
    await game('SS.seed(7); await SS.seek(1800);');
    const r = await G(`
      const [angle, power] = args;
      const s = w.sling;
      await SS.aim({ angle, power });
      await SS.seek(400);
      const rel = await SS.release();
      const PW = pxPerWorld();
      const AD = rel.ad;
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const ax = s.anchor.x, ay = s.anchor.y;
      const tiles = [];
      for (let t = 0; t <= 150; t += 25) {
        const p = w.projectiles.find(q => !q.dead && q.launched);
        const tr = p.body.translation();
        const ammoAD = ((tr.x - ax) * ux + (tr.y - ay) * uy) / AD;   // along the launch axis
        const bp = burstParticles();
        // The lance's TIP: the furthest release particle along the launch axis.
        let tip = 0;
        for (const q of bp) {
          const d = ((q.x - ax) * ux + (q.y - ay) * uy) / AD;
          if (d > tip) tip = d;
        }
        const sizes = bp.map(q => q.s / AD);
        tiles.push({
          t,
          ammoAD: +ammoAD.toFixed(2),
          tipAD: +tip.toFixed(2),
          gapAD: +(ammoAD - tip).toFixed(2),
          coverage: +(tip / ammoAD).toFixed(3),
          n: bp.length,
          medSizeAD: +median(sizes).toFixed(3),
          maxSizeAD: +Math.max(0, ...sizes).toFixed(3),
          medSizePx: +(median(sizes) * AD * PW).toFixed(1),
          maxSizePx: +(Math.max(0, ...sizes) * AD * PW).toFixed(1),
        });
        if (t < 150) await SS.seek(25);
      }
      return { angle, power, AD: +AD.toFixed(4), ADpx: +(AD * PW).toFixed(1),
               muzzleDist: rel.muzzleDist, muzzleAD: rel.muzzleAD,
               muzzlePx: +(rel.muzzleDist * PW).toFixed(0),
               speed: rel.speed, exitSpeed: rel.exitSpeed, tiles };
    `, angle, power);
    out.shots.push(r);
    const at = (ms) => r.tiles.find(x => x.t === ms);
    console.log(`  a=${angle.toFixed(2)} p=${power.toFixed(2)}  AD=${r.AD} (${r.ADpx}px)  ` +
      `muzzle=${r.muzzleAD}AD (${r.muzzlePx}px)`);
    for (const ms of [0, 50, 100]) {
      const x = at(ms);
      console.log(`      t=${String(ms).padStart(3)}ms  ammo=${x.ammoAD}AD  tip=${x.tipAD}AD  ` +
        `gap=${x.gapAD}AD  cover=${(x.coverage * 100).toFixed(0)}%  n=${x.n}  ` +
        `size med=${x.medSizeAD}AD/${x.medSizePx}px max=${x.maxSizeAD}AD/${x.maxSizePx}px`);
    }
  }

  /* ---------------------------------------------------------------- *
   * THE MONEY FILMSTRIPS
   * ---------------------------------------------------------------- */
  // Locked camera, so displacement between tiles is the shot and not the camera.
  // The lock is taken AFTER release(): release fires onLaunch -> rig.follow(), and a real
  // camera intent legitimately clears camLock, so locking first gives a strip that says
  // LOCKED in its filename and is not.
  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release(); SS.camLock({x:6.5,y:7.0,halfWidth:11});');
  await filmstrip('release-LOCKED-25ms', { from: 0, to: 150, step: 25, cols: 4 });
  await game('SS.camUnlock();');

  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release();');
  await filmstrip('release-GAME-50ms', { from: 0, to: 300, step: 50, cols: 4 });

  // The single most important frame in the piece, full size and on its own.
  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release(); SS.camLock({x:6.5,y:7.0,halfWidth:11});');
  await shot('release-frame-ZERO');
  await game('await SS.seek(80);');
  await shot('release-frame-80ms');
  await game('SS.camUnlock();');

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/lance.json`, JSON.stringify(out, null, 2));

  /* ---------------------------------------------------------------- *
   * ASSERTIONS — the gap this round exists to close
   * ---------------------------------------------------------------- */
  const bad = [];
  for (const s of out.shots) {
    const tag = `a=${s.angle} p=${s.power}`;
    for (const x of s.tiles) {
      if (x.t > 100) continue;
      if (x.gapAD < 0) bad.push(`${tag} t=${x.t}: lance OVERTOOK the ammo (gap ${x.gapAD} AD)`);
      if (x.gapAD > 1.05) bad.push(`${tag} t=${x.t}: gap ${x.gapAD} AD (want <= ~1)`);
    }
    const t0 = s.tiles[0];
    if (t0.coverage < 0.85) bad.push(`${tag} t=0: lance bridges only ${(t0.coverage * 100).toFixed(0)}%`);
    if (t0.medSizeAD > 0.24) bad.push(`${tag} t=0: median sparkle ${t0.medSizeAD} AD (want ~1/6)`);
    if (t0.maxSizeAD > 0.55) bad.push(`${tag} t=0: biggest particle ${t0.maxSizeAD} AD`);
    if (t0.n < 60) bad.push(`${tag} t=0: only ${t0.n} burst particles`);
    // P1 criterion 5, unchanged and not to be regressed by this round: "in the first
    // filmstrip tile >=50 ms after release the ammo is >=8 AD clear of the pouch".
    const cut = s.tiles.find(x => x.t >= 50);
    if (s.power >= 0.8 && cut.ammoAD < 8) {
      bad.push(`${tag}: hard cut REGRESSED — ${cut.ammoAD} AD at t=${cut.t}ms`);
    }
  }
  console.log(bad.length ? 'FAIL:\n  ' + bad.join('\n  ')
                         : 'RESULT: lance connected, sized and pinned on every sampled shot');
  if (bad.length) throw new Error(bad.join(' | '));
}
