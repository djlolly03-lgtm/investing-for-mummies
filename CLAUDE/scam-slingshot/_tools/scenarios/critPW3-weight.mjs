/** PW r3 CRITIC — the WEIGHT BRIEF, measured independently. (v2: re-drop by hand, because
 *  loadLevel() settles the level before it returns, so the authored fall is already over.) */
const f=(n,k=3)=>(n===null||n===undefined||Number.isNaN(n)?'n/a':(+n).toFixed(k));

const LIFT = `
window.__lift = (sel, y, rot) => {
  const w = SS.__world;
  const bs = w.entities.filter(sel);
  for (const e of bs) {
    const t = e.body.translation();
    e.body.setTranslation({x:t.x, y:y, z:0}, true);
    e.body.setRotation({x:0,y:0,z:Math.sin(rot/2),w:Math.cos(rot/2)}, true);
    e.body.setLinvel({x:0,y:0,z:0}, true);
    e.body.setAngvel({x:0,y:0,z:0}, true);
    e.body.wakeUp();
  }
  return bs.length;
};`;

export default async ({ game, filmstrip }) => {
  // ---------------- A. DROP RIG ----------------
  await game(`SS.freeze(); await SS.loadLevel('_pw-drop'); SS.freeze();`);
  await game(LIFT);
  const drop = await game(`
    const w=SS.__world; const bl=w.entities.filter(e=>e.tag==='block');
    window.__lift(e=>e.tag==='block', 1.60, 0.60);
    const rec=bl.map(e=>({mat:e.matName, m:+e.body.mass().toFixed(3),
      fric:e.collider?+e.collider.friction().toFixed(3):null,
      rest:e.collider?+e.collider.restitution().toFixed(3):null,
      lin:+e.body.linearDamping().toFixed(3), ang:+e.body.angularDamping().toFixed(3),
      contact:null, vIn:null, vOut:-1e9, bounces:0, sleep:null, xC:null, xE:null, pv:0, up:false,
      peakSpin:0, broke:false }));
    for (let i=0;i<720;i++){
      SS.stepOnce();
      bl.forEach((e,k)=>{ const r=rec[k];
        if(e.dead||!e.body||!e.body.isValid()){ r.broke=true; return; }
        const v=e.body.linvel(), t=e.body.translation(), a=e.body.angvel();
        if(Math.abs(a.z)>r.peakSpin) r.peakSpin=Math.abs(a.z);
        if(r.contact===null && r.pv<-1.0 && v.y>r.pv+0.5){ r.contact=i; r.vIn=r.pv; r.xC=t.x; }
        if(r.contact!==null && i<=r.contact+10 && v.y>r.vOut) r.vOut=v.y;
        if(r.contact!==null && r.pv<-0.20 && v.y>0.20) r.bounces++;
        if(r.sleep===null && e.body.isSleeping()) r.sleep=i;
        r.pv=v.y; r.xE=t.x; });
    }
    return rec.map(r=>({mat:r.mat,m:r.m,fric:r.fric,rest:r.rest,lin:r.lin,ang:r.ang,
      landMs:r.contact!==null?Math.round(r.contact*1000/120):null,
      vIn:r.vIn&&+r.vIn.toFixed(3), vOut:r.vOut>-1e8?+r.vOut.toFixed(3):null,
      cor:(r.vIn&&r.vOut>-1e8)?+(r.vOut/-r.vIn).toFixed(4):null,
      bounces:r.bounces, slide:(r.xE!==null&&r.xC!==null)?+Math.abs(r.xE-r.xC).toFixed(4):null,
      settleMs:r.sleep!==null?Math.round((r.sleep-(r.contact||0))*1000/120):null,
      peakSpin:+r.peakSpin.toFixed(2), broke:r.broke}));
  `);
  console.log('=== A. DROP RIG — identical 0.90 m cube, identical 1.02 m fall, identical 0.60 rad tilt ===');
  console.log('mat     mass   land   v_in    v_out   COR      bounces  slide(m)  settle  peakSpin  fric  rest  damp(lin/ang)  broke');
  for (const r of drop) console.log(
    `${String(r.mat).padEnd(6)} ${f(r.m,3).padStart(6)} ${String(r.landMs).padStart(4)}ms ${f(r.vIn,2).padStart(6)} ${f(r.vOut,3).padStart(7)} ${f(r.cor,4).padStart(7)}    ${String(r.bounces).padStart(2)}   ${f(r.slide,4).padStart(7)} ${String(r.settleMs).padStart(5)}ms ${f(r.peakSpin,2).padStart(7)}  ${f(r.fric,2)} ${f(r.rest,2)}  ${f(r.lin,2)}/${f(r.ang,2)}  ${r.broke}`);
  const A = drop.map(r=>r.cor).filter(x=>x!=null);
  if (A.length===3) console.log(`COR spread: ${f(Math.max(...A)/Math.max(1e-6,Math.min(...A)),2)}x   slide spread: ${f(Math.max(...drop.map(r=>r.slide))/Math.max(1e-6,Math.min(...drop.map(r=>r.slide))),2)}x`);

  await game(`SS.freeze(); await SS.loadLevel('_pw-drop'); SS.freeze();`);
  await game(LIFT + `; window.__lift(e=>e.tag==='block', 1.60, 0.60); SS.camLock({x:11,y:2.0,halfWidth:5.4}); SS.__render&&SS.__render();`);
  await filmstrip('A-drop-wood-glass-stone', { from: 0, to: 1000, step: 62, cols: 4 });

  // ---------------- B. MOMENTUM THROUGH A STACK ----------------
  await game(`SS.freeze(); await SS.loadLevel('_pw-mass'); SS.freeze();`);
  const mass = await game(`
    const w=SS.__world; const bl=w.entities.filter(e=>e.tag==='block');
    const hammers=bl.filter(e=>e.h<1.0), cols=bl.filter(e=>e.h>=1.0);
    for(const h of hammers){ const t=h.body.translation();
      h.body.setTranslation({x:t.x,y:3.60,z:0},true); h.body.setLinvel({x:0,y:0,z:0},true);
      h.body.setAngvel({x:0,y:0,z:0},true); h.body.setRotation({x:0,y:0,z:0,w:1},true); h.body.wakeUp(); }
    for(const c of cols) c.body.wakeUp();
    const pair = hammers.map(h=>{ let best=null,bd=1e9;
      for(const c of cols){ const d=Math.abs(c.body.translation().x-h.body.translation().x);
        if(d<bd){bd=d;best=c;} } return {h,c:best}; });
    const out=pair.map(p=>({mat:p.h.matName, mH:+p.h.body.mass().toFixed(3), mT:+p.c.body.mass().toFixed(3),
      vIn:null, vOut:-1e9, tPeak:0, tSpin:0, x0:p.c.body.translation().x, x:null, hDead:false, tDead:false, pv:0}));
    for(let i=0;i<480;i++){
      SS.stepOnce();
      pair.forEach((p,k)=>{ const o=out[k];
        if(p.h.dead||!p.h.body||!p.h.body.isValid()) o.hDead=true;
        else { const v=p.h.body.linvel();
          if(o.vIn===null && o.pv<-1.0 && v.y>o.pv+0.5){o.vIn=o.pv;}
          if(o.vIn!==null && v.y>o.vOut) o.vOut=v.y;
          o.pv=v.y; }
        if(p.c.dead||!p.c.body||!p.c.body.isValid()) o.tDead=true;
        else { const tv=p.c.body.linvel(), ta=p.c.body.angvel();
          const s=Math.hypot(tv.x,tv.y); if(s>o.tPeak)o.tPeak=s;
          if(Math.abs(ta.z)>o.tSpin)o.tSpin=Math.abs(ta.z); o.x=p.c.body.translation().x; } });
    }
    return out.map(o=>({mat:o.mat,mH:o.mH,mT:o.mT,vIn:o.vIn&&+o.vIn.toFixed(2),
      keep:(o.vIn&&o.vOut>-1e8)?+(o.vOut/-o.vIn).toFixed(3):null,
      tPeak:+o.tPeak.toFixed(3), tSpin:+o.tSpin.toFixed(3),
      tMoved:+Math.abs((o.x??o.x0)-o.x0).toFixed(3), hDead:o.hDead, tDead:o.tDead}));
  `);
  console.log('\nB rows: '+mass.length);
  console.log('\n=== B. MOMENTUM TRANSFER — identical wood column, identical 0.55 m drop, hammer material varies ===');
  console.log('hammer  mass   v_in   hammer keeps  target peak speed  target peak spin  target moved  hammer died  target died');
  for (const m of mass) console.log(`${String(m.mat).padEnd(6)} ${f(m.mH,3).padStart(6)} ${f(m.vIn,2).padStart(6)}   ${f(m.keep,3).padStart(8)}       ${f(m.tPeak,3).padStart(8)}          ${f(m.tSpin,3).padStart(8)}      ${f(m.tMoved,3).padStart(7)}      ${m.hDead}       ${m.tDead}`);

  // ---------------- C. FLOATY DEBRIS ----------------
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  await game(`SS.aim({angle:0.30,power:0.90}); return SS.release();`);
  const deb = await game(`
    const w=SS.__world, G=9.81*2.4;
    for(let i=0;i<70;i++) SS.stepOnce();
    const track={};
    for(let i=0;i<240;i++){
      SS.stepOnce();
      for(const d of w.debris){
        if(d.dead||!d.body||!d.body.isValid())continue;
        const v=d.body.linvel(), t=d.body.translation(), k=d.id;
        if(!track[k]) track[k]={prev:v.y, n:0, sum:0, gs:d.body.gravityScale(), m:+d.body.mass().toFixed(4),
                                lin:+d.body.linearDamping().toFixed(2), mat:d.matName||'?'};
        const tr=track[k];
        const dv=(v.y-tr.prev)*120;
        if (t.y>0.9 && Math.abs(dv+G*tr.gs) < 10) { tr.sum+=dv; tr.n++; }
        tr.prev=v.y;
      }
    }
    const out=[];
    for(const [k,tr] of Object.entries(track)) if(tr.n>15)
      out.push({ id:+k, mat:tr.mat, m:tr.m, gs:tr.gs, lin:tr.lin, n:tr.n,
                 a:+(tr.sum/tr.n).toFixed(2), ratio:+((tr.sum/tr.n)/(-G*tr.gs)).toFixed(3) });
    return { g:-G, tracked:Object.keys(track).length, n:out.length, rows:out };
  `);
  console.log('\n=== C. FLOATY DEBRIS — vertical acceleration of airborne fragments vs g ===');
  console.log(`g = ${f(deb.g,2)} m/s^2 ; ${deb.tracked} fragments seen, ${deb.n} with >15 clean airborne steps`);
  if (deb.n) {
    const rs = deb.rows.map(r=>r.ratio);
    console.log(`a_y / (g * gravityScale):  min ${f(Math.min(...rs),3)}  median ${f(rs.sort((a,b)=>a-b)[Math.floor(rs.length/2)],3)}  max ${f(Math.max(...rs),3)}`);
    console.log('rows: ' + JSON.stringify(deb.rows.slice(0,16)));
  }

  // ---------------- D. VILLAIN MASS ----------------
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  const vm = await game(`
    const w=SS.__world; const out={villains:[],blocks:[]};
    for(const e of w.entities){ if(!e.body||!e.body.isValid())continue;
      const c=e.collider;
      const row={tag:e.tag, mat:e.matName||null, m:+e.body.mass().toFixed(3),
        w:e.w?+e.w.toFixed(2):null, h:e.h?+e.h.toFixed(2):null,
        lin:+e.body.linearDamping().toFixed(2), ang:+e.body.angularDamping().toFixed(2),
        fric:c?+c.friction().toFixed(2):null, rest:c?+c.restitution().toFixed(2):null };
      if(e.tag==='villain') out.villains.push(row); else if(e.tag==='block') out.blocks.push(row); }
    return out;
  `);
  console.log('\n=== D. VILLAIN MASS vs BLOCK MASS ===');
  console.log('villains: ' + JSON.stringify(vm.villains));
  const byMat={}; for(const b of vm.blocks){ byMat[b.mat]=byMat[b.mat]||[]; byMat[b.mat].push(b.m); }
  for(const [k,v] of Object.entries(byMat)) console.log(`blocks ${k}: n=${v.length} mass ${Math.min(...v).toFixed(2)}..${Math.max(...v).toFixed(2)} kg`);
  console.log('all blocks: ' + JSON.stringify(vm.blocks.map(b=>`${b.mat} ${b.w}x${b.h} ${b.m}kg`)));
};
