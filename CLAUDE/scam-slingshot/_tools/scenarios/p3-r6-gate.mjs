/**
 * p3-r6-gate.mjs — ROUND 6's gap AND the counterweights, in one run.
 *
 * THE GAP: only glass ever fragments. Stone (breakImpulse 17.0) and wood (9.5) sit above
 * the impulse a projectile can actually deliver, so their shard vocabularies never appear.
 *   MIX     — fractures by material across the 8-shot l1 sweep, and settled debris by
 *             material. Target: all three materials fracture somewhere in the sweep, and
 *             glass is no longer 100 % of the settled debris.
 *
 * THE COUNTERWEIGHTS (carried over from p3-r5-gate — a collapse that eats the level is not
 * a better collapse, and round 5 paid for these numbers):
 *   BROKE   — blocks fractured by one shot.  r5 baseline: median 5/17
 *   COHESION— surviving blocks still touching a neighbour at contact+300 ms.  r5: 100 %
 *   STANDING— blocks left at settle.  r5 baseline: median 12
 *   ONE-SHOT— shots that clear the level on their own.  r5 baseline: 5/8
 *   MOVED / FRAME — round 5's propagation gap, so it cannot silently regress.
 *
 * Contact time is taken from Block.onImpact with an AMMO source (ORCHESTRATOR-NOTES: the
 * r5 gate's "a block moved" detector trips up to 900 ms before the shot actually lands).
 */

const SHOTS = [
  [0.30, 0.90], [0.20, 1.00], [0.26, 0.95], [0.36, 1.00],
  [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96],
];

const FRAME = [
  ['bottomBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = []; window.__ammoHit = null;
if (!B.__r6g) {
  B.__r6g = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2 && window.__ammoHit === null) window.__ammoHit = SS.tick();
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) { const t = SS.tick(), k = of.call(this, imp, pt);
    window.__fx.push({ tick: t, mat: this.matName, imp, kids: k.length }); return k; };
}
return true;`;

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y, w:b.w, h:b.h,
           a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

const COHESION = `const bs=SS.__world.blocks.filter(b=>!b.dead);
const E=bs.map(b=>{const t=b.body.translation(),q=b.body.rotation();
  const a=Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z)),ca=Math.abs(Math.cos(a)),sa=Math.abs(Math.sin(a));
  const hw=(b.w*ca+b.h*sa)/2, hh=(b.w*sa+b.h*ca)/2;
  return {x0:t.x-hw,x1:t.x+hw,y0:t.y-hh,y1:t.y+hh};});
let touch=0;
for(let i=0;i<E.length;i++){let ok=E[i].y0<=0.30;
  for(let j=0;j<E.length&&!ok;j++){ if(i===j)continue;
    const ox=Math.min(E[i].x1,E[j].x1)-Math.max(E[i].x0,E[j].x0);
    const oy=Math.min(E[i].y1,E[j].y1)-Math.max(E[i].y0,E[j].y0);
    if(ox>-0.35&&oy>-0.35) ok=true; }
  if(ok)touch++;}
return {n:E.length, touching:touch, pct: E.length? Math.round(100*touch/E.length):100};`;

const DEBRIS_MIX = `const d = SS.__world.debris.filter(x=>!x.dead); const m={};
for (const x of d) m[x.matName] = (m[x.matName]??0)+1; return {n:d.length, m};`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

export default async ({ game, state }) => {
  const moved = [], framed = [], broke = [], coh = [], leftStanding = [];
  const fracMix = { wood: 0, glass: 0, stone: 0 };
  const debMix = { wood: 0, glass: 0, stone: 0 };
  const shotsWithMat = { wood: 0, glass: 0, stone: 0 };
  let oneShotWins = 0;

  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__fx = []; window.__ammoHit = null; return true;');
    const base = await game(SNAP);
    const byId = new Map(base.map(b => [b.id, b]));
    const N0 = base.length;

    const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r.ok) { console.log(`SHOT ${ang}@${pow} FIRE-FAIL ${r.reason}`); continue; }

    // TIME FROM THE REAL HIT: first Block.onImpact whose source is the ammo.
    let t = 0, contact = null;
    while (t < 4000) {
      await game('await SS.seek(20);'); t += 20;
      if (await game('return window.__ammoHit !== null;')) { contact = t; break; }
    }
    if (contact === null) {
      console.log(`SHOT ${ang}@${pow} NO-CONTACT`);
      moved.push(0); framed.push(0); broke.push(0); coh.push(100); leftStanding.push(N0);
      continue;
    }

    await game('await SS.seek(300);');
    const c = await game(COHESION);

    await game('await SS.seek(500);');            // now at contact + 800
    const now = await game(SNAP);

    let mv = 0;
    for (const b of now) {
      const b0 = byId.get(b.id); if (!b0) continue;
      const d = Math.hypot(b.x - b0.x, b.y - b0.y), da = Math.abs(b.a - b0.a);
      if (da >= 0.15 || d >= 0.3) mv++;
    }
    let fr = 0;
    for (const [, fx, fy] of FRAME) {
      const cur = now.find(b => { const b0 = byId.get(b.id); return b0 && Math.hypot(b0.x - fx, b0.y - fy) < 0.25; });
      if (!cur) { fr++; continue; }
      const b0 = byId.get(cur.id);
      const d = Math.hypot(cur.x - b0.x, cur.y - b0.y), da = Math.abs(cur.a - b0.a);
      if (da >= 0.15 || d >= 0.3) fr++;
    }

    let guard = 0;
    while (guard++ < 40) {
      const s = await state();
      if (s.phase !== 'flying' && s.phase !== 'settling') break;
      await game('await SS.seek(400);');
    }
    const s = await state();
    const end = await game(SNAP);
    const fx = await game('return window.__fx;');
    const deb = await game(DEBRIS_MIX);
    if (s.phase === 'won') oneShotWins++;

    const fm = { wood: 0, glass: 0, stone: 0 };
    for (const f of fx) fm[f.mat]++;
    for (const k of ['wood', 'glass', 'stone']) {
      fracMix[k] += fm[k]; debMix[k] += deb.m[k] ?? 0;
      if (fm[k] > 0) shotsWithMat[k]++;
    }

    moved.push(mv); framed.push(fr); broke.push(N0 - end.length);
    coh.push(c.pct); leftStanding.push(end.length);

    console.log(`SHOT ${ang}@${pow} contact=${contact}ms  MOVED=${mv}  FRAME=${fr}/6  ` +
      `coh@300=${c.pct}%  broke=${N0 - end.length}/${N0}  standing=${end.length}  ` +
      `phase=${s.phase} score=${s.score}`);
    console.log(`    fractures  W${fm.wood} G${fm.glass} S${fm.stone}   ` +
      `settled debris ${deb.n}: W${deb.m.wood ?? 0} G${deb.m.glass ?? 0} S${deb.m.stone ?? 0}` +
      `   [${fx.map(f => `${f.mat[0].toUpperCase()}${f.imp.toFixed(1)}`).join(' ')}]`);
  }

  const dTot = debMix.wood + debMix.glass + debMix.stone || 1;
  console.log(`\n== THE GAP: MATERIAL MIX ==`);
  console.log(`FRACTURES across the sweep   wood ${fracMix.wood}  glass ${fracMix.glass}  stone ${fracMix.stone}`);
  console.log(`SHOTS that fractured each    wood ${shotsWithMat.wood}/8  glass ${shotsWithMat.glass}/8  stone ${shotsWithMat.stone}/8`);
  console.log(`SETTLED DEBRIS by material   wood ${debMix.wood} (${(100 * debMix.wood / dTot).toFixed(0)}%)  ` +
    `glass ${debMix.glass} (${(100 * debMix.glass / dTot).toFixed(0)}%)  stone ${debMix.stone} (${(100 * debMix.stone / dTot).toFixed(0)}%)`);
  console.log(`== COUNTERWEIGHTS ==`);
  console.log(`BROKE   median ${median(broke)}/17   (r5 baseline 5)  ${JSON.stringify(broke)}`);
  console.log(`COHESION@300ms median ${median(coh)}%  (rubric >= 60) ${JSON.stringify(coh)}`);
  console.log(`STANDING@settle median ${median(leftStanding)}  (r5 baseline 12)  ${JSON.stringify(leftStanding)}`);
  console.log(`ONE-SHOT WINS ${oneShotWins}/${SHOTS.length}   (r5 baseline 5/8)`);
  console.log(`== PROPAGATION (must not regress) ==`);
  console.log(`MOVED   median ${median(moved)}   (r5 8.5, target >= 3)  ${JSON.stringify(moved)}`);
  console.log(`FRAME   median ${median(framed)}/6   (r5 5/6)  ${JSON.stringify(framed)}`);
};
