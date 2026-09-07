/** crit-P4-r5b — fine-grained flight lead + true first-contact time + return-after-release. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, OUT }) => {
  const out = {};
  // instrument real ammo->block contact
  await game(`
    window.__firstHit = null;
    const w = SS.__world;
    for (const b of w.blocks) {
      if (b.__p4wrapped) continue; b.__p4wrapped = true;
      const orig = b.onImpact ? b.onImpact.bind(b) : null;
      b.onImpact = function (imp, other) {
        if (window.__firstHit === null && other && (other.tag === 'ammo' || other.kind === 'ammo' || (other.constructor && /Ammo/i.test(other.constructor.name)))) {
          window.__firstHit = w.simTime;
        }
        return orig ? orig(imp, other) : undefined;
      };
    }
    return true;
  `);

  await game('SS.seed(1); await SS.seek(2000);');
  // re-wrap after rebuild
  await game(`
    window.__firstHit = null; const w = SS.__world;
    for (const b of w.blocks) { const orig = b.onImpact ? b.onImpact.bind(b) : null;
      b.onImpact = function (imp, other) {
        if (window.__firstHit === null) {
          const n = other && (other.constructor ? other.constructor.name : '');
          if (/ammo|sip|projectile/i.test(String(other && (other.tag||other.kind||n)))) window.__firstHit = w.simTime;
        }
        return orig ? orig(imp, other) : undefined; }; }
    return true;`);

  await game('SS.aim({angle:0.30, power:0.90}); await SS.seek(300);');
  const t0 = await game('return SS.__world.simTime;');
  await game('return SS.release();');

  const MEAS = `
    const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
    const V3 = cam.position.constructor;
    const p2s = (x,y) => { const v = new V3(x,y,0).project(cam);
      return { pw:(v.x*0.5+0.5)*100, ph:(-v.y*0.5+0.5)*100 }; };
    const s2w = (px,py) => { const v = new V3((px/r.width)*2-1, -((py/r.height)*2-1), 0.5).unproject(cam);
      const d = v.sub(cam.position).normalize(); const t = -cam.position.z/d.z;
      return { x: cam.position.x + d.x*t, y: cam.position.y + d.y*t }; };
  `;
  const rows = [];
  for (let t = 0; t <= 900; t += 25) {
    if (t) await game('await SS.seek(25);');
    rows.push({ t, ...(await game(`${MEAS}
      const pr = (w.projectiles||[]).filter(p=>p&&p.mesh); const p = pr[pr.length-1];
      const bl = w.blocks; let cx=0,n=0,minx=1e9,maxx=-1e9,maxy=-1e9;
      for (const b of bl){const q=b.mesh.position; cx+=q.x;n++;minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);maxy=Math.max(maxy,q.y);}
      cx=n?cx/n:0;
      const ps = p? p2s(p.mesh.position.x,p.mesh.position.y):null;
      return { px: p?p.mesh.position.x:null, py:p?p.mesh.position.y:null,
               pw: ps?ps.pw:null, ph: ps?ps.ph:null,
               vx: p&&p.body?p.body.linvel().x:null, vy: p&&p.body?p.body.linvel().y:null,
               sc: n?p2s(cx,2.5).pw:null, sw: n? p2s(maxx,2.5).pw - p2s(minx,2.5).pw : null,
               camX:cam.position.x, camY:cam.position.y, camZ:cam.position.z,
               vw: s2w(r.width,r.height/2).x - s2w(0,r.height/2).x,
               tallestPH: p2s(0,maxy).ph,
               debris:(w.debris||[]).length, hit: window.__firstHit, simT: w.simTime };`)) });
  }
  out.t0 = t0; out.rows = rows;
  await writeFile(path.join(OUT, 'flight.json'), JSON.stringify(out, null, 2));

  // return-after-release: camera visible width before draw / at full draw / after release
  await game('SS.seed(1); await SS.seek(2000);');
  const vwRest = await game(`${MEAS} return s2w(r.width,r.height/2).x - s2w(0,r.height/2).x;`);
  await game('SS.aim({angle:0.30, power:1.0}); await SS.seek(500);');
  const vwDraw = await game(`${MEAS} return s2w(r.width,r.height/2).x - s2w(0,r.height/2).x;`);
  await game('SS.release(); await SS.seek(200);');
  const vwAfter = await game(`${MEAS} return s2w(r.width,r.height/2).x - s2w(0,r.height/2).x;`);
  console.log('VW rest', vwRest, 'draw', vwDraw, 'after-release+200', vwAfter);

  // dense filmstrip of the true mid-flight window at the game's own framing
  await game('SS.seed(1); await SS.seek(2000); SS.aim({angle:0.30, power:0.90}); await SS.seek(300); SS.release();');
  await filmstrip('midflight-dense', { from: 40, to: 460, step: 60, cols: 4 });
  console.log('t0', t0);
};
