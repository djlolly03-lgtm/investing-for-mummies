/** crit-P4-r5c — find a real collapse on seed 1, then measure shake decay, settle auto-frame,
 *  and post-settle quiet properly. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const MEAS = `
  const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
  const V3 = cam.position.constructor;
  const p2s=(x,y)=>{const v=new V3(x,y,0).project(cam);return{pw:(v.x*.5+.5)*100,ph:(-v.y*.5+.5)*100};};
  const s2w=(px,py)=>{const v=new V3((px/r.width)*2-1,-((py/r.height)*2-1),.5).unproject(cam);
    const d=v.sub(cam.position).normalize();const t=-cam.position.z/d.z;
    return {x:cam.position.x+d.x*t,y:cam.position.y+d.y*t};};
`;
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const out = { sweep: [] };
  for (const [a,p] of [[0.20,1.0],[0.24,1.0],[0.28,1.0],[0.30,0.9],[0.32,0.95],[0.36,1.0],[0.40,0.9],[0.16,0.95]]) {
    await game('SS.seed(1); await SS.seek(2000);');
    await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(200); SS.release();', a, p);
    await game('await SS.seek(5000);');
    const s = await state();
    out.sweep.push({ a, p, score: s.score, villains: s.villainsAlive, debris: s.debris, blocks: s.blocks });
  }
  console.log('SWEEP', JSON.stringify(out.sweep));
  const best = out.sweep.slice().sort((x,y)=> y.score - x.score)[0];
  out.best = best;
  console.log('BEST', JSON.stringify(best));

  // --- shake decay on the best impact, sampled every 8.33ms (one solver step) ---
  await game('SS.seed(1); await SS.seek(2000);');
  await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(200); SS.release();', best.a, best.p);
  const tr = [];
  for (let t = 0; t <= 3000; t += 8.3333333) {
    if (t) await game('await SS.seek(8.3333333);');
    tr.push({ t: Math.round(t), ...(await game(`${MEAS}
      const st = await SS.state();
      return { x:cam.position.x, y:cam.position.y, z:cam.position.z, q:cam.quaternion.toArray(),
               shake: w.rig && w.rig.shake ? (w.rig.shake.length ? w.rig.shake.length() : w.rig.shake) : 0,
               debris: st.debris, asleep: st.bodiesAsleep, bodies: st.bodies, phase: st.phase,
               vH: 2*cam.position.z*Math.tan(cam.fov*Math.PI/360) };`)) });
  }
  out.trace = tr;

  // --- settle framing after the level fully resolves ---
  await game('SS.seed(1); await SS.seek(2000);');
  await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(200); SS.release();', best.a, best.p);
  await game('await SS.seek(9000);');
  out.settleState = await state();
  out.settle = await game(`${MEAS}
    const vil=(w.villains||[]).filter(v=>v.alive!==false).map(v=>{const m=v.mesh||v.group;
      const s=p2s(m.position.x,m.position.y);return {x:m.position.x,y:m.position.y,pw:s.pw,ph:s.ph,alive:v.alive};});
    const all=(w.villains||[]).map(v=>({alive:v.alive, tag:v.tag||v.type}));
    return { alive: vil, allVillains: all, camZ:cam.position.z, camX:cam.position.x, camY:cam.position.y,
             vw: s2w(r.width,r.height/2).x - s2w(0,r.height/2).x };`);
  await shot('settled-real');

  // --- quiet: 1500 ms of pure post-settle, nothing else happening ---
  const q = [];
  for (let t = 0; t <= 1500; t += 25) {
    if (t) await game('await SS.seek(25);');
    q.push({ t, ...(await game('const c=SS.__world.camera; const st=await SS.state(); return {x:c.position.x,y:c.position.y,z:c.position.z,asleep:st.bodiesAsleep,bodies:st.bodies,phase:st.phase};')) });
  }
  out.quiet = q;
  await filmstrip('quiet-tail', { from: 0, to: 1100, step: 100, cols: 4 });

  // --- impact filmstrip at the game's own framing ---
  await game('SS.seed(1); await SS.seek(2000);');
  await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(200); SS.release(); await SS.seek(300);', best.a, best.p);
  await filmstrip('impact', { from: 0, to: 700, step: 50, cols: 4 });

  await writeFile(path.join(OUT, 'p4c.json'), JSON.stringify(out, null, 2));
};
