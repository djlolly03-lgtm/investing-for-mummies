#!/usr/bin/env python3
"""EO Nagpur preview v1 (23 Nov 2026): the generic TWC cut with four changes the user locked.
  1. Opening: the uninstall glitch (0-3.4s) is replaced by the user's EO Nagpur -> TWC logo morph (10s).
  2. REALLY? (final 7.233-8.867s): loud red Anton, +30%, glow, behind her head (raw MVI_0272, cam = t + 0.170).
  3. Games orbit (final 20.0-24.567s): 8 tiles, 15% smaller - Equity + Gold suitors, gold bars, piggy bank,
     KBC and Stock Rush PRO as moving clips, MF Manager, Swayamvar biodata. Stickers games/analogies/discussions kept.
  4. CHALLENGE (final 24.567-26.733s): ChatGPT frosted-gold-glass lettering behind her head (raw MVI_0279, cam = t - 14.757).
Everything else, and all of the audio after the opening, is the generic cut untouched (frame-exact join).
Run with the effects skill venv:  ~/.claude/skills/effects/.venv/bin/python eo_nagpur_v2.py
"""
import os, sys, math, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

FFB = '/opt/homebrew/bin/'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PROJ = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))
DL = os.path.expanduser('~/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads')
SK = os.path.expanduser('~/.claude/skills/effects')
GEN = os.path.join(ROOT, 'TWC Money Blueprint.mp4')
OPEN = os.path.join(DL, 'Logo_morphing_into_text_1d18f12b.mp4')
CHAL = os.path.expanduser('~/Downloads/challenge_gpt2.jpg')
TAKES = os.environ['TAKES']                       # folder holding MVI_0272.MP4 / MVI_0279.MP4 (from Drive 19iiLlv_...)
TMP = os.environ.get('TMP', '/private/tmp/eo_nagpur_v2'); os.makedirs(TMP, exist_ok=True)
OUT = os.environ.get('OUT', os.path.join(ROOT, 'TWC Money Blueprint - EO Nagpur PREVIEW v1.mp4'))
W, H, FPS = 1080, 1920, 30
G = PROJ + '/highlight-reel-assets/games/'
ICON = PROJ + '/CLAUDE/game-icons/'

seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=SK + '/models/selfie_segmenter.tflite'), output_confidence_masks=True))


def frames(src, ss, n, size=None):
    vf = f'fps={FPS}' + (f',scale={size[0]}:{size[1]}:force_original_aspect_ratio=increase,crop={size[0]}:{size[1]}' if size else '')
    w, h = size or (W, H)
    raw = subprocess.run([FFB + 'ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{ss:.4f}', '-i', src, '-frames:v', str(n),
                          '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    assert len(a) == n, (src, len(a), n)
    return a


def grade_fit(final_f, raw_f, rows):
    """Per-channel linear fit final = a*raw + b on rows free of graphics."""
    x = raw_f[:, rows].reshape(-1, 3).astype(np.float32); y = final_f[:, rows].reshape(-1, 3).astype(np.float32)
    # moment matching (least squares is diluted by sub-pixel motion between the two copies)
    ab = []
    for c in range(3):
        a = y[:, c].std() / max(1e-3, x[:, c].std()); ab.append((a, y[:, c].mean() - a * x[:, c].mean()))
    print('grade', [tuple(round(v, 3) for v in p) for p in ab])
    return ab


def grade(f, ab):
    out = np.empty(f.shape, np.float32)
    for c in range(3): out[..., c] = f[..., c] * ab[c][0] + ab[c][1]
    return np.clip(out, 0, 255)


class Matte:
    def __init__(self): self.prev = None
    def __call__(self, rgb):
        r = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        m = np.squeeze(r.confidence_masks[0].numpy_view()).astype(np.float32)
        m = np.clip((m - 0.35) / 0.3, 0, 1)
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
        if self.prev is not None: m = 0.6 * m + 0.4 * self.prev
        self.prev = m
        return m[..., None]


def over(dst, layer):                       # dst float HxWx3, layer RGBA PIL
    a = np.asarray(layer).astype(np.float32)
    al = a[..., 3:4] / 255
    return dst * (1 - al) + a[..., :3] * al


def ease_back(p):
    p = min(max(p, 0), 1); s = 1.70158
    return 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2


def ease_out(p): p = min(max(p, 0), 1); return 1 - (1 - p) ** 3


def clamp(v): return min(max(v, 0.0), 1.0)


def dim_desat(f, k, dim, sat):
    if k <= 0: return f
    g = f.mean(-1, keepdims=True)
    f2 = (g + (f - g) * (1 - (1 - sat) * k)) * (1 - dim * k)
    return f2


def write(name, arrs):
    p = f'{TMP}/{name}.mp4'
    pr = subprocess.Popen([FFB + 'ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', p],
                          stdin=subprocess.PIPE)
    for a in arrs: pr.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    pr.stdin.close(); assert pr.wait() == 0
    return p


# ---------------- REALLY? ----------------
def really_layer():
    f = ImageFont.truetype(SK + '/fonts/Anton-Regular.ttf', int(280 / 0.74))
    text = 'REALLY?'; l, t, r, b = f.getbbox(text)
    lay = Image.new('RGBA', (r - l + 40, b - t + 40), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((20 - l, 20 - t), text, font=f, fill=(255, 31, 45, 255))
    lay = lay.crop(lay.getbbox())
    if lay.width > W * 1.02: lay = lay.resize((int(W * 1.02), lay.height), Image.LANCZOS)
    pad = 60; big = Image.new('RGBA', (lay.width + 2 * pad, lay.height + 2 * pad), (0, 0, 0, 0)); big.paste(lay, (pad, pad), lay)
    glow = big.filter(ImageFilter.GaussianBlur(22))
    out = Image.alpha_composite(Image.alpha_composite(glow, glow), big)
    return out, pad


def render_really():
    f0, f1 = 217, 266; n = f1 - f0
    raw = frames(f'{TAKES}/MVI_0272.MP4', f0 / FPS + 0.170, n)
    fin = frames(GEN, f0 / FPS, n)
    ab = grade_fit(fin, raw, slice(1150, 1900))
    word, pad = really_layer(); mt = Matte(); out = []
    head_top = None
    for i in range(n):
        t = i / FPS; dur = n / FPS
        g = grade(raw[i].astype(np.float32), ab); m = mt(raw[i])
        if head_top is None:
            rows = np.where((m[..., 0] > 0.5).sum(1) > 20)[0]; head_top = int(rows[0]) if len(rows) else 640
        y_end = max(40, head_top - 150) - pad
        k = ease_back(t / 0.42); y = -word.height + (y_end + word.height) * k
        alpha = clamp((dur - 0.03 - t) / 0.2)
        bg = dim_desat(g, ease_out(t / 0.25) * alpha, 0.22, 0.75)
        L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); w2 = word
        if alpha < 1: w2 = word.copy(); w2.putalpha(word.getchannel('A').point(lambda v: int(v * alpha)))
        L.paste(w2, ((W - word.width) // 2, int(y)), w2)
        behind = over(bg, L)
        out.append(behind * (1 - m) + g * m)
    return write('really', out)


# ---------------- orbit + stickers + CHALLENGE ----------------
FD = os.path.expanduser('~/Library/Fonts/')
CREAM = (244, 241, 230, 255); SLATE = (41, 67, 84, 255); GOLD = (252, 197, 54, 255)


def lora(sz):
    f = ImageFont.truetype(FD + 'Lora.ttf', sz); f.set_variation_by_name('Bold'); return f


def sticker(text, font, bg, fg, pad=(26, 14), radius=14):            # same look as captions.py
    d0 = ImageDraw.Draw(Image.new('RGBA', (4, 4))); bb = d0.textbbox((0, 0), text, font=font)
    w = bb[2] - bb[0]; h = bb[3] - bb[1]; sw, sh = w + 2 * pad[0], h + 2 * pad[1]; M = 40
    im = Image.new('RGBA', (sw + 2 * M, sh + 2 * M), (0, 0, 0, 0)); shd = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(shd).rounded_rectangle((M + 4, M + 10, M + sw + 4, M + sh + 10), radius, fill=(0, 0, 0, 120))
    shd = shd.filter(ImageFilter.GaussianBlur(12)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((M, M, M + sw, M + sh), radius, fill=bg); d.text((M + pad[0] - bb[0], M + pad[1] - bb[1]), text, font=font, fill=fg)
    return Image.alpha_composite(shd, im)


def sticker_frame(items, t):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for img, x, y, t_in, ang, t_out in items:
        if t < t_in or t >= t_out + 0.22: continue
        if t >= t_out:
            q = (t - t_out) / 0.22; im = img.rotate(ang, resample=Image.BICUBIC, expand=True)
            im.putalpha(im.getchannel('A').point(lambda v: int(v * (1 - q))))
            c.alpha_composite(im, (int(x + img.width / 2 - im.width / 2), int(y + img.height / 2 - im.height / 2 - 60 * q))); continue
        p = clamp((t - t_in) / 0.28); e = ease_out(p); dy = -260 * (1 - e)
        q = (t - t_in - 0.28) / 0.16
        if 0 < q < 1: dy += 14 * math.sin(math.pi * q)
        im = img.rotate(ang + 7 * (1 - e), resample=Image.BICUBIC, expand=True)
        if p < 1: im.putalpha(im.getchannel('A').point(lambda v, a=min(1.0, p * 5 + 0.15): int(v * a)))
        c.alpha_composite(im, (int(x + img.width / 2 - im.width / 2), int(y + img.height / 2 - im.height / 2 + dy)))
    return c


def card(im, w, h):
    im = im.convert('RGBA')
    s = max(w / im.width, h / im.height); im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
    x = (im.width - w) // 2; y = (im.height - h) // 2; im = im.crop((x, y, x + w, y + h))
    r = int(w * 0.08); b = 5
    mask = Image.new('L', (w, h), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    base = Image.new('RGBA', (w + 2 * b, h + 2 * b), (0, 0, 0, 0))
    ImageDraw.Draw(base).rounded_rectangle((0, 0, w + 2 * b - 1, h + 2 * b - 1), r + b, fill=(255, 255, 255, 235))
    base.paste(im, (b, b), mask)
    M = 30; sh = Image.new('RGBA', (base.width + 2 * M, base.height + 2 * M), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((M + 6, M + 14, M + base.width + 6, M + base.height + 14), r + b, fill=(0, 0, 0, 130))
    sh = sh.filter(ImageFilter.GaussianBlur(14)); sh.alpha_composite(base, (M, M))
    return sh


def icon_tile(p):
    im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, (26, 58, 92, 255)); bg.alpha_composite(im); return bg


def key_green(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alpha = 1 - np.clip((g - np.maximum(r, b) - 20) / 60, 0, 1)
    g2 = np.minimum(g, np.maximum(r, b) + 8)
    im = Image.fromarray(np.dstack([r, g2, b, alpha * 255]).astype(np.uint8), 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def render_hg3():
    f0, f1 = 600, 802; n = f1 - f0
    raw = frames(f'{TAKES}/MVI_0279.MP4', f0 / FPS - 14.757, n)
    fin = frames(GEN, f0 / FPS, n)
    # grade from the CHALLENGE stretch's lower frame (no tiles, no stickers there)
    ab = grade_fit(fin[-40:], raw[-40:], slice(1150, 1900))
    T0 = 20.0 - 0.1333                       # HG3 local 0 in final time
    o_in, o_out = 20.0 + 0.4 - 0.1333, 24.567  # orbit span (final time)
    c_in, c_out = 24.567, 26.717             # CHALLENGE span
    # tiles: 8 cards, 15% smaller than before (0.30 W -> 0.255 W), portrait 4:5
    cw = int(W * 0.255); ch = int(cw * 1.25)
    od = o_out - o_in; nv = int(math.ceil(od * FPS)) + 2
    kbc = frames(G + 'kbc-teaser.mp4', 2.0, nv, (cw, ch)); sr = frames(G + 'stockrush-teaser.mp4', 2.0, nv, (cw, ch))
    stills = {'equity': card(Image.open(G + 'suitor-equity.png'), cw, ch), 'gold': card(Image.open(G + 'suitor-gold.png'), cw, ch),
              'bars': card(icon_tile(ICON + 'gold.png'), cw, ch), 'piggy': card(icon_tile(ICON + 'piggy.png'), cw, ch),
              'mf': card(Image.open(G + 'mf-market.png'), cw, ch),
              'bio': card(Image.open(PROJ + '/highlight-reel-assets/gflow-final/10-swayamvar-biodata-card.jpg'), cw, ch)}
    order = ['equity', 'kbc', 'bars', 'mf', 'gold', 'sr', 'piggy', 'bio']
    f64 = lora(64); to = 4.55 - 0.1333 + T0
    stick = [(sticker('games.', f64, CREAM, SLATE), 40, 110, T0 + 0.78, -2.5, to),
             (sticker('analogies.', f64, GOLD, SLATE), 70, 196, T0 + 1.74, 2.0, to),
             (sticker('discussions.', f64, SLATE, CREAM), 100, 282, T0 + 3.32, -1.5, to)]
    chal = key_green(CHAL); cwid = int(W * 1.02); chal = chal.resize((cwid, int(chal.height * cwid / chal.width)), Image.LANCZOS)
    a = np.asarray(chal)[..., 3].astype(np.float32) * 0.5
    chsh = Image.new('RGBA', chal.size, (0, 0, 0, 0)); chsh.putalpha(Image.fromarray(a.astype(np.uint8)))
    chsh = chsh.filter(ImageFilter.GaussianBlur(16))
    mt = Matte(); out = []; geo = None
    for i in range(n):
        t = f0 / FPS + i / FPS
        g = grade(raw[i].astype(np.float32), ab); m = mt(raw[i])
        if geo is None:
            mm = m[..., 0] > 0.5; rows = np.where(mm.sum(1) > 20)[0]; ht = int(rows[0])
            row = mm[ht + 140]; xs = np.where(row)[0]; fx = (xs[0] + xs[-1]) / 2; fw = xs[-1] - xs[0]
            geo = (fx, ht + fw * 0.55, fw)
        fx, fy, fw = geo
        back = Image.new('RGBA', (W, H), (0, 0, 0, 0)); front = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        bgk = 0.0
        if o_in <= t < o_out:
            lt = t - o_in; intro = ease_out(lt / 0.4); outk = clamp((o_out - t) / 0.25) * clamp(lt / 0.15)
            rx, ry = W * 0.40 * intro, max(fw * 1.5, H * 0.1); oy = fy + fw * 0.9
            vi = min(int(lt * FPS), nv - 1)
            items = []
            for k, name in enumerate(order):
                th = k * 2 * math.pi / len(order) + lt * 0.9
                items.append((math.sin(th), th, name))
            for depth, th, name in sorted(items):
                if name == 'kbc': im = card(Image.fromarray(kbc[vi]), cw, ch)
                elif name == 'sr': im = card(Image.fromarray(sr[vi]), cw, ch)
                else: im = stills[name]
                sc = (0.78 + 0.24 * (depth + 1) / 2) * (0.5 + 0.5 * intro)
                im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.BILINEAR).rotate(-6 * math.cos(th), resample=Image.BICUBIC, expand=True)
                if outk < 1: im.putalpha(im.getchannel('A').point(lambda v, o=outk: int(v * o)))
                cx, cy = fx + rx * math.cos(th), oy + ry * math.sin(th)
                (back if depth < 0 else front).alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
        if c_in <= t < c_out + 0.2:
            lt = t - c_in; k = ease_back(lt / 0.42); al = clamp((c_out - t) / 0.2)
            bgk = ease_out(lt / 0.25) * al
            ymid = 690; y = (ymid - chal.height / 2) - 720 * (1 - k)
            c2 = chal if al >= 1 else chal.copy()
            s2 = chsh if al >= 1 else chsh.copy()
            if al < 1:
                c2.putalpha(chal.getchannel('A').point(lambda v, o=al: int(v * o))); s2.putalpha(chsh.getchannel('A').point(lambda v, o=al: int(v * o)))
            back.alpha_composite(s2, (int((W - cwid) / 2 + 10), int(y + 16))); back.alpha_composite(c2, (int((W - cwid) / 2), int(y)))
        bg = dim_desat(g, bgk, 0.15, 1.0)
        f = over(bg, back) * (1 - m) + g * m
        f = over(f, front)
        f = over(f, sticker_frame(stick, t))
        out.append(f)
    return write('hg3', out)


# ---------------- opening + assembly ----------------
def assemble(really, hg3):
    gen_n = int(subprocess.run([FFB + 'ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries',
                                'stream=nb_read_frames', '-of', 'csv=p=0', GEN], capture_output=True, text=True).stdout.strip().strip(','))
    OPEN_F = 300; CUT = 102
    fc = (f'[1:v]scale={W}:{H}:flags=lanczos,fps={FPS},trim=end_frame={OPEN_F},setpts=N/{FPS}/TB,setsar=1,format=yuv420p[o];'
          f'[0:v]trim=start_frame={CUT}:end_frame=217,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g1];'
          f'[2:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[r];'
          f'[0:v]trim=start_frame=266:end_frame=600,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g2];'
          f'[3:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[h];'
          f'[0:v]trim=start_frame=802:end_frame={gen_n},setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g3];'
          f'[o][g1][r][g2][h][g3]concat=n=6:v=1:a=0[v];'
          # audio: the logo clip's own sound for 10s, then the generic mix from 3.4s on
          f'[1:a]atrim=0:{OPEN_F / FPS},asetpts=N/SR/TB,aresample=48000,afade=t=out:st={OPEN_F / FPS - 0.25}:d=0.25[oa];'
          f'[0:a]atrim=start={CUT / FPS},asetpts=N/SR/TB,afade=t=in:st=0:d=0.08[ga];'
          f'[oa][ga]concat=n=2:v=0:a=1[a]')
    total = OPEN_F + (gen_n - CUT)
    subprocess.run([FFB + 'ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', GEN, '-i', OPEN, '-i', really, '-i', hg3,
                    '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-frames:v', str(total),
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart', OUT], check=True)
    got = int(subprocess.run([FFB + 'ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries',
                              'stream=nb_read_frames', '-of', 'csv=p=0', OUT], capture_output=True, text=True).stdout.strip().strip(','))
    print('wrote', OUT, got, 'frames (expected', total, ')'); assert got == total


if __name__ == '__main__':
    which = set(sys.argv[1:])
    r = render_really() if (not which or 'really' in which) else f'{TMP}/really.mp4'; print('really ok')
    h = render_hg3() if (not which or 'hg3' in which) else f'{TMP}/hg3.mp4'; print('hg3 ok')
    if not which or 'assemble' in which: assemble(r, h)
