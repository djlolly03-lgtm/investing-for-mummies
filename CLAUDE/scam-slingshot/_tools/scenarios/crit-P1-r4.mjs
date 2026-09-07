/**
 * crit-P1-r4.mjs — INDEPENDENT CRITIC capture, P1 (Launch feel), round 4.
 * Written by the critic. Every number is either a projection of what the renderer is
 * actually drawing, or is recoverable from a PNG by masking a layer and shooting twice.
 * No hard-coded drag pixels.
 */
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);

const PRE = `
const w = SS.__world, cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM = (m,p) => { const e=m.elements;
  const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
  return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
          (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
          (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw]; };
const proj = (x,y,z) => { let p=applyM(cam.matrixWorldInverse,[x,y,z||0]);
  p=applyM(cam.projectionMatrix,p); return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH]; };
const bboxScreen = (obj) => { let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,meshes=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o=>{ if(!o.isMesh||o.visible===false) return; const g=o.geometry; if(!g) return;
    if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox; if(!b) return; meshes++;
    for(const cx of [b.min.x,b.max.x]) for(const cy of [b.min.y,b.max.y]) for(const cz of [b.min.z,b.max.z]){
      const wp=applyM(o.matrixWorld,[cx,cy,cz]); const s=proj(wp[0],wp[1],wp[2]);
      if(s[0]<x0)x0=s[0]; if(s[0]>x1)x1=s[0]; if(s[1]<y0)y0=s[1]; if(s[1]>y1)y1=s[1]; }});
  return meshes?{x0:+x0.toFixed(2),y0:+y0.toFixed(2),x1:+x1.toFixed(2),y1:+y1.toFixed(2),
    w:+(x1-x0).toFixed(2),h:+(y1-y0).toFixed(2),cx:+((x0+x1)/2).toFixed(2),cy:+((y0+y1)/2).toFixed(2),meshes}:null; };
/* strap cross-section in SCREEN px, ring by ring */
const stripProfile = (b) => { const t=b.tube; if(!t||!t._pts||!t._rad) return null;
  const P=t._pts, RAD=t._rad, S=t.rings, M=t.group; M.updateWorldMatrix(true,true);
  const mw=M.matrixWorld, wp=(i)=>applyM(mw,[P[i*3],P[i*3+1],P[i*3+2]]);
  const wpts=[]; for(let i=0;i<=S;i++) wpts.push(wp(i));
  const scr=wpts.map(p=>proj(p[0],p[1],p[2]));
  let len=0; for(let i=1;i<=S;i++) len+=Math.hypot(scr[i][0]-scr[i-1][0],scr[i][1]-scr[i-1][1]);
  const o=applyM(mw,[0,0,0]), ux=applyM(mw,[1,0,0]);
  const sc=Math.hypot(ux[0]-o[0],ux[1]-o[1],ux[2]-o[2])||1;
  const widths=[];
  for(let i=0;i<=S;i++){ const a=wpts[Math.max(0,i-1)],c=wpts[i],d=wpts[Math.min(S,i+1)];
    let tx=d[0]-a[0],ty=d[1]-a[1]; const tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl;
    const nx=-ty,ny=tx,r=RAD[i]*sc;
    const s1=proj(c[0]+nx*r,c[1]+ny*r,c[2]), s2=proj(c[0]-nx*r,c[1]-ny*r,c[2]);
    widths.push(+Math.hypot(s1[0]-s2[0],s1[1]-s2[1]).toFixed(3)); }
  return { widths, screenLen:+len.toFixed(2), rings:S, worldRadRest:+RAD[0].toFixed(4) }; };
const hex=(m)=>{const c=m?.material?.color; return c?'#'+c.getHexString():null;};
const bandReport=()=>w.sling.bands.map(b=>{const p=stripProfile(b); const wd=p?p.widths:[];
  return { side:b.side, core:hex(b.tube?.core), shell:hex(b.tube?.shell), screenLen:p?.screenLen,
    wPouch: wd.length?+Math.min(...wd.slice(-3)).toFixed(3):null,
    wFork: wd.length?+Math.max(...wd.slice(0,3)).toFixed(3):null,
    wMax: wd.length?+Math.max(...wd).toFixed(3):null, wMin: wd.length?+Math.min(...wd).toFixed(3):null,
    rubberLength:+(b.rubberLength??0).toFixed(4) };});
const forkReport=()=>w.sling.prongs.map(p=>({ s:p.s, core:hex(p.tube?.core), shell:hex(p.tube?.shell),
  tip:p.tip?[+p.tip.x.toFixed(4),+p.tip.y.toFixed(4)]:null,
  rest:p.rest?[+p.rest.x.toFixed(4),+p.rest.y.toFixed(4)]:null,
  tipScreen:p.tip?proj(p.tip.x,p.tip.y,0).map(v=>+v.toFixed(2)):null }));
const poolPts=(k)=>{const pool=w.fx?.pools?.[k]; if(!pool) return null; const P=pool.p,out=[];
  for(let i=0;i<pool.max;i++) if(P.life[i]>0){ const s=proj(P.x[i],P.y[i],P.z[i]);
    out.push({x:+s[0].toFixed(2),y:+s[1].toFixed(2),sx:+(P.sx?P.sx[i]:0).toFixed(3),life:+P.life[i].toFixed(3)});} return out;};
`;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const G = (b, ...a) => game(PRE + b, ...a);
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };
  const crop = async (name, clip) => { const f = path.join(OUT, `${name}.png`); await page.screenshot({ path: f, clip }); return f; };
  const full = async (name) => { const f = path.join(OUT, `${name}.png`); await page.screenshot({ path: f }); return f; };

  const cropStrip = async (name, clip, { from=0, to=480, step=40, cols=0, scale=560 } = {}) => {
    const tmp = path.join(OUT, `.cs-${name}`); await rm(tmp,{recursive:true,force:true}); await mkdir(tmp,{recursive:true});
    const label = (t) => page.evaluate((txt)=>{ let el=document.getElementById('__cs');
      if(!el){el=document.createElement('div');el.id='__cs';
        el.style.cssText='position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;font:700 26px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.8);padding:3px 9px;border-radius:6px';
        document.body.appendChild(el);} el.textContent=txt; }, t).catch(()=>{});
    let i=0,t=from; if(from>0) await game('await SS.seek(args[0]);', from);
    while(t<=to){ await label(`t=${t}`); await page.screenshot({path:path.join(tmp,`f${String(i).padStart(3,'0')}.png`), clip});
      i++; t+=step; if(t<=to) await game('await SS.seek(args[0]);', step); }
    await page.evaluate(()=>document.getElementById('__cs')?.remove()).catch(()=>{});
    const files=(await readdir(tmp)).filter(f=>/^f\d+\.png$/.test(f)).sort();
    if(!files.length) throw new Error(`cropStrip ${name}: 0 frames`);
    const c=Math.max(1,cols||Math.min(4,Math.ceil(Math.sqrt(files.length)))), rows=Math.ceil(files.length/c);
    const out=path.join(OUT, `${name}-CROPSTRIP.png`);
    await exec('ffmpeg',['-y','-loglevel','error','-pattern_type','glob','-i',path.join(tmp,'f*.png'),
      '-filter_complex',`scale=${scale}:-2,tile=${c}x${rows}:padding=8:color=0x111111`,'-frames:v','1',out]);
    await rm(tmp,{recursive:true,force:true}); return out; };

  const vis = (what, on) => G(`
    const s = w.sling;
    if (args[0]==='bands') s.bands.forEach(b=>b.tube.group.visible=args[1]);
    if (args[0]==='prongs') s.prongs.forEach(p=>{p.tube.group.visible=args[1]; if(p.cap) p.cap.visible=args[1];});
    if (args[0]==='ammo' && s.ammo?.mesh) s.ammo.mesh.visible=args[1];
    if (args[0]==='slingall') s.group.visible=args[1];
    SS.stepOnce(); return true;`, what, on);

  const fresh = () => game('SS.seed(11); await SS.seek(2000);');
  const ANG = 0.42, POW = 0.90;

  /* ---------------------------------------------------------------- 1. PREVIEW GATE */
  await fresh();
  say('state_fresh', await state());
  say('preview_before_any_input', await G(`
    const s=w.sling; const tp=w.scene.getObjectByName('trajectory-preview');
    return { slingPreviewVisible: !!s.preview?.visible, scenePreviewVisible: tp? tp.visible : null,
             previewPtCount: s._previewPts?.length ?? null, drawn:s.drawn, state:s.state, level:w.level?.id };`));
  const d1 = await dragShot(ANG, 0.85, { steps: 6 });
  await game('SS.stepOnce();');
  say('first_drag_report', { angle: d1.angle, clamped: d1.clamped, grabbable: d1.grabbable });
  say('preview_on_FIRST_drag_FIRST_level', await G(`
    const s=w.sling; const tp=w.scene.getObjectByName('trajectory-preview');
    return { slingPreviewVisible: !!s.preview?.visible, scenePreviewVisible: tp? tp.visible : null, drawn:+s.drawn.toFixed(3) };`));

  /* ---------------------------------------------------------------- 2. COMPOSITION */
  await fresh();
  const C = await G(`
    const s=w.sling, sb=bboxScreen(s.group), ab=s.ammo?bboxScreen(s.ammo.mesh):null;
    let far=-1e9, farTag=null, tall=1e9;
    for(const b of [...(w.blocks||[]),...(w.villains||[])]){ const bb=b.mesh?bboxScreen(b.mesh):null; if(!bb) continue;
      if(bb.x1>far){far=bb.x1; farTag=b.tag||b.type||'?';} if(bb.y0<tall) tall=bb.y0; }
    let bw=null; const b0=w.blocks?.[0]; if(b0?.mesh) bw=bboxScreen(b0.mesh).w;
    const gy=proj(0,0,0)[1], hy=proj(300,0,0)[1];
    return { VW,VH, sling:sb, ammo:ab, AD:+(ab?.h??0).toFixed(2), BW:bw,
      slingPctW:+(sb.w/VW*100).toFixed(2), slingCentrePctW:+(sb.cx/VW*100).toFixed(2),
      rightOfSlingPctW:+((VW-sb.x1)/VW*100).toFixed(2),
      furthestTargetPctW:+(far/VW*100).toFixed(2), furthestTag:farTag,
      skyAboveTallestPctH:+(tall/VH*100).toFixed(2),
      groundYpctH:+(gy/VH*100).toFixed(2), horizonYpctH:+(hy/VH*100).toFixed(2),
      camPos:[+cam.position.x.toFixed(2),+cam.position.y.toFixed(2),+cam.position.z.toFixed(2)],
      fovY:cam.fov, aspect:+cam.aspect.toFixed(4),
      worldWidthAtPlane:+(2*Math.abs(cam.position.z)*Math.tan(cam.fov*Math.PI/360)*cam.aspect).toFixed(2),
      pouchScreen:proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)),
      anchorScreen:proj(s.anchor.x,s.anchor.y,0).map(v=>+v.toFixed(2)),
      ammoDiameterHook:+(s.ammoDiameter?s.ammoDiameter():0).toFixed(4) };`);
  say('composition', C);
  const AD = C.AD;
  await full('01-rest-full');

  const sb = C.sling, pad = Math.max(80, sb.w * 1.1);
  const clipS = { x: Math.max(0, Math.round(sb.x0-pad)), y: Math.max(0, Math.round(sb.y0-pad*0.9)),
                  width: Math.round(sb.w+pad*2), height: Math.round(sb.h+pad*1.8) };
  clipS.width = Math.min(clipS.width, C.VW-clipS.x); clipS.height = Math.min(clipS.height, C.VH-clipS.y);
  say('clipSling', clipS);

  /* ---------------------------------------------------------------- 3. LAYER MASKS (rest) */
  const layerSet = async (tag) => {
    await vis('bands', true); await vis('prongs', true); await vis('ammo', true);
    await crop(`M-${tag}-ALL`, clipS); await full(`M-${tag}-ALL-full`);
    await vis('bands', false);
    await crop(`M-${tag}-NOBAND`, clipS); await full(`M-${tag}-NOBAND-full`);
    await vis('ammo', false);
    await crop(`M-${tag}-NOBAND-NOAMMO`, clipS);
    await vis('ammo', true); await vis('prongs', false);
    await crop(`M-${tag}-AMMOONLY`, clipS);            // ammo, no bands, no prongs
    await vis('bands', true);
    await crop(`M-${tag}-AMMO+BANDS`, clipS);          // ammo + bands, no prongs
    await vis('ammo', false);
    await crop(`M-${tag}-BANDSONLY`, clipS);           // bands, no ammo, no prongs
    await vis('ammo', true); await vis('prongs', true);
  };
  await layerSet('rest');
  say('band_rest', await G(`return bandReport();`));
  say('fork_rest', await G(`return forkReport();`));

  /* ---------------------------------------------------------------- 4. STRETCH LADDER */
  const ladder = [];
  for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
    await fresh();
    if (p > 0) await G(`await SS.aim({angle:${ANG}, power:args[0]}); await SS.seek(400); return 1;`, p);
    else await G(`await SS.seek(400); return 1;`);
    const m = await G(`const s=w.sling, a=bboxScreen(s.ammo.mesh);
      return { drawn:+s.drawn.toFixed(3), bands:bandReport(), fork:forkReport(), ammo:a, AD:+a.h.toFixed(2),
        pouchScreen:proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)) };`);
    ladder.push({ power: p, ...m });
    const tag = 'p' + String(p).replace('.', '');
    await crop(`S-${tag}-sling`, clipS);
    await vis('ammo', false); await crop(`S-${tag}-BAND-NOAMMO`, clipS); await vis('ammo', true);
    if (p === 0 || p === 0.5 || p === 1.0) await layerSet(tag);
  }
  await writeFile(path.join(OUT, 'ladder.json'), JSON.stringify(ladder, null, 2));
  say('ladder_summary', ladder.map(l => ({ power:l.power, drawn:l.drawn, AD:l.AD,
    lenL:l.bands[0]?.screenLen, wPouchL:l.bands[0]?.wPouch, wForkL:l.bands[0]?.wFork,
    rubberLen:l.bands[0]?.rubberLength,
    tipL:l.fork[0]?.tip, restL:l.fork[0]?.rest, tipR:l.fork[1]?.tip, restR:l.fork[1]?.rest })));

  /* ---------------------------------------------------------------- 5. RELEASE SAMPLING */
  await fresh();
  await G(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); return 1;`);
  const preRel = await G(`const s=w.sling; return { pouchScreen:proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)),
    ammo:bboxScreen(s.ammo.mesh), bandLen:stripProfile(s.bands[0]).screenLen };`);
  say('pre_release', preRel);

  const rel = await G(`
    const s=w.sling;
    const dref={x:s.anchor.x-s.pouch.x,y:s.anchor.y-s.pouch.y}; const L=Math.hypot(dref.x,dref.y)||1; dref.x/=L; dref.y/=L;
    const pouch0=proj(s.pouch.x,s.pouch.y,0);
    const info=await SS.release();
    const out=[]; let t=0;
    for(let i=0;i<=80;i++){
      const p0=w.projectiles&&w.projectiles[0];
      const am=p0&&p0.mesh?bboxScreen(p0.mesh):null;
      const pS=proj(s.pouch.x,s.pouch.y,0);
      const off=(s.pouch.x-s.anchor.x)*dref.x+(s.pouch.y-s.anchor.y)*dref.y;
      const gS=proj(0,0,0), hS=proj(300,0,0);
      const sp=poolPts('spark4')||[], fl=poolPts('flash')||[], sm=poolPts('smoke')||[], ch=poolPts('chip')||[];
      const burst=[...sp,...fl];
      let bstat=null;
      if(burst.length){
        const cxs=burst.reduce((a,q)=>a+q.x,0)/burst.length, cys=burst.reduce((a,q)=>a+q.y,0)/burst.length;
        const dP=burst.map(q=>Math.hypot(q.x-pouch0[0],q.y-pouch0[1]));
        const dA=am?burst.map(q=>Math.hypot(q.x-am.cx,q.y-am.cy)):null;
        const rad=burst.map(q=>Math.hypot(q.x-cxs,q.y-cys));
        bstat={ n:burst.length, cx:+cxs.toFixed(1), cy:+cys.toFixed(1),
          centroidDistPouch:+Math.hypot(cxs-pouch0[0],cys-pouch0[1]).toFixed(1),
          centroidDistAmmo:am?+Math.hypot(cxs-am.cx,cys-am.cy).toFixed(1):null,
          medDistPouch:+dP.sort((a,b)=>a-b)[Math.floor(dP.length/2)].toFixed(1),
          maxDistPouch:+Math.max(...dP).toFixed(1),
          medDistAmmo:dA?+dA.sort((a,b)=>a-b)[Math.floor(dA.length/2)].toFixed(1):null,
          spread:+ (rad.reduce((a,b)=>a+b,0)/rad.length).toFixed(1) };
      }
      out.push({ t:Math.round(t), state:s.state, off:+off.toFixed(5),
        pouchScreen:[+pS[0].toFixed(2),+pS[1].toFixed(2)],
        bandLen:(stripProfile(s.bands[0])||{}).screenLen??null,
        bandWPouch:(()=>{const p=stripProfile(s.bands[0]); return p?+Math.min(...p.widths.slice(-3)).toFixed(2):null;})(),
        ammo:am?{cx:+am.cx.toFixed(2),cy:+am.cy.toFixed(2),x0:+am.x0.toFixed(2),y0:+am.y0.toFixed(2),
                 x1:+am.x1.toFixed(2),y1:+am.y1.toFixed(2),w:+am.w.toFixed(2),h:+am.h.toFixed(2)}:null,
        gapPx:am?+Math.hypot(am.cx-pouch0[0],am.cy-pouch0[1]).toFixed(2):null,
        edgeGapPx:am?+(Math.max(0, Math.hypot(am.cx-pouch0[0],am.cy-pouch0[1]) - Math.max(am.w,am.h)/2)).toFixed(2):null,
        groundY:+gS[1].toFixed(3), horizonY:+hS[1].toFixed(3),
        camY:+cam.position.y.toFixed(5), camX:+cam.position.x.toFixed(5), camRotZ:+cam.rotation.z.toFixed(6),
        burst:bstat, nSpark:sp.length, nFlash:fl.length, nSmoke:sm.length, nChip:ch.length });
      await SS.seek(10); t+=10;
    }
    return { info, pouch0, samples: out };`);
  await writeFile(path.join(OUT, 'release-samples.json'), JSON.stringify(rel, null, 2));
  say('release_info', rel.info);
  const S = rel.samples, at = (ms) => S.find(s => s.t === ms);
  say('release_key', [0,10,20,30,40,50,60,80,100,150,200,250,300,400,500,700].map(ms => {
    const s = at(ms); if (!s) return { t: ms, missing: true };
    return { t: ms, gapAD: s.gapPx!=null?+(s.gapPx/AD).toFixed(2):null,
      edgeGapAD: s.edgeGapPx!=null?+(s.edgeGapPx/AD).toFixed(2):null,
      off:s.off, bandLen:s.bandLen, bandWPouch:s.bandWPouch,
      burstN:s.burst?.n??0, burstDistPouchAD:s.burst?+(s.burst.centroidDistPouch/AD).toFixed(2):null,
      burstDistAmmoAD:s.burst?.centroidDistAmmo!=null?+(s.burst.centroidDistAmmo/AD).toFixed(2):null,
      burstSpreadAD:s.burst?+(s.burst.spread/AD).toFixed(2):null,
      nSpark:s.nSpark, nFlash:s.nFlash, nSmoke:s.nSmoke };
  }));
  /* first-frame overlap test (auto-fail criterion) */
  say('first_frame_overlap', (() => { const s0 = at(0), p = rel.pouch0;
    if (!s0?.ammo) return null;
    const inside = p[0]>=s0.ammo.x0 && p[0]<=s0.ammo.x1 && p[1]>=s0.ammo.y0 && p[1]<=s0.ammo.y1;
    return { t:0, pouchInsideAmmoBBox: inside, gapAD:+(s0.gapPx/AD).toFixed(2),
             edgeGapAD:+(s0.edgeGapPx/AD).toFixed(2) }; })());
  say('first_t_ge_8AD', (() => { const f = S.find(s => s.gapPx!=null && s.gapPx/AD>=8); return f?{t:f.t,gapAD:+(f.gapPx/AD).toFixed(2)}:null; })());
  const offs = S.map(s => s.off);
  const cross = []; for (let i=1;i<offs.length;i++) if ((offs[i-1]>=0)!==(offs[i]>=0)) cross.push(S[i].t);
  const ext = []; for (let i=1;i<offs.length-1;i++) if ((offs[i]-offs[i-1])*(offs[i+1]-offs[i])<0) ext.push({t:S[i].t,off:+offs[i].toFixed(4)});
  say('recoil', { restOff: 0, zeroCrossings: cross, extrema: ext,
    stillAfterMs: (()=>{ for(let i=0;i<S.length;i++) if (S.slice(i).every(s=>Math.abs(s.off)<0.004)) return S[i].t; return null; })(),
    offSeries: S.filter(s=>s.t<=500).map(s=>({t:s.t,off:+s.off.toFixed(4)})) });
  const g0 = S[0].groundY, h0 = S[0].horizonY;
  say('camera_kick', { maxAbsPctH:+Math.max(...S.map(s=>Math.abs(s.groundY-g0)/C.VH*100)).toFixed(3),
    at100:+((at(100).groundY-g0)/C.VH*100).toFixed(3), at250:+((at(250).groundY-g0)/C.VH*100).toFixed(3),
    at400:+((at(400).groundY-g0)/C.VH*100).toFixed(3),
    horizonMaxPctH:+Math.max(...S.map(s=>Math.abs(s.horizonY-h0)/C.VH*100)).toFixed(3),
    rotZmax:+Math.max(...S.map(s=>Math.abs(s.camRotZ))).toFixed(6),
    series: S.filter(s=>s.t<=400).map(s=>({t:s.t,pctH:+((s.groundY-g0)/C.VH*100).toFixed(3)})) });

  /* ---------------------------------------------------------------- 6. BURST MASK DIFF */
  const setup = async () => { await fresh();
    await G(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); await SS.release(); return 1;`); };
  const setVis = (name, v) => G(`const o=w.scene.getObjectByName(args[0]); if(!o) return false; o.visible=args[1]; SS.stepOnce(); return true;`, name, v);
  for (const t of [0, 40, 80, 160]) {
    await setup(); if (t>0) await game('await SS.seek(args[0]);', t);
    await full(`B-t${t}-ON`);
    await setVis('fx-spark4', false); await setVis('fx-flash', false); await setVis('fx-smoke', false);
    await full(`B-t${t}-OFF`);
    await setVis('fx-spark4', true); await setVis('fx-flash', true); await setVis('fx-smoke', true);
  }

  /* ---------------------------------------------------------------- 7. FILMSTRIPS */
  await setup(); say('fs_wide', await filmstrip('release-wide', { from: 0, to: 600, step: 50, cols: 4 }));
  await setup(); say('fs_early', await filmstrip('release-early-20ms', { from: 0, to: 180, step: 20, cols: 5 }));
  const forkClip = { x: Math.max(0, Math.round(sb.x0-160)), y: Math.max(0, Math.round(sb.y0-200)),
    width: Math.round(sb.w+620), height: Math.round(sb.h+400) };
  forkClip.width = Math.min(forkClip.width, C.VW-forkClip.x); forkClip.height = Math.min(forkClip.height, C.VH-forkClip.y);
  say('forkClip', forkClip);
  await setup(); say('cs_burst', await cropStrip('burst-fine', forkClip, { from: 0, to: 160, step: 20, cols: 3, scale: 620 }));
  await setup(); say('cs_recoil', await cropStrip('band-recoil', forkClip, { from: 0, to: 450, step: 25, cols: 5, scale: 460 }));

  /* stretch filmstrip through a REAL drag (band under tension, motion) */
  await fresh();
  say('cs_stretch', await (async () => {
    const tmp = path.join(OUT, '.cs-stretch'); await rm(tmp,{recursive:true,force:true}); await mkdir(tmp,{recursive:true});
    let i = 0;
    for (const p of [0,0.15,0.3,0.45,0.6,0.75,0.9,1.0]) {
      await fresh();
      if (p>0) await G(`await SS.aim({angle:${ANG}, power:args[0]}); await SS.seek(400); return 1;`, p);
      else await G(`await SS.seek(400); return 1;`);
      await page.evaluate((txt)=>{ let el=document.getElementById('__cs');
        if(!el){el=document.createElement('div');el.id='__cs';
          el.style.cssText='position:fixed;left:8px;top:8px;z-index:2147483647;font:700 26px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.8);padding:3px 9px;border-radius:6px';
          document.body.appendChild(el);} el.textContent=txt; }, `draw ${p}`);
      await page.screenshot({ path: path.join(tmp, `f${String(i++).padStart(3,'0')}.png`), clip: forkClip });
      await page.evaluate(()=>document.getElementById('__cs')?.remove());
    }
    const out = path.join(OUT, 'stretch-ladder-CROPSTRIP.png');
    await exec('ffmpeg',['-y','-loglevel','error','-pattern_type','glob','-i',path.join(tmp,'f*.png'),
      '-filter_complex','scale=560:-2,tile=4x2:padding=8:color=0x111111','-frames:v','1',out]);
    await rm(tmp,{recursive:true,force:true}); return out; })());

  /* ---------------------------------------------------------------- 8. BLIND CANDIDATES */
  const tB = (() => { const f = S.find(s => s.gapPx!=null && s.gapPx/AD>=8); return f ? Math.max(50, f.t) : 60; })();
  say('blind_t', tB);
  await setup(); if (tB>0) await game('await SS.seek(args[0]);', tB);
  say('blind_state', await G(`const s=w.sling,p0=w.projectiles?.[0];
    return { slingState:s.state, ammo:p0?.mesh?bboxScreen(p0.mesh):null, spark:(poolPts('spark4')||[]).length,
             flash:(poolPts('flash')||[]).length, pouch:proj(s.pouch.x,s.pouch.y,0).map(v=>+v.toFixed(2)) };`));
  await full('Z-BLIND-release-instant');
  await setup(); await game('await SS.seek(60);'); await full('Z-BLIND-t60');
  await setup(); await game('await SS.seek(100);'); await full('Z-BLIND-t100');
  await fresh(); await G(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); return 1;`);
  await full('Z-BLIND-fullstretch');

  await writeFile(path.join(OUT, 'MEASUREMENTS.json'), JSON.stringify(R, null, 2));
  console.log('### DONE');
};
