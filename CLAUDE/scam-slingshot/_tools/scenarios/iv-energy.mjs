/**
 * INDEPENDENT VERIFIER — energy audit built from scratch.
 *
 * Method (nothing here reads structure.js's own ledger except as a cross-check):
 *   1. Patch RigidBody.prototype's write methods (applyImpulse*, applyTorqueImpulse, setLinvel,
 *      setAngvel, addForce*, setTranslation, setRotation) and measure the body's mechanical
 *      energy IMMEDIATELY before and after each call. That is the exact energy the CODE put in,
 *      independent of anybody's accounting. Each write carries a JS stack so it can be blamed.
 *   2. Register physics.onStep and snapshot every dynamic body by ENTITY ID every solver step:
 *      m, Iz, y, vx, vy, vz, wz, gravityScale.
 *   3. Cohort = entity ids alive at EVERY sampled step of the window (births and deaths excluded).
 *   4. E = 1/2 m|v|^2 + 1/2 Iz wz^2 + m g_eff y   -> gravity does no net work on E, i.e. gravity's
 *      potential release is subtracted by construction.
 *   5. Per-solver-step dE for the cohort; each interval is labelled with the writes inside it, so
 *      dE_solver = dE_total - sum(write dE).
 *
 * Args: --angle a --power p --seed n --ms 2000 --nostruct  --tag name
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);

const INSTALL = `
const SS = window.SS, ph = SS.__physics, W = SS.__world;
const G = 9.81 * 2.4;
const IV = window.__IV = { on:false, writes:[], samples:[], impacts:[], off:null, credits:[] };
// ---- 1. patch every rigid-body write, measure real dE around it -----------------------------
let proto = null;
ph.world.forEachRigidBody(b => { if (!proto) proto = Object.getPrototypeOf(b); });
const NAMES = ['applyImpulse','applyImpulseAtPoint','applyTorqueImpulse','setLinvel','setAngvel',
               'addForce','addForceAtPoint','addTorque','setTranslation','setRotation'];
if (!proto.__ivPatched) {
  proto.__ivPatched = true;
  for (const name of NAMES) {
    const orig = proto[name];
    if (typeof orig !== 'function') continue;
    proto[name] = function (...args) {
      const IVv = window.__IV;
      if (!IVv || !IVv.on) return orig.apply(this, args);
      let dyn = false; try { dyn = this.isDynamic(); } catch (e) {}
      if (!dyn) return orig.apply(this, args);
      const m = this.mass(), I = this.principalInertia().z, gs = this.gravityScale();
      const v0 = this.linvel(), w0 = this.angvel(), t0 = this.translation();
      const e0 = 0.5*m*(v0.x*v0.x+v0.y*v0.y+v0.z*v0.z) + 0.5*I*w0.z*w0.z + m*G*gs*t0.y;
      const r = orig.apply(this, args);
      const v1 = this.linvel(), w1 = this.angvel(), t1 = this.translation();
      const e1 = 0.5*m*(v1.x*v1.x+v1.y*v1.y+v1.z*v1.z) + 0.5*I*w1.z*w1.z + m*G*gs*t1.y;
      let src = '?';
      try {
        const st = (new Error()).stack.split('\\n');
        for (let i = 2; i < st.length; i++) {
          if (/\\/src\\//.test(st[i]) && !/rapier/.test(st[i])) { src = st[i].replace(/^\\s*at\\s*/, '').replace(/.*\\/src\\//, 'src/'); break; }
        }
      } catch (e) {}
      IVv.writes.push({ tick: ph.tick, name, h: this.handle, dE: e1 - e0, src });
      return r;
    };
  }
}
// ---- 2. per-solver-step snapshot of every dynamic body, keyed by entity id -------------------
IV.off = ph.onStep((tick) => {
  const rows = [];
  const es = W.entities;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    if (!e.body || e.dead) continue;
    let dyn = false; try { dyn = e.body.isDynamic(); } catch (err) { continue; }
    if (!dyn) continue;
    const b = e.body, v = b.linvel(), w = b.angvel(), t = b.translation();
    rows.push([e.id, b.handle, b.mass(), b.principalInertia().z, b.gravityScale(),
               t.y, v.x, v.y, v.z, w.z, e.tag]);
  }
  const sr = SS.__structure();
  IV.samples.push({ tick, rows, spentJ: sr.creditJ !== undefined ? sr.spentJ : 0,
                    creditJ: sr.creditJ, pool: sr.pool, starved: sr.starved,
                    blocks: W.blocks.filter(b=>!b.dead).length, debris: W.debris.length });
});
// ---- 3. first contact whose source is the ammo (r5 note: never use a movement detector) ------
const BP = Object.getPrototypeOf(W.blocks[0]);
if (!BP.__ivPatched) {
  BP.__ivPatched = true;
  const oi = BP.onImpact;
  BP.onImpact = function (impulse, other, point, approach = 0) {
    const IVv = window.__IV;
    if (IVv && IVv.on) IVv.impacts.push({ tick: ph.tick, id: this.id, mat: this.matName,
      impulse, approach, src: other ? other.tag : null,
      srcSpeed: other ? (other.lastSpeed ?? 0) : 0, blowE: 0.5*impulse*approach });
    return oi.call(this, impulse, other, point, approach);
  };
}
return { patched: true, bodies: 0 };
`;

export default async ({ game, OUT }) => {
  const angle = +arg('angle', 0.30), power = +arg('power', 0.90), seed = +arg('seed', 7);
  const WMS = +arg('ms', 2000), tag = arg('tag', 'shot');
  const nostruct = flag('nostruct');

  await game(`SS.freeze(); await SS.loadLevel('l1');`);
  await game(`SS.seed(args[0]);`, seed);
  const inst = await game(INSTALL);
  if (nostruct) await game(`SS.__world; const m = await import('/scam-slingshot/src/level/structure.js'); m.structure.enabled = false; return true;`);

  // ---------- noise floor A: idle steps, settled level, nothing fired ----------
  await game(`window.__IV.on = true;`);
  await game(`await SS.seek(500);`);
  const idleEnd = await game(`return window.__IV.samples.length;`);

  // ---------- fire ----------
  const rel = await game(`
    const a = SS.aim({ angle: args[0], power: args[1] });
    if (!a || a.ok === false) throw new Error('aim rejected: ' + JSON.stringify(a));
    const r = SS.release();
    if (!r || r.ok === false) throw new Error('release rejected: ' + JSON.stringify(r));
    r.aim = a; r.tick = SS.__physics.tick; return r;
  `);

  // ---------- run out the window ----------
  await game(`await SS.seek(4500);`);

  const raw = await game(`
    const IV = window.__IV; IV.on = false;
    const sr = SS.__structure();
    return { samples: IV.samples, writes: IV.writes, impacts: IV.impacts,
             report: { creditJ: sr.creditJ, spentJ: sr.spentJ, pool: sr.pool, starved: sr.starved,
                       collapses: sr.collapses, racks: sr.racks, tips: sr.tips, hinges: sr.hinges,
                       hops: sr.hops, loads: sr.loads, byJ: sr.byJ },
             state: await SS.state() };
  `);

  const G = 9.81 * 2.4;
  const S = raw.samples;
  const tickOf = new Map(S.map((s, i) => [s.tick, i]));

  // first ammo contact
  const ammoHits = raw.impacts.filter(h => h.src === 'ammo' && h.srcSpeed >= 6);
  const t0tick = ammoHits.length ? ammoHits[0].tick : null;
  if (t0tick == null) { console.log(JSON.stringify({ tag, angle, power, seed, FAIL: 'no ammo contact' })); return; }
  const i0 = tickOf.get(t0tick);
  const steps = Math.round(WMS / 1000 * 120);
  const i1 = Math.min(S.length - 1, i0 + steps);

  // cohort: entity ids present at every step in [i0, i1], excluding ammo
  let cohort = null;
  for (let i = i0; i <= i1; i++) {
    const ids = new Set(S[i].rows.filter(r => r[10] !== 'ammo').map(r => r[0]));
    cohort = cohort === null ? ids : new Set([...cohort].filter(x => ids.has(x)));
  }
  const E = (rows, filt) => {
    let e = 0;
    for (const r of rows) {
      if (!filt(r)) continue;
      const [, , m, I, gs, y, vx, vy, vz, wz] = r;
      e += 0.5 * m * (vx*vx + vy*vy + vz*vz) + 0.5 * I * wz * wz + m * G * gs * y;
    }
    return e;
  };
  const inCohort = r => cohort.has(r[0]);
  const isAmmo = r => r[10] === 'ammo';

  const series = [];
  for (let i = i0; i <= i1; i++) series.push(E(S[i].rows, inCohort));
  const dartE = [];
  for (let i = Math.max(0, i0 - 60); i <= i1; i++) dartE.push({ i, e: E(S[i].rows, isAmmo) });

  // writes bucketed by interval: a write tagged tick n lands between sample n and sample n+1
  const wByTick = new Map();
  for (const w of raw.writes) {
    if (!wByTick.has(w.tick)) wByTick.set(w.tick, []);
    wByTick.get(w.tick).push(w);
  }
  // handle -> entity id, per step (for cohort membership of a write)
  const hId = [];
  for (let i = 0; i < S.length; i++) { const m = new Map(); for (const r of S[i].rows) m.set(r[1], r[0]); hId.push(m); }

  const intervals = [];
  for (let i = i0; i < i1; i++) {
    const dE = series[i - i0 + 1] - series[i - i0];
    const ws = (wByTick.get(S[i].tick) || []).filter(w => cohort.has(hId[i].get(w.h)));
    const wSum = ws.reduce((a, w) => a + w.dE, 0);
    intervals.push({ i, tick: S[i].tick, ms: (S[i].tick - t0tick) / 120 * 1000, dE, wSum, solver: dE - wSum,
                     srcs: ws.map(w => `${w.src}|${w.dE.toFixed(2)}`) });
  }

  // structure-attributed direct injection over the window (all writes on cohort bodies)
  const bySrc = {};
  for (let i = i0; i < i1; i++) {
    for (const w of (wByTick.get(S[i].tick) || [])) {
      const cid = hId[i].get(w.h);
      const key = (cohort.has(cid) ? 'COHORT ' : 'other  ') + w.src;
      bySrc[key] = bySrc[key] || { n: 0, sum: 0, pos: 0, max: 0 };
      bySrc[key].n++; bySrc[key].sum += w.dE;
      if (w.dE > 0) { bySrc[key].pos += w.dE; if (w.dE > bySrc[key].max) bySrc[key].max = w.dE; }
    }
  }

  // idle-step noise floor (steps 1..idleEnd-1, before any shot)
  let idleCohort = null;
  for (let i = 1; i < idleEnd; i++) {
    const ids = new Set(S[i].rows.filter(r => r[10] !== 'ammo').map(r => r[0]));
    idleCohort = idleCohort === null ? ids : new Set([...idleCohort].filter(x => ids.has(x)));
  }
  const idleD = [];
  for (let i = 1; i < idleEnd - 1; i++) idleD.push(E(S[i+1].rows, r => idleCohort.has(r[0])) - E(S[i].rows, r => idleCohort.has(r[0])));

  // flight noise floor: steps between release and first contact, cohort = blocks only
  const relTick = rel.tick;
  const iRel = tickOf.get(relTick) ?? (idleEnd);
  let flyCohort = null;
  for (let i = iRel + 2; i < i0; i++) {
    const ids = new Set(S[i].rows.filter(r => r[10] !== 'ammo').map(r => r[0]));
    flyCohort = flyCohort === null ? ids : new Set([...flyCohort].filter(x => ids.has(x)));
  }
  const flyD = [], flyDart = [];
  if (flyCohort) for (let i = iRel + 2; i < i0 - 1; i++) {
    flyD.push(E(S[i+1].rows, r => flyCohort.has(r[0])) - E(S[i].rows, r => flyCohort.has(r[0])));
    flyDart.push(E(S[i+1].rows, isAmmo) - E(S[i].rows, isAmmo));
  }

  const sorted = intervals.map(x => x.dE).slice().sort((a, b) => b - a);
  const abs = a => a.map(Math.abs);
  const mx = a => a.length ? Math.max(...a) : 0;
  const med = a => { if (!a.length) return 0; const s = a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };

  const dartAt0 = dartE.find(d => d.i === i0);
  const dartMax = Math.max(...dartE.map(d => d.e));
  const dartEnd = dartE[dartE.length - 1];

  const out = {
    tag, angle, power, seed, nostruct,
    release: { speed: rel.speed, exitSpeed: rel.exitSpeed, tick: rel.tick },
    impact: { tick: t0tick, mat: ammoHits[0].mat, impulse: +ammoHits[0].impulse.toFixed(2),
              approach: +ammoHits[0].approach.toFixed(2), blowE: +ammoHits[0].blowE.toFixed(2),
              nAmmoContacts: ammoHits.length,
              creditedBlowE: +ammoHits.reduce((a,h)=>a+h.blowE,0).toFixed(2) },
    dart: { E_at_impact: +(dartAt0 ? dartAt0.e : NaN).toFixed(2), E_peak: +dartMax.toFixed(2),
            E_end: +dartEnd.e.toFixed(2), delivered: +((dartAt0 ? dartAt0.e : 0) - dartEnd.e).toFixed(2) },
    cohort: { n: cohort.size, blocksAtImpact: S[i0].blocks, blocksAtEnd: S[i1].blocks,
              debrisAtEnd: S[i1].debris },
    energy: {
      E_start: +series[0].toFixed(2), E_end: +series[series.length-1].toFixed(2),
      NET_created_2s: +(series[series.length-1] - series[0]).toFixed(2),
      GROSS_positive_steps: +intervals.reduce((a,x)=>a + Math.max(0,x.dE), 0).toFixed(2),
      DIRECT_injected_by_code: +intervals.reduce((a,x)=>a + Math.max(0,x.wSum), 0).toFixed(2),
      SOLVER_residual_positive: +intervals.reduce((a,x)=>a + Math.max(0,x.solver), 0).toFixed(2),
      worstStep_dE: +mx(intervals.map(x=>x.dE)).toFixed(3),
      worstStep_writePart: +mx(intervals.map(x=>x.wSum)).toFixed(3),
      worstStep_solverPart: +mx(intervals.map(x=>x.solver)).toFixed(3),
      medianStep_dE: +med(intervals.map(x=>x.dE)).toFixed(4),
      top10: sorted.slice(0,10).map(v=>+v.toFixed(3)),
    },
    floors: {
      idle_steps: idleD.length, idle_maxAbs: +mx(abs(idleD)).toFixed(6), idle_max: +mx(idleD).toFixed(6),
      flight_steps: flyD.length, flight_maxAbs: +mx(abs(flyD)).toFixed(6),
      flight_dart_maxAbs: +mx(abs(flyDart)).toFixed(6),
    },
    bySrc,
    structureLedger: raw.report,
    finalState: raw.state,
    topIntervals: intervals.slice().sort((a,b)=>b.dE-a.dE).slice(0,14)
      .map(x => ({ ms: +x.ms.toFixed(1), dE: +x.dE.toFixed(2), write: +x.wSum.toFixed(2),
                   solver: +x.solver.toFixed(2), srcs: x.srcs.slice(0,6) })),
  };
  await writeFile(path.join(OUT, `iv-${tag}.json`), JSON.stringify({ ...out, intervals, dartE }, null, 1));
  console.log('IVRESULT ' + JSON.stringify(out));
};
