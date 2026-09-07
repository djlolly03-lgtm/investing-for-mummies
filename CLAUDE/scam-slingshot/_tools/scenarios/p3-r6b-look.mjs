/**
 * p3-r6b-look.mjs — LOOK AT THE THING. Round 6's own eyes.
 *
 * The gap is "stone and wood can never be fragmented by a shot", so the frames that matter
 * are: a collapse in which all three materials come apart, and the settled wreckage close
 * enough that a critic could name each material from a crop with no context.
 *
 * 0.22@0.96 and 0.20@1.00 both fragment wood + glass + stone on the l1 gate; the sweep here
 * re-confirms which one does it best on the day rather than trusting a stale note.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = [];
if (!B.__r6bl) {
  B.__r6bl = true;
  const of = B.fracture;
  B.fracture = function (imp, pt) { const t = SS.tick(), k = of.call(this, imp, pt);
    window.__fx.push({ tick: t, mat: this.matName, imp: +imp.toFixed(1), kids: k.length }); return k; };
}
return true;`;

const CENSUS = `const w = SS.__world; const d = w.debris.filter(x=>!x.dead);
const by = {}; for (const x of d) { (by[x.matName] ||= []).push(Math.max(x.w, x.h)); }
const c = {}; for (const k in by) c[k] = { n: by[k].length,
  maxBW: +(Math.max(...by[k]) / 0.90).toFixed(2), minBW: +(Math.min(...by[k]) / 0.90).toFixed(2) };
return { n: d.length, byMat: c,
  cx: d.length ? d.reduce((s,x)=>s+x.body.translation().x,0)/d.length : 0,
  cy: d.length ? d.reduce((s,x)=>s+x.body.translation().y,0)/d.length : 0 };`;

async function fire(game, lvl, seed, ang, pow, settle) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__fx = []; return true;');
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  await game('await SS.seek(args[0]);', settle);
  return game('return window.__fx;');
}

export default async ({ shot, filmstrip, game, state }) => {
  const L = (...a) => console.log(...a);

  // ---- 1. which l1 shot brings all three vocabularies out? ------------------
  const CAND = [[0.22, 0.96], [0.20, 1.00], [0.32, 0.94], [0.24, 0.92], [0.21, 0.98], [0.23, 0.94]];
  let winner = null, bestScore = -1;
  for (const [a, p] of CAND) {
    const fx = await fire(game, 'l1', 4242, a, p, 6000);
    const c = await game(CENSUS);
    const mats = new Set(fx.map(f => f.mat));
    const sc = mats.size * 100 + fx.length;
    L(` ${a}@${p}: fractures [${fx.map(f => f.mat[0].toUpperCase() + f.imp).join(' ')}]  ` +
      `debris ${JSON.stringify(c.byMat)}`);
    if (mats.size === 3 && sc > bestScore) { bestScore = sc; winner = [a, p]; }
  }
  L(`ALL-THREE SHOT: ${winner ? `${winner[0]}@${winner[1]}` : 'NONE — the gap is not closed'}`);
  const [wa, wp] = winner ?? [0.22, 0.96];

  // ---- 2. the collapse itself, at the game's own framing --------------------
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__fx = []; return true;');
  await shot('l1-intact-before');
  await game('return SS.aimAndFire(args[0], args[1]);', wa, wp);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__fx.length;')) break; }
  L(`first fracture at fire+${t} ms on ${wa}@${wp}`);
  await filmstrip('collapse-0-1350ms', { from: 0, to: 1350, step: 150, cols: 5 });
  await filmstrip('collapse-1350-3000ms', { from: 0, to: 1650, step: 165, cols: 5 });

  // ---- 3. the settled wreckage, near and far -------------------------------
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('window.__fx = []; return true;');
  await game('return SS.aimAndFire(args[0], args[1]);', wa, wp);
  await game('await SS.seek(6500);');
  const c = await game(CENSUS);
  L(`SETTLED: ${c.n} pieces  ${JSON.stringify(c.byMat)}`);
  await shot('settled-gameframing');
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 4.5});', c.cx, c.cy + 0.6);
  await game('await SS.seek(33);');
  await shot('settled-CAMLOCK-4.5m');
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 2.4});', c.cx, c.cy + 0.2);
  await game('await SS.seek(33);');
  await shot('settled-CAMLOCK-2.4m');
  await game('return SS.camUnlock();');

  // ---- 4. one crop per material, from the probe levels ---------------------
  for (const m of ['wood', 'glass', 'stone']) {
    const fx = await fire(game, `_p3-${m}`, 777, 0.16, 0.88, 4000);
    const cc = await game(CENSUS);
    L(`PROBE ${m}: ${fx.length} fractures, settled ${JSON.stringify(cc.byMat)}`);
    if (!cc.n) continue;
    await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 2.2});', cc.cx, cc.cy + 0.3);
    await game('await SS.seek(33);');
    await shot(`shards-${m}-CAMLOCK-2.2m`);
    await game('return SS.camUnlock();');
  }
  L(`state: ${JSON.stringify(await state())}`);
};
