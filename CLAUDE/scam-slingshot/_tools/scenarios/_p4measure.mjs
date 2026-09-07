/**
 * _p4measure.mjs — the shared in-page measurement preamble for every P4 round-3 scenario.
 *
 * Round 2 and the first round-3 pass both measured the structure's screen position with
 *   `hw = b.halfW || 0.5`
 * and `Block` has no `halfW` — it carries `w` / `h`. Every block therefore measured 1.0 world
 * unit wide regardless of its real size, which on l1 pushed the standing bounding box from
 * [15.20, 23.12] to [15.60, 23.40] and moved its midpoint 0.34 units RIGHT (+0.8 %W at the
 * arrival frame). The gap this round is 1.0 %W, so that bug was most of it. Fixed here, and
 * three separate readings of "the target structure" are reported side by side so no round can
 * quietly pick the flattering one:
 *
 *   struckPctW  — the bbox midpoint of the contiguous CLUSTER the shot actually hits
 *                 (l1: the tower, x 15.20–20.80, mid 18.00)
 *   allPctW     — the bbox midpoint of EVERYTHING still standing, clusters included
 *                 (l1: 15.20–23.12, mid 19.16) — the pessimistic reading, and the one the
 *                 camera is tuned to satisfy
 *   areaPctW    — the area-weighted centroid of everything standing (l1: 18.48) — where a
 *                 human eye actually puts "the structure", since the far platform is 11 % of
 *                 the standing area
 */
export const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig, C = rig.compose;
  const projx = (x) => { const v = new (cam.position.constructor)(x, 1.5, 0); v.project(cam);
    return +((v.x * 0.5 + 0.5) * 100).toFixed(3); };
  const projPt = (x, y) => { const v = new (cam.position.constructor)(x, y, 0); v.project(cam);
    return { w: +((v.x * 0.5 + 0.5) * 100).toFixed(3), h: +((1 - (v.y * 0.5 + 0.5)) * 100).toFixed(3) }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  /** Every standing play-plane box, with its TRUE half-extents (rotation included). */
  const boxes = () => {
    const out = [];
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const ang = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      const hw = (b.w * c + b.h * s) / 2, hh = (b.w * s + b.h * c) / 2;
      out.push({ x: t.x, hw, area: b.w * b.h, kind: 'block' });
    }
    for (const v of W.villains) if (v.alive) {
      const t = v.body.translation();
      out.push({ x: t.x, hw: 0.6, area: 1.2 * 1.2, kind: 'villain' });
    }
    return out;
  };
  /** Contiguous clusters, split on any horizontal gap wider than 0.6 world units. */
  const clusters = () => {
    const bs = boxes().slice().sort((a, b) => (a.x - a.hw) - (b.x - b.hw));
    const out = [];
    for (const b of bs) {
      const L = b.x - b.hw, R = b.x + b.hw;
      const last = out[out.length - 1];
      if (last && L <= last.right + 0.6) { last.right = Math.max(last.right, R); last.n++; last.area += b.area; }
      else out.push({ left: L, right: R, n: 1, area: b.area });
    }
    return out;
  };
  const structPct = (px) => {
    const bs = boxes();
    if (!bs.length) return null;
    const left = Math.min(...bs.map(b => b.x - b.hw)), right = Math.max(...bs.map(b => b.x + b.hw));
    const A = bs.reduce((s, b) => s + b.area, 0);
    const cen = bs.reduce((s, b) => s + b.area * b.x, 0) / (A || 1);
    const cl = clusters();
    // the cluster the shot is in, else the first one ahead of it, else the biggest
    let hit = cl.find(c => px >= c.left - 0.6 && px <= c.right + 0.6)
           || cl.find(c => c.left >= px)
           || cl.slice().sort((a, b) => b.area - a.area)[0];
    return {
      allMidX: +((left + right) / 2).toFixed(3),
      areaMidX: +cen.toFixed(3),
      struckMidX: +((hit.left + hit.right) / 2).toFixed(3),
      allPctW: projx((left + right) / 2),
      areaPctW: projx(cen),
      struckPctW: projx((hit.left + hit.right) / 2),
      clusters: cl.length,
    };
  };
  const shot = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    const s = structPct(t.x);
    return { x: +t.x.toFixed(3), y: +t.y.toFixed(3), vx: +v.x.toFixed(3), vy: +v.y.toFixed(3),
             sp: +Math.hypot(v.x, v.y).toFixed(3), projPctW: projx(t.x),
             vw: +vw().toFixed(3), mode: rig.mode,
             blocks: W.blocks.filter(b => !b.dead).length, ...s };
  };
`;

/** Fire one shot and step it, returning a per-frame trace. Runs entirely in-page. */
export const TRACE = `
  const fire = async (angle, power, toMs, stepMs) => {
    await SS.seed(3); await SS.seek(2600);
    SS.aim({ angle, power }); await SS.seek(300);
    SS.release(); SS.freeze();
    const rows = [];
    for (let t = 0; t <= toMs; t += stepMs) {
      const s = shot();
      if (s) rows.push({ t, ...s });
      if (t < toMs) await SS.seek(stepMs);
    }
    return rows;
  };
  /**
   * First frame of real contact. NOT "vx dropped": the launch kick multiplies the exit speed
   * and unwinds it over SLING.kickTicks (~83 ms), so vx falls 51 -> 32 -> 13 in the first two
   * frames of every single shot and a naive speed-drop test reports contact at t=40 ms with
   * the ball still over the sling. Contact is therefore only looked for after the kick has
   * finished, and is the first frame where a block dies or forward speed collapses by 40 %.
   */
  const contactIdx = (rows, afterMs = 200) => {
    const n0 = rows.length ? rows[0].blocks : 13;
    for (let i = 2; i < rows.length; i++) {
      if (rows[i].t < afterMs) continue;
      if (rows[i].blocks < n0) return i;
      if (rows[i - 1].vx > 4 && rows[i].vx < rows[i - 1].vx * 0.6) return i;
    }
    return -1;
  };
`;
