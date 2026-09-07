/**
 * p1r2b-probe.mjs — BUILDER probe, P1 round 2b.
 * Measures, in SCREEN PIXELS at the game's own framing (what a critic actually measures):
 *   AD_px   = on-screen height of the loaded ammo at rest in the pouch
 *   d_px    = ammo centre -> pouch centre distance at t after release
 *   d/AD    = the rubric criterion 5 number
 * across several draws, plus the world-unit version so the camera cannot flatter it.
 */
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
const bboxWorld = (obj) => {
  let y0=1e9,y1=-1e9,x0=1e9,x1=-1e9,m=0;
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
      if(wp[0]<x0)x0=wp[0]; if(wp[0]>x1)x1=wp[0];
    }
  });
  return m ? {x0,x1,y0,y1,h:y1-y0,wd:x1-x0} : null;
};
`;
export default async function ({ page, game, OUT }) {
  const G = (b, ...a) =>
    page.evaluate(new Function('...args', `const SS = window.SS; ${PRELUDE} return (async()=>{${b}})();`), ...a);
  const rows = [];
  for (const [angle, power] of [[0.60,1.0],[0.30,0.90],[0.60,0.55]]) {
    await game('SS.seed(7); await SS.seek(2000);');
    const r = await G(`
      const [angle,power] = args;
      const s = w.sling;
      await SS.aim({ angle, power });
      await SS.seek(400);
      // AD at rest, in world units AND in screen px, on the loaded ammo
      const bb = bboxWorld(s.ammo.mesh);
      const ADw = bb.h;
      const cy0 = proj(0, bb.y0)[1], cy1 = proj(0, bb.y1)[1];
      const ADpx = Math.abs(cy1 - cy0);
      const rel = await SS.release();
      const out = { angle, power, ADw:+ADw.toFixed(4), ADpx:+ADpx.toFixed(2),
                    speed: rel.speed, exitSpeed: rel.exitSpeed, muzzleDist: rel.muzzleDist,
                    tiles: [] };
      for (let t = 0; t <= 260; t += 20) {
        const p = w.projectiles.find(q => !q.dead && q.launched);
        const tr = p.body.translation();
        const sp = proj(tr.x, tr.y);
        const pp = proj(s.pouch.x, s.pouch.y);
        const dpx = Math.hypot(sp[0]-pp[0], sp[1]-pp[1]);
        const dw  = Math.hypot(tr.x-s.pouch.x, tr.y-s.pouch.y);
        // live AD on screen right now (perspective changes it)
        const bb2 = bboxWorld(p.mesh);
        const adNow = Math.abs(proj(tr.x, bb2.y1)[1] - proj(tr.x, bb2.y0)[1]);
        out.tiles.push({ t, dpx:+dpx.toFixed(1), AD_restpx:+(dpx/ADpx).toFixed(2),
                         AD_world:+(dw/ADw).toFixed(2), adNowPx:+adNow.toFixed(1),
                         onscreen: sp[0]>0 && sp[0]<VW && sp[1]>0 && sp[1]<VH,
                         sx:+sp[0].toFixed(0), sy:+sp[1].toFixed(0) });
        if (t < 260) await SS.seek(20);
      }
      return out;
    `, angle, power);
    rows.push(r);
    console.log(JSON.stringify(r, null, 1));
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(OUT + '/probe.json', JSON.stringify(rows, null, 2));
}
