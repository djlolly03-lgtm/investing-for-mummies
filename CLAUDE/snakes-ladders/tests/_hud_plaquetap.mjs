/* Same timestamps, but the player taps the HUD ROLL plaque instead of the die,
   plus a keyboard roll (Space) run. */
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:true, args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio'],
  defaultViewport:{ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true } });
const p = await b.newPage();
p.on('pageerror', e=>console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready); await p.evaluate(()=>window.__SNL.quickStart(2));
await new Promise(r=>setTimeout(r,1400));
const out=[];
for (const mode of ['plaque','key','plaque']) {
  const ok = await p.evaluate(()=>!document.querySelector('.snl-ui__roll').disabled);
  if (!ok) { out.push({mode, skipped:'roll disabled'}); break; }
  await p.evaluate(async ()=>{
    const D = await import('/snakes-ladders/js/dice3d.js');
    const M={t0:0,tPlaque:0,tDieFace:0}; window.__M=M;
    const die=D.diceObject().children.find(c=>c.geometry&&c.geometry.type==='BoxGeometry');
    const el=document.querySelector('.snl-ui__die');
    const onDown=()=>{ if(!M.t0) M.t0=performance.now(); };
    window.addEventListener('pointerdown',onDown,true);
    window.addEventListener('keydown',onDown,true);
    const mo=new MutationObserver(()=>{ if(!M.tPlaque && !el.hidden && el.innerHTML.trim()) M.tPlaque=performance.now(); });
    mo.observe(el,{childList:true,subtree:true,attributes:true});
    let lq=die.quaternion.clone();
    const tick=()=>{ const now=performance.now();
      if(M.t0){ if(die.quaternion.angleTo(lq)>1e-3){M.tDieFace=now; lq=die.quaternion.clone();}
        M.aria=document.querySelector('.snl-ui__roll').getAttribute('aria-label');
        if(now-M.t0>2400){mo.disconnect(); return;} }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  if (mode==='plaque') { const r=await p.evaluate(()=>{const b=document.querySelector('.snl-ui__roll').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};}); await p.touchscreen.tap(r.x,r.y); }
  else { await p.evaluate(()=>document.querySelector('.snl-ui__roll').focus()); await p.keyboard.press('Enter'); }
  await new Promise(r=>setTimeout(r,2800));
  const m=await p.evaluate(()=>window.__M);
  out.push({mode, plaqueMs:m.tPlaque?+(m.tPlaque-m.t0).toFixed(0):null, dieFaceFinalMs:m.tDieFace?+(m.tDieFace-m.t0).toFixed(0):null, ariaMidRoll:m.aria});
  await p.evaluate(()=>window.__SNL.settle()); await new Promise(r=>setTimeout(r,900));
  await p.evaluate(async()=>{try{await window.__SNL.dismissLesson();}catch{}}); await new Promise(r=>setTimeout(r,1200));
}
console.log(JSON.stringify(out,null,1));
await b.close();
