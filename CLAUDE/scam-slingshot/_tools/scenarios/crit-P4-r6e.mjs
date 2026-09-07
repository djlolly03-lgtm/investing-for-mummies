/** crit-P4-r6e — the launch moment: does the camera move BACKWARDS against the shot? */
const PRE = `
  const W=SS.__world, cam=W.camera; const V3=cam.position.constructor;
  const proj=(x,y)=>{const v=new V3(x,y,0).project(cam);return {w:(v.x*.5+.5)*100,h:(1-(v.y*.5+.5))*100};};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const st=()=>{const b=W.blocks.filter(q=>!q.dead).map(q=>q.body.translation().x);
    return b.length?{L:Math.min(...b),R:Math.max(...b)}:null;};
`;
export default async ({ shot, filmstrip, game, dragShot, OUT }) => {
  const fs=await import('node:fs/promises'); const path=await import('node:path');
  const g=(b,...a)=>game(PRE+b,...a);
  const runs = {};
  for (const [a,p] of [[0.30,0.90],[0.24,0.98],[0.20,1.00],[0.28,0.92]]) {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(a,p,{steps:10});
    await game('SS.release();');
    const rows=[];
    for (let t=0;t<=600;t+=25){                       // 25 ms == exactly 3 solver steps
      rows.push(await g(`const b=W.projectiles.find(q=>q&&q.body&&!q.dead);
        const bt=b?b.body.translation():null; const s=st();
        return { t:${t}, camx:cam.position.x, vw:vw(),
          slingPctW: proj(0,3.3).w,
          ballX: bt?bt.x:null, ballPctW: bt?proj(bt.x,bt.y).w:null,
          structMidPctW: s?proj((s.L+s.R)/2,1.5).w:null, structRPctW: s?proj(s.R,1.5).w:null };`));
      if (t<600) await game('await SS.seek(25);');
    }
    runs[`${a}_${p}`]=rows;
  }
  await fs.writeFile(path.join(OUT,'LAUNCH.json'), JSON.stringify(runs,null,2));
  // fine filmstrip of the launch moment
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30,0.90,{steps:10});
  await game('SS.release();');
  await filmstrip('launch-fine', { from: 0, to: 300, step: 25, cols: 4 });
  for (const [k,rows] of Object.entries(runs)) {
    const c0=rows[0].camx, min=Math.min(...rows.map(r=>r.camx));
    const backAt=rows.find(r=>r.camx===min);
    console.log(`${k}: camx0=${c0.toFixed(3)} min=${min.toFixed(3)} (t=${backAt.t}) backwards=${(c0-min).toFixed(3)} world = ${(100*(c0-min)/rows[0].vw).toFixed(2)} %W ; sling ${rows[0].slingPctW.toFixed(1)} -> ${Math.max(...rows.map(r=>r.slingPctW)).toFixed(1)} %W ; struct ${rows[0].structMidPctW.toFixed(1)} -> ${Math.max(...rows.map(r=>r.structMidPctW)).toFixed(1)} %W ; structR max ${Math.max(...rows.map(r=>r.structRPctW)).toFixed(1)} %W`);
  }
};
