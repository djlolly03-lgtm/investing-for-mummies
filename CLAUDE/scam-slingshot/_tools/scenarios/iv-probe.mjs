/**
 * INDEPENDENT VERIFIER — API discovery probe.
 * What methods does a rapier RigidBody expose? What shape are world.blocks?
 */
export default async ({ game }) => {
  const r = await game(`
    await SS.loadLevel('l1');
    SS.freeze();
    const w = SS.__world, ph = SS.__physics;
    const out = { blocks: w.blocks.length, entities: w.entities.length, villains: w.villains.length };
    let proto = null, sample = null;
    ph.world.forEachRigidBody(b => { if (!proto) { proto = Object.getPrototypeOf(b); sample = b; } });
    out.bodyMethods = Object.getOwnPropertyNames(proto).sort();
    const b0 = w.blocks[0];
    out.blockKeys = Object.keys(b0);
    out.blockProtoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(b0));
    try { out.mass = sample.mass(); } catch(e) { out.massErr = String(e); }
    const tries = ['principalInertia','effectiveAngularInertia','invPrincipalInertiaSqrt','effectiveInvMass','angularDamping','linearDamping','localCom','worldCom'];
    out.probe = {};
    for (const k of tries) { try { const v = sample[k] ? sample[k]() : 'MISSING'; out.probe[k] = (v && typeof v==='object') ? JSON.parse(JSON.stringify(v)) : v; } catch(e){ out.probe[k] = 'ERR '+e.message; } }
    // block sizes/materials
    out.blockSample = w.blocks.slice(0,4).map(b => ({
      mat: b.material || b.mat || b.def?.material,
      keys: Object.keys(b).slice(0,40),
      mass: b.body ? b.body.mass() : null,
      half: b.half || b.size || b.def?.size || null,
      handle: b.body ? b.body.handle : null,
    }));
    out.structReport = SS.__structure();
    out.physOnStep = typeof ph.onStep;
    return out;
  `);
  console.log(JSON.stringify(r, null, 2));
};
