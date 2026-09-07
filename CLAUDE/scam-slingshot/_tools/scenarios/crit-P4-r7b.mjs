/**
 * crit-P4-r7b.mjs — P4 r7 critic, probe 2.
 *  (a) per-solver-step camera trace across release -> impact -> settle, with the ball, so shake
 *      amplitude can be detrended and expressed in %H;
 *  (b) the drag pull-back RETURN (drag, let the spring arrive, release, watch the width come back);
 *  (c) first ammo contact recorded on `window` so it survives a world rebuild.
 */
const PRE = `
  const W = SS.__world, cam = W.camera;
  const V3 = cam.position.constructor;
  const proj = (x, y) => { const v = new V3(x, y, 0).project(cam);
    return { w: (v.x * .5 + .5) * 100, h: (1 - (v.y * .5 + .5)) * 100 }; };
  const vh = () => 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z;
  const vw = () => vh() * cam.aspect;
  const ball = () => { const p = (W.projectiles||[]).find(p=>p && p.body && !p.dead); if(!p) return null;
    const t = p.body.translation(); return [t.x, t.y]; };
`;
const SHOT_A = 0.30, SHOT_P = 0.90;

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const g = (body, ...a) => game(PRE + body, ...a);
  const R = {};
  const reset = async () => { await game('SS.freeze(); await SS.restart(); SS.seed(11); await SS.seek(2500);'); };

  await game('SS.freeze(); await SS.loadLevel("l1"); SS.seed(11); await SS.seek(2500);');

  // ---- a global first-contact recorder that survives restart() -------------
  await g(`
    window.__hitT = null;
    const B = W.blocks[0] && W.blocks[0].constructor;
    if (B && !B.__p4r7b) {
      const o = B.prototype.onImpact;
      B.prototype.onImpact = function (info) {
        if (window.__hitT === null && info && (info.tag === 'ammo' || info.src === 'ammo' ||
            (info.other && String(info.other.tag).includes('ammo')))) window.__hitT = SS.__world.simTime;
        return o.apply(this, arguments);
      };
      B.__p4r7b = true;
    }
    return !!B;
  `);

  // ================= (a) per-step trace, release -> +4 s ====================
  await reset();
  await dragShot(SHOT_A, SHOT_P, { steps: 10 });
  await game('await SS.seek(650);');              // let the drag pull-back arrive, like a human
  R.drawnVw = await g('return vw();');
  await g('window.__hitT = null; return true;');
  const rel = await game('return SS.release();');
  R.rel = rel;
  R.trace = await g(`
    const t0 = W.simTime, rows = [];
    for (let i = 0; i < 620; i++) {
      const b = ball();
      rows.push([ +(W.simTime - t0).toFixed(5), cam.position.x, cam.position.y, cam.position.z,
                  vw(), vh(), b ? b[0] : null, b ? b[1] : null,
                  b ? proj(b[0], b[1]).w : null, W.debris.length,
                  window.__hitT === null ? null : +(window.__hitT - t0).toFixed(4) ]);
      SS.stepOnce();
    }
    return rows;
  `);
  R.hitT = await g('return window.__hitT;');

  // ================= (b) pull-back return ==================================
  await reset();
  const rest = await g('return vw();');
  await dragShot(SHOT_A, 1.0, { steps: 10 });
  await game('await SS.seek(700);');
  const drawn = await g('return vw();');
  const back = await g(`
    const rows = [];
    SS.release();
    for (let i = 0; i < 200; i++) { rows.push([ +(i/120*1000).toFixed(1), vw(), cam.position.x ]); SS.stepOnce(); }
    return rows;
  `);
  R.pullReturn = { rest, drawn, growthPct: 100 * (drawn / rest - 1), back };

  await fs.writeFile(path.join(OUT, 'P4b.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify({ hitT: R.hitT, drawnVw: R.drawnVw,
    rest: +rest.toFixed(3), drawn: +drawn.toFixed(3), growthPct: +R.pullReturn.growthPct.toFixed(2) }, null, 2));
};
