// Renders a module detail sheet (HTML, A4) to PDF and reports any box whose content overflows.
//   node render-pdf.js money-blueprint.html "IFM Wealth Conversation — 01 The Money Blueprint.pdf"
// The PDF lands in documents/proposals-and-reports/ (outside CLAUDE/, so it is never deployed).
const path = require('path');
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');

const [src = 'money-blueprint.html', out = 'IFM Wealth Conversation — 01 The Money Blueprint.pdf'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', '..', out);

(async () => {
  // 'shell' headless: the new headless mode hangs on capture in this sandbox
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, src), { waitUntil: 'load' });
  await page.evaluateHandle('document.fonts.ready');
  const report = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('.page').forEach((pg, i) => {
      const pb = pg.getBoundingClientRect();
      pg.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (el.closest('.foot')) return;   // the footer is meant to sit at the foot
        if (r.height && r.bottom > pb.bottom - 32) issues.push(`page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> overruns into the footer zone by ${Math.round(r.bottom - (pb.bottom - 32))}px`);
      });
    });
    return { pages: document.querySelectorAll('.page').length, issues: issues.slice(0, 12) };
  });
  await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
  console.log('wrote', OUT);
})();
