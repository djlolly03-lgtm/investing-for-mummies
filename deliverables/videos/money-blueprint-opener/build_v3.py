#!/usr/bin/env python3
"""Money Blueprint opener v3 (22 Nov 2026) — built from two ChatGPT images of the SAME scene (user: "use the exact pic as the
starting point with a blank blue mat, and have each item animate on it exactly as the image"):
  keyframes/01 landscape cover.png  — the approved cover re-laid out 16:9 (the finished scene)
  keyframes/02 blank mat.png        — the same scene with the mat emptied
Each item is revealed on the blank mat from the finished image (a soft-edged window that opens while the item settles in
from slightly larger), one every ~1.4 s in the cover's own order; the title comes last; the finished scene holds.
No Flow video and no added text: every pixel on screen is from the two ChatGPT images. Silent, 1920x1080, 30 fps.
Usage: ~/.claude/skills/effects/.venv/bin/python build_v3.py -> ./The Money Blueprint - opener v3.mp4"""
import os, subprocess
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, 'keyframes')
OUT = os.path.join(HERE, 'The Money Blueprint - opener v3.mp4'); W, H, FPS = 1920, 1080, 30
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
full = cv2.resize(cv2.imread(os.path.join(K, '01 landscape cover.png')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
blank = cv2.resize(cv2.imread(os.path.join(K, '02 blank mat.png')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
S = W / 1672.0
# (name, box in the 1672x941 image, start time s, duration s) — the cover's own reading order
ITEMS = [('goals',    (385, 262, 625, 480),  1.6, 0.8),
         ('time',     (730, 250, 995, 455),  3.0, 0.8),
         ('risk',     (1095, 270, 1420, 540), 4.4, 0.8),
         ('buckets',  (330, 460, 635, 710),  5.8, 0.8),
         ('saving',   (625, 630, 1020, 850), 7.2, 0.8),
         ('action',   (1160, 525, 1450, 810), 8.6, 0.8),
         ('checklist',(55, 525, 465, 925),   10.0, 0.9),
         ('centre',   (585, 400, 1190, 700), 11.4, 0.9),     # MY MONEY BLUEPRINT label and the dotted arrows
         ('title',    (440, 0, 1230, 255),   12.9, 1.1)]
TOTAL = 18.0; PUSH = 0.045
def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def feather(w, h, f):
    m = np.zeros((h, w), np.float32); m[f:h - f, f:w - f] = 1.0; return cv2.GaussianBlur(m, (0, 0), f / 2.2)

masks = {}
for n, (x0, y0, x1, y1), t0, d in ITEMS:
    x0, y0, x1, y1 = [int(v * S) for v in (x0, y0, x1, y1)]; masks[n] = ((x0, y0, x1, y1), feather(x1 - x0, y1 - y0, 38))
proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
for i in range(round(TOTAL * FPS)):
    t = i / FPS; frame = blank.copy()
    for n, box, t0, d in ITEMS:
        p = ease((t - t0) / d)
        if p <= 0: continue
        (x0, y0, x1, y1), fm = masks[n]; w, h = x1 - x0, y1 - y0
        sc = 1.14 - 0.14 * p                                   # settles in from slightly larger
        M = cv2.getRotationMatrix2D((w / 2, h / 2 - 14 * (1 - p)), 0, sc)
        crop = cv2.warpAffine(full[y0:y1, x0:x1], M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        a = (fm * min(1.0, p * 1.6))[..., None]
        frame[y0:y1, x0:x1] = frame[y0:y1, x0:x1] * (1 - a) + crop * a
    fa = ease((t - 14.2) / 1.6)                                 # blend to the EXACT finished image so the last frame matches it pixel for pixel
    if fa > 0: frame = frame * (1 - fa) + full * fa
    z = 1 + PUSH * ease(t / 11.0) * (1 - ease((t - 11.5) / 3.0))  # a slow push-in while the items arrive, easing back to rest for the hold
    M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z); frame = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
proc.stdin.close(); proc.wait(); print('OK', OUT)
