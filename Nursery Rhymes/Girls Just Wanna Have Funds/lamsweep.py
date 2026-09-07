import json, numpy as np, words, solve, itertools
CHORUS={'S1':[(7.86,10.38),(12.00,14.32)],'S5':[(40.18,43.14),(43.74,47.00)],
        'S7':[(59.76,62.50),(63.76,66.40)]}
SEC={'S1':(7.86,15.84),'S2':(15.84,22.86),'S3':(22.86,30.02),'S4':(30.02,40.18),
     'S5':(40.18,48.48),'S6':(48.48,59.76),'S7':(59.76,67.74)}
PLAIN={'S2':'02','S3':'03','S4':'04','S6':'06'}
def with_bounds(pairs,s0,s1):
    (c0,g0),(c1,g1)=pairs[0],pairs[-1]
    head=max(0.0,c0-(g0-s0)/1.15); tail=min(8.0,c1+(s1-g1)/1.15)
    out=list(pairs)
    if c0-head>0.03: out=[(head,s0)]+out
    else: out[0]=(c0,s0)
    if tail-c1>0.03: out=out+[(tail,s1)]
    else: out[-1]=(c1,s1)
    return out
def anch(key,clip,phr=None):
    s0,s1=SEC[key]
    if phr is not None:
        p=[]
        for pi,(a,b) in zip(phr,CHORUS[key]): p+=words.pair_chorus(clip,pi,words.sw(a,b))
    else:
        sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
        n=min(len(sws),len(cws)); p=[(cws[i]['s'],sws[i]['s']) for i in range(n)]
    return with_bounds(p,s0,s1)
CH={'S1':('05',(0,1)),'S5':('01',(0,1)),'S7':('07',(0,2))}
print(f"{'lam':>7} {'maxerr':>8} {'meanerr':>8} {'rate range':>14} {'rate jump':>10}")
for lam in [0.0005,0.002,0.008,0.03,0.05]:
    E=[];R=[];J=[]
    for k in SEC:
        clip,phr=CH[k] if k in CH else (PLAIN[k],None)
        s0,s1=SEC[k]; a=anch(k,clip,phr)
        c,t,r,err=solve.solve(a,s0,s1,rmin=0.35,rmax=2.6,lam=lam,iters=6000)
        E+=list(np.abs(err)); R+=list(r); J+=list(np.abs(np.diff(r)))
    print(f"{lam:7.4f} {max(E)*1000:7.0f}ms {np.mean(E)*1000:7.0f}ms "
          f"{min(R):6.2f}-{max(R):5.2f} {np.mean(J):9.2f}")
