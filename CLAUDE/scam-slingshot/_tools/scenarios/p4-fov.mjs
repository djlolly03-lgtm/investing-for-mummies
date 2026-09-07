/** P4 criterion 8 — vertical edge angle drift from frame centre to frame edge. */
export default async ({ game }) => {
  await game('await SS.seed(3); await SS.seek(1400);');
  console.log('FOV', JSON.stringify(await game(`
    const w=SS.__world, cam=w.camera;
    const t=Math.tan(cam.fov*Math.PI/180/2);
    const vh=2*cam.position.z*t, vw=vh*cam.aspect;
    const D=0.525;                       // block half-depth
    // project a point at (x,y,z) with an axis-aligned camera at (cx,cy,dist)
    const P=(x,y,z)=>{ const d=cam.position.z-z; const hh=d*t, hw=hh*cam.aspect;
      return { u:((x-cam.position.x)/(2*hw)+0.5)*100, v:(0.5-(y-cam.position.y)/(2*hh))*100 }; };
    const ang=(x)=>{ // the near-face vertical edge of a 2.6-tall block at world x
      const a=P(x,0.44,D), b=P(x,3.04,D);
      return +(Math.atan2((b.u-a.u)*cam.aspect, (a.v-b.v))*180/Math.PI).toFixed(4); };
    const centreX = cam.position.x;
    const edgeX   = cam.position.x + vw*0.42;
    return { fov:cam.fov, vw:+vw.toFixed(2),
             angleAtCentreDeg: ang(centreX), angleAtEdgeDeg: ang(edgeX),
             driftDeg: +Math.abs(ang(edgeX)-ang(centreX)).toFixed(4),
             up:[cam.up.x,cam.up.y,cam.up.z], rotation:[+cam.rotation.x.toFixed(6),+cam.rotation.y.toFixed(6),+cam.rotation.z.toFixed(6)] };
  `)));
};
