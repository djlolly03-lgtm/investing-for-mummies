/**
 * P4 — camera MOTION measurement.
 *   · lag-then-lead: where the projectile sits in frame, tile by tile
 *   · shake: peak %H and decay time
 *   · settle: when does camera translation actually stop, relative to the last body sleeping
 *   · auto-frame: screen margin around every surviving villain
 */
const VIEW = `
  const w = SS.__world, cam = w.camera;
  const t = Math.tan(cam.fov*Math.PI/180/2);
  const vh = 2*cam.position.z*t, vw = vh*cam.aspect;
  return { cx:cam.position.x, cy:cam.position.y, vw, vh, rigX:w.rig.pos.x, rigY:w.rig.pos.y,
           dist:cam.position.z, mode:w.rig.mode, shake:w.rig.shake, up:[cam.up.x,cam.up.y,cam.up.z] };
`;
const SAMPLE = `
  const w = SS.__world, cam = w.camera, L = w.level;
  const t = Math.tan(cam.fov*Math.PI/180/2);
  const vh = 2*cam.position.z*t, vw = vh*cam.aspect;
  const px = x => ((x-cam.position.x)/vw + 0.5)*100;
  const py = y => (0.5 - (y-cam.position.y)/vh)*100;
  const p = w.projectiles.filter(q=>!q.dead && q.launched)[0];
  let bx0=1e9,bx1=-1e9;
  for (const b of w.blocks) if(!b.dead){ const q=b.position(); bx0=Math.min(bx0,q.x); bx1=Math.max(bx1,q.x); }
  const moving = w.entities.filter(e=>e.body && !e.dead && e.body.isDynamic?.() && !e.body.isSleeping()).length;
  return {
    t: +(w.simTime*1000).toFixed(0), mode: w.rig.mode,
    projPctW: p ? +px(p.position().x).toFixed(1) : null,
    projPctH: p ? +py(p.position().y).toFixed(1) : null,
    projSpeed: p ? +p.speed().toFixed(1) : null,
    structPctW: bx1>-1e8 ? +(((px(bx0)+px(bx1))/2)).toFixed(1) : null,
    camX: +cam.position.x.toFixed(3), camY: +cam.position.y.toFixed(3), dist: +cam.position.z.toFixed(3),
    shake: +w.rig.shake.toFixed(4), shakePctH: +(w.rig.shake*0.022*100).toFixed(2),
    awake: moving, groundPctH: +py(0).toFixed(1), vw:+vw.toFixed(2),
  };
`;

export default async ({ shot, game, filmstrip, page }) => {
  await game('await SS.seed(3); await SS.seek(1500);');

  // ---- launch: lag -> lead -------------------------------------------------
  await game('SS.aim({angle:0.50,power:1.0}); await SS.seek(450);');
  await game('return SS.release();');
  const flight = [];
  for (let i = 0; i < 22; i++) {
    flight.push(await game(SAMPLE));
    await game('await SS.seek(60);');
  }
  console.log('FLIGHT_TRACK');
  for (const f of flight) console.log(JSON.stringify(f));

  // ---- shake + settle ------------------------------------------------------
  const tail = [];
  for (let i = 0; i < 70; i++) {
    tail.push(await game(SAMPLE));
    await game('await SS.seek(50);');
  }
  console.log('TAIL_TRACK');
  for (const f of tail) console.log(JSON.stringify(f));

  // ---- auto-frame margin ---------------------------------------------------
  console.log('AUTOFRAME', JSON.stringify(await game(`
    const w = SS.__world, cam = w.camera;
    const t = Math.tan(cam.fov*Math.PI/180/2);
    const vh = 2*cam.position.z*t, vw = vh*cam.aspect;
    const px = x => ((x-cam.position.x)/vw + 0.5)*100;
    const py = y => (0.5 - (y-cam.position.y)/vh)*100;
    return { mode: w.rig.mode, phase: w.phase,
      villains: w.villains.filter(v=>v.alive).map(v=>{const q=v.position();
        return { xPct:+px(q.x).toFixed(1), yPct:+py(q.y).toFixed(1),
                 marginPct:+Math.min(px(q.x), 100-px(q.x), py(q.y), 100-py(q.y)).toFixed(1) }; }) };
  `)));
  await shot('after-settle');
};
