#!/usr/bin/python3
"""Assemble: concat segments, crossfade to end card, build VO + music mix, mux, QC."""
import subprocess, os, sys, shlex, time, json

S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'
MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
VO = S + '/vo_full.wav'
OUTDIR = '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/wealth-conversation'
os.makedirs(OUTDIR, exist_ok=True)
FINAL = OUTDIR + '/MAIN_Comp_v2_games-cut.mp4'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']

def run(name, args, ok_exit=(0,)):
    t = time.time()
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode not in ok_exit:
        print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-2000:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True); return r

ORDER = ['AB_f', 'Q', 'C_f', 'H2', 'DE_f', 'H3', 'FG_f', 'M1_f', 'M2_f', 'M3_f', 'M4_f', 'M5_f', 'M6_f', 'H4']
lst = S + '/main.txt'
open(lst, 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in ORDER))
run('concat main', ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', f'{S}/part1.mp4'])
dur1 = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{S}/part1.mp4']))
XF = 0.30
print(f'part1 = {dur1:.3f}s (expected 59.850)', flush=True)
TOTAL = dur1 + 3.45 - XF

# ---- audio -----------------------------------------------------------------------
# VO pieces: (orig_start, orig_end, T_start)
# T starts derived from the frame-accurate segment starts: H2 @7.767 (orig 18.48), H4 @42.600 (orig 42.60)
pieces = [(0.00, 5.72, 0.00), (16.50, 33.32, 5.78), (42.35, 59.70, 42.35)]
vo_chain = []
for i, (a, b, t) in enumerate(pieces):
    vo_chain.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.05,afade=t=out:st={b-a-0.08:.3f}:d=0.08,adelay={int(t*1000)}|{int(t*1000)}[v{i}]')
vo_mix = ''.join(f'[v{i}]' for i in range(len(pieces))) + f'amix=inputs={len(pieces)}:normalize=0:dropout_transition=0,highpass=f=70,loudnorm=I=-16:TP=-2:LRA=9[vo]'
# music: drop the first 2 quiet bars (3.88s) so the drop lands at T=27.18; extend by looping 2 bars (54.34-58.22) x3
# montage M1 actually starts at T=27.133, so the music drop (31.06 in the source) must sit there: trim 3.927s
mus = ('[1:a]atrim=3.927:58.22,asetpts=PTS-STARTPTS[m0];'
       '[1:a]atrim=54.34:58.22,asetpts=PTS-STARTPTS,asplit=3[l1][l2][l3];'
       '[m0][l1][l2][l3]concat=n=4:v=0:a=1,'
       # ducking envelope: 0.8 under the hook VO -> 0.32 under VO -> build to 1.0 for the montage -> 0.32 under closing VO -> 0.7 on the end card
       "volume='0.32+0.48*(1-min(max((t-5.5)/0.8,0),1))+0.68*(min(max((t-22.9)/3.6,0),1)-min(max((t-42.3)/0.5,0),1))+0.38*min(max((t-59.6)/0.6,0),1)':eval=frame,"
       f'afade=t=out:st={TOTAL-3.0:.3f}:d=3.0,atrim=0:{TOTAL:.3f}[mus]')
fc = ';'.join(vo_chain) + ';' + vo_mix + ';' + mus + ';[vo][mus]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[aout]'
run('audio', ['-i', VO, '-i', MUSIC, '-filter_complex', fc, '-map', '[aout]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{S}/mix.wav'])

# ---- video: crossfade to end card, mux ---------------------------------------------
run('final', ['-i', f'{S}/part1.mp4', '-i', f'{SEG}/END.mp4', '-i', f'{S}/mix.wav',
              '-filter_complex', f'[0:v][1:v]xfade=transition=fade:duration={XF}:offset={dur1-XF:.3f}[v]',
              '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL])

# ---- QC --------------------------------------------------------------------------------
info = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,r_frame_rate,codec_name', '-of', 'json', FINAL])
print(json.dumps(json.loads(info), indent=1), flush=True)
r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('\n'.join(l for l in r.stderr.splitlines()[-12:] if l.strip()), flush=True)
run('sheet', ['-i', FINAL, '-vf', 'fps=1,scale=180:320,tile=11x6:padding=3:margin=3:color=white', '-frames:v', '1', f'{S}/final_sheet.jpg'])
print('FINAL:', FINAL, flush=True)
