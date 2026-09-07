#!/usr/bin/env python3
"""
P3 r3 glass measurement.

Answers, with numbers, the two questions the round is judged on:
  1. Is glass the BRIGHTEST thing on screen?  (per-material luminance, plus sky and cloud)
  2. Does it survive the 40px test?           (downscale, then re-measure separation)

Usage: glass-measure.py <shots_dir>
Reads probe.json for the on-screen rect of every block/debris piece; samples the PNG there.
"""
import json, sys, os
from PIL import Image

SHOTS = sys.argv[1]
probe = json.load(open(os.path.join(SHOTS, 'probe.json')))

def lum(px):
    r, g, b = px[0], px[1], px[2]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def png(name):
    for f in sorted(os.listdir(SHOTS)):
        if name in f and f.endswith('.png'):
            return Image.open(os.path.join(SHOTS, f)).convert('RGB')
    return None

def sample_rect(im, cx, cy, hw, hh, scale, inset=0.55):
    """Mean + max luminance over the inner `inset` of a projected rect."""
    W, H = im.size
    x0 = int((cx - hw * inset) * scale); x1 = int((cx + hw * inset) * scale)
    y0 = int((cy - hh * inset) * scale); y1 = int((cy + hh * inset) * scale)
    x0, x1 = max(0, x0), min(W, x1); y0, y1 = max(0, y0), min(H, y1)
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    crop = im.crop((x0, y0, x1, y1))
    px = list(crop.getdata())
    ls = [lum(p) for p in px]
    return dict(mean=sum(ls) / len(ls), max=max(ls), min=min(ls), n=len(ls),
                rect=(x0, y0, x1, y1))

def report(shotname, probekey, extra_points=()):
    im = png(shotname)
    if im is None:
        print(f'  !! no png matching {shotname}'); return
    p = probe[probekey]
    scale = im.size[0] / p['W']
    print(f'\n=== {shotname}  ({im.size[0]}x{im.size[1]}, probe {p["W"]}x{p["H"]}, scale {scale:g})')
    bymat = {}
    for b in p['blocks'] + [dict(d, dbg=1) for d in p['debris']]:
        s = sample_rect(im, b['cx'], b['cy'], b['hw'], b['hh'], scale)
        if not s: continue
        k = b['mat'] + ('/debris' if b.get('dbg') else '')
        bymat.setdefault(k, []).append(s)
    for k in sorted(bymat):
        ss = bymat[k]
        mm = sum(s['mean'] for s in ss) / len(ss)
        mx = max(s['max'] for s in ss)
        print(f'  {k:16s} n={len(ss):3d}  mean_lum={mm:6.1f}  max_lum={mx:6.1f}')
    # sky + cloud + global
    W, H = im.size
    sky = sample_rect(im, p['W'] * 0.50, p['H'] * 0.30, p['W'] * 0.03, p['H'] * 0.03, scale)
    print(f'  {"SKY(mid-frame)":16s}          mean_lum={sky["mean"]:6.1f}  max_lum={sky["max"]:6.1f}')
    px = list(im.getdata())
    ls = sorted(lum(q) for q in px)
    print(f'  {"WHOLE FRAME":16s}          p50={ls[len(ls)//2]:6.1f}  p99={ls[int(len(ls)*0.99)]:6.1f}  max={ls[-1]:6.1f}')
    for (nm, fx, fy) in extra_points:
        s = sample_rect(im, p['W'] * fx, p['H'] * fy, p['W'] * 0.02, p['H'] * 0.02, scale)
        print(f'  {nm:16s}          mean_lum={s["mean"]:6.1f}  max_lum={s["max"]:6.1f}')

def forty_px(shotname):
    im = png(shotname)
    if im is None: return
    small = im.resize((int(40 * im.size[0] / im.size[1]), 40), Image.LANCZOS)
    out = os.path.join(SHOTS, f'_40px-{shotname}.png')
    small.resize((small.size[0] * 8, 320), Image.NEAREST).save(out)
    print(f'  40px test written -> {out}')

if __name__ == '__main__':
    report('aim-l1', 'aimL1')
    report('glass-column-LOCKED', 'column')
    report('glass-shards-LOCKED', 'shards')
    report('settled-pile-LOCKED', 'settledLocked')
    report('mixed-carnage', 'carnage')
    print()
    for s in ('aim-l1', 'glass-column-LOCKED', 'mixed-carnage', 'settled-pile-LOCKED'):
        forty_px(s)
