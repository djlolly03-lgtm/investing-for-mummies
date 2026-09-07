/**
 * CRIT P3 r6 — part 3. Does a DIRECT hit break each material?
 * Identical geometry in three materials (_p3-wood/_p3-glass/_p3-stone), same shot grid.
 * Records, per shot: the impulse the ammo actually delivered to the block it struck, whether
 * that block fractured, and WHO the killing blow belonged to.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ game, OUT }) => {
  const instrument = () => game(`
    const w = SS.__world;
    const B = w.blocks[0] && Object.getPrototypeOf(w.blocks[0]);
    window.__log = { ammoHits: [], fractures: [] };
    if (!B.__critWrapped3) {
      B.__critWrapped3 = true;
      const oi = B.onImpact, os = B.onShock, of = B.fracture;
      B.onImpact = function (imp, other, point, approach = 0) {
        const tag = other && other.tag;
        const live = tag === 'ammo' && (other.lastSpeed ?? 0) >= 6;
        if (live) window.__log.ammoHits.push({ t: SS.tick(), mat: this.matName, imp: +imp.toFixed(2),
          spd: +(other.lastSpeed ?? 0).toFixed(1), thr: +(this.material.physics.breakImpulse ?? 0).toFixed(2),
          dmgAfter: null, w: +this.w.toFixed(2), h: +this.h.toFixed(2) });
        this.__src = live ? 'AMMO' : tag ? String(tag).toUpperCase() : 'X';
        const r = oi.call(this, imp, other, point, approach);
        if (live) window.__log.ammoHits.at(-1).dmgAfter = +(this.damage ?? 0).toFixed(2);
        return r;
      };
      B.onShock = function (d,u,v) { this.__src='SHOCK'; return os.call(this,d,u,v); };
      B.fracture = function (imp, point) {
        window.__log.fractures.push({ t: SS.tick(), mat: this.matName, killer: this.__src||'?',
          imp: +imp.toFixed(2), w: +this.w.toFixed(2), h: +this.h.toFixed(2) });
        return of.call(this, imp, point);
      };
    }
    return true;
  `);

  const OUTR = {};
  const grid = [[0.16,0.85],[0.20,0.80],[0.22,0.75],[0.24,0.78],[0.26,0.82],[0.28,0.85],[0.30,0.88],[0.10,0.85]];
  for (const [lvl, mn] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    const rows = [];
    for (const [a, p] of grid) {
      await game('await SS.loadLevel(args[0]); SS.seed(7); await SS.seek(900);', lvl);
      await instrument();
      await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      await game('await SS.seek(1200);');
      const early = await game('return window.__log;');
      await game('await SS.seek(4000);');
      const late = await game('return window.__log;');
      rows.push({ a, p,
        ammoHits: early.ammoHits,
        fracturesWithin1200ms: early.fractures,
        fracturesTotal: late.fractures,
        byAmmo: late.fractures.filter(f => f.killer === 'AMMO').length,
        byOther: late.fractures.filter(f => f.killer !== 'AMMO').length });
    }
    OUTR[mn] = rows;
    const hits = rows.flatMap(r => r.ammoHits);
    console.log(`== ${mn}: shots ${rows.length}, ammo hits ${hits.length}, ` +
      `impulse ${hits.length ? Math.min(...hits.map(h=>h.imp)).toFixed(1)+'..'+Math.max(...hits.map(h=>h.imp)).toFixed(1) : '-'}, ` +
      `thr ${hits[0]?.thr}, fractures-by-AMMO ${rows.reduce((s,r)=>s+r.byAmmo,0)}, ` +
      `by-other ${rows.reduce((s,r)=>s+r.byOther,0)}, ` +
      `shots with an AMMO break ${rows.filter(r=>r.byAmmo>0).length}/${rows.length}`);
    for (const r of rows) console.log(`   a=${r.a} p=${r.p} ammoImp=[${r.ammoHits.map(h=>h.imp+'->d'+h.dmgAfter).join(' ')}] ` +
      `frac@1.2s=${r.fracturesWithin1200ms.map(f=>f.mat+'/'+f.killer).join(',')||'-'} total=${r.fracturesTotal.map(f=>f.killer).join(',')||'-'}`);
  }
  await writeFile(path.join(OUT, 'P3-r6c-direct.json'), JSON.stringify(OUTR, null, 2));
};
