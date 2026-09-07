import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
path = sys.argv[1]
segs, info = m.transcribe(path, language="en", word_timestamps=True,
                          condition_on_previous_text=False,
                          no_speech_threshold=0.9, temperature=0.0)
out=[]
for s in segs:
    print(f"[{s.start:7.2f} - {s.end:7.2f}] {s.text}")
    for w in (s.words or []):
        out.append({"s":round(w.start,3),"e":round(w.end,3),"w":w.word,"p":round(w.probability,3)})
json.dump(out, open(sys.argv[2],"w"), indent=1)
