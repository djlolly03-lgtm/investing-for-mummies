#!/usr/bin/env python3
"""Dry-run the solve for every block and report speed range + anchor error,
so weights can be tuned without paying for a render each time.

The visual anchors are read off a 1/8s mouth strip, so each carries about
+-0.125s of quantisation noise.  Treating them as hard constraints makes the
solver oscillate (0.81x then 1.79x inside one second).  They are observations,
not constraints - hence a lower anchor weight and much stronger smoothing.
"""
import json, sys, numpy as np
from solve import solve
from blocks import BLOCKS

sig = json.load(open("work/mouthsig.json"))
cuts = json.load(open("work/shotcuts.json"))

W_ANCHOR = float(sys.argv[1]) if len(sys.argv) > 1 else 120.0
W_MOTION = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
W_SMOOTH = float(sys.argv[3]) if len(sys.argv) > 3 else 25.0
W_CAP    = float(sys.argv[4]) if len(sys.argv) > 4 else 600.0
CAP_HI   = float(sys.argv[5]) if len(sys.argv) > 5 else 1.50
ITERS    = int(sys.argv[6]) if len(sys.argv) > 6 else 2500

print(f"w_anchor={W_ANCHOR} w_motion={W_MOTION} w_smooth={W_SMOOTH} "
      f"w_cap={W_CAP} cap_hi={CAP_HI} iters={ITERS}")
print(f"{'block':10s} {'speed min-max':>17s} {'segs':>5s} {'err max':>8s} {'err mean':>9s}  verdict")
worst = []
for b in BLOCKS:
    if not b["anch"]:
        continue
    s = sig[b["src"]]
    r = solve(b["span"], b["slot"], b["anch"],
              [c for c, _ in cuts.get(b["src"], [])],
              np.array(s["motion"]), np.array(s["face"]),
              mmotion=np.array(s["mmotion"]), rests=b.get("rests", ()), fps=s["fps"],
              w_anchor=W_ANCHOR, w_motion=W_MOTION, w_smooth=W_SMOOTH,
              w_cap=W_CAP, speed_cap=b.get("cap", (0.80, CAP_HI)),
              rest_cap=b.get("rest_cap", (0.70, 2.20)), iters=ITERS)
    sp = r["speed"]; err = np.array(r["anchor_err"])
    # speed only matters where the frame is actually moving / a face is visible
    vis = r["motion"] * r["face"]
    notrest = r["restw"] >= 1.0
    bad = sp[(sp > CAP_HI + 0.02) & notrest]
    verdict = "OK" if not len(bad) else f"CUTAWAY? {len(bad)} hot segs up to {bad.max():.2f}x"
    if err.max() > 0.12: verdict += f" | ANCHOR ERR {err.max():.2f}s"
    spv = sp[r["restw"] >= 1.0]
    print(f"{b['name']:10s} {spv.min():7.2f}x -{spv.max():6.2f}x {len(sp):5d} "
          f"{err.max():7.3f}s {err.mean():8.3f}s  {verdict}")
    worst.append((b["name"], sp.max(), err.max()))
