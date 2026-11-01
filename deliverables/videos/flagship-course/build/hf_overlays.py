#!/usr/bin/python3
"""HyperFrames graphics (v8, user picked all three): renders hyperframes/{name,specs,leak}.html and lays the two
transparent ones over their shots. The footage is never re-rendered through the browser, so lip-sync is untouched.
  H1_hf = H1_f (hook, earn/save/invest stickers) + name.mov  (stacked name bars, registry lt-stack-bars)
  K_hf  = K (music drop, 4 cuts)                 + specs.mov (course checklist, registry mk-specs-list)
  leak.mp4 (registry organic-light-leak-overlay, on black) is screen-blended over two section cuts by assemble.py.
Usage: hf_overlays.py [--render]   (--render re-renders the HyperFrames files first; needs npx)"""
import subprocess, os, sys, shlex, time
HERE = os.path.dirname(os.path.abspath(__file__))
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, OUT = W + '/seg', W + '/hfout'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']; os.makedirs(OUT, exist_ok=True)
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
HF = ['npx', '--yes', 'hyperframes@0.8.226']   # the project's pinned version (folder package is renamed, so npx finds the CLI)

def run(name, cmd, cwd=None):
    t = time.time(); r = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)
def nframes(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))

CAPS = ['capT1', 'capT2', 'capT3']
if '--render' in sys.argv or '--render-new' in sys.argv:
    hp = HERE + '/hyperframes'
    for c in ['swap', 'stats'] + CAPS:
        run('hf ' + c, HF + ['render', '-c', f'{c}.html', '--format', 'mov', '-o', f'{OUT}/{c}.mov', '--fps', '30', '--quiet', '--skill', 'hyperframes'], cwd=hp)
if '--render' in sys.argv:
    hp = HERE + '/hyperframes'
    run('hf name', HF + ['render', '-c', 'name.html', '--format', 'mov', '-o', f'{OUT}/name.mov', '--fps', '30', '--quiet', '--skill', 'hyperframes'], cwd=hp)
    run('hf specs', HF + ['render', '-c', 'specs.html', '--format', 'mov', '-o', f'{OUT}/specs.mov', '--fps', '30', '--quiet', '--skill', 'hyperframes'], cwd=hp)
    run('hf leak', HF + ['render', '-c', 'leak.html', '--format', 'mp4', '-o', f'{OUT}/leak.mp4', '--fps', '30', '--quality', 'delivery', '--quiet', '--skill', 'hyperframes'], cwd=hp)

# (name, base shot, overlay, seconds into the base where the overlay starts)
JOBS = [('H1_hf', 'H1_f', 'name.mov', 0), ('K_hf', 'K', 'specs.mov', 0),
        # v9: word-by-word captions on the students (replace their stickers); the kinetic line on her bridge sentence
        ('T1_hf', 'T1', 'capT1.mov', 0), ('T2_hf', 'T2_p', 'capT2.mov', 0), ('T3_hf', 'T3_x', 'capT3.mov', 0),
        ('Q_hf', 'Q_f', 'swap.mov', (39 + 62) / 30)]   # v17: the stats card moved to the certificate beat (cert_wall.py)
for name, base, ov, at in JOBS:
    n = nframes(f'{SEG}/{base}.mp4')
    run(name, ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{SEG}/{base}.mp4', '-i', f'{OUT}/{ov}', '-filter_complex',
               f'[1:v]setpts=PTS-STARTPTS+{at:.4f}/TB,format=yuva444p[o];[0:v]setpts=PTS-STARTPTS[b];[b][o]overlay=0:0:format=auto:eof_action=pass,setsar=1[v]',
               '-map', '[v]', '-frames:v', str(n)] + ENC + [f'{SEG}/{name}.mp4'])
    assert nframes(f'{SEG}/{name}.mp4') == n, name
# v9: a white flash out of the certificate photo into the white logo ending (registry flash-through-white, done as a
# straight fade to white over the last 8 frames — the ending's ground is already white, so it flows on)
n = nframes(f'{SEG}/CERT_f.mp4')
run('CERT_w', ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{SEG}/CERT_f.mp4', '-vf', f'fade=t=out:st={(n - 8) / 30:.4f}:d={8 / 30:.4f}:color=white', '-frames:v', str(n)] + ENC + [f'{SEG}/CERT_w.mp4'])
print('HF OVERLAYS DONE', flush=True)
