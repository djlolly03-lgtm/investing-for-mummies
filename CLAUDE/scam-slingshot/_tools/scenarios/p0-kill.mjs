/**
 * p0-kill.mjs — DEFECT 1 acceptance. Six proofs, all measured, no opinions.
 *
 *   1 DIRECT     max-power square shot into an unobstructed villain  -> MUST die
 *   2 NUDGE      a spent ball rolling into it at ~6 m/s              -> MUST live
 *   3 CRUSH      a stone block set down on it, no drop speed         -> MUST die (and fast)
 *   4 COLLAPSE   a real l1 shot that drops the tower on a villain    -> MUST die
 *   5 FULL RUN   play l1 with its own 4 ammo                         -> MUST reach 'won'
 *   6 STABLE     l1 untouched for 5 s                                -> villains MUST be at hp 1
 *
 * Plus filmstrips of 1 and 3 so the kill can be seen, not just counted.
 */
export default async ({ shot, filmstrip, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const results = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
  };

  // ---------- 1. DIRECT HIT ----------
  const direct = await game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1);
    const before = SS.state();
    const fire = SS.aimAndFire(0.25, 1.0);
    await SS.seek(1400);
    return { before, fire, after: SS.state(), hp: SS.__world.villains.map(v => +v.hp.toFixed(3)) };
  `);
  say('1_direct', direct);
  check('DIRECT max-power square hit kills', direct.after.villainsAlive === 0,
    { fired: direct.fire.ok, speed: direct.fire.speed, villainsAlive: direct.after.villainsAlive, score: direct.after.score });

  await game(`await SS.loadLevel('_probe-open'); await SS.seed(1);`);
  await shot('01-open-aim');
  await game(`SS.aimAndFire(0.25, 1.0);`);
  await filmstrip('direct-kill', { from: 480, to: 800, step: 40, cols: 3 });

  // ---------- 2. ROLLING NUDGE ----------
  const nudge = await game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1);
    SS.aimAndFire(0.55, 0.8);
    await SS.seek(3000);
    return { after: SS.state(), hp: SS.__world.villains.map(v => +v.hp.toFixed(3)) };
  `);
  say('2_nudge', nudge);
  check('NUDGE a spent rolling ball does NOT kill', nudge.after.villainsAlive === 1,
    { villainsAlive: nudge.after.villainsAlive, hp: nudge.hp });

  // ---------- 3. CRUSH ----------
  const crush = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const v = SS.__world.villains[0];
    const vp = v.body.translation();
    const stone = SS.__world.blocks.find(b => b.matName === 'stone');
    stone.body.setTranslation({ x: vp.x, y: vp.y + 0.52 + 0.45 + 0.05, z: 0 }, true);
    stone.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    stone.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    stone.body.wakeUp(); v.body.wakeUp();
    const trace = [];
    for (let i = 0; i < 20; i++) {
      await SS.seek(100);
      trace.push({ ms: (i+1)*100, hp: +(v.hp).toFixed(3), load: +(v.crushLoad||0).toFixed(2), alive: v.alive });
      if (!v.alive) break;
    }
    return { stoneMass: +stone.mass().toFixed(3), alive: v.alive, trace,
             msToDeath: trace.find(t => !t.alive)?.ms ?? null, state: SS.state() };
  `);
  say('3_crush', crush);
  check('CRUSH a stone set down on a villain kills it', crush.alive === false,
    { msToDeath: crush.msToDeath, stoneMass: crush.stoneMass });

  await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const v = SS.__world.villains[0], vp = v.body.translation();
    const stone = SS.__world.blocks.find(b => b.matName === 'stone');
    stone.body.setTranslation({ x: vp.x, y: vp.y + 1.02, z: 0 }, true);
    stone.body.setLinvel({ x:0, y:0, z:0 }, true); stone.body.wakeUp(); v.body.wakeUp();
  `);
  await filmstrip('crush-kill', { from: 0, to: 1200, step: 150, cols: 3 });

  // ---------- 4. COLLAPSE ----------
  const collapse = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const before = SS.state().villainsAlive;
    SS.aimAndFire(0.30, 1.0);
    await SS.seek(6000);
    return { before, after: SS.state(), hp: SS.__world.villains.map(v => +v.hp.toFixed(3)) };
  `);
  say('4_collapse', collapse);
  check('COLLAPSE one shot into the tower kills at least one villain',
    collapse.after.villainsAlive < collapse.before,
    { before: collapse.before, after: collapse.after.villainsAlive, score: collapse.after.score });
  await shot('04-collapse-after');

  // ---------- 5. FULL RUN ----------
  const run = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const shots = [[0.30,1.0],[0.30,1.0],[0.52,1.0],[0.62,1.0]];
    const log = [];
    for (const [a,p] of shots) {
      const s0 = SS.state();
      if (s0.phase === 'won' || s0.phase === 'lost') break;
      const f = SS.aimAndFire(a, p);
      if (!f.ok) { log.push({ a, p, refused: f.reason }); break; }
      for (let i = 0; i < 12; i++) {
        await SS.seek(700);
        const s = SS.state();
        if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break;
      }
      const s1 = SS.state();
      log.push({ a, p, phase: s1.phase, villainsAlive: s1.villainsAlive, score: s1.score, blocks: s1.blocks });
    }
    return { log, final: SS.state() };
  `);
  say('5_fullRun', run);
  check('FULL RUN l1 is winnable with its own ammo', run.final.phase === 'won',
    { phase: run.final.phase, villainsAlive: run.final.villainsAlive, score: run.final.score, stars: run.final.stars });
  await new Promise(r => setTimeout(r, 1800));
  await shot('05-end-overlay');

  // ---------- 6. STABLE AT REST ----------
  const stable = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const t0 = SS.state();
    await SS.seek(5000);
    return { t0, t5: SS.state(), hp: SS.__world.villains.map(v => +v.hp.toFixed(4)),
             load: SS.__world.villains.map(v => +(v.crushLoad||0).toFixed(3)) };
  `);
  say('6_stable', stable);
  check('STABLE an untouched level never damages its own villains',
    stable.t5.villainsAlive === 2 && stable.hp.every(h => h === 1),
    { hp: stable.hp, crushLoad: stable.load, phaseAtLoad: stable.t0.phase });

  // hook honesty spot-check while we are here
  say('7_hookHonesty', await game(`
    await SS.seed(2);
    const fr = SS.freeze(); const t0 = SS.tick();
    await new Promise(r => setTimeout(r, 300));
    const frozenAdvanced = SS.tick() - t0;
    const re = SS.resume();
    await new Promise(r => setTimeout(r, 300));
    const resumedAdvanced = SS.tick() - t0;
    SS.freeze();
    return { freeze: fr, resume: re, frozenAdvanced, resumedAdvanced,
             setTimeScale: SS.setTimeScale(0), audioMute: SS.audioMute(true),
             loadLevelPhase: (await SS.loadLevel('l1')).phase,
             aimAndFireBadAngle: SS.aimAndFire(NaN, 1.0) };
  `));

  say('errors', await game('return SS.errors.map(e => e.text);'));
  const failed = results.filter(r => !r.pass);
  console.log(`\n  === ${results.length - failed.length}/${results.length} PASS ===`);
  out.push({ results, failed: failed.map(f => f.name) });
  await fs.writeFile(path.join(OUT, 'kill.json'), JSON.stringify(out, null, 2));
};
