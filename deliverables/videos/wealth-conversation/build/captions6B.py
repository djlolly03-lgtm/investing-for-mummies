#!/usr/bin/python3
"""Captions pass: 'falling sticker' captions rendered as RGBA PNG sequences, composited onto base segments."""
import subprocess, os, sys, math, shlex, time, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
MAIN = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/MAIN_Comp.mp4'
SEG = S + '/seg'; OV = S + '/ov'
os.makedirs(OV, exist_ok=True)
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
FD = os.path.expanduser('~/Library/Fonts/')
FPS = 30
W, H = 1080, 1920
CREAM = (244, 241, 230, 255); SLATE = (41, 67, 84, 255); GOLD = (252, 197, 54, 255); WHITE = (255, 255, 255, 240); RED = (205, 40, 40, 255)
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']

def run(name, args):
    t = time.time()
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

def lora(sz):
    f = ImageFont.truetype(FD + 'Lora.ttf', sz); f.set_variation_by_name('Bold'); return f
def nun(sz): return ImageFont.truetype(FD + 'fixed-Nunito-Bold.ttf', sz)

def sticker(text, font, bg, fg, pad=(34, 22), radius=14, maxw=None):
    """Pre-rendered sticker (unrotated) with soft shadow. maxw shrinks the font to fit."""
    if maxw:
        sz = font.size
        while True:
            d0 = ImageDraw.Draw(Image.new('RGBA', (4, 4)))
            bb = d0.textbbox((0, 0), text, font=font)
            if bb[2] - bb[0] + 2 * pad[0] <= maxw or sz <= 36: break
            sz -= 2; font = lora(sz) if font.path.endswith('Lora.ttf') else nun(sz)
    d0 = ImageDraw.Draw(Image.new('RGBA', (4, 4)))
    bb = d0.textbbox((0, 0), text, font=font); w = bb[2] - bb[0]; h = bb[3] - bb[1]
    sw, sh = w + 2 * pad[0], h + 2 * pad[1]
    M = 40
    im = Image.new('RGBA', (sw + 2 * M, sh + 2 * M), (0, 0, 0, 0))
    shd = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(shd).rounded_rectangle((M + 4, M + 10, M + sw + 4, M + sh + 10), radius, fill=(0, 0, 0, 120))
    shd = shd.filter(ImageFilter.GaussianBlur(12))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((M, M, M + sw, M + sh), radius, fill=bg)
    d.text((M + pad[0] - bb[0], M + pad[1] - bb[1]), text, font=font, fill=fg)
    return Image.alpha_composite(shd, im)

def live_pill():
    f = nun(32); txt = 'LIVE CLASS'
    d0 = ImageDraw.Draw(Image.new('RGBA', (4, 4))); bb = d0.textbbox((0, 0), txt, font=f)
    w = bb[2] - bb[0] + 94; h = bb[3] - bb[1] + 26
    im = Image.new('RGBA', (w + 20, h + 20), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 10, 10 + w, 10 + h), (h) // 2, fill=WHITE)
    d.ellipse((10 + 24, 10 + h / 2 - 9, 10 + 42, 10 + h / 2 + 9), fill=RED)
    d.text((10 + 58 - bb[0], 10 + 13 - bb[1]), txt, font=f, fill=RED)
    return im

class Item:
    def __init__(self, img, x, y, t_in, angle, drop=420, dur=0.28, t_out=None):
        self.img, self.x, self.y, self.t_in, self.angle, self.drop, self.dur, self.t_out = img, x, y, t_in, angle, drop, dur, t_out
        self.cache = img.rotate(angle, resample=Image.BICUBIC, expand=True) if angle else img

def paste_centered(canvas, img, cx, cy, alpha=1.0):
    if alpha < 1.0:
        a = img.split()[3].point(lambda v: int(v * alpha)); img = img.copy(); img.putalpha(a)
    canvas.alpha_composite(img, (int(cx - img.width / 2), int(cy - img.height / 2)))

def render_frame(items, t, static=None, draw=None):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if static is not None: c.alpha_composite(static, (0, 0))
    if draw is not None: draw(c, t)
    for it in items:
        if t < it.t_in: continue
        if it.t_out is not None:
            if t >= it.t_out + 0.22: continue
            if t >= it.t_out:                          # quick fade + lift out
                q = (t - it.t_out) / 0.22
                paste_centered(c, it.cache, it.x + it.img.width / 2, it.y + it.img.height / 2 - 60 * q, alpha=1 - q); continue
        p = min(max((t - it.t_in) / it.dur, 0.0), 1.0)
        e = 1 - (1 - p) ** 3
        dy = -it.drop * (1 - e)
        q = (t - it.t_in - it.dur) / 0.16
        if 0 < q < 1: dy += 14 * math.sin(math.pi * q)          # settle bounce
        cx = it.x + it.img.width / 2; cy = it.y + it.img.height / 2 + dy
        if p < 1.0:
            img = it.img.rotate(it.angle + 7 * (1 - e), resample=Image.BICUBIC, expand=True)
            paste_centered(c, img, cx, cy, alpha=min(1.0, p * 5 + 0.15))
        else:
            paste_centered(c, it.cache, cx, cy)
    return c

ONLY = set(sys.argv[1:])   # optional: names of segments to (re)build; empty = all

def composite(name, base, items, dur, static=None, draw=None):
    """Render PNG sequence for `dur` seconds and overlay on base -> SEG/name_f.mp4"""
    if ONLY and name not in ONLY: return
    d = f'{OV}/{name}'; os.makedirs(d, exist_ok=True)
    for f in glob.glob(d + '/*.png'): os.remove(f)
    n = int(round(dur * FPS))
    t0 = time.time()
    for i in range(n):
        render_frame(items, i / FPS, static, draw).save(f'{d}/f{i:04d}.png', compress_level=1)
    print(f'   frames {name}: {n} ({time.time()-t0:.0f}s)', flush=True)
    run(name + '_f', ['-i', base, '-framerate', str(FPS), '-start_number', '0', '-i', f'{d}/f%04d.png',
                      '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1[v]', '-map', '[v]'] + ENC + [f'{SEG}/{name}_f.mp4'])

def concat(name, parts):
    if ONLY and name not in ONLY: return
    lst = f'{S}/{name}.txt'
    open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in parts))
    run('concat ' + name, ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{SEG}/{name}.mp4'])

# ---- re-render E / H3 with the revised cut point (stickers need the extra beat) ----
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
if not ONLY:
    run('E', ['-ss', '6.000', '-i', f'{S}/sdr/m11.mp4', '-t', '2.920', '-vf', f'fps=30,{COVER}'] + ENC + [f'{SEG}/E.mp4'])
    run('H3', ['-ss', '31.100', '-i', MAIN, '-t', '2.170', '-vf', f'fps=30,{COVER}'] + ENC + [f'{SEG}/H3.mp4'])

PILL = Image.new('RGBA', (W, H), (0, 0, 0, 0)); PILL.alpha_composite(live_pill(), (40, 72))

# ---- AB: hook  (T 0.00-3.83)  earn@0.48 save@1.30 invest@2.66 ----------------
concat('AB', ['A', 'B'])
f130 = lora(130)
items = [Item(sticker('earn.', f130, CREAM, SLATE), 360, 1150, 0.30, -3.0),
         Item(sticker('save.', f130, GOLD, SLATE), 410, 1150 + 118, 1.12, 2.5),
         Item(sticker('invest.', f130, SLATE, CREAM), 470, 1150 + 236, 2.48, -1.5)]
composite('AB', f'{SEG}/AB.mp4', items, 3.83, static=PILL)

# ---- C (T 5.47-9.57, orig 16.19-20.30): group-photo card + programme title ------------
# "wealth conversation" @17.52  "Money Blueprint" @19.12   (local = orig - 16.19)
f84 = lora(84)
items = [Item(sticker('The Wealth Conversation', f84, SLATE, CREAM, maxw=980), 60, 1500, 17.52 - 0.25 - 16.19, -2.0),
         Item(sticker('The Money Blueprint', f84, GOLD, SLATE, maxw=980), 150, 1500 + 112, 19.12 - 0.25 - 16.19, 1.8)]
composite('C', f'{SEG}/C.mp4', items, 4.100)

# ---- DE (T 15.67-20.40): games@T16.70 analogies@T17.66 discussions@T19.24 ------
concat('DE', ['D', 'E'])
T0 = 15.67; f110 = lora(110)
items = [Item(sticker('games.', f110, CREAM, SLATE), 90, 1230, 16.70 - 0.20 - T0, -2.5),
         Item(sticker('analogies.', f110, GOLD, SLATE), 150, 1230 + 104, 17.66 - 0.20 - T0, 2.0),
         Item(sticker('discussions.', f110, SLATE, CREAM), 210, 1230 + 208, 19.24 - 0.20 - T0, -1.5)]
composite('DE', f'{SEG}/DE.mp4', items, 4.73, static=PILL)

# ---- FG (T 22.57-27.18): "Let's find out." @23.30  "By playing." @25.30 ----------
concat('FG', ['F', 'G'])
T0 = 22.57; f104 = lora(104)
items = [Item(sticker("Let's find out.", f104, CREAM, SLATE), 110, 1300, 23.30 - 0.28 - T0, -2.5),
         Item(sticker('By playing.', f104, GOLD, SLATE), 300, 1300 + 108, 25.30 - 0.28 - T0 + 0.1, 2.0)]
composite('FG', f'{SEG}/FG.mp4', items, 4.61)

# ---- montage labels --------------------------------------------------------------
def game_label(name, num, title, tag, dur, y=1640):
    n = sticker(f'#{num}', nun(56), GOLD, SLATE, pad=(20, 8), radius=10)
    a = sticker(title, lora(72), SLATE, CREAM, maxw=940)
    b = sticker(tag, nun(42), CREAM, SLATE, pad=(26, 16), maxw=940)
    items = [Item(n, 36, y - 70, 0.18, -6.0, drop=300, dur=0.24),
             Item(a, 50, y, 0.30, -2.0),
             Item(b, 90, y + int(a.height * 0.70) - 40, 0.56, 1.5, drop=360)]
    composite(name, f'{SEG}/{name}.mp4', items, dur)

game_label('M1', 1, 'Kaun Banega Crorepati', 'Live quiz. Your phone is the buzzer.', 3.88)
game_label('M2', 2, 'Stock Rush PRO', 'Trade 11 years of real market history.', 1.94)
game_label('M3', 3, 'Swayamvar', 'Find your perfect investment match.', 3.88, y=1500)
game_label('M4', 4, 'Mutual Fund Manager LIVE', 'Run a fund. Your colleagues invest in it.', 1.94)
game_label('M5', 5, 'Lifestyle Time Machine', 'Can you afford your future?', 1.94)
# short montage (version B): three one-bar cards, numbered in their new order
game_label('M1s', 1, 'Kaun Banega Crorepati', 'Live quiz. Your phone is the buzzer.', 1.94)
game_label('M3s', 3, 'Swayamvar', 'Find your perfect investment match.', 1.94, y=1500)

# ---- M6: class shot + "11 games. / Zero jargon. / One workshop." ---------------------
f96 = lora(96)
items = [Item(sticker('Money games.', f96, GOLD, SLATE), 200, 980, 0.12, -2.5),
         Item(sticker('Zero jargon.', f96, CREAM, SLATE), 260, 980 + 96, 0.50, 2.0),
         Item(sticker('One workshop.', f96, SLATE, CREAM), 300, 980 + 192, 0.88, -1.5)]
composite('M6', f'{SEG}/M6.mp4', items, 1.94, static=PILL)
# two-bar version for B (the music drop lands here now that the game cards are gone)
items = [Item(sticker('Money games.', f96, GOLD, SLATE), 200, 980, 0.25, -2.5),
         Item(sticker('Zero jargon.', f96, CREAM, SLATE), 260, 980 + 96, 1.20, 2.0),
         Item(sticker('One workshop.', f96, SLATE, CREAM), 300, 980 + 192, 2.15, -1.5)]
composite('M6L', f'{SEG}/M6L.mp4', items, 3.88, static=PILL)
# v6B: the same three stickers over the three outside workshops, one landing on each 1.8s clip
items = [Item(sticker('Money games.', f96, GOLD, SLATE), 200, 980, 0.25, -2.5),
         Item(sticker('Zero jargon.', f96, CREAM, SLATE), 260, 980 + 96, 2.05, 2.0),
         Item(sticker('One workshop.', f96, SLATE, CREAM), 300, 980 + 192, 3.85, -1.5)]
composite('M6W', f'{SEG}/M6W.mp4', items, 5.40, static=PILL)

# ---- Hiral shots from the raw takes (v4: on top of the effects passes) -----------------------
# H3_fA = lean-in render + 3 stickers (kept clear of the punched-in head)   (local = orig - 31.10)
f110 = lora(110); f78 = lora(78); f70 = lora(70)
items = [Item(sticker('Challenge', f110, GOLD, SLATE), 70, 130, 0.02, -2.5, drop=300),
         Item(sticker('the way you think', f78, CREAM, SLATE), 120, 130 + 150, 31.36 - 0.2 - 31.10, 1.8),
         Item(sticker('about money & investing.', f70, SLATE, CREAM, maxw=940), 60, 130 + 150 + 108, 31.88 - 0.2 - 31.10, -1.5)]
composite('H3_fA', f'{SEG}/H3_fx.mp4', items, 2.167)

# H4: checklist + spotlight carry the message; only the credit gets stickers
o = 42.60; f80 = lora(80)
credit = [Item(sticker('Brought to you by', nun(46), CREAM, SLATE, pad=(26, 16)), 70, 150, 57.30 - 0.22 - o, -1.5, drop=300),
          Item(sticker('EO New Mumbai', f80, SLATE, CREAM), 110, 150 + 92, 58.60 - 0.22 - o, 1.5)]
composite('H4_fA', f'{SEG}/H4_fx.mp4', credit, 17.133)
composite('H4_fB6', f'{SEG}/H4_fxB6.mp4', credit, 17.133)

# AB_fB: the cinematic hook — moody-graded footage, same word stack in gold/cream
items = [Item(sticker('earn.', f130, GOLD, SLATE), 360, 1150, 0.30, -3.0),
         Item(sticker('save.', f130, CREAM, SLATE), 410, 1150 + 118, 1.12, 2.5),
         Item(sticker('invest.', f130, GOLD, SLATE), 470, 1150 + 236, 2.48, -1.5)]
composite('AB_fB', f'{SEG}/AB_moody.mp4', items, 3.83, static=PILL)

# H2_fB: "connects the dots between your money, the economy and your financial future" — three dots appear on
# the words and a line draws between them; the newspaper flash on "economy" (match-cut) sits at dot 2.
# (local = orig - 20.30)  "dots"@21.46  "your money"@22.00  "the economy"@22.72  "your financial future"@23.64
# bigger, slower, and spread across the empty space above her head: an inverted V of three dots
DOTS = [((190, 470), 22.00 - 20.30), ((540, 230), 22.72 - 20.30), ((890, 470), 23.64 - 20.30)]
DOTS_OUT = 4.70                                     # lifts out as the "No boring lectures" spotlight drops
POP, GROW = 0.45, 0.70                               # dot pop / line growth durations
def draw_dots(c, t):
    if t >= DOTS_OUT + 0.3: return
    layer = Image.new('RGBA', c.size, (0, 0, 0, 0)) if t >= DOTS_OUT else c
    d = ImageDraw.Draw(layer)
    for i, ((x, y), t0) in enumerate(DOTS):
        if t < t0: break
        p = min(1.0, (t - t0) / POP); e = 1 - (1 - p) ** 3; r = int(36 * (0.3 + 0.7 * e))
        if i > 0:                                   # line grows from the previous dot
            (px, py), _ = DOTS[i - 1]; q = min(1.0, max(0.0, (t - t0 - 0.1) / GROW)); q = 1 - (1 - q) ** 2
            ex, ey = px + (x - px) * q, py + (y - py) * q
            d.line([(px, py), (ex, ey)], fill=(41, 67, 84, 255), width=14)
        d.ellipse([x - r - 8, y - r - 8, x + r + 8, y + r + 8], fill=(41, 67, 84, 255))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(252, 197, 54, 255))
    if layer is not c:                              # fade-out
        a = layer.split()[3].point(lambda v: int(v * max(0.0, 1 - (t - DOTS_OUT) / 0.3))); layer.putalpha(a); c.alpha_composite(layer)
f62 = lora(62)
items = [Item(sticker('your money', f62, SLATE, CREAM, pad=(26, 14)), 40, 530, 22.00 - 20.30 + 0.15, -2.0, drop=160, dur=0.35, t_out=DOTS_OUT),
         Item(sticker('the economy', f62, SLATE, CREAM, pad=(26, 14)), 330, 70, 22.72 - 20.30 + 0.15, 1.5, drop=160, dur=0.35, t_out=DOTS_OUT),
         Item(sticker('your future', f62, SLATE, CREAM, pad=(26, 14)), 690, 530, 23.64 - 20.30 + 0.15, -1.5, drop=160, dur=0.35, t_out=DOTS_OUT),
         # name caption (v6B): lower third while she speaks, gone before the jargon rain at 4.6
         Item(sticker('Hiral Goel', lora(84), GOLD, SLATE), 50, 1530, 0.35, -1.5, drop=200, t_out=4.35),
         Item(sticker('Founder, Investing for Mummies', nun(46), CREAM, SLATE, pad=(26, 16)), 80, 1530 + 128, 0.65, 1.0, drop=200, t_out=4.35)]
composite('H2_fB6', f'{SEG}/H2_fxB6.mp4', items, 6.100, draw=draw_dots)

# H5B: "Walk away with a framework to set meaningful financial goals, a simple framework to organise your
# investments and strategies to navigate your financial journey" — the three outcomes drop in and stack.
# (local = phone - 36.89)  "meaningful"@38.70  "simple"@40.82  "strategies"@43.70
f84 = lora(84)
items = [Item(sticker('Meaningful goals.', f84, GOLD, SLATE), 60, 130, 38.70 - 36.89 - 0.1, -2.5),
         Item(sticker('A simple framework.', f84, CREAM, SLATE), 110, 130 + 118, 40.82 - 36.89 - 0.1, 2.0),
         Item(sticker('Strategies for the journey.', lora(72), SLATE, CREAM, maxw=960), 60, 130 + 236, 43.70 - 36.89 - 0.1, -1.5)]
composite('H5B6', f'{SEG}/H5_fx6.mp4', items, 9.367)

# HG3_fB: Hiral's games line on camera with the orbit; the three words still drop in, top-left, and lift out
# before CHALLENGE lands.  (local = orig - 26.40)  "games"@27.40 "analogies"@28.36 "discussions"@29.94
f64 = lora(64)
items = [Item(sticker('games.', f64, CREAM, SLATE, pad=(26, 14)), 40, 110, 27.40 - 0.22 - 26.40, -2.5, drop=260, t_out=4.55),
         Item(sticker('analogies.', f64, GOLD, SLATE, pad=(26, 14)), 70, 110 + 86, 28.36 - 0.22 - 26.40, 2.0, drop=260, t_out=4.55),
         Item(sticker('discussions.', f64, SLATE, CREAM, pad=(26, 14)), 100, 110 + 172, 29.94 - 0.22 - 26.40, -1.5, drop=260, t_out=4.55)]
composite('HG3_fB6', f'{SEG}/HG3_fxB6.mp4', items, 6.867)
print('CAPTIONS DONE', flush=True)
