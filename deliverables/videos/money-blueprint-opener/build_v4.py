#!/usr/bin/env python3
"""Money Blueprint opener v4 (22 Nov 2026), from the user's brief: open on the ORIGINAL "The Wealth Conversation" brand name,
announce the module in a fun script, the Money Blueprint scroll opens, "THE MONEY BLUEPRINT" sits in the middle and arrows
go out to Saving vs Investing, the three buckets, compounding, inflation, risk & return, goals, time horizon; no checklist;
ends on the title. All pictures are ChatGPT images of one scene (keyframes/03 closed scroll, 02 blank mat, 04 hub scene);
each topic is lifted out of the finished hub image onto the blank mat. Only the script titles are set here.
Silent, 1920x1080, 30 fps.  Run: ~/.claude/skills/effects/.venv/bin/python build_v4.py -> ./The Money Blueprint - opener v4.mp4"""
import os, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, 'keyframes')
OUT = os.path.join(HERE, 'The Money Blueprint - opener v4.mp4'); TMP = os.path.join(HERE, '_main_v4.mp4')
BRAND = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/LOGO testing/Wealth Conversation to IFM Logo.mp4'
W, H, FPS = 1920, 1080, 30; S = W / 1672.0
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
def load(n): return cv2.resize(cv2.imread(os.path.join(K, n)), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
scroll, blank, hub = load('03 closed scroll.png'), load('02 blank mat.png'), load('04 hub scene.png')
NAVY, GOLD_A, GOLD_B = (18, 37, 68), (236, 176, 52), (200, 136, 28)
SCRIPT = ImageFont.truetype('/System/Library/Fonts/Supplemental/SignPainter.ttc', 150, index=1)
SMALL = ImageFont.truetype('/System/Library/Fonts/Supplemental/SignPainter.ttc', 76, index=1)

def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def feather(w, h, f):
    m = np.zeros((h, w), np.float32); m[f:h - f, f:w - f] = 1.0; return cv2.GaussianBlur(m, (0, 0), f / 2.2)
def script_card(lines, big):
    """fun-script text, navy with a white edge and soft shadow, plus a gold brush sweep; returns an RGBA float image (full frame)"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
    for text, font in lines:
        bb = d.textbbox((0, 0), text, font=font); y_ = bb[3] - bb[1]; y += y_ + 26
    total = y; top = (big - total) / 2; yy = top
    sh = Image.new('L', (W, H), 0); ds = ImageDraw.Draw(sh)
    for text, font in lines:
        bb = d.textbbox((0, 0), text, font=font); x = (W - (bb[2] - bb[0])) / 2 - bb[0]
        ds.text((x + 5, yy - bb[1] + 9), text, font=font, fill=110)
        yy += bb[3] - bb[1] + 26
    im.paste((10, 18, 30, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(10)))
    yy = top
    for text, font in lines:
        bb = d.textbbox((0, 0), text, font=font); x = (W - (bb[2] - bb[0])) / 2 - bb[0]
        d.text((x, yy - bb[1]), text, font=font, fill=NAVY + (255,), stroke_width=7, stroke_fill=(255, 255, 255, 255))
        d.text((x, yy - bb[1]), text, font=font, fill=NAVY + (255,)); yy += bb[3] - bb[1] + 26
    return im
# the module announcement (over the closed scroll) and the end title (over the finished hub's clear top)
ANNOUNCE = script_card([('Module 1', SMALL), ('The Money Blueprint', SCRIPT)], 520)
END_FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/SignPainter.ttc', 128, index=1)   # fits between the plant/mug and the pen cup
END = script_card([('The Money Blueprint', END_FONT)], 290)
def paste(frame, card, y_off, alpha, sweep=0.0):
    if alpha <= 0: return frame
    M = np.float32([[1, 0, 0], [0, 1, y_off]]); c = cv2.warpAffine(np.asarray(card, np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    a = (c[..., 3:4] / 255.0) * alpha; frame = frame * (1 - a) + c[..., 2::-1] * a
    return frame
def gold_sweep(frame, k, cx, y, L):
    if k <= 0: return frame
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); n = 240
    for i in range(int(n * k)):
        x = -1 + 2 * i / (n - 1); t = (1 - abs(x) ** 1.4) * 11 + 2; c = i / (n - 1)
        col = tuple(int(GOLD_A[j] * (1 - c) + GOLD_B[j] * c) for j in range(3)) + (255,)
        px = cx + x * L / 2; py = y - (1 - x * x) * 9 + x * 4; d.ellipse([px - t, py - t * 0.62, px + t, py + t * 0.62], fill=col)
    c = np.asarray(im, np.float32); a = c[..., 3:4] / 255.0; return frame * (1 - a) + c[..., 2::-1] * a

# topics, in the user's order; each box (1672-wide image coords) holds the icon, its label and the arrow that leads to it
TOPICS = [('centre',  (630, 470, 1060, 625),  8.0, 0.9),
          ('saving',  (1045, 462, 1445, 675), 9.2, 0.9),
          ('buckets', (220, 455, 645, 685),   10.4, 0.9),
          ('compound',(920, 610, 1295, 845),  11.6, 0.9),
          ('inflation',(385, 625, 760, 850),  12.8, 0.9),
          ('risk',    (1000, 235, 1325, 495), 14.0, 0.9),
          ('goals',   (385, 255, 690, 495),   15.2, 0.9),
          ('time',    (715, 225, 965, 495),   16.4, 0.9)]
masks = {}
for n, (x0, y0, x1, y1), t0, d in TOPICS:
    b = [int(v * S) for v in (x0, y0, x1, y1)]; masks[n] = (b, feather(b[2] - b[0], b[3] - b[1], 36))
TOTAL = 23.0
proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', TMP], stdin=subprocess.PIPE)
xs = np.arange(W, dtype=np.float32)[None, :, None]
for i in range(round(TOTAL * FPS)):
    t = i / FPS
    # the scroll opens (t 6.0-7.6): the blank mat is revealed from the middle outwards over the closed scroll
    op = ease((t - 6.0) / 1.7); half = op * (W / 2 + 160)
    wipe = np.clip((half - np.abs(xs - W / 2)) / 160.0, 0, 1)
    frame = scroll * (1 - wipe) + blank * wipe
    for n, box, t0, d in TOPICS:
        p = ease((t - t0) / d)
        if p <= 0: continue
        (x0, y0, x1, y1), fm = masks[n]; w, h = x1 - x0, y1 - y0
        M = cv2.getRotationMatrix2D((w / 2, h / 2 - 14 * (1 - p)), 0, 1.14 - 0.14 * p)
        crop = cv2.warpAffine(hub[y0:y1, x0:x1], M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        a = (fm * min(1.0, p * 1.6))[..., None]; frame[y0:y1, x0:x1] = frame[y0:y1, x0:x1] * (1 - a) + crop * a
    fa = ease((t - 17.6) / 1.4)                                    # settle onto the EXACT finished hub image
    if fa > 0: frame = frame * (1 - fa) + hub * fa
    # the module announcement over the closed scroll: drops in at 3.7, leaves as the scroll opens
    a_in = ease((t - 3.7) / 0.7) * (1 - ease((t - 5.9) / 0.6))
    frame = paste(frame, ANNOUNCE, -40 * (1 - ease((t - 3.7) / 0.7)), a_in)
    # the end title over the clear top of the finished scene
    a_e = ease((t - 18.6) / 0.8)
    frame = paste(frame, END, -30 * (1 - a_e), a_e)
    frame = gold_sweep(frame, ease((t - 19.5) / 0.7), W / 2, 228, 560) if t > 19.5 else frame
    z = 1 + 0.04 * ease(t / 17.0) * (1 - ease((t - 17.0) / 2.5))   # gentle push while it builds, back to rest for the hold
    M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z); frame = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
proc.stdin.close(); proc.wait()
# the brand intro: the original Wealth Conversation wordmark animation (first 3.4 s), crossfaded into the scroll scene
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-t', '3.4', '-i', BRAND, '-i', TMP, '-filter_complex',
                f'[0:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[a];[1:v]fps={FPS},setsar=1,format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.8:offset=2.6[v]',
                '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], check=True)
print('OK', OUT)
