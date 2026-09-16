// throwaway — handoff-card contrast pixel scan, all player colours. DELETE AFTER USE.
import puppeteer from 'puppeteer';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/snl-w6-ink';
const N = +(process.env.N || 4);
const W=390,H=844,DPR=3;
fs.mkdirSync(OUT,{recursive:true});
const b = await puppeteer.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor='+DPR],defaultViewport:{width:W,height:H,deviceScaleFactor:DPR,isMobile:true,hasTouch:true}});
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await p.goto('http://localhost:8791/snakes-ladders/',{waitUntil:'networkidle2',timeout:60000});
await p.waitForFunction(()=>document.querySelector('.snl-setup__go'),{timeout:60000});
await new Promise(r=>setTimeout(r,1200));

// install the scanner in-page
await p.evaluateOnNewDocument(()=>{});
const SCAN = async (tag) => {
  const b64 = await p.screenshot({encoding:'base64'});
  return await p.evaluate(async (b64,dpr,tag)=>{
    const img = new Image();
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src='data:image/png;base64,'+b64;});
    const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
    const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
    const L=p=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2]);
    const CR=(a,b)=>{const l1=L(a),l2=L(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
    const hx=p=>'#'+p.map(v=>v.toString(16).padStart(2,'0')).join('');
    const scan=(sel)=>{
      const el=document.querySelector(sel); if(!el) return null;
      const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return null;
      const x=Math.round(r.x*dpr),y=Math.round(r.y*dpr),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
      if(x<0||y<0||x+w>cv.width||y+h>cv.height) return {err:'offscreen',rect:[r.x,r.y,r.width,r.height]};
      const d=cx.getImageData(x,y,w,h).data;
      const hist=new Map();
      for(let i=0;i<d.length;i+=4){
        const k=(d[i]>>2<<12)|(d[i+1]>>2<<6)|(d[i+2]>>2);
        let e=hist.get(k); if(!e){e={n:0,r:0,g:0,b:0};hist.set(k,e);}
        e.n++;e.r+=d[i];e.g+=d[i+1];e.b+=d[i+2];
      }
      const buckets=[...hist.values()].map(e=>({n:e.n,c:[Math.round(e.r/e.n),Math.round(e.g/e.n),Math.round(e.b/e.n)]}));
      buckets.sort((a,b)=>b.n-a.n);
      const bg=buckets[0].c;
      const total=w*h;
      const floor=Math.max(10,total*0.002);
      let ink=bg,best=1;
      for(const bk of buckets){ if(bk.n<floor) continue; const c=CR(bk.c,bg); if(c>best){best=c;ink=bk.c;} }
      return {sel,bg:hx(bg),ink:hx(ink),ratio:+best.toFixed(2),px:total,
              text:(el.textContent||'').trim().slice(0,48)};
    };
    const el=document.querySelector('.snl-handoff');
    const inn=el&&el.querySelector('.snl-handoff__in');
    return {tag, ok:!!el,
      cardBg: inn?getComputedStyle(inn).backgroundColor:null,
      outerBg: el?getComputedStyle(el).backgroundColor:null,
      vars: el?{ink:el.style.getPropertyValue('--ink'),soft:el.style.getPropertyValue('--ink-soft'),pc:el.style.getPropertyValue('--pc')}:null,
      name:scan('.snl-handoff__name'), sq:scan('.snl-handoff__sq'), tap:scan('.snl-handoff__tap')};
  },b64,DPR,tag);
};

// observer for card transitions
await p.evaluate(()=>{ window.__seen=0; });
const tapEl=async(sel,pick)=>{const r=await p.evaluate((s,pk)=>{const es=[...document.querySelectorAll(s)];const e=pk!=null?es[pk]:es[0];if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};},sel,pick??null);if(!r)return false;await p.touchscreen.tap(r.x,r.y);return true;};

await tapEl('.snl-setup__plaque', N-2);
await new Promise(r=>setTimeout(r,5000));

const results=[]; const seenColors=new Set();
for(let i=0;i<400 && seenColors.size<N;i++){
  const s=await p.evaluate(()=>{const A=window.__SNL;const st=A?.state?.()||{};const ho=document.querySelector('.snl-handoff');
    return{over:st.over,vis:!!(ho&&!ho.hidden&&ho.classList.contains('is-in')),pc:ho?ho.style.getPropertyValue('--pc'):'',
      rollDisabled:document.querySelector('.snl-ui__roll')?.disabled,
      lesson:(()=>{const btn=document.querySelector('.snl-lesson__btn');if(!btn)return null;const b=btn.getBoundingClientRect();return b.width>10?{x:b.x+b.width/2,y:b.y+b.height/2}:null;})()};});
  if(s.over) break;
  if(s.vis){
    const key=s.pc||'?';
    if(!seenColors.has(key)){
      seenColors.add(key);
      await new Promise(r=>setTimeout(r,260));
      const res=await SCAN(key);
      results.push(res);
      await p.screenshot({path:`${OUT}/card-${seenColors.size}-${key.replace('#','')}.png`});
      console.log('CARD',key,JSON.stringify({name:res.name?.ratio,sq:res.sq?.ratio,tap:res.tap?.ratio,inkVar:res.vars}));
    }
    await p.touchscreen.tap(W/2,H/2);
    await new Promise(r=>setTimeout(r,450));
    continue;
  }
  if(s.lesson){ await p.touchscreen.tap(s.lesson.x,s.lesson.y); await new Promise(r=>setTimeout(r,650)); continue; }
  if(s.rollDisabled===false){ await tapEl('.snl-ui__roll'); await new Promise(r=>setTimeout(r,950)); continue; }
  await new Promise(r=>setTimeout(r,300));
}
fs.writeFileSync(OUT+'/scan.json',JSON.stringify({results,errs},null,2));
console.log('\nSUMMARY');
for(const r of results) console.log(r.tag, 'name',r.name?.ratio,r.name?.ink,'on',r.name?.bg,'| sq',r.sq?.ratio,r.sq?.ink,'| tap',r.tap?.ratio,r.tap?.ink);
console.log('errors',errs.length,errs.slice(0,3));
await b.close();
