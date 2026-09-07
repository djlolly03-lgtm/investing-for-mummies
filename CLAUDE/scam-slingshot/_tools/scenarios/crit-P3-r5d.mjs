/**
 * crit-P3-r5d.mjs — the build's BEST destruction, captured properly.
 *
 * From the r5c sweep, 0.34@0.95 and 0.36@1.00 fracture on contact (gap 0 ms), 7 blocks,
 * 44-45 debris. Those are the frames P3 deserves to be judged on, not the 0.30@0.90 line
 * whose first fracture is 1.9 s after the projectile lands.
 */
const INSTRUMENT = `
const B = SS.__world.blocks[0].constructor.prototype;
window.__fx = []; window.__hits = [];
if (!B.__dPatched) {
  B.__dPatched = true;
  const oi = B.onImpact, of = B.fracture;
  B.onImpact = function (imp, other, pt, app) {
    if (other?.tag === 'ammo' && app >= 1.2)
      (window.__hits ||= []).push({ tick: SS.tick(), mat: this.matName, imp, x: pt?.x, y: pt?.y });
    return oi.call(this, imp, other, pt, app);
  };
  B.fracture = function (imp, pt) {
    const t = SS.tick(), k = of.call(this, imp, pt);
    (window.__fx ||= []).push({ tick: t, mat: this.matName, imp, kids: k.length, x: pt?.x, y: pt?.y });
    return k;
  };
}
return true;`;

const CENSUS = `
const w = SS.__world, cam = w.camera, r = w.renderer.domElement.getBoundingClientRect();
const V3 = cam.position.constructor;
const proj = (x,y)=>{const v=new V3(x,y,0).project(cam);return {px:(v.x*.5+.5)*r.width,py:(-v.y*.5+.5)*r.height};};
const row=(e,k,s)=>{const t=e.body.translation(),q=e.body.rotation(),v=e.body.linvel(),p=proj(t.x,t.y);
 return {kind:k,id:e.id,mat:e.matName,x:t.x,y:t.y,w:e.w*s,h:e.h*s,
   a:Math.atan2(2*(q.w*q.z),1-2*(q.z*q.z)),sp:Math.hypot(v.x,v.y),px:p.px,py:p.py,sleeping:e.body.isSleeping()};};
const pools={}; for(const k in w.fx.pools) pools[k]=w.fx.pools[k].live;
const p0=proj(18,0),p1=proj(19,0);
return {tick:SS.tick(), blocks:w.blocks.filter(b=>!b.dead).map(b=>row(b,'block',1)),
 debris:w.debris.filter(d=>!d.dead).map(d=>row(d,'debris',0.94)), pools,
 pxPerM:Math.abs(p1.px-p0.px), fx:window.__fx??[], hits:window.__hits??[]};`;

const halfX=(r)=>(Math.abs(Math.cos(r.a))*r.w+Math.abs(Math.sin(r.a))*r.h)/2;
const halfY=(r)=>(Math.abs(Math.sin(r.a))*r.w+Math.abs(Math.cos(r.a))*r.h)/2;
function touchPct(bs,tol=0.12){ if(bs.length<2) return 100; let n=0;
  for(const a of bs){ if(bs.some(b=>b.id!==a.id && Math.abs(a.x-b.x)<=halfX(a)+halfX(b)+tol && Math.abs(a.y-b.y)<=halfY(a)+halfY(b)+tol)) n++; }
  return 100*n/bs.length; }

async function toFracture(game, ang, pow) {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game(INSTRUMENT);
  await game('return SS.aimAndFire(args[0], args[1]);', ang, pow);
  let t = 0;
  while (t < 6000) { await game('await SS.seek(20);'); t += 20;
    if (await game('return (window.__fx||[]).length;')) break; }
  return t;
}

export default async ({ shot, filmstrip, game, state }) => {
  const L = (...a) => console.log(...a);

  for (const [ang, pow, tag] of [[0.36, 1.00, 'A'], [0.34, 0.95, 'B']]) {
    L(`\n######## ${tag}: ${ang}@${pow} ########`);
    const t = await toFracture(game, ang, pow);
    L(`first fracture at fire+${t} ms`);
    const c0 = await game(CENSUS);
    L(`ammo hits before it: ${c0.hits.map(h => `${h.mat}:${h.imp.toFixed(1)}`).join(' ')}`);
    // fine strip through the impact instant
    await filmstrip(`${tag}-impact-0-200ms-30step`, { from: 0, to: 210, step: 30, cols: 4 });
    // particle ladder from the SAME fracture instant, in a second run (filmstrip consumed time)
    const t2 = await toFracture(game, ang, pow);
    let seen = 0;
    for (const at of [0, 20, 40, 60, 80, 100, 120, 150, 200, 300, 500, 800]) {
      if (at > seen) { await game('await SS.seek(args[0]);', at - seen); seen = at; }
      const c = await game(CENSUS);
      L(` frac+${String(at).padStart(3)} blk=${String(c.blocks.length).padStart(2)} deb=${String(c.debris.length).padStart(2)}` +
        ` FLASH=${c.pools.flash} smoke=${c.pools.smoke} wood=${c.pools.wood} glass=${c.pools.glass} stone=${c.pools.stone}` +
        ` chip=${c.pools.chip} touch%=${touchPct(c.blocks).toFixed(0)}`);
      if (at === 300) L(`  >> COHERENCE frac+300: ${touchPct(c.blocks).toFixed(1)} % of ${c.blocks.length} survivors still touching (bar 60 %)`);
      if (at === 200) {
        const cp = c0.fx[0];
        const far = Math.max(0, ...c.debris.map(d => Math.hypot(d.x - cp.x, d.y - cp.y)));
        L(`  >> DEBRIS THROW frac+200: furthest piece ${far.toFixed(2)} m = ${(far / 0.90).toFixed(2)} BW from contact (bar 3 BW)`);
      }
    }
    // collapse read at the game's own framing
    const t3 = await toFracture(game, ang, pow);
    await filmstrip(`${tag}-collapse-0-1400ms`, { from: 0, to: 1400, step: 200, cols: 4 });
    await game('await SS.seek(2500);');
    await shot(`${tag}-settled`);
    const fin = await game(CENSUS);
    const mats = {}; for (const d of fin.debris) mats[d.mat] = (mats[d.mat] ?? 0) + 1;
    L(`SETTLED ${tag}: blocks=${fin.blocks.length} debris=${fin.debris.length} byMat=${JSON.stringify(mats)}`);
    L(`  fractures: ${fin.fx.map(f => `${f.mat}x${f.kids}`).join(' ')}`);
    const sizes = fin.debris.map(d => Math.max(d.w, d.h) / 0.90).sort((a, b) => b - a);
    L(`  debris longest/BW: max=${sizes[0].toFixed(2)} med=${sizes[Math.floor(sizes.length/2)].toFixed(2)} min=${sizes.at(-1).toFixed(2)}; under 1/6 BW: ${sizes.filter(s=>s<1/6).length}/${sizes.length}`);
    L(`  awake at settle: ${[...fin.blocks, ...fin.debris].filter(r=>!r.sleeping).length}; state ${JSON.stringify(await state())}`);
  }

  // A deliberately mid-structure hit to see whether the impact instant EVER carries a flash.
  L(`\n######## C: flash/dust audit across the whole first second ########`);
  await toFracture(game, 0.36, 1.00);
  await game('return SS.camLock({x: 18.5, y: 3.4, halfWidth: 7.0});');
  await filmstrip('C-impact-CAMLOCK-0-300ms', { from: 0, to: 300, step: 30, cols: 4 });
  await game('return SS.camUnlock();');
};
