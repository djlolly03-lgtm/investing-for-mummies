// Veteran reel engine v2: fast cuts, punch-zooms, pans, shake, slide-in kinetic text.
// Reuses existing footage (ZERO new credits). Usage: node make-reel2.js <key>
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const { execSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const CFG = require('./reel-config2.js');
const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const OUT = `${R}/out`; const LOGO = 'http://localhost:7799/ifm-round-t.png';
const sh = c => execSync(c, { stdio:['ignore','ignore','pipe'] });
const grad = s => s.replace(/\*(.+?)\*/g, '<span class="grad">$1</span>');

// ---- kinetic text PNG (full-frame, transparent) ----
function textHTML(cfg, t) {
  const th = cfg.theme;
  const pos = t.pos === 'top' ? 'top:150px' : (t.pos==='center'?'top:50%;transform:translateY(-50%)':'bottom:175px');
  const scrim = t.pos==='top'
    ? 'background:linear-gradient(180deg,rgba(5,6,12,.82),rgba(5,6,12,0));top:0;height:640px'
    : (t.pos==='center'?'background:radial-gradient(60% 35% at 50% 50%,rgba(5,6,12,.7),transparent);inset:0'
    : 'background:linear-gradient(0deg,rgba(5,6,12,.9),rgba(5,6,12,0));bottom:0;height:680px');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Archivo+Black&display=swap" rel="stylesheet">
  <style>html,body{margin:0;background:transparent}*{font-family:'Space Grotesk',sans-serif;box-sizing:border-box}
  .f{width:1080px;height:1920px;position:relative;overflow:hidden;color:#fff}
  .scrim{position:absolute;left:0;right:0;${scrim}}
  .wm{position:absolute;top:48px;right:50px;width:108px;height:108px;filter:drop-shadow(0 6px 16px rgba(0,0,0,.6))}
  .box{position:absolute;left:64px;right:64px;${pos}}
  .k{font-size:32px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:${th.accA};margin-bottom:16px}
  .b{font-family:'Archivo Black',sans-serif;font-size:${t.size||112}px;line-height:.92;letter-spacing:-2px;text-shadow:0 6px 28px rgba(0,0,0,.65)}
  .grad{background:linear-gradient(100deg,${th.accA},${th.accB});-webkit-background-clip:text;background-clip:text;color:transparent}
  .s{font-size:42px;font-weight:600;color:rgba(255,255,255,.92);margin-top:22px;text-shadow:0 4px 14px rgba(0,0,0,.6)}
  </style></head><body><div class="f"><div class="scrim"></div><img class="wm" src="${LOGO}">
  <div class="box">${t.kicker?`<div class="k">${t.kicker}</div>`:''}<div class="b">${grad(t.big)}</div>${t.sub?`<div class="s">${t.sub}</div>`:''}</div></div></body></html>`;
}
function endHTML(cfg){ const t=cfg.theme; const lines=cfg.endLines.map(l=>`<div>${l}</div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Archivo+Black&display=swap" rel="stylesheet">
  <style>html,body{margin:0}*{font-family:'Space Grotesk',sans-serif;box-sizing:border-box}
  #e{width:1080px;height:1920px;position:relative;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;
  background:radial-gradient(120% 80% at 50% 0%, ${t.a} 0%, ${t.b} 62%, #050507 100%)}
  .lg{width:262px;height:262px;margin-bottom:50px;filter:drop-shadow(0 12px 50px rgba(0,0,0,.5))}
  .t{font-family:'Archivo Black',sans-serif;font-size:108px;line-height:.92;letter-spacing:-2px}
  .c{font-size:48px;font-weight:700;margin-top:28px}
  .grad{background:linear-gradient(100deg,${t.accA},${t.accB});-webkit-background-clip:text;background-clip:text;color:transparent}
  .su{font-size:35px;font-weight:500;color:rgba(255,255,255,.72);margin-top:12px}
  .u{margin-top:56px;font-size:44px;font-weight:700}
  </style></head><body><div id="e"><img class="lg" src="${LOGO}"><div class="t">${lines}</div>
  <div class="c grad">${cfg.endCta}</div><div class="su">${cfg.endSub}</div><div class="u">${cfg.url}</div></div></body></html>`;
}

// ---- ffmpeg motion (operates on a 1080x1920 30fps [v]; N = frame count) ----
function motion(name, N) {
  const pre = `scale=1620:2880,`;
  const cx = `iw/2-(iw/zoom/2)`, cy = `ih/2-(ih/zoom/2)`;
  const zp = (z,x,y)=>`${pre}zoompan=d=1:s=1080x1920:fps=30:z='${z}':x='${x||cx}':y='${y||cy}'`;
  switch(name){
    case 'punchin':  return zp(`min(1.0+0.24*sqrt(in/${N}),1.24)`);
    case 'punchin2': return zp(`min(1.0+0.34*sqrt(in/${N}),1.34)`);
    case 'punchout': return zp(`max(1.26-0.24*sqrt(in/${N}),1.0)`);
    case 'panL':     return zp(`1.14`, `(iw-iw/zoom)*(in/${N})`, cy);
    case 'panR':     return zp(`1.14`, `(iw-iw/zoom)*(1-in/${N})`, cy);
    case 'panU':     return zp(`1.16`, cx, `(ih-ih/zoom)*(in/${N})`);
    case 'shake':    return zp(`1.10`, `${cx}+18*sin(in/1.6)`, `${cy}+15*cos(in/1.9)`);
    case 'drift':    return zp(`min(1.0+0.12*(in/${N}),1.12)`);
    default:         return zp(`1.06`);
  }
}

async function build(key){
  const cfg = CFG[key]; if(!cfg) throw new Error('no cfg '+key);
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(),'r2-'));
  // normalize shot durations to fill 15s incl end card
  const endDur = cfg.endDur||2.3;
  const shotTot = cfg.shots.reduce((s,x)=>s+x.dur,0);
  const f = (15.0-endDur)/shotTot;
  cfg.shots.forEach(s=>s.dur=Math.round(s.dur*f*1000)/1000);

  // render text PNGs + end card
  const br = await puppeteer.launch({ headless:'new', executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--no-sandbox','--disable-dev-shm-usage'], defaultViewport:{width:1080,height:1920,deviceScaleFactor:1}});
  const pg = await br.newPage();
  const texts = {};
  for (const s of cfg.shots) if (s.text && !(s.text.id in texts)) {
    await pg.setContent(textHTML(cfg, s.text), {waitUntil:'networkidle2'});
    await pg.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,400));
    const p=`${TMP}/txt_${s.text.id}.png`; await (await pg.$('.f')).screenshot({path:p,omitBackground:true}); texts[s.text.id]=p;
  }
  await pg.setContent(endHTML(cfg), {waitUntil:'networkidle2'}); await pg.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,400));
  await (await pg.$('#e')).screenshot({path:`${TMP}/end.png`});
  await br.close();

  // build shots
  const segs=[];
  cfg.shots.forEach((s,i)=>{
    const out=`${TMP}/s${i}.mp4`, N=Math.max(2,Math.round(s.dur*30));
    const COMMON='-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -an';
    const hasTxt=!!s.text;
    let inputs, vsrc;
    if (s.type==='img'){ inputs=`-loop 1 -t ${s.dur} -i "${s.src}"`; vsrc=`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=0:${s.dur},setpts=PTS-STARTPTS[v]`; }
    else { const ss=s.in?`-ss ${s.in} `:''; inputs=`${ss}-t ${s.dur} -i "${s.src}"`; vsrc=`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=0:${s.dur},setpts=PTS-STARTPTS[v]`; }
    let fc=`${vsrc};[v]${motion(s.motion,N)}[m]`;
    let map='[m]';
    if (hasTxt){
      const dir=s.text.tdir||'up'; const sgn=dir==='down'?'-':'';
      const yexpr=`if(lt(t,0.32), ${sgn}48*(1-t/0.32), 0)`;
      const xexpr= dir==='left'?`if(lt(t,0.32), 60*(1-t/0.32), 0)`: dir==='right'?`if(lt(t,0.32), -60*(1-t/0.32), 0)`:`0`;
      inputs+=` -loop 1 -framerate 30 -t ${s.dur} -i "${texts[s.text.id]}"`;
      fc+=`;[1:v]format=rgba,fade=in:st=0:d=0.2:alpha=1[t];[m][t]overlay=x='${xexpr}':y='${yexpr}'[o]`;
      map='[o]';
    }
    fc+=`;${map}format=yuv420p[x]`;
    sh(`ffmpeg -y ${inputs} -filter_complex "${fc}" -map "[x]" -t ${s.dur} ${COMMON} "${out}"`);
    segs.push(out);
  });
  // end card (gentle)
  const eN=Math.round(endDur*30);
  sh(`ffmpeg -y -loop 1 -t ${endDur} -i "${TMP}/end.png" -vf "scale=1188:2112,zoompan=d=1:s=1080x1920:fps=30:z='min(1.0+0.05*(in/${eN}),1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p" -t ${endDur} -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -an "${TMP}/end.mp4"`);
  segs.push(`${TMP}/end.mp4`);

  fs.writeFileSync(`${TMP}/list.txt`, segs.map(s=>`file '${s}'`).join('\n'));
  sh(`ffmpeg -y -f concat -safe 0 -i "${TMP}/list.txt" -c copy "${TMP}/silent.mp4"`);
  const final=`${OUT}/${key}-v2-15s.mp4`;
  sh(`ffmpeg -y -i "${TMP}/silent.mp4" -stream_loop 6 -i "${cfg.audio}" -filter_complex "[1:a]atrim=0:15,asetpts=N/SR/TB,afade=in:st=0:d=0.5,afade=out:st=14.2:d=0.8[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`);
  fs.rmSync(TMP,{recursive:true,force:true});
  console.log(`OK ${key} -> ${path.basename(final)} (${execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${final}"`).toString().trim()}s, ${cfg.shots.length} cuts)`);
}
(async()=>{ for(const k of (process.argv[2]==='all'?Object.keys(CFG):[process.argv[2]])) { try{await build(k);}catch(e){console.log('FAIL',k,e.message.split('\n')[0]);} } console.log('DONE'); })();
