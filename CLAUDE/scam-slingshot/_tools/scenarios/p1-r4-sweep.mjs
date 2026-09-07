/**
 * p1-r4-sweep.mjs — does the release burst hold its shape across draws and angles?
 *
 * The r4 profile is written in AD and in fractions of the tip's own solved speed, so a feeble
 * tap and a full draw should produce the SAME curve in AD: peak density on the release frame,
 * >=2x fan half-width by +80 ms, nothing alive by ~200 ms. This checks that claim instead of
 * assuming it — a burst tuned at one power that collapses at another is not tuned.
 *
 * ── THE FAN IS TAGGED AT EMISSION, NOT GUESSED FROM A RADIUS (r6) ────────────
 * This used to call every particle inside a 2.5 AD disc of the pouch "the fan" and take its
 * widest |perp| as the half-width. The release is TWO elements, and the trail runs straight
 * through that disc: the disc is measured in AD, AD grows 0.83 -> 1.35 with the draw ANGLE
 * alone (a rotated dart has a taller bbox), so at a steep draw the disc reached further down
 * the muzzle line and swallowed more of the trail's narrow root — which dragged the reported
 * growth to 1.70 at 0.75 rad while the fan's own p90 half-width grew 2.07x on the same shot
 * (p1-r6-lancesize, which tags by emitter). Tuning the fan against that number would have
 * been tuning against the trail. So the emitters are wrapped and each particle carries the
 * call that made it; `fan*` below is the fan alone and `trail*` is reported beside it.
 */
export default async ({ game }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  const shots = [[0.42, 0.35], [0.42, 0.60], [0.42, 0.90], [0.20, 1.00], [0.75, 1.00]];
  const rows = [];

  for (const [angle, power] of shots) {
    await game('SS.seed(11); await SS.seek(2000);');
    // Tag by emitter: 1 = trail (FX.lance), 2 = fan (burst 'launchSpark'/'launchCore').
    await game(`
      const w = SS.__world, fx = w.fx;
      const pools = ['spark4', 'flash'].map(k => fx.pools[k]).filter(Boolean);
      w.__tag = new Map(pools.map(p => [p, new Int8Array(p.max)]));
      const snapAll = () => pools.map(p => { const a = new Uint8Array(p.max);
        for (let i = 0; i < p.max; i++) a[i] = p.p.life[i] > 0 ? 1 : 0; return a; });
      const markAll = (before, v) => pools.forEach((p, k) => { const t = w.__tag.get(p);
        for (let i = 0; i < p.max; i++) if (p.p.life[i] > 0 && !before[k][i]) t[i] = v; });
      const L = fx.lance.bind(fx), B = fx.burst.bind(fx);
      fx.lance = (...a) => { const b = snapAll(); const r = L(...a); markAll(b, 1); return r; };
      fx.burst = (k, ...a) => {
        if (k !== 'launchSpark' && k !== 'launchCore') return B(k, ...a);
        const b = snapAll(); const r = B(k, ...a); markAll(b, 2); return r; };
      return true;`);
    await game('await SS.aim({angle:args[0], power:args[1]}); await SS.seek(300);', angle, power);
    rows.push(await game(`
      const w = SS.__world, s = w.sling;
      const anchor = { x: s.anchor.x, y: s.anchor.y };
      const info = await SS.release();
      const AD = info.ad, ax = Math.cos(info.angle), ay = Math.sin(info.angle);
      const snap = () => {
        let n = 0, in1 = 0, fanN = 0, trailN = 0, trailReach = 0;
        const perp = [];
        for (const key of ['spark4', 'flash']) {
          const pool = w.fx.pools[key]; if (!pool) continue;
          const P = pool.p, tag = w.__tag.get(pool);
          for (let j = 0; j < pool.max; j++) {
            if (P.life[j] <= 0) continue;
            const dx = P.x[j] - anchor.x, dy = P.y[j] - anchor.y;
            const a = (dx * ax + dy * ay) / AD, p = (dx * -ay + dy * ax) / AD;
            n++;
            if (Math.hypot(a, p) <= 1) in1++;
            if (tag[j] === 2) { fanN++; perp.push(Math.abs(p)); }
            else if (tag[j] === 1) { trailN++; trailReach = Math.max(trailReach, a); }
          }
        }
        // p90, not the max: one stray sparkle must not define the fan's half-width.
        perp.sort((x, y) => x - y);
        const fan = perp.length ? perp[Math.min(perp.length - 1, Math.floor(perp.length * 0.9))] : 0;
        return { n, in1, fanN, trailN, trailReach: +trailReach.toFixed(2), fan: +fan.toFixed(3) };
      };
      const out = { angle: args[0], power: args[1], ad: +AD.toFixed(3),
                    muzzleAD: info.muzzleAD, at: {} };
      out.at[0] = snap();
      for (const t of [80, 200, 260]) {
        await SS.seek(t - (+Object.keys(out.at).pop()));
        out.at[t] = snap();
      }
      return out;`, angle, power));
  }

  say('sweep', rows.map(r => ({
    angle: r.angle, power: r.power, ad: r.ad, muzzleAD: r.muzzleAD,
    fan0: r.at[0].fan, fan80: r.at[80].fan,
    growth: r.at[0].fan ? +(r.at[80].fan / r.at[0].fan).toFixed(2) : null,
    fanN0: r.at[0].fanN, fanN80: r.at[80].fanN,
    trailN0: r.at[0].trailN, trailReach0: r.at[0].trailReach, trailReach80: r.at[80].trailReach,
    in1_t0: r.at[0].in1, in1_t80: r.at[80].in1,
    live0: r.at[0].n, live200: r.at[200].n, live260: r.at[260].n,
  })));
  // The trail must ALSO still be a trail on the release frame: it exists to own the space
  // between the empty pouch and a projectile the cut has already thrown clear, so a shot
  // whose trail does not reach most of the way there has lost the element, not just tuned it.
  const bad = rows.filter(r => r.at[260].n > 0 || (r.at[80].fan / (r.at[0].fan || 1)) < 2
                            || r.at[0].in1 <= r.at[80].in1
                            || r.at[0].trailReach < 0.7 * r.muzzleAD);
  say('FAILING_SHOTS', bad.map(r => ({ angle: r.angle, power: r.power })));
  console.log('### DONE');
};
