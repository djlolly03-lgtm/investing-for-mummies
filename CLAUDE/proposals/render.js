#!/usr/bin/env node
/*  IFM proposal renderer — HTML ➜ print-ready A4 PDF.
 *
 *    node render.js "IFM Proposal - ONGC.html"
 *    node render.js                       (defaults to the template)
 *
 *  Writes the PDF next to the HTML file, same basename.
 */
const path = require('path');
const fs   = require('fs');

let puppeteer;
for (const p of ['puppeteer', '/opt/homebrew/lib/node_modules/puppeteer',
                 '/usr/local/lib/node_modules/puppeteer']) {
  try { puppeteer = require(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer not found — npm i -g puppeteer'); process.exit(1); }

const input = path.resolve(process.argv[2] || path.join(__dirname, 'ifm-proposal-template.html'));
if (!fs.existsSync(input)) { console.error('No such file: ' + input); process.exit(1); }
const output = input.replace(/\.html?$/i, '.pdf');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push('JS: ' + e.message));
  page.on('requestfailed', r => errors.push('MISSING ASSET: ' + r.url()));

  await page.goto('file://' + input, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  if (errors.length) { console.error('\n⚠  Problems found:'); errors.forEach(e => console.error('   ' + e)); }

  await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();

  const kb = Math.round(fs.statSync(output).size / 1024);
  console.log(`✓ ${path.basename(output)}  (${kb} KB)`);

  /* ── self-contained preview ────────────────────────────────────────────
   * Opening the raw template in a browser can show empty image frames: some
   * viewers (including Claude's built-in browser pane) load the file as a
   * data: URL, and a data: document cannot resolve relative paths like
   * assets/photo.jpg. So we also write a copy with every image inlined as a
   * base64 data URI — that one displays correctly anywhere, including when
   * emailed to someone who doesn't have the assets folder.            */
  const preview = input.replace(/\.html?$/i, '-preview.html');
  const dir = path.dirname(input);
  const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                 '.png': 'image/png',  '.webp': 'image/webp' };
  let html = fs.readFileSync(input, 'utf8');
  let inlined = 0, absent = [];
  html = html.replace(/(["'(])(assets\/[A-Za-z0-9._-]+)(["')])/g, (m, a, rel, b) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) { absent.push(rel); return m; }
    const mime = MIME[path.extname(rel).toLowerCase()];
    if (!mime) return m;
    inlined++;
    return a + `data:${mime};base64,` + fs.readFileSync(abs).toString('base64') + b;
  });
  fs.writeFileSync(preview, html);
  if (absent.length) console.error('⚠  missing assets: ' + [...new Set(absent)].join(', '));
  const pkb = Math.round(fs.statSync(preview).size / 1024);
  console.log(`✓ ${path.basename(preview)}  (${pkb} KB, ${inlined} images embedded)`);
})();
