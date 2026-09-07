#!/usr/bin/env python3
"""Twinkle Twinkle Little SIP - v2 (AI avatar clips) - build 02
  fix: logo xfade was shifting the whole body 0.45s early -> all lip sync off.
       logo now runs XF longer and the fade starts AT 2.68 so the body keeps its slot.
  fix: slow scale-breathe on the logo so it clears the no-static check.
Follows Nursery Rhymes/Insta Video Playbook.md
  step 0 : song transcribed with faster-whisper -> work/song-words.json
  step 2 : every clip diagnosed (mouth strips, shot changes, tempo ratio)
  step 3 : per-line word anchors clip_time -> song_time, piecewise setpts
"""
import subprocess, os, json

SRC = "src"; WORK = "work"; OUT = "out"
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)
SONG = "../Twinkle Twinkle Little SIP.mp3"
W, H, FPS = 1080, 1920, 30

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(" ".join(cmd)[:400]); print(r.stderr[-3000:]); raise SystemExit(1)

# ---------------------------------------------------------------- geometry
# every clip is 720x1280 (9:16) except the logo (1280x720 landscape).
# clip C has "PART 3" burned into the top of frame -> crop it away.
GEOM = {
    "C-coins-jar": f"crop=668:1188:26:90,scale={W}:{H}",
}
DEFAULT_GEOM = f"scale={W}:{H}"
LOGO_GEOM = (f"scale={W}:608,pad={W}:{H}:0:(oh-ih)/2:color=0xF5F5F5,"
             f"scale=w='iw*(1.00+0.030*t/3.13)':h=-1:eval=frame,"
             f"crop={W}:{H}:(iw-{W})/2:(ih-{H})/2")

# ---------------------------------------------------------------- timeline
# anchors: (clip_time, song_time) pairs, in order. Piecewise-linear between them.
# song times come from whisper word onsets; clip times from each clip's own
# sung audio (natively generated with the video).
PLAN = [
    # name, source, anchors
    ("01-logo", "LOGO-golden-light", [(3.62, 0.00), (6.75, 3.13)]),  # 2.68 + XF

    # A  "Twinkle twinkle little SIP / Small small coins on every trip"
    ("02-A", "A-twinklesip01", [
        (0.00, 2.68),   # non-singing lead-in, plays at 1.00x
        (1.94, 4.62),   # "Twinkle"
        (5.54, 7.18),   # "Small"
        (8.70, 9.70),   # end of "trip" + sung tail
    ]),
    # B  "Save one rupee, then save more / Watch it grow like never before"
    ("03-B", "B-singing-saving", [
        (0.00,  9.70),  # "Save"
        (4.54, 12.32),  # "Watch"   (clip cuts to coin insert here - good cutaway)
        (7.98, 14.76),  # end "before"
    ]),
    # C  "Put it in the money jar / Don't touch it, let it go far"
    ("04-C", "C-coins-jar", [
        (0.00, 14.76),  # "Put"
        (2.56, 17.32),  # "don't"
        (6.10, 19.76),  # end "far"
    ]),
    # D  "Wait and wait, don't take it out / That's what saving is about"
    ("05-D", "D-meadow", [
        (1.26, 19.76),  # "Wait"
        (4.40, 22.24),  # "That's"
        (6.50, 24.68),  # end "about" + rest into the held note
    ]),
    # E  "Twinkle twinkle little SIP / Slow and steady wins the trip"
    ("06-E", "E-sings-stands", [
        (0.00, 24.68),  # "Twinkle"
        (4.24, 27.16),  # "Slow"
        (7.40, 29.60),  # end "trip"
    ]),
    # F  "Time is magic / Patience too / That's the trick / that money knew"
    ("07-F", "F-holding-jar", [
        (0.00, 29.62),  # "Time"
        (1.20, 30.35),  # end "magic"  (her rest gets compressed, not her singing)
        (2.02, 30.66),  # "Patience"
        (3.72, 31.74),  # "That's"
        (4.40, 32.62),  # "trick"
        (5.24, 33.26),  # "money"
        (5.70, 33.76),  # "knew"
        (6.28, 34.60),  # sung tail
    ]),
    # G  no vocals - covers the instrumental outro, ends on the IFM logo reveal
    ("08-G", "G-jar-waving", [(0.00, 34.60), (10.00, 45.84)]),
]

# ---------------------------------------------------------------- render
print(f"{'segment':10s} {'song slot':>16s} {'dur':>6s}   per-anchor speed")
manifest = []
for name, src, anch in PLAN:
    geom = GEOM.get(src, LOGO_GEOM if "LOGO" in src else DEFAULT_GEOM)
    parts, rates = [], []
    for i in range(len(anch) - 1):
        (c0, s0), (c1, s1) = anch[i], anch[i + 1]
        f = (s1 - s0) / (c1 - c0)
        rates.append(1 / f)
        parts.append(f"[0:v]trim={c0}:{c1},setpts=(PTS-STARTPTS)*{f:.6f}[p{i}]")
    n = len(parts)
    chain = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(n)) + \
            f"concat=n={n}:v=1:a=0[cat];[cat]{geom},fps={FPS},setsar=1[v]"
    dst = f"{WORK}/{name}.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{src}.mp4",
         "-filter_complex", chain, "-map", "[v]", "-an",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", dst])
    s0, s1 = anch[0][1], anch[-1][1]
    print(f"{name:10s} {s0:7.2f}-{s1:6.2f} {s1-s0:6.2f}   " +
          " ".join(f"{r:.2f}x" for r in rates))
    manifest.append((name, dst, s0, s1))

json.dump([[m[0], m[2], m[3]] for m in manifest], open(f"{WORK}/manifest.json", "w"), indent=1)

# ---------------------------------------------------------------- assemble
# hard cuts on word boundaries (playbook 8); one soft xfade logo -> A.
XF = 0.45
lst = f"{WORK}/concat.txt"
with open(lst, "w") as fh:
    for _, dst, _, _ in manifest[1:]:
        fh.write(f"file '{os.path.basename(dst)}'\n")
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
     "-c", "copy", f"{WORK}/body.mp4"])

run(["ffmpeg", "-y", "-v", "error",
     "-i", f"{WORK}/01-logo.mp4", "-i", f"{WORK}/body.mp4", "-i", SONG,
     "-filter_complex",
     f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset={2.68:.3f},format=yuv420p[v]",
     "-map", "[v]", "-map", "2:a",
     "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "192k", "-shortest",
     f"{OUT}/twinkle-sip-v2-build02.mp4"])
print("\n->", f"{OUT}/twinkle-sip-v2-build02.mp4")
