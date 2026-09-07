/**
 * p0-villain-probe.mjs — DEFECT 1: the measurement that sets the villain damage numbers.
 *
 * Runs on `levels/_probe-open.json`: one villain on open ground, nothing in the way, so
 * every contact reported is genuinely the projectile hitting the villain and nothing else.
 *
 *   A. angle sweep at full power  -> what a SQUARE DIRECT HIT actually delivers
 *   B. the same shot offset       -> what a GLANCING BLOW delivers
 *   C. low power dead centre      -> what a LOBBED TAP delivers
 *   D. crush                      -> what a block RESTING on a villain delivers
 *   E. l1 untouched for 5 s       -> the resting-noise floor a threshold must clear
 *
 * These four numbers are the whole tuning budget. Anything between B/C/E and A is a
 * legitimate kill threshold; anything above A means direct hits cannot kill.
 */
export default async ({ shot, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  const INSTALL = `
    if (!window.__probeInstalled) {
      window.__probeInstalled = true;
      const VP = SS.__villainProto || Object.getPrototypeOf(Object.getPrototypeOf(SS.__world.villains[0]));
      window.__P = { ev: [] };
      const oi = VP.onImpact, od = VP.die;
      VP.onImpact = function (impulse, other, point, approach = 0) {
        window.__P.ev.push({ t: SS.tick(), imp: +impulse.toFixed(3), app: +approach.toFixed(3),
          other: other ? other.tag : 'null', hp: +this.hp.toFixed(3) });
        return oi.call(this, impulse, other, point, approach);
      };
      VP.die = function (i) { window.__P.ev.push({ t: SS.tick(), DIED: true, imp: +(i||0).toFixed(2) }); return od.call(this, i); };
    }`;

  const SUM = `
    const E = window.__P.ev;
    const hits = E.filter(e => !e.DIED);
    const sig  = hits.filter(e => e.imp > 0.15);
    const t0 = sig.length ? sig[0].t : 0;
    const win = sig.filter(e => e.t - t0 < 24);           // 200 ms window
    const ammoOnly = hits.filter(e => e.other === 'ammo');
    return { contacts: hits.length, ammoContacts: ammoOnly.length,
      died: E.some(e => e.DIED),
      peak: +hits.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
      ammoPeak: +ammoOnly.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
      ammoSum: +ammoOnly.reduce((s,e)=>s+e.imp,0).toFixed(3),
      windowSum: +win.reduce((s,e)=>s+e.imp,0).toFixed(3),
      maxApp: +hits.reduce((m,e)=>Math.max(m,e.app),0).toFixed(2),
      hp: SS.__world.villains.map(v => +v.hp.toFixed(3)),
      train: hits.slice(0, 10) };`;

  const RESET = `await SS.loadLevel('_probe-open'); await SS.seed(1); await SS.seek(700); window.__P.ev.length = 0;`;

  await game(`await SS.loadLevel('_probe-open'); await SS.seed(1); ${INSTALL} return SS.state();`);

  // ---------- A. square direct hit ----------
  const A = [];
  for (const a of [0.20, 0.23, 0.25, 0.255, 0.26, 0.27, 0.29, 0.32]) {
    await game(RESET);
    await game('SS.aimAndFire(args[0], 1.0); await SS.seek(1600);', a);
    const r = await game(SUM);
    A.push({ angle: a, ...r, train: undefined });
    console.log('  A', a, JSON.stringify({ ammoN: r.ammoContacts, ammoPeak: r.ammoPeak, ammoSum: r.ammoSum, win: r.windowSum, app: r.maxApp, died: r.died, hp: r.hp }));
  }
  say('A_directSweep', A);
  const best = A.filter(r => r.ammoContacts > 0).sort((x, y) => y.ammoSum - x.ammoSum)[0] ?? A[0];
  say('A_best', best);

  await game(RESET);
  await shot('A-aim-open');
  await game('SS.aimAndFire(args[0], 1.0); await SS.seek(1000);', best.angle);
  await shot('A-direct-hit');
  say('A_train', await game(SUM));

  // ---------- B. glancing blow: same power, clipped rim ----------
  const B = [];
  for (const d of [0.035, 0.05, 0.065, 0.08]) {
    await game(RESET);
    await game('SS.aimAndFire(args[0], 1.0); await SS.seek(1600);', +(best.angle + d).toFixed(4));
    const r = await game(SUM);
    B.push({ offset: d, angle: +(best.angle + d).toFixed(4), ...r, train: undefined });
    console.log('  B +', d, JSON.stringify({ ammoN: r.ammoContacts, ammoPeak: r.ammoPeak, ammoSum: r.ammoSum, died: r.died, hp: r.hp }));
  }
  say('B_glancing', B);

  // ---------- C. lobbed tap: dead centre, low power ----------
  const C = [];
  for (const p of [0.25, 0.35, 0.5, 0.7]) {
    await game(RESET);
    // low power needs a much higher angle to still reach x=18; sweep a couple
    let bestRow = null;
    for (const a of [0.5, 0.7, 0.9, 1.1]) {
      await game(RESET);
      await game('SS.aimAndFire(args[0], args[1]); await SS.seek(2200);', a, p);
      const r = await game(SUM);
      if (!bestRow || r.ammoSum > bestRow.ammoSum) bestRow = { angle: a, ...r, train: undefined };
    }
    C.push({ power: p, ...bestRow });
    console.log('  C power', p, JSON.stringify({ angle: bestRow.angle, ammoSum: bestRow.ammoSum, ammoPeak: bestRow.ammoPeak, died: bestRow.died, hp: bestRow.hp }));
  }
  say('C_lowPower', C);

  // ---------- D. crush: a stone block set down on the villain ----------
  say('D_crush', await game(`
    await SS.loadLevel('l1'); await SS.seed(1); await SS.seek(900);
    window.__P.ev.length = 0;
    const v = SS.__world.villains[0];
    const vp = v.body.translation();
    const stone = SS.__world.blocks.find(b => b.matName === 'stone');
    // set it DOWN on the villain (0.05 m of clearance), no drop speed: pure crush.
    stone.body.setTranslation({ x: vp.x, y: vp.y + 0.52 + 0.45 + 0.05, z: 0 }, true);
    stone.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    stone.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    stone.body.wakeUp(); v.body.wakeUp();
    await SS.seek(3000);
    const E = window.__P.ev, hits = E.filter(e=>!e.DIED);
    const rest = hits.filter(e => e.app < 1.2);
    return { stoneMass: +stone.mass().toFixed(3), contacts: hits.length,
      restingContacts: rest.length,
      maxRestingImp: +rest.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
      meanRestingImp: +(rest.reduce((s,e)=>s+e.imp,0)/Math.max(1,rest.length)).toFixed(3),
      died: E.some(e=>e.DIED), hp: +v.hp.toFixed(3), crush: +(v.crush??0).toFixed(3),
      train: hits.slice(0,10) };
  `));
  await shot('D-crush');

  // ---------- E. resting-noise floor on an untouched l1 ----------
  say('E_restingFloor', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    window.__P.ev.length = 0;
    await SS.seek(5000);
    const E = window.__P.ev.filter(e=>!e.DIED);
    return { contacts: E.length,
      maxImp: +E.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
      maxApp: +E.reduce((m,e)=>Math.max(m,e.app),0).toFixed(2),
      villainsAlive: SS.state().villainsAlive,
      hp: SS.__world.villains.map(v=>+v.hp.toFixed(4)) };
  `));

  say('errors', await game('return SS.errors.map(e=>e.text).slice(0,8);'));
  await fs.writeFile(path.join(OUT, 'probe.json'), JSON.stringify(out, null, 2));
};
