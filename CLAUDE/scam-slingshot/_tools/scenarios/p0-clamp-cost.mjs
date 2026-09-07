/**
 * p0-clamp-cost.mjs — what does the per-step clampPlane() sweep actually cost?
 * Interleaved A/B/A/B from an identical rebuilt world each time, so JIT warm-up, GC and
 * "everything fell asleep by run three" cannot masquerade as a result.
 */
export default async ({ game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const r = await game(`
    const P = SS.__physics;
    const real = P.clampPlane.bind(P);
    const noop = () => {};
    const run = async (clamp) => {
      await SS.loadLevel('l1'); await SS.seed(1);
      SS.aimAndFire(0.30, 1.0); await SS.seek(900);        // mid-collapse: everything awake
      P.clampPlane = clamp ? real : noop;
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) P.stepOnce();
      const ms = performance.now() - t0;
      P.clampPlane = real;
      return { ms, bodies: SS.__world.entities.filter(e => e.body).length };
    };
    await run(true); await run(false);                      // warm both paths
    const on = [], off = [];
    for (let rep = 0; rep < 4; rep++) { on.push((await run(true)).ms); off.push((await run(false)).ms); }
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const mOn = med(on), mOff = med(off);
    return { on: on.map(x => +x.toFixed(1)), off: off.map(x => +x.toFixed(1)),
      medianOn: +mOn.toFixed(1), medianOff: +mOff.toFixed(1),
      msPerStepOn: +(mOn / 300).toFixed(4), msPerStepOff: +(mOff / 300).toFixed(4),
      overheadPct: +((mOn / mOff - 1) * 100).toFixed(1),
      msPerSecondOfGameTime: +(((mOn - mOff) / 300) * 120).toFixed(3) };
  `);
  console.log('  clampCost:', JSON.stringify(r));
  await fs.writeFile(path.join(OUT, 'clamp.json'), JSON.stringify(r, null, 2));
};
