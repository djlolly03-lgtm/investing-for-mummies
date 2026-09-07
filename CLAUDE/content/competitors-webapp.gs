/**
 * IFM Content Hub — combined write endpoint
 * ONE deployed Apps Script serving BOTH:
 *   · Competitors admin (add / del / setorder) — since Jul 2026
 *   · Sakshi's daily logging (log_outbound / update_outbound / log_story /
 *     add_enquiry / update_enquiry / log_session) — merged 17 Aug 2026 so no
 *     second deployment is needed.
 *
 * ⚠️ THIS FILE BELONGS TO EXACTLY ONE APPS SCRIPT PROJECT ⚠️
 *   Project: "IFM Content Hub"
 *   Project id: 1XNdqnFjRo0iCYsBek3xfTGxIps0ilcTdLGnavpYKZyD6wlS32ni3o2Oe
 *   Direct link: https://script.google.com/u/0/home/projects/1XNdqnFjRo0iCYsBek3xfTGxIps0ilcTdLGnavpYKZyD6wlS32ni3o2Oe/edit
 *   Deployment: AKfycbw9G4xNHkh9VkDFO5uh0CEHI76TNHP2wJ2TLnkOUmhVVwTe5UhQhN7RbPNAQ3BhrXA8ow
 *   Serves sheet: 1K1g47i9... (IFM Content Hub) — NOT the Momentum Board.
 *
 *   NEVER paste this file into any other project. On 17 Aug 2026 it was pasted
 *   over the IFM Momentum Board's script project, which silently destroyed that
 *   board's write API (append/set/read) and cost hours to diagnose in Sep 2026,
 *   because the old instruction here just said "the existing project" without
 *   naming it. Before pasting, confirm the project id in the browser URL bar
 *   matches the one above. If it does not, STOP — you are in the wrong project.
 *
 * UPDATING THIS DEPLOYMENT (30 seconds — do NOT make a new deployment):
 *   1. Open the project via the direct link above (do not search by name).
 *   2. Check the URL bar shows the project id above. Replace ALL code, Save.
 *   3. Deploy → Manage deployments → ✏️ edit → Version: New → Deploy.
 *   The /exec URL stays the same; no re-authorization needed (same permissions).
 *
 * IDENTITY CHECK: GET ?key=<KEY>&action=whoami returns which project and sheet
 * this endpoint actually serves. Call it before trusting any URL in notes.
 */

var SHEET_ID = '1K1g47i9eyqFeXh9vOInhB0Dcjo_h_Jf2dAFZGLEYMeE';
var KEY = 'ifm-comp-7Q2x9m';         // must match COMP_KEY in index.html
var SAKSHI_KEY = 'ifm-sakshi-4Km8w2'; // must match SAKSHI_KEY in index.html
var SHEETS = {
  outbound: '1MvyewFjHW3aZNDo5en-mntKbPxwYejQpMsjQLdxTmEQ', // IFM Outbound Log
  enquiries: '',   // Phase 2 — IFM Enquiries
  daily: ''        // Phase 3/4 — IFM Daily (stories rows + session rows)
};
var COLS = ['name','kind','threat','positioning','instagram','ig_url',
            'website','youtube','followers','content','learn','notes',
            'pillars','formats','hook_style','cadence','top_content','whats_working','ifm_action'];

function doGet(e){ return handle_(e); }
function doPost(e){ return handle_(e); }

function handle_(e){
  var p = (e && e.parameter) || {};
  if (p.key !== KEY && p.key !== SAKSHI_KEY) return out_({ ok:false, error:'bad key' });

  // ---- Sakshi logging actions (any valid key) ----
  var action0 = String(p.action || '').toLowerCase();
  if (action0 === 'whoami') return out_({
    ok: true,
    service: 'IFM Content Hub',
    project: 'IFM Content Hub (1XNdqnFjRo0iCYsBek3xfTGxIps0ilcTdLGnavpYKZyD6wlS32ni3o2Oe)',
    sheet_id: SHEET_ID,
    not_the_momentum_board: true
  });
  try {
    if (action0 === 'log_outbound')    return logOutbound_(p);
    if (action0 === 'update_outbound') return updateOutbound_(p);
    if (action0 === 'log_story')       return logStory_(p);
    if (action0 === 'add_enquiry')     return addEnquiry_(p);
    if (action0 === 'update_enquiry')  return updateEnquiry_(p);
    if (action0 === 'log_session')     return logSession_(p);
  } catch (err) {
    return out_({ ok:false, error:String(err) });
  }

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

// ============================ Sakshi logging handlers ============================

// Phase 1: one-tap ✓ Commented.
// Columns: Date | Platform | Account / Group | Post link | Gist | They replied? | They followed? | Notes
function logOutbound_(p){
  var sh = SpreadsheetApp.openById(SHEETS.outbound).getSheets()[0];
  sh.appendRow([
    p.date || today_(), p.platform || 'Instagram', p.account || '', p.url || '',
    p.gist || '', p.replied || 'N', p.followed || 'N', p.notes || ''
  ]);
  return out_({ ok:true, action:'log_outbound' });
}

// Phase 1b: mark a logged comment as replied/followed (return tracking), matched by post URL.
function updateOutbound_(p){
  var sh = SpreadsheetApp.openById(SHEETS.outbound).getSheets()[0];
  var data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][3]).trim() === String(p.url || '').trim()) {
      if (p.replied)  sh.getRange(i + 1, 6).setValue(p.replied);
      if (p.followed) sh.getRange(i + 1, 7).setValue(p.followed);
      return out_({ ok:true, action:'update_outbound', row:i + 1 });
    }
  }
  return out_({ ok:false, error:'url not found' });
}

// Phase 4: Stories +1. Daily sheet story rows: Date | story | Posted | Responses | Replies | Link taps
function logStory_(p){
  requireSheet_('daily');
  var sh = SpreadsheetApp.openById(SHEETS.daily).getSheets()[0];
  var d = p.date || today_();
  var data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).slice(0,10) === d && String(data[i][1]) === 'story') {
      var col = { posted:3, responses:4, replies:5, taps:6 }[p.field || 'posted'] || 3;
      var cur = Number(data[i][col - 1] || 0);
      sh.getRange(i + 1, col).setValue(cur + Number(p.n || 1));
      return out_({ ok:true, action:'log_story', updated:true });
    }
  }
  var row = [d, 'story', 0, 0, 0, 0];
  var col2 = { posted:2, responses:3, replies:4, taps:5 }[p.field || 'posted'] || 2;
  row[col2] = Number(p.n || 1);
  sh.appendRow(row);
  return out_({ ok:true, action:'log_story', created:true });
}

// Phase 2: Enquiries.
// Columns: Date | Name | Contact | Source | Asked | Interested in | Replied? | Follow up on | Status | Notes
function addEnquiry_(p){
  requireSheet_('enquiries');
  var sh = SpreadsheetApp.openById(SHEETS.enquiries).getSheets()[0];
  sh.appendRow([
    p.date || today_(), p.name || '', p.contact || '', p.source || '',
    p.asked || '', p.interest || '', p.replied || 'N',
    p.followup || '', p.status || 'New', p.notes || ''
  ]);
  return out_({ ok:true, action:'add_enquiry' });
}

function updateEnquiry_(p){
  requireSheet_('enquiries');
  var sh = SpreadsheetApp.openById(SHEETS.enquiries).getSheets()[0];
  var data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim().toLowerCase() === String(p.name || '').trim().toLowerCase() &&
        String(data[i][2]).trim() === String(p.contact || '').trim()) {
      if (p.status)   sh.getRange(i + 1, 9).setValue(p.status);
      if (p.replied)  sh.getRange(i + 1, 7).setValue(p.replied);
      if (p.followup) sh.getRange(i + 1, 8).setValue(p.followup);
      if (p.notes)    sh.getRange(i + 1, 10).setValue(p.notes);
      return out_({ ok:true, action:'update_enquiry', row:i + 1 });
    }
  }
  return out_({ ok:false, error:'enquiry not found' });
}

// Phase 3: Sessions. Daily sheet session rows: Date | session | Venue | Filmed | Uploaded | Catalogued
function logSession_(p){
  requireSheet_('daily');
  var sh = SpreadsheetApp.openById(SHEETS.daily).getSheets()[0];
  var data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).slice(0,10) === String(p.date || '').slice(0,10) &&
        String(data[i][1]) === 'session' &&
        String(data[i][2]).trim().toLowerCase() === String(p.venue || '').trim().toLowerCase()) {
      if (p.filmed)     sh.getRange(i + 1, 4).setValue(p.filmed);
      if (p.uploaded)   sh.getRange(i + 1, 5).setValue(p.uploaded);
      if (p.catalogued) sh.getRange(i + 1, 6).setValue(p.catalogued);
      return out_({ ok:true, action:'log_session', updated:true });
    }
  }
  sh.appendRow([p.date || today_(), 'session', p.venue || '',
                p.filmed || 'N', p.uploaded || 'N', p.catalogued || 'N']);
  return out_({ ok:true, action:'log_session', created:true });
}

// ---- helpers ----
function requireSheet_(k){
  if (!SHEETS[k]) throw 'sheet id for "' + k + '" not configured yet (later phase)';
}
function today_(){
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
}
function out_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
