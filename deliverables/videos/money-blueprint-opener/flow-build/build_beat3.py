#!/usr/bin/env python3
"""Beat 3: note -> arrow 1 grows -> Saving & Investing item (Flow clip, green keyed) pops in and plays. Reuses label_arrows.py's note/arrow code."""
import os, re, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'label_arrows.py')).read()
src = src.replace('TOTAL = 4.2; out = os.path.join(HERE, \'beat2.mp4\')', "TOTAL = 6.6; out = os.path.join(HERE, 'beat3.mp4')")
src = src.replace("beat2-sheet.png", "beat3-sheet.png").replace("if i in (0, 20, 40, 60, 90, 125)", "if i in (30, 75, 95, 110, 130, 160, 195)")
src = src.replace("    fr = np.clip(f, 0, 255).astype(np.uint8); proc.stdin.write", "    f = ITEM_HOOK(f, t)\n    fr = np.clip(f, 0, 255).astype(np.uint8); proc.stdin.write")
assert 'ITEM_HOOK' in src and 'beat3.mp4' in src
# ---- the keyed item ----
cap = cv2.VideoCapture(os.path.join(HERE, 'item1.mp4')); frames = []
while True:
    ok, fr = cap.read()
    if not ok: break
    frames.append(fr)
def key(fr):
    b, g, r = [fr[..., i].astype(np.float32) for i in range(3)]
    dom = g - np.maximum(r, b)
    a = 1 - np.clip((dom - 30) / 55.0, 0, 1); a[:6] = 0; a[-6:] = 0; a[:, :6] = 0; a[:, -6:] = 0
    gs = np.minimum(g, np.maximum(r, b) + 4)                      # despill
    out = np.dstack([b, gs, r]); return out, a
KF = []
for fr in frames:
    c, a = key(fr); KF.append((c, a))
bb = np.zeros(frames[0].shape[:2], bool)
for c, a in KF[:1]: bb |= a > 0.5
ys, xs = np.where(bb); X0, X1, Y0, Y1 = np.percentile(xs, 1), np.percentile(xs, 99), np.percentile(ys, 1), np.percentile(ys, 99)
X0, X1, Y0, Y1 = int(X0) - 90, int(X1) + 90, max(int(Y0) - 140, 0), int(Y1) + 40
print('item bbox', X0, X1, Y0, Y1, 'frames', len(frames))
ITEM_W = 510                                                      # on-screen width of the item (1920 px frame)
ISC = ITEM_W / (X1 - X0)
TX, TY = 395, 960    # feet of the item
T_ITEM = 2.55
# tag label
tag = Image.new('RGBA', (360, 64), (0, 0, 0, 0)); td = ImageDraw.Draw(tag)
td.rounded_rectangle([4, 4, 356, 60], 10, fill=(247, 239, 220, 255), outline=(255, 255, 255, 255), width=3)
tf = ImageFont.truetype('/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf', 29); tb = td.textbbox((0, 0), 'SAVING & INVESTING', font=tf)
td.text((180 - (tb[2] - tb[0]) / 2 - tb[0], 32 - (tb[3] - tb[1]) / 2 - tb[1]), 'SAVING & INVESTING', font=tf, fill=(24, 36, 64, 255)); TAG = np.asarray(tag, np.float32)
def ITEM_HOOK(f, t):
    if t < T_ITEM: return f
    k = (t - T_ITEM); pop = 1 - (1 - min(k / 0.55, 1)) ** 3
    bounce = 1 + 0.06 * math.sin(min(k / 0.55, 1) * math.pi) * (1 - min(k / 0.9, 1))
    idx = min(int(k * 24 * 2.2), 165); c, a = KF[idx]
    crop = c[Y0:Y1, X0:X1]; ac = a[Y0:Y1, X0:X1]
    s = ISC * (0.55 + 0.45 * pop) * bounce; h, w = crop.shape[:2]; nw, nh = int(w * s), int(h * s)
    cr = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA); al = cv2.resize(ac, (nw, nh), interpolation=cv2.INTER_AREA) * min(k / 0.25, 1)
    x0 = TX - nw // 2; y0 = TY - nh + int((1 - pop) * 30)
    # contact shadow + soft light on the mat
    sh = np.zeros(f.shape[:2], np.float32); cv2.ellipse(sh, (TX, TY - 4), (int(nw * 0.30), int(nh * 0.035)), 0, 0, 360, 1.0, -1); sh = cv2.GaussianBlur(sh, (0, 0), 12) * 0.5 * pop
    f = f * (1 - sh[..., None]) + np.float32([10, 18, 40]) * sh[..., None]
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + nw, f.shape[1]), min(y0 + nh, f.shape[0])
    A = al[ya - y0:yb - y0, xa - x0:xb - x0, None]; f[ya:yb, xa:xb] = f[ya:yb, xa:xb] * (1 - A) + cr[ya - y0:yb - y0, xa - x0:xb - x0] * A
    # name tag slides up under the item
    tk = min(max((t - T_ITEM - 0.5) / 0.5, 0), 1); tk = 1 - (1 - tk) ** 3
    if tk > 0:
        tg = TAG.copy(); tg[..., 3] *= tk; ty = TY + 6 + int((1 - tk) * 16); tx = TX - 180
        sub = f[ty:ty + 64, tx:tx + 360]; aa = tg[..., 3:4] / 255; sub[:] = sub * (1 - aa) + tg[..., :3][..., ::-1] * aa
    return f
os.environ['NARR'] = '1'
exec(compile(src, 'label_arrows_exec', 'exec'))
