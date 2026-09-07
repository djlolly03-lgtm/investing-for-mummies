/**
 * crit-PW-r3-attrib.mjs — PW r3. Does any REMAINING positive energy jump belong to structure.js?
 *
 * Same fixed-cohort ledger as crit-PW-r2g (bodies by identity, gravity's own PE release
 * subtracted), but this one also samples `structure.stats` on EVERY step, so each positive
 * jump can be labelled:
 *   · structureWrote   — spentJ / joints / tips / hops / racks / hinges moved on this step
 *   · solverOnly       — nothing in structure.js touched a body; this is Rapier's own
 *                        penetration recovery / contact restitution, i.e. the floor.
 *
 * It also runs each shot a SECOND time with `structure.enabled = false`, which gives the
 * solver-only floor for the exact same shot rather than for an idle level. That is the number
 * a remaining jump has to be compared against — "0.54 J over 240 idle steps" was measured with
 * nothing moving and is far too generous a floor for a live collapse.
 */
const G = 9.81 * 2.4;

const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.24, 0.92], [0.34, 0.92]];

const RUN = (structOn) => `
  const w = SS.__world, G = ${G};
  let MOD = null;
  for (const u of ['/scam-slingshot/src/level/structure.js', new URL('src/level/structure.js', location.href).href]) {
    try { MOD = await import(u); if (MOD && MOD.structure) break; } catch (e) { MOD = null; }
  }
  if (!MOD || !MOD.structure) throw new Error('could not reach structure module');
  const S = MOD.structure;
  S.enabled = ${structOn};
  const st = () => { const s = S.stats; return [s.joints,s.tips,s.hinges,s.loads,s.hops,s.racks,
                                                +s.spentJ.toFixed(4),+s.creditJ.toFixed(4),s.starved]; };
  const KEYS = ['joints','tips','hinges','loads','hops','racks','spentJ','creditJ','starved'];
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
  let prev = snap(), prevS = st(), hitAt = -1;
  const rows = [];
  let posStruct = 0, posSolver = 0, neg = 0, nSteps = 0, maxStruct = 0, maxSolver = 0;
  for (let n = 0; n < 480; n++) {
    SS.stepOnce();
    if (hitAt < 0 && window.__hit) hitAt = n;
    const cur = snap(), curS = st();
    if (hitAt >= 0 && n - hitAt <= 240) {
      let dKE = 0, dPE = 0, cohort = 0;
      for (const [k,a] of cur) { const b = prev.get(k); if (!b) continue; cohort++;
        dKE += 0.5*a[0]*(a[1]*a[1]+a[2]*a[2]) - 0.5*b[0]*(b[1]*b[1]+b[2]*b[2]);
        dPE += b[0]*G*(b[3]-a[3]); }
      const extra = dKE - dPE;
      const ds = {}; let wrote = false;
      for (let i=0;i<KEYS.length;i++){ const d = curS[i]-prevS[i]; if (Math.abs(d)>1e-9){ ds[KEYS[i]]=+d.toFixed(4); if(KEYS[i]!=='creditJ'&&KEYS[i]!=='starved') wrote = true; } }
      nSteps++;
      if (extra > 0) { if (wrote) { posStruct += extra; if (extra>maxStruct) maxStruct=extra; }
                       else { posSolver += extra; if (extra>maxSolver) maxSolver=extra; } }
      else neg += extra;
      if (extra > 0.4 || Object.keys(ds).length) rows.push([n-hitAt, +extra.toFixed(3), cohort, wrote?'STRUCT':'solver', ds]);
    }
    prev = cur; prevS = curS;
  }
  return { rows, posStruct:+posStruct.toFixed(2), posSolver:+posSolver.toFixed(2),
           neg:+neg.toFixed(1), nSteps, maxStruct:+maxStruct.toFixed(2), maxSolver:+maxSolver.toFixed(2),
           standing: w.blocks.length, debris: w.debris.length,
           stats: JSON.parse(JSON.stringify(S.stats)) };
`;

export default async ({ game, OUT }) => {
  const out = [];
  for (const [ang, pow] of SHOTS) {
    for (const structOn of [true, false]) {
      await game(`SS.freeze();`);
      await game(`await SS.loadLevel('l1');`);
      await game(`await SS.seed(4242);`);
      await game(`
        const w = SS.__world;
        window.__hit = null;
        for (const b of w.blocks) {
          const orig = b.onImpact.bind(b);
          b.onImpact = (imp, other, point, approach) => {
            if (!window.__hit && other && other.tag === 'ammo') window.__hit = { mat: b.matName };
            return orig(imp, other, point, approach);
          };
        }
      `);
      const rel = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
      const r = await game(RUN(structOn));
      out.push({ ang, pow, structOn, dartKE: +(0.5 * 0.6166 * rel.speed * rel.speed).toFixed(1), ...r });
      const tag = `${ang}@${pow} ${structOn ? 'STRUCT-ON ' : 'struct-off'}`;
      console.log(`${tag} | created ${(r.posStruct + r.posSolver).toFixed(2)} J ` +
        `(struct-step ${r.posStruct} / solver-only ${r.posSolver}) | worst step STRUCT ${r.maxStruct} solver ${r.maxSolver} ` +
        `| dissipated ${r.neg} | dartKE ${(0.5 * 0.6166 * rel.speed * rel.speed).toFixed(1)} ` +
        `| standing ${r.standing} debris ${r.debris} | creditJ ${r.stats.creditJ.toFixed(2)} spentJ ${r.stats.spentJ.toFixed(2)} starved ${r.stats.starved}`);
      if (structOn) {
        const big = r.rows.filter(x => x[1] > 0.8).slice(0, 8);
        for (const b of big) console.log(`      k=${b[0]} +${b[1]} J ${b[3]} ${JSON.stringify(b[4])}`);
      }
    }
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r3-attrib.json`, JSON.stringify(out, null, 2));
};
