import numpy as np, wave
def load(p):
    w=wave.open(p); sr=w.getframerate()
    return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768., sr
def onsets(a,sr):
    hop=int(sr*0.005); win=int(sr*0.03); prev=None; env=[]; T=[]
    for i in range(0,len(a)-win,hop):
        S=np.abs(np.fft.rfft(a[i:i+win]*np.hanning(win)))
        env.append(0.0 if prev is None else float(np.maximum(S-prev,0).sum())); T.append(i/sr); prev=S
    env=np.array(env); env/=max(env.max(),1e-9); T=np.array(T)
    pk=[T[i] for i in range(3,len(env)-3) if env[i]==max(env[i-3:i+4]) and env[i]>0.13]
    if not pk: return np.array([]),0.24
    keep=[pk[0]]
    for t in pk[1:]:
        if t-keep[-1]>0.18: keep.append(t)
    pk=np.array(keep)
    return pk, float(np.median(np.diff(pk))) if len(pk)>1 else 0.24
CL={}
for n in ['05','06','10']:
    a,sr=load(f'clip-{n}-16k.wav'); pk,med=onsets(a,sr); CL[n]=(a,sr,pk,med)
def best_join(cA,cB, endlo,endhi, startlo,starthi, step=0.02):
    aA,sr,pkA,medA=CL[cA]; aB,_,pkB,medB=CL[cB]
    med=(medA+medB)/2; best=None
    for e in np.arange(endlo,endhi,step):
        prevs=pkA[pkA<e]
        if not len(prevs): continue
        last=prevs[-1]
        for s in np.arange(startlo,starthi,step):
            nxts=pkB[pkB>=s]
            if not len(nxts): continue
            nxt=nxts[0]
            gap=(e-last)+(nxt-s)
            dev=abs(gap/med-round(gap/med)) if gap/med>=0.5 else 9
            if best is None or dev<best[0]: best=(dev,e,s,gap/med)
    return best
print("searching beat-continuous trim points (clip's OWN audio):")
b1=best_join('06','05', 6.6,7.9, 0.6,1.6)
print(f"  join clip-06 -> clip-05 : end {b1[1]:.2f} / start {b1[2]:.2f} -> {b1[3]:.2f} x beat (dev {b1[0]:.3f})")
b2=best_join('05','10', 6.4,7.9, 0.0,0.8)
print(f"  join clip-05 -> clip-10 : end {b2[1]:.2f} / start {b2[2]:.2f} -> {b2[3]:.2f} x beat (dev {b2[0]:.3f})")
print("\nper-clip tempo of the SUNG chorus phrases (how fast she actually sings):")
for n,sp in [('01',[(0.00,1.76),(2.28,5.48)]),('05',[(1.18,2.84),(3.30,4.88)]),
             ('07',[(0.00,1.24),(1.74,3.24),(3.80,5.26)])]:
    d=[round(b-a,2) for a,b in sp]
    print(f"  clip-{n}: phrase lengths {d}s")
