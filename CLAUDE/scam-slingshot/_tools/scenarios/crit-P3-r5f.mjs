/**
 * crit-P3-r5f.mjs — clean, unlabelled, single-frame panels for the blind A/B, plus the
 * settled-at-rest read captured BEFORE the level-end overlay animates in.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = [];
if (!B.__fPatched) {
  B.__fPatched = true;
  const of = B.fracture;
  B.fracture = function (imp, pt) { const t = SS.tick(), k = of.call(this, imp, pt);
    (window.__fx ||= []).push({ tick: t, mat: this.matName, kids: k.length, x: pt?.x, y: pt?.y }); return k; };
}
return true;`;

async function toFracture(game, ang, pow) {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return (window.__fx||[]).length;')) break; }
  return t;
}

const HIDEUI = `document.querySelectorAll('#hud,.hud,[data-hud]').forEach(e=>e.style.visibility='hidden'); return true;`;

export default async ({ shot, game, state, page }) => {
  const L = (...a) => console.log(...a);

  // --- mid-collapse, the frame the rubric's first P3 reference shows -------
  for (const at of [400, 700, 1000, 1300]) {
    await toFracture(game, 0.36, 1.00);
    await game('await SS.seek(args[0]);', at);
    await shot(`midcollapse-frac+${at}ms`);
    L(`midcollapse+${at}: ${JSON.stringify(await state())}`);
  }

  // --- fragmenting instant (three-materials reference) ---------------------
  await toFracture(game, 0.36, 1.00);
  await game('await SS.seek(250);');
  await shot('fragmenting-frac+250ms');

  // --- settled wreckage with NO end-of-level overlay ------------------------
  // 0.26@0.95 leaves a villain alive, so the level never resolves and no panel appears.
  await toFracture(game, 0.26, 0.95);
  await game('await SS.seek(5000);');
  await shot('settled-no-overlay');
  L(`settled-no-overlay: ${JSON.stringify(await state())}`);

  // --- the intact structure (rest) -----------------------------------------
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(2500);');
  await shot('intact-at-rest');
};
