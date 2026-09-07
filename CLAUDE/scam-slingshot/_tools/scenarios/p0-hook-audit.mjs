/**
 * p0-hook-audit.mjs — DEFECT 2. Every hook in HOOKS.md, checked against reality.
 *
 * A hook that returns the wrong thing corrupts every verdict downstream of it, so nothing
 * here trusts a return value on its own: each one is cross-checked against something
 * observed independently (a body sweep, the tick counter, the sling's own fields, the wall
 * clock). "It returned ok:true" is not evidence of anything.
 *
 * The specific bug this exists to catch: `resume()` used to return a naked `true`, so the
 * only way to probe it was `SS.driven()` afterwards, which answers `false` — and `false`
 * from a hook reads as failure. It now returns `{ ok, driven, tick }` and the field names
 * say which is which. Every other state-changing hook is audited for the same class of lie.
 */
export default async ({ game, state, aimPx, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const results = [];
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
  };
  const say = (k, v) => { out.push({ [k]: v }); return v; };

  // ---------- surface ----------
  const surface = say('surface', await game(`
    const need = ['ready','version','loadLevel','restart','state','aim','dragTo','release',
      'tapAbility','aimAndFire','setTimeScale','freeze','resume','seek','seed','errors','perf',
      'audioMute','dumpBodies','tick','driven','stepOnce','currentSeed','warnings','__world','__physics'];
    return { missing: need.filter(k => !(k in SS)), ready: SS.ready, version: SS.version,
             types: Object.fromEntries(need.map(k => [k, typeof SS[k]])) };
  `));
  check('every documented hook exists', surface.missing.length === 0, { missing: surface.missing });
  check('ready is true and version names itself',
    surface.ready === true && typeof surface.version === 'string' && surface.version.length > 0,
    { ready: surface.ready, version: surface.version });

  // ---------- loadLevel / restart ----------
  const load = say('loadLevel', await game(`
    const r = await SS.loadLevel('l1');
    const s = SS.state();
    let maxSpeed = 0;
    SS.__physics.world.forEachRigidBody(b => { const v = b.linvel();
      const sp = Math.hypot(v.x, v.y); if (sp > maxSpeed) maxSpeed = sp; });
    return { returned: r, phaseAfter: s.phase, maxSpeed: +maxSpeed.toFixed(4), tick: s.tick };
  `));
  check('loadLevel resolves only when the level is settled AND playable',
    load.phaseAfter === 'aiming' && load.maxSpeed < 0.85 && load.tick === 0,
    { phase: load.phaseAfter, maxSpeed: load.maxSpeed, tickRebased: load.tick });

  const badLevel = say('loadLevel_bad', await game(`
    try { const r = await SS.loadLevel('no-such-level'); return { resolved: true, r, phase: SS.state().phase }; }
    catch (e) { return { rejected: true, message: String(e.message || e).slice(0, 120) }; }
  `));
  check('loadLevel on a missing level fails loudly instead of pretending',
    badLevel.rejected === true, badLevel);

  /**
   * `blocks` is compared against the count the level ACTUALLY loads with, measured one line
   * earlier — never against a literal. It was `=== 13`, which is a hard-coded fact about l1's
   * contents, and it turned into a false FAIL the moment P2 gave l1 a bigger catch profile.
   * Same failure mode as the hard-coded drag pixels: a check that asserts today's content
   * instead of the contract.
   */
  const restart = say('restart', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const atLoad = SS.state().blocks;
    SS.aimAndFire(0.30, 1.0); await SS.seek(2500);
    const dirty = SS.state();
    const r = await SS.restart();
    const clean = SS.state();
    return { atLoad, dirty: { score: dirty.score, ammoLeft: dirty.ammoLeft, blocks: dirty.blocks },
             returned: r, clean: { score: clean.score, ammoLeft: clean.ammoLeft, blocks: clean.blocks, phase: clean.phase } };
  `));
  check('restart really rebuilds (score, ammo and blocks all back)',
    restart.clean.score === 0 && restart.clean.ammoLeft === 4 &&
    restart.dirty.blocks < restart.atLoad &&
    restart.clean.blocks === restart.atLoad && restart.clean.phase === 'aiming',
    { atLoad: restart.atLoad, dirty: restart.dirty.blocks, ...restart.clean });

  // ---------- state() cross-checked against a body sweep ----------
  const st = say('state_crosscheck', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    SS.aimAndFire(0.30, 1.0); await SS.seek(1500);
    const s = SS.state();
    const W = SS.__world;
    let asleep = 0, dyn = 0;
    SS.__physics.world.forEachRigidBody(b => {
      if (b.bodyType() !== 0) return; dyn++; if (b.isSleeping()) asleep++; });
    return { s, truth: { villainsAlive: W.villains.filter(v => v.alive).length,
      ammoLeft: Math.max(0, W.ammoQueue.length - W.ammoUsed), bodiesAsleep: asleep,
      blocks: W.blocks.length, debris: W.debris.length, phase: W.phase,
      slingState: W.sling.state, dynamicBodies: dyn } };
  `));
  const PHASES = ['boot', 'menu', 'aiming', 'flying', 'settling', 'won', 'lost'];
  check('state() reports reality, not its own bookkeeping',
    st.s.villainsAlive === st.truth.villainsAlive && st.s.ammoLeft === st.truth.ammoLeft &&
    st.s.bodiesAsleep === st.truth.bodiesAsleep && st.s.blocks === st.truth.blocks &&
    st.s.debris === st.truth.debris && st.s.phase === st.truth.phase &&
    PHASES.includes(st.s.phase),
    { reported: { v: st.s.villainsAlive, a: st.s.ammoLeft, z: st.s.bodiesAsleep, b: st.s.blocks, d: st.s.debris, p: st.s.phase },
      truth: st.truth });

  // ---------- aim: does the sling actually GO where the return value says? ----------
  const aim = say('aim', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const S = SS.__world.sling, A = S.anchor;
    /**
     * The draw ceiling, MEASURED off the live sling instead of hard-coded.
     * It used to be the literal 1.62, so the moment P1 retuned maxStretch this check started
     * reporting "aim({power:1}) really set 1.73" and failing a hook that was telling the
     * truth. A test that bakes in a tuning constant lies about the game as soon as anyone
     * tunes it — which is precisely the failure mode this file exists to catch.
     */
    SS.aim({ angle: 0, power: 1 });
    const MAXSTRETCH = Math.hypot(S.pouch.x - A.x, S.pouch.y - A.y);
    await SS.restart();
    const rows = [];
    for (const [ang, pow] of [[0.25, 1.0], [0.9, 0.4], [0.5, 5.0], [0.5, -3]]) {
      await SS.restart();
      const r = SS.aim({ angle: ang, power: pow });
      const s2 = SS.__world.sling;
      const dx = s2.pouch.x - s2.anchor.x, dy = s2.pouch.y - s2.anchor.y;
      const stretch = Math.hypot(dx, dy);
      const dir = Math.atan2(-dy, -dx);
      rows.push({ asked: { ang, pow }, returned: r,
        realStretch: +stretch.toFixed(4), maxStretch: +MAXSTRETCH.toFixed(4),
        realPower: +(stretch / MAXSTRETCH).toFixed(4), realAngle: +dir.toFixed(4),
        slingDrawn: +s2.drawn.toFixed(4), state: s2.state });
    }
    await SS.restart();
    const nan = SS.aim({ angle: NaN, power: 1 });
    // Aiming a sling that has already been fired must be refused, and the refusal must name
    // the state the sling is REALLY in — not a state the test happened to guess.
    SS.aim({ angle: 0.3, power: 1 }); SS.release();
    const fired = SS.aim({ angle: 0.3, power: 1 });
    return { rows, nan, fired, realStateWhenRefused: SS.__world.sling.state };
  `));
  const aimOk = aim.rows.every(r => {
    const clampedPow = Math.max(0, Math.min(1, r.asked.pow));
    return Math.abs(r.returned.power - clampedPow) < 1e-9 &&
           Math.abs(r.realPower - clampedPow) < 1e-3 &&
           (clampedPow === 0 || Math.abs(r.realAngle - r.asked.ang) < 1e-3);
  });
  check('aim() reports the power it actually SET, clamped, not the one it was asked for',
    aimOk, aim.rows.map(r => ({ asked: r.asked.pow, returned: r.returned.power, real: r.realPower })));
  check('aim() refuses bad input and names the real state it refused in',
    aim.nan.ok === false && typeof aim.nan.reason === 'string' &&
    aim.fired.ok === false && aim.fired.reason.includes(`"${aim.realStateWhenRefused}"`),
    { nan: aim.nan.reason, afterFiring: aim.fired.reason, realSlingState: aim.realStateWhenRefused });

  // ---------- dragTo / release ----------
  // The pixels are DERIVED from the live sling + live camera, never hard-coded. The constants
  // that used to be here (0.30/0.60, 0.155/0.735) landed in front of the fork after P4 re-solved
  // the framing, so this audit was cross-checking `drawn` on a 92 deg straight-up shot it never
  // intended — every check still passed, which is the point: agreement between two numbers is
  // not evidence that either is the number you wanted.
  const WANT = { angle: 0.36, power: 0.95 };
  await game('await SS.loadLevel("l1"); await SS.seed(1);');
  const gpx = await aimPx(WANT.angle, 0);
  const dpx = await aimPx(WANT.angle, WANT.power);
  const drag = say('dragTo_release', await game(`
    const [gx, gy, dx, dy] = args;
    const before = { pouch: { ...SS.__world.sling.pouch }, state: SS.__world.sling.state };
    const d1 = SS.dragTo(gx, gy);
    const d2 = SS.dragTo(dx, dy);
    const after = { pouch: { x: +SS.__world.sling.pouch.x.toFixed(4), y: +SS.__world.sling.pouch.y.toFixed(4) },
                    drawn: +SS.__world.sling.drawn.toFixed(4), state: SS.__world.sling.state };
    // and a deliberately BAD drag: a pixel in front of the fork must be reported as clamped,
    // not silently folded onto the boundary and called ok.
    const a = SS.__world.sling.anchor, cam = SS.__world.camera;
    const V3 = cam.position.constructor, r = SS.__world.renderer.domElement.getBoundingClientRect();
    const v = new V3(a.x + 2.2, a.y - 1.6, 0).project(cam);
    const bad = SS.dragTo(r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height);
    SS.dragTo(dx, dy);                       // put the good draw back before firing
    const rel = SS.release();
    /**
     * release() reports TWO speeds and the projectile must honour BOTH of them.
     * This used to sample the velocity once, one tick later, and compare it to the CRUISE
     * number — a comparison that only held because SLING.kickTau (seconds) was being read as
     * a tick count and the launch kick was therefore dead after a single 8.3 ms step. It
     * agreed, so nobody looked. Both ends of the kick curve are pinned now:
     *   · one tick after release  -> exitSpeed (the smootherstep is flat at t=0)
     *   · after kickSteps + 2     -> speed     (the kick is fully unwound)
     * Gravity's contribution is subtracted before comparing, because otherwise this measures
     * gravity, not the kick.
     */
    const G = 9.81 * 2.4, FIX = 1 / 120;
    SS.stepOnce();
    const p = SS.__world.projectiles.filter(x => x.launched).pop();
    const v2 = p.body.linvel();
    const realExit = Math.hypot(v2.x, v2.y + G * FIX);
    const n = rel.kickSteps ?? 1;
    for (let i = 0; i < n + 1; i++) SS.stepOnce();
    const v3 = p.body.linvel();
    const realCruise = Math.hypot(v3.x, v3.y + G * FIX * (n + 2));
    const relAgain = SS.release();
    return { before, d1, d2, after, bad, rel, relAgain, touched: p.hasHit,
             realExit: +realExit.toFixed(3), realCruise: +realCruise.toFixed(3) };
  `, gpx.x, gpx.y, dpx.x, dpx.y));
  check('dragTo() moves the pouch through the real input path and reports the draw it set',
    drag.d2.ok === true && Math.abs(drag.d2.drawn - drag.after.drawn) < 1e-3 &&
    drag.after.state === 'dragging',
    { returnedDrawn: drag.d2.drawn, slingDrawn: drag.after.drawn, world: drag.d2.world });
  check('dragTo() reports the ANGLE it set, not just that it accepted the pixels',
    Math.abs(drag.d2.angle - WANT.angle) < 0.01 && drag.d2.clamped.hemisphere === false,
    { wanted: WANT.angle, reported: drag.d2.angle, clamped: drag.d2.clamped });
  check('dragTo() admits when a clamp moved the pouch instead of silently obeying',
    drag.bad.ok === true && drag.bad.clamped.hemisphere === true &&
    Math.abs(drag.bad.angle) > 1.5,
    { angle: drag.bad.angle, clamped: drag.bad.clamped, world: drag.bad.world });
  check('release() reports BOTH speeds honestly: exitSpeed at the muzzle, speed once the kick has unwound',
    drag.rel.ok === true && drag.touched === false &&
    Math.abs(drag.rel.exitSpeed - drag.realExit) / drag.rel.exitSpeed < 0.05 &&
    Math.abs(drag.rel.speed - drag.realCruise) / drag.rel.speed < 0.05,
    { claimedExit: drag.rel.exitSpeed, measuredOneTickLater: drag.realExit,
      claimedCruise: drag.rel.speed, measuredAfterKick: drag.realCruise,
      kickSteps: drag.rel.kickSteps, kickMs: drag.rel.kickMs, power: drag.rel.power });
  check('release() with nothing to release says so instead of returning ok',
    drag.relAgain.ok === false && typeof drag.relAgain.reason === 'string', drag.relAgain);

  // ---------- tapAbility ----------
  const ability = say('tapAbility', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const idle = SS.tapAbility();
    SS.aimAndFire(0.5, 1.0); await SS.seek(300);
    const nBefore = SS.__world.projectiles.length;
    const used = SS.tapAbility();
    await SS.seek(60);
    const nAfter = SS.__world.projectiles.length;
    const twice = SS.tapAbility();
    return { idle, used, twice, nBefore, nAfter };
  `));
  check('tapAbility() is honest when idle, works in flight, and refuses a second use',
    ability.idle.ok === false && ability.used.ok === true &&
    ability.nAfter > ability.nBefore && ability.twice.ok === false,
    ability);

  // ---------- time: freeze / resume / setTimeScale — THE DEFECT-2 CASE ----------
  const time = say('freeze_resume', await game(`
    await SS.loadLevel('l1'); await SS.seed(5);
    const fr = SS.freeze();
    const t0 = SS.tick();
    await new Promise(r => setTimeout(r, 400));
    const frozenAdvanced = SS.tick() - t0;
    const re = SS.resume();
    const drivenAfterResume = SS.driven();
    const t1 = SS.tick();
    await new Promise(r => setTimeout(r, 400));
    const resumedAdvanced = SS.tick() - t1;
    const ts0 = SS.setTimeScale(0);
    const t2 = SS.tick();
    await new Promise(r => setTimeout(r, 300));
    const scaleZeroAdvanced = SS.tick() - t2;
    const ts1 = SS.setTimeScale(1);
    const t3 = SS.tick();
    await new Promise(r => setTimeout(r, 300));
    const scaleOneAdvanced = SS.tick() - t3;
    SS.freeze();
    let threw = null;
    try { SS.setTimeScale(-2); } catch (e) { threw = String(e.message).slice(0, 80); }
    return { fr, frozenAdvanced, re, drivenAfterResume, resumedAdvanced,
             ts0, scaleZeroAdvanced, ts1, scaleOneAdvanced, negativeScaleThrew: threw };
  `));
  check('freeze() returns a self-describing truth and the world really stops',
    time.fr.ok === true && time.fr.driven === true && time.frozenAdvanced === 0,
    { returned: time.fr, ticksAdvancedWhileFrozen: time.frozenAdvanced });
  check('resume() returns a self-describing truth and the world really runs again',
    time.re.ok === true && time.re.driven === false &&
    time.drivenAfterResume === false && time.resumedAdvanced > 0,
    { returned: time.re, ticksAdvancedAfterResume: time.resumedAdvanced });
  check('setTimeScale(0)/(1) match freeze/resume and report the scale in force',
    time.ts0.timeScale === 0 && time.ts0.driven === true && time.scaleZeroAdvanced === 0 &&
    time.ts1.timeScale === 1 && time.ts1.driven === false && time.scaleOneAdvanced > 0 &&
    typeof time.negativeScaleThrew === 'string',
    { ts0: time.ts0, zeroTicks: time.scaleZeroAdvanced, ts1: time.ts1, oneTicks: time.scaleOneAdvanced,
      negative: time.negativeScaleThrew });

  // ---------- seek exactness ----------
  const seek = say('seek', await game(`
    await SS.seed(9);
    const t0 = SS.tick();
    const r = await SS.seek(2000);
    const oneShot = SS.dumpBodies().map(b => b.bits).join('');
    const ticksA = SS.tick() - t0;
    await SS.seed(9);
    const t1 = SS.tick();
    for (let i = 0; i < 20; i++) await SS.seek(100);
    const stepped = SS.dumpBodies().map(b => b.bits).join('');
    const ticksB = SS.tick() - t1;
    let threw = null;
    try { await SS.seek(-5); } catch (e) { threw = String(e.message).slice(0, 60); }
    return { returned: r, ticksA, ticksB, identical: oneShot === stepped, negativeThrew: threw,
             bodies: SS.dumpBodies().length,
             // The plane invariant is a BOUND, not an equality — physics.js PLANE_EPS.
             // clampPlane() used to snap z to exactly 0 on every body on every step, which
             // marked every body modified and meant NOTHING IN THE GAME EVER SLEPT. It now
             // clamps through a 1e-6 deadband instead; measured peak |z| across a full
             // collapse is 1.2e-7 (_tools/scenarios/p3-planez.mjs).
             maxAbsZ: Math.max(...SS.dumpBodies().map(b => Math.abs(b.t[2]))),
             allOnPlane: SS.dumpBodies().every(b => Math.abs(b.t[2]) <= 1e-6) };
  `));
  check('seek() advances EXACTLY the ticks it claims, and splitting it changes nothing',
    seek.returned.steps === 240 && seek.ticksA === 240 && seek.ticksB === 240 && seek.identical,
    { returned: seek.returned, ticksA: seek.ticksA, ticksB: seek.ticksB, byteIdentical: seek.identical });
  check('seek() refuses nonsense instead of quietly doing nothing',
    typeof seek.negativeThrew === 'string', { negative: seek.negativeThrew });
  check('dumpBodies() covers every body and they are all on the z=0 plane (|z| <= PLANE_EPS)',
    seek.bodies > 0 && seek.allOnPlane,
    { bodies: seek.bodies, allOnPlane: seek.allOnPlane, maxAbsZ: seek.maxAbsZ });

  // ---------- seed ----------
  const seed = say('seed', await game(`
    const a = await SS.seed(4);
    await SS.seek(1200); const A = SS.dumpBodies().map(b => b.bits).join('');
    const b = await SS.seed(4);
    await SS.seek(1200); const B = SS.dumpBodies().map(x => x.bits).join('');
    const c = await SS.seed(77);
    await SS.seek(1200); const C = SS.dumpBodies().map(x => x.bits).join('');
    return { returnedA: a, returnedC: c, currentSeed: SS.currentSeed(),
             sameSeedSameWorld: A === B, differentSeedDifferentWorld: A !== C };
  `));
  check('seed() returns the seed actually in force and determines the world',
    seed.returnedA === 4 && seed.returnedC === 77 && seed.currentSeed === 77 &&
    seed.sameSeedSameWorld && seed.differentSeedDifferentWorld, seed);

  // ---------- perf / audioMute ----------
  const misc = say('perf_audio', await game(`
    await SS.seed(1); SS.resume();
    await new Promise(r => setTimeout(r, 500));
    const p = SS.perf();
    const bodies = SS.__world.entities.filter(e => e.body).length;
    const m1 = SS.audioMute(true), muted1 = SS.__world.audio.muted;
    const m2 = SS.audioMute(false), muted2 = SS.__world.audio.muted;
    SS.audioMute(true); SS.freeze();
    return { perf: p, bodies, m1, muted1, m2, muted2 };
  `));
  check('perf() reports measured numbers, not placeholders',
    misc.perf.fps > 0 && misc.perf.frameMs > 0 && misc.perf.bodies === misc.bodies &&
    misc.perf.drawCalls > 0 && misc.perf.tris > 0,
    { fps: misc.perf.fps, frameMs: misc.perf.frameMs, drawCalls: misc.perf.drawCalls,
      reportedBodies: misc.perf.bodies, realBodies: misc.bodies });
  check('audioMute() returns the mute state in force, not the request',
    misc.m1 === true && misc.muted1 === true && misc.m2 === false && misc.muted2 === false,
    { onReturned: misc.m1, onReal: misc.muted1, offReturned: misc.m2, offReal: misc.muted2 });

  // ---------- errors (LAST: this deliberately dirties SS.errors) ----------
  const errs = say('errors', await game(`
    const before = SS.errors.length;
    console.error('[audit] deliberate console error');
    const afterConsole = SS.errors.length;
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('[audit] deliberate window error'), message: 'x' }));
    const afterWindow = SS.errors.length;
    console.warn('[audit] deliberate warning');
    return { before, afterConsole, afterWindow, warnings: SS.warnings.length,
             warningsNotInErrors: !SS.errors.some(e => /deliberate warning/.test(e.text)),
             texts: SS.errors.slice(-2).map(e => e.text.slice(0, 60)) };
  `));
  check('errors[] captures console errors and window errors, and keeps warnings separate',
    errs.afterConsole === errs.before + 1 && errs.afterWindow === errs.before + 2 &&
    errs.warnings > 0 && errs.warningsNotInErrors, errs);

  const failed = results.filter(r => !r.pass);
  console.log(`\n  === ${results.length - failed.length}/${results.length} HOOKS HONEST ===`);
  out.push({ results, failed: failed.map(f => f.name) });
  await fs.writeFile(path.join(OUT, 'hooks.json'), JSON.stringify(out, null, 2));
};
