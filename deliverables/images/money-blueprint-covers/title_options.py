#!/usr/bin/python3
"""Typeface options for the cover title (22 Nov 2026; user: "the typeface of money blueprint is not working").
Paints out ChatGPT's "THE MONEY" + gold "BLUEPRINT" ribbon by interpolating the clean background around it, then sets
the title again in a real font: "THE MONEY" in IFM navy, "BLUEPRINT" in navy on a drawn gold ribbon. The layout stays
the same so the options compare the typeface alone. Usage: title_options.py [option] [cover]
  no args -> option previews in ./title-options/ ; with args -> that option applied to that cover (returns the image)"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
NAVY, GOLD_T, GOLD_B, GOLD_EDGE = (26, 58, 92), (250, 214, 110), (222, 160, 46), (190, 128, 30)
SUP, FONTS = '/System/Library/Fonts/Supplemental/', os.path.expanduser('~/Library/Fonts/')
def lora():
    f = lambda s: ImageFont.truetype(FONTS + 'Lora.ttf', s); return f
OPTIONS = {   # name: (font loader, letter-spacing as a fraction of size, note)
    '1 Lora Bold (IFM brand serif)':   (lambda s: (lambda f: (f.set_variation_by_name('Bold'), f)[1])(ImageFont.truetype(FONTS + 'Lora.ttf', s)), 0.02),
    '2 Nunito Bold (IFM brand sans)':  (lambda s: ImageFont.truetype(FONTS + 'fixed-Nunito-Bold.ttf', s), 0.03),
    '3 Avenir Next Heavy (modern)':    (lambda s: ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc', s, index=8), 0.04),
    '4 Didot Bold (editorial)':        (lambda s: ImageFont.truetype(SUP + 'Didot.ttc', s, index=2), 0.03),
}
# per cover: the title box to repaint (x0, y0, x1, y1), the ribbon box, and the centre x of the layout
COVERS = {'Money Blueprint cover - v1 premium 3D.png':     {'box': (205, 78, 868, 256), 'ribbon': (250, 180, 832, 250), 'cx': 540},
          'Money Blueprint cover - v2 warm editorial.png': {'box': (283, 68, 882, 247), 'ribbon': (288, 165, 866, 243), 'cx': 577}}

def clean_plate(im, box):
    """paint out only the old title's pixels — navy letters, their soft shadow and the gold ribbon — with OpenCV
    inpainting from the wall around them, so no box edge or seam is left (a whole-box fill left a visible rectangle)"""
    import cv2
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR); x0, y0, x1, y1 = box
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(np.float32); h, sat, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    bg = cv2.medianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), 31).astype(np.float32) / 255     # the wall's local brightness
    gray = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    m = (val < 0.55) | ((h > 25) & (h < 60) & (sat > 0.35)) | (gray < np.minimum(bg, 0.97) - 0.05)
    mask = np.zeros(a.shape[:2], np.uint8); mask[y0 - 6:y1 + 4, x0 - 4:x1 + 4] = m[y0 - 6:y1 + 4, x0 - 4:x1 + 4]
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=3)
    out = cv2.inpaint(a, mask, 9, cv2.INPAINT_TELEA)
    out = cv2.GaussianBlur(out, (0, 0), 2.2) * (mask[..., None] > 0) + out * (mask[..., None] == 0)   # smooth the repaint
    out = out.astype(np.float32) + np.random.default_rng(7).normal(0, 1.4, out.shape) * (mask[..., None] > 0)
    return Image.fromarray(cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))

def text_size(d, s, f, sp):
    w = sum(d.textlength(ch, font=f) for ch in s) + sp * (len(s) - 1); bb = f.getbbox(s); return w, bb[3] - bb[1], bb[1]
def draw_spaced(d, xy, s, f, sp, fill):
    x, y = xy
    for ch in s: d.text((x, y), ch, font=f, fill=fill); x += d.textlength(ch, font=f) + sp

def apply(opt, cover):
    """v2 layout (user: the banner should run across MONEY BLUEPRINT, not under BLUEPRINT alone): a small spaced "THE"
    on top, then one wide gold banner carrying "MONEY BLUEPRINT" on a single line"""
    load, track = OPTIONS[opt]; c = COVERS[cover]
    im = clean_plate(Image.open(os.path.join(HERE, cover)).convert('RGB'), c['box'])
    S = 3; big = im.resize((im.width * S, im.height * S), Image.LANCZOS); d = ImageDraw.Draw(big)
    x0, y0, x1, y1 = [v * S for v in c['box']]; cx = c['cx'] * S
    bw = int(im.width * S * 0.84); bh = int((y1 - y0) * 0.62)          # wide banner: runs in front of the props at the sides
    rx0, rx1 = int(cx - bw / 2), int(cx + bw / 2); ry1 = y1 - 4 * S; ry0 = ry1 - bh
    # banner: gold gradient with a sheen, swallow-tail ends, soft drop shadow, a darker lower edge
    W, H = rx1 - rx0, ry1 - ry0; g = np.linspace(0, 1, H)[:, None, None]
    grad = np.array(GOLD_T) * (1 - g) + np.array(GOLD_B) * g + 18 * np.exp(-((g - 0.28) / 0.12) ** 2)
    rib = Image.fromarray(np.clip(np.repeat(grad, W, 1), 0, 255).astype(np.uint8))
    m = Image.new('L', (W, H), 0); n = H * 0.30
    ImageDraw.Draw(m).polygon([(0, 0), (W, 0), (W - n, H / 2), (W, H), (0, H), (n, H / 2)], fill=255)
    sh = Image.new('L', big.size, 0); sh.paste(m, (rx0 + 6, ry0 + 10))
    big.paste((60, 40, 10), (0, 0), sh.filter(ImageFilter.GaussianBlur(12)).point(lambda p: p * 0.45))
    big.paste(rib, (rx0, ry0), m); ImageDraw.Draw(big).line([(rx0 + n, ry1 - 3), (rx1 - n, ry1 - 3)], fill=GOLD_EDGE, width=3)
    # "MONEY BLUEPRINT": as large as the banner allows
    size = 300
    while True:
        f = load(size); sp = track * size; w, h, off = text_size(d, 'MONEY BLUEPRINT', f, sp)
        if w <= (W - 2 * n) * 0.94 and h <= H * 0.62: break
        size -= 3
    draw_spaced(d, (cx - w / 2, ry0 + (H - h) / 2 - off), 'MONEY BLUEPRINT', f, sp, NAVY)
    # "THE": small, widely spaced, centred in the space above the banner
    tsize = int(size * 0.80); f = load(tsize); sp = tsize * 0.30; w, h, off = text_size(d, 'THE', f, sp)
    ty = y0 + ((ry0 - y0) - h) / 2 - off
    draw_spaced(d, (cx - w / 2, ty), 'THE', f, sp, NAVY)
    return big.resize(im.size, Image.LANCZOS)

if __name__ == '__main__':
    if len(sys.argv) > 2:
        apply(sys.argv[1], sys.argv[2]).save(sys.argv[3] if len(sys.argv) > 3 else 'out.png'); sys.exit()
    out = os.path.join(HERE, 'title-options'); os.makedirs(out, exist_ok=True)
    sheet = Image.new('RGB', (4 * 560 + 50, 2 * 420 + 30), 'white'); ds = ImageDraw.Draw(sheet)
    lab = ImageFont.truetype(SUP + '../Helvetica.ttc' if False else '/System/Library/Fonts/Helvetica.ttc', 20)
    for i, opt in enumerate(OPTIONS):
        for j, cov in enumerate(COVERS):
            img = apply(opt, cov); img.save(os.path.join(out, f'{opt.split(" (")[0]} - {"v1" if j == 0 else "v2"}.png'))
            top = img.crop((150, 0, 936, 330)).resize((550, 231), Image.LANCZOS)
            sheet.paste(top, (10 + i * 560, 34 + j * 420))
        ds.text((10 + i * 560, 6), opt, fill='black', font=lab)
    sheet.save(os.path.join(out, 'title options.jpg'), quality=90); print('ok', out)
