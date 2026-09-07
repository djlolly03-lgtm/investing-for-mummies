import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:true, args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio'],
  defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}});
const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('requestfailed',r=>errs.push('REQFAIL '+r.url()));
// boot screen only: block the module so the loading screen stays up
await p.setRequestInterception(true);
p.on('request', r => r.url().endsWith('/js/main.js') ? r.abort() : r.continue());
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1800));
console.log(JSON.stringify(await p.evaluate(()=>{
  const cs=getComputedStyle(document.documentElement);
  const inline=[...document.styleSheets].find(s=>!s.href);
  const boot=document.getElementById('snl-boot');
  const t=document.querySelector('.snl-boot__title');
  return { ui:cs.getPropertyValue('--ui').trim(), display:cs.getPropertyValue('--display').trim(),
    synth:cs.fontSynthesisStyle||cs.getPropertyValue('font-synthesis-style'),
    inlineRules:inline?inline.cssRules.length:-1,
    bootVisible: boot && getComputedStyle(boot).opacity==='1',
    titleFont:getComputedStyle(t).fontFamily+' | '+getComputedStyle(t).fontStyle+' '+getComputedStyle(t).fontWeight,
    titleH: Math.round(t.getBoundingClientRect().height),
    nowebgl: getComputedStyle(document.getElementById('snl-nowebgl')).display };
}),null,1));
await p.screenshot({path:'/tmp/snl-boot-after.png'});
console.log('errors:',errs);
await b.close();
