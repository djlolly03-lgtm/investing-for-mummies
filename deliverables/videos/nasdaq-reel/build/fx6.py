"""The effects skill's fx.py plus one variant, run with the skill's venv. The installed skill is not modified.
  uninstall-clear: the uninstall dialog fills 0 -> 100% while the frame goes from broken to clean (the glitch of
  `uninstall` played backwards: pixelated + dark at the start, glitch lines thinning out, clear at the end), and the
  label flips to a done state for the last 0.4s."""
import os, sys
sys.path.insert(0, os.path.expanduser('~/.claude/skills/effects/scripts'))
import fx
from fx import *  # noqa: F401,F403  (helpers: clamp, rrect, font, place, shadowed, ease_inout, ease_back, INK, np, cv2, ImageDraw)
from PIL import Image as _Image, ImageDraw as _ImageDraw

def square_card(im, w, radius=0.22):
    """App-icon card: square, rounded, soft shadow. Replaces the 9:16 reel card for the orbit (company logos, not reels)."""
    h = w
    src = im.convert('RGB'); sw, sh = src.size
    s = max(w / sw, h / sh)
    src = src.resize((max(w, int(sw * s)), max(h, int(sh * s))), _Image.LANCZOS)
    l, t = (src.width - w) // 2, (src.height - h) // 2
    src = src.crop((l, t, l + w, t + h)).convert('RGBA')
    m = _Image.new('L', (w, h), 0); _ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], int(w * radius), fill=255)
    src.putalpha(m)
    _ImageDraw.Draw(src).rounded_rectangle([0, 0, w - 1, h - 1], int(w * radius), outline=(255, 255, 255, 60), width=2)
    return shadowed(src, blur=max(6, w // 16), dy=w // 22, alpha=150)
fx.card = square_card

import random as _random
@fx.effect('keycap-rain-land', 'keycaps fall slowly behind you, land on a floor line and stay')
def fx_keycap_rain_land(c, e):
    keys = e.o.get('text', 'A|B|C').split('|'); ks = int(c.W * 0.1)
    def cap(k):
        w = max(ks, int(font('mono', ks * 0.36).getlength(k) + ks * 0.5))
        im = rrect(w, ks, ks * 0.18, (190, 190, 198, 255)); top = rrect(w - 8, ks - 14, ks * 0.16, (246, 246, 248, 255))
        im.alpha_composite(top, (4, 3)); ImageDraw.Draw(im).text((w / 2, ks * 0.44), k, font=font('mono', ks * 0.36), fill=INK + (255,), anchor='mm')
        return shadowed(im, 8, 6, 100)
    caps = cached(e, 'caps', lambda: [cap(k) for k in keys])
    n = int(e.o.get('count', 12)); floor = float(e.o.get('floor', 0.70)) * c.H; fall = float(e.o.get('fall', 1.6))   # seconds to reach the floor
    SLOTS = [(0.16, 0.00), (0.84, 0.00), (0.20, 1.15), (0.80, 1.15), (0.15, 2.30), (0.85, 2.30), (0.21, 3.45), (0.79, 3.45)]  # (x, extra drop in keycap heights)
    def mk():
        out = []
        for i in range(min(n, len(keys))):                               # one cap per word
            r = _random.Random(i * 11 + 3); im = caps[i]; sx, dz = SLOTS[i % len(SLOTS)]
            x = min(max(c.W * sx, im.width / 2 + 16), c.W - im.width / 2 - 16)
            t0 = i * max(0.1, e.d * 0.55) / max(1, min(n, len(keys))) ; rot = r.uniform(-14, 14); drop = floor - dz * ks * 1.05
            out.append((x, t0, rot, drop, im))
        return out
    parts = cached(e, 'p', mk)
    for x, t0, rot, drop, im in parts:
        if c.lt < t0: continue
        u = clamp((c.lt - t0) / fall)
        y = -ks + (drop + ks) * (u * u)                                   # accelerates like a drop
        if u >= 1.0:                                                     # landed: a tiny settle bounce, then still
            s = (c.lt - t0 - fall); y = drop - 10 * max(0.0, 1 - s * 4) * abs(np.sin(s * 14))
            r = rot * max(0.0, 1 - s * 3)
        else: r = rot
        place(c, im, x, y, 1.0, r, clamp((e.d - c.lt) / 0.25), behind=True)



@fx.effect('uninstall-clear', 'an uninstall bar fills while the glitch clears: broken at the start, clean at 100%')
def fx_uninstall_clear(c, e):
    hold = float(e.o.get('hold', 0.9)); T = e.d - hold        # bar fills and glitch clears over T, then the done card holds
    p = clamp(c.lt / T); r = 1 - p; g = r ** 1.6
    rnd = np.random.default_rng(int(c.t * 30))
    sh = int(g * c.W * 0.025)
    if sh: c.img = np.stack([np.roll(c.img[..., 0], sh, 1), c.img[..., 1], np.roll(c.img[..., 2], -sh, 1)], -1)
    for _ in range(int(g * 12)):
        y0 = int(rnd.uniform(0, c.H)); hh = int(rnd.uniform(8, 60)); off = int(rnd.uniform(-1, 1) * g * c.W * 0.08)
        c.img[y0:y0 + hh] = np.roll(c.img[y0:y0 + hh], off, 1)
    if r > 0.78:
        q = (r - 0.78) / 0.22; f = 1 + int(q * 40)
        small = cv2.resize(c.img, (max(1, c.W // f), max(1, c.H // f)), interpolation=cv2.INTER_AREA)
        c.img = cv2.resize(small, (c.W, c.H), interpolation=cv2.INTER_NEAREST) * (1 - 0.6 * q)
    done = c.lt >= T
    k = ease_out((c.lt - T) / 0.55) if done else 0.0         # done: the card grows toward the centre and the room dims
    mode = e.o.get('finish', 'centre')   # centre: grows over her face, room at half · black: room fades to black · top: stays above her head
    if k > 0: c.img = c.img * (1 - {'centre': 0.5, 'black': 1.0, 'top': 0.3}[mode] * k)
    s = 1 + 0.14 * k                                           # drawn at the grown size (not upscaled), so text stays crisp
    bw, bh = int(c.W * 0.86 * s), int(c.W * 0.27 * s)     # bigger than the stock dialog (0.7 x 0.2): user wanted larger text
    im = rrect(bw, int(bh * (1 + 0.14 * k)), 28 * s, (245, 245, 247, 240)); d = ImageDraw.Draw(im)   # room for the tick row
    label = e.o.get('text', 'Uninstalling...')          # user: the label never changes, like an app's uninstall sheet
    fs = bh * 0.2
    while fs > 20 and font('uib', fs).getlength(label) > bw * 0.88: fs *= 0.95   # longer labels shrink to fit the card
    d.text((bw * 0.06, bh * 0.28), label, font=font('uib', fs), fill=INK + (255,), anchor='lm')
    d.rounded_rectangle([bw * 0.06, bh * 0.56, bw * 0.94, bh * 0.7], 8, fill=(215, 215, 220, 255))
    d.rounded_rectangle([bw * 0.06, bh * 0.56, bw * 0.06 + bw * 0.88 * max(0.03, ease_inout(p)), bh * 0.7], 8, fill=(0, 122, 255, 255))
    if not done:
        d.text((bw * 0.94, bh * 0.85), f'{int(ease_inout(p) * 100)}%', font=font('ui', bh * 0.13), fill=(110, 110, 110, 255), anchor='rm')
    else:                                               # 100%: a prominent tick pops in with "Done" in place of the counter
        pk = ease_back((c.lt - T) / 0.28); dd = max(2, int(bh * 0.26 * pk))
        tick = Image.new('RGBA', (dd, dd), (0, 0, 0, 0)); td = ImageDraw.Draw(tick)
        td.ellipse([0, 0, dd - 1, dd - 1], fill=(0, 122, 255, 255))
        td.line([(dd * 0.27, dd * 0.53), (dd * 0.43, dd * 0.69), (dd * 0.74, dd * 0.35)], fill=(255, 255, 255, 255), width=max(2, int(dd * 0.12)), joint='curve')
        cx, cy = bw * 0.94 - bh * 0.13, bh * 0.9
        im.alpha_composite(tick, (int(cx - dd / 2), int(cy - dd / 2)))
        a = int(255 * clamp((c.lt - T) / 0.15))
        d.text((cx - bh * 0.17, cy), 'Done', font=font('uib', bh * 0.16), fill=INK + (a,), anchor='rm')
    place(c, shadowed(im, 16, 8, 120), c.W / 2, c.H * (0.16 + {'centre': 0.26, 'black': 0.30, 'top': 0.0}[mode] * k), 0.8 + 0.2 * ease_back(c.lt / 0.3), 0, clamp(c.lt / 0.1))


if __name__ == '__main__':
    fx.main()
