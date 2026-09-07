import json, subprocess, numpy as np
A=json.load(open('anchors.json')); SONG0=7.86
song=json.load(open('song-words-v2.json'))
def sw(a,b): return [w for w in song if a-0.01<=w['s']<=b+0.01]
def norm(w): return w.strip().lower().strip(',.!?')
print("=== 1. WORD SYNC: where each clip word lands vs where the song sings it")
allerr=[]
for k in ['S1','S2','S3','S4','S5','S6','S7']:
    d=A[k]; c=np.array(d['c']); t=np.array(d['t']); clip=d['clip']
    cws=json.load(open(f'clip-{clip}-words.json'))
    sws=sw(d['s0'],d['s1']); errs=[]
    for w in cws:
        if w['s']<c[0]-1e-6 or w['s']>c[-1]+1e-6: continue
        land=float(np.interp(w['s'],c,t))
        cand=[x for x in sws if norm(x['w'])[:3]==norm(w['w'])[:3]]
        if not cand: continue
        best=min(cand,key=lambda x:abs(x['s']-land))
        e=land-best['s']; errs.append(e); allerr.append(e)
    if errs:
        print(f"  {k} clip-{clip}: n={len(errs)} mean {np.mean(errs)*1000:+5.0f}ms "
              f"median {np.median(errs)*1000:+5.0f}ms  max|e| {max(abs(x) for x in errs)*1000:5.0f}ms")
print(f"  GLOBAL n={len(allerr)} mean {np.mean(allerr)*1000:+.0f}ms  "
      f"median {np.median(allerr)*1000:+.0f}ms  90th pct {np.percentile(np.abs(allerr),90)*1000:.0f}ms")
print("\n=== 2. STATIC CHECK")
V='girls-just-wanna-have-funds.mp4'; W,H=160,284
p=subprocess.run(['ffmpeg','-v','error','-i',V,'-vf',f"scale={W}:{H},tblend=all_mode=difference",
    '-f','rawvideo','-pix_fmt','gray','-'],capture_output=True)
a=np.frombuffer(p.stdout,dtype=np.uint8).reshape(-1,H,W).astype(np.float32).mean(axis=(1,2))
runs=[];st=None
for i,v in enumerate(a):
    if v<0.45:
        if st is None: st=i
    else:
        if st is not None and (i-st)/30>=0.30: runs.append((st/30,(i-st)/30))
        st=None
print(f"  mean framediff {a.mean():.2f}; {len(runs)} static run(s)")
for t0,dd in runs: print(f"   !! {t0:.2f}s for {dd:.2f}s")
print("\n=== 3. CAPTIONS never over instrumental")
meta=json.load(open('caps2/meta.json'))
for i,m in enumerate(meta[:-1]):
    g=meta[i+1]['start']-m['end']
    if g<0: print(f"   !! overlap after cap{i}")
print(f"  {len(meta)} captions, all gaps >= {min(meta[i+1]['start']-meta[i]['end'] for i in range(len(meta)-1)):.2f}s")
