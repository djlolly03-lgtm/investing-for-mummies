/**
 * crit-P1-r3-pix.mjs — CRITIC pixel-diff pass, P1 r3.
 *
 * Layer masking MUST NOT advance the simulation. SS.stepOnce() is a solver step +
 * a render, so an ON/OFF pair taken around it is one tick apart and the diff picks
 * up the whole moving world. In driven mode the rAF loop still renders, so toggling
 * .visible and waiting two animation frames gives a byte-comparable pair.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, game, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  const raf2 = () => page.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(1)))));

  const setVis = async (name, v) => {
    await game('const o = SS.__world.scene.getObjectByName(args[0]); if (o) o.visible = args[1]; return !!o;', name, v);
    await raf2();
  };
  const setSlingVis = async (what, v) => {
    await game(`const s = SS.__world.sling;
      if (args[0]==='bands') s.bands.forEach(b=>b.tube.group.visible=args[1]);
      if (args[0]==='prongs') s.prongs.forEach(p=>p.tube.group.visible=args[1]);
      if (args[0]==='ammo') s.ammo && (s.ammo.mesh.visible=args[1]);
      return 1;`, what, v);
    await raf2();
  };

  const crop = async (name, clip) => {
    const f = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: f, clip });
    return f;
  };

  const boxes = () => game(`
    const w = SS.__world, s = w.sling, cam = w.camera;
    const VW = innerWidth, VH = innerHeight;
    const aM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const proj=(x,y,z)=>{let p=aM(cam.matrixWorldInverse,[x,y,z||0]);p=aM(cam.projectionMatrix,p);
      return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
    const bb=(o)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,n=0;o.updateWorldMatrix(true,true);
      o.traverse(m=>{if(!m.isMesh||m.visible===false)return;const g=m.geometry;if(!g)return;
        if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;n++;
        for(const cx of[b.min.x,b.max.x])for(const cy of[b.min.y,b.max.y])for(const cz of[b.min.z,b.max.z]){
          const wp=aM(m.matrixWorld,[cx,cy,cz]);const s2=proj(wp[0],wp[1],wp[2]);
          if(s2[0]<x0)x0=s2[0];if(s2[0]>x1)x1=s2[0];if(s2[1]<y0)y0=s2[1];if(s2[1]>y1)y1=s2[1];}});
      return n?{x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}:null;};
    const p0 = w.projectiles && w.projectiles[0];
    return { VW, VH,
      pouch: proj(s.pouch.x, s.pouch.y, 0),
      anchor: proj(s.anchor.x, s.anchor.y, 0),
      sling: bb(s.group),
      ammoOnSling: s.ammo ? bb(s.ammo.mesh) : null,
      proj0: p0 && p0.mesh ? bb(p0.mesh) : null };`);

  const fresh = () => game('SS.seed(11); await SS.seek(2000);');
  const ANG = 0.42, POW = 0.90;

  /* -------- 1. rest: ammo occlusion by the strap, clean pair -------- */
  await fresh();
  const b0 = await boxes();
  const AD_REST = b0.ammoOnSling.h;
  say('rest_boxes', { AD_REST: +AD_REST.toFixed(2), pouch: b0.pouch.map(v=>+v.toFixed(1)) });
  const ammoClip = (a) => { const p = Math.max(20, a.h * 0.8);
    const x = Math.max(0, Math.round(a.x0 - p)), y = Math.max(0, Math.round(a.y0 - p));
    return { x, y, width: Math.min(b0.VW - x, Math.round(a.w + p*2)), height: Math.min(b0.VH - y, Math.round(a.h + p*2)) }; };

  const occlPair = async (tag, box) => {
    const c = ammoClip(box);
    await setSlingVis('bands', true); await setSlingVis('prongs', true);
    await crop(`pix-occl-${tag}-ALL`, c);
    await setSlingVis('bands', false);
    await crop(`pix-occl-${tag}-NOBANDS`, c);
    await setSlingVis('bands', true);
    await setSlingVis('ammo', false);
    await crop(`pix-occl-${tag}-NOAMMO`, c);
    await setSlingVis('ammo', true);
    return c;
  };
  say('occl_rest_clip', await occlPair('rest', b0.ammoOnSling));

  /* -------- 2. full stretch: same pair -------- */
  await fresh();
  await game(`await SS.aim({angle:${ANG}, power:1.0}); await SS.seek(320);`);
  const b1 = await boxes();
  say('full_boxes', { AD_live: +b1.ammoOnSling.h.toFixed(2) });
  say('occl_full_clip', await occlPair('full', b1.ammoOnSling));

  /* -------- 3. sling crop, band/fork colours from RENDERED pixels -------- */
  const slingClip = (sb) => { const p = Math.max(60, sb.w);
    const x = Math.max(0, Math.round(sb.x0 - p)), y = Math.max(0, Math.round(sb.y0 - p*0.9));
    return { x, y, width: Math.min(b0.VW - x, Math.round(sb.w + p*2)), height: Math.min(b0.VH - y, Math.round(sb.h + p*1.8)) }; };
  await fresh();
  const bR = await boxes();
  const sc = slingClip(bR.sling);
  say('slingClip', sc);
  await crop('pix-sling-rest-ALL', sc);
  await setSlingVis('bands', false); await crop('pix-sling-rest-NOBANDS', sc); await setSlingVis('bands', true);
  await setSlingVis('prongs', false); await crop('pix-sling-rest-NOPRONGS', sc); await setSlingVis('prongs', true);

  await fresh();
  await game(`await SS.aim({angle:${ANG}, power:1.0}); await SS.seek(320);`);
  const bF = await boxes();
  const scF = slingClip(bF.sling);
  say('slingClipFull', scF);
  await crop('pix-sling-full-ALL', scF);
  await setSlingVis('bands', false); await crop('pix-sling-full-NOBANDS', scF); await setSlingVis('bands', true);
  await setSlingVis('ammo', false); await crop('pix-sling-full-NOAMMO', scF); await setSlingVis('ammo', true);

  /* -------- 4. LANCE: clean ON/OFF pairs at the release instants -------- */
  const setup = async () => {
    await fresh();
    await game(`await SS.aim({angle:${ANG}, power:${POW}}); await SS.seek(400); await SS.release();`);
  };
  const pack = {};
  for (const t of [0, 30, 60, 100, 160, 250]) {
    await setup();
    if (t > 0) await game('await SS.seek(args[0]);', t);
    const b = await boxes();
    const a = b.proj0;
    const x0 = Math.min(b.pouch[0], a ? a.x0 : b.pouch[0]) - 100;
    const x1 = Math.max(b.pouch[0], a ? a.x1 : b.pouch[0]) + 100;
    const y0 = Math.min(b.pouch[1], a ? a.y0 : b.pouch[1]) - 100;
    const y1 = Math.max(b.pouch[1], a ? a.y1 : b.pouch[1]) + 100;
    const c = { x: Math.max(0, Math.round(x0)), y: Math.max(0, Math.round(y0)) };
    c.width = Math.min(b.VW - c.x, Math.round(x1 - x0));
    c.height = Math.min(b.VH - c.y, Math.round(y1 - y0));
    pack['t' + t] = { clip: c, pouch: b.pouch, ammo: a, AD_REST };
    await crop(`pix-lance-t${t}-ON`, c);
    await setVis('fx-spark4', false);
    await crop(`pix-lance-t${t}-OFF`, c);
    await setVis('fx-spark4', true);
  }
  await writeFile(path.join(OUT, 'pix-pack.json'), JSON.stringify(pack, null, 2));
  say('lance_pairs', Object.keys(pack));

  /* -------- 5. the blind-candidate full frame, and a 40px source -------- */
  await setup();
  await crop('pix-blind-t0-FULL', { x: 0, y: 0, width: 1280, height: 720 });
  await setup(); await game('await SS.seek(40);');
  await crop('pix-blind-t40-FULL', { x: 0, y: 0, width: 1280, height: 720 });
  await setup(); await game('await SS.seek(80);');
  await crop('pix-blind-t80-FULL', { x: 0, y: 0, width: 1280, height: 720 });

  console.log('### DONE');
};
