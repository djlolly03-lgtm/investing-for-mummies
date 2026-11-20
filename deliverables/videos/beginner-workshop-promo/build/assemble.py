#!/usr/bin/env python3
"""Assemble the beginner-workshop promo.
Video: thumb (24 f) + source timeline (fxbase.mp4 with custom segs swapped in by frame index) + logo (tree-grow, sped up).
Audio: Hiral's own take (continuous, same clock as the picture) + Suno afro-house bed, drop on "games".
Joins use the concat FILTER with setpts=N/30/TB (never concat-demuxer copy). Frame totals are asserted.
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fxp5 import BEATS; from fxp2 import fr_idx

HERE = os.path.dirname(os.path.abspath(__file__)); FPS = 30
REPO = "/Users/lollyg/Documents/investing for Mummies"
LOGO = f"{REPO}/deliverables/videos/logo-animations/IFM-logo-tree-grow-sleek-vertical.mp4"
OUT = f"{HERE}/out8"; os.makedirs(OUT, exist_ok=True)
PRE = 24                       # thumb frames (0.8 s)
SRC_N = 1459                   # base.mp4 frames
DROP_TRACK = 31.35             # first hit of the drop in suno.mp3
DROP_SRC = 31.00               # "games"
CUT_A, CUT_B = DROP_TRACK + 4 * 60 / 123 * 4 * 1.0, DROP_TRACK + 6 * 60 / 123 * 4   # remove bars 5-6 after the drop
MUS_DELAY = PRE / FPS + DROP_SRC - DROP_TRACK      # music starts this many seconds into the output
TRACK_LEN = 56.3735

def run(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(1)
def nframes(p):
    return int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames",
                               "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip().strip(","))

# ---- 1. source timeline pieces
pieces = []  # (file, first_frame, n)
cur = 0
for nm, a, b, fn, kw in sorted(BEATS, key=lambda x: x[1]):
    i0, i1 = fr_idx(a), fr_idx(b)
    if i0 > cur: pieces.append((f"{HERE}/fxbase3.mp4", cur, i0 - cur))
    seg = f"{HERE}/segs3/{nm}.mp4"; assert nframes(seg) == i1 - i0, (nm, nframes(seg), i1 - i0)
    pieces.append((seg, 0, i1 - i0)); cur = i1
FXB = nframes(f"{HERE}/fxbase3.mp4")
if cur < FXB: pieces.append((f"{HERE}/fxbase3.mp4", cur, FXB - cur)); cur = FXB
if cur < SRC_N: pieces.append((f"{HERE}/base.mp4", cur, SRC_N - cur)); cur = SRC_N
assert sum(p[2] for p in pieces) == SRC_N

# ---- 2. logo: first 5.6 s of the tree-grow, sped up to fill to the end of the music
music_end = MUS_DELAY + TRACK_LEN - (CUT_B - CUT_A)
logo_n = int(round((music_end - (PRE + SRC_N) / FPS) * FPS))
speed = 5.6 / (logo_n / FPS)
print(f"music delay {MUS_DELAY:.3f}s, cut {CUT_A:.2f}-{CUT_B:.2f}, music ends {music_end:.2f}s, logo {logo_n} f at {speed:.2f}x")

inputs = [f"{HERE}/segs/thumb.mp4"] + [p[0] for p in pieces] + [LOGO]
args = []
for f in inputs: args += ["-i", f]
fc = [f"[0:v]setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v0]"]
for k, (f, s, n) in enumerate(pieces, 1):
    fc.append(f"[{k}:v]trim=start_frame={s}:end_frame={s + n},setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v{k}]")
L = len(pieces) + 1
hold = 1.0; speed = 5.6 / (logo_n / FPS - hold)
fc.append(f"[{L}:v]trim=0:5.6,setpts=(PTS-STARTPTS)/{speed:.5f},fps=30,tpad=stop_mode=clone:stop_duration=2,trim=end_frame={logo_n},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1,format=yuv420p[v{L}]")
fc.append("".join(f"[v{k}]" for k in range(L + 1)) + f"concat=n={L + 1}:v=1:a=0,setpts=N/30/TB[v]")
TOTAL = PRE + SRC_N + logo_n
run("ffmpeg", "-nostdin", "-v", "error", "-y", *args, "-filter_complex", ";".join(fc), "-map", "[v]", "-fps_mode", "passthrough",
    "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", f"{OUT}/video.mp4")
assert nframes(f"{OUT}/video.mp4") == TOTAL, (nframes(f"{OUT}/video.mp4"), TOTAL)

# ---- 3. audio
D = TOTAL / FPS
pre = PRE / FPS
voice_end = pre + 48.6
# voice: Hiral's own take, cleaned + levelled; same clock as picture (delayed by the thumb)
af_voice = f"[1:a]aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,highpass=f=85,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,loudnorm=I=-16:TP=-2:LRA=9,adelay={int(pre * 1000) - 25}|{int(pre * 1000) - 25},apad=whole_dur={D}[vo]"
# music: drop two bars after the drop, short crossfade, then a steady bed (no pumping)
bed = 0.12
env = (f"volume='if(lt(t,{pre - 0.1}),0.55,if(lt(t,{pre + 0.4}),0.55-({0.55 - bed})*(t-{pre - 0.1})/0.5,"
       f"if(lt(t,{voice_end}),{bed},min(0.26,{bed}+(t-{voice_end})/1.6))))':eval=frame")
af_mus = (f"[2:a]aresample=48000,atrim=0:{CUT_A + 0.02},asetpts=PTS-STARTPTS[ma];[3:a]aresample=48000,atrim={CUT_B - 0.02},asetpts=PTS-STARTPTS[mb];"
          f"[ma][mb]acrossfade=d=0.04:c1=tri:c2=tri,acompressor=threshold=-24dB:ratio=3:attack=20:release=250:makeup=4,"
          f"adelay={int(MUS_DELAY * 1000)}|{int(MUS_DELAY * 1000)},atrim=0:{D},afade=t=out:st={D - 0.35}:d=0.35,{env},apad=whole_dur={D}[mu]")
mix = f"[vo][mu]amix=inputs=2:normalize=0:duration=first[mx]"
run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-i", f"{HERE}/base.mp4", "-i", f"{HERE}/music/suno.mp3", "-i", f"{HERE}/music/suno.mp3",
    "-filter_complex", ";".join([af_voice, af_mus, mix]), "-map", "[mx]", "-ar", "48000", "-c:a", "pcm_s16le", f"{OUT}/mix.wav")
if os.environ.get("STEMS"):
    for lab, m, o in (("voice", "[vo]", "[mu]"), ("music", "[mu]", "[vo]")):
        run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-i", f"{HERE}/base.mp4", "-i", f"{HERE}/music/suno.mp3", "-i", f"{HERE}/music/suno.mp3",
            "-filter_complex", ";".join([af_voice, af_mus, f"{m}anull[o];{o}anullsink"]), "-map", "[o]", "-ar", "48000", f"{OUT}/stem_{lab}.wav")

# two-pass loudnorm to -14 LUFS / -1 dBTP
meas = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", f"{OUT}/mix.wav", "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
ln = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
      f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
final = f"{OUT}/final.mp4"
run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-i", f"{OUT}/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", ln + ",aresample=48000", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", final)
print("final", final, TOTAL, "frames", f"{D:.2f}s")
