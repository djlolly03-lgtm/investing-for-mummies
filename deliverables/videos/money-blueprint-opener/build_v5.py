#!/usr/bin/env python3
"""Money Blueprint opener v5 (22 Nov 2026) — built on the APPROVED cover itself (user: "the icons + colours here vs what you're
building are very different ... each item one at a time, animate, and stay ... stick to the image as the final items").
Every item on screen is lifted from the approved cover (deliverables/images/money-blueprint-covers/Money Blueprint cover - v1
premium 3D.png) and animates onto a blank version of that same cover scene (keyframes/p01) — nothing is redrawn.
Compounding and Inflation are dropped. Sequence: the original Wealth Conversation wordmark -> "Module 1 / The Money Blueprint"
in a fun script over the closed scroll (keyframes/p02) -> the scroll opens -> MY MONEY BLUEPRINT in the centre -> its arrows and
items land one by one and STAY: Saving & Investing, The Three Buckets, Risk & Return, Goals, Time Horizon, My Action Plan, My
Checklist -> the title, subtitle and name line -> the finished cover, exactly, held. Landscape 1920x1080, silent.
The cover is portrait A4, so the scene sits full-height in the middle with its own blurred edge filling the sides.
Run: ~/.claude/skills/effects/.venv/bin/python build_v5.py -> ./The Money Blueprint - opener v5.mp4"""
import os, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, 'keyframes')
COVER = '/Users/lollyg/Documents/investing for Mummies/deliverables/images/money-blueprint-covers/Money Blueprint cover - v1 premium 3D.png'
BRAND = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/LOGO testing/Wealth Conversation to IFM Logo.mp4'
OUT = os.path.join(HERE, 'The Money Blueprint - opener v5.mp4'); TMP = os.path.join(HERE, '_main_v5.mp4')
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
W, H, FPS = 1920, 1080, 30; PH = 1080; PW = round(1086 * PH / 1448); PX = (W - PW) // 2; Z = PH / 1448.0   # the scene's slot
NAVY = (18, 37, 68)
def rd(p, size=(1086, 1448)): return cv2.resize(cv2.imread(p), size, interpolation=cv2.INTER_LANCZOS4)
cover = rd(COVER).astype(np.float32); blank0 = rd(os.path.join(K, 'p01 blank cover.png')); scroll = rd(os.path.join(K, 'p02 closed scroll.png')).astype(np.float32)

def match_mat(blank, ref):
    """grade the blank mat to the approved cover's lighter blue: match mean/std in LAB over the mat pixels, using clean mat patches of the cover"""
    lab_b = cv2.cvtColor(blank, cv2.COLOR_BGR2LAB).astype(np.float32); lab_r = cv2.cvtColor(ref.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
    patches = [(690, 905, 790, 990), (430, 1005, 640, 1055), (80, 470, 170, 540), (930, 940, 985, 990)]
    rs = np.concatenate([lab_r[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in patches])
    hsv = cv2.cvtColor(blank, cv2.COLOR_BGR2HSV); yy = np.arange(blank.shape[0])[:, None]
    mb = (hsv[..., 0] >= 100) & (hsv[..., 0] <= 130) & (hsv[..., 1] > 130) & (hsv[..., 2] > 90) & (yy > 360) & (yy < 1160)   # the deep-blue mat only (not the pale sky or the desk)
    mb = cv2.morphologyEx(mb.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    bs = lab_b[mb]; out = lab_b.copy()
    for c in range(3): out[..., c] = np.where(mb, (lab_b[..., c] - bs[:, c].mean()) * (rs[:, c].std() / max(bs[:, c].std(), 1e-3)) * 0.9 + rs[:, c].mean(), lab_b[..., c])
    g = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    soft = cv2.GaussianBlur(mb.astype(np.float32), (0, 0), 3)[..., None]; return blank.astype(np.float32) * (1 - soft) + g * soft
blank = match_mat(blank0, cover)

def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def back(x, s=1.5): x = min(max(x, 0.0), 1.0); x -= 1; return x * x * ((s + 1) * x + s) + 1
def feather(w, h, f):
    m = np.zeros((h, w), np.float32); m[f:h - f, f:w - f] = 1.0; return cv2.GaussianBlur(m, (0, 0), f / 2.2)

# item boxes on the cover (1086x1448): each holds the real icon, its torn-paper label and the dotted arrow that leads to it
ITEMS = [('centre',   (398, 582, 768, 768),  8.6),
         ('saving',   (350, 758, 662, 1030), 9.8),
         ('buckets',  (92, 586, 428, 866),   11.0),
         ('risk',     (722, 405, 1012, 694), 12.2),
         ('goals',    (172, 392, 448, 632),  13.4),
         ('time',     (452, 330, 692, 618),  14.6),
         ('action',   (712, 698, 1022, 966), 15.8),
         ('checklist',(0, 850, 432, 1292),   17.0),
         ('title',    (232, 12, 848, 306),   18.4),
         ('footer',   (180, 1276, 872, 1424), 19.2)]
DUR = 0.8; MS = {}
for n, (x0, y0, x1, y1), t0 in ITEMS: MS[n] = ((x0, y0, x1, y1), feather(x1 - x0, y1 - y0, 26))

# the fun-script module announcement (SignPainter), over the closed scroll's clear sky
def script_card(lines):
    im = Image.new('RGBA', (1086, 1448), (0, 0, 0, 0)); d = ImageDraw.Draw(im); heights = []
    for text, f in lines: bb = d.textbbox((0, 0), text, font=f); heights.append(bb[3] - bb[1])
    y = 120 - sum(heights) / 2 + 40; sh = Image.new('L', im.size, 0); ds = ImageDraw.Draw(sh); pos = []
    for (text, f), h in zip(lines, heights):
        bb = d.textbbox((0, 0), text, font=f); x = (1086 - (bb[2] - bb[0])) / 2 - bb[0]; pos.append((text, f, x, y - bb[1])); ds.text((x + 4, y - bb[1] + 7), text, font=f, fill=110); y += h + 20
    im.paste((10, 18, 30, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    for text, f, x, yy in pos:
        d.text((x, yy), text, font=f, fill=NAVY + (255,), stroke_width=6, stroke_fill=(255, 255, 255, 255)); d.text((x, yy), text, font=f, fill=NAVY + (255,))
    return np.asarray(im, np.float32)
SP = '/System/Library/Fonts/Supplemental/SignPainter.ttc'
ANNOUNCE = script_card([('Module 1', ImageFont.truetype(SP, 70, index=1)), ('The Money Blueprint', ImageFont.truetype(SP, 128, index=1))])

# the slot's surround: the finished cover, blown up, blurred and softened, so the sides belong to the same picture
bg = cv2.resize(cv2.imread(COVER), (W, int(1448 * W / 1086)), interpolation=cv2.INTER_AREA); bg = bg[(bg.shape[0] - H) // 2:(bg.shape[0] - H) // 2 + H]
bg = cv2.GaussianBlur(bg, (0, 0), 34).astype(np.float32) * 0.78 + 14
def to_slot(img):
    return cv2.resize(img, (PW, PH), interpolation=cv2.INTER_AREA)
def put_slot(scene):
    f = bg.copy(); f[:, PX:PX + PW] = to_slot(scene)
    e = 18; ramp = np.linspace(0, 1, e, dtype=np.float32)[None, :, None]                       # soften the slot's two vertical edges
    f[:, PX:PX + e] = bg[:, PX:PX + e] * (1 - ramp) + f[:, PX:PX + e] * ramp
    f[:, PX + PW - e:PX + PW] = f[:, PX + PW - e:PX + PW] * (1 - ramp[:, ::-1]) + bg[:, PX + PW - e:PX + PW] * ramp[:, ::-1]
    return f

TOTAL = 24.0
proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', TMP], stdin=subprocess.PIPE)
xs = np.arange(1086, dtype=np.float32)[None, :, None]
for i in range(round(TOTAL * FPS)):
    t = i / FPS
    op = ease((t - 6.2) / 1.8); half = op * (543 + 90)                                      # the scroll opens from the middle outwards
    wipe = np.clip((half - np.abs(xs - 543)) / 90.0, 0, 1)
    sc = scroll * (1 - wipe) + blank * wipe
    for n, box, t0 in ITEMS:
        p = ease((t - t0) / DUR)
        if p <= 0: continue
        (x0, y0, x1, y1), fm = MS[n]; w, h = x1 - x0, y1 - y0
        M = cv2.getRotationMatrix2D((w / 2, h / 2 - 16 * (1 - p)), 0, 0.82 + 0.18 * back((t - t0) / DUR))   # lands with a little overshoot, then stays
        crop = cv2.warpAffine(cover[y0:y1, x0:x1], M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        a = (fm * min(1.0, p * 1.5))[..., None]; sc[y0:y1, x0:x1] = sc[y0:y1, x0:x1] * (1 - a) + crop * a
    fa = ease((t - 20.2) / 1.2)                                                             # settle onto the EXACT approved cover
    if fa > 0: sc = sc * (1 - fa) + cover * fa
    # module announcement over the closed scroll
    a_in = ease((t - 3.9) / 0.7) * (1 - ease((t - 6.0) / 0.6))
    if a_in > 0:
        sh = np.float32([[1, 0, 0], [0, 1, -30 * (1 - ease((t - 3.9) / 0.7))]]); c = cv2.warpAffine(ANNOUNCE, sh, (1086, 1448)); al = c[..., 3:4] / 255.0 * a_in
        sc = sc * (1 - al) + c[..., 2::-1] * al
    frame = put_slot(sc)
    proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
proc.stdin.close(); proc.wait()
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-t', '3.4', '-i', BRAND, '-i', TMP, '-filter_complex',
                f'[0:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[a];[1:v]fps={FPS},setsar=1,format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.8:offset=2.6[v]',
                '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], check=True)
print('OK', OUT)
