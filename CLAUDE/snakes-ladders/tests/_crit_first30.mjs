/** THROWAWAY hostile FIRST30 driver — real touch taps, cold profile. DELETE AFTER. */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/snl-f30';
const URL = 'http://localhost:8791/snakes-ladders/';
mkdirSync(OUT, { recursive: true });
const W = 390, H = 844, DPR = 3;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
         '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=' + DPR],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true },
});
const ctx = await browser.createBrowserContext(); // clean storage
const page = await ctx.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

let n = 0;
const shot = async (nm) => { const f = `${String(++n).padStart(2, '0')}-${nm}.png`; await page.screenshot({ path: join(OUT, f) }); console.log('  shot ' + f); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const T0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
const domMs = Date.now() - T0;

// wait for setup card
await page.waitForSelector('.snl-setup', { timeout: 30000 });
const cardMs = Date.now() - T0;
await sleep(1200);
await shot('cold-first-screen');

// --- hit test EVERY control with elementFromPoint ---
const hits = await page.evaluate(() => {
  const out = [];
  const sels = ['.snl-setup__go', '.snl-setup__plaque', '.snl-setup__more, .snl-setup__link, a, button'];
  const seen = new Set();
  document.querySelectorAll('.snl-setup button, .snl-setup a, .snl-setup [role="button"], .snl-chip, .snl-setup__go, .snl-setup__plaque').forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    out.push({
      label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 34),
      cls: el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className).slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height), x: Math.round(cx), y: Math.round(cy),
      topEl: top ? (top.tagName + '.' + (String(top.className).slice(0, 30))) : null,
      reachable: !!(top && (el === top || el.contains(top) || top.contains(el))),
    });
  });
  return out;
});

// word count + font sizes
const text = await page.evaluate(() => {
  const card = document.querySelector('.snl-setup');
  const words = (card.innerText || '').trim().split(/\s+/).filter(Boolean);
  const nodes = [];
  const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  let t; while ((t = walk.nextNode())) {
    const s = t.nodeValue.trim(); if (!s) continue;
    const p = t.parentElement, cs = getComputedStyle(p), r = p.getBoundingClientRect();
    nodes.push({ s: s.slice(0, 50), fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily.split(',')[0], color: cs.color, y: Math.round(r.top) });
  }
  const scroll = { sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, cardSH: card.scrollHeight, cardCH: card.clientHeight };
  return { count: words.length, words: words.join(' '), nodes, scroll };
});

// veil / board visibility
const veil = await page.evaluate(() => {
  const v = document.querySelector('.snl-setup__veil');
  if (!v) return null;
  const cs = getComputedStyle(v);
  return { bg: cs.background.slice(0, 220), filter: cs.backdropFilter || cs.webkitBackdropFilter, op: cs.opacity };
});

// TAP 1 — real touch tap on the primary
const goBox = await page.evaluate(() => { const e = document.querySelector('.snl-setup__go'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
const tap1 = Date.now();
await page.touchscreen.tap(goBox.x, goBox.y);
await sleep(400); await shot('after-tap1-400ms');
await sleep(1200); await shot('after-tap1-1600ms');
await sleep(1800); await shot('after-tap1-3400ms');

const stateAfter1 = await page.evaluate(() => ({
  setupPresent: !!document.querySelector('.snl-setup'),
  setupClass: document.querySelector('.snl-setup')?.className || null,
  linePresent: !!document.querySelector('.snl-setup__line'),
  lineText: document.querySelector('.snl-setup__line')?.innerText?.slice(0, 200) || null,
  uiPresent: !!document.querySelector('.snl-ui'),
  rollLabel: document.querySelector('.snl-ui__roll')?.innerText || null,
  banner: document.querySelector('.snl-ui__banner')?.innerText || null,
  handoff: !!document.querySelector('.snl-handoff'),
  handoffText: document.querySelector('.snl-handoff')?.innerText || null,
}));

// wait for roll to be reachable, then TAP 2
let rollReady = false, waitMs = 0;
while (waitMs < 12000) {
  rollReady = await page.evaluate(() => {
    const e = document.querySelector('.snl-ui__roll'); if (!e) return false;
    const r = e.getBoundingClientRect(); if (!r.width) return false;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!(top && (e === top || e.contains(top)));
  });
  if (rollReady) break;
  await sleep(200); waitMs += 200;
}
const rollReadyAtMs = Date.now() - T0;
await shot('board-live');

// measure the dice idle pulse + board framing on the live board
const framing = await page.evaluate(() => {
  const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
  const roll = document.querySelector('.snl-ui__roll'); const rr = roll?.getBoundingClientRect();
  const cs = roll ? getComputedStyle(roll) : null;
  return { canvas: { w: Math.round(r.width), h: Math.round(r.height) }, roll: rr ? { w: Math.round(rr.width), h: Math.round(rr.height), y: Math.round(rr.top), bg: cs.backgroundColor, fs: cs.fontSize } : null };
});

// TAP 2 — real touch on roll
let tapsToRoll = 1;
if (rollReady) {
  const rb = await page.evaluate(() => { const r = document.querySelector('.snl-ui__roll').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const t2 = Date.now();
  await page.touchscreen.tap(rb.x, rb.y);
  tapsToRoll = 2;
  await sleep(500); await shot('rolling-500ms');
  await sleep(900); await shot('rolled-1400ms');
  await sleep(2000); await shot('after-move');
  console.log('  roll tap->1400ms captured');
}
const totalMs = Date.now() - T0;

console.log(JSON.stringify({ domMs, cardMs, rollReadyAtMs, totalMs, tapsToRoll, goBox, framing, veil, wordCount: text.count, words: text.words, scroll: text.scroll, stateAfter1, hits, nodes: text.nodes, errs }, null, 2));
await browser.close();
