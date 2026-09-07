import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT='/tmp/snl-eg4'; mkdirSync(OUT,{recursive:true});
const DEV=process.argv[2]||'desktop';
const D={desktop:{w:1440,h:900,dpr:2},phone:{w:390,h:844,dpr:3}}[DEV];
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor='+D.dpr]});
const p=await b.newPage(); await p.setViewport({width:D.w,height:D.h,deviceScaleFactor:D.dpr,hasTouch:DEV==='phone',isMobile:DEV==='phone'});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:90000});
await p.evaluate(()=>window.__SNL.ready);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const settle=async(t=15000)=>{try{await p.evaluate(t=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,t))]),t)}catch{} await sleep(120);};
await p.evaluate(()=>window.__SNL.quickStart(3)); await settle();
// block the arrival auto-advance so the beat can be photographed
await p.evaluate(()=>{const pend=new Set();const st=window.setTimeout.bind(window);
  window.setTimeout=(f,d,...a)=>{const id=st(f,d,...a);pend.add(id);return id;};
  (function loop(){ if(document.querySelector('.snl-end__plate')){pend.forEach(i=>clearTimeout(i));window.__frozen=true;return;} requestAnimationFrame(loop);})();});
await p.evaluate(()=>window.__SNL.jumpTo(97)); await settle();
await p.evaluate(()=>{window.__SNL.forceRoll(3);});
const start=Date.now();
while(Date.now()-start<25000){ if(await p.evaluate(()=>!!document.querySelector('.snl-end__plate'))) break; await sleep(25); }
// EARLY frame: freeze bloom near its peak by sampling immediately
await p.screenshot({path:join(OUT,DEV+'-A-early.png')});
const m1=await p.evaluate(()=>{const q=s=>document.querySelector(s);const bl=q('.snl-end__bloom');const pl=q('.snl-end__plate');return{frozen:!!window.__frozen,bloomOp:bl&&getComputedStyle(bl).opacity, plateRect:pl?(()=>{const r=pl.getBoundingClientRect();return[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})():null};});
await sleep(2200);
await p.screenshot({path:join(OUT,DEV+'-B-late.png')});
const m=await p.evaluate(()=>{
  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  const cs=e=>e?getComputedStyle(e):null;
  const pick=e=>{if(!e)return null;const c=cs(e),r=e.getBoundingClientRect();return{bg:c.backgroundColor,sh:c.boxShadow.slice(0,70),op:c.opacity,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],ts:c.textShadow,fs:c.fontSize,color:c.color};};
  const go=q('.snl-end__go');
  return{plate:pick(q('.snl-end__plate')),bloomOp:cs(q('.snl-end__bloom'))?.opacity,
   eyebrow:pick(q('.snl-end__eyebrow')),won:pick(q('.snl-end__won')),praise:pick(q('.snl-end__praise')),
   skip:!!q('.snl-end__skip'), goRect:go?go.getBoundingClientRect().toJSON():null, goOutline:go?cs(go).outline:null,
   active:document.activeElement?.className||document.activeElement?.tagName,
   dismissAffordances: qa('.snl-end__arrival button').map(e=>e.innerText.trim()),
   hudText:(q('.snl-hud')||q('#snl-hud')||{}).innerText||null,
   rollBtn:(()=>{const r=[...qa('button')].find(x=>/^roll$/i.test(x.innerText.trim()));return r?getComputedStyle(r).display:'none/absent'})(),
   toast:(()=>{const s=q('.snl-toast,.snl-snack,[class*=toast]');return s?getComputedStyle(s).opacity+':'+s.innerText.slice(0,80):null})(),
   crest:(q('.snl-end__crest')||{}).outerHTML?.slice(0,200)};
});
writeFileSync(join(OUT,DEV+'.json'),JSON.stringify({m1,m},null,2));
console.log(JSON.stringify({m1,m},null,1));
await b.close();
