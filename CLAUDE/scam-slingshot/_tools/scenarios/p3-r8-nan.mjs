/**
 * p3-r8-nan.mjs — WHEN does the camera transform go NaN, and does FX cause it?
 * Walks l1's opening shot in 20 ms slices and reports the first tick at which
 * camera.matrixWorld contains a non-finite element, with the rig's own fields alongside.
 */
const CHK = `
const w = SS.__world, cam = w.camera, rig = w.rig;
const bad = (m) => m && m.elements ? m.elements.some(v => !isFinite(v)) : null;
const num = (o) => { const r = {}; for (const k in o) { const v = o[k];
  if (typeof v === 'number' && !isFinite(v)) r[k] = String(v); } return r; };
return { badMW: bad(cam.matrixWorld), pos: cam.position.toArray().map(v => isFinite(v) ? +v.toFixed(3) : String(v)),
         rigNaN: num(rig), rigKeys: Object.keys(rig).filter(k => typeof rig[k] === 'number').length,
         shake: rig.shake ?? rig._shake ?? null, tick: SS.tick() };`;

async function walk({ game }, fxOn) {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('SS.__world.fx.enabled = args[0]; return SS.__world.fx.enabled;', fxOn);
  console.log(`\n--- fx.enabled=${fxOn} ---  before fire: ${JSON.stringify(await game(CHK))}`);
  await game('return SS.aimAndFire(0.26, 0.95);');
  let t = 0;
  while (t < 1600) {
    await game('await SS.seek(20);'); t += 20;
    const r = await game(CHK);
    if (r.badMW) { console.log(` FIRST NaN at fire+${t}ms  ${JSON.stringify(r)}`); return; }
  }
  console.log(` no NaN through fire+${t}ms  ${JSON.stringify(await game(CHK))}`);
}

export default async (ctx) => { await walk(ctx, true); await walk(ctx, false); };
