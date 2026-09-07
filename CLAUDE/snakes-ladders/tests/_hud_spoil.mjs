import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
const OUT='/tmp/snl-spoil'; mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor=3'],
 defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p=await b.newPage();
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:45000});
await p.evaluate(()=>window.__SNL.ready);
await p.evaluate(()=>window.__SNL.quickStart(2));
await new Promise(r=>setTimeout(r,600));
p.evaluate(()=>window.__SNL.forceRoll(5));
for (const ms of [120,300,500]) { await new Promise(r=>setTimeout(r,ms===120?120:200)); await p.screenshot({path:`${OUT}/t${ms}.png`, clip:{x:0,y:600,width:390,height:244}}); }
await b.close();
