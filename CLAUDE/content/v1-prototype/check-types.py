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
    Anything else is reported as UNVERIFIED rather than guessed. A folder row and a Slides
    deck are legitimately not one file and are skipped, not counted as failures.

    Build the Drive index (one per registered root) before running, or rows resolvable only
    that way stay UNVERIFIED:
      rclone lsjson -R --files-only --drive-root-folder-id <ROOT> gdrive: > /tmp/ls_<ROOT>.json
"""
import json, os, re, sys, glob, collections

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


def real_type(r, by):
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
        # a folder or a deck is not one file — not a mislabel, just unanswerable here
        if '/drive/folders/' in u or 'docs.google.com' in u:
            continue
        k = kind_of(os.path.splitext(u)[1])
        if k:
            return k
    return None


def main():
    by = drive_index()
    src = open(os.path.join(HERE, 'v1-catalogue.js'), encoding='utf-8').read()
    rows = json.loads(src[src.index('['):src.rindex(']') + 1])
    mm = open(os.path.join(HERE, 'media-map.js'), encoding='utf-8').read()
    media = json.loads(mm[mm.index('{'):mm.rindex('}') + 1])
    lib = [r for r in rows
           if r.get('library') is not False and (r.get('status') or '') != 'Do Not Use'
           and (r.get('thumb') or (media.get(r['id']) or {}).get('playable'))]

    bad, unverified = [], []
    for r in lib:
        # A Carousel is a SET of images, not one file. Asking "is this file an image" of a
        # carousel always says yes and would report every one of them as mislabelled.
        if r.get('type') == 'Carousel':
            continue
        rt = real_type(r, by)
        if rt is None:
            unverified.append(r['id'])
        elif rt != r.get('type'):
            bad.append((r['id'], r.get('type'), rt, (r.get('title') or '')[:52]))

    print('library %d | verified %d | unverified %d | MISLABELLED %d'
          % (len(lib), len(lib) - len(unverified), len(unverified), len(bad)))
    for x in bad:
        print('  %s  declared %-6s actually %-6s  %s' % x)
    if unverified:
        print('  (unverified = folder rows, Slides decks, or a Drive id missing from the'
              ' cached index; build the index to shrink this)')
    if '--strict' in sys.argv and bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
