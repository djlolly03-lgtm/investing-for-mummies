/**
 * p0-collapse-diag.mjs — DEFECT 1, part 2: why does STRUCTURAL COLLAPSE not kill?
 *
 * The direct-hit path is already proven (p0-kill 1/2/3). This one instruments the *other*
 * half: a real shot into l1 that flattens the tower and leaves both villains at hp 1.000.
 *
 * It answers, with numbers, per villain:
 *   · how many contact events reach it at all, and from what (tag + material + mass)
 *   · the PER-TICK SUM of resting load (the crush model only ever looks at the max of one
 *     contact, so a pile of five chunks may be invisible to it)
 *   · the peak moving-impact impulse it absorbs
 *   · whether it is even under the wreckage at the end, or was punted out of the blast
 */
export default async ({ shot, game, state, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = [];
  const say = (k, v) => { out.push({ [k]: v }); console.log(`  ${k}:`, JSON.stringify(v)); };

  const INSTALL = `
    if (!window.__cd) {
      window.__cd = { ev: [] };
      const VP = Object.getPrototypeOf(Object.getPrototypeOf(SS.__world.villains[0]));
      window.__VP = VP;
      const oi = VP.onImpact, oh = VP.hit, od = VP.die;
      VP.onImpact = function (impulse, other, point, approach = 0) {
        window.__cd.ev.push({ t: SS.tick(), v: this.__i ?? -1, kind: 'imp',
          imp: +impulse.toFixed(4), app: +approach.toFixed(3),
          tag: other ? other.tag : 'null', m: other ? (other.matName || '-') : '-',
          om: other && other.mass ? +other.mass().toFixed(3) : 0,
          load: +(impulse / this.weightImpulse).toFixed(2), hp: +this.hp.toFixed(3) });
        return oi.call(this, impulse, other, point, approach);
      };
      VP.hit = function (imp, other) { window.__cd.ev.push({ t: SS.tick(), v: this.__i ?? -1, kind: 'hit', imp: +imp.toFixed(3), hp: +this.hp.toFixed(3) }); return oh.call(this, imp, other); };
      VP.die = function (i) { window.__cd.ev.push({ t: SS.tick(), v: this.__i ?? -1, kind: 'DIED', imp: +(i||0).toFixed(2) }); return od.call(this, i); };
    }
    SS.__world.villains.forEach((v, i) => { v.__i = i; });`;

  const RESET = `await SS.loadLevel('l1'); await SS.seed(1); ${INSTALL} window.__cd.ev.length = 0;`;

  await game(`await SS.loadLevel('l1'); await SS.seed(1); ${INSTALL} return SS.state();`);

  // ---------- 1. one real shot, sampled ----------
  const SHOT = async (angle, power) => game(`
    ${RESET}
    const V = SS.__world.villains;
    const start = V.map(v => { const t = v.body.translation(); return { x:+t.x.toFixed(2), y:+t.y.toFixed(2) }; });
    SS.aimAndFire(args[0], args[1]);
    const samples = [];
    for (let i = 0; i < 80; i++) {
      await SS.seek(100);
      samples.push({ ms: (i+1)*100,
        hp: V.map(v => +v.hp.toFixed(3)),
        crush: V.map(v => +(v.crushLoad||0).toFixed(2)),
        alive: V.map(v => v.alive),
        pos: V.map(v => v.body ? { x:+v.body.translation().x.toFixed(2), y:+v.body.translation().y.toFixed(2) } : null),
        blocks: SS.__world.blocks.length, debris: SS.__world.debris.length });
      if (V.every(v => !v.alive)) break;
    }
    // group resting contacts by tick and villain -> what the crush model COULD have seen
    const ev = window.__cd.ev;
    const byTick = new Map();
    for (const e of ev) {
      if (e.kind !== 'imp' || e.app >= 1.2) continue;
      const k = e.t + ':' + e.v;
      byTick.set(k, (byTick.get(k) || 0) + e.load);
    }
    let maxSum = 0, maxSumAt = null, maxSingle = 0;
    for (const [k, s] of byTick) { if (s > maxSum) { maxSum = s; maxSumAt = k; } }
    for (const e of ev) if (e.kind === 'imp' && e.app < 1.2 && e.load > maxSingle) maxSingle = e.load;
    const moving = ev.filter(e => e.kind === 'imp' && e.app >= 1.2);
    const perV = [0,1].map(i => {
      const mine = ev.filter(e => e.v === i && e.kind === 'imp');
      const mv = mine.filter(e => e.app >= 1.2);
      return { villain: i, contacts: mine.length, movingContacts: mv.length,
        peakMovingImp: +mv.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(3),
        peakRestLoad: +mine.filter(e=>e.app<1.2).reduce((m,e)=>Math.max(m,e.load),0).toFixed(2),
        biggestBy: mine.slice().sort((a,b)=>b.imp-a.imp).slice(0,5) };
    });
    const V2 = SS.__world.villains;
    const endNear = V2.map(v => {
      if (!v.body) return null;
      const p = v.body.translation();
      const near = [];
      for (const e of SS.__world.entities) {
        if (!e.body || e === v) continue;
        const q = e.body.translation();
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < 1.6) near.push({ tag: e.tag, m: e.matName || '-', d: +d.toFixed(2),
          above: +(q.y - p.y).toFixed(2), mass: +(e.mass?.() ?? 0).toFixed(3) });
      }
      return near.sort((a,b)=>a.d-b.d).slice(0, 8);
    });
    return { angle: args[0], power: args[1], start, perV,
      maxPerTickRestLoadSum: +maxSum.toFixed(2), maxSumAt, maxSingleRestLoad: +maxSingle.toFixed(2),
      totalEvents: ev.length, movingEvents: moving.length,
      endNear, samples: samples.filter((s,i) => i % 4 === 3 || i < 12), final: SS.state() };
  `, angle, power);

  const s1 = await SHOT(0.30, 1.0);
  say('shotA_0.30', { ...s1, samples: s1.samples.slice(0, 14) });
  say('shotA_samples_tail', s1.samples.slice(-8));

  // ---------- 2. an angle sweep — does ANY shot into l1 kill by collapse? ----------
  const sweep = [];
  for (const a of [0.22, 0.26, 0.30, 0.34, 0.38, 0.44, 0.52, 0.60, 0.70, 0.82]) {
    const r = await game(`
      ${RESET}
      const V = SS.__world.villains;
      SS.aimAndFire(args[0], 1.0);
      for (let i = 0; i < 70; i++) { await SS.seek(100); if (V.every(v=>!v.alive)) break; }
      const ev = window.__cd.ev;
      const byTick = new Map();
      for (const e of ev) { if (e.kind !== 'imp' || e.app >= 1.2) continue; const k = e.t+':'+e.v; byTick.set(k, (byTick.get(k)||0)+e.load); }
      let maxSum = 0; for (const s of byTick.values()) if (s > maxSum) maxSum = s;
      return { angle: args[0], alive: SS.state().villainsAlive, score: SS.state().score,
        hp: V.map(v=>+v.hp.toFixed(3)), phase: SS.state().phase,
        blocks: SS.__world.blocks.length, debris: SS.__world.debris.length,
        contacts: ev.filter(e=>e.kind==='imp').length,
        peakMoving: +ev.filter(e=>e.kind==='imp'&&e.app>=1.2).reduce((m,e)=>Math.max(m,e.imp),0).toFixed(2),
        peakRestLoad: +ev.filter(e=>e.kind==='imp'&&e.app<1.2).reduce((m,e)=>Math.max(m,e.load),0).toFixed(2),
        maxPerTickRestSum: +maxSum.toFixed(2) };
    `, a);
    sweep.push(r);
    console.log('  sweep', a, JSON.stringify(r));
  }
  say('sweep', sweep);

  // ---------- 3. how long does a shot take to settle? ----------
  say('settleTiming', await game(`
    ${RESET}
    SS.aimAndFire(0.30, 1.0);
    const marks = [];
    let phase = SS.state().phase;
    for (let i = 0; i < 160; i++) {
      await SS.seek(100);
      const s = SS.state();
      if (s.phase !== phase) { marks.push({ ms: (i+1)*100, phase: s.phase, debris: s.debris, blocks: s.blocks }); phase = s.phase; }
      if (s.phase === 'aiming' || s.phase === 'won' || s.phase === 'lost') break;
    }
    return { marks, final: SS.state() };
  `));

  say('errors', await game('return SS.errors.map(e=>e.text).slice(0,8);'));
  await fs.writeFile(path.join(OUT, 'collapse.json'), JSON.stringify(out, null, 2));
};
