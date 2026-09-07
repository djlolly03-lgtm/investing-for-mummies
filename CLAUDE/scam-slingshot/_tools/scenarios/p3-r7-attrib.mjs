/**
 * p3-r7-attrib.mjs — WHO OWNS THE SLATE PIXELS, ACROSS THE WHOLE BURST?
 *
 * The r6 critic measured desaturated slate — rgb(159,189,200), S=0.20 — inside the glass
 * family ~200 ms into a burst, and attributed it to the RIGID shard's extruded side walls
 * ("once it rotates past edge-on the unlit extrusion facet dominates"). That is a claim
 * about which layer draws the pixel, and it is testable: render the SAME simulated instant
 * three times — all visible / fx pool hidden / rigid debris hidden — and difference them.
 * `SS.__render()` advances nothing, so the three frames are one physics state.
 *
 * A tumble is sampled at five times, not one, so "it only happens once it rotates past
 * edge-on" gets a fair hearing rather than a single lucky frame.
 */
/**
 * Hide ONLY the material's own particle pool, not every fx pool. Hiding all of fx also hides
 * the dust that a shard throws when it lands on grass and the release sparkles, both of which
 * are legitimately grey and neither of which is glass — counting them as "glass particulate"
 * made the slate share look like 78 % at +700 ms when the glass chips themselves had not
 * changed at all.
 */
const HIDE_FX = `
let n = 0;
for (const o of SS.__world.scene.children)
  if (o.name === 'fx-' + args[1]) { o.visible = !args[0]; n++; }
return n;`;

const HIDE_DEBRIS = `
let n = 0;
for (const d of SS.__world.debris) if (!d.dead) { d.mesh.visible = !args[0]; n++; }
return n;`;

async function burst(game, lvl, seed, ang, pow) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(`const B = SS.__world.blocks[0].constructor.prototype; window.__fx = [];
    if (!B.__r7a) { B.__r7a = true; const of = B.fracture;
      B.fracture = function (i, p) { const k = of.call(this, i, p); window.__fx.push(1); return k; }; }
    return true;`);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  let t = 0;
  while (t < 6000) {
    await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__fx.length;')) break;
  }
  return t;
}

async function triple(shot, game, tag, pool) {
  await shot(`${tag}-ALL`);
  await game(HIDE_FX, true, pool);   await shot(`${tag}-NOFX`);   await game(HIDE_FX, false, pool);
  await game(HIDE_DEBRIS, true); await shot(`${tag}-NODEBRIS`); await game(HIDE_DEBRIS, false);
}

export default async ({ shot, game }) => {
  const L = (...a) => console.log(...a);
  const TIMES = [120, 200, 300, 450, 700];

  // glass — the material under judgement, across the tumble
  let t = await burst(game, '_p3-glass', 777, 0.16, 0.88);
  L(`glass: first fracture fire+${t} ms`);
  let at = 0;
  for (const ms of TIMES) {
    await game('await SS.seek(args[0]);', ms - at); at = ms;
    const n = await game('return SS.__world.debris.filter(x=>!x.dead).length;');
    L(`  +${ms} ms: ${n} rigid fragments`);
    await triple(shot, game, `glass${ms}`, 'glass');
  }

  // stone and wood — the two colour families glass must stay out of / away from
  for (const [lvl, tag] of [['_p3-stone', 'stone'], ['_p3-wood', 'wood']]) {
    t = await burst(game, lvl, 777, 0.16, 0.88);
    await game('await SS.seek(200);');
    L(`${tag}: first fracture fire+${t} ms`);
    await triple(shot, game, `${tag}200`, tag);
  }
};
