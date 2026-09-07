/**
 * p0-villain-diag.mjs — DEFECT 1 reproduction.
 * Instruments the villain damage path end to end and fires a sweep of max-power shots.
 * Answers, with numbers: do impulse events reach villains at all? what magnitude? what
 * approach speed? does hit() run? does hp ever reach 0? does die() fire?
 */
export default async ({ shot, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  // ---- install prototype-level instrumentation (survives restarts) ----
  say('instrument', await game(`
    await SS.seed(1);
    const v0 = SS.__world.villains[0];
    const VP = Object.getPrototypeOf(Object.getPrototypeOf(v0));   // Villain.prototype
    if (!window.__vlogInstalled) {
      window.__vlogInstalled = true;
      window.__vlog = { impacts: [], hits: [], deaths: [], allImpacts: 0 };
      const oi = VP.onImpact, oh = VP.hit, od = VP.die;
      VP.onImpact = function (impulse, other, point, approach = 0) {
        window.__vlog.allImpacts++;
        window.__vlog.impacts.push({ t: SS.tick(), imp: +impulse.toFixed(3),
          app: +approach.toFixed(3), other: other ? other.tag : null,
          hp: +this.hp.toFixed(3), crush: +this.crush.toFixed(3) });
        return oi.call(this, impulse, other, point, approach);
      };
      VP.hit = function (impulse, other) {
        window.__vlog.hits.push({ t: SS.tick(), imp: +impulse.toFixed(3), hpBefore: +this.hp.toFixed(3) });
        return oh.call(this, impulse, other);
      };
      VP.die = function (impulse) {
        window.__vlog.deaths.push({ t: SS.tick(), imp: +(impulse||0).toFixed(3) });
        return od.call(this, impulse);
      };
    }
    return 'ok, villainProto=' + VP.constructor.name;
  `));

  // ---- angle sweep at full power, one restart each ----
  const angles = [0.10, 0.18, 0.26, 0.34, 0.42, 0.50, 0.58, 0.66, 0.74, 0.86, 1.00];
  const rows = [];
  for (const a of angles) {
    await game('await SS.seed(1); await SS.seek(900); window.__vlog.impacts.length=0; window.__vlog.hits.length=0; window.__vlog.deaths.length=0;');
    const fire = await game('return SS.aimAndFire(args[0], 1.0);', a);
    await game('await SS.seek(4200);');
    const s = await state();
    const v = await game(`
      const L = window.__vlog;
      const maxImp = L.impacts.reduce((m,x)=>Math.max(m,x.imp),0);
      const maxApp = L.impacts.reduce((m,x)=>Math.max(m,x.app),0);
      return { n: L.impacts.length, maxImp:+maxImp.toFixed(2), maxApp:+maxApp.toFixed(2),
               hits: L.hits.length, deaths: L.deaths.length,
               hp: SS.__world.villains.map(v=>+v.hp.toFixed(3)),
               alive: SS.__world.villains.map(v=>v.alive),
               top: L.impacts.slice().sort((x,y)=>y.imp-x.imp).slice(0,4) };
    `);
    rows.push({ angle: a, fireOk: fire?.ok !== false, phase: s.phase, villainsAlive: s.villainsAlive, score: s.score, ...v });
    console.log('  angle', a, JSON.stringify({ n: v.n, maxImp: v.maxImp, maxApp: v.maxApp, hits: v.hits, deaths: v.deaths, hp: v.hp }));
  }
  say('sweep', rows);

  // ---- best angle by max impulse, capture the frame ----
  const best = rows.slice().sort((x, y) => y.maxImp - x.maxImp)[0];
  say('best', { angle: best.angle, maxImp: best.maxImp, deaths: best.deaths });
  await game('await SS.seed(1); await SS.seek(900);');
  await shot('settled');
  await game('SS.aimAndFire(args[0], 1.0); await SS.seek(700);', best.angle);
  await shot('impact-moment');
  await game('await SS.seek(3000);');
  await shot('after');
  say('afterState', await state());

  // ---- crush probe: what does a resting block actually deliver? ----
  say('crushProbe', await game(`
    const L = window.__vlog;
    const resting = L.impacts.filter(x => x.app < 1.2);
    return { restingContacts: resting.length,
             maxRestingImp: +resting.reduce((m,x)=>Math.max(m,x.imp),0).toFixed(2),
             sample: resting.slice(-6) };
  `));

  say('errors', await game('return SS.errors.map(e=>e.text).slice(0,8);'));
  await fs.writeFile(path.join(OUT, 'diag.json'), JSON.stringify(out, null, 2));
};
