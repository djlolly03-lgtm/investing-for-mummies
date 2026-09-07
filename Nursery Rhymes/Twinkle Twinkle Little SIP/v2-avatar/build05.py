#!/usr/bin/env python3
"""Twinkle Twinkle Little SIP - v2 build 05.  Full playbook pass.

vs build03 (which only followed the playbook's skeleton):
  2.1 mouth strips at 1/8s read across every clip -> real singing spans + rests
  2.2 shot cuts detected; nothing stretches across one, and the rate may jump
      AT a cut for free
  3.2 anchors read off the MOUTH, not whisper on the clip's own audio - the two
      disagree by up to 0.49s (clip D), the exact failure the playbook warns of
  4   motion-aware rate-smoothing solve; spare stretch pushed into hand-marked
      rests, but only where the FRAME is also still
  5   cutaways where retiming ran out of road: B's coin insert covers "then save
      more"; C's unused coin macro carries E's hook line
  7   end card = clip G's own IFM logo reveal (client's call)
  8   hard cuts on word boundaries; one soft fade logo -> A
"""
import subprocess, os, json, numpy as np
from solve import solve
from blocks import BLOCKS

SRC, WORK, OUT = "src", "work", "out"
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)
SONG = "../Twinkle Twinkle Little SIP.mp3"
W, H, FPS = 1080, 1920, 30
MERGE_TOL = 0.04
PARAMS = dict(w_anchor=220.0, w_motion=2.0, w_smooth=12.0, w_cap=700.0, iters=3000)

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

rows = []
for b in BLOCKS:
    src, span, slot, anch = b["src"], b["span"], b["slot"], b["anch"]
    if anch:
        s = sig[src]
        r = solve(span, slot, anch, [c for c, _ in cuts.get(src, [])],
                  np.array(s["motion"]), np.array(s["face"]),
                  mmotion=np.array(s["mmotion"]), rests=b.get("rests", ()),
                  fps=s["fps"], speed_cap=b.get("cap", (0.80, 1.45)),
                  rest_cap=b.get("rest_cap", (0.70, 2.20)), **PARAMS)
        K, rate, restw = r["K"], r["r"], r["restw"]
        cutset = {round(c, 4) for c, _ in cuts.get(src, [])}
        segs = [[K[0], K[1], rate[0]]]
        for i in range(1, len(rate)):
            if (abs(rate[i] - segs[-1][2]) / segs[-1][2] < MERGE_TOL
                    and round(K[i], 4) not in cutset):
                n0, n1 = segs[-1][1] - segs[-1][0], K[i + 1] - K[i]
                segs[-1][2] = (segs[-1][2] * n0 + rate[i] * n1) / (n0 + n1)
                segs[-1][1] = K[i + 1]
            else:
                segs.append([K[i], K[i + 1], rate[i]])
        k = (slot[1] - slot[0]) / sum((e - c) * rr for c, e, rr in segs)
        segs = [[c, e, rr * k] for c, e, rr in segs]
        sp = np.array([1 / rr for _, _, rr in segs])
        rows.append((b["name"], slot, sp.min(), sp.max(), len(segs),
                     max(r["anchor_err"])))
    else:
        f = (slot[1] - slot[0]) / (span[1] - span[0])
        segs = [[span[0], span[1], f]]
        rows.append((b["name"], slot, 1 / f, 1 / f, 1, 0.0))

    parts = [f"[0:v]trim={c:.4f}:{e:.4f},setpts=(PTS-STARTPTS)*{rr:.6f}[p{i}]"
             for i, (c, e, rr) in enumerate(segs)]
    n = len(parts)
    geom = GEOM.get(src, LOGO_GEOM if "LOGO" in src else f"scale={W}:{H}")
    chain = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(n)) + \
            f"concat=n={n}:v=1:a=0[cat];[cat]{geom},fps={FPS},setsar=1[v]"
    run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{src}.mp4",
         "-filter_complex", chain, "-map", "[v]", "-an",
         "-frames:v", str(round((slot[1] - slot[0]) * FPS)),
         "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         "-pix_fmt", "yuv420p", f"{WORK}/{b['name']}.mp4"])

print(f"{'block':10s} {'slot':>15s} {'speed':>16s} {'segs':>5s} {'anchor err':>11s}")
for nm, slot, lo, hi, ns, err in rows:
    print(f"{nm:10s} {slot[0]:6.2f}-{slot[1]:6.2f} {lo:6.2f}x -{hi:6.2f}x {ns:5d} {err:10.3f}s")

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
     f"{OUT}/twinkle-sip-v2-build05.mp4"])
print("\n->", f"{OUT}/twinkle-sip-v2-build05.mp4")
