import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--mute-audio']});
const p = await b.newPage();
await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2'});
await p.evaluate(()=>window.__SNL.ready);
await p.evaluate(()=>window.__SNL.quickStart(2));
await p.evaluate(()=>window.__SNL.settle());
const snap = () => p.evaluate(()=>{
  const r = window.__SNL.renderInfo?.()||{};
  return {calls:r.calls,tris:r.triangles,geo:r.geometries,tex:r.textures,
    prog:r.programs, fps:Math.round(window.__SNL.fps?.()||0),
    dom:document.querySelectorAll('*').length,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null};
});
console.log('turn  calls  tris   geo  tex  prog  fps   dom   heapMB');
for (let t=0;t<40;t++){
  await p.evaluate(v=>window.__SNL.forceRoll(v), 1+(t*7+3)%6);
  await p.evaluate(()=>window.__SNL.settle());
  if (await p.evaluate(()=>window.__SNL.lessonText())) await p.evaluate(()=>window.__SNL.dismissLesson());
  await p.evaluate(()=>window.__SNL.settle());
  if (t%5===0 || t>35){ const s=await snap();
    console.log(String(t).padStart(4), String(s.calls).padStart(6), String(s.tris).padStart(6),
      String(s.geo).padStart(5), String(s.tex).padStart(4), String(s.prog).padStart(5),
      String(s.fps).padStart(5), String(s.dom).padStart(5), String(s.heap).padStart(7)); }
  if (await p.evaluate(()=>window.__SNL.state().over)) { console.log('game over at turn',t); break; }
}
await b.close();
