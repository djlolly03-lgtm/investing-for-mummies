/**
 * p0-settle-diag.mjs — why does a shot take nine seconds to hand control back?
 *
 * `worldQuiet()` wants every dynamic body under 0.85 m/s for 36 consecutive ticks. Something
 * is not obliging. This names it: after a real l1 shot, every 500 ms, the five fastest bodies
 * with their tag, material and speed — plus when 'settling' starts and ends and why.
 */
export default async ({ game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  const MOVERS = `
    (() => {
      const rows = [];
      for (const e of SS.__world.entities) {
        if (!e.body || e.body.isFixed?.()) continue;
        const v = e.body.linvel();
        const sp = Math.hypot(v.x, v.y);
        const w = e.body.angvel();
        rows.push({ tag: e.tag, m: e.matName || '-', sp: +sp.toFixed(2),
          spin: +Math.abs(w.z).toFixed(2), asleep: e.body.isSleeping(),
          x: +e.body.translation().x.toFixed(1), y: +e.body.translation().y.toFixed(1) });
      }
      rows.sort((a, b) => b.sp - a.sp);
      return { n: rows.length, awake: rows.filter(r => !r.asleep).length, top: rows.slice(0, 5) };
    })()`;

  for (const angle of [0.30, 0.44]) {
    const r = await game(`
      await SS.loadLevel('l1'); await SS.seed(1);
      SS.aimAndFire(args[0], 1.0);
      const marks = [];
      let phase = SS.state().phase;
      for (let i = 0; i < 30; i++) {
        await SS.seek(500);
        const s = SS.state();
        marks.push({ ms: (i+1)*500, phase: s.phase, movers: ${MOVERS} });
        if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break;
      }
      return { angle: args[0], marks, final: SS.state() };
    `, angle);
    say('shot_' + angle, r);
  }

  await fs.writeFile(path.join(OUT, 'settle.json'), JSON.stringify(out, null, 2));
};
