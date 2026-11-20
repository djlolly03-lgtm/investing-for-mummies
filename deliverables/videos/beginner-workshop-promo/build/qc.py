#!/usr/bin/env python3
"""QC for out/final.mp4: format, loudness, voice-over-music margin per line, frame-match of every piece, contact sheet."""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = f"{HERE}/out8"; F = f"{OUT}/final.mp4"; W, H = 1080, 1920

def sh(*a): return subprocess.run(a, capture_output=True, text=True)
print(sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate:format=duration", "-of", "compact", F).stdout)
ld = sh("ffmpeg", "-nostdin", "-hide_banner", "-i", F, "-af", "loudnorm=print_format=json", "-f", "null", "-").stderr
j = json.loads(ld[ld.rindex("{"):ld.rindex("}") + 1]); print("LUFS", j["input_i"], "TP", j["input_tp"])

# frame match: final frame vs the frame it came from (thumb offset 24)
def grab(path, idx):
    r = sh("ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{idx}),scale=270:480", "-fps_mode", "passthrough", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-")
    return np.frombuffer(r.stdout.encode("latin1") if isinstance(r.stdout, str) else r.stdout, np.uint8)
def grabb(path, idx):
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{idx}),scale=270:480", "-fps_mode", "passthrough", "-frames:v", "1",
                        "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(r, np.uint8).astype(np.float32)
from fxp5 import BEATS; from fxp2 import fr_idx
bad = 0
for nm, a, b, fn, kw in BEATS:
    i0 = fr_idx(a)
    for k in (2, fr_idx(b) - i0 - 3):
        x = grabb(F, 24 + i0 + k); y = grabb(f"{HERE}/segs3/{nm}.mp4", k)
        dif = [np.abs(grabb(F, 24 + i0 + k + s) - y).mean() for s in (-1, 0, 1)]
        best = int(np.argmin(dif)) - 1
        if best != 0: bad += 1
        print(f"  {nm:10s} f{k:3d} offset {best:+d}  diff {min(dif):.1f}")
print("frame-match:", "OK" if bad == 0 else f"{bad} OFF")

# voice-over-music margin per sentence (stems)
if os.path.exists(f"{OUT}/stem_voice.wav"):
    def load(p):
        r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", p, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
        return np.frombuffer(r, np.int16).astype(np.float32) / 32768
    v, m = load(f"{OUT}/stem_voice.wav"), load(f"{OUT}/stem_music.wav")
    words = json.load(open(f"{HERE}/words.json")); sents, cur = [], []
    for w in words:
        cur.append(w)
        if w["w"].strip().endswith((".", "?", ",")) and len(cur) > 3: sents.append(cur); cur = []
    if cur: sents.append(cur)
    for s in sents:
        a, b = int((s[0]["s"] + 0.8) * 16000), int((s[-1]["e"] + 0.8) * 16000)
        rv = 20 * np.log10(np.sqrt((v[a:b] ** 2).mean()) + 1e-9); rm = 20 * np.log10(np.sqrt((m[a:b] ** 2).mean()) + 1e-9)
        print(f"  {s[0]['s']:5.1f}s voice {rv:6.1f} music {rm:6.1f}  margin {rv - rm:5.1f} dB  {' '.join(x['w'].strip() for x in s[:5])}")

subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", F, "-vf", "fps=1,scale=216:-1,tile=9x6", "-frames:v", "1", f"{OUT}/contact-sheet.jpg"], check=True)
print("sheet", f"{OUT}/contact-sheet.jpg")
