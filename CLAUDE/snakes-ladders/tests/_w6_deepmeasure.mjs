/* deepmeasure.mjs — real-UI measurement of the "Aur padho" tap.
   node deepmeasure.mjs --out /tmp/snl-w6-teach [--tag before] */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/tmp/snl-w6-teach');
const TAG = arg('tag', 'x');
const URL = 'http://localhost:8791/snakes-ladders/';
mkdirSync(OUT, { recursive: true });

const CASES = [
  { sq: 24, label: 'lesson-24-FD' },
  { sq: 35, label: 'lesson-35-term' },
  { sq: 27, label: 'snake-27-endow' },
  { sq: 10, label: 'milestone-10-infl' },
  { sq: 76, label: 'lesson-76-expratio' },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars',
         '--mute-audio', '--autoplay-policy=no-user-gesture-required',
         '--force-device-scale-factor=3'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('[err] ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle2' });
await page.evaluate(() => window.__SNL.ready);
await page.evaluate(() => window.__SNL.quickStart(2));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MEASURE = () => {
  const root = document.querySelector('.snl-lesson');
  const body = root && root.querySelector('.snl-lesson__body');
  if (!body) return null;
  const g = (sel) => {
    const el = root.querySelector(sel);
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1) };
  };
  const br = body.getBoundingClientRect();
  const sr = root.querySelector('.snl-lesson__sheet').getBoundingClientRect();
  return {
    scrollTop: +body.scrollTop.toFixed(1),
    scrollHeight: body.scrollHeight,
    clientHeight: body.clientHeight,
    maxScroll: Math.max(0, body.scrollHeight - body.clientHeight),
    bodyTop: +br.top.toFixed(1), bodyBottom: +br.bottom.toFixed(1),
    sheetTop: +sr.top.toFixed(1), sheetH: +sr.height.toFixed(1),
    title: g('.snl-lesson__title'),
    what: g('.snl-lesson__what'),
    number: g('.snl-lesson__number'),
    name: g('.snl-lesson__name'),
    way: g('.snl-lesson__way'),
    party: g('.snl-lesson__party'),
    deep: g('.snl-lesson__deep'),
    deepText: g('.snl-lesson__deepText'),
    chips: g('.snl-lesson__chips'),
    atEnd: root.classList.contains('is-atEnd'),
    scrolled: root.classList.contains('is-scrolled'),
    fadeT: getComputedStyle(body).getPropertyValue('--fade-t').trim(),
    fadeB: getComputedStyle(body).getPropertyValue('--fade-b').trim(),
  };
};

const results = [];
for (const c of CASES) {
  await page.evaluate(async (n) => { await window.__SNL.jumpTo(n - 1); }, c.sq);
  await page.evaluate(() => window.__SNL.forceRoll(1));
  await sleep(1900);
  const screen = await page.evaluate(() => window.__SNL.screen());
  const hasBtn = await page.evaluate(() =>
    !!document.querySelector('.snl-lesson__more') &&
    getComputedStyle(document.querySelector('.snl-lesson__more')).display !== 'none');
  if (screen !== 'lesson' || !hasBtn) {
    results.push({ ...c, skipped: true, screen, hasBtn });
    await page.evaluate(() => window.__SNL.dismissLesson());
    await sleep(500);
    continue;
  }
  const before = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(OUT, `${TAG}-${c.label}-1before.png`) });
  // REAL TAP on the chevron
  const box = await page.$eval('.snl-lesson__more', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  await page.touchscreen.tap(box.x, box.y);
  await sleep(900);
  const after = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(OUT, `${TAG}-${c.label}-2after.png`) });
  results.push({ ...c, tapBox: box, before, after });
  await page.evaluate(() => window.__SNL.dismissLesson());
  await sleep(600);
}

writeFileSync(join(OUT, `${TAG}-report.json`), JSON.stringify({ results, errs }, null, 2));
for (const r of results) {
  if (r.skipped) { console.log(`${r.label}: SKIPPED (screen=${r.screen} btn=${r.hasBtn})`); continue; }
  const b = r.before, a = r.after;
  console.log(`\n== ${r.label} ==`);
  console.log(` scrollTop  ${b.scrollTop} -> ${a.scrollTop}   (max ${b.maxScroll} -> ${a.maxScroll})  atBottom=${a.scrollTop >= a.maxScroll - 1}`);
  console.log(` sheetH     ${b.sheetH} -> ${a.sheetH}   bodyTop ${b.bodyTop} -> ${a.bodyTop}`);
  for (const k of ['title', 'what', 'number', 'name', 'way', 'party', 'deepText']) {
    const bb = b[k], aa = a[k];
    const f = (o) => o ? `${o.top}..${o.bottom}` : '—';
    let flag = '';
    if (aa && (aa.bottom < a.bodyTop + 1)) flag = ' OFF-TOP';
    else if (aa && aa.top < a.bodyTop - 0.5) flag = ' SLICED-TOP';
    else if (aa && aa.bottom > a.bodyBottom + 0.5) flag = ' SLICED-BOTTOM';
    console.log(`   ${k.padEnd(9)} ${f(bb).padEnd(16)} -> ${f(aa).padEnd(16)}${flag}`);
  }
  console.log(` fade t/b   ${b.fadeT}/${b.fadeB} -> ${a.fadeT}/${a.fadeB}   atEnd ${b.atEnd}->${a.atEnd}`);
}
console.log('\nerrors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
