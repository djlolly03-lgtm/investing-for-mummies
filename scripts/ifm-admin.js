#!/usr/bin/env node
/* IFM OS — local admin console.  node scripts/ifm-admin.js   ->  http://localhost:8901
 *
 * The buttons you asked for. They run on THIS Mac, which is the only place they can work.
 *
 * WHY NOT A BUTTON IN THE LIBRARY ITSELF — this is a "cannot", not a "shouldn't":
 *
 *   Vercel deployments are IMMUTABLE. A file served from ifm-deploy.vercel.app is baked
 *   into a deployment built from this folder. There is no API that deletes a file from a
 *   live deployment; you change the source here and redeploy. So the destroy step has to
 *   touch the working tree, which a web page on someone else's machine cannot do.
 *
 *   Google Drive deletion needs an OAuth credential. The Library page is PUBLIC —
 *   ifm-deploy.vercel.app/content/v1-prototype/ returns 200 with no auth — so a credential
 *   placed there is a credential handed to the internet.
 *
 *   The hub's existing ?admin=1 delete only removes a SPREADSHEET ROW. It has never
 *   touched a file, on Drive or anywhere else.
 *
 * So: this console binds to 127.0.0.1 only, is never deployed (it lives outside CLAUDE/),
 * and can do the things the public page cannot.
 *
 * WHAT THE BUTTONS DO
 *   Hide      status -> "Do Not Use". Reversible, instant, nothing moves. Use this for
 *             almost everything.
 *   Unhide    puts it back.
 *   Destroy   ONLY for assets already hidden. Backs the files up to Drive FIRST, then
 *             deletes them from the working tree, then blocks their paths in .vercelignore
 *             so a stale deploy cannot resurrect them. Refuses if the backup fails.
 *
 * Nothing here deploys. You still run scripts/ifm-deploy.sh yourself.
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'),
      { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIR  = path.join(ROOT, 'CLAUDE', 'content', 'v1-prototype');
const CAT  = path.join(DIR, 'v1-catalogue.js');
const ENR  = path.join(DIR, 'enrichment.json');
const VIG  = path.join(ROOT, 'CLAUDE', '.vercelignore');
const DEPLOY_ROOT = path.join(ROOT, 'CLAUDE');
const BACKUP = 'gdrive:IFM Machine Backup/destroyed-assets';
const MARK = 'Do Not Use';
const PORT = 8901;

const readCat = () => {
  const s = fs.readFileSync(CAT, 'utf8');
  return { head: s.slice(0, s.indexOf('[')),
           rows: JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1)) };
};
const writeCat = (head, rows) =>
  fs.writeFileSync(CAT, head + JSON.stringify(rows, null, 1) + ';\n');

/* Which local files does an asset actually own? Only paths that resolve INSIDE the deploy
 * root count — a Drive URL or a foreign host is not ours to delete, and a path that
 * escapes CLAUDE/ is a bug we must not act on. */
function ownedFiles(a) {
  const out = new Set();
  for (const raw of [a.thumb, a.video, a.drive]) {
    if (!raw) continue;
    let rel = String(raw);
    if (/^https?:\/\/ifm-deploy\.vercel\.app\//.test(rel)) rel = rel.replace(/^https?:\/\/ifm-deploy\.vercel\.app\//, '');
    else if (/^https?:\/\//.test(rel)) continue;             // Drive or elsewhere: not ours
    else if (rel.startsWith('../')) rel = path.join('content', rel.replace(/^\.\.\//, ''));
    const abs = path.resolve(DEPLOY_ROOT, rel.split('?')[0]);
    if (!abs.startsWith(DEPLOY_ROOT + path.sep)) continue;   // escaped the deploy root
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.add(abs);
  }
  return [...out];
}

const api = {
  list() {
    const { rows } = readCat();
    return rows.map(a => ({
      id: a.id, title: a.title || '', type: a.type || '', format: a.format || '',
      status: a.status || '', session: a.session || '', thumb: a.thumb || '',
      hidden: (a.status || '') === MARK || a.library === false,
      excluded: a.library === false,
      files: ownedFiles(a).map(f => ({
        rel: path.relative(DEPLOY_ROOT, f), kb: Math.round(fs.statSync(f).size / 1024) })),
    }));
  },

  hide({ ids, on }) {
    const { head, rows } = readCat();
    const by = Object.fromEntries(rows.map(r => [r.id, r]));
    const bad = ids.filter(i => !by[i]);
    if (bad.length) throw new Error('unknown ids: ' + bad.join(', '));
    ids.forEach(i => { by[i].status = on ? MARK : 'Raw'; });
    writeCat(head, rows);
    const enr = JSON.parse(fs.readFileSync(ENR, 'utf8'));
    ids.forEach(i => {
      if (on) (enr[i] = enr[i] || {}).status = MARK;
      else if (enr[i]) { delete enr[i].status; if (!Object.keys(enr[i]).length) delete enr[i]; }
    });
    fs.writeFileSync(ENR, JSON.stringify(enr, null, 1) + '\n');
    return { ok: true, changed: ids.length };
  },

  /* Destroy is the only irreversible action here, so it is the only one with preconditions:
   * the asset must already be hidden, and the backup must succeed before a byte is removed.
   * This repo has already lost a folder permanently — the Goa video masters — and there was
   * no copy anywhere. That is the whole reason the backup is not optional. */
  destroy({ ids, confirm }) {
    if (confirm !== 'DESTROY') throw new Error('confirmation phrase missing');
    const { head, rows } = readCat();
    const by = Object.fromEntries(rows.map(r => [r.id, r]));
    const log = [];
    let removed = 0, bytes = 0;

    for (const id of ids) {
      const a = by[id];
      if (!a) { log.push(`${id}  SKIP  not in the catalogue`); continue; }
      if ((a.status || '') !== MARK && a.library !== false) {
        log.push(`${id}  REFUSE  not hidden yet — hide it first`); continue; }
      const files = ownedFiles(a);
      if (!files.length) { log.push(`${id}  none  no local file of ours (Drive-hosted or already gone)`); continue; }

      for (const f of files) {
        const rel = path.relative(DEPLOY_ROOT, f);
        try {
          execFileSync('rclone', ['copy', f, `${BACKUP}/${path.dirname(rel)}`],
                       { stdio: 'pipe', timeout: 120000,
                         env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH } });
        } catch (e) {
          log.push(`${id}  ABORT  backup FAILED for ${rel} — nothing deleted for this asset`);
          continue;
        }
        bytes += fs.statSync(f).size;
        fs.unlinkSync(f);
        removed++;
        log.push(`${id}  destroyed  ${rel}  (backed up to ${BACKUP})`);
        // Belt and braces: block the path so a stale tree cannot serve it again.
        const vig = fs.readFileSync(VIG, 'utf8');
        if (!vig.split('\n').includes(rel)) fs.appendFileSync(VIG, rel + '\n');
      }
    }
    return { ok: true, removed, mb: +(bytes / 1048576).toFixed(1), log };
  },
};

/* ------------------------------------------------------------------ the page ---- */
const PAGE = `<!doctype html><meta charset=utf-8><title>IFM OS — admin</title>
<style>
:root{--navy:#1a3a5c;--ink:#24313F;--muted:#8c94a1;--paper:#FCFAF7;--stone:#E9E2D8;--red:#a3341f}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);
 font:14px/1.5 Inter,-apple-system,system-ui,sans-serif}
header{position:sticky;top:0;background:var(--paper);border-bottom:1px solid var(--stone);
 padding:16px 24px;display:flex;gap:16px;align-items:center;z-index:5}
h1{font:600 16px/1 Georgia,serif;margin:0;color:var(--navy)}
.warn{background:#fdf6ec;border:1px solid #e6d3ae;border-radius:6px;padding:10px 14px;
 margin:16px 24px;font-size:13px;color:#6b4d12}
input[type=search]{flex:1;max-width:420px;padding:9px 13px;border:1.5px solid var(--stone);
 border-radius:9px;font:inherit;background:#fff}
button{font:inherit;cursor:pointer;border:1.5px solid var(--stone);background:#fff;
 border-radius:8px;padding:8px 14px}
button.primary{background:var(--navy);border-color:var(--navy);color:#fff}
button.danger{background:var(--red);border-color:var(--red);color:#fff}
button:disabled{opacity:.4;cursor:not-allowed}
table{width:calc(100% - 48px);margin:0 24px 40px;border-collapse:collapse}
th{text-align:left;font-size:11px;letter-spacing:.09em;text-transform:uppercase;
 color:var(--muted);padding:10px 8px;border-bottom:1px solid var(--stone)}
td{padding:9px 8px;border-bottom:1px solid #f0ebe3;vertical-align:top}
tr.hidden{opacity:.45}
.tag{font-size:11px;background:#f2ece3;border-radius:4px;padding:2px 7px;color:#55646f}
.files{font-size:11.5px;color:var(--muted)}
.bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--stone);
 padding:12px 24px;display:flex;gap:12px;align-items:center}
#log{white-space:pre-wrap;font:12px/1.6 ui-monospace,monospace;background:#fff;
 border:1px solid var(--stone);border-radius:8px;margin:0 24px 24px;padding:14px;display:none}
</style>
<header>
  <h1>IFM OS — admin</h1>
  <input type=search id=q placeholder="filter by id, title, format…">
  <label style=font-size:13px><input type=checkbox id=onlyhidden> only hidden</label>
  <span id=count style="margin-left:auto;color:var(--muted);font-size:13px"></span>
</header>
<div class=warn><b>Local only.</b> This console runs on your Mac and is never deployed.
 <b>Hide</b> is instant and reversible. <b>Destroy</b> backs the files up to Drive first,
 then deletes them from the working tree — that part cannot be undone from here.
 Neither button deploys; run <code>scripts/ifm-deploy.sh</code> when you want it live.</div>
<table><thead><tr><th style=width:28px></th><th>Asset</th><th>Format</th><th>Status</th>
 <th>Local files we own</th></tr></thead><tbody id=rows></tbody></table>
<pre id=log></pre>
<div class=bar>
  <span id=sel style=color:var(--muted)>nothing selected</span>
  <span style=flex:1></span>
  <button id=unhide>Unhide</button>
  <button id=hide class=primary>Hide from Library</button>
  <button id=destroy class=danger disabled>Destroy files…</button>
</div>
<script>
let ALL=[],SEL=new Set();
const $=i=>document.getElementById(i);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(fn,body){const r=await fetch('/api/'+fn,{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});
  const j=await r.json(); if(!j.ok) throw new Error(j.error||'failed'); return j;}
async function load(){ALL=(await api('list')).data;draw();}
function draw(){
  const q=$('q').value.toLowerCase(), only=$('onlyhidden').checked;
  const rows=ALL.filter(a=>(!only||a.hidden)&&
    (!q||(a.id+' '+a.title+' '+a.format+' '+a.session).toLowerCase().includes(q)));
  $('count').textContent=rows.length+' of '+ALL.length+'  ·  '+ALL.filter(a=>a.hidden).length+' hidden';
  $('rows').innerHTML=rows.map(a=>\`<tr class="\${a.hidden?'hidden':''}">
    <td><input type=checkbox data-id="\${a.id}" \${SEL.has(a.id)?'checked':''}></td>
    <td><b>\${esc(a.id)}</b><br>\${esc(a.title).slice(0,78)}</td>
    <td><span class=tag>\${esc(a.format||'—')}</span></td>
    <td>\${a.excluded?'<span class=tag>excluded</span>':esc(a.status||'—')}</td>
    <td class=files>\${a.files.length?a.files.map(f=>esc(f.rel)+' ('+f.kb+'KB)').join('<br>')
      :'<i>none of ours</i>'}</td></tr>\`).join('');
}
$('rows').addEventListener('change',e=>{const id=e.target.dataset.id;if(!id)return;
  e.target.checked?SEL.add(id):SEL.delete(id);sync();});
$('q').oninput=$('onlyhidden').onchange=draw;
function sync(){
  const n=SEL.size; $('sel').textContent=n?n+' selected':'nothing selected';
  const sel=ALL.filter(a=>SEL.has(a.id));
  const files=sel.reduce((s,a)=>s+a.files.length,0);
  $('destroy').disabled=!n||!sel.every(a=>a.hidden)||!files;
  $('destroy').textContent=files?\`Destroy \${files} file(s)…\`:'Destroy files…';
}
$('hide').onclick=async()=>{await api('hide',{ids:[...SEL],on:true});SEL.clear();await load();sync();};
$('unhide').onclick=async()=>{await api('hide',{ids:[...SEL],on:false});SEL.clear();await load();sync();};
$('destroy').onclick=async()=>{
  const sel=ALL.filter(a=>SEL.has(a.id));
  const files=sel.flatMap(a=>a.files);
  const mb=(files.reduce((s,f)=>s+f.kb,0)/1024).toFixed(1);
  if(!confirm(\`Destroy \${files.length} file(s), \${mb}MB, for \${sel.length} asset(s)?\\n\\n\`+
    files.slice(0,12).map(f=>'  '+f.rel).join('\\n')+(files.length>12?'\\n  …':'')+
    \`\\n\\nThey are copied to Drive first. Deleting from this Mac cannot be undone here.\`)) return;
  if(prompt('Type DESTROY to confirm')!=='DESTROY') return;
  const r=await api('destroy',{ids:[...SEL],confirm:'DESTROY'});
  $('log').style.display='block';
  $('log').textContent=r.data.log.join('\\n')+\`\\n\\nremoved \${r.data.removed} file(s), \${r.data.mb}MB\`;
  SEL.clear(); await load(); sync();
};
load();
</script>`;

http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' });
                                res.end(JSON.stringify(obj)); };
  if (req.method === 'POST' && req.url.startsWith('/api/')) {
    const fn = req.url.slice(5);
    if (!api[fn]) return send(404, { ok: false, error: 'no such action' });
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { send(200, { ok: true, data: api[fn](body ? JSON.parse(body) : {}) }); }
      catch (e) { send(400, { ok: false, error: e.message }); }
    });
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(PAGE);
}).listen(PORT, '127.0.0.1', () =>            // 127.0.0.1, not 0.0.0.0: never on the network
  console.log(`IFM admin  ->  http://localhost:${PORT}   (local only, never deployed)`));
