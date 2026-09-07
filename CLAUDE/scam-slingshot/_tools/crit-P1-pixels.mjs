import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const D = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/scam-slingshot/_shots/P1/r1';
const uri = async (f) => `data:image/png;base64,${(await readFile(path.join(D,f))).toString('base64')}`;
const files = ['07-rest-ammo-WITH-bands.png','08-rest-ammo-NO-bands.png',
               '12-stretch-ammo-WITH-bands.png','13-stretch-ammo-NO-bands.png',
               '06-rest-sling-crop.png','09-rest-band-NOAMMO.png','14-stretch-band-NOAMMO.png',
               '01-rest-full.png'];
const srcs = {}; for (const f of files) srcs[f] = await uri(f);
const b = await puppeteer.launch({ headless: 'shell', args:['--no-sandbox'] });
const p = await b.newPage();
await p.setContent('<canvas id=c></canvas>');
const out = await p.evaluate(async (srcs) => {
  const load = (s) => new Promise(r => { const i = new Image(); i.onload=()=>r(i); i.src=s; });
  const px = async (s) => { const im = await load(s); const c=document.createElement('canvas');
    c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0); return { w:c.width, h:c.height, d:g.getImageData(0,0,c.width,c.height).data }; };
  const at = (I,x,y) => { const i=(y*I.w+x)*4; return [I.d[i],I.d[i+1],I.d[i+2]]; };
  const lin = v => { v/=255; return v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  const Y = ([r,g,bb]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(bb);
  const Lstar = (y) => y>0.008856 ? 116*Math.cbrt(y)-16 : 903.3*y;
  const hue = ([r,g,bb]) => { r/=255;g/=255;bb/=255; const mx=Math.max(r,g,bb),mn=Math.min(r,g,bb),d=mx-mn;
    if(!d) return null; let h = mx===r? ((g-bb)/d)%6 : mx===g? (bb-r)/d+2 : (r-g)/d+4; h*=60; if(h<0)h+=360; return +h.toFixed(1); };
  const sat = ([r,g,bb]) => { r/=255;g/=255;bb/=255; const mx=Math.max(r,g,bb),mn=Math.min(r,g,bb); return mx? +((mx-mn)/mx).toFixed(3):0; };

  const res = {};

  /* --- occlusion: diff WITH-bands vs NO-bands inside the ammo silhouette ---- */
  const occl = async (withB, noB, name) => {
    const A = await px(withB), B = await px(noB);
    // ammo silhouette in the NO-bands image = teal-ish pixels (hue 140-200, sat>0.15) + its dark ink + gold ring + eyes
    // safer: flood the ammo by colour distance to teal core, then add pixels enclosed.
    let sil = 0, changed = 0, samples = [];
    const isAmmo = (c) => { const h = hue(c), s = sat(c);
      return (h!==null && h>=140 && h<=200 && s>0.25) ;};
    for (let y=0;y<B.h;y++) for (let x=0;x<B.w;x++) {
      const c = at(B,x,y);
      if (!isAmmo(c)) continue;
      sil++;
      const a = at(A,x,y);
      const dd = Math.abs(a[0]-c[0])+Math.abs(a[1]-c[1])+Math.abs(a[2]-c[2]);
      if (dd > 40) changed++;
    }
    res[name] = { tealSilhouettePx: sil, coveredPx: changed, occludedPct: sil? +(changed/sil*100).toFixed(1):null };
  };
  await occl(srcs['07-rest-ammo-WITH-bands.png'], srcs['08-rest-ammo-NO-bands.png'], 'occlusion_rest');
  await occl(srcs['12-stretch-ammo-WITH-bands.png'], srcs['13-stretch-ammo-NO-bands.png'], 'occlusion_stretch');

  /* --- band vs fork colour, sampled from the WITH-bands crop --------------- */
  const A = await px(srcs['07-rest-ammo-WITH-bands.png']);
  // histogram of every colour in the crop
  const hist = new Map();
  for (let y=0;y<A.h;y++) for (let x=0;x<A.w;x++) {
    const c = at(A,x,y); const k = c.join(',');
    hist.set(k, (hist.get(k)||0)+1);
  }
  const top = [...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,18).map(([k,n])=>{
    const c = k.split(',').map(Number);
    return { rgb:'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''), n, Y:+Y(c).toFixed(4), L:+Lstar(Y(c)).toFixed(1), hue:hue(c), sat:sat(c) };
  });
  res.rest_crop_top_colours = top;

  /* explicit probes: band strap pixel, fork wood pixel */
  const probe = (I, x, y, tag) => { const c = at(I,x,y); return { tag, xy:[x,y], rgb:'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''),
     Y:+Y(c).toFixed(4), L:+Lstar(Y(c)).toFixed(1), hue:hue(c), sat:sat(c) }; };
  // crop is 184x122 (css 92x61 @2x). maroon strap is around (110,40); fork wood left post ~ (40,60); right prong ~ (130,20)
  res.probes = [probe(A,110,40,'maroon-strap'), probe(A,118,44,'maroon-strap2'),
                probe(A,68,58,'brown-pouch'), probe(A,40,70,'fork-left-post'),
                probe(A,132,18,'fork-right-prong'), probe(A,95,100,'fork-crotch'),
                probe(A,10,10,'sky')];
  return res;
}, srcs);
console.log(JSON.stringify(out, null, 2));
await b.close();
