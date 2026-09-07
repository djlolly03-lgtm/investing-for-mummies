const P = `
const w = SS.__world;
const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
 return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,0];};
const bb=(obj)=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,n=0;obj.updateWorldMatrix(true,true);
 obj.traverse(o=>{if(!o.isMesh||o.visible===false)return;const g=o.geometry;if(!g)return;
  if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;n++;
  for(const cx of[b.min.x,b.max.x])for(const cy of[b.min.y,b.max.y])for(const cz of[b.min.z,b.max.z]){
   const p=applyM(o.matrixWorld,[cx,cy,cz]);if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}});
 return n?{w:+(x1-x0).toFixed(3),h:+(y1-y0).toFixed(3)}:null;};
`;
export default async function ({ page, game }) {
  const G=(b)=>page.evaluate(new Function(`const SS=window.SS; ${P} return (async()=>{${b}})();`));
  await game('SS.seed(7); await SS.seek(1500);');
  const r = await G(`
    const s=w.sling;
    // unrotated ammo: aim at angle 0 so long axis is horizontal
    await SS.aim({angle:0.0, power:0.0}); await SS.seek(200);
    const flat = bb(s.ammo.mesh);
    await SS.aim({angle:0.60, power:1.0}); await SS.seek(200);
    const drawn = bb(s.ammo.mesh);
    const vs = w.villains.map(v=>({ r:v.radius, ...bb(v.mesh) }));
    const blocks = w.blocks.slice(0,4).map(b=>({w:b.w,h:b.h}));
    return { ammoRadius: s.ammo.radius, ammoFlat: flat, ammoDrawn: drawn, villains: vs, blocks };
  `);
  console.log(JSON.stringify(r,null,1));
}
