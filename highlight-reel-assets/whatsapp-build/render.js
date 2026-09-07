const puppeteer=require('puppeteer-core');const path=require('path');const fs=require('fs');
const NAME=process.argv[2], MODE=process.argv[3]||'preview';
const OUT=path.join(__dirname,`out/${NAME}_${MODE}`);
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new',args:['--no-sandbox','--disable-gpu-vsync','--force-device-scale-factor=1',
      '--allow-file-access-from-files','--hide-scrollbars','--disable-dev-shm-usage']});
  const p=await b.newPage();
  p.on('console',m=>{if(m.type()==='error')console.log('PAGE ERR',m.text())});
  await p.setViewport({width:1080,height:1920,deviceScaleFactor:1});
  await p.goto('file://'+path.join(__dirname,`timeline${NAME}.html`));
  await p.waitForFunction('window.READY===true',{timeout:300000});
  const total=await p.evaluate('window.TOTAL');
  console.log(NAME,'total frames:',total,`(${(total/30).toFixed(1)}s)`);
  const frames = MODE==='preview'
    ? Array.from({length:24},(_,i)=>Math.round(i*(total-1)/23))
    : Array.from({length:total},(_,i)=>i);
  const t0=Date.now();
  for(const f of frames){
    await p.evaluate(`SEEK(${f})`);
    await p.screenshot({path:path.join(OUT,`f${String(f).padStart(5,'0')}.jpg`),type:'jpeg',quality:92});
    if(MODE==='full'&&f%300===0)console.log(` ${f}/${total} ${((Date.now()-t0)/1000).toFixed(0)}s`);
  }
  console.log('done',((Date.now()-t0)/1000).toFixed(0)+'s');
  await b.close();
})();
