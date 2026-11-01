#!/usr/bin/python3
"""v13 walk-away, replacing the gold-chest framework clip (user: "not loving that whole graphic"). Her line is a phone VO,
so the picture is three real class shots from the Library, one per phrase, each landing with the cold-open punch,
under hyperframes/ticks.html: a falling-sticker stack along the bottom, ticking on her words (v20). Writes seg/WALK2.mp4 (293 frames, same length as WALK).
  "a framework to set meaningful financial goals"   IFM-686  hand with gold bangles writing in a notebook
  "a simple framework to organize your investments" IFM-620  the whiteboard mind-map of asset classes, from the table
  "and strategies to navigate your financial journey" IFM-739 Hiral reading from a sheet beside the note-covered whiteboard
Usage: walk_real.py [--render]  (--render re-renders ticks.mov first; needs npx)"""
import subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, SDR, OUT = W + '/seg', W + '/sdr', W + '/hfout'; os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
ROOM = 'eq=contrast=1.04:saturation=1.08:brightness=0.01'
# (Library id, start s, frames, zoom, crop y-anchor 0..1)  — cuts at 3.78s ("a simple") and 6.70s ("strategies")
SHOTS = [('IFM-686', 2.0, 113, 1.0, 0.5), ('IFM-620', 2.0, 88, 1.15, 0.25), ('IFM-739', 0.0, 92, 1.0, 0.5)]
assert sum(s[2] for s in SHOTS) == 293

def run(name, cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if r.returncode: print(f'FAIL {name}\n{r.stderr[-1500:]}', flush=True); sys.exit(1)
    print('ok', name, flush=True)

if '--render' in sys.argv:
    run('hf ticks', ['npx', '--yes', 'hyperframes@0.8.226', 'render', '-c', 'ticks.html', '--format', 'mov', '-o', f'{OUT}/ticks.mov',
                     '--fps', '30', '--quiet', '--skill', 'hyperframes'], cwd=HERE + '/hyperframes')
ins, fc = [], []
for i, (lid, ss, n, z, ya) in enumerate(SHOTS):
    ins += ['-ss', f'{ss:.3f}', '-i', f'{SDR}/{lid}.mov']
    fc.append(f"[{i}:v]fps=30,trim=end_frame={n},setpts=PTS-STARTPTS,{ROOM},scale=iw*{z}:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)*{ya},"
              f"zoompan=z='if(lt(on,9),1.12-0.0133*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1[c{i}]")
k = len(SHOTS)
fc.append(''.join(f'[c{i}]' for i in range(k)) + f'concat=n={k}:v=1:a=0,setpts=N/30/TB[b]')
fc.append(f'[{k}:v]setpts=PTS-STARTPTS,format=yuva444p[o];[b][o]overlay=0:0:format=auto:eof_action=pass,setsar=1[v]')
run('WALK2', ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + ins + ['-i', f'{OUT}/ticks.mov', '-filter_complex', ';'.join(fc),
              '-map', '[v]', '-frames:v', '293'] + ENC + [f'{SEG}/WALK2.mp4'])
