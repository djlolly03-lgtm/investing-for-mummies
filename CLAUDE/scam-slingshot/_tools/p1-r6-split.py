#!/usr/bin/env python3
"""p1-r6-split.py <dir> [box=520] — per-layer pixel contribution in the tracking pouch box."""
import json, os, sys
import numpy as np
from PIL import Image
D = sys.argv[1]; BOX = float(sys.argv[2]) if len(sys.argv) > 2 else 520.0
g = json.load(open(os.path.join(D, 'geom.json')))
A0 = np.asarray(Image.open(os.path.join(D, f"A-t{g['ts'][0]}.png")).convert('RGB'), dtype=np.int16)
H, W = A0.shape[:2]; S = W / g['cssW']
ys, xs = np.mgrid[0:H, 0:W]
print(f"angle {g['angle']} power {g['power']}  AD {g['ad']:.3f}u  muzzle {g['muzzleAD']} AD  box {BOX:.0f}px")
print("   t     band     trail       fan      core    VFXtot   vfx:band")
for t in g['ts']:
    e = g['perT'][str(t)]; cx, cy = e['anchorPx'][0]*S, e['anchorPx'][1]*S
    inbox = (np.abs(xs-cx) <= BOX/2) & (np.abs(ys-cy) <= BOX/2)
    A = np.asarray(Image.open(os.path.join(D, f'A-t{t}.png')).convert('RGB'), dtype=np.int16)
    def d(name):
        B = np.asarray(Image.open(os.path.join(D, f'{name}-t{t}.png')).convert('RGB'), dtype=np.int16)
        return int((((np.abs(A-B).max(axis=2) > 8)) & inbox).sum())
    band, tr, fan, core = d('NOBAND'), d('NOTRAIL'), d('NOFAN'), d('NOCORE')
    tot = tr + fan + core
    r = tot/band if band else float('inf')
    print(f"{t:4d} {band:8d} {tr:9d} {fan:9d} {core:9d} {tot:9d}   {r:8.2f}")
