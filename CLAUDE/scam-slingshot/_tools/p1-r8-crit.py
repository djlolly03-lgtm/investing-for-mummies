#!/usr/bin/env python3
"""P1 round-8 critic pixel pass. Every number the verdict quotes comes from here.

Populations are isolated by DIFFERENCING visibility-toggle renders against a background plate,
so no colour constant is ever guessed:
    BAND  = (sling, bands on, no ammo)  -  (sling, bands off, no ammo)
    FORK  = (sling, bands off, no ammo) -  (background plate)
    AMMO  = (bands off, ammo on)        -  (bands off, no ammo)      <- full silhouette
    AMMOv = (bands on,  ammo on)        -  (bands on,  no ammo)      <- what survives occlusion
"""
import json, sys, math
import numpy as np
from PIL import Image

OUT = sys.argv[1]
M = OUT + '/masks'
J = json.load(open(OUT + '/p1r8.json'))
R = {}


def load(n):
    return np.asarray(Image.open(f'{M}/{n}.png').convert('RGB')).astype(np.int16)


def diff(a, b, thr=8):
    return (np.abs(a - b).max(axis=2) > thr)


def lum(px):                        # px: N x 3
    return (0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2])


def hue_sat(px):
    p = px.astype(np.float64) / 255.0
    mx = p.max(axis=1); mn = p.min(axis=1); c = mx - mn
    h = np.zeros(len(p))
    r, g, b = p[:, 0], p[:, 1], p[:, 2]
    nz = c > 1e-6
    idx = (mx == r) & nz; h[idx] = ((g - b)[idx] / c[idx]) % 6
    idx = (mx == g) & nz; h[idx] = ((b - r)[idx] / c[idx]) + 2
    idx = (mx == b) & nz; h[idx] = ((r - g)[idx] / c[idx]) + 4
    h *= 60
    s = np.where(mx > 1e-6, c / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def thickness_map(mask):
    """8-connected erosion depth -> local half-thickness in px (chebyshev distance to bg)."""
    d = np.zeros(mask.shape, dtype=np.int32)
    cur = mask.copy()
    it = 0
    while cur.any() and it < 200:
        it += 1
        d[cur] = it
        p = np.pad(cur, 1, constant_values=False)
        er = (p[:-2, :-2] & p[:-2, 1:-1] & p[:-2, 2:] &
              p[1:-1, :-2] & p[1:-1, 1:-1] & p[1:-1, 2:] &
              p[2:, :-2] & p[2:, 1:-1] & p[2:, 2:])
        cur = er
    return d


DPR = 2  # capture.mjs uses deviceScaleFactor 2; masks are in device px, geometry in CSS px

# ---------------------------------------------------------------- populations, per pose
poses = {}
for tag in ('rest', 'half', 'full'):
    full = load(f'{tag}-full')
    noammo = load(f'{tag}-noammo')
    nob = load(f'{tag}-nobands')
    nobna = load(f'{tag}-nobands-noammo')
    plate = load(f'{tag}-plate')
    band = diff(noammo, nobna)
    fork = diff(nobna, plate)
    ammoF = diff(nob, nobna)
    ammoV = diff(full, noammo)
    sling = diff(full, plate)
    poses[tag] = dict(band=band, fork=fork, ammoF=ammoF, ammoV=ammoV, sling=sling,
                      full=full, plate=plate)

H, W = poses['rest']['band'].shape
R['image'] = {'w': W, 'h': H, 'dpr': DPR}

# ---------------------------------------------------------------- 1. COMPOSITION (rest)
sl = poses['rest']['sling']
ys, xs = np.nonzero(sl)
bb = dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()))
R['composition'] = {
    'sling_bbox_px': bb,
    'sling_width_pctW': round(100 * (bb['x1'] - bb['x0'] + 1) / W, 2),
    'sling_height_pctH': round(100 * (bb['y1'] - bb['y0'] + 1) / H, 2),
    'sling_centre_pctW': round(100 * (bb['x0'] + bb['x1']) / 2 / W, 2),
    'clear_to_right_pctW': round(100 * (W - bb['x1']) / W, 2),
    'sling_px': int(sl.sum()),
}

# ---------------------------------------------------------------- 2. BAND vs FORK colour
for tag in ('rest', 'full'):
    p = poses[tag]
    img = p['full']
    bpx = img[p['band']]
    fpx = img[p['fork'] & ~p['band']]
    bl, fl = lum(bpx), lum(fpx)
    bh, bs, _ = hue_sat(bpx)
    fh, fs, _ = hue_sat(fpx)
    # circular median hue
    def cmed(h):
        a = np.deg2rad(h)
        return round(float((math.degrees(math.atan2(np.sin(a).mean(), np.cos(a).mean())) + 360) % 360), 1)
    R.setdefault('band_vs_fork', {})[tag] = {
        'band_px': int(p['band'].sum()), 'fork_px': int(fpx.shape[0]),
        'band_lum_median': round(float(np.median(bl)), 1),
        'fork_lum_median': round(float(np.median(fl)), 1),
        'value_steps_apart': round(abs(float(np.median(bl)) - float(np.median(fl))) / 25.5, 2),
        'band_hue_median': cmed(bh), 'fork_hue_median': cmed(fh),
        'band_sat_median': round(float(np.median(bs)), 3),
        'fork_sat_median': round(float(np.median(fs)), 3),
        'band_rgb_median': [int(np.median(bpx[:, i])) for i in range(3)],
        'fork_rgb_median': [int(np.median(fpx[:, i])) for i in range(3)],
    }

# ---------------------------------------------------------------- 3. AMMO OCCLUSION (rest)
for tag in ('rest', 'full'):
    p = poses[tag]
    aF, aV = int(p['ammoF'].sum()), int(p['ammoV'].sum())
    ys, xs = np.nonzero(p['ammoF'])
    R.setdefault('occlusion', {})[tag] = {
        'ammo_full_px': aF, 'ammo_visible_px': aV,
        'occluded_frac': round(1 - aV / max(aF, 1), 4),
        'ammo_bbox_h_px': int(ys.max() - ys.min() + 1),
        'ammo_bbox_w_px': int(xs.max() - xs.min() + 1),
    }

AD_PX = R['occlusion']['rest']['ammo_bbox_h_px']          # rubric definition: rest, in-pouch
R['AD_px_rest'] = AD_PX

# px per world unit, from the projected anchor / anchor+1 pair (CSS px -> device px)
def pxperworld(key):
    a, b = J[key][3], J[key][4]
    return math.hypot(b['x'] - a['x'], b['y'] - a['y']) * DPR
R['px_per_world'] = {k: round(pxperworld(k + 'Px'), 2) for k in ('rest', 'half', 'full')}
R['AD_world_from_pixels'] = round(AD_PX / pxperworld('restPx'), 4)

# ---------------------------------------------------------------- 4. BAND DEFORMATION
def strap_profile(tag):
    """Local band thickness sampled along the fork-tip -> pouch line, from pixels."""
    p = poses[tag]
    th = thickness_map(p['band'])
    g = J[tag + 'Px']
    tipL, tipR, pouch = g[0], g[1], g[2]
    res = {}
    for name, tip in (('front(tipR)', tipR), ('back(tipL)', tipL)):
        pts = []
        for u in (0.05, 0.10, 0.15, 0.25, 0.5, 0.75, 0.9):
            x = (pouch['x'] + (tip['x'] - pouch['x']) * u) * DPR
            y = (pouch['y'] + (tip['y'] - pouch['y']) * u) * DPR
            xi, yi = int(round(x)), int(round(y))
            r = 6
            sub = th[max(0, yi - r):yi + r + 1, max(0, xi - r):xi + r + 1]
            pts.append(round(float(sub.max()) * 2, 1) if sub.size else 0.0)
        res[name] = pts
    ys, xs = np.nonzero(p['band'])
    res['band_px'] = int(p['band'].sum())
    res['band_bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    res['thickness_p95_px'] = round(float(np.percentile(th[p['band']], 95) * 2), 1)
    res['thickness_max_px'] = round(float(th.max() * 2), 1)
    return res

R['strap'] = {t: strap_profile(t) for t in ('rest', 'half', 'full')}

# strap length in world units, straight tip->pouch (both from the game's own geometry)
for t in ('rest', 'half', 'full'):
    g = J[t]
    R['strap'][t]['len_world_front'] = round(math.hypot(g['tipR']['x'] - g['pouch']['x'],
                                                        g['tipR']['y'] - g['pouch']['y']), 4)
    R['strap'][t]['len_world_back'] = round(math.hypot(g['tipL']['x'] - g['pouch']['x'],
                                                       g['tipL']['y'] - g['pouch']['y']), 4)
    R['strap'][t]['forkSpanX'] = round(g['tipR']['x'] - g['tipL']['x'], 4)

# silhouette difference rest vs full, ammo masked (the "tellable apart" test)
a = load('rest-noammo'); b = load('full-noammo')
R['rest_vs_full_silhouette'] = {
    'iou_band': round(float((poses['rest']['band'] & poses['full']['band']).sum()) /
                      max(1, float((poses['rest']['band'] | poses['full']['band']).sum())), 4),
    'band_px_rest': int(poses['rest']['band'].sum()),
    'band_px_full': int(poses['full']['band'].sum()),
}

# ---------------------------------------------------------------- 5. RELEASE TRACE
tr = J['trace']
adw = R['AD_world_from_pixels']
rows = []
for r in tr:
    rows.append(dict(t=r['t'], distAD=round(r['dist'] / adw, 2), recoil=r['recoilOff'],
                     fxn=r['fx']['n'], fx_dPouchAD=round(r['fx']['dPouch'] / adw, 2),
                     fx_dAmmoAD=round(r['fx']['dAmmo'] / adw, 2),
                     fx_spreadAD=round(r['fx']['spread'] / adw, 2),
                     camY0=r['camY0'], state=r['state'], pools=r['fx']['byPool']))
R['trace_key'] = [x for x in rows if x['t'] in (0, 8.33, 25, 50.0, 58.33, 83.33, 100, 150.0, 200, 250, 300, 400, 500, 600, 700, 800)
                  or abs(x['t'] - 50) < 4.2 or abs(x['t'] - 80) < 4.2 or abs(x['t'] - 100) < 4.2
                  or abs(x['t'] - 250) < 4.2 or abs(x['t'] - 400) < 4.2]

# recoil: sign changes of the pouch offset along the launch dir
off = np.array([r['recoilOff'] for r in tr])
t = np.array([r['t'] for r in tr])
sgn = np.sign(off)
cross = [(round(float(t[i]), 1), float(off[i - 1]), float(off[i]))
         for i in range(1, len(off)) if sgn[i] != 0 and sgn[i - 1] != 0 and sgn[i] != sgn[i - 1]]
# local extrema of the offset (overshoots)
ext = []
for i in range(1, len(off) - 1):
    if (off[i] - off[i - 1]) * (off[i + 1] - off[i]) < 0:
        ext.append((round(float(t[i]), 1), round(float(off[i]), 4)))
R['recoil'] = {'zero_crossings': cross, 'extrema': ext,
               'off_at_0': float(off[0]),
               'max_abs_after_100ms': round(float(np.abs(off[t > 100]).max()), 5),
               'max_abs_after_400ms': round(float(np.abs(off[t > 400]).max()), 5),
               'still_by_ms': next((round(float(t[i]), 1) for i in range(len(off))
                                    if np.abs(off[i:]).max() < 0.005), None)}

# camera kick: screen y of the fixed world point (0,0)
cy = np.array([r['camY0'] for r in tr])
R['camera_kick'] = {'y0': round(float(cy[0]), 2),
                    'max_dev_px': round(float(np.abs(cy - cy[0]).max()), 2),
                    'max_dev_pctH': round(100 * float(np.abs(cy - cy[0]).max()) / (H / DPR), 3),
                    'peak_t': round(float(t[int(np.argmax(np.abs(cy - cy[0])))]), 1),
                    'dev_at_250_pctH': round(100 * float(np.abs(cy[t >= 250][0] - cy[0])) / (H / DPR), 3),
                    'moving_after_250': round(float(np.abs(np.diff(cy[t >= 250])).max()), 4)}

print(json.dumps(R, indent=1))
json.dump(R, open(OUT + '/p1r8-pixels.json', 'w'), indent=1)
