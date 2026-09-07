/**
 * crit-PW-r3b-ab.mjs — price the two PW r3b changes SEPARATELY, on ONE tree.
 *
 * ORCHESTRATOR-NOTES r6 §5: a number taken before another builder's edit is not comparable
 * to one taken after, so both arms of every comparison run back to back in one process
 * against one checkout, driven by structure.js's debug knobs.
 *
 *   base    — single-write rack/tip, everything due fires on the tick it is due (the tree as
 *             PW r3 shipped it)
 *   ramp    — rack/tip delivered as a capped-increment velocity ramp
 *   stagger — at most `WRITES_PER_STEP` queued joint/shudder writes per solver step
 *   both    — shipped
 *
 * For each arm and each shot it reports, from the SAME run:
 *   · the fixed-cohort energy audit (bodies by identity, gravity's PE release subtracted)
 *     — created J, and the worst single step attributable to a structure write
 *   · propagation — blocks moved at true-contact + 800 ms, and how many of the six
 *     load-bearing frame members reacted
 *   · destruction counterweights — fractured, standing
 */
const G = 9.81 * 2.4;

const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.24, 0.92], [0.34, 0.92], [0.32, 0.94]];

const ARMS = [
  ['base', { tuneRackSteps: 1, tuneTipSteps: 1, tuneWritesPerStep: 1e9 }],
  ['ramp', { tuneRackSteps: 8, tuneTipSteps: 6, tuneWritesPerStep: 1e9 }],
  ['stagger', { tuneRackSteps: 1, tuneTipSteps: 1, tuneWritesPerStep: 2 }],
  ['both', { tuneRackSteps: 8, tuneTipSteps: 6, tuneWritesPerStep: 2 }],
];

const FRAME = [
  [18.00, 0.22], [17.10, 1.74], [18.90, 1.74],
  [16.10, 1.74], [19.90, 1.74], [18.00, 3.26],
];

const SNAP = `return SS.__world.blocks.filter(b=>!b.dead).map(b=>{
  const t=b.body.translation(), q=b.body.rotation();
  return { id:b.id, x:t.x, y:t.y, a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) };
});`;

/** Steps the sim forward tick by tick, running the fixed-cohort ledger, until 240 steps
 *  after the first true ammo contact. Returns the energy audit AND a pose snapshot taken at
 *  exactly contact + 96 ticks (800 ms), so both metrics come from one run. */
const RUN = `
  const w = SS.__world, G = ${G};
  const S = window.__S;
  const KEYS = ['joints','tips','hinges','loads','hops','racks'];
  const st = () => { const s = S.stats; return KEYS.map(k=>s[k]).concat([+s.spentJ.toFixed(5)]); };
  const snap = () => {
    const m = new Map();
    for (const b of w.blocks) { const t=b.body.translation(), v=b.body.linvel();
      m.set(b,[b.body.mass(),v.x,v.y,t.y]); }
    for (const d of w.debris) { if(!d.body) continue; const t=d.body.translation(), v=d.body.linvel();
      m.set(d,[d.body.mass(),v.x,v.y,t.y]); }
    const p = w.projectiles && w.projectiles[0];
    if (p && p.body) { const t=p.body.translation(), v=p.body.linvel(); m.set(p,[p.body.mass(),v.x,v.y,t.y]); }
    return m;
  };
  const pose = () => w.blocks.filter(b=>!b.dead).map(b=>{
    const t=b.body.translation(), q=b.body.rotation();
    return { id:b.id, x:t.x, y:t.y, a:Math.atan2(2*(q.w*q.z), 1-2*(q.z*q.z)) }; });

  let prev = snap(), prevS = st(), hitAt = -1;
  let posStruct = 0, posSolver = 0, maxStruct = 0, maxSolver = 0;
  let at800 = null;
  for (let n = 0; n < 620; n++) {
    SS.stepOnce();
    if (hitAt < 0 && window.__hit) hitAt = n;
    const cur = snap(), curS = st();
    if (hitAt >= 0 && n - hitAt <= 240) {
      let dKE = 0, dPE = 0;
      for (const [k,a] of cur) { const b = prev.get(k); if (!b) continue;
        dKE += 0.5*a[0]*(a[1]*a[1]+a[2]*a[2]) - 0.5*b[0]*(b[1]*b[1]+b[2]*b[2]);
        dPE += b[0]*G*(b[3]-a[3]); }
      const extra = dKE - dPE;
      let wrote = false;
      for (let i=0;i<curS.length;i++) if (Math.abs(curS[i]-prevS[i])>1e-9) wrote = true;
      if (extra > 0) { if (wrote) { posStruct += extra; if (extra>maxStruct) maxStruct=extra; }
                       else { posSolver += extra; if (extra>maxSolver) maxSolver=extra; } }
    }
    if (hitAt >= 0 && n - hitAt === 96 && !at800) at800 = pose();
    prev = cur; prevS = curS;
    if (hitAt >= 0 && n - hitAt >= 240 && at800) break;
  }
  return { posStruct:+posStruct.toFixed(2), posSolver:+posSolver.toFixed(2),
           maxStruct:+maxStruct.toFixed(2), maxSolver:+maxSolver.toFixed(2),
           at800, hitAt, standing: w.blocks.filter(b=>!b.dead).length,
           debris: w.debris.filter(d=>!d.dead).length,
           stats: JSON.parse(JSON.stringify(S.stats)) };
`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

export default async ({ game, OUT }) => {
  const out = [];
  for (const [name, knobs] of ARMS) {
    const created = [], worst = [], moved = [], framed = [], standing = [], broke = [], spent = [];
    for (const [ang, pow] of SHOTS) {
      await game(`SS.freeze();`);
      await game(`await SS.loadLevel('l1');`);
      await game(`await SS.seed(4242);`);
      await game(`
        let MOD = null;
        for (const u of ['/scam-slingshot/src/level/structure.js', new URL('src/level/structure.js', location.href).href]) {
          try { MOD = await import(u); if (MOD && MOD.structure) break; } catch (e) { MOD = null; }
        }
        if (!MOD || !MOD.structure) throw new Error('could not reach structure module');
        window.__S = MOD.structure;
        Object.assign(window.__S, args[0]);
        const w = SS.__world;
        window.__hit = null;
        for (const b of w.blocks) {
          const orig = b.onImpact.bind(b);
          b.onImpact = (imp, other, point, approach) => {
            if (!window.__hit && other && other.tag === 'ammo' && approach >= 1.2) window.__hit = 1;
            return orig(imp, other, point, approach);
          };
        }
      `, knobs);
      const base = await game(SNAP);
      const byId = new Map(base.map(b => [b.id, b]));
      const N0 = base.length;
      await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
      const r = await game(RUN);

      let mv = 0, fr = 0;
      for (const b of (r.at800 ?? [])) {
        const b0 = byId.get(b.id); if (!b0) continue;
        if (Math.abs(b.a - b0.a) >= 0.15 || Math.hypot(b.x - b0.x, b.y - b0.y) >= 0.3) mv++;
      }
      for (const [fx, fy] of FRAME) {
        const cur = (r.at800 ?? []).find(b => {
          const b0 = byId.get(b.id); return b0 && Math.hypot(b0.x - fx, b0.y - fy) < 0.25; });
        if (!cur) { fr++; continue; }
        const b0 = byId.get(cur.id);
        if (Math.abs(cur.a - b0.a) >= 0.15 || Math.hypot(cur.x - b0.x, cur.y - b0.y) >= 0.3) fr++;
      }
      created.push(+(r.posStruct + r.posSolver).toFixed(2));
      worst.push(r.maxStruct); moved.push(mv); framed.push(fr);
      standing.push(r.standing); broke.push(N0 - r.standing); spent.push(+r.stats.spentJ.toFixed(1));
      out.push({ arm: name, ang, pow, mv, fr, ...r, at800: undefined });
      console.log(`  ${name.padEnd(8)} ${ang}@${pow}  created ${(r.posStruct + r.posSolver).toFixed(2)} J ` +
        `(S ${r.posStruct} / solver ${r.posSolver})  worstStep ${r.maxStruct}  ` +
        `MOVED ${mv}  FRAME ${fr}/6  broke ${N0 - r.standing}  spent ${r.stats.spentJ.toFixed(1)} J  starved ${r.stats.starved}`);
    }
    console.log(`== ${name.toUpperCase()} == created med ${median(created)} max ${Math.max(...created)} | ` +
      `worstStep med ${median(worst)} max ${Math.max(...worst)} | MOVED med ${median(moved)} ${JSON.stringify(moved)} | ` +
      `FRAME med ${median(framed)} ${JSON.stringify(framed)} | BROKE med ${median(broke)} ${JSON.stringify(broke)} | ` +
      `spent med ${median(spent)}\n`);
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r3b-ab.json`, JSON.stringify(out, null, 2));
};
