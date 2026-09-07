import numpy as np
def solve(anch, s0, s1, rmin=0.40, rmax=2.20, lam=0.05, iters=4000):
    """anch = [(clip_t, song_t)...] INCLUDING head/tail boundary anchors.
       endpoints pinned to (s0,s1); interior anchors pulled toward their song times
       with a penalty on rate-to-rate change."""
    a=sorted(anch); c=[];g=[]
    for ct,gt in a:
        if c and ct-c[-1]<0.02: continue
        c.append(ct); g.append(gt)
    c=np.array(c,float); g=np.array(g,float); g[0]=s0; g[-1]=s1
    d=np.diff(c); D=s1-s0
    if d.min()<=0: raise ValueError('non-monotone clip anchors')
    t=np.concatenate(([s0], s0+np.cumsum(d)/d.sum()*D))
    for it in range(iters):
        r=np.diff(t)/d
        gr=np.zeros_like(t)
        gr[1:-1]+=2.0*(t[1:-1]-g[1:-1])
        dr=np.diff(r); sm=np.zeros_like(r)
        sm[:-1]-=2*lam*dr; sm[1:]+=2*lam*dr
        gr[:-1]-=sm/d; gr[1:]+=sm/d
        gr[0]=gr[-1]=0
        t-=0.4*gr
        for _ in range(3):
            for j in range(1,len(t)-1):
                t[j]=min(t[j-1]+rmax*d[j-1], max(t[j-1]+rmin*d[j-1], t[j]))
            for j in range(len(t)-2,0,-1):
                t[j]=min(t[j+1]-rmin*d[j], max(t[j+1]-rmax*d[j], t[j]))
            t[0]=s0; t[-1]=s1
    r=np.diff(t)/d
    err=t[1:-1]-g[1:-1]
    return c,t,r,err
