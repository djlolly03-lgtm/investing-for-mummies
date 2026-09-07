#!/usr/bin/env python3
"""
p3-r8-compose.py — score the layer-differenced frames from p3-r8-attrib.mjs.

For each (level, timestamp) triple written by that scenario:

  MASS  = pixels where |all - nomass| > EPS      the exact pixel set the dark mass drew
  CORE  = pixels where |all - nocore| > EPS      the exact pixel set the hot core drew

and reports

  massA / coreA        pixel areas
  core:mass            area ratio (a width ratio of 0.36 on a 6-point star is ~0.05-0.09 by area)
  CONTAIN              share of CORE pixels lying inside the MASS silhouette (filled convex-ish
                       hull is not needed: the mass is solid, so its own pixel set is the test)
  massV / coreV        mean value (0-255) of each layer as DRAWN in the composite
  coreS                mean saturation of the core's own drawn pixels

The pair that matters is CONTAIN and massV: a saturated flare INSIDE a compact opaque mass is
high CONTAIN over a low massV. A star painted on the sky is high coreV over CONTAIN ~= 0.

Usage: python3 p3-r8-compose.py <shots-dir>
"""
import sys, os, re, colorsys
from PIL import Image
import numpy as np

EPS = 10  # per-channel difference that counts as "this layer drew here"


def load(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)


def mask(a, b):
    return (np.abs(a - b).max(axis=2) > EPS)


def stats(img, m):
    if m.sum() == 0:
        return 0.0, 0.0
    px = img[m].astype(np.float32)
    v = px.max(axis=1)
    mn = px.min(axis=1)
    s = np.where(v > 0, (v - mn) / np.maximum(v, 1), 0)
    return float(v.mean()), float(s.mean())


def main(d):
    files = os.listdir(d)
    keys = sorted({re.match(r'\d+-(.+)-all\.png$', f).group(1)
                   for f in files if re.match(r'\d+-(.+)-all\.png$', f)})
    def find(tag, suffix):
        for f in files:
            if f.endswith(f'-{tag}-{suffix}.png'):
                return os.path.join(d, f)
        return None

    cur = None
    print(f'{"frame":<22}{"massA":>8}{"coreA":>8}{"core:mass":>11}{"CONTAIN":>9}'
          f'{"massV":>7}{"coreV":>7}{"coreS":>7}')
    for k in keys:
        lvl = k.rsplit('-t', 1)[0]
        if lvl != cur:
            print(f'--- {lvl} ' + '-' * 60)
            cur = lvl
        fa, fc, fm = find(k, 'all'), find(k, 'nocore'), find(k, 'nomass')
        if not (fa and fc and fm):
            continue
        A, C, M = load(fa), load(fc), load(fm)
        mCore = mask(A, C)
        mMass = mask(A, M)
        massA, coreA = int(mMass.sum()), int(mCore.sum())
        contain = float((mCore & mMass).sum()) / coreA if coreA else 0.0
        # the mass's own value is read from the frame WITHOUT the core, so the additive star
        # cannot inflate it
        massV, _ = stats(C, mMass)
        coreV, coreS = stats(A, mCore)
        ratio = coreA / massA if massA else float('nan')
        print(f'{k:<22}{massA:>8}{coreA:>8}{ratio:>11.3f}{contain:>9.3f}'
              f'{massV:>7.0f}{coreV:>7.0f}{coreS:>7.2f}')


if __name__ == '__main__':
    main(sys.argv[1])
