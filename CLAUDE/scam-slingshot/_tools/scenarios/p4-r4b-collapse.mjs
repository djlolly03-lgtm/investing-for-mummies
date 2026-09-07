/**
 * p4-r4b-collapse.mjs — round 4, builder pass 2.
 *
 * The arrival push-in landed (`p4-r4-arrival.mjs`: 34.70 aim -> 19.50 at contact, monotone).
 * This scenario asks the question the arrival scenario stops one frame short of:
 *
 *      IS THE COLLAPSE ITSELF STILL SEEN CLOSE AND LARGE?
 *
 * i.e. does the frame HOLD its tight arrival width through the 1.5 s the tower is actually
 * coming down, or does the settle auto-frame open back out and hand the player the collapse
 * from across the field? The gap this round exists to close is "the collapse is seen close and
 * large", and the impact frame is only the first 40 ms of it.
 *
 * Traces vw / struck-tower %W / horizon / ground line from release to 3.6 s, and tiles the
 * collapse (600 -> 2400 ms) so the answer is visible, not only tabulated.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x, y, z) => { const v = new V3(x, y, z || 0); v.project(cam);
    return { w: +((v.x * 0.5 + 0.5) * 100).toFixed(2), h: +((1 - (v.y * 0.5 + 0.5)) * 100).toFixed(2) }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  /** Bounds of everything still standing (blocks + live villains), true half-extents. */
  const stand = () => {
    let left = Infinity, right = -Infinity, top = -Infinity;
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const ang = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      const hw = (b.w * c + b.h * s) / 2, hh = (b.w * s + b.h * c) / 2;
      left = Math.min(left, t.x - hw); right = Math.max(right, t.x + hw); top = Math.max(top, t.y + hh);
    }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      left = Math.min(left, t.x - 0.6); right = Math.max(right, t.x + 0.6); top = Math.max(top, t.y + 0.9); }
    return Number.isFinite(left) ? { left, right, top, mid: (left + right) / 2, span: right - left } : null;
  };
  /** Everything that is MOVING — the collapse itself. This is the subject after the hit. */
  const moving = () => {
    let left = Infinity, right = -Infinity, top = -Infinity, bot = Infinity, n = 0;
    for (const list of [W.blocks, W.debris]) for (const e of list) {
      if (!e || e.dead || !e.body) continue;
      const v = e.body.linvel(); if (Math.hypot(v.x, v.y) < 0.8) continue;
      const t = e.body.translation(); n++;
      left = Math.min(left, t.x); right = Math.max(right, t.x);
      top = Math.max(top, t.y); bot = Math.min(bot, t.y);
    }
    return n ? { n, left, right, top, bot, mid: (left + right) / 2, span: right - left } : { n: 0 };
  };
  const horizon = () => {
    let near = null;
    W.environment?.traverse?.((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'CircleGeometry') return;
      const z = +o.position.z.toFixed(1);
      const p = proj(o.position.x, o.position.y + o.scale.y, z);
      if (near === null || z > near.z) near = { z, pctH: p.h };
    });
    return near;
  };
  const frame = () => {
    const s = stand(), m = moving(), hz = horizon(), V = vw();
    const ps = (W.projectiles || []).filter(q => !q.dead)[0];
    const t = ps ? ps.body.translation() : null;
    return {
      vw: +V.toFixed(2), mode: rig.mode, blocks: W.blocks.filter(b => !b.dead).length,
      debris: (W.debris || []).filter(d => !d.dead).length,
      camx: +cam.position.x.toFixed(2), camy: +cam.position.y.toFixed(2),
      projPctW: t ? proj(t.x, t.y).w : null,
      standMidPctW: s ? proj(s.mid, 1.5).w : null,
      standLeftPctW: s ? proj(s.left, 1.5).w : null,
      standRightPctW: s ? proj(s.right, 1.5).w : null,
      standFillPctW: s ? +(s.span / V * 100).toFixed(2) : null,
      movingN: m.n,
      movingMidPctW: m.n ? proj(m.mid, 1.5).w : null,
      movingLeftPctW: m.n ? proj(m.left, 1.5).w : null,
      movingRightPctW: m.n ? proj(m.right, 1.5).w : null,
      movingTopPctH: m.n ? proj(0, m.top).h : null,
      groundPctH: proj(0, 0).h,
      horizonPctH: hz ? hz.pctH : null,
    };
  };
`;

const SETUP = 'await SS.seed(3); await SS.seek(2600);';
const AIM = 'SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300);';

export default async ({ game, shot, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r4b — does the frame HOLD its tight arrival through the collapse?' };

  await g(SETUP);
  M.aim = await g('return frame();');

  await g(SETUP + AIM + 'SS.release(); SS.freeze();');
  const trace = [];
  for (let t = 0; t <= 3600; t += 40) {
    trace.push({ t, ...(await g('return frame();')) });
    if (t < 3600) await g('await SS.seek(40);');
  }
  M.trace = trace;

  const n0 = trace[0].blocks;
  const ci = trace.findIndex((r, i) => i > 4 && r.t >= 200 && r.blocks < n0);
  M.contactIdx = ci;

  // the window the collapse actually occupies: from contact until nothing is moving any more
  let lastMoving = ci;
  for (let i = ci; i < trace.length; i++) if (trace[i].movingN > 0) lastMoving = i;
  M.collapse = {
    fromMs: ci >= 0 ? trace[ci].t : null,
    toMs: trace[lastMoving].t,
    vwAtContact: ci >= 0 ? trace[ci].vw : null,
    vwDuring: (() => {
      const w = trace.slice(Math.max(ci, 0), lastMoving + 1).map(r => r.vw);
      return { min: Math.min(...w), max: Math.max(...w), last: w[w.length - 1] };
    })(),
    // the subject of the collapse: where the moving debris sits on screen while it moves
    movingInFrame: trace.slice(Math.max(ci, 0), lastMoving + 1)
      .filter(r => r.movingN > 0)
      .map(r => ({ t: r.t, n: r.movingN, midPctW: r.movingMidPctW, l: r.movingLeftPctW, r: r.movingRightPctW, topPctH: r.movingTopPctH, vw: r.vw })),
  };
  M.tail = {
    vwAt2000: (trace.find(r => r.t === 2000) || {}).vw,
    vwAt3000: (trace.find(r => r.t === 3000) || {}).vw,
    vwAt3600: (trace.find(r => r.t === 3600) || {}).vw,
    ratioAimAt3600: +(((trace.find(r => r.t === 3600) || {}).vw || 0) / M.aim.vw).toFixed(3),
    groundAt2000: (trace.find(r => r.t === 2000) || {}).groundPctH,
    groundAt3600: (trace.find(r => r.t === 3600) || {}).groundPctH,
    horizonAt2000: (trace.find(r => r.t === 2000) || {}).horizonPctH,
    horizonAt3600: (trace.find(r => r.t === 3600) || {}).horizonPctH,
  };

  await writeFile(path.join(OUT, 'COLLAPSE.json'), JSON.stringify(M, null, 1));

  await g(SETUP + AIM + 'SS.release(); SS.freeze();');
  await filmstrip('collapse', { from: 500, to: 2300, step: 200, cols: 5 });

  await g(SETUP + AIM + 'SS.release(); SS.freeze(); await SS.seek(3600);');
  await shot('settled');

  const R = [];
  R.push(`aim vw ${M.aim.vw}`);
  R.push(`contact t=${M.collapse.fromMs}  vw ${M.collapse.vwAtContact}`);
  R.push(`collapse window ${M.collapse.fromMs}..${M.collapse.toMs} ms — vw min ${M.collapse.vwDuring.min} max ${M.collapse.vwDuring.max} last ${M.collapse.vwDuring.last}`);
  R.push(`tail: vw 2000ms ${M.tail.vwAt2000}  3000ms ${M.tail.vwAt3000}  3600ms ${M.tail.vwAt3600} (${M.tail.ratioAimAt3600}x aim)`);
  R.push(`ground 2000 ${M.tail.groundAt2000} 3600 ${M.tail.groundAt3600}  horizon 2000 ${M.tail.horizonAt2000} 3600 ${M.tail.horizonAt3600}`);
  for (const r of M.collapse.movingInFrame.filter((_, i) => i % 3 === 0))
    R.push(`  t=${r.t} moving ${r.n} at ${r.l}..${r.r} %W (mid ${r.midPctW}) top ${r.topPctH} %H  vw ${r.vw}`);
  R.push(`errors ${JSON.stringify(await g('return SS.errors.map(e => e.text);'))}`);
  console.log(R.join('\n'));
};
