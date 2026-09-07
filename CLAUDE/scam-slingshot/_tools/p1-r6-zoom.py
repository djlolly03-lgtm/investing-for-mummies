#!/usr/bin/env python3
"""p1-r6-zoom.py <dir> [box=520] — tracking-box zoom strip: shipped (row 1) / no-FX (row 2)."""
import json, os, sys
from PIL import Image, ImageDraw
D = sys.argv[1]; BOX = int(sys.argv[2]) if len(sys.argv) > 2 else 520
g = json.load(open(os.path.join(D, 'geom.json')))
first = Image.open(os.path.join(D, f"A-t{g['ts'][0]}.png")); W, H = first.size
S = W / g['cssW']
rows = ['A', 'NOFX']
sheet = Image.new('RGB', (BOX*len(g['ts']), BOX*len(rows)), (16,16,16))
for r, pre in enumerate(rows):
    for c, t in enumerate(g['ts']):
        e = g['perT'][str(t)]; cx, cy = e['anchorPx'][0]*S, e['anchorPx'][1]*S
        x0, y0 = int(cx-BOX/2), int(cy-BOX/2)
        im = Image.open(os.path.join(D, f'{pre}-t{t}.png')).convert('RGB').crop((x0,y0,x0+BOX,y0+BOX))
        d = ImageDraw.Draw(im); d.text((6,6), f'{pre} t={t}ms', fill=(255,40,40))
        sheet.paste(im, (c*BOX, r*BOX))
out = os.path.join(D, f'zz-ZOOM-{BOX}.png'); sheet.save(out); print(out, sheet.size)
