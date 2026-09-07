/**
 * crit-P3-r7b.mjs — the follow-ups the first pass earned.
 *
 *  1. REAL interpenetration: 2D OBB separating-axis test on the actual collider extents
 *     (Debris collider = box(w*0.94, h*0.94), Block = box(w,h)), at settle AND mid-collapse.
 *     AABBs are useless here — a plank at 45 deg has a huge AABB and reports overlap that
 *     does not exist.
 *  2. Rest: which bodies are awake on an untouched l1, and per-body screen movement
 *     t=2000 -> t=3000 including the ammo.
 *  3. The debris CONE across three shots, sampled at three times, with the impact point as
 *     the origin (the rubric's "biggest lowest, smallest highest and furthest").
 *  4. The settled pile with the win overlay hidden — the wreckage is the thing being judged.
 *  5. Layer-differenced glass/stone/wood burst frames for a colour verdict done in pixels.
 */

const OBB = `
const w = SS.__world;
const rows = [];
for (const b of w.blocks) if (!b.dead) rows.push({ k:'block', id:b.id, m:b.matName,
  hx:b.w/2, hy:b.h/2, body:b.body });
for (const d of w.debris) if (!d.dead) rows.push({ k:'debris', id:d.id, m:d.matName,
  hx:d.w*0.94/2, hy:d.h*0.94/2, body:d.body });
for (const p of w.projectiles ?? []) if (!p.dead && p.body) rows.push({ k:'ammo', id:p.id,
  m:'ammo', hx:0.30, hy:0.30, body:p.body });
const E = rows.map(r => { const t=r.body.translation(), q=r.body.rotation();
  const a=Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z));
  return { k:r.k, id:r.id, m:r.m, x:t.x, y:t.y, hx:r.hx, hy:r.hy, a,
           sleep:r.body.isSleeping(), sp:Math.hypot(r.body.linvel().x, r.body.linvel().y) }; });
function pen(A,B){
  const ax=[[Math.cos(A.a),Math.sin(A.a)],[-Math.sin(A.a),Math.cos(A.a)],
            [Math.cos(B.a),Math.sin(B.a)],[-Math.sin(B.a),Math.cos(B.a)]];
  const dx=B.x-A.x, dy=B.y-A.y; let mn=Infinity;
  for(const [ux,uy] of ax){
    const rA=A.hx*Math.abs(Math.cos(A.a)*ux+Math.sin(A.a)*uy)+A.hy*Math.abs(-Math.sin(A.a)*ux+Math.cos(A.a)*uy);
    const rB=B.hx*Math.abs(Math.cos(B.a)*ux+Math.sin(B.a)*uy)+B.hy*Math.abs(-Math.sin(B.a)*ux+Math.cos(B.a)*uy);
    const o=rA+rB-Math.abs(dx*ux+dy*uy);
    if(o<=0) return 0; if(o<mn) mn=o;
  }
  return mn;
}
const hits=[];
for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){
  const p=pen(E[i],E[j]);
  if(p>0.02){ const thin=Math.min(E[i].hx,E[i].hy,E[j].hx,E[j].hy)*2;
    hits.push({a:E[i].k+'#'+E[i].id+':'+E[i].m, b:E[j].k+'#'+E[j].id+':'+E[j].m,
      pen:+p.toFixed(3), frac:+(p/thin).toFixed(2)}); } }
hits.sort((x,y)=>y.frac-x.frac);
return { n:E.length, hits, awake:E.filter(e=>!e.sleep).map(e=>e.k+'#'+e.id+':'+e.m+' v='+e.sp.toFixed(3)) };`;

const SCREEN_ALL = `const w = SS.__world, cam = w.camera;
const r = w.renderer.domElement.getBoundingClientRect();
const V3 = cam.position.constructor; const out=[];
const push=(k,id,m,b)=>{const t=b.translation();
  const v=new V3(t.x,t.y,0).project(cam);
  out.push({key:k+'#'+id, m, px:r.left+(v.x*0.5+0.5)*r.width, py:r.top+(-v.y*0.5+0.5)*r.height,
    sleep:b.isSleeping()});};
for(const b of w.blocks) if(!b.dead) push('block',b.id,b.matName,b.body);
for(const d of w.debris) if(!d.dead) push('debris',d.id,d.matName,d.body);
for(const v of w.villains) if(!v.dead) push('villain',v.id,'villain',v.body);
for(const p of w.projectiles??[]) if(!p.dead&&p.body) push('ammo',p.id,'ammo',p.body);
return out;`;

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__F=[]; window.__hit=null; window.__hitPt=null;
if (!B.__critB) { B.__critB = true;
  const oi=B.onImpact, of=B.fracture;
  B.onImpact=function(imp,other,pt,app){
    if(other&&other.tag==='ammo'&&app>=1.2&&window.__hit===null){window.__hit=SS.tick();
      window.__hitPt={x:pt&&pt.x,y:pt&&pt.y};}
    return oi.call(this,imp,other,pt,app);};
  B.fracture=function(i,p){const k=of.call(this,i,p);
    window.__F.push({mat:this.matName,x:p.x,y:p.y,n:k.length}); return k;}; }
return true;`;

const CONE = `const w=SS.__world; const o=args[0];
return w.debris.filter(d=>!d.dead).map(d=>{const t=d.body.translation();
  return {m:d.matName, area:d.w*d.h, big:Math.max(d.w,d.h), x:t.x, y:t.y,
    dx:t.x-o.x, dy:t.y-o.y, sp:Math.hypot(d.body.linvel().x,d.body.linvel().y)};});`;

const HIDE_FX = `let n=0; for(const o of SS.__world.scene.children)
  if(o.name==='fx-'+args[1]){o.visible=!args[0];n++;} return n;`;
const HIDE_DEBRIS = `let n=0; for(const d of SS.__world.debris) if(!d.dead){d.mesh.visible=!args[0];n++;} return n;`;
const HIDE_UI = `for (const id of ['overlay','end-overlay','hud-overlay']) {
  const e=document.getElementById(id); if(e) e.style.display='none'; }
for (const e of document.querySelectorAll('.overlay,.end-card,.level-end,#fx-layer'))
  e.style.display='none';
return true;`;

const med=(a)=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y);const h=s.length>>1;
  return s.length%2?s[h]:(s[h-1]+s[h])/2;};
const spearman=(u,v)=>{const n=u.length; if(n<4) return NaN;
  const rk=(z)=>{const ix=z.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]);const r=new Array(n);
    ix.forEach(([,i],k)=>r[i]=k);return r;};
  const a=rk(u),b=rk(v); let d2=0; for(let i=0;i<n;i++) d2+=(a[i]-b[i])**2;
  return 1-6*d2/(n*(n*n-1));};

async function arm(game,lvl,seed){
  await game('return SS.freeze();');
  await game('return await SS.loadLevel(args[0]);',lvl);
  await game('return SS.seed(args[0]);',seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__F=[];window.__hit=null;window.__hitPt=null;return true;');
}
async function toContact(game,a,p){
  const r=await game('return SS.aimAndFire(args[0],args[1]);',a,p);
  if(!r.ok) throw new Error('fire: '+r.reason);
  let t=0; while(t<6000){await game('await SS.seek(20);');t+=20;
    if(await game('return window.__hit!==null;')) return t;} return null;
}

export default async ({ shot, game, state, filmstrip }) => {
  const L=(...a)=>console.log(...a);

  // ---------------------------------------------------------------- 2. REST
  L('\n########## REST on an untouched l1 ##########');
  await game('return SS.freeze();');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(2000);');
  const a2=await game(SCREEN_ALL); const s2=await state();
  const rest2=await game(OBB);
  await game('await SS.seek(1000);');
  const a3=await game(SCREEN_ALL); const s3=await state();
  const m=new Map(a2.map(r=>[r.key,r]));
  let worst=0,who='';
  for(const r of a3){const p=m.get(r.key); if(!p)continue;
    const d=Math.hypot(r.px-p.px,r.py-p.py); if(d>worst){worst=d;who=r.key+':'+r.m;}}
  L(`  bodies tracked ${a3.length}; max screen move t2000->t3000 = ${worst.toFixed(4)} px (${who||'none moved'})  [<=0.5]`);
  L(`  asleep ${s2.bodiesAsleep}/${s2.bodies} -> ${s3.bodiesAsleep}/${s3.bodies}`);
  L(`  AWAKE at rest: ${JSON.stringify(rest2.awake)}`);
  L(`  OBB overlaps at rest (>2cm): ${rest2.hits.length}  ${JSON.stringify(rest2.hits.slice(0,6))}`);

  // ---------------------------------------------------------------- 1+3+4
  const SHOTS=[[0.22,0.96],[0.30,0.90],[0.28,0.88]];
  const rhoAll=[], bigLow=[], allPen=[], allPenMid=[];
  for (const [ang,pow] of SHOTS) {
    await arm(game,'l1',4242);
    const c=await toContact(game,ang,pow);
    const hp=await game('return window.__hitPt;');
    L(`\n########## SHOT ${ang}@${pow}: contact fire+${c}ms at (${hp.x.toFixed(1)},${hp.y.toFixed(1)}) ##########`);
    let at=0;
    for (const ms of [150,300,500]) {
      await game('await SS.seek(args[0]);',ms-at); at=ms;
      const d=await game(CONE,hp);
      const air=d.filter(r=>r.sp>0.4);
      if(air.length>=5){
        const rho=spearman(air.map(r=>r.area), air.map(r=>r.y));
        const rhoD=spearman(air.map(r=>r.area), air.map(r=>Math.abs(r.dx)));
        const mid=med(air.map(r=>r.area));
        const bY=med(air.filter(r=>r.area>=mid).map(r=>r.y));
        const sY=med(air.filter(r=>r.area< mid).map(r=>r.y));
        rhoAll.push(rho); bigLow.push(bY<sY?1:0);
        L(`  +${ms}ms  ${air.length} airborne  rho(area,height)=${rho.toFixed(2)}  ` +
          `rho(area,|dx|)=${rhoD.toFixed(2)}  medY big ${bY.toFixed(2)} vs small ${sY.toFixed(2)}  ` +
          `${bY<sY?'OK big-lower':'FAIL big NOT lower'}`);
      } else L(`  +${ms}ms  only ${air.length} airborne — no cone read`);
      if(ms===500){ const o=await game(OBB); allPenMid.push(o.hits.length);
        L(`  mid-collapse OBB overlaps >2cm: ${o.hits.length}` +
          (o.hits.length?`  worst ${o.hits[0].pen}m (${o.hits[0].frac}x thickness)  ${o.hits[0].a} / ${o.hits[0].b}`:'')); }
    }
    let g=0; while(g++<40){const s=await state();
      if(s.phase!=='flying'&&s.phase!=='settling')break; await game('await SS.seek(400);');}
    await game('await SS.seek(2500);');
    const o=await game(OBB);
    allPen.push(o.hits.length);
    L(`  SETTLED: ${o.n} bodies, OBB overlaps >2cm: ${o.hits.length}` +
      (o.hits.length?`  worst ${o.hits[0].pen}m (${o.hits[0].frac}x thickness)`:''));
    if(o.hits.length) L(`    ${JSON.stringify(o.hits.slice(0,8))}`);
    L(`    still awake: ${JSON.stringify(o.awake)}`);
  }
  L(`\n== CONE: rho values ${JSON.stringify(rhoAll.map(v=>+v.toFixed(2)))}  ` +
    `big-lower in ${bigLow.reduce((a,b)=>a+b,0)}/${bigLow.length} samples (rubric wants all)`);
  L(`== PENETRATION: settled ${JSON.stringify(allPen)}   mid-collapse ${JSON.stringify(allPenMid)}`);

  // ---------------------------------------------------------------- 4. the pile, unobscured
  await arm(game,'l1',4242);
  await toContact(game,0.22,0.96);
  let g=0; while(g++<40){const s=await state();
    if(s.phase!=='flying'&&s.phase!=='settling')break; await game('await SS.seek(400);');}
  await game('await SS.seek(2500);');
  await game(HIDE_UI);
  await game('return SS.__render();');
  await shot('settled-pile-NO-UI');
  const cl=await game(`const d=SS.__world.debris.filter(x=>!x.dead); if(!d.length)return null;
    let sx=0,sy=0; for(const x of d){const t=x.body.translation();sx+=t.x;sy+=t.y;}
    return {cx:sx/d.length, cy:sy/d.length};`);
  await game('return SS.camLock({x:args[0],y:args[1],halfWidth:4.2});',cl.cx,cl.cy+0.6);
  await game('return SS.__render();');
  await shot('settled-pile-CAMLOCK');
  await game('return SS.camUnlock();');

  // ---------------------------------------------------------------- 5. colour layers
  L('\n########## LAYER DIFFERENCE — glass vs stone vs wood chip colour ##########');
  for (const [lvl,mat] of [['_p3-glass','glass'],['_p3-stone','stone'],['_p3-wood','wood']]) {
    await arm(game,lvl,777);
    const r=await game('return SS.aimAndFire(args[0],args[1]);',0.16,0.88);
    if(!r.ok){L(`${mat}: fire failed`);continue;}
    let t=0; while(t<6000){await game('await SS.seek(20);');t+=20;
      if(await game('return window.__F.length;'))break;}
    await game('await SS.seek(200);');
    const c=await game(`const d=SS.__world.debris.filter(x=>!x.dead); if(!d.length)return null;
      let sx=0,sy=0; for(const x of d){const t=x.body.translation();sx+=t.x;sy+=t.y;}
      return {cx:sx/d.length,cy:sy/d.length};`);
    if(c){ await game('return SS.camLock({x:args[0],y:args[1],halfWidth:3.0});',c.cx,c.cy+0.2);
      await game('return SS.__render();'); }
    await shot(`${mat}200-ALL`);
    await game(HIDE_FX,true,mat); await game('return SS.__render();'); await shot(`${mat}200-NOFX`);
    await game(HIDE_FX,false,mat);
    await game(HIDE_DEBRIS,true); await game('return SS.__render();'); await shot(`${mat}200-NODEBRIS`);
    await game(HIDE_DEBRIS,false);
    await game('return SS.camUnlock();');
    L(`  ${mat}: 3 layer frames written`);
  }
};
