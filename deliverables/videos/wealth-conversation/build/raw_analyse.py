#!/usr/bin/python3 -I
"""Survey the raw shoot folder: probe every camera clip, transcribe it, and compare the agency's
'Final audio' VO with the voice lifted from MAIN_Comp (is it the same timeline? is it clean?)."""
import subprocess, os, sys, json, glob, zipfile, wave
import numpy as np
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
RAW = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/raw'
A = S + '/rawaudio'; os.makedirs(A, exist_ok=True)

def probe(p):
    j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,color_transfer,sample_rate', '-of', 'json', p]))
    v = next((s for s in j['streams'] if s['codec_type'] == 'video'), {}); a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), {})
    return float(j['format']['duration']), v, a

# 1. unzip the VO zip into its own folder
z = glob.glob(RAW + "/VO's/*.zip")
if z:
    d = RAW + "/VO's/unzipped"; os.makedirs(d, exist_ok=True)
    with zipfile.ZipFile(z[0]) as zf:
        names = [n for n in zf.namelist() if not n.startswith('__MACOSX') and not n.endswith('/')]
        print('Vo.zip contains:', names)
        zf.extractall(d, members=names)

# 2. probe + transcribe everything (camera clips, VO files, final audio)
from faster_whisper import WhisperModel
model = WhisperModel('small', compute_type='int8')
clips = sorted(glob.glob(RAW + '/MVI_*.MP4')) + sorted(glob.glob(RAW + "/VO's/unzipped/**/*.*", recursive=True)) + sorted(glob.glob(RAW + '/Final audio/*.wav'))
for p in clips:
    try:
        dur, v, a = probe(p)
    except Exception as e:
        print('SKIP', p, e); continue
    wav = f'{A}/{os.path.basename(p)}.wav'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', p, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
    segs, info = model.transcribe(wav, language='en')
    text = ' '.join(s.text.strip() for s in segs)
    vs = f"{v.get('width')}x{v.get('height')} {v.get('codec_name')} {v.get('r_frame_rate')} {v.get('color_transfer')}" if v else 'audio only'
    print(f'\n== {os.path.basename(p)}  {dur:.1f}s  {vs}  audio:{a.get("codec_name")}@{a.get("sample_rate")}')
    print('   ' + text[:900])

# 3. Final audio vs MAIN_Comp voice: same timeline?
fa = glob.glob(A + '/Sound_Comp*.wav')
if fa:
    def load(p):
        w = wave.open(p); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
        if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(1)
        return sr, x
    sr, f = load(fa[0]); sr2, m = load(S + '/a.wav')
    n = min(len(f), len(m), sr * 40)
    a1 = f[:n] - f[:n].mean(); a2 = m[:n] - m[:n].mean()
    c = np.correlate(a1[:sr * 20], a2[:sr * 20 + sr * 4], 'valid') if len(a2) >= sr * 24 else None
    print(f'\nFinal audio: {len(f)/sr:.2f}s vs MAIN_Comp audio {len(m)/sr2:.2f}s')
    if c is not None:
        k = int(np.argmax(np.abs(c))); print(f'best alignment: MAIN_Comp audio leads Final audio by {k/sr:.3f}s (0 = same timeline), corr={np.abs(c[k])/(np.linalg.norm(a1[:sr*20])*np.linalg.norm(a2[k:k+sr*20])+1e-9):.3f}')
    # bed check on the final audio: level in a known gap and at the head
    def rms(x, a, b): seg = x[int(a*sr):int(b*sr)]; return 20*np.log10(np.sqrt(np.mean(seg**2))+1e-9)
    print(f'Final audio level: head 0-0.4s {rms(f,0,0.4):.1f} dB, gap 26.36-26.78 {rms(f,26.36,26.78):.1f} dB, speech 42.6-44 {rms(f,42.6,44):.1f} dB')
print('\nRAW SURVEY DONE')
