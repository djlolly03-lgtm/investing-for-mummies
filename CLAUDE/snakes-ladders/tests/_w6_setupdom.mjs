import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor=3'],defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:60000});
await p.waitForFunction(()=>document.querySelector('.snl-setup__go'),{timeout:60000});
await new Promise(r=>setTimeout(r,1200));
console.log(await p.evaluate(()=>{
  const q=s=>[...document.querySelectorAll(s)].map(e=>({t:e.textContent.trim().slice(0,40),cls:e.className,r:e.getBoundingClientRect().toJSON()}));
  return JSON.stringify({plaques:q('.snl-setup__plaque'),btns:q('.snl-setup button').slice(0,20)},null,1);
}));
await b.close();
