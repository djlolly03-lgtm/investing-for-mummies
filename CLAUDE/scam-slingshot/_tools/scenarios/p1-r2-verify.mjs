/**
 * p1-r2-verify.mjs — BUILDER verification for P1 round 2 (the hard cut).
 *
 * The release filmstrip has to be shot through `SS.camLock()`. Not to flatter anything: the
 * game camera pushes in and pans during the first 300 ms (that is P4's job and it is correct),
 * so an unlocked contact sheet rescales the world between tiles and you cannot tell how far
 * the ammo moved from how far it moved ON SCREEN. Locked framing is byte-identical in every
 * tile, so tile-to-tile displacement is the real thing. The unlocked strip is shot too, right
 * after, because composition is only honest at the game's own framing.
 *
 * Everything numeric is in AD (the loaded ammo's on-screen height at rest in the pouch),
 * measured in world units so the camera cannot flatter or penalise it.
 */
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);

const PRELUDE = `
const w = SS.__world;
const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM = (m, p) => {
  const e = m.elements;
  const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
  return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
          (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
          (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];
};
const proj = (x,y,z) => {
  let p = applyM(cam.matrixWorldInverse,[x,y,z]);
  p = applyM(cam.projectionMatrix,p);
  return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH];
};
const bboxWorldH = (obj) => {
  let y0=1e9,y1=-1e9,m=0;
  obj.updateWorldMatrix(true,true);
  obj.traverse(o => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox; if (!b) return;
    m++;
    for (const cx of [b.min.x,b.max.x]) for (const cy of [b.min.y,b.max.y]) for (const cz of [b.min.z,b.max.z]) {
      const wp = applyM(o.matrixWorld,[cx,cy,cz]);
      if(wp[1]<y0)y0=wp[1]; if(wp[1]>y1)y1=wp[1];
    }
  });
  return m ? y1-y0 : null;
};
/** every live launch-burst particle's world position, straight off the fx instance arrays */
const burstPoints = () => {
  const fx = w.fx; if (!fx || !fx.pools) return null;
  const out = [];
  for (const key of ['chip','flash','spark4']) {
    const pool = fx.pools[key];
    if (!pool || !pool.p) continue;
    const P = pool.p;
    for (let i=0;i<pool.max;i++) if (P.life[i] > 0) out.push([P.x[i], P.y[i]]);
  }
  return out;
};
const trailDots = () => {
  const t = w.trail;
  if (!t) return null;
  const m = cam.matrixWorld.clone();
  const pts = [];
  for (let i=0;i<t.dotCount;i++) {
    t.dots.getMatrixAt(i, m);
    pts.push([+m.elements[12].toFixed(4), +m.elements[13].toFixed(4)]);
  }
  return pts;
};
`;

export default async function ({ page, shot, filmstrip, game, OUT }) {
  const G = (b, ...a) =>
    page.evaluate(new Function('...args', `const SS = window.SS; ${PRELUDE} return (async()=>{${b}})();`), ...a);
  const out = {};
  const say = (k, v) => { out[k] = v; console.log('  ' + k + ' = ' + JSON.stringify(v)); };

  /* ---- AD, measured on the loaded ammo at rest ---------------------------- */
  await game('SS.seed(7); await SS.seek(2000);');
  const AD = await G(`return +bboxWorldH(w.sling.ammo.mesh).toFixed(5);`);
  say('AD_world_units', AD);

  /* ---- the criterion, tile by tile, in world units ------------------------ */
  await game('SS.seed(7); await SS.seek(2000);');
  const strip = await G(`
    const AD = args[0];
    const s = w.sling;
    await SS.aim({ angle: 0.60, power: 1.0 });
    await SS.seek(500);
    const rel = await SS.release();
    const rows = [];
    for (let t = 0; t <= 200; t += 20) {
      const p = w.projectiles.find(q => !q.dead && q.launched);
      const tr = p.body.translation();
      const d = Math.hypot(tr.x - s.pouch.x, tr.y - s.pouch.y);
      const bp = burstPoints();
      let bx = 0, by = 0, spread = 0;
      if (bp && bp.length) {
        for (const q of bp) { bx += q[0]; by += q[1]; }
        bx /= bp.length; by /= bp.length;
        for (const q of bp) spread = Math.max(spread, Math.hypot(q[0]-bx, q[1]-by));
      }
      rows.push({
        t,
        AD: +(d / AD).toFixed(2),
        distWorld: +d.toFixed(3),
        pouchOffsetAlongAxis: +((s.pouch.x - s.anchor.x) * Math.cos(0.6) +
                                (s.pouch.y - s.anchor.y) * Math.sin(0.6)).toFixed(4),
        burstN: bp ? bp.length : null,
        burstFromPouch_AD: bp && bp.length ? +(Math.hypot(bx-s.anchor.x, by-s.anchor.y)/AD).toFixed(2) : null,
        burstSpread_AD: bp && bp.length ? +(spread/AD).toFixed(2) : null,
        ammoFromBurstCentre_AD: bp && bp.length ? +(Math.hypot(tr.x-bx, tr.y-by)/AD).toFixed(2) : null,
      });
      if (t < 200) await SS.seek(20);
    }
    return { rel, rows };
  `, AD);
  say('release_info', strip.rel);
  console.log('  t(ms)   AD-clear   burstN  burstFromPouch(AD)  ammo-from-burst(AD)');
  for (const r of strip.rows) {
    console.log(`   ${String(r.t).padStart(3)}     ${String(r.AD).padStart(6)}    ` +
      `${String(r.burstN).padStart(4)}      ${String(r.burstFromPouch_AD).padStart(5)}` +
      `               ${String(r.ammoFromBurstCentre_AD).padStart(5)}`);
  }
  out.rows = strip.rows;

  /* ---- band recoil: overshoot count and settle time ----------------------- */
  await game('SS.seed(7); await SS.seek(2000);');
  const recoil = await G(`
    const s = w.sling;
    await SS.aim({ angle: 0.60, power: 1.0 });
    await SS.seek(500);
    await SS.release();
    const off = [];
    for (let t = 0; t <= 460; t += 10) {
      off.push([t, +((s.pouch.x - s.anchor.x) * Math.cos(0.6) +
                     (s.pouch.y - s.anchor.y) * Math.sin(0.6)).toFixed(5)]);
      await SS.seek(10);
    }
    let signs = 0, prev = Math.sign(off[0][1]);
    for (const [t,v] of off) { const g = Math.sign(v); if (g && g !== prev) { signs++; prev = g; } }
    const tail = off.filter(o => o[0] >= 400).map(o => Math.abs(o[1]));
    return { firstOffset: off[0][1], crossings: signs, maxAfter400: +Math.max(...tail).toFixed(5), off };
  `);
  say('band_recoil', { firstOffset: recoil.firstOffset, crossings: recoil.crossings, maxAfter400: recoil.maxAfter400 });

  /* ---- trail anchoring (P2 cross-check, since the muzzle moved) ----------- */
  await game('SS.seed(7); await SS.seek(2000);');
  const trail = await G(`
    const AD = args[0];
    const s = w.sling;
    await SS.aim({ angle: 0.60, power: 1.0 });
    await SS.seek(500);
    const anchor = { x: s.anchor.x, y: s.anchor.y };
    await SS.release();
    await SS.seek(600);
    const pts = trailDots();
    const gaps = [];
    for (let i=1;i<pts.length;i++) gaps.push(+(Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1])/AD).toFixed(2));
    return {
      dots: pts.length,
      firstDotFromAnchor_AD: +(Math.hypot(pts[0][0]-anchor.x, pts[0][1]-anchor.y)/AD).toFixed(2),
      gaps_AD: gaps.slice(0, 10),
    };
  `, AD);
  say('trail', trail);

  /* ---- preview honesty: does the dotted arc predict the real shot? -------- */
  await game('SS.seed(7); await SS.seek(2000);');
  const preview = await G(`
    const s = w.sling;
    // burn one ammo so the preview is EARNED, then aim the same shot again
    await SS.aim({ angle: 0.30, power: 0.55 }); await SS.release();
    for (let i=0;i<80 && (await SS.state()).phase !== 'aiming'; i++) await SS.seek(100);
    await SS.aim({ angle: 0.60, power: 1.0 });
    await SS.seek(200);
    const pts = s._previewPts.slice();
    // Track THIS projectile by identity. w.projectiles still holds the spent first shot for
    // a couple of seconds, and find(launched && !dead) happily returns that one instead.
    const shotObj = s.ammo;
    const rel = await SS.release();
    const real = [], err = [];
    for (let i=0;i<pts.length/2;i++) {
      await SS.seek(1000/24);            // 5 solver steps = one preview dot
      if (shotObj.dead || shotObj.hasHit) break;
      const t = shotObj.body.translation();
      real.push([+t.x.toFixed(3), +t.y.toFixed(3)]);
      err.push(+Math.hypot(pts[i*2]-t.x, pts[i*2+1]-t.y).toFixed(3));
    }
    return { dots: pts.length/2, compared: real.length, muzzleClamped: rel.muzzleClamped,
             worstErrWorld: err.length ? Math.max(...err) : null, err,
             firstPreviewDot: [+pts[0].toFixed(3), +pts[1].toFixed(3)],
             muzzle: rel.muzzle };
  `);
  say('preview_vs_real', preview);

  /* ---- the preview as drawn, mid-drag ------------------------------------- */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`
    const s = w.sling;
    await SS.aim({ angle: 0.30, power: 0.55 }); await SS.release();
    for (let i=0;i<80 && (await SS.state()).phase !== 'aiming'; i++) await SS.seek(100);
    await SS.aim({ angle: 0.60, power: 1.0 });
    await SS.seek(300);
    return 1;`);
  await shot('preview-earned-full-draw');

  /* ---- LOCKED filmstrip: the criterion, judged by eye --------------------- */
  /**
   * camLock() alone is not enough here: `release()` hands the camera a real intent (follow),
   * which is exactly what the lock is documented to yield to. So the lock is re-applied and
   * a single no-step render is forced immediately before every tile. The world clock still
   * only ever advances through seek(), so the strip is as deterministic as any other.
   */
  const lockedStrip = async (name, { from = 0, to = 180, step = 20, cols = 5, box }) => {
    const tmp = path.join(OUT, `.lock-${name}`);
    await mkdir(tmp, { recursive: true });
    let i = 0, t = from;
    if (from > 0) await game('await SS.seek(args[0]);', from);
    while (t <= to) {
      await page.evaluate((txt) => {
        let el = document.getElementById('__strip_label');
        if (!el) {
          el = document.createElement('div');
          el.id = '__strip_label';
          el.style.cssText = 'position:fixed;left:14px;top:12px;z-index:2147483647;pointer-events:none;' +
            'font:700 24px/1.25 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.68);' +
            'padding:5px 12px;border-radius:9px;letter-spacing:.5px';
          document.body.appendChild(el);
        }
        el.textContent = txt;
      }, `t=${t}ms`);
      await game('SS.camLock(args[0]); SS.__render();', box);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`) });
      i++; t += step;
      if (t <= to) await game('await SS.seek(args[0]);', step);
    }
    await page.evaluate(() => document.getElementById('__strip_label')?.remove());
    const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f)).sort();
    const rows = Math.ceil(files.length / cols);
    const outFile = path.join(OUT, `LOCKED-${name}.png`);
    await exec('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob',
      '-i', path.join(tmp, 'f*.png'), '-filter_complex',
      `scale=640:-1,tile=${cols}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', outFile]);
    await rm(tmp, { recursive: true, force: true });
    console.log('  locked strip -> ' + outFile);
    return outFile;
  };

  const BOX = { x: 6.0, y: 6.2, halfWidth: 9.5 };
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({ angle: 0.60, power: 1.0 }); await SS.seek(500); await SS.release(); return 1;`);
  await lockedStrip('release-20ms', { from: 0, to: 180, step: 20, cols: 5, box: BOX });
  await game('SS.camUnlock();');

  /* the moment before, for a like-for-like read of "loaded" vs "gone" */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({ angle: 0.60, power: 1.0 }); await SS.seek(500); return 1;`);
  await game('SS.camLock(args[0]); SS.__render();', BOX);
  await shot('locked-aim-full-draw');
  await game('SS.camUnlock();');

  /* ---- the same release at the game's own framing ------------------------- */
  await game('SS.seed(7); await SS.seek(2000);');
  await G(`await SS.aim({angle:0.60, power:1.0}); await SS.seek(500); await SS.release(); return 1;`);
  await filmstrip('release-gameframe-20ms', { from: 0, to: 180, step: 20, cols: 5 });

  await writeFile(path.join(OUT, 'verify.json'), JSON.stringify(out, null, 2));
}
