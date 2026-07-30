// Render LTM overlay frames -> transparent PNGs (end card opaque)
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const URL = 'http://localhost:7799/game-reels/ltm-overlays.html';
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless:'new',
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{ width:1080, height:1920, deviceScaleFactor:1 } });
  const p = await b.newPage();
  await p.goto(URL, { waitUntil:'networkidle2', timeout:60000 });
  await sleep(1500);
  for (const id of ['o_hook','o_b2','o_b3','o_b4']) {
    const el = await p.$('#'+id);
    await el.screenshot({ path:`${OUT}/${id}.png`, omitBackground:true });
    console.log('overlay', id);
  }
  const endEl = await p.$('#o_end');
  await endEl.screenshot({ path:`${OUT}/o_end.png` }); // opaque
  console.log('end card');
  await b.close(); console.log('DONE');
})().catch(e=>{ console.error('FAIL', e.message); process.exit(1); });
