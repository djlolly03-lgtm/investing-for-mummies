#!/usr/bin/env /usr/bin/python3
"""Does every row's `type` match what the file behind it ACTUALLY is?

    /usr/bin/python3 check-types.py            # report
    /usr/bin/python3 check-types.py --strict   # exit 1 if any row is mislabelled

WHY THIS EXISTS
    A row typed Video draws a play button. If the file behind it is a PNG, that button does
    nothing, or the card says "No preview" forever and the asset looks broken rather than
    miscatalogued. Four rows were doing exactly this on 18 Sep 2026 -- IFM-204, IFM-343,
    IFM-321 and IFM-375, all Aakara REEL COVERS whose finished reel does not exist in the
    tree. The user's instruction: "if anything is a pic, then tag it as a pic. be 100%
    accurate here, this will frustrate the users while using the system."

    Nobody spots this by looking at the catalogue, because the title and description are
    about a reel and read perfectly. It is only visible by asking the file.

HOW IT DECIDES
    Authoritative, cheapest first:
      1. a local path under CLAUDE/content  -> the extension on disk
      2. a Drive file id present in a cached rclone index -> the extension of its real path
      3. an http(s) url with a media extension -> that extension
      4. a Drive FOLDER id -> what is actually inside it (needs --walk; cached)
    Anything else is reported as UNVERIFIED rather than guessed. A Slides deck is legitimately
    not one file and is skipped, not counted as a failure.

    FOLDER ROWS USED TO BE SKIPPED, AND THAT EXEMPTION LET 20 MISLABELS THROUGH on 20 Sep
    2026 -- rows typed Video whose folder holds nothing but PNG artboards ("Story S1" = 5
    PNGs, "Story S5" = 6 PNGs, "Inflation" = 1 PNG). They drew a play button over a still.
    "Not one file" is not the same as "unanswerable": a folder of 6 PNGs and no video is an
    image set, and saying so is the whole point of this check. Run with --walk to resolve
    them (one rclone listing per folder, cached in /tmp/folder-contents.json).

    Build the Drive index (one per registered root) before running, or rows resolvable only
    that way stay UNVERIFIED:
      rclone lsjson -R --files-only --drive-root-folder-id <ROOT> gdrive: > /tmp/ls_<ROOT>.json
"""
import json, os, re, sys, glob, collections, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = {'.png', '.jpg', '.jpeg', '.heic', '.heif', '.gif', '.webp', '.tif', '.tiff', '.bmp'}
VID = {'.mp4', '.mov', '.m4v', '.avi', '.webm', '.mkv'}


def drive_index():
    by = {}
    for f in glob.glob('/tmp/ls_*.json'):
        try:
            items = json.load(open(f))
        except Exception:
            continue
        for it in items:
            if it.get('ID'):
                by[it['ID']] = it.get('Path', '')
    return by


def kind_of(ext):
    ext = ext.lower()
    return 'Image' if ext in IMG else 'Video' if ext in VID else None


# NOT /tmp/ls_*.json — that glob is the file-index loader's, and this cache is a different shape.
FOLDER_CACHE = '/tmp/folder-contents.json'


def folder_contents(fid, walk):
    """The file extensions inside a Drive folder. Cached; only listed with --walk."""
    cache = {}
    if os.path.exists(FOLDER_CACHE):
        try:
            cache = json.load(open(FOLDER_CACHE))
        except Exception:
            cache = {}
    if fid in cache:
        return cache[fid]
    if not walk:
        return None
    try:
        out = subprocess.run(['rclone', 'lsf', '-R', '--drive-root-folder-id', fid, 'gdrive:'],
                             capture_output=True, text=True, timeout=300)
        names = [n for n in out.stdout.splitlines() if not n.endswith('/')]
    except Exception:
        return None
    cache[fid] = names
    json.dump(cache, open(FOLDER_CACHE, 'w'))
    return names


def folder_type(fid, walk):
    """What a FOLDER row really is. A folder of stills is an image set, whatever the row says."""
    names = folder_contents(fid, walk)
    if names is None:
        return None
    kinds = collections.Counter(k for k in (kind_of(os.path.splitext(n)[1]) for n in names) if k)
    if not kinds:
        return None
    # Only a folder that is ALL one kind answers the question. A mixed folder does not:
    # IFM-319 is a row of DSLR portraits in a folder that also holds four clips, and calling
    # it a Video because of them would be a worse error than the one this check exists to
    # catch. Mixed folders come back UNVERIFIED and are reported as an over-broad link
    # instead, which is what is actually wrong with them.
    if len(kinds) > 1:
        return None
    return next(iter(kinds))


def real_type(r, by, walk=False):
    """The type the FILE says it is, or None when it cannot be established."""
    for field in ('video', 'drive'):
        u = (r.get(field) or '').split('?')[0]
        if not u:
            continue
        m = re.search(r'/file/d/([A-Za-z0-9_-]{20,})', u)
        if m:
            path = by.get(m.group(1))
            if path:
                k = kind_of(os.path.splitext(path)[1])
                if k:
                    return k
            continue
        m = re.search(r'/drive/folders/([A-Za-z0-9_-]{20,})', u)
        if m:
            k = folder_type(m.group(1), walk)
            if k:
                return k
            continue
        # a Slides deck is not one file — not a mislabel, just unanswerable here
        if 'docs.google.com' in u:
            continue
        k = kind_of(os.path.splitext(u)[1])
        if k:
            return k
    return None


def main():
    walk = '--walk' in sys.argv
    by = drive_index()
    src = open(os.path.join(HERE, 'v1-catalogue.js'), encoding='utf-8').read()
    rows = json.loads(src[src.index('['):src.rindex(']') + 1])
    mm = open(os.path.join(HERE, 'media-map.js'), encoding='utf-8').read()
    media = json.loads(mm[mm.index('{'):mm.rindex('}') + 1])
    # Mirrors index.html's ASSETS filter: check what the user can actually see, nothing else.
    lib = [r for r in rows
           if r.get('library') is not False and (r.get('status') or '') != 'Do Not Use'
           and r.get('thumb')
           and (r.get('type') != 'Video' or (media.get(r['id']) or {}).get('playable'))]

    # A second defect this check can see for free. The moments rule says a row describing one
    # moment links to ITS OWN file; only a catch-all row may open a folder. Six Boardroom rows
    # ("participant asking a question") all opened the same 761-file shoot root, which is the
    # frustration the user described: you find the thing, and the link does not give it to you.
    WIDE = 40
    wide = []
    for r in lib:
        u = (r.get('video') or '') + ' ' + (r.get('drive') or '')
        m = re.search(r'/drive/folders/([A-Za-z0-9_-]{20,})', u)
        if not m:
            continue
        names = folder_contents(m.group(1), walk)
        if names and len(names) > WIDE and not re.search(
                r'rest of|catch-?all|dump|remaining|gallery|whole shoot', (r.get('title', '') +
                ' ' + r.get('description', '')), re.I):
            wide.append((r['id'], len(names), (r.get('title') or '')[:52]))

    bad, unverified = [], []
    for r in lib:
        if not r.get('type'):
            bad.append((r['id'], '(none)', real_type(r, by, walk) or '?',
                        (r.get('title') or '')[:52]))
            continue
        # A Carousel is a SET of images, not one file. Asking "is this file an image" of a
        # carousel always says yes and would report every one of them as mislabelled.
        if r.get('type') == 'Carousel':
            continue
        rt = real_type(r, by, walk)
        if rt is None:
            unverified.append(r['id'])
        elif rt != r.get('type'):
            bad.append((r['id'], r.get('type'), rt, (r.get('title') or '')[:52]))

    print('library %d | verified %d | unverified %d | MISLABELLED %d'
          % (len(lib), len(lib) - len(unverified), len(unverified), len(bad)))
    for x in bad:
        print('  %s  declared %-6s actually %-6s  %s' % x)
    if unverified:
        print('  (unverified = Slides decks, unwalked folders, or a Drive id missing from the'
              ' cached index; build the index to shrink this)')
    if wide:
        print('\n  OVER-BROAD LINKS %d — a single moment that opens a whole folder:' % len(wide))
        for i, n, t in wide:
            print('  %s  opens %4d files   %s' % (i, n, t))
    if '--strict' in sys.argv and (bad or wide):
        sys.exit(1)


if __name__ == '__main__':
    main()
