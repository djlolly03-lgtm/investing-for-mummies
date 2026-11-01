#!/usr/bin/python3
"""v17 certificate beat, replacing CERT_w (two photo cards) and the profile wall + stats that sat on her closing line.
Hiral presenting in front of the "Investing for Mummies" title slide (Library IFM-579; v22, user's pick) plays sharp for 1.45s under "You finish with a
certificate.", then blurs and dims while hyperframes/certwall.html lays a Reels grid of Hiral with groups of women and the
stats card (200+ women taught, 400+ hours of teaching, 40+ games) over it, then fades to white into the logo ending.
Writes seg/CERTW.mp4 (180 frames). Usage: cert_wall.py [--render]  (--render re-renders certwall.mov first)"""
import subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, SDR, OUT = W + '/seg', W + '/sdr', W + '/hfout'; os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
ROOM = 'eq=contrast=1.04:saturation=1.08:brightness=0.01'
N, BLUR_AT = 180, 1.45   # v19: 6.0s (user: hold the certificate screen a little longer)

def run(name, cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if r.returncode: print(f'FAIL {name}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print('ok', name, flush=True)

if '--render' in sys.argv:
    run('hf certwall', ['npx', '--yes', 'hyperframes@0.8.226', 'render', '-c', 'certwall.html', '--format', 'mov', '-o', f'{OUT}/certwall.mov',
                        '--fps', '30', '--quiet', '--skill', 'hyperframes'], cwd=HERE + '/hyperframes')
fc = (f"[0:v]fps=30,trim=end_frame={N},setpts=PTS-STARTPTS,{ROOM},scale=1080:1920,setsar=1,split[s][b];"
      f"[b]boxblur=28:3,eq=brightness=-0.22:saturation=0.85,format=yuva420p,fade=t=in:st={BLUR_AT}:d=0.3:alpha=1[bl];"   # the blurred copy fades in over the sharp one
      "[s][bl]overlay=0:0[bg];"
      "[1:v]setpts=PTS-STARTPTS,format=yuva444p[o];[bg][o]overlay=0:0:format=auto:eof_action=pass,"
      f"fade=t=out:st={(N - 8) / 30:.4f}:d={8 / 30:.4f}:color=white,setsar=1[v]")                                   # white flash into the logo ending
run('CERTW', ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', '2.00', '-i', f'{SDR}/IFM-579.mov', '-i', f'{OUT}/certwall.mov',
              '-filter_complex', fc, '-map', '[v]', '-frames:v', str(N)] + ENC + [f'{SEG}/CERTW.mp4'])
