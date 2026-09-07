/**
 * p3-r6-crush.mjs — MEASURE BEFORE AUTHORING A THRESHOLD (ORCHESTRATOR-NOTES r6 #1).
 *
 * The round-6 gap asks for stone that "a heavy crush — being crushed under a collapsing
 * storey — must break". No such channel exists: level/blocks.js drops every contact with
 * approach < 1.2 m/s on the floor, which is exactly what a storey settling onto you is.
 *
 * Before inventing one, measure both sides of the discrimination it has to make:
 *   REST  — the per-tick contact load each block carries on an UNTOUCHED settled level.
 *           A crush model that trips on this destroys the "stable at rest" hard bar.
 *   CRUSH — the per-tick contact load a block carries while wreckage is sitting on it.
 * Reported per block, per material, as N·s absorbed per solver tick (force x FIXED).
 */

const SHOTS = [[0.30, 0.90], [0.32, 0.94], [0.36, 1.00], [0.24, 0.92]];

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__LD = new Map();
window.__W = 12;                                  // 12 ticks = 100 ms window
if (!B.__crushProbe) {
  B.__crushProbe = true;
  const oi = B.onImpact;
  B.onImpact = function (imp, other, pt, app) {
    const t = SS.tick(), w = Math.floor(t / window.__W);
    let r = window.__LD.get(this.id);
    if (!r) { r = { mat: this.matName, w: -1, cur: 0, peak: 0, hiPeak: 0, hiN: 0, win: {} };
              window.__LD.set(this.id, r); }
    if (w !== r.w) { if (r.w >= 0) { r.win[r.w] = r.cur / window.__W; if (r.cur / window.__W > r.peak) r.peak = r.cur / window.__W; }
                     r.cur = 0; r.w = w; }
    if (app < 1.2) r.cur += imp;
    else { r.hiN++; if (imp > r.hiPeak) r.hiPeak = imp; }
    return oi.call(this, imp, other, pt, app);
  };
}
return true;`;

const RESET_LD = `for (const r of window.__LD.values()) { r.w = -1; r.cur = 0; r.peak = 0; r.hiPeak = 0; r.hiN = 0; r.win = {}; }
window.__LD.clear(); return true;`;

const READ = `const out = [];
for (const [id, r] of window.__LD) {
  const bl = SS.__world.blocks.find(b => b.id === id);
  out.push({ id, mat: r.mat, peak: r.peak, hiPeak: r.hiPeak, hiN: r.hiN,
             alive: !!bl && !bl.broken, dmg: bl ? bl.damage : -1,
             thr: bl ? bl.material.physics.breakImpulse : -1,
             x: bl ? bl.body.translation().x : null, y: bl ? bl.body.translation().y : null,
             win: r.win });
}
return out;`;

const f2 = (x) => (x === null || x === undefined ? '  -  ' : x.toFixed(2).padStart(6));

export default async ({ game }) => {
  // ── 1. REST: the load an untouched settled level carries. ──────────────────
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(2500);');
  await game(INSTRUMENT);
  await game(RESET_LD);
  await game('await SS.seek(800);');
  const rest = await game(READ);
  console.log('== REST LOAD (untouched settled l1) — N·s absorbed per solver tick ==');
  const restBy = {};
  for (const r of rest.sort((a, b) => b.peak - a.peak)) {
    restBy[r.mat] = Math.max(restBy[r.mat] ?? 0, r.peak);
    console.log(`  ${r.mat.padEnd(5)} id${String(r.id).padStart(3)}  ` +
      `x=${f2(r.x)} y=${f2(r.y)}   peakLoad/tick=${f2(r.peak)}   hiEvents=${r.hiN}`);
  }
  console.log(`  REST peak by material: ${JSON.stringify(restBy)}`);

  // ── 2. CRUSH: the load while a collapse is sitting on you. ─────────────────
  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game(RESET_LD);
    const r0 = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r0.ok) { console.log(`SHOT ${ang}@${pow} FIRE-FAIL`); continue; }
    await game('await SS.seek(6000);');
    const rows = await game(READ);

    console.log(`\n== SHOT ${ang}@${pow} — peak sustained load per block (6 s) ==`);
    for (const r of rows.sort((a, b) => b.peak - a.peak).slice(0, 10)) {
      const ws = Object.entries(r.win).map(([w, v]) => +v).filter(v => v > 0.15);
      console.log(`  ${r.mat.padEnd(5)} id${String(r.id).padStart(3)} ${r.alive ? 'alive' : 'BROKE'}  ` +
        `peakLoad/tick=${f2(r.peak)}  hiPeak=${f2(r.hiPeak)} (${r.hiN})  ` +
        `dmg=${f2(r.dmg)}/${r.thr}  windows>0.15: ${ws.length}`);
    }
    const stone = rows.filter(r => r.mat === 'stone');
    for (const r of stone) {
      const wins = Object.entries(r.win).map(([w, v]) => `${w}:${(+v).toFixed(2)}`)
        .filter(s => +s.split(':')[1] > 0.10);
      console.log(`  STONE id${r.id} ${r.alive ? 'alive' : 'BROKE'} peak=${f2(r.peak)} ` +
        `hiPeak=${f2(r.hiPeak)}(${r.hiN}) dmg=${f2(r.dmg)}  loadwindows[${wins.join(' ')}]`);
    }
  }
};
