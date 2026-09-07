/**
 * p1-r2-snap.mjs — BUILDER probe for P1 round 2.
 *
 * The one gap: "Release is a hard cut, not a tween: in the first filmstrip tile >=50 ms after
 * release the ammo is >=8 AD clear of the pouch." AD = the loaded projectile's on-screen height
 * at rest in the pouch.
 *
 * Everything here is measured two ways so neither reading can flatter us:
 *   · AD_rest_world  — the loaded ammo's visible height in WORLD units, measured in the aim
 *                      frame with the ammo sitting in the pouch and unrotated. Screen scale
 *                      cancels out of the ratio, so this is the honest, camera-proof number.
 *   · AD_rest_px     — the same thing in pixels of the aim frame, which is what the round-1
 *                      critic used (29.1 px). Reported so the two agree.
 * Both must clear 8.0 at t = 50 ms.
 *
 * It also reports where a full-power shot LANDS, because raising the muzzle offset and adding a
 * launch kick both extend the range, and a launch that breaks every level's solution is not a
 * launch that got better.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

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
const proj = (x,y,z) => {
  let p = applyM(cam.matrixWorldInverse, [x,y,z]);
  p = applyM(cam.projectionMatrix, p);
  return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH];
};
/** screen-space AABB of an object3D subtree */
const bboxScreen = (obj) => {
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,m=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    m++;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const wp = applyM(o.matrixWorld,[cx,cy,cz]);
      const s = proj(wp[0],wp[1],wp[2]);
      if(s[0]<x0)x0=s[0]; if(s[0]>x1)x1=s[0]; if(s[1]<y0)y0=s[1]; if(s[1]>y1)y1=s[1];
    }
  });
  return m ? {x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2} : null;
};
/** world-space AABB height of an object3D subtree (camera independent) */
const bboxWorldH = (obj) => {
  let y0=1e9,y1=-1e9,m=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    m++;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const wp = applyM(o.matrixWorld,[cx,cy,cz]);
      if(wp[1]<y0)y0=wp[1]; if(wp[1]>y1)y1=wp[1];
    }
  });
  return m ? y1-y0 : null;
};
`;

export default async function ({ page, shot, filmstrip, game, OUT }) {
  const G = (body, ...a) =>
    page.evaluate(new Function('...args', `const SS = window.SS; ${PRELUDE} return (async()=>{${body}})();`), ...a);
  const out = {};
  const say = (k, v) => { out[k] = v; console.log('  ' + k + ' = ' + JSON.stringify(v)); };

  /* ---------------- 1. AD: the loaded ammo at rest in the pouch ------------- */
  await game('SS.seed(7); await SS.seek(2000);');
  const ad = await G(`
    const s = w.sling;
    const a = s.ammo;
    const sb = bboxScreen(a.mesh);
    return {
      worldH: +bboxWorldH(a.mesh).toFixed(4),
      pxH: +sb.h.toFixed(2),
      pxPerUnit: +(sb.h / bboxWorldH(a.mesh)).toFixed(3),
      colliderD: +(a.radius*2).toFixed(3),
      slingState: s.state,
    };`);
  say('AD_rest', ad);

  /* ---------------- 2. release sampling, every 10 ms ----------------------- */
  const AIMS = [[0.60, 1.0], [0.35, 1.0], [0.60, 0.55]];
  const runs = [];
  for (const [angle, power] of AIMS) {
    await game('SS.seed(7); await SS.seek(2000);');
    const r = await G(`
      const [angle, power] = args;
      const s = w.sling;
      await SS.aim({ angle, power });
      await SS.seek(500);
      const restPouch = { x:s.pouch.x, y:s.pouch.y };
      const rel = await SS.release();
      const samples = [];
      for (let i=0;i<=40;i++) {
        const p0 = w.projectiles.find(p=>!p.dead && p.launched);
        const ab = p0 ? bboxScreen(p0.mesh) : null;
        const pS = proj(s.pouch.x, s.pouch.y, 0);
        const t = p0 ? p0.body.translation() : null;
        const v = p0 ? p0.body.linvel() : null;
        samples.push({
          t: i*10,
          world: t ? { x:+t.x.toFixed(4), y:+t.y.toFixed(4) } : null,
          speed: v ? +Math.hypot(v.x,v.y).toFixed(3) : null,
          pouch: { x:+s.pouch.x.toFixed(4), y:+s.pouch.y.toFixed(4) },
          distWorld: t ? +Math.hypot(t.x-s.pouch.x, t.y-s.pouch.y).toFixed(4) : null,
          distPx: (ab && pS) ? +Math.hypot(ab.cx-pS[0], ab.cy-pS[1]).toFixed(2) : null,
          ammoPxH: ab ? +ab.h.toFixed(2) : null,
        });
        await SS.seek(10);
      }
      return { angle, power, rel, restPouch, samples };
    `, angle, power);
    runs.push(r);
  }
  await writeFile(path.join(OUT, 'snap-samples.json'), JSON.stringify({ ad, runs }, null, 2));

  const ADw = ad.worldH, ADpx = ad.pxH, PPU = ad.pxPerUnit;
  for (const r of runs) {
    const at = (ms) => r.samples.find(s => s.t === ms);
    const row = (ms) => {
      const s = at(ms);
      return {
        t: ms,
        distWorld: s.distWorld,
        AD_world: +(s.distWorld / ADw).toFixed(2),
        AD_restpx: +((s.distWorld * PPU) / ADpx).toFixed(2),
        AD_screen: +(s.distPx / ADpx).toFixed(2),
        speed: s.speed,
      };
    };
    const cross = r.samples.find(s => s.distWorld / ADw >= 8);
    say(`run_a${r.angle}_p${r.power}`, {
      exitSpeed: r.rel.speed,
      muzzle: r.rel.muzzle,
      t0: row(0), t20: row(20), t50: row(50), t100: row(100),
      first8AD_ms: cross ? cross.t : null,
    });
  }

  /* ---------------- 3. RANGE: where a full-power shot lands ---------------- */
  const ranges = [];
  for (const angle of [0.35, 0.50, 0.60, 0.785]) {
    await game('SS.seed(7); await SS.seek(2000);');
    const r = await G(`
      const angle = args[0];
      await SS.aim({ angle, power: 1.0 });
      await SS.seek(400);
      await SS.release();
      // fly with everything else frozen out of the way: just record apex + first ground/contact
      let apexY = -1e9, apexX = 0, hitX = null, hitY = null, hitT = null;
      for (let i=0;i<400;i++) {
        await SS.seek(10);
        const p = w.projectiles.find(q=>!q.dead && q.launched);
        if (!p) break;
        const t = p.body.translation();
        if (t.y > apexY) { apexY = t.y; apexX = t.x; }
        if (p.hasHit && hitX === null) { hitX = +t.x.toFixed(3); hitY = +t.y.toFixed(3); hitT = i*10; break; }
      }
      return { angle, apexX:+apexX.toFixed(3), apexY:+apexY.toFixed(3), hitX, hitY, hitT };
    `, angle);
    ranges.push(r);
  }
  say('range_fullpower', ranges);

  /* ---------------- 4. the filmstrip the criterion is judged on ------------ */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  await filmstrip('release-20ms', { from: 0, to: 300, step: 20, cols: 4 });

  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); return 1;`);
  await shot('aim-loaded');
  await G(`await SS.release(); return 1;`);
  await shot('release-t0');
  await G(`await SS.seek(50); return 1;`);
  await shot('release-t50');

  await writeFile(path.join(OUT, 'snap-report.json'), JSON.stringify(out, null, 2));
}
