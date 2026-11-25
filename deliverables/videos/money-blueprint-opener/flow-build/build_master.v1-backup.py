#!/usr/bin/env python3
"""Money Blueprint build: note -> [arrow -> item (Flow clip, green keyed)] x N. Reuses label_arrows.py (note + arrow renderer).
Add an item = add one entry to ITEMS. Run: ~/.claude/skills/effects/.venv/bin/python build_master.py [-> master.mp4 + master-sheet.png]"""
import os, math, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
CAD = 3.9                      # seconds per item (arrow + item)
# name, clip, arrow target on the 1376 base (arrow tip), item feet (x,y) on the 1920 frame, object width px, play speed, hold frame, tag
ITEMS = [dict(name='saving', clip='item1.mp4', tip=(357, 640), feet=(330, 968), objw=300, speed=2.2, hold=165, tag='SAVING & INVESTING'),
         dict(name='buckets', clip='item2.mp4', tip=(333, 480), feet=(300, 700), objw=300, speed=2.2, hold=150, tag='THE THREE BUCKETS'),
         dict(name='risk', clip='item3.mp4', tip=(1045, 460), feet=(1580, 660), objw=330, speed=2.0, hold=135, tag='RISK & RETURN'),
         dict(name='goals', clip='item4.mp4', tip=(473, 505), feet=(660, 968), objw=205, speed=1.8, hold=140, tag='GOALS'),
         dict(name='time', clip='item5.mp4', tip=(953, 566), feet=(1340, 968), objw=300, speed=2.4, hold=170, tag='TIME HORIZON'),
         dict(name='action', clip='item6.mp4', tip=(1086, 628), feet=(1710, 968), bend=-0.10, objw=270, speed=2.4, hold=170, tag='MY ACTION PLAN'),
         dict(name='checklist', clip='item7.mp4', tip=(717, 516), feet=(1000, 968), objw=190, speed=2.4, hold=165, tag='MY CHECKLIST', protect=True)]
ARR_TIPS = [it['tip'] for it in ITEMS]
src = open(os.path.join(HERE, 'label_arrows.py')).read()
a = src.index('ARR_ALL = ['); b = src.index('ARR = ARR_ALL')
arr_def = 'ARR_ALL = [' + ', '.join(f"(({t[0]}, {t[1]}), {ITEMS[i].get('bend', 0.14 if i % 2 == 0 else -0.16)}, {1.7 + CAD * i}, 0.9)" for i, t in enumerate(ARR_TIPS)) + ']\n'
src = src[:a] + arr_def + src[b:]
TOTAL = 1.7 + CAD * len(ITEMS) + 1.4
src = src.replace("TOTAL = 4.2; out = os.path.join(HERE, 'beat2.mp4')", f"TOTAL = {TOTAL}; out = os.path.join(HERE, 'master.mp4')")
src = src.replace("beat2-sheet.png", "master-sheet.png").replace("if i in (0, 20, 40, 60, 90, 125)", "if i % int(TOTAL * FPS / 8) == 20")
src = src.replace("    fr = np.clip(f, 0, 255).astype(np.uint8); proc.stdin.write", "    f = ITEM_HOOK(f, t)\n    fr = np.clip(f, 0, 255).astype(np.uint8); proc.stdin.write")
os.environ['NARR'] = str(len(ITEMS))

SCREEN = np.float32([5, 248, 8])          # BGR of the flat green background
def load(it):
    cap = cv2.VideoCapture(os.path.join(HERE, it['clip'])); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    KF = []
    for f in fr:
        ff = f.astype(np.float32); dist = np.linalg.norm(ff - SCREEN[::-1][::-1] * 1.0, axis=2)   # distance from the screen colour
        al = np.clip((dist - 70) / 110.0, 0, 1)
        if it.get('protect'):                                  # only key green that is connected to the outside, so green details inside the object survive
            near = (dist < 120).astype(np.uint8); nl, lab = cv2.connectedComponents(near, connectivity=4)
            edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
            bgm = np.isin(lab, list(edge)).astype(np.float32); bgm = cv2.GaussianBlur(bgm, (0, 0), 1.2)
            al = np.where(bgm > 0.5, al, 1.0).astype(np.float32); al = np.where(dist < 24, 0.0, al).astype(np.float32)          # pure screen colour is always background (e.g. the clip hole)
        b, g, r = ff[..., 0], ff[..., 1], ff[..., 2]; gs = np.minimum(g, np.maximum(r, b) * 1.0 + 25)   # despill
        if it.get('protect'): gs = np.where(bgm > 0.02, gs, g) if (bgm > 0).any() else g          # keep interior greens (the ticks) untouched
        al[:6] = 0; al[-6:] = 0; al[:, :6] = 0; al[:, -6:] = 0
        KF.append((np.dstack([b, gs, r]), al))
    a0 = KF[0][1] > 0.5; ys, xs = np.where(a0); X0, X1 = int(np.percentile(xs, 1)), int(np.percentile(xs, 99)); Y1 = int(np.percentile(ys, 99))
    it['KF'] = KF; it['box'] = (max(X0 - 110, 0), min(X1 + 110, fr[0].shape[1]), 0, min(Y1 + 40, fr[0].shape[0])); it['scale'] = it['objw'] / (X1 - X0)
    tf = ImageFont.truetype('/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf', 28); _tb = ImageDraw.Draw(Image.new('L', (4, 4))).textbbox((0, 0), it['tag'], font=tf); TW = (_tb[2] - _tb[0]) + 64
    tg = Image.new('RGBA', (TW, 60), (0, 0, 0, 0)); td = ImageDraw.Draw(tg); td.rounded_rectangle([3, 3, TW - 3, 57], 10, fill=(247, 239, 220, 255), outline=(255, 255, 255, 255), width=3)
    td.text((TW / 2 - (_tb[2] - _tb[0]) / 2 - _tb[0], 30 - (_tb[3] - _tb[1]) / 2 - _tb[1]), it['tag'], font=tf, fill=(24, 36, 64, 255)); it['TAG'] = np.asarray(tg, np.float32)
for it in ITEMS: load(it)
def ITEM_HOOK(f, t):
    for n, it in enumerate(ITEMS):
        T0 = 1.7 + CAD * n + 0.85
        if t < T0: continue
        k = t - T0; pop = 1 - (1 - min(k / 0.55, 1)) ** 3; bounce = 1 + 0.06 * math.sin(min(k / 0.55, 1) * math.pi) * (1 - min(k / 0.9, 1))
        KF = it['KF']; idx = min(int(k * 24 * it['speed']), it['hold'], len(KF) - 1); c, al = KF[idx]; X0, X1, Y0, Y1 = it['box']
        crop = c[Y0:Y1, X0:X1]; ac = al[Y0:Y1, X0:X1]; s = it['scale'] * (0.55 + 0.45 * pop) * bounce; h, w = crop.shape[:2]; nw, nh = int(w * s), int(h * s)
        cr = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA); aa = cv2.resize(ac, (nw, nh), interpolation=cv2.INTER_AREA) * min(k / 0.25, 1)
        TX, TY = it['feet']; x0 = TX - nw // 2; y0 = TY - nh + int((1 - pop) * 30) + 10
        sh = np.zeros(f.shape[:2], np.float32); cv2.ellipse(sh, (TX, TY - 2), (int(it['objw'] * 0.45), int(it['objw'] * 0.05)), 0, 0, 360, 1.0, -1); sh = cv2.GaussianBlur(sh, (0, 0), 12) * 0.5 * pop
        f = f * (1 - sh[..., None]) + np.float32([10, 18, 40]) * sh[..., None]
        xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + nw, f.shape[1]), min(y0 + nh, f.shape[0])
        A = aa[ya - y0:yb - y0, xa - x0:xb - x0, None]; f[ya:yb, xa:xb] = f[ya:yb, xa:xb] * (1 - A) + cr[ya - y0:yb - y0, xa - x0:xb - x0] * A
        tk = min(max((k - 0.5) / 0.5, 0), 1); tk = 1 - (1 - tk) ** 3
        if tk > 0:
            tg = it['TAG'].copy(); tg[..., 3] *= tk; TWd = tg.shape[1]; ty = TY + 6 + int((1 - tk) * 16); tx = TX - TWd // 2
            sub = f[ty:ty + 60, max(tx, 0):tx + TWd]; tg2 = tg[:, (max(tx, 0) - tx):][:, :sub.shape[1]]; am = tg2[..., 3:4] / 255; sub[:] = sub * (1 - am) + tg2[..., :3][..., ::-1] * am
    return f
exec(compile(src, 'label_arrows_exec', 'exec'))
