import puppeteer from 'puppeteer';
import fs from 'fs';
const OUT='/tmp/snl-teach3'; fs.mkdirSync(OUT,{recursive:true});
const TARGETS=[27,38,46,57,66,74,89,96,61,45];  // snake heads + quizzes
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage();
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'domcontentloaded',timeout:60000});
await pg.waitForFunction('window.__SNL&&window.__SNL.ready',{timeout:60000});
await pg.evaluate(()=>window.__SNL.ready);
await pg.evaluate(()=>window.__SNL.quickStart(2));
const SPACERS=[2,5,7,9,11,14,16,19,21,23];
const rows=[];
for(let i=0;i<TARGETS.length;i++){
  const t=TARGETS[i];
  // spacer turn first so §3.2 "never two cards in a row" doesn't suppress
  await pg.evaluate(n=>window.__SNL.jumpTo(n-1),SPACERS[i]);
  await pg.evaluate(()=>window.__SNL.forceRoll(1));
  await new Promise(r=>setTimeout(r,1200));
  await pg.evaluate(()=>window.__SNL.dismissLesson());
  await new Promise(r=>setTimeout(r,600));
  await pg.evaluate(n=>window.__SNL.jumpTo(n-1),t);
  await pg.evaluate(()=>window.__SNL.forceRoll(1));
  await new Promise(r=>setTimeout(r,1800));
  const m=await pg.evaluate(()=>{
    const root=document.querySelector('.snl-lesson');
    const isCard=root.classList.contains('is-card');
    const sheet=root.querySelector('.snl-lesson__sheet'), body=root.querySelector('.snl-lesson__body');
    const sr=sheet.getBoundingClientRect(), br=body.getBoundingClientRect();
    const kids=[...body.children].filter(e=>!e.hidden&&e.offsetHeight>0).map(e=>{
      const r=e.getBoundingClientRect(), c=getComputedStyle(e);
      return {cls:e.className.replace(/snl-lesson__|snl-lesson |stage/g,'').trim(),top:+r.top.toFixed(0),bot:+r.bot||+r.bottom.toFixed(0),
        fs:c.fontSize, col:c.color, bg:c.backgroundColor, txt:(e.innerText||'').replace(/\s+/g,' ')};
    });
    const btn=root.querySelector('.snl-lesson__btn'), more=root.querySelector('.snl-lesson__more');
    const words=(body.innerText||'').trim().split(/\s+/).filter(Boolean).length;
    return {isCard,sheetTop:+sr.top.toFixed(0),sheetH:+sr.height.toFixed(0),bodyBot:+br.bottom.toFixed(0),
      over:body.scrollHeight-body.clientHeight, words, ts:getComputedStyle(root).getPropertyValue('--ts').trim(),
      btn:btn?btn.innerText.trim():null, more:more&&!more.hidden?more.innerText.trim():null, kids,
      banner:(document.querySelector('.snl-ui__banner')||{innerText:''}).innerText.replace(/\n/g,' / ')};
  });
  m.square=t; rows.push(m);
  await pg.screenshot({path:`${OUT}/sq${String(t).padStart(3,'0')}.png`});
  // now expand Read more and re-measure
  if(m.isCard){
    const ok=await pg.evaluate(()=>{const el=document.querySelector('.snl-lesson__more'); if(!el||el.hidden)return false; el.click(); return true;});
    if(ok){ await new Promise(r=>setTimeout(r,900));
      const dm=await pg.evaluate(()=>{const root=document.querySelector('.snl-lesson'),body=root.querySelector('.snl-lesson__body'),sheet=root.querySelector('.snl-lesson__sheet');
        const deep=root.querySelector('.snl-lesson__deep');
        return {sheetH:+sheet.getBoundingClientRect().height.toFixed(0),over:body.scrollHeight-body.clientHeight,scrollTop:body.scrollTop,
          deepTxt:deep&&!deep.hidden?deep.innerText.replace(/\s+/g,' '):null,
          deepWords:deep&&!deep.hidden?deep.innerText.trim().split(/\s+/).length:0};});
      m.deep=dm; await pg.screenshot({path:`${OUT}/sq${String(t).padStart(3,'0')}-deep.png`});
    }
  }
  await pg.evaluate(()=>window.__SNL.dismissLesson());
  await new Promise(r=>setTimeout(r,500));
}
fs.writeFileSync(`${OUT}/m.json`,JSON.stringify({errs,rows},null,2));
console.log('done errs',errs.length);
await b.close();
