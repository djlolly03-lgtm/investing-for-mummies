/**
 * p0-dragproof.mjs — three DIFFERENT drags, all driven through the real screen-space pointer
 * path, proving the mapping visually as well as numerically.
 *
 * Each drag is aimed by naming a shot; the pixel is derived from the live sling anchor and the
 * live camera. The tiles must show three visibly different band directions and three visibly
 * different arcs. If the mapping were inverted, scaled wrongly, or wrong about its origin, the
 * three would not fan out in the direction the drag went.
 */
export default async ({ shot, filmstrip, game, state, dragShot }) => {
  const rows = [];
  for (const [tag, angle, power] of [['low-20deg', 0.20, 0.90],
                                     ['mid-42deg', 0.42, 0.90],
                                     ['high-75deg', 0.75, 0.90]]) {
    await game('await SS.seed(3); await SS.seek(1400);');
    const d = await dragShot(angle, power, { steps: 6 });
    await game('await SS.seek(250);');            // let the draw framing settle before the still
    await shot(`draw-${tag}`);
    const rel = await game('return SS.release();');
    await filmstrip(`flight-${tag}`, { from: 0, to: 1200, step: 100, cols: 4 });
    const f = await state();
    rows.push({ tag, wanted: { angle, power },
                dragReported: { angle: d.angle, drawn: d.drawn, clamped: d.clamped, grabbable: d.grabbable },
                released: { angle: rel.angle, speed: rel.speed, exitSpeed: rel.exitSpeed },
                outcome: { score: f.score, blocks: f.blocks, debris: f.debris, villainsAlive: f.villainsAlive } });
    console.log('  ', JSON.stringify(rows[rows.length - 1]));
  }

  const bad = rows.filter(r => Math.abs(r.dragReported.angle - r.wanted.angle) > 0.01
    || Math.abs(r.released.angle - r.wanted.angle) > 0.01 || r.dragReported.clamped.hemisphere);
  console.log(bad.length ? `  FAIL: ${JSON.stringify(bad)}`
    : `  PASS: three real pointer drags produced ${rows.map(r => r.released.angle).join(', ')} rad — `
      + 'each the angle it was dragged to, none clamped.');
  if (bad.length) throw new Error('p0-dragproof: the pointer path did not honour the drag');
};
