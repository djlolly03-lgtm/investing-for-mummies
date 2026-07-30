// Generic reel builder. Usage: node make-reel.js <gameKey>|all
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const CFG = require('./reel-config.js');

const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const S = `${R}/shots`, OUT = `${R}/out`;
const LOGO = 'http://localhost:7799/ifm-round-t.png';
const FPS = 30;
const sh = c => execSync(c, { stdio:['ignore','ignore','pipe'] });
const grad = s => s.replace(/\*(.+?)\*/g, '<span class="grad">$1</span>');

function overlayHTML(cfg) {
  const t = cfg.theme;
  const ovs = cfg.beats.filter(b => b.ov).map((b,i) => `
    <div class="ov ${b.ov.pos}" id="ov${i}">
      <div class="scrim ${b.ov.pos}"></div>
      <img class="wm" src="${LOGO}">
      <div class="box ${b.ov.pos}">
        <div class="kicker">${b.ov.kicker}</div>
        <div class="big">${grad(b.ov.big)}</div>
        <div class="sub">${b.ov.sub}</div>
      </div>
    </div>`).join('');
  const endLines = cfg.endLines.map(l=>`<div>${l}</div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
   :root{--accA:${t.accA};--accB:${t.accB}}
   *{margin:0;padding:0;box-sizing:border-box;font-family:'Space Grotesk',sans-serif}
   html,body{background:transparent}
   .ov{width:1080px;height:1920px;position:relative;overflow:hidden;color:#fff;background:transparent}
   .scrim{position:absolute;left:0;right:0;height:680px}
   .scrim.top{top:0;background:linear-gradient(180deg,rgba(5,6,12,.85),rgba(5,6,12,0))}
   .scrim.bottom{bottom:0;background:linear-gradient(0deg,rgba(5,6,12,.9),rgba(5,6,12,0))}
   .wm{position:absolute;top:50px;right:52px;width:116px;height:116px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))}
   .box{position:absolute;left:70px;right:70px}
   .box.top{top:150px}
   .box.bottom{bottom:165px}
   .kicker{font-size:33px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:var(--accA);margin-bottom:18px}
   .big{font-size:104px;font-weight:700;line-height:.99;letter-spacing:-2px;text-shadow:0 6px 30px rgba(0,0,0,.6)}
   .grad{background:linear-gradient(100deg,var(--accA),var(--accB));-webkit-background-clip:text;background-clip:text;color:transparent}
   .sub{font-size:44px;font-weight:500;color:rgba(255,255,255,.9);margin-top:26px;text-shadow:0 4px 16px rgba(0,0,0,.6)}
   /* end card */
   #end{width:1080px;height:1920px;position:relative;overflow:hidden;color:#fff;
     background:radial-gradient(120% 80% at 50% 0%, ${t.a} 0%, ${t.b} 62%, #050507 100%);
     display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px}
   #end .logo{width:270px;height:270px;margin-bottom:54px;filter:drop-shadow(0 12px 50px rgba(0,0,0,.5))}
   #end .etitle{font-size:104px;font-weight:700;letter-spacing:-2px;line-height:1}
   #end .ecta{font-size:48px;font-weight:600;margin-top:30px}
   #end .esub{font-size:36px;font-weight:500;color:rgba(255,255,255,.72);margin-top:14px}
   #end .eurl{margin-top:60px;font-size:44px;font-weight:700}
  </style></head><body>
  ${ovs}
  <div id="end">
    <img class="logo" src="${LOGO}">
    <div class="etitle">${endLines}</div>
    <div class="ecta grad">${cfg.endCta}</div>
    <div class="esub">${cfg.endSub}</div>
    <div class="eurl">${cfg.url}</div>
  </div></body></html>`;
}

function zoompan(zdir, frames) {
  const x = `iw/2-(iw/zoom/2)`;
  if (zdir === 'down') return `zoompan=z='min(zoom+0.0009,1.14)':d=${frames}:x='${x}':y='ih/2-(ih/zoom/2)+on*0.6':s=1080x1920:fps=${FPS}`;
  if (zdir === 'up')   return `zoompan=z='min(zoom+0.0009,1.14)':d=${frames}:x='${x}':y='ih/2-(ih/zoom/2)-on*0.6':s=1080x1920:fps=${FPS}`;
  return `zoompan=z='min(zoom+0.0011,1.18)':d=${frames}:x='${x}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}`;
}

async function build(key) {
  const cfg = CFG[key];
  if (!cfg) throw new Error('no config: ' + key);
  // normalize beat durations to exactly 15.0s total (hard cuts => sum = total)
  const tot = cfg.beats.reduce((s,b)=>s+b.dur,0);
  const f = 15.0 / tot;
  cfg.beats.forEach(b => { b.dur = Math.round(b.dur*f*100)/100; });
  // fix rounding drift on the last beat
  const drift = 15.0 - cfg.beats.reduce((s,b)=>s+b.dur,0);
  cfg.beats[cfg.beats.length-1].dur = Math.round((cfg.beats[cfg.beats.length-1].dur+drift)*100)/100;
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));

  // 1) render overlays
  const browser = await puppeteer.launch({ headless:'new',
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{ width:1080, height:1920, deviceScaleFactor:1 } });
  const page = await browser.newPage();
  await page.setContent(overlayHTML(cfg), { waitUntil:'networkidle2' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 800));
  let oi = 0;
  for (let i=0;i<cfg.beats.length;i++){
    if (!cfg.beats[i].ov) continue;
    const el = await page.$('#ov'+oi);
    await el.screenshot({ path:`${TMP}/ov${i}.png`, omitBackground:true });
    oi++;
  }
  await (await page.$('#end')).screenshot({ path:`${TMP}/end.png` });
  await browser.close();

  // 2) build beats
  const segs = [];
  cfg.beats.forEach((b,i) => {
    const out = `${TMP}/seg${i}.mp4`;
    const dur = b.dur, fr = Math.round(dur*FPS);
    const COMMON = `-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -an`;
    if (b.kind === 'video') {
      const ss = b.ss ? `-ss ${b.ss} ` : '';
      sh(`ffmpeg -y ${ss}-i "${b.src}" -loop 1 -framerate ${FPS} -t ${dur} -i "${TMP}/ov${i}.png" -filter_complex `+
        `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${FPS},trim=0:${dur},setpts=PTS-STARTPTS[v];`+
        `[1:v]format=rgba,fade=in:st=0.15:d=0.35:alpha=1[o];[v][o]overlay=0:0,format=yuv420p[x]" -map "[x]" -t ${dur} ${COMMON} "${out}"`);
    } else if (b.kind === 'ui') {
      sh(`ffmpeg -y -loop 1 -t ${dur} -i "${b.src}" -loop 1 -framerate ${FPS} -t ${dur} -i "${TMP}/ov${i}.png" -filter_complex `+
        `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,scale=2160:3840,${zoompan(b.zdir,fr)},trim=0:${dur},setpts=PTS-STARTPTS[v];`+
        `[1:v]format=rgba,fade=in:st=0.15:d=0.35:alpha=1[o];[v][o]overlay=0:0,format=yuv420p[x]" -map "[x]" -t ${dur} ${COMMON} "${out}"`);
    } else if (b.kind === 'end') {
      sh(`ffmpeg -y -loop 1 -t ${dur} -i "${TMP}/end.png" -vf "scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':d=${fr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},format=yuv420p" -t ${dur} ${COMMON} "${out}"`);
    }
    segs.push(out);
  });

  // 3) concat + audio bed
  fs.writeFileSync(`${TMP}/list.txt`, segs.map(s=>`file '${s}'`).join('\n'));
  sh(`ffmpeg -y -f concat -safe 0 -i "${TMP}/list.txt" -c copy "${TMP}/silent.mp4"`);
  const final = `${OUT}/${key}-15s.mp4`;
  sh(`ffmpeg -y -i "${TMP}/silent.mp4" -stream_loop 5 -i "${cfg.audio}" -filter_complex `+
     `"[1:a]atrim=0:15,asetpts=N/SR/TB,afade=in:st=0:d=0.6,afade=out:st=14.2:d=0.8,volume=1.0[a]" `+
     `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`);
  fs.rmSync(TMP, { recursive:true, force:true });
  const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${final}"`).toString().trim();
  console.log(`OK ${key} -> ${path.basename(final)} (${d}s)`);
}

(async () => {
  const arg = process.argv[2] || 'all';
  const keys = arg === 'all' ? Object.keys(CFG) : [arg];
  for (const k of keys) {
    try { await build(k); } catch(e){ console.log(`FAIL ${k}: ${e.message.split('\n')[0]}`); }
  }
  console.log('ALL DONE');
})();
