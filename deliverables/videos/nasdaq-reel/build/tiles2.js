// square brand-colour tiles with white marks (app-icon look), 600x600
const puppeteer=require('puppeteer-core'),path=require('path'),fs=require('fs');
const L=[['tesla','#CC0000','#ffffff',0.62],['apple','#111111','#ffffff',0.6],['microsoft','#2B2B2B',null,0.56],['nvidia','#76B900','#ffffff',0.66],['google','#4285F4','#ffffff',0.6],['amazon','#232F3E','#ffffff',0.78],['meta','#0467DF','#ffffff',0.64]];
(async()=>{const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox','--allow-file-access-from-files','--hide-scrollbars']});
const p=await b.newPage();await p.setViewport({width:600,height:600});
for(const [n,bg,fg,s] of L){let svg=fs.readFileSync(path.join(__dirname,'..','logos',`c_${n}.svg`),'utf8').replace(/<\?xml[^>]*>/,'');
 if(fg){ svg=svg.replace(/fill="#[0-9a-fA-F]{3,6}"/g,(m)=>/ff9900|f90|ff9a00/i.test(m)?m:`fill="${fg}"`).replace(/fill:#[0-9a-fA-F]{3,6}/g,(m)=>/ff9900|f90/i.test(m)?m:`fill:${fg}`); if(!/fill=/.test(svg.split('>')[0])&&!/<path[^>]*fill/.test(svg)) svg=svg.replace('<svg',`<svg fill="${fg}"`); }
 await p.setContent(`<html><body style="margin:0;width:600px;height:600px;background:${bg};display:flex;align-items:center;justify-content:center"><div style="width:${Math.round(600*s)}px;height:${Math.round(600*s)}px;display:flex;align-items:center;justify-content:center">${svg.replace('<svg','<svg style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet"')}</div></body></html>`);
 await new Promise(r=>setTimeout(r,150)); await p.screenshot({path:path.join(__dirname,'..','tiles',`${String(L.findIndex(x=>x[0]==n)+1).padStart(2,'0')}-${n}.png`)});}
await b.close();console.log('brand tiles done')})();
