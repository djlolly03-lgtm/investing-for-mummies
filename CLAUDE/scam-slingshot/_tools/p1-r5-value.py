#!/usr/bin/env python3
"""
p1-r5-value.py — the value-contrast measurement for P1's release burst.

Reads the A (with burst) / B (burst deleted, same world, same camera punch) pairs written by
scenarios/p1-r5-value.mjs and answers the r4 critic's two questions with numbers:

  1. dL* between the burst and the background it is actually drawn over, per pixel — reported
     for the whole corridor and for the fork region separately, exactly the two numbers the
     verdict quoted (22.3 / 30.3, target >= 45 for the burst's DOMINANT element).
  2. Does the launch event survive the rubric's 40px test? Both frames are downscaled to 40px
     tall and diffed again; if the burst contributes nothing there it has failed.

"Dominant element" is defined as the value bin that owns the most burst PIXELS, not the most
extreme pixel — a single dark speck is not a read. Reported as `dom_dL`.

Usage: python3 p1-r5-value.py <shots-dir>
"""
import json
import sys
import os
import numpy as np
from PIL import Image

D = sys.argv[1]
geom = json.load(open(os.path.join(D, 'geom.json')))


def lstar(img):
    """CIE L* from an sRGB uint8 array."""
    a = np.asarray(img.convert('RGB'), dtype=np.float64) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    return np.where(y > 0.008856, 116.0 * np.cbrt(y) - 16.0, 903.3 * y)


ax, ay = geom['anchorPx']
dx, dy = geom['dir']
ad = geom['adPx']
H = None

print(f"AD = {ad:.1f} px   anchor = ({ax:.0f},{ay:.0f})   dir = ({dx:.3f},{dy:.3f})   "
      f"muzzle = {geom['muzzleAD']} AD")
print()
hdr = ("  t   burstpx   meanΔL  p90ΔL  maxΔL   dom_L*  dom_bg  dom_ΔL  dompx   "
       "fork_meanΔL fork_domΔL  darkpx  |  40px Δ")
print(hdr)
print('-' * len(hdr))

for t in geom['ts']:
    fa = os.path.join(D, f'A-t{t}.png')
    fb = os.path.join(D, f'B-t{t}.png')
    if not (os.path.exists(fa) and os.path.exists(fb)):
        continue
    ia, ib = Image.open(fa), Image.open(fb)
    La, Lb = lstar(ia), lstar(ib)
    h, w = La.shape
    if H is None:
        H = h
        ys, xs = np.mgrid[0:h, 0:w]
        # corridor coordinates, in AD, about the shot axis
        u = ((xs - ax) * dx + (ys - ay) * dy) / ad          # along
        v = ((xs - ax) * -dy + (ys - ay) * dx) / ad         # across
        corridor = (u > -2.0) & (u < geom['muzzleAD'] + 1.5) & (np.abs(v) < 3.0)
        fork = (u > -2.0) & (u < 2.5) & (np.abs(v) < 2.5)

    d = np.abs(La - Lb)
    burst = corridor & (d > 3.0)
    n = int(burst.sum())
    if n == 0:
        print(f"{t:4d}   {0:7d}   —")
        continue

    # dominant element: the 5-L*-wide bin of the BURST's own value that owns the most pixels
    vals = La[burst]
    bg = Lb[burst]
    dd = d[burst]
    bins = np.arange(0, 105, 5)
    idx = np.clip(np.digitize(vals, bins) - 1, 0, len(bins) - 2)
    counts = np.bincount(idx, minlength=len(bins) - 1)
    k = int(counts.argmax())
    sel = idx == k
    dom_L, dom_bg, dom_d, dom_n = vals[sel].mean(), bg[sel].mean(), dd[sel].mean(), int(sel.sum())

    fb_m = fork & (d > 3.0)
    if fb_m.sum():
        fvals, fdd = La[fb_m], d[fb_m]
        fidx = np.clip(np.digitize(fvals, bins) - 1, 0, len(bins) - 2)
        fc = np.bincount(fidx, minlength=len(bins) - 1)
        fk = int(fc.argmax())
        fdom = fdd[fidx == fk].mean()
        fmean = fdd.mean()
    else:
        fdom = fmean = 0.0

    # how much of the burst is genuinely DARK against its own background
    darkpx = int(((La < Lb - 25) & burst).sum())

    # --- the 40px test -------------------------------------------------------
    small = max(1, int(round(40 * w / h)))
    sa = np.asarray(ia.convert('RGB').resize((small, 40), Image.LANCZOS), dtype=np.float64)
    sb = np.asarray(ib.convert('RGB').resize((small, 40), Image.LANCZOS), dtype=np.float64)
    sla = lstar(Image.fromarray(sa.astype(np.uint8)))
    slb = lstar(Image.fromarray(sb.astype(np.uint8)))
    sd = np.abs(sla - slb)
    n40 = int((sd > 4).sum())
    max40 = float(sd.max())

    print(f"{t:4d}   {n:7d}   {dd.mean():6.1f} {np.percentile(dd,90):6.1f} {dd.max():6.1f}   "
          f"{dom_L:6.1f} {dom_bg:7.1f} {dom_d:7.1f} {dom_n:6d}   "
          f"{fmean:10.1f} {fdom:10.1f} {darkpx:7d}  |  {n40:3d}px max{max40:5.1f}")

print()
print("targets:  dom_ΔL >= 45   ·   40px Δ must be non-trivial (the reference's streak "
      "survives at ~40px)")
