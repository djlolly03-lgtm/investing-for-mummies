import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT='/tmp/snl-eg5'; mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=3']});
const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:3,hasTouch:true,isMobile:true});
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const c=await p.createCDPSession(); await c.send('Emulation.setCPUThrottlingRate',{rate:4});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:120000});
await p.evaluate(()=>window.__SNL.ready);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const settle=async(t=20000)=>{try{await p.evaluate(t=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,t))]),t)}catch{} await sleep(150);};
await p.evaluate(()=>window.__SNL.quickStart(2)); await settle();
console.log('TIER/PARTICLES', JSON.stringify(await p.evaluate(()=>{
  const s=window.__SNL.state?.(); return {tier:s?.tier, cfg: (window.__SNL.cfg||window.CFG||{})?.quality?.current||null};})));
let turns=0;
while(turns<140){
  const s=await p.evaluate(()=>{const s=window.__SNL.state();return{over:s.over,cur:s.turn??s.current??0,pos:(s.players||[]).map(x=>x.pos)}});
  if(s.over)break;
  const me=s.pos[s.cur%s.pos.length], need=100-me;
  await p.evaluate(n=>window.__SNL.forceRoll(n),(need>=1&&need<=6)?need:1+((turns*7+3)%6));
  await settle();
  const txt=await p.evaluate(()=>window.__SNL.lessonText()); if(txt){await p.evaluate(()=>window.__SNL.dismissLesson()); await settle();}
  turns++;
}
await sleep(3000);
const m=await p.evaluate(()=>{const q=s=>document.querySelector(s);const sc=q('.snl-end__scroll');
 return{scrollH:sc?.scrollHeight,clientH:sc?.clientHeight,padB:sc?getComputedStyle(sc).paddingBottom:null,
  bar:(()=>{const b=q('.snl-end__bar');return b?Math.round(b.getBoundingClientRect().height):null})(),
  roads:[...document.querySelectorAll('.snl-end__road')].map(e=>Math.round(e.getBoundingClientRect().height)),
  txt:document.body.innerText.replace(/\n{3,}/g,'\n\n')};});
writeFileSync(join(OUT,'phone-sheet.json'),JSON.stringify(m,null,2));
console.log('turns',turns,'scrollH',m.scrollH,'clientH',m.clientH,'screens',(m.scrollH/m.clientH).toFixed(1),'padB',m.padB,'bar',m.bar);
const n=Math.min(10,Math.ceil(m.scrollH/m.clientH));
for(let i=0;i<n;i++){ await p.evaluate((i,ch)=>{document.querySelector('.snl-end__scroll').scrollTop=i*(ch-70)},i,m.clientH); await sleep(500); await p.screenshot({path:join(OUT,'p'+String(i).padStart(2,'0')+'.png')}); }
await b.close();
