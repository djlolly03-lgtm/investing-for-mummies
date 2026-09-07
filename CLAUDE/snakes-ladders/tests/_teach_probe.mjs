import puppeteer from 'puppeteer';
import fs from 'fs';
const OUT='/tmp/snl-teach2'; fs.mkdirSync(OUT,{recursive:true});
const TARGETS=[3,10,12,15,17,24,25,27,29,35,38,41,44,45,46,50,51,54,57,61,66,68,73,74,75,76,78,82,86,87,89,92,96];
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage();
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'domcontentloaded',timeout:60000});
await pg.waitForFunction('window.__SNL&&window.__SNL.ready',{timeout:60000});
await pg.evaluate(()=>window.__SNL.ready);
await pg.evaluate(()=>window.__SNL.quickStart(2));
const rows=[];
for(const t of TARGETS){
  try{
    await pg.evaluate(n=>window.__SNL.jumpTo(n-1),t);
    await pg.evaluate(()=>window.__SNL.forceRoll(1));
    await new Promise(r=>setTimeout(r,1400));
    const m=await pg.evaluate(()=>{
      const root=document.querySelector('.snl-lesson'); if(!root) return {none:true};
      const isCard=root.classList.contains('is-card');
      const sheet=root.querySelector('.snl-lesson__sheet');
      const body=root.querySelector('.snl-lesson__body');
      const sr=sheet.getBoundingClientRect(), br=body.getBoundingClientRect();
      const cs=getComputedStyle(body);
      const kids=[...body.children].filter(e=>!e.hidden&&e.offsetHeight>0).map(e=>{
        const r=e.getBoundingClientRect();
        return {cls:e.className.replace(/snl-lesson__/g,'').trim(),top:+r.top.toFixed(1),bot:+r.bottom.toFixed(1),
          fs:getComputedStyle(e).fontSize, txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,90)};
      });
      const more=root.querySelector('.snl-lesson__more');
      const btn=root.querySelector('.snl-lesson__btn');
      const foot=root.querySelector('.snl-lesson__foot');
      const fr=foot&&!foot.hidden?foot.getBoundingClientRect():null;
      const words=(body.innerText||'').trim().split(/\s+/).filter(Boolean).length;
      const ts=getComputedStyle(document.documentElement).getPropertyValue('--ts')||getComputedStyle(root).getPropertyValue('--ts');
      return {isCard,sheetTop:+sr.top.toFixed(1),sheetH:+sr.height.toFixed(1),
        bodyTop:+br.top.toFixed(1),bodyBot:+br.bottom.toFixed(1),
        scrollH:body.scrollHeight,clientH:body.clientHeight,scrollTop:+body.scrollTop.toFixed(1),
        overflowY:cs.overflowY, maskTop:cs.webkitMaskImage||cs.maskImage,
        footTop:fr?+fr.top.toFixed(1):null, footBg:foot?getComputedStyle(foot).background.slice(0,80):null,
        moreTxt:more&&!more.hidden?more.innerText.trim():null,
        btnTxt:btn?btn.innerText.trim():null, words, ts:ts.trim(), kids,
        banner:(document.querySelector('.snl-ui__banner')||{}).innerText?.replace(/\n/g,' / ')||null};
    });
    m.square=t; rows.push(m);
    await pg.screenshot({path:`${OUT}/sq${String(t).padStart(3,'0')}.png`});
    await pg.evaluate(()=>window.__SNL.dismissLesson());
    await new Promise(r=>setTimeout(r,500));
  }catch(e){ rows.push({square:t,err:String(e).slice(0,120)}); }
}
fs.writeFileSync(`${OUT}/measure.json`,JSON.stringify({errs,rows},null,2));
console.log('errs',errs.length);
for(const r of rows){
  if(r.err){console.log(r.square,'ERR',r.err);continue;}
  if(!r.isCard){console.log(r.square,'ribbon words='+r.words);continue;}
  const over=r.scrollH-r.clientH;
  console.log(`${String(r.square).padStart(3)} CARD top=${r.sheetTop} h=${r.sheetH} body=${r.clientH}/${r.scrollH} over=${over} scrollTop=${r.scrollTop} words=${r.words} ts=${r.ts} more=${JSON.stringify(r.moreTxt)} btn=${JSON.stringify(r.btnTxt)}`);
  const cut=r.kids.filter(k=>k.bot>r.bodyBot+0.5);
  if(cut.length) console.log('     CUT:',cut.map(k=>k.cls+'@'+k.bot).join(', '));
}
await b.close();
