import wave, numpy as np, sys
w=wave.open(sys.argv[1]); n=w.getnframes(); sr=w.getframerate()
a=np.frombuffer(w.readframes(n),dtype=np.int16).astype(np.float32)/32768.
hop=int(sr*0.5)
# vocal band 250-3600
F=np.fft.rfftfreq(hop, 1/sr)
band=(F>=250)&(F<=3600)
rows=[]
for i in range(0,len(a)-hop,hop):
    seg=a[i:i+hop]*np.hanning(hop)
    S=np.abs(np.fft.rfft(seg))
    rows.append((i/sr, float(S[band].mean()), float(np.sqrt((seg**2).mean()))))
mx=max(r[1] for r in rows)
for t,v,r in rows:
    print(f"{t:6.1f} {v/mx:5.2f} {'#'*int(40*v/mx)}")
