#!/usr/bin/env python3
"""The title the user picked (22 Nov 2026, from a reference cover they sent): "THE MONEY" over a larger "BLUEPRINT",
both in a heavy navy serif, no banner, with a thin tapered gold sweep underneath. Set in Lora Bold (IFM's brand serif,
the closest match to the reference's wedge serifs) thickened with a fine stroke and tracked tight.
Runs fix_icons.py first (colours + icons from the untouched originals), paints out ChatGPT's title with
title_options.clean_plate, sets the new one, then rebuilds the A4 files. Run with ~/.claude/skills/effects/.venv/bin/python"""
import os, subprocess, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.expanduser('~/.claude/skills/effects/.venv/bin/python')
subprocess.run([PY, os.path.join(HERE, 'fix_icons.py')], check=True)
spec = importlib.util.spec_from_file_location('t', os.path.join(HERE, 'title_options.py')); t = importlib.util.module_from_spec(spec); spec.loader.exec_module(t)
NAVY, GOLD_A, GOLD_B = (18, 37, 68), (236, 176, 52), (200, 136, 28)
SWOOSH = {'Money Blueprint cover - v1 premium 3D.png': (440, 294, 668, 330), 'Money Blueprint cover - v2 warm editorial.png': (474, 290, 708, 330)}

def paint_out_gold(im, box):
    """inpaint only gold pixels in box, so the subtitle's descenders just above are left untouched"""
    import cv2
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR); x0, y0, x1, y1 = box
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(np.float32); h, sat = hsv[..., 0] * 2, hsv[..., 1] / 255
    m = np.zeros(a.shape[:2], np.uint8); g = ((h > 22) & (h < 55) & (sat > 0.45)).astype(np.uint8)
    m[y0:y1, x0:x1] = g[y0:y1, x0:x1]; m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
    out = cv2.inpaint(a, m, 7, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
def lora(size):
    f = ImageFont.truetype(os.path.expanduser('~/Library/Fonts/Lora.ttf'), size); f.set_variation_by_name('Bold'); return f
def width(d, s, f, sp): return sum(d.textlength(ch, font=f) for ch in s) + sp * (len(s) - 1)
def spaced(d, x, y, s, f, sp, fill, stroke):
    for ch in s:
        d.text((x, y), ch, font=f, fill=fill, stroke_width=stroke, stroke_fill=fill); x += d.textlength(ch, font=f) + sp

for cover, c in t.COVERS.items():
    im = t.clean_plate(Image.open(os.path.join(HERE, cover)).convert('RGB'), c['box'])
    im = paint_out_gold(im, SWOOSH[cover])      # ChatGPT's gold swoosh under the subtitle: one sweep only, like the reference
    S = 3; big = im.resize((im.width * S, im.height * S), Image.LANCZOS); d = ImageDraw.Draw(big)
    x0, y0, x1, y1 = [v * S for v in c['box']]; cx = (x0 + x1) / 2; bw, bh = x1 - x0, y1 - y0
    # sizes: BLUEPRINT ~96% of the box width, THE MONEY at 0.74 of its size (the reference's proportion)
    s2 = 400
    while width(d, 'BLUEPRINT', lora(s2), -0.012 * s2) > bw * 0.96: s2 -= 2
    s1 = int(s2 * 0.74); f1, f2 = lora(s1), lora(s2); sp1, sp2 = -0.008 * s1, -0.012 * s2
    st1, st2 = max(1, round(s1 * 0.012)), max(1, round(s2 * 0.012))      # a fine stroke: heavier, like the reference
    c1 = f1.getbbox('THE MONEY'); c2 = f2.getbbox('BLUEPRINT')
    h1, h2 = c1[3] - c1[1], c2[3] - c2[1]; gap = s2 * 0.17; sweep = s2 * 0.24
    total = h1 + gap + h2 + sweep
    while total > bh * 0.98:                                              # shrink both together if the box is short
        s2 -= 2; s1 = int(s2 * 0.74); f1, f2 = lora(s1), lora(s2); sp1, sp2 = -0.008 * s1, -0.012 * s2
        c1 = f1.getbbox('THE MONEY'); c2 = f2.getbbox('BLUEPRINT'); h1, h2 = c1[3] - c1[1], c2[3] - c2[1]
        gap = s2 * 0.17; sweep = s2 * 0.24; total = h1 + gap + h2 + sweep
    top = y0 + (bh - total) / 2
    w1, w2 = width(d, 'THE MONEY', f1, sp1), width(d, 'BLUEPRINT', f2, sp2)
    # soft drop shadow, then the type
    sh = Image.new('L', big.size, 0); ds = ImageDraw.Draw(sh)
    spaced(ds, cx - w1 / 2 + 4, top - c1[1] + 7, 'THE MONEY', f1, sp1, 70, st1)
    spaced(ds, cx - w2 / 2 + 5, top + h1 + gap - c2[1] + 8, 'BLUEPRINT', f2, sp2, 70, st2)
    big.paste((10, 18, 30), (0, 0), sh.filter(ImageFilter.GaussianBlur(9)))
    spaced(d, cx - w1 / 2, top - c1[1], 'THE MONEY', f1, sp1, NAVY, st1)
    spaced(d, cx - w2 / 2, top + h1 + gap - c2[1], 'BLUEPRINT', f2, sp2, NAVY, st2)
    # the gold sweep: a tapered, slightly arched brush stroke under BLUEPRINT, ~45% of its width
    L = w2 * 0.50; yb = top + h1 + gap + h2 + sweep * 0.72; n = 240
    xs = np.linspace(-1, 1, n); px = cx + xs * L / 2 - L * 0.04; py = yb - (1 - xs ** 2) * sweep * 0.18 + xs * sweep * 0.06
    thick = (1 - np.abs(xs) ** 1.4) * s2 * 0.085 + 2
    for i in range(n):
        k = i / (n - 1); col = tuple(int(GOLD_A[j] * (1 - k) + GOLD_B[j] * k) for j in range(3))
        d.ellipse([px[i] - thick[i], py[i] - thick[i] * 0.62, px[i] + thick[i], py[i] + thick[i] * 0.62], fill=col)
    out = big.resize(im.size, Image.LANCZOS); out.save(os.path.join(HERE, cover))
    W, H = 2480, 3508; k = H / out.height
    b2 = out.resize((round(out.width * k), H), Image.LANCZOS); x = (b2.width - W) // 2
    a4 = b2.crop((x, 0, x + W, H)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    stem = os.path.join(HERE, cover[:-4] + ' - A4')
    a4.save(stem + '.png', dpi=(300, 300)); a4.save(stem + '.pdf', 'PDF', resolution=300, quality=95)
    print('ok', cover)
