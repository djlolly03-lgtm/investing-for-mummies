/**
 * P3 — Destruction & structures.
 *
 * Everything the rubric asks for, measured rather than asserted:
 *   1. STABLE AT REST     dumpBodies() diffed at t=2000 vs t=3000 on an untouched level
 *   2. IMPACT MOMENT      40 ms filmstrip through the contact — dust ball + flash + shard fan
 *   3. CHAIN COLLAPSE     150 ms filmstrip — two puffs of different age/size in one tile
 *   4. SETTLED WRECKAGE   the "look what you did" frame, plus a piece-size census
 *   5. PER-MATERIAL       one break each of wood / glass / stone: same column, same shot, so
 *                         "name the material from one cropped chunk" is actually testable
 *
 * Two capture choices, both deliberate, both declared:
 *   · the close-up strips use SS.camLock() so the framing is identical in every tile.
 *     COMPOSITION is judged from `05-settled-gameframing` and from P4's own captures — never
 *     from a locked strip.
 *   · the DOM shell is hidden for the destruction frames. The level-end panel lands on top of
 *     the wreckage about a second after the last body sleeps and covers the middle third of
 *     exactly the frame this piece is judged on.
 */

const F = (n) => Number(n.toFixed(3));
const SHOT = 'SS.aim({angle:0.22,power:1.0}); SS.release();';
const SETUP = `await SS.seed(7); await SS.seek(900); ${SHOT}`;
const HIDE_UI = `document.getElementById('ui')?.style.setProperty('display','none');
                 document.getElementById('fx-layer')?.style.setProperty('display','none');`;

export default async ({ shot, filmstrip, game, state, OUT }) => {
  const report = {};

  // ---------------------------------------------------------------- 1. AT REST
  await game('await SS.seed(7);');
  await game('await SS.seek(2000);');
  const b1 = await game('return SS.dumpBodies();');
  await game('await SS.seek(1000);');
  const b2 = await game('return SS.dumpBodies();');
  await shot('rest');

  let maxMove = 0, worst = '';
  const byI = new Map(b2.map(b => [b.i, b]));
  for (const a of b1) {
    const b = byI.get(a.i); if (!b) continue;
    const d = Math.hypot(b.t[0] - a.t[0], b.t[1] - a.t[1]);
    if (d > maxMove) { maxMove = d; worst = a.tag; }
  }
  report.rest = {
    bodies: b2.length,
    asleep: b2.filter(b => b.sleeping).length,
    awakeTags: b2.filter(b => !b.sleeping).map(b => b.tag),
    maxMoveWorldUnits: F(maxMove), worstTag: worst,
    // world units -> screen px, so the 0.5 px criterion can be checked directly
    pxPerUnit: F(await game('return SS.__world.renderer.domElement.clientWidth / (SS.__world.rig._hw*2);')),
  };
  report.rest.maxMovePx = F(report.rest.maxMoveWorldUnits * report.rest.pxPerUnit);
  console.log('  REST  ', JSON.stringify(report.rest));

  // ------------------------------------------------- 2. the moment of impact
  await game(SETUP);
  let tArrive = 0;
  for (let t = 20; t <= 2000; t += 20) {
    const n = await game('await SS.seek(20); return SS.__world.debris.length;');
    if (n > 0) { tArrive = t; break; }
  }
  report.impactAt = tArrive;
  console.log('  first break at t =', tArrive, 'ms after release');

  await game(`${SETUP} SS.camLock({x:18.6,y:3.0,halfWidth:6.4}); ${HIDE_UI}`);
  await filmstrip('impact-closeup', { from: Math.max(0, tArrive - 60), to: tArrive + 500, step: 40, cols: 5 });

  // ------------------------------------------------------- 3. chain collapse
  await game(`${SETUP} SS.camLock({x:19.0,y:3.4,halfWidth:8.2}); ${HIDE_UI}`);
  await filmstrip('collapse-closeup', { from: tArrive - 40, to: tArrive + 2360, step: 150, cols: 5 });

  // --------------------------------------------------- 4. settled + a census
  await game('await SS.seek(2500);');
  await shot('settled-locked');
  await game('SS.camUnlock(); await SS.seek(700);');
  await shot('settled-gameframing');
  report.census = await game(`
    const d = SS.__world.debris;
    const byMat = {};
    for (const x of d) (byMat[x.matName] ??= []).push(Math.max(x.w, x.h));
    const out = {};
    for (const k in byMat) out[k] = { n: byMat[k].length,
      minLongAxis: +Math.min(...byMat[k]).toFixed(2), maxLongAxis: +Math.max(...byMat[k]).toFixed(2) };
    return { totalDebris: d.length, byMat: out, blocksLeft: SS.__world.blocks.length,
             debrisAsleep: d.filter(x=>x.body?.isSleeping()).length,
             liveParticles: SS.__world.fx.liveCount };
  `);
  console.log('  CENSUS', JSON.stringify(report.census));

  // -------- mid-collapse cohesion: are surviving blocks still touching a neighbour? -------
  await game(`${SETUP}`);
  await game(`await SS.seek(${tArrive + 300});`);
  report.cohesionAt300 = await game(`
    const bs = SS.__world.blocks.filter(b=>!b.dead);
    let touching = 0;
    for (const a of bs) {
      const ax = a.body.translation();
      let near = false;
      for (const b of bs) { if (a===b) continue;
        const bx = b.body.translation();
        const dx = Math.abs(ax.x-bx.x), dy = Math.abs(ax.y-bx.y);
        const rx = (a.w+b.w)/2 + 0.18, ry = (a.h+b.h)/2 + 0.18;
        if (dx < rx && dy < ry) { near = true; break; }
      }
      if (near) touching++;
    }
    return { surviving: bs.length, touchingANeighbour: touching,
             pct: bs.length ? Math.round(100*touching/bs.length) : 0 };
  `);
  console.log('  COHESION @+300ms', JSON.stringify(report.cohesionAt300));

  // ------------------------------------------------- 5. one break per material
  report.materials = {};
  for (const m of ['wood', 'glass', 'stone']) {
    // Search for a shot that actually breaks the column, resetting between attempts. The
    // three materials fail at very different impulses on purpose (2.6 / 9.5 / 17 N·s), so a
    // single hard-coded angle compares a real break against a near-miss — and every FX tuning
    // change shifts the shared seeded stream enough to move which angle lands.
    let hit = 0, used = null;
    for (const a of [0.20, 0.19, 0.21, 0.18, 0.22]) {
      await game(`await SS.loadLevel('_p3-${m}'); await SS.seed(5); await SS.seek(900);
                  SS.aim({angle:${a},power:1.0}); SS.release();`);
      for (let t = 0; t < 2600 && !hit; t += 20) {
        await game('await SS.seek(20);');
        hit = await game('return SS.__world.debris.length;');
      }
      if (hit) { used = a; break; }
    }
    if (!hit) console.log(`  !! ${m}: no angle in the sweep broke the column`);
    // Frame the break where it actually happened. A fixed box photographed the wood probe's
    // ground slam instead of its fracture, which put a dirt puff in a frame captioned "wood".
    await game(`
      const d = SS.__world.debris;
      let x = 18, y = 2;
      if (d.length) {
        x = d.reduce((a,e)=>a+e.body.translation().x,0)/d.length;
        y = d.reduce((a,e)=>a+e.body.translation().y,0)/d.length;
      }
      SS.camLock({ x, y: Math.max(1.5, y), halfWidth: 3.4 });
      ${HIDE_UI}
    `);
    await filmstrip(`break-${m}`, { from: 0, to: 360, step: 60, cols: 4 });
    await game('await SS.seek(2600);');
    await shot(`settled-${m}`);
    report.materials[m] = await game(`
      const d = SS.__world.debris.filter(x=>x.matName===${JSON.stringify(m)});
      return { pieces: d.length, longAxes: d.map(x=>+Math.max(x.w,x.h).toFixed(2)).sort((a,b)=>b-a),
               asleep: d.filter(x=>x.body?.isSleeping()).length };
    `);
    report.materials[m].angle = used;
    console.log(`  ${m.padEnd(6)}`, JSON.stringify(report.materials[m]));
    await game('SS.camUnlock();');
  }

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/p3-report.json`, JSON.stringify(report, null, 2));
  console.log('  final:', JSON.stringify(await state()));
};
