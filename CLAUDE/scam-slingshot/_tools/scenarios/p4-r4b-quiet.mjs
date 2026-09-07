/**
 * p4-r4b-quiet.mjs — P4 criterion 6 + the automatic FAIL that hangs off it, measured over a
 * window long enough for the whole l1 collapse to actually go to sleep (the round-3 verify
 * stopped at 6 s and the level was still settling).
 *
 *   · shake peak <= 2.5 %H, under 0.2 %H within 350 ms of the hit, never a roll
 *   · camera translation stops within 600 ms of the last body sleeping — and, the auto-FAIL,
 *     is NOT still moving one second after every body is asleep
 *   · no drift / hunting / oscillation in the last 10 samples
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ game, OUT }) => {
  const PRE = `
    const W = SS.__world, cam = W.camera, rig = W.rig;
    const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
    const S = () => { let asleep = 0, total = 0;
      for (const l of [W.blocks, W.debris, W.villains]) for (const e of (l||[])) if (e && !e.dead && e.body) {
        total++; if (e.body.isSleeping()) asleep++; }
      return { x:+cam.position.x.toFixed(5), y:+cam.position.y.toFixed(5), z:+cam.position.z.toFixed(5),
               vw:+(vh()*cam.aspect).toFixed(3), mode: rig.mode, shake:+(rig.shake||0).toFixed(5),
               rx:+cam.rotation.x.toFixed(6), ry:+cam.rotation.y.toFixed(6), rz:+cam.rotation.z.toFixed(6),
               asleep, total,
               settleT:+(rig._settleT ?? -1).toFixed(2), locked: !!rig._settleLocked,
               wx:+rig.want.x.toFixed(5), wy:+rig.want.y.toFixed(5), hw:+rig._hw.toFixed(4) }; };
  `;
  const g = (b) => game(PRE + b);
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');

  const tr = [];
  for (let t = 0; t <= 14000; t += 100) {
    tr.push({ t, ...(await g('return S();')) });
    if (t < 14000) await g('await SS.seek(100);');
  }

  const moved = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
  let lastMove = 0;
  for (let i = 1; i < tr.length; i++) if (moved(tr[i], tr[i - 1]) > 1e-4) lastMove = tr[i].t;
  let allAsleep = null;
  for (let i = 0; i < tr.length; i++)
    if (tr[i].total > 0 && tr.slice(i).every(r => r.asleep === r.total)) { allAsleep = tr[i].t; break; }

  const M = {
    lastCameraMoveMs: lastMove,
    allBodiesAsleepMs: allAsleep,
    stillMovingAfterSleepMs: allAsleep === null ? null : Math.max(0, lastMove - allAsleep),
    autoFailStillMovingOneSecondAfterSleep: allAsleep !== null && lastMove - allAsleep > 1000,
    // rig.shake is 0..1 of COMPOSE.shakeMaxPctH (2.4 %H), not a percentage itself.
    shakePeakPctH: +(Math.max(...tr.map(r => r.shake)) * 2.4).toFixed(3),
    rollMax: Math.max(...tr.map(r => Math.abs(r.rz))),
    tiltMax: Math.max(...tr.map(r => Math.abs(r.rx) + Math.abs(r.ry))),
    // the rubric's "no drift, hunting or oscillation in the final 10 tiles"
    last10Drift: +tr.slice(-10).reduce((s, r, i, a) => i ? s + moved(r, a[i - 1]) : 0, 0).toFixed(6),
    finalVw: tr[tr.length - 1].vw,
    tail: tr.slice(-12).map(r => ({ t: r.t, x: r.x, wx: r.wx, y: r.y, wy: r.wy, mode: r.mode, settleT: r.settleT, locked: r.locked, asleep: `${r.asleep}/${r.total}` })),
  };
  // shake decay: how long from the peak until it is under 0.2 %H
  let pi = 0; for (let i = 1; i < tr.length; i++) if (tr[i].shake > tr[pi].shake) pi = i;
  M.shakePeakAtMs = tr[pi].t;
  M.shakeUnder02PctHAfterMs = (() => { for (let i = pi; i < tr.length; i++) if (tr[i].shake * 2.4 < 0.2) return tr[i].t - tr[pi].t; return null; })();
  await writeFile(path.join(OUT, 'QUIET.json'), JSON.stringify({ ...M, trace: tr }, null, 1));
  console.log(JSON.stringify(M, null, 1));
  console.log('errors', JSON.stringify(await g('return SS.errors.map(e=>e.text);')));
};
