/** crit-P3-r7d.mjs — re-shoot the money frames on the CURRENT tree (src/fx/index.js changed
 *  at 21:43, after the r7 capture). Same seed, same shot, same seek ladder. */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__hit = null;
if (!B.__critD) { B.__critD = true; const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    if (other && other.tag === 'ammo' && app >= 1.2 && window.__hit === null) window.__hit = SS.tick();
    return oi.call(this, imp, other, pt, app); }; }
return true;`;
export default async ({ shot, filmstrip, game }) => {
  await game('return SS.freeze();');
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__hit = null; return true;');
  const r = await game('return SS.aimAndFire(0.22, 0.96);');
  if (!r.ok) throw new Error('fire: ' + r.reason);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__hit !== null;')) break; }
  console.log('contact at fire+' + t + 'ms');
  for (const [label, dt] of [['t260', 260], ['t400', 140], ['t600', 200], ['t900', 300]]) {
    await game('await SS.seek(args[0]);', dt);
    await game('return SS.__render();');
    await shot('l1-' + label + '-MONEY');
  }
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('window.__hit = null; return true;');
  await game('return SS.aimAndFire(0.22, 0.96);');
  t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__hit !== null;')) break; }
  await filmstrip('impact-0-300-fine', { from: 0, to: 300, step: 25, cols: 4 });
};
