#!/usr/bin/python3
"""Prepare the photos and logos the Wealth Conversation deck uses.

Reads originals from assets/src/ (copies taken on 24 Oct 2026 — several originals in
workshop-photos-aug2026/ carry a Dropbox com.apple.macl lock and stop being readable
mid-session, so the build never reads them directly) and writes deck-ready files to assets/.

Rounded photos are PNG with real transparency so they sit on any background; the
module-panel textures are navy duotone JPEGs, so white text on them always has contrast.

    /usr/bin/python3 prep_assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps, ImageFilter

HERE = Path(__file__).resolve().parent
SRC = HERE / 'assets' / 'src'
OUT = HERE / 'assets'
DPI = 200  # print-quality for a slide viewed full-screen or printed A4

NAVY = (26, 58, 92)
NAVY_DEEP = (16, 40, 66)
NAVY_LIFT = (52, 92, 128)


def load(name):
    return ImageOps.exif_transpose(Image.open(SRC / name)).convert('RGB')


def cover_crop(im, aspect, focus=(0.5, 0.5)):
    """Crop to aspect (w/h) around a focus point given as fractions of the image."""
    w, h = im.size
    if w / h > aspect:
        nw, nh = int(h * aspect), h
    else:
        nw, nh = w, int(w / aspect)
    cx, cy = focus[0] * w, focus[1] * h
    x0 = int(min(max(cx - nw / 2, 0), w - nw))
    y0 = int(min(max(cy - nh / 2, 0), h - nh))
    return im.crop((x0, y0, x0 + nw, y0 + nh))


def rounded(name, out, w_in, h_in, radius_in=0.16, focus=(0.5, 0.5), border_in=0.0, dpi=DPI):
    px_w, px_h = int(w_in * dpi), int(h_in * dpi)
    im = cover_crop(load(name), w_in / h_in, focus).resize((px_w, px_h), Image.LANCZOS)
    r = int(radius_in * dpi)
    canvas = Image.new('RGBA', (px_w, px_h), (0, 0, 0, 0))
    if border_in:
        b = int(border_in * dpi)
        frame = Image.new('RGBA', (px_w, px_h), (255, 255, 255, 255))
        inner = im.resize((px_w - 2 * b, px_h - 2 * b), Image.LANCZOS).convert('RGBA')
        m = Image.new('L', inner.size, 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, inner.size[0] - 1, inner.size[1] - 1), max(r - b, 2), fill=255)
        frame.paste(inner, (b, b), m)
        im = frame
    mask = Image.new('L', (px_w, px_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, px_w - 1, px_h - 1), r, fill=255)
    canvas.paste(im.convert('RGBA'), (0, 0), mask)
    canvas.save(OUT / out, optimize=True)
    print(f'{out:28s} {px_w}x{px_h}  {(OUT / out).stat().st_size // 1024} KB')


def circle(name, out, size_px=640, focus=(0.5, 0.35), zoom=1.0):
    im = load(name)
    side = int(min(im.size) / zoom)
    w, h = im.size
    cx, cy = focus[0] * w, focus[1] * h
    x0 = int(min(max(cx - side / 2, 0), w - side))
    y0 = int(min(max(cy - side / 2, 0), h - side))
    im = im.crop((x0, y0, x0 + side, y0 + side)).resize((size_px, size_px), Image.LANCZOS)
    mask = Image.new('L', (size_px, size_px), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size_px - 1, size_px - 1), fill=255)
    canvas = Image.new('RGBA', (size_px, size_px), (0, 0, 0, 0))
    canvas.paste(im.convert('RGBA'), (0, 0), mask)
    canvas.save(OUT / out, optimize=True)
    print(f'{out:28s} {size_px}x{size_px}  {(OUT / out).stat().st_size // 1024} KB')


def duotone(name, out, w_in, h_in, focus=(0.5, 0.5), strength=0.40):
    """Navy duotone: the photo survives as texture, never competes with white text."""
    px_w, px_h = int(w_in * 160), int(h_in * 160)
    im = cover_crop(load(name), w_in / h_in, focus).resize((px_w, px_h), Image.LANCZOS)
    g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=2).filter(ImageFilter.GaussianBlur(5))  # soft enough that no slide text survives
    lo = Image.new('RGB', (px_w, px_h), NAVY_DEEP)
    hi = Image.new('RGB', (px_w, px_h), NAVY_LIFT)
    tone = Image.composite(hi, lo, g)
    flat = Image.new('RGB', (px_w, px_h), NAVY)
    res = Image.blend(flat, tone, strength)
    res.save(OUT / out, quality=86, optimize=True, progressive=True)
    print(f'{out:28s} {px_w}x{px_h}  {(OUT / out).stat().st_size // 1024} KB')


def logo(name, out, max_w=900):
    im = Image.open(SRC / name).convert('RGBA')
    bbox = im.getbbox()
    im = im.crop(bbox)
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(OUT / out, optimize=True)
    print(f'{out:28s} {im.width}x{im.height}  {(OUT / out).stat().st_size // 1024} KB')


def header_panel(name, out, w_in, h_in, photo_h_in, focus=(0.5, 0.5), shade=0.72):
    """Module left panel: a real session photo across the top, washed with navy so white and
    gold type stay readable on it, fading into solid navy where the intro text runs."""
    px_w, px_h, ph = int(w_in * 160), int(h_in * 160), int(photo_h_in * 160)
    im = cover_crop(load(name), w_in / photo_h_in, focus).resize((px_w, ph), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(1.6))  # slide text in the photo must not compete with the number
    im = Image.blend(im, Image.new('RGB', im.size, NAVY), shade)
    # extra navy on the left, where the gold module number and the title sit
    left = Image.new('L', im.size, 0)
    dl = ImageDraw.Draw(left)
    for x in range(px_w):
        dl.line([(x, 0), (x, ph)], fill=int(150 * max(0.0, 1 - x / (px_w * 0.75))))
    im.paste(Image.new('RGB', im.size, NAVY), (0, 0), left)
    panel = Image.new('RGB', (px_w, px_h), NAVY)
    fade = int(ph * 0.42)  # the lower part of the photo dissolves into the navy
    mask = Image.new('L', (px_w, ph), 255)
    d = ImageDraw.Draw(mask)
    for y in range(ph - fade, ph):
        d.line([(0, y), (px_w, y)], fill=int(255 * (ph - y) / fade))
    panel.paste(im, (0, 0), mask)
    panel.save(OUT / out, quality=88, optimize=True, progressive=True)
    print(f'{out:28s} {px_w}x{px_h}  {(OUT / out).stat().st_size // 1024} KB')


def caption_card(name, out, w_in, h_in, focus=(0.5, 0.5), radius_in=0.15):
    """Rounded photo with a soft navy gradient at the foot, for a caption laid over it."""
    px_w, px_h = int(w_in * DPI), int(h_in * DPI)
    im = cover_crop(load(name), w_in / h_in, focus).resize((px_w, px_h), Image.LANCZOS).convert('RGBA')
    shade = Image.new('RGBA', (px_w, px_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(shade)
    g0 = int(px_h * 0.5)
    for y in range(g0, px_h):
        a = int(238 * ((y - g0) / (px_h - g0)) ** 1.15)
        d.line([(0, y), (px_w, y)], fill=NAVY_DEEP + (a,))
    im = Image.alpha_composite(im, shade)
    mask = Image.new('L', (px_w, px_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, px_w - 1, px_h - 1), int(radius_in * DPI), fill=255)
    canvas = Image.new('RGBA', (px_w, px_h), (0, 0, 0, 0))
    canvas.paste(im, (0, 0), mask)
    canvas.save(OUT / out, optimize=True)
    print(f'{out:28s} {px_w}x{px_h}  {(OUT / out).stat().st_size // 1024} KB')


if __name__ == '__main__':
    # Sizes here MUST match the boxes in build.js (inches), or images get squashed.
    # Corporate-workshop originals were pulled full-size from Drive (Content Hub rows IFM-NNN)
    # into assets/src/corp/ on 25 Oct 2026.
    C = 'corp/'
    rounded(C + 'IFM-317-IMG_6067.JPG', 'cover-main.png', 5.9, 4.05, focus=(0.5, 0.55))
    rounded(C + 'IFM-393-IMG_4899.jpg', 'cover-inset.png', 2.05, 2.6, focus=(0.42, 0.5), border_in=0.07, dpi=300)
    rounded(C + 'IFM-384-IMG_1595.jpg', 'learn-a.png', 3.0, 4.0, focus=(0.4, 0.5))
    rounded(C + 'IFM-395-IMG_4896.JPG', 'learn-b.png', 2.45, 4.0, focus=(0.55, 0.62))
    rounded(C + 'IFM-073.jpg', 'mission.png', 4.3, 5.55, focus=(0.5, 0.42))  # Media Kit rank 1: Hiral under the IFM title screen
    circle('hiral-goel.jpg', 'hiral-circle.png', focus=(0.5, 0.33), zoom=1.15)
    # Past sessions, as captioned on investingformummies.com (#corporate). The EO Forum photo is
    # not in the Content Hub, so it comes from the website's own copy (480x534).
    for out, src, focus in [
        ('past-stree-dhan.png', C + 'IFM-338-96DF7357-D91E-4565-A718-FABE5259F748.JPG', (0.5, 0.62)),
        ('past-k-phyto.png', C + 'IFM-316-IMG_6177.JPG', (0.5, 0.5)),
        ('past-goa.png', C + 'IFM-253-IMG_7871.jpg', (0.47, 0.5)),
        ('past-eo-forum.png', C + 'EO-forum-website.jpg', (0.5, 0.5)),
    ]:
        caption_card(src, out, 2.88, 3.45, focus)
    # Module panels, in module order (01 Blueprint, 02 Asset Classes, 03 Stock Market,
    # 04 Insurance, 05 Mutual Funds): a topic-matched session photo across the top of each.
    for i, (src, focus) in enumerate([
        (C + 'IFM-609-IMG_3797.jpg', (0.5, 0.4)),     # Power of Compounding (576 is the Mission photo's moment)
        (C + 'IFM-062-IMG_6514.JPG', (0.5, 0.3)),     # the bond-market BORROWER diagram
        (C + 'IFM-392-IMG_4882.jpg', (0.5, 0.33)),    # "How to Buy/Sell a Share?"
        (C + 'IFM-624-IMG_8049.jpg', (0.5, 0.45)),    # "Types of Insurance"
        (C + 'IFM-130-IMG_6694.JPG', (0.5, 0.35)),    # teaching NAV
    ], start=1):
        header_panel(src, f'panel-m{i}.jpg', 4.2, 7.5, 3.45, focus)
    logo('IFM-logo-wide-1668px-transparent-white-knockout.png', 'logo-white.png')
    logo('IFM-logo-wide-1668px-transparent-colour.png', 'logo-colour.png')
    logo('IFM-logo-round-560px-transparent-no-TM.png', 'logo-round.png', max_w=400)
