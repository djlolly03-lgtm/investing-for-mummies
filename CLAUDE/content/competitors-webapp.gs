/**
 * IFM Content Hub — Competitors write endpoint
 * Lets the dashboard (at /content/?admin=1) ADD and DELETE competitor rows
 * in the "IFM Competitors — tracker" Google Sheet, without opening the sheet.
 *
 * ONE-TIME SETUP (do this once):
 *   1. Go to https://script.google.com  → New project
 *   2. Delete the sample code, paste ALL of this file in, Save.
 *   3. Deploy → New deployment → type "Web app"
 *        - Execute as: Me (djlolly03@gmail.com)
 *        - Who has access: Anyone
 *      → Deploy → Authorize → copy the Web app URL (ends in /exec)
 *   4. On the hub at /content/?admin=1, the first Add/Delete asks for that URL.
 *      Paste it once — it's saved in your browser. Done.
 *
 * Re-deploying after edits: Deploy → Manage deployments → edit → Version: New.
 */

var SHEET_ID = '1K1g47i9eyqFeXh9vOInhB0Dcjo_h_Jf2dAFZGLEYMeE';
var KEY = 'ifm-comp-7Q2x9m'; // must match COMP_KEY in index.html
var COLS = ['name','kind','threat','positioning','instagram','ig_url',
            'website','youtube','followers','content','learn','notes',
            'pillars','formats','hook_style','cadence','top_content','whats_working','ifm_action'];

function doGet(e){ return handle_(e); }
function doPost(e){ return handle_(e); }

function handle_(e){
  var p = (e && e.parameter) || {};
  if (p.key !== KEY) return out_({ ok:false, error:'bad key' });

  var sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var action = String(p.action || '').toLowerCase();

  if (action === 'add') {
    var row = COLS.map(function(c){ return p[c] != null ? String(p[c]) : ''; });
    sh.appendRow(row);
    return out_({ ok:true, action:'add', name:p.name });
  }

  if (action === 'del' || action === 'delete') {
    var data = sh.getDataRange().getValues();
    var header = data[0].map(function(h){ return String(h).trim().toLowerCase(); });
    var nameIdx = header.indexOf('name');
    var igIdx = header.indexOf('instagram');
    var target = String(p.name || '').trim().toLowerCase();
    var targetIg = String(p.instagram || '').trim().toLowerCase().replace(/^@/,'');
    var removed = 0;
    for (var i = data.length - 1; i >= 1; i--) {
      var rn = String(data[i][nameIdx] || '').trim().toLowerCase();
      var rig = String(data[i][igIdx] || '').trim().toLowerCase().replace(/^@/,'');
      if ((target && rn === target) || (targetIg && rig === targetIg)) {
        sh.deleteRow(i + 1); removed++;
      }
    }
    return out_({ ok:true, action:'del', removed:removed });
  }

  if (action === 'setorder') {
    // p.order = comma-separated normalized keys (cnorm of instagram||name) in desired display order
    var keys = String(p.order || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var data = sh.getDataRange().getValues();
    var header = data[0].map(function(h){ return String(h).trim().toLowerCase(); });
    var nameIdx = header.indexOf('name');
    var igIdx = header.indexOf('instagram');
    var ordIdx = header.indexOf('order');
    if (ordIdx === -1) { ordIdx = header.length; sh.getRange(1, ordIdx + 1).setValue('order'); }
    var norm = function(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    for (var i = 1; i < data.length; i++) {
      var key = norm(String(data[i][igIdx] || '').replace(/^@/,'')) || norm(data[i][nameIdx]);
      var pos = keys.indexOf(key);
      sh.getRange(i + 1, ordIdx + 1).setValue(pos === -1 ? 9999 : pos);
    }
    return out_({ ok:true, action:'setorder', ranked:keys.length });
  }

  return out_({ ok:false, error:'unknown action' });
}

function out_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
