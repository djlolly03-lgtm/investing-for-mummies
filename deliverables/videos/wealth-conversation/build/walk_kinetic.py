#!/usr/bin/env python3
"""Walk-away beat (generic frames 802-1083, 26.733-36.100s) re-rendered from raw MVI_0280 (cam = generic + 12.44, from
camera-audio vs voice cross-correlation) with kinetic type in the style of the user's reference (23 Nov 2026):
small white sans words + big gold, slanted, condensed-black hero words, each landing on its spoken word, in clusters
over her torso (never over her face); a gentle 1.0 -> 1.08 push; the old stickers are gone (fresh raw frames).
Writes $TMP/walk.mp4. Run with the effects venv (imports eo_nagpur_v2 helpers).
  python walk_kinetic.py           -> full shot
  python walk_kinetic.py still T   -> one PNG at generic time T (for checking the look)"""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, grade_fit, grade, Matte, write, ease_out, ease_back, clamp, over, key_green, GEN, TAKES, TMP, W, H, FPS

HN = '/System/Library/Fonts/HelveticaNeue.ttc'
SMALL = ImageFont.truetype(HN, 70, index=10)          # Helvetica Neue Medium
GOLD = (252, 197, 54)
# 3D icons above her head (ChatGPT, 23 Nov 2026; ~/Downloads/ifm_icon_*.png on green): one per phrase, they stay and build
# into a row - blueprint (walk away / framework), target (goals), coin jars (organize), compass (navigate).
ICON_DIR = os.path.expanduser('~/Downloads')
# one at a time, big and bold, centred above her head; each one is knocked out by the next (user, 23 Nov 2026)
ICONS = []   # v6 icons replaced in v7 by the Flow banner below (user: "too shiny, too AI looking")
# Realistic Flow banner (v8): Omni 1.2 Flash, 10s, 16:9, generated 23 Nov 2026 with the four arrivals timed to her words;
# played at natural speed from its first frame (user: v7's retimed Veo clip was "too slow and pauses").
# Source: build/flow_banner_10s_source.mp4 -> $TMP/banner.mp4 (fps=30, first 281 frames, no crop).
BANNER = os.path.join(TMP, 'banner.mp4'); BW, BH, BX, BY = 1000, 562, 40, 40
ICON_SIZE = 600
F0, F1 = 802, 1083
OFF = 12.44

# (word, generic time it is said, kind, x, y)  -- y is relative to the cluster top (set below the chin)
GROUPS = [
    (26.73, 28.10, [('walk', 26.75, 'hero', 400, 40), ('away', 27.04, 'hero', 640, 230), ('with a', 27.36, 'small', 860, 70),
                    ('framework', 27.66, 'small', 330, 400), ('to set', 28.02, 'small', 760, 430)]),
    (28.10, 30.25, [('meaningful', 28.44, 'hero', 540, 90), ('financial', 28.84, 'small', 300, 290), ('goals,', 29.32, 'hero', 650, 360)]),
    (30.25, 32.90, [('a simple', 30.34, 'small', 300, 40), ('framework', 30.86, 'hero', 540, 190), ('to organize', 31.42, 'small', 820, 360),
                    ('your investments', 32.02, 'small', 470, 440)]),
    (32.90, 36.10, [('and', 32.78, 'small', 250, 60), ('strategies', 33.42, 'hero', 540, 200), ('to navigate', 33.88, 'small', 830, 70),
                    ('your financial', 34.52, 'small', 380, 380), ('journey.', 35.28, 'small', 760, 440)]),
]


def word_img(text, kind):
    if kind == 'small':
        f = SMALL; fill = (255, 255, 255, 255); rot = 0
    else:
        size = 250
        while True:
            f = ImageFont.truetype(HN, size, index=9)  # Condensed Black
            l, t, r, b = f.getbbox(text)
            if r - l <= 900 or size < 120: break
            size -= 10
        fill = GOLD + (255,); rot = 9
    l, t, r, b = f.getbbox(text); pad = 30
    im = Image.new('RGBA', (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - l, pad - t), text, font=f, fill=fill)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); sh.putalpha(im.getchannel('A').point(lambda v: int(v * 0.55)))
    sh = sh.filter(ImageFilter.GaussianBlur(8 if kind == 'small' else 14))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(sh, (3, 6)); out.alpha_composite(im)
    return out.rotate(rot, resample=Image.BICUBIC, expand=True)


def ease_inout(p): p = clamp(p); return p * p * (3 - 2 * p)


def push(img, z, cx, cy):
    if z <= 1.0001: return img
    w, h = W / z, H / z; x0 = cx - w * cx / W; y0 = cy - h * cy / H
    return np.asarray(Image.fromarray(img.astype(np.uint8)).resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + w, y0 + h))).astype(np.float32)


def render(still_t=None):
    n = F1 - F0
    raw = frames(f'{TAKES}/MVI_0280.MP4', F0 / FPS + OFF, n)
    fin = frames(GEN, F0 / FPS, 20)
    ab = grade_fit(fin, raw[:20], slice(1000, 1900))
    m0 = Matte()(raw[0])[..., 0] > 0.5
    rows = np.where(m0.sum(1) > 20)[0]; ht = int(rows[0])
    widths = m0[ht:ht + 700].sum(1); neck = ht + 250 + int(np.argmin(widths[250:650]))
    top = max(neck + 30, 1080)
    xs = np.where(m0[ht + 120])[0]; fx = (xs[0] + xs[-1]) / 2
    print('head top', ht, 'neck', neck, 'cluster top', top, 'face x', fx)
    imgs = {(gi, wi): word_img(w, k) for gi, (_, _, ws) in enumerate(GROUPS) for wi, (w, _, k, _, _) in enumerate(ws)}
    icons, glows = [], []
    for fn, _, _, _ in ICONS:
        im = key_green(os.path.join(ICON_DIR, fn)); s_ = ICON_SIZE / max(im.size)
        im = im.resize((int(im.width * s_), int(im.height * s_)), Image.LANCZOS)
        sh = Image.new('RGBA', (im.width + 60, im.height + 60), (0, 0, 0, 0)); a = Image.new('RGBA', im.size, (0, 0, 0, 0))
        a.putalpha(im.getchannel('A').point(lambda v: int(v * 0.5))); sh.alpha_composite(a, (36, 44))
        sh = sh.filter(ImageFilter.GaussianBlur(12)); sh.alpha_composite(im, (30, 30)); icons.append(sh)
        gw = Image.new('RGBA', (sh.width + 120, sh.height + 120), (0, 0, 0, 0))
        ImageDraw.Draw(gw).ellipse([60, 60, gw.width - 60, gw.height - 60], fill=(255, 236, 170, 255)); glows.append(gw.filter(ImageFilter.GaussianBlur(40)))
    banner = None; mt = Matte(); bcards = {}
    if os.path.exists(BANNER):
        banner = frames(BANNER, 0, n, (BW, BH))
        r = 30; mask = Image.new('L', (BW, BH), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, BW - 1, BH - 1), r, fill=255)
        for j in range(n):
            base = Image.new('RGBA', (BW + 60, BH + 60), (0, 0, 0, 0))
            sh = Image.new('RGBA', base.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((36, 46, BW + 30, BH + 40), r + 6, fill=(0, 0, 0, 120))
            base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
            ImageDraw.Draw(base).rounded_rectangle((24, 24, BW + 35, BH + 35), r + 6, fill=(244, 238, 224, 255))
            base.paste(Image.fromarray(banner[j]), (30, 30), mask); bcards[j] = base
    out = []
    rng = [int((still_t * FPS) - F0)] if still_t is not None else range(n)
    for i in rng:
        t = (F0 + i) / FPS
        g = grade(raw[i].astype(np.float32), ab)
        g = push(g, 1 + 0.08 * ease_inout(i / (n - 1)), fx, ht + 260)
        g = g * 0.9                                     # a touch darker so the type pops
        IL = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for k, (fn, ts, x, y) in enumerate(ICONS):
            if t < ts: continue
            nxt = ICONS[k + 1][1] if k + 1 < len(ICONS) else 99
            if t >= nxt + 0.18: continue
            lt = t - ts; sc = ease_back(lt / 0.35)
            if t >= nxt:                                   # knocked out: shrink, lift and fade as the next one lands
                q = (t - nxt) / 0.18; sc *= 1 - 0.6 * q; y -= 120 * q
            im = icons[k]
            if lt < 0.45:                                # landing glow
                gl = clamp(1 - lt / 0.45) * 0.8
                glow = glows[k].copy(); glow.putalpha(glows[k].getchannel('A').point(lambda v, q=gl: int(v * q)))
                IL.alpha_composite(glow, (int(x - glow.width / 2), int(y - glow.height / 2)))
            if sc < 0.999 or sc > 1.001: im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.BILINEAR)
            fy = 8 * np.sin(2 * np.pi * 0.7 * lt + k * 1.3) * clamp(lt / 0.35)
            if t >= nxt: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v, a=1 - (t - nxt) / 0.18: int(v * max(0, a))))
            IL.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2 + fy)))
        g = over(g, IL)
        if banner is not None:                            # behind her: her head always stays in front
            lt = i / FPS; k_in = ease_out(lt / 0.35)
            card = bcards[i]
            if k_in < 1: card = card.copy(); card.putalpha(card.getchannel('A').point(lambda v, q=k_in: int(v * q)))
            BL = Image.new('RGBA', (W, H), (0, 0, 0, 0)); BL.alpha_composite(card, (BX - 30, int(BY - 30 - 60 * (1 - k_in))))
            mm = mt(raw[i])
            g = over(g, BL) * (1 - mm) + g * mm
        L = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for gi, (g0, g1, ws) in enumerate(GROUPS):
            if not (g0 <= t < g1): continue
            gout = clamp((g1 - t) / 0.12) if gi < len(GROUPS) - 1 else clamp((g1 - t) / 0.2)
            for wi, (w, ts, kind, x, y) in enumerate(ws):
                if t < ts - 0.02: continue
                lt = t - ts + 0.02
                im = imgs[(gi, wi)]
                if kind == 'hero':
                    p = ease_out(lt / 0.14); sc = 1.5 - 0.5 * p; al = clamp(lt / 0.06)
                else:
                    p = ease_out(lt / 0.12); sc = 0.75 + 0.25 * p; al = p
                al *= gout
                if al <= 0: continue
                im2 = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.BILINEAR) if sc != 1 else im
                if al < 1: im2 = im2.copy(); im2.putalpha(im2.getchannel('A').point(lambda v, a=al: int(v * a)))
                L.alpha_composite(im2, (int(x - im2.width / 2), int(top + y - im2.height / 2 + (1 - p) * (8 if kind == 'small' else 0))))
        f = over(g, L)
        if still_t is not None:
            Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(f'{TMP}/walk_still_{still_t}.png'); return
        out.append(f)
    return write('walk', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still':
        for T in sys.argv[2:]: render(float(T))
    else:
        render()
