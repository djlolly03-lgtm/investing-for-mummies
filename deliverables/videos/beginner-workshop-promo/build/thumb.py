#!/usr/bin/env python3
"""Opening thumbnail card (first frame = a full, logo-quality cover). 24 frames, slow push. -> segs/thumb.mp4 + stills/thumb.jpg"""
import subprocess
from PIL import Image, ImageDraw, ImageFilter
import fxp
from fxp import W, H, FPS, F, at, cutout, rr, shadow, NAVY, GOLD, CREAM, INK, MINT, REPO, HERE, scale_about

LOGO = f"{REPO}/brand/logos/IFM-logo-round-1119px-transparent-no-TM.png"
fxp.load_window(48.4, 48.4 + 1 / FPS)
fr, m = at(48.4)

def card():
    bg = Image.new("RGBA", (W, H), CREAM + (255,)); d = ImageDraw.Draw(bg)
    for y in range(H):  # soft mint glow behind her
        pass
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(glow).ellipse((60, 620, 1020, 1700), fill=MINT + (255,))
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))
    her = cutout(fr, m, 1.5, erode=3)
    her = scale_about(her, 1.08, 0.5, 1.0)
    bg.alpha_composite(her, (0, 560))
    logo = Image.open(LOGO).convert("RGBA").resize((250, 250), Image.Resampling.LANCZOS)
    bg.alpha_composite(logo, ((W - 250) // 2, 70))
    d = ImageDraw.Draw(bg)
    d.text((W / 2, 410), "Learn how", font=F("serif", 100), fill=NAVY, anchor="mm")
    d.text((W / 2, 515), "investing works", font=F("serif", 104), fill=NAVY, anchor="mm")
    pill = rr((720, 92), 46, GOLD + (255,)); ImageDraw.Draw(pill).text((360, 47), "NEW · 5-DAY BEGINNER WORKSHOP", font=F("b", 36), fill=INK, anchor="mm")
    sc, b = shadow(pill, (0, 10), 18, 90); bg.alpha_composite(sc, ((W - 720) // 2 - b, 1600 - b))
    return bg

c = card(); c.convert("RGB").save(f"{HERE}/stills/thumb.jpg", quality=93)
p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                      "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", f"{HERE}/segs/thumb.mp4"], stdin=subprocess.PIPE)
for i in range(24):
    p.stdin.write(scale_about(c.convert("RGB"), 1 + 0.02 * i / 23, 0.5, 0.45).tobytes())
p.stdin.close(); p.wait(); print("thumb ok")
