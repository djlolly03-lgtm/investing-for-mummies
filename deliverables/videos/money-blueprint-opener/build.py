#!/usr/bin/python3
"""The Money Blueprint — 30 s presentation opener (22 Nov 2026). Landscape 1920x1080, 30 fps, silent (user: no VO, no
music). v2: ~21 s, ends on the approved cover, ₹ coins (no Bitcoin), plain buckets without added names. Footage: 9 Google Flow clips (Veo 3.1 Lite, the cheapest model — this is a test), one per topic, generated
text-free; every word on screen is set here instead, because AI video garbles lettering.
Each clip's best ~3.4 s is used; tags drop in on each topic in the cover's style (cream torn-paper tag, navy caps),
the buckets get Emergency / Stability / Growth in red / blue / green, the checklist ticks Learn -> Grow, and the film
lands on the approved cover title (THE MONEY over BLUEPRINT, heavy navy Lora, gold sweep), then holds.
Usage: build.py   (clips in ./clips/01.mp4 .. 09.mp4)  ->  ./The Money Blueprint - opener.mp4"""
import os, subprocess, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); CLIPS = os.path.join(HERE, 'clips')
OUT = os.path.join(HERE, 'The Money Blueprint - opener.mp4')
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
W, H, FPS = 1920, 1080, 30
NAVY, CREAM, GOLD_A, GOLD_B = (18, 37, 68), (246, 238, 220), (236, 176, 52), (200, 136, 28)
RED, BLUE, GREEN = (214, 48, 39), (36, 99, 199), (34, 150, 72)
NUN = os.path.expanduser('~/Library/Fonts/fixed-Nunito-Bold.ttf')
def lora(size):
    f = ImageFont.truetype(os.path.expanduser('~/Library/Fonts/Lora.ttf'), size); f.set_variation_by_name('Bold'); return f
def nun(size): return ImageFont.truetype(NUN, size)

# (clip, seconds into the clip to start, seconds used, tag)   — trims are set after watching the clips
# v2 (user: "flowing too slowly", tighten it): ~2 s a topic, cut on the action, ~21 s in all
SHOTS = [('01', 1.5, 2.0, None),                 # the blueprint unrolls (re-made with ₹ coins)
         ('02', 0.6, 2.2, 'GOALS'),               # the dart lands ~0.9 s in
         ('03', 0.8, 2.0, 'TIME HORIZON'),        # pages blur forward, clock beside
         ('04', 0.8, 2.2, 'RISK & RETURN'),       # coins drop into the green pan
         ('05', 0.5, 2.6, 'THE THREE BUCKETS'),   # plain red / blue / green buckets fill (re-made, no lettering), sped up
         ('06', 1.3, 2.2, 'SAVING & INVESTING'),  # the chest bursts open
         ('07', 1.6, 2.2, 'MY ACTION PLAN'),      # seedlings sprout
         ('08', 1.0, 2.2, 'MY CHECKLIST'),        # all five ticks draw in (re-made with ₹ coins), sped up
         ('09', 3.0, 1.8, None),                  # pulled back over the whole blueprint
         ('cover', 0.0, 3.0, None)]               # ends on the exact approved cover (v1 premium 3D, final title/colours/icons)
TARGET = 21.5
SPEED = {'05': 1.6, '08': 2.6}                    # source seconds per film second: the pour red->blue->green, all five ticks
XF = 0.15   # crossfade between shots

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_back(x, s=1.7): x = min(max(x, 0), 1); x -= 1; return x * x * ((s + 1) * x + s) + 1

def tag_img(text, size=64):
    """the cover's label: a cream torn-paper tag with a soft shadow and navy rounded caps"""
    f = nun(size); tw = f.getlength(text); th = size * 1.0; px, py = size * 0.7, size * 0.42
    w, h = int(tw + 2 * px), int(th + 2 * py); im = Image.new('RGBA', (w + 40, h + 40), (0, 0, 0, 0))
    rng = np.random.default_rng(len(text)); edge = []
    for x in np.linspace(0, w, 24): edge.append((20 + x, 20 + rng.uniform(0, 5)))
    for y in np.linspace(0, h, 6): edge.append((20 + w - rng.uniform(0, 6), 20 + y))
    for x in np.linspace(w, 0, 24): edge.append((20 + x, 20 + h - rng.uniform(0, 5)))
    for y in np.linspace(h, 0, 6): edge.append((20 + rng.uniform(0, 6), 20 + y))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).polygon([(x + 5, y + 8) for x, y in edge], fill=110)
    im.paste((20, 20, 30, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(9)))
    ImageDraw.Draw(im).polygon(edge, fill=CREAM + (255,))
    ImageDraw.Draw(im).text((20 + px, 20 + py - size * 0.08), text, font=f, fill=NAVY)
    return im
def place(canvas, img, cx, cy, scale=1.0, alpha=1.0, rot=0):
    if alpha <= 0 or scale <= 0.01: return
    im = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    if rot: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1: a = im.getchannel('A').point(lambda p: int(p * alpha)); im.putalpha(a)
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def title_img():
    """the approved cover title: THE MONEY over a bigger BLUEPRINT, heavy navy Lora, tight, then a gold sweep"""
    S = 2; s2 = 150 * S; s1 = int(s2 * 0.74); f1, f2 = lora(s1), lora(s2)
    im = Image.new('RGBA', (1500 * S, 420 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im); cx = im.width / 2
    def wid(s, f, sp): return sum(d.textlength(c, font=f) for c in s) + sp * (len(s) - 1)
    sp1, sp2 = -0.008 * s1, -0.012 * s2; st1, st2 = round(s1 * 0.012), round(s2 * 0.012)
    b1, b2 = f1.getbbox('THE MONEY'), f2.getbbox('BLUEPRINT'); h1 = b1[3] - b1[1]; gap = s2 * 0.17; top = 10 * S
    def put(y, s, f, sp, st, fill, dx=0, dy=0, draw=d):
        x = cx - wid(s, f, sp) / 2 + dx
        for c in s: draw.text((x, y + dy), c, font=f, fill=fill, stroke_width=st, stroke_fill=fill); x += draw.textlength(c, font=f) + sp
    sh = Image.new('L', im.size, 0); ds = ImageDraw.Draw(sh)
    put(top - b1[1], 'THE MONEY', f1, sp1, st1, 90, 5, 9, ds); put(top + h1 + gap - b2[1], 'BLUEPRINT', f2, sp2, st2, 90, 6, 10, ds)
    im.paste((10, 18, 30, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(12)))
    put(top - b1[1], 'THE MONEY', f1, sp1, st1, NAVY + (255,)); put(top + h1 + gap - b2[1], 'BLUEPRINT', f2, sp2, st2, NAVY + (255,))
    base = top + h1 + gap + (b2[3] - b2[1]); return im.resize((im.width // S, im.height // S), Image.LANCZOS), base / S
def sweep(canvas, cx, y, L, k):
    """the gold sweep, drawn left to right up to fraction k"""
    d = ImageDraw.Draw(canvas); n = 220
    for i in range(int(n * k)):
        x = -1 + 2 * i / (n - 1); t = (1 - abs(x) ** 1.4) * 9 + 1.5; c = i / (n - 1)
        col = tuple(int(GOLD_A[j] * (1 - c) + GOLD_B[j] * c) for j in range(3)) + (255,)
        px = cx + x * L / 2; py = y - (1 - x * x) * 7 + x * 3
        d.ellipse([px - t, py - t * 0.62, px + t, py + t * 0.62], fill=col)

def overlay_frame(t, starts):
    cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k, (clip, ss, dur, tag) in enumerate(SHOTS):
        t0 = starts[k]; lt = t - t0
        if lt < 0 or (lt > dur and k < len(SHOTS) - 1): continue      # the last shot's title holds to the very end
        if tag:                                                    # the topic tag pops in, holds, fades as the shot ends
            a = min(1, lt / 0.12) * min(1, (dur - lt) / 0.25); sc = 0.6 + 0.4 * ease_back((lt - 0.15) / 0.35)
            place(cv, TAGS[tag], W / 2, H - 150, sc if lt > 0.15 else 0.0, a, rot=-1.5)
        if clip == '01':                                           # opening line
            a = min(1, max(0, (lt - 0.5) / 0.5)) * min(1, (dur - lt) / 0.3)
            place(cv, OPENER, W / 2, H / 2 - 40, 0.94 + 0.06 * ease_out((lt - 0.5) / 0.8), a)
        if False and clip == '05':                                 # (v1 bucket names on the buckets — dropped in v2, user: didn't look good)
            # each bucket's front carries Veo's garbled word (source px, measured): red 'BLUE' x 269->262, blue 'BLUE'
            # 621->637, green 'GRUE' 970->1023 over the clip, all near y 357-366; the labels sit there and drift with it
            u = min(1, lt / dur)
            for j, (nm, col) in enumerate((('EMERGENCY', RED), ('STABILITY', BLUE), ('GROWTH', GREEN))):
                x = ((269, 621, 970)[j] + ((262, 637, 1023)[j] - (269, 621, 970)[j]) * u) * 1.5; y = (357 + 9 * u) * 1.5
                lj = lt - 0.12 * j
                place(cv, PILL[nm], x, y, 1.0 if lj > 0.25 else max(0.0, ease_back(lj / 0.25)) if lj > 0 else 0.0, min(1, (dur - lt) / 0.25) if lt < dur else 1)
        if False and clip == '08':                                 # (v1 Learn -> Grow list — the re-made clip ticks all five itself)
            for j, it in enumerate(('Learn', 'Plan', 'Invest', 'Review', 'Grow')):
                lj = lt - (0.3 + 0.45 * j)
                if lj > 0: place(cv, CHECK[it], 1560, 250 + j * 112, ease_back(lj / 0.28), min(1, (dur - lt) / 0.25))
        if False and clip == '09':                                 # (v1: title over the wide shot — replaced by the cover itself)
            a = min(1, max(0, (lt - 0.8) / 0.4)); sc = 0.92 + 0.08 * ease_out((lt - 0.8) / 0.6)
            band = BAND.copy(); band.putalpha(BAND.getchannel('A').point(lambda p: int(p * a))); cv.alpha_composite(band)
            place(cv, WEALTH, W / 2, 70, 1.0, a)
            place(cv, TITLE, W / 2, 150 + TITLE.height / 2, sc, a)
            if lt > 1.5: sweep(cv, W / 2, 150 + TBASE + 34, 520, ease_out((lt - 1.5) / 0.6))
    return cv

def pill(text, col):
    f = nun(46); w = int(f.getlength(text) + 70); h = 76; im = Image.new('RGBA', (w + 30, h + 30), (0, 0, 0, 0))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).rounded_rectangle([18, 22, 18 + w, 22 + h], 38, fill=110)
    im.paste((10, 10, 20, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(im); d.rounded_rectangle([15, 15, 15 + w, 15 + h], 38, fill=col + (255,))
    d.text((15 + w / 2, 15 + h / 2), text, font=f, fill=(255, 255, 255), anchor='mm'); return im
def check_row(text):
    f = lora(56); w = int(f.getlength(text) + 150); h = 92; im = Image.new('RGBA', (w + 30, h + 30), (0, 0, 0, 0))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).rounded_rectangle([18, 22, 18 + w, 22 + h], 20, fill=100)
    im.paste((10, 10, 20, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(im); d.rounded_rectangle([15, 15, 15 + w, 15 + h], 20, fill=CREAM + (250,))
    d.rounded_rectangle([38, 33, 94, 89], 10, outline=GREEN, width=5)
    d.line([(48, 60), (62, 76), (88, 40)], fill=GREEN, width=8, joint='curve')
    d.text((118, 15 + h / 2), text, font=f, fill=NAVY, anchor='lm'); return im
def wealth():
    f = nun(40); text = 'THE WEALTH CONVERSATION'; sp = 6; w = int(sum(f.getlength(c) for c in text) + sp * len(text)) + 260
    im = Image.new('RGBA', (w, 70), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 130
    d.line([(10, 35), (110, 35)], fill=GOLD_B + (255,), width=3); d.line([(w - 110, 35), (w - 10, 35)], fill=GOLD_B + (255,), width=3)
    for c in text: d.text((x, 35), c, font=f, fill=NAVY, anchor='lm'); x += f.getlength(c) + sp
    return im

TAGS = {s[3]: tag_img(s[3]) for s in SHOTS if s[3]}
PILL = {n: pill(n, c) for n, c in (('EMERGENCY', RED), ('STABILITY', BLUE), ('GROWTH', GREEN))}
CHECK = {n: check_row(n) for n in ('Learn', 'Plan', 'Invest', 'Review', 'Grow')}
WEALTH = wealth(); TITLE, TBASE = title_img()
def opener():
    f = nun(64); text = 'THE WEALTH CONVERSATION'; sp = 9; tw = int(sum(f.getlength(c) for c in text) + sp * (len(text) - 1))
    w, h = tw + 160, 150; im = Image.new('RGBA', (w + 40, h + 40), (0, 0, 0, 0))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).rounded_rectangle([24, 28, 24 + w, 28 + h], 26, fill=120)
    im.paste((10, 10, 20, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(im); d.rounded_rectangle([20, 20, 20 + w, 20 + h], 26, fill=CREAM + (245,))
    d.line([(90, 20 + h - 34), (20 + w - 70, 20 + h - 34)], fill=GOLD_B + (255,), width=4)
    x = 20 + 80
    for c in text: d.text((x, 20 + h / 2 - 10), c, font=f, fill=NAVY, anchor='lm'); x += f.getlength(c) + sp
    return im
OPENER = opener()
def band():
    g = np.linspace(0, 1, 600)[:, None]; a = np.clip((1 - g) / 0.42, 0, 1) ** 0.9 * 246   # solid behind the title (to ~y 350), then fades out by y 600
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); top = np.zeros((600, W, 4), np.uint8); top[..., :3] = CREAM; top[..., 3] = np.repeat(a, W, 1).astype(np.uint8)
    im.paste(Image.fromarray(top, 'RGBA'), (0, 0)); return im
BAND = band()

COVER = '/Users/lollyg/Documents/investing for Mummies/deliverables/images/money-blueprint-covers/Money Blueprint cover - v1 premium 3D - A4.png'
COVER_MP4 = os.path.join(HERE, '_cover.mp4')
def make_cover(dur):
    """the approved cover, whole and untouched, centred on a blurred, softened copy of itself; a slow gentle push"""
    im = Image.open(COVER).convert('RGB'); ch = 1000; cw = round(im.width * ch / im.height)
    card = im.resize((cw, ch), Image.LANCZOS)
    bg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(28))
    bg = Image.blend(bg, Image.new('RGB', (W, H), (30, 40, 58)), 0.35)
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([(W - cw) // 2 + 10, (H - ch) // 2 + 18, (W + cw) // 2 + 10, (H + ch) // 2 + 18], 8, fill=170)
    bg.paste((5, 8, 14), (0, 0), sh.filter(ImageFilter.GaussianBlur(22))); bg.paste(card, ((W - cw) // 2, (H - ch) // 2))
    still = os.path.join(HERE, '_cover.png'); bg.save(still)
    n = round(dur * FPS)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-i', still, '-vf',
                    f"scale={W*2}:{H*2},zoompan=z='1+0.025*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p",
                    '-frames:v', str(n), '-c:v', 'libx264', '-crf', '14', COVER_MP4], check=True)

if __name__ == '__main__':
    # 1) cut and join the clips: each scaled to 1920x1080, crossfaded, audio dropped (silent film)
    starts, t = [], 0.0
    for k, s in enumerate(SHOTS): starts.append(t); t += s[2] - (XF if k < len(SHOTS) - 1 else 0)
    HOLD = max(0.0, TARGET - t); TOTAL = t + HOLD                    # the cover holds to the end
    make_cover(SHOTS[-1][2] + HOLD + 0.5)
    ins, fc = [], []
    for k, (clip, ss, dur, tag) in enumerate(SHOTS):
        src = COVER_MP4 if clip == 'cover' else os.path.join(CLIPS, clip + '.mp4'); sp = SPEED.get(clip, 1.0)
        ins += ['-ss', f'{ss:.3f}', '-t', f'{dur * sp:.3f}', '-i', src]
        fc.append(f'[{k}:v]setpts=(PTS-STARTPTS)/{sp},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v{k}]')
    prev = 'v0'; off = 0.0
    for k in range(1, len(SHOTS)):
        off += SHOTS[k - 1][2] - XF
        fc.append(f'[{prev}][v{k}]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{k}]'); prev = f'x{k}'
    fc.append(f'[{prev}]tpad=stop_mode=clone:stop_duration={HOLD:.3f}[base]')
    tmp = os.path.join(HERE, '_base.mp4')
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[base]', '-an',
                    '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', tmp], check=True)
    # 2) the overlay layer, frame by frame, laid over the cut
    n = round(TOTAL * FPS); od = os.path.join(HERE, '_ov'); os.makedirs(od, exist_ok=True)
    for i in range(n): overlay_frame(i / FPS, starts).save(os.path.join(od, f'{i:04d}.png'), compress_level=1)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', tmp, '-framerate', str(FPS), '-i', os.path.join(od, '%04d.png'),
                    '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p[v]', '-map', '[v]', '-an', '-frames:v', str(n),
                    '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', OUT], check=True)
    print(f'OK {TOTAL:.2f}s -> {OUT}')
