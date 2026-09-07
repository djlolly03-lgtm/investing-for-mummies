import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const D='/Users/lollyg/Documents/investing for Mummies/CLAUDE/scam-slingshot/_shots/P1/r1-occl';
const uri=async f=>`data:image/png;base64,${(await readFile(path.join(D,f))).toString('base64')}`;
const tags=['rest','half','full'];
const srcs={};
for(const t of tags) for(const n of ['A-ammo+bands','B-ammo-nobands','C-noammo-nobands','D-bands-noammo'])
  srcs[`${t}-${n}`]=await uri(`${t}-${n}.png`);
const b=await puppeteer.launch({headless:'shell',args:['--no-sandbox']});
const p=await b.newPage(); await p.setContent('<div></div>');
const out=await p.evaluate(async (srcs,tags)=>{
  const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
  const px=async s=>{const im=await load(s);const c=document.createElement('canvas');
    c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0);return{w:c.width,h:c.height,d:g.getImageData(0,0,c.width,c.height).data};};
  const at=(I,i)=>[I.d[i],I.d[i+1],I.d[i+2]];
  const dist=(a,c)=>Math.abs(a[0]-c[0])+Math.abs(a[1]-c[1])+Math.abs(a[2]-c[2]);
  const res={};
  for(const t of tags){
    const A=await px(srcs[t+'-A-ammo+bands']), B=await px(srcs[t+'-B-ammo-nobands']),
          C=await px(srcs[t+'-C-noammo-nobands']);
    let sil=0,occ=0;
    for(let i=0;i<B.d.length;i+=4){
      const bb=at(B,i), cc=at(C,i);
      if(dist(bb,cc)<=18) continue;         // pixel unchanged by the ammo -> not silhouette
      sil++;
      const aa=at(A,i);
      if(dist(aa,bb)>18) occ++;             // band changed this silhouette pixel -> occluded
    }
    res[t]={silhouettePx:sil,occludedPx:occ,occludedPct:sil?+(occ/sil*100).toFixed(1):null,
            imgW:B.w,imgH:B.h};
  }
  return res;
},srcs,tags);
console.log(JSON.stringify(out,null,2));
await b.close();
