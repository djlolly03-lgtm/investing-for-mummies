#!/usr/bin/env python3
"""
p1-r7-lum.py — THE r6-critic GAP, made measurable.

  "of the burst's pixels drawn over sky in the release-instant corridor, 71.4% are DARKER
   than the sky they cover — median dLum -42, p10 -115, only 26% brighter by 20+.
   The reference burst is +63 median over its own background (Weber +0.60), 100% brighter."

Reads the PNG triplets p1-r6-bandvfx.mjs writes (A = shipped frame, NOFX = the SAME simulated
instant with every fx-* pool hidden). The set of pixels where those two differ is exactly the
launch burst as COMPOSITED, so:

    background = NOFX pixel   (what the burst is drawn over)
    burst      = A    pixel   (what the player sees there)
    dLum       = lum(A) - lum(NOFX)

Reported over all burst pixels and over the SKY subset (background classified as sky by the
level's own gradient — see sky_mask), plus Weber contrast against the local background.

READ THE SKY COLUMNS, NOT `burstpx`. The A/NOFX pair are two separate screenshots of the same
simulated instant, and the DOM tutorial pill at the bottom of the frame can differ between them
— that alone is ~43 k pixels of `burstpx` at t=0 and none of it is the burst. Every statistic
here is computed on the sky subset, which the pill (drawn over the ground) never enters. If you
add an ALL-pixels statistic, exclude the HUD band first or it will report the pill.

Usage: python3 p1-r7-lum.py <shots-dir> [t ...]
"""
import json, os, sys
import numpy as np
from PIL import Image

D = sys.argv[1]
g = json.load(open(os.path.join(D, 'geom.json')))
TS = [int(x) for x in sys.argv[2:]] or g['ts']


def arr(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)


def lum(a):
    # Rec.709 on the sRGB-encoded pixels the player actually sees.
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def sky_mask(bg):
    """
    Sky = the daylight gradient: bright, and blue >= red (the gradient runs cream->blue with
    B never below R). Grass, fork, band, hills and structure all fail one of the two.
    """
    b, r, gr = bg[..., 2], bg[..., 0], bg[..., 1]
    return (lum(bg) > 150) & (b >= r - 2) & (b >= gr - 6)


first = arr(os.path.join(D, f"A-t{g['ts'][0]}.png"))
H, W = first.shape[:2]
S = W / g['cssW']
perT = g.get('perT', {})


def centre(t):
    e = perT.get(str(t)) or perT.get(t)
    if not e:
        return g['anchorPx'][0] * S, g['anchorPx'][1] * S, g['adPx'] * S
    return e['anchorPx'][0] * S, e['anchorPx'][1] * S, e['adPx'] * S


print(f"frame {W}x{H}   AD={g['adPx']*S:.1f} devpx")
print()
hdr = ("   t   burstpx  skypx   %brighter  %brighter+20   medLum   p10     p90    "
       "medBg   Weber   %darker")
print(hdr)
for t in TS:
    A = arr(os.path.join(D, f'A-t{t}.png'))
    N = arr(os.path.join(D, f'NOFX-t{t}.png'))
    d = np.abs(A - N).max(axis=2) > 8
    la, ln = lum(A), lum(N)
    dl = la - ln
    sky = sky_mask(N) & d
    n_all = int(d.sum())
    n_sky = int(sky.sum())
    if n_sky == 0:
        print(f"{t:4d}  {n_all:8d}      0        --")
        continue
    v = dl[sky]
    bg = ln[sky]
    weber = np.median(v / np.maximum(bg, 1e-6))
    print(f"{t:4d}  {n_all:8d} {n_sky:6d}   "
          f"{100*np.mean(v > 0):8.1f}%  {100*np.mean(v >= 20):11.1f}%  "
          f"{np.median(v):+7.1f} {np.percentile(v,10):+7.1f} {np.percentile(v,90):+7.1f}  "
          f"{np.median(bg):6.1f}  {weber:+6.2f}  {100*np.mean(v < 0):6.1f}%")
print()
# Darkest FX pixel over sky at t=0 — the ink-shell tell.
A = arr(os.path.join(D, 'A-t0.png'))
N = arr(os.path.join(D, 'NOFX-t0.png'))
d = np.abs(A - N).max(axis=2) > 8
sky = sky_mask(N) & d
if sky.sum():
    li = lum(A)[sky]
    i = np.argmin(li)
    px = A[sky][i]
    print(f"darkest FX pixel over sky @t=0: RGB {px.astype(int).tolist()}  lum {li[i]:.1f}")
    bgv = lum(N)[sky]
    print(f"sky under the burst @t=0:  median lum {np.median(bgv):.1f}  "
          f"min {bgv.min():.1f}  max {bgv.max():.1f}")
