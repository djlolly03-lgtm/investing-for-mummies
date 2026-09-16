/* w6 hud — timestamp the tap, the plaque reveal, and the die's final face.
   Drives the REAL UI with real taps. No debug API for the roll itself. */
import puppeteer from 'puppeteer';

const b = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:8791/snakes-ladders/', { waitUntil: 'networkidle2', timeout: 45000 });
await p.evaluate(() => window.__SNL.ready);

console.log('reducedMotion:', await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));

// --- real taps through setup ---
async function tapText(txt) {
  const h = await p.evaluateHandle((t) => {
    const all = [...document.querySelectorAll('button,[role="button"]')];
    return all.find(e => (e.textContent || '').toLowerCase().includes(t.toLowerCase())) || null;
  }, txt);
  const el = h.asElement();
  if (!el) throw new Error('no button matching ' + txt);
  const box = await el.boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}
await tapText('2');                       // 2 khiladi
await new Promise(r => setTimeout(r, 900));
await p.touchscreen.tap(195, 420);        // skip the one line
await new Promise(r => setTimeout(r, 500));
await p.touchscreen.tap(195, 420);        // handoff card TAP
await new Promise(r => setTimeout(r, 900));

console.log('screen:', await p.evaluate(() => window.__SNL.screen()));

// --- instrument ---
await p.evaluate(async () => {
  const scene = await import('/snakes-ladders/js/scene.js');
  const dice = await import('/snakes-ladders/js/dice3d.js');
  const die = dice.diceObject().children[dice.diceObject().children.length - 1];
  const svg = document.querySelector('.snl-ui__die');
  const W = window.__W6 = { t0: 0, plaque: -1, samples: [], text: [] };
  const mo = new MutationObserver(() => {
    const shown = !svg.hidden && svg.innerHTML.trim().length > 0;
    W.text.push([performance.now(), shown ? svg.childElementCount : 0]);
    if (shown && W.plaque < 0 && W.t0) W.plaque = performance.now();
  });
  mo.observe(svg, { attributes: true, childList: true, subtree: true });
  const q = { x: 0, y: 0, z: 0, w: 1 };
  scene.onFrame(() => {
    if (!W.t0) return;
    W.samples.push([performance.now(), die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w]);
  });
  void q;
});

// --- the tap on the ROLL plaque ---
const box = await (await p.$('.snl-ui__roll')).boundingBox();
await p.evaluate(() => { window.__W6.t0 = performance.now(); });
await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
await new Promise(r => setTimeout(r, 2600));

const out = await p.evaluate(() => {
  const W = window.__W6;
  const s = W.samples;
  if (!s.length) return { err: 'no samples', plaque: W.plaque - W.t0 };
  const last = s[s.length - 1];
  const dot = (a) => Math.abs(a[1] * last[1] + a[2] * last[2] + a[3] * last[3] + a[4] * last[4]);
  // first sample after which the orientation never again departs from final
  let idx = s.length - 1;
  for (let i = s.length - 1; i >= 0; i--) { if (dot(s[i]) > 0.9995) idx = i; else break; }
  return {
    tap: 0,
    plaque: W.plaque > 0 ? +(W.plaque - W.t0).toFixed(0) : -1,
    dieFinal: +(s[idx][0] - W.t0).toFixed(0),
    frames: s.length,
    firstSample: +(s[0][0] - W.t0).toFixed(0),
    text: W.text.map(([t, n]) => [+(t - W.t0).toFixed(0), n]).slice(0, 12),
  };
});
console.log(JSON.stringify(out, null, 1));
console.log('errors:', errs.slice(0, 3));
await b.close();
