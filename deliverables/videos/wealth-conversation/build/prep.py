#!/usr/bin/python3
"""Prep pass: render every base video segment (no captions) at 1080x1920 / 30fps."""
import subprocess, os, sys, shlex, time

S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
R = '/Users/lollyg/Documents/investing for Mummies'
MAIN = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/MAIN_Comp.mp4'
HRA = R + '/highlight-reel-assets'
SDR = S + '/sdr'
OUT = S + '/seg'
os.makedirs(OUT, exist_ok=True)
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']

ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
CREAM = '0xF4F1E6'

def run(name, args):
    t = time.time()
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

def clip(name, src, ss, dur, extra_vf=''):
    vf = f'fps=30,{COVER}' + (',' + extra_vf if extra_vf else '')
    run(name, ['-ss', f'{ss:.3f}', '-i', src, '-t', f'{dur:.3f}', '-vf', vf] + ENC + [f'{OUT}/{name}.mp4'])

# ---- timeline (T, duration) -------------------------------------------------
clip('A',  f'{SDR}/m04.mp4',   0.00, 1.96, 'fade=t=in:st=0:d=0.25')
clip('B',  f'{HRA}/v8209.mov', 4.20, 1.87)
clip('Q',  MAIN,               3.83, 1.64)
clip('C',  f'{SDR}/m02.mp4',   6.50, 2.31)
clip('H2', MAIN,              18.48, 7.89)
clip('D',  f'{HRA}/v8415.mov', 1.40, 1.81)
clip('E',  f'{SDR}/m11.mp4',   6.00, 2.42)
clip('H3', MAIN,              30.60, 2.67)
clip('F',  f'{SDR}/m12.mp4',   0.00, 2.67)
clip('G',  f'{SDR}/v0770.mp4', 5.00, 1.94)
clip('M6', f'{SDR}/v0768.mp4', 1.20, 1.94)
clip('H4', MAIN,              42.60, 17.15)
# end card: hold the fully-faded-in frame
run('END', ['-ss', '60.30', '-i', MAIN, '-frames:v', '1', f'{S}/endcard.png'])
run('ENDseg', ['-loop', '1', '-t', '3.45', '-i', f'{S}/endcard.png', '-vf', f'fps=30,{COVER},fade=t=out:st=2.85:d=0.6'] + ENC + [f'{OUT}/END.mp4'])

# ---- montage bases -----------------------------------------------------------
BG = f'{COVER},boxblur=26:2,eq=brightness=-0.16:saturation=0.85'
def card_landscape(name, src, ss, dur, phone=None, still=False):
    """blurred bg + 1000px-wide card with cream border (+ optional phone screenshot sliding in)."""
    ins = []
    if still:
        ins += ['-loop', '1', '-t', f'{dur:.3f}', '-i', src]
        card = (f'[0:v]scale=2600:-2,zoompan=z=\'min(1+0.0014*on,1.12)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\''
                f':d={int(dur*30)+2}:s=1000x618:fps=30,pad=iw+16:ih+16:8:8:color={CREAM}[card]')
    else:
        ins += ['-ss', f'{ss:.3f}', '-t', f'{dur:.3f}', '-i', src]
        card = f'[0:v]fps=30,scale=1000:-2,pad=iw+16:ih+16:8:8:color={CREAM}[card]'
    fc = f'[0:v]fps=30,{BG}[bg];{card};[bg][card]overlay=x=32:y=470[v1]'
    last = 'v1'
    if phone:
        ins += ['-loop', '1', '-t', f'{dur:.3f}', '-i', phone]
        fc += (f';[1:v]scale=330:-2,pad=iw+16:ih+16:8:8:color={CREAM}[ph];'
               f'[v1][ph]overlay=x=\'702+420*pow(1-min(max((t-0.40)/0.35,0),1),2)\':y=900[v2]')
        last = 'v2'
    run(name, ins + ['-filter_complex', fc, '-map', f'[{last}]', '-t', f'{dur:.3f}'] + ENC + [f'{OUT}/{name}.mp4'])

def card_portrait(name, src, ss, dur):
    ins = ['-ss', f'{ss:.3f}', '-t', f'{dur:.3f}', '-i', src]
    fc = (f'[0:v]fps=30,{BG}[bg];[0:v]fps=30,scale=-2:1180,pad=iw+16:ih+16:8:8:color={CREAM}[card];'
          f'[bg][card]overlay=x=(W-w)/2:y=200[v1]')
    run(name, ins + ['-filter_complex', fc, '-map', '[v1]', '-t', f'{dur:.3f}'] + ENC + [f'{OUT}/{name}.mp4'])

G = f'{HRA}/games'
card_landscape('M1', f'{G}/kbc-teaser.mp4', 3.00, 3.88, phone=f'{G}/kbc-player-phone.png')
card_landscape('M2', f'{G}/stockrush-teaser.mp4', 2.80, 1.94, phone=f'{R}/CLAUDE/game-reels/shots/stockrush_player.png')
card_portrait ('M3', f'{R}/deliverables/videos/game-teasers/swayamvar-teaser.mp4', 1.00, 3.88)
card_landscape('M4', f'{G}/mf-market.png', 0, 1.94, still=True)
card_landscape('M5', f'{G}/ltm-teaser.mp4', 2.50, 1.94)
print('ALL DONE', flush=True)
