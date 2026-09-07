/**
 * p4-r5-lead.mjs — ROUND 5's ONE QUESTION.
 *
 * The round-4 critic drove the game blind against Angry Birds and picked Angry Birds, naming
 * exactly one gap: mid-flight the camera pins the projectile to a constant 55.3 %W and lets the
 * target structure hang at 67-77 %W — never inside criterion 4's 40-60 %W band — so at impact
 * the tower's right edge sits at ~92 %W with the LEFT 47 %W of frame empty behind the shot and
 * nowhere for debris to fly.
 *
 * So this scenario measures the HORIZONTAL composition of the arrival, and nothing else:
 *   standing structure's MID   -> 40-60 %W at contact (67-77 in round 4)
 *   standing structure's RIGHT -> must leave real debris room inside the frame (~92 in round 4)
 *   standing structure's LEFT  -> how much of the frame is dead space behind the shot
 *   projectile %W              -> reported, not defended; the pair is not jointly satisfiable
 *   vw                         -> must stay monotone-down (round 4's push-in must survive)
 *
 * Run over a GRID of shots, not just the canonical one: the round-4 hold guard only came to
 * light on a 12-shot sweep.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x, y, z) => { const v = new V3(x, y, z || 0); v.project(cam);
    return { w: +((v.x * 0.5 + 0.5) * 100).toFixed(2), h: +((1 - (v.y * 0.5 + 0.5)) * 100).toFixed(2) }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  const boxes = () => {
    const out = [];
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const ang = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      out.push({ x: t.x, y: t.y, hw: (b.w * c + b.h * s) / 2, hh: (b.w * s + b.h * c) / 2 });
    }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      out.push({ x: t.x, y: t.y, hw: 0.6, hh: 0.9 }); }
    return out;
  };
  const stand = () => {
    const bs = boxes(); if (!bs.length) return null;
    let left = Infinity, right = -Infinity, top = -Infinity;
    for (const b of bs) { left = Math.min(left, b.x - b.hw); right = Math.max(right, b.x + b.hw);
                          top = Math.max(top, b.y + b.hh); }
    return { left, right, top, mid: (left + right) / 2, span: right - left, boxes: bs };
  };
  /** The one CLUSTER the shot is entering — boxes joined when they overlap in x within 1.2 units. */
  const cluster = (cx) => {
    const s = stand(); if (!s || cx === null || cx === undefined) return null;
    const iv = s.boxes.map(b => [b.x - b.hw, b.x + b.hw]).sort((a, b) => a[0] - b[0]);
    const groups = [];
    for (const [a, b] of iv) {
      const g = groups[groups.length - 1];
      if (g && a <= g[1] + 1.2) g[1] = Math.max(g[1], b); else groups.push([a, b]);
    }
    let best = groups[0], bd = Infinity;
    for (const g of groups) { const d = cx < g[0] ? g[0] - cx : cx > g[1] ? cx - g[1] : 0;
                              if (d < bd) { bd = d; best = g; } }
    return { left: best[0], right: best[1], mid: (best[0] + best[1]) / 2, groups: groups.length };
  };
  const projectile = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    return { x: t.x, y: t.y, vx: v.x, vy: v.y };
  };
  const frame = () => {
    const p = projectile(), s = stand(), V = vw();
    const cx = rig._lead && rig._lead.contactX !== null && rig._lead.contactX !== undefined
      ? rig._lead.contactX : (p ? p.x : null);
    const cl = cluster(cx);
    return {
      vw: +V.toFixed(2), camx: +cam.position.x.toFixed(3), mode: rig.mode,
      wantx: +rig.want.x.toFixed(3), arrx: rig._arrX === null || rig._arrX === undefined ? null : +rig._arrX.toFixed(3),
      camvx: +rig.vel.x.toFixed(2),
      blocks: W.blocks.filter(b => !b.dead).length,
      px: p ? +p.x.toFixed(3) : null, vx: p ? +p.vx.toFixed(2) : null,
      projPctW: p ? proj(p.x, p.y).w : null,
      standLeftPctW:  s ? proj(s.left, 1.5).w : null,
      standMidPctW:   s ? proj(s.mid, 1.5).w : null,
      standRightPctW: s ? proj(s.right, 1.5).w : null,
      standFillPctW:  s ? +(s.span / V * 100).toFixed(2) : null,
      hitMidPctW:   cl ? proj(cl.mid, 1.5).w : null,
      hitRightPctW: cl ? proj(cl.right, 1.5).w : null,
      contactPctW: cl && cx !== null ? proj(cx, 1.5).w : null,
      groundPctH: proj(0, 0).h,
      leadD: rig._lead && rig._lead.d !== null && rig._lead.d !== undefined ? +rig._lead.d.toFixed(2) : null,
    };
  };
`;

const SHOTS = [
  { a: 0.30, p: 0.90, tag: 'canonical' },
  { a: 0.20, p: 1.00, tag: 'flat' },
  { a: 0.36, p: 1.00, tag: 'lob' },
  { a: 0.30, p: 0.70, tag: 'soft' },
  { a: 0.24, p: 0.85, tag: 'low' },
];

export default async ({ game, shot, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r5 — horizontal arrival composition. All %W/%H through the game camera.' };

  await g('await SS.seed(3); await SS.seek(2600);');
  M.aim = await g('return frame();');

  M.shots = [];
  for (const s of SHOTS) {
    await g(`await SS.seed(3); await SS.seek(2600); SS.aim({ angle: ${s.a}, power: ${s.p} }); await SS.seek(300); SS.release(); SS.freeze();`);
    const trace = [];
    for (let t = 0; t <= 1200; t += 20) {
      trace.push({ t, ...(await g('return frame();')) });
      if (t < 1200) await g('await SS.seek(20);');
    }
    const n0 = trace[0].blocks;
    let ci = -1;
    for (let i = 2; i < trace.length; i++) {
      if (trace[i].t < 200) continue;
      if (trace[i].blocks < n0) { ci = i; break; }
      if (trace[i - 1].vx > 4 && trace[i].vx < trace[i - 1].vx * 0.6) { ci = i; break; }
    }
    const flight = trace.filter(r => r.mode === 'follow' && r.t <= (ci >= 0 ? trace[ci].t : 1200));
    let worstRise = 0;
    for (let i = 1; i < flight.length; i++) {
      if (flight[i].t < 60) continue;
      worstRise = Math.max(worstRise, flight[i].vw - flight[i - 1].vw);
    }
    M.shots.push({
      ...s, hit: ci >= 0, contactT: ci >= 0 ? trace[ci].t : null,
      contact: ci >= 0 ? trace[ci] : null,
      worstVwRise: +worstRise.toFixed(3),
      maxStandRightPctW: Math.max(...flight.map(r => r.standRightPctW ?? -999)),
      minStandLeftPctW: Math.min(...flight.map(r => r.standLeftPctW ?? 999)),
      trace,
    });
  }

  await writeFile(path.join(OUT, 'LEAD.json'), JSON.stringify(M, null, 1));

  const R = [`aim  vw ${M.aim.vw}  stand ${M.aim.standLeftPctW}->${M.aim.standRightPctW} %W  mid ${M.aim.standMidPctW}`];
  for (const s of M.shots) {
    if (!s.contact) { R.push(`${s.tag.padEnd(10)} MISS`); continue; }
    const c = s.contact;
    R.push(`${s.tag.padEnd(10)} t=${String(s.contactT).padStart(4)}ms vw ${String(c.vw).padStart(6)}  ` +
      `proj ${String(c.projPctW).padStart(6)}  standMID ${String(c.standMidPctW).padStart(6)} [40-60]  ` +
      `stand ${String(c.standLeftPctW).padStart(6)}->${String(c.standRightPctW).padStart(6)}  ` +
      `hitMID ${String(c.hitMidPctW).padStart(6)}  fill ${c.standFillPctW}  rise ${s.worstVwRise}  ` +
      `maxRight ${s.maxStandRightPctW.toFixed(1)}`);
  }
  console.log(R.join('\n'));

  // pictures of the canonical arrival
  const can = M.shots[0];
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('flight-lead', { from: 80, to: 880, step: 100, cols: 3 });
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  if (can.contactT) await g('await SS.seek(args[0]);', can.contactT);
  await shot('arrival-nohud');
  await g('await SS.seek(700);');
  await shot('debris-room');
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
