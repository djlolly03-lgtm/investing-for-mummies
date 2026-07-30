// Capture folder games: Stock Rush PRO, Swayamvar (host+player), Wealth Conversation (landing)
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function click(page, t){ return await page.evaluate((t)=>{const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>x.innerText&&x.innerText.includes(t)); if(b){b.click();return true;} return false;}, t); }

(async () => {
  const browser = await puppeteer.launch({ headless:'new',
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{ width:460, height:900, deviceScaleFactor:2 } });

  // ---- Stock Rush PRO host (live board) ----
  try {
    const h = await browser.newPage();
    await h.goto('http://localhost:7803/?role=host', {waitUntil:'networkidle2', timeout:60000});
    await sleep(2800);
    await click(h,'Start a fresh game'); await sleep(1600);
    await click(h,'Go Live'); await sleep(2200);
    await click(h,'just bots'); await sleep(5000);
    await h.screenshot({path:`${OUT}/srpro_host.png`}); console.log('srpro_host');
    await h.close();
  } catch(e){ console.log('srpro_host ERR', e.message); }
  // ---- Stock Rush PRO player (join screen) ----
  try {
    const p = await browser.newPage();
    await p.goto('http://localhost:7803/?role=player', {waitUntil:'networkidle2', timeout:60000});
    await sleep(2600);
    await p.screenshot({path:`${OUT}/srpro_player.png`}); console.log('srpro_player');
    await p.close();
  } catch(e){ console.log('srpro_player ERR', e.message); }

  // ---- Swayamvar host + player ----
  for (const [role,name] of [['host','swayamvar_host'],['player','swayamvar_player']]) {
    try {
      const pg = await browser.newPage();
      await pg.goto(`http://localhost:7802/?role=${role}`, {waitUntil:'networkidle2', timeout:60000});
      await sleep(3000);
      // try to advance past a landing CTA
      await click(pg,'Begin') || await click(pg,'Start') || await click(pg,'Go Live') || await click(pg,'Host') || await click(pg,'Join');
      await sleep(2500);
      await pg.screenshot({path:`${OUT}/${name}.png`}); console.log(name);
      await pg.close();
    } catch(e){ console.log(name,'ERR', e.message); }
  }

  // ---- Wealth Conversation landing ----
  try {
    const w = await browser.newPage();
    await w.goto('http://localhost:7804/', {waitUntil:'networkidle2', timeout:60000});
    await sleep(2500);
    await w.screenshot({path:`${OUT}/wealth_1.png`}); console.log('wealth_1');
    await w.close();
  } catch(e){ console.log('wealth ERR', e.message); }

  await browser.close(); console.log('DONE');
})();
