#!/usr/bin/env python3
"""Money Blueprint opener v6 (22 Nov 2026) — NO FLOW, nothing redrawn. User's direction: make the approved cover LANDSCAPE first
(from its own icons), then build the film from that, with each item actually ANIMATING (not just appearing).
  cutouts/*.png   the real items cut out of the approved cover (cutouts.py)
  keyframes/02    landscape blank mat + desk (ChatGPT), colour-matched to the cover's mat
  keyframes/03    landscape closed scroll (ChatGPT)
Writes keyframes/landscape final.png — the approved cover re-laid out wide from its own icons — then animates into it:
brand wordmark -> "Module 1 / The Money Blueprint" in brush script over the closed scroll -> the scroll opens ->
MY MONEY BLUEPRINT pops in the middle -> for each topic a gold arrow draws out from the centre, then the item arrives with its own
motion (target wobbles, calendar flips, scale rocks, coins fall into the buckets, chest bursts with sparkles, coin stacks grow,
checklist slides in and ticks down) and STAYS -> the title -> hold on the finished landscape cover. Silent, 1920x1080, 30 fps.
Run: ~/.claude/skills/effects/.venv/bin/python build_v6.py -> ./The Money Blueprint - opener v6.mp4"""
import os, math, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, 'keyframes'); CUT = os.path.join(HERE, 'cutouts')
COVER = '/Users/lollyg/Documents/investing for Mummies/deliverables/images/money-blueprint-covers/Money Blueprint cover - v1 premium 3D.png'
BRAND = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/LOGO testing/Wealth Conversation to IFM Logo.mp4'
OUT = os.path.join(HERE, 'The Money Blueprint - opener v6.mp4'); TMP = os.path.join(HERE, '_main_v6.mp4')
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
W, H, FPS = 1920, 1080, 30
cover = cv2.imread(COVER)
def rd(n): return cv2.resize(cv2.imread(os.path.join(K, n)), (W, H), interpolation=cv2.INTER_LANCZOS4)

def match_mat(blank, ref):
    """grade the blank mat to the approved cover's lighter blue (LAB mean/std match over the mat pixels only)"""
    lab_b = cv2.cvtColor(blank, cv2.COLOR_BGR2LAB).astype(np.float32); lab_r = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    rs = np.concatenate([lab_r[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in [(690, 905, 790, 990), (430, 1005, 640, 1055), (80, 470, 170, 540), (930, 940, 985, 990)]])
    hsv = cv2.cvtColor(blank, cv2.COLOR_BGR2HSV); yy = np.arange(blank.shape[0])[:, None]
    mb = (hsv[..., 0] >= 100) & (hsv[..., 0] <= 130) & (hsv[..., 1] > 130) & (hsv[..., 2] > 90) & (yy > 300) & (yy < 1060)
    mb = cv2.morphologyEx(mb.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool); bs = lab_b[mb]; out = lab_b.copy()
    for c in range(3): out[..., c] = np.where(mb, (lab_b[..., c] - bs[:, c].mean()) * (rs[:, c].std() / max(bs[:, c].std(), 1e-3)) * 0.9 + rs[:, c].mean(), lab_b[..., c])
    g = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    soft = cv2.GaussianBlur(mb.astype(np.float32), (0, 0), 3)[..., None]; return blank.astype(np.float32) * (1 - soft) + g * soft
blank = match_mat(rd('05 titled blank scene.png'), cover)        # v9: ChatGPT's scene with the title block native to it (no pasted title); scroll = rd('03 closed scroll.png').astype(np.float32)

class Item:
    def __init__(self, name, cx, cy, h, pivot=(0.5, 0.5)):
        im = cv2.imread(os.path.join(CUT, name + '.png'), cv2.IMREAD_UNCHANGED).astype(np.float32); self.name = name
        k = h / im.shape[0]; im = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_AREA); self.h, self.w = im.shape[:2]
        a = im[..., 3:4] / 255.0; self.img = np.dstack([im[..., :3] * a, a[..., 0]])        # premultiplied RGBA
        self.cx, self.cy, self.pivot = cx, cy, (pivot[0] * self.w, pivot[1] * self.h)
    def draw(self, frame, dx=0.0, dy=0.0, sx=1.0, sy=1.0, rot=0.0, alpha=1.0, reveal=1.0):
        if alpha <= 0.003: return
        img = self.img
        if reveal < 1.0:                                                                      # reveal from the top down (checklist ticks)
            img = img.copy(); rows = int(self.h * reveal); soft = 24; m = np.ones(self.h, np.float32); m[rows:] = 0
            if rows < self.h: m[max(0, rows - soft):rows] = np.linspace(1, 0, rows - max(0, rows - soft))
            img = img * m[:, None, None]
        th = math.radians(rot); c, s = math.cos(th), math.sin(th); px, py = self.pivot
        A = np.array([[c * sx, -s * sy], [s * sx, c * sy]], np.float32)
        t = np.array([self.cx + dx, self.cy + dy], np.float32) - A @ np.array([px, py], np.float32)
        M = np.hstack([A, t[:, None]]); wr = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        a = wr[..., 3:4] * alpha; frame[...] = frame * (1 - a) + wr[..., :3] * alpha
    def shadow(self, frame, dy_lift=0.0, alpha=0.32, sx=1.0):
        y = self.cy + (self.h - self.pivot[1]) - 6; rx = self.w * 0.38 * sx; ry = 9
        lay = np.zeros((H, W), np.float32); cv2.ellipse(lay, (int(self.cx + (0.5 * self.w - self.pivot[0])), int(y)), (int(rx), ry), 0, 0, 360, 1.0, -1)
        lay = cv2.GaussianBlur(lay, (0, 0), 9) * alpha * (1 - min(dy_lift / 300.0, 1)); frame[...] = frame * (1 - lay[..., None] * 0.9)

# the layout: the cover's own arrangement, re-laid wide around the centre label
CX, CY = 960, 735
ITEMS = {'goals':    Item('goals',      430, 595, 215),
         'time':     Item('time',       905, 540, 220),
         'risk':     Item('risk',      1430, 595, 250, pivot=(0.5, 0.62)),
         'buckets':  Item('buckets',    395, 860, 235),
         'saving':   Item('saving',     760, 945, 185),
         'action':   Item('action',    1450, 1000, 220, pivot=(0.5, 1.0)),
         'checklist':Item('checklist', 1130, 1040, 245, pivot=(0.5, 1.0))}                # action/checklist: cy is the baseline (pivot at the foot)
# the centre label and the title are windows of the cover (soft-edged): they sit on the same blue / pale sky
def window(x0, y0, x1, y1, f, top=False):
    c = cover[y0:y1, x0:x1].astype(np.float32); m = np.zeros(c.shape[:2], np.float32); m[(0 if top else f):-f, f:-f] = 1
    m = cv2.GaussianBlur(cv2.copyMakeBorder(m, 40, 0, 0, 0, cv2.BORDER_REPLICATE if top else cv2.BORDER_CONSTANT, value=0), (0, 0), f / 2.2)[40:] if top else cv2.GaussianBlur(m, (0, 0), f / 2.2)
    return c, m
CENT = window(414, 598, 752, 756, 26); TITLEW = window(212, 0, 872, 308, 28, top=True)            # wide: the feathered edge falls on plain sky, never on the lettering; top edge left whole
def place_win(frame, win, cx, cy, scale, alpha=1.0, dx=0, dy=0, sx=1, sy=1):
    c, m = win; h, w = c.shape[:2]; img = np.dstack([c * m[..., None], m])
    A = np.array([[scale * sx, 0], [0, scale * sy]], np.float32); t = np.array([cx + dx, cy + dy], np.float32) - A @ np.array([w / 2, h / 2], np.float32)
    wr = cv2.warpAffine(img, np.hstack([A, t[:, None]]), (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a = wr[..., 3:4] * alpha; frame[...] = frame * (1 - a) + wr[..., :3] * alpha
CENT_S, TITLE_S = 1.42, 1.00; TCY = 160

def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def ease_in(x): x = min(max(x, 0.0), 1.0); return x * x
def back(x, s=1.7): x = min(max(x, 0.0), 1.0); x -= 1; return x * x * ((s + 1) * x + s) + 1

# ---- the animated arrows: gold dotted curve from the centre label out to each item, drawn progressively with an arrowhead
GOLD, GOLD_L = (60, 175, 240), (170, 225, 255)                                            # BGR
def arrow_pts(a, b, bend):
    a, b = np.array(a, np.float32), np.array(b, np.float32); mid = (a + b) / 2; n = np.array([-(b - a)[1], (b - a)[0]], np.float32); n /= (np.linalg.norm(n) + 1e-6)
    c = mid + n * bend; t = np.linspace(0, 1, 90)[:, None]; return (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t ** 2 * b
def _arrow(k, bend):
    it = ITEMS[k]; cy_ = it.cy - it.h * (0.0 if it.pivot[1] < it.h else 0.5)                      # item centre (foot-pivoted items sit above their baseline)
    ic = np.array([it.cx, cy_ - (it.h * 0.0 if k not in ('action', 'checklist') else 0)], np.float32); c = np.array([CX, CY], np.float32)
    d = ic - c; d /= (np.linalg.norm(d) + 1e-6)
    a = c + d * np.array([285, 112]) * 1.0; b = ic - d * np.array([it.w * 0.52, it.h * 0.52]); return arrow_pts(a, b, bend)
ARR = {k: _arrow(k, bend) for k, bend in {'goals': 40, 'time': -14, 'risk': -40, 'buckets': 34, 'saving': 30, 'action': -34, 'checklist': 20}.items()}
def draw_arrow(frame, k, prog, t=0.0, alpha=1.0):
    """dotted arrow that draws out from the centre, then keeps a gentle flow: the dots march outward along it and pulse softly"""
    if prog <= 0 or alpha <= 0: return
    pts = ARR[k]; seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]); L = cum[-1]
    reach = L * min(prog, 1.0); lay = np.zeros((H, W), np.float32); gap = 24.0; shift = (t * 34.0) % gap if prog >= 1 else 0.0
    d = shift
    while d < reach - 14:
        i = min(np.searchsorted(cum, d), len(pts) - 1); x, y = pts[i]; fade = 0.6 + 0.4 * math.sin(2 * math.pi * (d / L * 2 - t * 0.9)); r = 4.5 + 1.2 * fade
        cv2.circle(lay, (int(x), int(y)), int(round(r)), float(np.clip(fade, 0.35, 1)), -1, cv2.LINE_AA); d += gap
    if prog >= 0.98:
        p, q = pts[-1], pts[-6]; dd = (p - q) / (np.linalg.norm(p - q) + 1e-6); nrm = np.array([-dd[1], dd[0]]); pulse = 1.0 + 0.10 * math.sin(t * 5.0)
        cv2.fillConvexPoly(lay, np.array([p + dd * 17 * pulse, p - dd * 12 + nrm * 12 * pulse, p - dd * 12 - nrm * 12 * pulse], np.int32), 1.0, cv2.LINE_AA)
    glow = cv2.GaussianBlur(lay, (0, 0), 5) * 0.9; a = np.clip(lay + glow * 0.5, 0, 1)[..., None] * alpha
    col = np.array(GOLD_L, np.float32) * lay[..., None] + np.array(GOLD, np.float32) * (1 - lay[..., None]); frame[...] = frame * (1 - a) + col * a

# ---- particles: falling gold coins and sparkles (all procedural, drawn in the cover's gold)
def coin(frame, x, y, r, a=1.0):
    lay = np.zeros((H, W, 3), np.float32); cv2.circle(lay, (int(x), int(y)), int(r), (40, 150, 225), -1, cv2.LINE_AA); cv2.circle(lay, (int(x), int(y)), int(r), (20, 105, 180), 2, cv2.LINE_AA)
    cv2.circle(lay, (int(x - r * 0.25), int(y - r * 0.25)), max(1, int(r * 0.35)), (140, 220, 255), -1, cv2.LINE_AA)
    m = (lay.sum(-1) > 0)[..., None]; frame[...] = np.where(m, frame * (1 - a) + lay * a, frame)
def sparkle(frame, x, y, r, a):
    lay = np.zeros((H, W), np.float32); pts = np.array([[x, y - r], [x + r * 0.18, y - r * 0.18], [x + r, y], [x + r * 0.18, y + r * 0.18], [x, y + r], [x - r * 0.18, y + r * 0.18], [x - r, y], [x - r * 0.18, y - r * 0.18]], np.int32)
    cv2.fillConvexPoly(lay, pts, 1.0, cv2.LINE_AA); g = cv2.GaussianBlur(lay, (0, 0), 3) * 0.6; m = np.clip(lay + g, 0, 1)[..., None] * a
    frame[...] = frame * (1 - m) + np.array((200, 235, 255), np.float32) * m
def burst(frame, cx, cy, lt, n=12, reach=120, dur=0.7):
    if lt < 0 or lt > dur: return
    for i in range(n):
        ang = 2 * math.pi * i / n + 0.4; d = reach * ease(lt / dur) * (0.6 + 0.4 * ((i * 37) % 10) / 10); sparkle(frame, cx + math.cos(ang) * d, cy + math.sin(ang) * d, 12 * (1 - lt / dur) + 3, 1 - lt / dur)

# ---- per-item motion. Each takes local time lt (s since its arrow began) and returns draw kwargs; items STAY once landed.
FALL0, FALL = 0.45, 0.45                                                                  # arrow draws first (0.45 s), then the item drops for 0.45 s
def drop_kw(lt, rot_fn=None, flip=False, h_drop=300):
    u = lt - FALL0
    if u < 0: return dict(alpha=0.0)
    if u < FALL:
        f = ease_in(u / FALL); kw = dict(dy=-h_drop * (1 - f), alpha=min(1.0, u / 0.12), sy=1.0 + 0.10 * f, sx=1.0 - 0.05 * f)
        if flip: kw['sx'] = max(0.06, abs(math.cos(3.2 * math.pi * u / FALL)))
        return kw
    t2 = u - FALL; env = math.exp(-7 * t2)
    kw = dict(dy=-26 * math.exp(-5.5 * t2) * abs(math.sin(13 * t2)), sy=1 - 0.14 * env * math.cos(17 * t2), sx=1 + 0.09 * env * math.cos(17 * t2))
    if rot_fn: kw['rot'] = rot_fn(t2)
    return kw
def kw_goals(lt): return drop_kw(lt, lambda t2: 8 * math.exp(-3.4 * t2) * math.sin(21 * t2))
def kw_time(lt):  return drop_kw(lt, flip=True)
def kw_risk(lt):  return drop_kw(lt, lambda t2: 7 * math.exp(-1.8 * t2) * math.sin(6.5 * t2))
def kw_plain(lt): return drop_kw(lt)
def kw_action(lt):
    u = lt - FALL0
    if u < 0: return dict(alpha=0.0)
    g = back(u / 0.75, 2.0); return dict(sy=max(0.02, g), sx=0.88 + 0.12 * min(1, u / 0.5), alpha=min(1.0, u / 0.15))
def kw_check(lt):
    u = lt - FALL0
    if u < 0: return dict(alpha=0.0)
    k = ease(u / 0.6); return dict(dx=-620 * (1 - k), rot=-9 * (1 - k), alpha=min(1.0, u / 0.2), reveal=1.0 if u < 0.6 else 0.18 + 0.82 * ease((u - 0.6) / 1.5) + 0.0)
ORDER = [('saving', 4.4, kw_plain), ('buckets', 5.8, kw_plain), ('risk', 7.2, kw_risk), ('goals', 8.6, kw_goals), ('time', 10.0, kw_time),
         ('action', 11.4, kw_action), ('checklist', 12.8, kw_check)]
T_CENTRE, T_TITLE = 3.0, 0.9; TOTAL = 18.5

# the brush-script announcement over the closed scroll (SignPainter), in a clear patch of the scene
SP = '/System/Library/Fonts/Supplemental/SignPainter.ttc'
def script_card(lines, cy):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); hs = [d.textbbox((0, 0), t, font=f)[3] - d.textbbox((0, 0), t, font=f)[1] for t, f in lines]; y = cy - (sum(hs) + 20 * (len(hs) - 1)) / 2
    sh = Image.new('L', (W, H), 0); ds = ImageDraw.Draw(sh); pos = []
    for (t, f), h in zip(lines, hs):
        bb = d.textbbox((0, 0), t, font=f); x = (W - (bb[2] - bb[0])) / 2 - bb[0]; pos.append((t, f, x, y - bb[1])); ds.text((x + 5, y - bb[1] + 9), t, font=f, fill=110); y += h + 20
    im.paste((10, 18, 30, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(10)))
    for t, f, x, yy in pos:
        d.text((x, yy), t, font=f, fill=(18, 37, 68, 255), stroke_width=7, stroke_fill=(255, 255, 255, 255)); d.text((x, yy), t, font=f, fill=(18, 37, 68, 255))
    return np.asarray(im, np.float32)
ANNOUNCE = script_card([('Module 1', ImageFont.truetype(SP, 96, index=1)), ('The Money Blueprint', ImageFont.truetype(SP, 190, index=1))], 250)
def paste_rgba(frame, card, alpha, dy=0):
    if alpha <= 0: return
    c = cv2.warpAffine(card, np.float32([[1, 0, 0], [0, 1, dy]]), (W, H)); a = c[..., 3:4] / 255.0 * alpha; frame[...] = frame * (1 - a) + c[..., 2::-1] * a

def compose(t, final=False):
    # the scroll opens (6.0-7.7): the blank mat is revealed from the middle out over the closed scroll
    if final: t = 999.0
    frame = blank.copy()                                                                     # v7: no rolled scroll — straight onto the open blue mat
    pc = (t - T_CENTRE) / 0.8
    if pc > 0: place_win(frame, CENT, CX, CY, CENT_S * (0.7 + 0.3 * back(pc, 2.0)), alpha=min(1.0, pc * 2.2))
    for name, t0, kwf in ORDER:
        lt = t - t0
        draw_arrow(frame, name, ease(lt / 0.45), t=t) if lt > 0 else None
        if lt < FALL0: continue
        it = ITEMS[name]; kw = kwf(lt); it.shadow(frame, dy_lift=-kw.get('dy', 0.0), alpha=0.32 * min(1.0, kw.get('alpha', 1.0)) * (1.0 if name != 'checklist' else 0.0)); it.draw(frame, **kw)
        u = lt - FALL0 - FALL
        if name == 'saving': burst(frame, it.cx, it.cy - 30, u, 14, 150, 0.8)
        if name == 'buckets' and 0.15 < u < 1.4:                                                   # gold coins fall into the three buckets
            for j, bx in enumerate((-150, 0, 150)):
                for k in range(3):
                    s0 = 0.15 + 0.18 * j + 0.09 * k; ff = (u - s0) / 0.42
                    if 0 < ff < 1: coin(frame, it.cx + bx + (k - 1) * 14, it.cy - 190 + (ff ** 1.6) * 150, 11, a=1 - max(0, ff - 0.8) * 5)
        if name in ('goals', 'risk', 'time'): burst(frame, it.cx, it.cy + it.h * 0.25, u, 8, 95, 0.5)
    # (the title block is part of the ChatGPT base scene now, present from the first frame on the mat)
    return frame

if __name__ == '__main__':
    cv2.imwrite(os.path.join(K, 'landscape final.png'), np.clip(compose(0, final=True), 0, 255).astype(np.uint8))        # the finished landscape cover
    # (compose(final=True) skips the scroll opening state: it uses the mat, so ensure that matches t >> 8)
    proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', TMP], stdin=subprocess.PIPE)
    for i in range(round(TOTAL * FPS)):
        t = i / FPS; frame = compose(t)
        # (v8: the 'Module 1' script is gone — the title block now sits at the top from the first moment on the mat)
        z = 1 + 0.20 * (1 - ease(t / 2.2))                                                                # the camera pulls back onto the mat as the white flash clears
        frame = cv2.warpAffine(frame, cv2.getRotationMatrix2D((W / 2, H * 0.55), 0, z), (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close(); proc.wait()
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-t', '3.4', '-i', BRAND, '-i', TMP, '-filter_complex',
                    f'[0:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[a];[1:v]fps={FPS},setsar=1,format=yuv420p[b];[a][b]xfade=transition=fadewhite:duration=0.9:offset=2.5[v]',
                    '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], check=True)
    print('OK', OUT)
