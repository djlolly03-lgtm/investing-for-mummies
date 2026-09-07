/* fontaudit.mjs — what face do Devanagari runs ACTUALLY get?
   Drives the real UI in Hindi with real taps, then asks Chrome
   (CSS.getPlatformFontsForNode) which platform font it really used. */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/tmp/snl-fonts');
const URL = arg('url', 'http://localhost:8791/snakes-ladders/');
const DPR = Number(arg('dpr', 3));
mkdirSync(OUT, { recursive: true });

const DEVA = /[ऀ-ॿ]/;
const out = { url: URL, dpr: DPR, stages: [], errors: [] };

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
         '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=' + DPR],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: DPR, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
page.on('pageerror', e => out.errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => out.errors.push('REQFAIL ' + r.url()));

await page.evaluateOnNewDocument(() => { try { localStorage.setItem('snl.lang', 'hi'); } catch {} });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
try { await page.evaluate(() => window.__SNL && window.__SNL.ready); } catch {}
await new Promise(r => setTimeout(r, 900));

const cdp = await page.createCDPSession();
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Mark every element whose OWN text has a Devanagari glyph, then ask CDP. */
async function audit(stage) {
  const marked = await page.evaluate(() => {
    const D = /[ऀ-ॿ]/;
    document.querySelectorAll('[data-fa]').forEach(e => e.removeAttribute('data-fa'));
    let n = 0; const rows = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      const s = (t.nodeValue || '').trim();
      if (!s || !D.test(s)) continue;
      const el = t.parentElement; if (!el || seen.has(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      let p = el, vis = true;
      while (p) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) { vis = false; break; } p = p.parentElement; }
      if (!vis) continue;
      seen.add(el);
      const id = 'fa' + (n++);
      el.setAttribute('data-fa', id);
      const cs = getComputedStyle(el);
      rows.push({ id, text: s.slice(0, 46), cls: el.className && el.className.toString().slice(0, 40),
        family: cs.fontFamily, weight: cs.fontWeight, style: cs.fontStyle, size: cs.fontSize });
    }
    return rows;
  });
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  for (const row of marked) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-fa="${row.id}"]` });
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      row.usedFonts = fonts.map(f => `${f.familyName}${f.isCustomFont ? '' : ' (SYSTEM)'} x${f.glyphCount}`);
    } catch (e) { row.usedFonts = ['ERR ' + e.message]; }
  }
  const checks = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    noto400: document.fonts.check('400 16px "Noto Sans Devanagari"', 'हिसाब'),
    noto700: document.fonts.check('700 16px "Noto Sans Devanagari"', 'हिसाब'),
    martel600: document.fonts.check('600 16px "Martel"', 'हिसाब'),
    martel400: document.fonts.check('400 16px "Martel"', 'हिसाब'),
    nunito700: document.fonts.check('700 16px "Nunito"'),
    loraIt600: document.fonts.check('italic 600 16px "Lora"'),
    loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.style} ${f.weight}`),
  }));
  out.stages.push({ stage, checks, rows: marked });
  console.log(`\n=== ${stage} === lang=${checks.lang}`);
  console.log('  fonts.check:', JSON.stringify(checks, (k, v) => k === 'loaded' ? undefined : v));
  console.log('  loaded faces:', [...new Set(checks.loaded)].join(' | ') || '(none)');
  for (const r of marked) console.log(`  · "${r.text}"\n      stack=${r.family}\n      w=${r.weight} style=${r.style} size=${r.size}  USED=${(r.usedFonts || []).join(', ')}`);
  return marked;
}

const shot = async (name) => { const f = join(OUT, name + '.png'); await page.screenshot({ path: f }); console.log('  shot ' + f); };

/* ── drive the real UI ─────────────────────────────────────────── */
const tapText = async (re, label) => {
  const hit = await page.evaluate((src, label) => {
    const rx = new RegExp(src);
    const els = [...document.querySelectorAll('button,[role="button"],a,label,.snl-setup__opt,[tabindex]')];
    const el = els.reverse().find(e => rx.test((e.innerText || e.textContent || '').trim()) && e.getBoundingClientRect().width > 4);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: (el.innerText || '').trim().slice(0, 30) };
  }, re.source, label);
  if (!hit) { console.log(`  ! no tap target for ${label} (${re})`); return false; }
  await page.mouse.click(hit.x, hit.y);
  console.log(`  tap ${label} -> "${hit.t}"`);
  await sleep(700);
  return true;
};

await audit('01-setup');
await shot('01-setup');

// start the game: whatever the primary CTA is
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean); console.log(b.join(' | ')); });
const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean));
console.log('  buttons on setup:', JSON.stringify(btns));
await tapText(/शुरू|खेल|चलो|Start|Play/, 'start');
await sleep(1600);
await audit('02-board');
await shot('02-board');

/* land on square 3 (the first ladder) so a real Hindi lesson card renders */
try {
  await page.evaluate(async () => {
    const A = window.__SNL;
    await A.jumpTo(2);
    await A.forceRoll(1);
  });
} catch (e) { console.log('  ! forceRoll: ' + e.message); }
try { await page.evaluate(() => Promise.race([window.__SNL?.settle?.(), new Promise(r => setTimeout(r, 12000))])); } catch {}
await sleep(1200);
console.log('  screen =', await page.evaluate(() => window.__SNL?.screen?.()));

await sleep(500);
await audit('03-lesson');
await shot('03-lesson');

writeFileSync(join(OUT, 'fonts.json'), JSON.stringify(out, null, 2));
console.log('\nerrors:', out.errors.slice(0, 8));
await browser.close();
