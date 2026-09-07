/**
 * p4-lead-probe.mjs — numeric probe for the P4 r2 gap: MID-FLIGHT LEAD.
 *
 * Reproduces the critic's exact shot (seed 3, aim {angle:0.30, power:1.0}) and traces, every
 * 25 ms of sim time from release to well past impact:
 *   · projectile screen %W                (rubric: 55-75 %W mid-flight)
 *   · target structure screen %W          (rubric: 40-60 %W through the approach)
 *   · the block the projectile is closest to, in %W (the real "thing it is about to hit")
 *   · slingshot fork screen %W            (must be off-frame at impact)
 *   · camx - projx                        (positive = camera ahead, negative = camera behind)
 *   · vw, camera mode, first-contact tick
 */
export default async ({ game, OUT }) => {
  const PRE = `
    const W = SS.__world, cam = W.camera;
    const sc = (x,y) => { const v = new (SS.__three ? SS.__three.Vector3 : Object)(); return null; };
  `;
  const g = (body, ...a) => game(body, ...a);

  const TRACE = `
    const W = SS.__world, cam = W.camera, rig = W.rig;
    const pv = (x,y) => { const v = cam.position.clone(); v.set(x,y,0); v.project(cam);
      return +((v.x*0.5+0.5)*100).toFixed(2); };
    const dist = cam.position.z;
    const vh = 2*Math.tan(cam.fov*Math.PI/360)*dist, vw = vh*cam.aspect;
    const p = W.projectiles.filter(q=>!q.dead)[0];
    const pt = p ? p.body.translation() : null;
    const pvv = p ? p.body.linvel() : null;
    // live structure: surviving blocks
    let minX=1e9,maxX=-1e9,sumX=0,nb=0, nearest=null, nd=1e9;
    for (const b of W.blocks) if (!b.dead) {
      const t=b.body.translation(); minX=Math.min(minX,t.x); maxX=Math.max(maxX,t.x); sumX+=t.x; nb++;
      if (pt) { const d=Math.hypot(t.x-pt.x, t.y-pt.y); if (d<nd) { nd=d; nearest=t; } }
    }
    const slingX = W.sling && W.sling.anchor ? W.sling.anchor.x : 0;
    return {
      camx:+cam.position.x.toFixed(3), camy:+cam.position.y.toFixed(3), vw:+vw.toFixed(3), vh:+vh.toFixed(3),
      mode: rig.mode, followT: rig.followT!=null?+rig.followT.toFixed(3):null,
      px: pt?+pt.x.toFixed(3):null, py: pt?+pt.y.toFixed(3):null,
      spd: pvv?+Math.hypot(pvv.x,pvv.y).toFixed(2):null,
      projPctW: pt?pv(pt.x,pt.y):null,
      structCentrePctW: nb?pv(sumX/nb, 2):null,
      structNearPctW: nb?pv(minX,2):null,
      nearestBlockPctW: nearest?pv(nearest.x,nearest.y):null,
      slingPctW: pv(slingX, 3.4),
      camMinusProj: pt?+(cam.position.x-pt.x).toFixed(3):null,
      blocksAlive: nb, debris: W.debris.length,
      villainsAlive: W.villains.filter(v=>v.alive).length,
    };`;

  const run = async (angle, power, label) => {
    await g('await SS.seed(3); await SS.seek(2600); SS.aim({angle:args[0],power:args[1]}); await SS.seek(300); SS.release();', angle, power);
    const rows = [];
    for (let t = 0; t <= 1600; t += 25) {
      const r = await g('return (()=>{' + TRACE + '})();');
      rows.push({ t, ...r });
      await g('await SS.seek(25);');
    }
    console.log('\n===== ' + label + ' (angle=' + angle + ' power=' + power + ') =====');
    console.log('t    camx    px     vw    cam-proj  proj%W  struct%W  near%W  sling%W  mode      blocks spd');
    for (const r of rows) {
      if (r.t % 50) continue;
      console.log(
        String(r.t).padEnd(5) +
        String(r.camx).padEnd(8) +
        String(r.px ?? '-').padEnd(7) +
        String(r.vw).padEnd(7) +
        String(r.camMinusProj ?? '-').padEnd(10) +
        String(r.projPctW ?? '-').padEnd(8) +
        String(r.structCentrePctW ?? '-').padEnd(10) +
        String(r.nearestBlockPctW ?? '-').padEnd(8) +
        String(r.slingPctW).padEnd(9) +
        String(r.mode).padEnd(10) +
        String(r.blocksAlive).padEnd(7) +
        String(r.spd ?? '-'));
    }
    return rows;
  };

  const A = await run(0.30, 1.0, 'CRITIC SHOT');
  const B = await run(0.60, 1.0, 'LOFTED SHOT');
  const fs = await import('node:fs/promises');
  await fs.writeFile(OUT + '/LEAD.json', JSON.stringify({ flat: A, lofted: B }, null, 2));
};
