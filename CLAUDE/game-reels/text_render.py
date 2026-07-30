#!/usr/bin/env python3
# Render kinetic-text overlay PNGs + end card via Pillow (no browser). Fast, inline.
import sys, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

key = sys.argv[1]
spec = json.load(open(sys.argv[2]))
BASE = "/Users/lollyg/Documents/investing for Mummies/CLAUDE"
OUT = f"{BASE}/game-reels/assets3/{key}"
os.makedirs(OUT, exist_ok=True)
LOGO = f"{BASE}/ifm-round-t.png"
W, H = 1080, 1920
style = spec["styleKind"]

def hx(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
acc = hx(spec["accA"])

if style == "matrix":
    F_BIG = "/System/Library/Fonts/Supplemental/Andale Mono.ttf"
    F_K = F_BIG; F_S = F_BIG
    big_col = acc; k_col = acc; s_col = (170, 255, 200); glow = acc
    align = "left"; uppercase = True
else:  # barbie
    F_BIG = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
    F_K = F_BIG; F_S = F_BIG
    big_col = acc; k_col = acc; s_col = (255, 255, 255); glow = acc
    align = "center"; uppercase = False

def font(path, size): return ImageFont.truetype(path, size)

def wrap(draw, text, fnt, maxw):
    words = text.split(); lines = []; cur = ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def block(draw, img, lines, fnt, color, x0, y0, lh, align, maxw):
    y = y0
    h = fnt.getbbox("Ay")[3] - fnt.getbbox("Ay")[1]
    # glow layer
    gl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(gl)
    for ln in lines:
        wln = draw.textlength(ln, font=fnt)
        x = x0 if align == "left" else (W - wln) / 2
        gd.text((x, y), ln, font=fnt, fill=glow + (255,))
        y += int(h * lh)
    gl = gl.filter(ImageFilter.GaussianBlur(12))
    img.alpha_composite(gl); img.alpha_composite(gl)  # double for intensity
    # crisp
    d2 = ImageDraw.Draw(img); y = y0
    for ln in lines:
        wln = draw.textlength(ln, font=fnt)
        x = x0 if align == "left" else (W - wln) / 2
        d2.text((x, y), ln, font=fnt, fill=color + (255,), stroke_width=2, stroke_fill=(0, 0, 0, 90))
        y += int(h * lh)
    return y

def scrim(img, pos):
    sc = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(sc)
    if pos == "top":
        for i in range(620): d.line([(0, i), (W, i)], fill=(0, 0, 0, int(200 * (1 - i / 620))))
    elif pos == "bottom":
        for i in range(660): yy = H - 1 - i; d.line([(0, yy), (W, yy)], fill=(0, 0, 0, int(215 * (1 - i / 660))))
    else:
        d.ellipse([W*0.05, H*0.30, W*0.95, H*0.70], fill=(0, 0, 0, 150)); sc = sc.filter(ImageFilter.GaussianBlur(80))
    img.alpha_composite(sc)

def render_text(t):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); draw = ImageDraw.Draw(img)
    scrim(img, t.get("pos", "bottom"))
    # logo watermark
    try:
        lg = Image.open(LOGO).convert("RGBA").resize((104, 104))
        if style == "matrix":
            r, g, b, a = lg.split(); lg = Image.merge("RGBA", (g.point(lambda v: 0), g, g.point(lambda v: int(v*0.4)), a))
        img.alpha_composite(lg, (W - 104 - 48, 46))
    except Exception as e: pass
    maxw = W - 120
    big = t["big"].replace("*", "")
    if uppercase: big = big.upper()
    fb = font(F_BIG, t.get("size", 112))
    while draw.textlength(max(big.split(" "), key=len), font=fb) > maxw and fb.size > 40:
        fb = font(F_BIG, fb.size - 6)
    blines = wrap(draw, big, fb, maxw)
    bh = (fb.getbbox("Ay")[3] - fb.getbbox("Ay")[1])
    kfnt = font(F_K, 34)
    sfnt = font(F_S, 40)
    total = len(blines) * int(bh * 1.02)
    kick = t.get("kicker"); sub = t.get("sub")
    if kick: total += 50
    if sub: total += 60
    pos = t.get("pos", "bottom")
    if pos == "top": y0 = 150
    elif pos == "center": y0 = (H - total) // 2
    else: y0 = H - 175 - total
    y = y0
    if kick:
        kk = (spec.get("kprefix", "") + kick).upper()
        x = 60 if align == "left" else (W - draw.textlength(kk, font=kfnt)) / 2
        ImageDraw.Draw(img).text((x, y), kk, font=kfnt, fill=k_col + (255,), stroke_width=1, stroke_fill=(0,0,0,120)); y += 50
    y = block(draw, img, blines, fb, big_col, 60, y, 1.02, align, maxw)
    if sub:
        s = sub
        x = 60 if align == "left" else (W - draw.textlength(s, font=sfnt)) / 2
        ImageDraw.Draw(img).text((x, y + 12), s, font=sfnt, fill=s_col + (255,), stroke_width=1, stroke_fill=(0,0,0,120))
    img.save(f"{OUT}/t_{t['id']}.png")

def render_end():
    a = hx(spec["bg_a"]); b = hx(spec["bg_b"])
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255)); px = img.load()
    for yy in range(H):
        f = yy / H
        if f < 0.62:
            r = f / 0.62
            col = tuple(int(a[i] + (b[i]-a[i])*r) for i in range(3))
        else:
            r = (f - 0.62) / 0.38
            col = tuple(int(b[i] * (1-r)) for i in range(3))
        for xx in range(0, W, 1): px[xx, yy] = col + (255,)
    draw = ImageDraw.Draw(img)
    cx = W // 2
    try:
        lg = Image.open(LOGO).convert("RGBA").resize((250, 250))
        if style == "matrix":
            r, g, bb, al = lg.split(); lg = Image.merge("RGBA", (g.point(lambda v:0), g, g.point(lambda v:int(v*0.4)), al))
        img.alpha_composite(lg, (cx - 125, 560))
    except Exception: pass
    fb = font(F_BIG, 104); fc = font(F_BIG, 46); fs = font(F_S, 32); fu = font(F_BIG, 42)
    y = 860
    for ln in spec["end"]["lines"]:
        t = ln.upper() if uppercase else ln
        w = draw.textlength(t, font=fb)
        # glow
        gl = Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(gl).text((cx-w/2,y), t, font=fb, fill=glow+(255,))
        gl=gl.filter(ImageFilter.GaussianBlur(12)); img.alpha_composite(gl)
        draw.text((cx - w/2, y), t, font=fb, fill=acc + (255,)); y += 108
    y += 16
    cta = spec["end"]["cta"]; w = draw.textlength(cta, font=fc); draw.text((cx - w/2, y), cta, font=fc, fill=acc + (255,)); y += 64
    sub = spec["end"]["sub"]; w = draw.textlength(sub, font=fs); draw.text((cx - w/2, y), sub, font=fs, fill=(255,255,255,210)); y += 70
    url = spec["url"]; w = draw.textlength(url, font=fu); draw.text((cx - w/2, y), url, font=fu, fill=(255,255,255,255))
    img.convert("RGB").save(f"{OUT}/end.png")

for t in spec["texts"]:
    render_text(t)
render_end()
print(f"rendered {len(spec['texts'])} texts + end -> {key}")
