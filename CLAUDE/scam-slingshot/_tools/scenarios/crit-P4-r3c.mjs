/** crit-P4-r3c.mjs — shake magnitude in %H, settle quiet, and (with --mobile) the portrait aim frame. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const PRE = `
  const W=SS.__world, cam=W.camera, V3=cam.position.constructor;
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const proj=(x,y)=>{const v=new V3(x,y,0); v.project(cam);
    return {w:+((v.x*0.5+0.5)*100).toFixed(4), h:+((1-(v.y*0.5+0.5))*100).toFixed(4)};};
  const damageSum=()=>{let d=0; for(const b of W.blocks) d+=(b.damage||0); return d;};
`;
export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = {}; const g = (b, ...a) => game(PRE + b, ...a);
  const hide=()=>page.evaluate(()=>document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u=>u.style.visibility='hidden'));
  const show=()=>page.evaluate(()=>document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u=>u.style.visibility=''));
  const SETUP='await SS.seed(7); await SS.seek(2600);';
  const FIRE = SETUP + ' SS.aim({angle:0.30, power:0.90}); await SS.seek(600); SS.release();';

  // ---- aim frame at this viewport ----
  await g(SETUP);
  M.state = await state();
  await hide(); await shot('aim'); await show();
  M.aim = await g(`
    let l=1e9,r=-1e9,t=-1e9;
    for(const b of W.blocks) if(!b.dead){const p=b.body.translation(); l=Math.min(l,p.x-b.w/2); r=Math.max(r,p.x+b.w/2); t=Math.max(t,p.y+b.h/2);}
    for(const v of W.villains) if(v.alive){const p=v.body.translation(); l=Math.min(l,p.x-0.6); r=Math.max(r,p.x+0.6); t=Math.max(t,p.y+0.9);}
    const s=W.sling.anchor;
    return { cam:{x:+cam.position.x.toFixed(3),y:+cam.position.y.toFixed(3),z:+cam.position.z.toFixed(3),fov:cam.fov,aspect:+cam.aspect.toFixed(4),vw:+vw().toFixed(3),vh:+vh().toFixed(3)},
             slingPctW: proj(s.x,s.y).w, farRightPctW: proj(r,0.8).w, farLeftPctW: proj(l,0.8).w,
             tallestTopPctH: proj((l+r)/2,t).h, extentPctW: +(proj(r,0.8).w-proj(l,0.8).w).toFixed(2) };`);

  // ---- shake, isolated: cam.position vs the rig's smoothed want, every 10 ms ----
  await g(FIRE + ' await SS.seek(460);');
  const sh=[];
  for(let t=460;t<=1160;t+=10){
    sh.push({ t, ...(await g(`
      const r=W.rig;
      const want = r.pos ? {x:r.pos.x,y:r.pos.y} : null;
      return { camx:+cam.position.x.toFixed(6), camy:+cam.position.y.toFixed(6), camz:+cam.position.z.toFixed(6),
               posx: want?+want.x.toFixed(6):null, posy: want?+want.y.toFixed(6):null,
               shake:+(typeof r.shake==='number'?r.shake:0).toFixed(6), vh:+vh().toFixed(5),
               roll:+cam.quaternion.z.toFixed(9), qx:+cam.quaternion.x.toFixed(9), qy:+cam.quaternion.y.toFixed(9),
               dmg:+damageSum().toFixed(2), hitStop:W.hitStop };`)) });
    if(t<1160) await g('await SS.seek(10);');
  }
  M.shake = sh;
  // %H offset of the shake = |cam - want| / vh * 100
  const pct = sh.map(s => ({ t: s.t,
    dx: s.posx===null?null:+(s.camx-s.posx).toFixed(5),
    dy: s.posy===null?null:+(s.camy-s.posy).toFixed(5),
    pctH: s.posy===null?null:+((Math.hypot(s.camx-s.posx, s.camy-s.posy)/s.vh)*100).toFixed(4) }));
  M.shakePctH = pct;
  const peak = pct.reduce((a,b)=> (b.pctH!==null && (a===null||b.pctH>a.pctH))?b:a, null);
  M.shakePeak = peak;
  M.shakeDecay350 = pct.filter(p=>peak && p.t>=peak.t+350).slice(0,4);

  await writeFile(path.join(OUT,'MEASURE3.json'), JSON.stringify(M,null,2));
  console.log(JSON.stringify({ viewport: { w: page.viewport().width, h: page.viewport().height },
    aim: M.aim, shakePeak: peak, decayAfter350: M.shakeDecay350,
    maxRoll: Math.max(...sh.map(s=>Math.abs(s.roll))), maxQx: Math.max(...sh.map(s=>Math.abs(s.qx))),
    firstShake: pct.slice(0,6) }, null, 2));
};
