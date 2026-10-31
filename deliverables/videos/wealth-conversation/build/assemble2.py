#!/usr/bin/python3
"""Assemble v3 (from scratch): raw-take Hiral shots, clean phone VO, our graphics, logo-animation ending."""
import subprocess, os, sys, shlex, time, json
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'; VO = S + "/../raw/VO's/unzipped/Vo"
MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
OUTDIR = '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/wealth-conversation'
FINAL = OUTDIR + '/WealthConversation_corp_v3_from-scratch.mp4'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-2000:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True); return r

ORDER = ['AB_f', 'Q', 'C_f', 'H2', 'DE_f', 'H3_f', 'FG_f', 'M1_f', 'M2_f', 'M3_f', 'M4_f', 'M5_f', 'M6_f', 'H4_f', 'END']   # END = placeholder card until the final logo arrives
starts = {}; t = 0.0
for p in ORDER:
    n = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{SEG}/{p}.mp4']).decode().strip().strip(','))
    starts[p] = t; t += n / 30
print('segment starts:', {k: round(v, 3) for k, v in starts.items()}, flush=True)
lst = S + '/main3.txt'; open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in ORDER))
run('concat main', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{S}/part1.mp4'])
TOTAL = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{S}/part1.mp4']))
dur1 = starts['END']          # where the end card starts (music lifts there)
print(f'end card at {dur1:.3f}s, total = {TOTAL:.3f}s', flush=True)

# ---- voice: the on-set phone recordings, placed on the timeline (T = where the matching shot sits) ----
# (file, start, end, T, gain dB)   T for pieces 2/3 keyed off the measured shot starts so lips stay exact
tC = starts['C_f']; tH4 = starts['H4_f']
chunks = [('Hook.m4a', 4.97, 10.69, 0.00, 0),
          ('Rungtha Lane 5 2.m4a', 12.77, 21.32, tC + 0.31, 0),            # orig 16.50 sits 0.31s after C starts (orig 16.19)
          ('Rungtha Lane 6.m4a', 2.92, 4.42, tC + 0.31 + 8.55, -5),
          ('After no boring lecture.m4a', 2.64, 9.41, tC + 0.31 + 10.05, 0),
          ('Rungtha Lane 9.m4a', 16.62, 27.85, tH4 - 0.25, 0),             # orig 42.35 is 0.25s before the H4 shot (orig 42.60)
          ('Rungtha Lane 10.m4a', 29.15, 32.74, tH4 - 0.25 + 11.23, 0),
          ('Rungtha Lane 11.m4a', 11.42, 13.95, tH4 - 0.25 + 14.82, 0)]
ins = []; fc = []
for i, (f, a, b, T, g) in enumerate(chunks):
    ins += ['-i', f'{VO}/{f}']
    fc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={a}:{b},asetpts=PTS-STARTPTS,'
              f'afade=t=in:st=0:d=0.05,afade=t=out:st={b-a-0.08:.3f}:d=0.08,volume={g}dB,adelay={int(T*1000)}|{int(T*1000)}[v{i}]')
n = len(chunks); mi = n
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,highpass=f=90,afftdn=nf=-36:nr=10,loudnorm=I=-16:TP=-2:LRA=9[vo]')
# ---- music: drop lands on M1; loop two bars (54.34-58.22) four times to cover the ending ----
tM1 = starts['M1_f']; trim = 31.06 - tM1
fc.append(f'[{mi}:a]atrim={trim:.3f}:58.22,asetpts=PTS-STARTPTS[m0];[{mi}:a]atrim=54.34:58.22,asetpts=PTS-STARTPTS,asplit=4[l1][l2][l3][l4];'
          f'[m0][l1][l2][l3][l4]concat=n=5:v=0:a=1,'
          f"volume='0.32+0.48*(1-min(max((t-5.5)/0.8,0),1))+0.68*(min(max((t-{tM1-4.3:.2f})/3.6,0),1)-min(max((t-{tH4-0.4:.2f})/0.5,0),1))+0.45*min(max((t-{dur1-0.3:.2f})/0.5,0),1)':eval=frame,"
          f'afade=t=out:st={TOTAL-2.2:.3f}:d=2.2,atrim=0:{TOTAL:.3f}[mus]')
fc.append('[vo][mus]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[aout]')
run('audio', ins + ['-i', MUSIC, '-filter_complex', ';'.join(fc), '-map', '[aout]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{S}/mix3.wav'])

run('final', ['-i', f'{S}/part1.mp4', '-i', f'{S}/mix3.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL])
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', FINAL]))
print('final:', info['format'], flush=True)
r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('\n'.join(l for l in r.stderr.splitlines() if l.strip().startswith(('I:', 'LRA:', 'Peak:'))), flush=True)
run('sheet', ['-i', FINAL, '-vf', 'fps=1,scale=180:320,tile=11x6:padding=3:margin=3:color=white', '-frames:v', '1', f'{S}/final3_sheet.jpg'])
print('FINAL:', FINAL, flush=True)
