/**
 * pw-villain.mjs — the villain damage budget, in the units the model is now written in.
 *
 * This is p0-tune.mjs re-pointed at Delta-v. villains/base.js's HIT_FLOOR / HIT_GAIN /
 * BATTER_* moved from N·s to m/s of the villain's own velocity change when PW raised
 * villain density 0.42 -> 0.98, because an absolute-impulse threshold silently changes
 * meaning the moment a villain's mass does. Re-run this after ANY change to villain radius,
 * density, collider or ammo mass, and re-derive the four constants from the two populations
 * it prints: they must not overlap.
 */
export default async ({ game }) => {
  const out = []; const say = s => { out.push(s); console.log(s); };
  await game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1);
    if (!window.__pwv) {
      window.__pwv = true;
      const VP = Object.getPrototypeOf(Object.getPrototypeOf(SS.__world.villains[0]));
      window.__T = { ev: [] };
      const oi = VP.onImpact, od = VP.die;
      VP.onImpact = function (impulse, other, point, approach = 0) {
        window.__T.ev.push({ imp: impulse, dv: impulse / this.massKg, app: approach,
                             other: other ? other.tag : 'null', hp: this.hp });
        return oi.call(this, impulse, other, point, approach);
      };
      VP.die = function (i) { window.__T.ev.push({ DIED: 1 }); return od.call(this, i); };
    }
    return { mass: +SS.__world.villains[0].massKg.toFixed(4) };`)
    .then(r => say(`  villain mass ${r.mass} kg`));

  const run = (angle, power) => game(`
    await SS.loadLevel('_probe-open'); await SS.seed(1); await SS.seek(700);
    window.__T.ev.length = 0;
    SS.aimAndFire(args[0], args[1]);
    await SS.seek(2600);
    const E = window.__T.ev, am = E.filter(e => e.other === 'ammo');
    const hard = am.filter(e => e.app >= 1.2), soft = am.filter(e => e.app < 1.2);
    return { n: am.length,
      pkDvHard: +hard.reduce((m,e)=>Math.max(m,e.dv),0).toFixed(2),
      pkDvSoft: +soft.reduce((m,e)=>Math.max(m,e.dv),0).toFixed(2),
      pkImp:  +am.reduce((m,e)=>Math.max(m,e.imp),0).toFixed(2),
      app:    +am.reduce((m,e)=>Math.max(m,e.app),0).toFixed(1),
      died: E.some(e=>e.DIED) };`, angle, power);

  const rows = [];
  for (const p of [1.0, 0.8, 0.6, 0.45, 0.3]) {
    for (let a = 0.05; a <= 1.3001; a += 0.05) {
      const r = await run(+a.toFixed(2), p);
      if (r.n > 0) rows.push({ p, a: +a.toFixed(2), ...r });
    }
  }
  const direct = rows.filter(r => r.app >= 8);           // it was actually flying at it
  const graze  = rows.filter(r => r.app < 8);
  const killed = rows.filter(r => r.died), lived = rows.filter(r => !r.died);
  const f = (a, k) => a.length ? `${Math.min(...a.map(r => r[k])).toFixed(2)}–${Math.max(...a.map(r => r[k])).toFixed(2)}` : '—';
  say(`  shots that touched the villain: ${rows.length}   killed ${killed.length}   survived ${lived.length}`);
  say(`  DIRECT (approach >= 8 m/s), n=${direct.length}:  peak Delta-v ${f(direct, 'pkDvHard')}   peak impulse ${f(direct, 'pkImp')}`);
  say(`  GRAZE / SLOW (approach < 8), n=${graze.length}:  peak Delta-v ${f(graze, 'pkDvHard')}   peak impulse ${f(graze, 'pkImp')}`);
  say(`  RESTING contacts (approach < 1.2) across all shots: peak Delta-v ${f(rows, 'pkDvSoft')}`);
  say(`  KILLED   peak Delta-v ${f(killed, 'pkDvHard')}`);
  say(`  SURVIVED peak Delta-v ${f(lived, 'pkDvHard')}`);
  const worstLived = lived.length ? Math.max(...lived.map(r => r.pkDvHard)) : 0;
  const softestKill = killed.length ? Math.min(...killed.map(r => r.pkDvHard)) : 0;
  say(`  >>> the two populations ${softestKill > worstLived ? 'DO NOT overlap' : 'OVERLAP'} — softest kill ${softestKill.toFixed(2)}, hardest survivor ${worstLived.toFixed(2)}`);
  for (const r of rows) say(`    p=${r.p} a=${r.a}  n=${r.n} dv=${r.pkDvHard} imp=${r.pkImp} app=${r.app} died=${r.died}`);
  return out.join('\n');
};
