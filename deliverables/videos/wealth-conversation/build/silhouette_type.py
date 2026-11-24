#!/usr/bin/env python3
"""Silhouette-type beat (guide card 108 colour-field-wipe, user's reference 23 Nov 2026) on "You don't have to manage
every investment yourself, but you should know enough" (generic 41.5-45.6s, closing take MVI_0283, cam = generic - 20.658).
Hard cut to a mustard field with Hiral as a black silhouette; black condensed words stack top-left on each spoken word
with a short glitch on entry; on "yourself," it flips to cream; ENOUGH. lands big behind her head; back to the real shot.
  python silhouette_type.py still T [T...]  |  python silhouette_type.py  -> $TMP/sil.mp4"""
import os, sys, random, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, grade_fit, grade, Matte, write, GEN, TAKES, TMP, W, H, FPS, SK

OFF = -20.658
S0, S1 = 1245, 1368                         # 41.500 -> 45.600
REAL_IN, REAL_OUT = 41.57, 45.45            # real shot shows for 2 frames at the start and ~5 at the end
MUSTARD, CREAM, INK = (230, 178, 46), (240, 232, 214), (20, 20, 20)
ANTON = SK + '/fonts/Anton-Regular.ttf'
# punch words only (user, 23 Nov 2026: "just the most important words ... bigger punch")
YELLOW = [("DON'T", 41.80, 'big', 48), ('MANAGE', 42.42, 'big', 236), ('EVERY', 42.70, 'small', 410),
          ('INVESTMENT', 43.04, 'big', 476)]
CREAMW = [('KNOW', 44.96, 'big', 60), ('ENOUGH.', 45.22, 'huge', 250)]
FLIP = 44.90                                # hold the yellow stack through "yourself, but you should"


def word(text, kind):
    cap = {'big': 152, 'small': 56, 'huge': 250}[kind]
    f = ImageFont.truetype(ANTON, int(cap / 0.74))
    l, t, r, b = f.getbbox(text)
    im = Image.new('RGBA', (r - l + 10, b - t + 10), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((5 - l, 5 - t), text, font=f, fill=INK + (255,))
    if im.width > W - 60: im = im.resize((W - 60, int(im.height * (W - 60) / im.width)), Image.LANCZOS)
    return im


def glitch(im, k, seed):
    """k = 0..1 glitch strength: horizontal strip shifts + blocky pixelation."""
    if k <= 0: return im
    rnd = random.Random(seed); out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    y = 0
    while y < im.height:
        h = rnd.randint(6, 22); dx = int(rnd.uniform(-40, 40) * k)
        out.paste(im.crop((0, y, im.width, min(im.height, y + h))), (dx, y)); y += h
    px = max(1, int(10 * k))
    if px > 1: out = out.resize((max(1, out.width // px), max(1, out.height // px)), Image.NEAREST).resize(out.size, Image.NEAREST)
    return out


def render(stills=None):
    n = S1 - S0
    raw = frames(f'{TAKES}/MVI_0283.MP4', S0 / FPS + OFF, n)
    k0 = int(round(47.0 * FPS)) - S0
    ab = grade_fit(frames(GEN, 47.0, 20), frames(f'{TAKES}/MVI_0283.MP4', 47.0 + OFF, 20), slice(1000, 1900))
    words = {w: word(w, k) for w, _, k, _ in YELLOW + CREAMW}
    mt = Matte(); out = []
    idx = [int(round(t * FPS)) - S0 for t in stills] if stills else range(n)
    for i in idx:
        t = (S0 + i) / FPS
        g = grade(raw[i].astype(np.float32), ab)
        m = mt(raw[i]) if stills is None else Matte()(raw[i])
        if t < REAL_IN or t >= REAL_OUT:
            f = g
        else:
            cream = t >= FLIP
            bg = Image.new('RGB', (W, H), CREAM if cream else MUSTARD).convert('RGBA')
            for w, ts, kind, y in (CREAMW if cream else YELLOW):
                if t < ts: continue
                gk = max(0.0, 1 - (t - ts) / 0.1)
                im = glitch(words[w], gk, hash(w) + int(t * 100))
                bg.alpha_composite(im, (48, y))
            base = np.asarray(bg.convert('RGB')).astype(np.float32)
            f = base * (1 - m) + np.array(INK, np.float32) * m
        if stills is not None:
            Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(f'{TMP}/sil_still_{t:.2f}.png')
        else:
            out.append(f)
    if stills is None: return write('sil', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still': render([float(x) for x in sys.argv[2:]])
    else: render()
