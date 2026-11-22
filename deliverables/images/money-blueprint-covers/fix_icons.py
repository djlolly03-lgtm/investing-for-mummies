#!/usr/bin/env python3
"""Bucket icons that match their roles (22 Nov 2026, after fix_buckets.py set the colours):
  Emergency (red)  = shield          — v1 keeps its own; v2's red bucket had a growth sprout, replaced by a drawn shield
  Stability (blue) = bank columns    — drawn; both covers had a rising bar chart, which says growth
  Growth (green)   = rising bars     — drawn (four bars and a climbing arrow); both had a graduation cap
(Copying the old icons across picked up specks from the paint, so the new ones are drawn as clean shapes.)
Old icons are painted out with OpenCV inpainting from the bucket around them, so the paint texture and shading carry
on; new icons are laid in the same cream as the originals, tinted slightly by their bucket and feathered.
Runs fix_buckets.py first (it always starts from the untouched originals), then rebuilds the A4 files.
Needs cv2: run with ~/.claude/skills/effects/.venv/bin/python fix_icons.py"""
import os, subprocess, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['/usr/bin/python3', os.path.join(HERE, 'fix_buckets.py')], check=True)

V1, V2 = 'Money Blueprint cover - v1 premium 3D.png', 'Money Blueprint cover - v2 warm editorial.png'
# icon boxes (x0, y0, x1, y1) in the 1086x1448 originals, measured on 4x grids
BOX = {V1: {'red': (141, 716, 172, 752), 'blue': (222, 719, 259, 752), 'green': (296, 710, 340, 735)},
       V2: {'red': (170, 754, 200, 792), 'blue': (246, 750, 280, 784), 'green': (317, 741, 356, 768)}}

def load(f): return cv2.imread(os.path.join(HERE, f))
def icon_mask(img, box, pad=3):
    """the light, low-saturation icon pixels inside box (the paint around them is the bucket colour)"""
    x0, y0, x1, y1 = box; hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    s, v = hsv[..., 1], hsv[..., 2]
    ring = np.zeros(img.shape[:2], bool); ring[y0 - 6:y1 + 6, x0 - 6:x1 + 6] = True; ring[y0:y1, x0:x1] = False
    s_b, v_b = np.median(s[ring]), np.median(v[ring])
    m = np.zeros(img.shape[:2], np.uint8)
    win = (s < 0.62 * s_b) | (v > v_b + 45)
    m[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = win[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
    return m
def erase(img, box):
    m = cv2.dilate(icon_mask(img, box), np.ones((3, 3), np.uint8), iterations=2)
    return cv2.inpaint(img, m, 5, cv2.INPAINT_TELEA)
def cut(img, box):
    """the icon as an alpha mask (float 0..1), cropped to box"""
    x0, y0, x1, y1 = box; x0 -= 2; y0 -= 3; x1 += 3; y1 += 2         # a little margin: the bar chart's arrow tip sits on the edge
    m = icon_mask(img, (x0, y0, x1, y1), pad=0)[y0:y1, x0:x1].astype(np.float32)
    ys, xs = np.nonzero(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]     # trim to the icon itself
    m = cv2.resize(m, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)              # work at 4x so the edge stays crisp
    return np.clip((cv2.GaussianBlur(m, (5, 5), 1.2) - 0.25) * 2.0, 0, 1)
def stamp(img, alpha, box, opacity=0.97):
    """lay a cream icon (alpha 0..1, any size) centred in box, tinted 12% toward the bucket colour beneath"""
    x0, y0, x1, y1 = box; bw, bh = x1 - x0, y1 - y0; h, w = alpha.shape
    k = min(bw / w, bh / h); nw, nh = max(1, round(w * k)), max(1, round(h * k))
    a = cv2.resize(alpha, (nw, nh), interpolation=cv2.INTER_AREA)[..., None] * opacity
    ox, oy = x0 + (bw - nw) // 2, y0 + (bh - nh) // 2
    region = img[oy:oy + nh, ox:ox + nw].astype(np.float32)
    cream = np.array([196, 228, 244], np.float32)                     # BGR of the originals' icon cream
    col = cream * 0.88 + region.mean((0, 1)) * 0.12
    img[oy:oy + nh, ox:ox + nw] = (region * (1 - a) + col * a).clip(0, 255).astype(np.uint8)
    return img
def bank(w, h):
    """Stability: a classic bank front — pediment, three columns, base — drawn 6x and downsampled for clean edges"""
    S = 6; W, H = w * S, h * S; im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    d.polygon([(W * 0.5, H * 0.02), (W * 0.98, H * 0.30), (W * 0.02, H * 0.30)], fill=255)     # pediment
    d.rectangle([W * 0.06, H * 0.33, W * 0.94, H * 0.40], fill=255)                            # architrave
    for cx in (0.20, 0.50, 0.80):
        d.rectangle([W * (cx - 0.075), H * 0.43, W * (cx + 0.075), H * 0.82], fill=255)        # columns
    d.rectangle([W * 0.04, H * 0.85, W * 0.96, H * 0.98], fill=255)                            # base
    return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255

def draw(fn, w, h, S=6):
    im = Image.new('L', (w * S, h * S), 0); fn(ImageDraw.Draw(im), w * S, h * S)
    return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
def shield_icon(d, W, H):
    """Emergency: a shield outline (the same outline style as v1's)"""
    pts = [(W * 0.5, H * 0.03), (W * 0.95, H * 0.17), (W * 0.92, H * 0.52), (W * 0.5, H * 0.97), (W * 0.08, H * 0.52), (W * 0.05, H * 0.17)]
    d.polygon(pts, fill=255)
    inner = [(W * 0.5 + (x - W * 0.5) * 0.74, H * 0.53 + (y - H * 0.53) * 0.78) for x, y in pts]
    d.polygon(inner, fill=0)
def growth_icon(d, W, H):
    """Growth: four rising bars and an arrow climbing over them"""
    for i, top in enumerate((0.72, 0.58, 0.42, 0.26)):
        x0 = W * (0.04 + 0.235 * i); d.rectangle([x0, H * top, x0 + W * 0.17, H * 0.98], fill=255)
    lw = max(2, int(W * 0.06)); d.line([(W * 0.06, H * 0.52), (W * 0.40, H * 0.30), (W * 0.58, H * 0.36), (W * 0.86, H * 0.07)], fill=255, width=lw, joint='curve')
    d.polygon([(W * 0.98, H * 0.0), (W * 0.70, H * 0.04), (W * 0.93, H * 0.24)], fill=255)

v1, v2 = load(V1), load(V2)
for f, img in ((V1, v1), (V2, v2)):
    b = BOX[f]
    img = erase(img, b['blue']); img = erase(img, b['green'])
    if f == V2:
        rx0, ry0, rx1, ry1 = b['red']; img = erase(img, b['red'])
        img = stamp(img, draw(shield_icon, 30, 36), (rx0 - 1, ry0 + 1, rx1 + 1, ry1 - 1))
    bx0, by0, bx1, by1 = b['blue']; img = stamp(img, draw(lambda d, W, H: [d.polygon([(W*.5,H*.02),(W*.98,H*.30),(W*.02,H*.30)],fill=255),
        d.rectangle([W*.06,H*.33,W*.94,H*.40],fill=255), *[d.rectangle([W*(c-.075),H*.43,W*(c+.075),H*.82],fill=255) for c in (.2,.5,.8)],
        d.rectangle([W*.04,H*.85,W*.96,H*.98],fill=255)], bx1 - bx0, by1 - by0), b['blue'])
    gx0, gy0, gx1, gy1 = b['green']; gcy = (gy0 + gy1) // 2
    img = stamp(img, draw(growth_icon, 36, 32), (gx0 + 3, gcy - 16, gx1 - 3, gcy + 16))
    cv2.imwrite(os.path.join(HERE, f), img)
    im = Image.open(os.path.join(HERE, f)).convert('RGB'); W, H = 2480, 3508; k = H / im.height
    big = im.resize((round(im.width * k), H), Image.LANCZOS); x = (big.width - W) // 2
    a4 = big.crop((x, 0, x + W, H)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    stem = os.path.join(HERE, f[:-4] + ' - A4')
    a4.save(stem + '.png', dpi=(300, 300)); a4.save(stem + '.pdf', 'PDF', resolution=300, quality=95)
    print('ok', f)
