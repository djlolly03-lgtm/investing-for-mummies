const puppeteer=require(require('child_process').execSync('npm root -g').toString().trim()+'/puppeteer');
const path=require('path'),fs=require('fs');
(async()=>{
  const mode=process.argv[2]; // "stills t1,t2,..." or "frames"
  const browser=await puppeteer.launch({headless:true,args:['--allow-file-access-from-files','--force-color-profile=srgb']});
  const page=await browser.newPage();
  await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
  await page.goto('file://'+path.resolve('brag.html'),{waitUntil:'networkidle0'});
  await page.evaluate(()=>window.ready);
  await new Promise(r=>setTimeout(r,300));
  if(mode==='stills'){
    fs.mkdirSync('stills',{recursive:true});
    for(const t of process.argv[3].split(',').map(Number)){
      await page.evaluate(t=>render(t),t);
      await page.screenshot({path:`stills/t${t.toFixed(2)}.png`});
    }
  }else{
    fs.mkdirSync('frames',{recursive:true});
    const N=Math.round(21*30);
    for(let f=0;f<N;f++){
      await page.evaluate(t=>render(t),f/30);
      await page.screenshot({path:`frames/f${String(f).padStart(4,'0')}.png`});
    }
  }
  await browser.close();
})();
