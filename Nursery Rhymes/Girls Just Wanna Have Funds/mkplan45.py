import json, itertools, numpy as np, words, solve
CHORUS={'V1':[(7.86,10.38),(12.00,14.32)],'V6':[(59.76,62.50),(63.76,66.40)]}
# song spans kept, in order
SPANS={'V1':(7.86,15.84),'V2':(15.84,22.86),'V3':(30.02,40.18),
       'V4':(48.48,55.18),'V5':(55.18,59.76),'V6':(59.76,67.74)}
PH={'01':[(0.00,1.76),(2.28,5.48)],
    '07':[(0.00,1.24),(1.74,3.24),(3.80,5.26),(5.92,7.18)]}
# V4: clip-06 rest-aligned pairing, now ENDING at 55.18 (we cut away for "For Mummies")
V4=[(0.00,48.48),(0.46,49.58),(0.84,49.86),(1.24,50.76),(1.90,51.18),
    (2.20,51.76),(2.70,52.30),(4.80,55.18)]
def bound(p,s0,s1,lo,hi):
    (c0,g0),(c1,g1)=p[0],p[-1]
    head=max(lo,c0-(g0-s0)/1.15); tail=min(hi,c1+(s1-g1)/1.15)
    o=list(p)
    if c0-head>0.03: o=[(head,s0)]+o
    else: o[0]=(c0,s0)
    if tail-c1>0.03: o=o+[(tail,s1)]
    else: o[-1]=(c1,s1)
    return o
def anch_ch(clip,phr,key):
    s0,s1=SPANS[key]; i,j=phr; p=[]
    for pi,(a,b) in zip(phr,CHORUS[key]): p+=words.pair_chorus(clip,pi,words.sw(a,b))
    lo=PH[clip][i-1][1]+0.06 if i>0 else 0.0
    hi=PH[clip][j+1][0]-0.06 if j+1<len(PH[clip]) else 8.0
    return bound(p,s0,s1,lo,hi)
def missing(clip,phr,key):
    m=0
    for pi,(x,y) in zip(phr,CHORUS[key]):
        m+=len(words.sw(x,y))-len(words.pair_chorus(clip,pi,words.sw(x,y)))
    return m
best=None
for a1,a6 in [('01','07'),('07','01')]:
    tot=[];det={}
    for key,clip in [('V1',a1),('V6',a6)]:
        s0,s1=SPANS[key]; bb=None
        for i in range(len(PH[clip])-1):
            phr=(i,i+1); ms=missing(clip,phr,key)
            an=anch_ch(clip,phr,key)
            c,t,r,err=solve.solve(an,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
            sc=(ms,float(r.max()),float(np.abs(err).max()))
            if bb is None or sc<bb[:3]: bb=(sc[0],sc[1],sc[2],phr)
        det[key]=(clip,bb[3],bb[2],bb[1],bb[0]); tot.append((bb[0],bb[1]))
    key=(sum(x[0] for x in tot),max(x[1] for x in tot))
    if best is None or key<best[0]: best=(key,det)
print(f"chorus (missing words total = {best[0][0]}):")
CH={}
for k,(clip,phr,mx,rm,ms) in sorted(best[1].items()):
    CH[k]=(clip,phr); print(f"   {k} -> clip-{clip} ph{phr}  missing {ms}  maxerr {mx*1000:4.0f}ms  maxrate {rm:.2f}x")
out={}; vpos=0.0
print()
for k in ['V1','V2','V3','V4','V5','V6']:
    s0,s1=SPANS[k]
    if k in CH:
        clip,phr=CH[k]; an=anch_ch(clip,phr,k)
    elif k=='V4': clip='06'; an=V4
    elif k=='V5': clip='10'; an=[(5.90,s0),(8.00,s1)]      # IFM logo reveal, no mouth
    else:
        clip={'V2':'02','V3':'04'}[k]
        sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
        n=min(len(sws),len(cws)); an=bound([(cws[i]['s'],sws[i]['s']) for i in range(n)],s0,s1,0.0,8.0)
    c,t,r,err=solve.solve(an,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    v0,v1=vpos,vpos+(s1-s0)
    out[k]=dict(clip=clip,s0=s0,s1=s1,v0=v0,v1=v1,
                c=[float(x) for x in c],t=[float(x-s0+v0) for x in t])
    print(f"{k} clip-{clip}: {s1-s0:5.2f}s video {v0:6.2f}-{v1:6.2f}  maxerr {(np.abs(err).max() if len(err) else 0)*1000:5.0f}ms  "
          f"rates {r.min():.2f}-{r.max():.2f}x  clip {c[0]:.2f}-{c[-1]:.2f}")
    vpos=v1
json.dump(out,open('anchors45.json','w'),indent=1)
print(f"\nbody = {vpos:.2f}s")
