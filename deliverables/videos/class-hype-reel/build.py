#!/usr/bin/env /usr/bin/python3
"""IFM class hype reel: fast photo cuts on a beat grid, 1080x1920, ~35s, silent.

  BPM=122 /usr/bin/python3 build.py <photo_dir> <out.mp4>

photo_dir holds one pre-shrunk JPEG per catalogue row, named <id>.jpg (e.g. 69.jpg).
Every cut sits on a beat (or a half / quarter of one), so changing BPM re-times the
whole film. The music is added afterwards; nothing is baked in.
"""
import os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

W, H, FPS = 1080, 1920, 30
BPM = float(os.environ.get("BPM", "122"))
BEAT = 60.0 / BPM
NAVY, MINT, WHITE, GOLD = (26, 58, 92), (189, 233, 228), (255, 255, 255), (201, 168, 76)
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "flagship-course", "next-batch-flash", "fonts", "Anton-Regular.ttf")
LOGO = os.path.join(HERE, "..", "flagship-course", "next-batch-flash", "logo.png")
PH, OUT = sys.argv[1], sys.argv[2]
random.seed(7)

LOOKS = {  # one list per distinct setting; the edit never puts two from the same list side by side
 # Hiral on her own is capped at a handful of frames (user, 15 Nov 2026: "too many photos of Hiral alone");
 # the room, the women and their certificates carry the film.
 "hiral": [69, 759], "teaching": [91, 1041, 643, 522, 1030],
 "certA": [363, 1155, 1153, 362, 1158], "certB": [365, 494, 1161, 1164, 1012],
 "group": [80, 102, 106, 112, 501, 359], "huddle": [110, 791, 148, 1017, 115],
 "room": [167, 809, 1036, 1038, 868], "game": [507, 384, 1019, 1043, 414, 511], "eo": [503], "detail": [63]}
LAND = [253, 517, 252, 508]          # landscape frames: only ever used in the top/bottom split, never letterboxed
HAVE = {int(f[:-4]) for f in os.listdir(PH) if f.endswith(".jpg")}
LOOK_OF = {i: k for k, L in LOOKS.items() for i in L if i in HAVE}
def build_order():
    pools = {k: [i for i in L if i in HAVE] for k, L in LOOKS.items()}
    for L in pools.values(): random.shuffle(L)
    out, last = [], None
    while any(pools.values()):
        ks = sorted((k for k in pools if pools[k] and k != last), key=lambda k: -len(pools[k])) or [k for k in pools if pools[k]]
        k = random.choice(ks[:4]); out.append(pools[k].pop()); last = k
    return out
ORDER = build_order() + build_order() + build_order()
_pos = [0]
def nxt():
    i = ORDER[_pos[0] % len(ORDER)]; _pos[0] += 1; return i
HERO = [1161, 363, 80, 1155, 69, 494, 1153, 501, 1164, 759]   # full-frame landing shots: mostly certificates and groups
def hero():
    i = HERO.pop(0); HERO.append(i); return i

_cache = {}
def photo(i):
    if i not in _cache:
        _cache[i] = ImageOps.exif_transpose(Image.open(os.path.join(PH, f"{i}.jpg"))).convert("RGB")
    return _cache[i]

def font(sz):
    return ImageFont.truetype(FONT, sz)

def ease(x):                       # fast-out
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3

def zoom(img, s):                  # scale about the centre, keep canvas size
    if abs(s - 1) < 1e-3: return img
    w, h = img.size; nw, nh = int(w * s), int(h * s)
    big = img.resize((nw, nh), Image.BILINEAR)
    l, t = (nw - w) // 2, (nh - h) // 2
    return big.crop((l, t, l + w, t + h))

def flash(img, a):                 # blend towards white
    return Image.blend(img, Image.new("RGB", img.size, WHITE), a) if a > 0 else img

_fit = {}
def grade(im):                     # a little more contrast and colour so cuts pop
    return ImageEnhance.Color(ImageEnhance.Contrast(im).enhance(1.07)).enhance(1.2)
def blurfit(i):
    """Every photo fills the whole 9:16 frame: no borders, no coloured backing."""
    if i not in _fit:
        _fit[i] = grade(ImageOps.fit(photo(i), (W, H), centering=(0.5, 0.33)))
    return _fit[i]
def half(i):
    return grade(ImageOps.fit(photo(i), (W, 956), centering=(0.5, 0.35)))

def text_card(lines, bg, fg, size=230):
    img = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(img)
    f = font(size)
    while max(d.textlength(l, font=f) for l in lines) > W - 120:
        size -= 10; f = font(size)
    lh = int(size * 1.12); y = H // 2 - lh * len(lines) // 2 - 40
    for l in lines:
        d.text((W // 2, y + lh // 2), l, font=f, fill=fg, anchor="mm"); y += lh
    return img

def tile(i):
    return grade(ImageOps.fit(photo(i), (536, 956), centering=(0.5, 0.33)))

# ---------------------------------------------------------------- timeline
frames = []                        # list of PIL images, one per frame
def nframes(b0, b1):               # frame-accurate: no drift over the film
    return round(b1 * BEAT * FPS) - round(b0 * BEAT * FPS)

cursor = 0.0
def emit(beats, render):
    global cursor
    n = nframes(cursor, cursor + beats)
    for k in range(n):
        frames.append(render(k, n))
    cursor += beats

def punch(base, k, amt=0.10, fl=0.35):
    """Punch-in on the cut: starts zoomed and bright, settles in ~5 frames, then drifts."""
    s = 1 + amt * (1 - ease(k / 5)) + 0.0022 * k
    return flash(zoom(base, s), fl * max(0, 1 - k / 3))

# 1 — hook (8 beats): type cards against first faces
hook = [("t", ["MONEY", "CLASS?"], NAVY, MINT, 1), ("p", hero(), 1), ("t", ["BORING?"], MINT, NAVY, 1), ("p", hero(), 1),
        ("t", ["NOT"], NAVY, MINT, .5), ("t", ["THIS"], MINT, NAVY, .5), ("t", ["ONE."], NAVY, GOLD, 1),
        ("p", nxt(), .5), ("p", nxt(), .5), ("p", nxt(), .5), ("p", nxt(), .5)]
for it in hook:
    if it[0] == "t":
        base = text_card(it[1], it[2], it[3]); emit(it[4], lambda k, n, b=base: punch(b, k, 0.06, 0.0))
    else:
        base = blurfit(it[1]); emit(it[2], lambda k, n, b=base: punch(b, k))

# 2 — push cuts (16 beats): each new photo shoves the last one off screen, direction changing every cut
DIRS = [(1, 0), (0, 1), (-1, 0), (0, -1)]
prev = blurfit(nxt()); nd = 0
def slide(old, new, d, k):
    p = ease(k / 5)
    if p >= 1: return zoom(new, 1 + 0.002 * k)
    f = Image.new("RGB", (W, H)); dx, dy = d
    f.paste(old, (int(-dx * W * p), int(-dy * H * p))); f.paste(new, (int(dx * W * (1 - p)), int(dy * H * (1 - p))))
    return f
for bar in range(4):
    for off, dur in ((0, 1), (1, 1), (2, .5), (2.5, .5), (3, .5), (3.5, .5)):
        new = blurfit(nxt()); d = DIRS[nd % 4]; nd += 1
        emit(dur, lambda k, n, o=prev, nw=new, d=d: slide(o, nw, d, k)); prev = new

# 3 — four words (8 beats, two each: the quiet bars before the kick comes in)
for lines, bg, fg in ((["GAMES."], MINT, NAVY), (["LAUGHS."], (244, 114, 94), WHITE), (["REAL"], GOLD, NAVY), (["MONEY", "SKILLS."], NAVY, GOLD)):
    base = text_card(lines, bg, fg); emit(2, lambda k, n, b=base: punch(b, k, 0.08, 0.0))

# 4 — the kick comes in (16 beats): 2x2 wall, then a top/bottom split, twice; a full-frame face ends bars 2 and 4
POS = [(0, 0), (544, 964), (544, 0), (0, 964)]
def wall(cur, hot, k):
    f = Image.new("RGB", (W, H), WHITE)
    for j, t in enumerate(cur):
        f.paste(punch(t, k, 0.18, 0.55) if j == hot else t, POS[j])
    return f
def split(cur, hot, k):
    f = Image.new("RGB", (W, H), WHITE)
    for j, t in enumerate(cur):
        f.paste(punch(t, k, 0.14, 0.5) if j == hot else t, (0, j * 964))
    return f
cur = [tile(nxt()) for _ in range(4)]
land = list(LAND)
for bar in range(4):
    if bar % 2 == 0:
        for j in range(4):
            cur[j] = tile(nxt()); snap = list(cur); emit(1, lambda k, n, s=snap, j=j: wall(s, j, k))
    else:
        hv = [half(land.pop(0)), half(land.pop(0))]
        emit(1, lambda k, n, s=list(hv): split(s, 0, k)); emit(1, lambda k, n, s=list(hv): split(s, 1, k))
        hv[0] = half(nxt()); emit(1, lambda k, n, s=list(hv): split(s, 0, k))
        base = blurfit(hero()); emit(1, lambda k, n, b=base: punch(b, k, 0.14, 0.6))

# 5 — acceleration (16 beats): halves (full-bleed / tilted print alternating), quarters, then a strobe to white
for q in range(16):
    base = blurfit(nxt()); emit(.5, lambda k, n, b=base, q=q: punch(b, k, 0.16 if q % 2 else 0.08, 0.3))
for _ in range(16):
    base = blurfit(nxt()); emit(.25, lambda k, n, b=base: punch(b, k, 0.12, 0.2))
strobe_n = nframes(cursor, cursor + 4); bases = [blurfit(nxt()) for _ in range(strobe_n // 3 + 2)]
emit(4, lambda k, n: flash(zoom(bases[k // 3], 1 + 0.5 * (k / n) ** 2), (k / n) ** 3))

# 5b — the drop (8 beats): hardest cuts of the film, faces and groups, big punch on every half beat
# SHORT=1 (the ~33s cut, 16 Nov 2026): skip this; the end card lands ON the drop instead and the film stops there.
SHORT = os.environ.get("SHORT") == "1"
STEP = 0.5 if SHORT else 1.0                              # beats between end-card reveals
if not SHORT:
    for q in range(16):
        base = blurfit(hero() if q % 4 == 0 else nxt()); emit(.5, lambda k, n, b=base: punch(b, k, 0.22, 0.55))

# 6 — end card (8 beats): logo, date, call to action land on consecutive beats
logo = Image.open(LOGO).convert("RGBA"); logo = logo.resize((640, round(logo.height * 640 / logo.width)), Image.LANCZOS)
def end(k, n):
    f = Image.new("RGB", (W, H), MINT); d = ImageDraw.Draw(f)
    b = k / (BEAT * FPS)                                  # beats since the card began
    s = 1 + 0.25 * (1 - ease(k / 6)); lg = logo.resize((int(640 * s), int(logo.height * s)), Image.BILINEAR)
    f.paste(lg, (W // 2 - lg.width // 2, 640 - lg.height // 2), lg)
    if b >= STEP: d.text((W // 2, 1085), "NEW BATCH STARTS", font=font(104), fill=NAVY, anchor="mm")
    if b >= 2 * STEP: d.text((W // 2, 1235), "17 NOV", font=font(170), fill=NAVY, anchor="mm")
    if b >= 3 * STEP:
        d.rounded_rectangle((210, 1360, 870, 1490), 22, fill=NAVY)
        d.text((W // 2, 1422), "REGISTER NOW", font=font(84), fill=MINT, anchor="mm")
    if b >= 4 * STEP: d.text((W // 2, 1560), "INVESTINGFORMUMMIES.COM/REGISTERNOW", font=font(40), fill=NAVY, anchor="mm")
    return flash(f, max(0, 1 - k / 6))
emit(3.5 if SHORT else 8, end)

# ---------------------------------------------------------------- encode
p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                      "-i", "pipe:0", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium",
                      "-movflags", "+faststart", "-an", OUT], stdin=subprocess.PIPE)
for f in frames:
    p.stdin.write(f.tobytes())
p.stdin.close(); p.wait()
print(f"wrote {OUT}  {len(frames)} frames  {len(frames) / FPS:.2f}s  {BPM} BPM  {cursor:g} beats  rc={p.returncode}")
