/**
 * crit-P3-r3-probe5.mjs — fairness check for the round-3 P3 verdict.
 * Does ANY reachable shot make l1's tower actually come apart, or does every hit
 * leave the lower storey standing at its authored pose?
 * Measures, per shot: surviving blocks that rotated >=0.15 rad or moved >=0.3u.
 */
const AUTHORED = [
  [18.0,0.22],[16.1,1.74],[19.9,1.74],[17.1,1.74],[18.9,1.74],[18.0,3.26],
  [16.95,4.33],[19.05,4.33],[18.0,5.4],[18.0,6.07],[21.9,0.42],[22.9,0.42],[22.4,1.06]];

export default async ({ game, state, shot }) => {
  const P = (k, v) => console.log('PROBE5 ' + k + ' ' + JSON.stringify(v));
  const DUMP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
      const t=b.body.translation(), q=b.body.rotation();
      return { m:b.matName, x:+t.x.toFixed(2), y:+t.y.toFixed(2),
               a:+Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z)).toFixed(3) }; });`;
  const rows = [];
  for (const [a,p] of [[0.20,1.00],[0.26,0.95],[0.30,0.90],[0.34,0.85],[0.10,0.90],[0.14,0.95],[0.40,0.80],[0.05,0.85]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    const r = await game('return SS.aimAndFire(args[0], args[1]);', a, p);
    if (!r.ok) continue;
    await game('await SS.seek(9000);');
    const B = await game(DUMP);
    const s = await state();
    let disturbed = 0, maxRot = 0, maxMove = 0;
    for (const b of B) {
      const near = AUTHORED.map(([ax,ay])=>Math.hypot(ax-b.x, ay-b.y)).sort((u,v)=>u-v)[0];
      maxRot = Math.max(maxRot, Math.abs(b.a));
      maxMove = Math.max(maxMove, near);
      if (Math.abs(b.a) >= 0.15 || near >= 0.3) disturbed++;
    }
    rows.push({ a, p, score:s.score, kills:2-s.villainsAlive, blocksLeft:B.length, debris:s.debris,
                disturbedSurvivors:disturbed, maxRotRad:+maxRot.toFixed(3), maxMoveU:+maxMove.toFixed(2) });
    P('shot', rows[rows.length-1]);
  }
  // best-case: the whole 4-ammo run
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  for (let i=0;i<4;i++){
    const s = await state(); if (s.phase==='won'||s.phase==='lost') break;
    const r = await game('return SS.aimAndFire(args[0], args[1]);', [0.30,0.20,0.26,0.34][i], [0.90,1.00,0.95,0.85][i]);
    if (!r.ok) break; await game('await SS.seek(6000);');
  }
  await shot('l1-after-full-run');
  const B = await game(DUMP);
  P('full-run', { blocksLeft:B.length, state: await state(),
      standingAtAuthoredPose: B.filter(b=>Math.abs(b.a)<0.15 &&
        AUTHORED.some(([ax,ay])=>Math.hypot(ax-b.x,ay-b.y)<0.3)).length });
};
