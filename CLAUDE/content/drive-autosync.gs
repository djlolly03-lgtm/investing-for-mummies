/**
 * IFM — Drive AUTO-SYNC for in-house videos.
 * Run setupAutoSync() ONCE. After that it runs itself on a schedule forever:
 * it reads the manifest (which Claude keeps updated on every deploy) and pulls any
 * NEW in-house video from the live site into Google Drive — no manual steps ever again.
 *
 * ONE-TIME SETUP (≈1 min):
 *  1. https://script.google.com  → open this project (or paste this file into a New project)
 *  2. Signed in as djlolly03@gmail.com (the Drive owner)
 *  3. Run ▶  setupAutoSync   → Authorize when asked.  Done. Forever.
 *
 * That's it. To stop it later: Run removeAutoSync.
 */

var FOLDER_ID = '1YNXKJV-NNP-ClpFwwwuHbzqGxDp72Cko';            // Content Library / AI Videos — Jun 2026 (Claude)
var BASE      = 'https://ifm-deploy.vercel.app/';
var MANIFEST  = 'https://ifm-deploy.vercel.app/content/inhouse-videos.json';
var EVERY_HOURS = 6;                                            // how often to check for new videos

function setupAutoSync() {
  removeAutoSync();                                             // avoid duplicate triggers
  ScriptApp.newTrigger('syncInhouseVideos').timeBased().everyHours(EVERY_HOURS).create();
  Logger.log('Auto-sync installed (every ' + EVERY_HOURS + 'h). Running first sync now…');
  syncInhouseVideos();                                         // import whatever exists right now
}

function removeAutoSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncInhouseVideos') ScriptApp.deleteTrigger(t);
  });
}

function syncInhouseVideos() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var list;
  try {
    var mf = UrlFetchApp.fetch(MANIFEST, { muteHttpExceptions: true });
    if (mf.getResponseCode() !== 200) { Logger.log('manifest HTTP ' + mf.getResponseCode()); return; }
    list = JSON.parse(mf.getContentText());
  } catch (e) { Logger.log('manifest error: ' + e); return; }

  var added = 0, skipped = 0, failed = [];
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    if (folder.getFilesByName(name).hasNext()) { skipped++; continue; }   // already in Drive
    try {
      var r = UrlFetchApp.fetch(BASE + name, { muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) { failed.push(name + ' [HTTP ' + r.getResponseCode() + ']'); continue; }
      folder.createFile(r.getBlob().setName(name));
      added++; Logger.log('added: ' + name);
    } catch (e) { failed.push(name + ' [' + e + ']'); }
  }
  Logger.log('SYNC DONE — added=' + added + '  skipped=' + skipped + '  failed=' + failed.length +
             (failed.length ? '  :: ' + failed.join(', ') : ''));
}
