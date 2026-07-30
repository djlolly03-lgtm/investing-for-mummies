// Reel engine v3 — Matrix / Barbie styles, <=0.7s cuts, big kinetic type, B-roll grade.
// Usage: node make-reel3.js <key>
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const { execSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const CFG = require('./reel-config3.js');
const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const OUT = `${R}/out`; const LOGO = 'http://localhost:7799/ifm-round-t.png';
let EMIT=false; const CMDS=[];
const sh = c => { if(EMIT){ CMDS.push(c); return; } execSync(c, { stdio:['ignore','ignore','pipe'] }); };
const grad = s => s.replace(/\*(.+?)\*/g, '<span class="grad">$1</span>');

const STYLE = {
  matrix: {
    font:"'Share Tech Mono', monospace", fontEnd:"'Share Tech Mono', monospace",
    fg:'#00ff41', accA:'#00ff41', accB:'#7dffaf', glow:'0 0 18px rgba(0,255,65,.85),0 0 40px rgba(0,255,65,.4)',
    bg_a:'#021006', bg_b:'#000400', kprefix:'>> ',
    fxImg:'format=gray,lutrgb=r=0:b=0,eq=contrast=1.28:brightness=0.02:gamma=0.95',
    fxVid:'format=gray,lutrgb=r=0:b=0,eq=contrast=1.22:brightness=0.0',
    blend:0.42,
  },
  barbie: {
    font:"'Archivo Black', sans-serif", fontEnd:"'Archivo Black', sans-serif",
    fg:'#fff', accA:'#ff2d9b', accB:'#ffd1ec', glow:'0 0 22px rgba(255,45,155,.7),0 4px 10px rgba(0,0,0,.35)',
    bg_a:'#ff5fb6', bg_b:'#c01277', kprefix:'',
    fxImg:'eq=saturation=1.55:contrast=1.05:brightness=0.06,colorbalance=rs=0.10:rm=0.12:rh=0.18:bm=0.05',
    fxVid:'eq=saturation=1.55:contrast=1.04:brightness=0.05,colorbalance=rs=0.10:rm=0.12:rh=0.18:bm=0.05',
    blend:0.30,
  },
};

function textHTML(cfg, t){ const k=STYLE[cfg.styleKind]; const th=cfg.theme;
  const pos = t.pos==='top'?'top:140px':(t.pos==='center'?'top:50%;transform:translateY(-50%)':'bottom:175px');
  const scrim = t.pos==='top'?'background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);top:0;height:620px'
    :(t.pos==='center'?'background:radial-gradient(60% 34% at 50% 50%,rgba(0,0,0,.6),transparent);inset:0'
    :'background:linear-gradient(0deg,rgba(0,0,0,.8),transparent);bottom:0;height:660px');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>html,body{margin:0;background:transparent}*{box-sizing:border-box}
  .f{width:1080px;height:1920px;position:relative;overflow:hidden;color:${k.fg}}
  .scrim{position:absolute;left:0;right:0;${scrim}}
  .wm{position:absolute;top:46px;right:48px;width:104px;height:104px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.7))${cfg.styleKind==='matrix'?' hue-rotate(80deg) saturate(1.4)':''}}
  .box{position:absolute;left:60px;right:60px;${pos};text-align:${cfg.styleKind==='barbie'?'center':'left'}}
  .k{font-family:${k.font};font-size:34px;letter-spacing:${cfg.styleKind==='matrix'?'2px':'4px'};text-transform:uppercase;color:${k.accA};margin-bottom:14px;text-shadow:${k.glow}}
  .b{font-family:${k.font};font-weight:${cfg.styleKind==='barbie'?'400':'400'};font-size:${t.size||120}px;line-height:.9;letter-spacing:-1px;text-transform:${cfg.styleKind==='matrix'?'uppercase':'none'};text-shadow:${k.glow}}
  .grad{color:${k.accA}}
  .s{font-family:${cfg.styleKind==='matrix'?k.font:"'Archivo Black',sans-serif"};font-size:40px;color:#fff;margin-top:20px;text-shadow:${k.glow}}
  </style></head><body><div class="f"><div class="scrim"></div><img class="wm" src="${LOGO}">
  <div class="box">${t.kicker?`<div class="k">${k.kprefix}${t.kicker}</div>`:''}<div class="b">${grad(t.big)}</div>${t.sub?`<div class="s">${t.sub}</div>`:''}</div></div></body></html>`;
}
function endHTML(cfg){ const k=STYLE[cfg.styleKind]; const lines=cfg.endLines.map(l=>`<div>${l}</div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>html,body{margin:0}*{box-sizing:border-box}
  #e{width:1080px;height:1920px;position:relative;color:${k.fg};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;
  background:radial-gradient(120% 80% at 50% 40%, ${k.bg_a} 0%, ${k.bg_b} 60%, #000 100%)}
  .lg{width:250px;height:250px;margin-bottom:46px;filter:drop-shadow(0 10px 40px rgba(0,0,0,.6))${cfg.styleKind==='matrix'?' hue-rotate(80deg) saturate(1.3)':''}}
  .t{font-family:${k.font};font-size:104px;line-height:.9;text-shadow:${k.glow};text-transform:${cfg.styleKind==='matrix'?'uppercase':'none'}}
  .c{font-family:${k.font};font-size:46px;margin-top:26px;color:${k.accA};text-shadow:${k.glow}}
  .su{font-family:'Archivo Black',sans-serif;font-size:32px;color:#fff;margin-top:14px;opacity:.85}
  .u{font-family:${k.font};margin-top:50px;font-size:42px;color:#fff;text-shadow:${k.glow}}
  </style></head><body><div id="e"><img class="lg" src="${LOGO}"><div class="t">${lines}</div>
  <div class="c">${cfg.endCta}</div><div class="su">${cfg.endSub}</div><div class="u">${cfg.url}</div></div></body></html>`;
}

function motion(name, N){ const pre='scale=1404:2496,'; const cx='iw/2-(iw/zoom/2)', cy='ih/2-(ih/zoom/2)';
  const zp=(z,x,y)=>`${pre}zoompan=d=1:s=1080x1920:fps=30:z='${z}':x='${x||cx}':y='${y||cy}'`;
  switch(name){
    case 'punchin': return zp(`min(1.0+0.26*sqrt(in/${N}),1.26)`);
    case 'punchin2':return zp(`min(1.0+0.38*sqrt(in/${N}),1.38)`);
    case 'punchout':return zp(`max(1.28-0.26*sqrt(in/${N}),1.0)`);
    case 'panL':    return zp(`1.16`,`(iw-iw/zoom)*(in/${N})`,cy);
    case 'panR':    return zp(`1.16`,`(iw-iw/zoom)*(1-in/${N})`,cy);
    case 'panU':    return zp(`1.18`,cx,`(ih-ih/zoom)*(in/${N})`);
    case 'shake':   return zp(`1.12`,`${cx}+22*sin(in/1.4)`,`${cy}+18*cos(in/1.7)`);
    default:        return zp(`min(1.0+0.12*(in/${N}),1.12)`);
  }
}

async function build(key){
  const cfg=CFG[key]; if(!cfg) throw new Error('no cfg '+key);
  const k=STYLE[cfg.styleKind];
  const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'r3-'));
  const ASSETS=`${R}/assets3/${key}`; fs.mkdirSync(ASSETS,{recursive:true});
  const mode=process.argv[3]||'all';   // 'text' | 'video' | 'script' | 'spec' | 'all'
  EMIT=(mode==='script');
  if(mode==='spec'){ const kk=STYLE[cfg.styleKind]; const seen={}, txt=[];
    for(const s of cfg.shots) if(s.text && !seen[s.text.id]){ seen[s.text.id]=1; txt.push(s.text); }
    process.stdout.write(JSON.stringify({key, styleKind:cfg.styleKind, accA:kk.accA, accB:kk.accB, bg_a:kk.bg_a, bg_b:kk.bg_b, url:cfg.url, kprefix:kk.kprefix, texts:txt, end:{lines:cfg.endLines, cta:cfg.endCta, sub:cfg.endSub}}));
    fs.rmSync(TMP,{recursive:true,force:true}); return; }
  const endDur=cfg.endDur||2.2;
  const tot=cfg.shots.reduce((s,x)=>s+x.dur,0); const f=(15.0-endDur)/tot;
  cfg.shots.forEach(s=>s.dur=Math.min(0.7, Math.round(s.dur*f*1000)/1000)); // cap 0.7s
  const used=cfg.shots.reduce((s,x)=>s+x.dur,0); const realEnd=Math.max(endDur, 15.0-used);

  const texts={}; for(const s of cfg.shots) if(s.text) texts[s.text.id]=`${ASSETS}/t_${s.text.id}.png`;
  if(mode==='text'||mode==='all'){  // render text + end card art (cached to disk)
    const br=await puppeteer.launch({headless:'new',executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1080,height:1920,deviceScaleFactor:1}});
    const pg=await br.newPage(); const done={};
    for(const s of cfg.shots) if(s.text && !(s.text.id in done)){ done[s.text.id]=1;
      await pg.setContent(textHTML(cfg,s.text),{waitUntil:'networkidle2'}); await pg.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,300));
      await (await pg.$('.f')).screenshot({path:texts[s.text.id],omitBackground:true});
    }
    await pg.setContent(endHTML(cfg),{waitUntil:'networkidle2'}); await pg.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,300));
    await (await pg.$('#e')).screenshot({path:`${ASSETS}/end.png`}); await br.close();
    console.log('text art ->', key);
    if(mode==='text'){ fs.rmSync(TMP,{recursive:true,force:true}); return; }
  }

  const segs=[];
  cfg.shots.forEach((s,i)=>{
    const out=`${TMP}/s${i}.mp4`, N=Math.max(2,Math.round(s.dur*30));
    const COMMON='-c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p -an';
    const isBroll = s.type==='broll';
    const srcPath = isBroll ? cfg.broll : s.src;
    let inputs, norm;
    if(s.type==='img'){ inputs=`-loop 1 -t ${s.dur} -i "${srcPath}"`; }
    else { const ss=s.in?`-ss ${s.in} `:''; inputs=`${ss}-t ${s.dur} -i "${srcPath}"`; }
    norm=`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=0:${s.dur},setpts=PTS-STARTPTS[v]`;
    let fc=`${norm};[v]${motion(s.motion,N)}[m]`;
    let cur='[m]', inIdx=1;
    // style grade
    const fx = (s.type==='img'?k.fxImg:k.fxVid);
    fc+=`;[m]${fx}[g]`; cur='[g]';
    // blend B-roll texture (optional; skip on pure broll shots) — off by default for speed
    if(!isBroll && cfg.blendBroll){
      inputs+=` -stream_loop -1 -t ${s.dur} -i "${cfg.broll}"`;
      fc+=`;[${inIdx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=gbrp[rb];${cur}format=gbrp[gg];[gg][rb]blend=all_mode=screen:all_opacity=${k.blend},format=yuv420p[bl]`;
      cur='[bl]'; inIdx++;
    }
    // text
    if(s.text){
      const dir=s.text.tdir||'up'; const sgn=dir==='down'?'-':'';
      const yexpr=`if(lt(t,0.28), ${sgn}44*(1-t/0.28), 0)`;
      inputs+=` -loop 1 -framerate 30 -t ${s.dur} -i "${texts[s.text.id]}"`;
      fc+=`;[${inIdx}:v]format=rgba,fade=in:st=0:d=0.16:alpha=1[tx];${cur}[tx]overlay=x=0:y='${yexpr}'[o]`;
      cur='[o]';
    }
    fc+=`;${cur}format=yuv420p[x]`;
    sh(`ffmpeg -y ${inputs} -filter_complex "${fc}" -map "[x]" -t ${s.dur} ${COMMON} "${out}"`);
    segs.push(out);
  });
  const eN=Math.round(realEnd*30);
  sh(`ffmpeg -y -loop 1 -t ${realEnd} -i "${ASSETS}/end.png" -vf "scale=1188:2112,zoompan=d=1:s=1080x1920:fps=30:z='min(1.0+0.05*(in/${eN}),1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p" -t ${realEnd} -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p -an "${TMP}/end.mp4"`);
  segs.push(`${TMP}/end.mp4`);
  fs.writeFileSync(`${TMP}/list.txt`, segs.map(s=>`file '${s}'`).join('\n'));
  sh(`ffmpeg -y -f concat -safe 0 -i "${TMP}/list.txt" -c copy "${TMP}/silent.mp4"`);
  const final=`${OUT}/${key}-v3-15s.mp4`;
  sh(`ffmpeg -y -i "${TMP}/silent.mp4" -stream_loop 6 -i "${cfg.audio}" -filter_complex "[1:a]atrim=0:15,asetpts=N/SR/TB,afade=in:st=0:d=0.4,afade=out:st=14.3:d=0.7[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`);
  if(EMIT){ console.log(CMDS.join('\n')); return; }
  fs.rmSync(TMP,{recursive:true,force:true});
  console.log(`OK ${key} [${cfg.styleKind}] -> ${path.basename(final)} (${execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${final}"`).toString().trim()}s, ${cfg.shots.length} cuts)`);
}
(async()=>{ const m=process.argv[3]; for(const key of (process.argv[2]==='all'?Object.keys(CFG):[process.argv[2]])){ try{await build(key);}catch(e){console.error('FAIL',key,e.message.split('\n').slice(0,2).join(' | '));} } if(m!=='spec'&&m!=='script') console.log('DONE'); })();
