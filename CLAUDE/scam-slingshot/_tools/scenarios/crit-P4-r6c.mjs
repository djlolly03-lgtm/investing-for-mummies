/** crit-P4-r6c — clean settle framing, mid-flight still for the blind pair, collapse regression. */
const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj=(x,y)=>{const v=new V3(x,y,0).project(cam);return {w:(v.x*.5+.5)*100,h:(1-(v.y*.5+.5))*100};};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const parts=()=>{const o=[];
    for(const b of W.blocks) if(!b.dead){const t=b.body.translation();o.push({x:t.x,y:t.y,a:b.w*b.h,k:'block'});}
    for(const d of W.debris){const t=d.body?d.body.translation():d.mesh.position;o.push({x:t.x,y:t.y,a:0.12,k:'debris'});}
    for(const v of W.villains) if(v.alive){const t=v.body.translation();o.push({x:t.x,y:t.y,a:1.2,k:'villain'});}
    return o;};
  const cs=()=>({x:cam.position.x,y:cam.position.y,z:cam.position.z,vw:vw(),vh:vh(),
    rot:[cam.rotation.x,cam.rotation.y,cam.rotation.z]});
`;
export default async ({ page, shot, filmstrip, game, state, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const g=(b,...a)=>game(PRE+b,...a); const R={};

  // ---- mid-flight still for the blind pair (structure intact, ball in air) ----
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release(); await SS.seek(450);');
  R.midflight = await g(`const p=W.projectiles.find(q=>q&&q.body&&!q.dead); const t=p.body.translation();
    const ps=parts().filter(q=>q.k!=='debris'); const L=Math.min(...ps.map(q=>q.x)),Rr=Math.max(...ps.map(q=>q.x));
    return { cam:cs(), ballPct:proj(t.x,t.y), structMidPctW:proj((L+Rr)/2,1.5).w,
             structLPctW:proj(L,1.5).w, structRPctW:proj(Rr,1.5).w, state: await SS.state() };`);
  R.midflightShot = await shot('midflight-t450');

  // ---- settle framing: track to the lock, shoot at the lock ----
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release();');
  const trace=[];
  for (let t=1000;t<=7000;t+=200){
    await game('await SS.seek(200);');
    trace.push(await g(`const ps=parts(); const A=ps.reduce((s,q)=>s+q.a,0);
      const cx=ps.reduce((s,q)=>s+q.x*q.a,0)/A;
      const bl=ps.filter(q=>q.k!=='debris');
      const bL=bl.length?Math.min(...bl.map(q=>q.x)):null,bR=bl.length?Math.max(...bl.map(q=>q.x)):null;
      const aL=Math.min(...ps.map(q=>q.x)),aR=Math.max(...ps.map(q=>q.x));
      const s=await SS.state();
      return {t:${t}, cam:cs(), centroidPctW:proj(cx,1.5).w,
        blockLPctW:bL===null?null:proj(bL,1.5).w, blockRPctW:bR===null?null:proj(bR,1.5).w,
        allLPctW:proj(aL,1.5).w, allRPctW:proj(aR,1.5).w, phase:s.phase, asleep:s.bodiesAsleep, bodies:s.bodies };`));
  }
  R.settleTrace = trace;
  R.settleShot = await shot('settle-locked');

  // ---- COLLAPSE PROPAGATION regression (impact + 800 ms) ----
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  const pre = await g(`return W.blocks.filter(b=>!b.dead).map(b=>{const t=b.body.translation();return {id:b.id,x:t.x,y:t.y,mat:b.matName};});`);
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release(); await SS.seek(560);');       // measured first contact
  const atHit = await g(`return W.blocks.filter(b=>!b.dead).map(b=>{const t=b.body.translation();return {id:b.id,x:t.x,y:t.y};});`);
  await game('await SS.seek(800);');
  const post = await g(`return { alive: W.blocks.filter(b=>!b.dead).map(b=>{const t=b.body.translation(),v=b.body.linvel();
      return {id:b.id,x:t.x,y:t.y,sp:Math.hypot(v.x,v.y)};}), debris: W.debris.length, dead: W.blocks.filter(b=>b.dead).length };`);
  const m = new Map(pre.map(b=>[b.id,b]));
  const moved = post.alive.filter(b=>{const p=m.get(b.id); return p && Math.hypot(b.x-p.x,b.y-p.y) > 0.15;});
  R.collapse = { blocksAtStart: pre.length, aliveAt800: post.alive.length, dead: post.dead, debris: post.debris,
    movedGt015: moved.length, movingGt05ms: post.alive.filter(b=>b.sp>0.5).length,
    lowestMoved: moved.length ? Math.min(...moved.map(b=>m.get(b.id).y)) : null };

  await fs.writeFile(path.join(OUT,'P4c.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify({ midflight: { ball:+R.midflight.ballPct.w.toFixed(2), struct:+R.midflight.structMidPctW.toFixed(2), vw:+R.midflight.cam.vw.toFixed(2) },
    collapse: R.collapse,
    settleEnd: trace.slice(-3).map(r=>({t:r.t,camx:+r.cam.x.toFixed(2),vw:+r.cam.vw.toFixed(2),
      blockL:+r.blockLPctW?.toFixed(1),blockR:+r.blockRPctW?.toFixed(1),
      allL:+r.allLPctW.toFixed(1),allR:+r.allRPctW.toFixed(1),cen:+r.centroidPctW.toFixed(1),ph:r.phase})) }, null, 2));
};
