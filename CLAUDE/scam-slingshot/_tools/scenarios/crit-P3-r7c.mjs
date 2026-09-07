/**
 * crit-P3-r7c.mjs — IS THE HOT STAR EVER INSIDE THE SMOKE BALL?
 *
 * P3's rubric sentence is one object, not two: "The moment of impact is ONE dark grey smoke
 * ball with a SINGLE yellow-orange star flash AT ITS CENTRE at the contact point."
 * The reference frame (impact-burst-tower-splitting_03) shows the star occupying 0.36 of the
 * ball's width, burning inside it.
 *
 * Pixels are a poor instrument for this on a stone level (stone blocks are grey too), so this
 * reads the particle systems directly: for every solver tick after a stone break it reports
 * the widest live smoke sprite and the widest live star flash, in WORLD UNITS, and whether
 * they are co-visible at readable size at any single instant.
 *
 * Flash particles are identified by max-life == 0.11 (fx.flash sets that literal); glint and
 * spark share the same pool with different lives, and must not be counted as the star.
 */

const SAMPLE = `
const P = SS.__world.fx.pools;
const rd = (pool, pick) => { const p = pool.p; let n = 0, w = 0, sum = 0;
  for (let i = 0; i < pool.max; i++) {
    if (p.life[i] <= 0) continue;
    if (pick && !pick(p, i)) continue;
    n++; const s = Math.max(p.sx[i], p.sy[i]); sum += s; if (s > w) w = s; }
  return { n, wMax: +w.toFixed(3), wMean: +(n ? sum / n : 0).toFixed(3) }; };
const star  = rd(P.flash, (p, i) => Math.abs(p.max[i] - 0.11) < 1e-6);
const other = rd(P.flash, (p, i) => Math.abs(p.max[i] - 0.11) >= 1e-6);
const smoke = rd(P.smoke);
return { star, other, smoke };`;

const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__F = [];
if (!B.__critC) { B.__critC = true; const of = B.fracture;
  B.fracture = function (i, p) { const k = of.call(this, i, p);
    window.__F.push({ mat: this.matName }); return k; }; }
return true;`;

export default async ({ game, state }) => {
  const L = (...a) => console.log(...a);

  for (const [lvl, mat, ang, pow] of [['_p3-stone','stone',0.16,0.88], ['l1','l1-mixed',0.22,0.96]]) {
    await game('return SS.freeze();');
    await game('return await SS.loadLevel(args[0]);', lvl);
    await game('return SS.seed(args[0]);', 777);
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__F = []; return true;');
    const r = await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    if (!r.ok) { L(`${mat}: fire failed ${r.reason}`); continue; }
    let t = 0;
    while (t < 6000) { await game('await SS.seek(8.333);'); t += 8.333;
      if (await game('return window.__F.length;')) break; }
    L(`\n===== ${mat}: first fracture at fire+${Math.round(t)} ms =====`);
    L(` t(ms)  STAR n  wMax(m) |  SMOKE n  wMax(m)   wMean | star/smoke width`);
    let best = { ratio: 0, ms: -1 }, peakSmoke = { w: 0, ms: -1 };
    for (let k = 0; k <= 60; k++) {
      const s = await game(SAMPLE);
      const ms = Math.round(k * 8.333);
      const ratio = s.smoke.wMax ? s.star.wMax / s.smoke.wMax : 0;
      const co = s.star.n > 0 && s.smoke.n > 0 ? ratio : 0;
      if (co > best.ratio) best = { ratio: co, ms, star: s.star.wMax, smoke: s.smoke.wMax };
      if (s.smoke.wMax > peakSmoke.w) peakSmoke = { w: s.smoke.wMax, ms, starN: s.star.n, starW: s.star.wMax };
      if (k % 3 === 0 || (s.star.n && s.smoke.n))
        L(`${String(ms).padStart(6)} ${String(s.star.n).padStart(7)} ${String(s.star.wMax).padStart(8)} | ` +
          `${String(s.smoke.n).padStart(8)} ${String(s.smoke.wMax).padStart(8)} ${String(s.smoke.wMean).padStart(7)} | ` +
          `${co ? co.toFixed(2) : '-- not co-visible'}`);
      await game('await SS.seek(8.333);');
    }
    L(`  BEST co-visible star/smoke width ratio: ${best.ratio.toFixed(2)} at +${best.ms} ms` +
      (best.star ? `  (star ${best.star} m inside smoke ${best.smoke} m)` : ''));
    L(`  SMOKE peak width ${peakSmoke.w} m at +${peakSmoke.ms} ms — star particles alive then: ${peakSmoke.starN} (w ${peakSmoke.starW} m)`);
    L(`  REFERENCE (impact-burst-tower-splitting_03, measured in pixels): star/ball width = 0.36`);
  }
};
