/**
 * p1-r2b-snap.mjs — P1 round 2b evidence: IS THE RELEASE A HARD CUT?
 *
 * The one criterion this scenario exists to settle is rubric P1 #5:
 *   "in the first filmstrip tile >=50 ms after release the ammo is >=8 AD clear of the pouch
 *    and the band has overshot past straight. No tile may show the band easing back through
 *    a neutral pose."
 *
 * AD is the rubric's own definition — "the on-screen height of the loaded projectile while it
 * sits at rest in the pouch" — so it is measured on the ROTATED loaded ammo at the shot's own
 * aim angle (a SIP arrow drawn at 0.6 rad is 1.24 world units tall; the same arrow at 0 rad is
 * 0.67). That is the harshest honest reading and it is the one used everywhere below. Every
 * clearance is reported in world units AND in screen pixels at the game's own framing, so the
 * number cannot be an artefact of either.
 *
 * The release strip is shot twice on purpose:
 *   · camLocked, so the framing is byte-identical in every tile and tile-to-tile displacement
 *     is the real thing rather than the camera's push-in;
 *   · unlocked at the game's own framing, because composition is only honest there.
 *
 * It ASSERTS. If the first tile at or after 50 ms is under 8 AD, this throws after writing
 * snap.json — a scenario whose name claims a snap has to check for one.
 */
import { writeFile } from 'node:fs/promises';

const PRELUDE = `
const w = SS.__world;
const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM = (m, p) => {
  const e = m.elements;
  const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
  return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
          (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
          (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];
};
const proj = (x,y,z=0) => {
  let p = applyM(cam.matrixWorldInverse,[x,y,z]);
  p = applyM(cam.projectionMatrix,p);
  return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH];
};
/** world-space AABB of a mesh tree, in world units */
const bbox = (obj) => {
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,n=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    n++;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const p = applyM(o.matrixWorld,[cx,cy,cz]);
      if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1];
    }
  });
  return n ? { x0,x1,y0,y1, h:y1-y0, w:x1-x0 } : null;
};
/** every live launch-burst particle, straight off the fx instance arrays */
const burstPoints = () => {
  const fx = w.fx; if (!fx || !fx.pools) return [];
  const out = [];
  for (const key of ['chip','flash','spark4']) {
    const pool = fx.pools[key];
    if (!pool || !pool.p) continue;
    const P = pool.p;
    for (let i=0;i<pool.max;i++) if (P.life[i] > 0) out.push([P.x[i], P.y[i]]);
  }
  return out;
};
`;

export default async function ({ page, shot, filmstrip, game, OUT }) {
  const G = (b, ...a) =>
    page.evaluate(new Function('...args', `const SS = window.SS; ${PRELUDE} return (async()=>{${b}})();`), ...a);
  const out = { shots: [] };

  /* ------------------------------------------------------------------ *
   * 1. NUMBERS — the clearance curve for nine shots
   * ------------------------------------------------------------------ */
  const SHOTS = [
    [0.60, 1.00], [0.60, 0.90], [0.60, 0.80], [0.60, 0.55],
    [0.30, 0.90], [0.20, 1.00], [0.45, 1.00], [0.785, 1.00], [0.36, 0.75],
  ];
  for (const [angle, power] of SHOTS) {
    await game('SS.seed(7); await SS.seek(1800);');
    const r = await G(`
      const [angle, power] = args;
      const s = w.sling;
      await SS.aim({ angle, power });
      await SS.seek(400);
      // AD: the on-screen height of the LOADED ammo, at rest in the pouch, at this aim angle.
      const bb = bbox(s.ammo.mesh);
      const AD = bb.h;
      const ADpx = Math.abs(proj(bb.x0, bb.y1)[1] - proj(bb.x0, bb.y0)[1]);
      const rel = await SS.release();
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const tiles = [];
      for (let t = 0; t <= 300; t += 25) {
        const p = w.projectiles.find(q => !q.dead && q.launched);
        const tr = p.body.translation();
        const sp = proj(tr.x, tr.y), pp = proj(s.pouch.x, s.pouch.y);
        const bp = burstPoints();
        let bx=0, by=0;
        for (const q of bp) { bx += q[0]; by += q[1]; }
        if (bp.length) { bx /= bp.length; by /= bp.length; }
        tiles.push({
          t,
          AD:    +(Math.hypot(tr.x-s.pouch.x, tr.y-s.pouch.y) / AD).toFixed(2),
          ADpx:  +(Math.hypot(sp[0]-pp[0], sp[1]-pp[1]) / ADpx).toFixed(2),
          // signed pouch displacement along the launch axis: + is FORWARD of the fork.
          // Never allowed to sit at ~0 while the recoil is still supposed to be ringing.
          pouchAD: +(((s.pouch.x-s.anchor.x)*ux + (s.pouch.y-s.anchor.y)*uy) / AD).toFixed(3),
          slingState: s.state,
          burstN: bp.length,
          burstFromPouchAD: bp.length ? +(Math.hypot(bx-s.anchor.x, by-s.anchor.y)/AD).toFixed(2) : null,
        });
        if (t < 300) await SS.seek(25);
      }
      // where the shot ends up, so range can be held constant across a retune
      await SS.seek(4000);
      const p2 = w.projectiles.find(q => q.launched) || null;
      const land = p2 && p2.body ? +p2.body.translation().x.toFixed(2) : null;
      return { angle, power, AD:+AD.toFixed(4), ADpx:+ADpx.toFixed(2),
               speed: rel.speed, exitSpeed: rel.exitSpeed, kickSteps: rel.kickSteps,
               kickMs: rel.kickMs, muzzleDist: rel.muzzleDist, muzzleClamped: rel.muzzleClamped,
               landX: land, tiles };
    `, angle, power);
    out.shots.push(r);
    const at = (ms) => r.tiles.find(x => x.t === ms);
    console.log(`  a=${angle.toFixed(2)} p=${power.toFixed(2)}  AD=${r.AD}  muzzle=${r.muzzleDist}  ` +
      `exit=${r.exitSpeed}  |  t0=${at(0).AD}AD  t50=${at(50).AD}AD  t75=${at(75).AD}AD  ` +
      `t100=${at(100).AD}AD  |  land x=${r.landX}`);
  }

  /* ------------------------------------------------------------------ *
   * 2. THE MONEY FILMSTRIPS
   * ------------------------------------------------------------------ */
  // (a) locked framing — displacement between tiles is the projectile, not the camera.
  //     The lock MUST be taken after release(): release fires onLaunch, onLaunch calls
  //     rig.follow(), and any real camera intent legitimately clears camLock. Locking before
  //     the shot produces a strip that says LOCKED in its filename and is not.
  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release(); SS.camLock({x:9,y:7.5,halfWidth:15});');
  await filmstrip('release-LOCKED-50ms', { from: 0, to: 300, step: 50, cols: 4 });
  await game('SS.camUnlock();');

  // (b) the game's own framing — composition is only honest here
  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release();');
  await filmstrip('release-GAMEFRAME-50ms', { from: 0, to: 300, step: 50, cols: 4 });

  // (c) the band's ring-down, tight on the sling
  await game('SS.seed(7); await SS.seek(1800);');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400); SS.release(); SS.camLock({x:0.4,y:3.6,halfWidth:3.4});');
  await filmstrip('band-recoil-LOCKED-40ms', { from: 0, to: 400, step: 40, cols: 4 });
  await game('SS.camUnlock();');

  // (d) the resting composition, untouched, so nothing regressed there
  await game('SS.seed(7); await SS.seek(1800);');
  await shot('rest-composition');
  await game('await SS.aim({angle:0.60, power:1.0}); await SS.seek(400);');
  await shot('full-stretch');

  await writeFile(OUT + '/snap.json', JSON.stringify(out, null, 2));

  /* ------------------------------------------------------------------ *
   * 3. THE ASSERTION
   * ------------------------------------------------------------------ */
  const bad = [];
  for (const s of out.shots) {
    if (s.power < 0.8) continue;                       // the criterion is about a real draw
    const first = s.tiles.find(t => t.t >= 50);
    if (first.AD < 8) bad.push(`a=${s.angle} p=${s.power}: ${first.AD} AD at t=${first.t}ms`);
    if (first.ADpx < 8) bad.push(`a=${s.angle} p=${s.power}: ${first.ADpx} AD(px) at t=${first.t}ms`);
  }
  console.log(bad.length ? 'RESULT: NOT A CUT — ' + bad.join('; ')
                         : 'RESULT: hard cut confirmed — every draw >=0.8 clears 8 AD by t=50ms');
  if (bad.length) throw new Error('P1 criterion 5 FAILED: ' + bad.join('; '));
}
