const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const MODE = process.argv[2] || 'preview';   // preview | full
const OUT = path.join(__dirname, MODE === 'preview' ? 'preview' : 'frames');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu-vsync', '--force-device-scale-factor=1',
           '--allow-file-access-from-files', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'timeline.html'));
  await page.waitForFunction('window.READY === true', { timeout: 120000 });
  const total = await page.evaluate('window.TOTAL');
  console.log('total frames:', total);

  let frames;
  if (MODE === 'preview') {
    // key moments: cold open, tunnel mid/late, hero, phones A/B, wall words, zoom, clips, mosaic, endcard
    frames = [45, 150, 260, 330, 400, 490, 560, 660, 760, 790, 850, 920, 970, 1030, 1090, 1180, 1260, 1330, 1395];
  } else {
    frames = Array.from({ length: total }, (_, i) => i);
  }

  const t0 = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    await page.evaluate(`SEEK(${f})`);
    await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (MODE === 'full' && f % 150 === 0)
      console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  }
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  await browser.close();
})();
