/** crit-P1-r4b — fair blind frame via the REAL pointer path, plus band-taper zoom. */
import path from 'node:path';
export default async ({ page, game, state, dragShot, OUT }) => {
  const say=(k,v)=>console.log('### '+k+' '+JSON.stringify(v));
  const full=async n=>{const f=path.join(OUT,n+'.png'); await page.screenshot({path:f}); return f;};
  const crop=async(n,c)=>{const f=path.join(OUT,n+'.png'); await page.screenshot({path:f,clip:c}); return f;};
  const G=(b,...a)=>game(`const w=SS.__world,cam=w.camera;const VW=innerWidth,VH=innerHeight;
    const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const proj=(x,y,z)=>{let p=applyM(cam.matrixWorldInverse,[x,y,z||0]);p=applyM(cam.projectionMatrix,p);
      return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
    `+b, ...a);

  // ---- real-drag shot, so the tutorial bark clears like it does for a human
  await game('SS.seed(11); await SS.seek(2000);');
  const d = await dragShot(0.42, 0.90, { steps: 10 });
  say('drag', { angle:d.angle, clamped:d.clamped, grabbable:d.grabbable });
  await game('await SS.seek(200);');
  await full('R-fullstretch-realdrag');
  // zoom on the band taper at full stretch
  const bc = await G(`const s=w.sling; const a=proj(s.anchor.x,s.anchor.y,0), p=proj(s.pouch.x,s.pouch.y,0);
    const x0=Math.min(a[0],p[0])-60,x1=Math.max(a[0],p[0])+60,y0=Math.min(a[1],p[1])-70,y1=Math.max(a[1],p[1])+70;
    return {x:Math.max(0,Math.round(x0)),y:Math.max(0,Math.round(y0)),
      width:Math.round(Math.min(VW-Math.max(0,x0),x1-x0)),height:Math.round(Math.min(VH-Math.max(0,y0),y1-y0))};`);
  say('bandClip', bc);
  await crop('R-band-zoom-full', bc);
  const r = await game('return await SS.release();');
  say('release', { muzzleDist:r.muzzleDist, muzzleAD:r.muzzleAD, exitSpeed:r.exitSpeed, kickMs:r.kickMs });
  for (const t of [0,50,80,100]) {
    if (t===0) {} else await game('await SS.seek(args[0]);', t - (t===50?0:(t===80?50:80)));
    await full(`R-t${t}`);
  }
  say('tut_text', await page.evaluate(()=>Array.from(document.querySelectorAll('body *'))
      .filter(e=>e.children.length===0 && e.textContent.trim().length>4 && e.offsetParent)
      .map(e=>e.textContent.trim()).slice(0,12)));
};
