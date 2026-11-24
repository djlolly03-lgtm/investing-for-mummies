#!/usr/bin/python3
"""Rebuild Hiral's voice-only stem for the generic TWC cut, so the music can be replaced.
Each phone-VO chunk used by assemble6Bn.py is processed the same way (highpass 90 + afftdn + loudnorm -18),
located in the finished mix by cross-correlation, and level-matched to the mix by least squares.
Writes voice.wav (48 kHz stereo, same timeline as TWC Money Blueprint.mp4)."""
import os, sys, subprocess, numpy as np
FF = '/opt/homebrew/bin/ffmpeg'
HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(os.path.dirname(HERE), 'TWC Money Blueprint.mp4')
VO = os.environ['VO']                      # folder with the unzipped phone recordings (Drive 19iiLlv_.../VO's/Vo.zip)
OUT = os.environ['OUT']
SR = 48000
CHUNKS = [('Hook.m4a', 4.97, 10.69), ('Rungtha Lane 5 2.m4a', 12.77, 21.32), ('Rungtha Lane 6.m4a', 2.92, 4.42),
          ('After no boring lecture.m4a', 2.64, 9.41), ('Walsingham House School.m4a', 36.80, 46.25),
          ('Rungtha Lane 9.m4a', 16.62, 27.85), ('Rungtha Lane 10.m4a', 29.15, 32.74)]


def dec(args):
    r = subprocess.run([FF, '-nostdin', '-v', 'error'] + args + ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, np.float32).copy()


mix = dec(['-i', GEN])
out = np.zeros_like(mix)
for name, a, b in CHUNKS:
    v = dec(['-ss', str(a), '-t', str(b - a), '-i', os.path.join(VO, name),
             '-af', 'highpass=f=90,afftdn,loudnorm=I=-18:TP=-2:LRA=11'])
    # cross-correlate at 8 kHz for speed, then refine at full rate
    d = 6
    m8, v8 = mix[::d], v[::d]
    n = 1 << int(np.ceil(np.log2(len(m8) + len(v8))))
    c = np.fft.irfft(np.fft.rfft(m8, n) * np.conj(np.fft.rfft(v8, n)), n)[:len(m8) - len(v8)]
    k8 = int(np.argmax(c))
    best = None
    for k in range(max(0, k8 * d - 2 * d), k8 * d + 2 * d + 1):
        seg = mix[k:k + len(v)]
        if len(seg) < len(v): continue
        s = float(np.dot(seg, v))
        if best is None or s > best[0]: best = (s, k)
    k = best[1]; seg = mix[k:k + len(v)]
    g = float(np.dot(seg, v) / np.dot(v, v))
    corr = float(np.dot(seg, v) / (np.linalg.norm(seg) * np.linalg.norm(v)))
    print(f'{name:32s} at {k / SR:7.3f}s  gain {g:.3f}  corr {corr:.3f}')
    fade = int(0.01 * SR); w = np.ones(len(v), np.float32); w[:fade] = np.linspace(0, 1, fade); w[-fade:] = np.linspace(1, 0, fade)
    out[k:k + len(v)] += v * g * w
subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ac', '2', OUT],
               input=out.tobytes(), check=True)
print('wrote', OUT, f'{len(out) / SR:.2f}s')
