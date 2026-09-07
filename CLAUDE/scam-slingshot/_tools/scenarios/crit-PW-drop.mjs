/**
 * PW r1 critic — CONTROLLED DROP RIG (numeric, no shots).
 *
 * Independent of the builder's _pw-* fixtures. Loads _crit-pw-fall (12 cubes, 12 distinct x),
 * then LIFTS each cube to an exact height with zero velocity and zero accumulated damage and
 * drops it under the game's own gravity, sampling every solver step.
 *
 * Measured per cube, per the ORCHESTRATOR-NOTES trap ("peak height after landing is NOT a
 * rebound measurement"): COR = max(vy within 80 ms of first contact) / |vy| in the step before it.
 */
export default async ({ game }) => {
  await game(`SS.freeze();`);

  const natural = await game(`
    await SS.loadLevel('_crit-pw-fall');
    const w = SS.__world;
    return {
      settled: w.blocks.map(b => ({ m:b.matName, x:+b.body.translation().x.toFixed(2),
        y:+b.body.translation().y.toFixed(3), dmg:+(b.damage??0).toFixed(2),
        crack:b.crackStep, thr:b.material.physics.breakImpulse })),
      blocks: w.blocks.length, debris: w.debris.length,
    };
  `);
  console.log('NATURAL_SETTLE', JSON.stringify(natural));

  const res = await game(`
    const w = SS.__world;
    const FALLS = [0.80, 1.60, 2.60, 4.00];
    const out = [];
    for (const fall of FALLS) {
      for (const matName of ['wood','glass','stone']) {
        await SS.loadLevel('_crit-pw-fall');
        const w2 = SS.__world;
        // freeze everything except the one cube under test: make all other blocks fixed-ish by
        // parking them far away, so nothing else contributes contacts or debris.
        const all = w2.blocks.slice();
        const subject = all.find(b => b.matName === matName);
        for (const b of all) {
          if (b === subject) continue;
          b.body.setTranslation({ x: b.body.translation().x, y: -80, z: 0 }, true);
          b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
        }
        const half = subject.h / 2;
        subject.damage = 0; subject.crackStep = -1; subject.scarFloor = 0; subject.lastImpulse = 0;
        subject.body.setTranslation({ x: 12, y: half + fall, z: 0 }, true);
        subject.body.setRotation({ x:0, y:0, z:0, w:1 }, true);
        subject.body.setLinvel({x:0,y:0,z:0}, true);
        subject.body.setAngvel({x:0,y:0,z:0}, true);

        const mass = subject.body.mass();
        const trace = [];
        const STEP = 1000/120;
        let t = 0, alive = true;
        for (let i = 0; i < 720; i++) {          // 6 s
          await SS.seek(STEP);
          t += STEP;
          if (subject.broken || !w2.blocks.includes(subject)) { alive = false; trace.push({t, broke:true}); break; }
          const p = subject.body.translation(), v = subject.body.linvel(), a = subject.body.angvel();
          trace.push({ t:+t.toFixed(2), y:+p.y.toFixed(5), x:+p.x.toFixed(5),
                       vy:+v.y.toFixed(4), vx:+v.x.toFixed(4), az:+a.z.toFixed(4),
                       sl: subject.body.isSleeping()?1:0 });
        }
        out.push({ fall, matName, mass:+mass.toFixed(3), alive,
                   debris: w2.debris.length, trace });
      }
    }
    return out;
  `);

  const fmt = (n, d=3) => (n === null || n === undefined || Number.isNaN(n)) ? '   --' : n.toFixed(d);
  console.log('\n== CONTROLLED DROP ==');
  console.log('fall  mat    mass   land(ms) hitV   COR    bounces slideAfter spinStop(ms) rest(ms) sleep(ms) survived');
  const summary = [];
  for (const r of res) {
    const tr = r.trace.filter(s => !s.broke);
    if (!r.alive) {
      console.log(`${r.fall.toFixed(2)}  ${r.matName.padEnd(6)} ${fmt(r.mass)}  BROKE ON LANDING at t=${r.trace[r.trace.length-1].t.toFixed(0)}ms (debris=${r.debris})`);
      summary.push({ fall:r.fall, mat:r.matName, mass:r.mass, broke:true });
      continue;
    }
    // first contact = first step where vy goes from <-0.5 to >= previous (i.e. deceleration spike)
    let ci = -1;
    for (let i = 1; i < tr.length; i++) {
      if (tr[i-1].vy < -0.5 && tr[i].vy > tr[i-1].vy + 0.3) { ci = i; break; }
    }
    if (ci < 0) { console.log(`${r.fall} ${r.matName}: NO CONTACT FOUND`); continue; }
    const hitV = Math.abs(tr[ci-1].vy);
    const win = tr.slice(ci, ci + 10);                       // 80 ms window
    const cor = Math.max(...win.map(s => s.vy)) / hitV;
    // bounces: count vy zero-up-crossings above 0.15 m/s after contact
    let bounces = 0, prev = 0;
    for (let i = ci; i < tr.length; i++) {
      if (tr[i].vy > 0.15 && prev <= 0.15) bounces++;
      prev = tr[i].vy;
    }
    const xAt = tr[ci].x;
    const last = tr[tr.length-1];
    const slide = Math.abs(last.x - xAt);
    // spin stop: last step where |az| > 0.35
    let spinStop = null;
    for (let i = tr.length-1; i >= ci; i--) if (Math.abs(tr[i].az) > 0.35) { spinStop = tr[i].t - tr[ci].t; break; }
    // rest: last step where speed > 0.08
    let rest = null;
    for (let i = tr.length-1; i >= ci; i--) {
      const sp = Math.hypot(tr[i].vx, tr[i].vy);
      if (sp > 0.08 || Math.abs(tr[i].az) > 0.2) { rest = tr[i].t - tr[ci].t; break; }
    }
    let sleep = null;
    for (let i = ci; i < tr.length; i++) if (tr[i].sl) { sleep = tr[i].t - tr[ci].t; break; }
    console.log(`${r.fall.toFixed(2)}  ${r.matName.padEnd(6)} ${fmt(r.mass)}  ${fmt(tr[ci].t,1).padStart(7)} ${fmt(hitV,2).padStart(6)} ${fmt(cor,4).padStart(7)} ${String(bounces).padStart(6)} ${fmt(slide,4).padStart(9)} ${fmt(spinStop,0).padStart(11)} ${fmt(rest,0).padStart(8)} ${fmt(sleep,0).padStart(8)}   yes`);
    summary.push({ fall:r.fall, mat:r.matName, mass:r.mass, broke:false, landMs:+tr[ci].t.toFixed(1),
                   hitV:+hitV.toFixed(3), cor:+cor.toFixed(4), bounces, slide:+slide.toFixed(4),
                   spinStop, rest, sleep });
  }
  console.log('\nSUMMARY_JSON ' + JSON.stringify(summary));
};
