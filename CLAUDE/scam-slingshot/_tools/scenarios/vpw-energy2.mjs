/**
 * vpw-energy2.mjs — INDEPENDENT ENERGY AUDIT, v2.
 *
 * v1 established the instrument. v2 adds the two things the verdict needs:
 *   - the DART'S OWN energy trajectory, sampled every solver step, so "delivered energy"
 *     is measured (E just before the contact step minus E once it is spent) and not guessed;
 *   - birth/death bookkeeping (debris spawn kick), and the world's asleep fraction at every
 *     jolt, so a late jolt can be told apart from the frame's first reaction.
 */
const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96]];
const POST_STEPS = 240;

const SETUP = `
  let MOD = null;
  for (const u of ['/scam-slingshot/src/level/structure.js',
                   new URL('src/level/structure.js', location.href).href]) {
    try { MOD = await import(u); if (MOD && MOD.structure) break; } catch (e) { MOD = null; }
  }
  if (!MOD || !MOD.structure) throw new Error('could not reach structure module');
  window.__S = MOD.structure;

  const B = SS.__world.blocks[0].constructor.prototype;
  if (!B.__vpw2) {
    B.__vpw2 = true;
    const oi = B.onImpact, of = B.fracture;
    B.onImpact = function (imp, other, pt, app) {
      const t = SS.tick();
      if (other?.tag === 'ammo') {
        if (window.__ammoHit == null && app >= 1.2) window.__ammoHit = t;
        window.__ammoEv.push({ t, imp, app, sp: other.lastSpeed ?? 0, blowE: 0.5*imp*app });
      }
      return oi.call(this, imp, other, pt, app);
    };
    B.fracture = function (imp, pt) {
      const t = SS.tick(); const k = of.call(this, imp, pt);
      window.__frac.push({ t, mat: this.matName, imp: +imp.toFixed(2), kids: k.length });
      return k;
    };
  }
  window.__ammoHit = null; window.__ammoEv = []; window.__frac = []; window.__tagCache = new Map();

  window.__ES = function () {
    const ph = SS.__physics, W = ph.world;
    const g = W.gravity.y, dt = W.timestep, gm = -g;
    const tagOf = new Map();
    for (const e of SS.__world.entities) if (e.body) tagOf.set(e.body.handle, e.tag ?? '?');
    const m = new Map(); let asleep = 0, nd = 0, ammoE = 0;
    W.forEachRigidBody(b => {
      if (b.bodyType() !== 0) return;
      const t = b.translation(), v = b.linvel(), w = b.angvel();
      const mass = b.mass(), Iz = b.principalInertia().z;
      const vhy = v.y + 0.5 * g * dt;
      const e = 0.5 * mass * (v.x*v.x + vhy*vhy + v.z*v.z) + 0.5*Iz*w.z*w.z + mass*gm*t.y;
      m.set(b.handle, e); nd++; if (b.isSleeping()) asleep++;
      const tg = tagOf.get(b.handle); if (tg) window.__tagCache.set(b.handle, tg);
      if (tg === 'ammo') ammoE += e;
    });
    return { m, asleep, nd, ammoE };
  };

  window.__ST = function () { const S = window.__S, s = S.stats;
    return { spentJ: s.spentJ, creditJ: s.creditJ, pool: S.pool, poolPeak: s.poolPeak,
             racks: s.racks, tips: s.tips, hinges: s.hinges, loads: s.loads, hops: s.hops,
             collapses: s.collapses, starved: s.starved, byJ: { ...s.byJ } }; };

  window.__RUN = function (n, stopOnHit) {
    const rows = []; let prev = window.__ES();
    for (let i = 0; i < n; i++) {
      const st0 = window.__ST(), nf0 = window.__frac.length, na0 = window.__ammoEv.length;
      const preAmmoE = prev.ammoE;
      SS.stepOnce();
      const cur = window.__ES(), st1 = window.__ST();
      let dE = 0, born = 0, died = 0, bornE = 0, diedE = 0; const per = [];
      for (const [h, e] of cur.m) {
        if (prev.m.has(h)) { const d = e - prev.m.get(h); dE += d; if (Math.abs(d) > 0.05) per.push([h, d]); }
        else { born++; bornE += e; }
      }
      for (const [h, e] of prev.m) if (!cur.m.has(h)) { died++; diedE += e; }
      per.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      rows.push({ tick: SS.tick(), dE,
        dSpent: st1.spentJ - st0.spentJ, dCredit: st1.creditJ - st0.creditJ, pool: st1.pool,
        dByJ: Object.fromEntries(Object.keys(st1.byJ).map(k => [k, +(st1.byJ[k]-st0.byJ[k]).toFixed(3)]).filter(([,v])=>v!==0)),
        ev: Object.fromEntries(['racks','tips','hinges','loads','hops','collapses']
              .map(k=>[k, st1[k]-st0[k]]).filter(([,v])=>v!==0)),
        frac: window.__frac.length - nf0, ammoC: window.__ammoEv.length - na0,
        born, died, bornE, diedE, ammoE: cur.ammoE, dAmmoE: cur.ammoE - preAmmoE,
        asleep: cur.asleep, nd: cur.nd,
        top: per.slice(0,3).map(([h,d])=>[window.__tagCache.get(h) ?? '?', +d.toFixed(2)]) });
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

const stat = (a) => { if (!a.length) return {}; const s=[...a].sort((x,y)=>x-y);
  const q=p=>s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];
  return { n:a.length, min:s[0], p50:q(0.5), p95:q(0.95), max:s[s.length-1], sum:a.reduce((x,y)=>x+y,0) }; };
const f = (x,d=2)=> x==null||Number.isNaN(x) ? 'n/a' : Number(x).toFixed(d);

export default async ({ game }) => {
  console.log('=== INDEPENDENT ENERGY AUDIT v2 (verifier-built, not derived from any repo instrument) ===\n');
  const rowsOut = [];

  for (const [ang, pow] of SHOTS) {
   for (const structOff of [false, true]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(SETUP);
    await game('window.__S.enabled = args[0];', !structOff);

    const idle = await game('return window.__RUN(120, false);');
    const rel = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!rel.ok) { console.log(`${ang}@${pow} FIRE FAIL ${rel.reason}`); continue; }

    const flight = await game('return window.__RUN(900, true);');
    const hit = await game('return window.__ammoHit;');
    if (hit == null) { console.log(`${ang}@${pow} NO CONTACT`); continue; }

    const post = await game('return window.__RUN(args[0], false);', POST_STEPS);
    const stEnd = await game('return window.__ST();');
    const ammoEv = await game('return window.__ammoEv;');
    const fracAll = await game('return window.__frac;');

    // --- the dart's own energy trajectory -------------------------------------
    // flight rows end ON the contact step, so the LAST PRE-CONTACT value is flight[n-2].
    const flyE = flight.map(r => r.ammoE);
    const preContactE = flyE.length >= 2 ? flyE[flyE.length - 2] : flyE[flyE.length - 1];
    const cruiseMax = Math.max(...flyE.slice(Math.floor(flyE.length * 0.35)));
    const postE = post.map(r => r.ammoE);
    const endE = postE[postE.length - 1];
    const minE = Math.min(...postE);
    const delivered = preContactE - minE;

    const idleD = idle.map(x=>x.dE), postD = post.map(x=>x.dE);
    const si = stat(idleD), sp = stat(postD), spos = stat(postD.filter(x=>x>0));
    const FLOOR = 0.5;
    const jolts = post.map((x,i)=>({...x,i})).filter(x=>x.dE>FLOOR).sort((a,b)=>b.dE-a.dE);

    const netBirth = post.reduce((a,b)=>a+b.bornE-b.diedE,0);
    const creditFromAmmo = ammoEv.filter(e=>e.t>=hit-2).reduce((a,b)=>a+b.blowE,0);

    console.log(`\n########## ${ang}@${pow}   ${structOff?'STRUCT-OFF (solver floor)':'STRUCT-ON'} ##########`);
    console.log(` DART   E(pre-contact) ${f(preContactE)} J   E(min in window) ${f(minE)} J   ` +
                `E(end) ${f(endE)} J   =>  DELIVERED ${f(delivered)} J   (cruise peak ${f(cruiseMax)} J)`);
    console.log(` CREATED (fixed cohort, gravity subtracted, births/deaths excluded):`);
    console.log(`   sum of POSITIVE per-step dE over 2 s = ${f(spos.sum)} J   (net dE ${f(sp.sum)} J)`);
    console.log(`   WORST single step +${f(sp.max,3)} J    median positive step +${f(spos.p50,3)} J`);
    console.log(`   idle floor (120 settled steps) worst +${f(si.max,4)} J`);
    console.log(` LEDGER  creditJ ${f(stEnd.creditJ)}  spentJ ${f(stEnd.spentJ)}  poolPeak ${f(stEnd.poolPeak)}  starved ${stEnd.starved}`);
    console.log(`         byJ ${JSON.stringify(Object.fromEntries(Object.entries(stEnd.byJ).map(([k,v])=>[k,+v.toFixed(1)])))}`);
    console.log(`         raw ammo-contact blowE sum from contact on = ${f(creditFromAmmo)} J over ${ammoEv.filter(e=>e.t>=hit-2).length} contact events`);
    console.log(` FRACTURE CHANNEL  net (born - died) energy over window = ${f(netBirth)} J   fractures ${post.reduce((a,b)=>a+b.frac,0)}`);
    console.log(` JOLTS > ${FLOOR} J : ${jolts.length} steps, sum ${f(jolts.reduce((a,b)=>a+b.dE,0))} J`);
    for (const j of jolts.slice(0,14)) {
      console.log(`   +${String((j.i*1000/120).toFixed(0)).padStart(4)}ms dE ${f(j.dE,2).padStart(7)}` +
        `  spent ${f(j.dSpent,2).padStart(6)} ${JSON.stringify(j.dByJ)}` +
        `  ev ${JSON.stringify(j.ev)}  frac ${j.frac} ammoC ${j.ammoC}` +
        `  born ${j.born}(${f(j.bornE,0)}J) died ${j.died}(${f(j.diedE,0)}J)` +
        `  asleep ${j.asleep}/${j.nd}  top ${JSON.stringify(j.top)}`);
    }
    rowsOut.push({ ang, pow, structOff, delivered, created: spos.sum, net: sp.sum, worst: sp.max,
                   credit: stEnd.creditJ, spent: stEnd.spentJ, idleMax: si.max, jolts: jolts.length });
   }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('shot        mode        dartDELIV  CREATED(sum+dE)  worst+  netdE   credit  spent  jolts');
  for (const s of rowsOut) console.log(
    `${s.ang}@${s.pow}  ${s.structOff?'OFF':'ON '}  ${f(s.delivered).padStart(9)}  ${f(s.created).padStart(15)}  ` +
    `${f(s.worst,2).padStart(6)}  ${f(s.net).padStart(7)}  ${f(s.credit).padStart(6)} ${f(s.spent).padStart(6)}  ${s.jolts}`);
};
