/**
 * crit-PW-r2.mjs — INDEPENDENT CRITIC CAPTURE, piece PW (weight & gravity), round 2.
 *
 * Written by the critic, not the builder. Measures four things, all in numbers:
 *   A  FALL LADDER  — identical 0.90 m cube, three materials, four fall heights, on the
 *      critic's own fixture levels/_crit-pw-r2.json. Per material: fall time vs analytic,
 *      impact speed vs analytic, COEFFICIENT OF RESTITUTION measured as the VELOCITY REVERSAL
 *      (max +vy within 80 ms of first contact / |vy| the step before it — NOT peak height,
 *      which a tipping cube fakes, see ORCHESTRATOR-NOTES PW r1 §2), slide from FIRST CONTACT,
 *      spin decay, time to sleep, and whether it survived the landing.
 *   A2 TILT ROW     — same cube at rot 0.60 for slide/spin separation.
 *   B  ARC WEIGHT   — the l1 projectile: muzzle cut, apex, hang time, sag from the chord,
 *      and the vertical-velocity signature of a real parabola.
 *   C  MOMENTUM     — l1 stack: first-motion TIME per block against DISTANCE from the ammo's
 *      real first contact (patched Block.onImpact, per ORCHESTRATOR-NOTES P3 r5 §2), i.e.
 *      does the blow propagate as a wave, all at once, or not at all.
 *
 * Traps honoured: SS.freeze() BEFORE loadLevel (PW r1 §3); filmstrip `from` is a RELATIVE
 * seek so every strip reloads first; hit-stop ticks advance `tick` without solving so the
 * sampler records `held` and integrates real solver time itself.
 */

const FIXED = 1 / 120;
const G = 9.81 * 2.4;                       // GRAVITY_SCALE 2.4, physics.js

// ---------------------------------------------------------------------------
// in-page sampler: N solver steps, every step, all blocks + projectile
// ---------------------------------------------------------------------------
const SAMPLER = `
  const w = SS.__world;
  const N = args[0];
  const rows = [];
  for (let i = 0; i < N; i++) {
    SS.stepOnce();
    const held = w.hitStop > 0;
    const bs = [];
    for (const b of w.blocks) {
      if (!b.body) continue;
      const t = b.body.translation(), v = b.body.linvel(), a = b.body.angvel();
      bs.push([b.__cid, +t.x.toFixed(6), +t.y.toFixed(6), +v.x.toFixed(6), +v.y.toFixed(6),
               +a.z.toFixed(6), b.body.isSleeping() ? 1 : 0]);
    }
    const p = w.projectiles && w.projectiles[0];
    const pr = p && p.body
      ? [+p.body.translation().x.toFixed(6), +p.body.translation().y.toFixed(6),
         +p.body.linvel().x.toFixed(6), +p.body.linvel().y.toFixed(6)]
      : null;
    rows.push([i, held ? 1 : 0, bs, pr, w.debris.length]);
  }
  return rows;
`;


/**
 * The fixture rests on the ground so loadLevel()'s settle is a no-op and nothing carries damage.
 * LIFT teleports each cube to its drop height and tilt with zero velocity, resets its damage
 * bookkeeping, and returns the exact initial condition it created. Free-fall is then measured
 * from a state this scenario owns completely — `loadLevel` settles for up to 420 steps until
 * phase==='aiming', so a cube authored in mid-air has already landed before a critic sees it.
 */
const DROP = [
  [1.25, 0.05], [1.25, 0.05], [1.25, 0.05],
  [2.05, 0.05], [2.05, 0.05], [2.05, 0.05],
  [3.05, 0.05], [3.05, 0.05], [3.05, 0.05],
  [4.45, 0.05], [4.45, 0.05], [4.45, 0.05],
  [2.05, 0.60], [2.05, 0.60], [2.05, 0.60],
];
const LIFT = `
  const w = SS.__world, D = args[0];
  const out = [];
  w.blocks.forEach((b, i) => {
    b.__cid = i;
    const [y, rot] = D[i] || [1.25, 0.05];
    const t = b.body.translation();
    b.body.setTranslation({ x: t.x, y, z: 0 }, true);
    b.body.setRotation({ x: 0, y: 0, z: Math.sin(rot / 2), w: Math.cos(rot / 2) }, true);
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    b.damage = 0; b.scarFloor = 0; b.crackStep = -1;
    out.push({ cid: i, mat: b.matName, mass: +b.body.mass().toFixed(4),
               dropY: y, rot, x0: +t.x.toFixed(4),
               breakDv: +(b.breakDv ?? -1).toFixed(4),
               thr: +(b.material.physics.breakImpulse ?? -1).toFixed(4) });
  });
  return out;
`;

const TAGCID = `
  const w = SS.__world;
  const out = [];
  w.blocks.forEach((b, i) => {
    b.__cid = i;
    out.push({ cid: i, mat: b.matName, mass: +b.body.mass().toFixed(4),
               x0: +b.body.translation().x.toFixed(4), y0: +b.body.translation().y.toFixed(4),
               breakDv: +(b.breakDv ?? -1).toFixed(4),
               thr: +(b.material.physics.breakImpulse ?? -1).toFixed(4) });
  });
  return out;
`;

export default async ({ shot, filmstrip, game, state, OUT, page }) => {
  const R = { A: null, A2: null, B: null, C: null, notes: [] };

  // =========================================================================
  // PART A — FALL LADDER
  // =========================================================================
  await game(`SS.freeze();`);                       // BEFORE the load. PW r1 §3.
  await game(`await SS.loadLevel('_crit-pw-r2');`);
  await game(`await SS.seed(4242);`);
  const meta = await game(LIFT, DROP);

  // 3.6 s of solver time, sampled every step
  const rows = await game(SAMPLER, 432);

  // ---- reduce -------------------------------------------------------------
  const perBlock = new Map();
  for (const m of meta) perBlock.set(m.cid, { ...m, s: [] });
  let solved = 0, heldSteps = 0;
  for (const [i, held, bs] of rows) {
    // HIT-STOP: `stepOnce()` advances the tick clock WITHOUT stepping the solver, so two
    // consecutive samples across a hit-stop have identical velocities. Left in, that reads
    // as dv/dt = 0, which is exactly the signature of a landing — and the first cube to land
    // then fakes a "contact" for every other cube in the level in the same frame. Drop them.
    if (held) { heldSteps++; continue; }
    solved++;
    const t = solved * FIXED;
    for (const [cid, x, y, vx, vy, wz, sl] of bs) {
      perBlock.get(cid)?.s.push({ t, x, y, vx, vy, wz, sl });
    }
  }

  const analyse = (b) => {
    const s = b.s;
    if (!s.length) return { mat: b.mat, cid: b.cid, mass: b.mass, dropY: b.dropY, rot: b.rot, destroyed: true, survived: false };
    // FIRST CONTACT = first step where vy stops being (approximately) free fall.
    // Free fall gives dvy/dt = -G; a contact makes it much less negative.
    let ci = -1;
    for (let i = 2; i < s.length; i++) {
      const dv = (s[i].vy - s[i - 1].vy) / FIXED;
      if (dv > -G * 0.5 && s[i - 1].vy < -0.5) { ci = i; break; }
    }
    if (ci < 0) return { mat: b.mat, cid: b.cid, mass: b.mass, dropY: b.dropY, rot: b.rot, noContact: true };
    const vIn = Math.abs(s[ci - 1].vy);
    const tFall = s[ci - 1].t;
    // COR by velocity reversal within 80 ms of first contact
    const win = s.slice(ci, ci + Math.round(0.080 / FIXED));
    const vOut = Math.max(0, ...win.map(r => r.vy));
    // bounces: count separations (vy crossing up through +0.35 m/s)
    let bounces = 0, was = false;
    for (const r of s.slice(ci)) { const up = r.vy > 0.35; if (up && !was) bounces++; was = up; }
    // slide from FIRST CONTACT (PW r1 §2)
    const xC = s[ci].x;
    const last = s[s.length - 1];
    const slide = Math.abs(last.x - xC);
    // spin: |wz| at contact, and ms until |wz| < 0.20 rad/s and stays there
    const wPk = Math.max(...s.slice(ci, ci + 24).map(r => Math.abs(r.wz)));
    let spinMs = null;
    for (let i = ci; i < s.length; i++) {
      if (Math.abs(s[i].wz) < 0.20) {
        const rest = s.slice(i, i + 30);
        if (rest.every(r => Math.abs(r.wz) < 0.20)) { spinMs = Math.round((s[i].t - s[ci].t) * 1000); break; }
      }
    }
    // sleep
    const si = s.findIndex((r, i) => i >= ci && r.sl === 1);
    const sleepMs = si < 0 ? null : Math.round((s[si].t - s[ci].t) * 1000);
    // settle: |v| < 0.1 and stays
    let settleMs = null;
    for (let i = ci; i < s.length; i++) {
      const q = s.slice(i, i + 40);
      if (q.length > 20 && q.every(r => Math.hypot(r.vx, r.vy) < 0.10 && Math.abs(r.wz) < 0.10)) {
        settleMs = Math.round((s[i].t - s[ci].t) * 1000); break;
      }
    }
    return {
      mat: b.mat, cid: b.cid, mass: b.mass, dropY: b.dropY, rot: b.rot, breakDv: b.breakDv,
      fallDist: +(b.dropY - 0.45).toFixed(3),
      tFall_ms: Math.round(tFall * 1000),
      tFall_analytic_ms: Math.round(Math.sqrt(2 * (b.dropY - 0.45) / G) * 1000),
      vIn: +vIn.toFixed(3),
      vIn_analytic: +Math.sqrt(2 * G * (b.dropY - 0.45)).toFixed(3),
      COR: +(vOut / vIn).toFixed(4),
      bounces, slide: +slide.toFixed(4),
      spinPeak: +wPk.toFixed(3), spinMs, settleMs, sleepMs,
      restY: +last.y.toFixed(4), survived: true,
    };
  };

  const A = [];
  for (const b of perBlock.values()) A.push(analyse(b));
  // blocks that were destroyed by the landing never appear in world.blocks after the fracture
  const aliveCids = new Set(rows[rows.length - 1][2].map(r => r[0]));
  for (const a of A) a.survived = aliveCids.has(a.cid);
  R.A = A;
  R.notes.push(`hit-stop steps skipped in the fall ladder: ${heldSteps}`);

  // ---- pictures: one camLocked triptych per fall height --------------------
  const strips = [
    { name: 'fall-h080', x: 6.6, hw: 5.2 },
    { name: 'fall-h160', x: 15.6, hw: 5.2 },
    { name: 'fall-h260', x: 24.6, hw: 5.2 },
    { name: 'fall-h400', x: 33.6, hw: 5.6 },
    { name: 'tilt-h160', x: 42.6, hw: 5.2 },
  ];
  for (const s of strips) {
    await game(`SS.freeze();`);
    await game(`await SS.loadLevel('_crit-pw-r2');`);
    await game(`await SS.seed(4242);`);
    await game(LIFT, DROP);
    await game(`SS.camLock({ x: args[0], y: 2.6, halfWidth: args[1] });`, s.x, s.hw);
    await filmstrip(s.name, { from: 0, to: 1200, step: 80, cols: 4 });
  }

  // =========================================================================
  // PART B — ARC WEIGHT on l1
  // =========================================================================
  await game(`SS.camUnlock();`);
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('l1');`);
  await game(`await SS.seed(4242);`);

  const shots = [[0.30, 0.60], [0.30, 0.90], [0.55, 1.00], [0.75, 1.00]];
  const arcs = [];
  for (const [ang, pow] of shots) {
    await game(`await SS.seed(4242);`);
    const rel = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const tr = await game(`
      const w = SS.__world; const pts = [];
      for (let i = 0; i < 480; i++) {
        SS.stepOnce();
        const p = w.projectiles && w.projectiles[0];
        if (!p || !p.body) break;
        const t = p.body.translation(), v = p.body.linvel();
        pts.push([+t.x.toFixed(5), +t.y.toFixed(5), +v.x.toFixed(5), +v.y.toFixed(5)]);
        if (t.y < 0.2 && i > 8) break;
      }
      return pts;
    `);
    const ys = tr.map(p => p[1]);
    const apex = Math.max(...ys);
    const ai = ys.indexOf(apex);
    const x0 = tr[0][0], y0 = tr[0][1];
    const xe = tr[tr.length - 1][0], ye = tr[tr.length - 1][1];
    // sag: max perpendicular-ish deviation of the path above the straight chord
    let sag = 0;
    for (const [x, y] of tr) {
      const f = (x - x0) / Math.max(1e-6, xe - x0);
      sag = Math.max(sag, y - (y0 + f * (ye - y0)));
    }
    // effective g from the vy curve over the free-flight portion
    const n = Math.min(tr.length - 2, 60);
    const gEff = n > 6 ? -(tr[n][3] - tr[2][3]) / ((n - 2) * FIXED) : null;
    arcs.push({
      angle: ang, power: pow,
      rel,
      x0: +x0.toFixed(2), y0: +y0.toFixed(2), xEnd: +xe.toFixed(2),
      apexY: +apex.toFixed(2), apexAtMs: Math.round(ai * FIXED * 1000),
      hangMs: Math.round(tr.length * FIXED * 1000),
      range: +(xe - x0).toFixed(2),
      sag: +sag.toFixed(3), sagPctRange: +(100 * sag / Math.max(1e-6, xe - x0)).toFixed(1),
      gEff: gEff === null ? null : +gEff.toFixed(2),
      apexOverLaunch: +(apex - y0).toFixed(2),
    });
  }
  R.B = arcs;

  await game(`await SS.seed(4242);`);
  await game(`SS.aimAndFire(0.30, 0.90);`);
  await filmstrip('arc-l1-030x090', { from: 0, to: 900, step: 60, cols: 4 });

  // =========================================================================
  // PART C — MOMENTUM TRANSFER THROUGH THE l1 STACK
  // =========================================================================
  const chain = [];
  for (const [ang, pow] of [[0.30, 0.90], [0.26, 0.95], [0.34, 0.92]]) {
    await game(`SS.freeze();`);
    await game(`await SS.seed(4242);`);
    await game(TAGCID);
    // patch Block.onImpact so first AMMO contact is the real clock (P3 r5 §2)
    await game(`
      const w = SS.__world;
      window.__hit = null;
      for (const b of w.blocks) {
        const orig = b.onImpact.bind(b);
        b.onImpact = (imp, other, point, approach) => {
          if (!window.__hit && other && other.tag === 'ammo') {
            const t = b.body.translation();
            window.__hit = { tick: SS.tick(), cid: b.__cid, mat: b.matName,
                             x: +t.x.toFixed(3), y: +t.y.toFixed(3), impulse: +imp.toFixed(3) };
          }
          return orig(imp, other, point, approach);
        };
      }
    `);
    await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const c = await game(`
      const w = SS.__world;
      const first = new Map(); const t0 = {};
      let hitTick = null, n = 0;
      for (let i = 0; i < 480; i++) {                 // 4 s
        SS.stepOnce(); n++;
        if (!hitTick && window.__hit) hitTick = n;
        if (hitTick) {
          for (const b of w.blocks) {
            if (first.has(b.__cid)) continue;
            const v = b.body.linvel();
            if (Math.hypot(v.x, v.y) > 0.5) first.set(b.__cid, n - hitTick);
          }
        }
      }
      const moved = [...first.entries()].map(([cid, dn]) => ({ cid, ms: Math.round(dn * 1000 / 120) }));
      return { hit: window.__hit, moved, standing: w.blocks.length, debris: w.debris.length,
               score: (await SS.state()).score };
    `);
    chain.push({ angle: ang, power: pow, ...c });
  }
  R.C = chain;

  // collapse filmstrip at the game's own framing
  await game(`SS.freeze();`);
  await game(`await SS.seed(4242);`);
  await game(`SS.aimAndFire(0.30, 0.90);`);
  await game(`await SS.seek(560);`);
  await filmstrip('collapse-l1-gameframing', { from: 0, to: 1200, step: 80, cols: 4 });

  await game(`SS.freeze();`);
  await game(`await SS.seed(4242);`);
  await game(`SS.aimAndFire(0.30, 0.90);`);
  await game(`await SS.seek(3600);`);
  await shot('settled-l1');

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2.json`, JSON.stringify(R, null, 2));
  console.log('MEASUREMENTS -> pw-r2.json');
};
