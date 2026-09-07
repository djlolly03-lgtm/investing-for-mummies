#!/usr/bin/env python3
"""
p1-r6-bandvfx.py — scores the r5 critic's gap metric from the PNGs p1-r6-bandvfx.mjs writes.

For each timestamp it counts, inside a square box centred on the sling anchor:
  bandpx = pixels where hiding the two straps changed the SHIPPED frame
  vfxpx  = pixels where hiding every fx-* pool changed the SHIPPED frame
and reports vfx:band. The critic measured 30:1 at t=0 and 103:1 at t=100. Target: BAND WINS
(ratio < 1) through the first 150 ms.

Also reports where the VFX actually lives — its 90th-percentile reach along the shot axis in
AD — because "confined to roughly 2 AD of the pouch" is the shape half of the ask, and a fan
that hits the pixel ratio by going FAINT rather than by going SMALL has not done the job.

Usage: python3 p1-r6-bandvfx.py <shots-dir> [box-css-px ...]
"""
import json, os, sys
import numpy as np
from PIL import Image

D = sys.argv[1]
BOXES = [float(x) for x in sys.argv[2:]] or [520.0]
g = json.load(open(os.path.join(D, 'geom.json')))
ax_css, ay_css = g['anchorPx']
adPx_css = g['adPx']

def arr(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)

first = arr(os.path.join(D, f"A-t{g['ts'][0]}.png"))
H, W = first.shape[:2]
S = W / g['cssW']                      # device px per css px (deviceScaleFactor)
ax, ay, adPx = ax_css * S, ay_css * S, adPx_css * S
ys, xs = np.mgrid[0:H, 0:W]
print(f"frame {W}x{H}  scale {S:g}x css   anchor=({ax:.0f},{ay:.0f}) devpx   "
      f"AD={adPx:.1f} devpx   muzzle={g['muzzleAD']} AD")
print()

perT = g.get('perT', {})

def centre(t):
    """Box centre + AD for this timestamp. The camera pans during flight, so a box pinned to
    the release-time pixel walks off the sling and starts reporting the band as invisible."""
    e = perT.get(str(t)) or perT.get(t)
    if not e:
        return ax, ay, adPx
    return e['anchorPx'][0]*S, e['anchorPx'][1]*S, e['adPx']*S

for box in BOXES:
    half = box / 2.0
    inbox = (np.abs(xs - ax) <= half) & (np.abs(ys - ay) <= half)
    print(f"--- box {box:.0f} px  (side = {box/adPx:.2f} AD)  {int(inbox.sum())} px ---")
    print("   t    bandpx     vfxpx    vfx:band    verdict     vfx p90 reach (AD from anchor)")
    for t in g['ts']:
        cx, cy, cad = centre(t)
        inbox = (np.abs(xs - cx) <= half) & (np.abs(ys - cy) <= half)
        A = arr(os.path.join(D, f'A-t{t}.png'))
        nf = arr(os.path.join(D, f'NOFX-t{t}.png'))
        nb = arr(os.path.join(D, f'NOBAND-t{t}.png'))
        dv = (np.abs(A - nf).max(axis=2) > 8)
        db = (np.abs(A - nb).max(axis=2) > 8)
        bp, vp = int((db & inbox).sum()), int((dv & inbox).sum())
        ratio = (vp / bp) if bp else float('inf')
        ok = 'BAND WINS' if ratio < 1 else f'vfx {ratio:5.1f}:1'
        # where the VFX lives, measured over the WHOLE frame, in AD from the anchor
        yy, xx = np.nonzero(dv)
        reach = (np.percentile(np.hypot(xx - cx, yy - cy), 90) / cad) if len(xx) else 0.0
        print(f"{t:4d}  {bp:8d}  {vp:8d}   {ratio:8.2f}   {ok:>12s}      {reach:6.2f}")
    print()
