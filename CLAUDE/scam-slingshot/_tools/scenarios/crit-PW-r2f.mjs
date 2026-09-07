/**
 * crit-PW-r2f.mjs — PW r2, part 6. COR vs IMPACT SPEED, per material.
 * A single drop height cannot say whether a material's rebound is its own; the fall ladder
 * showed stone reading COR 0.019 at 13.7 m/s and 0.229 at 6.1 m/s, which is either a real
 * speed dependence or a solver artefact. Sweep the low-speed band a player actually sees in a
 * collapse (0.10-2.00 m of fall, 2.2-9.7 m/s) and report COR one solver step after contact
 * together with the penetration depth at that step, so push-out can be told from restitution.
 * Blocks are lifted flat (rot 0.002) so a corner pivot cannot fake a rebound.
 */
const G = 9.81 * 2.4;
export default async ({ game, OUT }) => {
  const rows = [];
  const FALLS = [[0.10, 0.20, 0.30, 0.50, 0.80], [1.10, 1.40, 2.00, 2.80, 3.60]];
  for (const set of FALLS) {
    const D = [];
    for (const f of set) for (let i = 0; i < 3; i++) D.push([0.45 + f, 0.002]);
    // fixture order is wood,glass,stone per row of three -> rebuild D to match block index
    const DD = [];
    for (let r = 0; r < 5; r++) for (let m = 0; m < 3; m++) DD.push([0.45 + set[r], 0.002]);
    await game(`SS.freeze();`);
    await game(`await SS.loadLevel('_crit-pw-r2');`);
    await game(`await SS.seed(4242);`);
    const out = await game(`
      const w = SS.__world, D = args[0];
      w.blocks.forEach((b, i) => {
        b.__cid = i; const [y, rot] = D[i];
        const t = b.body.translation();
        b.body.setTranslation({ x: t.x, y, z: 0 }, true);
        b.body.setRotation({ x: 0, y: 0, z: Math.sin(rot/2), w: Math.cos(rot/2) }, true);
        b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        b.damage = 0; b.scarFloor = 0; b.crackStep = -1;
        b.__mat = b.matName; b.__m = b.body.mass(); b.__drop = y; b.__h = 0.90;
      });
      const H = new Map();
      for (const b of w.blocks) H.set(b.__cid, { mat: b.__mat, m: +b.__m.toFixed(3), fall: +(b.__drop - 0.45).toFixed(2), v: [], y: [] });
      for (let n = 0; n < 260; n++) {
        SS.stepOnce();
        if (w.hitStop > 0) continue;
        for (const b of w.blocks) {
          const h = H.get(b.__cid); if (!h) continue;
          h.v.push(+b.body.linvel().y.toFixed(5));
          h.y.push(+b.body.translation().y.toFixed(5));
        }
      }
      const res = [];
      for (const [cid, h] of H) {
        let ci = -1;
        for (let i = 2; i < h.v.length; i++) {
          const dv = (h.v[i] - h.v[i-1]) * 120;
          if (dv > -${G} * 0.5 && h.v[i-1] < -0.3) { ci = i; break; }
        }
        if (ci < 0) { res.push({ cid, mat: h.mat, m: h.m, fall: h.fall, shattered: true }); continue; }
        const vIn = Math.abs(h.v[ci-1]);
        res.push({ cid, mat: h.mat, m: h.m, fall: h.fall, vIn: +vIn.toFixed(3),
                   COR1: +(Math.max(0, h.v[ci]) / vIn).toFixed(4),
                   COR3: +(Math.max(0, ...h.v.slice(ci, ci+3)) / vIn).toFixed(4),
                   penetration: +(0.45 - Math.min(...h.y.slice(ci, ci+3))).toFixed(4),
                   restY: +h.y[h.y.length-1].toFixed(4), shattered: false });
      }
      return res;
    `, DD);
    rows.push(...out);
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile(`${OUT}/pw-r2f.json`, JSON.stringify(rows, null, 2));
  console.log('rows', rows.length);
};
