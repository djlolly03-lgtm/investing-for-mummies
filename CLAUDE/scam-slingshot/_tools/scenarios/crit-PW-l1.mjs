/**
 * PW r1 critic — LEVEL ONE. Three questions, all numeric:
 *  1. ARC WEIGHT   — where does the projectile actually go, how much of the arc is on screen,
 *                    what is its measured vertical acceleration, hang time, apex.
 *  2. PROPAGATION  — after impact, when does each block first move, ordered by height. A stack
 *                    with weight shows a lag that climbs/descends; a glued one moves all at once.
 *  3. WHAT KILLS   — the source and raw impulse of the blow that finishes each block, so
 *                    "stone shatters on the grass" can be confirmed or ruled out on l1 itself.
 */
export default async ({ game }) => {
  const SHOTS = [[0.30, 0.90], [0.36, 1.00], [0.55, 1.00]];
  const arcs = [];
  for (const [a, p] of SHOTS) {
    const r = await game(`
      const [a,p] = args;
      SS.freeze();
      await SS.seed(4242);
      const w = SS.__world;
      const s = w.sling;
      const anchor = { x: s.anchor.x, y: s.anchor.y };
      SS.aim({ angle: a, power: p });
      const pouch = { x: s.pouch.x, y: s.pouch.y };
      const rel = SS.release();
      const cam = w.camera, rdr = w.renderer;
      const V3 = cam.position.constructor;
      const rect = rdr.domElement.getBoundingClientRect();
      const proj = (x,y) => { const v = new V3(x,y,0).project(cam);
        return { sx:(v.x*0.5+0.5)*rect.width, sy:(-v.y*0.5+0.5)*rect.height }; };
      const path = [];
      let t = 0;
      const ammo = () => w.projectiles.find(q => q && q.body);
      for (let i=0;i<220;i++) {                       // up to ~1.83 s
        const q = ammo();
        if (!q) break;
        const tr = q.body.translation(), v = q.body.linvel();
        const sp = proj(tr.x, tr.y);
        path.push({ t:+t.toFixed(1), x:+tr.x.toFixed(3), y:+tr.y.toFixed(3),
                    vx:+v.x.toFixed(3), vy:+v.y.toFixed(3),
                    sx:+sp.sx.toFixed(1), sy:+sp.sy.toFixed(1) });
        await SS.seek(1000/120); t += 1000/120;
        if (w.phase !== 'flying') break;
      }
      return { a, p, rel, anchor, pouch, path,
               vw: rect.width, vh: rect.height,
               pouchPx: proj(pouch.x, pouch.y) };
    `, a, p);
    arcs.push(r);
  }

  console.log('\n== ARC WEIGHT ==');
  for (const r of arcs) {
    const P = r.path;
    if (!P.length) { console.log(`${r.a}@${r.p}: no path`); continue; }
    const first = P[0];
    const muzzleDist = Math.hypot(first.x - r.pouch.x, first.y - r.pouch.y);
    // measured gravity from the ballistic mid-section
    const i0 = 6, i1 = Math.min(P.length-1, 40);
    const g = (P[i1].vy - P[i0].vy) / ((P[i1].t - P[i0].t)/1000);
    const apex = P.reduce((m,s)=> s.y>m.y?s:m, P[0]);
    const onScreen = P.filter(s => s.sx>=0 && s.sx<=r.vw && s.sy>=0 && s.sy<=r.vh).length;
    const hang = P[P.length-1].t;
    // vertical drop across the visible arc, in screen pixels, as a read of "does it curve"
    const sxs = P.map(s=>s.sx), sys = P.map(s=>s.sy);
    console.log(`${r.a}@${r.p}  speed ${r.rel.speed?.toFixed?.(2)} exit ${r.rel.exitSpeed?.toFixed?.(2)}`);
    console.log(`   pouch world (${r.pouch.x.toFixed(2)}, ${r.pouch.y.toFixed(2)})  first simulated (${first.x}, ${first.y})  MUZZLE JUMP ${muzzleDist.toFixed(2)} m`);
    console.log(`   pouch px (${r.pouchPx.sx.toFixed(0)},${r.pouchPx.sy.toFixed(0)})  first px (${first.sx},${first.sy})  jump ${Math.hypot(first.sx-r.pouchPx.sx, first.sy-r.pouchPx.sy).toFixed(0)} px of ${r.vw}`);
    console.log(`   measured g ${g.toFixed(2)} m/s2   apex y ${apex.y} @ t=${apex.t}ms   hang ${hang.toFixed(0)}ms   samples ${P.length} (${onScreen} on screen)`);
    console.log(`   screen x span ${Math.min(...sxs).toFixed(0)}..${Math.max(...sxs).toFixed(0)}   y span ${Math.min(...sys).toFixed(0)}..${Math.max(...sys).toFixed(0)}`);
  }

  // ---- propagation + killers, on the shot that clears l1 -----------------------
  const prop = await game(`
    SS.freeze(); await SS.seed(4242);
    const w = SS.__world;
    const blocks = w.blocks.slice();
    const start = blocks.map(b => ({ b, m:b.matName,
      x:b.body.translation().x, y:b.body.translation().y, mass:b.body.mass(),
      first:null, vpeak:0 }));
    const kills = [];
    const Bproto = Object.getPrototypeOf(blocks[0]);
    const origBreak = Bproto.shatter || Bproto.break_ || null;
    // record the finishing blow by wrapping onImpact and watching for the break
    const origImp = Bproto.onImpact;
    Bproto.onImpact = function (impulse, other, point, approach = 0) {
      const wasBroken = this.broken;
      const r = origImp.call(this, impulse, other, point, approach);
      if (!wasBroken && this.broken) {
        kills.push({ m:this.matName, src: other?.tag ?? 'ground', raw:+impulse.toFixed(2),
                     scaled:+(this.lastImpulse||0).toFixed(2), ap:+approach.toFixed(1),
                     y:+(point?.y ?? -1).toFixed(2), t:+(w.simTime*1000).toFixed(0) });
      }
      return r;
    };
    SS.aim({ angle: 0.30, power: 0.90 });
    SS.release();
    let t = 0; let impactT = null;
    for (let i=0;i<600;i++) {                       // 5 s
      await SS.seek(1000/120); t += 1000/120;
      for (const o of start) {
        if (o.b.broken || !o.b.body) { if (o.first===null) o.first = t; continue; }
        const v = o.b.body.linvel();
        const sp = Math.hypot(v.x, v.y);
        if (sp > o.vpeak) o.vpeak = sp;
        if (o.first === null && sp > 0.35) o.first = t;
      }
      if (impactT === null && kills.length) impactT = kills[0].t;
    }
    Bproto.onImpact = origImp;
    return { rows: start.map(o=>({ m:o.m, x:+o.x.toFixed(2), y:+o.y.toFixed(2),
              mass:+o.mass.toFixed(2), first:o.first===null?null:+o.first.toFixed(0),
              vpeak:+o.vpeak.toFixed(2), broken:!!o.b.broken })),
             kills, state: await SS.state() };
  `);
  console.log('\n== L1 PROPAGATION (shot 0.30@0.90) ==');
  const t0 = Math.min(...prop.rows.filter(r=>r.first!==null).map(r=>r.first));
  console.log('mat     x      y    mass  firstMove(ms)  rel(ms)  vpeak  broken');
  for (const r of prop.rows.sort((a,b)=>a.y-b.y)) {
    console.log(`${r.m.padEnd(6)} ${String(r.x).padStart(5)} ${String(r.y).padStart(5)} ${String(r.mass).padStart(5)}  ` +
      `${String(r.first ?? '   --').padStart(12)}  ${r.first!==null?String((r.first-t0).toFixed(0)).padStart(6):'    --'}  ${String(r.vpeak).padStart(5)}  ${r.broken}`);
  }
  console.log('\n== L1 KILLING BLOWS ==');
  for (const k of prop.kills) console.log(JSON.stringify(k));
  console.log('FINAL_STATE ' + JSON.stringify(prop.state));
  console.log('PROP_JSON ' + JSON.stringify(prop.rows));
};
