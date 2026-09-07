/**
 * p3-r5-metric.mjs — THE round-5 gap, as a number.
 *
 * "After one good hit, at least 3 SURVIVING blocks are rotated >= 0.15 rad or displaced
 *  >= 0.3 world units from their authored pose by impact+800 ms."
 *
 * Fires 8 different shots at l1 from a fixed seed, finds the first real contact, then samples
 * the surviving blocks against the pose they were authored in. Prints a per-shot row and the
 * MEDIAN across the 8, which is the number the critic quoted (median = 1 at round 4).
 *
 * Also reports the LOAD-BEARING FRAME specifically — the six blocks the critic named — because
 * "3 blocks moved" is satisfiable by three bits of the roof and that is not the gap.
 */

const SHOTS = [
  [0.30, 0.90], [0.20, 1.00], [0.26, 0.95], [0.36, 1.00],
  [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96],
];

// The load-bearing frame the critic named, by authored centre.
const FRAME = [
  ['bottomBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y,
           a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

export default async ({ game, state }) => {
  const perShot = [];
  const frameMoved = [];
  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    const base = await game(SNAP);
    const byId = new Map(base.map(b => [b.id, b]));

    const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r.ok) { console.log(`SHOT ${ang}@${pow} FIRE-FAIL ${r.reason}`); continue; }

    // walk in 20 ms slices to the first real contact (a block moves, breaks, or debris exists)
    let t = 0, contact = null;
    while (t < 4000) {
      await game('await SS.seek(20);'); t += 20;
      const hit = await game(`const bs=SS.__world.blocks.filter(b=>!b.dead);
        if (SS.__world.debris.length) return true;
        return bs.some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.5;});`);
      if (hit) { contact = t; break; }
    }
    if (contact === null) { console.log(`SHOT ${ang}@${pow} NO-CONTACT`); perShot.push(0); frameMoved.push(0); continue; }

    await game('await SS.seek(800);');
    const now = await game(SNAP);
    const s = await state();

    let moved = 0; const movedNames = [];
    let fmoved = 0; const frameRows = [];
    for (const b of now) {
      const b0 = byId.get(b.id); if (!b0) continue;
      const d = Math.hypot(b.x - b0.x, b.y - b0.y);
      const da = Math.abs(b.a - b0.a);
      const ok = da >= 0.15 || d >= 0.3;
      if (ok) { moved++; movedNames.push(`${b.m}@${b0.x.toFixed(1)},${b0.y.toFixed(1)} d=${d.toFixed(2)} a=${da.toFixed(2)}`); }
      for (const [n, fx, fy] of FRAME) {
        if (Math.hypot(b0.x - fx, b0.y - fy) < 0.25) {
          frameRows.push(`${n} d=${d.toFixed(2)} a=${da.toFixed(3)}`);
          if (ok) fmoved++;
        }
      }
    }
    // frame blocks that DIED count as reacted too
    let frameGone = 0;
    for (const [n, fx, fy] of FRAME) {
      const still = now.some(b => { const b0 = byId.get(b.id); return b0 && Math.hypot(b0.x - fx, b0.y - fy) < 0.25; });
      if (!still) { frameGone++; frameRows.push(`${n} DESTROYED`); }
    }

    perShot.push(moved); frameMoved.push(fmoved + frameGone);
    console.log(`SHOT ${ang}@${pow} contact=${contact}ms survivors=${now.length} MOVED=${moved} frameReacted=${fmoved + frameGone}/6 debris=${s.debris} score=${s.score} villains=${s.villainsAlive}`);
    console.log('    moved: ' + (movedNames.join(' | ') || '(none)'));
    console.log('    frame: ' + frameRows.join(' | '));
  }
  console.log(`\nMEDIAN MOVED (target >= 3): ${median(perShot)}   all=${JSON.stringify(perShot)}`);
  console.log(`MEDIAN FRAME REACTED /6:     ${median(frameMoved)}   all=${JSON.stringify(frameMoved)}`);
};
