/**
 * p3-r5-gate.mjs — the round-5 gap AND the things it could break, in one run.
 *
 * PROPAGATION (the gap):
 *   MOVED   — surviving blocks >= 0.15 rad or >= 0.3 u from their authored pose at
 *             impact+800 ms. Target: median >= 3 across 8 shots. Was 2 (roof cap only).
 *   FRAME   — how many of the six load-bearing members the critic named reacted. Was 0/6.
 *
 * THE COUNTERWEIGHTS (a collapse that eats the level is not a better collapse):
 *   BROKE   — blocks fractured by one shot. Separation before fragmentation: whole blocks
 *             are the primary debris, so this must stay well under the block count.
 *   COHESION— fraction of surviving blocks still touching a neighbour at impact+300 ms.
 *             Rubric wants >= 60 %: the tower hinges and leans, it does not dissolve.
 *   SETTLED — blocks left standing and whether ONE shot cleared the level. A level that
 *             every plausible shot one-shots has no game in it.
 */

const SHOTS = [
  [0.30, 0.90], [0.20, 1.00], [0.26, 0.95], [0.36, 1.00],
  [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96],
];

const FRAME = [
  ['bottomBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y, w:b.w, h:b.h,
           a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

/** fraction of surviving blocks whose AABB is within 0.35 u of another surviving block */
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

const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

export default async ({ game, state }) => {
  const moved = [], framed = [], broke = [], coh = [], leftStanding = [];
  let oneShotWins = 0;

  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    const base = await game(SNAP);
    const byId = new Map(base.map(b => [b.id, b]));
    const N0 = base.length;

    const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r.ok) { console.log(`SHOT ${ang}@${pow} FIRE-FAIL ${r.reason}`); continue; }

    let t = 0, contact = null;
    while (t < 4000) {
      await game('await SS.seek(20);'); t += 20;
      const hit = await game(`if (SS.__world.debris.length) return true;
        return SS.__world.blocks.filter(b=>!b.dead).some(b=>{const v=b.body.linvel();return Math.hypot(v.x,v.y)>0.5;});`);
      if (hit) { contact = t; break; }
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
    const live = new Set(now.map(b => b.id));

    let mv = 0; const names = [];
    for (const b of now) {
      const b0 = byId.get(b.id); if (!b0) continue;
      const d = Math.hypot(b.x - b0.x, b.y - b0.y), da = Math.abs(b.a - b0.a);
      if (da >= 0.15 || d >= 0.3) { mv++; names.push(`${b.m}@${b0.x.toFixed(1)},${b0.y.toFixed(1)}`); }
    }
    let fr = 0; const frows = [];
    for (const [n, fx, fy] of FRAME) {
      const cur = now.find(b => { const b0 = byId.get(b.id); return b0 && Math.hypot(b0.x - fx, b0.y - fy) < 0.25; });
      if (!cur) { fr++; frows.push(`${n}:BROKE`); continue; }
      const b0 = byId.get(cur.id);
      const d = Math.hypot(cur.x - b0.x, cur.y - b0.y), da = Math.abs(cur.a - b0.a);
      if (da >= 0.15 || d >= 0.3) fr++;
      frows.push(`${n}:d${d.toFixed(2)}/a${da.toFixed(2)}`);
    }

    // let the shot fully resolve
    let guard = 0;
    while (guard++ < 40) {
      const s = await state();
      if (s.phase !== 'flying' && s.phase !== 'settling') break;
      await game('await SS.seek(400);');
    }
    const s = await state();
    const end = await game(SNAP);
    if (s.phase === 'won') oneShotWins++;

    moved.push(mv); framed.push(fr); broke.push(N0 - end.length);
    coh.push(c.pct); leftStanding.push(end.length);

    console.log(`SHOT ${ang}@${pow} contact=${contact}ms  MOVED=${mv}  FRAME=${fr}/6  ` +
      `cohesion@300=${c.pct}%  broke=${N0 - end.length}/${N0}  standing@settle=${end.length}  ` +
      `phase=${s.phase} score=${s.score} villains=${s.villainsAlive}`);
    console.log(`    moved: ${names.join(', ') || '-'}`);
    console.log(`    frame: ${frows.join(' | ')}`);
  }

  console.log(`\n== PROPAGATION ==`);
  console.log(`MOVED   median ${median(moved)}   (target >= 3)   ${JSON.stringify(moved)}`);
  console.log(`FRAME   median ${median(framed)}/6                ${JSON.stringify(framed)}`);
  console.log(`== COUNTERWEIGHTS ==`);
  console.log(`BROKE   median ${median(broke)}/17                ${JSON.stringify(broke)}`);
  console.log(`COHESION@300ms median ${median(coh)}%  (rubric >= 60) ${JSON.stringify(coh)}`);
  console.log(`STANDING@settle median ${median(leftStanding)}     ${JSON.stringify(leftStanding)}`);
  console.log(`ONE-SHOT WINS ${oneShotWins}/${SHOTS.length}`);
};
