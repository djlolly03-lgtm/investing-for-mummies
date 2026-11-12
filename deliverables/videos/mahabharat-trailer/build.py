#!/usr/bin/python3
"""Mahabharat trailer (12 Nov 2026): four AI clips cut on the drums of "India - Drums of the World" (Rockot, Pixabay).
Story order: the cosmic lotus (creation) -> Draupadi in the hall -> Bhishma on the bed of arrows -> the war, ending on
the MAHABHARAT title. Music window starts on the hit at 37.338s; cuts land on hits at 42.295 and 47.682; the drums'
breakdown (52.5-56.5) carries Bhishma (slowed 1.2x) and the war clip's build, and the drums return at 57.21 exactly as
the title slams in (3.45s into the war clip). 1920x1080, 24 fps, -14 LUFS. Usage: build.py  ->  ./Mahabharat - Trailer.mp4"""
import subprocess, os, sys, json
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = '/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/'
MUSIC = SRC + 'rockot-india-drums-of-the-world-173071.mp3'
FPS = 24
M0 = 37.338                      # music time at the trailer's first frame (a hit)
TITLE_HIT, TITLE_IN_CLIP = 57.21, 3.45
# (file, timeline end in music time, or None for "play to the end"); each clip is stretched to fill its slot exactly
CLIPS = [('video.mp4', 42.295),                                    # cosmic golden lotus
         ('BPv8v73fbXxw-dsdGUQiz_minimax-h3.mp4', 47.682),          # Draupadi, the red swirl in the hall
         ('video (1).mp4', TITLE_HIT - TITLE_IN_CLIP),              # Bhishma on the bed of arrows (slowed into the breakdown)
         ('Warrior_standing_before_explodin…_6181d115.mp4', None)]  # the war -> MAHABHARAT
CLIP_GAIN, FADE_IN, FADE_OUT = 0.28, 0.4, 0.9   # the clips' own sound sits well under the drums

def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
def vdur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', p]).decode())

ins, vf, af, t = [], [], [], 0.0
for i, (f, end) in enumerate(CLIPS):
    src = SRC + f; d = vdur(src)
    slot = (end - M0 - t) if end else d
    k = slot / d                                   # >1 = slowed
    n = round(slot * FPS)
    ins += ['-i', src]
    mi = f",minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if k > 1.1 else f",fps={FPS}"
    vf.append(f"[{i}:v]setpts={k:.5f}*(PTS-STARTPTS){mi},scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,"
              f"crop=1920:1080,setsar=1,trim=end_frame={n},setpts=N/{FPS}/TB[v{i}]")
    tempo = 1 / k
    af.append(f"[{i}:a]asetpts=PTS-STARTPTS,atempo={tempo:.5f},atrim=0:{n / FPS:.4f},apad=whole_dur={n / FPS:.4f},volume={CLIP_GAIN}[a{i}]")
    print(f'{f[:40]:40s} slot {slot:6.3f}s  stretch {k:.3f}  at {t:6.3f}s', flush=True)
    t += n / FPS
TOTAL = t
mi = len(CLIPS)
ins += ['-ss', f'{M0:.3f}', '-i', MUSIC]
fc = ';'.join(vf + af)
fc += ';' + ''.join(f'[v{i}]' for i in range(mi)) + f'concat=n={mi}:v=1:a=0,fade=t=in:st=0:d={FADE_IN},fade=t=out:st={TOTAL - FADE_OUT:.4f}:d={FADE_OUT}[v]'
fc += ';' + ''.join(f'[a{i}]' for i in range(mi)) + f'concat=n={mi}:v=0:a=1[clips]'
fc += (f';[{mi}:a]atrim=0:{TOTAL:.4f},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,afade=t=out:st={TOTAL - 1.4:.4f}:d=1.4[mus]'
       f';[mus][clips]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]')
out = os.path.join(HERE, 'Mahabharat - Trailer.mp4')
r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + ins + ['-filter_complex', fc, '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out], capture_output=True, text=True)
if r.returncode: print(r.stderr[-2000:]); sys.exit(1)
print(f'TRAILER {TOTAL:.2f}s -> {out}', flush=True)
