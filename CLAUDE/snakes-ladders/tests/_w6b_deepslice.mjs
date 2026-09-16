/* _w6b_deepslice.mjs — does "Aur padho" move the reader, and is anything sliced?
   Real taps on the real chevron. Measures the scroll offset, the boxes of the
   title / number / term chip / mint escape band, and decodes the screenshot to
   look for a hard horizontal cut through a line of type under the pinned title.

   node _w6b_deepslice.mjs --out /tmp/snl-w6-teach --tag before [--scale 1] */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/tmp/snl-w6-teach');
const TAG = arg('tag', 'x');
const SCALE = Number(arg('scale', '1'));
const URL = 'http://localhost:8791/snakes-ladders/';
const DSF = 3;
mkdirSync(OUT, { recursive: true });

/* ── the smallest PNG reader that answers "is there a hard cut here" ─────── */
function readPng(path) {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, bitDepth = 8, colorType = 6;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth);
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.subarray(q, q + stride); q += stride;
    const cur = out.subarray(y * stride, y * stride + stride);
    const prev = y ? out.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = (prev && x >= ch) ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

/** Mean "ink" per row (0 = bare cream, 255 = solid navy) across an x range. */
function rowInk(png, x0, x1, y0, y1) {
  const rows = [];
  for (let y = y0; y < y1; y++) {
    let sum = 0, n = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * png.w + x) * png.ch;
      const lum = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
      sum += Math.max(0, 247 - lum); n++;
    }
    rows.push(+(sum / Math.max(1, n)).toFixed(2));
  }
  return rows;
}

const CASES = [
  { sq: 24, label: 'lesson-24' },
  { sq: 35, label: 'lesson-35' },
  { sq: 27, label: 'snake-27' },
  { sq: 10, label: 'milestone-10' },
  { sq: 76, label: 'lesson-76' },
  { sq: 43, label: 'sq-43' },
  { sq: 58, label: 'sq-58' },
  { sq: 88, label: 'sq-88' },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars',
         '--mute-audio', '--autoplay-policy=no-user-gesture-required',
         '--force-device-scale-factor=3'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: DSF, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('[err] ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle2' });
await page.evaluate(() => window.__SNL.ready);
await page.evaluate(() => window.__SNL.quickStart(2));
if (SCALE !== 1) await page.evaluate((s) => document.documentElement.style.setProperty('--snl-text-scale', String(s)), SCALE);
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
  const deep = root.querySelector('.snl-lesson__deep');
  let deepVisible = 0;
  if (deep && !deep.hidden) {
    const d = deep.getBoundingClientRect();
    deepVisible = +Math.max(0, Math.min(d.bottom, br.bottom) - Math.max(d.top, br.top)).toFixed(1);
  }
  return {
    scrollTop: +body.scrollTop.toFixed(1),
    scrollHeight: body.scrollHeight, clientHeight: body.clientHeight,
    maxScroll: Math.max(0, body.scrollHeight - body.clientHeight),
    bodyTop: +br.top.toFixed(1), bodyBottom: +br.bottom.toFixed(1),
    sheetTop: +sr.top.toFixed(1), sheetH: +sr.height.toFixed(1),
    title: g('.snl-lesson__title'), what: g('.snl-lesson__what'),
    number: g('.snl-lesson__number'), name: g('.snl-lesson__name'),
    way: g('.snl-lesson__way'), party: g('.snl-lesson__party'),
    chip: g('.snl-lesson__chip'), deep: g('.snl-lesson__deep'),
    deepText: g('.snl-lesson__deepText'), deepVisible,
    atEnd: root.classList.contains('is-atEnd'),
    scrolled: root.classList.contains('is-scrolled'),
  };
};

const results = [];
for (const c of CASES) {
  await page.evaluate(async (n) => { await window.__SNL.jumpTo(n - 1); }, c.sq);
  await page.evaluate(() => window.__SNL.forceRoll(1));
  await sleep(1900);
  const screen = await page.evaluate(() => window.__SNL.screen());
  const hasBtn = await page.evaluate(() => {
    const b = document.querySelector('.snl-lesson__more');
    return !!b && getComputedStyle(b).display !== 'none';
  });
  if (screen !== 'lesson' || !hasBtn) {
    results.push({ ...c, skipped: true, screen, hasBtn });
    await page.evaluate(() => window.__SNL.dismissLesson());
    await sleep(500);
    continue;
  }
  const before = await page.evaluate(MEASURE);
  const box = await page.$eval('.snl-lesson__more', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.touchscreen.tap(box.x, box.y);
  await sleep(1000);
  const after = await page.evaluate(MEASURE);
  const shot = join(OUT, `${TAG}-s${SCALE}-${c.label}-after.png`);
  await page.screenshot({ path: shot });

  /* the top-edge cut test: 34px of rows immediately under the pinned title,
     across the text column only (skip the "Close this" chip on the right). */
  let cut = null;
  if (after && after.title) {
    const png = readPng(shot);
    const y0 = Math.round(after.title.bottom * DSF);
    const rows = rowInk(png, Math.round(40 * DSF), Math.round(250 * DSF), y0, Math.min(png.h, y0 + 34 * DSF));
    let maxJump = 0, at = 0;
    for (let i = 1; i < rows.length; i++) {
      const d = rows[i] - rows[i - 1];
      if (d > maxJump) { maxJump = +d.toFixed(2); at = i; }
    }
    cut = { maxJump, atPxBelowTitle: +(at / DSF).toFixed(1), peakInk: Math.max(...rows) };
  }
  results.push({ ...c, before, after, cut });
  await page.evaluate(() => window.__SNL.dismissLesson());
  await sleep(600);
}

writeFileSync(join(OUT, `${TAG}-s${SCALE}-slice.json`), JSON.stringify({ results, errs }, null, 2));
for (const r of results) {
  if (r.skipped) { console.log(`${r.label}: SKIPPED (screen=${r.screen})`); continue; }
  const b = r.before, a = r.after;
  const off = (k) => {
    const o = a[k]; if (!o) return '—';
    if (o.bottom < a.bodyTop + 1) return `${o.top}..${o.bottom} OFF-TOP`;
    if (o.top < a.bodyTop - 0.5) return `${o.top}..${o.bottom} CUT-TOP`;
    return `${o.top}..${o.bottom}`;
  };
  console.log(`\n== ${r.label} == scrollTop ${b.scrollTop} -> ${a.scrollTop} / max ${a.maxScroll}` +
    `  bottom=${a.scrollTop >= a.maxScroll - 1}  deepVisible ${b.deepVisible} -> ${a.deepVisible}`);
  console.log(`   sheetH ${b.sheetH}->${a.sheetH}  title ${off('title')}  number ${off('number')}` +
    `  way ${off('way')}  chip ${off('chip')}`);
  if (r.cut) console.log(`   top-edge cut: maxRowJump ${r.cut.maxJump} at +${r.cut.atPxBelowTitle}px (peak ink ${r.cut.peakInk})`);
}
console.log('\nerrors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
