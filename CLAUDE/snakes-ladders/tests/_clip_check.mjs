/* Did the taller Devanagari metrics start clipping anything? Same journey, old
   font stack vs new, measuring overflow on every visible Devanagari element. */
import puppeteer from 'puppeteer';
const OLD = process.argv.includes('--old');
const b = await puppeteer.launch({ headless:true, args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required'],
  defaultViewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}});
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
if (OLD) { await p.setRequestInterception(true);
  p.on('request', r => r.url().startsWith('https://fonts.googleapis.com/css2')
    ? r.continue({url:'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@1,600&display=swap'}) : r.continue()); }
await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('snl.lang','hi')}catch{}});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2'});
try { await p.evaluate(()=>window.__SNL&&window.__SNL.ready); } catch {}
await new Promise(r=>setTimeout(r,2000));
const scan = () => p.evaluate(()=>{
  const D=/[ऀ-ॿ]/, out=[];
  for (const el of document.querySelectorAll('*')) {
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('');
    if(!D.test(own)) continue;
    const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') continue;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
    const ox=el.scrollWidth-el.clientWidth, oy=el.scrollHeight-el.clientHeight;
    if(cs.overflow==='visible'&&cs.overflowY==='visible') continue;
    if(ox>1||oy>1) out.push({t:own.trim().slice(0,30),cls:String(el.className).slice(0,30),ox,oy});
  }
  return out;
});
const stages={};
stages.setup = await scan();
try { await p.evaluate(async()=>{const A=window.__SNL; await A.quickStart(2); await A.jumpTo(2); await A.forceRoll(1);}); } catch(e){ console.log('drive '+e.message); }
try { await p.evaluate(()=>Promise.race([window.__SNL?.settle?.(),new Promise(r=>setTimeout(r,12000))])); } catch {}
await new Promise(r=>setTimeout(r,1200));
stages.lesson = await scan();
console.log((OLD?'OLD':'NEW')+' clipped elements: setup='+stages.setup.length+' lesson='+stages.lesson.length);
console.log(JSON.stringify(stages,null,1));
await b.close();
