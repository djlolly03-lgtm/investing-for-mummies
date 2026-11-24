#!/usr/bin/env python3
"""Paper-cut beat in IFM colours (from guide card 82): Hiral as a white-edged paper cut-out on cream paper, teal
hand-drawn stripes, a gold blob with a navy zigzag, small navy doodles, and ransom-note letter tiles that spell
ASK? / VOICE / ROLE on her words. Closing take MVI_0283, cam = generic - 20.658 (camera-audio xcorr).
  python paper_cut.py still T [T...]   -> PNGs at generic time T
  python paper_cut.py                  -> $TMP/paper.mp4 for generic frames PC0..PC1"""
import os, sys, math, random, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, grade_fit, grade, Matte, write, ease_out, clamp, GEN, TAKES, TMP, W, H, FPS

OFF = -20.658
PC0, PC1 = 1368, 1574                              # 45.600 ("to ask") -> 52.467, the cut before JOIN
CREAM, NAVY, TEAL, GOLD = (243, 238, 223), (26, 58, 92), (42, 157, 143), (252, 197, 54)
LORA = os.path.expanduser('~/Library/Fonts/Lora.ttf')
ROWS = [('ASK?', 45.72, 60), ('VOICE', 47.90, 205), ('ROLE', 49.62, 350)]   # word, time, y


def background():
    rnd = random.Random(7)
    bg = Image.new('RGB', (W, H), CREAM)
    noise = (np.random.default_rng(3).normal(0, 5, (H, W, 1))).astype(np.float32)
    bg = Image.fromarray(np.clip(np.asarray(bg).astype(np.float32) + noise, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(bg)
    for x in range(40, W - 30, 15):                       # teal hand-drawn stripes
        pts = [(x + rnd.uniform(-3, 3), 40 + rnd.uniform(0, 14))]
        y = pts[0][1]
        while y < 770:
            y += rnd.uniform(40, 80); pts.append((x + rnd.uniform(-4, 4), min(y, 770 - rnd.uniform(0, 16))))
        d.line(pts, fill=TEAL, width=rnd.choice([5, 6, 7]), joint='curve')
    # gold blob
    cx, cy, r = 900, 960, 230
    blob = [(cx + (r + rnd.uniform(-25, 25)) * math.cos(a), cy + (r * 1.15 + rnd.uniform(-25, 25)) * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 22, endpoint=False)]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(blob, fill=255); m = m.filter(ImageFilter.GaussianBlur(6)).point(lambda v: 255 if v > 128 else 0)
    bg.paste(Image.new('RGB', (W, H), GOLD), (0, 0), m)
    z = [(720 + i * 26, 860 + (0 if i % 2 else 170) + rnd.uniform(-10, 10)) for i in range(14)]
    d.line(z, fill=NAVY, width=7, joint='curve')
    zz = [(800 + i * 18, 1190 + (0 if i % 2 else 55)) for i in range(12)]
    d.line(zz, fill=(214, 79, 72), width=5)
    for (x, y) in ((50, 1030), (95, 1050)):               # small navy x x and o o o
        d.line([(x - 14, y - 14), (x + 14, y + 14)], fill=NAVY, width=5); d.line([(x - 14, y + 14), (x + 14, y - 14)], fill=NAVY, width=5)
    for i in range(3): d.ellipse([930 + i * 34, 1250, 954 + i * 34, 1274], outline=NAVY, width=4)
    return bg


def tile(ch, k):
    cols = [(CREAM, NAVY), (NAVY, CREAM), (GOLD, NAVY), (TEAL, CREAM), ((20, 20, 24), CREAM)]
    bgc, fg = cols[k % len(cols)]
    s = 118; f = ImageFont.truetype(LORA, 92); f.set_variation_by_name('Bold')
    im = Image.new('RGBA', (s + 40, s + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle([24, 28, 20 + s + 4, 20 + s + 8], fill=(0, 0, 0, 110))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
    d.rectangle([20, 20, 20 + s, 20 + s], fill=bgc + (255,))
    l, t, r, b = f.getbbox(ch); d.text((20 + (s - (r - l)) / 2 - l, 20 + (s - (b - t)) / 2 - t), ch, font=f, fill=fg + (255,))
    return im.rotate(random.Random(ord(ch) * 7 + k).uniform(-7, 7), resample=Image.BICUBIC, expand=True)


def cutout(rgb, m):
    """Her frame as a paper cut-out: white border (dilated matte) + soft shadow."""
    a = Image.fromarray((m[..., 0] * 255).astype(np.uint8))
    border = a.filter(ImageFilter.MaxFilter(29)).filter(ImageFilter.GaussianBlur(1.5))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh.putalpha(border.point(lambda v: int(v * 0.45)))
    lay.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (8, 14))
    white = Image.new('RGBA', (W, H), (255, 255, 255, 255)); white.putalpha(border); lay.alpha_composite(white)
    person = Image.fromarray(rgb.astype(np.uint8)).convert('RGBA'); person.putalpha(a); lay.alpha_composite(person)
    return lay


def render(stills=None):
    n = PC1 - PC0
    raw = frames(f'{TAKES}/MVI_0283.MP4', PC0 / FPS + OFF, n)
    # fit the grade on 47-48s: the generic frames before that carry the phone-notification cards over her chest
    k0 = int(round(47.0 * FPS)) - PC0
    fin = frames(GEN, 47.0, 20)
    ab = grade_fit(fin, raw[k0:k0 + 20], slice(1000, 1900))
    bg = background(); mt = Matte()
    tiles = {(ri, k): tile(ch, ri * 2 + k) for ri, (word, _, _) in enumerate(ROWS) for k, ch in enumerate(word)}
    idx = [int(round(t * FPS)) - PC0 for t in stills] if stills else range(n)
    out = []
    for i in idx:
        t = (PC0 + i) / FPS
        g = grade(raw[i].astype(np.float32), ab)
        m = mt(raw[i]) if stills is None else Matte()(raw[i])
        f = bg.copy().convert('RGBA')
        k_in = ease_out((t - PC0 / FPS) / 0.18)              # paper slap-in: the cut-out drops from 1.06x
        cut = cutout(g, m)
        if k_in < 1:
            s = 1.06 - 0.06 * k_in; cut = cut.resize((int(W * s), int(H * s)), Image.BILINEAR)
            f.alpha_composite(cut, (int((W - cut.width) / 2), int((H - cut.height) / 2)))
        else:
            f.alpha_composite(cut)
        for ri, (word, tw, y) in enumerate(ROWS):
            for k, ch in enumerate(word):
                t0 = tw - 0.05 + k * 0.09
                if t < t0: continue
                p = ease_out((t - t0) / 0.12); im = tiles[(ri, k)]
                if p < 1:
                    im = im.resize((max(1, int(im.width * (1.35 - 0.35 * p))), max(1, int(im.height * (1.35 - 0.35 * p)))), Image.BILINEAR)
                x = 40 + k * 140 + (ri % 2) * 30
                f.alpha_composite(im, (int(x + 79 - im.width / 2), int(y + 79 - im.height / 2)))
        f = f.convert('RGB')
        if stills is not None:
            f.save(f'{TMP}/paper_still_{t:.2f}.png')
        else:
            out.append(np.asarray(f).astype(np.float32))
    if stills is None: return write('paper', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still':
        render([float(x) for x in sys.argv[2:]])
    else:
        render()
