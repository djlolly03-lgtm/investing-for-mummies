/* _deep_read.mjs — does "Aur padho" reveal, or jump?
   Real taps at real coordinates. Measures scrollTop + boxes before/after. */
import puppeteer from 'puppeteer';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/snl-deep-before';
fs.mkdirSync(OUT, { recursive: true });
const TARGETS = [27, 38, 46, 57, 66, 74, 89, 96];
const SPACERS = [2, 5, 7, 9, 11, 14, 16, 19];

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage();
await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto('http://localhost:8791/snakes-ladders/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction('window.__SNL&&window.__SNL.ready', { timeout: 60000 });
await pg.evaluate(() => window.__SNL.ready);
await pg.evaluate(() => window.__SNL.quickStart(2));

const MEAS = () => {
  const root = document.querySelector('.snl-lesson');
  const body = root.querySelector('.snl-lesson__body');
  const sheet = root.querySelector('.snl-lesson__sheet');
  const br = body.getBoundingClientRect();
  const box = (sel) => {
    const e = root.querySelector(sel);
    if (!e || e.hidden || !e.offsetHeight) return null;
    const r = e.getBoundingClientRect();
    return { top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1),
             vis: +(Math.max(0, Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top))).toFixed(1),
             h: +r.height.toFixed(1) };
  };
  const cs = getComputedStyle(body);
  return {
    scrollTop: +body.scrollTop.toFixed(1),
    over: body.scrollHeight - body.clientHeight,
    sheetH: +sheet.getBoundingClientRect().height.toFixed(0),
    bodyTop: +br.top.toFixed(1), bodyBot: +br.bottom.toFixed(1),
    mask: (cs.webkitMaskImage || cs.maskImage || 'none').replace(/rgba?\([^)]*\)/g, 'C').slice(0, 110),
    title: box('.snl-lesson__title'), what: box('.snl-lesson__what'),
    num: box('.snl-lesson__number'), name: box('.snl-lesson__name'),
    way: box('.snl-lesson__way'), party: box('.snl-lesson__party'),
    deep: box('.snl-lesson__deep'), chip: box('.snl-lesson__chip'),
    moreVisible: (() => { const m = root.querySelector('.snl-lesson__more');
      if (!m) return null; const c = getComputedStyle(m);
      return c.display !== 'none' && +c.opacity > 0.05; })(),
    moreLabel: (root.querySelector('.snl-lesson__more') || {}).innerText || null,
    atEnd: root.classList.contains('is-atEnd'), scrolled: root.classList.contains('is-scrolled'),
  };
};

const rows = [];
for (let i = 0; i < TARGETS.length; i++) {
  const t = TARGETS[i];
  await pg.evaluate(n => window.__SNL.jumpTo(n - 1), SPACERS[i]);
  await pg.evaluate(() => window.__SNL.forceRoll(1));
  await new Promise(r => setTimeout(r, 1200));
  await pg.evaluate(() => window.__SNL.dismissLesson());
  await new Promise(r => setTimeout(r, 600));
  await pg.evaluate(n => window.__SNL.jumpTo(n - 1), t);
  await pg.evaluate(() => window.__SNL.forceRoll(1));
  await new Promise(r => setTimeout(r, 2200));
  const isCard = await pg.evaluate(() => document.querySelector('.snl-lesson').classList.contains('is-card'));
  if (!isCard) { rows.push({ square: t, skipped: 'no card' }); await pg.evaluate(() => window.__SNL.dismissLesson()); await new Promise(r => setTimeout(r, 400)); continue; }
  const before = await pg.evaluate(MEAS);
  await pg.screenshot({ path: `${OUT}/sq${t}-a-before.png` });
  // REAL TAP on the chevron
  const pt = await pg.evaluate(() => { const m = document.querySelector('.snl-lesson__more');
    if (!m || getComputedStyle(m).display === 'none') return null;
    const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!pt) { rows.push({ square: t, before, skipped: 'no more btn' }); await pg.evaluate(() => window.__SNL.dismissLesson()); await new Promise(r => setTimeout(r, 400)); continue; }
  await pg.touchscreen.tap(pt.x, pt.y);
  await new Promise(r => setTimeout(r, 260));
  const mid = await pg.evaluate(MEAS);
  await new Promise(r => setTimeout(r, 900));
  const after = await pg.evaluate(MEAS);
  await pg.screenshot({ path: `${OUT}/sq${t}-b-after.png` });
  rows.push({ square: t, before, mid, after });
  await pg.evaluate(() => window.__SNL.dismissLesson());
  await new Promise(r => setTimeout(r, 500));
}
fs.writeFileSync(`${OUT}/m.json`, JSON.stringify({ errs, rows }, null, 2));
const f = (o) => o ? `${o.top}→${o.bot} vis${o.vis}` : '—';
for (const r of rows) {
  if (r.skipped) { console.log(`sq${r.square}: SKIP ${r.skipped}`); continue; }
  console.log(`sq${r.square}  scrollTop ${r.before.scrollTop} → ${r.after.scrollTop} (over ${r.before.over}→${r.after.over})  sheetH ${r.before.sheetH}→${r.after.sheetH}`);
  console.log(`      title ${f(r.before.title)}  ->  ${f(r.after.title)}`);
  console.log(`      num   ${f(r.before.num)}  ->  ${f(r.after.num)}`);
  console.log(`      way   ${f(r.before.way)}  ->  ${f(r.after.way)}`);
  console.log(`      deep  ${f(r.after.deep)}  chip ${f(r.after.chip)}  more ${r.after.moreVisible} "${(r.after.moreLabel||'').trim()}"  atEnd ${r.after.atEnd}`);
  console.log(`      mask  ${r.after.mask}`);
}
console.log('errs', errs.length, errs.slice(0, 3));
await b.close();
