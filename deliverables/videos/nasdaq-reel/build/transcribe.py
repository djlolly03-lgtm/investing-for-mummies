"""Transcribe every take with word timings -> takes.json  (faster-whisper, /usr/bin/python3)"""
import glob,json,subprocess,os
from faster_whisper import WhisperModel
os.environ["PATH"]="/opt/homebrew/bin:"+os.environ["PATH"]
m=WhisperModel("small",device="cpu",compute_type="int8")
out={}
for f in sorted(glob.glob(os.path.expanduser("~/Developer/ifm-nasdaq/src/*.MOV"))):
    name=os.path.basename(f)
    subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",f,"-vn","-ac","1","-ar","16000","tmp/_t.wav"],check=True)
    segs,info=m.transcribe("tmp/_t.wav",language="en",word_timestamps=True,vad_filter=True)
    words=[]; text=[]
    for s in segs:
        text.append(s.text.strip())
        for w in s.words: words.append({"w":w.word.strip(),"s":round(w.start,2),"e":round(w.end,2)})
    out[name]={"dur":round(info.duration,2),"text":" ".join(text),"words":words}
    print(f"== {name} {info.duration:.1f}s\n{' '.join(text)}\n")
json.dump(out,open("takes.json","w"),indent=1)
