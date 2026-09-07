import numpy as np, wave

def load(p):
    w=wave.open(p); sr=w.getframerate()
    a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.
    return a,sr

def melfb(sr,nfft,nmel=40,fmin=120,fmax=4000):
    def h2m(f): return 2595*np.log10(1+f/700)
    def m2h(m): return 700*(10**(m/2595)-1)
    pts=m2h(np.linspace(h2m(fmin),h2m(fmax),nmel+2))
    bins=np.floor((nfft+1)*pts/sr).astype(int)
    fb=np.zeros((nmel,nfft//2+1))
    for i in range(nmel):
        l,c,r=bins[i],bins[i+1],bins[i+2]
        if c==l: c=l+1
        if r==c: r=c+1
        fb[i,l:c]=np.linspace(0,1,c-l); fb[i,c:r]=np.linspace(1,0,r-c)
    return fb

def logmel(a,sr,hop=0.010,win=0.025,nmel=40):
    n=int(sr*win); H=int(sr*hop); nfft=1<<int(np.ceil(np.log2(n)))
    fb=melfb(sr,nfft,nmel); w=np.hanning(n); out=[]
    for i in range(0,max(0,len(a)-n),H):
        S=(np.abs(np.fft.rfft(a[i:i+n]*w,nfft))/nfft)**2
        out.append(np.log(fb@S+1e-8))
    X=np.array(out,dtype=np.float32)
    X=(X-X.mean(axis=0))/(X.std(axis=0)+1e-6)          # per-band normalise
    X=X/ (np.linalg.norm(X,axis=1,keepdims=True)+1e-9) # unit rows -> cosine
    return X

def subseq_dtw(R,Q):
    """align the WHOLE reference R (song section) to the best SUBSEQUENCE of Q (clip).
       returns (q_start, q_end, path[(i,j)...])"""
    C=1.0-R@Q.T                       # cosine distance, shape (len(R), len(Q))
    n,m=C.shape
    D=np.full((n,m),np.inf,dtype=np.float32); P=np.zeros((n,m),dtype=np.int8)
    D[0,:]=C[0,:]                     # free start anywhere in Q
    for i in range(1,n):
        # steps: (-1,0) hold q, (-1,-1) diagonal, (-1,-2) skip a q frame
        a=D[i-1,:]                              # 0
        b=np.concatenate(([np.inf],D[i-1,:-1])) # 1
        c=np.concatenate(([np.inf,np.inf],D[i-1,:-2])) # 2
        S=np.stack([a,b,c]); k=np.argmin(S,axis=0)
        D[i,:]=S[k,np.arange(m)]+C[i,:]; P[i,:]=k
    j=int(np.argmin(D[n-1,:])); path=[]
    for i in range(n-1,-1,-1):
        path.append((i,j))
        if i==0: break
        j=max(0,j-int(P[i,j]))
    path.reverse()
    return path[0][1], path[-1][1], path, float(D[n-1,path[-1][1]]/n)
