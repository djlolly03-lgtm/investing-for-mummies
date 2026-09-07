/**
 * P4 — camera & composition measurement.
 * Manual projection (the camera is axis-aligned: pos (cx,cy,d), lookAt (cx,cy,0)),
 * plus a pixel scan of the rendered frame for the real visual horizon / ground line.
 */
const PROBE = `
  const w = SS.__world, cam = w.camera, rig = w.rig, L = w.level;
  const t = Math.tan(cam.fov * Math.PI/180 / 2);
  const cx = cam.position.x, cy = cam.position.y, d = cam.position.z;
  const halfH = d * t, halfW = halfH * cam.aspect;
  const px = (x) => ((x - cx) / halfW * 0.5 + 0.5) * 100;
  const py = (y) => (0.5 - (y - cy) / halfH * 0.5) * 100;
  let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;
  for (const b of L.blocks) {
    bx0=Math.min(bx0,b.x-b.w/2); bx1=Math.max(bx1,b.x+b.w/2);
    by0=Math.min(by0,b.y-b.h/2); by1=Math.max(by1,b.y+b.h/2);
  }
  const vills = w.villains.filter(v=>v.alive).map(v=>{
    const p=v.position(); const R=v.radius;
    return { x:+p.x.toFixed(2), y:+p.y.toFixed(2),
             cxPct:+px(p.x).toFixed(1), cyPct:+py(p.y).toFixed(1),
             wPct:+(px(p.x+R)-px(p.x-R)).toFixed(2),
             hPct:+(py(p.y-R)-py(p.y+R)).toFixed(2) };
  });
  const stdBlock = L.blocks.find(b=>b.mat==='wood'&&b.h>1) || L.blocks[1];
  return {
    aspect:+cam.aspect.toFixed(3), fov:cam.fov,
    rig:{ mode:rig.mode, x:+rig.pos.x.toFixed(2), y:+rig.pos.y.toFixed(2), dist:+rig.dist.toFixed(2),
          hw:+(rig._hw||0).toFixed(2), hh:+(rig._hh||0).toFixed(2) },
    worldView:{ xMin:+(cx-halfW).toFixed(2), xMax:+(cx+halfW).toFixed(2),
                yMin:+(cy-halfH).toFixed(2), yMax:+(cy+halfH).toFixed(2),
                widthUnits:+(halfW*2).toFixed(2) },
    slingBaseXPct:+px(0).toFixed(1),
    slingForkTopPctH:+py(3.28).toFixed(1),
    slingWidthPct:+(px(0.60)-px(-0.60)).toFixed(1),
    groundLinePctH:+py(0).toFixed(1),
    eyeLevelPctH:+py(cy).toFixed(1),
    structure:{ leftPctW:+px(bx0).toFixed(1), rightPctW:+px(bx1).toFixed(1),
                topPctH:+py(by1).toFixed(1), botPctH:+py(by0).toFixed(1),
                hPct:+(py(by0)-py(by1)).toFixed(1), wPct:+(px(bx1)-px(bx0)).toFixed(1) },
    furthestTargetPctW:+px(Math.max(bx1, ...w.villains.filter(v=>v.alive).map(v=>v.position().x))).toFixed(1),
    blockWidthPct:+(px(stdBlock.w)-px(0)).toFixed(2),
    villains: vills,
    skyAboveTallestPctH:+py(by1).toFixed(1),
  };
`;

/** Scan the rendered canvas for the strongest horizontal luminance edge in the top 80%. */
async function scanHorizon(page) {
  const b64 = await page.screenshot({ encoding: 'base64' });
  return page.evaluate(async (data) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // sample a column strip in the far left 6% (usually pure background, no gameplay)
    const X0 = Math.floor(img.width * 0.02), X1 = Math.floor(img.width * 0.08);
    const rows = [];
    for (let y = 0; y < img.height; y++) {
      const d = g.getImageData(X0, y, X1 - X0, 1).data;
      let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
      rows.push(s / ((X1 - X0)));
    }
    let best = 0, bestY = 0;
    for (let y = 4; y < img.height - 4; y++) {
      const dl = Math.abs(rows[y+3] - rows[y-3]);
      if (dl > best) { best = dl; bestY = y; }
    }
    // also: topmost row where luminance changes by >6 vs the row 8px below (band edges)
    const edges = [];
    for (let y = 4; y < img.height - 8; y++) {
      const dl = Math.abs(rows[y+4] - rows[y-4]);
      if (dl > 5) edges.push({ pctH: +(y / img.height * 100).toFixed(1), d: +dl.toFixed(1) });
    }
    const merged = [];
    for (const e of edges) { if (!merged.length || e.pctH - merged[merged.length-1].pctH > 1.2) merged.push(e);
                             else if (e.d > merged[merged.length-1].d) merged[merged.length-1] = e; }
    return { strongestEdgePctH: +(bestY / img.height * 100).toFixed(1), delta: +best.toFixed(1),
             bandEdges: merged.slice(0, 12) };
  }, b64);
}

export default async ({ shot, game, filmstrip, page }) => {
  await game('await SS.seed(3); await SS.seek(1500);');
  console.log('AIM   ', JSON.stringify(await game(PROBE)));
  console.log('BANDS ', JSON.stringify(await scanHorizon(page)));
  await shot('aim-rest');

  await game('SS.aim({angle:0.55,power:1.0}); await SS.seek(450);');
  console.log('DRAWN ', JSON.stringify(await game(PROBE)));
  await shot('aim-drawn');

  await game('return SS.release();');
  await filmstrip('flight', { from: 60, to: 900, step: 120, cols: 4 });
  console.log('FLIGHT', JSON.stringify(await game(PROBE)));
};
