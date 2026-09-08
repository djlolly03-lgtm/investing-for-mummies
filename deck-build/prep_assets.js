#!/usr/bin/env node
/* Regenerate the deck's image assets. Run before build_guide.js:  node prep_assets.js
 *
 * WHY THIS EXISTS
 *   Two problems shipped in the 7 Sep deck, both invisible in code review and obvious
 *   on the printed page:
 *
 *   1. The logo was `IFM-logo-round-218px-TM-badge.png` — a white disc with the mark
 *      cropped off-centre inside it and the ™ badge clipped by the circle's edge.
 *   2. Three photos were placed into boxes whose aspect ratio did not match the file's,
 *      so pptxgenjs stretched them: -43%, +69% and +13%. Faces visibly distorted.
 *
 * The fix for both is the same idea: never hand pptxgenjs an image whose aspect ratio
 * differs from the box it goes in. This script pre-renders every image AT the exact
 * ratio of its box, so `addImage` only ever scales uniformly. Boxes are declared here,
 * next to the crops, so the two cannot drift apart again.
 *
 * Uses sharp if present, otherwise shells out to /usr/bin/python3 + Pillow (which this
 * Mac has, and homebrew python does not — see CLAUDE.md "Tooling gotchas").
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'assets');
const LOGOS = path.join(ROOT, 'brand', 'logos');
const FOUNDER = path.join(ROOT, 'brand', 'founder-hiral');

// The logo master. Deliberately the no-TM round mark: the ™ variant is what produced
// the clipped badge, and the mark is 560x616 (NOT square), which is why it must be
// padded onto a square canvas rather than squashed into a square box.
const LOGO_SRC = path.join(LOGOS, 'IFM-logo-round-560px-transparent-no-TM.png');

// Portraits for the Media Kit slide. Only files from the TOP LEVEL of founder-hiral/
// are eligible — per that folder's README, top level is confirmed real photographs and
// `_ai-generated/` holds renders that must never be presented as photography.
// Not used, and why:
//   Hiral-profile-navy.jpg  — filed as a photograph but is plainly an AI composite
//                             (two figures, invented set, garbled "MUMMIE" lettering).
//   Hiral-portrait-lounge / candid-laptop-1,2,3 — four copies of one frame carrying a
//                             geometric artifact on the shoulder.
const PORTRAITS = [
  { src: path.join(FOUNDER, 'Hiral-headshot-studio-navy.jpg'), out: 'kit-portrait-1.jpg' },
  { src: path.join(FOUNDER, 'Hiral-headshot-office-navy.png'), out: 'kit-portrait-2.jpg' },
];

// Box geometry, in inches, exactly as build_guide.js places them.
const PORTRAIT_BOX = { w: 2.15, h: 3.22 };
const TARGET_DPI = 200;                       // 2.15in * 200 = 430px — ample for print

const PY = `
import sys
from PIL import Image, ImageDraw

def square_logo(src, dst, size, plate):
    """Pad the mark onto a TRUE square canvas so a square box never distorts it.

    Keep the size tight. pptxgenjs re-embeds the logo once PER SLIDE rather than sharing
    one part, so 21 slides multiply this file 21 times: a 512px master added 5MB to the
    deck on its own. The largest placement is 1.0in, so 300px is already ~300dpi.
    """
    im = Image.open(src).convert("RGBA")
    inner = int(size * (0.80 if plate else 0.94))   # a plate needs a visible margin
    im.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if plate:
        d = ImageDraw.Draw(canvas)
        d.ellipse([0, 0, size - 1, size - 1], fill=(255, 255, 255, 255))
    # Centre on BOTH axes — the old asset was off-centre, which is what read as wrong.
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    # Quantise to a 128-colour palette with alpha. The mark is flat vector-style art, so
    # this is visually lossless here and cuts the file by roughly 4x.
    q = canvas.quantize(colors=128, method=Image.FASTOCTREE, dither=Image.NONE)
    q.save(dst, optimize=True)
    return canvas.size

def crop_to(src, dst, ar, width, top_bias=0.38):
    """Centre-crop to exactly \`ar\`, biased upward so faces are not cropped at the chin."""
    im = Image.open(src).convert("RGB")
    w, h = im.size
    if w / h > ar:                       # too wide -> trim the sides
        nw, nh = int(round(h * ar)), h
        left, top = (w - nw) // 2, 0
    else:                                # too tall -> trim top/bottom, favouring the top
        nw, nh = w, int(round(w / ar))
        left = 0
        top = int(round((h - nh) * top_bias))
    im = im.crop((left, top, left + nw, top + nh))
    im = im.resize((width, int(round(width / ar))), Image.LANCZOS)
    im.save(dst, "JPEG", quality=88, optimize=True, progressive=True)
    return im.size

op = sys.argv[1]
if op == "logo":
    print(square_logo(sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5] == "1"))
else:
    print(crop_to(sys.argv[2], sys.argv[3], float(sys.argv[4]), int(sys.argv[5])))
`;

function py(...args) {
  return execFileSync('/usr/bin/python3', ['-c', PY, ...args], { encoding: 'utf8' }).trim();
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(LOGO_SRC)) throw new Error('logo master missing: ' + LOGO_SRC);

  // Two logo builds: transparent for the white slides, white-plated for the navy ones
  // (the mark is dark navy and would otherwise vanish into a navy background).
  console.log('logo light  ', py('logo', LOGO_SRC, path.join(OUT, 'ifm-logo-sq-light.png'), '300', '0'));
  console.log('logo plated ', py('logo', LOGO_SRC, path.join(OUT, 'ifm-logo-sq-plate.png'), '300', '1'));

  const ar = PORTRAIT_BOX.w / PORTRAIT_BOX.h;
  const px = Math.round(PORTRAIT_BOX.w * TARGET_DPI);
  for (const p of PORTRAITS) {
    if (!fs.existsSync(p.src)) throw new Error('portrait missing: ' + p.src);
    console.log(p.out.padEnd(20), py('crop', p.src, path.join(OUT, p.out), ar.toFixed(6), String(px)));
  }
  console.log(`\nportrait box ${PORTRAIT_BOX.w}x${PORTRAIT_BOX.h}in  ->  aspect ${ar.toFixed(4)}`);
  console.log('assets written to', OUT);
}

main();
