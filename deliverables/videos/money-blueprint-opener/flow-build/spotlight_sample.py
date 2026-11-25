import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
base = cv2.imread('money-blueprint-final-frame.png'); H, W = base.shape[:2]
F = lambda s, b=True: ImageFont.truetype('/Users/lollyg/Library/Fonts/fixed-Nunito-%s.ttf' % ('Bold' if b else 'Regular'), s)
def make(name, box, tag, q, out):
    x0, y0, x1, y1 = box; m = np.zeros((H, W), np.float32); cv2.rectangle(m, (x0, y0), (x1, y1), 1, -1); m = cv2.GaussianBlur(m, (0, 0), 38)
    m = np.clip(m * 1.6, 0, 1)[..., None]; dim = base.astype(np.float32) * 0.38 + np.float32([30, 12, 6]) * 0.3
    f = dim * (1 - m) + base.astype(np.float32) * m
    # soft glow ring around the item
    g = np.zeros((H, W), np.float32); cv2.rectangle(g, (x0 - 10, y0 - 10), (x1 + 10, y1 + 10), 1, 6); g = cv2.GaussianBlur(g, (0, 0), 14)
    f = f + g[..., None] * np.float32([255, 220, 140]) * 0.5
    img = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)[..., ::-1]).convert('RGBA')
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    cw, ch = 1020, 230; cx, cy = W // 2 - cw // 2, 400
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([cx, cy + 14, cx + cw, cy + ch + 14], 34, fill=(0, 0, 0, 120)); img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(18)))
    d.rounded_rectangle([cx, cy, cx + cw, cy + ch], 34, fill=(14, 48, 128, 255), outline=(150, 235, 255, 255), width=5)
    d.rounded_rectangle([cx + 12, cy + 12, cx + cw - 12, cy + ch - 12], 26, outline=(110, 180, 255, 140), width=2)
    tb = d.textbbox((0, 0), tag, font=F(30)); d.text((W // 2 - (tb[2] - tb[0]) / 2 - tb[0], cy + 28 - tb[1]), tag, font=F(30), fill=(255, 210, 90, 255))
    lines = q; y = cy + 84
    for ln in lines:
        tb = d.textbbox((0, 0), ln, font=F(50)); d.text((W // 2 - (tb[2] - tb[0]) / 2 - tb[0], y - tb[1]), ln, font=F(50), fill=(255, 255, 255, 255)); y += 62
    Image.alpha_composite(img, ov).convert('RGB').save(out)
make('saving', (100, 720, 560, 1000), 'SAVING & INVESTING', ['What is one thing you saved', 'for in the last year?'], 'spotlight-sample-1.png')
make('time', (1120, 700, 1560, 1000), 'TIME HORIZON', ['When do you want your money', 'to start working for you?'], 'spotlight-sample-2.png')
print('ok')
