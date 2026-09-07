/** crit-P1-r4c — isolate the LAUNCH CAMERA PUNCH from the follow pan.
 * HOOKS.md: camLock parks the composition solver but "camera shake still plays so a punch is
 * still visible", and any real camera intent clears the lock -> take the lock AFTER release(). */
export default async ({ page, game, OUT }) => {
  const say=(k,v)=>console.log('### '+k+' '+JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  const out = await game(`
    const w=SS.__world,cam=w.camera;const VH=innerHeight;
    const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const proj=(x,y)=>{let p=applyM(cam.matrixWorldInverse,[x,y,0]);p=applyM(cam.projectionMatrix,p);
      return [(p[0]*0.5+0.5)*innerWidth,(-p[1]*0.5+0.5)*VH];};
    await SS.aim({angle:0.42,power:0.9}); await SS.seek(400);
    const before = proj(0,0)[1];
    const r = await SS.release();
    const lock = SS.camLock({x:cam.position.x, y:cam.position.y, halfWidth: Math.abs(cam.position.z)*Math.tan(cam.fov*Math.PI/360)*cam.aspect});
    const s=[]; let t=0;
    for(let i=0;i<=40;i++){ s.push({t:Math.round(t), gy:+proj(0,0)[1].toFixed(3),
      camX:+cam.position.x.toFixed(4), camY:+cam.position.y.toFixed(4), camZ:+cam.position.z.toFixed(4),
      rotZ:+cam.rotation.z.toFixed(6)});
      await SS.seek(10); t+=10; }
    return { before, lock, s };`);
  const g0 = out.s[0].gy;
  say('lock', out.lock);
  say('punch_series_pctH', out.s.filter(x=>x.t<=400).map(x=>({t:x.t, pctH:+((x.gy-g0)/720*100).toFixed(3), camY:x.camY})));
  say('punch_summary', { maxPctH:+Math.max(...out.s.map(x=>Math.abs(x.gy-g0)/720*100)).toFixed(3),
    at100:+((out.s.find(x=>x.t===100).gy-g0)/720*100).toFixed(3),
    at250:+((out.s.find(x=>x.t===250).gy-g0)/720*100).toFixed(3),
    rotZmax:+Math.max(...out.s.map(x=>Math.abs(x.rotZ))).toFixed(6),
    camYrange:+(Math.max(...out.s.map(x=>x.camY))-Math.min(...out.s.map(x=>x.camY))).toFixed(5),
    camZrange:+(Math.max(...out.s.map(x=>x.camZ))-Math.min(...out.s.map(x=>x.camZ))).toFixed(5) });
  // does the rig expose a punch at all, and was it called?
  say('rig_api', await game(`const r=SS.__world.rig; return { keys:Object.keys(r), proto:Object.getOwnPropertyNames(Object.getPrototypeOf(r)) };`));
};
