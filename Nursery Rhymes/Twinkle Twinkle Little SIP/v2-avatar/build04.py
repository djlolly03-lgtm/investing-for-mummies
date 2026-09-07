#!/usr/bin/env python3
"""Twinkle Twinkle Little SIP - v2 build 04.  Full playbook pass.

What changed vs build03 (which only followed the playbook's skeleton):
  2.1  mouth frame-strips at 1/8s read across every clip -> real singing spans
  2.2  shot cuts detected; no segment ever stretches across one, and the rate
       is allowed to jump AT a cut for free
  3.2  anchors now come from WATCHING THE MOUTH, not from whisper on the clip's
       own audio.  The two disagree by up to 0.49s (clip D), which is exactly
       the failure mode the playbook warns about.
  4    motion-aware rate-smoothing solve instead of raw per-line linear
  5    B and C restructured around their real shot cuts so the coin inserts
       absorb the tempo mismatch - no mouth on screen, so it is free sync
  7    end card = clip G's own IFM logo reveal (client's call)
"""
import subprocess, os, json, numpy as np
from solve import solve

SRC, WORK, OUT = "src", "work", "out"
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)
SONG = "../Twinkle Twinkle Little SIP.mp3"
W, H, FPS = 1080, 1920, 30

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(cmd)[:500]); print(r.stderr[-2500:]); raise SystemExit(1)

GEOM = {"C-coins-jar": f"crop=668:1188:26:90,scale={W}:{H}"}
LOGO_GEOM = (f"scale={W}:608,pad={W}:{H}:0:(oh-ih)/2:color=0xF5F5F5,"
             f"scale=w='iw*(1.00+0.030*t/3.13)':h=-1:eval=frame,"
             f"crop={W}:{H}:(iw-{W})/2:(ih-{H})/2")

sig  = json.load(open(f"{WORK}/mouthsig.json"))
cuts = json.load(open(f"{WORK}/shotcuts.json"))

# --------------------------------------------------------------- the timeline
# anchors are (clip_time, song_time); clip times read off the MOUTH strips.
BLOCKS = [
 dict(name="01-logo", src="LOGO-golden-light", span=(3.62, 6.75), slot=(0.00, 3.13), anch=[]),

 # A - single shot, no cuts.  "SIP" is occluded by flying coins ~4.0-4.9.
 dict(name="02-A", src="A-twinklesip01", span=(0.00, 8.70), slot=(2.68, 9.70), anch=[
     (2.000, 4.62), (3.000, 5.30), (3.500, 5.86), (4.150, 6.54),
     (5.950, 7.18), (6.375, 7.58), (6.625, 7.84), (7.000, 8.30),
     (7.500, 8.58), (8.125, 9.12)]),

 # B - restructured on its real cuts (4.375, 6.417).  Her 1.3s rest between
 # "rupee," and "then" does not exist in the song, so the coin insert covers it.
 dict(name="03-B1", src="B-singing-saving", span=(0.50, 1.60), slot=(9.70, 10.98), anch=[
     (0.500, 9.70), (0.750, 10.08), (1.000, 10.42)]),
 dict(name="04-B2", src="B-singing-saving", span=(4.375, 6.00), slot=(10.98, 12.32), anch=[]),
 dict(name="05-B3", src="B-singing-saving", span=(6.50, 8.75), slot=(12.32, 14.76), anch=[
     (6.500, 12.32), (7.000, 12.86), (7.750, 13.52), (8.375, 13.82)]),

 # C - its three natural shots land almost exactly on the two lines.
 dict(name="06-C1", src="C-coins-jar", span=(0.00, 1.25), slot=(14.76, 16.10), anch=[
     (0.000, 14.76), (0.440, 15.28), (1.020, 15.90)]),
 dict(name="07-C2", src="C-coins-jar", span=(1.25, 2.458), slot=(16.10, 17.32), anch=[]),
 dict(name="08-C3", src="C-coins-jar", span=(2.458, 5.25), slot=(17.32, 19.76), anch=[
     (2.500, 17.32), (3.000, 17.78), (4.375, 18.56), (5.000, 19.02)]),

 # D - mouth starts at 1.750, a full 0.49s after the clip's own audio says 1.26.
 dict(name="09-D", src="D-meadow", span=(1.75, 6.90), slot=(19.76, 24.68), anch=[
     (1.750, 19.76), (2.500, 20.28), (3.000, 20.70), (3.625, 21.64),
     (4.500, 22.24), (5.000, 22.72), (6.000, 23.78)]),

 # E - the hard one: her first line runs 1.6-1.9x slow against the song.
 dict(name="10-E", src="E-sings-stands", span=(0.00, 7.40), slot=(24.68, 29.60), anch=[
     (0.000, 24.68), (2.625, 26.30), (4.240, 27.16), (4.700, 27.42),
     (5.550, 28.12)]),

 # F - no cuts; big rests between short phrases that the song does not have.
 dict(name="11-F", src="F-holding-jar", span=(0.00, 7.60), slot=(29.60, 34.60), anch=[
     (0.250, 29.62), (1.000, 30.24), (2.000, 30.66), (2.375, 31.38),
     (3.500, 31.74), (3.875, 32.62), (5.000, 33.26), (5.625, 33.76),
     (6.100, 34.36)]),

 # G - no vocals.  Covers the instrumental outro, ends on the IFM logo reveal.
 dict(name="12-G", src="G-jar-waving", span=(0.00, 10.00), slot=(34.60, 45.84), anch=[]),
]

MERGE_TOL = 0.04   # merge neighbouring intervals whose rate matches within 4%

report = []
for b in BLOCKS:
    src, span, slot, anch = b["src"], b["span"], b["slot"], b["anch"]
    if anch:
        s = sig[src]
        r = solve(span, slot, anch,
                  [c for c, _ in cuts.get(src, [])],
                  np.array(s["motion"]), np.array(s["face"]),
                  fps=s["fps"])
        K, rate = r["K"], r["r"]
        cutset = {round(c, 4) for c, _ in cuts.get(src, [])}
        # merge similar neighbouring rates so the filtergraph stays sane
        segs = [[K[0], K[1], rate[0]]]
        for i in range(1, len(rate)):
            if (abs(rate[i] - segs[-1][2]) / segs[-1][2] < MERGE_TOL
                    and round(K[i], 4) not in cutset):
                n0 = segs[-1][1] - segs[-1][0]; n1 = K[i + 1] - K[i]
                segs[-1][2] = (segs[-1][2] * n0 + rate[i] * n1) / (n0 + n1)
                segs[-1][1] = K[i + 1]
            else:
                segs.append([K[i], K[i + 1], rate[i]])
        # renormalise so the block lands exactly on its slot
        tot = sum((e - s0) * rr for s0, e, rr in segs)
        k = (slot[1] - slot[0]) / tot
        segs = [[s0, e, rr * k] for s0, e, rr in segs]
        sp = [1 / rr for _, _, rr in segs]
        report.append((b["name"], slot, min(sp), max(sp), len(segs),
                       max(r["anchor_err"]), r["motion"], segs))
    else:
        f = (slot[1] - slot[0]) / (span[1] - span[0])
        segs = [[span[0], span[1], f]]
        report.append((b["name"], slot, 1 / f, 1 / f, 1, 0.0, None, segs))

    parts = []
    for i, (c0, c1, rr) in enumerate(segs):
        parts.append(f"[0:v]trim={c0:.4f}:{c1:.4f},setpts=(PTS-STARTPTS)*{rr:.6f}[p{i}]")
    n = len(parts)
    geom = GEOM.get(src, LOGO_GEOM if "LOGO" in src else f"scale={W}:{H}")
    chain = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(n)) + \
            f"concat=n={n}:v=1:a=0[cat];[cat]{geom},fps={FPS},setsar=1[v]"
    nf = round((slot[1] - slot[0]) * FPS)
    run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{src}.mp4",
         "-filter_complex", chain, "-map", "[v]", "-an", "-frames:v", str(nf),
         "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         "-pix_fmt", "yuv420p", f"{WORK}/{b['name']}.mp4"])

print(f"{'block':10s} {'slot':>15s} {'speed min-max':>16s} {'segs':>5s} {'anchor err':>11s}")
for nm, slot, lo, hi, ns, err, mot, _ in report:
    flag = "  <-- OVER CAP" if hi > 1.60 else ""
    print(f"{nm:10s} {slot[0]:6.2f}-{slot[1]:6.2f} {lo:7.2f}x -{hi:6.2f}x {ns:5d} {err:10.3f}s{flag}")

json.dump([[b["name"], *b["slot"]] for b in BLOCKS], open(f"{WORK}/manifest.json", "w"), indent=1)

XF = 0.45
with open(f"{WORK}/concat.txt", "w") as fh:
    for b in BLOCKS[1:]:
        fh.write(f"file '{b['name']}.mp4'\n")
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
     "-i", f"{WORK}/concat.txt", "-c", "copy", f"{WORK}/body.mp4"])
run(["ffmpeg", "-y", "-v", "error",
     "-i", f"{WORK}/01-logo.mp4", "-i", f"{WORK}/body.mp4", "-i", SONG,
     "-filter_complex",
     f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset=2.680,format=yuv420p[v]",
     "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
     "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
     f"{OUT}/twinkle-sip-v2-build04.mp4"])
print("\n->", f"{OUT}/twinkle-sip-v2-build04.mp4")
