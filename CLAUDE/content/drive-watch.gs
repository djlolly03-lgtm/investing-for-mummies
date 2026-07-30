/**
 * IFM Content Hub — DROP WATCHER (durable, Google-native auto-catalogue)
 * --------------------------------------------------------------------------
 * WHAT IT DOES
 *   Everyone dumps final files into ONE flat folder (Content Library).
 *   Once a week this scans that folder and adds any NEW file to the catalogue
 *   Google Sheet as a "Raw" row, so it shows up on the dashboard automatically
 *   (the hub reads this sheet live — no redeploy needed). Nothing ever gets lost.
 *
 * WHY APPS SCRIPT (not a server / not Claude):
 *   It runs inside Google forever, has native Drive access, and survives with
 *   zero maintenance. That's the "lasts the test of time" part.
 *
 * SETUP (once, ~2 min):
 *   1. https://script.google.com → New project, paste this whole file.
 *   2. Signed in as djlolly03@gmail.com (owner of the folder + sheet).
 *   3. Run ▶ setupWeeklyTrigger  → Authorize when asked.
 *      (this installs the weekly timer AND does a first scan immediately)
 *   4. Done. To stop it later: Run removeTriggers.
 *
 * NOTE ON THUMBNAILS: auto-rows show a placeholder icon + an "Open in Drive"
 *   link (Apps Script can't make video poster frames). Ask Claude to run the
 *   "enrich drops" pass to give the new rows real thumbnails + descriptions.
 */

var CONFIG = {
  DROP_FOLDER_ID: '1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY',          // Content Library (the one flat dump)
  CATALOGUE_SHEET_ID: '1VzLzQzTS_-2w7jxkufJUXMF3r0EeOy0le19ZRUy8e-0',
  SOURCE_LABEL: 'Drop',
  DEFAULT_STATUS: 'Raw',
  RUN_HOUR: 8                                                     // weekly run, ~8am, Mondays
};

function setupWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'scanDrops') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('scanDrops').timeBased().everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(CONFIG.RUN_HOUR).create();
  Logger.log('Weekly trigger installed (Mondays ~' + CONFIG.RUN_HOUR + ':00). Running first scan now…');
  scanDrops();
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'scanDrops') ScriptApp.deleteTrigger(t);
  });
  Logger.log('Drop-watcher trigger removed.');
}

function scanDrops() {
  var ss = SpreadsheetApp.openById(CONFIG.CATALOGUE_SHEET_ID);
  var sh = ss.getSheets()[0];
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };

  // Build a set of Drive file IDs already in the sheet (parsed from the Drive Link column) so re-runs don't duplicate.
  var seen = {};
  var linkCol = col('drive link');
  if (lastRow > 1 && linkCol >= 0) {
    sh.getRange(2, linkCol + 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/[-\w]{25,}/);
      if (m) seen[m[0]] = true;
    });
  }

  var folder = DriveApp.getFolderById(CONFIG.DROP_FOLDER_ID);
  var files = folder.getFiles();              // direct children only = the flat dump
  var rows = [];
  while (files.hasNext()) {
    var f = files.next();
    var mt = f.getMimeType();
    if (mt.indexOf('application/vnd.google-apps') === 0) continue; // skip folders / Google docs/sheets
    var fid = f.getId();
    if (seen[fid]) continue;

    var row = new Array(lastCol).fill('');
    var set = function (name, val) { var i = col(name); if (i >= 0) row[i] = val; };
    set('id', 'DROP-' + fid.substring(0, 8));
    set('title', prettyTitle(f.getName()));
    set('type', typeFromMime(mt, f.getName()));
    set('source', CONFIG.SOURCE_LABEL);
    set('status', CONFIG.DEFAULT_STATUS);
    set('drive link', 'https://drive.google.com/file/d/' + fid + '/view');
    set('date created', Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    set('notes', 'Auto-added from Content Library drop — needs thumbnail + description.');
    rows.push(row);
    seen[fid] = true;
  }

  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, lastCol).setValues(rows);
  Logger.log('scanDrops: added ' + rows.length + ' new file(s) to the catalogue.');
}

function typeFromMime(mt, name) {
  if (mt.indexOf('video/') === 0) return 'Video';
  if (mt.indexOf('image/') === 0) return 'Image';
  if (mt === 'application/pdf') return 'Carousel (PDF)';
  if (mt.indexOf('audio/') === 0) return 'Audio';
  return 'File';
}

function prettyTitle(name) {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
