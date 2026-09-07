/**
 * pw-r2-float.mjs — "no floaty debris", over FOUR shots instead of one.
 *
 * `pw-gate.mjs` section 4 measures debris settling on a single l1 shot, and a single shot is
 * not a population: which member happens to break decides whether the wreckage is a shower of
 * small chips (settled by 1 s) or two halves of a 4.8 m beam thrown off the top storey (still
 * tumbling at 2.5 s). Measured on one shot, PW r2's damage change appeared to move "crawling
 * at t=2500 ms" from 2 % to 51 %; measured across four shots it is a property of the shot,
 * not of the build.
 *
 * Three numbers, and only the last two are verdicts:
 *   BALLISTIC   median |dvy| / (g·dt) while a fragment is airborne and fast. 1.000 is a real
 *               parabola. This is the actual "floaty" test — anything below ~0.98 means a
 *               damping term is quietly braking the wreckage in mid-air.
 *   REST        time from a fragment's birth to its last motion above 0.08 m/s.
 *   STILL@t     share of fragments older than 500 ms that are still moving, at fixed times.
 */

import { INSTALL, START, DUMP, tracks, ms } from './pw-probe.mjs';

const SHOTS = [[0.30, 0.90], [0.26, 0.95], [0.36, 1.00], [0.24, 0.92]];
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

export default async ({ game }) => {
  const out = [];
  const say = (s = '') => { out.push(s); console.log(s); };
  await game(INSTALL);

  const G = 9.81 * 2.4, DT = 1 / 120;
  const all = [];
  const crawlAt = { 800: [0, 0], 1500: [0, 0], 2500: [0, 0], 4000: [0, 0] };

  for (const [ang, pow] of SHOTS) {
    await game('return await SS.loadLevel("l1");');
    await game('return await SS.seed(4242);');
    await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
    await game(START);
    await game('return await SS.seek(6000);');
    const deb = tracks(await game(DUMP)).filter(t => t.kind === 'D');

    for (const d of deb) {
      const n = d.s.length;
      let iRest = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (Math.hypot(d.s[i].vx, d.s[i].vy) >= 0.25) { iRest = Math.min(i + 1, n - 1); break; }
      }
      const rat = [];
      for (let i = 1; i < n; i++) {
        const sp = Math.hypot(d.s[i].vx, d.s[i].vy);
        if (sp < 1.5) continue;
        const dvy = d.s[i].vy - d.s[i - 1].vy;
        if (dvy > 0) continue;
        rat.push(Math.abs(dvy) / (G * DT));
      }
      rat.sort((a, b) => a - b);
      all.push({ mat: d.mat, restMs: ms(d.s[iRest].i - d.first),
        ball: rat.length ? rat[rat.length >> 1] : null });
    }
    for (const t of Object.keys(crawlAt)) {
      const i = Math.round(+t / (1000 / 120));
      for (const d of deb) {
        const p = d.s.find(q => q.i === i); if (!p) continue;
        if (d.first > i - 60) continue;
        crawlAt[t][1]++;
        if (Math.hypot(p.vx, p.vy) > 0.25) crawlAt[t][0]++;
      }
    }
  }

  say(`=== DEBRIS FLOAT / BALLISTIC FIDELITY — ${SHOTS.length} l1 shots, ${all.length} fragments ===`);
  for (const m of ['wood', 'glass', 'stone']) {
    const g = all.filter(x => x.mat === m);
    if (!g.length) { say(`  ${m.padEnd(6)} none`); continue; }
    const b = g.map(x => x.ball).filter(x => x != null);
    say(`  ${m.padEnd(6)} n=${String(g.length).padStart(3)}   rest median ${String(med(g.map(x => x.restMs))).padStart(4)} ms ` +
        `worst ${String(Math.max(...g.map(x => x.restMs))).padStart(4)} ms   ` +
        `BALLISTIC median ${b.length ? med(b).toFixed(3) : '—'}  (1.000 = a real parabola)`);
  }
  const b = all.map(x => x.ball).filter(x => x != null);
  say(`  ALL    n=${String(all.length).padStart(3)}   rest median ${med(all.map(x => x.restMs))} ms ` +
      `worst ${Math.max(...all.map(x => x.restMs))} ms   BALLISTIC median ${med(b).toFixed(3)}`);
  say('');
  for (const t of [800, 1500, 2500, 4000]) {
    const [mv, tot] = crawlAt[t];
    say(`  t=${String(t).padStart(4)} ms   fragments older than 500 ms: ${String(tot).padStart(3)}   ` +
        `STILL MOVING ${String(mv).padStart(3)} (${tot ? Math.round(100 * mv / tot) : 0} %)`);
  }
  return out.join('\n');
};
