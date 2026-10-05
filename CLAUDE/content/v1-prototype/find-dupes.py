#!/usr/bin/env /usr/bin/python3
"""Find rows that are the same picture, by comparing thumbnails rather than text.

    /usr/bin/python3 find-dupes.py              # report clusters
    /usr/bin/python3 find-dupes.py --json       # also write /tmp/dupes.json

WHY
    A search for "certificate" returns "Flagship batch group photo with certificates" and
    "Graduation group with certificates — office boardroom" as two results. They are one
    photograph. Same for "Flagship graduate with her certificate" and "Graduate holding her
    Certificate of Completion". The titles differ, the descriptions differ, so nothing that
    compares TEXT can see it — the only thing these rows have in common is the pixels.

HOW
    dHash (64-bit difference hash) of every thumbnail, then cluster by Hamming distance.
    The thumbnail is the right thing to hash: it is derived from the asset itself, it exists
    for every visible row (the visibility rule guarantees it), and it survives the difference
    between a JPEG and a frame grabbed from a video.

    <=4 bits apart is the same image. 5-10 is "near", which on this library mostly means
    burst frames a second apart — a real distinction, because a burst is two usable alternates
    while a duplicate is one asset catalogued twice. They are reported separately and never
    merged automatically.

WHAT IT DOES NOT DO
    It does not delete, hide or merge anything. It prints what it found. Deciding which row
    of a pair survives needs a human, because the two rows usually carry DIFFERENT metadata
    and the better description is not always on the row you would keep.
"""
import json, os, sys, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
THUMBS = os.path.join(HERE, '..', 'thumbs')
CAT = os.path.join(HERE, 'v1-catalogue.js')
SAME, NEAR = 4, 10


def dhash(path):
    from PIL import Image
    try:
        im = Image.open(path).convert('L').resize((9, 8), Image.LANCZOS)
    except Exception:
        return None
    px = list(im.getdata())
    b = 0
    for y in range(8):
        for x in range(8):
            b = (b << 1) | (1 if px[y * 9 + x] > px[y * 9 + x + 1] else 0)
    return b


def rows():
    s = open(CAT, encoding='utf-8').read()
    a = s.index('window.IFM_V1 =') + len('window.IFM_V1 =')
    return {r['id']: r for r in json.loads(s[a:s.rindex(';')])}


def main():
    R = rows()
    H = {}
    for rid in R:
        p = os.path.join(THUMBS, '%s.jpg' % rid)
        if os.path.exists(p):
            h = dhash(p)
            if h is not None:
                H[rid] = h
    print('hashed %d thumbnails of %d rows\n' % (len(H), len(R)))

    ids = sorted(H)
    parent = {i: i for i in ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x

    pairs_near = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            d = bin(H[ids[i]] ^ H[ids[j]]).count('1')
            if d <= SAME:
                a, b = find(ids[i]), find(ids[j])
                if a != b:
                    parent[b] = a
            elif d <= NEAR:
                pairs_near.append((d, ids[i], ids[j]))

    clusters = collections.defaultdict(list)
    for i in ids:
        clusters[find(i)].append(i)
    dupes = {k: v for k, v in clusters.items() if len(v) > 1}

    tot = sum(len(v) - 1 for v in dupes.values())
    print('=== SAME IMAGE (<=%d bits apart): %d clusters, %d redundant rows ===\n'
          % (SAME, len(dupes), tot))
    out = []
    for k, v in sorted(dupes.items(), key=lambda x: -len(x[1])):
        v = sorted(v)
        print('  %d rows:' % len(v))
        for rid in v:
            r = R[rid]
            print('     %-9s %-9s %-13s %s' % (rid, r.get('type', ''),
                                               (r.get('session') or '')[:13],
                                               str(r.get('title', ''))[:58]))
        link = {rid: (R[rid].get('drive') or '') for rid in v}
        same_file = len(set(l for l in link.values() if l)) == 1
        print('     -> %s\n' % ('SAME Drive file — one asset catalogued twice'
                                if same_file else
                                'different Drive links — check before merging'))
        out.append({'rows': v, 'same_drive_file': same_file})

    print('=== NEAR (%d-%d bits): likely burst frames, NOT duplicates — %d pairs ==='
          % (SAME + 1, NEAR, len(pairs_near)))
    for d, a, b in sorted(pairs_near)[:12]:
        print('  d=%-3d %s | %s' % (d, str(R[a].get('title', ''))[:42],
                                    str(R[b].get('title', ''))[:42]))
    if len(pairs_near) > 12:
        print('  … and %d more' % (len(pairs_near) - 12))

    if '--json' in sys.argv:
        json.dump(out, open('/tmp/dupes.json', 'w'), indent=1)
        print('\nwrote /tmp/dupes.json')


if __name__ == '__main__':
    main()
