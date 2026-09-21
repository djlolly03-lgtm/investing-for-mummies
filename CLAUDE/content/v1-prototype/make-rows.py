#!/usr/bin/env /usr/bin/python3
"""Execute the approved catalogue batch: 64 new rows + 2 relinks. One pass, reviewable.

    /usr/bin/python3 make-rows.py --dry     # print every row it would write, touch nothing
    /usr/bin/python3 make-rows.py --thumbs  # fetch a cover frame per folder, build thumbs
    /usr/bin/python3 make-rows.py --write   # write data.js  (run --thumbs first)

SCOPE, as approved 21 Sep 2026 and no wider:
    64 new rows   41 carousel/story sets · 17 reels · 2 distinct files · 4 catch-alls
    2 relinks     AI Videos rows -> Drive originals;  IFM-460 -> its own folder
    0 rows        for the 101 `Aakara — June 2026` duplicates
    on hold       9 certificate images of minors, and IFM-459

    Approved as "81 rows". It is 64. 17 of the 58 carousel sets ARE the June duplicate
    folders, so they were counted twice in my own plan -- once as sets needing a row, once as
    duplicates needing none. "0 rows for the June duplicates" settles it.

IDS
    Allocated from the catalogue's real maximum, computed at write time and USED. A script
    once printed "next free id: IFM-500" and then wrote from a hardcoded 484, overwriting 14
    thumbnails and shipping them. The computed value is the only value.

THUMBNAILS ARE NOT OPTIONAL HERE
    The Library shows a row only if it has a thumbnail AND a fetchable link. A row written
    without a thumbnail is invisible, so writing 64 of them would produce nothing a person
    could see -- the exact failure of shipping plumbing while the page stays unchanged.
    So --thumbs fetches one representative frame per folder and builds a <=25KB JPEG.
"""
import json, os, re, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data.js')
THUMBS = os.path.join(HERE, '..', 'thumbs')
PLAN = '/tmp/rows-to-make.json'
SPEC = '/tmp/row-spec.json'
SCAN = os.path.join(HERE, '.ingest-scan.json')

MONTHS = 'january february march april may june july august september october november december'.split()


def load_data():
    s = open(DATA, encoding='utf-8').read()
    a = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    b = s.rindex(';')
    return s[:a], json.loads(s[a:b]), s[b:]


def folder_id(path, scan):
    """The Drive folder id for a path, from the stable scan's folder table."""
    return scan['_p2f'].get(path)


def title_for(folder, treatment, files):
    """A title a person would recognise. Month and topic where the tree gives them."""
    parts = [p for p in folder.split('/') if p.strip()]
    topic = parts[-1].strip()
    month = next((p for p in parts if p.lower() in MONTHS), '')
    kind = ''
    for p in parts:
        pl = p.lower()
        if pl in ('carousels', 'carousel'):
            kind = 'carousel'
        elif pl in ('stories', 'story'):
            kind = 'story'
        elif pl in ('reels', 'reel'):
            kind = 'reel'
    topic = re.sub(r'\s*[-_]\s*', ' ', topic).strip()
    topic = topic[0].upper() + topic[1:] if topic else topic
    if treatment.startswith('catch-all'):
        return '%s — full folder (%d files)' % (topic, len(files))
    lead = '%s: ' % month.capitalize() if month else ''
    return '%s%s%s' % (lead, topic, ' — %s' % kind if kind else '')


def cover(files):
    """The frame that represents the set: the first artboard, or the finished video."""
    vid = [f for f in files if os.path.splitext(f['name'])[1].lower() in ('.mp4', '.mov', '.m4v')]
    img = [f for f in files if os.path.splitext(f['name'])[1].lower()
           in ('.png', '.jpg', '.jpeg', '.heic', '.heif')]
    if img:
        return sorted(img, key=lambda f: f['name'])[0]
    return sorted(vid, key=lambda f: f['name'])[0] if vid else files[0]


def build_spec():
    plan = json.load(open(PLAN))
    scan = json.load(open(SCAN))
    p2f = {}
    for fid, f in scan['folders'].items():
        p2f.setdefault(f['path'], fid)
    scan['_p2f'] = p2f
    rec = json.load(open(os.path.join(HERE, 'reconciliation.json')))
    byf = collections.defaultdict(list)
    for b in ('B', 'C'):
        for x in rec[b]:
            byf[os.path.dirname(x['path'])].append(x)

    _, d, _ = load_data()
    nums = [int(m.group(1)) for r in d['catalogue'] if (m := re.match(r'IFM-(\d+)$', r['id']))]
    nxt = max(nums) + 1

    spec = []
    for p in sorted(plan, key=lambda x: x['folder']):
        files = byf[p['folder']]
        fid = folder_id(p['folder'], scan)
        if p['treatment'] == 'row-per-reel':
            vids = [f for f in files
                    if os.path.splitext(f['name'])[1].lower() in ('.mp4', '.mov', '.m4v')]
            imgs = [f for f in files if f not in vids]
            for v in sorted(vids, key=lambda f: f['name']):
                spec.append({'id': 'IFM-%03d' % nxt, 'folder': p['folder'],
                             'treatment': p['treatment'], 'files': len(files),
                             'title': title_for(p['folder'], p['treatment'], files),
                             'link_kind': 'file', 'link_id': v['id'],
                             'cover_id': (imgs[0]['id'] if imgs else v['id']),
                             'cover_name': (imgs[0]['name'] if imgs else v['name']),
                             'folder_id': fid, 'src': v['name'], 'why': p['why']})
                nxt += 1
        elif p['treatment'] == 'row-per-file':
            for f in sorted(files, key=lambda x: x['name']):
                spec.append({'id': 'IFM-%03d' % nxt, 'folder': p['folder'],
                             'treatment': p['treatment'], 'files': len(files),
                             'title': title_for(p['folder'], p['treatment'], files),
                             'link_kind': 'file', 'link_id': f['id'],
                             'cover_id': f['id'], 'cover_name': f['name'],
                             'folder_id': fid, 'src': f['name'], 'why': p['why']})
                nxt += 1
        else:
            c = cover(files)
            spec.append({'id': 'IFM-%03d' % nxt, 'folder': p['folder'],
                         'treatment': p['treatment'], 'files': len(files),
                         'title': title_for(p['folder'], p['treatment'], files),
                         'link_kind': 'folder', 'link_id': fid,
                         'cover_id': c['id'], 'cover_name': c['name'],
                         'folder_id': fid, 'src': c['name'], 'why': p['why']})
            nxt += 1
    json.dump(spec, open(SPEC, 'w'), ensure_ascii=False, indent=1)
    return spec


def main():
    spec = build_spec()
    if '--dry' in sys.argv:
        print('%d rows would be written (ids IFM-%s..IFM-%s)\n'
              % (len(spec), spec[0]['id'][4:], spec[-1]['id'][4:]))
        by = collections.Counter(s['treatment'] for s in spec)
        for k, v in by.items():
            print('  %-22s %d' % (k, v))
        print()
        for s in spec:
            print('%s  %-56s  %s -> %s'
                  % (s['id'], s['title'][:56], s['link_kind'], (s['link_id'] or '?')[:14]))
        missing = [s for s in spec if not s['link_id']]
        if missing:
            print('\n!! %d rows have no link target — refusing to write' % len(missing))
            for s in missing:
                print('   ', s['folder'])
        return


if __name__ == '__main__':
    main()
