/**
 * IFM Momentum Board — write endpoint  (rebuilt 7 Sep 2026)
 *
 * The previous momentum-board script was overwritten on 17 Aug 2026 when the
 * Content Hub code was pasted into that project. This is a SEPARATE, standalone
 * project so the same thing cannot happen again.
 *
 * SETUP (about 60 seconds):
 *   1. Go to https://script.google.com  ->  New project
 *   2. Delete everything in Code.gs, paste this file, Save
 *   3. Rename the project "IFM Momentum Board API"
 *   4. Deploy -> New deployment -> type: Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      -> Deploy -> authorise when prompted
 *   5. Copy the /exec URL and send it to Claude. The key below is already set.
 *
 * Ops: read | append | set | insertRows | deleteRows
 * Accepts either a JSON POST body or query parameters. Key param: "key" or "token".
 */

var SHEET_ID = '1Px3271nWxCFp4U4tz6Pyk_Vqspv6wF5IAtWpdM-qW5A';  // IFM Momentum Board
var KEY      = 'ifm-momentum-9Fq4x1';

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (e && e.postData && e.postData.contents) {
    try {
      var b = JSON.parse(e.postData.contents);
      for (var k in b) p[k] = b[k];
    } catch (err) { /* not JSON — fall back to query params */ }
  }

  var key = p.key || p.token;
  if (key !== KEY) return out_({ ok: false, error: 'bad key' });

  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(p.sheet);
    if (!sh) return out_({ ok: false, error: 'no such sheet: ' + p.sheet });

    switch (p.op) {

      case 'read':
        return out_({ ok: true, values: sh.getRange(p.range).getValues() });

      case 'append':
        var vals = typeof p.values === 'string' ? JSON.parse(p.values) : p.values;
        sh.appendRow(vals);
        return out_({ ok: true, row: sh.getLastRow() });

      case 'set':
        var grid = typeof p.values === 'string' ? JSON.parse(p.values) : p.values;
        sh.getRange(p.range).setValues(grid);
        return out_({ ok: true, range: p.range });

      case 'insertRows':
        sh.insertRowsAfter(Number(p.after), Number(p.count || 1));
        return out_({ ok: true });

      case 'deleteRows':
        sh.deleteRows(Number(p.start), Number(p.count || 1));
        return out_({ ok: true });

      default:
        return out_({ ok: false, error: 'unknown action: ' + p.op });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
