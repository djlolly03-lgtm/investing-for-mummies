/**
 * crit-PW-r2d.mjs — PW r2, part 4.
 *  D1  LOFT AUDIT. For the flagship l1 shot, track every block's rise above its authored y and
 *      its airborne time, and price that rise in JOULES against the energy the dart actually
 *      delivered. A collapse that throws a 1.96 kg stone higher than the tower on a 0.62 kg
 *      dart is a weight failure no matter how good the tumble looks.
 *  D2  ENERGY LEDGER over the whole collapse: block KE + PE each step, against the ammo's,
 *      so any step where the world gains energy from nowhere is named with its size.
 *  D3  TIGHT COR on the fall ladder — restitution read 1 and 2 solver steps after contact,
 *      before a tilting cube's corner-pivot lifts its centre of mass and fakes a bounce.
 */
const FIXED = 1 / 120, G = 9.81 * 2.4;

export default async ({ game, OUT }) => {
  const R = {};

  // ---------------- D1 + D2 ------------------------------------------------
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('l1');`);
  await game(`await SS.seed(4242);`);
  await game(`
    const w = SS.__world;
    w.blocks.forEach((b, i) => { b.__cid = i; b.__y0 = b.body.translation().y; b.__m = b.body.mass(); });
    window.__hit = null;
    for (const b of w.blocks) {
      const orig = b.onImpact.bind(b);
      b.onImpact = (imp, other, point, approach) => {
        if (!window.__hit && other && other.tag === 'ammo') window.__hit = { cid: b.__cid, mat: b.matName };
        return orig(imp, other, point, approach);
      };
    }
  `);
  await game(`return SS.aimAndFire(0.30, 0.90);`);
  R.loft = await game(`
    const w = SS.__world, G = ${G};
    const peak = new Map(), air = new Map(), vup = new Map();
    const ledger = []; let hitAt = -1;
    const E = () => {
      let ke = 0, pe = 0;
      for (const b of w.blocks) {
        const v = b.body.linvel(), t = b.body.translation();
        ke += 0.5 * b.__m * (v.x * v.x + v.y * v.y);
        pe += b.__m * G * t.y;
      }
      let ake = 0, ape = 0;
      const p = w.projectiles && w.projectiles[0];
      if (p && p.body) {
        const v = p.body.linvel(), t = p.body.translation();
        ake = 0.5 * p.body.mass() * (v.x * v.x + v.y * v.y);
        ape = p.body.mass() * G * t.y;
      }
      return [ke, pe, ake, ape];
    };
    for (let n = 0; n < 480; n++) {
      SS.stepOnce();
      if (hitAt < 0 && window.__hit) hitAt = n;
      if (hitAt >= 0) {
        const k = n - hitAt;
        if (k <= 180) ledger.push([k, ...E().map(x => +x.toFixed(3))]);
        for (const b of w.blocks) {
          const t = b.body.translation(), v = b.body.linvel();
          const rise = t.y - b.__y0;
          if (!peak.has(b.__cid) || rise > peak.get(b.__cid)) peak.set(b.__cid, rise);
          if (!vup.has(b.__cid) || v.y > vup.get(b.__cid)) vup.set(b.__cid, v.y);
          if (v.y > 0.3 || Math.abs(v.y) > 0.3) air.set(b.__cid, (air.get(b.__cid) || 0) + 1);
        }
      }
    }
    return {
      blocks: w.blocks.map(b => ({ cid: b.__cid, mat: b.matName, m: +b.__m.toFixed(3), y0: +b.__y0.toFixed(2),
                                   peakRise: +(peak.get(b.__cid) ?? 0).toFixed(3),
                                   vUp: +(vup.get(b.__cid) ?? 0).toFixed(3),
                                   movingMs: Math.round((air.get(b.__cid) ?? 0) * 1000 / 120),
                                   yNow: +b.body.translation().y.toFixed(2) })),
      ledger, hit: window.__hit,
    };
  `);

  // ---------------- D3 tight COR -------------------------------------------
  const DROP = [[1.25,0.05],[1.25,0.05],[1.25,0.05],[2.05,0.05],[2.05,0.05],[2.05,0.05],
                [3.05,0.05],[3.05,0.05],[3.05,0.05],[4.45,0.05],[4.45,0.05],[4.45,0.05],
                [2.05,0.60],[2.05,0.60],[2.05,0.60]];
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('_crit-pw-r2');`);
  await game(`await SS.seed(4242);`);
  await game(`
    const w = SS.__world, D = args[0];
    w.blocks.forEach((b, i) => {
      b.__cid = i; const [y, rot] = D[i];
      const t = b.body.translation();
      b.body.setTranslation({ x: t.x, y, z: 0 }, true);
      b.body.setRotation({ x: 0, y: 0, z: Math.sin(rot/2), w: Math.cos(rot/2) }, true);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.damage = 0; b.scarFloor = 0; b.crackStep = -1;
      b.__mat = b.matName; b.__m = b.body.mass(); b.__drop = y;
    });
  `, DROP);
  R.cor = await game(`
    const w = SS.__world;
    const hist = new Map();
    for (const b of w.blocks) hist.set(b.__cid, { mat: b.__mat, m: +b.__m.toFixed(3), drop: b.__drop, v: [], x: [] });
    for (let n = 0; n < 400; n++) {
      SS.stepOnce();
      if (w.hitStop > 0) continue;                    // hit-stop advances tick, not the solver
      for (const b of w.blocks) {
        const h = hist.get(b.__cid); if (!h) continue;
        h.v.push(+b.body.linvel().y.toFixed(4));
        h.x.push(+b.body.translation().x.toFixed(4));
      }
    }
    const out = [];
    for (const [cid, h] of hist) {
      let ci = -1;
      for (let i = 2; i < h.v.length; i++) {
        const dv = (h.v[i] - h.v[i-1]) * 120;
        if (dv > -${G} * 0.5 && h.v[i-1] < -0.5) { ci = i; break; }
      }
      if (ci < 0) { out.push({ cid, ...h, v: undefined, x: undefined, shattered: true }); continue; }
      const vIn = Math.abs(h.v[ci-1]);
      out.push({ cid, mat: h.mat, m: h.m, drop: h.drop, vIn: +vIn.toFixed(3),
                 COR1: +(Math.max(0, h.v[ci]) / vIn).toFixed(4),
                 COR2: +(Math.max(0, h.v[ci], h.v[ci+1] ?? -9) / vIn).toFixed(4),
                 COR3: +(Math.max(0, ...h.v.slice(ci, ci+3)) / vIn).toFixed(4),
                 COR80: +(Math.max(0, ...h.v.slice(ci, ci+10)) / vIn).toFixed(4),
                 shattered: false });
    }
    return out;
  `);

  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2d.json`, JSON.stringify(R, null, 2));
  console.log('OK -> pw-r2d.json');
};
