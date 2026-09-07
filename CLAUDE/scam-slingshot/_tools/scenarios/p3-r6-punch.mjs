/**
 * p3-r6-punch.mjs — the FIRST ammo contact only: closing speed, contact impulse, and the
 * ratio between them. This is the number the damage model has to be built on: how much
 * dynamic range does a shot actually have between a lazy lob and a full-power square hit?
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__ev = []; window.__fx = [];
if (!B.__r6p) {
  B.__r6p = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo') {
      const v = other.body.linvel();
      window.__ev.push({ tick: SS.tick(), mat: this.matName, id: this.id, imp, app,
        vx: v.x, vy: v.y, spd: Math.hypot(v.x, v.y), bm: this.body.mass() });
    }
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) { const t = SS.tick(), k = of.call(this, imp, pt);
    window.__fx.push({ tick: t, mat: this.matName, imp, kids: k.length }); return k; };
}
return true;`;

const RESET = `window.__ev = []; window.__fx = []; return true;`;

async function fire(game, lvl, seed, ang, pow, settle) {
  await game('return await SS.loadLevel(args[0]);', lvl);
  await game('return SS.seed(args[0]);', seed);
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game(RESET);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  await game('await SS.seek(args[0]);', settle);
  return game('return { ev: window.__ev, fx: window.__fx };');
}

export default async ({ game }) => {
  const L = (...a) => console.log(...a);
  const rows = [];

  for (const lvl of ['_p3-stone', '_p3-wood', '_p3-glass', 'l1']) {
    L(`\n######## ${lvl} — first ammo contact ########`);
    L(' shot        app(m/s)  imp(N.s)  imp/app   blockMass  mat     frac');
    for (const [a, p] of [[0.06, 1.0], [0.08, 1.0], [0.10, 1.0], [0.12, 1.0], [0.14, 1.0],
                          [0.10, 0.85], [0.13, 0.85], [0.16, 0.85], [0.19, 0.85],
                          [0.12, 0.70], [0.16, 0.70], [0.20, 0.70], [0.24, 0.70],
                          [0.16, 0.55], [0.22, 0.55], [0.28, 0.55],
                          [0.24, 0.40], [0.32, 0.40], [0.30, 0.95], [0.34, 0.95], [0.36, 1.0]]) {
      const d = await fire(game, lvl, lvl === 'l1' ? 4242 : 777, a, p, 3000);
      const e = d.ev.find(x => x.app >= 1.2);
      if (!e) { continue; }
      rows.push({ lvl, a, p, app: e.app, imp: e.imp });
      L(` ${String(a).padEnd(5)}@${String(p).padEnd(5)} ${e.app.toFixed(2).padStart(7)} ` +
        `${e.imp.toFixed(2).padStart(9)} ${(e.imp / e.app).toFixed(3).padStart(8)} ` +
        `${e.bm.toFixed(2).padStart(10)}   ${e.mat.padEnd(6)}  ${d.fx.length}`);
    }
  }

  const apps = rows.map(r => r.app), imps = rows.map(r => r.imp);
  L(`\n>>> across ${rows.length} landed shots: approach ${Math.min(...apps).toFixed(1)}–${Math.max(...apps).toFixed(1)} m/s,` +
    ` first-contact impulse ${Math.min(...imps).toFixed(2)}–${Math.max(...imps).toFixed(2)} N.s`);
  L(`>>> momentum equivalent at 0.6166 kg: ${(0.6166 * Math.min(...apps)).toFixed(1)}–${(0.6166 * Math.max(...apps)).toFixed(1)} N.s`);
};
