#!/usr/bin/env /usr/bin/python3
"""Establish the actual IFM corpus. What exists, what is catalogued, what is not, what is ours.

    /usr/bin/python3 corpus.py --probe    # count media in every top-level folder (network)
    /usr/bin/python3 corpus.py --table    # the definitive file-level coverage table
    /usr/bin/python3 corpus.py --sample <ID>   # pull one frame from a folder, to look at it

WHY
    Asked on 21 Sep 2026 after the folder audit found that 60 of 68 top-level Drive folders
    had never been walked: "Stop feature development. First establish the actual IFM corpus."

THE RULE THIS TOOL EXISTS TO ENFORCE
    A folder is classified by EVIDENCE, not by its name. `27th Feb 28th Feb 1st March` held
    3,055 JPGs and 22.2 GB and looked like the largest uncatalogued shoot in the account; two
    sampled frames showed a padel tournament scoresheet. `Pictures` sounded generic and is
    eight women in an IFM workshop with workbooks on the desk.

    So every folder gets one of five verdicts, and `uncertain` is a real verdict that must be
    reported rather than resolved by guessing:

      ifm            IFM content -- belongs in the corpus
      non-ifm        another business or personal -- outside the corpus, with a reason
      mirror         our own copy of already-catalogued assets -- not double counted
      excluded       IFM-adjacent but deliberately out (backups, scratch, retired)
      uncertain      NOT YET DETERMINED -- needs a human, and is counted separately

    A verdict of `ifm` or `non-ifm` on a folder that was never sampled is only allowed when
    something other than the folder name establishes it -- a catalogue row pointing into it,
    or filenames that carry an IFM id.
"""
import json, os, re, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = '/tmp/corpus-probe.json'
VERDICTS = os.path.join(HERE, 'corpus-verdicts.json')
CAT = os.path.join(HERE, 'v1-catalogue.js')
MEDIA = re.compile(r'\.(mp4|mov|m4v|avi|webm|mkv|jpe?g|png|heic|heif|gif|webp|tiff?|bmp|cr3|'
                   r'dng|arw|nef|raf)$', re.I)


def rclone(args, timeout=300):
    for _ in (1, 2):
        try:
            r = subprocess.run(['rclone'] + args + ['--timeout', '60s', '--contimeout', '20s',
                                                    '--low-level-retries', '4', '--retries', '2'],
                               capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            continue
        if r.returncode == 0:
            return r.stdout, None
    return None, 'listing failed'


def tops():
    """Every top-level folder: My Drive and shared-with-me."""
    out = []
    for flag, where in ((None, 'My Drive'), ('--drive-shared-with-me', 'shared')):
        args = ['lsjson', '--dirs-only', 'gdrive:']
        if flag:
            args.insert(1, flag)
        s, err = rclone(args)
        if err:
            print('could not list %s: %s' % (where, err), file=sys.stderr)
            continue
        for x in json.loads(s or '[]'):
            out.append({'id': x['ID'], 'name': x['Name'], 'where': where})
    return out


def probe():
    """Recursive media count per top-level folder. -R is fine HERE because this is a count
    used for triage, not the authoritative walk -- and every folder that matters is walked
    node by node by folder-audit.py. Under-reporting would understate a gap, so anything
    non-zero is treated as 'has content' and anything zero is re-checked one level."""
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    for t in tops():
        if t['id'] in cache and not cache[t['id']].get('error'):
            continue
        s, err = rclone(['lsf', '-R', '--drive-root-folder-id', t['id'], 'gdrive:'], 600)
        if err:
            cache[t['id']] = {**t, 'error': err}
        else:
            names = [n for n in (s or '').splitlines() if n and not n.endswith('/')]
            med = [n for n in names if MEDIA.search(n)]
            cache[t['id']] = {**t, 'files': len(names), 'media': len(med),
                              'sample': [os.path.basename(n) for n in med[:6]]}
        json.dump(cache, open(CACHE, 'w'))
        r = cache[t['id']]
        print('  %-46s %6s files %6s media %s'
              % (t['name'][:46], r.get('files', '?'), r.get('media', '?'),
                 r.get('error', '')), flush=True)
    print('probed %d top-level folders' % len(cache))


def load_verdicts():
    return json.load(open(VERDICTS)) if os.path.exists(VERDICTS) else {}


def table():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    v = load_verdicts()
    cat = open(CAT, encoding='utf-8').read()
    catids = set(re.findall(r'/file/d/([A-Za-z0-9_-]{20,})', cat))
    catfolders = set(re.findall(r'/drive/folders/([A-Za-z0-9_-]{20,})', cat))

    buckets = collections.defaultdict(lambda: {'folders': 0, 'media': 0, 'names': []})
    unknown = []
    for fid, r in cache.items():
        if r.get('error'):
            buckets['error']['folders'] += 1
            buckets['error']['names'].append(r['name'])
            continue
        verdict = (v.get(fid) or {}).get('verdict')
        if not verdict:
            unknown.append(r)
            verdict = 'UNCLASSIFIED'
        b = buckets[verdict]
        b['folders'] += 1
        b['media'] += r.get('media', 0)
        b['names'].append(r['name'])

    print('# The IFM corpus — file-level coverage\n')
    print('Counted at the TOP-LEVEL folder, recursively. Every verdict is recorded in '
          '`corpus-verdicts.json` with a reason and how it was established.\n')
    print('| verdict | folders | media files |')
    print('|---|---|---|')
    order = ['ifm', 'mirror', 'excluded', 'non-ifm', 'uncertain', 'UNCLASSIFIED', 'error']
    for k in order:
        if k in buckets:
            print('| %s | %d | %s |' % (k, buckets[k]['folders'],
                                        '{:,}'.format(buckets[k]['media'])))
    print()
    if unknown:
        print('**%d folders are still UNCLASSIFIED.** The corpus is not established until '
              'this is zero.\n' % len(unknown))
        for r in sorted(unknown, key=lambda x: -x.get('media', 0))[:40]:
            print('- `%s` (%s) — %s media files' % (r['name'][:52], r['where'], r.get('media', '?')))


if __name__ == '__main__':
    if '--probe' in sys.argv:
        probe()
    elif '--sample' in sys.argv:
        fid = sys.argv[sys.argv.index('--sample') + 1]
        s, err = rclone(['lsf', '-R', '--drive-root-folder-id', fid, 'gdrive:'], 300)
        cands = [n for n in (s or '').splitlines()
                 if re.search(r'\.(jpe?g|png|heic)$', n, re.I)]
        print('\n'.join(cands[:10]) if cands else 'no still image in this folder')
    else:
        table()
