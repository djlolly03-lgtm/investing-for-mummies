// Renders every icons/svg/*.svg template into PNG variants for the deck, plus a review sheet.
// Templates use the literal tokens STROKE and ACCENT for colour, so one drawing serves
// light slides (navy + teal) and dark slides (white + mint/gold).
//
//   node render-icons.js                 -> all icons
//   node render-icons.js a b c           -> only these ids (sheet still shows all)
//   node render-icons.js --sheet out.png  -> also write the review sheet to out.png
const fs = require('fs');
const path = require('path');
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');

const DIR = __dirname;
const SVG = path.join(DIR, 'svg');
const PNG = path.join(DIR, 'png');
const VARIANTS = {
  light: { STROKE: '#1a3a5c', ACCENT: '#2a9d8f' },   // navy outline, teal accent
  dark:  { STROKE: '#ffffff', ACCENT: '#7fd3c8' },   // white outline, mint accent
  gold:  { STROKE: '#1a3a5c', ACCENT: '#c9a84c' },   // navy outline, gold accent (on gold-lt / white)
  teal:  { STROKE: '#ffffff', ACCENT: '#f2d98a' },   // white outline, light-gold accent (on teal)
};
const SIZE = 384;

const args = process.argv.slice(2);
let sheetOut = null;
const si = args.indexOf('--sheet');
if (si >= 0) { sheetOut = args[si + 1]; args.splice(si, 2); }

const fill = (svg, v) => svg.replace(/STROKE/g, v.STROKE).replace(/ACCENT/g, v.ACCENT);

(async () => {
  fs.mkdirSync(PNG, { recursive: true });
  const all = fs.readdirSync(SVG).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).sort();
  const ids = args.length ? args : all;
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
  for (const id of ids) {
    const src = fs.readFileSync(path.join(SVG, id + '.svg'), 'utf8');
    for (const [vn, v] of Object.entries(VARIANTS)) {
      const svg = fill(src, v).replace('<svg', `<svg width="${SIZE}" height="${SIZE}"`);
      await page.setContent(`<html><body style="margin:0;background:transparent"><div style="line-height:0">${svg}</div></body></html>`);
      await page.screenshot({ path: path.join(PNG, `${id}-${vn}.png`), omitBackground: true,
        clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
    }
  }
  if (sheetOut) {
    const cell = id => {
      const src = fs.readFileSync(path.join(SVG, id + '.svg'), 'utf8');
      const big = s => fill(src, VARIANTS[s]).replace('<svg', '<svg width="88" height="88"');
      const small = fill(src, VARIANTS.light).replace('<svg', '<svg width="28" height="28"');
      return `<div class="c"><div class="row"><span class="l">${big('light')}</span><span class="d">${big('dark')}</span><span class="m">${small}</span></div><div class="n">${id}</div></div>`;
    };
    const html = `<html><head><style>
      body{margin:0;padding:16px;font:12px Nunito,Arial;background:#fff;color:#1a3a5c;width:1600px}
      .g{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
      .c{border:1px solid #e0f3f0;border-radius:10px;padding:8px}
      .row{display:flex;gap:6px;align-items:center}
      .l{background:#f7faf9;border-radius:8px;padding:4px}
      .d{background:#1a3a5c;border-radius:8px;padding:4px}
      .m{background:#e0f3f0;border-radius:6px;padding:4px}
      .n{margin-top:4px;font-weight:700}
    </style></head><body><div class="g">${all.map(cell).join('')}</div></body></html>`;
    await page.setViewport({ width: 1632, height: 400, deviceScaleFactor: 1 });
    await page.setContent(html);
    await page.screenshot({ path: sheetOut, fullPage: true });
  }
  await browser.close();
  console.log(`rendered ${ids.length} icon(s) x ${Object.keys(VARIANTS).length} variants -> ${PNG}`);
  if (sheetOut) console.log('sheet ->', sheetOut);
})();
