/* _eg_win.mjs — drive a REAL 2-player game to a REAL finish, then measure the
   victory frame: where the plate sits over the board, and how much confetti is
   actually on screen.

   Confetti is counted by pixel diff: shot A2 (flakes aloft) minus shot B (the
   same frame with fx.clearFx() called). A1 vs A2, 150ms apart with nothing
   changed, is the control — the renderer's own frame-to-frame noise.

     node _eg_win.mjs --out DIR [--seed 7] [--mode full|toast]                */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/tmp/snl-w6');
const SEED = Number(arg('seed', '7'));
const MODE = arg('mode', 'full');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=2'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
const errs = [];
p.on('pageerror', e => errs.push(String(e.message)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('http://localhost:8791/snakes-ladders/', { waitUntil: 'networkidle2', timeout: 120000 });
await p.evaluate(() => window.__SNL.ready);
const settle = async (t = 20000) => { try { await p.evaluate(t => Promise.race([window.__SNL?.settle?.(), new Promise(r => setTimeout(r, t))]), t); } catch {} await sleep(90); };
const arrival = () => p.evaluate(() => !!document.querySelector('.snl-end__arrival'));

await p.evaluate(() => window.__SNL.quickStart(2));
await settle();

let turns = 0;
if (MODE === 'toast') {
  /* the round-1 finding, reproduced exactly: a snackbar from the turn loop is
     still up when the winner lands. */
  await p.evaluate(() => window.__SNL.jumpTo(94));
  await settle();
  await p.evaluate(async () => {
    const U = await import('/snakes-ladders/js/ui.js');
    U.toast('Bura Waqt Fund ne aapko ek baar bachaya.', 12000);
  });
  p.evaluate(() => window.__SNL.forceRoll(6));
} else {
  let rng = SEED >>> 0 || 1;
  const next = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return 1 + (rng % 6); };
  while (turns < 400) {
    const s = await p.evaluate(() => { const s = window.__SNL.state(); return { over: s.over }; });
    if (s.over) break;
    p.evaluate(n => window.__SNL.forceRoll(n), next()).catch(() => {});
    await settle();
    if (await arrival()) break;
    const txt = await p.evaluate(() => window.__SNL.lessonText());
    if (txt) { await p.evaluate(() => window.__SNL.dismissLesson()); await settle(); }
    turns++;
  }
}
for (let i = 0; i < 400 && !(await arrival()); i++) await sleep(40);

const geom = await p.evaluate(async () => {
  const S = await import('/snakes-ladders/js/scene.js');
  const B = await import('/snakes-ladders/js/board3d.js');
  const FX = await import('/snakes-ladders/js/fx.js');
  const cam = S.getCamera();
  const W = innerWidth, H = innerHeight;
  const proj = (v) => {
    const e = cam.matrixWorldInverse.elements, q = cam.projectionMatrix.elements;
    const cx = e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12];
    const cy = e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13];
    const cz = e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14];
    const cw = e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15];
    const x = q[0] * cx + q[4] * cy + q[8] * cz + q[12] * cw;
    const y = q[1] * cx + q[5] * cy + q[9] * cz + q[13] * cw;
    const w = q[3] * cx + q[7] * cy + q[11] * cz + q[15] * cw;
    return { x: (x / w * 0.5 + 0.5) * W, y: (-y / w * 0.5 + 0.5) * H };
  };
  const cells = {};
  for (let n = 1; n <= 100; n++) cells[n] = proj(B.cellToWorld(n));
  const corners = [{ x: -5, y: 0, z: -5 }, { x: 5, y: 0, z: -5 }, { x: 5, y: 0, z: 5 }, { x: -5, y: 0, z: 5 }].map(proj);
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const ut = document.querySelector('.snl-ui__toast');
  return {
    W, H, cells, corners,
    plate: r(document.querySelector('.snl-end__plate')),
    go: r(document.querySelector('.snl-end__go')),
    uiToast: ut ? { on: ut.classList.contains('is-on'), text: ut.textContent, rect: r(ut), opacity: getComputedStyle(ut).opacity } : null,
    fx: FX.fxStats(),
    state: (() => { const s = window.__SNL.state(); return { over: s.over, players: (s.players || []).map(x => ({ n: x.name, pos: x.pos })) }; })(),
  };
});

await p.screenshot({ path: join(OUT, 'victory.png') });
await p.evaluate(() => document.querySelector('.snl-end__bloom')?.remove());
await sleep(60);
const A1 = await p.screenshot({ encoding: 'base64' });
await sleep(120);
const A2 = await p.screenshot({ encoding: 'base64' });
const stillA = await arrival();
await p.evaluate(async () => { const FX = await import('/snakes-ladders/js/fx.js'); FX.clearFx(); });
await sleep(140);
const stillB = await arrival();
const B64 = await p.screenshot({ encoding: 'base64' });

const diff = await p.evaluate(async (a, b2, c3) => {
  const load = (d) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
  const [ia, ib, ic] = await Promise.all([load(a), load(b2), load(c3)]);
  const w = ia.width, h = ia.height;
  const px = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const da = px(ia), db = px(ib), dc = px(ic);
  const run = (u, v) => {
    const mask = new Uint8Array(w * h); let n = 0;
    for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
      const d = Math.abs(u[j] - v[j]) + Math.abs(u[j + 1] - v[j + 1]) + Math.abs(u[j + 2] - v[j + 2]);
      if (d > 90) { mask[i] = 1; n++; }
    }
    const seen = new Uint8Array(w * h), st = new Int32Array(w * h), blobs = [];
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      let sp = 0; st[sp++] = i; seen[i] = 1;
      let cnt = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
      while (sp) {
        const k = st[--sp]; cnt++;
        const x = k % w, y = (k - x) / w;
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const m = ny * w + nx;
          if (mask[m] && !seen[m]) { seen[m] = 1; st[sp++] = m; }
        }
      }
      if (cnt >= 8) blobs.push({ cnt, x: Math.round((minx + maxx) / 2), y: Math.round((miny + maxy) / 2) });
    }
    return { mask, pixels: n, blobs };
  };
  const noise = run(da, db);
  const sig = run(db, dc);
  /* paint the signal mask over A2 so a human can see where the confetti is */
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(ib, 0, 0);
  const im = x.getImageData(0, 0, w, h);
  for (let i = 0, j = 0; i < sig.mask.length; i++, j += 4) {
    if (sig.mask[i]) { im.data[j] = 255; im.data[j + 1] = 0; im.data[j + 2] = 255; }
  }
  x.putImageData(im, 0, 0);
  return {
    w, h,
    noisePixels: noise.pixels, noiseBlobs: noise.blobs.length,
    sigPixels: sig.pixels, sigBlobs: sig.blobs.length,
    list: sig.blobs.sort((m, n) => n.cnt - m.cnt).slice(0, 120),
    overlay: c.toDataURL('image/png').split(',')[1],
  };
}, A1, A2, B64);

writeFileSync(join(OUT, 'A2.png'), Buffer.from(A2, 'base64'));
writeFileSync(join(OUT, 'B.png'), Buffer.from(B64, 'base64'));
writeFileSync(join(OUT, 'confetti-mask.png'), Buffer.from(diff.overlay, 'base64'));
delete diff.overlay;

/* let the arrival hand over, then look at the sheet + the stale snackbar */
await sleep(2200);
const after = await p.evaluate(() => {
  const ut = document.querySelector('.snl-ui__toast');
  return { sheet: !!document.querySelector('.snl-end__sheet'), arrival: !!document.querySelector('.snl-end__arrival'),
           uiToastOpacity: ut ? getComputedStyle(ut).opacity : null };
});
await p.screenshot({ path: join(OUT, 'sheet.png') });

const dpr = 2, plate = geom.plate;
const inPlate = (bl) => plate && bl.x / dpr >= plate.x && bl.x / dpr <= plate.x + plate.w && bl.y / dpr >= plate.y && bl.y / dpr <= plate.y + plate.h;
const vis = diff.list.filter(bl => !inPlate(bl));
const bb = geom.corners;
const bx0 = Math.max(0, Math.min(...bb.map(c => c.x))), bx1 = Math.min(geom.W, Math.max(...bb.map(c => c.x)));
const by0 = Math.max(0, Math.min(...bb.map(c => c.y))), by1 = Math.min(geom.H, Math.max(...bb.map(c => c.y)));
const boardArea = Math.max(0, bx1 - bx0) * Math.max(0, by1 - by0);
const ox = plate ? Math.max(0, Math.min(bx1, plate.x + plate.w) - Math.max(bx0, plate.x)) : 0;
const oy = plate ? Math.max(0, Math.min(by1, plate.y + plate.h) - Math.max(by0, plate.y)) : 0;
const go = geom.go;
const gx = go ? Math.max(0, Math.min(bx1, go.x + go.w) - Math.max(bx0, go.x)) : 0;
const gy = go ? Math.max(0, Math.min(by1, go.y + go.h) - Math.max(by0, go.y)) : 0;
const covered = ox * oy + gx * gy;
const out = { mode: MODE, turns, geom, diff, vis: vis.length, after, errs, boardArea, covered };
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(out, null, 2));

console.log('mode', MODE, 'turns', turns, 'arrival A/B', stillA, stillB, 'errors', errs.length);
console.log('final positions', JSON.stringify(geom.state.players));
console.log('viewport', geom.W + 'x' + geom.H, 'plate', JSON.stringify(plate), 'go', JSON.stringify(go));
console.log('board on screen  x', Math.round(bx0) + '-' + Math.round(bx1), ' y', Math.round(by0) + '-' + Math.round(by1),
  ' = ' + (boardArea / (geom.W * geom.H) * 100).toFixed(1) + '% of the frame');
console.log('BOARD VISIBLE   ', (100 - covered / boardArea * 100).toFixed(1) + '%  (plate+button cover ' + (covered / boardArea * 100).toFixed(1) + '%)');
console.log('square 100 at', JSON.stringify(geom.cells[100]), plate && geom.cells[100].y > plate.y && geom.cells[100].y < plate.y + plate.h ? '→ BEHIND THE PLATE' : '→ clear of the plate');
console.log('uiToast', JSON.stringify(geom.uiToast), 'after handover', JSON.stringify(after));
console.log('fxStats', JSON.stringify(geom.fx));
console.log('frame noise (control): ' + diff.noisePixels + ' px / ' + diff.noiseBlobs + ' blobs');
console.log('CONFETTI            : ' + diff.sigPixels + ' px / ' + diff.sigBlobs + ' blobs;  ' + vis.length + ' clear of the plate');
await b.close();
