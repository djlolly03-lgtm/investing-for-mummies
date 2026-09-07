/**
 * p3-r7-look.mjs — LOOK AT THE CHIPS, THROUGH THE WHOLE TUMBLE.
 *
 * The r7 gap is a colour that only appears mid-flight, so a settled still cannot show it and
 * a single frame can miss it by luck. This walks a glass burst as a filmstrip at the game's
 * own framing AND camLocked on the cloud, then puts the glass spray next to a full l1
 * collapse so the "particulate stays sorted by material" rule can be checked with wood and
 * stone in the same pile.
 *
 * camLock is used for the shard crops only (a geometry/colour criterion). The l1 collapse is
 * shot unlocked, because composition belongs to P4.
 */
async function burst(game, lvl, seed, ang, pow) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(`const B = SS.__world.blocks[0].constructor.prototype; window.__fx = [];
    if (!B.__r7l) { B.__r7l = true; const of = B.fracture;
      B.fracture = function (i, p) { const k = of.call(this, i, p); window.__fx.push(1); return k; }; }
    return true;`);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__fx.length;')) break; }
  return t;
}

const CLOUD = `const d = SS.__world.debris.filter(x => !x.dead);
if (!d.length) return null;
let sx = 0, sy = 0; for (const x of d) { const t = x.body.translation(); sx += t.x; sy += t.y; }
return { n: d.length, cx: sx / d.length, cy: sy / d.length };`;

export default async ({ shot, filmstrip, game, state }) => {
  const L = (...a) => console.log(...a);

  // 1. the glass burst at the game's own framing, through the tumble
  L(`glass burst: first fracture at fire+${await burst(game, '_p3-glass', 777, 0.16, 0.88)} ms`);
  await filmstrip('glass-burst-0-600ms', { from: 0, to: 600, step: 60, cols: 6 });

  // 2. the same burst, camLocked on the cloud so a single chip is readable
  L(`glass burst 2: fire+${await burst(game, '_p3-glass', 777, 0.16, 0.88)} ms`);
  await game('await SS.seek(160);');
  const c = await game(CLOUD);
  L(`cloud ${JSON.stringify(c)}`);
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 2.6});', c.cx, c.cy + 0.2);
  await filmstrip('glass-chips-CAMLOCK-160-520ms', { from: 0, to: 360, step: 45, cols: 5 });
  await game('return SS.camUnlock();');

  // 3. l1: all three materials in one pile — does glass still stay sorted from wood/stone?
  L(`l1: first fracture at fire+${await burst(game, 'l1', 4242, 0.22, 0.96)} ms`);
  await filmstrip('l1-collapse-0-900ms', { from: 0, to: 900, step: 100, cols: 5 });
  await game('await SS.seek(5000);');
  const p = await game(CLOUD);
  L(`l1 settled ${JSON.stringify(p)}  state ${JSON.stringify(await state())}`);
  await shot('l1-settled-gameframing');
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 3.2});', p.cx, p.cy + 0.4);
  await game('return SS.__render();');
  await shot('l1-settled-CAMLOCK-3.2m');
  await game('return SS.camUnlock();');
};
