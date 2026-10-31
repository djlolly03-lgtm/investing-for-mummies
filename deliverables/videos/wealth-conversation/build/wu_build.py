#!/usr/bin/python3
"""Warm-Up Round cut — step 2: effect passes, band/numeral overlays, concat, music map, VO, final + QC."""
import subprocess, os, sys, json, shlex, time, math, glob
from PIL import Image, ImageDraw, ImageFont
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/wu'; FXD = S + '/wu_fx'; OV = S + '/wu_ov'; FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'
VO = S + "/../raw/VO's/unzipped/Vo"; MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
OUT = '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/wealth-conversation/WealthConversation_corp_v5_warmup-round.mp4'
os.makedirs(OV, exist_ok=True); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
FD = os.path.expanduser('~/Library/Fonts/'); W, H, FPS = 1080, 1920, 30
BUTTER, CORAL, MUSTARD, TEAL, INK = (255, 244, 214, 255), (255, 107, 87, 255), (242, 181, 68, 255), (42, 157, 143, 255), (26, 58, 92, 255)
ONLY = set(sys.argv[1:])

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)
def nframes(p): return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))
def dur(p): return nframes(p) / FPS
def fx(name, base, effects):
    if ONLY and 'fx' not in ONLY: return
    plan = f'{FXD}/{name}.json'; json.dump({'effects': effects}, open(plan, 'w')); t = time.time()
    r = subprocess.run([PY, FX + '/scripts/fx.py', '--plan', plan, f'{SEG}/{base}.mp4', f'{SEG}/{name}.mp4'], capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL fx {name}\n{r.stderr[-800:]}', flush=True); sys.exit(1)
    print(f'ok fx {name} ({time.time()-t:.0f}s)', flush=True)
def concat(name, parts):
    lst = f'{S}/wu_{name}.txt'; open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in parts))
    run('concat ' + name, ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{SEG}/{name}.mp4'])

# ---------- effect passes -------------------------------------------------------------------------
run('S11_askT', ['-ss', '2.600', '-i', f'{SEG}/S11_ask.mp4', '-t', '8.630', '-vf', 'fps=30'] + ENC + [f'{SEG}/S11_askT.mp4'])   # Hiral part after the two cut-aways
fx('S1_fx', 'S1_hold', [{'fx': 'dot-reveal', 'start': 0.0, 'end': 0.45, 'color': '#FF6B57', 'cell': 0.02},
                        {'fx': 'pause-point', 'start': 0.45, 'end': 1.10, 'text': 'warm-up round', 'color': '#FF6B57', 'label_x': 0.72},
                        {'fx': 'countdown-flip', 'start': 1.10, 'end': 2.30, 'from': 3}])
fx('S2_fx', 'S2_q3', [{'fx': 'lean-in', 'start': 0.0, 'end': 2.30, 'zoom': 1.3}])
fx('S3_fx', 'S3_q2', [{'fx': 'scribble', 'start': 0.4, 'end': 2.4, 'text': 'buys less?', 'color': '#F2B544'}])
fx('S4_fx', 'S4_q1', [{'fx': 'lineup', 'start': 0.6, 'end': 4.0, 'text': 'Your goals|Inflation|Your money'}])
fx('S5_fx', 'S5_title', [{'fx': 'cover-star', 'start': 0.1, 'end': 4.3, 'look': 'editorial', 'text': 'THE WEALTH CONVERSATION', 'issue': 'THE MONEY BLUEPRINT  ·  FOR BEGINNERS',
                          'lines': 'Games, not lectures|Sharper questions', 'right': 'For beginners|Corporate edition'}])
fx('S6_fx', 'S6_stamp', [{'fx': 'reject-stamp', 'start': 0.3, 'end': 1.5, 'text': 'NOT A LECTURE', 'color': '#D62828', 'angle': -12, 'y': 0.3}])
fx('S7_fx', 'S7_games', [{'fx': 'phone-fan', 'start': 0.0, 'end': 2.47, 'images': f'{FXD}/games4', 'text': 'MONEY GAMES|NOT HOMEWORK'}])
fx('S9_fx', 'S9_swipe', [{'fx': 'swipe', 'start': 0.1, 'end': 2.6, 'grade': 'pop'}])
fx('S10_fx', 'S10_bill', [{'fx': 'the-bill', 'start': 0.4, 'end': 9.2, 'text': 'THE MONEY BLUEPRINT|a goals framework|an investing framework|strategies for the road|TOTAL: one blueprint'}])
fx('S11_fx', 'S11_askT', [{'fx': 'headline-box', 'start': 1.7, 'end': 3.5, 'text': 'ASK THE|RIGHT QUESTIONS', 'zoom': 1.2}])
fx('S12_fx', 'S12_join', [{'fx': 'phone-fan', 'start': 0.0, 'end': 3.7, 'images': f'{FXD}/class4', 'text': 'START WITH YOUR|MONEY BLUEPRINT'}])

# ---------- band / numeral overlay system ----------------------------------------------------------
def nun(sz): return ImageFont.truetype(FD + 'fixed-Nunito-Bold.ttf', sz)
def lorai(sz):
    f = ImageFont.truetype(FD + 'Lora-Italic.ttf', sz); f.set_variation_by_name('Bold Italic'); return f
def ease(p): p = min(max(p, 0.0), 1.0); return 1 - (1 - p) ** 3
class Band:
    """edge-to-edge colour band, text left-aligned; wipes in from the left (0.18s) and out to the left (0.15s)"""
    def __init__(self, text, font, bg, fg, y, h, t_in, t_out, pad=48):
        self.text, self.font, self.bg, self.fg, self.y, self.h, self.t_in, self.t_out, self.pad = text, font, bg, fg, y, h, t_in, t_out, pad
    def draw(self, c, t):
        if t < self.t_in or t > self.t_out + 0.15: return
        w = W * (ease((t - self.t_in) / 0.18) if t < self.t_out else 1 - ease((t - self.t_out) / 0.15))
        if w <= 1: return
        band = Image.new('RGBA', (W, self.h), self.bg); d = ImageDraw.Draw(band)
        bb = self.font.getbbox(self.text); d.text((self.pad - bb[0], (self.h - (bb[3] - bb[1])) / 2 - bb[1]), self.text, font=self.font, fill=self.fg)
        c.alpha_composite(band.crop((0, 0, int(w), self.h)), (0, self.y))
class Numeral:
    """giant digit, bottom-left, pops with a scale bounce"""
    def __init__(self, ch, color, x, y, t_in, t_out, size=380):
        self.ch, self.color, self.x, self.y, self.t_in, self.t_out, self.size = ch, color, x, y, t_in, t_out, size
        f = nun(size); bb = f.getbbox(ch); self.img = Image.new('RGBA', (bb[2] - bb[0] + 24, bb[3] - bb[1] + 24), (0, 0, 0, 0))
        ImageDraw.Draw(self.img).text((12 - bb[0], 12 - bb[1]), ch, font=f, fill=color, stroke_width=5, stroke_fill=INK)
    def draw(self, c, t):
        if t < self.t_in or t > self.t_out + 0.12: return
        p = (t - self.t_in) / 0.22
        s = (0.6 + 0.48 * ease(p) - 0.08 * max(0.0, ease((t - self.t_in - 0.22) / 0.12))) if p < 1.6 else 1.0
        if t > self.t_out: s *= 1 - ease((t - self.t_out) / 0.12)
        if s <= 0.01: return
        im = self.img.resize((max(1, int(self.img.width * s)), max(1, int(self.img.height * s))), Image.LANCZOS)
        c.alpha_composite(im, (self.x, self.y + self.img.height - im.height))
def composite(name, base, items, d):
    if ONLY and 'ov' not in ONLY: return
    od = f'{OV}/{name}'; os.makedirs(od, exist_ok=True)
    for f in glob.glob(od + '/*.png'): os.remove(f)
    n = int(round(d * FPS)); t0 = time.time()
    for i in range(n):
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for it in items: it.draw(c, i / FPS)
        c.save(f'{od}/f{i:04d}.png', compress_level=1)
    print(f'   frames {name}: {n} ({time.time()-t0:.0f}s)', flush=True)
    run(name + '_f', ['-i', base, '-framerate', str(FPS), '-start_number', '0', '-i', f'{od}/f%04d.png', '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1[v]', '-map', '[v]'] + ENC + [f'{SEG}/{name}_f.mp4'])

# S1 hook bands
composite('S1', f'{SEG}/S1_fx.mp4', [Band('3 QUESTIONS', nun(150), CORAL, BUTTER, 1180, 200, 0.50, 2.15),
                                     Band('ABOUT YOUR MONEY', nun(90), BUTTER, INK, 1392, 122, 0.97, 2.15),
                                     Band('can you answer all 3?', lorai(66), TEAL, BUTTER, 1526, 92, 1.45, 2.15)], 2.30)
# quiz section: S2 | CA1 | S3 | CA2 | S4   (numeral + band appear with each question and clear before the next)
concat('QUIZ', ['S2_fx', 'CA1_laugh', 'S3_fx', 'CA2_talk', 'S4_fx'])
d2, dca1, d3, dca2, d4 = dur(f'{SEG}/S2_fx.mp4'), dur(f'{SEG}/CA1_laugh.mp4'), dur(f'{SEG}/S3_fx.mp4'), dur(f'{SEG}/CA2_talk.mp4'), dur(f'{SEG}/S4_fx.mp4')
t3, t1 = d2, d2 + dca1 + d3           # starts of CA1 (question 2 card) and CA2 (question 1 card)
composite('QUIZ', f'{SEG}/QUIZ.mp4', [
    Numeral('3', CORAL, 60, 1370, 0.05, d2 - 0.10), Band('YOUR MONEY', nun(110), BUTTER, INK, 1222, 150, 0.15, d2 - 0.10),
    Numeral('2', MUSTARD, 60, 1370, t3 + 0.05, t3 + dca1 + d3 - 0.10), Band('INFLATION', nun(110), BUTTER, INK, 1222, 150, t3 + 0.15, t3 + dca1 + d3 - 0.10),
    Numeral('1', TEAL, 60, 1370, t1 + 0.05, t1 + dca2 + d4 - 0.60), Band('YOUR GOALS', nun(110), BUTTER, INK, 1222, 150, t1 + 0.15, t1 + dca2 + d4 - 0.60)], d2 + dca1 + d3 + dca2 + d4)
# credit bands
composite('S13', f'{SEG}/S13_credit.mp4', [Band('brought to you especially by', nun(58), TEAL, BUTTER, 1290, 92, 0.10, 2.40),
                                           Band('EO NEW MUMBAI', nun(120), CORAL, BUTTER, 1396, 170, 0.85, 2.40)], dur(f'{SEG}/S13_credit.mp4'))
concat('BURST', ['B1_activity', 'B2_screens', 'B3_phones'])
concat('ASK', ['N1_notes', 'N2_books', 'S11_fx'])

# ---------- assembly -------------------------------------------------------------------------------
ORDER = ['S1_f', 'QUIZ_f', 'S5_fx', 'S6_fx', 'S7_fx', 'BURST', 'S9_fx', 'S10_fx', 'ASK', 'S12_fx', 'S13_f', 'END']
if not os.path.exists(f'{SEG}/END.mp4'): subprocess.run(['cp', f'{S}/seg/END.mp4', f'{SEG}/END.mp4'], check=True)
starts = {}; t = 0.0
for p in ORDER: starts[p] = t; t += dur(f'{SEG}/{p}.mp4')
TOTAL = t; print('starts:', {k: round(v, 3) for k, v in starts.items()}, 'total', round(TOTAL, 3), flush=True)
concat('MAIN', ORDER)

# VO chunks (file, phone_start, phone_end, T)
tq = starts['QUIZ_f']
chunks = [('Hook.m4a', 8.60, 10.90, tq), ('3 points.m4a', 2.88, 5.38, tq + t3 + dca1), ('3 points.m4a', 10.22, 14.32, tq + t1 + dca2),
          ('Rungtha Lane 5 2.m4a', 12.78, 17.18, starts['S5_fx']), ('Rungtha Lane 6.m4a', 2.92, 4.42, starts['S6_fx']),
          ('After no boring lecture.m4a', 2.60, 6.49, starts['S7_fx']), ('After no boring lecture.m4a', 6.49, 9.25, starts['S9_fx']),
          ('Walsingham House School.m4a', 36.80, 46.25, starts['S10_fx']), ('Rungtha Lane 9.m4a', 16.62, 27.85, starts['ASK']),
          ('Rungtha Lane 10.m4a', 29.15, 32.90, starts['S12_fx']), ('Rungtha Lane 11.m4a', 11.42, 13.95, starts['S13_f'])]
gains = {'Rungtha Lane 6.m4a': -5}
ins, fc = [], []
for i, (f, a, b, T) in enumerate(chunks):
    ins += ['-i', f'{VO}/{f}']
    fc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.05,afade=t=out:st={b-a-0.08:.3f}:d=0.08,'
              f'volume={gains.get(f, 0)}dB,adelay={int(T*1000)}|{int(T*1000)}[v{i}]')
n = len(chunks); mi = n
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,highpass=f=90,afftdn=nf=-36:nr=10,loudnorm=I=-16:TP=-2:LRA=9[vo]')
# music map: groove from frame one; re-hit at the receipt; a quiet-build dip under the end of the closing line; re-hit on "Join"
tS10, tS12 = starts['S10_fx'], starts['S12_fx']; DIP = 5.81
A = tS10; B = (tS12 - tS10) - DIP; D = TOTAL - tS12
fc.append(f'[{mi}:a]atrim=31.06:{31.06+A:.3f},asetpts=PTS-STARTPTS[mA];[{mi}:a]atrim=31.06:{31.06+B:.3f},asetpts=PTS-STARTPTS[mB];'
          f'[{mi}:a]atrim={31.06-DIP:.3f}:31.06,asetpts=PTS-STARTPTS[mC];[{mi}:a]atrim=31.06:{31.06+D+0.5:.3f},asetpts=PTS-STARTPTS[mD];'
          f'[mA][mB][mC][mD]concat=n=4:v=0:a=1[mus0]')
# ducking: 0.35 under any voice window (0.25s attack, 0.6s release), 1.0 elsewhere
terms = '+'.join(f'(min(max((t-{T-0.25:.2f})/0.25,0),1)-min(max((t-{T+(b-a):.2f})/0.6,0),1))' for (f, a, b, T) in chunks)
fc.append(f"[mus0]volume='1-0.65*min(1,{terms})':eval=frame,afade=t=out:st={TOTAL-2.2:.3f}:d=2.2,atrim=0:{TOTAL:.3f}[mus]")
fc.append('[vo][mus]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[aout]')
run('audio', ins + ['-i', MUSIC, '-filter_complex', ';'.join(fc), '-map', '[aout]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{S}/wu_mix.wav'])
run('final', ['-i', f'{SEG}/MAIN.mp4', '-i', f'{S}/wu_mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT])
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', OUT]))
r = subprocess.run(['ffmpeg', '-nostdin', '-i', OUT, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('final:', info['format'], '|', ' '.join(l.strip() for l in r.stderr.splitlines() if l.strip().startswith(('I:', 'Peak:'))), flush=True)
run('sheet', ['-i', OUT, '-vf', 'fps=1,scale=180:320,tile=11x6:padding=3:margin=3:color=white', '-frames:v', '1', OUT.replace('.mp4', '_contact-sheet.jpg')])
json.dump({'starts': starts, 'chunks': chunks}, open(f'{S}/wu_meta.json', 'w'), indent=1)
print('WU BUILD DONE', flush=True)
