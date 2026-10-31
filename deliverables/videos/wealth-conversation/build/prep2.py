#!/usr/bin/python3
"""From-scratch pass: Hiral segments from raw takes (light grade), group-photo cards for C and F,
logo-animation ending. Usage: prep2.py <photo1> <photo2>"""
import subprocess, os, sys, shlex, time
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
RAW = S + '/../raw'; SEG = S + '/seg'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
GRADE = 'eq=contrast=1.05:brightness=0.012:saturation=1.02'
CREAM = '0xF4F1E6'
PHOTO1, PHOTO2 = sys.argv[1], sys.argv[2]

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

def frames(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]))

# ---- Hiral from raw takes (camera time = orig + shift) ------------------------------------
SHIFT = {'MVI_0272': 3.55, 'MVI_0277': 0.07, 'MVI_0278': -19.83, 'MVI_0279': -21.31, 'MVI_0283': -21.74, 'MVI_0284': -20.67, 'MVI_0285': -47.44}
PLAN = {
    'Q':  [('MVI_0272', 3.83, 5.467, 1.0)],
    'H2': [('MVI_0277', 20.30, 24.867, 1.0), ('MVI_0278', 24.867, 26.40, 1.07)],      # starts at "A workshop that connects..."
    'H3': [('MVI_0279', 31.10, 33.267, 1.0)],
    'H4': [('MVI_0283', 42.60, 53.58, 1.0), ('MVI_0284', 53.58, 57.17, 1.07), ('MVI_0285', 57.17, 59.733, 1.0)],
}
for seg, parts in PLAN.items():
    files = []
    for i, (clip, a, b, zoom) in enumerate(parts):
        out = f'{SEG}/{seg}_p{i}.mp4'; files.append(out)
        vf = f'fps=30,{COVER},{GRADE}'
        if zoom != 1.0: vf += f',scale=iw*{zoom}:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)/2'
        run(f'{seg} part {i} <- {clip} @{a+SHIFT[clip]:.2f}', ['-ss', f'{a+SHIFT[clip]:.3f}', '-i', f'{RAW}/{clip}.MP4', '-t', f'{b-a:.3f}', '-vf', vf] + ENC + [out])
    if len(files) == 1: os.replace(files[0], f'{SEG}/{seg}.mp4')
    else:
        lst = f'{S}/{seg}_raw.txt'; open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
        run(f'concat {seg}', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{SEG}/{seg}.mp4'])
    print(f'   {seg}: {frames(f"{SEG}/{seg}.mp4")} frames', flush=True)

# ---- group-photo cards: blurred self background + tilted cream-bordered print, slow drift ----
def photo_card(name, photo, dur, angle=-2.0):
    n = int(round(dur * 30))
    fc = (f'[0:v]{COVER},boxblur=30:3,eq=brightness=-0.22:saturation=0.8[bg];'
          f'[0:v]scale=1000:1000:force_original_aspect_ratio=decrease,pad=iw+24:ih+24:12:12:color={CREAM},format=rgba,'
          f'rotate={angle}*PI/180:c=0x00000000:ow=rotw(iw):oh=roth(ih)[card];'
          f'[bg][card]overlay=x=(W-w)/2:y=(H-h)/2-80,format=yuv420p,'
          f'zoompan=z=\'1+0.00045*on\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d={n+2}:s=1080x1920:fps=30[v]')
    run(name, ['-loop', '1', '-t', f'{dur:.3f}', '-i', photo, '-filter_complex', fc, '-map', '[v]', '-t', f'{dur:.3f}'] + ENC + [f'{SEG}/{name}.mp4'])
    print(f'   {name}: {frames(f"{SEG}/{name}.mp4")} frames', flush=True)

photo_card('C', PHOTO1, 4.100)      # "That's where the Wealth Conversation begins with the Money Blueprint"
photo_card('F', PHOTO2, 2.667, 2.0) # "Let's find out."

# ---- ending: the BEOND -> IFM logo animation, held, then fade ---------------------------------
run('END', ['-i', f'{S}/logo_anim.mp4', '-filter_complex',
            f'[0:v]fps=30,{COVER},tpad=stop_mode=clone:stop_duration=1.2,fade=t=out:st=4.7:d=0.5[v]', '-map', '[v]', '-t', '5.233'] + ENC + [f'{SEG}/END.mp4'])
print(f'   END: {frames(f"{SEG}/END.mp4")} frames', flush=True)
print('PREP2 DONE')
