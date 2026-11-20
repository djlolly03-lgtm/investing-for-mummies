#!/usr/bin/env python3
"""Custom 1080x1920 effects for the beginner-workshop promo (part 2). Builds on fxp.py.
  python fxp2.py still <name> <T>       -> stills/<name>_<T>.jpg
  python fxp2.py render <name>|all      -> segs/<name>.mp4 (frame-exact for the beat window in BEATS)
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import fxp
from fxp import (W, H, FPS, F, at, cutout, grade, glass, rr, shadow, put, scale_about, clamp, ease, eout, eob, prog,
                 NAVY, MINT, GOLD, CREAM, INK, REPO, HERE, e_jargon_wall, e_green_room, e_frame_break, e_register)

A = f"{HERE}/assets"
def photo(p, size, centering=(0.5, 0.5)):
    return ImageOps.fit(ImageOps.exif_transpose(Image.open(p)).convert("RGB"), size, Image.Resampling.LANCZOS, centering=centering)

def head_top(m):
    a = np.asarray(m) > 128; rows = np.where(a.any(axis=1))[0]
    return int(rows[0]) if len(rows) else 300

def sticker(text, size=64, fg=INK, bg=CREAM, font="serif", pad=(30, 16), rot=0):
    f = F(font, size); d0 = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tw = int(d0.textlength(text, font=f)); im = Image.new("RGBA", (tw + 2 * pad[0], size + 2 * pad[1] + 8), bg + (255,))
    ImageDraw.Draw(im).text((im.width / 2, im.height / 2 + 2), text, font=f, fill=fg, anchor="mm")
    return im.rotate(rot, Image.Resampling.BICUBIC, expand=True) if rot else im

# ---------------------------------------------------------------- 1 glass-type search bar + name lower-third
def e_search(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    q = "how do I even start investing?"
    p = eob(prog(t, 0.0, 0.35)); n = int(len(q) * prog(t, 0.15, 1.85))
    if p > 0:
        bw, bh = 940, 128; x0 = (W - bw) / 2; y0 = 90 + (1 - p) * -160
        card = glass(out, (x0, max(0, y0), x0 + bw, max(0, y0) + bh), r=64, tint=(255, 255, 255, 150))
        d = ImageDraw.Draw(card)
        d.ellipse((44, 40, 88, 84), outline=(60, 70, 90), width=6); d.line((82, 80, 100, 98), fill=(60, 70, 90), width=7)
        txt = q[:n] + ("|" if int(t * 2.4) % 2 == 0 or n < len(q) else " ")
        d.text((128, bh / 2), txt, font=F("b", 44), fill=INK, anchor="lm")
        sc, b = shadow(card, (0, 12), 22, 80); out.alpha_composite(sc, (int(x0 - b), int(max(0, y0) - b)))
    # name lower-third (Hiral, first time on screen)
    lp = eout(prog(t, 0.6, 1.0)) * (1 - ease(prog(t, D - 0.3, D)))
    if lp > 0:
        bar = Image.new("RGBA", (640, 150), (0, 0, 0, 0)); d = ImageDraw.Draw(bar)
        d.rounded_rectangle((0, 0, 639, 86), 14, fill=NAVY + (240,)); d.text((30, 43), "Hiral Goel", font=F("serif", 54), fill=CREAM, anchor="lm")
        d.rounded_rectangle((0, 94, 560, 146), 12, fill=GOLD + (245,)); d.text((22, 120), "Founder, Investing for Mummies", font=F("b", 30), fill=INK, anchor="lm")
        out.alpha_composite(bar, (int(60 - (1 - lp) * 700), 1470))
    return out

# ---------------------------------------------------------------- 2 NEW backdrop word
def e_new(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.35 * ease(t / 0.3), sat=0.9)
    f = F("anton", 620); lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    p = eout(prog(t, 0.0, 0.35)); y = 470 - (1 - p) * 120
    d.text((W / 2, y), "NEW", font=f, fill=GOLD + (int(255 * p),), anchor="mm")
    out.alpha_composite(lay)
    out.alpha_composite(cutout(fr, m))
    k = eob(prog(T, 11.62, 11.95))
    if k > 0:
        put(out, sticker("BEGINNER WORKSHOP", 52, fg=CREAM, bg=NAVY, font="b"), W / 2, 1450, k)
    return out

# ---------------------------------------------------------------- 3 decode + doodle-boil question marks
DOODLES = [("SIP?", 175, 330, -8), ("XIRR?", 905, 300, 7), ("NAV?", 165, 620, 6), ("ELSS?", 915, 600, -6)]
def e_decode(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    # 'decode' scramble title on the word (13.70)
    k = prog(T, 13.62, 14.5); fade = 1 - ease(prog(T, 15.0, 15.3))
    if k > 0 and fade > 0:
        target = "DECODE"; rnd = np.random.RandomState(int(T * FPS))
        s = "".join(c if prog(T, 13.62 + 0.11 * i, 13.75 + 0.11 * i) >= 1 else "#%&$@?X!"[rnd.randint(8)] for i, c in enumerate(target))
        lay = Image.new("RGBA", (W, 300), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        d.text((W / 2 + 6, 156), s, font=F("mono", 170), fill=(0, 0, 0, int(120 * fade)), anchor="mm")
        d.text((W / 2, 150), s, font=F("mono", 170), fill=MINT + (int(255 * fade),), anchor="mm")
        out.alpha_composite(lay, (0, 40))
    # marker doodles boil around her from 'concepts' (15.20)
    frame = int(T * FPS) // 3; rnd = np.random.RandomState(frame)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i, (w, x, y, r) in enumerate(DOODLES):
        p = prog(T, 15.15 + i * 0.16, 15.35 + i * 0.16)
        if p <= 0: continue
        jx, jy = rnd.uniform(-3, 3, 2)
        tl = Image.new("RGBA", (420, 200), (0, 0, 0, 0)); td = ImageDraw.Draw(tl)
        td.text((210 + jx, 100 + jy), w, font=F("marker", 66), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(20, 30, 48))
        cx, cy = 210 + rnd.uniform(-4, 4), 100 + rnd.uniform(-4, 4)
        td.ellipse((cx - 150, cy - 66, cx + 150, cy + 68), outline=(255, 214, 10), width=7)
        tl = tl.rotate(r + rnd.uniform(-1.5, 1.5), Image.Resampling.BICUBIC)
        sc = eob(p); tl2 = tl.resize((max(1, int(420 * sc)), max(1, int(200 * sc))))
        lay.alpha_composite(tl2, (int(x - tl2.width / 2), int(y - tl2.height / 2)))
    # doodles sit BEHIND her body where they overlap
    out.alpha_composite(lay); out.alpha_composite(cutout(fr, m))
    return out

# ---------------------------------------------------------------- 4 portfolio tiles
TILES = [("Stocks", 20.92), ("Mutual funds", 21.48), ("Gold", 22.12)]
SS = 4  # supersample
def _grad(size, c0, c1, vertical=True):
    w, h = size; a = np.linspace(0, 1, h if vertical else w)[:, None] if vertical else np.linspace(0, 1, w)[None, :]
    c0, c1 = np.array(c0, np.float32), np.array(c1, np.float32)
    g = c0 + (c1 - c0) * a[..., None]
    g = np.broadcast_to(g, (h, w, len(c0))).astype(np.uint8)
    return Image.fromarray(g, "RGBA" if len(c0) == 4 else "RGB").convert("RGBA")
def _mask_rr(size, r):
    m = Image.new("L", size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255); return m
def _tile_base(w, h, c0, c1):
    b = _grad((w, h), c0, c1); m = _mask_rr((w, h), int(0.16 * w))
    hl = Image.new("RGBA", (w, h), (0, 0, 0, 0)); hd = ImageDraw.Draw(hl)
    hd.ellipse((-0.3 * w, -0.75 * h, 1.3 * w, 0.42 * h), fill=(255, 255, 255, 46))      # top gloss
    b.alpha_composite(hl)
    ImageDraw.Draw(b).rounded_rectangle((3 * SS, 3 * SS, w - 3 * SS, h - 3 * SS), int(0.16 * w) - 3 * SS, outline=(255, 255, 255, 90), width=2 * SS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); out.paste(b, (0, 0), m); return out
def _icon_stocks(w):
    im = Image.new("RGBA", (w, w), (0, 0, 0, 0)); d = ImageDraw.Draw(im); u = w / 100
    cand = [(18, 62, 74, 56, 70), (32, 50, 66, 60, 52), (46, 40, 58, 48, 44), (60, 46, 54, 30, 50), (74, 24, 44, 22, 30)]
    for x, hi, lo, op, cl in cand:
        up = cl < op; col = (120, 230, 190, 255) if up else (255, 140, 120, 255)
        d.line((x * u, hi * u, x * u, lo * u), fill=(255, 255, 255, 200), width=int(1.6 * u))
        d.rounded_rectangle(((x - 4.5) * u, min(op, cl) * u, (x + 4.5) * u, max(op, cl) * u + 2 * u), int(1.5 * u), fill=col)
    pts = [(12 * u, 80 * u), (36 * u, 64 * u), (54 * u, 70 * u), (86 * u, 32 * u)]
    d.line(pts, fill=(252, 206, 92, 255), width=int(5 * u), joint="curve")
    ax, ay = 86 * u, 32 * u; d.polygon([(ax + 4 * u, ay - 6 * u), (ax - 9 * u, ay - 4 * u), (ax + 2 * u, ay + 8 * u)], fill=(252, 206, 92, 255))
    return im
def _icon_mf(w):
    im = Image.new("RGBA", (w, w), (0, 0, 0, 0)); d = ImageDraw.Draw(im); u = w / 100
    segs = [(0, 120, (26, 58, 92)), (120, 210, (201, 168, 76)), (210, 290, (64, 160, 150)), (290, 360, (236, 120, 100))]
    box = (14 * u, 12 * u, 86 * u, 84 * u)
    for a0, a1, c in segs: d.pieslice(box, a0 - 90 + 2, a1 - 90 - 2, fill=c + (255,))
    d.ellipse((33 * u, 31 * u, 67 * u, 65 * u), fill=(255, 255, 255, 255))
    for k in range(3): d.ellipse(((40 + 0) * u, (50 - 6 * k) * u, 60 * u, (56 - 6 * k) * u), fill=(201, 168, 76, 255), outline=(150, 120, 40, 255), width=int(u))
    return im
def _icon_gold(w):
    im = Image.new("RGBA", (w, w), (0, 0, 0, 0)); u = w / 100
    def bar(cx, cy):
        b = Image.new("RGBA", (int(40 * u), int(22 * u)), (0, 0, 0, 0)); bd = ImageDraw.Draw(b)
        top = [(8 * u, 0), (32 * u, 0), (40 * u, 22 * u), (0, 22 * u)]
        g = _grad(b.size, (255, 236, 160, 255), (196, 140, 30, 255))
        m = Image.new("L", b.size, 0); ImageDraw.Draw(m).polygon(top, fill=255); b.paste(g, (0, 0), m)
        bd.polygon([(8 * u, 0), (32 * u, 0), (34 * u, 6 * u), (6 * u, 6 * u)], fill=(255, 248, 210, 255))
        bd.line([(12 * u, 14 * u), (28 * u, 14 * u)], fill=(170, 120, 20, 160), width=int(1.2 * u))
        im.alpha_composite(b, (int(cx - 20 * u), int(cy - 11 * u)))
    bar(30, 0) if False else None
    for cx, cy in [(30 * u, 74 * u), (70 * u, 74 * u), (50 * u, 52 * u)]: bar(cx, cy)
    d = ImageDraw.Draw(im)  # sparkle
    sx, sy = 74 * u, 30 * u
    d.polygon([(sx, sy - 10 * u), (sx + 2.5 * u, sy - 2.5 * u), (sx + 10 * u, sy), (sx + 2.5 * u, sy + 2.5 * u), (sx, sy + 10 * u), (sx - 2.5 * u, sy + 2.5 * u), (sx - 10 * u, sy), (sx - 2.5 * u, sy - 2.5 * u)], fill=(255, 255, 255, 240))
    return im
TILE_STYLE = {"Stocks": ((40, 82, 128, 255), (14, 34, 60, 255), _icon_stocks, (255, 255, 255)),
              "Mutual funds": ((214, 245, 240, 255), (150, 210, 200, 255), _icon_mf, (20, 30, 48)),
              "Gold": ((255, 246, 222, 255), (238, 206, 140, 255), _icon_gold, (60, 40, 10))}
_tcache = {}
def tile_img(name, col=None):
    if name in _tcache: return _tcache[name]
    w, h = 300 * SS, 330 * SS; c0, c1, fn, tc = TILE_STYLE[name]
    t = _tile_base(w, h, c0, c1)
    ic = fn(200 * SS); t.alpha_composite(ic, ((w - ic.width) // 2, 22 * SS))
    ImageDraw.Draw(t).text((w / 2, 280 * SS), name, font=F("b", (40 if len(name) < 8 else 34) * SS), fill=tc, anchor="mm")
    t = t.resize((300, 330), Image.Resampling.LANCZOS); _tcache[name] = t; return t

def e_portfolio(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    ht = head_top(m)
    tog = eout(prog(T, 22.62, 23.15))   # 'together' -> snap into one card
    fade = 1 - ease(prog(t, D - 0.25, D))
    if tog > 0:
        cw, ch = 1000, 380; x0 = (W - cw) / 2; y0 = 60
        card = glass(out, (x0, y0, x0 + cw, y0 + ch), r=48, tint=(255, 255, 255, 110))
        ImageDraw.Draw(card).text((cw / 2, ch - 38), "Your portfolio", font=F("serif", 46), fill=CREAM, anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0, 80))
        card.putalpha(card.getchannel("A").point(lambda v: int(v * tog * fade))); out.alpha_composite(card, (int(x0), y0))
    for i, (name, ts) in enumerate(TILES):
        p = prog(T, ts - 0.08, ts + 0.25)
        if p <= 0: continue
        tx = 220 + i * 320; ty = 225; sx, sy = tx, ty + 20
        x = sx + (tx - sx) * tog; y = sy + (ty - sy) * tog
        put(out, tile_img(name), x, y, eob(p) * (1 - 0.12 * tog), fade, rot=[-6, 3, 7][i] * (1 - tog))
    return out

# ---------------------------------------------------------------- 5 economy -> returns chart (shape only, no figures)
def e_economy(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.15 * ease(t / 0.3))
    p = eob(prog(t, 0.0, 0.4)); fade = 1 - ease(prog(t, D - 0.25, D))
    cw, ch = 960, 520; x0 = (W - cw) / 2; y0 = 70
    if p > 0:
        card = glass(out, (x0, y0, x0 + cw, y0 + ch), r=44, tint=(18, 30, 50, 170), edge=(255, 255, 255, 90))
        d = ImageDraw.Draw(card)
        d.text((44, 52), "The economy", font=F("b", 38), fill=GOLD, anchor="lm"); d.text((cw - 44, 52), "your returns", font=F("b", 38), fill=MINT, anchor="rm")
        for k in range(4): d.line((44, 130 + k * 90, cw - 44, 130 + k * 90), fill=(255, 255, 255, 40), width=2)
        g = prog(T, 25.7, 27.4)  # draw on 'economy' -> 'returns'
        N = 90; xs = [44 + (cw - 88) * i / N for i in range(N + 1)]
        eco = [300 + 70 * math.sin(i / 9) - 90 * i / N + 25 * math.sin(i / 3.1) for i in range(N + 1)]
        ret = [e - 40 + 30 * math.sin(i / 6 + 0.8) - 60 * (i / N) ** 2 for i, e in enumerate(eco)]
        k = max(2, int(N * g))
        if g > 0:
            d.line(list(zip(xs[:k], eco[:k])), fill=GOLD, width=9, joint="curve")
            d.line(list(zip(xs[:k], ret[:k])), fill=MINT, width=9, joint="curve")
            d.ellipse((xs[k - 1] - 14, eco[k - 1] - 14, xs[k - 1] + 14, eco[k - 1] + 14), fill=GOLD)
            d.ellipse((xs[k - 1] - 14, ret[k - 1] - 14, xs[k - 1] + 14, ret[k - 1] + 14), fill=MINT)
        card.putalpha(card.getchannel("A").point(lambda v: int(v * clamp(p) * fade)))
        sc, b = shadow(card, (0, 14), 24, 100); out.alpha_composite(sc, (int(x0 - b), int(y0 - b + (1 - p) * -200)))
    out.alpha_composite(cutout(fr, m))
    return out

# ---------------------------------------------------------------- 6 couch-wall of game screens
def e_gamewall(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.25)
    files = sorted(os.listdir(f"{A}/games")); cols, rows = 3, 4; tw, th = W // cols, int(H * 0.66) // rows
    wall = Image.new("RGBA", (W, int(H * 0.66)), (18, 18, 22, int(255 * clamp(t / 0.15))))
    out.alpha_composite(wall)
    for i in range(cols * rows):
        p = prog(t, 0.02 + ((i * 5) % 12) * 0.035, 0.2 + ((i * 5) % 12) * 0.035)
        if p <= 0: continue
        im = photo(f"{A}/games/{files[i % len(files)]}", (tw - 16, th - 16), (0.5, 0.3)).convert("RGBA")
        im = Image.composite(im, Image.new("RGBA", im.size, 0), Image.fromarray(np.uint8(np.asarray(rr(im.size, 14, (255, 255, 255, 255)).getchannel("A")))))
        put(out, im, (i % cols) * tw + tw / 2, (i // cols) * th + th / 2, 0.75 + 0.25 * eob(p), sh=False)
    out.alpha_composite(cutout(fr, m))
    k = eob(prog(T, 31.85, 32.2))
    if k > 0: put(out, sticker("Simple analogies.", 64, fg=INK, bg=(252, 200, 70)), W / 2, 1450, k, rot=-3)
    return out

# ---------------------------------------------------------------- 7 class b-roll (her voice continues)
_clips = {}
def clip_frames(path, ss, dur, key, fit="cover"):
    """Decode a short window of an SDR clip at 30 fps, 1080x1920 (cover crop)."""
    if key not in _clips:
        import subprocess
        vf = f"fps=30,scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},eq=saturation=1.06"
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ss), "-t", str(dur), "-i", path, "-vf", vf,
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        _clips[key] = [Image.frombuffer("RGB", (W, H), raw[k * W * H * 3:(k + 1) * W * H * 3]).copy() for k in range(len(raw) // (W * H * 3))]
    fs = _clips[key]; return fs
def clip_at(path, ss, dur, key, lt):
    fs = clip_frames(path, ss, dur, key); return fs[min(len(fs) - 1, max(0, int(lt * FPS)))]

SR = "/Users/lollyg/Documents/investing for Mummies/highlight-reel-assets/games/stockrush-teaser.mp4"
C03 = f"{A}/sdr_03-live-class-clip-a.mov"; C11 = f"{A}/sdr_11-live-class-clip-b.mov"
_sr = {}
def stockrush_frame(lt):
    if "f" not in _sr:
        import subprocess
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", "2.0", "-t", "1.4", "-i", SR, "-vf", "fps=30,scale=1000:-2",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        h = len(raw) // (1000 * 3) // max(1, len(raw) // (1000 * 3) // 563)  # rows per frame
        fh = 562 if (len(raw) % (1000 * 562 * 3) == 0) else 563
        _sr["f"] = [Image.frombuffer("RGB", (1000, fh), raw[k * 1000 * fh * 3:(k + 1) * 1000 * fh * 3]).copy() for k in range(len(raw) // (1000 * fh * 3))]
    fs = _sr["f"]; return fs[min(len(fs) - 1, int(lt * FPS))]

def e_broll(T, t, D):
    # 33.17-34.42 "simulations": Stock Rush gameplay on a tablet, over the class (blurred)
    if T < 34.42:
        lt = T - 33.17
        bg = clip_at(C11, 8.0, 1.4, "c11sim", lt).filter(ImageFilter.GaussianBlur(14)).convert("RGBA")
        bg.alpha_composite(Image.new("RGBA", (W, H), (10, 20, 36, 120)))
        scr = stockrush_frame(lt).convert("RGBA")
        tab = Image.new("RGBA", (scr.width + 60, scr.height + 60), (0, 0, 0, 0))
        ImageDraw.Draw(tab).rounded_rectangle((0, 0, tab.width - 1, tab.height - 1), 46, fill=(18, 18, 22, 255))
        sm = _mask_rr(scr.size, 18); tab.paste(scr, (30, 30), sm)
        p = eob(prog(lt, 0.0, 0.35))
        put(bg, tab, W / 2, 880 + (1 - p) * 500, 0.85 + 0.15 * p, rot=-4 * (1 - p))
        k = eob(prog(lt, 0.15, 0.45))
        put(bg, sticker("Simulations.", 70, fg=INK, bg=CREAM, rot=-3), W / 2, 1650, k)
        return bg
    # 34.42-36.30 "really fun discussions": women talking and laughing round the table (clip 03)
    if T < 35.30:
        im = clip_at(C03, 0.5, 1.0, "c03a", T - 34.42).convert("RGBA")
    else:
        im = clip_at(C03, 12.6, 1.1, "c03b", T - 35.30).convert("RGBA")
    k = eob(prog(T, 34.55, 34.85))
    put(im, sticker("Fun discussions.", 70, fg=INK, bg=(252, 200, 70), rot=2), W / 2, 1650, k)
    return im

def e_room(T, t, D):
    """'a room full of curious women': the real classroom, wide, slow push; her voice continues."""
    im = clip_at(C11, 8.6, D + 0.2, "c11room", t)
    im = scale_about(im, 1.0 + 0.04 * t / D, 0.5, 0.45).convert("RGBA")
    k = eob(prog(T, 38.2, 38.55))
    put(im, sticker("A room full of curious women.", 58, fg=CREAM, bg=NAVY, font="serif"), W / 2, 1650, k)
    return im

def e_nolecture(T, t, D):
    """'Zero boring lectures': ZERO stamps above her head, BORING / LECTURES slam onto a dark band across her torso
    (never the face), then a red marker strikes both out."""
    fr, m = at(T); out = grade(fr, dark=0.25 * ease(t / 0.25), sat=0.8)
    fade = 1 - ease(prog(t, D - 0.18, D))
    band = Image.new("RGBA", (W, 560), (12, 18, 30, int(190 * ease(prog(T, 28.38, 28.5)) * fade)))
    out.alpha_composite(band.filter(ImageFilter.GaussianBlur(6)), (0, 1000))
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for word, ts, y, sz in (("BORING", 28.40, 1135, 230), ("LECTURES", 28.84, 1375, 200)):
        p = prog(T, ts, ts + 0.14)
        if p <= 0: continue
        sc = 1.25 - 0.25 * eout(p); wimg = Image.new("RGBA", (W + 300, 300), (0, 0, 0, 0))
        ImageDraw.Draw(wimg).text(((W + 300) / 2, 150), word, font=F("anton", sz), fill=(255, 255, 255, int(255 * fade)), anchor="mm")
        wimg = wimg.resize((int(wimg.width * sc), int(wimg.height * sc)))
        lay.alpha_composite(wimg, (int(W / 2 - wimg.width / 2), int(y - wimg.height / 2)))
    q = prog(T, 29.10, 29.36)
    if q > 0:
        rnd = np.random.RandomState(3)
        for y, x0, x1 in ((1140, 150, 930), (1380, 110, 970)):
            xe = x0 + (x1 - x0) * eout(q)
            pts = [(x, y + 9 * math.sin(x / 70) + rnd.uniform(-3, 3)) for x in np.linspace(x0, xe, 30)]
            d.line(pts, fill=(226, 40, 40, int(255 * fade)), width=30, joint="curve")
    out.alpha_composite(lay)
    z = eob(prog(T, 28.10, 28.32)) * fade
    if z > 0:
        put(out, sticker("ZERO", 130, fg=INK, bg=GOLD, font="anton", pad=(40, 4), rot=-6), W / 2, 120, 0.6 + 0.4 * z, clamp(z * 2))
    return out

# ---------------------------------------------------------------- 8 glass widgets: 5 days / 2 hrs a day
def widget(big, small, w=430, h=300, bgsrc=None, box=None):
    card = glass(bgsrc, box, r=56, tint=(255, 255, 255, 120)); d = ImageDraw.Draw(card)
    d.text((44, 130), big, font=F("archivo", 120), fill=(255, 255, 255), anchor="lm", stroke_width=2, stroke_fill=(0, 0, 0, 60))
    d.text((48, 240), small, font=F("b", 40), fill=(255, 255, 255), anchor="lm", stroke_width=1, stroke_fill=(0, 0, 0, 60))
    return card
def e_widgets(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    fade = 1 - ease(prog(t, D - 0.2, D))
    for i, (big, small, ts) in enumerate([("5", "days", 36.32), ("2 hrs", "a day", 37.25)]):
        p = eob(prog(T, ts, ts + 0.32))
        if p <= 0: continue
        x0 = [70, 580][i]; y0 = 70 + i * 40
        c = widget(big, small, bgsrc=out, box=(x0, y0, x0 + 430, y0 + 300))
        put(out, c, x0 + 215, y0 + 150 + (1 - p) * 60, 0.6 + 0.4 * p, fade * clamp(p * 2))
    return out

# ---------------------------------------------------------------- 9 polaroid fan of happy cohorts
def polaroid(p, rot):
    ph = photo(p, (420, 420), (0.5, 0.42)); im = Image.new("RGBA", (460, 540), (252, 250, 245, 255)); im.paste(ph, (20, 20))
    return im
def e_fan(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    files = [f"{A}/cohorts/{k}.jpg" for k in (1, 2, 3, 4)]
    fade = 1 - ease(prog(t, D - 0.2, D))
    for i, fp in enumerate(files):
        p = prog(t, 0.05 + i * 0.12, 0.45 + i * 0.12)
        if p <= 0: continue
        ang = (-24 + i * 16) * eout(p); x = W / 2 + (-300 + i * 200) * eout(p); y = 1420 - 60 * math.cos(math.radians(ang)) * eout(p)
        put(out, polaroid(fp, ang), x, y + (1 - eout(p)) * 500, 0.78, fade, rot=-ang)
    return out

# ---------------------------------------------------------------- 10 paper-cut invitation behind her head
def torn(w, h, col, seed, edge="bottom"):
    rnd = np.random.RandomState(seed); im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(0, 0), (w, 0)]; xs = np.linspace(w, 0, 40)
    pts += [(x, h - 30 + rnd.uniform(-14, 14)) for x in xs]
    d.polygon(pts, fill=col + (255,)); return im
def e_invite(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.2 * ease(t / 0.3))
    fade = 1 - ease(prog(t, D - 0.25, D))
    layers = [(NAVY, 760, 0.0, 11), (MINT, 650, 0.1, 12), (CREAM, 560, 0.2, 13)]
    for col, h, d0, seed in layers:
        p = eout(prog(t, d0, d0 + 0.45))
        if p <= 0: continue
        pc = torn(W, h, col, seed); sc, b = shadow(pc, (0, 12), 20, 90)
        sc.putalpha(sc.getchannel("A").point(lambda v: int(v * fade)))
        out.alpha_composite(sc, (-b, int(-b - (1 - p) * h)))
    p = eob(prog(t, 0.4, 0.75))
    if p > 0:
        lay = Image.new("RGBA", (W, 560), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        d.text((W / 2, 105), "You're invited", font=F("playi", 112), fill=NAVY + (int(255 * fade),), anchor="mm")
        d.text((W / 2, 192), "BEGINNER INVESTING WORKSHOP", font=F("b", 36), fill=(120, 96, 40, int(255 * fade)), anchor="mm")
        lay = lay.resize((W, 560)); out.alpha_composite(lay, (0, int(-30 + (1 - p) * -80)))
    out.alpha_composite(cutout(fr, m))
    return out

BEATS = [  # name, src start, src end, fn, kwargs
    ("search", 0.9, 3.4, e_search, {}),
    ("jargon", 3.4, 6.7, e_jargon_wall, {"a_blow": 2.4}),
    ("new", 10.3, 12.85, e_new, {}),
    ("decode", 12.85, 17.9, e_decode, {}),
    ("portfolio", 20.4, 24.75, e_portfolio, {}),
    ("economy", 24.75, 27.9, e_economy, {}),
    ("lecture", 27.9, 29.8, e_nolecture, {}),
    ("gamewall", 31.9, 33.17, e_gamewall, {}),
    ("broll", 33.17, 36.3, e_broll, {}),
    ("widgets", 36.3, 37.95, e_widgets, {}),
    ("room", 37.95, 39.9, e_room, {}),
    ("fan", 39.9, 41.7, e_fan, {}),
    ("invite", 41.7, 44.85, e_invite, {}),
    ("register", 44.85, 47.6, e_register, {}),
]

def fr_idx(x): return int(round(x * FPS))

def render(name):
    import subprocess
    nm, a, b, fn, kw = next(x for x in BEATS if x[0] == name)
    i0, i1 = fr_idx(a), fr_idx(b); n = i1 - i0
    fxp.load_window(i0 / FPS, i1 / FPS)
    os.makedirs(f"{HERE}/segs", exist_ok=True); out = f"{HERE}/segs/{nm}.mp4"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for k in range(n):
        T = (i0 + k) / FPS
        p.stdin.write(fn(T, T - i0 / FPS, n / FPS, **kw).convert("RGB").tobytes())
    p.stdin.close(); p.wait(); print("wrote", out, n, "frames", flush=True)

if __name__ == "__main__":
    if sys.argv[1] == "still":
        nm, T = sys.argv[2], float(sys.argv[3])
        _, a, b, fn, kw = next(x for x in BEATS if x[0] == nm)
        fn(T, T - a, b - a, **kw).convert("RGB").save(f"{HERE}/stills/{nm}_{T:.2f}.jpg", quality=90); print("still", nm, T)
    elif sys.argv[1] == "render":
        names = [x[0] for x in BEATS] if sys.argv[2] == "all" else sys.argv[2].split(",")
        for nm in names: render(nm)
