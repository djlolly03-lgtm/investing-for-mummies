/**
 * p0-friction2.mjs — isolate the missing friction with bodies built from scratch in-page,
 * so nothing in the game's own construction path can be the explanation by accident.
 *
 * Matrix: plane-locked vs not, damping vs none, box vs ball, on the game's ground vs on a
 * fresh fixed floor. Whichever row decelerates is the one that tells us what is broken.
 */
export default async ({ game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  say('matrix', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const P = SS.__physics, R = P.RAPIER || window.__R;
    return 'need RAPIER handle';
  `).catch(e => String(e)));

  // RAPIER is not exported on the physics object; reach it through an existing collider's world.
  say('probe', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const W = SS.__physics.world;
    const g = SS.__world.entities.find(e => e.tag === 'ground');
    const b = SS.__world.blocks.find(x => x.matName === 'stone');

    // 1. Is the block actually in contact with the ground collider?
    b.body.setTranslation({ x: 30, y: 0.452, z: 0 }, true);
    b.body.setRotation({ x:0, y:0, z:0, w:1 }, true);
    b.body.setLinvel({ x: 4, y: 0, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    b.body.wakeUp();
    const rows = [];
    for (let i = 0; i < 12; i++) {
      SS.stepOnce();
      let contacts = 0, normal = null, dist = null;
      W.contactPairsWith(b.collider, (other) => { contacts++; });
      try {
        W.contactPair(b.collider, g.collider, (m, flipped) => {
          normal = m.normal(); dist = m.numSolverContacts?.() ?? -1;
        });
      } catch (e) { normal = 'ERR ' + e.message; }
      const v = b.body.linvel(), t = b.body.translation();
      rows.push({ i, vx: +v.x.toFixed(4), vy: +v.y.toFixed(4), y: +t.y.toFixed(4),
        contacts, solverContacts: dist,
        normal: normal && normal.x !== undefined ? [+normal.x.toFixed(2), +normal.y.toFixed(2), +normal.z.toFixed(2)] : normal });
    }
    return { mass: +b.body.mass().toFixed(4), gravityScale: b.body.gravityScale(),
      linDamp: b.body.linearDamping(), colFriction: b.collider.friction(),
      groundFriction: g.collider.friction(),
      bodyType: b.body.bodyType(),
      rows };
  `));

  // Same test, but with a brand-new body created here, bypassing makeBody entirely.
  say('freshBody', await game(`
    await SS.loadLevel('l1'); await SS.seed(1);
    const W = SS.__physics.world;
    const g = SS.__world.entities.find(e => e.tag === 'ground');
    // Reach RAPIER through the module graph: physics.js re-exports it.
    const mod = await import('/scam-slingshot/src/physics.js');
    const R = mod.RAPIER;
    const mk = (lock) => {
      const d = R.RigidBodyDesc.dynamic().setTranslation(30, 0.452, 0)
        .setLinearDamping(0).setAngularDamping(0);
      const body = W.createRigidBody(d);
      if (lock) { body.setEnabledTranslations(true, true, false, true);
                  body.setEnabledRotations(false, false, true, true); }
      const cd = R.ColliderDesc.cuboid(0.45, 0.45, 0.525).setFriction(0.95).setRestitution(0.03).setDensity(1.55);
      const col = W.createCollider(cd, body);
      body.setLinvel({ x: 4, y: 0, z: 0 }, true);
      return { body, col };
    };
    const A = mk(true), B = mk(false);
    B.body.setTranslation({ x: 30, y: 0.452, z: -3 }, true);   // out of A's way
    const trace = [];
    for (let i = 0; i < 30; i++) {
      SS.stepOnce();
      if (i % 5 === 4) trace.push({ i,
        lockedVx: +A.body.linvel().x.toFixed(3), lockedY: +A.body.translation().y.toFixed(3),
        freeVx: +B.body.linvel().x.toFixed(3), freeY: +B.body.translation().y.toFixed(3) });
    }
    const r = { massLocked: +A.body.mass().toFixed(3), massFree: +B.body.mass().toFixed(3), trace };
    W.removeRigidBody(A.body); W.removeRigidBody(B.body);
    return r;
  `));

  await fs.writeFile(path.join(OUT, 'friction2.json'), JSON.stringify(out, null, 2));
};
