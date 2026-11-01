#!/usr/bin/python3
"""Flagship course promo — step 3: concat, voice, music, mix, final.
Voice: each spoken line levelled on its own (loudnorm I=-18); students speak in their own camera audio, levelled the same way.
Music (rebuilt 1 Nov after "sound is on off across"): v1 ducked to 0.06 under every line and jumped back to 0.9 in every
gap, a ~25 dB swing several times a minute. Now a steady bed sits under her voice the whole way through; gaps shorter
than BRIDGE stay down at a slightly lifted bed, and the music only comes up to full on the three long moments that are
meant to be music (the opening, the drop, the end card). Ramps are slow, so nothing pops.
Prints voice-over-music per line (target >= 15 dB); final loudnorm -14 LUFS (+ gain trim if one pass lands >0.3 dB off)."""
import subprocess, os, sys, shlex, time, json, math
import numpy as np
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG, VO, HUB, SDR = W + '/seg', W + '/vo/Vo', W + '/hub', W + '/sdr'
MUSIC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3'
FINAL = os.environ.get('OUT') or '/Users/lollyg/Documents/investing for Mummies/deliverables/videos/flagship-course/IFM Flagship Course - Nariman Point.mp4'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ORDER = ['COLD', 'S0_fx', 'H1_hf', 'H2_fx', 'C1_fx', 'H3_fx', 'K_hf', 'T1_hf', 'T2_hf', 'T3_hf', 'Q_hf', 'WALK2', 'H5_f', 'CERTW', 'END']
# (source, [(a, b), ...] pieces played back to back, segment, offset into it, gain dB)
VOS = [(f'{VO}/Hook.m4a', [(4.97, 10.69)], 'H1_hf', 0.10, 2),
       (f'{VO}/Rungtha Lane 6.m4a', [(2.92, 4.42)], 'H2_fx', 0.10, 0),
       (f'{VO}/After no boring lecture.m4a', [(2.64, 9.41)], 'H3_fx', 0.05, 0),
       (f'{SDR}/IFM-555.mov', [(47.44, 47.44 + 87 / 30), (54.44, 54.44 + 41 / 30), (59.28, 59.28 + 50 / 30)], 'T1_hf', 0.0, 0),
       (f'{SDR}/IFM-455.mov', [(7.48, 7.48 + 119 / 30)], 'T2_hf', 0.0, 0),
       (f'{HUB}/IFM-397/IMG_6785.MOV', [(100.38, 100.38 + 147 / 30)], 'T3_hf', 0.0, 0),
       (f'{HUB}/IFM-342/Brand Awareness .mp4', [(32.90, 43.36)], 'Q_hf', 0.0, 0),   # to the end of "again" ("Because" starts 38.80); her reel's own music bed is ~20 dB under her
       (f'{VO}/Walsingham House School.m4a', [(36.80, 46.25)], 'WALK2', 0.05, 0),
       (f'{VO}/Rungtha Lane 9.m4a', [(16.62, 27.85)], 'H5_f', 0.05, 0)]
BED, BRIDGED, FULL = 0.10, 0.16, 0.80     # music gain under voice / in a short gap between lines / on the music moments
BRIDGE = 2.0                              # gaps shorter than this never bring the music up to full
SR = 48000

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-2000:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)
def nframes(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p]).decode().strip().strip(','))
def wav_in(p):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout, np.int16)
    return x.reshape(-1, 2).astype(np.float64) / 32768
def wav_out(x, p):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', p],
                   input=(np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)

starts = {}; t = 0.0
for p in ORDER: starts[p] = t; t += nframes(f'{SEG}/{p}.mp4') / 30
TOTAL = t
print('starts:', {k: round(v, 3) for k, v in starts.items()}, '| total', round(TOTAL, 3), flush=True)
# join by frame count, not timestamps (a copy-concat dropped 4 frames at K_f and put everything after it 133 ms late)
ins = sum((['-i', f'{SEG}/{p}.mp4'] for p in ORDER), [])
fcv = ''.join(f'[{i}:v]setpts=PTS-STARTPTS,setsar=1[v{i}];' for i in range(len(ORDER))) + ''.join(f'[v{i}]' for i in range(len(ORDER))) + \
      f'concat=n={len(ORDER)}:v=1:a=0,setpts=N/30/TB[cat]'
# HyperFrames light leak (on black) screen-blended across two section cuts, centred on the cut (v8, user's pick):
# the drop -> the first student, and "Walk away" -> her closing line. Screen with black changes nothing elsewhere.
LEAK = W + '/hfout/leak.mp4'; LEAK_AT = [starts['T1_hf'] - 1.1, starts['H5_f'] - 1.1]; li = len(ORDER)
ins += ['-i', LEAK]
fcv += (f';color=c=black:s=1080x1920:r=30:d={TOTAL:.3f},format=gbrp[blk];[{li}:v]format=gbrp,split={len(LEAK_AT)}' + ''.join(f'[lk{k}]' for k in range(len(LEAK_AT))) + ';')
prev = 'blk'
for k, t0 in enumerate(LEAK_AT):
    fcv += f'[lk{k}]setpts=PTS-STARTPTS+{t0:.3f}/TB[lt{k}];[{prev}][lt{k}]overlay=0:0:eof_action=pass:format=gbrp[tr{k}];'
    prev = f'tr{k}'
fcv += f'[cat]format=gbrp[catg];[catg][{prev}]blend=all_mode=screen:shortest=1,format=yuv420p[vx]'
# v10 whip-pans: 4 frames either side of three hard cuts get a hard horizontal motion blur (with a whoosh, below), so
# the cut reads as a fast camera whip. Frames are only blurred, never moved, so sync is untouched.
WHIPS = [starts['H1_hf'], starts['Q_hf'], starts['WALK2']]
en = '+'.join(f'between(t,{tc - 4 / 30:.4f},{tc + 3.5 / 30:.4f})' for tc in WHIPS)
fcv += f";[vx]split[va][vb];[vb]gblur=sigma=55:sigmaV=0.6,eq=brightness=0.04[vbl];[va][vbl]overlay=0:0:enable='{en}'[v]"
run('concat', ins + ['-filter_complex', fcv, '-map', '[v]', '-fps_mode', 'passthrough', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', f'{W}/part.mp4'])
assert nframes(f'{W}/part.mp4') == round(TOTAL * 30), (nframes(f'{W}/part.mp4'), TOTAL * 30)

# ---- voice stem ----
# lip-sync: each voice moves by its shot's measured picture offset (measure_sync.py) and by the 25 ms the AAC encoder
# adds, so lips and sound meet in the delivered file, not just on the timeline
PIC = json.load(open(f'{W}/picoff.json')); AAC = 0.025
SHOT = {'H1_hf': 'H1', 'H2_fx': 'H2', 'H3_fx': 'H3', 'H5_f': 'H5', 'Q_hf': 'Qc', 'T1_hf': 'T1a', 'T2_hf': 'T2', 'T3_hf': 'T3'}
ins, fc, chunks = [], [], []
for i, (src, pieces, seg, off, g) in enumerate(VOS):
    T = starts[seg] + off - PIC.get(SHOT.get(seg, ''), 0.0) - AAC; dur = sum(b - a for a, b in pieces); chunks.append((os.path.basename(src), pieces, round(T, 3), dur))
    ins += ['-i', src]; parts = []
    for k, (a, b) in enumerate(pieces):   # each piece gets tiny fades so a jump cut doesn't click
        fc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,'
                  f'afade=t=in:st=0:d=0.03,afade=t=out:st={b-a-0.04:.3f}:d=0.04[p{i}_{k}]')
        parts.append(f'[p{i}_{k}]')
    fc.append(''.join(parts) + f'concat=n={len(parts)}:v=0:a=1,highpass=f=90,afftdn=nf=-36:nr=10,loudnorm=I=-18:TP=-3:LRA=7,aresample=48000,'
              f'afade=t=in:st=0:d=0.05,afade=t=out:st={dur-0.08:.3f}:d=0.08,volume={g}dB,adelay={int(T*1000)}|{int(T*1000)}[v{i}]')
n = len(VOS)
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-2:LRA=9,apad,atrim=0:{TOTAL:.3f}[vo]')
run('voice', ins + ['-filter_complex', ';'.join(fc), '-map', '[vo]', '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_s16le', f'{W}/stem_vo.wav'])

# ---- music map: the drop (31.06) on the course shot K_f; the track is 60s, so 8 groove bars repeat after the drop
# (46.58 -> back to 31.06, bar 1.94s) and the last two bars loop under the end card ----
tD = starts['K_hf']; ts = 31.06 - tD; assert ts >= 0, ts
loops = max(1, math.ceil((TOTAL - (46.58 - ts) - (58.22 - 31.06)) / 3.88) + 1)
run('music map', ['-i', MUSIC, '-filter_complex',
    f'[0:a]asplit=3[ma][mb][mc];[ma]atrim={ts:.3f}:46.58,asetpts=PTS-STARTPTS[m1];[mb]atrim=31.06:58.22,asetpts=PTS-STARTPTS[m2];'
    f'[mc]atrim=54.34:58.22,asetpts=PTS-STARTPTS,asplit={loops}' + ''.join(f'[l{k}]' for k in range(loops)) + ';'
    f'[m1][m2]' + ''.join(f'[l{k}]' for k in range(loops)) + f'concat=n={loops+2}:v=0:a=1,atrim=0:{TOTAL:.3f}[m]',
    '-map', '[m]', '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_s16le', f'{W}/mus_raw.wav'])

# ---- music envelope ----
spans = sorted((T - 0.30, T + d + 0.15) for (_, _, T, d) in chunks)        # music is down a beat before each line starts
merged, bridges = [list(spans[0])], []
for s, e in spans[1:]:
    if s - merged[-1][1] < BRIDGE: bridges.append((merged[-1][1], s)); merged[-1][1] = max(merged[-1][1], e)
    else: merged.append([s, e])
fps = 100; L = np.full(int(TOTAL * fps) + 1, FULL)
POST = 0.62    # the groove after the drop runs ~4 dB hotter than the intro: the bed drops with it, hidden under the drop itself
for s, e in merged: L[max(0, int(s * fps)):int(e * fps)] = BED * (POST if s > tD else 1)
for s, e in bridges: L[int(s * fps):int(e * fps)] = BRIDGED * (POST if s > tD else 1)
k = int(0.45 * fps); L = np.convolve(np.pad(L, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]   # ~0.9s smooth ramps
print('music up to full on:', [(round(merged[i][1], 1), round(merged[i + 1][0], 1)) for i in range(len(merged) - 1)],
      '| opening to', round(merged[0][0], 1), '| end from', round(merged[-1][1], 1), flush=True)
m = wav_in(f'{W}/mus_raw.wav'); tt = np.arange(len(m)) / SR
g = np.interp(tt, np.arange(len(L)) / fps, L)
g *= np.clip(tt / 0.4, 0, 1) * np.clip((TOTAL - tt) / 2.2, 0, 1)        # fade in 0.4s, out over the last 2.2s
wav_out(m * g[:, None], f'{W}/stem_mus.wav')

# ---- v10 sound design: a sound on every visible action (licences: Mixkit free SFX / CC0 / Pixabay, all commercial OK)
GE = os.path.expanduser('~/.claude/skills/ghost-editor/library/sfx/'); MU = os.path.expanduser('~/.claude/skills/media-use/audio/assets/sfx/')
SFX = [  # (shot, seconds into it, file, gain dB)
    *[('COLD', 0.3 * k, GE + ('impact-1.wav', 'impact-2.wav')[k % 2], -9) for k in range(6)], ('COLD', 0.0, GE + 'cc0-riser-short.wav', -14),
    ('S0_fx', 0.00, GE + 'tech-glitch-1.wav', -10), ('S0_fx', 2.50, GE + 'tech-ui-confirm.wav', -8),           # uninstall / "Done"
    ('H1_hf', -0.10, GE + 'whoosh-2.wav', -12), ('H1_hf', 3.62, GE + 'cinematic-deep-boom.wav', -7),           # whip in / REALLY?
    ('H2_fx', 0.08, GE + 'tech-keyboard-burst.wav', -14), ('H2_fx', 0.50, GE + 'impact-2.wav', -6),            # jargon rain / stamp
    ('C1_fx', 0.00, GE + 'cc0-glitch-hit.wav', -8),                                                            # BORING?
    ('H3_fx', 0.15, GE + 'whoosh-1.wav', -13), ('H3_fx', 3.98, GE + 'whoosh-cine.wav', -11),                   # orbit / CHALLENGE
    ('H3_fx', 5.60, GE + 'cinematic-rumble-riser.wav', -10),                                                   # rabbit-hole into the drop
    # v14: no sound effects on the Flagship Course drop (user) — the music carries it
    ('T1_hf', -0.6, GE + 'whoosh-cine.wav', -15),                                                             # light leak
    ('Q_hf', -0.10, GE + 'whoosh-3.wav', -12), ('Q_hf', 3.367 + 1.12, MU + 'sparkle.mp3', -9),                 # whip / ASK AGAIN
    ('Q_hf', 3.367 + 3.733, MU + 'whoosh-short.mp3', -16), ('Q_hf', 3.367 + 5.05, GE + 'pencil-write.wav', -15), ('Q_hf', 3.367 + 6.0, MU + 'whoosh-short.mp3', -13),  # strike / roll
    ('WALK2', -0.10, GE + 'whoosh-2.wav', -12), *[('WALK2', t, GE + 'pop-2.wav', -14) for t in (0.2, 0.95, 3.94, 6.80)],  # v20: stickers drop
    *[('WALK2', t, GE + 'tech-ui-confirm.wav', -11) for t in (2.70, 5.68, 8.66)],                              # ticks, on her words
    ('H5_f', -0.6, GE + 'whoosh-cine.wav', -15),                                                              # light leak
    ('H5_f', 0.12, GE + 'whoosh-2.wav', -15), *[('H5_f', 0.15 + 0.09 * k, GE + 'pop-%d.wav' % (k % 3 + 1), -21) for k in range(13)],  # v19 headline wall
    ('H5_f', 0.15 + 1.27, GE + 'impact-2.wav', -12),                                                          # "Too much to track?"
    *[('H5_f', t, GE + 'pop-1.wav', -13) for t in (4.25, 5.97, 7.37)],                                         # stickers
    # v17 certificate beat: flash on the handover, whoosh as the certificate grid lands, a pop per stat, click on Follow
    ('CERTW', 0.10, GE + 'tech-camera-flash.wav', -10), ('CERTW', 1.45, GE + 'whoosh-2.wav', -14),
    *[('CERTW', 1.62 + 0.07 * k, GE + 'pop-1.wav', -21) for k in range(6)],
    *[('CERTW', t, GE + 'pop-2.wav', -15) for t in (2.35, 2.95, 3.55)], ('CERTW', 4.26, GE + 'click-1.wav', -10),
    ('END', 3.30, MU + 'chime.mp3', -11)]                                                                      # flash / logo (v15: the swell under the logo removed: user heard it as a 'MOOO')
sins, sfc = [], []
for i, (seg, lt, f, g) in enumerate(SFX):
    T = max(0.0, starts[seg] + lt); sins += ['-i', f]
    sfc.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={int(T * 1000)}|{int(T * 1000)}[s{i}]')
sfc.append(''.join(f'[s{i}]' for i in range(len(SFX))) + f'amix=inputs={len(SFX)}:normalize=0:dropout_transition=0,apad,atrim=0:{TOTAL:.3f}[sx]')
run('sfx', sins + ['-filter_complex', ';'.join(sfc), '-map', '[sx]', '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_s16le', f'{W}/stem_sfx.wav'])

# ---- mix + final ----
run('mix', ['-i', f'{W}/stem_vo.wav', '-i', f'{W}/stem_mus.wav', '-i', f'{W}/stem_sfx.wav', '-filter_complex',
            # sound effects duck under her voice (sidechain), so a hit never covers a word — the voice stays the hero
            '[0:a]asplit=2[vo][vsc];[2:a][vsc]sidechaincompress=threshold=0.006:ratio=12:attack=4:release=280[sxd];'
            '[vo][1:a][sxd]amix=inputs=3:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1:LRA=11[a]', '-map', '[a]', '-ar', str(SR), '-c:a', 'pcm_s16le', f'{W}/mix.wav'])
# v9: light temporal film grain over everything, so camera, iPhone and AI-made clips read as one film
run('final', ['-i', f'{W}/part.mp4', '-i', f'{W}/mix.wav', '-map', '0:v', '-map', '1:a', '-vf', 'noise=c0s=5:c0f=t+u', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL])
def lufs():
    r = subprocess.run(['ffmpeg', '-nostdin', '-i', FINAL, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    return float([l for l in r.stderr.splitlines() if l.strip().startswith('I:')][-1].split()[1]), r.stderr
I, _ = lufs()
if abs(I + 14) > 0.3:
    run('gain', ['-i', FINAL, '-c:v', 'copy', '-af', f'volume={-14 - I:.2f}dB', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', W + '/tmp.mp4'])
    os.replace(W + '/tmp.mp4', FINAL)
I, err = lufs()
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', FINAL]))
print('final:', info['format'], '|', ' '.join(l.strip() for l in err.splitlines() if l.strip().startswith(('I:', 'Peak:'))), flush=True)
run('sfx ducked', ['-i', f'{W}/stem_sfx.wav', '-i', f'{W}/stem_vo.wav', '-filter_complex', '[0:a][1:a]sidechaincompress=threshold=0.006:ratio=12:attack=4:release=280[d]',
                   '-map', '[d]', '-c:a', 'pcm_s16le', f'{W}/stem_sfx_d.wav'])
stems = [wav_in(f'{W}/{x}.wav').mean(1) for x in ('stem_vo', 'stem_mus', 'stem_sfx_d')]; L_ = min(len(x) for x in stems)
v, mu = stems[0][:L_], stems[1][:L_] + stems[2][:L_]   # voice vs music + ducked sound effects
for (name, _, T, d) in chunks:
    a, b = int((T + 0.2) * SR), int((T + d - 0.2) * SR)
    print(f'  {name:32s} voice over music {20*np.log10(np.sqrt(np.mean(v[a:b]**2))/max(1e-9, np.sqrt(np.mean(mu[a:b]**2)))):+.1f} dB', flush=True)
run('sheet', ['-i', FINAL, '-vf', 'fps=1,scale=180:320,tile=12x6:padding=3:margin=3:color=white', '-frames:v', '1', FINAL.replace('.mp4', ' - contact sheet.jpg')])
json.dump({'starts': starts, 'chunks': chunks, 'music_start': ts, 'merged': merged}, open(f'{W}/meta.json', 'w'), indent=1)
print('FINAL:', FINAL, flush=True)
