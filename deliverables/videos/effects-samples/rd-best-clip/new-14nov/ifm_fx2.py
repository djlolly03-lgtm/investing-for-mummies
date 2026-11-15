#!/usr/bin/env python3
"""v02 of the 17 phone-canvas effects: rebuilt to MATCH the @ask.kenji originals (look, layout, captions, UI),
with Hiral's own words as the captions. 14 Nov 2026. v01 = ifm_fx.py (kept).
  python ifm_fx2.py <name>[,<name>...]|all     -> ifm2/<name>.mp4
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ifm_fx as B
from ifm_fx import W, H, FPS, FCX, FCY, at, frames, cut, prog, ease, eob, put_center, shadowed, L, WORDS

AV = "/System/Library/Fonts/Avenir Next.ttc"; HN = "/System/Library/Fonts/HelveticaNeue.ttc"
DD = "/System/Library/Fonts/Supplemental/Didot.ttc"; GI = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
def AVH(s): return ImageFont.truetype(AV, s, index=8)        # Avenir Next Heavy
def AVB(s): return ImageFont.truetype(AV, s, index=0)
def AVD(s): return ImageFont.truetype(AV, s, index=2)
def AVM(s): return ImageFont.truetype(AV, s, index=5)
def AVR(s): return ImageFont.truetype(AV, s, index=7)
def DID(s, b=False): return ImageFont.truetype(DD, s, index=2 if b else 0)
def GIT(s): return ImageFont.truetype(GI, s)
MONO = "/System/Library/Fonts/Supplemental/Andale Mono.ttf"
LIME = (212, 240, 74); YEL = (255, 214, 10); CHAR = (34, 34, 36)

def warm(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    a = a * [1.04, 1.0, 0.94] + 4
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")

def spoken(T, a, b, maxw=4):
    """Words said in [a, T], last maxw of the current phrase (phrases break on punctuation / pause)."""
    ws = [(w, s) for w, s in WORDS if a - 0.05 <= s <= T and s < b]
    if not ws: return []
    out = []
    for w, s in ws:
        out.append(w.strip(",.").lower())
        if w.endswith((",", ".")) and s < T - 0.25: out = []
    return out[-maxw:]

def txt(d, xy, s, f, fill, anchor="mm", stroke=0, sfill=(0, 0, 0, 120)):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=sfill)

def soft_shadow_text(im, xy, s, f, fill, anchor="mm", blur=6, op=150):
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).text((xy[0], xy[1] + 3), s, font=f, fill=(0, 0, 0, op), anchor=anchor)
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur))); ImageDraw.Draw(im).text(xy, s, font=f, fill=fill, anchor=anchor)

def cap_small_big(im, words, y):
    """'here's a simple' small + last word big (orbit / couch-wall style)."""
    if not words: return
    if len(words) == 1: soft_shadow_text(im, (W / 2, y), words[0], AVH(64), (255, 255, 255)); return
    soft_shadow_text(im, (W / 2, y - 44), " ".join(words[:-1]), AVB(34), (255, 255, 255))
    soft_shadow_text(im, (W / 2, y + 8), words[-1], AVH(66), (255, 255, 255))

def cap_line(im, words, y, size=44, caps=False, hi=None, f=None):
    if not words: return
    s = " ".join(words); s = s.upper() if caps else s
    soft_shadow_text(im, (W / 2, y), s, f or AVH(size), (255, 255, 255))

# ---------------------------------------------------------------- 70 orbit
def e_orbit(T, t, D):
    fr, m = at(T); out = warm(fr); fs, _ = frames()
    cx, cy, rx, ry = 352, 850, 300, 70
    spin = t / 3.0 * math.tau + 0.6
    n = 6; items = []
    for i in range(n):
        a = spin + i * math.tau / n; z = math.sin(a)
        x, y = cx + math.cos(a) * rx, cy + z * ry
        sc = 0.62 + 0.38 * (z * 0.5 + 0.5)
        src = fs[(int(T * FPS) + i * 23) % len(fs)]
        cw, ch = 112, 200
        card = L.fit_cover(src, (cw, ch)).convert("RGBA")
        card = L.round_image(card, 12)
        bz = Image.new("RGBA", (cw + 8, ch + 8), (0, 0, 0, 0)); ImageDraw.Draw(bz).rounded_rectangle((0, 0, cw + 7, ch + 7), 15, fill=(255, 255, 255, 245))
        bz.alpha_composite(card, (4, 4))
        items.append((z, shadowed(bz, (0, 8), 10, 110), x, y, sc))
    for z, c, x, y, s in sorted(items, key=lambda k: k[0]):
        if z < 0: put_center(out, c, x, y, s)
    out.alpha_composite(cut(fr, m))
    for z, c, x, y, s in sorted(items, key=lambda k: k[0]):
        if z >= 0: put_center(out, c, x, y, s)
    cap_small_big(out, spoken(T, 0.0, 3.6, 4), 250)
    return out

# ---------------------------------------------------------------- 71 couch wall
def e_couch_wall(T, t, D):
    fr, m = at(T); fs, _ = frames(); out = warm(fr)
    cols, rows = 4, 5; tw, th = W // cols, int(H * 0.68) // rows
    zooms = [1.0, 1.6, 1.25, 2.1, 1.0, 1.4, 1.8, 1.15]
    d = None
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            p = prog(t, 0.12 + ((i * 7) % 20) * 0.045, 0.30 + ((i * 7) % 20) * 0.045)
            if p <= 0: continue
            src = fs[(int(T * FPS) + i * 19) % len(fs)]
            z = zooms[i % len(zooms)]
            crop = L.scale_about(src.convert("RGB"), z, FCX / W, (FCY - 40) / H)
            tile = L.fit_cover(crop, (tw - 6, th - 6)).convert("RGBA")
            tile = L.round_image(tile, 6); td = ImageDraw.Draw(tile)
            td.rounded_rectangle((6, tile.height - 24, 70, tile.height - 7), 4, fill=(0, 0, 0, 150))
            td.text((11, tile.height - 15), f"CUT {i + 1:02d}", font=AVB(12), fill=(255, 255, 255), anchor="lm")
            if i in (2, 7, 9, 14):
                td.rounded_rectangle((tile.width - 92, 6, tile.width - 6, 22), 4, fill=(255, 255, 255, 220))
                td.text((tile.width - 49, 14), "one clip, new edit", font=AVD(10), fill=(20, 20, 20), anchor="mm")
            put_center(out, tile, c * tw + tw / 2, r * th + th / 2, 0.7 + 0.3 * eob(p))
    out.alpha_composite(cut(fr, m))
    cap_small_big(out, spoken(T, 3.6, 6.4, 3), 905)
    return out

# ---------------------------------------------------------------- 72 ui world
CREAM2 = (243, 240, 232)
def asterisk(d, cx, cy, r, col):
    for k in range(8):
        a = k * math.pi / 4; d.line((cx, cy, cx + math.cos(a) * r, cy + math.sin(a) * r), fill=col, width=3)

def e_ui_world(T, t, D):
    fr, m = at(T); fs, _ = frames()
    out = Image.new("RGBA", (W, H), CREAM2 + (255,))
    top = 520
    out.paste(warm(fr).crop((0, 370, W, 370 + H - top)), (0, top))
    d = ImageDraw.Draw(out)
    asterisk(d, 272, 92, 12, (215, 119, 87)); d.text((292, 92), "IFM Studio", font=DID(36), fill=(40, 34, 30), anchor="lm")
    zx0, zy0, zx1, zy1 = 36, 150, W - 36, 395
    d.rounded_rectangle((zx0, zy0, zx1, zy1), 18, fill=(255, 255, 255), outline=(225, 218, 206), width=2)
    for x in range(zx0 + 14, zx1 - 14, 16): d.line((x, zy0 + 12, x + 8, zy0 + 12), fill=(218, 210, 196), width=2); d.line((x, zy1 - 12, x + 8, zy1 - 12), fill=(218, 210, 196), width=2)
    n_in = sum(1 for k in range(5) if T >= 3.85 + k * 0.32)
    if n_in == 0:
        d.text((W / 2, 250), "↥  Drop files here", font=AVD(24), fill=(198, 118, 92), anchor="mm")
    d.text((zx0 + 26, zy1 - 36), "Drop the clips you want to edit" if n_in < 5 else "", font=AVR(20), fill=(170, 160, 148), anchor="lm")
    for k in range(5):
        ts = 3.85 + k * 0.32; p = prog(T, ts, ts + 0.25)
        if p <= 0: continue
        th_ = L.fit_cover(fs[(k * 61 + 40) % len(fs)], (86, 128)).convert("RGBA"); th_ = L.round_image(th_, 10)
        b = Image.new("RGBA", (94, 136), (0, 0, 0, 0)); ImageDraw.Draw(b).rounded_rectangle((0, 0, 93, 135), 12, fill=(40, 40, 44)); b.alpha_composite(th_, (4, 4))
        x = zx0 + 30 + k * 104; y = 182 - (1 - L.ease_out_cubic(p)) * 120
        L.paste(out, shadowed(b, (0, 6), 6, 90), (int(x) - 20, int(y) - 20))
    if n_in >= 5:
        p = eob(prog(T, 5.5, 5.75)); tg = Image.new("RGBA", (130, 36), (0, 0, 0, 0)); ImageDraw.Draw(tg).rounded_rectangle((0, 0, 129, 35), 8, fill=YEL); ImageDraw.Draw(tg).text((65, 18), "RAW CLIPS", font=AVH(18), fill=(30, 30, 30), anchor="mm")
        put_center(out, tg.rotate(-4, Image.Resampling.BICUBIC, expand=True), zx1 - 80, 230, p)
        if T >= 5.8:
            d = ImageDraw.Draw(out); d.ellipse((zx0 + 26, zy1 - 46, zx0 + 44, zy1 - 28), fill=(210, 80, 70))
            d.text((zx0 + 54, zy1 - 37), "5 clips added — ready to edit", font=AVD(20), fill=(60, 52, 46), anchor="lm")
    cap_line(out, spoken(T, 3.6, 6.5, 3), 1130, size=44, caps=True)
    return out

# ---------------------------------------------------------------- 73 frame break
def e_frame_break(T, t, D):
    fr, m = at(T); base = warm(fr)
    p = L.ease_out_cubic(prog(t, 0.15, 0.55))
    fx0, fy0, fx1, fy1 = 150, 610, 570, 1080
    x0, y0, x1, y1 = L.lerp(0, fx0, p), L.lerp(0, fy0, p), L.lerp(W, fx1, p), L.lerp(H, fy1, p)
    dark = Image.blend(base, Image.new("RGBA", (W, H), (18, 18, 20, 255)), 0.86 * p)
    mk = Image.new("L", (W, H), 0); ImageDraw.Draw(mk).rounded_rectangle((x0, y0, x1, y1), int(28 * p), fill=255)
    out = Image.composite(base, dark, mk)
    subj = cut(base, m)
    keep = Image.new("L", (W, H), 0); ImageDraw.Draw(keep).rectangle((0, 0, W, y1 - 4), fill=255)
    subj.putalpha(Image.fromarray(np.minimum(np.asarray(subj.getchannel("A")), np.asarray(keep))))
    out.alpha_composite(subj)
    if p > 0.5:
        a = int(255 * prog(p, 0.5, 1.0)); d = ImageDraw.Draw(out)
        by = y1 + 34
        d.rounded_rectangle((x0 + 10, by - 22, x1 - 10, by + 22), 22, fill=(30, 30, 32, int(a * 0.9)))
        d.ellipse((x0 + 22, by - 13, x0 + 48, by + 13), fill=(235, 235, 235, a))
        d.text((x0 + 58, by), "hiral", font=AVD(20), fill=(255, 255, 255, a), anchor="lm")
        d.rounded_rectangle((x0 + 112, by - 13, x0 + 182, by + 13), 8, outline=(255, 255, 255, a), width=2)
        d.text((x0 + 147, by), "Follow", font=AVD(15), fill=(255, 255, 255, a), anchor="mm")
        d.text((x1 - 26, by), "edit 73 of 90", font=AVR(15), fill=(200, 200, 200, a), anchor="rm")
    return out

# ---------------------------------------------------------------- 74 digital zoom
def e_digital_zoom(T, t, D):
    fr, _ = at(T)
    z = 1.0 + (0.28 if T >= 7.26 else 0) + (0.30 if T >= 7.54 else 0)
    out = L.scale_about(warm(fr), z, FCX / W, (FCY + 30) / H)
    main = [w for w, s0 in (("make", 6.28), ("your", 7.04), ("voice", 7.26)) if T >= s0]
    if main: soft_shadow_text(out, (W / 2, 900), " ".join(main), AVH(58), (255, 255, 255))
    if T >= 7.54: soft_shadow_text(out, (W / 2, 964), "heard", AVH(62), YEL)
    return out

# ---------------------------------------------------------------- 75 phone mockup
def e_phone_mockup(T, t, D):
    fr, m = at(T); out = warm(fr); fs, _ = frames()
    pw, ph = 236, 470
    ph_ = Image.new("RGBA", (pw, ph), (0, 0, 0, 0)); d = ImageDraw.Draw(ph_)
    d.rounded_rectangle((0, 0, pw - 1, ph - 1), 38, fill=(10, 10, 12, 255))
    d.rounded_rectangle((7, 7, pw - 8, ph - 8), 32, fill=(24, 24, 27, 255))
    d.text((30, 30), "9:41", font=AVB(14), fill=(255, 255, 255), anchor="lm"); d.rounded_rectangle((pw / 2 - 30, 20, pw / 2 + 30, 36), 8, fill=(0, 0, 0))
    d.ellipse((24, 58, 48, 82), fill=LIME); d.text((56, 64), "Money assistant", font=AVB(16), fill=(255, 255, 255), anchor="lm")
    d.text((56, 82), "on your plan", font=AVR(12), fill=(150, 150, 156), anchor="lm")
    if T >= 4.2: d.text((24, 112), "Found a smarter plan for you.", font=AVR(14), fill=(230, 230, 232), anchor="lm")
    if T >= 4.5:
        d.rounded_rectangle((18, 130, pw - 18, 330), 14, fill=(36, 36, 40))
        d.text((32, 150), "● RECOMMENDATION", font=AVD(11), fill=(160, 200, 120), anchor="lm")
        d.text((32, 174), "Ask about the fees,", font=AVB(16), fill=(255, 255, 255), anchor="lm")
        d.text((32, 196), "then decide on the SIP", font=AVB(16), fill=(255, 255, 255), anchor="lm")
        for k in range(3):
            th_ = L.round_image(L.fit_cover(fs[(k * 80 + 30) % len(fs)], (56, 70)).convert("RGBA"), 6); L.paste(ph_, th_, (32 + k * 62, 220))
        d = ImageDraw.Draw(ph_)
        tap = prog(T, 5.6, 5.75)
        d.rounded_rectangle((32, 300, 118, 326), 13, fill=LIME if tap > 0 else (255, 255, 255))
        d.text((75, 313), "Approved ✓" if tap > 0 else "Approve", font=AVB(13), fill=(20, 20, 20), anchor="mm")
        d.text((165, 313), "Not now", font=AVR(13), fill=(170, 170, 176), anchor="mm")
        if 0 < tap < 1 or (5.6 <= T <= 6.0):
            r = 10 + 26 * prog(T, 5.6, 5.95); d.ellipse((75 - r, 313 - r, 75 + r, 313 + r), outline=(255, 255, 255, int(200 * (1 - prog(T, 5.6, 5.95)))), width=3)
    d.rounded_rectangle((18, ph - 60, pw - 18, ph - 26), 17, fill=(40, 40, 44)); d.text((34, ph - 43), "Message", font=AVR(13), fill=(130, 130, 136), anchor="lm")
    enter = eob(prog(t, 0.0, 0.45)); rot = L.lerp(20, 6, enter)
    pr = shadowed(ph_.rotate(rot, Image.Resampling.BICUBIC, expand=True), (-10, 22), 20, 150)
    x = L.lerp(W + 30, W + 46 - pr.width, enter)
    L.paste(out, pr, (int(x), 150))
    cap_line(out, spoken(T, 3.4, 6.6, 3), 1060, size=34, f=AVB(34))
    return out

# ---------------------------------------------------------------- 76 checklist
def e_checklist(T, t, D):
    fr, m = at(T); out = warm(fr)
    items = [("Ask the right questions", 5.76), ("Make your voice heard", 7.26), ("Take an active role", 8.62)]
    cx0, cy0, cw, chh = 34, 60, W - 68, 300
    blur = out.crop((cx0, cy0, cx0 + cw, cy0 + chh)).filter(ImageFilter.GaussianBlur(14))
    card = Image.blend(blur, Image.new("RGBA", blur.size, (30, 30, 32, 255)), 0.85)
    mk = Image.new("L", card.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, cw - 1, chh - 1), 22, fill=255); card.putalpha(mk)
    d = ImageDraw.Draw(card)
    done = [T >= ts + 0.9 for _, ts in items]
    d.ellipse((24, 26, 34, 36), fill=LIME); d.text((44, 31), "ALL YOU NEED TO DO", font=AVD(16), fill=(170, 170, 176), anchor="lm")
    d.rounded_rectangle((cw - 92, 18, cw - 22, 44), 13, fill=(52, 52, 56)); d.text((cw - 57, 31), f"{sum(done)} of 3", font=AVD(14), fill=(220, 220, 224), anchor="mm")
    d.line((24, 62, cw - 24, 62), fill=(62, 62, 66), width=4)
    pr = sum(prog(T, ts + 0.9, ts + 1.3) for _, ts in items) / 3
    if pr > 0: d.line((24, 62, 24 + (cw - 48) * pr, 62), fill=LIME, width=4)
    for i, (lab, ts) in enumerate(items):
        y = 106 + i * 66; cx = 44
        typed = int(len(lab) * prog(T, ts, ts + 0.8))
        if done[i]:
            d.ellipse((cx - 15, y - 15, cx + 15, y + 15), fill=LIME); d.line((cx - 7, y, cx - 2, y + 6, cx + 8, y - 6), fill=(20, 20, 20), width=4)
        else:
            d.ellipse((cx - 14, y - 14, cx + 14, y + 14), outline=(150, 150, 156), width=3)
        if typed > 0:
            s = lab[:typed]; d.text((cx + 32, y), s, font=AVD(30), fill=(255, 255, 255) if typed >= len(lab) else (235, 235, 238), anchor="lm")
            if typed < len(lab) and int(t * 4) % 2 == 0:
                x = cx + 32 + d.textlength(s, font=AVD(30)); d.line((x + 3, y - 16, x + 3, y + 16), fill=(255, 255, 255), width=2)
        else:
            d.rounded_rectangle((cx + 32, y - 6, cx + 32 + [230, 190, 160][i], y + 6), 6, fill=(70, 70, 74))
    a = L.ease_out_cubic(prog(t, 0, 0.35)); card.putalpha(card.getchannel("A").point(lambda v: int(v * a)))
    L.paste(out, shadowed(card, (0, 10), 14, 100), (cx0 - 46, cy0 - 46))
    return out

def paste_sh(out, layer, x, y, off=(0, 8), blur=10, op=110):
    s = L.drop_shadow(layer, off, blur, op); pad = blur * 2 + max(abs(off[0]), abs(off[1])) + 4
    L.paste(out, s, (int(x - pad), int(y - pad)))

def note(text, style, rot):
    if style == "cream":
        f = DID(26, True); lines = text.split("\n")
        tmp = ImageDraw.Draw(Image.new("RGBA", (4, 4))); w = int(max(tmp.textlength(l, font=f) for l in lines) + 30); h = 30 * len(lines) + 30
        c = Image.new("RGBA", (w, h), (247, 242, 228, 255)); d = ImageDraw.Draw(c)
        d.text((10, 6), "THE MONEY TIMES", font=AVD(9), fill=(150, 70, 60))
        for i, l in enumerate(lines): d.text((12, 20 + i * 30), l, font=f, fill=(25, 25, 25))
    elif style == "black":
        f = AVH(21); lines = text.split("\n"); tmp = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
        w = int(max(tmp.textlength(l, font=f) for l in lines) + 26); h = 25 * len(lines) + 18
        c = Image.new("RGBA", (w, h), (18, 18, 18, 255)); d = ImageDraw.Draw(c)
        for i, l in enumerate(lines): d.text((w / 2, 10 + i * 25), l, font=f, fill=(255, 255, 255), anchor="ma")
    elif style == "yellow":
        f = AVH(21); lines = text.split("\n"); tmp = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
        w = int(max(tmp.textlength(l, font=f) for l in lines) + 26); h = 25 * len(lines) + 18
        c = Image.new("RGBA", (w, h), YEL + (255,)); d = ImageDraw.Draw(c)
        for i, l in enumerate(lines): d.text((w / 2, 10 + i * 25), l, font=f, fill=(20, 20, 20), anchor="ma")
    else:  # search pill
        f = AVB(20); tmp = ImageDraw.Draw(Image.new("RGBA", (4, 4))); w = int(tmp.textlength(text, font=f) + 66)
        c = Image.new("RGBA", (w, 46), (0, 0, 0, 0)); d = ImageDraw.Draw(c); d.rounded_rectangle((0, 0, w - 1, 45), 23, fill=(255, 255, 255))
        d.ellipse((18, 14, 32, 28), outline=(30, 30, 30), width=3); d.line((30, 26, 36, 32), fill=(30, 30, 30), width=3)
        d.text((46, 23), text, font=f, fill=(20, 20, 20), anchor="lm")
    return c.rotate(rot, Image.Resampling.BICUBIC, expand=True)

# ---------------------------------------------------------------- 77 headline wall
def e_headline_wall(T, t, D):
    fr, m = at(T); out = warm(fr)
    N = [("Who handles\nthe money?", "cream", -5, 110, 120), ("money questions", "search", 0, 360, 70), ("POV: you finally\nread the fine print", "black", 4, 590, 120),
         ("Same salary,\nnew plan.", "cream", 3, 120, 270), ("ask why", "yellow", -6, 290, 220), ("Know your\nSIP.", "cream", -3, 600, 285),
         ("fees, explained", "black", 5, 430, 210), ("again\nand again", "black", -4, 95, 420), ("your say", "yellow", 7, 610, 420),
         ("Read it\nbefore you sign.", "cream", 4, 360, 360), ("Mummies\nwho invest", "cream", -6, 105, 600), ("every\nrupee", "yellow", 5, 625, 590)]
    for i, (s, st, rot, cx, cy) in enumerate(N):
        p = prog(t, 0.1 + i * 0.2, 0.32 + i * 0.2)
        if p <= 0: continue
        c = note(s, st, rot); c = c.resize((int(c.width * 1.3), int(c.height * 1.3)), Image.Resampling.BICUBIC)
        sc = 0.3 + 0.85 * eob(p) if p < 0.6 else (1.15 - 0.15 * prog(p, 0.6, 1.0))
        cs = L.drop_shadow(c, (0, 5), 6, 90); put_center(out, cs, cx, cy, sc)
    return out

# ---------------------------------------------------------------- 78 zoom-through cut
def e_zoom_through_cut(T, t, D):
    if t < 1.3:   # src 1.9-3.2: caption, then exponential zoom into the dark of her top
        src = 1.9 + t; p = L.ease_in_cubic(prog(t, 0.55, 1.3)); z = 6.0 ** p
        fr, _ = at(src); base = warm(fr)
        n = 1 + int(10 * p); acc = None
        for k in range(n):
            im = np.asarray(L.scale_about(base.convert("RGB"), z * (1 + 0.05 * k * p), FCX / W, 860 / H), dtype=np.float32)
            acc = im if acc is None else acc + im
        out = Image.fromarray((acc / n).astype(np.uint8)).convert("RGBA")
        dk = prog(t, 1.15, 1.3); out = Image.blend(out, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.85 * dk)
        if p < 0.15:
            ws = spoken(src, 1.76, 3.4, 3)
            if ws: soft_shadow_text(out, (W / 2, 960), " ".join(ws), GIT(46), (246, 236, 214))
        return out
    src = 3.76 + (t - 1.3); fr, _ = at(src)          # far side: a tighter framing, settling
    p = L.ease_out_cubic(prog(t, 1.3, 1.9)); z = L.lerp(1.9, 1.45, p)
    out = L.scale_about(warm(fr), z, FCX / W, (FCY + 10) / H)
    out = Image.blend(out, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.6 * (1 - prog(t, 1.3, 1.42)))
    ws = spoken(src, 3.76, 5.0, 3)
    if ws: soft_shadow_text(out, (W / 2, 1110), "  ".join(w.upper() for w in ws), AVD(26), (240, 240, 240))
    return out
EZ_AUDIO = [(1.9, 3.2), (3.76, 4.96)]

# ---------------------------------------------------------------- 79 chart grow
def e_chart_grow(T, t, D):
    fr, m = at(T); base = warm(fr)
    dim = L.ease_out_cubic(prog(t, 0, 0.4))
    out = Image.blend(base, Image.new("RGBA", (W, H), (0, 0, 0, 255)), 0.40 * dim)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i, l in enumerate("JFMAMJJASOND"):
        d.text((40 + i * 58, 40), l, font=AVD(16), fill=(255, 255, 255, int(170 * dim)), anchor="mm")
    pts = [(0, 600), (90, 598), (180, 594), (250, 590), (470, 520), (540, 450), (600, 340), (650, 230), (690, 120)]
    g = L.ease_in_cubic(prog(T, 8.4, 11.0)) * (len(pts) - 1)
    poly = [pts[0]]
    for i in range(1, len(pts)):
        if i <= g: poly.append(pts[i])
        else:
            f = g - (i - 1)
            if f > 0: poly.append((L.lerp(pts[i - 1][0], pts[i][0], f), L.lerp(pts[i - 1][1], pts[i][1], f)))
            break
    if len(poly) > 1:
        fill = Image.new("RGBA", (W, H), (0, 0, 0, 0)); fd = ImageDraw.Draw(fill)
        if poly[-1][0] > 470:
            right = [p for p in poly if p[0] >= 470]
            fd.polygon(right + [(right[-1][0], 640), (470, 640)], fill=LIME + (46,))
        lay.alpha_composite(fill.filter(ImageFilter.GaussianBlur(2)))
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(glow).line(poly, fill=LIME + (150,), width=12, joint="curve")
        lay.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)))
        d = ImageDraw.Draw(lay); d.line(poly, fill=LIME + (255,), width=4, joint="curve")
        ex, ey = poly[-1]; r = 7
        hg = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(hg).ellipse((ex - 22, ey - 22, ex + 22, ey + 22), fill=LIME + (170,)); lay.alpha_composite(hg.filter(ImageFilter.GaussianBlur(10)))
        d = ImageDraw.Draw(lay); d.ellipse((ex - r, ey - r, ex + r, ey + r), fill=(250, 255, 220))
        if ex > 520:
            pill = Image.new("RGBA", (150, 36), (0, 0, 0, 0)); pd = ImageDraw.Draw(pill); pd.rounded_rectangle((0, 0, 149, 35), 18, fill=YEL)
            pd.text((75, 18), "FUTURE ↗", font=AVH(18), fill=(20, 20, 20), anchor="mm")
            put_center(lay, pill, min(W - 90, ex - 100), ey + 6, eob(prog(ex, 520, 600)))
    out.alpha_composite(lay); out.alpha_composite(cut(Image.blend(base, Image.new("RGBA", (W, H), (0, 0, 0, 255)), 0.12 * dim), m))
    return out

# ---------------------------------------------------------------- 80 pullback reveal
def e_pullback_reveal(T, t, D):
    fr, _ = at(T); base = warm(fr)
    out = Image.new("RGBA", (W, H), (240, 238, 232, 255))
    p = L.ease_in_out_cubic(prog(t, 0.2, 1.1)) if hasattr(L, "ease_in_out_cubic") else ease(prog(t, 0.2, 1.1))
    s = L.lerp(1.0, 0.6, p); vw, vh = int(W * s), int(H * s * 0.86)
    bar = int(L.lerp(0, 34, p)); foot = int(L.lerp(0, 56, p))
    win = Image.new("RGBA", (vw, vh + bar + foot), (255, 255, 255, 255)); wd = ImageDraw.Draw(win)
    clip = L.fit_cover(base, (vw, vh)); win.paste(clip, (0, bar))
    if bar > 8:
        for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]): wd.ellipse((10 + i * 14, bar / 2 - 4, 18 + i * 14, bar / 2 + 4), fill=c)
        wd.text((vw / 2, bar / 2), "▣  hiral-clip.mp4", font=ImageFont.truetype(MONO, 12), fill=(80, 80, 86), anchor="mm")
        wd.text((vw - 12, bar / 2), "Assistant", font=AVD(11), fill=(80, 80, 86), anchor="rm")
    if foot > 20:
        fy = bar + vh; prg = prog(t, 0.9, D - 0.2)
        wd.text((12, fy + 12), "● rendering", font=ImageFont.truetype(MONO, 11), fill=(70, 110, 220), anchor="lm")
        wd.text((vw - 12, fy + 12), f"{int(46 + 92 * prg)} / 138", font=ImageFont.truetype(MONO, 11), fill=(120, 120, 126), anchor="rm")
        wd.rounded_rectangle((10, fy + 24, vw - 10, fy + 48), 6, fill=(232, 238, 252))
        rnd = np.random.default_rng(4)
        for k in range(0, vw - 24, 5):
            h_ = 3 + 8 * abs(math.sin(k * 0.21)) * rnd.uniform(0.5, 1)
            col = (70, 110, 220) if k < (vw - 24) * prg else (180, 196, 236)
            wd.line((14 + k, fy + 36 - h_, 14 + k, fy + 36 + h_), fill=col, width=2)
    ws = spoken(T, 0.0, 3.6, 3)
    if ws: ImageDraw.Draw(win).text((vw / 2, bar + vh - 50 * s), " ".join(ws), font=AVB(max(16, int(40 * s))), fill=(255, 255, 255), anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0, 90))
    win = L.round_image(win, int(14 * p))
    wx = int(L.lerp(0, W - vw - 40, p)); wy = int(L.lerp(0, 170, p))
    if p > 0.02: paste_sh(out, win, wx, wy, (0, 14), 18, int(120 * p))
    else: out.paste(win, (0, 0))
    if p > 0.6:
        a = prog(p, 0.6, 1.0); pan = Image.new("RGBA", (236, 214), (0, 0, 0, 0)); pd = ImageDraw.Draw(pan)
        pd.rounded_rectangle((0, 0, 235, 213), 12, fill=(255, 255, 255))
        pd.text((16, 22), "Working on", font=AVD(14), fill=(40, 40, 44), anchor="lm"); pd.rounded_rectangle((104, 12, 148, 32), 6, fill=(70, 110, 220)); pd.text((126, 22), "edit", font=AVB(12), fill=(255, 255, 255), anchor="mm")
        its = ["Loaded 1 clip", "Found her face", "Built the edit", "Captions added", "Rendered 30 fps"]
        for i, it in enumerate(its):
            ok = t >= 1.0 + i * 0.42; y = 56 + i * 31
            if ok: pd.ellipse((16, y - 8, 32, y + 8), fill=(60, 180, 90)); pd.line((20, y, 23, y + 4, 29, y - 4), fill=(255, 255, 255), width=2)
            else: pd.ellipse((16, y - 8, 32, y + 8), outline=(200, 200, 204), width=2)
            pd.text((42, y), it, font=AVD(14), fill=(40, 40, 44) if ok else (170, 170, 176), anchor="lm")
        pan.putalpha(pan.getchannel("A").point(lambda v: int(v * a)))
        paste_sh(out, pan, wx - 150, wy + 220, (0, 8), 12, 90)
        n = int(1 + 99 * L.ease_out_cubic(prog(t, 0.9, D - 0.3)))
        d = ImageDraw.Draw(out); d.text((34, 70), str(n), font=DID(96), fill=(25, 25, 25), anchor="lt")
        if n >= 100:
            d.ellipse((190, 74, 226, 110), fill=(60, 180, 90)); d.text((208, 92), "%", font=AVB(18), fill=(255, 255, 255), anchor="mm")
    return out

# ---------------------------------------------------------------- 81 green screen
def e_green_screen(T, t, D):
    fr, m = at(T); base = warm(fr)
    sw = t >= 0.9
    if not sw:
        bg = Image.new("RGBA", (W, H), (22, 200, 70, 255)); d = ImageDraw.Draw(bg)
        d.rounded_rectangle((W - 196, 40, W - 30, 72), 16, fill=(10, 60, 24)); d.ellipse((W - 184, 51, W - 174, 61), fill=(120, 255, 150))
        d.text((W - 166, 56), "KEY  #16C846", font=ImageFont.truetype(MONO, 15), fill=(200, 255, 210), anchor="lm")
    else:
        bg = Image.new("RGBA", (W, H), (246, 244, 240, 255)); d = ImageDraw.Draw(bg)
        hdr = Image.new("RGBA", (W, 150), (0, 0, 0, 0)); hd = ImageDraw.Draw(hdr)
        for y in range(150): hd.line((0, y, W, y), fill=(int(98 + y * 0.2), int(60 + y * 0.1), 230))
        bg.alpha_composite(hdr)
        d.rectangle((0, 150, W, 186), fill=(236, 234, 230)); d.text((W / 2, 168), "money hour — today", font=AVR(16), fill=(110, 110, 116), anchor="mm")
        d.rectangle((0, 186, W, 250), fill=(20, 20, 22)); d.ellipse((24, 212, 34, 222), fill=(235, 70, 60)); d.text((44, 217), "FOCUS", font=AVD(14), fill=(200, 200, 204), anchor="lm")
        secs = 59 - int(t - 0.9)
        d.text((120, 218), f"24 : {secs:02d}", font=AVH(34), fill=(255, 255, 255), anchor="lm"); d.text((300, 218), "Check your plan", font=AVD(18), fill=(220, 220, 224), anchor="lm")
        d.rounded_rectangle((W - 140, 202, W - 24, 234), 8, fill=(60, 60, 64)); d.text((W - 82, 218), "End sprint", font=AVD(15), fill=(230, 230, 234), anchor="mm")
        d.rounded_rectangle((20, 268, W - 20, 318), 10, fill=(253, 238, 236), outline=(240, 190, 184), width=2)
        d.ellipse((38, 284, 56, 302), outline=(220, 70, 60), width=3); d.text((70, 293), "Review your SIPs", font=AVD(20), fill=(40, 40, 44), anchor="lm")
        d.rounded_rectangle((W - 104, 280, W - 40, 306), 6, fill=(230, 70, 60)); d.text((W - 72, 293), "NOW", font=AVB(14), fill=(255, 255, 255), anchor="mm")
        for i, s in enumerate(["Ask about the fees", "Update the nominee"]):
            y = 352 + i * 46; d.ellipse((38, y - 9, 56, y + 9), outline=(170, 170, 176), width=2); d.text((70, y), s, font=AVR(19), fill=(120, 120, 126), anchor="lm")
        d.rectangle((0, H - 110, W, H), fill=(40, 70, 220))
        if t < 1.05: bg = Image.blend(Image.new("RGBA", (W, H), (255, 255, 255, 255)), bg, prog(t, 0.9, 1.05))
    s = cut(base, m, 1.0)
    s = L.scale_about(s, 1.0, 0.5, 0.5)
    bg.alpha_composite(s)
    ws = spoken(T, 9.52, 11.6, 3)
    if sw and ws:
        d = ImageDraw.Draw(bg); words = ws; hi = words[-1]
        f = AVH(26); full = " ".join(words); wtot = d.textlength(full, font=f) + 30
        x0 = W / 2 - wtot / 2 + 40; y0 = 420
        d.rounded_rectangle((x0, y0, x0 + wtot, y0 + 44), 8, fill=(18, 18, 18))
        x = x0 + 15
        for w in words:
            d.text((x, y0 + 22), w, font=f, fill=LIME if w == hi else (255, 255, 255), anchor="lm"); x += d.textlength(w + " ", font=f)
    return bg

# ---------------------------------------------------------------- 82 paper cut
def zig(d, x0, y0, x1, y1, n, col, w, rnd, vertical=True):
    pts = []
    for i in range(n + 1):
        f = i / n
        if vertical: pts.append((x0 + (x1 - x0) * f + rnd.uniform(-3, 3), (y0 if i % 2 == 0 else y1) + rnd.uniform(-6, 6)))
        else: pts.append(((x0 if i % 2 == 0 else x1) + rnd.uniform(-4, 4), y0 + (y1 - y0) * f + rnd.uniform(-3, 3)))
    d.line(pts, fill=col, width=w, joint="curve")

def e_paper_cut(T, t, D):
    tq = math.floor(t * 12) / 12; Tq = T - t + tq; fr, m = at(Tq)
    rnd = np.random.default_rng(int(tq * 12) % 3)
    out = Image.new("RGBA", (W, H), (240, 236, 224, 255)); d = ImageDraw.Draw(out)
    zig(d, 270, 70, 690, 560, 46, (140, 150, 220), 9, rnd)
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); hd = ImageDraw.Draw(hl)
    hd.polygon([(430, 600), (700, 580), (712, 860), (450, 880)], fill=(250, 232, 70, 255)); out.alpha_composite(hl.filter(ImageFilter.GaussianBlur(1.5)))
    d = ImageDraw.Draw(out); zig(d, 470, 630, 690, 820, 22, (40, 50, 90), 6, rnd)
    zig(d, 600, 840, 700, 940, 9, (230, 70, 90), 6, rnd)
    for k in range(5): d.ellipse((560 + k * 26, 980, 578 + k * 26, 998), outline=(40, 40, 50), width=3)
    for x, y in ((60, 700), (92, 718)): d.line((x - 10, y - 10, x + 10, y + 10), fill=(40, 40, 50), width=3); d.line((x - 10, y + 10, x + 10, y - 10), fill=(40, 40, 50), width=3)
    s = cut(fr, m, 0); a = s.getchannel("A")
    border = a.filter(ImageFilter.MaxFilter(15))
    st = Image.new("RGBA", (W, H), (0, 0, 0, 0)); wht = Image.new("RGBA", (W, H), (255, 255, 255, 255)); wht.putalpha(border); st.alpha_composite(wht); st.alpha_composite(s)
    st = L.scale_about(st, 1.0, 0.5, 1.0)
    paste_sh(out, st, -40 + int(rnd.integers(-2, 3)), 130 + int(rnd.integers(-2, 3)), (5, 8), 6, 110)
    L1 = [("A", "box_w", 0), ("S", "box_n", 1), ("K", "box_r", 2), ("?", "box_y", 3)]
    styles = {"box_w": ((255, 255, 255), (20, 20, 20), DID(64, True)), "box_n": ((30, 40, 80), (255, 255, 255), AVH(58)),
              "box_r": ((20, 20, 20), (255, 255, 255), DID(62, True)), "box_y": ((255, 214, 10), (20, 20, 20), AVH(60))}
    for ch, stl, i in L1:
        if T < 5.06 + i * 0.12: continue
        bgc, fg, f = styles[stl]; tile = Image.new("RGBA", (76, 88), bgc + (255,)); ImageDraw.Draw(tile).text((38, 44), ch, font=f, fill=fg, anchor="mm")
        paste_sh(out, tile.rotate([-6, 4, -3, 7][i] + rnd.uniform(-1.5, 1.5), Image.Resampling.BICUBIC, expand=True), 40 + i * 84, 90 + [0, 10, -4, 6][i], (3, 4), 3, 100)
    if T >= 4.3:
        for i, ch in enumerate("1Q"):
            pass
    if T >= 5.5:
        d = ImageDraw.Draw(out); r = prog(T, 5.5, 5.8)
        d.arc((22, 70, 380, 200), 190, 190 + 340 * r, fill=(220, 50, 60), width=5)
    return out

# ---------------------------------------------------------------- 83 doodle boil
def heart(d, cx, cy, s, col):
    d.ellipse((cx - s, cy - s * 0.6, cx, cy + s * 0.3), fill=col); d.ellipse((cx, cy - s * 0.6, cx + s, cy + s * 0.3), fill=col)
    d.polygon([(cx - s * 0.98, cy - 0.05 * s), (cx + s * 0.98, cy - 0.05 * s), (cx, cy + s * 1.05)], fill=col)

def e_doodle_boil(T, t, D):
    fr, m = at(T); base = warm(fr)
    rnd = np.random.default_rng(int(t * 12) // 2)
    g = np.asarray(base.convert("RGB")).astype(np.float32); gr = g.mean(2, keepdims=True)
    bgd = Image.fromarray(np.clip((g * 0.45 + gr * 0.55) * 0.7, 0, 255).astype(np.uint8)).convert("RGBA")
    out = bgd.copy(); out.alpha_composite(cut(base, m))
    a = m.point(lambda v: 255 if v > 110 else 0); ed = Image.fromarray(np.clip(np.asarray(a.filter(ImageFilter.MaxFilter(13)), np.int16) - np.asarray(a.filter(ImageFilter.MaxFilter(5)), np.int16), 0, 255).astype(np.uint8))
    sh = tuple(int(v) for v in rnd.integers(-2, 3, 2)); lay = Image.new("RGBA", (W, H), (255, 255, 255, 0)); lay.putalpha(ed.point(lambda v: int(v * prog(t, 0.1, 0.4))))
    L.paste(out, lay, sh)
    dl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(dl); j = lambda: rnd.uniform(-2.5, 2.5)
    if t > 0.35:   # clapper / phone icon top-left, fills pink later
        x, y = 70 + j(), 150 + j(); d.rectangle((x, y + 18, x + 90, y + 70), outline=(255, 255, 255), width=4, fill=(236, 110, 150) if t > 1.5 else None)
        d.polygon([(x, y + 18), (x + 90, y + 18), (x + 84, y), (x - 4, y + 2)], outline=(255, 255, 255), fill=None); d.line((x + 20, y + 2, x + 30, y + 18), fill=(255, 255, 255), width=4); d.line((x + 50, y + 1, x + 60, y + 18), fill=(255, 255, 255), width=4)
        for k in range(3): d.line((x + 12, y + 34 + k * 12, x + 70, y + 34 + k * 12), fill=(255, 255, 255), width=3)
    if t > 0.7:
        heart(d, 600 + j(), 300 + j(), 34, (236, 110, 150))
        for k, (dx, dy) in enumerate(((44, -40), (56, -22), (38, -54))): d.line((600 + dx + j(), 300 + dy + j(), 616 + dx + j(), 290 + dy + j()), fill=(250, 220, 90), width=3)
    if t > 1.1:
        pts = [(130 + 18 * math.cos(-math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else 0.45) + j(), 760 + 18 * math.sin(-math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else 0.45) + j()) for k in range(11)]
        d.line(pts, fill=(250, 220, 90), width=4, joint="curve")
    if t > 1.4:
        d.line([(640 + j(), 720 + j()), (610 + j(), 760 + j()), (640 + j(), 760 + j()), (600 + j(), 810 + j())], fill=(255, 255, 255), width=4)
        d.line([(600, 810), (600, 792)], fill=(255, 255, 255), width=4); d.line([(600, 810), (618, 806)], fill=(255, 255, 255), width=4)
    if t > 1.7:
        pts = [(270 + k * 18 + j(), 420 + (8 if k % 2 else -8) + j()) for k in range(11)]; d.line(pts, fill=(255, 255, 255), width=4, joint="curve")
    for (x0, y0, x1, y1, cx, cy) in ((30, 120, 200, 260, 85, 175), (540, 230, 700, 360, 590, 280), (90, 720, 180, 810, 110, 740), (570, 690, 680, 830, 610, 740)):
        reg = dl.crop((x0, y0, x1, y1)); big = reg.resize((reg.width * 2, reg.height * 2), Image.Resampling.BICUBIC)
        ImageDraw.Draw(dl).rectangle((x0, y0, x1, y1), fill=(0, 0, 0, 0))
        L.paste(dl, big, (int(cx - (cx - x0) * 2), int(cy - (cy - y0) * 2)))
    out.alpha_composite(dl)
    return out

# ---------------------------------------------------------------- 85 cover story
def e_cover_story(T, t, D):
    fr, m = at(T); base = warm(fr); out = base.copy(); d = ImageDraw.Draw(out)
    word = "MONEY"; f = DID(176); tw = d.textlength(word, font=f); x0 = (W - tw) / 2; y = 545
    n = int(len(word) * prog(t, 0.15, 0.9)) + (1 if t > 0.15 else 0)
    x = x0
    for i, ch in enumerate(word):
        if i < min(n, len(word)): soft_shadow_text(out, (x, y), ch, f, (250, 248, 244), anchor="ls", blur=8, op=90)
        x += d.textlength(ch, font=f)
    out.alpha_composite(cut(base, m))
    d = ImageDraw.Draw(out); a = int(255 * prog(t, 0.6, 1.0))
    if a:
        d.text((40, 46), "THE FAMILY-MONEY ISSUE", font=AVB(15), fill=(255, 255, 255, a), anchor="lm"); d.text((W - 36, 46), "NOV 2026", font=AVB(15), fill=(255, 255, 255, a), anchor="rm")
        soft_shadow_text(out, (40, 1120), "YOUR MONEY", AVH(46), (255, 255, 255), anchor="lm", blur=5, op=120)
        d = ImageDraw.Draw(out); d.text((42, 1166), "ask the right questions", font=GIT(24), fill=(250, 246, 236, a), anchor="lm")
        d.line((42, 1192, 140, 1192), fill=YEL + (a,), width=4)
        d.text((W - 40, 1102), "COVER", font=AVH(24), fill=YEL + (a,), anchor="rm"); d.text((W - 40, 1130), "STORY", font=AVH(24), fill=YEL + (a,), anchor="rm")
        rnd = np.random.default_rng(1); x = W - 150
        d.rectangle((x - 6, 1160, W - 34, 1222), fill=(255, 255, 255, a))
        while x < W - 42:
            w_ = int(rnd.integers(1, 4)); d.rectangle((x, 1166, x + w_, 1214), fill=(10, 10, 10, a)); x += w_ + int(rnd.integers(1, 4))
    return out

# ---------------------------------------------------------------- 86 glass type
def e_glass_type(T, t, D):
    fr, m = at(T); base = warm(fr); out = base.copy()
    word = "VOICE"; f = ImageFont.truetype(AV, 218, index=8)
    tmp = ImageDraw.Draw(Image.new("L", (4, 4))); tw = tmp.textlength(word, font=f); x0 = (W - tw) / 2 - 6; y = 590
    n = sum(1 for i in range(len(word)) if T >= 6.95 + i * 0.12)
    mask = Image.new("L", (W, H), 0); md = ImageDraw.Draw(mask); x = x0; boxes = []
    for i, ch in enumerate(word):
        cw = tmp.textlength(ch, font=f)
        if i < n:
            p = eob(prog(T, 6.95 + i * 0.12, 7.2 + i * 0.12))
            lm = Image.new("L", (W, H), 0); ImageDraw.Draw(lm).text((x, y), ch, font=f, fill=255, anchor="ls")
            if p < 1: lm = L.scale_about(lm.convert("RGBA"), max(0.05, p), (x + cw / 2) / W, (y - 80) / H).getchannel("R")
            mask = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(lm)))
        x += cw
    if n:
        inner = L.scale_about(base, 1.06, 0.5, 0.3).filter(ImageFilter.GaussianBlur(3))
        grad = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(grad)
        for yy in range(360, 620): k = (yy - 360) / 260; gd.line((0, yy, W, yy), fill=(int(250 - 120 * k), int(252 - 115 * k), int(255 - 100 * k), 255))
        inner = Image.blend(inner, grad, 0.55)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(mask.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.55)))
        L.paste(out, sh, (8, 16))
        g = inner.copy(); g.putalpha(mask); out.alpha_composite(g)
        # bevel: light top-left edge, dark bottom-right edge
        er = mask.filter(ImageFilter.MinFilter(11))
        rim = Image.fromarray(np.clip(np.asarray(mask, np.int16) - np.asarray(er, np.int16), 0, 255).astype(np.uint8))
        up = ImageChops_offset(rim, -4, -4); dn = ImageChops_offset(rim, 5, 5)
        dk = Image.new("RGBA", (W, H), (40, 50, 60, 0)); dk.putalpha(dn.point(lambda v: int(v * 0.8))); out.alpha_composite(dk)
        lt = Image.new("RGBA", (W, H), (255, 255, 255, 0)); lt.putalpha(up); out.alpha_composite(lt)
        sw = prog(T, 7.5, 8.2)
        if 0 < sw < 1:
            band = Image.new("L", (W, H), 0); bx = L.lerp(-150, W + 150, sw); ImageDraw.Draw(band).polygon([(bx, 330), (bx + 70, 330), (bx - 50, 640), (bx - 120, 640)], fill=235)
            band = Image.fromarray(np.minimum(np.asarray(band), np.asarray(mask))).filter(ImageFilter.GaussianBlur(4))
            sp = Image.new("RGBA", (W, H), (255, 255, 255, 0)); sp.putalpha(band); out.alpha_composite(sp)
    out.alpha_composite(cut(base, m))
    return out

def ImageChops_offset(im, dx, dy):
    o = Image.new("L", im.size, 0); o.paste(im, (dx, dy)); return o

EFFECTS = {
    "orbit": (0.0, 3.0, e_orbit), "couch_wall": (3.6, 6.4, e_couch_wall), "ui_world": (3.6, 6.5, e_ui_world),
    "frame_break": (0.0, 3.0, e_frame_break), "digital_zoom": (6.0, 8.4, e_digital_zoom), "phone_mockup": (3.6, 6.4, e_phone_mockup),
    "checklist": (5.4, 10.0, e_checklist), "headline_wall": (0.0, 3.6, e_headline_wall), "zoom_through_cut": (0.0, 2.5, e_zoom_through_cut),
    "chart_grow": (8.1, 11.6, e_chart_grow), "pullback_reveal": (0.0, 3.6, e_pullback_reveal), "green_screen": (8.1, 11.6, e_green_screen),
    "paper_cut": (3.6, 6.4, e_paper_cut), "doodle_boil": (6.0, 8.6, e_doodle_boil), "cover_story": (8.1, 11.0, e_cover_story),
    "glass_type": (6.6, 8.6, e_glass_type),
}

def render(name):
    import subprocess, tempfile
    a, b, fn = EFFECTS[name]; Dd = b - a; n = int(round(Dd * FPS)); os.makedirs(f"{B.HERE}/ifm2", exist_ok=True); out = f"{B.HERE}/ifm2/{name}.mp4"
    with tempfile.TemporaryDirectory() as td:
        for i in range(n): fn(a + i / FPS, i / FPS, Dd).convert("RGB").save(f"{td}/f_{i:05d}.jpg", quality=93)
        if name == "zoom_through_cut":
            (s1, e1), (s2, e2) = EZ_AUDIO
            ain = ["-i", B.SRC]; af = ["-filter_complex", f"[1:a]atrim={s1}:{e1},asetpts=PTS-STARTPTS[x];[1:a]atrim={s2}:{e2},asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1[a]", "-map", "0:v", "-map", "[a]"]
        else:
            ain = ["-ss", str(a), "-t", str(Dd), "-i", B.SRC]; af = ["-map", "0:v", "-map", "1:a"]
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-framerate", str(FPS), "-i", f"{td}/f_%05d.jpg", *ain, *af, "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], check=True)
    print("wrote", out, flush=True)

if __name__ == "__main__":
    names = list(EFFECTS) if sys.argv[1] == "all" else sys.argv[1].split(",")
    for nm in names: render(nm)
