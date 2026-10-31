#!/usr/bin/python3
"""Assemble v6B = approved B + uninstall opening, jargon rain + NOT A LECTURE, red-collage beat, slow push on "Join".
Same mix rules as assemble3.py B; differences:
  - VO anchored to measured segment starts; the games line now anchors to the orbit shot (a beat was inserted before it)
  - the intro-loud music ducks as her first line starts (it stayed loud 5.5s into the hook in B: voice sounded muted); first line +2 dB
  - the drop must still land on the M6L class shot, which is now 3.4s later than the track allows, so two build bars
    are repeated (bar grid 1.94s, offset 0.02) and the rest is a short adelay, as B already had."""
import subprocess, os, sys, shlex, time, json, math
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'; VO = S + "/../raw/VO's/unzipped/Vo"
MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
FINAL = '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/wealth-conversation/WealthConversation_corp_v6B_cinematic-plus-fx.mp4'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ORDER = ['S0_fx', 'AB_fB_f', 'Q_fxB', 'C_f', 'H2_fB6_t', 'C6_fx', 'HG3_fB6_t', 'H5B6_f', 'M6W_f', 'H4_fB6_f', 'END']
VOS = [('Hook.m4a', 4.97, 10.69, 'AB_fB_f', 0.0, 2), ('Rungtha Lane 5 2.m4a', 12.77, 21.32, 'C_f', 0.31),
       ('Rungtha Lane 6.m4a', 2.92, 4.42, 'C_f', 8.86, -5), ('After no boring lecture.m4a', 2.64, 9.41, 'HG3_fB6_t', 0.16 - 4 / 30),
       ('Walsingham House School.m4a', 36.80, 46.25, 'H5B6_f', -0.09),
       ('Rungtha Lane 9.m4a', 16.62, 27.85, 'H4_fB6_f', -0.25), ('Rungtha Lane 10.m4a', 29.15, 32.74, 'H4_fB6_f', 10.98), ('Rungtha Lane 11.m4a', 11.42, 13.95, 'H4_fB6_f', 14.57)]

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-2000:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)
def nframes(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))

# tighten the pause after "No boring lectures.": end H2 just after the word (179 of 183 frames), drop 4 silent frames off the games shot
for src, dst, flt in (('H2_fB6_f', 'H2_fB6_t', 'trim=end_frame=179'), ('HG3_fB6_f', 'HG3_fB6_t', 'trim=start_frame=4,setpts=PTS-STARTPTS')):
    run('trim ' + dst, ['-i', f'{SEG}/{src}.mp4', '-vf', flt, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an', f'{SEG}/{dst}.mp4'])
starts = {}; t = 0.0
for p in ORDER: starts[p] = t; t += nframes(f'{SEG}/{p}.mp4') / 30
print('starts:', {k: round(v, 3) for k, v in starts.items()}, flush=True)
lst = f'{S}/main_6B.txt'; open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in ORDER))
run('concat', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{S}/part_6B.mp4'])
TOTAL = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{S}/part_6B.mp4']))
tM1, tH4, tEND, t0 = starts['M6W_f'], starts['H4_fB6_f'], starts['END'], starts['AB_fB_f']

ins, fc, chunks = [], [], []
for i, v in enumerate(VOS):
    f, a, b, seg, off = v[:5]; g = v[5] if len(v) > 5 else 0; T = starts[seg] + off; chunks.append((f, a, b, round(T, 3)))
    ins += ['-i', f'{VO}/{f}']
    fc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={a}:{b},asetpts=PTS-STARTPTS,'
              f'afade=t=in:st=0:d=0.05,afade=t=out:st={b-a-0.08:.3f}:d=0.08,volume={g}dB,adelay={int(T*1000)}|{int(T*1000)}[v{i}]')
n = len(VOS); mi = n
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,highpass=f=90,afftdn=nf=-36:nr=10,loudnorm=I=-16:TP=-2:LRA=9[vo]')
# music: drop (31.06) on tM1.  Repeat 2 bars of the build at bar 4 (3.90-7.78) and delay the rest.
BAR = 1.94; REP = 2 * BAR; lead = tM1 - 31.06 - REP
assert lead >= 0, lead
loops = max(1, math.ceil((TOTAL - (58.22 + REP + lead)) / 3.88) + 1)
fc.append(f'[{mi}:a]asplit=3[ma][mb][mc];[ma]atrim=0:7.78,asetpts=PTS-STARTPTS[m1];[mb]atrim=3.90:58.22,asetpts=PTS-STARTPTS[m2];'
          f'[mc]atrim=54.34:58.22,asetpts=PTS-STARTPTS,asplit={loops}' + ''.join(f'[l{k}]' for k in range(loops)) + ';'
          f'[m1][m2]' + ''.join(f'[l{k}]' for k in range(loops)) + f'concat=n={loops+2}:v=0:a=1,adelay={int(lead*1000)}|{int(lead*1000)},'
          f"volume='0.32+0.48*(1-min(max((t-{t0-0.4:.2f})/0.6,0),1))+0.68*(min(max((t-{tM1-4.3:.2f})/3.6,0),1)-min(max((t-{tH4-0.4:.2f})/0.5,0),1))+0.45*min(max((t-{tEND-0.3:.2f})/0.5,0),1)':eval=frame,"
          f'afade=t=out:st={TOTAL-2.2:.3f}:d=2.2,atrim=0:{TOTAL:.3f}[mus]')
fc.append('[vo][mus]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[aout]')
run('audio', ins + ['-i', MUSIC, '-filter_complex', ';'.join(fc), '-map', '[aout]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{S}/mix_6B.wav'])
run('final', ['-i', f'{S}/part_6B.mp4', '-i', f'{S}/mix_6B.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL])
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', FINAL]))
r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
I = float([l for l in r.stderr.splitlines() if l.strip().startswith('I:')][-1].split()[1])
if abs(I + 14) > 0.3:          # one-pass loudnorm can land ~1 dB off: trim the gain to -14 LUFS
    run('gain', ['-i', FINAL, '-c:v', 'copy', '-af', f'volume={-14 - I:.2f}dB', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', S + '/tmp6B.mp4'])
    os.replace(S + '/tmp6B.mp4', FINAL)
    r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('final:', info['format'], '| music lead', round(lead, 3), '|', ' '.join(l.strip() for l in r.stderr.splitlines() if l.strip().startswith(('I:', 'Peak:'))), flush=True)
run('sheet', ['-i', FINAL, '-vf', 'fps=1,scale=180:320,tile=11x6:padding=3:margin=3:color=white', '-frames:v', '1', FINAL.replace('.mp4', '_contact-sheet.jpg')])
json.dump({'starts': starts, 'chunks': chunks}, open(f'{S}/meta_6B.json', 'w'), indent=1)
print('FINAL:', FINAL, flush=True)
