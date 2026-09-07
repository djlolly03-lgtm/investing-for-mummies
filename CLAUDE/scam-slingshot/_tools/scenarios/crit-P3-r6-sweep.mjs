/** Find a shot that squarely hits the single column in each _p3-<mat> probe level. */
export default async ({ game }) => {
  for (const lvl of ['_p3-wood', '_p3-glass', '_p3-stone']) {
    const rows = [];
    for (const a of [0.18, 0.22, 0.26, 0.30, 0.34, 0.38, 0.44]) {
      for (const p of [0.80, 0.90, 0.96]) {
        await game('await SS.loadLevel(args[0]); SS.seed(3); await SS.seek(900);', lvl);
        await game('return SS.aimAndFire(args[0], args[1]);', a, p);
        let hit = null;
        await game(`
          const w = SS.__world;
          window.__h = null;
          const B = Object.getPrototypeOf(w.blocks[0]);
          if (!B.__sw) { B.__sw = true; const oi = B.onImpact;
            B.onImpact = function (i, o, pt, ap = 0) {
              if (o && o.tag === 'ammo' && ap >= 1.2 && window.__h === null)
                window.__h = { tick: SS.tick(), imp: +i.toFixed(2), ap: +ap.toFixed(1) };
              return oi.call(this, i, o, pt, ap); }; }
          return true;`);
        for (let i = 0; i < 30; i++) {
          await game('await SS.seek(100);');
          hit = await game('return window.__h;');
          if (hit) break;
        }
        await game('await SS.seek(2500);');
        const c = await game('return { d: SS.__world.debris.length, b: SS.__world.blocks.length };');
        rows.push({ a, p, hitTick: hit && hit.tick, imp: hit && hit.imp, ...c });
      }
    }
    console.log(lvl, JSON.stringify(rows));
  }
};
