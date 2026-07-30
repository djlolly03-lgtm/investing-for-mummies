// Render reel frames (1080x1920) to PNG via the static server
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const URL = 'http://localhost:7799/game-reels/reel-frames.html';
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500); // fonts + images
  for (const id of ['f1', 'f2', 'f3', 'f4']) {
    const el = await page.$('#' + id);
    await el.screenshot({ path: `${OUT}/frame_${id}.png` });
    console.log('rendered', id);
  }
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
