#!/usr/bin/env python3
"""
p3-r7-slate.py — CAN A GLASS FRAGMENT BE MISTAKEN FOR STONE? As a number.

Population: every pixel a layer actually drew, found by differencing the all-visible render
against the SAME simulated instant with that layer hidden (SS.__render() advances nothing),
so the glass family needs no colour guess to define it — it is exactly what glass painted.

Metric: STONE BAND. Rendered stone's own debris is measured first, and its central S/V box
(p05..p95 of saturation, p05..p95 of value) becomes the band. A glass pixel inside that box
is a pixel that could have come off a rock. That is the criterion the r6 gap named, in the
game's own colours rather than in a hand-picked constant.

Usage: p3-r7-slate.py <shots_dir>
"""
import sys, os, colorsys
from PIL import Image, ImageChops, ImageFilter

DIFF = 10

def find(d, needle):
    for f in sorted(os.listdir(d)):
        if needle in f and f.endswith('.png'):
            return Image.open(os.path.join(d, f)).convert('RGB')
    return None

def mask(a, b):
    """
    Pixels this layer drew, ERODED BY ONE. An edge pixel is a blend of the fragment and
    whatever is behind it (sky, grass, another chip) and is not the fragment's colour, so
    counting it measures anti-aliasing rather than the material. Erosion is applied to every
    arm of every comparison, so it cannot flatter one.
    """
    m = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v >= DIFF else 0)
    return m.filter(ImageFilter.MinFilter(3))

def px_hsv(img, m):
    p, mp = img.load(), m.load()
    W, H = img.size
    out = []
    for y in range(H):
        for x in range(W):
            if mp[x, y]:
                r, g, b = p[x, y]
                out.append(colorsys.rgb_to_hsv(r / 255, g / 255, b / 255) + ((r, g, b),))
    return out

def layers(d, tag):
    a = find(d, f'{tag}-ALL.')
    if a is None: return None
    fx = px_hsv(a, mask(a, find(d, f'{tag}-NOFX')))
    rg = px_hsv(a, mask(a, find(d, f'{tag}-NODEBRIS')))
    return fx, rg

def q(v, f):
    v = sorted(v); return v[min(len(v) - 1, int(len(v) * f))]

def describe(name, px):
    if not px: print(f'  {name:14s} n=0'); return
    S = [p[1] for p in px]; V = [p[2] for p in px]
    mean = tuple(round(sum(p[3][i] for p in px) / len(px)) for i in range(3))
    print(f'  {name:14s} n={len(px):7d} mean=rgb{mean} '
          f'S p05/p50/p95={q(S,.05):.2f}/{q(S,.5):.2f}/{q(S,.95):.2f} '
          f'V p05/p50/p95={q(V,.05):.2f}/{q(V,.5):.2f}/{q(V,.95):.2f}')

if __name__ == '__main__':
    d = sys.argv[1]
    BODY = lambda p: 0.45 <= p[2] <= 0.92          # exclude ink (dark) and specular (blown)
    SLATE_S = 0.30

    # --- the band is the GAME'S OWN STONE, measured, not a hand-picked constant -----------
    st = layers(d, 'stone200')
    if not st: raise SystemExit('need the stone200 capture to define the band')
    stone_body = [p for p in st[0] + st[1] if BODY(p)]
    stone_slate = [p for p in stone_body if p[1] <= SLATE_S]
    S = [p[1] for p in stone_body]
    Hs = sorted(p[0] * 360 for p in stone_slate)
    h0, h1 = q(Hs, .02), q(Hs, .98)
    print(f'RENDERED STONE  body px={len(stone_body)}  S p50={q(S,.5):.3f} p90={q(S,.9):.3f}   '
          f'{100*len(stone_slate)/len(stone_body):.1f}% of it is S<={SLATE_S}, hue {h0:.0f}..{h1:.0f} deg')
    print(f'SLATE      = a body pixel at S <= {SLATE_S} (the band the r6 critic measured at S=0.20)')
    print(f'STONE-HUED = SLATE and also inside stone\'s own measured hue band {h0:.0f}..{h1:.0f} deg,')
    print( '             i.e. a pixel that could actually be mistaken for this game\'s rock\n')
    inhue = lambda p: h0 <= p[0] * 360 <= h1

    print(f'{"capture":10s} {"layer":14s} {"body px":>8s} {"SLATE":>7s} {"%":>7s} '
          f'{"ST-HUED":>8s} {"%":>7s}  mean slate rgb')
    for tag in ('glass120', 'glass200', 'glass300', 'glass450', 'glass700', 'stone200', 'wood200'):
        L = layers(d, tag)
        if not L: continue
        fx, rg = L
        for nm, px in (('fx chips', fx), ('rigid shards', rg), ('BOTH', fx + rg)):
            body = [p for p in px if BODY(p)]
            sl = [p for p in body if p[1] <= SLATE_S]
            sh = [p for p in sl if inhue(p)]
            mean = tuple(round(sum(c[3][i] for c in sl) / len(sl)) for i in range(3)) if sl else None
            print(f'{tag:10s} {nm:14s} {len(body):8d} {len(sl):7d} '
                  f'{100*len(sl)/max(1,len(body)):6.2f}% {len(sh):8d} '
                  f'{100*len(sh)/max(1,len(body)):6.2f}%  {mean if mean else "-"}')
        print()
