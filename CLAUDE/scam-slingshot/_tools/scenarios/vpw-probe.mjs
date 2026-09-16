/**
 * vpw-probe.mjs — INDEPENDENT VERIFIER, step 0.
 * What can I read off a rigid body? Establish the primitives my own energy audit needs,
 * without trusting any existing instrument.
 */
export default async ({ game }) => {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');

  const info = await game(`
    const ph = SS.__physics, W = ph.world;
    const out = { proto: [], sample: null, counts: {}, gravity: W.gravity, timestep: W.timestep };
    let first = null;
    W.forEachRigidBody(b => { if (!first) first = b; });
    out.proto = Object.getOwnPropertyNames(Object.getPrototypeOf(first)).sort();
    const t = first.translation(), v = first.linvel(), w = first.angvel();
    out.sample = {
      mass: first.mass(), t, v, w,
      bodyType: first.bodyType(),
      handle: first.handle,
      numColliders: first.numColliders?.(),
    };
    try { out.sample.principalInertia = first.principalInertia(); } catch(e) { out.sample.principalInertia = 'ERR '+e.message; }
    try { out.sample.effAngInertia = first.effectiveAngularInertia(); } catch(e) { out.sample.effAngInertia = 'ERR '+e.message; }
    try { out.sample.invPrincipalInertiaSqrt = first.invPrincipalInertiaSqrt(); } catch(e) { out.sample.invPrincipalInertiaSqrt = 'ERR '+e.message; }
    try { out.sample.localCom = first.localCom(); out.sample.worldCom = first.worldCom(); } catch(e) { out.sample.com = 'ERR '+e.message; }
    // census
    let n=0, dyn=0, fixed=0;
    W.forEachRigidBody(b => { n++; if (b.bodyType()===0) dyn++; else fixed++; });
    out.counts = { n, dyn, fixed };
    out.world = { blocks: SS.__world.blocks.length, debris: SS.__world.debris.length,
                  villains: SS.__world.villains.length, projectiles: SS.__world.projectiles.length,
                  entities: SS.__world.entities.length };
    out.RBTypes = { };
    return out;
  `);
  console.log(JSON.stringify(info, null, 2));

  // second: enumerate every dynamic body with a tag by walking entities
  const census = await game(`
    const ph = SS.__physics, W = ph.world;
    const byHandle = new Map();
    for (const e of SS.__world.entities) if (e.body) byHandle.set(e.body.handle, e.tag ?? e.constructor.name);
    const rows = [];
    W.forEachRigidBody(b => {
      if (b.bodyType() !== 0) return;
      const t = b.translation();
      let I = null;
      try { const p = b.principalInertia(); I = [p.x, p.y, p.z]; } catch(e) { I = 'ERR'; }
      rows.push({ h: b.handle, tag: byHandle.get(b.handle) ?? '??', m: +b.mass().toFixed(4),
                  y: +t.y.toFixed(3), I: Array.isArray(I) ? I.map(v=>+v.toFixed(4)) : I,
                  sleep: b.isSleeping() });
    });
    return rows;
  `);
  console.log('DYNAMIC BODIES', census.length);
  console.log(JSON.stringify(census, null, 1));
};
