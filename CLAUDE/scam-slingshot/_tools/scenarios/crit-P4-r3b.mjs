/**
 * crit-P4-r3b.mjs — P4 r3 critic, measurement pass 2.
 *  (a) pixel horizon (sky/land boundary) in aim / traverse / arrival / settled frames
 *  (b) PURE X PAN horizon stability (camLock at two x, identical halfWidth)
 *  (c) on-screen size of the struck tower at aim vs at impact, in PIXELS
 *  (d) shake magnitude in %H, isolated from the dolly (rig.shake)
 *  (e) trajectory-corridor / dead-ground budget of the arrival frame
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera; const V3 = cam.position.constructor;
  const proj=(x,y,z)=>{const v=new V3(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) };};
  const vh=()=>2*Math.tan(cam.fov*Math.PI/360)*cam.position.z, vw=()=>vh()*cam.aspect;
  const camI=()=>({x:+cam.position.x.toFixed(4),y:+cam.position.y.toFixed(4),z:+cam.position.z.toFixed(4),
    vw:+vw().toFixed(4),vh:+vh().toFixed(4),roll:+cam.quaternion.z.toFixed(8)});
  const proje=()=>{const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(); return {x:+t.x.toFixed(3),y:+t.y.toFixed(3)};};
  const damageSum=()=>{let d=0; for(const b of W.blocks) d+=(b.damage||0); return d;};
`;

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const M = {};
  const g = (b, ...a) => game(PRE + b, ...a);

  const an = await page.browser().newPage();
  await an.setContent('<canvas id="c"></canvas>');
  const analyze = async (file, code) => {
    const b64 = (await readFile(file)).toString('base64');
    return an.evaluate(async (src, codeStr) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = (x, y) => { const i = (((y|0)*d.width)+(x|0))*4; return [d.data[i],d.data[i+1],d.data[i+2]]; };
      const lum = (x, y) => { const p = px(x,y); return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]; };
      return new Function('px','lum','W','H', codeStr)(px, lum, d.width, d.height);
    }, 'data:image/png;base64,' + b64, code);
  };

  // Every horizontal band boundary down a column, with the RGB either side.
  // The SKY/LAND boundary is the first boundary below which no pixel is ever "sky blue" again.
  const BANDS = `
    const col=Math.round(W*ARGX), out=[];
    const isSky=(p)=>(p[2]>p[0]+18 && p[2]>110);
    let prev=px(col,1);
    for(let y=2;y<H;y++){ const p=px(col,y);
      const dd=Math.abs(p[0]-prev[0])+Math.abs(p[1]-prev[1])+Math.abs(p[2]-prev[2]);
      if(dd>34) out.push({pctH:+(y/H*100).toFixed(2), from:prev, to:p, d:dd});
      prev=p; }
    // last y that is sky-coloured
    let lastSky=null; for(let y=1;y<H;y++){ if(isSky(px(col,y))) lastSky=y; }
    let firstNonSky=null; for(let y=1;y<H;y++){ if(!isSky(px(col,y))){ firstNonSky=y; break; } }
    return { col, boundaries: out.slice(0,14),
             lastSkyPctH: lastSky===null?null:+(lastSky/H*100).toFixed(2),
             firstNonSkyPctH: firstNonSky===null?null:+(firstNonSky/H*100).toFixed(2) };`;
  const bandsAt = (f, x) => analyze(f, BANDS.replace(/ARGX/g, String(x)));

  const hide = () => page.evaluate(() => document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u=>u.style.visibility='hidden'));
  const show = () => page.evaluate(() => document.querySelectorAll('#ui,#hud,.hud,[data-ui]').forEach(u=>u.style.visibility=''));

  const SETUP = 'await SS.seed(7); await SS.seek(2600);';
  const FIRE  = SETUP + ' SS.aim({angle:0.30, power:0.90}); await SS.seek(600); SS.release();';

  // ---------- (a) pixel horizon in the four key frames ----------
  const frames = {};
  await g(SETUP); await hide(); frames.aim = await shot('aim'); await show();
  M.camAim = await g('return camI();');
  await g(FIRE + ' await SS.seek(240);'); await hide(); frames.traverse = await shot('traverse'); await show();
  M.camTraverse = await g('return camI();');
  await g(FIRE + ' await SS.seek(480);'); await hide(); frames.impact = await shot('impact'); await show();
  M.camImpact = await g('return { ...camI(), damage: damageSum(), proj: proje() };');
  await g(FIRE + ' await SS.seek(7000);'); await hide(); frames.settled = await shot('settled'); await show();
  M.camSettled = await g('return camI();');

  M.horizon = {};
  for (const [k, f] of Object.entries(frames)) {
    M.horizon[k] = { file: path.basename(f), at05: await bandsAt(f, 0.05), at33: await bandsAt(f, 0.33) };
  }

  // ---------- (b) PURE X PAN: same y, same halfWidth, only x moves ----------
  await g(SETUP);
  const panShots = [];
  for (const cx of [8, 14, 20]) {
    await g('SS.camLock({ x: args[0], y: 3.2, halfWidth: 14 }); await SS.seek(600);', cx);
    await hide(); const f = await shot('panX-' + cx); await show();
    panShots.push({ cx, file: f, cam: await g('return camI();') });
  }
  M.pureXPan = [];
  for (const p of panShots) {
    M.pureXPan.push({ cx: p.cx, cam: p.cam, file: path.basename(p.file),
                      band: await bandsAt(p.file, 0.05) });
  }
  await g('SS.camUnlock(); await SS.seek(400);');

  // ---------- (c) struck-tower on-screen size, PIXELS, aim vs impact ----------
  // Column-scan for the tower's silhouette: any column whose pixels contain the wood/glass
  // palette between 25 %H and 90 %H.
  const TOWER = `
    const cols=[]; const isSky=(p)=>(p[2]>p[0]+18 && p[2]>110);
    const isGround=(p)=>(p[1]>p[2]+18) || (p[0]>90 && p[0]>p[2]+30 && p[1]<p[0]);
    for(let i=0;i<400;i++){
      const x=Math.min(W-1,Math.round(W*(i+0.5)/400)); let hit=false;
      for(let y=Math.round(H*0.02); y<Math.round(H*0.92); y++){
        const p=px(x,y);
        // wood (tan/brown, mid), glass (pale cyan, very bright), stone (neutral grey)
        const wood = p[0]>140 && p[0]<235 && p[1]>100 && p[1]<190 && p[2]<150 && p[0]-p[2]>45;
        const glass= p[2]>215 && p[0]>150 && p[0]<225 && p[2]-p[0]>18 && p[1]>200;
        const stone= Math.abs(p[0]-p[1])<14 && Math.abs(p[1]-p[2])<14 && p[0]>110 && p[0]<205;
        if(wood||glass||stone){ hit=true; break; }
      }
      if(hit) cols.push(+((i+0.5)/4).toFixed(2));
    }
    if(!cols.length) return { n:0 };
    // biggest contiguous run to the RIGHT of 40 %W (the target structure, not the sling)
    const right=cols.filter(c=>c>35);
    return { n:cols.length, leftmostPctW:cols[0], rightmostPctW:cols[cols.length-1],
             targetLeftPctW: right.length?right[0]:null, targetRightPctW: right.length?right[right.length-1]:null,
             targetWidthPctW: right.length?+(right[right.length-1]-right[0]).toFixed(2):null };`;
  M.towerPx = { aim: await analyze(frames.aim, TOWER), impact: await analyze(frames.impact, TOWER),
                settled: await analyze(frames.settled, TOWER) };

  // ---------- (d) shake in %H, isolated ----------
  await g(FIRE + ' await SS.seek(470);');
  const sh=[]; for(let t=0;t<=700;t+=10){
    sh.push({ t, ...(await g(`
      const r=W.rig; const s=r.shake;
      const sv = (s&&typeof s==='object') ? {x:s.x,y:s.y,mag:(s.mag!==undefined?s.mag:null)} : s;
      return { shake: sv, camy:+cam.position.y.toFixed(5), vh:+vh().toFixed(5),
               roll:+cam.quaternion.z.toFixed(9), hitStop:W.hitStop };`)) });
    if(t<700) await g('await SS.seek(10);');
  }
  M.shake10 = sh;

  // ---------- (e) arrival-frame budget: how much of the frame is dead ground / empty sky ----------
  M.arrivalBudget = await analyze(frames.impact, `
    const isSky=(p)=>(p[2]>p[0]+18 && p[2]>110);
    let sky=0, tot=0, dirtTop=null;
    for(let y=1;y<H;y+=2){ for(let x=1;x<W;x+=4){ tot++; if(isSky(px(x,y))) sky++; } }
    // top of the brown dirt slab in the middle of the frame
    for(let y=H-2;y>1;y--){ const p=px(Math.round(W*0.5),y);
      const brown = p[0]>60 && p[0]<150 && p[0]-p[2]>25 && p[1]<p[0];
      if(!brown){ dirtTop=+(y/H*100).toFixed(2); break; } }
    return { skyPct:+(sky/tot*100).toFixed(2), dirtTopPctH: dirtTop, dirtBandPctH: dirtTop===null?null:+(100-dirtTop).toFixed(2) };`);
  M.aimBudget = await analyze(frames.aim, `
    const isSky=(p)=>(p[2]>p[0]+18 && p[2]>110);
    let sky=0,tot=0,dirtTop=null;
    for(let y=1;y<H;y+=2){ for(let x=1;x<W;x+=4){ tot++; if(isSky(px(x,y))) sky++; } }
    for(let y=H-2;y>1;y--){ const p=px(Math.round(W*0.5),y);
      const brown = p[0]>60 && p[0]<150 && p[0]-p[2]>25 && p[1]<p[0];
      if(!brown){ dirtTop=+(y/H*100).toFixed(2); break; } }
    return { skyPct:+(sky/tot*100).toFixed(2), dirtTopPctH:dirtTop, dirtBandPctH: dirtTop===null?null:+(100-dirtTop).toFixed(2) };`);

  await writeFile(path.join(OUT, 'MEASURE2.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({
    camAim: M.camAim, camTraverse: M.camTraverse, camImpact: M.camImpact, camSettled: M.camSettled,
    horizonSkyLandPctH: Object.fromEntries(Object.entries(M.horizon).map(([k,v])=>[k,{ at05:v.at05.lastSkyPctH, at33:v.at33.lastSkyPctH }])),
    pureXPan: M.pureXPan.map(p=>({cx:p.cx, lastSkyPctH:p.band.lastSkyPctH, camx:p.cam.x, camy:p.cam.y, vw:p.cam.vw})),
    towerPx: M.towerPx, budget: { aim: M.aimBudget, impact: M.arrivalBudget },
    shakePeak: M.shake10.slice(0,20).map(s=>({t:s.t, shake:s.shake, hitStop:s.hitStop})),
  }, null, 2));
  await an.close();
};
