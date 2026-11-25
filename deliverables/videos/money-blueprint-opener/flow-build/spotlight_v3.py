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
def load_item(clip, hold, objw, feet):
    cap = cv2.VideoCapture(os.path.join(HERE, clip)); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    def key(a):
        dist = np.linalg.norm(a - SCREEN, axis=2); al = np.clip((dist - 70) / 110.0, 0, 1); al[:6] = 0; al[-6:] = 0; al[:, :6] = 0; al[:, -6:] = 0
        b, g, r = a[..., 0], a[..., 1], a[..., 2]; return np.dstack([b, np.minimum(g, np.maximum(r, b) + 25), r]), al
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
CW, CH = 1000, 356; PAD = 110; S2 = 2
def make_card(topic, lines, hint, idx, n, tail_target):
    """returns (body RGBA, [layers RGBA same size]) at 1x; tail_target = (x, y) of the item in frame coords relative to the card centre"""
    w, h = (CW + 2 * PAD) * S2, (CH + 2 * PAD) * S2; ox, oy = PAD * S2, PAD * S2; cw, ch = CW * S2, CH * S2
    def blank(): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
    body = blank()
    # tail geometry (points toward the item from the nearest bottom/left/right spot)
    tx, ty = tail_target; cx0, cy0 = w / 2, h / 2; ang = math.atan2(ty * S2, tx * S2)
    bx = cx0 + max(-cw * 0.36, min(cw * 0.36, tx * S2 * 0.55)); by = oy + ch                               # base on the bottom edge
    tip = (bx + (tx * S2 - (bx - cx0)) * 0.12, by + 78 * S2)
    poly = [(bx - 46 * S2, by - 2 * S2), (bx + 46 * S2, by - 2 * S2), tip]
    sh = blank(); sd = ImageDraw.Draw(sh); sd.rounded_rectangle([ox, oy + 24 * S2, ox + cw, oy + ch + 24 * S2], 40 * S2, fill=(0, 0, 0, 140)); sd.polygon([(p[0], p[1] + 24 * S2) for p in poly], fill=(0, 0, 0, 140))
    body = Image.alpha_composite(body, sh.filter(ImageFilter.GaussianBlur(26 * S2)))
    arr = np.zeros((ch, cw, 4), np.uint8); top, bot = np.array([30, 84, 178]), np.array([10, 36, 104])
    for y in range(ch): arr[y, :, :3] = (top * (1 - y / ch) + bot * (y / ch)).astype(np.uint8); arr[y, :, 3] = 250
    glass = Image.fromarray(arr, 'RGBA'); m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, cw - 1, ch - 1], 40 * S2, fill=255)
    sheen = Image.new('RGBA', (cw, ch), (255, 255, 255, 0)); gd = ImageDraw.Draw(sheen)
    for y in range(ch // 2): gd.line([(0, y), (cw, y)], fill=(255, 255, 255, int(46 * (1 - y / (ch / 2)) ** 1.8)))
    glass = Image.alpha_composite(glass, sheen); body.paste(glass, (ox, oy), m)
    d = ImageDraw.Draw(body)
    d.polygon(poly, fill=(10, 36, 104, 255)); d.line([poly[0], tip, poly[1]], fill=(238, 196, 96, 255), width=3 * S2, joint='curve')
    d.rounded_rectangle([ox, oy, ox + cw, oy + ch], 40 * S2, outline=(238, 196, 96, 255), width=3 * S2)
    d.line([(bx - 44 * S2, by), (bx + 44 * S2, by)], fill=(10, 36, 104, 255), width=5 * S2)                    # hide the border where the tail joins
    d.rounded_rectangle([ox + 10 * S2, oy + 10 * S2, ox + cw - 10 * S2, oy + ch - 10 * S2], 32 * S2, outline=(160, 205, 255, 70), width=1 * S2)
    # text layers
    def tlayer(draw_fn): L = blank(); draw_fn(ImageDraw.Draw(L)); return L
    cf = ImageFont.truetype(NUN, 27 * S2); spaced = '  '.join(topic)                                                  # letter-spaced caps
    def topic_fn(g):
        tb = g.textbbox((0, 0), spaced, font=cf); tw = tb[2] - tb[0]; x = w / 2 - tw / 2 - tb[0]; y = oy + 36 * S2 - tb[1]
        g.text((x, y), spaced, font=cf, fill=(244, 200, 92, 255)); g.line([(w / 2 - 44 * S2, y + 52 * S2), (w / 2 + 44 * S2, y + 52 * S2)], fill=(244, 200, 92, 200), width=2 * S2)
    layers = [tlayer(topic_fn)]
    qf = lora(58 * S2); y = oy + 112 * S2
    for ln in lines:
        def line_fn(g, ln=ln, y=y):
            tb = g.textbbox((0, 0), ln, font=qf); x = w / 2 - (tb[2] - tb[0]) / 2 - tb[0]
            g.text((x + 2 * S2, y - tb[1] + 4 * S2), ln, font=qf, fill=(0, 8, 36, 140)); g.text((x, y - tb[1]), ln, font=qf, fill=(255, 255, 255, 255))
        layers.append(tlayer(line_fn)); y += 70 * S2
    hf = ImageFont.truetype(NUN, 26 * S2)
    def hint_fn(g):
        tb = g.textbbox((0, 0), hint, font=hf); g.text((w / 2 - (tb[2] - tb[0]) / 2 - tb[0], oy + ch - 76 * S2 - tb[1]), hint, font=hf, fill=(176, 214, 255, 255))
        for k in range(n):                                                                                         # progress dots
            cxk = w / 2 + (k - (n - 1) / 2) * 26 * S2; r = (7 if k == idx else 5) * S2; yy = oy + ch - 32 * S2
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
def frame(it, t, cardpack, tagbox, total):
    body, layers = cardpack; out_k = 1 - ease((t - (total - 0.8)) / 0.8)                                         # exit fade
    d_in = ease(t / 0.8) * out_k
    dim = base * (1 - 0.55 * d_in) + np.float32([26, 10, 4]) * 0.22 * d_in
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
    al = [ease((t - 1.0) / 0.35), ease((t - 1.3) / 0.4), ease((t - 1.6) / 0.4), ease((t - 2.1) / 0.5)]
    card = comp_card(body, layers, al); over(f, card, W // 2, 575 + 5 * math.sin(t * 1.5), ca, 0.82 + 0.18 * pop)
    return f
def run(it, topic, lines, idx, tagbox, name, total=7.0):
    tx, ty = it['cx'] - W / 2, 330 - 0                                                                              # target relative to card centre (card sits at y~560)
    pack = make_card(topic, lines, 'Turn to the person next to you', idx, 7, (it['cx'] - W / 2, it["bb"][1] - 575))
    out = os.path.join(HERE, name + '.mp4')
    proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for i in range(int(total * 30)): proc.stdin.write(np.clip(frame(it, i / 30, pack, tagbox, total), 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close(); proc.wait()
    cv2.imwrite(os.path.join(HERE, name + '.png'), np.clip(frame(it, 3.45, pack, tagbox, total), 0, 255).astype(np.uint8))
SAV = load_item('item1.mp4', 165, 360, (320, 960)); TIM = load_item('item5.mp4', 170, 360, (1330, 960))
run(SAV, 'SAVING & INVESTING', ['What is one thing you', 'saved for in the last year?'], 0, (130, 962, 520, 1026), 'spotlight-v3-saving')
run(TIM, 'TIME HORIZON', ['When do you want your money', 'to start working for you?'], 4, (1180, 962, 1480, 1026), 'spotlight-v3-time'); print('OK')
