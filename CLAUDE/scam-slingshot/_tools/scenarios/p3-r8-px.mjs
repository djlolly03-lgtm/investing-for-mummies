export default async ({ game }) => {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('return SS.aimAndFire(0.26,0.95);');
  await game('await SS.seek(500);');
  console.log(JSON.stringify(await game(`
const w = SS.__world, cam = w.camera;
const V3 = cam.position.constructor;
const el = w.renderer.domElement;
const rect = el.getBoundingClientRect();
const a = new V3(17, 2, 0).project(cam);
const b = new V3(18, 2, 0).project(cam);
const bad = (m) => m.elements.some(v => !isFinite(v));
const info = { pos: cam.position.toArray(), quat: cam.quaternion.toArray(), zoom: cam.zoom,
  fov: cam.fov, near: cam.near, far: cam.far, aspect: cam.aspect,
  badProj: bad(cam.projectionMatrix), badMWI: bad(cam.matrixWorldInverse), badMW: bad(cam.matrixWorld),
  proj: cam.projectionMatrix.elements.slice(0,6), mwi: cam.matrixWorldInverse.elements.slice(0,6) };
const F = w.fx; const rows = [];
for (const k in F.pools) { const p = F.pools[k], P = p.p;
  for (let i = 0; i < p.max; i++) { if (P.life[i] <= 0) continue;
    const t = P.life[i]/P.max[i], age = 1-t;
    const pop = (p.popIn && t > 1 - p.openFrac) ? p.openFrom + (1-p.openFrom)*(1-t)/p.openFrac : 1;
    const grow = 1 + (P.grow[i]-1) * Math.pow(age, p.growPow);
    const ww = P.sx[i]*pop*grow;
    const A = new V3(P.x[i] - ww/2, P.y[i], 0).project(cam);
    const B = new V3(P.x[i] + ww/2, P.y[i], 0).project(cam);
    rows.push({ k, ww, ax:A.x, bx:B.x, px: Math.abs(B.x-A.x)*0.5*rect.width,
                sx:P.sx[i], pop, grow, x:P.x[i], y:P.y[i] });
    if (rows.length > 6) break; } if (rows.length > 6) break; }
return { rectW: rect.width, info, rows: rows.slice(0,2) };`), null, 2));
};
