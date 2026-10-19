# -*- coding: utf-8 -*-
"""Audio bed from the supplied track (Buant Groove) instead of the synth bed.
Keeps the same shape: the music ducks under every live-class clip so the room
is audible, then swells back. Track is 120 BPM and consistent; taken from 16s,
a phrase boundary at full energy, well clear of the 136s breakdown.
"""
import os, json, wave, subprocess
import numpy as np
B=os.path.expanduser("~/Developer/ifm-iya/build")
os.environ["PATH"]="/opt/homebrew/bin:"+os.environ["PATH"]
SR=44100
T=json.load(open(f"{B}/timeline.json")); DUR=T["total"]; LIVE=T["live"]
N=int(SR*DUR)
MUS_IN=16.0
subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",str(MUS_IN),"-t",f"{DUR:.3f}",
    "-i",f"{B}/music_src.mp3","-ac","1","-ar",str(SR),f"{B}/_bed.wav"],check=True)
w=wave.open(f"{B}/_bed.wav"); music=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
music=np.pad(music,(0,max(0,N-len(music))))[:N]

def add(buf,s,t0):
    i=int(t0*SR)
    if i<0: s=s[-i:]; i=0
    n=min(len(s),len(buf)-i)
    if n>0: buf[i:i+n]+=s[:n]

voice=np.zeros(N)
for name,t0,dur in LIVE:
    p=f"{B}/aud/{name}.wav"
    if not os.path.exists(p): continue
    wv=wave.open(p); sr=wv.getframerate(); ch=wv.getnchannels()
    a=np.frombuffer(wv.readframes(wv.getnframes()),dtype=np.int16).astype(np.float32)/32768
    if ch==2: a=a.reshape(-1,2).mean(axis=1)
    if sr!=SR: a=np.interp(np.linspace(0,len(a),int(len(a)*SR/sr)),np.arange(len(a)),a)
    y=np.zeros_like(a); px=py=0.0
    for j in range(len(a)): y[j]=0.985*(py+a[j]-px); px=a[j]; py=y[j]   # high-pass the rumble
    a=y
    pk=np.percentile(np.abs(a),99.5)+1e-6
    a=np.tanh(a/pk*0.92*1.05)
    f=int(0.30*SR); a[:f]*=np.linspace(0,1,f); a[-f:]*=np.linspace(1,0,f)
    add(voice,a,t0)
    print(f"  {name} @ {t0:.2f}s  {len(a)/SR:.2f}s")

duck=np.ones(N)
for name,t0,dur in LIVE:
    lvl=0.40
    a=int((t0-0.55)*SR); b=int((t0+dur+0.20)*SR)
    atk=int(0.60*SR); rel=int(0.95*SR)
    a=max(0,a); b=min(N,b)
    duck[a:b]=np.minimum(duck[a:b],lvl)
    duck[a:a+atk]=np.minimum(duck[a:a+atk],np.linspace(1,lvl,atk))
    r=min(rel,N-b)
    if r>0: duck[b:b+r]=np.minimum(duck[b:b+r],np.linspace(lvl,1,r))

mix=music*duck*0.95+voice*0.95
fi=int(1.0*SR); mix[:fi]*=np.linspace(0,1,fi)
fo=int(2.2*SR); mix[-fo:]*=np.linspace(1,0,fo)
b0=np.exp(-2*np.pi*95/SR); lo=np.zeros_like(mix); acc=0.0
for j in range(len(mix)): acc=b0*acc+(1-b0)*mix[j]; lo[j]=acc
mix=mix-lo*0.80
mix=np.tanh(mix*1.12); mix=mix/np.max(np.abs(mix))*0.89
w=wave.open(f"{B}/trackIYA_music.wav","w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.repeat((mix*32767).astype(np.int16),2).tobytes()); w.close()
os.remove(f"{B}/_bed.wav")
print(f"trackIYA_music.wav ok {DUR}s")
