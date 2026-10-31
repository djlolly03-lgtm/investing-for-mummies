import subprocess, sys, numpy as np
from faster_whisper import WhisperModel
model = WhisperModel('base', device='cpu', compute_type='int8')
for src in sys.argv[1:]:
    pcm = subprocess.run(['ffmpeg','-nostdin','-v','error','-i',src,'-vn','-ac','1','-ar','16000','-f','s16le','-'], capture_output=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32)/32768.0
    segs, _ = model.transcribe(audio, word_timestamps=True, vad_filter=True, language='en')
    print(f'\n##### {src.split("/")[-1]}  ({len(audio)/16000:.2f}s)')
    for s in segs:
        for w in (s.words or []):
            print(f'{w.start:7.2f}-{w.end:6.2f}  {w.word.strip()}')
