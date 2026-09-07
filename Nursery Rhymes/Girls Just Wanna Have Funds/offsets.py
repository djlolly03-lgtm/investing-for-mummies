import json, numpy as np
from plan import SEGS, SONG0
# rebuild the exact segment list (same splitter as build04)
MOT={n:np.load(f'clip-{n}_motion.npy') for n in ['01','02','03','04','05','06','07','08','09','10']}
SHOTS={n:[i/24.0 for i,v in enumerate(m) if v>25] for n,m in MOT.items()}
def motion(c,a,b):
    m=MOT[c][int(a*24):max(int(a*24)+1,int(b*24))]; return float(m.mean()) if len(m) else 5.0
def split(c,a,b,s,e):
    cuts=[t for t in SHOTS[c] if a+0.08<t<b-0.08]
    if not cuts: return [(c,a,b,s,e)]
    bounds=[a]+cuts+[b]; pieces=[(bounds[i],bounds[i+1]) for i in range(len(bounds)-1)]
    D=e-s; w=[(q-p)*(1.0/(1.0+0.045*motion(c,p,q))) for p,q in pieces]
    tot=sum(w); alloc=[D*x/tot for x in w]; R=D/(b-a)
    for i,(p,q) in enumerate(pieces): alloc[i]=min((q-p)*R*1.35,max((q-p)*R*0.65,alloc[i]))
    k=D/sum(alloc); alloc=[x*k for x in alloc]
    out=[];ps=s
    for (p,q),d in zip(pieces,alloc): out.append((c,p,q,ps,ps+d)); ps+=d
    out[-1]=(c,out[-1][1],b,out[-1][3],e); return out
segs=[]
for c,a,b,s,e,n in SEGS: segs+=split(c,a,b,s,e)

def clip_to_video(clip,t):
    """where does clip-time t of this clip appear in the finished video?"""
    for c,a,b,s,e in segs:
        if c==clip and a-1e-9<=t<=b+1e-9:
            f=(t-a)/(b-a) if b>a else 0
            return (s+f*(e-s))-SONG0
    return None

song=json.load(open('song-words-v2.json'))
SEC={'07':(7.86,15.84),'02':(15.84,22.86),'03':(22.86,30.02),'04':(30.02,40.18),
     '01':(40.18,48.48),'06':(48.48,59.76),'05':(59.76,67.74),'08':(67.74,79.96),
     '09':(79.96,82.40),'10':(86.72,94.92)}
print(f"{'clip':6} {'clip word':>12}  {'lands at':>9}  {'song word':>12} {'should be':>9}  {'ERROR':>7}")
allerr=[]
for clip,(s0,s1) in SEC.items():
    cw=json.load(open(f'clip-{clip}-words.json'))
    sw=[w for w in song if s0-0.01<=w['s']<=s1+0.01]
    errs=[]
    for w in cw:
        v=clip_to_video(clip,w['s'])
        if v is None: continue
        # nearest song word of the same text
        cand=[x for x in sw if x['w'].strip().lower().rstrip(',.').startswith(w['w'].strip().lower().rstrip(',.')[:3])]
        if not cand: continue
        best=min(cand,key=lambda x:abs((x['s']-SONG0)-v))
        err=v-(best['s']-SONG0)
        errs.append(err); allerr.append(err)
        if abs(err)>0.25:
            print(f"clip-{clip} {w['w'].strip():>12}@{w['s']:.2f} {v:9.2f}  {best['w'].strip():>12} {best['s']-SONG0:9.2f}  {err:+7.2f}")
    if errs:
        print(f"  -> clip-{clip}: n={len(errs)} mean {np.mean(errs):+.3f}s  median {np.median(errs):+.3f}s  "
              f"max|err| {max(abs(e) for e in errs):.2f}s")
print(f"\nGLOBAL: n={len(allerr)} mean {np.mean(allerr):+.3f}s median {np.median(allerr):+.3f}s "
      f"std {np.std(allerr):.3f}s")
