import subprocess, numpy as np, wave, os
def build(cut, out):
    D=0.35
    fc=[f"[0:a]atrim=48.48:{cut:.4f},asetpts=PTS-STARTPTS[a0]",
        f"[0:a]atrim={86.72-D:.4f}:97.0,asetpts=PTS-STARTPTS[a1]",
        f"[a0][a1]acrossfade=d={D}:c1=tri:c2=tri[y]"]
    subprocess.run(['ffmpeg','-v','error','-y','-i','song.mp3','-filter_complex',';'.join(fc),
        '-map','[y]','-ac','1','-ar','16000',out],check=True)
def beatgap(path, splice):
    w=wave.open(path); sr=w.getframerate()
    a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.
    hop=int(sr*0.005); win=int(sr*0.03); prev=None; env=[]; T=[]
    for i in range(0,len(a)-win,hop):
        S=np.abs(np.fft.rfft(a[i:i+win]*np.hanning(win)))
        env.append(0.0 if prev is None else float(np.maximum(S-prev,0).sum())); T.append(i/sr); prev=S
    env=np.array(env); env/=env.max(); T=np.array(T)
    pk=[T[i] for i in range(3,len(env)-3) if env[i]==max(env[i-3:i+4]) and env[i]>0.13]
    keep=[pk[0]]
    for t in pk[1:]:
        if t-keep[-1]>0.18: keep.append(t)
    pk=np.array(keep); med=np.median(np.diff(pk))
    j=int(np.searchsorted(pk,splice))
    g=pk[j]-pk[j-1]
    return g/med, med
print(f"{'cut':>8}{'splice@':>9}{'beat ratio':>12}   deviation")
best=None
for cut in np.arange(67.50,68.05,0.03):
    tmp='/tmp/n.wav'; build(cut,tmp)
    splice=cut-48.48
    r,med=beatgap(tmp,splice)
    dev=abs(r-round(r)) if round(r)>=1 else abs(r-1)
    mark=''
    if best is None or dev<best[0]: best=(dev,cut,r); mark=' *'
    print(f"{cut:8.2f}{splice:9.2f}{r:12.2f}   {dev:.3f}{mark}")
print(f"\nBEST cut = {best[1]:.2f}s  (beat ratio {best[2]:.2f}, deviation {best[0]:.3f})")
os.path.exists('/tmp/n.wav') and os.remove('/tmp/n.wav')
