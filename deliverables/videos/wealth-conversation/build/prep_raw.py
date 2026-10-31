#!/usr/bin/python3
"""Re-render Hiral's segments from the raw camera takes (same orig windows as the agency cut, so the
timeline is unchanged). orig -> camera-clip time shifts come from the cross-correlation passes."""
import subprocess, os, sys, shlex, time
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
RAW = S + '/../raw'; SEG = S + '/seg'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

# (segment, [(clip, orig_start, orig_end, shift, zoom)])  camera time = orig + shift
SHIFT = {'MVI_0272': 3.55, 'MVI_0277': 0.07, 'MVI_0278': -19.83, 'MVI_0279': -21.31, 'MVI_0283': -21.74, 'MVI_0284': -20.67, 'MVI_0285': -47.44}
PLAN = {
    'Q':  [('MVI_0272', 3.83, 5.47, 1.0)],
    'H2': [('MVI_0277', 18.48, 24.87, 1.0), ('MVI_0278', 24.87, 26.37, 1.07)],
    'H3': [('MVI_0279', 31.10, 33.27, 1.0)],
    'H4': [('MVI_0283', 42.60, 53.58, 1.0), ('MVI_0284', 53.58, 57.17, 1.07), ('MVI_0285', 57.17, 59.75, 1.0)],
}
for seg, parts in PLAN.items():
    files = []
    for i, (clip, a, b, zoom) in enumerate(parts):
        out = f'{SEG}/{seg}_p{i}.mp4'; files.append(out)
        vf = f'fps=30,{COVER}'
        if zoom != 1.0:   # alternate-take punch-in so the jump cut between takes reads as deliberate
            vf += f',scale=iw*{zoom}:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)/2'
        run(f'{seg} part {i} <- {clip} @{a+SHIFT[clip]:.2f}', ['-ss', f'{a+SHIFT[clip]:.3f}', '-i', f'{RAW}/{clip}.MP4', '-t', f'{b-a:.3f}', '-vf', vf] + ENC + [out])
    if len(files) == 1:
        os.replace(files[0], f'{SEG}/{seg}.mp4')
    else:
        lst = f'{S}/{seg}_raw.txt'; open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
        run(f'concat {seg}', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{SEG}/{seg}.mp4'])
    n = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{SEG}/{seg}.mp4']).decode().strip()
    print(f'   {seg}: {n} frames = {int(n)/30:.3f}s', flush=True)
print('RAW SEGMENTS DONE')
