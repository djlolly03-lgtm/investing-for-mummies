/**
 * PW r1 critic — ARC WEIGHT, measured cleanly.
 *  · muzzle jump in metres AND in %W, projected with the camera the player is looking
 *    at when they release (captured BEFORE release, so rig.follow() cannot contaminate it);
 *  · true gravity from a late ballistic window, after the launch kick has unwound;
 *  · apex, time to apex, time to first contact, and how much of the flight is spent
 *    above the tower (a lofted shot should read as thrown, not fired).
 *  · TILT RIG: slide / spin / rest for the three materials, from a real tangential landing.
 */
export default async ({ game }) => {
  console.log('== ARC ==');
  for (const [a,p] of [[0.30,0.90],[0.36,1.00],[0.55,1.00],[0.20,1.00]]) {
    const r = await game(`
      const [a,p] = args;
      SS.freeze(); await SS.loadLevel('l1'); await SS.seed(4242);
      const w = SS.__world, s = w.sling;
      SS.aim({ angle:a, power:p });
      await SS.seek(300);                          // let the aim camera arrive
      SS.aim({ angle:a, power:p });
      const cam = w.camera, V3 = cam.position.constructor;
      const rect = w.renderer.domElement.getBoundingClientRect();
      const P = (x,y) => { const v = new V3(x,y,0).project(cam);
        return [ (v.x*0.5+0.5)*rect.width, (-v.y*0.5+0.5)*rect.height ]; };
      const pouch = { x:s.pouch.x, y:s.pouch.y };
      const pouchPx = P(pouch.x, pouch.y);
      // world-per-pixel at this framing, from two projected points 1 m apart
      const q0 = P(10,3), q1 = P(11,3);
      const pxPerM = q1[0]-q0[0];
      const rel = SS.release();
      const path = [];
      let t = 0, contact = null;
      for (let i=0;i<300;i++) {
        const q = w.projectiles.find(z=>z&&z.body);
        if (!q) break;
        const tr = q.body.translation(), v = q.body.linvel();
        path.push({ t:+t.toFixed(1), x:+tr.x.toFixed(3), y:+tr.y.toFixed(3),
                    vy:+v.y.toFixed(3), vx:+v.x.toFixed(3), sp:+Math.hypot(v.x,v.y).toFixed(2) });
        if (contact===null && i>2 && w.debris.length) contact = t;
        await SS.seek(1000/120); t += 1000/120;
      }
      return { a,p,rel,pouch,pouchPx,pxPerM,vw:rect.width,path,contact };
    `, a, p);
    const P = r.path;
    const first = P[0];
    const jumpM = Math.hypot(first.x-r.pouch.x, first.y-r.pouch.y);
    const jumpPx = jumpM * r.pxPerM;
    // true g: window well after the kick
    const i0 = P.findIndex(s=>s.t>=250), i1 = P.findIndex(s=>s.t>=600);
    const g = (i0>0 && i1>i0) ? (P[i1].vy-P[i0].vy)/((P[i1].t-P[i0].t)/1000) : NaN;
    const apex = P.reduce((m,s)=>s.y>m.y?s:m,P[0]);
    console.log(`${r.a}@${r.p}  cruise ${r.rel.speed?.toFixed(2)} exit ${r.rel.exitSpeed?.toFixed(2)} ` +
      `kickSteps ${r.rel.kickSteps ?? '?'} kickMs ${r.rel.kickMs ?? '?'}`);
    console.log(`   MUZZLE JUMP ${jumpM.toFixed(2)} m = ${jumpPx.toFixed(0)} px = ${(100*jumpPx/r.vw).toFixed(1)} %W  (pouch px x=${r.pouchPx[0].toFixed(0)})`);
    console.log(`   true g (t=250..600ms) ${g.toFixed(2)} m/s2   world gravity -23.544`);
    console.log(`   apex y ${apex.y} @ t=${apex.t}ms   first debris at t=${r.contact}ms   samples ${P.length}`);
    console.log(`   speed at t0 ${first.sp}  at 100ms ${P.find(s=>s.t>=100)?.sp}  at 300ms ${P.find(s=>s.t>=300)?.sp}`);
  }

  console.log('\n== TILT RIG: slide / spin / rest, real tangential landing (1.6 m, rot 0.45) ==');
  const tilt = await game(`
    const out = [];
    for (const m of ['wood','glass','stone']) {
      SS.freeze(); await SS.loadLevel('_crit-pw-tilt');
      const w = SS.__world;
      const b = w.blocks.find(z=>z.matName===m);
      for (const o of w.blocks) if (o!==b) o.body.setTranslation({x:o.body.translation().x,y:-80,z:0}, true);
      b.damage=0; b.crackStep=-1; b.scarFloor=0;
      b.body.setTranslation({ x:12, y:b.h/2+1.60, z:0 }, true);
      const h=0.45/2; b.body.setRotation({x:0,y:0,z:Math.sin(h),w:Math.cos(h)}, true);
      b.body.setLinvel({x:2.5,y:0,z:0}, true);        // give it real tangential speed
      b.body.setAngvel({x:0,y:0,z:-3.0}, true);
      const tr=[]; let t=0; const mass=b.body.mass();
      for (let i=0;i<600;i++){
        await SS.seek(1000/120); t+=1000/120;
        if (b.broken||!b.body) { tr.push({t,broke:true}); break; }
        const p=b.body.translation(), v=b.body.linvel(), av=b.body.angvel();
        tr.push({t:+t.toFixed(1),x:+p.x.toFixed(4),y:+p.y.toFixed(4),vx:+v.x.toFixed(3),vy:+v.y.toFixed(3),az:+av.z.toFixed(3),sl:b.body.isSleeping()?1:0});
      }
      out.push({ m, mass:+mass.toFixed(3), tr });
    }
    return out;
  `);
  for (const r of tilt) {
    const tr = r.tr.filter(s=>!s.broke);
    if (r.tr.some(s=>s.broke)) { console.log(`${r.m.padEnd(6)} mass ${r.mass}  BROKE ON LANDING`); continue; }
    let ci=-1; for(let i=1;i<tr.length;i++) if(tr[i-1].vy<-0.5 && tr[i].vy>tr[i-1].vy+0.3){ci=i;break;}
    const slide = Math.abs(tr[tr.length-1].x - tr[ci].x);
    const hitV = Math.abs(tr[ci-1].vy);
    const cor = Math.max(...tr.slice(ci,ci+10).map(s=>s.vy))/hitV;
    let spinStop=null; for(let i=tr.length-1;i>=ci;i--) if(Math.abs(tr[i].az)>0.35){spinStop=tr[i].t-tr[ci].t;break;}
    let rest=null; for(let i=tr.length-1;i>=ci;i--){ if(Math.hypot(tr[i].vx,tr[i].vy)>0.08||Math.abs(tr[i].az)>0.2){rest=tr[i].t-tr[ci].t;break;} }
    let sleep=null; for(let i=ci;i<tr.length;i++) if(tr[i].sl){sleep=tr[i].t-tr[ci].t;break;}
    console.log(`${r.m.padEnd(6)} mass ${String(r.mass).padStart(6)}  hitV ${hitV.toFixed(2)}  COR ${cor.toFixed(4)}  ` +
      `SLIDE ${slide.toFixed(3)} m  spinStop ${String(spinStop).padStart(6)} ms  rest ${String(rest).padStart(6)} ms  sleep ${sleep} ms`);
  }
};
