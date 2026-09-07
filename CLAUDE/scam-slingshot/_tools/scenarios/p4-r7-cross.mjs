/**
 * p4-r7-cross.mjs — ROUND 7's ONE QUESTION: DOES THE SHOT CROSS THE FRAME, OR DOES THE CAMERA
 * GO AND GET IT?
 *
 * The round-6 build acquired a hard lock on the projectile and, to reach it, panned BACKWARDS
 * against the shot in the first 100 ms — measured on the 12-shot sweep, a mean 4.42 world units
 * of retreat (max 6.07) — then welded the dart at 55.98–56.18 %W for the entire traverse and
 * pushed the slingshot off the left edge. This scenario measures the three things that failure
 * consists of, per shot, per 20 ms:
 *
 *   1. PAN BACK.   `rig.pos.x` — the camera's own position, WITHOUT the shake offset — must be
 *      monotone non-decreasing for the whole flight. This is the rule the round-6 build
 *      believed it was obeying: it seeded the floor at `bounds.minX`, five world units behind
 *      where the player was actually looking, so "never pans back" was true against a floor
 *      nobody could see. Reading `rig.pos.x` rather than `cam.position.x` is what separates a
 *      real pan from the launch recoil shake, which is ±0.09 units on every shot.
 *   2. THE CROSSING.  The projectile's %W travel from release to contact. A dart that moves
 *      0.15 %W in 360 ms is not crossing anything; the reference frames put the bird at 40.6 %W
 *      just after release (`ab_launch_release-instant-band-recoil_03`) and 66.7 %W mid-flight
 *      (`ab_camera_sky-dominant-low-horizon_02`), i.e. it travels ~26 %W across the picture.
 *   3. THE LAUNCH POINT.  The sling's %W for every frame of the traverse. Both reference frames
 *      keep it in shot (8.9 %W and 17.8 %W). Losing it strands the traceline on nothing.
 *
 * Also reported, because they are what the fix must not cost: the standing structure's far edge
 * (it must not be shaved by the frame), the ground line (criterion 1), and the frame width
 * (monotone push-in, criterion "the shot only ever gets tighter").
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
  const stand = () => {
    let left = Infinity, right = -Infinity, n = 0;
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const a = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      const hw = (b.w * c + b.h * s) / 2;
      left = Math.min(left, t.x - hw); right = Math.max(right, t.x + hw); n++;
    }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      left = Math.min(left, t.x - 0.6); right = Math.max(right, t.x + 0.6); n++; }
    return n ? { left, right, mid: (left + right) / 2 } : null;
  };
  const ball = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    return { x: t.x, y: t.y, vx: v.x, vy: v.y };
  };
  const frame = () => {
    const b = ball(), s = stand(), V = vw();
    return {
      /** rig.pos.x is the PAN. cam.position.x is the pan PLUS the shake — never judge a pan on it. */
      panX: +rig.pos.x.toFixed(4),
      drawnX: +cam.position.x.toFixed(4),
      vw: +V.toFixed(2), mode: rig.mode, beat: !!rig._beat,
      blocks: W.blocks.filter(q => !q.dead).length,
      px: b ? +b.x.toFixed(3) : null, vx: b ? +b.vx.toFixed(2) : null,
      projPctW: b ? pw(b.x, b.y) : null,
      slingPctW: pw(0, 3.3),
      standLPctW: s ? pw(s.left, 1.5) : null,
      standMidPctW: s ? pw(s.mid, 1.5) : null,
      standRPctW: s ? pw(s.right, 1.5) : null,
      groundPctH: ph(0, 0),
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

export default async ({ game, shot, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r7 — does the SHOT cross the FRAME. panX is shake-free (rig.pos.x).' };

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
    let ci = trace.findIndex(r => r.beat);
    if (ci < 0) {
      const n0 = trace[0].blocks;
      for (let i = 2; i < trace.length; i++) {
        if (trace[i].t < 150) continue;
        if (trace[i].blocks < n0) { ci = i; break; }
        if (trace[i - 1].vx > 4 && trace[i].vx < trace[i - 1].vx * 0.6) { ci = i; break; }
      }
    }
    const hi = ci > 0 ? ci - 1 : ci;
    const cT = ci >= 0 ? trace[ci].t : null;
    const flight = trace.filter(r => r.mode === 'follow' && !r.beat && r.px !== null &&
                                     (cT === null || r.t <= cT));

    // 1. THE RULE: the pan is monotone. Worst backwards step, in world units and in %W.
    let panBack = 0, panBackT = null, drawnBack = 0;
    for (let i = 1; i < flight.length; i++) {
      const d = flight[i - 1].panX - flight[i].panX;
      if (d > panBack) { panBack = d; panBackT = flight[i].t; }
      const dd = flight[i - 1].drawnX - flight[i].drawnX;
      if (dd > drawnBack) drawnBack = dd;
    }
    const panBackPctW = flight.length ? (panBack / flight[0].vw) * 100 : 0;
    const panTotal = flight.length ? flight[flight.length - 1].panX - flight[0].panX : 0;

    // 2. THE CROSSING: how far the ball actually travels across the picture.
    const pj = flight.map(r => r.projPctW);
    const cross = pj.length ? Math.max(...pj) - Math.min(...pj) : 0;

    // 3. THE LAUNCH POINT: is the sling on screen while the shot is crossing?
    const slings = flight.map(r => r.slingPctW);
    const slingInFrac = slings.length
      ? +(slings.filter(v => v > 0 && v < 100).length / slings.length).toFixed(3) : null;

    M.shots.push({
      ...s, hit: ci >= 0, contactT: cT, contact: ci >= 0 ? trace[hi] : null,
      panBackUnits: +panBack.toFixed(3), panBackPctW: +panBackPctW.toFixed(2), panBackT,
      drawnBackUnits: +drawnBack.toFixed(3),
      panTotalUnits: +panTotal.toFixed(2),
      projFirst: pj.length ? pj[0] : null, projLast: pj.length ? pj[pj.length - 1] : null,
      projCrossPctW: +cross.toFixed(2),
      slingFirst: slings.length ? slings[0] : null,
      slingLast: slings.length ? slings[slings.length - 1] : null,
      slingMin: slings.length ? Math.min(...slings) : null,
      slingInFrac,
      standRMax: Math.max(...flight.map(r => r.standRPctW ?? -999)),
      groundMin: Math.min(...flight.map(r => r.groundPctH)),
      groundMax: Math.max(...flight.map(r => r.groundPctH)),
      vwFirst: flight.length ? flight[0].vw : null,
      vwLast: flight.length ? flight[flight.length - 1].vw : null,
      trace,
    });
  }

  await writeFile(path.join(OUT, 'CROSS.json'), JSON.stringify(M, null, 1));

  const R = [];
  R.push(`aim   vw ${M.aim.vw}   sling ${M.aim.slingPctW} %W   stand ${M.aim.standLPctW}->${M.aim.standRPctW} %W   ground ${M.aim.groundPctH} %H`);
  R.push('');
  R.push('THE RULE — the camera pan (rig.pos.x, shake-free) may never go backwards during a flight');
  R.push('shot        hit@ms   panBACK(u)  panBACK(%W)   panTOTAL(u)   [drawn incl. shake]');
  for (const s of M.shots) {
    R.push(`${s.tag.padEnd(10)} ${String(s.contactT ?? 'miss').padStart(6)}   ` +
      `${s.panBackUnits.toFixed(3).padStart(9)}  ${s.panBackPctW.toFixed(2).padStart(10)}   ` +
      `${s.panTotalUnits.toFixed(2).padStart(10)}   ${s.drawnBackUnits.toFixed(3).padStart(8)}`);
  }
  const worst = Math.max(...M.shots.map(s => s.panBackUnits));
  R.push(`  => worst backwards pan across all shots: ${worst.toFixed(3)} world units` +
         `  ${worst < 0.005 ? '(ZERO — the rule holds)' : '(RULE BROKEN)'}`);
  R.push('');
  R.push('THE CROSSING — the projectile must travel across the picture, not sit on a mark');
  R.push('shot        proj %W  first -> last   travelled   sling %W first -> last (min)   in-frame frac');
  for (const s of M.shots) {
    R.push(`${s.tag.padEnd(10)} ${String(s.projFirst).padStart(9)} -> ${String(s.projLast).padEnd(7)} ` +
      `${String(s.projCrossPctW).padStart(8)}   ${String(s.slingFirst).padStart(10)} -> ${String(s.slingLast).padEnd(7)} ` +
      `(${String(s.slingMin).padStart(6)})  ${String(s.slingInFrac).padStart(8)}`);
  }
  R.push('');
  R.push('COST CHECK — far edge in frame, ground line still, width monotone down');
  R.push('shot        standR max %W   ground %H min-max   vw first -> last');
  for (const s of M.shots) {
    R.push(`${s.tag.padEnd(10)} ${String(s.standRMax).padStart(11)}   ` +
      `${s.groundMin.toFixed(1)}-${s.groundMax.toFixed(1)}          ` +
      `${String(s.vwFirst).padStart(6)} -> ${String(s.vwLast).padStart(6)}`);
  }
  console.log(R.join('\n'));

  const can = M.shots[0];
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('cross-the-frame', { from: 60, to: 540, step: 60, cols: 3 });
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('release-first-160ms', { from: 0, to: 160, step: 20, cols: 3 });
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
