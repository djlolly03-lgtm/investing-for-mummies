/**
 * p0-villain-proof.mjs — the pictures for DEFECT 1. p0-kill.mjs counts; this one SHOWS.
 *
 *   1 a max-power direct hit, framed on the moment of the pop
 *   2 a real shot into l1 that brings the tower down on a scammer — filmstrip across the
 *     whole collapse, so the kill can be watched rather than inferred from a counter
 *   3 the wreckage at rest (nothing sliding to the horizon any more)
 *   4 the won level card
 */
export default async ({ shot, filmstrip, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  // ---------- 1. DIRECT ----------
  await game(`await SS.loadLevel('_probe-open'); await SS.seed(1); SS.aimAndFire(0.25, 1.0);`);
  await filmstrip('direct-kill', { from: 760, to: 1080, step: 40, cols: 3 });
  say('direct_after', await state());

  // ---------- 2. COLLAPSE ----------
  const c = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    return { before: SS.state().villainsAlive, fire: SS.aimAndFire(0.30, 1.0) };
  `);
  await filmstrip('collapse-kill', { from: 600, to: 2400, step: 225, cols: 3 });
  const after = await game(`
    for (let i = 0; i < 30; i++) { await SS.seek(200); const s = SS.state();
      if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break; }
    return { state: SS.state(), hp: SS.__world.villains.map(v => +v.hp.toFixed(3)),
             fastest: (() => { let m = 0, tag = null;
               for (const e of SS.__world.entities) { if (!e.body || e.body.isFixed?.()) continue;
                 const v = e.body.linvel(); const s = Math.hypot(v.x, v.y);
                 if (s > m) { m = s; tag = e.tag; } }
               return { speed: +m.toFixed(3), tag }; })() };
  `);
  say('collapse', { before: c.before, ...after });
  await shot('wreckage-at-rest');

  // ---------- 3. A WHOLE LEVEL, PLAYED ----------
  const run = await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const shots = [[0.30,1.0],[0.26,1.0],[0.52,1.0],[0.62,1.0]];
    const log = [];
    for (const [a, p] of shots) {
      const s0 = SS.state();
      if (s0.phase === 'won' || s0.phase === 'lost') break;
      const f = SS.aimAndFire(a, p);
      if (!f.ok) { log.push({ a, p, refused: f.reason }); break; }
      let ms = 0;
      for (let i = 0; i < 40; i++) {
        await SS.seek(200); ms += 200;
        const s = SS.state();
        if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break;
      }
      const s1 = SS.state();
      log.push({ a, p, settledAfterMs: ms, phase: s1.phase, villainsAlive: s1.villainsAlive, score: s1.score });
    }
    return { log, final: SS.state() };
  `);
  say('fullRun', run);
  await new Promise(r => setTimeout(r, 1900));
  await shot('level-cleared');

  say('errors', await game('return SS.errors.map(e => e.text);'));
  await fs.writeFile(path.join(OUT, 'proof.json'), JSON.stringify(out, null, 2));
};
