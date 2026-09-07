import json, itertools, numpy as np, words, solve
# song spans kept (splices chosen to land in the roomiest instrumental gaps)
SPANS={'W1':(7.86,12.00),'W2':(15.84,21.60),'W3':(30.02,35.04),
       'W4':(48.48,55.18),'W5':(55.18,57.80),'W6':(59.76,63.76)}
CHORUS={'W1':[(7.86,10.38)],'W6':[(59.76,62.50)]}      # ONE phrase each now
PH={'01':[(0.00,1.76),(2.28,5.48)],
    '05':[(1.18,2.84),(3.30,4.88),(5.30,6.66)],
    '07':[(0.00,1.24),(1.74,3.24),(3.80,5.26),(5.92,7.18)]}
COMPLETE={'01':[0,1],'05':[0],'07':[0,1,2,3]}          # phrases with all 5 words
W4=[(0.00,48.48),(0.46,49.58),(0.84,49.86),(1.24,50.76),(1.90,51.18),(2.20,51.76),
    (2.70,52.30),(4.80,55.18)]
def bound(p,s0,s1,lo,hi):
    (c0,g0),(c1,g1)=p[0],p[-1]
    head=max(lo,c0-(g0-s0)/1.15); tail=min(hi,c1+(s1-g1)/1.15)
    o=list(p)
    if c0-head>0.03: o=[(head,s0)]+o
    else: o[0]=(c0,s0)
    if tail-c1>0.03: o=o+[(tail,s1)]
    else: o[-1]=(c1,s1)
    return o
def anch_ch(clip,pi,key):
    s0,s1=SPANS[key]
    p=words.pair_chorus(clip,pi,words.sw(*CHORUS[key][0]))
    lo=PH[clip][pi-1][1]+0.06 if pi>0 else 0.0
    hi=PH[clip][pi+1][0]-0.06 if pi+1<len(PH[clip]) else 8.0
    return bound(p,s0,s1,lo,hi)
best=None
for c1,p1 in [(c,p) for c in COMPLETE for p in COMPLETE[c]]:
    for c6,p6 in [(c,p) for c in COMPLETE for p in COMPLETE[c]]:
        if c1==c6 and p1==p6: continue
        sc=[]
        ok=True
        for key,cl,pi in [('W1',c1,p1),('W6',c6,p6)]:
            s0,s1=SPANS[key]
            a=anch_ch(cl,pi,key)
            try: c,t,r,err=solve.solve(a,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
            except Exception: ok=False; break
            sc.append((float(r.max()),float(np.abs(err).max()) if len(err) else 0.0))
        if not ok: continue
        key=(max(x[0] for x in sc), max(x[1] for x in sc), 0 if c1!=c6 else 1)
        if best is None or key<best[0]: best=(key,(c1,p1),(c6,p6))
(c1,p1),(c6,p6)=best[1],best[2]
print(f"chorus: W1 -> clip-{c1} phrase {p1} | W6 -> clip-{c6} phrase {p6}   "
      f"(max rate {best[0][0]:.2f}x, max err {best[0][1]*1000:.0f}ms)\n")
out={}; vpos=0.0
for k in ['W1','W2','W3','W4','W5','W6']:
    s0,s1=SPANS[k]
    if k=='W1': clip=c1; an=anch_ch(c1,p1,k)
    elif k=='W6': clip=c6; an=anch_ch(c6,p6,k)
    elif k=='W4': clip='06'; an=W4
    elif k=='W5': clip='10'; an=[(5.90,s0),(8.00,s1)]
    else:
        clip={'W2':'02','W3':'04'}[k]
        sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
        n=min(len(sws),len(cws)); an=bound([(cws[i]['s'],sws[i]['s']) for i in range(n)],s0,s1,0.0,8.0)
    c,t,r,err=solve.solve(an,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    v0,v1=vpos,vpos+(s1-s0)
    out[k]=dict(clip=clip,s0=s0,s1=s1,v0=v0,v1=v1,
                c=[float(x) for x in c],t=[float(x-s0+v0) for x in t])
    me=(np.abs(err).max() if len(err) else 0.0)*1000
    print(f"{k} clip-{clip}: {s1-s0:5.2f}s  video {v0:6.2f}-{v1:6.2f}  maxerr {me:5.0f}ms  "
          f"rates {r.min():.2f}-{r.max():.2f}x  clip {c[0]:.2f}-{c[-1]:.2f}")
    vpos=v1
json.dump(out,open('anchors30.json','w'),indent=1)
print(f"\nbody = {vpos:.2f}s  -> total with end card {vpos+1.2:.2f}s")
