/**
 * p3-r5-diag.mjs — where does the shot actually land, what breaks, and does the tower EVER
 * come down? Samples at impact+200/800/2000/4000 so a slow collapse can be told apart from
 * an absent one.
 */
const SHOTS = [[0.30, 0.90], [0.24, 0.92], [0.20, 1.00]];

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y, w:b.w, h:b.h, dmg:b.damage,
           a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

export default async ({ game, state }) => {
  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    const base = await game(SNAP);
    const byId = new Map(base.map(b => [b.id, b]));
    const label = (b0) => `${b0.m}(${b0.x.toFixed(1)},${b0.y.toFixed(1)})`;

    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    let t = 0, contact = null, pt = null;
    while (t < 4000) {
      await game('await SS.seek(20);'); t += 20;
      const hit = await game(`const bs=SS.__world.blocks.filter(b=>!b.dead);
        if (SS.__world.debris.length) return true;
        return bs.some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.5;});`);
      if (hit) { contact = t;
        pt = await game(`const p=SS.__world.projectiles.filter(p=>!p.dead)[0];
          if(!p) return null; const t=p.body.translation(), v=p.body.linvel();
          return {x:+t.x.toFixed(2), y:+t.y.toFixed(2), sp:+Math.hypot(v.x,v.y).toFixed(1)};`);
        break; }
    }
    console.log(`\n=== SHOT ${ang}@${pow} contact=${contact}ms ammoAt=${JSON.stringify(pt)}`);
    let seen = 0;
    for (const at of [200, 800, 2000, 4000]) {
      await game('await SS.seek(args[0]);', at - seen); seen = at;
      const now = await game(SNAP);
      const s = await state();
      const live = new Set(now.map(b => b.id));
      const dead = base.filter(b => !live.has(b.id)).map(label);
      const moved = now.map(b => {
        const b0 = byId.get(b.id);
        const d = Math.hypot(b.x - b0.x, b.y - b0.y), da = Math.abs(b.a - b0.a);
        return (da >= 0.15 || d >= 0.3) ? `${label(b0)} d=${d.toFixed(2)} a=${da.toFixed(2)}` : null;
      }).filter(Boolean);
      console.log(` t+${at}: survivors=${now.length} debris=${s.debris} score=${s.score} vill=${s.villainsAlive} phase=${s.phase}`);
      console.log(`   destroyed: ${dead.join(', ') || '-'}`);
      console.log(`   moved(${moved.length}): ${moved.join(' | ') || '-'}`);
    }
  }
};
