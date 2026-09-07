/**
 * p4-r6-lead.mjs — ROUND 6's ONE QUESTION: DOES THE CAMERA LEAD, OR DOES IT OVERTAKE?
 *
 * The round-5 build dollied in 47 % and panned 5.6 world units while the projectile covered 2.5,
 * so it arrived at the impact framing ~180 ms before the ammo did and the shot spent the whole
 * second half of its flight sliding BACKWARDS into the left third of the frame (29-40 %W).
 *
 * So this measures the thing that failed, per shot, per 20 ms:
 *   projMonotone   the projectile's %W must never fall while it is in the air.  <- THE RULE
 *   projMin/Max    after the launch lag, the ball must hold 55-75 %W (criterion 4a)
 *   camVx vs ballVx  the camera may not travel faster than the shot it is following
 *   vwPlateau      the visible width must HOLD during the traverse, not fall monotonically
 *   contact frame  proj %W / struct mid / struct left-right, at the frame of first contact
 *   the beat       vw and camx from contact to contact+300 ms — the push-in must happen HERE
 *   groundPctH     the horizon may not move during an X pan
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
  const stand = () => {
    let left = Infinity, right = -Infinity;
    let n = 0;
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const ang = Math.atan2(2 * (r.w * r.z + r.x * r.y), 1 - 2 * (r.y * r.y + r.z * r.z));
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      const hw = (b.w * c + b.h * s) / 2;
      left = Math.min(left, t.x - hw); right = Math.max(right, t.x + hw); n++;
    }
    for (const v of W.villains) if (v.alive) { const t = v.body.translation();
      left = Math.min(left, t.x - 0.6); right = Math.max(right, t.x + 0.6); n++; }
    return n ? { left, right, mid: (left + right) / 2, span: right - left } : null;
  };
  const projectile = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    return { x: t.x, y: t.y, vx: v.x, vy: v.y };
  };
  const frame = () => {
    const p = projectile(), s = stand(), V = vw();
    const L = rig._lead;
    return {
      vw: +V.toFixed(2), camx: +cam.position.x.toFixed(3), mode: rig.mode,
      camvx: +rig.vel.x.toFixed(2),
      beat: !!rig._beat,
      markFloor: rig._markFloor === null || rig._markFloor === undefined ? null : +(rig._markFloor * 100).toFixed(2),
      blocks: W.blocks.filter(b => !b.dead).length,
      px: p ? +p.x.toFixed(3) : null, vx: p ? +p.vx.toFixed(2) : null,
      projPctW: p ? proj(p.x, p.y).w : null,
      standLeftPctW:  s ? proj(s.left, 1.5).w : null,
      standMidPctW:   s ? proj(s.mid, 1.5).w : null,
      standRightPctW: s ? proj(s.right, 1.5).w : null,
      standFillPctW:  s ? +(s.span / V * 100).toFixed(2) : null,
      contactPctW: L && L.contactX !== null && L.contactX !== undefined ? proj(L.contactX, 1.5).w : null,
      slingPctW: proj(0, 3.3).w,
      groundPctH: proj(0, 0).h,
      leadD: L && L.d !== null && L.d !== undefined ? +L.d.toFixed(2) : null,
    };
  };
`;

const SHOTS = [
  { a: 0.30, p: 0.90, tag: 'canonical' },
  { a: 0.20, p: 1.00, tag: 'flat' },
  { a: 0.36, p: 1.00, tag: 'lob' },
  { a: 0.30, p: 0.70, tag: 'soft' },
  { a: 0.24, p: 0.85, tag: 'low' },
  { a: 0.44, p: 1.00, tag: 'over' },
];

export default async ({ game, shot, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r6 — does the camera LEAD or OVERTAKE. All %W/%H through the game camera.' };

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
    // first contact = first frame the beat is running, else first block loss / hard slow-down
    let ci = trace.findIndex(r => r.beat);
    if (ci < 0) {
      const n0 = trace[0].blocks;
      for (let i = 2; i < trace.length; i++) {
        if (trace[i].t < 150) continue;
        if (trace[i].blocks < n0) { ci = i; break; }
        if (trace[i - 1].vx > 4 && trace[i].vx < trace[i - 1].vx * 0.6) { ci = i; break; }
      }
    }
    /**
     * The CONTACT frame is the last sample BEFORE the beat starts, not the first sample of it.
     * `_impactHold` takes the frame over on the step the hit lands, so sampling the first beat
     * frame reads up to 20 ms of the push-in as if it were the flight and understates the lead
     * by ~1.5 %W. Measured: 55.78 on the beat's first frame against 56.12 on the flight's last.
     */
    const hi = ci > 0 ? ci - 1 : ci;
    const cT = ci >= 0 ? trace[ci].t : null;
    // the FLIGHT: release -> contact, projectile alive, camera in follow and not on the beat
    const flight = trace.filter(r => r.mode === 'follow' && !r.beat && r.px !== null &&
                                     (cT === null || r.t <= cT));
    // after the launch lag the mark is acquired; judge criterion 4a from there
    const led = flight.filter(r => r.t >= 160);

    let worstBack = 0, worstBackT = null;   // biggest DROP in projectile %W (the round-5 defect)
    let worstOvertake = 0, worstOvertakeT = null;  // camera outrunning the ball, world units/s
    for (let i = 1; i < flight.length; i++) {
      const d = flight[i - 1].projPctW - flight[i].projPctW;
      if (d > worstBack) { worstBack = d; worstBackT = flight[i].t; }
      const camV = (flight[i].camx - flight[i - 1].camx) / ((flight[i].t - flight[i - 1].t) / 1000);
      const over = camV - flight[i].vx;
      if (over > worstOvertake) { worstOvertake = over; worstOvertakeT = flight[i].t; }
    }
    /**
     * THE ZOOM MUST HOLD ACROSS THE TRAVERSE. Sampled at fractions of the flight rather than as
     * a fraction-within-tolerance: the release punch (the drag pull-back returning) is a real
     * and required move, so a plain "how many samples are near the max" score just measures how
     * long the punch took. What matters is the MIDDLE of the flight being flat and the last
     * fifth being the push-in.
     */
    const at = (f) => {
      if (cT === null || !flight.length) return null;
      const want = cT * f;
      let best = flight[0];
      for (const r of flight) if (Math.abs(r.t - want) < Math.abs(best.t - want)) best = r;
      return best.vw;
    };
    const vw35 = at(0.35), vw60 = at(0.60), vw85 = at(0.85);
    const heldFrac = vw35 && vw60 ? +(vw60 / vw35).toFixed(3) : null;   // 1.00 = dead flat

    const beat = cT === null ? null : trace.filter(r => r.t >= cT && r.t <= cT + 320)
      .map(r => ({ t: r.t - cT, vw: r.vw, camx: r.camx, standMidPctW: r.standMidPctW,
                   standLeftPctW: r.standLeftPctW, standRightPctW: r.standRightPctW }));

    M.shots.push({
      ...s, hit: ci >= 0, contactT: cT,
      contact: ci >= 0 ? trace[hi] : null,
      projMinLed: led.length ? Math.min(...led.map(r => r.projPctW)) : null,
      projMaxLed: led.length ? Math.max(...led.map(r => r.projPctW)) : null,
      projInBandFrac: led.length
        ? +(led.filter(r => r.projPctW >= 55 && r.projPctW <= 75).length / led.length).toFixed(3) : null,
      worstBackPctW: +worstBack.toFixed(2), worstBackT,
      worstOvertake: +worstOvertake.toFixed(2), worstOvertakeT,
      vwAtRelease: flight.length ? flight[0].vw : null,
      vw35, vw60, vw85, vwHeldFrac: heldFrac,
      vwAtContact: ci >= 0 ? trace[hi].vw : null,
      groundMin: Math.min(...flight.map(r => r.groundPctH)),
      groundMax: Math.max(...flight.map(r => r.groundPctH)),
      maxStandRightPctW: Math.max(...flight.map(r => r.standRightPctW ?? -999)),
      beat, trace,
    });
  }

  await writeFile(path.join(OUT, 'LEAD6.json'), JSON.stringify(M, null, 1));

  const R = [`aim  vw ${M.aim.vw}  stand ${M.aim.standLeftPctW}->${M.aim.standRightPctW}  sling ${M.aim.slingPctW} %W`];
  R.push('shot        hit@ms   proj%W(t>=160)  inBand  worstBACK  worstOVERTAKE   vw rel->35%->60%->85%->hit    60/35  GROUND');
  for (const s of M.shots) {
    if (!s.contact) { R.push(`${s.tag.padEnd(10)} MISS`); continue; }
    const c = s.contact;
    R.push(`${s.tag.padEnd(10)} ${String(s.contactT).padStart(5)}  ` +
      `${String(s.projMinLed).padStart(6)}-${String(s.projMaxLed).padEnd(6)} ` +
      `${String(s.projInBandFrac).padStart(6)}  ` +
      `${String(s.worstBackPctW).padStart(6)}@${String(s.worstBackT).padEnd(5)} ` +
      `${String(s.worstOvertake).padStart(7)}@${String(s.worstOvertakeT).padEnd(5)} ` +
      `${String(s.vwAtRelease).padStart(6)}->${String(s.vw35).padStart(6)}->${String(s.vw60).padStart(6)}->${String(s.vw85).padStart(6)}->${String(s.vwAtContact).padStart(6)} ` +
      `${String(s.vwHeldFrac).padStart(5)}  ${s.groundMin.toFixed(1)}-${s.groundMax.toFixed(1)}`);
  }
  R.push('');
  R.push('AT CONTACT   proj%W  standMID[40-60]  standL->standR   fill   sling%W');
  for (const s of M.shots) {
    if (!s.contact) continue;
    const c = s.contact;
    R.push(`${s.tag.padEnd(12)} ${String(c.projPctW).padStart(6)}  ${String(c.standMidPctW).padStart(6)}  ` +
      `${String(c.standLeftPctW).padStart(6)}->${String(c.standRightPctW).padStart(6)}  ` +
      `${String(c.standFillPctW).padStart(5)}  ${String(c.slingPctW).padStart(7)}`);
  }
  R.push('');
  R.push('THE BEAT (canonical, ms after contact): t  vw  camx  standMID');
  for (const b of (M.shots[0].beat || [])) {
    R.push(`   +${String(b.t).padStart(3)}  ${String(b.vw).padStart(6)}  ${String(b.camx).padStart(7)}  ${String(b.standMidPctW).padStart(6)}`);
  }
  console.log(R.join('\n'));

  const can = M.shots[0];
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('flight-lead', { from: 80, to: 880, step: 100, cols: 3 });
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  await filmstrip('the-beat', { from: (can.contactT ?? 500) - 60, to: (can.contactT ?? 500) + 300, step: 60, cols: 3 });
  await g('await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();');
  if (can.contactT) await g('await SS.seek(args[0]);', can.contactT);
  await shot('arrival-nohud');
  await g('await SS.seek(700);');
  await shot('debris-room');
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
