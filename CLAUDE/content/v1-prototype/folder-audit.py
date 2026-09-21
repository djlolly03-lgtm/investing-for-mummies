#!/usr/bin/env /usr/bin/python3
"""Have we actually scanned every folder and subfolder on the Drive?

    /usr/bin/python3 folder-audit.py --walk     # walk every tree, one node at a time (slow)
    /usr/bin/python3 folder-audit.py            # report from the cache, no network

WHY THIS IS WALKED NODE BY NODE AND NOT WITH `-R`
    `rclone lsjson -R` under-reports non-deterministically on this Drive. A full-drive scan
    on 19 Sep 2026 missed an entire event that way. So every folder is listed on its own,
    and a folder whose listing FAILS is recorded as `error`, never as empty.

    That distinction is the whole point of this audit. On 20 Sep, four rows were recorded as
    "no video in folder" when the listing had merely timed out -- and preview clips had
    already been built from those same four folders, so they demonstrably contained video.
    An unknown must never be written down as a zero.

WHAT IT REPORTS
    Every folder reachable from the registered roots, how many media files it holds, and
    whether anything in it is catalogued. Three outcomes per folder:
      COVERED    at least one file in it is in the catalogue
      EMPTY      it genuinely holds no media (listing succeeded, count was 0)
      UNSEEN     it holds media and NOTHING in it is catalogued   <-- the gap
      ERROR      the listing failed; contents unknown              <-- not a zero
"""
import json, os, re, subprocess, sys, time, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = '/tmp/folder-audit.json'
CAT = os.path.join(HERE, 'v1-catalogue.js')

# The registered roots, from CLAUDE.md, plus the two extra roots the cached indexes cover.
ROOTS = {
    '1mwN-stIOLrCabOP8Vjhp6ZG_6ARzWiiL': 'IFM Content Drop',
    '1tYW_y3F5Sl6AQJbKXD6JWTJn_023Ud7-': '_Trash (inside Content Drop)',
    '1OPOAbJ_MsKxrz7Ijq6tLaxdA6eMr6Vw4': 'Hiral — Media Kit',
    '11MncEXMdZy3sP2pTt0zfibLbEn30ldOO': 'Sakshi uploads',
    '1CasigFU-SKr_X__0d7ywpjTE9-jmDcgA': 'Certificates',
    '1G-T-sRyu57CaISGa2Et0_FyKzeSqclCl': 'Aakara delivery tree',
    '1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY': 'Content Library (root of the cached index)',
    '1c2n-puASb7UjRy-kQU_3_3J0TBXJvDMP': 'IFM Content Archive (our own copy)',
}

# FOUND 21 Sep 2026 BY THIS AUDIT. The eight roots above are what every previous scan used.
# My Drive holds 16 top-level folders and shared-with-me holds 52, and only 8 of those 68
# were ever walked. These are the ones outside the registered roots whose NAME suggests IFM
# content. They are listed explicitly rather than pattern-matched, so the judgement is
# reviewable and a wrong call is visible.
CANDIDATES = {
    '1UIAjLy61ifB3wQUJCou9v7VFX5yinmuO': 'delhi workshop 16th sept (My Drive)',
    '1t7NxPEc54Aw_UxJXyzZ0jK_sw7WzQrji': 'IFM Content Hub (My Drive)',
    '1YpTsB0We548H-WFlEZJFbhMfZS9iotnp': 'IFM handbook (My Drive)',
    '14MGA1sLI2QQFJ8ikla-g3dqCTvk_F8MN': '12.09.2026 (shared)',
    '11Ua2v96LSSsyjnvhFNhkMmngVmabV_oH': '26.07.2026 (shared)',
    '1AycliNg-Ny-Y7rNrW9GbyqXEu3h_CMYQ': '27th Feb 28th Feb 1st March (shared)',
    '1NPsczlTjOshzwxenJRwlWZdsef_0zCE2': 'All Chapters_August 2023 (shared)',
    '1cmcKiJoS6HRwtIj3o6nuzz5iZqAi0WMV': 'All Chapters_September 2022 (shared)',
    '1lbZC-f6dltCDkLimVpHiLh6V9Fgz74wa': 'Alumni Notes - Jan 2023 (shared)',
    '1cT-JCKhCvrdnkaFls5KFfaH7Zr7-VsyS': 'Delhi work Shop (shared)',
    '1EG61qxMSdX36e7MeIqGtVH5fB8AktKqV': 'Edited Pictures (shared)',
    '1z-rLgGvpYD3Hns_ZakWO_0iLR_3aPwsI': 'Hiral Goel (shared)',
    '1UqkrsmMYYlj8bOT3NW794P0aEraPR12S': 'Infinity Feedback form (shared)',
    '1VQzYUiSUI294fXtoY8EviH3gDv9XH4YX': 'Mumbai_January 2020 (shared)',
    '17XRWi56C7Er-Rywm9rUxu3HZjCG6cada': 'Pictures (shared)',
    '1kW1Gpwq1TM3PUHQvd_XXJ-tXPZNaRlqF': 'Workshop Pictures (shared)',
    '1AJKkSjBHaSMepMWlJiXALy0Ym-mK4k-O': "Ganpati's Case study (shared)",
    # folders a catalogue row already links to, but which are NOT inside any registered root
    '152_v76R684SsMdI-QBaLAcdPJZCuD3BK': 'Asset Class 2 (linked by a row)',
    '17EErsy4pp7huiMwSLU8lGcWr2OQxifvE': 'Inflation (linked by a row)',
    '1eVutEOYaeP5f1oxyIQsmxwmxBNs-mrx3': 'Join IFM now (linked by a row)',
    '1wt2XSJk5gDVZQTI8jibW2DZKWmtA9Brw': 'MML 2 (linked by a row)',
    '1FrE-A4xMaPFv-zjo61cWcG9Ea6ZsaccJ': 'Rakshita (linked by a row)',
    '17U-InCX9Lwgf-PYS7lSsDA6HGB-_Ayzp': 'S2 Words people secretly Google (linked by a row)',
    '1l7miwiXG526HdJae1KxIylCVP_3BG7A1': 'S6 saving investing (linked by a row)',
    '1ps-zDRJLzehGV5ugmAWD_Fo-rD4gLP42': 'Teachers Day (linked by a row)',
    '1UsqgAdCafw_Qu0HIPNi_JmzIctr-qNN-': 'Why Women Feel Left Out (linked by a row)',
}
ROOTS.update(CANDIDATES)
MEDIA = re.compile(r'\.(mp4|mov|m4v|avi|webm|mkv|jpe?g|png|heic|heif|gif|webp|tiff?|bmp|cr3|'
                   r'dng|arw|nef|raf|pdf)$', re.I)


def load_cache():
    if os.path.exists(CACHE):
        try:
            return json.load(open(CACHE))
        except Exception:
            pass
    return {'nodes': {}}


def save(c):
    json.dump(c, open(CACHE, 'w'))


def lsjson(fid, dirs_only):
    """One folder, one level. Returns (items, error). Never conflates the two."""
    args = ['rclone', 'lsjson', '--drive-root-folder-id', fid, 'gdrive:',
            '--timeout', '60s', '--contimeout', '20s', '--low-level-retries', '3',
            '--retries', '2']
    if dirs_only:
        args.append('--dirs-only')
    else:
        args.append('--files-only')
    for attempt in (1, 2):
        try:
            r = subprocess.run(args, capture_output=True, text=True, timeout=240)
        except subprocess.TimeoutExpired:
            continue
        if r.returncode != 0:
            continue
        try:
            return json.loads(r.stdout or '[]'), None
        except Exception:
            continue
    return None, 'listing failed'


def walk():
    c = load_cache()
    nodes = c['nodes']
    queue = [(fid, name, name) for fid, name in ROOTS.items()]
    seen = set()
    done = 0
    while queue:
        fid, name, path = queue.pop(0)
        if fid in seen:
            continue
        seen.add(fid)
        if fid in nodes and not nodes[fid].get('error'):
            for k in nodes[fid].get('kids', []):
                queue.append((k['id'], k['name'], path + '/' + k['name']))
            continue
        files, ferr = lsjson(fid, dirs_only=False)
        dirs, derr = lsjson(fid, dirs_only=True)
        rec = {'name': name, 'path': path}
        if ferr or derr:
            rec['error'] = ferr or derr
        else:
            med = [f for f in files if MEDIA.search(f.get('Name', ''))]
            rec['files'] = len(files)
            rec['media'] = len(med)
            rec['ids'] = [f['ID'] for f in med if f.get('ID')]
            rec['kids'] = [{'id': d['ID'], 'name': d['Name']} for d in dirs if d.get('ID')]
            for d in rec['kids']:
                queue.append((d['id'], d['name'], path + '/' + d['name']))
        nodes[fid] = rec
        done += 1
        if done % 10 == 0:
            save(c)
            print('  walked %d folders, %d queued' % (done, len(queue)), flush=True)
    save(c)
    print('walk complete: %d folders' % len(nodes))


def catalogued_ids():
    s = open(CAT, encoding='utf-8').read()
    rows = json.loads(s[s.index('['):s.rindex(']') + 1])
    ids = set()
    for r in rows:
        blob = json.dumps(r)
        for m in re.finditer(r'/file/d/([A-Za-z0-9_-]{20,})', blob):
            ids.add(m.group(1))
        for m in re.finditer(r'/drive/folders/([A-Za-z0-9_-]{20,})', blob):
            ids.add('FOLDER:' + m.group(1))
    return ids


def report():
    c = load_cache()
    nodes = c['nodes']
    if not nodes:
        print('No cache. Run with --walk first.')
        return
    cat = catalogued_ids()
    buckets = collections.defaultdict(list)
    tot_media = 0
    for fid, n in nodes.items():
        if n.get('error'):
            buckets['ERROR'].append((fid, n))
            continue
        tot_media += n.get('media', 0)
        if not n.get('media'):
            buckets['EMPTY'].append((fid, n))
        elif any(i in cat for i in n.get('ids', [])) or ('FOLDER:' + fid) in cat:
            buckets['COVERED'].append((fid, n))
        else:
            buckets['UNSEEN'].append((fid, n))

    print('# Folder & subfolder audit\n')
    print('Walked node by node, never with `rclone lsjson -R`, which under-reports on this '
          'Drive. A folder whose listing failed is reported as ERROR, never as empty.\n')
    print('| outcome | folders | meaning |')
    print('|---|---|---|')
    print('| COVERED | %d | at least one file in it is in the catalogue |' % len(buckets['COVERED']))
    print('| UNSEEN | %d | **holds media, nothing in it is catalogued** |' % len(buckets['UNSEEN']))
    print('| EMPTY | %d | listing succeeded, genuinely no media |' % len(buckets['EMPTY']))
    print('| ERROR | %d | listing failed — contents UNKNOWN, not zero |' % len(buckets['ERROR']))
    print('| **total** | **%d** | %d media files seen |\n' % (len(nodes), tot_media))

    if buckets['UNSEEN']:
        print('## UNSEEN — folders holding media with nothing catalogued\n')
        print('| files | media | path |')
        print('|---|---|---|')
        for fid, n in sorted(buckets['UNSEEN'], key=lambda x: -x[1]['media']):
            print('| %d | **%d** | `%s` |' % (n['files'], n['media'], n['path'][:88]))
        print()
    if buckets['ERROR']:
        print('## ERROR — could not be listed, contents unknown\n')
        for fid, n in buckets['ERROR']:
            print('- `%s` — %s (`%s`)' % (n['path'][:80], n['error'], fid))
        print()
    print('## COVERED — folders with catalogued content\n')
    print('| media | path |')
    print('|---|---|')
    for fid, n in sorted(buckets['COVERED'], key=lambda x: -x[1]['media'])[:60]:
        print('| %d | `%s` |' % (n['media'], n['path'][:92]))
    if len(buckets['COVERED']) > 60:
        print('\n…and %d more covered folders.' % (len(buckets['COVERED']) - 60))
    print()


if __name__ == '__main__':
    if '--walk' in sys.argv:
        walk()
    report()
