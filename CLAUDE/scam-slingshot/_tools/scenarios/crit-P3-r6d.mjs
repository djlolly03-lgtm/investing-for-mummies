/**
 * CRIT P3 r6 — part 4. The two automatic-FAIL conditions I had not yet measured:
 *   (a) "a never-sleeping body on an untouched level"  -> name every awake body at rest
 *   (b) "debris interpenetrates settled geometry"      -> OBB overlap sweep over the settled pile
 * Plus a floater check: any settled body not resting on anything.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ game, state, shot, OUT }) => {
  const R = {};

  // (a) untouched l1, five seconds
  await game('await SS.loadLevel("l1"); SS.seed(2026); await SS.seek(5000);');
  R.rest = await game(`
    const b = SS.dumpBodies();
    return { total: b.length, asleep: b.filter(x=>x.sleeping).length,
      awake: b.filter(x=>!x.sleeping).map(x=>({ tag:x.tag, i:x.i,
        v:+Math.hypot(x.v[0],x.v[1]).toFixed(5), y:+x.t[1].toFixed(3) })) };
  `);
  await game('await SS.seek(5000);');
  R.rest10s = await game(`
    const b = SS.dumpBodies();
    return { asleep: b.filter(x=>x.sleeping).length, total: b.length,
      awake: b.filter(x=>!x.sleeping).map(x=>({tag:x.tag,i:x.i,v:+Math.hypot(x.v[0],x.v[1]).toFixed(5)})) };
  `);

  // (b) fire, settle, then sweep the wreck
  await game('await SS.restart(); SS.seed(2026); await SS.seek(1500);');
  await game('return SS.aimAndFire(0.30, 0.90);');
  for (let i = 0; i < 20; i++) { await game('await SS.seek(500);');
    const s = await state(); if (s.phase !== 'flying' && s.phase !== 'settling') break; }
  await game('await SS.seek(3000);');

  R.settled = await game(`
    const w = SS.__world;
    const items = [];
    const push = (o, kind) => { const t = o.body.translation(); const q = o.body.rotation();
      // z-rotation only (plane game): angle from quaternion
      const ang = Math.atan2(2*(q.w*q.z), 1 - 2*q.z*q.z);
      items.push({ kind, mat:o.matName, x:t.x, y:t.y, hw:(o.w??0.4)/2, hh:(o.h??0.4)/2, ang,
        sleeping: o.body.isSleeping ? o.body.isSleeping() : null }); };
    for (const b of w.blocks) if (!b.broken) push(b, 'block');
    for (const d of w.debris) push(d, 'debris');
    // separating-axis overlap depth for two OBBs, in world units
    const corners = o => { const c=Math.cos(o.ang), s=Math.sin(o.ang);
      return [[-o.hw,-o.hh],[o.hw,-o.hh],[o.hw,o.hh],[-o.hw,o.hh]]
        .map(([x,y]) => [o.x + x*c - y*s, o.y + x*s + y*c]); };
    const axes = o => { const c=Math.cos(o.ang), s=Math.sin(o.ang); return [[c,s],[-s,c]]; };
    const overlapDepth = (A,B) => { let min = Infinity;
      for (const ax of [...axes(A), ...axes(B)]) {
        const pa = corners(A).map(p=>p[0]*ax[0]+p[1]*ax[1]);
        const pb = corners(B).map(p=>p[0]*ax[0]+p[1]*ax[1]);
        const d = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
        if (d <= 0) return 0; if (d < min) min = d;
      } return min; };
    const worst = [];
    for (let i=0;i<items.length;i++) for (let j=i+1;j<items.length;j++) {
      if (Math.hypot(items[i].x-items[j].x, items[i].y-items[j].y) > 4) continue;
      const d = overlapDepth(items[i], items[j]);
      if (d > 0.02) worst.push({ a:items[i].kind+'/'+items[i].mat, b:items[j].kind+'/'+items[j].mat, depth:+d.toFixed(3) });
    }
    worst.sort((p,q)=>q.depth-p.depth);
    // floaters: a body whose lowest corner is well above ground AND has nothing under it
    const floaters = items.filter(o => {
      const low = Math.min(...corners(o).map(p=>p[1]));
      if (low < 0.10) return false;
      return !items.some(p => p !== o && Math.abs(p.x-o.x) < (o.hw+p.hw+0.25)
             && Math.max(...corners(p).map(c=>c[1])) > low - 0.25
             && Math.max(...corners(p).map(c=>c[1])) < low + 0.25);
    }).map(o=>({kind:o.kind,mat:o.mat,x:+o.x.toFixed(2),y:+o.y.toFixed(2)}));
    return { pieces: items.length, blocks: items.filter(i=>i.kind==='block').length,
      debris: items.filter(i=>i.kind==='debris').length,
      overlapsOver2cm: worst.length, worst: worst.slice(0,8),
      awake: items.filter(i=>i.sleeping === false).length, floaters };
  `);

  // shadow presence: sample the ground directly under the pile vs open grass, at rest framing
  await game('SS.camUnlock(); await SS.seek(60);');
  await shot('settled-for-shadow-check');

  await writeFile(path.join(OUT, 'P3-r6d.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
};
