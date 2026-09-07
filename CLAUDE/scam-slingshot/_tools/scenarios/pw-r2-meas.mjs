/**
 * pw-r2-meas.mjs — PW ROUND 2's MEASUREMENT PASS. Numbers only, no verdict, no pictures.
 *
 * The round-1 critic's gap is "mass and fragility are inverted": an identical 0.90 m cube
 * survives a 1.12 m fall as STONE but more than 12 m as GLASS or WOOD. This scenario is the
 * instrument that (a) reproduces that independently and (b) supplies the distributions any
 * new threshold has to be authored against — because ORCHESTRATOR-NOTES' hardest-won rule is
 * "any agent authoring a threshold must MEASURE the distribution first, never derive it".
 *
 *   1. FALL LADDER   — one lone 0.90 m cube, nothing else in the world, lifted to an exact
 *                      height with zero velocity and zero damage and dropped. Ladder of fall
 *                      distances per material -> the BREAK HEIGHT of each material, plus the
 *                      landing Δv and the fraction of its own threshold the landing cost it.
 *   2. Δv CENSUS     — every damage event on a real l1 shot, recorded at Block.onImpact with
 *                      the struck block's own mass, so the same blow can be read in BOTH
 *                      currencies: raw N·s (mass-dependent) and Δv = raw/mass (invariant).
 *                      Split by source tag, and the events that actually KILL something are
 *                      called out separately — that is the population a crush ramp is for.
 */

const LADDER = [0.5, 0.8, 1.12, 1.6, 2.2, 3.0, 4.0, 5.5, 7.5, 10.0, 13.0];
const MATS = ['wood', 'glass', 'stone'];
const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.36, 1.00], [0.24, 0.92]];

/** Records every impulse a block is asked to absorb, with the mass that absorbed it. */
const CENSUS = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__dv = [];
if (!B.__pwr2) {
  B.__pwr2 = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    const m = this.body.mass();
    const before = this.damage;
    const r = oi.call(this, imp, other, pt, app);
    window.__dv.push({
      mat: this.matName, mass: +m.toFixed(4), thr: this.material.physics.breakImpulse,
      w: +this.w.toFixed(2), h: +this.h.toFixed(2),
      src: other?.tag ?? 'none', raw: +imp.toFixed(4), dv: +(imp / m).toFixed(4),
      app: +app.toFixed(2), took: +(this.damage - before).toFixed(4),
      dead: !!this.broken,
    });
    return r;
  };
  B.fracture = function (imp, pt) {
    window.__dv.push({ kill: true, mat: this.matName, mass: +this.body.mass().toFixed(4),
      thr: this.material.physics.breakImpulse, imp: +imp.toFixed(3) });
    return of.call(this, imp, pt);
  };
}
return true;`;

const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3); };

export default async ({ game }) => {
  const out = [];
  const say = (s = '') => { out.push(s); console.log(s); };

  // ───────────────────────────────────────────────────────────── 1. FALL LADDER
  await game('return SS.freeze();');
  await game('return await SS.loadLevel("_crit-pw-fall");');
  await game('return SS.freeze();');
  await game(CENSUS);

  const rows = await game(`
    const w = SS.__world;
    const FALLS = ${JSON.stringify(LADDER)};
    const out = [];
    for (const fall of FALLS) {
      for (const matName of ${JSON.stringify(MATS)}) {
        await SS.loadLevel('_crit-pw-fall');
        const w2 = SS.__world;
        const all = w2.blocks.slice();
        const subject = all.find(b => b.matName === matName);
        for (const b of all) {
          if (b === subject) continue;
          b.body.setTranslation({ x: b.body.translation().x, y: -120, z: 0 }, true);
          b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
        }
        const half = subject.h / 2;
        subject.damage = 0; subject.crackStep = -1; subject.scarFloor = 0; subject.lastImpulse = 0;
        subject.body.setTranslation({ x: 12, y: half + fall, z: 0 }, true);
        subject.body.setRotation({ x:0, y:0, z:0, w:1 }, true);
        subject.body.setLinvel({x:0,y:0,z:0}, true);
        subject.body.setAngvel({x:0,y:0,z:0}, true);
        const mass = subject.body.mass();
        const thr  = subject.material.physics.breakImpulse;
        window.__dv = [];
        let hitV = 0, prevVy = 0, broke = false, tBreak = null, peakDmg = 0;
        const STEP = 1000/120;
        for (let i = 0; i < 480; i++) {                 // 4 s
          prevVy = subject.broken ? prevVy : subject.body.linvel().y;
          await SS.seek(STEP);
          if (subject.broken) { broke = true; tBreak = +(i*STEP).toFixed(0); break; }
          const vy = subject.body.linvel().y;
          if (!hitV && prevVy < -0.5 && vy > prevVy + 0.3) hitV = Math.abs(prevVy);
          peakDmg = Math.max(peakDmg, subject.damage);
          if (i > 60 && subject.body.isSleeping()) break;
        }
        const ev = window.__dv.filter(e => !e.kill);
        const rawSum = ev.reduce((a, e) => a + e.raw, 0);
        const tookSum = ev.reduce((a, e) => a + (e.took ?? 0), 0);
        const dvSum = ev.reduce((a, e) => a + e.dv, 0);
        out.push({ fall, matName, mass:+mass.toFixed(3), thr, broke, tBreak,
          hitV:+hitV.toFixed(2), nEv: ev.length,
          rawSum:+rawSum.toFixed(2), dvSum:+dvSum.toFixed(2),
          tookSum:+tookSum.toFixed(2), fracThr:+(Math.max(peakDmg,tookSum)/thr).toFixed(3),
          maxRaw: +Math.max(0,...ev.map(e=>e.raw)).toFixed(2),
          maxDv:  +Math.max(0,...ev.map(e=>e.dv)).toFixed(2) });
      }
    }
    return out;
  `);

  say('=== 1. FALL LADDER — one lone 0.90 m cube, nothing else in the world ===');
  say('   gravity 23.54 m/s^2 (GRAVITY_SCALE 2.4). "frac" = peak damage / own breakImpulse.');
  say('   fall  mat     kg    thr    hitV   Sum(raw)  Sum(dv)  dmg    frac   verdict');
  for (const r of rows) {
    say(`   ${String(r.fall).padStart(5)}  ${r.matName.padEnd(6)} ${String(r.mass).padStart(5)} ` +
        `${String(r.thr).padStart(5)}  ${String(r.hitV).padStart(5)}  ${String(r.rawSum).padStart(7)}  ` +
        `${String(r.dvSum).padStart(7)}  ${String(r.tookSum).padStart(6)} ${String(r.fracThr).padStart(6)}   ` +
        (r.broke ? `SHATTERED @${r.tBreak}ms` : 'survived'));
  }
  say('');
  say('   BREAK HEIGHT (first ladder rung that shatters):');
  for (const m of MATS) {
    const first = rows.filter(r => r.matName === m && r.broke).sort((a, b) => a.fall - b.fall)[0];
    const mass = rows.find(r => r.matName === m).mass;
    say(`     ${m.padEnd(6)} ${mass} kg   ${first ? first.fall + ' m  (hit ' + first.hitV + ' m/s)' : '> ' + LADDER[LADDER.length-1] + ' m — never'}`);
  }
  say('');

  // ───────────────────────────────────────────────────────── 2. Δv CENSUS on l1
  const all = [];
  const kills = [];
  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(CENSUS);
    await game('window.__dv = []; return true;');
    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    await game('await SS.seek(5000);');
    const ev = await game('return window.__dv;');
    for (const e of ev) (e.kill ? kills : all).push(e);
  }

  say(`=== 2. Δv CENSUS — every damage event across ${SHOTS.length} real l1 shots (n=${all.length}) ===`);
  say('   raw = the solver\'s contact impulse (N·s, scales with the STRUCK body\'s mass)');
  say('   dv  = raw / struck mass (m/s, mass-invariant)');
  say('   mat    src      n     raw p50   p90   max      dv p50   p90    max');
  for (const m of MATS) {
    for (const src of ['ammo', 'block', 'debris', 'ground', 'villain']) {
      const g = all.filter(e => e.mat === m && e.src === src);
      if (!g.length) continue;
      const raws = g.map(e => e.raw), dvs = g.map(e => e.dv);
      say(`   ${m.padEnd(6)} ${src.padEnd(8)} ${String(g.length).padStart(4)}   ` +
          `${String(q(raws,0.5)).padStart(6)} ${String(q(raws,0.9)).padStart(6)} ${String(q(raws,0.999)).padStart(6)}   ` +
          `${String(q(dvs,0.5)).padStart(7)} ${String(q(dvs,0.9)).padStart(6)} ${String(q(dvs,0.999)).padStart(6)}`);
    }
  }
  say('');
  say('   MASS CENSUS of the struck blocks (thr/mass = the Δv each block can currently take at scale 1.0):');
  const seen = new Set();
  for (const e of all) {
    const k = `${e.mat}|${e.w}x${e.h}`;
    if (seen.has(k)) continue; seen.add(k);
    say(`     ${e.mat.padEnd(6)} ${String(e.w).padStart(5)} x ${String(e.h).padStart(5)}  ` +
        `${String(e.mass).padStart(6)} kg   thr ${String(e.thr).padStart(5)}   thr/mass ${(e.thr/e.mass).toFixed(2)} m/s`);
  }
  say('');
  say(`   THE KILLING BLOWS (n=${kills.length}):`);
  for (const m of MATS) {
    const g = kills.filter(k => k.mat === m);
    if (!g.length) { say(`     ${m.padEnd(6)} none`); continue; }
    const dv = g.map(k => k.imp / k.mass);
    say(`     ${m.padEnd(6)} n=${String(g.length).padStart(3)}  final-blow imp ` +
        `${q(g.map(k=>k.imp),0.1)} .. ${q(g.map(k=>k.imp),0.9)}   Δv ${q(dv,0.1)} .. ${q(dv,0.9)}`);
  }
  say('');
  say('   HEAVY CHAIN BLOWS (src=block, dv >= 3): the "a storey landed on me" population');
  for (const m of MATS) {
    const g = all.filter(e => e.mat === m && e.src === 'block' && e.dv >= 3);
    const tot = all.filter(e => e.mat === m && e.src === 'block').length;
    say(`     ${m.padEnd(6)} ${String(g.length).padStart(4)} of ${String(tot).padStart(4)}   ` +
        (g.length ? `dv ${q(g.map(e=>e.dv),0.1)} .. ${q(g.map(e=>e.dv),0.9)} (max ${q(g.map(e=>e.dv),0.999)})   raw ${q(g.map(e=>e.raw),0.1)} .. ${q(g.map(e=>e.raw),0.9)}` : ''));
  }
  return out.join('\n');
};
