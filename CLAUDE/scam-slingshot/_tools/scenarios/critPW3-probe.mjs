// PW round-3 CRITIC probe: what does a Rapier body expose, and what is in world.entities?
export default async ({ game }) => {
  await game(`await SS.loadLevel('l1');`);
  const info = await game(`
    const w = SS.__world, ph = SS.__physics;
    const ents = w.entities.filter(e => e.body);
    const b = ents[0].body;
    const proto = Object.getPrototypeOf(b);
    const methods = Object.getOwnPropertyNames(proto).sort();
    const tags = {};
    for (const e of ents) tags[e.tag] = (tags[e.tag]||0)+1;
    let sample = {};
    try { sample.mass = b.mass(); } catch(e){ sample.mass = 'ERR '+e.message; }
    try { sample.pi = b.principalInertia(); } catch(e){ sample.pi = 'ERR '+e.message; }
    try { sample.angvel = b.angvel(); } catch(e){ sample.angvel = 'ERR '+e.message; }
    try { sample.effInvMass = b.effectiveInvMass ? b.effectiveInvMass() : 'n/a'; } catch(e){ sample.effInvMass='ERR'; }
    try { sample.handle = b.handle; } catch(e){ sample.handle='ERR'; }
    try { sample.bodyType = b.bodyType(); } catch(e){}
    // masses of all
    const masses = ents.map(e => ({ tag: e.tag, m: +e.body.mass().toFixed(4), type: e.body.bodyType(),
       y: +e.body.translation().y.toFixed(3), pi: (()=>{try{const p=e.body.principalInertia();return [+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)];}catch(_){return null}})() }));
    return { methods, tags, sample, masses, tick: ph.tick,
             entKeys: Object.keys(ents[0]).slice(0,40),
             worldKeys: Object.keys(w) };
  `);
  console.log(JSON.stringify(info, null, 1));
};
