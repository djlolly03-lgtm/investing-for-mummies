/**
 * p3-r6-ba.mjs — two fixed l1 shots (seed 4242), settled, at the game's own framing.
 * Run it twice — once with the round-5 constants and once with the round-6 ones — for a
 * like-for-like pair showing the settled material mix.
 *   0.24@0.92  the shot that used to bounce off (1 block broken, 7 glass chips, nothing else)
 *   0.30@0.96  the shot that now fragments all three materials
 */
const CENSUS = `const d = SS.__world.debris.filter(x=>!x.dead); const by = {};
for (const x of d) by[x.matName] = (by[x.matName] ?? 0) + 1;
return { n: d.length, by, blocks: SS.__world.blocks.filter(b=>!b.dead).length,
  cx: d.length ? d.reduce((s,x)=>s+x.body.translation().x,0)/d.length : 18,
  cy: d.length ? d.reduce((s,x)=>s+x.body.translation().y,0)/d.length : 2 };`;

export default async ({ shot, game }) => {
  for (const [a, p] of [[0.24, 0.92], [0.30, 0.96]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game('return SS.aimAndFire(args[0], args[1]);', a, p);
    await game('await SS.seek(6000);');
    const c = await game(CENSUS);
    console.log(`SETTLED ${a}@${p}: ${c.n} debris ${JSON.stringify(c.by)}  blocks standing ${c.blocks}`);
    await shot(`settled-${a}at${p}-gameframing`);
    await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 4.5});', c.cx, c.cy + 0.6);
    await game('await SS.seek(33);');
    await shot(`settled-${a}at${p}-CAMLOCK`);
    await game('return SS.camUnlock();');
  }
};
