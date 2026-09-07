#!/usr/bin/env node
/**
 * DETERMINISM GATE — run this after any change to physics.js, hooks.js seek/seed, the
 * vendored Rapier version, or anything that touches body creation order.
 *
 *   cd _tools && node determinism.mjs
 *
 * Everything downstream depends on this passing:
 *   - critics capture "the frame at t=180ms after release" via SS.seek()
 *   - level pars and 3-star thresholds are only meaningful if a shot replays identically
 *   - blind A/B comparisons across rounds are only fair if the same input gives the same world
 *
 * Four checks, all on FULL-PRECISION f64 bit patterns of every rigid body transform:
 *   A) two independent BROWSER PROCESSES, same seed, seek(2000) -> must be byte-identical
 *   B) one big seek(2000) vs twenty chunked seek(100) -> must be byte-identical
 *      (this is what filmstrip() does; if it fails, every motion contact sheet is a lie)
 *   C) a different seed -> must DIFFER (otherwise "identical" is trivially true and useless)
 *   D) zero console errors in every run
 *
 * Exit code 0 = deterministic. Non-zero = STOP AND FIX BEFORE BUILDING ANYTHING ELSE.
 */
import puppeteer from 'puppeteer';

const URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:8743/scam-slingshot/';
const SEEK_MS = 2000;

const LAUNCH = {
  headless: 'shell',
  args: ['--no-sandbox', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
         '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', '--window-size=1280,720'],
};

/**
 * One completely fresh browser process -> one measurement.
 * @param {object} opts
 * @param {number} opts.seed
 * @param {number[]} opts.seeks  the seek() calls to make, in order, in ms
 */
async function run({ seed, seeks, label }) {
  const browser = await puppeteer.launch(LAUNCH);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));
    page.on('requestfailed', r => consoleErrors.push(`requestfailed ${r.url()}`));

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForFunction('window.SS && window.SS.ready === true', { timeout: 45000 });

    const out = await page.evaluate(async ({ seed, seeks }) => {
      await window.SS.seed(seed);
      const t0 = window.SS.dumpBodies();
      for (const ms of seeks) await window.SS.seek(ms);
      const t1 = window.SS.dumpBodies();
      return {
        version: window.SS.version,
        tick: window.SS.tick(),
        t0bits: t0.map(b => b.bits).join('|'),
        bits: t1.map(b => b.bits).join('|'),
        bodies: t1.map(b => ({ tag: b.tag, x: b.t[0], y: b.t[1], z: b.t[2], rz: b.r[2], rw: b.r[3], sleeping: b.sleeping })),
        errors: window.SS.errors.map(e => e.text),
      };
    }, { seed, seeks });

    return { label, seed, seeks, ...out, consoleErrors: consoleErrors.concat(out.errors) };
  } finally {
    await browser.close();
  }
}

const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(17);
function table(bodies) {
  return bodies.map((b, i) =>
    `    [${i}] ${b.tag.padEnd(6)} x=${f(b.x)}  y=${f(b.y)}  z=${f(b.z)}  rz=${f(b.rz)}  ${b.sleeping ? 'asleep' : 'awake '}`
  ).join('\n');
}

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  SCAM SLINGSHOT — DETERMINISM GATE                                           ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);
console.log(`url   : ${URL}`);
console.log(`method: fresh browser PROCESS per run · seed(n) · seek(${SEEK_MS}ms) · compare f64 bit patterns\n`);

const A = await run({ seed: 1, seeks: [SEEK_MS], label: 'A  seed=1  seek(2000) x1' });
const B = await run({ seed: 1, seeks: [SEEK_MS], label: 'B  seed=1  seek(2000) x1  [independent process]' });
const C = await run({ seed: 1, seeks: Array(20).fill(100), label: 'C  seed=1  seek(100) x20 [chunked]' });
const D = await run({ seed: 7, seeks: [SEEK_MS], label: 'D  seed=7  seek(2000) x1' });

for (const r of [A, B, C, D]) {
  console.log(`── ${r.label}`);
  console.log(`    version=${r.version}  tick=${r.tick}  bodies=${r.bodies.length}  consoleErrors=${r.consoleErrors.length}`);
  console.log(table(r.bodies));
  console.log(`    sha-ish: …${r.bits.slice(-64)}\n`);
}

const checks = [
  ['A ≡ B   two independent browser processes, same seed', A.bits === B.bits],
  ['A ≡ C   one seek(2000) ≡ twenty seek(100)            ', A.bits === C.bits],
  ['A ≡ B   identical at t=0 too (rebuild is reproducible)', A.t0bits === B.t0bits],
  ['A ≠ D   a different seed produces a different world   ', A.bits !== D.bits],
  ['ticks   all runs ran exactly 240 solver steps         ', [A, B, C, D].every(r => r.tick === 240)],
  ['clean   zero console errors in every run              ', [A, B, C, D].every(r => r.consoleErrors.length === 0)],
];

console.log('── VERDICT ' + '─'.repeat(66));
let ok = true;
for (const [name, pass] of checks) {
  console.log(`   ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) ok = false;
}

if (!ok) {
  console.log('\n   Divergence detail:');
  if (A.bits !== B.bits) {
    const a = A.bits.split('|'), b = B.bits.split('|');
    a.forEach((v, i) => { if (v !== b[i]) console.log(`     body[${i}] A=${v}\n                B=${b[i]}`); });
  }
  if (A.bits !== C.bits) {
    const a = A.bits.split('|'), c = C.bits.split('|');
    a.forEach((v, i) => { if (v !== c[i]) console.log(`     chunked body[${i}] A=${v}\n                        C=${c[i]}`); });
  }
  for (const r of [A, B, C, D]) for (const e of r.consoleErrors) console.log(`     [${r.label}] ${e}`);
}

console.log(`\n   ${ok ? '✅ DETERMINISTIC — safe to build on.' : '❌ NON-DETERMINISTIC — fix the physics loop before anything else.'}\n`);
process.exit(ok ? 0 : 1);
