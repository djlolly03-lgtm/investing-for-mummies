/**
 * P4 round 1 — the acceptance capture.
 *   01 aim-rest       composition at rest
 *   02 drag           pull-back on drag (filmstrip)
 *   03 shot           lag -> lead -> snap to impact -> settle (filmstrip)
 *   04 settled        auto-frame
 *   05 return         glide back to the sling (filmstrip)
 * Numbers printed alongside so nothing rests on an impression.
 */
const M = `
  const w = SS.__world, cam = w.camera, L = w.level, rig = w.rig;
  const t = Math.tan(cam.fov*Math.PI/180/2);
  const vh = 2*cam.position.z*t, vw = vh*cam.aspect;
  const px = x => ((x-cam.position.x)/vw + 0.5)*100;
  const py = y => (0.5 - (y-cam.position.y)/vh)*100;
  let bx0=1e9,bx1=-1e9,by1=-1e9;
  for (const b of L.blocks){ bx0=Math.min(bx0,b.x-b.w/2); bx1=Math.max(bx1,b.x+b.w/2); by1=Math.max(by1,b.y+b.h/2); }
  const p = w.projectiles.filter(q=>!q.dead && q.launched)[0];
  return {
    mode: rig.mode, vw:+vw.toFixed(2), vh:+vh.toFixed(2),
    slingPctW:+px(0).toFixed(1), targetPctW:+px(bx1).toFixed(1),
    groundPctH:+py(0).toFixed(1), skyAbovePctH:+py(by1).toFixed(1),
    structHPct:+(py(0)-py(by1)).toFixed(1),
    up:[+cam.up.x.toFixed(4),+cam.up.y.toFixed(4)],
    projPctW: p?+px(p.position().x).toFixed(1):null,
    structCPct:+(((px(bx0)+px(bx1))/2)).toFixed(1),
    camX:+cam.position.x.toFixed(4), camY:+cam.position.y.toFixed(4), dist:+cam.position.z.toFixed(4),
    shakePctH:+(rig.shake*2.4).toFixed(2),
    villainMargins: w.villains.filter(v=>v.alive).map(v=>{const q=v.position();
      return +Math.min(px(q.x),100-px(q.x),py(q.y),100-py(q.y)).toFixed(1);}),
  };
`;

export default async ({ shot, game, filmstrip }) => {
  await game('await SS.seed(3); await SS.seek(1400);');
  console.log('REST  ', JSON.stringify(await game(M)));
  await shot('aim-rest');

  // --- pull-back on drag -------------------------------------------------
  await game('SS.aim({angle:0.30,power:0.02}); await SS.seek(400);');
  const rest = await game(M);
  await shot('drag-000');
  for (const pw of [0.25, 0.50, 0.75]) {
    await game(`SS.aim({angle:0.30,power:${pw}}); await SS.seek(220);`);
  }
  await game('await SS.seek(400);');
  const drawn = await game(M);
  console.log('DRAG  ', JSON.stringify({ restVw: rest.vw, drawnVw: drawn.vw,
    growPct: +(((drawn.vw / rest.vw) - 1) * 100).toFixed(1), drawn }));
  await shot('aim-drawn');

  // --- the shot ----------------------------------------------------------
  await game('return SS.release();');
  await filmstrip('shot', { from: 60, to: 1860, step: 120, cols: 4 });
  const track = [];
  for (let i = 0; i < 40; i++) { track.push(await game(M)); await game('await SS.seek(60);'); }
  console.log('SHOT_TRACK');
  for (const r of track) console.log(JSON.stringify(r));
  await shot('settled');
  console.log('SETTLED', JSON.stringify(await game(M)));

  // last-10-tile stillness check
  // --- return to the sling -----------------------------------------------
  await game('await SS.seek(2600);');
  console.log('AFTER_WIN', JSON.stringify(await game(M)));

  const still = track.slice(-10);
  const dx = Math.max(...still.map(s => Math.abs(s.camX - still[0].camX)));
  const dy = Math.max(...still.map(s => Math.abs(s.camY - still[0].camY)));
  const dd = Math.max(...still.map(s => Math.abs(s.dist - still[0].dist)));
  console.log('STILLNESS_last10', JSON.stringify({ dx: +dx.toFixed(4), dy: +dy.toFixed(4), dd: +dd.toFixed(4) }));
};
