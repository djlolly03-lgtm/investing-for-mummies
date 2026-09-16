#!/usr/bin/env /usr/bin/python3
"""Build a labelled contact sheet so many assets can be inspected in one look.

  /usr/bin/python3 sheet.py 0 9      # assets 0..8 of the vision-target list
  /usr/bin/python3 sheet.py IFM-251 IFM-252 ...   # explicit ids

Reading 96 thumbnails one at a time is not affordable. Nine per sheet at 380px keeps
faces and slide headlines legible while costing one look instead of nine.
"""
import json, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = '/tmp/ifm-sheet.png'
CELL, COLS, PAD, LABEL = 380, 3, 10, 26


def load():
    s = open(os.path.join(HERE, 'v1-catalogue.js'), encoding='utf-8').read()
    return {r['id']: r for r in json.loads(s[s.index('['):s.rindex(']') + 1])}


def main():
    rows = load()
    args = sys.argv[1:]
    if args and args[0].isdigit():
        ids = json.load(open('/tmp/vision_targets.json'))[int(args[0]):int(args[0]) + int(args[1])]
    else:
        ids = args

    tiles = []
    for i in ids:
        r = rows.get(i)
        if not r or not r['thumb']:
            print('skip', i); continue
        p = os.path.join(HERE, r['thumb'])
        if not os.path.exists(p):
            print('missing thumb', i); continue
        im = Image.open(p).convert('RGB')
        im.thumbnail((CELL, CELL - LABEL), Image.LANCZOS)
        tiles.append((i, im))

    if not tiles:
        print('nothing to draw'); return
    rowsn = (len(tiles) + COLS - 1) // COLS
    W = COLS * (CELL + PAD) + PAD
    H = rowsn * (CELL + PAD) + PAD
    sh = Image.new('RGB', (W, H), (250, 250, 250))
    d = ImageDraw.Draw(sh)
    for n, (i, im) in enumerate(tiles):
        cx = PAD + (n % COLS) * (CELL + PAD)
        cy = PAD + (n // COLS) * (CELL + PAD)
        d.rectangle([cx, cy, cx + CELL, cy + CELL], fill=(255, 255, 255), outline=(200, 210, 210))
        d.text((cx + 6, cy + 6), i, fill=(0, 0, 0))
        sh.paste(im, (cx + (CELL - im.width) // 2, cy + LABEL))
    sh.save(OUT)
    print('%d tiles -> %s' % (len(tiles), OUT))
    print(' '.join(i for i, _ in tiles))


if __name__ == '__main__':
    main()
