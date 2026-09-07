/** P4 — the glide back to the sling after a shot that does NOT clear the level. */
const M = `
  const w=SS.__world, cam=w.camera, rig=w.rig, L=w.level;
  const t=Math.tan(cam.fov*Math.PI/180/2); const vh=2*cam.position.z*t, vw=vh*cam.aspect;
  const px=x=>((x-cam.position.x)/vw+0.5)*100, py=y=>(0.5-(y-cam.position.y)/vh)*100;
  let bx1=-1e9; for(const b of L.blocks) bx1=Math.max(bx1,b.x+b.w/2);
  return { mode:rig.mode, phase:w.phase, slingPctW:+px(0).toFixed(1), targetPctW:+px(bx1).toFixed(1),
           groundPctH:+py(0).toFixed(1), camX:+cam.position.x.toFixed(4), camY:+cam.position.y.toFixed(4),
           dist:+cam.position.z.toFixed(4), awake:w.entities.filter(e=>e.body&&!e.dead&&e.body.isDynamic?.()&&!e.body.isSleeping()).length };
`;
export default async ({ game, filmstrip, shot }) => {
  await game('await SS.seed(3); await SS.seek(1400);');
  await game('SS.aim({angle:0.50,power:0.60}); await SS.seek(350); SS.release();');
  await game('await SS.seek(4200);');
  console.log('SETTLED', JSON.stringify(await game(M)));
  await filmstrip('return', { from: 0, to: 1500, step: 125, cols: 4 });
  const tail = [];
  for (let i = 0; i < 14; i++) { tail.push(await game(M)); await game('await SS.seek(80);'); }
  for (const r of tail) console.log(JSON.stringify(r));
  const d = tail.slice(-6);
  console.log('RETURN_STILLNESS', JSON.stringify({
    dx:+Math.max(...d.map(s=>Math.abs(s.camX-d[0].camX))).toFixed(4),
    dy:+Math.max(...d.map(s=>Math.abs(s.camY-d[0].camY))).toFixed(4),
    dd:+Math.max(...d.map(s=>Math.abs(s.dist-d[0].dist))).toFixed(4) }));
  await shot('back-at-sling');
};
