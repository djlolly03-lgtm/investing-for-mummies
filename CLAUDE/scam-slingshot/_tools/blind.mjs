#!/usr/bin/env node
/**
 * Blind A/B rig. Composites OUR capture and the Angry Birds reference into ONE image with the two
 * panels labelled only "A" and "B", in a RANDOM order, and hides which is which.
 *
 *   node blind.mjs --ours <png> --ref <png> --out <dir> [--label "P1 launch feel"] [--h 900]
 *
 * Writes  <dir>/BLIND.png      <- the critic looks at ONLY this, and writes its verdict first
 *         <dir>/.mapping.json  <- the critic reads this ONLY AFTER writing its verdict
 *
 * NOTE ON THE RENDERER (do not "simplify" this back to ffmpeg):
 * this machine's ffmpeg is built WITHOUT libfreetype, so the `drawtext` filter does not exist and
 * any A/B badge drawn through ffmpeg dies with "No such filter: 'drawtext'". The composite is
 * therefore laid out in headless Chrome, which needs no ffmpeg filters and no font detection.
 * Same CLI, same two output files, same coin flip.
 */
import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };

const OURS = path.resolve(arg('ours')), REF = path.resolve(arg('ref'));
const OUT = path.resolve(arg('out')), LABEL = arg('label', '');
const PANEL_H = +arg('h', 900);
for (const f of [OURS, REF]) if (!existsSync(f)) { console.error('missing input: ' + f); process.exit(1); }
await mkdir(OUT, { recursive: true });

// Coin flip decides which panel is ours. The critic cannot see this.
const oursIsA = Math.random() < 0.5;
const left = oursIsA ? OURS : REF, right = oursIsA ? REF : OURS;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Inline both panels as data: URIs. A page created with setContent has an opaque origin, so a
// file:// <img> src is blocked and decodes to naturalWidth 0 — the composite would come out empty.
const dataUri = async (f) => {
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
    [path.extname(f).toLowerCase()] || 'image/png';
  return `data:${mime};base64,${(await readFile(f)).toString('base64')}`;
};
const [leftSrc, rightSrc] = await Promise.all([dataUri(left), dataUri(right)]);

const html = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;background:#111;}
  #wrap{display:inline-block;background:#111;padding:0 0 20px;}
  #bar{height:70px;display:flex;align-items:center;justify-content:center;
       font:600 34px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
       color:#ddd;letter-spacing:.3px;padding:0 24px;}
  #row{display:flex;gap:0;}
  .panel{position:relative;padding:20px;background:#111;}
  .panel img{display:block;height:${PANEL_H}px;width:auto;}
  .badge{position:absolute;left:28px;top:24px;background:rgba(0,0,0,.8);color:#fff;
         font:700 52px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
         padding:16px 24px;border-radius:8px;letter-spacing:1px;}
</style>
<div id="wrap">
  <div id="bar">${LABEL ? esc(LABEL) + ' — which is better?' : '&nbsp;'}</div>
  <div id="row">
    <div class="panel"><img src="${leftSrc}"><div class="badge">A</div></div>
    <div class="panel"><img src="${rightSrc}"><div class="badge">B</div></div>
  </div>
</div>`;

const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const ok = await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
    return imgs.every(i => i.naturalWidth > 0);
  });
  if (!ok) throw new Error('one of the input images failed to decode');
  const box = await page.evaluate(() => {
    const r = document.getElementById('wrap').getBoundingClientRect();
    return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
  });
  await page.setViewport({ width: Math.min(box.w, 16000), height: Math.min(box.h, 16000), deviceScaleFactor: 1 });
  await page.$eval('#wrap', el => el.scrollIntoView());
  const el = await page.$('#wrap');
  await el.screenshot({ path: path.join(OUT, 'BLIND.png') });
} finally {
  await browser.close();
}

await writeFile(path.join(OUT, '.mapping.json'), JSON.stringify({
  A: oursIsA ? 'OURS' : 'ANGRY_BIRDS_REFERENCE',
  B: oursIsA ? 'ANGRY_BIRDS_REFERENCE' : 'OURS',
  ours: OURS, reference: REF, label: LABEL,
}, null, 2));
console.log(JSON.stringify({ blind: path.join(OUT, 'BLIND.png'), mappingHidden: path.join(OUT, '.mapping.json') }));
