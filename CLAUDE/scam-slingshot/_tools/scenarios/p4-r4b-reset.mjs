/**
 * p4-r4b-reset.mjs — does the camera come BACK to the establishing frame for shot 2?
 * The r4b sweep saw shot 2 start at vw 19.43 instead of 34.70. Find out whether that is the
 * game or the harness: watch phase / rig.mode / vw / sling %W across the whole handover.
 */
export default async ({ game, shot, OUT }) => {
  const PRE = `
    const W = SS.__world, cam = W.camera, rig = W.rig;
    const V3 = cam.position.constructor;
    const px = (x, y) => { const v = new V3(x, y, 0); v.project(cam); return +((v.x*0.5+0.5)*100).toFixed(2); };
    const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
    const S = () => ({ phase: W.phase, mode: rig.mode, vw: +(vh()*cam.aspect).toFixed(2),
      slingPctW: W.sling ? px(W.sling.anchor.x, W.sling.anchor.y) : null,
      slingState: W.sling ? W.sling.state : null,
      ammoUsed: W.ammoUsed, ammoLeft: (W.ammoQueue || []).length,
      live: (W.projectiles||[]).filter(q=>!q.dead).length });
  `;
  const g = (b) => game(PRE + b);
  const log = [];
  const mark = async (tag) => log.push({ tag, ...(await g('return S();')) });

  await g('await SS.seed(3); await SS.seek(2600);');
  await mark('after load');
  await g('SS.aim({ angle: 0.52, power: 1.00 }); await SS.seek(300);');
  await mark('aimed shot1');
  await g('SS.release();');
  await mark('released shot1');
  for (const t of [500, 1000, 2000, 3000, 4000, 5000, 6000]) {
    await g(`await SS.seek(1000);`);
    await mark('t+' + t);
  }
  // now try to aim shot 2 the way a player would
  const r2 = await g('return SS.aim({ angle: 0.34, power: 0.90 });');
  await mark('aim() shot2 -> ' + JSON.stringify(r2));
  await g('await SS.seek(300);');
  await mark('after aim seek');

  console.log(log.map(r => `${String(r.tag).padEnd(28)} phase=${String(r.phase).padEnd(9)} mode=${String(r.mode).padEnd(8)} vw=${String(r.vw).padStart(6)} sling=${String(r.slingPctW).padStart(7)}%W slingState=${r.slingState} ammoUsed=${r.ammoUsed} left=${r.ammoLeft} live=${r.live}`).join('\n'));
  console.log('errors', JSON.stringify(await g('return SS.errors.map(e=>e.text);')));
  await shot('shot2-aim');
};
