/**
 * p3-r5b-cause.mjs — WHY does a shot break 9-12 of 17 blocks?
 *
 * Monkeypatches Block.prototype in page context to record, per fracture, which path killed
 * the block (projectile contact / neighbour contact / debris contact / structural shock /
 * load dump) and at what tick. Diagnostic only; nothing is written back to the game.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
if (!B.__patched) {
  B.__patched = true;
  const oi = B.onImpact, os = B.onShock, ofr = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    this.__last = { via: 'contact:' + (other?.tag ?? '?'), imp: +imp.toFixed(2), app: +(app||0).toFixed(2) };
    return oi.call(this, imp, other, pt, app);
  };
  B.onShock = function (d, ux, uy) {
    this.__last = { via: 'shock', dmg: +d.toFixed(2) };
    return os.call(this, d, ux, uy);
  };
  B.fracture = function (imp, pt) {
    if (!this.broken) {
      window.__breaks = window.__breaks || [];
      const t = this.body.translation();
      window.__breaks.push({ tick: SS.tick(), m: this.matName, x: +t.x.toFixed(2), y: +t.y.toFixed(2),
        w: this.w, h: this.h, dmg: +this.damage.toFixed(2),
        thr: +this.material.physics.breakImpulse.toFixed(2), last: this.__last ?? null });
    }
    return ofr.call(this, imp, pt);
  };
}
return true;`;

export default async ({ game }) => {
  for (const [ang, pow] of [[0.26, 0.95], [0.24, 0.92], [0.30, 0.90]]) {
    await game('return await SS.loadLevel("l1");');
    await game('return SS.seed(4242);');
    await game('await SS.seek(1500);');
    await game(INSTRUMENT);
    await game('window.__breaks = [];');
    const t0 = await game('return SS.tick();');
    await game('return SS.aimAndFire(args[0],args[1]);', ang, pow);
    await game('await SS.seek(6000);');
    const breaks = await game('return window.__breaks;');
    const st = await game('const s=SS.__structure(); return {queue:s.queue,collapses:s.collapses,joints:s.joints,tips:s.tips,hinges:s.hinges,loads:s.loads,hops:s.hops};');
    console.log(`\n=== SHOT ${ang}@${pow}  breaks=${breaks.length}/17  structure=${JSON.stringify(st)}`);
    for (const b of breaks) {
      console.log(`  t+${((b.tick - t0) / 120 * 1000).toFixed(0).padStart(5)}ms  ${b.m.padEnd(5)} ` +
        `(${b.x},${b.y}) ${b.w}x${b.h}  dmg=${b.dmg}/${b.thr}  via=${JSON.stringify(b.last)}`);
    }
  }
};
