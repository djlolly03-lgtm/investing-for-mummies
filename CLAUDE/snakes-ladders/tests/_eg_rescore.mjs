import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT='/tmp/snl-eg2'; mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=2']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:90000});
await p.evaluate(()=>window.__SNL.ready);
const api=(f,...a)=>p.evaluate((f,a)=>window.__SNL[f](...a),f,a);
const settle=async(t=15000)=>{try{await p.evaluate(t=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,t))]),t)}catch{} await new Promise(r=>setTimeout(r,120));};
const shot=n=>p.screenshot({path:join(OUT,n+'.png')});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

await api('quickStart',2); await settle();
let turns=0,lessons=0,winning=false;
while(turns<140){
  const s=await p.evaluate(()=>{const s=window.__SNL.state();return{over:s.over,cur:s.turn??s.current??0,pos:(s.players||[]).map(x=>x.pos)}});
  if(s.over)break;
  const me=s.pos[s.cur%s.pos.length];
  const need=100-me;
  if(need>=1&&need<=6){ winning=true; await api('forceRoll',need); break; }
  await api('forceRoll',1+((turns*7+3)%6)); await settle(15000);
  const txt=await api('lessonText'); if(txt){lessons++; await api('dismissLesson'); await settle();}
  turns++;
}
console.log('turns',turns,'lessons',lessons,'winningRoll',winning);
// poll for arrival element
let t0=Date.now(),appeared=null;
while(Date.now()-t0<25000){
  const ok=await p.evaluate(()=>!!document.querySelector('.snl-end__arrival'));
  if(ok){appeared=Date.now();break;}
  await sleep(40);
}
console.log('arrival appeared after',appeared?appeared-t0:'NEVER','ms');
const meas=[];
for(const t of [80,300,600,900,1200,1500,1800]){
  const now=Date.now()-appeared;
  if(now<t) await sleep(t-now);
  await shot('arr-'+t);
  meas.push(await p.evaluate((t)=>{
    const q=s=>document.querySelector(s);
    const cs=e=>e?getComputedStyle(e):null;
    const pick=e=>{if(!e)return null;const c=cs(e),r=e.getBoundingClientRect();return{bg:c.backgroundColor,shadow:c.boxShadow,border:c.border,op:c.opacity,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],fs:c.fontSize,color:c.color,ts:c.textShadow};};
    return {t, arrival:pick(q('.snl-end__arrival')), plate:pick(q('.snl-end__plate')), bloom:pick(q('.snl-end__bloom')),
      won:pick(q('.snl-end__won')), eyebrow:pick(q('.snl-end__eyebrow')), praise:pick(q('.snl-end__praise')),
      skip:!!q('.snl-end__skip'), go:!!q('.snl-end__go'),
      hudVisible:(()=>{const h=q('.snl-hud')||q('#snl-hud');return h?getComputedStyle(h).opacity+'/'+getComputedStyle(h).visibility:null})(),
      rollBtn:(()=>{const r=[...document.querySelectorAll('button')].find(b=>/^roll|पासा/i.test(b.innerText.trim()));if(!r)return null;const c=getComputedStyle(r);return{op:c.opacity,vis:c.visibility,disp:c.display,txt:r.innerText.trim()}})(),
      bodyTextSample: document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,600)};
  },t));
}
writeFileSync(join(OUT,'arrival.json'),JSON.stringify(meas,null,2));
await sleep(2500);
await shot('sheet-top');
const sheet=await p.evaluate(()=>{
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const scroll=q('.snl-end__scroll');
  const h=q('#snl-end-h');
  const roads=q('.snl-end__roads');
  return {
    activeEl: document.activeElement? (document.activeElement.id||document.activeElement.className||document.activeElement.tagName):null,
    headingOutline: h?getComputedStyle(h).outline:null,
    scrollH: scroll?scroll.scrollHeight:null, clientH: scroll?scroll.clientHeight:null,
    scrollPadBottom: scroll?getComputedStyle(scroll).paddingBottom:null,
    roadsAlign: roads?getComputedStyle(roads).alignItems:null,
    roadCardHeights: qa('.snl-end__road').map(e=>Math.round(e.getBoundingClientRect().height)),
    oneCards: qa('.snl-end__one').length,
    jobs: qa('.snl-end__job').length,
    crestHTML: (q('.snl-end__crest')||{}).outerHTML?.slice(0,300)||null,
    tokHTML: qa('.snl-end__tok').slice(0,2).map(e=>e.outerHTML.slice(0,200)),
    fullText: document.body.innerText.replace(/\n{3,}/g,'\n\n')
  };
});
writeFileSync(join(OUT,'sheet.json'),JSON.stringify(sheet,null,2));
console.log('scrollH',sheet.scrollH,'clientH',sheet.clientH,'padB',sheet.scrollPadBottom,'roads',sheet.roadsAlign,sheet.roadCardHeights,'oneCards',sheet.oneCards,'jobs',sheet.jobs,'active',sheet.activeEl,'outline',sheet.headingOutline);
// scroll captures
if(sheet.scrollH){
  const n=Math.min(8,Math.ceil(sheet.scrollH/sheet.clientH));
  for(let i=0;i<n;i++){ await p.evaluate((i,ch)=>{document.querySelector('.snl-end__scroll').scrollTop=i*(ch-60)},i,sheet.clientH); await sleep(350); await shot('s'+String(i).padStart(2,'0')); }
}
writeFileSync(join(OUT,'errs.txt'),errs.join('\n'));
await b.close();
