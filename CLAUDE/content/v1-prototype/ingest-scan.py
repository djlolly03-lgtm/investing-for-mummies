#!/usr/bin/env /usr/bin/python3
"""The ingestion scanner. Produces the authoritative list of IFM media files on Drive.

    /usr/bin/python3 ingest-scan.py --scan          # one pass
    /usr/bin/python3 ingest-scan.py --validate      # THREE passes, reconcile, pass/fail
    /usr/bin/python3 ingest-scan.py --report        # read the last result, no network

REPLACES `rclone lsjson -R`, WHICH IS NOT STABLE ON THIS DRIVE
    Three separate runs of the same recursive listing returned 1,325 / 1,196 / — file counts
    for the same question on 21 Sep 2026, and an earlier full-drive scan missed an entire
    event. A recursive listing gives one answer for a whole subtree, so when it under-reports
    there is nothing to compare and no way to tell.

    This walks ONE FOLDER AT A TIME, breadth first. Each folder is listed on its own, with
    retries, and the result is recorded per node. That buys three things a recursive listing
    cannot give:
      - a failed listing is recorded as an ERROR against that folder, never as "empty"
      - the same folder reached by two paths is one node, keyed by id
      - a missing subtree is visible as a specific folder that failed, not as a smaller number

    An empty listing and a failed listing are different answers. Conflating them is what wrote
    "no video in folder" into four records whose folders demonstrably held video.

FORMATS
    HEIC and PSD are included. They were not, and 103 `.heic` files across the registered roots
    were invisible to every previous scan -- the string ".heic" appears nowhere in the
    catalogue. That is the same defect as the `.CR3` bug found on 19 Sep: a scan filtering on
    "common" photo extensions. CR3 was fixed; HEIC was never checked. RAW formats are in the
    list for the same reason.

APPLEDOUBLE
    macOS writes a `._<name>` sidecar for every file copied to a non-Mac filesystem. They are
    metadata stubs, not media. 176 of the 376 files listed under `Rakshita` were `._` stubs,
    which inflated every count in the 20 Sep folder audit. Excluded globally, along with
    `.DS_Store` and `Icon\r`.
"""
import json, os, re, subprocess, sys, time, collections

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '.ingest-scan.json')

# CORRECTED 21 Sep 2026. Established by asking which IFM folders are reachable from which
# other IFM folder, not by reading CLAUDE.md. The old list pointed at `Content Library`
# instead of its parent `IFM Content Hub`, and omitted Pictures, Workshop Pictures, Rakshita
# and Hiral Goel entirely -- 565 media files in My Drive had never been walked by anything.
#
# Over-registering is safe: nodes are keyed by folder id and files are deduplicated by file
# id, so a root that turns out to sit inside another costs one extra listing and nothing else.
# Under-registering is the defect this list exists to fix. `Rakshita` is registered explicitly
# because it reports as top level in one listing and as `IFM/workshop/Rakshita` in another.
ROOTS = {
    '1G-T-sRyu57CaISGa2Et0_FyKzeSqclCl': 'IFM (Aakara delivery tree)',
    '1t7NxPEc54Aw_UxJXyzZ0jK_sw7WzQrji': 'IFM Content Hub (parent of Content Library)',
    '1mwN-stIOLrCabOP8Vjhp6ZG_6ARzWiiL': 'IFM Content Drop',
    '1tYW_y3F5Sl6AQJbKXD6JWTJn_023Ud7-': '_Trash (inside Content Drop)',
    '11MncEXMdZy3sP2pTt0zfibLbEn30ldOO': 'Sakshi uploads',
    '1CasigFU-SKr_X__0d7ywpjTE9-jmDcgA': 'Certificates',
    '1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY': 'Content Library',
    '17XRWi56C7Er-Rywm9rUxu3HZjCG6cada': 'Pictures',
    '1kW1Gpwq1TM3PUHQvd_XXJ-tXPZNaRlqF': 'Workshop Pictures',
    '1FrE-A4xMaPFv-zjo61cWcG9Ea6ZsaccJ': 'Rakshita',
    '1z-rLgGvpYD3Hns_ZakWO_0iLR_3aPwsI': 'Hiral Goel',
    '1oAeY4FH9IjpuddkfzKwdNU5i1XO_VXN0': 'Space x (IFM carousel artboards)',
    '1YpTsB0We548H-WFlEZJFbhMfZS9iotnp': 'IFM handbook',
    '1UIAjLy61ifB3wQUJCou9v7VFX5yinmuO': 'delhi workshop 16th sept',
    '1cT-JCKhCvrdnkaFls5KFfaH7Zr7-VsyS': 'Delhi work Shop',
}

VIDEO = {'mp4', 'mov', 'm4v', 'avi', 'webm', 'mkv', 'mpg', 'mpeg', '3gp'}
IMAGE = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff',
         'heic', 'heif',                      # added 21 Sep: 103 files were invisible
         'psd',                               # added 21 Sep: 13 files, Aakara working files
         'cr3', 'cr2', 'dng', 'arw', 'nef', 'raf', 'orf', 'rw2'}   # RAW
MEDIA_EXT = VIDEO | IMAGE


def is_media(name):
    """AppleDouble and OS junk are never media, whatever their extension says."""
    base = os.path.basename(name)
    if base.startswith('._') or base in ('.DS_Store', 'Icon\r', 'Thumbs.db', 'desktop.ini'):
        return False
    ext = os.path.splitext(base)[1].lstrip('.').lower()
    return ext in MEDIA_EXT


def kind_of(name):
    ext = os.path.splitext(name)[1].lstrip('.').lower()
    return 'video' if ext in VIDEO else 'image'


def lsjson(fid, dirs_only):
    """One folder, one level. Returns (items, error) -- never conflates empty with failed."""
    args = ['rclone', 'lsjson', '--drive-root-folder-id', fid, 'gdrive:',
            '--dirs-only' if dirs_only else '--files-only',
            '--timeout', '60s', '--contimeout', '20s',
            '--low-level-retries', '5', '--retries', '3']
    for attempt in (1, 2, 3):
        try:
            r = subprocess.run(args, capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            time.sleep(attempt * 3)
            continue
        if r.returncode != 0:
            time.sleep(attempt * 3)
            continue
        try:
            return json.loads(r.stdout or '[]'), None
        except Exception:
            time.sleep(attempt * 3)
    return None, 'listing failed after 3 attempts'


def scan(quiet=False):
    """One full breadth-first pass. Returns {files: {id: {...}}, folders: {...}, errors: [...]}"""
    files, folders, errors = {}, {}, []
    queue = [(fid, name) for fid, name in ROOTS.items()]
    seen = set()
    while queue:
        fid, path = queue.pop(0)
        if fid in seen:
            continue
        seen.add(fid)
        fl, ferr = lsjson(fid, False)
        dl, derr = lsjson(fid, True)
        if ferr or derr:
            errors.append({'id': fid, 'path': path, 'error': ferr or derr})
            if not quiet:
                print('  ERROR  %s' % path[:70], flush=True)
            continue
        med = 0
        for x in fl:
            n = x.get('Name', '')
            if not is_media(n):
                continue
            i = x.get('ID')
            if not i:
                continue
            med += 1
            if i not in files:
                files[i] = {'name': n, 'path': path + '/' + n, 'size': x.get('Size') or 0,
                            'mod': (x.get('ModTime') or '')[:10], 'kind': kind_of(n)}
        folders[fid] = {'path': path, 'files': len(fl), 'media': med,
                        'subfolders': len(dl)}
        for d in dl:
            if d.get('ID'):
                queue.append((d['ID'], path + '/' + d.get('Name', '?')))
    return {'files': files, 'folders': folders, 'errors': errors}


def validate():
    """Three consecutive passes. Reconcile by file id. Refuse to pass unless they agree."""
    passes = []
    for p in (1, 2, 3):
        print('=== pass %d ===' % p, flush=True)
        t0 = time.time()
        r = scan()
        print('  %d folders, %d media files, %d errors, %.0fs'
              % (len(r['folders']), len(r['files']), len(r['errors']), time.time() - t0),
              flush=True)
        passes.append(r)

    sets = [set(p['files']) for p in passes]
    union = set().union(*sets)
    inter = set.intersection(*sets)
    stable = all(s == sets[0] for s in sets) and not any(p['errors'] for p in passes)

    print()
    print('=' * 70)
    print('RECONCILIATION')
    for i, s in enumerate(sets, 1):
        print('  pass %d: %d files' % (i, len(s)))
    print('  union       : %d' % len(union))
    print('  in all three: %d' % len(inter))
    print('  unstable    : %d file ids appeared in some passes but not others'
          % len(union - inter))
    errs = sum(len(p['errors']) for p in passes)
    print('  errors      : %d across the three passes' % errs)
    if union - inter:
        print('\n  the unstable ids:')
        for i in sorted(union - inter)[:25]:
            src = next(p['files'][i] for p in passes if i in p['files'])
            missing = [str(n) for n, s in enumerate(sets, 1) if i not in s]
            print('     %-46s missing from pass %s' % (src['path'][-46:], ','.join(missing)))
    for p in passes:
        for e in p['errors']:
            print('     ERROR %s — %s' % (e['path'][:60], e['error']))

    print()
    if stable:
        print('STABLE. The same corpus was produced three times running.')
    else:
        print('NOT STABLE. Do not proceed. Fix the cause, then re-run --validate.')

    out = {'stable': stable, 'passes': [len(s) for s in sets], 'union': len(union),
           'intersection': len(inter), 'errors': errs,
           'files': passes[0]['files'] if stable else
                    {i: passes[0]['files'].get(i) or next(p['files'][i] for p in passes if i in p['files'])
                     for i in union},
           'folders': passes[0]['folders']}
    json.dump(out, open(OUT, 'w'), ensure_ascii=False)
    print('wrote %s' % os.path.basename(OUT))
    return 0 if stable else 1


def report():
    if not os.path.exists(OUT):
        print('no scan yet — run --validate'); return
    d = json.load(open(OUT))
    f = d['files']
    print('stable: %s | passes: %s | union %d | in all three %d | errors %d'
          % (d['stable'], d['passes'], d['union'], d['intersection'], d['errors']))
    print('media files: %d  (%d video, %d image)'
          % (len(f), sum(1 for x in f.values() if x['kind'] == 'video'),
             sum(1 for x in f.values() if x['kind'] == 'image')))
    ext = collections.Counter(os.path.splitext(x['name'])[1].lower() for x in f.values())
    print('by extension:', dict(ext.most_common(14)))
    print('total size: %.1f GB' % (sum(x['size'] for x in f.values()) / 2 ** 30))


if __name__ == '__main__':
    if '--validate' in sys.argv:
        sys.exit(validate())
    elif '--scan' in sys.argv:
        r = scan()
        print('%d folders, %d media files, %d errors'
              % (len(r['folders']), len(r['files']), len(r['errors'])))
    else:
        report()
