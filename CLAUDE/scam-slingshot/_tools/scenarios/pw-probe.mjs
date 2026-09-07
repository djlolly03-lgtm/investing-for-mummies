/**
 * pw-probe.mjs — shared measurement helpers for PW (weight & gravity).
 *
 * READ-ONLY on the simulation. It wraps `physics.stepOnce` so a sample is taken after every
 * solver step — including the steps main.js runs inside `settleAfterBuild()`, which is where
 * a DROP RIG actually happens: `loadLevel()` resolves only once the level is settled, so a
 * probe that starts sampling after the load has already missed the whole fall. The wrapper
 * writes nothing to any body, so a run through it is bit-identical to a run without it.
 */

/** Patch once per page. Must run BEFORE the probe level is loaded. */
export const INSTALL = `
const P = SS.__physics, W = SS.__world;
window.__PW = window.__PW || { rows: [], on: false, cut: 0 };
if (!P.__pwPatched) {
  P.__pwPatched = true;
  const orig = P.stepOnce.bind(P);
  P.stepOnce = () => {
    const t = orig();
    if (window.__PW.on) {
      const out = [];
      for (const b of W.blocks)   if (!b.dead && b.body) out.push(['B', b.matName, b.id, b.body]);
      for (const d of W.debris)   if (!d.dead && d.body) out.push(['D', d.matName, d.id, d.body]);
      for (const v of W.villains) if (!v.dead && v.body) out.push(['V', 'villain', v.id, v.body]);
      const row = [];
      for (const [k, m, id, body] of out) {
        const tr = body.translation(), lv = body.linvel(), av = body.angvel();
        row.push([k, m, id, tr.x, tr.y, lv.x, lv.y, av.z, body.isSleeping() ? 1 : 0, body.mass()]);
      }
      window.__PW.rows.push(row);
    }
    // THE SETTLE CUT. main.js's settleAfterBuild() runs solver steps until the level goes
    // quiet, so loadLevel() on a DROP RIG resolves with everything already on the floor and
    // the fall unwatchable. Budget-cutting the settle hands the level over N steps after the
    // build, mid-air, with tick rebased to 0 — from there SS.seek() drives it like any other
    // level and filmstrip() can photograph the fall. Probe-side only; the game is untouched.
    if (window.__PW.cut > 0 && --window.__PW.cut === 0) W.phase = 'aiming';
    return t;
  };
}
return { patched: true };`;

export const START = `window.__PW.rows = []; window.__PW.on = true; return true;`;
/** Hand the next level over `n` solver steps after build, before it has settled. */
export const CUT = (n) => `window.__PW.cut = ${n}; window.__PW.on = true; return true;`;
export const STOP  = `window.__PW.on = false; return window.__PW.rows.length;`;
export const DUMP  = `const r = window.__PW.rows; window.__PW.on = false; window.__PW.rows = []; return r;`;

export const MASSES = `
const W = SS.__world, out = [];
for (const b of W.blocks) if (!b.dead) out.push({ kind:'block', mat:b.matName, w:+b.w.toFixed(2), h:+b.h.toFixed(2),
  vol:+(b.w*b.h*b.depth).toFixed(3), mass:+b.body.mass().toFixed(4) });
for (const v of W.villains) if (!v.dead) out.push({ kind:'villain', mat:'villain', r:v.radius,
  vol:+((4/3)*Math.PI*v.radius**3).toFixed(3), mass:+v.body.mass().toFixed(4) });
for (const p of W.projectiles) if (!p.dead) out.push({ kind:'ammo', mat:'ammo', r:p.radius,
  vol:+((4/3)*Math.PI*p.radius**3).toFixed(3), mass:+p.body.mass().toFixed(4) });
return out;`;

const FIXED = 1 / 120;
export const ms = (ticks) => Math.round(ticks * FIXED * 1000);

/** rows -> per-body tracks, indexed by entity id. Frame index i is solver step i. */
export function tracks(rows) {
  const byId = new Map();
  rows.forEach((row, i) => {
    for (const [kind, mat, id, x, y, vx, vy, az, sleeping, mass] of row) {
      let t = byId.get(id);
      if (!t) byId.set(id, t = { id, kind, mat, mass, first: i, s: [] });
      t.s.push({ i, x, y, vx, vy, az, sleeping });
    }
  });
  return [...byId.values()];
}

/**
 * How a single body fell, landed and came to rest.
 *
 * Two of these are deliberately NOT the obvious measurement:
 *  · `cor` is the coefficient of restitution taken from the velocity reversal at first
 *    contact, not from how high the thing got afterwards. "Peak height after landing" is
 *    dominated by the block TIPPING up over its own corner — for a 0.90 cube dropped at
 *    0.35 rad that geometric term alone is 0.127 m, which is why the first version of this
 *    probe reported wood, glass and stone rebounding 0.127 / 0.122 / 0.126 and called them
 *    identical. They are not; the tip was drowning the signal.
 *  · `slideM` is measured from FIRST CONTACT, not from the release point, for the same
 *    reason: everything falls the same distance, so including the fall adds a constant to
 *    every material and shrinks the ratio between them.
 */
export function dropMetrics(tr) {
  const s = tr.s, n = s.length;
  const y0 = s[0].y;
  // FIRST CONTACT = the first step whose vertical acceleration is not free fall.
  const GDT = -9.81 * 2.4 / 120;
  let iLand = -1;
  for (let i = 1; i < n; i++) {
    if (s[i - 1].vy < -0.8 && (s[i].vy - s[i - 1].vy) > GDT * 0.4) { iLand = i; break; }
  }
  if (iLand < 0) for (let i = 1; i < n; i++) if (s[i - 1].vy < -0.5 && s[i].vy >= -0.05) { iLand = i; break; }
  const vIn = iLand > 0 ? Math.abs(s[iLand - 1].vy) : 0;
  const impactSpeed = iLand > 0 ? Math.hypot(s[iLand - 1].vx, s[iLand - 1].vy) : 0;
  // rebound: the best upward velocity inside 80 ms of the first contact
  let vOut = 0;
  for (let i = iLand; i >= 0 && i < Math.min(n, iLand + 10); i++) vOut = Math.max(vOut, s[i].vy);
  const yRest = s[n - 1].y;
  let yPeak = -1e9, bounces = 0, prevVy = 0;
  for (let i = Math.max(iLand, 1); i < n; i++) {
    if (s[i].y > yPeak) yPeak = s[i].y;
    if (prevVy < -0.35 && s[i].vy > 0.35) bounces++;
    prevVy = s[i].vy;
  }
  let iRest = 0;
  for (let i = n - 1; i >= 0; i--) {
    const still = Math.hypot(s[i].vx, s[i].vy) < 0.06 && Math.abs(s[i].az) < 0.12;
    if (!still) { iRest = Math.min(i + 1, n - 1); break; }
  }
  let iSleep = -1;
  for (let i = 0; i < n; i++) if (s[i].sleeping) { iSleep = i; break; }
  // SPIN: total rotation swept after the first contact, in degrees, and how long |w| stays
  // above a visible 0.6 rad/s. "Time to fall to a fifth of the peak" was useless — every
  // material flops flat inside two frames, so it read 8 ms for all three; what actually
  // differs is how far the thing keeps turning afterwards.
  let wPeak = 0, iw = iLand < 0 ? 0 : iLand, sweep = 0, spinTicks = 0;
  for (let i = Math.max(iLand, 0); i < n; i++) {
    const w = Math.abs(s[i].az);
    if (w > wPeak) { wPeak = w; iw = i; }
    sweep += w * (1 / 120);
    if (w > 0.6) spinTicks++;
  }
  const iSpinEnd = iw + spinTicks;
  return {
    mat: tr.mat, kind: tr.kind, mass: +tr.mass.toFixed(3),
    landMs: iLand < 0 ? null : ms(iLand),
    hitV: +impactSpeed.toFixed(2),
    cor: vIn > 0.5 ? +(vOut / vIn).toFixed(3) : null,
    bounceM: +(yPeak - yRest).toFixed(3),
    bounces,
    slideM: iLand < 0 ? null : +Math.abs(s[n - 1].x - s[iLand].x).toFixed(3),
    fellM: +(y0 - yRest).toFixed(3),
    wPeak: +wPeak.toFixed(2),
    spinDeg: Math.round(sweep * 180 / Math.PI),
    spinMs: ms(spinTicks),
    restMs: ms(iRest),
    sleepMs: iSleep < 0 ? null : ms(iSleep),
  };
}

export const pad = (v, w) => String(v).padStart(w);
export function table(rows, cols) {
  const head = cols.map(c => pad(c.h, c.w)).join(' ');
  const body = rows.map(r => cols.map(c => pad(c.f ? c.f(r) : r[c.k], c.w)).join(' '));
  return [head, '-'.repeat(head.length), ...body].join('\n');
}
