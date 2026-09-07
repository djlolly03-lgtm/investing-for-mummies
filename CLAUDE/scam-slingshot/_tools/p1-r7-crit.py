#!/usr/bin/env python3
"""P1 r7 critic pixel pass. Every number here comes from rendered pixels, not from the game."""
import json, sys, math
from PIL import Image
import numpy as np

OUT = sys.argv[1]
M = OUT + '/masks/'
meta = json.load(open(OUT + '/p1r7.json'))
view = meta['view']

def load(n):
    im = Image.open(M + n + '.png').convert('RGB')
    return np.asarray(im).astype(np.int16), im

def diffmask(a, b, thr=10):
    d = np.abs(a - b).sum(axis=2)
    return d > thr

def lum(rgb):
    return (0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2]) / 255.0

def bbox(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0: return None
    return xs.min(), ys.min(), xs.max(), ys.max()

res = {}
for tag in ('rest', 'full'):
    full, imf = load(tag + '-full')
    noammo, _ = load(tag + '-noammo')
    nobands, _ = load(tag + '-nobands')
    nbna, _ = load(tag + '-nobands-noammo')
    nosling, _ = load(tag + '-nosling-noammo')
    H, W = full.shape[:2]
    scale = W / view['w']          # device px per CSS px

    sling_mask = diffmask(noammo, nosling)          # fork + bands, no ammo
    band_mask  = diffmask(noammo, nbna)             # bands only
    fork_mask  = diffmask(nbna, nosling)            # fork/prongs/base only
    vis_ammo   = diffmask(full, noammo)             # ammo pixels actually visible
    all_ammo   = diffmask(nobands, nbna)            # ammo silhouette with bands removed

    bb = bbox(sling_mask)
    r = {
        'imgW': W, 'imgH': H,
        'sling_px': int(sling_mask.sum()),
        'sling_bbox_pctW': None, 'sling_centre_pctW': None,
        'band_px': int(band_mask.sum()),
        'fork_px': int(fork_mask.sum()),
        'ammo_visible_px': int(vis_ammo.sum()),
        'ammo_total_px': int(all_ammo.sum()),
    }
    if bb:
        x0, y0, x1, y1 = bb
        r['sling_bbox_pctW'] = round(100*(x1-x0+1)/W, 2)
        r['sling_bbox_pctH'] = round(100*(y1-y0+1)/H, 2)
        r['sling_centre_pctW'] = round(100*((x0+x1)/2)/W, 2)
        r['sling_left_pctW'] = round(100*x0/W, 2)
        r['sling_right_pctW'] = round(100*x1/W, 2)
    if r['ammo_total_px']:
        r['occlusion_pct'] = round(100*(1 - r['ammo_visible_px']/r['ammo_total_px']), 2)

    # median colours
    def med(mask, img):
        px = img[mask]
        if len(px) == 0: return None
        return [int(np.median(px[:, i])) for i in range(3)]
    bc = med(band_mask, full); fc = med(fork_mask, full)
    r['band_rgb'] = bc; r['fork_rgb'] = fc
    if bc and fc:
        r['band_lum'] = round(lum(bc), 3); r['fork_lum'] = round(lum(fc), 3)
        r['value_steps'] = round(abs(lum(bc)-lum(fc))*10, 2)
        import colorsys
        hb = colorsys.rgb_to_hsv(*[c/255 for c in bc])[0]*360
        hf = colorsys.rgb_to_hsv(*[c/255 for c in fc])[0]*360
        dh = abs(hb-hf); dh = min(dh, 360-dh)
        r['band_hue'] = round(hb,1); r['fork_hue'] = round(hf,1); r['hue_delta'] = round(dh,1)

    # --- strap width along the front band, measured perpendicular to prong->pouch ---
    px = meta[tag + 'Px']            # [tipR, tipL, pouch, anchor, ctrl0, ctrl3, anchor, anchor+1u]
    c0 = np.array([px[4]['x'], px[4]['y']]) * scale
    c3 = np.array([px[5]['x'], px[5]['y']]) * scale
    a0 = np.array([px[6]['x'], px[6]['y']]) * scale
    a1 = np.array([px[7]['x'], px[7]['y']]) * scale
    pxPerWorld = float(np.linalg.norm(a1 - a0))
    axis = c3 - c0; L = float(np.linalg.norm(axis))
    u = axis / (L if L else 1); n = np.array([-u[1], u[0]])

    def width_at(t):
        p = c0 + axis*t
        runs = []
        # walk out both ways from the axis point, find the contiguous band run through p
        vals = []
        for k in range(-60, 61):
            q = p + n*k
            xi, yi = int(round(q[0])), int(round(q[1]))
            vals.append(band_mask[yi, xi] if (0 <= yi < H and 0 <= xi < W) else False)
        # longest contiguous run containing centre-ish
        best = 0; cur = 0
        for v in vals:
            cur = cur + 1 if v else 0
            best = max(best, cur)
        return best

    ws_pouch = [width_at(t) for t in np.arange(0.72, 0.96, 0.02)]
    ws_mid   = [width_at(t) for t in np.arange(0.35, 0.60, 0.02)]
    ws_prong = [width_at(t) for t in np.arange(0.05, 0.25, 0.02)]
    r['strapWidthPx_pouch'] = round(float(np.median(ws_pouch)), 2)
    r['strapWidthPx_mid']   = round(float(np.median(ws_mid)), 2)
    r['strapWidthPx_prong'] = round(float(np.median(ws_prong)), 2)
    r['pxPerWorld'] = round(pxPerWorld, 2)
    r['strapWidthWorld_pouch'] = round(float(np.median(ws_pouch))/pxPerWorld, 4)
    r['strapWidthWorld_mid']   = round(float(np.median(ws_mid))/pxPerWorld, 4)
    r['chordPx'] = round(L, 2)
    r['chordWorld'] = round(L/pxPerWorld, 4)
    res[tag] = r

# --- 40px test on the aim frame -------------------------------------------------
def forty(tagname, srcname):
    full, imf = load(srcname)
    noammo, _ = load(tagname + '-noammo'); nbna, _ = load(tagname + '-nobands-noammo')
    band_mask = diffmask(noammo, nbna); fork_mask = diffmask(nbna, load(tagname+'-nosling-noammo')[0])
    H, W = full.shape[:2]
    h40 = 40; w40 = int(round(W*h40/H))
    small = np.asarray(Image.open(M+srcname+'.png').convert('RGB').resize((w40, h40), Image.LANCZOS)).astype(np.int16)
    bm = np.asarray(Image.fromarray((band_mask*255).astype(np.uint8)).resize((w40,h40), Image.LANCZOS)).astype(float)/255
    fm = np.asarray(Image.fromarray((fork_mask*255).astype(np.uint8)).resize((w40,h40), Image.LANCZOS)).astype(float)/255
    bsel = bm > 0.45; fsel = fm > 0.45
    o = {'band_px_at40': int(bsel.sum()), 'fork_px_at40': int(fsel.sum())}
    if bsel.sum():
        bc = [float(np.median(small[bsel][:, i])) for i in range(3)]
        o['band_rgb40'] = [round(v) for v in bc]; o['band_lum40'] = round(lum(bc), 3)
    if fsel.sum():
        fc = [float(np.median(small[fsel][:, i])) for i in range(3)]
        o['fork_rgb40'] = [round(v) for v in fc]; o['fork_lum40'] = round(lum(fc), 3)
    if bsel.sum() and fsel.sum():
        o['value_steps40'] = round(abs(o['band_lum40']-o['fork_lum40'])*10, 2)
    return o

res['forty_rest'] = forty('rest', 'rest-full')
res['forty_full'] = forty('full', 'full-full')

print(json.dumps(res, indent=2))
json.dump(res, open(OUT + '/p1r7-pixels.json', 'w'), indent=2)
