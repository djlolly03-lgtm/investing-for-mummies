// Capture landing/hero of single-HTML games + log their buttons
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:7799/';

const GAMES = [
  { key: 'moneymap',  file: 'moneymap_wp_snippet.html' },
  { key: 'bbf',       file: 'bbf.html' },
  { key: 'nwv',       file: 'nwv.html' },
  { key: 'buckets',   file: '3-buckets.html' },
  { key: 'hidden',    file: 'hidden-fortunes-2.html' },
  { key: 'fundgoal',  file: 'fundgoal.html' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 430, height: 780, deviceScaleFactor: 2 },
  });
  for (const g of GAMES) {
    try {
      const page = await browser.newPage();
      await page.goto(BASE + g.file, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2800);
      await page.screenshot({ path: `${OUT}/${g.key}_1.png` });
      const info = await page.evaluate(() => ({
        title: document.title,
        h: document.body.scrollHeight,
        buttons: [...document.querySelectorAll('button,a.btn,[role=button]')].map(b => b.innerText.trim().slice(0,30)).filter(Boolean).slice(0,12),
      }));
      console.log(g.key, '=>', JSON.stringify(info));
      await page.close();
    } catch (e) { console.log(g.key, 'ERR', e.message); }
  }
  await browser.close();
  console.log('DONE');
})();
