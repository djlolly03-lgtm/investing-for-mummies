# -*- coding: utf-8 -*-
"""Music-only bed.
Every shot in v11 was framed on faces, not on speech gaps, so each cut landed
mid-word - the room audio was being chopped 11 times. That ambience is
unintelligible murmur (-31 to -37 dB) and earns nothing, so it is gone: no clip
audio, no duck, and Buant Groove (1) plays at full level throughout.
"""
import os, json, wave, subprocess
import numpy as np
B=os.path.expanduser("~/Developer/ifm-iya/build")
os.environ["PATH"]="/opt/homebrew/bin:"+os.environ["PATH"]
SR=44100
T=json.load(open(f"{B}/timeline.json")); DUR=T["total"]; N=int(SR*DUR)
MUS_IN=4.0
subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",str(MUS_IN),"-t",f"{DUR:.3f}",
    "-i",f"{B}/music_src2.mp3","-ac","1","-ar",str(SR),f"{B}/_bed.wav"],check=True)
w=wave.open(f"{B}/_bed.wav")
mix=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
mix=np.pad(mix,(0,max(0,N-len(mix))))[:N]
fi=int(0.8*SR); mix[:fi]*=np.linspace(0,1,fi)
fo=int(2.0*SR); mix[-fo:]*=np.linspace(1,0,fo)
b0=np.exp(-2*np.pi*90/SR); lo=np.zeros_like(mix); acc=0.0
for j in range(len(mix)): acc=b0*acc+(1-b0)*mix[j]; lo[j]=acc
mix=mix-lo*0.55                      # light high-pass; phones cannot play the sub anyway
mix=np.tanh(mix*1.06); mix=mix/np.max(np.abs(mix))*0.90
w=wave.open(f"{B}/trackIYA_music.wav","w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.repeat((mix*32767).astype(np.int16),2).tobytes()); w.close()
os.remove(f"{B}/_bed.wav")
print(f"music-only bed, {DUR}s, no clip audio -> nothing can be cut mid-word")
