import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--mute-audio'],defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}});
const p=await b.newPage();
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready); await p.evaluate(()=>window.__SNL.quickStart(2));
await new Promise(r=>setTimeout(r,1200));
console.log(await p.evaluate(async()=>{const D=await import('/snakes-ladders/js/dice3d.js');const g=D.diceObject();
 return g.children.map((c,i)=>({i,type:c.type,geo:c.geometry&&c.geometry.type,name:c.name,vis:c.visible}));}));
await b.close();
