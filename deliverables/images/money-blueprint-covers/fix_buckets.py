#!/usr/bin/python3
"""Recolour THE THREE BUCKETS on both Money Blueprint covers to IFM's bucket colours, left to right:
Emergency = red, Stability = blue, Growth = green (22 Nov 2026); and the Risk & Return scale's pans, red (risk) and\ngreen (return). ChatGPT drew them green / blue / orange, so the left
bucket's green is turned red and the right bucket's orange is turned green; the middle blue one already matches.
Only bucket pixels inside each bucket's box and hue band move — shading, icons, handles, the gold bar chart behind
and the paper all stay as drawn. Then rebuilds the A4 files (2480x3508 @ 300 dpi, PNG + PDF)."""
import os, shutil
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/covers-before-buckets'

# Each job: box (x0,y0,x1,y1 in the 1086x1448 original), source hue band (degrees), target (hue, saturation x, value x),
# boxes to leave alone (gold coins / bars sitting in the scale pans, the bar chart behind a bucket), and an optional
# max value (the v1 blue bucket sits on a lighter blue blueprint, which must not move).
# Targets are absolute: a plain hue shift turned the green magenta. v2 of the colours (user: "the colors are off", the
# red read as maroon): clear, bright red / blue / green — value lifted, not just hue changed.
RED, BLUE, GREEN = (0, 1.25, 1.38), (214, 1.0, 1.22), (138, 0.85, 0.95)
J = lambda box, band, tgt, keep=(), vmax=1.01: (box, band, tgt, keep, vmax)
JOBS = {'Money Blueprint cover - v1 premium 3D.png': [
            J((98, 676, 196, 776), (45, 175), RED),                                       # Emergency: green -> red
            J((196, 690, 270, 772), (195, 245), BLUE, vmax=0.66),                          # Stability: brighter blue
            J((266, 669, 362, 764), (2, 42), GREEN, [(266, 660, 292, 686)]),               # Growth: orange -> green
            J((786, 519, 872, 555), (20, 62), RED, [(810, 490, 849, 544)]),                # Risk & Return: left pan red (risk)
            J((918, 541, 1009, 576), (20, 62), GREEN, [(937, 512, 990, 562), (880, 568, 936, 590)])],   # bars in the pan; the stand's base            #   right pan green (return)
        'Money Blueprint cover - v2 warm editorial.png': [
            J((133, 716, 226, 813), (45, 175), RED),
            J((226, 712, 296, 806), (195, 245), BLUE),
            J((290, 705, 378, 796), (2, 42), GREEN, [(290, 705, 310, 713)]),
            J((785, 538, 871, 582), (20, 62), RED),
            J((918, 559, 1003, 603), (20, 62), GREEN, [(885, 597, 946, 612), (905, 584, 936, 597)])]}   # not the stand's base
MIN_SAT = 0.28   # leaves the cream icons, highlights and paper alone

def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx); m = d > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6; h[gg] = (b - r)[gg] / d[gg] + 2; h[bb] = (r - g)[bb] / d[bb] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx
def hsv_to_rgb(h, s, v):
    c = v * s; x = c * (1 - np.abs((h / 60) % 2 - 1)); m = v - c; z = np.zeros_like(h); k = (h // 60).astype(int) % 6
    r = np.choose(k, [c, x, z, z, x, c]); g = np.choose(k, [x, c, c, x, z, z]); b = np.choose(k, [z, z, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1)

os.makedirs(BACKUP, exist_ok=True)
for f, jobs in JOBS.items():
    p = os.path.join(HERE, f)
    if not os.path.exists(os.path.join(BACKUP, f)): shutil.copy2(p, os.path.join(BACKUP, f))
    a = np.asarray(Image.open(os.path.join(BACKUP, f)).convert('RGB'), np.float32) / 255     # always from the untouched original
    out = a.copy()
    for (x0, y0, x1, y1), (h0, h1), (th, ks, kv), keep, vmax in jobs:
        blk = a[y0:y1, x0:x1]; h, s, v = rgb_to_hsv(blk)
        sel = (h >= h0) & (h <= h1) & (s >= MIN_SAT) & (v <= vmax)
        if (h0, h1) == (2, 42): sel &= ~((np.arange(sel.shape[0])[:, None] < 22) & (h > 30))   # the gold bar behind the rim stays gold
        for bx0, by0, bx1, by1 in keep:                                # the gold bar chart peeking out behind the green bucket
            sel[max(0, by0 - y0):max(0, by1 - y0), max(0, bx0 - x0):max(0, bx1 - x0)] = False   # clamp: a keep box may start outside the job box
        soft = np.asarray(Image.fromarray((sel * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32)[..., None] / 255
        hm = np.median(h[sel]) if sel.any() else 0
        new = hsv_to_rgb((th + 0.2 * (h - hm)) % 360, np.clip(s * ks, 0, 1), np.clip(v * kv, 0, 1))
        out[y0:y1, x0:x1] = blk * (1 - soft) + new * soft
    Image.fromarray((np.clip(out, 0, 1) * 255).round().astype(np.uint8)).save(p)
    # A4 at 300 dpi: fill the height, trim the sides equally (A4 is narrower than ChatGPT's 3:4), light sharpen
    im = Image.open(p).convert('RGB'); W, H = 2480, 3508; k = H / im.height
    big = im.resize((round(im.width * k), H), Image.LANCZOS); x = (big.width - W) // 2
    a4 = big.crop((x, 0, x + W, H)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    stem = p[:-4] + ' - A4'
    a4.save(stem + '.png', dpi=(300, 300)); a4.save(stem + '.pdf', 'PDF', resolution=300, quality=95)
    print('ok', f)
