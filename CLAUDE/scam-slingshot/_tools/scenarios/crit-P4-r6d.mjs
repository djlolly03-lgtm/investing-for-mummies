/** crit-P4-r6d — settle framing sweep, measured AFTER the lock (7 s). Does the frame hold the subject? */
const PRE = `
  const W=SS.__world, cam=W.camera; const V3=cam.position.constructor;
  const proj=(x,y)=>{const v=new V3(x,y,0).project(cam);return {w:(v.x*.5+.5)*100,h:(1-(v.y*.5+.5))*100};};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const parts=()=>{const o=[];
    for(const b of W.blocks) if(!b.dead){const t=b.body.translation();o.push({x:t.x,y:t.y,a:b.w*b.h,k:'block'});}
    for(const d of W.debris){const t=d.body?d.body.translation():d.mesh.position;o.push({x:t.x,y:t.y,a:0.12,k:'debris'});}
    for(const v of W.villains) if(v.alive){const t=v.body.translation();o.push({x:t.x,y:t.y,a:1.2,k:'villain'});}
    return o;};
`;
export default async ({ shot, game, dragShot, OUT }) => {
  const fs=await import('node:fs/promises'); const path=await import('node:path');
  const g=(b,...a)=>game(PRE+b,...a); const out=[];
  const shots=[[0.24,0.98],[0.26,0.95],[0.28,0.92],[0.30,0.90],[0.32,0.90],[0.34,0.88],[0.40,0.82],[0.52,0.55],[0.20,1.0],[0.36,0.86]];
  for (const [a,p] of shots){
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    const d = await dragShot(a,p,{steps:10});
    await game('SS.release(); await SS.seek(7000);');
    const m = await g(`const ps=parts(); const s=await SS.state();
      if(!ps.length) return {empty:true};
      const A=ps.reduce((q,r)=>q+r.a,0), cx=ps.reduce((q,r)=>q+r.x*r.a,0)/A;
      const bl=ps.filter(q=>q.k!=='debris');
      const bL=bl.length?Math.min(...bl.map(q=>q.x)):null,bR=bl.length?Math.max(...bl.map(q=>q.x)):null;
      const aL=Math.min(...ps.map(q=>q.x)),aR=Math.max(...ps.map(q=>q.x));
      const vills=W.villains.filter(v=>v.alive).map(v=>{const t=v.body.translation();
        return { w:proj(t.x,t.y).w, h:proj(t.x,t.y).h };});
      return { camx:cam.position.x, vw:vw(), cen:proj(cx,1.5).w,
        blkL:bL===null?null:proj(bL,1.5).w, blkR:bR===null?null:proj(bR,1.5).w,
        allL:proj(aL,1.5).w, allR:proj(aR,1.5).w, vills, phase:s.phase, score:s.score,
        nBlocks:s.blocks, nDebris:s.debris };`);
    out.push({ angle:a, power:p, drag:d.angle, ...m });
    await shot(`settle7s-${a}-${p}`);
  }
  await fs.writeFile(path.join(OUT,'SWEEP.json'), JSON.stringify(out,null,2));
  console.log('  a    p    camx    vw    cen%W   blk[L,R]        all[L,R]        villains%W        phase   score');
  for(const r of out) console.log(`${r.angle.toFixed(2)} ${r.power.toFixed(2)} ${r.camx.toFixed(2).padStart(6)} ${r.vw.toFixed(2).padStart(6)} ${r.cen.toFixed(1).padStart(6)}  [${(r.blkL??-999).toFixed(1).padStart(6)},${(r.blkR??-999).toFixed(1).padStart(6)}] [${r.allL.toFixed(1).padStart(6)},${r.allR.toFixed(1).padStart(6)}]  ${JSON.stringify(r.vills.map(v=>+v.w.toFixed(1)))}  ${r.phase} ${r.score}`);
};
