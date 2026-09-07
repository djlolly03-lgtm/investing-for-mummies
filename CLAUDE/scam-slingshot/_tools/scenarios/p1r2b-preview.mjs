/**
 * p1r2b-preview.mjs — does the dotted preview draw the shot the button fires?
 * The preview integrates its own copy of the launch; it used to bleed the kick off with an
 * exponential while the projectile used a smootherstep over solver steps, so the dots promised
 * an arc the shot could not fly. Compares each preview dot to the real projectile position at
 * the same tick.
 */
export default async ({ page, game }) => {
  const r = await page.evaluate(async () => {
    const SS = window.SS, w = SS.__world;
    await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1500);
    // The preview only exists once one ammo has been spent (it is EARNED), so spend one —
    // on a DELIBERATE MISS. (0.30, 0.80) is a one-shot clear, which leaves the level 'won',
    // no ammo loaded and no preview to compare.
    SS.aim({ angle: 0.60, power: 0.40 }); SS.release();
    for (let i = 0; i < 30; i++) { await SS.seek(400); if ((await SS.state()).phase === 'aiming') break; }
    SS.aim({ angle: 0.30, power: 0.80 });
    await SS.seek(200);
    const s = w.sling;
    const pts = s._previewPts.slice();          // [x,y, x,y, ...] every 5 solver steps
    if (!pts.length) return { error: 'no preview points — is it earned?' };
    SS.release();
    const real = [];
    for (let i = 0; i < pts.length / 2; i++) {
      for (let k = 0; k < 5; k++) SS.stepOnce();
      const p = w.projectiles.find(q => !q.dead && q.launched);
      if (!p) break;
      const t = p.body.translation();
      real.push([t.x, t.y]);
    }
    const err = real.map((rp, i) => Math.hypot(rp[0] - pts[i * 2], rp[1] - pts[i * 2 + 1]));
    return { dots: real.length, maxErr: +Math.max(...err).toFixed(4),
             errAtDot: err.map(e => +e.toFixed(3)) };
  });
  console.log('  preview-vs-shot:', JSON.stringify(r));
  if (r.error) throw new Error(r.error);
  if (r.maxErr > 0.30) throw new Error(`preview lies: max ${r.maxErr} world units off the real arc`);
  console.log('  RESULT: the dots draw the shot (max error ' + r.maxErr + ' world units)');
};
