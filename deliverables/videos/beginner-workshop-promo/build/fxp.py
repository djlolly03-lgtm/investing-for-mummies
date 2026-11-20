#!/usr/bin/env python3
"""IFM beginner-workshop promo (Nov 2026) - effect library at full 1080x1920.

Each effect is fn(T, t, D) -> RGBA frame, where T = source time (s), t = time inside the beat, D = beat length.
Source: base.mp4 (30 fps, 1080x1920, SDR from the 4K HLG phone take); matte/matte/%05d.png from subject-matting.
  python fxp.py still <effect> <T>        -> stills/<effect>_<T>.png
  python fxp.py render <effect> <a> <b>   -> segs/<effect>.mp4  (video only, frame-exact)
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
BASE = f"{HERE}/base.mp4"
MATTE = f"{HERE}/matte/matte"
REPO = "/Users/lollyg/Documents/investing for Mummies"
FX = os.path.expanduser("~/.claude/skills/effects/fonts")
HOME = os.path.expanduser("~/Library/Fonts")
NAVY = (26, 58, 92); MINT = (189, 233, 228); GOLD = (201, 168, 76); CREAM = (247, 243, 234); INK = (20, 30, 48)
WORDS = json.load(open(f"{HERE}/words.json"))

def F(kind, size):
    p = {"b": f"{HOME}/fixed-Nunito-Bold.ttf", "r": f"{HOME}/fixed-Nunito-Regular.ttf", "serif": f"{HOME}/Lora.ttf",
         "anton": f"{FX}/Anton-Regular.ttf", "marker": f"{FX}/PermanentMarker-Regular.ttf", "play": f"{FX}/PlayfairDisplay.ttf",
         "playi": f"{FX}/PlayfairDisplay-Italic.ttf", "mono": f"{FX}/SpaceMono-Bold.ttf", "inter": f"{FX}/Inter.ttf",
         "archivo": f"{FX}/ArchivoBlack-Regular.ttf", "iserif": f"{FX}/InstrumentSerif-Italic.ttf"}[kind]
    f = ImageFont.truetype(p, size)
    if kind in ("serif", "play"):
        try: f.set_variation_by_name("Bold")
        except Exception: pass
    if kind == "inter":
        try: f.set_variation_by_axes([700])
        except Exception: pass
    return f

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(t): t = clamp(t); return t * t * (3 - 2 * t)
def eout(t): t = clamp(t); return 1 - (1 - t) ** 3
def eob(t, s=1.5): t = clamp(t) - 1; return 1 + (s + 1) * t ** 3 + s * t ** 2
def prog(T, a, b): return clamp((T - a) / max(1e-6, b - a))

# ---------------------------------------------------------------- sources
_fc = {}
def load_window(a, b):
    """Decode base frames for source window [a, b) into memory (1080x1920 RGB)."""
    i0 = int(round(a * FPS)); i1 = max(i0 + 1, int(round(b * FPS)))
    key = (i0, i1)
    if key in _fc: return
    _fc.clear()
    p = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", BASE, "-vf", f"select=between(n\\,{i0}\\,{i1 - 1})",
                        "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    n = len(p) // (W * H * 3)
    _fc[key] = [Image.frombuffer("RGB", (W, H), p[k * W * H * 3:(k + 1) * W * H * 3]).copy() for k in range(n)]
    _fc["i0"] = i0

def frame_at(T):
    i = int(round(T * FPS))
    for k, v in _fc.items():
        if isinstance(k, tuple) and k[0] <= i < k[0] + len(v): return v[i - k[0]]
    load_window(T, T + 1 / FPS); return frame_at(T)

def matte_at(T):
    i = int(round(T * FPS))
    p = f"{MATTE}/{i:05d}.png"
    if not os.path.exists(p): p = f"{MATTE}/{min(i, len(os.listdir(MATTE)) - 1):05d}.png"
    return Image.open(p).convert("L").resize((W, H), Image.Resampling.BILINEAR)

def at(T): return frame_at(T), matte_at(T)

def cutout(fr, m, feather=1.5, erode=0):
    if erode: m = m.filter(ImageFilter.MinFilter(erode))
    s = fr.convert("RGBA"); s.putalpha(m.filter(ImageFilter.GaussianBlur(feather)) if feather else m); return s

def scale_about(im, s, cx, cy):
    if abs(s - 1) < 1e-4: return im
    w, h = im.size; nw, nh = int(w * s), int(h * s)
    r = im.resize((nw, nh), Image.Resampling.BICUBIC)
    x0 = int(cx * nw - cx * w); y0 = int(cy * nh - cy * h)
    return r.crop((x0, y0, x0 + w, y0 + h))

def shadow(layer, off=(0, 14), blur=22, op=120):
    a = layer.getchannel("A").point(lambda v: v * op // 255)
    sh = Image.new("RGBA", (layer.width + 2 * blur + abs(off[0]), layer.height + 2 * blur + abs(off[1])), (0, 0, 0, 0))
    blk = Image.new("RGBA", layer.size, (0, 0, 0, 255)); blk.putalpha(a)
    sh.alpha_composite(blk, (blur + max(0, off[0]), blur + max(0, off[1])))
    sh = sh.filter(ImageFilter.GaussianBlur(blur / 2)); sh.alpha_composite(layer, (blur, blur)); return sh, blur

def put(base, layer, cx, cy, s=1.0, alpha=1.0, rot=0.0, sh=True):
    if s <= 0.02 or alpha <= 0.01: return
    l = layer
    if s != 1.0: l = l.resize((max(1, int(l.width * s)), max(1, int(l.height * s))), Image.Resampling.BICUBIC)
    if rot: l = l.rotate(rot, Image.Resampling.BICUBIC, expand=True)
    if sh: l, _ = shadow(l)
    if alpha < 1: a = l.getchannel("A").point(lambda v: int(v * alpha)); l = l.copy(); l.putalpha(a)
    x, y = int(cx - l.width / 2), int(cy - l.height / 2)
    tmp = Image.new("RGBA", base.size, (0, 0, 0, 0)); tmp.paste(l, (x, y), l); base.alpha_composite(tmp)

def rr(size, r, fill, outline=None, width=0):
    im = Image.new("RGBA", size, (0, 0, 0, 0)); ImageDraw.Draw(im).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=fill, outline=outline, width=width); return im

def glass(bg, box, r=36, tint=(255, 255, 255, 70), blur=24, edge=(255, 255, 255, 150)):
    """Frosted glass panel: blur what is behind it, tint, bright rim."""
    x0, y0, x1, y1 = [int(v) for v in box]
    crop = bg.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(blur)).convert("RGBA")
    crop.alpha_composite(Image.new("RGBA", crop.size, tint))
    hl = Image.new("RGBA", crop.size, (0, 0, 0, 0)); hd = ImageDraw.Draw(hl)
    for y in range(crop.height // 2): hd.line((0, y, crop.width, y), fill=(255, 255, 255, int(40 * (1 - y / (crop.height / 2)))))
    crop.alpha_composite(hl)
    ImageDraw.Draw(crop).rounded_rectangle((0, 0, crop.width - 1, crop.height - 1), r, outline=edge, width=3)
    m = Image.new("L", crop.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, crop.width - 1, crop.height - 1), r, fill=255)
    out = Image.new("RGBA", crop.size, (0, 0, 0, 0)); out.paste(crop, (0, 0), m); return out

def grade(im, warm=1.0, dark=0.0, sat=1.0):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    if sat != 1.0:
        g = a.mean(axis=2, keepdims=True); a = g + (a - g) * sat
    a = a * [1 + 0.04 * (warm - 1) * 10 / 10, 1.0, 1 - 0.05 * (warm - 1)]
    a = a * (1 - dark)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")

def face_box(T):
    """Head box from the matte: top of the subject + width at head height (x0, y0, x1, y1)."""
    m = np.asarray(matte_at(T)) > 128
    rows = np.where(m.any(axis=1))[0]
    if not len(rows): return (380, 330, 700, 760)
    top = rows[0]; band = m[top + 120:top + 260]
    cols = np.where(band.any(axis=0))[0] if band.any() else np.array([380, 700])
    cx = (cols[0] + cols[-1]) / 2; hw = 190
    return (int(cx - hw), int(top), int(cx + hw), int(top + 440))

def said(T, a, b):
    return [w for w in WORDS if a - 0.05 <= w["s"] <= T and w["s"] < b]

# ================================================================ effects
JARGON = ["SIP", "NAV", "XIRR", "ELSS", "CAGR", "Expense ratio", "Small-cap", "Nifty 50", "Debt fund", "Sensex",
          "Asset allocation", "NFO", "Index fund", "KYC", "STCG", "Large-cap", "Rebalancing", "AUM"]
NOTE_COLS = [(255, 236, 140), (189, 233, 228), (255, 214, 200), (246, 243, 234), (214, 228, 255), (255, 236, 140)]

def note_tile(text, col, i):
    f = F("marker", 44 if len(text) < 9 else 34)
    d0 = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tw = d0.textlength(text, font=f); w = int(max(200, tw + 60)); h = 150
    im = Image.new("RGBA", (w, h), col + (255,)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, 16), fill=tuple(int(c * 0.9) for c in col))
    d.text((w / 2, h / 2 + 6), text, font=f, fill=INK, anchor="mm")
    return im

def e_jargon_wall(T, t, D, a_blow=None):
    """headline-wall, IFM: jargon sticky notes pile up behind her on 'overwhelming', blow away on 'I've got you'."""
    fr, m = at(T); out = grade(fr, dark=0.28 * ease(t / 0.5))
    rnd = np.random.RandomState(7)
    slots = []
    cells = [(c, r) for r in range(6) for c in range(3)]
    order = rnd.permutation(len(cells))
    for i, word in enumerate(JARGON):
        c, r = cells[order[i]]
        cx = 190 + c * 350 + rnd.uniform(-50, 50); cy = 150 + r * 200 + rnd.uniform(-35, 35)
        slots.append((word, cx, cy, rnd.uniform(-12, 12), NOTE_COLS[i % len(NOTE_COLS)]))
    blow = a_blow if a_blow is not None else D - 0.8
    for i, (word, cx, cy, rot, col) in enumerate(slots):
        p = prog(t, 0.05 + i * 0.09, 0.30 + i * 0.09)
        if p <= 0: continue
        s = 1.6 - 0.6 * eout(p); al = clamp(p * 3)
        q = prog(t, blow + (i % 6) * 0.03, blow + 0.55 + (i % 6) * 0.03)
        dx = (cx - W / 2) * 2.2 * eout(q) + (900 if cx > W / 2 else -900) * q ** 2; dy = -250 * q
        put(out, note_tile(word, col, i), cx + dx, cy + dy, s, al * (1 - q), rot + 50 * q * (1 if cx > W / 2 else -1))
    out.alpha_composite(cutout(fr, m))
    return out

def e_green_room(T, t, D, photo=f"{REPO}/highlight-reel-assets/gflow-final/13-full-batch-group-photo.jpg"):
    """green-screen, IFM: a green key flashes, then she's standing in front of a full workshop room."""
    fr, m = at(T)
    if t < 0.35:
        bg = Image.new("RGBA", (W, H), (22, 200, 70, 255)); d = ImageDraw.Draw(bg)
        d.rounded_rectangle((W - 330, 70, W - 50, 126), 28, fill=(10, 60, 24))
        d.ellipse((W - 310, 88, W - 290, 108), fill=(120, 255, 150))
        d.text((W - 272, 98), "KEY  #16C846", font=F("mono", 26), fill=(200, 255, 210), anchor="lm")
    else:
        ph = Image.open(photo).convert("RGB")
        z = 1.0 + 0.06 * ease((t - 0.35) / max(0.1, D - 0.35))
        bgi = ImageOps.fit(ph, (W, H), Image.Resampling.LANCZOS, centering=(0.5, 0.45))
        bgi = scale_about(bgi, z, 0.5, 0.45).filter(ImageFilter.GaussianBlur(3))
        bg = grade(bgi, dark=0.12)
        tag = rr((380, 70), 35, (255, 255, 255, 235)); td = ImageDraw.Draw(tag)
        td.ellipse((26, 26, 44, 44), fill=(220, 60, 50)); td.text((60, 35), "Our workshops", font=F("b", 32), fill=INK, anchor="lm")
        put(bg, tag, W / 2, 150, eob(prog(t, 0.45, 0.8)))
    s = cutout(fr, m, 2.0, erode=3)
    bg.alpha_composite(s)
    return bg

def lecture_slide(w, h):
    im = Image.new("RGBA", (w, h), (250, 250, 250, 255)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, 110), fill=(52, 72, 110))
    d.text((40, 55), "Lecture 14: Asset allocation theory (cont.)", font=F("inter", 34), fill=(255, 255, 255), anchor="lm")
    for k in range(9):
        y = 170 + k * 62; d.ellipse((50, y - 6, 62, y + 6), fill=(90, 90, 90))
        d.rectangle((80, y - 8, 80 + [620, 540, 700, 480, 610, 560, 690, 430, 590][k], y + 8), fill=(200, 200, 205))
    d.text((w - 40, h - 36), "Slide 37 / 112", font=F("r", 26), fill=(140, 140, 140), anchor="rm")
    return im

def e_frame_break(T, t, D):
    """frame-break, IFM: a dull lecture slide fills the screen with her inside it; on 'boring lectures' the slide
    shatters and she steps out in front, full colour."""
    fr, m = at(T)
    br = 0.9  # break moment
    q = prog(t, br, br + 0.5)
    out = Image.new("RGBA", (W, H), (234, 234, 236, 255))
    sl = lecture_slide(W - 80, 740)
    if q < 1:
        sd = sl.copy()
        win = scale_about(grade(fr, sat=0.0, dark=0.05), 1.0, 0.5, 0.3).resize((W - 80, int((W - 80) * H / W)))
        win = win.crop((0, 260, win.width, 260 + 740 - 110)).convert("RGBA")
        sd.paste(win.crop((0, 0, 560, 630)), (sl.width - 580, 110))
        # shatter: split into 6 shards that fly out
        if q <= 0:
            put(out, sd, W / 2, 900, 1.0, sh=True)
        else:
            for k in range(6):
                cx0 = (k % 3) * sd.width / 3; cy0 = (k // 3) * sd.height / 2
                shard = sd.crop((int(cx0), int(cy0), int(cx0 + sd.width / 3), int(cy0 + sd.height / 2)))
                dx = ((k % 3) - 1) * 900 * eout(q); dy = ((k // 3) - 0.5) * 900 * eout(q) + 600 * q * q
                put(out, shard, 40 + cx0 + shard.width / 2 + dx, 900 - sd.height / 2 + cy0 + shard.height / 2 + dy, 1.0, 1 - q, (k - 2.5) * 30 * q)
    if q > 0:
        full = grade(fr, dark=0.0)
        full.putalpha(int(255 * ease(q)))
        out.alpha_composite(full)
        out.alpha_composite(cutout(fr, m))
        stamp = F("anton", 150)
        lay = Image.new("RGBA", (W, 260), (0, 0, 0, 0)); ImageDraw.Draw(lay).text((W / 2, 130), "NO LECTURES", font=stamp, fill=(255, 255, 255), anchor="mm", stroke_width=0)
    return out

def cursor_img(s=1.0):
    im = Image.new("RGBA", (60, 84), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(4, 4), (4, 66), (20, 52), (32, 80), (44, 74), (32, 48), (54, 48)]
    d.polygon(pts, fill=(255, 255, 255), outline=(20, 20, 20)); d.line(pts + [pts[0]], fill=(20, 20, 20), width=4)
    return im.resize((int(60 * s), int(84 * s)), Image.Resampling.LANCZOS)

def e_register(T, t, D, tap=1.25):
    """tap, IFM: a frosted workshop card rises over her torso; a cursor taps 'Register interest' and it flips to
    'Interest registered' with a tick (real app behaviour: label swaps once, no extra celebration)."""
    fr, m = at(T); out = fr.convert("RGBA")
    pin = eob(prog(t, 0.0, 0.45)); y = 1430 + (1 - pin) * 500
    cw, ch = 900, 330; x0 = (W - cw) / 2; y0 = y - ch / 2
    if pin > 0:
        card = glass(out, (x0, y0, x0 + cw, y0 + ch), r=44, tint=(250, 248, 242, 175))
        d = ImageDraw.Draw(card)
        d.text((48, 58), "NEW · 5-DAY WORKSHOP", font=F("b", 30), fill=(26, 58, 92), anchor="lm")
        d.text((48, 112), "Beginner Investing", font=F("serif", 54), fill=INK, anchor="lm")
        d.text((48, 168), "5 days  ·  2 hours a day", font=F("r", 32), fill=(70, 80, 96), anchor="lm")
        done = t >= tap + 0.12
        press = 1 - 0.06 * math.sin(math.pi * prog(t, tap - 0.05, tap + 0.2))
        bw, bh = int((cw - 96) * press), int(96 * press)
        btn = rr((bw, bh), bh // 2, (26, 58, 92) if not done else (255, 255, 255), outline=None if not done else (26, 58, 92), width=4)
        bd = ImageDraw.Draw(btn)
        if not done:
            bd.text((bw / 2, bh / 2), "Register interest", font=F("b", 42), fill=(255, 255, 255), anchor="mm")
        else:
            bd.ellipse((bw / 2 - 210, bh / 2 - 22, bw / 2 - 166, bh / 2 + 22), fill=(52, 120, 246))
            bd.line((bw / 2 - 199, bh / 2, bw / 2 - 191, bh / 2 + 9, bw / 2 - 176, bh / 2 - 10), fill=(255, 255, 255), width=6)
            bd.text((bw / 2 + 24, bh / 2), "Interest registered", font=F("b", 40), fill=(26, 58, 92), anchor="mm")
        card.alpha_composite(btn, (int(48 + ((cw - 96) - bw) / 2), int(206 + (96 - bh) / 2)))
        sc, _ = shadow(card, (0, 16), 26, 90)
        tmp = Image.new("RGBA", out.size, (0, 0, 0, 0)); tmp.paste(sc, (int(x0 - 26), int(y0 - 26)), sc)
        a = tmp.getchannel("A").point(lambda v: int(v * clamp(pin * 1.5))); tmp.putalpha(a); out.alpha_composite(tmp)
        # cursor glides in, taps, leaves
        cp = ease(prog(t, 0.45, tap)); cq = ease(prog(t, tap + 0.5, tap + 1.0))
        cx = W + 80 - (W + 80 - (W / 2 + 140)) * cp + 300 * cq; cy = y0 + 250 + 260 * (1 - cp) + 200 * cq
        cs = 1.6 - 0.15 * math.sin(math.pi * prog(t, tap - 0.05, tap + 0.2))
        if 0 < cp and cq < 1:
            c = cursor_img(cs); out.alpha_composite(c, (int(cx), int(cy)))
            r = prog(t, tap, tap + 0.35)
            if 0 < r < 1:
                ring = Image.new("RGBA", (200, 200), (0, 0, 0, 0)); rad = 20 + 70 * eout(r)
                ImageDraw.Draw(ring).ellipse((100 - rad, 100 - rad, 100 + rad, 100 + rad), outline=(255, 255, 255, int(220 * (1 - r))), width=6)
                out.alpha_composite(ring, (int(cx - 96), int(cy - 96)))
    return out

EFFECTS = {"jargon_wall": e_jargon_wall, "green_room": e_green_room, "frame_break": e_frame_break, "register": e_register}

def render(name, a, b, out=None, **kw):
    fn = EFFECTS[name]; D = b - a; n = int(round(D * FPS))
    load_window(a, b)
    os.makedirs(f"{HERE}/segs", exist_ok=True); out = out or f"{HERE}/segs/{name}.mp4"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for i in range(n):
        T = a + i / FPS
        p.stdin.write(fn(T, i / FPS, D, **kw).convert("RGB").tobytes())
    p.stdin.close(); p.wait(); print("wrote", out, n, "frames", flush=True)

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "still":
        name, a, b, T = sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
        os.makedirs(f"{HERE}/stills", exist_ok=True)
        EFFECTS[name](T, T - a, b - a).convert("RGB").save(f"{HERE}/stills/{name}_{T:.2f}.jpg", quality=92)
        print("still", name, T)
    elif cmd == "render":
        render(sys.argv[2], float(sys.argv[3]), float(sys.argv[4]))
