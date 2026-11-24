#!/usr/bin/python3
"""EO Nagpur preview v2 (23 Nov 2026): preview v1 + EO Nagpur logo morph at the END too + a new music track.

Picture: opening logo clip (10s) -> generic 3.4s..56.067s with the v1 REALLY? and orbit/CHALLENGE shots
(rendered by eo_nagpur_v2.py into $TMP/really.mp4, $TMP/hg3.mp4) -> 0.4s fade -> EO Nagpur -> wordmark morph
(1.2s hold first) -> 0.3s fade -> generic ending from 56.6s (wordmark -> IFM emblem) + 1s hold.

Sound: the old mix is NOT reused. Hiral's voice comes from voice_stem.py (the phone VO, located in the mix at 0.98-0.99
correlation); the music is 'Hale Bopp (Boris Brejcha Remix)' (123 BPM) placed so its drop (100.82s) lands on the class
montage cut (generic 36.100s). A steady bed under her voice (never near-silent), full level in the gaps, both logo clips'
own whooshes mixed in low, 2.5s fade at the end, loudnorm -14 LUFS.
"""
import os, math, subprocess, numpy as np
FF = '/opt/homebrew/bin/ffmpeg'; FP = '/opt/homebrew/bin/ffprobe'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
DL = os.path.expanduser('~/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads')
GEN = os.path.join(ROOT, 'TWC Money Blueprint.mp4')
OPEN = os.path.join(os.environ['TMP'], 'split.mp4')   # v9: split screen built by opening_split.py (was the 10s logo clip)
END = os.path.join(DL, 'Logo_morphing_into_text_graphic_e1c4f0b4.mp4')
SONG = os.path.expanduser(os.environ.get('SONG', DL + '/Sunset Rooft Lounge.mp3'))   # v2/v3 Hale Bopp, v4 Fields Of Dreams, v5 back to Sunset (user)
TMP = os.environ['TMP']; VOICE = os.path.join(TMP, 'voice.wav')
OUT = os.environ.get('OUT', os.path.join(ROOT, 'TWC Money Blueprint - EO Nagpur PREVIEW v10.mp4'))
FPS, SR = 30, 48000
CUT = 102
OPEN_F = int(subprocess.run([FP, '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', OPEN], capture_output=True, text=True).stdout.strip().strip(','))                     # opening clip frames; generic resumes at frame 102 (3.4s)
SHIFT = (OPEN_F - CUT) / FPS               # generic time -> preview time (+6.6s)
A_END = 1682                               # generic frames up to the end of Hiral's last line (56.067s)
TAIL = 1698                                # generic resumes on the settled wordmark (56.6s)
X1, X2, HOLD_LOGO, HOLD_END = 12, 9, 0, 15
END_SS, END_SPEED, TAIL_SPEED = 0.9, 1.5, 1.5   # v10b: EO logo visible ~0.6s before the burst, then 1.5x (user)
DROP_SONG = float(os.environ.get('DROP_SONG', 81.5)); DROP_GEN = 36.100   # Fields Of Dreams lift; Hale Bopp drop was 100.82


def nframes(p):
    return int(subprocess.run([FP, '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames',
                               '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip().strip(','))


def dec(args, ch=2):
    r = subprocess.run([FF, '-nostdin', '-v', 'error'] + args + ['-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, np.float32).reshape(-1, ch).copy()


gen_n = nframes(GEN)
BORING_ON = os.environ.get('BORING', '0') == '1'   # v11/v12 silhouette BORING? beat - rejected 24 Nov, off = v10
BORING_F, EXTRA_F = (76, 76 - 66) if BORING_ON else (0, 0)                  # v11: 2.0s silhouette BORING? replaces the 1.07s red collage (frames 568-600)
EXTRA = EXTRA_F / FPS
partA = OPEN_F + (217 - CUT) + 49 + (600 - 266) + EXTRA_F + 202 + (A_END - 802)
logo_n = int(round((8 - END_SS) / END_SPEED * FPS))
tail_n = int(round((gen_n - TAIL) / TAIL_SPEED))
total = partA + logo_n - X1 + tail_n + HOLD_END - X2
T = total / FPS
print(f'partA {partA} frames, total {total} frames = {T:.2f}s')

# ---------------- picture ----------------
vid = os.path.join(TMP, 'v3_picture.mp4')
fc = (f'[1:v]scale=1080:1920:flags=lanczos,fps={FPS},trim=end_frame={OPEN_F},setpts=N/{FPS}/TB,setsar=1,format=yuv420p[o];'
      f'[0:v]trim=start_frame={CUT}:end_frame=217,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g1];'
      f'[2:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[r];'
      f'[8:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[gd];'
      + (f'[0:v]trim=start_frame=389:end_frame=534,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g2];[9:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[bo];' if BORING_ON else f'[0:v]trim=start_frame=389:end_frame=600,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g2];')
      +
      f'[3:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[h];'
      f'[5:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[wk];'
      f'[0:v]trim=start_frame=1083:end_frame=1245,setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g3];'
      f'[6:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[sl];'
      f'[7:v]setpts=N/{FPS}/TB,setsar=1,format=yuv420p[pc];'
      f'[0:v]trim=start_frame=1574:end_frame={A_END},setpts=N/{FPS}/TB,setsar=1,format=yuv420p[g4];'
      + (f'[o][g1][r][gd][g2][bo][h][wk][g3][sl][pc][g4]concat=n=12' if BORING_ON else f'[o][g1][r][gd][g2][h][wk][g3][sl][pc][g4]concat=n=11') + f':v=1:a=0,fps={FPS},settb=1/{FPS}[A];'
      f'[4:v]trim=start={END_SS},setpts=(PTS-STARTPTS)/{END_SPEED},scale=1080:1920:flags=lanczos,fps={FPS},trim=end_frame={logo_n},'
      f'setpts=N/{FPS}/TB,settb=1/{FPS},setsar=1,format=yuv420p[B];'
      f'[0:v]trim=start_frame={TAIL},setpts=(PTS-STARTPTS)/{TAIL_SPEED},fps={FPS},trim=end_frame={tail_n},setpts=N/{FPS}/TB,tpad=stop_mode=clone:stop_duration={HOLD_END / FPS},'
      f'setpts=N/{FPS}/TB,settb=1/{FPS},setsar=1,format=yuv420p[C];'
      f'[A][B]xfade=transition=fade:duration={X1 / FPS}:offset={(partA - X1) / FPS}[AB];'
      f'[AB][C]xfade=transition=fade:duration={X2 / FPS}:offset={(partA - X1 + logo_n - X2) / FPS},format=yuv420p[v]')
subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-i', GEN, '-i', OPEN, '-i', f'{TMP}/really.mp4', '-i', f'{TMP}/hg3.mp4', '-i', END, '-i', f'{TMP}/walk.mp4', '-i', f'{TMP}/zoom.mp4', '-i', f'{TMP}/paper.mp4', '-i', f'{TMP}/grid.mp4', '-i', f'{TMP}/boring.mp4',
                '-filter_complex', fc, '-map', '[v]', '-frames:v', str(total), '-c:v', 'libx264', '-crf', '17', '-preset', 'slow',
                '-pix_fmt', 'yuv420p', vid], check=True)
assert nframes(vid) == total, nframes(vid)

# v13 (user, 24 Nov): three slight pauses - after "money blueprint", after CHALLENGE (before "Walk away"), before "Join".
# Each stretches the silent frames of that gap (generic window a..b) by ADD frames with blended in-betweens; no freeze.
PAUSE_ADD = int(os.environ.get('PAUSE_ADD', 0))
PAUSES = [(12.42, 12.82), (26.55, 26.73), (52.14, 52.46)] if PAUSE_ADD else []
pf = lambda g: int(round(g * FPS)) + (OPEN_F - CUT)          # generic time -> picture frame (BORING off)
if PAUSES:
    parts, segs, prev = [], [], 0
    for j, (a, b) in enumerate(PAUSES):
        fa, fb = pf(a), pf(b); n0 = fb - fa; n1 = n0 + PAUSE_ADD
        parts.append(f'[0:v]trim=start_frame={prev}:end_frame={fa},setpts=N/{FPS}/TB[s{j}];')
        parts.append(f'[0:v]trim=start_frame={fa}:end_frame={fb},setpts=N*{(n1 - 1) / (n0 - 1):.6f}/{FPS}/TB,'
                     f'minterpolate=fps={FPS}:mi_mode=blend,tpad=stop_mode=clone:stop=4,trim=end_frame={n1},setpts=N/{FPS}/TB[w{j}];')
        segs += [f'[s{j}]', f'[w{j}]']; prev = fb
    parts.append(f'[0:v]trim=start_frame={prev},setpts=N/{FPS}/TB[s9];'); segs.append('[s9]')
    fc2 = ''.join(parts).replace('[0:v]', '[x]', 0)
    fc2 = f'[0:v]split={len(segs)}' + ''.join(f'[i{k}]' for k in range(len(segs))) + ';' + ''.join(
        pp.replace('[0:v]', f'[i{k}]', 1) for k, pp in enumerate(parts)) + ''.join(segs) + f'concat=n={len(segs)}:v=1:a=0,settb=1/{FPS},format=yuv420p[v]'
    vid2 = os.path.join(TMP, 'v3_picture_p.mp4'); total += PAUSE_ADD * len(PAUSES)
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-i', vid, '-filter_complex', fc2, '-map', '[v]', '-frames:v', str(total),
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', vid2], check=True)
    assert nframes(vid2) == total, (nframes(vid2), total)
    vid = vid2; T = total / FPS
    print(f'pauses: +{PAUSE_ADD} frames x{len(PAUSES)}, total {total} = {T:.2f}s')

# ---------------- sound ----------------
N = int(round(T * SR))     # T already includes the pauses
s = lambda t: int(round(t * SR))
NV = N - (s(PAUSE_ADD / FPS) * len(PAUSES) if PAUSES else 0)
voice = np.zeros((NV, 2), np.float32)
v = dec(['-i', VOICE])
a0 = s(SHIFT) + s(CUT / FPS) - s(CUT / FPS)           # voice stem is on the generic timeline: place at +SHIFT
src0 = s(CUT / FPS)                                   # nothing in the voice stem before 3.4s
cutg = s(568 / FPS)                                  # generic 18.933s: everything after the BORING? beat moves +EXTRA
voice[src0 + s(SHIFT): cutg + s(SHIFT)] = v[src0:cutg]
n = min(len(v) - cutg, NV - (cutg + s(SHIFT + EXTRA)))
voice[cutg + s(SHIFT + EXTRA): cutg + s(SHIFT + EXTRA) + n] = v[cutg:cutg + n]
# Hiral's personal message to EO Nagpur (v9) - added before the ducking envelope is computed
mv = dec(['-i', os.path.join(TMP, 'msg_voice.wav')]) * float(os.environ.get('MSG_GAIN', 1.8))
voice[:min(len(mv), NV)] += mv[:NV]
if PAUSES:   # silence into the voice at the middle of each gap (voice array is pre-pause length; grow it)
    N0 = len(voice); out = []; prev = 0
    for a, b in PAUSES:
        c = s((a + b) / 2 + SHIFT); out += [voice[prev:c], np.zeros((s(PAUSE_ADD / FPS), 2), np.float32)]; prev = c
    out.append(voice[prev:]); voice = np.vstack(out)[:N]
    if len(voice) < N: voice = np.vstack([voice, np.zeros((N - len(voice), 2), np.float32)])

if 'Sunset' in SONG:
    # Sunset Rooftop Lounge is 60s (bars of 1.94s from 0.02, drop at 31.06): repeat the 6 build bars before the drop so
    # it lands on the montage (42.70s), and one 4-bar groove phrase after it (as in the Mascot cut) to reach ~79s.
    full = dec(['-i', SONG]); xf = s(0.03)
    pre = DROP_GEN + SHIFT + EXTRA + sum(PAUSE_ADD / FPS for a, _ in PAUSES if a < DROP_GEN)                                   # where the drop must land
    # v12: start on the song's own first beat; loop its calm intro bars under the opening, play the build ONCE into the
    # drop; whatever is left over (< 1 bar) becomes a short silent lead-in under her first words
    if os.environ.get('MUSIC_FIT', 'v10') == 'v12':      # intro bars looped, build once (rejected with v12)
        k = int((pre - 31.04) // 1.94); delay = pre - 31.04 - k * 1.94
        pieces = [(0.02, 0.02 + k * 1.94), (0.02, 31.06), (31.06, 56.28), (48.52, 59.93)]
    else:                                                # v10 (approved): start offset + k repeated build bars
        k = int(math.ceil((pre - 31.06) / 1.94)); s0 = 31.06 + k * 1.94 - pre; delay = 0.0
        pieces = [(s0, 31.06), (31.06 - k * 1.94, 31.06), (31.06, 56.28), (48.52, 59.93)]
    print(f'music: in at {delay:.2f}s, {k} intro bars looped, build once, drop at {pre:.2f}s')
    music = full[s(pieces[0][0]):s(pieces[0][1])].copy()
    for a, b in pieces[1:]:
        p = full[s(a):s(b)].copy(); r = np.linspace(0, 1, xf)[:, None]
        p[:xf] = p[:xf] * r + music[-xf:] * (1 - r); music = np.vstack([music[:-xf], p])
    music = np.vstack([np.zeros((s(delay), 2), np.float32), music]); fi = s(0.6); music[s(delay):s(delay) + fi] *= np.linspace(0, 1, fi)[:, None]
    print(f'music {len(music) / SR:.2f}s')
    music = music[:N]
else:
    song_off = DROP_SONG - (DROP_GEN + SHIFT)         # song time = preview time + song_off
    music = dec(['-ss', f'{song_off:.4f}', '-t', f'{T + 0.5:.3f}', '-i', SONG])[:N]
if len(music) < N: music = np.vstack([music, np.zeros((N - len(music), 2), np.float32)])

# bed under the voice: envelope from the voice stem, gaps < 1.8s bridged, 0.25s ramps
env = np.abs(voice).max(1)
hop = s(0.05); act = np.array([env[i:i + hop].max() > 0.02 for i in range(0, N, hop)])
idx = np.where(act)[0]
for p, q in zip(idx[:-1], idx[1:]):
    if 0 < q - p <= int(1.8 / 0.05): act[p:q] = True
BED, FULL = float(os.environ.get('BED', 0.16)), float(os.environ.get('FULL', 0.6))
g = np.where(act, BED, FULL).astype(np.float32)
k = int(0.25 / 0.05); ker = np.ones(k) / k
g = np.convolve(np.pad(g, (k, k), mode='edge'), ker, mode='same')[k:-k]
gain = np.repeat(g, hop)[:N]
fade = s(2.5); gain[-fade:] *= np.linspace(1, 0, fade) ** 2
music *= gain[:, None]

sfx = np.zeros((N, 2), np.float32)
# opening clip muted (user, 23 Nov 2026: its own sound clashed with the music)
# ending clip's own whooshes dropped in v10 (clip is sped up)

mix = voice + music + sfx
wav = os.path.join(TMP, 'v3_mix.wav')
subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', wav], input=mix.astype(np.float32).tobytes(), check=True)

# voice-over-music check on every line
vr = np.sqrt((voice[:, 0] ** 2).reshape(-1, s(0.5))[:N // s(0.5)].mean(1) + 1e-12) if N % s(0.5) == 0 else None
blk = s(0.5); nb = N // blk
vv = np.sqrt((voice[:nb * blk, 0] ** 2).reshape(nb, blk).mean(1) + 1e-12); mm = np.sqrt((music[:nb * blk, 0] ** 2).reshape(nb, blk).mean(1) + 1e-12)
spk = vv > 0.02
d = 20 * np.log10(vv[spk] / mm[spk])
print(f'voice over music while speaking: median {np.median(d):.1f} dB, min {d.min():.1f} dB')

subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-i', vid, '-i', wav, '-map', '0:v', '-map', '1:a',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart', '-shortest', OUT], check=True)
print('wrote', OUT)
