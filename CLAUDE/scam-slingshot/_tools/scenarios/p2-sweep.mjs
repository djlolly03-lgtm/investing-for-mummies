/**
 * P2 — power/trajectory sweep.  8 angles x 3 powers on l1, fresh restart + fixed seed each shot.
 * Reports, per shot: the release report, the flight's apex, where it first touched anything,
 * where it came to rest, and the outcome (kills / score / blocks standing).
 *
 * This is the instrument for the "cliffy, zero-score band" defect. Run it before AND after any
 * change to SLING.maxSpeed / power() / GRAVITY_SCALE / ammo damping / l1 geometry.
 *
 * Env:  ANGLES="0.20,0.28,..."  POWERS="0.6,0.8,1.0"  SEED=3
 */
const num = (s, d) => (s ? s.split(',').map(Number) : d);
const ANGLES = num(process.env.ANGLES, [0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.66, 0.78]);
const POWERS = num(process.env.POWERS, [0.60, 0.80, 1.00]);
const SEED = +(process.env.SEED || 3);

export default async ({ game, state }) => {
  const rows = [];
  // The clean-miss test must be against the level's OWN block count, never a literal. It was
  // `blocksLeft === 13`, which silently stopped detecting misses the moment l1 gained blocks.
  await game('await SS.restart(); await SS.seed(args[0]);', SEED);
  const BLOCKS0 = (await state()).blocks;
  for (const power of POWERS) {
    for (const angle of ANGLES) {
      await game('await SS.restart(); await SS.seed(args[0]);', SEED);
      const rel = await game(
        'SS.aim({angle: args[0], power: args[1]}); return SS.release();', angle, power);

      // --- flight trace ----------------------------------------------------
      const trace = { apexY: -1, apexX: 0, hitX: null, hitY: null, restX: null, maxX: 0 };
      for (let t = 0; t <= 3000; t += 50) {
        const p = await game(`
          const pr = SS.__world.projectiles.filter(p => !p.dead);
          if (!pr.length) return null;
          const a = pr[0]; const t = a.body.translation(); const v = a.body.linvel();
          return { x: t.x, y: t.y, vx: v.x, vy: v.y, hit: !!a.hasHit };`);
        if (p) {
          if (p.y > trace.apexY) { trace.apexY = p.y; trace.apexX = p.x; }
          if (p.x > trace.maxX) trace.maxX = p.x;
          if (p.hit && trace.hitX === null) { trace.hitX = p.x; trace.hitY = p.y; }
          trace.restX = p.x; trace.restY = p.y;
        }
        await game('await SS.seek(50);');
      }
      await game('await SS.seek(3500);');
      const s = await state();
      rows.push({
        angle, power,
        speed: rel.speed, exit: rel.exitSpeed, muzX: rel.muzzle?.x, muzY: rel.muzzle?.y,
        apexY: +trace.apexY.toFixed(2), apexX: +trace.apexX.toFixed(2),
        hitX: trace.hitX === null ? null : +trace.hitX.toFixed(2),
        hitY: trace.hitY === null ? null : +trace.hitY.toFixed(2),
        endX: trace.restX === null ? null : +trace.restX.toFixed(2),
        killed: 2 - s.villainsAlive, score: s.score, blocksLeft: s.blocks,
        broke: BLOCKS0 - s.blocks, phase: s.phase,
      });
    }
  }

  const pad = (v, n) => String(v).padStart(n);
  console.log('\n#### P2 SWEEP  seed=' + SEED);
  console.log(`blocks at load: ${BLOCKS0}`);
  console.log('angle  pow | speed  exit | muzzle x,y   | apex y@x     | first hit x,y | end x | kill  score broke');
  for (const r of rows) {
    console.log(
      `${pad(r.angle.toFixed(2), 5)} ${pad(r.power.toFixed(2), 4)} |` +
      ` ${pad(r.speed, 5)} ${pad(r.exit, 5)} |` +
      ` ${pad(r.muzX?.toFixed(1), 5)},${pad(r.muzY?.toFixed(1), 5)} |` +
      ` ${pad(r.apexY, 5)} @${pad(r.apexX, 6)} |` +
      ` ${pad(r.hitX ?? '--', 6)},${pad(r.hitY ?? '--', 6)} |` +
      ` ${pad(r.endX ?? '--', 5)} |` +
      ` ${pad(r.killed, 4)} ${pad(r.score, 6)} ${pad(r.broke, 6)}`);
  }
  const zeros = rows.filter(r => r.score === 0);
  console.log(`\nZERO-SCORE SHOTS: ${zeros.length} / ${rows.length}  ` +
    JSON.stringify(zeros.map(z => `${z.angle}@${z.power}`)));
  console.log(`WINS: ${rows.filter(r => r.phase === 'won').length}` +
    `  KILLS>=1: ${rows.filter(r => r.killed >= 1).length}`);
  console.log('JSON:' + JSON.stringify(rows));
};
