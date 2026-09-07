/**
 * crit-PW-r2c.mjs — PW r2, part 3. MOMENTUM TRANSFER, with a proper baseline.
 *
 * The question a weight critic has to answer about a collapse: when the dart lands, does the
 * structure ACQUIRE momentum from the blow (physical), or is momentum CREATED and handed to a
 * group of blocks in the same solver step (a scripted lean wearing a physics costume)?
 *
 * Method: patch Block.onImpact to catch the ammo's REAL first contact (ORCHESTRATOR-NOTES
 * P3 r5 §2 — the "a block moved" detector trips up to 900 ms early on l1), then record every
 * block's mass and velocity for 4 steps BEFORE that contact and 20 steps after it, plus the
 * ammo's. Compare Σm|v| gained by the structure with the momentum the ammo lost.
 */
export default async ({ game, OUT }) => {
  const out = [];
  for (const [ang, pow] of [[0.30, 0.90], [0.34, 0.92], [0.26, 0.95]]) {
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
                             impulse: +imp.toFixed(3), approach: +(approach ?? 0).toFixed(3),
                             mass: +b.body.mass().toFixed(4) };
          }
          return orig(imp, other, point, approach);
        };
      }
    `);
    const rel = await game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
    const r = await game(`
      const w = SS.__world;
      const snap = () => {
        const p = w.projectiles && w.projectiles[0];
        return {
          ammo: p && p.body ? [+p.body.mass().toFixed(4), +p.body.linvel().x.toFixed(4),
                               +p.body.linvel().y.toFixed(4), +p.body.translation().x.toFixed(3),
                               +p.body.translation().y.toFixed(3)] : null,
          blocks: w.blocks.map(b => [b.__cid, b.matName, +b.body.mass().toFixed(4),
                                     +b.body.linvel().x.toFixed(4), +b.body.linvel().y.toFixed(4),
                                     +b.body.translation().x.toFixed(3), +b.body.translation().y.toFixed(3)]),
          debris: w.debris.length,
        };
      };
      const pre = [], post = [];
      let hitAt = -1;
      const first = new Map();
      for (let n = 0; n < 600; n++) {
        if (hitAt < 0) { pre.push(snap()); if (pre.length > 4) pre.shift(); }
        SS.stepOnce();
        if (hitAt < 0 && window.__hit) hitAt = n;
        if (hitAt >= 0) {
          if (n - hitAt <= 20) post.push({ k: n - hitAt, ...snap() });
          for (const b of w.blocks) {
            if (first.has(b.__cid)) continue;
            const v = b.body.linvel();
            if (Math.hypot(v.x, v.y) > 0.5) first.set(b.__cid, n - hitAt);
          }
        }
      }
      return { hit: window.__hit, hitAt, pre, post,
               moved: [...first.entries()].map(([cid, dn]) => [cid, Math.round(dn * 1000 / 120)]),
               standing: w.blocks.length, debris: w.debris.length, score: (await SS.state()).score };
    `);
    out.push({ angle: ang, power: pow, rel: { speed: rel.speed, muzzleAD: rel.muzzleAD }, ...r });
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2c.json`, JSON.stringify(out, null, 2));
  console.log('OK -> pw-r2c.json');
};
