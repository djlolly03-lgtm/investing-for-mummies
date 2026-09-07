import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:true, args:['--hide-scrollbars','--mute-audio'],
  defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p = await b.newPage();
await p.setJavaScriptEnabled(false);            // the noscript path: the written board
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2'});
await new Promise(r=>setTimeout(r,1500));
const i = await p.$('#snl-nowebgl i');
console.log(JSON.stringify(await p.evaluate(()=>{
  const el=document.querySelector('#snl-nowebgl i'); const cs=getComputedStyle(el);
  el.scrollIntoView({block:'center'});
  return { display:getComputedStyle(document.getElementById('snl-nowebgl')).display,
    text:el.textContent, style:cs.fontStyle, synth:cs.fontSynthesisStyle, fam:cs.fontFamily };
})));
await p.screenshot({path:'/tmp/snl-nowebgl-i.png'});
await b.close();
