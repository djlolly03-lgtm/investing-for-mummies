#!/usr/bin/env /usr/bin/python3
"""Bring any thumbnail over 25KB or preview clip over 400KB back inside budget.

    /usr/bin/python3 tighten-media.py            # report what is over, change nothing
    /usr/bin/python3 tighten-media.py --fix      # re-encode the offenders in place

WHY A SEPARATE PASS
    media-for-rows.py re-encodes as it goes, but it gives up rather than looping forever, so
    a frame with a lot of fine detail can land a couple of KB over. That is the right
    behaviour there -- a stuck encode in the middle of a 5 GB download pass is worse than a
    27KB thumbnail -- but the budget in CLAUDE.md is what keeps deploys from bloating until
    they break, so the overage gets cleaned up rather than waved through.

    A thumbnail is dropped in WIDTH before quality once quality alone stops helping: below
    about q16 a JPEG starts to look worse without getting much smaller, whereas 400px -> 320px
    is barely visible in a grid tile and takes a third off the size.

    This only ever touches files it can prove are over budget, and it keeps the original
    until the replacement is both smaller AND non-empty -- a "shrink" that produces a broken
    file makes the row invisible, which is worse than two spare KB.
"""
import os, subprocess, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
THUMBS = os.path.join(HERE, '..', 'thumbs')
CLIPS = os.path.join(HERE, '..', 'clips')
TCAP, CCAP = 25 * 1024, 400 * 1024


def sh(a, t=900):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=t)
    except subprocess.TimeoutExpired:
        return None


def swap_if_better(orig, cand, cap):
    """Replace orig with cand only if cand is non-empty and genuinely smaller."""
    if not os.path.exists(cand) or not os.path.getsize(cand):
        return False
    if os.path.getsize(cand) >= os.path.getsize(orig):
        os.remove(cand)
        return False
    os.replace(cand, orig)
    return os.path.getsize(orig) <= cap


def fix_thumb(p):
    for q, w in ((18, 400), (14, 320), (18, 320), (16, 280), (20, 240)):
        t = '/tmp/_tt.jpg'
        sh(['ffmpeg', '-nostdin', '-y', '-i', p, '-vf', "scale='min(%d,iw)':-2" % w,
            '-q:v', str(q), t], 180)
        if swap_if_better(p, t, TCAP):
            return True
        if os.path.getsize(p) <= TCAP:
            return True
    return os.path.getsize(p) <= TCAP


def fix_clip(p):
    for crf, w, secs in ((34, 400, 12), (36, 360, 12), (38, 320, 10), (40, 288, 8)):
        t = '/tmp/_tc.mp4'
        sh(['ffmpeg', '-nostdin', '-y', '-t', str(secs), '-i', p,
            '-vf', "scale='min(%d,iw)':-2" % w, '-c:v', 'libx264', '-crf', str(crf),
            '-preset', 'veryfast', '-an', '-movflags', '+faststart', t], 600)
        if swap_if_better(p, t, CCAP):
            return True
        if os.path.getsize(p) <= CCAP:
            return True
    return os.path.getsize(p) <= CCAP


def main():
    fix = '--fix' in sys.argv
    only = [a for a in sys.argv[1:] if a.startswith('IFM-')]
    work = []
    for p in sorted(glob.glob(os.path.join(THUMBS, '*.jpg'))):
        if os.path.getsize(p) > TCAP:
            work.append(('thumb', p, TCAP))
    for p in sorted(glob.glob(os.path.join(CLIPS, '*.mp4'))):
        if os.path.getsize(p) > CCAP:
            work.append(('clip', p, CCAP))
    if only:
        work = [w for w in work if any(o in os.path.basename(w[1]) for o in only)]
    if not work:
        print('everything is inside budget')
        return 0
    print('%d file(s) over budget:' % len(work))
    for kind, p, cap in work:
        print('  %-5s %-16s %6.1fKB  (cap %dKB)'
              % (kind, os.path.basename(p), os.path.getsize(p) / 1024, cap / 1024))
    if not fix:
        print('\npass --fix to re-encode. nothing changed.')
        return 0
    print()
    bad = 0
    for kind, p, cap in work:
        before = os.path.getsize(p)
        ok = fix_thumb(p) if kind == 'thumb' else fix_clip(p)
        after = os.path.getsize(p)
        print('  %-5s %-16s %6.1fKB -> %6.1fKB  %s'
              % (kind, os.path.basename(p), before / 1024, after / 1024,
                 'ok' if ok else 'STILL OVER'))
        bad += 0 if ok else 1
    print('\n%d of %d still over budget' % (bad, len(work)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
