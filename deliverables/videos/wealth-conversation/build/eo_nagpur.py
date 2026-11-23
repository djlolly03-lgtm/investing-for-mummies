#!/usr/bin/env python3
"""EO Nagpur edition of the TWC Money Blueprint promo (23 Nov 2026).

Same recipe as the Mascot edition (19 Nov): the generic cut up to the end of Hiral's
last line (56.067s), then the client's logo morph (EO Nagpur -> The Wealth Conversation
wordmark), then the generic ending from 56.6s (wordmark -> IFM emblem).

Music: the song sits at mp3 = video - 5.04s in the generic cut. After the cut point it
keeps the generic mix through its swell (to 56.6s), then continues from the raw mp3, repeats ONE 4-bar phrase (song 56.28 -> 48.52, 30 ms
crossfade) and ends on the song's own last note (59.93) with a 2.2s fade. The video is
padded to fit that (1.2s hold on the EO Nagpur logo, longer hold on the emblem).
The logo clip's own whooshes are mixed in under the music.

Run with /usr/bin/python3 (numpy). Writes next to the generic cut.
"""
import os, subprocess, numpy as np

os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ["PATH"]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DL = os.path.expanduser("~/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads")
GEN = os.path.join(ROOT, "TWC Money Blueprint.mp4")
LOGO = os.path.join(DL, "Logo_morphing_into_text_graphic_e1c4f0b4.mp4")
SONG = os.path.join(DL, "Sunset Rooft Lounge.mp3")
OUT = os.environ.get("OUT", os.path.join(ROOT, "TWC Money Blueprint - EO Nagpur.mp4"))
TMP = os.environ.get("TMP", "/private/tmp/eo_nagpur_build")
os.makedirs(TMP, exist_ok=True)

SR, FPS = 48000, 30
CUT_F = 1682            # generic frames 0..1681 = Hiral through the end of her last line (56.067s)
TAIL_F = 1698           # generic resumes at 56.6s, on the settled wordmark
LOGO_HOLD_F = 36        # 1.2s on the EO Nagpur logo before it animates
X1, X2 = 12, 9          # crossfades: Hiral -> logo (0.4s), logo -> generic wordmark (0.3s)
SONG_OFF = 5.04         # song time = video time - 5.04 in the generic cut
LOOP_FROM, LOOP_TO, SONG_END = 56.28, 48.52, 59.93
SFX_GAIN = 0.3


def decode(path, start=None, dur=None):
    cmd = ["ffmpeg", "-nostdin", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if dur is not None:
        cmd += ["-t", str(dur)]
    cmd += ["-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def nframes(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v",
                        "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return int(r.stdout.strip().strip(","))


gen_frames = nframes(GEN)
tail_frames = gen_frames - TAIL_F
logo_frames = LOGO_HOLD_F + 8 * FPS

# ---- audio --------------------------------------------------------------------
gen = decode(GEN)
song = decode(SONG)
s = lambda t: int(round(t * SR))

# The generic mix ducks the song to ~0.09 under Hiral's last line and swells it back to
# ~1.1 by 56.6s (measured: 54-56 gain 0.092, 56.1-56.6 0.514, 56.6-58 1.102). So keep the
# generic audio through the swell and switch to the raw song at 56.6s, gain fitted there.
AT = 56.6
seg = gen[s(AT):s(AT + 3.0)].mean(1)
best = None
for lag_ms in range(-60, 61):
    o = SONG_OFF + lag_ms / 1000
    ref = song[s(AT - o):s(AT - o) + len(seg)].mean(1)
    c = float(np.dot(seg, ref) / (np.linalg.norm(seg) * np.linalg.norm(ref) + 1e-9))
    if best is None or c > best[0]:
        best = (c, o)
corr, off = best
ref = song[s(AT - off):s(AT - off) + len(seg)].mean(1)
gain = float(np.dot(seg, ref) / np.dot(ref, ref))
print(f"song offset {off:.3f}s (corr {corr:.3f}), gain {gain:.3f}")

cut_t = CUT_F / FPS
part1 = song[s(AT - off):s(LOOP_FROM)]
part2 = song[s(LOOP_TO):s(SONG_END)].copy()
xf = s(0.03)
ramp = np.linspace(0, 1, xf)[:, None]
part2[:xf] = part2[:xf] * ramp + part1[-xf:] * (1 - ramp)
music = np.concatenate([part1[:-xf], part2]) * gain
fade = s(2.2)
music[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2

total_t = AT + len(music) / SR
total_f = int(round(total_t * FPS))
hold_f = total_f - (CUT_F + logo_frames - X1 + tail_frames - X2)
assert hold_f >= 0, hold_f
print(f"total {total_t:.3f}s = {total_f} frames, emblem hold +{hold_f} frames")

out = np.zeros((s(total_t), 2), np.float32)
out[:s(AT)] = gen[:s(AT)]
cf = s(0.05)
a0 = s(AT) - cf
r = np.linspace(0, 1, cf)[:, None]
out[a0:s(AT)] = gen[a0:s(AT)] * (1 - r) + song[s(a0 / SR - off):s(a0 / SR - off) + cf] * gain * r
n = min(len(music), len(out) - s(AT))
out[s(AT):s(AT) + n] = music[:n]

# logo clip whooshes, aligned to its picture (it starts after the 1.2s hold)
sfx = decode(LOGO)
sfx_t = (CUT_F - X1 + LOGO_HOLD_F) / FPS
a = s(sfx_t)
m = min(len(sfx), len(out) - a)
out[a:a + m] += sfx[:m] * SFX_GAIN

peak = float(np.abs(out).max())
if peak > 0.98:
    out *= 0.98 / peak
wav = os.path.join(TMP, "mix.wav")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2",
                "-i", "-", wav], input=out.astype(np.float32).tobytes(), check=True)

# ---- video --------------------------------------------------------------------
fc = (
    f"[0:v]trim=start_frame=0:end_frame={CUT_F},fps={FPS},setpts=N/{FPS}/TB,settb=1/{FPS},setsar=1[a];"
    f"[1:v]scale=1080:1920:flags=lanczos,fps={FPS},setpts=N/{FPS}/TB,"
    f"tpad=start_mode=clone:start_duration={LOGO_HOLD_F / FPS},setpts=N/{FPS}/TB,settb=1/{FPS},setsar=1,format=yuv420p[b];"
    f"[0:v]trim=start_frame={TAIL_F},fps={FPS},setpts=N/{FPS}/TB,"
    f"tpad=stop_mode=clone:stop_duration={hold_f / FPS},setpts=N/{FPS}/TB,settb=1/{FPS},setsar=1[c];"
    f"[a][b]xfade=transition=fade:duration={X1 / FPS}:offset={(CUT_F - X1) / FPS}[ab];"
    f"[ab][c]xfade=transition=fade:duration={X2 / FPS}:offset={(CUT_F - X1 + logo_frames - X2) / FPS},"
    f"format=yuv420p[v]"
)
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", GEN, "-i", LOGO, "-i", wav,
                "-filter_complex", fc, "-map", "[v]", "-map", "2:a",
                "-frames:v", str(total_f), "-r", str(FPS),
                "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT], check=True)

got = nframes(OUT)
print(f"wrote {OUT}: {got} frames (expected {total_f})")
assert got == total_f
