/**
 * p3-r6-look.mjs — THE FRAME THIS ROUND OWNS: three materials fragmenting.
 *
 * 1. Per-material direct-hit break rate + shard census on the probe levels, with a
 *    camLock close read of each material's settled wreckage so the three shard
 *    vocabularies (wood sliver / glass facet / stone lump) can be named from a crop.
 *    camLock is used ONLY for the geometry criteria, exactly as HOOKS.md allows.
 * 2. A sweep of l1 for a shot that fragments all three materials in one collapse, then
 *    a filmstrip of that collapse at the game's own framing.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = [];
if (!B.__r6l) {
  B.__r6l = true;
  const of = B.fracture;
  B.fracture = function (imp, pt) { const t = SS.tick(), k = of.call(this, imp, pt);
    window.__fx.push({ tick: t, mat: this.matName, imp, kids: k.length, x: pt?.x, y: pt?.y }); return k; };
}
return true;`;

const CENSUS = `const w = SS.__world; const d = w.debris.filter(x=>!x.dead);
const by = {}; for (const x of d) { (by[x.matName] ||= []).push(Math.max(x.w, x.h)); }
const c = {}; for (const k in by) c[k] = { n: by[k].length,
  maxBW: Math.max(...by[k]) / 0.90, minBW: Math.min(...by[k]) / 0.90 };
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

  // ---- 1. does a DIRECT hit fragment each material, and what shape is the debris? ----
  const DIRECT = [[0.06, 1.0], [0.08, 1.0], [0.10, 1.0], [0.12, 1.0], [0.14, 1.0],
                  [0.10, 0.85], [0.13, 0.85], [0.16, 0.85], [0.19, 0.85],
                  [0.12, 0.70], [0.16, 0.70], [0.20, 0.70], [0.24, 0.70]];
  for (const m of ['wood', 'glass', 'stone']) {
    let broke = 0, landed = 0, best = null, bestN = -1;
    for (const [a, p] of DIRECT) {
      const fx = await fire(game, `_p3-${m}`, 777, a, p, 3500);
      const c = await game(CENSUS);
      if (c.n > 0 || fx.length) landed++;
      if (fx.length) { broke++; if (fx.length > bestN) { bestN = fx.length; best = [a, p]; } }
    }
    L(`DIRECT ${m}: fractured on ${broke}/${DIRECT.length} probe shots`);
    if (best) {
      await fire(game, `_p3-${m}`, 777, best[0], best[1], 4000);
      const c = await game(CENSUS);
      L(`  best ${best[0]}@${best[1]} -> ${JSON.stringify(c.byMat)}`);
      await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 2.2});', c.cx, c.cy + 0.3);
      await game('await SS.seek(33);');
      await shot(`shards-${m}-CAMLOCK-2.2m`);
      await game('return SS.camUnlock();');
    }
  }

  // ---- 2. an l1 shot that fragments ALL THREE ----
  L('\n--- hunting an l1 shot that fragments all three materials ---');
  const CAND = [[0.32, 0.94], [0.31, 0.95], [0.33, 0.93], [0.30, 0.96], [0.34, 0.92],
                [0.29, 0.97], [0.35, 0.95], [0.31, 0.90], [0.33, 0.98], [0.28, 0.94],
                [0.32, 0.90], [0.30, 0.92], [0.34, 0.98], [0.27, 0.96], [0.36, 0.93]];
  let winner = null;
  for (const [a, p] of CAND) {
    const fx = await fire(game, 'l1', 4242, a, p, 6000);
    const mats = new Set(fx.map(f => f.mat));
    const c = await game(CENSUS);
    L(` ${a}@${p}: fractures ${fx.map(f => f.mat[0].toUpperCase()).join('')}  debris ${JSON.stringify(c.byMat)}`);
    if (mats.size === 3 && !winner) winner = [a, p];
  }
  L(`ALL-THREE SHOT: ${winner ? `${winner[0]}@${winner[1]}` : 'none in this sweep'}`);

  // ---- 3. the frame + the collapse, at the game's own framing ----
  const [wa, wp] = winner ?? [0.32, 0.94];
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__fx = []; return true;');
  await game('return SS.aimAndFire(args[0], args[1]);', wa, wp);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return window.__fx.length;')) break; }
  L(`first fracture at fire+${t} ms on ${wa}@${wp}`);
  await filmstrip('allthree-collapse-0-1200ms', { from: 0, to: 1200, step: 150, cols: 3 });

  // and the settled wreckage, close, so the material sorting is judgeable
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('window.__fx = []; return true;');
  await game('return SS.aimAndFire(args[0], args[1]);', wa, wp);
  await game('await SS.seek(6000);');
  const c = await game(CENSUS);
  L(`SETTLED: ${c.n} pieces  ${JSON.stringify(c.byMat)}`);
  await shot('allthree-settled-gameframing');
  await game('return SS.camLock({x: args[0], y: args[1], halfWidth: 4.5});', c.cx, c.cy + 0.6);
  await game('await SS.seek(33);');
  await shot('allthree-settled-CAMLOCK-4.5m');
  await game('return SS.camUnlock();');
  L(`state: ${JSON.stringify(await state())}`);
};
