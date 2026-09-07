/** crit-P1-r2d.mjs — sizes/speeds of the launch burst particles, in AD, at true ms. */
const P = `
const w = SS.__world; const cam = w.camera;
const VW=window.innerWidth, VH=window.innerHeight;
const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
 return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
const proj=(x,y,z)=>{let p=applyM(cam.matrixWorldInverse,[x,y,z||0]);p=applyM(cam.projectionMatrix,p);
 return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
const bboxScreen=(o)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,m=0;o.updateWorldMatrix(true,true);
 o.traverse(q=>{if(!q.isMesh)return;const g=q.geometry;if(!g)return;if(!g.boundingBox)g.computeBoundingBox();
  const b=g.boundingBox;if(!b)return;m++;for(const a of[b.min.x,b.max.x])for(const c of[b.min.y,b.max.y])for(const d of[b.min.z,b.max.z]){
   const wp=applyM(q.matrixWorld,[a,c,d]);const s=proj(wp[0],wp[1],wp[2]);
   if(s[0]<x0)x0=s[0];if(s[0]>x1)x1=s[0];if(s[1]<y0)y0=s[1];if(s[1]>y1)y1=s[1];}});
 return m?{x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}:null;};
const pxPerWorld = () => { const a=proj(0,0,0), b=proj(1,0,0); return Math.abs(b[0]-a[0]); };
`;
export default async ({ game, state, OUT }) => {
  const G = (b, ...a) => game(P + b, ...a);
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  const AD = await G(`const b=bboxScreen(w.sling.ammo.mesh); return {h:+b.h.toFixed(2), w:+b.w.toFixed(2)};`);
  say('AD_at_rest', AD);
  await G(`await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); return 1;`);
  const r = await G(`
    const s = w.sling; const rel = await SS.release();
    const out = []; const stops=[0,25,50,75,100];
    let acc=0;
    for (let i=0;i<stops.length;i++) {
      if (i>0) { await SS.seek(stops[i]-stops[i-1]); acc = stops[i]; }
      const k = pxPerWorld();
      const pool = w.fx.pools.chip, P2 = pool.p;
      const ps = proj(s.pouch.x, s.pouch.y, 0);
      const p0 = w.projectiles?.[0]; const am = p0?.mesh ? bboxScreen(p0.mesh) : null;
      const rows = [];
      for (let j=0;j<pool.max;j++) if (P2.life[j]>0) {
        const sp = proj(P2.x[j], P2.y[j], P2.z[j]);
        rows.push({ dx:+(sp[0]-ps[0]).toFixed(1),
                    lenPx:+(Math.max(P2.sx[j],P2.sy[j])*k).toFixed(2),
                    minPx:+(Math.min(P2.sx[j],P2.sy[j])*k).toFixed(2),
                    v:+Math.hypot(P2.vx[j],P2.vy[j]).toFixed(2) });
      }
      rows.sort((a,b)=>b.dx-a.dx);
      const lens = rows.map(q=>q.lenPx).sort((a,b)=>a-b);
      out.push({ t:acc, n:rows.length,
        pouchX:+ps[0].toFixed(1), ammoX: am? +am.cx.toFixed(1):null,
        headDx: rows[0]?.dx, ammoDx: am? +(am.cx-ps[0]).toFixed(1):null,
        reachPct: (rows[0]&&am)? +(100*rows[0].dx/(am.cx-ps[0])).toFixed(1):null,
        gapPx: (rows[0]&&am)? +((am.cx-ps[0])-rows[0].dx).toFixed(1):null,
        lenMedian: lens[Math.floor(lens.length/2)], lenMax: lens[lens.length-1], lenMin: lens[0],
        vMax:+Math.max(...rows.map(q=>q.v)).toFixed(2),
        vMedian:+rows.map(q=>q.v).sort((a,b)=>a-b)[Math.floor(rows.length/2)].toFixed(2),
        exitSpeed: rel.exitSpeed, cruise: rel.speed });
    }
    return out;
  `);
  say('burst_geometry', r);
  say('burst_len_in_AD', r.map(x => ({ t: x.t, medianLen_AD: +(x.lenMedian / AD.h).toFixed(3), maxLen_AD: +(x.lenMax / AD.h).toFixed(3) })));
  say('gap_in_AD', r.map(x => ({ t: x.t, reachPct: x.reachPct, gap_AD: x.gapPx != null ? +(x.gapPx / AD.h).toFixed(2) : null })));
};
