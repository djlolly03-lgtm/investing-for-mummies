/** CRITIC P1 r6 — part D. Does the draw stay inside the frame? (desktop + --mobile) */
export default async ({ shot, game, aimPx, dragShot, state }) => {
  const log = (k, v) => console.log('#', k, JSON.stringify(v));
  const g = () => game(`
    const w=SS.__world,s=w.sling,V3=w.camera.position.constructor;
    const r=w.renderer.domElement.getBoundingClientRect();
    const P=(x,y)=>{const v=new V3(x,y,0).project(w.camera);
      return {x:+((v.x*.5+.5)*r.width).toFixed(1),y:+((-v.y*.5+.5)*r.height).toFixed(1)};};
    const a=s.ammo||(w.projectiles||[])[0];
    // rendered bbox of the ammo mesh
    let bb=null;
    if (a&&a.mesh){ a.mesh.updateWorldMatrix(true,true); const pts=[];
      a.mesh.traverse(n=>{ if(!n.isMesh||!n.geometry) return; const gg=n.geometry; gg.computeBoundingBox();
        const b=gg.boundingBox; for(const X of [b.min.x,b.max.x]) for(const Y of [b.min.y,b.max.y]) for(const Z of [b.min.z,b.max.z])
          pts.push(new V3(X,Y,Z).applyMatrix4(n.matrixWorld)); });
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      for(const p of pts){const v=p.clone().project(w.camera);
        const sx=(v.x*.5+.5)*r.width, sy=(-v.y*.5+.5)*r.height;
        x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);}
      bb={x0:+x0.toFixed(1),x1:+x1.toFixed(1),y0:+y0.toFixed(1),y1:+y1.toFixed(1)};
    }
    return { view:{w:r.width,h:r.height}, drawn:+s.drawn.toFixed(3), pouchPx:P(s.pouch.x,s.pouch.y),
      ammoBBoxPx:bb, offLeftPx: bb? +(0-bb.x0).toFixed(1) : null,
      leftMarginPct: bb? +(100*bb.x0/r.width).toFixed(2) : null };`);

  await game('SS.seed(11); await SS.seek(1500);');
  log('rest', await g());
  for (const [ang, pw] of [[0.30, 0.60], [0.30, 0.95], [0.30, 1.00], [0.62, 1.00], [0.05, 1.00]]) {
    await game('SS.seed(11); await SS.seek(1500);');
    await dragShot(ang, pw, { steps: 10 });
    log(`draw_${ang}_${pw}`, await g());
    await shot(`draw-${ang}-${pw}`);
  }
};
