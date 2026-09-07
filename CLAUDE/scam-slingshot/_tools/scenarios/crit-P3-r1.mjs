/**
 * P3 CRITIC — round 1. Independent capture. Nothing here trusts a builder claim.
 *
 * Framing note (rubric §P3 additions): every COMPOSITION shot is taken at the game's own framing.
 * SS.camLock() is used ONLY for the shard-silhouette / debris-size close-ups, and every such file
 * is named *-LOCKED so it can never be mistaken for a composition judgement.
 */

const PROJ = `
  const cam = SS.__world.camera;
  const W = window.innerWidth, H = window.innerHeight;
  cam.updateMatrixWorld();
  const mul = (e, v) => [
    e[0]*v[0] + e[4]*v[1] + e[8]*v[2] + e[12]*v[3],
    e[1]*v[0] + e[5]*v[1] + e[9]*v[2] + e[13]*v[3],
    e[2]*v[0] + e[6]*v[1] + e[10]*v[2] + e[14]*v[3],
    e[3]*v[0] + e[7]*v[1] + e[11]*v[2] + e[15]*v[3],
  ];
  const project = (x,y,z) => {
    const v = mul(cam.matrixWorldInverse.elements, [x,y,z,1]);
    const o = mul(cam.projectionMatrix.elements, v);
    return [ (o[0]/o[3]*0.5+0.5)*W, (1-(o[1]/o[3]*0.5+0.5))*H ];
  };
`;

export default async ({ shot, filmstrip, game, state, OUT, page }) => {
  const R = {};
  const say = (k, v) => { R[k] = v; console.log('### ' + k + ' ' + JSON.stringify(v)); };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. STABLE AT REST — the hard bar. seek to 2000 and 3000, diff in SCREEN px.
  // ─────────────────────────────────────────────────────────────────────────
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(2000);`);
  const rest = await game(`
    ${PROJ}
    const at = () => SS.dumpBodies().map(b => ({ i:b.i, tag:b.tag, t:b.t, r:b.r,
                                                 sleeping:b.sleeping, s:project(b.t[0],b.t[1],b.t[2]) }));
    const a = at();
    await SS.seek(1000);
    const b = at();
    let maxPx = 0, worst = null, maxZ = 0;
    for (let k=0;k<a.length;k++){
      const dx = b[k].s[0]-a[k].s[0], dy = b[k].s[1]-a[k].s[1];
      const d = Math.hypot(dx,dy);
      if (d > maxPx) { maxPx = d; worst = { tag:a[k].tag, i:a[k].i, dPx:d }; }
      maxZ = Math.max(maxZ, Math.abs(b[k].t[2]));
    }
    const asleep = b.filter(x=>x.sleeping).length;
    return { bodies:b.length, maxPx:+maxPx.toFixed(4), worst, asleep, awake:b.length-asleep,
             maxAbsZ:maxZ, awakeTags: b.filter(x=>!x.sleeping).map(x=>x.tag) };
  `);
  say('REST_DRIFT_2000_to_3000', rest);

  // interpenetration of the settled stack (AABB overlap of block half-extents, world units)
  const pen = await game(`
    const w = SS.__world;
    const bx = w.blocks.map(b => {
      const t = b.body.translation(), q = b.body.rotation();
      const ang = 2*Math.atan2(q.z, q.w);
      return { mat:b.matName, x:t.x, y:t.y, w:b.w, h:b.h, ang };
    });
    let worst = 0, pair = null;
    for (let i=0;i<bx.length;i++) for (let j=i+1;j<bx.length;j++){
      const A=bx[i], B=bx[j];
      // axis-aligned only (all l1 blocks rest at rot 0); skip any rotated pair
      if (Math.abs(A.ang)>0.05 || Math.abs(B.ang)>0.05) continue;
      const ox = (A.w+B.w)/2 - Math.abs(A.x-B.x);
      const oy = (A.h+B.h)/2 - Math.abs(A.y-B.y);
      if (ox>0 && oy>0) { const o = Math.min(ox,oy); if (o>worst){worst=o; pair=[i,j,A.mat,B.mat];} }
    }
    return { worstOverlapWorldUnits:+worst.toFixed(5), pair, blocks:bx.length,
             blockDims: bx.map(b=>({mat:b.mat, w:b.w, h:b.h})) };
  `);
  say('REST_INTERPENETRATION', pen);

  // contact shadows: is there one per body?
  const shad = await game(`
    const w = SS.__world, s = w.shadows;
    return { keys: s ? Object.keys(s) : null,
             count: s ? (s.count ?? s.n ?? s.mesh?.count ?? null) : null,
             visibleCount: s?.mesh?.count ?? null,
             bodies: SS.dumpBodies().length };
  `);
  say('CONTACT_SHADOWS', shad);

  await shot('rest-l1-establishing');

  // BW — block width in screen px, measured on the frame we are judging.
  const bw = await game(`
    ${PROJ}
    const w = SS.__world;
    const px = w.blocks.map(b => {
      const t = b.body.translation();
      const a = project(t.x - b.w/2, t.y, 0), c = project(t.x + b.w/2, t.y, 0);
      return { mat:b.matName, wWorld:b.w, wPx:+Math.hypot(c[0]-a[0], c[1]-a[1]).toFixed(2) };
    });
    // "standard single structure block" = the median column/plank width
    const s = px.map(p=>p.wPx).sort((a,b)=>a-b);
    return { perBlock: px, medianBWpx: s[Math.floor(s.length/2)], viewport:[innerWidth, innerHeight] };
  `);
  say('BW_SCREEN_PX', bw);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. THE SHOT. angle 0.24 power 1.0 on seed 11 — biggest collapse in the sweep.
  // ─────────────────────────────────────────────────────────────────────────
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release();`);

  // exact first-contact time at 10ms resolution
  const t0 = await game(`
    let firstBreak=null, firstImpactTick=null;
    for (let t=0;t<1200;t+=10){
      await SS.seek(10);
      if (firstBreak===null && SS.__world.debris.length>0) firstBreak=t+10;
      if (firstBreak!==null) break;
    }
    return { firstBreakMs:firstBreak, simTime:SS.__world.simTime };
  `);
  say('FIRST_BREAK_MS', t0);

  // rewind and re-run to capture the impact window as a filmstrip
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release();`);
  await filmstrip('impact-window-30ms', { from: 560, to: 860, step: 30, cols: 4 });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. IMPACT INSTANT — full-res stills at the exact flash moments (no downscale)
  // ─────────────────────────────────────────────────────────────────────────
  for (const t of [0, 40, 80, 120, 160, 220, 300]) {
    await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
                SS.aim({angle:0.24,power:1.0}); SS.release(); await SS.seek(${640 + t});`);
    await shot(`impact-plus${String(t).padStart(3,'0')}ms`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MID-COLLAPSE at +300ms — is it still the structure? (rubric: >=60% of
  //    surviving blocks still touching a neighbour)
  // ─────────────────────────────────────────────────────────────────────────
  const mid = await game(`
    await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
    SS.aim({angle:0.24,power:1.0}); SS.release(); await SS.seek(940);   // impact + 300ms
    const w = SS.__world;
    const bs = w.blocks.map(b => { const t=b.body.translation();
      return { mat:b.matName, x:t.x, y:t.y, w:b.w, h:b.h }; });
    // "in contact" = gap <= 12% of the smaller block's smaller dimension
    let touching = 0;
    for (let i=0;i<bs.length;i++){
      let ok=false;
      for (let j=0;j<bs.length;j++){ if(i===j) continue;
        const A=bs[i], B=bs[j];
        const tol = 0.12*Math.min(A.w,A.h,B.w,B.h);
        const gx = Math.abs(A.x-B.x) - (A.w+B.w)/2;
        const gy = Math.abs(A.y-B.y) - (A.h+B.h)/2;
        if (gx <= tol && gy <= tol) { ok=true; break; }
      }
      if (ok) touching++;
    }
    return { survivingBlocks: bs.length, touching, pct: +(100*touching/bs.length).toFixed(1),
             debris: w.debris.length };
  `);
  say('MIDCOLLAPSE_T300_COHESION', mid);
  await shot('midcollapse-plus300ms');

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FRAGMENT CENSUS — pieces per destroyed block, size vs BW, material sorting
  // ─────────────────────────────────────────────────────────────────────────
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release();`);
  const census = await game(`
    ${PROJ}
    const w = SS.__world;
    const before = w.blocks.length;
    for (let t=0;t<4000;t+=40) await SS.seek(40);
    const after = w.blocks.length;
    const d = w.debris.map(x => {
      const t = x.body.translation();
      const bb = new Set(Object.keys(x));
      return { mat: x.matName, x:t.x, y:t.y,
               dims: { w: x.w ?? null, h: x.h ?? null },
               keys: null };
    });
    const by = {}; for (const x of d) by[x.mat] = (by[x.mat]||0)+1;
    // screen-space bounding size of every debris mesh (real pixels, from its geometry bbox)
    const sizes = w.debris.map(x => {
      const m = x.mesh; if (!m) return null;
      m.updateMatrixWorld(true);
      const g = m.geometry; g.computeBoundingBox();
      const bb = g.boundingBox;
      const pts = [];
      for (const X of [bb.min.x, bb.max.x]) for (const Y of [bb.min.y, bb.max.y]) {
        const v = m.localToWorld(new m.position.constructor(X, Y, 0));
        pts.push(project(v.x, v.y, v.z));
      }
      const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
      return { mat: x.matName,
               wPx: +(Math.max(...xs)-Math.min(...xs)).toFixed(1),
               hPx: +(Math.max(...ys)-Math.min(...ys)).toFixed(1) };
    }).filter(Boolean);
    return { blocksDestroyed: before-after, debris: d.length,
             piecesPerBlock: +((d.length)/(before-after)).toFixed(2), byMaterial: by,
             debrisSizesPx: sizes };
  `);
  say('FRAGMENT_CENSUS', census);
  await shot('settled-wreckage-gameframing');

  // material sorting: sample 100px screen regions of the settled debris field
  const sorted = await game(`
    ${PROJ}
    const w = SS.__world;
    const pts = w.debris.map(x => { const t=x.body.translation();
      const s = project(t.x, t.y, 0); return { mat:x.matName, x:s[0], y:s[1] }; });
    // grid the frame into 100x100 CSS-px cells, report material mix per occupied cell
    const cells = {};
    for (const p of pts) {
      const k = Math.floor(p.x/100)+','+Math.floor(p.y/100);
      (cells[k] ||= {})[p.mat] = (cells[k][p.mat]||0)+1;
    }
    const occupied = Object.entries(cells).filter(([k,v]) => Object.values(v).reduce((a,b)=>a+b,0) >= 3);
    const mixed = occupied.filter(([k,v]) => Object.keys(v).length > 1);
    return { occupiedCells: occupied.length, mixedCells: mixed.length,
             detail: occupied.map(([k,v])=>({cell:k, mix:v})) };
  `);
  say('MATERIAL_SORTING_100PX_CELLS', sorted);

  // settled: does anything float / interpenetrate / still move?
  const settled = await game(`
    ${PROJ}
    const snap = () => { const m={}; for (const b of SS.dumpBodies())
        m[b.i] = { tag:b.tag, s:project(b.t[0],b.t[1],b.t[2]), sleeping:b.sleeping }; return m; };
    const a = snap();
    await SS.seek(1000);
    const b = snap();
    let maxPx=0, worst=null, n=0;
    for (const k of Object.keys(b)) { if (!a[k]) continue; n++;
      const d=Math.hypot(b[k].s[0]-a[k].s[0], b[k].s[1]-a[k].s[1]);
      if(d>maxPx){maxPx=d; worst=b[k].tag;} }
    const all = Object.values(b);
    return { bodies:all.length, compared:n, asleep:all.filter(x=>x.sleeping).length,
             awakeTags: all.filter(x=>!x.sleeping).map(x=>x.tag),
             maxPxDriftOver1s:+maxPx.toFixed(3), worst };
  `);
  say('SETTLED_STILLNESS', settled);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. PER-MATERIAL BREAKS — the probe levels. Close-up (LOCKED) so a shard
  //    silhouette is judgeable, plus the particle census per material.
  // ─────────────────────────────────────────────────────────────────────────
  for (const [lvl, ang] of [['_p3-wood',0.24], ['_p3-glass',0.24], ['_p3-stone',0.24]]) {
    const m = lvl.replace('_p3-','');
    await game(`await SS.loadLevel('${lvl}'); await SS.seed(5); await SS.seek(900);
                SS.aim({angle:${ang},power:1.0}); SS.release();`);
    const hit = await game(`
      let t=0; for (; t<2000; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
      return { breakAtMs: t };
    `);
    // particle census at +60ms after the break: what CLASSES of particle exist?
    const fx = await game(`
      await SS.seek(60);
      const f = SS.__world.fx;
      const out = {};
      const scan = (obj, path) => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (v && typeof v === 'object' && ('count' in v) && ('live' in v || 'alive' in v || 'n' in v)) {
            out[path+k] = { count: v.count, live: v.live ?? v.alive ?? v.n };
          }
        }
      };
      scan(f, '');
      for (const k of Object.keys(f)) if (f[k] && typeof f[k]==='object') scan(f[k], k+'.');
      return { fxKeys: Object.keys(f), pools: out };
    `);
    say('MATERIAL_' + m.toUpperCase() + '_BREAK', { ...hit, ...fx });
    await shot(`break-${m}-gameframing`);
    await game(`SS.camLock({ x: 12.0, y: 2.2, halfWidth: 5.0 }); await SS.seek(0);`);
    await shot(`break-${m}-LOCKED-closeup`);
    await game(`SS.camUnlock();`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. WOOD DUST TEST — a wood-only destruction frame must contain ZERO smoke.
  // ─────────────────────────────────────────────────────────────────────────
  await game(`await SS.loadLevel('_p3-wood'); await SS.seed(5); await SS.seek(900);
              SS.aim({angle:0.24,power:1.0}); SS.release();`);
  const woodDust = await game(`
    let t=0; for (; t<2000; t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
    await SS.seek(80);
    const f = SS.__world.fx;
    const dump = {};
    for (const k of Object.keys(f)) {
      const v = f[k];
      if (v && typeof v === 'object') {
        dump[k] = { ctor: v.constructor?.name,
                    count: v.count ?? null, live: v.live ?? v.alive ?? v.n ?? null,
                    visible: v.mesh?.visible ?? v.visible ?? null,
                    instances: v.mesh?.count ?? null };
      }
    }
    return { atMs: t+80, pools: dump };
  `);
  say('WOOD_DUST_POOLS', woodDust);
  await filmstrip('wood-splinter-life-40ms', { from: 0, to: 480, step: 40, cols: 4 });

  // ─────────────────────────────────────────────────────────────────────────
  // 8. CHAIN COLLAPSE — is destruction staggered in time?
  // ─────────────────────────────────────────────────────────────────────────
  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release(); await SS.seek(600);`);
  const chain = await game(`
    const w = SS.__world;
    const events = [];
    let last = 0;
    for (let t=0;t<2400;t+=20){
      await SS.seek(20);
      const n = w.debris.length;
      if (n > last) { events.push({ tMs: 600+t+20, newDebris: n-last, total:n }); last = n; }
    }
    return { breakEvents: events, distinctBurstTimes: events.length };
  `);
  say('CHAIN_STAGGER', chain);

  await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
              SS.aim({angle:0.24,power:1.0}); SS.release();`);
  await filmstrip('chain-collapse-60ms', { from: 600, to: 1500, step: 60, cols: 4 });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. BEST SINGLE FRAME for the blind A/B — mid-collapse, game framing.
  // ─────────────────────────────────────────────────────────────────────────
  for (const t of [760, 820, 900, 1000, 1120]) {
    await game(`await SS.loadLevel('l1'); await SS.seed(11); await SS.seek(1200);
                SS.aim({angle:0.24,power:1.0}); SS.release(); await SS.seek(${t});`);
    await shot(`AB-candidate-t${t}`);
  }

  console.log('\n===== P3 CRITIC MEASUREMENTS =====\n' + JSON.stringify(R, null, 1));
};
