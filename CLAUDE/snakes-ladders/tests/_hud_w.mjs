import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor=3'],
 defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p=await b.newPage();
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready);
await p.evaluate(()=>window.__SNL.quickStart(2));
await new Promise(r=>setTimeout(r,600));
console.log(JSON.stringify(await p.evaluate(()=>{
  const who=document.querySelector('.snl-ui__who');
  const cs=getComputedStyle(who);
  const c=document.createElement('canvas').getContext('2d');
  c.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const cw=who.clientWidth;
  const strings=['Your turn','Priya, your turn','Amma, your turn','Radhika Bhabhi, your turn','Meenakshi, your turn','Lakshmi Devi, your turn','You reached 100','Priya reached 100','Radhika Bhabhi reached 100'];
  return { font:c.font, cw, res: strings.map(s=>({s, w:+c.measureText(s).width.toFixed(1), over:+(c.measureText(s).width-cw).toFixed(1)})) };
}),null,1));
await b.close();
