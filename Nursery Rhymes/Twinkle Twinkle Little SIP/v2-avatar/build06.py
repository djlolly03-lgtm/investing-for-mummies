#!/usr/bin/env python3
"""Twinkle Twinkle Little SIP - v2 build 06.  Full playbook pass.

  2.1 mouth strips at 1/8s across every clip -> real singing spans + rests
  2.2 shot cuts detected; nothing stretches across one; the rate may jump AT a
      cut for free
  3.2 anchors read off the MOUTH, not whisper on the clip's own audio (the two
      disagree by up to 0.49s on clip D)
  4   motion-aware rate-smoothing solve; spare stretch pushed into hand-marked
      rests, but only where the FRAME is still too
  5   cutaways where retiming ran out of road - B's coin insert covers "then
      save more", C's unused coin macro carries E's hook line, and F's two
      rests are cut out under a dissolve
  6   no-static verified after every build
  7   end card = clip G's own IFM logo reveal (client's call)
  8   hard cuts on word boundaries; dissolves only where a jump must be hidden

A block renders (slot length + the NEXT block's crossfade), so a dissolve never
shifts anything downstream - that bug silently moved every lip anchor 0.45s in
build01.
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
        print(" ".join(cmd)[:600]); print(r.stderr[-2500:]); raise SystemExit(1)

def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout)

GEOM = {"C-coins-jar": f"crop=668:1188:26:90,scale={W}:{H}"}
LOGO_GEOM = (f"scale={W}:608,pad={W}:{H}:0:(oh-ih)/2:color=0xF5F5F5,"
             f"scale=w='iw*(1.00+0.030*t/3.13)':h=-1:eval=frame,"
             f"crop={W}:{H}:(iw-{W})/2:(ih-{H})/2")

sig  = json.load(open(f"{WORK}/mouthsig.json"))
cuts = json.load(open(f"{WORK}/shotcuts.json"))

rows = []
for i, b in enumerate(BLOCKS):
    src, span, slot, anch = b["src"], b["span"], b["slot"], b["anch"]
    nxt_xf = BLOCKS[i + 1].get("xf", 0.0) if i + 1 < len(BLOCKS) else 0.0
    # Work in whole frames from ABSOLUTE song boundaries, so per-block rounding
    # cannot accumulate - the concat total must equal the song exactly.
    nf = (round(slot[1] * FPS) - round(slot[0] * FPS)) + round(nxt_xf * FPS)
    want = nf / FPS
    # extend the clip span to cover the outgoing half of the next dissolve
    if nxt_xf > 0:
        base = (slot[1] - slot[0]) / (span[1] - span[0])
        span = (span[0], min(span[1] + nxt_xf / base, 9.99))

    if anch:
        s = sig[src]
        r = solve(span, (slot[0], slot[0] + want), anch,
                  [c for c, _ in cuts.get(src, [])],
                  np.array(s["motion"]), np.array(s["face"]),
                  mmotion=np.array(s["mmotion"]), rests=b.get("rests", ()),
                  fps=s["fps"], speed_cap=b.get("cap", (0.80, 1.45)),
                  rest_cap=b.get("rest_cap", (0.70, 2.20)), **PARAMS)
        K, rate = r["K"], r["r"]
        cutset = {round(c, 4) for c, _ in cuts.get(src, [])}
        segs = [[K[0], K[1], rate[0]]]
        for j in range(1, len(rate)):
            if (abs(rate[j] - segs[-1][2]) / segs[-1][2] < MERGE_TOL
                    and round(K[j], 4) not in cutset):
                n0, n1 = segs[-1][1] - segs[-1][0], K[j + 1] - K[j]
                segs[-1][2] = (segs[-1][2] * n0 + rate[j] * n1) / (n0 + n1)
                segs[-1][1] = K[j + 1]
            else:
                segs.append([K[j], K[j + 1], rate[j]])
        k = want / sum((e - c) * rr for c, e, rr in segs)
        segs = [[c, e, rr * k] for c, e, rr in segs]
        sp = np.array([1 / rr for _, _, rr in segs])
        rw = np.array([r["restw"][min(np.searchsorted(r["K"], c), len(r["restw"])-1)]
                       for c, _, _ in segs])
        nonrest = sp[rw >= 1.0] if (rw >= 1.0).any() else sp
        rows.append((b["name"], slot, nonrest.min(), nonrest.max(), sp.max(),
                     len(segs), max(r["anchor_err"])))
    else:
        f = want / (span[1] - span[0])
        segs = [[span[0], span[1], f]]
        rows.append((b["name"], slot, 1 / f, 1 / f, 1 / f, 1, 0.0))

    parts = [f"[0:v]trim={c:.4f}:{e:.4f},setpts=(PTS-STARTPTS)*{rr:.6f}[p{j}]"
             for j, (c, e, rr) in enumerate(segs)]
    n = len(parts)
    geom = GEOM.get(src, LOGO_GEOM if "LOGO" in src else f"scale={W}:{H}")
    chain = ";".join(parts) + ";" + "".join(f"[p{j}]" for j in range(n)) + \
            f"concat=n={n}:v=1:a=0[cat];[cat]{geom},fps={FPS},setsar=1[v]"
    run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{src}.mp4",
         "-filter_complex", chain, "-map", "[v]", "-an",
         "-frames:v", str(nf),
         "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         "-pix_fmt", "yuv420p", f"{WORK}/{b['name']}.mp4"])

print(f"{'block':9s} {'slot':>15s} {'sung speed':>16s} {'peak':>7s} {'segs':>5s} {'err':>8s}")
for nm, slot, lo, hi, pk, ns, err in rows:
    print(f"{nm:9s} {slot[0]:6.2f}-{slot[1]:6.2f} {lo:6.2f}x -{hi:6.2f}x {pk:6.2f}x {ns:5d} {err:7.3f}s")

# ------------------------------------------------------------------ assemble
acc = f"{WORK}/acc0.mp4"
run(["ffmpeg", "-y", "-v", "error", "-i", f"{WORK}/{BLOCKS[0]['name']}.mp4",
     "-c", "copy", acc])
for i, b in enumerate(BLOCKS[1:], 1):
    nxt = f"{WORK}/{b['name']}.mp4"; out = f"{WORK}/acc{i}.mp4"
    xf = b.get("xf", 0.0)
    if xf > 0:
        off = dur(acc) - xf
        run(["ffmpeg", "-y", "-v", "error", "-i", acc, "-i", nxt,
             "-filter_complex",
             f"[0:v][1:v]xfade=transition=fade:duration={xf}:offset={off:.4f},"
             f"format=yuv420p[v]", "-map", "[v]", "-an",
             "-c:v", "libx264", "-preset", "medium", "-crf", "17",
             "-pix_fmt", "yuv420p", out])
    else:
        lst = f"{WORK}/cc{i}.txt"
        open(lst, "w").write(f"file '{os.path.basename(acc)}'\nfile '{os.path.basename(nxt)}'\n")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
             "-i", lst, "-c", "copy", out])
    acc = out

run(["ffmpeg", "-y", "-v", "error", "-i", acc, "-i", SONG,
     "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
     "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
     f"{OUT}/twinkle-sip-v2-build06.mp4"])
av = dur(acc)
print(f"\nassembled video: {av:.3f}s   song: 45.840s   delta: {av-45.84:+.3f}s")
print("->", f"{OUT}/twinkle-sip-v2-build06.mp4")
