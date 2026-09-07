#!/usr/bin/env python3
"""
p1-r8-lance.py — scores the shape of the launch trail from the PNGs p1-r8-lance.mjs writes.

The r7 critic's gap, in numbers: our trail's half-width GREW downrange (0.23 AD at 4–6 AD from
the fork to 0.78–0.85 AD at 12–14 AD, where the dart is), so its widest and densest end sat on
the projectile, and 26–31 sparkles lived inside 2 AD of the ammo from t = 0 to t = 100 ms.
The reference is the opposite: a smear that thins downrange and STOPS short of the shot.

For each timestamp, VFX pixels are isolated by differencing the shipped frame against the same
instant with every fx-* pool hidden — no colour threshold, no guess about what is a sparkle.
They are then projected onto the live pouch->ammo axis and binned in 2-AD steps:

  n      pixels in the bin
  hw     90th-percentile |offset| from the axis, in AD  <- THE TAPER. Must DECREASE downrange.
  tip    99th-percentile reach along the axis, in AD from the pouch
  gap    ammo distance - tip, in AD                     <- must stay >= ~2 AD: the dart flies clean
  near2  VFX pixels within 2 AD of the ammo centre      <- the engulfing. Wants to be ~0.
  blobs  connected components of those                  <- "26-31 sparkles inside 2 AD"

Also prints the r5-critic band ratio (vfx:band inside a 520 px box on the pouch) at every
timestamp, because the two metrics pull in opposite directions and neither may buy the other.

Usage: python3 p1-r8-lance.py <shots-dir>
"""
import json, os, sys
import numpy as np
from PIL import Image

D = sys.argv[1]
BOX = float(sys.argv[2]) if len(sys.argv) > 2 else 520.0
g = json.load(open(os.path.join(D, 'geom.json')))


def arr(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)


first = arr(os.path.join(D, f"A-t{g['ts'][0]}.png"))
H, W = first.shape[:2]
S = W / g['cssW']                       # device px per css px
ys, xs = np.mgrid[0:H, 0:W]

print(f"frame {W}x{H}  scale {S:g}x css   AD={g['adPx']*S:.1f} devpx   "
      f"muzzle={g['muzzleAD']} AD   shot angle={g['angle']} power={g['power']}")


def components(mask):
    """Count 8-connected blobs without scipy: iterative flood fill over the True pixels."""
    seen = np.zeros_like(mask, dtype=bool)
    idx = np.argwhere(mask)
    n = 0
    for sy, sx in idx:
        if seen[sy, sx]:
            continue
        n += 1
        stack = [(sy, sx)]
        seen[sy, sx] = True
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx_ = y + dy, x + dx
                    if 0 <= yy < mask.shape[0] and 0 <= xx_ < mask.shape[1] \
                            and mask[yy, xx_] and not seen[yy, xx_]:
                        seen[yy, xx_] = True
                        stack.append((yy, xx_))
    return n


for t in g['ts']:
    e = g['perT'][str(t)] if str(t) in g['perT'] else g['perT'][t]
    px, py = e['anchorPx'][0] * S, e['anchorPx'][1] * S
    ad = e['adPx'] * S
    A = arr(os.path.join(D, f'A-t{t}.png'))
    nf = arr(os.path.join(D, f'NOFX-t{t}.png'))
    nb = arr(os.path.join(D, f'NOBAND-t{t}.png'))
    dv = (np.abs(A - nf).max(axis=2) > 8)
    db = (np.abs(A - nb).max(axis=2) > 8)

    if not e['ammoPx']:
        print(f"t={t}: no projectile"); continue
    ax_, ay_ = e['ammoPx'][0] * S, e['ammoPx'][1] * S
    vx, vy = ax_ - px, ay_ - py
    L = np.hypot(vx, vy) or 1.0
    ux, uy = vx / L, vy / L
    nx, ny = -uy, ux
    dist = L / ad                        # pouch -> ammo, in AD

    yy, xx_ = np.nonzero(dv)
    s = ((xx_ - px) * ux + (yy - py) * uy) / ad
    d = ((xx_ - px) * nx + (yy - py) * ny) / ad
    corridor = (np.abs(d) < 2.5) & (s > -0.5)
    s_c, d_c = s[corridor], d[corridor]

    # the trail's own end: ignore the pixels the ammo itself is standing in
    trail = s_c < dist - 0.6
    tip = np.percentile(s_c[trail], 99) if trail.sum() > 20 else 0.0

    near = np.hypot(xx_ - ax_, yy - ay_) < 2.0 * ad
    nearmask = np.zeros((H, W), dtype=bool)
    nearmask[yy[near], xx_[near]] = True
    blobs = components(nearmask) if near.sum() < 40000 else -1

    half = BOX / 2.0            # DEVICE px, matching p1-r6-bandvfx.py's box convention
    inbox = (np.abs(xs - px) <= half) & (np.abs(ys - py) <= half)
    bp, vp = int((db & inbox).sum()), int((dv & inbox).sum())
    ratio = (vp / bp) if bp else float('inf')

    print(f"\n--- t={t} ms   ammo at {dist:.2f} AD   tip {tip:.2f} AD   "
          f"GAP {dist - tip:5.2f} AD   near2 {int(near.sum()):5d} px / {blobs:3d} blobs   "
          f"band box vfx:band {ratio:5.2f} {'OK' if ratio < 1 else 'FAIL'}")
    print("     bin(AD)     n     hw(AD)")
    lo = 0.0
    while lo < dist + 2:
        sel = (s_c >= lo) & (s_c < lo + 2)
        if sel.sum() >= 12:
            hw = np.percentile(np.abs(d_c[sel]), 90)
            print(f"    {lo:5.1f}-{lo+2:4.1f}  {int(sel.sum()):5d}     {hw:.2f}")
        else:
            print(f"    {lo:5.1f}-{lo+2:4.1f}  {int(sel.sum()):5d}        -")
        lo += 2
