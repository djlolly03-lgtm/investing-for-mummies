/**
 * IFM CONTENT HUB — DRIVE SETUP (one paste does everything)
 * ==========================================================
 * Paste this whole file into a new project at https://script.google.com
 * (signed in as djlolly03@gmail.com), then run these TWO functions once each:
 *
 *   1) importVideos        → pulls the 16 already-made videos from the website
 *                            into Content Library / "AI Videos — Jun 2026 (Claude)".
 *                            (back-catalogue; run once. Safe to re-run.)
 *
 *   2) setupWeeklyTrigger  → from now on, anything dropped into Content Library
 *                            is auto-added to the dashboard every Monday.
 *                            (run once; installs the weekly timer + scans now.)
 *
 * First run will ask you to Authorize — allow it. To stop the weekly job later,
 * run removeTriggers.
 */

/* ============================== CONFIG ============================== */
var CONFIG = {
  CONTENT_LIBRARY_ID: '1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY',         // the ONE flat dump folder
  IMPORT_SUBFOLDER_ID: '1YNXKJV-NNP-ClpFwwwuHbzqGxDp72Cko',        // "AI Videos — Jun 2026 (Claude)"
  CATALOGUE_SHEET_ID: '1VzLzQzTS_-2w7jxkufJUXMF3r0EeOy0le19ZRUy8e-0',
  SITE_BASE: 'https://ifm-deploy.vercel.app/',
  SOURCE_LABEL: 'Drop',
  DEFAULT_STATUS: 'Raw',
  RUN_HOUR: 8
};

/* ===================== 1) BACK-CATALOGUE IMPORT ===================== */
function importVideos() {
  var FILES = [
    'vedanta-pizza-explainer-v2-8s.mp4', 'vedanta-pizza-explainer-5s.mp4', 'pizza-5slices-clean-5s.mp4',
    'vedanta-pizza-5slices-pro-10s.mp4', 'vedanta-pizza-split-pro-10s.mp4',
    'vedanta-demerger-reel-v3-pro-15s.mp4', 'vedanta-demerger-reel-v3-std-15s.mp4',
    'vedanta-demerger-reel-v2-ifm-15s.mp4', 'vedanta-demerger-reel-9x16-15s.mp4',
    'ifm-3d-pizza-nike-8s.mp4', 'ifm-3d-pizza-nike-kling.mp4',
    'ifm-logo-pizza-slices-kling.mp4', 'ifm-logo-pizza-slices-seedance.mp4',
    'ifm-hero-lockup-9s.mp4', 'ifm-hero-logo-9s.mp4', 'ifm-hero-logo.mp4'
  ];
  var folder = DriveApp.getFolderById(CONFIG.IMPORT_SUBFOLDER_ID);
  var added = 0, skipped = 0, failed = [];
  for (var i = 0; i < FILES.length; i++) {
    var name = FILES[i];
    if (folder.getFilesByName(name).hasNext()) { skipped++; Logger.log('skip (already there): ' + name); continue; }
    try {
      var resp = UrlFetchApp.fetch(CONFIG.SITE_BASE + name, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) { failed.push(name + ' [HTTP ' + resp.getResponseCode() + ']'); continue; }
      folder.createFile(resp.getBlob().setName(name));
      added++; Logger.log('added: ' + name);
    } catch (e) { failed.push(name + ' [' + e + ']'); }
  }
  Logger.log('importVideos DONE — added=' + added + '  skipped=' + skipped + '  failed=' + failed.length);
  if (failed.length) Logger.log('FAILED: ' + failed.join(', '));
}

/* ================= 2) WEEKLY DROP WATCHER (ongoing) ================= */
function setupWeeklyTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('scanDrops').timeBased().everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(CONFIG.RUN_HOUR).create();
  Logger.log('Weekly trigger installed (Mondays ~' + CONFIG.RUN_HOUR + ':00). Running first scan now…');
  scanDrops();
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'scanDrops') ScriptApp.deleteTrigger(t);
  });
}

function scanDrops() {
  var sh = SpreadsheetApp.openById(CONFIG.CATALOGUE_SHEET_ID).getSheets()[0];
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };

  var seen = {}, linkCol = col('drive link');
  if (lastRow > 1 && linkCol >= 0) {
    sh.getRange(2, linkCol + 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/[-\w]{25,}/); if (m) seen[m[0]] = true;
    });
  }

  var files = DriveApp.getFolderById(CONFIG.CONTENT_LIBRARY_ID).getFiles(); // flat: direct children only
  var rows = [];
  while (files.hasNext()) {
    var f = files.next(), mt = f.getMimeType();
    if (mt.indexOf('application/vnd.google-apps') === 0) continue;          // skip folders / google docs
    var fid = f.getId();
    if (seen[fid]) continue;
    var row = new Array(lastCol).fill('');
    var set = function (n, v) { var i = col(n); if (i >= 0) row[i] = v; };
    set('id', 'DROP-' + fid.substring(0, 8));
    set('title', prettyTitle(f.getName()));
    set('type', typeFromMime(mt));
    set('source', CONFIG.SOURCE_LABEL);
    set('status', CONFIG.DEFAULT_STATUS);
    set('drive link', 'https://drive.google.com/file/d/' + fid + '/view');
    set('date created', Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    set('notes', 'Auto-added from Content Library drop — needs thumbnail + description.');
    rows.push(row); seen[fid] = true;
  }
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, lastCol).setValues(rows);
  Logger.log('scanDrops: added ' + rows.length + ' new file(s) to the catalogue.');
}

function typeFromMime(mt) {
  if (mt.indexOf('video/') === 0) return 'Video';
  if (mt.indexOf('image/') === 0) return 'Image';
  if (mt === 'application/pdf') return 'Carousel (PDF)';
  if (mt.indexOf('audio/') === 0) return 'Audio';
  return 'File';
}
function prettyTitle(name) {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
