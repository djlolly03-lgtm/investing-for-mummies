/**
 * p0-friction-diag.mjs — is there any friction between anything and the ground?
 *
 * Observed in p0-settle-diag: a wood block slid from x=24 to x=51 across flat ground, losing
 * speed at EXACTLY the rate of its 0.06 linear damping and nothing else. If ground friction
 * were doing anything at all it would have stopped in a fifth of a second. This puts one body
 * at a time on the ground at 4 m/s and reports the deceleration.
 */
export default async ({ game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  say('setup', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const g = SS.__world.entities.find(e => e.tag === 'ground');
    return { groundY: g.body.translation().y, groundFriction: g.collider.friction(),
             groundRestitution: g.collider.restitution(),
             frictionCombine: g.collider.frictionCombineRule?.() ?? 'n/a',
             blockFriction: SS.__world.blocks[0].collider.friction(),
             villainFriction: SS.__world.villains[0].collider.friction(),
             solverIters: SS.__physics.world.numSolverIterations,
             pgsIters: SS.__physics.world.numInternalPgsIterations };
  `));

  // slide test: put each candidate on the ground at 4 m/s and watch it decelerate
  const slide = async (what) => game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const W = SS.__world;
    let e;
    if (args[0] === 'block') e = W.blocks.find(b => b.matName === 'wood' && b.h < 1);
    if (args[0] === 'stone') e = W.blocks.find(b => b.matName === 'stone');
    if (args[0] === 'villain') e = W.villains[0];
    const hh = e.h ? e.h / 2 : e.radius;
    e.body.setTranslation({ x: 30, y: hh + 0.002, z: 0 }, true);
    e.body.setRotation({ x:0, y:0, z:0, w:1 }, true);
    e.body.setLinvel({ x: 4, y: 0, z: 0 }, true);
    e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    e.body.wakeUp();
    const trace = [];
    for (let i = 0; i < 16; i++) {
      await SS.seek(100);
      const t = e.body ? e.body.translation() : null;
      const v = e.body ? e.body.linvel() : null;
      trace.push({ ms: (i+1)*100, x: t ? +t.x.toFixed(2) : null, y: t ? +t.y.toFixed(3) : null,
                   vx: v ? +v.x.toFixed(3) : null, vy: v ? +v.y.toFixed(3) : null,
                   spin: e.body ? +e.body.angvel().z.toFixed(2) : null,
                   asleep: e.body ? e.body.isSleeping() : null, dead: e.dead });
    }
    return { what: args[0], mass: +(e.mass?.() ?? 0).toFixed(3), trace };
  `, what);

  for (const w of ['block', 'stone', 'villain']) say('slide_' + w, await slide(w));

  // does a body dropped from 1 m onto the ground come to rest, or skate?
  say('dropAndSkate', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const e = SS.__world.blocks.find(b => b.matName === 'wood' && b.h < 1);
    e.body.setTranslation({ x: 30, y: 1.4, z: 0 }, true);
    e.body.setLinvel({ x: 5, y: 0, z: 0 }, true);
    e.body.wakeUp();
    const trace = [];
    for (let i = 0; i < 20; i++) {
      await SS.seek(150);
      const t = e.body.translation(), v = e.body.linvel();
      trace.push({ ms: (i+1)*150, x: +t.x.toFixed(2), y: +t.y.toFixed(2),
                   sp: +Math.hypot(v.x, v.y).toFixed(2), asleep: e.body.isSleeping() });
    }
    return trace;
  `));

  await fs.writeFile(path.join(OUT, 'friction.json'), JSON.stringify(out, null, 2));
};
