/* util.js — tiny helpers everyone shares. No imports, no side effects. */

/* ── money ─────────────────────────────────────────────────────────── */
// 100000 -> "1,00,000"   (Indian grouping: last 3, then pairs)
export function indianFormat(n) {
  const neg = n < 0; n = Math.round(Math.abs(Number(n) || 0));
  const s = String(n);
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  return (neg ? '-' : '') + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
export const rupees = (n) => '₹' + indianFormat(n);

// 2500000 -> "₹25 lakh" · 15000000 -> "₹1.5 crore" · 4500 -> "₹4,500"
export function lakhCrore(n) {
  const a = Math.abs(n);
  if (a >= 1e7) { const v = n / 1e7; return '₹' + trim(v) + ' crore'; }
  if (a >= 1e5) { const v = n / 1e5; return '₹' + trim(v) + ' lakh'; }
  return rupees(n);
}
const trim = (v) => (Math.round(v * 100) / 100).toString();

/* ── maths ─────────────────────────────────────────────────────────── */
export const lerp  = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const inv   = (v, a, b) => clamp((v - a) / (b - a || 1), 0, 1);
// frame-rate independent smoothing
export const damp  = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const ease = {
  linear:  t => t,
  out:     t => 1 - Math.pow(1 - t, 3),
  in:      t => t * t * t,
  inOut:   t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outQuint:t => 1 - Math.pow(1 - t, 5),
  back:    t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
  bounce:  t => { const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375; },
  // a soft settle used for tokens landing
  settle:  t => 1 - Math.pow(1 - t, 4) * Math.cos(t * Math.PI * 1.2),
};

/* ── deterministic RNG (mulberry32) — every random in the game comes
      from here so a probe can replay a seeded game exactly. ───────── */
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const f = () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.int = (n) => Math.floor(f() * n);
  f.pick = (arr) => arr[f.int(arr.length)];
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.state = () => a;
  f.setState = (s) => { a = s >>> 0; };
  return f;
}

/* ── events ────────────────────────────────────────────────────────── */
export function emitter() {
  const m = new Map();
  return {
    on(k, fn) { (m.get(k) || m.set(k, new Set()).get(k)).add(fn); return () => this.off(k, fn); },
    off(k, fn) { m.get(k)?.delete(fn); },
    emit(k, p) { m.get(k)?.forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); },
    clear() { m.clear(); },
  };
}

/* ── time ──────────────────────────────────────────────────────────── */
export const wait = (ms) => new Promise(r => setTimeout(r, ms));
export const raf  = () => new Promise(r => requestAnimationFrame(r));

/** Animate 0→1 over ms, calling fn(t, eased). Resolves at the end.
 *  Returns a promise with .cancel(). Honours reduced motion by snapping. */
export function tween(ms, fn, easing = ease.out) {
  if (prefersReducedMotion()) { fn(1, 1); return Object.assign(Promise.resolve(), { cancel() {} }); }
  let cancelled = false, start = null;
  const p = new Promise(res => {
    const tick = (now) => {
      if (cancelled) return res();
      if (start === null) start = now;
      const t = clamp((now - start) / ms, 0, 1);
      fn(t, easing(t));
      t < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
  p.cancel = () => { cancelled = true; };
  return p;
}

/* ── environment ───────────────────────────────────────────────────── */
let _rmOverride = null;
export function prefersReducedMotion() {
  if (_rmOverride !== null) return _rmOverride;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function setReducedMotion(v) { _rmOverride = v; }

export const isTouch = () => typeof window !== 'undefined' &&
  (('ontouchstart' in window) || navigator.maxTouchPoints > 0);


/** Each UI module injects its OWN css so no two agents ever edit one stylesheet.
 *  Prefix every selector with your module's namespace (e.g. '.snl-lesson'). */
export function injectCss(id, css) {
  if (typeof document === 'undefined') return;
  let n = document.getElementById('css-' + id);
  if (!n) { n = document.createElement('style'); n.id = 'css-' + id; document.head.appendChild(n); }
  n.textContent = css;
}

/* ── misc ──────────────────────────────────────────────────────────── */
export const esc = (s) => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const el = (tag, attrs = {}, html) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  if (html != null) n.innerHTML = html;
  return n;
};
