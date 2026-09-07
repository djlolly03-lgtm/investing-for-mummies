/**
 * p3-r6-late.mjs — THE RISK THE SCAR INTRODUCES, TESTED.
 *
 * Round 6 adds a permanent residual (`scar`) so a strong hit and a later crush add up, and
 * a slow leak for stone. The failure mode that buys is a block that finally crosses its
 * threshold long after the collapse has stopped — the player watching a settled rock split
 * on its own with nothing touching it, which is worse than no stone break at all.
 *
 * So: fire all four ammo on l1 and record, for EVERY fracture, how quiet the world was at
 * that moment (fraction of block+debris bodies asleep) and how long it had been since the
 * last contact that block took. A fracture in a world that is ≥90 % asleep is a spontaneous
 * break and a FAIL. A fracture mid-collapse is the whole point.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__late = [];
if (!B.__r6late) {
  B.__r6late = true;
  const of = B.fracture;
  B.fracture = function (imp, pt) {
    const bs = SS.__world.blocks.filter(b => !b.dead && b.body);
    const ds = SS.__world.debris.filter(d => !d.dead && d.body);
    const all = bs.concat(ds);
    const asleep = all.filter(e => e.body.isSleeping()).length;
    const rec = { tick: SS.tick(), mat: this.matName, imp: +imp.toFixed(1),
                  asleepPct: all.length ? Math.round(100 * asleep / all.length) : 100,
                  n: all.length };
    const k = of.call(this, imp, pt);
    window.__late.push(rec);
    return k;
  };
}
return true;`;

export default async ({ game, state }) => {
  // l1 clears on one shot today (a P12 difficulty fact, not a damage-model one), so the
  // multi-shot half of the test runs on the stone probe level, whose villain is parked out
  // of the blast at x=26: four shots land on a structure that keeps its scars between them.
  for (const LVL of ['l1', '_p3-stone']) await run(LVL, game, state);
};

async function run(LVL, game, state) {
  // Shots that actually land on each level (from p3-r6-vocab's aim sweep for the probe).
  const SHOTS = LVL === 'l1'
    ? [[0.22, 0.96], [0.30, 0.90], [0.26, 0.94], [0.34, 0.92]]
    : [[0.24, 0.88], [0.20, 0.88], [0.16, 0.88], [0.22, 0.86]];
  console.log(`\n=== ${LVL} ===`);
  await game('return await SS.loadLevel(args[0]);', LVL);
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('window.__late = []; return true;');

  let bad = 0, total = 0;
  for (let i = 0; i < SHOTS.length; i++) {
    const s0 = await state();
    if (s0.phase === 'won' || s0.phase === 'lost') { console.log(`level ended after ${i} shots (${s0.phase})`); break; }
    const r = await game('return SS.aimAndFire(args[0],args[1]);', ...SHOTS[i]);
    if (!r.ok) { console.log(`shot ${i} FIRE-FAIL ${r.reason}`); break; }
    await game('await SS.seek(7000);');
    const rows = await game('const r = window.__late; window.__late = []; return r;');
    total += rows.length;
    const late = rows.filter(x => x.asleepPct >= 90);
    bad += late.length;
    console.log(`shot ${i + 1} ${SHOTS[i][0]}@${SHOTS[i][1]}: ${rows.length} fractures  ` +
      rows.map(x => `${x.mat[0].toUpperCase()}@${x.imp}(asleep ${x.asleepPct}%)`).join(' '));
    // 3 extra seconds of a world nobody is touching: nothing may break in here.
    await game('await SS.seek(3000);');
    const idle = await game('const r = window.__late; window.__late = []; return r;');
    if (idle.length) { bad += idle.length; console.log(`   !! ${idle.length} fractures in the 3 s IDLE window: ${JSON.stringify(idle)}`); }
    else console.log(`   idle window clean (3 s, 0 fractures)`);
  }
  const s = await state();
  console.log(`\nTOTAL ${total} fractures, ${bad} of them in a >=90 %-asleep world.`);
  console.log(bad === 0 ? 'LATE-BREAK PASS — every fracture happened while the world was moving.'
    : 'LATE-BREAK FAIL — a settled world broke something on its own.');
  console.log(`final: phase=${s.phase} score=${s.score} blocks=${s.blocks} debris=${s.debris}`);
}
