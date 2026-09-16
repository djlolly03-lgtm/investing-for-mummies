// Local static server for visual QA of CLAUDE/content. DEV ONLY.
// Deliberately OUTSIDE CLAUDE/ — that folder is the Vercel deploy root, and anything
// left in it ships. Run via .claude/launch.json ("ifm-os-prototype"), or:
//   node scripts/dev-serve-content.js   ->  http://localhost:8899/v1-prototype/
const http=require('http'),fs=require('fs'),p=require('path');
const ROOT=require('path').resolve(__dirname,'..','CLAUDE','content');  // so ../thumbs resolves
const TYPE={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let f=decodeURIComponent(req.url.split('?')[0]);
  if(f==='/'||f.endsWith('/'))f+='index.html';
  const full=p.join(ROOT,f);
  if(!full.startsWith(ROOT)){res.writeHead(403).end();return;}
  fs.readFile(full,(e,d)=>{
    if(e){res.writeHead(404,{'content-type':'text/plain'}).end('404');return;}
    res.writeHead(200,{'content-type':TYPE[p.extname(full).toLowerCase()]||'application/octet-stream',
      'cache-control':'no-store'}).end(d);
  });
}).listen(8899,()=>console.log('serving '+ROOT+' on http://localhost:8899'));
