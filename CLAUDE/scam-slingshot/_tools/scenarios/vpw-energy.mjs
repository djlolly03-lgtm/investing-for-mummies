/**
 * vpw-energy.mjs — INDEPENDENT ENERGY AUDIT. Built from scratch by the verifier.
 *
 * NOT derived from any existing instrument in this repo.
 *
 * Method
 *   E(body) = 1/2 m (vx^2 + vhy^2 + vz^2) + 1/2 Iz wz^2 + m*|g|*y
 *   with vhy = vy + 0.5*g*dt  — the HALF-STEP vertical velocity. This is the shadow energy
 *   that symplectic (semi-implicit) Euler conserves EXACTLY in free flight; using the raw
 *   end-of-step vy instead builds in a systematic -0.5*m*g^2*dt^2 per step per falling
 *   kilogram (= -0.0192 J/kg/step here), which over 240 steps is tens of joules of fake
 *   dissipation that would MASK created energy. Verified below on an idle level and in flight.
 *
 *   Cohort is fixed by rapier body handle. Per solver step the delta is taken over the
 *   INTERSECTION of handles present before and after that step, so a body that is born
 *   (debris, the death-prop cheque) or dies (a fractured block) contributes nothing to that
 *   step's delta. Gravity is inside E as potential, so its release is subtracted by
 *   construction.
 *
 *   One solver step at a time via SS.stepOnce(), sampled between every step, page-side.
 */

const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.24, 0.92], [0.32, 0.94], [0.20, 1.00]];
const POST_STEPS = 240;                 // 2.000 s at FIXED = 1/120

const SETUP = `
  let MOD = null;
  for (const u of ['/scam-slingshot/src/level/structure.js',
                   new URL('src/level/structure.js', location.href).href]) {
    try { MOD = await import(u); if (MOD && MOD.structure) break; } catch (e) { MOD = null; }
  }
  if (!MOD || !MOD.structure) throw new Error('could not reach structure module');
  window.__S = MOD.structure;

  const B = SS.__world.blocks[0].constructor.prototype;
  if (!B.__vpw) {
    B.__vpw = true;
    const oi = B.onImpact, of = B.fracture;
    B.onImpact = function (imp, other, pt, app) {
      const t = SS.tick();
      if (other?.tag === 'ammo') {
        if (window.__ammoHit == null && app >= 1.2) window.__ammoHit = t;
        window.__ammoTicks.push(t);
      }
      window.__allTicks.push(t);
      return oi.call(this, imp, other, pt, app);
    };
    B.fracture = function (imp, pt) {
      const t = SS.tick(); const k = of.call(this, imp, pt);
      window.__frac.push({ tick: t, mat: this.matName, imp: +imp.toFixed(2), kids: k.length });
      return k;
    };
  }
  window.__ammoHit = null; window.__ammoTicks = []; window.__allTicks = []; window.__frac = [];

  // --- the instrument -------------------------------------------------------
  window.__ES = function () {
    const ph = SS.__physics, W = ph.world;
    const g = W.gravity.y, dt = W.timestep, gm = -g;
    const tagOf = new Map();
    for (const e of SS.__world.entities) if (e.body) tagOf.set(e.body.handle, e.tag ?? '?');
    const m = new Map();
    let tot = 0;
    W.forEachRigidBody(b => {
      if (b.bodyType() !== 0) return;                       // dynamic only
      const t = b.translation(), v = b.linvel(), w = b.angvel();
      const mass = b.mass(), Iz = b.principalInertia().z;
      const vhy = v.y + 0.5 * g * dt;
      const e = 0.5 * mass * (v.x * v.x + vhy * vhy + v.z * v.z)
              + 0.5 * Iz * w.z * w.z + mass * gm * t.y;
      m.set(b.handle, e); tot += e;
      if (!window.__tagCache.has(b.handle)) window.__tagCache.set(b.handle, tagOf.get(b.handle) ?? '?');
    });
    return { m, tot };
  };
  window.__tagCache = new Map();

  window.__ST = function () {
    const S = window.__S, s = S.stats;
    return { spentJ: s.spentJ, creditJ: s.creditJ, poolPeak: s.poolPeak, pool: S.pool,
             racks: s.racks, tips: s.tips, hinges: s.hinges, loads: s.loads, hops: s.hops,
             collapses: s.collapses, detached: s.detached, starved: s.starved,
             byJ: { ...s.byJ } };
  };

  /**
   * Run n solver steps one at a time, sampling energy between each.
   * Returns per-step rows. dE is over the intersection cohort.
   */
  window.__RUN = function (n, stopOnHit) {
    const rows = [];
    let prev = window.__ES();
    for (let i = 0; i < n; i++) {
      const st0 = window.__ST();
      const nf0 = window.__frac.length, na0 = window.__ammoTicks.length;
      SS.stepOnce();
      const cur = window.__ES();
      const st1 = window.__ST();
      let dE = 0, born = 0, died = 0, bornE = 0, diedE = 0;
      const per = [];
      for (const [h, e] of cur.m) {
        if (prev.m.has(h)) { const d = e - prev.m.get(h); dE += d; if (Math.abs(d) > 0.05) per.push([h, d]); }
        else { born++; bornE += e; }
      }
      for (const [h, e] of prev.m) if (!cur.m.has(h)) { died++; diedE += e; }
      per.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      rows.push({
        tick: SS.tick(), dE,
        dSpent: st1.spentJ - st0.spentJ, dCredit: st1.creditJ - st0.creditJ, pool: st1.pool,
        dByJ: Object.fromEntries(Object.keys(st1.byJ).map(k => [k, +(st1.byJ[k] - st0.byJ[k]).toFixed(4)])
                                 .filter(([, v]) => v !== 0)),
        ev: { racks: st1.racks - st0.racks, tips: st1.tips - st0.tips, hinges: st1.hinges - st0.hinges,
              loads: st1.loads - st0.loads, hops: st1.hops - st0.hops,
              collapses: st1.collapses - st0.collapses, detached: st1.detached - st0.detached },
        frac: window.__frac.length - nf0, ammoC: window.__ammoTicks.length - na0,
        born, died, bornE, diedE,
        top: per.slice(0, 3).map(([h, d]) => [window.__tagCache.get(h) ?? '?', +d.toFixed(3)]),
        n: cur.m.size,
      });
      prev = cur;
      if (stopOnHit && window.__ammoHit != null) break;
    }
    return rows;
  };
  return true;
`;

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y, a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

const FRAME = [
  ['botBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const stat = (a) => {
  if (!a.length) return { n: 0 };
  const s = [...a].sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return { n: a.length, min: s[0], p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1],
           sum: a.reduce((x, y) => x + y, 0) };
};
const f = (x, d = 2) => (x == null ? 'n/a' : Number(x).toFixed(d));

async function runShot({ game, state }, ang, pow, { structOff = false } = {}) {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(SETUP);
  await game('window.__S.enabled = args[0]; return window.__S.enabled;', !structOff);

  const base = await game(SNAP);
  const byId = new Map(base.map(b => [b.id, b]));
  const N0 = base.length;

  // ---- IDLE FLOOR: 120 steps of the settled level, nothing fired ----
  const idle = await game('return window.__RUN(120, false);');

  // ---- fire ----
  const rel = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
  if (!rel.ok) return { ang, pow, fail: rel.reason };

  // ---- FLIGHT FLOOR: step until the first genuine ammo contact ----
  const flight = await game('return window.__RUN(900, true);');
  const hit = await game('return window.__ammoHit;');
  if (hit == null) return { ang, pow, fail: 'no ammo contact in 900 steps', rel };

  // dart KE the step before contact
  const dart = await game(`
    const p = SS.__world.projectiles.filter(x=>!x.dead && x.body);
    return p.map(x => { const b=x.body, v=b.linvel(), w=b.angvel(), t=b.translation();
      return { m:b.mass(), sp:Math.hypot(v.x,v.y), ke:0.5*b.mass()*(v.x*v.x+v.y*v.y),
               rot:0.5*b.principalInertia().z*w.z*w.z, y:t.y }; });`);

  // ---- THE WINDOW: 2 s from first contact, one solver step at a time ----
  const post = await game('return window.__RUN(args[0], false);', POST_STEPS);
  const stEnd = await game('return window.__ST();');

  // propagation at impact+800 ms (96 steps in) — read off the same run
  const at800 = await game('return window.__prop800;').catch(() => null);
  return { ang, pow, rel, hit, dart, idle, flight, post, stEnd, base, byId: [...byId], N0, structOff };
}

export default async ({ game, state }) => {
  console.log('=== INDEPENDENT ENERGY AUDIT (verifier-built) ===');
  console.log('E = 1/2 m(vx^2 + vhy^2 + vz^2) + 1/2 Iz wz^2 + m|g|y ; vhy = vy + 0.5 g dt');
  console.log('cohort = rapier handles present BEFORE and AFTER each solver step\n');

  const summary = [];
  for (const [ang, pow] of SHOTS) {
    for (const structOff of [false, true]) {
      const r = await runShot({ game, state }, ang, pow, { structOff });
      if (r.fail) { console.log(`SHOT ${ang}@${pow} ${structOff ? '[STRUCT OFF]' : ''} FAIL: ${r.fail}`); continue; }

      const tag = structOff ? 'STRUCT-OFF' : 'STRUCT-ON ';
      const idleD = r.idle.map(x => x.dE);
      const flyD = r.flight.map(x => x.dE);
      const postD = r.post.map(x => x.dE);
      const pos = postD.filter(x => x > 0);
      const si = stat(idleD), sf = stat(flyD), sp = stat(postD);

      const dartKE = r.dart.length ? r.dart[0].ke + r.dart[0].rot : null;
      const fracs = r.post.reduce((a, b) => a + b.frac, 0);

      console.log(`\n--- ${tag}  shot ${ang}@${pow}  contact at tick ${r.hit} ---`);
      console.log(`  dart at contact: m=${f(r.dart[0]?.m, 3)} kg  v=${f(r.dart[0]?.sp)} m/s  KE=${f(dartKE)} J`);
      console.log(`  IDLE floor   (120 steps, settled): max +${f(si.max, 3)}  p99 ${f(si.p99, 3)}  net ${f(si.sum, 2)}`);
      console.log(`  FLIGHT floor (${sf.n} steps, dart airborne): max +${f(sf.max, 3)}  p99 ${f(sf.p99, 3)}  net ${f(sf.sum, 2)}`);
      console.log(`  POST-IMPACT 2 s (${sp.n} steps): NET ${f(sp.sum)} J   SUM(+dE) ${f(stat(pos).sum)} J   ` +
                  `worst step +${f(sp.max, 3)} J   p50(+) ${f(stat(pos).p50, 3)}`);
      console.log(`  structure ledger: creditJ ${f(r.stEnd.creditJ)}  spentJ ${f(r.stEnd.spentJ)}  ` +
                  `poolPeak ${f(r.stEnd.poolPeak)}  starved ${r.stEnd.starved}  ` +
                  `racks ${r.stEnd.racks} tips ${r.stEnd.tips} hinges ${r.stEnd.hinges} loads ${r.stEnd.loads} hops ${r.stEnd.hops}`);
      console.log(`  fractures in window: ${fracs}`);

      // --- jolt attribution ---
      const FLOOR = Math.max(si.max, sf.max, 0.5);
      const jolts = r.post.map((x, i) => ({ ...x, i })).filter(x => x.dE > FLOOR)
                          .sort((a, b) => b.dE - a.dE);
      console.log(`  NOISE FLOOR used = ${f(FLOOR, 3)} J (max of idle-max, flight-max, 0.5)`);
      console.log(`  steps above floor: ${jolts.length} / ${sp.n}   sum ${f(jolts.reduce((a, b) => a + b.dE, 0))} J`);
      for (const j of jolts.slice(0, 12)) {
        const ms = (j.i * 1000 / 120).toFixed(0);
        console.log(`    +${String(ms).padStart(4)}ms  dE ${f(j.dE, 3).padStart(8)}  ` +
          `spent ${f(j.dSpent, 3).padStart(7)} ${JSON.stringify(j.dByJ)}  ` +
          `ev ${JSON.stringify(j.ev).replace(/"|:0,?/g, '').replace(/[{}]/g, '') || '-'}  ` +
          `frac ${j.frac} ammoC ${j.ammoC} born ${j.born}/${f(j.bornE, 1)}J died ${j.died}  ` +
          `top ${JSON.stringify(j.top)}`);
      }
      summary.push({ ang, pow, structOff, net: sp.sum, sumPos: stat(pos).sum, worst: sp.max,
                     dartKE, credit: r.stEnd.creditJ, spent: r.stEnd.spentJ,
                     idleMax: si.max, flyMax: sf.max, floor: FLOOR, jolts: jolts.length, fracs });
    }
  }

  console.log('\n\n=== SUMMARY TABLE ===');
  console.log('shot        mode        dartKE   NET dE   SUM(+dE)  worst+  idleMax flyMax  credit  spent  frac');
  for (const s of summary) {
    console.log(`${s.ang}@${s.pow}  ${s.structOff ? 'STRUCT-OFF' : 'STRUCT-ON '}  ` +
      `${f(s.dartKE).padStart(6)}  ${f(s.net).padStart(7)}  ${f(s.sumPos).padStart(8)}  ` +
      `${f(s.worst, 2).padStart(6)}  ${f(s.idleMax, 3).padStart(6)} ${f(s.flyMax, 3).padStart(6)}  ` +
      `${f(s.credit).padStart(6)} ${f(s.spent).padStart(6)}  ${s.fracs}`);
  }
};
