/**
 * CRIT P3 r6 — part 6. When a square hit does NOT break the block, does anything happen?
 * Same fixture, same shot, three materials: motion of every block for 400 ms after first contact.
 */
export default async ({ game }) => {
  const instr = () => game(`
    const w = SS.__world;
    const B = w.blocks[0] && Object.getPrototypeOf(w.blocks[0]);
    window.__log = { firstAmmo: null, fractures: 0 };
    if (!B.__critW6) { B.__critW6 = true;
      const oi = B.onImpact, of = B.fracture;
      B.onImpact = function (imp, other, point, ap = 0) {
        if (other && other.tag === 'ammo' && (other.lastSpeed ?? 0) >= 6 && window.__log.firstAmmo === null)
          window.__log.firstAmmo = { imp: +imp.toFixed(2), mat: this.matName };
        return oi.call(this, imp, other, point, ap); };
      B.fracture = function (i, p) { window.__log.fractures++; return of.call(this, i, p); };
    } return true;`);
  const snap = () => game(`
    const w = SS.__world; return w.blocks.map(b => { const t=b.body.translation(), q=b.body.rotation();
      return { x:t.x, y:t.y, r: Math.atan2(2*(q.w*q.z), 1-2*q.z*q.z), mat:b.matName, broken:b.broken }; });`);
  const delta = (base) => game(`
    const w = SS.__world, base = args[0]; let md=0, mr=0, moving=0;
    w.blocks.forEach((b,i) => { const o = base[i]; if (!o) return;
      const t=b.body.translation(), q=b.body.rotation();
      const r = Math.atan2(2*(q.w*q.z), 1-2*q.z*q.z);
      const d = Math.hypot(t.x-o.x, t.y-o.y), dr = Math.abs(r-o.r);
      md = Math.max(md,d); mr = Math.max(mr,dr);
      if (d > 0.02 || dr > 0.02) moving++; });
    return { maxMove: +md.toFixed(4), maxRot: +mr.toFixed(4), moving, of: w.blocks.length };`, base);

  for (const [lvl, mn] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    for (const [a, p] of [[0.16,0.85],[0.22,0.75],[0.28,0.85],[0.24,0.78]]) {
      await game('await SS.loadLevel(args[0]); SS.seed(7); await SS.seek(900);', lvl);
      await instr();
      await game('return SS.aimAndFire(args[0], args[1]);', a, p);
      let ms = 0, hit = null;
      while (ms < 4000) { await game('await SS.seek(10);'); ms += 10;
        hit = await game('return window.__log.firstAmmo;'); if (hit) break; }
      if (!hit) { console.log(`${mn} ${a}@${p}: MISS`); continue; }
      const base = await snap();
      const marks = {};
      for (const t of [100, 200, 400, 800]) {
        await game('await SS.seek(args[0]);', t - (Object.keys(marks).length ? +Object.keys(marks).at(-1) : 0));
        marks[t] = await delta(base);
      }
      const fr = await game('return window.__log.fractures;');
      console.log(`${mn.padEnd(5)} ${a}@${p} ammoImp=${String(hit.imp).padStart(5)} fractures=${fr} | ` +
        [100,200,400,800].map(t => `t+${t}: move ${marks[t].maxMove.toFixed(3)} rot ${marks[t].maxRot.toFixed(3)} moving ${marks[t].moving}/${marks[t].of}`).join(' | '));
    }
  }
};
