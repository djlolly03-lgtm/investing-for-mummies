import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>-1?process.argv[i+1]:d;};
const OUT=arg('out','/tmp/snl-w6-teach'), TAG=arg('tag','x'), SCALE=Number(arg('scale','1'));
mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=3'],
 defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const page=await b.newPage();
await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2'});
await page.evaluate(()=>window.__SNL.ready);
await page.evaluate(s=>{document.documentElement.style.setProperty('--snl-text-scale',String(s));},SCALE);
await page.evaluate(()=>window.__SNL.quickStart(2));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [sq,label] of [[27,'snake27'],[35,'lesson35'],[92,'milestone92']]){
  await page.evaluate(async n=>{await window.__SNL.jumpTo(n-1);},sq);
  await page.evaluate(()=>window.__SNL.forceRoll(1));
  await sleep(1900);
  if(await page.evaluate(()=>window.__SNL.screen())!=='lesson'){console.log(label,'skip');await page.evaluate(()=>window.__SNL.dismissLesson());await sleep(500);continue;}
  const st0=await page.evaluate(()=>document.querySelector('.snl-lesson__body').scrollTop);
  const box=await page.$eval('.snl-lesson__more',el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.touchscreen.tap(box.x,box.y); await sleep(900);
  const st1=await page.evaluate(()=>document.querySelector('.snl-lesson__body').scrollTop);
  await page.screenshot({path:join(OUT,`${TAG}-${label}-open.png`)});
  // real finger drag upward through the card body to scroll it
  const bb=await page.$eval('.snl-lesson__body',el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y0:r.y+r.height*0.75,y1:r.y+r.height*0.2};});
  const t=page.touchscreen;
  await t.touchStart(bb.x,bb.y0);
  for(let i=1;i<=8;i++){await t.touchMove(bb.x,bb.y0+(bb.y1-bb.y0)*i/8);await sleep(20);}
  await t.touchEnd(); await sleep(700);
  const st2=await page.evaluate(()=>document.querySelector('.snl-lesson__body').scrollTop);
  const mx=await page.evaluate(()=>{const e=document.querySelector('.snl-lesson__body');return e.scrollHeight-e.clientHeight;});
  await page.screenshot({path:join(OUT,`${TAG}-${label}-dragged.png`)});
  console.log(`${label} scale${SCALE}: scrollTop ${st0} -> ${st1} (tap) -> ${st2} (drag, max ${mx})`);
  await page.evaluate(()=>window.__SNL.dismissLesson()); await sleep(600);
}
console.log('errors:',errs.length?errs:'none');
await b.close();
