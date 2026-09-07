import json, itertools, numpy as np, words, solve
CHORUS={'S1':[(7.86,10.38),(12.00,14.32)],'S5':[(40.18,43.14),(43.74,47.00)],
        'S7':[(59.76,62.50),(63.76,66.40)]}
SEC={'S1':(7.86,15.84),'S2':(15.84,22.86),'S3':(22.86,30.02),'S4':(30.02,40.18),
     'S5':(40.18,48.48),'S6':(48.48,59.76),'S7':(59.76,67.74)}
PLAIN={'S2':'02','S3':'03','S4':'04'}
# clip chorus phrase spans (whisper) - used to keep head/tail out of NEIGHBOURING phrases
PH={'01':[(0.00,1.76),(2.28,5.48)],
    '05':[(1.18,2.84),(3.30,4.88),(5.30,6.66)],
    '07':[(0.00,1.24),(1.74,3.24),(3.80,5.26),(5.92,7.18)]}
S6=[(0.00,48.48),(0.46,49.58),(0.84,49.86),(1.24,50.76),(1.90,51.18),
    (2.20,51.76),(2.70,52.30),(4.80,55.18),(5.64,56.50),(8.00,59.76)]
def bound(p,s0,s1,lo,hi):
    (c0,g0),(c1,g1)=p[0],p[-1]
    head=max(lo, c0-(g0-s0)/1.15); tail=min(hi, c1+(s1-g1)/1.15)
    o=list(p)
    if c0-head>0.03: o=[(head,s0)]+o
    else: o[0]=(c0,s0)
    if tail-c1>0.03: o=o+[(tail,s1)]
    else: o[-1]=(c1,s1)
    return o
def anch(k,clip,phr=None):
    s0,s1=SEC[k]
    if k=='S6': return S6
    if phr is not None:
        i,j=phr; p=[]
        for pi,(a,b) in zip(phr,CHORUS[k]): p+=words.pair_chorus(clip,pi,words.sw(a,b))
        lo = PH[clip][i-1][1]+0.06 if i>0 else 0.0            # after the previous phrase
        hi = PH[clip][j+1][0]-0.06 if j+1<len(PH[clip]) else 8.0  # before the next phrase
        return bound(p,s0,s1,lo,hi)
    sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
    n=min(len(sws),len(cws))
    return bound([(cws[i]['s'],sws[i]['s']) for i in range(n)],s0,s1,0.0,8.0)
best=None
for assign in itertools.permutations(['01','05','07']):
    A=dict(zip(['S1','S5','S7'],assign)); tot=[];det={}
    for k,clip in A.items():
        s0,s1=SEC[k]; bb=None
        for i in range(len(PH[clip])-1):                # ADJACENT phrase pairs only
            phr=(i,i+1)
            # how many song words does the clip actually have a mouth for?
            miss=0
            for pi,(x,y) in zip(phr,CHORUS[k]):
                miss += len(words.sw(x,y)) - len(words.pair_chorus(clip,pi,words.sw(x,y)))
            a=anch(k,clip,phr)
            c,t,r,err=solve.solve(a,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
            sc=(miss, float(r.max()), float(np.abs(err).max()))
            if bb is None or sc<bb[0:3]: bb=(sc[0],sc[1],sc[2],phr)
        det[k]=(clip,bb[3],bb[2],bb[1],bb[0]); tot.append((bb[0],bb[1]))   # rank on (missing, rate)
    key=(sum(x[0] for x in tot), max(x[1] for x in tot))
    if best is None or key<best[0]: best=(key,det)
CH={k:(v[0],v[1]) for k,v in best[1].items()}
print(f"chorus (adjacent phrases; total missing song words = {best[0][0]}):")
for k,(clip,phr,mx,rm,ms) in sorted(best[1].items()):
    print(f"   {k} -> clip-{clip} phrases {phr}  missing {ms} word(s)  maxerr {mx*1000:4.0f}ms  maxrate {rm:.2f}x")
out={}
print()
for k in ['S1','S2','S3','S4','S5','S6','S7']:
    s0,s1=SEC[k]
    clip,phr=(CH[k][0],CH[k][1]) if k in CH else ((PLAIN[k] if k in PLAIN else '06'),None)
    a=anch(k,clip,phr)
    c,t,r,err=solve.solve(a,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    print(f"{k} clip-{clip}: maxerr {np.abs(err).max()*1000:5.0f}ms  rates {r.min():.2f}-{r.max():.2f}x  "
          f"clip span {c[0]:.2f}-{c[-1]:.2f}")
    out[k]=dict(clip=clip,s0=s0,s1=s1,c=[float(x) for x in c],t=[float(x) for x in t])
json.dump(out,open('anchors.json','w'),indent=1)
