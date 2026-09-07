/** pw-arc.mjs — where does a shot actually start, and what does the arc look like. */
export default async ({ game }) => {
  const out = []; const say = s => { out.push(s); console.log(s); };
  for (const [ang, pow] of [[0.30, 0.60], [0.30, 0.90], [0.55, 1.00], [0.75, 1.00]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return await SS.seed(4242);');
    const a = await game('return SS.aim({angle: args[0], power: args[1]});', ang, pow);
    const pre = await game(`const p = SS.__world.projectiles.find(q=>!q.dead);
      const t = p.body.translation(); return { x:t.x, y:t.y };`);
    const rel = await game('return SS.release();');
    const post = await game(`const p = SS.__world.projectiles.find(q=>!q.dead && q.launched);
      const t = p.body.translation(), v = p.body.linvel(); return { x:t.x, y:t.y, vx:v.x, vy:v.y };`);
    const path = [{ t: 0, ...post }];
    for (let t = 25; t <= 4000; t += 25) {
      await game('await SS.seek(25);');
      const p = await game(`const p = SS.__world.projectiles.find(q=>!q.dead && q.launched);
        if (!p) return null; const tr = p.body.translation(), v = p.body.linvel();
        return { x:tr.x, y:tr.y, vx:v.x, vy:v.y, hit:p.hasHit };`);
      if (!p) break;
      path.push({ t, ...p });
      if (p.hit) break;
    }
    const apex = path.reduce((m, p) => p.y > m.y ? p : m, path[0]);
    const last = path[path.length - 1];
    say(`${ang}@${pow}: pouch (${pre.x.toFixed(2)},${pre.y.toFixed(2)}) -> muzzle (${post.x.toFixed(2)},${post.y.toFixed(2)}) ` +
        `v0 ${Math.hypot(post.vx, post.vy).toFixed(2)} exitReport ${(rel.speed ?? 0).toFixed(2)}`);
    say(`   apex (${apex.x.toFixed(2)},${apex.y.toFixed(2)}) at ${apex.t}ms | contact (${last.x.toFixed(2)},${last.y.toFixed(2)}) at ${last.t}ms | rise ${(apex.y - post.y).toFixed(2)} m`);
    say(`   path y: ${path.filter((_, i) => i % 4 === 0).map(p => p.y.toFixed(1)).join(' ')}`);
  }
  return out.join('\n');
};
