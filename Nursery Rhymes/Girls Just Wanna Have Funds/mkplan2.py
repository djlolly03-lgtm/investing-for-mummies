import json, numpy as np, words, solve
CHORUS={'S1':[(7.86,10.38),(12.00,14.32)],'S5':[(40.18,43.14),(43.74,47.00)],
        'S7':[(59.76,62.50),(63.76,66.40)]}
SEC={'S1':(7.86,15.84),'S2':(15.84,22.86),'S3':(22.86,30.02),'S4':(30.02,40.18),
     'S5':(40.18,48.48),'S6':(48.48,59.76),'S7':(59.76,67.74)}
PLAIN={'S2':'02','S3':'03','S4':'04'}
CH={'S1':('05',(0,1)),'S5':('01',(0,1)),'S7':('07',(0,2))}
# S6: clip-06's rest sits AFTER "that's" but the song's rest sits AFTER "investing".
# Align the RESTS (playbook 4) rather than the words - her mouth then moves exactly
# when the song has vocals, which reads far better than matching syllables.
S6=[(0.00,48.48),(0.46,49.58),(0.84,49.86),(1.24,50.76),(1.90,51.18),
    (2.20,51.76),(2.70,52.30),(4.80,55.18),(5.64,56.50),(8.00,59.76)]
def with_bounds(p,s0,s1):
    (c0,g0),(c1,g1)=p[0],p[-1]
    head=max(0.0,c0-(g0-s0)/1.15); tail=min(8.0,c1+(s1-g1)/1.15)
    o=list(p)
    if c0-head>0.03: o=[(head,s0)]+o
    else: o[0]=(c0,s0)
    if tail-c1>0.03: o=o+[(tail,s1)]
    else: o[-1]=(c1,s1)
    return o
def anchors(k):
    s0,s1=SEC[k]
    if k=='S6': return S6,'06'
    if k in CH:
        clip,phr=CH[k]; p=[]
        for pi,(a,b) in zip(phr,CHORUS[k]): p+=words.pair_chorus(clip,pi,words.sw(a,b))
    else:
        clip=PLAIN[k]; sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
        n=min(len(sws),len(cws)); p=[(cws[i]['s'],sws[i]['s']) for i in range(n)]
    return with_bounds(p,s0,s1),clip
out={}
print(f"{'sec':4}{'clip':7}{'maxerr':>9}{'meanerr':>9}{'rates':>16}   clip span")
for k in ['S1','S2','S3','S4','S5','S6','S7']:
    a,clip=anchors(k); s0,s1=SEC[k]
    c,t,r,err=solve.solve(a,s0,s1,rmin=0.35,rmax=4.5,lam=0.001,iters=9000)
    print(f"{k:4}clip-{clip} {np.abs(err).max()*1000:7.0f}ms {np.abs(err).mean()*1000:7.0f}ms "
          f"{r.min():6.2f}-{r.max():5.2f}   {c[0]:.2f}-{c[-1]:.2f}")
    out[k]=dict(clip=clip,s0=s0,s1=s1,c=[float(x) for x in c],t=[float(x) for x in t],
                r=[float(x) for x in r],maxerr=float(np.abs(err).max()))
json.dump(out,open('anchors.json','w'),indent=1)
