#!/usr/bin/env python3
"""Spotlight prompt v2: the real item throbs (heartbeat pulse + glow that follows its silhouette) on a dimmed scene; a polished glass card with the question.
Run: ~/.claude/skills/effects/.venv/bin/python spotlight_v2.py -> spotlight-v2-saving.mp4, spotlight-v2-saving.png, spotlight-v2-time.png"""
import os, math, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
base = cv2.imread(os.path.join(HERE, 'money-blueprint-final-frame.png')).astype(np.float32); H, W = base.shape[:2]
SCREEN = np.float32([5, 248, 8])
def load_item(clip, hold, objw, feet):
    cap = cv2.VideoCapture(os.path.join(HERE, clip)); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    f0 = fr[0].astype(np.float32); ff = fr[min(hold, len(fr) - 1)].astype(np.float32)
    def key(a):
        dist = np.linalg.norm(a - SCREEN, axis=2); al = np.clip((dist - 70) / 110.0, 0, 1); al[:6] = 0; al[-6:] = 0; al[:, :6] = 0; al[:, -6:] = 0
        b, g, r = a[..., 0], a[..., 1], a[..., 2]; return np.dstack([b, np.minimum(g, np.maximum(r, b) + 25), r]), al
    c0, a0 = key(f0); c, a = key(ff)
    ys, xs = np.where(a0 > 0.5); X0, X1 = int(np.percentile(xs, 1)), int(np.percentile(xs, 99)); Y1 = int(np.percentile(ys, 99))
    box = (max(X0 - 110, 0), min(X1 + 110, 1280), 0, min(Y1 + 40, 720)); s = objw / (X1 - X0)
    cr = c[box[2]:box[3], box[0]:box[1]]; ac = a[box[2]:box[3], box[0]:box[1]]
    return dict(rgb=cr, a=ac, s=s, feet=feet)
def place(it, scale_mul):
    cr, ac = it['rgb'], it['a']; h, w = cr.shape[:2]; s = it['s'] * scale_mul; nw, nh = int(w * s), int(h * s)
    rgb = cv2.resize(cr, (nw, nh), interpolation=cv2.INTER_AREA); al = cv2.resize(ac, (nw, nh), interpolation=cv2.INTER_AREA)
    TX, TY = it['feet']; x0 = TX - nw // 2; y0 = TY - nh + 10
    layer = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + nw, W), min(y0 + nh, H)
    layer[ya:yb, xa:xb] = rgb[ya - y0:yb - y0, xa - x0:xb - x0]; A[ya:yb, xa:xb] = al[ya - y0:yb - y0, xa - x0:xb - x0]
    return layer, A
# ---------- the polished card (drawn once at 2x and downsampled) ----------
LORA = '/Users/lollyg/Library/Fonts/Lora.ttf'; NUN = '/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf'
def lora(sz):
    f = ImageFont.truetype(LORA, sz)
    try: f.set_variation_by_name('Bold')
    except Exception: pass
    return f
def make_card(topic, lines, hint):
    S = 2; cw, ch = 1000 * S, 330 * S; pad = 60 * S; im = Image.new('RGBA', (cw + 2 * pad, ch + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([pad, pad + 26, pad + cw, pad + ch + 26], 44 * S, fill=(0, 0, 0, 150)); im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(26 * S)))
    # gradient glass body
    body = Image.new('RGBA', (cw, ch)); px = body.load()
    top, bot = np.array([22, 66, 160]), np.array([8, 28, 88])
    arr = np.zeros((ch, cw, 4), np.uint8)
    for y in range(ch): arr[y, :, :3] = (top * (1 - y / ch) + bot * (y / ch)).astype(np.uint8); arr[y, :, 3] = 255
    body = Image.fromarray(arr, 'RGBA'); m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, cw - 1, ch - 1], 44 * S, fill=255)
    gl = Image.new('RGBA', (cw, ch), (255, 255, 255, 0)); gd = ImageDraw.Draw(gl)                      # soft top sheen
    for y in range(ch // 2): gd.line([(0, y), (cw, y)], fill=(255, 255, 255, int(34 * (1 - y / (ch / 2)) ** 1.6)))
    body = Image.alpha_composite(body, gl); im.paste(body, (pad, pad), m)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([pad, pad, pad + cw, pad + ch], 44 * S, outline=(238, 196, 96, 255), width=3 * S)               # gold hairline
    d.rounded_rectangle([pad + 10 * S, pad + 10 * S, pad + cw - 10 * S, pad + ch - 10 * S], 36 * S, outline=(140, 190, 255, 90), width=1 * S)
    # topic chip
    cf = ImageFont.truetype(NUN, 30 * S); tb = d.textbbox((0, 0), topic, font=cf); tw = tb[2] - tb[0]; chw, chh = tw + 56 * S, 52 * S
    cx0 = pad + cw // 2 - chw // 2; cy0 = pad + 34 * S
    d.rounded_rectangle([cx0, cy0, cx0 + chw, cy0 + chh], chh // 2, fill=(244, 200, 92, 255))
    d.text((cx0 + chw / 2 - tw / 2 - tb[0], cy0 + chh / 2 - (tb[3] - tb[1]) / 2 - tb[1]), topic, font=cf, fill=(18, 36, 80, 255))
    # question (serif)
    qf = lora(60 * S); y = pad + 118 * S
    for ln in lines:
        tb = d.textbbox((0, 0), ln, font=qf); x = pad + cw / 2 - (tb[2] - tb[0]) / 2 - tb[0]
        d.text((x + 2 * S, y - tb[1] + 3 * S), ln, font=qf, fill=(0, 10, 40, 150))
        d.text((x, y - tb[1]), ln, font=qf, fill=(255, 255, 255, 255)); y += 74 * S
    hf = ImageFont.truetype(NUN, 28 * S); tb = d.textbbox((0, 0), hint, font=hf)
    d.text((pad + cw / 2 - (tb[2] - tb[0]) / 2 - tb[0], pad + ch - 54 * S - tb[1]), hint, font=hf, fill=(176, 214, 255, 255))
    return np.asarray(im.resize((im.width // S, im.height // S), Image.LANCZOS), np.float32)
def over(f, rgba, cx, cy, alpha=1.0):
    h, w = rgba.shape[:2]; x0, y0 = int(cx - w / 2), int(cy - h / 2); xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
    r = rgba[ya - y0:yb - y0, xa - x0:xb - x0]; a = r[..., 3:4] / 255.0 * alpha; f[ya:yb, xa:xb] = f[ya:yb, xa:xb] * (1 - a) + r[..., :3][..., ::-1] * a
def frame(it, t, card, tagbox):
    ease = lambda x: 1 - (1 - min(max(x, 0.0), 1.0)) ** 3
    d_in = ease(t / 0.8)                                                                       # dim fades in
    dim = base * (1 - 0.62 * d_in) + np.float32([26, 10, 4]) * 0.25 * d_in
    # keep the item's own tag lit
    x0, y0, x1, y1 = tagbox; lit = np.zeros((H, W), np.float32); cv2.rectangle(lit, (x0, y0), (x1, y1), 1, -1); lit = cv2.GaussianBlur(lit, (0, 0), 8)[..., None] * d_in
    f = dim * (1 - lit) + base * lit
    # heartbeat throb: two quick beats then rest
    ph = (t % 1.5) / 1.5; beat = max(0, math.sin(ph * math.pi * 2 * 1.0 / 0.52)) ** 2 if ph < 0.52 else 0.0
    mul = 1 + 0.07 * beat * d_in; layer, A = place(it, mul)
    # glow that follows the item's silhouette
    glow = cv2.GaussianBlur(A, (0, 0), 22) * (0.45 + 0.75 * beat) * d_in; glow2 = cv2.GaussianBlur(A, (0, 0), 8) * (0.25 + 0.4 * beat) * d_in
    col = np.float32([120, 205, 255])                                                           # warm gold (BGR)
    f = f + (glow + glow2)[..., None] * col * 0.9; f = np.clip(f, 0, 255)
    f = f * (1 - A[..., None]) + layer * A[..., None]
    # card: fades in at 0.5 s, floats very slightly
    ca = ease((t - 0.5) / 0.7); cy = 585 + 6 * math.sin(t * 1.6) + (1 - ca) * 18
    over(f, card, W // 2, cy, ca)
    return f
SAV = load_item('item1.mp4', 165, 360, (320, 960)); TIM = load_item('item5.mp4', 170, 360, (1330, 960))
card_s = make_card('SAVING & INVESTING', ['What is one thing you', 'saved for in the last year?'], 'Turn to the person next to you')
card_t = make_card('TIME HORIZON', ['When do you want your money', 'to start working for you?'], 'Turn to the person next to you')
out = os.path.join(HERE, 'spotlight-v2-saving.mp4')
proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
for i in range(30 * 6): proc.stdin.write(np.clip(frame(SAV, i / 30, card_s, (130, 962, 520, 1026)), 0, 255).astype(np.uint8).tobytes())
proc.stdin.close(); proc.wait()
cv2.imwrite(os.path.join(HERE, 'spotlight-v2-saving.png'), np.clip(frame(SAV, 3.0 + 0.2, card_s, (130, 962, 520, 1026)), 0, 255).astype(np.uint8))
cv2.imwrite(os.path.join(HERE, 'spotlight-v2-time.png'), np.clip(frame(TIM, 3.0 + 0.2, card_t, (1180, 962, 1480, 1026)), 0, 255).astype(np.uint8)); print('OK')
