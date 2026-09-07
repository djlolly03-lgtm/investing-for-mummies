/**
 * crit-PW-r3-ab.mjs — price EACH HALF of the energy ledger, on ONE tree, back to back.
 *
 * ORCHESTRATOR-NOTES r6 §5: a gate number taken before another builder's edit is not
 * comparable to one taken after, so both arms have to run in the same process against the
 * same files. `structure.tuneMatch` / `tunePriced` / `tuneTransmit` are debug-only knobs that
 * exist purely for this.
 *
 * Per config it reports the propagation counterweights (MOVED at contact+800 ms, FRAME, BROKE,
 * STANDING, one-shot wins) AND the fixed-cohort energy creation, so the trade is visible in
 * one table instead of across two runs.
 */
const G = 9.81 * 2.4;

const SHOTS = [
  [0.30, 0.90], [0.20, 1.00], [0.26, 0.95], [0.36, 1.00],
  [0.24, 0.92], [0.32, 0.94], [0.28, 0.88], [0.22, 0.96],
];
const FRAME = [
  ['bottomBeam', 18.00, 0.22], ['postWL', 17.10, 1.74], ['postWR', 18.90, 1.74],
  ['colGL', 16.10, 1.74], ['colGR', 19.90, 1.74], ['midBeam', 18.00, 3.26],
];

const CONFIGS = (process.env.PW_CONFIGS ? JSON.parse(process.env.PW_CONFIGS) : [
  { name: 'LEDGER OFF (r2 behaviour)', match: false, priced: false, transmit: 0.22 },
  { name: 'match only',                match: true,  priced: false, transmit: 0.22 },
  { name: 'SHIPPED  T=0.22',           match: true,  priced: true,  transmit: 0.22 },
  { name: 'priced   T=0.60',           match: true,  priced: true,  transmit: 0.60 },
  { name: 'priced   T=1.00',           match: true,  priced: true,  transmit: 1.00 },
]);

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, m:b.matName, x:t.x, y:t.y,
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
return E.length? Math.round(100*touch/E.length):100;`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

/** One shot, stepped by hand so the fixed-cohort ledger and the gate metrics come from the
 *  SAME simulation rather than from two runs that only agree by luck. */
const RUN = `
  const w = SS.__world, G = ${G};
  const base = new Map();
  for (const b of w.blocks) { const t=b.body.translation(), q=b.body.rotation();
    base.set(b.id, [t.x, t.y, Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z))]); }
  const N0 = w.blocks.length;
  const snapE = () => { const m = new Map();
    for (const b of w.blocks) { const t=b.body.translation(), v=b.body.linvel(); m.set(b,[b.body.mass(),v.x,v.y,t.y]); }
    for (const d of w.debris) { if(!d.body) continue; const t=d.body.translation(), v=d.body.linvel(); m.set(d,[d.body.mass(),v.x,v.y,t.y]); }
    const p = w.projectiles && w.projectiles[0];
    if (p && p.body) { const t=p.body.translation(), v=p.body.linvel(); m.set(p,[p.body.mass(),v.x,v.y,t.y]); }
    return m; };
  let prev = snapE(), hitAt = -1, pos = 0, neg = 0, worst = 0;
  let moved = -1, framed = -1, coh = -1;
  const FR = ${JSON.stringify(FRAME)};
  const STEPS_800 = 96, STEPS_300 = 36;
  for (let n = 0; n < 900; n++) {
    SS.stepOnce();
    if (hitAt < 0 && window.__ammoHit !== null) hitAt = n;
    const cur = snapE();
    if (hitAt >= 0 && n - hitAt <= 240) {
      let dKE = 0, dPE = 0;
      for (const [k,a] of cur) { const b = prev.get(k); if (!b) continue;
        dKE += 0.5*a[0]*(a[1]*a[1]+a[2]*a[2]) - 0.5*b[0]*(b[1]*b[1]+b[2]*b[2]);
        dPE += b[0]*G*(b[3]-a[3]); }
      const e = dKE - dPE;
      if (e > 0) { pos += e; if (e > worst) worst = e; } else neg += e;
    }
    prev = cur;
    if (hitAt >= 0 && n - hitAt === STEPS_300) coh = (function(){ ${COHESION} })();
    if (hitAt >= 0 && n - hitAt === STEPS_800) {
      const now = new Map();
      for (const b of w.blocks) { const t=b.body.translation(), q=b.body.rotation();
        now.set(b.id, [t.x, t.y, Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z))]); }
      moved = 0;
      for (const [id, a] of now) { const b0 = base.get(id); if (!b0) continue;
        if (Math.abs(a[2]-b0[2]) >= 0.15 || Math.hypot(a[0]-b0[0], a[1]-b0[1]) >= 0.3) moved++; }
      framed = 0;
      for (const [, fx, fy] of FR) {
        let hit = null;
        for (const [id, b0] of base) if (Math.hypot(b0[0]-fx, b0[1]-fy) < 0.25) hit = id;
        if (hit === null) continue;
        const a = now.get(hit);
        if (!a) { framed++; continue; }
        const b0 = base.get(hit);
        if (Math.abs(a[2]-b0[2]) >= 0.15 || Math.hypot(a[0]-b0[0], a[1]-b0[1]) >= 0.3) framed++;
      }
    }
  }
  const st = await SS.state();
  return { moved, framed, coh, broke: N0 - w.blocks.length, standing: w.blocks.length,
           pos: +pos.toFixed(2), neg: +neg.toFixed(1), worst: +worst.toFixed(2),
           phase: st.phase, score: st.score, hitAt,
           stats: JSON.parse(JSON.stringify(SS.__struct.stats)) };
`;

export default async ({ game }) => {
  await game(`
    let MOD = null;
    for (const u of ['/scam-slingshot/src/level/structure.js', new URL('src/level/structure.js', location.href).href]) {
      try { MOD = await import(u); if (MOD && MOD.structure) break; } catch (e) { MOD = null; }
    }
    if (!MOD) throw new Error('no structure module');
    window.SS.__struct = MOD.structure;
    const B = SS.__world.blocks[0].constructor.prototype;
    window.__ammoHit = null;
    if (!B.__pwab) { B.__pwab = true; const oi = B.onImpact;
      B.onImpact = function (imp, other, pt, app) {
        if (other?.tag === 'ammo' && app >= 1.2 && window.__ammoHit === null) window.__ammoHit = 1;
        return oi.call(this, imp, other, pt, app); }; }
    return true;`);

  const table = [];
  for (const cfg of CONFIGS) {
    const moved = [], framed = [], broke = [], standing = [], coh = [];
    let wins = 0, posSum = 0, worst = 0, credit = 0, spent = 0, starved = 0, dead = 0;
    const byJ = {};
    for (const [ang, pow] of SHOTS) {
      await game(`SS.freeze();`);
      await game(`await SS.loadLevel('l1');`);
      await game(`await SS.seed(4242);`);
      await game(`const S = SS.__struct; S.tuneMatch = args[0]; S.tunePriced = args[1]; S.tuneTransmit = args[2];
                  if (args[3]) S.tunePoolCap = args[3];
                  const p = args[4] || {};
                  S.tuneDetachD = p.detachD ?? 0.55; S.tuneDetachA = p.detachA ?? 0.35;
                  S.tuneRackTrigger = p.rackTrigger ?? 0.30; S.tuneAuditTicks = p.auditTicks ?? 8;
                  S.tuneHeadOv = p.headOv ?? 0.06;
                  window.__ammoHit = null; return true;`, cfg.match, cfg.priced, cfg.transmit, cfg.cap ?? 0, cfg.pre ?? null);
      const r0 = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
      if (!r0.ok) { console.log(`  FIRE-FAIL ${ang}@${pow} ${r0.reason}`); continue; }
      const r = await game(RUN);
      if (r.hitAt < 0) { dead++; moved.push(0); framed.push(0); broke.push(0); standing.push(17); coh.push(100); continue; }
      moved.push(r.moved); framed.push(r.framed); broke.push(r.broke);
      standing.push(r.standing); coh.push(r.coh);
      if (r.phase === 'won') wins++;
      posSum += r.pos; if (r.worst > worst) worst = r.worst;
      credit += r.stats.creditJ; spent += r.stats.spentJ; starved += r.stats.starved;
      for (const k of Object.keys(r.stats.byJ)) byJ[k] = (byJ[k] ?? 0) + r.stats.byJ[k];
    }
    const row = { name: cfg.name, ...cfg,
      MOVED: median(moved), FRAME: median(framed), BROKE: median(broke),
      STANDING: median(standing), COH: median(coh), wins, noContact: dead,
      createdAvg: +(posSum / SHOTS.length).toFixed(2), worstStep: +worst.toFixed(2),
      creditAvg: +(credit / SHOTS.length).toFixed(1), spentAvg: +(spent / SHOTS.length).toFixed(1),
      starvedAvg: Math.round(starved / SHOTS.length),
      movedAll: moved, frameAll: framed };
    table.push(row);
    console.log(`${cfg.name.padEnd(26)} MOVED ${String(row.MOVED).padStart(4)} FRAME ${String(row.FRAME).padStart(4)}/6  ` +
      `BROKE ${String(row.BROKE).padStart(4)} STAND ${String(row.STANDING).padStart(4)} COH ${row.COH}%  WIN ${wins}/8  ` +
      `| created ${String(row.createdAvg).padStart(6)} J/shot  worst step ${String(row.worstStep).padStart(6)} J  ` +
      `| credit ${row.creditAvg} spent ${row.spentAvg} starved ${row.starvedAvg}`);
    console.log(`${' '.repeat(26)} moved ${JSON.stringify(moved)} frame ${JSON.stringify(framed)}  spend/shot ` +
      Object.entries(byJ).map(([k,v]) => `${k} ${(v/SHOTS.length).toFixed(1)}`).join('  '));
  }
  return table;
};
