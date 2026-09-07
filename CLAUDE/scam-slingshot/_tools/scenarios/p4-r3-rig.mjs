/** p4-r3-rig.mjs — what the rig is actually doing, step by step. */
export default async ({ game }) => {
  await game('await SS.seed(3); await SS.seek(2600); SS.aim({angle:0.30,power:0.90}); await SS.seek(300); SS.release(); SS.freeze();');
  const rows = [];
  for (let t = 0; t <= 900; t += 40) {
    rows.push(await game(`
      const W = SS.__world, R = W.rig, cam = W.camera;
      const p = (W.projectiles||[]).filter(q=>!q.dead)[0];
      const tr = p && p.body.translation(), lv = p && p.body.linvel();
      const vh = 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw = vh*cam.aspect;
      return { mode:R.mode, tgt: !!R.target, track:R._tracking, floor:+((R._camFloorX??NaN).toFixed(3)),
               wantX:+R.want.x.toFixed(3), posX:+R.pos.x.toFixed(3), camX:+cam.position.x.toFixed(3),
               velX:+R.vel.x.toFixed(2), wvX:+R.wantVel.x.toFixed(2),
               px: tr && +tr.x.toFixed(3), vx: lv && +lv.x.toFixed(2), vw:+vw.toFixed(2),
               projPct: tr ? +(50 + (tr.x-cam.position.x)/vw*100).toFixed(2) : null,
               minX:+R.bounds.minX.toFixed(2), maxX:+R.bounds.maxX.toFixed(2) };`));
    rows[rows.length-1].t = t;
    if (t < 900) await game('await SS.seek(40);');
  }
  for (const r of rows) console.log(
    `t=${String(r.t).padStart(3)} ${r.mode.padEnd(6)} trk=${r.track?1:0} px=${String(r.px).padStart(7)} vx=${String(r.vx).padStart(6)}` +
    ` floor=${String(r.floor).padStart(7)} want=${String(r.wantX).padStart(7)} cam=${String(r.camX).padStart(7)}` +
    ` vel=${String(r.velX).padStart(7)} wv=${String(r.wvX).padStart(7)} vw=${String(r.vw).padStart(6)} proj%=${String(r.projPct).padStart(6)}`);
  console.log('bounds', rows[0].minX, rows[0].maxX);
};
