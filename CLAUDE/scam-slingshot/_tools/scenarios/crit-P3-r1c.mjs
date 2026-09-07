/** P3 CRITIC r1 — part C. Shadow census, settled interpenetration, per-material colour identity. */
const PROJ = `
  const cam = SS.__world.camera; const W = innerWidth, H = innerHeight; cam.updateMatrixWorld();
  const mul = (e,v)=>[e[0]*v[0]+e[4]*v[1]+e[8]*v[2]+e[12]*v[3], e[1]*v[0]+e[5]*v[1]+e[9]*v[2]+e[13]*v[3],
                      e[2]*v[0]+e[6]*v[1]+e[10]*v[2]+e[14]*v[3], e[3]*v[0]+e[7]*v[1]+e[11]*v[2]+e[15]*v[3]];
  const project = (x,y,z)=>{ const v=mul(cam.matrixWorldInverse.elements,[x,y,z,1]);
    const o=mul(cam.projectionMatrix.elements,v); return [(o[0]/o[3]*0.5+0.5)*W,(1-(o[1]/o[3]*0.5+0.5))*H]; };
`;

export default async ({ shot, filmstrip, game, state, OUT, page }) => {
  const R = {}; const say = (k,v) => { R[k]=v; console.log('### '+k+' '+JSON.stringify(v)); };

  // ── shadow census: rest, mid-collapse, settled ──
  const shadowAt = async (label, setup) => {
    await game(setup);
    const s = await game(`
      const w = SS.__world;
      const nb = SS.dumpBodies().length;
      return { shadowInstances: w.shadows?.mesh?.count ?? null, shadowMax: w.shadows?.max ?? null,
               bodies: nb, blocks: w.blocks.length, debris: w.debris.length,
               villains: w.villains.filter(v=>v.alive).length };
    `);
    say('SHADOWS_' + label, s);
  };
  await shadowAt('REST',      `await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(2000);`);
  await shadowAt('MIDCOLLAPSE',`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
                                SS.aim({angle:0.24,power:1.0}); SS.release(); await SS.seek(940);`);
  await shadowAt('SETTLED',   `await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
                               SS.aim({angle:0.24,power:1.0}); SS.release();
                               for (let i=0;i<70;i++) await SS.seek(100);`);

  // ── settled pile: debris ↔ debris / debris ↔ block interpenetration, in SCREEN px ──
  const inter = await game(`
    ${PROJ}
    const w = SS.__world;
    const pxPerUnit = Math.abs(project(1,0,0)[0] - project(0,0,0)[0]);
    const parts = [];
    const collect = (arr, kind) => { for (const e of arr) {
      const m = e.mesh; if (!m) continue; m.updateMatrixWorld(true);
      const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      const t = e.body.translation(), q = e.body.rotation();
      const ang = 2*Math.atan2(q.z, q.w);
      // world half-extents of the LOCAL bbox (x/y only), rotated -> AABB
      const hx = (bb.max.x-bb.min.x)/2 * (m.scale?.x ?? 1);
      const hy = (bb.max.y-bb.min.y)/2 * (m.scale?.y ?? 1);
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      parts.push({ kind, mat: e.matName, x:t.x, y:t.y, ax: hx*c+hy*s, ay: hx*s+hy*c });
    }};
    collect(w.blocks, 'block'); collect(w.debris, 'debris');
    let worst = 0, worstPair = null, n = 0;
    for (let i=0;i<parts.length;i++) for (let j=i+1;j<parts.length;j++){
      const A=parts[i], B=parts[j];
      const ox = (A.ax+B.ax) - Math.abs(A.x-B.x);
      const oy = (A.ay+B.ay) - Math.abs(A.y-B.y);
      if (ox>0 && oy>0) { n++; const o=Math.min(ox,oy);
        if (o>worst){worst=o; worstPair=[A.kind+'/'+A.mat, B.kind+'/'+B.mat];} }
    }
    return { parts: parts.length, overlappingPairs: n, worstOverlapUnits:+worst.toFixed(3),
             worstOverlapPx: +(worst*pxPerUnit).toFixed(1), worstPair, pxPerUnit:+pxPerUnit.toFixed(2) };
  `);
  say('SETTLED_AABB_OVERLAP', inter);

  // ── per-material colour identity: block mesh colour vs its fx particle colour ──
  const cols = await game(`
    const hex = (c) => '#' + c.getHexString();
    const w = SS.__world;
    const out = { blocks: {}, debris: {}, fx: {} };
    for (const b of w.blocks) {
      const m = Array.isArray(b.mesh.material) ? b.mesh.material[0] : b.mesh.material;
      out.blocks[b.matName] ||= { color: m.color ? hex(m.color) : null, opacity: m.opacity,
                                  transparent: m.transparent, type: m.type };
    }
    const P = w.fx.pools;
    for (const k of Object.keys(P)) {
      const m = P[k].mesh?.material;
      const mm = Array.isArray(m) ? m[0] : m;
      out.fx[k] = mm ? { color: mm.color ? hex(mm.color) : null, opacity: mm.opacity,
                         transparent: mm.transparent, type: mm.type,
                         vertexColors: mm.vertexColors } : null;
    }
    return out;
  `);
  say('MATERIAL_COLOURS', cols);

  // debris material colours after a full collapse
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release(); for (let i=0;i<70;i++) await SS.seek(100);`);
  const dcol = await game(`
    const hex=(c)=>'#'+c.getHexString();
    const w = SS.__world; const out = {};
    for (const d of w.debris) {
      const m = Array.isArray(d.mesh.material)? d.mesh.material[0] : d.mesh.material;
      out[d.matName] ||= { color: m.color?hex(m.color):null, opacity:m.opacity, transparent:m.transparent,
                           type:m.type, geo: d.mesh.geometry.type,
                           verts: d.mesh.geometry.attributes.position.count };
    }
    return out;
  `);
  say('DEBRIS_MATERIALS', dcol);

  // ── how long does the impact FLASH live? (rubric: gone within 150ms) ──
  for (const [lvl,m] of [['_p3-wood','wood'],['_p3-glass','glass'],['_p3-stone','stone']]) {
    await game(`await SS.loadLevel('${lvl}'); await SS.seed(5); await SS.seek(900);
                SS.aim({angle:0.24,power:1.0}); SS.release();
                let t=0; for(;t<2400;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }`);
    const life = await game(`
      const P = SS.__world.fx.pools; const rows=[];
      for (let t=0;t<=420;t+=30){
        rows.push({ t, flash:P.flash.live, smoke:P.smoke.live, chip:P.chip.live,
                    mat:P[SS.__world.debris[0]?.matName ?? 'wood']?.live ?? null });
        await SS.seek(30);
      }
      return rows;
    `);
    say('FX_LIFE_' + m.toUpperCase(), life);
  }

  console.log('\n===== P3 PART C =====\n' + JSON.stringify(R, null, 1));
};
