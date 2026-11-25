#!/usr/bin/env python3
"""Beat 2: the 'MY MONEY BLUEPRINT' note drops onto the locked Flow base frame, then seven hand-drawn dotted gold arrows grow out
one by one (uneven lengths/curves), dots keep flowing. Camera and title are the untouched base-v3 pixels.
Run: ~/.claude/skills/effects/.venv/bin/python label_arrows.py -> beat2.mp4 + beat2-sheet.png"""
import os, math, subprocess, random
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
W, H, FPS = 1920, 1080, 30; S = W / 1376.0
base = cv2.resize(cv2.imread(os.path.join(HERE, 'base-v3.png')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def bounce(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3 if x < 0.7 else 1 - 0.07 * math.sin((x - 0.7) / 0.3 * math.pi)

# --- the glowing blue-glass panel (RGBA), drawn once ---
NW, NH = 430, 190; PAD = 40
panel = Image.new('RGBA', (NW + 2 * PAD, NH + 2 * PAD), (0, 0, 0, 0)); d = ImageDraw.Draw(panel)
R = 26
d.rounded_rectangle([PAD, PAD, PAD + NW, PAD + NH], R, fill=(14, 48, 128, 235))
grad = Image.new('L', panel.size, 0); gd = ImageDraw.Draw(grad)
for y in range(NH): gd.line([(PAD, PAD + y), (PAD + NW, PAD + y)], fill=int(70 * (1 - y / NH)))     # lighter glass at the top
gm = Image.new('L', panel.size, 0); ImageDraw.Draw(gm).rounded_rectangle([PAD, PAD, PAD + NW, PAD + NH], R, fill=255)
panel.paste((120, 190, 255, 255), (0, 0), Image.fromarray((np.asarray(grad, np.float32) * np.asarray(gm, np.float32) / 255).astype(np.uint8)))
d.rounded_rectangle([PAD, PAD, PAD + NW, PAD + NH], R, outline=(150, 235, 255, 255), width=5)
d.rounded_rectangle([PAD + 12, PAD + 12, PAD + NW - 12, PAD + NH - 12], R - 8, outline=(110, 180, 255, 150), width=2)
FB = [f for f in ['/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'] if os.path.exists(f)][0]
font = ImageFont.truetype(FB, 62)
for k, line in enumerate(['MY MONEY', 'BLUEPRINT']):
    bb = d.textbbox((0, 0), line, font=font); d.text((PAD + (NW - (bb[2] - bb[0])) / 2 - bb[0], PAD + 24 + k * 76 - bb[1]), line, font=font, fill=(255, 255, 255, 255))
note = np.asarray(panel, np.float32)
EDGE = np.asarray(panel.filter(ImageFilter.GaussianBlur(14)), np.float32)[..., 3] / 255.0
NOTE_C = (int(690 * S), int(398 * S))                                              # note centre on the mat

# --- arrows: (target on the 1376 base, bend, start delay s, grow s) — deliberately uneven ---
ARR_ALL = [((450, 650), 0.10, 1.7, 0.9), ((235, 515), -0.12, 1.95, 1.4), ((335, 372), 0.28, 2.35, 1.2), ((715, 345), -0.18, 2.70, 0.9),
       ((1015, 385), 0.15, 3.05, 1.3), ((1125, 575), -0.26, 3.45, 1.0), ((880, 650), 0.10, 3.80, 1.1)]
ARR = ARR_ALL[:int(os.environ.get('NARR','1'))]
GOLD = (60, 190, 245)  # BGR gold
def bez(p0, p1, p2, t): return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
ARRP = []
for (tx, ty), bend, t0, dur in ARR:
    tgt = (tx * S, ty * S); c = NOTE_C; v = (tgt[0] - c[0], tgt[1] - c[1]); L = math.hypot(*v); u = (v[0] / L, v[1] / L)
    # start where the line leaves the note's edge (ellipse-ish)
    ex = (NW / 2 + 20) * abs(u[0]) + (NH / 2 + 18) * abs(u[1]); r0 = 1.0 / max(abs(u[0]) / (NW / 2 + 22), abs(u[1]) / (NH / 2 + 20), 1e-6)
    p0 = (c[0] + u[0] * r0, c[1] + u[1] * r0); end = (tgt[0] - u[0] * 20, tgt[1] - u[1] * 20)
    nrm = (-u[1], u[0]); mid = ((p0[0] + end[0]) / 2 + nrm[0] * bend * L, (p0[1] + end[1]) / 2 + nrm[1] * bend * L)
    ARRP.append((p0, mid, end, t0, dur))
def draw_arrows(layer, t):
    for p0, p1, p2, t0, dur in ARRP:
        k = ease((t - t0) / dur)
        if k <= 0: continue
        n = 120; pl = [bez(p0, p1, p2, i / (n - 1)) for i in range(n)]
        seg = [math.hypot(pl[i + 1][0] - pl[i][0], pl[i + 1][1] - pl[i][1]) for i in range(n - 1)]; tot = sum(seg); cum = np.cumsum([0] + seg)
        spacing = 31.0; flow = (t * 46.0) % spacing; s = flow
        while s <= tot * k:
            i = min(int(np.searchsorted(cum, s)), n - 1); px, py = pl[i]
            fade = 1.0 if s > 50 else s / 50.0; rad = 9.0 - 3.0 * (s / tot)
            cv2.circle(layer, (int(px), int(py)), int(round(rad)), GOLD + (int(255 * fade),), -1, cv2.LINE_AA); s += spacing
        if k > 0.97:                                                                   # arrowhead
            e = pl[-1]; b = pl[-6]; ang = math.atan2(e[1] - b[1], e[0] - b[0]); hl = 42
            a1 = (e[0] - hl * math.cos(ang - 0.45), e[1] - hl * math.sin(ang - 0.45)); a2 = (e[0] - hl * math.cos(ang + 0.45), e[1] - hl * math.sin(ang + 0.45))
            cv2.fillPoly(layer, [np.int32([e, a1, a2])], GOLD + (255,), cv2.LINE_AA)
def over(frame, rgba, x0, y0):
    h, w = rgba.shape[:2]; xa, ya = max(x0, 0), max(y0, 0); xb, yb = min(x0 + w, W), min(y0 + h, H)
    if xb <= xa or yb <= ya: return
    r = rgba[ya - y0:yb - y0, xa - x0:xb - x0]; a = r[..., 3:4] / 255.0; frame[ya:yb, xa:xb] = frame[ya:yb, xa:xb] * (1 - a) + r[..., :3][..., ::-1] * a

TOTAL = 4.2; out = os.path.join(HERE, 'beat2.mp4')
proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
sheet = []
for i in range(round(TOTAL * FPS)):
    t = i / FPS; f = base.copy()
    # arrows under the note
    lay = np.zeros((H, W, 4), np.float32); draw_arrows(lay, t)
    glow = cv2.GaussianBlur(lay, (0, 0), 9); gA = glow[..., 3:4] / 255.0 * 0.55; f = f * (1 - gA) + glow[..., :3] * gA
    a = lay[..., 3:4] / 255.0; f = f * (1 - a) + lay[..., :3] * a
    # note: drops from above with a bounce, tiny rotation, soft contact shadow
    k = bounce((t - 0.4) / 0.9)
    if t > 0.4:
        drop = (1 - k) * -200; sc = 1.0 + 0.10 * (1 - ease((t - 0.4) / 0.9)); ang = -1.0 + 0.8 * (1 - k)
        M = cv2.getRotationMatrix2D((note.shape[1] / 2, note.shape[0] / 2), ang, sc); n2 = cv2.warpAffine(note, M, (note.shape[1], note.shape[0]), flags=cv2.INTER_LINEAR)
        # shadow
        sh = np.zeros((H, W), np.float32); cx, cy = NOTE_C; sa = 0.20 + 0.25 * ease((t - 0.4) / 0.9); sp = 3 + 30 * (1 - k)
        cv2.ellipse(sh, (cx + 6, int(cy + 6 + 88)), (int(NW / 2 + sp), int(NH / 2 * 0.45 + sp * 0.6)), 0, 0, 360, 1.0, -1); sh = cv2.GaussianBlur(sh, (0, 0), 14 + 16 * (1 - k)) * sa
        f = f * (1 - sh[..., None]) + np.float32([10, 20, 45]) * sh[..., None]
        pulse = 0.85 + 0.15 * math.sin(t * 3.0); glowA = (0.30 + 0.10 * ease((t - 1.0) / 0.8)) * pulse * ease((t - 0.6) / 0.7)
        gl = np.zeros((H, W), np.float32); gx, gy = int(cx - note.shape[1] / 2), int(cy - note.shape[0] / 2 + drop)
        ya, yb = max(gy, 0), min(gy + note.shape[0], H); xa, xb = max(gx, 0), min(gx + note.shape[1], W)
        gl[ya:yb, xa:xb] = cv2.resize(EDGE, (note.shape[1], note.shape[0]))[ya - gy:yb - gy, xa - gx:xb - gx]
        gl = cv2.GaussianBlur(gl, (0, 0), 26) * 2.2 * glowA; f = f + gl[..., None] * np.float32([255, 205, 120]) * 0.55          # cyan bloom (BGR)
        f = np.clip(f, 0, 255)
        over(f, n2, int(cx - n2.shape[1] / 2), int(cy - n2.shape[0] / 2 + drop))
    fr = np.clip(f, 0, 255).astype(np.uint8); proc.stdin.write(fr.tobytes())
    if i in (0, 24, 54, 84, 112, 150, 185): sheet.append(cv2.resize(fr, (688, 387)))
proc.stdin.close(); proc.wait()
rows = [np.hstack(sheet[j:j + 2] + ([np.zeros_like(sheet[0])] if len(sheet[j:j + 2]) < 2 else [])) for j in range(0, len(sheet), 2)]
cv2.imwrite(os.path.join(HERE, 'beat2-sheet.png'), np.vstack(rows)); print('OK', out)
