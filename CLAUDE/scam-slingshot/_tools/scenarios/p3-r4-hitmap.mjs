/** p3-r4-hitmap.mjs — where does the projectile actually FIRST touch the tower, per shot? */
export default async ({ game, state }) => {
  const P=(k,v)=>console.log('HIT '+k+' '+JSON.stringify(v));
  const shots=[];
  for(let a=0.02;a<=0.46;a+=0.04) for(const p of [0.80,0.90,1.00]) shots.push([+a.toFixed(2),p]);
  for (const [a,p] of shots) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    const r=await game('return SS.aimAndFire(args[0],args[1]);',a,p);
    if(!r.ok){P('fail',{a,p,r});continue;}
    // track projectile until it slows/contacts something
    const trace = await game(`
      let t=0, first=null, path=[];
      const pj=()=>SS.__world.projectiles.filter(o=>!o.dead)[0];
      let prev=null;
      while(t<5000){
        await SS.seek(1000/120); t+=1000/120;
        const o=pj(); if(!o) break;
        const tr=o.body.translation(), v=o.body.linvel();
        const sp=Math.hypot(v.x,v.y);
        if(prev && prev.sp>6 && sp < prev.sp*0.8){ first={t:+t.toFixed(0),x:+tr.x.toFixed(2),y:+tr.y.toFixed(2),sp:+sp.toFixed(1),was:+prev.sp.toFixed(1)}; break; }
        prev={sp};
        if(tr.y<0.2 && tr.x>3) { first={t:+t.toFixed(0),x:+tr.x.toFixed(2),y:+tr.y.toFixed(2),sp:+sp.toFixed(1),ground:true}; break; }
      }
      return first;`);
    await game('await SS.seek(7000);');
    const s=await state();
    P('shot',{a,p,contact:trace,score:s.score,kills:2-s.villainsAlive,blocks:s.blocks});
  }
};
