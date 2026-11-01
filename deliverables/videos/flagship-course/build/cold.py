#!/usr/bin/python3
"""v10 cold open: a 1.8s flash-forward before the uninstall — six of the film's best moments, 9 frames each, every
cut on a hit (sound in assemble.py), each flash punching in from 112% to 100%. Built from finished shots, so it
always shows the current look. Writes seg/COLD.mp4 (54 frames)."""
import subprocess, os, sys
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG = W + '/seg'; os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
FLASHES = [('K2', 0.00),          # arm up as the round result lands
           ('H3_fx', 1.60),       # game screens orbiting her
           ('Q_hf', 3.367 + 1.95),# ASK AGAIN in gold light
           ('T2_p', 1.30),        # the student (v14: GOT IT! removed)
           ('K3', 1.20),          # the whole table scanning into the quiz
           ('ENDGROW', 4.70)]     # the logo, finished (no end-card text)
ins, fc = [], []
for i, (seg, t) in enumerate(FLASHES):
    ins += ['-ss', f'{t:.3f}', '-i', f'{SEG}/{seg}.mp4']
    fc.append(f"[{i}:v]fps=30,trim=end_frame=9,setpts=PTS-STARTPTS,"
              f"zoompan=z='1.12-0.015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1[c{i}]")
fc.append(''.join(f'[c{i}]' for i in range(len(FLASHES))) + f'concat=n={len(FLASHES)}:v=1:a=0,setpts=N/30/TB[v]')
r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[v]', '-frames:v', '54'] + ENC + [f'{SEG}/COLD.mp4'],
                   capture_output=True, text=True)
if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
print('COLD DONE', flush=True)
