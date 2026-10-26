#!/usr/bin/python3
"""Teal staircase steps for the "Workshop Series" slide, drawn as ONE image so the IFM mark can
run across all five steps. Geometry must match build.js (series slide)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DPI = 200
TEAL = (42, 157, 143)
M, STEP, W, BASE, N = 0.6, 2.455, 2.3, 6.9, 5
TOPS = [3.5 - i * 0.32 + 2.68 + 0.15 for i in range(N)]      # riser tops (inches)
X0, Y0, X1, Y1 = M, min(TOPS), M + (N - 1) * STEP + W, BASE

def px(v):
    return int(round(v * DPI))

def build(mode, out):
    w, h = px(X1 - X0), px(Y1 - Y0)
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    for i, t in enumerate(TOPS):
        x = M + i * STEP
        if mode == 'climb':   # steps joined into one staircase: each step runs on to the next
            x1 = x + STEP if i < N - 1 else x + W
            d.rounded_rectangle((px(x - X0), px(t - Y0), px(x1 - X0) - 1, h - 1), px(0.1), fill=255)
            if i:  # square off the join with the previous step so no seam shows
                d.rectangle((px(x - X0) - px(0.12), px(TOPS[i - 1] - Y0), px(x - X0) + px(0.12), h - 1), fill=255)
        else:
            d.rounded_rectangle((px(x - X0), px(t - Y0), px(x - X0 + W) - 1, h - 1), px(0.1), fill=255)
    art = Image.new('RGBA', (w, h), TEAL + (255,))
    logo = Image.open(HERE / 'assets' / 'logo-round-white.png').convert('RGBA')
    if mode == 'giant':
        # one big tree centred on the middle step, read through the gaps like a window
        lh = px(2.6); lw = int(logo.width * lh / logo.height)
        L = logo.resize((lw, lh), Image.LANCZOS)
        L.putalpha(L.getchannel('A').point(lambda a: int(a * 0.24)))
        cx = px(2 * STEP + W / 2)
        art.alpha_composite(L, (cx - lw // 2, h - lh + px(0.45)))
    elif mode == 'pattern':
        # small marks on a half-drop grid, like a branded fabric
        lh = px(0.42); lw = int(logo.width * lh / logo.height)
        L = logo.resize((lw, lh), Image.LANCZOS)
        L.putalpha(L.getchannel('A').point(lambda a: int(a * 0.16)))
        gx, gy = px(0.62), px(0.56)
        for r, y in enumerate(range(-gy // 2, h, gy)):
            off = gx // 2 if r % 2 else 0
            for x in range(-gx + off, w, gx):
                art.alpha_composite(L, (x, y))
    elif mode == 'climb':
        # the full IFM lockup, faint, in the tall end of the climb
        lock = Image.open(HERE / 'assets' / 'logo-white.png').convert('RGBA')
        lh = px(1.15); lw = int(lock.width * lh / lock.height)
        L = lock.resize((lw, lh), Image.LANCZOS)
        L.putalpha(L.getchannel('A').point(lambda a: int(a * 0.30)))
        art.alpha_composite(L, (w - lw - px(0.22), h - lh - px(0.16)))
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(art, (0, 0), mask)
    canvas.save(HERE / 'assets' / out, optimize=True)
    print(out, canvas.size)

if __name__ == '__main__':
    for mode in sys.argv[1:] or ['giant', 'pattern']:
        build(mode, f'stairs-{mode}.png')
