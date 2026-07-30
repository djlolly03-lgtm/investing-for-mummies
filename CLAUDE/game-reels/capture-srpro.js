// Capture REAL Stock Rush PRO host board + player view (served from site root so /stock-rush-pro/ paths resolve)
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const BASE = 'http://localhost:7799/stock-rush-pro/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function click(page,t){ return await page.evaluate((t)=>{const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>x.innerText&&x.innerText.includes(t)); if(b){b.click();return true;} return false;}, t); }

(async () => {
  const browser = await puppeteer.launch({ headless:'new',
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{ width:430, height:900, deviceScaleFactor:2 } });

  // HOST -> live board
  const h = await browser.newPage();
  await h.goto(`${BASE}?role=host`, {waitUntil:'networkidle2', timeout:60000});
  await sleep(3500);
  await click(h,'Start a fresh game'); await sleep(1600);
  await click(h,'Go Live'); await sleep(2200);
  await click(h,'just bots'); await sleep(5000);
  await h.screenshot({path:`${OUT}/srpro_host.png`}); console.log('srpro_host saved');
  // read room code for player join
  const room = await h.evaluate(()=>{ const m=document.body.innerText.match(/\b[A-Z]{3,5}\b/g)||[]; const stop=['HOST','LIVE','PAUSE','FORCE','JOIN','SR','PRO','QR','BOT','ROUND']; return (m.find(x=>!stop.includes(x))||''); });
  console.log('room code:', room);

  // PLAYER -> join + trade
  const p = await browser.newPage();
  await p.goto(`${BASE}?role=player`, {waitUntil:'networkidle2', timeout:60000});
  await sleep(3000);
  try {
    const codeInput = await p.$('input');
    if (codeInput && room) {
      const inputs = await p.$$('input');
      await inputs[0].type(room);
      if (inputs[1]) await inputs[1].type('Aanya');
      await sleep(500);
      await click(p,'Join'); await sleep(2500);
      await click(p,'let me play') || await click(p,'Got it') || await click(p,'play'); await sleep(2000);
    }
  } catch(e){ console.log('join flow note:', e.message); }
  await p.screenshot({path:`${OUT}/srpro_player.png`}); console.log('srpro_player saved');

  await browser.close(); console.log('DONE');
})().catch(e=>{ console.error('FAIL', e.message); process.exit(1); });
