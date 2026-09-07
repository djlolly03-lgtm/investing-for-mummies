/** PW r1 critic — orientation probe. What is on the table, what does it weigh. */
export default async ({ game, state, OUT }) => {
  const st = await state();
  console.log('STATE', JSON.stringify(st));

  const ledger = await game(`
    await SS.loadLevel('l1');
    const w = SS.__world;
    const rows = w.blocks.map(b => ({
      m: b.matName, w: +b.w.toFixed(2), h: +b.h.toFixed(2),
      area: +(b.w*b.h).toFixed(3),
      mass: +b.body.mass().toFixed(3),
      x: +b.body.translation().x.toFixed(2), y: +b.body.translation().y.toFixed(2),
      dens: b.material.physics.density, rest: b.material.physics.restitution,
      fric: b.material.physics.friction,
      ld: b.material.physics.linearDamping, ad: b.material.physics.angularDamping,
      brk: b.material.physics.breakImpulse,
    }));
    const proj = w.projectiles?.length ? w.projectiles[0] : null;
    return { rows, gravity: SS.__physics.world.gravity,
             ammo: w.sling ? { mass: w.sling.loaded?.body?.mass?.() ?? null } : null };
  `);
  console.log('GRAVITY', JSON.stringify(ledger.gravity));
  console.log('AMMO', JSON.stringify(ledger.ammo));
  console.table ? console.table(ledger.rows) : console.log(ledger.rows);
  console.log('LEDGER_JSON', JSON.stringify(ledger.rows));
};
