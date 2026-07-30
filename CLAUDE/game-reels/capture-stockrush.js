// Capture real teacher (host) + student (player) screens for Stock Rush -> PNGs on disk
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');

const BASE = 'http://localhost:7801';
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clickByText(page, txt) {
  const handle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button, a, [role=button]')];
    return els.find(e => e.innerText && e.innerText.toLowerCase().includes(t.toLowerCase())) || null;
  }, txt);
  const el = handle.asElement();
  if (el) { await el.click(); return true; }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  });

  // ---- HOST (teacher) ----
  const host = await browser.newPage();
  await host.goto(`${BASE}/?role=host`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);
  // handle "existing game detected" -> fresh
  await clickByText(host, 'Start a fresh game').catch(()=>{});
  await sleep(1800);
  // pre-live intro -> Go Live
  await clickByText(host, 'Go Live').catch(()=>{});
  await sleep(2500);
  // lobby -> start with bots so the board populates & round timer runs
  await clickByText(host, 'just bots').catch(()=>{});
  await sleep(5000); // let bots trade a few moves while round is LIVE
  await host.screenshot({ path: `${OUT}/stockrush_host.png` });
  console.log('saved host board');

  // ---- PLAYER (student) ----
  const player = await browser.newPage();
  await player.goto(`${BASE}/?role=player`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);
  await player.type('input[placeholder="ABCD"]', 'TEEN');
  await player.type('input[placeholder="e.g. Sam"]', 'Priya');
  await sleep(500);
  await clickByText(player, 'Join game');
  await sleep(2500);
  await clickByText(player, 'let me play');
  await sleep(2000);
  // capture the clean trade list (live round, stock list + BUY buttons)
  await player.screenshot({ path: `${OUT}/stockrush_player.png` });
  console.log('saved player view');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
