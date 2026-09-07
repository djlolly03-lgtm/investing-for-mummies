#!/usr/bin/env python3
"""p1-r6-wide.py <dir> — corridor crop (sling + 14 AD downrange) per timestamp, one sheet."""
import json, os, sys
from PIL import Image, ImageDraw
D = sys.argv[1]
g = json.load(open(os.path.join(D, 'geom.json')))
first = Image.open(os.path.join(D, f"A-t{g['ts'][0]}.png")); W, H = first.size
S = W / g['cssW']
CW, CH = 1200, 620
cells = []
for t in g['ts']:
    e = g['perT'][str(t)]; cx, cy = e['anchorPx'][0]*S, e['anchorPx'][1]*S
    x0 = int(max(0, min(W-CW, cx-170))); y0 = int(max(0, min(H-CH, cy-CH*0.68)))
    im = Image.open(os.path.join(D, f'A-t{t}.png')).convert('RGB').crop((x0,y0,x0+CW,y0+CH))
    d = ImageDraw.Draw(im); d.text((8,8), f't={t}ms', fill=(220,20,20))
    d.line([(cx-x0, cy-y0), (cx-x0+e['adPx']*S, cy-y0)], fill=(255,0,255), width=3)
    cells.append(im)
sheet = Image.new('RGB', (CW*3, CH*2), (16,16,16))
for i, im in enumerate(cells[:6]):
    sheet.paste(im, ((i%3)*CW, (i//3)*CH))
sheet = sheet.resize((sheet.width//2, sheet.height//2))
out = os.path.join(D, 'zz-WIDE.png'); sheet.save(out); print(out, sheet.size)
