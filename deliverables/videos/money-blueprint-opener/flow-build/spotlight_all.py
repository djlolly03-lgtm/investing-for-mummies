#!/usr/bin/env python3
"""Spotlight prompt v3: item throbs (stronger beat + ripple ring + sparkles + shape-following glow), card pops up and settles, text reveals line by line,
pointer tail aims at the item, progress dots, gentle exit. Run: ~/.claude/skills/effects/.venv/bin/python spotlight_v3.py"""
import os, math, random, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
base = cv2.imread(os.path.join(HERE, 'money-blueprint-final-frame.png')).astype(np.float32); H, W = base.shape[:2]
SCREEN = np.float32([5, 248, 8])
def ease(x): return 1 - (1 - min(max(x, 0.0), 1.0)) ** 3
def back(x, s=1.9): x = min(max(x, 0.0), 1.0) - 1; return x * x * ((s + 1) * x + s) + 1
def load_item(clip, hold, objw, feet, protect=False):
    cap = cv2.VideoCapture(os.path.join(HERE, clip)); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    def key(a):
        dist = np.linalg.norm(a - SCREEN, axis=2); al = np.clip((dist - 70) / 110.0, 0, 1)
        b, g, r = a[..., 0], a[..., 1], a[..., 2]; gs = np.minimum(g, np.maximum(r, b) + 25)
        if protect:
            near = (dist < 120).astype(np.uint8); nl, lab = cv2.connectedComponents(near, connectivity=4)
            edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
            bgm = cv2.GaussianBlur(np.isin(lab, list(edge)).astype(np.float32), (0, 0), 1.2); al = np.where(bgm > 0.5, al, 1.0).astype(np.float32); al = np.where(dist < 24, 0.0, al).astype(np.float32)
            gs = np.where(bgm > 0.02, gs, g)
        al[:6] = 0; al[-6:] = 0; al[:, :6] = 0; al[:, -6:] = 0
        return np.dstack([b, gs, r]), al
    c0, a0 = key(fr[0].astype(np.float32)); c, a = key(fr[min(hold, len(fr) - 1)].astype(np.float32))
    ys, xs = np.where(a0 > 0.5); X0, X1 = int(np.percentile(xs, 1)), int(np.percentile(xs, 99)); Y1 = int(np.percentile(ys, 99))
    box = (max(X0 - 110, 0), min(X1 + 110, 1280), 0, min(Y1 + 40, 720)); s = objw / (X1 - X0)
    it = dict(rgb=c[box[2]:box[3], box[0]:box[1]], a=a[box[2]:box[3], box[0]:box[1]], s=s, feet=feet)
    layer, A = place(it, 1.0); ys, xs = np.where(A > 0.5); it['bb'] = (xs.min(), ys.min(), xs.max(), ys.max()); it['cx'] = (xs.min() + xs.max()) / 2; it['cy'] = (ys.min() + ys.max()) / 2
    rnd = random.Random(5); it['sparks'] = [(rnd.uniform(it['bb'][0] - 40, it['bb'][2] + 40), rnd.uniform(it['bb'][1] - 40, it['bb'][3] + 20), rnd.uniform(0, 6.28), rnd.uniform(0.8, 1.6)) for _ in range(16)]
    return it
def place(it, mul):
    cr, ac = it['rgb'], it['a']; h, w = cr.shape[:2]; s = it['s'] * mul; nw, nh = int(w * s), int(h * s)
    rgb = cv2.resize(cr, (nw, nh), interpolation=cv2.INTER_AREA); al = cv2.resize(ac, (nw, nh), interpolation=cv2.INTER_AREA)
    TX, TY = it['feet']; x0 = TX - nw // 2; y0 = TY - nh + 10
    layer = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + nw, W), min(y0 + nh, H)
    layer[ya:yb, xa:xb] = rgb[ya - y0:yb - y0, xa - x0:xb - x0]; A[ya:yb, xa:xb] = al[ya - y0:yb - y0, xa - x0:xb - x0]
    return layer, A
LORA = '/Users/lollyg/Library/Fonts/Lora.ttf'; NUN = '/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf'
def lora(sz):
    f = ImageFont.truetype(LORA, sz)
    try: f.set_variation_by_name('Bold')
    except Exception: pass
    return f
PAD = 110; S2 = 2
def make_card(topic, lines, hint, idx, n, CW, CH, side, tail_y):
    """big card; side = which side the spotlighted item is on ('left' or 'right'); tail_y = item's centre y relative to the card centre"""
    w, h = (CW + 2 * PAD) * S2, (CH + 2 * PAD) * S2; ox, oy = PAD * S2, PAD * S2; cw, ch = CW * S2, CH * S2
    def blank(): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
    by = h / 2 + max(-ch * 0.30, min(ch * 0.30, tail_y * S2 * 0.6))
    if side == 'left': bx = ox; poly = [(bx + 2 * S2, by - 54 * S2), (bx + 2 * S2, by + 54 * S2), (bx - 86 * S2, by + 24 * S2)]
    else: bx = ox + cw; poly = [(bx - 2 * S2, by - 54 * S2), (bx - 2 * S2, by + 54 * S2), (bx + 86 * S2, by + 24 * S2)]
    tip = poly[2]
    body = blank(); sh = blank(); sd = ImageDraw.Draw(sh); sd.rounded_rectangle([ox, oy + 26 * S2, ox + cw, oy + ch + 26 * S2], 44 * S2, fill=(0, 0, 0, 150)); sd.polygon([(p[0], p[1] + 26 * S2) for p in poly], fill=(0, 0, 0, 150))
    body = Image.alpha_composite(body, sh.filter(ImageFilter.GaussianBlur(28 * S2)))
    arr = np.zeros((ch, cw, 4), np.uint8); top, bot = np.array([30, 84, 178]), np.array([10, 36, 104])
    for y in range(ch): arr[y, :, :3] = (top * (1 - y / ch) + bot * (y / ch)).astype(np.uint8); arr[y, :, 3] = 252
    glass = Image.fromarray(arr, 'RGBA'); m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, cw - 1, ch - 1], 44 * S2, fill=255)
    sheen = Image.new('RGBA', (cw, ch), (255, 255, 255, 0)); gd = ImageDraw.Draw(sheen)
    for y in range(ch // 2): gd.line([(0, y), (cw, y)], fill=(255, 255, 255, int(46 * (1 - y / (ch / 2)) ** 1.8)))
    glass = Image.alpha_composite(glass, sheen); body.paste(glass, (ox, oy), m)
    d = ImageDraw.Draw(body)
    d.polygon(poly, fill=(14, 52, 128, 255)); d.line([poly[0], tip, poly[1]], fill=(238, 196, 96, 255), width=3 * S2, joint='curve')
    d.rounded_rectangle([ox, oy, ox + cw, oy + ch], 44 * S2, outline=(238, 196, 96, 255), width=3 * S2)
    xe = ox if side == 'left' else ox + cw; d.line([(xe, by - 52 * S2), (xe, by + 52 * S2)], fill=(14, 52, 128, 255), width=5 * S2)
    d.rounded_rectangle([ox + 12 * S2, oy + 12 * S2, ox + cw - 12 * S2, oy + ch - 12 * S2], 34 * S2, outline=(160, 205, 255, 70), width=1 * S2)
    def tlayer(fn): L = blank(); fn(ImageDraw.Draw(L)); return L
    cf = ImageFont.truetype(NUN, 34 * S2); spaced = '  '.join(topic)
    def topic_fn(g):
        tb = g.textbbox((0, 0), spaced, font=cf); tw = tb[2] - tb[0]; x = w / 2 - tw / 2 - tb[0]; y = oy + 46 * S2 - tb[1]
        g.text((x, y), spaced, font=cf, fill=(244, 200, 92, 255)); g.line([(w / 2 - 60 * S2, y + 66 * S2), (w / 2 + 60 * S2, y + 66 * S2)], fill=(244, 200, 92, 200), width=3 * S2)
    layers = [tlayer(topic_fn)]
    qsz = 76 if CW > 900 else 68; qf = lora(qsz * S2); y = oy + 138 * S2
    for ln in lines:
        def line_fn(g, ln=ln, y=y):
            tb = g.textbbox((0, 0), ln, font=qf); x = w / 2 - (tb[2] - tb[0]) / 2 - tb[0]
            g.text((x + 3 * S2, y - tb[1] + 5 * S2), ln, font=qf, fill=(0, 8, 36, 140)); g.text((x, y - tb[1]), ln, font=qf, fill=(255, 255, 255, 255))
        layers.append(tlayer(line_fn)); y += int(qsz * 1.22) * S2
    hf = ImageFont.truetype(NUN, 32 * S2)
    def hint_fn(g):
        for k in range(n):
            cxk = w / 2 + (k - (n - 1) / 2) * 32 * S2; r = (9 if k == idx else 6) * S2; yy = oy + ch - 38 * S2
            g.ellipse([cxk - r, yy - r, cxk + r, yy + r], fill=(244, 200, 92, 255) if k == idx else (150, 190, 255, 120))
    layers.append(tlayer(hint_fn))
    f = lambda im: np.asarray(im.resize((w // S2, h // S2), Image.LANCZOS), np.float32)
    return f(body), [f(l) for l in layers]
def comp_card(body, layers, alphas):
    out = body.copy()
    for L, a in zip(layers, alphas):
        if a <= 0: continue
        A = (L[..., 3:4] / 255.0) * a; out[..., :3] = out[..., :3] * (1 - A) + L[..., :3] * A; out[..., 3:4] = np.maximum(out[..., 3:4], L[..., 3:4] * a)
    return out
def over(f, rgba, cx, cy, alpha=1.0, scale=1.0):
    if scale != 1.0: rgba = cv2.resize(rgba, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    h, w = rgba.shape[:2]; x0, y0 = int(cx - w / 2), int(cy - h / 2); xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
    if xb <= xa or yb <= ya: return
    r = rgba[ya - y0:yb - y0, xa - x0:xb - x0]; a = r[..., 3:4] / 255.0 * alpha; f[ya:yb, xa:xb] = f[ya:yb, xa:xb] * (1 - a) + r[..., :3][..., ::-1] * a
GOLD = np.float32([110, 200, 255])
def frame(it, t, cardpack, tagbox, total, cardpos):
    body, layers = cardpack; out_k = 1 - ease((t - (total - 0.8)) / 0.8)                                         # exit fade
    d_in = ease(t / 0.8) * out_k
    yy = np.arange(H, dtype=np.float32)[:, None]; vm = np.clip((yy - 330) / 90.0, 0, 1)                      # 0 above the mat (title untouched), 1 on the mat and below
    strength = (0.18 + 0.64 * vm) * d_in                                                                      # title stays bright; the mat and its items recede strongly
    dim = base * (1 - strength[..., None]) + np.float32([26, 10, 4]) * 0.25 * strength[..., None]
    x0, y0, x1, y1 = tagbox; lit = np.zeros((H, W), np.float32); cv2.rectangle(lit, (x0, y0), (x1, y1), 1, -1); lit = cv2.GaussianBlur(lit, (0, 0), 8)[..., None] * d_in
    f = dim * (1 - lit) + base * lit
    T = max(t - 0.3, 0.0); ph = (T % 1.5) / 1.5; beat = (max(0, math.sin(ph * math.pi * 2 / 0.5)) ** 2 if ph < 0.5 else 0.0) * d_in
    mul = 1 + 0.09 * beat; layer, A = place(it, mul)
    # glow + ripple ring
    glow = cv2.GaussianBlur(A, (0, 0), 26) * (0.5 + 0.9 * beat) * d_in + cv2.GaussianBlur(A, (0, 0), 9) * (0.28 + 0.5 * beat) * d_in
    f = f + glow[..., None] * GOLD * 0.9; f = np.clip(f, 0, 255)
    bb = it['bb']; mx0, my0, mx1, my1 = max(bb[0] - 110, 0), max(bb[1] - 110, 0), min(bb[2] + 110, W), min(bb[3] + 110, H)
    sub = (A[my0:my1, mx0:mx1] > 0.5).astype(np.uint8); ring = np.zeros(sub.shape, np.float32)
    for k in range(2):
        rt = ((T - k * 0.18) % 1.5) / 0.9 if T > k * 0.18 else 9
        if rt < 1:
            r = int(8 + 70 * ease(rt)); ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)); dl = cv2.dilate(sub, ker).astype(np.float32); ring = np.maximum(ring, cv2.GaussianBlur(np.clip(dl - cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * max(r - 7, 1) + 1,) * 2)).astype(np.float32), 0, 1), (0, 0), 2.0) * (1 - rt) ** 1.3)
    ra = np.zeros((H, W), np.float32); ra[my0:my1, mx0:mx1] = ring * d_in * 0.95; f = f * (1 - ra[..., None] * 0.7) + ra[..., None] * GOLD * 1.0 * 0.7 + 0 * f
    f = np.clip(f, 0, 255); f = f * (1 - A[..., None]) + layer * A[..., None]
    # sparkles (twinkling four-point stars)
    for (sx, sy, p, sp) in it['sparks']:
        tw = max(0, math.sin(t * 3.2 * sp + p)) ** 3 * d_in
        if tw > 0.05:
            r = int(5 + 9 * tw); col = (190, 240, 255); c = (int(sx), int(sy))
            cv2.line(f, (c[0] - r, c[1]), (c[0] + r, c[1]), col, 2, cv2.LINE_AA); cv2.line(f, (c[0], c[1] - r), (c[0], c[1] + r), col, 2, cv2.LINE_AA); cv2.circle(f, c, 3, (255, 255, 255), -1, cv2.LINE_AA)
    # card: pops up with a soft bounce, text reveals line by line, exits gently
    tk = t - 0.5; pop = back(tk / 0.6); ca = ease(tk / 0.35) * out_k
    al = [ease((t - 1.0) / 0.35)] + [ease((t - 1.3 - 0.3 * k) / 0.4) for k in range(len(layers) - 2)] + [ease((t - 2.3) / 0.5)]
    card = comp_card(body, layers, al); over(f, card, cardpos[0], cardpos[1] + 5 * math.sin(t * 1.5), ca, 0.84 + 0.16 * pop)
    return f
def run(it, topic, lines, idx, tagbox, name, total=7.5):
    bb = it['bb']; left_room = bb[0] - 60 - 90; right_room = 1860 - bb[2] - 60 - 90
    if right_room >= left_room: x0, x1, side = bb[2] + 95, 1860, 'left'       # item on the left of the card
    else: x0, x1, side = 60, bb[0] - 95, 'right'                               # item on the right of the card
    CW, CH = int(x1 - x0), 556; cx = (x0 + x1) / 2; cy = 673
    pack = make_card(topic, lines, '', idx, 7, CW, CH, side, it['cy'] - cy)
    out = os.path.join(HERE, name + '.mp4')
    proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for i in range(int(total * 30)): proc.stdin.write(np.clip(frame(it, i / 30, pack, tagbox, total, (cx, cy)), 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close(); proc.wait()
    cv2.imwrite(os.path.join(HERE, name + '.png'), np.clip(frame(it, 3.7, pack, tagbox, total, (cx, cy)), 0, 255).astype(np.uint8))
import sys
OUT = os.path.join(HERE, '..', 'settle-in')
SPOTS = [  # key, clip, hold, objw, feet, tagbox, topic, lines
 ('saving',   'item1.mp4', 165, 360, (320, 960),  (130, 962, 520, 1026),  'SAVING & INVESTING', ['What is one thing', 'you saved for in', 'the last year?']),
 ('buckets',  'item2.mp4', 150, 360, (320, 640),  (140, 646, 500, 708),   'THE THREE BUCKETS',   ['Which bucket do', 'you fill first when', 'money comes in?']),
 ('risk',     'item3.mp4', 135, 310, (1655, 615), (1520, 620, 1795, 684), 'RISK & RETURN',       ['Would you rather', 'sleep well or', 'earn more?']),
 ('goals',    'item4.mp4', 140, 246, (680, 960),  (590, 962, 775, 1026),  'GOALS',               ['What is one money', 'goal for you', 'this year?']),
 ('time',     'item5.mp4', 170, 360, (1330, 960), (1180, 962, 1480, 1026), 'TIME HORIZON',       ['When do you want', 'your money to start', 'working for you?']),
 ('action',   'item6.mp4', 170, 280, (1705, 965), (1550, 968, 1865, 1032), 'MY ACTION PLAN',     ['What is one small', 'step you could take', 'this week?']),
 ('checklist','item7.mp4', 165, 228, (1000, 960), (865, 962, 1140, 1026), 'MY CHECKLIST',       ['What is one thing on', 'your list you keep', 'postponing?'])]
want = sys.argv[1:] or [x[0] for x in SPOTS]
for n, (key, clip, hold, objw, feet, tagbox, topic, lines) in enumerate(SPOTS):
    if key not in want: continue
    it = load_item(clip, hold, objw, feet, protect=(key == 'checklist'))
    run(it, topic, lines, n, tagbox, '../settle-in/spot-%d-%s' % (n + 1, key))
print('OK', want)
