const PRE = `
const w = SS.__world; const cam = w.camera;
const VW = window.innerWidth, VH = window.innerHeight;
const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
 return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
const proj=(x,y,z)=>{let p=applyM(cam.matrixWorldInverse,[x,y,z]);p=applyM(cam.projectionMatrix,p);return [(p[0]*0.5+0.5)*VW,(-p[1]*0.5+0.5)*VH];};
const bboxScreen=(obj)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;obj.updateWorldMatrix(true,true);
 obj.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;if(!g)return;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;
 for(const cx of [b.min.x,b.max.x])for(const cy of [b.min.y,b.max.y])for(const cz of [b.min.z,b.max.z]){
  const wp=applyM(o.matrixWorld,[cx,cy,cz]);const s=proj(wp[0],wp[1],wp[2]);
  if(s[0]<x0)x0=s[0];if(s[0]>x1)x1=s[0];if(s[1]<y0)y0=s[1];if(s[1]>y1)y1=s[1];}});
 return {x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2};};
`;
export default async ({ page, game, OUT }) => {
  const G = (b,...a)=>game(PRE+b,...a);
  const four = async (tag) => {
    const bb = await G(`return bboxScreen(w.sling.ammo.mesh);`);
    const p = Math.max(20, bb.h*0.7);
    const clip = { x: Math.max(0,Math.round(bb.x0-p)), y: Math.max(0,Math.round(bb.y0-p)) };
    clip.width = Math.min(1280-clip.x, Math.round(bb.w+p*2));
    clip.height = Math.min(720-clip.y, Math.round(bb.h+p*2));
    console.log('### clip_'+tag, JSON.stringify({bb, clip}));
    const S = async (n) => { await page.screenshot({ path: `${OUT}/${tag}-${n}.png`, clip }); };
    await S('A-ammo+bands');
    await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=false;}); SS.stepOnce(); return 1;`);
    await S('B-ammo-nobands');
    await G(`w.sling.ammo.mesh.visible=false; SS.stepOnce(); return 1;`);
    await S('C-noammo-nobands');
    await G(`w.sling.bands.forEach(b=>{b.tube.group.visible=true;}); SS.stepOnce(); return 1;`);
    await S('D-bands-noammo');
    await G(`w.sling.ammo.mesh.visible=true; SS.stepOnce(); return 1;`);
  };
  await game('SS.seed(7); await SS.seek(2000);');
  await four('rest');
  await G(`await SS.aim({angle:0.60,power:0.5}); await SS.seek(400); return 1;`);
  await four('half');
  await G(`await SS.aim({angle:0.60,power:1.0}); await SS.seek(400); return 1;`);
  await four('full');
};
