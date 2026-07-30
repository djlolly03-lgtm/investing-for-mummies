/**
 * IFM CONTENT HUB — the whole system in one script.
 * Bound to the Catalogue Google Sheet. Does 3 things:
 *   • SECURE   — copies any file NOT owned by IFM into an IFM-owned copy and keeps
 *                only that, so content stays forever even if someone leaves.
 *   • CATALOGUE— adds any new file in Content Library to this Sheet → shows on the Hub.
 *   • IMPORT   — (one-off) pulls the 16 existing videos into Drive.
 * Runs weekly AND on demand via the "⚡ IFM" menu at the top of this Sheet.
 *
 * Scope = Content Library ROOT (the flat dump). People upload there; they VIEW on the Hub.
 */

var CONFIG = {
  CONTENT_LIBRARY_ID: '1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY',     // the one flat dump folder
  IMPORT_SUBFOLDER_ID: '1YNXKJV-NNP-ClpFwwwuHbzqGxDp72Cko',    // archive subfolder for the back-catalogue
  SITE_BASE: 'https://ifm-deploy.vercel.app/',
  SOURCE_LABEL: 'Drop',
  DEFAULT_STATUS: 'Raw',
  RUN_HOUR: 8,
  TOKEN: 'ifm-hub-7Q2x9m'   // shared secret for the Hub "Catalogue now" button
};

/* Hub button calls this (Deploy → Web app). Opens a tab that runs the catalogue. */
function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== CONFIG.TOKEN) {
    return HtmlService.createHtmlOutput('<p style="font:16px -apple-system,sans-serif;padding:30px">Unauthorized.</p>');
  }
  var r = runCatalogue();
  return HtmlService.createHtmlOutput(
    '<div style="font:18px -apple-system,sans-serif;padding:36px;text-align:center;color:#18213a">' +
    '<h2>✅ Catalogue updated</h2><p>Secured ' + r.secured + ' file(s) to IFM ownership.<br>' +
    'Added ' + r.added + ' new file(s) to the Hub.</p>' +
    '<p style="color:#888">You can close this tab — the Hub will show them on refresh.</p></div>');
}

/* Menu (your manual buttons) */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ IFM')
    .addItem('Catalogue now', 'catalogueNow')
    .addItem('Turn ON weekly auto-run', 'setupWeekly')
    .addSeparator()
    .addItem('Import existing 16 videos (one-off)', 'importVideos')
    .addItem('Turn OFF weekly auto-run', 'removeWeekly')
    .addToUi();
}

/* The menu + the weekly job both call this */
function catalogueNow() {
  var r = runCatalogue();
  var msg = 'Done — secured ' + r.secured + ' file(s) to IFM ownership, catalogued ' + r.added + ' new file(s).';
  Logger.log(msg); notify(msg);
}

/* shared worker used by the menu, the weekly trigger, and the Hub button */
function runCatalogue() {
  var secured = secureFolder();
  var added = scanAndCatalogue();
  return { secured: secured, added: added };
}

/* Copy anything not owned by IFM into an IFM-owned copy; remove the original from the folder. */
function secureFolder() {
  var me = Session.getEffectiveUser().getEmail();
  var folder = DriveApp.getFolderById(CONFIG.CONTENT_LIBRARY_ID);
  var snapshot = [], it = folder.getFiles();
  while (it.hasNext()) snapshot.push(it.next());   // snapshot first (we mutate the folder)
  var copied = 0;
  snapshot.forEach(function (f) {
    if (f.getMimeType().indexOf('application/vnd.google-apps') === 0) return; // skip folders/docs
    var ownerEmail = '';
    try { var o = f.getOwner(); ownerEmail = o ? o.getEmail() : ''; } catch (e) {}
    if (ownerEmail === me) return;                  // already ours → leave it
    f.makeCopy(f.getName(), folder);                // copy is owned by IFM
    folder.removeFile(f);                           // original leaves the shared folder
    copied++; Logger.log('secured: ' + f.getName());
  });
  return copied;
}

/* Add new files (by Drive fileId) to the catalogue Sheet as Raw rows. */
function scanAndCatalogue() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var seen = {}, linkCol = col('drive link');
  if (lastRow > 1 && linkCol >= 0) {
    sh.getRange(2, linkCol + 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/[-\w]{25,}/); if (m) seen[m[0]] = true;
    });
  }
  var files = DriveApp.getFolderById(CONFIG.CONTENT_LIBRARY_ID).getFiles(), rows = [];
  while (files.hasNext()) {
    var f = files.next(), mt = f.getMimeType();
    if (mt.indexOf('application/vnd.google-apps') === 0) continue;
    var fid = f.getId(); if (seen[fid]) continue;
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
  return rows.length;
}

function setupWeekly() {
  removeWeekly();
  ScriptApp.newTrigger('catalogueNow').timeBased().everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(CONFIG.RUN_HOUR).create();
  catalogueNow();
  notify('Weekly auto-run is ON (Mondays ~' + CONFIG.RUN_HOUR + ':00).');
}
function removeWeekly() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'catalogueNow') ScriptApp.deleteTrigger(t);
  });
  notify('Weekly auto-run is OFF.');
}

/* One-off: pull the 16 already-made videos from the website into the archive subfolder. */
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
  var folder = DriveApp.getFolderById(CONFIG.IMPORT_SUBFOLDER_ID), added = 0, skipped = 0, failed = 0;
  FILES.forEach(function (name) {
    if (folder.getFilesByName(name).hasNext()) { skipped++; return; }
    try {
      var resp = UrlFetchApp.fetch(CONFIG.SITE_BASE + name, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) { failed++; return; }
      folder.createFile(resp.getBlob().setName(name)); added++;
    } catch (e) { failed++; }
  });
  var msg = 'Import done — added ' + added + ', skipped ' + skipped + ', failed ' + failed + '.';
  Logger.log(msg); notify(msg);
}

function notify(msg) { try { SpreadsheetApp.getActive().toast(msg, 'IFM Content Hub', 8); } catch (e) {} }
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
