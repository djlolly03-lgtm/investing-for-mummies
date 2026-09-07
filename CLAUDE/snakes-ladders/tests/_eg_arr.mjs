import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT='/tmp/snl-eg3'; mkdirSync(OUT,{recursive:true});
const DEV=process.argv[2]||'desktop';
const D={desktop:{w:1440,h:900,dpr:2},phone:{w:390,h:844,dpr:3}}[DEV];
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor='+D.dpr]});
const p=await b.newPage(); await p.setViewport({width:D.w,height:D.h,deviceScaleFactor:D.dpr,hasTouch:DEV==='phone',isMobile:DEV==='phone'});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:90000});
await p.evaluate(()=>window.__SNL.ready);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const settle=async(t=15000)=>{try{await p.evaluate(t=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,t))]),t)}catch{} await sleep(120);};
await p.evaluate(()=>window.__SNL.quickStart(2)); await settle();
await p.evaluate(()=>window.__SNL.jumpTo(97)); await settle();
// fire and forget
await p.evaluate(()=>{ window.__SNL.forceRoll(3); });
let t0=0;
while(Date.now()-t0<0){}
const start=Date.now(); let appeared=null;
while(Date.now()-start<20000){ if(await p.evaluate(()=>!!document.querySelector('.snl-end__arrival'))){appeared=Date.now();break;} await sleep(30); }
console.log('arrival at +',appeared-start);
const meas=[];
for(const t of [60,250,500,800,1100,1400,1600]){
  const now=Date.now()-appeared; if(now<t) await sleep(t-now);
  await p.screenshot({path:join(OUT,DEV+'-arr-'+t+'.png')});
  meas.push(await p.evaluate(t=>{const q=s=>document.querySelector(s);
   const pick=e=>{if(!e)return null;const c=getComputedStyle(e),r=e.getBoundingClientRect();return{bg:c.backgroundColor,sh:c.boxShadow.slice(0,60),op:c.opacity,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],ts:c.textShadow};};
   const go=q('.snl-end__go');
   return{t,plate:pick(q('.snl-end__plate')),bloomOp:q('.snl-end__bloom')?getComputedStyle(q('.snl-end__bloom')).opacity:null,
    won:pick(q('.snl-end__won')),skip:!!q('.snl-end__skip'),
    goOutline:go?getComputedStyle(go).outline:null, active:document.activeElement?.className||null,
    hudTurn:(document.querySelector('.snl-hud__turn,.snl-turn,[data-turn]')||{}).innerText||null,
    rollDisp:(()=>{const r=[...document.querySelectorAll('button')].find(b=>/^roll$/i.test(b.innerText.trim()));return r?getComputedStyle(r).display+'/'+getComputedStyle(r).opacity:null})(),
    logVisible:(()=>{const l=q('.snl-log,.snl-hud__log');return l?getComputedStyle(l).display+'/'+getComputedStyle(l).opacity:null})(),
    toast:(()=>{const s=q('.snl-toast,.snl-snack');return s?s.innerText:null})()};},t));
}
writeFileSync(join(OUT,DEV+'-arr.json'),JSON.stringify(meas,null,2));
console.log(JSON.stringify(meas.map(m=>({t:m.t,bloom:m.bloomOp,plate:m.plate&&m.plate.rect,go:m.goOutline,roll:m.rollDisp,toast:m.toast})),null,1));
await b.close();
