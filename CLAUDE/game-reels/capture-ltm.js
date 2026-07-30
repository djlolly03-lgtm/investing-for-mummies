// Capture Lifestyle Time Machine game screens -> PNGs on disk
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const BASE = 'http://localhost:7799/lifestyle-time-machine.html';
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clickText(page, t) {
  return await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText && x.innerText.includes(t));
    if (b) { b.click(); return true; }
    return false;
  }, t);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/ltm_hero.png` });
  console.log('hero saved');

  await clickText(page, 'Begin Round 1');
  await sleep(1500);
  // pick a few dreams
  await page.evaluate(() => { ['japan','study','car','lv','cafes','shopping'].forEach(id => { try { window.toggleItem && window.toggleItem(id); } catch(e){} }); });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ltm_dreams.png` });
  console.log('dreams saved');

  // advance all students, then to Round 2 reveal
  for (let s = 0; s < 6; s++) {
    await page.evaluate(() => { ['japan','car','lv','cafes','shopping'].forEach(id => { try { window.toggleItem && window.toggleItem(id); } catch(e){} }); });
    const ok = await clickText(page, 'Next Student');
    await sleep(500);
    if (!ok) break;
  }
  await clickText(page, 'Confirm');
  await sleep(400);
  await clickText(page, '5 Years Later') || await clickText(page, 'Round 2');
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/ltm_reveal.png` });
  console.log('reveal saved');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
