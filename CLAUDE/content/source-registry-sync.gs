/**
 * IFM Source Registry — automated sync -> Airtable (25 Aug 2026)
 *
 * Runs on a Google-side time trigger, NOT invoked by Claude. This is the
 * whole point: right now every path to "content becomes catalogued" runs
 * through someone remembering to ask an AI to look at a folder. This
 * script removes that dependency — it wakes up on its own clock, on
 * Google's servers, whether or not anyone asked, and writes straight into
 * Airtable (native thumbnails, Gallery + Grid views, no custom UI code).
 *
 * SETUP (one-time):
 *   1. Create the Airtable base (see the schema Claude proposed — one
 *      "Content Catalogue" table, an Attachment field for the asset).
 *      Free tier: 1,000 records/base. Today's catalogue is ~330 — plenty
 *      of headroom; move to a paid seat only once that actually gets close.
 *   2. In Airtable: your name (top right) -> Developer hub -> Personal
 *      access tokens -> Create token. Scopes: data.records:read,
 *      data.records:write. Access: this base only.
 *   3. Open the "IFM Source Registry" sheet -> Extensions -> Apps Script.
 *      Paste this whole file in, Save.
 *   4. File -> Project Properties -> Script Properties, add:
 *        AIRTABLE_TOKEN   = the token from step 2
 *        AIRTABLE_BASE_ID = starts with "app…", from the base's API docs
 *        AIRTABLE_TABLE   = the table name, e.g. "Content Catalogue"
 *   5. Run `setupTrigger` once from the editor (▶, pick setupTrigger) and
 *      approve the Drive permission prompt. syncSources() now runs
 *      automatically every 6 hours.
 *
 * WHAT IT DOES
 *   - Reads the Source Registry (this sheet's own first tab).
 *   - For type=drive_folder: lists the folder's direct children.
 *   - For type=aakara_tree: recurses Month -> {Carousels,Reels,Stories} ->
 *     Topic folder, and groups by topic (one row per finished POST, not
 *     one row per file — a carousel's 6 artboards are one post).
 *   - Skips anything already known (checked against KNOWN_DRIVE_IDS —
 *     seed it once from data.js, Claude can regenerate that list on request;
 *     once the 330 rows are migrated into Airtable itself, this should read
 *     the live Airtable table instead of a pasted id list).
 *   - Creates new Airtable records with Status="Needs Review". Never
 *     auto-publishes — someone still looks before it's "live" content.
 *
 * WHAT IT DOESN'T DO (on purpose)
 *   - Doesn't touch data.js or the live site. Promoting a record from
 *     "Needs Review" to published stays a deliberate step in Airtable.
 */

var JUNE_BATCH = /IMG_(42\d\d|84\d\d)\./; // pre-Sakshi batch, always excluded — see registry notes

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncSources') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncSources').timeBased().everyHours(6).create();
  syncSources(); // run once immediately so you see it working
}

function syncSources() {
  var reg = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var rows = sheetToObjects_(reg);
  var known = knownDriveIds_();
  var found = [];

  rows.forEach(function (r) {
    if (!String(r.status || '').toLowerCase().startsWith('active')) return;
    var fid = String(r.location || '').replace(/\/+$/, '').split('/').pop();
    if (r.type === 'drive_folder') {
      found = found.concat(scanFlatFolder_(fid, r.source_name, known));
    } else if (r.type === 'aakara_tree') {
      found = found.concat(scanAakaraTree_(fid, known));
    }
    // local_folder and slides_deck_folder types are intentionally skipped —
    // neither is a DriveApp-listable folder tree.
  });

  if (found.length) pushToAirtable_(found);
  Logger.log('Sync found %s new item(s).', found.length);
  return found;
}

function pushToAirtable_(items) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('AIRTABLE_TOKEN');
  var baseId = props.getProperty('AIRTABLE_BASE_ID');
  var table = props.getProperty('AIRTABLE_TABLE');
  if (!token || !baseId || !table) {
    Logger.log('Airtable not configured yet (see setup steps in the file header) — ' +
      'found %s item(s) but nothing was written. Nothing lost, rerun after setup.', items.length);
    return;
  }
  var url = 'https://api.airtable.com/v0/' + baseId + '/' + encodeURIComponent(table);
  // Airtable's create-records endpoint takes up to 10 records per call.
  for (var i = 0; i < items.length; i += 10) {
    var batch = items.slice(i, i + 10).map(function (f) {
      return { fields: {
        'Title': f.title, 'Month': f.month || '', 'Format': f.format || '',
        'File count': f.file_count || 1, 'Source folder': f.folder_url,
        'Status': 'Needs Review',
      }};
    });
    UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ records: batch }),
      muteHttpExceptions: true,
    });
  }
}

// -- flat single-level folder (Sakshi uploads, Certificates) --
function scanFlatFolder_(folderId, sourceName, known) {
  var out = [];
  var it = DriveApp.getFolderById(folderId).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf('._') === 0) continue; // macOS junk
    if (JUNE_BATCH.test(f.getName())) continue; // known pre-Sakshi batch
    if (known.has(f.getId())) continue;
    out.push({ title: f.getName(), file_count: 1,
      folder_url: 'https://drive.google.com/file/d/' + f.getId() + '/view' });
  }
  return out;
}

// -- Aakara's real tree: Month -> {Carousels,Reels,Stories} -> Topic -> files --
function scanAakaraTree_(rootId, known) {
  var results = [];
  var months = DriveApp.getFolderById(rootId).getFolders();
  while (months.hasNext()) {
    var monthFolder = months.next();
    var monthName = monthFolder.getName();
    var formats = monthFolder.getFolders();
    while (formats.hasNext()) {
      var fmtFolder = formats.next();
      var fmtName = fmtFolder.getName().toLowerCase();
      if (['carousels', 'reels', 'stories'].indexOf(fmtName) === -1) continue;
      var topics = fmtFolder.getFolders();
      while (topics.hasNext()) {
        var topicFolder = topics.next();
        var files = topicFolder.getFiles();
        var newCount = 0, totalCount = 0;
        while (files.hasNext()) {
          var f = files.next();
          if (f.getName().indexOf('._') === 0) continue;
          totalCount++;
          if (!known.has(f.getId())) newCount++;
        }
        if (newCount > 0) {
          results.push({
            month: monthName, format: fmtName.replace(/s$/, ''),
            title: topicFolder.getName().trim(), file_count: totalCount,
            folder_url: topicFolder.getUrl(),
          });
        }
      }
    }
  }
  return results;
}

// -- known-id set: replace this with a live read of the Content Catalogue
// sheet once that migration lands. Until then it's a manually-pasted list
// (Claude can regenerate it from data.js on request). --
function knownDriveIds_() {
  var raw = PropertiesService.getScriptProperties().getProperty('KNOWN_DRIVE_IDS') || '';
  var set = {};
  raw.split(',').forEach(function (id) { if (id) set[id.trim()] = true; });
  return { has: function (id) { return !!set[id]; } };
}

function sheetToObjects_(sheet) {
  var vals = sheet.getDataRange().getValues();
  var header = vals[0].map(function (h) { return String(h).trim(); });
  return vals.slice(1).map(function (row) {
    var o = {};
    header.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}
