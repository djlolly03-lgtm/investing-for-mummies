#!/usr/bin/python3
"""Lip-sync: how far is each talking shot's picture from the source time its voice was taken at?
Frame k of a cut is matched against the source decoded at its NATIVE rate (25 fps Canon, 24/60 fps iPhone), with a
parabolic fit around the best match for sub-frame precision. Positive = the picture shows a LATER moment than intended
(so the voice must play that much earlier). Writes W/picoff.json, read by assemble.py.
Why (1 Nov 2026): 25->30 fps conversion lands some shots a camera frame (40 ms) early; with the 25 ms AAC delay on top,
the user saw her lips lead her voice by ~65 ms on several lines."""
import subprocess, numpy as np, json
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, RAW, SDR, HUB = W + '/seg', W + '/raw', W + '/sdr', W + '/hub'
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
SHOTS = {'H1': (f'{RAW}/MVI_0272.MP4', 3.451), 'H2': (f'{RAW}/MVI_0278.MP4', 5.115), 'H3': (f'{RAW}/MVI_0279.MP4', 5.192),
         'H5': (f'{RAW}/MVI_0283.MP4', 20.567), 'Qc': (f'{HUB}/IFM-342/Brand Awareness .mp4', 36.280),
         'T1a': (f'{SDR}/IFM-555.mov', 47.440), 'T2': (f'{SDR}/IFM-455.mov', 7.480), 'T3': (f'{HUB}/IFM-397/IMG_6785.MOV', 100.380)}
def frames(p, ss, dur, vf):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{ss:.3f}', '-i', p, '-t', f'{dur:.3f}', '-vf', vf + ',scale=108:192,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 192, 108).astype(np.float32)
def rate(p):
    a, b = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', p]).decode().strip().strip(',').split('/')
    return float(a) / float(b)
out = {}
for name, (src, ss) in SHOTS.items():
    cut = frames(f'{SEG}/{name}.mp4', 0, 20, 'null'); fr = rate(src); ds = []
    for k in np.linspace(8, min(len(cut), 70) - 8, 7).astype(int):
        t = ss + k / 30; s0 = t - 0.3; src_f = frames(src, s0, 0.6, 'setpts=PTS-STARTPTS,' + COVER)
        e = np.array([np.mean(np.abs(f - cut[k])) for f in src_f]); i = int(np.argmin(e))
        if 0 < i < len(e) - 1:   # parabolic sub-frame refinement
            den = e[i - 1] - 2 * e[i] + e[i + 1]; i = i + (0.5 * (e[i - 1] - e[i + 1]) / den if den > 0 else 0)
        ds.append(s0 + i / fr - t)
    out[name] = round(float(np.median(ds)), 4)
    print(f'{name:4s} picture {1000*out[name]:+5.0f} ms   (samples {[round(1000*d) for d in ds]})', flush=True)
json.dump(out, open(W + '/picoff.json', 'w'), indent=1)
