/**
 * p3-r4-diag.mjs — WHY does a hit not propagate? Pure diagnosis, no verdict.
 * Tracks every block's pose + velocity every 100ms after first contact, and reports
 * which blocks broke, what the debris count is, and how many bodies are asleep.
 */
const AUTH = [
  ['woodBase',18.0,0.22],['postL',16.1,1.74],['postR',19.9,1.74],['glassL',17.1,1.74],
  ['glassR',18.9,1.74],['midBeam',18.0,3.26],['glassUL',16.95,4.33],['glassUR',19.05,4.33],
  ['topBeam',18.0,5.4],['stone',18.0,6.07],['hutL',21.9,0.42],['hutR',22.9,0.42],['hutTop',22.4,1.06]];

const DUMP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation(), v=b.body.linvel();
  return { m:b.matName, x:+t.x.toFixed(3), y:+t.y.toFixed(3),
    a:+Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z)).toFixed(3),
    vx:+v.x.toFixed(2), vy:+v.y.toFixed(2), slp:b.body.isSleeping(),
    dmg:+(b.damage||0).toFixed(2), w:+b.w.toFixed(2), h:+b.h.toFixed(2) }; });`;

const name = (b) => {
  let best='?', bd=1e9;
  for (const [n,x,y] of AUTH) { const d=Math.hypot(x-b.x,y-b.y); if (d<bd){bd=d;best=n;} }
  return { n:best, d:+bd.toFixed(2) };
};

export default async ({ game, state }) => {
  const P = (k,v)=>console.log('DIAG '+k+' '+JSON.stringify(v));

  for (const [a,p] of [[0.30,0.90],[0.20,1.00],[0.26,0.95],[0.14,0.95]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1200);');
    const before = await game(DUMP);
    P('shot-start',{a,p,blocks:before.length, asleep:(await state()).bodiesAsleep});
    const r = await game('return SS.aimAndFire(args[0],args[1]);',a,p);
    if(!r.ok){P('fire-fail',r);continue;}
    // walk to first contact
    let t=0, contact=null;
    while(t<4000){ await game('await SS.seek(20);'); t+=20;
      const s = await state();
      if (s.debris>0 || s.blocks<before.length){ contact=t; break; }
      // also detect ANY block moving
      const mv = await game(`const bs=SS.__world.blocks.filter(b=>!b.dead);
        return bs.some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.6;});`);
      if (mv){ contact=t; break; }
    }
    P('contact',{a,p,contactMs:contact});
    if (contact===null) continue;
    for (const dt of [0,200,200,200,200,200,800]) {
      if (dt) await game('await SS.seek(args[0]);',dt);
      const B = await game(DUMP);
      const s = await state();
      const rows = B.map(b=>{const nm=name(b);return `${nm.n}${nm.d>=0.3?'*':''} d=${nm.d} a=${b.a} v=${Math.hypot(b.vx,b.vy).toFixed(1)} dmg=${b.dmg}`;});
      P('t',{a,p,blocks:B.length,debris:s.debris,asleep:s.bodiesAsleep,villains:s.villainsAlive});
      console.log('     '+rows.join('\n     '));
    }
  }
};
