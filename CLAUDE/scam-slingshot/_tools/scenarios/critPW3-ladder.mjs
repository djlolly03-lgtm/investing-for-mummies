/** PW r3 CRITIC — is there ANY drop height at which glass and stone are separable by MOTION?
 *  Identical 0.90 m cube, identical tilt, four fall heights. COR taken from the velocity
 *  reversal (PW r1 §2); "bounce" = a clean vy sign change with |vy| > 0.25 after contact. */
const f=(n,k=3)=>(n===null||n===undefined||Number.isNaN(n)?'n/a':(+n).toFixed(k));
export default async ({ game }) => {
  const HEIGHTS = [1.05, 1.60, 2.20, 3.00, 4.20];
  console.log('h(drop)  mat    mass   v_in    maxRebound  COR     bounces  slide(m)  restMs  peakSpin  BROKE');
  const grid=[];
  for (const y of HEIGHTS) {
    await game(`SS.freeze(); await SS.loadLevel('_pw-drop'); SS.freeze();`);
    const r = await game(`
      const w=SS.__world, bl=w.entities.filter(e=>e.tag==='block');
      for(const e of bl){ const t=e.body.translation();
        e.body.setTranslation({x:t.x,y:args[0],z:0},true);
        e.body.setRotation({x:0,y:0,z:Math.sin(0.3),w:Math.cos(0.3)},true);
        e.body.setLinvel({x:0,y:0,z:0},true); e.body.setAngvel({x:0,y:0,z:0},true); e.body.wakeUp(); }
      const rec=bl.map(e=>({mat:e.matName,m:+e.body.mass().toFixed(3),
        c:null,vIn:null,vOut:-1e9,b:0,xC:null,xE:null,pv:0,rest:null,spin:0,broke:false}));
      for(let i=0;i<720;i++){ SS.stepOnce();
        bl.forEach((e,k)=>{ const r=rec[k];
          if(e.dead||!e.body||!e.body.isValid()){ r.broke=true; return; }
          const v=e.body.linvel(), t=e.body.translation(), a=e.body.angvel();
          if(Math.abs(a.z)>r.spin) r.spin=Math.abs(a.z);
          if(r.c===null && r.pv<-1.0 && v.y>r.pv+0.5){ r.c=i; r.vIn=r.pv; r.xC=t.x; }
          if(r.c!==null && i<=r.c+12 && v.y>r.vOut) r.vOut=v.y;
          if(r.c!==null && r.pv<-0.25 && v.y>0.25) r.b++;
          if(r.rest===null && e.body.isSleeping()) r.rest=i;
          r.pv=v.y; r.xE=t.x; });
      }
      return rec.map(r=>({mat:r.mat,m:r.m,vIn:r.vIn,vOut:r.vOut>-1e8?r.vOut:null,
        cor:(r.vIn&&r.vOut>-1e8)?r.vOut/-r.vIn:null,b:r.b,
        slide:(r.xE!==null&&r.xC!==null)?Math.abs(r.xE-r.xC):null,
        restMs:(r.rest!==null&&r.c!==null)?Math.round((r.rest-r.c)*1000/120):null,
        spin:r.spin,broke:r.broke}));
    `, y);
    const fall = y - 0.45;
    for (const x of r) console.log(`${f(fall,2).padStart(6)}m  ${String(x.mat).padEnd(6)} ${f(x.m,3).padStart(5)} ${f(x.vIn,2).padStart(7)} ${f(x.vOut,3).padStart(11)} ${f(x.cor,4).padStart(7)}   ${String(x.b).padStart(2)}    ${f(x.slide,3).padStart(7)}  ${String(x.restMs).padStart(5)}  ${f(x.spin,2).padStart(7)}   ${x.broke}`);
    grid.push({fall:+f(fall,2), rows:r});
    console.log('');
  }
  console.log('GLASS vs STONE separability by height (ratio of the larger to the smaller):');
  for (const g of grid) {
    const G=g.rows.find(x=>x.mat==='glass'), S=g.rows.find(x=>x.mat==='stone'), W=g.rows.find(x=>x.mat==='wood');
    const rr=(a,b)=>(a==null||b==null)?'n/a':f(Math.max(a,b)/Math.max(1e-6,Math.min(a,b)),2)+'x';
    console.log(` fall ${f(g.fall,2)} m : COR ${rr(G.cor,S.cor)}  slide ${rr(G.slide,S.slide)}  rest ${rr(G.restMs,S.restMs)}  spin ${rr(G.spin,S.spin)}  bounces ${G.b} vs ${S.b}  | broke G=${G.broke} S=${S.broke} W=${W.broke}   [wood COR ${f(W.cor,4)}, bounces ${W.b}]`);
  }

  // villain vs stone cube, same drop
  await game(`SS.freeze(); await SS.loadLevel('_pw-drop'); SS.freeze();`);
  const v = await game(`
    const w=SS.__world;
    const subs=w.entities.filter(e=>e.tag==='villain'||e.tag==='block');
    for(const e of subs){ const t=e.body.translation();
      e.body.setTranslation({x:t.x,y:2.20,z:0},true);
      e.body.setLinvel({x:0,y:0,z:0},true); e.body.setAngvel({x:0,y:0,z:0},true); e.body.wakeUp(); }
    const rec=subs.map(e=>({tag:e.tag,mat:e.matName||'villain',m:+e.body.mass().toFixed(3),
      c:null,vIn:null,vOut:-1e9,pv:0,rest:null,dead:false}));
    for(let i=0;i<600;i++){ SS.stepOnce();
      subs.forEach((e,k)=>{ const r=rec[k];
        if(e.dead||!e.body||!e.body.isValid()){r.dead=true;return;}
        const vv=e.body.linvel();
        if(r.c===null && r.pv<-1.0 && vv.y>r.pv+0.5){r.c=i;r.vIn=r.pv;}
        if(r.c!==null && i<=r.c+12 && vv.y>r.vOut) r.vOut=vv.y;
        if(r.rest===null && e.body.isSleeping()) r.rest=i;
        r.pv=vv.y; });
    }
    return rec.map(r=>({tag:r.tag,mat:r.mat,m:r.m,vIn:r.vIn,
      cor:(r.vIn&&r.vOut>-1e8)?+(r.vOut/-r.vIn).toFixed(4):null,
      restMs:(r.rest!==null&&r.c!==null)?Math.round((r.rest-r.c)*1000/120):null, dead:r.dead}));
  `);
  console.log('\nVILLAIN vs BLOCKS, identical 1.75 m drop: ' + JSON.stringify(v));
};
