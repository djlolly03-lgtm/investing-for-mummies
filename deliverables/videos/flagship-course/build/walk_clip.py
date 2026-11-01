#!/usr/bin/python3
"""'Walk away with a framework…' = the user's own animation (Animating_investment_framework…ad8b96ba.mp4, 6.04s, 720x1280
24fps: a gold chest opens and three cards fly out — Meaningful Goals / A Simple Framework / Strategies — then a gold tick).
Her line is 9.77s, so the clip is slowed in sections so each card lands on her word, motion-interpolated to 30 fps.
Replaces walk.py's hand-drawn graphic (kept as a fallback). Writes seg/WALK.mp4, 293 frames."""
import subprocess, os
W_ = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SRC = W_ + '/fw/framework.mp4'           # copy of ~/…/Dropbox/…/Downloads/Animating_investment_framework_v…_ad8b96ba.mp4
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
# (clip from, clip to, WALK from, WALK to) — her words (Walsingham 36.80+, +0.05 lead): "meaningful" 1.83,
# "a simple framework" 3.55, "framework" 4.25, "strategies" 6.79, "journey" ends 8.97; shot is 9.767s
MAP = [(0.00, 1.25, 0.00, 1.70),   # title, chest flies in and opens, the arrow hits the target
       (1.25, 2.40, 1.70, 3.55),   # Meaningful Goals card lands and sparkles
       (2.40, 3.05, 3.55, 4.30),   # blue bars build -> A Simple Framework card
       (3.05, 4.15, 4.30, 6.70),   # hold on two cards while she explains; arrow starts for the third
       (4.15, 4.55, 6.70, 7.30),   # Strategies card lands
       (4.55, 6.04, 7.30, 9.767)]  # gold arc ties the three together, chest leaves, tick
parts = []
fc = f'[0:v]split={len(MAP)}' + ''.join(f'[s{i}]' for i in range(len(MAP))) + ';'
for i, (a, b, c, d) in enumerate(MAP):
    fc += f'[s{i}]trim={a}:{b},setpts=(PTS-STARTPTS)*{(d - c) / (b - a):.4f}[p{i}];'
fc += ''.join(f'[p{i}]' for i in range(len(MAP))) + f'concat=n={len(MAP)}:v=1:a=0,' \
      'minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,' \
      'scale=1080:1920:flags=lanczos,unsharp=5:5:0.5,setsar=1,tpad=stop_mode=clone:stop_duration=0.5[v]'   # the clip runs a few frames short: hold the tick
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', SRC, '-filter_complex', fc, '-map', '[v]', '-frames:v', '293',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an', f'{W_}/seg/WALK.mp4'], check=True)
print('WALK (clip) DONE', flush=True)
