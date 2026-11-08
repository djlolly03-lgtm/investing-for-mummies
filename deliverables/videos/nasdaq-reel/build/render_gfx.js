// usage: node render_gfx.js scenes.json   -> gfx/<id>/f00000.png ...  (alpha scenes as PNG with transparency, solid as JPEG)
const puppeteer=require('puppeteer-core'),path=require('path'),fs=require('fs');
const scenes=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const only=process.argv[3]?process.argv[3].split(','):null; const STEP=parseInt(process.env.STEP||'1');
(async()=>{
  const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',
    args:['--no-sandbox','--disable-gpu-vsync','--force-device-scale-factor=1','--allow-file-access-from-files','--hide-scrollbars','--disable-dev-shm-usage']});
  const p=await b.newPage(); await p.setViewport({width:1080,height:1920,deviceScaleFactor:1});
  await p.goto('file://'+path.join(__dirname,'gfx.html')); await p.waitForFunction('window.READY===true'); await p.evaluateHandle('document.fonts.ready');
  await new Promise(r=>setTimeout(r,300));
  for(const s of scenes){ if(only&&!only.includes(s.id)) continue;
    const out=path.join(__dirname,'gfx',s.id); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
    const n=Math.round(s.dur*30); await p.evaluate(`SET(${JSON.stringify(s)})`); const t0=Date.now();
    for(let f=0;f<n;f+=STEP){ await p.evaluate(`SEEK(${f})`);
      if(s.alpha) await p.screenshot({path:path.join(out,`f${String(f).padStart(5,'0')}.png`),omitBackground:true});
      else await p.screenshot({path:path.join(out,`f${String(f).padStart(5,'0')}.jpg`),type:'jpeg',quality:93}); }
    console.log(s.id,n,'frames',((Date.now()-t0)/1000).toFixed(0)+'s');
  }
  await b.close();
})();
