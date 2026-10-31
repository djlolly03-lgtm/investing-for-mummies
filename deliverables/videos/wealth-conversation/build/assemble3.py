#!/usr/bin/python3
"""Assemble one of the v4 versions (A sticker / B cinematic / C hype cut). Usage: assemble3.py A|B|C"""
import subprocess, os, sys, shlex, time, json, math
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'; VO = S + "/../raw/VO's/unzipped/Vo"
MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
OUTDIR = '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/wealth-conversation'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
V = sys.argv[1]
MONT = ['M1_f', 'M2_f', 'M3_f', 'M4_f', 'M5_f', 'M6_f']
CLOSE = [('Rungtha Lane 9.m4a', 16.62, 27.85, 'H4', -0.25, 0), ('Rungtha Lane 10.m4a', 29.15, 32.74, 'H4', 10.98, 0), ('Rungtha Lane 11.m4a', 11.42, 13.95, 'H4', 14.57, 0)]
CFG = {
    'A': dict(order=['AB_f', 'Q_fx', 'C_f', 'H2_fx', 'DE_f', 'H3_fA_f', 'FG_f'] + MONT + ['H4_fA_f', 'END'],
              vo=[('Hook.m4a', 4.97, 10.69, 'AB_f', 0.0, 0), ('Rungtha Lane 5 2.m4a', 12.77, 21.32, 'C_f', 0.31, 0),
                  ('Rungtha Lane 6.m4a', 2.92, 4.42, 'C_f', 8.86, -5), ('After no boring lecture.m4a', 2.64, 9.41, 'C_f', 10.36, 0)] + CLOSE,
              out='WealthConversation_corp_v4A_sticker.mp4'),
    'B': dict(order=['AB_fB_f', 'Q_fxB', 'C_f', 'H2_fB_f', 'HG3_fB_f', 'H5B_f', 'M6L_f', 'H4_fB_f', 'END'],
              vo=[('Hook.m4a', 4.97, 10.69, 'AB_fB_f', 0.0, 0), ('Rungtha Lane 5 2.m4a', 12.77, 21.32, 'C_f', 0.31, 0),
                  ('Rungtha Lane 6.m4a', 2.92, 4.42, 'C_f', 8.86, -5), ('After no boring lecture.m4a', 2.64, 9.41, 'C_f', 10.36, 0),
                  ('Walsingham House School.m4a', 36.80, 46.25, 'H5B_f', -0.09, 0)] + CLOSE,
              out='WealthConversation_corp_v4B_cinematic.mp4'),
    'C': dict(order=['AB_f', 'Q_fx', 'H2n_fx', 'DE_f', 'H3_fA_f', 'FG_f'] + MONT + ['H4_fA_f', 'END'],
              vo=[('Hook.m4a', 4.97, 10.69, 'AB_f', 0.0, 0), ('Rungtha Lane 6.m4a', 2.92, 4.42, 'H2n_fx', 0.183, -5),
                  ('After no boring lecture.m4a', 2.64, 9.41, 'H2n_fx', 1.683, 0)] + CLOSE,
              out='WealthConversation_corp_v4C_hypecut.mp4'),
}[V]
FINAL = OUTDIR + '/' + CFG['out']

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-2000:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True); return r

def nframes(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))

starts = {}; t = 0.0
for p in CFG['order']:
    starts[p] = t; t += nframes(f'{SEG}/{p}.mp4') / 30
# anchors by role: the closing shot is whichever H4 variant this version uses
anchor = dict(starts); anchor['H4'] = starts.get('H4_fA_f', starts.get('H4_fB_f'))
print(V, 'segment starts:', {k: round(v, 3) for k, v in starts.items()}, flush=True)
lst = f'{S}/main_{V}.txt'; open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in CFG['order']))
run('concat', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{S}/part_{V}.mp4'])
TOTAL = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{S}/part_{V}.mp4']))
tM1 = starts.get('M1_f', starts.get('M1s_f', starts.get('M6L_f'))); tH4 = anchor['H4']; tEND = starts['END']
print(f'drop at {tM1:.3f}s, closing at {tH4:.3f}s, end card at {tEND:.3f}s, total {TOTAL:.3f}s', flush=True)

ins = []; fc = []
for i, (f, a, b, seg, off, g) in enumerate(CFG['vo']):
    T = anchor[seg] + off; ins += ['-i', f'{VO}/{f}']
    fc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={a}:{b},asetpts=PTS-STARTPTS,'
              f'afade=t=in:st=0:d=0.05,afade=t=out:st={b-a-0.08:.3f}:d=0.08,volume={g}dB,adelay={int(T*1000)}|{int(T*1000)}[v{i}]')
n = len(CFG['vo']); mi = n
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,highpass=f=90,afftdn=nf=-36:nr=10,loudnorm=I=-16:TP=-2:LRA=9[vo]')
trim = 31.06 - tM1                       # the drop lands on the first montage card (or the hit shot)
loops = max(1, math.ceil((TOTAL - (58.22 - trim)) / 3.88) + 1)
m0 = f'atrim={trim:.3f}:58.22,asetpts=PTS-STARTPTS' if trim >= 0 else f'atrim=0:58.22,asetpts=PTS-STARTPTS,adelay={int(-trim*1000)}|{int(-trim*1000)}'
fc.append(f'[{mi}:a]{m0}[m0];[{mi}:a]atrim=54.34:58.22,asetpts=PTS-STARTPTS,asplit={loops}' + ''.join(f'[l{k}]' for k in range(loops)) + ';'
          f'[m0]' + ''.join(f'[l{k}]' for k in range(loops)) + f'concat=n={loops+1}:v=0:a=1,'
          f"volume='0.32+0.48*(1-min(max((t-5.5)/0.8,0),1))+0.68*(min(max((t-{tM1-4.3:.2f})/3.6,0),1)-min(max((t-{tH4-0.4:.2f})/0.5,0),1))+0.45*min(max((t-{tEND-0.3:.2f})/0.5,0),1)':eval=frame,"
          f'afade=t=out:st={TOTAL-2.2:.3f}:d=2.2,atrim=0:{TOTAL:.3f}[mus]')
fc.append('[vo][mus]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[aout]')
run('audio', ins + ['-i', MUSIC, '-filter_complex', ';'.join(fc), '-map', '[aout]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{S}/mix_{V}.wav'])
run('final', ['-i', f'{S}/part_{V}.mp4', '-i', f'{S}/mix_{V}.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL])
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', FINAL]))
r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('final:', info['format'], '|', ' '.join(l.strip() for l in r.stderr.splitlines() if l.strip().startswith(('I:', 'Peak:'))), flush=True)
run('sheet', ['-i', FINAL, '-vf', 'fps=1,scale=180:320,tile=11x6:padding=3:margin=3:color=white', '-frames:v', '1', FINAL.replace('.mp4', '_contact-sheet.jpg')])
print('FINAL:', FINAL, flush=True)
