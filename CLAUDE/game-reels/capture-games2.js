// Capture a 2nd (gameplay / payoff) screen for each single-HTML game
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const OUT = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels/shots';
const BASE = 'http://localhost:7799/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clickText(page, t) {
  return await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button,a,[role=button]')].find(x => x.innerText && x.innerText.includes(t));
    if (b) { b.click(); return true; }
    return false;
  }, t);
}

const JOBS = [
  { key:'bbf',      file:'bbf.html',              steps:[['START THE MONTH',2800]] },
  { key:'nwv',      file:'nwv.html',              steps:[["Let's go",1800]] },
  { key:'buckets',  file:'3-buckets.html',        steps:[['Start Sorting',1800]] },
  { key:'hidden',   file:'hidden-fortunes-2.html',steps:[['Reveal My Hidden Fortune',3000]] },
  { key:'fundgoal', file:'fundgoal.html',         steps:[['See Cost of Delay',1600]] },
];

(async () => {
  const browser = await puppeteer.launch({
    headless:'new',
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{ width:430, height:780, deviceScaleFactor:2 },
  });
  for (const j of JOBS) {
    try {
      const page = await browser.newPage();
      await page.goto(BASE + j.file, { waitUntil:'networkidle2', timeout:60000 });
      await sleep(2500);
      for (const [txt,wait] of j.steps) { const ok = await clickText(page, txt); await sleep(wait); console.log(j.key, 'click', txt, ok); }
      await page.screenshot({ path:`${OUT}/${j.key}_2.png` });
      console.log(j.key, '2nd shot saved');
      await page.close();
    } catch(e){ console.log(j.key, 'ERR', e.message); }
  }
  await browser.close();
  console.log('DONE');
})();
