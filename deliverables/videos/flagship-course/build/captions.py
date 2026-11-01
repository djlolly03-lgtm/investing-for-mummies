#!/usr/bin/python3
"""Flagship course promo — step 2: join the multi-part shots, then the falling-sticker captions (EO house style:
Pillow PNG sequences, Lora / Nunito, cream · slate · gold) and the end card. Usage: captions.py [names...]"""
import subprocess, os, sys, math, shlex, time, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W_ = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, OV = W_ + '/seg', W_ + '/ov'
LOGO = '/Users/lollyg/Documents/investing for Mummies/brand/logos/IFM-logo-round-1119px-transparent-no-TM.png'
os.makedirs(OV, exist_ok=True); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
FD = os.path.expanduser('~/Library/Fonts/'); FPS = 30; W, H = 1080, 1920
CREAM = (244, 241, 230, 255); SLATE = (41, 67, 84, 255); GOLD = (252, 197, 54, 255); WHITE = (255, 255, 255, 240); TEAL = (42, 157, 143, 255)
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
ONLY = set(sys.argv[1:])

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)
def nframes(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))

def lora(sz):
    f = ImageFont.truetype(FD + 'Lora.ttf', sz); f.set_variation_by_name('Bold'); return f
def nun(sz): return ImageFont.truetype(FD + 'fixed-Nunito-Bold.ttf', sz)

def sticker(text, font, bg, fg, pad=(34, 22), radius=14, maxw=1000):
    """Pre-rendered sticker (unrotated) with a soft shadow; shrinks the font until it fits maxw."""
    while True:
        bb = ImageDraw.Draw(Image.new('RGBA', (4, 4))).textbbox((0, 0), text, font=font)
        if bb[2] - bb[0] + 2 * pad[0] <= maxw or font.size <= 36: break
        font = lora(font.size - 2) if font.path.endswith('Lora.ttf') else nun(font.size - 2)
    w, h = bb[2] - bb[0], bb[3] - bb[1]; sw, sh = w + 2 * pad[0], h + 2 * pad[1]; M = 40
    im = Image.new('RGBA', (sw + 2 * M, sh + 2 * M), (0, 0, 0, 0)); shd = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(shd).rounded_rectangle((M + 4, M + 10, M + sw + 4, M + sh + 10), radius, fill=(0, 0, 0, 120))
    shd = shd.filter(ImageFilter.GaussianBlur(12)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((M, M, M + sw, M + sh), radius, fill=bg)
    d.text((M + pad[0] - bb[0], M + pad[1] - bb[1]), text, font=font, fill=fg)
    return Image.alpha_composite(shd, im)

def pill(txt, dot=TEAL):
    f = nun(32); bb = ImageDraw.Draw(Image.new('RGBA', (4, 4))).textbbox((0, 0), txt, font=f)
    w = bb[2] - bb[0] + 94; h = bb[3] - bb[1] + 26
    im = Image.new('RGBA', (w + 20, h + 20), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 10, 10 + w, 10 + h), h // 2, fill=WHITE)
    d.ellipse((10 + 24, 10 + h / 2 - 9, 10 + 42, 10 + h / 2 + 9), fill=dot)
    d.text((10 + 58 - bb[0], 10 + 13 - bb[1]), txt, font=f, fill=SLATE)
    return im

class Item:
    def __init__(self, img, x, y, t_in, angle, drop=420, dur=0.28, t_out=None):
        self.img, self.x, self.y, self.t_in, self.angle, self.drop, self.dur, self.t_out = img, x, y, t_in, angle, drop, dur, t_out
        if x == 'c': self.x = (W - img.width) / 2
        self.cache = img.rotate(angle, resample=Image.BICUBIC, expand=True) if angle else img

def paste_centered(canvas, img, cx, cy, alpha=1.0):
    if alpha < 1.0:
        a = img.split()[3].point(lambda v: int(v * alpha)); img = img.copy(); img.putalpha(a)
    canvas.alpha_composite(img, (int(cx - img.width / 2), int(cy - img.height / 2)))

def render_frame(items, t, draw=None):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if draw is not None: draw(c, t)
    for it in items:
        if t < it.t_in: continue
        if it.t_out is not None:
            if t >= it.t_out + 0.22: continue
            if t >= it.t_out:                          # quick fade + lift out
                q = (t - it.t_out) / 0.22
                paste_centered(c, it.cache, it.x + it.img.width / 2, it.y + it.img.height / 2 - 60 * q, alpha=1 - q); continue
        p = min(max((t - it.t_in) / it.dur, 0.0), 1.0); e = 1 - (1 - p) ** 3
        dy = -it.drop * (1 - e); q = (t - it.t_in - it.dur) / 0.16
        if 0 < q < 1: dy += 14 * math.sin(math.pi * q)          # settle bounce
        cx = it.x + it.img.width / 2; cy = it.y + it.img.height / 2 + dy
        if p < 1.0: paste_centered(c, it.img.rotate(it.angle + 7 * (1 - e), resample=Image.BICUBIC, expand=True), cx, cy, alpha=min(1.0, p * 5 + 0.15))
        else: paste_centered(c, it.cache, cx, cy)
    return c

def join(name, parts, force=False):
    """Join by frame count, never by timestamps: some parts start at 0.033s, and a copy-concat of those made the encoder
    drop 4 frames, which put every later shot 133 ms behind its voice (v2 lip-sync bug, 1 Nov 2026)."""
    if ONLY and name not in ONLY and name != 'END': return
    ins = sum((['-i', f'{SEG}/{p}.mp4'] for p in parts), [])
    fc = ''.join(f'[{i}:v]setpts=PTS-STARTPTS,setsar=1[v{i}];' for i in range(len(parts))) + ''.join(f'[v{i}]' for i in range(len(parts))) + \
         f'concat=n={len(parts)}:v=1:a=0,setpts=N/30/TB[v]'
    run('join ' + name, ins + ['-filter_complex', fc, '-map', '[v]', '-fps_mode', 'passthrough'] + ENC + [f'{SEG}/{name}.mp4'])
    want = sum(nframes(f'{SEG}/{p}.mp4') for p in parts); got = nframes(f'{SEG}/{name}.mp4')
    assert got == want, f'{name}: {got} frames, parts add up to {want}'

def composite(name, base, items, draw=None, extra_vf=''):
    """PNG-sequence overlay on SEG/base.mp4 for its full length -> SEG/name.mp4"""
    if ONLY and name not in ONLY: return
    n = nframes(f'{SEG}/{base}.mp4'); d = f'{OV}/{name}'; os.makedirs(d, exist_ok=True)
    for f in glob.glob(d + '/*.png'): os.remove(f)
    t0 = time.time()
    for i in range(n): render_frame(items, i / FPS, draw).save(f'{d}/f{i:04d}.png', compress_level=1)
    print(f'   frames {name}: {n} ({time.time()-t0:.0f}s)', flush=True)
    run(name, ['-i', f'{SEG}/{base}.mp4', '-framerate', str(FPS), '-start_number', '0', '-i', f'{d}/f%04d.png',
               '-filter_complex', f'[0:v][1:v]overlay=0:0:shortest=1{extra_vf}[v]', '-map', '[v]', '-frames:v', str(n)] + ENC + [f'{SEG}/{name}.mp4'])

join('K', ['K1_fx_p', 'K2_p', 'K3_p', 'K4_p']); join('T1', ['T1a_fx_p', 'T1b', 'T1c'])   # v11: _p = punch.py; H3 is one shot now; walk-away is walk.py's graphic
join('Q', ['Qa', 'Qb_p', 'Qc_x'])   # v14: Qc_x = punched + the quiz-screen cutaway

# --- "ask the stupid question": her words as stickers over the students, gone before she is on camera (Qc at 3.367) ---
composite('Q_f', 'Q', [
    Item(sticker('Ask the question.', lora(78), CREAM, SLATE, pad=(32, 18)), 'c', 300, 0.08, -1.5, drop=300, t_out=3.20),
    Item(sticker('Ask the stupid question.', lora(78), GOLD, SLATE, pad=(32, 18), maxw=1000), 'c', 430, 1.38, 1.5, drop=300, t_out=3.20)])

# --- hook: earn / save / invest at the top while she says it, name lower-third underneath (first time she talks) ---
f70 = lora(70)
composite('H1_f', 'H1_fx_p', [
    Item(sticker('You earn it.', f70, CREAM, SLATE, pad=(32, 16)), 40, 150, 0.10 - 0.05, -1.5, drop=260, t_out=3.55),
    Item(sticker('You save it.', f70, GOLD, SLATE, pad=(32, 16)), 80, 254, 1.08 - 0.15, 1.5, drop=260, t_out=3.55),
    Item(sticker('Maybe you even invest it.', f70, SLATE, CREAM, pad=(32, 16)), 40, 358, 1.82 - 0.15, -1.0, drop=260, t_out=3.55)])
# (her name is now HyperFrames' stacked name bars, laid on by hf_overlays.py)

# --- the music drop: what the course IS, one fact per cut, stacking up ---
composite('K_f', 'K', [
    Item(sticker('The Flagship Course', lora(96), GOLD, SLATE, maxw=980), 'c', 200, 0.45, -1.5, drop=300),
    Item(sticker('16 hours · 8 sessions', lora(70), CREAM, SLATE, pad=(32, 16)), 'c', 370, 1.933 + 0.12, 1.5, drop=300),
    Item(sticker('10–12 women · Nariman Point', lora(66), SLATE, CREAM, pad=(32, 16), maxw=1000), 'c', 490, 3.867 + 0.12, -1.0, drop=300),
    Item(sticker('Stocks, funds, insurance & more', lora(64), CREAM, SLATE, pad=(32, 16), maxw=1000), 'c', 610, 5.80 + 0.12, 1.2, drop=300)])   # WhatsApp video's coverage line

# --- certificate day (from the WhatsApp video), right before the end card ---
composite('CERT_f', 'CERT_p', [Item(sticker('You finish with a certificate.', lora(70), GOLD, SLATE, pad=(32, 18), maxw=1000), 'c', 240, 0.15, -1.2, drop=300)])

# --- students: their own words, quotes stacked at the bottom, a small pill at the top ---
def student(name, base, quotes, label=True):
    its = [Item(pill('FLAGSHIP STUDENT'), 40, 120, 0.15, 0, drop=120, dur=0.22)] if label else []
    for k, (txt, t) in enumerate(quotes):
        its.append(Item(sticker(txt, lora(62), (CREAM, GOLD)[k % 2], SLATE, pad=(30, 16), maxw=1000), 40 + 30 * (k % 2), 1360 + 112 * k, t, (-1.2, 1.2)[k % 2], drop=260))
    composite(name, base, its)
student('T1_f', 'T1', [('“I was really afraid of investing.”', 0.45), ('“I feel like I can understand.”', 2.95), ('“It’s not that tough.”', 4.30)], label=False)   # locked-on carries the tag
student('T2_f', 'T2_fx', [('“Now even I know something.”', 0.50), ('“I can have a conversation.”', 2.40)])
student('T3_f', 'T3', [('“Do this course with your friends.”', 0.50), ('“You can laugh in the middle of it.”', 2.60)])

# --- closing line: the EO video's three falling stickers at the top ---
f66 = lora(70)
composite('H5_f', 'H5_x', [   # v17: all three back, held to the end of the shot (the wall that displaced them is gone)
    # (v18's 'You don't have to / manage it all yourself.' pair came out in v19: the headline wall carries that line)
    Item(sticker('Ask the right questions.', f66, CREAM, SLATE, pad=(32, 16)), 36, 120, 4.47 - 0.22, -1.5, drop=260, t_out=11.2),
    Item(sticker('Make your voice heard.', f66, GOLD, SLATE, pad=(32, 16)), 66, 224, 6.19 - 0.22, 1.5, drop=260, t_out=11.2),
    Item(sticker('Take an active role.', f66, SLATE, CREAM, pad=(32, 16)), 96, 328, 7.59 - 0.22, -1.0, drop=260, t_out=11.2)])

# --- end card (v7): the user's logo animation (last 4s: a trunk grows into the tree and the IFM logo forms) plays in the
# top third from the start, and the course details drop in WHILE it grows (user: "do both at the same time", saves ~2s);
# then a short hold ---
LOGOCLIP = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/do_something_simple,_sleek_._9e1a7330 (1).mp4'
if not ONLY or 'END' in ONLY:
    px = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', '7.9', '-i', LOGOCLIP, '-frames:v', '1', '-vf', 'crop=8:8:10:10,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                        capture_output=True).stdout
    paper = '0x%02X%02X%02X' % (px[0], px[1], px[2])
    run('ENDGROW', ['-f', 'lavfi', '-i', f'color=c={paper}:s=1080x1920:r=30', '-ss', '4.5', '-i', LOGOCLIP, '-filter_complex',   # -ss 4.5: 4.0-4.5 is the old logo fading out, start on the bare trunk
                    '[1:v]fps=30,scale=740:-2:flags=lanczos,unsharp=5:5:0.6,setpts=PTS-STARTPTS[l];[0:v][l]overlay=x=(W-w)/2:y=-150:shortest=1,'
                    'tpad=stop_mode=clone:stop_duration=2.0,setsar=1[v]', '-map', '[v]', '-frames:v', '160'] + ENC + [f'{SEG}/ENDGROW.mp4'])
    composite('END', 'ENDGROW', [
        Item(sticker('The Flagship Course', lora(92), GOLD, SLATE, maxw=980), 'c', 990, 1.20, -1.2, drop=300),
        Item(sticker('16 hours · 8 sessions · in person', nun(56), SLATE, CREAM, pad=(30, 16), maxw=1020), 'c', 1160, 1.55, 1.0, drop=260),
        Item(sticker('Nariman Point, Mumbai', nun(56), SLATE, CREAM, pad=(30, 16)), 'c', 1275, 1.80, -1.0, drop=260),
        Item(sticker('No finance background required.', nun(52), GOLD, SLATE, pad=(30, 16), maxw=1020), 'c', 1400, 2.10, 1.0, drop=260),
        Item(sticker('investingformummies.com/registernow', nun(50), SLATE, CREAM, pad=(30, 18), maxw=1020), 'c', 1540, 2.45, 0, drop=260)])
print('CAPTIONS DONE', flush=True)
