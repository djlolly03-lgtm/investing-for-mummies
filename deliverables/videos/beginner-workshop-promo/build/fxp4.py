#!/usr/bin/env python3
"""v4: the Flow portfolio clip replaces the tile beat. Retimed so each piece lands on its word
(stocks 20.92 / mutual funds 21.48 / gold 22.12), the hold is squeezed, and the pie completes on 'portfolio' (23.62).
Everything else is fxp3's BEATS.   python fxp4.py still flowpie <T> | render flowpie"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter
import fxp, fxp3
from fxp import W, H, FPS, F, put, eob, prog, ease, clamp, NAVY, CREAM, INK, GOLD, HERE
from fxp2 import sticker, fr_idx

SRC = f"{HERE}/assets/flow_pie.mp4"; CFPS = 24
_f = {}
def clip_frames():
    if "f" not in _f:
        w, h = 360, 640
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        _f["f"] = [Image.frombuffer("RGB", (w, h), raw[k * w * h * 3:(k + 1) * w * h * 3]).copy() for k in range(len(raw) // (w * h * 3))]
    return _f["f"]

def clip_t(T):
    if T < 22.30: return (T - 20.82) * (2.2 / (22.30 - 20.82))
    if T < 22.60: return 2.2 + (T - 22.30) / 0.30 * 2.5
    return 4.7 + (T - 22.60) / (24.75 - 22.60) * 3.3

_up = {}
def frame(T):
    fs = clip_frames(); i = min(len(fs) - 1, max(0, int(round(clip_t(T) * CFPS))))
    if i not in _up:
        _up.clear() if len(_up) > 40 else None
        _up[i] = fs[i].resize((W, H), Image.Resampling.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    return _up[i].convert("RGBA")

def e_flowpie(T, t, D):
    out = frame(T)
    fade12 = 1 - ease(prog(T, 22.45, 22.65))
    for name, ts, x in (("Stocks", 20.92, 0.21), ("Mutual funds", 21.48, 0.50), ("Gold", 22.12, 0.78)):
        k = eob(prog(T, ts, ts + 0.25)) * fade12
        if k > 0: put(out, sticker(name, 44 if len(name) < 8 else 38, fg=CREAM, bg=NAVY, font="b", pad=(22, 10)), x * W, 0.5 * H + 300, k)
    k = eob(prog(T, 23.55, 23.85))
    if k > 0: put(out, sticker("Your portfolio", 72, fg=INK, bg=GOLD, font="serif", pad=(34, 14)), W / 2, 0.5 * H + 560, k)
    return out

BEATS = [b for b in fxp3.BEATS if b[0] != "portfolio"] + [("flowpie", 20.82, 24.75, e_flowpie, {})]
BEATS.sort(key=lambda b: b[1])

def render(name):
    nm, a, b, fn, kw = next(x for x in BEATS if x[0] == name)
    i0, i1 = fr_idx(a), fr_idx(b); n = i1 - i0
    out = f"{HERE}/segs3/{nm}.mp4"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for k in range(n):
        T = (i0 + k) / FPS; p.stdin.write(fn(T, T - i0 / FPS, n / FPS, **kw).convert("RGB").tobytes())
    p.stdin.close(); p.wait(); print("wrote", out, n, "frames")

if __name__ == "__main__":
    if sys.argv[1] == "still":
        T = float(sys.argv[3]); e_flowpie(T, 0, 1).convert("RGB").save(f"{HERE}/stills/v4_flowpie_{T:.2f}.jpg", quality=88); print("still", T)
    else:
        render(sys.argv[2])
