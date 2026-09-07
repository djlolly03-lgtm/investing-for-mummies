#!/usr/bin/env node
/** px-probe.mjs — decode a PNG in headless Chrome and run a pixel expression over it.
 *   node px-probe.mjs <file.png> <jsfile-with-body>   (body gets px, lum, W, H)
 */
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';

const file = process.argv[2];
const codeFile = process.argv[3];
const code = await readFile(codeFile, 'utf8');
const b64 = (await readFile(file)).toString('base64');

const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await browser.newPage();
await p.setContent('<canvas id="c"></canvas>');
const out = await p.evaluate(async (src, codeStr) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = (x, y) => { const i = (((y | 0) * d.width) + (x | 0)) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
  const lum = (x, y) => { const q = px(x, y); return 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2]; };
  return new Function('px', 'lum', 'W', 'H', codeStr)(px, lum, d.width, d.height);
}, 'data:image/png;base64,' + b64, code);
console.log(JSON.stringify(out, null, 1));
await browser.close();
