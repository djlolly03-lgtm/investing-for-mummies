import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
const OUT='/tmp/snl-hudhi'; mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor=3'],
 defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p=await b.newPage();
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready);
await p.evaluate(()=>window.__SNL.quickStart(2));
await new Promise(r=>setTimeout(r,500));
// click the lang chip in the HUD
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#snl-hud button')].find(x=>/language|भाषा/i.test(x.getAttribute('aria-label')||'')); c&&c.click(); });
await new Promise(r=>setTimeout(r,600));
await p.screenshot({path:OUT+'/hi-fresh.png'});
console.log(JSON.stringify(await p.evaluate(()=>({
  who:document.querySelector('.snl-ui__who').textContent.trim(),
  hint:document.querySelector('.snl-ui__hint').textContent.trim(),
  plaques:[...document.querySelectorAll('.snl-ui__pname')].map(n=>n.textContent.trim()),
  roll:document.querySelector('.snl-ui__rolltext').textContent.trim(),
  lang:window.__SNL.ui().lang,
})),null,1));
// dice reveal timing: does the HUD glyph paint before the cube lands?
const trace = await p.evaluate(async ()=>{
  const die=document.querySelector('.snl-ui__die');
  const samples=[]; const t0=performance.now();
  let stop=false;
  const tick=()=>{ if(stop) return; samples.push({t:+(performance.now()-t0).toFixed(0), hidden:die.hidden, pips:die.querySelectorAll('circle').length, face:window.__SNL.ui().face}); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const rp = window.__SNL.forceRoll(5);
  await new Promise(r=>setTimeout(r,2000)); stop=true; await rp;
  return samples;
});
const first = trace.find(s=>!s.hidden);
console.log('HUD die first visible at t=', first? first.t : 'never', 'face', first&&first.face);
console.log('trace sample', JSON.stringify(trace.filter((s,i)=>i%8===0).slice(0,14)));
await p.screenshot({path:OUT+'/hi-afterroll.png'});
await b.close();
