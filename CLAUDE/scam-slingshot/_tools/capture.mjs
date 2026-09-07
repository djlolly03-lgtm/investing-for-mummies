#!/usr/bin/env node
/**
 * Shared capture harness for Scam Slingshot critics.
 *
 *   NODE_PATH=/opt/homebrew/lib/node_modules node capture.mjs \
 *     --scenario ./scenarios/p1-launch.mjs --out ../_shots/P1/r1 [--w 1280 --h 720] [--mobile]
 *
 * The scenario file default-exports:  async ({ page, shot, filmstrip, game, state, aimPx, dragShot }) => { ... }
 *   shot(name)                       -> one PNG
 *   filmstrip(name, {from,to,step})  -> seeks the game deterministically and tiles the frames into
 *                                       ONE labelled contact sheet. This is how motion gets judged
 *                                       from a still image. Use it for anything about feel.
 *   game(fnBody, ...args)            -> evaluate in page context with `SS` in scope
 *   state()                          -> await SS.state()
 *   aimPx(angle, power)              -> the screen pixel for that shot, from the LIVE sling +
 *                                       LIVE camera. Hard-coded drag pixels are BANNED — see
 *                                       the long note above aimPx below for what they cost us.
 *   dragShot(angle, power)           -> grab + pull through the real pointer path at that shot
 *
 * Always writes console.json (errors/warnings) and meta.json next to the shots.
 */
import puppeteer from 'puppeteer';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);

const OUT = path.resolve(arg('out', '../_shots/adhoc'));
const SCENARIO = path.resolve(arg('scenario'));
const URL = arg('url', 'http://localhost:8743/scam-slingshot/');
const W = +arg('w', flag('mobile') ? 390 : 1280);
const H = +arg('h', flag('mobile') ? 844 : 720);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
         '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
         `--window-size=${W},${H}`],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

const logs = [];
page.on('console', m => logs.push({ type: m.type(), text: m.text() }));
page.on('pageerror', e => logs.push({ type: 'pageerror', text: String(e) }));
page.on('requestfailed', r => logs.push({ type: 'requestfailed', text: `${r.url()} ${r.failure()?.errorText}` }));

let fatal = null;
try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForFunction('window.SS && window.SS.ready === true', { timeout: 45000 });
  await page.evaluate(() => window.SS.audioMute?.(true));
} catch (e) {
  fatal = `GAME FAILED TO BECOME READY: ${e.message}`;
}

const game = (body, ...args) =>
  page.evaluate(new Function('...args', `const SS = window.SS; return (async()=>{${body}})();`), ...args);
const state = () => game('return await SS.state();');

let n = 0;
const shot = async (name) => {
  const file = path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  return file;
};

/**
 * Timestamp label, burned in by the BROWSER, not by ffmpeg.
 * (This machine's ffmpeg is built without libfreetype, so the `drawtext` filter does not
 * exist — the old drawtext path failed silently and left the tiler with zero frames.
 * A DOM overlay needs no fonts, no filters and no ffmpeg feature detection.)
 */
const setLabel = (text) => page.evaluate((t) => {
  let el = document.getElementById('__strip_label');
  if (!el) {
    el = document.createElement('div');
    el.id = '__strip_label';
    el.style.cssText = 'position:fixed;left:14px;top:12px;z-index:2147483647;pointer-events:none;' +
      'font:700 24px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;' +
      'background:rgba(0,0,0,.68);padding:5px 12px;border-radius:9px;letter-spacing:.5px';
    document.body.appendChild(el);
  }
  el.textContent = t;
  el.style.display = t === null ? 'none' : '';
}, text).catch(() => {});

const clearLabel = () => page.evaluate(() => document.getElementById('__strip_label')?.remove()).catch(() => {});

/** Deterministic motion capture -> one tiled, timestamped contact sheet. */
const filmstrip = async (name, { from = 0, to = 1200, step = 100, cols = 0, label = true } = {}) => {
  const tmp = path.join(OUT, `.strip-${name}`);
  await mkdir(tmp, { recursive: true });
  let i = 0, t = from;
  if (from > 0) await game('await SS.seek(args[0]);', from);
  while (t <= to) {
    if (label) await setLabel(`t=${t}ms`);
    await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`) });
    i++; t += step;
    if (t <= to) await game('await SS.seek(args[0]);', step);
  }
  await clearLabel();
  const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
  if (!files.length) throw new Error(`filmstrip("${name}"): captured 0 frames (from=${from} to=${to} step=${step})`);
  const c = Math.max(1, cols || Math.min(4, Math.ceil(Math.sqrt(files.length))));
  const rows = Math.max(1, Math.ceil(files.length / c));
  const out = path.join(OUT, `${String(++n).padStart(2, '0')}-${name}-FILMSTRIP.png`);
  await exec('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i',
    path.join(tmp, 'f*.png'),
    '-filter_complex', `scale=640:-1,tile=${c}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', out]);
  await rm(tmp, { recursive: true, force: true });
  return out;
};

/**
 * aimPx(angle, power) -> { x, y, world, angle, power }
 *
 * The screen pixel that, dragged to, produces EXACTLY that shot — derived from the live sling
 * anchor and the live camera every time it is called.
 *
 * NEVER hard-code drag pixels in a scenario. The camera framing is solved from the level
 * (camera.js COMPOSE), so it legitimately moves whenever a level, a screen shape or the
 * composition rules change. Constants that were "drag back and down" in one round silently
 * become "drag FORWARD of the fork" in the next, the slingshot's rear-hemisphere clamp folds
 * them onto its +0.10 boundary, and the scenario goes on reporting ok:true for a 92 deg
 * straight-up shot it never meant to fire. That is exactly what happened to final.mjs,
 * p0-hook-audit.mjs, motion.mjs and realinput.mjs between P1 and P4 — four scenarios that
 * several critics depend on, all silently testing nothing.
 *
 * Uses SS.aim() to pick the exact pouch, projects it with the game's own camera, then puts
 * the sling back the way it found it. Because the pixel is the projection of aim()'s own
 * pouch, driving dragTo()/page.mouse to it also cross-checks the two input paths against each
 * other for free (measured agreement: 0.0000 deg, 0.00000 world units).
 *
 * Camera note: CameraRig.update() runs off the FIXED step, so in driven mode (which SS.seed()
 * enters) nothing moves the camera between aimPx() and the drag that uses it. Re-call aimPx()
 * after any seek() that could re-frame.
 */
const aimPx = (angle, power = 0.95) => page.evaluate((a, p) => {
  const SS = window.SS, w = SS.__world, s = w.sling;
  if (!s) throw new Error('aimPx: no slingshot attached');
  const was = s.state;
  if (was !== 'loaded' && was !== 'dragging') {
    throw new Error(`aimPx: sling is "${was}", not loaded — reseed or reload before aiming`);
  }
  const aimed = SS.aim({ angle: a, power: p });
  if (!aimed || aimed.ok === false) throw new Error(`aimPx: aim rejected: ${aimed && aimed.reason}`);
  const V3 = w.camera.position.constructor;                 // THREE.Vector3, no import needed
  const v = new V3(aimed.pouch.x, aimed.pouch.y, 0).project(w.camera);
  const r = w.renderer.domElement.getBoundingClientRect();
  if (was === 'loaded') { s.cancelDrag(); w.rig?.focusSling?.(); }   // leave no trace
  return {
    x: r.left + (v.x * 0.5 + 0.5) * r.width,
    y: r.top + (-v.y * 0.5 + 0.5) * r.height,
    world: aimed.pouch, angle: a, power: p,
  };
}, angle, power);

/**
 * The whole draw, through the real pointer path, at a shot you name rather than at pixels you
 * guessed: grab at the anchor, pull to (angle, power). Returns dragTo()'s report, which now
 * carries the angle it actually set and whether a clamp touched it — assert on those.
 */
const dragShot = async (angle, power = 0.95, { steps = 1 } = {}) => {
  const g = await aimPx(angle, 0);
  const d = await aimPx(angle, power);
  let last = null;
  await game('SS.dragTo(args[0], args[1]);', g.x, g.y);
  for (let i = 1; i <= steps; i++) {
    last = await game('return SS.dragTo(args[0], args[1]);',
      g.x + (d.x - g.x) * i / steps, g.y + (d.y - g.y) * i / steps);
  }
  return { ...last, wantedAngle: angle, wantedPower: power, grabPx: g, drawPx: d };
};

let scenarioError = null;
if (!fatal) {
  try {
    const mod = await import(SCENARIO);
    await mod.default({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT });
  } catch (e) { scenarioError = `${e.message}\n${e.stack}`; }
}

const inGameErrors = fatal ? [] : await page.evaluate(() => window.SS?.errors ?? []).catch(() => []);
await writeFile(path.join(OUT, 'console.json'), JSON.stringify({
  fatal, scenarioError,
  errors: logs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'requestfailed'),
  warnings: logs.filter(l => l.type === 'warning'),
  inGameErrors,
}, null, 2));
await writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ url: URL, w: W, h: H, shots: n }, null, 2));
await browser.close();

const errCount = logs.filter(l => l.type === 'error' || l.type === 'pageerror').length + inGameErrors.length;
console.log(JSON.stringify({ out: OUT, shots: n, fatal, scenarioError, errorCount: errCount }, null, 2));
if (fatal) process.exit(2);
