#!/usr/bin/env python3
"""Playbook 2.1 - mouth frame-strip at 1/8s across the WHOLE clip.
Haar-detect the face per frame, median-smooth the box over time (the raw
detection jitters), crop the mouth, tile 16 per row = 2s per row."""
import cv2, numpy as np, sys, json

STEP = 1 / 8
cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def strip(clip, t0=0.0, t1=10.0, tile=(104, 84), per_row=16):
    cap = cv2.VideoCapture(f"src/{clip}.mp4")
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok: break
        frames.append(fr)
    cap.release()
    n = len(frames)
    # detect on every frame at reduced size
    boxes = np.full((n, 4), np.nan)
    for i, fr in enumerate(frames):
        g = cv2.cvtColor(cv2.resize(fr, (360, 640)), cv2.COLOR_BGR2GRAY)
        f = cas.detectMultiScale(g, 1.1, 5, minSize=(45, 45))
        if len(f):
            boxes[i] = max(f, key=lambda b: b[2] * b[3])
    # interpolate gaps, then median-smooth
    idx = np.arange(n)
    for k in range(4):
        col = boxes[:, k]; good = ~np.isnan(col)
        if good.sum() < 5: return None
        boxes[:, k] = np.interp(idx, idx[good], col[good])
    sm = boxes.copy()
    for k in range(4):
        sm[:, k] = np.array([np.median(boxes[max(0, i - 4):i + 5, k]) for i in range(n)])
    sx, sy = frames[0].shape[1] / 360, frames[0].shape[0] / 640
    tiles = []
    t = t0
    while t < t1:
        i = int(round(t * fps))
        if i >= n: break
        x, y, w, h = sm[i]
        x, y, w, h = x * sx, y * sy, w * sx, h * sy
        my0, my1 = int(y + h * 0.52), int(y + h * 1.06)
        mx0, mx1 = int(x + w * 0.12), int(x + w * 0.88)
        H_, W_ = frames[i].shape[:2]
        my0, my1 = max(0, my0), min(H_, my1); mx0, mx1 = max(0, mx0), min(W_, mx1)
        c = frames[i][my0:my1, mx0:mx1]
        c = cv2.resize(c, (tile[0], tile[1] - 14)) if c.size else np.zeros((tile[1] - 14, tile[0], 3), np.uint8)
        lab = np.zeros((14, tile[0], 3), np.uint8)
        cv2.putText(lab, f"{t:.3f}", (2, 11), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (255, 255, 255), 1)
        tiles.append(np.vstack([c, lab]))
        t += STEP
    rows = [np.hstack(tiles[i:i + per_row]) for i in range(0, len(tiles), per_row)]
    wmax = max(r.shape[1] for r in rows)
    rows = [np.hstack([r, np.zeros((r.shape[0], wmax - r.shape[1], 3), np.uint8)])
            if r.shape[1] < wmax else r for r in rows]
    return np.vstack(rows)

if __name__ == "__main__":
    clip = sys.argv[1]; t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0
    img = strip(clip, t0, t1)
    out = f"strips/MOUTH-{clip}.png"
    cv2.imwrite(out, img); print(out, img.shape)
