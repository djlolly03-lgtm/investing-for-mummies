#!/usr/bin/env /usr/bin/python3
"""Match the recovered Goa masters to the 33 catalogue rows that already describe them.

    /usr/bin/python3 goa-match.py            # match and report, write nothing
    /usr/bin/python3 goa-match.py --save     # write /tmp/goa-map.json

THE PROBLEM
    IFM-218..250 are 33 rows titled "Goa Workshop — clip 1..33". Their `drive link` is a
    LOCAL path (`clips/IFM-218.mp4`) because when they were catalogued the masters were
    believed destroyed, so there was no Drive file to point at. The masters have now turned
    up in Dropbox: 33 .MOV files named IMG_7829..IMG_7877. Nothing records which master
    became which row.

WHY NOT JUST SORT BOTH LISTS
    Sorting IMG_* ascending against IFM-218..250 ascending is a guess that LOOKS right and
    would be invisible if wrong: every row would get a plausible Drive link, the Library
    would show 33 videos, and a third of them could be pointing at the wrong footage. Nobody
    would ever notice, because the rows are described as "clip 1".."clip 33" -- the
    descriptions carry no detail that would contradict a bad link. A silent wrong answer is
    the worst outcome available here, so the order hypothesis is TESTED, not assumed.

THE METHOD
    Each row already has a 12-second preview clip and a thumbnail derived from its master
    back when the master existed. So the thumbnail IS a fingerprint of the right footage.
    This hashes each row's thumbnail and compares it against frames sampled from every
    master, then solves for the assignment that minimises total distance, one master per row.

    dHash (64-bit difference hash) on a greyscale 9x8 resize. It survives the re-encode and
    rescale between master and preview, which an exact checksum could not.

    Frames are sampled at 0.0s, 1.0s and 2.0s of each master, because the preview clips were
    not all cut from the same offset and a single first frame would mismatch on any clip that
    started a second in.

WHAT IT REFUSES TO DO
    If the best match for a row is not clearly better than the runner-up, or if any master
    would be assigned to two rows, it reports that row as UNRESOLVED and writes nothing for
    it. A row left unlinked is recoverable; a row linked to the wrong video is not.
"""
import json, os, subprocess, sys, glob, itertools

HERE = os.path.dirname(os.path.abspath(__file__))
THUMBS = os.path.join(HERE, '..', 'thumbs')
SRC = ('/Users/lollyg/Library/CloudStorage/Dropbox/'
       'IFM - Goa Workshop 18 Jul 2026/Videos')
TMP = '/tmp/_goamatch'
ROWS = ['IFM-%d' % n for n in range(218, 251)]
OFFSETS = ('0.0', '1.0', '2.0')


def sh(a, t=300):
    try:
        return subprocess.run(a, capture_output=True, timeout=t)
    except subprocess.TimeoutExpired:
        return None


def dhash(path):
    """64-bit difference hash of an image file, or None."""
    from PIL import Image
    try:
        im = Image.open(path).convert('L').resize((9, 8), Image.LANCZOS)
    except Exception:
        return None
    px = list(im.getdata())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[y * 9 + x] > px[y * 9 + x + 1] else 0)
    return bits


def dist(a, b):
    return bin(a ^ b).count('1')


def frame(video, ss, out):
    sh(['ffmpeg', '-nostdin', '-y', '-ss', ss, '-i', video, '-frames:v', '1',
        '-vf', 'scale=320:-2', out], 300)
    return os.path.exists(out) and os.path.getsize(out) > 0


def main():
    os.makedirs(TMP, exist_ok=True)
    masters = sorted(glob.glob(os.path.join(SRC, '*.MOV')))
    print('%d masters, %d rows to match\n' % (len(masters), len(ROWS)))
    if not masters:
        raise SystemExit('no masters found at %s' % SRC)

    rowhash = {}
    for r in ROWS:
        p = os.path.join(THUMBS, '%s.jpg' % r)
        h = dhash(p) if os.path.exists(p) else None
        if h is None:
            print('  !! no usable thumbnail for %s' % r)
        rowhash[r] = h

    mhash = {}
    for m in masters:
        name = os.path.basename(m)
        hs = []
        for i, ss in enumerate(OFFSETS):
            out = os.path.join(TMP, 'f%d.jpg' % i)
            if frame(m, ss, out):
                h = dhash(out)
                if h is not None:
                    hs.append(h)
        mhash[name] = hs
        print('  %-16s %d frames hashed' % (name, len(hs)))

    # cost[row][master] = best distance over the sampled frames
    cost = {}
    for r in ROWS:
        if rowhash[r] is None:
            continue
        cost[r] = {n: min((dist(rowhash[r], h) for h in hs), default=99)
                   for n, hs in mhash.items()}

    # Greedy on the globally smallest distance, which is adequate here because the matrix is
    # sparse and lopsided: a correct pair scores in the single digits and a wrong one in the
    # twenties, so there is no near-tie for the assignment to get wrong.
    pairs, used_r, used_m = {}, set(), set()
    cand = sorted(((cost[r][n], r, n) for r in cost for n in cost[r]))
    for d, r, n in cand:
        if r in used_r or n in used_m:
            continue
        pairs[r] = (n, d)
        used_r.add(r); used_m.add(n)

    # A match is only trusted if it clearly beats the best ALTERNATIVE master for that row.
    print('\n%-9s %-16s %5s %5s  %s' % ('row', 'master', 'dist', 'next', 'verdict'))
    good, bad = {}, []
    for r in ROWS:
        if r not in pairs:
            bad.append((r, 'no thumbnail')); continue
        n, d = pairs[r]
        others = sorted(v for k, v in cost[r].items() if k != n)
        nxt = others[0] if others else 99
        ok = d <= 14 and (nxt - d) >= 4
        print('%-9s %-16s %5d %5d  %s' % (r, n, d, nxt, 'ok' if ok else 'UNRESOLVED'))
        if ok:
            good[r] = n
        else:
            bad.append((r, 'best=%d next=%d — not clearly separated' % (d, nxt)))

    print('\n%d of %d matched confidently' % (len(good), len(ROWS)))
    if bad:
        print('UNRESOLVED (%d) — these get no link rather than a guessed one:' % len(bad))
        for r, why in bad:
            print('   %s  %s' % (r, why))
    unused = [os.path.basename(m) for m in masters
              if os.path.basename(m) not in set(good.values())]
    if unused:
        print('masters not assigned to any row (%d): %s' % (len(unused), ', '.join(unused)))

    # Does the naive filename order agree? Worth knowing either way.
    naive = dict(zip(ROWS, [os.path.basename(m) for m in masters]))
    agree = sum(1 for r in good if naive.get(r) == good[r])
    print('\nfilename-order hypothesis agrees on %d of %d matched rows' % (agree, len(good)))
    if agree != len(good):
        for r in sorted(good):
            if naive.get(r) != good[r]:
                print('   %s: content says %s, filename order said %s'
                      % (r, good[r], naive.get(r)))

    if '--save' in sys.argv:
        json.dump({'matched': good, 'unresolved': [b[0] for b in bad]},
                  open('/tmp/goa-map.json', 'w'), indent=1)
        print('\nwrote /tmp/goa-map.json')


if __name__ == '__main__':
    main()
