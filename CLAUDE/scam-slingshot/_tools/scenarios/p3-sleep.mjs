/** Why does nothing sleep on an untouched level? */
export default async ({ game }) => {
  await game('await SS.seed(7);');
  for (const t of [500, 1000, 2000, 3000, 5000]) {
    await game('await SS.seek(args[0]);', t === 500 ? 500 : 500);
    const rows = await game(`
      const b = SS.dumpBodies();
      return { t: SS.__world.simTime,
        rows: b.map(x => ({ tag:x.tag, s:x.sleeping,
          v:+Math.hypot(x.v[0],x.v[1]).toFixed(4) })) };
    `);
    const awake = rows.rows.filter(r => !r.s);
    console.log(`t=${rows.t.toFixed(2)}s asleep=${rows.rows.length - awake.length}/${rows.rows.length}`,
      JSON.stringify(awake.slice(0, 8)));
  }
  // what does rapier think the thresholds are
  console.log(await game(`
    const P = SS.__physics; const out=[];
    P.world.forEachRigidBody(b=>{ if(out.length<3) out.push({
      canSleep: b.isSleeping?.() , type: b.bodyType(),
      lin: b.linvel(), ang: b.angvel() }); });
    return out;
  `));
};
