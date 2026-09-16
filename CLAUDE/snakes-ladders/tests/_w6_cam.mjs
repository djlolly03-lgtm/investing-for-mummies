/* _w6_cam.mjs — camera framing + crop audit across devices, at rest and mid-lesson.
   node _w6_cam.mjs --out /tmp/snl-w6-cam [--tag before]                            */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/tmp/snl-w6-cam');
const TAG = arg('tag', 'x');
const URL = 'http://localhost:8791/snakes-ladders/';
mkdirSync(OUT, { recursive: true });

const DEVICES = {
  phone:     { width: 390,  height: 844,  dpr: 3, mobile: true  },
  tablet:    { width: 820,  height: 1180, dpr: 2, mobile: true  },
  desktop:   { width: 1440, height: 900,  dpr: 2, mobile: false },
  projector: { width: 1920, height: 1080, dpr: 1, mobile: false },
};

/* runs in the page: exact projection of every square's four corners */
const MEASURE = async () => {
  const cam = await import('/snakes-ladders/js/camera.js');
  const { CFG } = await import('/snakes-ladders/js/config.js');
  const p = cam.getPose();
  const DEG = Math.PI / 180;
  const B = CFG.board, C = CFG.camera;
  const az = p.azimuthDeg * DEG, el = p.elevationDeg * DEG;
  const bs = cam.basis(az, el);
  const W = window.innerWidth, H = window.innerHeight;
  const aspect = W / H;
  const ty = Math.tan(C.fov * 0.5 * DEG), tx = ty * aspect;
  const [Tx, Ty, Tz] = p.target;
  const d3 = (a, x, y, z) => a[0] * x + a[1] * y + a[2] * z;
  const proj = (x, y, z) => {
    const vx = x - Tx, vy = y - Ty, vz = z - Tz;
    const depth = p.distance + d3(bs.fwd, vx, vy, vz);
    if (depth <= C.near) return null;
    return { nx: d3(bs.right, vx, vy, vz) / (depth * tx),
             ny: d3(bs.up, vx, vy, vz) / (depth * ty) };
  };
  /* square n's four corners on the tile plane */
  const cellRect = (n) => {
    const i = n - 1, row = Math.floor(i / 10);
    let col = i % 10; if (row % 2 === 1) col = 9 - col;
    const x0 = -B.half + B.cell * col, x1 = x0 + B.cell;
    const zN = B.half - B.cell * row, zF = zN - B.cell;
    const y = B.rowRise * row;
    return [[x0, y, zN], [x1, y, zN], [x0, y, zF], [x1, y, zF]];
  };
  let cropped = [], allX0 = 1e9, allX1 = -1e9, allY0 = 1e9, allY1 = -1e9;
  for (let n = 1; n <= 100; n++) {
    let bad = false;
    for (const [x, y, z] of cellRect(n)) {
      const q = proj(x, y, z);
      if (!q) { bad = true; continue; }
      if (Math.abs(q.nx) > 1 || Math.abs(q.ny) > 1) bad = true;
      if (q.nx < allX0) allX0 = q.nx; if (q.nx > allX1) allX1 = q.nx;
      if (q.ny < allY0) allY0 = q.ny; if (q.ny > allY1) allY1 = q.ny;
    }
    if (bad) cropped.push(n);
  }
  const surfW = (allX1 - allX0) / 2, surfH = (allY1 - allY0) / 2;
  return {
    az: +p.azimuthDeg.toFixed(2), el: +p.elevationDeg.toFixed(2),
    dist: +p.distance.toFixed(2), safe: p.safe, aspect: +aspect.toFixed(3),
    heightPct: +(surfH * 100).toFixed(1), widthPct: +(surfW * 100).toFixed(1),
    areaPct: +(surfW * surfH * 100).toFixed(1),
    coverage: +p.coverage.toFixed(3), cropped, nCropped: cropped.length,
  };
};

const rows = [];
for (const [name, D] of Object.entries(DEVICES)) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
           '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=' + D.dpr],
    defaultViewport: { width: D.width, height: D.height, deviceScaleFactor: D.dpr, isMobile: D.mobile, hasTouch: D.mobile },
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.__SNL.ready);
  await page.evaluate(() => window.__SNL.quickStart(2));
  await new Promise(r => setTimeout(r, 1400));
  await page.evaluate(() => window.__SNL.settle());
  await new Promise(r => setTimeout(r, 700));
  const rest = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(OUT, `${TAG}-${name}-rest.png`) });

  /* mid-lesson: drive a real focus move on a right-column square */
  await page.evaluate(async () => {
    const cam = await import('/snakes-ladders/js/camera.js');
    cam.focusCell(70, 400);
  });
  await new Promise(r => setTimeout(r, 900));
  const lesson = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(OUT, `${TAG}-${name}-focus.png`) });

  /* dramatic (ladder) mid-arc */
  await page.evaluate(async () => {
    const cam = await import('/snakes-ladders/js/camera.js');
    cam.dramatic(4, 25, 1200);
  });
  await new Promise(r => setTimeout(r, 700));
  const dram = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(OUT, `${TAG}-${name}-dramatic.png`) });

  /* finish shot */
  await page.evaluate(async () => {
    const cam = await import('/snakes-ladders/js/camera.js');
    await cam.overview(0); await cam.finishShot(400);
  });
  await new Promise(r => setTimeout(r, 700));
  const fin = await page.evaluate(MEASURE);

  rows.push({ device: name, rest, lesson, dramatic: dram, finish: fin, errs });
  console.log(`\n### ${name} ${D.width}x${D.height}`);
  for (const k of ['rest', 'lesson', 'dramatic', 'finish']) {
    const r = { rest, lesson, dramatic: dram, finish: fin }[k];
    console.log(`  ${k.padEnd(9)} el=${String(r.el).padStart(5)} d=${String(r.dist).padStart(5)} ` +
      `h=${String(r.heightPct).padStart(5)}% w=${String(r.widthPct).padStart(5)}% area=${String(r.areaPct).padStart(5)}% ` +
      `cropped=${r.nCropped}${r.nCropped ? ' [' + r.cropped.join(',') + ']' : ''}`);
  }
  if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
  await browser.close();
}
writeFileSync(join(OUT, `${TAG}-report.json`), JSON.stringify(rows, null, 2));
console.log('\nwrote', join(OUT, `${TAG}-report.json`));
