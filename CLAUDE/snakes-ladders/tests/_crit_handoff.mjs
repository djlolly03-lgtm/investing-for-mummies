// throwaway — HANDOFF re-score driver. DELETE AFTER USE.
import puppeteer from 'puppeteer';
import fs from 'fs';

const OUT = process.env.OUT || '/tmp/snl-handoff-drive';
const W = +(process.env.W || 820), H = +(process.env.H || 1180);
const LAND = process.env.LAND === '1';
const LANG = process.env.LANG_ || 'en';
const DISMISS = process.env.DISMISS || 'button'; // 'button' | 'body'
const MAXT = +(process.env.MAXT || 24);
fs.mkdirSync(OUT, { recursive: true });

const log = [];
const b = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
         '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=2'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 2, isMobile: !LAND, hasTouch: true },
});
const p = await b.newPage();
if (!LAND) await p.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
p.on('pageerror', e => log.push('PAGEERROR ' + e.message));
await p.evaluateOnNewDocument((lang) => {
  try { localStorage.clear(); localStorage.setItem('snl.lang', lang); } catch {}
}, LANG);
await p.goto('http://localhost:8791/snakes-ladders/', { waitUntil: 'networkidle2', timeout: 60000 });
await p.waitForFunction(() => document.querySelector('.snl-setup__go'), { timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));

// install handoff observer BEFORE starting
await p.evaluate(() => {
  window.__H = [];
  const seen = new WeakSet();
  const cap = (el) => {
    const cs = getComputedStyle(el);
    const inn = el.querySelector('.snl-handoff__in');
    const ci = inn ? getComputedStyle(inn) : null;
    window.__H.push({
      t: Date.now(),
      turn: (window.__SNL?.state?.()||{}).turn,
      players: ((window.__SNL?.state?.()||{}).players || []).map(x => x.name + ':' + x.pos),
      name: el.querySelector('.snl-handoff__name')?.textContent,
      sq: el.querySelector('.snl-handoff__sq')?.textContent,
      tap: el.querySelector('.snl-handoff__tap')?.textContent,
      tokHTML: (el.querySelector('.snl-handoff__tok')?.innerHTML || '').slice(0, 60),
      tokIsSvg: !!el.querySelector('.snl-handoff__tok svg'),
      outerBG: cs.backgroundColor,
      outerRect: el.getBoundingClientRect().toJSON(),
      innerBG: ci?.backgroundColor,
      innerRect: inn ? inn.getBoundingClientRect().toJSON() : null,
      aria: el.getAttribute('aria-label')
    });
  };
  let shown = false;
  const mo = new MutationObserver(() => {
    const el = document.querySelector('.snl-handoff');
    const on = !!(el && !el.hidden && el.classList.contains('is-in'));
    if (on && !shown) { shown = true; cap(el); }
    if (!on) shown = false;
  });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
});

// real taps: 2 players
const tapSel = async (sel) => {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  if (!r) throw new Error('no ' + sel);
  await p.touchscreen.tap(r.x, r.y);
};
const plaques = await p.$$('.snl-setup__plaque');
log.push('setup plaques: ' + plaques.length);
// second plaque = 2 players
await p.evaluate(() => {
  const ps = [...document.querySelectorAll('.snl-setup__plaque')];
  const two = ps.find(x => /2/.test(x.textContent));
  const b = two.getBoundingClientRect();
  window.__tapAt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
const tp = await p.evaluate(() => window.__tapAt);
await p.touchscreen.tap(tp.x, tp.y);
await new Promise(r => setTimeout(r, 5000));
await p.screenshot({ path: OUT + '/A-after-start.png' });

let shots = 0, turns = 0, handoffsAt = [];
const state = () => p.evaluate(() => {
  const A = window.__SNL;
  const st = A?.state?.() || {};
  const ho = document.querySelector('.snl-handoff');
  return {
    screen: A?.screen?.(), over: st.over, turn: st.turn,
    positions: (st.players || []).map(x => x.name + ':' + x.pos),
    handoffVisible: !!(ho && !ho.hidden && ho.classList.contains('is-in')),
    rollDisabled: document.querySelector('.snl-ui__roll')?.disabled,
    hcount: window.__H.length
  };
});

let lastH = 0;
for (let i = 0; i < 900; i++) {
  const s = await state();
  if (s.over) { log.push('GAME OVER at turnId ' + s.turnId); break; }
  if (s.hcount > lastH) {
    lastH = s.hcount;
    if (shots < 8) { await p.screenshot({ path: `${OUT}/H${String(lastH).padStart(2, '0')}-handoff.png` }); shots++; }
  }
  if (s.handoffVisible) {
    // tap centre to advance
    await p.touchscreen.tap(W / 2, H / 2);
    await new Promise(r => setTimeout(r, 400));
    continue;
  }
  // lesson card open?
  const lz = await p.evaluate((mode) => {
    const btn = document.querySelector('.snl-lesson__btn');
    const card = document.querySelector('.snl-lesson.is-in, .snl-lesson[class*="is-"]');
    const vis = (e) => e && e.getBoundingClientRect().width > 10 && getComputedStyle(e).opacity !== '0';
    if (vis(btn)) { const b = btn.getBoundingClientRect(); return { kind: 'btn', txt: btn.textContent.trim(), x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
    return null;
  }, DISMISS);
  if (lz) {
    if (shots < 14) { await p.screenshot({ path: `${OUT}/L${String(turns).padStart(2, '0')}-lesson.png` }); shots++; }
    log.push('LESSON btn: ' + lz.txt);
    if (DISMISS === 'body') {
      // tap the card body, not the button (very plausible user behaviour)
      await p.touchscreen.tap(W / 2, Math.max(120, lz.y - 260));
    } else {
      await p.touchscreen.tap(lz.x, lz.y);
    }
    await new Promise(r => setTimeout(r, 700));
    continue;
  }
  if (s.rollDisabled === false) {
    await tapSel('.snl-ui__roll');
    turns++;
    await new Promise(r => setTimeout(r, 900));
    if (turns >= MAXT) { log.push('hit MAXT'); break; }
    continue;
  }
  await new Promise(r => setTimeout(r, 350));
}

const CARDS = await p.evaluate(() => window.__H);
const final = await state();
await p.screenshot({ path: OUT + '/Z-final.png' });

// measure computed handoff css
const css = await p.evaluate(() => {
  const el = document.querySelector('.snl-handoff');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { transition: cs.transition, zIndex: cs.zIndex, pointerEvents: cs.pointerEvents, display: cs.display, hidden: el.hidden };
});

fs.writeFileSync(OUT + '/handoff.json', JSON.stringify({ W, nCards: CARDS.length, viewport: [W, H], LANG, DISMISS, turnsRolled: turns, final, cards: CARDS, css, log }, null, 2));
console.log(JSON.stringify({ viewport: [W, H], LANG, DISMISS, turnsRolled: turns, cards: CARDS.length, final, css }, null, 2));
console.log('LOG:\n' + log.join('\n'));
for (const c of CARDS) console.log('CARD', JSON.stringify({ name: c.name, sq: c.sq, tap: c.tap, tokIsSvg: c.tokIsSvg, outerBG: c.outerBG, innerBG: c.innerBG, innerRect: c.innerRect && [Math.round(c.innerRect.width), Math.round(c.innerRect.height)], players: c.players }));
await b.close();
