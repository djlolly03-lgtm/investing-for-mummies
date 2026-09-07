/**
 * p4-r4b-sweep.mjs — round 4 robustness. The gap this round closes is "the camera is WIDER at
 * impact than at aim". Closing it on ONE canonical shot is not closing it. This sweeps the shot
 * space (misses, flyovers, short falls, near-face hits, far-outpost hits) plus the second and
 * third shots of a run, when the structure the arrival solve composes against is already broken,
 * and asserts the same three things every time:
 *
 *    1. the frame is never WIDER than the establishing frame after t = 120 ms
 *    2. the visible width never RISES during the flight (monotone push-in)
 *    3. the frame the shot ends on is tighter than the frame it started on
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x, y) => { const v = new V3(x, y, 0); v.project(cam); return +((v.x*0.5+0.5)*100).toFixed(2); };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  const live = () => (W.projectiles || []).filter(q => !q.dead)[0] || null;
  const stand = () => { let l = Infinity, r = -Infinity;
    for (const b of W.blocks) if (!b.dead) { const t = b.body.translation(), q = b.body.rotation();
      const a2 = Math.atan2(2*(q.w*q.z+q.x*q.y), 1-2*(q.y*q.y+q.z*q.z));
      const hw = (b.w*Math.abs(Math.cos(a2)) + b.h*Math.abs(Math.sin(a2)))/2;
      l = Math.min(l, t.x - hw); r = Math.max(r, t.x + hw); }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      l = Math.min(l, t.x - 0.6); r = Math.max(r, t.x + 0.6); }
    return Number.isFinite(l) ? { l, r } : null; };
  const f = () => { const p = live(); const t = p && p.body.translation(); const s = stand();
    return { vw:+vw().toFixed(2), mode: rig.mode, blocks: W.blocks.filter(b=>!b.dead).length,
             projPctW: t ? proj(t.x, t.y) : null, px: t ? +t.x.toFixed(2) : null,
             sL: s ? proj(s.l, 1.5) : null, sR: s ? proj(s.r, 1.5) : null,
             camx: +cam.position.x.toFixed(3) }; };
`;

/** one shot, traced. returns the profile. */
const SHOT = (angle, power, ms) => `
  SS.aim({ angle: ${angle}, power: ${power} }); await SS.seek(300);
  const aimVw = vw();
  SS.release(); SS.freeze();
  const tr = [];
  for (let t = 0; t <= ${ms}; t += 20) { tr.push({ t, ...f() }); if (t < ${ms}) await SS.seek(20); }
  const n0 = tr[0].blocks;
  let ci = -1; for (let i = 6; i < tr.length; i++) if (tr[i].blocks < n0) { ci = i; break; }
  const end = ci >= 0 ? ci : tr.length - 1;
  let worstRise = 0, riseAt = null;
  for (let i = 1; i <= end; i++) { if (tr[i].t < 120) continue;
    const d = tr[i].vw - tr[i-1].vw; if (d > worstRise) { worstRise = d; riseAt = tr[i].t; } }
  const after120 = tr.filter(r => r.t >= 120 && r.t <= tr[end].t);
  return {
    aimVw: +aimVw.toFixed(2),
    hit: ci >= 0, contactMs: ci >= 0 ? tr[ci].t : null,
    vwAtEnd: tr[end].vw, ratio: +(tr[end].vw / aimVw).toFixed(3),
    maxVwAfter120: Math.max(...after120.map(r => r.vw)),
    minVw: Math.min(...tr.map(r => r.vw)),
    worstRise: +worstRise.toFixed(3), riseAt,
    projBand: (() => { const s = after120.filter(r => r.projPctW !== null);
      return s.length ? { min: Math.min(...s.map(r=>r.projPctW)), max: Math.max(...s.map(r=>r.projPctW)) } : null; })(),
    // does anything still standing ever leave the frame while the shot is in the air?
    standRightMax: Math.max(...tr.slice(0, end+1).filter(r=>r.sR!==null).map(r=>r.sR)),
    standLeftMin: Math.min(...tr.slice(0, end+1).filter(r=>r.sL!==null).map(r=>r.sL)),
    // is the camera's world x monotone from release, as camera.js claims?
    camDip: (() => { let peak = -Infinity, worst = 0, at = null;
      for (const r of tr.slice(0, end+1)) { if (r.camx > peak) peak = r.camx;
        if (peak - r.camx > worst) { worst = peak - r.camx; at = r.t; } }
      return { units: +worst.toFixed(3), atMs: at }; })(),
    blocksLeft: tr[tr.length-1].blocks,
  };
`;

export default async ({ game, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r4b sweep — the arrival must never open out, on any shot.', shots: [] };

  const grid = [
    [0.18, 1.00], [0.24, 0.95], [0.30, 0.90], [0.36, 0.90],
    [0.44, 1.00], [0.52, 1.00], [0.62, 0.85], [0.75, 1.00],
    [0.30, 0.55], [0.30, 0.35], [0.12, 0.80], [0.40, 0.70],
  ];
  for (const [a, p] of grid) {
    const r = await g('await SS.seed(3); await SS.seek(2600);' + SHOT(a, p, 1400));
    M.shots.push({ angle: a, power: p, ...r });
  }

  // --- a full 4-ammo run: shots 2..4 compose against a structure that is already broken -----
  M.run = [];
  await g('await SS.seed(3); await SS.seek(2600);');
  for (let i = 0; i < 4; i++) {
    const r = await g(SHOT(0.30 + i * 0.04, 0.90, 1200) + '');
    M.run.push({ shot: i + 1, ...r });
    await g('await SS.seek(2600);');           // let it settle + reload the next ammo
  }

  await writeFile(path.join(OUT, 'SWEEP.json'), JSON.stringify(M, null, 1));

  const bad = [];
  const line = (tag, r) => {
    const flags = [];
    if (r.maxVwAfter120 > r.aimVw) flags.push('WIDER-THAN-AIM');
    if (r.worstRise > 0.05) flags.push(`RISE +${r.worstRise}@${r.riseAt}ms`);
    if (r.ratio >= 1.0) flags.push('ENDS-WIDER');
    if (flags.length) bad.push(tag + ' ' + flags.join(' '));
    if (r.standRightMax > 100) bad.push(`${tag} CLIPS RIGHT ${r.standRightMax} %W`);
    return `${tag.padEnd(22)} aim ${String(r.aimVw).padStart(6)}  end ${String(r.vwAtEnd).padStart(6)} (${r.ratio}x)  maxAfter120 ${String(r.maxVwAfter120).padStart(6)}  rise ${r.worstRise}  hit ${r.hit ? 't=' + r.contactMs : 'no'}  proj ${r.projBand ? r.projBand.min + '-' + r.projBand.max : '—'} %W  stand ${r.standLeftMin}..${r.standRightMax} %W  camDip ${r.camDip.units}@${r.camDip.atMs}`;
  };
  const R = [];
  for (const s of M.shots) R.push(line(`a${s.angle} p${s.power}`, s));
  R.push('--- consecutive shots on a breaking structure ---');
  for (const s of M.run) R.push(line(`run shot ${s.shot}`, s));
  R.push(bad.length ? 'FAILURES:\n  ' + bad.join('\n  ') : 'ALL CLEAR — no shot ever opens the frame out.');
  R.push(`errors ${JSON.stringify(await g('return SS.errors.map(e => e.text);'))}`);
  console.log(R.join('\n'));
};
