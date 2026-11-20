#!/usr/bin/env python3
"""v5: simpler 'signature course' (two falling stickers, no grade) and a golden-ticket invitation that slams on 'invitation'."""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import fxp, fxp3, fxp4
from fxp import W, H, FPS, F, at, grade, rr, put, eob, eout, ease, prog, clamp, scale_about, NAVY, CREAM, INK, GOLD, MINT, HERE
from fxp2 import sticker, fr_idx, _grad

def e_signature(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    fade = 1 - ease(prog(t, D - 0.2, D))
    for txt, ts, y, fg, bg, rot in (("My signature course", 7.55, 130, INK, CREAM, -2), ("All the essentials.", 9.80, 250, INK, GOLD, 2)):
        k = prog(T, ts, ts + 0.3)
        if k <= 0: continue
        yy = y - 260 * (1 - eout(k))                     # falls in from above
        put(out, sticker(txt, 62, fg=fg, bg=bg, rot=rot), W / 2, yy, 1.0, clamp(k * 3) * fade)
    return out

def ticket(w=940, h=430):
    t = _grad((w, h), (255, 232, 150, 255), (196, 146, 44, 255), vertical=False)
    m = Image.new("L", (w, h), 0); md = ImageDraw.Draw(m); md.rounded_rectangle((0, 0, w - 1, h - 1), 36, fill=255)
    for y in (h / 2,): md.ellipse((-44, y - 44, 44, y + 44), fill=0); md.ellipse((w - 44, y - 44, w + 44, y + 44), fill=0)
    d = ImageDraw.Draw(t)
    d.rounded_rectangle((22, 22, w - 23, h - 23), 26, outline=(255, 248, 215, 255), width=4)
    sx = int(w * 0.74)
    for yy in range(40, h - 40, 26): d.line((sx, yy, sx, yy + 12), fill=(140, 100, 20, 200), width=4)
    d.text((sx / 2 + 6, 92), "BEGINNER INVESTING WORKSHOP", font=F("b", 30), fill=NAVY, anchor="mm")
    d.text((sx / 2 + 6, 205), "YOU'RE", font=F("anton", 120), fill=NAVY, anchor="mm")
    d.text((sx / 2 + 6, 318), "INVITED", font=F("anton", 132), fill=NAVY, anchor="mm")
    stub = Image.new("RGBA", (h, w - sx), (0, 0, 0, 0)); ImageDraw.Draw(stub).text((h / 2, (w - sx) / 2), "ADMIT ONE", font=F("anton", 64), fill=NAVY, anchor="mm")
    t.alpha_composite(stub.rotate(90, expand=True), (sx, 0))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); out.paste(t, (0, 0), m); return out
_TK = {}
def e_invite5(T, t, D):
    fr, m = at(T)
    if T < 43.38:
        out = grade(fr, dark=0.18 * ease(t / 0.4))
        q = "Been meaning to learn?"; n = int(len(q) * prog(T, 41.8, 42.8))
        if n > 0:
            note = rr((760, 110), 55, (255, 255, 255, 235)); ImageDraw.Draw(note).text((380, 56), q[:n], font=F("b", 50), fill=NAVY, anchor="mm")
            put(out, note, W / 2, 140, 1.0)
        return out
    out = grade(fr, dark=0.30 * ease(prog(T, 43.38, 43.6)))
    if "t" not in _TK: _TK["t"] = ticket()
    tk = _TK["t"].copy()
    # gold shine sweeps across after it lands
    sw = (T - 44.0) * 2400 - 200
    sh = Image.new("RGBA", tk.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).polygon([(sw, 0), (sw + 140, 0), (sw - 60, tk.height), (sw - 200, tk.height)], fill=(255, 255, 240, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(12)); sh.putalpha(Image.fromarray(np.minimum(np.asarray(sh.getchannel("A")), np.asarray(tk.getchannel("A"))))); tk.alpha_composite(sh)
    fly = eout(prog(T, 43.40, 43.92)); slam = prog(T, 43.92, 44.08)
    s = (0.55 + 0.6 * fly) if slam <= 0 else (1.15 - 0.15 * eout(slam))
    rot = -28 * (1 - fly) - 4
    y = H + 300 - (H + 300 - 1330) * fly
    exitp = ease(prog(T, 44.62, 44.85)); y += 900 * exitp
    put(out, tk, W / 2, y, s, 1.0, rot)
    if slam > 0 and T < 44.3:   # flash + sparkles on the slam
        fl = Image.new("RGBA", (W, H), (255, 240, 200, int(90 * (1 - prog(T, 43.92, 44.15))))); out.alpha_composite(fl)
        rnd = np.random.RandomState(2); d = ImageDraw.Draw(out); q = prog(T, 43.92, 44.3)
        for j in range(22):
            a = rnd.uniform(0, 2 * math.pi); r = 300 + 420 * eout(q) * rnd.uniform(0.6, 1.2)
            x, yy = W / 2 + math.cos(a) * r, 1330 + math.sin(a) * r * 0.55; sz = 16 * (1 - q) + 4
            if yy > 900: d.polygon([(x, yy - sz * 2), (x + sz * .5, yy - sz * .5), (x + sz * 2, yy), (x + sz * .5, yy + sz * .5), (x, yy + sz * 2), (x - sz * .5, yy + sz * .5), (x - sz * 2, yy), (x - sz * .5, yy - sz * .5)], fill=(255, 236, 160, int(255 * (1 - q))))
    return out

BEATS = [b for b in fxp4.BEATS if b[0] not in ("timeline", "invite")] + [("signature", 6.9, 10.3, e_signature, {}), ("invite", 41.7, 44.85, e_invite5, {})]
BEATS.sort(key=lambda b: b[1])

# ---------------------------------------------------------------- v6 ZERO: finger ring becomes the O of a big ZERO
from fxp3 import ring_center, glow_ring
def oval_ring(w, h, width=16, col=(252, 206, 92)):
    s = (int(w + 120), int(h + 120)); im = Image.new("RGBA", s, (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse((60, 60, 60 + w, 60 + h), outline=col + (255,), width=width)
    gl = im.filter(ImageFilter.GaussianBlur(12)); out = Image.new("RGBA", s, (0, 0, 0, 0))
    out.alpha_composite(gl); out.alpha_composite(gl); out.alpha_composite(im); return out
def e_zero6(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.25 * ease(prog(T, 28.3, 28.5)), sat=0.85)
    fade = 1 - ease(prog(t, D - 0.18, D))
    f = F("anton", 230); y = 150
    zw = ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength("ZER", font=f)
    ow, oh = 132, 186; gap = 10; total = zw + gap + ow; x0 = W / 2 - total / 2
    otx, oty = x0 + zw + gap + ow / 2, y - 10
    c = ring_center(min(T, 28.12)) or (260, 715)
    # ring on her fingers
    if T < 28.12:
        p = eob(prog(T, 27.86, 28.02)); pulse = 1 + 0.06 * math.sin(T * 30)
        put(out, glow_ring(44 * p * pulse), c[0], c[1], 1.0, clamp(p * 2), sh=False)
    else:
        q = eout(prog(T, 28.12, 28.36))
        cx = c[0] + (otx - c[0]) * q; cy = c[1] + (oty - c[1]) * q
        w = 88 + (ow - 88) * q; h = 88 + (oh - 88) * q
        put(out, oval_ring(w, h, width=int(12 + 26 * q)), cx, cy, 1.0, fade, sh=False)
        # Z E R slam in as the ring arrives
        lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); xx = x0
        for i, ch in enumerate("ZER"):
            k = prog(T, 28.22 + i * 0.05, 28.32 + i * 0.05)
            cw = d.textlength(ch, font=f)
            if k > 0: d.text((xx, 200 + (1 - eout(k)) * -60), ch, font=f, fill=(252, 206, 92, int(255 * clamp(k * 2) * fade)), anchor="lm", stroke_width=3, stroke_fill=(60, 40, 0, 120))
            xx += cw
        out.alpha_composite(lay, (0, y - 200))
    # BORING / LECTURES on a torso band, then a red strike
    q2 = prog(T, 28.42, 28.6)
    if q2 > 0:
        band = Image.new("RGBA", (W, 600), (12, 18, 30, int(200 * ease(q2) * fade)))
        out.alpha_composite(band.filter(ImageFilter.GaussianBlur(6)), (0, 955))
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        for word, ts, yy, sz in (("BORING", 28.46, 1135, 230), ("LECTURES", 28.84, 1375, 200)):
            pp = prog(T, ts, ts + 0.14)
            if pp <= 0: continue
            sc = 1.25 - 0.25 * eout(pp); wimg = Image.new("RGBA", (W + 300, 300), (0, 0, 0, 0))
            ImageDraw.Draw(wimg).text(((W + 300) / 2, 150), word, font=F("anton", sz), fill=(255, 255, 255, int(255 * fade)), anchor="mm")
            wimg = wimg.resize((int(wimg.width * sc), int(wimg.height * sc)))
            lay.alpha_composite(wimg, (int(W / 2 - wimg.width / 2), int(yy - wimg.height / 2)))
        s = prog(T, 29.10, 29.36)
        if s > 0:
            rnd = np.random.RandomState(3)
            for yy, xa, xb in ((1140, 150, 930), (1380, 110, 970)):
                xe = xa + (xb - xa) * eout(s)
                d.line([(xx, yy + 9 * math.sin(xx / 70) + rnd.uniform(-3, 3)) for xx in np.linspace(xa, xe, 30)], fill=(226, 40, 40, int(255 * fade)), width=30, joint="curve")
        out.alpha_composite(lay)
    return out
BEATS = [b for b in BEATS if b[0] != "zero"] + [("zero", 27.8, 29.8, e_zero6, {})]
BEATS.sort(key=lambda b: b[1])


# ---------------------------------------------------------------- v7 ZERO: rabbit hole from the centre of her finger "O"
def tunnel(fr, c, spin, n=7, ratio=0.66):
    """nested, rotating copies of the frame, all centred on c (the finger circle)."""
    base = fr.convert("RGBA"); out = base.copy()
    for k in range(1, n):
        s = ratio ** k
        cp = base.resize((max(2, int(W * s)), max(2, int(H * s))), Image.Resampling.BILINEAR)
        bd = ImageDraw.Draw(cp); bd.rectangle((0, 0, cp.width - 1, cp.height - 1), outline=(252, 206, 92, 255), width=max(2, int(10 * s)))
        cp = cp.rotate(spin * k, Image.Resampling.BILINEAR, expand=True)
        # each copy's own finger-point sits on c, so the tunnel recedes into the hole
        ox = c[0] - (c[0] * s) ; oy = c[1] - (c[1] * s)
        out.alpha_composite(cp, (int(ox - (cp.width - W * s) / 2), int(oy - (cp.height - H * s) / 2)))
    return out
def e_zero7(T, t, D):
    fr, m = at(T)
    c = ring_center(min(T, 28.40)) or (260, 715)
    if T < 28.46:
        out = fr.convert("RGBA")
        p = eob(prog(T, 27.86, 28.0))
        h = prog(T, 28.0, 28.44)                       # into the hole
        if h > 0:
            R = 44 + (2200 - 44) * (h ** 2.2)          # the hole opens from the fingers to full frame
            tun = tunnel(fr, c, spin=-40 * h - 10)
            mk = Image.new("L", (W, H), 0); ImageDraw.Draw(mk).ellipse((c[0] - R, c[1] - R, c[0] + R, c[1] + R), fill=255)
            out = Image.composite(tun, out, mk.filter(ImageFilter.GaussianBlur(3)))
            z = 1 + 1.6 * ease(h)                      # camera dives into the hole
            out = scale_about(out, z, c[0] / W, c[1] / H)
        if T < 28.2:
            put(out, glow_ring(44 * max(p, 0.01) * (1 + 3 * h)), c[0] if h == 0 else c[0], c[1], 1.0, clamp(p * 2) * (1 - h * 2), sh=False)
        return out
    # out the other side: flash, gold ZERO across the top, BORING / LECTURES struck out
    out = e_zero6(max(T, 28.37), t, D) if T < 28.40 else e_zero6(T, t, D)
    fl = 1 - prog(T, 28.46, 28.62)
    if fl > 0: out.alpha_composite(Image.new("RGBA", (W, H), (255, 244, 210, int(160 * fl))))
    return out
BEATS = [b for b in BEATS if b[0] != "zero"] + [("zero", 27.8, 29.8, e_zero6, {})]  # v7 rabbit hole rejected
BEATS.sort(key=lambda b: b[1])

def render(name):
    nm, a, b, fn, kw = next(x for x in BEATS if x[0] == name)
    i0, i1 = fr_idx(a), fr_idx(b); n = i1 - i0; fxp.load_window(i0 / FPS, i1 / FPS)
    out = f"{HERE}/segs3/{nm}.mp4"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for k in range(n):
        T = (i0 + k) / FPS; p.stdin.write(fn(T, T - i0 / FPS, n / FPS, **kw).convert("RGB").tobytes())
    p.stdin.close(); p.wait(); print("wrote", out, n, "frames")

if __name__ == "__main__":
    if sys.argv[1] == "still":
        nm, T = sys.argv[2], float(sys.argv[3]); _, a, b, fn, kw = next(x for x in BEATS if x[0] == nm)
        fxp.load_window(T, T + 1 / FPS); fn(T, T - a, b - a).convert("RGB").save(f"{HERE}/stills/v5_{nm}_{T:.2f}.jpg", quality=88); print("still", nm, T)
    else:
        for nm in sys.argv[2].split(","): render(nm)

