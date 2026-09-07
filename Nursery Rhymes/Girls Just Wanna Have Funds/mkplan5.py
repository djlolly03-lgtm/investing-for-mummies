import json, itertools, numpy as np, words, solve
# ONE visual family (navy/blue suit + cream blouse): clip-06, clip-05, clip-10
# Song spans: 48.48-67.74 is CONTINUOUS (no splice); one splice to 86.72-97.00
SPANS={'X1':(48.48,59.76,'06'),'X2':(59.76,67.68,'05'),'X3':(86.72,97.00,'10')}
X1=[(0.00,48.48),(0.46,49.58),(0.84,49.86),(1.24,50.76),(1.90,51.18),
    (2.20,51.76),(2.70,52.30),(4.80,55.18),(5.64,56.50),(8.00,59.76)]
# clip-10: word anchors while she articulates (ends ~5.0), then wave + logo reveal
X3=[(0.00,86.72),(0.40,87.90),(0.60,88.34),(1.38,89.22),(1.82,89.74),(2.22,90.36),
    (3.70,90.92),(4.18,91.72),(4.58,92.20),(5.00,93.10),(8.00,97.00)]
PH={'05':[(1.18,2.84),(3.30,4.88),(5.30,6.66)]}
CHORUS=[(59.76,62.50),(63.76,66.40)]
def bound(p,s0,s1,lo,hi):
    (c0,g0),(c1,g1)=p[0],p[-1]
    head=max(lo,c0-(g0-s0)/1.15); tail=min(hi,c1+(s1-g1)/1.15)
    o=list(p)
    if c0-head>0.03: o=[(head,s0)]+o
    else: o[0]=(c0,s0)
    if tail-c1>0.03: o=o+[(tail,s1)]
    else: o[-1]=(c1,s1)
    return o
best=None
for i in range(len(PH['05'])-1):                       # adjacent phrases only
    phr=(i,i+1); p=[]
    miss=0
    for pi,(a,b) in zip(phr,CHORUS):
        pr=words.pair_chorus('05',pi,words.sw(a,b)); p+=pr
        miss+=len(words.sw(a,b))-len(pr)
    lo=PH['05'][i-1][1]+0.06 if i>0 else 0.0
    hi=PH['05'][i+2][0]-0.06 if i+2<len(PH['05']) else 8.0
    an=bound(p,59.76,67.68,lo,hi)
    c,t,r,err=solve.solve(an,59.76,67.68,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    sc=(miss,float(r.max()),float(np.abs(err).max()))
    if best is None or sc<best[0]: best=(sc,phr,an)
print(f"chorus: clip-05 phrases {best[1]}  missing {best[0][0]} word(s)  "
      f"maxrate {best[0][1]:.2f}x  maxerr {best[0][2]*1000:.0f}ms\n")
out={}; vpos=0.0
for k,(s0,s1,clip) in SPANS.items():
    an={'X1':X1,'X2':best[2],'X3':X3}[k]
    c,t,r,err=solve.solve(an,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    v0,v1=vpos,vpos+(s1-s0)
    out[k]=dict(clip=clip,s0=s0,s1=s1,v0=v0,v1=v1,
                c=[float(x) for x in c],t=[float(x-s0+v0) for x in t])
    print(f"{k} clip-{clip}: {s1-s0:5.2f}s  video {v0:6.2f}-{v1:6.2f}  "
          f"maxerr {(np.abs(err).max() if len(err) else 0)*1000:5.0f}ms  "
          f"rates {r.min():.2f}-{r.max():.2f}x  clip {c[0]:.2f}-{c[-1]:.2f}")
    vpos=v1
json.dump(out,open('anchors5.json','w'),indent=1)
print(f"\nbody = {vpos:.2f}s -> with end card {vpos+1.2:.2f}s   |  ONE song splice (67.68 -> 86.72)")
