/** crit-P4-r5d — settle auto-frame WITH survivors; final-impact shake decay envelope; portrait. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const MEAS = `
  const w=SS.__world,cam=w.camera,r=w.renderer.domElement.getBoundingClientRect();
  const V3=cam.position.constructor;
  const p2s=(x,y)=>{const v=new V3(x,y,0).project(cam);return{pw:(v.x*.5+.5)*100,ph:(-v.y*.5+.5)*100};};
  const s2w=(px,py)=>{const v=new V3((px/r.width)*2-1,-((py/r.height)*2-1),.5).unproject(cam);
    const d=v.sub(cam.position).normalize();const t=-cam.position.z/d.z;
    return{x:cam.position.x+d.x*t,y:cam.position.y+d.y*t};};
`;
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const out = {};
  const vp = await page.viewport(); out.viewport = vp;

  // -------- A. settle auto-frame with survivors (0.36@1.0 leaves 2 alive on seed 1) ------
  for (const [a,p,tag] of [[0.36,1.0,'2alive'],[0.16,0.95,'1alive']]) {
    await game('SS.seed(1); await SS.seek(2000);');
    await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(200); SS.release(); await SS.seek(9000);', a, p);
    const st = await state();
    const m = await game(`${MEAS}
      const vil=(w.villains||[]).filter(v=>v.alive!==false).map(v=>{const mm=v.mesh||v.group;
        mm.geometry && mm.geometry.computeBoundingBox && mm.geometry.computeBoundingBox();
        const s=p2s(mm.position.x,mm.position.y);
        return {x:+mm.position.x.toFixed(2), y:+mm.position.y.toFixed(2), pw:+s.pw.toFixed(2), ph:+s.ph.toFixed(2)};});
      return { villains: vil, camX:cam.position.x, camY:cam.position.y, camZ:cam.position.z,
               vw: s2w(r.width,r.height/2).x - s2w(0,r.height/2).x };`);
    out['settle_'+tag] = { shot:[a,p], state: st, ...m };
    await shot('settle-'+tag);
    console.log('SETTLE', tag, JSON.stringify(m.villains), 'camZ', m.camZ.toFixed(2));
  }

  // -------- B. shake envelope measured from the LAST impact onward -----------------------
  await game('SS.seed(1); await SS.seek(2000);');
  await game('SS.aim({angle:0.28,power:1.0}); await SS.seek(200); SS.release();');
  const tr = [];
  for (let i = 0; i <= 720; i++) {           // 720 solver steps = 6000 ms
    if (i) await game('await SS.seek(8.3333333);');
    tr.push({ t: Math.round(i*8.3333333), ...(await game(`${MEAS}
      const st=await SS.state();
      return { y:cam.position.y, x:cam.position.x, z:cam.position.z,
               sh: w.rig&&w.rig.shake ? (w.rig.shake.length?w.rig.shake.length():w.rig.shake) : 0,
               deb: st.debris, ph: st.phase,
               vH: 2*cam.position.z*Math.tan(cam.fov*Math.PI/360) };`)) });
  }
  out.shake = tr;
  await writeFile(path.join(OUT, 'p4d.json'), JSON.stringify(out, null, 2));

  // -------- C. aim frame for the record at this viewport --------------------------------
  await game('SS.seed(1); await SS.seek(2000);');
  await shot('aim');
  const aim = await game(`${MEAS}
    const s=w.sling; let bb=null;
    s.group.traverse(o=>{if(o.isMesh&&o.geometry){o.geometry.computeBoundingBox();
      const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); bb=bb?bb.union(b):b;}});
    const bl=w.blocks.map(b=>{b.mesh.geometry.computeBoundingBox();
      return b.mesh.geometry.boundingBox.clone().applyMatrix4(b.mesh.matrixWorld);});
    const maxx=Math.max(...bl.map(b=>b.max.x)), minx=Math.min(...bl.map(b=>b.min.x)), maxy=Math.max(...bl.map(b=>b.max.y));
    const vil=(w.villains||[]).map(v=>{const mm=v.mesh||v.group;return p2s(mm.position.x,mm.position.y);});
    return { anchorPW:p2s(s.anchor.x,s.anchor.y).pw, anchorPH:p2s(s.anchor.x,s.anchor.y).ph,
             slingL:p2s(bb.min.x,0).pw, slingR:p2s(bb.max.x,0).pw,
             structL:p2s(minx,0).pw, structR:p2s(maxx,0).pw, tallestPH:p2s(0,maxy).ph,
             villainPW: vil.map(v=>+v.pw.toFixed(2)),
             fov:cam.fov, camZ:cam.position.z,
             vw:s2w(r.width,r.height/2).x-s2w(0,r.height/2).x };`);
  out.aim = aim;
  console.log('AIM', JSON.stringify(aim));
  await writeFile(path.join(OUT, 'p4d.json'), JSON.stringify(out, null, 2));
};
