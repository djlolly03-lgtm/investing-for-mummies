/**
 * p1-r5-verify.mjs — does the new dark plume break anything P1 already had?
 *
 * The r5 change adds a dark layer AT the sling, in the frames where the band's recoil is the
 * thing the rubric wants to see. So this checks the three properties that could regress:
 *   · the release is still a hard CUT (ammo >= 8 AD clear at t = +50 ms)
 *   · the burst still LIVES AT THE SLING and clears (fan half-width >= 2x by +80 ms,
 *     nothing alive by ~200 ms) — including the two new pools
 *   · the band still shows >= 2 overshoots and is still by 400 ms, IN CLEAR AIR: the last
 *     tile that still contains any launch particle must come before the first extremum the
 *     critic reads.
 *
 * Plus a fork-region crop strip, which is the only way to see whether the plume is sitting on
 * top of the recoil.
 */
import path from 'node:path';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

export default async ({ page, game, filmstrip, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');

  const res = await game(`
    const w = SS.__world, s = w.sling;
    const anchor = { x: s.anchor.x, y: s.anchor.y };
    const info = await SS.release();
    const AD = info.ad;
    const ax = Math.cos(info.angle), ay = Math.sin(info.angle);
    const POOLS = ['spark4', 'flash', 'blast', 'chip'];
    const out = { info, AD, s: [] };
    /**
     * ── THE LADDER MUST BE A WHOLE NUMBER OF SOLVER STEPS ────────────────────────
     * This sampled with SS.seek(10) for 51 rungs and called the rungs 0…500 ms. SS.seek runs
     * round(ms/1000/FIXED) steps, and FIXED is 1/120 s = 8.333 ms, so round(1.2) = 1: every
     * rung advanced 8.333 ms while being LABELLED 10, and the whole time axis ran 17 % short.
     * Its "t = 400" was really 333 ms of simulation, which is why recoil_still_by_400 read
     * false for a band that is measurably at rest — offset exactly 0.000 — from 400 ms
     * onward (probe: _tools/scenarios/p1-r6-recoil.mjs, which seeks in one hop per rung).
     * One step per rung is exact by construction, so the labels are now the truth.
     */
    const STEP = 1000 / 120;
    let t = 0;
    for (let i = 0; i <= 60; i++) {
      const rows = [];
      for (const key of POOLS) {
        const pool = w.fx.pools[key]; if (!pool) continue;
        const P = pool.p;
        for (let j = 0; j < pool.max; j++) {
          if (P.life[j] <= 0) continue;
          const dx = P.x[j] - anchor.x, dy = P.y[j] - anchor.y;
          rows.push({ k: key, a: (dx*ax + dy*ay)/AD, p: (dx*-ay + dy*ax)/AD });
        }
      }
      const near = rows.filter(r => Math.hypot(r.a, r.p) <= 3.2);
      const perp = near.map(r => Math.abs(r.p)).sort((a,b)=>a-b);
      const q = (arr,f) => arr.length ? arr[Math.min(arr.length-1, Math.floor(arr.length*f))] : null;
      const p0 = w.projectiles && w.projectiles[0];
      const px = p0 ? p0.body.translation() : null;
      // Band pouch offset along the shot axis, in AD: the recoil signal.
      const po = ((s.pouch.x - anchor.x)*ax + (s.pouch.y - anchor.y)*ay) / AD;
      out.s.push({ t: Math.round(t), n: rows.length,
        byPool: POOLS.map(k => rows.filter(r => r.k === k).length),
        fanNear: perp.length ? +q(perp, 0.999).toFixed(3) : null,
        ammoAD: px ? +(((px.x-anchor.x)*ax + (px.y-anchor.y)*ay)/AD).toFixed(2) : null,
        pouchAD: +po.toFixed(4) });
      await SS.seek(STEP); t += STEP;
    }
    return out;`);

  // Rungs land on multiples of 8.333 ms, so ask for the NEAREST rung to the time the
  // criterion names and report the rung's real time rather than pretending it is exact.
  const at = (t) => res.s.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, res.s[0]);
  say('release', { ad: res.info.ad, muzzleAD: res.info.muzzleAD, exitSpeed: res.info.exitSpeed });
  say('cut', { ammo_t0: at(0).ammoAD, ammo_t50: at(50).ammoAD, t50_real: at(50).t,
               need: '>=8 AD at t=50' });
  say('burst_life', [0,40,80,120,160,180,200,250].map(at)
      .map(x => ({ t: x.t, n: x.n, pools: x.byPool, fanNear: x.fanNear })));
  say('fan_growth_0_80', at(0).fanNear && at(80).fanNear
      ? { ratio: +(at(80).fanNear / at(0).fanNear).toFixed(2),
          from: at(0).fanNear, to: at(80).fanNear, atMs: +at(80).t.toFixed(1) } : null);
  const lastAlive = [...res.s].reverse().find(x => x.n > 0);
  say('last_particle_ms', lastAlive ? lastAlive.t : 0);

  // Band recoil extrema, from the pouch offset series.
  const ext = [];
  for (let i = 1; i < res.s.length - 1; i++) {
    const a = res.s[i-1].pouchAD, b = res.s[i].pouchAD, c = res.s[i+1].pouchAD;
    if ((b - a) * (c - b) < 0 && Math.abs(b) > 0.004) ext.push({ t: res.s[i].t, v: +b.toFixed(4) });
  }
  say('recoil_extrema', ext.slice(0, 8));
  say('recoil_still_by_400', res.s.filter(x => x.t >= 400)
      .every(x => Math.abs(x.pouchAD - res.s[res.s.length-1].pouchAD) < 0.006));
  say('clear_air', { lastParticle: lastAlive ? lastAlive.t : 0,
                     extremaAfter: ext.filter(e => e.t > (lastAlive ? lastAlive.t : 0)).length });

  // --- pictures -------------------------------------------------------------
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release();');
  await filmstrip('release-wide', { from: 0, to: 480, step: 60, cols: 3 });

  // fork crop strip — the only way to see whether the plume sits on the recoil
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release();');
  const clip = await game(`
    const w = SS.__world, cam = w.camera, s = w.sling, VW = innerWidth, VH = innerHeight;
    const applyM = (m,p) => { const e = m.elements;
      const iw = 1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,
              (e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,
              (e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw]; };
    const proj = (x,y) => { let p = applyM(cam.matrixWorldInverse,[x,y,0]);
      p = applyM(cam.projectionMatrix,p); return [(p[0]*0.5+0.5)*VW, (-p[1]*0.5+0.5)*VH]; };
    const a = proj(s.anchor.x, s.anchor.y);
    return { x: Math.max(0, Math.round(a[0]-170)), y: Math.max(0, Math.round(a[1]-230)),
             width: 400, height: 380 };`);
  const tmp = path.join(OUT, '.forkstrip');
  await mkdir(tmp, { recursive: true });
  let i = 0;
  for (let t = 0; t <= 450; t += 30) {
    await page.evaluate((tt) => {
      let el = document.getElementById('__strip_label');
      if (!el) { el = document.createElement('div'); el.id = '__strip_label';
        el.style.cssText = 'position:fixed;left:8px;top:6px;z-index:2147483647;pointer-events:none;' +
          'font:700 20px/1.2 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.7);' +
          'padding:3px 8px;border-radius:6px'; document.body.appendChild(el); }
      el.textContent = 't=' + tt + 'ms';
    }, t);
    await page.screenshot({ path: path.join(tmp, `f${String(i++).padStart(3,'0')}.png`), clip });
    if (t < 450) await game('await SS.seek(30);');
  }
  await page.evaluate(() => document.getElementById('__strip_label')?.remove());
  const files = (await readdir(tmp)).filter(f => /^f\d+\.png$/.test(f));
  await exec('ffmpeg', ['-y','-loglevel','error','-pattern_type','glob','-i',
    path.join(tmp,'f*.png'), '-filter_complex',
    `scale=340:-1,tile=4x${Math.ceil(files.length/4)}:padding=6:color=0x111111`,
    '-frames:v','1', path.join(OUT, '99-fork-recoil-FILMSTRIP.png')]);
  await rm(tmp, { recursive: true, force: true });
  console.log('### DONE');
};
