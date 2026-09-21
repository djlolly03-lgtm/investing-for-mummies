#!/usr/bin/env /usr/bin/python3
"""The consolidated corpus-to-library plan. One recommendation, not incremental decisions.

    /usr/bin/python3 catalogue-plan.py           # the plan
    /usr/bin/python3 catalogue-plan.py --json    # machine-readable, per folder

READ-ONLY. Writes the report and a JSON plan. Touches no catalogue, no enrichment, no
library flag, and deploys nothing.

SCOPE
    Every file in the frozen 1,340-file corpus that is not already individually catalogued:
    bucket C (309, unreachable) and bucket B (659, behind a catch-all). 968 files, 62% of the
    corpus.

THE POLICY, as given
    - raw session dumps may remain catch-all
    - finished creative assets must be individually discoverable
    - certificate images involving minors stay excluded pending consent verification

THE UNIT OF THE ANSWER IS A ROW, NOT A FILE
    "Individually discoverable" does not mean one row per file. A carousel is six artboards
    and ONE Instagram post; six rows for it would be the clutter the moments rule exists to
    prevent, and CLAUDE.md already says "one row per TOPIC FOLDER, never per artboard". A
    reel is one MP4 plus its cover PNG: one row, the cover as its thumbnail.

    So the plan is expressed as ROWS TO CREATE. That is what has to be written, reviewed and
    lived with.

HOW EACH FOLDER IS JUDGED
    By the shape of its file set, never by its name. A folder name is not evidence: the
    largest apparently-uncatalogued shoot in the account turned out to be a padel tournament.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CAMERA = re.compile(r'^(IMG|DSC|DSCN|VID|MVI|PXL|GOPR|DJI)[-_ ]?\d{3,}', re.I)
GUID = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}', re.I)
PHONE = re.compile(r'^\d{13,}$')
SERIAL = re.compile(r'^[0-9A-Z]{8}$')
WHATSAPP = re.compile(r'^WhatsApp (Image|Video)', re.I)
ARTBOARD = re.compile(r'^(artboard|frame|slide|page)\s*\d+$', re.I)
BARE = re.compile(r'^\d{1,3}$')
SLUG = re.compile(r'^[a-z0-9][a-z0-9 \-_]*[-_]\d{1,3}$', re.I)
VID = {'.mp4', '.mov', '.m4v'}
WORK = {'.psd'}
RAW = {'.cr3', '.cr2', '.dng', '.arw', '.nef', '.raf'}


def shape(folder, files):
    """(treatment, rows_to_create, rationale). One verdict per folder."""
    stems = [os.path.splitext(f['name'])[0] for f in files]
    exts = [os.path.splitext(f['name'])[1].lower() for f in files]
    n = len(files)
    vids = [f for f, e in zip(files, exts) if e in VID]
    work = [f for f, e in zip(files, exts) if e in WORK]
    rawtwin = [f for f, e in zip(files, exts) if e in RAW and any(
        os.path.splitext(g['name'])[0] == os.path.splitext(f['name'])[0]
        and os.path.splitext(g['name'])[1].lower() in ('.jpg', '.jpeg') for g in files)]
    live = [f for f in files if f not in work and f not in rawtwin]
    ln = len(live)
    cam = sum(1 for s in stems if CAMERA.match(s) or GUID.match(s) or PHONE.match(s)
              or SERIAL.match(s) or WHATSAPP.match(s))
    seq = sum(1 for s in stems if ARTBOARD.match(s) or BARE.match(s) or SLUG.match(s))
    low = folder.lower()

    # Two folders resolved by checking the catalogue rather than by shape. Both are already
    # catalogued and need an EDIT to an existing row, not new rows -- verified 21 Sep 2026.
    if 'ai videos' in low:
        return ('relink', 0,
                'Already catalogued as IFM-040..053. Those rows point at our own hosted copies '
                '(ifm-deploy.vercel.app/ifm-logo-pizza-slices...), not at the Drive originals, '
                'so the Drive files read as uncatalogued. Relink the existing rows to the Drive '
                'originals. NOT 17 new rows.')
    if 'teens video' in low and not low.endswith('teens reel'):
        return ('relink', 0,
                'IFM-460 is titled "Hiral piece-to-camera for the teens reel -- 9 takes" and '
                'links ONE file, leaving the other 8 unreachable. It is already a catch-all by '
                'its own description; it just points at a file instead of at its folder. '
                'Relink IFM-460 to the folder. NOT 8 new rows.')

    if '/certificates' in low or low.endswith('certificates'):
        return ('exclude-consent', 0,
                'Certificate images. CLAUDE.md records these show minors and need written '
                'parental consent under the DPDP Act. Excluded pending verification — not '
                'catalogued, not copied, not published.')
    if ln == 0:
        return ('exclude-working', 0,
                'Nothing but design sources (%d PSD) and/or RAW masters duplicating their own '
                'JPEG (%d). Not browsable assets.' % (len(work), len(rawtwin)))
    if cam >= max(3, ln * 0.6) and ln >= 12:
        return ('catch-all', 0,
                '%d camera-serial files. A session dump: the frames are interchangeable and '
                'nobody searches for a specific serial. Catch-all is correct, and one row per '
                'frame is the clutter the moments rule exists to prevent.' % ln)
    if cam >= max(3, ln * 0.6):
        return ('catch-all-small', 0,
                '%d camera-serial files — a small dump. Catch-all, but small enough that '
                'moments could be pulled out later if the content warrants it.' % ln)
    if len(vids) >= 1 and '/reel' in low:
        covers = ln - len(vids)
        return ('row-per-reel', len(vids),
                '%d finished reel%s%s. A reel is the deliverable; its cover art is the '
                'thumbnail, not a separate asset.'
                % (len(vids), 's' if len(vids) > 1 else '',
                   ' plus %d cover image%s' % (covers, 's' if covers != 1 else '') if covers else ''))
    if seq >= max(3, ln * 0.6) and ln <= 14:
        return ('row-per-set', 1,
                '%d sequential artboards. Finished creative, but the SET is one post — one '
                'row for the topic folder, never one per slide.' % ln)
    if len(vids) == ln and ln <= 3:
        return ('row-per-file', ln,
                '%d finished video%s, individually distinct.' % (ln, 's' if ln > 1 else ''))
    if ln <= 3:
        return ('unclear', 0,
                '%d files, no recognisable set shape. Needs a human look before any row is '
                'written.' % ln)
    return ('unclear', 0,
            '%d files, mixed shape (%s). Needs a human look.'
            % (ln, ' '.join('%s×%d' % (e.lstrip('.'), c)
                            for e, c in collections.Counter(exts).most_common(3))))


def main():
    rec = json.load(open(os.path.join(HERE, 'reconciliation.json')))
    byf = collections.defaultdict(lambda: {'B': [], 'C': []})
    for b in ('B', 'C'):
        for x in rec[b]:
            byf[os.path.dirname(x['path'])][b].append(x)

    plan = []
    for folder, d in byf.items():
        files = d['B'] + d['C']
        treat, rows, why = shape(folder, files)
        # A folder already behind a catch-all row does not need that row created again.
        has_row = len(d['B']) > 0
        if treat in ('catch-all', 'catch-all-small') and not has_row:
            rows, treat = 1, treat + '-new'
            why += ' No catch-all row exists for it yet, so one is needed.'
        plan.append({'folder': folder, 'treatment': treat, 'rows': rows, 'why': why,
                     'files': len(files), 'B': len(d['B']), 'C': len(d['C']),
                     'ext': dict(collections.Counter(
                         os.path.splitext(f['name'])[1].lower() for f in files).most_common(4)),
                     'names': [f['name'] for f in files[:3]]})
    plan.sort(key=lambda p: (-p['rows'], -p['files']))

    if '--json' in sys.argv:
        json.dump(plan, open(os.path.join(HERE, 'catalogue-plan.json'), 'w'),
                  ensure_ascii=False, indent=1)
        print('wrote catalogue-plan.json (%d folders)' % len(plan)); return

    tot_rows = sum(p['rows'] for p in plan)
    tot_files = sum(p['files'] for p in plan)
    LAB = {
        'catch-all': 'Keep catch-all — raw session dump',
        'catch-all-small': 'Keep catch-all — small session dump',
        'catch-all-new': 'CREATE one catch-all row — raw session dump with no row yet',
        'catch-all-small-new': 'CREATE one catch-all row — small dump with no row yet',
        'row-per-set': 'CREATE one row per topic folder — finished carousel/story set',
        'row-per-reel': 'CREATE one row per reel — finished video deliverable',
        'row-per-file': 'CREATE one row per file — individually distinct',
        'exclude-consent': 'EXCLUDE pending consent — certificate images of minors',
        'exclude-working': 'EXCLUDE from the corpus — design sources / RAW duplicates',
        'relink': 'RELINK an existing row — already catalogued, wrong target',
        'unclear': 'HUMAN DECISION NEEDED',
    }
    order = ['row-per-set', 'row-per-reel', 'row-per-file', 'catch-all-new',
             'catch-all-small-new', 'catch-all', 'catch-all-small',
             'relink', 'exclude-consent', 'exclude-working', 'unclear']

    print('# Corpus-to-library plan — one consolidated recommendation\n')
    print('Read-only. No catalogue, enrichment file or library flag was modified. '
          'Nothing deployed. `daily-content-processor` remains paused.\n')
    print('Covers every file in the frozen 1,340-file corpus that is not already '
          'individually catalogued: **%d files across %d folders** — bucket C (309 '
          'unreachable) and bucket B (659 behind a catch-all).\n' % (tot_files, len(plan)))
    print('## The recommendation in one line\n')
    print('**Create %d new catalogue rows.** Not 968. The gap between those two numbers is '
          'the whole point of doing this folder by folder.\n' % tot_rows)
    print('| treatment | folders | files | rows to create |')
    print('|---|---|---|---|')
    for k in order:
        sel = [p for p in plan if p['treatment'] == k]
        if sel:
            print('| %s | %d | %d | **%d** |' % (LAB[k], len(sel), sum(p['files'] for p in sel),
                                                 sum(p['rows'] for p in sel)))
    print('| **total** | **%d** | **%d** | **%d** |\n' % (len(plan), tot_files, tot_rows))

    for k in order:
        sel = [p for p in plan if p['treatment'] == k]
        if not sel:
            continue
        print('---\n\n## %s\n' % LAB[k])
        print('%d folders · %d files · **%d rows**\n'
              % (len(sel), sum(p['files'] for p in sel), sum(p['rows'] for p in sel)))
        print('| rows | files | formats | folder | representative filenames |')
        print('|---|---|---|---|---|')
        for p in sel:
            print('| %d | %d | %s | `%s` | %s |'
                  % (p['rows'], p['files'],
                     ' '.join('%s×%d' % (e.lstrip('.'), c) for e, c in p['ext'].items()),
                     p['folder'][-58:], ' · '.join(n[:24] for n in p['names'])))
        print('\n**Rationale.** %s\n' % sel[0]['why'])
        if len(set(p['why'] for p in sel)) > 1:
            print('Folders whose rationale differs:\n')
            seenw = {sel[0]['why']}
            for p in sel:
                if p['why'] not in seenw:
                    seenw.add(p['why'])
                    print('- `%s` — %s' % (p['folder'][-52:], p['why']))
            print()


if __name__ == '__main__':
    main()
