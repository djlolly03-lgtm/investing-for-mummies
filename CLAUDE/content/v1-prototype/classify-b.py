#!/usr/bin/env /usr/bin/python3
"""Classify the 659 catch-all (bucket B) files, so the decision surface is visible.

    /usr/bin/python3 classify-b.py            # the report
    /usr/bin/python3 classify-b.py --json     # machine-readable, per file

READ-ONLY. Writes one report file and nothing else. Does not touch data.js,
enrichment.json, the catalogue, or any library flag.

THE QUESTION
    Bucket B is 659 files whose parent FOLDER is linked by a catalogue row but which have no
    row of their own. Half the corpus. The blanket assumption -- that all 659 need individual
    rows -- is wrong, and so is the opposite one.

HOW IT DECIDES, and why it is not "read the folder name"
    Classification is by the SHAPE OF THE FILE SET, not by the folder's name. A folder name is
    not evidence: `27th Feb 28th Feb 1st March` looked like the largest uncatalogued IFM shoot
    in the account and turned out to be a padel tournament.

    1 RAW/SESSION DUMP -- catch-all appropriate.
      Camera-serial filenames (IMG_1234, DSC_, VID_, a bare GUID, a 16-digit phone export) in
      quantity. The frames are interchangeable: nobody searches for IMG_5997 specifically, and
      one row per frame is exactly the clutter the moments rule exists to prevent.

    2 COMPONENT OF A SET -- catch-all appropriate, for a DIFFERENT reason.
      `Artboard 3.png`, `Frame 2.png`, `slug_04.jpg`, `3.png`: sequential artboards in a small
      folder. These are FINISHED creative, but the deliverable is the CAROUSEL, not the slide.
      Six artboards are one Instagram post. CLAUDE.md and the daily-content-processor skill
      both already say "one row per TOPIC FOLDER, never per artboard", and this agrees.

      This is the distinction a three-way split hides: "finished creative" does NOT imply
      "needs its own row".

    3 FINISHED DELIVERABLE -- warrants its own row.
      A finished .mp4/.mov reel that is the single deliverable of its folder. Someone searches
      for the reel, not the folder.

    4 WORKING / SOURCE FILE -- probably out of the corpus entirely.
      .psd, and a RAW (.cr3) sitting beside its own .jpg. Nobody browses for a PSD; it is the
      designer's source. Flagged rather than classified, because deleting it from the corpus
      is a decision, not a cleanup.

    5 UNCLEAR -- needs a human. Reported, never guessed.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))

CAMERA = re.compile(r'^(IMG|DSC|DSCN|VID|MVI|MOV|PXL|GOPR|DJI)[-_ ]?\d{3,}', re.I)
GUID = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}', re.I)
PHONE_EXPORT = re.compile(r'^\d{13,}$')            # 1787030215204471.mp4
CAMERA_SERIAL = re.compile(r'^[0-9A-Z]{8}$')       # 4E7A5748.CR3
WHATSAPP = re.compile(r'^WhatsApp (Image|Video)', re.I)
ARTBOARD = re.compile(r'^(artboard|frame|slide|page)\s*\d+$', re.I)
BARE_NUM = re.compile(r'^\d{1,3}$')
SLUG_NUM = re.compile(r'^[a-z0-9][a-z0-9 \-_]*[-_]\d{1,3}$', re.I)
VIDEO_EXT = {'.mp4', '.mov', '.m4v'}
WORKING_EXT = {'.psd'}
RAW_EXT = {'.cr3', '.cr2', '.dng', '.arw', '.nef', '.raf'}


def classify(folder, files):
    """Returns [(file, category, reason)] for one folder, judged on the whole set."""
    stems = [os.path.splitext(f['name'])[0] for f in files]
    n = len(files)
    camera_like = sum(1 for s in stems if CAMERA.match(s) or GUID.match(s)
                      or PHONE_EXPORT.match(s) or CAMERA_SERIAL.match(s) or WHATSAPP.match(s))
    seq_like = sum(1 for s in stems if ARTBOARD.match(s) or BARE_NUM.match(s) or SLUG_NUM.match(s))
    out = []
    for f in files:
        stem = os.path.splitext(f['name'])[0]
        ext = os.path.splitext(f['name'])[1].lower()
        jpg_twin = ext in RAW_EXT and any(
            os.path.splitext(g['name'])[0] == stem and
            os.path.splitext(g['name'])[1].lower() in ('.jpg', '.jpeg') for g in files)
        if ext in WORKING_EXT:
            out.append((f, 'working', 'PSD design source, not a browsable asset')); continue
        if jpg_twin:
            out.append((f, 'working', 'RAW master sitting beside its own JPEG')); continue
        # a set is judged as a set
        if seq_like >= max(3, n * 0.6) and n <= 14 and ext not in VIDEO_EXT:
            out.append((f, 'set', 'sequential artboard in a %d-file set — the SET is the post' % n))
            continue
        if camera_like >= max(3, n * 0.6):
            out.append((f, 'dump', 'camera-serial name in a %d-file session dump' % n)); continue
        if ext in VIDEO_EXT and sum(1 for g in files
                                    if os.path.splitext(g['name'])[1].lower() in VIDEO_EXT) <= 2:
            out.append((f, 'deliverable', 'finished video, the deliverable of this folder')); continue
        if ext not in VIDEO_EXT and n <= 3:
            out.append((f, 'unclear', 'small folder, name is not a recognisable pattern'))
            continue
        out.append((f, 'unclear', 'set shape does not match any rule'))
    return out


def main():
    d = json.load(open(os.path.join(HERE, 'reconciliation.json')))['B']
    byf = collections.defaultdict(list)
    for x in d:
        byf[os.path.dirname(x['path'])].append(x)
    rows = []
    for folder, files in byf.items():
        for f, cat, why in classify(folder, files):
            rows.append({'folder': folder, 'cat': cat, 'why': why, **f})
    if '--json' in sys.argv:
        json.dump(rows, open(os.path.join(HERE, 'bucket-b-classified.json'), 'w'),
                  ensure_ascii=False, indent=1)
        print('wrote bucket-b-classified.json (%d files)' % len(rows)); return

    tot = collections.Counter(r['cat'] for r in rows)
    LABEL = {'dump': '1 · Raw/session dump — catch-all appropriate',
             'set': '2 · Component of a set — catch-all appropriate (the SET is the deliverable)',
             'deliverable': '3 · Finished deliverable — warrants its own row',
             'working': '4 · Working/source file — probably not corpus at all',
             'unclear': '5 · Unclear — needs a human decision'}
    print('# Bucket B — 659 catch-all files, classified\n')
    print('Read-only. Nothing was catalogued, modified or deployed.\n')
    print('Classified by the **shape of the file set**, never by the folder name — a folder '
          'name is not evidence.\n')
    print('| category | files | share |')
    print('|---|---|---|')
    for k in ('dump', 'set', 'deliverable', 'working', 'unclear'):
        if tot[k]:
            print('| %s | **%d** | %d%% |' % (LABEL[k], tot[k], round(100.0 * tot[k] / len(rows))))
    print('| **total** | **%d** | |\n' % len(rows))

    for k in ('dump', 'set', 'deliverable', 'working', 'unclear'):
        sel = [r for r in rows if r['cat'] == k]
        if not sel:
            continue
        byfold = collections.defaultdict(list)
        for r in sel:
            byfold[r['folder']].append(r)
        print('## %s\n' % LABEL[k])
        print('%d files across %d folders\n' % (len(sel), len(byfold)))
        print('| files | formats | folder | representative filenames |')
        print('|---|---|---|---|')
        for folder, fs in sorted(byfold.items(), key=lambda x: -len(x[1])):
            ext = collections.Counter(os.path.splitext(f['name'])[1].lower() for f in fs)
            names = ' · '.join(f['name'][:26] for f in fs[:3])
            print('| %d | %s | `%s` | %s |'
                  % (len(fs), ' '.join('%s×%d' % (e.lstrip('.'), c) for e, c in ext.most_common(4)),
                     folder[-62:], names))
        print()


if __name__ == '__main__':
    main()
