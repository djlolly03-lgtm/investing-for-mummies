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
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'timeline2.html'));
  await page.waitForFunction('window.READY === true', { timeout: 180000 });
  const total = await page.evaluate('window.TOTAL');
  console.log('total frames:', total);

  let frames;
  if (MODE === 'preview') {
    // S1 title / S2 collage build+full / S3 half A + half B / S4 clips / S5 words / S6 clip A+B / S7 ring + card
    frames = [362, 370, 600, 610, 766, 776, 970, 980, 1184, 1194, 1330, 1370, 1379, 1382, 12];
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
