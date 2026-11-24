#!/usr/bin/env python3
"""Nine-tile beat (24 Nov 2026) on "That's where the wealth conversation begins with the Money Blueprint"
(generic 8.867-12.967s, which was a still group-photo card). Hiral on camera (MVI_0277, cam = generic + 7.357 from
camera-audio xcorr) shrinks into the centre tile of a 3x3 grid while the other eight play real class / seminar clips,
then grows back to full frame for the next shot. No text.
  python grid9.py still T [T...]  |  python grid9.py  -> $TMP/grid.mp4"""
import os, sys, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, grade_fit, grade, write, ease_out, clamp, GEN, TAKES, TMP, W, H, FPS, PROJ

OFF = 7.357
G0, G1 = 266, 389
CLIPS = [248, 283, 358, 356, 357, 360, 169, 145]          # content-hub previews (CLAUDE/content/clips/IFM-NNN.mp4)
NAVY = (26, 58, 92)
TW, TH, GAP, R = 360, 640, 10, 22
T_SHRINK, T_GROW, D = 1.0, 3.6, 0.5                       # seconds into the beat


def ease_inout(p): p = clamp(p); return p * p * (3 - 2 * p)


def rounded(img, r):
    m = Image.new('L', img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0)); out.paste(img, (0, 0), m); return out


def render(stills=None):
    n = G1 - G0
    raw = frames(f'{TAKES}/MVI_0277.MP4', G0 / FPS + OFF, n)
    ab = grade_fit(frames(GEN, 13.3, 15), frames(f'{TAKES}/MVI_0277.MP4', 13.3 + OFF, 15), slice(1000, 1400))
    tiles = []
    for k in CLIPS:
        p = f'{PROJ}/CLAUDE/content/clips/IFM-{k}.mp4'
        dur = float(os.popen(f'/opt/homebrew/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 "{p}"').read())
        m = min(n, int((dur - 1.05) * FPS))
        a = frames(p, 1.0, m, (TW - GAP, TH - GAP))
        if m < n: a = np.concatenate([a, np.repeat(a[-1:], n - m, 0)])
        tiles.append(a)
    cells = [(c, r) for r in range(3) for c in range(3) if (c, r) != (1, 1)]
    out = []
    idx = [int(round(t * FPS)) - G0 for t in stills] if stills else range(n)
    for i in idx:
        t = i / FPS
        g = Image.fromarray(np.clip(grade(raw[i].astype(np.float32), ab), 0, 255).astype(np.uint8))
        if t < T_SHRINK: s = 1.0
        elif t < T_SHRINK + D: s = 1 - (2 / 3) * ease_inout((t - T_SHRINK) / D)
        elif t < T_GROW: s = 1 / 3
        else: s = 1 / 3 + (2 / 3) * ease_inout((t - T_GROW) / D)
        if s >= 0.999:
            f = g
        else:
            canvas = Image.new('RGB', (W, H), NAVY).convert('RGBA')
            vis = clamp(1 - abs(s - 1 / 3) / (2 / 3) * 1.0)            # tiles fully in when Hiral is a tile
            for k, (c, r) in enumerate(cells):
                delay = 0.05 * k
                a = clamp((t - T_SHRINK - 0.15 - delay) / 0.3) if t < T_GROW else clamp(1 - (t - T_GROW) / 0.3)
                if a <= 0: continue
                im = rounded(Image.fromarray(tiles[k][i]), R)
                sc = 0.7 + 0.3 * ease_out(a)
                im = im.resize((int(im.width * sc), int(im.height * sc)), Image.BILINEAR)
                im.putalpha(im.getchannel('A').point(lambda v, q=a: int(v * q)))
                cx, cy = c * TW + TW / 2, r * TH + TH / 2
                canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
            hw, hh = int(W * s - GAP * (1 - s) * 1.5), int(H * s - GAP * (1 - s) * 1.5)
            hi = rounded(g.resize((hw, hh), Image.BILINEAR), int(R * (1 - s) * 1.5))
            canvas.alpha_composite(hi, (int(W / 2 - hw / 2), int(H / 2 - hh / 2)))
            f = canvas.convert('RGB')
        if stills is not None: f.save(f'{TMP}/grid_still_{t:05.2f}.png')
        else: out.append(np.asarray(f).astype(np.float32))
    if stills is None: return write('grid', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still': render([float(x) for x in sys.argv[2:]])
    else: render()
