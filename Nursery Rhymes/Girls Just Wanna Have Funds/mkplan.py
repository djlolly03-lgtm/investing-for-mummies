import json, itertools, numpy as np, words, solve
song=json.load(open('song-words-v2.json'))
def norm(w): return w.strip().lower().strip(',.!?')
CHORUS={'S1':[(7.86,10.38),(12.00,14.32)],'S5':[(40.18,43.14),(43.74,47.00)],
        'S7':[(59.76,62.50),(63.76,66.40)]}
SEC={'S1':(7.86,15.84),'S2':(15.84,22.86),'S3':(22.86,30.02),'S4':(30.02,40.18),
     'S5':(40.18,48.48),'S6':(48.48,59.76),'S7':(59.76,67.74)}
PLAIN={'S2':'02','S3':'03','S4':'04','S6':'06'}
NPH={'01':2,'05':3,'07':4}

def anchors_chorus(clip,phr,key):
    out=[]
    for pi,(a,b) in zip(phr,CHORUS[key]):
        out+=words.pair_chorus(clip,pi,words.sw(a,b))
    return out
def anchors_plain(clip,key):
    s0,s1=SEC[key]; sws=words.sw(s0,s1); cws=json.load(open(f'clip-{clip}-words.json'))
    n=min(len(sws),len(cws))
    return [(cws[i]['s'],sws[i]['s']) for i in range(n)]

def score(clip,key,anch):
    s0,s1=SEC[key]
    c,t,r,err=solve.solve([a for a,_ in anch],[b for _,b in anch],s0,s1)
    return float(np.abs(err).max()), float(np.abs(err).mean()), float(r.max()), (c,t,r,err)

best=None
for assign in itertools.permutations(['01','05','07']):
    A=dict(zip(['S1','S5','S7'],assign)); tot=[]; det={}
    for k,clip in A.items():
        bb=None
        for phr in itertools.combinations(range(NPH[clip]),2):
            anch=anchors_chorus(clip,phr,k)
            mx,mn,rm,_=score(clip,k,anch)
            if bb is None or mx<bb[0]: bb=(mx,mn,rm,phr)
        det[k]=(clip,bb[3],bb[0],bb[2]); tot.append(bb[0])
    if best is None or max(tot)<best[0]: best=(max(tot),det)
print(f"chorus assignment (worst max word error {best[0]*1000:.0f}ms):")
CH_PICK={}
for k,(clip,phr,mx,rm) in sorted(best[1].items()):
    CH_PICK[k]=(clip,phr)
    print(f"   {k} -> clip-{clip} phrases {phr}   max word err {mx*1000:5.0f}ms   max rate {rm:.2f}x")
print()
out={}
for k in ['S1','S2','S3','S4','S5','S6','S7']:
    if k in CH_PICK: clip,phr=CH_PICK[k]; anch=anchors_chorus(clip,phr,k)
    else: clip=PLAIN[k]; anch=anchors_plain(clip,k)
    s0,s1=SEC[k]
    mx,mn,rm,(c,t,r,err)=score(clip,k,anch)
    print(f"{k} clip-{clip}: n={len(anch)} maxerr {mx*1000:5.0f}ms  meanerr {mn*1000:4.0f}ms  "
          f"rate {r.min():.2f}-{r.max():.2f}x")
    out[k]=dict(clip=clip,s0=s0,s1=s1,c=list(map(float,c)),t=list(map(float,t)),
                r=list(map(float,r)),maxerr=mx)
json.dump(out,open('anchors.json','w'),indent=1)
