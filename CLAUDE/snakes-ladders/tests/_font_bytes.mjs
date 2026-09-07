/* _font_bytes.mjs — what does the font change actually cost on the wire? */
import puppeteer from 'puppeteer';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'en');
const URL = 'http://localhost:8791/snakes-ladders/';

const browser = await puppeteer.launch({ headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
const page = await browser.newPage();
const OLD = process.argv.includes('--old');
if (OLD) {                       // measure the pre-fix stack without touching the file
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (u.startsWith('https://fonts.googleapis.com/css2')) {
      return r.continue({ url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@1,600&display=swap' });
    }
    r.continue();
  });
}
const rows = [];
page.on('response', async r => {
  const u = r.url();
  if (!/fonts\.(gstatic|googleapis)\.com/.test(u)) return;
  let n = 0; try { n = (await r.buffer()).length; } catch {}
  rows.push({ u, n, ct: r.headers()['content-type'] || '' });
});
await page.evaluateOnNewDocument(l => { try { localStorage.setItem('snl.lang', l); } catch {} }, LANG);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
try { await page.evaluate(() => window.__SNL && window.__SNL.ready); } catch {}
await new Promise(r => setTimeout(r, 2500));
if (LANG === 'hi') {
  try { await page.evaluate(async () => { const A = window.__SNL; await A.quickStart(2); await A.jumpTo(2); await A.forceRoll(1); }); } catch (e) { console.log('drive: ' + e.message); }
  try { await page.evaluate(() => Promise.race([window.__SNL?.settle?.(), new Promise(r => setTimeout(r, 12000))])); } catch {}
  await new Promise(r => setTimeout(r, 1500));
}
const total = rows.reduce((s, r) => s + r.n, 0);
console.log('lang=' + LANG + '  requests=' + rows.length + '  bytes=' + total + ' (' + (total / 1024).toFixed(1) + ' KB)');
for (const r of rows.sort((a, b) => b.n - a.n)) console.log('  ' + String(r.n).padStart(7) + '  ' + r.u.replace('https://fonts.gstatic.com/s/', '').slice(0, 90));
await browser.close();
