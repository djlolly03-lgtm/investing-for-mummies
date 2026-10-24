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


def rounded(name, out, w_in, h_in, radius_in=0.16, focus=(0.5, 0.5), border_in=0.0):
    px_w, px_h = int(w_in * DPI), int(h_in * DPI)
    im = cover_crop(load(name), w_in / h_in, focus).resize((px_w, px_h), Image.LANCZOS)
    r = int(radius_in * DPI)
    canvas = Image.new('RGBA', (px_w, px_h), (0, 0, 0, 0))
    if border_in:
        b = int(border_in * DPI)
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
    g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=2).filter(ImageFilter.GaussianBlur(3.5))  # soft enough that no slide text survives
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


if __name__ == '__main__':
    # Sizes here MUST match the boxes in build.js (inches), or images get squashed.
    rounded('boardroom-wide.jpg', 'cover-main.png', 5.9, 4.05, focus=(0.45, 0.55))
    rounded('photo-table.jpg', 'cover-inset.png', 2.05, 2.6, focus=(0.5, 0.45), border_in=0.07)
    rounded('photo-band-workshop.jpg', 'learn-a.png', 3.0, 4.0, focus=(0.5, 0.6))
    rounded('photo-engaged.jpg', 'learn-b.png', 2.45, 4.0, focus=(0.55, 0.62))
    rounded('group-certificates.jpg', 'mission.png', 4.3, 5.55, focus=(0.5, 0.5))
    circle('hiral-goel.jpg', 'hiral-circle.png', focus=(0.5, 0.33), zoom=1.15)
    for i, (src, focus) in enumerate([
        ('wc-inflation-slide.jpg', (0.5, 0.5)),
        ('photo-s2.jpg', (0.5, 0.5)),
        ('photo-teaching.jpg', (0.5, 0.5)),
        ('photo-p1.jpg', (0.5, 0.5)),
        ('founder-desk.jpg', (0.5, 0.45)),
    ], start=1):
        duotone(src, f'panel-m{i}.jpg', 4.2, 7.5, focus)
    logo('IFM-logo-wide-1668px-transparent-white-knockout.png', 'logo-white.png')
    logo('IFM-logo-wide-1668px-transparent-colour.png', 'logo-colour.png')
    logo('IFM-logo-round-560px-transparent-no-TM.png', 'logo-round.png', max_w=400)
