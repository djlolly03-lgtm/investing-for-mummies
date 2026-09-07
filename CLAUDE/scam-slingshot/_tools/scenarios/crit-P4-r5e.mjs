/** crit-P4-r5e — clean aim frame (fresh load, nothing before it) + lead across 3 different shots. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const MEAS = `
  const w=SS.__world,cam=w.camera,r=w.renderer.domElement.getBoundingClientRect();
  const V3=cam.position.constructor;
  const p2s=(x,y)=>{const v=new V3(x,y,0).project(cam);return{pw:(v.x*.5+.5)*100,ph:(-v.y*.5+.5)*100};};
`;
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  await game('SS.seed(1); await SS.seek(2000);');
  await shot('aim-clean');
  const out = { lead: {} };
  for (const [a,p] of [[0.28,1.0],[0.20,1.0],[0.45,0.75]]) {
    await game('SS.seed(1); await SS.seek(2000);');
    await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(250); SS.release();', a, p);
    const rows=[];
    for (let t=0;t<=800;t+=25){
      if(t) await game('await SS.seek(25);');
      rows.push({t, ...(await game(`${MEAS}
        const pr=(w.projectiles||[]).filter(q=>q&&q.mesh); const q=pr[pr.length-1];
        const bl=w.blocks; let cx=0,n=0;
        for(const b of bl){cx+=b.mesh.position.x;n++;} cx=n?cx/n:0;
        const s=q?p2s(q.mesh.position.x,q.mesh.position.y):null;
        return { pw:s?+s.pw.toFixed(1):null, ph:s?+s.ph.toFixed(1):null,
                 vx:q&&q.body?+q.body.linvel().x.toFixed(2):null,
                 sc:n?+p2s(cx,2.5).pw.toFixed(1):null,
                 camX:+cam.position.x.toFixed(2), camZ:+cam.position.z.toFixed(2),
                 deb:(w.debris||[]).length };`)) });
    }
    out.lead[`${a}@${p}`]=rows;
  }
  await writeFile(path.join(OUT,'lead.json'), JSON.stringify(out,null,2));
  for (const k of Object.keys(out.lead)) {
    const rows = out.lead[k];
    const flight = rows.filter(r=>r.deb===0 && r.pw!==null);
    const ok = flight.filter(r=>r.pw>=55 && r.pw<=75 && r.sc>=40 && r.sc<=60);
    console.log(k, 'flight tiles', flight.length,
      'projPW range', Math.min(...flight.map(r=>r.pw)).toFixed(1),'..',Math.max(...flight.map(r=>r.pw)).toFixed(1),
      '| structC range', Math.min(...flight.map(r=>r.sc)).toFixed(1),'..',Math.max(...flight.map(r=>r.sc)).toFixed(1),
      '| BOTH-IN-BAND tiles:', ok.length);
  }
};
