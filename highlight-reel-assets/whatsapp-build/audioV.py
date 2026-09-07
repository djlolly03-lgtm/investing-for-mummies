import numpy as np, wave, os
SR=44100; DUR=81.2; N=int(SR*DUR)
music=np.zeros(N); voice=np.zeros(N)
def add(buf,s,t0):
    i=int(t0*SR); n=min(len(s),len(buf)-i)
    if n>0: buf[i:i+n]+=s[:n]
def ev(n,tau): return np.exp(-np.arange(n)/(tau*SR))
def kick(a=.42):
    n=int(.30*SR); t=np.arange(n)/SR; f=95*np.exp(-t*11)+44
    return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*ev(n,.10)*1.3)*a
def shaker(a=.05):
    n=int(.05*SR); return np.diff(np.random.randn(n+1))*ev(n,.012)*a
def bell(f0,a=.13,d=1.7):
    n=int(d*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*f0*t)*ev(n,d/3.2)+np.sin(2*np.pi*f0*2.01*t)*ev(n,d/5)*.4)*a
def pad(fr,d,a=.105):
    n=int(d*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for f in fr: s+=np.sin(2*np.pi*f*t+np.random.rand()*6)+np.sin(2*np.pi*f*1.005*t)*.5
    s/=len(fr)*1.5
    return s*np.minimum(1,t/1.1)*np.minimum(1,(d-t)/1.5)*a
C4,E4,G4,F4,A4,B4,D5,C5=261.6,329.6,392.0,349.2,440.0,493.9,587.3,523.3
for fr,t0,d in [([C4,E4,G4],0,25.2),([F4,A4,C5],24.2,11),([G4,B4,D5],34.2,11),
                ([C4,E4,G4,C5],44.2,10),([F4,A4,C5],53.2,12),([G4,B4,D5],64.2,7),([F4,A4,C5],69.2,6),([C4,E4,G4,C5],73.2,8)]:
    add(music,pad(fr,d),t0)
t=6.0; i=0
while t<75.0:
    add(music,kick(.40 if i%2==0 else .28),t); add(music,shaker(),t+.3); t+=.6; i+=1
CUES=[2.6,5.8,26.8,29.6,32.4,35.2,37.8,40.4,43.0,49.1,51.9,63.1,66.2,69.2,72.4]
PALETTE=[C5,E4*2,A4*1.5,G4*1.5]
notes=[PALETTE[i%4] for i in range(len(CUES))]
for ts,f in zip(CUES,notes): add(music,bell(f,.12),ts+.03)
add(music,bell(C5,.19,2.8),78.4); add(music,bell(G4*1.5,.12,2.6),78.52)
LIVE=[("L1",9.2,3.6),("c2",12.8,14.0),("L2",45.6,3.5),("T1",55.1,8.0)]
for name,t0,dur in LIVE:
    p=f"aud/{name}.wav"
    if not os.path.exists(p): print("missing",p); continue
    w=wave.open(p); sr=w.getframerate(); ch=w.getnchannels()
    a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
    if ch==2: a=a.reshape(-1,2).mean(axis=1)
    if sr!=SR: a=np.interp(np.linspace(0,len(a),int(len(a)*SR/sr)),np.arange(len(a)),a)
    y=np.zeros_like(a); px=py=0.0
    for j in range(len(a)): y[j]=0.985*(py+a[j]-px); px=a[j]; py=y[j]
    a=y
    pk=np.percentile(np.abs(a),99.5)+1e-6
    a=np.tanh(a/pk*(0.95 if name in ("T1","c2") else 0.85)*1.05)
    if name=="L1":
        # compounded: another 25% off the prior 0.75 -> 0.5625 start level, eased over 2.0s
        n=len(a); ramp_n=min(int(2.0*SR), n)
        env=np.ones(n)*0.5625
        env[:ramp_n]=np.linspace(0.5625,1.0,ramp_n)**0.7
        a=a*env
    f=int(0.34*SR); a[:f]*=np.linspace(0,1,f); a[-f:]*=np.linspace(1,0,f)
    add(voice,a,t0); print(name,"@",t0,f"{len(a)/SR:.2f}s")
duck=np.ones(N)
for name,t0,dur in LIVE:
    lvl=0.10 if name=="T1" else 0.18
    a=int((t0-0.55)*SR); b=int((t0+dur+0.35)*SR); ramp=int(0.55*SR)
    duck[a:b]=lvl
    duck[a:a+ramp]=np.linspace(1,lvl,ramp); duck[b-ramp:b]=np.linspace(lvl,1,ramp)
mix=music*duck+voice*0.95
fo=np.ones(N); f0=int((DUR-2.2)*SR); fo[f0:]=np.linspace(1,0,N-f0)
mix*=fo*np.minimum(1,np.arange(N)/(1.6*SR))
mix=np.tanh(mix*1.08); mix=mix/np.max(np.abs(mix))*.86
w=wave.open("trackV.wav","w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.repeat((mix*32767).astype(np.int16),2).tobytes()); w.close()
print("trackV.wav ok",DUR,"s")
