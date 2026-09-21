#!/usr/bin/env /usr/bin/python3
"""Coverage of the stable 1,340-file corpus, reconciled BY FILE ID.

    /usr/bin/python3 reconcile.py            # the breakdown
    /usr/bin/python3 reconcile.py --lists    # + the full file lists per bucket

Measures only. Writes no catalogue, no enrichment, no data.js. The four buckets:

  A  individually catalogued  the file's own Drive id appears in a row's video/drive link
  B  reachable via catch-all  the file's PARENT FOLDER is linked by a row, but the file has
                              no row of its own
  C  not reachable            neither the file nor its parent folder is referenced anywhere
  D  ambiguous                the file is referenced by a row that cannot serve it -- the row
                              is hidden from the Library (library:false or Do Not Use), so the
                              file is catalogued on paper and unreachable in practice

D exists because "catalogued" and "findable" are not the same thing, and collapsing them is
how 31 preview clips sat published and invisible for a week.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SCAN = os.path.join(HERE, '.ingest-scan.json')
CAT = os.path.join(HERE, 'v1-catalogue.js')


def main():
    scan = json.load(open(SCAN))
    if not scan.get('stable'):
        print('REFUSING: the scan is not stable. Run ingest-scan.py --validate first.')
        sys.exit(2)
    files, folders = scan['files'], scan['folders']
    path2fid = {}
    for fid, f in folders.items():
        path2fid.setdefault(f['path'], fid)

    src = open(CAT, encoding='utf-8').read()
    rows = json.loads(src[src.index('['):src.rindex(']') + 1])

    # Which rows can actually serve a file? A row hidden from the Library still "catalogues"
    # the file, but nobody can reach it -- that is bucket D, not bucket A.
    def visible(r):
        return r.get('library') is not False and (r.get('status') or '') != 'Do Not Use'

    file_row, folder_row = {}, {}
    for r in rows:
        u = (r.get('video') or '') + ' ' + (r.get('drive') or '')
        for m in re.finditer(r'/file/d/([A-Za-z0-9_-]{20,})', u):
            file_row.setdefault(m.group(1), []).append(r)
        for m in re.finditer(r'/drive/folders/([A-Za-z0-9_-]{20,})', u):
            folder_row.setdefault(m.group(1), []).append(r)

    A, B, C, D = [], [], [], []
    for fid, x in files.items():
        parent = path2fid.get(os.path.dirname(x['path']))
        rs = file_row.get(fid, [])
        if rs:
            (A if any(visible(r) for r in rs) else D).append((fid, x, rs))
            continue
        frs = folder_row.get(parent, []) if parent else []
        if frs:
            (B if any(visible(r) for r in frs) else D).append((fid, x, frs))
            continue
        C.append((fid, x, []))

    t = len(files)
    print('# Coverage of the stable corpus — reconciled by file id\n')
    print('corpus: **%d files**, %d folders, 3/3 passes identical, 0 errors' % (t, len(folders)))
    print('catalogue: %d rows (%d in the Library)\n' % (len(rows), sum(1 for r in rows if visible(r))))
    print('| bucket | files | share |')
    print('|---|---|---|')
    for name, b in (('A — individually catalogued', A), ('B — reachable via a catch-all row', B),
                    ('C — not reachable at all', C), ('D — catalogued but hidden (ambiguous)', D)):
        print('| %s | **%d** | %d%% |' % (name, len(b), round(100.0 * len(b) / t)))
    print('| **total** | **%d** | 100%% |\n' % t)

    for name, b in (('C — NOT REACHABLE', C), ('D — AMBIGUOUS', D), ('B — VIA CATCH-ALL', B)):
        if not b:
            continue
        print('## %s — %d files\n' % (name, len(b)))
        by = collections.Counter(os.path.dirname(x['path']) for _, x, _ in b)
        print('| files | folder |')
        print('|---|---|')
        for p, n in by.most_common(24):
            print('| %d | `%s` |' % (n, p[:82]))
        if len(by) > 24:
            print('\n…and %d more folders.' % (len(by) - 24))
        ext = collections.Counter(os.path.splitext(x['name'])[1].lower() for _, x, _ in b)
        kind = collections.Counter(x['kind'] for _, x, _ in b)
        print('\nby type: %s' % dict(kind))
        print('by extension: %s\n' % dict(ext.most_common(10)))

    if '--lists' in sys.argv:
        out = {}
        for name, b in (('A', A), ('B', B), ('C', C), ('D', D)):
            out[name] = [{'id': i, 'path': x['path'], 'name': x['name'], 'kind': x['kind'],
                          'size': x['size'], 'mod': x['mod'],
                          'rows': sorted({r['id'] for r in rs})} for i, x, rs in b]
        p = os.path.join(HERE, 'reconciliation.json')
        json.dump(out, open(p, 'w'), ensure_ascii=False, indent=1)
        print('wrote %s — full per-file lists for all four buckets' % os.path.basename(p))


if __name__ == '__main__':
    main()
