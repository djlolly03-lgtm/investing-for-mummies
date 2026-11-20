#!/usr/bin/env python3
"""v3 beats (user notes 19 Nov): green timeline, bigger doodles, hand-tracked ZERO, post-wall (IFM colours) on '5 days',
place-in-grid of 8 women-learning clips on 'room full of curious women', MONEY slam, a full-screen invitation.
  python fxp3.py still <name> <T>  |  python fxp3.py render <name>[,..]|all
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import fxp, fxp2
from fxp import (W, H, FPS, F, at, cutout, grade, glass, rr, shadow, put, scale_about, clamp, ease, eout, eob, prog,
                 NAVY, MINT, GOLD, CREAM, INK, REPO, HERE, e_jargon_wall, e_register)
from fxp2 import (e_search, e_portfolio, e_gamewall, e_broll, sticker, photo, _mask_rr, _grad, fr_idx, e_decode)

FOREST = (30, 86, 62); GOLD2 = (252, 206, 92)

# ---------------------------------------------------------------- timeline, IFM green
def e_timeline(T, t, D):
    fr, m = at(T)
    a = np.asarray(fr).astype(np.float32); g = a.mean(axis=2, keepdims=True)
    tint = np.clip(g * np.array([0.30, 0.66, 0.46]) + np.array([4, 18, 12]), 0, 255)
    k = ease(t / 0.25)
    bg = Image.fromarray((a * (1 - k) + tint * k).astype(np.uint8)).convert("RGBA")
    bg.alpha_composite(cutout(fr, m))
    d = ImageDraw.Draw(bg)
    if int(t * 2) % 2 == 0: d.ellipse((60, 92, 84, 116), fill=(255, 90, 80))
    d.text((98, 104), f"REC  00:{int(7 + t):02d}", font=F("mono", 34), fill=(235, 255, 240), anchor="lm")
    p = eout(prog(t, 0.05, 0.4))
    lay = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((W / 2, 130), "SIGNATURE COURSE", font=F("anton", 128), fill=(255, 255, 255, int(255 * p)), anchor="mm")
    bg.alpha_composite(lay, (0, int(120 + (1 - p) * -40)))
    # edit timeline: long course tracks get trimmed to the essentials (blocks shrink on 'packed' 8.8 -> 'essentials' 9.86)
    pw = eob(prog(t, 0.1, 0.45)); y0 = 1480
    panel = rr((980, 330), 34, (10, 30, 22, 230)); pd = ImageDraw.Draw(panel)
    for k2 in range(4): pd.text((40 + k2 * 240, 30), f"00:0{k2}", font=F("mono", 22), fill=(170, 220, 190), anchor="lm")
    trim = ease(prog(T, 8.8, 9.9))
    rows = [[(0, 300), (320, 560), (580, 900)], [(0, 180), (200, 470), (490, 760), (780, 900)], [(0, 420), (440, 900)]]
    keep = [[1, 0, 1], [0, 1, 0, 1], [1, 0]]
    for r, segs in enumerate(rows):
        for s, (x0, x1) in enumerate(segs):
            w = (x1 - x0) * (1 - (0 if keep[r][s] else 0.92 * trim))
            col = (GOLD2 if keep[r][s] else (110, 150, 130)) if trim > 0.05 else ((120, 230, 170) if r != 1 else GOLD2)
            pd.rounded_rectangle((40 + x0 * (1 - 0.3 * trim), 70 + r * 80, 40 + x0 * (1 - 0.3 * trim) + max(6, w), 130 + r * 80), 14, fill=col)
    ph = 40 + 900 * prog(t, 0.2, D)
    pd.line((ph, 55, ph, 310), fill=(255, 255, 255), width=4)
    if trim > 0.6: pd.text((940, 300), "essentials only", font=F("b", 26), fill=GOLD2, anchor="rm")
    put(bg, panel, W / 2, y0 + 165 + (1 - pw) * 300, 1.0, clamp(pw * 2))
    return bg

# ---------------------------------------------------------------- doodles: bigger SIP / NAV / XIRR + one beginner question
DOODLES3 = [("SIP?", 205, 320, -8, 100), ("XIRR?", 875, 300, 7, 96), ("NAV?", 195, 1000, 6, 100), ("Compounding?", 760, 1060, -5, 70)]
def e_decode3(T, t, D):
    fxp2.DOODLES = []  # reuse the DECODE scramble only
    out = e_decode(T, t, D)
    fr, m = at(T)
    frame = int(T * FPS) // 3; rnd = np.random.RandomState(frame)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i, (w, x, y, r, sz) in enumerate(DOODLES3):
        p = prog(T, 15.15 + i * 0.2, 15.38 + i * 0.2)
        if p <= 0: continue
        f = F("marker", sz); tw = ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(w, font=f)
        tl = Image.new("RGBA", (int(tw + 120), 250), (0, 0, 0, 0)); td = ImageDraw.Draw(tl)
        cx, cy = tl.width / 2, 125
        td.text((cx + rnd.uniform(-3, 3), cy + rnd.uniform(-3, 3)), w, font=f, fill=(255, 255, 255), anchor="mm", stroke_width=7, stroke_fill=(20, 30, 48))
        ex, ey = tw / 2 + 40 + rnd.uniform(-4, 4), sz * 0.95 + rnd.uniform(-4, 4)
        td.ellipse((cx - ex, cy - ey, cx + ex, cy + ey), outline=(255, 214, 10), width=8)
        tl = tl.rotate(r + rnd.uniform(-1.5, 1.5), Image.Resampling.BICUBIC, expand=True)
        sc = eob(p); tl2 = tl.resize((max(1, int(tl.width * sc)), max(1, int(tl.height * sc))))
        x = min(max(x, tl2.width / 2 + 10), W - tl2.width / 2 - 10)
        lay.alpha_composite(tl2, (int(x - tl2.width / 2), int(y - tl2.height / 2)))
    out.alpha_composite(lay)
    return out

# ---------------------------------------------------------------- ZERO from her finger 'O' gesture
HANDS = {int(k): v for k, v in json.load(open(f"{HERE}/hands_zero.json")).items()}
def ring_center(T):
    i = int(round(T * FPS)); best = None
    for j in range(i, i - 6, -1):
        for h in HANDS.get(j, []):
            if h["thumb"][1] < 1000:  # the raised hand
                best = ((h["thumb"][0] + h["index"][0]) / 2 + 2, (h["thumb"][1] + h["index"][1]) / 2 + 4); break
        if best: break
    return best
def glow_ring(r, width=14, col=GOLD2):
    s = int(r * 2 + 120); im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((60, 60, s - 60, s - 60), outline=col + (255,), width=width)
    gl = im.filter(ImageFilter.GaussianBlur(14)); out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.alpha_composite(gl); out.alpha_composite(gl); out.alpha_composite(im); return out
def e_zero(T, t, D):
    fr, m = at(T); out = grade(fr, dark=0.25 * ease(prog(T, 28.3, 28.5)), sat=0.85)
    fade = 1 - ease(prog(t, D - 0.18, D))
    c = ring_center(min(T, 28.42))
    # 1) a glowing gold ring locks onto her finger circle (27.85-28.45)
    if T < 28.45 and c:
        p = eob(prog(T, 27.86, 28.05)); pulse = 1 + 0.06 * math.sin(T * 30)
        put(out, glow_ring(46 * p * pulse), c[0], c[1], 1.0, clamp(p * 2), sh=False)
        k = eob(prog(T, 28.05, 28.25))
        if k > 0:
            put(out, sticker("ZERO", 72, fg=INK, bg=GOLD, font="anton", pad=(24, 2), rot=-6), max(130, c[0] - 60), c[1] - 210, k)
    # 2) the ring flies off her fingers and becomes the giant 0 of the band
    q = prog(T, 28.45, 28.75)
    if T >= 28.45:
        c0 = ring_center(28.42) or (260, 715); tgt = (W / 2, 1255)
        x = c0[0] + (tgt[0] - c0[0]) * eout(q); y = c0[1] + (tgt[1] - c0[1]) * eout(q); r = 46 + (300 - 46) * eout(q)
        band = Image.new("RGBA", (W, 600), (12, 18, 30, int(200 * ease(q) * fade)))
        out.alpha_composite(band.filter(ImageFilter.GaussianBlur(6)), (0, 955))
        put(out, glow_ring(r, width=int(14 + 20 * q)), x, y, 1.0, (1 - 0.65 * ease(prog(T, 28.75, 29.0))) * fade, sh=False)
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
            for yy, x0, x1 in ((1140, 150, 930), (1380, 110, 970)):
                xe = x0 + (x1 - x0) * eout(s)
                d.line([(xx, yy + 9 * math.sin(xx / 70) + rnd.uniform(-3, 3)) for xx in np.linspace(x0, xe, 30)], fill=(226, 40, 40, int(255 * fade)), width=30, joint="curve")
        out.alpha_composite(lay)
    return out

# ---------------------------------------------------------------- post-wall (IFM navy/gold): 5 days light up
def e_postwall(T, t, D):
    fr, m = at(T)
    cell, gap = 54, 10; cols = W // (cell + gap) + 1; rows = H // (cell + gap) + 1
    rnd = np.random.RandomState(5); lv = rnd.choice([0, 1, 2, 3], size=(rows, cols), p=[0.35, 0.3, 0.2, 0.15])
    pal = [(16, 30, 54), (26, 58, 92), (60, 96, 140), (201, 168, 76)]
    bg = Image.new("RGBA", (W, H), (10, 20, 38, 255)); d = ImageDraw.Draw(bg)
    reveal = prog(t, 0.0, 0.35)
    for r in range(rows):
        for c in range(cols):
            if (r + c) / (rows + cols) > reveal * 1.2: continue
            col = pal[lv[r, c]]
            d.rounded_rectangle((c * (cell + gap), r * (cell + gap), c * (cell + gap) + cell, r * (cell + gap) + cell), 9, fill=col)
    k = ease(prog(t, 0.0, 0.2))
    base = fr.convert("RGBA"); bg = Image.blend(base, bg, k) if k < 1 else bg
    bg.alpha_composite(cutout(fr, m, 2.0, erode=3))
    # five big day tiles light up gold on 'Five days' (36.38-36.9), above her head
    for i in range(5):
        pp = eob(prog(T, 36.38 + i * 0.09, 36.6 + i * 0.09))
        if pp <= 0: continue
        tl = rr((170, 170), 30, GOLD2 + (255,)); td = ImageDraw.Draw(tl)
        td.text((85, 70), f"{i + 1}", font=F("archivo", 84), fill=INK, anchor="mm"); td.text((85, 135), "DAY", font=F("b", 30), fill=INK, anchor="mm")
        put(bg, tl, 120 + i * 210, 170, 0.5 + 0.5 * pp, clamp(pp * 2))
    q = eob(prog(T, 37.28, 37.55))
    if q > 0:
        pill = rr((560, 110), 55, (255, 255, 255, 245)); ImageDraw.Draw(pill).text((280, 55), "2 hours a day", font=F("b", 56), fill=NAVY, anchor="mm")
        put(bg, pill, W / 2, 1640, q)
    return bg

# ---------------------------------------------------------------- place-in-grid: 8 women learning, Hiral live in the centre
GRID_IDS = ["IFM-145", "IFM-358", "IFM-380", "IFM-382", "IFM-389", "IFM-383", "IFM-369", "IFM-356"]
CLIPS = f"{REPO}/CLAUDE/content/clips"
_gc = {}
def grid_clip(k, lt, tw, th):
    key = (k, tw, th)
    if key not in _gc:
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", "1.0", "-t", "2.4", "-i", f"{CLIPS}/{GRID_IDS[k]}.mp4", "-vf",
                              f"fps=30,scale={tw}:{th}:force_original_aspect_ratio=increase,crop={tw}:{th},eq=saturation=1.08:contrast=1.04",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        _gc[key] = [Image.frombuffer("RGB", (tw, th), raw[j * tw * th * 3:(j + 1) * tw * th * 3]).copy() for j in range(len(raw) // (tw * th * 3))]
    fs = _gc[key]; return fs[min(len(fs) - 1, int(lt * FPS))]
def e_grid(T, t, D):
    fr, m = at(T)
    G = 14; tw, th = 340, 620
    board = Image.new("RGBA", (W, H), NAVY + (255,)); d = ImageDraw.Draw(board)
    for k in range(1, 3):
        d.line((k * (tw + G) + G / 2, 0, k * (tw + G) + G / 2, H), fill=GOLD + (120,), width=2)
        d.line((0, k * (th + G) + G / 2, W, k * (th + G) + G / 2), fill=GOLD + (120,), width=2)
    s_in = ease(prog(t, 0.0, 0.35)); s_out = ease(prog(t, D - 0.3, D))
    sc = 1 - (1 - tw / W) * s_in * (1 - s_out)
    cx = W / 2; cy = H / 2
    order = [0, 2, 5, 7, 1, 6, 3, 4]  # corners first, then edges
    slots = [(c, r) for r in range(3) for c in range(3) if not (c == 1 and r == 1)]
    if s_out < 1:
        for n, si in enumerate(order):
            pp = prog(t, 0.3 + n * 0.07, 0.48 + n * 0.07) * (1 - s_out)
            if pp <= 0: continue
            c, r = slots[si]
            im = grid_clip(n, t, tw, th).convert("RGBA")
            im.putalpha(_mask_rr((tw, th), 22))
            put(board, im, G + c * (tw + G) + tw / 2, G + r * (th + G) + th / 2, 0.6 + 0.4 * eob(pp), clamp(pp * 2), sh=False)
    hv = fr.resize((max(1, int(W * sc)), max(1, int(H * sc))), Image.Resampling.LANCZOS).convert("RGBA")
    if sc < 0.98: hv.putalpha(_mask_rr(hv.size, int(22 + 0 * sc)))
    board.alpha_composite(hv, (int(cx - hv.width / 2), int(cy - hv.height / 2)))
    if sc < 0.6:
        ring = Image.new("RGBA", (hv.width + 12, hv.height + 12), (0, 0, 0, 0))
        ImageDraw.Draw(ring).rounded_rectangle((0, 0, ring.width - 1, ring.height - 1), 26, outline=GOLD2 + (255,), width=6)
        board.alpha_composite(ring, (int(cx - ring.width / 2), int(cy - ring.height / 2)))
    k = eob(prog(T, 38.15, 38.45)) * (1 - s_out)
    if k > 0: put(board, sticker("A room full of curious women.", 50, fg=INK, bg=CREAM, font="serif"), W / 2, 1880 - 70, k)
    return board

# ---------------------------------------------------------------- 'a whole new way to look at your money' -> MONEY slams on the word
def e_money(T, t, D):
    fr, m = at(T)
    shake = 0
    hit = prog(T, 41.28, 41.42)
    if 41.28 <= T < 41.6: shake = int(14 * (1 - prog(T, 41.28, 41.6)) * (1 if int(T * FPS) % 2 else -1))
    out = grade(fr, dark=0.35 * ease(t / 0.3), sat=0.9)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for w, ts, y, sz in (("A WHOLE", 40.10, 120, 120), ("NEW WAY", 40.40, 120, 120)):
        p = eout(prog(T, ts - 0.04, ts + 0.12))
        if p > 0 and (w == "NEW WAY" or T < 40.40):
            txt = "A WHOLE NEW WAY" if w == "NEW WAY" else w
            d.text((W / 2, y + (1 - p) * 30), txt, font=F("anton", sz), fill=(255, 255, 255, int(255 * p)), anchor="mm")
    out.alpha_composite(lay); out.alpha_composite(cutout(fr, m))
    p = eout(prog(T, 40.76, 40.95))
    if p > 0 and T < 41.28:
        put(out, sticker("to look at your…", 64, fg=INK, bg=CREAM, font="playi"), W / 2, 1300, p)
    if hit > 0:
        band = Image.new("RGBA", (W, 480), (201, 168, 76, int(235 * clamp(hit * 2)))); out.alpha_composite(band, (0, 1080))
        sc = 1.6 - 0.6 * eout(hit)
        wimg = Image.new("RGBA", (W + 400, 420), (0, 0, 0, 0))
        ImageDraw.Draw(wimg).text(((W + 400) / 2, 210), "MONEY", font=F("anton", 330), fill=INK + (255,), anchor="mm")
        wimg = wimg.resize((int(wimg.width * sc), int(wimg.height * sc)))
        out.alpha_composite(wimg, (int(W / 2 - wimg.width / 2), int(1320 - wimg.height / 2)))
        # rupee coins burst out of the band
        rnd = np.random.RandomState(9)
        for j in range(14):
            ang = rnd.uniform(0, 2 * math.pi); sp = rnd.uniform(500, 1100); q = prog(T, 41.3, 41.7)
            x = W / 2 + math.cos(ang) * sp * q; y = 1320 + math.sin(ang) * sp * q * 0.7 + 900 * q * q
            coin = Image.new("RGBA", (90, 90), (0, 0, 0, 0)); cd = ImageDraw.Draw(coin)
            cd.ellipse((4, 4, 86, 86), fill=GOLD2, outline=(160, 120, 30), width=5); cd.text((45, 47), "₹", font=F("b", 52), fill=(140, 100, 20), anchor="mm")
            put(out, coin, x, y, 0.8, 1 - q, rot=q * 200 * (1 if j % 2 else -1), sh=False)
    if shake: out = out.transform(out.size, Image.AFFINE, (1, 0, shake, 0, 1, shake // 2))
    return out

# ---------------------------------------------------------------- the invitation: the frame becomes a huge invitation card
def e_invite3(T, t, D):
    fr, m = at(T)
    # 41.7-43.4: 'If you've been meaning to learn' — quiet build: soft dim + a typed note above her head
    if T < 43.38:
        out = grade(fr, dark=0.22 * ease(t / 0.4))
        q = "Been meaning to learn?"; n = int(len(q) * prog(T, 41.8, 42.8))
        if n > 0:
            note = rr((760, 110), 55, (255, 255, 255, 235)); ImageDraw.Draw(note).text((380, 56), q[:n], font=F("b", 50), fill=NAVY, anchor="mm")
            put(out, note, W / 2, 140, 1.0)
        return out
    # 43.38+: zoom out into a full-screen gold-framed invitation; her live video sits in the card's window
    z = eout(prog(T, 43.38, 43.75)); back = ease(prog(T, 44.62, 44.85))
    zz = z * (1 - back)
    card = Image.new("RGBA", (W, H), CREAM + (255,)); d = ImageDraw.Draw(card)
    for k in range(0, 3): d.rounded_rectangle((26 + k * 14, 26 + k * 14, W - 26 - k * 14, H - 26 - k * 14), 40, outline=GOLD + (255 if k != 1 else 120,), width=4 if k != 1 else 2)
    # gold-foil title, huge
    title = Image.new("RGBA", (W, 560), (0, 0, 0, 0)); tdd = ImageDraw.Draw(title)
    tdd.text((W / 2, 170), "You're", font=F("playi", 210), fill=(255, 255, 255, 255), anchor="mm")
    tdd.text((W / 2, 400), "invited", font=F("playi", 250), fill=(255, 255, 255, 255), anchor="mm")
    foil = _grad((W, 560), (238, 205, 120, 255), (170, 125, 40, 255))
    sweep = (T - 43.6) * 1400
    shine = Image.new("RGBA", (W, 560), (0, 0, 0, 0)); ImageDraw.Draw(shine).polygon([(sweep, 0), (sweep + 120, 0), (sweep - 80, 560), (sweep - 200, 560)], fill=(255, 250, 225, 200))
    foil.alpha_composite(shine.filter(ImageFilter.GaussianBlur(10)))
    foil.putalpha(title.getchannel("A")); card.alpha_composite(foil, (0, 70))
    win_w, win_h = 660, 900; wx, wy = (W - win_w) // 2, 700
    sub = rr((760, 96), 48, NAVY + (255,)); ImageDraw.Draw(sub).text((380, 49), "5-DAY BEGINNER WORKSHOP", font=F("b", 42), fill=CREAM, anchor="mm")
    card.alpha_composite(sub, ((W - 760) // 2, 1640))
    # her video: full frame at zz=0 -> card window at zz=1
    sx = 1 - (1 - win_w / W) * zz
    vid = fr.convert("RGBA")
    vw, vh = int(W * sx), int(H * sx); v = vid.resize((vw, vh), Image.Resampling.LANCZOS)
    tx = W / 2; ty = H / 2 + (wy + win_h / 2 - H / 2) * zz
    crop_h = int(vh * (1 - zz) + win_h * zz)
    top = int(max(0, (vh - crop_h) * 0.18 * zz))
    v = v.crop((0, top, vw, top + crop_h))
    if zz > 0.02: v.putalpha(_mask_rr(v.size, int(60 * zz)))
    out = card if zz > 0.001 else vid
    if zz > 0.001:
        out = Image.blend(vid, card, clamp(zz * 1.4)) if zz < 0.7 else card
        out.alpha_composite(v, (int(tx - v.width / 2), int(ty - v.height / 2)))
        frame = Image.new("RGBA", (v.width + 20, v.height + 20), (0, 0, 0, 0))
        ImageDraw.Draw(frame).rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), int(60 * zz) + 8, outline=GOLD + (int(255 * zz),), width=8)
        out.alpha_composite(frame, (int(tx - frame.width / 2), int(ty - frame.height / 2)))
        # confetti
        rnd = np.random.RandomState(4); q = prog(T, 43.5, 44.8)
        cd = ImageDraw.Draw(out)
        for j in range(70):
            x = rnd.uniform(0, W) + 60 * math.sin(T * 3 + j); y = -80 + (rnd.uniform(0, 0.6) + q * rnd.uniform(0.9, 1.6)) * H
            col = [GOLD2, MINT, NAVY, (236, 120, 100)][j % 4]
            wx0, wy0 = tx - v.width / 2 - 20, ty - v.height / 2 - 20
            if y < H and not (wx0 < x < wx0 + v.width + 40 and wy0 < y < wy0 + v.height + 40): cd.rectangle((x, y, x + 16, y + 28), fill=col + (int(255 * zz),))
    return out

BEATS = [
    ("search", 0.9, 3.4, e_search, {}),
    ("jargon", 3.4, 6.7, e_jargon_wall, {"a_blow": 2.4}),
    ("timeline", 6.9, 10.3, e_timeline, {}),
    ("decode", 12.85, 17.9, e_decode3, {}),
    ("portfolio", 20.4, 24.75, e_portfolio, {}),
    ("zero", 27.8, 29.8, e_zero, {}),
    ("gamewall", 31.9, 33.17, e_gamewall, {}),
    ("broll", 33.17, 36.3, e_broll, {}),
    ("postwall", 36.3, 37.95, e_postwall, {}),
    ("grid", 37.95, 39.9, e_grid, {}),
    ("money", 39.9, 41.7, e_money, {}),
    ("invite", 41.7, 44.85, e_invite3, {}),
    ("register", 44.85, 47.6, e_register, {}),
]

def render(name):
    nm, a, b, fn, kw = next(x for x in BEATS if x[0] == name)
    i0, i1 = fr_idx(a), fr_idx(b); n = i1 - i0
    fxp.load_window(i0 / FPS, i1 / FPS)
    out = f"{HERE}/segs3/{nm}.mp4"; os.makedirs(f"{HERE}/segs3", exist_ok=True)
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
        fxp.load_window(T, T + 1 / FPS)
        fn(T, T - a, b - a, **kw).convert("RGB").save(f"{HERE}/stills/v3_{nm}_{T:.2f}.jpg", quality=88); print("still", nm, T)
    else:
        names = [x[0] for x in BEATS] if sys.argv[2] == "all" else sys.argv[2].split(",")
        for nm in names: render(nm)
