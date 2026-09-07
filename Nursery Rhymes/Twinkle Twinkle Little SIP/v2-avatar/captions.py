#!/usr/bin/env python3
"""Playbook 8 - the caption overlay, rebuilt FROM the measured verse timings.

Editing meta.json alone does nothing: the ffmpeg command has the
enable='between(t,..)' literals baked in, so it is regenerated here every run.

Style matches v1: Nunito Bold, white fill, navy outline, soft drop shadow.
Timings are the measured vocal onsets (pitch-tracked for verse 1), not whisper.
"""
import subprocess, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
CAP_Y = 1418                      # sits in the lower third, clear of Reels UI
FONT = os.path.expanduser("~/Library/Fonts/fixed-Nunito-Bold.ttf")
WHITE = (255, 255, 255, 255)
NAVY = (26, 58, 92, 255)          # --navy / --ink
os.makedirs("caps2", exist_ok=True)

LINES = [
    (4.16,  6.96, "Twinkle, twinkle, little SIP,"),
    (7.12,  9.60, "small small coins on every trip."),
    (9.94, 12.10, "Save one rupee, then save more,"),
    (12.43, 14.60, "watch it grow like never before."),
    (14.86, 17.10, "Put it in the money jar,"),
    (17.34, 19.60, "don't touch it, let it go far."),
    (19.77, 22.10, "Wait and wait, don't take it out,"),
    (22.28, 24.50, "that's what saving is about."),
    (24.75, 26.95, "Twinkle, twinkle, little SIP,"),
    (27.23, 29.50, "slow and steady wins the trip."),
    (29.77, 30.90, "Time is magic,"),
    (30.98, 31.90, "patience too,"),
    (32.17, 33.00, "that's the trick"),
    (33.09, 34.55, "that money knew."),
]

def render(text, idx):
    size = 62
    f = ImageFont.truetype(FONT, size)
    while f.getbbox(text)[2] - f.getbbox(text)[0] > W - 110 and size > 34:
        size -= 2
        f = ImageFont.truetype(FONT, size)
    bb = f.getbbox(text)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad, stroke = 34, 7
    im = Image.new("RGBA", (W, th + pad * 2), (0, 0, 0, 0))
    x, y = (W - tw) // 2 - bb[0], pad - bb[1]
    # soft drop shadow
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x, y + 7), text, font=f, fill=(12, 26, 42, 150),
                            stroke_width=stroke, stroke_fill=(12, 26, 42, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7)))
    ImageDraw.Draw(im).text((x, y), text, font=f, fill=WHITE,
                            stroke_width=stroke, stroke_fill=NAVY)
    p = f"caps2/cap{idx:02d}.png"
    im.save(p)
    return p, im.size[1]

meta = []
for i, (a, b, t) in enumerate(LINES):
    p, h = render(t, i)
    meta.append({"file": p, "start": a, "end": b, "h": h, "text": t})
json.dump(meta, open("caps2/meta.json", "w"), indent=1)
print(f"{len(meta)} captions rendered")

SRC = "twinkle-twinkle-little-sip-v2.mp4"
OUT = "twinkle-twinkle-little-sip-v2-CAPTIONED.mp4"
inputs, filt, prev = ["-i", SRC], [], "0:v"
for i, m in enumerate(meta):
    inputs += ["-i", m["file"]]
    y = CAP_Y - m["h"] // 2
    filt.append(f"[{prev}][{i+1}:v]overlay=0:{y}:"
                f"enable='between(t,{m['start']},{m['end']})'[v{i}]")
    prev = f"v{i}"
cmd = (["ffmpeg", "-y", "-v", "error"] + inputs +
       ["-filter_complex", ";".join(filt), "-map", f"[{prev}]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "copy", OUT])
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode:
    print(r.stderr[-2500:]); raise SystemExit(1)
print("->", OUT)
