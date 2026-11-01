#!/usr/bin/python3
"""'Walk away with a framework…' as a full-screen animated graphic (user, 1 Nov: replace Hiral's footage here with a
graphic). Her phone voice plays over it unchanged. A path draws down the left; three milestones land on her words —
goals, a framework for your investments, strategies for the journey — each ticks off as she finishes the phrase.
Times are her words in Walsingham House School.m4a 36.80+ (word timings), +0.05 lead like every Hiral shot."""
import subprocess, os, math, glob, time
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W_ = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, OUT = W_ + '/seg', W_ + '/ov/WALK'
LOGO = '/Users/lollyg/Documents/investing for Mummies/brand/logos/IFM-logo-round-1119px-transparent-no-TM.png'
FD = os.path.expanduser('~/Library/Fonts/'); os.makedirs(OUT, exist_ok=True); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
W, H, FPS, N = 1080, 1920, 30, 293
CREAM = (244, 241, 230); SLATE = (41, 67, 84); NAVY = (18, 38, 56); GOLD = (252, 197, 54); TEAL = (42, 157, 143)
def lora(sz, style='Bold'):
    f = ImageFont.truetype(FD + 'Lora.ttf', sz); f.set_variation_by_name(style); return f
def nun(sz): return ImageFont.truetype(FD + 'fixed-Nunito-Bold.ttf', sz)
L = 0.05
T_TITLE, T_FRAME = 0.00 + L, 1.00 + L                     # "Walk away with" / "a framework"
STEPS = [  # (lands on, ticks off at, title, line, icon)
    (1.56 + L, 3.30 + L, 'Meaningful goals', 'to set meaningful financial goals', 'target'),
    (3.50 + L, 6.16 + L, 'A simple framework', 'to organise your investments', 'buckets'),
    (6.74 + L, 8.92 + L, 'Strategies', 'to navigate your financial journey', 'road')]
ease = lambda p: 1 - (1 - min(max(p, 0), 1)) ** 3
def back(p):
    p = min(max(p, 0), 1); return 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2

# background: navy-to-slate gradient with a slow drifting dot grid
bg = Image.new('RGB', (W, H)); d = ImageDraw.Draw(bg)
for y in range(H):
    k = y / H; d.line([(0, y), (W, y)], fill=tuple(int(NAVY[i] * (1 - k) + SLATE[i] * k) for i in range(3)))
glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((W * 0.15, H * 0.05, W * 1.2, H * 0.55), fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(160)); bg = Image.composite(Image.new('RGB', (W, H), (60, 90, 110)), bg, glow)
logo = Image.open(LOGO).convert('RGBA').resize((150, 150), Image.LANCZOS)
disc = Image.new('RGBA', (170, 170), (0, 0, 0, 0)); ImageDraw.Draw(disc).ellipse((0, 0, 169, 169), fill=CREAM + (255,)); disc.alpha_composite(logo, (10, 10))

def icon(kind, size, t):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size / 2
    if kind == 'target':
        for r, col in ((0.46, GOLD), (0.33, CREAM), (0.20, GOLD), (0.08, SLATE)):
            d.ellipse((c - r * size, c - r * size, c + r * size, c + r * size), fill=col)
        a = ease(t / 0.35); x0 = size * (1.05 - 0.55 * a)                      # the arrow flies in and lands in the centre
        d.line([(x0, c - size * 0.55 * (1 - a) * 0.6 - 2), (x0 + size * 0.45, c - size * 0.30)], fill=SLATE, width=8)
        d.polygon([(x0 - 4, c), (x0 + 18, c - 10), (x0 + 12, c + 12)], fill=SLATE)
    elif kind == 'buckets':
        for i, (h, col) in enumerate(((0.55, TEAL), (0.75, GOLD), (0.40, SLATE))):
            x = size * (0.10 + i * 0.29); bw = size * 0.22; fill = ease((t - 0.12 * i) / 0.5)
            d.rounded_rectangle((x, size * 0.12, x + bw, size * 0.88), 10, outline=SLATE, width=5)
            top = size * 0.88 - (size * 0.72) * h * fill
            if top < size * 0.88 - 14: d.rounded_rectangle((x + 6, top, x + bw - 6, size * 0.88 - 6), 6, fill=col)
    else:  # road winding up to a flag
        pts = [(size * 0.18 + size * 0.12 * math.sin(k / 6), size * (0.92 - k / 30 * 0.7)) for k in range(31)]
        n = max(2, int(len(pts) * ease(t / 0.6))); d.line(pts[:n], fill=SLATE, width=16, joint='curve'); d.line(pts[:n], fill=CREAM, width=3)
        if t > 0.45:
            fx, fy = pts[-1]; d.line([(fx, fy), (fx, fy - size * 0.30)], fill=SLATE, width=6)
            wv = math.sin(t * 9) * 6; d.polygon([(fx, fy - size * 0.30), (fx + size * 0.32, fy - size * 0.22 + wv), (fx, fy - size * 0.14)], fill=GOLD)
    return im

CARD_X, CARD_W, CARD_H, PATH_X = 215, 830, 300, 130
YS = [690, 1080, 1470]
fT, fF, fS, fL = lora(86), lora(86), lora(56), nun(38)
t0 = time.time()
for f in range(N):
    t = f / FPS; im = bg.copy().convert('RGBA'); d = ImageDraw.Draw(im)
    # drifting dots
    off = (t * 14) % 60
    for y in range(-60, H, 60):
        for x in range(0, W, 60): d.ellipse((x - 2, y + off - 2, x + 2, y + off + 2), fill=(255, 255, 255, 18))
    im.alpha_composite(disc, (W - 210, 70))
    # title
    a = ease((t - T_TITLE) / 0.4)
    if a > 0: d.text((70, 200 - 40 * (1 - a)), 'Walk away with', font=fT, fill=CREAM + (int(255 * a),))
    a = ease((t - T_FRAME) / 0.35)
    if a > 0:
        bb = d.textbbox((0, 0), 'a framework.', font=fF); x, y = 70, 320 - 30 * (1 - a)
        d.rounded_rectangle((x - 18, y - 6, x + (bb[2] - bb[0]) * a + 22, y + bb[3] + 14), 14, fill=GOLD + (int(255 * a),))
        d.text((x, y), 'a framework.', font=fF, fill=SLATE + (int(255 * a),))
    # the path, drawn down to each step as it lands
    reach = 520
    for k, (tin, tick, *_r) in enumerate(STEPS):
        if t >= tin - 0.3: reach = YS[k] + (CARD_H / 2) * ease((t - tin + 0.3) / 0.3) if t < tin else YS[k] + CARD_H / 2
    d.line([(PATH_X, 520), (PATH_X, reach)], fill=CREAM + (120,), width=6)
    for k, (tin, tick, title, line, kind) in enumerate(STEPS):
        p = (t - tin) / 0.45
        if p <= 0: continue
        cy = YS[k] + CARD_H / 2; s = back(p)
        r = 34 * s; done = t >= tick
        d.ellipse((PATH_X - r, cy - r, PATH_X + r, cy + r), fill=(GOLD if done else CREAM) + (255,), outline=SLATE, width=4)
        if done:   # the tick pops in as she finishes the phrase
            q = back((t - tick) / 0.3); tk = [(PATH_X - 15 * q, cy + 1), (PATH_X - 4 * q, cy + 13 * q), (PATH_X + 17 * q, cy - 12 * q)]
            d.line(tk, fill=SLATE, width=7, joint='curve')
        else: d.text((PATH_X, cy), str(k + 1), font=nun(36), fill=SLATE, anchor='mm')
        e = ease(p); x = CARD_X + 300 * (1 - e)
        card = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, CARD_W - 1, CARD_H - 1), 28, fill=CREAM + (255,))
        if done: cd.rounded_rectangle((0, 0, 14, CARD_H - 1), 7, fill=GOLD + (255,))
        card.alpha_composite(icon(kind, 180, t - tin), (34, 60))
        cd.text((240, 78), title, font=fS, fill=SLATE)
        words = line.split(); lines, cur = [], ''
        for w_ in words:
            if cd.textlength((cur + ' ' + w_).strip(), font=fL) > CARD_W - 280: lines.append(cur); cur = w_
            else: cur = (cur + ' ' + w_).strip()
        lines.append(cur)
        for j, ln in enumerate(lines): cd.text((242, 160 + j * 48), ln, font=fL, fill=(70, 90, 105))
        shd = Image.new('RGBA', (CARD_W + 80, CARD_H + 80), (0, 0, 0, 0))
        ImageDraw.Draw(shd).rounded_rectangle((40, 52, CARD_W + 40, CARD_H + 52), 28, fill=(0, 0, 0, int(110 * e)))
        shd = shd.filter(ImageFilter.GaussianBlur(16)); im.alpha_composite(shd, (int(x) - 40, YS[k] - 40))
        if e < 1: card.putalpha(card.split()[3].point(lambda v: int(v * min(1, e * 1.6))))
        im.alpha_composite(card, (int(x), YS[k]))
    im.convert('RGB').save(f'{OUT}/f{f:04d}.png', compress_level=1)
print(f'frames {N} ({time.time()-t0:.0f}s)', flush=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-framerate', '30', '-i', f'{OUT}/f%04d.png', '-frames:v', str(N), '-c:v', 'libx264', '-preset', 'medium',
                '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', f'{SEG}/WALK.mp4'], check=True)
print('WALK DONE', flush=True)
