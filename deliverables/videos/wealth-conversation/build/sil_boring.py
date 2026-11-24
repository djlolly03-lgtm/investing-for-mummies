#!/usr/bin/env python3
"""Silhouette BORING? beat (24 Nov 2026) replacing the 1.1s red-collage (generic frames 568-600). Hiral's silent smile
(MVI_0284 from cam 36.45) becomes a black silhouette: mustard field with BORING?, then NO LECTURES. / NO JARGON. stacked,
then a flip to cream with JUST GAMES. huge behind her head. 2.0s (60 frames), hits every half-time beat (~0.485s).
No talking in this shot, so the silhouette never hides her lips.
  python sil_boring.py still T... (T in seconds into the beat)  |  python sil_boring.py -> $TMP/boring.mp4"""
import os, sys, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, Matte, write, TAKES, TMP, W, H, FPS
from silhouette_type import word, glitch, MUSTARD, CREAM, INK

# v12 (user: "it should start when she says no boring lectures"): starts on "No" (generic 17.80, frame 534) using the
# talking take MVI_0278 (cam = generic - 12.535), words land as she says them, then continues over her silent smile
# (MVI_0284 from 36.45) for NO JARGON. / JUST GAMES. Replaces generic frames 534-600.
NA, NB = 34, 42                 # talking part (to the end of the original H2 shot at 568), silent part
N = NA + NB
CAM_A = 534 / 30 - 12.535
CAM0 = 36.45
YELLOW = [('NO', 0.0, 'big', 70), ('BORING', 0.18, 'huge', 240), ('LECTURES.', 0.52, 'big', 520)]
CREAMW = [('NO JARGON.', NA / 30, 'big', 90), ('JUST', NA / 30 + 0.5, 'big', 290), ('GAMES.', NA / 30 + 0.62, 'huge', 450)]
FLIP = NA / 30 - 0.01


def render(stills=None):
    raw = np.concatenate([frames(f'{TAKES}/MVI_0278.MP4', CAM_A, NA), frames(f'{TAKES}/MVI_0284.MP4', CAM0, NB)])
    words = {w: word(w, k) for w, _, k, _ in YELLOW + CREAMW}
    mt = Matte(); out = []
    idx = [int(round(t * FPS)) for t in stills] if stills else range(N)
    for i in idx:
        t = i / FPS
        m = mt(raw[i]) if stills is None else Matte()(raw[i])
        cream = t >= FLIP
        bg = Image.new('RGB', (W, H), CREAM if cream else MUSTARD).convert('RGBA')
        for w, ts, kind, y in (CREAMW if cream else YELLOW):
            if t < ts: continue
            im = glitch(words[w], max(0.0, 1 - (t - ts) / 0.1), hash(w) + i)
            bg.alpha_composite(im, (48, y))
        base = np.asarray(bg.convert('RGB')).astype(np.float32)
        f = base * (1 - m) + np.array(INK, np.float32) * m
        if stills is not None: Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(f'{TMP}/boring_still_{t:.2f}.png')
        else: out.append(f)
    if stills is None: return write('boring', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still': render([float(x) for x in sys.argv[2:]])
    else: render()
