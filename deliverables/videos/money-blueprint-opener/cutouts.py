#!/usr/bin/env python3
"""Cut the REAL items out of the approved cover (user: "you should have made this image landscape first, then built it").
Each item (icon + its torn-paper label) is separated from the blueprint mat with GrabCut and saved as an RGBA PNG in ./cutouts/.
Nothing is redrawn — these are the cover's own pixels. Run: ~/.claude/skills/effects/.venv/bin/python cutouts.py"""
import os
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cutouts'); os.makedirs(OUT, exist_ok=True)
COVER = '/Users/lollyg/Documents/investing for Mummies/deliverables/images/money-blueprint-covers/Money Blueprint cover - v1 premium 3D.png'
img = cv2.imread(COVER); S = 2                                                   # work at 2x so edges are smoother
big = cv2.resize(img, None, fx=S, fy=S, interpolation=cv2.INTER_LANCZOS4)
# name: (x0, y0, x1, y1) on the 1086x1448 cover — the item and its label, without the dotted arrows
BOX = {'goals': (172, 392, 352, 606), 'time': (462, 334, 684, 560), 'risk': (780, 408, 1012, 672), 'buckets': (92, 588, 368, 842),
       'saving': (352, 790, 660, 1006), 'action': (798, 698, 1022, 950), 'checklist': (0, 856, 432, 1294)}
for n, (x0, y0, x1, y1) in BOX.items():
    X0, Y0, X1, Y1 = x0 * S, y0 * S, x1 * S, y1 * S; pad = 16 * S
    ex0, ey0, ex1, ey1 = max(0, X0 - pad), max(0, Y0 - pad), min(big.shape[1], X1 + pad), min(big.shape[0], Y1 + pad)
    crop = big[ey0:ey1, ex0:ex1].copy(); h, w = crop.shape[:2]
    m = np.full((h, w), cv2.GC_BGD, np.uint8)
    ix0, iy0, ix1, iy1 = X0 - ex0, Y0 - ey0, X1 - ex0, Y1 - ey0
    m[iy0:iy1, ix0:ix1] = cv2.GC_PR_FGD
    m[iy0 + 34 * S:iy1 - 34 * S, ix0 + 30 * S:ix1 - 30 * S] = cv2.GC_FGD if n != 'checklist' else cv2.GC_PR_FGD
    # pixels that are clearly the blue mat are background, even inside the box
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV); mat = (hsv[..., 0] >= 98) & (hsv[..., 0] <= 125) & (hsv[..., 1] > 55) & (hsv[..., 2] > 110)
    m[mat & (m != cv2.GC_FGD)] = cv2.GC_BGD if n not in ('buckets', 'time') else cv2.GC_PR_BGD   # the mat is background (buckets/calendar have blue of their own, so only 'probably')
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(crop, m, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    a = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n_lab, lab, st, _ = cv2.connectedComponentsWithStats(a); keep = np.zeros_like(a)
    for j in range(1, n_lab):                                                     # keep the big pieces (icon, label), drop specks
        if st[j, 4] > 0.012 * a.size: keep[lab == j] = 255
    ff = keep.copy(); pad_ = cv2.copyMakeBorder(ff, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0); msk = np.zeros((pad_.shape[0] + 2, pad_.shape[1] + 2), np.uint8)
    cv2.floodFill(pad_, msk, (0, 0), 255); holes = cv2.bitwise_not(pad_)[1:-1, 1:-1]; keep = cv2.bitwise_or(keep, holes)     # fill holes (dark letters were punched out)
    keep = cv2.GaussianBlur(keep, (0, 0), 1.6)
    ys, xs = np.where(keep > 20); b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    rgba = np.dstack([crop, keep])[b[1]:b[3], b[0]:b[2]]; cv2.imwrite(os.path.join(OUT, n + '.png'), rgba); print(n, rgba.shape[1], 'x', rgba.shape[0])
