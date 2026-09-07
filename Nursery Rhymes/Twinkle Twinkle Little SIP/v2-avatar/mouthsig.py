#!/usr/bin/env python3
"""Playbook 3.2 - derive the performance timeline from the LIPS, not the clip's audio.

Per frame: locate the face (Haar, temporally median-smoothed), crop the mouth,
and measure how open it is. Openness = area of the dark mouth interior, which is
what actually distinguishes a sung vowel from a closed/resting mouth.

Also emits, per frame:
  face   - was a face visible (0/1)   -> non-face frames are free-sync cutaway zones
  motion - whole-frame motion         -> feeds the motion-aware rate weighting (playbook 4)
  mmotion- mouth-region motion        -> used to find true singing spans (playbook 2.4)
"""
import cv2, numpy as np, json, sys

CLIPS = ["A-twinklesip01", "B-singing-saving", "C-coins-jar",
         "D-meadow", "E-sings-stands", "F-holding-jar"]
cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def analyse(clip):
    cap = cv2.VideoCapture(f"src/{clip}.mp4")
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok: break
        frames.append(fr)
    cap.release()
    n = len(frames)
    small = [cv2.resize(f, (180, 320)) for f in frames]
    gray = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in small]

    # ---- face track
    raw = np.full((n, 4), np.nan); seen = np.zeros(n)
    for i, f in enumerate(small):
        g = cv2.cvtColor(cv2.resize(f, (360, 640)), cv2.COLOR_BGR2GRAY)
        d = cas.detectMultiScale(g, 1.1, 5, minSize=(45, 45))
        if len(d):
            raw[i] = max(d, key=lambda b: b[2] * b[3]); seen[i] = 1
    idx = np.arange(n)
    box = raw.copy()
    for k in range(4):
        c = box[:, k]; ok = ~np.isnan(c)
        box[:, k] = np.interp(idx, idx[ok], c[ok]) if ok.sum() >= 5 else 0
    sm = np.array([[np.median(box[max(0, i - 4):i + 5, k]) for k in range(4)] for i in range(n)])

    # ---- mouth openness (dark-interior area inside the mouth crop)
    sx, sy = frames[0].shape[1] / 360, frames[0].shape[0] / 640
    openness = np.zeros(n)
    for i in range(n):
        x, y, w, h = sm[i] * np.array([sx, sy, sx, sy])
        y0, y1 = int(y + h * 0.55), int(y + h * 1.02)
        x0, x1 = int(x + w * 0.20), int(x + w * 0.80)
        H_, W_ = frames[i].shape[:2]
        y0, y1, x0, x1 = max(0, y0), min(H_, y1), max(0, x0), min(W_, x1)
        m = frames[i][y0:y1, x0:x1]
        if m.size == 0: continue
        g = cv2.cvtColor(m, cv2.COLOR_BGR2GRAY).astype(np.float32)
        # dark interior relative to the lips/skin around it
        thr = g.mean() - 0.9 * g.std()
        openness[i] = float((g < thr).mean())

    # ---- motion
    # Whole-frame motion is a plain diff.  Mouth motion must be SCALE-INVARIANT:
    # F's camera pulls right out, so a fixed-pixel mouth box makes the diff climb
    # monotonically as her face shrinks - that measures the zoom, not her lips.
    # So resample the mouth crop to a constant size and contrast-normalise it
    # before differencing.
    MW, MH = 64, 48
    crops = np.zeros((n, MH, MW), np.float32)
    for i in range(n):
        x, y, w, h = sm[i] * np.array([sx, sy, sx, sy])
        y0, y1 = int(y + h * 0.55), int(y + h * 1.02)
        x0, x1 = int(x + w * 0.20), int(x + w * 0.80)
        H_, W_ = frames[i].shape[:2]
        y0, y1 = max(0, y0), min(H_, y1); x0, x1 = max(0, x0), min(W_, x1)
        if y1 - y0 < 4 or x1 - x0 < 4: continue
        c = cv2.cvtColor(frames[i][y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32)
        c = cv2.resize(c, (MW, MH))
        crops[i] = (c - c.mean()) / (c.std() + 1e-6)
    mot = np.zeros(n); mmot = np.zeros(n)
    for i in range(1, n):
        mot[i] = float(np.abs(gray[i] - gray[i - 1]).mean())
        mmot[i] = float(np.abs(crops[i] - crops[i - 1]).mean())
    mot[0] = mot[1]; mmot[0] = mmot[1]
    return dict(fps=fps, n=n, openness=openness.tolist(), face=seen.tolist(),
                motion=mot.tolist(), mmotion=mmot.tolist())


if __name__ == "__main__":
    out = {}
    for c in (sys.argv[1:] or CLIPS):
        out[c] = analyse(c)
        o = np.array(out[c]["openness"]); f = np.array(out[c]["face"])
        print(f"{c:20s} n={out[c]['n']} face={f.mean()*100:3.0f}% "
              f"open mean={o.mean():.3f} p90={np.percentile(o,90):.3f}")
    json.dump(out, open("work/mouthsig.json", "w"))
    print("-> work/mouthsig.json")
