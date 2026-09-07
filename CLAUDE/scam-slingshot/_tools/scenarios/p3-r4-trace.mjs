/** p3-r4-trace.mjs — fine-grained timeline of ONE shot: break order + survivor poses. */
const AUTH=[['base',18.0,0.22],['postL',16.1,1.74],['postR',19.9,1.74],['glL',17.1,1.74],
 ['glR',18.9,1.74],['mid',18.0,3.26],['gUL',16.95,4.33],['gUR',19.05,4.33],
 ['top',18.0,5.4],['stone',18.0,6.07],['hutL',21.9,0.42],['hutR',22.9,0.42],['hutT',22.4,1.06]];
const key=(b)=>{let n='?',d=1e9;for(const[k,x,y]of AUTH){const q=Math.hypot(x-b.x0,y-b.y0);if(q<d){d=q;n=k;}}return n;};

export default async ({ game, state }) => {
  const P=(k,v)=>console.log('TR '+k+' '+JSON.stringify(v));
  const SHOTS = JSON.parse(process.env.P3SHOTS || '[[0.06,0.90],[0.30,0.90]]');
  for (const [a,p] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1000);');
    // tag every block with its authored pose so we can follow identity across the run
    await game(`SS.__world.blocks.forEach((b,i)=>{const t=b.body.translation();b.__id=i;b.__x0=t.x;b.__y0=t.y;});`);
    const r=await game('return SS.aimAndFire(args[0],args[1]);',a,p);
    if(!r.ok){P('fail',{a,p,r});continue;}
    const tl = await game(`
      const W=SS.__world; let t=0; const rows=[]; let live=new Set(W.blocks.map(b=>b.__id));
      const proj=()=>W.projectiles.filter(o=>!o.dead)[0];
      let firstContact=null;
      while(t<5000){
        await SS.seek(1000/120); t+=1000/120;
        const now=new Set(W.blocks.filter(b=>!b.dead).map(b=>b.__id));
        const gone=[...live].filter(i=>!now.has(i));
        if(gone.length) rows.push({t:+t.toFixed(0),broke:gone});
        live=now;
        if(firstContact===null){
          const o=proj();
          if(o){ const tr=o.body.translation();
            if (tr.x>14.5) { firstContact=+t.toFixed(0); rows.push({t:firstContact,contactAt:[+tr.x.toFixed(2),+tr.y.toFixed(2)]}); } }
        }
      }
      const surv=W.blocks.filter(b=>!b.dead).map(b=>{const tr=b.body.translation(),q=b.body.rotation();
        return {id:b.__id,x0:+b.__x0.toFixed(2),y0:+b.__y0.toFixed(2),
          dx:+(tr.x-b.__x0).toFixed(2),dy:+(tr.y-b.__y0).toFixed(2),
          a:+Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z)).toFixed(3)};});
      return {firstContact,rows,surv,st:await SS.state()};`);
    P('shot',{a,p,firstContact:tl.firstContact,score:tl.st.score,kills:2-tl.st.villainsAlive,
      debris:tl.st.debris,blocksLeft:tl.surv.length});
    for(const r2 of tl.rows) console.log('   ',JSON.stringify(r2));
    for(const s of tl.surv) console.log('    SURV',key({x0:s.x0,y0:s.y0}),JSON.stringify(s));
  }
};
