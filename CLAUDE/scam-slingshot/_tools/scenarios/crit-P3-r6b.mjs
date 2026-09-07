/**
 * CRIT P3 r6 — part 2. The frames part 1 missed:
 *  - the impact instant framed ON the real contact point (part 1's lock box clipped it),
 *  - full-carnage frames at the GAME's own framing, full resolution, for the material-sorting
 *    test and for the blind A/B,
 *  - the settled wreck with the win overlay hidden (it covered the pile),
 *  - the three single-material probes with a shot that actually lands (0.22 @ 0.75).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const R = { impact: {}, carnage: [], materials: {} };

export default async ({ shot, filmstrip, game, state, OUT }) => {
  const instrument = () => game(`
    const w = SS.__world;
    const B = w.blocks[0] && Object.getPrototypeOf(w.blocks[0]);
    window.__log = { firstAmmo: null, fractures: [] };
    if (!B.__critWrapped2) {
      B.__critWrapped2 = true;
      const oi = B.onImpact, os = B.onShock, of = B.fracture;
      B.onImpact = function (imp, other, point, approach = 0) {
        const tag = other && other.tag;
        const live = tag === 'ammo' && (other.lastSpeed ?? 0) >= 6;
        if (live && window.__log.firstAmmo === null)
          window.__log.firstAmmo = { tick: SS.tick(), mat: this.matName, imp: +imp.toFixed(2),
            x: +(point?.x ?? this.body.translation().x).toFixed(2),
            y: +(point?.y ?? this.body.translation().y).toFixed(2) };
        this.__src = live ? 'AMMO' : tag ? String(tag).toUpperCase() : 'X';
        return oi.call(this, imp, other, point, approach);
      };
      B.onShock = function (d,u,v) { this.__src='SHOCK'; return os.call(this,d,u,v); };
      B.fracture = function (imp, point) {
        const before = w.debris.length; const r = of.call(this, imp, point);
        window.__log.fractures.push({ t: SS.tick(), mat: this.matName, killer: this.__src||'?',
          imp:+imp.toFixed(2), w:+this.w.toFixed(2), h:+this.h.toFixed(2),
          pieces: w.debris.length-before,
          sizes: w.debris.slice(before).map(d=>[+d.w.toFixed(3),+d.h.toFixed(3)]) });
        return r;
      };
    }
    return true;
  `);
  const fxLive = () => game(`
    const p = SS.__world.fx.pools, o = {};
    for (const k of Object.keys(p)) { let n=0; const L=p[k].p.life; for (let i=0;i<L.length;i++) if (L[i]>0) n++; o[k]=n; }
    return o;
  `);
  const toContact = async () => { let m = 0;
    while (m < 4000) { await game('await SS.seek(10);'); m += 10;
      const c = await game('return window.__log.firstAmmo;'); if (c) return { ms: m, c }; }
    throw new Error('no contact'); };

  // ---- A. the impact instant, framed on the actual contact point ----------------------
  await game('await SS.loadLevel("l1"); SS.seed(2026); await SS.seek(1500);');
  await instrument();
  await game('return SS.aimAndFire(0.30, 0.90);');
  const hit = await toContact();
  R.impact.contact = hit;
  // lens ON the contact point so flash/smoke structure is readable
  await game('SS.camLock({ x: args[0], y: args[1], halfWidth: 2.4 });', hit.c.x, hit.c.y);
  await filmstrip('impact-ONCONTACT-0to200-step25-LOCKED', { from: 0, to: 200, step: 25, cols: 3 });
  await game('SS.camUnlock(); await SS.seek(50);');

  // ---- B. the game's own framing, full res, through the collapse ----------------------
  await game('await SS.restart(); SS.seed(2026); await SS.seek(1500);');
  await instrument();
  await game('return SS.aimAndFire(0.30, 0.90);');
  await toContact();
  for (const t of [0, 120, 300, 500, 700, 900, 1200]) {
    if (t) await game('await SS.seek(args[0]);', t - (R.carnage.at(-1)?.t ?? 0));
    R.carnage.push({ t, ...(await fxLive()), ...(await game(`
      const w = SS.__world; const bm={}; for (const d of w.debris) bm[d.matName]=(bm[d.matName]||0)+1;
      return { debris:w.debris.length, byMat:bm, standing:w.blocks.filter(b=>!b.broken).length };`)) });
    await shot(`carnage-t${t}-GAMEFRAME`);
  }
  R.fractures = await game('return window.__log.fractures;');

  // ---- C. settled, overlay hidden -----------------------------------------------------
  for (let i = 0; i < 14; i++) { await game('await SS.seek(500);');
    const s = await state(); if (s.phase !== 'flying' && s.phase !== 'settling') break; }
  await game('await SS.seek(1500);');
  await game(`
    for (const el of document.querySelectorAll('body > *')) {
      if (el.tagName === 'CANVAS') continue;
      const t = (el.textContent || '');
      if (/Scammers busted|Play again|Replay/.test(t)) el.style.display = 'none';
    }
    return true;`);
  await shot('settled-overlayhidden-GAMEFRAME');
  await game('SS.camLock({ x: 18.4, y: 1.2, halfWidth: 4.4 }); await SS.seek(40);');
  await shot('settled-wreckA-LOCKED');
  await game('SS.camLock({ x: 22.6, y: 1.0, halfWidth: 3.4 }); await SS.seek(40);');
  await shot('settled-wreckB-LOCKED');
  await game('SS.camUnlock();');

  // ---- D. one material per probe level, with a shot that lands ------------------------
  for (const [lvl, mn] of [['_p3-wood','wood'], ['_p3-glass','glass'], ['_p3-stone','stone']]) {
    await game('await SS.loadLevel(args[0]); SS.seed(7); await SS.seek(900);', lvl);
    await instrument();
    await game('return SS.aimAndFire(0.22, 0.75);');
    const h = await toContact();
    const fx = [];
    await game('SS.camLock({ x: 18.0, y: 2.1, halfWidth: 3.0 });');
    await filmstrip(`${mn}-break-0to400-step50-LOCKED`, { from: 0, to: 400, step: 50, cols: 3 });
    // fx sampling on a clean re-run so the strip's seeks are not blamed
    await game('await SS.restart(); SS.seed(7); await SS.seek(900);');
    await instrument();
    await game('return SS.aimAndFire(0.22, 0.75);');
    await toContact();
    for (let t = 0; t <= 500; t += 25) { fx.push({ t, ...(await fxLive()) }); if (t < 500) await game('await SS.seek(25);'); }
    const spread = await game(`
      const w = SS.__world; const xs = w.debris.map(d=>d.body.translation().x);
      return { n: w.debris.length, spreadX: xs.length ? +(Math.max(...xs)-Math.min(...xs)).toFixed(2) : 0 };`);
    await game('await SS.seek(2500);');
    await game('SS.camLock({ x: 18.0, y: 1.6, halfWidth: 3.0 }); await SS.seek(30);');
    await shot(`${mn}-settled-LOCKED`);
    await game('SS.camLock({ x: 18.0, y: 0.65, halfWidth: 1.25 }); await SS.seek(30);');
    await shot(`${mn}-shardcrop-LOCKED`);
    await game('SS.camUnlock();');
    R.materials[mn] = { contact: h, fx, spread, fractures: await game('return window.__log.fractures;') };
  }

  await writeFile(path.join(OUT, 'P3-r6b-crit.json'), JSON.stringify(R, null, 2));
  console.log('contact', JSON.stringify(R.impact.contact));
};
