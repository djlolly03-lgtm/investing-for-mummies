import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2] || '/tmp/snl-hud';
const N = Number(process.argv[3] || 2);
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 844), DPR = Number(process.argv[6] || 3);
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio','--force-device-scale-factor='+DPR],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: W<500, hasTouch: W<500 } });
const page = await browser.newPage();
const logs=[]; page.on('pageerror', e=>logs.push('PAGEERROR '+e.message));
await page.goto('http://localhost:8791/snakes-ladders/', { waitUntil:'networkidle2', timeout:45000 });
await page.evaluate(()=>window.__SNL.ready);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const api=(f,...a)=>page.evaluate((f,a)=>window.__SNL[f](...a),f,a);

const MEASURE = () => {
  const g = s => document.querySelector(s);
  const px = el => { if(!el) return null; const r=el.getBoundingClientRect(); const c=getComputedStyle(el);
    return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      fs:c.fontSize, fw:c.fontWeight, color:c.color, bg:c.backgroundColor, op:c.opacity,
      text:(el.textContent||'').trim().slice(0,80), sw:el.scrollWidth, cw:el.clientWidth, sh:el.scrollHeight, ch:el.clientHeight,
      mh:c.maxHeight, lh:c.lineHeight, ws:c.whiteSpace, disp:c.display, vis:c.visibility, hidden:el.hidden };
  };
  const out = {};
  for (const s of ['.snl-ui__top','.snl-ui__bottom','.snl-ui__plaques','.snl-ui__banner','.snl-ui__who','.snl-ui__hint','.snl-ui__roll','.snl-ui__rolltext','.snl-ui__log','.snl-ui__lines','.snl-ui__die','.snl-ui__wedge'])
    out[s]=px(g(s));
  out.plaques = [...document.querySelectorAll('.snl-ui__pl')].map(p=>({ ...px(p),
    name: px(p.querySelector('.snl-ui__pname')), num: px(p.querySelector('.snl-ui__pnum')), cls: p.className, aria: p.getAttribute('aria-current') }));
  out.lines = [...document.querySelectorAll('.snl-ui__line')].map(px);
  // every interactive control + where it sits
  out.controls = [...document.querySelectorAll('#snl-hud button, #snl-hud [role=button], #snl-hud a[href]')].map(b=>{
    const r=b.getBoundingClientRect(); return { label:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,40),
      x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), dis:b.disabled, ad:b.getAttribute('aria-disabled') };
  });
  out.vars = {}; const cs=getComputedStyle(document.documentElement);
  for (const v of ['--ts','--snl-text-scale','--f-name','--f-hint','--f-log','--f-chip','--f-who','--f-num','--tapc']) out.vars[v]=cs.getPropertyValue(v).trim();
  const hs = getComputedStyle(document.querySelector('#snl-hud')||document.body);
  for (const v of ['--f-name','--f-hint','--f-log','--f-chip','--f-who']) out.vars['hud'+v]=hs.getPropertyValue(v).trim();
  out.vh = window.innerHeight; out.vw = window.innerWidth;
  out.ui = window.__SNL.ui();
  return out;
};

const snap = async (tag) => {
  const m = await page.evaluate(MEASURE);
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  return { tag, ...m };
};
const results = [];
await api('quickStart', N);
await sleep(400);
results.push(await snap('a-fresh'));
// roll once
await api('forceRoll', 3); await sleep(300);
results.push(await snap('b-afterroll1'));
await page.evaluate(()=>window.__SNL.dismissLesson?.());
await sleep(400);
results.push(await snap('c-postdismiss'));
for (let i=0;i<6;i++){ await api('forceRoll', 1+(i%6)); await sleep(150); await page.evaluate(()=>window.__SNL.dismissLesson?.()); await sleep(150); }
results.push(await snap('d-midgame'));
// open the log
await page.evaluate(()=>{ const t=document.querySelector('.snl-ui__logtoggle,[data-act="log"],.snl-ui__log button'); t&&t.click(); });
await sleep(300);
results.push(await snap('e-logopen'));
// drive to game over
await page.evaluate(()=>window.__SNL.jumpTo && window.__SNL.jumpTo(0, 97));
await sleep(400);
for (let i=0;i<40;i++){ const s=await page.evaluate(()=>window.__SNL.state()); if(s && s.over) break; await api('forceRoll',3); await sleep(120); await page.evaluate(()=>window.__SNL.dismissLesson?.()); await sleep(120); }
await sleep(900);
results.push(await snap('f-gameover'));
// remove endgame overlay to see the HUD underneath
await page.evaluate(()=>document.querySelectorAll('.snl-end').forEach(e=>e.remove()));
await sleep(200);
results.push(await snap('g-gameover-hudonly'));
writeFileSync(`${OUT}/hud.json`, JSON.stringify({results, logs}, null, 2));
console.log(JSON.stringify(results.map(r=>({tag:r.tag, who:r['.snl-ui__who']?.text, hint:r['.snl-ui__hint']?.text, ui:{over:r.ui.over,rollEnabled:r.ui.rollEnabled,face:r.ui.face,active:r.ui.active}})),null,1));
await browser.close();
