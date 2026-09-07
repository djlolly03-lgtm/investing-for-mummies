/**
 * p0-friction3.mjs — WHICH HALF of the 2.5D plane lock kills friction?
 *
 * p0-friction2 proved two identical boxes on the same ground behave completely differently:
 * plane-locked -> vx 4.000 forever (zero friction), unlocked -> stops in a third of a second.
 * Four rows: neither lock / translations only / rotations only / both. Then the candidate
 * fixes, measured the same way.
 */
export default async ({ game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  say('locks', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const W = SS.__physics.world;
    const mod = await import('/scam-slingshot/src/physics.js');
    const R = mod.RAPIER;
    const run = (lockT, lockR, x) => {
      const d = R.RigidBodyDesc.dynamic().setTranslation(x, 0.452, 0)
        .setLinearDamping(0).setAngularDamping(0);
      const body = W.createRigidBody(d);
      if (lockT) body.setEnabledTranslations(true, true, false, true);
      if (lockR) body.setEnabledRotations(false, false, true, true);
      const cd = R.ColliderDesc.cuboid(0.45, 0.45, 0.525).setFriction(0.95).setRestitution(0.03).setDensity(1.55);
      W.createCollider(cd, body);
      body.setLinvel({ x: 4, y: 0, z: 0 }, true);
      return body;
    };
    const cases = [
      { name: 'neither',      b: run(false, false, 38) },
      { name: 'transOnly',    b: run(true,  false, 46) },
      { name: 'rotOnly',      b: run(false, true,  54) },
      { name: 'both',         b: run(true,  true,  62) },
    ];
    for (let i = 0; i < 36; i++) SS.stepOnce();     // 300 ms
    const res = cases.map(c => ({ name: c.name, vx: +c.b.linvel().x.toFixed(3),
      y: +c.b.translation().y.toFixed(3), z: +c.b.translation().z.toFixed(4),
      spinX: +c.b.angvel().x.toFixed(3), spinZ: +c.b.angvel().z.toFixed(3) }));
    for (const c of cases) W.removeRigidBody(c.b);
    return res;
  `));

  // Candidate fixes, measured the same way. Each keeps the game 2.5D but pays for it
  // differently.
  say('fixes', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const W = SS.__physics.world;
    const mod = await import('/scam-slingshot/src/physics.js');
    const R = mod.RAPIER;
    const mk = (z, cfg) => {
      const d = R.RigidBodyDesc.dynamic().setTranslation(30, 0.452, z)
        .setLinearDamping(0).setAngularDamping(0);
      const body = W.createRigidBody(d);
      cfg(body);
      const cd = R.ColliderDesc.cuboid(0.45, 0.45, 0.525).setFriction(0.95).setRestitution(0.03).setDensity(1.55);
      W.createCollider(cd, body);
      body.setLinvel({ x: 4, y: 0, z: 0 }, true);
      return body;
    };
    // A: rotations locked (x,y), translations FREE — clamp z in software each step
    const A = mk(-8, b => b.setEnabledRotations(false, false, true, true));
    // B: nothing locked at all — how far does z actually drift on its own?
    const B = mk(0, () => {});
    // C: translations free + rotations locked, and z clamped by zeroing vz only (no teleport)
    const C = mk(8, b => b.setEnabledRotations(false, false, true, true));
    const trace = [];
    for (let i = 0; i < 60; i++) {
      // software plane clamp for A (position + velocity) and C (velocity only)
      let t = A.translation(), v = A.linvel();
      if (t.z !== 0 || v.z !== 0) { A.setTranslation({ x: t.x, y: t.y, z: 0 }, false); A.setLinvel({ x: v.x, y: v.y, z: 0 }, false); }
      v = C.linvel(); if (v.z !== 0) C.setLinvel({ x: v.x, y: v.y, z: 0 }, false);
      SS.stepOnce();
      if (i % 12 === 11) trace.push({ i,
        A: { vx: +A.linvel().x.toFixed(3), z: +A.translation().z.toFixed(5), y: +A.translation().y.toFixed(3) },
        B: { vx: +B.linvel().x.toFixed(3), z: +B.translation().z.toFixed(5) },
        C: { vx: +C.linvel().x.toFixed(3), z: +C.translation().z.toFixed(5) } });
    }
    const r = { trace };
    W.removeRigidBody(A); W.removeRigidBody(B); W.removeRigidBody(C);
    return r;
  `));

  await fs.writeFile(path.join(OUT, 'friction3.json'), JSON.stringify(out, null, 2));
};
