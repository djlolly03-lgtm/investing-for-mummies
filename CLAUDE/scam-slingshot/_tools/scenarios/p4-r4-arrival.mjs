/**
 * p4-r4-arrival.mjs — the ONE thing round 4 is about: is the camera TIGHTER at impact than at aim?
 *
 * Round 3 solved the arrival width from the rubric's joint band (proj >= 55 %W AND struct <= 60 %W),
 * which is an inequality on frame WIDTH (vw >= 20*d) and therefore always answers "wider". The
 * round-4 critic drove the result blind against real Angry Birds and picked Angry Birds: at the hit
 * the frame was 1.87x the establishing frame, the struck structure was 14.6 %W, and the horizon had
 * fallen to 66.9 %H.
 *
 * So this scenario measures the arrival, and nothing else:
 *   vw over the whole flight            -> must fall MONOTONICALLY from release to contact
 *   the standing structure's screen fill -> 35-50 %W at contact (14.63 %W in round 3)
 *   the horizon (hill silhouette)        -> 40-60 %H at contact (66.9 %H in round 3)
 *   projectile %W                        -> stays in the rubric's 55-75 %W lead band
 *   ground line %H                       -> must not sag while the dolly moves
 *
 * The "horizon" is measured the way it actually reads on screen: the top of the near green hill
 * band (loader.js buildEnvironment, z = -22) and of the far blue band (z = -34), projected through
 * the game's own camera. A pixel check on the captured PNGs is in p4-r4-horizon.py.
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
  /** Every standing play-plane box with its TRUE half-extents (rotation included). */
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
  /**
   * The horizon as the eye reads it: the highest point of each distant hill band's silhouette,
   * in %H. The hills are unlit CircleGeometry half-discs at fixed z; a half-disc scaled (w,h)
   * has its apex at position.y + scale.y.
   */
  const horizon = () => {
    const bands = {};
    W.environment?.traverse?.((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'CircleGeometry') return;
      const z = +o.position.z.toFixed(1);
      const apexY = o.position.y + o.scale.y;
      const p = proj(o.position.x, apexY, z);
      const key = 'z' + z;
      if (!bands[key] || p.h < bands[key].pctH) bands[key] = { pctH: p.h, apexY: +apexY.toFixed(2), z };
    });
    const list = Object.values(bands).sort((a, b) => b.z - a.z);   // near band first
    return { near: list[0] || null, far: list[list.length - 1] || null, bands: list };
  };
  const projectile = () => {
    const p = (W.projectiles || []).filter(q => !q.dead)[0];
    if (!p) return null;
    const t = p.body.translation(), v = p.body.linvel();
    return { x: t.x, y: t.y, vx: v.x, vy: v.y };
  };
  const frame = () => {
    const p = projectile(), s = stand(), hz = horizon(), V = vw();
    return {
      vw: +V.toFixed(2), vh: +vh().toFixed(2),
      camx: +cam.position.x.toFixed(3), camy: +cam.position.y.toFixed(3), camz: +cam.position.z.toFixed(3),
      mode: rig.mode, blocks: W.blocks.filter(b => !b.dead).length,
      px: p ? +p.x.toFixed(3) : null, py: p ? +p.y.toFixed(3) : null, vx: p ? +p.vx.toFixed(2) : null,
      projPctW: p ? proj(p.x, p.y).w : null,
      standLeftPctW: s ? proj(s.left, 1.5).w : null,
      standMidPctW:  s ? proj(s.mid, 1.5).w : null,
      standRightPctW: s ? proj(s.right, 1.5).w : null,
      standFillPctW: s ? +(s.span / V * 100).toFixed(2) : null,
      groundPctH: proj(0, 0).h,
      horizonNearPctH: hz.near ? hz.near.pctH : null,
      horizonFarPctH: hz.far ? hz.far.pctH : null,
      slingPctW: W.sling ? proj(W.sling.anchor.x, W.sling.anchor.y).w : null,
      leadZoom: rig._lead ? +(rig._lead.zoom || 0).toFixed(4) : null,
      leadD: rig._lead && rig._lead.d !== null ? +rig._lead.d.toFixed(3) : null,
      contactX: rig._lead && rig._lead.contactX !== null ? +rig._lead.contactX.toFixed(3) : null,
    };
  };
`;

const SETUP = 'await SS.seed(3); await SS.seek(2600);';
const AIM = 'SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300);';

export default async ({ game, shot, filmstrip, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const M = { note: 'P4 r4 — arrival zoom. All %W/%H are through the game camera.' };

  // ---------- the establishing frame ----------------------------------------
  await g(SETUP);
  M.aim = await g('return frame();');
  await shot('aim');

  // ---------- the drawn frame (pull-back must still return) ------------------
  await g('SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(400);');
  M.drawn = await g('return frame();');

  // ---------- the flight ------------------------------------------------------
  await g(SETUP + AIM + 'SS.release(); SS.freeze();');
  const trace = [];
  for (let t = 0; t <= 1000; t += 20) {
    trace.push({ t, ...(await g('return frame();')) });
    if (t < 1000) await g('await SS.seek(20);');
  }
  M.trace = trace;

  // first frame of real damage / real contact (after the launch kick has unwound)
  const n0 = trace[0].blocks;
  let ci = -1;
  for (let i = 2; i < trace.length; i++) {
    if (trace[i].t < 200) continue;
    if (trace[i].blocks < n0) { ci = i; break; }
    if (trace[i - 1].vx > 4 && trace[i].vx < trace[i - 1].vx * 0.6) { ci = i; break; }
  }
  M.contact = ci >= 0 ? trace[ci] : null;
  M.didHit = ci >= 0;

  const flight = trace.filter(r => r.mode === 'follow');
  M.vwProfile = {
    aim: M.aim.vw, drawn: M.drawn.vw,
    atRelease: trace[0].vw, at120: (trace.find(r => r.t === 120) || {}).vw,
    atContact: M.contact ? M.contact.vw : null,
    maxDuringFlight: Math.max(...flight.map(r => r.vw)),
    minDuringFlight: Math.min(...flight.map(r => r.vw)),
    // "monotonically down": the largest single-step INCREASE in visible width after t=60ms
    worstRiseAfter60: (() => {
      let worst = 0, at = null;
      for (let i = 1; i < trace.length; i++) {
        if (trace[i].t < 60 || trace[i].mode !== 'follow' || trace[i - 1].mode !== 'follow') continue;
        if (ci >= 0 && trace[i].t > trace[ci].t) break;
        const d = trace[i].vw - trace[i - 1].vw;
        if (d > worst) { worst = d; at = trace[i].t; }
      }
      return { rise: +worst.toFixed(3), atMs: at };
    })(),
  };
  if (M.contact) {
    M.verdict = {
      vwAtContact: M.contact.vw,
      tighterThanAim: +(M.contact.vw / M.aim.vw).toFixed(3),
      standFillPctW: M.contact.standFillPctW,
      standFillTarget: '35-50',
      horizonNearPctH: M.contact.horizonNearPctH,
      horizonFarPctH: M.contact.horizonFarPctH,
      horizonTarget: '40-60',
      projPctW: M.contact.projPctW,
      projTarget: '55-75',
      groundPctH: M.contact.groundPctH,
      groundAtAim: M.aim.groundPctH,
    };
  }

  await writeFile(path.join(OUT, 'ARRIVAL.json'), JSON.stringify(M, null, 1));

  // ---------- pictures: the push-in, seen ------------------------------------
  await g(SETUP + AIM + 'SS.release(); SS.freeze();');
  await filmstrip('pushin', { from: 0, to: 700, step: 70, cols: 3 });

  await g(SETUP + AIM + 'SS.release(); SS.freeze();');
  if (M.contact) await g('await SS.seek(args[0]);', M.contact.t);
  await shot('contact-nohud');

  const R = [];
  R.push(`aim vw ${M.aim.vw}   drawn ${M.drawn.vw}   release ${M.vwProfile.atRelease}   t120 ${M.vwProfile.at120}`);
  R.push(`flight vw  max ${M.vwProfile.maxDuringFlight}  min ${M.vwProfile.minDuringFlight}  worst single-step rise ${JSON.stringify(M.vwProfile.worstRiseAfter60)}`);
  if (M.contact) {
    R.push(`CONTACT t=${M.contact.t}ms  vw ${M.contact.vw} (${M.verdict.tighterThanAim}x aim — want < 1.0, ~18-22 units)`);
    R.push(`  standing fill ${M.contact.standFillPctW} %W (want 35-50)   spans ${M.contact.standLeftPctW}->${M.contact.standRightPctW} %W`);
    R.push(`  horizon near ${M.contact.horizonNearPctH} %H  far ${M.contact.horizonFarPctH} %H (want 40-60)`);
    R.push(`  projectile ${M.contact.projPctW} %W (want 55-75)   groundline ${M.contact.groundPctH} %H (aim ${M.aim.groundPctH})`);
  } else {
    R.push('!! the canonical shot did NOT hit — numbers are for a flyover');
  }
  R.push(`aim: fill ${M.aim.standFillPctW} %W  horizon near ${M.aim.horizonNearPctH} far ${M.aim.horizonFarPctH} %H  ground ${M.aim.groundPctH} %H`);
  R.push(`errors ${JSON.stringify(await g('return SS.errors.map(e => e.text);'))}`);
  console.log(R.join('\n'));
};
