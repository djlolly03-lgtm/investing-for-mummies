/** crit-P1-r7b.mjs — burst-pinning, camera-kick and muzzle-cut probes for P1 r7. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const out = { shots: [] };

  const setup = async () => {
    await game('SS.audioMute(true); return SS.seed(7);');
    await game('await SS.seek(700);');
  };

  for (const power of [0.35, 0.6, 1.0]) {
    await setup();
    await dragShot(0.30, power, { steps: 12 });
    await game('await SS.seek(250);');
    const pre = await game(`
      const w = SS.__world, s = w.sling, cam = w.camera;
      const el = w.renderer.domElement, r = el.getBoundingClientRect();
      const V3 = cam.position.constructor;
      const P = (x,y)=>{const v=new V3(x,y,0).project(cam);
        return {x:(v.x*0.5+0.5)*r.width, y:(-v.y*0.5+0.5)*r.height};};
      return { pouch: {x:s.pouch.x,y:s.pouch.y}, pouchPx: P(s.pouch.x,s.pouch.y),
               anchor: {x:s.anchor.x,y:s.anchor.y}, ad: s.ammoDiameter(), adFx: s.ammoSpan(),
               vw: r.width, vh: r.height };
    `);
    const rel = await game('return SS.release();');
    const rows = await game(`
      const w = SS.__world, s = w.sling, cam = w.camera;
      const el = w.renderer.domElement, r = el.getBoundingClientRect();
      const V3 = cam.position.constructor;
      const P = (x,y)=>{const v=new V3(x,y,0).project(cam);
        return {x:(v.x*0.5+0.5)*r.width, y:(-v.y*0.5+0.5)*r.height};};
      const P0 = args[0], AD = args[1], ang = args[2];
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const rows = [];
      const sample = (i) => {
        const pr = w.projectiles?.length ? w.projectiles[w.projectiles.length-1] : null;
        const ax = pr?.mesh?.position.x ?? NaN, ay = pr?.mesh?.position.y ?? NaN;
        let near = 0, nearAmmo = 0, tot = 0, along = [], perp = [];
        for (const key of ['spark4','flash']) {
          const pool = w.fx?.pools?.[key]; if (!pool) continue;
          const p = pool.p;
          for (let k = 0; k < pool.max; k++) {
            if (p.life[k] <= 0) continue;
            tot++;
            const dx = p.x[k]-P0.x, dy = p.y[k]-P0.y;
            const d = Math.hypot(dx,dy)/AD;
            if (d <= 1.5) near++;
            if (Math.hypot(p.x[k]-ax, p.y[k]-ay)/AD <= 1.5) nearAmmo++;
            along.push((dx*dir.x + dy*dir.y)/AD);
            perp.push(Math.abs(-dx*dir.y + dy*dir.x)/AD);
          }
        }
        const med = (a)=>{ if(!a.length) return null; const b=[...a].sort((x,y)=>x-y);
          return +b[Math.floor(b.length/2)].toFixed(3); };
        const q = (a,f)=>{ if(!a.length) return null; const b=[...a].sort((x,y)=>x-y);
          return +b[Math.min(b.length-1, Math.floor(b.length*f))].toFixed(3); };
        const ppx = P(ax, ay);
        rows.push({ t:+(i*1000/120).toFixed(1), n: tot, nearPouch: near, nearAmmo,
          alongMed: med(along), along10: q(along,0.10), along90: q(along,0.90),
          perpMed: med(perp), perp90: q(perp,0.90),
          ammo: { x:+ax.toFixed(3), y:+ay.toFixed(3) },
          ammoPx: { x:+ppx.x.toFixed(1), y:+ppx.y.toFixed(1) },
          onScreen: ppx.x >= 0 && ppx.x <= r.width && ppx.y >= 0 && ppx.y <= r.height,
          shake: +(w.rig?.shake ?? -1).toFixed(5),
          pouchOff: +(((s.pouch.x-s.anchor.x)*dir.x + (s.pouch.y-s.anchor.y)*dir.y)).toFixed(5),
        });
      };
      sample(0);
      for (let i=1;i<=48;i++){ SS.stepOnce(); sample(i); }
      return rows;
    `, pre.pouch, pre.ad, rel.angle);

    // where does this shot actually land / first touch something?
    const land = await game(`
      const w = SS.__world;
      let hit = null;
      const t0 = w.simTime;
      for (let i=0;i<900 && !hit;i++){
        SS.stepOnce();
        const pr = w.projectiles?.length ? w.projectiles[w.projectiles.length-1] : null;
        if (!pr || pr.dead) { hit = { reason: 'gone', t: w.simTime - t0 }; break; }
        if (pr.mesh.position.y < 1.2) hit = { reason:'ground', x:+pr.mesh.position.x.toFixed(2),
                                              t:+((w.simTime-t0)*1000).toFixed(0) };
        if ((w.debris?.length ?? 0) > 0) hit = { reason:'impact', x:+pr.mesh.position.x.toFixed(2),
                                              t:+((w.simTime-t0)*1000).toFixed(0) };
      }
      return hit;
    `);
    out.shots.push({ power, pre, rel, rows, land });
  }

  // one filmstrip zoomed on the SLING ONLY, unlocked framing, to see the fan at the pouch
  await setup();
  await dragShot(0.30, 1.0, { steps: 12 });
  await game('await SS.seek(250);');
  await game('return SS.release();');
  await game(`const s = SS.__world.sling;
    return SS.camLock({ x: s.anchor.x - 0.4, y: s.anchor.y - 0.2, halfWidth: 3.2 });`);
  await filmstrip('fan-at-pouch-LOCKED', { from: 0, to: 200, step: 25, cols: 3 });
  await game('return SS.camUnlock();');

  await writeFile(path.join(OUT, 'p1r7b.json'), JSON.stringify(out, null, 2));
  console.log('WROTE p1r7b.json');
};
