/**
 * IFM — One-time importer: pulls the deployed in-house videos from Vercel
 * straight into Google Drive → Content Library → "AI Videos — Jun 2026 (Claude)".
 *
 * HOW TO RUN (≈2 min, once):
 *  1. Go to https://script.google.com  →  New project
 *  2. Delete the sample code, paste this whole file in.
 *  3. Make sure you're signed in as djlolly03@gmail.com (the Drive owner).
 *  4. Click Run ▶ (select importVideos). First run asks you to Authorize — allow it.
 *  5. View → Logs to see the summary. Re-running is safe (it skips files already there).
 */
function importVideos() {
  var FOLDER_ID = '1YNXKJV-NNP-ClpFwwwuHbzqGxDp72Cko'; // Content Library / AI Videos — Jun 2026 (Claude)
  var BASE = 'https://ifm-deploy.vercel.app/';
  var FILES = [
    // Founder AI-avatar news Reel (IFM-053)
    'vedanta-reel-anchor-18s.mp4',
    // This session — Vedanta demerger / pizza series + explainers
    'vedanta-pizza-explainer-v2-8s.mp4',
    'vedanta-pizza-explainer-5s.mp4',
    'pizza-5slices-clean-5s.mp4',
    'vedanta-pizza-5slices-pro-10s.mp4',
    'vedanta-pizza-split-pro-10s.mp4',
    'vedanta-demerger-reel-v3-pro-15s.mp4',
    'vedanta-demerger-reel-v3-std-15s.mp4',
    'vedanta-demerger-reel-v2-ifm-15s.mp4',
    'vedanta-demerger-reel-9x16-15s.mp4',
    'ifm-3d-pizza-nike-8s.mp4',
    'ifm-3d-pizza-nike-kling.mp4',
    'ifm-logo-pizza-slices-kling.mp4',
    'ifm-logo-pizza-slices-seedance.mp4',
    // Logo hero reveals (IFM-037 family)
    'ifm-hero-lockup-9s.mp4',
    'ifm-hero-logo-9s.mp4',
    'ifm-hero-logo.mp4'
  ];

  var folder = DriveApp.getFolderById(FOLDER_ID);
  var added = 0, skipped = 0, failed = [];
  for (var i = 0; i < FILES.length; i++) {
    var name = FILES[i];
    if (folder.getFilesByName(name).hasNext()) { skipped++; Logger.log('skip (already there): ' + name); continue; }
    try {
      var resp = UrlFetchApp.fetch(BASE + name, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) { failed.push(name + ' [HTTP ' + resp.getResponseCode() + ']'); continue; }
      folder.createFile(resp.getBlob().setName(name));
      added++; Logger.log('added: ' + name);
    } catch (e) { failed.push(name + ' [' + e + ']'); }
  }
  Logger.log('DONE — added=' + added + '  skipped=' + skipped + '  failed=' + failed.length);
  if (failed.length) Logger.log('FAILED: ' + failed.join(', '));
}
