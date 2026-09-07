import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:true, args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required'],
  defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('snl.lang','hi')}catch{}});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2'});
try{await p.evaluate(()=>window.__SNL&&window.__SNL.ready)}catch{}
await new Promise(r=>setTimeout(r,1500));
// the EN/हिं chip in the *English* first screen is checked elsewhere; here: play to the end
await p.evaluate(async()=>{const A=window.__SNL; await A.quickStart(2);});
for(let i=0;i<40 && await p.evaluate(()=>window.__SNL.screen()!=='endgame');i++){
  try{ await p.evaluate(async()=>{const A=window.__SNL; A.dismissLesson&&A.dismissLesson(); const s=A.state(); const me=s.players[s.turn].pos; await A.jumpTo(Math.min(97,me+9)); await A.forceRoll(6);}); }catch(e){}
  try{ await p.evaluate(()=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,9000))])); }catch{}
}
await new Promise(r=>setTimeout(r,1500));
console.log('screen=',await p.evaluate(()=>window.__SNL.screen()));
await p.screenshot({path:'/tmp/hi-endgame.png'});
await b.close();
