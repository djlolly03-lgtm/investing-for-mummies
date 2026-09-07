/** crit-P4-r6b — settle framing, shake, horizon-under-pan. Independent critic, round 6. */
const PRE = `
  const W = SS.__world, cam = W.camera, rig = W.rig;
  const V3 = cam.position.constructor;
  const proj = (x,y)=>{const v=new V3(x,y,0).project(cam);return {w:(v.x*.5+.5)*100,h:(1-(v.y*.5+.5))*100};};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const parts = () => { const out=[];
    for (const b of W.blocks) if(!b.dead){const t=b.body.translation();out.push({x:t.x,y:t.y,area:b.w*b.h,kind:'block'});}
    for (const d of W.debris) { const t=d.body?d.body.translation():d.mesh.position; out.push({x:t.x,y:t.y,area:(d.w||0.35)*(d.h||0.35),kind:'debris'}); }
    for (const v of W.villains) if(v.alive){const t=v.body.translation();out.push({x:t.x,y:t.y,area:1.2,kind:'villain'});}
    return out; };
  const camSnap=()=>({x:cam.position.x,y:cam.position.y,z:cam.position.z,vw:vw(),vh:vh(),
     shake: rig.shake ? (typeof rig.shake==='number'?rig.shake:Math.hypot(rig.shake.x||0,rig.shake.y||0)) : null});
`;
export default async ({ page, shot, filmstrip, game, state, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const g = (b,...a)=>game(PRE+b,...a);
  const R = {};

  // ---- A. SHAKE at impact, 10ms resolution -------------------------------
  await game('await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release(); await SS.seek(480);');
  const sh = [];
  for (let t = 480; t <= 1400; t += 10) {
    sh.push(await g(`return { t:${t}, ...camSnap(), rawShake: JSON.parse(JSON.stringify(rig.shake ?? null)) };`));
    await game('await SS.seek(10);');
  }
  R.shake = sh;

  // ---- B. SETTLE FRAMING, 6 different shots -------------------------------
  const shots = [[0.30,0.90],[0.26,0.95],[0.34,0.88],[0.22,1.0],[0.40,0.82],[0.52,0.55]];
  R.settle = [];
  for (const [a,p] of shots) {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(a, p, { steps: 10 });
    await game('SS.release(); await SS.seek(4200);');
    const m = await g(`
      const ps = parts(); const st = await SS.state();
      if(!ps.length) return { empty:true, cam:camSnap(), state:st };
      const A = ps.reduce((s,q)=>s+q.area,0);
      const cx = ps.reduce((s,q)=>s+q.x*q.area,0)/A;
      const L = Math.min(...ps.map(q=>q.x)), Rr = Math.max(...ps.map(q=>q.x));
      // the MASS: the 90% of area closest to the centroid
      const sorted = ps.slice().sort((u,v)=>Math.abs(u.x-cx)-Math.abs(v.x-cx));
      let acc=0; const core=[]; for(const q of sorted){ core.push(q); acc+=q.area; if(acc>=0.90*A) break; }
      const cL = Math.min(...core.map(q=>q.x)), cR = Math.max(...core.map(q=>q.x));
      const blocks = ps.filter(q=>q.kind!=='debris');
      const bL = blocks.length?Math.min(...blocks.map(q=>q.x)):null, bR = blocks.length?Math.max(...blocks.map(q=>q.x)):null;
      return { cam:camSnap(), state:st,
        centroidPctW: proj(cx,1.5).w,
        allLPctW: proj(L,1.5).w, allRPctW: proj(Rr,1.5).w,
        corePctW: [proj(cL,1.5).w, proj(cR,1.5).w],
        blockPctW: blocks.length?[proj(bL,1.5).w, proj(bR,1.5).w]:null,
        nDebris: W.debris.length, nBlocks: W.blocks.filter(b=>!b.dead).length,
        villains: W.villains.map(v=>({alive:v.alive, pct: v.alive?proj(v.body.translation().x, v.body.translation().y):null})) };
    `);
    R.settle.push({ angle:a, power:p, ...m });
    await shot(`settle-${a}-${p}`);
  }

  // ---- C. HORIZON under a PURE X PAN (camLock, identical halfWidth) --------
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  R.panShots = [];
  for (const x of [6, 12, 18, 24]) {
    await game('SS.camLock({ x: args[0], y: 4.0, halfWidth: 16 }); await SS.seek(600);', x);
    R.panShots.push({ x, file: await shot(`panX-${x}`), cam: await g('return camSnap();') });
  }
  await game('SS.camUnlock(); await SS.seek(600);');

  // ---- D. clean settle frame at 4.2 s (before the win overlay) ------------
  await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
  await dragShot(0.30, 0.90, { steps: 10 });
  await game('SS.release(); await SS.seek(4200);');
  R.cleanSettleShot = await shot('settle-clean-4200ms');
  R.cleanSettle = await g(`return { cam: camSnap(), state: await SS.state() };`);

  await fs.writeFile(path.join(OUT,'P4b.json'), JSON.stringify(R,null,2));
  const pk = R.shake.reduce((m,r)=> (r.shake??0)>(m.shake??0)?r:m, R.shake[0]);
  console.log(JSON.stringify({ shakePeak: pk, settle: R.settle.map(s=>({
    a:s.angle,p:s.power, centroid:+s.centroidPctW?.toFixed(1), core:s.corePctW?.map(v=>+v.toFixed(1)),
    blocks:s.blockPctW?.map(v=>+v.toFixed(1)), all:[+s.allLPctW?.toFixed(1),+s.allRPctW?.toFixed(1)],
    vw:+s.cam.vw.toFixed(1), camx:+s.cam.x.toFixed(2), score:s.state.score })) }, null, 2));
};
