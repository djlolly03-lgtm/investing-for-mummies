/**
 * p4-r3-geom.mjs — MEASURE the impact geometry the round-2 builder called unsatisfiable.
 * For the canonical hitting shot AND the critic's own shot, log per 20 ms:
 *   projectile world x, live structure bbox (blocks+villains, same formula the r2 critic used),
 *   camera x, vw, and the resulting projPctW / structPctW.
 * Then report separation in world units and in %W at the impact instant.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRE = `
  const W = SS.__world, cam = W.camera;
  const proj = (x,y,z) => { const v = new (cam.position.constructor)(x,y,z||0); v.project(cam);
    return { w:+((v.x*0.5+0.5)*100).toFixed(3), h:+((1-(v.y*0.5+0.5))*100).toFixed(3) }; };
  const vh = () => 2*Math.tan(cam.fov*Math.PI/360)*cam.position.z;
  const vw = () => vh()*cam.aspect;
  const liveExtents = () => { let right=-1e9, left=1e9, top=-1e9;
    for (const b of W.blocks) if (!b.dead) { const t=b.body.translation();
      const hw=(b.halfW||0.5), hh=(b.halfH||0.5);
      right=Math.max(right,t.x+hw); left=Math.min(left,t.x-hw); top=Math.max(top,t.y+hh); }
    for (const v of W.villains) if (v.alive) { const t=v.body.translation();
      right=Math.max(right,t.x+0.6); left=Math.min(left,t.x-0.6); top=Math.max(top,t.y+0.9); }
    return { left:+left.toFixed(3), right:+right.toFixed(3), top:+top.toFixed(3) }; };
  const proje = () => { const p=(W.projectiles||[]).filter(q=>!q.dead)[0]; if(!p) return null;
    const t=p.body.translation(), v=p.body.linvel();
    return { x:+t.x.toFixed(3), y:+t.y.toFixed(3), vx:+v.x.toFixed(3), vy:+v.y.toFixed(3) }; };
`;

export default async ({ game, state, OUT }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  const out = {};

  // static level geometry
  out.level = await g(`const e = liveExtents();
    return { extents: e, mid: +(((e.left+e.right)/2)).toFixed(3),
      sling: W.sling && { x:+W.sling.anchor.x.toFixed(3), y:+W.sling.anchor.y.toFixed(3) },
      rigExtent: W.rig && W.rig._extent, aimVw: null };`);

  for (const [a, p, tag] of [[0.30, 0.90, 'hit'], [0.55, 1.0, 'critic-0.55-1.0']]) {
    await g('await SS.seed(3); await SS.seek(2600);');
    const aim = await g('return { vw:+vw().toFixed(3), camx:+cam.position.x.toFixed(3) };');
    await g('SS.aim({angle:args[0],power:args[1]}); await SS.seek(300); SS.release(); SS.freeze();', a, p);
    const rows = [];
    let firstDebris = null;
    for (let t = 0; t <= 1600; t += 20) {
      const r = await g(`
        const pr = proje(), e = liveExtents();
        const st = proj((e.left+e.right)/2, 1.5);
        const pp = pr ? proj(pr.x, pr.y) : null;
        return { px: pr&&pr.x, py: pr&&pr.y, pvx: pr&&pr.vx,
                 sL:e.left, sR:e.right, sMid:+(((e.left+e.right)/2)).toFixed(3),
                 projPctW: pp&&pp.w, structPctW: st.w,
                 camx:+cam.position.x.toFixed(3), vw:+vw().toFixed(3),
                 dbg: (W.debris||[]).length, blocks: (W.blocks||[]).filter(b=>!b.dead).length };`);
      r.t = t;
      if (firstDebris === null && r.dbg > 0) firstDebris = t;
      rows.push(r);
      if (t < 1600) await g('await SS.seek(20);');
    }
    out[tag] = { aim, firstDebris, rows };
    const imp = rows.find(r => r.t === firstDebris) || rows[rows.length - 1];
    console.log(`\n--- ${tag} --- aimVw=${aim.vw} camx=${aim.camx}  firstDebris=${firstDebris}ms`);
    console.log('  at impact:', JSON.stringify({ t: imp.t, px: imp.px, sMid: imp.sMid,
      sepWorld: +(imp.sMid - imp.px).toFixed(3), vw: imp.vw,
      sepPctW: +(((imp.sMid - imp.px) / imp.vw) * 100).toFixed(2),
      projPctW: imp.projPctW, structPctW: imp.structPctW }));
    // print a window around impact
    const win = rows.filter(r => r.t % 80 === 0 && r.t <= (firstDebris ?? 900) + 240);
    for (const r of win) console.log('   t=' + String(r.t).padStart(4) +
      ` px=${String(r.px).padStart(7)} sMid=${String(r.sMid).padStart(7)} vw=${String(r.vw).padStart(7)}` +
      ` proj%=${String(r.projPctW).padStart(7)} struct%=${String(r.structPctW).padStart(7)} blocks=${r.blocks}`);
  }
  await writeFile(path.join(OUT, 'GEOM.json'), JSON.stringify(out, null, 1));
};
