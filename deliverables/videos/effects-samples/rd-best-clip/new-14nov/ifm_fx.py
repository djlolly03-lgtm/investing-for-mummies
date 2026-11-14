#!/usr/bin/env python3
"""IFM versions of the 17 phone-canvas-edit-fx treatments, on one Hiral clip.

Built 14 Nov 2026 on ~/.claude/skills/phone-canvas-edit-fx/scripts/fx_lib.py helpers.
Changes from the skill defaults: no "NN/17" badge, no captions she does not say, IFM copy,
every graphic kept off the face box, timing tied to her words, true empty-set plate for vertigo.

  python ifm_fx.py <effect>|all [--rev N]
Source: aroll.mp4 = MVI_0283 from 20.0 s (Canon, jungle wall). Face box @720: x262-441 y536-715.
"""
import math, os, subprocess, sys, tempfile
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageFont

sys.path.insert(0, os.path.expanduser("~/.claude/skills/phone-canvas-edit-fx/scripts"))
import fx_lib as L

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.expanduser("~/Developer/flock-test/aroll.mp4")
W, H, FPS = 720, 1280, 30
FACE = (262, 536, 441, 715)
FCX, FCY = 352, 625

NAVY = (27, 42, 74); GOLD = (252, 197, 54); CREAM = (246, 244, 239); INK = (22, 33, 58)
HOME = os.path.expanduser("~/Library/Fonts"); SUP = "/System/Library/Fonts/Supplemental"

def F(kind, size):
    p = {"b": f"{HOME}/fixed-Nunito-Bold.ttf", "r": f"{HOME}/fixed-Nunito-Regular.ttf",
         "blk": f"{SUP}/Arial Black.ttf", "serif": f"{HOME}/Lora.ttf"}[kind]
    f = ImageFont.truetype(p, size)
    if kind == "serif":
        try: f.set_variation_by_name("Bold")
        except Exception: pass
    return f

WORDS = [("You",0.0),("don't",1.1),("have",1.48),("to",1.62),("manage",1.76),("every",2.06),("investment",2.38),
 ("yourself",2.84),("but",3.76),("you",3.86),("should",4.0),("know",4.3),("enough",4.56),("to",4.84),("ask",5.06),
 ("the",5.4),("right",5.58),("questions",5.76),("make",6.28),("your",7.04),("voice",7.26),("heard",7.54),("and",7.84),
 ("take",8.22),("an",8.42),("active",8.62),("role",9.0),("in",9.3),("shaping",9.52),("your",9.76),("family's",10.04),
 ("financial",10.58),("future",10.88)]

# ---------------------------------------------------------------- sources
_cache = {}
def frames():
    if "f" not in _cache:
        cap = cv2.VideoCapture(SRC); fs = []
        while True:
            ok, fr = cap.read()
            if not ok: break
            fs.append(Image.fromarray(cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)))
        _cache["f"] = fs
        md = os.path.expanduser("~/Developer/flock-test/work/matte")
        _cache["m"] = [Image.open(f"{md}/{i:05d}.png").convert("L").resize((W, H), Image.Resampling.BILINEAR) for i in range(len(fs))]
        _cache["plate"] = Image.open(f"{HERE}/plate_raw.png").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    return _cache["f"], _cache["m"]

def at(T):
    fs, ms = frames(); i = min(len(fs) - 1, max(0, int(round(T * FPS)))); return fs[i], ms[i]

def cut(fr, m, feather=1.2):
    s = fr.convert("RGBA"); mm = m.filter(ImageFilter.GaussianBlur(feather)) if feather else m
    s.putalpha(mm); return s

def ease(t): return L.smoothstep(t)
def eob(t): return L.ease_out_back(L.clamp(t))
def prog(T, a, b): return L.clamp((T - a) / max(1e-6, b - a))

def shadowed(layer, off=(0, 10), blur=14, op=110): return L.drop_shadow(layer, off, blur, op)
def put(base, layer, xy): base.alpha_composite(layer, (int(xy[0]), int(xy[1]))) if xy[0] >= 0 and xy[1] >= 0 and xy[0] + layer.width <= base.width and xy[1] + layer.height <= base.height else L.paste(base, layer, (int(xy[0]), int(xy[1])))

def pop_scale(layer, s):
    if s <= 0.02: return None
    return layer.resize((max(1, int(layer.width * s)), max(1, int(layer.height * s))), Image.Resampling.BICUBIC)

def put_center(base, layer, cx, cy, s=1.0, alpha=1.0):
    l = pop_scale(layer, s)
    if l is None: return
    if alpha < 1:
        a = l.getchannel("A").point(lambda v: int(v * alpha)); l = l.copy(); l.putalpha(a)
    L.paste(base, l, (int(cx - l.width / 2), int(cy - l.height / 2)))

def tag(text, f, fill, fg, pad=(16, 10), r=14, outline=None):
    tmp = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    lines = text.split("\n"); lh = f.size + 6
    tw = max(tmp.textlength(x, font=f) for x in lines)
    w, h = int(tw + pad[0] * 2), int(lh * len(lines) + pad[1] * 2 - 6)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), r, fill=fill, outline=outline, width=2 if outline else 0)
    y = pad[1]
    for x in lines:
        d.text((w / 2, y), x, font=f, fill=fg, anchor="ma"); y += lh
    return im

# ---------------------------------------------------------------- effects
# each: (start_s, end_s, fn(T, t, D) -> RGB image)

def e_orbit(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    labels = ["SIP", "FD", "GOLD", "STOCKS", "PPF", "ELSS"]
    cx, cy, rx, ry = 352, 600, 290, 240
    spin = t / D * math.tau * 0.42 + 0.25
    items = []
    for i, lab in enumerate(labels):
        a = spin + i * math.tau / len(labels)
        z = math.sin(a)
        x, y = cx + math.cos(a) * rx, cy + z * ry
        sc = 0.72 + 0.28 * (z * 0.5 + 0.5)
        appear = eob(prog(t, 0.1 + i * 0.08, 0.55 + i * 0.08))
        dark = i % 2 == 0
        f = F("blk", 34 if len(lab) <= 4 else 27)
        tile = Image.new("RGBA", (138, 124), (0, 0, 0, 0)); d = ImageDraw.Draw(tile)
        d.rounded_rectangle((0, 0, 137, 123), 26, fill=NAVY + (250,) if dark else CREAM + (250,), outline=GOLD + (255,), width=4)
        d.text((69, 62), lab, font=f, fill=GOLD if dark else NAVY, anchor="mm")
        items.append((z, shadowed(tile, (0, 8), 10, 90), x, y, sc * appear))
    for z, tl, x, y, s in sorted(items, key=lambda k: k[0]):
        if z < 0: put_center(out, tl, x, y, s)
    out.alpha_composite(cut(fr, m))
    for z, tl, x, y, s in sorted(items, key=lambda k: k[0]):
        if z >= 0: put_center(out, tl, x, y, s)
    return out

def grade(im, k):
    a = np.asarray(im).astype(np.float32)
    if k == 1: g = a.mean(2, keepdims=True); a = np.repeat(g, 3, 2)
    elif k == 2: a = a * [1.08, 0.98, 0.84]
    elif k == 3: a = (a - 128) * 1.35 + 128
    elif k == 4: a = a * [0.86, 0.95, 1.1]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def e_couch_wall(T, t, D):
    fr, m = at(T); fs, _ = frames()
    out = Image.new("RGBA", (W, H), NAVY + (255,))
    cols, rows = 4, 5; tw, th = W // cols, H // rows
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            src = fs[(int(T * FPS) + i * 17) % len(fs)]
            s = 1.0 if (i * 7) % 20 < 6 else eob(prog(t, ((i * 7) % 20 - 6) * 0.04, 0.35 + ((i * 7) % 20 - 6) * 0.04))
            tile = L.fit_cover(grade(src, i % 5), (tw - 8, th - 8)).convert("RGBA")
            tile = Image.blend(tile, Image.new("RGBA", tile.size, NAVY + (255,)), 0.28)
            tile = L.round_image(tile, 10)
            put_center(out, tile, c * tw + tw / 2, r * th + th / 2, s)
    vign = Image.new("L", (W, H), 0); ImageDraw.Draw(vign).ellipse((60, 380, 660, 1400), fill=150)
    out = Image.composite(Image.new("RGBA", (W, H), NAVY + (255,)), out, vign.filter(ImageFilter.GaussianBlur(90)))
    s = cut(fr, m)
    out.alpha_composite(L.drop_shadow(s, (0, 0), 22, 160).resize((W, H)) if False else s)
    return out

def e_ui_world(T, t, D):
    fr, m = at(T)
    out = Image.new("RGBA", (W, H), CREAM + (255,)); d = ImageDraw.Draw(out)
    top = 470
    clip = fr.crop((0, 400, W, 400 + (H - top))); out.paste(clip, (0, top))
    d.rectangle((0, top - 2, W, top + 2), fill=GOLD)
    d.text((40, 52), "INVESTING FOR MUMMIES", font=F("b", 20), fill=(184, 138, 46))
    d.text((40, 82), "Ask your advisor", font=F("serif", 46), fill=NAVY)
    qs = [("What am I paying in fees?", 4.30), ("How risky is this, really?", 5.06), ("When can I take my money out?", 5.76)]
    for i, (q, ts) in enumerate(qs):
        p = prog(T, ts - 0.05, ts + 0.30)
        if p <= 0: continue
        chip = tag(q, F("b", 28), (255, 255, 255, 255), INK, pad=(22, 16), r=20, outline=(226, 221, 210, 255))
        d2 = ImageDraw.Draw(chip); d2.ellipse((10, chip.height / 2 - 5, 20, chip.height / 2 + 5), fill=GOLD)
        x = 40 + (1 - L.ease_out_cubic(p)) * 60
        cs = shadowed(chip, (0, 4), 8, 50); cs.putalpha(cs.getchannel("A").point(lambda v: int(v * p)))
        L.paste(out, cs, (int(x), 160 + i * 96))
    return out

def e_frame_break(T, t, D):
    fr, m = at(T)
    out = Image.new("RGBA", (W, H), NAVY + (255,))
    p = ease(prog(t, 0.25, 1.0))
    x0, y0, x1, y1 = L.lerp(0, 165, p), L.lerp(0, 560, p), L.lerp(W, 555, p), H + 40
    rad = int(L.lerp(0, 30, p))
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); card.paste(fr, (0, 0))
    mask = Image.new("L", (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), rad, fill=255)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((x0, y0 + 16, x1, y1 + 16), rad, fill=(0, 0, 0, int(140 * p)))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    card.putalpha(mask); out.alpha_composite(card)
    d = ImageDraw.Draw(out)
    if p > 0.6:
        a = int(255 * prog(p, 0.6, 1.0))
        d.ellipse((60, 92, 116, 148), fill=GOLD + (a,))
        d.text((88, 120), "IFM", font=F("blk", 16), fill=NAVY + (a,), anchor="mm")
        d.text((132, 108), "investingformummies", font=F("b", 26), fill=(255, 255, 255, a), anchor="lm")
        d.text((132, 138), "Reel", font=F("r", 20), fill=(190, 198, 218, a), anchor="lm")
        d.rounded_rectangle((W - 170, 100, W - 60, 140), 14, fill=(255, 255, 255, a))
        d.text((W - 115, 120), "Follow", font=F("b", 21), fill=NAVY + (a,), anchor="mm")
    if p > 0.02:
        s = cut(fr, m); a = s.getchannel("A").point(lambda v: int(v * min(1, p * 3)))
        s.putalpha(a)
        out.alpha_composite(s)
    return out

def e_digital_zoom(T, t, D):
    fr, _ = at(T)
    z = 1.0 + 0.05 * prog(T, 5.6, 7.2)
    z += 0.32 * L.ease_out_cubic(prog(T, 7.22, 7.36)) + 0.38 * L.ease_out_cubic(prog(T, 7.52, 7.66))
    z -= 0.75 * ease(prog(T, 7.95, 8.35))
    return L.scale_about(fr.convert("RGBA"), max(1.0, z), cx=FCX / W, cy=FCY / H)

def chat_bubble(text, me, f):
    b = tag(text, f, (252, 197, 54, 255) if me else (255, 255, 255, 255), INK, pad=(16, 11), r=16)
    return b

def e_phone_mockup(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    pw, ph = 232, 470
    phone = Image.new("RGBA", (pw, ph), (0, 0, 0, 0)); d = ImageDraw.Draw(phone)
    d.rounded_rectangle((0, 0, pw - 1, ph - 1), 40, fill=(16, 18, 24, 255))
    d.rounded_rectangle((8, 8, pw - 9, ph - 9), 34, fill=(236, 229, 221, 255))
    d.rounded_rectangle((8, 8, pw - 9, 74), 34, fill=NAVY + (255,)); d.rectangle((8, 40, pw - 9, 74), fill=NAVY + (255,))
    d.rounded_rectangle((pw / 2 - 34, 16, pw / 2 + 34, 30), 7, fill=(6, 6, 8))
    d.ellipse((20, 40, 48, 68), fill=(180, 190, 210)); d.text((56, 54), "Advisor", font=F("b", 18), fill=(255, 255, 255), anchor="lm")
    msgs = [(False, "I'll handle\nall your investments.", 3.9), (True, "Thanks! What will\nit cost me?", 5.06), (False, "Let me send\nyou the details.", 5.9)]
    y = 90; f = F("b", 18)
    for me, txt, ts in msgs:
        p = prog(T, ts, ts + 0.25)
        if p <= 0: break
        b = chat_bubble(txt, me, f)
        b2 = pop_scale(b, 0.6 + 0.4 * eob(p))
        x = pw - 20 - b2.width if me else 20
        L.paste(phone, b2, (int(x), int(y))); y += b.height + 12
    enter = eob(prog(t, 0.0, 0.55))
    rot = L.lerp(14, 4, enter)
    pr = shadowed(phone.rotate(rot, Image.Resampling.BICUBIC, expand=True), (10, 18), 18, 130)
    x = L.lerp(W + 20, W + 40 - pr.width, enter)
    L.paste(out, pr, (int(x), 290))
    return out

def e_checklist(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    items = [("Ask the right questions", 5.9), ("Make your voice heard", 7.6), ("Take an active role", 9.1), ("Shape your family's future", 11.0)]
    cw, chh = 620, 330
    card = Image.new("RGBA", (cw, chh), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, cw - 1, chh - 1), 26, fill=NAVY + (238,))
    done = sum(1 for _, ts in items if T >= ts)
    d.text((28, 24), "YOUR MONEY, YOUR SAY", font=F("b", 19), fill=GOLD)
    d.text((cw - 28, 24), f"{done} of {len(items)}", font=F("b", 19), fill=(200, 205, 220), anchor="ra")
    target = sum(prog(T, ts, ts + 0.3) for _, ts in items) / len(items)
    d.rounded_rectangle((28, 58, cw - 28, 66), 4, fill=(60, 72, 100))
    d.rounded_rectangle((28, 58, 28 + max(8, int((cw - 56) * target)), 66), 4, fill=GOLD)
    for i, (lab, ts) in enumerate(items):
        y = 104 + i * 56; p = prog(T, ts, ts + 0.22)
        cx, cy, r = 44, y + 14, 15
        if p > 0:
            rr = r * (0.6 + 0.4 * eob(p)); d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=GOLD)
            d.line((cx - 7, cy, cx - 2, cy + 6, cx + 8, cy - 6), fill=NAVY, width=4)
        else:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(120, 130, 160), width=3)
        d.text((cx + 30, cy), lab, font=F("b", 30), fill=(255, 255, 255) if p > 0 else (170, 178, 198), anchor="lm")
    enter = L.ease_out_cubic(prog(t, 0.0, 0.4))
    c2 = card.copy(); c2.putalpha(card.getchannel("A").point(lambda v: int(v * enter)))
    L.paste(out, shadowed(c2, (0, 12), 16, 110), (int((W - cw) / 2) - 14, int(L.lerp(10, 40, enter)) - 14))
    return out

def e_headline_wall(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    heads = [("Who handles the\nmoney at home?", "cream", -6, 130, 100),
             ("Your money,\nyour say", "navy", 5, 420, 82),
             ("Don't sign what you\ndon't understand", "cream", 3, 560, 250),
             ("Ask: what am\nI paying?", "navy", -4, 110, 300),
             ("Know your SIP", "gold", 6, 105, 520),
             ("One question\nat a time", "cream", -5, 610, 470),
             ("Mummies who\ninvest", "navy", 4, 615, 650)]
    for i, (txt, st, rot, cx, cy) in enumerate(heads):
        p = prog(t, 0.15 + i * 0.32, 0.45 + i * 0.32)
        if p <= 0: continue
        if st == "cream":
            card = tag(txt, F("serif", 26), CREAM + (250,), INK, pad=(16, 22), r=4, outline=(214, 206, 190, 255))
            ImageDraw.Draw(card).text((10, 5), "THE MONEY TIMES", font=F("b", 11), fill=(165, 72, 43))
        elif st == "navy":
            card = tag(txt, F("b", 25), NAVY + (245,), (255, 255, 255), pad=(16, 12), r=10)
        else:
            card = tag(txt, F("b", 25), GOLD + (255,), INK, pad=(18, 12), r=22)
        card = shadowed(card.rotate(rot, Image.Resampling.BICUBIC, expand=True), (0, 6), 8, 90)
        put_center(out, card, cx, cy, 0.4 + 0.6 * eob(p))
    return out

def e_zoom_through_cut(T, t, D):
    # T is unused: this clip maps its own time. 0-1.1 s = src 2.30-3.40 zoom in; 1.1-2.2 s = src 3.76-4.86 zoom out.
    if t < 1.1:
        src = 2.30 + t; p = L.ease_in_cubic(t / 1.1); z = 3.2 ** p
    else:
        src = 3.76 + (t - 1.1); p = 1 - L.ease_out_cubic(min(1, (t - 1.1) / 0.75)); z = 3.2 ** p
    fr, _ = at(src)
    n = 1 + int(5 * p)
    acc = None
    for k in range(n):
        im = np.asarray(L.scale_about(fr.convert("RGB"), z * (1 + 0.035 * k * p), FCX / W, (FCY - 20) / H), dtype=np.float32)
        acc = im if acc is None else acc + im
    return Image.fromarray((acc / n).astype(np.uint8))
ZTC_AUDIO = [(2.30, 3.40), (3.76, 4.86)]

def e_chart_grow(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(panel)
    a = L.ease_out_cubic(prog(t, 0.0, 0.4))
    d.rounded_rectangle((28, 60, W - 28, 520), 28, fill=NAVY + (int(228 * a),))
    for k in range(4):
        y = 170 + k * 85; d.line((70, y, W - 70, y), fill=(255, 255, 255, int(40 * a)), width=2)
    d.text((70, 92), "SHAPING YOUR FAMILY'S FUTURE", font=F("b", 20), fill=GOLD + (int(255 * a),))
    pts = [(70, 430), (170, 410), (260, 400), (350, 360), (440, 330), (520, 270), (600, 210), (650, 160)]
    g = L.ease_out_cubic(prog(T, 8.6, 11.0))
    tot = len(pts) - 1; upto = g * tot
    poly = [pts[0]]
    for i in range(1, len(pts)):
        if i <= upto: poly.append(pts[i])
        else:
            f = upto - (i - 1)
            if f > 0: poly.append((L.lerp(pts[i - 1][0], pts[i][0], f), L.lerp(pts[i - 1][1], pts[i][1], f)))
            break
    if len(poly) > 1:
        d.polygon(poly + [(poly[-1][0], 470), (70, 470)], fill=GOLD + (60,))
        d.line(poly, fill=GOLD + (255,), width=7, joint="curve")
        ex, ey = poly[-1]; r = 11 + 3 * math.sin(t * 9)
        d.ellipse((ex - r - 8, ey - r - 8, ex + r + 8, ey + r + 8), fill=GOLD + (70,))
        d.ellipse((ex - r, ey - r, ex + r, ey + r), fill=GOLD + (255,))
    d.text((70, 488), "Today", font=F("b", 20), fill=(210, 215, 228, int(255 * a)))
    la = prog(T, 10.6, 11.0)
    if la > 0: d.text((W - 70, 488), "Your family's future", font=F("b", 20), fill=(255, 255, 255, int(255 * la)), anchor="ra")
    out.alpha_composite(panel); out.alpha_composite(cut(fr, m))
    return out

def e_pullback_reveal(T, t, D):
    fr, _ = at(T)
    out = Image.new("RGBA", (W, H), CREAM + (255,))
    p = ease(prog(t, 0.35, 1.5)); s = L.lerp(1.0, 0.68, p)
    vw, vh = int(W * s), int(H * s); bar = int(L.lerp(0, 46, p))
    win = Image.new("RGBA", (vw, vh + bar), (255, 255, 255, 255)); d = ImageDraw.Draw(win)
    if bar > 6:
        for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
            d.ellipse((16 + i * 22, bar / 2 - 6, 28 + i * 22, bar / 2 + 6), fill=c)
        d.rounded_rectangle((100, bar / 2 - 13, vw - 20, bar / 2 + 13), 13, fill=(240, 238, 232))
        d.text((116, bar / 2), "investingformummies.com", font=F("r", 17), fill=(90, 96, 110), anchor="lm")
    win.paste(fr.resize((vw, vh), Image.Resampling.LANCZOS), (0, bar))
    win = L.round_image(win, int(18 * p))
    wx, wy = (W - vw) // 2, int(L.lerp(0, 70, p))
    if p > 0.01:
        sw = shadowed(win, (0, 18), 26, int(140 * p)); padx = (sw.width - win.width) // 2
        L.paste(out, sw, (wx - padx, wy - padx))
    else: out.paste(win, (0, 0))
    d = ImageDraw.Draw(out); la = prog(t, 1.3, 1.8)
    if la > 0:
        y = wy + vh + bar + 58
        d.text((W / 2, y), "LIVE CLASS", font=F("b", 20), fill=(184, 138, 46, int(255 * la)), anchor="mm")
        d.text((W / 2, y + 42), "Money, explained for mums", font=F("serif", 34), fill=NAVY + (int(255 * la),), anchor="mm")
    return out

_group = {}
def group_bg():
    if "g" not in _group:
        g = Image.open("/Users/lollyg/Documents/investing for Mummies/highlight-reel-assets/gflow-final/13-full-batch-group-photo.jpg").convert("RGB")
        gw, gh = g.size; cw = int(gh * W / H); x0 = int(gw * 0.5 - cw / 2)
        g = g.crop((x0, 0, x0 + cw, gh)).resize((W, H), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(3))
        _group["g"] = Image.blend(g, Image.new("RGB", (W, H), NAVY), 0.18).convert("RGBA")
    return _group["g"]

def e_green_screen(T, t, D):
    fr, m = at(T)
    green = Image.new("RGBA", (W, H), (32, 200, 72, 255))
    wipe = ease(prog(t, 0.9, 1.5))
    bg = green.copy()
    if wipe > 0:
        xcut = int(W * wipe); mk = Image.new("L", (W, H), 0); ImageDraw.Draw(mk).rectangle((0, 0, xcut, H), fill=255)
        bg = Image.composite(group_bg(), green, mk)
        if wipe < 1: ImageDraw.Draw(bg).rectangle((xcut - 3, 0, xcut + 3, H), fill=(255, 255, 255, 255))
    s = cut(fr, m)
    bg.alpha_composite(s)
    d = ImageDraw.Draw(bg); la = prog(t, 1.6, 2.0)
    if la > 0:
        lab = tag("Our workshops", F("b", 22), (255, 255, 255, int(235 * la)), INK, pad=(16, 9), r=16)
        L.paste(bg, lab, (W - lab.width - 30, 60))
    return bg

def e_paper_cut(T, t, D):
    tq = math.floor(t * 12) / 12; Tq = T - t + tq
    fr, m = at(Tq)
    rnd = np.random.default_rng(int(tq * 12))
    out = Image.new("RGBA", (W, H), (244, 238, 224, 255)); d = ImageDraw.Draw(out)
    for y in range(0, H, 36): d.line((0, y, W, y), fill=(226, 218, 200), width=1)
    d.rectangle((470, 90, 690, 330), fill=(203, 213, 232)); [d.line((480 + k * 16, 100, 480 + k * 16, 320), fill=(120, 140, 190), width=6) for k in range(13)]
    d.rectangle((24, 360, 200, 520), fill=GOLD)
    s = cut(fr, m, 0)
    sticker = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    border = s.getchannel("A").filter(ImageFilter.MaxFilter(13))
    white = Image.new("RGBA", (W, H), (255, 255, 255, 255)); white.putalpha(border)
    sticker.alpha_composite(white); sticker.alpha_composite(s)
    sticker = shadowed(sticker, (6, 10), 8, 90)
    jit = rnd.integers(-3, 4, 2)
    L.paste(out, sticker, (-14 + int(jit[0]), 40 - 14 + int(jit[1])))
    word = [("A", NAVY, CREAM), ("S", (165, 72, 43), (255, 255, 255)), ("K", CREAM, NAVY)]
    for i, (ch, bgc, fg) in enumerate(word):
        p = prog(T, 5.06 + i * 0.08, 5.06 + i * 0.08 + 0.01)
        if p <= 0: continue
        tile = Image.new("RGBA", (104, 118), bgc + (255,)); ImageDraw.Draw(tile).text((52, 59), ch, font=F("blk", 78), fill=fg, anchor="mm")
        tile = shadowed(tile.rotate([-7, 5, -3][i] + rnd.uniform(-2, 2), Image.Resampling.BICUBIC, expand=True), (4, 6), 4, 90)
        L.paste(out, tile, (56 + i * 118, 120 + [0, 14, -6][i]))
    if T >= 4.3:
        k = tag("know\nenough", F("blk", 34), GOLD + (255,), INK, pad=(18, 12), r=3)
        L.paste(out, shadowed(k.rotate(-6 + rnd.uniform(-1.5, 1.5), Image.Resampling.BICUBIC, expand=True), (4, 6), 4, 90), (500, 380))
    p = prog(T, 5.76, 5.77)
    if p > 0:
        q = tag("the right\nquestions", F("serif", 30), (255, 255, 255, 255), INK, pad=(16, 12), r=2)
        L.paste(out, shadowed(q.rotate(4 + rnd.uniform(-1.5, 1.5), Image.Resampling.BICUBIC, expand=True), (4, 6), 4, 90), (78, 270))
    return out

def doodle(d, kind, cx, cy, s, col, rnd, w=5):
    j = lambda: rnd.uniform(-2.5, 2.5)
    if kind == "wave":
        for k in range(3):
            r = s * (0.5 + 0.35 * k)
            pts = [(cx + r * math.cos(a) + j(), cy + r * math.sin(a) + j()) for a in np.linspace(-0.75, 0.75, 9)]
            d.line(pts, fill=col, width=w, joint="curve")
    elif kind == "star":
        pts = []
        for k in range(11):
            a = -math.pi / 2 + k * math.pi / 5; r = s if k % 2 == 0 else s * 0.45
            pts.append((cx + r * math.cos(a) + j(), cy + r * math.sin(a) + j()))
        d.line(pts, fill=col, width=w, joint="curve")
    elif kind == "spark":
        for a in np.linspace(0, math.tau, 6, endpoint=False):
            d.line((cx + s * 0.4 * math.cos(a) + j(), cy + s * 0.4 * math.sin(a) + j(), cx + s * math.cos(a) + j(), cy + s * math.sin(a) + j()), fill=col, width=w)
    elif kind == "under":
        pts = [(cx - s + k * s / 6 + j(), cy + 6 * math.sin(k * 1.3) + j()) for k in range(13)]
        d.line(pts, fill=col, width=w, joint="curve")

def e_doodle_boil(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    rnd = np.random.default_rng(int(t * 8))
    a = m.point(lambda v: 255 if v > 110 else 0)
    ring = ImageOps.invert(a).point(lambda v: 0)
    big = a.filter(ImageFilter.MaxFilter(11)); edge = Image.fromarray(np.clip(np.asarray(big, np.int16) - np.asarray(a, np.int16), 0, 255).astype(np.uint8))
    shift = tuple(int(v) for v in rnd.integers(-2, 3, 2))
    p = prog(t, 0.2, 0.6)
    if p > 0:
        layer = Image.new("RGBA", (W, H), (255, 255, 255, 0)); layer.putalpha(edge.point(lambda v: int(v * p)))
        L.paste(out, layer, shift)
    d = ImageDraw.Draw(out)
    items = [("wave", 520, 600, 64, 7.15), ("wave", 545, 600, 112, 7.4), ("star", 120, 380, 34, 6.4), ("spark", 600, 380, 36, 7.5),
             ("star", 640, 800, 24, 7.9), ("spark", 95, 760, 28, 6.9), ("under", 360, 300, 70, 7.6)]
    for kind, x, y, s, ts in items:
        if T < ts: continue
        col = (255, 255, 255) if kind in ("wave", "under") else GOLD
        doodle(d, kind, x, y, s, col, rnd, 6)
    if T >= 7.5:
        d.text((360 + rnd.uniform(-2, 2), 250 + rnd.uniform(-2, 2)), "BE HEARD!", font=F("blk", 54), fill=(255, 255, 255), anchor="mm", stroke_width=3, stroke_fill=NAVY)
    return out

def e_vertigo(T, t, D):
    fr, m = at(T); fs, _ = frames()
    plate = _cache["plate"].convert("RGBA")
    p = ease(prog(t, 0.2, D - 0.3))
    bg = L.scale_about(plate, L.lerp(1.0, 1.55, p), FCX / W, FCY / H)
    subj = cut(fr, m, 1.0)
    bg.alpha_composite(subj)
    return bg

def e_cover_story(T, t, D):
    fr, m = at(T)
    base = Image.blend(fr.convert("RGB"), Image.new("RGB", (W, H), NAVY), 0.35).convert("RGBA")
    d = ImageDraw.Draw(base)
    a = L.ease_out_cubic(prog(t, 0.0, 0.5))
    d.text((W / 2, 52), "INVESTING FOR", font=F("b", 26), fill=(255, 255, 255, int(255 * a)), anchor="mm")
    mast = "MUMMIES"; f = F("serif", 124)
    d.text((W / 2, 175), mast, font=f, fill=CREAM + (int(255 * a),), anchor="mm")
    d.line((40, 88, W - 40, 88), fill=GOLD + (int(255 * a),), width=3)
    d.text((40, 96), "NOV 2026", font=F("b", 17), fill=(220, 224, 235, int(255 * a)))
    d.text((W - 40, 96), "THE FAMILY MONEY ISSUE", font=F("b", 17), fill=(220, 224, 235, int(255 * a)), anchor="ra")
    base.alpha_composite(cut(fr, m))
    d = ImageDraw.Draw(base)
    lines = [("Ask the right", "questions", 8.4), ("Take an", "active role", 9.2)]
    for i, (l1, l2, ts) in enumerate(lines):
        p = prog(T, ts, ts + 0.3)
        if p <= 0: continue
        y = 820 + i * 130; x = 40 - (1 - L.ease_out_cubic(p)) * 40
        d.text((x, y), l1, font=F("b", 26), fill=(255, 255, 255, int(255 * p)), stroke_width=2, stroke_fill=(0, 0, 0, int(120 * p)))
        d.text((x, y + 34), l2, font=F("serif", 44), fill=GOLD + (int(255 * p),), stroke_width=2, stroke_fill=(0, 0, 0, int(120 * p)))
    p = eob(prog(T, 10.1, 10.45))
    if p > 0:
        st = Image.new("RGBA", (150, 150), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
        sd.ellipse((0, 0, 149, 149), fill=GOLD); sd.text((75, 58), "COVER", font=F("blk", 22), fill=NAVY, anchor="mm"); sd.text((75, 88), "STORY", font=F("blk", 22), fill=NAVY, anchor="mm")
        put_center(base, st.rotate(-12, Image.Resampling.BICUBIC, expand=True), 600, 1090, p)
    return base

def e_glass_type(T, t, D):
    fr, m = at(T); out = fr.convert("RGBA")
    word = "VOICE"; f = F("blk", 168)
    mask = Image.new("L", (W, H), 0); md = ImageDraw.Draw(mask)
    p = L.ease_out_cubic(prog(T, 6.9, 7.35))
    cy = 300 + (1 - p) * 40
    md.text((W / 2, cy), word, font=f, fill=255, anchor="mm")
    mask = mask.point(lambda v: int(v * p))
    frost = fr.filter(ImageFilter.GaussianBlur(14)).convert("RGBA")
    frost = Image.blend(frost, Image.new("RGBA", (W, H), (255, 255, 255, 255)), 0.55)
    glass = frost.copy(); glass.putalpha(mask)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(mask.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.6)))
    L.paste(out, sh, (6, 14)); out.alpha_composite(glass)
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.8))
    hl = Image.new("RGBA", (W, H), (255, 255, 255, 0)); hl.putalpha(edge.point(lambda v: min(255, v * 3)))
    out.alpha_composite(hl)
    sw = prog(T, 7.35, 8.2)
    if 0 < sw < 1:
        band = Image.new("L", (W, H), 0); x = L.lerp(-200, W + 200, sw)
        ImageDraw.Draw(band).polygon([(x, 0), (x + 70, 0), (x - 130, H), (x - 200, H)], fill=200)
        band = Image.fromarray(np.minimum(np.asarray(band), np.asarray(mask)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
        spec = Image.new("RGBA", (W, H), (255, 255, 255, 0)); spec.putalpha(band); out.alpha_composite(spec)
    out.alpha_composite(cut(fr, m))
    return out

EFFECTS = {
    "orbit": (0.0, 3.6, e_orbit),
    "couch_wall": (3.6, 6.4, e_couch_wall),
    "ui_world": (3.6, 6.5, e_ui_world),
    "frame_break": (0.0, 3.6, e_frame_break),
    "digital_zoom": (5.6, 8.4, e_digital_zoom),
    "phone_mockup": (3.4, 6.6, e_phone_mockup),
    "checklist": (5.6, 11.6, e_checklist),
    "headline_wall": (0.0, 3.6, e_headline_wall),
    "zoom_through_cut": (0.0, 2.2, e_zoom_through_cut),
    "chart_grow": (8.1, 11.6, e_chart_grow),
    "pullback_reveal": (0.0, 3.6, e_pullback_reveal),
    "green_screen": (8.1, 11.6, e_green_screen),
    "paper_cut": (3.6, 6.4, e_paper_cut),
    "doodle_boil": (5.8, 8.6, e_doodle_boil),
    "vertigo": (8.1, 11.6, e_vertigo),
    "cover_story": (8.1, 11.6, e_cover_story),
    "glass_type": (6.2, 8.8, e_glass_type),
}


# ================================================================ selfie-to-3d-effects, IFM versions
import json as _json
_hands = _json.load(open(os.path.expanduser("~/Developer/flock-test/work/hands.json")))["frames"]
def hands_at(T):
    i = min(len(_hands) - 1, max(0, int(round(T * FPS))))
    return [dict(h, pts=[(x * 2 / 3, y * 2 / 3) for x, y in h["pts"]], size=h["size"] * 2 / 3) for h in _hands[i]["hands"]]

IMG_TOP, IMG_BOT, SRC_TOP = 118, 1078, 170      # screen rows of the picture, and the source row shown at the top
YEL = (255, 214, 10)

def screen_of(img):
    """Source-space image (720x1280) -> 720x960 picture area."""
    return img.crop((0, SRC_TOP, W, SRC_TOP + (IMG_BOT - IMG_TOP)))

def camera_ui(pic, T, zoom_txt="1×", wheel=None, modes=True):
    out = Image.new("RGBA", (W, H), (0, 0, 0, 255)); out.paste(pic, (0, IMG_TOP))
    d = ImageDraw.Draw(out)
    secs = int(T) + 1
    pill = f"00:00:{secs:02d}"
    d.rounded_rectangle((W / 2 - 74, 50, W / 2 + 74, 92), 12, fill=(235, 64, 52))
    d.text((W / 2, 71), pill, font=F("b", 24), fill=(255, 255, 255), anchor="mm")
    if wheel is None:
        for i, z in enumerate(["0.5", zoom_txt, "2"]):
            cx = W / 2 + (i - 1) * 72; on = i == 1
            d.ellipse((cx - 26, IMG_BOT - 76, cx + 26, IMG_BOT - 24), fill=(0, 0, 0, 150))
            d.text((cx, IMG_BOT - 50), z, font=F("b", 20 if on else 17), fill=YEL if on else (255, 255, 255), anchor="mm")
    if modes: d.text((W / 2 - 70, IMG_BOT + 34), "VIDEO", font=F("b", 22), fill=YEL, anchor="mm")
    if modes: d.text((W / 2 + 40, IMG_BOT + 34), "PHOTO", font=F("b", 22), fill=(255, 255, 255), anchor="mm")
    if modes: d.text((W / 2 - 180, IMG_BOT + 34), "SLO-MO", font=F("b", 22), fill=(200, 200, 200), anchor="mm")
    cy = IMG_BOT + 125
    d.ellipse((W / 2 - 50, cy - 50, W / 2 + 50, cy + 50), outline=(255, 255, 255), width=6)
    d.rounded_rectangle((W / 2 - 22, cy - 22, W / 2 + 22, cy + 22), 8, fill=(235, 64, 52))
    d.rounded_rectangle((60, cy - 30, 120, cy + 30), 12, fill=(60, 60, 64))
    d.ellipse((W - 120, cy - 30, W - 60, cy + 30), fill=(40, 40, 44))
    return out

def hand_mask(h, grow=0.30):
    m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m)
    pts = h["pts"]; r = h["size"] * grow
    chains = [(0, 1, 2, 3, 4), (0, 5, 6, 7, 8), (0, 9, 10, 11, 12), (0, 13, 14, 15, 16), (0, 17, 18, 19, 20)]
    for ch in chains: d.line([pts[i] for i in ch], fill=255, width=int(r * 1.6), joint="curve")
    d.polygon([pts[i] for i in (0, 1, 5, 9, 13, 17)], fill=255)
    for p in pts: d.ellipse((p[0] - r * 0.8, p[1] - r * 0.8, p[0] + r * 0.8, p[1] + r * 0.8), fill=255)
    # wrist stub
    wx, wy = pts[0]; d.ellipse((wx - r * 1.0, wy - r * 0.6, wx + r * 1.0, wy + r * 1.1), fill=255)
    return m.filter(ImageFilter.GaussianBlur(2))

def e_glass_slam(T, t, D):
    fr, m = at(T)
    zin = L.ease_in_cubic(prog(t, 0.55, 0.92)); zout = ease(prog(t, 1.45, 2.05))
    z = 1.0 + 0.55 * zin - 0.55 * zout
    imp = prog(t, 0.92, 1.02) * (1 - prog(t, 1.35, 1.5))
    zc = (352, 820)
    img = L.scale_about(fr.convert("RGBA"), z, zc[0] / W, zc[1] / H)
    # palms flatten on the glass
    if imp > 0.01:
        for h in hands_at(min(T, 1.15)):
            px = zc[0] + (h["x"] * 2 / 3 - zc[0]) * z; py = zc[1] + (h["y"] * 2 / 3 - zc[1]) * z
            img = _press(img, px, py, 0.9 * imp, h["size"] * z * 1.3)
    # handprints frozen at impact, fading
    if t >= 0.95:
        fade = 1 - prog(t, 1.3, D - 0.1)
        hp = Image.new("L", (W, H), 0)
        for h in hands_at(1.05):
            mk = hand_mask(h, 0.22)
            mk = L.scale_about(mk.convert("RGBA"), 1.55, zc[0] / W, zc[1] / H).getchannel("R") if True else mk
            hp = Image.fromarray(np.maximum(np.asarray(hp), np.asarray(mk)))
        fog = Image.new("RGBA", (W, H), (255, 255, 255, 0))
        fog.putalpha(hp.filter(ImageFilter.GaussianBlur(5)).point(lambda v: int(v * 0.30 * fade)))
        img.alpha_composite(fog)
        rim = hp.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.2))
        r2 = Image.new("RGBA", (W, H), (255, 255, 255, 0)); r2.putalpha(rim.point(lambda v: int(min(255, v * 2) * 0.5 * fade)))
        img.alpha_composite(r2)
        # glass streak
        s = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(s).polygon([(90, 0), (170, 0), (40, H), (-40, H)], fill=(255, 255, 255, int(46 * fade)))
        img.alpha_composite(s.filter(ImageFilter.GaussianBlur(10)))
    pic = screen_of(img)
    out = camera_ui(pic, T)
    if 0.92 <= t <= 1.2:
        k = int(9 * (1 - prog(t, 0.92, 1.2)) * math.sin(t * 90))
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 255)); sh.paste(out, (k, -abs(k) // 2)); out = sh
    return out

def _press(im, cx, cy, strength, radius):
    arr = np.array(im.convert("RGBA")); h, w = arr.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32); dx, dy = xs - cx, ys - cy
    dist = np.sqrt(dx * dx + dy * dy) + 1e-4; tt = np.clip(1 - dist / radius, 0, 1) ** 2
    mag = strength * tt * radius * 0.20
    mx = (xs - dx / dist * mag).astype(np.float32); my = (ys - dy / dist * mag).astype(np.float32)
    return Image.fromarray(cv2.remap(arr, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT))

def e_hand_from_screen(T, t, D):
    fr, m = at(T)
    pic = screen_of(fr.convert("RGBA"))
    out = camera_ui(pic, T)
    em = eob(prog(T, 3.80, 4.08)) * (1 - L.ease_in_cubic(prog(T, 4.36, 4.50)))
    if em > 0.01:
        hs = [h for h in hands_at(T) if h["side"] == "Left"]
        if hs:
            h = hs[0]
            mk = hand_mask(h, 0.26)
            mk = Image.fromarray(np.minimum(np.asarray(mk), np.asarray(m.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(9))))).filter(ImageFilter.GaussianBlur(1.5))
            hand = fr.convert("RGBA"); hand.putalpha(mk)
            bb = mk.getbbox()
            if bb:
                hand = hand.crop(bb); wx, wy = h["pts"][0]
                s = 1.0 + 1.0 * em
                hw, hh = int(hand.width * s), int(hand.height * s)
                hr = hand.resize((hw, hh), Image.Resampling.LANCZOS)
                # wrist stays the anchor, shifted toward the viewer (down/right) as it grows
                ax = wx + 40 * em; ay = (wy - SRC_TOP + IMG_TOP) + 70 * em
                x = ax - (wx - bb[0]) * s; y = ay - (wy - bb[1]) * s
                sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                L.paste(sh, L.drop_shadow(hr, (14, 26), 18, int(170 * em)), (int(x) - 58, int(y) - 58))
                out.alpha_composite(sh)
                # cracked glass where the finger broke through
                if False:
                    d = ImageDraw.Draw(out); cx, cy = x + (h["pts"][8][0] - bb[0]) * s, y + (h["pts"][8][1] - bb[1]) * s
                    rnd = np.random.default_rng(3); a = int(200 * prog(em, 0.5, 1))
                    for k in range(9):
                        ang = rnd.uniform(0, math.tau); L1 = rnd.uniform(40, 110)
                        p1 = (cx + math.cos(ang) * 22, cy + math.sin(ang) * 22); p2 = (cx + math.cos(ang) * L1, cy + math.sin(ang) * L1)
                        p3 = (p2[0] + rnd.uniform(-18, 18), p2[1] + rnd.uniform(-18, 18))
                        d.line([p1, p2, p3], fill=(255, 255, 255, a), width=2)
                    d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), outline=(255, 255, 255, a), width=2)
                    out.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 0)))
                L.paste(out, hr, (int(x), int(y)))
    return out

_hires = {}
def hires(T):
    i = int(round(T * FPS))
    if i not in _hires:
        cap = cv2.VideoCapture(SRC); cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); cap.release()
        _hires[i] = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    return _hires[i]

def draw_wheel(d, zoom):
    cx, cy, R = W / 2, IMG_BOT + 330, 330
    d.pieslice((cx - R, cy - R, cx + R, cy + R), 200, 340, fill=(20, 20, 22, 205))
    stops = [0.5, 1, 2, 3, 5, 8]
    def ang_of(z):  # log scale, current zoom sits at -90 deg (top)
        return -90 + (math.log2(z) - math.log2(zoom)) * 34
    for k in range(-30, 120):
        z = 0.5 * 2 ** (k / 24)
        a = math.radians(ang_of(z))
        if not (-158 < math.degrees(a) < -22): continue
        major = any(abs(z - s) < 0.02 * s for s in stops)
        r1 = R - (34 if major else 18)
        d.line((cx + math.cos(a) * (R - 6), cy + math.sin(a) * (R - 6), cx + math.cos(a) * r1, cy + math.sin(a) * r1), fill=(255, 255, 255, 230 if major else 110), width=3 if major else 2)
    for s in stops:
        a = math.radians(ang_of(s))
        if -150 < math.degrees(a) < -30:
            d.text((cx + math.cos(a) * (R - 62), cy + math.sin(a) * (R - 62)), (f"{s:g}" if s != 0.5 else ".5"), font=F("b", 22), fill=(255, 255, 255), anchor="mm")
    d.polygon([(cx - 10, cy - R - 14), (cx + 10, cy - R - 14), (cx, cy - R + 2)], fill=YEL)
    d.text((cx, cy - R - 40), f"{zoom:.1f}×", font=F("b", 28), fill=YEL, anchor="mm")

def e_zoom_wheel(T, t, D):
    z = 1.0 + 0.9 * ease(prog(T, 1.72, 2.25)) + 1.1 * ease(prog(T, 2.32, 2.95))
    fr = hires(T)  # 1080x1920
    fz = L.scale_about(fr.convert("RGBA"), z, FCX / W, (FCY - 30) / H).resize((W, H), Image.Resampling.LANCZOS)
    pic = screen_of(fz)
    show = prog(T, 1.35, 1.6) * (1 - prog(T, 3.3, 3.55))
    out = camera_ui(pic, T, wheel=True, modes=show < 0.05)
    if show > 0:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); draw_wheel(ImageDraw.Draw(layer), max(1.0, z))
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * show)))
        out.alpha_composite(layer)
    else:
        d = ImageDraw.Draw(out); txt = f"{z:.1f}×" if z > 1.01 else "1×"
        d.ellipse((W / 2 - 34, IMG_BOT - 80, W / 2 + 34, IMG_BOT - 12), fill=(0, 0, 0, 150))
        d.text((W / 2, IMG_BOT - 46), txt, font=F("b", 22), fill=YEL, anchor="mm")
    return out

EFFECTS.update({
    "glass_slam": (0.0, 2.6, e_glass_slam),
    "hand_from_screen": (3.3, 5.2, e_hand_from_screen),
    "zoom_wheel": (0.9, 3.7, e_zoom_wheel),
})

def render(name, outdir):
    a, b, fn = EFFECTS[name]; D = b - a; n = int(round(D * FPS))
    os.makedirs(outdir, exist_ok=True); out = f"{outdir}/{name}.mp4"
    with tempfile.TemporaryDirectory() as td:
        for i in range(n):
            t = i / FPS
            fn(a + t, t, D).convert("RGB").save(f"{td}/f_{i:05d}.jpg", quality=93)
        if name == "zoom_through_cut":
            (s1, e1), (s2, e2) = ZTC_AUDIO
            af = ["-filter_complex", f"[1:a]atrim={s1}:{e1},asetpts=PTS-STARTPTS[x];[1:a]atrim={s2}:{e2},asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1[a]", "-map", "0:v", "-map", "[a]"]
            ain = ["-i", SRC]
        else:
            ain = ["-ss", str(a), "-t", str(D), "-i", SRC]; af = ["-map", "0:v", "-map", "1:a"]
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-framerate", str(FPS), "-i", f"{td}/f_%05d.jpg", *ain, *af,
               "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out]
        subprocess.run(cmd, check=True)
    print("wrote", out)

if __name__ == "__main__":
    names = list(EFFECTS) if sys.argv[1] == "all" else sys.argv[1].split(",")
    for nm in names: render(nm, f"{HERE}/ifm")
