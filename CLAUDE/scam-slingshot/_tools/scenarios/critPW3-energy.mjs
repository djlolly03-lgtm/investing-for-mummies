/**
 * PW ROUND 3 — INDEPENDENT CRITIC ENERGY AUDIT.
 *
 * Written from scratch by the critic. Nothing here is shared with the builder's instrument.
 *
 * Method
 *  - Fixed cohort BY IDENTITY: the rigid bodies that exist at first ammo contact AND are still
 *    valid at contact+2000 ms, minus the projectile. Births (debris) and deaths (fractured
 *    blocks, popped villains) are excluded from the whole series, so no per-step delta can be
 *    an artefact of the population changing.
 *  - TOTAL MECHANICAL energy: KE_lin + KE_rot + PE (m * |g| * gravityScale * y). Because PE is
 *    inside the sum, gravity's own release is subtracted by construction: under gravity alone
 *    this quantity is conserved, so any rise is contact work or an authored write.
 *  - Per SOLVER step, sampled from physics.onStep (the real solver clock, not rAF).
 *  - Every velocity/position WRITE to a rigid body is intercepted on the Rapier prototype and
 *    priced in joules, with its call-site captured, so each step's jump is attributable.
 *  - Two independently measured noise floors: 240 idle steps on a settled level, and every
 *    step of the dart's flight before it touches anything.
 */

const G = 9.81 * 2.4;

const PAGE_SETUP = `
window.__CR = (() => {
  const SS = window.SS, ph = SS.__physics, w = SS.__world;
  const G = ${G};

  function E(b) {
    const m = b.mass();
    const v = b.linvel(), av = b.angvel(), t = b.translation(), pi = b.principalInertia();
    return 0.5 * m * (v.x*v.x + v.y*v.y + v.z*v.z)
         + 0.5 * (pi.z * av.z*av.z + pi.x * av.x*av.x + pi.y * av.y*av.y)
         + m * G * b.gravityScale() * t.y;
  }

  // ---- write interception -------------------------------------------------
  const anyBody = w.entities.find(e => e.body).body;
  const proto = Object.getPrototypeOf(anyBody);
  const VEL_WRITES = ['setLinvel','setAngvel','applyImpulse','applyImpulseAtPoint',
                      'applyTorqueImpulse','setTranslation','setRotation'];
  const DEFERRED  = ['addForce','addForceAtPoint','addTorque'];
  let ledger = null;   // { dE, calls, byFn, sites } accumulated since the last sample
  const orig = {};
  function freshLedger() { return { dE: 0, dEpos: 0, calls: 0, byFn: {}, sites: [] }; }
  for (const fn of VEL_WRITES) {
    orig[fn] = proto[fn];
    proto[fn] = function (...a) {
      if (!ledger) return orig[fn].apply(this, a);
      let before = 0, ok = true;
      try { before = E(this); } catch (_) { ok = false; }
      const r = orig[fn].apply(this, a);
      if (ok) {
        let after = 0;
        try { after = E(this); } catch (_) { return r; }
        const d = after - before;
        ledger.dE += d; if (d > 0) ledger.dEpos += d;
        ledger.calls++;
        ledger.byFn[fn] = (ledger.byFn[fn] || 0) + d;
        if (Math.abs(d) > 0.05) {
          const st = (new Error()).stack.split('\\n').slice(2, 6)
            .map(s => s.trim().replace(/^at\\s+/, '').replace(/https?:\\/\\/[^/]+\\/scam-slingshot\\//, ''))
            .join(' <- ');
          ledger.sites.push({ fn, d: +d.toFixed(3), tag: (this.userData && this.userData.tag) || '', st });
        }
      }
      return r;
    };
  }
  for (const fn of DEFERRED) {
    orig[fn] = proto[fn];
    proto[fn] = function (...a) {
      if (ledger) { ledger.byFn[fn] = (ledger.byFn[fn] || 0) + 1; }
      return orig[fn].apply(this, a);
    };
  }

  // ---- sampler ------------------------------------------------------------
  let series = null, cohort = null, dartBody = null, unsub = null;

  function sampleOnce(tick) {
    const per = {};
    for (const e of cohort) {
      if (e.dead || !e.body) continue;
      let ok = true, ev = 0;
      try { if (!e.body.isValid()) ok = false; else ev = E(e.body); } catch (_) { ok = false; }
      if (ok) per[e.__ch] = ev;
    }
    let dartE = null, dartV = null;
    if (dartBody) {
      try {
        if (dartBody.isValid()) { dartE = E(dartBody); const v = dartBody.linvel(); dartV = [v.x, v.y]; }
      } catch (_) {}
    }
    const led = ledger || freshLedger();
    ledger = freshLedger();
    series.push({ tick, per, dartE, dartV,
                  wE: +led.dE.toFixed(4), wEpos: +led.dEpos.toFixed(4),
                  wN: led.calls, byFn: led.byFn, sites: led.sites });
  }

  return {
    E,
    /** begin recording: cohort = every dynamic body except the projectile, snapshotted now */
    begin(opts) {
      opts = opts || {};
      let ch = 0;
      cohort = w.entities.filter(e => e.body && !e.dead && e.body.isDynamic() && e.tag !== 'ammo');
      cohort.forEach(e => { e.__ch = 'h' + (ch++) + ':' + e.tag; });
      dartBody = opts.dart ? opts.dart : (w.projectiles && w.projectiles[0] && w.projectiles[0].body) || null;
      series = [];
      ledger = freshLedger();
      unsub = ph.onStep(sampleOnce);
      sampleOnce(ph.tick);      // t0 sample
      return { cohort: cohort.length, tick: ph.tick, dart: !!dartBody };
    },
    end() { if (unsub) unsub(); unsub = null; ledger = null; const s = series; series = null; return s; },
    peek() { return series ? series.length : 0; },
    cohortTags() { return cohort ? cohort.map(e => e.__ch) : []; },
    cohortPose() {
      const out = {};
      for (const e of cohort) {
        if (e.dead || !e.body) continue;
        try { const t = e.body.translation(), r = e.body.rotation();
              out[e.__ch] = [t.x, t.y, 2 * Math.atan2(r.z, r.w)]; } catch (_) {}
      }
      return out;
    },
  };
})();
`;

// -------------------------------------------------------------------------------------------
function summarise(series) {
  // cohort = keys present in EVERY sample (identity-stable, births/deaths excluded)
  const keys = Object.keys(series[0].per).filter(k => series.every(s => k in s.per));
  const tot = (s) => keys.reduce((a, k) => a + s.per[k], 0);
  const E = series.map(tot);
  const d = [];
  for (let i = 1; i < E.length; i++) d.push({ i, tick: series[i].tick, dE: E[i] - E[i - 1], s: series[i] });
  return { keys, E, d, dropped: Object.keys(series[0].per).length - keys.length };
}
const q = (a, p) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const f = (n, k = 2) => (n === null || n === undefined || Number.isNaN(n) ? 'n/a' : n.toFixed(k));

export default async ({ game, state, aimPx, dragShot, filmstrip, shot }) => {
  const SHOTS = [[0.30, 0.90], [0.32, 0.94], [0.28, 0.92]];
  const report = { shots: [], idle: null, hooks: null };

  for (const [angle, power] of SHOTS) {
    // ---- deterministic rebuild, frozen BEFORE anything can wall-clock -----------------
    await game(`SS.freeze(); await SS.seed(7); SS.freeze();`);
    await game(PAGE_SETUP);

    // ---- NOISE FLOOR A: 240 idle steps on the settled, untouched level ----------------
    const idle = await game(`
      const CR = window.__CR;
      CR.begin({});
      for (let i = 0; i < 240; i++) SS.stepOnce();
      return CR.end();
    `);
    const si = summarise(idle);
    const idleAbs = si.d.map(x => Math.abs(x.dE));
    const idleFloor = { maxAbs: Math.max(...idleAbs), p99: q(idleAbs, 0.99), net: si.E[si.E.length - 1] - si.E[0],
                        writes: idle.reduce((a, s) => a + s.wN, 0), writeE: idle.reduce((a, s) => a + s.wE, 0) };

    // ---- fire, through the real pointer path ------------------------------------------
    const drag = await dragShot(angle, power, { steps: 6 });
    const rel = await game(`return SS.release();`);

    // ---- record from release; find first ammo contact from the dart's own ballistics ---
    const raw = await game(`
      const CR = window.__CR, w = SS.__world, ph = SS.__physics;
      CR.begin({});
      for (let i = 0; i < 420; i++) SS.stepOnce();     // 3.5 s of solver time
      return { series: CR.end(), pose: CR.cohortPose(), st: await SS.state(),
               keys: CR.cohortTags() };
    `);
    const series = raw.series;
    const s = summarise(series);

    // first contact = first step where the dart's velocity change departs from pure gravity
    const dt = 1 / 120, gdv = -9.81 * 2.4 * dt;
    let contact = -1;
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1].dartV, b = series[i].dartV;
      if (!a || !b) continue;
      const dvx = b[0] - a[0], dvy = b[1] - a[1] - gdv;
      if (Math.hypot(dvx, dvy) > 0.35) { contact = i; break; }
    }
    // ---- NOISE FLOOR B: the cohort while the dart is in flight, before contact ---------
    const flight = s.d.filter(x => x.i < contact && x.i > 2).map(x => Math.abs(x.dE));
    const flightFloor = { n: flight.length, maxAbs: flight.length ? Math.max(...flight) : NaN,
                          p99: q(flight, 0.99) };

    // ---- the 2 s window after contact --------------------------------------------------
    const win = s.d.filter(x => x.i > contact && x.i <= contact + 240);
    const netGain = s.E[Math.min(s.E.length - 1, contact + 240)] - s.E[contact];
    const pos = win.map(x => x.dE).filter(v => v > 0);
    const biggest = win.reduce((m, x) => (x.dE > m.dE ? x : m), { dE: -1e9 });
    const dartAt = (i) => (series[i] && series[i].dartE !== null ? series[i].dartE : null);
    const dartDelivered = (dartAt(contact) !== null && dartAt(Math.min(series.length - 1, contact + 240)) !== null)
      ? dartAt(contact) - dartAt(Math.min(series.length - 1, contact + 240)) : null;

    // authored-write ledger inside the window
    const wPos = win.reduce((a, x) => a + x.s.wEpos, 0);
    const wNet = win.reduce((a, x) => a + x.s.wE, 0);
    const wN = win.reduce((a, x) => a + x.s.wN, 0);
    const allSites = [];
    for (const x of win) for (const st of x.s.sites) allSites.push({ tick: x.tick, ...st });
    allSites.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

    // top 8 jolts, each with its own write ledger
    const top = [...win].sort((a, b) => b.dE - a.dE).slice(0, 8).map(x => ({
      i: x.i, tSinceContact: Math.round((x.i - contact) * 1000 / 120), dE: +x.dE.toFixed(3),
      writeE: x.s.wE, writePos: x.s.wEpos, writeN: x.s.wN,
      byFn: x.s.byFn, sites: x.s.sites.slice(0, 4),
    }));

    report.shots.push({
      shot: `${angle}@${power}`, drag: { angle: drag.angle, clamped: drag.clamped, grabbable: drag.grabbable },
      rel: { speed: rel.speed, exitSpeed: rel.exitSpeed },
      cohortStable: s.keys.length, cohortDropped: s.dropped,
      contactStep: contact, contactMs: contact === -1 ? null : Math.round(contact * 1000 / 120),
      idleFloor, flightFloor,
      dartE_atContact: dartAt(contact), dartDelivered,
      netGain2s: netGain,
      positiveSum2s: pos.reduce((a, b) => a + b, 0),
      biggestJolt: { dE: biggest.dE, tSinceContact: Math.round((biggest.i - contact) * 1000 / 120),
                     writeE: biggest.s && biggest.s.wE, writeN: biggest.s && biggest.s.wN },
      writes2s: { n: wN, netE: +wNet.toFixed(3), posE: +wPos.toFixed(3) },
      topJolts: top,
      topSites: allSites.slice(0, 12),
      finalState: raw.st,
    });

    console.log(`\n=== SHOT ${angle}@${power} ==============================================`);
    console.log(`cohort ${s.keys.length} stable (${s.dropped} died/born-excluded)  contact @step ${contact} (${Math.round(contact*1000/120)} ms after release)`);
    console.log(`NOISE FLOOR idle 240 steps : max|dE| ${f(idleFloor.maxAbs,4)} J   p99 ${f(idleFloor.p99,4)} J   net ${f(idleFloor.net,4)} J   writes ${idleFloor.writes} (${f(idleFloor.writeE,4)} J)`);
    console.log(`NOISE FLOOR dart in flight : n=${flightFloor.n}  max|dE| ${f(flightFloor.maxAbs,4)} J   p99 ${f(flightFloor.p99,4)} J`);
    console.log(`DART mech energy at contact ${f(dartAt(contact))} J ; lost over the 2 s window ${f(dartDelivered)} J`);
    console.log(`COHORT net mechanical change over 2 s : ${f(netGain)} J   (sum of positive steps ${f(pos.reduce((a,b)=>a+b,0))} J)`);
    console.log(`LARGEST single-step jolt : ${f(biggest.dE,3)} J at contact+${Math.round((biggest.i-contact)*1000/120)} ms  [writes that step: ${biggest.s ? biggest.s.wN : '?'} worth ${f(biggest.s ? biggest.s.wE : 0,3)} J]`);
    console.log(`AUTHORED WRITES in window: ${wN} calls, net ${f(wNet,3)} J, positive ${f(wPos,3)} J`);
    console.log('TOP JOLTS:');
    for (const t of top) console.log(`   +${f(t.dE,3)} J @ +${t.tSinceContact} ms | writes ${t.writeN} = ${f(t.writeE,3)} J (+${f(t.writePos,3)}) | ${JSON.stringify(t.byFn)}`);
    if (allSites.length) {
      console.log('TOP PRICED WRITE SITES:');
      for (const st of allSites.slice(0, 10)) console.log(`   ${st.d>0?'+':''}${st.d} J  ${st.fn}  @tick ${st.tick}  ${st.st}`);
    } else console.log('TOP PRICED WRITE SITES: none above 0.05 J');
  }

  console.log('\nJSON ' + JSON.stringify(report.shots.map(x => ({
    shot: x.shot, contactMs: x.contactMs, cohort: x.cohortStable,
    idleMax: +f(x.idleFloor.maxAbs, 4), flightMax: +f(x.flightFloor.maxAbs, 4),
    dartAtContact: +f(x.dartE_atContact), dartDelivered: +f(x.dartDelivered),
    net2s: +f(x.netGain2s), posSum2s: +f(x.positiveSum2s),
    biggest: +f(x.biggestJolt.dE, 3), writesN: x.writes2s.n, writesE: x.writes2s.netE, writesPos: x.writes2s.posE,
  }))));
};
