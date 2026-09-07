/**
 * p3-r8-attrib.mjs — IS THE HOT CORE ACTUALLY INSIDE THE DARK MASS? (layer differencing)
 *
 * Method is r7's, and it is the only one that does not need a colour guess to define the
 * population (ORCHESTRATOR-NOTES, P3 r7): render the SAME simulated instant three times with
 * `SS.__render()`, which advances nothing —
 *      all       every layer visible
 *      no-core   the `core` pool hidden
 *      no-mass   the smoke / tuft pools hidden
 * — and difference. `all − no-core` is exactly the pixel set the core drew; `all − no-mass` is
 * exactly the pixel set the mass drew. `_tools/p3-r8-compose.py` then reports, per timestamp:
 *      mass area · core area · core:mass area · CONTAINMENT (share of core pixels that land
 *      inside the mass silhouette) · the mean value of each.
 *
 * Containment is the criterion the r7 critic's gap is really about: a star drawn on the sky
 * next to a puff and a star burning inside a puff have the same area ratio and are not the
 * same picture.
 *
 * camLock is used on purpose and it is declared: this is a GEOMETRY/COLOUR criterion, so the
 * lens is parked on the contact point at a fixed halfWidth and every tile is byte-identical
 * in framing. Composition at the game's own framing belongs to P4 and is shot separately in
 * `p3-r8-look.mjs`.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
if (!B.__r8a) {
  B.__r8a = true;
  const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__fh == null) {
      window.__fh = SS.tick(); window.__fp = { x: pt.x, y: pt.y };
    }
    return oi.call(this, imp, other, pt, app);
  };
}
window.__fh = null; window.__fp = null;
return true;`;

const MASS_POOLS = ['smoke', 'tuftWood', 'tuftGlass'];

const SHOW = `
const F = SS.__world.fx.pools;
const hide = args[0];
for (const k in F) F[k].mesh.visible = !hide.includes(k);
SS.__render();
return Object.keys(F).filter(k => !F[k].mesh.visible);`;

export default async ({ game, shot, OUT }) => {
  const runs = [
    ['l1',        4242, 0.26, 0.95, 4.6],
    ['_p3-wood',  777,  0.16, 0.88, 4.0],
    ['_p3-glass', 777,  0.16, 0.88, 4.0],
    ['_p3-stone', 777,  0.16, 0.88, 4.0],
  ];
  for (const [lvl, seed, ang, pow, hw] of runs) {
    await game('return await SS.loadLevel(args[0]);', lvl);
    await game('return SS.seed(args[0]);', seed);
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    let t = 0;
    while (t < 5000) { await game('await SS.seek(10);'); t += 10;
      if (await game('return window.__fh;')) break; }
    const p = await game('return window.__fp;');
    console.log(`\n=== ${lvl}: first ammo contact fire+${t}ms at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    await game('return SS.camLock({ x: args[0], y: args[1], halfWidth: args[2] });', p.x, p.y, hw);
    let seen = 0;
    for (const at of [0, 40, 80, 120, 200, 300, 400]) {
      if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
      // re-lock: a collapse can fire camera intent that clears the lock mid-strip
      await game('return SS.camLock({ x: args[0], y: args[1], halfWidth: args[2] });', p.x, p.y, hw);
      await game(SHOW, []);
      await shot(`${lvl}-t${String(at).padStart(3, '0')}-all`);
      await game(SHOW, ['core']);
      await shot(`${lvl}-t${String(at).padStart(3, '0')}-nocore`);
      await game(SHOW, MASS_POOLS);
      await shot(`${lvl}-t${String(at).padStart(3, '0')}-nomass`);
      await game(SHOW, []);
    }
    await game('return SS.camUnlock();');
  }
  console.log(`\nframes in ${OUT}`);
};
