/**
 * crit-PW-r2b.mjs — PW round 2, part 2. Two things the first pass measured badly.
 *
 *  B  ARC WEIGHT, done properly. The first pass tracked `world.projectiles[0]`, which becomes
 *     the NEXT ammo the moment the shot resolves (that is why a 0.75 rad shot appeared to end
 *     at x = -0.04, back at the sling). Track the launched body by identity, stop when it
 *     stops. Effective gravity is read from the FREE-FLIGHT portion only — the launch kick is
 *     unwound over `kickSteps` solver steps (10 here) and swamps any g measured across it.
 *
 *  C  MOMENTUM TRANSFER, with a baseline. "Seven blocks were moving at impact+0 ms" means
 *     nothing without knowing what they were doing at impact-1 step. Sample every block for
 *     10 steps either side of the ammo's REAL first contact (patched Block.onImpact, per
 *     ORCHESTRATOR-NOTES P3 r5 §2) and compare the momentum the ammo LOST with the momentum
 *     the structure GAINED. A collapse driven by the blow conserves roughly; a collapse
 *     driven by an injected velocity field does not.
 */
const FIXED = 1 / 120;
const G = 9.81 * 2.4;

export default async ({ game, filmstrip, shot, OUT }) => {
  const R = { arcs: [], chain: [], notes: [] };

  // =========================== B — ARC ======================================
  for (const [ang, pow] of [[0.30, 0.60], [0.30, 0.90], [0.42, 0.95], [0.55, 1.00], [0.75, 1.00]]) {
    await game(`SS.freeze();`);
    await game(`await SS.loadLevel('l1');`);
    await game(`await SS.seed(4242);`);
    const rel = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const tr = await game(`
      const w = SS.__world;
      const p = w.projectiles && w.projectiles[0];
      if (!p) return { err: 'no projectile' };
      const pts = [];
      const t0 = p.body.translation();
      pts.push([+t0.x.toFixed(5), +t0.y.toFixed(5), +p.body.linvel().x.toFixed(5), +p.body.linvel().y.toFixed(5)]);
      for (let i = 0; i < 900; i++) {
        SS.stepOnce();
        if (!w.projectiles.includes(p) || !p.body) break;      // identity, not index
        const t = p.body.translation(), v = p.body.linvel();
        pts.push([+t.x.toFixed(5), +t.y.toFixed(5), +v.x.toFixed(5), +v.y.toFixed(5)]);
        if (Math.hypot(v.x, v.y) < 0.6 && i > 20) break;       // it has stopped
      }
      return { pts };
    `, ang, pow);
    if (tr.err) { R.arcs.push({ angle: ang, power: pow, err: tr.err }); continue; }
    const pts = tr.pts;
    const ys = pts.map(p => p[1]);
    const apex = Math.max(...ys), ai = ys.indexOf(apex);
    const x0 = pts[0][0], y0 = pts[0][1];
    // free flight = after the kick has fully unwound, before the first big deceleration
    const k = (rel.kickSteps ?? 10) + 4;
    let fe = pts.length - 1;
    for (let i = k + 2; i < pts.length; i++) {
      const dvx = (pts[i][2] - pts[i - 1][2]) / FIXED;
      if (Math.abs(dvx) > 30) { fe = i - 1; break; }            // struck something
    }
    const nF = fe - k;
    const gFree = nF > 6 ? -(pts[fe][3] - pts[k][3]) / (nF * FIXED) : null;
    const dragX = nF > 6 ? -(pts[fe][2] - pts[k][2]) / (nF * FIXED) : null;
    const xImp = pts[Math.min(fe, pts.length - 1)][0], yImp = pts[Math.min(fe, pts.length - 1)][1];
    let sag = 0;
    for (let i = k; i <= fe; i++) {
      const f = (pts[i][0] - pts[k][0]) / Math.max(1e-6, xImp - pts[k][0]);
      sag = Math.max(sag, pts[i][1] - (pts[k][1] + f * (yImp - pts[k][1])));
    }
    R.arcs.push({
      angle: ang, power: pow,
      pouchX: +rel.aim.pouch.x.toFixed(2), pouchY: +rel.aim.pouch.y.toFixed(2),
      muzzleX: +rel.muzzle.x.toFixed(2), muzzleY: +rel.muzzle.y.toFixed(2),
      muzzleDist: rel.muzzleDist, muzzleAD: rel.muzzleAD, ad: rel.ad,
      speed: rel.speed, exitSpeed: rel.exitSpeed, kickSteps: rel.kickSteps,
      freeFlightMs: Math.round(nF * FIXED * 1000),
      gFree: gFree === null ? null : +gFree.toFixed(2),
      gFree_over_G: gFree === null ? null : +(gFree / G).toFixed(3),
      dragDecelX: dragX === null ? null : +dragX.toFixed(2),
      apexY: +apex.toFixed(2), apexAtMs: Math.round(ai * FIXED * 1000),
      apexOverMuzzle: +(apex - y0).toFixed(2),
      xMuzzle: +x0.toFixed(2), xImpact: +xImp.toFixed(2), yImpact: +yImp.toFixed(2),
      visibleRange: +(xImp - x0).toFixed(2),
      cutFractionOfTotalRange: +(rel.muzzleDist / (rel.muzzleDist + (xImp - x0))).toFixed(3),
      sagOverVisibleRange: +(sag / Math.max(1e-6, xImp - x0)).toFixed(3),
      flightMs: Math.round((pts.length - 1) * FIXED * 1000),
    });
  }

  // =========================== C — MOMENTUM =================================
  for (const [ang, pow] of [[0.30, 0.90], [0.34, 0.92]]) {
    await game(`SS.freeze();`);
    await game(`await SS.loadLevel('l1');`);
    await game(`await SS.seed(4242);`);
    await game(`
      const w = SS.__world;
      w.blocks.forEach((b, i) => { b.__cid = i; });
      window.__hit = null;
      for (const b of w.blocks) {
        const orig = b.onImpact.bind(b);
        b.onImpact = (imp, other, point, approach) => {
          if (!window.__hit && other && other.tag === 'ammo') {
            const t = b.body.translation();
            window.__hit = { cid: b.__cid, mat: b.matName, x: +t.x.toFixed(3), y: +t.y.toFixed(3),
                             impulse: +imp.toFixed(3), approach: +(approach ?? 0).toFixed(3) };
          }
          return orig(imp, other, point, approach);
        };
      }
    `);
    await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const c = await game(`
      const w = SS.__world;
      const snap = () => {
        const p = w.projectiles && w.projectiles[0];
        return {
          ammo: p && p.body ? { m: +p.body.mass().toFixed(4),
                                vx: +p.body.linvel().x.toFixed(4), vy: +p.body.linvel().y.toFixed(4),
                                x: +p.body.translation().x.toFixed(3), y: +p.body.translation().y.toFixed(3) } : null,
          blocks: w.blocks.map(b => ({ cid: b.__cid, mat: b.matName, m: +b.body.mass().toFixed(4),
                                       vx: +b.body.linvel().x.toFixed(4), vy: +b.body.linvel().y.toFixed(4),
                                       x: +b.body.translation().x.toFixed(3), y: +b.body.translation().y.toFixed(3) })),
        };
      };
      const ring = []; let hitAt = -1;
      const first = new Map();
      for (let n = 0; n < 600; n++) {
        ring.push(snap()); if (ring.length > 6) ring.shift();
        SS.stepOnce();
        if (hitAt < 0 && window.__hit) hitAt = n;
        if (hitAt >= 0) {
          for (const b of w.blocks) {
            if (first.has(b.__cid)) continue;
            const v = b.body.linvel();
            if (Math.hypot(v.x, v.y) > 0.5) first.set(b.__cid, n - hitAt);
          }
        }
        if (hitAt >= 0 && n - hitAt <= 10) ring.push({ __post: n - hitAt, ...snap() });
      }
      return { hit: window.__hit, hitAt, ring,
               moved: [...first.entries()].map(([cid, dn]) => [cid, Math.round(dn * 1000 / 120)]),
               standing: w.blocks.length, debris: w.debris.length, score: (await SS.state()).score };
    `);
    R.chain.push({ angle: ang, power: pow, ...c });
  }

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2b.json`, JSON.stringify(R, null, 2));
  console.log('OK -> pw-r2b.json');
};
