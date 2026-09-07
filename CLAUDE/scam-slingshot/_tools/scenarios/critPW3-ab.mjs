/**
 * PW r3 CRITIC — the transmitted-vs-authored A/B, both arms back to back in ONE process on ONE
 * tree (ORCHESTRATOR-NOTES r6 §5). Same seed, same drag, same shot; only structure.enabled moves.
 * If propagation collapses without the authoring layer, the propagation is authored.
 */
const G = 9.81 * 2.4;
const SETUP = `
window.__AB = (() => {
  const SS=window.SS, ph=SS.__physics, w=SS.__world; const G=${G};
  const E=b=>{const m=b.mass(),v=b.linvel(),a=b.angvel(),t=b.translation(),pi=b.principalInertia();
    return 0.5*m*(v.x*v.x+v.y*v.y+v.z*v.z)+0.5*pi.z*a.z*a.z+m*G*b.gravityScale()*t.y;};
  let series=null,cohort=null,dart=null,unsub=null;
  function sample(tick){
    const per={},pose={};let vmax=0;
    for(const e of cohort){ if(e.dead||!e.body)continue;
      try{ if(!e.body.isValid())continue; per[e.__ch]=E(e.body);
        const v=e.body.linvel(); const sp=Math.hypot(v.x,v.y); if(sp>vmax)vmax=sp;
        const t=e.body.translation(),r=e.body.rotation();
        pose[e.__ch]=[t.x,t.y,2*Math.atan2(r.z,r.w)];}catch(_){}}
    let dKE=null; if(dart){try{if(dart.isValid()){const v=dart.linvel();dKE=0.5*dart.mass()*(v.x*v.x+v.y*v.y);}}catch(_){}}
    series.push({tick,per,pose,vmax,dKE});
  }
  return {
    begin(){ let i=0;
      cohort=w.entities.filter(e=>e.body&&!e.dead&&e.body.isDynamic()&&e.tag!=='ammo');
      cohort.forEach(e=>{e.__ch=e.tag+(i++);});
      dart=(w.projectiles&&w.projectiles[0]&&w.projectiles[0].body)||null;
      series=[];unsub=ph.onStep(sample);sample(ph.tick);return {n:cohort.length};},
    end(){ if(unsub)unsub();unsub=null;const s=series;series=null;return s;},
  };
})();`;

const FRAME=['block1','block2','block3','block4','block5','block8'];
const f=(n,k=2)=>(n===null||Number.isNaN(n)||n===undefined?'n/a':(+n).toFixed(k));

export default async ({ game, dragShot }) => {
  const SHOTS=[[0.30,0.90],[0.32,0.94],[0.34,0.92],[0.28,0.92]];
  const rows=[];
  for (const on of [true,false]) {
    for (const [angle,power] of SHOTS) {
      await game(`SS.freeze(); await SS.seed(7); SS.freeze();`);
      await game(SETUP);
      await game(`
        const st = SS.__world.level && SS.__world.level.structure;
        // reach the singleton the game actually uses
        const mod = await import('/scam-slingshot/src/level/structure.js');
        mod.structure.enabled = args[0];
        return { enabled: mod.structure.enabled };
      `, on);
      const drag = await dragShot(angle,power,{steps:6});
      await game(`return SS.release();`);
      const raw = await game(`
        const A=window.__AB; A.begin();
        for(let i=0;i<480;i++) SS.stepOnce();
        const mod = await import('/scam-slingshot/src/level/structure.js');
        return { series:A.end(), st:await SS.state(), enabled: mod.structure.enabled,
                 stats: JSON.parse(JSON.stringify(mod.structure.stats||{})) };
      `);
      const S=raw.series;
      const keys=Object.keys(S[0].per).filter(k=>S.every(s=>k in s.per));
      const E=S.map(s=>keys.reduce((a,k)=>a+s.per[k],0));
      let c=-1; for(let i=1;i<S.length;i++){ if(S[i].vmax>0.30){c=i;break;} }
      const i800=Math.min(S.length-1,c+96);
      const p0=S[c].pose,p8=S[i800].pose;
      let moved=0,frame=0,frameL=[];
      for(const k of Object.keys(p0)){ if(!p8[k])continue;
        const d=Math.hypot(p8[k][0]-p0[k][0],p8[k][1]-p0[k][1]),da=Math.abs(p8[k][2]-p0[k][2]);
        const m=d>0.05||da>0.03; if(m)moved++;
        if(FRAME.includes(k)&&m){frame++;frameL.push(k);} }
      const died=Object.keys(p0).length-Object.keys(p8).length;
      const endI=Math.min(E.length-1,c+240);
      const D=[];for(let i=c+1;i<=endI;i++)D.push(E[i]-E[i-1]);
      rows.push({ arm:on?'ON ':'OFF', shot:`${angle}@${power}`, contact:c,
        dartKE:S[c].dKE, net2s:E[endI]-E[c], pos2s:D.filter(x=>x>0).reduce((a,b)=>a+b,0),
        worst:Math.max(...D), moved, survivors:Object.keys(p0).length, died, frame, frameL,
        phase:raw.st.phase, score:raw.st.score, va:raw.st.villainsAlive,
        blocks:raw.st.blocks, debris:raw.st.debris,
        creditJ:raw.stats.creditJ, spentJ:raw.stats.spentJ, poolPeak:raw.stats.poolPeak, enabled:raw.enabled });
    }
  }
  console.log('\narm shot        contact dartKE   net2s   pos2s   worst  MOVED/surv died FRAME  phase    score  vAlive blk deb   creditJ spentJ');
  for(const r of rows) console.log(
    `${r.arm} ${r.shot.padEnd(11)} ${String(r.contact).padStart(4)} ${f(r.dartKE).padStart(7)} ${f(r.net2s).padStart(8)} ${f(r.pos2s).padStart(7)} ${f(r.worst,2).padStart(7)}   ${String(r.moved).padStart(2)}/${String(r.survivors).padStart(2)}   ${String(r.died).padStart(2)}  ${r.frame}/6  ${String(r.phase).padEnd(9)} ${String(r.score).padStart(6)}  ${r.va}    ${String(r.blocks).padStart(2)} ${String(r.debris).padStart(3)}  ${f(r.creditJ,1).padStart(7)} ${f(r.spentJ,1).padStart(6)}`);
  console.log('\nPAIRED:');
  const n=rows.length/2;
  for(let i=0;i<n;i++){ const a=rows[i],b=rows[i+n];
    console.log(`${a.shot.padEnd(11)} MOVED ${a.moved} -> ${b.moved}   FRAME ${a.frame}/6 -> ${b.frame}/6   died ${a.died} -> ${b.died}   score ${a.score} -> ${b.score}   worst-step ${f(a.worst,2)} -> ${f(b.worst,2)} J   pos2s ${f(a.pos2s)} -> ${f(b.pos2s)} J`);
  }
  console.log('\nJSON '+JSON.stringify(rows.map(r=>({arm:r.arm.trim(),shot:r.shot,moved:r.moved,frame:r.frame,died:r.died,worst:+f(r.worst,2),pos2s:+f(r.pos2s),score:r.score,phase:r.phase,creditJ:+f(r.creditJ,1),spentJ:+f(r.spentJ,1)}))));
};
