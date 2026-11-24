#!/usr/bin/env python3
"""Zoom-through-cut (guide card 78) on "You don't have to manage every investment yourself, but you should know enough"
(generic 41.5-45.6s, MVI_0283, cam = generic - 20.658). Replaces the silhouette beat the user rejected (23 Nov 2026).
Slow creep in, a fast punch into her face in the pause after "yourself,", hold, then ease back out on "but you should",
landing at normal framing before paper-cut. Two small italic captions as in the guide sample.
  python zoom_through.py still T [T...]  |  python zoom_through.py  -> $TMP/zoom.mp4"""
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, grade_fit, grade, Matte, write, ease_out, clamp, over, GEN, TAKES, TMP, W, H, FPS, SK

OFF = -20.658
Z0, Z1 = 1245, 1368
SERIF = SK + '/fonts/InstrumentSerif-Italic.ttf'
CAPS = [('manage every', 42.40, 43.00), ('investment yourself', 43.00, 43.95)]


def ease_inout(p): p = clamp(p); return p * p * (3 - 2 * p)


def zoom_at(t):
    if t < 43.90: return 1.0 + 0.10 * ease_inout((t - 41.5) / 2.4)        # slow creep
    if t < 44.02: return 1.10 + 0.55 * ease_out((t - 43.90) / 0.12)       # punch in
    if t < 44.40: return 1.65                                              # hold through the pause
    return 1.65 - 0.65 * ease_inout((t - 44.40) / 0.75)                    # back out on "but you should"


def caption(text):
    f = ImageFont.truetype(SERIF, 86); l, t, r, b = f.getbbox(text); pad = 24
    im = Image.new('RGBA', (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - l, pad - t), text, font=f, fill=(255, 255, 255, 255))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); sh.putalpha(im.getchannel('A').point(lambda v: int(v * 0.6)))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)), (2, 4)); out.alpha_composite(im)
    return out


def render(stills=None):
    n = Z1 - Z0
    raw = frames(f'{TAKES}/MVI_0283.MP4', Z0 / FPS + OFF, n)
    ab = grade_fit(frames(GEN, 47.0, 20), frames(f'{TAKES}/MVI_0283.MP4', 47.0 + OFF, 20), slice(1000, 1900))
    m0 = Matte()(raw[0])[..., 0] > 0.5
    rows = np.where(m0.sum(1) > 20)[0]; ht = int(rows[0]); xs = np.where(m0[ht + 120])[0]
    cx, cy = (xs[0] + xs[-1]) / 2, ht + 230                                  # aim between the eyes
    caps = {c: caption(c) for c, _, _ in CAPS}
    out = []
    idx = [int(round(t * FPS)) - Z0 for t in stills] if stills else range(n)
    for i in idx:
        t = (Z0 + i) / FPS; z = max(1.0, zoom_at(t))
        g = Image.fromarray(np.clip(grade(raw[i].astype(np.float32), ab), 0, 255).astype(np.uint8))
        w, h = W / z, H / z; x0 = min(max(cx - w / 2, 0), W - w); y0 = min(max(cy - h * 0.42, 0), H - h)
        f = np.asarray(g.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + w, y0 + h))).astype(np.float32)
        L = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for c, a, b in CAPS:
            if a <= t < b:
                al = clamp((t - a) / 0.1) * clamp((b - t) / 0.1); im = caps[c]
                if al < 1: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v, q=al: int(v * q)))
                L.alpha_composite(im, (int(W / 2 - im.width / 2), 1430))
        f = over(f, L)
        if stills is not None: Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(f'{TMP}/zoom_still_{t:.2f}.png')
        else: out.append(f)
    if stills is None: return write('zoom', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still': render([float(x) for x in sys.argv[2:]])
    else: render()
