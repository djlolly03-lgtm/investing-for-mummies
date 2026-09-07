/** crit-P4-r6-portrait — criteria 1, 3, 8 on portrait phone. */
const PRE = `
  const W=SS.__world, cam=W.camera; const V3=cam.position.constructor;
  const proj=(x,y)=>{const v=new V3(x,y,0).project(cam);return {w:(v.x*.5+.5)*100,h:(1-(v.y*.5+.5))*100};};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const boxes=()=>{const o=[];
    for(const b of W.blocks) if(!b.dead){const t=b.body.translation(),r=b.body.rotation();
      const a=Math.atan2(2*(r.w*r.z+r.x*r.y),1-2*(r.y*r.y+r.z*r.z));
      const c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
      o.push({x:t.x,y:t.y,hw:(b.w*c+b.h*s)/2,hh:(b.w*s+b.h*c)/2});}
    for(const v of W.villains) if(v.alive){const t=v.body.translation();o.push({x:t.x,y:t.y,hw:0.54,hh:0.54});}
    return o;};
`;
export default async ({ page, shot, filmstrip, game, dragShot, OUT }) => {
  const fs=await import('node:fs/promises'); const path=await import('node:path');
  const g=(b,...a)=>game(PRE+b,...a);
  const vp = await page.viewport();
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  const aim = await g(`const bs=boxes();
    const L=Math.min(...bs.map(b=>b.x-b.hw)),R=Math.max(...bs.map(b=>b.x+b.hw));
    const top=bs.reduce((m,b)=> (b.y+b.hh)>(m.y+m.hh)?b:m, bs[0]);
    return { fov:cam.fov, vw:vw(), vh:vh(), aspect:cam.aspect, camx:cam.position.x, camy:cam.position.y,
      rot:[cam.rotation.x,cam.rotation.y,cam.rotation.z],
      slingPctW: proj(0,3.3).w, targetRPctW: proj(R,1.5).w, standLPctW: proj(L,1.5).w,
      tallestTopPctH: proj(top.x, top.y+top.hh).h,
      groundPctH: proj(L,0).h,
      edgeDrift: [-0.45,-0.25,0,0.25,0.45].map(f=>{ const x=cam.position.x+f*vw();
        const p0=proj(x,0.2), p1=proj(x,3.2);
        return +(Math.atan2((p1.w-p0.w)*${vp.width}/100,(p0.h-p1.h)*${vp.height}/100)*180/Math.PI).toFixed(4); }) };`);
  await shot('portrait-aim');
  await dragShot(0.30,0.90,{steps:10});
  await game('SS.release();');
  await filmstrip('portrait-flight', { from: 0, to: 900, step: 75, cols: 4 });
  await game('await SS.seek(6000);');
  await shot('portrait-settle');
  const settle = await g(`const bs=boxes(); const s=await SS.state();
    return { camx:cam.position.x, vw:vw(),
      L: bs.length?proj(Math.min(...bs.map(b=>b.x-b.hw)),1.5).w:null,
      R: bs.length?proj(Math.max(...bs.map(b=>b.x+b.hw)),1.5).w:null, phase:s.phase, score:s.score };`);
  await fs.writeFile(path.join(OUT,'PORTRAIT.json'), JSON.stringify({vp,aim,settle},null,2));
  console.log(JSON.stringify({vp,aim,settle},null,2));
};
