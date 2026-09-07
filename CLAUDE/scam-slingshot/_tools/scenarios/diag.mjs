export default async ({ game, state }) => {
  await game('await SS.seed(1);');
  await game('await SS.seek(1200);');
  await game('SS.aim({angle:0.60, power:0.95}); SS.release();');
  for (const t of [500,1000,1500,2000,3000,4000,5000,6000]) {
    await game('await SS.seek(1000);');
    const s = await state();
    const info = await game(`
      const w = SS.__world;
      let max=0, maxTag='';
      SS.__physics.world.forEachRigidBody(b=>{ if(b.bodyType()!==0||b.isSleeping())return;
        const v=b.linvel(); const sp=Math.hypot(v.x,v.y); if(sp>max){max=sp;} });
      const ammo = w.projectiles.map(p=>({dead:p.dead,launched:p.launched,hasHit:p.hasHit,rest:p.restTicks,spent:p.spentEmitted,sp:+p.speed().toFixed(2),x:+p.position().x.toFixed(1),y:+p.position().y.toFixed(1)}));
      return { maxSpeed:+max.toFixed(3), ammo, debris:w.debris.length, hitStop:w.hitStop };
    `).catch(e=>({err:String(e)}));
    console.log(t, JSON.stringify({phase:s.phase, tick:s.tick, asleep:s.bodiesAsleep, bodies:s.bodies, ...info}));
  }
};
