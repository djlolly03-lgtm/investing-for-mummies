/**
 * p4-r8-traverse.mjs — ROUND 8's ONE QUESTION: IS THE FLIGHT A TRAVERSE, OR A FREEZE AND A LUNGE?
 *
 * The round-7 critic measured, on the shipped build: the camera covers 0.158 world units
 * (0.43 %W) across the FIRST 400 ms of a 467 ms flight and then 4.64 units — plus a zoom peaking
 * at -376 %frame/s — inside the 170 ms straddling impact, and 0 of 28 in-flight samples satisfy
 * rubric criterion 4 (projectile 55-75 %W while the target structure holds 40-60 %W).
 *
 * So this measures exactly those things, per shot, per 20 ms of flight:
 *
 *   1. WHERE THE PAN HAPPENS.   `rig.pos.x` (shake-free) travelled in the first 400 ms of the
 *      flight, in the 170 ms straddling contact, and in total — plus the FRONT-LOAD RATIO
 *      (fraction of the whole flight's pan spent in the last 170 ms). A traverse spreads the
 *      move over the flight; a lunge spends it all at the end.
 *   2. THE ZOOM RATE.  100 * (dvw/dt) / vw, i.e. %frame per second, sampled every 20 ms, peak
 *      taken over the flight AND over the impact beat. This is the critic's -376 number.
 *   3. CRITERION 4, BOTH WAYS.  The rubric asks for the projectile at 55-75 %W while "the target
 *      structure" holds 40-60 %W. Two readings, because they differ by 5 %W on l1 and the
 *      difference is the whole argument:
 *        · ALL   — the mid of the bounding box of everything still standing. This is what the
 *                  round-7 critic measured. On l1 that midpoint sits at x = 19.95, which is the
 *                  GAP between the tower and the outpost — it is not on either structure.
 *        · CLUSTER — the mid of the standing cluster the shot is actually going to hit, where
 *                  clusters are cut at gaps > 1.0 world unit between neighbouring block centres
 *                  (l1: tower 16.1-19.9, outpost 21.05-24.3; the two are 1.15 apart). This is
 *                  "the target structure" read as the thing being shot at.
 *      Reported as the count and fraction of in-flight samples satisfying BOTH bands, plus the
 *      value at contact, plus the closed-form separation `100*d/vw` that decides whether the
 *      pair can fit at all (they fit iff vw >= 20*d).
 *   4. THE CROSSING IS NOT LOST.  The projectile's %W must be monotone non-decreasing (round 6's
 *      rule) and must still travel across the picture rather than sit on a mark (round 7's).
 *      Worst backwards step and total travel, per shot.
 *
 * Everything is projected with the game's own camera. No hard-coded screen pixels.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const pw = (x, y) => { const v = new V3(x, y || 0, 0); v.project(cam);
                         return +((v.x * 0.5 + 0.5) * 100).toFixed(2); };
  const ph = (x, y) => { const v = new V3(x, y || 0, 0); v.project(cam);
                         return +((1 - (v.y * 0.5 + 0.5)) * 100).toFixed(2); };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  const boxes = () => {
    const out = [];
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const a = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      out.push({ x: t.x, y: t.y, hw: (b.w * c + b.h * s) / 2, hh: (b.w * s + b.h * c) / 2,
                 area: b.w * b.h });
    }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      out.push({ x: t.x, y: t.y, hw: 0.6, hh: 0.6, area: 1.44 }); }
    return out;
  };
  /** clusters cut at gaps > 1.0 between neighbouring CENTRES, sorted by x */
  const clusters = (bs) => {
    const s = bs.slice().sort((a, b) => a.x - b.x);
    const out = []; let cur = null;
    for (const b of s) {
      if (!cur || b.x - cur.lastX > 1.0) { cur = { items: [b], lastX: b.x }; out.push(cur); }
      else { cur.items.push(b); cur.lastX = b.x; }
    }
    return out.map(c => {
      const L = Math.min(...c.items.map(b => b.x - b.hw));
      const R = Math.max(...c.items.map(b => b.x + b.hw));
      return { L, R, mid: (L + R) / 2, n: c.items.length };
    });
  };
  const ball = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    return { x: t.x, y: t.y, vx: v.x, vy: v.y };
  };
  const frame = () => {
    const b = ball(), bs = boxes(), V = vw();
    const L = bs.length ? Math.min(...bs.map(q => q.x - q.hw)) : null;
    const R = bs.length ? Math.max(...bs.map(q => q.x + q.hw)) : null;
    const allMid = bs.length ? (L + R) / 2 : null;
    const area = bs.length ? bs.reduce((a, q) => a + q.x * q.area, 0) /
                             bs.reduce((a, q) => a + q.area, 0) : null;
    const cs = bs.length ? clusters(bs) : [];
    const cx = rig._lead && rig._lead.contactX != null ? rig._lead.contactX : (b ? b.x : null);
    let cl = null;
    if (cs.length && cx != null) {
      cl = cs.find(c => cx >= c.L - 0.6 && cx <= c.R + 0.6) ||
           cs.reduce((m, c) => Math.abs(c.mid - cx) < Math.abs(m.mid - cx) ? c : m, cs[0]);
    }
    return {
      panX: +rig.pos.x.toFixed(4), vw: +V.toFixed(3), mode: rig.mode, beat: !!rig._beat,
      blocks: W.blocks.filter(q => !q.dead).length,
      px: b ? +b.x.toFixed(3) : null, py: b ? +b.y.toFixed(3) : null,
      vx: b ? +b.vx.toFixed(2) : null,
      projPctW: b ? pw(b.x, b.y) : null,
      allMidW: allMid, allMidPctW: allMid != null ? pw(allMid, 1.5) : null,
      areaMidPctW: area != null ? pw(area, 1.5) : null,
      clMidW: cl ? +cl.mid.toFixed(3) : null,
      clMidPctW: cl ? pw(cl.mid, 1.5) : null,
      clLPctW: cl ? pw(cl.L, 1.5) : null, clRPctW: cl ? pw(cl.R, 1.5) : null,
      standLPctW: L != null ? pw(L, 1.5) : null, standRPctW: R != null ? pw(R, 1.5) : null,
      slingPctW: pw(0, 3.3), groundPctH: ph(0, 0),
      contactX: rig._lead && rig._lead.contactX != null ? +rig._lead.contactX.toFixed(3) : null,
    };
  };
`;

const SHOTS = [
  { a: 0.30, p: 0.90, tag: 'canonical' },
  { a: 0.18, p: 1.00, tag: 'flat' },
  { a: 0.24, p: 0.95, tag: 'low' },
  { a: 0.36, p: 0.90, tag: 'lob' },
  { a: 0.44, p: 1.00, tag: 'over' },
  { a: 0.30, p: 0.55, tag: 'soft' },
  { a: 0.40, p: 0.70, tag: 'short' },
  { a: 0.62, p: 0.85, tag: 'steep' },
];

const inBand = (v, lo, hi) => v != null && v >= lo && v <= hi;

export default async ({ game, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r8 — is the flight a TRAVERSE or a freeze and a lunge? panX = rig.pos.x' };

  await g('await SS.seed(3); await SS.seek(2600);');
  M.aim = await g('return frame();');

  M.shots = [];
  for (const s of SHOTS) {
    await g(`await SS.seed(3); await SS.seek(2600); SS.aim({ angle: ${s.a}, power: ${s.p} }); await SS.seek(300); SS.release(); SS.freeze();`);
    const trace = [];
    for (let t = 0; t <= 1400; t += 20) {
      trace.push({ t, ...(await g('return frame();')) });
      if (t < 1400) await g('await SS.seek(20);');
    }
    // contact = first beat frame, else first block loss / hard deceleration
    let ci = trace.findIndex(r => r.beat);
    if (ci < 0) {
      const n0 = trace[0].blocks;
      for (let i = 2; i < trace.length; i++) {
        if (trace[i].t < 150) continue;
        if (trace[i].blocks < n0) { ci = i; break; }
        if (trace[i - 1].vx > 4 && trace[i].vx < trace[i - 1].vx * 0.6) { ci = i; break; }
      }
    }
    const cT = ci >= 0 ? trace[ci].t : null;
    const flight = trace.filter(r => r.mode === 'follow' && !r.beat && r.px !== null &&
                                     (cT === null || r.t <= cT));

    const at = (t) => trace.find(r => r.t === t) || null;
    const panAt = (t) => { const r = at(t); return r ? r.panX : null; };
    const p0 = flight.length ? flight[0].panX : null;
    const pEnd = flight.length ? flight[flight.length - 1].panX : null;
    const pan400 = p0 != null && panAt(400) != null && (cT === null || cT >= 400)
      ? panAt(400) - p0 : null;
    // the 170 ms straddling contact: [cT-80, cT+90]
    let panStraddle = null;
    if (cT != null) {
      const lo = panAt(Math.max(0, Math.round((cT - 80) / 20) * 20));
      const hi = panAt(Math.min(1400, Math.round((cT + 90) / 20) * 20));
      if (lo != null && hi != null) panStraddle = hi - lo;
    }
    const panTotalToContact = p0 != null && pEnd != null ? pEnd - p0 : null;

    // zoom rate, %frame per second, per 20 ms sample
    const rate = [];
    for (let i = 1; i < trace.length; i++) {
      const d = (trace[i].vw - trace[i - 1].vw) / 0.02;
      rate.push({ t: trace[i].t, r: 100 * d / trace[i - 1].vw, beat: trace[i].beat,
                  pre: cT === null || trace[i].t <= cT });
    }
    const peakAll = rate.reduce((m, q) => Math.abs(q.r) > Math.abs(m.r) ? q : m, rate[0]);
    const preRates = rate.filter(q => q.pre);
    const peakPre = preRates.length
      ? preRates.reduce((m, q) => Math.abs(q.r) > Math.abs(m.r) ? q : m, preRates[0]) : null;

    // criterion 4, both readings
    const c4 = (key) => {
      const ok = flight.filter(r => inBand(r.projPctW, 55, 75) && inBand(r[key], 40, 60));
      return { n: ok.length, of: flight.length,
               frac: flight.length ? +(ok.length / flight.length).toFixed(3) : null,
               firstT: ok.length ? ok[0].t : null };
    };
    // the closed form: the pair fits iff vw >= 20*d
    const last = flight.length ? flight[flight.length - 1] : null;
    const sep = (midW) => last && midW != null
      ? +(100 * (midW - last.px) / last.vw).toFixed(2) : null;

    const pj = flight.map(r => r.projPctW);
    let projBack = 0;
    for (let i = 1; i < pj.length; i++) projBack = Math.max(projBack, pj[i - 1] - pj[i]);
    let panBack = 0;
    for (let i = 1; i < flight.length; i++)
      panBack = Math.max(panBack, flight[i - 1].panX - flight[i].panX);

    M.shots.push({
      ...s, hit: ci >= 0, contactT: cT,
      flightSamples: flight.length,
      panFirst400: pan400 != null ? +pan400.toFixed(3) : null,
      panStraddle170: panStraddle != null ? +panStraddle.toFixed(3) : null,
      panTotalToContact: panTotalToContact != null ? +panTotalToContact.toFixed(3) : null,
      frontLoad: (panTotalToContact && panStraddle != null && panTotalToContact > 0.01)
        ? +(panStraddle / (panTotalToContact + Math.max(0, panStraddle))).toFixed(3) : null,
      zoomPeakPctFrameS: +peakAll.r.toFixed(1), zoomPeakT: peakAll.t,
      zoomPeakPreContact: peakPre ? +peakPre.r.toFixed(1) : null,
      c4all: c4('allMidPctW'), c4cluster: c4('clMidPctW'),
      projFirst: pj.length ? pj[0] : null, projLast: pj.length ? pj[pj.length - 1] : null,
      projTravel: pj.length ? +(Math.max(...pj) - Math.min(...pj)).toFixed(2) : null,
      projBackStep: +projBack.toFixed(3), panBackUnits: +panBack.toFixed(4),
      atContact: last ? {
        proj: last.projPctW, allMid: last.allMidPctW, areaMid: last.areaMidPctW,
        clMid: last.clMidPctW, sling: last.slingPctW, standR: last.standRPctW, vw: last.vw,
        sepAllPctW: sep(last.allMidW), sepClPctW: sep(last.clMidW),
      } : null,
      slingInFrac: flight.length
        ? +(flight.filter(r => r.slingPctW > 0 && r.slingPctW < 100).length / flight.length).toFixed(3)
        : null,
      groundMin: flight.length ? Math.min(...flight.map(r => r.groundPctH)) : null,
      groundMax: flight.length ? Math.max(...flight.map(r => r.groundPctH)) : null,
      vwFirst: flight.length ? flight[0].vw : null,
      vwLast: last ? last.vw : null,
      trace,
    });
  }

  await writeFile(path.join(OUT, 'TRAVERSE.json'), JSON.stringify(M, null, 1));

  const R = [];
  R.push(`aim  vw ${M.aim.vw}  sling ${M.aim.slingPctW} %W  stand ${M.aim.standLPctW}->${M.aim.standRPctW} %W  allMid ${M.aim.allMidPctW} %W  clMid ${M.aim.clMidPctW} %W`);
  R.push('');
  R.push('1. WHERE THE PAN HAPPENS  (rig.pos.x, world units)');
  R.push('shot        hit@ms  first400  straddle170   total   frontLoad   zoomPeak %frame/s (pre-contact)');
  for (const s of M.shots) {
    R.push(`${s.tag.padEnd(10)} ${String(s.contactT ?? 'miss').padStart(6)}  ` +
      `${String(s.panFirst400 ?? '-').padStart(8)}  ${String(s.panStraddle170 ?? '-').padStart(10)}  ` +
      `${String(s.panTotalToContact ?? '-').padStart(7)}  ${String(s.frontLoad ?? '-').padStart(9)}   ` +
      `${String(s.zoomPeakPctFrameS).padStart(8)} @${String(s.zoomPeakT).padStart(4)}ms  ` +
      `(${String(s.zoomPeakPreContact ?? '-').padStart(7)})`);
  }
  R.push('');
  R.push('2. CRITERION 4 — proj 55-75 %W AND structure mid 40-60 %W, in-flight samples');
  R.push('shot        ALL(bbox mid)      CLUSTER(struck)    at contact: proj / allMid / clMid / sep(all) / sep(cl)');
  for (const s of M.shots) {
    const c = s.atContact;
    R.push(`${s.tag.padEnd(10)} ${String(s.c4all.n + '/' + s.c4all.of).padStart(7)}` +
      ` (${String(s.c4all.frac).padStart(5)})   ${String(s.c4cluster.n + '/' + s.c4cluster.of).padStart(7)}` +
      ` (${String(s.c4cluster.frac).padStart(5)})    ` +
      (c ? `${String(c.proj).padStart(6)} / ${String(c.allMid).padStart(6)} / ${String(c.clMid).padStart(6)} / ${String(c.sepAllPctW).padStart(6)} / ${String(c.sepClPctW).padStart(6)}` : '—'));
  }
  R.push('');
  R.push('3. THE CROSSING SURVIVES — proj %W monotone (round 6) and travelling (round 7)');
  R.push('shot        proj first -> last   travel   worst BACK step   pan back   sling in-frame   ground %H   vw first -> last');
  for (const s of M.shots) {
    R.push(`${s.tag.padEnd(10)} ${String(s.projFirst).padStart(7)} -> ${String(s.projLast).padEnd(7)} ` +
      `${String(s.projTravel).padStart(6)}   ${String(s.projBackStep).padStart(14)}   ` +
      `${String(s.panBackUnits).padStart(8)}   ${String(s.slingInFrac).padStart(13)}   ` +
      `${s.groundMin}-${s.groundMax}   ${String(s.vwFirst).padStart(6)} -> ${String(s.vwLast).padStart(6)}`);
  }
  console.log(R.join('\n'));
  await writeFile(path.join(OUT, 'TRAVERSE.txt'), R.join('\n'));

  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('flight-traverse', { from: 60, to: 540, step: 60, cols: 3 });
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('impact-beat', { from: 480, to: 960, step: 60, cols: 3 });
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
