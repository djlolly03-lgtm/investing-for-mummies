import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT='/tmp/snl-hudtext'; mkdirSync(OUT,{recursive:true});
const W=Number(process.argv[2]||390),H=Number(process.argv[3]||844),DPR=Number(process.argv[4]||3),LANG=process.argv[5]||'en';
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor='+DPR],
 defaultViewport:{width:W,height:H,deviceScaleFactor:DPR,isMobile:W<500,hasTouch:W<500}});
const p=await b.newPage();
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready);
if(LANG!=='en') await p.evaluate(()=>{ const c=document.querySelector('[aria-label*="हिंदी"],[data-act="lang"]'); c&&c.click(); });
await p.evaluate(n=>window.__SNL.quickStart(n),2);
await new Promise(r=>setTimeout(r,600));
const res = await p.evaluate(()=>{
  const who=document.querySelector('.snl-ui__who'), hint=document.querySelector('.snl-ui__hint');
  const cwWho=who.clientWidth, cwHint=hint.clientWidth;
  const origW=who.textContent, origH=hint.textContent;
  const test=(el,s)=>{ el.textContent=s; const o={sw:el.scrollWidth,cw:el.clientWidth,h:el.getBoundingClientRect().height}; return o; };
  const names=['Priya','Amma','Radhika Bhabhi','Sunita','Lakshmi Devi','Chhotu','Papa','Nani','Meenakshi','You'];
  const whoRes=names.map(n=>({s:n+', your turn', ...test(who,n+', your turn')}));
  const hints=['Tap the dice','Tap anywhere to carry on','Rolled for you, so nobody had to wait','Pass to Radhika Bhabhi','Pass the phone to Priya','Lakshya poora.','Waiting for Radhika Bhabhi'];
  const hintRes=hints.map(s=>({s, ...test(hint,s)}));
  who.textContent=origW; hint.textContent=origH;
  const cs=getComputedStyle(who), ch=getComputedStyle(hint);
  return { cwWho, cwHint, whoStyle:{fs:cs.fontSize,ws:cs.whiteSpace,to:cs.textOverflow,ov:cs.overflow,lc:cs.webkitLineClamp},
    hintStyle:{fs:ch.fontSize,ws:ch.whiteSpace,to:ch.textOverflow,ov:ch.overflow,lc:ch.webkitLineClamp,op:ch.opacity,color:ch.color},
    whoRes, hintRes };
});
console.log(JSON.stringify(res,null,1));
await b.close();
