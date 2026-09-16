/* Timestamps a REAL tap on the 3D die.
   t0        = pointerdown of the tap
   tPlaque   = first frame the HUD Roll plaque shows a readable number
   tDieFace  = last frame the die's orientation changed (its face is final from here)
   tDieRest  = last frame the die moved at all (position/scale settle done)   */
import puppeteer from 'puppeteer';

const RM = process.argv.includes('--reduced');
const b = await puppeteer.launch({ headless: true,
  args: ['--use-gl=angle','--enable-unsafe-swiftshader','--hide-scrollbars','--mute-audio',
         ...(RM ? ['--force-prefers-reduced-motion'] : [])],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8791/snakes-ladders/', { waitUntil: 'networkidle2', timeout: 45000 });
await p.evaluate(() => window.__SNL.ready);
await p.evaluate(() => window.__SNL.quickStart(2));
await new Promise(r => setTimeout(r, 1400));

const runs = [];
for (let i = 0; i < 4; i++) {
  const live = await p.evaluate(() => document.querySelector('.snl-dice3d')?.getAttribute('aria-disabled'));
  if (live !== 'false') { runs.push({ run: i, skipped: 'die not live', live }); break; }

  await p.evaluate(async (SKIP) => {
    const D = await import('/snakes-ladders/js/dice3d.js');
    const M = { t0: 0, tPlaque: 0, tDieFace: 0, tDieRest: 0, shift: null };
    window.__M = M;
    const g = D.diceObject();
    const die = g.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry');
    const plaque = document.querySelector('.snl-ui__die');
    const text = document.querySelector('.snl-ui__rolltext');
    M.faceBefore = plaque.innerHTML.trim().length > 0;
    M.textXBefore = +text.getBoundingClientRect().x.toFixed(1);
    let maxShift = 0;
    const onDown = () => { if (!M.t0) M.t0 = performance.now(); };
    window.addEventListener('pointerdown', onDown, true);
    const mo = new MutationObserver(() => {
      if (!M.tPlaque && !plaque.hidden && plaque.innerHTML.trim()) M.tPlaque = performance.now();
    });
    mo.observe(plaque, { childList: true, subtree: true, attributes: true });
    let lq = die.quaternion.clone(), lp = die.position.clone(), ls = die.scale.clone();
    const tick = () => {
      const now = performance.now();
      if (M.t0) {
        if (die.quaternion.angleTo(lq) > 1e-3) { M.tDieFace = now; lq = die.quaternion.clone(); }
        if (die.position.distanceTo(lp) > 1e-4 || die.scale.distanceTo(ls) > 1e-4) {
          M.tDieRest = now; lp = die.position.clone(); ls = die.scale.clone();
        }
        const dx = Math.abs(text.getBoundingClientRect().x - M.textXBefore);
        if (dx > maxShift) { maxShift = dx; M.shift = +dx.toFixed(1); }
        if (SKIP && now - M.t0 > SKIP && !M.skipped) {
          M.skipped = true;
          const e = document.querySelector('.snl-dice3d').getBoundingClientRect();
          const cv = document.getElementById('snl-canvas');
          cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: e.x + e.width/2, clientY: e.y + e.height/2, pointerType: 'touch', isPrimary: true }));
        }
        if (now - M.t0 > 2600) { mo.disconnect(); window.removeEventListener('pointerdown', onDown, true); return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, i === 3 ? 300 : 0);

  const box = await p.evaluate(() => { const r = document.querySelector('.snl-dice3d').getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
  await p.touchscreen.tap(box.x, box.y);
  await new Promise(r => setTimeout(r, 3000));
  const m = await p.evaluate(() => window.__M);
  runs.push({ run: i, mode: i === 3 ? 'tap-to-skip @300ms' : 'normal',
    tapMs: 0,
    plaqueMs: m.tPlaque ? +(m.tPlaque - m.t0).toFixed(0) : null,
    dieFaceFinalMs: m.tDieFace ? +(m.tDieFace - m.t0).toFixed(0) : null,
    dieRestMs: m.tDieRest ? +(m.tDieRest - m.t0).toFixed(0) : null,
    plaqueBeforeDieBy: (m.tPlaque && m.tDieFace) ? +(m.tDieFace - m.tPlaque).toFixed(0) : null,
    labelShiftPx: m.shift });
  await p.evaluate(() => window.__SNL.settle());
  await new Promise(r => setTimeout(r, 900));
  await p.evaluate(async () => { try { await window.__SNL.dismissLesson(); } catch {} });
  await new Promise(r => setTimeout(r, 1200));
}
console.log(JSON.stringify(runs, null, 1));
await b.close();
